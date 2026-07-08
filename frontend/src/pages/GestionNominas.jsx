import { useState, useEffect, useMemo } from 'react';
import { Users, Download, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import ApiClient from '../services/apiClient';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const getBadgeVariant = (estado) => {
  if (estado === 'confirmada' || estado === 'confirmado') return 'success';
  if (estado === 'bloqueo_temporal') return 'warning';
  if (estado === 'cancelada' || estado === 'solicitud_cancelacion') return 'danger';
  return 'default';
};

const getEstadoLabel = (estado) => ({
  bloqueo_temporal: 'Bloqueo Temporal',
  confirmado: 'Confirmado',
  confirmada: 'Confirmada',
  cancelado: 'Cancelado',
  cancelada: 'Cancelada',
  solicitud_cancelacion: 'Sol. Cancelación',
  procesando: 'Procesando',
}[estado] || estado || '—');

// ─── Excel export ────────────────────────────────────────────────────────────

const buildRow = (r, products) => {
  const product = products.find((p) => String(p.id) === String(r.product_id));
  return {
    'Pedido ID': r.Pedido_ID || r.pedido_id || r.id || '',
    'Agencia': r.Agencia || r.agencia || '',
    'Destino': r.Vuelo_Destino || r.vuelo_destino || r.destino || product?.destino || '',
    'Pasajero': r.Nombre_Pasajero || r.nombre_pasajero || '',
    'Apellido': r.Apellido_Pasajero || r.apellido_pasajero || '',
    'Documento': r.documento_pasajero || r.Documento_Pasajero || '',
    'Tipo Pasajero': r.tipo_pasajero || r.Tipo_Pasajero || '',
    'Contacto': r.Contacto_Nombre || r.contacto_nombre || '',
    'Email Contacto': r.Contacto_Email || r.contacto_email || '',
    'Estado': getEstadoLabel(r.Estado || r.estado),
    'Doc Contable': r.Doc_Contable || r.doc_contable || '',
    'Salida': formatDate(r.Vuelo_Salida || r.vuelo_salida || product?.fecha_salida || product?.salida),
    'Precio Venta': r.Vuelo_Precio || r.vuelo_precio || r.precio_venta || '',
  };
};

const exportToExcel = (reservations, products) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — All reservations
  const allRows = reservations.map((r) => buildRow(r, products));
  const ws1 = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Reservas');

  // Sheet 2 — Confirmed only
  const confirmedRows = reservations
    .filter((r) => {
      const e = r.Estado || r.estado || '';
      return e === 'confirmada' || e === 'confirmado';
    })
    .map((r) => buildRow(r, products));
  const ws2 = XLSX.utils.json_to_sheet(confirmedRows.length ? confirmedRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Confirmadas');

  // Sheet 3 — Solicitudes
  const solicitudRows = reservations
    .filter((r) => {
      const e = r.Estado || r.estado || '';
      return e === 'bloqueo_temporal' || e === 'solicitud_cancelacion';
    })
    .map((r) => buildRow(r, products));
  const ws3 = XLSX.utils.json_to_sheet(solicitudRows.length ? solicitudRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Solicitudes');

  // Sheet 4 — Nomina (product-centric)
  const nominaRows = reservations.map((r) => {
    const product = products.find((p) => String(p.id) === String(r.product_id));
    return {
      'Product': r.product_id || '',
      'Destino': r.Vuelo_Destino || r.vuelo_destino || product?.destino || '',
      'Salida': formatDate(r.Vuelo_Salida || r.vuelo_salida || product?.fecha_salida || product?.salida),
      'Código': product?.codigo_cupo || r.Vuelo_Codigo || r.vuelo_codigo || '',
      'Pedido ID': r.Pedido_ID || r.pedido_id || r.id || '',
      'Nombre': r.Nombre_Pasajero || r.nombre_pasajero || '',
      'Apellido': r.Apellido_Pasajero || r.apellido_pasajero || '',
      'Documento': r.documento_pasajero || r.Documento_Pasajero || '',
      'Tipo': r.tipo_pasajero || r.Tipo_Pasajero || '',
      'Estado': getEstadoLabel(r.Estado || r.estado),
    };
  });
  const ws4 = XLSX.utils.json_to_sheet(nominaRows.length ? nominaRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws4, 'Nómina');

  XLSX.writeFile(wb, `nominas-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── Product section (collapsible) ───────────────────────────────────────────

function ProductSection({ product, reservations }) {
  const [expanded, setExpanded] = useState(false);

  const estado = (r) => r.Estado || r.estado || '';

  return (
    <Card className="overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
      >
        <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-4 items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {product?.destino || 'Destino desconocido'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {product?.codigo_cupo || '—'}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Salida</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {formatDate(product?.fecha_salida || product?.salida)}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pasajeros</p>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{reservations.length}</p>
          </div>
          <div className="hidden sm:flex gap-2 flex-wrap">
            <Badge variant="success" className="text-xs">
              {reservations.filter((r) => estado(r) === 'confirmada' || estado(r) === 'confirmado').length} confirmadas
            </Badge>
            <Badge variant="warning" className="text-xs">
              {reservations.filter((r) => estado(r) === 'bloqueo_temporal').length} pendientes
            </Badge>
          </div>
        </div>

        {/* Mobile count badge */}
        <Badge variant="default" className="sm:hidden shrink-0 text-xs">
          {reservations.length}
        </Badge>
      </button>

      {/* Expandable table */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido ID</TableHead>
                <TableHead>Pasajero</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Doc. Contable</TableHead>
                <TableHead>Contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r, idx) => {
                const pedidoId = r.Pedido_ID || r.pedido_id || r.id || '—';
                const nombre = r.Nombre_Pasajero || r.nombre_pasajero || '';
                const apellido = r.Apellido_Pasajero || r.apellido_pasajero || '';
                const documento = r.documento_pasajero || r.Documento_Pasajero || '—';
                const tipo = r.tipo_pasajero || r.Tipo_Pasajero || '—';
                const estadoVal = r.Estado || r.estado || '';
                const docContable = r.Doc_Contable || r.doc_contable || '—';
                const contacto = r.Contacto_Nombre || r.contacto_nombre || '—';

                return (
                  <TableRow key={r.id || idx}>
                    <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {pedidoId}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {nombre} {apellido}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-700 dark:text-zinc-300">{documento}</TableCell>
                    <TableCell className="text-zinc-700 dark:text-zinc-300">{tipo}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(estadoVal)}>
                        {getEstadoLabel(estadoVal)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-700 dark:text-zinc-300">{docContable}</TableCell>
                    <TableCell className="text-zinc-700 dark:text-zinc-300">{contacto}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableComponent>
        </div>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GestionNominas() {
  const [reservations, setReservations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersResult, productsResult] = await Promise.all([
        ApiClient.get('/orders'),
        ApiClient.get('/products'),
      ]);

      const orders = Array.isArray(ordersResult)
        ? ordersResult
        : Array.isArray(ordersResult?.data)
        ? ordersResult.data
        : [];

      const prods = Array.isArray(productsResult)
        ? productsResult
        : Array.isArray(productsResult?.data)
        ? productsResult.data
        : [];

      setReservations(orders);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading nominas data:', err);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group reservations by product_id
  const grouped = useMemo(() => {
    const map = {};
    reservations.forEach((r) => {
      const pid = String(r.product_id || 'sin_producto');
      if (!map[pid]) map[pid] = [];
      map[pid].push(r);
    });
    return map;
  }, [reservations]);

  // Products that have at least one reservation, filtered by search
  const filteredProductIds = useMemo(() => {
    return Object.keys(grouped).filter((pid) => {
      if (!search.trim()) return true;
      const product = products.find((p) => String(p.id) === pid);
      const destino = (product?.destino || '').toLowerCase();
      const codigo = (product?.codigo_cupo || '').toLowerCase();
      const q = search.toLowerCase();
      return destino.includes(q) || codigo.includes(q);
    });
  }, [grouped, products, search]);

  // Stats
  const totalProducts = Object.keys(grouped).length;
  const totalReservations = reservations.length;
  const totalConfirmed = reservations.filter((r) => {
    const e = r.Estado || r.estado || '';
    return e === 'confirmada' || e === 'confirmado';
  }).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Gestión de Nóminas"
          icon={Users}
          description="Nómina de pasajeros por producto."
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => exportToExcel(reservations, products)}
            disabled={loading || reservations.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Productos con reservas"
          value={loading ? '—' : totalProducts}
          icon={Users}
        />
        <StatCard
          title="Total reservas"
          value={loading ? '—' : totalReservations}
          icon={Users}
        />
        <StatCard
          title="Confirmadas"
          value={loading ? '—' : totalConfirmed}
          icon={Users}
        />
      </div>

      {/* Search/filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Filtrar por destino o código de cupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
        />
      </div>

      {/* Error state */}
      {error && (
        <Card className="px-5 py-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
          <span className="ml-2 text-sm text-zinc-500">Cargando nóminas...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredProductIds.length === 0 && (
        <Card className="px-5 py-12 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {search ? 'No se encontraron productos que coincidan con la búsqueda.' : 'No hay reservas registradas.'}
          </p>
        </Card>
      )}

      {/* Product sections */}
      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {filteredProductIds.map((pid) => {
            const product = products.find((p) => String(p.id) === pid);
            return (
              <ProductSection
                key={pid}
                product={product}
                reservations={grouped[pid]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
