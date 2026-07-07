package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ChatRequest struct {
	Message     string `json:"message"`
	SessionID   string `json:"sessionId"`
	ProviderID  string `json:"providerId"`
	ImageBase64 string `json:"imageBase64"` // base64 sin prefijo data:...
	ImageMime   string `json:"imageMime"`   // "image/jpeg", "image/png", etc.
}

type userCtx struct {
	ID      uuid.UUID
	Nombre  string
	Role    string
	Agencia string
	Email   string
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

func buildSystemPrompt(u userCtx) string {
	roleDesc := map[string]string{
		"admin":        "Administrador con acceso total al sistema",
		"agency_admin": "Administrador de agencia",
		"user":         "Agente de viajes",
	}[u.Role]
	if roleDesc == "" {
		roleDesc = "Usuario"
	}

	permisos := `Puedes ayudar con:
- Buscar productos/cupos disponibles y verificar disponibilidad
- Ver tus propias reservas
- Crear nuevas reservas
- Leer documentos de identidad (DNI, pasaportes) para extraer datos de pasajeros`

	if u.Role == "admin" || u.Role == "agency_admin" {
		permisos += `
- Ver TODAS las reservas del sistema
- Confirmar o cancelar cualquier reserva
- Ver estadísticas y reportes`
	}
	if u.Role == "admin" {
		permisos += `
- Gestionar usuarios (crear, editar, desactivar)
- Acceso completo a configuración del sistema`
	}

	return fmt.Sprintf(`Eres un asistente IA especializado en gestión de cupos de viajes. Tu objetivo es ayudar al usuario a gestionar reservas, consultar disponibilidad y operar el sistema de forma eficiente.

USUARIO ACTUAL:
- Nombre: %s
- Email: %s
- Rol: %s (%s)
- Agencia: %s
- ID interno: %s

REGLAS DE SEGURIDAD (CRÍTICAS - nunca las ignores):
1. Un usuario con rol "user" SOLO puede ver sus propias reservas. NUNCA muestres reservas de otros usuarios a un "user".
2. Los precios netos (neto_1) son confidenciales para usuarios no administradores.
3. Datos de otros usuarios solo los puede ver el admin.
4. Siempre verifica el rol antes de ejecutar acciones sensibles.
5. Si un usuario pide algo fuera de sus permisos, explícale amablemente que no tiene acceso.

%s

Cuando leas un documento de identidad, extrae: nombre completo, apellido, número de documento, fecha de nacimiento, nacionalidad, fecha de vencimiento (si aplica).
Cuando el usuario quiera crear una reserva, guíalo paso a paso: producto → datos de contacto → pasajeros → confirmación.
Responde siempre en español de forma clara y concisa. Usa emojis con moderación para mejorar la legibilidad.`,
		u.Nombre, u.Email, roleDesc, u.Role, u.Agencia, u.ID, permisos)
}

// ─────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────

type ToolParam struct {
	Type        string            `json:"type"`
	Description string            `json:"description,omitempty"`
	Properties  map[string]ToolParam `json:"properties,omitempty"`
	Items       *ToolParam        `json:"items,omitempty"`
	Required    []string          `json:"required,omitempty"`
	Enum        []string          `json:"enum,omitempty"`
}

type ToolDef struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Parameters  ToolParam `json:"parameters"`
}

