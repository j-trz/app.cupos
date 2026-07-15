// Package services: pipeline de ingesta de conocimiento para "Expertos" de
// IA. Convierte documentos (PDF, DOCX, TXT/MD, HTML/URL) a Markdown, todo en
// memoria — no hay filesystem persistente en el runtime serverless, así que
// el archivo original nunca se guarda, solo el resultado.
//
// Deliberadamente NO se implementa un servidor MCP real acá: el chat de IA ya
// tiene su propio mecanismo de function-calling (getTools/executeTool en
// ai_handler.go) y este pipeline se integra ahí como una tool más
// (consultar_experto) — ver esa sección para el consumo de este resultado.
package services

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	md "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/ledongthuc/pdf"
)

const (
	// MaxExpertUploadBytes limita el tamaño del archivo/URL original que se
	// acepta para convertir.
	MaxExpertUploadBytes = 10 * 1024 * 1024 // 10MB
	// MaxExpertMarkdownBytes limita el Markdown resultante que se persiste.
	MaxExpertMarkdownBytes = 2 * 1024 * 1024 // 2MB
)

// ConvertToMarkdown convierte el contenido de un archivo subido a Markdown,
// según su extensión. Devuelve también el sourceType normalizado para
// guardar en AIExpertDocument.SourceType.
func ConvertToMarkdown(fileName string, raw []byte) (markdown string, sourceType string, err error) {
	if len(raw) > MaxExpertUploadBytes {
		return "", "", fmt.Errorf("el archivo supera el límite de %dMB", MaxExpertUploadBytes/(1024*1024))
	}

	ext := strings.ToLower(filepath.Ext(fileName))
	switch ext {
	case ".md", ".markdown":
		markdown, sourceType = string(raw), "md"
	case ".txt":
		markdown, sourceType = string(raw), "txt"
	case ".html", ".htm":
		sourceType = "html"
		markdown, err = convertHTMLToMarkdown(string(raw))
	case ".pdf":
		sourceType = "pdf"
		markdown, err = convertPDFToMarkdown(raw)
	case ".docx":
		sourceType = "docx"
		markdown, err = convertDocxToMarkdown(raw)
	default:
		return "", "", fmt.Errorf("formato de archivo no soportado: %s (se acepta .pdf, .docx, .txt, .md, .html)", ext)
	}
	if err != nil {
		return "", sourceType, err
	}
	if len(markdown) > MaxExpertMarkdownBytes {
		markdown = markdown[:MaxExpertMarkdownBytes]
	}
	return markdown, sourceType, nil
}

// isPrivateOrReservedIP rechaza direcciones de redes internas/reservadas
// (loopback, link-local, rangos privados, etc.) — usado para evitar que
// ConvertURLToMarkdown sea un vector de SSRF hacia servicios internos o
// metadata de la nube (ej. 169.254.169.254).
func isPrivateOrReservedIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsPrivate() || ip.IsUnspecified() || ip.IsMulticast()
}

// validateExternalURL exige http/https y resuelve el host para descartar
// cualquier IP privada/reservada antes de permitir la descarga. No es una
// protección completa contra SSRF vía DNS-rebinding/redirects (por eso
// ConvertURLToMarkdown además deshabilita el seguimiento de redirects), pero
// cubre el caso directo de apuntar a una IP o hostname interno.
func validateExternalURL(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("URL inválida")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("solo se admiten URLs http/https")
	}
	host := parsed.Hostname()
	if host == "" {
		return fmt.Errorf("URL inválida")
	}
	ips, err := net.LookupIP(host)
	if err != nil || len(ips) == 0 {
		return fmt.Errorf("no se pudo resolver el host de la URL")
	}
	for _, ip := range ips {
		if isPrivateOrReservedIP(ip) {
			return fmt.Errorf("no se permiten URLs que apunten a redes internas/privadas")
		}
	}
	return nil
}

