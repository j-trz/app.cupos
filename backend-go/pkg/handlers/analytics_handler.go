package handlers

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
)

// Request and Response Structs

type BaseRequest struct {
	UserID  string                 `json:"userId"`
	Filters map[string]interface{} `json:"filters"`
}

type GranularRequest struct {
	BaseRequest
	Granularidad string `json:"granularidad"`
}

type CupoRequest struct {
	BaseRequest
	CodigoCupo string `json:"codigoCupo"`
}

type FieldResponse struct {
	Field  string   `json:"field"`
	Values []string `json:"values"`
}

// Normalized string helpers for reliable Spanish comparisons

func normalize(str string) string {
	s := strings.ToLower(strings.TrimSpace(str))
	replacer := strings.NewReplacer(
		"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u",
		"ü", "u", "ñ", "n",
		"Á", "a", "É", "e", "Í", "i", "Ó", "o", "Ú", "u",
	)
	s = replacer.Replace(s)
	s = strings.Join(strings.Fields(s), " ") // replace multiple spaces with single space
	return s
}

func canonicalTipoProducto(v string) string {
	n := normalize(v)
	if n == "" {
		return ""
	}
	if n == "ch" || n == "ch-" || n == "charter" || strings.HasPrefix(n, "charter") {
		return "CHARTERS"
	}
	if n == "aereo" || n == "cupo" || n == "cupos" {
		return "CUPOS"
	}
	if n == "dest_arg" || n == "destino arg" || n == "dest arg" || n == "destino argentina" {
		return "DESTINO ARG"
	}
	return strings.ToUpper(strings.TrimSpace(v))
}

func getTipoProductoFromCupo(c models.Product) string {
	codigo := strings.ToUpper(c.CodigoCupo)
	tipoServ := strings.ToUpper(c.TipoProducto)
	if strings.Contains(codigo, "_CH-") || strings.Contains(codigo, "_CH_") {
		return "CHARTERS"
	}
	if strings.Contains(codigo, "DEST_ARG") || strings.Contains(codigo, "-DEST_ARG-") {
		return "DESTINO ARG"
	}
	if tipoServ == "AÉREO" || tipoServ == "AEREO" || tipoServ == "CUPOS" {
		return "CUPOS"
	}
	return ""
}

func expandFilterValues(val interface{}) []string {
	if val == nil {
		return []string{}
	}
	var rawStr string
	switch v := val.(type) {
	case string:
		rawStr = v
	case []interface{}:
		var result []string
		seen := make(map[string]bool)
		for _, item := range v {
			if str, ok := item.(string); ok {
				trimmed := strings.TrimSpace(str)
				if trimmed != "" && !seen[trimmed] {
					seen[trimmed] = true
					result = append(result, trimmed)
				}
			}
		}
		return result
	case []string:
		var result []string
		seen := make(map[string]bool)
		for _, s := range v {
			trimmed := strings.TrimSpace(s)
			if trimmed != "" && !seen[trimmed] {
				seen[trimmed] = true
				result = append(result, trimmed)
			}
		}
		return result
	default:
		return []string{}
	}

	parts := strings.FieldsFunc(rawStr, func(r rune) bool {
		return r == ',' || r == ';'
	})

	var result []string
	seen := make(map[string]bool)
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" && !seen[trimmed] {
			seen[trimmed] = true
			result = append(result, trimmed)
		}
	}
	return result
}

func isEmptyFilters(filters map[string]interface{}) bool {
	if len(filters) == 0 {
		return true
	}
	for _, val := range filters {
		if val == nil {
			continue
		}
		switch v := val.(type) {
		case string:
			if strings.TrimSpace(v) != "" {
				return false
			}
		case []interface{}:
			if len(v) > 0 {
				return false
			}
		case []string:
			if len(v) > 0 {
				return false
			}
		}
	}
	return true
}

func filterUniqueProducts(products []models.Product) []models.Product {
	seen := make(map[string]bool)
	var unique []models.Product
	for _, p := range products {
		code := strings.TrimSpace(p.CodigoCupo)
		if code == "" || seen[code] {
			continue
		}
		seen[code] = true
		unique = append(unique, p)
	}
	return unique
}

func cumpleEdadMenor2Anios(nacimiento, regreso *time.Time) bool {
	if nacimiento == nil || regreso == nil {
		return false
	}
	if nacimiento.IsZero() || regreso.IsZero() {
		return false
	}
	diff := regreso.Sub(*nacimiento)
	years := diff.Hours() / (24 * 365.25)
	return years < 2
}

func isPassengerSale(p models.Passenger, returnDate *time.Time) bool {
	if p.NRO == 1 {
		return true
	}
	if p.NRO == 0 {
		return cumpleEdadMenor2Anios(p.Nacimiento, returnDate)
	}
	return false
}

func loadDataFromDB() ([]models.Product, []models.Passenger, error) {
	var products []models.Product
	if err := database.DB.Find(&products).Error; err != nil {
		return nil, nil, err
	}

	var passengers []models.Passenger
	if err := database.DB.Preload("Reservation").Preload("Reservation.Product").Find(&passengers).Error; err != nil {
		return nil, nil, err
	}

	return products, passengers, nil
}

