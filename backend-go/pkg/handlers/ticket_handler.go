package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// buildSegmentosJSON parsea el texto libre de itinerario (Reservation.VueloRuta)
// en tramos normalizados (services.ParseRuta) y lo serializa para la columna
// Ticket.Segmentos. Si el parseo no encuentra ningún tramo válido, devuelve
// un array vacío en vez de null (mismo default que la columna).
func buildSegmentosJSON(ruta string) datatypes.JSON {
	segmentos := services.ParseRuta(ruta)
	if segmentos == nil {
		segmentos = []services.ItinerarySegment{}
	}
	b, err := json.Marshal(segmentos)
	if err != nil {
		log.Printf("buildSegmentosJSON: error serializando itinerario: %v", err)
		return datatypes.JSON([]byte("[]"))
	}
	return datatypes.JSON(b)
}

// GetTickets devuelve el listado de tickets emitidos con filtros y scoping por agencia
func GetTickets(c *gin.Context) {
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCaller := services.ResolveAgencyCode(agenciaRaw)

	query := database.DB.Model(&models.Ticket{}).
		Preload("EmisorUser").
		Preload("VoidUser").
		Order("created_at DESC")

	// Scoping de agencias: si no es admin, solo ve boletos de su propia agencia
	if role != "admin" {
		query = query.Where("LOWER(agencia) = ?", strings.ToLower(agenciaCaller))
	} else if agencyFilter := strings.TrimSpace(c.Query("agencia")); agencyFilter != "" {
		query = query.Where("LOWER(agencia) = ?", strings.ToLower(agencyFilter))
	}

	// Filtros opcionales
	if estado := strings.TrimSpace(c.Query("estado")); estado != "" {
		query = query.Where("estado = ?", estado)
	}
	if pnr := strings.TrimSpace(c.Query("pnr")); pnr != "" {
		query = query.Where("LOWER(pnr) LIKE ?", "%"+strings.ToLower(pnr)+"%")
	}
	if ticketNum := strings.TrimSpace(c.Query("numero_ticket")); ticketNum != "" {
		query = query.Where("LOWER(numero_ticket) LIKE ?", "%"+strings.ToLower(ticketNum)+"%")
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(pasajero_nombre) LIKE ? OR LOWER(pasajero_documento) LIKE ? OR LOWER(pnr) LIKE ? OR LOWER(numero_ticket) LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	var tickets []models.Ticket
	if err := query.Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar la bandeja de tickets: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, tickets)
}

// GetTicketByID devuelve el detalle inmutable de un ticket
func GetTicketByID(c *gin.Context) {
	id := c.Param("id")
	var ticket models.Ticket
	if err := database.DB.Preload("EmisorUser").Preload("VoidUser").First(&ticket, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket no encontrado."})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCaller := services.ResolveAgencyCode(agenciaRaw)

	if role != "admin" && strings.ToLower(ticket.Agencia) != strings.ToLower(agenciaCaller) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes acceso a este ticket."})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// VoidTicket anula un ticket emitiendo el registro auditado (lógica GDS inmutable: nunca borra la fila)
func VoidTicket(c *gin.Context) {
	id := c.Param("id")
	var ticket models.Ticket
	if err := database.DB.First(&ticket, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket no encontrado."})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCaller := services.ResolveAgencyCode(agenciaRaw)

	if role != "admin" && strings.ToLower(ticket.Agencia) != strings.ToLower(agenciaCaller) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para anular este ticket."})
		return
	}

	if ticket.Estado == "void" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El ticket ya se encuentra anulado (void)."})
		return
	}

	var req struct {
		MotivoVoid   string `json:"motivo_void"`
		RestoreStock bool   `json:"restore_stock"`
	}
	_ = c.ShouldBindJSON(&req)

	motivo := strings.TrimSpace(req.MotivoVoid)
	if motivo == "" {
		motivo = "Anulación GDS solicitada por el usuario"
	}

	userIDVal, _ := c.Get("userID")
	userIDStr := fmt.Sprintf("%v", userIDVal)
	userUUID, _ := uuid.Parse(userIDStr)

	now := time.Now()
	ticket.Estado = "void"
	ticket.FechaVoid = &now
	ticket.UsuarioVoidID = &userUUID
	ticket.MotivoVoid = &motivo

	// Devolver el lugar al stock es una decisión del usuario, no algo que el
	// sistema infiera solo: un ticket puede ser de un pasajero que no ocupaba
	// lugar (infante) o el void puede ser una corrección administrativa sin
	// impacto real en el cupo — quien voidea es quien sabe cuál de los dos
	// casos es este. "Void informativo" (restore_stock=false) no toca stock.
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&ticket).Error; err != nil {
			return err
		}
		if req.RestoreStock {
			return tx.Model(&models.Product{}).Where("id = ?", ticket.ProductID).
				Updates(map[string]interface{}{
					"disponibilidad": gorm.Expr("CASE WHEN cupo > 0 THEN LEAST(cupo, GREATEST(0, disponibilidad + 1)) ELSE GREATEST(0, disponibilidad + 1) END"),
					"vendidos":       gorm.Expr("GREATEST(0, vendidos - 1)"),
				}).Error
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar la anulación del ticket: " + err.Error()})
		return
	}

	database.DB.Preload("EmisorUser").Preload("VoidUser").First(&ticket, "id = ?", ticket.ID)
	c.JSON(http.StatusOK, ticket)
}

