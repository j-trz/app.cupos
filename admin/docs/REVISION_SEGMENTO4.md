# Revisión de Componentes de Gestión de Usuarios

## Problemas Identificados

### 1. Uso Inseguro de Admin API en Frontend (Crítico)

**En `CrearUsuario.jsx` (línea 18):**
```jsx
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  user_metadata: { nombre, agencia },
  email_confirm: true
});
```

Este es un **problema crítico** porque:
- Expone directamente la funcionalidad de creación de usuarios con capacidades administrativas
- Cualquier usuario con acceso al código frontend podría crear usuarios administradores
- Violación grave de principios de seguridad (no se debe confiar en el cliente para operaciones sensibles)

**En `GestionUsuarios.jsx` (líneas 119-122):**
```jsx
const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email: data.email,
  password: data.password
});
```

Este enfoque es inseguro porque:
- Permite que cualquier cliente pueda crear nuevos usuarios sin verificación de permisos
- No se valida si el usuario actual tiene derecho a crear nuevos usuarios
- Facilita ataques de enumeración de usuarios o floods de registro

### 2. Asignación Directa de Roles sin Validación (Alto Riesgo)

**En `CrearUsuario.jsx` (líneas 36, 67-68):**
```jsx
admin

<input type="checkbox" id="admin" checked={admin} onChange={e => setAdmin(e.target.checked)} />
```

**En `GestionUsuarios.jsx` (línea 139):**
```jsx
admin: data.admin
```

Problemas:
- Los usuarios finales pueden manipular esta propiedad mediante herramientas de desarrollo
- No existe validación en el backend para verificar si el usuario actual tiene permisos de administrador
- Cualquier usuario podría convertirse en administrador enviando solicitudes modificadas

### 3. Manipulación Directa de Tabla Profiles (Medio-Alto Riesgo)

**En `CrearUsuario.jsx` (líneas 31-37):**
```jsx
const { error: perfilError } = await supabase.from('profiles').insert({
  id: userId,
  email,
  nombre,
  agencia,
  admin
});
```

**En `GestionUsuarios.jsx` (líneas 108-112):**
```jsx
const { error } = await supabase.from('profiles').update({
  nombre: data.nombre,
  agencia: data.agencia,
  admin: data.admin
}).eq('id', editUser.id);
```

Riesgos:
- Posibilidad de Insecure Direct Object Reference (IDOR)
- No se verifica si el usuario actual tiene permisos para modificar estos registros
- Exposición de datos sensibles mediante consultas directas

## Recomendaciones de Seguridad

### 1. Eliminar Todos los Uso de Admin API en el Frontend

**Enfoque incorrecto (actual):**
```jsx
supabase.auth.admin.createUser(...)
```

**Enfoque recomendado:**
```jsx
// Llamada segura a una función backend
const { data, error } = await supabase.functions.invoke('user-management', {
  body: {
    action: 'create-user',
    email: data.email,
    password: data.password,
    metadata: { nombre, agencia }
  }
});
```

### 2. Implementar Funciones Backend para Gestión de Usuarios

Crear una función serverless para operaciones sensibles:

```ts
// supabase/functions/user-management/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    // 1. Verificar autenticación
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
    
    // 2. Verificar rol de administrador
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile?.admin) {
      return jsonResponse({ error: 'Forbidden: Admin required' }, 403);
    }

    // 3. Procesar acción solicitada
    const { action, ...payload } = await req.json();
    
    switch (action) {
      case 'create-user':
        return await handleCreateUser(payload);
      case 'update-user':
        return await handleUpdateUser(payload);
      case 'delete-user':
        return await handleDeleteUser(payload);
      default:
        return jsonResponse({ error: 'Invalid action' }, 400);
    }
    
  } catch (error) {
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// Implementar handlers específicos...
```

### 3. Implementar RLS Estrictos en Tabla Profiles

```sql
-- Política para SELECT (solo ver tu propio perfil o todos si eres admin)
CREATE POLICY "Perfil propio"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin ve todos los perfiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND admin = true
  ));

-- Política para INSERT (solo admins)
CREATE POLICY "Admin crea perfiles"
  ON profiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND admin = true
  ));

-- Política para UPDATE (solo propietario o admin)
CREATE POLICY "Propietario o admin actualiza"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin = true)
  );
```

### 4. Refactorizar Componentes Frontend

**Ejemplo de `CrearUsuario.jsx` modificado:**

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Llamada a la función backend segura
    const { data, error } = await supabase.functions.invoke('user-management', {
      body: {
        action: 'create-user',
        email,
        password,
        metadata: { nombre, agencia },
        admin
      }
    });

    if (error) throw error;
    
    Swal.fire({ 
      icon: 'success', 
      title: 'Usuario creado',
      text: 'El usuario fue creado correctamente.' 
    });
    
    // Reiniciar formulario
    setEmail(""); setNombre(""); setAgencia(""); setPassword(""); setAdmin(false);
    
  } catch (error) {
    Swal.fire({ 
      icon: 'error', 
      title: 'Error', 
      text: error.message || 'No se pudo crear el usuario' 
    });
  } finally {
    setLoading(false);
  }
};
```

### 5. Validación Adicional Frontend (como medida complementaria)

```jsx
// En GestionUsuarios.jsx - validar antes de mostrar opciones
const canPerformAction = (action) => {
  const currentUser = getCurrentUser();
  // Solo mostrar opciones de edición/admin para usuarios con permisos
  return currentUser?.admin || 
         (action === 'edit' && currentUser?.id === selectedUser.id);
};
```

## Conclusión

La gestión actual de usuarios presenta graves vulnerabilidades de seguridad que podrían permitir a cualquier usuario tomar control administrativo de la aplicación. Es crítico:

1. Eliminar todas las llamadas a admin API del frontend
2. Implementar una capa de backend para operaciones sensibles
3. Configurar RLS estrictos en Supabase
4. Agregar validación adicional en el frontend como medida complementaria

**Importante:** Este no es un problema que se pueda resolver solo con cambios en el frontend. La implementación de una capa de backend es absolutamente necesaria para garantizar la seguridad adecuada.