package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListAgencies(c *gin.Context) {
	var agencies []models.Agency
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
	database.DB.Create(&agency)
	c.JSON(http.StatusCreated, agency)
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
