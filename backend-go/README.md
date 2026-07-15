# Backend en Go - Sistema de Gestión de Cupos

Este es el backend desarrollado en **Go (Golang)** para el Sistema de Gestión de Cupos. Ofrece un alto rendimiento, concurrencia nativa, baja huella de memoria y un tipado estricto que asegura la robustez del sistema en entornos de alta demanda.

---

## 🚀 Tecnologías Utilizadas

- **Lenguaje**: Go (v1.25+)
- **Framework Web**: [Gin Gonic](https://gin-gonic.com/) (v1.10.0)
- **ORM**: [GORM](https://gorm.io/) (v1.30.0)
- **Base de Datos**: PostgreSQL (a través de `driver/postgres`)
- **Autenticación**: JWT (JSON Web Tokens) mediante `golang-jwt/jwt/v5`
- **Seguridad**: `bcrypt` para el hashing seguro de contraseñas
- **Despliegue**: Soporte para Docker y Serverless en Vercel

---

## 📁 Estructura del Proyecto

El backend sigue una arquitectura limpia y modular organizada dentro del directorio `/pkg` para compartir lógica de manera estructurada:

```text
backend-go/
├── api/
│   └── index.go          # Punto de entrada para Vercel Serverless
├── cmd/
│   └── api/
│       └── main.go       # Punto de entrada para la ejecución local
├── migrations/           # Scripts SQL de migraciones iniciales y actualizaciones
│   └── 001_create_availability_transfers.sql
├── pkg/
│   ├── database/        # Inicialización y conexión a la base de datos (PostgreSQL/GORM)
│   ├── handlers/        # Controladores / Endpoints de la API (Lógica de negocio por módulo)
│   ├── middleware/      # Middlewares del servidor (Autenticación, CORS, Roles, etc.)
│   ├── models/          # Estructuras de datos y modelos del ORM
│   └── services/        # Servicios auxiliares y de integración (ej. correos SMTP)
├── .env.example          # Plantilla con variables de entorno necesarias
├── go.mod                # Módulo de Go y dependencias del proyecto
├── vercel.json           # Configuración para despliegue en Vercel
└── Dockerfile            # Configuración para contenedorización
```

---

## 🛠️ Instalación y Configuración

### 1. Prerrequisitos
- Tener instalado **Go v1.25+**.
- Una instancia de **PostgreSQL** activa y accesible.

### 2. Configurar el Entorno
Navega a la carpeta del backend en Go:
```bash
cd backend-go
```

Copia el archivo de ejemplo de variables de entorno y configúralo con tus credenciales locales:
```bash
cp .env.example .env
```

#### Variables de Entorno Clave (`.env`):
- `PORT`: Puerto en el que correrá el servidor local (ej. `5002`).
- `DATABASE_URL`: URI de conexión a PostgreSQL (ej. `postgresql://user:pass@localhost:5432/dbname?sslmode=disable`).
- `JWT_SECRET`: Clave secreta para firmar tokens JWT.
- `JWT_EXPIRES_IN`: Expiración de tokens (ej. `24h`).
- `URL_FRONTEND`: URL del frontend permitido para solicitudes CORS (ej. `http://localhost:5173`).
- `CRON_SECRET`: Clave de autenticación para activar las tareas programadas (cron) del sistema.
- `SMTP_*` / `EMAIL_FROM`: Configuración de servidor SMTP global para el envío automático de correos (fallback).

### 3. Instalar y Limpiar Dependencias
Descarga las dependencias declaradas en el módulo:
```bash
go mod tidy
```

---

## 🚀 Ejecución en Desarrollo

Para ejecutar el servidor en tu entorno de desarrollo local:
```bash
go run cmd/api/main.go
```
De forma predeterminada, la API estará escuchando en `http://localhost:5002`.

---

## 🛡️ Endpoints e Integraciones de la API

La API cuenta con los siguientes módulos de endpoints protegidos mediante autenticación JWT y políticas RBAC (Roles y Permisos):

### 🔑 Autenticación
- `POST /api/auth/login` - Inicio de sesión de usuarios y generación de token.
- `GET /api/auth/profile` - Consulta del perfil del usuario actualmente autenticado.

### 🏢 Agencias
- `GET /api/agencies` - Listado y filtros de agencias aliadas.
- `POST /api/agencies` - Registro de una nueva agencia.

### 📦 Productos y Cupos
- `GET /api/products` - Listar productos turísticos con su disponibilidad de cupos en tiempo real.
- `POST /api/products` - Crear un producto nuevo.
- `POST /api/products/share` - Reglas para compartir cupos entre agencias/productos.

### 🎟️ Reservas y Órdenes
- `GET /api/orders` - Lista de órdenes/reservas según rol de usuario o agencia asociada.
- `POST /api/orders` - Crear reserva/bloqueo de cupos.
- `POST /api/orders/:id/confirm` - Confirmar y validar reserva de cupo (Administración).
- `PUT /api/orders/:id` - Actualizar información o estado de reserva.

### 📊 Reportes y Dashboard
- `GET /api/analytics/stats` - Estadísticas y métricas generales del panel administrativo.
- `GET /api/reports/export` - Exportación estructurada de reportes en diferentes formatos.

### 🤖 Inteligencia Artificial (IA)
- `POST /api/ai/chat` - Interactuar con el asistente virtual inteligente integrado en la aplicación.
- `GET/POST /api/ai-expert/config` - Configuración de parámetros avanzados del experto en IA.

### ✉️ Email y Notificaciones
- `GET/POST /api/email-config` - Configurar servidores SMTP dedicados por agencia y plantillas de correo.
- `GET /api/notifications` - Canal SSE / Consulta de notificaciones internas de sistema.

### ⚙️ Administración General
- `GET/PUT /api/settings` - Ajustes del sistema (moneda, plazos globales, etc.).
- `GET/PUT /api/white-label` - Configuración de Marca Blanca (logos, colores institucionales, etc.).
- `GET /api/logs` - Registro histórico de auditoría del sistema.
- `GET /api/backup` - Descarga manual de un dump/respaldo de la base de datos (Admin).

---

## ⏰ Tareas Automatizadas (Cron Jobs)

El backend expone un endpoint seguro para ejecutar la expiración automática de reservas que superen la fecha límite de pago o confirmación (Deadline):

- **Ruta**: `GET /api/cron/expire-reservations`
- **Seguridad**: Requiere incluir el header `X-Cron-Secret` con el valor exacto de `CRON_SECRET` o pasarlo como parámetro de consulta `?secret=...`.
- **Frecuencia Recomendada**: Configurar un servicio externo (como cron-job.org o GitHub Actions) para invocar este endpoint cada **5 a 15 minutos**.

---

## 📦 Despliegue en Producción

### Compilar el Binario Localmente
Para generar un binario optimizado listo para producción:
```bash
go build -o server cmd/api/main.go
```

### Docker
Si deseas levantar el backend usando Docker, puedes utilizar el `Dockerfile` provisto:
```bash
# Construir la imagen
docker build -t gestion-cupos-backend .

# Correr el contenedor
docker run -p 5002:5002 --env-file .env -d gestion-cupos-backend
```

### Vercel Serverless
El proyecto incluye un archivo `vercel.json` y la ruta de entrada serverless `api/index.go` para ser desplegado directamente en Vercel. Asegúrate de configurar las variables de entorno dentro del dashboard del proyecto en Vercel.