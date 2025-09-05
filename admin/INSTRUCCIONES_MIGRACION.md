# Instrucciones de Migración - Sistema de Conexiones Dinámicas

## Resumen

Este documento contiene las instrucciones paso a paso para migrar el sistema actual a la nueva funcionalidad de conexiones dinámicas de datos con soporte para múltiples fuentes (Power Automate, Supabase, MongoDB, Tableau, Smartsheet).

## ⚠️ IMPORTANTE: Ejecutar estos pasos para corregir el error 406

Si estás viendo errores como:

```
GET https://hdsmvuwrdwfivujjnubr.supabase.co/rest/v1/data_connections?is_active=eq.true 406 (Not Acceptable)
```

Se debe a que la columna `is_active` no existe en tu tabla `data_connections` de Supabase.

## Prerrequisitos

- Acceso de administrador a la base de datos Supabase
- Acceso a la consola de administración de Supabase
- Variables de entorno actualizadas

## Pasos de Migración

### 1. Actualización del Esquema de Base de Datos

#### Método 1: Ejecutar Script SQL Manualmente (Recomendado)

1. **Acceder a Supabase Dashboard**

   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto
   - Ve a la sección **SQL Editor** en el menú lateral

2. **Ejecutar la Migración**
   - Crea una nueva consulta SQL
   - Copia y pega el contenido completo del archivo: `sql/add_is_active_column.sql`
   - Haz clic en **Run** para ejecutar el script

**Script SQL completo:**

```sql
-- Migración: Agregar columna is_active a tabla data_connections existente
-- Solo se ejecuta si la columna no existe

DO $$
BEGIN
    -- Verificar si la columna is_active ya existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'data_connections'
        AND column_name = 'is_active'
    ) THEN
        -- Agregar la columna is_active
        ALTER TABLE data_connections
        ADD COLUMN is_active BOOLEAN DEFAULT false;

        -- Agregar índice para optimizar consultas por conexión activa
        CREATE INDEX IF NOT EXISTS idx_data_connections_active
        ON data_connections(user_id, is_active)
        WHERE is_active = true;

        -- Función para asegurar que solo una conexión esté activa por usuario
        CREATE OR REPLACE FUNCTION ensure_single_active_connection()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Si se está activando una conexión
            IF NEW.is_active = true AND OLD.is_active = false THEN
                -- Desactivar todas las otras conexiones del mismo usuario
                UPDATE data_connections
                SET is_active = false
                WHERE user_id = NEW.user_id
                AND id != NEW.id
                AND is_active = true;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger para mantener única conexión activa por usuario
        DROP TRIGGER IF EXISTS ensure_single_active_connection_trigger ON data_connections;
        CREATE TRIGGER ensure_single_active_connection_trigger
            BEFORE UPDATE ON data_connections
            FOR EACH ROW
            WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
            EXECUTE FUNCTION ensure_single_active_connection();

        RAISE NOTICE 'Columna is_active agregada exitosamente a data_connections';
    ELSE
        RAISE NOTICE 'La columna is_active ya existe en data_connections';
    END IF;
END
$$;

-- Verificar el resultado
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'data_connections'
AND column_name = 'is_active';
```

#### Método 2: Usando el Script Node.js (Opcional)

Si prefieres usar el script automatizado:

```bash
# Instalar dependencias adicionales
npm install dotenv

# Configurar SUPABASE_SERVICE_ROLE_KEY en .env
# Ejecutar el script
node scripts/migrate-database.js
```

### 2. Verificación de la Migración

El script incluye verificaciones automáticas y te mostrará:

- ✅ "Columna is_active agregada exitosamente" si es exitoso
- ℹ️ "La columna is_active ya existe" si ya está aplicada

**Resultado esperado:**

```
column_name | data_type | column_default | is_nullable
is_active   | boolean   | false          | YES
```

### 3. Configuración de Variables de Entorno

Asegúrese de que las siguientes variables estén configuradas en su archivo `.env`:

