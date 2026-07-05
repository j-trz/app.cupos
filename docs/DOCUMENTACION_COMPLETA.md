# DOCUMENTACIÓN COMPLETA - Sistema de Gestión de Cupos y Reservas

## 1. Descripción del Sistema

Aplicación web completa para la gestión de cupos aéreos, reservas, solicitudes, agencias y usuarios. Incluye panel de administración, notificaciones en tiempo real, y sistema de autenticación JWT.

**Arquitectura:** Monorepo con tres capas separadas:
- **Backend** (Express.js + PostgreSQL) → Puerto 5001
- **Frontend** (React 18 + Vite) → Puerto 3000/5173
- **Base de Datos** (PostgreSQL con funciones PL/pgSQL personalizadas)

---

## 2. Tecnologías Utilizadas

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | Latest | Runtime |
| Express.js | Latest | Framework HTTP |
| PostgreSQL | 15+ | Base de datos relacional |
| pg (node-postgres) | Latest | Driver SQL |
| bcryptjs | Latest | Hashing de contraseñas |
| jsonwebtoken (JWT) | Latest | Autenticación |
| morgan | Latest | Logging HTTP |
| cors | Latest | Cross-origin resource sharing |
| dotenv | Latest | Variables de entorno |

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18+ | UI Library |
| Vite | Latest | Build tool |
| Tailwind CSS | Latest | Estilos utility-first |
| Radix UI | Latest | Componentes accesibles (Dropdown, Dialog, etc.) |
| Lucide React | Latest | Iconos |
| SweetAlert2 | Latest | Modales de confirmación |
| React Router | Latest | Routing |

---

## 3. Estructura del Proyecto

```
├── backend/
│   ├── src/
│   │   ├── controllers/          # Lógica de cada endpoint
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── notificationController.js
│   │   │   ├── dataController.js
│   │   │   ├── ordersController.js
│   │   │   ├── productsController.js
│   │   │   ├── agenciesController.js
│   │   │   ├── settingsController.js
│   │   │   ├── alertRulesController.js
│   │   │   └── themesController.js
│   │   ├── middleware/
│   │   │   └── auth.js           # Middlewares JWT (requireAuth, isAdmin, etc.)
│   │   ├── config/
│   │   │   └── database.js       # Pool de conexiones PostgreSQL
│   │   ├── services/
│   │   │   ├── emailService.js   # Envío de emails por plantilla
│   │   │   └── reservationService.js # Lógica de reservas temporales
│   │   └── db.js                 # Exporta query() del pool
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # Componentes shadcn/ui personalizados
│   │   │   │   ├── shadcn-button.jsx
│   │   │   │   ├── shadcn-dialog.jsx
│   │   │   │   ├── shadcn-dropdown-menu.jsx
│   │   │   │   ├── shadcn-table.jsx
│   │   │   │   ├── shadcn-input.jsx
│   │   │   │   ├── shadcn-label.jsx
│   │   │   │   ├── shadcn-select.jsx
│   │   │   │   ├── shadcn-card.jsx
│   │   │   │   └── ...
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── AdminRoute.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Availability.jsx
│   │   │   ├── Requests.jsx
│   │   │   ├── Confirmations.jsx
│   │   │   ├── GestionUsuarios.jsx
│   │   │   ├── GestionReservas.jsx
│   │   │   ├── GestionAgencias.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Notificaciones.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   ├── apiClient.js      # Cliente HTTP centralizado
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── reservationService.js
│   │   │   ├── agencyService.js
│   │   │   ├── productService.js
│   │   │   └── notificationService.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/src/index.js          # Registro de TODOS los routers y endpoints
└── docs/DOCUMENTACION_COMPLETA.md
```

---

## 4. API Completa - Endpoints del Backend

### 4.1 Autenticación (`/api/auth`)

| Método |            Endpoint               |     Middleware      |          Controller          |            Descripción            |
|--------|-----------------------------------|---------------------|------------------------------|-----------------------------------|
| POST   | `/api/auth/register`              |         None        | `authController.register`    | Registrar nuevo usuario           |
| POST   | `/api/auth/login`                 |         None        | `authController.login`       | Login con email/password          |
| GET    | `/api/auth/profile`               |    `requireAuth`    | `authController.getProfile`  | Obtener perfil del usuario actual |

**Detalles de login:**
- Verifica intentos fallidos → bloqueo temporal tras múltiples fallos
- Genera JWT con payload: `{ id, email, nombre, agencia, role, admin }`
- Guarda sesión en `user_sessions`
- Usa funciones Postgres: `check_and_update_lock_status()`, `log_login_attempt()`

### 4.2 Usuarios (`/api/users`)

| Método |         Endpoint         |        Middleware        |            Controller            |        Descripción         |
|--------|--------------------------|--------------------------|----------------------------------|----------------------------|
| GET    | `/api/users`             | `requireAuth`, `isAdmin` | `userController.listUsers`       | Listar todos los usuarios  |
| POST   | `/api/users`             | `requireAuth`, `isAdmin` | `userController.createUser`      | Crear usuario              |
| PUT    | `/api/users/:id`         | `requireAuth`, `isAdmin` | `userController.updateUser`      | Actualizar usuario         |
| DELETE | `/api/users/:id`         | `requireAuth`, `isAdmin` | `userController.deleteUser`      | Eliminar usuario           |
| GET    | `/api/users/locked`      | `requireAuth`, `isAdmin` | `userController.listLockedUsers` | Listar usuarios bloqueados |
| POST   | `/api/users/:id/unlock`  | `requireAuth`, `isAdmin` | `userController.unlockUser`      | Desbloquear usuario        |
| GET    | `/api/users/2fa`         | `requireAuth`, `isAdmin` | `userController.listUsers2FA`    | Estado 2FA de usuarios     |