// SyncTicketAtlas intenta enviar o sincronizar la emisión con Netviax Atlas
func SyncTicketAtlas(c *gin.Context) {
	id := c.Param("id")
	var ticket models.Ticket
	if err := database.DB.First(&ticket, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket no encontrado."})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agenciaCaller := services.ResolveAgencyCode(agenciaRaw)

	if role != "admin" && strings.ToLower(ticket.Agencia) != strings.ToLower(agenciaCaller) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para sincronizar este ticket."})
		return
	}

	if ticket.Estado == "void" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se puede sincronizar un ticket anulado (void)."})
		return
	}

	// Actualiza el estado de Atlas
	ticket.AtlasStatus = "enviado"
	ticket.Estado = "enviado_atlas"
	ticket.AtlasResponse = "Sincronizado correctamente con Atlas (" + time.Now().Format(time.RFC3339) + ")"

	if err := database.DB.Save(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar estado de sincronización: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Ticket sincronizado con Netviax Atlas correctamente.",
		"ticket":  ticket,
	})
}

// resolveVendedorEmail busca el email de quien creó la reserva (Reservation.
// CreatedBy) para snapshotearlo en el ticket como "Vendedor" — mismo dato que
// ya resuelve GetReservations (ver reservationWithVendor en order_handler.go)
// pero acá alcanza con un solo lookup por reserva, no un mapa masivo.
func resolveVendedorEmail(createdBy uuid.UUID) string {
	var profile models.Profile
	if err := database.DB.Select("email").First(&profile, "id = ?", createdBy).Error; err != nil {
		return ""
	}
	return profile.Email
}

