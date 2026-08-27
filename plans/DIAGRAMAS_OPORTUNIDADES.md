# Diagramas y Flujos: Módulo "Oportunidades"

---

## 1. Flujo de Datos - Ciclo Completo de Oportunidad

```mermaid
flowchart TD
    A["AGENCY_ADMIN abre 'Oportunidades'"] --> B["GestionOportunidades.jsx"]
    B --> C["GET /api/opportunities (filtrado por agencia)"]
    C --> D["useOpportunities hook"]
    D --> E["Tabla con lista de oportunidades"]
    
    E --> F{"Acción elegida"}
    
    F -->|"Crear"| G["Abre OportunityForm modal (vacío)"]
    F -->|"Editar"| H["Abre OportunityForm modal (pre-lleno)"]
    F -->|"Eliminar"| I["POST DELETE con confirmación"]
    F -->|"Aprobar (admin)"| J["PUT /opportunities/:id/approve"]
    
    G --> K["Completa formulario (destino, compañía, fechas, etc.)"]
    K --> L["POST /api/opportunities"]
    L --> M["Handler: CreateOpportunity"]
    M --> N["Auto-completa:<br/>- usuario_cargador = user.id<br/>- fecha_cargado = now()<br/>- estado = pendiente<br/>- agencia = user.agencia"]
    N --> O["INSERT en DB"]
    O --> P["Toast: Oportunidad creada"]
    P --> Q["Refetch con React Query"]
    
    H --> R["Edita campos (respeta no-editables)"]
    R --> S["PUT /api/opportunities/:id"]
    S --> T["Handler: UpdateOpportunity"]
    T --> U{"¿Es admin?"}
    U -->|"Sí"| V["Puede cambiar estado, usuario_autorizador"]
    U -->|"No"| W["Validar: creador AND estado=pendiente"]
    V --> X["UPDATE en DB"]
    W --> X
    X --> Y["Toast: Oportunidad actualizada"]
    Y --> Q
    
    J --> Z["Handler: ApproveOpportunity"]
    Z --> AA["estado = aprobada"]
    AA --> AB["usuario_autorizador = admin.id"]
    AB --> X
    
    I --> AC["Handler: DeleteOpportunity"]
    AC --> AD{"¿Cumple condición?<br/>(admin OR creador AND pendiente)"}
    AD -->|"Sí"| AE["DELETE en DB"]
    AD -->|"No"| AF["403 Forbidden"]
    AE --> AG["Toast: Oportunidad eliminada"]
    AG --> Q
```

---

## 2. Arquitectura: Componentes y Servicios

```mermaid
graph TB
    subgraph Frontend["Frontend (React)"]
        A["GestionOportunidades.jsx<br/>(Page principal)"]
        B["OportunityForm.jsx<br/>(Modal formulario)"]
        C["useOpportunities hook<br/>(React Query)"]
        D["apiClient<br/>(Axios)"]
        E["Sidebar.jsx<br/>(Entrada admin)"]
        
        A -->|"abre"| B
        A -->|"usa"| C
        B -->|"submit"| C
        C -->|"fetch/mutate"| D
        E -->|"navega a"| A
    end
    
    subgraph Backend["Backend (Go)"]
        F["Gin Router<br/>(main.go + api/index.go)"]
        G["middleware.RequirePermission<br/>(OPPORTUNITIES_*)"]
        H["opportunities_handler.go<br/>(GetOpportunities, CreateOpportunity, etc.)"]
        I["Opportunity Model<br/>(models.go)"]
        J["GORM ORM"]
    end
    
    subgraph Database["Database (Postgres/Neon)"]
        K["opportunities table"]
        L["profiles table<br/>(usuario_cargador FK)"]
    end
    
    subgraph RBAC["RBAC System"]
        M["permissions table<br/>(OPPORTUNITIES_*)"]
        N["roles table<br/>(AGENCY_ADMIN, SUPER_ADMIN)"]
        O["role_permissions table<br/>(mapping)"]
    end
    
    D -->|"POST /api/opportunities"| F
    F -->|"check"| G
    G -->|"call"| H
    H -->|"use"| I
    I -->|"persist"| J
    J -->|"write/read"| K
    J -->|"validate FK"| L
    G -->|"validate against"| M
    M -->|"belongs to"| N
    N -->|"mapped by"| O
    
    style Frontend fill:#e1f5ff
    style Backend fill:#fff3e0
    style Database fill:#f3e5f5
    style RBAC fill:#e8f5e9
```

