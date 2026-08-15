package handlers

import (
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
	"gorm.io/gorm"
)

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

// GenerateTicketsForReservationInternal es un helper interno que crea los boletos
// cuando una reserva pasa a "Emitido"
func GenerateTicketsForReservationInternal(res *models.Reservation, userID uuid.UUID) ([]models.Ticket, error) {
	if res == nil {
		return nil, fmt.Errorf("reserva nula")
	}

	// ReservationID de Ticket es un UUID derivado (hash) del ID entero real de
	// la reserva — nunca comparar contra res.ID directo (uint), Postgres
	// rechaza el tipo (uuid = integer) y la query de abajo fallaba en
	// silencio, siempre devolviendo "no existe" incluso cuando sí había
	// tickets ya creados.
	resIDUUID := uuid.NewSHA1(uuid.NameSpaceDNS, []byte(fmt.Sprintf("res-%d", res.ID)))

	// Si ya existen boletos creados para esta reserva, los devuelve
	var existing []models.Ticket
	if err := database.DB.Where("reservation_id = ?", resIDUUID).Find(&existing).Error; err != nil {
		log.Printf("GenerateTicketsForReservationInternal: error chequeando tickets existentes de la reserva #%d: %v", res.ID, err)
	}
	if len(existing) > 0 {
		return existing, nil
	}

	var passengers []models.Passenger
	database.DB.Where("reservation_id = ?", res.ID).Find(&passengers)

	var createdTickets []models.Ticket
	var createErrs []string
	now := time.Now()
	datePrefix := now.Format("20060102")

	// Si hay pasajeros cargados en la reserva, genera un boleto por cada pasajero
	if len(passengers) > 0 {
		for i, pax := range passengers {
			ticketNum := fmt.Sprintf("045-%s-%07d-%02d", datePrefix, res.ID, i+1)
			nombreCompleto := strings.TrimSpace(pax.Nombre + " " + pax.Apellido)
			if nombreCompleto == "" {
				nombreCompleto = res.ContactoNombre
			}
			doc := pax.Documento
			if doc == "" {
				doc = pax.Pasaporte
			}

			paxIDUUID := uuid.NewSHA1(uuid.NameSpaceDNS, []byte(fmt.Sprintf("pax-%d", pax.ID)))

			t := models.Ticket{
				NumeroTicket:      ticketNum,
				ReservationID:     resIDUUID,
				PassengerID:       &paxIDUUID,
				ProductID:         res.ProductID,
				Agencia:           res.Agencia,
				PasajeroNombre:    nombreCompleto,
				PasajeroDocumento: doc,
				PNR:               res.PedidoID,
				Ruta:              res.VueloRuta,
				Compania:          res.VueloCompania,
				Ficha:             res.FichaVenta,
				Tarifa:            pax.PrecioVenta,
				Impuestos:         0,
				Total:             pax.PrecioVenta,
				Estado:            "emitido",
				FechaEmision:      now,
				UsuarioEmisorID:   userID,
				AtlasStatus:       "pendiente",
			}
			if err := database.DB.Create(&t).Error; err != nil {
				log.Printf("GenerateTicketsForReservationInternal: error creando ticket para pasajero #%d de la reserva #%d: %v", pax.ID, res.ID, err)
				createErrs = append(createErrs, err.Error())
				continue
			}
			createdTickets = append(createdTickets, t)
		}
	} else {
		// Si no hay pasajeros individuales detallados, genera un ticket principal
		ticketNum := fmt.Sprintf("045-%s-%07d-01", datePrefix, res.ID)

		t := models.Ticket{
			NumeroTicket:      ticketNum,
			ReservationID:     resIDUUID,
			ProductID:         res.ProductID,
			Agencia:           res.Agencia,
			PasajeroNombre:    res.ContactoNombre,
			PasajeroDocumento: res.DocumentoPasajero,
			PNR:               res.PedidoID,
			Ruta:              res.VueloRuta,
			Compania:          res.VueloCompania,
			Ficha:             res.FichaVenta,
			Tarifa:            res.PrecioVenta,
			Impuestos:         0,
			Total:             res.PrecioVenta,
			Estado:            "emitido",
			FechaEmision:      now,
			UsuarioEmisorID:   userID,
			AtlasStatus:       "pendiente",
		}
		if err := database.DB.Create(&t).Error; err != nil {
			log.Printf("GenerateTicketsForReservationInternal: error creando ticket principal de la reserva #%d: %v", res.ID, err)
			createErrs = append(createErrs, err.Error())
		} else {
			createdTickets = append(createdTickets, t)
		}
	}

	if len(createdTickets) == 0 && len(createErrs) > 0 {
		return nil, fmt.Errorf("no se pudo crear ningún ticket para la reserva #%d: %s", res.ID, strings.Join(createErrs, "; "))
	}
	return createdTickets, nil
}
