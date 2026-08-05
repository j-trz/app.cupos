package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// TEMPORADAS — lista global administrada por el admin, que alimenta el
// desplegable de "Temporada" en el formulario de Producto (antes era texto
// libre, lo que generaba nombres inconsistentes entre agencias/usuarios).
// ─────────────────────────────────────────────

// ListTemporadas godoc
// GET /api/temporadas
// Abierto a cualquier usuario autenticado (no requiere permiso): el
// desplegable de ProductForm lo necesita para cualquier rol que pueda cargar
// un producto, no solo para quien administra la lista.
func ListTemporadas(c *gin.Context) {
	temporadas := make([]models.Temporada, 0)
	database.DB.Order("nombre asc").Find(&temporadas)
	c.JSON(http.StatusOK, temporadas)
}

func CreateTemporada(c *gin.Context) {
	var temporada models.Temporada
	if err := c.ShouldBindJSON(&temporada); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	temporada.ID = uuid.New()
	if err := database.DB.Create(&temporada).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo crear la temporada (¿nombre repetido?)"})
		return
	}
	c.JSON(http.StatusCreated, temporada)
}

func UpdateTemporada(c *gin.Context) {
	id := c.Param("id")
	var existing models.Temporada
	if err := database.DB.First(&existing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Temporada no encontrada"})
		return
	}
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	delete(updates, "id")
	delete(updates, "created_at")
	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo actualizar la temporada"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func DeleteTemporada(c *gin.Context) {
	id := c.Param("id")
	var temporada models.Temporada
	if err := database.DB.First(&temporada, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Temporada no encontrada"})
		return
	}
	if err := database.DB.Delete(&temporada).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo eliminar la temporada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Temporada eliminada correctamente"})
}
