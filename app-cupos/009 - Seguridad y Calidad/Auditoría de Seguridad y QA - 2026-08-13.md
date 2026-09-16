Auditoría integral pedida por Julian ("quiero que sea una plataforma mega segura"): seguridad backend, seguridad frontend, QA/QC de correctitud (backend y frontend) y revisión de UX/UI vs. tendencias actuales. Ejecutada con 5 agentes en paralelo (`superpowers:dispatching-parallel-agents`), cada uno de solo lectura — **ningún archivo fue modificado durante la auditoría en sí**. Fecha: 2026-08-13. Nada de esto se re-verificó después de escribirse — antes de actuar sobre un hallazgo, confirmar contra el código real (puede haber cambiado).

> Convención de esta nota: `[ ]` = pendiente de arreglar, `[x]` = ya resuelto (mover el detalle a [[Historial de Bugs Resueltos]] cuando se cierre y tachar acá o borrar la línea).

---

## Resumen ejecutivo

**Hay vulnerabilidades críticas explotables hoy por cualquier usuario autenticado**, la más grave siendo un endpoint de CRUD genérico sin permisos que permite auto-promoverse a admin y volcar cualquier tabla de la base. Esto no es teórico — es un camino directo de "usuario recién registrado" a "control total del sistema". Recomendación: tratar la sección **Seguridad Backend — Crítico** como prioridad inmediata, antes que cualquier otra cosa de esta lista.

El resto (QA de correctitud, UX/UI) es trabajo de calidad normal — importante pero no urgente en el mismo sentido.

---

## 1. Seguridad Backend (Go/Gin/GORM)

### Crítico

- [x] **`/api/data` (GET/POST/PUT/DELETE) — CRUD genérico sin permisos, con auto-elevación a admin.** `backend-go/pkg/handlers/data_handler.go:11-74`, rutas en `main.go:283-289`/`index.go:282-288` solo con `AuthMiddleware()`, sin `RequirePermission`. `GetData` concatena el nombre de **columna** (no solo el valor) sin escapar en el `WHERE`. `ExecuteCRUD` acepta `table`/`data`/`id` crudos del body sin allow-list ni chequeo de ownership. Cualquier usuario autenticado puede `GET /api/data?table=profiles` (dump de password hashes de todos), o `POST /api/data {"table":"profiles","operation":"update","id":"<propio-id>","data":{"role":"admin"}}` para auto-promoverse. **Resuelto 2026-08-13**: se confirmó (Grep) que el frontend no tenía ningún caller — se borró el endpoint y el archivo `data_handler.go` entero, en vez de gatearlo.
- [x] **Escalada de privilegios en RBAC — un `agency_admin` puede auto-asignarse `SUPER_ADMIN`.** `rbac_handler.go:354-370` (`setUserRole`) solo valida agencia cuando `role.AgencyID != nil` — los 5 roles sembrados (`SUPER_ADMIN`, `AGENCY_ADMIN`, etc., `db.go:194-215`) tienen `AgencyID == nil`, así que el chequeo nunca corre para ellos. `AssignRoleToUser` (`rbac_handler.go:375-397`) tampoco compara agencia del caller vs. target. Un `agency_admin` con `ROLES_VIEW`+`ROLES_ASSIGN_PERMISSIONS` (permisos que tiene por default) puede verse el UUID de `SUPER_ADMIN` y auto-asignárselo. **Resuelto 2026-08-13**: `setUserRole` ahora recibe el `*gin.Context` y bloquea asignar `SUPER_ADMIN` a menos que el caller ya sea admin, más extiende el chequeo de agencia a TODOS los roles de sistema (antes solo corría para roles personalizados con `AgencyID != nil`). `AssignPermissionsToRole` ahora filtra los permisos otorgables al subset que el propio caller ya tiene (si no es admin). **De paso, mismo hallazgo pero en `CreateUser`/`UpdateUser`** (`user_handler.go`): `profile.Role`/`profile.Admin` se aplicaban del body sin ninguna restricción — cualquier caller con `USERS_CREATE`/`USERS_UPDATE` (ej. `agency_admin`) podía poner `role:"admin"`/`admin:true` directo, sin pasar siquiera por la tabla RBAC granular. Corregido con el mismo criterio "se ignora en vez de error" que ya usa el archivo para la reasignación de agencia cross-scope.
- [x] **`POST /auth/register` permite a un anónimo declarar pertenecer a cualquier agencia.** `user_handler.go:323-390` bindea `models.Profile` completo del body, incluyendo `Agencia` — solo `Role`/`Admin`/`ID` se pisan después. Un atacante anónimo se registra con `"agencia":"<agencia-competidora>"` y queda logueado viendo todo lo scopeado a esa agencia. **Resuelto 2026-08-13**: se confirmó (Grep) que no existe ninguna página de auto-registro en el frontend — se eliminó la ruta pública y la función `Register` entera. El alta de usuarios sigue existiendo, pero solo autenticada vía `CreateUser` (Gestión de Usuarios).
- [x] **Secreto JWT de fallback hardcodeado.** `user_handler.go:150` y `:370`: si `JWT_SECRET` no está seteada, firma con `"fallback_secret_key"` (ahora público en este documento) en vez de fallar — inconsistente con `middleware/auth.go:82-87`, que sí falla cerrado. **Resuelto 2026-08-13**: `Login` ahora falla cerrado (500) igual que el middleware; la otra ocurrencia (en `Register`) desapareció junto con esa función.
- [x] **Endpoints de `/orders/:id` sin permiso NI chequeo de ownership.** `ConfirmReservation` (`order_handler.go:846-904`), `UpdateReservation` (994-1053), `AddDocContable` (1055-1094), `DeletePassenger` (946-992) — rutas sin `RequirePermission`, handlers sin comparar `reservation.Agencia`/creador vs. caller. Cualquier usuario de cualquier agencia puede confirmar/editar/borrar pasajeros de una reserva ajena — incluyendo liberar el stock de un competidor para reservarlo uno mismo. **Resuelto 2026-08-13**: se agregó `RequirePermission("RESERVATIONS_UPDATE")` en ambos entrypoints (permiso ya otorgado por default a `SALES_AGENT`/`SALES_SUPERVISOR`/`AGENCY_ADMIN` — no rompe ningún flujo existente) + un helper `callerOwnsReservation()` (admin siempre, el resto solo su propia agencia) aplicado en los 4 handlers.