```env
# Supabase (Requerido)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Power Automate (si está usando)
VITE_POWERAUTOMATE_POST_URL=your_power_automate_post_url
VITE_POWERAUTOMATE_GET_URL_SS=your_power_automate_get_url

# Para Edge Functions y scripts (opcional)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Reiniciar la Aplicación

Después de la migración:

```bash
# Detener el servidor si está corriendo (Ctrl+C)
# Reiniciar la aplicación
npm run dev
```

### 5. Prueba del Sistema

1. **Recarga la página web** de tu aplicación
2. **Error 406 desaparecerá** - Ya no verás errores relacionados con `is_active`
3. **Acceso a la nueva sección**: Navegue a "Gestión de Conexiones" en el sidebar
4. **Verificar detección automática**: Si usaba Power Automate, debería ver un botón "Configurar Power Automate"
5. **Crear conexión automática**: Haga clic en "Configurar Power Automate" para crear la conexión
6. **Verificar información de fuente**: En las páginas de Disponibilidad, Solicitudes y Confirmaciones, debería ver la información de la fuente de datos (solo visible para administradores)
7. **Los botones "Activar" funcionarán correctamente**

### 6. Migración de Usuarios Existentes

Para usuarios que ya estaban usando Power Automate:

1. **Detección automática**: El sistema detecta automáticamente si está usando Power Automate
2. **Creación de conexión**: Use el botón "Configurar Power Automate" en la página de Gestión de Conexiones
3. **Activación automática**: La nueva conexión se marca como activa automáticamente
4. **Sin interrupción**: Los usuarios pueden seguir trabajando normalmente durante el proceso

## 🎯 ¿Qué hace esta migración?

1. **Agrega la columna `is_active`** de tipo BOOLEAN con valor por defecto `false`
2. **Crea un índice optimizado** para consultas de conexión activa
3. **Implementa una función de trigger** que asegura que solo una conexión esté activa por usuario
4. **Es segura**: No afecta datos existentes y se puede ejecutar múltiples veces

## Características del Nuevo Sistema

### Conexiones Soportadas

- **Power Automate**: Integración con SharePoint via Power Automate
- **Supabase**: Base de datos nativa
- **MongoDB**: Base de datos NoSQL
- **Tableau**: Análisis de datos
- **Smartsheet**: Hojas de cálculo colaborativas

### Seguridad

- Encriptación AES-GCM para credenciales sensibles
- Derivación de claves PBKDF2 con 100,000+ iteraciones
- Almacenamiento seguro con zero-knowledge encryption
- Información sensible solo visible para administradores

### Funcionalidades

- Cambio dinámico entre fuentes de datos
- Mapeo automático de campos
- Validación de estructura de datos
- Sistema de conexión activa única por usuario
- Interfaz administrativa para gestión de conexiones
- Manejo de errores robusto con fallbacks
- Compatibilidad retroactiva completa

## Solución de Problemas

### Error: "406 Not Acceptable" relacionado con is_active

- **Causa**: La columna `is_active` no existe en la base de datos
- **Solución**: Ejecutar el script SQL de migración como se describe en el Paso 1

### No se muestra información de fuente de datos

- **Causa**: Usuario no tiene permisos de administrador
- **Comportamiento esperado**: La información solo es visible para administradores

### Datos de disponibilidad no se muestran

- **Verificar**:
  1. Que la conexión esté marcada como activa
  2. Que las variables de entorno estén configuradas correctamente
  3. Que el servicio externo (Power Automate) esté accesible
  4. Revisar la consola del navegador para mensajes de depuración

### Error al crear conexión Power Automate

- **Verificar**:
  1. Variables VITE*POWERAUTOMATE*\* están configuradas
  2. Usuario tiene permisos para acceder a los endpoints
  3. Red permite acceso a Power Automate

## Rollback (si es necesario)

⚠️ **Advertencia**: Solo realizar rollback si es absolutamente necesario

```sql
-- Eliminar componentes en orden inverso
DROP TRIGGER IF EXISTS ensure_single_active_connection_trigger ON data_connections;
DROP FUNCTION IF EXISTS ensure_single_active_connection();
DROP INDEX IF EXISTS idx_data_connections_active;
ALTER TABLE data_connections DROP COLUMN IF EXISTS is_active;
```

## Soporte y Depuración

### Logs de Depuración

El sistema incluye logs detallados en la consola del navegador:

- Información de conexión activa
- Detalles de mapeo de campos
- Errores de comunicación con APIs externas
- Estado de fallbacks de compatibilidad

### Verificación de Estado

Para verificar el estado del sistema:

```sql
-- Verificar conexiones existentes
SELECT id, name, connection_type, is_active, created_at
FROM data_connections
ORDER BY created_at DESC;

-- Verificar estructura de tabla
\d data_connections;
```

## 📁 Archivos Relacionados

- **Migración**: `sql/add_is_active_column.sql`
- **Schema completo**: `sql/create_data_connections_table.sql`
- **Servicio Principal**: `src/services/connectionService.js`
- **Servicio de Datos**: `src/services/dataSourceService.js`
- **Servicio de Reservas**: `src/services/reservationService.js`
- **Interfaz Principal**: `src/pages/GestionConexiones.jsx`
- **Componente de Información**: `src/components/DataSourceInfo.jsx`
- **Script de Migración**: `scripts/migrate-database.js`

## Notas Importantes

- **Compatibilidad Total**: El sistema mantiene 100% de compatibilidad con la estructura de datos actual
- **Sin Pérdida de Datos**: La migración no modifica datos existentes, solo agrega funcionalidad
- **Fallbacks Robustos**: Si falla alguna funcionalidad nueva, el sistema opera con la funcionalidad original
- **Migración Gradual**: No es necesario migrar todas las conexiones a la vez
- **Reversible**: Todos los cambios pueden revertirse si es necesario
- **Seguridad Mantenida**: Las credenciales existentes siguen siendo seguras
- **Administración Granular**: Los administradores tienen control total sobre las conexiones y pueden ver información detallada del sistema
