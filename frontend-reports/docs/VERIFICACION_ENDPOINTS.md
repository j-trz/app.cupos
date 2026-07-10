# Verificación de Endpoints - Aplicación Cupos

## ✅ Checklist de Deploy Completo

### 1. Backend Desplegado en Render
- [ ] URL: https://panel-cupos.onrender.com
- [ ] Health check: https://panel-cupos.onrender.com/health
- [ ] Logs sin errores críticos

### 2. Frontend Desplegado en Vercel
- [ ] URL del frontend funcionando
- [ ] Login correctamente configurado
- [ ] Conexión con backend establecida

## 🔧 Tests de Endpoints

### A. Endpoint de Health Check
```bash
curl https://panel-cupos.onrender.com/health
```
**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "cors": "enabled",
  "environment": "production"
}
```

### B. Test de Upload (POST)
```bash
# Con archivos reales
curl -X POST https://panel-cupos.onrender.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "cuposFile=@cupos.xlsx" \
  -F "pasajerosFile=@pasajeros.xlsx"
```
**Respuesta esperada:**
```json
{
  "ok": true,
  "cuposPath": "cupos/USER_ID_Gestion_de_Cupos_JTT.xlsx",
  "pasajerosPath": "pasajeros/USER_ID_Planilla_de_pasajeros_-_Cupos_JT.xlsx",
  "message": "Archivos subidos exitosamente"
}
```

### C. Test de Login
```bash
curl -X POST https://panel-cupos.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### D. Test de Datos (con filtros corregidos)
```bash
curl -X POST https://panel-cupos.onrender.com/api/evolucion-pasajeros \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user-id",
    "filters": {
      "Tipo de operación": "CUPOS",
      "Temporada": "2024"
    }
  }'
```

## 🚨 Problemas Identificados y Solucionados

### 1. ✅ Error de Chart.js
- **Problema**: `Cannot read properties of null (reading 'getContext')`
- **Solución**: Renderizado condicional del canvas cuando `!isLoading`

### 2. ✅ Error de Upload
- **Problema**: URL relativa `/api/upload` → 404 en Vercel
- **Solución**: URL absoluta `https://panel-cupos.onrender.com/api/upload`

### 3. ✅ Error de formato de respuesta
- **Problema**: Backend devolvía `{ ok: true }`, frontend esperaba `{ cuposPath, pasajerosPath }`
- **Solución**: Respuesta completa con todos los campos necesarios

### 4. ✅ Manejo de errores mejorado
- **Problema**: Errores 404 intentando parsearse como JSON
- **Solución**: Detección de tipo de respuesta y mensajes específicos

### 5. ✅ Estados de loading optimizados
- **Problema**: Loading bloqueaba toda la UI
- **Solución**: Estados separados + loading "por detrás" con z-index bajo

### 6. ✅ Sistema de filtros corregido
- **Problema**: Formato inconsistente de filtros entre endpoints
- **Solución**: Formato unificado `{ userId, filters: {...} }`

## 📋 Instrucciones Finales de Deploy

### Para el Usuario:

1. **Deploy del Backend**:
   ```bash
   # En Render, conectar al repositorio
   # Usar el directorio: backend/
   # Build command: npm install
   # Start command: npm start
   ```

2. **Variables de Entorno en Render**:
   ```
   SUPABASE_URL=tu_supabase_url
   SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_KEY=tu_service_key
   NODE_ENV=production
   ```

3. **Deploy del Frontend**:
   ```bash
   # En Vercel, conectar al repositorio
   # Usar el directorio: frontend/
   # Framework preset: Vite
   ```

4. **Variables de Entorno en Vercel**:
   ```
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

## ✅ Verificación Final

Una vez desplegado, probar:

1. **Login** → ✅ Debe autenticar correctamente
2. **Upload** → ✅ Debe subir archivos sin errores JSON
3. **Charts** → ✅ Debe mostrar gráficos sin errores de canvas
4. **Filtros** → ✅ Debe aplicar filtros consistentemente
5. **Loading** → ✅ Debe mostrar spinners elegantes

## 📞 Support

Si algún endpoint falla:
1. Verificar logs en Render Dashboard
2. Confirmar variables de entorno
3. Testear endpoints individualmente con curl
4. Verificar CORS en respuestas

---
**Estado actual**: ✅ Código corregido y listo para deploy
**Próximo paso**: Deploy en Render + testing final