### Alto

- [ ] **Tool de IA `crear_reserva` no llama a `canReserveProduct`** (el chequeo que sí tiene el `CreateReservation` REST) — puede reservar cupos de otra agencia vía chat. Además `buscar_productos` (`ai_handler.go:972-1056`) no filtra por agencia (a diferencia de `GetProducts`), exponiendo IDs de productos ajenos.
- [ ] **`agency_admin` confundido con `admin` en varios chequeos de ownership**: tool de IA `mis_reservas`, `GetReservationByID`, `RequestCancellation`, `RequestGroupCancellation` — un `agency_admin` puede leer/cancelar reservas de otra agencia.
- [ ] **`/email-config` y `/atlas-config` sin `RequirePermission` ni ownership check** (pese a existir `EMAIL_VIEW/UPDATE`/`ATLAS_VIEW/UPDATE` en `seedRBAC`, nunca cableados a estas rutas). Además `EmailSMTPConfig.SMTPPass` no tiene `json:"-"` → cualquier usuario autenticado ve la contraseña SMTP en texto plano (`GetEmailConfig`). Riesgo: interceptar emails de confirmación con PII de pasajeros re-apuntando el SMTP.
- [ ] **`group_handler.go`: `UpdateGroup`/`DeleteGroup`/`SendGroupQuote`/`ConfirmGroup`/`ResolveGroupCancellation` gateados por permiso pero no por agencia** — un `agency_admin` puede editar/borrar grupos de otra agencia.
- [x] **`/api/reports/*` (legacy GET) filtran cross-agencia** — `GetAgencyShare`, `GetStats`, etc. usan `loadDataFromDB()` sin scoping (a diferencia de sus equivalentes POST en `analytics_handler.go`, que sí escopan). Cualquier `REPORTS_VIEW` ve ingresos/volúmenes de TODAS las agencias. **Resuelto 2026-08-26**: `loadDataFromDB()` ahora scopea productos/pasajeros por agencia para todo caller no-admin (ver [[Historial de Bugs Resueltos]]) — arregla los 21 handlers que la llaman de una sola vez, incluido `GetStats` (que no la usaba, scopeado aparte con el mismo criterio).
- [ ] **`GetSystemStatus` filtra PII de holds cross-agencia** (`ContactoNombre`/`ContactoEmail`) a cualquier `LOGS_VIEW` — a diferencia de `GetBlockedReservations`, que sí los limpia para no-dueños.
- [ ] **Backup dump/restore expone credenciales de terceros en texto plano** (`AIProvider.APIKey`, potencialmente SMTP/Atlas) y `RestoreBackupHandler` acepta y persiste JSON arbitrario sin validar esquema, gateado solo por `BACKUP_CREATE` (no admin-only).
- [x] **`/transfers/all` (`ListTransfers`) sin scoping** — cualquier `TRANSFERS_VIEW` ve cesiones de todas las agencias (a diferencia de `GetUserTransfers`, que sí escopa). **Resuelto 2026-08-26**: mismo criterio que `GetUserTransfers` (`source_agency`/`target_agency`), admin sigue viendo todo.
- [x] **Templates de notificación/email editables sin permiso ni ownership** (`UpdateNotificationTemplate`, `UpdateEmailTemplate`) — cualquier usuario autenticado puede reescribir una plantilla GLOBAL (ej. `reservation_confirmed`, enviada a clientes reales) → vector de phishing. **Resuelto 2026-08-26**: `RequirePermission` cableado en ambos entrypoints (`EMAIL_VIEW/UPDATE`, `NOTIFICATION_TEMPLATES_VIEW/UPDATE`, con backfill idempotente para `AGENCY_ADMIN` en bases ya existentes) + ownership real (`callerOwnsTemplateAgency`: no-admin nunca edita una plantilla global ni de otra agencia).
- [ ] **CVEs confirmadas en dependencias actuales** (investigado 2026-08-13 vía web, re-verificar versiones exactas antes de actuar):
  - `golang-jwt/jwt/v5 v5.2.1` — CVE-2025-30204 (DoS), fix en v5.2.2+.
  - `jackc/pgx/v5 v5.6.0` (driver Postgres real de GORM) — CVE-2026-33816 (CVSS 9.8, memory-safety) y CVE-2026-41889 (SQL injection vía confusión de placeholder dollar-quoted), fix en v5.9.2+.
  - `bytedance/sonic v1.15.0` (codec JSON de gin) — corrupción de memoria, fix en v1.15.1+.

