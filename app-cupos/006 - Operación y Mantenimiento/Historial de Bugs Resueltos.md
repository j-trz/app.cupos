Postmortems de bugs ya corregidos, para no re-investigar desde cero si un síntoma parecido reaparece. Ver [[Gotchas y Reglas de Oro]] para las reglas operativas generales (no ligadas a un bug puntual).

> Entradas verificadas contra código al momento de escribirse; fecha propia en cada una.

## Contenido cortado / clipeado con el sidebar expandido

**Síntoma**: el contenido principal aparecía recortado en el borde derecho cada vez que el sidebar estaba expandido (se veía bien colapsado). Se reportó varias veces.

**Causa raíz real**: `frontend/src/index.css` tenía una regla de elemento crudo `main { min-width: calc(100vw - 100px); }` — un resabio de antes de que existiera la arquitectura flex/sidebar actual (hay un solo `<main>` en toda la app, en `Layout.jsx`). Con el sidebar expandido (~240px), ese mínimo forzado excedía el espacio flex real disponible para `<main>` (`100vw - 240px`), forzando overflow que quedaba recortado en silencio por un `overflow-x-hidden` que se había agregado en un intento de fix anterior (en vez de mostrar scroll).

**Intentos previos que NO funcionaron** (dos rondas, antes de encontrar la causa real): normalizar el valor de ancho del white-label en `Sidebar.jsx`; endurecer el flex column de `Layout.jsx` con `w-0`/`min-w-0`/`overflow-x-hidden`. Ninguno tocaba la regla real en `index.css`.

**Fix** (2026-07-09): borrar la línea `min-width` de esa regla en `index.css`.

**Si reaparece**: antes de volver a tocar clases flex de `Sidebar.jsx`/`Layout.jsx`, revisar si una regla de elemento plano nueva (en `index.css` o donde sea) está imponiendo un `min-width`/`min-height` relativo al viewport sobre `main`, `body` o similar.

---

## Marca Blanca (White-Label): cambiar fuente/color no aplicaba nada al sitio

**Síntoma**: cambiar la tipografía en `WhiteLabelConfig.jsx` nunca cambiaba la fuente real del sitio.

**Causa raíz**: tres bugs independientes y acumulativos, los tres en `frontend/src/contexts/WhiteLabelContext.jsx`:

1. **`loadConfig()` leía la forma de campo equivocada.** El backend (`white_label_handler.go`) siempre devuelve/guarda un único blob JSON anidado (`dbConfig.colors.primary`, `dbConfig.fonts.heading`) — nunca columnas planas — pero `loadConfig()` leía claves planas (`dbConfig.primary_color`, `dbConfig.font_heading`) que jamás existieron en la respuesta, así que `colors`/`fonts` siempre caían en silencio a los defaults hardcodeados sin importar lo guardado. (`identity`/`sidebar` ya estaban bien mapeados — anidado primero, plano como fallback — el bug era solo en `colors`/`fonts`.)
2. **Doble comillado del font-family** en `applyCSSVariables()`: envolvía el valor **completo** de fuente (que podía ya ser un stack tipo `"Poppins, system-ui, sans-serif"`) dentro de comillas, produciendo un nombre de familia inválido con comas embebidas — el navegador no podía matchearlo y caía silenciosamente al fallback genérico `ui-sans-serif`, sin importar qué fuente se elegía. Fix: extraer solo el nombre de la fuente primaria antes de comillar (`primaryFontName()`), retroactivo (no requiere re-guardar filas viejas con el stack antiguo).
3. **Ninguna web font se cargaba.** `frontend/index.html` no tenía ningún `<link>` de fuente — de las 8 opciones ofrecidas (Inter, Roboto, Poppins, Montserrat, Open Sans, Lato, Nunito, DM Sans), solo la que ya estuviera instalada en el sistema operativo podía renderizar. Fix: agregado un `<link>` de Google Fonts con las 8 + JetBrains Mono.

**Bug relacionado corregido de paso**: el efecto de preview en vivo de `WhiteLabelConfig.jsx` llamaba `applyCSSVariables(flat)` cuando `flattenForCSS()` en realidad devuelve `{ config: {...} }` — debía ser `applyCSSVariables(flat.config)`. Por esto la vista previa de la propia página de ajustes no mostraba ningún cambio antes de guardar.

