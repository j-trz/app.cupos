package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PassengerInput acepta nacimiento como string "YYYY-MM-DD" o RFC3339.
// PrecioVenta/Neto1/DocContable son opcionales: si no vienen, cada pasajero
// hereda el valor a nivel pedido (Reservation) al crearse — cada pasajero
// ocupa 1 lugar y se crea como su propio ticket individual, pero por defecto
// no requiere tarifas distintas por persona salvo que se las indique.
type PassengerInput struct {
	Nombre       string   `json:"nombre"`
	Apellido     string   `json:"apellido"`
	Documento    string   `json:"documento"`
	Pasaporte    string   `json:"pasaporte,omitempty"`
	Nacimiento   string   `json:"nacimiento"` // "1994-10-20" o "1994-10-20T00:00:00Z"
	Nacionalidad string   `json:"nacionalidad"`
	TipoPasajero string   `json:"tipo_pasajero"`
	PrecioVenta  *float64 `json:"precio_venta,omitempty"`
	Neto1        *float64 `json:"neto_1,omitempty"`
	DocContable  string   `json:"doc_contable,omitempty"`
	// Vencimiento de documento de viaje — Vitalicio=true ignora Vencimiento.
	DocumentoVencimiento string `json:"documento_vencimiento,omitempty"`
	DocumentoVitalicio   bool   `json:"documento_vitalicio,omitempty"`
}

type ReservationInput struct {
	models.Reservation
	Passengers []PassengerInput `json:"passengers"`
	// HoldID, si viene, referencia un pre-hold creado por CreateHold: en ese
	// caso el stock ya fue descontado al crear el hold y esta llamada solo
	// completa los datos reales de contacto/pasajeros sobre esa misma fila.
	HoldID uint `json:"hold_id,omitempty"`
}

// buildReservationEmailVars centraliza las variables disponibles para las
// plantillas de reserva (reservation_blocked/reservation_confirmed/
// passenger_confirmation) — agregar una clave nueva acá la habilita
// automáticamente en el editor de plantillas del frontend (ver
// GetAvailableEmailVariables en email_config_handler.go, que debe listar las
// mismas claves).
func buildReservationEmailVars(reservation *models.Reservation, vence string, passengerNames []string) map[string]string {
	return map[string]string{
		"pedido_id":       reservation.PedidoID,
		"contacto_nombre": reservation.NombrePasajero,
		"destino":         reservation.VueloDestino,
		"compania":        reservation.VueloCompania,
		"precio_venta":    fmt.Sprintf("%.2f", reservation.PrecioVenta),
		"pasajeros":       strings.Join(passengerNames, ", "),
		"vence":           vence,
	}
}

// countPassengerSeats cuenta los pasajeros de una reserva, separando el total
// (para reponer Vendidos) de los que ocupan lugar/cupo (para reponer
// Disponibilidad) — el infante es pasajero pero no ocupa lugar (ver
// CreateReservation), así que al devolver stock por cancelación/expiración
// hay que devolver solo los lugares que en verdad se habían descontado.
func countPassengerSeats(reservationID uint) (seats int64, total int64) {
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservationID).Count(&total)
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ? AND tipo_pasajero != ?", reservationID, "Infante").Count(&seats)
	if total == 0 {
		total = 1
		seats = 1
	}
	return seats, total
}

// canReserveProduct valida si el usuario puede reservar este producto: es
// admin, es la agencia dueña, se lo cedieron puntualmente (RestrictedAgency)
// o lo tiene compartido (ProductSharedAgency). Se usa tanto en CreateHold
// como en CreateReservation para no duplicar el chequeo de acceso.
func canReserveProduct(tx *gorm.DB, product *models.Product, role interface{}, userAgencia string) bool {
	if role == "admin" {
		return true
	}
	if product.Agencia != "" && strings.EqualFold(product.Agencia, userAgencia) {
		return true
	}
	if product.RestrictedAgency != "" && strings.EqualFold(product.RestrictedAgency, userAgencia) {
		return true
	}
	var count int64
	tx.Model(&models.ProductSharedAgency{}).
		Where("product_id = ? AND LOWER(agencia) = LOWER(?)", product.ID, userAgencia).
		Count(&count)
	return count > 0
}

// callerOwnsReservation: admin siempre puede; el resto solo si la reserva es
// de su propia agencia. Hallazgo de la auditoría de seguridad 2026-08-13:
// ConfirmReservation/UpdateReservation/AddDocContable/DeletePassenger no
// tenían NINGÚN chequeo de este tipo — cualquier usuario autenticado de
// cualquier agencia podía confirmar/editar/borrar pasajeros de una reserva
// ajena (incluyendo liberar el stock de un competidor para reservarlo uno
// mismo). Mismo criterio de scoping que canReserveProduct usa para productos.
func callerOwnsReservation(c *gin.Context, reservation *models.Reservation) bool {
	role, _ := c.Get("role")
	if role == "admin" {
		return true
	}
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)
	return strings.EqualFold(reservation.Agencia, agencia)
}

