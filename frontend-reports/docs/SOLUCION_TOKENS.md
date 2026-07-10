# Solución Problema de Tokens - Upload Endpoint

## 🚨 Problema Identificado

**Error:** `Token inválido` al intentar subir archivos
**Causa:** Inconsistencia en configuración de Supabase entre login y upload

## ✅ Solución Implementada

### Problema Original:
<<<<<<< HEAD
- `api-login.js` usaba `SUPABASE_SERVICE_KEY`
=======
- `api-login.js` usaba `SUPABASE_SERVICE_KEY` 
>>>>>>> main
- `api-upload.js` usaba `SUPABASE_SERVICE_KEY` para autenticación
- Incompatibilidad entre generación y verificación de tokens

### Solución:
1. **Login** usa `SUPABASE_ANON_KEY` (compatible con frontend)
2. **Upload** usa dos clientes:
   - `supabaseAuth` con `SUPABASE_ANON_KEY` para verificar tokens
   - `supabaseAdmin` con `SUPABASE_SERVICE_KEY` para operaciones de storage

## 📁 Archivos Modificados

### 1. `backend/api/api-login.js`
```javascript
// ANTES:
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// DESPUÉS:
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
```

### 2. `backend/api/api-upload.js`
```javascript
// ANTES:
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// DESPUÉS:
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Para verificar tokens:
const { data, error } = await supabaseAuth.auth.getUser(token);

// Para upload:
await supabaseAdmin.storage.from('archivos-cupos').upload(cuposPath, cuposFile.buffer, { upsert: true });
```

### 3. `frontend/src/components/FileUploadModal.jsx`
```javascript
// ANTES:
const resp = await fetch('/api/upload', {

// DESPUÉS:
const resp = await fetch('https://panel-cupos.onrender.com/api/upload', {
```

## 🔧 Variables de Entorno Necesarias

### En Render (Backend):
```
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_key
NODE_ENV=production
```

### En Vercel (Frontend):
```
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## 🧪 Test de Verificación

### 1. Test de Login
```bash
curl -X POST https://panel-cupos.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"TuPassword123!"}'
```

**Respuesta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsI..."
}
```

### 2. Test de Upload
```bash
curl -X POST https://panel-cupos.onrender.com/api/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsI..." \
  -F "cuposFile=@cupos.xlsx" \
  -F "pasajerosFile=@pasajeros.xlsx"
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "cuposPath": "cupos/user_id_Gestion_de_Cupos_JTT.xlsx",
  "pasajerosPath": "pasajeros/user_id_Planilla_de_pasajeros_-_Cupos_JT.xlsx",
  "message": "Archivos subidos exitosamente"
}
```

## 🔄 Flujo Correcto de Autenticación

1. **Frontend Login** → `https://panel-cupos.onrender.com/api/login`
2. **Backend Login** usa `ANON_KEY` para autenticar con Supabase
3. **Token JWT** se devuelve al frontend
4. **Frontend Upload** → `https://panel-cupos.onrender.com/api/upload` con token
5. **Backend Upload** verifica token con `ANON_KEY` y ejecuta upload con `SERVICE_KEY`

## ⚡ Beneficios de la Solución

✅ **Compatibilidad**: Tokens generados y verificados con la misma configuración
✅ **Seguridad**: Operaciones administrativas siguen usando SERVICE_KEY
✅ **Separación**: Clara distinción entre autenticación y operaciones de storage
✅ **Mantenibilidad**: Configuración consistente y predecible

## 🚀 Deploy Instructions

1. **Deploy Backend con cambios**:
   ```bash
   git add .
   git commit -m "Fix token authentication for upload endpoint"
   git push origin main
   ```

2. **Verificar en Render**:
   - Variables de entorno correctas
   - Deploy exitoso sin errores
   - Health check funcionando

3. **Verificar en Frontend**:
   - Login funcional
   - Upload sin errores de token
   - Mensajes de error específicos

---
**Estado:** ✅ Problema solucionado y listo para deploy
**Próximo paso:** Deploy y testing final