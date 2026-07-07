package handlers

import (
	"net/http"
	"time"

	"backend-go/internal/database"
	"backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReservationInput struct {
	models.Reservation
	Passengers []models.Passenger `json:"passengers"`
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

	// 3. Preparar reserva
	blockMinutes := product.BloqueoTemporalMinutos
	if blockMinutes <= 0 {
		blockMinutes = 60 // Default
	}
	expiresAt := time.Now().Add(time.Duration(blockMinutes) * time.Minute)
	input.Reservation.BloqueoExpiraAt = &expiresAt
	input.Reservation.Estado = "bloqueo_temporal"

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
		for i := range input.Passengers {
			input.Passengers[i].ReservationID = input.Reservation.ID
			input.Passengers[i].PedidoID = input.Reservation.PedidoID

			// Calcular NRO (Regla: el primero es venta, el resto depende de edad/tipo)
			if i == 0 {
				input.Passengers[i].NRO = 1
			} else {
				// Lógica de "Venta Válida" para acompañantes
				if isVentaValida(&input.Passengers[i], product.FechaRegreso) {
					input.Passengers[i].NRO = 1
				} else {
					input.Passengers[i].NRO = 0
				}
			}

			if err := tx.Create(&input.Passengers[i]).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear pasajeros"})
				return
			}
		}
	}

	tx.Commit()
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

	reservation.Estado = "confirmada"
	database.DB.Save(&reservation)

	c.JSON(http.StatusOK, reservation)
}

func DeleteReservation(c *gin.Context) {
	id := c.Param("id")

	var reservation models.Reservation
	if err := database.DB.First(&reservation, id).Error; err == nil {
		// Devolver disponibilidad
		var passengersCount int64
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Count(&passengersCount)
		if passengersCount == 0 {
			passengersCount = 1
		}

		database.DB.Model(&models.Product{}).Where("id = ?", reservation.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": database.DB.Raw("disponibilidad + ?", passengersCount),
				"vendidos":       database.DB.Raw("vendidos - ?", passengersCount),
			})
	}

	if err := database.DB.Delete(&models.Reservation{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar la reserva."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Reserva eliminada."})
}
