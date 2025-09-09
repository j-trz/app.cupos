# Guía de Implementación del Sistema de Seguridad Avanzado

## Resumen Ejecutivo

Esta guía detalla la implementación completa de un sistema de seguridad empresarial que incluye:

- **Sistema de bloqueo por intentos fallidos**: Protección contra ataques de fuerza bruta
- **Auto-logout por inactividad**: Gestión automática de sesiones inactivas
- **Autenticación de doble factor (2FA)**: Capa adicional de seguridad con TOTP
- **Panel administrativo**: Herramientas de gestión y monitoreo de seguridad

## Arquitectura del Sistema

### Base de Datos

#### Tablas de Seguridad

```sql
-- Tabla para registrar intentos de login
user_login_attempts (
  id, user_id, ip_address, user_agent,
  success, failure_reason, created_at
)

-- Tabla para estado de seguridad de usuarios
user_security_status (
  user_id, is_locked, locked_at, failed_attempts,
  last_login_attempt, unlock_at, created_at, updated_at
)

-- Tabla para gestión de sesiones
user_sessions (
  id, user_id, session_token, last_activity,
  ip_address, user_agent, expires_at,
  created_at, updated_at
)
```

#### Funciones SQL Principales

- [`log_login_attempt()`](../sql/security_features.sql:45): Registra cada intento de login
- [`check_and_update_lock_status()`](../sql/security_features.sql:89): Gestiona el estado de bloqueo
- [`unlock_user()`](../sql/security_features.sql:134): Desbloquea usuarios manualmente
- [`cleanup_expired_sessions()`](../sql/security_features.sql:167): Limpia sesiones expiradas

### Servicios Backend

#### SecurityService

**Archivo**: [`src/services/securityService.js`](../src/services/securityService.js)

**Funciones principales**:

- [`validateLogin()`](../src/services/securityService.js:89): Validación completa de login
- [`checkLockStatus()`](../src/services/securityService.js:144): Verificación de estado de bloqueo
- [`updateUserActivity()`](../src/services/securityService.js:185): Actualización de actividad
- [`checkSessionExpiry()`](../src/services/securityService.js:220): Verificación de expiración de sesión

#### TwoFactorService

**Archivo**: [`src/services/twoFactorService.js`](../src/services/twoFactorService.js)

**Funciones principales**:

- [`setup2FA()`](../src/services/twoFactorService.js:89): Configuración inicial de 2FA
- [`verify2FASetup()`](../src/services/twoFactorService.js:134): Verificación de configuración
- [`verify2FALogin()`](../src/services/twoFactorService.js:189): Verificación durante login
- [`verifyBackupCode()`](../src/services/twoFactorService.js:234): Verificación de códigos de backup

### Componentes de UI

#### Componentes de Autenticación

1. **SecurityLogin** - [`src/components/SecurityLogin.jsx`](../src/components/SecurityLogin.jsx)

   - Login con validaciones de seguridad
   - Feedback visual de intentos y bloqueos
   - Integración con sistema 2FA

2. **TwoFactorSetup** - [`src/components/TwoFactorSetup.jsx`](../src/components/TwoFactorSetup.jsx)

   - Configuración paso a paso de 2FA
   - Generación de códigos QR
   - Gestión de códigos de backup

3. **TwoFactorVerify** - [`src/components/TwoFactorVerify.jsx`](../src/components/TwoFactorVerify.jsx)

   - Verificación durante el login
   - Soporte para códigos de backup
   - Interfaz user-friendly

4. **TwoFactorManager** - [`src/components/TwoFactorManager.jsx`](../src/components/TwoFactorManager.jsx)
   - Gestión de 2FA desde perfil
   - Activación/desactivación
   - Estado y estadísticas

#### Componentes Administrativos

1. **SecurityAdminPanel** - [`src/components/SecurityAdminPanel.jsx`](../src/components/SecurityAdminPanel.jsx)
   - Dashboard de seguridad
   - Gestión de usuarios bloqueados
   - Estadísticas en tiempo real

## Configuración e Instalación

### 1. Configuración de Base de Datos

Ejecutar el script SQL completo:

```bash
# Aplicar el esquema de seguridad
psql -d your_database -f sql/security_features.sql
```

### 2. Variables de Entorno

Agregar al archivo `.env`:

```env
# Configuración de seguridad
SECURITY_MAX_LOGIN_ATTEMPTS=3
SECURITY_LOCKOUT_DURATION_MINUTES=30
SECURITY_SESSION_TIMEOUT_MINUTES=10

# Configuración 2FA
SUPABASE_2FA_ENABLED=true
APP_NAME="Form Cupos Admin"
APP_ISSUER="form-cupos"
```

### 3. Configuración de Supabase

Seguir la guía detallada: [`docs/supabase-2fa-setup.md`](../docs/supabase-2fa-setup.md)

**Pasos clave**:

1. Habilitar MFA en el proyecto Supabase
2. Configurar políticas RLS
3. Establecer factores de autenticación

### 4. Integración en la Aplicación

#### Reemplazar componente de login

```jsx
// Antes
import Login from "./components/Login";

// Después
import SecurityLogin from "./components/SecurityLogin";

function App() {
  return (
    <div>
      <SecurityLogin onLoginSuccess={handleLogin} />
    </div>
  );
}
```

#### Agregar gestión de sesiones

```jsx
import { useEffect } from "react";
import SecurityService from "./services/securityService";

function App() {
  useEffect(() => {
    // Inicializar monitoreo de actividad
    SecurityService.initializeActivityMonitoring();

    // Verificar sesión al cargar
    SecurityService.checkSessionExpiry();
  }, []);
}
```

## Flujos de Trabajo

### Flujo de Login Seguro