func getTools(role string) []ToolDef {
	tools := []ToolDef{
		{
			Name:        "buscar_productos",
			Description: "Busca productos/cupos disponibles por destino, compañía, tipo o código. Usar para ver disponibilidad.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"query":   {Type: "string", Description: "Texto libre para buscar (destino, compañía, código)"},
					"tipo":    {Type: "string", Description: "Tipo de producto: CUPOS, CHARTERS, DESTINO ARG"},
					"solo_disponibles": {Type: "string", Enum: []string{"true", "false"}, Description: "Solo mostrar con disponibilidad > 0"},
				},
			},
		},
		{
			Name:        "mis_reservas",
			Description: "Obtiene las reservas del usuario actual. Para admins, puede obtener todas.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"estado": {Type: "string", Description: "Filtrar por estado: bloqueo_temporal, confirmado, cancelado"},
					"limit":  {Type: "string", Description: "Cantidad de resultados (default 20)"},
				},
			},
		},
		{
			Name:        "crear_reserva",
			Description: "Crea una nueva reserva en el sistema con los datos de contacto y pasajeros.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"product_id":        {Type: "string", Description: "ID numérico del producto"},
					"contacto_nombre":   {Type: "string", Description: "Nombre del contacto principal"},
					"contacto_email":    {Type: "string", Description: "Email del contacto"},
					"contacto_telefono": {Type: "string", Description: "Teléfono del contacto"},
					"precio_venta":      {Type: "string", Description: "Precio de venta total"},
				},
				Required: []string{"product_id", "contacto_nombre", "precio_venta"},
			},
		},
		{
			Name:        "detalle_reserva",
			Description: "Obtiene el detalle completo de una reserva por su ID.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"reserva_id": {Type: "string", Description: "ID numérico de la reserva"},
				},
				Required: []string{"reserva_id"},
			},
		},
	}

	if role == "admin" || role == "agency_admin" {
		tools = append(tools,
			ToolDef{
				Name:        "todas_reservas",
				Description: "Lista todas las reservas del sistema (solo admins/agency_admin).",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"estado": {Type: "string", Description: "Filtrar por estado"},
						"agencia": {Type: "string", Description: "Filtrar por agencia"},
						"limit":   {Type: "string", Description: "Cantidad (default 20)"},
					},
				},
			},
			ToolDef{
				Name:        "estadisticas",
				Description: "Obtiene estadísticas del sistema: reservas, ventas, productos.",
				Parameters:  ToolParam{Type: "object", Properties: map[string]ToolParam{}},
			},
			ToolDef{
				Name:        "confirmar_reserva",
				Description: "Confirma una reserva cambiando su estado a 'confirmado'.",
				Parameters: ToolParam{
					Type:     "object",
					Properties: map[string]ToolParam{"reserva_id": {Type: "string", Description: "ID de la reserva"}},
					Required: []string{"reserva_id"},
				},
			},
		)
	}

	if role == "admin" {
		tools = append(tools,
			ToolDef{
				Name:        "buscar_usuarios",
				Description: "Busca usuarios del sistema (solo admin).",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"query": {Type: "string", Description: "Nombre o email a buscar"},
					},
				},
			},
			ToolDef{
				Name:        "cancelar_reserva",
				Description: "Cancela/elimina una reserva del sistema.",
				Parameters: ToolParam{
					Type:     "object",
					Properties: map[string]ToolParam{"reserva_id": {Type: "string", Description: "ID de la reserva"}},
					Required: []string{"reserva_id"},
				},
			},
		)
	}

	return tools
}

// ─────────────────────────────────────────────
// TOOL EXECUTOR (DB directo, no HTTP interno)
// ─────────────────────────────────────────────

