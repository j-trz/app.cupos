# Plan: Funcionalidades de IA — chat full-page, "Expertos" y entrega de itinerarios/rutas desde el chat

## Contexto

`app.cupos` ya tiene un sistema de IA funcional: un widget de chat flotante (`AIChatWidget.jsx`) montado globalmente, con tool-calling (function calling) contra la base de datos vía `getTools()`/`executeTool()` en `backend-go/pkg/handlers/ai_handler.go`, y un panel de administración (`/config-ia`) para proveedores/acciones. Se pide extenderlo con tres capacidades nuevas para que las agencias exploten mejor el asistente:

1. Una página de chat a pantalla completa (estilo ChatGPT/Claude) para cuando el usuario quiere trabajar en una pantalla grande, con su propio topbar y el historial de sus conversaciones.
2. "Expertos": agentes con base de conocimiento propia que cada agencia configura y nombra, para responder preguntas sobre documentación cargada por ellas.
3. Que la IA pueda, desde cualquier superficie de chat, entregar el itinerario en PDF y el detalle de ruta "para copiar y pegar" de una reserva del propio usuario que la pide.

Decisiones ya validadas con el usuario (evitan sobre-ingeniería):
- **No se implementa el protocolo MCP real.** Se construye un pipeline interno de conversión a Markdown + una tool más (`consultar_experto`) dentro del mecanismo de function-calling ya existente. Los "expertos" no necesitan interoperar con clientes MCP externos, y este chat es 100% custom (no usa un cliente MCP hoy), así que un servidor MCP real sería trabajo nuevo no trivial (protocolo JSON-RPC, discovery, etc.) sin ninguna capacidad adicional real, y con fricción extra al correr en funciones serverless de Vercel.
- **Sin pgvector/embeddings por ahora.** Se inyecta el conocimiento completo (Markdown) cuando el volumen es chico (típico para FAQs/manuales de agencia) y se cae a búsqueda de texto con `pg_trgm` (extensión estándar de Postgres) cuando supera un umbral. Evita depender de una extensión no confirmada en el proveedor de Postgres gestionado.
- **Sin generación de PDF real en el servidor.** Se reutiliza el flujo actual (impresión/descarga desde el navegador vía el componente `ItineraryPDF.jsx` ya existente), mostrado dentro de un modal en la propia burbuja del chat. Hoy no existe ningún PDF generado server-side en todo el sistema; introducir uno solo para esta feature duplicaría el mantenimiento del diseño/branding en dos lugares.

Todo el trabajo nuevo va en el backend **Go** (`backend-go/`) — activo/primario — y en `frontend/`. El backend Node legacy (`backend/`) no se toca.

---

## Feature 1 — Página de chat a pantalla completa

**Ruta nueva fuera del `<Layout>`** para maximizar el espacio como un ChatGPT real: `frontend/src/pages/AIChatPage.jsx`, registrada en `frontend/src/App.jsx` como `<Route path="/asistente" element={<ProtectedRoute><AIChatPage /></ProtectedRoute>} />` (sin envolver en `<Layout>`, así tampoco se monta el `<AIChatWidget/>` flotante ahí, evitando dos chats compitiendo en pantalla).

