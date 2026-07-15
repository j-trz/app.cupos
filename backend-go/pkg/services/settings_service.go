package services

import (
	"encoding/json"
	"strconv"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
)

// GetSetting devuelve el valor crudo (como string) de un SystemSetting por
// key, y false si no existe. Value se guarda como JSONB y puede ser un string
// o un número según lo que haya mandado el formulario de Ajustes.
func GetSetting(key string) (string, bool) {
	var s models.SystemSetting
	if err := database.DB.First(&s, "key = ?", key).Error; err != nil {
		return "", false
	}
	var raw interface{}
	if err := json.Unmarshal(s.Value, &raw); err != nil {
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
