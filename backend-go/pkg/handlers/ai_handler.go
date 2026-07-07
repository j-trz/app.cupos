package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────

type ChatRequest struct {
	Message    string `json:"message"`
	SessionID  string `json:"sessionId"`
	ProviderID string `json:"providerId"`
}

func Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mensaje requerido"})
		return
	}

	// Obtener proveedor: por ID o el default activo
	var provider models.AIProvider
	if req.ProviderID != "" {
		if err := database.DB.First(&provider, "id = ? AND is_active = true", req.ProviderID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Proveedor no encontrado"})
			return
		}
	} else {
		// Buscar primero is_default=true, luego cualquier activo
		if err := database.DB.Where("is_active = true AND is_default = true").First(&provider).Error; err != nil {
			if err := database.DB.Where("is_active = true").First(&provider).Error; err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"error": "No hay ningún proveedor de IA configurado y activo"})
				return
			}
		}
	}

	if provider.APIKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "El proveedor no tiene API Key configurada"})
		return
	}

	content, err := callProvider(provider, req.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log del mensaje
	userIDVal, _ := c.Get("userID")
	if userID, ok := userIDVal.(uuid.UUID); ok {
		sessionID := uuid.Nil
		if req.SessionID != "" {
			sessionID, _ = uuid.Parse(req.SessionID)
		}
		database.DB.Create(&models.AIMessage{
			ID: uuid.New(), SessionID: sessionID, UserID: userID,
			Role: "user", Content: req.Message,
		})
		database.DB.Create(&models.AIMessage{
			ID: uuid.New(), SessionID: sessionID, UserID: userID,
			Role: "assistant", Content: content,
		})
	}

	c.JSON(http.StatusOK, gin.H{"role": "assistant", "content": content})
}

// callProvider despacha al proveedor correcto según el type
func callProvider(p models.AIProvider, message string) (string, error) {
	switch p.ProviderType {
	case "anthropic":
		return callAnthropic(p, message)
	case "google":
		return callGoogle(p, message)
	default: // openai, azure, local/ollama
		return callOpenAI(p, message)
	}
}

func callOpenAI(p models.AIProvider, message string) (string, error) {
	baseURL := p.APIEndpoint
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	model := p.DefaultModel
	if model == "" {
		model = "gpt-4o"
	}

	body, _ := json.Marshal(map[string]interface{}{
		"model":      model,
		"messages":   []map[string]string{{"role": "user", "content": message}},
		"max_tokens": p.MaxTokens,
		"temperature": p.Temperature,
	})

	req, _ := http.NewRequest("POST", baseURL+"/chat/completions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error conectando con OpenAI: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("OpenAI error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil || len(result.Choices) == 0 {
		return "", fmt.Errorf("respuesta inválida de OpenAI")
	}
	return result.Choices[0].Message.Content, nil
}

func callAnthropic(p models.AIProvider, message string) (string, error) {
	model := p.DefaultModel
	if model == "" {
		model = "claude-3-5-sonnet-20241022"
	}
	maxTokens := p.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	body, _ := json.Marshal(map[string]interface{}{
		"model":      model,
		"max_tokens": maxTokens,
		"messages":   []map[string]string{{"role": "user", "content": message}},
	})

	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error conectando con Anthropic: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Anthropic error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil || len(result.Content) == 0 {
		return "", fmt.Errorf("respuesta inválida de Anthropic")
	}
	return result.Content[0].Text, nil
}

func callGoogle(p models.AIProvider, message string) (string, error) {
	model := p.DefaultModel
	if model == "" {
		model = "gemini-1.5-flash"
	}

	body, _ := json.Marshal(map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": message}}},
		},
	})

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, p.APIKey)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error conectando con Google AI: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Google AI error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil || len(result.Candidates) == 0 {
		return "", fmt.Errorf("respuesta inválida de Google AI")
	}
	return result.Candidates[0].Content.Parts[0].Text, nil
}

// ─────────────────────────────────────────────
// PROVIDERS CRUD
// ─────────────────────────────────────────────

