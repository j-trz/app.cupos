package handlers

import (
	"encoding/base64"
	"fmt"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
)

// ocrPDFInstruction es el pedido que se le hace al proveedor de IA cuando se
// le manda un PDF completo para que lo transcriba — típicamente un documento
// escaneado sin capa de texto, que services.ConvertToMarkdown ya no pudo leer.
const ocrPDFInstruction = "Transcribí TODO el texto de este documento a Markdown, preservando la estructura " +
	"(títulos, listas, tablas) en la medida de lo posible. Es un documento escaneado — hacé OCR del contenido. " +
	"Respondé ÚNICAMENTE con el texto transcripto, sin comentarios ni aclaraciones adicionales."

// ocrPDFWithAI es el fallback para PDFs sin capa de texto extraíble: en vez
// de rasterizar páginas a imagen (no viable sin CGO/binarios de sistema en
// el runtime serverless de Vercel), se manda el PDF completo al proveedor de
// IA activo de la agencia y se le pide que transcriba el contenido —
// Anthropic y Google aceptan un PDF completo en su API de mensajes y hacen
// la lectura (incluido OCR) ellos mismos. OpenAI no soporta esto en el
// endpoint de Chat Completions que ya usa este chat (solo imágenes
// rasterizadas), así que para ese proveedor se devuelve un error explicando
// la limitación en vez de intentarlo.
func ocrPDFWithAI(raw []byte) (string, error) {
	var provider models.AIProvider
	if err := database.DB.Where("is_active = true AND is_default = true").First(&provider).Error; err != nil {
		if err := database.DB.Where("is_active = true").First(&provider).Error; err != nil {
			return "", fmt.Errorf("no hay ningún proveedor de IA configurado y activo para intentar leer este documento")
		}
	}

	b64 := base64.StdEncoding.EncodeToString(raw)

	switch provider.ProviderType {
	case "anthropic":
		messages := []map[string]interface{}{
			{
				"role": "user",
				"content": []map[string]interface{}{
					{
						"type": "document",
						"source": map[string]interface{}{
							"type":       "base64",
							"media_type": "application/pdf",
							"data":       b64,
						},
					},
					{"type": "text", "text": ocrPDFInstruction},
				},
			},
		}
		pr, err := callAnthropicFull(provider, "", messages, nil)
		if err != nil {
			return "", fmt.Errorf("no se pudo leer el documento con Anthropic: %w", err)
		}
		return strings.TrimSpace(pr.Content), nil

	case "google":
		contents := []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]interface{}{
					{"inlineData": map[string]string{"mimeType": "application/pdf", "data": b64}},
					{"text": ocrPDFInstruction},
				},
			},
		}
		pr, err := callGoogleFull(provider, "", contents, nil)
		if err != nil {
			return "", fmt.Errorf("no se pudo leer el documento con Google Gemini: %w", err)
		}
		return strings.TrimSpace(pr.Content), nil

	default:
		return "", fmt.Errorf(
			"tu proveedor de IA activo (%s) no soporta leer PDFs escaneados directamente — activá Anthropic o Google como proveedor, o subí una versión con texto real del documento",
			provider.ProviderType,
		)
	}
}
