# Solución Completa: Token Expirado + Error 500

## 🚨 Problemas Identificados

### 1. **Token Expirado**
- **Síntoma**: Error 401 "Token inválido" después de estar logueado un tiempo
- **Causa**: JWT tokens de Supabase expiran (por defecto 1 hora)
- **Impacto**: Usuario debe hacer login cada hora

<<<<<<< HEAD
### 2. **Error 500 con Token Válido**
=======
### 2. **Error 500 con Token Válido** 
>>>>>>> main
- **Síntoma**: Error 500 incluso con token recién generado
- **Causa**: Posible problema en configuración de Supabase Storage o variables de entorno
- **Impacto**: Upload no funciona aunque autenticación sea correcta

## ✅ Soluciones Implementadas

### 1. **Renovación Automática de Tokens (Frontend)**

#### A. Listener de Eventos de Supabase
```javascript
// En App.jsx - Escucha renovaciones automáticas
useEffect(() => {
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      setToken(session?.access_token || null);
      localStorage.setItem('token', session?.access_token || '');
      console.log('Token refrescado automáticamente');
    }
    // ... otros eventos
  });
}, []);
```

#### B. Verificación Periódica
```javascript
// En App.jsx - Verifica token cada 5 minutos
useEffect(() => {
  if (!token) return;
<<<<<<< HEAD

=======
  
>>>>>>> main
  const checkAndRefreshToken = async () => {
    const session = await supabase.auth.getSession();
    if (session.data.session && session.data.session.access_token !== token) {
      setToken(session.data.session.access_token);
      localStorage.setItem('token', session.data.session.access_token);
    }
  };
<<<<<<< HEAD

=======
  
>>>>>>> main
  const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [token]);
```

#### C. Renovación Antes del Upload
```javascript
// En FileUploadModal.jsx - Renueva token antes de subir
try {
  const { supabase } = await import('../utils/supabaseClient');
  const session = await supabase.auth.getSession();
  if (session.data.session && session.data.session.access_token !== token) {
    token = session.data.session.access_token;
    localStorage.setItem('token', token);
    console.log('Token renovado antes del upload');
  }
} catch {
  console.warn('No se pudo renovar el token, usando el existente');
}
```

### 2. **Mensajes de Error Mejorados**
```javascript
// Detección específica de tokens expirados
if (resp.status === 401 && errorMessage.toLowerCase().includes('token')) {
  errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.';
}
```

### 3. **Logging Detallado del Backend**
```javascript
// En api-upload.js - Logging detallado para debugging
console.log('=== INICIO UPLOAD ===');
console.log('Usuario autenticado:', req.user?.id);
console.log('Archivos recibidos:', Object.keys(req.files || {}));
console.log('CuposFile:', cuposFile ? `${cuposFile.originalname} (${cuposFile.size} bytes)` : 'NO ENCONTRADO');
console.log('Resultado upload cupos:', res1.error ? `ERROR: ${res1.error.message}` : 'ÉXITO');
```

## 🔧 Debugging del Error 500

### Paso 1: Verificar Variables de Entorno
```bash
# En Render, verificar que estén configuradas:
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### Paso 2: Verificar Bucket de Supabase
1. **En Supabase Dashboard**:
   - Ir a Storage
   - Verificar que existe el bucket `archivos-cupos`
   - Verificar permisos de escritura

2. **Políticas de Storage (RLS)**:
   ```sql
   -- Permitir upload para usuarios autenticados
   CREATE POLICY "Allow upload for authenticated users" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'archivos-cupos');
<<<<<<< HEAD

=======
   
>>>>>>> main
   -- Permitir update para usuarios autenticados
   CREATE POLICY "Allow update for authenticated users" ON storage.objects
   FOR UPDATE TO authenticated
   WHERE bucket_id = 'archivos-cupos';
   ```

### Paso 3: Test Manual con curl
```bash
# Con token válido obtenido del login
curl -X POST https://panel-cupos.onrender.com/api/upload \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -F "cuposFile=@archivo_cupos.xlsx" \
  -F "pasajerosFile=@archivo_pasajeros.xlsx" \
  -v
```

### Paso 4: Verificar Logs de Render
1. En Render Dashboard → Tu servicio → Logs
2. Buscar los mensajes de debugging:
   ```
   === INICIO UPLOAD ===
   Usuario autenticado: 1e07c1dc-c022-4e0c-8a07-2cc86a26f5c5
   Archivos recibidos: [ 'cuposFile', 'pasajerosFile' ]
   CuposFile: archivo.xlsx (50000 bytes)
   Resultado upload cupos: ÉXITO
   ```

## 🎯 Posibles Causas del Error 500

### 1. **Bucket no existe o mal configurado**
- **Solución**: Crear bucket `archivos-cupos` en Supabase Storage

### 2. **SERVICE_KEY inválida**
- **Solución**: Verificar y re-generar la service key en Supabase

### 3. **Políticas RLS demasiado restrictivas**
- **Solución**: Ajustar políticas de storage para permitir uploads

### 4. **Formato de archivo incorrecto**
- **Solución**: Verificar que el FormData se está enviando correctamente

### 5. **Límites de tamaño de Render**
- **Solución**: Verificar que los archivos no excedan límites de Render

## 📋 Checklist de Verificación

### Backend (Render):
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso sin errores
- [ ] Logs muestran información detallada del upload
- [ ] Health check funcionando

### Supabase:
- [ ] Bucket `archivos-cupos` existe
- [ ] Políticas de storage permiten upload
- [ ] SERVICE_KEY tiene permisos de admin
- [ ] ANON_KEY válida para autenticación

### Frontend:
- [ ] Token se renueva automáticamente
- [ ] Mensajes de error específicos
- [ ] Upload con URL absoluta correcta

## 🚀 Pasos para Resolver

1. **Deploy del backend** con logging mejorado
2. **Intentar upload** y revisar logs en Render
3. **Verificar bucket** y políticas en Supabase
4. **Confirmar variables** de entorno
5. **Test manual** con curl si es necesario

---
**Con estas mejoras, deberías tener:**
- ✅ Renovación automática de tokens
- ✅ Mensajes de error específicos
- ✅ Logging detallado para debugging
- ✅ Mejor manejo de sesiones expiradas