# 📋 Documentación Completa - Sistema de Gestión de Cupos

## 🗂️ Tabla de Contenidos

1. [Descripción General](#descripcion-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#tecnologias-utilizadas)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Módulos y Funcionalidades](#modulos-y-funcionalidades)
6. [Base de Datos](#base-de-datos)
7. [API REST](#api-rest)
8. [Autenticación y Autorización](#autenticacion-y-autorizacion)
9. [Instalación y Configuración](#instalacion-y-configuracion)
10. [Guía de Uso](#guia-de-uso)
11. [Seguridad](#seguridad)
12. [Solución de Problemas](#solucion-de-problemas)

---

## Descripción General

El **Sistema de Gestión de Cupos** es una plataforma web integral para la administración de reservas, productos, agencias y usuarios en el contexto de una agencia de viajes. Permite gestionar cupos disponibles, confirmar reservas, administrar usuarios con diferentes roles y personalizar la configuración de cada agencia.

### Características Principales

- ✅ Dashboard con resumen de actividad
- ✅ Visualización de disponibilidad de cupos
- ✅ Gestión de solicitudes de reserva
- ✅ Confirmación de reservas con envío de emails
- ✅ Administración de productos/cupos
- ✅ Gestión de agencias con branding personalizado
- ✅ Administración de usuarios y roles
- ✅ Panel de notificaciones
- ✅ Configuración del sistema
- ✅ Interfaz responsive con modo oscuro/claro

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard│  │Availability│ │Requests  │  │Products  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Confirm.  │  │Agencies  │  │Users     │  │Reservations│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                     │            │            │             │
│                 ┌───┴────────────┴────────────┴──────────┐ │
│                 │          Services & API Client          │ │
│                 └──────────────────────┬─────────────────┘ │
└────────────────────────────────────────┼───────────────────┘
                                         │ HTTP/REST
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND (Express.js)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Auth MVC  │  │User Ctrl │  │Product  │  │Agency    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Data Ctrl │  │Notif.Ctrl│  │Order Ctrl│  │Setting   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Middleware (Auth, Validation)          │    │
│  └────────────────────────────────────────────────────┘    │
│                                 │                          │
└─────────────────────────────────┼──────────────────────────┘
                                  │ SQL
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS (PostgreSQL)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ users    │  │ agencies │  │ products │  │ reservations│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ settings │  │notifications│ │ orders  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Tecnologías Utilizadas

### Frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | Framework UI principal |
| React Router | 6.x | Routing y navegación |
| Tailwind CSS | 3.x | Estilos utility-first |
| Lucide React | Latest | Íconos |
| SweetAlert2 | Latest | Modal de confirmación |
| clsx | Latest | Clases condicionales |

### Backend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 18+ | Runtime JavaScript |
| Express.js | 4.x | Framework web |
| PostgreSQL | 14+ | Base de datos relacional |
| pg | Latest | Driver PostgreSQL |
| JWT | Latest | Autenticación token |
| bcryptjs | Latest | Hash de contraseñas |
| nodemailer | Latest | Envío de emails |
| dotenv | Latest | Variables de entorno |

---

## Estructura del Proyecto

```
form-cupos/
├── frontend/                    # Aplicación React
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── ui/            # Componentes UI base
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Dialog.jsx
│   │   │   │   ├── DropdownMenu.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Table.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── ...
│   │   │   ├── Layout.jsx      # Layout principal
│   │   │   ├── AdminRoute.jsx  # Rutas protegidas admin
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/           # React Context
│   │   │   └── AuthContext.jsx # Contexto de autenticación
│   │   ├── pages/              # Páginas de la app
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Availability.jsx
│   │   │   ├── Requests.jsx
│   │   │   ├── Confirmations.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── GestionAgencias.jsx
│   │   │   ├── GestionUsuarios.jsx
│   │   │   ├── GestionReservas.jsx
│   │   │   ├── Notificaciones.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Login.jsx
│   │   ├── services/           # Servicios API
│   │   │   ├── apiClient.js
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── productService.js
│   │   │   ├── agencyService.js
│   │   │   ├── reservationService.js
│   │   │   └── notificationService.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/                     # Servidor Express
│   ├── src/
│   │   ├── controllers/        # Controladores
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── productController.js
│   │   │   ├── agenciesController.js
│   │   │   ├── dataController.js
│   │   │   ├── notificationController.js
│   │   │   └── ...
│   │   ├── middleware/         # Middleware
│   │   │   └── auth.js
│   │   ├── services/           # Servicios
│   │   │   ├── emailService.js
│   │   │   └── reservationService.js
│   │   ├── db.js              # Config. conexión DB
│   │   └── index.js           # Punto de entrada
│   └── package.json
│
├── database/                    # Scripts SQL
│   └── schema.sql
│
└── docs/                        # Documentación
    └── DOCUMENTACION_COMPLETA.md
```

---

## Módulos y Funcionalidades

### 1. 🔐 Autenticación

**Archivo:** `frontend/src/contexts/AuthContext.jsx`

- Login con email y contraseña
- Sesión persistente con localStorage
- Logout y limpieza de sesión
- Contexto global con `useAuth()` hook

**Endpoints:**
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil actual

### 2. 🏠 Dashboard

**Archivo:** `frontend/src/pages/Dashboard.jsx`

- Vista general del sistema
- Estadísticas de reservas, productos y agencias
- Accesos rápidos

### 3. 📅 Disponibilidad

**Archivo:** `frontend/src/pages/Availability.jsx`

- Vista de cupos disponibles
- Filtrado por fecha y destino
- Tabla con información de disponibilidad

### 4. 📝 Solicitudes

**Archivo:** `frontend/src/pages/Requests.jsx`

- Lista de solicitudes de reserva
- Estados: Pendiente, Confirmado, Rechazado
- Acción de aprobar/rechazar

### 5. ✅ Confirmaciones

**Archivo:** `frontend/src/pages/Confirmations.jsx`

- Reservas confirmadas
- Historial de confirmaciones
- Reenvío de emails de confirmación

### 6. 📦 Productos/Cupos

**Archivo:** `frontend/src/pages/Products.jsx`

CRUD completo de productos:
- **Crear:** Código de cupo, destino, compañía, disponibilidad, fechas, precio
- **Leer:** Tabla con búsqueda por código, destino o compañía
- **Actualizar:** Modificar cualquier campo
- **Eliminar:** Con confirmación

**Campos del formulario:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Código Cupo | text | ✅ |
| Destino | text | ✅ |
| Compañía | text | ✅ |
| Disponibilidad | number | ✅ |
| Fecha Salida | date | - |
| Fecha Regreso | date | - |
| Precio | number | - |
| Ruta | text | - |
| PNR | text | - |
| Ficha | text | - |
| Temporada | text | - |

### 7. 🏢 Gestión de Agencias

**Archivo:** `frontend/src/pages/GestionAgencias.jsx`

CRUD de agencias con branding personalizado:
- **Crear/Editar:** Código, nombre, email, teléfono, dirección, sitio web, logo, colores, estado activo
- **Listar:** Tabla con código, nombre, email, teléfono, estado
- **Eliminar:** Con confirmación

**Campos del formulario:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Código | text | ✅ |
| Nombre | text | ✅ |
| Email | email | - |
| Teléfono | tel | - |
| Dirección | textarea | - |
| Sitio Web | url | - |
| URL del Logo | url | - |
| Color Principal | color | - |
| Color de Texto | color | - |
| Activa | checkbox | ✅ |

### 8. 👥 Gestión de Usuarios

**Archivo:** `frontend/src/pages/GestionUsuarios.jsx`

CRUD de usuarios con roles:
- **Admin:** Acceso total al sistema
- **Admin de Agencia:** Gestión de su agencia
- **Usuario de Agencia:** Acceso limitado

**Funcionalidades:**
- Crear usuario con email, nombre, apellido, teléfono, agencia, rol
- Editar información de usuario
- Eliminar usuario (con confirmación)
- Desbloquear cuenta bloqueada
- Indicador de estado (activo/bloqueado)

**Campos del formulario:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Email | email | ✅ |
| Nombre | text | ✅ |
| Apellido | text | - |
| Teléfono | tel | - |
| Agencia | select | - |
| Rol | select | ✅ |

### 9. 🎫 Gestión de Reservas

**Archivo:** `frontend/src/pages/GestionReservas.jsx`

Administración completa de reservas:
- **Confirmar reserva:** Cambio de estado a "confirmado"
- **Reenviar email:** Re-enviar email de confirmación
- **Eliminar:** Con confirmación

**Estados de reserva:**
| Estado | Descripción |
|--------|-------------|
| Bloqueo Temporal | Reserva temporalmente retenida |
| Procesando | En proceso de confirmación |
| Confirmado | Reserva confirmada |
| Completado | Viaje completado |
| Cancelado | Reserva cancelada |

**Campos del formulario:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| ID Pedido | text | ✅ |
| Agencia | text | ✅ |
| Contacto | text | ✅ |
| Email Contacto | email | ✅ |
| Teléfono Contacto | tel | - |
| Código Vuelo | text | ✅ |
| Destino | text | ✅ |
| Compañía | text | ✅ |
| Fecha Salida | date | ✅ |
| Nombre Pasajero | text | ✅ |
| Apellido Pasajero | text | ✅ |
| Documento Pasajero | text | ✅ |
| Estado | select | ✅ |
| Precio Venta | number | ✅ |
| Neto | number | ✅ |

### 10. 🔔 Notificaciones

**Archivo:** `frontend/src/pages/Notificaciones.jsx`

- Lista de notificaciones del sistema
- Marcar como leídas
- Marcar todas como leídas
- Contador de no leídas (en dropdown del sidebar)
- Ocultar notificaciones

### 11. ⚙️ Configuración

**Archivo:** `frontend/src/pages/Settings.jsx`

- Configuración general del sistema
- Ajustes de notificación
- Preferencias de interfaz
- Opciones administrativas

---

## Base de Datos

### Esquema Principal

#### Tabla: `users`
```sql
- id: UUID (PK)
- email: VARCHAR UNIQUE
- password_hash: VARCHAR
- nombre: VARCHAR
- apellido: VARCHAR
- agencia_id: FK → agencies
- role: VARCHAR (admin, agency_admin, agency_user)
- telefono: VARCHAR
- security_status: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Tabla: `agencies`
```sql
- id: UUID (PK)
- code: VARCHAR UNIQUE
- name: VARCHAR
- email: VARCHAR
- phone: VARCHAR
- address: TEXT
- website: VARCHAR
- logo_url: VARCHAR
- main_color: VARCHAR
- text_color: VARCHAR
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Tabla: `products`
```sql
- id: UUID (PK)
- codigo_cupo: VARCHAR
- destino: VARCHAR
- compania: VARCHAR
- disponibilidad: INTEGER
- fecha_salida: DATE
- fecha_regreso: DATE
- precio: DECIMAL
- ruta: VARCHAR
- pnr: VARCHAR
- ficha: VARCHAR
- temporada: VARCHAR
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Tabla: `reservations`
```sql
- id: UUID (PK)
- pedido_id: VARCHAR
- agencia_id: FK → agencies
- contacto_nombre: VARCHAR
- contacto_email: VARCHAR
- contacto_telefono: VARCHAR
- vuelo_codigo: VARCHAR
- vuelo_destino: VARCHAR
- vuelo_compania: VARCHAR
- vuelo_salida: TIMESTAMP
- nombre_pasajero: VARCHAR
- apellido_pasajero: VARCHAR
- documento_pasajero: VARCHAR
- estado: VARCHAR
- precio_venta: DECIMAL
- neto_1: DECIMAL
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Tabla: `notifications`
```sql
- id: UUID (PK)
- user_id: FK → users
- title: VARCHAR
- message: TEXT
- type: VARCHAR
- is_read: BOOLEAN
- target_role: VARCHAR
- created_at: TIMESTAMP
```

#### Tabla: `settings`
```sql
- id: UUID (PK)
- key: VARCHAR UNIQUE
- value: JSONB
- updated_by: FK → users
- updated_at: TIMESTAMP
```

---

## API REST

### Endpoints de Autenticación

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/logout` | Cerrar sesión | Sí |
| GET | `/api/auth/profile` | Obtener perfil | Sí |

### Endpoints de Datos (Genéricos)

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/data?table=xxx&filters={}` | Obtener datos tabla | Sí |
| POST | `/api/crud` | Operaciones CRUD | Sí |
| GET | `/api/tables` | Listar tablas disponibles | Sí (Admin) |

### Endpoints de Productos

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | Listar productos | Sí |
| POST | `/api/products` | Crear producto | Sí (Admin) |
| PUT | `/api/products/:id` | Actualizar producto | Sí (Admin) |
| DELETE | `/api/products/:id` | Eliminar producto | Sí (Admin) |

### Endpoints de Agencias

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/agencies` | Listar agencias | Sí |
| POST | `/api/agencies` | Crear agencia | Sí (Admin) |
| PUT | `/api/agencies/:id` | Actualizar agencia | Sí (Admin) |
| DELETE | `/api/agencies/:id` | Eliminar agencia | Sí (Admin) |

### Endpoints de Usuarios

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Listar usuarios | Sí |
| POST | `/api/users` | Crear usuario | Sí (Admin) |
| PUT | `/api/users/:id` | Actualizar usuario | Sí (Admin) |
| DELETE | `/api/users/:id` | Eliminar usuario | Sí (Admin) |
| POST | `/api/users/:id/unlock` | Desbloquear usuario | Sí (Admin) |

### Endpoints de Reservas

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/reservations` | Listar reservas | Sí |
| POST | `/api/reservations` | Crear reserva | Sí |
| PUT | `/api/reservations/:id` | Actualizar reserva | Sí |
| DELETE | `/api/reservations/:id` | Eliminar reserva | Sí (Admin) |
| POST | `/api/reservations/:id/confirm` | Confirmar reserva | Sí |
| POST | `/api/reservations/:id/resend-email` | Reenviar email | Sí |

### Endpoints de Notificaciones

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications` | Listar notificaciones | Sí |
| GET | `/api/notifications/unread-count` | Contar no leídas | Sí |
| PUT | `/api/notifications/:id/read` | Marcar como leída | Sí |
| PUT | `/api/notifications/read-all` | Marcar todas como leídas | Sí |
| DELETE | `/api/notifications/:id` | Ocultar notificación | Sí |

---

## Autenticación y Autorización

### Roles del Sistema

| Rol | Acceso |
|-----|--------|
| **Admin** | Acceso completo a todos los módulos y funciones |
| **Admin de Agencia** | Gestión de su agencia específica |
| **Usuario de Agencia** | Acceso básico a reservas y disponibilidad |

### Flujo de Autenticación

1. Usuario ingresa email y contraseña en `/login`
2. Backend valida credenciales contra base de datos
3. Se genera token JWT con payload: `{ userId, email, role }`
4. Token se almacena en localStorage
5. Cada request incluye `Authorization: Bearer <token>` header
6. Middleware `auth.js` valida token y adjunta `req.user`

### Protección de Rutas

- **ProtectedRoute:** Para usuarios autenticados
- **AdminRoute:** Solo para usuarios con rol `admin`

---

## Instalación y Configuración

### Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con las credenciales de la base de datos
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Variables de Entorno (Backend)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/form_cupos
JWT_SECRET=your-secret-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
BACKEND_PORT=5001
```

---

## Guía de Uso

### Primeros Pasos

1. **Iniciar sesión** con credenciales de administrador
2. **Configurar agencias** en "Gestión de Agencias"
3. **Crear usuarios** asignándolos a agencias
4. **Cargar productos/cupos** disponibles
5. **Gestionar reservas** desde "Gestión de Reservas"

### Flujo de Trabajo Típico

1. Cliente contacta a la agencia solicitando un viaje
2. El agente crea una solicitud/reserva en el sistema
3. Se verifica la disponibilidad de cupos
4. Se confirma la reserva y se envía el email
5. El cliente recibe la confirmación

---

## Seguridad

### Medidas Implementadas

- **Hash de contraseñas:** bcrypt con salt rounds
- **Tokens JWT:** Firmados y expirables
- **Validación de entrada:** Sanitización en backend
- **Control de acceso:** Basado en roles
- **SQL injection prevention:** Parameterized queries
- **CORS:** Configurado para origins permitidos

### Mejores Prácticas

- Nunca exponer credenciales en código
- Usar HTTPS en producción
- Rotar secrets periódicamente
- Mantener dependencias actualizadas
- Validar inputs en frontend y backend

---

## Solución de Problemas

### Errores Comunes

#### `ERR_CONNECTION_REFUSED`
- **Causa:** Backend no está corriendo
- **Solución:** Ejecutar `npm start` en `/backend`

#### `Cannot access 'paramIndex' before initialization`
- **Causa:** Variable declarada fuera de scope
- **Solución:** Corregir declaración en dataController.js

#### `column "Estado" does not exist`
- **Causa:** Case sensitivity en PostgreSQL
- **Solución:** Usar lowercase en nombres de columnas

#### `The requested module does not provide an export named`
- **Causa:** Import/export mismatch
- **Solución:** Verificar default vs named exports

### Logs y Debugging

- **Frontend:** Console del navegador (F12)
- **Backend:** Terminal donde se ejecuta `npm start`
- **Base de datos:** Logs de PostgreSQL

---

## Créditos

Desarrollado para el sistema de gestión de cupos de viajes.

**Versión:** 1.0.0  
**Última actualización:** Julio 2025
