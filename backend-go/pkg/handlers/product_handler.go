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
	floatFields := []string{
		"precio", "neto_1", "op", "op_adt", "op_chd", "op_inf", "inf_fare", "chd_fare",
		"tarifa_adt", "impuestos_adt", "tarifa_chd", "impuestos_chd", "tarifa_inf", "impuestos_inf",
	}
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

// applyCalculatedPrices calcula la Venta de cada tipo de pasajero como
// Tarifa+Impuestos+OP y la escribe en Precio/ChdFare/InfFare — esos 3 campos
// dejan de cargarse a mano; siempre reflejan lo que se acaba de cargar en
// Tarifa/Impuestos (por tipo) + OP (compartido). Se llama tanto en
// CreateProduct como en UpdateProduct para que nunca queden desincronizados.
func applyCalculatedPrices(product *models.Product) {
	product.Precio = product.TarifaAdt + product.ImpuestosAdt + product.OPAdt
	product.ChdFare = product.TarifaChd + product.ImpuestosChd + product.OPChd
	product.InfFare = product.TarifaInf + product.ImpuestosInf + product.OPInf
	// OP legado: se sincroniza al de ADT para que cualquier lugar que todavía
	// lea el campo único (en vez de OPForTipo) muestre algo razonable.
	product.OP = product.OPAdt
	product.Neto1 = prorratedRiskNeto1(product)
}

// prorratedRiskNeto1 autocompleta el Neto1 usado para "Riesgo" en reportes —
// deja de ser un valor manual: es el promedio prorrateado entre ADT y CHD
// (Tarifa+Impuestos de cada uno). El infante no ocupa lugar/cupo, así que no
// participa de un cálculo de riesgo basado en lugares sin vender.
func prorratedRiskNeto1(product *models.Product) float64 {
	netoAdt := product.TarifaAdt + product.ImpuestosAdt
	netoChd := product.TarifaChd + product.ImpuestosChd
	return (netoAdt + netoChd) / 2
}

