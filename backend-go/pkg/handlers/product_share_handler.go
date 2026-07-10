package handlers

import (
	"net/http"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// canManageSharing autoriza a admin o a la agencia dueña del producto —
// compartir un cupo con otra agencia es una decisión del owner, no de quien
// lo recibe.
func canManageSharing(c *gin.Context, product *models.Product) bool {
	role, _ := c.Get("role")
	if role == "admin" {
		return true
	}
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	callerAgencia := services.ResolveAgencyCode(agenciaRaw)
	return callerAgencia != "" && strings.EqualFold(callerAgencia, product.Agencia)
}

// ListSharedAgencies devuelve los códigos de agencia con los que se comparte
// este producto (además de la dueña), para el modal de "Compartir".
func ListSharedAgencies(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}
	if !canManageSharing(c, &product) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
		return
	}
	var shares []models.ProductSharedAgency
	database.DB.Where("product_id = ?", product.ID).Find(&shares)
	agencies := make([]string, 0, len(shares))
	for _, s := range shares {
		agencies = append(agencies, s.Agencia)
	}
	c.JSON(http.StatusOK, agencies)
}

type shareProductInput struct {
	Agencia string `json:"agencia" binding:"required"`
}

// ShareProduct habilita que otra agencia vea/reserve este producto,
// compartiendo el mismo Disponibilidad — a diferencia de la cesión
// (AvailabilityTransfer), NO crea una fila espejo con stock propio.
func ShareProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}
	if !canManageSharing(c, &product) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
		return
	}

	var input shareProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	agency, err := services.FindAgencyByCodeOrName(input.Agencia)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La agencia indicada no existe."})
		return
	}
	if strings.EqualFold(agency.Code, product.Agencia) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El producto ya pertenece a esa agencia."})
		return
	}

	var existing models.ProductSharedAgency
	if err := database.DB.Where("product_id = ? AND LOWER(agencia) = LOWER(?)", product.ID, agency.Code).
		First(&existing).Error; err == nil {
		// Ya estaba compartido con esa agencia — no-op, no es un error.
		c.JSON(http.StatusOK, gin.H{"agencia": agency.Code})
		return
	}

	userIDStr, _ := c.Get("userID")
	var createdBy uuid.UUID
	if s, ok := userIDStr.(string); ok {
		createdBy, _ = uuid.Parse(s)
	}

	share := models.ProductSharedAgency{ProductID: product.ID, Agencia: agency.Code, CreatedBy: createdBy}
	if err := database.DB.Create(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al compartir el producto."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"agencia": agency.Code})
}

// UnshareProduct quita a una agencia de la lista de compartidos de este
// producto — deja de verlo/poder reservarlo, sin afectar reservas ya hechas.
func UnshareProduct(c *gin.Context) {
	id := c.Param("id")
	agencia := c.Param("agencia")

	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}
	if !canManageSharing(c, &product) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
		return
	}

	if err := database.DB.Where("product_id = ? AND LOWER(agencia) = LOWER(?)", product.ID, agencia).
		Delete(&models.ProductSharedAgency{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al quitar la agencia."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
