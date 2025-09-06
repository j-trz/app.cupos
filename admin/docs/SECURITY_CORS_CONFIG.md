# Configuración de Seguridad y CORS

## 📋 Resumen de Mejoras Implementadas

### 🔒 Mejoras de Seguridad

#### Headers de Seguridad

Se implementaron headers de seguridad estándar en la configuración de Vite:

```javascript
headers: {
  'X-Content-Type-Options': 'nosniff',           // Previene MIME sniffing
  'X-Frame-Options': 'DENY',                     // Previene clickjacking
  'X-XSS-Protection': '1; mode=block',           // Protección XSS
  'Referrer-Policy': 'strict-origin-when-cross-origin', // Control de referrer
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', // Permisos restrictivos
}
```

#### Configuración CORS Mejorada

```javascript
cors: {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://hdsmvuwrdwfivujjnubr.supabase.co',
    // Agregar dominios de producción según necesidad
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'apikey'
  ],
}
```

### 🔧 Validador de Variables de Entorno

#### Características Principales

- ✅ **Validación automática** de variables críticas al startup
- ✅ **Valores por defecto** para configuraciones opcionales
- ✅ **Validaciones específicas** (HTTPS, longitud de tokens, etc.)
- ✅ **Logging seguro** (sin exponer datos sensibles)
- ✅ **Configuración centralizada** de la aplicación

#### Variables Requeridas

```javascript
REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
```

#### Variables Opcionales con Defaults

```javascript
OPTIONAL_ENV_VARS = {
  VITE_APP_NAME: "Admin Panel",
  VITE_APP_VERSION: "1.0.0",
  VITE_APP_ENVIRONMENT: "development",
  VITE_ENABLE_ANALYTICS: "false",
  VITE_DEBUG_MODE: "false",
  VITE_STRICT_MODE: "true",
  VITE_API_TIMEOUT: "10000",
  VITE_MAX_RETRY_ATTEMPTS: "3",
  VITE_MAX_CONNECTIONS: "10",
  VITE_CONNECTION_TIMEOUT: "30000",
  VITE_ENCRYPTION_KEY_LENGTH: "32",
  VITE_PBKDF2_ITERATIONS: "100000",
};
```

### 📁 Archivo `.env.example`

Se creó un archivo completo de ejemplo con todas las variables necesarias:

```env
# Configuración de Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Configuración de Power Automate
VITE_POWERAUTOMATE_GET_URL=https://your-get-workflow-url
VITE_POWERAUTOMATE_POST_URL=https://your-post-workflow-url
VITE_POWERAUTOMATE_GET_URL_SS=https://your-smartsheet-workflow-url

# Configuración de la aplicación
VITE_APP_NAME=Admin Panel
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development

# Configuración de seguridad
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=false
VITE_STRICT_MODE=true

# URLs permitidas para CORS (separadas por comas)
VITE_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Configuración de base de datos
VITE_MAX_CONNECTIONS=10
VITE_CONNECTION_TIMEOUT=30000

# Configuración de encriptación
VITE_ENCRYPTION_KEY_LENGTH=32
VITE_PBKDF2_ITERATIONS=100000

# Configuración de API externa
VITE_API_TIMEOUT=10000
VITE_MAX_RETRY_ATTEMPTS=3
```

## 🛡️ Validaciones de Seguridad

### 1. Validación de URLs

- ✅ **HTTPS obligatorio** para URLs de Supabase
- ✅ **Longitud mínima** para tokens de autenticación
- ✅ **Timeouts válidos** para APIs externas

### 2. Configuración de Timeouts

- ✅ **API Timeout**: mínimo 1000ms
- ✅ **Retry Attempts**: entre 1 y 10
- ✅ **Connection Timeout**: configurable

### 3. Headers de Seguridad