### 4.3 Notificaciones (`/api/notifications`)

| Método |            Endpoint               |         Middleware       |                  Controller                  |            Descripción             |
|--------|-----------------------------------|--------------------------|----------------------------------------------|------------------------------------|
| GET    | `/api/notifications`              | `requireAuth`            | `notificationController.getUserNotifications`| Obtener notificaciones del usuario |
| GET    | `/api/notifications/unread-count` | `requireAuth`            | `notificationController.getUnreadCount`      | Conteo de no leídas                |
| PUT    | `/api/notifications/read-all`     | `requireAuth`            | `notificationController.markAllAsRead`       | Marcar todas como leídas           |
| PUT    | `/api/notifications/:id/read`     | `requireAuth`            | `notificationController.markAsRead`          | Marcar una como leída              |
| PUT    | `/api/notifications/:id/hide`     | `requireAuth`            | `notificationController.hideNotification`    | Ocultar notificación               |
| POST   | `/api/notifications`              | `requireAuth`, `isAdmin` | `notificationController.createNotification`  | Crear notificación                 |

**Query params soportados:**
- `limit` (default 50, max 100)
- `onlyUnread` (boolean string)
- `includeHidden` (boolean string)

**Respuestas:**
- `GET /notifications` → `{ success: true, notifications: [...] }`
- `GET /notifications/unread-count` → `{ success: true, unreadCount: N }`

### 4.4 Datos Genéricos (`/api/data`)

| Método |            Endpoint               |         Middleware       |                  Controller                  |                Descripción             |
|--------|-----------------------------------|--------------------------|----------------------------------------------|----------------------------------------|
| GET    | `/api/data`                       |    `requireAuth`         | `dataController.getData`                     | Obtener datos de tabla con filtros     |
| POST   | `/api/data`                       |    `requireAuth`         | `dataController.crudOperation`               | Insertar registro                      |
| PUT    | `/api/data`                       |    `requireAuth`         | `dataController.crudOperation`               | Actualizar registro                    |
| DELETE | `/api/data`                       |    `requireAuth`         | `dataController.crudOperation`               | Eliminar registro                      |
| POST   | `/api/data/query`                 |    `requireAuth`         | `dataController.executeQuery`                | Ejecutar consulta SELECT personalizada |
| GET    | `/api/data/schema/:table`         |    `requireAuth`         | `dataController.getTableSchema`              | Esquema de tabla                       |
| GET    | `/api/data/tables`                |    `requireAuth`         | `dataController.getTables`                   | Lista de tablas                        |

**Tabla de whitelist válida:**
```
profiles, agencies, data_connections, api_credentials,
connection_data_types, solicitudes, productos, notifications,
user_security_status, user_sessions, admin_actions,
products, reservations, system_settings, email_templates, email_log, alert_rules
```

**Parámetros de GET /data:**
- `table` (requerido) - Nombre de tabla
- `filters` (opcional) - JSON.stringify({ campo: valor })
- `limit` (opcional) - Límite de resultados
- `offset` (opcional) - Offset para paginación
- `order` (opcional) - "campo:ASC" o "campo:DESC"

### 4.5 Pedidos/Reservas (`/api/orders`)

| Método |            Endpoint               |           Middleware          |                  Controller               |            Descripción             |
|--------|-----------------------------------|-------------------------------|-------------------------------------------|------------------------------------|
| POST   | `/api/orders`                     |        `requireAuth`          | `ordersController.createReservation`      | Crear reserva temporal             |
| GET    | `/api/orders`                     |        `requireAuth`          | `ordersController.getAllReservations`     | Listar reservas (filtrado por rol) |
| GET    | `/api/orders/:id`                 |        `requireAuth`          | `ordersController.getReservationById`     | Obtener reserva por ID             |
| PUT    | `/api/orders/:id`                 | `requireAuth`, `isAdmin`      | `ordersController.updateReservation`      | Actualizar estado/info             |
| POST   | `/api/orders/:id/confirm`         | `requireAuth`, `isAdmin`      | `ordersController.confirmReservation`     | Confirmar reserva permanente       |
| POST   | `/api/orders/:id/resend-email`    |        `requireAuth`          | `ordersController.resendReservationEmail` | Reenviar email de detalle          |
| DELETE | `/api/orders/:id`                 | `requireAuth`, `isAdmin`      | `ordersController.deleteReservation`      | Eliminar reserva                   |

**Filtrado por rol en GET /orders:**
- `admin` → Todas las reservas
- `agency_admin` → Solo reservas de su agencia (`agencia = req.user.agencia`)
- `agency_user` → Solo sus propias reservas (`created_by = req.user.id`)

**Campos permitidos en UPDATE /orders/:id:**
- `estado`, `pedido_id`, `contacto_nombre`, `contacto_email`, `contacto_telefono`

