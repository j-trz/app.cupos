Postmortems de bugs ya corregidos, para no re-investigar desde cero si un síntoma parecido reaparece. Ver [[Gotchas y Reglas de Oro]] para las reglas operativas generales (no ligadas a un bug puntual).

> Entradas verificadas contra código al momento de escribirse; fecha propia en cada una.

## Bandeja de Tickets: reservas emitidas no "caían" ahí + selección múltiple de Reservas rota

**Síntoma** (reportado por Julian): la Bandeja de Tickets no mostraba las reservas emitidas, y los botones "Confirmar"/"Emitir" de la selección múltiple en Gestión de Reservas tiraban error.

**Causa raíz 1 — emisión individual nunca generaba tickets**: `GenerateTicketsForReservationInternal()` (`ticket_handler.go`) es la función que crea las filas de `Ticket` cuando una reserva pasa a `EstadoInterno = "Emitido"` — pero solo la llamaba `BulkUpdateReservations` (`order_handler.go`), agregada junto con la selección múltiple. `UpdateReservation` (el flujo normal, de a una reserva por vez, usado desde Gestión de Nóminas/Reservas) calculaba `emitido_at` pero **nunca** llamaba a esa función — la enorme mayoría de emisiones (todo lo que no pasa por seleccionar varias reservas y usar el botón masivo) nunca generaba ticket, así que nunca aparecía en la Bandeja. Esto también explica la duda de Julian sobre Atlas: no hay ninguna dependencia de Atlas en la generación de tickets (`AtlasStatus` arranca en `"pendiente"` y el ticket ya es visible), el problema era puramente que no se generaba el ticket en absoluto en el flujo individual.

**Fix**: `UpdateReservation` ahora también llama a `GenerateTicketsForReservationInternal()` cuando detecta la transición a "Emitido" (mismo criterio que ya usaba para calcular `emitido_at`). La función ya es idempotente (si ya existen tickets para esa reserva, los devuelve sin duplicar), así que no hay riesgo de tickets repetidos si en algún momento se emite tanto individual como en bulk.

**Causa raíz 2 — selección múltiple de Reservas (Confirmar/Emitir) rota**: `reservationService.js` tenía dos bugs simultáneos en `bulkUpdateReservations`:
1. Llamaba `PUT /reservations/bulk-update` — pero la ruta real está registrada como `POST /orders/bulk-update` (no existe ningún grupo de rutas `/reservations` en el backend; toda esta lógica vive bajo `/orders`, ver `order_handler.go`). Método Y path equivocados → 404/405 seguro.
2. Mandaba `{ ids, estado: 'confirmado' }` o `{ ids, estado: 'emitido' }` — pero el backend tiene DOS campos independientes: `Reservation.Estado` (ciclo de vida, valor real `"confirmada"`, no `"confirmado"`) y `Reservation.EstadoInterno` (seguimiento de backoffice, valores válidos `Pendiente`/`Seña`/`Pagado`/`Emitido`, con mayúscula). El frontend nunca mandaba `estado_interno`, así que aunque el path/método se arreglaran solos, "Emitir" jamás iba a disparar la generación de tickets (el backend solo la dispara cuando `EstadoInterno == "Emitido"`).

**Fix**: `reservationService.js` ahora expone `bulkConfirmReservations(ids)` (→ `POST /orders/bulk-update` con `estado: 'confirmada'`) y `bulkEmitReservations(ids)` (→ mismo endpoint con `estado_interno: 'Emitido'`) como métodos separados en vez de uno genérico que mezclaba los dos campos. `GestionReservas.jsx` actualizado para llamar al método correcto según la acción.

**Causa raíz 3 (descubierta 2026-08-14, después de que el fix anterior llegara a producción)**: con el path/método y los campos ya corregidos, "Emitir"/"Confirmar" seguían tirando el mismo error genérico "Se requiere un array 'ids'...". `BulkUpdateReservations` y `BulkCancelReservations` (`order_handler.go`) declaraban `IDs []uuid.UUID` en el struct del request — pero `Reservation.ID` es `uint`, no UUID. Cuando el frontend manda `{ids: [42], ...}`, Gin intenta bindear `42` contra `uuid.UUID` (que solo acepta un string de 36 caracteres con guiones), `ShouldBindJSON` falla, y el handler cae en el mismo `if err != nil || len(req.IDs) == 0` que devuelve el mensaje genérico — indistinguible en el frontend de "mandaste el array vacío". **Fix**: ambos structs pasan a `IDs []uint`, sin tocar el resto de la lógica (`Where("id IN ?", req.IDs)` funciona igual con cualquier tipo de slice).

