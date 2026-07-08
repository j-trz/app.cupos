import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Trophy, TrendingUp, RefreshCw } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { formatDateOnly } from '../lib/dateOnly.js';

const statusLabel = (status) => status || 'Confirmado';

export default function Confirmations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(
    () => [
      {
        label: 'Confirmaciones totales',
        value: data.length,
        icon: CheckCircle2,
        description: 'Reservas ya confirmadas en el sistema.',
      },
      {
        label: 'Últimas confirmaciones',
        value: data.slice(-3).length,
        icon: TrendingUp,
        description: 'Confirmaciones registradas recientemente.',
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
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={6}>
                  Cargando confirmaciones...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={6}>
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
                  <TableCell className="text-center">{formatDate(item.Vuelo_Salida)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="success">{statusLabel(item.Estado)}</Badge>
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