### 4.6 Productos (`/api/products`)

| Método | Endpoint | Middleware | Controller | Descripción |
|--------|----------|------------|------------|-------------|
| POST   | `/api/products`  | `requireAuth`, `isAdmin` | `productsController.createProduct` | Crear producto |
| GET    | `/api/products` | `requireAuth` | `productsController.getAllProducts` | Listar productos |
| GET    | `/api/products/:id` | `requireAuth`, `isAdmin` | `productsController.getProductById` | Obtener producto por ID |
| PUT    | `/api/products/:id` | `requireAuth`, `isAdmin` | `productsController.updateProduct` | Actualizar producto |
| DELETE | `/api/products/:id` | `requireAuth`, `isAdmin` | `productsController.deleteProduct` | Eliminar producto |

**Validaciones createProduct:**
- Campos obligatorios: `codigo_cupo`, `destino`, `compania`, `disponibilidad`
- Campos opcionales: `salida`, `regreso`, `fecha_salida`, `fecha_regreso`, `precio`, `ruta`, `pnr`, `ficha`, `temporada`, `neto_1`, `op`, `carryon`, `handbag`, `checkedbag`, `inf_fare`

**Sanitización:**
- Usuarios no-admin ven respuesta sin campo `neto_1`

### 4.7 Agencias (`/api/agencies`)

| Método | Endpoint | Middleware | Controller | Descripción |
|--------|----------|------------|------------|-------------|
| GET | `/api/agencies` | `requireAuth` | `agenciesController.listAgencies` | Listar agencias |
| GET | `/api/agencies/:id` | `requireAuth` | `agenciesController.getAgency` | Obtener agencia por ID |
| POST | `/api/agencies` | `requireAuth`, `isAdmin` | `agenciesController.createAgency` | Crear agencia |
| PUT | `/api/agencies/:id` | `requireAuth`, `isAdmin` | `agenciesController.updateAgency` | Actualizar agencia |
| DELETE | `/api/agencies/:id` | `requireAuth`, `isAdmin` | `agenciesController.deleteAgency` | Eliminar agencia |

**Create/Update fields:** `code`, `name`, `email`, `address`, `color`
**Campos requeridos:** `code`, `name`

### 4.8 Ajustes del Sistema (`/api/settings`)

| Método | Endpoint | Middleware | Controller | Descripción |
|--------|----------|------------|------------|-------------|
| GET | `/api/settings` | `requireAuth`, `isAdmin` | `settingsController.listSettings` | Listar configuraciones |
| GET | `/api/settings/:key` | `requireAuth`, `isAdmin` | `settingsController.getSetting` | Obtener configuración por clave |
| PUT | `/api/settings/:key` | `requireAuth`, `isAdmin` | `settingsController.updateSetting` | Actualizar configuración |

### 4.9 Reglas de Alerta (`/api/alert-rules`)

| Método | Endpoint | Middleware | Controller | Descripción |
|--------|----------|------------|------------|-------------|
| GET | `/api/alert-rules` | `requireAuth`, `isAgencyAdminOrAdmin` | `alertRulesController.listAlertRules` | Listar reglas |
| POST | `/api/alert-rules` | `requireAuth`, `isAgencyAdminOrAdmin` | `alertRulesController.createAlertRule` | Crear regla |
| GET | `/api/alert-rules/:id` | `requireAuth`, `isAgencyAdminOrAdmin` | `alertRulesController.getAlertRuleById` | Obtener regla |
| PUT | `/api/alert-rules/:id` | `requireAuth`, `isAgencyAdminOrAdmin` | `alertRulesController.updateAlertRule` | Actualizar regla |
| DELETE | `/api/alert-rules/:id` | `requireAuth`, `isAdmin` | `alertRulesController.deleteAlertRule` | Eliminar regla |

### 4.10 Temas (`/api/themes`)

| Método | Endpoint | Middleware | Controller | Descripción |
|--------|----------|------------|------------|-------------|
| POST | `/api/themes` | `requireAuth`, `isAdmin` | `themesController.createTheme` | Crear tema |
| GET | `/api/themes` | `requireAuth`, `isAdmin` | `themesController.getAllThemes` | Listar temas |
| GET | `/api/themes/:id` | `requireAuth`, `isAdmin` | `themesController.getThemeById` | Obtener tema |
| PUT | `/api/themes/:id` | `requireAuth`, `isAdmin` | `themesController.updateTheme` | Actualizar tema |
| DELETE | `/api/themes/:id` | `requireAuth`, `isAdmin` | `themesController.deleteTheme` | Eliminar tema |

### 4.11 Salud y Interna

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check de la API |
| POST | `/internal/cron/expirar-bloqueos` | Cron interno (requiere token especial) |

---

## 5. Middlewares de Autenticación

### `requireAuth`
- Verifica header `Authorization: Bearer <token>`
- Decodifica JWT usando `JWT_SECRET`
- Asigna `req.user` con payload decoded
- Si falla → 401 Unauthorized

### `isAdmin`
- Requiere `requireAuth` primero
- Verifica `req.user.role === 'admin'`
- Si no → 403 Forbidden

### `isAgencyAdminOrAdmin`
- Requiere `requireAuth` primero
- Permite `role === 'admin'` O `role === 'agency_admin'`
- Si no → 403 Forbidden

