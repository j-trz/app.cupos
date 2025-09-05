# Configuración de Variables de Entorno - Producción

## Resumen de Configuración

Este documento detalla todas las variables de entorno necesarias para el correcto funcionamiento de la aplicación en producción, incluyendo configuraciones para frontend, backend (Edge Functions), y servicios externos.

## 🌍 Variables de Entorno por Ambiente

### Frontend (.env.production)

```bash
# ==============================================
# CONFIGURACIÓN SUPABASE - FRONTEND
# ==============================================

# URL del proyecto Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Clave anónima de Supabase (pública, solo para autenticación)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================
# CONFIGURACIÓN DE APLICACIÓN
# ==============================================

# Entorno de ejecución (producción)
VITE_APP_ENV=production

# URL base de la aplicación (para redirects)
VITE_APP_URL=https://your-domain.com

# Habilitar/deshabilitar logs en producción (false recomendado)
VITE_DEBUG_MODE=false

# ==============================================
# CONFIGURACIÓN DE FUNCIONES EDGE
# ==============================================

# URL base para las Edge Functions
VITE_EDGE_FUNCTIONS_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1

# ==============================================
# CONFIGURACIÓN DE ANALYTICS (OPCIONAL)
# ==============================================

# Google Analytics ID (si se usa)
VITE_GA_ID=G-XXXXXXXXXX

# Sentry DSN para error tracking (si se usa)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Backend Edge Functions

#### Variables en Supabase Dashboard

Configurar en: **Supabase Dashboard > Project Settings > Edge Functions > Environment Variables**

```bash
# ==============================================
# SUPABASE SERVICE CONFIGURATION
# ==============================================

# Clave de servicio (CRÍTICA - mantener secreta)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL del proyecto Supabase
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# ==============================================
# POWER AUTOMATE ENDPOINTS
# ==============================================

# Endpoint para obtener disponibilidad
POWERAUTOMATE_GET_URL=https://prod-XX.westus.logic.azure.com/workflows/WORKFLOW_ID/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SIGNATURE

# Endpoint para obtener solicitudes
POWERAUTOMATE_GET_REQUESTS_URL=https://prod-XX.westus.logic.azure.com/workflows/WORKFLOW_ID/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SIGNATURE

# Endpoint para obtener confirmaciones
POWERAUTOMATE_GET_CONFIRMATIONS_URL=https://prod-XX.westus.logic.azure.com/workflows/WORKFLOW_ID/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SIGNATURE

# Endpoint para enviar reservas
POWERAUTOMATE_SUBMIT_URL=https://prod-XX.westus.logic.azure.com/workflows/WORKFLOW_ID/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SIGNATURE

# ==============================================
# CONFIGURACIÓN DE LOGGING Y MONITOREO
# ==============================================

# Nivel de logging (info, warn, error)
LOG_LEVEL=warn

# Habilitar logs detallados (false en producción)
DEBUG_ENABLED=false

# ==============================================
# CONFIGURACIÓN DE SEGURIDAD
# ==============================================

# Lista de dominios permitidos para CORS (separados por coma)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Tiempo de expiración de tokens en minutos
TOKEN_EXPIRY_MINUTES=60

# Habilitar rate limiting
RATE_LIMITING_ENABLED=true

# Máximo de requests por minuto por usuario
MAX_REQUESTS_PER_MINUTE=100
```

## 🔐 Obtención de Claves y URLs

### Supabase Configuration

#### URL del Proyecto
```bash
# En Supabase Dashboard > Settings > API
# Project URL: https://YOUR_PROJECT_ID.supabase.co
```

#### Clave Anónima (Frontend)
```bash
# En Supabase Dashboard > Settings > API > Project API keys
# anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Clave de Servicio (Backend)
```bash
# En Supabase Dashboard > Settings > API > Project API keys
# service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ⚠️ CRITICAL: Esta clave debe mantenerse ABSOLUTAMENTE SECRETA
```

### Power Automate URLs

#### Obtener URLs de Workflows
1. Ir a **Power Automate > My flows**
2. Seleccionar el flow correspondiente
3. Hacer clic en **"..."** > **Settings**
4. Copiar la **HTTP trigger URL**

#### Formato de URLs
```bash
# Ejemplo de URL completa:
https://prod-XX.westus.logic.azure.com/workflows/12345678-1234-1234-1234-123456789abc/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=AbCdEfGhIjKlMnOpQrStUvWxYz
```

## ⚙️ Configuración por Servicio

