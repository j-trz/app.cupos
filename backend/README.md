# 🚀 API Backend Flexible - Sistema de Gestión de Cupos

Este directorio contiene una API de backend flexible construida con **Node.js** y **Express**. Reemplaza las Supabase Edge Functions nativas por un backend tradicional que puedes hospedar en cualquier servidor (VPS, Render, Heroku, AWS, etc.) y conectar a cualquier proveedor de bases de datos PostgreSQL (Supabase, Neon, RDS o Postgres local).

---

## 🛠️ Requisitos Previos

* **Node.js** (versión 18.0 o superior recomendada).
* Una base de datos **PostgreSQL** activa.

---

## 📦 Instalación y Configuración

### 1. Inicializar la Base de Datos
Ejecuta el script SQL consolidado ubicado en la raíz del proyecto para crear la base de datos completa con todas las relaciones, índices, triggers y funciones:
```bash
# Copia el contenido de database/schema.sql y ejecútalo en la consola SQL de tu base de datos
# (Supabase SQL Editor, Neon Query Editor, psql, pgAdmin, etc.)
```

### 2. Instalar Dependencias del Backend
Entra en la carpeta del backend e instala las dependencias de npm:
```bash
cd backend
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo de plantilla `.env.example` a un archivo `.env` nuevo y completa tus credenciales:
```bash
cp .env.example .env
```

Edita el archivo `.env` configurando los valores reales:
* `DATABASE_URL`: Cadena de conexión de tu Postgres (`postgresql://...`).
* `JWT_SECRET`: Una clave de texto larga y segura para la firma de tokens locales.
* `SUPABASE_JWT_SECRET`: (Opcional) Si quieres que la API valide también sesiones iniciadas con Supabase Auth en el frontend.
* URLs de Power Automate (`POWERAUTOMATE_...`): Direcciones de los flujos de automatización externos.

---

## 🚀 Ejecutar en Desarrollo

Para ejecutar el servidor localmente con reinicios automáticos al detectar cambios (`nodemon`):
```bash
npm run dev
```
El servidor se levantará de forma predeterminada en `http://localhost:5000`.

Puedes verificar que la API está viva visitando:
* `http://localhost:5000/health`

---

## 📁 Estructura del Código

```
backend/
├── src/
│   ├── index.js                  # Punto de entrada principal (Express & rutas)
│   ├── db.js                     # Configuración del Pool de conexiones de Postgres (pg)
│   ├── middleware/
│   │   └── auth.js               # Middleware de verificación JWT por roles
│   └── controllers/
│       ├── authController.js     # Lógica de login, registro y perfil local
│       ├── userController.js     # Lógica de administración de usuarios (CRUD)
│       ├── connectionController.js # Lógica de gestión y prueba de conexiones
│       ├── powerAutomateController.js # Proxy seguro para interactuar con Power Automate
│       └── notificationController.js # Lógica para envío y lectura de notificaciones
├── .env.example                  # Plantilla de variables de entorno
└── package.json                  # Scripts y dependencias de Node.js
```

---

## 🛡️ Endpoints de la API

La API expone los siguientes recursos bajo la ruta `/api`:

### Autenticación
* `POST /api/auth/register` - Registro de nuevos usuarios.
* `POST /api/auth/login` - Inicio de sesión (devuelve un JWT).
* `GET /api/auth/profile` - Obtiene el perfil del usuario autenticado (requiere JWT).

### Usuarios (Solo Administradores)
* `GET /api/users` - Lista de usuarios con paginación y búsqueda.
* `POST /api/users` - Crear un nuevo usuario.
* `PUT /api/users/:id` - Actualizar datos de usuario.
* `DELETE /api/users/:id` - Eliminar usuario.
* `GET /api/users/locked` - Listar usuarios bloqueados por intentos fallidos.
* `POST /api/users/:id/unlock` - Desbloquear cuenta de usuario.
* `GET /api/users/2fa` - Listar usuarios con 2FA activo.

### Conexiones de Datos
* `GET /api/connections` - Listar conexiones disponibles por agencia y rol.
* `POST /api/connections` - Crear conexión y asociar credenciales (Admin).
* `DELETE /api/connections/:id` - Eliminar conexión (Admin).
* `POST /api/connections/:id/activate` - Activar conexión y desactivar otras (Admin).
* `POST /api/connections/:id/test` - Probar conectividad con API externa (Admin).

### Proxy Power Automate
* `GET /api/power-automate-proxy/availability` - Obtener cupos de vuelo disponibles.
* `GET /api/power-automate-proxy/requests` - Obtener solicitudes pendientes.
* `GET /api/power-automate-proxy/confirmations` - Obtener reservas confirmadas.
* `POST /api/power-automate-proxy/submit-reservation` - Procesar y enviar solicitudes de reserva.

### Notificaciones
* `GET /api/notifications` - Notificaciones del usuario autenticado.
* `GET /api/notifications/unread-count` - Número de notificaciones no leídas.
* `PUT /api/notifications/read-all` - Marcar todas como leídas.
* `PUT /api/notifications/:id/read` - Marcar notificación específica como leída/no leída.
* `PUT /api/notifications/:id/hide` - Ocultar notificación.