### `requireInternalToken`
- Verifica header específico definido en `.env` (ej: `INTERNAL_API_KEY`)
- Para endpoints internos/cron que no requieren usuario autenticado

---

## 6. Frontend Services - Mapeo Completo

### ApiClient (`services/apiClient.js`)
- **Base URL:** `import.meta.env.VITE_API_URL` o `'http://localhost:5001/api'`
- **Token:** almacenado en `localStorage.api_token`
- **Métodos estáticos:**
  - `get(endpoint)` → `fetch(url, { method: 'GET' })`
  - `post(endpoint, body)` → `fetch(url, { method: 'POST', body: JSON.stringify(body) })`
  - `put(endpoint, body)` → `fetch(url, { method: 'PUT', body: JSON.stringify(body) })`
  - `delete(endpoint)` → `fetch(url, { method: 'DELETE' })`
- **Error handling:** Lanza `Error(data.error || data.message)` si response no ok

### AuthService (`services/authService.js`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `login(email, password)` | `POST /api/auth/login` | Autentica, guarda token + user en localStorage |
| `logout()` | N/A | Limpia localStorage |

### UserService (`services/userService.js`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `listUsers(params)` | `GET /api/users` | Lista todos los usuarios |
| `getUserById(id)` | `GET /api/users/:id` | ⚠️ NO EXISTE en backend |
| `createUser(payload)` | `POST /api/users` | Crea usuario |
| `updateUser(id, payload)` | `PUT /api/users/:id` | Actualiza usuario |
| `deleteUser(id)` | `DELETE /api/users/:id` | Elimina usuario |
| `unlockUser(id)` | `POST /api/users/:id/unlock` | Desbloquea usuario |
| `toggleTwoFactor(id, enabled)` | `PUT /api/users/:id/2fa` | ⚠️ NO EXISTE en backend |

### ReservationService (`services/reservationService.js`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `listReservations(params)` | `GET /api/orders` | Lista reservas |
| `getReservationById(id)` | `GET /api/orders/:id` | Obtiene reserva |
| `createReservation(payload)` | `POST /api/orders` | Crea reserva temporal |
| `updateReservation(id, payload)` | `PUT /api/orders/:id` | Actualiza reserva |
| `confirmReservation(id)` | `POST /api/orders/:id/confirm` | Confirma reserva |
| `deleteReservation(id)` | `DELETE /api/orders/:id` | Elimina reserva |
| `resendReservationEmail(id)` | `POST /api/orders/:id/resend-email` | Reenvía email |
| `getAvailability()` | `GET /api/products` | Obtiene cupos disponibles |
| `getRequests()` | `GET /api/orders` | Solicitudes/pedidos |
| `getConfirmations()` | `GET /api/data?table=reservations&filters=...` | Reservas confirmadas |
| `submitReservation(payload)` | `POST /api/orders` | Envía nueva reserva |
| `generatePedidoId()` | N/A | Genera `PED-{year}-{random}` |
| `validateAvailability(vuelo, pasajeros)` | N/A | Valida cupos locales |

### AgencyService (`services/agencyService.js`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `listAgencies(params)` | `GET /api/agencies` | Lista agencias |
| `getAgencyById(id)` | `GET /api/agencies/:id` | ⚠️ NO EXISTE en backend |
| `createAgency(payload)` | `POST /api/agencies` | Crea agencia |
| `updateAgency(id, payload)` | `PUT /api/agencies/:id` | Actualiza agencia |
| `deleteAgency(id)` | `DELETE /api/agencies/:id` | Elimina agencia |
| `uploadLogo(agencyId, file)` | `POST /api/agencies/:id/logo` | ⚠️ NO EXISTE en backend |

### ProductService (`services/productService.js`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getProducts()` | `GET /api/products` | Lista productos |
| `createProduct(payload)` | `POST /api/products` | Crea producto |
| `updateProduct(id, payload)` | `PUT /api/products/:id` | Actualiza producto |
| `deleteProduct(id)` | `DELETE /api/products/:id` | Elimina producto |

### NotificationService (`services/notificationService.js`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getUserNotifications(params)` | `GET /api/notifications` | Notificaciones del usuario |
| `getUnreadCount()` | `GET /api/notifications/unread-count` | Conteo no leídas |
| `markAsRead(notificationId)` | `PUT /api/notifications/:id/read` | Marca como leída |
| `markAllAsRead()` | `PUT /api/notifications/read-all` | Marca todas como leídas |
| `hideNotification(notificationId)` | `PUT /api/notifications/:id/hide` | Oculta notificación |
| `createNotification(payload)` | `POST /api/notifications` | Crea notificación (admin) |

---

## 7. Páginas del Frontend y Servicios Utilizados

### Dashboard
- `ReservationService.getAvailability()` → `GET /api/products`
- Estadísticas generales

### Availability (Disponibilidad)
- `ReservationService.getAvailability()` → `GET /api/products`
- Tabla de cupos con badges de disponibilidad
- Botón refresco

### Requests (Solicitudes)
- `ReservationService.getRequests()` → `GET /api/orders`
- Tabla de pedidos/solicitudes pendientes

### Confirmations (Confirmaciones)
- `ReservationService.getConfirmations()` → `GET /api/data?table=reservations&filters={"Estado":"Confirmado"}`
- Filtra solo reservas confirmadas

