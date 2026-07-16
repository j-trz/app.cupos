package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
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
	// PageContext describe en qué pantalla está el usuario y qué tiene
	// visible en este momento (ver AIPageContext.jsx en el frontend). Es
	// efímero: se usa solo para armar el prompt de este turno, nunca se
	// persiste en el historial de AIMessage.
	PageContext *PageContextInput `json:"pageContext,omitempty"`
	ExpertID    string            `json:"expertId"` // Experto elegido explícitamente por el usuario (opcional)
}

// PageContextInput es lo que el frontend manda en cada mensaje sobre la
// pantalla actual del usuario — ver frontend/src/contexts/AIPageContext.jsx.
type PageContextInput struct {
	Page         string             `json:"page"`
	VisibleItems []VisibleItemInput `json:"visibleItems"`
}

// VisibleItemInput es un ítem tal como el usuario lo ve en pantalla en este
// momento (puede diferir de una query cruda a la DB por filtros/orden
// aplicados en el cliente) — permite resolver referencias posicionales
// ("la primera opción") a un ID real.
type VisibleItemInput struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// UIAction es una acción que el backend le pide al frontend que ejecute
// (abrir un modal, completar un formulario, etc.) — nunca representa un
// cambio ya persistido en la DB, solo una instrucción de UI.
type UIAction struct {
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
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

func buildSystemPrompt(u userCtx, pageCtx *PageContextInput, experts []models.AIExpert) string {
	roleDesc := map[string]string{
		"admin":        "Administrador con acceso total al sistema",
		"agency_admin": "Administrador de agencia",
		"agency_user":  "Agente de viajes",
		"user":         "Agente de viajes",
	}[u.Role]
	if roleDesc == "" {
		roleDesc = "Agente de viajes"
	}

	// EXPERTOS DISPONIBLES: sección independiente del "permisos" de abajo —
	// se computa acá y se interpola aparte, cerca del cierre del prompt (ver
	// expertsSection más abajo en el fmt.Sprintf final).
	expertsSection := ""
	if len(experts) > 0 {
		var lines []string
		for _, e := range experts {
			desc := e.Description
			if desc == "" {
				desc = "sin descripción"
			}
			lines = append(lines, fmt.Sprintf("- %s: %s", e.Name, desc))
		}
		expertsSection = fmt.Sprintf(`
EXPERTOS DISPONIBLES (bases de conocimiento configuradas por tu agencia):
%s
Si el usuario pregunta algo que podría responderse con el conocimiento de alguno de estos expertos (políticas, FAQs, manuales, procedimientos internos, etc.), usá la tool "consultar_experto" pasando el nombre exacto del experto y la pregunta del usuario. No inventes contenido de estos temas sin haber consultado al experto primero.
`, strings.Join(lines, "\n"))
	}

	permisos := `PODÉS HACER (si te preguntan "qué podés hacer" / "qué sabés hacer", respondé con una lista COMPLETA y concreta basada en esto — nunca una respuesta vaga tipo "puedo ayudarte con reservas", nunca digas que no podés cambiar de pantalla o ejecutar acciones si más abajo figura que sí podés):
- Buscar productos/cupos disponibles por destino, compañía, tipo o código, y decirte la disponibilidad real
- Ver el detalle de tus propias reservas (fechas, estado, pasajeros, ficha, ticket)
- Crear una reserva nueva de punta a punta vos mismo, sin que el usuario tenga que tocar ningún formulario
- Abrir el formulario real de reserva en la pantalla del usuario y completarlo con los pasajeros que me indique (o que extraiga de una foto de DNI/pasaporte), para que él lo revise y confirme con su propio botón
- Leer fotos de documentos de identidad (DNI, pasaporte) — incluso varias juntas — para extraer nombre, apellido, documento, nacionalidad y fecha de nacimiento de cada pasajero
- Llevar al usuario a cualquier otra pantalla de la aplicación que me pida ver
- Pedir un vuelo a medida (Grupo) proponiendo una o más opciones de itinerario, ver el estado de tus propias solicitudes de grupo (pendiente/cotizada/aceptada/confirmada), aceptar una cotización cuando el admin la cargue, y solicitar la cancelación de un grupo ya confirmado

NO PODÉS HACER (si te preguntan, decilo con total claridad, no lo disimules ni des vueltas):
- Cambiar configuración del sistema, precios de productos, o datos de otros usuarios/agencias
- Modificar, corregir o eliminar una reserva ya creada (solo la podés crear; para editarla el usuario tiene que ir a la pantalla correspondiente)
- Ver reservas o datos de un usuario/agencia que no sea la del usuario que te está hablando`

	if u.Role == "admin" || u.Role == "agency_admin" {
		permisos += `

ADEMÁS, por tu rol también PODÉS:
- Ver TODAS las reservas de tu agencia (y las que gestionás por cesión/compartidas, si sos agency_admin) o del sistema entero (si sos admin)
- Confirmar cualquier reserva
- Ver estadísticas, reportes y la rentabilidad (ventas, costos y margen)
- Consultar qué permisos tiene un rol o un usuario puntual (herramienta "consultar_rol") — nunca modifica nada, solo lectura
- Ver todas las solicitudes de grupo de tu agencia (o del sistema entero si sos admin), cargarles la cotización (destino, compañía, condiciones, PNRs, netos, vencimientos), confirmarlas una vez que el usuario aceptó, y resolver (aprobar o rechazar) sus pedidos de cancelación

FLUJO PARA RENTABILIDAD / ESTADÍSTICAS (IMPORTANTE):
- Si te preguntan por rentabilidad, ganancia, margen, "cuánto ganamos", costos o similar, llamá SIEMPRE a la herramienta "rentabilidad" — nunca la calcules a mano combinando otros datos, ni la des por no disponible sin haberla llamado primero.
- Si te preguntan por totales generales (cuántas reservas, ventas totales, productos), usá "estadisticas".
- Si sos agency_admin, ambas herramientas ya vienen automáticamente acotadas a tu propia agencia — no hace falta que lo aclares al llamar la herramienta, pero comunicá el resultado como "de tu agencia" y no como el total del sistema.`
	}
	if u.Role == "admin" {
		permisos += `
- Cancelar/eliminar cualquier reserva del sistema
- Buscar usuarios del sistema
- (Por chat NO podés crear/editar usuarios ni tocar configuración del sistema — eso se hace desde las pantallas de administración, no puedo ejecutarlo yo)`
	}

	// PERMISOS GRANULARES: además del tier grueso de arriba (admin/
	// agency_admin/user), un usuario puede tener asignado un rol personalizado
	// (Gestión de Roles) con permisos MODULE_ACTION más finos — ver pero no
	// eliminar, crear pero no confirmar, etc. Admin bypassea todo así que no
	// hace falta listarlo; para el resto, esta es la fuente de verdad más
	// precisa si el usuario pregunta "¿puedo hacer X?" sobre una pantalla o
	// acción puntual del sitio.
	if u.Role != "admin" {
		userPerms := services.GetUserPermissions(u.ID)
		if len(userPerms) > 0 {
			var permList strings.Builder
			for _, p := range userPerms {
				permList.WriteString(fmt.Sprintf("- %s (%s)\n", p.Name, p.Code))
			}
			permisos += fmt.Sprintf(`

PERMISOS GRANULARES DE TU ROL ASIGNADO (más preciso que las listas de arriba para preguntas puntuales tipo "¿puedo eliminar X?" o "¿puedo ver la sección Y?" — si hay conflicto con lo de arriba, priorizá esto):
%s`, permList.String())
		}
	}

	// CONTEXTO DE PANTALLA — se arma solo si el frontend mandó pageContext en
	// este turno (ver PageContextInput). Es efímero, no se persiste.
	pageContextSection := ""
	if pageCtx != nil && pageCtx.Page != "" {
		var items strings.Builder
		if len(pageCtx.VisibleItems) == 0 {
			items.WriteString("(no hay ítems listados en este momento en esa pantalla)")
		} else {
			for i, item := range pageCtx.VisibleItems {
				label := item.Label
				if label == "" {
					label = item.ID
				}
				items.WriteString(fmt.Sprintf("%d. %s (id: %s)\n", i+1, label, item.ID))
			}
		}
		pageContextSection = fmt.Sprintf(`

CONTEXTO DE PANTALLA ACTUAL (IMPORTANTE):
- El usuario está ahora mismo en la pantalla: "%s".
- Esto es lo que tiene visible en este momento, en este orden (puede diferir de una consulta directa a la base de datos, por ejemplo si tiene un filtro aplicado en pantalla):
%s
- Si el usuario se refiere a algo por posición ("la primera opción", "el segundo", "esa última") o de forma ambigua, resolvelo contra ESTA lista usando el campo "posicion" de las herramientas que lo acepten (ej. abrir_modal_reserva) — no vuelvas a listar productos ni asumas cuál es sin confirmarlo contra esta lista.
- Si te preguntan qué hace un botón, una columna, o cómo funciona algo de esta pantalla, respondé en base a lo que ves acá y a tu conocimiento del sistema — nunca inventes una funcionalidad que no existe.
- Si esta pantalla tiene el formulario de reserva disponible (ej. "disponibilidad") y el usuario pide reservar algo, preferí abrir_modal_reserva + completar_formulario_pasajeros (así el usuario revisa y confirma él mismo desde el formulario real) en vez de crear_reserva directo — salvo que el usuario pida explícitamente que reserves sin que él tenga que confirmar nada, en cuyo caso usá crear_reserva como siempre.`,
			pageCtx.Page, items.String())
	}

	agenciaLabel := u.Agencia
	if agenciaLabel == "" {
		agenciaLabel = "tu agencia"
	}

	return fmt.Sprintf(`Eres un asistente IA especializado en gestión de cupos de viajes. Eres directo, resolutivo y evitas pedir información que ya puedes obtener del sistema.

PERSONA (IMPORTANTE): actuás como un compañero de trabajo más de "%s" — no como un proveedor externo, un bot de soporte genérico, ni un vendedor. Hablá como alguien de adentro de esa agencia: usá "nuestros cupos", "nuestras reservas", "tu agencia" con naturalidad, y mostrá que conocés el contexto de con quién estás hablando (su nombre, su rol). Mantené igual el mismo profesionalismo y las reglas de seguridad de abajo — ser cercano no significa aflojar ninguna restricción de datos.

USUARIO ACTUAL:
- Nombre: %s
- Email: %s
- Rol: %s (%s)
- Agencia: %s
- ID interno: %s

REGLAS DE SEGURIDAD (CRÍTICAS - nunca las ignores):
1. Un usuario con rol "user" o "agency_user" SOLO puede ver sus propias reservas. NUNCA muestres reservas de otros usuarios.
2. Para un usuario con rol "user" o "agency_user", los siguientes datos son SIEMPRE confidenciales — nunca los menciones, calcules ni infieras, ni siquiera de sus propias reservas: el precio neto/costo (neto_1), el campo "op" de un producto, la rentabilidad/margen/ganancia, y cualquier dato de cesión o cupos compartidos entre agencias (de qué agencia vino un cupo cedido, ids de transferencia). Esos usuarios operan 100%% de cara a SU propia gestión — reservar, consultar sus reservas, agregar documentación — nunca datos financieros ni de otra agencia.
3. Datos de otros usuarios, de otras agencias, o financieros (neto, rentabilidad, estadísticas globales) solo los puede ver admin o agency_admin — y agency_admin únicamente los de SU PROPIA agencia, nunca los de otra.
4. Siempre verifica el rol antes de ejecutar acciones sensibles o antes de compartir un dato financiero.
5. Si un usuario pide algo fuera de sus permisos (ej. rentabilidad, precios netos, reservas de otra agencia), no lo intentes calcular ni aproximar de igual forma — explícale amablemente y con claridad que no tiene acceso a ese dato, sin dar ninguna cifra ni pista al respecto.

REGLA ANTI-INVENCIÓN (CRÍTICA — nunca la ignores):
- NUNCA respondas con fechas, precios, estados, destinos u otro dato de una reserva o producto de memoria o "a ojo". Cada dato concreto que menciones tiene que venir de una llamada a una herramienta en ESTE turno o en uno anterior de la misma conversación.
- Si no tenés el dato real todavía, tenés que llamar a la herramienta correspondiente antes de responder — nunca falta información que el sistema ya tiene.
- Si después de llamar a la herramienta el dato no está disponible (ej. la reserva no existe, o el campo vino vacío), decilo explícitamente ("no tengo registrada esa fecha") en vez de inventar un valor plausible.

FLUJO PARA CONSULTAR RESERVAS (fechas, estado, pasajeros, precios — IMPORTANTE, seguir exactamente):
1. Si el usuario pregunta cualquier cosa sobre UNA reserva existente (cuándo sale, estado, precio, pasajeros, ficha, ticket, etc.), primero llamá a "mis_reservas" ANTES de responder — incluso si te "suena" que ya lo sabés por el contexto. "mis_reservas" ya trae todos los campos de cada reserva, incluido el número de pedido.
2. Usá "detalle_reserva" solo cuando ya tengas el ID numérico interno de una reserva puntual (obtenido de un resultado previo de "mis_reservas" o "todas_reservas" en esta misma conversación) y quieras refrescar/confirmar ese registro específico — nunca le pidas al usuario ese ID interno, ni le pases el número de pedido como si fuera el ID.
3. Si el usuario tiene varias reservas y no especificó cuál, mostrale la lista (de mis_reservas) para que elija, en vez de asumir cuál es.
4. Recién con el resultado real de la herramienta en mano, respondé la pregunta puntual del usuario usando esos datos — no repitas toda la reserva si te preguntó solo una cosa puntual (ej. solo la fecha de salida).

ITINERARIO EN PDF Y DETALLE DE RUTA (IMPORTANTE):
- Si te piden el itinerario, el "PDF del viaje", o un comprobante de una reserva, usá "generar_itinerario_pdf".
- Si te piden el detalle de vuelos/ruta "para copiar y pegar" en un email o WhatsApp, usá "detalle_ruta".
- En ambos casos, identificá la reserva por el número de pedido/localizador o por destino/nombre — NUNCA le pidas al usuario el ID interno.
- Si la herramienta devuelve un campo "error", transmitíselo tal cual al usuario (puede ser que no exista, que sea ambigua, o que necesites pedirle que precise cuál); si devuelve "tipo", ya se generó correctamente y el sistema le muestra la tarjeta correspondiente — no repitas todos los datos en el texto, con confirmar que está listo alcanza.

%s

FLUJO PARA CREAR RESERVA (IMPORTANTE - seguir exactamente):
1. Cuando el usuario quiera reservar, llama SIEMPRE a buscar_productos con solo_disponibles="true".
2. Presenta los productos como lista numerada: número, destino, compañía, salida/regreso, precio, cupos. Ej: "1. Cancún - Aerolíneas - $850 - 5 cupos"
3. Pide al usuario que elija por número. NUNCA le pidas al usuario el ID interno del producto (product_id).
4. Una vez que el usuario elija el número de la lista, tú internamente DEBES mapear ese número al "id" real del producto que obtuviste de buscar_productos.
5. Pide SOLO lo que falte para reservar: datos del o los pasajeros. Fecha de nacimiento, tipo de pasajero (Adulto/Menor/Infante) y ficha de venta son OBLIGATORIOS — nunca llames a crear_reserva sin los tres, y nunca inventes un valor para ninguno. El tipo de pasajero podés inferirlo vos mismo de la fecha de nacimiento (menor a 2 años = Infante, de 2 a 11 = Menor, 12 o más = Adulto) sin necesidad de preguntarlo aparte; la ficha de venta en cambio NUNCA se puede inferir — siempre hay que pedírsela al usuario, incluso si adjuntó un DNI.
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

FLUJO PARA GRUPOS (vuelos a medida — IMPORTANTE, seguir exactamente):
1. "Grupo" es distinto de una reserva sobre un producto ya cargado: es un vuelo a medida que el usuario propone y el admin cotiza después. Usalo cuando el usuario pida algo que no es un cupo ya publicado (ej. "necesito un vuelo grupal a Cancún para 15 personas", "quiero armar un charter").
2. Pedí SIEMPRE la cantidad de lugares y al menos un itinerario propuesto (texto libre: aerolínea, fechas, tramos — lo que el usuario tenga, no hace falta que esté estructurado). El usuario puede dar más de una opción de itinerario si quiere que el admin le cotice varias alternativas — cada opción es un texto separado.
3. Con esos datos llamá a "solicitar_grupo". Nunca inventes un itinerario si el usuario no te dio ninguno — preguntáselo antes de llamar la herramienta.
4. Después de crear la solicitud, avisale al usuario que el administrador va a cargar la cotización y que se la vas a poder mostrar apenas esté lista (llamando a "mis_grupos" cuando pregunte por el estado).
5. Cuando "mis_grupos" muestre una opción con estado_cotizacion "cotizada", mostrale al usuario los datos cargados (condiciones, PNRs, netos, vencimiento) y preguntale si la acepta. Si dice que sí, llamá a "aceptar_cotizacion_grupo" — nunca la aceptes sin que el usuario lo confirme explícitamente. Si hay varias opciones cotizadas de la misma solicitud, dejá que elija cuál.
6. Una vez aceptada, el grupo queda esperando la confirmación del admin — no hay nada más que el usuario pueda hacer hasta entonces salvo consultar el estado.
7. Si el usuario pide cancelar un grupo ya confirmado, llamá a "solicitar_cancelacion_grupo" (nunca lo canceles vos directamente — el admin tiene que aprobarlo).
8. Si sos admin/agency_admin y te piden cargar o revisar cotizaciones de grupos, usá "todos_los_grupos" para listarlas y "cotizar_grupo" para completar los datos — pedile al usuario/admin los valores concretos antes de llamarla, nunca inventes condiciones, PNRs o montos. Cargar los datos NO le avisa nada al usuario todavía: una vez que condiciones, neto/precio y vencimiento_cotizacion estén completos, llamá "enviar_cotizacion_grupo" para pasarla a "cotizada" y recién ahí notificarlo — si falta algo, la tool devuelve el motivo puntual, pasáselo al admin.

LECTURA DE DOCUMENTOS DE IDENTIDAD:
- Cuando el usuario adjunte una imagen, extrae: nombre, apellido, número de documento, fecha de nacimiento, nacionalidad, vencimiento.
- Confirma los datos extraídos brevemente y úsalos para la reserva.
- La ficha de venta NUNCA viene en un DNI — aunque hayas extraído todo el resto de una imagen, siempre tenés que preguntarle al usuario la ficha de venta antes de reservar.
- Si hay CONTEXTO DE PANTALLA con el formulario de reserva disponible, preferí llamar a completar_formulario_pasajeros con los datos extraídos (así el usuario ve y confirma el formulario ya completado) en vez de crear_reserva directo, salvo que el usuario haya pedido explícitamente que reserves sin confirmar nada.

NAVEGACIÓN ENTRE PANTALLAS (IMPORTANTE):
- Si el usuario pide ir a, ver, o que le muestres otra sección de la app (ej. "llevame a confirmaciones", "mostrame mis solicitudes", "andá a disponibilidad"), llamá a navegar_a_pantalla — nunca respondas que no podés cambiar de pantalla, esa herramienta existe justamente para eso.
- Esto funciona sin importar en qué pantalla esté el usuario ahora mismo (a diferencia de abrir_modal_reserva/completar_formulario_pasajeros, que necesitan que la pantalla de destino ya esté abierta).
- Si además de navegar el usuario pidió hacer algo en la pantalla de destino (ej. "llevame a disponibilidad y reservame la primera opción" sin estar ya ahí), navegá primero, confirmale que ya lo llevaste, y pedile que repita el pedido puntual una vez ahí — no intentes encadenar abrir_modal_reserva en el mismo turno porque la pantalla nueva todavía no cargó.
- Si el usuario no tiene acceso a esa pantalla, navegar_a_pantalla te lo va a decir — explicáselo con amabilidad, no insistas.

MEMORIA DE CONVERSACIÓN (MUY IMPORTANTE):
- Tienes acceso al historial completo de esta sesión.
- NO repitas preguntas que ya fueron respondidas en turnos anteriores.
- Si el usuario ya eligió un producto, ya sabes cuál es — no vuelvas a listar ni a preguntar.
- Si ya tienes nombre, documento u otros datos del pasajero, no los pidas de nuevo.
- Avanza siempre hacia el siguiente paso pendiente.
%s
%s
Responde siempre en español, de forma clara y concisa.`,
		agenciaLabel, u.Nombre, u.Email, roleDesc, u.Role, u.Agencia, u.ID, permisos, pageContextSection, expertsSection)
}

// ─────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────

type ToolParam struct {
	Type        string               `json:"type"`
	Description string               `json:"description,omitempty"`
	Properties  map[string]ToolParam `json:"properties,omitempty"`
	Items       *ToolParam           `json:"items,omitempty"`
	Required    []string             `json:"required,omitempty"`
	Enum        []string             `json:"enum,omitempty"`
}

type ToolDef struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Parameters  ToolParam `json:"parameters"`
}

