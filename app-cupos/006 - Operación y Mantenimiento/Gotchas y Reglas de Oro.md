Reglas operativas e invariantes que **no** son obvias leyendo un único archivo — se descubrieron a fuerza de incidentes repetidos en este repo. Léelo antes de tocar rutas, migraciones, RBAC o el entorno local. Complementa [[Historial de Bugs Resueltos]] (postmortems puntuales ya cerrados) y [Modelo de Datos](../005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md) (detalle de esquema).

> Última verificación de las reglas 1-11 contra código: 2026-08-10.

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

`Neto1` (singular) **no** se individualizó en esta pasada — sigue siendo un valor manual único, usado solo para "Riesgo" en reportes. Si alguna vez se pide individualizarlo también, no hace falta agregar columnas nuevas: ya es derivable como `TarifaX + ImpuestosX` (`Product.NetoForTipo()`).

---

## Antes de escribir código nuevo, checklist rápido

- ¿Agregué la ruta en **ambos** `main.go` e `index.go`? (regla 1)
- ¿La columna/tabla nueva tiene migración SQL idempotente además de `AutoMigrate`? (regla 2)
- ¿El endpoint/página nueva usa `RequirePermission`/`can()` y no `AdminOnly()`/`user.role`? (reglas 5 y 6)
- ¿El guard de página está después de todos los hooks? (regla 5)
- ¿Una tool de IA nueva con datos sensibles replica el patrón de 3 niveles? (regla 8)
- ¿Una feature "quién más ve esto" está scopeada por agencia y no por creador, salvo que el dato sea genuinamente privado? (regla 7)

---

## Protocolo de actualización del vault (para que siga siendo veraz)

Este vault es la fuente de verdad del proyecto — pero una fuente de verdad que no se actualiza se vuelve una fuente de mentiras con buena presentación. Reglas:

1. **Sello de frescura**: toda nota sustancial (001, 003, 005, 006) lleva cerca del título una línea `> Última verificación ... : YYYY-MM-DD` con la fecha de la última vez que se leyó el código real y se confirmó que la nota sigue diciendo la verdad — no simplemente la fecha en que se editó el texto.
2. **Terminar una tarea incluye actualizar el vault**, igual que correr el build o el linter. Si el cambio:
   - agrega/modifica un endpoint → actualizar `001 - API` (y `003` si cambia un flujo de negocio).
   - agrega/modifica una tabla o columna → actualizar `005 - Modelo de Datos`.
   - corrige un bug no trivial → agregar entrada a `Historial de Bugs Resueltos`.
   - revela una regla operativa nueva (algo que rompió por una razón no obvia) → agregar una regla numerada nueva a esta nota.
   - queda genuinamente pendiente (no se implementó, se difirió) → anotarlo en el backlog (`Feedback UTG` u otra carpeta de planes), no acá.
3. **Nunca confiar en una nota vieja para una acción consecuente sin re-verificar contra el código.** Una nota con sello de frescura viejo (o sin sello) es una hipótesis a confirmar con `grep`/lectura de código antes de editar algo en base a ella — no un hecho consumado. Para responder una pregunta exploratoria sin tocar código, sí alcanza con citarla tal cual.
4. **Una sola fuente de verdad por hecho.** Si algo ya está documentado acá, no se duplica en la memoria privada de Claude Code (`~/.claude/projects/.../memory/`) — esa memoria queda para preferencias de colaboración y feedback puntual sobre cómo trabajar, con un puntero a la nota del vault correspondiente en vez de repetir el contenido. Evita que las dos copias diverjan silenciosamente.