**Extraer la lógica compartida a un hook** en vez de duplicarla entre el widget y la página nueva:
- `frontend/src/hooks/useAIChat.js` (nuevo): mueve ahí el estado/handlers hoy inline en `AIChatWindow.jsx` (`messages`, `sessions`, `currentSessionId`, `isTyping`, `loadSessions`, `loadSessionMessages`, `handleNewSession`, `handleSendMessage`, `handleDeleteSession`, y agrega `handleRenameSession` usando `AIService.updateSessionTitle`, que ya existe en `aiService.js` pero ningún componente lo usa todavía). Acepta un `initialSessionId` opcional.
- `AIChatWindow.jsx` pasa a consumir `useAIChat()`; se le agrega un botón "expandir a pantalla completa" que navega a `/asistente?session=<id-actual>`.
- `frontend/src/components/AIChat/AIChatSessionsSidebar.jsx` (nuevo): extrae el panel de sesiones ya existente inline en `AIChatWindow.jsx` a un componente reusable (props `sessions, currentSessionId, onSelectSession, onNewSession, onDeleteSession, onRenameSession`), usado tanto en el dropdown del widget como en la barra lateral persistente de la página nueva.
- `frontend/src/components/AIChat/AIChatTopbar.jsx` (nuevo): topbar de la página con botón "← Volver al sistema de cupos" (`navigate('/dashboard')`).
- `AIChatPage.jsx` compone Topbar + sidebar de sesiones + `AIChatMessage`/`AIChatInput` (sin cambios) en un layout `h-screen flex flex-col`. Lee `?session=` con `useSearchParams()`.

**Acceso:** además del botón "expandir" del widget, agregar un ítem en `frontend/src/components/ui/Sidebar.jsx` ("Asistente IA" → `/asistente`, visible para todos los roles).

No requiere cambios de backend — reutiliza `/ai/chat`, `/ai/sessions`, `/ai/sessions/:id/messages`, `/ai/sessions/:id/title`, `DELETE /ai/sessions/:id`, todos ya expuestos en `aiService.js`.

---

## Feature 2 — "Expertos" con base de conocimiento por agencia

### Modelo de datos (agregar a `backend-go/pkg/models/models.go`, tras `AIMessage`)

- `AIExpert` — `ID, Agencia, Name, Description, Persona, IsActive, CreatedBy, CreatedAt, UpdatedAt`, scopeado por `Agencia` igual que `Product`/`Reservation`.
- `AIExpertDocument` — `ID, ExpertID, FileName, SourceType (pdf|docx|txt|md|url), SourceURL, ContentMarkdown (text), CharCount, Status (processing|ready|error), ErrorMessage`. El archivo original **nunca se persiste** (no hay filesystem persistente en el runtime serverless de Vercel) — se convierte a Markdown en memoria y solo se guarda el resultado.
- `AIExpertChunk` — `ID, ExpertID, DocumentID, ChunkIndex, Content` — se generan solo cuando el conocimiento del experto supera el umbral de inyección directa.