// knownPage es una pantalla a la que la IA puede navegar con el tool
// navegar_a_pantalla — RequireRole vacío significa que cualquier rol
// autenticado puede ir ahí.
type knownPage struct {
	Path        string
	Label       string
	RequireRole string // "" | "admin" | "admin_or_agency_admin"
}

var knownPages = map[string]knownPage{
	"dashboard":             {Path: "/dashboard", Label: "Dashboard"},
	"disponibilidad":        {Path: "/availability", Label: "Disponibilidad"},
	"solicitudes":           {Path: "/requests", Label: "Solicitudes"},
	"confirmaciones":        {Path: "/confirmations", Label: "Confirmaciones"},
	"documentacion":         {Path: "/documentacion/disponibilidad", Label: "Documentación"},
	"perfil":                {Path: "/profile", Label: "Perfil"},
	"notificaciones":        {Path: "/notificaciones", Label: "Notificaciones"},
	"productos":             {Path: "/productos", Label: "Gestión de Productos", RequireRole: "admin"},
	"grupos":                {Path: "/grupos", Label: "Grupos", RequireRole: "admin_or_agency_admin"},
	"agencias":              {Path: "/agencias", Label: "Gestión de Agencias", RequireRole: "admin"},
	"reservas":              {Path: "/reservas", Label: "Gestión de Reservas", RequireRole: "admin"},
	"nominas":               {Path: "/nominas", Label: "Nóminas", RequireRole: "admin"},
	"reportes":              {Path: "/reportes", Label: "Reportes", RequireRole: "admin_or_agency_admin"},
	"logs":                  {Path: "/logs", Label: "Logs del sitio", RequireRole: "admin"},
	"usuarios":              {Path: "/usuarios", Label: "Gestión de Usuarios", RequireRole: "admin"},
	"roles":                 {Path: "/roles", Label: "Roles", RequireRole: "admin"},
	"permisos":              {Path: "/permisos", Label: "Permisos", RequireRole: "admin"},
	"diseno":                {Path: "/marca-blanca", Label: "Diseño / White Label", RequireRole: "admin"},
	"email":                 {Path: "/email-config", Label: "Configuración de Email", RequireRole: "admin"},
	"config-notificaciones": {Path: "/notification-config", Label: "Plantillas de Notificaciones", RequireRole: "admin"},
	"config-ia":             {Path: "/config-ia", Label: "Configuración de IA", RequireRole: "admin"},
	"ajustes":               {Path: "/settings", Label: "Ajustes generales", RequireRole: "admin"},
}

