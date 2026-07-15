import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock3, Clock, RefreshCw, FileText, XCircle, MapPin, X, Luggage, Plus, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { formatDateOnly } from '../lib/dateOnly.js';
import { formatGroupItinerary } from '../lib/itineraryText.js';
import { formatExpiry, useCountdownTick } from '../lib/expiry.js';
import ItineraryTable from '../components/ItineraryTable.jsx';
import BaggageFranchise from '../components/BaggageFranchise.jsx';
import GroupOptionsFields from '../components/GroupOptionsFields.jsx';
import { useGroups, useRequestGroup, useAcceptGroupQuote, useRequestGroupCancellation } from '../hooks/useGroups';

const GROUP_COTIZACION_LABEL = {
  pendiente: 'Solicitada',
  cotizada: 'Cotización disponible',
  aceptada: 'Aceptada — esperando confirmación',
  rechazada: 'Rechazada',
};
const GROUP_COTIZACION_VARIANT = {
  pendiente: 'default',
  cotizada: 'warning',
  aceptada: 'success',
  rechazada: 'danger',
};
const GROUP_RESERVAR_LABEL = {
  confirmada: 'Confirmado',
  cancelacion_solicitada: 'Cancelación solicitada',
  cancelada: 'Cancelado',
};
const GROUP_RESERVAR_VARIANT = {
  confirmada: 'success',
  cancelacion_solicitada: 'warning',
  cancelada: 'danger',
};