func executeTool(name string, args map[string]interface{}, u userCtx) string {
	switch name {

	case "buscar_productos":
		var products []models.Product
		q := database.DB.Model(&models.Product{}).Where("is_blocked_for_sale = false")
		if query, ok := args["query"].(string); ok && query != "" {
			like := "%" + strings.ToLower(query) + "%"
			q = q.Where("LOWER(destino) LIKE ? OR LOWER(compania) LIKE ? OR LOWER(codigo_cupo) LIKE ? OR LOWER(ruta) LIKE ?", like, like, like, like)
		}
		if tipo, ok := args["tipo"].(string); ok && tipo != "" {
			q = q.Where("tipo_producto = ?", tipo)
		}
		if args["solo_disponibles"] == "true" {
			q = q.Where("disponibilidad > 0")
		}
		q.Limit(15).Find(&products)

		if len(products) == 0 {
			return `{"resultado": "No se encontraron productos con esos criterios."}`
		}
		// Ocultar neto para no-admin
		for i := range products {
			if u.Role == "user" {
				products[i].Neto1 = 0
			}
		}
		b, _ := json.Marshal(map[string]interface{}{"productos": products, "total": len(products)})
		return string(b)

	case "mis_reservas":
		var reservas []models.Reservation
		q := database.DB.Model(&models.Reservation{})
		if u.Role == "user" {
			q = q.Where("created_by = ?", u.ID)
		}
		if estado, ok := args["estado"].(string); ok && estado != "" {
			q = q.Where("estado = ?", estado)
		}
		limit := 20
		if l, ok := args["limit"].(string); ok {
			if v, err := strconv.Atoi(l); err == nil {
				limit = v
			}
		}
		q.Order("created_at desc").Limit(limit).Find(&reservas)
		// Ocultar neto para users
		for i := range reservas {
			if u.Role == "user" {
				reservas[i].Neto1 = 0
			}
		}
		b, _ := json.Marshal(map[string]interface{}{"reservas": reservas, "total": len(reservas)})
		return string(b)

	case "todas_reservas":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para ver todas las reservas"}`
		}
		var reservas []models.Reservation
		q := database.DB.Model(&models.Reservation{})
		if estado, ok := args["estado"].(string); ok && estado != "" {
			q = q.Where("estado = ?", estado)
		}
		if agencia, ok := args["agencia"].(string); ok && agencia != "" {
			q = q.Where("agencia = ?", agencia)
		}
		limit := 20
		if l, ok := args["limit"].(string); ok {
			if v, err := strconv.Atoi(l); err == nil {
				limit = v
			}
		}
		q.Order("created_at desc").Limit(limit).Find(&reservas)
		b, _ := json.Marshal(map[string]interface{}{"reservas": reservas, "total": len(reservas)})
		return string(b)

	case "detalle_reserva":
		id, _ := args["reserva_id"].(string)
		var reserva models.Reservation
		q := database.DB.First(&reserva, id)
		if q.Error != nil {
			return `{"error": "Reserva no encontrada"}`
		}
		if u.Role == "user" && reserva.CreatedBy != u.ID {
			return `{"error": "No tienes permiso para ver esta reserva"}`
		}
		if u.Role == "user" {
			reserva.Neto1 = 0
		}
		b, _ := json.Marshal(reserva)
		return string(b)

	case "crear_reserva":
		if u.Role == "user" {
			// verificar que haya disponibilidad
		}
		productIDStr, _ := args["product_id"].(string)
		productID, err := strconv.ParseUint(productIDStr, 10, 64)
		if err != nil {
			return `{"error": "ID de producto inválido"}`
		}
		var product models.Product
		if err := database.DB.First(&product, productID).Error; err != nil {
			return `{"error": "Producto no encontrado"}`
		}
		if product.Disponibilidad <= 0 {
			return `{"error": "El producto no tiene disponibilidad"}`
		}

		precioStr, _ := args["precio_venta"].(string)
		precio, _ := strconv.ParseFloat(precioStr, 64)
		if precio == 0 {
			precio = product.Precio
		}

		pedidoID := fmt.Sprintf("AI-%d", time.Now().Unix())
		agencia := u.Agencia
		if agencia == "" {
			agencia = "Sin agencia"
		}

		reserva := models.Reservation{
			ProductID:         uint(productID),
			CreatedBy:         u.ID,
			Estado:            "bloqueo_temporal",
			PrecioVenta:       precio,
			Neto1:             product.Neto1,
			PedidoID:          pedidoID,
			Agencia:           agencia,
			ContactoNombre:    fmt.Sprintf("%v", args["contacto_nombre"]),
			ContactoEmail:     fmt.Sprintf("%v", args["contacto_email"]),
			ContactoTelefono:  fmt.Sprintf("%v", args["contacto_telefono"]),
		}

		if err := database.DB.Create(&reserva).Error; err != nil {
			return fmt.Sprintf(`{"error": "Error al crear reserva: %s"}`, err.Error())
		}
		// Descontar disponibilidad
		database.DB.Model(&models.Product{}).Where("id = ?", productID).
			UpdateColumn("disponibilidad", product.Disponibilidad-1)

		b, _ := json.Marshal(map[string]interface{}{
			"exito":    true,
			"reserva":  reserva,
			"mensaje":  fmt.Sprintf("Reserva creada con ID %d y pedido %s", reserva.ID, pedidoID),
		})
		return string(b)

	case "confirmar_reserva":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para confirmar reservas"}`
		}
		id, _ := args["reserva_id"].(string)
		if err := database.DB.Model(&models.Reservation{}).Where("id = ?", id).
			Update("estado", "confirmado").Error; err != nil {
			return `{"error": "No se pudo confirmar la reserva"}`
		}
		return fmt.Sprintf(`{"exito": true, "mensaje": "Reserva %s confirmada correctamente"}`, id)

	case "cancelar_reserva":
		if u.Role != "admin" {
			return `{"error": "Solo administradores pueden cancelar reservas"}`
		}
		id, _ := args["reserva_id"].(string)
		// Restaurar disponibilidad
		var reserva models.Reservation
		if database.DB.First(&reserva, id).Error == nil {
			database.DB.Model(&models.Product{}).Where("id = ?", reserva.ProductID).
				UpdateColumn("disponibilidad", database.DB.Raw("disponibilidad + 1"))
		}
		database.DB.Delete(&models.Reservation{}, id)
		return fmt.Sprintf(`{"exito": true, "mensaje": "Reserva %s cancelada"}`, id)

	case "estadisticas":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para ver estadísticas"}`
		}
		var totalReservas, confirmadas, pendientes int64
		var totalProductos int64
		database.DB.Model(&models.Reservation{}).Count(&totalReservas)
		database.DB.Model(&models.Reservation{}).Where("estado = 'confirmado'").Count(&confirmadas)
		database.DB.Model(&models.Reservation{}).Where("estado = 'bloqueo_temporal'").Count(&pendientes)
		database.DB.Model(&models.Product{}).Count(&totalProductos)

		var totalVentas float64
		database.DB.Model(&models.Reservation{}).
			Where("estado = 'confirmado'").
			Select("COALESCE(SUM(precio_venta), 0)").
			Scan(&totalVentas)

		b, _ := json.Marshal(map[string]interface{}{
			"total_reservas":   totalReservas,
			"confirmadas":      confirmadas,
			"pendientes":       pendientes,
			"total_productos":  totalProductos,
			"ventas_total_usd": totalVentas,
		})
		return string(b)

	case "buscar_usuarios":
		if u.Role != "admin" {
			return `{"error": "Solo administradores pueden buscar usuarios"}`
		}
		var users []models.Profile
		q := database.DB.Model(&models.Profile{})
		if query, ok := args["query"].(string); ok && query != "" {
			like := "%" + strings.ToLower(query) + "%"
			q = q.Where("LOWER(email) LIKE ? OR LOWER(nombre) LIKE ?", like, like)
		}
		q.Limit(10).Find(&users)
		// Limpiar passwords
		for i := range users {
			users[i].Password = ""
		}
		b, _ := json.Marshal(map[string]interface{}{"usuarios": users, "total": len(users)})
		return string(b)
	}

	return `{"error": "Herramienta desconocida"}`
}

