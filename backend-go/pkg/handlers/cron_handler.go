package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// warningWindow define con cuánta anticipación se avisa antes de que venza un bloqueo temporal.
const warningWindow = 15 * time.Minute

// ExpireReservations expira reservas cuyo bloqueo temporal venció y avisa a las
// que están por vencer. No usa AuthMiddleware (un cron externo no puede generar
// un JWT): se protege con un secreto propio vía header X-Cron-Secret, pensado
// para ser disparado cada 5-15 min por un servicio externo (cron-job.org,
// GitHub Actions con schedule, etc.) ya que el plan de Vercel no garantiza
// crons nativos con esa frecuencia.
func ExpireReservations(c *gin.Context) {
	secret := os.Getenv("CRON_SECRET")
	if secret == "" || c.GetHeader("X-Cron-Secret") != secret {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}

	now := time.Now()
	warned := warnExpiringReservations(now)
	expired := expireOverdueReservations(now)

	c.JSON(http.StatusOK, gin.H{"success": true, "warned": warned, "expired": expired})
}

func warnExpiringReservations(now time.Time) int {
	var reservations []models.Reservation
	soon := now.Add(warningWindow)
	database.DB.Where(
		"estado = ? AND bloqueo_expira_at IS NOT NULL AND bloqueo_expira_at BETWEEN ? AND ? AND expiration_warning_sent_at IS NULL",
		models.EstadoBloqueoTemporal, now, soon,
	).Find(&reservations)

	for i := range reservations {
		r := &reservations[i]
		services.NotifyUser(r.CreatedBy, nil, "warning", "Tu reserva está por vencer",
			fmt.Sprintf("La reserva del pedido %s vence en menos de %d minutos. Confirmala o el cupo se liberará automáticamente.",
				r.PedidoID, int(warningWindow.Minutes())))

		if r.ContactoEmail != "" {
			if err := services.SendTemplateEmail(r.Agencia, "reservation_expiring_soon", r.ContactoEmail, map[string]string{
				"pedido_id":       r.PedidoID,
				"contacto_nombre": r.NombrePasajero,
				"minutos":         fmt.Sprintf("%d", int(warningWindow.Minutes())),
			}); err != nil {
				services.LogFailure("email", fmt.Sprintf("No se pudo enviar aviso de vencimiento para pedido %s: %s", r.PedidoID, err.Error()))
			}
		}

		sentAt := now
		database.DB.Model(&models.Reservation{}).Where("id = ?", r.ID).Update("expiration_warning_sent_at", &sentAt)
	}
	return len(reservations)
}

func expireOverdueReservations(now time.Time) int {
	var reservations []models.Reservation
	database.DB.Where(
		"estado = ? AND bloqueo_expira_at IS NOT NULL AND bloqueo_expira_at <= ?",
		models.EstadoBloqueoTemporal, now,
	).Find(&reservations)

	for i := range reservations {
		r := &reservations[i]

		var passengersCount int64
		database.DB.Model(&models.Passenger{}).Where("reservation_id = ?", r.ID).Count(&passengersCount)
		if passengersCount == 0 {
			passengersCount = 1
		}
		database.DB.Model(&models.Product{}).Where("id = ?", r.ProductID).
			Updates(map[string]interface{}{
				"disponibilidad": gorm.Expr("disponibilidad + ?", passengersCount),
				"vendidos":       gorm.Expr("vendidos - ?", passengersCount),
			})

		database.DB.Model(&models.Reservation{}).Where("id = ?", r.ID).Update("estado", models.EstadoExpirada)

		services.NotifyUser(r.CreatedBy, nil, "warning", "Tu reserva expiró",
			fmt.Sprintf("La reserva del pedido %s expiró por vencimiento del bloqueo temporal y el cupo fue liberado.", r.PedidoID))
		services.NotifyRole("admin", nil, "warning", "Reserva expirada",
			fmt.Sprintf("La reserva del pedido %s (agencia %s) expiró automáticamente por vencimiento de bloqueo", r.PedidoID, r.Agencia))

		if r.ContactoEmail != "" {
			if err := services.SendTemplateEmail(r.Agencia, "reservation_expired", r.ContactoEmail, map[string]string{
				"pedido_id":       r.PedidoID,
				"contacto_nombre": r.NombrePasajero,
			}); err != nil {
				services.LogFailure("email", fmt.Sprintf("No se pudo enviar email de expiración para pedido %s: %s", r.PedidoID, err.Error()))
			}
		}

		database.DB.Create(&models.SystemLog{
			Level:   "warning",
			Source:  "cron",
			Message: fmt.Sprintf("Reserva %d (pedido %s) expiró por vencimiento de bloqueo temporal", r.ID, r.PedidoID),
		})
	}
	return len(reservations)
}
