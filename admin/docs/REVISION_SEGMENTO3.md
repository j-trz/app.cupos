# Revisión de Seguridad: Implementación de Rutas Privadas y de Administrador

## Problemas Identificados

### 1. Consultas Directas a la Base de Datos en el Frontend

Se ha identificado un problema crítico de seguridad en múltiples componentes:

- `AdminRoute.jsx`: Consulta directamente la tabla `profiles` para verificar si el usuario es administrador
- `Sidebar.jsx`: Realiza la misma consulta para mostrar/ocultar secciones de administrador
- `Solicitudes.jsx` y `Confirmaciones.jsx`: Consultan la tabla `profiles` para filtrar datos según el rol del usuario
- `GestionUsuarios.jsx`: Duplica la lógica de verificación de administrador

Este patrón es problemático porque expone la lógica de autorización en el frontend, donde puede ser manipulada fácilmente por usuarios maliciosos.

### 2. Uso Directo de Funciones Admin de Supabase

En `CrearUsuario.jsx`, se utilizan funciones admin de Supabase directamente desde el frontend:

```jsx
// Línea 111
const { data: { user }, error } = await supabase.auth.admin.createUser({
  email: formData.email,
  password: "temporal123",
  email_confirm: true
});
```

Esto es extremadamente peligroso, ya que cualquier persona que pueda inspeccionar el código frontend tendría acceso potencial a funcionalidades administrativas si puede manipular las llamadas API.

### 3. Falta de Capa de Backend

La aplicación carece completamente de una capa de backend que actúe como intermediaria para operaciones sensibles. Todas las operaciones críticas se realizan directamente desde el cliente a Supabase.

## Recomendaciones de Seguridad

### 1. Implementar una Capa de Backend con Supabase Functions

Se recomienda encarecidamente implementar una capa de backend utilizando Supabase Functions (functions serverless) para manejar todas las operaciones sensibles:

```bash
# Crear directorio para funciones
mkdir -p supabase/functions/auth-service
```

### 2. Mover la Lógica de Autorización al Backend

Crear una función de servidor para verificar el rol de usuario:

```ts
// supabase/functions/auth-service/verify-role.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  // Verificar autenticación
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Verificar el token con Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) throw userError;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar rol de administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ 
      isAdmin: profile?.admin || false,
      userId: user.id,
      email: user.email
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### 3. Implementar RLS (Row Level Security) en Supabase

Asegurarse de que todas las tablas críticas tengan políticas RLS adecuadas:

```sql
-- Política para la tabla profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND admin = true
  ));

-- Política para insertar usuarios (solo admins)
CREATE POLICY "Admin can create users"
  ON profiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND admin = true
  ));
```

### 4. Refactorizar el Frontend para Usar la Capa de Backend

Modificar los componentes frontend para llamar a las funciones backend en lugar de consultar directamente Supabase:

```jsx
// Ejemplo de AdminRoute.jsx modificado
export default function AdminRoute({ children }) {
  const [access, setAccess] = React.useState({ loading: true, isAdmin: false });

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('auth-service', {
          body: { action: 'check-role', role: 'admin' }
        });

        if (error) throw error;
        setAccess({ loading: false, isAdmin: data?.isAdmin || false });
      } catch (err) {
        console.error('Error checking admin status:', err);
        setAccess({ loading: false, isAdmin: false });
      }
    };

    checkAdminStatus();
  }, []);

  if (access.loading) return <div>Cargando...</div>;
  if (!access.isAdmin) return <Navigate to="/" replace />;
  return children;
}
```

## Conclusión

La arquitectura actual presenta riesgos de seguridad significativos al confiar en el frontend para la lógica de autorización y al exponer funciones admin directamente. Se recomienda encarecidamente implementar una capa de backend para manejar todas las operaciones sensibles, utilizando Supabase Functions y RLS adecuadamente.