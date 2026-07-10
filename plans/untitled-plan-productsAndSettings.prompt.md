Plan de trabajo

1. Finalizar el Sidebar
- Asegurar que el menú de usuario funciona correctamente.
- Eliminar opciones redundantes y mantener solo acceso a Cerrar sesión en modo colapsado.
- Confirmar que el perfil y ajustes se navegan correctamente desde el dropdown.

2. Implementar CRUD de Productos
- Backend: revisar y completar endpoints existentes en /api/products.
- Frontend: crear productService.js y página Products.jsx.
- UI: tabla de productos, modal/form de crear/editar, botones editar/eliminar.
- Validaciones mínimas de campos obligatorios y manejo de errores.

3. Implementar gestión de Agencias
- Backend: crear endpoints CRUD para agencies si todavía no existen.
- Frontend: crear agencyService.js y página Agencies.jsx.
- UI: tabla de agencias, formulario de alta/edición, permisos para admin.

4. Implementar settings white-label
- Backend: exponer /api/settings con listado, detalle y actualización.
- Frontend: página Settings.jsx con lista de ajustes, edición inline y campos de white-label.
- Más adelante: soporte de upload de logos y colores de marca.

5. Integrar permisos y rutas
- Condicionar el sidebar para mostrar solo Productos/Agencias/Ajustes a admins.
- Asegurar que las rutas protegidas usan ProtectedRoute y los endpoints usan isAdmin.

6. Pulir y validar
- Probar el build de frontend y backend.
- Probar los flujos CRUD de productos y settings.
- Ajustar mensajes de usuario y estados de carga.

Siguiente paso inmediato
- Seguir con el CRUD de Productos: servicio frontend + página + prueba de carga.
