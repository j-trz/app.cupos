package handlers

import (
	"net/http"

	"backend-go/internal/database"
	"backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func GetStats(c *gin.Context) {
	var totalReservations int64
	var totalSales float64

	database.DB.Model(&models.Reservation{}).Count(&totalReservations)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", "confirmada").Select("sum(precio_venta)").Scan(&totalSales)

	c.JSON(http.StatusOK, gin.H{
		"total_reservations": totalReservations,
		"total_sales":        totalSales,
	})
}
