# 🎯 Prueba en la Aplicación Real

## 🚨 Problema Actual

Las Edge Functions están dando error HTTP 400 en el diagnóstico, probablemente por errores de compilación o despliegue.

## 🚀 Solución: Probar Directamente en tu App

En lugar de usar el diagnóstico, vamos a probar directamente en tu aplicación React:

### **Paso 1: Verificar los Cambios**

Confirma que tienes estos cambios en `src/services/connectionService.js` (líneas 150-160):

```javascript
// TEMPORAL: Pasar MASTER_ENCRYPTION_KEY como parámetro
const TEMP_MASTER_KEY = "my-application-master-key-2024-secure-32-chars"; // 32+ caracteres

const { data, error } = await supabase.functions.invoke(
  "get-decrypted-credentials",
  {
    body: {
      connection_id: connectionId,
      master_encryption_key: TEMP_MASTER_KEY, // TEMPORAL
    },
  }
);
```

### **Paso 2: Probar en la App**

1. **Abre tu aplicación React**
2. **Ve a la sección de conexiones**
3. **Intenta configurar o usar una conexión Supabase**
4. **Observa la consola del navegador**

### **Paso 3: Qué Buscar**

**✅ ÉXITO - Si ves:**

- No más error "Failed to send a request to the Edge Function"
- No más fallback automático a Power Automate
- Credenciales se desencriptan correctamente

**❌ ERROR - Si ves:**

- Mismo error HTTP 400
- Error de sintaxis en Edge Function
- Otros errores específicos

### **Paso 4: Logs de Depuración**

Si aún hay errores:

1. Ve a **https://hdsmvuwrdwfivujjnubr.supabase.co**
2. **Edge Functions** → **get-decrypted-credentials** → **Logs**
3. Busca errores específicos en los logs
4. Compárteme los errores que veas

### **Alternativa: Edge Function Simplificada**

Si sigue fallando, podemos usar una versión simplificada que no dependa de Secrets:

```typescript
// Versión ultra-simple que solo usa el parámetro
const { connection_id, master_encryption_key } = requestBody;

if (!master_encryption_key || master_encryption_key.length < 32) {
  throw new Error(
    "master_encryption_key is required and must be 32+ characters"
  );
}

// Usar directamente el parámetro, ignorar Deno.env completamente
const masterKey = master_encryption_key;
```

## 🎯 Pregunta Clave

**¿Quieres probar directamente en tu aplicación React ahora, o prefieres que simplifiquemos la Edge Function primero?**
