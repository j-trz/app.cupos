# Plan de Implementación: Dashboard Profesional de Reportes

## 📋 Resumen Ejecutivo

Transformar la página de reportes actual (`Reportes.jsx`) en un **dashboard ejecutivo profesional** que muestre múltiples métricas, gráficos y KPIs en una sola vista sin scroll infinito, siguiendo las especificaciones del `REPORT_MODULE.md`.

---

## 🎯 Objetivos

1. **Densidad de información máxima**: Mostrar 8-10 visualizaciones en una sola pantalla
2. **Sin scroll infinito**: Layout compacto tipo "cockpit" o "command center"
3. **Gráficos variados**: Líneas, barras, pie, áreas, heatmaps
4. **Filtros globales**: Rango de fechas, agencia, destino, temporada
5. **Exportación**: CSV/Excel de todos los datos
6. **Responsive**: Adaptado a pantallas de 1920x1080 (estándar ejecutivo)

---

## 📐 Diseño del Layout (Grid 12 columnas)

### Estructura Visual (Wireframe ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Título + Filtros Globales + Exportar              [100%]   │
├─────────────────────────────────────────────────────────────────────┤
│  KPIs ROW (4 cards)                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Ventas   │ │Rentabilid│ │  Riesgo  │ │Ocupación │              │
│  │ $45.2K   │ │  $12.8K  │ │  $8.5K   │ │   78%    │              │
│  │ +12% ▲   │ │  +8% ▲   │ │  -5% ▼   │ │  +3% ▲   │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│  ROW 2: Gráficos Principales (2 columnas)                          │
│  ┌─────────────────────────┐ ┌─────────────────────────┐          │
│  │ EVOLUCIÓN VENTAS        │ │ SHARE POR AGENCIA       │          │
│  │ (Line Chart + Área)     │ │ (Pie/Donut Chart)       │          │
│  │ 6 meses tendencia       │ │ Jetmar vs Tienda        │          │
│  │                         │ │                         │          │
│  └─────────────────────────┘ └─────────────────────────┘          │
├─────────────────────────────────────────────────────────────────────┤
│  ROW 3: Análisis Detallado (3 columnas)                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐             │
│  │TOP DESTINOS│ │OCUPACIÓN   │ │ ALERTAS DE RIESGO  │             │
│  │(Bar Horiz) │ │(Heatmap)   │ │ (Tabla con badges) │             │
│  │Top 5       │ │Por mes     │ │ >$10K riesgo       │             │
│  └────────────┘ └────────────┘ └────────────────────┘             │
├─────────────────────────────────────────────────────────────────────┤
│  ROW 4: Tabla Detallada (opcional, colapsable)                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ DETALLE POR DESTINO Y TEMPORADA (Tabla expandible)          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Especificaciones de Grid

- **Header**: 100% ancho, altura fija 80px
- **KPIs Row**: 4 cards en grid 4-columnas (25% cada una)
- **Row 2**: 2 columnas (50% cada una)
- **Row 3**: 3 columnas (33% cada una)
- **Row 4**: 100% ancho, colapsable (opcional)
- **Altura total objetivo**: ~900px (pantalla estándar sin scroll)
- **Padding**: 16px entre secciones, 8px interno de cards
- **Tipografía**: Compacta (text-sm para labels, text-lg para valores)

---

## 🔌 Backend: Nuevos Endpoints

### 1. `GET /api/reports/evolution-revenue`

**Descripción**: Evolución mensual de ventas, rentabilidad y riesgo (últimos 6-12 meses)

**Query Params**:
- `from`: Fecha inicio (YYYY-MM-DD)
- `to`: Fecha fin (YYYY-MM-DD)
- `destino`: Filtro de destino (opcional)
- `temporada`: Filtro de temporada (opcional)

**Response**:
```json
[
  {
    "period": "2025-01",
    "ventas": 45200.50,
    "rentabilidad": 12800.30,
    "riesgo": 8500.00,
    "ocupacion": 78.5
  }
]
```

