package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// createdByFromContext extrae el uuid del usuario autenticado desde el contexto Gin (o nil si no hay).
func createdByFromContext(c *gin.Context) *uuid.UUID {
	val, ok := c.Get("userID")
	if !ok {
		return nil
	}
	s, ok := val.(string)
	if !ok {
		return nil
	}
	uid, err := uuid.Parse(s)
	if err != nil {
		return nil
	}
	return &uid
}

// fixNumbers convierte strings numéricos a float64/int para evitar errores de unmarshal
func fixNumbers(data map[string]interface{}) {
	floatFields := []string{"precio", "neto_1", "op", "inf_fare", "chd_fare"}
	intFields := []string{"disponibilidad", "cupo", "vendidos", "bloqueo_temporal_minutos"}
	for _, field := range floatFields {
		if v, ok := data[field]; ok {
			if s, ok := v.(string); ok {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					data[field] = f
				}
			}
		}
	}
	for _, field := range intFields {
		if v, ok := data[field]; ok {
			if s, ok := v.(string); ok {
				if i, err := strconv.Atoi(s); err == nil {
					data[field] = i
				}
			}
		}
	}
}

// fixDates convierte strings "YYYY-MM-DD" a RFC3339 en un mapa de datos
func fixDates(data map[string]interface{}) {
	dateFields := []string{"salida", "regreso", "fecha_salida", "fecha_regreso", "vencimiento_pago", "nomination_date", "fecha_emision", "fecha_gastos"}
	for _, field := range dateFields {
		if v, ok := data[field]; ok && v != nil {
			if s, ok := v.(string); ok && len(s) == 10 {
				data[field] = s + "T00:00:00Z"
			}
		}
	}
}

// GetProducts lista productos. No existe un "catálogo general" visible para
// todas las agencias: cada producto tiene una agencia dueña (Agencia) y por
// defecto solo esa agencia (+ admin) lo ve. Una agencia distinta lo ve
// únicamente si le cedieron disponibilidad (restricted_agency). Con
// ?scope=management (usado por las pantallas de gestión, no por
// Disponibilidad) la agencia dueña también ve los productos que cedió a
// otras (source_agency), para poder seguir gestionándolos/recuperarlos.
func GetProducts(c *gin.Context) {
	// Inicializado como slice vacío (no nil): si el query no matchea filas,
	// GORM deja el slice como está y un nil slice serializa a JSON "null" en
	// vez de "[]", lo que rompe cualquier código frontend que asuma un array
	// (ej. agencias que solo ven cupos cedidos y no tienen catálogo propio).
	products := []models.Product{}
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	// El valor de agencia del usuario puede venir guardado como código o como
	// nombre según qué pantalla lo haya cargado — se normaliza al código
	// canónico antes de comparar contra restricted_agency/source_agency, que
	// desde la cesión siempre se guardan como código.
	agencia := services.ResolveAgencyCode(agenciaRaw)
	managementScope := c.Query("scope") == "management"

	// Además de dueña/restringida/cedente, un producto también es visible si
	// fue compartido explícitamente con mi agencia (ver ProductSharedAgency) —
	// a diferencia de la cesión, comparte el mismo Disponibilidad, no crea
	// una fila espejo con stock propio.
	sharedSubquery := "id IN (SELECT product_id FROM product_shared_agencies WHERE LOWER(agencia) = LOWER(?))"

	query := database.DB
	if managementScope {
		if role != "admin" {
			query = query.Where(
				"LOWER(agencia) = LOWER(?) OR LOWER(restricted_agency) = LOWER(?) OR LOWER(source_agency) = LOWER(?) OR "+sharedSubquery,
				agencia, agencia, agencia, agencia,
			)
		}
	} else {
		// Vista de reserva (Disponibilidad): nunca mostrar cupos agotados, ni
		// bloqueados para venta, ni de una agencia que no es la mía, no me
		// cedió, ni me comparte.
		query = query.Where("disponibilidad > 0 AND is_blocked_for_sale = false")
		if role != "admin" {
			query = query.Where(
				"LOWER(agencia) = LOWER(?) OR LOWER(restricted_agency) = LOWER(?) OR "+sharedSubquery,
				agencia, agencia, agencia,
			)
		}
	}
	query.Find(&products)

	if role != "admin" {
		for i := range products {
			products[i].Neto1 = 0
			products[i].NotasInternas = ""
		}
	}

	c.JSON(http.StatusOK, products)
}