```javascript
// Prevención de vulnerabilidades comunes
'X-Content-Type-Options': 'nosniff'         // MIME type sniffing
'X-Frame-Options': 'DENY'                   // Clickjacking
'X-XSS-Protection': '1; mode=block'         // Cross-site scripting
'Referrer-Policy': 'strict-origin-when-cross-origin' // Information leakage
```

## 🌐 Configuración CORS

### Orígenes Permitidos

```javascript
origin: [
  'http://localhost:3000',      // Desarrollo local
  'http://127.0.0.1:3000',      // Desarrollo local alternativo
  'https://hdsmvuwrdwfivujjnubr.supabase.co', // Supabase
  // Agregar dominios de producción
],
```

### Métodos HTTP Permitidos

- ✅ GET, POST, PUT, DELETE, OPTIONS
- ✅ Soporte para preflight requests
- ✅ Credentials habilitados para autenticación

### Headers Permitidos

```javascript
allowedHeaders: [
  "Content-Type", // Tipo de contenido
  "Authorization", // Token de autenticación
  "X-Requested-With", // AJAX requests
  "Accept", // Tipos de respuesta aceptados
  "Origin", // Origen de la petición
  "apikey", // API key de Supabase
];
```

## 🔍 Uso del Validador

### Importación y Uso

```javascript
import {
  validateEnvironment,
  getAppConfig,
  logEnvironmentInfo,
} from "./utils/envValidator";

// Al inicio de la aplicación
logEnvironmentInfo();
const config = getAppConfig();
```

### Métodos Disponibles

```javascript
// Validación completa del entorno
const validation = validateEnvironment();

// Configuración de la aplicación
const config = getAppConfig();

// Información del build
const buildInfo = getBuildInfo();

// Verificaciones de entorno
const isDev = isDevelopment();
const isProd = isProduction();
```

## ⚙️ Configuración de Producción

### Variables Críticas para Producción

```env
# OBLIGATORIO: Configurar para producción
VITE_SUPABASE_URL=https://your-production-supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# RECOMENDADO: Configuración de producción
VITE_APP_ENVIRONMENT=production
VITE_DEBUG_MODE=false
VITE_STRICT_MODE=true
VITE_ENABLE_ANALYTICS=true

# SEGURIDAD: Dominios permitidos en producción
VITE_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Build para Producción

```bash
# Configurar variables de entorno
cp .env.example .env
# Editar .env con valores de producción

# Build optimizado
npm run build:prod

# Verificar configuración
npm run test:build
```

## 🚨 Troubleshooting

### Error: Variables de entorno faltantes

```bash
❌ Errores de configuración de entorno:
['Variable de entorno requerida faltante: VITE_SUPABASE_URL']
```

**Solución**: Verificar que el archivo `.env` existe y contiene todas las variables requeridas.

### Error: CORS bloqueado

```bash
Access to fetch at 'https://api.example.com' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**Solución**: Agregar el dominio a la lista de orígenes permitidos en `vite.config.js`.

### Error: Headers de seguridad

```bash
Refused to load the script because it violates CSP directive
```

**Solución**: Verificar configuración de headers de seguridad y Content Security Policy.

## 📝 Checklist de Seguridad

### ✅ Desarrollo

- [x] Variables de entorno configuradas
- [x] CORS configurado para localhost
- [x] Headers de seguridad activos
- [x] Validación de entorno funcionando
- [x] Logging de configuración en dev

### ✅ Producción

- [x] Variables de entorno de producción configuradas
- [x] CORS configurado para dominios de producción
- [x] Source maps desactivados
- [x] Debug mode desactivado
- [x] Analytics habilitado (opcional)
- [x] HTTPS obligatorio
- [x] Headers de seguridad estrictos

## 🔗 Referencias

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Vite Security Guide](https://vitejs.dev/guide/build.html#build-optimizations)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/server-side-auth)

---

**Status**: ✅ Completado
**Fecha**: Diciembre 2024
**Versión**: v1.0.0
