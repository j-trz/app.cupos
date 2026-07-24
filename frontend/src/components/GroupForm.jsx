import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { toDateOnlyString } from '../lib/dateOnly.js';
import { useUsers } from '../hooks/useUsers';
import GroupOptionsFields from './GroupOptionsFields.jsx';

const EMPTY_FORM = {
  vendedor: '',
  cantidad_lugares: '',
  notas_vendedor: '',
  itinerario: '',
  ficha: '',
  destino: '',
  compania: '',
  condiciones: '',
  id_aerolinea: '',
  cantidad_liberados: '',
  salida: '',
  regreso: '',
  pnr_airline: '',
  pnr_agency: '',
  neto_01: '',
  neto_liberado: '',
  vencimiento_pago: '',
  nomination_date: '',
  vencimiento_cotizacion: '',
  fecha_emision: '',
  fecha_gastos: '',
  notas_internas: '',
  notas_externas: '',
};

function toFormValues(group) {
  if (!group) return EMPTY_FORM;
  const fmt = toDateOnlyString;
  return {
    vendedor: group.vendedor || '',
    cantidad_lugares: group.cantidad_lugares ?? '',
    notas_vendedor: group.notas_vendedor || '',
    itinerario: group.itinerario || '',
    ficha: group.ficha || '',
    destino: group.destino || '',
    compania: group.compania || '',
    condiciones: group.condiciones || '',
    id_aerolinea: group.id_aerolinea || '',
    cantidad_liberados: group.cantidad_liberados ?? '',
    salida: fmt(group.salida),
    regreso: fmt(group.regreso),
    pnr_airline: group.pnr_airline || '',
    pnr_agency: group.pnr_agency || '',
    neto_01: group.neto_01 ?? '',
    neto_liberado: group.neto_liberado ?? '',
    vencimiento_pago: fmt(group.vencimiento_pago),
    nomination_date: fmt(group.nomination_date),
    vencimiento_cotizacion: fmt(group.vencimiento_cotizacion),
    fecha_emision: fmt(group.fecha_emision),
    fecha_gastos: fmt(group.fecha_gastos),
    notas_internas: group.notas_internas || '',
    notas_externas: group.notas_externas || '',
  };
}