// knownPageKeys deja fijo el orden de las claves de knownPages, para usarlo
// como Enum del tool (evita que el modelo escriba variantes libres del
// nombre de la pantalla) y en mensajes de error.
var knownPageKeys = func() []string {
	keys := make([]string, 0, len(knownPages))
	for k := range knownPages {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}()

func getTools(role string, experts []models.AIExpert) []ToolDef {
	tools := []ToolDef{
		{
			Name:        "buscar_productos",
			Description: "Busca productos/cupos disponibles por destino, compañía, tipo o código. Usar para ver disponibilidad.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"query":            {Type: "string", Description: "Texto libre para buscar (destino, compañía, código)"},
					"tipo":             {Type: "string", Description: "Tipo de producto: CUPOS, CHARTERS, DESTINO ARG"},
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
			Description: "Crea una nueva reserva. El precio se toma automáticamente del producto — nunca pedir al usuario. ficha_venta, pasajero_nacimiento y pasajero_tipo son obligatorios: si el usuario no los dio (ni vienen de un DNI adjuntado), pedíselos antes de llamar a esta herramienta — no la llames con esos campos vacíos ni inventes valores.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"product_id":            {Type: "string", Description: "ID numérico del producto (obtenido de buscar_productos)"},
					"contacto_nombre":       {Type: "string", Description: "Nombre completo del contacto/pasajero principal"},
					"contacto_email":        {Type: "string", Description: "Email de contacto (opcional)"},
					"contacto_telefono":     {Type: "string", Description: "Teléfono de contacto (opcional)"},
					"pasajero_nombre":       {Type: "string", Description: "Nombre del pasajero (del DNI si fue adjuntado)"},
					"pasajero_apellido":     {Type: "string", Description: "Apellido del pasajero (del DNI si fue adjuntado)"},
					"pasajero_documento":    {Type: "string", Description: "Número de documento del pasajero"},
					"pasajero_nacionalidad": {Type: "string", Description: "Nacionalidad del pasajero"},
					"pasajero_nacimiento":   {Type: "string", Description: "OBLIGATORIO. Fecha de nacimiento del pasajero en formato YYYY-MM-DD (del DNI si fue adjuntado, o preguntada al usuario)"},
					"pasajero_tipo":         {Type: "string", Description: "OBLIGATORIO. Tipo de pasajero.", Enum: []string{"Adulto", "Menor", "Infante"}},
					"ficha_venta":           {Type: "string", Description: "OBLIGATORIO. Ficha de venta / número de ficha interno de la agencia — preguntarle siempre al usuario, nunca inventar un valor."},
				},
				Required: []string{"product_id", "contacto_nombre", "pasajero_nacimiento", "pasajero_tipo", "ficha_venta"},
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
		{
			Name:        "abrir_modal_reserva",
			Description: "Abre el formulario visual de reserva en la pantalla actual del usuario, para un producto puntual — todavía NO crea la reserva, el usuario la confirma manualmente después desde el formulario real. Preferir esto sobre crear_reserva cuando hay CONTEXTO DE PANTALLA con el formulario disponible y el usuario no pidió explícitamente que reserves sin que él confirme.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"product_id": {Type: "string", Description: "ID numérico del producto, si ya se conoce (ej. de una búsqueda previa con buscar_productos)"},
					"posicion":   {Type: "string", Description: "Posición dentro de la lista de ítems que el usuario tiene visible en pantalla ahora mismo (1 = el primero, 2 = el segundo, etc.) — usar cuando el usuario se refiere a 'la primera opción', 'el segundo', etc. en vez de dar un ID"},
				},
			},
		},
		{
			Name:        "completar_formulario_pasajeros",
			Description: "Completa el formulario de pasajeros ya abierto en pantalla (ver abrir_modal_reserva) con los datos indicados, o con filas vacías si todavía no se conocen los datos. Usar cuando el usuario dice cuántos pasajeros son, o cuando adjuntó fotos de documentos de identidad y hay un formulario de reserva abierto en pantalla.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"pasajeros": {
						Type:        "array",
						Description: "Lista de pasajeros con datos ya conocidos (ej. extraídos de una foto de DNI/pasaporte). Omitir si todavía no se conocen los datos y solo se sabe la cantidad.",
						Items: &ToolParam{
							Type: "object",
							Properties: map[string]ToolParam{
								"nombre":        {Type: "string"},
								"apellido":      {Type: "string"},
								"documento":     {Type: "string"},
								"nacimiento":    {Type: "string", Description: "Fecha de nacimiento en formato YYYY-MM-DD"},
								"nacionalidad":  {Type: "string"},
								"tipo_pasajero": {Type: "string", Enum: []string{"Adulto", "Menor", "Infante"}},
							},
						},
					},
					"cantidad_pasajeros": {Type: "string", Description: "Cantidad de filas de pasajero vacías a crear si todavía no se conocen los datos (ej. el usuario dijo 'somos 3' pero no dio nombres todavía). Ignorado si se manda 'pasajeros'."},
				},
			},
		},
		{
			Name:        "navegar_a_pantalla",
			Description: "Lleva al usuario a otra pantalla de la aplicación (cambia de página). Usar cuando pida ir a, ver, o mostrar una sección de la app (ej. 'llevame a confirmaciones', 'mostrame mis solicitudes'). No sirve para abrir un modal dentro de la pantalla actual — para eso usar abrir_modal_reserva.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"pagina": {Type: "string", Enum: knownPageKeys, Description: "Clave de la pantalla destino"},
				},
				Required: []string{"pagina"},
			},
		},
		{
			Name:        "mis_grupos",
			Description: "Lista las solicitudes de grupo (vuelos a medida) del usuario actual, con su estado de cotización y de reserva. Para admins/agency_admin, solo trae las propias — para ver todas usar todos_los_grupos.",
			Parameters:  ToolParam{Type: "object", Properties: map[string]ToolParam{}},
		},
		{
			Name:        "solicitar_grupo",
			Description: "Crea una solicitud de vuelo a medida (grupo) con una o más opciones de itinerario candidatas. El admin va a cotizar cada opción y el usuario elige cuál aceptar.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"cantidad_lugares": {Type: "string", Description: "OBLIGATORIO. Cantidad de lugares/pasajeros del grupo."},
					"notas_vendedor":   {Type: "string", Description: "Notas generales sobre la solicitud (opcional)."},
					"opciones": {
						Type:        "array",
						Description: "OBLIGATORIO. Al menos una opción de itinerario propuesta por el usuario (texto libre — lo que haya dado, no hace falta estructurado).",
						Items: &ToolParam{
							Type: "object",
							Properties: map[string]ToolParam{
								"itinerario": {Type: "string", Description: "Itinerario propuesto para esta opción"},
								"notas":      {Type: "string", Description: "Aclaración puntual de esta opción (opcional)"},
							},
						},
					},
				},
				Required: []string{"cantidad_lugares", "opciones"},
			},
		},
		{
			Name:        "aceptar_cotizacion_grupo",
			Description: "Acepta una opción de grupo ya cotizada (estado_cotizacion = 'cotizada'). Si la solicitud tenía otras opciones, quedan rechazadas automáticamente. Nunca llamar sin que el usuario confirme explícitamente que quiere aceptar esa opción puntual.",
			Parameters: ToolParam{
				Type:       "object",
				Properties: map[string]ToolParam{"grupo_id": {Type: "string", Description: "ID numérico de la opción de grupo (obtenido de mis_grupos)"}},
				Required:   []string{"grupo_id"},
			},
		},
		{
			Name:        "solicitar_cancelacion_grupo",
			Description: "Solicita la cancelación de un grupo ya confirmado (estado_reservar = 'confirmada'). El admin tiene que aprobarla — esto no cancela nada por sí solo.",
			Parameters: ToolParam{
				Type:       "object",
				Properties: map[string]ToolParam{"grupo_id": {Type: "string", Description: "ID numérico del grupo"}},
				Required:   []string{"grupo_id"},
			},
		},
		{
			Name: "generar_itinerario_pdf",
			Description: "Genera los datos para armar el itinerario de vuelo en PDF de UNA reserva propia del usuario " +
				"(o de su agencia si es agency_admin/admin). Identificá la reserva por el número de pedido/localizador " +
				"si el usuario lo mencionó, o por destino/nombre de contacto si no. NUNCA le pidas al usuario el ID " +
				"interno de la reserva — si no tenés con qué identificarla, usá mis_reservas primero o preguntá el destino/pedido.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"identificador": {Type: "string", Description: "Número de pedido/localizador, ID interno (si ya lo conocés de otra tool), o destino/nombre de contacto para buscar la reserva"},
				},
				Required: []string{"identificador"},
			},
		},
		{
			Name: "detalle_ruta",
			Description: "Devuelve el detalle de vuelos/ruta de UNA reserva propia del usuario, en formato tabla, " +
				"'listo para copiar y pegar' en un email o WhatsApp. Mismo criterio de identificación que generar_itinerario_pdf.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"identificador": {Type: "string", Description: "Número de pedido/localizador, ID interno, o destino/nombre de contacto"},
				},
				Required: []string{"identificador"},
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
						"estado":  {Type: "string", Description: "Filtrar por estado"},
						"agencia": {Type: "string", Description: "Filtrar por agencia"},
						"limit":   {Type: "string", Description: "Cantidad (default 20)"},
					},
				},
			},
			ToolDef{
				Name:        "estadisticas",
				Description: "Obtiene estadísticas del sistema: reservas, ventas, productos. Si el rol es agency_admin, viene acotado a su propia agencia.",
				Parameters:  ToolParam{Type: "object", Properties: map[string]ToolParam{}},
			},
			ToolDef{
				Name:        "rentabilidad",
				Description: "Calcula la rentabilidad de las reservas confirmadas: ventas totales, costo total (neto), ganancia y margen %. Si el rol es agency_admin, viene acotado a su propia agencia (no puede ver la de otras).",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"agencia": {Type: "string", Description: "Filtrar por una agencia puntual (solo tiene efecto si el rol es admin; agency_admin siempre ve únicamente su propia agencia)"},
					},
				},
			},
			ToolDef{
				Name:        "confirmar_reserva",
				Description: "Confirma una reserva cambiando su estado a 'confirmado'.",
				Parameters: ToolParam{
					Type:       "object",
					Properties: map[string]ToolParam{"reserva_id": {Type: "string", Description: "ID de la reserva"}},
					Required:   []string{"reserva_id"},
				},
			},
			ToolDef{
				Name:        "consultar_rol",
				Description: "Consulta, de solo lectura, qué permisos tiene un rol del sistema (por nombre o código) o un usuario (por email) — para responder preguntas tipo '¿qué puede hacer el rol Supervisor?' o '¿qué permisos tiene fulano@agencia.com?'. Nunca modifica nada.",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"rol":   {Type: "string", Description: "Nombre o código del rol a consultar (ej. 'Supervisor de Ventas' o 'SALES_SUPERVISOR')"},
						"email": {Type: "string", Description: "Email del usuario cuyo rol/permisos se quiere consultar"},
					},
				},
			},
			ToolDef{
				Name:        "todos_los_grupos",
				Description: "Lista todas las solicitudes de grupo (vuelos a medida) — de tu agencia si sos agency_admin, o del sistema entero si sos admin.",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"estado_cotizacion": {Type: "string", Description: "Filtrar por estado de cotización: pendiente, cotizada, aceptada, rechazada"},
						"estado_reservar":   {Type: "string", Description: "Filtrar por estado de reserva: confirmada, cancelacion_solicitada, cancelada"},
						"limit":             {Type: "string", Description: "Cantidad de resultados (default 20)"},
					},
				},
			},
			ToolDef{
				Name:        "cotizar_grupo",
				Description: "Completa o corrige los datos de cotización de una opción de grupo. Solo mandar los campos que el admin efectivamente indicó — nunca inventar condiciones, PNRs o montos que no te dieron.",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"grupo_id":               {Type: "string", Description: "ID numérico de la opción de grupo (obtenido de todos_los_grupos)"},
						"destino":                {Type: "string"},
						"compania":               {Type: "string"},
						"condiciones":            {Type: "string"},
						"id_aerolinea":           {Type: "string"},
						"pnr_airline":            {Type: "string"},
						"pnr_agency":             {Type: "string"},
						"neto_01":                {Type: "string", Description: "Neto 01 (número)"},
						"neto_liberado":          {Type: "string", Description: "Neto liberado (número)"},
						"cantidad_liberados":     {Type: "string", Description: "Cantidad de lugares liberados (número)"},
						"salida":                 {Type: "string", Description: "Fecha de salida en formato YYYY-MM-DD"},
						"regreso":                {Type: "string", Description: "Fecha de regreso en formato YYYY-MM-DD"},
						"vencimiento_cotizacion": {Type: "string", Description: "Fecha en formato YYYY-MM-DD"},
						"vencimiento_pago":       {Type: "string", Description: "Fecha en formato YYYY-MM-DD"},
					},
					Required: []string{"grupo_id"},
				},
			},
			ToolDef{
				Name:        "enviar_cotizacion_grupo",
				Description: "Envía al usuario la cotización cargada con 'cotizar_grupo', pasándola a estado 'cotizada' — recién ahí el usuario la puede ver/aceptar. Falla con el motivo puntual si faltan condiciones, neto/precio o vencimiento_cotizacion.",
				Parameters: ToolParam{
					Type:       "object",
					Properties: map[string]ToolParam{"grupo_id": {Type: "string", Description: "ID numérico de la opción de grupo"}},
					Required:   []string{"grupo_id"},
				},
			},
			ToolDef{
				Name:        "confirmar_grupo",
				Description: "Confirma un grupo cuya cotización ya fue aceptada por el usuario — recién ahí se le revelan al usuario los datos de nominación, emisión y gastos.",
				Parameters: ToolParam{
					Type:       "object",
					Properties: map[string]ToolParam{"grupo_id": {Type: "string", Description: "ID numérico del grupo"}},
					Required:   []string{"grupo_id"},
				},
			},
			ToolDef{
				Name:        "resolver_cancelacion_grupo",
				Description: "Aprueba o rechaza un pedido de cancelación de grupo pendiente.",
				Parameters: ToolParam{
					Type: "object",
					Properties: map[string]ToolParam{
						"grupo_id": {Type: "string", Description: "ID numérico del grupo"},
						"decision": {Type: "string", Enum: []string{"approve", "decline"}, Description: "'approve' para aprobar la cancelación, 'decline' para rechazarla"},
						"notas":    {Type: "string", Description: "Notas sobre la decisión (opcional)"},
					},
					Required: []string{"grupo_id", "decision"},
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
					Type:       "object",
					Properties: map[string]ToolParam{"reserva_id": {Type: "string", Description: "ID de la reserva"}},
					Required:   []string{"reserva_id"},
				},
			},
		)
	}

	if len(experts) > 0 {
		names := make([]string, 0, len(experts))
		for _, e := range experts {
			names = append(names, e.Name)
		}
		tools = append(tools, ToolDef{
			Name:        "consultar_experto",
			Description: "Consulta la base de conocimiento de un experto configurado por tu agencia (políticas, FAQs, manuales, procedimientos) para responder preguntas sobre ese contenido específico.",
			Parameters: ToolParam{
				Type: "object",
				Properties: map[string]ToolParam{
					"experto":  {Type: "string", Enum: names, Description: "Nombre exacto del experto a consultar"},
					"pregunta": {Type: "string", Description: "Pregunta del usuario a responder con el conocimiento de ese experto"},
				},
				Required: []string{"experto", "pregunta"},
			},
		})
	}

	return tools
}

