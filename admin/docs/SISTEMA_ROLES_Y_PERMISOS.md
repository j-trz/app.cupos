# Sistema de Roles y Permisos

## 📋 Resumen

El sistema implementa un control de acceso basado en roles (RBAC) que permite gestionar qué datos puede ver y qué acciones puede realizar cada tipo de usuario en la aplicación de gestión de cupos aéreos.

## 🎭 Roles Definidos

### 1. **Admin** (`admin`)

- **Descripción**: Administrador del Sistema
- **Permisos**: Acceso completo a todas las funcionalidades
- **Accesos**:
  - ✅ Ve todos los datos de todas las agencias
  - ✅ Gestión de usuarios
  - ✅ Gestión de conexiones API
  - ✅ Disponibilidad, solicitudes y confirmaciones globales
  - ✅ Configuración del sistema

### 2. **Agency Admin** (`agency_admin`)

- **Descripción**: Administrador de Agencia
- **Permisos**: Gestión de datos de su agencia
- **Accesos**:
  - ✅ Ve datos solo de su agencia
  - ✅ Disponibilidad global (todos los vuelos)
  - ✅ Solicitudes de su agencia
  - ✅ Confirmaciones de su agencia
  - ❌ No puede gestionar usuarios
  - ❌ No puede gestionar conexiones API

### 3. **Agency User** (`agency_user`)

- **Descripción**: Usuario de Agencia
- **Permisos**: Acceso limitado a sus propios datos
- **Accesos**:
  - ✅ Disponibilidad global (todos los vuelos)
  - ✅ Solo sus propias solicitudes
  - ❌ No puede ver confirmaciones
  - ❌ No puede gestionar usuarios
  - ❌ No puede gestionar conexiones API

## 🏗️ Arquitectura del Sistema

### 1. Base de Datos

```sql
-- Tabla profiles actualizada
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'agency_user';
ALTER TABLE profiles ADD CONSTRAINT valid_roles
CHECK (role IN ('admin', 'agency_admin', 'agency_user'));
```

### 2. Servicios Principales

#### `AuthorizationService`

- **Ubicación**: `src/services/authorizationService.js`
- **Funciones**:
  - `getCurrentUserRole()` - Obtiene el rol del usuario actual
  - `hasPermission(permission)` - Verifica permisos específicos
  - `getDataFilters()` - Obtiene filtros de datos según el rol
  - `validateRouteAccess(route)` - Valida acceso a rutas

#### `UserService` (Actualizado)

- **Ubicación**: `src/services/userService.js`
- **Funciones**:
  - Integrado con `AuthorizationService`
  - Manejo de roles en creación/actualización de usuarios
  - Compatibilidad hacia atrás con campo `admin`

#### `ReservationService` (Actualizado)

- **Ubicación**: `src/services/reservationService.js`
- **Funciones**:
  - Filtrado automático de datos según rol
  - Validación de permisos antes de mostrar información
  - Logs detallados de filtros aplicados

### 3. Componentes de UI

#### `UsuarioForm` (Actualizado)

- **Ubicación**: `src/components/UsuarioForm.jsx`
- **Características**:
  - Selector de roles con iconos
  - Migración automática de campo `admin` a `role`
  - Compatibilidad hacia atrás

## 🔒 Matriz de Permisos

| Funcionalidad          | Admin       | Agency Admin  | Agency User     |
| ---------------------- | ----------- | ------------- | --------------- |
| **Disponibilidad**     | ✅ Global   | ✅ Global     | ✅ Global       |
| **Solicitudes**        | ✅ Todas    | ✅ Su agencia | ✅ Solo propias |
| **Confirmaciones**     | ✅ Todas    | ✅ Su agencia | ❌ No acceso    |
| **Gestión Usuarios**   | ✅ Todos    | ❌ No acceso  | ❌ No acceso    |
| **Gestión Conexiones** | ✅ Completa | ❌ No acceso  | ❌ No acceso    |
| **DataSourceInfo**     | ✅ Visible  | ❌ No visible | ❌ No visible   |

## 🚀 Migración y Configuración