// upsertTicketForPassenger crea (o completa) el Ticket de UN pasajero puntual
// — nunca a nivel reserva completa. El "¿ya existe?" viejo chequeaba si la
// RESERVA ya tenía algún ticket y, de ser así, se salteaba TODOS los
// pasajeros restantes — un bug real para reservas con emisión escalonada
// (cada pasajero se ticketea en un momento distinto, no todos juntos).
//
// El número real de ticket cargado por el usuario (Reservas/Nóminas →
// "Asignar ticket", ver UpdatePassengerTicket en order_handler.go) es la
// fuente de verdad; el placeholder sintético "045-..." solo se usa si
// todavía no se cargó ninguno (ej. se marcó "Emitido" en bloque antes de
// tipear los números reales de la aerolínea). Si el ticket ya existía con el
// placeholder y ahora llega el número real, lo actualiza en vez de duplicar.
func upsertTicketForPassenger(pax *models.Passenger, res *models.Reservation, product models.Product, vendedorEmail string, userID uuid.UUID) (*models.Ticket, error) {
	paxIDUUID := uuid.NewSHA1(uuid.NameSpaceDNS, []byte(fmt.Sprintf("pax-%d", pax.ID)))
	resIDUUID := uuid.NewSHA1(uuid.NameSpaceDNS, []byte(fmt.Sprintf("res-%d", res.ID)))

	ticketNum := pax.NumeroTicket
	if ticketNum == "" {
		ticketNum = fmt.Sprintf("045-%s-%07d", time.Now().Format("20060102"), pax.ID)
	}

	doc := pax.Documento
	tipoDocumento := "CI"
	if doc == "" {
		doc = pax.Pasaporte
		tipoDocumento = "Pasaporte"
	}
	tipoPasajero := pax.TipoPasajero
	if tipoPasajero == "" {
		tipoPasajero = res.TipoPasajero
	}

	var existing models.Ticket
	err := database.DB.Where("passenger_id = ?", paxIDUUID).First(&existing).Error
	if err == nil {
		needsSave := false
		if existing.NumeroTicket != ticketNum && existing.Estado != "void" {
			existing.NumeroTicket = ticketNum
			needsSave = true
		}
		// Autocura tickets emitidos antes de que existieran estas columnas —
		// no cuesta nada más recalcularlas acá también, la próxima vez que se
		// toque el número de ticket de este pasajero.
		if len(existing.Segmentos) == 0 || string(existing.Segmentos) == "[]" {
			if seg := buildSegmentosJSON(res.VueloRuta); len(seg) > 2 {
				existing.Segmentos = seg
				needsSave = true
			}
		}
		if existing.PedidoID == "" {
			existing.TipoPasajero = tipoPasajero
			existing.TipoDocumento = tipoDocumento
			existing.PedidoID = res.PedidoID
			existing.Vendedor = vendedorEmail
			existing.FechaReserva = &res.CreatedAt
			existing.CarryOn = product.CarryOn
			existing.HandBag = product.HandBag
			existing.CheckedBag = product.CheckedBag
			existing.CarryOnKg = product.CarryOnKg
			existing.HandBagKg = product.HandBagKg
			existing.CheckedBagKg = product.CheckedBagKg
			needsSave = true
		}
		if needsSave {
			if err := database.DB.Save(&existing).Error; err != nil {
				return nil, fmt.Errorf("error actualizando número de ticket del pasajero #%d: %w", pax.ID, err)
			}
		}
		return &existing, nil
	}
	if err != gorm.ErrRecordNotFound {
		log.Printf("upsertTicketForPassenger: error chequeando ticket existente del pasajero #%d: %v", pax.ID, err)
	}

	nombreCompleto := strings.TrimSpace(pax.Nombre + " " + pax.Apellido)
	if nombreCompleto == "" {
		nombreCompleto = res.ContactoNombre
	}

	t := models.Ticket{
		NumeroTicket:      ticketNum,
		ReservationID:     resIDUUID,
		PassengerID:       &paxIDUUID,
		ProductID:         res.ProductID,
		Agencia:           res.Agencia,
		PasajeroNombre:    nombreCompleto,
		PasajeroDocumento: doc,
		PNR:               product.PNR,
		Ruta:              res.VueloRuta,
		Segmentos:         buildSegmentosJSON(res.VueloRuta),
		Destino:           res.VueloDestino,
		Compania:          res.VueloCompania,
		Ficha:             res.FichaVenta,
		Tarifa:            pax.PrecioVenta,
		Impuestos:         0,
		Total:             pax.PrecioVenta,
		Estado:            "emitido",
		FechaEmision:      time.Now(),
		UsuarioEmisorID:   userID,
		AtlasStatus:       "pendiente",
		TipoPasajero:      tipoPasajero,
		TipoDocumento:     tipoDocumento,
		PedidoID:          res.PedidoID,
		Vendedor:          vendedorEmail,
		FechaReserva:      &res.CreatedAt,
		CarryOn:           product.CarryOn,
		HandBag:           product.HandBag,
		CheckedBag:        product.CheckedBag,
		CarryOnKg:         product.CarryOnKg,
		HandBagKg:         product.HandBagKg,
		CheckedBagKg:      product.CheckedBagKg,
	}
	if err := database.DB.Create(&t).Error; err != nil {
		return nil, fmt.Errorf("error creando ticket para pasajero #%d: %w", pax.ID, err)
	}
	return &t, nil
}