// ConvertURLToMarkdown descarga una URL server-side y convierte su HTML a
// Markdown — para agregar conocimiento a un experto a partir de una página
// pública (ej. FAQ, política de la agencia publicada en su web).
func ConvertURLToMarkdown(rawURL string) (string, error) {
	if err := validateExternalURL(rawURL); err != nil {
		return "", err
	}

	client := &http.Client{
		Timeout: 15 * time.Second,
		// No seguir redirects: evita que una URL inicial válida redirija a
		// una dirección interna para eludir la validación de arriba.
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Get(rawURL)
	if err != nil {
		return "", fmt.Errorf("no se pudo descargar la URL: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("la URL respondió con estado %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, MaxExpertUploadBytes))
	if err != nil {
		return "", fmt.Errorf("no se pudo leer la respuesta: %w", err)
	}

	markdown, err := convertHTMLToMarkdown(string(body))
	if err != nil {
		return "", err
	}
	if len(markdown) > MaxExpertMarkdownBytes {
		markdown = markdown[:MaxExpertMarkdownBytes]
	}
	return markdown, nil
}

func convertHTMLToMarkdown(html string) (string, error) {
	converter := md.NewConverter("", true, nil)
	result, err := converter.ConvertString(html)
	if err != nil {
		return "", fmt.Errorf("no se pudo convertir el HTML a Markdown: %w", err)
	}
	return strings.TrimSpace(result), nil
}

// convertPDFToMarkdown extrae el texto plano de cada página. No hay OCR: un
// PDF escaneado sin capa de texto no produce contenido útil (se reporta como
// error para que la agencia lo sepa en vez de guardar un documento vacío).
func convertPDFToMarkdown(raw []byte) (string, error) {
	r, err := pdf.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		return "", fmt.Errorf("no se pudo leer el PDF: %w", err)
	}

	var buf bytes.Buffer
	totalPages := r.NumPage()
	for i := 1; i <= totalPages; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		buf.WriteString(text)
		buf.WriteString("\n\n")
	}

	result := strings.TrimSpace(buf.String())
	if result == "" {
		return "", fmt.Errorf("no se pudo extraer texto del PDF — puede ser un documento escaneado sin capa de texto (sin OCR soportado)")
	}
	return result, nil
}

// convertDocxToMarkdown extrae el texto plano de word/document.xml dentro
// del .docx (que internamente es un ZIP). No preserva formato/estilos —
// alcanza con el texto plano para que sirva como conocimiento de un experto.
func convertDocxToMarkdown(raw []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		return "", fmt.Errorf("no se pudo leer el .docx: %w", err)
	}

	var docXML *zip.File
	for _, f := range zr.File {
		if f.Name == "word/document.xml" {
			docXML = f
			break
		}
	}
	if docXML == nil {
		return "", fmt.Errorf("el archivo .docx no contiene word/document.xml")
	}

	rc, err := docXML.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()

	decoder := xml.NewDecoder(rc)
	var buf bytes.Buffer
	inText := false
	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("error leyendo el .docx: %w", err)
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if t.Name.Local == "t" {
				inText = true
			} else if t.Name.Local == "p" && buf.Len() > 0 {
				buf.WriteString("\n\n")
			}
		case xml.EndElement:
			if t.Name.Local == "t" {
				inText = false
			}
		case xml.CharData:
			if inText {
				buf.Write(t)
			}
		}
	}

	result := strings.TrimSpace(buf.String())
	if result == "" {
		return "", fmt.Errorf("no se pudo extraer texto del .docx")
	}
	return result, nil
}

// ChunkMarkdown trocea un texto en fragmentos de ~chunkSize caracteres con
// solape, respetando saltos de párrafo cuando es posible — usado en la
// ingesta cuando el conocimiento total de un experto supera el umbral de
// inyección directa (ver expertKnowledgeThreshold en ai_handler.go).
//
// Trabaja sobre []rune (no bytes): el contenido es texto en español con
// muchos caracteres acentuados de más de 1 byte en UTF-8, y cortar por
// offsets de byte puede partir un caracter a la mitad y corromper el chunk.
func ChunkMarkdown(text string, chunkSize, overlap int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	runes := []rune(text)
	if len(runes) <= chunkSize {
		return []string{text}
	}

	var chunks []string
	start := 0
	for start < len(runes) {
		end := start + chunkSize
		if end >= len(runes) {
			chunks = append(chunks, strings.TrimSpace(string(runes[start:])))
			break
		}
		// Buscar el último salto de párrafo dentro de la ventana para no
		// cortar una idea a la mitad. LastIndex devuelve un offset de BYTE
		// dentro de `window`, así que hay que convertirlo a cantidad de
		// runes antes de usarlo para indexar el slice de runes.
		window := string(runes[start:end])
		byteCut := strings.LastIndex(window, "\n\n")
		var cut int
		if byteCut <= 0 {
			cut = end - start
		} else {
			cut = len([]rune(window[:byteCut]))
		}
		chunks = append(chunks, strings.TrimSpace(string(runes[start:start+cut])))
		next := start + cut - overlap
		if next <= start {
			next = start + cut
		}
		start = next
	}
	return chunks
}
