Reglas operativas e invariantes que **no** son obvias leyendo un único archivo — se descubrieron a fuerza de incidentes repetidos en este repo. Léelo antes de tocar rutas, migraciones, RBAC o el entorno local. Complementa [[Historial de Bugs Resueltos]] (postmortems puntuales ya cerrados) y [Modelo de Datos](../005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md) (detalle de esquema).

> Última verificación de las reglas 1-13 contra código: 2026-08-12. Reglas 14-24 agregadas 2026-08-13 tras la [[Auditoría de Seguridad y QA - 2026-08-13|auditoría integral de seguridad/QA]] (5 agentes en paralelo) — documentan prácticas nuevas, no necesariamente bugs ya corregidos (ver el link para el detalle completo y el estado pendiente/resuelto de cada hallazgo). Regla 25 agregada 2026-08-14 (ecosistema de herramientas de IA instaladas a nivel global).

## 1. Dos entrypoints de backend duplican TODA la tabla de rutas

`backend-go/cmd/api/main.go` (local, `go run`) y `backend-go/api/index.go` (handler serverless de Vercel) registran las rutas **por separado**, sin compartir código de ruteo. Cualquier ruta nueva debe agregarse a **ambos** archivos o funciona en producción y devuelve 404 en local (o viceversa).

- **Caso real detectado 2026-08-10**: `GET /api/reports/user-metrics` existía en `api/index.go` pero faltaba en `main.go` — cualquiera que la llamara en desarrollo local recibía 404 pese a estar documentada y funcionar en producción. Corregido agregando la línea faltante a `main.go`.
- **Cómo chequear drift rápido**: `grep -oE '\.(GET|POST|PUT|DELETE)\("[^"]+"' cmd/api/main.go | sort -u` vs el mismo comando sobre `api/index.go`, y `diff`/`comm` los dos listados. Vale la pena correrlo antes de asumir "ya está en ambos" tras un cambio grande de rutas.

## 2. GORM AutoMigrate no es 100% confiable en producción

Las columnas/tablas nuevas deben llevar, además de `db.AutoMigrate(...)`, un `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` idempotente en `runSQLMigrations()` (`db.go`), como red de seguridad. Ha pasado que una columna nueva aparece en local y no en producción pese a que el modelo Go ya la declaraba.

## 3. No hay base de datos de test/staging separada

`backend-go/.env` y el backend local (`go run ./cmd/api`, puerto 5002) apuntan a la **misma base Neon de producción** que la app desplegada. Esto significa:

- Cualquier dato que cargues en local es dato real de producción — no hay sandbox.
- Verificación visual con login: no hay credenciales de prueba "seguras" por defecto. Antes de loguearte a pantallas gateadas para verificar un fix, la práctica establecida es preguntar una vez si conviene (a) usar credenciales reales, (b) crear una cuenta descartable, o (c) saltar la verificación visual y confiar en revisión de código + build exitoso (`npm run build` / `go build` / `go run` con el server bootenado). La opción (c) es la preferida del usuario para fixes rutinarios de layout/CSS — no hace falta volver a preguntar cada vez, solo para cambios de alto riesgo (mutaciones de datos, lógica de pricing/pagos).

## 4. La expiración de reservas depende de un trigger externo

`GET /api/cron/expire-reservations` (`ExpireReservations` en `cron_handler.go`) tiene toda la lógica correcta para vencer `bloqueo_temporal` y devolver stock — pero como el backend corre serverless (Vercel), **nada la dispara sola**. `.github/workflows/expire-reservations.yml` la golpea cada 3 minutos via GitHub Actions (necesita los secrets de repo `BACKEND_URL` y `CRON_SECRET`, coincidiendo `CRON_SECRET` con la env var del backend). Si las reservas dejan de vencer, lo primero a chequear es que esos dos secrets existan y que GitHub Actions no esté deshabilitado — GitHub además auto-desactiva schedules tras 60 días sin actividad en el repo, así que un `cron-job.org` pegándole al mismo endpoint es un fallback más confiable si esto se repite. El intervalo de 3 minutos no es arbitrario: es más frecuente que el propio vencimiento del **hold** de stock (`bloqueo_hold_minutos`, 10 min por defecto) — con un intervalo más largo, un hold abandonado podría tardar casi el doble de su propio vencimiento en liberarse de verdad.

