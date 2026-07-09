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
	Nacimiento   string   `json:"nacimiento"` // "1994-10-20" o "1994-10-20T00:00:00Z"
	Nacionalidad string   `json:"nacionalidad"`
	TipoPasajero string   `json:"tipo_pasajero"`
	PrecioVenta  *float64 `json:"precio_venta,omitempty"`
	Neto1        *float64 `json:"neto_1,omitempty"`
	DocContable  string   `json:"doc_contable,omitempty"`
}

type ReservationInput struct {
	models.Reservation
	Passengers []PassengerInput `json:"passengers"`
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
		Nombre:       pi.Nombre,
		Apellido:     pi.Apellido,
		Documento:    pi.Documento,
		Nacimiento:   parseDateFlexible(pi.Nacimiento),
		Nacionalidad: pi.Nacionalidad,
		TipoPasajero: pi.TipoPasajero,
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

	// 1. Obtener producto para validar disponibilidad y obtener datos
	var product models.Product
	if err := tx.First(&product, input.ProductID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Producto no encontrado"})
		return
	}

	// Un cupo cedido a una agencia puntual (RestrictedAgency) solo puede
	// reservarlo esa agencia (el admin puede reservar cualquiera).
	if role != "admin" && product.RestrictedAgency != "" {
		if !strings.EqualFold(product.RestrictedAgency, userAgencia) {
			tx.Rollback()
			c.JSON(http.StatusForbidden, gin.H{"error": "Este cupo fue cedido a otra agencia"})
			return
		}
	}

	numPassengers := len(input.Passengers)
	if numPassengers == 0 {
		numPassengers = 1
	}

	if product.Disponibilidad < numPassengers {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente"})
		return
	}

	// 2. Actualizar disponibilidad del producto
	product.Disponibilidad -= numPassengers
	product.Vendidos += numPassengers
	if err := tx.Save(&product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	// Auto-generar pedido_id si no viene
	if input.Reservation.PedidoID == "" {
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
		blockMinutes = 60 // Default
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

	if err := tx.Create(&input.Reservation).Error; err != nil {
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
		pax.Neto1 = input.Reservation.Neto1
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
	services.NotifyRole("admin", createdBy, "new_request",
		"Nueva reserva creada",
		fmt.Sprintf("Agencia %s creó la reserva %s (pedido %s)", input.Reservation.Agencia, input.Reservation.NombrePasajero, input.Reservation.PedidoID))

	if product.Disponibilidad <= services.LowAvailabilityThreshold {
		services.NotifyRole("admin", createdBy, "low_availability",
			"Baja disponibilidad",
			fmt.Sprintf("El producto %s hacia %s quedó con %d cupos disponibles", product.CodigoCupo, product.Destino, product.Disponibilidad))
	}

	if input.Reservation.ContactoEmail != "" {
		templateCode := "reservation_blocked"
		if input.Reservation.Estado == models.EstadoConfirmada {
			templateCode = "reservation_confirmed"
		}
		vence := ""
		if input.Reservation.BloqueoExpiraAt != nil {
			vence = input.Reservation.BloqueoExpiraAt.Format("02/01/2006 15:04")
		}
		if err := services.SendTemplateEmail(input.Reservation.Agencia, templateCode, input.Reservation.ContactoEmail, map[string]string{
			"pedido_id":       input.Reservation.PedidoID,
			"contacto_nombre": input.Reservation.NombrePasajero,
			"vence":           vence,
		}); err != nil {
			services.LogFailure("email", fmt.Sprintf("No se pudo enviar email de %s para pedido %s: %s", templateCode, input.Reservation.PedidoID, err.Error()))
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

	query := database.DB.Preload("Passengers")
	if role == "agency_admin" {
		query = query.Where("LOWER(agencia) = LOWER(?)", agencia)
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

	reservation.Estado = models.EstadoConfirmada
	database.DB.Save(&reservation)
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).
		Update("estado", models.EstadoConfirmada)

	actor := createdByFromContext(c)
	services.NotifyRole("admin", actor, "request_confirmed", "Reserva confirmada",
		fmt.Sprintf("La reserva %s (pedido %s) fue confirmada", reservation.NombrePasajero, reservation.PedidoID))
	services.NotifyUser(reservation.CreatedBy, actor, "request_confirmed", "Tu reserva fue confirmada",
		fmt.Sprintf("Tu reserva del pedido %s fue confirmada", reservation.PedidoID))

	if reservation.ContactoEmail != "" {
		if err := services.SendTemplateEmail(reservation.Agencia, "reservation_confirmed", reservation.ContactoEmail, map[string]string{
			"pedido_id":       reservation.PedidoID,
			"contacto_nombre": reservation.NombrePasajero,
		}); err != nil {
			services.LogFailure("email", fmt.Sprintf("No se pudo enviar email de confirmación para pedido %s: %s", reservation.PedidoID, err.Error()))
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
		// Devolver disponibilidad
		var passengersCount int64
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Count(&passengersCount)
		if passengersCount == 0 {
			passengersCount = 1
		}

		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": gorm.Expr("disponibilidad + ?", passengersCount),
				"vendidos":       gorm.Expr("vendidos - ?", passengersCount),
			})
	}

	database.DB.Where("reservation_id = ?", id).Delete(&models.Passenger{})

	if err := database.DB.Delete(&models.Reservation{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar la reserva."})
		return
	}

	if found {
		services.NotifyAgency(reservation.Agencia, createdByFromContext(c), "info", "Reserva eliminada",
			fmt.Sprintf("Se eliminó la reserva del pedido %s y se liberó el cupo", reservation.PedidoID))
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

	// Liberar únicamente el lugar de este pasajero (no el pedido completo).
	database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
		Updates(map[string]interface{}{
			"disponibilidad": gorm.Expr("disponibilidad + 1"),
			"vendidos":       gorm.Expr("vendidos - 1"),
		})

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

	services.NotifyAgency(reservation.Agencia, createdByFromContext(c), "info", "Pasajero eliminado",
		fmt.Sprintf("Se eliminó a %s %s del pedido %s y se liberó su lugar", passenger.Nombre, passenger.Apellido, reservation.PedidoID))

	c.JSON(http.StatusOK, gin.H{"success": true, "pedido_eliminado": pedidoEliminado, "pasajeros_restantes": remaining})
}

func UpdateReservation(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
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

	if err := database.DB.Model(&reservation).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar la reserva: " + err.Error()})
		return
	}

	database.DB.First(&reservation, id)
	c.JSON(http.StatusOK, reservation)
}

func AddDocContable(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada."})
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

	if err := database.DB.Model(&reservation).Update("estado", models.EstadoSolicitudCancelacion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al procesar solicitud."})
		return
	}
	database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).
		Update("estado", models.EstadoSolicitudCancelacion)

	database.DB.First(&reservation, id)

	services.NotifyRole("admin", createdByFromContext(c), "info", "Solicitud de cancelación pendiente",
		fmt.Sprintf("La reserva del pedido %s tiene una solicitud de cancelación pendiente de revisión", reservation.PedidoID))

	c.JSON(http.StatusOK, reservation)
}

func GetReservationByID(c *gin.Context) {
	id := c.Param("id")
	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err != nil {
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
		Nombre       string   `json:"nombre"`
		Apellido     string   `json:"apellido"`
		Documento    string   `json:"documento"`
		Nacimiento   string   `json:"nacimiento"`
		Nacionalidad string   `json:"nacionalidad"`
		TipoPasajero string   `json:"tipo_pasajero"`
		PrecioVenta  *float64 `json:"precio_venta"`
		Neto1        *float64 `json:"neto_1"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"nombre":        input.Nombre,
		"apellido":      input.Apellido,
		"documento":     input.Documento,
		"nacionalidad":  input.Nacionalidad,
		"tipo_pasajero": input.TipoPasajero,
		"nacimiento":    parseDateFlexible(input.Nacimiento),
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
	if product.Disponibilidad < 1 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente para duplicar el pasajero"})
		return
	}

	product.Disponibilidad -= 1
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

	services.NotifyAgency(reservation.Agencia, createdByFromContext(c), "info", "Pasajero duplicado",
		fmt.Sprintf("Se agregó un pasajero duplicado de %s %s al pedido %s", source.Nombre, source.Apellido, reservation.PedidoID))

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
		Nombre       string   `json:"nombre"`
		Apellido     string   `json:"apellido"`
		Documento    string   `json:"documento"`
		Nacimiento   string   `json:"nacimiento"`
		Nacionalidad string   `json:"nacionalidad"`
		TipoPasajero string   `json:"tipo_pasajero"`
		PrecioVenta  *float64 `json:"precio_venta"`
		Neto1        *float64 `json:"neto_1"`
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
	if product.Disponibilidad < 1 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad suficiente para agregar un pasajero"})
		return
	}

	product.Disponibilidad -= 1
	product.Vendidos += 1
	if err := tx.Save(&product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	var precioVenta, neto1 float64
	if input.PrecioVenta != nil {
		precioVenta = *input.PrecioVenta
	}
	if input.Neto1 != nil {
		neto1 = *input.Neto1
	}

	newPassenger := models.Passenger{
		ReservationID:   reservation.ID,
		PedidoID:        reservation.PedidoID,
		Nombre:          input.Nombre,
		Apellido:        input.Apellido,
		Documento:       input.Documento,
		Nacimiento:      parseDateFlexible(input.Nacimiento),
		Nacionalidad:    input.Nacionalidad,
		TipoPasajero:    input.TipoPasajero,
		Estado:          reservation.Estado,
		PrecioVenta:     precioVenta,
		Neto1:           neto1,
		BloqueoExpiraAt: reservation.BloqueoExpiraAt,
	}
	if err := tx.Create(&newPassenger).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al agregar el pasajero"})
		return
	}

	tx.Commit()

	services.NotifyAgency(reservation.Agencia, createdByFromContext(c), "info", "Pasajero agregado",
		fmt.Sprintf("Se agregó un nuevo pasajero al pedido %s", reservation.PedidoID))

	c.JSON(http.StatusCreated, newPassenger)
}
