package handlers

import (
	"net/http"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"github.com/gin-gonic/gin"
)

func GetProducts(c *gin.Context) {
	var products []models.Product
	database.DB.Find(&products)

	// Ocultar Neto1 si no es admin
	role, _ := c.Get("role")
	if role != "admin" {
		for i := range products {
			products[i].Neto1 = 0
		}
	}

	c.JSON(http.StatusOK, products)
}

func CreateProduct(c *gin.Context) {
	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Lógica de categorización automática si no viene especificada
	if product.TipoProducto == "" {
		product.TipoProducto = categorizeProduct(product.CodigoCupo)
	}

	database.DB.Create(&product)
	c.JSON(http.StatusCreated, product)
}

func BulkCreateProducts(c *gin.Context) {
	var input struct {
		Products []models.Product `json:"products"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i := range input.Products {
		if input.Products[i].TipoProducto == "" {
			input.Products[i].TipoProducto = categorizeProduct(input.Products[i].CodigoCupo)
		}
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Create(&input.Products).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"message": "Bulk creation successful", "count": len(input.Products)})
}

func categorizeProduct(codigo string) string {
	codigo = strings.ToUpper(codigo)
	if strings.Contains(codigo, "_CH-") || strings.Contains(codigo, "_CH_") {
		return "CHARTERS"
	}
	if strings.Contains(codigo, "DEST_ARG") {
		return "DESTINO ARG"
	}
	return "CUPOS"
}
