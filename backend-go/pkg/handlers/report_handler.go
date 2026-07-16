package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
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
	var totalPassengers int64

	database.DB.Model(&models.Reservation{}).Count(&totalReservations)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", "confirmada").Select("COALESCE(sum(precio_venta), 0)").Scan(&totalSales)
	database.DB.Model(&models.Reservation{}).Where("created_at > ?", time.Now().AddDate(0, 0, -30)).Select("count(distinct created_by)").Scan(&activeUsers)
	database.DB.Model(&models.Product{}).Select("COALESCE(avg(disponibilidad), 0)").Scan(&avgAvailability)
	database.DB.Model(&models.Passenger{}).Where("estado IN ?", []string{"confirmada", "confirmado"}).Count(&totalPassengers)

	c.JSON(http.StatusOK, gin.H{
		"totalReservations": totalReservations,
		"totalSales":        totalSales,
		"activeUsers":       activeUsers,
		"avgAvailability":   int(avgAvailability),
		"totalPassengers":   totalPassengers,
	})
}

func GetEvolutionPassengers(c *gin.Context) {
	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	filters := make(map[string]interface{})
	if dest := c.Query("destino"); dest != "" && dest != "all" {
		filters["destino"] = dest
	}
	if temp := c.Query("temporada"); temp != "" && temp != "all" {
		filters["temporada"] = temp
	}

	meses := []string{"01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"}
	evol := make(map[string]int)

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}
		if !passengerMatches(pax, filters) {
			continue
		}

		returnDate := pax.Reservation.Product.FechaRegreso
		if !isPassengerSale(pax, returnDate) {
			continue
		}

		bookingDate := pax.Reservation.CreatedAt
		if pax.Reservation.ID == 0 {
			bookingDate = pax.CreatedAt
		}

		clave := fmt.Sprintf("%d-%s", bookingDate.Year(), meses[bookingDate.Month()-1])
		evol[clave] += pax.NRO
	}

	var periods []string
	for k := range evol {
		periods = append(periods, k)
	}
	sort.Strings(periods)

	type Result struct {
		Period string `json:"period"`
		Total  int64  `json:"total"`
	}
	results := make([]Result, 0)
	for _, p := range periods {
		results = append(results, Result{Period: p, Total: int64(evol[p])})
	}

	c.JSON(http.StatusOK, results)
}

func GetAgencyShare(c *gin.Context) {
	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	filters := make(map[string]interface{})
	if dest := c.Query("destino"); dest != "" && dest != "all" {
		filters["destino"] = dest
	}
	if temp := c.Query("temporada"); temp != "" && temp != "all" {
		filters["temporada"] = temp
	}

	type agencyTotals struct {
		total int64
		venta float64
	}
	porAgencia := make(map[string]*agencyTotals)

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}
		if !passengerMatches(pax, filters) {
			continue
		}

		returnDate := pax.Reservation.Product.FechaRegreso
		if !isPassengerSale(pax, returnDate) {
			continue
		}

		monto := pax.PrecioVenta
		if monto == 0 {
			monto = pax.Reservation.PrecioVenta
		}

		agencia := strings.TrimSpace(pax.Reservation.Agencia)
		if agencia == "" {
			agencia = "Sin agencia"
		}
		if _, ok := porAgencia[agencia]; !ok {
			porAgencia[agencia] = &agencyTotals{}
		}
		porAgencia[agencia].total++
		porAgencia[agencia].venta += monto
	}

	type Result struct {
		Agencia string  `json:"agencia"`
		Total   int64   `json:"total"`
		Venta   float64 `json:"venta"`
	}

	var agencyNames []string
	for k := range porAgencia {
		agencyNames = append(agencyNames, k)
	}
	sort.Strings(agencyNames)

	results := make([]Result, 0, len(agencyNames))
	for _, agencia := range agencyNames {
		results = append(results, Result{
			Agencia: agencia,
			Total:   porAgencia[agencia].total,
			Venta:   porAgencia[agencia].venta,
		})
	}

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
	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	filters := make(map[string]interface{})
	if dest := c.Query("destino"); dest != "" && dest != "all" {
		filters["destino"] = dest
	}
	if temp := c.Query("temporada"); temp != "" && temp != "all" {
		filters["temporada"] = temp
	}

	cuposFiltradosUnicos := filterUniqueProducts(products)

	type Result struct {
		Destino      string  `json:"destino"`
		Temporada    string  `json:"temporada"`
		Rentabilidad float64 `json:"rentabilidad"`
		CostoReal    float64 `json:"costo_real"`
		VentaReal    float64 `json:"venta_real"`
		Riesgo       float64 `json:"riesgo"`
	}

	type DestTempKey struct {
		Destino   string
		Temporada string
	}

	grouped := make(map[DestTempKey]*Result)

	for _, cupo := range cuposFiltradosUnicos {
		if !productMatches(cupo, filters) {
			continue
		}

		destino := cupo.Destino
		if destino == "" {
			destino = "Sin destino"
		}
		temporada := cupo.Temporada
		if temporada == "" {
			temporada = "Sin temporada"
		}

		vendidos := cupo.Vendidos
		tomados := cupo.Cupo

		cancelados := 0
		for _, pax := range passengers {
			if pax.Reservation.Product.ID == cupo.ID && strings.ToLower(pax.Estado) == "cancelada" {
				cancelados++
			}
		}

		disponibles := cupo.Disponibilidad
		if disponibles == 0 && tomados > 0 {
			disponibles = tomados - vendidos - cancelados
		}

		opUnit := cupo.OP
		neto1Unit := cupo.Neto1
		precioUnit := cupo.Precio

		key := DestTempKey{Destino: destino, Temporada: temporada}
		if _, ok := grouped[key]; !ok {
			grouped[key] = &Result{
				Destino:   destino,
				Temporada: temporada,
			}
		}

		item := grouped[key]
		item.Rentabilidad += opUnit * float64(vendidos)
		item.CostoReal += neto1Unit * float64(vendidos)
		item.VentaReal += precioUnit * float64(vendidos)
		item.Riesgo += float64(disponibles) * neto1Unit
	}

	var results []*Result
	for _, v := range grouped {
		results = append(results, v)
	}

	c.JSON(http.StatusOK, results)
}