### GestionUsuarios
- `UserService.listUsers()` → `GET /api/users`
- `UserService.createUser(payload)` → `POST /api/users`
- `UserService.updateUser(id, payload)` → `PUT /api/users/:id`
- `UserService.deleteUser(id)` → `DELETE /api/users/:id`
- `UserService.unlockUser(id)` → `POST /api/users/:id/unlock`
- Form fields: `email`, `nombre`, `apellido`, `agencia`, `role`, `telefono`

### GestionReservas
- `ReservationService.listReservations()` → `GET /api/orders`
- `ReservationService.createReservation(payload)` → `POST /api/orders`
- `ReservationService.updateReservation(id, payload)` → `PUT /api/orders/:id`
- `ReservationService.deleteReservation(id)` → `DELETE /api/orders/:id`
- `ReservationService.confirmReservation(id)` → `POST /api/orders/:id/confirm`
- `ReservationService.resendReservationEmail(id)` → `POST /api/orders/:id/resend-email`
- Form fields: `pedido_id`, `agencia`, `contacto_nombre`, `contacto_email`, `contacto_telefono`, `vuelo_codigo`, `vuelo_destino`, `vuelo_compania`, `vuelo_salida`, `nombre_pasajero`, `apellido_pasajero`, `documento_pasajero`, `estado`, `precio_venta`, `neto_1`

### GestionAgencias
- `AgencyService.listAgencies()` → `GET /api/agencies`
- `AgencyService.createAgency(payload)` → `POST /api/agencies`
- `AgencyService.updateAgency(id, payload)` → `PUT /api/agencies/:id`
- `AgencyService.deleteAgency(id)` → `DELETE /api/agencies/:id`
- Form fields: `code`, `name`, `email`, `phone`, `address`, `website`, `logo_url`, `main_color`, `text_color`, `is_active`

### Products (Productos)
- `ProductService.getProducts()` → `GET /api/products`
- `ProductService.createProduct(payload)` → `POST /api/products`
- `ProductService.updateProduct(id, payload)` → `PUT /api/products/:id`
- `ProductService.deleteProduct(id)` → `DELETE /api/products/:id`

### Notificaciones
- `NotificationService.getUserNotifications()` → `GET /api/notifications`
- `NotificationService.getUnreadCount()` → `GET /api/notifications/unread-count`
- `NotificationService.markAsRead(id)` → `PUT /api/notifications/:id/read`
- `NotificationService.markAllAsRead()` → `PUT /api/notifications/read-all`
- `NotificationService.hideNotification(id)` → `PUT /api/notifications/:id/hide`
- `NotificationService.createNotification(payload)` → `POST /api/notifications`

### Settings
- Configuración local del usuario

---

## 8. Flujo de Autenticación

1. Usuario ingresa email/password en Login.jsx
2. `AuthService.login()` llama `POST /api/auth/login`
3. Backend verifica credenciales, checks lock status, genera JWT
4. Frontend guarda token en localStorage + user session
5. Cada petición posterior incluye `Authorization: Bearer <token>` vía ApiClient
6. `ProtectedRoute` verifica autenticación antes de renderizar páginas
7. `AdminRoute` verifica `user.role === 'admin'` para rutas de admin

---

## 9. Roles y Permisos

| Rol | Acceso |
|-----|--------|
| `admin` | Todo acceso. Puede CRUD usuarios, productos, agencias, configuraciones. Ve todas las reservas. |
| `agency_admin` | Acceso a su propia agencia. Puede crear alert rules, ver reservas de su agencia. |
| `agency_user` | Solo sus propias reservas. Acceso básico a funcionalidades. |

---

## 10. Tablas de Base de Datos

### `auth.users`
- `id` (UUID, PK)
- `email` (unique)
- `encrypted_password`
- `created_at`, `updated_at`

### `public.profiles`
- `id` (UUID, FK → auth.users)
- `email`
- `nombre`
- `agencia`
- `admin` (boolean)
- `role` (enum: admin, agency_admin, agency_user)
- `created_at`, `updated_at`

### `public.agencies`
- `id` (serial, PK)
- `code` (varchar, unique)
- `name` (varchar)
- `email` (varchar)
- `address` (varchar)
- `color` (varchar)

### `public.products`
- `id` (serial, PK)
- `codigo_cupo` (varchar)
- `destino` (varchar)
- `compania` (varchar)
- `disponibilidad` (integer)
- `salida`, `regreso`
- `fecha_salida`, `fecha_regreso`
- `precio` (decimal)
- `ruta`, `pnr`, `ficha`, `temporada`
- `neto_1`, `op`, `carryon`, `handbag`, `checkedbag`, `inf_fare`

### `public.reservations`
- `id` (serial, PK)
- `product_id` (FK → products)
- `pedido_id` (varchar)
- `agencia` (varchar)
- `contacto_nombre`, `contacto_email`, `contacto_telefono`
- `vuelo_codigo`, `vuelo_destino`, `vuelo_compania`, `vuelo_salida`
- `nombre_pasajero`, `apellido_pasajero`, `documento_pasajero`
- `estado` (enum)
- `precio_venta`, `neto_1`
- `created_by` (FK → auth.users)
- `created_at`, `updated_at`

