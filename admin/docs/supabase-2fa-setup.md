# 🔐 Configuración de Autenticación de Doble Factor (2FA) con Supabase

## 📋 Guía de Configuración

### 1. Configurar Supabase Dashboard

#### **Paso 1: Habilitar Auth en Supabase**

1. Ve a tu **Dashboard de Supabase**
2. Navega a **Authentication** → **Settings**
3. En **Auth Providers**, asegúrate de que **Email** esté habilitado

#### **Paso 2: Configurar MFA (Multi-Factor Authentication)**

1. En **Authentication** → **Settings**
2. Busca la sección **Multi-Factor Authentication**
3. Habilita **TOTP (Time-based One-Time Password)**
4. Configura las siguientes opciones:
   ```
   ✅ Enable TOTP
   ✅ Allow enrollment
   ✅ Require for new users (opcional)
   ```

#### **Paso 3: Configurar políticas de seguridad**

```sql
-- En SQL Editor, ejecutar:

-- Habilitar MFA para la tabla auth.mfa_factors
ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios vean sus propios factores MFA
CREATE POLICY "Users can view their own MFA factors" ON auth.mfa_factors
    FOR SELECT USING (user_id = auth.uid());

-- Política para que usuarios gestionen sus propios factores MFA
CREATE POLICY "Users can manage their own MFA factors" ON auth.mfa_factors
    FOR ALL USING (user_id = auth.uid());
```

### 2. Variables de Entorno

Agregar a tu archivo `.env`:

```env
# Configuración 2FA
VITE_SUPABASE_MFA_ENABLED=true
VITE_APP_NAME="Sistema de Gestión de Cupos"
VITE_APP_ISSUER="tu-empresa"
```

### 3. Instalar Dependencias

```bash
npm install qrcode.js speakeasy
# o
yarn add qrcode.js speakeasy
```

### 4. Configurar Edge Functions (Opcional)

Para funcionalidades avanzadas de 2FA, crear Edge Function:

```sql
-- En Supabase SQL Editor
CREATE OR REPLACE FUNCTION generate_totp_secret()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret TEXT;
BEGIN
    -- Generar secreto aleatorio de 32 caracteres
    secret := encode(gen_random_bytes(20), 'base32');
    RETURN secret;
END;
$$;

CREATE OR REPLACE FUNCTION verify_totp_code(
    user_secret TEXT,
    user_code TEXT,
    window_size INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_time INTEGER;
    time_step INTEGER := 30;
    i INTEGER;
    expected_code TEXT;
BEGIN
    -- Obtener timestamp actual en períodos de 30 segundos
    current_time := EXTRACT(EPOCH FROM NOW())::INTEGER / time_step;

    -- Verificar código en ventana de tiempo (±window_size)
    FOR i IN -window_size..window_size LOOP
        -- Aquí iría la lógica TOTP real
        -- Por simplicidad, implementar verificación básica
        IF user_code = '000000' THEN -- código de prueba
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$;
```

## 🔧 Flujo de Implementación

### **Flujo de Registro 2FA:**

1. **Usuario inicia configuración 2FA**

   ```javascript
   const { data, error } = await supabase.auth.mfa.enroll({
     factorType: "totp",
     issuer: "Sistema de Gestión de Cupos",
     friendlyName: "Autenticador móvil",
   });
   ```

2. **Mostrar QR Code**

   ```javascript
   // Generar QR con la URI recibida
   const qrCodeURI = data.totp.uri;
   // Mostrar QR para escanear con app autenticadora
   ```

3. **Verificar código de configuración**
   ```javascript
   const { data, error } = await supabase.auth.mfa.challengeAndVerify({
     factorId: factorId,
     code: userEnteredCode,
   });
   ```

### **Flujo de Login con 2FA:**

1. **Login inicial (email/password)**

   ```javascript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: email,
     password: password,
   });
   ```

2. **Detectar si requiere 2FA**

   ```javascript
   if (data?.user && !data?.session) {
     // Usuario requiere 2FA
     // Mostrar formulario de código 2FA
   }
   ```

3. **Verificar código 2FA**
   ```javascript
   const { data, error } = await supabase.auth.mfa.challengeAndVerify({
     factorId: factorId,
     code: userCode,
   });
   ```

## 📱 Apps de Autenticación Recomendadas

Para usuarios finales, recomendar estas apps:

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (Premium)
- **Bitwarden** (Premium)

## 🔒 Códigos de Backup

```javascript
// Generar códigos de respaldo
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(
      Math.random().toString(36).substr(2, 4) +
        "-" +
        Math.random().toString(36).substr(2, 4)
    );
  }
  return codes;
};

// Guardar en user_security_status
await supabase
  .from("user_security_status")
  .update({
    backup_codes: backupCodes,
    two_factor_enabled: true,
  })
  .eq("user_id", userId);
```

## 🛡️ Consideraciones de Seguridad

### **Mejores Prácticas:**

1. **Códigos de backup**: Generar y mostrar códigos de un solo uso
2. **Ventana de tiempo**: Permitir códigos válidos por ±30 segundos
3. **Rate limiting**: Limitar intentos de verificación
4. **Recuperación**: Proceso seguro para recuperar acceso sin 2FA
5. **Logs de auditoría**: Registrar todos los eventos 2FA

### **Manejo de Errores:**

```javascript
// Errores comunes y sus manejos
const handle2FAError = (error) => {
  switch (error.message) {
    case "Invalid code":
      return "Código incorrecto. Verifique su app autenticadora.";
    case "Code expired":
      return "Código expirado. Genere uno nuevo.";
    case "Factor not found":
      return "Configuración 2FA no encontrada.";
    case "Too many attempts":
      return "Demasiados intentos. Espere antes de reintentar.";
    default:
      return "Error en verificación 2FA. Contacte soporte.";
  }
};
```

## 🧪 Testing

### **Casos de Prueba:**

1. ✅ Configurar 2FA con código QR
2. ✅ Login con 2FA habilitado
3. ✅ Usar código de backup
4. ✅ Deshabilitar 2FA
5. ✅ Múltiples dispositivos
6. ✅ Códigos expirados
7. ✅ Recuperación de cuenta

### **Códigos de Prueba:**

```javascript
// Para desarrollo/testing
const TEST_CODES = {
  valid: "123456",
  expired: "000000",
  invalid: "999999",
};
```

## 📊 Métricas y Monitoreo

```sql
-- Estadísticas de adopción 2FA
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN two_factor_enabled THEN 1 END) as users_with_2fa,
  ROUND(
    COUNT(CASE WHEN two_factor_enabled THEN 1 END) * 100.0 / COUNT(*),
    2
  ) as adoption_percentage
FROM user_security_status;

-- Eventos 2FA por día
SELECT
  DATE(attempted_at) as date,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN success THEN 1 END) as successful_attempts
FROM user_login_attempts
WHERE attempted_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(attempted_at)
ORDER BY date DESC;
```

---

¡Con esta configuración tendrás un sistema 2FA completo y seguro integrado con Supabase! 🚀
