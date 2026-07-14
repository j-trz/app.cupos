package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
)

// GetNotificationTemplates devuelve las plantillas globales más las
// específicas de la agencia del usuario actual (o de ?agency_id si es admin),
// igual que GetEmailTemplates.
func GetNotificationTemplates(c *gin.Context) {
	_, agencyCode, _ := resolveAgencyForEmailConfig(c)

	query := database.DB.Where("agency_id IS NULL")
	if agencyCode != "" {
		if agency, err := services.FindAgencyByCodeOrName(agencyCode); err == nil {
			query = database.DB.Where("agency_id IS NULL OR agency_id = ?", agency.ID)
		}
	}

	templates := make([]models.NotificationTemplate, 0)
	query.Order("name asc").Find(&templates)

	c.JSON(http.StatusOK, gin.H{"templates": templates})
}

func UpdateNotificationTemplate(c *gin.Context) {
	id := c.Param("id")
	var tpl models.NotificationTemplate
	if err := database.DB.First(&tpl, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plantilla no encontrada"})
		return
	}

	var input struct {
		Title       string `json:"title"`
		Message     string `json:"message"`
		Icon        string `json:"icon"`
		Color       string `json:"color"`
		ExtraEmails string `json:"extra_emails"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&tpl).Updates(map[string]interface{}{
		"title":        input.Title,
		"message":      input.Message,
		"icon":         input.Icon,
		"color":        input.Color,
		"extra_emails": input.ExtraEmails,
	})
	database.DB.First(&tpl, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"template": tpl})
}

// PreviewNotificationTemplate renderiza la plantilla con datos de ejemplo
// para el tab "Vista previa" del admin de notificaciones.
func PreviewNotificationTemplate(c *gin.Context) {
	id := c.Param("id")
	var tpl models.NotificationTemplate
	if err := database.DB.First(&tpl, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plantilla no encontrada"})
		return
	}

	sampleData := map[string]string{
		"pedido_id":       "PED-2026-EJEMPLO",
		"pasajero":        "Juan Pérez",
		"agencia":         "Agencia Demo",
		"agencia_origen":  "Agencia Demo",
		"agencia_destino": "Agencia Destino",
		"nombre":          "Juan",
		"apellido":        "Pérez",
		"codigo_cupo":     "ABC123",
		"destino":         "Punta Cana",
		"compania":        "Aerolínea Demo",
		"disponibilidad":  "3",
		"cantidad":        "5",
		"minutos":         "15",
	}
	title, message, _, _, _, _ := services.ResolveNotificationText("", tpl.Code, tpl.Title, tpl.Message, sampleData)
	c.JSON(http.StatusOK, gin.H{"title": title, "message": message})
}
