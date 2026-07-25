package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
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

// ToggleMyAgencyAI prende/apaga el asistente de IA para la agencia del propio
// caller — a diferencia de UpdateAgency, NUNCA acepta un :id: la agencia
// objetivo sale siempre de c.Get("agencia"), así con el permiso AI_TOGGLE es
// estructuralmente imposible afectar otra agencia sin importar qué otro
// permiso tenga el caller (ver plan de RBAC/agencia-scoping).
func ToggleMyAgencyAI(c *gin.Context) {
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCode := services.ResolveAgencyCode(agenciaRaw)

	var agency models.Agency
	if err := database.DB.Where("code = ?", agenciaCode).First(&agency).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agencia no encontrada."})
		return
	}

	var input struct {
		AIHabilitado bool `json:"ai_habilitado"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Model(&agency).Update("ai_habilitado", input.AIHabilitado).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "agency": agency})
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
