package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func Chat(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"role":    "assistant",
		"content": "Soy tu asistente IA. ¿En qué puedo ayudarte hoy?",
	})
}

func ListAIProviders(c *gin.Context) {
	providers := make([]models.AIProvider, 0)
	database.DB.Find(&providers)
	c.JSON(http.StatusOK, gin.H{"providers": providers})
}

func CreateAIProvider(c *gin.Context) {
	var provider models.AIProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	provider.ID = uuid.New()
	database.DB.Create(&provider)
	c.JSON(http.StatusCreated, provider)
}

func UpdateAIProvider(c *gin.Context) {
	id := c.Param("id")
	var provider models.AIProvider
	if err := database.DB.First(&provider, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proveedor no encontrado"})
		return
	}
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&provider)
	c.JSON(http.StatusOK, provider)
}

func DeleteAIProvider(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.AIProvider{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Proveedor eliminado"})
}

func TestAIProvider(c *gin.Context) {
	id := c.Param("id")
	var provider models.AIProvider
	if err := database.DB.First(&provider, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proveedor no encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Conexión exitosa con " + provider.DisplayName})
}

// Stubs para endpoints que el frontend consume pero aún no están implementados
func ListAIActions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"actions": []interface{}{}})
}

func ListAISessions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"sessions": []interface{}{}})
}

func GetAIStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"totalMessages": 0, "totalSessions": 0})
}

func GetAILogs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"logs": []interface{}{}})
}
