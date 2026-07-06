# Plan de Migración de Backend a Go (Golang)

Este documento es una guía técnica para migrar la API actual de Node.js/Express a un servicio de alto rendimiento escrito en Go.

## 1. Arquitectura del Proyecto
Se recomienda una arquitectura limpia (Clean Architecture) o modular:

```text
/cmd/api/main.go        # Punto de entrada
/internal
  /auth                 # Lógica de JWT y autenticación
  /user                 # CRUD de usuarios y roles
  /product              # CRUD de productos y carga masiva
  /reservation          # Lógica de reservas
  /report               # Estadísticas y reportería
  /middleware           # Auth, Logger, CORS
/pkg
  /database             # Configuración de GORM / pgx
  /utils                # Helpers
```

## 2. Stack Tecnológico Sugerido
- **Framework Web**: `Gin` o `Fiber` (por su alto rendimiento y similitud con Express).
- **ORM**: `GORM` para facilitar la gestión de la base de datos PostgreSQL.
- **JWT**: `golang-jwt/jwt`.
- **Validación**: `go-playground/validator`.
- **Carga Masiva**: `excelize/v2` para Excel y el paquete estándar `encoding/csv`.

## 3. Pasos para la IA Ejecutora

### Paso 1: Configuración Base
- Inicializar módulo: `go mod init form-cupos-backend`.
- Configurar conexión a base de datos con variables de entorno (`DATABASE_URL`).
- Implementar los modelos de GORM basados en las tablas de `schema.sql` (Profiles, Products, Reservations, Roles, Permissions).

### Paso 2: Middleware de Autenticación
- Migrar la lógica de `auth.js` de Node.js a Go.
- Crear un middleware que valide el JWT y extraiga el `user_id`, `role` y `agencia`.
- Implementar el helper `RequirePermission` utilizando los roles granulares de la base de datos.

### Paso 3: Migración de Controladores (Handlers)
- **Auth**: Login (bcrypt) y registro.
- **Users**: Listado con paginación dinámica, creación y actualización (usando transacciones `db.Begin()`).
- **Products**: CRUD y el endpoint `/bulk` para carga masiva optimizada.
- **Reports**: Consultas SQL agregadas para el dashboard.

### Paso 4: Transacciones Robustas
- En los endpoints de creación de usuarios y carga masiva de productos, es **obligatorio** usar transacciones de base de datos para asegurar la integridad de los datos, tal como se corrigió en la versión de Node.js.

### Paso 5: Manejo de Errores y Logs
- Implementar un sistema de logs centralizado.
- Retornar respuestas JSON consistentes: `{"success": false, "error": "mensaje"}`.

## 4. Consideraciones Especiales
- **Concurrencia**: Aprovechar las goroutines en el procesamiento de carga masiva de productos si el volumen es muy alto.
- **Seguridad**: Asegurar que las contraseñas se sigan procesando con `bcrypt`.

---
*Este plan permite una transición transparente manteniendo la misma base de datos y esquema actual.*
