# Guía de Despliegue Completa - Dashboard Cupos

## Arquitectura

- **Frontend**: React + Vite desplegado en Vercel
- **Backend**: Node.js + Express desplegado en Render
- **Base de Datos**: Supabase (PostgreSQL)
- **Almacenamiento**: Supabase Storage

## 1. Configuración de Supabase

### Crear proyecto en Supabase

1. Ir a [https://supabase.com](https://supabase.com)
2. Crear un nuevo proyecto
3. Guardar las siguientes credenciales:
   - `Project URL` (SUPABASE_URL)
   - `anon public` key (SUPABASE_ANON_KEY)

### Configurar autenticación

1. En Supabase Dashboard > Authentication > Providers
2. Habilitar "Email" como proveedor
3. En Authentication > Users, crear un usuario de prueba

### Configurar Storage

1. En Storage > Create a new bucket
2. Nombre: `archivos-excel`
3. Public bucket: NO (privado)
4. Configurar políticas RLS según necesidad

## 2. Despliegue del Backend en Render

### Preparación

1. Asegúrate de que tu código esté en GitHub
2. El backend debe estar en la carpeta `/backend`

### Pasos en Render

1. **Crear cuenta en [Render](https://render.com)**

2. **Nuevo Web Service:**
   - Click en "New +" > "Web Service"
   - Conectar tu repositorio de GitHub
   - Autorizar acceso a tu repo

3. **Configuración del servicio:**
   ```
   Name: panel-cupos (o el nombre que prefieras)
   Root Directory: backend
   Environment: Node
   Region: Oregon (US West) o la más cercana
   Branch: main
   Build Command: npm install
   Start Command: npm start
   ```

4. **Plan:**
   - Seleccionar "Free" para empezar

5. **Variables de Entorno (Environment Variables):**

   Agregar las siguientes (sin comillas en los valores):

   ```
   SUPABASE_URL=https://tuproyecto.supabase.co
   SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   JWT_SECRET=genera_una_clave_segura_aleatoria
   NODE_ENV=production
   ```

   **IMPORTANTE**: NO agregues PORT, Render lo asigna automáticamente

6. **Deploy:**
   - Click en "Create Web Service"
   - Esperar a que el deploy termine
   - Copiar la URL del servicio (ej: https://panel-cupos.onrender.com)

### Verificar Backend

Visita: `https://tu-backend.onrender.com/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-11-05T16:00:00.000Z"
}
```

## 3. Despliegue del Frontend en Vercel

### Preparación

1. Actualizar `frontend/src/utils/apiClient.js`:
   ```javascript
   const API_URL = 'https://panel-cupos.onrender.com';
   ```

2. Commit y push los cambios a GitHub

### Pasos en Vercel

1. **Crear cuenta en [Vercel](https://vercel.com)**

2. **Importar proyecto:**
   - Click en "New Project"
   - Importar tu repositorio de GitHub
   - Autorizar acceso

3. **Configuración del proyecto:**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Variables de Entorno:**

   Agregar en Vercel:
   ```
   VITE_API_URL=https://panel-cupos.onrender.com
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

5. **Deploy:**
   - Click en "Deploy"
   - Esperar a que termine
   - Copiar la URL del frontend (ej: https://dashboard-cupos.vercel.app)

## 4. Configuración Post-Deploy

### Actualizar CORS en Backend

Si la URL de Vercel es diferente a la esperada:

1. En Render, ir a tu servicio
2. Environment > Edit Environment Variables
3. Agregar/actualizar:
   ```
   FRONTEND_URL=https://tu-app.vercel.app
   ```

4. El servicio se reiniciará automáticamente

### Actualizar Frontend si es necesario

Si la URL del backend cambió:

1. Actualizar `frontend/src/utils/apiClient.js`
2. Commit y push
3. Vercel desplegará automáticamente

## 5. Testing

### Pruebas básicas

1. **Health Check Backend:**
   ```
   curl https://tu-backend.onrender.com/health
   ```

2. **Login:**
   - Ir a https://tu-frontend.vercel.app
   - Intentar login con las credenciales de Supabase

3. **Subida de archivos:**
   - Después del login, probar subir un archivo Excel

## 6. Troubleshooting

### Error de CORS

**Síntomas:**
- "Access to fetch... has been blocked by CORS policy"

**Solución:**
1. Verificar que la URL del frontend esté correcta en el backend
2. En backend/index.js, verificar `allowedOrigins`
3. Reiniciar el servicio en Render

### Error 404 en API calls

**Síntomas:**
- Las llamadas API retornan 404

**Solución:**
1. Verificar que la URL del backend en apiClient.js sea correcta
2. Verificar que todos los endpoints estén con `/api/` prefix
3. Verificar que el backend esté corriendo

### Error de autenticación

**Síntomas:**
- Login falla con "Credenciales incorrectas"

**Solución:**
1. Verificar credenciales de Supabase en variables de entorno
2. Verificar que el usuario existe en Supabase
3. Revisar logs en Render

### Backend se apaga después de inactividad

**Nota:** En el plan gratuito de Render, el servicio se apaga después de 15 minutos de inactividad y tarda ~30 segundos en reiniciarse con la primera petición.

**Soluciones:**
1. Actualizar a un plan pago
2. Implementar un "keep-alive" desde el frontend
3. Usar un servicio de monitoring externo

## 7. Comandos Útiles

### Backend (local)
```bash
cd backend
npm install
npm start
```

### Frontend (local)
```bash
cd frontend
npm install
npm run dev     # desarrollo
npm run build   # producción
npm run preview # preview de producción
```

## 8. Seguridad - Checklist

- [ ] Variables de entorno configuradas en producción
- [ ] CORS configurado solo para dominios autorizados
- [ ] Rate limiting activo en endpoints críticos
- [ ] Contraseñas con requisitos mínimos
- [ ] JWT secret fuerte y único
- [ ] HTTPS en ambos servicios
- [ ] Supabase RLS configurado
- [ ] Logs monitoreados regularmente

## 9. Monitoreo

### Render
- Dashboard > Logs para ver logs en tiempo real
- Metrics para ver uso de recursos

### Vercel
- Dashboard > Functions para ver logs
- Analytics para ver métricas de uso

### Supabase
- Dashboard para ver uso de base de datos
- Storage para ver archivos subidos

## 10. Actualizaciones

### Backend
1. Push cambios a GitHub
2. Render desplegará automáticamente

### Frontend
1. Push cambios a GitHub
2. Vercel desplegará automáticamente

## Notas Importantes

1. **Primer deploy puede ser lento:** Especialmente en Render, el primer build puede tardar 5-10 minutos

2. **URLs sensibles a mayúsculas:** Asegúrate de que las URLs sean exactas

3. **Variables de entorno:** Nunca hardcodees credenciales en el código

4. **Backups:** Considera hacer backups regulares de Supabase

5. **Costos:**
   - Vercel: Gratis para proyectos personales
   - Render: Gratis con limitaciones (servicio se apaga tras inactividad)
   - Supabase: Gratis hasta 500MB de storage y 2GB de transferencia

## Contacto y Soporte

Para problemas específicos:
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs