import { useState, useEffect, useMemo } from 'react';
import { Users, Package, ClipboardList, CheckCircle2, Download, RefreshCw, ChevronDown, ChevronRight, Search, Pencil, Trash2, Copy, Plus, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import ApiClient from '../services/apiClient';
import ReservationService from '../services/reservationService';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import ActionIconButton from '../components/ui/ActionIconButton.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import Modal from '../components/Modal.jsx';
import { useAgencies } from '../hooks/useAgencies';
import { formatDateOnly } from '../lib/dateOnly.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = formatDateOnly;

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
      // passengerId real (no el índice) — hace falta para poder editar/
      // eliminar/duplicar este pasajero puntual contra el backend.
      passengerId: p.id ?? null,
      nombre: p.nombre || '—',
      apellido: p.apellido || '—',
      documento: p.documento || '—',
      pasaporte: p.pasaporte || '—',
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
    // Reservas viejas sin desglose de pasajeros: no hay un Passenger real
    // contra el cual editar/eliminar/duplicar, así que se deja sin id.
    passengerId: null,
    nombre: r.nombre_pasajero || '—',
    apellido: r.apellido_pasajero || '—',
    documento: r.documento_pasajero || '—',
    pasaporte: '—',
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

// Comparación de códigos de agencia case/espacio-insensible — igual que el
// backend (strings.EqualFold) en product_handler.go. Sin esto, una diferencia
// de mayúsculas entre Product.Agencia y Reservation.Agencia (mismo código,
// distinta forma guardada históricamente) hacía ver "Compartido — otra
// agencia" en reservas que en realidad son 100% propias de esa agencia.
const sameAgency = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Adulto/Menor/Infante -> ADT/CHD/INF, la nomenclatura estándar de la industria.
const TIPO_PASAJERO_CODES = { Adulto: 'ADT', Menor: 'CHD', Infante: 'INF' };

// Cuenta solo pasajeros activos (excluye cancelados) — así el desglose
// ADT/CHD/INF se mueve junto con los badges Confirmadas/Pendientes vecinos
// en vez de ser un total histórico ciego al estado. 'expirada'/'cedido' ya
// se filtran antes, al armar `reservations` (ver el filter de setReservations).
const countPassengerTypes = (passengerRows) => {
  const counts = { ADT: 0, CHD: 0, INF: 0 };
  passengerRows.forEach((row) => {
    if (row.estado === 'cancelada' || row.estado === 'cancelado') return;
    const code = TIPO_PASAJERO_CODES[row.tipoPasajero];
    if (code) counts[code]++;
  });
  return counts;
};

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
    'Pasaporte': row.pasaporte === '—' ? '' : row.pasaporte,
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
    'OP': product?.[`op_${passengerPriceSuffix(row.tipoPasajero)}`] ?? product?.op ?? '',
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

// ─── Excel export para Backoffice (BO) ──────────────────────────────────────
// Formato fijo pedido para importar a Netviax Atlas: una fila por pasajero,
// con las columnas exactas (incluye varias en blanco a propósito — "K1" a
// "P1", "W1", "AA1" a "AD1" — que el template de BO espera aunque este
// sistema no tenga ese dato).

// Adulto/Menor(Niño)/Infante -> el sufijo de campo de Producto correspondiente
// (tarifa_adt/impuestos_adt, etc). Acepta "Niño" además de "Menor" porque
// conviven los dos valores en el sistema (ver GestionReservas.jsx vs.
// Availability.jsx) — cualquiera de los dos cuenta como CHD acá.
const passengerPriceSuffix = (tipoPasajero) => {
  const t = (tipoPasajero || '').toLowerCase();
  if (t === 'infante') return 'inf';
  if (t === 'menor' || t === 'niño' || t === 'nino') return 'chd';
  return 'adt';
};

const buildBORow = (r, products, agencies) => {
  const product = products.find((p) => String(p.id) === String(r.product_id));
  const agencyDisplayName = agencies.find((a) => a.code === r.agencia)?.name || r.agencia || '';

  return buildPassengerRows(r).map((row) => {
    const suffix = passengerPriceSuffix(row.tipoPasajero);
    const tarifa = Number(product?.[`tarifa_${suffix}`]) || 0;
    const impuestos = Number(product?.[`impuestos_${suffix}`]) || 0;
    const neto1 = tarifa + impuestos;
    // OP según el tipo real de ESTE pasajero — antes era un solo valor
    // (product.op) aplicado a todos los tipos por igual.
    const op = Number(product?.[`op_${suffix}`] ?? product?.op) || 0;
    const netoVendedor = neto1 + op;

    return {
      'NRO': row.esVentaPrincipal === null ? '' : (row.esVentaPrincipal ? 1 : 0),
      'Cupo': product?.codigo_cupo || r.vuelo_codigo || '',
      'Pasajero': `${row.apellido === '—' ? '' : row.apellido.toUpperCase()}/${row.nombre === '—' ? '' : row.nombre.toUpperCase()}`,
      'Ficha': row.fichaVenta === '—' ? '' : row.fichaVenta,
      'CI': row.documento === '—' ? '' : row.documento,
      'Pasaporte': row.pasaporte === '—' ? '' : row.pasaporte,
      'Fecha Nac': formatDate(row.nacimiento) || '',
      'Celular': r.contacto_telefono || '',
      'Vendedor': row.vendedorEmail === '—' ? '' : row.vendedorEmail,
      'Agencia': agencyDisplayName,
      'K1': '', 'L1': '', 'M1': '', 'N1': '', 'O1': '', 'P1': '',
      'Creado': r.created_at ? new Date(r.created_at).toLocaleString('es-AR') : '',
      'TARIFA': tarifa,
      'TASAS': impuestos,
      'NETO 1': neto1,
      'OP': op,
      'Neto Vendedor': netoVendedor,
      'W1': '',
      'Regreso': formatDate(product?.fecha_regreso) || '',
      'Fecha emisión de grupo': r.emitido_at ? formatDate(r.emitido_at) : '',
      'Código de Reserva': product?.pnr || '',
      'AA1': '', 'AB1': '', 'AC1': '', 'AD1': '',
      'Status BACK': r.status_back || '',
    };
  });
};

const exportToExcelBO = (reservations, products, agencies) => {
  const rows = reservations.flatMap((r) => buildBORow(r, products, agencies));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws, 'BO');
  XLSX.writeFile(wb, `nominas-bo-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── Excel export "Nómina" (por producto) ───────────────────────────────────
// Reporte reducido para operativa/embarque — solo las columnas que se usan en
// el papel, no todos los datos administrativos (a diferencia de Exportar
// Excel/BO, que son "todo el dato"). Numeración corrida por asiento; el
// infante no ocupa lugar así que no lleva número, va marcado "INF" (mismo
// criterio que el resto de la app — ver countPassengerTypes/Disponibilidad).
const exportFichaOperativa = (product, passengerRows) => {
  const header = ['N°', 'CUPO', 'APELLIDO/NOMBRE', 'FICHA', 'CI', 'PP', 'F NACIM', 'VEND'];
  let seatNumber = 0;
  const dataRows = passengerRows
    .filter((row) => row.estado !== 'cancelada' && row.estado !== 'cancelado')
    .map((row) => {
      const esInfante = row.tipoPasajero === 'Infante';
      if (!esInfante) seatNumber++;
      const apellido = row.apellido === '—' ? '' : row.apellido.toUpperCase();
      const nombre = row.nombre === '—' ? '' : row.nombre.toUpperCase();
      return [
        esInfante ? 'INF' : seatNumber,
        product?.codigo_cupo || '',
        `${apellido}/${nombre}`,
        row.fichaVenta === '—' ? '' : row.fichaVenta,
        row.documento === '—' ? '' : row.documento,
        row.pasaporte === '—' ? '' : row.pasaporte,
        formatDate(row.nacimiento) || '',
        row.vendedorEmail === '—' ? '' : row.vendedorEmail,
      ];
    });

  const aoa = [[`F OPERATIVA ${product?.ficha || '—'}`], [], header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nomina');
  const fileTag = product?.codigo_cupo || product?.ficha || 'ficha';
  XLSX.writeFile(wb, `nomina-${fileTag}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── Formulario compartido de datos de pasajero (editar / agregar) ──────────

const passengerInputCls = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200';

function PassengerFieldsForm({ values, onChange, showTicket }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Nombre</label>
          <input type="text" value={values.nombre} onChange={set('nombre')} className={passengerInputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Apellido</label>
          <input type="text" value={values.apellido} onChange={set('apellido')} className={passengerInputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">CI</label>
          <input type="text" value={values.documento} onChange={set('documento')} className={passengerInputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Pasaporte</label>
          <input type="text" value={values.pasaporte} onChange={set('pasaporte')} className={passengerInputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Nacimiento</label>
          <input type="date" value={values.nacimiento} onChange={set('nacimiento')} className={passengerInputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Nacionalidad</label>
          <input type="text" value={values.nacionalidad} onChange={set('nacionalidad')} className={passengerInputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <select value={values.tipo_pasajero} onChange={set('tipo_pasajero')} className={`${passengerInputCls} bg-white`}>
            <option value="Adulto">Adulto</option>
            <option value="Menor">Menor</option>
            <option value="Infante">Infante</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Precio Venta</label>
          <input type="number" step="0.01" value={values.precio_venta} onChange={set('precio_venta')} className={passengerInputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Neto 1</label>
          <input type="number" step="0.01" value={values.neto_1} onChange={set('neto_1')} className={passengerInputCls} />
        </div>
      </div>
      {showTicket && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Ticket</label>
          <input type="text" value={values.numero_ticket} onChange={set('numero_ticket')} placeholder="Ej: 075-1234567890" className={`${passengerInputCls} font-mono`} />
        </div>
      )}
    </div>
  );
}

// ─── Product section (collapsible) ───────────────────────────────────────────

function ProductSection({ product, reservations, agencyName, onEdit, onDelete, onDuplicate, onAdd }) {
  const { user } = useAuth();
  const myAgencia = user?.agencia;
  const [expanded, setExpanded] = useState(false);

  const estado = (r) => r.estado || '';

  const passengerRows = useMemo(
    () => reservations.flatMap((r) => buildPassengerRows(r)),
    [reservations]
  );

  // Colores por familia/ficha: un tono distinto por grupo de pedidoId
  // consecutivo, para distinguir visualmente dónde termina una ficha y
  // empieza la siguiente (los pasajeros de un mismo pedido ya vienen
  // contiguos en passengerRows).
  const PEDIDO_ROW_TINTS = [
    'bg-white',
    'bg-sky-50/60',
  ];
  const rowTintByKey = useMemo(() => {
    const map = {};
    let groupIndex = -1;
    let lastPedidoId = null;
    passengerRows.forEach((row) => {
      if (row.pedidoId !== lastPedidoId) {
        groupIndex++;
        lastPedidoId = row.pedidoId;
      }
      map[row.key] = PEDIDO_ROW_TINTS[groupIndex % PEDIDO_ROW_TINTS.length];
    });
    return map;
  }, [passengerRows]);

  const tipoCounts = useMemo(() => countPassengerTypes(passengerRows), [passengerRows]);

  return (
    <Card className="overflow-hidden">
      {/* Header row — always visible. El botón de export va afuera del botón de
          expandir/colapsar (no puede ir anidado dentro de otro <button>). */}
      <div className="flex items-center">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex-1 min-w-0 flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className="text-zinc-500 shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-1 sm:gap-4 items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">
              {product?.destino || 'Destino desconocido'}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {product?.codigo_cupo || '—'}
              {product?.tipo_producto && ` · ${product.tipo_producto}`}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-zinc-500">Salida</p>
            <p className="text-sm text-zinc-700">
              {formatDate(product?.fecha_salida || product?.salida) || '—'}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-zinc-500">Temporada</p>
            <p className="text-sm text-zinc-700">
              {product?.temporada || '—'}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-zinc-500">ADT · CHD · INF</p>
            <p className="text-sm font-medium text-zinc-700">
              {tipoCounts.ADT} · {tipoCounts.CHD} · {tipoCounts.INF}
            </p>
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
      <ActionIconButton
        icon={Download}
        onClick={() => exportFichaOperativa(product, passengerRows)}
        title="Exportar Nómina (reporte reducido para operativa/embarque)"
        className="mr-3 shrink-0"
      />
      </div>

      {/* Expandable table — una fila por pasajero, con todos los datos */}
      {expanded && (
        <div className="border-t border-zinc-100 overflow-x-auto">
          <TableComponent>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Acciones</TableHead>
                <TableHead>Ficha</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Pedido ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Nacimiento</TableHead>
                <TableHead>Nacionalidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Temporada</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email Contacto</TableHead>
                <TableHead>Tel. Contacto</TableHead>
                <TableHead>Doc. Contable</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Neto 1</TableHead>
                <TableHead>OP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengerRows.map((row) => (
                <TableRow key={row.key} className={rowTintByKey[row.key]}>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {row.passengerId && (
                        <>
                          <ActionIconButton icon={Pencil} onClick={() => onEdit(row)} title="Editar pasajero" />
                          <ActionIconButton icon={Copy} onClick={() => onDuplicate(row)} title="Duplicar pasajero" />
                          <ActionIconButton icon={Trash2} variant="danger" onClick={() => onDelete(row)} title="Eliminar pasajero" />
                        </>
                      )}
                      <ActionIconButton icon={Plus} onClick={() => onAdd(row)} title="Agregar pasajero a este pedido" />
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-700">{row.fichaVenta}</TableCell>
                  <TableCell className="text-zinc-700">{row.vendedorEmail}</TableCell>
                  <TableCell className="font-mono text-xs text-zinc-600">
                    {row.pedidoId}
                  </TableCell>
                  <TableCell className="text-zinc-900 font-medium">
                    {row.nombre}
                    {row.esVentaPrincipal === false && (
                      <Badge variant="secondary" className="ml-2 text-xs">Acompañante</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-700">{row.apellido}</TableCell>
                  <TableCell className="text-zinc-700">{row.documento}</TableCell>
                  <TableCell className="text-zinc-700">{formatDate(row.nacimiento)}</TableCell>
                  <TableCell className="text-zinc-700">{row.nacionalidad}</TableCell>
                  <TableCell className="text-zinc-700">{row.tipoPasajero}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(row.estado)}>
                      {getEstadoLabel(row.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-700">
                    {formatDate(product?.fecha_salida || product?.salida) || '—'}
                  </TableCell>
                  <TableCell className="text-zinc-700">
                    {product?.temporada || '—'}
                  </TableCell>
                  <TableCell className="text-zinc-700">
                    {agencyName(row.agencia)}
                  </TableCell>
                  <TableCell>
                    {row.originalAgency && !sameAgency(row.originalAgency, myAgencia) ? (
                      <Badge variant="outline" className="w-fit text-[10px] whitespace-nowrap">
                        Cupo de {agencyName(row.originalAgency)}
                      </Badge>
                    ) : row.originalAgency ? (
                      // Soy la agencia cedente: esta venta la hizo la agencia
                      // receptora sobre un cupo que yo cedí — no "cupo de mí
                      // mismo", sino cesión saliente ya vendida por otro.
                      <Badge variant="outline" className="w-fit text-[10px] whitespace-nowrap">
                        Cedido a {agencyName(row.agencia)}
                      </Badge>
                    ) : product?.agencia && row.agencia && !sameAgency(row.agencia, product.agencia) ? (
                      // Producto compartido (visibilidad multi-agencia, mismo
                      // stock): esta reserva la tomó otra agencia, no la dueña.
                      <Badge variant="outline" className="w-fit text-[10px] whitespace-nowrap">
                        Compartido — otra agencia
                      </Badge>
                    ) : (
                      <span className="text-zinc-300" title="Producto propio">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-700">{row.contactoNombre}</TableCell>
                  <TableCell className="text-zinc-700">{row.contactoEmail}</TableCell>
                  <TableCell className="text-zinc-700">{row.contactoTelefono}</TableCell>
                  <TableCell className="text-zinc-700">{row.docContable}</TableCell>
                  <TableCell className="text-zinc-700 font-mono text-xs">{row.numeroTicket}</TableCell>
                  <TableCell className="text-zinc-700">{formatMoney(row.precioVenta)}</TableCell>
                  <TableCell className="text-zinc-700">{formatMoney(row.neto1)}</TableCell>
                  <TableCell className="text-zinc-700">
                    {product?.[`op_${passengerPriceSuffix(row.tipoPasajero)}`] ?? product?.op ?? '—'}
                  </TableCell>
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

const EMPTY_PASSENGER_FORM = {
  nombre: '', apellido: '', documento: '', pasaporte: '', nacimiento: '', nacionalidad: '',
  tipo_pasajero: 'Adulto', precio_venta: '', neto_1: '', numero_ticket: '',
};

export default function GestionNominas() {
  const { can } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ temporada: '', destino: '', desde: '', hasta: '' });
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_PASSENGER_FORM);
  const [savingPassenger, setSavingPassenger] = useState(false);
  const [addingRow, setAddingRow] = useState(null);
  const [addForm, setAddForm] = useState(EMPTY_PASSENGER_FORM);
  const [savingAddPassenger, setSavingAddPassenger] = useState(false);

  const { data: agencies = [] } = useAgencies();
  const agencyName = (code) => agencies.find((a) => a.code === code)?.name || code || '—';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersResult, productsResult] = await Promise.all([
        ApiClient.get('/orders'),
        // scope=management: sin esto, un producto ya agotado (disponibilidad
        // 0, ej. porque se cedió todo) queda afuera del listado y la nómina
        // muestra "Destino desconocido" para pasajeros que sí existen.
        ApiClient.get('/products?scope=management'),
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

      // Excluimos de la nómina:
      // - "cedido": línea de auditoría de cesión saliente, no es un pasajero real.
      // - "expirada": el bloqueo temporal venció, el stock ya fue devuelto al
      //   producto por el cron. No pertenece a la nómina operativa.
      setReservations(orders.filter((r) => r.estado !== 'cedido' && r.estado !== 'expirada'));
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

  const openEditPassenger = (row) => {
    setEditingRow(row);
    setEditForm({
      nombre: row.nombre === '—' ? '' : row.nombre,
      apellido: row.apellido === '—' ? '' : row.apellido,
      documento: row.documento === '—' ? '' : row.documento,
      pasaporte: row.pasaporte === '—' ? '' : row.pasaporte,
      nacimiento: row.nacimiento ? String(row.nacimiento).slice(0, 10) : '',
      nacionalidad: row.nacionalidad === '—' ? '' : row.nacionalidad,
      tipo_pasajero: row.tipoPasajero === '—' ? 'Adulto' : row.tipoPasajero,
      precio_venta: row.precioVenta ?? '',
      neto_1: row.neto1 ?? '',
      numero_ticket: row.numeroTicket === '—' ? '' : row.numeroTicket,
    });
  };

  const closeEditPassenger = () => {
    setEditingRow(null);
    setEditForm(EMPTY_PASSENGER_FORM);
  };

  const handleSavePassenger = async () => {
    if (!editingRow) return;
    setSavingPassenger(true);
    try {
      const calls = [
        ReservationService.updatePassenger(editingRow.reservaId, editingRow.passengerId, {
          nombre: editForm.nombre,
          apellido: editForm.apellido,
          documento: editForm.documento,
          pasaporte: editForm.pasaporte,
          nacimiento: editForm.nacimiento || null,
          nacionalidad: editForm.nacionalidad,
          tipo_pasajero: editForm.tipo_pasajero,
          precio_venta: editForm.precio_venta === '' ? null : Number(editForm.precio_venta),
          neto_1: editForm.neto_1 === '' ? null : Number(editForm.neto_1),
        }),
      ];
      // El backend rechaza el update de ticket si no hay ningún campo con
      // valor (numero_ticket vacío = nada que guardar).
      if (editForm.numero_ticket && editForm.numero_ticket.trim()) {
        calls.push(ReservationService.updatePassengerTicket(editingRow.reservaId, editingRow.passengerId, {
          numero_ticket: editForm.numero_ticket,
        }));
      }
      await Promise.all(calls);
      Swal.fire({ icon: 'success', title: 'Pasajero actualizado', timer: 1500, showConfirmButton: false });
      closeEditPassenger();
      await fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo actualizar el pasajero.' });
    } finally {
      setSavingPassenger(false);
    }
  };

  const openAddPassenger = (row) => {
    setAddingRow(row);
    setAddForm(EMPTY_PASSENGER_FORM);
  };

  const closeAddPassenger = () => {
    setAddingRow(null);
    setAddForm(EMPTY_PASSENGER_FORM);
  };

  const handleSaveAddPassenger = async () => {
    if (!addingRow) return;
    setSavingAddPassenger(true);
    try {
      await ReservationService.addPassenger(addingRow.reservaId, {
        nombre: addForm.nombre,
        apellido: addForm.apellido,
        documento: addForm.documento,
        pasaporte: addForm.pasaporte,
        nacimiento: addForm.nacimiento || null,
        nacionalidad: addForm.nacionalidad,
        tipo_pasajero: addForm.tipo_pasajero,
        precio_venta: addForm.precio_venta === '' ? null : Number(addForm.precio_venta),
        neto_1: addForm.neto_1 === '' ? null : Number(addForm.neto_1),
      });
      Swal.fire({ icon: 'success', title: 'Pasajero agregado', timer: 1500, showConfirmButton: false });
      closeAddPassenger();
      await fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo agregar el pasajero (revisá la disponibilidad del producto).' });
    } finally {
      setSavingAddPassenger(false);
    }
  };

  const handleDeletePassenger = async (row) => {
    const result = await Swal.fire({
      title: '¿Eliminar pasajero?',
      html: `Se eliminará a <b>${row.nombre} ${row.apellido}</b> del pedido <b>${row.pedidoId}</b> y se liberará su lugar.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    try {
      await ReservationService.deletePassenger(row.reservaId, row.passengerId);
      Swal.fire({ icon: 'success', title: 'Pasajero eliminado', timer: 1500, showConfirmButton: false });
      await fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo eliminar el pasajero.' });
    }
  };

  const handleDuplicatePassenger = async (row) => {
    const result = await Swal.fire({
      title: '¿Duplicar pasajero?',
      html: `Se creará un nuevo pasajero en el pedido <b>${row.pedidoId}</b> con los mismos datos de <b>${row.nombre} ${row.apellido}</b>, ocupando 1 lugar más.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, duplicar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await ReservationService.duplicatePassenger(row.reservaId, row.passengerId);
      Swal.fire({ icon: 'success', title: 'Pasajero duplicado', timer: 1500, showConfirmButton: false });
      await fetchData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo duplicar el pasajero (revisá la disponibilidad del producto).' });
    }
  };

  // Group reservations by product_id
  const grouped = useMemo(() => {
    const map = {};
    reservations.forEach((r) => {
      // roster_product_id agrupa por el producto DUEÑO real: si esta venta se
      // hizo sobre un cupo cedido, cae junto con el resto de los pasajeros de
      // la agencia que originalmente tiene el vuelo, no en un grupo aparte
      // por cada cesión.
      const pid = String(r.roster_product_id || r.product_id || 'sin_producto');
      if (!map[pid]) map[pid] = [];
      map[pid].push(r);
    });
    return map;
  }, [reservations]);

  // Productos con al menos una reserva — insumo para las opciones de los
  // filtros de Temporada/Destino (no cambian según lo que ya esté filtrado).
  const productsWithReservations = useMemo(
    () => Object.keys(grouped).map((pid) => products.find((p) => String(p.id) === pid)).filter(Boolean),
    [grouped, products]
  );
  const temporadaOptions = useMemo(
    () => Array.from(new Set(productsWithReservations.map((p) => p.temporada).filter(Boolean))).sort(),
    [productsWithReservations]
  );
  const destinoOptions = useMemo(
    () => Array.from(new Set(productsWithReservations.map((p) => p.destino).filter(Boolean))).sort(),
    [productsWithReservations]
  );

  // Products that have at least one reservation, filtered por búsqueda,
  // temporada, destino y rango de fecha de salida. Por defecto sólo se
  // muestran las salidas que todavía no ocurrieron; si el usuario define
  // explícitamente "desde"/"hasta" se levanta esa restricción para permitir
  // traer el histórico (ej. para consultar una salida ya cumplida).
  const filteredProductIds = useMemo(() => {
    const hasExplicitDateFilter = !!(filters.desde || filters.hasta);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const desdeDate = filters.desde ? new Date(`${filters.desde}T00:00:00`) : null;
    const hastaDate = filters.hasta ? new Date(`${filters.hasta}T23:59:59`) : null;

    return Object.keys(grouped).filter((pid) => {
      const product = products.find((p) => String(p.id) === pid);

      if (search.trim()) {
        const destino = (product?.destino || '').toLowerCase();
        const codigo = (product?.codigo_cupo || '').toLowerCase();
        const q = search.toLowerCase();
        if (!destino.includes(q) && !codigo.includes(q)) return false;
      }

      if (filters.temporada && (product?.temporada || '') !== filters.temporada) return false;
      if (filters.destino && (product?.destino || '') !== filters.destino) return false;

      const fechaSalidaRaw = product?.fecha_salida || product?.salida;
      const salidaDate = fechaSalidaRaw ? new Date(fechaSalidaRaw) : null;

      if (hasExplicitDateFilter) {
        if (desdeDate && (!salidaDate || salidaDate < desdeDate)) return false;
        if (hastaDate && (!salidaDate || salidaDate > hastaDate)) return false;
      } else if (salidaDate && salidaDate < today) {
        return false;
      }

      return true;
    });
  }, [grouped, products, search, filters]);

  const hasActiveFilters = !!(filters.temporada || filters.destino || filters.desde || filters.hasta);
  const clearFilters = () => setFilters({ temporada: '', destino: '', desde: '', hasta: '' });

  // Reservas de los productos que quedaron visibles tras aplicar
  // búsqueda/temporada/destino/rango de fechas — para exportar solo lo
  // filtrado, no el crudo completo.
  const visibleReservations = useMemo(
    () => filteredProductIds.flatMap((pid) => grouped[pid] || []),
    [filteredProductIds, grouped]
  );

  // Stats
  const totalProducts = Object.keys(grouped).length;
  const totalReservations = reservations.length;
  const totalPassengers = useMemo(
    () => reservations.reduce((sum, r) => sum + buildPassengerRows(r).length, 0),
    [reservations]
  );
  // Total de PAX confirmados, no de fichas — una ficha con 4 pasajeros
  // confirmados debe contar 4, no 1.
  const totalConfirmed = useMemo(
    () => reservations.reduce((sum, r) => sum + buildPassengerRows(r).filter((row) => {
      const e = row.estado || '';
      return e === 'confirmada' || e === 'confirmado';
    }).length, 0),
    [reservations]
  );

  if (!can('RESERVATIONS_VIEW')) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
        <p className="text-sm text-slate-500 mt-1">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <PageHeader
        title="Gestión de Nóminas"
        icon={Users}
        description="Nómina de pasajeros por producto."
        action={
          <div className="flex items-center gap-2">
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
              onClick={() => exportToExcel(visibleReservations, products)}
              disabled={loading || visibleReservations.length === 0}
              className="flex items-center gap-2"
              title={hasActiveFilters || search.trim() ? 'Exporta solo lo que queda visible con los filtros actuales' : undefined}
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcelBO(visibleReservations, products, agencies)}
              disabled={loading || visibleReservations.length === 0}
              className="flex items-center gap-2"
              title="Excel con el formato para importar a Netviax Atlas (respeta los filtros activos)"
            >
              <Download className="h-4 w-4" />
              Exportar BO
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <StatsHero
        stats={[
          {
            label: 'Productos con reservas',
            value: loading ? '—' : totalProducts,
            icon: Package,
            description: 'Productos que tienen al menos una reserva.',
            color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
          },
          {
            label: 'Pasajeros',
            value: loading ? '—' : totalPassengers,
            icon: Users,
            description: 'Pasajeros desglosados (incluye acompañantes).',
            color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
          },
          {
            label: 'PAX Confirmados',
            value: loading ? '—' : totalConfirmed,
            icon: CheckCircle2,
            description: 'Pasajeros confirmados (no fichas).',
            color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
          },
        ]}
      />

      {/* Search/filter */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar por destino o código de cupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Temporada</label>
            <select
              value={filters.temporada}
              onChange={(e) => setFilters((f) => ({ ...f, temporada: e.target.value }))}
              className="rounded-lg border border-zinc-200 bg-white text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {temporadaOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Destino</label>
            <select
              value={filters.destino}
              onChange={(e) => setFilters((f) => ({ ...f, destino: e.target.value }))}
              className="rounded-lg border border-zinc-200 bg-white text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {destinoOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Salida desde</label>
            <input
              type="date"
              value={filters.desde}
              onChange={(e) => setFilters((f) => ({ ...f, desde: e.target.value }))}
              className="rounded-lg border border-zinc-200 bg-white text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Salida hasta</label>
            <input
              type="date"
              value={filters.hasta}
              onChange={(e) => setFilters((f) => ({ ...f, hasta: e.target.value }))}
              className="rounded-lg border border-zinc-200 bg-white text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        <p className="text-xs text-zinc-400">
          {filters.desde || filters.hasta
            ? 'Mostrando histórico según el rango de fechas seleccionado.'
            : 'Por defecto solo se muestran las salidas que todavía no ocurrieron. Filtrá por fecha para consultar el histórico.'}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <Card className="px-5 py-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
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
          <Users className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">
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
                onEdit={openEditPassenger}
                onDelete={handleDeletePassenger}
                onDuplicate={handleDuplicatePassenger}
                onAdd={openAddPassenger}
              />
            );
          })}
        </div>
      )}

      {/* Modal de edición de pasajero */}
      <Modal
        title="Editar Pasajero"
        open={!!editingRow}
        onClose={closeEditPassenger}
        size="md"
      >
        <div className="space-y-4">
          <PassengerFieldsForm values={editForm} onChange={setEditForm} showTicket />
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={closeEditPassenger} disabled={savingPassenger}>
              Cancelar
            </Button>
            <Button onClick={handleSavePassenger} disabled={savingPassenger}>
              {savingPassenger ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de agregar pasajero nuevo al pedido */}
      <Modal
        title="Agregar Pasajero"
        open={!!addingRow}
        onClose={closeAddPassenger}
        size="md"
      >
        <div className="space-y-4">
          {addingRow && (
            <p className="text-xs text-slate-500">
              Se agregará al pedido <span className="font-mono font-medium">{addingRow.pedidoId}</span>, ocupando 1 lugar más del producto.
            </p>
          )}
          <PassengerFieldsForm values={addForm} onChange={setAddForm} showTicket={false} />
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={closeAddPassenger} disabled={savingAddPassenger}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAddPassenger} disabled={savingAddPassenger}>
              {savingAddPassenger ? 'Guardando...' : 'Agregar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