---

## 3. Máquina de Estados: Estados de Oportunidad

```mermaid
stateDiagram-v2
    [*] --> Pendiente: CreateOpportunity
    
    Pendiente --> Pendiente: UpdateOpportunity<br/>(creador)
    Pendiente --> Aprobada: ApproveOpportunity<br/>(admin)
    Pendiente --> Rechazada: UpdateOpportunity<br/>(admin: estado=rechazada)
    Pendiente --> [*]: DeleteOpportunity
    
    Aprobada --> [*]: (en el futuro)<br/>Convertir a Producto
    Rechazada --> [*]: (fin)
    
    note right of Pendiente
        - Creador puede editar
        - Admin puede aprobar/rechazar
        - Se puede eliminar
    end note
    
    note right of Aprobada
        - Usuario autorizador grabado
        - No se puede editar (ro)
        - Candidata a Producto
    end note
    
    note right of Rechazada
        - Estado final
        - No se puede editar
    end note
```

---

## 4. Matriz de Permisos y Acciones

```
┌────────────────────┬──────────────┬──────────────┬────────────┐
│ Acción             │ AGENCY_ADMIN  │ SALES_AGENT  │ ADMIN      │
├────────────────────┼──────────────┼──────────────┼────────────┤
│ Ver propias        │ ✓            │ ✗ (403)      │ ✓ (todas)  │
│ Crear              │ ✓            │ ✗ (403)      │ ✓          │
│ Editar propia*     │ ✓ (pending)  │ ✗ (403)      │ ✓ (any)    │
│ Editar otra agenc. │ ✗ (403)      │ ✗ (403)      │ ✓          │
│ Eliminar propia*   │ ✓ (pending)  │ ✗ (403)      │ ✓          │
│ Eliminar otra      │ ✗ (403)      │ ✗ (403)      │ ✓          │
│ Aprobar/Rechazar   │ ✗            │ ✗ (403)      │ ✓          │
│ Ver usuario_autor. │ N/A          │ N/A          │ ✓          │
└────────────────────┴──────────────┴──────────────┴────────────┘

* Condiciones adicionales:
  - Editar: solo si es creador (usuario_cargador) Y estado=pendiente
  - Eliminar: admin siempre, o creador con estado=pendiente
```

---

## 5. Flujo HTTP: Creación de Oportunidad

```mermaid
sequenceDiagram
    participant User as AGENCY_ADMIN
    participant Frontend as React App
    participant Backend as Go API
    participant DB as Postgres

    User->>Frontend: Click "Crear"
    Frontend->>Frontend: Abre OportunityForm modal
    User->>Frontend: Completa datos + Submit
    Frontend->>Frontend: Validación Zod (local)
    Frontend->>Backend: POST /api/opportunities {destino, compania, ...}
    
    Backend->>Backend: middleware.AuthMiddleware (valida JWT)
    Backend->>Backend: middleware.RequirePermission("OPPORTUNITIES_CREATE")
    Backend->>Backend: CreateOpportunity handler
    
    Backend->>Backend: Auto-completa:<br/>usuario_cargador = user.id<br/>fecha_cargado = now()<br/>estado = "pendiente"<br/>agencia = user.agencia
    
    Backend->>Backend: Validaciones (requeridos, tipos)
    Backend->>DB: INSERT INTO opportunities (...)
    DB->>DB: Ejecuta INSERT
    DB-->>Backend: OK, id generado
    
    Backend-->>Frontend: 201 Created {id, ...}
    Frontend->>Frontend: React Query invalidateQueries
    Frontend->>Backend: GET /api/opportunities (refetch)
    Backend->>DB: SELECT * FROM opportunities WHERE agencia=...
    DB-->>Backend: Resultado
    Backend-->>Frontend: 200 OK [oportunidades]
    Frontend->>Frontend: Actualiza tabla
    Frontend->>User: Toast: "Oportunidad creada"
    Frontend->>Frontend: Cierra modal
```