## 5. `can(código)` es asíncrono — el guard de acceso va SIEMPRE después de todos los hooks

Desde que el gating pasó de `user.role === 'admin'` (síncrono, viene de `localStorage`) a `can('MODULE_ACTION')` (depende de `user.permissions`, que `AuthContext` trae async tras el login), cualquier `if (!can(...)) return <AccesoRestringido/>` colocado **antes** de un `useState`/`useEffect` puede crashear la página: el guard devuelve `true`/`false` distinto entre el primer render (0 hooks llamados) y un render posterior (25+ hooks llamados), violando las reglas de hooks de React. Pasó en producción con `Reportes.jsx`. **Regla**: el guard va siempre justo antes del `return` final del JSX, después de absolutamente todos los hooks.

## 6. Cualquier ruta nueva gateada por rol usa `RequirePermission`, nunca `AdminOnly()`/`AgencyAdminOrAdmin()`

Esas dos funciones son legado del sistema de 3 roles hardcodeados — se mantienen definidas (por si hace falta un rollback rápido) pero no deben usarse en código nuevo. Todo endpoint nuevo que necesite gating por rol/permiso usa `middleware.RequirePermission("MODULE_ACTION")` en **ambos** entrypoints (ver regla 1), con el módulo/permiso correspondiente agregado a `seedRBAC()` (`db.go`) **y** a `frontend/src/lib/permissionModules.js` (para que aparezca en la matriz de Roles). Toda página admin nueva necesita AMBOS: una entrada en `Sidebar.jsx` con su `permission`, y su propio guard `can(...)` a nivel de página (la entrada del Sidebar solo oculta el link, no es control de acceso real — una URL directa la esquiva).

## 7. Visibilidad "de agencia" vs "del creador" — default a agencia-wide

En esta plataforma B2B, varios agentes de la misma agencia comparten el mismo pool de cupos. Antes de scopear una feature informativa nueva (ej. "hay bloqueos temporales activos") por `created_by`, preguntate si el dato es genuinamente privado del creador o contexto compartido de la agencia. Default: agencia-wide (despojado de campos personales), salvo que el contenido mismo sea el de la reserva privada. Ejemplo real: el aviso de "cupos con bloqueo temporal" en Disponibilidad se corrigió de `created_by` a `agencia` porque el objetivo es que cualquier vendedor de la agencia sepa que un *compañero* (no necesariamente él) tiene el cupo tomado.

## 8. Las tools de IA que tocan datos financieros o cross-agencia siguen un patrón de 3 niveles

Cualquier tool nueva del asistente (`ai_handler.go`) que toque campos financieros de `Reservation`/`Product` (`neto_1`, `op`, rentabilidad) o cruce agencias debe replicar el patrón ya establecido:

- **`user`/`agency_user`**: solo sus propias reservas (`created_by`), nunca ve `neto_1`/`op`/rentabilidad ni campos de cesión (`transfer_id`, `original_agency`) — se limpian con `sanitizeReservationForUser()` incluso en sus propias reservas.
- **`agency_admin`**: mismas tools que admin, pero scopeadas a su propia agencia (propia `agencia` O reservas sobre productos que su agencia posee) — nunca cross-agencia, ni pasando un parámetro explícito ni un ID adivinado.
- **`admin`**: sin restricciones.

## 9. Cambios de UI-solo del asistente nunca escriben en la DB

Las tools de tipo `UIAction` (`abrir_modal_reserva`, `navegar_a_pantalla`, `completar_formulario_pasajeros`) son deliberadamente de solo-frontend — nunca tocan la base de datos, lo que las hace seguras de invocar especulativamente. Cualquier tool nueva de este tipo debe mantener esa invariante; si necesita persistir algo, es una tool de datos (con su propio scoping de rol), no una `UIAction`.

## 10. Antes de re-derivar "por qué Reportes sigue mostrando X", revisar los dos matchers de filtro