1. **Usuario ingresa credenciales**
2. **Verificación de estado de bloqueo**
   - Si está bloqueado → Mostrar mensaje de error
   - Si no está bloqueado → Continuar
3. **Validación de credenciales**
   - Si falla → Registrar intento + incrementar contador
   - Si es exitoso → Verificar 2FA
4. **Verificación 2FA** (si está habilitado)
   - Solicitar código TOTP o backup
   - Verificar código
5. **Crear sesión** → Redirect a dashboard

### Flujo de Auto-logout

1. **Monitoreo de actividad** cada 30 segundos
2. **Verificación de última actividad**
3. **Si > 10 minutos inactivo**:
   - Mostrar advertencia (2 minutos antes)
   - Auto-logout y limpiar sesión
   - Redirect a login

### Flujo de Configuración 2FA

1. **Usuario accede a configuración**
2. **Generar secreto TOTP**
3. **Mostrar código QR**
4. **Usuario escanea con app autenticadora**
5. **Verificar código de configuración**
6. **Generar códigos de backup**
7. **Habilitar 2FA en cuenta**

## Características de Seguridad

### Protección contra Ataques

1. **Fuerza Bruta**: Bloqueo automático después de 3 intentos fallidos
2. **Session Hijacking**: Tokens únicos por sesión + validación IP
3. **CSRF**: Tokens de sesión seguros
4. **Replay Attacks**: Códigos TOTP de un solo uso

### Monitoreo y Auditoría

1. **Registro completo** de intentos de login
2. **Tracking de IP y User Agent**
3. **Estadísticas de seguridad** en tiempo real
4. **Alertas** de actividad sospechosa

### Gestión de Sesiones

1. **Expiración automática** después de inactividad
2. **Limpieza automática** de sesiones expiradas
3. **Múltiples sesiones** por usuario (opcional)
4. **Invalidación manual** desde admin panel

## Panel Administrativo

### Funcionalidades

1. **Dashboard de Seguridad**

   - Estadísticas generales
   - Usuarios bloqueados
   - Actividad reciente

2. **Gestión de Usuarios**

   - Desbloquear usuarios manualmente
   - Ver historial de intentos
   - Gestionar estado 2FA

3. **Monitoreo en Tiempo Real**
   - Sesiones activas
   - Intentos de login
   - Alertas de seguridad

### Permisos de Acceso

Solo usuarios con rol `admin` pueden acceder al panel de seguridad.

## Testing y Validación

### Tests de Seguridad Recomendados

1. **Test de Bloqueo por Intentos**

   ```javascript
   // Simular 3 intentos fallidos
   // Verificar que usuario se bloquee
   // Verificar auto-unlock después de 30 min
   ```

2. **Test de Auto-logout**

   ```javascript
   // Simular inactividad > 10 minutos
   // Verificar logout automático
   // Verificar limpieza de sesión
   ```

3. **Test de 2FA**
   ```javascript
   // Configurar 2FA
   // Verificar códigos TOTP
   // Verificar códigos de backup
   // Verificar desactivación
   ```

### Métricas de Rendimiento

- **Tiempo de respuesta** de validación: < 200ms
- **Memoria** utilizada por sesiones: < 50MB
- **CPU** para verificación 2FA: < 100ms

## Mantenimiento

### Tareas Automáticas

1. **Limpieza de sesiones expiradas**: Cada hora
2. **Limpieza de intentos antiguos**: Cada día
3. **Desbloqueo automático**: Cada 5 minutos

### Tareas Manuales

1. **Revisar logs de seguridad**: Semanal
2. **Actualizar políticas**: Mensual
3. **Backup de configuración**: Mensual

## Consideraciones de Producción

### Performance

1. **Indexar** tablas de seguridad por user_id y timestamp
2. **Cachear** estado de bloqueo en Redis (opcional)
3. **Optimizar** consultas de verificación de sesión

### Escalabilidad

1. **Particionar** tablas por fecha
2. **Archivar** logs antiguos
3. **Usar CDN** para recursos estáticos

### Seguridad Adicional

1. **HTTPS** obligatorio en producción
2. **Rate limiting** a nivel de servidor
3. **WAF** (Web Application Firewall)
4. **Monitoring** con herramientas como Sentry

## Troubleshooting

### Problemas Comunes

1. **Usuario bloqueado permanentemente**

   ```sql
   -- Desbloquear manualmente
   SELECT unlock_user('user_id');
   ```

2. **2FA no funciona**

   - Verificar sincronización de tiempo
   - Verificar configuración Supabase
   - Regenerar secreto si es necesario

3. **Sesiones no expiran**
   - Verificar cron job de limpieza
   - Verificar configuración de timeout

### Logs y Debugging

```javascript
// Habilitar logs detallados
SecurityService.enableDebugMode(true);

// Ver logs de intentos de login
const attempts = await SecurityService.getLoginAttempts(userId);

// Ver estado de sesiones
const sessions = await SecurityService.getActiveSessions(userId);
```

## Roadmap y Mejoras Futuras

### Fase 2

- [ ] Notificaciones de seguridad por email
- [ ] Integración con sistemas de alertas
- [ ] Dashboard de analytics avanzado

### Fase 3

- [ ] Autenticación biométrica
- [ ] Integración con SSO (SAML/OAuth)
- [ ] Análisis de comportamiento de usuario

### Fase 4

- [ ] Machine Learning para detección de anomalías
- [ ] Integración con sistemas de identidad empresarial
- [ ] Compliance con estándares (SOC2, ISO27001)

---

## Contacto y Soporte

Para soporte técnico o consultas sobre implementación, contactar al equipo de desarrollo.

**Documentación adicional**:

- [Configuración Supabase 2FA](supabase-2fa-setup.md)
- [API Reference](api-reference.md)
- [Troubleshooting Guide](troubleshooting.md)
