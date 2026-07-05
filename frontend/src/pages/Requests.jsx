import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock3 } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
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
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Solicitudes actualizadas correctamente' });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes"
        description="Visualiza rápidamente el estado actual de las solicitudes de reserva."
        icon={ClipboardList}
        action={
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Actualizando...' : 'Refrescar'}
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
              <TableHead>Pedido</TableHead>
              <TableHead>Agencia</TableHead>
              <TableHead>Pasajero</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Estado</TableHead>
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
                  <TableCell>{item.Pedido_ID}</TableCell>
                  <TableCell>{item.Agencia || 'Sin agencia'}</TableCell>
                  <TableCell>{`${item.Nombre_Pasajero || '-'} ${item.Apellido_Pasajero || ''}`.trim()}</TableCell>
                  <TableCell>{item.Vuelo_Destino || '—'}</TableCell>
                  <TableCell>{item.Vuelo_Salida || '—'}</TableCell>
                  <TableCell>
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