`Reportes.jsx`/`analytics_handler.go` tienen dos matchers de filtro **independientes y no simétricos**: `passengerMatches` (filtra por `Reservation.Agencia`, quién *vendió*) y `productMatches` (filtra por `Product.Agencia`, quién *es dueño* del cupo). Un filtro nuevo en `FiltersPanel.jsx` puede funcionar en los handlers que iteran pasajeros y ser un no-op silencioso en los que iteran productos (o viceversa) si no se agrega a ambos matchers.

## 11. OP (ganancia) es por tipo de pasajero desde el 2026-08-10 — no uses `Product.OP` a secas

Desde que se individualizó la ganancia por tipo (`OPAdt`/`OPChd`/`OPInf`), cualquier cálculo nuevo que necesite "la ganancia de este producto" debe preguntar **de qué tipo de pasajero** — `Product.OP` (singular) es solo un valor legado sincronizado a `OPAdt`, no un promedio ni un total. Usar siempre `product.OPForTipo(tipoPasajero)` (Go) o el patrón `product[\`op_${suffix}\`] ?? product.op` (frontend, ver `passengerPriceSuffix` en `GestionNominas.jsx`) en vez de leer `.OP`/`.op` directo. Rentabilidad agregada (reportes/IA) se calcula como `Σ (OP_tipo × vendidos_tipo)` vía el helper `rentabilidadPonderada()` (`analytics_handler.go`), no como `OP × Vendidos` — ese criterio viejo subestimaba/sobreestimaba la ganancia real en cualquier producto con mezcla de ADT/CHD/INF.

**`Neto1` NO es un valor único** — a diferencia de `OP` antes de esta pasada, el Neto1 real siempre fue por tipo de pasajero (`TarifaX + ImpuestosX`, `Product.NetoForTipo()`) y así se asigna al vender (`Passenger.Neto1` en `CreateReservation`/`AddPassenger`, `order_handler.go`). No confundir con `Product.Neto1` (singular) — ese es un campo manual aparte, sin relación con el Neto1 de ningún pasajero, usado solo como insumo de "Riesgo" en reportes. Corregido 2026-08-11: `AddPassenger` no tenía este fallback y dejaba `Neto1 = 0` si no venía explícito en el request — ahora usa `product.NetoForTipo(tipo)` igual que `CreateReservation`.

## 12. Un campo/columna "no persiste" en local puede ser el backend viejo, no un bug de código

El backend Go no tiene hot-reload: `go run cmd/api/main.go` compila una sola vez al arrancar. Si se agrega un campo nuevo a `models.go` (+ migración) mientras ese proceso ya está corriendo, el binario en memoria sigue sin conocer el campo — cualquier valor que el frontend mande para esa columna se ignora silenciosamente en el `json.Unmarshal`, con cero error visible. Síntoma típico: "el campo se ve en el formulario pero nunca queda guardado", con el código (modelo, migración, whitelist del `Select()`, frontend) leyéndose 100% correcto. **Antes de asumir un bug de lógica en un campo agregado recientemente, reiniciar el backend local primero.**

## 13. `NotifyBroadcastByCode` es "todo el sistema, cualquier agencia" — reservarlo para avisos genuinamente globales

Un `Notification` sin `TargetUserID`/`TargetRole`/`TargetAgency` matchea el `OR (target_user_id IS NULL AND target_role = '' AND target_agency = '')` de `GetNotifications`/`GetUnreadCount` (`notification_handler.go`) — es decir, le llega a **todos los usuarios de todas las agencias**, sin excepción. Un evento de negocio ligado a una agencia o producto puntual (ej. "se cargó un producto nuevo") casi nunca debería usar `NotifyBroadcastByCode`: si el dato es privado de una agencia (como `Product`, que solo ve su dueña), el aviso también debe serlo — usar `NotifyAgencyByCode(product.Agencia, ...)`, no `NotifyBroadcastByCode`. **Caso real corregido 2026-08-12**: `new_product`/`new_product_bulk` (`product_handler.go`, `CreateProduct`/`BulkCreateProducts`) usaban `NotifyBroadcastByCode` — cualquier agencia que cargaba un cupo privado le avisaba a los usuarios de TODAS las demás agencias del sistema, que ni siquiera podían ver ese producto. `NotifyBroadcastByCode` queda reservado para avisos de sistema real (mantenimiento, etc.), hoy sin ningún caller.

