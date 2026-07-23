---
title: Referencia de API
nav_order: 2
nav_group: Referencia
---

# Referencia de API

Catálogo de endpoints REST del Sistema de Gestión de Cupos, agrupados por recurso. Si es tu primera vez acá, arrancá por el [Quickstart](QUICKSTART.html) para el flujo de autenticación paso a paso.

> Esta referencia documenta el comportamiento del entorno de producción. Si corrés el backend en local, algún endpoint puntual puede no estar disponible todavía — ante la duda, la fuente de verdad es el propio código (`backend-go/`).

## Convenciones

### Base URL y prefijo

Todas las rutas cuelgan de `/api` (ej. `https://<tu-dominio>/api/products`). No hay versionado en la URL.

### Autenticación

Salvo `POST /api/auth/login` y `POST /api/auth/register`, todo endpoint requiere el header:

```
Authorization: Bearer <token>
```

El token es un JWT firmado (HS256) que se consigue con `POST /api/auth/login` y **expira a las 24 horas**. No hay refresh token — volvé a loguear cuando venza. Ver el [Quickstart](QUICKSTART.html) para el flujo completo.

### Content-Type

Los bodies de `POST`/`PUT` son JSON plano, sin envoltorio (`{"campo": "valor"}`, nunca `{"data": {"campo": "valor"}}`). Mandá siempre `Content-Type: application/json`.

### Formato de errores

Toda respuesta de error tiene la misma forma:

```json
{ "error": "Descripción legible del problema" }
```

Los errores de permisos insuficientes agregan además un campo `message` con el código de permiso puntual que faltaba:

```json
{ "error": "Acceso prohibido. Permisos insuficientes.", "message": "Se requiere el permiso: PRODUCTS_CREATE" }
```

| Código | Cuándo aparece |
|---|---|
| `400` | Body inválido, campos requeridos faltantes, validación de negocio (ej. sin stock suficiente) |
| `401` | Falta el header `Authorization`, token inválido/vencido, credenciales incorrectas, cuenta inactiva |
| `403` | Token válido pero sin el permiso o rol necesario para esa acción, o sin acceso al recurso puntual (ej. un cupo de otra agencia) |
| `404` | El recurso solicitado no existe |
| `500` | Error interno (DB, etc.) |

Las respuestas exitosas **no** siguen un único sobre estándar — cada endpoint devuelve la forma que tiene sentido para ese recurso (a veces `{"success": true, "data": [...]}`, a veces el objeto directo, a veces con claves específicas como `token`/`user`). Se indica la forma relevante en los endpoints donde no es obvia.

### Permisos (RBAC)

Además de "requiere sesión", muchos endpoints exigen un permiso puntual con formato `MODULO_ACCION` (ej. `PRODUCTS_CREATE`, `RESERVATIONS_DELETE`). Los permisos se asignan por rol, y un rol se asigna por usuario dentro de su agencia — el rol `admin` **siempre pasa cualquier chequeo de permiso**, sin importar qué tenga asignado. En las tablas de abajo, la columna **Acceso** indica:

- **Sesión** — cualquier usuario logueado
- **Permiso: `CODIGO`** — sesión + ese permiso puntual (el `admin` siempre lo tiene)
- **Admin / agency_admin** — el rol debe ser exactamente uno de esos dos, no alcanza con un permiso
- **Pública** — no requiere token

### Paginación

**No hay una convención global de paginación** — la gran mayoría de los endpoints de listado devuelven el resultado completo. Las únicas excepciones son:

- `GET /api/logs` — acepta `?page=`, `?limit=`, más filtros `?level=`, `?source=`, `?startDate=`, `?endDate=`, `?q=`.
- `GET /api/ai/logs` — acepta `?days=` y `?limit=`.

Fuera de esos dos casos, si necesitás filtrar un listado grande revisá si ese endpoint puntual acepta query params de filtro (varios de Reportes aceptan `?destino=`, `?temporada=`, etc.) antes de asumir que existe paginación.

---

## Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Pública | Login con `{email, password}` → `{success, token, user}` |
| `POST` | `/api/auth/register` | Pública | Alta de una nueva cuenta |
| `GET` | `/api/auth/profile` | Sesión | Perfil del usuario autenticado |
| `PUT` | `/api/auth/profile` | Sesión | Actualiza nombre/apellido/teléfono del propio usuario |
| `GET` | `/api/users/me/permissions` | Sesión | Códigos de permiso resueltos para el usuario actual (la fuente de verdad para saber qué puede hacer) |