// isRegularUser returns true for non-admin roles (agency_user, user, etc.)
func isRegularUser(role string) bool {
	return role != "admin" && role != "agency_admin"
}

// sanitizeReservationForUser oculta, para un rol "user"/"agency_user", todo
// dato financiero (neto_1) y de cesión/transferencia entre agencias
// (transfer_id, original_agency) — el chat de IA es una superficie más
// restrictiva que el resto de la UI para estos campos, ni siquiera de su
// propia reserva debe verlos (ver REGLAS DE SEGURIDAD en buildSystemPrompt).
func sanitizeReservationForUser(r *models.Reservation) {
	r.Neto1 = 0
	r.TransferID = nil
	r.OriginalAgency = ""
}

// ─────────────────────────────────────────────
// ITINERARIO / DETALLE DE RUTA (generar_itinerario_pdf, detalle_ruta)
// ─────────────────────────────────────────────

// DTOs de salida explícitos y deliberadamente acotados: este documento se
// comparte con el pasajero/cliente, así que es MÁS restrictivo que
// sanitizeReservationForUser (nunca incluye neto, op, transfer_id, notas
// internas, doc_contable — ni siquiera para agency_admin).
type itinerarioReservaDTO struct {
	ID               uint   `json:"id"`
	PedidoID         string `json:"pedido_id"`
	Estado           string `json:"estado"`
	ContactoNombre   string `json:"contacto_nombre"`
	ContactoEmail    string `json:"contacto_email"`
	ContactoTelefono string `json:"contacto_telefono"`
	Agencia          string `json:"agencia"`
}