---

## 6. Estructura de Directorios (Archivos Nuevos)

```
form-cupos/
├── backend-go/
│   ├── cmd/api/
│   │   └── main.go                       [ACTUALIZAR: agregar rutas]
│   ├── api/
│   │   └── index.go                      [ACTUALIZAR: agregar rutas]
│   ├── migrations/
│   │   └── 002_create_opportunities.sql  [NUEVO]
│   └── pkg/
│       ├── database/
│       │   └── db.go                     [ACTUALIZAR: AutoMigrate + seedRBAC]
│       ├── handlers/
│       │   └── opportunities_handler.go  [NUEVO]
│       ├── middleware/
│       │   └── auth.go                   [Sin cambios: RequirePermission existente]
│       └── models/
│           └── models.go                 [ACTUALIZAR: agregar Opportunity struct]
│
├── frontend/
│   └── src/
│       ├── components/
│       │   └── OportunityForm.jsx        [NUEVO]
│       ├── contexts/
│       │   └── AuthContext.jsx           [Sin cambios]
│       ├── hooks/
│       │   └── useOpportunities.ts       [NUEVO]
│       ├── lib/
│       │   └── permissionModules.js      [ACTUALIZAR: agregar OPPORTUNITIES]
│       ├── pages/
│       │   └── GestionOportunidades.jsx  [NUEVO]
│       ├── App.jsx                       [ACTUALIZAR: agregar ruta]
│       └── components/ui/
│           └── Sidebar.jsx               [ACTUALIZAR: agregar entrada admin]
│
└── plans/
    ├── PLAN_OPORTUNIDADES_CRUD.md        [NUEVO: detallado]
    ├── OPORTUNIDADES_RESUMEN.md          [NUEVO: resumen ejecutivo]
    └── DIAGRAMAS_OPORTUNIDADES.md        [NUEVO: este archivo]
```

---

## 7. Validaciones en el Formulario (Zod Schema)

```javascript
// frontend/src/schemas/opportunitySchema.ts
export const opportunitySchema = z.object({
  agencia: z.string().min(1, "Agencia requerida"),
  destino: z.string().min(1, "Destino requerido"),
  compania: z.string().min(1, "Compañía requerida"),
  temporada: z.string().optional(),
  validez: z.date().optional(),
  fecha_salida: z.date()
    .min(new Date(), "Fecha salida no puede ser en el pasado"),
  fecha_llegada: z.date().optional(),
  total_lugares: z.number()
    .int()
    .min(0, "Lugares debe ser >= 0"),
  total_liberados: z.number()
    .int()
    .min(0, "Liberados debe ser >= 0"),
  neto_1: z.number().optional(),
  neto_2: z.number().optional(),
  estado_interno: z.string().optional(),
  // Admin only:
  estado: z.enum(['pendiente', 'aprobada', 'rechazada']).optional(),
  usuario_autorizador: z.string().uuid().optional(),
});

// Validación cruzada (server-side en Go):
// - fecha_llegada >= fecha_salida (si ambas presentes)
// - total_liberados <= total_lugares
// - usuario_autorizador debe existir en profiles
```

---

## 8. Integración con Vault de Obsidian

**Archivos a actualizar en `app-cupos/`:**

1. **`005 - Arquitectura y Datos/Modelo de Datos.md`**
   - Nueva sección: **Oportunidades (`opportunities`)**
   - Explicar relación con `Product`
   - Trazabilidad de usuario_cargador/usuario_autorizador

2. **`003 - Funcionalidades/Flujos de Funcionalidades.md`**
   - Nueva sección: **19. Oportunidades (Análisis de Pedidos)**
   - Diagrama de máquina de estados
   - Endpoints y permisos
   - Scoping de agencia

