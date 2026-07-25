package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ListUserAgencies devuelve las agencias ADICIONALES asignadas a un usuario
// (sin contar la activa, que es Profile.Agencia) — para el modal de agencias
// múltiples del superadmin en Gestión de Usuarios.
func ListUserAgencies(c *gin.Context) {
	id := c.Param("id")
	var profile models.Profile
	if err := database.DB.First(&profile, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}
	var rows []models.UserAgency
	database.DB.Where("user_id = ?", profile.ID).Find(&rows)
	agencies := make([]string, 0, len(rows))
	for _, r := range rows {
		agencies = append(agencies, r.Agencia)
	}
	c.JSON(http.StatusOK, agencies)
}

type addUserAgencyInput struct {
	Agencia string `json:"agencia" binding:"required"`
}

// AddUserAgency asigna una agencia adicional a un usuario. Exclusivo del
// superadmin (middleware.AdminOnly() en la ruta) — no cambia la agencia
// activa del usuario (Profile.Agencia), solo agrega una opción más para que
// el propio usuario elija después vía SwitchActiveAgency.
func AddUserAgency(c *gin.Context) {
	id := c.Param("id")
	var profile models.Profile
	if err := database.DB.First(&profile, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}

	var input addUserAgencyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	agency, err := services.FindAgencyByCodeOrName(input.Agencia)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La agencia indicada no existe."})
		return
	}

	var existing models.UserAgency
	if err := database.DB.Where("user_id = ? AND LOWER(agencia) = LOWER(?)", profile.ID, agency.Code).
		First(&existing).Error; err == nil {
		// Ya estaba asignada — no-op, no es un error.
		c.JSON(http.StatusOK, gin.H{"agencia": agency.Code})
		return
	}

	callerIDStr, _ := c.Get("userID")
	var createdBy uuid.UUID
	if s, ok := callerIDStr.(string); ok {
		createdBy, _ = uuid.Parse(s)
	}

	row := models.UserAgency{UserID: profile.ID, Agencia: agency.Code, CreatedBy: createdBy}
	if err := database.DB.Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al asignar la agencia."})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"agencia": agency.Code})
}

// RemoveUserAgency quita una agencia adicional de un usuario. Si esa agencia
// era la activa (Profile.Agencia) no se toca acá — la sesión en curso sigue
// funcionando con la que ya tenía activa; simplemente deja de aparecer como
// opción la próxima vez que el usuario quiera cambiar de agencia activa.
func RemoveUserAgency(c *gin.Context) {
	id := c.Param("id")
	agencia := c.Param("agencia")

	var profile models.Profile
	if err := database.DB.First(&profile, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}

	if err := database.DB.Where("user_id = ? AND LOWER(agencia) = LOWER(?)", profile.ID, agencia).
		Delete(&models.UserAgency{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al quitar la agencia."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
