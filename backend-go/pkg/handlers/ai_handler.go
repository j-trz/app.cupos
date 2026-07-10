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
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ImageAttachment struct {
	Base64 string `json:"base64"`
	Mime   string `json:"mime"`
	Name   string `json:"name"`
}

type ChatRequest struct {
	Message     string            `json:"message"`
	SessionID   string            `json:"sessionId"`
	ProviderID  string            `json:"providerId"`
	ImageBase64 string            `json:"imageBase64"` // base64 sin prefijo data:... (retrocompatibilidad)
	ImageMime   string            `json:"imageMime"`   // "image/jpeg", "image/png", etc. (retrocompatibilidad)
	Images      []ImageAttachment `json:"images"`      // Soporte para múltiples adjuntos
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
		"agency_user":  "Agente de viajes",
		"user":         "Agente de viajes",
	}[u.Role]
	if roleDesc == "" {
		roleDesc = "Agente de viajes"
	}

	permisos := `Puedes ayudar con:
- Buscar productos/cupos disponibles y verificar disponibilidad
- Ver tus propias reservas
- Crear nuevas reservas
- Leer múltiples documentos de identidad (DNI, pasaportes) simultáneamente para extraer datos de pasajeros y realizar reservas masivas`

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

	return fmt.Sprintf(`Eres un asistente IA especializado en gestión de cupos de viajes. Eres directo, resolutivo y evitas pedir información que ya puedes obtener del sistema.

USUARIO ACTUAL:
- Nombre: %s
- Email: %s
- Rol: %s (%s)
- Agencia: %s
- ID interno: %s

REGLAS DE SEGURIDAD (CRÍTICAS - nunca las ignores):
1. Un usuario con rol "user" o "agency_user" SOLO puede ver sus propias reservas. NUNCA muestres reservas de otros usuarios.
2. Los precios netos (neto_1) son confidenciales para usuarios no administradores.
3. Datos de otros usuarios solo los puede ver el admin.
4. Siempre verifica el rol antes de ejecutar acciones sensibles.
5. Si un usuario pide algo fuera de sus permisos, explícale amablemente que no tiene acceso.

REGLA ANTI-INVENCIÓN (CRÍTICA — nunca la ignores):
- NUNCA respondas con fechas, precios, estados, destinos u otro dato de una reserva o producto de memoria o "a ojo". Cada dato concreto que menciones tiene que venir de una llamada a una herramienta en ESTE turno o en uno anterior de la misma conversación.
- Si no tenés el dato real todavía, tenés que llamar a la herramienta correspondiente antes de responder — nunca falta información que el sistema ya tiene.
- Si después de llamar a la herramienta el dato no está disponible (ej. la reserva no existe, o el campo vino vacío), decilo explícitamente ("no tengo registrada esa fecha") en vez de inventar un valor plausible.

FLUJO PARA CONSULTAR RESERVAS (fechas, estado, pasajeros, precios — IMPORTANTE, seguir exactamente):
1. Si el usuario pregunta cualquier cosa sobre UNA reserva existente (cuándo sale, estado, precio, pasajeros, ficha, ticket, etc.), primero llamá a "mis_reservas" ANTES de responder — incluso si te "suena" que ya lo sabés por el contexto. "mis_reservas" ya trae todos los campos de cada reserva, incluido el número de pedido.
2. Usá "detalle_reserva" solo cuando ya tengas el ID numérico interno de una reserva puntual (obtenido de un resultado previo de "mis_reservas" o "todas_reservas" en esta misma conversación) y quieras refrescar/confirmar ese registro específico — nunca le pidas al usuario ese ID interno, ni le pases el número de pedido como si fuera el ID.
3. Si el usuario tiene varias reservas y no especificó cuál, mostrale la lista (de mis_reservas) para que elija, en vez de asumir cuál es.
4. Recién con el resultado real de la herramienta en mano, respondé la pregunta puntual del usuario usando esos datos — no repitas toda la reserva si te preguntó solo una cosa puntual (ej. solo la fecha de salida).

%s

FLUJO PARA CREAR RESERVA (IMPORTANTE - seguir exactamente):
1. Cuando el usuario quiera reservar, llama SIEMPRE a buscar_productos con solo_disponibles="true".
2. Presenta los productos como lista numerada: número, destino, compañía, salida/regreso, precio, cupos. Ej: "1. Cancún - Aerolíneas - $850 - 5 cupos"
3. Pide al usuario que elija por número. NUNCA le pidas al usuario el ID interno del producto (product_id).
4. Una vez que el usuario elija el número de la lista, tú internamente DEBES mapear ese número al "id" real del producto que obtuviste de buscar_productos.
5. Pide SOLO lo que falte para reservar: datos del o los pasajeros.
6. El precio se toma automáticamente del producto — NUNCA pidas precio al usuario.
7. SOPORTE DE MÚLTIPLES ADJUNTOS (RESERVAS MASIVAS): Si el usuario adjunta uno o múltiples documentos (DNI, pasaporte, etc.) o provee datos de varios pasajeros:
   a. Extrae minuciosamente los datos de todos y cada uno de los pasajeros contenidos en las imágenes (nombre, apellido, documento, nacionalidad, fecha de nacimiento, etc.).
   b. Presenta un listado consolidado, claro y ordenado de todos los pasajeros cuyos datos fueron sustraídos.
   c. Pídele al usuario de manera explícita su aprobación, visto bueno o confirmación ("OK") de que los datos sustraídos son correctos.
   d. Una vez y SOLO cuando el usuario confirme que todo está correcto (dando el "OK"), procede a realizar las reservas individuales consecutivamente llamando a la herramienta "crear_reserva" por cada uno de los pasajeros validados.
   e. Recuerda estrictamente que cada pasajero es 1 ticket, consume 1 lugar y requiere su propia llamada a "crear_reserva".
   f. Al finalizar, muestra un resumen consolidado de todas las reservas creadas junto con sus respectivos IDs y códigos de pedido.
8. Si es una reserva individual y el usuario adjuntó un documento, sigue la misma lógica: extrae los datos, pide el visto bueno ("OK") al usuario con el resumen de la extracción, y tras la confirmación, llama a crear_reserva.

BÚSQUEDA DE PRODUCTOS — REGLA CRÍTICA:
- Llama a buscar_productos con el destino mencionado por el usuario.
- Si el resultado incluye el campo "nota", significa que no hubo coincidencia exacta pero SÍ hay productos disponibles. SIEMPRE muéstralos al usuario diciendo que no encontraste ese destino exacto pero que hay estas opciones.
- NUNCA digas "no hay productos disponibles" si la herramienta devolvió una lista de productos.
- Si el usuario menciona un destino que no existe, muéstrale lo que hay y déjalo elegir.

LECTURA DE DOCUMENTOS DE IDENTIDAD:
- Cuando el usuario adjunte una imagen, extrae: nombre, apellido, número de documento, fecha de nacimiento, nacionalidad, vencimiento.
- Confirma los datos extraídos brevemente y úsalos para la reserva sin pedir más.

MEMORIA DE CONVERSACIÓN (MUY IMPORTANTE):
- Tienes acceso al historial completo de esta sesión.
- NO repitas preguntas que ya fueron respondidas en turnos anteriores.
- Si el usuario ya eligió un producto, ya sabes cuál es — no vuelvas a listar ni a preguntar.
- Si ya tienes nombre, documento u otros datos del pasajero, no los pidas de nuevo.
- Avanza siempre hacia el siguiente paso pendiente.

Responde siempre en español, de forma clara y concisa.`,
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
			Description: "Crea una nueva reserva. El precio se toma automáticamente del producto — nunca pedir al usuario.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"product_id":        {Type: "string", Description: "ID numérico del producto (obtenido de buscar_productos)"},
					"contacto_nombre":   {Type: "string", Description: "Nombre completo del contacto/pasajero principal"},
					"contacto_email":    {Type: "string", Description: "Email de contacto (opcional)"},
					"contacto_telefono": {Type: "string", Description: "Teléfono de contacto (opcional)"},
					"pasajero_nombre":   {Type: "string", Description: "Nombre del pasajero (del DNI si fue adjuntado)"},
					"pasajero_apellido": {Type: "string", Description: "Apellido del pasajero (del DNI si fue adjuntado)"},
					"pasajero_documento":{Type: "string", Description: "Número de documento del pasajero"},
					"pasajero_nacionalidad": {Type: "string", Description: "Nacionalidad del pasajero"},
				},
				Required: []string{"product_id", "contacto_nombre"},
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

