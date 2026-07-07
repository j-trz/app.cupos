package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetBackup(c *gin.Context) {
	// En una implementación real, se generaría un dump de SQL
	// Por ahora simulamos la respuesta de éxito
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Backup generado correctamente (Simulado)",
	})
}