3. **`006 - Operación y Mantenimiento/Gotchas y Reglas de Oro.md`**
   - Agregar nota si alguna regla nueva emerge (ej. "Oportunidades no se ven hasta que estén en la BD")

4. **`log.md`**
   - Entrada: `[2026-08-12] Alta: Módulo Oportunidades (CRUD, RBAC, scoping agencia)`

---

## 9. Checklist de Testing Automático (Pytest/Go)

```go
// backend-go/tests/opportunities_test.go (nuevo)

func TestCreateOpportunity_AsAgencyAdmin(t *testing.T) {
  // Arrange
  adminToken := getJWT("agency_admin", "test_agencia")
  
  // Act
  response := POST("/api/opportunities",
    Body{
      Destino: "NYC",
      Compania: "AA",
      FechaSalida: "2026-09-15",
      TotalLugares: 50,
    },
    Headers{"Authorization": "Bearer " + adminToken},
  )
  
  // Assert
  AssertStatusCode(response, 201)
  AssertNotNil(response.ID)
  AssertEqual(response.UsuarioCargador, adminUserID)
  AssertEqual(response.Estado, "pendiente")
  AssertEqual(response.Agencia, "test_agencia")
}

func TestCreateOpportunity_AsSalesAgent_Forbidden(t *testing.T) {
  // Un SALES_AGENT no tiene permiso OPPORTUNITIES_CREATE
  agentToken := getJWT("agency_user", "test_agencia")
  response := POST("/api/opportunities", Body{...}, Headers{"Authorization": "Bearer " + agentToken})
  AssertStatusCode(response, 403)
}

func TestUpdateOpportunity_OnlyCreatorOrAdmin(t *testing.T) {
  // Creador puede editar si status=pendiente
  // Otro usuario: 403
  // Admin: siempre puede
}

func TestApproveOpportunity_AdminOnly(t *testing.T) {
  // Solo admin puede cambiar estado a aprobada
  // Otros: 403
}

func TestDeleteOpportunity_CreatorOrAdmin(t *testing.T) {
  // Creador puede eliminar si status=pendiente
  // Admin: siempre
  // Otros: 403
}
```

---

## 10. Checklist de Prueba Manual (QA)

### Happy Path: Crear → Editar → Aprobar

1. [ ] Loguearse como AGENCY_ADMIN de "Agencia Test"
2. [ ] Navegar a "Oportunidades" (debe aparecer en sidebar)
3. [ ] Click "Crear"
4. [ ] Completar form: Destino=NYC, Compañía=AA, Salida=2026-09-15, etc.
5. [ ] Submit
6. [ ] Verificar que aparece en la tabla
7. [ ] Verificar que estado=`pendiente`
8. [ ] Verificar que `usuario_cargador`=correo del logged
9. [ ] Click "Editar", cambiar Neto1 a 500, guardar
10. [ ] Loguearse como ADMIN (otra pestaña)
11. [ ] Navegar a "Oportunidades"
12. [ ] Ver oportunidad de "Agencia Test"
13. [ ] Click "Aprobar"
14. [ ] Verificar estado=`aprobada`
15. [ ] Verificar `usuario_autorizador`=correo del admin
16. [ ] Loguearse como AGENCY_ADMIN
17. [ ] Intentar editar oportunidad aprobada (debe fallar o ser read-only)

### Edge Cases

1. [ ] SALES_AGENT intenta acceder a /oportunidades → 403 o "Acceso restringido"
2. [ ] SALES_AGENT intenta POST /api/opportunities → 403
3. [ ] AGENCY_ADMIN intenta eliminar oportunidad aprobada → error "No se puede eliminar en este estado"
4. [ ] AGENCY_ADMIN de Agencia A ve oportunidades de Agencia B → 404 (ver GET error)
5. [ ] Crear oportunidad con `fecha_llegada < fecha_salida` → validation error
6. [ ] Crear con `total_liberados > total_lugares` → validation error (server-side)

---

**Fin del documento de diagramas y flujos.**

Versión 1.0 — Listo para desarrollo.
