package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"github.com/gin-gonic/gin"
)

func ListSettings(c *gin.Context) {
	var settings []models.SystemSetting
	database.DB.Find(&settings)
	c.JSON(http.StatusOK, settings)
}

func UpdateSetting(c *gin.Context) {
	key := c.Param("key")
	var setting models.SystemSetting
	if err := database.DB.First(&setting, "key = ?", key).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ajuste no encontrado"})
		return
	}
	if err := c.ShouldBindJSON(&setting); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&setting)
	c.JSON(http.StatusOK, setting)
}