**Feature nueva — void de ticket pregunta por el stock**: `VoidTicket` (`ticket_handler.go`) ahora acepta `restore_stock` (bool) en el body; si es `true`, devuelve 1 lugar al `Product` asociado (mismo patrón GORM que usa `DeleteReservation` para restituir stock: `LEAST(cupo, GREATEST(0, disponibilidad + 1))` / `GREATEST(0, vendidos - 1)`, ambos dentro de una transacción junto con el `Save` del ticket). La decisión de si el lugar ocupaba stock o no queda en manos del usuario (no se intenta inferir automáticamente) — ver limitación de diseño abajo, sobre por qué no es trivial inferirlo del lado del backend. `BandejaTickets.jsx`'s `handleVoid` ahora pregunta explícitamente "¿Devolver al stock del cupo?" vs. "Void informativo" antes de pedir el motivo.

**Limitación de diseño detectada (no corregida, solo documentada)**: `Ticket.ReservationID` y `Ticket.PassengerID` (`models.go`) se generan con `uuid.NewSHA1(...)` a partir del ID entero real de `Reservation`/`Passenger` — son identificadores **derivados, no reversibles**, no una FK real utilizable para hacer `JOIN`/lookup hacia esas tablas (`Reservation.ID`/`Passenger.ID` son `uint`, no `uuid.UUID`). Por eso el fix de "devolver stock" no intenta determinar automáticamente si el pasajero del ticket era un infante (que no ocupa lugar) — no hay forma confiable de recuperar el `Passenger` real desde `Ticket.PassengerID` con una query directa. Si en el futuro hace falta ese dato desde `Ticket` de forma confiable, la solución real es agregar una columna con el ID entero real (no el hash) o una relación GORM propiamente tipada — no intentar revertir el hash SHA1.


## `BandejaTickets.jsx` (`/tickets`) no seguía el diseño del resto de la app

**Síntoma** (reportado por Julian): "el diseño no corresponde al resto del sistema" en la página de tickets.

**Causa raíz**: toda la página estaba escrita con `style={{}}` inline y colores hex arbitrarios (`#2563eb`, `#0f172a`, `#e4e4e7`, etc.) en vez de Tailwind + el kit de componentes propio (`Button`/`Card`/`Badge`/`ActionIconButton`) que usa el resto de `Gestion*.jsx`. Además: el wrapper raíz tenía `style={{ padding: '1.5rem' }}` duplicando el padding que `Layout.jsx`'s `<main>` ya aplica; los botones de acción de la tabla eran `<button style={{}}>` a mano en vez de `ActionIconButton`; el badge de estado `void` usaba `variant: 'error'`, que no existe en `Badge.jsx` (quedaba sin ningún color aplicado); y el modal de detalle pasaba `title=""` a `Modal.jsx` intentando un header "de borde a borde" custom, pero `Modal.jsx` igual renderiza su propia barra de título (vacía) + botón de cerrar, dejando un header duplicado feo.

**Fix** (2026-08-13): reescrita la página completa usando el kit de componentes y clases Tailwind (paleta `slate` + variants reales de `Badge.jsx`), `ActionIconButton` en la columna Acciones, wrapper raíz sin padding propio, y el modal de detalle con un `title` real (el look de "boarding pass" quedó como un panel con gradiente DENTRO del contenido, no reemplazando el chrome del modal). Se armó [[Guía de Diseño (para agregar elementos nuevos)]] (004) para que esto no se repita en páginas futuras.

## Deploy roto: import duplicado/roto de `BulkSelectionBar.jsx` (`Trash2`/`CheckCircle2`)

**Síntoma**: build de Vercel fallaba con `The symbol "Trash2" has already been declared` (`GestionOportunidades.jsx:7`), y tras corregir eso, con `"CheckCircle2" is not exported by "BulkSelectionBar.jsx"` (`GestionProductos.jsx:20`).

**Causa raíz**: `BulkSelectionBar.jsx` (`components/ui/`) re-exporta un puñado de íconos de lucide-react "por conveniencia" (`export { Trash2, Copy, CheckCircle, XCircle };` — nótese `CheckCircle`, no `CheckCircle2`, son íconos distintos). Al agregar la barra de selección múltiple a `GestionOportunidades.jsx`/`GestionProductos.jsx`, esas páginas importaron `{ Trash2, CheckCircle2 }` desde `BulkSelectionBar.jsx` en vez de (u además de) `lucide-react`:
- `GestionOportunidades.jsx` ya importaba `Trash2`/`CheckCircle2` de `lucide-react` en otra línea → **declaración duplicada del mismo nombre**, error real de sintaxis de módulos ES (esbuild lo detecta en dev/build, no en runtime).
- `GestionProductos.jsx` importaba `CheckCircle2` únicamente de `BulkSelectionBar.jsx`, que **no exporta ese nombre** (solo `CheckCircle`) → import inexistente, error de Rollup en build de producción.

