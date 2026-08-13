import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/shadcn-dialog';
import { ShadcnButton as Button } from './ui/shadcn-button';
import { ShadcnInput as Input } from './ui/shadcn-input';
import { Label } from './ui/shadcn-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/shadcn-select';
import { useAuth } from '../contexts/AuthContext';
import { opportunitySchema } from '../schemas/opportunitySchema';
import { useUpdateOpportunity, useCreateOpportunity } from '../hooks/useOpportunities';

export const OportunityForm = ({ isOpen, onClose, initialData = null, onSuccess = () => {} }) => {
  const { can } = useAuth();
  const isAdmin = can('USERS_VIEW');
  const isEditing = !!initialData;
  
  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: initialData || {
      destino: '',
      compania: '',
      fecha_salida: '',
      total_lugares: 0,
      total_liberados: 0,
      estado: 'pendiente',
    },
  });

  const estado = watch('estado');

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: initialData.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      reset();
      onClose();
      onSuccess();
    } catch (err) {
      console.error('Error guardando oportunidad:', err);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Destino y Compañía */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="destino">Destino *</Label>
              <Input
                id="destino"
                placeholder="Ej: Miami, Nueva York"
                {...register('destino')}
              />
              {errors.destino && <span className="text-red-500 text-sm">{errors.destino.message}</span>}
            </div>
            <div>
              <Label htmlFor="compania">Compañía *</Label>
              <Input
                id="compania"
                placeholder="Ej: American Airlines, Latam"
                {...register('compania')}
              />
              {errors.compania && <span className="text-red-500 text-sm">{errors.compania.message}</span>}
            </div>
          </div>

          {/* Temporada y Validez */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="temporada">Temporada</Label>
              <Input
                id="temporada"
                placeholder="Ej: Verano 2025"
                {...register('temporada')}
              />
            </div>
            <div>
              <Label htmlFor="validez">Validez</Label>
              <Input
                id="validez"
                type="date"
                {...register('validez')}
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha_salida">Fecha de Salida *</Label>
              <Input
                id="fecha_salida"
                type="date"
                {...register('fecha_salida')}
              />
              {errors.fecha_salida && <span className="text-red-500 text-sm">{errors.fecha_salida.message}</span>}
            </div>
            <div>
              <Label htmlFor="fecha_llegada">Fecha de Llegada</Label>
              <Input
                id="fecha_llegada"
                type="date"
                {...register('fecha_llegada')}
              />
            </div>
          </div>

          {/* Lugares */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_lugares">Total de Lugares *</Label>
              <Input
                id="total_lugares"
                type="number"
                min="0"
                {...register('total_lugares')}
              />
              {errors.total_lugares && <span className="text-red-500 text-sm">{errors.total_lugares.message}</span>}
            </div>
            <div>
              <Label htmlFor="total_liberados">Total Liberados</Label>
              <Input
                id="total_liberados"
                type="number"
                min="0"
                {...register('total_liberados')}
              />
            </div>
          </div>

          {/* Netos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="neto_1">Neto 1</Label>
              <Input
                id="neto_1"
                type="number"
                step="0.01"
                placeholder="Ej: 350.50"
                {...register('neto_1')}
              />
            </div>
            <div>
              <Label htmlFor="neto_2">Neto 2</Label>
              <Input
                id="neto_2"
                type="number"
                step="0.01"
                placeholder="Ej: 400.00"
                {...register('neto_2')}
              />
            </div>
          </div>

          {/* Estado Interno */}
          <div>
            <Label htmlFor="estado_interno">Estado Interno</Label>
            <Input
              id="estado_interno"
              placeholder="Ej: En análisis, Pendiente aprobación"
              {...register('estado_interno')}
            />
          </div>

          {/* Admin-only: Estado y Usuario Autorizador */}
          {isAdmin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">Estado (Admin)</Label>
                  <Select value={estado} onValueChange={(val) => setValue('estado', val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobada">Aprobada</SelectItem>
                      <SelectItem value="rechazada">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? 'Actualizar' : 'Crear'} Oportunidad
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
