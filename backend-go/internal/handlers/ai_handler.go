package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Chat(c *gin.Context) {
	// Simular interacción con IA
	c.JSON(http.StatusOK, gin.H{
		"role":    "assistant",
		"content": "Soy tu asistente IA en Go. ¿En qué puedo ayudarte hoy?",
	})
}

func ListAIProviders(c *gin.Context) {
	// Aquí se listarían de la DB
	c.JSON(http.StatusOK, gin.H{"providers": []string{"OpenAI", "Anthropic"}})
}
