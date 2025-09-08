# Migración del Sistema de Notificaciones - Gestión Personal por Usuario

## 🎯 Objetivo

Transformar el sistema de notificaciones de un modelo global a un modelo personal, donde cada usuario puede gestionar sus notificaciones independientemente sin afectar a otros usuarios.

## 🔍 Problema Identificado

**ANTES:**

- Las notificaciones tenían un estado global (`read`, `read_at`)
- Cuando un usuario eliminaba una notificación, se eliminaba para todos
- Marcar como leída afectaba a todos los usuarios
- No había gestión personal de notificaciones

**DESPUÉS:**

- Cada usuario tiene estados personales para cada notificación
- Gestión independiente: leer/no leer, ocultar/mostrar
- Las notificaciones globales se mantienen intactas
- Cada usuario ve solo su vista personalizada

## 🏗️ Arquitectura Nueva

### 1. Tabla `user_notification_states`

```sql
CREATE TABLE public.user_notification_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,

    -- Estados personales
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    hidden_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, notification_id)
);
```

### 2. Funciones SQL Optimizadas

#### `get_user_notifications(user_uuid, limit_count, only_unread, include_hidden)`

- Obtiene notificaciones con estados personales del usuario
- Une `notifications` con `user_notification_states`
- Filtra según permisos (target_user_id, target_role, globales)

#### `mark_notification_read(user_uuid, notification_uuid, read_status)`

- Marca una notificación como leída/no leída para un usuario específico
- Crea o actualiza el estado personal

#### `hide_notification(user_uuid, notification_uuid, hidden_status)`

- Oculta una notificación para un usuario específico
- No afecta a otros usuarios

#### `get_user_unread_notifications_count(user_uuid)`

- Conteo rápido optimizado de notificaciones no leídas y no ocultas

#### `mark_all_user_notifications_read(user_uuid)`

- Marca todas las notificaciones visibles como leídas para un usuario

## 🔧 Cambios en el Código

### NotificationService.js

#### Métodos Actualizados:

1. **`getNotifications(limit, onlyUnread, includeHidden)`**

   ```javascript
   // ANTES: Query directo a notifications
   // DESPUÉS: Usa función SQL get_user_notifications
   const { data } = await supabase.rpc("get_user_notifications", {
     user_uuid: user.id,
     limit_count: limit,
     only_unread: onlyUnread,
     include_hidden: includeHidden,
   });
   ```

2. **`markAsRead(notificationId, readStatus)`**

   ```javascript
   // ANTES: UPDATE notifications SET read = true
   // DESPUÉS: Usa función mark_notification_read
   await supabase.rpc("mark_notification_read", {
     user_uuid: user.id,
     notification_uuid: notificationId,
     read_status: readStatus,
   });
   ```

3. **`hideNotification(notificationId, hiddenStatus)`** _(NUEVO)_
   ```javascript
   // Nuevo método para gestión personal
   await supabase.rpc("hide_notification", {
     user_uuid: user.id,
     notification_uuid: notificationId,
     hidden_status: hiddenStatus,
   });
   ```

### NotificationDropdown.jsx

#### Cambios en Propiedades:

- `notification.read` → `notification.is_read`
- `notification.read_at` → `notification.read_at`
- Nuevo: `notification.is_hidden`

#### Funcionalidades Nuevas:

- **Toggle Read/Unread**: Los usuarios pueden marcar como leída o no leída
- **Hide Personal**: Ocultar notificaciones sin eliminarlas globalmente
- **Estado Visual**: Indicadores claros de estado personal

## 📊 Beneficios del Nuevo Sistema

### 🎯 Gestión Personal

- ✅ Cada usuario gestiona sus notificaciones independientemente
- ✅ Marcar como leído/no leído sin afectar otros
- ✅ Ocultar notificaciones personalmente
- ✅ Estadísticas personales precisas

### ⚡ Rendimiento

- ✅ Consultas optimizadas con funciones SQL
- ✅ Índices específicos para consultas frecuentes
- ✅ Menos transferencia de datos (solo notificaciones relevantes)

### 🔒 Seguridad

- ✅ Políticas RLS para estados personales
- ✅ Solo administradores pueden eliminar globalmente
- ✅ Aislamiento total entre usuarios

### 🧹 Mantenimiento

- ✅ Triggers automáticos para limpiar estados huérfanos
- ✅ Función de limpieza de notificaciones antiguas
- ✅ Estructura escalable y mantenible

## 🚀 Migración

### 1. Ejecutar Script SQL

```bash
# Desde psql o interfaz de Supabase
\i sql/user_notification_states_table.sql
```

### 2. Ejecutar Script de Migración

```bash
cd scripts
node migrate-notifications.js
```

### 3. Verificar Implementación

- Comprobar que la tabla `user_notification_states` existe
- Verificar que las funciones SQL funcionan
- Probar funcionalidades en el frontend

## 🔄 Flujo de Notificaciones

### Crear Notificación

1. Se crea en tabla `notifications` (sin cambios)
2. Los usuarios ven la notificación según permisos
3. Estado personal se crea cuando el usuario interactúa

### Leer Notificación

1. Usuario hace clic → `markAsRead(id, true)`
2. Se crea/actualiza estado en `user_notification_states`
3. Solo afecta al usuario actual

### Ocultar Notificación

1. Usuario hace clic en "X" → `hideNotification(id, true)`
2. Se marca `is_hidden = true` para ese usuario
3. La notificación desaparece solo para él

### Ver Notificaciones

1. `getNotifications()` → `get_user_notifications()`
2. JOIN automático con estados personales
3. Filtrado por permisos y estados

## 📈 Estadísticas Nuevas

```javascript
const stats = await NotificationService.getNotificationStats();
// Retorna:
{
  total: 15,        // Notificaciones visibles totales
  unread: 3,        // No leídas y no ocultas
  hidden: 7,        // Ocultas por el usuario
  byType: {
    new_request: { total: 5, unread: 1 },
    request_confirmed: { total: 3, unread: 0 },
    // ...
  }
}
```

## 🧪 Testing

### Casos de Prueba

1. **Independencia entre usuarios**

   - Usuario A oculta notificación → Usuario B la sigue viendo
   - Usuario A marca como leída → Usuario B la ve como no leída

2. **Persistencia de estados**

   - Estados se mantienen entre sesiones
   - Recarga de página conserva estados personales

3. **Rendimiento**
   - Consultas rápidas con grandes volúmenes
   - Conteos precisos y eficientes

## 🔮 Futuras Mejoras

### Posibles Extensiones

- **Snooze**: Posponer notificaciones por tiempo definido
- **Categorías**: Filtrar por tipo de notificación
- **Configuración**: Preferencias personales de notificaciones
- **Archivado**: Archivar notificaciones manteniendo historial
- **Búsqueda**: Buscar en historial personal de notificaciones

### Optimizaciones

- **Caché**: Redis para conteos frecuentes
- **Real-time**: WebSockets para estados en tiempo real
- **Batch Updates**: Operaciones masivas eficientes

## 📝 Notas de Implementación

### Compatibilidad Backwards

- Notificaciones existentes mantienen comportamiento
- Migración gradual sin pérdida de datos
- Estados se crean bajo demanda

### Consideraciones de BD

- Limpieza automática de estados huérfanos
- Índices optimizados para consultas frecuentes
- Políticas RLS para seguridad

### Monitoreo

- Logs de operaciones de notificaciones
- Métricas de uso por usuario
- Alertas de rendimiento

---

_Migración completada exitosamente - Sistema de notificaciones personalizado implementado_ ✅
