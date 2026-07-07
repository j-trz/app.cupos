# Backend en Go - Sistema de Gestión de Cupos

Este es el backend migrado de Node.js a **Go (Golang)** para el Sistema de Gestión de Cupos. Ofrece un alto rendimiento, concurrencia nativa y tipado fuerte para una mayor robustez.

## 🚀 Tecnologías Utilizadas

- **Framework Web**: [Gin Gonic](https://gin-gonic.com/)
- **ORM**: [GORM](https://gorm.io/)
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: Bcrypt para hashing de contraseñas

## 📁 Estructura del Proyecto

```text
backend-go/
├── cmd/
│   └── api/             # Punto de entrada de la aplicación
├── internal/
│   ├── database/       # Configuración y conexión a la DB
│   ├── handlers/       # Controladores de la API (Lógica de negocio)
│   ├── middleware/     # Middlewares (Auth, Roles, etc.)
│   └── models/         # Estructuras de datos (GORM)
├── pkg/
│   └── utils/          # Utilidades compartidas
├── .env.example        # Plantilla de variables de entorno
├── go.mod              # Definición del módulo y dependencias
└── README.md           # Este archivo
```

## 🛠️ Instalación y Configuración

### 1. Prerrequisitos
- Tener instalado **Go 1.23+**.
- Una instancia de **PostgreSQL** activa.

### 2. Clonar y configurar
Navega a la carpeta del backend en Go:
```bash
cd backend-go
```

Copia el archivo de ejemplo de variables de entorno y edítalo con tus credenciales:
```bash
cp .env.example .env
```

### 3. Instalar dependencias
```bash
go mod tidy
```

## 🚀 Ejecución en Desarrollo

Para ejecutar el servidor localmente:
```bash
go run cmd/api/main.go
```
El servidor se iniciará de forma predeterminada en `http://localhost:5002`.

## 📦 Despliegue

### Compilar el binario
Para generar un ejecutable optimizado:
```bash
go build -o server cmd/api/main.go
```

### Docker (Opcional)
Puedes crear una imagen de Docker para desplegar en cualquier nube:
```bash
docker build -t cupos-backend-go .
```

## 🛡️ Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Perfil de usuario (Protegido)

### Productos
- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto (Admin)
- `POST /api/products/bulk` - Carga masiva (Admin)

### Reservas
- `GET /api/orders` - Listar reservas (Filtrado por rol/agencia)
- `POST /api/orders` - Crear reserva
- `POST /api/orders/:id/confirm` - Confirmar reserva (Admin)

### Reportes
- `GET /api/reports/stats` - Estadísticas generales del dashboard

### Ajustes y Sistema
- `GET /api/settings` - Listar ajustes globales (Admin)
- `PUT /api/settings/:key` - Actualizar ajuste (Admin)
- `GET /api/backup` - Obtener respaldo de base de datos (Admin)
- `GET /api/sse` - Canal de notificaciones en tiempo real