### Medio

- [x] Sin rate limiting en ningún lado (`/auth/login`, `/auth/register`, `/ai/chat` sin throttle — brute-force y abuso de costo de LLM sin mitigar). **Resuelto parcialmente 2026-08-26**: `middleware.RateLimit()` (ventana fija en memoria, por IP) aplicado global (300 req/min) y reforzado en `/auth/login` (15 req/5min) en ambos entrypoints — ver [[Historial de Bugs Resueltos]]. `/auth/register` ya no existe (eliminado en la corrida anterior). **`/ai/chat` sigue sin throttle dedicado** (el límite global de 300/min aplica, pero no un límite específico de costo de LLM) — pendiente si el abuso de costo sigue siendo una preocupación real.
- [ ] `AIProvider` (config global de IA, incluye API key) editable por cualquier `agency_admin` — no tiene `AgencyID`, pero `AI_VIEW/UPDATE` se otorgan por default a ese rol.
- [ ] `DeleteWhiteLabelConfig` sin el ownership check que sí tiene `UpdateWhiteLabelConfig` (mismo archivo).
- [ ] Race TOCTOU en `ConvertOpportunityToProduct` (`opportunities_handler.go:375-454`): el chequeo `Estado != "aprobada"` se lee fuera de lock/transacción — dos requests concurrentes sobre la misma oportunidad podrían crear 2 productos. (El guard de estado terminal en sí — Update/Delete/Approve — está bien y no tiene bypass cruzado).
- [ ] CORS hecho a mano tolera downgrade de esquema (compara host sin `http(s)://`, permitiría `http://` junto al `https://` real).
- [ ] JWT sin `jwt.WithValidMethods(...)` explícito (no explotable hoy, defensa en profundidad barata).
- [ ] Secreto de cron aceptado vía `?secret=` en query string (queda en logs) — preferir solo header.
- [ ] `gorm.io/driver/mysql` como dependencia pese a ser un proyecto 100% Postgres — superficie de supply-chain innecesaria, revisar si se puede quitar.