// CreateHold descuenta de inmediato N lugares de un producto, antes de que
// el usuario haya cargado ningún dato de pasajero, para que nadie más se
// lleve esos cupos mientras completa el formulario. Vive `bloqueo_hold_minutos`
// (default 10) y se convierte en una reserva real vía CreateReservation con
// `hold_id`, o libera el stock si se cancela (ReleaseHold) o vence (cron).
func CreateHold(c *gin.Context) {
	var input struct {
		ProductID      uint `json:"product_id"`
		PassengerCount int  `json:"passenger_count"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.PassengerCount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passenger_count debe ser mayor a 0"})
		return
	}

	userIDStr, _ := c.Get("userID")
	role, _ := c.Get("role")
	userAgenciaVal, _ := c.Get("agencia")
	userAgenciaRaw, _ := userAgenciaVal.(string)
	userAgencia := services.ResolveAgencyCode(userAgenciaRaw)

	var createdBy uuid.UUID
	if userIDStr != nil {
		if uid, err := uuid.Parse(userIDStr.(string)); err == nil {
			createdBy = uid
		}
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var product models.Product
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, input.ProductID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Producto no encontrado"})
		return
	}

	if !canReserveProduct(tx, &product, role, userAgencia) {
		tx.Rollback()
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este cupo"})
		return
	}

	if product.Disponibilidad < input.PassengerCount {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente"})
		return
	}

	product.Disponibilidad -= input.PassengerCount
	product.Vendidos += input.PassengerCount
	if err := tx.Save(&product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	holdMinutes := services.GetIntSettingForAgency("bloqueo_hold_minutos", userAgencia, 10)
	expiresAt := time.Now().Add(time.Duration(holdMinutes) * time.Minute)

	hold := models.Reservation{
		ProductID:          input.ProductID,
		CreatedBy:          createdBy,
		Estado:             models.EstadoHoldTemporal,
		BloqueoExpiraAt:    &expiresAt,
		HoldPassengerCount: input.PassengerCount,
		PedidoID:           fmt.Sprintf("PED-%d-%s", time.Now().Year(), uuid.New().String()[:8]),
		Agencia:            userAgencia,
	}
	if err := tx.Create(&hold).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el bloqueo temporal"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"id":                hold.ID,
		"pedido_id":         hold.PedidoID,
		"bloqueo_expira_at": hold.BloqueoExpiraAt,
		"passenger_count":   hold.HoldPassengerCount,
	})
}

// ReleaseHold cancela un pre-hold (EstadoHoldTemporal) devolviendo el stock
// de inmediato, sin esperar la corrida del cron — se llama cuando el usuario
// cierra el modal de carga de pasajeros sin llegar a confirmar la reserva.
// Es idempotente: si el hold ya no existe o ya no está en hold_temporal
// (venció por cron, o ya se completó), responde éxito sin hacer nada.
func ReleaseHold(c *gin.Context) {
	id := c.Param("id")
	userIDStr, _ := c.Get("userID")
	role, _ := c.Get("role")

	var hold models.Reservation
	if err := database.DB.First(&hold, id).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}

	if hold.Estado != models.EstadoHoldTemporal {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}

	if role != "admin" && userIDStr != nil {
		if uid, err := uuid.Parse(userIDStr.(string)); err == nil && hold.CreatedBy != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "No podés liberar un bloqueo de otro usuario"})
			return
		}
	}

	count := hold.HoldPassengerCount
	if count <= 0 {
		count = 1
	}
	database.DB.Model(&models.Product{}).Where("id = ?", hold.ProductID).
		Updates(map[string]interface{}{
			"disponibilidad": gorm.Expr("GREATEST(0, disponibilidad + ?)", count),
			"vendidos":       gorm.Expr("GREATEST(0, vendidos - ?)", count),
		})

	database.DB.Delete(&models.Reservation{}, id)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdjustHold cambia la cantidad de pasajeros de un pre-hold ya creado — el
// usuario agregó o quitó una fila de pasajero en el modal después de haber
// elegido la cantidad inicial (ver CreateHold). Ajusta la disponibilidad del
// producto según la diferencia y extiende el vencimiento del bloqueo, ya que
// sigue activamente completando el formulario.
func AdjustHold(c *gin.Context) {
	id := c.Param("id")
	userIDStr, _ := c.Get("userID")
	role, _ := c.Get("role")

	var input struct {
		PassengerCount int `json:"passenger_count"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.PassengerCount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passenger_count debe ser mayor a 0"})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var hold models.Reservation
	if err := tx.First(&hold, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Bloqueo temporal no encontrado."})
		return
	}
	if hold.Estado != models.EstadoHoldTemporal {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este bloqueo ya no está activo — cerrá el formulario y volvé a empezar."})
		return
	}
	if role != "admin" && userIDStr != nil {
		if uid, err := uuid.Parse(userIDStr.(string)); err == nil && hold.CreatedBy != uid {
			tx.Rollback()
			c.JSON(http.StatusForbidden, gin.H{"error": "No podés modificar un bloqueo de otro usuario"})
			return
		}
	}

	delta := input.PassengerCount - hold.HoldPassengerCount
	if delta != 0 {
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, hold.ProductID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Producto no encontrado"})
			return
		}
		if delta > 0 && product.Disponibilidad < delta {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Solo hay %d cupo(s) más disponible(s).", product.Disponibilidad)})
			return
		}
		product.Disponibilidad -= delta
		product.Vendidos += delta
		if err := tx.Save(&product).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
			return
		}
	}

	hold.HoldPassengerCount = input.PassengerCount
	holdMinutes := services.GetIntSettingForAgency("bloqueo_hold_minutos", hold.Agencia, 10)
	expiresAt := time.Now().Add(time.Duration(holdMinutes) * time.Minute)
	hold.BloqueoExpiraAt = &expiresAt
	if err := tx.Save(&hold).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el bloqueo"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{
		"id":                hold.ID,
		"pedido_id":         hold.PedidoID,
		"bloqueo_expira_at": hold.BloqueoExpiraAt,
		"passenger_count":   hold.HoldPassengerCount,
	})
}

// parseDateFlexible acepta "YYYY-MM-DD" o RFC3339
func parseDateFlexible(s string) *time.Time {
	if s == "" {
		return nil
	}
	formats := []string{"2006-01-02", time.RFC3339, "2006-01-02T15:04:05Z"}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return &t
		}
	}
	return nil
}

// toPassengerModel convierte PassengerInput a models.Passenger
func toPassengerModel(pi PassengerInput) models.Passenger {
	return models.Passenger{
		Nombre:               pi.Nombre,
		Apellido:             pi.Apellido,
		Documento:            pi.Documento,
		Pasaporte:            pi.Pasaporte,
		Nacimiento:           parseDateFlexible(pi.Nacimiento),
		Nacionalidad:         pi.Nacionalidad,
		TipoPasajero:         pi.TipoPasajero,
		DocumentoVencimiento: parseDateFlexible(pi.DocumentoVencimiento),
		DocumentoVitalicio:   pi.DocumentoVitalicio,
	}
}

