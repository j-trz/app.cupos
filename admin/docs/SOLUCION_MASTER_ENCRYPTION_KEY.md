# 🔧 Solución: MASTER_ENCRYPTION_KEY no se detecta

## 🎯 Problema Identificado

Configuraste MASTER_ENCRYPTION_KEY como **"Secrets"** pero las Edge Functions necesitan **"Environment Variables"**.

## 🚀 Solución Paso a Paso

### **Paso 1: Ir a Environment Variables (NO Secrets)**

1. Ve a **https://hdsmvuwrdwfivujjnubr.supabase.co**
2. Ve a **Settings** (engranaje en la barra lateral)
3. Busca **"Edge Functions"** en el menú de Settings
4. Haz clic en **"Environment Variables"** (NO en "Secrets")

### **Paso 2: Agregar Variable de Entorno**

1. Haz clic en **"Add new variable"**
2. **Name**: `MASTER_ENCRYPTION_KEY`
3. **Value**: Una clave de 32+ caracteres (ejemplo: `my-application-master-key-2024-secure-32-chars`)
4. Haz clic en **"Save"**

### **Paso 3: Verificar Otras Variables**

Asegúrate de que también estén configuradas como **Environment Variables**:

- ✅ `SUPABASE_URL`: `https://hdsmvuwrdwfivujjnubr.supabase.co`
- ✅ `SUPABASE_ANON_KEY`: (tu anon key del backend)
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: (tu service role key del backend)
- ✅ `MASTER_ENCRYPTION_KEY`: (la clave de 32+ caracteres)

### **Paso 4: Esperar y Probar**

1. **Espera 2-3 minutos** para que se apliquen los cambios
2. Ejecuta nuevamente **diagnostic-backend-correcto.html**
3. Deberías ver: ✅ **MASTER_ENCRYPTION_KEY: Configurada**

## ⚠️ Diferencia Importante

- **Secrets**: Para almacenar datos sensibles de la aplicación
- **Environment Variables**: Para configurar Edge Functions específicamente

Las Edge Functions solo pueden acceder a **Environment Variables**, no a **Secrets**.

## 🔍 Ubicación Exacta

**Settings** → **Edge Functions** → **Environment Variables** (no Secrets)

Si no encuentras esta sección, también puedes:

1. Ir a **Edge Functions** en el menú lateral
2. Buscar un ícono de configuración o "Settings"
3. Buscar "Environment Variables"

¿Puedes intentar configurarlo como Environment Variable en lugar de Secret?
