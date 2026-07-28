package middleware

import (
	"fmt"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// noisyPaths son endpoints de polling de alta frecuencia cuyas respuestas
// exitosas no aportan valor a "Estado del sistema" y solo generarían ruido.
// Sus errores (>= 400) igual se registran.
var noisyPaths = map[string]bool{
	"/api/notifications/unread-count": true,
}

// RequestLogger persiste una fila en SystemLog por cada request HTTP, para la
// sección de administración de Estado del sistema. Corre como middleware global,
// por lo que c.Next() ejecuta también el middleware de auth y el handler real
// antes de que podamos leer userID/agencia/userName del contexto.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		requestID := fmt.Sprintf("%d", start.UnixNano())
		c.Set("requestID", requestID)

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()
		path := c.Request.URL.Path

		if status < 400 && noisyPaths[path] {
			return
		}

		level := "info"
		if status >= 500 {
			level = "error"
		} else if status >= 400 {
			level = "warning"
		}

		var userID *uuid.UUID
		if v, ok := c.Get("userID"); ok {
			if s, ok := v.(string); ok {
				if uid, err := uuid.Parse(s); err == nil {
					userID = &uid
				}
			}
		}
		agencia, _ := c.Get("agencia")
		agenciaStr, _ := agencia.(string)

		userName := ""
		if v, ok := c.Get("userName"); ok {
			if s, ok := v.(string); ok {
				userName = s
			}
		}
		userEmail := ""
		if v, ok := c.Get("userEmail"); ok {
			if s, ok := v.(string); ok {
				userEmail = s
			}
		}

		// IP del cliente (X-Real-IP > X-Forwarded-For > RemoteAddr)
		ip := c.GetHeader("X-Real-IP")
		if ip == "" {
			ip = c.GetHeader("X-Forwarded-For")
		}
		if ip == "" {
			ip = c.ClientIP()
		}

		message := ""
		if len(c.Errors) > 0 {
			message = c.Errors.String()
		}
		if message == "" && level != "info" {
			message = fmt.Sprintf("%s %s -> %d", c.Request.Method, path, status)
		}

		logEntry := models.SystemLog{
			Level:      level,
			Source:     "http",
			Method:     c.Request.Method,
			Path:       path,
			StatusCode: status,
			Message:    message,
			UserID:     userID,
			UserName:   userName,
			UserEmail:  userEmail,
			Agencia:    agenciaStr,
			IP:         ip,
			RequestID:  requestID,
			DurationMs: duration.Milliseconds(),
		}

		// Best-effort: no debe afectar la respuesta ya enviada al cliente.
		go func() {
			if database.DB != nil {
				database.DB.Create(&logEntry)
			}
		}()
	}
}
