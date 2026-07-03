# Arquitectura Flexible de Backend y Frontend

## Descripción General

Esta arquitectura permite cambiar entre diferentes proveedores de base de datos (como Neon, Supabase, PostgreSQL tradicional) sin afectar significativamente el frontend ni tener que reescribir gran parte del código.

## Componentes Principales

### 1. Backend Flexible

#### Configuración de Base de Datos
- Archivo: `backend/src/config/database.js`
- Permite cambiar entre proveedores con la variable `DB_PROVIDER`
- Soporta: PostgreSQL, Neon, Supabase y otros

#### Capa de Abstracción de Datos
- Archivo: `backend/src/controllers/dataController.js`
- Proporciona endpoints REST para operaciones CRUD
- Previene inyección SQL con validación de entradas
- Requiere autenticación JWT para todas las operaciones

#### Nuevos Endpoints
- `GET /api/data` - Obtener datos con filtros
- `POST /api/data` - Insertar o actualizar datos
- `PUT /api/data` - Actualizar datos
- `DELETE /api/data` - Eliminar datos
- `POST /api/data/query` - Consultas SQL personalizadas (solo lectura)
- `GET /api/data/schema/:table` - Esquema de tabla
- `GET /api/data/tables` - Lista de tablas

### 2. Frontend con Soporte Dual

#### Servicio de API de Datos
- Archivo: `admin/src/services/dataApiService.js`
- Capa de abstracción para operaciones de base de datos
- Comunica con el backend flexible en lugar de Supabase directamente

#### Servicios Actualizados
- Archivo: `admin/src/services/userService.js` (ejemplo)
- Pueden operar con ambos backends (Supabase directo o backend flexible)
- Controlado por la variable `VITE_USE_FLEXIBLE_BACKEND`

## Configuración

### Backend

Actualizar `.env` con:

```env
# Proveedor de base de datos
DB_PROVIDER=neon

# URL específica según el proveedor
NEON_DATABASE_URL="postgresql://usuario:contraseña@ep-nombre-xxxx.us-east-1.aws.neon.tech/nombre_db?sslmode=require"

# Otras configuraciones
JWT_SECRET="tu_secreto_jwt_seguro"
```

### Frontend

Actualizar `.env` con:

```env
# Activar el uso del backend flexible
VITE_USE_FLEXIBLE_BACKEND=true

# URL del backend
VITE_BACKEND_URL=http://localhost:5000

# Aún se necesitan variables de Supabase para autenticación
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Ventajas

1. **Independencia del proveedor**: Cambiar entre Neon, Supabase o PostgreSQL es tan simple como cambiar una variable de entorno
2. **Mayor seguridad**: Las operaciones de base de datos están centralizadas en el backend con validación adecuada
3. **Flexibilidad**: El frontend puede seguir usando Supabase para autenticación mientras se migran gradualmente otras operaciones
4. **Facilidad de mantenimiento**: Toda la lógica de base de datos está en un solo lugar
5. **Compatibilidad gradual**: Se puede migrar parte por parte sin interrumpir el sistema

## Estrategia de Migración

1. Mantener Supabase para autenticación (continúa funcionando como antes)
2. Redirigir operaciones de datos al backend flexible
3. Actualizar servicios del frontend para usar la capa de abstracción
4. Configurar el proveedor de base de datos deseado (Neon, etc.)

## Consideraciones

- La autenticación sigue manejándose con Supabase Auth
- El backend flexible requiere autenticación JWT para todas las operaciones de datos
- Se mantiene compatibilidad con las funcionalidades existentes
- Se recomienda probar exhaustivamente durante la transición