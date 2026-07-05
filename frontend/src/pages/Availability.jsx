import { useEffect, useState } from 'react';
import { Plane, BarChart3, Clock3 } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

export default function Availability() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const result = await ReservationService.getAvailability();
      setData(result.data);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo cargar disponibilidad' });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      ReservationService.refreshCache?.();
      await fetchAvailability();
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Disponibilidad actualizada correctamente' });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const getAvailabilityVariant = (value) => {
    if (value > 5) return 'success';
    if (value > 0) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disponibilidad"
        description="Busca cupos disponibles por destino y compañía, con estado claro y refresco rápido."
        icon={Plane}
        action={
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Actualizando...' : 'Refrescar datos'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BarChart3}
          label="Total de cupos"
          value={data.length}
          description="Cantidad total de cupos cargados en el sistema."
        />
        <StatCard
          icon={Clock3}
          label="Cupos agotados"
          value={data.filter((item) => Number(item.disponibilidad) <= 0).length}
          description="Cupos sin disponibilidad restante."
        />
        <StatCard
          icon={Plane}
          label="Cupos disponibles"
          value={data.filter((item) => Number(item.disponibilidad) > 0).length}
          description="Cupos listos para una nueva reserva."
        />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Listado de cupos</h2>
            <p className="text-sm text-slate-500">Revisa los valores de salida, regreso y la disponibilidad actual.</p>
          </div>
          <span className="text-sm text-slate-500">Última actualización automática al ingresar</span>
        </div>

        <Table className="p-6">
          <table className="min-w-full border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead>Cupo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Compañía</TableHead>
                <TableHead>Disponibilidad</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Regreso</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={7}>
                    Cargando disponibilidad...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-10" colSpan={7}>
                    No hay cupos disponibles.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.codigo_cupo}</TableCell>
                    <TableCell>{item.destino}</TableCell>
                    <TableCell>{item.compania}</TableCell>
                    <TableCell>
                      <Badge variant={getAvailabilityVariant(Number(item.disponibilidad))}>
                        {item.disponibilidad}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.fecha_salida || '—'}</TableCell>
                    <TableCell>{item.fecha_regreso || '—'}</TableCell>
                    <TableCell>{item.precio ? `$${item.precio}` : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </Table>
      </Card>
    </div>
  );
}