### `public.notifications`
- `id` (uuid, PK)
- `type`, `title`, `message`, `icon`, `color`, `priority`
- `target_user_id`, `target_role`
- `data` (jsonb)
- `is_read`, `is_hidden`
- `created_by`, `created_at`

### `public.system_settings`
- `key` (varchar, PK)
- `value` (jsonb)
- `updated_at`

### `public.user_security_status`
- `user_id` (UUID, PK)
- `failed_attempts_count`
- `is_locked`
- `locked_until`
- `last_login`, `total_logins`

### `public.user_sessions`
- `id` (serial, PK)
- `user_id`, `session_token`, `ip_address`, `user_agent`, `expires_at`

### `public.alert_rules`
- Configuraciones de alertas para productos/reservas

---

## 11. Funciones PostgreSQL Personalizadas

- `get_user_notifications(userId, limit, onlyUnread, includeHidden)` → Tabla de notificaciones
- `get_unread_notifications_count(userId)` → Integer
- `mark_notification_read(userId, notificationId, isRead)` → void
- `mark_all_notifications_read(userId)` → Integer (contaje)
- `hide_notification(userId, notificationId, isHidden)` → void
- `check_and_update_lock_status(userId, email)` → SecurityStatus row
- `log_login_attempt(...)` → void
- `sanitize_sensitive_field(value, field, table, userRole)` → value

---

## 12. Medidas de Seguridad

### Backend
- **JWT Authentication** en todos los endpoints protegidos
- **RBAC** (Role-Based Access Control) con middlewares
- **SQL Injection Prevention** con parameterized queries y validación de nombres de tabla/campo
- **Password Hashing** con bcryptjs (salt rounds: 10)
- **Rate Limiting de Login** via bloqueo temporal por intentos fallidos
- **Session Tracking** en tabla user_sessions
- **CORS** permitido con origin: '*' (ajustar en producción)
- **Data Sanitization** - Usuarios no-admin no ven `neto_1` en sensitive tables

### Frontend
- **Token storage** en localStorage
- **Protected Routes** con componentes ProtectedRoute/AdminRoute
- **Auto-logout** al limpiar localStorage

---

## 13. Troubleshooting

### Error: "Cannot access 'paramIndex' before initialization"
- Causa: Variable declarada dos veces en dataController.js
- Solución: Declarar una sola vez fuera del try block

### Error: "Failed to resolve import '../services/...'"
- Causa: Ruta relativa incorrecta desde archivo en directorio anidado
- Solución: Usar `../../services/` desde `components/ui/`

### Error: "logout is not defined"
- Causa: useAuth() retorna { user, logout } pero solo se desestructura user
- Solución: `const { user, logout } = useAuth()`

### Notificaciones returning 0 count
- Causa: Servicio lee `result.count` pero backend devuelve `unreadCount`
- Solución: Corregir a `result.unreadCount`

### Frontend no carga datos
- Verificar: `VITE_API_URL` en `.env` del frontend apunta al backend correcto
- Verificar: Token JWT vigente en localStorage
- Verificar: Roles del usuario tienen permisos para el endpoint

---

## 14. Instrucciones de Instalación

### Backend
```bash
cd backend
cp .env.example .env  # Editar variables de entorno
npm install
npm run dev  # Usa nodemon para auto-restart
```

### Frontend
```bash
cd frontend
cp .env.example .env  # Configurar VITE_API_URL
npm install
npm run dev
```

### Variables de Entorno Backend (.env)
```
PORT=5001
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=24h
INTERNAL_API_KEY=clave_para_endpoints_internos
```

### Variables de Entorno Frontend (.env)
```
VITE_API_URL=http://localhost:5001/api
```

---

## 15. Diagrama de Arquitectura

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│  PostgreSQL  │
│   (React 18) │  HTTP   │  (Express)   │  SQL    │   (DB)       │
│   :3000/5173 │◀────────▶│   :5001     │◀────────▶│              │
└──────────────┘         └──────────────┘         └──────────────┘
      │                                             │
      │ localStorage                              │ Tablas:
      │ - api_token                               │   - auth.users
      │ - api_user                                │   - profiles
      │                                           │   - agencies
      │                                           │   - products
      │                                           │   - reservations
      │                                           │   - notifications
      └───────────────────────────────────────────┘
