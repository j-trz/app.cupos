package handlers

import (
	"fmt"
	"io"

	"github.com/gin-gonic/gin"
)

func SSEHandler(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	c.Stream(func(w io.Writer) bool {
		// Simular el envío de notificaciones en tiempo real
		// En una implementación real, usaríamos un canal para recibir eventos
		fmt.Fprintf(w, "data: %s\n\n", "Conectado al servidor de notificaciones")
		return true
	})
}
