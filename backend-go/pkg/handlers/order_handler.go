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
	// HoldID, si viene, referencia un pre-hold creado por CreateHold: en ese
	// caso el stock ya fue descontado al crear el hold y esta llamada solo
	// completa los datos reales de contacto/pasajeros sobre esa misma fila.
	HoldID uint `json:"hold_id,omitempty"`
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

	holdMinutes := services.GetIntSetting("bloqueo_hold_minutos", 10)
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

	if existingHold != nil {
		// La cantidad quedó fija al crear el hold: si no coincide, el cliente
		// está tratando de reservar más/menos lugares de los que en verdad
		// tiene apartados.
		if numPassengers != existingHold.HoldPassengerCount {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "La cantidad de pasajeros no coincide con el bloqueo temporal"})
			return
		}
	} else {
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
		blockMinutes = services.GetIntSetting("bloqueo_minutos_default", 60)
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
		if err := services.SendTemplateEmail(input.Reservation.Agencia, templateCode, recipient, map[string]string{
			"pedido_id":       input.Reservation.PedidoID,
			"contacto_nombre": input.Reservation.NombrePasajero,
			"vence":           vence,
		}); err != nil {
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
		// Además de lo reservado por mi propia agencia, también lo que OTRA
		// agencia reservó sobre un producto que yo poseo (visibilidad
		// compartida vía ProductSharedAgency) — al owner le tiene que caer la
		// nómina/reserva igual, aunque la haya tomado otra agencia.
		query = query.Where(
			"LOWER(agencia) = LOWER(?) OR product_id IN (SELECT id FROM products WHERE LOWER(agencia) = LOWER(?))",
			agencia, agencia,
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

	if recipient := services.ResolveReservationRecipientEmail(reservation.CreatedBy); recipient != "" {
		if err := services.SendTemplateEmail(reservation.Agencia, "reservation_confirmed", recipient, map[string]string{
			"pedido_id":       reservation.PedidoID,
			"contacto_nombre": reservation.NombrePasajero,
		}); err != nil {
			services.LogFailure("email",
				fmt.Sprintf("No se pudo enviar el email de confirmación para el pedido %s", reservation.PedidoID),
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
	// Devolver disponibilidad solo si el cron NO lo hizo ya.
	// Las reservas expiradas ya tuvieron su stock devuelto por expireOverdueReservations.
	if found && reservation.Estado != models.EstadoExpirada {
		var passengersCount int64
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Count(&passengersCount)
		if passengersCount == 0 {
			passengersCount = 1
		}

		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": gorm.Expr("GREATEST(0, disponibilidad + ?)", passengersCount),
				"vendidos":       gorm.Expr("GREATEST(0, vendidos - ?)", passengersCount),
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

	services.NotifyAgencyByCode(reservation.Agencia, createdByFromContext(c), "passenger_added", "Pasajero agregado",
		fmt.Sprintf("Se agregó un nuevo pasajero al pedido %s", reservation.PedidoID),
		map[string]string{"pedido_id": reservation.PedidoID})

	c.JSON(http.StatusCreated, newPassenger)
}
