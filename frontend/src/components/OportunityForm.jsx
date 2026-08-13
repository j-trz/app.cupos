import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Modal from './Modal.jsx';
import Button from './ui/Button.jsx';
import { Input } from './ui/Input.jsx';
import { Label } from './ui/Label.jsx';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateOpportunity, useCreateOpportunity } from '../hooks/useOpportunities';
import { useTemporadas } from '../hooks/useTemporadas';
import { airlineNames } from '../lib/data/airlineNames.js';

// Nombres únicos del diccionario de aerolíneas (mismo que usa ItineraryTable)
// para autocompletar Compañía sin forzar un valor exacto — sigue siendo texto
// libre por si la aerolínea no está en el diccionario.
const AIRLINE_NAME_OPTIONS = [...new Set(Object.values(airlineNames))].sort();

const ESTADO_AEROLINEA_OPTIONS = ['Cotizado', 'Rechazado por la aerolínea', 'Confirmado', 'Vencido'];
const MOTIVO_RECHAZO_OPTIONS = ['Tarifa alta', 'Fechas incorrectas', 'Exceso de oferta', 'Vencido'];
const RECHAZADO = 'Rechazado por la aerolínea';

const emptyForm = {
  destino: '',
  compania: '',
  temporada: '',
  validez: '',
  fecha_salida: '',
  fecha_llegada: '',
  total_lugares: '0',
  total_liberados: '0',
  neto_1: '',
  neto_2: '',
  estado_interno: '',
  motivo_rechazo: '',
  estado: 'pendiente',
};

// Formulario controlado simple, mismo patrón que el resto de los modales de
// alta/edición de la app (ver GestionTemporadas.jsx).
export const OportunityForm = ({ isOpen, onClose, initialData = null, onSuccess = () => {} }) => {
  const { can } = useAuth();
  const isAdmin = can('USERS_VIEW');
  const isEditing = !!initialData;

  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity();
  const { data: temporadas = [] } = useTemporadas();

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...emptyForm, ...initialData } : emptyForm);
    }
  }, [isOpen, initialData]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const promptMotivoRechazo = async (currentValue) => {
    const { value } = await Swal.fire({
      icon: 'question',
      title: 'Motivo de rechazo',
      input: 'select',
      inputValue: currentValue || '',
      inputOptions: Object.fromEntries(MOTIVO_RECHAZO_OPTIONS.map((o) => [o, o])),
      inputPlaceholder: 'Elegí un motivo',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });
    if (value) setField('motivo_rechazo', value);
  };

  const handleEstadoInternoChange = (value) => {
    setField('estado_interno', value);
    if (value === RECHAZADO) {
      promptMotivoRechazo(form.motivo_rechazo);
    } else {
      setField('motivo_rechazo', '');
    }
  };

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destino.trim() || !form.compania.trim() || !form.fecha_salida) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Destino, compañía y fecha de salida son requeridos.' });
      return;
    }
    const payload = {
      ...form,
      total_lugares: Number(form.total_lugares) || 0,
      total_liberados: Number(form.total_liberados) || 0,
      neto_1: form.neto_1 === '' ? undefined : Number(form.neto_1),
      neto_2: form.neto_2 === '' ? undefined : Number(form.neto_2),
    };
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      Swal.fire({ icon: 'success', title: isEditing ? 'Actualizada' : 'Creada', timer: 1500, showConfirmButton: false });
      handleClose();
      onSuccess();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo guardar la oportunidad.' });
    }
  };

  return (
    <Modal title={isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'} open={isOpen} onClose={handleClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="destino">Destino *</Label>
            <Input id="destino" placeholder="Ej: Miami, Nueva York" value={form.destino} onChange={(e) => setField('destino', e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="compania">Compañía *</Label>
            <Input
              id="compania"
              list="compania-datalist"
              placeholder="Ej: American Airlines, Latam"
              value={form.compania}
              onChange={(e) => setField('compania', e.target.value)}
              required
            />
            <datalist id="compania-datalist">
              {AIRLINE_NAME_OPTIONS.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="temporada">Temporada</Label>
            <select
              id="temporada"
              value={form.temporada}
              onChange={(e) => setField('temporada', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Sin especificar</option>
              {temporadas.filter((t) => t.activa || t.nombre === form.temporada).map((t) => (
                <option key={t.id} value={t.nombre}>{t.nombre}</option>
              ))}
              {/* Si la oportunidad ya tenía un valor viejo (texto libre) que ni
                  siquiera está en Gestión de Temporadas, se muestra igual para
                  no perderlo. */}
              {form.temporada && !temporadas.some((t) => t.nombre === form.temporada) && (
                <option value={form.temporada}>{form.temporada}</option>
              )}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="validez">Validez</Label>
            <Input id="validez" type="date" value={form.validez} onChange={(e) => setField('validez', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="fecha_salida">Fecha de Salida *</Label>
            <Input id="fecha_salida" type="date" value={form.fecha_salida} onChange={(e) => setField('fecha_salida', e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fecha_llegada">Fecha de Llegada</Label>
            <Input id="fecha_llegada" type="date" value={form.fecha_llegada} onChange={(e) => setField('fecha_llegada', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="total_lugares">Total de Lugares *</Label>
            <Input id="total_lugares" type="number" min="0" value={form.total_lugares} onChange={(e) => setField('total_lugares', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="total_liberados">Total Liberados</Label>
            <Input id="total_liberados" type="number" min="0" value={form.total_liberados} onChange={(e) => setField('total_liberados', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="neto_1">Neto 1</Label>
            <Input id="neto_1" type="number" step="0.01" placeholder="Ej: 350.50" value={form.neto_1} onChange={(e) => setField('neto_1', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="neto_2">Neto 2</Label>
            <Input id="neto_2" type="number" step="0.01" placeholder="Ej: 400.00" value={form.neto_2} onChange={(e) => setField('neto_2', e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="estado_interno">Estado Aerolínea</Label>
          <select
            id="estado_interno"
            value={form.estado_interno}
            onChange={(e) => handleEstadoInternoChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">Sin especificar</option>
            {ESTADO_AEROLINEA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {form.estado_interno === RECHAZADO && (
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
              <span>Motivo: {form.motivo_rechazo || 'sin especificar'}</span>
              <button type="button" className="text-slate-700 underline hover:text-slate-900" onClick={() => promptMotivoRechazo(form.motivo_rechazo)}>
                Cambiar motivo
              </button>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={form.estado}
                onChange={(e) => setField('estado', e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEditing ? 'Actualizar' : 'Crear'} Oportunidad
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OportunityForm;