```

---

## 16. Resumen de Discrepancias Detectadas (Frontend → Backend)

### ⚠️ CRÍTICO: `NotificationService.getUnreadCount()`
- **Problema:** Backend devuelve `{ success: true, unreadCount: N }` pero frontend lee `result.count || 0`
- **Impacto:** Badge de notificaciones siempre muestra 0
- **Archivo:** `frontend/src/services/notificationService.js:20-21`
- **Corrección:** Cambiar `result.count` → `result.unreadCount`

### ⚠️ ALTO: `NotificationService.getUserNotifications()`
- **Problema:** Backend devuelve `{ success: true, notifications: [...] }` pero frontend espera `Array.isArray(result)` o `result.data`
- **Impacto:** Notificaciones nunca se muestran
- **Archivo:** `frontend/src/services/notificationService.js:9`
- **Corrección:** Leer `result.notifications` en lugar de `result.data`

### ⚠️ MEDIO: `UserService.getUserById(id)` y `toggleTwoFactor(id, enabled)`
- **Problema:** Estos métodos existen en frontend pero NO hay endpoints correspondientes en backend
- **Endpoints ausentes:** `GET /api/users/:id`, `PUT /api/users/:id/2fa`
- **Nota:** `GET /api/users` ya filtra por `isAdmin`, así que obtener usuario individual no está implementado
- **Acción:** Eliminar o implementar según necesidad

### ⚠️ MEDIO: `AgencyService.getAgencyById(id)` y `uploadLogo(agencyId, file)`
- **Problema:** Existen en frontend pero NO en backend
- **Endpoints ausentes:** `GET /api/agencies/:id` (SÍ existe en backend!), `POST /api/agencies/:id/logo` (NO existe)
- **Nota:** `GET /api/agencies/:id` SÍ existe en `agenciesController.js` y está registrado en `index.js`
- **Acción:** Eliminar `uploadLogo` o implementar endpoint si es necesario

### ℹ️ INFO: `ReservationService.refreshCache()`
- **Problema:** `Availability.jsx:38` llama `ReservationService.refreshCache?.()` pero este método no existe en el service
- **Impacto:** No crítico, el optional chaining `?.` previene error
- **Acción:** Eliminar llamada o implementar si se necesita funcionalidad de cache

### ℹ️ INFO: Campos de formulario
- **GestionUsuarios** envía `apellido` que puede no estar en la tabla `profiles`
- **GestionAgencias** envía `phone`, `website`, `logo_url`, `main_color`, `text_color`, `is_active` que NO están en INSERT/UPDATE de agenciesController (solo espera `code`, `name`, `email`, `address`, `color`)
- **GestionReservas** envía `neto_1` en update que puede ser restringido por roles

---

## 12. Plan de Implementación: Marca Blanca Profesional + Chat IA

### 12.1 Resumen Ejecutivo

El plan detallado se encuentra en [`plans/WHITE_LABEL_AI_CHAT_PLAN.md`](plans/WHITE_LABEL_AI_CHAT_PLAN.md). A continuación se presenta un resumen de las dos fases principales.

### 12.2 Fase 1: Sistema de Marca Blanca Profesional

**Objetivo:** Permitir que cada agencia personalice completamente la apariencia del sistema, incluyendo colores, tipografías, botones, logos, emails y más.

#### Nuevas Tablas de Base de Datos
| Tabla | Descripción |
|-------|-------------|
| `white_label_configs` | Configuración completa por agencia (colores, tipografías, botones, layout, emails, legal) |
| `font_presets` | Presets de combinaciones de fuentes (Moderno, Elegante, Corporativo, etc.) |
| `button_presets` | Presets de estilos de botones (Flat, Rounded, Shadowed, Outlined, Gradient, Glass) |
| `theme_presets` | Temas predefinidos (Corporativo Azul, Bosque Verde, Oscuro Clásico, etc.) |

#### Nuevos Endpoints
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/white-label` | Listar configs (admin) |
| GET | `/api/white-label/:agencyId` | Obtener config de agencia |
| POST | `/api/white-label` | Crear config nueva (admin) |
| PUT | `/api/white-label/:id` | Actualizar config (admin) |
| DELETE | `/api/white-label/:id` | Eliminar config (admin) |
| GET | `/api/white-label/presets` | Obtener presets disponibles |
| GET | `/api/white-label/fonts` | Obtener fuentes disponibles |
| POST | `/api/white-label/preview` | Generar preview de tema |
| POST | `/api/white-label/export/:id` | Exportar config como JSON |
| POST | `/api/white-label/import` | Importar config desde JSON |

#### Nuevos Componentes Frontend
| Componente | Descripción |
|------------|-------------|
| `pages/WhiteLabelConfig.jsx` | Panel de configuración completo con tabs |
| `components/ThemePreview.jsx` | Preview en tiempo real |
| `components/ColorPicker.jsx` | Selector de colores avanzado |
| `components/FontSelector.jsx` | Selector de fuentes con preview |
| `components/ButtonStyler.jsx` | Configurador de botones |
| `components/ThemeImporter.jsx` | Import/Export de configs |
| `hooks/useWhiteLabel.js` | Hook para aplicar CSS variables |
| `providers/ThemeProvider.jsx` | Provider React para temas |

### 12.3 Fase 2: Chat IA Integrado

**Objetivo:** Asistente de IA en esquina inferior izquierda capaz de realizar acciones automáticas (crear reservas, listar usuarios, generar reportes, etc.) con configuración multi-proveedor.

#### Nuevas Tablas de Base de Datos
| Tabla | Descripción |
|-------|-------------|
| `ai_providers` | Proveedores de IA (OpenAI, Anthropic, Google, Azure, Local) |
| `ai_chat_sessions` | Sesiones de chat por usuario |
| `ai_chat_messages` | Mensajes de cada sesión |
| `ai_actions` | Acciones que la IA puede ejecutar |

#### Proveedores Soportados
| Proveedor | Modelo por Defecto |
|-----------|-------------------|
| OpenAI | gpt-4o |
| Anthropic | claude-sonnet-4-20250514 |
| Google AI | gemini-2.5-pro |
| Azure OpenAI | gpt-4o |
| Modelo Local | llama-3 |

