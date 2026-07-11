import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Trophy, TrendingUp, RefreshCw, MapPin, X, XCircle, FileText } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { formatDateOnly } from '../lib/dateOnly.js';
import ItineraryTable from '../components/ItineraryTable.jsx';
import ItineraryPDF from '../components/ItineraryPDF.jsx';
import BaggageFranchise from '../components/BaggageFranchise.jsx';
import Modal from '../components/Modal.jsx';

const statusLabel = (status) => status || 'Confirmado';

const formatMoney = (value) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '—';
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Confirmations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeModal, setRouteModal] = useState(null); // { codigo_cupo, destino, ruta }
  const [pdfModalData, setPdfModalData] = useState(null); // { reservation, passengers, product }
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const stats = useMemo(
    () => [
      {
        label: 'Confirmaciones totales',
        value: data.length,
        icon: CheckCircle2,
        description: 'Reservas ya confirmadas en el sistema.',
        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
      },
      {
        label: 'Últimas confirmaciones',
        value: data.slice(-3).length,
        icon: TrendingUp,
        description: 'Confirmaciones registradas recientemente.',
        color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
      },
    ],
    [data],
  );

  useEffect(() => {
    fetchConfirmations();
  }, []);

  const fetchConfirmations = async () => {
    setLoading(true);
    try {
      const result = await ReservationService.getConfirmations();
      setData(result.data || []);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudieron cargar las confirmaciones' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      ReservationService.refreshCache?.();
      await fetchConfirmations();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Confirmaciones actualizadas correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
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
      Swal.fire({ icon: 'success', title: 'Solicitud enviada', text: 'El administrador revisará el pedido.', timer: 2000, showConfirmButton: false });
      fetchConfirmations();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo enviar la solicitud.' });
    }
  };

  // getConfirmations() trae un solo par nombre/apellido por pedido (no el
  // array completo de pasajeros) — para el itinerario buscamos el detalle
  // completo bajo demanda; si falla, degradamos al único pasajero que ya
  // tenemos en vez de romper.
  const handleShowItinerary = async (item) => {
    setPdfLoadingId(item.id);
    const fallbackPassengers = [{ nombre: item.Nombre_Pasajero, apellido: item.Apellido_Pasajero }];
    try {
      const full = await ReservationService.getReservationById(item.id);
      const passengers = Array.isArray(full?.passengers) && full.passengers.length > 0
        ? full.passengers
        : fallbackPassengers;
      setPdfModalData({
        reservation: { pedido_id: item.Pedido_ID },
        passengers,
        product: { ruta: item.Ruta, destino: item.Vuelo_Destino },
      });
    } catch (error) {
      console.error('Error al obtener el detalle de la reserva para el itinerario:', error);
      setPdfModalData({
        reservation: { pedido_id: item.Pedido_ID },
        passengers: fallbackPassengers,
        product: { ruta: item.Ruta, destino: item.Vuelo_Destino },
      });
    } finally {
      setPdfLoadingId(null);
    }
  };

  const formatDate = formatDateOnly;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Confirmaciones"
        description="Consulta todas las reservas ya confirmadas."
        icon={Trophy}
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

      <StatsHero stats={stats} />

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Reservas confirmadas</h2>
            <p className="text-sm text-slate-500">Revisa los cupos que ya finalizaron el proceso de confirmación.</p>
          </div>
          <span className="text-sm text-slate-500">Actualiza para sincronizar con el backend</span>
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Pedido</TableHead>
              <TableHead className="text-center">Agencia</TableHead>
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
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={13}>
                  Cargando confirmaciones...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={13}>
                  No hay confirmaciones registradas.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center font-medium">{item.Pedido_ID}</TableCell>
                  <TableCell className="text-center">{item.Agencia || '—'}</TableCell>
                  <TableCell className="text-center">{`${item.Nombre_Pasajero || '-'} ${item.Apellido_Pasajero || ''}`.trim()}</TableCell>
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
                    <Badge variant="success">{statusLabel(item.Estado)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRequestCancellation(item)}
                        title="Solicitar cancelación de esta reserva"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Solicitar cancelación
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShowItinerary(item)}
                        disabled={pdfLoadingId === item.id}
                        title="Generar itinerario PDF"
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

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

      {/* Modal Itinerario PDF */}
      <Modal title="Itinerario PDF" open={!!pdfModalData} onClose={() => setPdfModalData(null)} size="3xl">
        {pdfModalData && (
          <ItineraryPDF
            reservation={pdfModalData.reservation}
            passengers={pdfModalData.passengers}
            product={pdfModalData.product}
          />
        )}
      </Modal>
    </div>
  );
}