**Fix**: en ambos archivos, los íconos se importan solo de `lucide-react` (de donde realmente vienen) y el import de `BulkSelectionBar.jsx` quedó como debía ser desde el principio — solo el default export (el componente de la barra), sin re-exports de íconos.

**Cómo evitar que se repita**: `BulkSelectionBar.jsx` re-exportar íconos de lucide-react "por conveniencia" es un patrón frágil — cualquier página que también importe esos mismos íconos directo de `lucide-react` (lo normal) corre riesgo de duplicado o de pedir un nombre que ahí no existe. Si se necesita el ícono en la página, importarlo siempre de `lucide-react` directo; no depender de que un componente de UI los re-exporte.

## 5 vulnerabilidades críticas de seguridad backend (auditoría 2026-08-13) — corregidas

Detalle completo del hallazgo original en [[Auditoría de Seguridad y QA - 2026-08-13]] — acá solo el resumen de los fixes, ya aplicados.

1. **`/api/data` (CRUD dinámico sin permisos, auto-elevación a admin)**: eliminado el endpoint y `data_handler.go` entero (sin ningún caller real en el frontend, confirmado con Grep antes de borrar).
2. **Escalada de privilegios RBAC** (`agency_admin` podía auto-asignarse `SUPER_ADMIN`): `setUserRole` (`rbac_handler.go`) ahora recibe el `*gin.Context` del caller — bloquea asignar `SUPER_ADMIN` a quien no sea ya admin, y extiende el chequeo de agencia a TODOS los roles de sistema (antes solo corría para roles personalizados). `AssignPermissionsToRole` filtra los permisos otorgables al subset propio del caller. **De yapa, mismo hallazgo pero más directo** en `CreateUser`/`UpdateUser` (`user_handler.go`): `profile.Role`/`profile.Admin` se aplicaban del body sin restricción — cualquier caller con `USERS_CREATE`/`USERS_UPDATE` podía poner `role:"admin"` directo. Corregido con el mismo criterio "se ignora en vez de error" que el archivo ya usa para la reasignación de agencia cross-scope.
3. **`POST /auth/register` público aceptaba cualquier agencia** en el body: eliminada la ruta y la función `Register` (sin ninguna página de auto-registro en el frontend — el alta de usuarios sigue existiendo, pero solo vía `CreateUser` autenticado).
4. **Secreto JWT de fallback hardcodeado** (`"fallback_secret_key"` si faltaba `JWT_SECRET`): `Login` ahora falla cerrado (500), igual que `middleware/auth.go` ya hacía para validar tokens.
5. **`/orders/:id` (Confirmar/Editar/Doc.Contable/Borrar Pasajero) sin permiso ni ownership**: se agregó `RequirePermission("RESERVATIONS_UPDATE")` (ya otorgado por default a los roles base, no rompe flujos existentes) + un helper `callerOwnsReservation()` en los 4 handlers.

Verificado con `go build ./...` y `go vet ./...`, ambos limpios.

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

**Cuarta pasada**: "Estado Aerolínea" (`estado_interno`) pasó de texto libre a `<select>` con 4 opciones fijas del lado frontend (`Cotizado`/`Rechazado por la aerolínea`/`Confirmado`/`Vencido` — el campo en sí sigue siendo `*string` sin constraint en DB, el enum vive solo en `OportunityForm.jsx`). Al elegir "Rechazado por la aerolínea" se dispara un popup (`Swal.fire` con `input: 'select'`, sin librería nueva) pidiendo el motivo: `Tarifa alta`/`Fechas incorrectas`/`Exceso de oferta`/`Vencido`, guardado en el nuevo campo `Opportunity.MotivoRechazo` (`*string`, migración `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS motivo_rechazo`) — el motivo queda visible bajo el select con un link "Cambiar motivo" para reabrirlo. `Vencido` en ambos combos es manual por ahora: no se armó lógica automática que lo setee solo al pasar la fecha de validez (no fue pedido explícitamente; requeriría un cron o un chequeo al leer la oportunidad).

Después, mismo hilo de conversación, se construyó el flujo "Convertir Oportunidad a Producto" — ver *Flujos de Funcionalidades* sección 19 y *Modelo de Datos* (`Opportunity.ProductoID`/`Estado="producto"`, `Product.PendienteAprobacion`) para el detalle completo, no se repite acá.

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