func CreateReservation(c *gin.Context) {
	var input ReservationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, _ := c.Get("userID")
	role, _ := c.Get("role")
	userAgenciaVal, _ := c.Get("agencia")
	userAgenciaRaw, _ := userAgenciaVal.(string)
	// Normalizado al código canónico de Agency para que coincida con
	// RestrictedAgency (guardado como código) sin importar si el perfil del
	// usuario tiene cargado el código o el nombre de su agencia.
	userAgencia := services.ResolveAgencyCode(userAgenciaRaw)

	if userIDStr != nil {
		if uid, err := uuid.Parse(userIDStr.(string)); err == nil {
			input.Reservation.CreatedBy = uid
		}
	}

	// Forzar la agencia del usuario si no es admin (no puede reservar a
	// nombre de otra agencia, ni aunque la mande en el body). Si es admin y
	// no envió ninguna agencia explícita (ej. se olvidó de elegirla en el
	// formulario), caemos a la propia del admin como último recurso — sin
	// esto, la reserva quedaba con agencia vacía y no aparecía en las tablas
	// filtradas/agrupadas por agencia.
	if role != "admin" && userAgencia != "" {
		input.Reservation.Agencia = userAgencia
	} else if input.Reservation.Agencia == "" && userAgencia != "" {
		input.Reservation.Agencia = userAgencia
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Si viene de un pre-hold (CreateHold), se recupera esa misma fila en vez
	// de crear una nueva y NO se vuelve a descontar stock (ya se hizo al
	// crear el hold) — acá solo se completan los datos reales.
	var existingHold *models.Reservation
	if input.HoldID != 0 {
		var hold models.Reservation
		if err := tx.First(&hold, input.HoldID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusGone, gin.H{"error": "El bloqueo temporal ya no existe"})
			return
		}
		if hold.Estado != models.EstadoHoldTemporal {
			tx.Rollback()
			c.JSON(http.StatusGone, gin.H{"error": "El bloqueo temporal ya fue utilizado o liberado"})
			return
		}
		if hold.BloqueoExpiraAt == nil || hold.BloqueoExpiraAt.Before(time.Now()) {
			tx.Rollback()
			c.JSON(http.StatusGone, gin.H{"error": "El bloqueo temporal expiró y el cupo fue liberado"})
			return
		}
		if role != "admin" && hold.CreatedBy != input.Reservation.CreatedBy {
			tx.Rollback()
			c.JSON(http.StatusForbidden, gin.H{"error": "Este bloqueo temporal pertenece a otro usuario"})
			return
		}
		existingHold = &hold
		input.ProductID = hold.ProductID
	}

	// 1. Obtener producto para validar disponibilidad y obtener datos
	var product models.Product
	if err := tx.First(&product, input.ProductID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Producto no encontrado"})
		return
	}

	// Verificar que la agencia pueda reservar este producto: dueña, cedido
	// puntualmente (RestrictedAgency) o compartido (ProductSharedAgency —
	// mismo Disponibilidad, sin fila espejo). El admin puede reservar
	// cualquiera.
	if !canReserveProduct(tx, &product, role, userAgencia) {
		tx.Rollback()
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este cupo"})
		return
	}

	numPassengers := len(input.Passengers)
	if numPassengers == 0 {
		numPassengers = 1
	}
	// El infante no ocupa lugar/cupo (Disponibilidad), pero sigue siendo
	// pasajero: tiene su propia fila en `passengers` y cuenta para Vendidos.
	// El hold (CreateHold) todavía no conoce el tipo de cada pasajero — por
	// eso descontó de más (numPassengers a secas) — se reconcilia acá abajo.
	seatsNeeded := 0
	for _, p := range input.Passengers {
		if p.TipoPasajero != "Infante" {
			seatsNeeded++
		}
	}
	if len(input.Passengers) == 0 && input.Reservation.TipoPasajero != "Infante" {
		seatsNeeded = 1
	}

	if existingHold != nil {
		// La cantidad TOTAL quedó fija al crear el hold: si no coincide, el
		// cliente está tratando de reservar más/menos lugares de los que en
		// verdad tiene apartados.
		if numPassengers != existingHold.HoldPassengerCount {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "La cantidad de pasajeros no coincide con el bloqueo temporal"})
			return
		}
		// El hold descontó numPassengers lugares (sin saber todavía cuáles
		// eran infantes). Ahora que se conoce el tipo real, se devuelve la
		// diferencia si hubo infantes entre los pasajeros del hold.
		if seatsFreed := existingHold.HoldPassengerCount - seatsNeeded; seatsFreed > 0 {
			product.Disponibilidad += seatsFreed
			if err := tx.Save(&product).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
				return
			}
		}
	} else {
		if product.Disponibilidad < seatsNeeded {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente"})
			return
		}

		// 2. Actualizar disponibilidad del producto
		product.Disponibilidad -= seatsNeeded
		product.Vendidos += numPassengers
		if err := tx.Save(&product).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
			return
		}
	}

	// Auto-generar pedido_id si no viene (un hold ya trae el suyo propio)
	if existingHold != nil {
		input.Reservation.PedidoID = existingHold.PedidoID
	} else if input.Reservation.PedidoID == "" {
		input.Reservation.PedidoID = fmt.Sprintf("PED-%d-%s", time.Now().Year(),
			uuid.New().String()[:8])
	}

	// Si no viene un array de pasajeros explícito (ej. formularios que solo
	// cargan "el pasajero principal"), se sintetiza uno a partir de los campos
	// planos de la reserva — cada pasajero SIEMPRE se crea como su propio
	// ticket individual (1 lugar, 1 fila en `passengers`), nunca queda
	// implícito solo en los campos de Reservation.
	if len(input.Passengers) == 0 {
		input.Passengers = []PassengerInput{{
			Nombre:       input.Reservation.NombrePasajero,
			Apellido:     input.Reservation.ApellidoPasajero,
			Documento:    input.Reservation.DocumentoPasajero,
			Nacionalidad: input.Reservation.NacionalidadPasajero,
			TipoPasajero: input.Reservation.TipoPasajero,
		}}
		if input.Reservation.NacimientoPasajero != nil {
			input.Passengers[0].Nacimiento = input.Reservation.NacimientoPasajero.Format("2006-01-02")
		}
	}

	// Poblar campos del pasajero principal (compatibilidad con pantallas que
	// todavía leen el resumen desde la propia Reservation).
	if input.Reservation.NombrePasajero == "" {
		p := toPassengerModel(input.Passengers[0])
		input.Reservation.NombrePasajero = p.Nombre
		input.Reservation.ApellidoPasajero = p.Apellido
		input.Reservation.DocumentoPasajero = p.Documento
		input.Reservation.NacionalidadPasajero = p.Nacionalidad
		if input.Reservation.TipoPasajero == "" {
			input.Reservation.TipoPasajero = p.TipoPasajero
		}
	}

	// 3. Preparar reserva
	blockMinutes := product.BloqueoTemporalMinutos
	if blockMinutes <= 0 {
		blockMinutes = services.GetIntSettingForAgency("bloqueo_minutos_default", input.Reservation.Agencia, 60)
	}
	expiresAt := time.Now().Add(time.Duration(blockMinutes) * time.Minute)
	input.Reservation.BloqueoExpiraAt = &expiresAt

	// Si se carga el doc contable al crear, confirmar automáticamente
	if input.Reservation.DocContable != "" {
		input.Reservation.Estado = models.EstadoConfirmada
	} else {
		input.Reservation.Estado = models.EstadoBloqueoTemporal
	}

	// Datos del producto a la reserva
	input.Reservation.Neto1 = product.Neto1
	if input.Reservation.VueloCodigo == "" {
		input.Reservation.VueloCodigo = product.CodigoCupo
	}
	if input.Reservation.VueloDestino == "" {
		input.Reservation.VueloDestino = product.Destino
	}
	if input.Reservation.VueloCompania == "" {
		input.Reservation.VueloCompania = product.Compania
	}
	if input.Reservation.VueloSalida == nil {
		input.Reservation.VueloSalida = product.FechaSalida
	}
	if input.Reservation.VueloRuta == "" {
		input.Reservation.VueloRuta = product.Ruta
	}

	// Si el producto es un "espejo" de una cesión, la reserva hereda de qué
	// agencia vino el cupo — así Nómina/Reservas pueden mostrar que este
	// pasajero corresponde a un cupo cedido por otra agencia.
	if product.TransferID != nil {
		input.Reservation.TransferID = product.TransferID
		input.Reservation.OriginalAgency = product.SourceAgency
	}

	if existingHold != nil {
		// Reescribe la misma fila del hold con los datos reales (Save hace un
		// UPDATE de fila completa dado que el ID ya está seteado).
		input.Reservation.ID = existingHold.ID
		input.Reservation.CreatedAt = existingHold.CreatedAt
		input.Reservation.HoldPassengerCount = 0
		if err := tx.Save(&input.Reservation).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar la reserva: " + err.Error()})
			return
		}
	} else if err := tx.Create(&input.Reservation).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la reserva: " + err.Error()})
		return
	}

	// 4. Insertar pasajeros — cada uno es su propio ticket (1 lugar), todos
	// comparten el mismo pedido_id/ReservationID.
	for i, pi := range input.Passengers {
		pax := toPassengerModel(pi)
		pax.ReservationID = input.Reservation.ID
		pax.PedidoID = input.Reservation.PedidoID
		pax.Estado = input.Reservation.Estado
		pax.BloqueoExpiraAt = input.Reservation.BloqueoExpiraAt

		pax.PrecioVenta = input.Reservation.PrecioVenta
		if pi.PrecioVenta != nil {
			pax.PrecioVenta = *pi.PrecioVenta
		}
		// Neto1 por pasajero usa el desglose de SU tipo (ADT/CHD/INF), no un
		// valor único heredado de la reserva — antes todos los pasajeros de
		// un mismo pedido compartían el Neto1 del tipo principal.
		pax.Neto1 = product.NetoForTipo(pi.TipoPasajero)
		if pi.Neto1 != nil {
			pax.Neto1 = *pi.Neto1
		}
		pax.DocContable = input.Reservation.DocContable
		if pi.DocContable != "" {
			pax.DocContable = pi.DocContable
		}

		// Calcular NRO (Regla: el primero es venta, el resto depende de edad/tipo)
		if i == 0 {
			pax.NRO = 1
		} else {
			if isVentaValida(&pax, product.FechaRegreso) {
				pax.NRO = 1
			} else {
				pax.NRO = 0
			}
		}

		if err := tx.Create(&pax).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear pasajeros"})
			return
		}
	}

	tx.Commit()

	createdBy := &input.Reservation.CreatedBy
	services.NotifyRoleByCode("admin", createdBy, "new_request",
		"Nueva reserva creada",
		fmt.Sprintf("Agencia %s creó la reserva %s (pedido %s)", input.Reservation.Agencia, input.Reservation.NombrePasajero, input.Reservation.PedidoID),
		map[string]string{"agencia": input.Reservation.Agencia, "pasajero": input.Reservation.NombrePasajero, "pedido_id": input.Reservation.PedidoID})

	if product.Disponibilidad <= services.LowAvailabilityThreshold {
		services.NotifyRoleByCode("admin", createdBy, "low_availability",
			"Baja disponibilidad",
			fmt.Sprintf("El producto %s hacia %s quedó con %d cupos disponibles", product.CodigoCupo, product.Destino, product.Disponibilidad),
			map[string]string{"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "disponibilidad": fmt.Sprintf("%d", product.Disponibilidad)})
	}

	// B2B: el email va a quien creó la reserva (la agencia), no al contacto
	// del pasajero — ese no tiene acceso al sistema.
	if recipient := services.ResolveReservationRecipientEmail(input.Reservation.CreatedBy); recipient != "" {
		templateCode := "reservation_blocked"
		if input.Reservation.Estado == models.EstadoConfirmada {
			templateCode = "reservation_confirmed"
		}
		vence := ""
		if input.Reservation.BloqueoExpiraAt != nil {
			vence = input.Reservation.BloqueoExpiraAt.Format("02/01/2006 15:04")
		}
		passengerNames := make([]string, 0, len(input.Passengers))
		for _, pi := range input.Passengers {
			passengerNames = append(passengerNames, strings.TrimSpace(pi.Nombre+" "+pi.Apellido))
		}
		if err := services.SendTemplateEmail(input.Reservation.Agencia, templateCode, recipient,
			buildReservationEmailVars(&input.Reservation, vence, passengerNames)); err != nil {
			services.LogFailure("email",
				fmt.Sprintf("No se pudo enviar el email de aviso para el pedido %s", input.Reservation.PedidoID),
				fmt.Sprintf("template=%s pedido=%s error=%s", templateCode, input.Reservation.PedidoID, err.Error()))
		}
	}

	c.JSON(http.StatusCreated, input.Reservation)
}

func isVentaValida(pax *models.Passenger, fechaRegreso *time.Time) bool {
	if pax.TipoPasajero == "Adulto" || pax.TipoPasajero == "Niño" {
		return true
	}

	// Si es Infante, es venta solo si es < 2 años al regreso
	if pax.Nacimiento != nil && fechaRegreso != nil {
		years := fechaRegreso.Year() - pax.Nacimiento.Year()
		if fechaRegreso.YearDay() < pax.Nacimiento.YearDay() {
			years--
		}
		if years < 2 {
			return true
		}
	}

	return false
}

// reservationWithVendor decora una Reservation con el email del vendedor
// (Profile.Email resuelto a partir de CreatedBy), para que Nóminas y demás
// pantallas no tengan que resolverlo aparte.
type reservationWithVendor struct {
	models.Reservation
	VendedorEmail string `json:"vendedor_email"`
	// Product viaja embebido para que las pantallas de gestión (GestionReservas,
	// Requests, Confirmations) puedan mostrar temporada/equipaje/ruta/tarifas
	// del producto aunque la reserva sea vieja y no tenga esos datos copiados.
	Product *models.Product `json:"product,omitempty"`
	// RosterProductID es el producto al que pertenece el PASAJERO para
	// efectos de nómina: si la venta se hizo sobre un producto-espejo cedido
	// por otra agencia, la nómina real es la de esa agencia dueña (quien
	// gestiona el vuelo/inventario real), no la del espejo — así el roster no
	// queda fragmentado por cada cesión y el dueño ve TODOS sus pasajeros
	// juntos (los propios y los vendidos por agencias a las que les cedió).
	// Para una reserva normal (no cedida) es simplemente el mismo ProductID.
	RosterProductID uint `json:"roster_product_id"`
}

func GetAllReservations(c *gin.Context) {
	reservations := []models.Reservation{}
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)

	// Los pre-holds (hold_temporal) todavía no tienen datos de contacto/pasajero
	// reales — no deben aparecer como fila fantasma mientras el usuario está
	// completando el formulario.
	query := database.DB.Preload("Passengers").Where("estado != ?", models.EstadoHoldTemporal)
	if role == "agency_admin" {
		// Además de lo reservado por mi propia agencia, también:
		// - lo que OTRA agencia reservó sobre un producto que yo poseo
		//   (visibilidad compartida vía ProductSharedAgency);
		// - lo que se vendió sobre un producto-espejo de una cesión que YO
		//   otorgué (source_agency) — el espejo nace con Agencia="", así que
		//   sin este match el cedente nunca veía esas ventas, aunque el
		//   comentario de RosterProductID ya asumía que sí las vería. Sin
		//   esto, una agencia que a la vez cede algunos cupos y recibe otros
		//   (ej. UTG) ve su nómina/reservas incompleta o con los badges de
		//   cedido/genuino cruzados entre ambos roles.
		query = query.Where(
			"LOWER(agencia) = LOWER(?) OR product_id IN (SELECT id FROM products WHERE LOWER(agencia) = LOWER(?) OR LOWER(source_agency) = LOWER(?))",
			agencia, agencia, agencia,
		)
	} else if role != "admin" {
		userID, _ := c.Get("userID")
		query = query.Where("created_by = ?", userID)
	}

	query.Order("created_at desc").Find(&reservations)

	vendorIDSet := make(map[uuid.UUID]struct{}, len(reservations))
	productIDSet := make(map[uint]struct{}, len(reservations))
	for _, r := range reservations {
		vendorIDSet[r.CreatedBy] = struct{}{}
		productIDSet[r.ProductID] = struct{}{}
	}
	vendorIDs := make([]uuid.UUID, 0, len(vendorIDSet))
	for id := range vendorIDSet {
		vendorIDs = append(vendorIDs, id)
	}
	productIDs := make([]uint, 0, len(productIDSet))
	for id := range productIDSet {
		productIDs = append(productIDs, id)
	}

	emailByID := make(map[uuid.UUID]string, len(vendorIDs))
	if len(vendorIDs) > 0 {
		var profiles []models.Profile
		database.DB.Where("id IN ?", vendorIDs).Find(&profiles)
		for _, p := range profiles {
			emailByID[p.ID] = p.Email
		}
	}

	productByID := make(map[uint]models.Product, len(productIDs))
	if len(productIDs) > 0 {
		var products []models.Product
		database.DB.Where("id IN ?", productIDs).Find(&products)
		for _, p := range products {
			productByID[p.ID] = p
		}
	}

	// Resolver, para cada producto-espejo involucrado, cuál es el producto
	// ORIGINAL (dueño real) al que pertenece — un solo salto de la cadena de
	// cesión alcanza para el caso normal (ceder y, como mucho, re-ceder una
	// vez); no se camina la cadena completa para no complicar la consulta.
	transferIDSet := make(map[uuid.UUID]struct{})
	for _, p := range productByID {
		if p.TransferID != nil {
			transferIDSet[*p.TransferID] = struct{}{}
		}
	}
	originalProductIDByTransferID := make(map[uuid.UUID]uint, len(transferIDSet))
	if len(transferIDSet) > 0 {
		transferIDs := make([]uuid.UUID, 0, len(transferIDSet))
		for id := range transferIDSet {
			transferIDs = append(transferIDs, id)
		}
		var transfers []models.AvailabilityTransfer
		database.DB.Where("id IN ?", transferIDs).Find(&transfers)
		for _, t := range transfers {
			originalProductIDByTransferID[t.ID] = t.ProductID
		}
	}

	response := make([]reservationWithVendor, len(reservations))
	for i, r := range reservations {
		item := reservationWithVendor{Reservation: r, VendedorEmail: emailByID[r.CreatedBy], RosterProductID: r.ProductID}
		if p, ok := productByID[r.ProductID]; ok {
			pCopy := p
			item.Product = &pCopy
			if p.TransferID != nil {
				if originalID, ok := originalProductIDByTransferID[*p.TransferID]; ok {
					item.RosterProductID = originalID
				}
			}
			// Reservas viejas creadas antes de copiar estos datos del producto
			// quedaron con estos campos vacíos: se completan al vuelo desde el
			// producto para que las tablas no muestren celdas en blanco.
			if item.VueloDestino == "" {
				item.VueloDestino = p.Destino
			}
			if item.VueloCompania == "" {
				item.VueloCompania = p.Compania
			}
			if item.VueloSalida == nil {
				item.VueloSalida = p.FechaSalida
			}
			if item.VueloRuta == "" {
				item.VueloRuta = p.Ruta
			}
			if item.VueloCodigo == "" {
				item.VueloCodigo = p.CodigoCupo
			}
		}
		response[i] = item
	}

	c.JSON(http.StatusOK, response)
}