Agregar los tres structs a `AutoMigrate(...)` en `backend-go/pkg/database/db.go`, y en `runSQLMigrations` agregar `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + índice GIN trigram sobre `ai_expert_chunks.content`, siguiendo el estilo `CREATE TABLE/INDEX IF NOT EXISTS` ya usado ahí.

### Pipeline de ingesta — `backend-go/pkg/services/expert_ingest.go` (nuevo)

`ConvertToMarkdown(fileName, mime string, raw []byte) (markdown, sourceType string, err error)`, dispatch por extensión, todo en memoria (sin CGO, apto para serverless):
- `.md`/`.txt` → passthrough.
- `.html`/URL → `github.com/JohannesKaufmann/html-to-markdown`.
- `.pdf` → extracción de texto con librería Go pura (ej. `github.com/ledongthuc/pdf`); documentar que PDFs escaneados sin capa de texto no producen contenido (sin OCR en alcance).
- `.docx` → extractor propio con `archive/zip` + `encoding/xml` (evita dependencias con binarios externos no disponibles en Vercel).
- Límite de tamaño de subida (~10MB) y de Markdown resultante (~2MB).

### Estrategia de "búsqueda" en el conocimiento (sin embeddings)

Al invocar la tool para un experto: si la suma de `CharCount` de sus documentos es menor a un umbral (~50.000 caracteres), se inyecta el Markdown completo como resultado de la tool. Si lo supera, se trocea en la ingesta (~800-1200 caracteres, con solape) en `AIExpertChunk`, y en la consulta se usa `pg_trgm`/full-text search de Postgres para traer los ~5-8 chunks más relevantes a la pregunta.

### Integración con el chat — extendiendo `getTools`/`executeTool`, sin sistema paralelo

- `getTools(role, experts []models.AIExpert)` — nueva tool `consultar_experto` (parámetros `experto` con enum dinámico de expertos activos de la agencia del usuario, y `pregunta`), disponible para todos los roles.
- `executeTool`, caso `consultar_experto`: resuelve el experto, **revalida server-side que `expert.Agencia == u.Agencia`** (nunca confiar en que el enum ya venía filtrado — mismo criterio defensivo que el resto de las tools), aplica la estrategia de inyección/chunking, devuelve el resultado.
- `buildSystemPrompt(u, experts)` agrega un párrafo condicional explicando cuándo usar `consultar_experto`.
- `Chat()` resuelve `experts := agencia del usuario (o todos si admin)` una vez y lo pasa a ambas funciones.
- Selección explícita: `ChatRequest` suma `ExpertID string`; si viene seteado y el experto entra en el umbral de inyección directa, se agrega su conocimiento al system prompt de ese turno directamente (respuesta más inmediata), sin dejar de tener disponible `consultar_experto` para derivar a otros expertos.

### Endpoints nuevos — `backend-go/pkg/handlers/ai_expert_handler.go` (nuevo), mismo estilo CRUD que Providers/Actions ya en `ai_handler.go`:

```
GET/POST      /ai/experts                       (GET: cualquier rol autenticado, scopeado a su agencia; POST: agency_admin/admin)
GET/PUT/DELETE /ai/experts/:id                   (PUT/DELETE: agency_admin/admin, dueño de su agencia)
POST/GET      /ai/experts/:id/documents          (multipart file o {url}; agency_admin/admin)
DELETE        /ai/experts/:id/documents/:docId
```
Registrar en `backend-go/cmd/api/main.go` y su duplicado `backend-go/api/index.go`, dentro del grupo `/ai` ya existente.

### Frontend

- `frontend/src/services/aiService.js`: agregar `getExperts/getExpert/createExpert/updateExpert/deleteExpert/uploadExpertDocument/addExpertDocumentFromUrl/deleteExpertDocument`, y extender `sendMessage(...)` con `expertId`.
- `frontend/src/pages/AIConfig.jsx`: nueva pestaña "Expertos" junto a Providers/Actions/Stats/Logs. Extraer a componentes propios para no seguir engordando el archivo (924 líneas hoy):
  - `frontend/src/components/AIExperts/ExpertsTab.jsx` (lista + alta/edición de expertos).
  - `frontend/src/components/AIExperts/ExpertDocumentsPanel.jsx` (subida de archivos/URL + listado con estado processing/ready/error).
- `frontend/src/components/AIChat/ExpertPicker.jsx` (nuevo): selector "Asistente general / <experto>" usado tanto en `AIChatWindow.jsx` como en `AIChatPage.jsx` vía `useAIChat` (estado `selectedExpertId`).
- `AIChatMessage.jsx`: agregar `consultar_experto: '🧠 Consultando a un experto'` al mapa `TOOL_LABELS`.

### Seguridad

Mismo criterio de scoping por agencia que `Product`/`Reservation` (ver `GetAllReservations` en `order_handler.go`): `admin` ve/gestiona todo, `agency_admin` solo su agencia, `agency_user`/`user` solo puede usar (nunca gestionar) expertos de su propia agencia, con revalidación server-side obligatoria en cada request — nunca confiar en un ID que venga del cliente.

---

## Feature 3 — Itinerario PDF y detalle de ruta desde el chat

### Bugfix previo necesario (bloqueante para que esto funcione "en cualquier contexto")

`frontend/src/components/AIChat/AIChatWindow.jsx` (~línea 127) lee `response.toolCalls`, pero el backend devuelve `tool_calls` (snake_case, `ai_handler.go` ~línea 1441) — hoy el resultado de las tools nunca llega al mensaje recién enviado (solo se vería si se recarga desde el historial guardado). Corregir a `response.tool_calls || response.toolCalls`.

Adicionalmente, `models.AIMessage` no persiste `tool_calls` hoy, así que al recargar una sesión guardada se pierde el resultado de cualquier tool. Agregar columna `ToolCalls datatypes.JSON` a `AIMessage` (AutoMigrate la crea sola) y guardar `toolCallsSummary` serializado al persistir el mensaje del asistente en `Chat()`.

### Backend — dos tools nuevas en `ai_handler.go`, disponibles para todos los roles

- `generar_itinerario_pdf(identificador)` y `detalle_ruta(identificador)` — `identificador` es texto libre (número de pedido/localizador, destino, o nombre de contacto/pasajero); la IA nunca debe pedir el ID interno al usuario.
- Función compartida `resolveReservaParaItinerario(identificador, u)`: busca la reserva **con el scope de propiedad aplicado dentro de la propia query SQL** (igual criterio que `detalle_reserva`/`GetReservationByID`: usuario regular → `created_by = u.ID`; `agency_admin` → su agencia o productos de su agencia), primero por ID interno si es numérico, luego por `pedido_id` parcial, luego por destino/nombre. Si no hay match o es ambiguo, devuelve un mensaje de error en texto (sin `tipo`) para que el modelo se lo transmita al usuario — una reserva ajena es indistinguible de una inexistente.
- DTOs de salida explícitos (`itinerarioReservaDTO`, `itinerarioProductoDTO`, `itinerarioPasajeroDTO`) — deliberadamente **sin** campos financieros/de cesión (más restrictivo que `sanitizeReservationForUser`, porque este documento se comparte con el pasajero/cliente). `Ruta` se devuelve cruda (string tal cual en `Product.Ruta`): el parser robusto (JSON o texto GDS con heurísticas) ya vive en `ItineraryTable.jsx` (`parseRuta`) y no debe reimplementarse en Go.
- `executeTool` casos `generar_itinerario_pdf`/`detalle_ruta`: arman `{"tipo": "itinerario_pdf"|"detalle_ruta", "reserva": ..., "pasajeros": ..., "producto": ...}`, con `"nota"` cuando falta `ruta` o el producto asociado.
- Actualizar `buildSystemPrompt` con la instrucción de usar estas tools e identificar la reserva por pedido/destino, nunca por ID interno.

### Frontend — render enriquecido en la burbuja del chat

Nuevo componente `frontend/src/components/AIChat/AIChatItineraryResult.jsx`: parsea cada `tc.result` de `toolCalls`, y si tiene `tipo: 'itinerario_pdf'|'detalle_ruta'`, muestra una tarjeta compacta ("Ver / Descargar" o "Ver / Copiar") que abre un `Modal` (reutilizando `frontend/src/components/Modal.jsx`, que ya hace `createPortal` a `document.body` — no lo limita el ancho de la burbuja ni del widget de 380px) con `ItineraryPDF` o `ItineraryTable` dentro, **sin modificarlos** — los DTOs del backend usan exactamente los nombres de campo que ya esperan (`pedido_id`, `nombre/apellido/documento/tipo_pasajero`, `ruta`).

`AIChatMessage.jsx`: importar y renderizar `<AIChatItineraryResult toolCalls={toolCalls} />` bajo el texto del mensaje (solo para mensajes del asistente), y sumar `generar_itinerario_pdf`/`detalle_ruta` a `TOOL_LABELS`. Al ser el componente de mensaje compartido entre el widget flotante y la futura página de chat completa, este render funciona en ambos sin tocar `AIChatWidget.jsx` ni duplicar nada.

### Casos borde cubiertos por el diseño
Reserva con múltiples pasajeros (array completo desde `Passenger`), producto sin `ruta` (nota + placeholder nativo de `ItineraryTable`), reserva no encontrada o ajena (mismo mensaje genérico, indistinguibles), `agency_admin` pidiendo una reserva de su agencia creada por otro usuario (permitido, mismo criterio que `detalle_reserva`), pedido ambiguo (el error lista candidatos con pedido+destino+fecha para que el modelo le pida precisar al usuario).

---

## Archivos críticos

**Backend (Go):**
- `backend-go/pkg/handlers/ai_handler.go` — `getTools`, `executeTool`, `buildSystemPrompt`, `Chat()` (el corazón de las tres features)
- `backend-go/pkg/models/models.go` — `AIProvider/AIAction/AISession/AIMessage` existentes + `AIExpert/AIExpertDocument/AIExpertChunk` nuevos
- `backend-go/pkg/database/db.go` — `AutoMigrate`, `runSQLMigrations`
- `backend-go/pkg/handlers/order_handler.go` — `GetReservationByID` (patrón de autorización a replicar)
- `backend-go/pkg/handlers/ai_expert_handler.go` (nuevo)
- `backend-go/pkg/services/expert_ingest.go` (nuevo)
- `backend-go/cmd/api/main.go` y `backend-go/api/index.go` (registro de rutas, ambos en paralelo)

**Frontend:**
- `frontend/src/App.jsx` — ruta nueva `/asistente`
- `frontend/src/components/Layout.jsx`, `frontend/src/components/ui/Sidebar.jsx` — acceso a la página nueva
- `frontend/src/hooks/useAIChat.js` (nuevo)
- `frontend/src/components/AIChat/AIChatWindow.jsx`, `AIChatMessage.jsx`, `AIChatWidget.jsx` — bugfix + render enriquecido
- `frontend/src/components/AIChat/AIChatSessionsSidebar.jsx`, `AIChatTopbar.jsx`, `AIChatItineraryResult.jsx`, `ExpertPicker.jsx` (nuevos)
- `frontend/src/pages/AIChatPage.jsx` (nuevo)
- `frontend/src/pages/AIConfig.jsx` + `frontend/src/components/AIExperts/ExpertsTab.jsx`, `ExpertDocumentsPanel.jsx` (nuevos)
- `frontend/src/services/aiService.js` — nuevos métodos de expertos + `expertId` en `sendMessage`
- `frontend/src/components/ItineraryPDF.jsx`, `ItineraryTable.jsx`, `Modal.jsx` — reusados sin modificar

## Verificación

- Correr el backend Go (`backend-go`) y el frontend (`frontend`) localmente.
- **Chat full-page:** loguearse, abrir `/asistente` desde el sidebar y desde el botón "expandir" del widget; crear una conversación nueva, renombrarla, borrarla, verificar que "Volver al sistema de cupos" regresa a `/dashboard` y que el widget flotante sigue funcionando en el resto de la app.
- **Expertos:** como `agency_admin`, crear un experto en `/config-ia` → pestaña Expertos, subir un PDF/DOCX/TXT y una URL, verificar que el estado pasa a "Listo" (o "Error" con un PDF sin texto), y que como usuario regular de esa agencia el chat puede invocar `consultar_experto` y responder con ese contenido; verificar que un usuario de OTRA agencia no ve ni puede invocar ese experto.
- **Itinerario/ruta:** como usuario regular, pedir en el chat "mandame el itinerario de mi reserva a <destino>" y "el detalle de ruta para copiar" — verificar que aparece la tarjeta con el modal correcto, que el PDF/tabla muestra los datos reales, y que el botón de copiar/descargar funciona igual que en `GestionReservas.jsx`. Intentar pedir el itinerario de una reserva ajena (por pedido conocido) y confirmar que se responde como "no encontrada", sin filtrar datos. Repetir el pedido tras cerrar y reabrir la conversación para confirmar que el resultado persiste (bugfix de `tool_calls`).