func ListAIProviders(c *gin.Context) {
	providers := make([]models.AIProvider, 0)
	database.DB.Find(&providers)
	// Ocultar API keys en el listado
	for i := range providers {
		if providers[i].APIKey != "" {
			providers[i].APIKey = "••••••••"
		}
	}
	c.JSON(http.StatusOK, gin.H{"providers": providers})
}

func CreateAIProvider(c *gin.Context) {
	var provider models.AIProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	provider.ID = uuid.New()
	// Si is_default, quitar default a los otros
	if provider.IsDefault {
		database.DB.Model(&models.AIProvider{}).Where("is_default = true").Update("is_default", false)
	}
	database.DB.Create(&provider)
	provider.APIKey = "••••••••"
	c.JSON(http.StatusCreated, provider)
}

func UpdateAIProvider(c *gin.Context) {
	id := c.Param("id")
	var existing models.AIProvider
	if err := database.DB.First(&existing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proveedor no encontrado"})
		return
	}

	var updates models.AIProvider
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Mantener API key existente si no se envía nueva
	if updates.APIKey == "" || updates.APIKey == "••••••••" {
		updates.APIKey = existing.APIKey
	}
	updates.ID = existing.ID

	if updates.IsDefault {
		database.DB.Model(&models.AIProvider{}).Where("id != ? AND is_default = true", id).Update("is_default", false)
	}

	database.DB.Save(&updates)
	updates.APIKey = "••••••••"
	c.JSON(http.StatusOK, updates)
}

func DeleteAIProvider(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.AIProvider{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Proveedor eliminado"})
}

func TestAIProvider(c *gin.Context) {
	id := c.Param("id")
	var provider models.AIProvider
	if err := database.DB.First(&provider, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proveedor no encontrado"})
		return
	}
	if provider.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay API Key configurada"})
		return
	}
	response, err := callProvider(provider, "Responde con exactamente estas palabras: 'Conexión exitosa'")
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "response": response})
}

// ─────────────────────────────────────────────
// ACTIONS CRUD
// ─────────────────────────────────────────────

func ListAIActions(c *gin.Context) {
	actions := make([]models.AIAction, 0)
	database.DB.Find(&actions)
	c.JSON(http.StatusOK, gin.H{"actions": actions})
}

func CreateAIAction(c *gin.Context) {
	var action models.AIAction
	if err := c.ShouldBindJSON(&action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	action.ID = uuid.New()
	database.DB.Create(&action)
	c.JSON(http.StatusCreated, action)
}

func UpdateAIAction(c *gin.Context) {
	id := c.Param("id")
	var action models.AIAction
	if err := database.DB.First(&action, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Acción no encontrada"})
		return
	}
	if err := c.ShouldBindJSON(&action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&action)
	c.JSON(http.StatusOK, action)
}

func DeleteAIAction(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.AIAction{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Acción eliminada"})
}

// ─────────────────────────────────────────────
// SESSIONS / STATS / LOGS
// ─────────────────────────────────────────────

func ListAISessions(c *gin.Context) {
	sessions := make([]models.AISession, 0)
	database.DB.Find(&sessions)
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

func GetAIStats(c *gin.Context) {
	days := 30
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil {
			days = v
		}
	}
	since := time.Now().AddDate(0, 0, -days)

	var totalMessages int64
	var totalSessions int64
	database.DB.Model(&models.AIMessage{}).Where("created_at >= ?", since).Count(&totalMessages)
	database.DB.Model(&models.AISession{}).Where("created_at >= ?", since).Count(&totalSessions)

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"total_messages": totalMessages,
			"total_sessions": totalSessions,
			"tokens":         gin.H{"total_tokens": 0},
			"provider_usage": []interface{}{},
		},
	})
}

func GetAILogs(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			limit = v
		}
	}

	logs := make([]models.AIMessage, 0)
	database.DB.Order("created_at desc").Limit(limit).Find(&logs)
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}
