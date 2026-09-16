# Resumen Ejecutivo: Módulo "Oportunidades" 

**Fecha**: 2026-08-12  
**Objetivo**: CRUD de gestión de oportunidades (análisis de pedidos con aerolíneas)  
**Visibilidad**: Solo AGENCY_ADMIN + ADMIN  

---

## 1. Estructura de Datos

### Tabla `opportunities`
```
id (UUID)
agencia (string) — Scoped por agencia, no editable
temporada (string)
estado (enum) — pendiente | aprobada | rechazada
destino (string) — requerido
compania (string) — requerido
validez (date) — Validez de la cotización
fecha_salida (date) — requerido
fecha_llegada (date)
total_lugares (int)
total_liberados (int)
neto_1 (float) — Neto 1
neto_2 (float) — Neto 2
estado_interno (string) — Notas internas del operador
fecha_cargado (timestamp) — Auto: today, no editable
usuario_cargador (FK Profile) — Auto: current user, no editable
usuario_autorizador (FK Profile) — Solo admin, para aprobación
created_at, updated_at (timestamps)
```

---

## 2. Endpoints API (Backend)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/opportunities` | OPPORTUNITIES_VIEW | Listar (filtrado por agencia) |
| GET | `/api/opportunities/:id` | OPPORTUNITIES_VIEW | Detalle |
| POST | `/api/opportunities` | OPPORTUNITIES_CREATE | Crear (auto-completa usuario_cargador, fecha_cargado, estado=pendiente) |
| PUT | `/api/opportunities/:id` | OPPORTUNITIES_UPDATE | Editar (admin: puede cambiar estado; usuario: solo si creador y estado=pendiente) |
| DELETE | `/api/opportunities/:id` | OPPORTUNITIES_DELETE | Eliminar (admin o creador con estado=pendiente) |
| PUT | `/api/opportunities/:id/approve` | OPPORTUNITIES_UPDATE | Aprobar (admin only, shortcut para estado=aprobada + usuario_autorizador) |

---

## 3. Permisos RBAC

Crear en `seedRBAC()`:
- `OPPORTUNITIES_VIEW`
- `OPPORTUNITIES_CREATE`
- `OPPORTUNITIES_UPDATE`
- `OPPORTUNITIES_DELETE`
- `OPPORTUNITIES_APPROVE` (opcional)

Asignar a:
- `AGENCY_ADMIN` — acceso completo a su agencia
- `SUPER_ADMIN` — acceso total

---

## 4. Reglas de Negocio

| Regla | Implementación |
|-------|-----------------|
| Solo AGENCY_ADMIN/ADMIN ven la sección | Guard en frontend: `can('OPPORTUNITIES_VIEW')` |
| Cada agencia ve solo sus oportunidades | Filter en backend: `WHERE agencia = user.agencia` |
| `usuario_cargador` = quien crea | Backend: `usuario_cargador = c.Get("user_id")` (JWT) |
| `fecha_cargado` = hoy de creación | Backend: `fecha_cargado = time.Now()` |
| Solo admin puede aprobar/rechazar | Handler `UpdateOpportunity`: validar `user.role == 'admin'` |
| Creador puede editar solo si `estado=pendiente` | Handler: chequear estado previo |
| No editable: `usuario_cargador`, `fecha_cargado`, `agencia` | Ignorar en PUT si viene en request |

---

## 5. Páginas y Componentes (Frontend)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pages/GestionOportunidades.jsx` | Page | CRUD table con búsqueda, filtros, acciones |
| `components/OportunityForm.jsx` | Component | Formulario modal (alta/edición) con validaciones Zod |
| `hooks/useOpportunities.ts` | Hook | React Query queries (GET, POST, PUT, DELETE, APPROVE) |
| `lib/permissionModules.js` | Config | Definir `OPPORTUNITIES: { VIEW, CREATE, UPDATE, DELETE, APPROVE }` |
| `Sidebar.jsx` | Actualizar | Agregar entrada: `{ label: 'Oportunidades', path: '/oportunidades', icon: Zap, permission: 'OPPORTUNITIES_VIEW' }` |
| `App.jsx` | Actualizar | Agregar ruta: `{ path: '/oportunidades', element: <GestionOportunidades /> }` |

---

## 6. Tabla de la Página

Columnas visibles:
1. **Acciones** — Editar, Eliminar, Aprobar (según permisos y estado)
2. **Estado** — Badge: `pendiente` (gris) | `aprobada` (verde) | `rechazada` (rojo)
3. **Destino**
4. **Compañía**
5. **Temporada**
6. **Fecha Salida**
7. **Fecha Llegada**
8. **Lugares** (total_lugares)
9. **Liberados** (total_liberados)
10. **Neto 1**
11. **Neto 2**
12. **Usuario Cargador**
13. **Fecha Cargado**

Filtros disponibles:
- Búsqueda: Destino, Compañía
- Selects: Estado, Temporada

---

## 7. Implementación: Checklist Rápido

### Backend (Go)

- [ ] SQL: Crear tabla `opportunities` (migración)
- [ ] Model: Agregar `Opportunity struct` en `models.go`
- [ ] Handler: Crear `opportunities_handler.go` (6 funciones)
- [ ] Routes: Agregar en `main.go` E `api/index.go` (CRÍTICO: ambos)
- [ ] RBAC: Crear permisos en `seedRBAC()`, asignar a roles
- [ ] Validaciones: Requeridos, tipos, scoping de agencia

### Frontend (React)

- [ ] Crear `pages/GestionOportunidades.jsx`
- [ ] Crear `components/OportunityForm.jsx` (Zod schema)
- [ ] Crear `hooks/useOpportunities.ts` (React Query)
- [ ] Actualizar `Sidebar.jsx` (agregar entrada admin)
- [ ] Actualizar `App.jsx` (agregar ruta)
- [ ] Actualizar `permissionModules.js`

### Testing

- [ ] AGENCY_ADMIN: crear, editar propia, no ver otras agencias ✓
- [ ] SALES_AGENT: 403 al acceder ✓
- [ ] ADMIN: ver todas, aprobar/rechazar ✓
- [ ] Estado inicial: `pendiente` ✓
- [ ] Edición bloqueada si no es creador y estado ≠ `pendiente` ✓
- [ ] Rutas en local Y producción ✓

---

## 8. Integración Futura

Una vez listos los "Oportunidades", siguiente paso natural:
- **Botón "Convertir a Producto"**: Oportunidad aprobada → pre-rellena campos en Gestión de Productos

---

## 9. Referencias

- **Modelo de datos**: [app-cupos/005 - Modelo de Datos.md](app-cupos/005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md)
- **Reglas de oro**: [app-cupos/006 - Gotchas y Reglas de Oro.md](app-cupos/006%20-%20Operación%20y%20Mantenimiento/Gotchas%20y%20Reglas%20de%20Oro.md) (Regla 1 sobre 2 entrypoints es CRÍTICA)
- **Plan detallado**: `plans/PLAN_OPORTUNIDADES_CRUD.md` (este repo)

---

**Listo para implementación. ¿Necesitas que desglose alguna sección o comencemos la implementación?**