También en esa corrección: se detectó que ni `product_changed` ni `new_product` disparaban un email real — solo creaban la `Notification` in-app, pese a tener plantilla de `EmailTemplate` (o merecerla). Se agregó `services.SendTemplateEmailToAgency()` (`email_service.go`) para el caso "aviso a toda la agencia por email" (antes solo existía `SendTemplateEmail`, un destinatario puntual) y se sumaron las plantillas de email faltantes (`new_product_bulk`, `product_changed`) a `seedEmailTemplates()` (`db.go`). Patrón a seguir para cualquier notificación nueva: `Notify*ByCode` (in-app) + `SendTemplateEmail`/`SendTemplateEmailToAgency` (email) en el mismo call site, igual que ya hacía `warnExpiringReservations` (`cron_handler.go`) — no asumir que uno implica el otro.

## 14. Todo handler con `:id` verifica ownership, no solo el permiso de rol

`RequirePermission("MODULE_ACTION")` responde "¿este rol puede hacer X en general?" — no "¿puede hacer X en ESTE registro puntual?". La auditoría del 2026-08-13 encontró la misma clase de bug repetida en `orders/:id` (`ConfirmReservation`/`UpdateReservation`/`AddDocContable`/`DeletePassenger`), `group_handler.go` (`UpdateGroup`/`DeleteGroup`/etc.), `email-config`/`atlas-config`, templates de notificación/email y `transfers/all`: el endpoint exige el permiso correcto pero nunca compara `Agencia`/`created_by` del registro contra el caller — cualquier usuario con ese permiso en SU agencia puede mutar/leer el de OTRA. Regla: todo handler que reciba un `:id` de un recurso con dueño (`Agencia`, `AgencyID`, `created_by`) debe comparar explícitamente contra `c.Get("agencia")`/`c.Get("userID")` para roles no-admin — igual que ya hace `GetProductByID`/`canReserveProduct`. Al escribir un handler nuevo, copiar el chequeo de su "hermano" ya correcto en el mismo archivo (ej. `GetUserTransfers` scopea bien, `ListTransfers` no).

## 15. Nunca bindear campos de privilegio/tenant directo de un body público

`Register` (`user_handler.go:323-390`) bindea `models.Profile` completo desde el JSON del request, incluyendo `Agencia` — solo pisa `Role`/`Admin`/`ID` después, dejando que un registro anónimo declare pertenecer a cualquier agencia. Regla: `role`, `admin`, `agencia`/`agency_id`, `is_active` (o cualquier campo que determine privilegio o alcance de datos) nunca se leen del body de un endpoint público o de bajo privilegio — se resuelven server-side (contexto de sesión, invitación, decisión de un admin) y se pisan explícitamente ANTES de cualquier `Create`/`Update`, no después ni "probablemente no importa".

## 16. Un endpoint de asignación de rol/permiso nunca deja que el caller otorgue más de lo que él mismo tiene

`setUserRole`/`AssignRoleToUser` (`rbac_handler.go`) solo comparaban agencia cuando `role.AgencyID != nil` — los roles globales sembrados (`SUPER_ADMIN` incluido) tienen `AgencyID == nil`, así que un `agency_admin` con `ROLES_ASSIGN_PERMISSIONS` podía auto-asignarse `SUPER_ADMIN` sin ningún chequeo adicional. Regla: cualquier endpoint que asigne un rol o adjunte permisos a un rol debe validar que el caller no esté otorgando (a sí mismo o a otro) un privilegio que excede su propio nivel — comparar explícitamente contra el rol/agencia del caller, nunca asumir que el permiso de "puedo asignar roles" ya implica "solo roles razonables".

## 17. Sin secretos de fallback hardcodeados — fallar cerrado, siempre