func ConfirmReservation(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	if !callerOwnsReservation(c, &reservation) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés permiso sobre esta reserva."})
		return
	}

	// Las reservas expiradas volvieron al stock; no se pueden reactivar.
	if reservation.Estado == models.EstadoExpirada ||
		reservation.Estado == models.EstadoCancelada ||
		reservation.Estado == models.EstadoSolicitudCancelacion {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se puede confirmar una reserva expirada, cancelada o en solicitud de cancelación."})
		return
	}

	reservation.Estado = models.EstadoConfirmada
	database.DB.Save(&reservation)
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).
		Update("estado", models.EstadoConfirmada)

	actor := createdByFromContext(c)
	services.NotifyRoleByCode("admin", actor, "request_confirmed_admin", "Reserva confirmada",
		fmt.Sprintf("La reserva %s (pedido %s) fue confirmada", reservation.NombrePasajero, reservation.PedidoID),
		map[string]string{"pasajero": reservation.NombrePasajero, "pedido_id": reservation.PedidoID})
	services.NotifyUserByCode(reservation.CreatedBy, actor, reservation.Agencia, "request_confirmed_user", "Tu reserva fue confirmada",
		fmt.Sprintf("Tu reserva del pedido %s fue confirmada", reservation.PedidoID),
		map[string]string{"pedido_id": reservation.PedidoID})

	var confirmedPassengers []models.Passenger
	database.DB.Where("reservation_id = ?", reservation.ID).Find(&confirmedPassengers)
	passengerNames := make([]string, 0, len(confirmedPassengers))
	for _, p := range confirmedPassengers {
		passengerNames = append(passengerNames, strings.TrimSpace(p.Nombre+" "+p.Apellido))
	}
	emailVars := buildReservationEmailVars(&reservation, "", passengerNames)

	if recipient := services.ResolveReservationRecipientEmail(reservation.CreatedBy); recipient != "" {
		if err := services.SendTemplateEmail(reservation.Agencia, "reservation_confirmed", recipient, emailVars); err != nil {
			services.LogFailure("email",
				fmt.Sprintf("No se pudo enviar el email de confirmación para el pedido %s", reservation.PedidoID),
				fmt.Sprintf("pedido=%s error=%s", reservation.PedidoID, err.Error()))
		}
	}

	// Mail de cortesía al pasajero/cliente final — a diferencia del de arriba
	// (que siempre va a la agencia), este es opcional y depende de que la
	// reserva tenga un email de contacto cargado. Plantilla propia
	// ("passenger_confirmation") para poder redactarla sin jerga interna.
	if reservation.ContactoEmail != "" {
		if err := services.SendTemplateEmail(reservation.Agencia, "passenger_confirmation", reservation.ContactoEmail, emailVars); err != nil {
			services.LogFailure("email",
				fmt.Sprintf("No se pudo enviar el email de confirmación al pasajero para el pedido %s", reservation.PedidoID),
				fmt.Sprintf("pedido=%s error=%s", reservation.PedidoID, err.Error()))
		}
	}

	c.JSON(http.StatusOK, reservation)
}

