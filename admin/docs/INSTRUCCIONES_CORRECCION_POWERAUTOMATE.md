# Instrucciones para Corregir Error de Power Automate

## Problema Identificado

Error al crear conexión Power Automate automáticamente:

```
Error: new row for relation "data_connections" violates check constraint "data_connections_type_check"
```

## Causa del Error

La base de datos tiene una restricción que no permite el tipo `'powerautomate'` en la tabla `data_connections`. Esto sucede porque:

1. La tabla fue creada con una versión anterior del constraint
2. O el constraint se aplicó incorrectamente

## Solución

### Paso 1: Ejecutar Script SQL

Necesitas ejecutar el archivo `sql/fix_powerautomate_constraint.sql` en tu base de datos Supabase:

```sql
-- Eliminar la restricción existente si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'data_connections_type_check'
        AND table_name = 'data_connections'
    ) THEN
        ALTER TABLE data_connections DROP CONSTRAINT data_connections_type_check;
        RAISE NOTICE 'Constraint data_connections_type_check eliminado';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo eliminar constraint: %', SQLERRM;
END $$;

-- Crear la nueva restricción con todos los tipos soportados
ALTER TABLE data_connections
ADD CONSTRAINT data_connections_type_check
CHECK (type IN ('powerautomate', 'supabase', 'smartsheet', 'mongodb', 'tableau'));
```

### Paso 2: Cómo Ejecutar el Script

#### Opción A: Dashboard de Supabase

1. Ve al Dashboard de Supabase
2. Navega a SQL Editor
3. Copia y pega el contenido de `sql/fix_powerautomate_constraint.sql`
4. Ejecuta el script

#### Opción B: CLI de Supabase (si tienes acceso)

```bash
supabase db sql --local < sql/fix_powerautomate_constraint.sql
```

### Paso 3: Verificar la Corrección

Después de ejecutar el script, deberías ver:

```
NOTICE: Constraint data_connections_type_check eliminado
```

Y luego la nueva restricción se aplicará correctamente.

### Paso 4: Probar la Aplicación

1. Recarga la aplicación en el navegador
2. Haz login como admin
3. La conexión Power Automate debería crearse automáticamente
4. Ve a **Gestión de Conexiones** para verificar que aparece en la tabla

## Verificación Manual

Si quieres verificar que el constraint está correcto, ejecuta:

```sql
SELECT
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'data_connections_type_check';
```

Debería mostrar:

```
constraint_name: data_connections_type_check
check_clause: (type IN ('powerautomate', 'supabase', 'smartsheet', 'mongodb', 'tableau'))
```

## Resultado Esperado

Después de aplicar la corrección:

✅ **NO habrá** botón "Configurar Power Automate"
✅ **SÍ aparecerá** la conexión "Power Automate Principal" en la tabla
✅ Estará marcada como **activa** automáticamente
✅ Podrás gestionarla como cualquier otra conexión

## Si Persiste el Error

Si después de aplicar el script SQL el error persiste, ejecuta esto para verificar el estado de la tabla:

```sql
-- Verificar estructura de la tabla
\d data_connections

-- Verificar constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'data_connections'::regclass;
```

Y comparte el resultado para diagnóstico adicional.
