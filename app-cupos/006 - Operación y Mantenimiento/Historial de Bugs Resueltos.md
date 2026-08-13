Postmortems de bugs ya corregidos, para no re-investigar desde cero si un síntoma parecido reaparece. Ver [[Gotchas y Reglas de Oro]] para las reglas operativas generales (no ligadas a un bug puntual).

> Entradas verificadas contra código al momento de escribirse; fecha propia en cada una.

## Deploy roto: módulo "Oportunidades" armado con la estructura de OTRO proyecto (alias `@/`, componentes shadcn con otro nombre)

**Síntoma**: build de Vercel fallaba con `Rollup failed to resolve import "@/contexts/AuthContext" from ".../GestionOportunidades.jsx"`.

**Causa raíz**: el módulo completo de "Oportunidades" (`GestionOportunidades.jsx`, `OportunityForm.jsx`, `useOpportunities.ts`, `opportunitySchema.ts` — frontend; handler/rutas/modelo/migración ya existían del lado backend) se había commiteado usando convenciones de un scaffold shadcn/ui genérico que **no coinciden con este repo**:
- Alias `@/` para imports — este proyecto **no tiene ningún alias configurado** en `vite.config.js`, todo se importa con rutas relativas (`../contexts/AuthContext`).
- Nombres de componentes UI genéricos (`components/ui/button`, `dialog`, `select`, `alert-dialog`) — acá los mismos componentes existen con prefijo `shadcn-` (`shadcn-button.jsx`, `shadcn-dialog.jsx`, `shadcn-select.jsx`) y exports nombrados distintos (`ShadcnButton as Button`, `ShadcnInput as Input`) — ver el patrón ya establecido en `Notificaciones.jsx`/`Settings.jsx`.
- `apiCall()` genérico desde `@/lib/apiClient` — no existe; el cliente HTTP real del proyecto es la clase `ApiClient` (`services/apiClient.js`, métodos estáticos `.get/.post/.put/.delete`).
- `AlertDialog` (confirmación modal tipo shadcn) — **no existe en este proyecto**, solo hay un `Alert` simple (banner estático, `shadcn-alert.jsx`: `Alert`/`AlertTitle`/`AlertDescription`). El patrón real de confirmación en toda la app es `Swal.fire({...})` (SweetAlert2).

Lo demás (paquetes npm `react-hook-form`/`@hookform/resolvers`/`zod`, permisos RBAC `OPPORTUNITIES_*` en `seedRBAC()`, rutas `/opportunities` en ambos entrypoints, entrada en el Sidebar) sí estaba bien armado — el problema era puramente la capa de imports/componentes del frontend.

**Fix** (2026-08-12): reescritos los imports de los 3 archivos frontend a rutas relativas + componentes `shadcn-*` reales; `useOpportunities.ts` reescrito para usar `ApiClient`; el `AlertDialog` de confirmación de borrado reemplazado por `Swal.fire` (mismo patrón que `GestionProductos.jsx`/`GestionTemporadas.jsx`).

**Cómo evitar que se repita**: si aparece código nuevo (propio o pegado de otra fuente/herramienta) que importe con alias `@/` o que use nombres de componente `components/ui/algo` sin el prefijo `shadcn-`, es una señal de que se generó para otra estructura de proyecto — revisar contra los imports reales de `Notificaciones.jsx`/`Settings.jsx` antes de asumir que va a compilar.

**Segunda pasada, mismo día**: el build ya compilaba pero la página no tenía el mismo diseño que el resto (Julian: "el topbar dice Panel y no Oportunidades, falta el logo, faltan los botones"). Causa: `GestionOportunidades.jsx` nunca usaba `<PageHeader>` — el componente que alimenta el título/ícono/acción del topbar vía `HeaderContext` (`Layout.jsx` solo cae al título por defecto de `getTitleByPath()` si la página no llama a `PageHeader`). Se rehizo la página completa con los componentes propios de la app (`PageHeader`, `Card`, `TableComponent`, `Badge`, `ActionIconButton` con Acciones como primera columna) en vez de los `shadcn-*`, y `OportunityForm.jsx` pasó de `react-hook-form` (que necesita inputs con `forwardRef`, y el `Input.jsx` de esta app no lo tiene) a un formulario controlado simple, mismo patrón que `GestionTemporadas.jsx`.

**Tercera pasada, mismo día**: ajustes puntuales al modal `OportunityForm.jsx` pedidos por Julian —
- **Temporada**: pasó de input de texto libre a `<select>` poblado con `useTemporadas()`, mismo patrón que `ProductForm.jsx` (filtra `t.activa || t.nombre === form.temporada`, más un `<option>` de fallback si el valor viejo ya no está activo).
- **Labels**: "Estado (Admin)" → "Estado", "Estado Interno" → "Estado Aerolínea" — solo el label visible, el campo sigue siendo `estado_interno` en el modelo/API (no se tocó backend).
- **Compañía**: sigue siendo texto libre (por si la aerolínea no está en el diccionario) pero ahora autocompleta con `<datalist>` nativo contra `airlineNames` (`frontend/src/lib/data/airlineNames.js`, el mismo diccionario integrado antes para `ItineraryTable.jsx`).