func DeleteReservation(c *gin.Context) {
	id := c.Param("id")

	var reservation models.Reservation
	found := false
	if err := database.DB.First(&reservation, id).Error; err == nil {
		found = true
	}
	// Devolver disponibilidad solo si el cron o una cancelación NO lo hizo ya.
	// Las reservas expiradas o canceladas ya tuvieron su stock devuelto.
	if found && reservation.Estado != models.EstadoExpirada && reservation.Estado != models.EstadoCancelada {
		seats, total := countPassengerSeats(reservation.ID)
		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": gorm.Expr("CASE WHEN cupo > 0 THEN LEAST(cupo, GREATEST(0, disponibilidad + ?)) ELSE GREATEST(0, disponibilidad + ?) END", seats, seats),
				"vendidos":       gorm.Expr("GREATEST(0, vendidos - ?)", total),
			})
	}

	database.DB.Where("reservation_id = ?", id).Delete(&models.Passenger{})

	if err := database.DB.Delete(&models.Reservation{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar la reserva."})
		return
	}

	if found {
		services.NotifyAgencyByCode(reservation.Agencia, createdByFromContext(c), "reservation_deleted", "Reserva eliminada",
			fmt.Sprintf("Se eliminó la reserva del pedido %s y se liberó el cupo", reservation.PedidoID),
			map[string]string{"pedido_id": reservation.PedidoID})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Reserva eliminada."})
}

// DeletePassenger elimina UN pasajero puntual de un pedido, liberando su
// lugar en el producto, sin tocar al resto de los pasajeros de la misma
// Reservation — cada pasajero es su propio ticket individual aunque
// comparta pedido_id. Si era el único pasajero, el pedido queda vacío y se
// elimina también (para no dejar una reserva fantasma sin pasajeros).
func DeletePassenger(c *gin.Context) {
	reservationID := c.Param("id")
	passengerID := c.Param("passengerId")

	var passenger models.Passenger
	if err := database.DB.Where("id = ? AND reservation_id = ?", passengerID, reservationID).First(&passenger).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pasajero no encontrado en esta reserva."})
		return
	}

	var reservation models.Reservation
	if err := database.DB.First(&reservation, reservationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	if !callerOwnsReservation(c, &reservation) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés permiso sobre esta reserva."})
		return
	}

	// Liberar únicamente el lugar de este pasajero si no estaba ya
	// cancelado/expirado — y solo si ocupaba lugar (el infante no lo hacía).
	if reservation.Estado != models.EstadoExpirada && reservation.Estado != models.EstadoCancelada &&
		passenger.Estado != models.EstadoExpirada && passenger.Estado != models.EstadoCancelada {
		updates := map[string]interface{}{"vendidos": gorm.Expr("GREATEST(0, vendidos - 1)")}
		if passenger.TipoPasajero != "Infante" {
			updates["disponibilidad"] = gorm.Expr("CASE WHEN cupo > 0 THEN LEAST(cupo, GREATEST(0, disponibilidad + 1)) ELSE GREATEST(0, disponibilidad + 1) END")
		}
		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).Updates(updates)
	}

	if err := database.DB.Delete(&passenger).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el pasajero."})
		return
	}

	var remaining int64
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservationID).Count(&remaining)

	pedidoEliminado := false
	if remaining == 0 {
		database.DB.Delete(&models.Reservation{}, reservationID)
		pedidoEliminado = true
	}

	services.NotifyAgencyByCode(reservation.Agencia, createdByFromContext(c), "passenger_deleted", "Pasajero eliminado",
		fmt.Sprintf("Se eliminó a %s %s del pedido %s y se liberó su lugar", passenger.Nombre, passenger.Apellido, reservation.PedidoID),
		map[string]string{"nombre": passenger.Nombre, "apellido": passenger.Apellido, "pedido_id": reservation.PedidoID})

	c.JSON(http.StatusOK, gin.H{"success": true, "pedido_eliminado": pedidoEliminado, "pasajeros_restantes": remaining})
}