func GetProductByID(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)
	// Visible si: soy la agencia dueña, me lo cedieron (restricted_agency), o
	// yo lo cedí a alguien (source_agency, para poder seguir gestionándolo).
	isOwner := product.Agencia != "" && strings.EqualFold(product.Agencia, agencia)
	wasCededToMe := product.RestrictedAgency != "" && strings.EqualFold(product.RestrictedAgency, agencia)
	wasSourcedByMe := product.SourceAgency != "" && strings.EqualFold(product.SourceAgency, agencia)
	if role != "admin" && !isOwner && !wasCededToMe && !wasSourcedByMe {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}
	if role != "admin" {
		product.Neto1 = 0
		product.NotasInternas = ""
	}
	c.JSON(http.StatusOK, product)
}

func CreateProduct(c *gin.Context) {
	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fixDates(rawData)
	fixNumbers(rawData)

	jsonBytes, _ := json.Marshal(rawData)
	var product models.Product
	if err := json.Unmarshal(jsonBytes, &product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if product.CodigoCupo == "" {
		product.CodigoCupo = generateCodigoCupo(product.TipoProducto, product.Destino, 0)
	}
	if product.TipoProducto == "" {
		product.TipoProducto = categorizeProduct(product.CodigoCupo)
	}

	database.DB.Create(&product)

	services.NotifyBroadcastByCode(createdByFromContext(c), "new_product", "Nuevo producto disponible",
		fmt.Sprintf("Se agregó el producto %s hacia %s (%s)", product.CodigoCupo, product.Destino, product.Compania),
		map[string]string{"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "compania": product.Compania})

	c.JSON(http.StatusCreated, product)
}

// UpdateProduct actualiza un producto existente. No permite cambiar
// codigo_cupo (es de solo lectura una vez creado, se generó automáticamente),
// vendidos, ni los campos internos de cesión (restricted_agency/transfer_id).
//
// Arma el producto actualizado igual que CreateProduct (map -> JSON -> struct
// tipado) en vez de pasar un map crudo a GORM Updates(): con un map, GORM usa
// las claves tal cual como nombres de columna sin la coerción de tipos que sí
// aplica el unmarshal a un struct real (por eso el map crudo tiraba 500 acá).
func UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var existing models.Product
	if err := database.DB.First(&existing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}

	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fixDates(rawData)
	fixNumbers(rawData)

	delete(rawData, "id")
	delete(rawData, "codigo_cupo")
	delete(rawData, "vendidos")
	delete(rawData, "created_at")
	delete(rawData, "updated_at")
	delete(rawData, "restricted_agency")
	delete(rawData, "transfer_id")

	jsonBytes, err := json.Marshal(rawData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updated := existing
	if err := json.Unmarshal(jsonBytes, &updated); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Reafirmar los campos que este endpoint no debe poder tocar.
	updated.ID = existing.ID
	updated.CodigoCupo = existing.CodigoCupo
	updated.Vendidos = existing.Vendidos
	updated.RestrictedAgency = existing.RestrictedAgency
	updated.TransferID = existing.TransferID
	updated.CreatedAt = existing.CreatedAt

	if err := database.DB.Select(
		"destino", "compania", "disponibilidad", "cupo",
		"fecha_salida", "fecha_regreso", "salida", "regreso",
		"precio", "neto_1", "op",
		"ruta", "pnr", "ficha", "temporada", "tipo_producto",
		"bloqueo_temporal_minutos",
		"carryon", "handbag", "checkedbag",
		"inf_fare", "chd_fare",
		"is_blocked_for_sale",
		"agencia", "source_agency",
		"servicio", "notas_internas", "notas_externas",
	).Save(&updated).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el producto: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, updated)
}

// DeleteProduct elimina un producto. No existía ningún endpoint para esto —
// el frontend ya llamaba a DELETE /products/:id, pero como la ruta nunca se
// registró, Gin devolvía su 404 default en texto plano ("404 page not
// found"), que el cliente intentaba parsear como JSON y fallaba con un error
// críptico ("Unexpected non-whitespace character... position 4", porque el
// "404" inicial sí es un número JSON válido).
//
// Se bloquea el borrado en dos casos para no romper trazabilidad/datos:
//   - Tiene reservas asociadas (dejaría reservas huérfanas apuntando a un
//     producto inexistente).
//   - Es un producto-espejo de una cesión con stock todavía activo (hay que
//     recuperarlo primero con el rollback existente).
func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}

	var reservationCount int64
	database.DB.Model(&models.Reservation{}).Where("product_id = ?", product.ID).Count(&reservationCount)
	if reservationCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("No se puede eliminar: tiene %d reserva(s) asociada(s)", reservationCount)})
		return
	}

	if product.TransferID != nil && product.Disponibilidad > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Este cupo fue cedido y todavía tiene stock activo. Recuperalo antes de eliminarlo."})
		return
	}

	var transferCount int64
	database.DB.Model(&models.AvailabilityTransfer{}).Where("product_id = ?", product.ID).Count(&transferCount)
	if transferCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "No se puede eliminar: este producto tiene cesiones registradas. Recuperá los cupos cedidos antes de eliminarlo."})
		return
	}

	if err := database.DB.Delete(&models.Product{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el producto: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Producto eliminado correctamente"})
}

func BulkCreateProducts(c *gin.Context) {
	var rawInput struct {
		Products []map[string]interface{} `json:"products"`
	}
	if err := c.ShouldBindJSON(&rawInput); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i := range rawInput.Products {
		fixDates(rawInput.Products[i])
		fixNumbers(rawInput.Products[i])
	}
	jsonBytes, _ := json.Marshal(rawInput)
	var input struct {
		Products []models.Product `json:"products"`
	}
	if err := json.Unmarshal(jsonBytes, &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i := range input.Products {
		if input.Products[i].CodigoCupo == "" {
			input.Products[i].CodigoCupo = generateCodigoCupo(input.Products[i].TipoProducto, input.Products[i].Destino, i)
		}
		if input.Products[i].TipoProducto == "" {
			input.Products[i].TipoProducto = categorizeProduct(input.Products[i].CodigoCupo)
		}
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Create(&input.Products).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()

	if len(input.Products) > 0 {
		services.NotifyBroadcastByCode(createdByFromContext(c), "new_product_bulk", "Nuevos productos disponibles",
			fmt.Sprintf("Se agregaron %d productos nuevos a disponibilidad", len(input.Products)),
			map[string]string{"cantidad": fmt.Sprintf("%d", len(input.Products))})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Bulk creation successful", "count": len(input.Products)})
}

// generateCodigoCupo arma un código legible y prácticamente único a partir
// del tipo de producto y el destino (ej. "AER-BUE-04821"), para que el
// código de cupo deje de ser un campo manual — se completa solo si no vino
// en el request (así la carga masiva que ya trae sus propios códigos no se
// ve afectada).
func generateCodigoCupo(tipoProducto, destino string, salt int) string {
	tipoPrefix := letterPrefix(tipoProducto, 3, "GEN")
	destPrefix := letterPrefix(destino, 3, "XXX")
	unique := (time.Now().UnixNano()/1000 + int64(salt)) % 100000
	return fmt.Sprintf("%s-%s-%05d", tipoPrefix, destPrefix, unique)
}

// letterPrefix devuelve las primeras n letras (sin espacios/acentos/símbolos)
// de s en mayúsculas, o fallback si no queda ninguna letra.
func letterPrefix(s string, n int, fallback string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(s) {
		if r >= 'A' && r <= 'Z' {
			b.WriteRune(r)
			if b.Len() >= n {
				break
			}
		}
	}
	if b.Len() == 0 {
		return fallback
	}
	return b.String()
}

func categorizeProduct(codigo string) string {
	codigo = strings.ToUpper(codigo)
	if strings.Contains(codigo, "_CH-") || strings.Contains(codigo, "_CH_") {
		return "CHARTERS"
	}
	if strings.Contains(codigo, "DEST_ARG") {
		return "DESTINO ARG"
	}
	return "CUPOS"
}
