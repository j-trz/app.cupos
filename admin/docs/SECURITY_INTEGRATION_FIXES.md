# Correcciones de Integración del Sistema de Seguridad

## Problemas Identificados y Resueltos

### 1. Error de Navegación: `setSeccion is not a function`

**Problema**: La página `Seguridad.jsx` no pasaba la prop `setSeccion` al componente `Layout`, causando errores al intentar navegar desde el panel de seguridad.

**Solución**:

- Archivo: `src/pages/Seguridad.jsx`
- Se agregó estado local para `seccion` y `setSeccion`
- Se pasaron ambas props al componente `Layout`

```jsx
// ANTES
<Layout seccion="seguridad">

// DESPUÉS
const [seccion, setSeccion] = useState("seguridad");
<Layout seccion={seccion} setSeccion={setSeccion}>
```

### 2. Error de Relaciones de Base de Datos: Error 400 Bad Request

**Problema**: Las consultas con `profiles!inner` fallaban porque no existe relación de clave foránea entre `user_security_status` y `profiles`.

**Solución**: Reemplazadas las consultas automáticas con JOINs manuales en dos archivos:

#### `src/services/securityService.js` - función `getLockedUsers()`

```javascript
// ANTES - Consulta con JOIN automático que falla
const { data, error } = await supabase
  .from("user_security_status")
  .select(
    `
    user_id,
    is_locked,
    locked_at,
    locked_reason,
    failed_attempts_count,
    profiles!inner(email, full_name, agency, role)
  `
  )
  .eq("is_locked", true);

// DESPUÉS - Consultas separadas y combinación manual
const { data: securityData, error: securityError } = await supabase
  .from("user_security_status")
  .select(
    `
    user_id,
    is_locked,
    locked_at,
    locked_reason,
    failed_attempts_count
  `
  )
  .eq("is_locked", true);

const userIds = securityData.map((item) => item.user_id);
const { data: profilesData, error: profilesError } = await supabase
  .from("profiles")
  .select("id, email, full_name, agency, role")
  .in("id", userIds);

// Combinar datos manualmente
const lockedUsers = securityData
  .map((securityItem) => {
    const profile = profilesData.find((p) => p.id === securityItem.user_id);
    return {
      ...securityItem,
      profiles: profile || null,
    };
  })
  .filter((user) => user.profiles);
```

#### `src/services/twoFactorService.js` - función `getAllUsers2FA()`

Se aplicó la misma corrección para obtener usuarios con 2FA habilitado.

### 3. Esquema SQL con Relaciones de Clave Foránea

**Archivo**: `sql/security_features.sql` (líneas 49-60)

El archivo SQL ya incluye la corrección para agregar la relación de clave foránea:

```sql
-- Agregar foreign key constraint a profiles si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_security_status_profile_fkey'
    ) THEN
        ALTER TABLE public.user_security_status
        ADD CONSTRAINT user_security_status_profile_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
```

## Pasos Siguientes para Completar la Integración

### 1. Aplicar Migración SQL

```bash
# Ejecutar el archivo SQL actualizado en Supabase
psql -h [HOST] -U [USER] -d [DATABASE] -f sql/security_features.sql
```

### 2. Verificar Funcionalidad

- **Panel de Seguridad**: Navegar a `/admin/seguridad` y verificar que:
  - La navegación funciona sin errores
  - Los datos de usuarios bloqueados se cargan correctamente
  - Los datos de usuarios con 2FA se muestran
  - Las estadísticas de seguridad se actualizan

### 3. Verificar Rutas y Permisos

- Confirmar que solo usuarios admin pueden acceder al panel
- Verificar que las rutas están correctamente configuradas en `App.jsx`
- Comprobar que el icono de seguridad aparece en el sidebar para admins

## Estructura de Archivos Modificados

```
src/
├── pages/
│   └── Seguridad.jsx ✓ CORREGIDO
├── services/
│   ├── securityService.js ✓ CORREGIDO
│   └── twoFactorService.js ✓ CORREGIDO
└── components/
    ├── SecurityAdminPanel.jsx ✓ EXISTENTE
    └── SidebarSections.jsx ✓ EXISTENTE

sql/
└── security_features.sql ✓ INCLUYE CORRECCIONES
```

## Características del Sistema de Seguridad

### 1. Bloqueo por Intentos Fallidos

- **Límite**: 3 intentos fallidos
- **Duración**: 30 minutos de bloqueo
- **Desbloqueo automático**: Después del tiempo de espera
- **Desbloqueo manual**: Disponible para administradores

### 2. Auto-logout por Inactividad

- **Tiempo límite**: 10 minutos de inactividad
- **Seguimiento**: Actividad de mouse, teclado y scroll
- **Limpieza automática**: Sesiones expiradas cada 5 minutos

### 3. Autenticación de Doble Factor (2FA)

- **Protocolo**: TOTP (Time-based One-Time Password)
- **Códigos de backup**: 8 códigos de un solo uso
- **Integración**: Supabase MFA nativo
- **Reset administrativo**: Disponible para admins

### 4. Panel de Administración

- **Estadísticas de seguridad**: Usuarios totales, bloqueados, con 2FA
- **Gestión de usuarios**: Ver y desbloquear usuarios
- **Monitoreo 2FA**: Ver usuarios con 2FA configurado
- **Acceso restringido**: Solo para usuarios con rol 'admin'

## Estado Actual

✅ **Problemas de integración resueltos**
✅ **Consultas de base de datos corregidas**
✅ **Navegación funcionando**
⏳ **Pendiente**: Aplicar migración SQL y pruebas finales