## Disponibilidad y Productos

Los "cupos" (bloqueos aéreos, paquetes, servicios) que una agencia puede reservar.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/products` | Sesión | Lista productos visibles para tu agencia (propios, cedidos o compartidos) |
| `GET` | `/api/products/:id` | Sesión | Detalle de un producto |
| `POST` | `/api/products` | Permiso: `PRODUCTS_CREATE` | Crea un producto |
| `PUT` | `/api/products/:id` | Permiso: `PRODUCTS_UPDATE` | Edita un producto |
| `DELETE` | `/api/products/:id` | Permiso: `PRODUCTS_DELETE` | Elimina un producto (falla si tiene reservas o cesiones asociadas) |
| `POST` | `/api/products/bulk` | Permiso: `PRODUCTS_CREATE` | Alta masiva desde una lista de productos |
| `GET` | `/api/products/:id/shared-agencies` | Sesión | Agencias con las que se comparte este producto |
| `POST` | `/api/products/:id/shared-agencies` | Sesión | Comparte el producto con otra agencia |
| `DELETE` | `/api/products/:id/shared-agencies/:agencia` | Sesión | Deja de compartirlo con esa agencia |

## Reservas

El ciclo de vida completo de una reserva — ver [Ciclo de Vida de la Reserva](FLUJOS_FUNCIONALIDADES.html#3-ciclo-de-vida-de-la-reserva) para el detalle de estados.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/orders` | Sesión | Lista reservas (filtradas por rol/agencia del caller) |
| `GET` | `/api/orders/blocked` | Sesión | Reservas en `bloqueo_temporal` de tu agencia, sin datos de pasajero |
| `POST` | `/api/orders` | Sesión | Crea una reserva (con o sin `hold_id`, ver [Quickstart](QUICKSTART.html)) |
| `POST` | `/api/orders/hold` | Sesión | Aparta stock temporalmente antes de cargar los pasajeros |
| `DELETE` | `/api/orders/hold/:id` | Sesión | Cancela un hold y libera el stock al instante |
| `GET` | `/api/orders/:id` | Sesión | Detalle de una reserva, con sus pasajeros |
| `PUT` | `/api/orders/:id` | Sesión | Actualiza campos generales del pedido |
| `PUT` | `/api/orders/:id/doc-contable` | Sesión | Carga el documento contable — confirma la reserva |
| `POST` | `/api/orders/:id/confirm` | Sesión | Confirma la reserva manualmente |
| `PUT` | `/api/orders/:id/cancel-request` | Sesión | Solicita la cancelación |
| `PUT` | `/api/orders/:id/cancel-request/resolve` | Permiso: `RESERVATIONS_DELETE` | Aprueba o rechaza una solicitud de cancelación |
| `DELETE` | `/api/orders/:id` | Permiso: `RESERVATIONS_DELETE` | Elimina el pedido completo y libera el stock |
| `POST` | `/api/orders/:id/passengers` | Sesión | Agrega un pasajero al pedido |
| `PUT` | `/api/orders/:id/passengers/:passengerId` | Sesión | Asigna número de ticket / estado a un pasajero |
| `PUT` | `/api/orders/:id/passengers/:passengerId/full` | Sesión | Edita todos los datos de un pasajero |
| `POST` | `/api/orders/:id/passengers/:passengerId/duplicate` | Sesión | Duplica un pasajero dentro del mismo pedido |
| `DELETE` | `/api/orders/:id/passengers/:passengerId` | Sesión | Elimina un pasajero puntual y libera su lugar |

## Grupos (vuelos a medida)