func productMatches(c models.Product, filters map[string]interface{}) bool {
	if isEmptyFilters(filters) {
		return true
	}
	for key, val := range filters {
		valsToCheck := expandFilterValues(val)
		if len(valsToCheck) == 0 {
			continue
		}

		keyNorm := normalize(key)
		match := false

		if keyNorm == "temporada" {
			for _, v := range valsToCheck {
				if normalize(c.Temporada) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "tipo de servicio" || keyNorm == "tipo servicio" {
			for _, v := range valsToCheck {
				if normalize(c.TipoProducto) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "tipo producto" || keyNorm == "tipo de operacion" {
			tipoProd := getTipoProductoFromCupo(c)
			for _, v := range valsToCheck {
				if canonicalTipoProducto(tipoProd) == canonicalTipoProducto(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "destino" {
			for _, v := range valsToCheck {
				if normalize(c.Destino) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "proveedor" || keyNorm == "compania" || keyNorm == "aerolinea" {
			for _, v := range valsToCheck {
				if normalize(c.Compania) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "agencia" {
			for _, v := range valsToCheck {
				if normalize(c.Agencia) == normalize(v) {
					match = true
					break
				}
			}
		} else {
			if keyNorm == "codigo de cupo" || keyNorm == "codigo" {
				for _, v := range valsToCheck {
					if normalize(c.CodigoCupo) == normalize(v) {
						match = true
						break
					}
				}
			} else {
				match = true
			}
		}

		if !match {
			return false
		}
	}
	return true
}

func passengerMatches(p models.Passenger, filters map[string]interface{}) bool {
	if isEmptyFilters(filters) {
		return true
	}

	product := p.Reservation.Product
	paxAgencia := p.Reservation.Agencia
	paxTemporada := product.Temporada
	paxDestino := product.Destino
	paxTipoServicio := product.TipoProducto
	paxTipoProducto := getTipoProductoFromCupo(product)
	paxProveedor := product.Compania

	for key, val := range filters {
		valsToCheck := expandFilterValues(val)
		if len(valsToCheck) == 0 {
			continue
		}

		keyNorm := normalize(key)
		match := false

		if keyNorm == "temporada" {
			for _, v := range valsToCheck {
				if normalize(paxTemporada) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "tipo de servicio" || keyNorm == "tipo servicio" {
			for _, v := range valsToCheck {
				if normalize(paxTipoServicio) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "tipo producto" || keyNorm == "tipo de operacion" {
			for _, v := range valsToCheck {
				if canonicalTipoProducto(paxTipoProducto) == canonicalTipoProducto(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "destino" {
			for _, v := range valsToCheck {
				if normalize(paxDestino) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "proveedor" || keyNorm == "compania" || keyNorm == "aerolinea" {
			for _, v := range valsToCheck {
				if normalize(paxProveedor) == normalize(v) {
					match = true
					break
				}
			}
		} else if keyNorm == "agencia" {
			for _, v := range valsToCheck {
				if normalize(paxAgencia) == normalize(v) {
					match = true
					break
				}
			}
		} else {
			match = true
		}

		if !match {
			return false
		}
	}
	return true
}

// Nunca nil: si el mapa está vacío (ej. cero pasajeros porque no hay ventas
// confirmadas), un slice nil acá serializa como "values": null en el JSON y
// rompe el .map del lado del frontend (FiltersPanel, etc.).
func mapToSlice(m map[string]bool) []string {
	s := []string{}
	for k := range m {
		if k != "" {
			s = append(s, k)
		}
	}
	sort.Strings(s)
	return s
}

// intMapKeys devuelve las claves (ordenadas) de un contador por-agencia — se
// usa en vez de mapToSlice porque acá el valor es la cuenta de ventas, no un
// simple flag de presencia. Mismo resguardo anti-nil que mapToSlice.
func intMapKeys(m map[string]int) []string {
	s := []string{}
	for k := range m {
		if k != "" {
			s = append(s, k)
		}
	}
	sort.Strings(s)
	return s
}

type DateRange struct {
	Inicio time.Time
	Fin    time.Time
}

func getDateFilter(granularity string, now time.Time) *DateRange {
	hoy := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	finDelDia := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, now.Location())

	switch granularity {
	case "hoy":
		return &DateRange{Inicio: hoy, Fin: finDelDia}
	case "semana":
		inicioSemana := hoy.AddDate(0, 0, -6)
		return &DateRange{Inicio: inicioSemana, Fin: finDelDia}
	case "mes_actual":
		inicioMes := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		return &DateRange{Inicio: inicioMes, Fin: finDelDia}
	}

	if len(granularity) == 2 && strings.HasPrefix(granularity, "q") {
		qNum := int(granularity[1] - '0')
		if qNum >= 1 && qNum <= 4 {
			mesInicio := (qNum - 1) * 3
			inicio := time.Date(now.Year(), time.Month(mesInicio+1), 1, 0, 0, 0, 0, now.Location())
			fin := time.Date(now.Year(), time.Month(mesInicio+3)+1, 0, 23, 59, 59, 999999999, now.Location())
			return &DateRange{Inicio: inicio, Fin: fin}
		}
	}

	return nil
}

func getGroupKey(d time.Time, granularity string) string {
	meses := []string{"ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"}
	diasSemana := []string{"Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"}

	switch granularity {
	case "hoy":
		return fmt.Sprintf("%d:00", d.Hour())
	case "semana":
		return fmt.Sprintf("%s %d", diasSemana[d.Weekday()], d.Day())
	case "mes_actual":
		return fmt.Sprintf("%d %s", d.Day(), meses[d.Month()-1])
	default:
		return fmt.Sprintf("%s %d", meses[d.Month()-1], d.Year())
	}
}

func getOrderedKeys(granularity string, now time.Time, keysWithData []string) []string {
	meses := []string{"ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"}
	diasSemana := []string{"Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"}

	// Nunca nil: si no hay datos (ej. 0 ventas), un slice nil acá serializa
	// como "labels": null en el JSON y rompe el .map del lado del frontend.
	keys := []string{}

	if granularity == "hoy" {
		minHour := now.Hour()
		for _, k := range keysWithData {
			var hr int
			if _, err := fmt.Sscanf(k, "%d:00", &hr); err == nil {
				if hr < minHour {
					minHour = hr
				}
			}
		}
		for h := minHour; h <= now.Hour(); h++ {
			keys = append(keys, fmt.Sprintf("%d:00", h))
		}
	} else if granularity == "semana" {
		hoy := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		for i := 6; i >= 0; i-- {
			fecha := hoy.AddDate(0, 0, -i)
			clave := fmt.Sprintf("%s %d", diasSemana[fecha.Weekday()], fecha.Day())
			keys = append(keys, clave)
		}
	} else if granularity == "mes_actual" {
		for d := 1; d <= now.Day(); d++ {
			clave := fmt.Sprintf("%d %s", d, meses[now.Month()-1])
			keys = append(keys, clave)
		}
	} else if len(granularity) == 2 && strings.HasPrefix(granularity, "q") {
		qNum := int(granularity[1] - '0')
		if qNum >= 1 && qNum <= 4 {
			mesInicio := (qNum - 1) * 3
			for i := 0; i < 3; i++ {
				clave := fmt.Sprintf("%s %d", meses[mesInicio+i], now.Year())
				keys = append(keys, clave)
			}
		}
	} else {
		keys = append(keys, keysWithData...)
		sort.Slice(keys, func(i, j int) bool {
			p1 := strings.Split(keys[i], " ")
			p2 := strings.Split(keys[j], " ")
			if len(p1) != 2 || len(p2) != 2 {
				return keys[i] < keys[j]
			}
			var m1, m2, y1, y2 int
			fmt.Sscanf(p1[1], "%d", &y1)
			fmt.Sscanf(p2[1], "%d", &y2)
			for idx, mName := range meses {
				if mName == p1[0] {
					m1 = idx
				}
				if mName == p2[0] {
					m2 = idx
				}
			}
			ord1 := y1*12 + m1
			ord2 := y2*12 + m2
			return ord1 < ord2
		})
		dedup := []string{}
		seen := make(map[string]bool)
		for _, k := range keys {
			if !seen[k] {
				seen[k] = true
				dedup = append(dedup, k)
			}
		}
		keys = dedup
	}

	return keys
}

// Handlers

func GetFieldsHandler(c *gin.Context) {
	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	seasons := make(map[string]bool)
	destinations := make(map[string]bool)
	suppliers := make(map[string]bool)
	services := make(map[string]bool)
	operations := make(map[string]bool)
	agencies := make(map[string]bool)

	for _, p := range products {
		if p.Temporada != "" {
			seasons[p.Temporada] = true
		}
		if p.Destino != "" {
			destinations[p.Destino] = true
		}
		if p.Compania != "" {
			suppliers[p.Compania] = true
		}
		if p.TipoProducto != "" {
			services[p.TipoProducto] = true
		}
		op := getTipoProductoFromCupo(p)
		if op != "" {
			operations[op] = true
		}
	}

	for _, p := range passengers {
		if p.Reservation.Agencia != "" {
			agencies[p.Reservation.Agencia] = true
		}
	}

	fields := []FieldResponse{
		{Field: "Temporada", Values: mapToSlice(seasons)},
		{Field: "Destino", Values: mapToSlice(destinations)},
		{Field: "Proveedor", Values: mapToSlice(suppliers)},
		{Field: "Tipo Servicio", Values: mapToSlice(services)},
		{Field: "Tipo producto", Values: mapToSlice(operations)},
		{Field: "Agencia", Values: mapToSlice(agencies)},
	}

	c.JSON(200, gin.H{"fields": fields})
}

// agencyColorPalette asigna un color estable por índice de agencia — se
// reemplaza el viejo esquema fijo Jetmar (azul) / Tienda Viajes (rojo), que
// ya no tiene sentido ahora que el sistema soporta agencias dinámicas.
var agencyColorPalette = []string{
	"#2563eb", "#e11d48", "#16a34a", "#f59e0b",
	"#7c3aed", "#0891b2", "#db2777", "#65a30d",
}

func EvolucionAgenciasHandler(c *gin.Context) {
	var req GranularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	callerAgencia, _ := agenciaVal.(string)

	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	granularity := strings.ToLower(req.Granularidad)
	if granularity == "" {
		granularity = "mes"
	}

	now := time.Now()
	dateFilter := getDateFilter(granularity, now)

	evol := make(map[string]map[string]int) // periodo -> agencia -> ventas
	var rawKeys []string
	agencySet := make(map[string]bool)

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}

		agenciaReal := strings.TrimSpace(pax.Reservation.Agencia)
		if agenciaReal == "" {
			agenciaReal = "Sin agencia"
		}

		// agency_admin solo puede ver su propia agencia — nunca la de otra,
		// sin importar qué filtros mande el frontend.
		if role == "agency_admin" && normalize(agenciaReal) != normalize(callerAgencia) {
			continue
		}

		if !passengerMatches(pax, req.Filters) {
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

		if dateFilter != nil && (bookingDate.Before(dateFilter.Inicio) || bookingDate.After(dateFilter.Fin)) {
			continue
		}

		clave := getGroupKey(bookingDate, granularity)
		if _, ok := evol[clave]; !ok {
			evol[clave] = make(map[string]int)
			rawKeys = append(rawKeys, clave)
		}
		evol[clave][agenciaReal]++
		agencySet[agenciaReal] = true
	}

	orderedKeys := getOrderedKeys(granularity, now, rawKeys)
	agencyNames := mapToSlice(agencySet)

	datasets := make([]gin.H, len(agencyNames))
	for i, agencia := range agencyNames {
		data := make([]int, len(orderedKeys))
		for j, k := range orderedKeys {
			data[j] = evol[k][agencia]
		}
		color := agencyColorPalette[i%len(agencyColorPalette)]
		datasets[i] = gin.H{
			"label":           agencia,
			"data":            data,
			"borderColor":     color,
			"backgroundColor": color + "26",
		}
	}

	c.JSON(200, gin.H{
		"labels":   orderedKeys,
		"datasets": datasets,
	})
}

func AgenciasDataHandler(c *gin.Context) {
	var req BaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	callerAgencia, _ := agenciaVal.(string)

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	ventasPorAgencia := make(map[string]int)
	registrarVenta := func(agencia string) {
		agenciaReal := strings.TrimSpace(agencia)
		if agenciaReal == "" {
			agenciaReal = "Sin agencia"
		}
		if role == "agency_admin" && normalize(agenciaReal) != normalize(callerAgencia) {
			return
		}
		ventasPorAgencia[agenciaReal]++
	}

	destinoFilterRaw, hasDestinoFilter := req.Filters["Destino"]
	if !hasDestinoFilter {
		destinoFilterRaw, hasDestinoFilter = req.Filters["destino"]
	}

	if hasDestinoFilter && destinoFilterRaw != nil && strings.TrimSpace(fmt.Sprintf("%v", destinoFilterRaw)) != "" {
		destinosToCheck := expandFilterValues(destinoFilterRaw)
		var destsNormalized []string
		for _, d := range destinosToCheck {
			destsNormalized = append(destsNormalized, normalize(d))
		}

		cuposUnicos := filterUniqueProducts(products)
		var cuposMatch []models.Product
		for _, cupo := range cuposUnicos {
			cupoDest := normalize(cupo.Destino)
			for _, d := range destsNormalized {
				if cupoDest == d {
					cuposMatch = append(cuposMatch, cupo)
					break
				}
			}
		}

		for _, cupo := range cuposMatch {
			for _, pax := range passengers {
				if pax.Reservation.Product.ID == 0 {
					continue
				}
				if normalize(pax.Reservation.Product.CodigoCupo) != normalize(cupo.CodigoCupo) {
					continue
				}

				returnDate := pax.Reservation.Product.FechaRegreso
				if !isPassengerSale(pax, returnDate) {
					continue
				}

				registrarVenta(pax.Reservation.Agencia)
			}
		}
	} else {
		for _, pax := range passengers {
			if pax.Reservation.Product.ID == 0 {
				continue
			}

			if !passengerMatches(pax, req.Filters) {
				continue
			}

			returnDate := pax.Reservation.Product.FechaRegreso
			if !isPassengerSale(pax, returnDate) {
				continue
			}

			registrarVenta(pax.Reservation.Agencia)
		}
	}

	agencyNames := intMapKeys(ventasPorAgencia)
	total := 0
	for _, v := range ventasPorAgencia {
		total += v
	}
	if total == 0 {
		total = 1
	}

	values := make([]int, len(agencyNames))
	shares := make([]float64, len(agencyNames))
	for i, agencia := range agencyNames {
		v := ventasPorAgencia[agencia]
		values[i] = v
		shares[i] = math.Round((float64(v)/float64(total))*1000) / 10
	}

	c.JSON(200, gin.H{
		"labels": agencyNames,
		"values": values,
		"share":  shares,
	})
}

func DetalleDestinosHandler(c *gin.Context) {
	var req BaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	cuposFiltradosUnicos := filterUniqueProducts(products)

	type FilaCalculada struct {
		Destino            string  `json:"Destino"`
		Temporada          string  `json:"Temporada"`
		Proveedor          string  `json:"Proveedor"`
		CuposTomados       int     `json:"Cupos tomados"`
		LugaresVendidos    int     `json:"Lugares vendidos"`
		LugaresCancelados  int     `json:"Lugares cancelados"`
		LugaresDisponibles int     `json:"Lugares disponibles"`
		Rentabilidad       float64 `json:"Rentabilidad"`
		Costo              float64 `json:"Costo"`
		CostoTotal         float64 `json:"Costo total"`
		Venta              float64 `json:"Venta"`
		VentaTotal         float64 `json:"Venta total"`
		Riesgo             float64 `json:"Riesgo"`
	}

	grouped := make(map[string]*FilaCalculada)

	for _, cupo := range cuposFiltradosUnicos {
		if !productMatches(cupo, req.Filters) {
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

		// Calculate cancelados by inspecting passenger records with matching product ID and 'cancelada' state
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
		precioUnit := cupo.Precio // Tarifa o precio de venta is "Neto Vendedor" or Precio base

		key := destino + "|" + temporada
		if _, ok := grouped[key]; !ok {
			grouped[key] = &FilaCalculada{
				Destino:   destino,
				Temporada: temporada,
				Proveedor: cupo.Compania,
			}
		}

		item := grouped[key]
		item.CuposTomados += tomados
		item.LugaresVendidos += vendidos
		item.LugaresCancelados += cancelados
		item.LugaresDisponibles += disponibles
		item.Rentabilidad += opUnit * float64(vendidos)
		item.Costo += neto1Unit * float64(vendidos)
		item.CostoTotal += float64(tomados) * neto1Unit
		item.Venta += precioUnit * float64(vendidos)
		item.VentaTotal += float64(tomados) * precioUnit
		item.Riesgo += float64(disponibles) * neto1Unit
	}

	dataList := []*FilaCalculada{}
	for _, v := range grouped {
		dataList = append(dataList, v)
	}

	cols := []string{
		"Destino", "Temporada", "Proveedor", "Cupos tomados", "Lugares vendidos",
		"Lugares cancelados", "Lugares disponibles", "Rentabilidad", "Costo",
		"Costo total", "Venta", "Venta total", "Riesgo",
	}

	c.JSON(200, gin.H{
		"columns": cols,
		"data":    dataList,
	})
}

func DestinosCompaniaHandler(c *gin.Context) {
	var req BaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	cuposUnicos := filterUniqueProducts(products)

	// Keep track of metrics per supplier and season
	type CompanyMetrics struct {
		Vendidos     int
		Disponibles  int
		Cancelados   int
		Rentabilidad float64
		Costo        float64
		Venta        float64
	}

	porTemporada := make(map[string]map[string]*CompanyMetrics)
	companiesSet := make(map[string]bool)

	for _, cupo := range cuposUnicos {
		if !productMatches(cupo, req.Filters) {
			continue
		}

		compania := cupo.Compania
		if compania == "" {
			compania = "Sin compañía"
		}
		companiesSet[compania] = true

		temp := cupo.Temporada
		if temp == "" {
			temp = "Sin temporada"
		}

		vendidos := cupo.Vendidos
		disponibles := cupo.Disponibilidad

		cancelados := 0
		for _, pax := range passengers {
			if pax.Reservation.Product.ID == cupo.ID && strings.ToLower(pax.Estado) == "cancelada" {
				cancelados++
			}
		}

		opUnit := cupo.OP
		neto1Unit := cupo.Neto1
		precioUnit := cupo.Precio

		if _, ok := porTemporada[temp]; !ok {
			porTemporada[temp] = make(map[string]*CompanyMetrics)
		}

		if _, ok := porTemporada[temp][compania]; !ok {
			porTemporada[temp][compania] = &CompanyMetrics{}
		}

		m := porTemporada[temp][compania]
		m.Vendidos += vendidos
		m.Disponibles += disponibles
		m.Cancelados += cancelados
		m.Rentabilidad += opUnit * float64(vendidos)
		m.Costo += neto1Unit * float64(vendidos)
		m.Venta += precioUnit * float64(vendidos)
	}

	companies := []string{}
	for k := range companiesSet {
		companies = append(companies, k)
	}
	sort.Strings(companies)

	seasons := []string{}
	for k := range porTemporada {
		seasons = append(seasons, k)
	}
	sort.Strings(seasons)

	// Global aggregates
	vendidosGlob := make(map[string]int)
	disponiblesGlob := make(map[string]int)
	canceladosGlob := make(map[string]int)
	rentGlob := make(map[string]float64)
	costoGlob := make(map[string]float64)
	ventaGlob := make(map[string]float64)

	for _, temp := range seasons {
		for _, comp := range companies {
			if m, ok := porTemporada[temp][comp]; ok {
				vendidosGlob[comp] += m.Vendidos
				disponiblesGlob[comp] += m.Disponibles
				canceladosGlob[comp] += m.Cancelados
				rentGlob[comp] += m.Rentabilidad
				costoGlob[comp] += m.Costo
				ventaGlob[comp] += m.Venta
			}
		}
	}

	makeComparativoInt := func(selector string) gin.H {
		datasets := []gin.H{}
		for _, temp := range seasons {
			data := make([]int, len(companies))
			for idx, comp := range companies {
				if acc, ok := porTemporada[temp]; ok {
					if m, mok := acc[comp]; mok {
						switch selector {
						case "vendidos":
							data[idx] = m.Vendidos
						case "disponibles":
							data[idx] = m.Disponibles
						case "cancelados":
							data[idx] = m.Cancelados
						}
					}
				}
			}
			datasets = append(datasets, gin.H{
				"label": temp,
				"data":  data,
			})
		}
		return gin.H{
			"labels":   companies,
			"seasons":  seasons,
			"datasets": datasets,
		}
	}

	makeComparativoFloat := func(selector string) gin.H {
		datasets := []gin.H{}
		for _, temp := range seasons {
			data := make([]float64, len(companies))
			for idx, comp := range companies {
				if acc, ok := porTemporada[temp]; ok {
					if m, mok := acc[comp]; mok {
						switch selector {
						case "rentabilidad":
							data[idx] = m.Rentabilidad
						case "costo":
							data[idx] = m.Costo
						case "venta":
							data[idx] = m.Venta
						}
					}
				}
			}
			datasets = append(datasets, gin.H{
				"label": temp,
				"data":  data,
			})
		}
		return gin.H{
			"labels":   companies,
			"seasons":  seasons,
			"datasets": datasets,
		}
	}

	c.JSON(200, gin.H{
		"vendidosPorCompania":            gin.H{"labels": mapKeysInt(vendidosGlob), "values": mapValuesInt(vendidosGlob)},
		"disponiblesPorCompania":         gin.H{"labels": mapKeysInt(disponiblesGlob), "values": mapValuesInt(disponiblesGlob)},
		"canceladosPorCompania":          gin.H{"labels": mapKeysInt(canceladosGlob), "values": mapValuesInt(canceladosGlob)},
		"rentabilidadPorCompania":        gin.H{"labels": mapKeysFloat(rentGlob), "values": mapValuesFloat(rentGlob)},
		"costoPorCompania":               gin.H{"labels": mapKeysFloat(costoGlob), "values": mapValuesFloat(costoGlob)},
		"ventaPorCompania":               gin.H{"labels": mapKeysFloat(ventaGlob), "values": mapValuesFloat(ventaGlob)},
		"vendidosPorCompaniaComparativo":     makeComparativoInt("vendidos"),
		"disponiblesPorCompaniaComparativo":  makeComparativoInt("disponibles"),
		"canceladosPorCompaniaComparativo":   makeComparativoInt("cancelados"),
		"rentabilidadPorCompaniaComparativo": makeComparativoFloat("rentabilidad"),
		"costoPorCompaniaComparativo":        makeComparativoFloat("costo"),
		"ventaPorCompaniaComparativo":        makeComparativoFloat("venta"),
	})
}

func mapKeysInt(m map[string]int) []string {
	keys := []string{}
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func mapValuesInt(m map[string]int) []int {
	keys := mapKeysInt(m)
	values := make([]int, len(keys))
	for i, k := range keys {
		values[i] = m[k]
	}
	return values
}

func mapKeysFloat(m map[string]float64) []string {
	keys := []string{}
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func mapValuesFloat(m map[string]float64) []float64 {
	keys := mapKeysFloat(m)
	values := make([]float64, len(keys))
	for i, k := range keys {
		values[i] = m[k]
	}
	return values
}

func EvolucionPasajerosHandler(c *gin.Context) {
	var req GranularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	granularity := strings.ToLower(req.Granularidad)
	if granularity == "" {
		granularity = "mes"
	}

	now := time.Now()
	dateFilter := getDateFilter(granularity, now)

	evolReport := make(map[string]int)
	var rawKeys []string

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}

		if !passengerMatches(pax, req.Filters) {
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

		if dateFilter != nil && (bookingDate.Before(dateFilter.Inicio) || bookingDate.After(dateFilter.Fin)) {
			continue
		}

		clave := getGroupKey(bookingDate, granularity)
		if _, ok := evolReport[clave]; !ok {
			evolReport[clave] = 0
			rawKeys = append(rawKeys, clave)
		}
		evolReport[clave] += pax.NRO
	}

	orderedKeys := getOrderedKeys(granularity, now, rawKeys)
	valores := make([]int, len(orderedKeys))
	for i, k := range orderedKeys {
		valores[i] = evolReport[k]
	}

	c.JSON(200, gin.H{
		"labels": orderedKeys,
		"datasets": []gin.H{
			{
				"label": "Pasajeros",
				"data":  valores,
			},
		},
		"granularidad": granularity,
	})
}

func EvolucionPorCupoHandler(c *gin.Context) {
	var req CupoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	targetCupo := strings.ToUpper(strings.TrimSpace(req.CodigoCupo))

	meses := []string{"ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"}
	evol := make(map[string]int)
	var rawKeys []string

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}

		if targetCupo != "" && strings.ToUpper(pax.Reservation.Product.CodigoCupo) != targetCupo {
			continue
		}

		if !passengerMatches(pax, req.Filters) {
			continue
		}

		returnDate := pax.Reservation.Product.FechaRegreso
		if !isPassengerSale(pax, returnDate) {
			continue
		}

		bookingDate := pax.Reservation.CreatedAt
		clave := fmt.Sprintf("%s %d", meses[bookingDate.Month()-1], bookingDate.Year())
		if _, ok := evol[clave]; !ok {
			evol[clave] = 0
			rawKeys = append(rawKeys, clave)
		}
		evol[clave] += pax.NRO
	}

	now := time.Now()
	orderedKeys := getOrderedKeys("mes", now, rawKeys)
	valores := make([]int, len(orderedKeys))
	for i, k := range orderedKeys {
		valores[i] = evol[k]
	}

	c.JSON(200, gin.H{
		"labels": orderedKeys,
		"values": valores,
	})
}

func SharePorCupoHandler(c *gin.Context) {
	var req CupoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	callerAgencia, _ := agenciaVal.(string)

	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	targetCupo := strings.ToUpper(strings.TrimSpace(req.CodigoCupo))

	ventasPorAgencia := make(map[string]int)

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}

		if targetCupo != "" && strings.ToUpper(pax.Reservation.Product.CodigoCupo) != targetCupo {
			continue
		}

		if !passengerMatches(pax, req.Filters) {
			continue
		}

		returnDate := pax.Reservation.Product.FechaRegreso
		if !isPassengerSale(pax, returnDate) {
			continue
		}

		agenciaReal := strings.TrimSpace(pax.Reservation.Agencia)
		if agenciaReal == "" {
			agenciaReal = "Sin agencia"
		}
		if role == "agency_admin" && normalize(agenciaReal) != normalize(callerAgencia) {
			continue
		}
		ventasPorAgencia[agenciaReal]++
	}

	agencyNames := intMapKeys(ventasPorAgencia)
	total := 0
	for _, v := range ventasPorAgencia {
		total += v
	}
	if total == 0 {
		total = 1
	}

	values := make([]int, len(agencyNames))
	shares := make([]float64, len(agencyNames))
	for i, agencia := range agencyNames {
		v := ventasPorAgencia[agencia]
		values[i] = v
		shares[i] = math.Round((float64(v)/float64(total))*1000) / 10
	}

	c.JSON(200, gin.H{
		"labels": agencyNames,
		"values": values,
		"share":  shares,
	})
}

func PorSalidaHandler(c *gin.Context) {
	var req BaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	cuposUnicos := filterUniqueProducts(products)

	type FilaSalida struct {
		Salida             string  `json:"Salida"`
		Codigo             string  `json:"Código"`
		Nombre             string  `json:"Nombre"`
		Destino            string  `json:"Destino"`
		Temporada          string  `json:"Temporada"`
		Proveedor          string  `json:"Proveedor"`
		TipoServicio       string  `json:"Tipo Servicio"`
		TipoProducto       string  `json:"Tipo producto"`
		CuposTomados       int     `json:"Cupos tomados"`
		LugaresVendidos    int     `json:"Lugares vendidos"`
		LugaresCancelados  int     `json:"Lugares cancelados"`
		LugaresDisponibles int     `json:"Lugares disponibles"`
		Rentabilidad       float64 `json:"Rentabilidad"`
		Costo              float64 `json:"Costo"`
		CostoTotal         float64 `json:"Costo total"`
		Venta              float64 `json:"Venta"`
		VentaTotal         float64 `json:"Venta total"`
		Riesgo             float64 `json:"Riesgo"`
	}

	rows := []FilaSalida{}

	for _, cupo := range cuposUnicos {
		if !productMatches(cupo, req.Filters) {
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

		tomados := cupo.Cupo
		vendidos := cupo.Vendidos

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

		salidaStr := ""
		if cupo.FechaSalida != nil && !cupo.FechaSalida.IsZero() {
			salidaStr = cupo.FechaSalida.Format("2006-01-02")
		}

		nombre := cupo.Ficha
		if nombre == "" {
			nombre = destino
		}

		rows = append(rows, FilaSalida{
			Salida:             salidaStr,
			Codigo:             cupo.CodigoCupo,
			Nombre:             nombre,
			Destino:            destino,
			Temporada:          temporada,
			Proveedor:          cupo.Compania,
			TipoServicio:       cupo.TipoProducto,
			TipoProducto:       getTipoProductoFromCupo(cupo),
			CuposTomados:       tomados,
			LugaresVendidos:    vendidos,
			LugaresCancelados:  cancelados,
			LugaresDisponibles: disponibles,
			Rentabilidad:       opUnit * float64(vendidos),
			Costo:              neto1Unit * float64(vendidos),
			CostoTotal:         float64(tomados) * neto1Unit,
			Venta:              precioUnit * float64(vendidos),
			VentaTotal:         float64(tomados) * precioUnit,
			Riesgo:             float64(disponibles) * neto1Unit,
		})
	}

	cols := []string{
		"Salida", "Código", "Nombre", "Destino", "Temporada", "Proveedor",
		"Tipo Servicio", "Tipo producto", "Cupos tomados", "Lugares vendidos",
		"Lugares cancelados", "Lugares disponibles", "Rentabilidad", "Costo",
		"Costo total", "Venta", "Venta total", "Riesgo",
	}

	c.JSON(200, gin.H{
		"columns": cols,
		"data":    rows,
	})
}

func DashboardDataHandler(c *gin.Context) {
	startTime := time.Now()
	var req BaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	// 1. Fields data
	seasons := make(map[string]bool)
	destinations := make(map[string]bool)
	suppliers := make(map[string]bool)
	services := make(map[string]bool)
	operations := make(map[string]bool)
	agencies := make(map[string]bool)

	for _, p := range products {
		if p.Temporada != "" {
			seasons[p.Temporada] = true
		}
		if p.Destino != "" {
			destinations[p.Destino] = true
		}
		if p.Compania != "" {
			suppliers[p.Compania] = true
		}
		if p.TipoProducto != "" {
			services[p.TipoProducto] = true
		}
		op := getTipoProductoFromCupo(p)
		if op != "" {
			operations[op] = true
		}
	}

	for _, p := range passengers {
		if p.Reservation.Agencia != "" {
			agencies[p.Reservation.Agencia] = true
		}
	}

	fields := []FieldResponse{
		{Field: "Temporada", Values: mapToSlice(seasons)},
		{Field: "Destino", Values: mapToSlice(destinations)},
		{Field: "Proveedor", Values: mapToSlice(suppliers)},
		{Field: "Tipo Servicio", Values: mapToSlice(services)},
		{Field: "Tipo producto", Values: mapToSlice(operations)},
		{Field: "Agencia", Values: mapToSlice(agencies)},
	}

	// 2. Evolucion pasajeros
	meses := []string{"ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"}
	evolReport := make(map[string]int)
	var rawKeys []string

	for _, pax := range passengers {
		if pax.Reservation.Product.ID == 0 {
			continue
		}

		if !passengerMatches(pax, req.Filters) {
			continue
		}

		returnDate := pax.Reservation.Product.FechaRegreso
		if !isPassengerSale(pax, returnDate) {
			continue
		}

		bookingDate := pax.Reservation.CreatedAt
		clave := fmt.Sprintf("%s %d", meses[bookingDate.Month()-1], bookingDate.Year())
		if _, ok := evolReport[clave]; !ok {
			evolReport[clave] = 0
			rawKeys = append(rawKeys, clave)
		}
		evolReport[clave] += pax.NRO
	}

	orderedKeys := getOrderedKeys("mes", startTime, rawKeys)
	valores := make([]int, len(orderedKeys))
	for i, k := range orderedKeys {
		valores[i] = evolReport[k]
	}

	evolucionPasajeros := gin.H{
		"labels": orderedKeys,
		"values": valores,
	}

	// 3. Detalle destinos
	cuposFiltradosUnicos := filterUniqueProducts(products)

	type FilaCalculada struct {
		Destino            string  `json:"Destino"`
		Temporada          string  `json:"Temporada"`
		Proveedor          string  `json:"Proveedor"`
		CuposTomados       int     `json:"Cupos tomados"`
		LugaresVendidos    int     `json:"Lugares vendidos"`
		LugaresCancelados  int     `json:"Lugares cancelados"`
		LugaresDisponibles int     `json:"Lugares disponibles"`
		Rentabilidad       float64 `json:"Rentabilidad"`
		Costo              float64 `json:"Costo"`
		CostoTotal         float64 `json:"Costo total"`
		Venta              float64 `json:"Venta"`
		VentaTotal         float64 `json:"Venta total"`
		Riesgo             float64 `json:"Riesgo"`
	}

	grouped := make(map[string]*FilaCalculada)

	for _, cupo := range cuposFiltradosUnicos {
		if !productMatches(cupo, req.Filters) {
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

		key := destino + "|" + temporada
		if _, ok := grouped[key]; !ok {
			grouped[key] = &FilaCalculada{
				Destino:   destino,
				Temporada: temporada,
				Proveedor: cupo.Compania,
			}
		}

		item := grouped[key]
		item.CuposTomados += tomados
		item.LugaresVendidos += vendidos
		item.LugaresCancelados += cancelados
		item.LugaresDisponibles += disponibles
		item.Rentabilidad += opUnit * float64(vendidos)
		item.Costo += neto1Unit * float64(vendidos)
		item.CostoTotal += float64(tomados) * neto1Unit
		item.Venta += precioUnit * float64(vendidos)
		item.VentaTotal += float64(tomados) * precioUnit
		item.Riesgo += float64(disponibles) * neto1Unit
	}

	dataList := []*FilaCalculada{}
	for _, v := range grouped {
		dataList = append(dataList, v)
	}

	cols := []string{
		"Destino", "Temporada", "Proveedor", "Cupos tomados", "Lugares vendidos",
		"Lugares cancelados", "Lugares disponibles", "Rentabilidad", "Costo",
		"Costo total", "Venta", "Venta total", "Riesgo",
	}

	detalleDestinos := gin.H{
		"columns": cols,
		"data":    dataList,
	}

	loadTime := time.Since(startTime).Milliseconds()

	c.JSON(200, gin.H{
		"fields":             fields,
		"evolucionPasajeros": evolucionPasajeros,
		"detalleDestinos":    detalleDestinos,
		"loadTime":           loadTime,
	})
}

// Additional Metrics Summary Handlers (from api-metrics.js)

func MetricsSummaryHandler(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var from, to time.Time
	if fromStr != "" {
		from, _ = time.Parse(time.RFC3339, fromStr)
	}
	if toStr != "" {
		to, _ = time.Parse(time.RFC3339, toStr)
	}

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	cuposUnicos := filterUniqueProducts(products)

	ventas := 0
	for _, p := range passengers {
		if p.Reservation.Product.ID == 0 {
			continue
		}

		returnDate := p.Reservation.Product.FechaRegreso
		if !isPassengerSale(p, returnDate) {
			continue
		}

		creado := p.Reservation.CreatedAt
		if !from.IsZero() && creado.Before(from) {
			continue
		}
		if !to.IsZero() && creado.After(to) {
			continue
		}
		ventas++
	}

	var cuposTomados, vendidos, cancelados int
	var rentabilidad, costo, venta, costoTotal, ventaTotal float64

	for _, cupo := range cuposUnicos {
		salida := cupo.FechaSalida
		if salida != nil {
			if !from.IsZero() && salida.Before(from) {
				continue
			}
			if !to.IsZero() && salida.After(to) {
				continue
			}
		}

		tomados := cupo.Cupo
		v := cupo.Vendidos

		canc := 0
		for _, pax := range passengers {
			if pax.Reservation.Product.ID == cupo.ID && strings.ToLower(pax.Estado) == "cancelada" {
				canc++
			}
		}

		opUnit := cupo.OP
		neto1 := cupo.Neto1
		precioUnit := cupo.Precio

		cuposTomados += tomados
		vendidos += v
		cancelados += canc
		rentabilidad += opUnit * float64(v)
		costo += neto1 * float64(v)
		venta += precioUnit * float64(v)
		costoTotal += float64(tomados) * neto1
		ventaTotal += float64(tomados) * precioUnit
	}

	var riskUnit float64
	if len(cuposUnicos) > 0 {
		riskUnit = cuposUnicos[0].Neto1
	}
	riesgo := (costoTotal - costo) - (float64(cancelados) * riskUnit)

	c.JSON(200, gin.H{
		"periodo": gin.H{
			"from": fromStr,
			"to":   toStr,
		},
		"kpis": gin.H{
			"ventas":         ventas,
			"cuposTomados":   cuposTomados,
			"vendidos":       vendidos,
			"cancelados":     cancelados,
			"rentabilidad":   rentabilidad,
			"costo":          costo,
			"venta":          venta,
			"costoTotal":     costoTotal,
			"ventaTotal":     ventaTotal,
			"riesgo":         riesgo,
		},
	})
}

func MetricsByDestinationHandler(c *gin.Context) {
	fromStr := c.Query("from")
	toStr := c.Query("to")

	var from, to time.Time
	if fromStr != "" {
		from, _ = time.Parse(time.RFC3339, fromStr)
	}
	if toStr != "" {
		to, _ = time.Parse(time.RFC3339, toStr)
	}

	products, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	cuposUnicos := filterUniqueProducts(products)

	type DestinationMetrics struct {
		Destino      string  `json:"destino"`
		CuposTomados int     `json:"cuposTomados"`
		Vendidos     int     `json:"vendidos"`
		Cancelados   int     `json:"cancelados"`
		Rentabilidad float64 `json:"rentabilidad"`
		Costo        float64 `json:"costo"`
		Venta        float64 `json:"venta"`
		Riesgo       float64 `json:"riesgo"`
	}

	agg := make(map[string]*DestinationMetrics)

	for _, cupo := range cuposUnicos {
		salida := cupo.FechaSalida
		if salida != nil {
			if !from.IsZero() && salida.Before(from) {
				continue
			}
			if !to.IsZero() && salida.After(to) {
				continue
			}
		}

		destino := cupo.Destino
		if destino == "" {
			destino = "Sin destino"
		}

		if _, ok := agg[destino]; !ok {
			agg[destino] = &DestinationMetrics{Destino: destino}
		}

		tomados := cupo.Cupo
		v := cupo.Vendidos

		canc := 0
		for _, pax := range passengers {
			if pax.Reservation.Product.ID == cupo.ID && strings.ToLower(pax.Estado) == "cancelada" {
				canc++
			}
		}

		opUnit := cupo.OP
		neto1 := cupo.Neto1
		precioUnit := cupo.Precio

		item := agg[destino]
		item.CuposTomados += tomados
		item.Vendidos += v
		item.Cancelados += canc
		item.Rentabilidad += opUnit * float64(v)
		item.Costo += neto1 * float64(v)
		item.Venta += precioUnit * float64(v)
		item.Riesgo += ((float64(tomados-canc) * neto1) - (neto1 * float64(v)))
	}

	rows := []*DestinationMetrics{}
	for _, v := range agg {
		rows = append(rows, v)
	}

	sort.Slice(rows, func(i, j int) bool {
		return rows[i].Vendidos > rows[j].Vendidos
	})

	c.JSON(200, gin.H{"rows": rows})
}

func ForecastSalesHandler(c *gin.Context) {
	_, passengers, err := loadDataFromDB()
	if err != nil {
		c.JSON(500, gin.H{"error": "Error loading data: " + err.Error()})
		return
	}

	granularity := strings.ToLower(c.Query("granularity"))
	if granularity == "" {
		granularity = "week"
	}

	// Simple historical aggregation of passenger sales
	series := make(map[string]int)

	floorWeek := func(t time.Time) time.Time {
		weekday := int(t.Weekday())
		daysToSubtract := (weekday + 6) % 7 // Monday = 0
		monday := time.Date(t.Year(), t.Month(), t.Day()-daysToSubtract, 0, 0, 0, 0, t.Location())
		return monday
	}

	for _, p := range passengers {
		if p.Reservation.Product.ID == 0 {
			continue
		}

		returnDate := p.Reservation.Product.FechaRegreso
		if !isPassengerSale(p, returnDate) {
			continue
		}

		creado := p.Reservation.CreatedAt
		var key string
		if granularity == "day" {
			key = creado.Format("2006-01-02")
		} else {
			monday := floorWeek(creado)
			key = monday.Format("2006-01-02")
		}
		series[key]++
	}

	histLabels := []string{}
	for k := range series {
		histLabels = append(histLabels, k)
	}
	sort.Strings(histLabels)

	histValues := make([]int, len(histLabels))
	for i, k := range histLabels {
		histValues[i] = series[k]
	}

	// Simple forecast naive mean of last 8 entries
	window := 8
	sum := 0
	count := 0
	for i := len(histValues) - 1; i >= 0 && count < window; i-- {
		sum += histValues[i]
		count++
	}

	baseMean := 0.0
	if count > 0 {
		baseMean = float64(sum) / float64(count)
	}

	horizon := 12 // default weeks or days
	var forecastLabels []string
	var forecastValues []int

	lastDate := time.Now()
	if len(histLabels) > 0 {
		lastDate, _ = time.Parse("2006-01-02", histLabels[len(histLabels)-1])
	}

	for i := 1; i <= horizon; i++ {
		var nextDate time.Time
		if granularity == "day" {
			nextDate = lastDate.AddDate(0, 0, i)
		} else {
			nextDate = lastDate.AddDate(0, 0, i*7)
		}
		forecastLabels = append(forecastLabels, nextDate.Format("2006-01-02"))
		forecastValues = append(forecastValues, int(math.Round(baseMean)))
	}

	c.JSON(200, gin.H{
		"granularity": granularity,
		"history": gin.H{
			"labels": histLabels,
			"values": histValues,
		},
		"forecast": gin.H{
			"labels": forecastLabels,
			"values": forecastValues,
			"method": "naive_mean_8",
		},
	})
}