const statusVariant = (status) => {
  if (!status) return 'default';
  const normalized = status.toLowerCase();
  if (normalized.includes('confirm')) return 'success';
  if (normalized.includes('pend')) return 'warning';
  return 'default';
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


export default function Requests() {
  useCountdownTick(); // hace que la cuenta regresiva de "Vencimiento" avance sola
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docModal, setDocModal] = useState(null); // { id, pedido_id }
  const [docValue, setDocValue] = useState('');
  const [docSaving, setDocSaving] = useState(false);
  const [routeModal, setRouteModal] = useState(null); // { codigo_cupo, destino, ruta }

  // ─── Solicitud de grupos (vuelos a medida) ───────────────────────────────
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupCantidadLugares, setGroupCantidadLugares] = useState('');
  const [groupOptions, setGroupOptions] = useState([{ itinerario: '', notas: '' }]);
  const [groupNotas, setGroupNotas] = useState('');

  const { data: myGroupsResult } = useGroups();
  const myGroups = Array.isArray(myGroupsResult) ? myGroupsResult : Array.isArray(myGroupsResult?.data) ? myGroupsResult.data : [];
  const requestGroupMutation = useRequestGroup();
  const acceptGroupMutation = useAcceptGroupQuote();
  const requestGroupCancellationMutation = useRequestGroupCancellation();

  const openGroupModal = () => {
    setGroupCantidadLugares('');
    setGroupOptions([{ itinerario: '', notas: '' }]);
    setGroupNotas('');
    setIsGroupModalOpen(true);
  };

  const submitGroupRequest = async () => {
    const cantidad = Number(groupCantidadLugares);
    if (!cantidad || cantidad <= 0) {
      Swal.fire({ icon: 'warning', title: 'Cantidad requerida', text: 'Ingresá la cantidad de lugares.' });
      return;
    }
    if (groupOptions.some((opt) => !opt.itinerario.trim())) {
      Swal.fire({ icon: 'warning', title: 'Itinerario requerido', text: 'Completá el itinerario de cada opción.' });
      return;
    }
    try {
      await requestGroupMutation.mutateAsync({
        cantidad_lugares: cantidad,
        notas_vendedor: groupNotas,
        opciones: groupOptions.map((opt) => ({ itinerario: opt.itinerario, notas: opt.notas })),
      });
      Swal.fire({ icon: 'success', title: 'Solicitud enviada', text: 'El administrador va a cargar la cotización a la brevedad.', timer: 2000, showConfirmButton: false });
      setIsGroupModalOpen(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo enviar la solicitud de grupo.' });
    }
  };

  const handleAcceptGroup = async (group) => {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Aceptar esta opción?',
      text: 'Las demás opciones de esta solicitud van a quedar rechazadas automáticamente.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aceptar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;
    try {
      await acceptGroupMutation.mutateAsync(group.id);
      Swal.fire({ icon: 'success', title: '¡Aceptada!', text: 'Ahora queda esperando la confirmación del administrador.', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo aceptar la cotización.' });
    }
  };

  const handleRequestGroupCancellation = async (group) => {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Solicitar cancelación del grupo?',
      text: 'El administrador decidirá si se cancela.',
      showCancelButton: true,
      confirmButtonText: 'Sí, solicitar',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) return;
    try {
      await requestGroupCancellationMutation.mutateAsync(group.id);
      Swal.fire({ icon: 'success', title: 'Solicitud enviada', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo enviar la solicitud.' });
    }
  };

  // Agrupa visualmente las opciones que nacieron de una misma solicitud
  // (solicitud_id compartido) para mostrarlas juntas en vez de sueltas.
  const groupedMyGroups = useMemo(() => {
    const bySolicitud = new Map();
    const standalone = [];
    myGroups.forEach((g) => {
      if (!g.solicitud_id) {
        standalone.push([g]);
        return;
      }
      if (!bySolicitud.has(g.solicitud_id)) bySolicitud.set(g.solicitud_id, []);
      bySolicitud.get(g.solicitud_id).push(g);
    });
    return [...bySolicitud.values(), ...standalone].sort((a, b) => (b[0].id || 0) - (a[0].id || 0));
  }, [myGroups]);

  const stats = useMemo(
    () => [
      {
        label: 'Solicitudes totales',
        value: data.length,
        icon: ClipboardList,
        description: 'Todas las solicitudes registradas en el sistema.',
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      },
      {
        label: 'Pendientes',
        value: data.filter((item) => item.Estado?.toLowerCase().includes('solicit')).length,
        icon: Clock3,
        description: 'Solicitudes que siguen en estado pendiente.',
        color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
      },
    ],
    [data],
  );

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await ReservationService.getRequests();
      setData(result.data);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudieron cargar las solicitudes' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      ReservationService.refreshCache?.();
      await fetchRequests();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Solicitudes actualizadas correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const openDocModal = (item) => {
    setDocModal({ id: item.id, pedido_id: item.Pedido_ID });
    setDocValue(item.Doc_Contable || '');
  };

  const handleRequestCancellation = async (item) => {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Solicitar cancelación?',
      text: '¿Solicitás la cancelación de esta reserva? El administrador decidirá si se cancela.',
      showCancelButton: true,
      confirmButtonText: 'Sí, solicitar',
      cancelButtonText: 'No',
    });
    if (!result.isConfirmed) return;
    try {
      await ReservationService.requestCancellation(item.id);
      Swal.fire({ icon: 'success', title: 'Solicitud enviada', text: 'El administrador revisará tu pedido.', timer: 2000, showConfirmButton: false });
      fetchRequests();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo enviar la solicitud.' });
    }
  };

  const saveDocContable = async () => {
    if (!docValue.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campo vacío', text: 'Ingresá el número de documento contable.' });
      return;
    }
    setDocSaving(true);
    try {
      await ReservationService.addDocContable(docModal.id, { doc_contable: docValue.trim() });
      Swal.fire({ icon: 'success', title: '¡Confirmado!', text: 'Documento contable agregado. La reserva fue confirmada.', timer: 2000, showConfirmButton: false });
      setDocModal(null);
      setDocValue('');
      fetchRequests();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo guardar el documento.' });
    } finally {
      setDocSaving(false);
    }
  };

  const formatDate = formatDateOnly;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes"
        description="Visualiza rápidamente el estado actual de las solicitudes de reserva."
        icon={ClipboardList}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              title="Refrescar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="secondary" onClick={openGroupModal} title="Solicitar un vuelo a medida (grupo)">
              <Luggage className="h-4 w-4 mr-1" />
              Solicitar Grupo
            </Button>
          </div>
        }
      />

      <StatsHero stats={stats} />

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Lista de solicitudes</h2>
            <p className="text-sm text-slate-500">Ordenadas por pedido y estado para identificar rápido qué revisar.</p>
          </div>
          <span className="text-sm text-slate-500">Actualiza con el botón cuando necesites datos frescos</span>
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Pedido</TableHead>
              <TableHead className="text-center">Pasajero</TableHead>
              <TableHead className="text-center">Destino</TableHead>
              <TableHead className="text-center">Compañía</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-center">Temporada</TableHead>
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Ruta</TableHead>
              <TableHead className="text-center">Equipaje</TableHead>
              <TableHead className="text-center">Tarifa</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Vencimiento</TableHead>
              <TableHead className="text-center">Doc. Contable</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={14}>
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={14}>
                  No hay solicitudes registradas.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center font-medium">{item.Pedido_ID}</TableCell>
                  <TableCell className="text-center">
                    {[item.Nombre_Pasajero, item.Apellido_Pasajero].filter(Boolean).join(' ') || item.Contacto_Nombre || '—'}
                  </TableCell>
                  <TableCell className="text-center">{item.Vuelo_Destino || '—'}</TableCell>
                  <TableCell className="text-center">{item.Vuelo_Compania || '—'}</TableCell>
                  <TableCell className="text-center">{item.TipoProducto || '—'}</TableCell>
                  <TableCell className="text-center">{item.Temporada || '—'}</TableCell>
                  <TableCell className="text-center">{formatDate(item.Vuelo_Salida)}</TableCell>
                  <TableCell className="text-center">
                    {item.Ruta ? (
                      <button
                        type="button"
                        onClick={() => setRouteModal({ codigo_cupo: item.Vuelo_Codigo, destino: item.Vuelo_Destino, ruta: item.Ruta })}
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
                  <TableCell className="text-center"><BaggageFranchise item={item} /></TableCell>
                  <TableCell className="text-center">{formatMoney(item.Vuelo_Precio)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusVariant(item.Estado)}>{item.Estado || 'Desconocido'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const expiry = item.Estado === 'bloqueo_temporal' ? formatExpiry(item.Bloqueo_Expira_At) : null;
                      return expiry ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs text-slate-500">{formatDate(item.Bloqueo_Expira_At)}</span>
                          <span className={`flex items-center gap-1 text-xs font-medium ${expiry.color}`}>
                            <Clock className="h-3 w-3" />{expiry.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.Doc_Contable ? (
                      <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded">{item.Doc_Contable}</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openDocModal(item)}
                        title="Agregar documento contable para confirmar la reserva"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.Estado?.toLowerCase() === 'solicitud_cancelacion' ? (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                        Cancelación solicitada
                      </span>
                    ) : item.Estado?.toLowerCase() === 'cancelada' ? null : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRequestCancellation(item)}
                        title="Solicitar cancelación de esta reserva"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Solicitar cancelación
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      {/* Mis solicitudes de grupo (vuelos a medida) */}
      {groupedMyGroups.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Mis solicitudes de grupo</h2>
              <p className="text-sm text-slate-500">Seguí el estado de tus vuelos a medida y aceptá cotizaciones cuando estén listas.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {groupedMyGroups.map((opciones, idx) => (
              <div key={opciones[0]?.id || idx} className="p-6 space-y-3">
                {opciones.length > 1 && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Solicitud con {opciones.length} opciones
                  </p>
                )}
                {opciones.map((group) => (
                  <GroupOptionCard
                    key={group.id}
                    group={group}
                    onAccept={handleAcceptGroup}
                    onRequestCancellation={handleRequestGroupCancellation}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Solicitar Grupo */}
      <Modal
        title="Solicitar Grupo"
        open={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        size="2xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Pedí un vuelo a medida. Podés proponer más de una opción de itinerario — el administrador va a cotizar y vos elegís cuál te sirve.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Cantidad de lugares *</label>
            <input
              type="number"
              min="1"
              value={groupCantidadLugares}
              onChange={(e) => setGroupCantidadLugares(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <GroupOptionsFields options={groupOptions} onChange={setGroupOptions} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notas (opcional)</label>
            <textarea
              value={groupNotas}
              onChange={(e) => setGroupNotas(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setIsGroupModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitGroupRequest} disabled={requestGroupMutation.isPending}>
              {requestGroupMutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Doc. Contable */}
      <Modal
        title={`Doc. Contable — ${docModal?.pedido_id || ''}`}
        open={!!docModal}
        onClose={() => { setDocModal(null); setDocValue(''); }}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Al agregar el documento contable la reserva se confirmará automáticamente.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Número de documento contable *</label>
            <input
              type="text"
              value={docValue}
              onChange={(e) => setDocValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveDocContable()}
              autoFocus
              placeholder="Ej: FC-001, FAC-2024-000123"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => { setDocModal(null); setDocValue(''); }}>
              Cancelar
            </Button>
            <Button onClick={saveDocContable} disabled={docSaving}>
              {docSaving ? 'Guardando...' : 'Confirmar Reserva'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver Ruta */}
      {routeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRouteModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Detalle de Ruta</h2>
                  <p className="text-sm text-slate-500">{routeModal.codigo_cupo} — {routeModal.destino}</p>
                </div>
              </div>
              <button onClick={() => setRouteModal(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <ItineraryTable ruta={routeModal.ruta} showCopyButton={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group option card (colapsable) ──────────────────────────────────────────
// Mismo patrón que ProductSection en GestionNominas.jsx: header siempre
// visible con el resumen (opción, destino, aerolínea, lugares, estado) y el
// resto de la info (itinerario, condiciones, PNRs, fechas operativas, notas,
// acciones) solo al expandir.
function GroupOptionCard({ group, onAccept, onRequestCancellation }) {
  const [expanded, setExpanded] = useState(false);

  const cotizacionLabel = group.estado_cotizacion === 'aceptada' && group.estado_reservar === 'confirmada'
    ? 'Aceptada'
    : (GROUP_COTIZACION_LABEL[group.estado_cotizacion] || group.estado_cotizacion || 'Solicitada');

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-slate-400 shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
          <div className="min-w-0 col-span-2 sm:col-span-1">
            {group.opcion_numero > 0 && (
              <p className="text-xs font-medium text-slate-400">Opción {group.opcion_numero}</p>
            )}
            <p className="text-sm font-semibold text-slate-900 truncate">{group.destino || 'Destino a confirmar'}</p>
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-xs text-slate-400">Aerolínea</p>
            <p className="text-sm text-slate-700 truncate">{group.compania || '—'}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-slate-400">Lugares</p>
            <p className="text-sm text-slate-700">{group.cantidad_lugares || '—'}</p>
          </div>
          <div className="col-span-2 sm:col-span-2 flex flex-wrap justify-end gap-1">
            <Badge variant={GROUP_COTIZACION_VARIANT[group.estado_cotizacion] || 'default'}>
              {cotizacionLabel}
            </Badge>
            {group.estado_reservar && (
              <Badge variant={GROUP_RESERVAR_VARIANT[group.estado_reservar] || 'default'}>
                {GROUP_RESERVAR_LABEL[group.estado_reservar] || group.estado_reservar}
              </Badge>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          <p className="text-xs text-slate-500 sm:hidden">Lugares: {group.cantidad_lugares || '—'}</p>
          {group.itinerario && (
            <p className="whitespace-pre-wrap text-xs text-slate-600">{formatGroupItinerary(group.itinerario)}</p>
          )}

          {group.estado_cotizacion === 'cotizada' && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
              {group.condiciones && <div className="col-span-2"><span className="text-slate-400">Condiciones:</span> {group.condiciones}</div>}
              {group.pnr_airline && <div><span className="text-slate-400">PNR Aerolínea:</span> {group.pnr_airline}</div>}
              {group.pnr_agency && <div><span className="text-slate-400">PNR Agencia:</span> {group.pnr_agency}</div>}
              {!!group.neto_01 && <div><span className="text-slate-400">Neto:</span> {formatMoney(group.neto_01)}</div>}
              {group.vencimiento_cotizacion && <div><span className="text-slate-400">Vence:</span> {formatDateOnly(group.vencimiento_cotizacion)}</div>}
            </div>
          )}

          {group.estado_reservar === 'confirmada' && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-emerald-50 p-3 text-xs sm:grid-cols-4">
              {group.nomination_date && <div><span className="text-slate-400">Nominación:</span> {formatDateOnly(group.nomination_date)}</div>}
              {group.fecha_emision && <div><span className="text-slate-400">Emisión:</span> {formatDateOnly(group.fecha_emision)}</div>}
              {group.fecha_gastos && <div><span className="text-slate-400">Entrada en gastos:</span> {formatDateOnly(group.fecha_gastos)}</div>}
              {group.vencimiento_pago && <div><span className="text-slate-400">Vencimiento de pago:</span> {formatDateOnly(group.vencimiento_pago)}</div>}
              {group.notas_externas && <div className="col-span-2 sm:col-span-4"><span className="text-slate-400">Notas:</span> {group.notas_externas}</div>}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {group.estado_cotizacion === 'cotizada' && (
              <Button size="sm" onClick={() => onAccept(group)}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aceptar esta opción
              </Button>
            )}
            {group.estado_reservar === 'confirmada' && (
              <Button size="sm" variant="secondary" onClick={() => onRequestCancellation(group)}>
                <XCircle className="h-3 w-3 mr-1" />
                Solicitar cancelación
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
