package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// createdByFromContext extrae el uuid del usuario autenticado desde el contexto Gin (o nil si no hay).
func createdByFromContext(c *gin.Context) *uuid.UUID {
	val, ok := c.Get("userID")
	if !ok {
		return nil
	}
	s, ok := val.(string)
	if !ok {
		return nil
	}
	uid, err := uuid.Parse(s)
	if err != nil {
		return nil
	}
	return &uid
}

// fixNumbers convierte strings numéricos a float64/int para evitar errores de unmarshal
func fixNumbers(data map[string]interface{}) {
	floatFields := []string{"precio", "neto_1", "op", "inf_fare", "chd_fare"}
	intFields := []string{"disponibilidad", "cupo", "vendidos", "bloqueo_temporal_minutos"}
	for _, field := range floatFields {
		if v, ok := data[field]; ok {
			if s, ok := v.(string); ok {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					data[field] = f
				}
			}
		}
	}
	for _, field := range intFields {
		if v, ok := data[field]; ok {
			if s, ok := v.(string); ok {
				if i, err := strconv.Atoi(s); err == nil {
					data[field] = i
				}
			}
		}
	}
}

// fixDates convierte strings "YYYY-MM-DD" a RFC3339 en un mapa de datos
func fixDates(data map[string]interface{}) {
	dateFields := []string{"salida", "regreso", "fecha_salida", "fecha_regreso"}
	for _, field := range dateFields {
		if v, ok := data[field]; ok && v != nil {
			if s, ok := v.(string); ok && len(s) == 10 {
				data[field] = s + "T00:00:00Z"
			}
		}
	}
}

func GetProducts(c *gin.Context) {
	var products []models.Product
	database.DB.Find(&products)

	role, _ := c.Get("role")
	if role != "admin" {
		for i := range products {
			products[i].Neto1 = 0
		}
	}

	c.JSON(http.StatusOK, products)
}

func GetProductByID(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}
	role, _ := c.Get("role")
	if role != "admin" {
		product.Neto1 = 0
	}
	c.JSON(http.StatusOK, product)
}

func CreateProduct(c *gin.Context) {
	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fixDates(rawData)
	fixNumbers(rawData)

	jsonBytes, _ := json.Marshal(rawData)
	var product models.Product
	if err := json.Unmarshal(jsonBytes, &product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if product.TipoProducto == "" {
		product.TipoProducto = categorizeProduct(product.CodigoCupo)
	}

	database.DB.Create(&product)

	services.NotifyBroadcast(createdByFromContext(c), "new_product", "Nuevo producto disponible",
		fmt.Sprintf("Se agregó el producto %s hacia %s (%s)", product.CodigoCupo, product.Destino, product.Compania))

	c.JSON(http.StatusCreated, product)
}

func BulkCreateProducts(c *gin.Context) {
	var rawInput struct {
		Products []map[string]interface{} `json:"products"`
	}
	if err := c.ShouldBindJSON(&rawInput); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i := range rawInput.Products {
		fixDates(rawInput.Products[i])
		fixNumbers(rawInput.Products[i])
	}
	jsonBytes, _ := json.Marshal(rawInput)
	var input struct {
		Products []models.Product `json:"products"`
	}
	if err := json.Unmarshal(jsonBytes, &input); err != nil {
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

	if len(input.Products) > 0 {
		services.NotifyBroadcast(createdByFromContext(c), "new_product", "Nuevos productos disponibles",
			fmt.Sprintf("Se agregaron %d productos nuevos a disponibilidad", len(input.Products)))
	}

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
