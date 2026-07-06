import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock3, RefreshCw } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
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
              <TableHead className="text-center">Agencia</TableHead>
              <TableHead className="text-center">Pasajero</TableHead>
              <TableHead className="text-center">Destino</TableHead>
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={6}>
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={6}>
                  No hay solicitudes registradas.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center font-medium">{item.Pedido_ID}</TableCell>
                  <TableCell className="text-center">{item.Agencia || 'Sin agencia'}</TableCell>
                  <TableCell className="text-center">{`${item.Nombre_Pasajero || '-'} ${item.Apellido_Pasajero || ''}`.trim()}</TableCell>
                  <TableCell className="text-center">{item.Vuelo_Destino || '—'}</TableCell>
                  <TableCell className="text-center">{formatDate(item.Vuelo_Salida)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusVariant(item.Estado)}>{item.Estado || 'Desconocido'}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>
    </div>
  );
}
