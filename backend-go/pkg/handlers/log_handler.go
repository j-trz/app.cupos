package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
)


// GetSystemLogs devuelve los logs del sistema paginados, con filtros por nivel,
// fuente, rango de fechas, usuario/agencia/email y búsqueda de texto libre.
func GetSystemLogs(c *gin.Context) {
	page, err := strconv.Atoi(c.Query("page"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit < 1 || limit > 500 {
		limit = 50
	}

	query := database.DB.Model(&models.SystemLog{})

	if level := c.Query("level"); level != "" {
		query = query.Where("level = ?", level)
	}
	if source := c.Query("source"); source != "" {
		query = query.Where("source = ?", source)
	}
	if startDate := c.Query("startDate"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate := c.Query("endDate"); endDate != "" {
		// Incluir hasta el final del día indicado
		query = query.Where("created_at <= ?", endDate+" 23:59:59")
	}
	if q := c.Query("q"); q != "" {
		pattern := "%" + q + "%"
		query = query.Where(
			"message ILIKE ? OR user_name ILIKE ? OR user_email ILIKE ? OR agencia ILIKE ? OR path ILIKE ? OR ip ILIKE ?",
			pattern, pattern, pattern, pattern, pattern, pattern,
		)
	}
	if userEmail := c.Query("userEmail"); userEmail != "" {
		query = query.Where("user_email ILIKE ?", "%"+userEmail+"%")
	}
	if agencia := c.Query("agencia"); agencia != "" {
		query = query.Where("agencia ILIKE ?", "%"+agencia+"%")
	}
	if statusCode := c.Query("status_code"); statusCode != "" {
		query = query.Where("status_code = ?", statusCode)
	}

	var total int64
	query.Count(&total)

	logs := make([]models.SystemLog, 0)
	query.Order("created_at desc").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&logs)

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

// ExportSystemLogsJSON devuelve todos los logs que coincidan con los filtros
// como un archivo JSON descargable (sin paginación, máximo 5000 filas).
func ExportSystemLogsJSON(c *gin.Context) {
	query := database.DB.Model(&models.SystemLog{})

	if level := c.Query("level"); level != "" {
		query = query.Where("level = ?", level)
	}
	if source := c.Query("source"); source != "" {
		query = query.Where("source = ?", source)
	}
	if startDate := c.Query("startDate"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate := c.Query("endDate"); endDate != "" {
		query = query.Where("created_at <= ?", endDate+" 23:59:59")
	}
	if q := c.Query("q"); q != "" {
		pattern := "%" + q + "%"
		query = query.Where(
			"message ILIKE ? OR user_name ILIKE ? OR user_email ILIKE ? OR agencia ILIKE ? OR path ILIKE ? OR ip ILIKE ?",
			pattern, pattern, pattern, pattern, pattern, pattern,
		)
	}
	if userEmail := c.Query("userEmail"); userEmail != "" {
		query = query.Where("user_email ILIKE ?", "%"+userEmail+"%")
	}
	if agencia := c.Query("agencia"); agencia != "" {
		query = query.Where("agencia ILIKE ?", "%"+agencia+"%")
	}

	logs := make([]models.SystemLog, 0)
	query.Order("created_at desc").Limit(5000).Find(&logs)

	now := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("system_logs_%s.json", now)

	payload := gin.H{
		"exported_at": time.Now().UTC().Format(time.RFC3339),
		"count":       len(logs),
		"logs":        logs,
	}

	jsonBytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar JSON"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Content-Type", "application/json; charset=utf-8")
	c.Header("Content-Length", strconv.Itoa(len(jsonBytes)))
	c.Data(http.StatusOK, "application/json; charset=utf-8", jsonBytes)
}