func UpdateReservation(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	if !callerOwnsReservation(c, &reservation) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés permiso sobre esta reserva."})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// No permitir cambiar campos críticos ni datos de pasajero via update
	// general del pedido: los datos de pasajero se editan por pasajero
	// individual desde Nóminas (UpdatePassenger), no a nivel de Reservation.
	blocked := []string{
		"id", "created_by", "created_at", "product_id", "transfer_id", "original_agency",
		"nombre_pasajero", "apellido_pasajero", "documento_pasajero",
		"nacimiento_pasajero", "nacionalidad_pasajero", "tipo_pasajero",
	}
	for _, key := range blocked {
		delete(input, key)
	}

	// Igual que en UpdateProduct: GORM Updates sobre un map usa los valores
	// tal cual llegan sin la type-coercion que sí aplica Save() sobre un
	// struct, así que las fechas que llegan como "YYYY-MM-DD" hay que
	// convertirlas a *time.Time a mano antes de aplicar el update.
	dateFields := []string{"vuelo_salida", "bloqueo_expira_at"}
	for _, field := range dateFields {
		if v, ok := input[field]; ok {
			if s, ok := v.(string); ok {
				input[field] = parseDateFlexible(s)
			}
		}
	}

	// emitido_at nunca se acepta directo del cliente — se calcula acá abajo,
	// la primera vez que estado_interno pasa a "Emitido".
	delete(input, "emitido_at")
	justEmitted := false
	if v, ok := input["estado_interno"].(string); ok {
		if !models.IsValidEstadoInterno(v) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "estado_interno inválido"})
			return
		}
		if v == "Emitido" && reservation.EstadoInterno != "Emitido" {
			input["emitido_at"] = time.Now()
			justEmitted = true
		}
	}

	if err := database.DB.Model(&reservation).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar la reserva: " + err.Error()})
		return
	}

	database.DB.First(&reservation, id)

	// Al emitirse (individual, no solo en bulk) se generan los boletos de la
	// Bandeja de Tickets — antes solo BulkUpdateReservations lo hacía, así que
	// la enorme mayoría de emisiones (flujo de a una reserva) nunca caían ahí.
	// GenerateTicketsForReservationInternal no depende de Atlas para nada — el
	// ticket queda con AtlasStatus="pendiente" y es visible en la bandeja
	// igual, se sincroniza con Atlas después (o nunca) desde ahí.
	if justEmitted {
		userIDVal, _ := c.Get("userID")
		userUUID, _ := uuid.Parse(fmt.Sprintf("%v", userIDVal))
		_, _ = GenerateTicketsForReservationInternal(&reservation, userUUID)
	}

	c.JSON(http.StatusOK, reservation)
}

func AddDocContable(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	if !callerOwnsReservation(c, &reservation) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés permiso sobre esta reserva."})
		return
	}

	if reservation.Estado == models.EstadoExpirada {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La reserva expiró y ya no es válida. No se puede asignar documento contable."})
		return
	}

	if reservation.Estado == models.EstadoCancelada || reservation.Estado == models.EstadoSolicitudCancelacion {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se puede confirmar una reserva cancelada o en solicitud de cancelación."})
		return
	}

	var input struct {
		DocContable string `json:"doc_contable"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.DocContable == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "doc_contable es requerido."})
		return
	}

	updates := map[string]interface{}{
		"doc_contable": input.DocContable,
		"estado":       models.EstadoConfirmada,
	}
	if err := database.DB.Model(&reservation).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar el documento."})
		return
	}
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).
		Updates(updates)

	database.DB.First(&reservation, id)
	c.JSON(http.StatusOK, reservation)
}

func RequestCancellation(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	// Verify ownership or admin
	role, _ := c.Get("role")
	userIDStr, _ := c.Get("userID")
	if role != "admin" && role != "agency_admin" {
		var uid uuid.UUID
		if s, ok := userIDStr.(string); ok {
			uid, _ = uuid.Parse(s)
		}
		if reservation.CreatedBy != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
			return
		}
	}

	if reservation.Estado == models.EstadoCancelada {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La reserva ya está cancelada."})
		return
	}

	// Bloqueo temporal: todavía no es una reserva confirmada (nadie más la
	// dio por buena) — quien la pidió puede cancelarla directo, sin pedir
	// autorización a un admin, y el lugar se libera al instante. Solo a
	// partir de "confirmada" (o cualquier otro estado post-confirmación)
	// pasa por el flujo de aprobación de abajo.
	if reservation.Estado == models.EstadoBloqueoTemporal {
		seats, total := countPassengerSeats(reservation.ID)
		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": gorm.Expr("CASE WHEN cupo > 0 THEN LEAST(cupo, GREATEST(0, disponibilidad + ?)) ELSE GREATEST(0, disponibilidad + ?) END", seats, seats),
				"vendidos":       gorm.Expr("GREATEST(0, vendidos - ?)", total),
			})
		database.DB.Model(&reservation).Update("estado", models.EstadoCancelada)
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Update("estado", models.EstadoCancelada)

		database.DB.First(&reservation, id)

		services.NotifyAgencyByCode(reservation.Agencia, createdByFromContext(c), "reservation_cancelled_direct", "Reserva cancelada",
			fmt.Sprintf("Se canceló la reserva del pedido %s (bloqueo temporal) y el cupo fue liberado", reservation.PedidoID),
			map[string]string{"pedido_id": reservation.PedidoID})

		c.JSON(http.StatusOK, reservation)
		return
	}

	// Guarda el estado previo para poder restaurarlo tal cual si un admin
	// rechaza la solicitud (ver ResolveCancellation más abajo).
	prevEstado := reservation.Estado
	if err := database.DB.Model(&reservation).Updates(map[string]interface{}{
		"estado":            models.EstadoSolicitudCancelacion,
		"pre_cancel_estado": prevEstado,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al procesar solicitud."})
		return
	}
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).
		Update("estado", models.EstadoSolicitudCancelacion)

	database.DB.First(&reservation, id)

	services.NotifyRoleByCode("admin", createdByFromContext(c), "cancellation_pending", "Solicitud de cancelación pendiente",
		fmt.Sprintf("La reserva del pedido %s tiene una solicitud de cancelación pendiente de revisión", reservation.PedidoID),
		map[string]string{"pedido_id": reservation.PedidoID})

	c.JSON(http.StatusOK, reservation)
}

// ResolveCancellation permite a un admin aprobar o rechazar una solicitud de
// cancelación pendiente, con notas opcionales. Aprobar cancela la reserva
// definitivamente y libera el cupo al stock (a diferencia de DeleteReservation,
// no borra la fila: queda en el historial marcada "cancelada", con las notas
// del admin). Rechazar la vuelve al estado que tenía antes de la solicitud
// (pre_cancel_estado, guardado por RequestCancellation) y avisa a quien la
// pidió.
func ResolveCancellation(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}
	if reservation.Estado != models.EstadoSolicitudCancelacion {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Esta reserva no tiene una solicitud de cancelación pendiente."})
		return
	}

	var input struct {
		Decision string `json:"decision"` // "approve" | "decline"
		Notas    string `json:"notas"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Decision != "approve" && input.Decision != "decline" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "decision debe ser 'approve' o 'decline'"})
		return
	}

	actor := createdByFromContext(c)

	if input.Decision == "approve" {
		seats, total := countPassengerSeats(reservation.ID)
		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": gorm.Expr("CASE WHEN cupo > 0 THEN LEAST(cupo, GREATEST(0, disponibilidad + ?)) ELSE GREATEST(0, disponibilidad + ?) END", seats, seats),
				"vendidos":       gorm.Expr("GREATEST(0, vendidos - ?)", total),
			})
		database.DB.Model(&reservation).Updates(map[string]interface{}{
			"estado":            models.EstadoCancelada,
			"cancelacion_notas": input.Notas,
		})
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Update("estado", models.EstadoCancelada)

		services.NotifyUserByCode(reservation.CreatedBy, actor, reservation.Agencia, "cancellation_approved", "Cancelación aprobada",
			fmt.Sprintf("Se aprobó la cancelación de tu reserva del pedido %s y el cupo fue liberado", reservation.PedidoID),
			map[string]string{"pedido_id": reservation.PedidoID})
	} else {
		restoreEstado := reservation.PreCancelEstado
		if restoreEstado == "" {
			restoreEstado = models.EstadoConfirmada
		}
		database.DB.Model(&reservation).Updates(map[string]interface{}{
			"estado":            restoreEstado,
			"cancelacion_notas": input.Notas,
		})
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Update("estado", restoreEstado)

		services.NotifyUserByCode(reservation.CreatedBy, actor, reservation.Agencia, "cancellation_declined", "Cancelación rechazada",
			fmt.Sprintf("Se rechazó la solicitud de cancelación de tu reserva del pedido %s", reservation.PedidoID),
			map[string]string{"pedido_id": reservation.PedidoID})
	}

	database.DB.First(&reservation, id)
	c.JSON(http.StatusOK, reservation)
}

