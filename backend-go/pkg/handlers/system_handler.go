package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
)

// ──────────────────────────────────────────────────────────────────────────────
// Tipos de respuesta
// ──────────────────────────────────────────────────────────────────────────────

// SystemStatusResponse es la respuesta completa del endpoint de estado del sistema.
type SystemStatusResponse struct {
	Timestamp   string          `json:"timestamp"`
	Database    DBStatus        `json:"database"`
	Services    []ServiceStatus `json:"services"`
	Counts      SystemCounts    `json:"counts"`
	ActiveHolds []HoldDetail    `json:"active_holds"`
	StuckHolds  []HoldDetail    `json:"stuck_holds"`
}

type DBStatus struct {
	Connected bool   `json:"connected"`
	LatencyMs int64  `json:"latency_ms"`
	Error     string `json:"error,omitempty"`
}

type ServiceStatus struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // "ok" | "degraded" | "error"
	Details string `json:"details,omitempty"`
}

type SystemCounts struct {
	TotalProducts     int64 `json:"total_products"`
	TotalReservations int64 `json:"total_reservations"`
	TotalConfirmed    int64 `json:"total_confirmed"`
	TotalBlocked      int64 `json:"total_blocked"`
	TotalHoldTemp     int64 `json:"total_hold_temp"`
	TotalExpired      int64 `json:"total_expired"`
	TotalCancelled    int64 `json:"total_cancelled"`
	TotalUsers        int64 `json:"total_users"`
	TotalLogs         int64 `json:"total_logs"`
	TotalErrorLogs    int64 `json:"total_error_logs"`
}

type HoldDetail struct {
	ReservationID   uint       `json:"reservation_id"`
	PedidoID        string     `json:"pedido_id"`
	Estado          string     `json:"estado"`
	ProductoID      uint       `json:"producto_id"`
	Destino         string     `json:"destino"`
	CodigoCupo      string     `json:"codigo_cupo"`
	Agencia         string     `json:"agencia"`
	ContactoNombre  string     `json:"contacto_nombre"`
	ContactoEmail   string     `json:"contacto_email"`
	HoldPassengers  int        `json:"hold_passengers"`
	BloqueoExpiraAt *time.Time `json:"bloqueo_expira_at"`
	MinutesAgo      float64    `json:"minutes_ago"`
	IsExpired       bool       `json:"is_expired"`
	CreatedAt       time.Time  `json:"created_at"`
}

// ──────────────────────────────────────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────────────────────────────────────

// GetSystemStatus devuelve el diagnóstico completo del sistema: salud de la
// base de datos, estado de servicios, conteos de entidades clave, lista de
// holds activos y holds estancados (expirados sin cerrarse).
func GetSystemStatus(c *gin.Context) {
	now := time.Now()
	resp := SystemStatusResponse{
		Timestamp: now.UTC().Format(time.RFC3339),
		Services:  []ServiceStatus{},
	}

	// ── Base de datos ─────────────────────────────────────────────────────────
	sqlDB, dbErr := database.DB.DB()
	if dbErr != nil {
		resp.Database = DBStatus{Connected: false, Error: dbErr.Error()}
	} else {
		pingStart := time.Now()
		pingErr := sqlDB.Ping()
		latency := time.Since(pingStart).Milliseconds()
		if pingErr != nil {
			resp.Database = DBStatus{Connected: false, LatencyMs: latency, Error: pingErr.Error()}
		} else {
			resp.Database = DBStatus{Connected: true, LatencyMs: latency}
		}
	}

	// ── Servicios ─────────────────────────────────────────────────────────────
	// API Go: si llegamos acá, el servidor corre
	resp.Services = append(resp.Services, ServiceStatus{
		Name:    "API Go",
		Status:  "ok",
		Details: "Servidor HTTP activo y respondiendo",
	})

	// SMTP: verificar variables de entorno
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		resp.Services = append(resp.Services, ServiceStatus{
			Name:    "SMTP / Email",
			Status:  "degraded",
			Details: "Variable SMTP_HOST no configurada en el entorno",
		})
	} else {
		resp.Services = append(resp.Services, ServiceStatus{
			Name:    "SMTP / Email",
			Status:  "ok",
			Details: "Host configurado: " + smtpHost,
		})
	}

	// IA: verificar variables de entorno
	aiKey := os.Getenv("GEMINI_API_KEY")
	if aiKey == "" {
		aiKey = os.Getenv("OPENAI_API_KEY")
	}
	if aiKey == "" {
		resp.Services = append(resp.Services, ServiceStatus{
			Name:    "Asistente IA",
			Status:  "degraded",
			Details: "API Key de IA no configurada en el entorno",
		})
	} else {
		resp.Services = append(resp.Services, ServiceStatus{
			Name:    "Asistente IA",
			Status:  "ok",
			Details: "API Key configurada",
		})
	}

	// ── Conteos ───────────────────────────────────────────────────────────────
	var counts SystemCounts
	database.DB.Model(&models.Product{}).Count(&counts.TotalProducts)
	database.DB.Model(&models.Reservation{}).Count(&counts.TotalReservations)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoConfirmada).Count(&counts.TotalConfirmed)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoBloqueoTemporal).Count(&counts.TotalBlocked)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoHoldTemporal).Count(&counts.TotalHoldTemp)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoExpirada).Count(&counts.TotalExpired)
	database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoCancelada).Count(&counts.TotalCancelled)
	database.DB.Model(&models.Profile{}).Count(&counts.TotalUsers)
	database.DB.Model(&models.SystemLog{}).Count(&counts.TotalLogs)
	database.DB.Model(&models.SystemLog{}).Where("level = ?", "error").Count(&counts.TotalErrorLogs)
	resp.Counts = counts

	// ── Holds activos (no expirados) ─────────────────────────────────────────
	var activeReservations []models.Reservation
	database.DB.Preload("Product").
		Where("estado IN (?, ?) AND (bloqueo_expira_at IS NULL OR bloqueo_expira_at > ?)",
			models.EstadoBloqueoTemporal, models.EstadoHoldTemporal, now).
		Order("created_at desc").
		Limit(100).
		Find(&activeReservations)
	resp.ActiveHolds = buildHoldDetails(activeReservations, now)

	// ── Holds estancados (expirados pero aún en estado temporal) ─────────────
	var stuckReservations []models.Reservation
	database.DB.Preload("Product").
		Where("estado IN (?, ?) AND bloqueo_expira_at < ?",
			models.EstadoBloqueoTemporal, models.EstadoHoldTemporal, now).
		Where("created_at > ?", now.Add(-48*time.Hour)). // últimas 48h
		Order("bloqueo_expira_at asc").
		Limit(50).
		Find(&stuckReservations)
	resp.StuckHolds = buildHoldDetails(stuckReservations, now)

	c.JSON(http.StatusOK, resp)
}

