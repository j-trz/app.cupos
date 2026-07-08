import { useState, useEffect, useMemo } from 'react';
import { Users, Package, ClipboardList, CheckCircle2, Download, RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import ApiClient from '../services/apiClient';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { useAgencies } from '../hooks/useAgencies';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Combina los campos compartidos del pedido (Reservation) con los propios de
// cada pasajero (Passenger) — cada pasajero es su propio ticket individual:
// estado, doc contable, precio de venta, neto 1 y número de ticket son datos
// DE ESE pasajero, no del pedido. Si el pasajero no trae un valor propio
// (reservas históricas creadas antes de este cambio), cae al valor del pedido
// como fallback.
const buildPassengerRows = (r) => {
  const base = {
    reservaId: r.id,
    pedidoId: r.pedido_id || r.id || '—',
    contactoNombre: r.contacto_nombre || '—',
    contactoEmail: r.contacto_email || '—',
    contactoTelefono: r.contacto_telefono || '—',
    fichaVenta: r.ficha_venta || '—',
    vendedorEmail: r.vendedor_email || '—',
    agencia: r.agencia || '',
    // Si el pedido se armó con un cupo cedido por otra agencia, acá queda de
    // qué agencia vino — para que en la nómina se note que ese pasajero no es
    // "propio" del catálogo, sino de un cupo cedido.
    originalAgency: r.original_agency || null,
  };

  if (Array.isArray(r.passengers) && r.passengers.length > 0) {
    return r.passengers.map((p, idx) => ({
      ...base,
      key: `${r.id}-${p.id ?? idx}`,
      nombre: p.nombre || '—',
      apellido: p.apellido || '—',
      documento: p.documento || '—',
      nacimiento: p.nacimiento,
      nacionalidad: p.nacionalidad || '—',
      tipoPasajero: p.tipo_pasajero || '—',
      esVentaPrincipal: p.nro === 1,
      estado: p.estado || r.estado || '',
      docContable: p.doc_contable || r.doc_contable || '—',
      numeroTicket: p.numero_ticket || '—',
      precioVenta: p.precio_venta || r.precio_venta,
      neto1: p.neto_1 || r.neto_1,
    }));
  }

  return [{
    ...base,
    key: `${r.id}-principal`,
    nombre: r.nombre_pasajero || '—',
    apellido: r.apellido_pasajero || '—',
    documento: r.documento_pasajero || '—',
    nacimiento: r.nacimiento_pasajero,
    nacionalidad: r.nacionalidad_pasajero || '—',
    tipoPasajero: r.tipo_pasajero || '—',
    esVentaPrincipal: null,
    estado: r.estado || '',
    docContable: r.doc_contable || '—',
    numeroTicket: '—',
    precioVenta: r.precio_venta,
    neto1: r.neto_1,
  }];
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
// Una fila por pasajero (no por reserva), con absolutamente todos los datos.

const buildRow = (r, products) => {
  const product = products.find((p) => String(p.id) === String(r.product_id));
  return buildPassengerRows(r).map((row) => ({
    'Pedido ID': row.pedidoId,
    'Agencia': r.agencia || '',
    'Cupo cedido por': row.originalAgency || '',
    'Destino': r.vuelo_destino || product?.destino || '',
    'Nombre': row.nombre,
    'Apellido': row.apellido,
    'Documento': row.documento,
    'Fecha Nacimiento': formatDate(row.nacimiento),
    'Nacionalidad': row.nacionalidad,
    'Tipo Pasajero': row.tipoPasajero,
    'Estado': getEstadoLabel(row.estado),
    'Contacto': row.contactoNombre,
    'Email Contacto': row.contactoEmail,
    'Teléfono Contacto': row.contactoTelefono,
    'Doc Contable': row.docContable,
    'Ticket': row.numeroTicket,
    'Ficha': row.fichaVenta,
    'Vendedor': row.vendedorEmail,
    'Precio Venta': row.precioVenta ?? '',
    'Neto 1': row.neto1 ?? '',
    'OP': product?.op ?? '',
    'Salida': formatDate(r.vuelo_salida || product?.fecha_salida || product?.salida),
  }));
};

const exportToExcel = (reservations, products) => {
  const wb = XLSX.utils.book_new();

  const allRows = reservations.flatMap((r) => buildRow(r, products));
  const ws1 = XLSX.utils.json_to_sheet(allRows.length ? allRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Reservas');

  const confirmedRows = reservations
    .filter((r) => r.estado === 'confirmada' || r.estado === 'confirmado')
    .flatMap((r) => buildRow(r, products));
  const ws2 = XLSX.utils.json_to_sheet(confirmedRows.length ? confirmedRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Confirmadas');

  const solicitudRows = reservations
    .filter((r) => r.estado === 'bloqueo_temporal' || r.estado === 'solicitud_cancelacion')
    .flatMap((r) => buildRow(r, products));
  const ws3 = XLSX.utils.json_to_sheet(solicitudRows.length ? solicitudRows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Solicitudes');

  XLSX.writeFile(wb, `nominas-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── Product section (collapsible) ───────────────────────────────────────────

function ProductSection({ product, reservations, agencyName }) {
  const [expanded, setExpanded] = useState(false);

  const estado = (r) => r.estado || '';

  const passengerRows = useMemo(
    () => reservations.flatMap((r) => buildPassengerRows(r)),
    [reservations]
  );

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
              {product?.tipo_producto && ` · ${product.tipo_producto}`}
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
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{passengerRows.length}</p>
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

      {/* Expandable table — una fila por pasajero, con todos los datos */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Nacimiento</TableHead>
                <TableHead>Nacionalidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email Contacto</TableHead>
                <TableHead>Tel. Contacto</TableHead>
                <TableHead>Doc. Contable</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Ficha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Neto 1</TableHead>
                <TableHead>OP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengerRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {row.pedidoId}
                  </TableCell>
                  <TableCell className="text-zinc-900 dark:text-zinc-100 font-medium">
                    {row.nombre}
                    {row.esVentaPrincipal === false && (
                      <Badge variant="secondary" className="ml-2 text-xs">Acompañante</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.apellido}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.documento}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{formatDate(row.nacimiento)}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.nacionalidad}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.tipoPasajero}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(row.estado)}>
                      {getEstadoLabel(row.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">
                    {row.originalAgency ? (
                      <div className="flex flex-col gap-1">
                        <span>{agencyName(row.agencia)}</span>
                        <Badge variant="outline" className="w-fit text-[10px]">
                          Cupo de {agencyName(row.originalAgency)}
                        </Badge>
                      </div>
                    ) : (
                      agencyName(row.agencia)
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.contactoNombre}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.contactoEmail}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.contactoTelefono}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.docContable}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">{row.numeroTicket}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.fichaVenta}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{row.vendedorEmail}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{formatMoney(row.precioVenta)}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{formatMoney(row.neto1)}</TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">{product?.op ?? '—'}</TableCell>
                </TableRow>
              ))}
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

  const { data: agencies = [] } = useAgencies();
  const agencyName = (code) => agencies.find((a) => a.code === code)?.name || code || '—';

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

      // "cedido" es una línea de auditoría de la agencia cedente (stock que
      // salió de su pool), no un pasajero real — no corresponde en la nómina.
      setReservations(orders.filter((r) => r.estado !== 'cedido'));
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
    const e = r.estado || '';
    return e === 'confirmada' || e === 'confirmado';
  }).length;
  const totalPassengers = useMemo(
    () => reservations.reduce((sum, r) => sum + buildPassengerRows(r).length, 0),
    [reservations]
  );

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
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-4">
        <StatCard
          label="Productos con reservas"
          value={loading ? '—' : totalProducts}
          icon={Package}
          description="Productos que tienen al menos una reserva."
        />
        <StatCard
          label="Total reservas"
          value={loading ? '—' : totalReservations}
          icon={ClipboardList}
          description="Cantidad total de reservas registradas."
        />
        <StatCard
          label="Pasajeros"
          value={loading ? '—' : totalPassengers}
          icon={Users}
          description="Pasajeros desglosados (incluye acompañantes)."
        />
        <StatCard
          label="Confirmadas"
          value={loading ? '—' : totalConfirmed}
          icon={CheckCircle2}
          description="Reservas en estado confirmado."
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
                agencyName={agencyName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
