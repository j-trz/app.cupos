package handlers

import (
	"encoding/json"
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

// UpdateSetting crea o actualiza (upsert) un ajuste por key. Antes exigía que
// la fila ya existiera (First-or-404), lo que dejaba cualquier key nueva sin
// forma de guardarse desde el frontend salvo que alguien la insertara a mano
// en la base — ahora un admin puede setear cualquier ajuste nuevo desde
// Ajustes sin depender de un seed previo.
func UpdateSetting(c *gin.Context) {
	key := c.Param("key")

	var input struct {
		Value interface{} `json:"value"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valueJSON, err := json.Marshal(input.Value)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valor inválido"})
		return
	}

	var setting models.SystemSetting
	if err := database.DB.First(&setting, "key = ?", key).Error; err != nil {
		setting = models.SystemSetting{Key: key, Value: valueJSON}
		database.DB.Create(&setting)
	} else {
		setting.Value = valueJSON
		database.DB.Save(&setting)
	}
	c.JSON(http.StatusOK, setting)
}
