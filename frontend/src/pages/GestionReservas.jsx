import { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar, BarChart3, CheckCircle, Plus, Edit, Trash2, RefreshCw, Send, X, CheckCircle2, Search, FileText, AlertCircle, Clock, ArrowRightLeft, Ticket, MapPin, ThumbsUp, ThumbsDown, Lock, BedDouble } from 'lucide-react';
import ReservationService from '../services/reservationService';
import { useAuth } from '../contexts/AuthContext';
import ApiClient from '../services/apiClient';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import ActionIconButton from '../components/ui/ActionIconButton.jsx';
import ActionsOverflow from '../components/ui/ActionsOverflow.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import Modal from '../components/Modal.jsx';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import BulkSelectionBar, { XCircle } from '../components/ui/BulkSelectionBar.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { useAgencies } from '../hooks/useAgencies';
import { formatDateOnly } from '../lib/dateOnly.js';
import { formatExpiry, useCountdownTick } from '../lib/expiry.js';
import ItineraryPDF from '../components/ItineraryPDF.jsx';
import ItineraryTable from '../components/ItineraryTable.jsx';

const emptyForm = {
  product_id: '',
  pedido_id: '',
  agencia: '',
  contacto_nombre: '',
  contacto_email: '',
  contacto_telefono: '',
  nombre_pasajero: '',
  apellido_pasajero: '',
  documento_pasajero: '',
  pasaporte_pasajero: '',
  nacimiento_pasajero: '',
  nacionalidad_pasajero: '',
  tipo_pasajero: 'Adulto',
  numero_ticket: '',
  precio_venta: '',
  doc_contable: '',
  estado: 'bloqueo_temporal',
  vuelo_destino: '',
  vuelo_salida: '',
  bloqueo_expira_at: '',
  ficha_venta: '',
  estado_interno: '',
  status_back: '',
  hotel: '',
  traslados_incluye: false,
  traslados_notas: '',
};

const ESTADO_INTERNO_OPTIONS = ['', 'Pendiente', 'Seña', 'Pagado', 'Emitido'];

const formatDate = formatDateOnly;

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getEstadoVariant = (estado) => {
  if (estado === 'confirmado' || estado === 'confirmada') return 'success';
  if (estado === 'procesando') return 'warning';
  if (estado === 'cancelado' || estado === 'cancelada' || estado === 'solicitud_cancelacion') return 'danger';
  if (estado === 'expirada') return 'danger';
  if (estado === 'cedido') return 'outline';
  return 'default';
};

const getEstadoLabel = (estado) => ({
  bloqueo_temporal: 'Bloqueo Temporal',
  confirmado: 'Confirmado',
  confirmada: 'Confirmado',
  procesando: 'Procesando',
  completado: 'Completado',
  cancelado: 'Cancelado',
  cancelada: 'Cancelado',
  solicitud_cancelacion: 'Sol. Cancelación',
  expirada: 'Expirada',
  cedido: 'Cedido a otra agencia',
}[estado] || estado || '—');

// Comparación de códigos de agencia case/espacio-insensible — igual que el
// backend (strings.EqualFold en product_handler.go). Sin esto, una diferencia
// de mayúsculas entre el código de agencia del producto y el de la reserva
// (mismo código, distinta forma guardada históricamente) hacía ver
// "Compartido — de X" en reservas que en realidad son 100% propias.
const sameAgency = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

// Explota una reserva (pedido) en filas — una por pasajero. Contacto y
// pasajero quedan separados: el contacto es quien figura en la reserva, cada
// pasajero es su propio ticket individual (1 lugar, comparte pedido_id).
// Si la reserva no tiene pasajeros desglosados (dato histórico previo a este
// cambio) cae a los campos *_pasajero de la propia reserva como fallback.
const buildPassengerRows = (r) => {
  if (Array.isArray(r.passengers) && r.passengers.length > 0) {
    return r.passengers.map((p) => ({
      reservation: r,
      key: `${r.id}-${p.id}`,
      passengerId: p.id,
      nombre: p.nombre || '—',
      apellido: p.apellido || '—',
      documento: p.documento || '—',
      tipoPasajero: p.tipo_pasajero || '—',
      estado: p.estado || r.estado || '',
      docContable: p.doc_contable || r.doc_contable || '',
      numeroTicket: p.numero_ticket || '',
      precioVenta: p.precio_venta || r.precio_venta,
      neto1: p.neto_1 || r.neto_1,
    }));
  }
  return [{
    reservation: r,
    key: `${r.id}-principal`,
    passengerId: null,
    nombre: r.nombre_pasajero || '—',
    apellido: r.apellido_pasajero || '—',
    documento: r.documento_pasajero || '—',
    tipoPasajero: r.tipo_pasajero || '—',
    estado: r.estado || '',
    docContable: r.doc_contable || '',
    numeroTicket: '',
    precioVenta: r.precio_venta,
    neto1: r.neto_1,
  }];
};

// ─── Input helper ───────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="font-normal text-slate-400">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200';