**Implementación** (`backend-go/pkg/handlers/report_handler.go`):
```go
func GetEvolutionRevenue(c *gin.Context) {
    type Result struct {
        Period       string  `json:"period"`
        Ventas       float64 `json:"ventas"`
        Rentabilidad float64 `json:"rentabilidad"`
        Riesgo       float64 `json:"riesgo"`
        Ocupacion    float64 `json:"ocupacion"`
    }
    
    // Query: Agrupar por mes, calcular SUMA de KPIs financieros
    database.DB.Table("products").
        Select(`to_char(salida, 'YYYY-MM') as period,
                sum(vendidos * precio) as ventas,
                sum(vendidos * op) as rentabilidad,
                sum(disponibilidad * neto_1) as riesgo,
                (sum(vendidos)::float / nullif(sum(cupo), 0)) * 100 as ocupacion`).
        Group("period").
        Order("period asc").
        Scan(&results)
}
```

### 2. `GET /api/reports/occupancy`

**Descripción**: Ocupación por destino/temporada (para heatmap)

**Query Params**:
- `destino`: Filtro (opcional)

**Response**:
```json
[
  {
    "destino": "Cancún",
    "temporada": "Semana Santa 2025",
    "ocupacion": 85.5,
    "cupos": 120,
    "vendidos": 102
  }
]
```

### 3. `GET /api/reports/top-products`

**Descripción**: Top 5 productos por rentabilidad o riesgo

**Query Params**:
- `metric`: "rentabilidad" | "riesgo" (default: "rentabilidad")
- `limit`: Cantidad (default: 5)

**Response**:
```json
[
  {
    "codigo_cupo": "CUN_CH-2025-01",
    "destino": "Cancún",
    "temporada": "Semana Santa 2025",
    "rentabilidad": 5200.00,
    "riesgo": 1200.00,
    "ocupacion": 92
  }
]
```

### 4. `GET /api/reports/risk-alerts`

**Descripción**: Productos con riesgo alto (disponibilidad > $10K o ocupación < 50%)

**Response**:
```json
[
  {
    "codigo_cupo": "MIA_DEST_ARG-2025",
    "destino": "Miami",
    "dias_salida": 15,
    "ocupacion": 45,
    "riesgo": 18500.00,
    "nivel": "alto"
  }
]
```

### 5. `GET /api/reports/cancellations`

**Descripción**: Tasa de cancelación por período

**Response**:
```json
[
  {
    "period": "2025-01",
    "canceladas": 12,
    "total": 150,
    "tasa": 8.0
  }
]
```

---

## 🎨 Frontend: Componentes

### Archivos a Crear/Modificar

1. **`frontend/src/pages/Reportes.jsx`** - Refactor completo
2. **`frontend/src/components/reports/`** - Nueva carpeta
   - `KPIsRow.jsx` - 4 cards de KPIs
   - `EvolutionChart.jsx` - Gráfico de líneas/área
   - `AgencyShareChart.jsx` - Pie/Donut chart
   - `TopDestinationsChart.jsx` - Barras horizontales
   - `OccupancyHeatmap.jsx` - Heatmap de ocupación
   - `RiskAlertsTable.jsx` - Tabla de alertas
   - `ReportFilters.jsx` - Filtros globales
   - `DestinationDetailTable.jsx` - Tabla detallada (opcional)

### 1. `ReportFilters.jsx`

```jsx
import { Calendar, Filter, Download } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { ShadcnButton as Button } from '../ui/shadcn-button';

export default function ReportFilters({ filters, onFiltersChange, onExport }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
      {/* Rango de fechas */}
      <Select value={filters.dateRange} onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v })}>
        <SelectTrigger className="w-[160px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Rango" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3m">Últimos 3 meses</SelectItem>
          <SelectItem value="6m">Últimos 6 meses</SelectItem>
          <SelectItem value="12m">Último año</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro de destino */}
      <Select value={filters.destino} onValueChange={(v) => onFiltersChange({ ...filters, destino: v })}>
        <SelectTrigger className="w-[160px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Destino" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los destinos</SelectItem>
          <SelectItem value="Cancún">Cancún</SelectItem>
          <SelectItem value="Miami">Miami</SelectItem>
          <SelectItem value="Punta Cana">Punta Cana</SelectItem>
        </SelectContent>
      </Select>

      {/* Botón de exportar */}
      <Button variant="outline" className="ml-auto gap-2" onClick={onExport}>
        <Download className="h-4 w-4" /> Exportar
      </Button>
    </div>
  );
}
```

### 2. `KPIsRow.jsx`

