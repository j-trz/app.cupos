# 🚨 ERROR CRÍTICO RLS - APLICAR MIGRACIÓN URGENTE

## ❌ ERROR ACTUAL

```
Error: new row violates row-level security policy for table "user_security_status"
Code: 42501 (RLS Policy Violation)
```

## 🔧 SOLUCIÓN INMEDIATA

### **PASO 1: Aplicar Migración SQL**

**URGENTE** - Ejecutar inmediatamente en Supabase SQL Editor:

```sql
-- Ejecutar este script completo: sql/complete_2fa_migration.sql
```

**O ejecutar manualmente:**

```sql
-- 1. Agregar política para INSERT en user_security_status
CREATE POLICY "Users can manage their own security status" ON public.user_security_status
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2. Habilitar RLS
ALTER TABLE public.user_security_status ENABLE ROW LEVEL SECURITY;

-- 3. Agregar políticas para user_sessions si no existen
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

## 🎯 ARCHIVOS LISTOS

1. **[`sql/complete_2fa_migration.sql`](sql/complete_2fa_migration.sql)** - Migración completa
2. **[`sql/fix_user_sessions_rls.sql`](sql/fix_user_sessions_rls.sql)** - Políticas RLS específicas

## ⚡ ACCIONES INMEDIATAS

1. **Ir a Supabase Dashboard** → SQL Editor
2. **Ejecutar**: [`sql/complete_2fa_migration.sql`](sql/complete_2fa_migration.sql)
3. **Reiniciar** la aplicación
4. **Probar** login nuevamente

## 📋 QUE ESPERAR DESPUÉS

✅ **Sin errores 403** en `user_security_status`
✅ **2FA se configura** correctamente
✅ **QR Code aparece** sin problemas
✅ **Sistema funciona** completamente

---

**🚨 CRÍTICO**: Este es el paso que faltaba para completar la integración 2FA. Sin las políticas RLS correctas, la aplicación no puede crear registros en las tablas de seguridad.
