Punto de entrada del apartado de seguridad/QA/QC del proyecto — pedido por Julian el 2026-08-13 ("quiero que sea una plataforma mega segura") tras la primera auditoría integral. Antes de esta carpeta, los hallazgos de seguridad vivían mezclados con bugs cerrados (006) o backlog general (008); ahora tienen su propio espacio.

**Decisión explícita de Julian (2026-08-13)**: nada de esto corre automatizado (ni cron en el backend, ni una rutina programada de Claude Code en la nube) — la auditoría se corre **a demanda**, cuando Julian lo pide, con Claude Code (o cualquier otro asistente de IA con acceso a herramientas de código: leer archivos, grep, terminal, búsqueda web). Se evaluó un módulo automatizado dentro de "Estado del Sistema" usando la API key de IA ya configurada en la app, pero se descartó: una llamada de API sin acceso a herramientas no puede recorrer el repo ni buscar CVEs actuales, así que sería una versión muy diluida de lo que sigue. Esta nota es el playbook para que CUALQUIER sesión de IA (esta u otra, sin memoria de esta conversación) pueda reproducir la misma auditoría con el mismo rigor.

## Qué vive acá

- **Cómo correr esta auditoría**: el playbook completo (abajo) — un prompt copiable + el detalle de los 5 tracks, para que cualquier IA sin memoria de esta conversación pueda reproducirla.
- **Índice de corridas**: una entrada por cada vez que se ejecutó la auditoría completa (o una parcial), con fecha, qué se encontró y link al reporte completo.
- Los **hallazgos sin resolver** de cada corrida quedan en su propio archivo (`Auditoría de Seguridad y QA - YYYY-MM-DD.md`) con checkboxes `[ ]`/`[x]` — a medida que se cierran, tachar/mover el detalle a [[Historial de Bugs Resueltos]] (006) si es un bug puntual ya corregido.
- Las **prácticas nuevas** que salen de cada auditoría (no bugs puntuales, sino reglas a seguir en código futuro) se consolidan en [[Gotchas y Reglas de Oro]] (006, reglas numeradas) y en `CLAUDE.md` (las más críticas/evergreen) — no se duplican acá.

## Índice de corridas

| Fecha | Alcance | Críticos encontrados | Reporte |
|---|---|---|---|
| 2026-08-13 | Seguridad backend + frontend, QA/QC backend + frontend, UX/UI (primera corrida completa) | 5 en seguridad backend (incl. endpoint CRUD genérico sin permisos con auto-elevación a admin), 1 en seguridad frontend (`xlsx` sin parchear), 1 en QA backend (race condition de sobreventa en `CreateReservation`), 2 en QA frontend (violación de reglas de hooks — 1 de 2 ya resuelta) | [[Auditoría de Seguridad y QA - 2026-08-13]] |

**Resuelto desde esta corrida (2026-08-13)**: violación de reglas de hooks en `GestionProductos.jsx` (queda pendiente la misma en `GestionGrupos.jsx`), y la mejora de UX/UI de gestión de columnas en tablas anchas. El resto de los hallazgos (críticos de seguridad backend/frontend, race condition de QA backend) sigue sin resolver — ver el detalle en el reporte.

## Cómo correr esta auditoría (a demanda)

Julian corre esto cuando quiere, pegándole a Claude Code (o a otra IA con acceso a herramientas de código) algo como:

> Corré la auditoría de seguridad/QA/QC/UX del proyecto siguiendo el playbook en `app-cupos/009 - Seguridad y Calidad/Programa de Seguridad y QA.md`: 5 agentes en paralelo (seguridad backend, seguridad frontend, QA/QC backend, QA/QC frontend, UX/UI). Documentá los hallazgos como una nota nueva `Auditoría de Seguridad y QA - <fecha de hoy>.md` en esa misma carpeta, agregá una fila al "Índice de corridas" de `Programa de Seguridad y QA.md`, y si aparecen prácticas nuevas (no bugs puntuales) sumalas a `Gotchas y Reglas de Oro.md` (006) y a `CLAUDE.md`.

Con eso alcanza — el resto de esta nota es el detalle que necesita la IA que lo ejecute (por si la sesión no tiene memoria de la corrida anterior).

### Los 5 tracks, en detalle