### 1. Ejecutar Migración SQL

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver archivo: docs/SQL_MIGRATION_ROLES.sql
```

### 2. Configurar Usuarios Existentes

Los usuarios existentes se migran automáticamente:

- `admin: true` → `role: 'admin'`
- `admin: false` → `role: 'agency_user'`

### 3. Crear Nuevos Usuarios

Usar el formulario actualizado que incluye selector de roles.

## 🔍 Filtros de Datos Implementados

### Filtros por Rol

#### Admin (`all`)

```javascript
// Ve todos los datos sin filtros
return allData;
```

#### Agency Admin (`agency`)

```javascript
// Solo datos de su agencia
return data.filter((item) => item.Agencia === userAgencia);
```

#### Agency User (`user`)

```javascript
// Solo sus propios datos de su agencia
return data.filter(
  (item) => item.Agencia === userAgencia && item.Usuario_Email === userEmail
);
```

## 🎯 Rutas y Navegación

### Rutas Protegidas por Rol

#### Solo Admin

- `/admin/gestion-usuarios`
- `/admin/gestion-conexiones`

#### Admin + Agency Admin

- `/admin/confirmaciones`

#### Todos los usuarios autenticados

- `/admin/disponibilidad`
- `/admin/solicitudes`

### Sidebar Dinámico

El menú se genera automáticamente según el rol:

```javascript
const menuOptions = await AuthorizationService.getMenuOptions();
```

## 🛠️ Funciones de Utilidad

### Verificación de Permisos

```javascript
// Verificar si el usuario puede gestionar usuarios
const canManage = await AuthorizationService.canManageUsers();

// Verificar rol específico
const isAdmin = await AuthorizationService.isAdmin();

// Obtener filtros de datos
const filters = await AuthorizationService.getDataFilters();
```

### Validación de Rutas

```javascript
// En componentes de ruta
const hasAccess = await AuthorizationService.validateRouteAccess(route);
if (!hasAccess) {
  // Redirigir o mostrar error
}
```

## 🚨 Consideraciones de Seguridad

### 1. Validación en el Backend

- Las políticas RLS (Row Level Security) están configuradas en Supabase
- Validación adicional en Edge Functions cuando sea necesario

### 2. Filtrado en el Frontend

- Doble validación: backend + frontend
- Logs detallados para auditoría
- Manejo de errores robusto

### 3. Compatibilidad

- Sistema compatible con implementación anterior
- Migración automática de datos existentes
- Fallbacks seguros por defecto

## 📊 Logs y Monitoreo

### Logs Implementados

```javascript
console.log("Filtros aplicados:", filters);
console.log(`✅ Filtradas ${count} solicitudes según rol (${filterType})`);
```

### Métricas de Acceso

- Tipo de filtro aplicado
- Cantidad de registros filtrados
- Rol del usuario
- Agencia del usuario

## 🔄 Flujo de Autenticación y Autorización

1. **Login** → Obtener perfil de usuario
2. **Determinar rol** → `AuthorizationService.getCurrentUserRole()`
3. **Obtener permisos** → `AuthorizationService.getDataFilters()`
4. **Filtrar datos** → Aplicar filtros en servicios
5. **Renderizar UI** → Mostrar solo opciones permitidas

## 📁 Archivos Modificados

### Servicios

- `src/services/authorizationService.js` (nuevo)
- `src/services/userService.js` (actualizado)
- `src/services/reservationService.js` (actualizado)

### Componentes

- `src/components/UsuarioForm.jsx` (actualizado)
- `src/components/AdminRoute.jsx` (compatible)
- `src/components/DataSourceInfo.jsx` (solo admin)

### Base de Datos

- `docs/SQL_MIGRATION_ROLES.sql` (migración)

## 🎉 Resultado Final

El sistema ahora proporciona:

- ✅ Control granular de acceso por rol
- ✅ Filtrado automático de datos
- ✅ UI adaptativa según permisos
- ✅ Migración transparente
- ✅ Compatibilidad hacia atrás
- ✅ Logs detallados para auditoría
- ✅ Seguridad robusta

Los usuarios ahora ven exactamente los datos que les corresponden según su rol y agencia, manteniendo la seguridad y usabilidad del sistema.