### Bajo

- [ ] `ExportCSV` concatena `entityType` sin sanitizar en `Content-Disposition` (hoy es un stub sin datos reales, pero corregir cuando se implemente).
- [ ] `apiKeysGroup` usa el legacy `AgencyAdminOrAdmin()` en vez de `RequirePermission` (funciona bien pero viola la convención ya documentada en CLAUDE.md).

### Ya verificado como sólido (sin acción)

`product_handler.go` (`GetProducts`/`GetProductByID`), `canReserveProduct`/`CreateHold`/`CreateReservation`, `api_key_handler.go` (hash SHA-256, reveal único), `transfer_handler.go` (`CreateTransfer`/`ReclaimTransfer`), `ai_expert_handler.go` (knowledge base escopada), hashing de contraseñas (bcrypt), SQL estático de migraciones (sin inyección), protección path-traversal en nombres de backup, cron fallando cerrado si `CRON_SECRET` está vacío, diseño general de la capa de tools de IA (re-chequeo server-side por tool, `.Raw()` parametrizado, `sanitizeReservationForUser`).

---

## 2. Seguridad Frontend (React)

### Crítico

- [ ] **`xlsx` (SheetJS) `^0.18.5` — Prototype Pollution + ReDoS sin parchear, paquete npm abandonado.** Usado en `ProductBulkUpload.jsx:51-53` para parsear archivos subidos por el usuario **antes de cualquier validación**. Cualquier usuario con `PRODUCTS_CREATE` que suba un Excel armado dispara la vulnerabilidad en su propia sesión autenticada. **Fix**: migrar al build de SheetJS en su propio CDN (≥0.19.3) o a una librería mantenida (`exceljs`).

### Medio

- [ ] Navegación dirigida por IA sin validar (`AIChatWindow.jsx:69-72`): `navigateAction.payload.path` viene tal cual de la respuesta del asistente y se pasa a `navigate()` sin allowlist — vector de manipulación vía inyección de prompt en contenido que la IA ingiere.
- [ ] `GestionProductos.jsx` no gatea Editar/Eliminar con `can()` (a diferencia de `GestionOportunidades.jsx`, que sí gatea todo individualmente) — el backend sí lo exige, así que hoy no es explotable, pero rompe el contrato "gating de UI ≠ protección real" de forma confusa.
- [ ] `exportService.js` lee el token de `localStorage['token']`, pero nada en el código escribe esa clave (todo usa `'api_token'`) — las exportaciones CSV/Excel/PDF están rotas hoy (401 silencioso).
- [ ] Rutas de auth muertas/inconsistentes: `apiClient.js` lee token de 4 lugares (solo 1 se escribe), backend acepta cookie `token`/`access_token` y `?token=` en query aunque nada los usa — código muerto que se convierte en riesgo real el día que una feature futura los active sin querer.
- [ ] Vite dev server corre con `--host` (expone a toda la LAN) + Vite 7.x tiene CVEs 2025-2026 de lectura arbitraria de archivos (CVE-2025-31125, en catálogo KEV de CISA). Solo afecta dev, no producción (build estático en Vercel) — igual conviene pinnear Vite ≥7.3.2 y no usar `--host` en redes no confiables.

### Bajo / informativo

- `Documentacion.jsx` usa `dangerouslySetInnerHTML` con contenido 100% estático hoy (no explotable), pero es un patrón a evitar — el día que se conecte a una fuente dinámica se vuelve XSS real.
- `jspdf`/`jspdf-autotable`/`pdfkit` en `package.json` sin ningún import real en el código (el PDF de itinerario usa `window.print()`, no estas libs) — peso muerto + superficie de CVE innecesaria (varios CVEs 2026 en jsPDF), seguro de quitar.
- Token JWT en `localStorage` (tradeoff estándar sin cookie httpOnly) — el punto de apalancamiento real para reducir este riesgo es la disciplina anti-XSS de arriba (`xlsx`, `dangerouslySetInnerHTML`).
- `react-router-dom 7.8.2` tiene CVEs 2025 pero todos apuntan a Framework Mode/SSR — esta app es SPA pura con `BrowserRouter`, no aplica. Igual conviene actualizar por higiene.
- Clima de supply-chain 2026 (gusano Shai-Hulud, compromiso de 42 paquetes `@tanstack/*` en mayo 2026, cuenta de mantenedor de Axios comprometida) — la versión pineada de `@tanstack/react-query` en este repo NO está entre las comprometidas, lockfile con hashes de integridad correctos. Buen estado actual, pero exactamente la familia de paquete que fue blanco — vigilar antes de actualizar.
- `ShareProduct`/`UnshareProduct` sin `RequirePermission` en la ruta — no es un hueco, el handler hace su propio chequeo (`canManageSharing`, admin o dueño), de hecho más estricto que un permiso por rol. Anotado para que un futuro reviewer no lo marque como hueco por error.

