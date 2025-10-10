# Guía para Resolver Error CORS en Edge Function power-automate-proxy

## Problema Identificado

La aplicación está experimentando errores CORS al intentar acceder a la Edge Function `power-automate-proxy`:

```
Access to fetch at 'https://hdsmvuwrdwfivujjnubr.supabase.co/functions/v1/power-automate-proxy'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

## Pasos de Verificación en Dashboard de Supabase

### 1. Verificar Estado de la Edge Function

1. Accede al dashboard de Supabase
2. Ve a **Edge Functions** en el menú lateral
3. Busca `power-automate-proxy`
4. Verifica:
   - ¿Está la función listada?
   - ¿Está activa/deployed?
   - ¿Muestra algún error de estado?

### 2. Verificar Variables de Entorno

En **Edge Functions** → `power-automate-proxy` → **Environment Variables**, verifica que estén configuradas:

```env
POWERAUTOMATE_GET_URL=<tu_url_de_disponibilidad>
POWERAUTOMATE_GET_REQUESTS_URL=<tu_url_de_solicitudes>
POWERAUTOMATE_GET_CONFIRMATIONS_URL=<tu_url_de_confirmaciones>
POWERAUTOMATE_SUBMIT_URL=<tu_url_de_envio>
```

### 3. Verificar Logs de la Función

1. Ve a **Edge Functions** → `power-automate-proxy` → **Logs**
2. Busca errores recientes, especialmente:
   - Errores de inicialización
   - Errores de variables de entorno faltantes
   - Errores de sintaxis o runtime

### 4. Si la Función NO Está Desplegada

1. Ve a **Edge Functions** → **Deploy new function**
2. Nombre de la función: `power-automate-proxy`
3. Sube el archivo: `supabase/functions/power-automate-proxy/index.ts`
4. Configura las variables de entorno listadas arriba
5. Deploy

### 5. Verificar URL de la Función

Asegúrate de que la URL en tu aplicación coincida con la URL de Supabase:

- URL esperada: `https://hdsmvuwrdwfivujjnubr.supabase.co/functions/v1/power-automate-proxy`
- Verifica que el ID del proyecto (`hdsmvuwrdwfivujjnubr`) sea correcto

## Solución Temporal Implementada

Mientras resuelves el problema con la Edge Function, hemos implementado un fallback temporal:

1. **En `connectionService.js`**: Ahora intenta usar las credenciales pero si falla con Power Automate, usa un fallback directo.

2. **En `reservationService.js`**: Si falla obtener datos por el sistema de conexiones, intenta directamente con la URL de Power Automate desde las variables de entorno.

## Verificación de Variables de Entorno en Frontend

Asegúrate de que tu archivo `.env` local tenga:

```env
VITE_SUPABASE_URL=https://hdsmvuwrdwfivujjnubr.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_POWERAUTOMATE_GET_URL=<url_directa_de_disponibilidad>
VITE_POWERAUTOMATE_GET_URL_SS=<url_directa_de_solicitudes>
```

## Pruebas Recomendadas

1. **Prueba directa de la Edge Function**:

   ```bash
   curl -X OPTIONS https://hdsmvuwrdwfivujjnubr.supabase.co/functions/v1/power-automate-proxy \
     -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: authorization, content-type"
   ```

   Debería devolver un status 200 con headers CORS.

2. **Prueba con autorización**:
   ```bash
   curl -X POST https://hdsmvuwrdwfivujjnubr.supabase.co/functions/v1/power-automate-proxy \
     -H "Authorization: Bearer <tu_token_de_usuario>" \
     -H "Content-Type: application/json" \
     -d '{"action": "get-availability"}'
   ```

## Solución Permanente

Una vez que verifiques y corrijas el problema en Supabase:

1. La Edge Function debería manejar correctamente las solicitudes CORS
2. Podrás remover los fallbacks temporales en el código
3. El sistema funcionará completamente a través de las Edge Functions

## Notas Adicionales

- El error "It does not have HTTP ok status" sugiere que la función está devolviendo un error (4xx o 5xx) antes de llegar al código de manejo de CORS
- Esto podría ser por:
  - Función no desplegada
  - Error de inicialización
  - Variables de entorno faltantes
  - Error de sintaxis en el código

## Contacto de Soporte

Si el problema persiste después de estas verificaciones, contacta el soporte de Supabase con:

- ID del proyecto: `hdsmvuwrdwfivujjnubr`
- Nombre de la función: `power-automate-proxy`
- Logs de error específicos