Cotizaciones a medida que no son un cupo ya publicado — ver [Grupos y Vuelos a Medida](FLUJOS_FUNCIONALIDADES.html#6-grupos-y-vuelos-a-medida).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/groups` | Sesión | Lista grupos (admin/agency_admin con permiso ven todos; el resto solo los propios) |
| `GET` | `/api/groups/:id` | Sesión | Detalle de un grupo |
| `POST` | `/api/groups` | Permiso: `GROUPS_CREATE` | Crea un grupo directamente (uso administrativo) |
| `PUT` | `/api/groups/:id` | Permiso: `GROUPS_UPDATE` | Edita un grupo |
| `DELETE` | `/api/groups/:id` | Permiso: `GROUPS_DELETE` | Elimina un grupo |
| `POST` | `/api/groups/request` | Sesión | Solicita un vuelo a medida con una o más opciones de itinerario |
| `POST` | `/api/groups/:id/send-quote` | Permiso: `GROUPS_UPDATE` | Envía la cotización cargada al solicitante |
| `POST` | `/api/groups/:id/accept` | Sesión | Acepta una opción cotizada |
| `POST` | `/api/groups/:id/confirm` | Permiso: `GROUPS_UPDATE` | Confirma el grupo aceptado |
| `POST` | `/api/groups/:id/request-cancellation` | Sesión | Solicita cancelar un grupo confirmado |
| `POST` | `/api/groups/:id/resolve-cancellation` | Permiso: `GROUPS_UPDATE` | Aprueba o rechaza la cancelación |

## Cesión de cupos

Prestar disponibilidad de un producto a otra agencia — ver [Cesión de Cupos entre Agencias](FLUJOS_FUNCIONALIDADES.html#5-cesión-de-cupos-entre-agencias).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/transfers` | Sesión | Cesiones relacionadas con tu agencia |
| `GET` | `/api/transfers/all` | Permiso: `TRANSFERS_VIEW` | Todas las cesiones del sistema |
| `POST` | `/api/transfers` | Permiso: `TRANSFERS_CREATE` | Cede disponibilidad de un producto a otra agencia |
| `POST` | `/api/transfers/:id/reclaim` | Permiso: `TRANSFERS_CREATE` | Recupera stock no reservado de una cesión |

## Agencias

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/agencies` | Sesión | Lista de agencias |
| `POST` | `/api/agencies` | Permiso: `AGENCIES_CREATE` | Alta de agencia |
| `PUT` | `/api/agencies/:id` | Permiso: `AGENCIES_UPDATE` | Edita una agencia (incluye `ai_habilitado`) |
| `DELETE` | `/api/agencies/:id` | Permiso: `AGENCIES_DELETE` | Elimina una agencia |

## Usuarios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/users` | Permiso: `USERS_VIEW` | Lista usuarios |
| `GET` | `/api/users/:id` | Permiso: `USERS_VIEW` | Detalle de un usuario |
| `POST` | `/api/users` | Permiso: `USERS_CREATE` | Alta de usuario |
| `PUT` | `/api/users/:id` | Permiso: `USERS_UPDATE` | Edita un usuario |
| `PUT` | `/api/users/:id/status` | Permiso: `USERS_UNLOCK` | Activa/desactiva una cuenta |
| `DELETE` | `/api/users/:id` | Permiso: `USERS_DELETE` | Elimina un usuario |

## Roles y Permisos

Sistema RBAC granular — ver [RBAC Usuarios Roles y Permisos](FLUJOS_FUNCIONALIDADES.html#9-rbac-usuarios-roles-y-permisos).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/roles` | Permiso: `ROLES_VIEW` | Lista roles |
| `GET` | `/api/roles/:id` | Permiso: `ROLES_VIEW` | Detalle de un rol |
| `GET` | `/api/roles/:id/users` | Permiso: `ROLES_VIEW` | Usuarios con ese rol |
| `GET` | `/api/roles/:id/permissions` | Permiso: `ROLES_VIEW` | Permisos asignados a ese rol |
| `POST` | `/api/roles` | Permiso: `ROLES_CREATE` | Crea un rol |
| `PUT` | `/api/roles/:id` | Permiso: `ROLES_UPDATE` | Edita un rol |
| `DELETE` | `/api/roles/:id` | Permiso: `ROLES_DELETE` | Elimina un rol |
| `POST` | `/api/roles/:id/permissions` | Permiso: `ROLES_ASSIGN_PERMISSIONS` | Asigna permisos a un rol |
| `POST` | `/api/user-roles` | Permiso: `ROLES_ASSIGN_PERMISSIONS` | Asigna un rol a un usuario |
| `GET` | `/api/permissions` | Permiso: `PERMISSIONS_VIEW` | Catálogo de códigos de permiso |
| `GET` | `/api/permissions/:id` | Permiso: `PERMISSIONS_VIEW` | Detalle de un permiso |
| `POST` | `/api/permissions` | Permiso: `PERMISSIONS_CREATE` | Crea un permiso |
| `PUT` | `/api/permissions/:id` | Permiso: `PERMISSIONS_UPDATE` | Edita un permiso |
| `DELETE` | `/api/permissions/:id` | Permiso: `PERMISSIONS_DELETE` | Elimina un permiso |

## Reportes y analítica

Todo bajo `/api/reports` requiere permiso `REPORTS_VIEW`, salvo `user-metrics` (solo sesión — es la vista personal de métricas propias, no el dashboard administrativo).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/reports/stats` | Totales generales del sistema |
| `GET` | `/api/reports/user-metrics` | Métricas personales del usuario actual (**solo sesión**, sin `REPORTS_VIEW`) |
| `GET` | `/api/reports/occupancy` | Ocupación de cupos |
| `GET` | `/api/reports/top-products` | Productos más vendidos |
| `GET` | `/api/reports/risk-alerts` | Alertas de riesgo (disponibles × neto) |
| `GET` | `/api/reports/cancellations` | Reporte de cancelaciones |
| `GET` | `/api/reports/agency-share` | Participación por agencia |
| `GET` | `/api/reports/destinations-detail` | Detalle por destino |
| `GET` | `/api/reports/evolution` | Evolución de pasajeros en el tiempo |
| `GET` | `/api/reports/evolution-revenue` | Evolución de ventas en el tiempo |
| `GET` | `/api/reports/metrics-summary` | Resumen de métricas clave |
| `GET` | `/api/reports/metrics-by-destination` | Métricas por destino |
| `GET` | `/api/reports/forecast-sales` | Proyección de ventas |
| `GET` | `/api/reports/grupos` | Reporte de grupos/vuelos a medida |
| `GET` | `/api/reports/fields` | Campos disponibles para reportes dinámicos |
| `POST` | `/api/reports/dashboard-data` | Datos agregados del dashboard principal |
| `POST` | `/api/reports/evolucion-agencias` | Evolución por agencia (dashboard legacy) |
| `POST` | `/api/reports/agencias-data` | Datos por agencia (dashboard legacy) |
| `POST` | `/api/reports/detalle-destinos` | Detalle de destinos (dashboard legacy) |
| `POST` | `/api/reports/destinos-compania` | Destinos por compañía (dashboard legacy) |
| `POST` | `/api/reports/evolucion-pasajeros` | Evolución de pasajeros (dashboard legacy) |
| `POST` | `/api/reports/evolucion-por-cupo` | Evolución por cupo (dashboard legacy) |
| `POST` | `/api/reports/share-por-cupo` | Participación por cupo (dashboard legacy) |
| `POST` | `/api/reports/por-salida` | Datos agrupados por fecha de salida (dashboard legacy) |

> Los endpoints marcados "dashboard legacy" conviven con sus equivalentes más nuevos por compatibilidad con el panel de Reportes existente — para una integración nueva, preferí `stats`, `occupancy`, `top-products`, etc.

## Notificaciones

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/notifications` | Sesión | Lista tus notificaciones |
| `GET` | `/api/notifications/unread-count` | Sesión | Cantidad de no leídas |
| `PUT` | `/api/notifications/:id/read` | Sesión | Marca una como leída |
| `PUT` | `/api/notifications/read-all` | Sesión | Marca todas como leídas |
| `PUT` | `/api/notifications/:id/hide` | Sesión | Oculta una notificación |
| `POST` | `/api/notifications` | Permiso: `NOTIFICATIONS_CREATE` | Crea una notificación manual |
| `DELETE` | `/api/notifications/:id` | Permiso: `NOTIFICATIONS_DELETE` | Elimina una notificación |

## Asistente IA

Ver [Asistente IA](FLUJOS_FUNCIONALIDADES.html#10-asistente-ia) para el detalle de cómo arma el system prompt y ejecuta tools.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/ai/chat` | Sesión | Manda un mensaje al asistente (texto + imágenes opcionales) |
| `GET` | `/api/ai/sessions` | Sesión | Tus sesiones de chat |
| `GET` | `/api/ai/sessions/:id/messages` | Sesión | Historial de una sesión |
| `PUT` | `/api/ai/sessions/:id/title` | Sesión | Renombra una sesión |
| `DELETE` | `/api/ai/sessions/:id` | Sesión | Elimina una sesión |
| `GET` | `/api/ai/experts` | Sesión | Expertos (bases de conocimiento) de tu agencia |
| `GET` | `/api/ai/experts/:id` | Sesión | Detalle de un experto |
| `POST` | `/api/ai/experts` | Admin / agency_admin | Crea un experto |
| `PUT` | `/api/ai/experts/:id` | Admin / agency_admin | Edita un experto |
| `DELETE` | `/api/ai/experts/:id` | Admin / agency_admin | Elimina un experto |
| `GET` | `/api/ai/experts/:id/documents` | Sesión | Documentos cargados a un experto |
| `POST` | `/api/ai/experts/:id/documents` | Admin / agency_admin | Sube un documento a un experto |
| `PUT` | `/api/ai/experts/:id/documents/:docId` | Admin / agency_admin | Edita un documento |
| `DELETE` | `/api/ai/experts/:id/documents/:docId` | Admin / agency_admin | Elimina un documento |
| `GET` | `/api/ai/providers` | Permiso: `AI_VIEW` | Proveedores LLM configurados |
| `POST` | `/api/ai/providers` | Permiso: `AI_UPDATE` | Da de alta un proveedor |
| `PUT` | `/api/ai/providers/:id` | Permiso: `AI_UPDATE` | Edita un proveedor |
| `DELETE` | `/api/ai/providers/:id` | Permiso: `AI_UPDATE` | Elimina un proveedor |
| `POST` | `/api/ai/providers/:id/test` | Permiso: `AI_UPDATE` | Prueba la conexión con el proveedor |
| `GET` | `/api/ai/stats` | Permiso: `AI_VIEW` | Estadísticas de uso |
| `GET` | `/api/ai/logs` | Permiso: `AI_VIEW` | Logs de chat (acepta `?days=`, `?limit=`) |

## Configuración

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/settings` | Permiso: `SETTINGS_VIEW` | Ajustes globales clave-valor (ej. `bloqueo_minutos_default`) |
| `PUT` | `/api/settings/:key` | Permiso: `SETTINGS_UPDATE` | Actualiza (o crea) un ajuste |
| `GET` | `/api/white-label/config` | Sesión | Configuración de marca (logo, colores) de tu agencia |
| `POST` | `/api/white-label/config` | Permiso: `WHITE_LABEL_UPDATE` | Crea la configuración de marca |
| `PUT` | `/api/white-label/config/:id` | Permiso: `WHITE_LABEL_UPDATE` | Edita la configuración de marca |
| `DELETE` | `/api/white-label/config/:id` | Permiso: `WHITE_LABEL_UPDATE` | Elimina la configuración de marca |
| `GET` | `/api/email-config/config` | Sesión | Configuración SMTP de tu agencia |
| `POST` | `/api/email-config/config` | Sesión | Crea la configuración SMTP |
| `PUT` | `/api/email-config/config/:id` | Sesión | Edita la configuración SMTP |
| `DELETE` | `/api/email-config/config/:id` | Sesión | Elimina la configuración SMTP |
| `POST` | `/api/email-config/test` | Sesión | Prueba la conexión SMTP |
| `POST` | `/api/email-config/send-test` | Sesión | Envía un email de prueba |
| `GET` | `/api/email-config/templates` | Sesión | Plantillas de email |
| `PUT` | `/api/email-config/templates/:id` | Sesión | Edita una plantilla de email |
| `GET` | `/api/email-config/templates/:id/preview` | Sesión | Previsualiza una plantilla renderizada |
| `GET` | `/api/notification-config/templates` | Sesión | Plantillas de notificación in-app |
| `PUT` | `/api/notification-config/templates/:id` | Sesión | Edita una plantilla de notificación |
| `GET` | `/api/notification-config/templates/:id/preview` | Sesión | Previsualiza una plantilla renderizada |

> Las rutas de `email-config` y `notification-config` solo exigen sesión iniciada (no un permiso puntual) pese a ser configuración administrativa — tenelo en cuenta si tu integración maneja credenciales SMTP.

## Logs, backup y exportación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/logs` | Permiso: `LOGS_VIEW` | Logs del sistema (acepta `?page=`, `?limit=`, `?level=`, `?source=`, `?startDate=`, `?endDate=`, `?q=`) |
| `GET` | `/api/backup` | Permiso: `BACKUP_VIEW` | Backup de datos |
| `GET` | `/api/export/csv/:entityType` | Sesión | Exporta una entidad a CSV |

## Automatización interna (no pensado para integraciones externas)

Estos dos endpoints los golpea un cron externo (GitHub Actions / cron-job.org), no un cliente de la API: no usan JWT, se protegen con el header `X-Cron-Secret` comparado contra la variable de entorno `CRON_SECRET` del servidor.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/cron/expire-reservations` | Vence bloqueos temporales y holds cumplidos, devuelve el stock |
| `GET` | `/api/cron/check-deadlines` | Avisa vencimientos operativos próximos (pago, nominación, emisión) |

Además existe un endpoint genérico `/api/data` (uso interno del panel de administración para CRUD dinámico) que no está pensado para integraciones externas y no se documenta en detalle acá.