// reconcilePricesForImport se usa en la carga masiva (BulkCreateProducts),
// que acepta tanto filas "viejas" (precio/chd_fare/inf_fare ya calculado, de
// una migración de cupos históricos) como filas "nuevas" (con desglose de
// tarifa/impuestos). Si vino el desglose nuevo, la Venta se recalcula
// (Tarifa+Impuestos+OP) igual que en CreateProduct/UpdateProduct. Si vino
// solo el precio viejo sin desglose, se infiere Tarifa=precio pero NO se
// recalcula el precio (evita sumarle el OP encima a un precio que ya era
// correcto).
func reconcilePricesForImport(product *models.Product) {
	// Si la fila de import solo trae el OP legado (una columna, no las 3
	// nuevas), se replica a los 3 tipos — mismo criterio que el backfill de
	// la migración de productos ya cargados.
	if product.OPAdt == 0 && product.OPChd == 0 && product.OPInf == 0 && product.OP != 0 {
		product.OPAdt, product.OPChd, product.OPInf = product.OP, product.OP, product.OP
	}
	reconcileOne := func(tarifa, impuestos *float64, op float64, venta *float64) {
		if *tarifa != 0 || *impuestos != 0 {
			*venta = *tarifa + *impuestos + op
		} else if *venta != 0 {
			*tarifa = *venta
		}
	}
	reconcileOne(&product.TarifaAdt, &product.ImpuestosAdt, product.OPAdt, &product.Precio)
	reconcileOne(&product.TarifaChd, &product.ImpuestosChd, product.OPChd, &product.ChdFare)
	reconcileOne(&product.TarifaInf, &product.ImpuestosInf, product.OPInf, &product.InfFare)
	product.OP = product.OPAdt
	product.Neto1 = prorratedRiskNeto1(product)
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
		// cedió, ni me comparte. Tampoco un producto convertido desde una
		// Oportunidad que un admin todavía no aprobó (ver ApproveProduct).
		query = query.Where("disponibilidad > 0 AND is_blocked_for_sale = false AND pendiente_aprobacion = false")
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
		product.CodigoCupo = generateCodigoCupo(&product, 0)
	}
	if product.TipoProducto == "" {
		product.TipoProducto = "Aereo"
	}

	// Disponibilidad no es un dato que se cargue a mano — siempre es
	// Cupo - Vendidos (ver recomputeDisponibilidad).
	product.Disponibilidad = recomputeDisponibilidad(product.Cupo, product.Vendidos)
	applyCalculatedPrices(&product)

	database.DB.Create(&product)

	// Antes era NotifyBroadcastByCode: llegaba a TODOS los usuarios del
	// sistema, de cualquier agencia — un producto es privado de su agencia
	// dueña, así que el aviso también debe serlo (sin agencia dueña, no se
	// avisa a nadie; NotifyAgencyByCode ya maneja ese caso).
	services.NotifyAgencyByCode(product.Agencia, createdByFromContext(c), "new_product", "Nuevo producto disponible",
		fmt.Sprintf("Se agregó el producto %s hacia %s (%s)", product.CodigoCupo, product.Destino, product.Compania),
		map[string]string{"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "compania": product.Compania})
	services.SendTemplateEmailToAgency(product.Agencia, "new_product", map[string]string{
		"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "compania": product.Compania,
	})

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

	// Disponibilidad no se edita a mano — se recalcula siempre a partir del
	// Cupo (ya reafirmado arriba que Vendidos no cambia por acá). Si se
	// amplía el Cupo (ej. +10 lugares comprados), la disponibilidad libre
	// sube sola sin pisar lo ya vendido.
	updated.Disponibilidad = recomputeDisponibilidad(updated.Cupo, updated.Vendidos)
	applyCalculatedPrices(&updated)

	// Avisos: si cambia ruta o fechas de salida/regreso, las reservas activas
	// sobre este producto quedan afectadas — se detecta ANTES de guardar
	// (comparando contra `existing`) y se notifica DESPUÉS de guardar con
	// éxito, más abajo.
	var cambios []string
	if existing.Ruta != updated.Ruta {
		cambios = append(cambios, fmt.Sprintf("ruta: %s → %s", orGuion(existing.Ruta), orGuion(updated.Ruta)))
	}
	if !sameDatePtr(existing.FechaSalida, updated.FechaSalida) {
		cambios = append(cambios, fmt.Sprintf("fecha de salida: %s → %s", formatDatePtr(existing.FechaSalida), formatDatePtr(updated.FechaSalida)))
	}
	if !sameDatePtr(existing.FechaRegreso, updated.FechaRegreso) {
		cambios = append(cambios, fmt.Sprintf("fecha de regreso: %s → %s", formatDatePtr(existing.FechaRegreso), formatDatePtr(updated.FechaRegreso)))
	}

	if err := database.DB.Select(
		"destino", "compania", "disponibilidad", "cupo",
		"fecha_salida", "fecha_regreso", "salida", "regreso",
		"precio", "neto_1", "op", "op_adt", "op_chd", "op_inf",
		"tarifa_adt", "impuestos_adt", "tarifa_chd", "impuestos_chd", "tarifa_inf", "impuestos_inf",
		"ruta", "pnr", "ficha", "temporada", "tipo_producto",
		"bloqueo_temporal_minutos",
		"carryon", "handbag", "checkedbag",
		"carryon_kg", "handbag_kg", "checkedbag_kg", "package_links",
		"inf_fare", "chd_fare",
		"is_blocked_for_sale",
		"agencia", "source_agency",
		"servicio", "notas_internas", "notas_externas",
	).Save(&updated).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el producto: " + err.Error()})
		return
	}

	if len(cambios) > 0 {
		notifyProductChanged(&updated, cambios, createdByFromContext(c))
	}

	c.JSON(http.StatusOK, updated)
}

// notifyProductChanged avisa a cada reserva activa sobre este producto
// (excluye hold_temporal/cancelada/expirada/cedido, que ya no representan un
// viaje real esperando al pasajero) que su ruta o fechas cambiaron.
func notifyProductChanged(product *models.Product, cambios []string, actor *uuid.UUID) {
	var reservations []models.Reservation
	database.DB.Where(
		"product_id = ? AND estado NOT IN ?", product.ID,
		[]string{models.EstadoHoldTemporal, models.EstadoCancelada, models.EstadoExpirada, models.EstadoCedida},
	).Find(&reservations)

	resumen := strings.Join(cambios, "; ")
	for _, r := range reservations {
		data := map[string]string{"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "pedido_id": r.PedidoID, "cambios": resumen}
		services.NotifyUserByCode(r.CreatedBy, actor, r.Agencia, "product_changed",
			"Tu cupo reservado cambió",
			fmt.Sprintf("El producto %s hacia %s de tu reserva %s cambió: %s", product.CodigoCupo, product.Destino, r.PedidoID, resumen),
			data)
		if recipient := services.ResolveReservationRecipientEmail(r.CreatedBy); recipient != "" {
			if err := services.SendTemplateEmail(r.Agencia, "product_changed", recipient, data); err != nil {
				services.LogFailure("email",
					fmt.Sprintf("No se pudo enviar el aviso de cambio de producto para el pedido %s", r.PedidoID),
					err.Error())
			}
		}
	}
}

func orGuion(s string) string {
	if s == "" {
		return "—"
	}
	return s
}

func sameDatePtr(a, b *time.Time) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return a.Equal(*b)
}

