package handlers

import (
	"fmt"
	"net/http"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PassengerInput acepta nacimiento como string "YYYY-MM-DD" o RFC3339
type PassengerInput struct {
	Nombre       string `json:"nombre"`
	Apellido     string `json:"apellido"`
	Documento    string `json:"documento"`
	Nacimiento   string `json:"nacimiento"` // "1994-10-20" o "1994-10-20T00:00:00Z"
	Nacionalidad string `json:"nacionalidad"`
	TipoPasajero string `json:"tipo_pasajero"`
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
	userAgencia, _ := c.Get("agencia")

	if userIDStr != nil {
		if uid, err := uuid.Parse(userIDStr.(string)); err == nil {
			input.Reservation.CreatedBy = uid
		}
	}

	// Forzar la agencia del usuario si no es admin
	if role != "admin" && userAgencia != nil {
		input.Reservation.Agencia = userAgencia.(string)
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

	// Poblar campos del pasajero principal desde passengers[0] si no vienen en el body raíz
	if len(input.Passengers) > 0 && input.Reservation.NombrePasajero == "" {
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

	if err := tx.Create(&input.Reservation).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la reserva"})
		return
	}

	// 4. Insertar pasajeros
	if len(input.Passengers) > 0 {
		for i, pi := range input.Passengers {
			pax := toPassengerModel(pi)
			pax.ReservationID = input.Reservation.ID
			pax.PedidoID = input.Reservation.PedidoID

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

func GetAllReservations(c *gin.Context) {
	var reservations []models.Reservation
	role, _ := c.Get("role")
	agencia, _ := c.Get("agencia")

	query := database.DB
	if role == "agency_admin" {
		query = query.Where("agencia = ?", agencia)
	} else if role != "admin" {
		userID, _ := c.Get("userID")
		query = query.Where("created_by = ?", userID)
	}

	query.Order("created_at desc").Find(&reservations)
	c.JSON(http.StatusOK, reservations)
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

	// No permitir cambiar campos críticos via update general
	delete(input, "id")
	delete(input, "created_by")
	delete(input, "created_at")

	if err := database.DB.Model(&reservation).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar la reserva."})
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
