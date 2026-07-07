package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TransferInput representa el payload para crear una cesión
type TransferInput struct {
	ProductID    uint   `json:"product_id" binding:"required"`
	TargetAgency string `json:"target_agency" binding:"required"`
	Quantity     int    `json:"quantity" binding:"required,min=1"`
}

// CreateTransfer crea una cesión de disponibilidad entre agencias
func CreateTransfer(c *gin.Context) {
	var input TransferInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	agencia, _ := c.Get("agencia")

	sourceAgency := agencia.(string)

	// Validar que origen y destino sean diferentes
	if sourceAgency == input.TargetAgency {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La agencia origen y destino no pueden ser la misma"})
		return
	}

	// Obtener producto
	var product models.Product
	if err := database.DB.First(&product, input.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}

	// Validar disponibilidad suficiente
	if product.Disponibilidad < input.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":     "Disponibilidad insuficiente",
			"available": product.Disponibilidad,
			"requested": input.Quantity,
		})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Descontar del producto original (stock de origen)
	if err := tx.Model(&models.Product{}).Where("id = ?", input.ProductID).
		Update("disponibilidad", database.DB.Raw("disponibilidad - ?", input.Quantity)).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	// 2. Crear producto espejo para la agencia destino
	productTransfer := models.Product{
		CodigoCupo:             product.CodigoCupo,
		Destino:                product.Destino,
		Compania:               product.Compania,
		Disponibilidad:         input.Quantity,
		Salida:                 product.Salida,
		Regreso:                product.Regreso,
		FechaSalida:            product.FechaSalida,
		FechaRegreso:           product.FechaRegreso,
		Precio:                 product.Precio,
		Neto1:                  product.Neto1,
		OP:                     product.OP,
		Ruta:                   product.Ruta,
		Temporada:              product.Temporada,
		TipoProducto:           product.TipoProducto,
		BloqueoTemporalMinutos: product.BloqueoTemporalMinutos,
	}
	if err := tx.Create(&productTransfer).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear producto destino"})
		return
	}

	// 3. Crear registro de cesión
	transferID := uuid.New()
	transfer := models.AvailabilityTransfer{
		ID:           transferID,
		ProductID:    input.ProductID,
		SourceAgency: sourceAgency,
		TargetAgency: input.TargetAgency,
		Quantity:     input.Quantity,
		CreatedBy:    userID.(uuid.UUID),
	}
	if err := tx.Create(&transfer).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear cesión"})
		return
	}

	tx.Commit()

	// Recargar producto para devolver estado actualizado
	database.DB.First(&product, input.ProductID)

	c.JSON(http.StatusCreated, gin.H{
		"transfer":     transfer,
		"product":      product,
		"product_copy": productTransfer,
	})
}

// ListTransfers lista todas las cesiones (solo admin)
func ListTransfers(c *gin.Context) {
	var transfers []models.AvailabilityTransfer

	// Preload producto
	database.DB.Preload("Product").Order("created_at desc").Find(&transfers)

	c.JSON(http.StatusOK, transfers)
}

// GetUserTransfers lista las cesiones del usuario actual (por agencia)
func GetUserTransfers(c *gin.Context) {
	agencia, _ := c.Get("agencia")
	role, _ := c.Get("role")

	var transfers []models.AvailabilityTransfer

	query := database.DB.Preload("Product").Order("created_at desc")

	// Si no es admin, filtrar por la agencia del usuario
	if role != "admin" {
		query = query.Where("source_agency = ? OR target_agency = ?", agencia, agencia)
	}

	query.Find(&transfers)

	c.JSON(http.StatusOK, transfers)
}