export default function GestionReservas() {
  const { can, user } = useAuth();
  const myAgencia = user?.agencia;
  useCountdownTick(); // hace que la cuenta regresiva de vencimiento avance sola
  const [reservations, setReservations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Multi-selección
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkCanceling, setIsBulkCanceling] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReservation, setEditReservation] = useState(null);
  const [editPassengerId, setEditPassengerId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todas');
  const [productInfo, setProductInfo] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [docModal, setDocModal] = useState(null); // { id, pedido_id }
  const [docValue, setDocValue] = useState('');
  const [ticketModal, setTicketModal] = useState(null); // { reservationId, passengerId, pedidoId, nombre }
  const [ticketValue, setTicketValue] = useState('');
  const [pdfModalData, setPdfModalData] = useState(null); // { reservation, passengers, product }
  const [routeModalProduct, setRouteModalProduct] = useState(null); // { codigo_cupo, destino, ruta }
  const [serviciosModal, setServiciosModal] = useState(null); // reserva con hotel/traslados a mostrar

  const { data: agencies = [] } = useAgencies();

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const [items, productsResult] = await Promise.all([
        ReservationService.listReservations(),
        ApiClient.get('/products'),
      ]);
      setReservations(items);
      setProducts(Array.isArray(productsResult) ? productsResult : Array.isArray(productsResult?.data) ? productsResult.data : []);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudieron cargar las reservas' });
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReservations(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const estados = useMemo(() => {
    const set = new Set(reservations.map(r => r.estado).filter(e => e && e !== 'cedido'));
    return ['Todas', ...Array.from(set).sort()];
  }, [reservations]);

  const filtered = useMemo(() => {
    // Excluir registros de cesión de stock (auditoría) de la lista de reservas
    let r = reservations.filter(x => x.estado !== 'cedido');
    if (estadoFilter !== 'Todas') r = r.filter(x => x.estado === estadoFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      r = r.filter(x =>
        x.pedido_id?.toLowerCase().includes(q) ||
        x.contacto_nombre?.toLowerCase().includes(q) ||
        x.vuelo_destino?.toLowerCase().includes(q) ||
        x.agencia?.toLowerCase().includes(q) ||
        x.nombre_pasajero?.toLowerCase().includes(q) ||
        x.ficha_venta?.toLowerCase().includes(q) ||
        (x.passengers || []).some(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q))
      );
    }
    return r;
  }, [reservations, estadoFilter, searchTerm]);

  const agencyName = (code) => agencies.find(a => a.code === code)?.name || code || '—';
  // OP según el tipo real del pasajero (ADT/CHD/INF) — ya no es un valor
  // único por producto.
  const productOp = (productId, tipoPasajero) => {
    const p = products.find(pr => String(pr.id) === String(productId));
    if (!p) return '—';
    if (tipoPasajero === 'Menor') return p.op_chd ?? p.op ?? 0;
    if (tipoPasajero === 'Infante') return p.op_inf ?? p.op ?? 0;
    return p.op_adt ?? p.op ?? 0;
  };

  // ─── Producto lookup ─────────────────────────
  const lookupProduct = useCallback(async (id) => {
    if (!id) return;
    setProductLoading(true);
    setProductInfo(null);
    try {
      const result = await ApiClient.get(`/products/${id}`);
      setProductInfo(result);
      setForm(prev => ({
        ...prev,
        precio_venta: result.precio || prev.precio_venta,
      }));
    } catch {
      setProductInfo({ _error: 'Producto no encontrado' });
    } finally {
      setProductLoading(false);
    }
  }, []);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ─── Dialog ──────────────────────────────────
  const openCreate = () => {
    setEditReservation(null);
    setEditPassengerId(null);
    setForm(emptyForm);
    setProductInfo(null);
    setDialogOpen(true);
  };

  const openEdit = (r) => {
    // El pasajero "principal" del pedido (nro=1, o el primero disponible) es
    // el que se edita acá — un pedido con varios pasajeros sigue teniendo el
    // resto editable desde Nóminas.
    const primaryPassenger = Array.isArray(r.passengers) && r.passengers.length > 0
      ? (r.passengers.find(p => p.nro === 1) || r.passengers[0])
      : null;
    setEditReservation(r);
    setEditPassengerId(primaryPassenger?.id || null);
    setForm({
      product_id: r.product_id || '',
      pedido_id: r.pedido_id || '',
      agencia: r.agencia || '',
      contacto_nombre: r.contacto_nombre || '',
      contacto_email: r.contacto_email || '',
      contacto_telefono: r.contacto_telefono || '',
      nombre_pasajero: primaryPassenger?.nombre || r.nombre_pasajero || '',
      apellido_pasajero: primaryPassenger?.apellido || r.apellido_pasajero || '',
      documento_pasajero: primaryPassenger?.documento || r.documento_pasajero || '',
      pasaporte_pasajero: primaryPassenger?.pasaporte || '',
      nacimiento_pasajero: (primaryPassenger?.nacimiento || r.nacimiento_pasajero)
        ? String(primaryPassenger?.nacimiento || r.nacimiento_pasajero).slice(0, 10)
        : '',
      nacionalidad_pasajero: primaryPassenger?.nacionalidad || r.nacionalidad_pasajero || '',
      tipo_pasajero: primaryPassenger?.tipo_pasajero || r.tipo_pasajero || 'Adulto',
      numero_ticket: primaryPassenger?.numero_ticket || '',
      precio_venta: r.precio_venta || '',
      doc_contable: r.doc_contable || '',
      estado: r.estado || 'bloqueo_temporal',
      vuelo_destino: r.vuelo_destino || '',
      vuelo_salida: r.vuelo_salida ? String(r.vuelo_salida).slice(0, 10) : '',
      bloqueo_expira_at: r.bloqueo_expira_at ? String(r.bloqueo_expira_at).slice(0, 16) : '',
      ficha_venta: r.ficha_venta || '',
      estado_interno: r.estado_interno || '',
      status_back: r.status_back || '',
      hotel: r.hotel || '',
      traslados_incluye: r.traslados_incluye || false,
      traslados_notas: r.traslados_notas || '',
    });
    setProductInfo(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditReservation(null);
    setEditPassengerId(null);
    setForm(emptyForm);
    setProductInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contacto_nombre.trim()) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'El nombre del contacto es requerido.' });
      return;
    }
    if (!editReservation && !form.product_id) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccioná un producto.' });
      return;
    }

    const payload = {
      ...form,
      product_id: form.product_id ? Number(form.product_id) : undefined,
      precio_venta: form.precio_venta ? Number(form.precio_venta) : 0,
    };
    // El input datetime-local manda "YYYY-MM-DDTHH:mm" sin segundos ni offset,
    // que el backend no reconoce (solo "YYYY-MM-DD" y RFC3339 completo).
    if (payload.bloqueo_expira_at && payload.bloqueo_expira_at.length === 16) {
      payload.bloqueo_expira_at = `${payload.bloqueo_expira_at}:00Z`;
    }
    // Al crear, nombre/apellido/documento/nacionalidad/tipo_pasajero van en el
    // payload tal cual (el backend los usa para crear el Passenger inicial).
    // Al editar, en cambio, esos campos + el ticket NO son campos de la
    // Reservation (el backend los bloquea ahí) — se separan y se guardan
    // aparte contra el Passenger existente (ver más abajo).
    let passengerData = null;
    let ticketValue = null;
    if (editReservation) {
      passengerData = {
        nombre: payload.nombre_pasajero,
        apellido: payload.apellido_pasajero,
        documento: payload.documento_pasajero,
        pasaporte: payload.pasaporte_pasajero,
        nacimiento: payload.nacimiento_pasajero || null,
        nacionalidad: payload.nacionalidad_pasajero,
        tipo_pasajero: payload.tipo_pasajero,
      };
      ticketValue = payload.numero_ticket;
      delete payload.nombre_pasajero;
      delete payload.apellido_pasajero;
      delete payload.documento_pasajero;
      delete payload.pasaporte_pasajero;
      delete payload.nacimiento_pasajero;
      delete payload.nacionalidad_pasajero;
      delete payload.tipo_pasajero;
    } else {
      // pasaporte no es un campo de Reservation (solo existe a nivel
      // Passenger) — si no se manda un pasajero explícito, el backend lo
      // sintetiza a partir de los campos *_pasajero de arriba, pero ese
      // fallback no conoce "pasaporte". Se manda armado para que no se pierda.
      payload.passengers = [{
        nombre: payload.nombre_pasajero,
        apellido: payload.apellido_pasajero,
        documento: payload.documento_pasajero,
        pasaporte: payload.pasaporte_pasajero,
        nacimiento: payload.nacimiento_pasajero || null,
        nacionalidad: payload.nacionalidad_pasajero,
        tipo_pasajero: payload.tipo_pasajero,
      }];
      delete payload.pasaporte_pasajero;
    }
    delete payload.numero_ticket;
    // Quitar campos vacíos
    Object.keys(payload).forEach(k => {
      if (payload[k] === '' || payload[k] === undefined) delete payload[k];
    });

    try {
      if (editReservation) {
        await ReservationService.updateReservation(editReservation.id, payload);
        if (editPassengerId) {
          const calls = [ReservationService.updatePassenger(editReservation.id, editPassengerId, passengerData)];
          // El backend rechaza el update de ticket si no hay ningún campo con
          // valor (numero_ticket vacío = nada que guardar) — solo se llama si
          // el usuario realmente cargó/cambió el ticket.
          if (ticketValue && ticketValue.trim()) {
            calls.push(ReservationService.updatePassengerTicket(editReservation.id, editPassengerId, { numero_ticket: ticketValue }));
          }
          await Promise.all(calls);
        }
        Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
      } else {
        await ReservationService.createReservation(payload);
        Swal.fire({ icon: 'success', title: 'Reserva creada', timer: 1500, showConfirmButton: false });
      }
      closeDialog();
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo guardar la reserva' });
    }
  };

  const handleConfirm = async (r) => {
    try {
      await ReservationService.confirmReservation(r.id);
      Swal.fire({ icon: 'success', title: 'Confirmada', timer: 1500, showConfirmButton: false });
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // Aprobar/rechazar una solicitud de cancelación pendiente (solo admin) —
  // pide notas opcionales antes de confirmar la decisión.
  const handleResolveCancellation = async (r, decision) => {
    const isApprove = decision === 'approve';
    const { value: notas, isConfirmed } = await Swal.fire({
      title: isApprove ? '¿Aprobar la cancelación?' : '¿Rechazar la cancelación?',
      text: isApprove
        ? `Se cancelará el pedido ${r.pedido_id} y se liberará el cupo.`
        : `El pedido ${r.pedido_id} volverá a su estado anterior.`,
      input: 'textarea',
      inputLabel: 'Notas (opcional)',
      inputPlaceholder: 'Motivo o comentario para dejar registrado...',
      icon: isApprove ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: isApprove ? 'Aprobar' : 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: isApprove ? '#059669' : '#d33',
    });
    if (!isConfirmed) return;

    try {
      await ReservationService.resolveCancellation(r.id, decision, notas || '');
      Swal.fire({
        icon: 'success',
        title: isApprove ? 'Cancelación aprobada' : 'Cancelación rechazada',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo resolver la solicitud' });
    }
  };

  // Elimina el pasajero de ESA fila únicamente — un pedido puede tener varios
  // pasajeros y cada uno es su propio ticket individual una vez reservado,
  // aunque se hayan creado juntos. Solo si es el último pasajero del pedido
  // se elimina también la reserva (queda vacía, no tiene sentido dejarla).
  const handleDeletePassenger = async (row) => {
    const r = row.reservation;
    const totalPassengers = Array.isArray(r.passengers) && r.passengers.length > 0 ? r.passengers.length : 1;
    const isLastPassenger = !row.passengerId || totalPassengers <= 1;

    const res = await Swal.fire({
      title: `¿Eliminar a ${row.nombre} ${row.apellido}?`,
      icon: 'warning',
      text: isLastPassenger
        ? 'Es el único pasajero de este pedido: se eliminará también la reserva.'
        : 'Se libera su lugar. El resto de los pasajeros de este mismo pedido no se ven afectados.',
      showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!res.isConfirmed) return;
    try {
      if (row.passengerId) {
        await ReservationService.deletePassenger(r.id, row.passengerId);
      } else {
        // Reserva histórica sin pasajeros desglosados: no hay un ticket
        // individual que borrar, se elimina el pedido completo.
        await ReservationService.deleteReservation(r.id);
      }
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  const handleResendEmail = async (r) => {
    try {
      await ReservationService.resendReservationEmail(r.id);
      Swal.fire({ icon: 'success', title: 'Email reenviado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // ─── Doc Contable modal ───────────────────────
  const openDocModal = (r) => { setDocModal(r); setDocValue(r.doc_contable || ''); };
  const handleSaveDoc = async () => {
    if (!docValue.trim()) return;
    try {
      await ReservationService.addDocContable(docModal.id, { doc_contable: docValue });
      Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
      setDocModal(null);
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  // kind: 'confirmar' → Reservation.Estado='confirmada'; 'emitir' →
  // Reservation.EstadoInterno='Emitido' (dispara la generación de tickets en
  // la Bandeja de Tickets, ver GenerateTicketsForReservationInternal). Son
  // dos campos independientes del backend, no el mismo valor.
  const handleBulkUpdate = async (kind) => {
    const isEmitir = kind === 'emitir';
    const result = await Swal.fire({
      title: isEmitir ? '¿Marcar como Emitido?' : '¿Confirmar reservas?',
      text: `Se actualizarán ${selectedIds.length} reservas.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    setIsBulkUpdating(true);
    try {
      if (isEmitir) {
        await ReservationService.bulkEmitReservations(selectedIds);
      } else {
        await ReservationService.bulkConfirmReservations(selectedIds);
      }
      Swal.fire({ icon: 'success', title: 'Actualizadas', timer: 1500, showConfirmButton: false });
      setSelectedIds([]);
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al actualizar masivamente.' });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkCancel = async () => {
    const result = await Swal.fire({
      title: `¿Cancelar ${selectedIds.length} reservas?`,
      html: '<textarea id="motivo-cancel" class="swal2-textarea" placeholder="Motivo de cancelación (requerido)"></textarea>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626',
      preConfirm: () => {
        const motivo = document.getElementById('motivo-cancel').value;
        if (!motivo) {
          Swal.showValidationMessage('Debe ingresar un motivo');
          return false;
        }
        return motivo;
      }
    });
    if (!result.isConfirmed) return;
    setIsBulkCanceling(true);
    try {
      await ReservationService.bulkCancelReservations(selectedIds, result.value);
      Swal.fire({ icon: 'success', title: 'Canceladas', timer: 1500, showConfirmButton: false });
      setSelectedIds([]);
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al cancelar masivamente.' });
    } finally {
      setIsBulkCanceling(false);
    }
  };

  // ─── Ticket individual por pasajero ───────────
  const openTicketModal = (row) => {
    if (!row.passengerId) return;
    setTicketModal({ reservationId: row.reservation.id, passengerId: row.passengerId, pedidoId: row.reservation.pedido_id, nombre: `${row.nombre} ${row.apellido}` });
    setTicketValue(row.numeroTicket || '');
  };
  const handleSaveTicket = async () => {
    if (!ticketValue.trim()) return;
    try {
      await ReservationService.updatePassengerTicket(ticketModal.reservationId, ticketModal.passengerId, { numero_ticket: ticketValue });
      Swal.fire({ icon: 'success', title: 'Ticket guardado', timer: 1200, showConfirmButton: false });
      setTicketModal(null);
      fetchReservations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
  };

  const totalPassengers = useMemo(
    () => filtered.reduce((sum, r) => sum + buildPassengerRows(r).length, 0),
    [filtered]
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
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Reservas"
        description="Administra las reservas y sus pasajeros."
        icon={Calendar}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nueva Reserva
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <StatsHero
        stats={[
          {
            icon: Ticket,
            label: 'Pasajeros',
            value: totalPassengers,
            description: 'Tickets individuales',
            color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
          },
          {
            icon: CheckCircle,
            label: 'Confirmadas',
            value: filtered.filter(r => r.estado === 'confirmado' || r.estado === 'confirmada').length,
            description: 'Reservas confirmadas',
            color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
          },
          {
            icon: Calendar,
            label: 'Pendientes',
            value: filtered.filter(r => r.estado === 'bloqueo_temporal' || r.estado === 'procesando').length,
            description: 'En proceso',
            color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Buscar por pedido, contacto, destino, pasajero, ficha..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
        </div>
      </div>
      {estados.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estado:</span>
          {estados.map(est => (
            <button key={est} type="button" onClick={() => setEstadoFilter(est)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${estadoFilter === est ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {est === 'Todas' ? 'Todas' : getEstadoLabel(est)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonTable columns={10} rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🧳"
          title="No hay reservas"
          description={searchTerm || estadoFilter !== 'Todas' ? 'Sin resultados con los filtros aplicados.' : 'No hay reservas registradas.'}
        />
      ) : (
      <Card>
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center sticky left-0 z-20 bg-slate-50 border-r border-b border-slate-200">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(filtered.map(r => r.id));
                    else setSelectedIds([]);
                  }}
                  className="rounded border-gray-300 w-4 h-4"
                />
              </TableHead>
              <TableHead className="text-center sticky left-10 z-20 bg-slate-50 border-r border-b border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Acciones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Cía</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>Ficha</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Ruta</TableHead>
              <TableHead className="text-center">Servicios</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Cesión</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Doc.Contable</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead className="text-right">Neto 1</TableHead>
              <TableHead className="text-right">OP</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>ID Pedido</TableHead>
              <TableHead>Agencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.flatMap(r => {
              const expiry = r.estado === 'bloqueo_temporal' ? formatExpiry(r.bloqueo_expira_at) : null;
              return buildPassengerRows(r).map(row => (
                <TableRow key={row.key} className={selectedIds.includes(r.id) ? 'bg-blue-50/50' : ''}>
                  <TableCell className="w-10 text-center sticky left-0 z-10 bg-white border-r border-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(prev => [...prev, r.id]);
                        else setSelectedIds(prev => prev.filter(id => id !== r.id));
                      }}
                      className="rounded border-gray-300 w-4 h-4"
                    />
                  </TableCell>
                  <TableCell className="sticky left-10 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-center gap-1">
                      <ActionIconButton icon={Edit} onClick={() => openEdit(r)} title="Editar reserva" />
                      <ActionIconButton icon={Trash2} variant="danger" onClick={() => handleDeletePassenger(row)} title="Eliminar este pasajero" />
                      <ActionsOverflow
                        items={[
                          r.estado === 'solicitud_cancelacion' &&
                            { icon: ThumbsUp, label: 'Aprobar cancelación', onClick: () => handleResolveCancellation(r, 'approve') },
                          r.estado === 'solicitud_cancelacion' &&
                            { icon: ThumbsDown, label: 'Rechazar cancelación', onClick: () => handleResolveCancellation(r, 'decline'), danger: true },
                          r.estado !== 'confirmado' && r.estado !== 'confirmada' && r.estado !== 'solicitud_cancelacion' && r.estado !== 'expirada' && r.estado !== 'cancelada' &&
                            { icon: CheckCircle2, label: 'Confirmar pedido completo', onClick: () => handleConfirm(r) },
                          { icon: Send, label: 'Reenviar email', onClick: () => handleResendEmail(r) },
                          row.numeroTicket &&
                            {
                              icon: FileText,
                              label: 'Generar itinerario',
                              onClick: () => {
                                const reservation = r;
                                const passengers = [row]; // Pasamos el pasajero de esta fila
                                const liveProduct = products.find(p => p.id === r.product_id);
                                const product = {
                                  ruta: r.vuelo_ruta,
                                  destino: r.vuelo_destino,
                                  fecha_salida: r.vuelo_salida,
                                  pnr: liveProduct?.pnr,
                                  carryon: liveProduct?.carryon,
                                  handbag: liveProduct?.handbag,
                                  checkedbag: liveProduct?.checkedbag,
                                };
                                setPdfModalData({ reservation, passengers, product });
                              },
                            },
                        ]}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEstadoVariant(row.estado)}>{getEstadoLabel(row.estado)}</Badge>
                  </TableCell>
                  <TableCell>{r.vuelo_destino || '—'}</TableCell>
                  <TableCell>{r.vuelo_compania || '—'}</TableCell>
                  <TableCell>{formatDate(r.vuelo_salida)}</TableCell>
                  <TableCell className="font-medium text-slate-900">{row.nombre}</TableCell>
                  <TableCell>{row.apellido}</TableCell>
                  <TableCell className="text-xs">{r.ficha_venta || '—'}</TableCell>
                  <TableCell>{row.documento}</TableCell>
                  <TableCell>{row.tipoPasajero}</TableCell>
                  <TableCell className="text-center">
                    {r.vuelo_ruta || (products.find(p => p.id === r.product_id)?.ruta) ? (
                      <button
                        type="button"
                        onClick={() => {
                          const associatedProduct = products.find(p => p.id === r.product_id);
                          setRouteModalProduct({
                            codigo_cupo: r.vuelo_codigo,
                            destino: r.vuelo_destino,
                            ruta: r.vuelo_ruta || associatedProduct?.ruta
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                        title="Ver detalle de la ruta"
                      >
                        <MapPin className="h-3 w-3" />
                        Ruta
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(r.hotel || r.traslados_incluye) ? (
                      <button
                        type="button"
                        onClick={() => setServiciosModal(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                        title="Ver hotel / traslados"
                      >
                        <BedDouble className="h-3 w-3" />
                        Servicios
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-600">{formatDate(r.bloqueo_expira_at) || '—'}</span>
                      {expiry && (
                        <span className={`flex items-center gap-1 text-xs ${expiry.color}`}>
                          <Clock className="h-3 w-3" />{expiry.label}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {/* Cesión: en la agencia cedente muestra la salida de stock;
                      en la reserva real hecha con ese cupo, de qué agencia vino */}
                  <TableCell>
                    {r.estado === 'cedido' ? (
                      <Badge variant="outline" className="inline-flex items-center gap-1 w-fit">
                        <ArrowRightLeft className="h-3 w-3" /> Cesión saliente
                      </Badge>
                    ) : r.original_agency && !sameAgency(r.original_agency, myAgencia) ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="inline-flex items-center gap-1 w-fit">
                          <ArrowRightLeft className="h-3 w-3" /> Cupo cedido
                        </Badge>
                        <span className="text-[10px] text-slate-500">de {agencyName(r.original_agency)}</span>
                      </div>
                    ) : r.original_agency ? (
                      // Soy la agencia cedente: esta venta la hizo la agencia
                      // receptora sobre un cupo que yo cedí.
                      <Badge variant="outline" className="inline-flex items-center gap-1 w-fit">
                        <ArrowRightLeft className="h-3 w-3" /> Cedido a {agencyName(r.agencia)}
                      </Badge>
                    ) : (() => {
                      // Producto compartido (visibilidad multi-agencia, mismo
                      // stock, sin fila espejo): esta reserva la tomó otra
                      // agencia distinta a la dueña del producto.
                      const ownerAgencia = products.find(p => p.id === r.product_id)?.agencia;
                      return ownerAgencia && r.agencia && !sameAgency(r.agencia, ownerAgencia) ? (
                        <Badge variant="outline" className="w-fit text-[10px]">
                          Compartido — de {agencyName(ownerAgencia)}
                        </Badge>
                      ) : '—';
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.contacto_nombre || '—'}</div>
                    <div className="text-xs text-slate-400">{r.contacto_email}</div>
                  </TableCell>
                  <TableCell>
                    {row.docContable ? (
                      <span className="text-xs text-green-600 font-medium">✓ {row.docContable}</span>
                    ) : row.estado === 'bloqueo_temporal' ? (
                      <button type="button" onClick={() => openDocModal(r)}
                        className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 underline">
                        <AlertCircle className="h-3 w-3" /> Pendiente
                      </button>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </TableCell>
                  <TableCell>
                    {row.numeroTicket ? (
                      <button type="button" onClick={() => openTicketModal(row)} className="text-xs font-mono text-slate-700 hover:underline">
                        {row.numeroTicket}
                      </button>
                    ) : (row.passengerId && row.estado !== 'expirada' && row.estado !== 'cancelada') ? (
                      <button type="button" onClick={() => openTicketModal(row)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 underline">
                        <Ticket className="h-3 w-3" /> Asignar
                      </button>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(row.precioVenta)}</TableCell>
                  <TableCell className="text-right font-mono">{formatMoney(row.neto1)}</TableCell>
                  <TableCell className="text-right font-mono">{productOp(r.product_id, row.tipoPasajero)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{r.vendedor_email || '—'}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{r.pedido_id}</TableCell>
                  <TableCell>{agencyName(r.agencia)}</TableCell>
                </TableRow>
              ));
            })}
          </TableBody>
        </TableComponent>
      </Card>
      )}

      <BulkSelectionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        entityLabel="reserva"
        actions={[
          { label: 'Confirmar', icon: CheckCircle2, variant: 'success', onClick: () => handleBulkUpdate('confirmar'), loading: isBulkUpdating },
          { label: 'Emitir', icon: Ticket, variant: 'primary', onClick: () => handleBulkUpdate('emitir'), loading: isBulkUpdating },
          { label: 'Cancelar', icon: XCircle, variant: 'danger', onClick: handleBulkCancel, loading: isBulkCanceling }
        ]}
      />

      {/* ─── Modal Crear / Editar ─── */}
      <Modal title={editReservation ? 'Editar Reserva' : 'Nueva Reserva'} open={dialogOpen} onClose={closeDialog} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* PRODUCTO */}
          {!editReservation && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</h3>
              <Field label="ID del Producto" required hint="ingresá el ID y presioná Buscar">
                <div className="flex gap-2">
                  <input type="number" value={form.product_id} onChange={e => setField('product_id', e.target.value)}
                    className={inputCls} placeholder="Ej: 42" />
                  <Button type="button" size="sm" onClick={() => lookupProduct(form.product_id)} disabled={!form.product_id || productLoading}>
                    <Search className="h-4 w-4 mr-1" />{productLoading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </Field>
              {productInfo && !productInfo._error && (
                <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1">
                  <div className="font-medium text-slate-800">{productInfo.destino} — {productInfo.compania}</div>
                  <div className="text-slate-500 text-xs">
                    {productInfo.codigo_cupo} · Salida: {formatDate(productInfo.fecha_salida || productInfo.salida)} · Disponibilidad: {productInfo.disponibilidad} cupos
                  </div>
                  <div className="text-slate-700 font-semibold">Precio: ${productInfo.precio}</div>
                </div>
              )}
              {productInfo?._error && (
                <p className="mt-1 text-xs text-red-500">{productInfo._error}</p>
              )}
            </section>
          )}

          {/* RESERVA */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Datos del Pedido</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="ID Pedido" hint="se genera automáticamente si se deja vacío">
                <input type="text" value={form.pedido_id} onChange={e => setField('pedido_id', e.target.value)}
                  className={inputCls} placeholder="Auto-generado" />
              </Field>
              <Field label="Agencia">
                <select value={form.agencia} onChange={e => setField('agencia', e.target.value)} className={inputCls + ' bg-white'}>
                  <option value="">Seleccionar agencia...</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.code}>{a.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Precio de Venta" hint={!editReservation ? 'del producto si se deja en 0' : undefined}>
                <input type="number" value={form.precio_venta} onChange={e => setField('precio_venta', e.target.value)}
                  className={inputCls} placeholder="0" min="0" step="0.01" />
              </Field>
              {editReservation && (
                <Field label="Estado">
                  <select value={form.estado} onChange={e => setField('estado', e.target.value)} className={inputCls + ' bg-white'}>
                    {['bloqueo_temporal', 'confirmado', 'procesando', 'completado', 'cancelado'].map(s => (
                      <option key={s} value={s}>{getEstadoLabel(s)}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </section>

          {/* VUELO / VENCIMIENTO — solo en edición, son datos del pedido, no del pasajero */}
          {editReservation && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Vuelo y Vencimiento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Destino">
                  <input type="text" value={form.vuelo_destino} onChange={e => setField('vuelo_destino', e.target.value)}
                    className={inputCls} placeholder="Destino" />
                </Field>
                <Field label="Salida">
                  <input type="date" value={form.vuelo_salida} onChange={e => setField('vuelo_salida', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label="Vencimiento del bloqueo">
                  <input type="datetime-local" value={form.bloqueo_expira_at} onChange={e => setField('bloqueo_expira_at', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label="Ficha">
                  <input type="text" value={form.ficha_venta} onChange={e => setField('ficha_venta', e.target.value)}
                    className={inputCls} placeholder="Ficha de venta" />
                </Field>
                <Field label="Estado interno" hint="Seguimiento de pago/emisión, independiente del estado de arriba">
                  <select value={form.estado_interno} onChange={e => setField('estado_interno', e.target.value)} className={inputCls + ' bg-white'}>
                    {ESTADO_INTERNO_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt || 'Sin definir'}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status BACK" hint='Ej: "BO OK" — si ya se cargó en el backoffice'>
                  <input type="text" value={form.status_back} onChange={e => setField('status_back', e.target.value)}
                    className={inputCls} placeholder="BO OK" />
                </Field>
              </div>
            </section>
          )}

          {/* CONTACTO */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</h3>
            <p className="mb-2 text-xs text-slate-400">La persona de contacto no es necesariamente un pasajero del viaje.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre del Contacto" required>
                <input type="text" value={form.contacto_nombre} onChange={e => setField('contacto_nombre', e.target.value)}
                  className={inputCls} placeholder="Nombre completo" required />
              </Field>
              <Field label="Email">
                <input type="email" value={form.contacto_email} onChange={e => setField('contacto_email', e.target.value)}
                  className={inputCls} placeholder="email@ejemplo.com" />
              </Field>
              <Field label="Teléfono">
                <input type="tel" value={form.contacto_telefono} onChange={e => setField('contacto_telefono', e.target.value)}
                  className={inputCls} placeholder="+598 99..." />
              </Field>
            </div>
          </section>

          {/* PASAJERO — al crear, carga el primer pasajero del pedido. Al
              editar, edita los datos propios del pasajero principal (nro=1);
              el resto de los pasajeros del mismo pedido (si hay más de uno)
              se maneja desde Nóminas. */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pasajero</h3>
            {editReservation ? (
              editPassengerId ? (
                <p className="mb-2 text-xs text-slate-400">
                  Datos del pasajero principal de este pedido. Si hay más de un pasajero, el resto se edita desde <span className="font-medium text-slate-500">Gestión de Nóminas</span>.
                </p>
              ) : (
                <p className="mb-2 text-xs text-amber-600">
                  Esta reserva no tiene un pasajero desglosado (dato histórico) — para editarlo, usá <span className="font-medium">Gestión de Nóminas</span>.
                </p>
              )
            ) : (
              <p className="mb-2 text-xs text-slate-400">Cada pasajero ocupa 1 lugar y se crea como su propio ticket. Para cargar varios pasajeros en el mismo pedido, usá la pantalla de Disponibilidad.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre">
                <input type="text" value={form.nombre_pasajero} onChange={e => setField('nombre_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls} placeholder="Nombre" />
              </Field>
              <Field label="Apellido">
                <input type="text" value={form.apellido_pasajero} onChange={e => setField('apellido_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls} placeholder="Apellido" />
              </Field>
              <Field label="CI">
                <input type="text" value={form.documento_pasajero} onChange={e => setField('documento_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls} placeholder="CI" />
              </Field>
              <Field label="Pasaporte">
                <input type="text" value={form.pasaporte_pasajero} onChange={e => setField('pasaporte_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls} placeholder="Pasaporte" />
              </Field>
              <Field label="Nacimiento">
                <input type="date" value={form.nacimiento_pasajero} onChange={e => setField('nacimiento_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls} />
              </Field>
              <Field label="Nacionalidad">
                <input type="text" value={form.nacionalidad_pasajero} onChange={e => setField('nacionalidad_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls} placeholder="Uruguayo/a" />
              </Field>
              <Field label="Tipo">
                <select value={form.tipo_pasajero} onChange={e => setField('tipo_pasajero', e.target.value)}
                  disabled={editReservation && !editPassengerId}
                  className={inputCls + ' bg-white'}>
                  {['Adulto', 'Niño', 'Infante'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              {editReservation && editPassengerId && (
                <Field label="Ticket">
                  <input type="text" value={form.numero_ticket} onChange={e => setField('numero_ticket', e.target.value)}
                    className={inputCls} placeholder="Ej: 075-1234567890" />
                </Field>
              )}
            </div>
          </section>

          {/* SERVICIOS */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Servicios</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Hotel">
                <input type="text" value={form.hotel} onChange={e => setField('hotel', e.target.value)}
                  className={inputCls} placeholder="Ej: Hotel Playa Sol" />
              </Field>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input type="checkbox" checked={form.traslados_incluye} onChange={e => setField('traslados_incluye', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300" />
                  Incluye traslados
                </label>
                {form.traslados_incluye && (
                  <input type="text" value={form.traslados_notas} onChange={e => setField('traslados_notas', e.target.value)}
                    className={inputCls} placeholder="Notas de traslados — ej: aeropuerto-hotel ida y vuelta" />
                )}
              </div>
            </div>
          </section>

          {/* DOC CONTABLE */}
          <section className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-start gap-2 mb-2">
              <FileText className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-orange-700">Documento Contable</p>
                <p className="text-xs text-orange-600">Opcional al crear. Debe cargarse antes de que venza el bloqueo temporal.</p>
              </div>
            </div>
            <input type="text" value={form.doc_contable} onChange={e => setField('doc_contable', e.target.value)}
              className="w-full rounded-xl border border-orange-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Nro de documento contable (ej: FC-0001)" />
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={closeDialog}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal Doc Contable rápido ─── */}
      <Modal title="Agregar Documento Contable" open={!!docModal} onClose={() => setDocModal(null)} size="sm">
        {docModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Reserva <span className="font-mono font-medium">{docModal.pedido_id}</span>
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Número de documento contable</label>
              <input type="text" value={docValue} onChange={e => setDocValue(e.target.value)}
                className={inputCls} placeholder="FC-0001, REC-123, etc." autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setDocModal(null)}>Cancelar</Button>
              <Button type="button" onClick={handleSaveDoc} disabled={!docValue.trim()}>Guardar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Modal Ticket individual ─── */}
      <Modal title="Número de Ticket" open={!!ticketModal} onClose={() => setTicketModal(null)} size="sm">
        {ticketModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Pedido <span className="font-mono font-medium">{ticketModal.pedidoId}</span> — {ticketModal.nombre}
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Número de ticket</label>
              <input type="text" value={ticketValue} onChange={e => setTicketValue(e.target.value)}
                className={inputCls} placeholder="Ej: 075-1234567890" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setTicketModal(null)}>Cancelar</Button>
              <Button type="button" onClick={handleSaveTicket} disabled={!ticketValue.trim()}>Guardar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Modal Itinerario PDF ─── */}
      <Modal title="Itinerario PDF" open={!!pdfModalData} onClose={() => setPdfModalData(null)} size="3xl">
        {pdfModalData && (
          <ItineraryPDF 
            reservation={pdfModalData.reservation} 
            passengers={pdfModalData.passengers} 
            product={pdfModalData.product} 
          />
        )}
      </Modal>

      {/* ─── Modal Servicios (Hotel/Traslados) ─── */}
      <Modal title="Servicios" open={!!serviciosModal} onClose={() => setServiciosModal(null)} size="sm">
        {serviciosModal && (
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-medium text-slate-500">Hotel</span>
              <p className="text-slate-800">{serviciosModal.hotel || '—'}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Traslados</span>
              <p className="text-slate-800">
                {serviciosModal.traslados_incluye
                  ? (serviciosModal.traslados_notas || 'Incluidos, sin notas adicionales')
                  : 'No incluidos'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Modal Ver Ruta ─── */}
      {routeModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRouteModalProduct(null)}>
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl max-h-screen sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Detalle de Ruta
                  </h2>
                  <p className="text-sm text-slate-500">
                    {routeModalProduct.codigo_cupo} — {routeModalProduct.destino}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRouteModalProduct(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Contenido */}
            <div className="p-5">
              <ItineraryTable ruta={routeModalProduct.ruta} showCopyButton={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
