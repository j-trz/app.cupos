package handlers

import (
	"encoding/json"
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// defaultWhiteLabelConfig retorna la configuración por defecto cuando no hay config guardada
func defaultWhiteLabelConfig() map[string]interface{} {
	return map[string]interface{}{
		"identity": map[string]interface{}{
			"agency_name":   "",
			"contact_email": "",
			"slogan":        "",
			"logoUrl":       "",
			"faviconUrl":    "",
		},
		"colors": map[string]interface{}{
			"primary":        "#3b82f6",
			"secondary":      "#64748b",
			"background":     "#ffffff",
			"surface":        "#f8fafc",
			"text_primary":   "#0f172a",
			"text_secondary": "#64748b",
			"accent":         "#f59e0b",
			"border":         "#e2e8f0",
		},
		"fonts": map[string]interface{}{
			"heading": "Inter, system-ui, sans-serif",
			"body":    "Inter, system-ui, sans-serif",
		},
		"buttons": map[string]interface{}{
			"borderRadius": "lg",
			"paddingX":     "4",
			"paddingY":     "2",
		},
		"sidebar": map[string]interface{}{
			"width":           "280px",
			"backgroundColor": "#0f172a",
			"textColor":       "#f8fafc",
			"hoverColor":      "#1e293b",
		},
		"layout": map[string]interface{}{
			"maxWidth": "1400px",
			"padding":  "24px",
		},
		"emails": map[string]interface{}{
			"headerColor": "#3b82f6",
			"logoUrl":     "",
			"footerText":  "",
		},
		"legal": map[string]interface{}{
			"termsUrl":   "",
			"privacyUrl": "",
		},
	}
}

// mergeRecordAndConfig combina los campos del modelo con el JSON de config
func mergeRecordAndConfig(wlConfig models.WhiteLabelConfig) map[string]interface{} {
	var configMap map[string]interface{}
	if err := json.Unmarshal(wlConfig.Config, &configMap); err != nil || configMap == nil {
		configMap = defaultWhiteLabelConfig()
	}
	configMap["id"] = wlConfig.ID
	configMap["agency_id"] = wlConfig.AgencyID
	configMap["is_active"] = wlConfig.IsActive
	return configMap
}

// GetWhiteLabelConfig obtiene la configuración de white-label para la agencia del usuario
func GetWhiteLabelConfig(c *gin.Context) {
	agencia, _ := c.Get("agencia")
	agenciaStr, _ := agencia.(string)

	var wlConfig models.WhiteLabelConfig
	err := database.DB.Where("agency_id = ?", agenciaStr).First(&wlConfig).Error
	if err != nil {
		// No hay config aún → retornar defaults (no es error)
		c.JSON(http.StatusOK, gin.H{
			"config":    defaultWhiteLabelConfig(),
			"isDefault": true,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config":    mergeRecordAndConfig(wlConfig),
		"isDefault": false,
	})
}

// CreateWhiteLabelConfig crea una nueva configuración de white-label para la agencia
func CreateWhiteLabelConfig(c *gin.Context) {
	agencia, _ := c.Get("agencia")
	agenciaStr, _ := agencia.(string)
	role, _ := c.Get("role")

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// La agencia la tomamos del JWT (seguridad) — el admin puede especificarla en el body
	agencyID := agenciaStr
	if role == "admin" {
		if aid, ok := body["agency_id"].(string); ok && aid != "" {
			agencyID = aid
		}
	}
	if agencyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agency_id requerido"})
		return
	}

	// Limpiar campos que no van al config JSON
	delete(body, "agency_id")
	delete(body, "id")
	delete(body, "is_active")
	delete(body, "created_at")
	delete(body, "updated_at")

	configJSON, err := json.Marshal(body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al serializar configuración"})
		return
	}

	wlConfig := models.WhiteLabelConfig{
		AgencyID: agencyID,
		Config:   datatypes.JSON(configJSON),
		IsActive: true,
	}

	if err := database.DB.Create(&wlConfig).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear configuración"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"config":    mergeRecordAndConfig(wlConfig),
		"isDefault": false,
	})
}

// UpdateWhiteLabelConfig actualiza la configuración existente por ID
func UpdateWhiteLabelConfig(c *gin.Context) {
	id := c.Param("id")

	var wlConfig models.WhiteLabelConfig
	if err := database.DB.First(&wlConfig, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuración no encontrada"})
		return
	}

	// Verificar que el usuario puede editar esta config (admin o misma agencia)
	role, _ := c.Get("role")
	agencia, _ := c.Get("agencia")
	agenciaStr, _ := agencia.(string)
	if role != "admin" && wlConfig.AgencyID != agenciaStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso para editar esta configuración"})
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Limpiar campos internos
	delete(body, "id")
	delete(body, "agency_id")
	delete(body, "is_active")
	delete(body, "created_at")
	delete(body, "updated_at")

	configJSON, err := json.Marshal(body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al serializar configuración"})
		return
	}

	if err := database.DB.Model(&wlConfig).Update("config", datatypes.JSON(configJSON)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar configuración"})
		return
	}

	// Recargar para obtener valores actualizados
	database.DB.First(&wlConfig, "id = ?", id)

	c.JSON(http.StatusOK, gin.H{
		"config":    mergeRecordAndConfig(wlConfig),
		"isDefault": false,
	})
}

// DeleteWhiteLabelConfig elimina una configuración de white-label por ID
func DeleteWhiteLabelConfig(c *gin.Context) {
	id := c.Param("id")

	var wlConfig models.WhiteLabelConfig
	if err := database.DB.First(&wlConfig, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuración no encontrada"})
		return
	}

	if err := database.DB.Delete(&wlConfig).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar configuración"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Configuración eliminada"})
}
