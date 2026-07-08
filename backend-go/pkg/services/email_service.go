package services

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"strconv"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
)

type resolvedSMTPConfig struct {
	Host      string
	Port      int
	User      string
	Pass      string
	Secure    bool
	EmailFrom string
}

// FindAgencyByCodeOrName busca una Agency aceptando tanto su código como su
// nombre — el campo "agencia" de Profile/JWT históricamente guardó una u
// otra cosa según la pantalla que lo haya cargado, así que buscar solo por
// código deja afuera a cualquier cuenta cuyo valor sea en realidad el nombre.
// La comparación es case-insensitive porque también se vieron mismatches de
// mayúsculas/minúsculas entre lo cargado en el perfil y el código real.
func FindAgencyByCodeOrName(value string) (*models.Agency, error) {
	var agency models.Agency
	if err := database.DB.Where("LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)", value, value).First(&agency).Error; err != nil {
		return nil, err
	}
	return &agency, nil
}

// resolveSMTPConfig busca, en orden: la config SMTP activa de la agencia, la
// config global guardada en base (sin agencia asociada) y por último las
// variables de entorno globales (SMTP_HOST, etc.).
func resolveSMTPConfig(agencyCode string) (*resolvedSMTPConfig, error) {
	if cfg, ok := lookupAgencySMTPConfig(agencyCode); ok {
		return cfg, nil
	}
	if cfg, ok := lookupGlobalSMTPConfig(); ok {
		return cfg, nil
	}

	host := os.Getenv("SMTP_HOST")
	if host == "" {
		return nil, fmt.Errorf("no hay configuración SMTP para la agencia %q ni fallback global (SMTP_HOST)", agencyCode)
	}
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if port == 0 {
		port = 587
	}
	return &resolvedSMTPConfig{
		Host:      host,
		Port:      port,
		User:      os.Getenv("SMTP_USER"),
		Pass:      os.Getenv("SMTP_PASS"),
		EmailFrom: os.Getenv("EMAIL_FROM"),
	}, nil
}

func lookupAgencySMTPConfig(agencyCode string) (*resolvedSMTPConfig, bool) {
	if agencyCode == "" {
		return nil, false
	}
	agency, err := FindAgencyByCodeOrName(agencyCode)
	if err != nil {
		return nil, false
	}
	var cfg models.EmailSMTPConfig
	if err := database.DB.Where("agency_id = ? AND is_active = true", agency.ID).First(&cfg).Error; err != nil {
		return nil, false
	}
	return &resolvedSMTPConfig{
		Host: cfg.SMTPHost, Port: cfg.SMTPPort, User: cfg.SMTPUser, Pass: cfg.SMTPPass,
		Secure: cfg.SMTPSecure, EmailFrom: cfg.EmailFrom,
	}, true
}

// lookupGlobalSMTPConfig busca una EmailSMTPConfig sin agencia asociada
// (AgencyID IS NULL) — la config "por defecto" que un admin puede cargar
// desde /email-config cuando su cuenta no tiene una agencia específica.
func lookupGlobalSMTPConfig() (*resolvedSMTPConfig, bool) {
	var cfg models.EmailSMTPConfig
	if err := database.DB.Where("agency_id IS NULL AND is_active = true").First(&cfg).Error; err != nil {
		return nil, false
	}
	return &resolvedSMTPConfig{
		Host: cfg.SMTPHost, Port: cfg.SMTPPort, User: cfg.SMTPUser, Pass: cfg.SMTPPass,
		Secure: cfg.SMTPSecure, EmailFrom: cfg.EmailFrom,
	}, true
}

// resolveTemplate busca la plantilla de la agencia por code; si no existe usa
// la plantilla global (agency_id IS NULL) con ese mismo code.
func resolveTemplate(agencyCode, code string) (*models.EmailTemplate, error) {
	var tpl models.EmailTemplate

	if agencyCode != "" {
		if agency, err := FindAgencyByCodeOrName(agencyCode); err == nil {
			if err := database.DB.Where("code = ? AND agency_id = ?", code, agency.ID).First(&tpl).Error; err == nil {
				return &tpl, nil
			}
		}
	}

	if err := database.DB.Where("code = ? AND agency_id IS NULL", code).First(&tpl).Error; err != nil {
		return nil, fmt.Errorf("no existe la plantilla de email %q", code)
	}
	return &tpl, nil
}

// RenderTemplate reemplaza placeholders {{variable}} en subject/body.
func RenderTemplate(tpl *models.EmailTemplate, data map[string]string) (subject, body string) {
	subject = tpl.Subject
	body = tpl.BodyHTML
	for k, v := range data {
		placeholder := "{{" + k + "}}"
		subject = strings.ReplaceAll(subject, placeholder, v)
		body = strings.ReplaceAll(body, placeholder, v)
	}
	return
}

// SendTemplateEmail resuelve config SMTP + plantilla para agencyCode y envía
// el email a recipientEmail. Se ejecuta de forma síncrona: en Vercel Go
// serverless las goroutines no garantizan completarse tras la respuesta, así
// que se acepta la latencia extra del SMTP en vez de perder envíos. El
// caller decide si loguear el error (SystemLog); nunca debe hacer fallar la
// operación de negocio principal.
func SendTemplateEmail(agencyCode, templateCode, recipientEmail string, data map[string]string) error {
	if recipientEmail == "" {
		return fmt.Errorf("recipientEmail vacío")
	}
	cfg, err := resolveSMTPConfig(agencyCode)
	if err != nil {
		return err
	}
	tpl, err := resolveTemplate(agencyCode, templateCode)
	if err != nil {
		return err
	}
	subject, body := RenderTemplate(tpl, data)
	return sendMail(cfg, recipientEmail, subject, body)
}

func sendMail(cfg *resolvedSMTPConfig, to, subject, body string) error {
	from := cfg.EmailFrom
	if from == "" {
		from = cfg.User
	}
	msg := []byte("From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
		"\r\n" + body)

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	var auth smtp.Auth
	if cfg.User != "" {
		auth = smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
	}

	if cfg.Port == 465 || cfg.Secure {
		return sendMailImplicitTLS(addr, cfg.Host, auth, from, to, msg)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}

// sendMailImplicitTLS envía sobre una conexión TLS directa (puerto 465), a
// diferencia de smtp.SendMail que asume STARTTLS sobre texto plano (587).
func sendMailImplicitTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host})
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	return w.Close()
}

// TestSMTPConnection intenta autenticar contra el servidor sin enviar nada.
func TestSMTPConnection(host string, port int, user, pass string, secure bool) error {
	addr := fmt.Sprintf("%s:%d", host, port)

	if port == 465 || secure {
		conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host})
		if err != nil {
			return err
		}
		defer conn.Close()
		client, err := smtp.NewClient(conn, host)
		if err != nil {
			return err
		}
		defer client.Close()
		if user != "" {
			return client.Auth(smtp.PlainAuth("", user, pass, host))
		}
		return nil
	}

	client, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer client.Close()
	if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
		return err
	}
	if user != "" {
		return client.Auth(smtp.PlainAuth("", user, pass, host))
	}
	return nil
}
