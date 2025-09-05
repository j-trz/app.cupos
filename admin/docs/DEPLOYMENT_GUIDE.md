# Guía de Deployment - Sistema de Gestión de Cupos

## Resumen de Deployment

Esta aplicación requiere despliegue de componentes tanto frontend como backend. El backend utiliza Supabase Edge Functions para operaciones seguras.

## 📋 Prerequisitos

### Herramientas Requeridas
- **Node.js** 18+ 
- **npm** o **yarn**
- **Supabase CLI** (`npm install -g supabase`)
- **Git** para control de versiones

### Cuentas y Servicios
- **Supabase** (proyecto configurado)
- **Power Automate** (flujos configurados)
- **Servidor web** (Netlify, Vercel, o similar)

## 🚀 Proceso de Deployment

### 1. Configuración de Supabase

#### Instalar Supabase CLI
```bash
npm install -g supabase
```

#### Inicializar proyecto Supabase
```bash
# En el directorio raíz del proyecto
supabase login
supabase init
```

#### Configurar proyecto remoto
```bash
# Conectar a proyecto existente
supabase link --project-ref YOUR_PROJECT_ID
```

### 2. Deployment de Edge Functions

#### Desplegar función de gestión de usuarios
```bash
supabase functions deploy user-management
```

#### Desplegar función proxy de Power Automate
```bash
supabase functions deploy power-automate-proxy
```

#### Verificar deployment
```bash
supabase functions list
```

### 3. Configuración de Variables de Entorno

#### Para las Edge Functions
Configurar en Supabase Dashboard > Settings > Edge Functions:

```bash
# Variables requeridas para power-automate-proxy
POWERAUTOMATE_GET_URL=https://prod-xx.westus.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke
POWERAUTOMATE_GET_REQUESTS_URL=https://prod-xx.westus.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke
POWERAUTOMATE_GET_CONFIRMATIONS_URL=https://prod-xx.westus.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke
POWERAUTOMATE_SUBMIT_URL=https://prod-xx.westus.logic.azure.com/workflows/xxx/triggers/manual/paths/invoke

# Variables requeridas para user-management
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Para el Frontend
Crear archivo `.env.production`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# No incluir URLs de Power Automate (ahora manejadas por backend)
```

### 4. Configuración de Base de Datos

#### Row Level Security (RLS) Policies

Ejecutar en Supabase SQL Editor:

```sql
-- Habilitar RLS en la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para que usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para que admins puedan ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.admin = true
    )
  );

-- Política para que admins puedan gestionar usuarios
CREATE POLICY "Admins can manage users" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.admin = true
    )
  );
```

### 5. Deployment del Frontend

#### Preparar build de producción
```bash
# Instalar dependencias
npm install

# Crear build optimizado
npm run build
```

#### Opción A: Netlify
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deployment
netlify deploy --prod --dir=dist
```

#### Opción B: Vercel
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deployment
vercel --prod
```

#### Opción C: Servidor tradicional
```bash
# Subir contenido de la carpeta dist/ al servidor web
rsync -avz dist/ user@server:/var/www/html/
```

## ⚙️ Configuración Post-Deployment

### 1. Verificar Edge Functions

#### Probar user-management
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/user-management' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "list"}'
```

#### Probar power-automate-proxy
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/power-automate-proxy' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get-availability"}'
```

### 2. Configurar CORS

En Supabase Dashboard > Settings > API:
```json
{
  "allowed_origins": [
    "https://your-domain.com",
    "https://www.your-domain.com"
  ]
}
```

### 3. Configurar Authentication

En Supabase Dashboard > Authentication > Settings:
- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: 
  - `https://your-domain.com/dashboard`
  - `https://your-domain.com/login`

## 🔒 Validación de Seguridad

### Checklist de Seguridad Pre-Producción

#### ✅ Edge Functions
- [ ] Variables de entorno configuradas
- [ ] URLs de Power Automate no expuestas en frontend
- [ ] Autorización JWT funcionando
- [ ] Validación de datos implementada

#### ✅ Base de Datos
- [ ] RLS habilitado en todas las tablas sensibles
- [ ] Políticas de seguridad configuradas
- [ ] Usuario admin inicial creado

#### ✅ Frontend
- [ ] Variables de entorno de producción configuradas
- [ ] Build optimizado generado
- [ ] No hay console.log() en producción
- [ ] APIs keys no expuestas

#### ✅ Comunicación
- [ ] HTTPS habilitado
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad configurados

## 📊 Monitoreo y Logs

### Supabase Logs
- **Dashboard > Logs > Edge Functions**
- Monitorear errores y rendimiento de las funciones

### Application Logs
```javascript
// En servicios frontend, usar:
console.error('Error en UserService:', error);

// Para enviar a servicio de logging:
if (import.meta.env.PROD) {
  analytics.track('error', { error: error.message });
}
```

## 🔧 Troubleshooting Común

### Problema: Edge Function no responde
```bash
# Verificar deployment
supabase functions list

# Ver logs
supabase functions logs user-management

# Re-deployar si es necesario
supabase functions deploy user-management
```

### Problema: CORS errors
```javascript
// Verificar en Network tab del browser
// Configurar allowed_origins en Supabase Dashboard
```

### Problema: Authentication errors
```javascript
// Verificar tokens JWT
// Confirmar Site URL en Authentication settings
// Verificar que el usuario tiene permisos admin si es necesario
```

## 📈 Optimizaciones de Rendimiento

### Caché
```javascript
// Implementar caché en servicios para consultas frecuentes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class CacheService {
  static cache = new Map();
  
  static get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }
  
  static set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

### Bundle Size
```bash
# Analizar bundle size
npm run build -- --analyze

# Optimizar imports
import { specificFunction } from 'library';
// en lugar de
import * as library from 'library';
```

## ✅ Checklist Final de Deployment

### Pre-Production
- [ ] Todas las Edge Functions deployadas
- [ ] Variables de entorno configuradas
- [ ] RLS policies aplicadas
- [ ] Tests de seguridad pasados
- [ ] Build de producción generado

### Production Deploy
- [ ] Frontend deployado
- [ ] DNS configurado
- [ ] SSL/TLS habilitado
- [ ] Monitoreo configurado
- [ ] Backup de BD configurado

### Post-Production
- [ ] Smoke tests ejecutados
- [ ] Funcionalidad admin verificada
- [ ] Funcionalidad usuario verificada
- [ ] Performance monitoreada
- [ ] Logs revisados

Este proceso garantiza un deployment seguro y funcional del sistema de gestión de cupos con todas las mejoras de seguridad implementadas.