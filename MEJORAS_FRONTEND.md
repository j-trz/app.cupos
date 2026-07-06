# Instrucciones para la Mejora del Frontend (React Vite)

Eres un desarrollador frontend senior especializado en React, Tailwind CSS y Shadcn UI. Tu objetivo es aplicar una serie de mejoras críticas al frontend actual para elevar su calidad, rendimiento y experiencia de usuario.

## 1. Optimización del Estado del Servidor con React Query
- **Tarea**: Migrar todas las llamadas a la API de `useEffect` a `TanStack React Query (v5)`.
- **Implementación**:
  - Configurar un `QueryClientProvider` en `App.jsx`.
  - Crear hooks personalizados para cada entidad (ej. `useUsers`, `useProducts`).
  - Implementar caché, reintentos automáticos y estados de carga (`isLoading`, `isError`).
  - Usar `useMutation` para operaciones de creación, actualización y borrado con invalidación de caché optimista.

## 2. Gestión de Formularios y Validación
- **Tarea**: Implementar `React Hook Form` combinado con `Zod` para la validación de esquemas.
- **Implementación**:
  - Reemplazar los estados manuales en modales de creación/edición.
  - Definir esquemas de Zod para Usuarios, Productos y Agencias.
  - Mostrar mensajes de error en tiempo real debajo de los inputs.
  - Asegurar que los botones de envío se deshabiliten durante la carga.

## 3. Mejora de la Experiencia de Usuario (UX)
- **Tarea**: Implementar estados de carga visuales y notificaciones consistentes.
- **Implementación**:
  - **Skeletons**: Usar el componente `Skeleton` de Shadcn para las tablas y tarjetas mientras los datos cargan.
  - **Toasts**: Sustituir algunos `Swal.fire` básicos por el componente `Toast` de Shadcn para notificaciones menos intrusivas de éxito/error.
  - **Empty States**: Crear componentes visuales para cuando no hay resultados en las búsquedas o tablas.

## 4. Módulo de Reportería Avanzado
- **Tarea**: Crear la página de Dashboard basada en los nuevos endpoints de `/api/reports`.
- **Implementación**:
  - Usar `Recharts` para visualizar:
    - Gráfico de barras: Ventas por agencia.
    - Gráfico de dona: Distribución de estados de reserva.
    - Gráfico de líneas: Evolución histórica de ventas.
  - Añadir filtros por rango de fechas y agencia (solo para admins).

## 5. UI para Carga Masiva de Productos
- **Tarea**: Implementar una interfaz amigable para subir archivos CSV/Excel.
- **Implementación**:
  - Crear un componente de "Dropzone" en la página de Productos.
  - Usar `PapaParse` para procesar el CSV en el cliente antes de enviarlo.
  - Mostrar una tabla de previsualización con los datos cargados.
  - Permitir al usuario corregir errores antes de enviar a `/api/products/bulk`.

## 6. Selección de Permisos Granulares
- **Tarea**: Mejorar la interfaz de asignación de roles y permisos en el perfil de usuario.
- **Implementación**:
  - En el modal de usuario, usar un componente de `Multi-select` o una lista organizada por módulos con checkboxes.
  - Agrupar los permisos por categoría (Dashboard, Usuarios, Reservas, etc.).
  - Permitir asignar roles predefinidos que autoseleccionen los permisos asociados.

---
**Nota**: Mantén la consistencia estética con el diseño actual basado en Slate-950 y blanco. No elimines funcionalidades existentes, mejóralas.
