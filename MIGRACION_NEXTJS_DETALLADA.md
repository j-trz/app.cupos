# Plan de Migración de React (Vite) a Next.js

Este documento detalla los pasos necesarios para migrar la aplicación actual a Next.js (App Router), aprovechando Server Components, Server Actions y la optimización nativa de Next.js.

## 1. Estructura de Rutas (App Router)

La migración seguirá el mapeo de rutas de `react-router-dom` a la estructura de carpetas de Next.js:

| Ruta Actual | Ruta Next.js | Descripción |
|-------------|--------------|-------------|
| `/login` | `/login` | Página de autenticación |
| `/dashboard` | `/dashboard` | Panel principal de métricas |
| `/availability` | `/availability` | Buscador de disponibilidad |
| `/requests` | `/reservas/solicitudes` | Gestión de solicitudes |
| `/confirmations` | `/reservas/confirmaciones` | Gestión de confirmaciones |
| `/profile` | `/perfil` | Perfil de usuario |
| `/products` | `/admin/productos` | CRUD de productos (Admin) |
| `/agencias` | `/admin/agencias` | CRUD de agencias (Admin) |
| `/usuarios` | `/admin/usuarios` | CRUD de usuarios (Admin) |
| `/reservas` | `/admin/reservas` | Gestión global de reservas (Admin) |
| `/notificaciones` | `/notificaciones` | Centro de notificaciones |
| `/marca-blanca` | `/admin/marca-blanca` | Configuración de branding |
| `/email-config` | `/admin/email` | Configuración SMTP |
| `/config-ia` | `/admin/ia` | Configuración del Agente IA |
| `/permisos` | `/admin/permisos` | Gestión de permisos granulares |
| `/roles` | `/admin/roles` | Gestión de roles |

## 2. Estrategia de Autenticación

- Se utilizará **NextAuth.js** (o Auth.js) para gestionar las sesiones.
- El backend actual de Node.js seguirá funcionando como la API principal.
- Se implementará un `middleware.ts` para proteger las rutas privadas y de administrador.

## 3. Manejo de Estado y Datos

- **Server Components**: Para la carga inicial de datos en páginas de listado (Usuarios, Productos, Agencias).
- **React Query (TanStack Query)**: Para la gestión de datos en el lado del cliente (formularios, actualizaciones en tiempo real, filtros complejos).
- **Server Actions**: Para operaciones de mutación (POST, PUT, DELETE) para reducir la necesidad de endpoints de API específicos para el frontend en algunos casos, aunque se recomienda seguir usando la API de Node.js para mantener la separación de responsabilidades.

## 4. Componentes de UI

- Se mantendrá el uso de **Tailwind CSS**.
- Los componentes de **Shadcn UI** se moverán a la carpeta `@/components/ui`.
- Se crearán layouts anidados (`layout.tsx`) para compartir la Sidebar y el Header entre páginas.

## 5. Pasos de Ejecución

1. **Inicialización**: Crear nuevo proyecto Next.js con TS, Tailwind y ESLint.
2. **Configuración Base**: Configurar Providers (Auth, Theme, QueryClient).
3. **Migración de Servicios**: Adaptar los archivos en `src/services/` para que funcionen tanto en cliente como en servidor (usando fetch nativo).
4. **Implementación de Layouts**: Crear el RootLayout y el DashboardLayout con la Sidebar migrada.
5. **Migración de Páginas**: Migrar una a una las páginas, comenzando por Login y Dashboard.
6. **Optimización**: Implementar Loading states (`loading.tsx`) y Error boundaries (`error.tsx`).
7. **Verificación**: Pruebas completas de flujo de usuario y permisos.

---
*Este plan asegura que no se pierda ninguna funcionalidad y se mejore la performance y SEO de la aplicación.*
