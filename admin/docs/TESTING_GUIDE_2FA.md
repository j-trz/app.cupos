# 🧪 GUÍA COMPLETA DE PRUEBAS SISTEMA 2FA

## 📋 CHECKLIST DE PRUEBAS POST-MIGRACIÓN

### **PASO 1: Aplicar Migración SQL** ⚠️

```sql
-- En Supabase SQL Editor:
-- Ejecutar: sql/complete_2fa_migration.sql
```

### **PASO 2: Verificar Aplicación Lista**

```bash
# Reiniciar servidor de desarrollo
npm run dev
```

---

## 🔍 ESCENARIOS DE PRUEBA DETALLADOS

### **A. USUARIO NUEVO (Sin 2FA)**

#### **A1. Primer Login - Configuración 2FA Obligatoria**

1. **Acción**: Navegar a `/login`
2. **Ingresar**: Email y contraseña válidos de usuario sin 2FA
3. **Resultado Esperado**:
   - ✅ Login exitoso inicial
   - ✅ Redirección automática a configuración 2FA
   - ✅ Mensaje: "Configuración 2FA Obligatoria"
   - ✅ No se permite cancelar (botón cancelar ausente)

#### **A2. Configuración QR Code**

1. **Verificar**: QR Code se genera correctamente
2. **Verificar**: Clave secreta manual visible
3. **Verificar**: Botón copiar clave funciona
4. **Acción**: Escanear QR con app autenticadora (Google Authenticator, etc.)
5. **Resultado Esperado**:
   - ✅ QR legible por aplicaciones
   - ✅ Clave secreta copiable

#### **A3. Verificación Inicial**

1. **Acción**: Ingresar código de 6 dígitos de la app
2. **Resultado Esperado**:
   - ✅ Código aceptado
   - ✅ Redirección a códigos de backup

#### **A4. Códigos de Backup**

1. **Verificar**: 10 códigos de backup generados
2. **Acción**: Descargar códigos
3. **Resultado Esperado**:
   - ✅ Archivo .txt descargado
   - ✅ Botón "Completar" habilitado tras descarga
   - ✅ Redirección al dashboard tras completar

---

### **B. USUARIO EXISTENTE (Con 2FA)**

#### **B1. Login Normal con 2FA**

1. **Acción**: Ingresar email y contraseña
2. **Resultado Esperado**:
   - ✅ Credenciales aceptadas
   - ✅ Redirección a verificación 2FA
   - ✅ Mostrar email del usuario

#### **B2. Verificación TOTP**

1. **Acción**: Ingresar código actual de app autenticadora
2. **Resultado Esperado**:
   - ✅ Código aceptado
   - ✅ Login completado
   - ✅ Redirección al dashboard

#### **B3. Uso de Código de Backup**

1. **Acción**: Hacer clic en "Usar código de backup"
2. **Acción**: Ingresar un código de backup válido
3. **Resultado Esperado**:
   - ✅ Cambio a formulario de backup
   - ✅ Código aceptado
   - ✅ Login completado
   - ✅ Código marcado como usado (no reutilizable)

---

### **C. GESTIÓN PERSONAL DE 2FA**

#### **C1. Acceso a Perfil**

1. **Navegar**: Sidebar → "Mi Perfil"
2. **Resultado Esperado**:
   - ✅ Página de perfil carga correctamente
   - ✅ Sección 2FA visible
   - ✅ Estado actual mostrado (Activo/Inactivo)

#### **C2. Deshabilitar 2FA**

1. **Acción**: Clic en "Deshabilitar 2FA"
2. **Acción**: Confirmar con código TOTP
3. **Resultado Esperado**:
   - ✅ Solicitud de confirmación
   - ✅ 2FA deshabilitado tras confirmación
   - ✅ Estado actualizado en interfaz

#### **C3. Reconfigurar 2FA**

1. **Acción**: Clic en "Configurar 2FA" (después de deshabilitar)
2. **Resultado Esperado**:
   - ✅ Nuevo QR generado
   - ✅ Proceso completo de configuración
   - ✅ Nuevos códigos de backup

---

### **D. PANEL ADMINISTRATIVO**

#### **D1. Acceso a Seguridad (Admin)**

