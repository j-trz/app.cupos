import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from './ui/Card';

// Tipos de producto soportados. El campo "ruta" se relabela según el tipo
// (Cabina para Crucero, Habitación para Hotel) — la lógica de negocio
// específica por tipo (tarifas por categoría, noches de estadía, etc.) se
// suma en una siguiente iteración; por ahora es solo estructura + etiquetas.
const TIPOS_PRODUCTO = [
  { value: 'Aereo', label: 'Aéreo' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Crucero', label: 'Crucero' },
];

const RUTA_LABEL_BY_TIPO = {
  Hotel: 'Habitación',
  Crucero: 'Cabina',
  Aereo: 'Ruta',
};

const EMPTY_FORM = {
  codigo_cupo: '',
  destino: '',
  compania: '',
  disponibilidad: '',
  cupo: '',
  salida: '',
  regreso: '',
  precio: '',
  neto_1: '',
  op: '',
  ruta: '',
  pnr: '',
  ficha: '',
  temporada: '',
  tipo_producto: 'Aereo',
  bloqueo_temporal_minutos: '',
  carryon: false,
  handbag: false,
  checkedbag: false,
  inf_fare: '',
  chd_fare: '',
  is_blocked_for_sale: false,
};

function toFormValues(product) {
  if (!product) return EMPTY_FORM;
  const fmt = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  };
  return {
    codigo_cupo: product.codigo_cupo || '',
    destino: product.destino || '',
    compania: product.compania || '',
    disponibilidad: product.disponibilidad ?? '',
    cupo: product.cupo ?? '',
    salida: fmt(product.salida || product.fecha_salida),
    regreso: fmt(product.regreso || product.fecha_regreso),
    precio: product.precio ?? '',
    neto_1: product.neto_1 ?? '',
    op: product.op ?? '',
    ruta: product.ruta || '',
    pnr: product.pnr || '',
    ficha: product.ficha || '',
    temporada: product.temporada || '',
    tipo_producto: product.tipo_producto || 'Aereo',
    bloqueo_temporal_minutos: product.bloqueo_temporal_minutos ?? '',
    carryon: product.carryon ?? false,
    handbag: product.handbag ?? false,
    checkedbag: product.checkedbag ?? false,
    inf_fare: product.inf_fare ?? '',
    chd_fare: product.chd_fare ?? '',
    is_blocked_for_sale: product.is_blocked_for_sale ?? false,
  };
}

function toPayload(form) {
  const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
  return {
    codigo_cupo: form.codigo_cupo,
    destino: form.destino,
    compania: form.compania,
    disponibilidad: num(form.disponibilidad),
    cupo: num(form.cupo),
    salida: form.salida || null,
    regreso: form.regreso || null,
    precio: num(form.precio),
    neto_1: num(form.neto_1),
    op: num(form.op),
    ruta: form.ruta,
    pnr: form.pnr,
    ficha: form.ficha,
    temporada: form.temporada,
    tipo_producto: form.tipo_producto,
    bloqueo_temporal_minutos: num(form.bloqueo_temporal_minutos),
    carryon: form.carryon,
    handbag: form.handbag,
    checkedbag: form.checkedbag,
    inf_fare: num(form.inf_fare),
    chd_fare: num(form.chd_fare),
    is_blocked_for_sale: form.is_blocked_for_sale,
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

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  const validate = () => {
    const e = {};
    if (!form.codigo_cupo.trim()) e.codigo_cupo = 'Requerido';
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
    <div className="space-y-1">
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
      {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Producto' : 'Crear Producto'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Actualizá la información del cupo' : 'Cargá un nuevo cupo al catálogo'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">

          {/* Identificación */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {field('codigo_cupo', 'Código de Cupo', 'text', { required: true })}
            {field('destino', 'Destino', 'text', { required: true })}
            {field('compania', 'Compañía', 'text', { required: true })}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('salida', 'Fecha de Salida', 'date')}
            {field('regreso', 'Fecha de Regreso', 'date')}
          </div>

          {/* Cupo y disponibilidad */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {field('disponibilidad', 'Disponibilidad', 'number', { required: true, min: '0' })}
            {field('cupo', 'Cupo Total', 'number', { min: '0' })}
            {field('bloqueo_temporal_minutos', 'Bloqueo Temporal (min)', 'number', { min: '0', placeholder: '60' })}
          </div>

          {/* Precios */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {field('precio', 'Precio ADT', 'number', { step: '0.01', min: '0' })}
            {field('inf_fare', 'Precio INF', 'number', { step: '0.01', min: '0' })}
            {field('chd_fare', 'Precio CHD', 'number', { step: '0.01', min: '0' })}
            {field('neto_1', 'Neto 1', 'number', { step: '0.01', min: '0' })}
          </div>

          {/* OP y Ruta/Cabina/Habitación (según tipo de producto) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {field('op', 'OP', 'number', { step: '0.01', min: '0' })}
            {field('ruta', rutaLabel)}
            {field('pnr', 'PNR')}
          </div>

          {/* Clasificación */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {field('ficha', 'Ficha')}
            {field('temporada', 'Temporada')}
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

          {/* Equipaje */}
          <div>
            <p className="mb-2 text-sm font-medium">Equipaje incluido</p>
            <div className="flex flex-wrap gap-6">
              {check('carryon', 'Carry-on')}
              {check('handbag', 'Handbag')}
              {check('checkedbag', 'Checked Bag')}
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            {check('is_blocked_for_sale', 'Bloqueado para venta')}
            <span className="text-xs text-amber-700 ml-1">(los usuarios no podrán ver ni reservar este cupo)</span>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProductForm;
