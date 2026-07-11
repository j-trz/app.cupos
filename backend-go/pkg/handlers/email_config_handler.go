package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// resolveAgencyForEmailConfig determina sobre qué agencia opera el usuario
// actual. Un admin puede pasar ?agency_id=<uuid> para gestionar otra agencia;
// el resto opera siempre sobre la suya (c.Get("agencia")).
func resolveAgencyForEmailConfig(c *gin.Context) (agencyID *uuid.UUID, agencyCode string, err error) {
	role, _ := c.Get("role")
	if role == "admin" {
		if idStr := c.Query("agency_id"); idStr != "" {
			id, parseErr := uuid.Parse(idStr)
			if parseErr != nil {
				return nil, "", parseErr
			}
			var agency models.Agency
			if dbErr := database.DB.First(&agency, "id = ?", id).Error; dbErr != nil {
				return nil, "", dbErr
			}
			return &agency.ID, agency.Code, nil
		}
	}

	agenciaVal, _ := c.Get("agencia")
	agenciaCode, _ := agenciaVal.(string)
	if agenciaCode == "" {
		return nil, "", nil
	}

	// El valor de "agencia" en Profile/JWT puede ser el código o el nombre de
	// la agencia según de dónde se haya cargado — se acepta cualquiera de
	// los dos para no perder la asociación silenciosamente.
	agency, dbErr := services.FindAgencyByCodeOrName(agenciaCode)
	if dbErr != nil {
		// Agencia sin registro formal en la tabla agencies: seguimos con el código,
		// SendTemplateEmail cae al fallback SMTP global en ese caso.
		return nil, agenciaCode, nil
	}
	return &agency.ID, agency.Code, nil
}

func GetEmailConfig(c *gin.Context) {
	agencyID, agencyCode, err := resolveAgencyForEmailConfig(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cfg models.EmailSMTPConfig
	var dbErr error
	if agencyID != nil {
		dbErr = database.DB.Where("agency_id = ?", *agencyID).First(&cfg).Error
	} else {
		// Config global (sin agencia)
		dbErr = database.DB.Where("agency_id IS NULL").First(&cfg).Error
	}
	if dbErr == nil {
		c.JSON(http.StatusOK, gin.H{"config": cfg, "isDefault": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config": gin.H{
			"smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_pass": "",
			"smtp_secure": false, "email_from": "",
		},
		"isDefault":  true,
		"agencyCode": agencyCode,
	})
}

func CreateEmailConfig(c *gin.Context) {
	agencyID, _, err := resolveAgencyForEmailConfig(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var input models.EmailSMTPConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.ID = uuid.New()
	input.AgencyID = agencyID // puede ser nil (config global)

	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo crear la configuración SMTP"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"config": input})
}

func UpdateEmailConfig(c *gin.Context) {
	id := c.Param("id")
	var cfg models.EmailSMTPConfig
	if err := database.DB.First(&cfg, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuración no encontrada"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	delete(input, "id")
	delete(input, "agency_id")

	if err := database.DB.Model(&cfg).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo actualizar la configuración"})
		return
	}
	database.DB.First(&cfg, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

func DeleteEmailConfig(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.EmailSMTPConfig{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo eliminar la configuración"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func TestEmailConnection(c *gin.Context) {
	var input struct {
		SMTPHost   string `json:"smtp_host"`
		SMTPPort   int    `json:"smtp_port"`
		SMTPUser   string `json:"smtp_user"`
		SMTPPass   string `json:"smtp_pass"`
		SMTPSecure bool   `json:"smtp_secure"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.TestSMTPConnection(input.SMTPHost, input.SMTPPort, input.SMTPUser, input.SMTPPass, input.SMTPSecure); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func SendTestEmail(c *gin.Context) {
	var input struct {
		ToEmail string `json:"to_email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.ToEmail == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to_email es requerido"})
		return
	}

	_, agencyCode, _ := resolveAgencyForEmailConfig(c)
	if err := services.SendTemplateEmail(agencyCode, "test_email", input.ToEmail, map[string]string{}); err != nil {
		logEmailError(c, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func GetEmailTemplates(c *gin.Context) {
	_, agencyCode, _ := resolveAgencyForEmailConfig(c)

	query := database.DB.Where("agency_id IS NULL")
	if agencyCode != "" {
		if agency, err := services.FindAgencyByCodeOrName(agencyCode); err == nil {
			query = database.DB.Where("agency_id IS NULL OR agency_id = ?", agency.ID)
		}
	}

	templates := make([]models.EmailTemplate, 0)
	query.Order("name asc").Find(&templates)

	c.JSON(http.StatusOK, gin.H{"templates": templates})
}

func UpdateEmailTemplate(c *gin.Context) {
	id := c.Param("id")
	var tpl models.EmailTemplate
	if err := database.DB.First(&tpl, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plantilla no encontrada"})
		return
	}

	var input struct {
		Subject  string `json:"subject"`
		BodyHTML string `json:"body_html"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&tpl).Updates(map[string]interface{}{
		"subject":   input.Subject,
		"body_html": input.BodyHTML,
	})
	database.DB.First(&tpl, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"template": tpl})
}

// PreviewEmailTemplate renderiza la plantilla con datos de ejemplo para el
// tab "Vista previa" de EmailConfig.jsx.
func PreviewEmailTemplate(c *gin.Context) {
	id := c.Param("id")
	var tpl models.EmailTemplate
	if err := database.DB.First(&tpl, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plantilla no encontrada"})
		return
	}

	sampleData := map[string]string{
		"pedido_id":       "PED-2026-EJEMPLO",
		"contacto_nombre": "Juan Pérez",
		"vence":           "07/07/2026 18:00",
		"minutos":         "15",
		"codigo_cupo":     "ABC123",
		"destino":         "Punta Cana",
		"compania":        "Aerolínea Demo",
	}
	_, html := services.RenderTemplate(&tpl, sampleData)
	c.JSON(http.StatusOK, gin.H{"html": html})
}

func logEmailError(c *gin.Context, err error) {
	database.DB.Create(&models.SystemLog{
		Level:   "error",
		Source:  "email",
		Path:    c.Request.URL.Path,
		Message: "No se pudo completar el envío del email de prueba",
		Details: err.Error(),
	})
}