Cada uno corre como un agente de solo lectura e independiente (no modifica código, no aplica fixes — solo reporta), en paralelo (patrón `superpowers:dispatching-parallel-agents` si está disponible; si no, en serie está bien, solo tarda más). Cada agente debe citar **archivo:línea + escenario concreto de explotación/fallo + fix recomendado** — nunca un hallazgo genérico sin verificar contra el código real.

1. **Seguridad backend** (`backend-go/`): AuthN/AuthZ en TODOS los handlers (no solo los nuevos desde la última corrida), IDOR (¿todo handler con `:id` compara `Agencia`/`created_by` contra el caller, no solo el permiso de rol?), inyección SQL, la superficie de tools de IA (`ai_handler.go` — ¿algún tool nuevo bypasea un chequeo que sí tiene su equivalente REST?), manejo de secretos (grep de hardcodeos, `json:"-"` en campos sensibles de `models.go`), rate limiting, y **CVEs actuales vía WebSearch** de las versiones exactas en `go.mod` (esto es lo que hace que la auditoría no se quede desactualizada con el conocimiento de entrenamiento del modelo — sin esto, se pierden CVEs publicadas después del corte de entrenamiento).
2. **Seguridad frontend** (`frontend/`): XSS (`dangerouslySetInnerHTML`/`innerHTML`), almacenamiento de tokens (¿todo pasa por `ApiClient.getToken()`/`setToken()`, o hay algún service leyendo `localStorage` directo?), secretos hardcodeados, gating client-side (`can()`) vs. lo que realmente enforce el backend, y **CVEs actuales vía WebSearch** de las versiones exactas en `package.json` — atención especial a librerías que parsean archivos subidos por el usuario (Excel/CSV/PDF, ver regla 24 de Gotchas) y a la familia de paquetes que haya sido blanco de ataques de supply-chain recientes.
3. **QA/QC backend** (correctitud, no seguridad): race conditions en `Product.Disponibilidad` (¿todo lookup-y-escritura lockea la fila? — ver regla 20 de Gotchas), transacciones en secuencias que tocan stock + Reserva/Pasajero (regla 22), paridad de rutas `main.go` vs. `api/index.go` (regla 1 del repo — comparar los dos listados), idempotencia de migraciones nuevas en `runSQLMigrations()`, errores de escritura a DB descartados antes de notificar/responder éxito (regla 21), cobertura de tests (sigue en cero a la fecha de esta nota — confirmar si cambió).
4. **QA/QC frontend** (correctitud): reglas de hooks de React (guard `can()` después de TODOS los hooks — regla 5 del repo, ya se violó 2 veces pese a estar documentada, re-chequear en cada página tocada desde la última corrida), `isError` manejado en cada hook de listado (regla 23), código muerto/imports sin usar (re-verificar con Grep real, no con matching de nombre de archivo — ver la auditoría del 2026-08-13 sobre falsos positivos), warnings de build, accesibilidad básica (alt text, labels, foco visible).
5. **UX/UI vs. tendencias actuales**: deliberadamente liviano — el objetivo es NO gastar tokens de más. Si el diseño actual ya sigue las convenciones vigentes para un panel B2B/admin, decirlo en 2-3 líneas y parar; solo elaborar sobre gaps genuinos, sin fabricar hallazgos para parecer exhaustivo.

### Qué hacer con lo que encuentre

- Hallazgos de seguridad/QA sin resolver → nota nueva en esta carpeta, formato `Auditoría de Seguridad y QA - YYYY-MM-DD.md` (no pisar la anterior — permite comparar si un hallazgo viejo se resolvió o sigue latente entre corridas).
- Prácticas nuevas (reglas repo-wide, no bugs puntuales) → `Gotchas y Reglas de Oro.md` (006, reglas numeradas, seguir la numeración existente) + las más críticas/evergreen también a `CLAUDE.md`.
- Un bug puntual ya corregido en esta misma sesión → mover el detalle a [[Historial de Bugs Resueltos]] (006), no dejarlo colgado acá como "pendiente".
- **Nadie aplica fixes automáticamente** — la auditoría audita y documenta; decidir qué arreglar y cuándo sigue siendo una decisión de Julian, sobre todo en un sistema sin DB de test/staging donde un fix mal aplicado tiene el mismo radio de impacto que el bug original.
