# Instrucciones para la Ejecución de la Migración a Next.js (IA Task)

Eres un ingeniero experto en Next.js y React. Tu misión es migrar el repositorio actual a Next.js (App Router) siguiendo estrictamente estas instrucciones.

## Contexto
El proyecto es un Sistema de Gestión de Cupos con un backend en Node.js/Express y un frontend en React/Vite. El backend se mantendrá como está, pero el frontend debe ser transformado totalmente.

## Reglas de Oro
1. **No perder funcionalidad**: Cada botón, filtro y validación actual debe existir en la nueva versión.
2. **Seguridad primero**: Implementar `middleware.ts` para proteger rutas. Solo `admin` puede entrar a `/admin/*`.
3. **Tipado estricto**: Usa TypeScript para todos los nuevos componentes y servicios.
4. **Componentes Reutilizables**: Usa la estructura de Shadcn UI que ya está presente en el proyecto original.

## Pasos Detallados

### 1. Preparación del Entorno
- Crea una carpeta `next-frontend`.
- Ejecuta `npx create-next-app@latest next-frontend --typescript --tailwind --eslint`.
- Instala dependencias clave: `lucide-react`, `clsx`, `tailwind-merge`, `date-fns`, `tanstack/react-query`, `next-auth`, `axios`, `sweetalert2`.

### 2. Migración de Componentes de UI
- Copia y adapta los componentes de `frontend/src/components/ui/` a `next-frontend/components/ui/`.
- Asegúrate de que los componentes de Radix UI estén correctamente configurados.

### 3. Sistema de Autenticación
- Configura NextAuth en `app/api/auth/[...nextauth]/route.ts`.
- Crea un provider que se conecte al endpoint `/api/auth/login` del backend de Node.js.
- Guarda el JWT en la sesión de NextAuth para usarlo en las llamadas a la API.

### 4. Capa de Servicios (API Client)
- Crea un cliente de API en `lib/api-client.ts` que use el token de la sesión.
- Migra todos los servicios de `frontend/src/services/` a la carpeta `services/` de Next.js, asegurando que soporten llamadas desde Server Components.

### 5. Layout y Navegación
- Crea el `app/(dashboard)/layout.tsx` que incluya la `Sidebar` y el `Header`.
- Migra la lógica de `Sidebar.jsx` a un componente de Next.js, actualizando los `NavLink` por `Link` de Next.js.

### 6. Migración de Páginas (Prioridad)
- **Login**: `app/login/page.tsx`.
- **Dashboard**: `app/(dashboard)/dashboard/page.tsx`. Usa Recharts para los gráficos.
- **Productos**: `app/(dashboard)/admin/productos/page.tsx`. Implementa la carga masiva (bulk insert).
- **Usuarios**: `app/(dashboard)/admin/usuarios/page.tsx`. Implementa la selección de roles granulares desde el listado.
- **IA**: `app/(dashboard)/admin/ia/page.tsx`. Migra el widget de chat flotante.

### 7. Funcionalidades Especiales
- **Carga Masiva**: En la página de productos, crea un modal que acepte archivos .csv/.xlsx (usa `papaparse` o `xlsx`) y llame a `/api/products/bulk`.
- **Reportes**: Crea la página `app/(dashboard)/reportes/page.tsx` conectando con los nuevos endpoints de `/api/reports`.

## Verificación Final
- El usuario debe poder loguearse y ver solo lo que su rol permite.
- Las peticiones a la API deben llevar el Header `Authorization: Bearer <token>`.
- La carga masiva debe validar errores y mostrar feedback al usuario.
- El sistema de permisos granulares debe reflejarse en la UI (ocultar/deshabilitar botones si no tiene el permiso).

*Sigue este plan minuciosamente para asegurar una transición exitosa.*