---

## 3. QA/QC Backend (correctitud, no seguridad)

### Crítico

- [ ] **`CreateReservation` (la reserva NORMAL, no la del asistente IA) nunca lockea la fila del producto antes de leer/decrementar `Disponibilidad` — riesgo real de sobreventa.** `order_handler.go:430` hace `tx.First()` sin `clause.Locking`, luego lee-modifica-escribe (`:485-498`, `:476-483`). Comparar con `CreateHold` (`:142`), `AdjustHold` (`:290`) y el tool de IA `crear_reserva` (`ai_handler.go:1242`), los 3 SÍ usan `clause.Locking{Strength: "UPDATE"}`. `AddPassenger` (`:1542`) y `DuplicatePassenger` (`:1448`) tienen el mismo patrón sin lock. **Escenario**: dos agentes reservan el mismo producto con `Disponibilidad=1` casi simultáneamente → ambas transacciones leen 1 antes de que cualquiera confirme → las dos pasan la validación → doble venta del mismo asiento físico. Este es el hallazgo de mayor impacto de negocio de toda la auditoría (dinero + inventario real). **Fix**: agregar `tx.Clauses(clause.Locking{Strength: "UPDATE"})` en el lookup de producto de `CreateReservation` (línea 430) y en el lookup de hold (línea 404), más los de `AddPassenger`/`DuplicatePassenger`.

### Alto

- [ ] `CreateProduct` ignora el error de `database.DB.Create()` (`product_handler.go:245`) — si falla el insert, igual responde 201 y dispara notificación/email de un producto que no existe en la DB.
- [ ] `ConfirmReservation` ignora los errores de `Save`/`Update` en la transición de estado (`order_handler.go:863-865`) — puede notificar "reserva confirmada" y devolver 200 aunque la escritura real haya fallado.
- [ ] `CreateTransfer` (cesión) tiene la misma race que el hallazgo crítico #1, más un decremento sin piso `GREATEST(0, ...)` (a diferencia de `ReleaseHold`/`ExpireReservations`/`ReclaimTransfer`, que sí lo tienen) — podría dejar `disponibilidad` negativa.

### Medio

- [ ] Los flujos de cancelación/borrado (`DeleteReservation`, `RequestCancellation` directo, `ResolveCancellation`, `DeletePassenger`) son secuencias de escrituras sin transacción y con errores sin chequear — a diferencia de `CreateReservation`/`CreateHold`/`ConvertOpportunityToProduct`, que sí usan `database.DB.Transaction(...)`. Riesgo de estado inconsistente (stock devuelto pero reserva no borrada) ante un fallo a mitad de camino.
- [ ] Dos backfills en `runSQLMigrations()` (`db.go:646-648`, `:669-671`) no son verdaderamente "de una sola vez" — corren en cada boot guardados por `WHERE columna = 0`, así que si un admin deliberadamente vuelve a poner `0` en un campo, el próximo restart lo pisa con el valor legado.

### Verificado limpio (sin acción)

Paridad de rutas `main.go`/`index.go`: **actual mente sincronizadas** (186 handlers, diff completo sin drift). Excepción infante-sin-lugar: aplicada consistentemente en los 8 puntos de decremento/creación relevantes. Pricing por tipo de pasajero (Tarifa/Impuestos/OP): sin lecturas legado stale encontradas. Nil-pointer: todos los puntos de dereferencia de punteros chequeados están guardados. Manejo de fallos de notificación/email: capturado vía `SystemLog`, nunca bloquea la acción principal ni se pierde en silencio.

**Sin ningún test automatizado** (`*_test.go`) en todo `backend-go/` — en un sistema que vende inventario real y dinero real, sin DB de test/staging, esto es la brecha de QA más estructural de las tres auditorías de correctitud.