**Fix**: 2026-07-09, todo en `WhiteLabelContext.jsx`.

**Pendiente, NO corregido (no reportado todavía)**: `buttons`/`layout` en `loadConfig()` tienen un desajuste **distinto y más profundo** — nombres de campo directamente distintos entre lo que `WhiteLabelConfig.jsx` guarda (`borderRadius`, `paddingX`, `paddingY`, `maxWidth`, etc.) y lo que `applyCSSVariables` espera (`radius`, `border_radius_sm`, etc.). Si llega un reporte de "cambié el radio de los botones y no pasó nada", empezar por ahí — mismo patrón de bug que fonts/colores, pero con otro mapeo de nombres.

---

## `GET /api/reports/user-metrics` 404 en local

**Síntoma**: el endpoint de métricas personales devolvía 404 corriendo el backend en local (`go run ./cmd/api`), aunque funcionaba en producción y estaba documentado.

**Causa raíz**: instancia real de la regla 1 de [[Gotchas y Reglas de Oro]] — la ruta estaba registrada en `api/index.go` (Vercel) pero faltaba por completo en `cmd/api/main.go` (local).

**Fix** (2026-08-10): agregada `protected.GET("/reports/user-metrics", handlers.GetUserMetrics)` a `main.go`, en el mismo punto (fuera del grupo `reports` con `RequirePermission("REPORTS_VIEW")`, directamente sobre `protected`) que ya tenía `index.go` — coherente con que este endpoint es "solo sesión", sin el permiso `REPORTS_VIEW`.

**Cómo se encontró**: comparando la lista de rutas (`grep` + `comm`) entre ambos entrypoints mientras se armaba esta documentación — vale la pena repetir ese chequeo periódicamente, no solo cuando ya hay un síntoma reportado.

---

## Retirado: hardcodeo binario "Jetmar" vs "Tienda Viajes" en Reportes

**No es un bug con síntoma de usuario** — es un patrón retirado que vale la pena recordar si reaparece la pregunta "¿por qué Reportes sigue diciendo Jetmar/Tienda?" o "¿por qué el filtro de agencia no afecta a Y?".

El módulo de Reportes (`analytics_handler.go`) tenía una función `isTienda(agencia string) bool` (`strings.Contains(normalize(agencia), "tienda")`) usada en tres handlers (más un `GetAgencyShare` legacy sin uso en `report_handler.go`) para partir todo en un binario Jetmar/Tienda Viajes en vez de agrupar por la agencia real. **Confirmado retirado** (`isTienda` ya no existe en el código, verificado 2026-08-10) — los cuatro ahora agrupan dinámicamente por `Reservation.Agencia` real (`intMapKeys`/`mapToSlice` + una paleta de 8 colores cíclica, espejada en el frontend como `AGENCY_PALETTE` en `Reportes.jsx` y `pastelPalette`/`palette` en `DashboardChart.jsx`).

**Dos matchers de filtro, no simétricos** (ver también regla 10 de [[Gotchas y Reglas de Oro]]): `passengerMatches` (filtra por `Reservation.Agencia`, quién vendió) y `productMatches` (filtra por `Product.Agencia`, quién es dueño). Ambos confirmados presentes en `analytics_handler.go` a la fecha de esta nota. Un filtro nuevo en `FiltersPanel.jsx` puede andar en los handlers que usan uno y ser un no-op silencioso en los que usan el otro, si no se agrega a los dos.

`agency_admin` queda force-scopeado server-side a su propia agencia en los handlers que usan `passengerMatches`, sin importar qué filtros mande; `admin` ve todo por defecto y puede acotar con el filtro "Agencia" (solo visible para admin en `FiltersPanel.jsx`, es un control muerto para `agency_admin`). El panel de admin de `Dashboard.jsx` (`DashboardCharts.jsx`) fue en su momento 100% mock — hoy está conectado a datos reales, siempre acotado a la agencia del usuario que lo mira (a diferencia de `Reportes.jsx`, donde admin ve todas las agencias) — decisión de producto explícita, no un bug.
