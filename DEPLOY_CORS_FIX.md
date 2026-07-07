# Solución Error CORS - Guía de Deploy

## Problema
El error CORS ocurre porque los cambios en el backend no están desplegados en Vercel.

## Archivos Modificados

### Backend-Go (Recomendado)
1. `backend-go/cmd/api/main.go` - Middleware CORS configurado
2. `backend-go/.env.example` - Variable `URL_FRONTEND` agregada
3. `backend-go/vercel.json` - Configuración de Vercel creada

### Backend Node.js (Alternativa)
1. `backend/src/index.js` - CORS configurado con allowedOrigins
2. `backend/vercel.json` - Configuración de Vercel creada
3. `frontend/src/services/apiClient.js` - credentials: 'include'

## Pasos para Deploy

### Opción 1: Git + Vercel (Recomendado)

```bash
# 1. Navegar al directorio del proyecto
cd c:\Users\julian.estefan\Desktop\form-cupos

# 2. Agregar todos los cambios
git add .

# 3. Crear commit
git commit -m "fix: Configurar CORS para frontend en Vercel

- Agregar middleware CORS en backend-go
- Configurar variable URL_FRONTEND
- Crear vercel.json para backend
- Agregar credentials al apiClient"

# 4. Push al repositorio remoto
git push origin main
```

### Opción 2: Vercel Dashboard

1. Ir a https://vercel.com/dashboard
2. Seleccionar tu proyecto backend
3. Ir a "Deployments"
4. Click en "Redeploy" en el deployment más reciente

### Opción 3: Vercel CLI

```bash
# Instalar Vercel CLI si no está instalado
npm install -g vercel

# Login a Vercel
vercel login

# Navegar al backend
cd backend-go

# Deploy a producción
vercel --prod
```

## Variables de Entorno en Vercel

Después del deploy, configura en Vercel Dashboard → Settings → Environment Variables:

```
URL_FRONTEND=https://app-cupos-frontend.vercel.app
DATABASE_URL=tu_url_de_postgres
JWT_SECRET=tu_secreto_jwt
PORT=5002
```

## Verificación

Después del deploy:

1. Abrir DevTools del navegador (F12)
2. Ir a la pestaña "Network"
3. Intentar loguearse
4. Verificar que la respuesta del login incluya headers:
   - `Access-Control-Allow-Origin: https://app-cupos-frontend.vercel.app`
   - `Access-Control-Allow-Credentials: true`

## Notas Importantes

- Vercel puede tardar 1-5 minutos en completar el deploy
- El frontend debe estar usando la URL correcta del backend en `VITE_API_URL`
- Si usas backend-go, asegúrate que el `main` binario esté compilado correctamente
