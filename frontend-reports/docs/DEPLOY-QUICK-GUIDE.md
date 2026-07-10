# 🚀 Guía Rápida de Deploy - Dashboard Cupos

## Paso 1: Preparar el código

### Commit y push los cambios a GitHub
```bash
git add .
git commit -m "Backend listo para deploy con CORS configurado"
git push origin main
```

## Paso 2: Deploy Backend en Render

### 1. Crear cuenta en Render
- Ve a [https://render.com](https://render.com)
- Regístrate con GitHub

### 2. Crear nuevo Web Service
1. Click en **"New +"** → **"Web Service"**
2. **Conectar repositorio GitHub**
3. Buscar y seleccionar tu repositorio: `reportes-dash`

### 3. Configuración del servicio
Completa estos campos EXACTAMENTE así:

```
Name: panel-cupos
Root Directory: backend
Environment: Node
Build Command: npm install
Start Command: npm start
```

### 4. Variables de Entorno (IMPORTANTE)
Click en **"Advanced"** y agregar estas variables:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | (tu URL de Supabase, ej: https://xxxxx.supabase.co) |
| `SUPABASE_ANON_KEY` | (tu anon key de Supabase) |
| `JWT_SECRET` | (genera una clave segura, ej: usar https://randomkeygen.com/) |
| `NODE_ENV` | production |

**NO agregues PORT** - Render lo asigna automáticamente

### 5. Deploy
1. Click en **"Create Web Service"**
2. Esperar 5-10 minutos para el primer deploy
3. Cuando termine, copia la URL (será algo como: `https://panel-cupos.onrender.com`)

## Paso 3: Verificar Backend

### Test rápido
Abre en tu navegador:
```
https://panel-cupos.onrender.com/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "...",
  "cors": "enabled",
  "environment": "production"
}
```

## Paso 4: Actualizar Frontend (si la URL cambió)

Si tu URL de Render NO es `https://panel-cupos.onrender.com`, actualiza:

### frontend/src/utils/apiClient.js
```javascript
const API_URL = 'https://TU-URL-DE-RENDER-AQUI';
```

### Commit y push
```bash
git add frontend/src/utils/apiClient.js
git commit -m "Actualizar URL del backend"
git push origin main
```

## Paso 5: Frontend ya está en Vercel

Tu frontend ya está desplegado en:
- [https://dashboard-cupos.vercel.app](https://dashboard-cupos.vercel.app)

Si necesitas actualizarlo, Vercel lo hará automáticamente cuando hagas push a GitHub.

## 🎯 Checklist Final

- [ ] Backend desplegado en Render
- [ ] Health check funcionando (`/health`)
- [ ] URL del backend correcta en `apiClient.js`
- [ ] Frontend funcionando en Vercel
- [ ] Login funcionando correctamente
- [ ] No hay errores de CORS en la consola

## 🐛 Troubleshooting

### Si ves errores de CORS:
1. Verifica que el backend esté corriendo (check `/health`)
2. Asegúrate de que la URL en `apiClient.js` sea exacta
3. Espera 1-2 minutos y recarga la página (Render puede estar iniciando)

### Si el backend no responde:
- En Render Dashboard → Logs → Ver si hay errores
- Verificar que todas las variables de entorno estén configuradas
- El servicio gratuito se duerme después de 15 min de inactividad

### Comando para probar localmente primero:
```bash
cd backend
npm install
npm start
```

Luego abre `test-cors.html` en tu navegador para verificar.

## 📞 Necesitas ayuda?

1. Revisa los logs en Render Dashboard
2. Verifica las variables de entorno
3. Asegúrate de que Supabase tenga las credenciales correctas
4. El archivo `DEPLOYMENT.md` tiene información más detallada

## 🎉 ¡Listo!

Una vez que todo esté funcionando:
1. Tu app estará en: https://dashboard-cupos.vercel.app
2. El backend estará en: https://panel-cupos.onrender.com (o tu URL)
3. Los cambios futuros se desplegarán automáticamente al hacer push a GitHub