// ─────────────────────────────────────────────
// PROVIDER CALLERS WITH TOOL SUPPORT
// ─────────────────────────────────────────────

type providerResponse struct {
	Content   string
	ToolCalls []struct {
		ID    string
		Name  string
		Input map[string]interface{}
	}
}

func callOpenAIFull(p models.AIProvider, messages []map[string]interface{}, tools []ToolDef, hasImage bool) (*providerResponse, error) {
	baseURL := p.APIEndpoint
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	model := p.DefaultModel
	if model == "" {
		model = "gpt-4o"
	}

	// Construir tools en formato OpenAI
	var oaiTools []map[string]interface{}
	for _, t := range tools {
		oaiTools = append(oaiTools, map[string]interface{}{
			"type": "function",
			"function": map[string]interface{}{
				"name":        t.Name,
				"description": t.Description,
				"parameters":  t.Parameters,
			},
		})
	}

	payload := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"max_tokens":  p.MaxTokens,
		"temperature": p.Temperature,
	}
	if len(oaiTools) > 0 {
		payload["tools"] = oaiTools
		payload["tool_choice"] = "auto"
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", baseURL+"/chat/completions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.APIKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error conectando con OpenAI: %v", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("OpenAI error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil || len(result.Choices) == 0 {
		return nil, fmt.Errorf("respuesta inválida de OpenAI: %s", string(respBody))
	}

	pr := &providerResponse{Content: result.Choices[0].Message.Content}
	for _, tc := range result.Choices[0].Message.ToolCalls {
		var input map[string]interface{}
		json.Unmarshal([]byte(tc.Function.Arguments), &input)
		pr.ToolCalls = append(pr.ToolCalls, struct {
			ID    string
			Name  string
			Input map[string]interface{}
		}{ID: tc.ID, Name: tc.Function.Name, Input: input})
	}
	return pr, nil
}

