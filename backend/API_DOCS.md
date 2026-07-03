# Documentación de la API de Datos Flexible

## Introducción

Este backend proporciona una capa de abstracción para operaciones de base de datos que permite cambiar entre diferentes proveedores de base de datos (PostgreSQL, Neon, Supabase, etc.) sin afectar el frontend.

## Configuración de Base de Datos

La conexión a la base de datos se configura mediante variables de entorno en `backend/.env`:

```env
# Proveedor de base de datos (opciones: postgresql, neon, supabase)
DB_PROVIDER=neon

# URLs de conexión específicas para cada proveedor
DATABASE_URL= # Para PostgreSQL tradicional
NEON_DATABASE_URL= # Para Neon
SUPABASE_DATABASE_URL= # Para Supabase

# Otros ajustes
NODE_ENV=development
PORT=5000
```

## Endpoints de la API de Datos

### GET /api/data

Obtiene datos de una tabla específica con posibilidad de filtrado, límites y ordenamiento.

**Parámetros Query:**
- `table`: Nombre de la tabla (requerido)
- `filters`: Objeto JSON con filtros
- `limit`: Número máximo de registros
- `offset`: Desplazamiento para paginación
- `order`: Campo y dirección de ordenamiento (ej: "created_at:desc")

**Ejemplo:**
```
GET /api/data?table=productos&filters={"categoria":"viajes"}&limit=10
```

### POST /api/data

Realiza operaciones de inserción o actualización de datos.

**Body:**
```json
{
  "table": "nombre_tabla",
  "operation": "insert", // o "update"
  "data": {
    "campo1": "valor1",
    "campo2": "valor2"
  },
  "id": "id_registro", // para actualización
  "idField": "id" // campo a usar como identificador
}
```

### PUT /api/data

Realiza operaciones de actualización de datos (mismo formato que POST).

### DELETE /api/data

Elimina un registro específico.

**Body:**
```json
{
  "table": "nombre_tabla",
  "operation": "delete",
  "id": "id_registro",
  "idField": "id" // campo a usar como identificador
}
```

### POST /api/data/query

Ejecuta consultas SQL personalizadas (solo lectura).

**Body:**
```json
{
  "query": "SELECT * FROM productos WHERE categoria = $1",
  "params": ["viajes"]
}
```

### GET /api/data/schema/{table}

Obtiene el esquema de una tabla específica.

### GET /api/data/tables

Obtiene la lista de todas las tablas disponibles en la base de datos.

## Filtros Soportados

Los filtros se pasan como objeto JSON y admiten los siguientes operadores:

- `$eq`: Igualdad (`{ "estado": { "$eq": "activo" } }`)
- `$ne`, `$neq`: Diferente (`{ "estado": { "$ne": "inactivo" } }`)
- `$gt`: Mayor que (`{ "precio": { "$gt": 100 } }`)
- `$gte`: Mayor o igual que (`{ "precio": { "$gte": 100 } }`)
- `$lt`: Menor que (`{ "precio": { "$lt": 500 } }`)
- `$lte`: Menor o igual que (`{ "precio": { "$lte": 500 } }`)
- `$in`: Incluido en una lista (`{ "categoria": { "$in": ["viajes", "hoteles"] } }`)
- `$like`: Búsqueda parcial (`{ "titulo": { "$like": "vacaciones" } }`)
- `$ilike`: Búsqueda parcial insensible a mayúsculas (`{ "titulo": { "$ilike": "VACACIONES" } }`)

## Seguridad

- Todos los endpoints requieren autenticación JWT
- Los nombres de tablas y campos son validados para prevenir inyección SQL
- Las consultas personalizadas están restringidas a operaciones de solo lectura
- Se utiliza interpolación de parámetros para prevenir inyección SQL

## Ejemplos de Uso

### En el Frontend con el servicio DataApiService:

```javascript
import dataApiService from './services/dataApiService';

// Obtener productos
const productos = await dataApiService.getData('productos', { 
  categoria: { $eq: 'viajes' } 
}, { limit: 10 });

// Insertar nuevo producto
const nuevoProducto = await dataApiService.insertData('productos', {
  titulo: 'Vacaciones en Europa',
  categoria: 'viajes',
  precio: 1200
});

// Actualizar producto
const productoActualizado = await dataApiService.updateData('productos', 'id_producto', {
  precio: 1100
});

// Eliminar producto
await dataApiService.deleteData('productos', 'id_producto');
```

## Beneficios de la Arquitectura

1. **Independencia del proveedor**: Cambiar entre Neon, Supabase, PostgreSQL tradicional, etc., solo requiere cambiar la configuración.
2. **Seguridad mejorada**: Centralización de operaciones de base de datos en el backend.
3. **Control de acceso**: Aplicación de lógica de negocio y permisos en el backend.
4. **Facilidad de mantenimiento**: Toda la lógica de base de datos en un solo lugar.