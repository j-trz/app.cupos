package handlers

import (
	"net/http"
	"strconv"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
)

// GetSystemLogs devuelve los logs del sitio paginados, con filtros por nivel,
// fuente, rango de fechas y búsqueda de texto libre sobre el mensaje.
func GetSystemLogs(c *gin.Context) {
	page, err := strconv.Atoi(c.Query("page"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit < 1 || limit > 200 {
		limit = 25
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
		query = query.Where("created_at <= ?", endDate)
	}
	if q := c.Query("q"); q != "" {
		query = query.Where("message ILIKE ?", "%"+q+"%")
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
