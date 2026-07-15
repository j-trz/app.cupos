# Referencia de la API — Sistema de Gestión de Cupos (backend-go)

Documentación de la API REST del backend en Go, pensada para que **plataformas externas** puedan integrarse. Describe autenticación, autorización (RBAC), convenciones, endpoints por recurso y los modelos de datos.

Para una definición **machine-readable** (generación de clientes, importación en Postman/Insomnia, validación), ver [`openapi.yaml`](./openapi.yaml) en esta misma carpeta.

## Índice

- [Información general](#información-general)
- [Autenticación](#autenticación)
- [Autorización (RBAC)](#autorización-rbac)
- [Convenciones](#convenciones)
- [Endpoints de Cron](#endpoints-de-cron)
- [Referencia de endpoints](#referencia-de-endpoints)
  - [Autenticación y perfil](#autenticación-y-perfil)
  - [Productos](#productos)
  - [Compartir productos](#compartir-productos)
  - [Reservas (órdenes)](#reservas-órdenes)
  - [Pasajeros](#pasajeros)
  - [Grupos (vuelos a medida)](#grupos-vuelos-a-medida)
  - [Cesión de cupos (transfers)](#cesión-de-cupos-transfers)
  - [Reportes y dashboard](#reportes-y-dashboard)
  - [Ajustes](#ajustes)
  - [Exportación y backup](#exportación-y-backup)
  - [Asistente IA](#asistente-ia)
  - [Expertos IA](#expertos-ia)
  - [CRUD dinámico (data)](#crud-dinámico-data)
  - [Agencias](#agencias)
  - [White-Label](#white-label)
  - [RBAC: roles, permisos y usuarios](#rbac-roles-permisos-y-usuarios)
  - [Notificaciones](#notificaciones)
  - [Plantillas de notificación](#plantillas-de-notificación)
  - [Configuración de email](#configuración-de-email)
  - [Backoffice](#backoffice)
  - [Logs](#logs)
- [Modelos de datos](#modelos-de-datos)
- [Notas sobre el README de backend-go](#notas-sobre-el-readme-de-backend-go)

---

## Información general

- **Estilo**: REST sobre HTTP, cuerpos y respuestas en JSON (`Content-Type: application/json`).
- **Prefijo**: todas las rutas cuelgan de `/api`.
- **Base URL**:
  - Local: `http://localhost:5002/api`
  - Producción (Vercel Serverless): `https://<tu-dominio>/api`
- **Puerto local** configurable con la variable de entorno `PORT` (por defecto `5002`).

### CORS

El servidor responde con cabeceras CORS solo para orígenes en lista blanca: la URL definida en `URL_FRONTEND`, más `localhost:5173` y `localhost:3000`. Las peticiones **sin cabecera `Origin`** (por ejemplo desde `curl`, Postman o un backend externo) se permiten. Los preflight `OPTIONS` responden `204`.

Cabeceras permitidas: `Content-Type`, `Authorization`, `X-Requested-With`. Métodos: `GET, POST, PUT, DELETE, OPTIONS`.

---

## Autenticación

La API usa **JWT (HS256)**. El flujo típico para una integración es:

1. `POST /api/auth/login` con `email` y `password`.
2. Guardar el `token` devuelto.
3. Enviar el token en cada request protegida con la cabecera:

   ```http
   Authorization: Bearer <token>
   ```

Detalles:

- El token expira a las **24 horas** de emitido (claim `exp`).
- Los claims incluyen: `id`, `email`, `nombre`, `apellido`, `telefono`, `agencia`, `role`, `admin`, `exp`.
- El token se firma con la variable de entorno `JWT_SECRET`.
- Sin cabecera `Authorization` válida, los endpoints protegidos responden `401`.

Ejemplo de login:

```bash
curl -X POST https://<dominio>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agencia@ejemplo.com","password":"secreto"}'
```

Respuesta (`200`):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "…", "email": "agencia@ejemplo.com", "role": "agency_user", "agencia": "AG01", "...": "..." }
}
```

---

## Autorización (RBAC)

Además del JWT, muchos endpoints exigen un **permiso granular** con código `MODULO_ACCION` (por ejemplo `PRODUCTS_CREATE`, `RESERVATIONS_DELETE`).

- Los usuarios con `role == "admin"` tienen **bypass total** (todos los permisos).
- Para el resto, el permiso se resuelve recorriendo `user_roles → role_permissions → permissions`, y solo cuentan los permisos con `is_active = true`.
- Si falta el permiso, la respuesta es `403` con el cuerpo:

  ```json
  { "error": "Acceso prohibido. Permisos insuficientes.", "message": "Se requiere el permiso: PRODUCTS_CREATE" }
  ```

- La integración puede consultar los permisos efectivos del usuario autenticado con `GET /api/users/me/permissions`.

En este documento, cada endpoint indica su nivel de acceso:

- **Público**: sin JWT.
- **Autenticado**: requiere JWT válido, sin permiso específico. (Algunos filtran los datos internamente según rol/agencia.)
- **Permiso: `CODIGO`**: requiere JWT + ese permiso (o ser `admin`).
- **Admin** / **Agency admin**: requiere ese rol específico (middleware `AdminOnly` / `AgencyAdminOrAdmin`).

---

## Convenciones

### Formato de las respuestas

No hay un envoltorio único global. Los patrones más comunes son:

- Objetos con `success` y datos: `{ "success": true, "data": [...] }` o `{ "success": true, "user": {...} }`.
- Recursos "planos" (listas o entidades directas), por ejemplo `GET /api/settings` devuelve un array de `SystemSetting`.

Cada endpoint documenta su forma concreta.

### Errores

Los errores devuelven un objeto con `error` (y a veces `message`):

```json
{ "error": "Descripción del problema" }
```

Códigos usados: `200`, `201`, `204` (preflight), `400` (validación), `401` (sin/JWT inválido), `403` (sin permiso), `404` (no encontrado), `500` (error interno).

### Fechas

- Las respuestas serializan fechas en **RFC3339** (`2025-07-15T19:24:00Z`).
- Varios endpoints aceptan en el request tanto `YYYY-MM-DD` como RFC3339 (por ejemplo fechas de nacimiento de pasajeros y fechas de grupos); el backend las normaliza.

### Identificadores

- `Product`, `Reservation`, `Passenger`, `Group`, `ProductSharedAgency` usan **IDs numéricos** (`uint`).
- El resto de entidades (`Profile`/usuario, `Agency`, `Role`, `Permission`, `Notification`, `AIProvider`, `AIExpert`, etc.) usan **UUID**.

---

## Endpoints de Cron

Dos endpoints están pensados para un **scheduler externo** (cron-job.org, GitHub Actions, etc.). No usan JWT: se autentican con la cabecera `X-Cron-Secret`, que debe coincidir con la variable de entorno `CRON_SECRET`. Si falta o no coincide, responden `401`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/cron/expire-reservations` | Avisa reservas por vencer (ventana de 15 min) y expira las vencidas en `bloqueo_temporal`, liberando cupos. |
| `GET` | `/api/cron/check-deadlines` | Envía recordatorios de deadlines operativos (pago, nominación, emisión, gastos) de productos y grupos. |

Frecuencia recomendada: cada **5–15 minutos**.

```bash
curl https://<dominio>/api/cron/expire-reservations -H "X-Cron-Secret: $CRON_SECRET"
```

Respuesta de `expire-reservations` (`200`): `{ "success": true, "warned": 2, "expired": 5 }`.

---

## Referencia de endpoints

> Salvo que se indique **Público**, todos los endpoints requieren la cabecera `Authorization: Bearer <token>`.

### Autenticación y perfil

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Público | Login; devuelve `token` + `user`. |
| `POST` | `/api/auth/register` | Público | Alta de usuario (rol forzado a `agency_user`, sin privilegios admin); devuelve token. |
| `GET` | `/api/auth/profile` | Autenticado | Perfil del usuario autenticado. |
| `GET` | `/api/users/me/permissions` | Autenticado | Códigos de permiso efectivos del usuario (admin recibe todos). |

**`POST /api/auth/login`** — body:

```json
{ "email": "string", "password": "string" }
```

**`POST /api/auth/register`** — body (mínimo `email` + `password`):

```json
{ "email": "string", "password": "string", "nombre": "string", "apellido": "string", "telefono": "string", "agencia": "string" }
```

**`GET /api/users/me/permissions`** — respuesta:

```json
{ "success": true, "data": ["PRODUCTS_VIEW", "RESERVATIONS_VIEW", "..."] }
```

### Productos

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/products/` | Autenticado | Lista productos. Para reservar solo devuelve `disponibilidad > 0` y no bloqueados, filtrados por agencia propia/cedida/compartida (admin ve todo). |
| `GET` | `/api/products/:id` | Autenticado | Detalle de un producto (a no-admin se le ocultan `neto_1`/notas internas). |
| `POST` | `/api/products/` | Permiso: `PRODUCTS_CREATE` | Crea un producto. |
| `PUT` | `/api/products/:id` | Permiso: `PRODUCTS_UPDATE` | Actualiza un producto. |
| `DELETE` | `/api/products/:id` | Permiso: `PRODUCTS_DELETE` | Elimina (se bloquea si tiene reservas o cesiones). |
| `POST` | `/api/products/bulk` | Permiso: `PRODUCTS_CREATE` | Importación masiva; procesa fila por fila y reporta errores por fila. |

**`POST /api/products/`** — body (campos principales del modelo `Product`):

```json
{
  "codigo_cupo": "CH123",
  "destino": "Punta Cana",
  "compania": "AA",
  "disponibilidad": 40,
  "cupo": 40,
  "fecha_salida": "2025-12-01",
  "fecha_regreso": "2025-12-10",
  "precio": 1200.0,
  "neto_1": 900.0,
  "op": 150.0,
  "ruta": "EZE-PUJ-EZE",
  "pnr": "ABC123",
  "temporada": "Verano 2025",
  "tipo_producto": "CHARTERS",
  "bloqueo_temporal_minutos": 60,
  "is_blocked_for_sale": false
}
```

**`POST /api/products/bulk`** — body: array de objetos con la misma forma que el producto (`[ { ... }, { ... } ]`).

### Compartir productos

Comparte la **misma** fila de producto (mismo `disponibilidad`) con otra agencia, sin crear un espejo (a diferencia de la cesión).

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/products/:id/shared-agencies` | Autenticado | Lista los códigos de agencia con los que se comparte el producto. |
| `POST` | `/api/products/:id/shared-agencies` | Autenticado (con permiso de gestión del producto) | Agrega una agencia. Body: `{ "agencia": "AG02" }`. |
| `DELETE` | `/api/products/:id/shared-agencies/:agencia` | Autenticado (con permiso de gestión del producto) | Deja de compartir con esa agencia. |

### Reservas (órdenes)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/orders/` | Autenticado | Lista reservas (filtradas por rol/agencia). |
| `GET` | `/api/orders/blocked` | Autenticado | Reservas en `bloqueo_temporal` de toda la agencia. |
| `POST` | `/api/orders/` | Autenticado | Crea una reserva (1 pasajero = 1 ticket). |
| `GET` | `/api/orders/:id` | Autenticado | Detalle de reserva con pasajeros. |
| `PUT` | `/api/orders/:id` | Autenticado | Actualiza campos de la reserva. |
| `PUT` | `/api/orders/:id/doc-contable` | Autenticado | Agrega documento contable → confirma la reserva. |
| `POST` | `/api/orders/:id/confirm` | Autenticado | Confirma la reserva. |
| `PUT` | `/api/orders/:id/cancel-request` | Autenticado | Solicita la cancelación (guarda estado previo). |
| `PUT` | `/api/orders/:id/cancel-request/resolve` | Permiso: `RESERVATIONS_DELETE` | Aprueba/rechaza la solicitud de cancelación. |
| `DELETE` | `/api/orders/:id` | Permiso: `RESERVATIONS_DELETE` | Elimina la reserva. |

**`POST /api/orders/`** — body (`Reservation` + array `passengers`):

```json
{
  "product_id": 12,
  "contacto_nombre": "Juan Pérez",
  "contacto_email": "juan@ejemplo.com",
  "contacto_telefono": "+541100000000",
  "doc_contable": "",
  "passengers": [
    {
      "nombre": "Juan",
      "apellido": "Pérez",
      "documento": "30111222",
      "nacimiento": "1990-05-20",
      "nacionalidad": "AR",
      "tipo_pasajero": "Adulto"
    }
  ]
}
```

Notas:
- Para usuarios no-admin, la agencia se fuerza a la del token (no se puede reservar a nombre de otra agencia).
- Si `doc_contable` viene con valor, la reserva nace `confirmada`; si no, `bloqueo_temporal` con `bloqueo_expira_at` según los minutos del producto o el ajuste `bloqueo_minutos_default`.
- Si no se envía `passengers`, se sintetiza un pasajero a partir de los campos `*_pasajero` del cuerpo.

**`PUT /api/orders/:id/doc-contable`** — body: `{ "doc_contable": "FC-0001-00012345" }`.

**`PUT /api/orders/:id/cancel-request/resolve`** — body: `{ "decision": "approve" | "decline", "notas": "string" }`.

### Pasajeros

Rutas anidadas bajo una reserva (`:id` = reserva, `:passengerId` = pasajero):

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/orders/:id/passengers` | Autenticado | Agrega un pasajero (nuevo ticket). |
| `PUT` | `/api/orders/:id/passengers/:passengerId` | Autenticado | Asigna número de ticket / precio a un pasajero. |
| `PUT` | `/api/orders/:id/passengers/:passengerId/full` | Autenticado | Edita todos los datos del pasajero. |
| `POST` | `/api/orders/:id/passengers/:passengerId/duplicate` | Autenticado | Duplica un pasajero. |
| `DELETE` | `/api/orders/:id/passengers/:passengerId` | Autenticado | Elimina un pasajero. |

**`PUT /api/orders/:id/passengers/:passengerId`** — body (el update se ignora si `numero_ticket` viene vacío):

```json
{ "numero_ticket": "075-1234567890", "precio_venta": 1200.0, "neto_1": 900.0, "doc_contable": "FC-…" }
```

### Grupos (vuelos a medida)

Máquina de 2 fases: `estado_cotizacion` (`pendiente → cotizada → aceptada|rechazada`) y `estado_reservar` (`confirmada → cancelacion_solicitada → cancelada`).

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/groups/` | Autenticado | Lista grupos (admin/gestión ven todo; usuario ve los propios). |
| `GET` | `/api/groups/:id` | Autenticado | Detalle de grupo. |
| `POST` | `/api/groups/` | Permiso: `GROUPS_CREATE` | Crea un grupo (carga directa del admin). |
| `PUT` | `/api/groups/:id` | Permiso: `GROUPS_UPDATE` | Actualiza un grupo. |
| `DELETE` | `/api/groups/:id` | Permiso: `GROUPS_DELETE` | Elimina un grupo. |
| `POST` | `/api/groups/request` | Autenticado | Solicitud de usuario con una o más opciones de itinerario. |
| `POST` | `/api/groups/:id/send-quote` | Permiso: `GROUPS_UPDATE` | Envía la cotización → `cotizada`. |
| `POST` | `/api/groups/:id/accept` | Autenticado | Acepta la cotización (no vencida) → `aceptada`; rechaza hermanas. |
| `POST` | `/api/groups/:id/confirm` | Permiso: `GROUPS_UPDATE` | Confirma → `estado_reservar = confirmada`. |
| `POST` | `/api/groups/:id/request-cancellation` | Autenticado | Solicita cancelar un grupo confirmado. |
| `POST` | `/api/groups/:id/resolve-cancellation` | Permiso: `GROUPS_UPDATE` | Aprueba/rechaza la cancelación. |

**`POST /api/groups/request`** — body:

```json
{
  "cantidad_lugares": 20,
  "notas_vendedor": "Prefiere salidas de fin de semana",
  "opciones": [
    { "itinerario": "EZE-MAD-EZE 12/01", "notas": "Opción directa" },
    { "itinerario": "EZE-BCN-EZE 13/01", "notas": "Escala en GRU" }
  ]
}
```

**`POST /api/groups/:id/resolve-cancellation`** — body: `{ "decision": "approve" | "decline", "notas": "string" }`.

### Cesión de cupos (transfers)

Prestar disponibilidad de un producto a otra agencia creando un producto **espejo**.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/transfers` | Autenticado | Cesiones relacionadas al usuario/agencia. |
| `GET` | `/api/transfers/all` | Permiso: `TRANSFERS_VIEW` | Todas las cesiones (administración). |
| `POST` | `/api/transfers` | Permiso: `TRANSFERS_CREATE` | Crea una cesión. |
| `POST` | `/api/transfers/:id/reclaim` | Permiso: `TRANSFERS_CREATE` | Recupera disponibilidad no reservada del espejo (total o parcial). |

**`POST /api/transfers`** — body:

```json
{ "product_id": 12, "target_agency": "AG02", "quantity": 10 }
```

**`POST /api/transfers/:id/reclaim`** — body opcional: `{ "quantity": 5 }` (sin `quantity` recupera todo lo disponible).

### Reportes y dashboard

Todos requieren **Permiso: `REPORTS_VIEW`**.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/reports/stats` | Totales: reservas, ventas confirmadas, usuarios activos, pasajeros. |
| `GET` | `/api/reports/evolution` | Evolución de pasajeros. |
| `GET` | `/api/reports/agency-share` | Participación por agencia. |
| `GET` | `/api/reports/destinations-detail` | Detalle por destino. |
| `GET` | `/api/reports/evolution-revenue` | Evolución de ingresos. |
| `GET` | `/api/reports/occupancy` | Ocupación. |
| `GET` | `/api/reports/top-products` | Productos top. |
| `GET` | `/api/reports/risk-alerts` | Alertas de riesgo (`disponibles × neto_1`). |
| `GET` | `/api/reports/cancellations` | Cancelaciones. |
| `GET` | `/api/reports/grupos` | Reporte de grupos. |
| `GET` | `/api/reports/metrics-summary` | Resumen de métricas. |
| `GET` | `/api/reports/metrics-by-destination` | Métricas por destino. |
| `GET` | `/api/reports/forecast-sales` | Proyección de ventas. |
| `GET` | `/api/reports/fields` | Campos disponibles para filtros (legacy). |
| `POST` | `/api/reports/dashboard-data` | Datos del dashboard (legacy). |
| `POST` | `/api/reports/evolucion-agencias` | Evolución por agencias (legacy). |
| `POST` | `/api/reports/agencias-data` | Datos por agencia (legacy). |
| `POST` | `/api/reports/detalle-destinos` | Detalle de destinos (legacy). |
| `POST` | `/api/reports/destinos-compania` | Destinos por compañía (legacy). |
| `POST` | `/api/reports/evolucion-pasajeros` | Evolución de pasajeros (legacy). |
| `POST` | `/api/reports/evolucion-por-cupo` | Evolución por cupo (legacy). |
| `POST` | `/api/reports/share-por-cupo` | Share por cupo (legacy). |
| `POST` | `/api/reports/por-salida` | Datos por salida (legacy). |

Los endpoints `POST` (legacy) aceptan un cuerpo con filtros:

```json
{ "userId": "…", "filters": { "temporada": "Verano 2025", "destino": "Punta Cana" }, "granularidad": "mes" }
```

### Ajustes

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/settings/` | Permiso: `SETTINGS_VIEW` | Lista de ajustes (`SystemSetting[]`). |
| `PUT` | `/api/settings/:key` | Permiso: `SETTINGS_UPDATE` | Upsert de un ajuste. Body: `{ "value": <any> }`. |

Ejemplo de ajuste conocido: `bloqueo_minutos_default` (minutos de bloqueo temporal por defecto).

### Exportación y backup

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/export/csv/:entityType` | Autenticado | Descarga un CSV para el tipo de entidad indicado. |
| `GET` | `/api/backup` | Permiso: `BACKUP_VIEW` | Respaldo/dump de datos. |

### Asistente IA

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/ai/chat` | Autenticado | Chat con herramientas (function calling); respeta reglas de seguridad por rol. |
| `GET` | `/api/ai/providers` | Permiso: `AI_VIEW` | Lista proveedores LLM. |
| `POST` | `/api/ai/providers` | Permiso: `AI_UPDATE` | Crea proveedor. |
| `PUT` | `/api/ai/providers/:id` | Permiso: `AI_UPDATE` | Actualiza proveedor. |
| `DELETE` | `/api/ai/providers/:id` | Permiso: `AI_UPDATE` | Elimina proveedor. |
| `POST` | `/api/ai/providers/:id/test` | Permiso: `AI_UPDATE` | Prueba la conexión del proveedor. |
| `GET` | `/api/ai/sessions` | Autenticado | Sesiones de chat del usuario. |
| `GET` | `/api/ai/sessions/:id/messages` | Autenticado | Mensajes de una sesión. |
| `DELETE` | `/api/ai/sessions/:id` | Autenticado | Elimina una sesión. |
| `PUT` | `/api/ai/sessions/:id/title` | Autenticado | Renombra una sesión. Body: `{ "title": "string" }`. |
| `GET` | `/api/ai/stats` | Permiso: `AI_VIEW` (ver nota) | Estadísticas de uso de IA. |
| `GET` | `/api/ai/logs` | Permiso: `AI_VIEW` (ver nota) | Logs de IA. |

**`POST /api/ai/chat`** — body:

```json
{
  "message": "¿Qué reservas tengo pendientes?",
  "sessionId": "uuid-o-vacío",
  "providerId": "uuid-del-proveedor-o-vacío",
  "images": [{ "base64": "…", "mime": "image/png", "name": "doc.png" }],
  "pageContext": { "page": "Disponibilidad", "visibleItems": [] }
}
```

> **Nota:** en `main` hay marcadores de conflicto de merge sin resolver alrededor de `/api/ai/stats` y `/api/ai/logs` (una versión los protege con `AI_VIEW`, otra con `AdminOnly()`), y de los endpoints de expertos. La API real depende de cómo se resuelva ese conflicto. Ver [Notas sobre el README](#notas-sobre-el-readme-de-backend-go).

### Expertos IA

Bases de conocimiento por agencia. Listar/consultar: cualquier usuario autenticado (scopeado a su agencia). Gestionar: `AgencyAdminOrAdmin`.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/ai/experts` | Autenticado | Lista expertos de la agencia. |
| `POST` | `/api/ai/experts` | Agency admin | Crea un experto. |
| `GET` | `/api/ai/experts/:id` | Autenticado | Detalle de experto. |
| `PUT` | `/api/ai/experts/:id` | Agency admin | Actualiza experto. |
| `DELETE` | `/api/ai/experts/:id` | Agency admin | Elimina experto. |
| `POST` | `/api/ai/experts/:id/documents` | Agency admin | Sube un documento (se convierte a Markdown en memoria). |
| `GET` | `/api/ai/experts/:id/documents` | Autenticado | Lista documentos del experto. |
| `DELETE` | `/api/ai/experts/:id/documents/:docId` | Agency admin | Elimina un documento. |

**`POST /api/ai/experts`** — body: `{ "name": "string", "description": "string", "persona": "string", "is_active": true }`.

### CRUD dinámico (data)

Acceso genérico a tablas. Requiere autenticación; usar con cuidado desde integraciones externas.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/data/?table=<tabla>&filters=<json>` | Lee filas de una tabla con filtros opcionales. |
| `POST` `PUT` `DELETE` | `/api/data/` | Ejecuta una operación CRUD. |

**Body de `POST/PUT/DELETE /api/data/`**:

```json
{ "table": "products", "operation": "insert" | "update" | "delete", "data": { }, "id": 123 }
```

### Agencias

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/agencies/` | Autenticado | Lista agencias. |
| `POST` | `/api/agencies/` | Permiso: `AGENCIES_CREATE` | Crea agencia. |
| `PUT` | `/api/agencies/:id` | Permiso: `AGENCIES_UPDATE` | Actualiza agencia. |
| `DELETE` | `/api/agencies/:id` | Permiso: `AGENCIES_DELETE` | Elimina agencia. |

**`POST /api/agencies/`** — body (`Agency`): `{ "code": "AG02", "name": "Agencia Dos", "email": "…", "phone": "…", "website": "…", "color": "#3b82f6", "is_active": true }`.

### White-Label

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/white-label/config` | Autenticado | Config de marca de la agencia del token. |
| `POST` | `/api/white-label/config` | Permiso: `WHITE_LABEL_UPDATE` | Crea config. |
| `PUT` | `/api/white-label/config/:id` | Permiso: `WHITE_LABEL_UPDATE` | Actualiza config. |
| `DELETE` | `/api/white-label/config/:id` | Permiso: `WHITE_LABEL_UPDATE` | Elimina config. |

El cuerpo es un objeto JSON libre (logo, colores, etc.). Un admin puede incluir `agency_id` para operar sobre otra agencia; el resto usa la agencia del token.

### RBAC: roles, permisos y usuarios

**Usuarios**

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/users/` | Permiso: `USERS_VIEW` | Lista usuarios (con su rol). |
| `GET` | `/api/users/:id` | Permiso: `USERS_VIEW` | Detalle de usuario. |
| `POST` | `/api/users/` | Permiso: `USERS_CREATE` | Crea usuario. Body: `Profile` + `role_id` opcional. |
| `PUT` | `/api/users/:id` | Permiso: `USERS_UPDATE` | Actualiza usuario. |
| `DELETE` | `/api/users/:id` | Permiso: `USERS_DELETE` | Elimina usuario. |
| `PUT` | `/api/users/:id/status` | Permiso: `USERS_UNLOCK` | Activa/desactiva la cuenta. |

**Roles**

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/roles/` | Permiso: `ROLES_VIEW` | Lista roles. |
| `GET` | `/api/roles/:id` | Permiso: `ROLES_VIEW` | Detalle de rol. |
| `POST` | `/api/roles/` | Permiso: `ROLES_CREATE` | Crea rol. |
| `PUT` | `/api/roles/:id` | Permiso: `ROLES_UPDATE` | Actualiza rol. |
| `DELETE` | `/api/roles/:id` | Permiso: `ROLES_DELETE` | Elimina rol. |
| `GET` | `/api/roles/:id/users` | Permiso: `ROLES_VIEW` | Usuarios con ese rol. |
| `GET` | `/api/roles/:id/permissions` | Permiso: `ROLES_VIEW` | Permisos del rol. |
| `POST` | `/api/roles/:id/permissions` | Permiso: `ROLES_ASSIGN_PERMISSIONS` | Asigna permisos. Body: `{ "permissions": ["uuid", ...] }`. |

**Permisos**

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/permissions/` | Permiso: `PERMISSIONS_VIEW` | Lista permisos. |
| `GET` | `/api/permissions/:id` | Permiso: `PERMISSIONS_VIEW` | Detalle de permiso. |
| `POST` | `/api/permissions/` | Permiso: `PERMISSIONS_CREATE` | Crea permiso. |
| `PUT` | `/api/permissions/:id` | Permiso: `PERMISSIONS_UPDATE` | Actualiza permiso. |
| `DELETE` | `/api/permissions/:id` | Permiso: `PERMISSIONS_DELETE` | Elimina permiso. |

**Asignación de rol a usuario**

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/user-roles` | Permiso: `ROLES_ASSIGN_PERMISSIONS` | Asigna un rol a un usuario. Body: `{ "user_id": "uuid", "role_id": "uuid" }`. |

### Notificaciones

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | Autenticado | Lista notificaciones del usuario. Query `?limit=`. |
| `GET` | `/api/notifications/unread-count` | Autenticado | Cantidad de no leídas (usado por el polling cada 20 s). |
| `PUT` | `/api/notifications/read-all` | Autenticado | Marca todas como leídas. |
| `PUT` | `/api/notifications/:id/read` | Autenticado | Marca una como leída. |
| `PUT` | `/api/notifications/:id/hide` | Autenticado | Oculta una notificación. |
| `POST` | `/api/notifications` | Permiso: `NOTIFICATIONS_CREATE` | Crea una notificación. |
| `DELETE` | `/api/notifications/:id` | Permiso: `NOTIFICATIONS_DELETE` | Elimina una notificación. |

**`POST /api/notifications`** — body (`Notification`):

```json
{ "type": "system_update", "title": "Aviso", "message": "Texto", "icon": "📢", "color": "blue", "priority": "medium", "target_role": "agency_user" }
```

### Plantillas de notificación

Personalización del título/mensaje de las notificaciones in-app, por agencia.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/notification-config/templates` | Autenticado | Lista plantillas. |
| `PUT` | `/api/notification-config/templates/:id` | Autenticado | Edita una plantilla. |
| `GET` | `/api/notification-config/templates/:id/preview` | Autenticado | Previsualiza una plantilla. |

**`PUT /api/notification-config/templates/:id`** — body: `{ "title": "…", "message": "…", "icon": "…", "color": "…", "extra_emails": "ops@ejemplo.com" }`.

### Configuración de email

SMTP y plantillas de email por agencia.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/email-config/config` | Autenticado | Config SMTP de la agencia. |
| `POST` | `/api/email-config/config` | Autenticado | Crea config SMTP (`EmailSMTPConfig`). |
| `PUT` | `/api/email-config/config/:id` | Autenticado | Actualiza config SMTP. |
| `DELETE` | `/api/email-config/config/:id` | Autenticado | Elimina config SMTP. |
| `POST` | `/api/email-config/test` | Autenticado | Prueba la conexión SMTP. |
| `POST` | `/api/email-config/send-test` | Autenticado | Envía un email de prueba. Body: `{ "to_email": "…" }`. |
| `GET` | `/api/email-config/templates` | Autenticado | Lista plantillas de email. |
| `PUT` | `/api/email-config/templates/:id` | Autenticado | Edita una plantilla. |
| `GET` | `/api/email-config/templates/:id/preview` | Autenticado | Previsualiza una plantilla. |

**`POST /api/email-config/test`** — body: `{ "smtp_host": "…", "smtp_port": 587, "smtp_user": "…", "smtp_pass": "…", "smtp_secure": false }`.

### Backoffice

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/backoffice/importar-pasajeros` | Autenticado | Utilidad de importación de pasajeros. |

### Logs

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/logs` | Permiso: `LOGS_VIEW` | Registro histórico de auditoría (`SystemLog[]`). |

---

## Modelos de datos

Formas serializadas (JSON) de las entidades principales. Los campos marcados como internos (`json:"-"`) no aparecen en las respuestas.

### Profile (usuario)

```json
{
  "id": "uuid",
  "email": "string",
  "nombre": "string",
  "apellido": "string",
  "telefono": "string",
  "agencia": "string",
  "admin": false,
  "activo": true,
  "role": "agency_user",
  "created_at": "RFC3339",
  "updated_at": "RFC3339"
}
```

`password` solo se envía en el request (alta/registro); nunca se devuelve.

### Product

```json
{
  "id": 1,
  "codigo_cupo": "CH123",
  "destino": "Punta Cana",
  "compania": "AA",
  "disponibilidad": 40,
  "cupo": 40,
  "vendidos": 0,
  "fecha_salida": "RFC3339",
  "fecha_regreso": "RFC3339",
  "precio": 1200.0,
  "neto_1": 900.0,
  "op": 150.0,
  "ruta": "EZE-PUJ-EZE",
  "pnr": "ABC123",
  "ficha": "string",
  "temporada": "Verano 2025",
  "tipo_producto": "CHARTERS",
  "bloqueo_temporal_minutos": 60,
  "carryon": false,
  "handbag": false,
  "checkedbag": false,
  "is_blocked_for_sale": false,
  "agencia": "AG01",
  "restricted_agency": "",
  "source_agency": "",
  "transfer_id": null,
  "created_at": "RFC3339",
  "updated_at": "RFC3339"
}
```

A usuarios no-admin se les fuerza `neto_1` a 0 y se ocultan las notas internas.

### Reservation

Estados (`estado`): `bloqueo_temporal`, `confirmada`, `solicitud_cancelacion`, `cancelada`, `expirada`, `cedido`.

```json
{
  "id": 1,
  "product_id": 12,
  "created_by": "uuid",
  "estado": "bloqueo_temporal",
  "bloqueo_expira_at": "RFC3339",
  "precio_venta": 1200.0,
  "pedido_id": "PED-2025-…",
  "agencia": "AG01",
  "contacto_nombre": "Juan Pérez",
  "contacto_email": "juan@ejemplo.com",
  "doc_contable": "",
  "passengers": [ /* Passenger[] */ ],
  "created_at": "RFC3339",
  "updated_at": "RFC3339"
}
```

### Passenger

```json
{
  "id": 1,
  "reservation_id": 1,
  "pedido_id": "PED-2025-…",
  "nombre": "Juan",
  "apellido": "Pérez",
  "documento": "30111222",
  "nacimiento": "RFC3339",
  "nacionalidad": "AR",
  "tipo_pasajero": "Adulto",
  "nro": 1,
  "estado": "bloqueo_temporal",
  "numero_ticket": "",
  "precio_venta": 0,
  "doc_contable": "",
  "created_at": "RFC3339",
  "updated_at": "RFC3339"
}
```

`nro`: `1` = venta computable, `0` = acompañante/no-revenue.

### Group

Estados: `estado_cotizacion` ∈ `{pendiente, cotizada, aceptada, rechazada}`; `estado_reservar` ∈ `{confirmada, cancelacion_solicitada, cancelada}`.

```json
{
  "id": 1,
  "solicitud_id": "uuid",
  "opcion_numero": 1,
  "vendedor": "uuid",
  "agency": "AG01",
  "itinerario": "EZE-MAD-EZE 12/01",
  "cantidad_lugares": 20,
  "neto_01": 0,
  "vencimiento_cotizacion": "RFC3339",
  "estado_cotizacion": "pendiente",
  "estado_reservar": "",
  "created_at": "RFC3339",
  "updated_at": "RFC3339"
}
```

### Agency

```json
{ "id": "uuid", "code": "AG01", "name": "Agencia Uno", "email": "…", "phone": "…", "website": "…", "color": "#3b82f6", "is_active": true, "created_at": "RFC3339", "updated_at": "RFC3339" }
```

### Notification

```json
{ "id": "uuid", "type": "info", "title": "…", "message": "…", "icon": "📢", "color": "blue", "priority": "medium", "target_user_id": null, "target_role": "", "target_agency": "", "is_read": false, "is_hidden": false, "created_at": "RFC3339" }
```

### AvailabilityTransfer

```json
{ "id": "uuid", "product_id": 12, "source_agency": "AG01", "target_agency": "AG02", "quantity": 10, "created_by": "uuid", "created_at": "RFC3339", "updated_at": "RFC3339" }
```

### SystemSetting

```json
{ "key": "bloqueo_minutos_default", "value": 60, "created_at": "RFC3339", "updated_at": "RFC3339" }
```

`value` es JSON arbitrario (número, string, objeto…).

### AIProvider

```json
{ "id": "uuid", "name": "openai-prod", "display_name": "OpenAI", "provider_type": "openai", "api_endpoint": "…", "base_url": "…", "default_model": "gpt-4o", "temperature": 0.7, "max_tokens": 4096, "is_active": true, "is_default": false }
```

`api_key` solo se envía al crear/editar; conviene tratarla como secreto.

---

## Notas sobre el README de backend-go

El [`backend-go/README.md`](../README.md) incluye una lista resumida de endpoints con fines de overview. Algunas rutas mencionadas allí son **legacy o aspiracionales** y no coinciden con el ruteo real de `cmd/api/main.go`. Este documento (`API.md`) refleja las rutas efectivamente registradas. Diferencias notables:

| README | Ruta real |
| --- | --- |
| `GET /api/analytics/stats` | `GET /api/reports/stats` |
| `GET /api/reports/export` | `GET /api/export/csv/:entityType` |
| `POST /api/products/share` | `POST /api/products/:id/shared-agencies` |
| `GET/POST /api/ai-expert/config` | `GET/POST /api/ai/experts` (+ `/documents`) |
| `GET /api/notifications` (SSE) | `GET /api/notifications` (JSON, con polling de `/unread-count`) |

Además, al momento de escribir esta documentación, `cmd/api/main.go` y `pkg/handlers/ai_handler.go` contienen **marcadores de conflicto de merge sin resolver** (`<<<<<<<`, `=======`, `>>>>>>>`) alrededor de los endpoints de IA (`/api/ai/stats`, `/api/ai/logs`) y de expertos. Mientras ese conflicto no se resuelva, el binario no compila y la protección exacta de esos endpoints (`AI_VIEW` vs `AdminOnly`) queda indefinida. Se recomienda resolverlo antes de publicar la API para integradores externos.