// GetEvolutionRevenue retorna la evolución mensual de ventas, rentabilidad y riesgo
func GetEvolutionRevenue(c *gin.Context) {
	products, _, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	filters := make(map[string]interface{})
	if dest := c.Query("destino"); dest != "" && dest != "all" {
		filters["destino"] = dest
	}
	if temp := c.Query("temporada"); temp != "" && temp != "all" {
		filters["temporada"] = temp
	}

	type MonthStats struct {
		Period       string
		Ventas       float64
		Rentabilidad float64
		Riesgo       float64
		Cupos        int
		Vendidos     int
	}

	evol := make(map[string]*MonthStats)

	for _, cupo := range products {
		if !productMatches(cupo, filters) {
			continue
		}

		if cupo.FechaSalida == nil {
			continue
		}

		period := cupo.FechaSalida.Format("2006-01")
		if _, ok := evol[period]; !ok {
			evol[period] = &MonthStats{Period: period}
		}

		item := evol[period]
		item.Ventas += float64(cupo.Vendidos) * cupo.Precio
		item.Rentabilidad += float64(cupo.Vendidos) * cupo.OP
		item.Riesgo += float64(cupo.Disponibilidad) * cupo.Neto1
		item.Cupos += cupo.Cupo
		item.Vendidos += cupo.Vendidos
	}

	var periods []string
	for k := range evol {
		periods = append(periods, k)
	}
	sort.Strings(periods)

	type Response struct {
		Period       string  `json:"period"`
		Ventas       float64 `json:"ventas"`
		Rentabilidad float64 `json:"rentabilidad"`
		Riesgo       float64 `json:"riesgo"`
		Ocupacion    float64 `json:"ocupacion"`
	}

	var results []Response
	for _, p := range periods {
		item := evol[p]
		ocupacion := 0.0
		if item.Cupos > 0 {
			ocupacion = (float64(item.Vendidos) / float64(item.Cupos)) * 100
		}
		results = append(results, Response{
			Period:       item.Period,
			Ventas:       item.Ventas,
			Rentabilidad: item.Rentabilidad,
			Riesgo:       item.Riesgo,
			Ocupacion:    ocupacion,
		})
	}

	c.JSON(http.StatusOK, results)
}