Aprovechando el cambio, auditoría de "componentes sin uso" en `frontend/src/`: un primer script bash (grep por nombre de archivo) dio 32 candidatos pero con falsos positivos conocidos, así que se re-verificó cada uno individualmente con Grep dirigido (import real, no coincidencia de substring) antes de borrar nada. Confirmados y eliminados 35 archivos genuinamente huérfanos:
- `components/ExportButton.jsx`, `GlobalSearch.jsx`, `KeyboardShortcuts.jsx`, `LanguageSelector.jsx`, `OnboardingGuide.jsx` — restos de un shell de app abandonado, nunca importados en ninguna página.
- `components/reports/{AgencyShareChart,DestinationDetailTable,EvolutionChart,KPIsRow,OccupancyHeatmap,ProductPerformanceTable,ProgressLoader,ReportFilters,RiskAlertsTable,TopDestinationsChart,TooltipForIcons}` — versión vieja/duplicada del dashboard de Reportes; `Reportes.jsx` real usa otro set con otros nombres (`DashboardChart`, `DataTable`, `DepartureTable`, `FiltersPanel`, `KpiPanel`, `PeriodSelector`, `TabsCharts`, que sí siguen en uso).
- `components/ui/{Accordion,Dialog,DropdownMenu,FilterBadge,SidebarTrigger,Tooltip}.jsx` + 8 componentes `shadcn-*` sin uso (`shadcn-accordion/alert/avatar/checkbox/popover/progress/radio-group/separator/skeleton/slider/switch/tabs`) — nunca importados; los `shadcn-*` realmente usados por `Settings.jsx`/`Notificaciones.jsx` (button/card/input/label/table/dialog/textarea/select/badge/dropdown-menu/tooltip) no se tocaron.
- `schemas/opportunitySchema.ts` — huérfano directo de esta misma tercera pasada, ya que `OportunityForm.jsx` había dejado de usar `react-hook-form`/`zod` en la segunda pasada.

Verificado con `npm run build` (limpio) y `npm run lint` (0 errores en cualquier archivo tocado o borrado; el lint completo del repo tiene ~800 errores preexistentes que vienen de lintear `dist/` por un gap de config, no relacionado a este cambio).

## Notificación "nuevo producto" llegaba a usuarios de TODAS las agencias, no solo a la dueña

**Síntoma** (reportado por Julian, auditoría a pedido): pidió revisar las notificaciones porque sospechaba que llegaban avisos que no le correspondían a un usuario común.

**Causa raíz**: `CreateProduct` y `BulkCreateProducts` (`product_handler.go`) usaban `services.NotifyBroadcastByCode(..., "new_product"/"new_product_bulk", ...)` — un producto es privado de su agencia dueña (nadie más lo ve ni lo puede reservar salvo cesión/compartir explícito), pero el aviso de "se cargó" se mandaba a todos los usuarios del sistema sin excepción, de cualquier agencia. Auditando el resto de los `Notify*ByCode` del código (`order_handler.go`, `group_handler.go`, `cron_handler.go`, `transfer_handler.go`, `deadline_cron_handler.go`) no se encontró ningún otro caso mal scopeado — todos usan `NotifyUserByCode`/`NotifyAgencyByCode`/`NotifyRoleByCode("admin")` correctamente.

**Fix** (2026-08-12): cambiado a `NotifyAgencyByCode(product.Agencia, ...)` — en la carga masiva, agrupado por agencia (`countByAgency`) ya que un mismo import puede traer productos de varias agencias a la vez. Además se detectó que ninguno de los dos casos (ni `product_changed`, el aviso de cambio de itinerario a quien tiene el cupo reservado) disparaba un email real, solo la notificación in-app — se agregó `services.SendTemplateEmailToAgency()` (nuevo, para "toda la agencia por email") y las plantillas de email faltantes. Ver regla 13 de [[Gotchas y Reglas de Oro]] para el detalle completo y el patrón a seguir en notificaciones nuevas.

## `AddPassenger` guardaba Neto1 = 0 si no venía explícito en el request

**Síntoma**: Julian corrigió una nota mal formulada donde se describía `Neto1` como un valor "legado"/global — en realidad el Neto1 real de una venta siempre es `Tarifa + Impuestos` del tipo de ESE pasajero (ADT/CHD/INF), igual que `OP` (ver regla 11 de [[Gotchas y Reglas de Oro]]). Al re-auditar todos los puntos donde se asigna `Passenger.Neto1`, `CreateReservation` ya estaba bien (usa `product.NetoForTipo(tipoPasajero)` desde la Fase 3 del backlog UTG) pero **`AddPassenger` no tenía ese mismo fallback**.

