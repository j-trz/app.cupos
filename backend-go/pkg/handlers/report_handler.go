package handlers

import (
	"net/http"
	"strconv"
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
	results := make([]Result, 0)

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
	results := make([]Result, 0)

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
	results := make([]Result, 0)

	database.DB.Table("products").
		Select("destino, temporada, sum(vendidos * op) as rentabilidad, sum(vendidos * neto_1) as costo_real, sum(vendidos * precio) as venta_real, sum(disponibilidad * neto_1) as riesgo").
		Group("destino, temporada").
		Scan(&results)

	c.JSON(http.StatusOK, results)
}

// GetEvolutionRevenue retorna la evolución mensual de ventas, rentabilidad y riesgo
func GetEvolutionRevenue(c *gin.Context) {
	type Result struct {
		Period       string  `json:"period"`
		Ventas       float64 `json:"ventas"`
		Rentabilidad float64 `json:"rentabilidad"`
		Riesgo       float64 `json:"riesgo"`
		Ocupacion    float64 `json:"ocupacion"`
	}
	results := make([]Result, 0)

	query := database.DB.Table("products").
		Select(`to_char(salida, 'YYYY-MM') as period,
		        sum(vendidos * precio) as ventas,
		        sum(vendidos * op) as rentabilidad,
		        sum(disponibilidad * neto_1) as riesgo,
		        CASE WHEN sum(cupo) > 0 THEN (sum(vendidos)::float / sum(cupo)) * 100 ELSE 0 END as ocupacion`).
		Group("period").
		Order("period asc")

	// Filtros opcionales
	if destino := c.Query("destino"); destino != "" && destino != "all" {
		query = query.Where("destino = ?", destino)
	}
	if temporada := c.Query("temporada"); temporada != "" {
		query = query.Where("temporada = ?", temporada)
	}

	query.Scan(&results)
	c.JSON(http.StatusOK, results)
}

// GetOccupancy retorna la ocupación por destino/temporada (para heatmap)
func GetOccupancy(c *gin.Context) {
	type Result struct {
		Destino   string  `json:"destino"`
		Temporada string  `json:"temporada"`
		Ocupacion float64 `json:"ocupacion"`
		Cupos     int     `json:"cupos"`
		Vendidos  int     `json:"vendidos"`
	}
	results := make([]Result, 0)

	query := database.DB.Table("products").
		Select(`destino, temporada,
		        CASE WHEN sum(cupo) > 0 THEN (sum(vendidos)::float / sum(cupo)) * 100 ELSE 0 END as ocupacion,
		        sum(cupo) as cupos,
		        sum(vendidos) as vendidos`).
		Group("destino, temporada").
		Order("ocupacion desc")

	if destino := c.Query("destino"); destino != "" && destino != "all" {
		query = query.Where("destino = ?", destino)
	}

	query.Scan(&results)
	c.JSON(http.StatusOK, results)
}

// GetTopProducts retorna los top productos por rentabilidad o riesgo
func GetTopProducts(c *gin.Context) {
	type Result struct {
		CodigoCupo   string  `json:"codigo_cupo"`
		Destino      string  `json:"destino"`
		Temporada    string  `json:"temporada"`
		Rentabilidad float64 `json:"rentabilidad"`
		Riesgo       float64 `json:"riesgo"`
		Ocupacion    float64 `json:"ocupacion"`
	}
	results := make([]Result, 0)

	metric := c.DefaultQuery("metric", "rentabilidad")
	limitStr := c.DefaultQuery("limit", "5")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 5
	}

	orderBy := "rentabilidad desc"
	if metric == "riesgo" {
		orderBy = "riesgo desc"
	}

	database.DB.Table("products").
		Select(`codigo_cupo, destino, temporada,
		        (vendidos * op) as rentabilidad,
		        (disponibilidad * neto_1) as riesgo,
		        CASE WHEN cupo > 0 THEN (vendidos::float / cupo) * 100 ELSE 0 END as ocupacion`).
		Order(orderBy).
		Limit(limit).
		Scan(&results)

	c.JSON(http.StatusOK, results)
}

// GetRiskAlerts retorna productos con riesgo alto (ocupación < 50% o riesgo > $10K)
func GetRiskAlerts(c *gin.Context) {
	type Result struct {
		CodigoCupo string  `json:"codigo_cupo"`
		Destino    string  `json:"destino"`
		Temporada  string  `json:"temporada"`
		Ocupacion  float64 `json:"ocupacion"`
		Riesgo     float64 `json:"riesgo"`
		Nivel      string  `json:"nivel"`
		DiasSalida int     `json:"dias_salida"`
	}
	results := make([]Result, 0)

	database.DB.Table("products").
		Select(`codigo_cupo, destino, temporada,
		        CASE WHEN cupo > 0 THEN (vendidos::float / cupo) * 100 ELSE 0 END as ocupacion,
		        (disponibilidad * neto_1) as riesgo,
		        CASE
		            WHEN (disponibilidad * neto_1) > 10000 OR (CASE WHEN cupo > 0 THEN (vendidos::float / cupo) * 100 ELSE 0 END) < 50 THEN 'alto'
		            WHEN (disponibilidad * neto_1) > 5000 THEN 'medio'
		            ELSE 'bajo'
		        END as nivel,
		        EXTRACT(DAY FROM (salida - NOW())) as dias_salida`).
		Where("disponibilidad > 0").
		Where("(disponibilidad * neto_1) > 5000 OR (CASE WHEN cupo > 0 THEN (vendidos::float / cupo) * 100 ELSE 0 END) < 50").
		Order("riesgo desc").
		Limit(10).
		Scan(&results)

	c.JSON(http.StatusOK, results)
}

// GetCancellations retorna la tasa de cancelación por período
func GetCancellations(c *gin.Context) {
	type Result struct {
		Period     string  `json:"period"`
		Canceladas int64   `json:"canceladas"`
		Total      int64   `json:"total"`
		Tasa       float64 `json:"tasa"`
	}
	results := make([]Result, 0)

	database.DB.Table("reservations").
		Select(`to_char(created_at, 'YYYY-MM') as period,
		        count(*) filter (where estado = 'cancelada') as canceladas,
		        count(*) as total,
		        CASE WHEN count(*) > 0 THEN (count(*) filter (where estado = 'cancelada')::float / count(*)) * 100 ELSE 0 END as tasa`).
		Group("period").
		Order("period asc").
		Scan(&results)

	c.JSON(http.StatusOK, results)
}
