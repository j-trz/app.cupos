package handlers

import (
	"net/http"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
)

func GetStats(c *gin.Context) {
	var totalReservations int64
	var totalSales float64
	var activeUsers int64
	var avgAvailability float64

	database.DB.Model(&models.Reservation{}).Count(&totalReservations)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", "confirmada").Select("COALESCE(sum(precio_venta), 0)").Scan(&totalSales)
	database.DB.Model(&models.Reservation{}).Where("created_at > ?", time.Now().AddDate(0, 0, -30)).Select("count(distinct created_by)").Scan(&activeUsers)
	database.DB.Model(&models.Product{}).Select("COALESCE(avg(disponibilidad), 0)").Scan(&avgAvailability)

	c.JSON(http.StatusOK, gin.H{
		"totalReservations": totalReservations,
		"totalSales":        totalSales,
		"activeUsers":       activeUsers,
		"avgAvailability":   int(avgAvailability),
	})
}

func GetEvolutionPassengers(c *gin.Context) {
	type Result struct {
		Period string `json:"period"`
		Total  int64  `json:"total"`
	}
	var results []Result

	database.DB.Table("passengers").
		Select("to_char(created_at, 'YYYY-MM') as period, sum(nro) as total").
		Group("period").
		Order("period asc").
		Scan(&results)

	c.JSON(http.StatusOK, results)
}

func GetAgencyShare(c *gin.Context) {
	type Result struct {
		Agencia string  `json:"agencia"`
		Total   int64   `json:"total"`
		Venta   float64 `json:"venta"`
	}
	var results []Result

	database.DB.Table("reservations").
		Select("CASE WHEN lower(agencia) LIKE '%tienda%' THEN 'Tienda Viajes' ELSE 'Jetmar' END as agencia, count(*) as total, sum(precio_venta) as venta").
		Where("estado = ?", "confirmada").
		Group("agencia").
		Scan(&results)

	c.JSON(http.StatusOK, results)
}

// GetUserMetrics obtiene las métricas personales del usuario autenticado
func GetUserMetrics(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// Si es admin o agency_admin, no tiene métricas personales (usa el dashboard general)
	if role == "admin" || role == "agency_admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este endpoint es solo para usuarios regulares"})
		return
	}

	var totalReservations int64
	var totalSales float64
	var pendingReservations int64
	var confirmedReservations int64

	// Total de reservas del usuario
	database.DB.Model(&models.Reservation{}).Where("created_by = ?", userID).Count(&totalReservations)

	// Ventas totales (reservas confirmadas)
	database.DB.Model(&models.Reservation{}).Where("created_by = ? AND estado = ?", userID, "confirmada").Select("COALESCE(sum(precio_venta), 0)").Scan(&totalSales)

	// Reservas pendientes
	database.DB.Model(&models.Reservation{}).Where("created_by = ? AND estado IN ?", userID, []string{"solicitada", "bloqueo_temporal", "pendiente"}).Count(&pendingReservations)

	// Reservas confirmadas
	database.DB.Model(&models.Reservation{}).Where("created_by = ? AND estado = ?", userID, "confirmada").Count(&confirmedReservations)

	c.JSON(http.StatusOK, gin.H{
		"totalReservations":     totalReservations,
		"totalSales":            totalSales,
		"pendingReservations":   pendingReservations,
		"confirmedReservations": confirmedReservations,
	})
}

func GetDestinationsDetail(c *gin.Context) {
	type Result struct {
		Destino      string  `json:"destino"`
		Temporada    string  `json:"temporada"`
		Rentabilidad float64 `json:"rentabilidad"`
		CostoReal    float64 `json:"costo_real"`
		VentaReal    float64 `json:"venta_real"`
		Riesgo       float64 `json:"riesgo"`
	}
	var results []Result

	database.DB.Table("products").
		Select("destino, temporada, sum(vendidos * op) as rentabilidad, sum(vendidos * neto_1) as costo_real, sum(vendidos * precio) as venta_real, sum(disponibilidad * neto_1) as riesgo").
		Group("destino, temporada").
		Scan(&results)

	c.JSON(http.StatusOK, results)
}
