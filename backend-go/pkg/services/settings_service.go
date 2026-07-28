package services

import (
	"encoding/json"
	"strconv"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"gorm.io/datatypes"
)

// GetSetting devuelve el valor crudo (como string) del SystemSetting GLOBAL
// (agency_id IS NULL) por key, y false si no existe. Value se guarda como
// JSONB y puede ser un string o un número según lo que haya mandado el
// formulario de Ajustes. El filtro por agency_id IS NULL es necesario porque,
// desde que existen overrides por agencia, puede haber más de una fila con la
// misma key.
func GetSetting(key string) (string, bool) {
	var s models.SystemSetting
	if err := database.DB.Where("key = ? AND agency_id IS NULL", key).First(&s).Error; err != nil {
		return "", false
	}
	return settingValueToString(s.Value)
}

func settingValueToString(value datatypes.JSON) (string, bool) {
	var raw interface{}
	if err := json.Unmarshal(value, &raw); err != nil {
		return "", false
	}
	switch v := raw.(type) {
	case string:
		return v, true
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), true
	default:
		return "", false
	}
}

// GetIntSetting lee un ajuste numérico global (ej. minutos de bloqueo
// temporal por defecto, horas de retención de historial de IA). Si el ajuste
// no existe, no es numérico, o es <= 0, devuelve def sin romper el flujo que
// lo llama.
func GetIntSetting(key string, def int) int {
	raw, ok := GetSetting(key)
	if !ok {
		return def
	}
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n <= 0 {
		return def
	}
	return n
}

// GetIntSettingForAgency es la versión agencia-aware de GetIntSetting: busca
// primero un override de la agencia dada (aceptando código o nombre) y, si no
// existe, cae al ajuste global — mismo patrón de 2 queries secuenciales que
// resolveTemplate en email_service.go.
func GetIntSettingForAgency(key, agencyCode string, def int) int {
	if agencyCode != "" {
		if agency, err := FindAgencyByCodeOrName(agencyCode); err == nil {
			var s models.SystemSetting
			if err := database.DB.Where("key = ? AND agency_id = ?", key, agency.ID).First(&s).Error; err == nil {
				if raw, ok := settingValueToString(s.Value); ok {
					if n, err2 := strconv.Atoi(strings.TrimSpace(raw)); err2 == nil && n > 0 {
						return n
					}
				}
			}
		}
	}
	return GetIntSetting(key, def)
}
