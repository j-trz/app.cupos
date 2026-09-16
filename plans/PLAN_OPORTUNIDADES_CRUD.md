# Plan de Implementación: Módulo "Oportunidades" (Admin CRUD)

**Fecha**: 2026-08-12  
**Versión**: 1.0  
**Estado**: Planificación  

## Descripción General

Crear una nueva sección admin **"Oportunidades"** (CRUD) para gestionar pedidos con aerolíneas. Visible únicamente para:
- Gestores de agencias (`AGENCY_ADMIN`)
- Administradores del sistema (`ADMIN`)

Cada oportunidad representa una cotización/análisis de un pedido potencial que será aprobado o rechazado antes de convertirse en un producto real en "Gestión de Productos".

---

## 1. Tabla de Base de Datos: `opportunities`

### Definición SQL

```sql
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia VARCHAR(255) NOT NULL,
  
  -- Datos de la oportunidad
  temporada VARCHAR(100),
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- pendiente, aprobada, rechazada
  destino VARCHAR(255) NOT NULL,
  compania VARCHAR(255) NOT NULL,
  validez DATE, -- Validez de la cotización
  fecha_salida DATE NOT NULL,
  fecha_llegada DATE,
  total_lugares INT NOT NULL DEFAULT 0,
  total_liberados INT NOT NULL DEFAULT 0,
  
  -- Precios y análisis
  neto_1 NUMERIC(12,2),
  neto_2 NUMERIC(12,2),
  estado_interno VARCHAR(50), -- Campo adicional para control interno
  
  -- Trazabilidad
  fecha_cargado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_cargador UUID NOT NULL REFERENCES profiles(id),
  usuario_autorizador UUID REFERENCES profiles(id),
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_opportunities_agencia (agencia),
  INDEX idx_opportunities_estado (estado),
  INDEX idx_opportunities_destino (destino),
  INDEX idx_opportunities_temporada (temporada)
);
```

### Notas de Implementación
- `agencia` NO es FK (siguiendo patrón de `Product`), pero se valida contra el catálogo
- `estado` es enum stricto: `pendiente` | `aprobada` | `rechazada` (capturado en Go model)
- `fecha_cargado` se autocompleta en creación (no puede venir del request)
- `usuario_cargador` se autocompleta de `user.id` del token JWT (no puede venir del request)
- `usuario_autorizador` se completa solo con `PUT` si el usuario es admin
- `estado_interno` es string libre (para anotaciones internas del operador)

---

## 2. Modelo Go: `Opportunity`

**Archivo**: `backend-go/pkg/models/models.go`

Agregar estructura:

```go
// Opportunity representa una oportunidad/cotización de pedido con aerolínea
type Opportunity struct {
	ID                 uuid.UUID  `gorm:"primaryKey" json:"id"`
	Agencia            string     `json:"agencia"`
	Temporada          *string    `json:"temporada"`
	Estado             string     `json:"estado"` // pendiente, aprobada, rechazada
	Destino            string     `json:"destino"`
	Compania           string     `json:"compania"`
	Validez            *time.Time `json:"validez"`
	FechaSalida        time.Time  `json:"fecha_salida"`
	FechaLlegada       *time.Time `json:"fecha_llegada"`
	TotalLugares       int        `json:"total_lugares"`
	TotalLiberados     int        `json:"total_liberados"`
	Neto1              *float64   `json:"neto_1"`
	Neto2              *float64   `json:"neto_2"`
	EstadoInterno      *string    `json:"estado_interno"`
	FechaCargado       time.Time  `json:"fecha_cargado"`
	UsuarioCargador    uuid.UUID  `json:"usuario_cargador"`
	UsuarioAutorizador *uuid.UUID `json:"usuario_autorizador"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// TableName especifica el nombre de la tabla en la BD