type itinerarioProductoDTO struct {
	ID           uint   `json:"id"`
	CodigoCupo   string `json:"codigo_cupo"`
	Destino      string `json:"destino"`
	Compania     string `json:"compania"`
	FechaSalida  string `json:"fecha_salida"`
	FechaRegreso string `json:"fecha_regreso"`
	// Ruta se pasa cruda (string tal cual en Product.Ruta): el parser rico
	// (JSON estructurado o texto GDS con heurísticas) ya vive en el frontend
	// (ItineraryTable.parseRuta) y no debe reimplementarse acá.
	Ruta string `json:"ruta"`
}

type itinerarioPasajeroDTO struct {
	Nombre       string `json:"nombre"`
	Apellido     string `json:"apellido"`
	Documento    string `json:"documento"`
	Nacionalidad string `json:"nacionalidad"`
	TipoPasajero string `json:"tipo_pasajero"`
	NumeroTicket string `json:"numero_ticket,omitempty"`
}

// buildPasajerosDTO arma la lista de pasajeros de una reserva, con fallback a
// los campos *Pasajero sueltos de Reservation para reservas viejas creadas
// sin desglose de pasajeros (ver comentario de Reservation.Passengers).
func buildPasajerosDTO(reserva *models.Reservation) []itinerarioPasajeroDTO {
	var passengers []models.Passenger
	database.DB.Where("reservation_id = ?", reserva.ID).Order("nro desc, id asc").Find(&passengers)

	if len(passengers) > 0 {
		out := make([]itinerarioPasajeroDTO, 0, len(passengers))
		for _, p := range passengers {
			out = append(out, itinerarioPasajeroDTO{
				Nombre: p.Nombre, Apellido: p.Apellido, Documento: p.Documento,
				Nacionalidad: p.Nacionalidad, TipoPasajero: p.TipoPasajero, NumeroTicket: p.NumeroTicket,
			})
		}
		return out
	}
	if reserva.NombrePasajero != "" {
		return []itinerarioPasajeroDTO{{
			Nombre: reserva.NombrePasajero, Apellido: reserva.ApellidoPasajero,
			Documento: reserva.DocumentoPasajero, Nacionalidad: reserva.NacionalidadPasajero,
			TipoPasajero: reserva.TipoPasajero,
		}}
	}
	return []itinerarioPasajeroDTO{}
}

// resolveReservaParaItinerario busca UNA reserva accesible por el usuario a
// partir de un identificador en texto libre (ID interno, pedido_id/localizador,
// o texto libre como destino/nombre). El scope de propiedad/agencia se aplica
// SIEMPRE dentro de la propia query SQL — así una reserva ajena es
// indistinguible de una que no existe, ni siquiera vía el resultado crudo de
// la tool se puede inferir que existe una reserva de otro usuario (mismo
// criterio que detalle_reserva/GetReservationByID, pero "buscar primero,
// autorizar después" no es aceptable acá porque el mensaje de error es lo
// único que puede filtrar información).
func resolveReservaParaItinerario(identificador string, u userCtx) (*models.Reservation, *models.Product, string) {
	identificador = strings.TrimSpace(identificador)
	if identificador == "" {
		return nil, nil, "Necesito el número de pedido/localizador, o el destino de la reserva, para poder buscarla."
	}

	scoped := func() *gorm.DB {
		q := database.DB.Model(&models.Reservation{})
		if isRegularUser(u.Role) {
			q = q.Where("created_by = ?", u.ID)
		} else if u.Role == "agency_admin" {
			q = q.Where(
				"LOWER(agencia) = LOWER(?) OR product_id IN (SELECT id FROM products WHERE LOWER(agencia) = LOWER(?))",
				u.Agencia, u.Agencia,
			)
		}
		return q
	}

	var reservas []models.Reservation
	seen := make(map[uint]bool)
	addUnique := func(list []models.Reservation) {
		for _, r := range list {
			if !seen[r.ID] {
				seen[r.ID] = true
				reservas = append(reservas, r)
			}
		}
	}

	// 1) ID interno (si la IA ya lo obtuvo de mis_reservas/detalle_reserva antes)
	// y 2) Pedido/localizador (parcial, case-insensitive) — se corren SIEMPRE
	// ambas, en vez de solo intentar la segunda si la primera no dio
	// resultados: un pedido_id que por coincidencia sea puramente numérico
	// podría matchear el ID interno de OTRA reserva distinta, y devolver esa
	// silenciosamente sería peor que declarar la ambigüedad y pedir precisar.
	if id, err := strconv.ParseUint(identificador, 10, 64); err == nil {
		var porID []models.Reservation
		scoped().Where("id = ?", id).Limit(2).Find(&porID)
		addUnique(porID)
	}
	like := "%" + strings.ToLower(identificador) + "%"
	var porPedido []models.Reservation
	scoped().Where("LOWER(pedido_id) LIKE ?", like).Order("created_at desc").Limit(6).Find(&porPedido)
	addUnique(porPedido)

	// 3) Texto libre: destino del producto, o nombre de contacto/pasajero
	// (solo si las búsquedas exactas de arriba no encontraron nada)
	if len(reservas) == 0 {
		var porTexto []models.Reservation
		scoped().Where(
			"product_id IN (SELECT id FROM products WHERE LOWER(destino) LIKE ?) OR "+
				"LOWER(contacto_nombre) LIKE ? OR LOWER(nombre_pasajero) LIKE ? OR LOWER(apellido_pasajero) LIKE ?",
			like, like, like, like,
		).Order("created_at desc").Limit(6).Find(&porTexto)
		addUnique(porTexto)
	}

	if len(reservas) == 0 {
		return nil, nil, fmt.Sprintf("No encontré ninguna reserva tuya que coincida con \"%s\".", identificador)
	}
	if len(reservas) > 1 {
		var opciones []string
		for _, r := range reservas {
			var p models.Product
			database.DB.Select("destino", "fecha_salida").First(&p, r.ProductID)
			salida := ""
			if p.FechaSalida != nil {
				salida = p.FechaSalida.Format("02/01/2006")
			}
			opciones = append(opciones, fmt.Sprintf("Pedido %s (%s, salida %s)", r.PedidoID, p.Destino, salida))
		}
		return nil, nil, fmt.Sprintf(
			"Encontré más de una reserva que podría coincidir con \"%s\": %s. Pedile al usuario que confirme el número de pedido o la fecha.",
			identificador, strings.Join(opciones, "; "),
		)
	}

	reserva := reservas[0]
	var product models.Product
	database.DB.First(&product, reserva.ProductID) // puede no existir / no tener Ruta — se maneja en el caller

	return &reserva, &product, ""
}

// ─────────────────────────────────────────────
// EXPERTOS — consulta de conocimiento (consultar_experto)
// ─────────────────────────────────────────────

// expertKnowledgeThreshold: por debajo de este total de caracteres de
// conocimiento, se inyecta el Markdown completo de todos los documentos del
// experto directo en el resultado de la tool (máxima calidad, apropiado para
// el volumen típico de un experto de agencia — FAQs/manuales/políticas). Por
// encima, se usan los chunks pre-calculados (ver reindexExpertChunks en
// ai_expert_handler.go) y búsqueda por texto con pg_trgm.
const expertKnowledgeThreshold = 50000
const expertChunkSize = 1000
const expertChunkOverlap = 150
const expertChunkResultLimit = 8
const expertChunkMinSimilarity = 0.15

// gatherExpertKnowledge arma el conocimiento a devolver para consultar_experto:
// todo el contenido si el experto está bajo el umbral, o los chunks más
// relevantes a la pregunta (similarity de pg_trgm) si ya fue troceado.
func gatherExpertKnowledge(expert models.AIExpert, pregunta string) (string, error) {
	var chunkCount int64
	database.DB.Model(&models.AIExpertChunk{}).Where("expert_id = ?", expert.ID).Count(&chunkCount)

	if chunkCount == 0 {
		var docs []models.AIExpertDocument
		database.DB.Where("expert_id = ? AND status = 'ready'", expert.ID).Find(&docs)
		if len(docs) == 0 {
			return "", fmt.Errorf("este experto todavía no tiene documentos cargados")
		}
		var parts []string
		for _, d := range docs {
			parts = append(parts, fmt.Sprintf("## %s\n%s", d.FileName, d.ContentMarkdown))
		}
		return strings.Join(parts, "\n\n"), nil
	}

	// word_similarity(A, B) (pg_trgm) mide cuánto matchea A contra la MEJOR
	// subcadena de B, independiente del largo de B — a diferencia de
	// similarity() plano (comparación de trigramas del string completo),
	// que da puntajes artificialmente bajos al comparar una pregunta corta
	// contra un chunk largo aunque sí sea relevante. El piso mínimo evita
	// devolver los "menos malos" chunks cuando en realidad ninguno es
	// relevante (la IA no debe recibir contenido random etiquetado como
	// "conocimiento" del experto).
	var chunks []models.AIExpertChunk
	database.DB.Raw(
		`SELECT * FROM ai_expert_chunks
		 WHERE expert_id = ? AND word_similarity(?, content) > ?
		 ORDER BY word_similarity(?, content) DESC LIMIT ?`,
		expert.ID, pregunta, expertChunkMinSimilarity, pregunta, expertChunkResultLimit,
	).Scan(&chunks)
	if len(chunks) == 0 {
		return "", fmt.Errorf("no se encontró conocimiento relevante para esa pregunta")
	}
	var parts []string
	for _, c := range chunks {
		parts = append(parts, c.Content)
	}
	return strings.Join(parts, "\n\n---\n\n"), nil
}

// ─────────────────────────────────────────────
// TOOL EXECUTOR (DB directo, no HTTP interno)
// ─────────────────────────────────────────────