// GetOccupancy retorna la ocupación por destino/temporada (para heatmap)
func GetOccupancy(c *gin.Context) {
	products, _, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	filters := make(map[string]interface{})
	if dest := c.Query("destino"); dest != "" && dest != "all" {
		filters["destino"] = dest
	}

	type GroupKey struct {
		Destino   string
		Temporada string
	}

	type Stats struct {
		Cupos    int
		Vendidos int
	}

	grouped := make(map[GroupKey]*Stats)

	for _, cupo := range products {
		if !productMatches(cupo, filters) {
			continue
		}

		destino := cupo.Destino
		if destino == "" {
			destino = "Sin destino"
		}
		temporada := cupo.Temporada
		if temporada == "" {
			temporada = "Sin temporada"
		}

		key := GroupKey{Destino: destino, Temporada: temporada}
		if _, ok := grouped[key]; !ok {
			grouped[key] = &Stats{}
		}
		grouped[key].Cupos += cupo.Cupo
		grouped[key].Vendidos += cupo.Vendidos
	}

	type Result struct {
		Destino   string  `json:"destino"`
		Temporada string  `json:"temporada"`
		Ocupacion float64 `json:"ocupacion"`
		Cupos     int     `json:"cupos"`
		Vendidos  int     `json:"vendidos"`
	}

	var results []Result
	for k, v := range grouped {
		ocupacion := 0.0
		if v.Cupos > 0 {
			ocupacion = (float64(v.Vendidos) / float64(v.Cupos)) * 100
		}
		results = append(results, Result{
			Destino:   k.Destino,
			Temporada: k.Temporada,
			Ocupacion: ocupacion,
			Cupos:     v.Cupos,
			Vendidos:  v.Vendidos,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Ocupacion > results[j].Ocupacion
	})

	c.JSON(http.StatusOK, results)
}

// GetTopProducts retorna los top productos por rentabilidad o riesgo
func GetTopProducts(c *gin.Context) {
	products, _, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	metric := c.DefaultQuery("metric", "rentabilidad")
	limitStr := c.DefaultQuery("limit", "5")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 5
	}

	type Result struct {
		CodigoCupo   string  `json:"codigo_cupo"`
		Destino      string  `json:"destino"`
		Temporada    string  `json:"temporada"`
		Rentabilidad float64 `json:"rentabilidad"`
		Riesgo       float64 `json:"riesgo"`
		Ocupacion    float64 `json:"ocupacion"`
	}

	var results []Result
	for _, cupo := range products {
		rentabilidad := float64(cupo.Vendidos) * cupo.OP
		riesgo := float64(cupo.Disponibilidad) * cupo.Neto1
		ocupacion := 0.0
		if cupo.Cupo > 0 {
			ocupacion = (float64(cupo.Vendidos) / float64(cupo.Cupo)) * 100
		}

		results = append(results, Result{
			CodigoCupo:   cupo.CodigoCupo,
			Destino:      cupo.Destino,
			Temporada:    cupo.Temporada,
			Rentabilidad: rentabilidad,
			Riesgo:       riesgo,
			Ocupacion:    ocupacion,
		})
	}

	if metric == "riesgo" {
		sort.Slice(results, func(i, j int) bool {
			return results[i].Riesgo > results[j].Riesgo
		})
	} else {
		sort.Slice(results, func(i, j int) bool {
			return results[i].Rentabilidad > results[j].Rentabilidad
		})
	}

	if len(results) > limit {
		results = results[:limit]
	}

	c.JSON(http.StatusOK, results)
}

// GetRiskAlerts retorna productos con riesgo alto (ocupación < 50% o riesgo > $10K)
func GetRiskAlerts(c *gin.Context) {
	products, _, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	type Result struct {
		CodigoCupo string  `json:"codigo_cupo"`
		Destino    string  `json:"destino"`
		Temporada  string  `json:"temporada"`
		Ocupacion  float64 `json:"ocupacion"`
		Riesgo     float64 `json:"riesgo"`
		Nivel      string  `json:"nivel"`
		DiasSalida int     `json:"dias_salida"`
	}

	var results []Result
	now := time.Now()

	for _, cupo := range products {
		if cupo.Disponibilidad <= 0 {
			continue
		}

		riesgo := float64(cupo.Disponibilidad) * cupo.Neto1
		ocupacion := 0.0
		if cupo.Cupo > 0 {
			ocupacion = (float64(cupo.Vendidos) / float64(cupo.Cupo)) * 100
		}

		// Only include high risk alerts
		if riesgo > 5000 || ocupacion < 50 {
			nivel := "bajo"
			if riesgo > 10000 || ocupacion < 50 {
				nivel = "alto"
			} else if riesgo > 5000 {
				nivel = "medio"
			}

			diasSalida := 0
			if cupo.FechaSalida != nil {
				diasSalida = int(cupo.FechaSalida.Sub(now).Hours() / 24)
			}

			results = append(results, Result{
				CodigoCupo: cupo.CodigoCupo,
				Destino:      cupo.Destino,
				Temporada:    cupo.Temporada,
				Ocupacion:    ocupacion,
				Riesgo:       riesgo,
				Nivel:        nivel,
				DiasSalida:   diasSalida,
			})
		}
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Riesgo > results[j].Riesgo
	})

	if len(results) > 10 {
		results = results[:10]
	}

	c.JSON(http.StatusOK, results)
}

// GetCancellations retorna la tasa de cancelación por período
func GetCancellations(c *gin.Context) {
	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	type MonthStats struct {
		Period     string
		Canceladas int64
		Total      int64
	}

	evol := make(map[string]*MonthStats)

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}

		bookingDate := pax.Reservation.CreatedAt
		if pax.Reservation.ID == 0 {
			bookingDate = pax.CreatedAt
		}

		period := bookingDate.Format("2006-01")
		if _, ok := evol[period]; !ok {
			evol[period] = &MonthStats{Period: period}
		}

		item := evol[period]
		item.Total++
		if strings.ToLower(pax.Estado) == "cancelada" || strings.ToLower(pax.Reservation.Estado) == "cancelada" {
			item.Canceladas++
		}
	}

	var periods []string
	for k := range evol {
		periods = append(periods, k)
	}
	sort.Strings(periods)

	type Result struct {
		Period     string  `json:"period"`
		Canceladas int64   `json:"canceladas"`
		Total      int64   `json:"total"`
		Tasa       float64 `json:"tasa"`
	}

	var results []Result
	for _, p := range periods {
		item := evol[p]
		tasa := 0.0
		if item.Total > 0 {
			tasa = (float64(item.Canceladas) / float64(item.Total)) * 100
		}
		results = append(results, Result{
			Period:     item.Period,
			Canceladas: item.Canceladas,
			Total:      item.Total,
			Tasa:       tasa,
		})
	}

	c.JSON(http.StatusOK, results)
}