func (Opportunity) TableName() string {
	return "opportunities"
}
```

---

## 3. Backend: Handlers

**Archivo**: `backend-go/pkg/handlers/opportunities_handler.go` (nuevo)

### Estructura de Handlers

#### a) `GetOpportunities` — GET `/api/opportunities`
- Query params: `search`, `temporada`, `estado`, `destino`, `compania`, `agencia` (solo admin)
- Filtra por agencia del usuario (salvo si es admin)
- Devuelve array de `Opportunity`

#### b) `GetOpportunity` — GET `/api/opportunities/:id`
- Validación: usuario pertenece a la agencia de la oportunidad o es admin
- 404 si no existe; 403 si no tiene permiso

#### c) `CreateOpportunity` — POST `/api/opportunities`
- Body: `OpportunityForm` (Zod schema correspondiente en frontend)
- Auto-completa:
  - `fecha_cargado` = `time.Now()`
  - `usuario_cargador` = `user.id` del token (via `c.Get("user_id")`)
  - `estado` = `"pendiente"` por defecto
- Valida:
  - `destino`, `compania`, `fecha_salida` requeridos
  - `total_lugares >= 0`
  - Usuario pertenece a la agencia o es admin
- Middleware: `RequirePermission("OPPORTUNITIES_CREATE")`

#### d) `UpdateOpportunity` — PUT `/api/opportunities/:id`
- No puede cambiar: `usuario_cargador`, `fecha_cargado`, `agencia`
- Si el usuario **no es admin**, solo puede editar si:
  - Es el `usuario_cargador` de su propia agencia
  - Y el estado actual es `pendiente` (no puede tocar aprobadas/rechazadas)
- Si **es admin**:
  - Puede cambiar cualquier campo excepto `usuario_cargador` y `fecha_cargado`
  - Puede llenar/cambiar `usuario_autorizador` y cambiar `estado`
- Middleware: `RequirePermission("OPPORTUNITIES_UPDATE")`

#### e) `DeleteOpportunity` — DELETE `/api/opportunities/:id`
- Solo si:
  - Usuario es **admin**, O
  - Es el creador (`usuario_cargador`) y está en estado `pendiente`
- Middleware: `RequirePermission("OPPORTUNITIES_DELETE")`

#### f) `ApproveOpportunity` — PUT `/api/opportunities/:id/approve` (opcional)
- Alias conveniente para `UpdateOpportunity` con `estado=aprobada` + `usuario_autorizador`
- Solo admin
- Middleware: `RequirePermission("OPPORTUNITIES_APPROVE")` (o `OPPORTUNITIES_UPDATE`)

### Form/Request Types

```go
// OpportunityForm es el body esperado en POST/PUT
type OpportunityForm struct {
	Agencia           string     `json:"agencia" binding:"required"`
	Temporada         *string    `json:"temporada"`
	Destino           string     `json:"destino" binding:"required"`
	Compania          string     `json:"compania" binding:"required"`
	Validez           *time.Time `json:"validez"`
	FechaSalida       time.Time  `json:"fecha_salida" binding:"required"`
	FechaLlegada      *time.Time `json:"fecha_llegada"`
	TotalLugares      int        `json:"total_lugares" binding:"required,min=0"`
	TotalLiberados    int        `json:"total_liberados" binding:"required,min=0"`
	Neto1             *float64   `json:"neto_1"`
	Neto2             *float64   `json:"neto_2"`
	EstadoInterno     *string    `json:"estado_interno"`
	// En PUT solo admin puede setear:
	Estado             *string    `json:"estado"` // admin only
	UsuarioAutorizador *uuid.UUID `json:"usuario_autorizador"` // admin only
}
```

---

## 4. Rutas: Backend Entrypoints

### `backend-go/cmd/api/main.go` — Local

Agregar a la función de setup de rutas (ej. `setupRoutes(r *gin.Engine)`):

```go
// Opportunities (admin)
opportunities := r.Group("/api/opportunities")
opportunities.Use(middleware.AuthMiddleware)
{
  opportunities.GET("", middleware.RequirePermission("OPPORTUNITIES_VIEW"), handler.GetOpportunities)
  opportunities.GET("/:id", middleware.RequirePermission("OPPORTUNITIES_VIEW"), handler.GetOpportunity)
  opportunities.POST("", middleware.RequirePermission("OPPORTUNITIES_CREATE"), handler.CreateOpportunity)
  opportunities.PUT("/:id", middleware.RequirePermission("OPPORTUNITIES_UPDATE"), handler.UpdateOpportunity)
  opportunities.DELETE("/:id", middleware.RequirePermission("OPPORTUNITIES_DELETE"), handler.DeleteOpportunity)
  opportunities.PUT("/:id/approve", middleware.RequirePermission("OPPORTUNITIES_UPDATE"), handler.ApproveOpportunity)
}
```

### `backend-go/api/index.go` — Vercel Serverless

**IDÉNTICAS** rutas que en `main.go`, registradas en el handler de serverless (es crítico: [Regla 1 de Gotchas](app-cupos/006%20-%20Operación%20y%20Mantenimiento/Gotchas%20y%20Reglas%20de%20Oro.md)).

---

## 5. Migraciones SQL

**Archivo**: `backend-go/migrations/002_create_opportunities.sql` (nuevo)

Contenido:

```sql
-- CreateTable opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia VARCHAR(255) NOT NULL,
  temporada VARCHAR(100),
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  destino VARCHAR(255) NOT NULL,
  compania VARCHAR(255) NOT NULL,
  validez DATE,
  fecha_salida DATE NOT NULL,
  fecha_llegada DATE,
  total_lugares INT NOT NULL DEFAULT 0,
  total_liberados INT NOT NULL DEFAULT 0,
  neto_1 NUMERIC(12,2),
  neto_2 NUMERIC(12,2),
  estado_interno VARCHAR(255),
  fecha_cargado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_cargador UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  usuario_autorizador UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_opportunities_agencia ON opportunities(agencia);
