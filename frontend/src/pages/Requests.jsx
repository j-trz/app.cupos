import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock3, RefreshCw, FileText, XCircle } from 'lucide-react';
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

const statusVariant = (status) => {
  if (!status) return 'default';
  const normalized = status.toLowerCase();
  if (normalized.includes('confirm')) return 'success';
  if (normalized.includes('pend')) return 'warning';
  return 'default';
};

export default function Requests() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docModal, setDocModal] = useState(null); // { id, pedido_id }
  const [docValue, setDocValue] = useState('');
  const [docSaving, setDocSaving] = useState(false);

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

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Doc. Contable</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={7}>
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={7}>
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
                  <TableCell className="text-center">{formatDate(item.Vuelo_Salida)}</TableCell>
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
    </div>
  );
}