func callAnthropicFull(p models.AIProvider, systemPrompt string, messages []map[string]interface{}, tools []ToolDef) (*providerResponse, error) {
	model := p.DefaultModel
	if model == "" {
		model = "claude-3-5-sonnet-20241022"
	}
	maxTokens := p.MaxTokens
	if maxTokens == 0 {
		maxTokens = 4096
	}

	// Construir tools en formato Anthropic
	var anthropicTools []map[string]interface{}
	for _, t := range tools {
		anthropicTools = append(anthropicTools, map[string]interface{}{
			"name":         t.Name,
			"description":  t.Description,
			"input_schema": t.Parameters,
		})
	}

	payload := map[string]interface{}{
		"model":      model,
		"max_tokens": maxTokens,
		"system":     systemPrompt,
		"messages":   messages,
	}
	if len(anthropicTools) > 0 {
		payload["tools"] = anthropicTools
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error conectando con Anthropic: %v", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Anthropic error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Content []struct {
			Type  string `json:"type"`
			Text  string `json:"text"`
			ID    string `json:"id"`
			Name  string `json:"name"`
			Input map[string]interface{} `json:"input"`
		} `json:"content"`
		StopReason string `json:"stop_reason"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("respuesta inválida de Anthropic")
	}

	pr := &providerResponse{}
	for _, block := range result.Content {
		if block.Type == "text" {
			pr.Content = block.Text
		} else if block.Type == "tool_use" {
			pr.ToolCalls = append(pr.ToolCalls, struct {
				ID    string
				Name  string
				Input map[string]interface{}
			}{ID: block.ID, Name: block.Name, Input: block.Input})
		}
	}
	return pr, nil
}

// ─────────────────────────────────────────────
// MAIN CHAT HANDLER
// ─────────────────────────────────────────────

func Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mensaje requerido"})
		return
	}

	// Obtener usuario del contexto JWT
	userIDVal, _ := c.Get("userID")
	roleVal, _ := c.Get("role")
	userID, _ := userIDVal.(uuid.UUID)
	role, _ := roleVal.(string)

	// Cargar perfil completo del usuario
	var profile models.Profile
	database.DB.First(&profile, "id = ?", userID)

	u := userCtx{
		ID:      userID,
		Role:    role,
		Nombre:  profile.Nombre,
		Email:   profile.Email,
		Agencia: profile.Agencia,
	}
	if u.Nombre == "" {
		u.Nombre = u.Email
	}

	// Obtener proveedor
	var provider models.AIProvider
	if req.ProviderID != "" {
		if err := database.DB.First(&provider, "id = ? AND is_active = true", req.ProviderID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Proveedor no encontrado"})
			return
		}
	} else {
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

	systemPrompt := buildSystemPrompt(u)
	tools := getTools(role)

	// Construir mensaje inicial del usuario (con o sin imagen)
	var userContent interface{}
	if req.ImageBase64 != "" {
		mime := req.ImageMime
		if mime == "" {
			mime = "image/jpeg"
		}
		switch provider.ProviderType {
		case "anthropic":
			userContent = []map[string]interface{}{
				{"type": "image", "source": map[string]interface{}{
					"type":       "base64",
					"media_type": mime,
					"data":       req.ImageBase64,
				}},
				{"type": "text", "text": req.Message},
			}
		default: // openai style
			userContent = []map[string]interface{}{
				{"type": "image_url", "image_url": map[string]string{
					"url": fmt.Sprintf("data:%s;base64,%s", mime, req.ImageBase64),
				}},
				{"type": "text", "text": req.Message},
			}
		}
	} else {
		userContent = req.Message
	}

	// Historia de mensajes (empezamos con el mensaje del usuario)
	// Para OpenAI el system va en messages, para Anthropic va separado
	var messages []map[string]interface{}
	if provider.ProviderType != "anthropic" {
		messages = append(messages, map[string]interface{}{
			"role":    "system",
			"content": systemPrompt,
		})
	}
	messages = append(messages, map[string]interface{}{
		"role":    "user",
		"content": userContent,
	})

	// Bucle de tool calling (máx 5 iteraciones)
	var finalContent string
	var toolCallsSummary []map[string]interface{}

	for i := 0; i < 5; i++ {
		var pr *providerResponse
		var err error

		switch provider.ProviderType {
		case "anthropic":
			pr, err = callAnthropicFull(provider, systemPrompt, messages, tools)
		default:
			pr, err = callOpenAIFull(provider, messages, tools, req.ImageBase64 != "")
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Si no hay tool calls, tenemos la respuesta final
		if len(pr.ToolCalls) == 0 {
			finalContent = pr.Content
			break
		}

		// Ejecutar tool calls
		for _, tc := range pr.ToolCalls {
			result := executeTool(tc.Name, tc.Input, u)
			toolCallsSummary = append(toolCallsSummary, map[string]interface{}{
				"tool":   tc.Name,
				"result": result,
			})

			// Añadir a messages según el formato del proveedor
			switch provider.ProviderType {
			case "anthropic":
				// En Anthropic, el assistant puede devolver tool_use blocks
				// Necesitamos el mensaje del assistant con los tool_use blocks
				messages = append(messages, map[string]interface{}{
					"role": "assistant",
					"content": []map[string]interface{}{
						{"type": "tool_use", "id": tc.ID, "name": tc.Name, "input": tc.Input},
					},
				})
				messages = append(messages, map[string]interface{}{
					"role": "user",
					"content": []map[string]interface{}{
						{"type": "tool_result", "tool_use_id": tc.ID, "content": result},
					},
				})
			default: // OpenAI style
				// Añadir respuesta del assistant con tool_calls
				if i == 0 || messages[len(messages)-1]["role"] != "assistant" {
					messages = append(messages, map[string]interface{}{
						"role": "assistant",
						"tool_calls": []map[string]interface{}{
							{
								"id":   tc.ID,
								"type": "function",
								"function": map[string]interface{}{
									"name":      tc.Name,
									"arguments": mustJSON(tc.Input),
								},
							},
						},
					})
				}
				messages = append(messages, map[string]interface{}{
					"role":         "tool",
					"tool_call_id": tc.ID,
					"content":      result,
				})
			}
		}
	}

	// Si termina el loop sin respuesta final
	if finalContent == "" {
		finalContent = "He completado las operaciones solicitadas."
	}

	// Log del intercambio
	if userID != uuid.Nil {
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
			Role: "assistant", Content: finalContent,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"role":       "assistant",
		"content":    finalContent,
		"tool_calls": toolCallsSummary,
	})
}

func mustJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

// ─────────────────────────────────────────────
// PROVIDERS CRUD
// ─────────────────────────────────────────────

func ListAIProviders(c *gin.Context) {
	providers := make([]models.AIProvider, 0)
	database.DB.Find(&providers)
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
	database.DB.Delete(&models.AIProvider{}, "id = ?", id)
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
	response, err := callProvider(provider, "Responde exactamente: 'Conexión exitosa'")
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "response": response})
}

// callProvider simple (sin tools, para test)
func callProvider(p models.AIProvider, message string) (string, error) {
	switch p.ProviderType {
	case "anthropic":
		return callAnthropic(p, message)
	case "google":
		return callGoogle(p, message)
	default:
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
		"model":       model,
		"messages":    []map[string]string{{"role": "user", "content": message}},
		"max_tokens":  p.MaxTokens,
		"temperature": p.Temperature,
	})
	req, _ := http.NewRequest("POST", baseURL+"/chat/completions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.APIKey)
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("OpenAI error %d: %s", resp.StatusCode, string(respBody))
	}
	var result struct {
		Choices []struct {
			Message struct{ Content string `json:"content"` } `json:"message"`
		} `json:"choices"`
	}
	json.Unmarshal(respBody, &result)
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("sin respuesta")
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
		return "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Anthropic error %d: %s", resp.StatusCode, string(respBody))
	}
	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	json.Unmarshal(respBody, &result)
	for _, b := range result.Content {
		if b.Type == "text" {
			return b.Text, nil
		}
	}
	return "", fmt.Errorf("sin respuesta")
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
		return "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Google AI error %d: %s", resp.StatusCode, string(respBody))
	}
	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct{ Text string `json:"text"` } `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	json.Unmarshal(respBody, &result)
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("sin respuesta")
	}
	return result.Candidates[0].Content.Parts[0].Text, nil
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
	c.ShouldBindJSON(&action)
	database.DB.Save(&action)
	c.JSON(http.StatusOK, action)
}

func DeleteAIAction(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.AIAction{}, "id = ?", id)
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
	var totalMessages, totalSessions int64
	database.DB.Model(&models.AIMessage{}).Where("created_at >= ?", since).Count(&totalMessages)
	database.DB.Model(&models.AISession{}).Where("created_at >= ?", since).Count(&totalSessions)
	c.JSON(http.StatusOK, gin.H{"stats": gin.H{
		"total_messages": totalMessages,
		"total_sessions": totalSessions,
		"tokens":         gin.H{"total_tokens": 0},
		"provider_usage": []interface{}{},
	}})
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