`user_handler.go` firmaba JWTs con `"fallback_secret_key"` si `JWT_SECRET` no estaba seteada, mientras que `middleware/auth.go` (que valida esos mismos tokens) sí fallaba con 500 en ese caso — una inconsistencia que silenciosamente emite tokens válidos firmados con un secreto ahora público. Regla: si una env var contiene un secreto de firma/cifrado, TODO punto del código que la use debe fallar cerrado (error explícito, nunca un valor por defecto) de forma consistente — no alcanza con que un solo lugar lo haga bien.

## 18. Todo campo-modelo de secreto lleva `json:"-"` a nivel de modelo

`EmailSMTPConfig.SMTPPass` no tenía `json:"-"` (a diferencia de `AtlasConfig.Clave`, que sí se limpia explícitamente antes de responder) — cualquier usuario autenticado podía leer la contraseña SMTP en texto plano vía `GetEmailConfig`. Regla: cualquier campo de modelo que sea un secreto (API key, password de servicio externo, token) lleva `json:"-"` en el propio struct de `models.go`, no una limpieza manual handler-por-handler — la limpieza manual solo protege el endpoint que alguien se acordó de tocar; el struct-tag protege todos, incluyendo backups/exports/list futuros.

## 19. Nunca un endpoint de CRUD genérico (tabla+columna arbitraria) en una app multi-tenant

Existía `/api/data` (`data_handler.go`): un endpoint gateado solo por autenticación (sin `RequirePermission`) que aceptaba un nombre de tabla y de columna arbitrarios del query/body y los usaba directo en un `WHERE`/`Create`/`Update`/`Delete` de GORM — cualquier usuario autenticado podía dumpear cualquier tabla (incluyendo password hashes) o auto-promoverse a admin escribiendo `role: "admin"` en su propia fila de `profiles`. Regla: no crear "endpoints de administración de base de datos" genéricos ni siquiera para debugging interno — si hace falta un browser de datos admin, es admin-only explícito, con allow-list de tablas/columnas, nunca con el nombre de columna interpolado en SQL.

## 20. Cualquier lectura-y-luego-escritura de `Product.Disponibilidad` debe lockear la fila primero

`CreateHold`/`AdjustHold` y la tool de IA `crear_reserva` ya usan `tx.Clauses(clause.Locking{Strength: "UPDATE"})` antes de leer `Disponibilidad` — pero `CreateReservation` (el flujo de reserva NORMAL, no el del asistente) y `AddPassenger`/`DuplicatePassenger`/`CreateTransfer` no lo hacían, permitiendo que dos requests concurrentes lean el mismo valor de stock antes de que ninguno confirme y ambos pasen la validación de disponibilidad — sobreventa real del mismo asiento. Regla: todo código nuevo que lea `Product.Disponibilidad` con intención de decrementarla/incrementarla en el mismo flujo DEBE hacer `tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, id)` antes de leer el valor — nunca un `First()` simple seguido de un `Save()`. Vale la pena extraer esto a un helper (`lockProductForUpdate(tx, id)`) para que no dependa de que cada autor se acuerde de copiar el boilerplate.

## 21. Nunca descartar el error de una escritura a DB que dispara notificaciones o responde éxito al cliente

`CreateProduct` (ignora el error de `Create`) y `ConfirmReservation` (ignora el de `Save`/`Update` en la transición de estado) seguían notificando por email/in-app y devolviendo 200/201 aunque la escritura real hubiera fallado — el cliente ve "confirmado"/"creado" mientras la DB puede no reflejarlo. Regla: en cualquier handler que dispare un side-effect visible (notificación, email, respuesta de éxito) después de una escritura, chequear `.Error` de esa escritura y abortar con un error explícito antes de disparar el side-effect — nunca asumir que un `Create`/`Save`/`Update` de GORM "prácticamente nunca falla".

## 22. Toda secuencia que toque stock de Producto + Reserva/Pasajero va en una transacción