// isRegularUser returns true for non-admin roles (agency_user, user, etc.)
func isRegularUser(role string) bool {
	return role != "admin" && role != "agency_admin"
}

// ─────────────────────────────────────────────
// TOOL EXECUTOR (DB directo, no HTTP interno)
// ─────────────────────────────────────────────

func executeTool(name string, args map[string]interface{}, u userCtx) string {
	switch name {

	case "buscar_productos":
		type productResumen struct {
			ID             uint    `json:"id"`
			Destino        string  `json:"destino"`
			Compania       string  `json:"compania"`
			TipoProducto   string  `json:"tipo"`
			Ruta           string  `json:"ruta"`
			Salida         string  `json:"salida"`
			Regreso        string  `json:"regreso"`
			Precio         float64 `json:"precio"`
			Disponibilidad int     `json:"disponibilidad"`
			CodigoCupo     string  `json:"codigo"`
		}
		buildResumen := func(products []models.Product) []productResumen {
			var lista []productResumen
			for _, p := range products {
				r := productResumen{
					ID:             p.ID,
					Destino:        p.Destino,
					Compania:       p.Compania,
					TipoProducto:   p.TipoProducto,
					Ruta:           p.Ruta,
					Precio:         p.Precio,
					Disponibilidad: p.Disponibilidad,
					CodigoCupo:     p.CodigoCupo,
				}
				if p.FechaSalida != nil {
					r.Salida = p.FechaSalida.Format("02/01/2006")
				}
				if p.FechaRegreso != nil {
					r.Regreso = p.FechaRegreso.Format("02/01/2006")
				}
				lista = append(lista, r)
			}
			return lista
		}

		query, hasQuery := args["query"].(string)
		soloDisponibles := args["solo_disponibles"] == "true"

		baseQ := func() *gorm.DB {
			q := database.DB.Model(&models.Product{}).Where("is_blocked_for_sale = false")
			if tipo, ok := args["tipo"].(string); ok && tipo != "" {
				q = q.Where("tipo_producto = ?", tipo)
			}
			if soloDisponibles {
				q = q.Where("disponibilidad > 0")
			}
			return q
		}

		var products []models.Product
		nota := ""

		if hasQuery && query != "" {
			like := "%" + strings.ToLower(query) + "%"
			baseQ().Where(
				"LOWER(destino) LIKE ? OR LOWER(compania) LIKE ? OR LOWER(codigo_cupo) LIKE ? OR LOWER(ruta) LIKE ?",
				like, like, like, like,
			).Limit(15).Find(&products)

			// Fallback: si no encontró coincidencia exacta, listar todos los disponibles
			if len(products) == 0 {
				baseQ().Limit(15).Find(&products)
				if len(products) > 0 {
					nota = fmt.Sprintf("No se encontró ningún destino que coincida con '%s'. Estos son todos los productos disponibles:", query)
				}
			}
		} else {
			baseQ().Limit(15).Find(&products)
		}

		if len(products) == 0 {
			return `{"resultado": "No hay productos/cupos disponibles en este momento."}`
		}

		result := map[string]interface{}{
			"productos": buildResumen(products),
			"total":     len(products),
		}
		if nota != "" {
			result["nota"] = nota
		}
		b, _ := json.Marshal(result)
		return string(b)

	case "mis_reservas":
		var reservas []models.Reservation
		q := database.DB.Model(&models.Reservation{})
		if isRegularUser(u.Role) {
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
		// Ocultar neto para usuarios regulares
		for i := range reservas {
			if isRegularUser(u.Role) {
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
		if isRegularUser(u.Role) && reserva.CreatedBy != u.ID {
			return `{"error": "No tienes permiso para ver esta reserva"}`
		}
		if isRegularUser(u.Role) {
			reserva.Neto1 = 0
		}
		b, _ := json.Marshal(reserva)
		return string(b)

	case "crear_reserva":
		productIDStr, _ := args["product_id"].(string)
		productID, err := strconv.ParseUint(productIDStr, 10, 64)
		if err != nil {
			return `{"error": "ID de producto inválido"}`
		}

		var reserva models.Reservation

		err = database.DB.Transaction(func(tx *gorm.DB) error {
			var product models.Product
			// SELECT ... FOR UPDATE para evitar condiciones de carrera y bloquear la fila del producto
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, productID).Error; err != nil {
				return fmt.Errorf("Producto no encontrado")
			}
			if product.Disponibilidad <= 0 {
				return fmt.Errorf("El producto no tiene disponibilidad")
			}

			precio := product.Precio
			pedidoID := fmt.Sprintf("AI-%d-%d", time.Now().Unix(), uint(productID))
			agencia := u.Agencia
			if agencia == "" {
				agencia = "Sin agencia"
			}

			strArg := func(key string) string {
				if v, ok := args[key]; ok && v != nil && fmt.Sprintf("%v", v) != "<nil>" {
					return fmt.Sprintf("%v", v)
				}
				return ""
			}

			reserva = models.Reservation{
				ProductID:            uint(productID),
				CreatedBy:            u.ID,
				Estado:               models.EstadoBloqueoTemporal,
				PrecioVenta:          precio,
				Neto1:                product.Neto1,
				PedidoID:             pedidoID,
				Agencia:              agencia,
				ContactoNombre:       strArg("contacto_nombre"),
				ContactoEmail:        strArg("contacto_email"),
				ContactoTelefono:     strArg("contacto_telefono"),
				NombrePasajero:       strArg("pasajero_nombre"),
				ApellidoPasajero:     strArg("pasajero_apellido"),
				DocumentoPasajero:    strArg("pasajero_documento"),
				NacionalidadPasajero: strArg("pasajero_nacionalidad"),
			}

			// Copiar datos de vuelo y ruta del producto
			reserva.VueloCodigo = product.CodigoCupo
			reserva.VueloDestino = product.Destino
			reserva.VueloCompania = product.Compania
			reserva.VueloSalida = product.FechaSalida
			reserva.VueloRuta = product.Ruta

			blockMinutes := product.BloqueoTemporalMinutos
			if blockMinutes <= 0 {
				blockMinutes = 60
			}
			expiresAt := time.Now().Add(time.Duration(blockMinutes) * time.Minute)
			reserva.BloqueoExpiraAt = &expiresAt

			if err := tx.Create(&reserva).Error; err != nil {
				return err
			}

			// Descontar disponibilidad e incrementar vendidos de forma atómica y segura
			if err := tx.Model(&models.Product{}).Where("id = ?", productID).
				Updates(map[string]interface{}{
					"disponibilidad": product.Disponibilidad - 1,
					"vendidos":       product.Vendidos + 1,
				}).Error; err != nil {
				return err
			}

			// Crear también la fila en Passenger (esencial para que figure en la nómina)
			pax := models.Passenger{
				ReservationID:   reserva.ID,
				PedidoID:        reserva.PedidoID,
				Nombre:          reserva.NombrePasajero,
				Apellido:        reserva.ApellidoPasajero,
				Documento:       reserva.DocumentoPasajero,
				Nacionalidad:    reserva.NacionalidadPasajero,
				Estado:          reserva.Estado,
				PrecioVenta:     reserva.PrecioVenta,
				Neto1:           reserva.Neto1,
				BloqueoExpiraAt: reserva.BloqueoExpiraAt,
				NRO:             1,
			}
			if err := tx.Create(&pax).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			return fmt.Sprintf(`{"error": "Error al procesar reserva: %s"}`, err.Error())
		}

		// El neto es confidencial para usuarios no administradores — no debe
		// filtrarse ni siquiera dentro del resultado de una tool call.
		if isRegularUser(u.Role) {
			reserva.Neto1 = 0
		}

		b, _ := json.Marshal(map[string]interface{}{
			"exito":   true,
			"reserva": reserva,
			"mensaje": fmt.Sprintf("Reserva creada con ID %d y pedido %s", reserva.ID, reserva.PedidoID),
		})
		return string(b)

	case "confirmar_reserva":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para confirmar reservas"}`
		}
		id, _ := args["reserva_id"].(string)
		if err := database.DB.Model(&models.Reservation{}).Where("id = ?", id).
			Update("estado", models.EstadoConfirmada).Error; err != nil {
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
				UpdateColumn("disponibilidad", gorm.Expr("disponibilidad + 1"))
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
		database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoConfirmada).Count(&confirmadas)
		database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoBloqueoTemporal).Count(&pendientes)
		database.DB.Model(&models.Product{}).Count(&totalProductos)

		var totalVentas float64
		database.DB.Model(&models.Reservation{}).
			Where("estado = ?", models.EstadoConfirmada).
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
// GOOGLE GEMINI FULL (con tool calling)
// ─────────────────────────────────────────────

func callGoogleFull(p models.AIProvider, systemPrompt string, contents []map[string]interface{}, tools []ToolDef) (*providerResponse, error) {
	model := p.DefaultModel
	if model == "" {
		model = "gemini-1.5-flash"
	}

	// Convertir tools al formato de Gemini
	var functionDeclarations []map[string]interface{}
	for _, t := range tools {
		functionDeclarations = append(functionDeclarations, map[string]interface{}{
			"name":        t.Name,
			"description": t.Description,
			"parameters":  t.Parameters,
		})
	}

	payload := map[string]interface{}{
		"contents": contents,
		"systemInstruction": map[string]interface{}{
			"parts": []map[string]string{{"text": systemPrompt}},
		},
		"generationConfig": map[string]interface{}{
			"temperature": p.Temperature,
			"maxOutputTokens": func() int {
				if p.MaxTokens > 0 {
					return p.MaxTokens
				}
				return 4096
			}(),
		},
	}
	if len(functionDeclarations) > 0 {
		payload["tools"] = []map[string]interface{}{
			{"functionDeclarations": functionDeclarations},
		}
		payload["toolConfig"] = map[string]interface{}{
			"functionCallingConfig": map[string]string{"mode": "AUTO"},
		}
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, p.APIKey)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error conectando con Google AI: %v", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Google AI error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text         string `json:"text"`
					FunctionCall *struct {
						Name string                 `json:"name"`
						Args map[string]interface{} `json:"args"`
					} `json:"functionCall"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil || len(result.Candidates) == 0 {
		return nil, fmt.Errorf("respuesta inválida de Google AI: %s", string(respBody))
	}

	pr := &providerResponse{}
	for i, part := range result.Candidates[0].Content.Parts {
		if part.FunctionCall != nil {
			pr.ToolCalls = append(pr.ToolCalls, struct {
				ID    string
				Name  string
				Input map[string]interface{}
			}{
				ID:    fmt.Sprintf("gemini-tc-%d", i),
				Name:  part.FunctionCall.Name,
				Input: part.FunctionCall.Args,
			})
		} else if part.Text != "" {
			pr.Content += part.Text
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
	role, _ := roleVal.(string)

	// userID puede venir como string desde el JWT
	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		userID, _ = uuid.Parse(v)
	case uuid.UUID:
		userID = v
	}

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

	// Parsear o generar sessionID (necesario para persistir historial)
	var sessionID uuid.UUID
	isNewSession := false
	if req.SessionID != "" {
		sessionID, _ = uuid.Parse(req.SessionID)
	}
	if sessionID == uuid.Nil {
		sessionID = uuid.New()
		isNewSession = true
	}

	const historyTTL = 4 * time.Hour
	const maxHistoryMessages = 20 // pares usuario/asistente → 40 mensajes máx
	const maxSessionMessages = 30 // trimear si la sesión supera este límite

	// Auto-limpieza por TTL: borrar mensajes de esta sesión con más de 4 horas
	if sessionID != uuid.Nil {
		cutoff := time.Now().Add(-historyTTL)
		database.DB.Where("session_id = ? AND created_at < ?", sessionID, cutoff).Delete(&models.AIMessage{})
	}

	// Cargar historial reciente de la sesión (ordenado cronológicamente)
	var history []models.AIMessage
	if sessionID != uuid.Nil {
		database.DB.Where("session_id = ?", sessionID).
			Order("created_at asc").
			Limit(maxHistoryMessages).
			Find(&history)
	}

	systemPrompt := buildSystemPrompt(u)
	tools := getTools(role)

	// Construir mensaje inicial del usuario (con o sin imagen/es)
	var userContent interface{}
	hasImages := len(req.Images) > 0 || req.ImageBase64 != ""

	if hasImages {
		switch provider.ProviderType {
		case "anthropic":
			var parts []map[string]interface{}
			// Agregar imágenes del arreglo
			for _, img := range req.Images {
				parts = append(parts, map[string]interface{}{
					"type": "image",
					"source": map[string]interface{}{
						"type":       "base64",
						"media_type": img.Mime,
						"data":       img.Base64,
					},
				})
			}
			// Retrocompatibilidad con imagen única
			if req.ImageBase64 != "" && len(req.Images) == 0 {
				mime := req.ImageMime
				if mime == "" {
					mime = "image/jpeg"
				}
				parts = append(parts, map[string]interface{}{
					"type": "image",
					"source": map[string]interface{}{
						"type":       "base64",
						"media_type": mime,
						"data":       req.ImageBase64,
					},
				})
			}
			parts = append(parts, map[string]interface{}{"type": "text", "text": req.Message})
			userContent = parts

		default: // openai style (default)
			var parts []map[string]interface{}
			// Agregar imágenes del arreglo
			for _, img := range req.Images {
				parts = append(parts, map[string]interface{}{
					"type": "image_url",
					"image_url": map[string]string{
						"url": fmt.Sprintf("data:%s;base64,%s", img.Mime, img.Base64),
					},
				})
			}
			// Retrocompatibilidad con imagen única
			if req.ImageBase64 != "" && len(req.Images) == 0 {
				mime := req.ImageMime
				if mime == "" {
					mime = "image/jpeg"
				}
				parts = append(parts, map[string]interface{}{
					"type": "image_url",
					"image_url": map[string]string{
						"url": fmt.Sprintf("data:%s;base64,%s", mime, req.ImageBase64),
					},
				})
			}
			parts = append(parts, map[string]interface{}{"type": "text", "text": req.Message})
			userContent = parts
		}
	} else {
		userContent = req.Message
	}

	isGoogle := provider.ProviderType == "google"

	// Construir array de mensajes: historial + mensaje actual
	var messages []map[string]interface{}

	if isGoogle {
		// Google Gemini: role "user"/"model", sin system en messages
		// Inyectar historial en formato Gemini
		for _, h := range history {
			role := h.Role
			if role == "assistant" {
				role = "model"
			}
			messages = append(messages, map[string]interface{}{
				"role":  role,
				"parts": []map[string]string{{"text": h.Content}},
			})
		}
		// Mensaje actual del usuario (Gemini - con múltiples adjuntos)
		var parts []interface{}
		// Agregar todas las imágenes
		for _, img := range req.Images {
			parts = append(parts, map[string]interface{}{
				"inlineData": map[string]string{
					"mimeType": img.Mime,
					"data":     img.Base64,
				},
			})
		}
		// Retrocompatibilidad con imagen única
		if req.ImageBase64 != "" && len(req.Images) == 0 {
			mime := req.ImageMime
			if mime == "" {
				mime = "image/jpeg"
			}
			parts = append(parts, map[string]interface{}{
				"inlineData": map[string]string{
					"mimeType": mime,
					"data":     req.ImageBase64,
				},
			})
		}
		parts = append(parts, map[string]string{"text": req.Message})
		messages = append(messages, map[string]interface{}{
			"role":  "user",
			"parts": parts,
		})
	} else {
		if provider.ProviderType != "anthropic" {
			messages = append(messages, map[string]interface{}{
				"role":    "system",
				"content": systemPrompt,
			})
		}
		// Inyectar historial en formato OpenAI/Anthropic
		for _, h := range history {
			messages = append(messages, map[string]interface{}{
				"role":    h.Role,
				"content": h.Content,
			})
		}
		// Mensaje actual del usuario
		messages = append(messages, map[string]interface{}{
			"role":    "user",
			"content": userContent,
		})
	}

	// Bucle de tool calling (máx 5 iteraciones)
	var finalContent string
	var toolCallsSummary []map[string]interface{}

	for i := 0; i < 5; i++ {
		var pr *providerResponse
		var err error

		switch provider.ProviderType {
		case "anthropic":
			pr, err = callAnthropicFull(provider, systemPrompt, messages, tools)
		case "google":
			pr, err = callGoogleFull(provider, systemPrompt, messages, tools)
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

		// Para OpenAI, el protocolo exige UN único mensaje "assistant" con el
		// array completo de tool_calls de esta vuelta cuando el modelo pide
		// varias tools en paralelo. Antes se armaba un mensaje "assistant"
		// distinto por cada tool call individual, lo que deja un historial
		// inválido y puede hacer que el modelo nunca cierre con una respuesta
		// de texto (quedándose repitiendo tool calls hasta agotar el loop).
		if provider.ProviderType != "anthropic" && provider.ProviderType != "google" {
			var oaiToolCalls []map[string]interface{}
			for _, tc := range pr.ToolCalls {
				oaiToolCalls = append(oaiToolCalls, map[string]interface{}{
					"id":   tc.ID,
					"type": "function",
					"function": map[string]interface{}{
						"name":      tc.Name,
						"arguments": mustJSON(tc.Input),
					},
				})
			}
			messages = append(messages, map[string]interface{}{
				"role":       "assistant",
				"tool_calls": oaiToolCalls,
			})
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
			case "google":
				// En Gemini: model devuelve functionCall, user responde con functionResponse
				messages = append(messages, map[string]interface{}{
					"role": "model",
					"parts": []map[string]interface{}{
						{"functionCall": map[string]interface{}{"name": tc.Name, "args": tc.Input}},
					},
				})
				var resultData interface{}
				json.Unmarshal([]byte(result), &resultData)
				messages = append(messages, map[string]interface{}{
					"role": "user",
					"parts": []map[string]interface{}{
						{"functionResponse": map[string]interface{}{
							"name":     tc.Name,
							"response": map[string]interface{}{"output": resultData},
						}},
					},
				})
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
			default: // OpenAI style — el mensaje "assistant" con tool_calls ya
				// se agregó una sola vez arriba, antes de este loop.
				messages = append(messages, map[string]interface{}{
					"role":         "tool",
					"tool_call_id": tc.ID,
					"content":      result,
				})
			}
		}
	}

	// Si el loop terminó sin contenido de texto (el modelo dejó de pedir tools
	// pero devolvió contenido vacío, o se agotaron las iteraciones) pero SÍ se
	// ejecutó al menos una tool, forzamos una última llamada sin tools para
	// que el modelo esté obligado a resumir en texto lo que ya se obtuvo —
	// los resultados de las tools ya están en `messages`, solo falta que el
	// modelo los redacte. Esto evita responder con un mensaje genérico cuando
	// en realidad sí hay datos reales para mostrar (ej. "dime qué cupos
	// tenemos" ejecuta buscar_productos correctamente pero el modelo no
	// siempre cierra con texto en la misma vuelta).
	if finalContent == "" && len(toolCallsSummary) > 0 {
		nudge := "Con los datos ya obtenidos arriba, respondé ahora en texto (sin usar herramientas) resumiendo el resultado para el usuario."
		if isGoogle {
			messages = append(messages, map[string]interface{}{
				"role":  "user",
				"parts": []map[string]string{{"text": nudge}},
			})
		} else {
			messages = append(messages, map[string]interface{}{
				"role":    "user",
				"content": nudge,
			})
		}

		var pr *providerResponse
		var err error
		switch provider.ProviderType {
		case "anthropic":
			pr, err = callAnthropicFull(provider, systemPrompt, messages, nil)
		case "google":
			pr, err = callGoogleFull(provider, systemPrompt, messages, nil)
		default:
			pr, err = callOpenAIFull(provider, messages, nil, false)
		}
		if err == nil && pr != nil && pr.Content != "" {
			finalContent = pr.Content
		} else {
			services.LogFailure("ai", fmt.Sprintf(
				"Chat de IA terminó sin respuesta de texto tras %d tool call(s) (usuario %s, proveedor %s)",
				len(toolCallsSummary), u.Email, provider.ProviderType))
		}
	}

	// Si de verdad no se ejecutó ninguna tool y el modelo no dijo nada, algo
	// falló en la conexión con el proveedor — evitamos un mensaje que insinúe
	// que se hizo algo cuando no se hizo nada.
	if finalContent == "" {
		finalContent = "No pude generar una respuesta en este momento. ¿Podés reformular tu pedido o intentar de nuevo?"
	}

	// Guardar mensajes de este intercambio
	if userID != uuid.Nil {
		// Crear registro de sesión si es nueva
		if isNewSession {
			preview := req.Message
			if len(preview) > 80 {
				preview = preview[:80] + "…"
			}
			database.DB.Create(&models.AISession{
				ID:     sessionID,
				UserID: userID,
				Title:  preview,
			})
		}

		database.DB.Create(&models.AIMessage{
			ID: uuid.New(), SessionID: sessionID, UserID: userID,
			Role: "user", Content: req.Message,
		})
		database.DB.Create(&models.AIMessage{
			ID: uuid.New(), SessionID: sessionID, UserID: userID,
			Role: "assistant", Content: finalContent,
		})

		// Auto-trim por volumen: si la sesión supera maxSessionMessages, borrar los más viejos
		var count int64
		database.DB.Model(&models.AIMessage{}).Where("session_id = ?", sessionID).Count(&count)
		if count > int64(maxSessionMessages) {
			excess := count - int64(maxSessionMessages)
			var oldest []models.AIMessage
			database.DB.Where("session_id = ?", sessionID).
				Order("created_at asc").
				Limit(int(excess)).
				Find(&oldest)
			for _, m := range oldest {
				database.DB.Delete(&m)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"role":       "assistant",
		"content":    finalContent,
		"tool_calls": toolCallsSummary,
		"sessionId":  sessionID.String(), // Siempre retornar para que el frontend lo persista
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

// ListAISessions devuelve únicamente las sesiones de chat del usuario
// autenticado — el historial de conversaciones es privado, no un listado
// global (antes no filtraba por usuario y cualquiera podía ver los títulos
// de las conversaciones de todos).
func ListAISessions(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}
	sessions := make([]models.AISession, 0)
	database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&sessions)
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// GetSessionMessages devuelve los mensajes de una sesión, solo si pertenece
// al usuario autenticado (o es admin).
func GetSessionMessages(c *gin.Context) {
	sessionID := c.Param("id")
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}

	var session models.AISession
	if err := database.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesión no encontrada"})
		return
	}
	role, _ := c.Get("role")
	if session.UserID != userID && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a esta sesión"})
		return
	}

	messages := make([]models.AIMessage, 0)
	database.DB.Where("session_id = ?", sessionID).Order("created_at asc").Find(&messages)
	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// DeleteSession elimina una sesión y sus mensajes, solo si pertenece al
// usuario autenticado (o es admin).
func DeleteSession(c *gin.Context) {
	sessionID := c.Param("id")
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}

	var session models.AISession
	if err := database.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesión no encontrada"})
		return
	}
	role, _ := c.Get("role")
	if session.UserID != userID && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a esta sesión"})
		return
	}

	database.DB.Where("session_id = ?", sessionID).Delete(&models.AIMessage{})
	database.DB.Delete(&session)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateSessionTitle renombra una sesión, solo si pertenece al usuario
// autenticado (o es admin).
func UpdateSessionTitle(c *gin.Context) {
	sessionID := c.Param("id")
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}

	var session models.AISession
	if err := database.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesión no encontrada"})
		return
	}
	role, _ := c.Get("role")
	if session.UserID != userID && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a esta sesión"})
		return
	}

	var input struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title es requerido"})
		return
	}
	database.DB.Model(&session).Update("title", input.Title)
	c.JSON(http.StatusOK, gin.H{"success": true, "title": input.Title})
}

// currentUserID resuelve el uuid del usuario autenticado desde el contexto Gin.
func currentUserID(c *gin.Context) (uuid.UUID, bool) {
	val, ok := c.Get("userID")
	if !ok {
		return uuid.Nil, false
	}
	s, ok := val.(string)
	if !ok {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
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
