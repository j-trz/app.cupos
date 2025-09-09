# Guía de Integración del Sistema 2FA

## Resumen de Cambios Implementados

### 1. **Reemplazo del Login Básico con SecurityLogin**

- **Archivo**: `src/pages/Login.jsx`
- **Cambio**: Se reemplazó el login básico con el componente `SecurityLogin` que incluye toda la funcionalidad de seguridad
- **Resultado**: Ahora el login incluye:
  - Verificación de bloqueos por intentos fallidos
  - Configuración obligatoria de 2FA para nuevos usuarios
  - Verificación de códigos 2FA en el login
  - Gestión de códigos de backup

### 2. **Creación de Página de Perfil**

- **Archivo**: `src/pages/Perfil.jsx`
- **Funcionalidad**: Página completa de perfil del usuario que incluye:
  - Información personal del usuario
  - Gestión completa de 2FA (configurar, deshabilitar, regenerar códigos)
  - Información de seguridad activa
- **Acceso**: Disponible para todos los usuarios autenticados

### 3. **Integración en Navegación**

- **Archivos**: `src/components/SidebarSections.jsx` y `src/App.jsx`
- **Cambio**: Se agregó la sección "Mi Perfil" al sidebar y la ruta correspondiente
- **Ubicación**: Disponible en `/admin/perfil`

## Flujo Completo de 2FA

### Para Usuarios Nuevos:

1. **Login Inicial**:

   - Usuario ingresa email y contraseña
   - Si las credenciales son correctas pero NO tiene 2FA configurado:
   - El sistema **fuerza** la configuración de 2FA

2. **Configuración Obligatoria de 2FA**:

   - Se muestra la pantalla de configuración de 2FA
   - Usuario escanea código QR con su app autenticadora (Google Authenticator, Authy, etc.)
   - Usuario ingresa código de verificación
   - Sistema genera 8 códigos de backup
   - Usuario debe descargar/guardar los códigos de backup

3. **Verificación Inmediata**:
   - Después de configurar, se solicita verificación inmediata
   - Usuario ingresa código de 6 dígitos de su app
   - Una vez verificado, accede al sistema

### Para Usuarios Existentes con 2FA:

1. **Login Normal**:

   - Usuario ingresa email y contraseña
   - Si las credenciales son correctas y TIENE 2FA configurado:
   - Se solicita verificación de 2FA

2. **Verificación 2FA**:
   - Usuario puede usar:
     - Código de 6 dígitos de su app autenticadora
     - Código de backup (si no tiene acceso a la app)
   - Una vez verificado, accede al sistema

### Gestión de 2FA desde el Perfil:

1. **Acceso**:

   - Usuario navega a "Mi Perfil" en el sidebar
   - Encuentra la sección "Configuraciones de Seguridad"

2. **Opciones Disponibles**:
   - **Si NO tiene 2FA**: Botón para configurar
   - **Si tiene 2FA**:
     - Ver estado actual
     - Regenerar códigos de backup
     - Deshabilitar 2FA
     - Ver códigos de backup restantes

## Características de Seguridad Activas

### 1. **Bloqueo por Intentos Fallidos**

- **Límite**: 3 intentos fallidos
- **Duración**: 30 minutos de bloqueo
- **Desbloqueo**: Automático después del tiempo o manual por administrador

### 2. **Auto-logout por Inactividad**

- **Tiempo**: 10 minutos de inactividad
- **Detección**: Mouse, teclado, scroll, touch
- **Limpieza**: Sesiones expiradas cada 5 minutos

### 3. **Autenticación de Doble Factor**

- **Protocolo**: TOTP (Time-based One-Time Password)
- **Códigos de backup**: 8 códigos de un solo uso
- **Apps compatibles**: Google Authenticator, Authy, Microsoft Authenticator
- **Obligatorio**: Sí, para todos los usuarios

### 4. **Seguimiento de Actividad**

- **Login attempts**: Todos registrados con IP y user-agent
- **Sesiones activas**: Tracked con tokens únicos
- **Actividad**: Actualizada cada 30 segundos

## Archivos Principales del Sistema

### Componentes de UI:

```
src/components/
├── SecurityLogin.jsx          # Login con seguridad integrada
├── TwoFactorSetup.jsx         # Configuración inicial de 2FA
├── TwoFactorVerify.jsx        # Verificación de códigos 2FA
├── TwoFactorManager.jsx       # Gestión completa de 2FA
└── SecurityAdminPanel.jsx     # Panel admin de seguridad
```

### Páginas:

```
src/pages/
├── Login.jsx                  # Wrapper del SecurityLogin
├── Perfil.jsx                 # Página de perfil con gestión 2FA
└── Seguridad.jsx             # Panel admin de seguridad
```

### Servicios:

```
src/services/
├── securityService.js         # Gestión de bloqueos y sesiones
└── twoFactorService.js        # Gestión completa de 2FA
```

## Instrucciones para el Usuario Final

### Configuración Inicial de 2FA:

1. **Instalar App Autenticadora**:

   - Descargar Google Authenticator, Authy o similar
   - Tener el teléfono listo para escanear QR

2. **Primer Login**:

   - Ingresar email y contraseña normalmente
   - Aparecerá pantalla de configuración obligatoria
   - Escanear código QR con la app
   - Ingresar código de 6 dígitos para verificar
   - **IMPORTANTE**: Descargar y guardar códigos de backup

3. **Uso Diario**:
   - Login normal con email y contraseña
   - Abrir app autenticadora
   - Ingresar código de 6 dígitos actual
   - Acceder al sistema

### Gestión desde el Perfil:

1. **Acceder al Perfil**:

   - Click en "Mi Perfil" en el menú lateral
   - Buscar sección "Configuraciones de Seguridad"

2. **Regenerar Códigos de Backup**:

   - Útil si perdiste los códigos originales
   - Click en "Regenerar Códigos"
   - Descargar nuevos códigos

3. **Uso de Códigos de Backup**:
   - Solo si no tienes acceso a tu app autenticadora
   - En la pantalla de verificación, click "Usar código de backup"
   - Ingresar uno de los códigos guardados
   - **NOTA**: Cada código se puede usar solo una vez

## Próximos Pasos Requeridos

### 1. **Aplicar Migración SQL**

```bash
# Ejecutar en Supabase SQL Editor:
# Contenido del archivo: sql/add_foreign_key_constraint.sql
```

### 2. **Verificar Funcionamiento**

- Probar login completo con 2FA
- Verificar que se fuerce configuración para usuarios sin 2FA
- Confirmar que el panel de perfil funciona correctamente
- Probar gestión de 2FA desde el perfil

### 3. **Documentar para Usuarios**

- Crear guía de usuario para configuración inicial
- Instruir sobre apps autenticadoras recomendadas
- Explicar importancia de guardar códigos de backup

## Estado Actual

✅ **Sistema 2FA completamente integrado**
✅ **Login con seguridad avanzada implementado**
✅ **Página de perfil para gestión personal**
✅ **Navegación y rutas configuradas**
⏳ **Pendiente**: Migración SQL y pruebas finales