// GetBlockedReservations devuelve las reservas en bloqueo_temporal de TODA la
// agencia del usuario (no solo las que él mismo creó), para que cualquier
// compañero de la agencia sepa que un cupo en 0 en realidad tiene un bloqueo
// esperando confirmación y pueda especular con esperar. Admin ve las de todas
// las agencias. Por eso mismo, expone EXCLUSIVAMENTE lo mínimo indispensable
// (pedido, destino, vencimiento) — nunca nombre, documento ni contacto del
// pasajero de otra persona.
func GetBlockedReservations(c *gin.Context) {
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)

	query := database.DB.Preload("Product").Model(&models.Reservation{}).Where("estado = ?", models.EstadoBloqueoTemporal)
	if role != "admin" {
		query = query.Where("LOWER(agencia) = LOWER(?)", agencia)
	}

	var reservations []models.Reservation
	query.Order("bloqueo_expira_at asc").Find(&reservations)

	result := make([]gin.H, len(reservations))
	for i, r := range reservations {
		result[i] = gin.H{
			"id":                r.ID,
			"pedido_id":         r.PedidoID,
			// product_id (no es dato personal) permite que Disponibilidad
			// muestre el bloqueo en la línea del producto puntual, en vez de
			// solo en un banner general agrupado por destino.
			"product_id":        r.ProductID,
			"vuelo_destino":     r.VueloDestino,
			"bloqueo_expira_at": r.BloqueoExpiraAt,
			"vuelo_salida":      r.VueloSalida,
			"temporada":         r.Product.Temporada,
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func GetReservationByID(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	// Preload("Passengers") hace falta para el itinerario PDF de Confirmations.jsx —
	// sin esto, reservation.Passengers siempre vuelve vacío.
	if err := database.DB.Preload("Passengers").First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	role, _ := c.Get("role")
	userIDStr, _ := c.Get("userID")
	if role != "admin" && role != "agency_admin" {
		var uid uuid.UUID
		if s, ok := userIDStr.(string); ok {
			uid, _ = uuid.Parse(s)
		}
		if reservation.CreatedBy != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
			return
		}
	}

	c.JSON(http.StatusOK, reservation)
}

// UpdatePassengerTicket actualiza el ticket de UN pasajero puntual (numero_ticket,
// estado, doc_contable) sin afectar al resto de los pasajeros del mismo pedido —
// cada pasajero progresa de forma individual aunque comparta reserva/pedido.
func UpdatePassengerTicket(c *gin.Context) {
	reservationID := c.Param("id")
	passengerID := c.Param("passengerId")

	var passenger models.Passenger
	if err := database.DB.Where("id = ? AND reservation_id = ?", passengerID, reservationID).First(&passenger).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pasajero no encontrado en esta reserva."})
		return
	}

	var input struct {
		NumeroTicket string `json:"numero_ticket"`
		Estado       string `json:"estado"`
		DocContable  string `json:"doc_contable"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// No se puede editar un pasajero cuya reserva expiró.
	var parentReservation models.Reservation
	if err := database.DB.First(&parentReservation, reservationID).Error; err == nil {
		if parentReservation.Estado == models.EstadoExpirada {
			c.JSON(http.StatusBadRequest, gin.H{"error": "La reserva expiró y ya no es válida. No se puede modificar el pasajero."})
			return
		}
	}

	updates := map[string]interface{}{}
	if input.NumeroTicket != "" {
		updates["numero_ticket"] = input.NumeroTicket
	}
	if input.Estado != "" {
		updates["estado"] = input.Estado
	}
	if input.DocContable != "" {
		updates["doc_contable"] = input.DocContable
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se enviaron campos para actualizar."})
		return
	}

	if err := database.DB.Model(&passenger).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el ticket del pasajero."})
		return
	}

	database.DB.First(&passenger, passenger.ID)
	c.JSON(http.StatusOK, passenger)
}

// UpdatePassenger edita los datos propios de UN pasajero (nombre, apellido,
// documento, nacimiento, nacionalidad, tipo_pasajero, tarifas) desde Nóminas
// — es la única vía para tocar estos campos; GestionReservas ya no los expone
// porque los datos de pasajero se gestionan a nivel pasajero, no de pedido.
func UpdatePassenger(c *gin.Context) {
	reservationID := c.Param("id")
	passengerID := c.Param("passengerId")

	var passenger models.Passenger
	if err := database.DB.Where("id = ? AND reservation_id = ?", passengerID, reservationID).First(&passenger).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pasajero no encontrado en esta reserva."})
		return
	}

	var input struct {
		Nombre               string   `json:"nombre"`
		Apellido             string   `json:"apellido"`
		Documento            string   `json:"documento"`
		Pasaporte            string   `json:"pasaporte"`
		Nacimiento           string   `json:"nacimiento"`
		Nacionalidad         string   `json:"nacionalidad"`
		TipoPasajero         string   `json:"tipo_pasajero"`
		PrecioVenta          *float64 `json:"precio_venta"`
		Neto1                *float64 `json:"neto_1"`
		DocumentoVencimiento string   `json:"documento_vencimiento"`
		DocumentoVitalicio   bool     `json:"documento_vitalicio"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"nombre":                 input.Nombre,
		"apellido":               input.Apellido,
		"documento":              input.Documento,
		"pasaporte":              input.Pasaporte,
		"nacionalidad":           input.Nacionalidad,
		"tipo_pasajero":          input.TipoPasajero,
		"nacimiento":             parseDateFlexible(input.Nacimiento),
		"documento_vencimiento": parseDateFlexible(input.DocumentoVencimiento),
		"documento_vitalicio":   input.DocumentoVitalicio,
	}
	if input.PrecioVenta != nil {
		updates["precio_venta"] = *input.PrecioVenta
	}
	if input.Neto1 != nil {
		updates["neto_1"] = *input.Neto1
	}

	if err := database.DB.Model(&passenger).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el pasajero: " + err.Error()})
		return
	}

	database.DB.First(&passenger, passenger.ID)
	c.JSON(http.StatusOK, passenger)
}

// DuplicatePassenger crea un pasajero nuevo dentro del mismo pedido copiando
// los datos de uno existente (grupo familiar con datos similares, ej.) —
// ocupa 1 lugar más del producto y respeta su disponibilidad igual que crear
// una reserva nueva.
func DuplicatePassenger(c *gin.Context) {
	reservationID := c.Param("id")
	passengerID := c.Param("passengerId")

	var reservation models.Reservation
	if err := database.DB.First(&reservation, reservationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	var source models.Passenger
	if err := database.DB.Where("id = ? AND reservation_id = ?", passengerID, reservationID).First(&source).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pasajero no encontrado en esta reserva."})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var product models.Product
	if err := tx.First(&product, reservation.ProductID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Producto no encontrado"})
		return
	}
	// El infante no ocupa lugar/cupo — no hace falta disponibilidad para
	// duplicar uno.
	needsSeat := source.TipoPasajero != "Infante"
	if needsSeat && product.Disponibilidad < 1 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente para duplicar el pasajero"})
		return
	}

	if needsSeat {
		product.Disponibilidad -= 1
	}
	product.Vendidos += 1
	if err := tx.Save(&product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	newPassenger := models.Passenger{
		ReservationID:   reservation.ID,
		PedidoID:        reservation.PedidoID,
		Nombre:          source.Nombre,
		Apellido:        source.Apellido,
		Documento:       source.Documento,
		Pasaporte:       source.Pasaporte,
		Nacimiento:      source.Nacimiento,
		Nacionalidad:    source.Nacionalidad,
		TipoPasajero:    source.TipoPasajero,
		Estado:          reservation.Estado,
		PrecioVenta:     source.PrecioVenta,
		Neto1:           source.Neto1,
		DocContable:     source.DocContable,
		BloqueoExpiraAt: reservation.BloqueoExpiraAt,
	}
	if err := tx.Create(&newPassenger).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al duplicar el pasajero"})
		return
	}

	tx.Commit()

	services.NotifyAgencyByCode(reservation.Agencia, createdByFromContext(c), "passenger_duplicated", "Pasajero duplicado",
		fmt.Sprintf("Se agregó un pasajero duplicado de %s %s al pedido %s", source.Nombre, source.Apellido, reservation.PedidoID),
		map[string]string{"nombre": source.Nombre, "apellido": source.Apellido, "pedido_id": reservation.PedidoID})

	c.JSON(http.StatusCreated, newPassenger)
}