`CreateReservation`/`CreateHold`/`ConvertOpportunityToProduct` ya usan `database.DB.Transaction(...)` correctamente, pero los flujos de cancelación/borrado (`DeleteReservation`, cancelación directa, `ResolveCancellation`, `DeletePassenger`) son secuencias de escrituras sueltas sin transacción — un fallo a mitad de camino puede dejar el stock ya devuelto pero la reserva sin borrar (o viceversa). Regla: cualquier operación que toque en el mismo flujo lógico tanto los contadores de `Product` como filas de `Reservation`/`Passenger` va envuelta en `database.DB.Transaction(func(tx *gorm.DB) error {...})`, sin excepción — no solo el camino de creación, también cancelación/borrado.

## 23. Todo hook de listado maneja `isError` explícitamente, no solo `isLoading`

`GestionOportunidades.jsx`/`GestionTemporadas.jsx` solo destructuran `isLoading` de su query — en un fetch fallido, `data` cae al default `[]` y la tabla se ve idéntica a "no hay datos todavía", sin ninguna señal de que algo salió mal. Regla: todo componente que consuma un hook de listado (`useX()` de TanStack Query) debe destructurar y renderizar `isError` con un estado visual distinto al de "vacío" — comparar contra `GestionProductos.jsx`/`GestionUsuarios.jsx`, que ya lo hacen bien.

## 24. Prácticas menores que se repiten seguido, en una sola línea cada una

- Formularios con 2 fechas relacionadas (salida/regreso, inicio/fin) validan `fin >= inicio` al submit — el auto-ajuste de una al cambiar la otra no reemplaza la validación.
- Todo prop tipo `isLoading`/disabled-durante-mutación de un componente compartido (ej. `ProductForm`) debe ser pasado por CADA caller, no solo declarado — un prop sin usar es peor que no tenerlo, porque en code review parece manejado.
- Librerías que parsean archivos subidos por el usuario (Excel/CSV/PDF) son una clase de dependencia de escrutinio alto — chequear mantenimiento activo del paquete, no solo el rango de semver (`xlsx`/SheetJS en npm es un ejemplo real: semver verde, seguridad muerta).
- Todo token de auth se lee/escribe únicamente vía `ApiClient.getToken()`/`setToken()` (frontend) — ningún service llama `localStorage` directo para esto (pasó en `exportService.js`, quedó leyendo una clave que nadie escribe).
- Código muerto de fallback de auth (cookies no usadas, `?token=` en query, claves de storage no escritas) se borra al notarlo — no se deja "por si acaso", porque es exactamente lo que una feature futura activa sin querer.
- Páginas nuevas se registran con `React.lazy()` + `Suspense` en `App.jsx`, no `import` estático — evita que cada página nueva siga engordando el bundle único.

## 25. Ecosistema de herramientas de IA (global, no solo de este repo) — cuándo usar cada una acá

Julian corrió una evaluación de tooling de IA a nivel global (2026-08-14, no específica de app-cupos) — el detalle completo y el por qué de cada decisión vive en `~/.claude/rules/ai-tooling-strategy.md` (fuera del repo, no versionado acá). Lo que sí es específico de este proyecto es **cuándo usar cada una**:

- **`codebase-memory-mcp`** (MCP server instalado global, indexa código real en un grafo): antes de explorar `backend-go`/`frontend` a mano con grep+lectura de archivos completos para preguntas estructurales ("¿dónde está X?", "¿qué llama a `CreateReservation`?", "mapa de la arquitectura"), correr `index_repository` una vez sobre el repo y usar `search_graph`/`trace_path`/`get_architecture` — ahorra un orden de magnitud de tokens frente a grep+lectura completa. Si el índice quedó viejo tras un cambio grande de código, reindexar antes de confiar en una query — no asumir que el grafo se actualiza solo.
- **`impeccable`** (skill de diseño instalada global, 23 comandos + detectores deterministas): **ampliado 2026-08-15 a pedido explícito de Julian** — pasa de estar acotada a superficies de marca a gobernar **todo** el diseño del proyecto, incluidas las pantallas `Gestion*.jsx` internas (tablas, formularios, modales de gestión). La condición sigue siendo estricta: es para **elevar** lo que ya existe (modernizar tablas rotas, iconografía, jerarquía visual), **nunca** para reemplazarlo por la estética genérica de impeccable o por otro kit (shadcn, etc.) — sigue mandando el kit propio (`Button`/`Card`/`Badge`/`Table`/`ActionIconButton`) y la paleta Tailwind `slate` de `004 - Frontend/Guía de Diseño (para agregar elementos nuevos).md`, que es la base que impeccable eleva, no reemplaza.
- **`superpowers`**: desactivado globalmente (choca con el objetivo de ahorrar tokens) — no aplica a este repo tampoco, no hace falta reactivarlo acá.
- Convención general (no solo de este repo): usar el skill `defuddle` en vez de `WebFetch` para leer páginas web normales (artículos, docs) durante cualquier tarea de investigación en este proyecto.

