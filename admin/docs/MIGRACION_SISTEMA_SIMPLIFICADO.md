# Migración a Sistema Simplificado de Conexiones API

## 🎯 Resumen de Cambios

Se ha simplificado completamente el sistema de conexiones API eliminando toda la encriptación para facilitar la conexión y mapeo de APIs. Los cambios principales son:

1. **Eliminación de encriptación**: Las credenciales ahora se almacenan en texto plano en la base de datos
2. **Eliminación de Edge Functions**: No se usan más Edge Functions para el manejo de credenciales
3. **Almacenamiento directo**: Las credenciales se guardan directamente en la tabla `api_credentials`
4. **Interfaz simplificada**: El componente GestionConexiones funciona sin complejidad adicional

## 📋 Pasos para Migrar

### 1. Ejecutar Script SQL en Supabase

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Crea una nueva consulta
4. Copia y pega el contenido del archivo `sql/migrate_to_simple_credentials.sql`
5. Ejecuta el script haciendo clic en **Run**

### 2. Verificar la Migración

Después de ejecutar el script, verifica que la tabla se creó correctamente:

```sql
SELECT * FROM api_credentials LIMIT 1;
```

Deberías ver una tabla vacía con las columnas:

- `id`
- `connection_id`
- `user_id`
- `credential_key`
- `credential_value`
- `created_at`
- `updated_at`

## 🚀 Cómo Funciona el Nuevo Sistema

### Almacenamiento de Credenciales

Las credenciales ahora se almacenan de forma simple:

```javascript
// Ejemplo de cómo se guardan las credenciales
{
  connection_id: "uuid-de-la-conexion",
  user_id: "uuid-del-usuario",
  credential_key: "flowUrl",
  credential_value: "https://prod-xx.westeurope.logic.azure.com:443/workflows/..."
}
```

### Ventajas del Sistema Simplificado

✅ **Más fácil de depurar**: Puedes ver directamente las credenciales en la base de datos  
✅ **Menos complejidad**: No hay Edge Functions ni encriptación que gestionar  
✅ **Más rápido**: Las operaciones son directas a la base de datos  
✅ **Fácil de mantener**: Código más simple y directo

### Consideraciones de Seguridad

⚠️ **Importante**: Este sistema almacena las credenciales en texto plano. Asegúrate de:

1. **RLS activado**: Las políticas de seguridad a nivel de fila están configuradas para que cada usuario solo vea sus propias credenciales
2. **HTTPS siempre**: Toda comunicación con Supabase debe ser por HTTPS
3. **Variables de entorno**: No hardcodees credenciales en el código
4. **Acceso limitado**: Solo usuarios autenticados pueden acceder a sus propias credenciales

## 📝 Cambios en el Código

### ConnectionService.js

El servicio ahora es mucho más simple:

- `createConnection()`: Guarda directamente en `api_credentials`
- `getDecryptedCredentials()`: Lee directamente de `api_credentials`
- `updateConnection()`: Actualiza directamente en `api_credentials`
- `deleteConnection()`: Elimina directamente de `api_credentials`
- `testConnection()`: Verifica que existan credenciales y actualiza el estado

### GestionConexiones.jsx

El componente sigue funcionando igual, pero ahora:

- No hay delays por encriptación/desencriptación
- Las operaciones son más rápidas
- El debugging es más fácil

## 🔧 Troubleshooting

### Error: "No se encontraron credenciales"

Verifica que la tabla `api_credentials` existe:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'api_credentials';
```

### Error: "Permission denied"

Verifica que las políticas RLS están activas:

```sql
SELECT * FROM pg_policies
WHERE tablename = 'api_credentials';
```

### Las credenciales no se guardan

Verifica que el usuario esté autenticado y que `user_id` coincida con `auth.uid()`.

## 📚 Próximos Pasos

1. **Mapeo de Campos**: Se está trabajando en una interfaz visual para mapear campos de diferentes APIs
2. **Validación**: Agregar validación de credenciales antes de guardar
3. **Importación/Exportación**: Permitir exportar e importar configuraciones de conexiones

## ❓ Soporte

Si encuentras problemas con la migración:

1. Revisa los logs en Supabase Dashboard > Logs
2. Verifica que el script SQL se ejecutó completamente
3. Asegúrate de que tu usuario tiene los permisos necesarios

---

**Última actualización**: 10 de Octubre de 2025  
**Versión**: 1.0.0 (Sistema Simplificado)
