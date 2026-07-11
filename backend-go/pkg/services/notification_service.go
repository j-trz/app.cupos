package services

import (
	"strings"

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

// resolveNotificationTemplate busca la NotificationTemplate de la agencia por
// code; si no existe usa la plantilla global (agency_id IS NULL) con ese
// mismo code. Devuelve ok=false si nadie la personalizó todavía.
func resolveNotificationTemplate(agencyCode, code string) (*models.NotificationTemplate, bool) {
	var tpl models.NotificationTemplate

	if agencyCode != "" {
		if agency, err := FindAgencyByCodeOrName(agencyCode); err == nil {
			if err := database.DB.Where("code = ? AND agency_id = ?", code, agency.ID).First(&tpl).Error; err == nil {
				return &tpl, true
			}
		}
	}

	if err := database.DB.Where("code = ? AND agency_id IS NULL", code).First(&tpl).Error; err == nil {
		return &tpl, true
	}
	return nil, false
}

func renderPlaceholders(text string, data map[string]string) string {
	for k, v := range data {
		text = strings.ReplaceAll(text, "{{"+k+"}}", v)
	}
	return text
}

// ResolveNotificationText resuelve el título/mensaje/icono/color/prioridad a
// usar para una notificación de tipo `code`: si un admin personalizó una
// NotificationTemplate (global o de la agencia dada), la usa (con los
// placeholders {{clave}} de data reemplazados); si no, cae a
// defaultTitle/defaultMessage (el texto que el call site ya armaba antes de
// que existiera este sistema), para que ninguna notificación se rompa por
// falta de seed. icon/color/priority quedan vacíos si no hay plantilla
// personalizada, y createNotification les aplica sus defaults de siempre.
func ResolveNotificationText(agencyCode, code, defaultTitle, defaultMessage string, data map[string]string) (title, message, icon, color, priority string) {
	if tpl, ok := resolveNotificationTemplate(agencyCode, code); ok {
		return renderPlaceholders(tpl.Title, data), renderPlaceholders(tpl.Message, data), tpl.Icon, tpl.Color, tpl.Priority
	}
	return defaultTitle, defaultMessage, "", "", ""
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

// Las siguientes *ByCode envuelven las notificaciones de arriba resolviendo
// primero una NotificationTemplate editable por el admin (ver
// notification_templates_handler.go); si nadie la personalizó, usan
// defaultTitle/defaultMessage tal como el call site los armaba antes de que
// existiera este sistema, así el comportamiento no cambia hasta que alguien
// realmente edite una plantilla.

// NotifyUserByCode notifica a un usuario puntual, con plantilla editable
// scopeada a agencyCode (o global si no hay override de esa agencia).
func NotifyUserByCode(userID uuid.UUID, createdBy *uuid.UUID, agencyCode, code, defaultTitle, defaultMessage string, data map[string]string) {
	title, message, icon, color, priority := ResolveNotificationText(agencyCode, code, defaultTitle, defaultMessage, data)
	createNotification(models.Notification{
		Type: code, Title: title, Message: message, Icon: icon, Color: color, Priority: priority,
		TargetUserID: &userID, CreatedBy: createdBy,
	})
}

// NotifyRoleByCode notifica a todos los usuarios de un rol (siempre con la
// plantilla global — un aviso a "todos los admin" no depende de una agencia).
func NotifyRoleByCode(role string, createdBy *uuid.UUID, code, defaultTitle, defaultMessage string, data map[string]string) {
	title, message, icon, color, priority := ResolveNotificationText("", code, defaultTitle, defaultMessage, data)
	createNotification(models.Notification{
		Type: code, Title: title, Message: message, Icon: icon, Color: color, Priority: priority,
		TargetRole: role, CreatedBy: createdBy,
	})
}

// NotifyAgencyByCode notifica a todos los usuarios de agencyCode, con
// plantilla editable scopeada a esa misma agencia.
func NotifyAgencyByCode(agencyCode string, createdBy *uuid.UUID, code, defaultTitle, defaultMessage string, data map[string]string) {
	if agencyCode == "" {
		return
	}
	title, message, icon, color, priority := ResolveNotificationText(agencyCode, code, defaultTitle, defaultMessage, data)
	createNotification(models.Notification{
		Type: code, Title: title, Message: message, Icon: icon, Color: color, Priority: priority,
		TargetAgency: agencyCode, CreatedBy: createdBy,
	})
}

// NotifyBroadcastByCode notifica a todo el sistema, con la plantilla global.
func NotifyBroadcastByCode(createdBy *uuid.UUID, code, defaultTitle, defaultMessage string, data map[string]string) {
	title, message, icon, color, priority := ResolveNotificationText("", code, defaultTitle, defaultMessage, data)
	createNotification(models.Notification{
		Type: code, Title: title, Message: message, Icon: icon, Color: color, Priority: priority,
		CreatedBy: createdBy,
	})
}

// LogFailure registra un evento en SystemLog desde código que no tiene acceso
// a un *gin.Context (ej. el cron, o los triggers de negocio tras enviar un
// email). Best-effort: si esto falla no hay nada más que hacer.
//
// message debe ser una frase en español entendible por un admin sin
// conocimiento técnico (sin texto de errores de Go/red/SMTP); details es
// donde va el error técnico crudo (err.Error()), oculto por defecto detrás
// de un "Ver detalle técnico" en LogsDelSitio.jsx.
func LogFailure(source, message, details string) {
	database.DB.Create(&models.SystemLog{
		Level:   "error",
		Source:  source,
		Message: message,
		Details: details,
	})
}