---

## 4. QA/QC Frontend (correctitud)

### Crítico

- [x] **Violación de reglas de hooks de React (regla 5): `GestionProductos.jsx:92`** — guard `if (!can(...)) return` antes de varios hooks (`useMemo`/mutations). **Resuelto 2026-08-13**: guard movido al final, después de todos los hooks.
- [ ] **Misma violación en `GestionGrupos.jsx:77`** — mismo patrón (`useCreateGroup`/`useUpdateGroup`/`useDeleteGroup`/`useConfirmGroup`/`useSendGroupQuote`/`useResolveGroupCancellation` llamados después del guard). Sigue pendiente.

### Alto

- [ ] `GestionOportunidades.jsx` y `GestionTemporadas.jsx` no destructuran/usan `isError` de su hook de datos — un fetch fallido se ve idéntico a "no hay datos", indistinguible para el usuario.
- [ ] `GestionTemas.jsx` es 100% mock (datos hardcodeados, todos los botones solo tiran un toast "en desarrollo") y **no tiene ningún guard `can()`** — viola la regla de oro de este mismo repo de gatear toda página de gestión. Ruteada en `/temas` detrás solo de `ProtectedRoute` (autenticación, no permiso).
- [ ] Sin validación de rango de fechas (regreso/llegada antes que salida) en `ProductForm.jsx` y `OportunityForm.jsx` — el auto-ajuste solo empuja la fecha hacia adelante cuando cambia la salida, no impide que el usuario ponga manualmente una fecha de regreso anterior.

### Medio

- [ ] `neto_1`/`neto_2` en `OportunityForm.jsx` sin `min="0"` (a diferencia de los campos equivalentes en `ProductForm.jsx`) — se puede cargar un neto negativo.
- [ ] Nueva inconsistencia de accesibilidad: los 3 `<select>` de filtro en `GestionOportunidades.jsx` (Estado/Temporada/Destino) no tienen `<label>`/`aria-label`, a diferencia de los filtros equivalentes en `GestionProductos.jsx`/`GestionNominas.jsx`/`Confirmations.jsx`.
- [ ] Sin code-splitting en ningún lado (`vite.config.js` sin `manualChunks`, `App.jsx` importa las ~30 páginas de forma estática) — causa raíz directa del warning de bundle de 2.8MB. Fix de mayor apalancamiento: `React.lazy()` + `Suspense` por ruta en `App.jsx`.
- [ ] `ProductForm.jsx` acepta un prop `isLoading` para deshabilitar el submit durante la mutación, pero **ningún caller lo pasa** (`GestionProductos.jsx`, `GestionOportunidades.jsx` en el nuevo flujo de conversión) — riesgo de doble submit con clic rápido/red lenta.
- [ ] Sin `max` en el date-picker de fecha de nacimiento del pasajero (`Availability.jsx:1063`) — se puede cargar una fecha de nacimiento futura, rompiendo silenciosamente `calcTipoPasajero`.

### Bajo

- Dos librerías de gráficos cargadas (`chart.js`+`react-chartjs-2` para Reportes, `recharts` para Dashboard) — no se pisan hoy, pero vale consolidar a futuro.
- `jspdf`/`jspdf-autotable`/`pdfkit` sin ningún import real (mismo hallazgo que en seguridad frontend) — `frontend/README.md` todavía los documenta como mecanismo de export, desactualizado.
- Ruta `/test-public` (`App.jsx:362-370`) sin `ProtectedRoute`, con comentario "Ruta para pruebas sin protección" — parece scaffolding olvidado.

### Verificado limpio (sin acción)

Sin `<img>` sin `alt`. Sin `console.log`/`debugger` sobrantes. Sin clases `dark:` (la remoción de dark mode se mantuvo). Sin `<div onClick>` reemplazando botones reales. Overflow horizontal de tablas manejado por el `Table.jsx` compartido en todas las páginas. Barrido independiente de archivos huérfanos (más allá de los 35 ya eliminados esta sesión) sin encontrar ninguno nuevo.

---

## 5. UX/UI vs. tendencias actuales (revisión liviana, sin cambios aplicados)