**Causa raíz**: en `AddPassenger` (`order_handler.go`), `neto1` se declaraba como `float64` (cero por defecto) y solo se llenaba `if input.Neto1 != nil` — a diferencia de `CreateReservation`, nunca caía a `product.NetoForTipo(tipoPasajero)` cuando el campo no venía en el body. Agregar un pasajero desde Gestión de Nóminas (botón "+") sin tipear manualmente un Neto1 dejaba ese pasajero con `Neto1 = 0` en la DB — silencioso, sin error visible.

**Fix** (2026-08-11): `neto1 := product.NetoForTipo(input.TipoPasajero)` como valor base, sobreescrito solo si `input.Neto1 != nil` viene con un override explícito — mismo criterio que `CreateReservation`.

## Cálculo de tipo de pasajero no consideraba la fecha de regreso

**Síntoma** (feedback UTG): un pasajero que cambia de categoría (infante→menor, menor→adulto) entre la fecha de salida y la de regreso quedaba mal clasificado. Caso de prueba: nacimiento 02/01/2027, regreso 09/01/2027, quedaba "Infante" cuando no correspondía.

**Causa raíz**: `calcTipoPasajero(nacimiento, fechaSalida)` en `frontend/src/pages/Availability.jsx` solo recibía `selectedProduct?.fecha_salida` en sus 2 invocaciones — `selectedProduct.fecha_regreso` ya existía y se mostraba en el mismo componente, pero nunca se pasaba al cálculo de edad. El backend no recalcula nada al recibir la reserva (confía en el `tipo_pasajero` que manda el cliente).

**Fix** (2026-08-10): las 2 invocaciones ahora pasan `selectedProduct?.fecha_regreso || selectedProduct?.fecha_salida` (fallback si el producto es solo ida). Mismo criterio de "edad al regreso" que ya usaba `cumpleEdadMenor2Anios` en `analytics_handler.go`, pero nunca se había aplicado en el punto donde se fija el valor al cargar la reserva.

## Contador ADT-CHD-INF de Nóminas no se movía al confirmar

**Síntoma** (feedback UTG): al confirmar/vender pasajeros, el desglose ADT-CHD-INF en Gestión de Nóminas no cambiaba.

**Causa raíz**: `countPassengerTypes` en `frontend/src/pages/GestionNominas.jsx` contaba **todas** las filas de pasajeros sin filtrar por `estado` — a diferencia de los badges "Confirmadas/Pendientes" vecinos, que sí filtran. Un pasajero ya estaba contado desde que se creaba (pendiente), así que confirmarlo no cambiaba el total — no era un bug de memoización, el `useMemo` estaba bien.

**Fix** (2026-08-10): se excluyen del conteo los pasajeros en `cancelada`/`cancelado` (los estados `expirada`/`cedido` ya se filtraban antes, al armar el array `reservations`). Si esto no coincide exactamente con lo que UTG espera ver (¿debería ser solo confirmados, no pendientes+confirmados?), es lo primero a confirmar con ellos.

## "Cedido" invertido/ambiguo para una agencia que da y recibe cupos (UTG)

**Síntoma** (feedback UTG): en los casos de prueba, reservas genuinas aparecían marcadas como cedidas y viceversa. UTG cede algunos cupos y recibe otros — actúa en ambos roles.

**Causa raíz, parte 1 (backend)**: `GetAllReservations` (`order_handler.go`) solo matcheaba `Reservation.Agencia = mi agencia` o `Product.Agencia = mi agencia`. Un producto-espejo de cesión nace con `Agencia=""` — así que la agencia **cedente** nunca veía las ventas que la agencia receptora hacía sobre el espejo, pese a que el comentario de `RosterProductID` ya asumía que sí las vería ("el dueño ve TODOS sus pasajeros juntos... los vendidos por agencias a las que les cedió").

**Causa raíz, parte 2 (frontend)**: al agregar el match faltante (`source_agency`) en el backend, esas ventas se volvieron visibles para la agencia cedente — pero el ternario que decide el badge en `GestionReservas.jsx` y `GestionNominas.jsx` asumía que "si `original_agency` está seteado, SIEMPRE soy quien recibió el cupo" y mostraba "Cupo cedido de {original_agency}". Para la agencia cedente viendo su propio código en `original_agency`, esto literalmente mostraba "Cupo cedido de mí mismo" — la fuente real del síntoma "invertido".

**Fix** (2026-08-10):
1. `order_handler.go`: el WHERE de `agency_admin` ahora también matchea `product.source_agency = mi agencia` (mismo patrón que el scope `management` de `GetProducts`).
2. `GestionReservas.jsx`/`GestionNominas.jsx`: el ternario del badge ahora compara `original_agency` contra la agencia del usuario logueado (`useAuth().user.agencia`) — si coincide (soy el cedente), muestra "Cedido a {agencia que vendió}" en vez de "Cupo cedido de {mí mismo}".

**Riesgo a vigilar**: el match nuevo solo amplía visibilidad para la propia agencia contra sus propios productos-espejo (`source_agency = mi agencia`) — no debería abrir visibilidad entre agencias no relacionadas. Si aparece un reporte de "veo reservas que no debería", empezar por acá.

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