const GroupForm = ({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues = {},
  isEditing = false,
}) => {
  const [form, setForm] = useState(() => toFormValues(isEditing ? defaultValues : null));
  const [options, setOptions] = useState([{ itinerario: '', notas: '' }]);
  const [errors, setErrors] = useState({});
  const { data: usersData } = useUsers();
  const users = usersData?.data || [];

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  const validate = () => {
    const e = {};
    if (!isEditing) {
      if (!form.vendedor) e.vendedor = 'Requerido';
      if (!form.cantidad_lugares || Number(form.cantidad_lugares) <= 0) e.cantidad_lugares = 'Número requerido';
      if (options.some((opt) => !opt.itinerario.trim())) e.opciones = 'Cada opción necesita su itinerario';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
    const base = {
      ficha: form.ficha,
      destino: form.destino,
      compania: form.compania,
      condiciones: form.condiciones,
      id_aerolinea: form.id_aerolinea,
      cantidad_liberados: num(form.cantidad_liberados),
      salida: form.salida || null,
      regreso: form.regreso || null,
      pnr_airline: form.pnr_airline,
      pnr_agency: form.pnr_agency,
      neto_01: num(form.neto_01),
      neto_liberado: num(form.neto_liberado),
      vencimiento_pago: form.vencimiento_pago || null,
      nomination_date: form.nomination_date || null,
      vencimiento_cotizacion: form.vencimiento_cotizacion || null,
      fecha_emision: form.fecha_emision || null,
      fecha_gastos: form.fecha_gastos || null,
      notas_internas: form.notas_internas,
      notas_externas: form.notas_externas,
    };

    if (isEditing) {
      onSubmit({ ...base, itinerario: form.itinerario, notas_vendedor: form.notas_vendedor, cantidad_lugares: num(form.cantidad_lugares) });
      return;
    }

    const selectedUser = users.find((u) => u.id === form.vendedor);
    onSubmit({
      ...base,
      vendedor: form.vendedor,
      agency: selectedUser?.agencia || '',
      cantidad_lugares: num(form.cantidad_lugares),
      notas_vendedor: form.notas_vendedor,
      opciones: options.map((opt) => ({ itinerario: opt.itinerario, notas: opt.notas })),
    });
  };

  const field = (id, label, type = 'text', opts = {}) => (
    <div className={`space-y-1 ${opts.className || ''}`}>
      <Label htmlFor={id}>{label}{opts.required ? ' *' : ''}</Label>
      <Input
        id={id}
        type={type}
        value={form[id]}
        onChange={(ev) => set(id, ev.target.value)}
        placeholder={opts.placeholder}
        step={opts.step}
        min={opts.min}
        className={errors[id] ? 'border-red-500' : ''}
      />
      {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

  const sectionLabel = (text) => (
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{text}</h4>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <p className="mb-5 text-sm text-slate-500">
        {isEditing ? 'Completá o corregí los datos de esta cotización de grupo.' : 'Cargá un grupo nuevo y elegí a qué usuario le llega la cotización.'}
      </p>

      <div className="space-y-6">
        {!isEditing && (
          <div>
            {sectionLabel('Destinatario de la cotización')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="vendedor">Usuario *</Label>
                <select
                  id="vendedor"
                  value={form.vendedor}
                  onChange={(e) => set('vendedor', e.target.value)}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.vendedor ? 'border-red-500' : 'border-input'}`}
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.agencia || 'sin agencia'}</option>
                  ))}
                </select>
                {errors.vendedor && <p className="text-xs text-red-500">{errors.vendedor}</p>}
                <p className="text-xs text-slate-400">Solo este usuario va a poder ver y aceptar esta cotización.</p>
              </div>
              {field('cantidad_lugares', 'Cantidad de lugares', 'number', { required: true, min: '1' })}
            </div>
          </div>
        )}

        {!isEditing && (
          <div>
            {sectionLabel('Opciones de itinerario')}
            <GroupOptionsFields options={options} onChange={setOptions} />
            {errors.opciones && <p className="mt-1 text-xs text-red-500">{errors.opciones}</p>}
          </div>
        )}

        {isEditing && (
          <div>
            {sectionLabel('Itinerario y lugares')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="itinerario">Itinerario</Label>
                <Textarea id="itinerario" value={form.itinerario} onChange={(e) => set('itinerario', e.target.value)} rows={4} />
              </div>
              {field('cantidad_lugares', 'Cantidad de lugares', 'number', { min: '1' })}
              {field('cantidad_liberados', 'Cantidad liberados', 'number', { min: '0' })}
            </div>
          </div>
        )}

        <div>
          {sectionLabel('Datos del grupo')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {field('destino', 'Destino')}
            {field('compania', 'Compañía')}
            {field('id_aerolinea', 'ID Aerolínea')}
            {field('ficha', 'Ficha')}
            {field('pnr_airline', 'PNR Aerolínea')}
            {field('pnr_agency', 'PNR Agencia')}
          </div>
        </div>

        <div>
          {sectionLabel('Fechas de vuelo')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {field('salida', 'Salida', 'date')}
            {field('regreso', 'Regreso', 'date')}
          </div>
        </div>

        <div>
          {sectionLabel('Condiciones económicas')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {field('neto_01', 'Neto 01', 'number', { step: '0.01', min: '0' })}
            {field('neto_liberado', 'Neto liberado', 'number', { step: '0.01', min: '0' })}
          </div>
          <div className="mt-4 space-y-1">
            <Label htmlFor="condiciones">Condiciones</Label>
            <Textarea id="condiciones" value={form.condiciones} onChange={(e) => set('condiciones', e.target.value)} rows={3} />
          </div>
        </div>

        <div>
          {sectionLabel('Vencimientos y fechas operativas')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {field('vencimiento_cotizacion', 'Vencimiento cotización', 'date')}
            {field('vencimiento_pago', 'Vencimiento de pago', 'date')}
            {field('nomination_date', 'Fecha de nominación', 'date')}
            {field('fecha_emision', 'Fecha de emisión', 'date')}
            {field('fecha_gastos', 'Fecha entrada en gastos', 'date')}
          </div>
        </div>

        <div>
          {sectionLabel('Notas')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isEditing ? null : (
              <div className="space-y-1">
                <Label htmlFor="notas_vendedor">Notas del vendedor</Label>
                <Textarea id="notas_vendedor" value={form.notas_vendedor} onChange={(e) => set('notas_vendedor', e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="notas_externas">Notas externas</Label>
              <Textarea id="notas_externas" value={form.notas_externas} onChange={(e) => set('notas_externas', e.target.value)} placeholder="Visibles para el usuario" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notas_internas">Notas internas</Label>
              <Textarea id="notas_internas" value={form.notas_internas} onChange={(e) => set('notas_internas', e.target.value)} placeholder="Solo para el admin" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};

export default GroupForm;