func formatDatePtr(t *time.Time) string {
	if t == nil {
		return "—"
	}
	return t.Format("2006-01-02")
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

// ApproveProduct aprueba un producto creado vía "Convertir a producto" desde
// una Oportunidad (ver ConvertOpportunityToProduct en opportunities_handler.go).
// Solo admin (gateado por PRODUCTS_APPROVE en la ruta). Productos cargados
// directo desde Gestión de Productos nunca pasan por acá (nacen con
// PendienteAprobacion=false).
func ApproveProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}

	if !product.PendienteAprobacion {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este producto no está pendiente de aprobación"})
		return
	}

	if err := database.DB.Model(&product).Update("pendiente_aprobacion", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al aprobar el producto"})
		return
	}

	services.NotifyAgencyByCode(product.Agencia, createdByFromContext(c), "product_approved", "Producto aprobado",
		fmt.Sprintf("Tu producto %s hacia %s (%s) fue aprobado y ya está disponible para reservar", product.CodigoCupo, product.Destino, product.Compania),
		map[string]string{"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "compania": product.Compania})

	database.DB.First(&product, id)
	c.JSON(http.StatusOK, product)
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
			input.Products[i].CodigoCupo = generateCodigoCupo(&input.Products[i], i)
		}
		if input.Products[i].TipoProducto == "" {
			input.Products[i].TipoProducto = "Aereo"
		}
		input.Products[i].Disponibilidad = recomputeDisponibilidad(input.Products[i].Cupo, input.Products[i].Vendidos)
		reconcilePricesForImport(&input.Products[i])
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

	// Igual que en CreateProduct: por agencia dueña, no un broadcast global —
	// una carga masiva puede traer productos de varias agencias a la vez.
	countByAgency := map[string]int{}
	for _, p := range input.Products {
		if p.Agencia != "" {
			countByAgency[p.Agencia]++
		}
	}
	for agencia, count := range countByAgency {
		services.NotifyAgencyByCode(agencia, createdByFromContext(c), "new_product_bulk", "Nuevos productos disponibles",
			fmt.Sprintf("Se agregaron %d productos nuevos a disponibilidad", count),
			map[string]string{"cantidad": fmt.Sprintf("%d", count)})
		services.SendTemplateEmailToAgency(agencia, "new_product_bulk", map[string]string{"cantidad": fmt.Sprintf("%d", count)})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Bulk creation successful", "count": len(input.Products)})
}

// generateCodigoCupo arma un código legible y prácticamente único a partir
// de fecha de salida, destino, un secuencial, el tipo de servicio (Cupo/
// Charter) y la aerolínea — ej. "20/09/26-REC-431123_CH-AD" — para que el
// código de cupo deje de ser un campo manual — se completa solo si no vino
// en el request (así la carga masiva que ya trae sus propios códigos no se
// ve afectada).
func generateCodigoCupo(product *models.Product, salt int) string {
	fecha := "00/00/00"
	if product.FechaSalida != nil {
		fecha = product.FechaSalida.Format("02/01/06")
	}
	destPrefix := letterPrefix(product.Destino, 3, "XXX")
	unique := (time.Now().UnixNano()/1000 + int64(salt)) % 1000000
	tipo := "CP"
	if strings.EqualFold(strings.TrimSpace(product.Servicio), "Charter") {
		tipo = "CH"
	}
	aerolinea := letterPrefix(product.Compania, 2, "XX")
	return fmt.Sprintf("%s-%s-%06d_%s-%s", fecha, destPrefix, unique, tipo, aerolinea)
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

// recomputeDisponibilidad: Disponibilidad no se carga a mano, siempre es
// Cupo - Vendidos — así, si se amplía el Cupo (ej. se compran 10 lugares más),
// la disponibilidad libre se recalcula sola en vez de quedar desalineada con
// lo que ya se vendió.
func recomputeDisponibilidad(cupo, vendidos int) int {
	d := cupo - vendidos
	if d < 0 {
		return 0
	}
	return d
}
