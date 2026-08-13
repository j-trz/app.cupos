# form-cupos

> `AGENTS.md` (ChatGPT/Codex) y `GEMINI.md` (Gemini) son punteros de una línea a este archivo — no duplicar contenido ahí, editar siempre acá.

Sistema de Gestión de Cupos: plataforma B2B de asignación de cupos aéreos/paquetes para agencias. Backend Go (Gin + GORM + Postgres/Neon) en `backend-go/`, frontend React (Vite + Tailwind v4 + React Router 7) en `frontend/`, deploy en Vercel.

## Correr en local

```bash
cd backend-go && go run cmd/api/main.go   # puerto 5002
cd frontend && npm run dev                 # puerto 5173, VITE_API_URL apunta a :5002/api
```

Build/verificación rápida: `go build ./...` (backend), `npm run build` / `npm run lint` (frontend).

## Reglas de oro (no negociables en este repo)

- **Dos entrypoints de backend duplican TODA la tabla de rutas**: `backend-go/cmd/api/main.go` (local) y `backend-go/api/index.go` (Vercel serverless). Toda ruta nueva va en **ambos** o queda 404 en uno de los dos entornos.
- **No hay DB de test/staging**: local y producción apuntan a la misma Neon. No cargar datos de prueba a la ligera; para verificación visual de login, preguntar antes de usar credenciales reales o crear una cuenta.
- **GORM AutoMigrate no alcanza solo**: toda columna/tabla nueva necesita también un `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` idempotente en `runSQLMigrations()` (`db.go`).
- **Gating por rol/permiso**: usar siempre `middleware.RequirePermission("MODULE_ACTION")` (ambos entrypoints) — nunca `AdminOnly()`/`AgencyAdminOrAdmin()` (legacy). Nuevo módulo/permiso también va en `seedRBAC()` (`db.go`) y `frontend/src/lib/permissionModules.js`.
- **Guards de página con `can(...)` van SIEMPRE después de todos los hooks** (justo antes del `return` final) — `can()` es async y un guard temprano rompe las reglas de hooks de React y crashea la página.
- **Scoping de agencia**: features "quién más ve esto" van por `agencia`, no por `created_by`, salvo que el dato sea genuinamente privado del creador. Tools de IA con datos financieros/cross-agencia siguen el patrón de 3 niveles (user propio / agency_admin scopeado a su agencia / admin sin restricción).
- **Ownership, no solo permiso**: todo handler con `:id` de un recurso con dueño (`Agencia`/`AgencyID`/`created_by`) compara ese dueño contra el caller — `RequirePermission` solo valida "puede hacer X en general", no "puede hacer X en ESTE registro". Nunca bindear `role`/`admin`/`agencia`/`agency_id` directo de un body público; se resuelven server-side. Ningún endpoint de asignación de rol/permiso puede otorgar más privilegio del que el propio caller tiene. Nunca un CRUD genérico (tabla/columna arbitraria) en este repo.
- **Stock de `Product.Disponibilidad`**: toda lectura-y-escritura lockea la fila primero (`tx.Clauses(clause.Locking{Strength: "UPDATE"})`) y, si en el mismo flujo también toca `Reservation`/`Passenger`, va envuelto en `database.DB.Transaction(...)`. Nunca descartar el error de una escritura que dispara una notificación/email o precede a un `200`/`201` de éxito.
- Detalle completo + hallazgos aún pendientes de una auditoría de seguridad/QA/UX integral (2026-08-13): `app-cupos/008 - Backlog y Feedback/Auditoría de Seguridad y QA - 2026-08-13.md`; prácticas consolidadas como reglas 14-24 en `Gotchas y Reglas de Oro.md`.

## Más contexto

Hay una base de conocimiento persistente del proyecto en el vault de Obsidian **`app-cupos`**, dentro de este mismo repo (`form-cupos/app-cupos/`, versionado en git; se interactúa vía el CLI `obsidian`): arquitectura, catálogo de API, modelo de datos, flujos de negocio con diagramas, historial de bugs resueltos, la integración con Netviax Atlas (carpeta separada, desarrollo activo) y el backlog de feedback de testing. Empezar por `app-cupos/index.md` (catálogo de todas las notas por carpeta) y `app-cupos/log.md` (historial cronológico de altas/consultas/lints) antes de explorar carpeta por carpeta. Consultarlo antes de re-derivar algo de cero — especialmente `006 - Operación y Mantenimiento` (gotchas + bugs ya cerrados), `005 - Arquitectura y Datos` (modelo de datos) y `007 - Integración Netviax Atlas` si el trabajo toca esa integración.

## Antes de actuar / al terminar

1. **Antes** de tocar un área que el vault documenta, leer la nota correspondiente primero (evita re-explorar desde cero) — pero para cualquier acción consecuente (no solo explicar), **re-verificar contra el código real** antes de confiar en ella: son snapshots con fecha, no estado en vivo.
2. **Al terminar** un cambio que afecte algo documentado (endpoint nuevo, tabla/columna nueva, bug corregido, regla operativa descubierta), actualizar la nota del vault correspondiente como parte de "terminado" — no un paso opcional posterior. Protocolo completo y sellos de frescura: `006 - Operación y Mantenimiento/Gotchas y Reglas de Oro.md` (sección final).
3. La memoria privada de Claude Code (`~/.claude/projects/.../memory/`) no debe duplicar lo que ya vive en el vault — ahí van preferencias de colaboración y feedback puntual, con puntero a la nota del vault en vez de repetir contenido.
