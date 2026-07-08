import { useEffect, useMemo, useState } from 'react';
import { Plane, BarChart3, Clock3, ShoppingCart, X, User, Mail, Phone, Hash, Calendar, RefreshCw, Tag, Filter, Plus } from 'lucide-react';
import ReservationService from '../services/reservationService';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';

const EMPTY_FORM = {
  pedido_id: '',
  contacto_nombre: '',
  contacto_email: '',
  contacto_telefono: '',
  passengers: [],
  ficha_venta: '',
  doc_contable: '',
};

const TIPO_PASAJERO_OPTIONS = ['Adulto', 'Menor', 'Infante'];

export default function Availability() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [temporadaFilter, setTemporadaFilter] = useState('Todas');

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
      Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Disponibilidad actualizada correctamente', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const temporadas = useMemo(() => {
    const set = new Set();
    data.forEach((item) => {
      if (item.temporada && item.temporada.trim()) {
        set.add(item.temporada.trim());
      }
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [data]);

  const filteredData = useMemo(() => {
    if (temporadaFilter === 'Todas') return data;
    return data.filter((item) => (item.temporada || '').trim() === temporadaFilter);
  }, [data, temporadaFilter]);

  const getAvailabilityVariant = (value) => {
    if (value > 5) return 'success';
    if (value > 0) return 'warning';
    return 'danger';
  };

  // ---- Reserva individual ----
  const EMPTY_PASSENGER = { nombre: '', apellido: '', documento: '', nacimiento: '', nacionalidad: '', tipo_pasajero: 'Adulto' };

  const openReservationModal = (product) => {
    setSelectedProduct(product);
    setForm({ ...EMPTY_FORM, pedido_id: ReservationService.generatePedidoId(), passengers: [{ ...EMPTY_PASSENGER }] });
    setModalOpen(true);
  };

  const closeReservationModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPassenger = () => {
    setForm((prev) => ({
      ...prev,
      passengers: [...prev.passengers, { nombre: '', apellido: '', documento: '', nacimiento: '', nacionalidad: '', tipo_pasajero: 'Adulto' }],
    }));
  };

  const handleRemovePassenger = (index) => {
    setForm((prev) => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== index),
    }));
  };

  const calcTipoPasajero = (nacimiento, fechaSalida) => {
    if (!nacimiento || !fechaSalida) return 'Adulto';
    const birth = new Date(nacimiento);
    const departure = new Date(fechaSalida);
    if (isNaN(birth.getTime()) || isNaN(departure.getTime())) return 'Adulto';
    let age = departure.getFullYear() - birth.getFullYear();
    const monthDiff = departure.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && departure.getDate() < birth.getDate())) {
      age--;
    }
    const birthThisYear = new Date(departure.getFullYear(), birth.getMonth(), birth.getDate());
    const msInYear = 365.25 * 24 * 60 * 60 * 1000;
    const decimalAge = age + (departure - birthThisYear) / msInYear;
    if (decimalAge < 2) return 'Infante';
    if (decimalAge < 12) return 'Menor';
    return 'Adulto';
  };

  const handlePassengerChange = (index, field, value) => {
    setForm((prev) => {
      const updated = prev.passengers.map((p, i) => {
        if (i !== index) return p;
        const newP = { ...p, [field]: value };
        if (field === 'nacimiento') {
          newP.tipo_pasajero = calcTipoPasajero(value, selectedProduct?.fecha_salida);
        }
        return newP;
      });
      return { ...prev, passengers: updated };
    });
  };

  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    if (!form.contacto_nombre?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completá el nombre del contacto.' });
      return;
    }
    if (!form.contacto_email?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completá el email del contacto.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contacto_email)) {
      Swal.fire({ icon: 'warning', title: 'Email inválido', text: 'Ingresá un email de contacto válido.' });
      return;
    }
    if (form.passengers.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Agregá al menos un pasajero.' });
      return;
    }
    const pasajeroInvalido = form.passengers.some((p) => !p.nombre?.trim() || !p.apellido?.trim());
    if (pasajeroInvalido) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Completá nombre y apellido de todos los pasajeros.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        product_id: selectedProduct.id,
        pedido_id: form.pedido_id,
        contacto_nombre: form.contacto_nombre,
        contacto_email: form.contacto_email,
        contacto_telefono: form.contacto_telefono,
        ficha_venta: form.ficha_venta || null,
        doc_contable: form.doc_contable || null,
        vuelo_destino: selectedProduct.destino,
        vuelo_compania: selectedProduct.compania,
        vuelo_salida: selectedProduct.fecha_salida,
        vuelo_precio: selectedProduct.precio,
        precio_venta: selectedProduct.precio,
        vuelo_codigo: selectedProduct.codigo_cupo,
        passengers: form.passengers,
      };
      const result = await ReservationService.submitReservation(payload);
      setForm((prev) => ({
        ...prev,
        passengers: [EMPTY_FORM],
      }));
      Swal.fire({
        icon: 'success',
        title: '¡Reserva creada!',
        html: `<p class="text-sm text-slate-600">Tu reserva fue bloqueada temporalmente.</p><p class="mt-2 font-mono text-lg font-bold text-slate-900">${result.referenceId || form.pedido_id}</p><p class="mt-1 text-xs text-slate-500">Guardá este número de pedido para seguimiento.</p>`,
        confirmButtonText: 'Entendido',
      });
      closeReservationModal();
      await fetchAvailability();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error al reservar', text: error.message || 'No se pudo crear la reserva.' });
    } finally {
      setSubmitting(false);
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
        title="Disponibilidad"
        description="Busca cupos disponibles por destino, compañía y temporada. Reservá en un clic."
        icon={Plane}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              title="Refrescar datos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={BarChart3}
          label="Total de cupos"
          value={filteredData.length}
          description={temporadaFilter !== 'Todas' ? `Filtrado: ${temporadaFilter}` : 'Cantidad total de cupos cargados.'}
        />
        <StatCard
          icon={Clock3}
          label="Cupos agotados"
          value={filteredData.filter((item) => Number(item.disponibilidad) <= 0).length}
          description="Cupos sin disponibilidad restante."
        />
        <StatCard
          icon={Plane}
          label="Cupos disponibles"
          value={filteredData.filter((item) => Number(item.disponibilidad) > 0).length}
          description="Cupos listos para una nueva reserva."
        />
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Listado de cupos</h2>
              <p className="text-sm text-slate-500">Revisá los valores de salida, regreso, temporada y reservá directamente desde acá.</p>
            </div>
          </div>

          {/* Filtros de temporada */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Temporada:</span>
            {temporadas.map((temp) => (
              <button
                key={temp}
                type="button"
                onClick={() => setTemporadaFilter(temp)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${temporadaFilter === temp
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
              >
                {temp !== 'Todas' && <Tag className="h-3 w-3" />}
                {temp}
              </button>
            ))}
          </div>
        </div>

        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Cupo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Compañía</TableHead>
              <TableHead>Disponibilidad</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Regreso</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Adulto</TableHead>
              <TableHead>Bebé</TableHead>
              <TableHead>Niño</TableHead>
              <TableHead>Reservar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={13}>
                  Cargando disponibilidad...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={13}>
                  {temporadaFilter !== 'Todas'
                    ? `No hay cupos para la temporada "${temporadaFilter}".`
                    : 'No hay cupos disponibles.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-center font-medium">{item.codigo_cupo}</TableCell>
                  <TableCell className="text-center">{item.tipo_producto || '—'}</TableCell>
                  <TableCell className="text-center">{item.destino}</TableCell>
                  <TableCell className="text-center">{item.compania}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getAvailabilityVariant(Number(item.disponibilidad))}>
                      {item.disponibilidad}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatDate(item.fecha_salida)}</TableCell>
                  <TableCell className="text-center">{formatDate(item.fecha_regreso)}</TableCell>
                  <TableCell className="text-center">{item.temporada || '—'}</TableCell>
                  <TableCell className="text-center">{item.ruta || '—'}</TableCell>
                  <TableCell className="text-center">
                    {item.precio ? `$${Number(item.precio).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.inf_fare ? `$${Number(item.inf_fare).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.chd_fare ? `$${Number(item.chd_fare).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      onClick={() => openReservationModal(item)}
                      disabled={Number(item.disponibilidad) <= 0}
                      title={Number(item.disponibilidad) <= 0 ? 'Sin disponibilidad' : 'Reservar este cupo'}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Reservar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      {/* Modal de Reserva individual */}
      <Modal title={`Reservar: ${selectedProduct?.codigo_cupo || ''} - ${selectedProduct?.destino || ''}`} open={modalOpen} onClose={closeReservationModal}>
        <div className="max-h-[calc(100vh-500px)] overflow-y-auto">
          <form onSubmit={handleSubmitReservation} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Compañía:</span><span className="ml-2 font-medium text-slate-900">{selectedProduct?.compania}</span></div>
                <div><span className="text-slate-500">Cantidad de Pasajeros:</span><span className="ml-2 font-medium text-slate-900">{form.passengers.length}</span></div>
                <div><span className="text-slate-500">Salida:</span><span className="ml-2 font-medium text-slate-900">{formatDate(selectedProduct?.fecha_salida)}</span></div>
                <div><span className="text-slate-500">Regreso:</span><span className="ml-2 font-medium text-slate-900">{formatDate(selectedProduct?.fecha_regreso)}</span></div>
                <div><span className="text-slate-500">Temporada:</span><span className="ml-2 font-medium text-slate-900">{selectedProduct?.temporada || '—'}</span></div>
                <div><span className="text-slate-500">Ruta:</span><span className="ml-2 font-medium text-slate-900">{selectedProduct?.ruta || '—'}</span></div>
                <div><span className="text-slate-500">Disponibles:</span><span className="ml-2 font-medium text-slate-900">{selectedProduct?.disponibilidad}</span></div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700"><Hash className="inline h-4 w-4 mr-1" />N° de Pedido</label>
              <input type="text" value={form.pedido_id} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
            </div>

            <fieldset id="contacto-section" className="rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold text-slate-700">Datos de contacto</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600"><User className="inline h-3 w-3 mr-1" />Nombre contacto *</label>
                  <input type="text" value={form.contacto_nombre} onChange={(e) => handleFormChange('contacto_nombre', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600"><Mail className="inline h-3 w-3 mr-1" />Email contacto *</label>
                  <input type="email" value={form.contacto_email} onChange={(e) => handleFormChange('contacto_email', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: juan@agencia.com" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600"><Phone className="inline h-3 w-3 mr-1" />Teléfono contacto</label>
                  <input type="text" value={form.contacto_telefono} onChange={(e) => handleFormChange('contacto_telefono', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: +54 11 1234-5678" />
                </div>
              </div>
            </fieldset>

            <fieldset id="pasajero-section" className="rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold text-slate-700">Datos del pasajero</legend>
              <div className="grid gap-3 mt-6">
                {form.passengers.map((passenger, index) => (
                  <fieldset key={index} className="rounded-2xl border border-slate-200 p-4">
                    <legend className="px-2 text-sm font-semibold text-slate-700">Pasajero {index + 1}</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Nombre *</label>
                        <input type="text" value={passenger.nombre} onChange={(e) => handlePassengerChange(index, 'nombre', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: María" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Apellido *</label>
                        <input type="text" value={passenger.apellido} onChange={(e) => handlePassengerChange(index, 'apellido', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: González" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Documento</label>
                        <input type="text" value={passenger.documento} onChange={(e) => handlePassengerChange(index, 'documento', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: 12345678" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Nacionalidad</label>
                        <input type="text" value={passenger.nacionalidad} onChange={(e) => handlePassengerChange(index, 'nacionalidad', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: Argentina" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600"><Calendar className="inline h-3 w-3 mr-1" />Fecha de nacimiento</label>
                        <input type="date" value={passenger.nacimiento} onChange={(e) => handlePassengerChange(index, 'nacimiento', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de pasajero</label>
                        <select value={passenger.tipo_pasajero} onChange={(e) => handlePassengerChange(index, 'tipo_pasajero', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                          {TIPO_PASAJERO_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-2">
                      <Button variant="secondary" size="sm" onClick={() => handleRemovePassenger(index)} disabled={form.passengers.length === 1}>
                        <X className="h-4 w-4 mr-1" />Eliminar
                      </Button>
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={() => handleAddPassenger()}>
                  <Plus className="h-4 w-4 mr-1" />Agregar Pasajero
                </Button>
              </div>
            </fieldset>

            <fieldset id="documentacion-section" className="rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold text-slate-700">Documentación (opcional)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Ficha de venta</label>
                  <input type="text" value={form.ficha_venta} onChange={(e) => handleFormChange('ficha_venta', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: FV-001" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Doc. Contable</label>
                  <input type="text" value={form.doc_contable} onChange={(e) => handleFormChange('doc_contable', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: DC-001" />
                </div>
              </div>
            </fieldset>

            <div id="confirm-section" className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <Button variant="secondary" type="button" onClick={closeReservationModal} disabled={submitting} className="mr-2">
                <X className="h-4 w-4 mr-1" />Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                {submitting ? 'Reservando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </form>
        </div>
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-10">
          <Button size="sm" variant="outline" onClick={() => document.getElementById('contacto-section')?.scrollIntoView({ behavior: 'smooth' })} title="Ir a Datos de contacto">
            📞
          </Button>
          <Button size="sm" variant="outline" onClick={() => document.getElementById('pasajero-section')?.scrollIntoView({ behavior: 'smooth' })} title="Ir a Datos del pasajero">
            👤
          </Button>
          <Button size="sm" variant="outline" onClick={() => document.getElementById('documentacion-section')?.scrollIntoView({ behavior: 'smooth' })} title="Ir a Documentación">
            📄
          </Button>
          <Button size="sm" variant="outline" onClick={() => document.getElementById('confirm-section')?.scrollIntoView({ behavior: 'smooth' })} title="Ir a Confirmar Reserva">
            ✅
          </Button>
        </div>
      </Modal>

    </div>
  );
}