1. **Login**: Con usuario admin
2. **Navegar**: Sidebar → "Seguridad"
3. **Resultado Esperado**:
   - ✅ Panel de seguridad carga
   - ✅ Todas las secciones visibles
   - ✅ Sin errores de navegación

#### **D2. Gestión de Usuarios 2FA**

1. **Acción**: Ir a sección "Gestión 2FA"
2. **Verificar**: Lista de usuarios con estado 2FA
3. **Resultado Esperado**:
   - ✅ Lista completa de usuarios
   - ✅ Estado 2FA correcto por usuario
   - ✅ Acciones administrativas disponibles

#### **D3. Forzar Reset 2FA (Admin)**

1. **Acción**: Seleccionar usuario y "Forzar Reset 2FA"
2. **Resultado Esperado**:
   - ✅ Confirmación de acción
   - ✅ 2FA deshabilitado para el usuario
   - ✅ Usuario forzado a reconfigurar en próximo login

#### **D4. Monitoreo de Sesiones**

1. **Verificar**: Sección "Sesiones Activas"
2. **Resultado Esperado**:
   - ✅ Lista de sesiones en tiempo real
   - ✅ Información de IP y navegador
   - ✅ Opción de cerrar sesiones

---

### **E. SEGURIDAD Y ERRORES**

#### **E1. Códigos Incorrectos**

1. **Acción**: Ingresar código TOTP inválido
2. **Resultado Esperado**:
   - ✅ Error claro mostrado
   - ✅ No bloqueo inmediato
   - ✅ Posibilidad de reintentar

#### **E2. Bloqueo por Intentos**

1. **Acción**: Fallar credenciales múltiples veces
2. **Resultado Esperado**:
   - ✅ Contador de intentos visible
   - ✅ Bloqueo temporal tras 5 intentos
   - ✅ Countdown de desbloqueo

#### **E3. Sincronización Factor**

1. **Verificar**: Función automática tras errores de factor
2. **Resultado Esperado**:
   - ✅ Resincronización transparente
   - ✅ Logging de sincronización en consola

---

## 🎯 CRITERIOS DE ÉXITO

### **Funcionalidad Básica** (CRÍTICO)

- [ ] Login con 2FA obligatorio para nuevos usuarios
- [ ] Verificación 2FA para usuarios existentes
- [ ] Gestión personal de 2FA en perfil
- [ ] Panel administrativo sin errores

### **Seguridad** (CRÍTICO)

- [ ] Imposibilidad de bypass del 2FA
- [ ] Códigos de backup funcionan correctamente
- [ ] Bloqueo automático tras intentos fallidos
- [ ] Sesiones gestionadas correctamente

### **Experiencia de Usuario** (IMPORTANTE)

- [ ] Flujo intuitivo y guiado
- [ ] Mensajes de error claros
- [ ] Navegación sin interrupciones
- [ ] Estados actualizados en tiempo real

### **Administración** (IMPORTANTE)

- [ ] Control completo sobre usuarios 2FA
- [ ] Monitoreo de sesiones y actividad
- [ ] Capacidad de reset para soporte

---

## 🚨 QUÉ HACER SI FALLA UNA PRUEBA

### **Error de Base de Datos**

1. Verificar que se ejecutó [`complete_2fa_migration.sql`](sql/complete_2fa_migration.sql)
2. Revisar logs de Supabase para errores RLS
3. Confirmar relaciones de clave foránea

### **Error de Navegación**

1. Limpiar caché del navegador
2. Verificar rutas en [`App.jsx`](src/App.jsx)
3. Revisar props pasados entre componentes

### **Error 2FA**

1. Verificar configuración de [`twoFactorService.js`](src/services/twoFactorService.js)
2. Confirmar factores en Supabase Auth
3. Revisar sincronización automática

---

## 📊 REPORTE FINAL

Al completar todas las pruebas, documentar:

1. **✅ Funcionalidades Exitosas**: [Lista]
2. **❌ Errores Encontrados**: [Descripción y solución]
3. **⚠️ Observaciones**: [Mejoras sugeridas]
4. **🎯 Estado Final**: [LISTO PARA PRODUCCIÓN / REQUIERE AJUSTES]

---

**🎯 Meta**: Todas las pruebas deben pasar para considerar la integración 2FA completamente exitosa.