---

## Antes de escribir código nuevo, checklist rápido

- ¿Agregué la ruta en **ambos** `main.go` e `index.go`? (regla 1)
- ¿La columna/tabla nueva tiene migración SQL idempotente además de `AutoMigrate`? (regla 2)
- ¿El endpoint/página nueva usa `RequirePermission`/`can()` y no `AdminOnly()`/`user.role`? (reglas 5 y 6)
- ¿El guard de página está después de todos los hooks? (regla 5)
- ¿Una tool de IA nueva con datos sensibles replica el patrón de 3 niveles? (regla 8)
- ¿Una feature "quién más ve esto" está scopeada por agencia y no por creador, salvo que el dato sea genuinamente privado? (regla 7)
- ¿El handler nuevo con `:id` compara `Agencia`/`created_by` del registro contra el caller, no solo el permiso de rol? (regla 14)
- ¿El flujo nuevo que lee-y-escribe `Product.Disponibilidad` lockea la fila (`clause.Locking`) y va envuelto en transacción si toca Reserva/Pasajero en el mismo paso? (reglas 20 y 22)

---

## Protocolo de actualización del vault (para que siga siendo veraz)

Este vault es la fuente de verdad del proyecto — pero una fuente de verdad que no se actualiza se vuelve una fuente de mentiras con buena presentación. Reglas:

1. **Sello de frescura**: toda nota sustancial (001, 003, 005, 006) lleva cerca del título una línea `> Última verificación ... : YYYY-MM-DD` con la fecha de la última vez que se leyó el código real y se confirmó que la nota sigue diciendo la verdad — no simplemente la fecha en que se editó el texto.
2. **Terminar una tarea incluye actualizar el vault**, igual que correr el build o el linter. Si el cambio:
   - agrega/modifica un endpoint → actualizar `001 - API` (y `003` si cambia un flujo de negocio).
   - agrega/modifica una tabla o columna → actualizar `005 - Modelo de Datos`.
   - corrige un bug no trivial → agregar entrada a `Historial de Bugs Resueltos`.
   - revela una regla operativa nueva (algo que rompió por una razón no obvia) → agregar una regla numerada nueva a esta nota.
   - queda genuinamente pendiente (no se implementó, se difirió) → anotarlo en el backlog (`008 - Backlog y Feedback`), no acá.
3. **Toda alta de nota o carpeta actualiza [[index]] y agrega una línea a [[log]]** (prefijo `INGEST`) — son las dos páginas por las que arranca cualquier sesión nueva; si no se actualizan, el catálogo miente igual que una nota vieja sin sello de frescura. Un lint periódico del vault (contradicciones, notas huérfanas, referencias rotas) también se anota en `log.md` con prefijo `LINT`.
4. **Nunca confiar en una nota vieja para una acción consecuente sin re-verificar contra el código.** Una nota con sello de frescura viejo (o sin sello) es una hipótesis a confirmar con `grep`/lectura de código antes de editar algo en base a ella — no un hecho consumado. Para responder una pregunta exploratoria sin tocar código, sí alcanza con citarla tal cual.
5. **Una sola fuente de verdad por hecho.** Si algo ya está documentado acá, no se duplica en la memoria privada de Claude Code (`~/.claude/projects/.../memory/`) — esa memoria queda para preferencias de colaboración y feedback puntual sobre cómo trabajar, con un puntero a la nota del vault correspondiente en vez de repetir el contenido. Evita que las dos copias diverjan silenciosamente.