### Netlify Deployment

#### Variables en Netlify Dashboard
```bash
# Site settings > Environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_ENV=production
VITE_APP_URL=https://your-netlify-app.netlify.app
```

#### Build Settings
```bash
# Build command:
npm run build

# Publish directory:
dist

# Node version:
18
```

### Vercel Deployment

#### Variables en Vercel Dashboard
```bash
# Project Settings > Environment Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_ENV=production
VITE_APP_URL=https://your-vercel-app.vercel.app
```

#### Build Configuration (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "nodeVersion": "18.x"
}
```

## 🛡️ Seguridad de Variables de Entorno

### Variables Públicas vs Privadas

#### ✅ Públicas (Seguras en frontend)
- `VITE_SUPABASE_URL` - URL pública del proyecto
- `VITE_SUPABASE_ANON_KEY` - Clave anónima para autenticación
- `VITE_APP_URL` - URL de la aplicación
- `VITE_APP_ENV` - Entorno de ejecución

#### ⚠️ Privadas (SOLO en backend)
- `SUPABASE_SERVICE_ROLE_KEY` - Acceso total a Supabase
- `POWERAUTOMATE_*_URL` - URLs de workflows de Power Automate

### Validación de Seguridad

#### Script de validación
```bash
#!/bin/bash
# validate-env.sh

echo "🔍 Validando configuración de variables de entorno..."

# Verificar que variables críticas estén configuradas
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada"
  exit 1
fi

if [ -z "$POWERAUTOMATE_GET_URL" ]; then
  echo "❌ ERROR: POWERAUTOMATE_GET_URL no configurada"
  exit 1
fi

# Verificar que URLs no estén expuestas en frontend
if grep -r "POWERAUTOMATE" src/; then
  echo "❌ ERROR: URLs de Power Automate encontradas en frontend"
  exit 1
fi

echo "✅ Configuración de variables de entorno válida"
```

## 📋 Checklist de Configuración

### Pre-Deployment
- [ ] Variables de frontend configuradas en `.env.production`
- [ ] Variables de backend configuradas en Supabase Dashboard
- [ ] URLs de Power Automate obtenidas y configuradas
- [ ] Claves de Supabase obtenidas y configuradas
- [ ] Script de validación ejecutado sin errores

### Supabase Configuration
- [ ] Proyecto Supabase creado
- [ ] Authentication configurado (Site URL, Redirect URLs)
- [ ] Row Level Security habilitado
- [ ] Edge Functions deployadas
- [ ] Variables de entorno configuradas en Dashboard

### Frontend Deployment
- [ ] Variables configuradas en plataforma de hosting
- [ ] Build command configurado
- [ ] Output directory configurado
- [ ] Node version especificada (18+)

### Security Validation
- [ ] Service role key NO expuesta en frontend
- [ ] Power Automate URLs NO expuestas en frontend
- [ ] CORS configurado correctamente
- [ ] HTTPS habilitado
- [ ] Headers de seguridad configurados

## 🔧 Troubleshooting

### Problema: Edge Functions no pueden acceder a variables
```bash
# Verificar configuración en Supabase Dashboard
# Settings > Edge Functions > Environment Variables

# Re-deployar funciones después de configurar variables
supabase functions deploy user-management
supabase functions deploy power-automate-proxy
```

### Problema: Frontend no puede conectar a Supabase
```bash
# Verificar en browser console:
console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

# Verificar que variables tienen el prefijo VITE_
```

### Problema: CORS errors
```bash
# Configurar allowed origins en Supabase Dashboard
# Settings > API > CORS settings
# Agregar: https://your-domain.com
```

## 📝 Plantillas de Configuración

### .env.production Template
```bash
# Copiar y completar con valores reales:
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_ENV=production
VITE_APP_URL=
VITE_DEBUG_MODE=false
```

### Edge Functions Environment Template
```bash
# Configurar en Supabase Dashboard:
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_URL=
POWERAUTOMATE_GET_URL=
POWERAUTOMATE_GET_REQUESTS_URL=
POWERAUTOMATE_GET_CONFIRMATIONS_URL=
POWERAUTOMATE_SUBMIT_URL=
LOG_LEVEL=warn
DEBUG_ENABLED=false
ALLOWED_ORIGINS=https://your-domain.com
```

Esta configuración garantiza un environment seguro y funcional para la aplicación en producción, manteniendo las mejores prácticas de seguridad y separación de responsabilidades.