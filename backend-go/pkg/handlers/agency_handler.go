package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListAgencies(c *gin.Context) {
	agencies := make([]models.Agency, 0)
	database.DB.Find(&agencies)
	c.JSON(http.StatusOK, agencies)
}

func CreateAgency(c *gin.Context) {
	var agency models.Agency
	if err := c.ShouldBindJSON(&agency); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	agency.ID = uuid.New()
	if err := database.DB.Create(&agency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, agency)
}

func UpdateAgency(c *gin.Context) {
	id := c.Param("id")
	var existing models.Agency
	if err := database.DB.First(&existing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agencia no encontrada"})
		return
	}
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Evitar sobrescribir campos de control
	delete(updates, "id")
	delete(updates, "created_at")
	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func DeleteAgency(c *gin.Context) {
	id := c.Param("id")
	var agency models.Agency
	if err := database.DB.First(&agency, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agencia no encontrada"})
		return
	}
	if err := database.DB.Delete(&agency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Agencia eliminada correctamente"})
}

func GetWhiteLabelConfig(c *gin.Context) {
	agencyID := c.Query("agency_id")
	var config models.WhiteLabelConfig
	query := database.DB
	if agencyID != "" {
		query = query.Where("agency_id = ?", agencyID)
	}
	if err := query.First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuración no encontrada"})
		return
	}
	c.JSON(http.StatusOK, config)
}

func CreateWhiteLabelConfig(c *gin.Context) {
	var config models.WhiteLabelConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.ID = uuid.New()
	database.DB.Create(&config)
	c.JSON(http.StatusCreated, config)
}

func UpdateWhiteLabelConfig(c *gin.Context) {
	id := c.Param("id")
	var config models.WhiteLabelConfig
	if err := database.DB.First(&config, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuración no encontrada"})
		return
	}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&config)
	c.JSON(http.StatusOK, config)
}