```jsx
import { Card, CardContent } from '../ui/Card';
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle } from 'lucide-react';

const KPICard = ({ title, value, change, icon: Icon, color }) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">{title}</span>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(change)}% vs mes anterior</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function KPIsRow({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICard 
        title="Ventas Totales" 
        value={`$${(stats.ventas / 1000).toFixed(1)}K`}
        change={stats.ventasChange}
        icon={DollarSign}
        color="text-blue-600"
      />
      <KPICard 
        title="Rentabilidad" 
        value={`$${(stats.rentabilidad / 1000).toFixed(1)}K`}
        change={stats.rentabilidadChange}
        icon={TrendingUp}
        color="text-green-600"
      />
      <KPICard 
        title="Riesgo (Disp.)" 
        value={`$${(stats.riesgo / 1000).toFixed(1)}K`}
        change={stats.riesgoChange}
        icon={AlertTriangle}
        color="text-red-600"
      />
      <KPICard 
        title="Ocupación" 
        value={`${stats.ocupacion.toFixed(0)}%`}
        change={stats.ocupacionChange}
        icon={Percent}
        color="text-purple-600"
      />
    </div>
  );
}
```

### 3. `EvolutionChart.jsx`

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export default function EvolutionChart({ data, loading }) {
  if (loading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Evolución de Ventas y Rentabilidad</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorRentabilidad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" fontSize={11} tickLine={false} />
            <YAxis fontSize={11} tickLine={false} tickFormatter={(v) => `$${v/1000}K`} />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="ventas" stroke="#3b82f6" fill="url(#colorVentas)" name="Ventas" />
            <Area type="monotone" dataKey="rentabilidad" stroke="#10b981" fill="url(#colorRentabilidad)" name="Rentabilidad" />
            <Line type="monotone" dataKey="ocupacion" stroke="#8b5cf6" strokeWidth={2} name="Ocupación %" yAxisId="right" />
            <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 4. `AgencyShareChart.jsx`

```jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AgencyShareChart({ data, loading }) {
  if (loading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Share por Agencia</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="venta"
              nameKey="agencia"
              label={({ agencia, percent }) => `${agencia} ${(percent * 100).toFixed(0)}%`}
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 5. `TopDestinationsChart.jsx`

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function TopDestinationsChart({ data, loading }) {
  if (loading) return <Skeleton className="h-[250px] w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top 5 Destinos por Rentabilidad</CardTitle>
      </CardHeader>
      <CardContent className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" fontSize={10} tickFormatter={(v) => `$${v/1000}K`} />
            <YAxis dataKey="destino" type="category" width={100} fontSize={11} />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Bar dataKey="rentabilidad" name="Rentabilidad" radius={[0, 4, 4, 0]}>
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 6. `OccupancyHeatmap.jsx`

```jsx
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';

const getColor = (ocupacion) => {
  if (ocupacion >= 80) return 'bg-green-100 text-green-800 border-green-300';
  if (ocupacion >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (ocupacion >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

export default function OccupancyHeatmap({ data, loading }) {
  if (loading) return <Skeleton className="h-[250px] w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ocupación por Destino/Temporada</CardTitle>
      </CardHeader>
      <CardContent className="h-[230px] overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {data?.slice(0, 9).map((item, i) => (
            <div key={i} className={`p-3 rounded-lg border ${getColor(item.ocupacion)}`}>
              <p className="text-xs font-medium truncate">{item.destino}</p>
              <p className="text-[10px] text-slate-600 truncate">{item.temporada}</p>
              <p className="text-lg font-bold mt-1">{item.ocupacion.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7. `RiskAlertsTable.jsx`

```jsx
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle } from 'lucide-react';

export default function RiskAlertsTable({ data, loading }) {
  if (loading) return <Skeleton className="h-[250px] w-full" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Alertas de Riesgo
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[230px] overflow-y-auto">
        <div className="space-y-2">
          {data?.slice(0, 5).map((alert, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
              <div>
                <p className="text-xs font-semibold text-red-900">{alert.codigo_cupo}</p>
                <p className="text-[10px] text-red-700">{alert.destino} • {alert.dias_salida} días</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-red-900">${(alert.riesgo/1000).toFixed(1)}K</p>
                <Badge variant="destructive" className="text-[9px]">{alert.ocupacion}%</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 8. Refactor `Reportes.jsx`

```jsx
import { useState } from 'react';
import { useEvolutionRevenue, useSalesByAgency, useDestinationsDetail, useTopProducts, useRiskAlerts } from '../hooks/useReports';
import PageHeader from '../components/ui/PageHeader';
import ReportFilters from '../components/reports/ReportFilters';
import KPIsRow from '../components/reports/KPIsRow';
import EvolutionChart from '../components/reports/EvolutionChart';
import AgencyShareChart from '../components/reports/AgencyShareChart';
import TopDestinationsChart from '../components/reports/TopDestinationsChart';
import OccupancyHeatmap from '../components/reports/OccupancyHeatmap';
import RiskAlertsTable from '../components/reports/RiskAlertsTable';
import DestinationDetailTable from '../components/reports/DestinationDetailTable';

export default function Reportes() {
  const [filters, setFilters] = useState({ dateRange: '6m', destino: 'all' });
  
  const { data: evolution, isLoading: loadingEvol } = useEvolutionRevenue(filters);
  const { data: agencyShare, isLoading: loadingShare } = useSalesByAgency(filters);
  const { data: destinations, isLoading: loadingDest } = useDestinationsDetail(filters);
  const { data: topProducts, isLoading: loadingTop } = useTopProducts({ metric: 'rentabilidad', limit: 5 });
  const { data: riskAlerts, isLoading: loadingRisk } = useRiskAlerts();

  // Calcular KPIs del último período
  const latestStats = evolution?.[evolution.length - 1] || {};
  const prevStats = evolution?.[evolution.length - 2] || {};
  const stats = {
    ventas: latestStats.ventas || 0,
    rentabilidad: latestStats.rentabilidad || 0,
    riesgo: latestStats.riesgo || 0,
    ocupacion: latestStats.ocupacion || 0,
    ventasChange: prevStats.ventas ? ((latestStats.ventas - prevStats.ventas) / prevStats.ventas * 100) : 0,
    rentabilidadChange: prevStats.rentabilidad ? ((latestStats.rentabilidad - prevStats.rentabilidad) / prevStats.rentabilidad * 100) : 0,
    riesgoChange: prevStats.riesgo ? ((latestStats.riesgo - prevStats.riesgo) / prevStats.riesgo * 100) : 0,
    ocupacionChange: prevStats.ocupacion ? (latestStats.ocupacion - prevStats.ocupacion) : 0,
  };

  return (
    <div className="container mx-auto py-4 space-y-4">
      <PageHeader 
        title="Dashboard de Reportes" 
        description="Análisis ejecutivo de ventas, rentabilidad y riesgo"
      />

      <ReportFilters filters={filters} onFiltersChange={setFilters} onExport={() => console.log('Export')} />

      {/* KPIs Row */}
      <KPIsRow stats={stats} />

      {/* Row 2: Gráficos principales */}
      <div className="grid grid-cols-2 gap-4">
        <EvolutionChart data={evolution} loading={loadingEvol} />
        <AgencyShareChart data={agencyShare} loading={loadingShare} />
      </div>

      {/* Row 3: Análisis detallado */}
      <div className="grid grid-cols-3 gap-4">
        <TopDestinationsChart data={topProducts} loading={loadingTop} />
        <OccupancyHeatmap data={destinations} loading={loadingDest} />
        <RiskAlertsTable data={riskAlerts} loading={loadingRisk} />
      </div>

      {/* Row 4: Tabla detallada (opcional) */}
      <DestinationDetailTable data={destinations} loading={loadingDest} />
    </div>
  );
}
```

---

## 🔗 Hooks de React Query

Agregar a `frontend/src/hooks/useReports.js`:

```jsx
export const useEvolutionRevenue = (filters = {}) => {
  return useQuery({
    queryKey: ['evolution-revenue', filters],
    queryFn: () => ReportService.getEvolutionRevenue(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopProducts = (filters = {}) => {
  return useQuery({
    queryKey: ['top-products', filters],
    queryFn: () => ReportService.getTopProducts(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRiskAlerts = () => {
  return useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => ReportService.getRiskAlerts(),
    staleTime: 5 * 60 * 1000,
  });
};
```

---

## 🌐 Service Layer

Agregar a `frontend/src/services/reportService.js`:

```jsx
static async getEvolutionRevenue(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.append(key, value);
    }
  });
  const queryString = params.toString();
  const endpoint = queryString ? `/reports/evolution-revenue?${queryString}` : '/reports/evolution-revenue';
  return await ApiClient.get(endpoint);
}

static async getTopProducts(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  const queryString = params.toString();
  const endpoint = queryString ? `/reports/top-products?${queryString}` : '/reports/top-products';
  return await ApiClient.get(endpoint);
}

static async getRiskAlerts() {
  return await ApiClient.get('/reports/risk-alerts');
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Backend (Día 1-2)
- [ ] Crear `GetEvolutionRevenue` en `report_handler.go`
- [ ] Crear `GetOccupancy` en `report_handler.go`
- [ ] Crear `GetTopProducts` en `report_handler.go`
- [ ] Crear `GetRiskAlerts` en `report_handler.go`
- [ ] Registrar rutas en `api/index.go`
- [ ] Testear endpoints con Postman

### Fase 2: Frontend Components (Día 3-4)
- [ ] Crear carpeta `frontend/src/components/reports/`
- [ ] Implementar `ReportFilters.jsx`
- [ ] Implementar `KPIsRow.jsx`
- [ ] Implementar `EvolutionChart.jsx`
- [ ] Implementar `AgencyShareChart.jsx`
- [ ] Implementar `TopDestinationsChart.jsx`
- [ ] Implementar `OccupancyHeatmap.jsx`
- [ ] Implementar `RiskAlertsTable.jsx`
- [ ] Implementar `DestinationDetailTable.jsx`

### Fase 3: Integración (Día 5)
- [ ] Agregar hooks en `useReports.js`
- [ ] Agregar métodos en `reportService.js`
- [ ] Refactorizar `Reportes.jsx`
- [ ] Probar en localhost
- [ ] Ajustar espaciados y tipografía

### Fase 4: Testing y Deploy (Día 6)
- [ ] Testing en diferentes resoluciones (1920x1080, 1440x900)
- [ ] Validar performance (carga < 3s)
- [ ] Export CSV funcional
- [ ] Deploy a staging
- [ ] Revisión final

---

## 🎨 Diseño Visual (Especificaciones)

### Paleta de Colores
- **Primario**: `#3b82f6` (Azul)
- **Éxito**: `#10b981` (Verde)
- **Advertencia**: `#f59e0b` (Naranja)
- **Error/Riesgo**: `#ef4444` (Rojo)
- **Acento**: `#8b5cf6` (Púrpura)
- **Fondo**: `#f8fafc` (Gris claro)

### Tipografía
- **Títulos de sección**: `text-sm font-semibold`
- **KPIs valores**: `text-2xl font-bold`
- **Labels**: `text-xs text-slate-500`
- **Tabla headers**: `text-xs uppercase font-semibold`

### Espaciado
- **Padding container**: `py-4` (16px)
- **Gap entre secciones**: `space-y-4` (16px)
- **Gap entre cards**: `gap-4` (16px)
- **Padding interno cards**: `p-4` (16px)

### Responsive
- **Desktop (1920x1080)**: Layout completo sin scroll
- **Laptop (1440x900)**: Scroll mínimo
- **Tablet**: Colapsar a 2 columnas
- **Mobile**: Stack vertical

---

## 🚀 Optimizaciones de Performance

1. **React Query**: Cache de 5 minutos para reportes
2. **Skeleton loaders**: Feedback visual durante carga
3. **Lazy loading**: Cargar componentes solo cuando sean visibles
4. **Debounce filtros**: Esperar 300ms antes de hacer fetch
5. **Paginación**: Tabla detallada con paginación de 20 rows

---

## 📝 Notas Adicionales

- **Fallback data**: Si no hay datos, mostrar "Sin datos disponibles" en cada card
- **Loading states**: Skeleton loaders en cada sección
- **Error handling**: Toast notifications si falla un endpoint
- **Export**: Implementar exportación CSV de todas las tablas
- **Drill-down**: Click en KPIs para ver detalle (opcional futuro)

---

## 🔧 Dependencias

Ya instaladas:
- `recharts` (gráficos)
- `lucide-react` (iconos)
- `@tanstack/react-query` (data fetching)

No se requieren dependencias adicionales.

---

**Última actualización**: 2025-01-08  
**Autor**: Sistema de Planificación  
**Estado**: Listo para implementación