// executeTool ejecuta una tool call. `pageCtx` (puede ser nil) trae lo que el
// usuario ve en pantalla en este turno, usado para resolver referencias
// posicionales. `uiActions` (puede ser nil) es un acumulador por-request: los
// tools de UI (abrir_modal_reserva, completar_formulario_pasajeros) le hacen
// append en vez de tocar la base de datos — son las únicas dos excepciones a
// la regla de que executeTool siempre opera sobre la DB.
func executeTool(name string, args map[string]interface{}, u userCtx, pageCtx *PageContextInput, uiActions *[]UIAction) string {
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
		// Ocultar neto y datos de cesión para usuarios regulares
		for i := range reservas {
			if isRegularUser(u.Role) {
				sanitizeReservationForUser(&reservas[i])
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
		if u.Role == "agency_admin" {
			// Mismo alcance que GetAllReservations: su propia agencia, o
			// reservas hechas sobre productos que su agencia es dueña
			// (cesión/compartidos) — nunca reservas de otra agencia ajena,
			// y no puede pedir explícitamente otra agencia por parámetro.
			q = q.Where(
				"LOWER(agencia) = LOWER(?) OR product_id IN (SELECT id FROM products WHERE LOWER(agencia) = LOWER(?))",
				u.Agencia, u.Agencia,
			)
		} else if agencia, ok := args["agencia"].(string); ok && agencia != "" {
			q = q.Where("LOWER(agencia) = LOWER(?)", agencia)
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
		if u.Role == "agency_admin" &&
			!strings.EqualFold(reserva.Agencia, u.Agencia) {
			var owned int64
			database.DB.Model(&models.Product{}).
				Where("id = ? AND LOWER(agencia) = LOWER(?)", reserva.ProductID, u.Agencia).
				Count(&owned)
			if owned == 0 {
				return `{"error": "No tienes permiso para ver esta reserva"}`
			}
		}
		if isRegularUser(u.Role) {
			sanitizeReservationForUser(&reserva)
		}
		b, _ := json.Marshal(reserva)
		return string(b)

	case "generar_itinerario_pdf":
		identificador, _ := args["identificador"].(string)
		reserva, product, errMsg := resolveReservaParaItinerario(identificador, u)
		if errMsg != "" {
			b, _ := json.Marshal(map[string]string{"error": errMsg})
			return string(b)
		}
		result := map[string]interface{}{
			"tipo": "itinerario_pdf",
			"reserva": itinerarioReservaDTO{
				ID: reserva.ID, PedidoID: reserva.PedidoID, Estado: reserva.Estado,
				ContactoNombre: reserva.ContactoNombre, ContactoEmail: reserva.ContactoEmail,
				ContactoTelefono: reserva.ContactoTelefono, Agencia: reserva.Agencia,
			},
			"pasajeros": buildPasajerosDTO(reserva),
		}
		if product != nil && product.ID != 0 {
			pDTO := itinerarioProductoDTO{
				ID: product.ID, CodigoCupo: product.CodigoCupo, Destino: product.Destino,
				Compania: product.Compania, Ruta: product.Ruta,
			}
			if product.FechaSalida != nil {
				pDTO.FechaSalida = product.FechaSalida.Format("02/01/2006")
			}
			if product.FechaRegreso != nil {
				pDTO.FechaRegreso = product.FechaRegreso.Format("02/01/2006")
			}
			result["producto"] = pDTO
			if product.Ruta == "" {
				result["nota"] = "Esta reserva no tiene ruta de vuelos cargada; el itinerario se genera solo con los datos de pasajero y reserva."
			}
		} else {
			result["nota"] = "No se encontró el producto asociado a esta reserva; el itinerario se genera solo con los datos de pasajero."
		}
		b, _ := json.Marshal(result)
		return string(b)

	case "detalle_ruta":
		identificador, _ := args["identificador"].(string)
		reserva, product, errMsg := resolveReservaParaItinerario(identificador, u)
		if errMsg != "" {
			b, _ := json.Marshal(map[string]string{"error": errMsg})
			return string(b)
		}
		reservaInfo := map[string]string{"pedido_id": reserva.PedidoID}
		result := map[string]interface{}{
			"tipo":    "detalle_ruta",
			"reserva": reservaInfo,
		}
		if product != nil && product.ID != 0 {
			result["ruta"] = product.Ruta
			reservaInfo["destino"] = product.Destino
			reservaInfo["codigo_cupo"] = product.CodigoCupo
			if product.Ruta == "" {
				result["nota"] = "Esta reserva no tiene el detalle de ruta cargado."
			}
		} else {
			result["ruta"] = ""
			result["nota"] = "No se encontró el producto asociado a esta reserva."
		}
		b, _ := json.Marshal(result)
		return string(b)

	case "consultar_experto":
		expertName, _ := args["experto"].(string)
		pregunta, _ := args["pregunta"].(string)
		if expertName == "" {
			return `{"error": "Falta indicar qué experto consultar"}`
		}

		var expert models.AIExpert
		q := database.DB.Where("LOWER(name) = LOWER(?) AND is_active = true", expertName)
		if u.Role != "admin" {
			q = q.Where("LOWER(agencia) = LOWER(?)", u.Agencia)
		}
		// Revalidación server-side obligatoria: nunca confiar en que el enum
		// de la tool ya venía filtrado por agencia (mismo criterio defensivo
		// que el resto de las tools).
		if err := q.First(&expert).Error; err != nil {
			return `{"error": "No se encontró un experto activo con ese nombre en tu agencia"}`
		}

		knowledge, err := gatherExpertKnowledge(expert, pregunta)
		if err != nil {
			b, _ := json.Marshal(map[string]string{"error": err.Error()})
			return string(b)
		}
		b, _ := json.Marshal(map[string]string{"experto": expert.Name, "conocimiento": knowledge})
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
				NacimientoPasajero:   parseDateFlexible(strArg("pasajero_nacimiento")),
				TipoPasajero:         strArg("pasajero_tipo"),
				FichaVenta:           strArg("ficha_venta"),
			}

			// Copiar datos de vuelo y ruta del producto
			reserva.VueloCodigo = product.CodigoCupo
			reserva.VueloDestino = product.Destino
			reserva.VueloCompania = product.Compania
			reserva.VueloSalida = product.FechaSalida
			reserva.VueloRuta = product.Ruta

			blockMinutes := product.BloqueoTemporalMinutos
			if blockMinutes <= 0 {
				blockMinutes = services.GetIntSetting("bloqueo_minutos_default", 60)
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
				Nacimiento:      reserva.NacimientoPasajero,
				TipoPasajero:    reserva.TipoPasajero,
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

		// El neto y los datos de cesión son confidenciales para usuarios no
		// administradores — no deben filtrarse ni siquiera dentro del
		// resultado de una tool call.
		if isRegularUser(u.Role) {
			sanitizeReservationForUser(&reserva)
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
		// agency_admin ve solo su propia agencia — nunca el sistema entero.
		reservaQ := func() *gorm.DB {
			q := database.DB.Model(&models.Reservation{})
			if u.Role == "agency_admin" {
				q = q.Where("LOWER(agencia) = LOWER(?)", u.Agencia)
			}
			return q
		}
		productoQ := func() *gorm.DB {
			q := database.DB.Model(&models.Product{})
			if u.Role == "agency_admin" {
				q = q.Where("LOWER(agencia) = LOWER(?)", u.Agencia)
			}
			return q
		}

		var totalReservas, confirmadas, pendientes int64
		var totalProductos int64
		reservaQ().Count(&totalReservas)
		reservaQ().Where("estado = ?", models.EstadoConfirmada).Count(&confirmadas)
		reservaQ().Where("estado = ?", models.EstadoBloqueoTemporal).Count(&pendientes)
		productoQ().Count(&totalProductos)

		var totalVentas float64
		reservaQ().
			Where("estado = ?", models.EstadoConfirmada).
			Select("COALESCE(SUM(precio_venta), 0)").
			Scan(&totalVentas)

		result := map[string]interface{}{
			"total_reservas":   totalReservas,
			"confirmadas":      confirmadas,
			"pendientes":       pendientes,
			"total_productos":  totalProductos,
			"ventas_total_usd": totalVentas,
		}
		if u.Role == "agency_admin" {
			result["alcance"] = u.Agencia
		} else {
			result["alcance"] = "todo el sistema"
		}
		b, _ := json.Marshal(result)
		return string(b)

	case "rentabilidad":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para ver rentabilidad"}`
		}
		scopeAgencia := ""
		if u.Role == "agency_admin" {
			// agency_admin nunca puede ver la rentabilidad de otra agencia,
			// aunque intente pasar el parámetro "agencia".
			scopeAgencia = u.Agencia
		} else if a, ok := args["agencia"].(string); ok && a != "" {
			scopeAgencia = a
		}
		baseQ := func() *gorm.DB {
			q := database.DB.Model(&models.Reservation{}).Where("estado = ?", models.EstadoConfirmada)
			if scopeAgencia != "" {
				q = q.Where("LOWER(agencia) = LOWER(?)", scopeAgencia)
			}
			return q
		}

		var totalReservas int64
		baseQ().Count(&totalReservas)
		var totalVentas float64
		baseQ().Select("COALESCE(SUM(precio_venta), 0)").Scan(&totalVentas)
		var totalCosto float64
		baseQ().Select("COALESCE(SUM(neto_1), 0)").Scan(&totalCosto)

		rentabilidad := totalVentas - totalCosto
		margenPct := 0.0
		if totalVentas > 0 {
			margenPct = (rentabilidad / totalVentas) * 100
		}

		result := map[string]interface{}{
			"reservas_confirmadas": totalReservas,
			"ventas_total_usd":     totalVentas,
			"costo_total_usd":      totalCosto,
			"rentabilidad_usd":     rentabilidad,
			"margen_pct":           margenPct,
		}
		if scopeAgencia != "" {
			result["alcance"] = scopeAgencia
		} else {
			result["alcance"] = "todas las agencias"
		}
		b, _ := json.Marshal(result)
		return string(b)

	case "consultar_rol":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para consultar roles"}`
		}
		rolQuery, _ := args["rol"].(string)
		emailQuery, _ := args["email"].(string)

		if emailQuery != "" {
			var target models.Profile
			if err := database.DB.Where("LOWER(email) = LOWER(?)", emailQuery).First(&target).Error; err != nil {
				return `{"error": "No se encontró un usuario con ese email"}`
			}
			if u.Role == "agency_admin" && !strings.EqualFold(target.Agencia, u.Agencia) {
				return `{"error": "Solo podés consultar usuarios de tu propia agencia"}`
			}
			perms := services.GetUserPermissions(target.ID)
			names := make([]string, len(perms))
			for i, p := range perms {
				names[i] = p.Name + " (" + p.Code + ")"
			}
			b, _ := json.Marshal(map[string]interface{}{
				"usuario": target.Email, "rol_base": target.Role, "permisos": names,
			})
			return string(b)
		}

		if rolQuery != "" {
			var role models.Role
			if err := database.DB.Where("LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)", rolQuery, rolQuery).First(&role).Error; err != nil {
				return `{"error": "No se encontró un rol con ese nombre o código"}`
			}
			if u.Role == "agency_admin" && role.AgencyID != nil {
				agency, aerr := services.FindAgencyByCodeOrName(u.Agencia)
				if aerr != nil || *role.AgencyID != agency.ID {
					return `{"error": "Solo podés consultar roles globales o de tu propia agencia"}`
				}
			}
			var permissions []models.Permission
			database.DB.Table("permissions").
				Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
				Where("role_permissions.role_id = ?", role.ID).
				Find(&permissions)
			names := make([]string, len(permissions))
			for i, p := range permissions {
				names[i] = p.Name + " (" + p.Code + ")"
			}
			b, _ := json.Marshal(map[string]interface{}{
				"rol": role.Name, "codigo": role.Code, "es_global": role.AgencyID == nil, "permisos": names,
			})
			return string(b)
		}

		return `{"error": "Especificá 'rol' o 'email' para consultar"}`

	case "todos_los_grupos":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para ver todos los grupos"}`
		}
		var grupos []models.Group
		q := database.DB.Model(&models.Group{})
		if u.Role == "agency_admin" {
			q = q.Where("LOWER(agency) = LOWER(?)", u.Agencia)
		}
		if ec, ok := args["estado_cotizacion"].(string); ok && ec != "" {
			q = q.Where("estado_cotizacion = ?", ec)
		}
		if er, ok := args["estado_reservar"].(string); ok && er != "" {
			q = q.Where("estado_reservar = ?", er)
		}
		limit := 20
		if l, ok := args["limit"].(string); ok {
			if v, err := strconv.Atoi(l); err == nil {
				limit = v
			}
		}
		q.Order("created_at desc").Limit(limit).Find(&grupos)
		b, _ := json.Marshal(map[string]interface{}{"grupos": grupos, "total": len(grupos)})
		return string(b)

	case "cotizar_grupo":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para cotizar grupos"}`
		}
		id, _ := args["grupo_id"].(string)
		var group models.Group
		if err := database.DB.First(&group, id).Error; err != nil {
			return `{"error": "Grupo no encontrado"}`
		}
		if u.Role == "agency_admin" && !strings.EqualFold(group.Agency, u.Agencia) {
			return `{"error": "No tenés acceso a este grupo"}`
		}

		strArg := func(key string) (string, bool) {
			v, ok := args[key]
			if !ok || v == nil {
				return "", false
			}
			s := fmt.Sprintf("%v", v)
			return s, s != ""
		}

		updates := map[string]interface{}{}
		for _, key := range []string{"destino", "compania", "condiciones", "id_aerolinea", "pnr_airline", "pnr_agency"} {
			if v, ok := strArg(key); ok {
				updates[key] = v
			}
		}
		for _, key := range []string{"neto_01", "neto_liberado"} {
			if v, ok := strArg(key); ok {
				if f, err := strconv.ParseFloat(v, 64); err == nil {
					updates[key] = f
				}
			}
		}
		if v, ok := strArg("cantidad_liberados"); ok {
			if n, err := strconv.Atoi(v); err == nil {
				updates["cantidad_liberados"] = n
			}
		}
		for _, key := range []string{"salida", "regreso", "vencimiento_cotizacion", "vencimiento_pago"} {
			if v, ok := strArg(key); ok {
				updates[key] = parseDateFlexible(v)
			}
		}
		if len(updates) == 0 {
			return `{"error": "No se indicó ningún dato para cotizar"}`
		}
		database.DB.Model(&group).Updates(updates)
		database.DB.First(&group, id)
		b, _ := json.Marshal(group)
		return string(b)

	case "enviar_cotizacion_grupo":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para enviar cotizaciones de grupos"}`
		}
		id, _ := args["grupo_id"].(string)
		var group models.Group
		if err := database.DB.First(&group, id).Error; err != nil {
			return `{"error": "Grupo no encontrado"}`
		}
		if u.Role == "agency_admin" && !strings.EqualFold(group.Agency, u.Agencia) {
			return `{"error": "No tenés acceso a este grupo"}`
		}
		if err := SendGroupQuoteRow(&group, &u.ID); err != nil {
			b, _ := json.Marshal(map[string]string{"error": err.Error()})
			return string(b)
		}
		b, _ := json.Marshal(group)
		return string(b)

	case "confirmar_grupo":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para confirmar grupos"}`
		}
		id, _ := args["grupo_id"].(string)
		var group models.Group
		if err := database.DB.First(&group, id).Error; err != nil {
			return `{"error": "Grupo no encontrado"}`
		}
		if u.Role == "agency_admin" && !strings.EqualFold(group.Agency, u.Agencia) {
			return `{"error": "No tenés acceso a este grupo"}`
		}
		if group.EstadoCotizacion != models.GroupCotizacionAceptada {
			return `{"error": "Solo se puede confirmar un grupo cuya cotización ya fue aceptada"}`
		}
		database.DB.Model(&group).Update("estado_reservar", models.GroupReservarConfirmada)
		database.DB.First(&group, id)
		b, _ := json.Marshal(group)
		return string(b)

	case "resolver_cancelacion_grupo":
		if u.Role != "admin" && u.Role != "agency_admin" {
			return `{"error": "Sin permisos para resolver cancelaciones de grupo"}`
		}
		id, _ := args["grupo_id"].(string)
		var group models.Group
		if err := database.DB.First(&group, id).Error; err != nil {
			return `{"error": "Grupo no encontrado"}`
		}
		if u.Role == "agency_admin" && !strings.EqualFold(group.Agency, u.Agencia) {
			return `{"error": "No tenés acceso a este grupo"}`
		}
		if group.EstadoReservar != models.GroupReservarCancelacionSolicitada {
			return `{"error": "Este grupo no tiene una solicitud de cancelación pendiente"}`
		}
		decision, _ := args["decision"].(string)
		if decision != "approve" && decision != "decline" {
			return `{"error": "decision debe ser 'approve' o 'decline'"}`
		}
		notas, _ := args["notas"].(string)
		updates := map[string]interface{}{"cancelacion_notas": notas}
		if decision == "approve" {
			updates["estado_reservar"] = models.GroupReservarCancelada
		} else {
			updates["estado_reservar"] = group.PreCancelEstadoReservar
		}
		database.DB.Model(&group).Updates(updates)
		database.DB.First(&group, id)
		b, _ := json.Marshal(group)
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

	case "abrir_modal_reserva":
		// No toca la DB — solo resuelve a qué producto se refiere el usuario
		// y le pide al frontend que abra el formulario real para ese
		// producto (ver AIAction en la respuesta de Chat()).
		var resolvedID, resolvedLabel string
		if idStr, ok := args["product_id"].(string); ok && idStr != "" {
			resolvedID = idStr
		} else if posRaw, ok := args["posicion"]; ok {
			pos := 0
			switch v := posRaw.(type) {
			case float64:
				pos = int(v)
			case string:
				pos, _ = strconv.Atoi(v)
			}
			if pageCtx == nil || len(pageCtx.VisibleItems) == 0 {
				b, _ := json.Marshal(map[string]interface{}{"error": "No tengo la lista de lo que el usuario está viendo en pantalla en este momento — pedile que te diga el destino o código de cupo puntual."})
				return string(b)
			}
			if pos < 1 || pos > len(pageCtx.VisibleItems) {
				b, _ := json.Marshal(map[string]interface{}{"error": fmt.Sprintf("Esa posición (%d) no existe en la lista visible en pantalla (hay %d ítems).", pos, len(pageCtx.VisibleItems))})
				return string(b)
			}
			item := pageCtx.VisibleItems[pos-1]
			resolvedID = item.ID
			resolvedLabel = item.Label
		} else {
			b, _ := json.Marshal(map[string]interface{}{"error": "Falta indicar qué producto abrir: pasá product_id o posicion."})
			return string(b)
		}

		if uiActions != nil {
			*uiActions = append(*uiActions, UIAction{
				Type:    "open_reservation_modal",
				Payload: map[string]interface{}{"product_id": resolvedID},
			})
		}
		label := resolvedLabel
		if label == "" {
			label = resolvedID
		}
		b, _ := json.Marshal(map[string]interface{}{"exito": true, "mensaje": fmt.Sprintf("Se abrió el formulario de reserva para %s. El usuario ya lo puede ver y completar en pantalla.", label)})
		return string(b)

	case "completar_formulario_pasajeros":
		// Tampoco toca la DB — solo le manda al frontend los datos para
		// completar el formulario de pasajeros ya abierto en pantalla.
		strField := func(m map[string]interface{}, key string) string {
			if v, ok := m[key]; ok && v != nil {
				return fmt.Sprintf("%v", v)
			}
			return ""
		}

		var pasajeros []map[string]interface{}
		if raw, ok := args["pasajeros"].([]interface{}); ok {
			for _, item := range raw {
				if m, ok := item.(map[string]interface{}); ok {
					tipo := strField(m, "tipo_pasajero")
					if tipo == "" {
						tipo = "Adulto"
					}
					pasajeros = append(pasajeros, map[string]interface{}{
						"nombre":        strField(m, "nombre"),
						"apellido":      strField(m, "apellido"),
						"documento":     strField(m, "documento"),
						"nacimiento":    strField(m, "nacimiento"),
						"nacionalidad":  strField(m, "nacionalidad"),
						"tipo_pasajero": tipo,
					})
				}
			}
		}
		if len(pasajeros) == 0 {
			cantidad := 1
			if raw, ok := args["cantidad_pasajeros"]; ok {
				switch v := raw.(type) {
				case float64:
					cantidad = int(v)
				case string:
					if n, err := strconv.Atoi(v); err == nil {
						cantidad = n
					}
				}
			}
			if cantidad < 1 {
				cantidad = 1
			}
			if cantidad > 20 {
				cantidad = 20
			}
			for i := 0; i < cantidad; i++ {
				pasajeros = append(pasajeros, map[string]interface{}{
					"nombre": "", "apellido": "", "documento": "", "nacimiento": "", "nacionalidad": "", "tipo_pasajero": "Adulto",
				})
			}
		}

		if uiActions != nil {
			*uiActions = append(*uiActions, UIAction{
				Type:    "fill_passenger_form",
				Payload: map[string]interface{}{"passengers": pasajeros},
			})
		}
		b, _ := json.Marshal(map[string]interface{}{"exito": true, "mensaje": fmt.Sprintf("Se completó el formulario con %d pasajero(s). El usuario ya lo puede revisar y confirmar.", len(pasajeros))})
		return string(b)

	case "mis_grupos":
		var grupos []models.Group
		database.DB.Where("vendedor = ?", u.ID).Order("created_at desc").Find(&grupos)
		b, _ := json.Marshal(map[string]interface{}{"grupos": grupos, "total": len(grupos)})
		return string(b)

	case "solicitar_grupo":
		cantidad, _ := strconv.Atoi(fmt.Sprintf("%v", args["cantidad_lugares"]))
		if cantidad <= 0 {
			return `{"error": "La cantidad de lugares debe ser mayor a 0"}`
		}
		notasVendedor, _ := args["notas_vendedor"].(string)
		opcionesRaw, _ := args["opciones"].([]interface{})
		if len(opcionesRaw) == 0 {
			return `{"error": "Agregá al menos una opción de itinerario antes de solicitar el grupo"}`
		}

		solicitudID := uuid.New()
		rows := make([]models.Group, 0, len(opcionesRaw))
		for _, raw := range opcionesRaw {
			m, ok := raw.(map[string]interface{})
			if !ok {
				continue
			}
			itinerario, _ := m["itinerario"].(string)
			if itinerario == "" {
				continue
			}
			row := models.Group{
				SolicitudID:      &solicitudID,
				OpcionNumero:     len(rows) + 1,
				Vendedor:         u.ID,
				Agency:           u.Agencia,
				NotasVendedor:    notasVendedor,
				Itinerario:       itinerario,
				CantidadLugares:  cantidad,
				EstadoCotizacion: models.GroupCotizacionPendiente,
			}
			if notas, ok := m["notas"].(string); ok && notas != "" && notasVendedor == "" {
				row.NotasVendedor = notas
			}
			rows = append(rows, row)
		}
		if len(rows) == 0 {
			return `{"error": "No se pudo interpretar ninguna opción de itinerario"}`
		}
		if err := database.DB.Create(&rows).Error; err != nil {
			return fmt.Sprintf(`{"error": "Error al crear la solicitud de grupo: %s"}`, err.Error())
		}
		b, _ := json.Marshal(map[string]interface{}{
			"exito":   true,
			"grupos":  rows,
			"mensaje": fmt.Sprintf("Solicitud de grupo creada con %d opción(es). El administrador va a cargar la cotización.", len(rows)),
		})
		return string(b)

	case "aceptar_cotizacion_grupo":
		id, _ := args["grupo_id"].(string)
		var group models.Group
		if err := database.DB.First(&group, id).Error; err != nil {
			return `{"error": "Grupo no encontrado"}`
		}
		if u.Role != "admin" && group.Vendedor != u.ID {
			return `{"error": "Sin permiso para aceptar esta cotización"}`
		}
		if group.EstadoCotizacion != models.GroupCotizacionCotizada {
			return `{"error": "Esta opción no tiene una cotización pendiente de aceptar"}`
		}
		if groupQuoteExpired(&group) {
			b, _ := json.Marshal(map[string]string{"error": fmt.Sprintf(
				"La cotización venció el %s, pedile al administrador que la actualice.",
				group.VencimientoCotizacion.Format("02/01/2006"))})
			return string(b)
		}
		database.DB.Model(&group).Update("estado_cotizacion", models.GroupCotizacionAceptada)
		if group.SolicitudID != nil {
			database.DB.Model(&models.Group{}).
				Where("solicitud_id = ? AND id != ? AND estado_cotizacion IN ?", group.SolicitudID, group.ID,
					[]string{models.GroupCotizacionPendiente, models.GroupCotizacionCotizada}).
				Update("estado_cotizacion", models.GroupCotizacionRechazada)
		}
		database.DB.First(&group, id)
		b, _ := json.Marshal(group)
		return string(b)

	case "solicitar_cancelacion_grupo":
		id, _ := args["grupo_id"].(string)
		var group models.Group
		if err := database.DB.First(&group, id).Error; err != nil {
			return `{"error": "Grupo no encontrado"}`
		}
		if u.Role != "admin" && u.Role != "agency_admin" && group.Vendedor != u.ID {
			return `{"error": "Sin permiso"}`
		}
		if group.EstadoReservar != models.GroupReservarConfirmada {
			return `{"error": "Solo se puede solicitar la cancelación de un grupo confirmado"}`
		}
		database.DB.Model(&group).Updates(map[string]interface{}{
			"estado_reservar":            models.GroupReservarCancelacionSolicitada,
			"pre_cancel_estado_reservar": group.EstadoReservar,
		})
		return `{"exito": true, "mensaje": "Solicitud de cancelación enviada. El administrador la va a revisar."}`

	case "navegar_a_pantalla":
		// Tampoco toca la DB — solo le pide al frontend que cambie de ruta.
		pageKey := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", args["pagina"])))
		page, ok := knownPages[pageKey]
		if !ok {
			b, _ := json.Marshal(map[string]interface{}{"error": fmt.Sprintf("No reconozco esa pantalla ('%s'). Pantallas válidas: %s", pageKey, strings.Join(knownPageKeys, ", "))})
			return string(b)
		}

		hasAccess := true
		switch page.RequireRole {
		case "admin":
			hasAccess = u.Role == "admin"
		case "admin_or_agency_admin":
			hasAccess = u.Role == "admin" || u.Role == "agency_admin"
		}
		if !hasAccess {
			b, _ := json.Marshal(map[string]interface{}{"error": fmt.Sprintf("El usuario no tiene acceso a la pantalla de %s.", page.Label)})
			return string(b)
		}

		if uiActions != nil {
			*uiActions = append(*uiActions, UIAction{
				Type:    "navigate",
				Payload: map[string]interface{}{"path": page.Path},
			})
		}
		b, _ := json.Marshal(map[string]interface{}{"exito": true, "mensaje": fmt.Sprintf("Te llevé a la pantalla de %s.", page.Label)})
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
			Type  string                 `json:"type"`
			Text  string                 `json:"text"`
			ID    string                 `json:"id"`
			Name  string                 `json:"name"`
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

	historyTTL := time.Duration(services.GetIntSetting("ai_historial_horas", 4)) * time.Hour
	const maxHistoryMessages = 20 // pares usuario/asistente → 40 mensajes máx
	const maxSessionMessages = 30 // trimear si la sesión supera este límite

	// Auto-limpieza por TTL (configurable en Ajustes, ai_historial_horas): borrar
	// mensajes de esta sesión más viejos que ese umbral
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

	// Expertos activos visibles para el usuario (scopeados a su agencia,
	// salvo admin que ve los de todas) — se ofrecen como una tool más
	// (consultar_experto), no como un sistema paralelo.
	var experts []models.AIExpert
	expertsQuery := database.DB.Where("is_active = true")
	if role != "admin" {
		expertsQuery = expertsQuery.Where("LOWER(agencia) = LOWER(?)", u.Agencia)
	}
	expertsQuery.Find(&experts)

	systemPrompt := buildSystemPrompt(u, req.PageContext, experts)
	tools := getTools(role, experts)

	// Si el usuario eligió explícitamente un experto (selector en el chat),
	// se lo indica al modelo para que priorice consultarlo en este turno —
	// pero siempre a través de la misma tool consultar_experto, sin inyectar
	// su conocimiento directo acá (una sola vía de acceso al conocimiento,
	// con la revalidación de agencia que ya hace executeTool).
	if req.ExpertID != "" {
		for _, e := range experts {
			if e.ID.String() == req.ExpertID {
				systemPrompt += fmt.Sprintf(
					"\n\nEXPERTO SELECCIONADO POR EL USUARIO: \"%s\". Priorizá consultar su conocimiento (tool consultar_experto con experto=\"%s\") para responder en este turno.",
					e.Name, e.Name,
				)
				break
			}
		}
	}

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
	// uiActions acumula las acciones de UI (abrir modal, completar
	// formulario) que el modelo pidió en este turno — puede haber más de
	// una si encadenó abrir_modal_reserva + completar_formulario_pasajeros.
	uiActions := []UIAction{}

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
			result := executeTool(tc.Name, tc.Input, u, req.PageContext, &uiActions)
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
			services.LogFailure("ai",
				fmt.Sprintf("El asistente IA no pudo responder a %s (agencia %s) después de varios intentos", u.Email, u.Agencia),
				fmt.Sprintf("Chat de IA terminó sin respuesta de texto tras %d tool call(s) (usuario %s, proveedor %s)",
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
		var toolCallsJSON datatypes.JSON
		if len(toolCallsSummary) > 0 {
			if b, err := json.Marshal(toolCallsSummary); err == nil {
				toolCallsJSON = datatypes.JSON(b)
			}
		}
		database.DB.Create(&models.AIMessage{
			ID: uuid.New(), SessionID: sessionID, UserID: userID,
			Role: "assistant", Content: finalContent, ToolCalls: toolCallsJSON,
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
		"ui_actions": uiActions,          // Acciones que el frontend debe ejecutar (abrir modal, completar formulario) — ver AIPageContext.jsx
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
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
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
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
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