// AddPassenger crea un pasajero nuevo (en blanco, con los datos que mande el
// caller) dentro de un pedido existente — a diferencia de DuplicatePassenger,
// que copia los datos de un pasajero ya cargado. Ocupa 1 lugar más del
// producto y respeta su disponibilidad igual que crear una reserva nueva.
func AddPassenger(c *gin.Context) {
	reservationID := c.Param("id")

	var reservation models.Reservation
	if err := database.DB.First(&reservation, reservationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
		return
	}

	var input struct {
		Nombre               string   `json:"nombre"`
		Apellido             string   `json:"apellido"`
		Documento            string   `json:"documento"`
		Pasaporte            string   `json:"pasaporte"`
		Nacimiento           string   `json:"nacimiento"`
		Nacionalidad         string   `json:"nacionalidad"`
		TipoPasajero         string   `json:"tipo_pasajero"`
		PrecioVenta          *float64 `json:"precio_venta"`
		Neto1                *float64 `json:"neto_1"`
		DocumentoVencimiento string   `json:"documento_vencimiento"`
		DocumentoVitalicio   bool     `json:"documento_vitalicio"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var product models.Product
	if err := tx.First(&product, reservation.ProductID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Producto no encontrado"})
		return
	}
	// El infante no ocupa lugar/cupo — no hace falta disponibilidad para
	// agregarlo.
	needsSeat := input.TipoPasajero != "Infante"
	if needsSeat && product.Disponibilidad < 1 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente para agregar un pasajero"})
		return
	}

	if needsSeat {
		product.Disponibilidad -= 1
	}
	product.Vendidos += 1
	if err := tx.Save(&product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	var precioVenta float64
	if input.PrecioVenta != nil {
		precioVenta = *input.PrecioVenta
	}
	// Neto1 usa el desglose de SU tipo (ADT/CHD/INF) salvo que venga un
	// override explícito — mismo criterio que CreateReservation.
	neto1 := product.NetoForTipo(input.TipoPasajero)
	if input.Neto1 != nil {
		neto1 = *input.Neto1
	}

	newPassenger := models.Passenger{
		ReservationID:        reservation.ID,
		PedidoID:             reservation.PedidoID,
		Nombre:               input.Nombre,
		Apellido:             input.Apellido,
		Documento:            input.Documento,
		Pasaporte:            input.Pasaporte,
		Nacimiento:           parseDateFlexible(input.Nacimiento),
		Nacionalidad:         input.Nacionalidad,
		TipoPasajero:         input.TipoPasajero,
		Estado:               reservation.Estado,
		PrecioVenta:          precioVenta,
		Neto1:                neto1,
		BloqueoExpiraAt:      reservation.BloqueoExpiraAt,
		DocumentoVencimiento: parseDateFlexible(input.DocumentoVencimiento),
		DocumentoVitalicio:   input.DocumentoVitalicio,
	}
	if err := tx.Create(&newPassenger).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al agregar el pasajero"})
		return
	}

	tx.Commit()

	services.NotifyAgencyByCode(reservation.Agencia, createdByFromContext(c), "passenger_added", "Pasajero agregado",
		fmt.Sprintf("Se agregó un nuevo pasajero al pedido %s", reservation.PedidoID),
		map[string]string{"pedido_id": reservation.PedidoID})

	c.JSON(http.StatusCreated, newPassenger)
}

// BulkUpdateReservations permite cambiar masivamente el estado de reservas seleccionadas (ej. pasar a "Emitido")
func BulkUpdateReservations(c *gin.Context) {
	var req struct {
		IDs           []uuid.UUID `json:"ids"`
		Estado        string      `json:"estado"`
		EstadoInterno string      `json:"estado_interno"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere un array 'ids' con al menos un ID de reserva."})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCaller := services.ResolveAgencyCode(agenciaRaw)

	query := database.DB.Where("id IN ?", req.IDs)
	if role != "admin" {
		query = query.Where("LOWER(agencia) = ?", strings.ToLower(agenciaCaller))
	}

	var reservations []models.Reservation
	if err := query.Find(&reservations).Error; err != nil || len(reservations) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No se encontraron reservas para actualizar."})
		return
	}

	userIDVal, _ := c.Get("userID")
	userIDStr := fmt.Sprintf("%v", userIDVal)
	userUUID, _ := uuid.Parse(userIDStr)

	var updatedCount int
	now := time.Now()

	for _, res := range reservations {
		updates := map[string]interface{}{}
		if req.Estado != "" {
			updates["estado"] = req.Estado
		}
		if req.EstadoInterno != "" {
			if !models.IsValidEstadoInterno(req.EstadoInterno) {
				continue
			}
			updates["estado_interno"] = req.EstadoInterno
			if req.EstadoInterno == "Emitido" && res.EstadoInterno != "Emitido" {
				updates["emitido_at"] = now
			}
		}

		if len(updates) > 0 {
			if err := database.DB.Model(&models.Reservation{}).Where("id = ?", res.ID).Updates(updates).Error; err == nil {
				updatedCount++
				// Si pasó a Emitido, auto-genera los boletos en la Bandeja de Tickets
				if req.EstadoInterno == "Emitido" {
					resCopy := res
					resCopy.EstadoInterno = "Emitido"
					_, _ = GenerateTicketsForReservationInternal(&resCopy, userUUID)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%d reserva(s) actualizada(s) correctamente.", updatedCount),
		"count":   updatedCount,
	})
}

// BulkCancelReservations cancela masivamente un grupo de reservas restituyendo el stock
func BulkCancelReservations(c *gin.Context) {
	var req struct {
		IDs   []uuid.UUID `json:"ids"`
		Notas string      `json:"notas"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere un array 'ids' con al menos un ID de reserva."})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCaller := services.ResolveAgencyCode(agenciaRaw)

	query := database.DB.Where("id IN ?", req.IDs)
	if role != "admin" {
		query = query.Where("LOWER(agencia) = ?", strings.ToLower(agenciaCaller))
	}

	var reservations []models.Reservation
	if err := query.Find(&reservations).Error; err != nil || len(reservations) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No se encontraron reservas para cancelar."})
		return
	}

	var canceledCount int
	for _, res := range reservations {
		if res.Estado == "cancelada" {
			continue
		}
		tx := database.DB.Begin()
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, res.ProductID).Error; err == nil {
			var passengerCount int64
			tx.Model(&models.Passenger{}).Where("reservation_id = ?", res.ID).Count(&passengerCount)
			toRelease := int(passengerCount)
			if toRelease == 0 {
				toRelease = res.HoldPassengerCount
			}
			if toRelease == 0 {
				toRelease = 1
			}
			product.Vendidos -= toRelease
			if product.Vendidos < 0 {
				product.Vendidos = 0
			}
			product.Disponibilidad = product.Cupo - product.Vendidos
			tx.Save(&product)
		}

		res.Estado = "cancelada"
		res.CancelacionNotas = req.Notas
		if err := tx.Save(&res).Error; err == nil {
			tx.Commit()
			canceledCount++
		} else {
			tx.Rollback()
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("%d reserva(s) cancelada(s) correctamente.", canceledCount),
		"count":   canceledCount,
	})
}