**El sistema de diseño actual ya está alineado con las convenciones B2B/admin de 2025-2026** — paleta consistente, componentes compartidos (`Table`/`Button`/`Card`/`Badge`/`Modal`) usados igual en todas las páginas muestreadas, sidebar con patrón correcto (filtrado por permiso, colapsable, drawer mobile), CRUD modal razonable para este tipo de app (no es un gap, es una elección válida), skeleton loaders y `EmptyState` real (no solo texto plano). Sin remanentes de dark mode.

Mejoras reales encontradas (ninguna urgente):

1. ~~**Tablas anchas sin gestión de columnas** (`GestionProductos.jsx`, 30 columnas)~~ — **Implementado 2026-08-13**: toggle de mostrar/ocultar columnas (persistido en localStorage) + columna Acciones y header sticky (`Table.jsx` ganó un prop `containerClassName` reutilizable para esto).
2. Sin header de tabla `sticky` — se pierde el encabezado al hacer scroll vertical en tablas largas. Esfuerzo: bajo.
3. Doble sistema de feedback (toast propio + `Swal.fire` para confirmaciones) — no roto, pero el modal bloqueante de SweetAlert2 para confirmar un borrado simple se siente un poco anticuado frente a patrones de confirmación inline/popover. Esfuerzo: bajo, no prioritario.

---

## Prácticas nuevas adoptadas (ver también [[Gotchas y Reglas de Oro]] reglas 14+ y `CLAUDE.md`)

Extraídas de las 5 auditorías, consolidadas para no duplicar — el detalle completo de cada práctica vive en [[Gotchas y Reglas de Oro]].

1. Todo handler con `:id`/parámetro de recurso verifica ownership (agencia/creador), no solo el permiso de rol.
2. Nunca bindear campos de privilegio/tenant (`role`, `admin`, `agencia`, `agency_id`) directo del body de un request público.
3. Endpoints de asignación de rol/permiso nunca permiten que el caller otorgue un privilegio que él mismo no tiene.
4. Sin secretos de fallback hardcodeados — fallar cerrado si falta una env var de secreto.
5. Todo campo-modelo de secreto (API key, password SMTP/Atlas) lleva `json:"-"` a nivel de modelo, no a discreción de cada handler.
6. Nunca un endpoint de CRUD genérico/dinámico (tabla+columna arbitraria) en una app multi-tenant.
7. Rate limiting básico en login/registro/IA como mínimo.
8. Cualquier handler que lea-y-luego-escriba `Product.Disponibilidad` DEBE lockear la fila primero (`clause.Locking{Strength: "UPDATE"}`) — patrón a extraer a un helper común.
9. Nunca descartar el error de una escritura a DB en un handler que dispara notificaciones/emails o responde éxito al cliente.
10. Toda secuencia que toque stock de `Product` + `Reservation`/`Passenger` va envuelta en transacción.
11. Todo guard `can()` de página va después de TODOS los hooks, sin excepción — ya era regla, se violó 2 veces igual, agregar chequeo rápido tipo grep antes de cerrar cualquier página nueva.
12. Todo hook de listado debe manejar `isError` explícitamente, no solo `isLoading`.
13. Formularios con 2 fechas relacionadas (salida/regreso) validan `regreso >= salida` al submit, no solo auto-ajustan una al cambiar la otra.
14. Todo prop tipo `isLoading`/disabled-durante-mutación debe ser efectivamente pasado por CADA caller del componente.
15. Páginas nuevas se registran con `React.lazy()` + `Suspense` en `App.jsx`, no `import` estático.
16. Librerías de parseo de archivos subidos por el usuario (Excel, CSV, PDF) son una clase de dependencia de escrutinio alto — chequear mantenimiento activo, no solo rango de semver.
17. Todo token de auth se lee/escribe únicamente vía `ApiClient.getToken()`/`setToken()` — ningún service llama `localStorage` directo para esto.
18. Código muerto de fallback de auth (cookies/query params no usados) se borra al verlo, no se deja "por si acaso".
19. Dependencias no importadas en ningún lado se eliminan del `package.json` al notarlas, no solo en refactors grandes.

---

## Próximo paso sugerido

Julian: te recomiendo arrancar por **Seguridad Backend — Crítico** (los primeros 5 ítems) ya mismo — son cambios acotados (agregar permisos/ownership, borrar un endpoint, sacar un fallback) con impacto de seguridad enorme y riesgo de romper algo bajo. El resto puede priorizarse después con más calma.
