package handlers

import (
	"io"
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SSE (mantener existente)
func SSEHandler(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	c.Stream(func(w io.Writer) bool {
		return false // serverless: no long-lived connections
	})
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

func GetNotifications(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	notifications := make([]models.Notification, 0)

	query := database.DB.Where("is_hidden = false").
		Where("target_user_id = ? OR target_role = ? OR (target_user_id IS NULL AND target_role = '')", userID, role)

	if c.Query("onlyUnread") == "true" {
		query = query.Where("is_read = false")
	}

	limit := 50
	query.Order("created_at desc").Limit(limit).Find(&notifications)

	c.JSON(http.StatusOK, gin.H{"success": true, "notifications": notifications})
}

func GetUnreadCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	var count int64
	database.DB.Model(&models.Notification{}).
		Where("is_read = false AND is_hidden = false").
		Where("target_user_id = ? OR target_role = ? OR (target_user_id IS NULL AND target_role = '')", userID, role).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"success": true, "unreadCount": count})
}

func MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	database.DB.Model(&models.Notification{}).Where("id = ?", id).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func MarkAllNotificationsRead(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	database.DB.Model(&models.Notification{}).
		Where("target_user_id = ? OR target_role = ? OR (target_user_id IS NULL AND target_role = '')", userID, role).
		Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Todas las notificaciones marcadas como leídas"})
}

func HideNotification(c *gin.Context) {
	id := c.Param("id")
	database.DB.Model(&models.Notification{}).Where("id = ?", id).Update("is_hidden", true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func CreateNotification(c *gin.Context) {
	var notification models.Notification
	if err := c.ShouldBindJSON(&notification); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	notification.ID = uuid.New()

	createdByVal, _ := c.Get("userID")
	if uid, ok := createdByVal.(uuid.UUID); ok {
		notification.CreatedBy = &uid
	}

	if notification.Icon == "" {
		notification.Icon = "📢"
	}
	if notification.Color == "" {
		notification.Color = "blue"
	}
	if notification.Priority == "" {
		notification.Priority = "medium"
	}

	database.DB.Create(&notification)
	c.JSON(http.StatusCreated, gin.H{"success": true, "notificationId": notification.ID})
}

func DeleteNotification(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Notification{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"success": true})
}
