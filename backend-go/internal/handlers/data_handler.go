package handlers

import (
	"net/http"

	"backend-go/internal/database"
	"github.com/gin-gonic/gin"
)

func GetData(c *gin.Context) {
	table := c.Query("table")
	if table == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nombre de tabla requerido"})
		return
	}

	var results []map[string]interface{}
	if err := database.DB.Table(table).Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar la tabla: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}

func ExecuteCRUD(c *gin.Context) {
	var input struct {
		Table     string                 `json:"table"`
		Operation string                 `json:"operation"`
		Data      map[string]interface{} `json:"data"`
		ID        interface{}            `json:"id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch input.Operation {
	case "insert":
		if err := database.DB.Table(input.Table).Create(input.Data).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, input.Data)
	case "update":
		if err := database.DB.Table(input.Table).Where("id = ?", input.ID).Updates(input.Data).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, input.Data)
	case "delete":
		if err := database.DB.Table(input.Table).Where("id = ?", input.ID).Delete(nil).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Registro eliminado"})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Operación no soportada"})
	}
}
