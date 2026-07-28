package handlers

import (
	"encoding/json"
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// resolveAgencyForSettings determina sobre qué fila opera Ajustes: un admin
// edita siempre el default global (agency_id IS NULL) — a diferencia de
// Email, acá no hay selector para gestionar la config de otra agencia puntual
// desde este panel —; cualquier otro rol opera siempre sobre la suya
// (c.Get("agencia")), nunca la global, para que sus cambios no afecten a
// otras agencias.
func resolveAgencyForSettings(c *gin.Context) *uuid.UUID {
	role, _ := c.Get("role")
	if role == "admin" {
		return nil
	}
	agenciaVal, _ := c.Get("agencia")
	agenciaCode, _ := agenciaVal.(string)
	if agenciaCode == "" {
		return nil
	}
	agency, err := services.FindAgencyByCodeOrName(agenciaCode)
	if err != nil {
		return nil
	}
	return &agency.ID
}

// ListSettings devuelve, para un admin, los ajustes globales tal cual. Para
// el resto, devuelve el mismo universo de keys pero con cualquier override de
// la propia agencia superpuesto al valor global — así el frontend siempre ve
// un valor por key sin tener que resolver el fallback del lado del cliente.
func ListSettings(c *gin.Context) {
	agencyID := resolveAgencyForSettings(c)

	var globalSettings []models.SystemSetting
	database.DB.Where("agency_id IS NULL").Find(&globalSettings)

	if agencyID == nil {
		c.JSON(http.StatusOK, globalSettings)
		return
	}

	var agencySettings []models.SystemSetting
	database.DB.Where("agency_id = ?", *agencyID).Find(&agencySettings)
	overrides := make(map[string]models.SystemSetting, len(agencySettings))
	for _, s := range agencySettings {
		overrides[s.Key] = s
	}

	merged := make([]models.SystemSetting, 0, len(globalSettings))
	for _, g := range globalSettings {
		if override, ok := overrides[g.Key]; ok {
			merged = append(merged, override)
		} else {
			merged = append(merged, g)
		}
	}
	c.JSON(http.StatusOK, merged)
}

// UpdateSetting crea o actualiza (upsert) un ajuste por key, siempre sobre la
// fila que le corresponde al caller (global para admin, la propia agencia
// para el resto — ver resolveAgencyForSettings). Antes exigía que la fila ya
// existiera (First-or-404), lo que dejaba cualquier key nueva sin forma de
// guardarse desde el frontend salvo que alguien la insertara a mano en la
// base — ahora se puede setear cualquier ajuste nuevo desde Ajustes sin
// depender de un seed previo.
func UpdateSetting(c *gin.Context) {
	key := c.Param("key")
	agencyID := resolveAgencyForSettings(c)

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

	query := database.DB.Where("key = ?", key)
	if agencyID != nil {
		query = query.Where("agency_id = ?", *agencyID)
	} else {
		query = query.Where("agency_id IS NULL")
	}

	var setting models.SystemSetting
	if err := query.First(&setting).Error; err != nil {
		setting = models.SystemSetting{Key: key, Value: valueJSON, AgencyID: agencyID}
		database.DB.Create(&setting)
	} else {
		setting.Value = valueJSON
		database.DB.Save(&setting)
	}
	c.JSON(http.StatusOK, setting)
}
