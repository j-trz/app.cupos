import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { toDateOnlyString } from '../lib/dateOnly.js';
import { useAgencies } from '../hooks/useAgencies';
import { useTemporadas } from '../hooks/useTemporadas';

// Tipos de producto soportados. El campo "ruta" se relabela según el tipo
// (Cabina para Crucero, Habitación para Hotel) — la lógica de negocio
// específica por tipo (tarifas por categoría, noches de estadía, etc.) se
// suma en una siguiente iteración; por ahora es solo estructura + etiquetas.
const TIPOS_PRODUCTO = [
  { value: 'Aereo', label: 'Aéreo' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Crucero', label: 'Crucero' },
];

const SERVICIO_OPTIONS = ['Cupo', 'Charter'];

// Los 3 tipos de pasajero tienen tarifa/impuestos independientes — la Venta
// de cada uno se calcula (Tarifa+Impuestos+OP) y la termina fijando el
// backend en Precio/ChdFare/InfFare (ver applyCalculatedPrices en
// product_handler.go); acá solo se previsualiza en vivo mientras se edita.
const PASSENGER_PRICE_TYPES = [
  { key: 'adt', label: 'ADT' },
  { key: 'chd', label: 'CHD' },
  { key: 'inf', label: 'INF' },
];

const RUTA_LABEL_BY_TIPO = {
  Hotel: 'Habitación',
  Crucero: 'Cabina',
  Aereo: 'Ruta',
};

const EMPTY_FORM = {
  codigo_cupo: '',
  agencia: '',
  destino: '',
  compania: '',
  disponibilidad: '',
  cupo: '',
  fecha_salida: '',
  fecha_regreso: '',
  tarifa_adt: '',
  impuestos_adt: '',
  tarifa_chd: '',
  impuestos_chd: '',
  tarifa_inf: '',
  impuestos_inf: '',
  neto_1: '',
  op_adt: '',
  op_chd: '',
  op_inf: '',
  ruta: '',
  pnr: '',
  ficha: '',
  temporada: '',
  tipo_producto: 'Aereo',
  servicio: '',
  bloqueo_temporal_minutos: '',
  carryon: false,
  handbag: false,
  checkedbag: false,
  carryon_kg: '',
  handbag_kg: '',
  checkedbag_kg: '',
  package_links: [],
  is_blocked_for_sale: false,
  notas_internas: '',
  notas_externas: '',
  vencimiento_pago: '',
  nomination_date: '',
  fecha_emision: '',
  fecha_gastos: '',
};

function toFormValues(product) {
  if (!product) return EMPTY_FORM;
  const fmt = toDateOnlyString;
  return {
    codigo_cupo: product.codigo_cupo || '',
    agencia: product.agencia || '',
    destino: product.destino || '',
    compania: product.compania || '',
    disponibilidad: product.disponibilidad ?? '',
    cupo: product.cupo ?? '',
    fecha_salida: fmt(product.fecha_salida),
    fecha_regreso: fmt(product.fecha_regreso),
    tarifa_adt: product.tarifa_adt ?? '',
    impuestos_adt: product.impuestos_adt ?? '',
    tarifa_chd: product.tarifa_chd ?? '',
    impuestos_chd: product.impuestos_chd ?? '',
    tarifa_inf: product.tarifa_inf ?? '',
    impuestos_inf: product.impuestos_inf ?? '',
    neto_1: product.neto_1 ?? '',
    op_adt: product.op_adt ?? '',
    op_chd: product.op_chd ?? '',
    op_inf: product.op_inf ?? '',
    ruta: product.ruta || '',
    pnr: product.pnr || '',
    ficha: product.ficha || '',
    temporada: product.temporada || '',
    tipo_producto: product.tipo_producto || 'Aereo',
    servicio: product.servicio || '',
    bloqueo_temporal_minutos: product.bloqueo_temporal_minutos ?? '',
    carryon: product.carryon ?? false,
    handbag: product.handbag ?? false,
    checkedbag: product.checkedbag ?? false,
    carryon_kg: product.carryon_kg ?? '',
    handbag_kg: product.handbag_kg ?? '',
    checkedbag_kg: product.checkedbag_kg ?? '',
    package_links: Array.isArray(product.package_links) ? product.package_links : [],
    is_blocked_for_sale: product.is_blocked_for_sale ?? false,
    notas_internas: product.notas_internas || '',
    notas_externas: product.notas_externas || '',
    vencimiento_pago: fmt(product.vencimiento_pago),
    nomination_date: fmt(product.nomination_date),
    fecha_emision: fmt(product.fecha_emision),
    fecha_gastos: fmt(product.fecha_gastos),
  };
}

function toPayload(form) {
  const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
  return {
    codigo_cupo: form.codigo_cupo,
    agencia: form.agencia,
    destino: form.destino,
    compania: form.compania,
    disponibilidad: num(form.disponibilidad),
    cupo: num(form.cupo),
    fecha_salida: form.fecha_salida || null,
    fecha_regreso: form.fecha_regreso || null,
    tarifa_adt: num(form.tarifa_adt),
    impuestos_adt: num(form.impuestos_adt),
    tarifa_chd: num(form.tarifa_chd),
    impuestos_chd: num(form.impuestos_chd),
    tarifa_inf: num(form.tarifa_inf),
    impuestos_inf: num(form.impuestos_inf),
    neto_1: num(form.neto_1),
    op_adt: num(form.op_adt),
    op_chd: num(form.op_chd),
    op_inf: num(form.op_inf),
    ruta: form.ruta,
    pnr: form.pnr,
    ficha: form.ficha,
    temporada: form.temporada,
    tipo_producto: form.tipo_producto,
    servicio: form.servicio,
    bloqueo_temporal_minutos: num(form.bloqueo_temporal_minutos),
    carryon: form.carryon,
    handbag: form.handbag,
    checkedbag: form.checkedbag,
    carryon_kg: num(form.carryon_kg),
    handbag_kg: num(form.handbag_kg),
    checkedbag_kg: num(form.checkedbag_kg),
    // Se descartan los links sin URL (filas vacías que quedaron del editor).
    package_links: (form.package_links || []).filter((l) => l.url?.trim()),
    is_blocked_for_sale: form.is_blocked_for_sale,
    notas_internas: form.notas_internas,
    notas_externas: form.notas_externas,
    vencimiento_pago: form.vencimiento_pago || null,
    nomination_date: form.nomination_date || null,
    fecha_emision: form.fecha_emision || null,
    fecha_gastos: form.fecha_gastos || null,
  };
}

const ProductForm = ({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues = {},
  isEditing = false,
}) => {
  const [form, setForm] = useState(() => toFormValues(isEditing ? defaultValues : null));
  const [errors, setErrors] = useState({});
  const { data: agencies = [] } = useAgencies();
  const { data: temporadas = [] } = useTemporadas();

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  const validate = () => {
    const e = {};
    if (!form.agencia) e.agencia = 'Requerido';
    if (!form.destino.trim()) e.destino = 'Requerido';
    if (!form.compania.trim()) e.compania = 'Requerido';
    if (form.disponibilidad === '' || isNaN(Number(form.disponibilidad))) e.disponibilidad = 'Número requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(toPayload(form));
  };

  const field = (id, label, type = 'text', opts = {}) => (
    <div className={`space-y-1 ${opts.className || ''}`}>
      <Label htmlFor={id}>{label}{opts.required ? ' *' : ''}</Label>
      <Input
        id={id}
        type={type}
        value={form[id]}
        onChange={(ev) => set(id, type === 'number' ? ev.target.value : ev.target.value)}
        placeholder={opts.placeholder}
        step={opts.step}
        min={opts.min}
        className={errors[id] ? 'border-red-500' : ''}
      />
      {errors[id] ? <p className="text-xs text-red-500">{errors[id]}</p> : opts.help ? <p className="text-xs text-slate-400">{opts.help}</p> : null}
    </div>
  );

  const rutaLabel = RUTA_LABEL_BY_TIPO[form.tipo_producto] || 'Ruta';

  const check = (id, label) => (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        id={id}
        checked={form[id]}
        onChange={(e) => set(id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      <span className="text-sm">{label}</span>
    </label>
  );

  const addPackageLink = () => {
    setForm((prev) => ({ ...prev, package_links: [...(prev.package_links || []), { url: '', label: '' }] }));
  };
  const updatePackageLink = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      package_links: prev.package_links.map((l, i) => (i === index ? { ...l, [key]: value } : l)),
    }));
  };
  const removePackageLink = (index) => {
    setForm((prev) => ({ ...prev, package_links: prev.package_links.filter((_, i) => i !== index) }));
  };

  const sectionLabel = (text) => (
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{text}</h4>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <p className="mb-5 text-sm text-slate-500">
        {isEditing ? 'Actualizá la información del cupo.' : 'Cargá un nuevo cupo al catálogo.'}
      </p>

      <div className="space-y-6">

        {/* Identificación */}
        <div>
          {sectionLabel('Identificación')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {isEditing ? (
              <div className="space-y-1">
                <Label htmlFor="codigo_cupo">Código de Cupo</Label>
                <Input id="codigo_cupo" type="text" value={form.codigo_cupo} disabled className="bg-slate-50 text-slate-500" />
                <p className="text-xs text-slate-400">Formato: fecha de salida-destino-id_tipo-aerolínea (ej. 20/09/26-REC-431123_CH-AD). CH = Charter, CP = Cupo.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Código de Cupo</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-dashed border-input bg-slate-50 px-3 text-sm text-slate-400">
                  Se genera automáticamente
                </div>
                <p className="text-xs text-slate-400">Formato: fecha de salida-destino-id_tipo-aerolínea (ej. 20/09/26-REC-431123_CH-AD). CH = Charter, CP = Cupo.</p>
              </div>
            )}
            <div className="space-y-1 col-span-2">
              <Label htmlFor="agencia">Agencia Dueña *</Label>
              <select
                id="agencia"
                value={form.agencia}
                onChange={(e) => set('agencia', e.target.value)}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.agencia ? 'border-red-500' : 'border-input'}`}
              >
                <option value="">Seleccionar agencia...</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.code}>{a.name}</option>
                ))}
              </select>
              {errors.agencia && <p className="text-xs text-red-500">{errors.agencia}</p>}
              <p className="text-xs text-slate-400">Solo esta agencia (y el admin) va a ver este cupo, salvo que lo cedas a otra.</p>
            </div>
            {field('destino', 'Destino', 'text', { required: true })}
            {field('compania', 'Compañía', 'text', { required: true })}
            <div className="space-y-1">
              <Label htmlFor="tipo_producto">Tipo de Producto *</Label>
              <select
                id="tipo_producto"
                value={form.tipo_producto}
                onChange={(e) => set('tipo_producto', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TIPOS_PRODUCTO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Fechas y cupo */}
        <div>
          {sectionLabel('Fechas y cupo')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {field('fecha_salida', 'Fecha de Salida', 'date')}
            {field('fecha_regreso', 'Fecha de Regreso', 'date')}
            {field('disponibilidad', 'Disponibilidad', 'number', { required: true, min: '0' })}
            {field('cupo', 'Cupo Total', 'number', { min: '0' })}
            {field('bloqueo_temporal_minutos', 'Bloqueo (min)', 'number', { min: '0', placeholder: '60', help: 'Minutos que el cupo queda bloqueado si se reserva sin doc. contable. Vacío = usa el valor global del sistema.' })}
          </div>
        </div>

        {/* Vencimientos operativos */}
        <div>
          {sectionLabel('Vencimientos operativos')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {field('vencimiento_pago', 'Vencimiento de pago', 'date')}
            {field('nomination_date', 'Fecha de nominación', 'date')}
            {field('fecha_emision', 'Fecha de emisión', 'date')}
            {field('fecha_gastos', 'Fecha entrada en gastos', 'date')}
          </div>
        </div>

        {/* Precios */}
        <div>
          {sectionLabel('Precios')}
          <div className="space-y-3">
            {PASSENGER_PRICE_TYPES.map(({ key, label }) => {
              const tarifa = Number(form[`tarifa_${key}`]) || 0;
              const impuestos = Number(form[`impuestos_${key}`]) || 0;
              const neto1 = tarifa + impuestos;
              const op = Number(form[`op_${key}`]) || 0;
              const venta = neto1 + op;
              return (
                <div key={key} className="grid grid-cols-2 gap-4 items-end lg:grid-cols-4">
                  {field(`tarifa_${key}`, `Tarifa ${label}`, 'number', { step: '0.01', min: '0' })}
                  {field(`impuestos_${key}`, `Impuestos ${label}`, 'number', { step: '0.01', min: '0' })}
                  {field(`op_${key}`, `OP ${label}`, 'number', { step: '0.01', min: '0' })}
                  <div className="space-y-1">
                    <Label>Venta {label}</Label>
                    <div className="flex h-10 w-full items-center rounded-md border border-dashed border-input bg-slate-50 px-3 text-sm font-medium text-slate-700" title={`Neto 1 ${label}: $${neto1.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                      ${venta.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5 pt-2 border-t border-slate-200">
              {field('neto_1', 'Neto 1 (Riesgo)', 'number', { step: '0.01', min: '0', help: 'Valor manual aparte, usado solo para "Riesgo" en reportes. El Neto 1 real de cada pasajero (Tarifa+Impuestos de su tipo) se calcula solo arriba.' })}
            </div>
          </div>
        </div>

        {/* Clasificación */}
        <div>
          {sectionLabel('Clasificación')}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            {field('ruta', rutaLabel, 'text', form.tipo_producto === 'Aereo' ? {
              placeholder: 'Ej: 1JA 763 31DEC MVDGIG 1432 1715',
              help: 'Un segmento de vuelo por línea (formato GDS): N° de segmento, aerolínea + N° de vuelo, fecha, aeropuertos origen+destino pegados, hora de salida y hora de llegada.',
              className: 'col-span-2',
            } : {})}
            {field('pnr', 'PNR')}
            {field('ficha', 'Ficha Operativa')}
            <div className="space-y-1">
              <Label htmlFor="temporada">Temporada</Label>
              <select
                id="temporada"
                value={form.temporada}
                onChange={(e) => set('temporada', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin especificar</option>
                {temporadas.filter((t) => t.activa || t.nombre === form.temporada).map((t) => (
                  <option key={t.id} value={t.nombre}>{t.nombre}</option>
                ))}
                {/* Si el producto ya tenía un valor viejo (texto libre, de antes de
                    que esto fuera un desplegable) que ni siquiera está en la lista
                    de Gestión de Temporadas, se muestra igual para no perderlo. */}
                {form.temporada && !temporadas.some((t) => t.nombre === form.temporada) && (
                  <option value={form.temporada}>{form.temporada}</option>
                )}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="servicio">Servicio</Label>
              <select
                id="servicio"
                value={form.servicio}
                onChange={(e) => set('servicio', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sin especificar</option>
                {SERVICIO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                {/* Si el producto ya tenía un valor viejo (texto libre, de antes de
                    que este campo fuera un desplegable), se muestra igual acá para
                    no perderlo/resetearlo silenciosamente al editar. */}
                {form.servicio && !SERVICIO_OPTIONS.includes(form.servicio) && (
                  <option value={form.servicio}>{form.servicio}</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          {sectionLabel('Notas')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="notas_externas">Notas externas</Label>
              <Textarea
                id="notas_externas"
                value={form.notas_externas}
                onChange={(e) => set('notas_externas', e.target.value)}
                placeholder="Visible para todas las agencias desde Disponibilidad"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notas_internas">Notas internas</Label>
              <Textarea
                id="notas_internas"
                value={form.notas_internas}
                onChange={(e) => set('notas_internas', e.target.value)}
                placeholder="Solo visible para el admin"
              />
            </div>
          </div>
        </div>

        {/* Equipaje */}
        <div>
          {sectionLabel('Equipaje incluido')}
          <div className="flex flex-wrap gap-6">
            {[
              { id: 'carryon', kgId: 'carryon_kg', label: 'Carry-on' },
              { id: 'handbag', kgId: 'handbag_kg', label: 'Handbag' },
              { id: 'checkedbag', kgId: 'checkedbag_kg', label: 'Checked Bag' },
            ].map(({ id, kgId, label }) => (
              <div key={id} className="flex items-center gap-2">
                {check(id, label)}
                <Input
                  type="number" step="0.5" min="0" placeholder="Kg"
                  value={form[kgId]}
                  onChange={(e) => set(kgId, e.target.value)}
                  className="w-20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Paquetes */}
        <div>
          {sectionLabel('Links de paquetes')}
          <div className="space-y-2">
            {(form.package_links || []).map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Etiqueta (opcional)"
                  value={link.label}
                  onChange={(e) => updatePackageLink(i, 'label', e.target.value)}
                  className="w-1/3"
                />
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updatePackageLink(i, 'url', e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => removePackageLink(i)}>
                  Quitar
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addPackageLink}>
              + Agregar link
            </Button>
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          {check('is_blocked_for_sale', 'Bloqueado para venta')}
          <span className="text-xs text-amber-700 ml-1">(los usuarios no podrán ver ni reservar este cupo)</span>
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

export default ProductForm;