// buildHoldDetails convierte Reservations en HoldDetails legibles para el frontend.
func buildHoldDetails(reservations []models.Reservation, now time.Time) []HoldDetail {
	details := make([]HoldDetail, 0, len(reservations))
	for _, r := range reservations {
		minutesAgo := now.Sub(r.CreatedAt).Minutes()
		isExpired := r.BloqueoExpiraAt != nil && r.BloqueoExpiraAt.Before(now)

		hd := HoldDetail{
			ReservationID:   r.ID,
			PedidoID:        r.PedidoID,
			Estado:          r.Estado,
			ProductoID:      r.ProductID,
			Agencia:         r.Agencia,
			ContactoNombre:  r.ContactoNombre,
			ContactoEmail:   r.ContactoEmail,
			HoldPassengers:  r.HoldPassengerCount,
			BloqueoExpiraAt: r.BloqueoExpiraAt,
			IsExpired:       isExpired,
			MinutesAgo:      minutesAgo,
			CreatedAt:       r.CreatedAt,
		}
		if r.Product.ID > 0 {
			hd.Destino = r.Product.Destino
			hd.CodigoCupo = r.Product.CodigoCupo
		}
		details = append(details, hd)
	}
	return details
}

// AdminReleaseHold permite a un admin liberar/cancelar manualmente un hold
// estancado, devolviendo el stock al producto correspondiente.
func AdminReleaseHold(c *gin.Context) {
	reservationIDStr := c.Param("id")

	var reservation models.Reservation
	if err := database.DB.Preload("Product").First(&reservation, reservationIDStr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reserva no encontrada"})
		return
	}

	if reservation.Estado != models.EstadoBloqueoTemporal && reservation.Estado != models.EstadoHoldTemporal {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Solo se pueden liberar reservas en estado bloqueo_temporal o hold_temporal",
		})
		return
	}

	// Cuántos asientos devolver
	passengersToReturn := reservation.HoldPassengerCount
	if passengersToReturn == 0 {
		var paxCount int64
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", reservation.ID).Count(&paxCount)
		passengersToReturn = int(paxCount)
		if passengersToReturn == 0 {
			passengersToReturn = 1
		}
	}

	// Transacción: expirar reserva + devolver stock
	tx := database.DB.Begin()

	if err := tx.Model(&reservation).Updates(map[string]interface{}{
		"estado":            models.EstadoExpirada,
		"bloqueo_expira_at": time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar la reserva"})
		return
	}

	if err := tx.Exec(
		"UPDATE products SET disponibilidad = disponibilidad + ? WHERE id = ?",
		passengersToReturn, reservation.ProductID,
	).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al restaurar disponibilidad"})
		return
	}

	tx.Commit()

	// Registrar evento en log
	adminNameRaw, _ := c.Get("userName")
	adminNameStr, _ := adminNameRaw.(string)
	go func() {
		if database.DB != nil {
			database.DB.Create(&models.SystemLog{
				Level:   "warning",
				Source:  "admin",
				Method:  "POST",
				Path:    "/api/system/holds/" + reservationIDStr + "/release",
				Message: fmt.Sprintf("Hold liberado manualmente por admin: %s", adminNameStr),
				Details: fmt.Sprintf("PedidoID=%s ProductoID=%d PasajerosDevueltos=%d", reservation.PedidoID, reservation.ProductID, passengersToReturn),
			})
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":             "Hold liberado exitosamente",
		"reservation_id":      reservation.ID,
		"pedido_id":           reservation.PedidoID,
		"passengers_returned": passengersToReturn,
		"product_id":          reservation.ProductID,
	})
}
