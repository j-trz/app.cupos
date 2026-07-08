import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ClipboardList, Clock3, RefreshCw, FileText, XCircle, MapPin, X, Backpack, ShoppingBag, Luggage } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { formatDateOnly } from '../lib/dateOnly.js';
import ItineraryTable from '../components/ItineraryTable.jsx';

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

// Ícono de franquicia de equipaje: verde si incluye, gris y tachado si no.
function BaggageIcon({ icon: Icon, included, label }) {
  const isIncluded = !!included;
  return (
    <span role="img" aria-label={`${label}: ${isIncluded ? 'Incluido' : 'No incluido'}`} className="relative inline-flex h-6 w-6 items-center justify-center">
      <Icon className={clsx('h-4 w-4', isIncluded ? 'text-emerald-600' : 'text-slate-300')} />
      {!isIncluded && <span className="pointer-events-none absolute h-[1.5px] w-5 -rotate-45 rounded-full bg-slate-400" />}
    </span>
  );
}

function BaggageFranchise({ item }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <BaggageIcon icon={Backpack} included={item.CarryOn} label="Carry-on" />
      <BaggageIcon icon={ShoppingBag} included={item.HandBag} label="Handbag" />
      <BaggageIcon icon={Luggage} included={item.CheckedBag} label="Valija despachada" />
    </div>
  );
}

export default function Requests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docModal, setDocModal] = useState(null); // { id, pedido_id }
  const [docValue, setDocValue] = useState('');
  const [docSaving, setDocSaving] = useState(false);
  const [routeModal, setRouteModal] = useState(null); // { codigo_cupo, destino, ruta }

  const stats = useMemo(
    () => [
      {
        label: 'Solicitudes totales',
        value: data.length,
        icon: ClipboardList,
        description: 'Todas las solicitudes registradas en el sistema.',
      },
      {
        label: 'Pendientes',
        value: data.filter((item) => item.Estado?.toLowerCase().includes('solicit')).length,
        icon: Clock3,
        description: 'Solicitudes que siguen en estado pendiente.',
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
          <Button
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((item) => (
          <StatCard
            key={item.label}
            icon={item.icon}
            label={item.label}
            value={item.value}
            description={item.description}
          />
        ))}
      </div>

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
              <TableHead className="text-center">Doc. Contable</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={13}>
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={13}>
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