#### Acciones Predefinidas de IA
| Acción | Categoría | Requiere Confirmación |
|--------|-----------|----------------------|
| `create_reservation` | Reservas | Sí |
| `list_reservations` | Reservas | No |
| `confirm_reservation` | Reservas | Sí |
| `cancel_reservation` | Reservas | Sí |
| `create_user` | Usuarios | Sí |
| `list_users` | Usuarios | No |
| `create_product` | Productos | Sí |
| `list_products` | Productos | No |
| `generate_report` | Reportes | No |

#### Nuevos Endpoints
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ai/providers` | Listar proveedores |
| POST | `/api/ai/providers` | Configurar proveedor (admin) |
| PUT | `/api/ai/providers/:id` | Actualizar proveedor (admin) |
| GET | `/api/ai/actions` | Listar acciones disponibles |
| POST | `/api/ai/chat` | Enviar mensaje al chat |
| POST | `/api/ai/chat/stream` | Streaming de respuesta |
| POST | `/api/ai/execute` | Ejecutar acción (via tool) |
| GET | `/api/ai/sessions` | Listar sesiones del usuario |
| DELETE | `/api/ai/sessions/:id` | Eliminar sesión |

#### Nuevos Componentes Frontend
| Componente | Descripción |
|------------|-------------|
| `pages/AIConfig.jsx` | Configuración de proveedores de IA |
| `components/AIChat/AIChatWidget.jsx` | Widget flotante (esquina inferior izquierda) |
| `components/AIChat/AIChatWindow.jsx` | Ventana de chat completa |
| `components/AIChat/AIChatInput.jsx` | Input de texto con autocompletado |
| `components/AIChat/AIChatMessage.jsx` | Renderizado de mensajes con markdown |
| `components/AIChat/AIChatActions.jsx` | Acciones rápidas predefinidas |

### 12.4 Plan de Sprints

| Sprint | Duración | Entregable |
|--------|----------|------------|
| 1 | 3-4 días | Base de Marca Blanca (DB, backend, servicio, página) |
| 2 | 2-3 días | Sistema de Temas (ThemeProvider, CSS variables, Tailwind) |
| 3 | 3-4 días | Base de Chat IA (DB, backend, tools, servicio) |
| 4 | 3-4 días | UI de Chat IA (Widget, Window, Input, Message) |
| 5 | 2-3 días | Funcionalidades Avanzadas (Function calling, acciones, streaming) |
| 6 | 1-2 días | Configuración de IA (AIConfig, API keys, test, modelo) |

### 12.5 Arquitectura del Sistema

```
Frontend                          Backend                        Database
─────────                         ──────                         ────────
AIChatWidget ──────────────► AIController ──────────────► ai_providers
AIChatWindow                 ├── AI Providers              ai_chat_sessions
AIChatInput                  ├── AI Actions                ai_chat_messages
AIChatMessage                └── AI Sessions               ai_actions
AIChatActions
                              WhiteLabelController ──────► white_label_configs
WhiteLabelConfig             ├── Theme Presets              theme_presets
ThemePreview                 └── Font/Button Presets        font_presets
ColorPicker                                                   button_presets
FontSelector
ButtonStyler
ThemeProvider ──────────────► CSS Variables ────────────► (aplicadas en :root)
```

### 12.6 Seguridad

1. **API Keys**: Encriptar con bcrypt/crypto antes de guardar
2. **Permisos**: Solo admin puede configurar proveedores de IA
3. **Rate Limiting**: Implementar por proveedor
4. **Audit Log**: Registrar todas las acciones ejecutadas por IA
5. **Data Retention**: Configurable para mensajes de chat

### 12.7 Archivos a Crear

#### Backend (Nuevos)
- `backend/src/controllers/whiteLabelController.js`
- `backend/src/controllers/aiController.js`
- `backend/src/services/aiService.js`
- `backend/src/tools/reservationTools.js`
- `backend/src/tools/userTools.js`
- `backend/src/tools/productTools.js`
- `backend/src/tools/agencyTools.js`
- `backend/src/tools/reportTools.js`

#### Frontend (Nuevos)
- `frontend/src/pages/WhiteLabelConfig.jsx`
- `frontend/src/pages/AIConfig.jsx`
- `frontend/src/components/AIChat/AIChatWidget.jsx`
- `frontend/src/components/AIChat/AIChatWindow.jsx`
- `frontend/src/components/AIChat/AIChatInput.jsx`
- `frontend/src/components/AIChat/AIChatMessage.jsx`
- `frontend/src/components/AIChat/AIChatActions.jsx`
- `frontend/src/components/ThemePreview.jsx`
- `frontend/src/components/ColorPicker.jsx`
- `frontend/src/components/FontSelector.jsx`
- `frontend/src/components/ButtonStyler.jsx`
- `frontend/src/hooks/useWhiteLabel.js`
- `frontend/src/providers/ThemeProvider.jsx`
- `frontend/src/services/whiteLabelService.js`
- `frontend/src/services/aiService.js`

#### Database (Nuevas migraciones)
- `backend/migrations/20250101_create_white_label_tables.sql`
- `backend/migrations/20250102_create_ai_tables.sql`
- `backend/migrations/20250103_seed_theme_presets.sql`
- `backend/migrations/20250104_seed_font_presets.sql`
- `backend/migrations/20250105_seed_button_presets.sql`
- `backend/migrations/20250106_seed_ai_providers.sql`
- `backend/migrations/20250107_seed_ai_actions.sql`
