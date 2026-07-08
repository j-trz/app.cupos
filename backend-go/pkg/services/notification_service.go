package services

import (
	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/google/uuid"
)

// LowAvailabilityThreshold define a partir de qué disponibilidad restante
// se avisa a los administradores de "baja disponibilidad" en un producto.
const LowAvailabilityThreshold = 5

func createNotification(n models.Notification) {
	if n.Icon == "" {
		n.Icon = "📢"
	}
	if n.Color == "" {
		n.Color = "blue"
	}
	if n.Priority == "" {
		n.Priority = "medium"
	}
	database.DB.Create(&n)
}

// NotifyUser notifica a un usuario puntual.
func NotifyUser(userID uuid.UUID, createdBy *uuid.UUID, notifType, title, message string) {
	createNotification(models.Notification{
		Type:         notifType,
		Title:        title,
		Message:      message,
		TargetUserID: &userID,
		CreatedBy:    createdBy,
	})
}

// NotifyRole notifica a todos los usuarios con un rol dado (ej. "admin").
func NotifyRole(role string, createdBy *uuid.UUID, notifType, title, message string) {
	createNotification(models.Notification{
		Type:       notifType,
		Title:      title,
		Message:    message,
		TargetRole: role,
		CreatedBy:  createdBy,
	})
}

// NotifyAgency notifica a todos los usuarios de una agencia (por código de agencia).
func NotifyAgency(agencyCode string, createdBy *uuid.UUID, notifType, title, message string) {
	if agencyCode == "" {
		return
	}
	createNotification(models.Notification{
		Type:         notifType,
		Title:        title,
		Message:      message,
		TargetAgency: agencyCode,
		CreatedBy:    createdBy,
	})
}

// NotifyBroadcast notifica a todos los usuarios del sistema.
func NotifyBroadcast(createdBy *uuid.UUID, notifType, title, message string) {
	createNotification(models.Notification{
		Type:      notifType,
		Title:     title,
		Message:   message,
		CreatedBy: createdBy,
	})
}

// LogFailure registra un evento en SystemLog desde código que no tiene acceso
// a un *gin.Context (ej. el cron, o los triggers de negocio tras enviar un
// email). Best-effort: si esto falla no hay nada más que hacer.
func LogFailure(source, message string) {
	database.DB.Create(&models.SystemLog{
		Level:   "error",
		Source:  source,
		Message: message,
	})
}