CREATE INDEX IF NOT EXISTS idx_opportunities_estado ON opportunities(estado);
CREATE INDEX IF NOT EXISTS idx_opportunities_destino ON opportunities(destino);
CREATE INDEX IF NOT EXISTS idx_opportunities_temporada ON opportunities(temporada);
CREATE INDEX IF NOT EXISTS idx_opportunities_usuario_cargador ON opportunities(usuario_cargador);
```

**Agregar a `backend-go/pkg/database/db.go`** en `runSQLMigrations()`:

```go
// El archivo anterior ya debe contener la migración
// pero se ejecuta el SQL adicional si hace falta
func runSQLMigrations(db *gorm.DB) error {
  // ... migraciones previas ...
  
  // Oportunidades
  if err := db.Exec(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agencia VARCHAR(255) NOT NULL,
      temporada VARCHAR(100),
      estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
      destino VARCHAR(255) NOT NULL,
      compania VARCHAR(255) NOT NULL,
      validez DATE,
      fecha_salida DATE NOT NULL,
      fecha_llegada DATE,
      total_lugares INT NOT NULL DEFAULT 0,
      total_liberados INT NOT NULL DEFAULT 0,
      neto_1 NUMERIC(12,2),
      neto_2 NUMERIC(12,2),
      estado_interno VARCHAR(255),
      fecha_cargado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      usuario_cargador UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
      usuario_autorizador UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_opportunities_agencia ON opportunities(agencia);
    CREATE INDEX IF NOT EXISTS idx_opportunities_estado ON opportunities(estado);
    CREATE INDEX IF NOT EXISTS idx_opportunities_destino ON opportunities(destino);
    CREATE INDEX IF NOT EXISTS idx_opportunities_temporada ON opportunities(temporada);
    CREATE INDEX IF NOT EXISTS idx_opportunities_usuario_cargador ON opportunities(usuario_cargador);
  `).Error; err != nil {
    return fmt.Errorf("failed to migrate opportunities table: %w", err)
  }
  
  // ... más migraciones ...
}
```

---

## 6. RBAC: Permisos

**Agregar a `backend-go/pkg/database/db.go`** en `seedRBAC()`:

```go
func seedRBAC(db *gorm.DB) error {
  // ... permisos existentes ...
  
  // Nuevos permisos para Oportunidades
  opportunitiesPermissions := []string{
    "OPPORTUNITIES_VIEW",
    "OPPORTUNITIES_CREATE",
    "OPPORTUNITIES_UPDATE",
    "OPPORTUNITIES_DELETE",
    "OPPORTUNITIES_APPROVE", // Optional: para aprobar
  }
  
  for _, code := range opportunitiesPermissions {
    var exists bool
    if err := db.Model(&Permission{}).
      Where("code = ?", code).
      Select("1").
      Row().
      Scan(&exists); err == sql.ErrNoRows || !exists {
      if err := db.Create(&Permission{
        Code:   code,
        Action: strings.ToLower(strings.Split(code, "_")[1]), // view, create, etc.
      }).Error; err != nil {
        return err
      }
    }
  }
  
  // Asignar al rol AGENCY_ADMIN
  agencyAdminRole := &Role{}
  if err := db.Where("code = ?", "AGENCY_ADMIN").First(agencyAdminRole).Error; err == nil {
    for _, code := range opportunitiesPermissions {
      perm := &Permission{}
      if err := db.Where("code = ?", code).First(perm).Error; err == nil {
        db.FirstOrCreate(&RolePermission{}, RolePermission{
          RoleID:       agencyAdminRole.ID,
          PermissionID: perm.ID,
        })
      }
    }
  }
  
  // Asignar al rol SUPER_ADMIN (si existe)
  superAdminRole := &Role{}
  if err := db.Where("code = ?", "SUPER_ADMIN").First(superAdminRole).Error; err == nil {
    for _, code := range opportunitiesPermissions {
      perm := &Permission{}
      if err := db.Where("code = ?", code).First(perm).Error; err == nil {
        db.FirstOrCreate(&RolePermission{}, RolePermission{
          RoleID:       superAdminRole.ID,
          PermissionID: perm.ID,
        })
      }
    }
  }
  
  return nil
}
```

**Agregar a `frontend/src/lib/permissionModules.js`** (nuevo o actualizar):

```javascript
const permissionModules = {
  // ... módulos existentes ...
  
  OPPORTUNITIES: {
    module: 'OPPORTUNITIES',
    actions: {
      VIEW: 'OPPORTUNITIES_VIEW',
      CREATE: 'OPPORTUNITIES_CREATE',
      UPDATE: 'OPPORTUNITIES_UPDATE',
      DELETE: 'OPPORTUNITIES_DELETE',
      APPROVE: 'OPPORTUNITIES_APPROVE',
    },
    label: 'Oportunidades',
  },
};

export default permissionModules;
```

---

## 7. Frontend: Página y Componentes

### a) `frontend/src/pages/GestionOportunidades.jsx` (nuevo)

Estructura similar a `GestionProductos.jsx`:

```jsx
import { useState, useMemo } from 'react';
import { useOpportunities, useCreateOpportunity, useUpdateOpportunity, useDeleteOpportunity, useApproveOpportunity } from '../hooks/useOpportunities';
import { useAuth } from '../contexts/AuthContext';
import { useAgencies } from '../hooks/useAgencies';
import { useToast } from '../hooks/use-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/Modal';
import TableComponent from '../components/ui/Table';
import OportunityForm from '../components/OportunityForm';
import { Search, Plus, Edit, Trash2, CheckCircle2, Lock, X } from 'lucide-react';

const GestionOportunidades = () => {
  // Estado local
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ estado: '', temporada: '', destino: '', compania: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  
  // Contextos y hooks
  const { user, can } = useAuth();
  const { data: opportunities = [], isLoading } = useOpportunities({ search: searchTerm, ...filters });
  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity();
  const deleteMutation = useDeleteOpportunity();
  const approveMutation = useApproveOpportunity();
  const { toast } = useToast();
  const { data: agencies = [] } = useAgencies();
  
  // Validación de permiso
  if (!can('OPPORTUNITIES_VIEW')) {
    return <div className="...">Acceso restringido</div>;
  }
  
  // Funciones CRUD
  const handleCreate = (formData) => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast({ description: 'Oportunidad creada', variant: 'success' });
        setIsModalOpen(false);
      },
    });
  };
  
  const handleUpdate = (formData) => {
    updateMutation.mutate({ id: editingOpp.id, ...formData }, {
      onSuccess: () => {
        toast({ description: 'Oportunidad actualizada', variant: 'success' });
        setIsModalOpen(false);
        setEditingOpp(null);
      },
    });
  };
  
  const handleDelete = (id) => {
    // Confirm dialog
    if (confirm('¿Eliminar esta oportunidad?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast({ description: 'Oportunidad eliminada', variant: 'success' });
        },
      });
    }
  };
  
  const handleApprove = (opp) => {
    if (confirm(`¿Aprobar oportunidad para ${opp.destino}?`)) {
      approveMutation.mutate({ id: opp.id, estado: 'aprobada' }, {
        onSuccess: () => {
          toast({ description: 'Oportunidad aprobada', variant: 'success' });
        },
      });
    }
  };
  
  // Render tabla
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Oportunidades</h1>
      
      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="Buscar por destino o compañía..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
          Crear
        </Button>
      </div>
      
      {/* Tabla */}
      <TableComponent
        columns={[
          { key: 'acciones', label: 'Acciones' },
          { key: 'estado', label: 'Estado' },
          { key: 'destino', label: 'Destino' },
          { key: 'compania', label: 'Compañía' },
          { key: 'temporada', label: 'Temporada' },
          { key: 'fecha_salida', label: 'Salida' },
          { key: 'total_lugares', label: 'Lugares' },
          { key: 'neto_1', label: 'Neto 1' },
          { key: 'usuario_cargador', label: 'Cargador' },
        ]}
        data={opportunities}
        isLoading={isLoading}
        renderRow={(opp) => (
          <tr key={opp.id}>
            <td>
              <div className="flex gap-2">
                {can('OPPORTUNITIES_UPDATE') && (
                  <Button size="sm" onClick={() => { setEditingOpp(opp); setIsModalOpen(true); }} icon={Edit} />
                )}
                {can('OPPORTUNITIES_DELETE') && (
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(opp.id)} icon={Trash2} />
                )}
                {can('OPPORTUNITIES_APPROVE') && user?.role === 'admin' && opp.estado === 'pendiente' && (
                  <Button size="sm" variant="success" onClick={() => handleApprove(opp)} icon={CheckCircle2} />
                )}
              </div>
            </td>
            <td><Badge variant={opp.estado === 'aprobada' ? 'success' : opp.estado === 'rechazada' ? 'destructive' : 'default'}>{opp.estado}</Badge></td>
            <td>{opp.destino}</td>
            <td>{opp.compania}</td>
            <td>{opp.temporada}</td>
            <td>{new Date(opp.fecha_salida).toLocaleDateString()}</td>
            <td>{opp.total_lugares}</td>
            <td>{opp.neto_1?.toFixed(2) || '—'}</td>
            <td>{opp.usuario_cargador_nombre || '—'}</td>
          </tr>
        )}
      />
      
      {/* Modal de creación/edición */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingOpp(null); }}>
        <OportunityForm
          opportunity={editingOpp}
          onSubmit={editingOpp ? handleUpdate : handleCreate}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default GestionOportunidades;
```

### b) `frontend/src/components/OportunityForm.jsx` (nuevo)

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';

const opportunitySchema = z.object({
  agencia: z.string().min(1, 'Agencia requerida'),
  destino: z.string().min(1, 'Destino requerido'),
  compania: z.string().min(1, 'Compañía requerida'),
  temporada: z.string().optional(),
  validez: z.string().optional(),
  fecha_salida: z.string().min(1, 'Fecha de salida requerida'),
  fecha_llegada: z.string().optional(),
  total_lugares: z.number().int().min(0, 'Lugares >= 0'),
  total_liberados: z.number().int().min(0, 'Liberados >= 0'),
  neto_1: z.number().optional(),
  neto_2: z.number().optional(),
  estado_interno: z.string().optional(),
  estado: z.enum(['pendiente', 'aprobada', 'rechazada']).optional(),
  usuario_autorizador: z.string().optional(),
});

type OpportunityFormProps = {
  opportunity?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
};

export default function OportunityForm({ opportunity, onSubmit, isLoading }: OpportunityFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: opportunity || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-semibold">
        {opportunity ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
      </h2>

      <Input
        label="Destino"
        {...register('destino')}
        error={errors.destino?.message}
        required
      />

      <Input
        label="Compañía"
        {...register('compania')}
        error={errors.compania?.message}
        required
      />

      <Input
        label="Temporada"
        {...register('temporada')}
      />

      <Input
        label="Validez (cotización)"
        type="date"
        {...register('validez')}
      />

      <Input
        label="Fecha de salida"
        type="date"
        {...register('fecha_salida')}
        error={errors.fecha_salida?.message}
        required
      />

      <Input
        label="Fecha de llegada"
        type="date"
        {...register('fecha_llegada')}
      />

      <Input
        label="Total de lugares"
        type="number"
        {...register('total_lugares', { valueAsNumber: true })}
        error={errors.total_lugares?.message}
      />

      <Input
        label="Total liberados"
        type="number"
        {...register('total_liberados', { valueAsNumber: true })}
        error={errors.total_liberados?.message}
      />

      <Input
        label="Neto 1"
        type="number"
        step="0.01"
        {...register('neto_1', { valueAsNumber: true })}
      />

      <Input
        label="Neto 2"
        type="number"
        step="0.01"
        {...register('neto_2', { valueAsNumber: true })}
      />

      <Textarea
        label="Estado Interno (notas)"
        {...register('estado_interno')}
        rows={3}
      />

      <div className="flex gap-2 justify-end">
        <Button type="submit" isLoading={isLoading}>
          {opportunity ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
```

### c) `frontend/src/hooks/useOpportunities.ts` (nuevo)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

const QUERY_KEY = 'opportunities';

export const useOpportunities = (params = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await apiClient.get('/opportunities', { params });
      return data;
    },
  });
};

export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/opportunities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useUpdateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/opportunities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/opportunities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useApproveOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }) => apiClient.put(`/opportunities/${id}/approve`, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
```

---

## 8. Sidebar: Agregar Entrada

**Archivo**: `frontend/src/components/ui/Sidebar.jsx`

Actualizar el array `adminNavItems`:

```javascript
const adminNavItems = [
  // ... items existentes ...
  { label: 'Oportunidades', path: '/oportunidades', icon: Zap, permission: 'OPPORTUNITIES_VIEW' }, // Agregar antes de Nóminas
  // ... resto ...
];
```

---

## 9. Router: Agregar Ruta

**Archivo**: `frontend/src/App.jsx`

Agregar en el árbol de rutas (dentro de la sección admin-protected):

```jsx
{
  path: '/oportunidades',
  element: <GestionOportunidades />,
},
```

---

## 10. Servicios HTTP (Backend)

**Archivo**: `backend-go/pkg/services/opportunity_service.go` (nuevo - opcional)

Si es necesario lógica reutilizable (ej. validaciones, cálculos), crear un service layer. De lo contrario, toda la lógica puede vivir en `opportunities_handler.go`.

---

## 11. Notificaciones (Opcional)

Si se requiere avisar a admins cuando se crea/aprueba una oportunidad:

**En `opportunities_handler.go`**, tras crear/aprobar:

```go
// Notificar a admins
notification.NotifyAdminByCode(db, "new_opportunity", map[string]interface{}{
  "destino": opp.Destino,
  "compania": opp.Compania,
})

// O por agencia:
notification.NotifyAgencyByCode(db, opp.Agencia, "new_opportunity", map[string]interface{}{
  "destino": opp.Destino,
})
```

Crear templates de email correspondientes en `seedEmailTemplates()` si se desea notificación email.

---

## 12. Checklist de Implementación

### Backend
- [ ] Crear tabla SQL `opportunities` en migraciones
- [ ] Agregar `AutoMigrate(Opportunity{})` en `seedDatabase()`
- [ ] Crear `models.go`: struct `Opportunity`
- [ ] Crear `opportunities_handler.go` con 6 handlers (GET/POST/PUT/DELETE + APPROVE)
- [ ] Registrar rutas en `main.go` (local)
- [ ] Registrar rutas en `api/index.go` (Vercel)
- [ ] Crear permisos en `seedRBAC()` (OPPORTUNITIES_*)
- [ ] Asignar permisos a `AGENCY_ADMIN` y `SUPER_ADMIN`
- [ ] Verificar validaciones de formulario y scoping de agencia

### Frontend
- [ ] Crear `pages/GestionOportunidades.jsx`
- [ ] Crear `components/OportunityForm.jsx`
- [ ] Crear `hooks/useOpportunities.ts`
- [ ] Crear `schemas/opportunitySchema.ts` (Zod)
- [ ] Agregar entrada a `Sidebar.jsx` en `adminNavItems`
- [ ] Agregar ruta en `App.jsx`
- [ ] Agregar permisos en `lib/permissionModules.js`
- [ ] Probar navegación, CRUD, filtros, permisos
- [ ] Verificar guards de página (`can()` después de todos los hooks)

### Testing
- [ ] Crear oportunidad como AGENCY_ADMIN
- [ ] Intentar crear como SALES_AGENT (debe fallar con 403)
- [ ] Editar oportunidad propia (antes de aprobación)
- [ ] Intentar editar opp de otra agencia (debe fallar)
- [ ] Admin aprueba/rechaza oportunidad
- [ ] Filtros y búsqueda funcionan
- [ ] Export a Excel (si aplica)
- [ ] Verificar que las rutas existan en local Y producción

### Vault de Obsidian (Actualizar)
- [ ] Agregar `Opportunity` a `Modelo de Datos.md` (sección 8 o nueva)
- [ ] Documentar el flujo de oportunidades en `Flujos de Funcionalidades.md` (nueva sección 19)
- [ ] Anotar en `Gotchas y Reglas de Oro.md` si hay patrones nuevos descubiertos
- [ ] Actualizar `log.md` con entrada de alta de Oportunidades

---

## 13. Notas y Consideraciones

### Relación con "Gestión de Productos"
Oportunidades es un **paso previo** a productos:
1. Carga de oportunidad (análisis de pedido potencial)
2. Aprobación por admin/autorizador
3. Una vez aprobada → **convertir a Producto** (posible workflow futuro: botón "Crear Producto desde Oportunidad")

### Permisos y Visibilidad
- `AGENCY_ADMIN` de agencia X solo ve sus propias oportunidades
- `ADMIN` ve todas (con filtro opcional)
- Cada usuario ve solo el responsable de su agencia (via `usuario_cargador`)

### Campos Calculados
- `fecha_cargado`: siempre `now()` en creación, no editable
- `usuario_cargador`: viene del JWT, no editable
- `usuario_autorizador`: solo admin puede setear/cambiar

### Estados
Máquina simple:
- `pendiente` → (aprueba admin) → `aprobada`
- `pendiente` → (rechaza admin) → `rechazada`

Nota: Los estados no son reversibles (un aprobado no vuelve a pendiente), aplica si es necesario.

### Validaciones
- Fechas: `fecha_salida` siempre requerida; `fecha_llegada >= fecha_salida` si ambas present
- Números: `total_lugares`, `total_liberados >= 0`
- Destino/Compañía: match contra catálogo de IATA/ICAR (opcional, validar contra enum si existe)

---

## 14. Posibles Extensiones (Out of Scope)

- **Conversión a Producto**: botón "Crear Producto" que pre-rellena campos desde la oportunidad aprobada
- **Auditoría detallada**: logging de cambios de estado (quién aprobó, cuándo)
- **Workflows automáticos**: aprobar todas las oportunidades de una compañía/destino simultáneamente
- **Integración con Atlas**: si Atlas tiene un catálogo de pedidos disponibles, validar oportunidades contra ese
- **Reportes**: dashboard de oportunidades (aprobadas vs rechazadas, tasa de conversión a producto)
- **Notificaciones**: email a operadores cuando hay oportunidades pendientes de aprobación

---

## 15. Referencias Internas

- [Modelo de Datos](app-cupos/005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md)
- [Gotchas y Reglas de Oro](app-cupos/006%20-%20Operación%20y%20Mantenimiento/Gotchas%20y%20Reglas%20de%20Oro.md)
- [Flujos de Funcionalidades](app-cupos/003%20-%20Funcionalidades/Flujos%20de%20Funcionalidades.md)
- [Frontend](app-cupos/004%20-%20Frontend/Frontend.md)
- [RBAC/Usuarios/Roles/Permisos](app-cupos/003%20-%20Funcionalidades/Flujos%20de%20Funcionalidades.md#9-rbac-usuarios-roles-y-permisos)

---

**Fin del Plan**

Versión 1.0 — Listo para implementación.