// generateReservationLevelTicket es el caso legado: reservas históricas sin
// pasajeros desglosados en la tabla Passenger, donde el único dato de
// pasajero vive en la propia Reservation. No hay forma de distinguir
// CI/Pasaporte acá (Reservation solo tiene un campo DocumentoPasajero), así
// que TipoDocumento queda vacío en vez de asumir uno de los dos.
func generateReservationLevelTicket(res *models.Reservation, product models.Product, vendedorEmail string, userID uuid.UUID) ([]models.Ticket, error) {
	resIDUUID := uuid.NewSHA1(uuid.NameSpaceDNS, []byte(fmt.Sprintf("res-%d", res.ID)))

	var existing models.Ticket
	if err := database.DB.Where("reservation_id = ?", resIDUUID).First(&existing).Error; err == nil {
		return []models.Ticket{existing}, nil
	}

	t := models.Ticket{
		NumeroTicket:      fmt.Sprintf("045-%s-%07d-01", time.Now().Format("20060102"), res.ID),
		ReservationID:     resIDUUID,
		ProductID:         res.ProductID,
		Agencia:           res.Agencia,
		PasajeroNombre:    res.ContactoNombre,
		PasajeroDocumento: res.DocumentoPasajero,
		PNR:               product.PNR,
		Ruta:              res.VueloRuta,
		Segmentos:         buildSegmentosJSON(res.VueloRuta),
		Destino:           res.VueloDestino,
		Compania:          res.VueloCompania,
		Ficha:             res.FichaVenta,
		Tarifa:            res.PrecioVenta,
		Impuestos:         0,
		Total:             res.PrecioVenta,
		Estado:            "emitido",
		FechaEmision:      time.Now(),
		UsuarioEmisorID:   userID,
		AtlasStatus:       "pendiente",
		TipoPasajero:      res.TipoPasajero,
		PedidoID:          res.PedidoID,
		Vendedor:          vendedorEmail,
		FechaReserva:      &res.CreatedAt,
		CarryOn:           product.CarryOn,
		HandBag:           product.HandBag,
		CheckedBag:        product.CheckedBag,
		CarryOnKg:         product.CarryOnKg,
		HandBagKg:         product.HandBagKg,
		CheckedBagKg:      product.CheckedBagKg,
	}
	if err := database.DB.Create(&t).Error; err != nil {
		return nil, fmt.Errorf("no se pudo crear el ticket de la reserva #%d: %w", res.ID, err)
	}
	return []models.Ticket{t}, nil
}

// GenerateTicketsForReservationInternal genera (o completa) los tickets de
// TODOS los pasajeros de una reserva — se llama cuando la reserva completa
// pasa a EstadoInterno="Emitido" (individual o en bloque, ver
// UpdateReservation/BulkUpdateReservations en order_handler.go). Es
// por-pasajero (vía upsertTicketForPassenger), no por-reserva: si algunos
// pasajeros ya tenían ticket (cargado a mano vía "Asignar") y otros no,
// completa solo los que faltan.
func GenerateTicketsForReservationInternal(res *models.Reservation, userID uuid.UUID) ([]models.Ticket, error) {
	if res == nil {
		return nil, fmt.Errorf("reserva nula")
	}

	// El PNR real (código de reserva de la aerolínea, ej. "V9L8SZ") vive en
	// Product.PNR — antes el ticket usaba Reservation.PedidoID (nuestro ID
	// interno de pedido, ej. "PED-2026-...") como si fuera el PNR, que nunca
	// lo fue. Se trae el producto entero (no solo PNR) porque el ticket
	// también snapshotea la franquicia de equipaje al emitir.
	var product models.Product
	database.DB.First(&product, res.ProductID)
	vendedorEmail := resolveVendedorEmail(res.CreatedBy)

	var passengers []models.Passenger
	database.DB.Where("reservation_id = ?", res.ID).Find(&passengers)

	if len(passengers) == 0 {
		return generateReservationLevelTicket(res, product, vendedorEmail, userID)
	}

	var tickets []models.Ticket
	var errs []string
	for _, pax := range passengers {
		t, err := upsertTicketForPassenger(&pax, res, product, vendedorEmail, userID)
		if err != nil {
			log.Printf("GenerateTicketsForReservationInternal: %v", err)
			errs = append(errs, err.Error())
			continue
		}
		tickets = append(tickets, *t)
	}
	if len(tickets) == 0 && len(errs) > 0 {
		return nil, fmt.Errorf("no se pudo crear ningún ticket para la reserva #%d: %s", res.ID, strings.Join(errs, "; "))
	}
	return tickets, nil
}
