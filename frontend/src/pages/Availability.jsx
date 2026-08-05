import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plane, BarChart3, Clock3, ShoppingCart, X, User, Mail, Phone, Hash, Calendar, RefreshCw, Tag, Filter, Plus, Search, MapPin, StickyNote, Minus, AlertCircle } from 'lucide-react';
import ItineraryTable from '../components/ItineraryTable';
import BaggageFranchise from '../components/BaggageFranchise.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import ReservationService from '../services/reservationService';
import AtlasService from '../services/atlasService';
import { useAIPageContext } from '../contexts/AIPageContext.jsx';
import { formatExpiry, useCountdownTick } from '../lib/expiry.js';
import Swal from 'sweetalert2';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatsHero from '../components/ui/StatsHero.jsx';
import Modal from '../components/Modal.jsx';
import TableComponent from '../components/ui/Table.jsx';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table.jsx';
import { formatDateOnly } from '../lib/dateOnly.js';

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
  useCountdownTick(); // hace que la cuenta regresiva de bloqueos avance sola
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [temporadaFilter, setTemporadaFilter] = useState('Todas');
  // Modal de ruta
  const [routeModalProduct, setRouteModalProduct] = useState(null);
  const [notesModalProduct, setNotesModalProduct] = useState(null);
  // Bloqueos temporales propios (sección "¿espero o no?" — sin datos de pasajero)
  const [blockedReservations, setBlockedReservations] = useState([]);
  // Pre-hold de stock activo mientras se completa el modal (id/pedidoId/expiresAt)
  // — ver CreateHold en order_handler.go. null si el modal se abrió sin hold
  // (ej. el Asistente IA abre el modal directo, sin pasar por este flujo).
  const [hold, setHold] = useState(null);
  const [holdExpired, setHoldExpired] = useState(false);

  // Modal nativo de selección de cantidad de lugares
  const [quantityModalProduct, setQuantityModalProduct] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [quantitySubmitting, setQuantitySubmitting] = useState(false);
  const [quantityError, setQuantityError] = useState('');

  // Modal nativo para buscar contactos en Atlas (backoffice) — "target"
  // indica dónde aplicar el resultado: 'contacto' llena solo los datos de
  // contacto, un número llena además esa fila de pasajero puntual.
  const [atlasModalOpen, setAtlasModalOpen] = useState(false);
  const [atlasTarget, setAtlasTarget] = useState('contacto');
  const [atlasFiltroTipo, setAtlasFiltroTipo] = useState('documento');
  const [atlasValor, setAtlasValor] = useState('');
  const [atlasResultados, setAtlasResultados] = useState([]);
  const [atlasSearching, setAtlasSearching] = useState(false);
  const [atlasApplying, setAtlasApplying] = useState(false);
  const [atlasError, setAtlasError] = useState('');

  useEffect(() => {
    fetchAvailability();
    fetchBlockedReservations();
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

  // Trae los bloqueos temporales de TODA la agencia (no solo los propios) —
  // así, si un producto muestra 0 disponibilidad, cualquier usuario de la
  // agencia sabe que hay un bloqueo de un compañero y puede especular con
  // esperar. El backend ya devuelve EXCLUSIVAMENTE pedido + destino +
  // vencimiento, nunca nombre, documento ni contacto del pasajero.
  const fetchBlockedReservations = async () => {
    try {
      const blocked = await ReservationService.getBlockedReservations();
      setBlockedReservations(blocked);
    } catch (error) {
      console.error('Error fetching blocked reservations:', error);
      setBlockedReservations([]);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      ReservationService.refreshCache?.();
      await Promise.all([fetchAvailability(), fetchBlockedReservations()]);
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
  const EMPTY_PASSENGER = { nombre: '', apellido: '', documento: '', nacimiento: '', nacionalidad: '', nacionalidadFromAtlas: false, tipo_pasajero: 'Adulto' };

  // Abre el modal SIN hold — lo sigue usando el Asistente IA (abrir_modal_reserva),
  // que no pasa por el flujo manual de "elegir cantidad" de abajo.
  const openReservationModal = (product) => {
    setSelectedProduct(product);
    setForm({ ...EMPTY_FORM, pedido_id: ReservationService.generatePedidoId(), passengers: [{ ...EMPTY_PASSENGER }] });
    setHold(null);
    setHoldExpired(false);
    setModalOpen(true);
  };

  // Flujo manual: clic en el número de disponibilidad o en "Reservar" primero
  // pregunta cuántos pasajeros, descuenta ese stock de inmediato (CreateHold)
  // y recién ahí abre el modal ya pre-cargado con N bloques de pasajero y el
  // cronómetro de 10 min corriendo — así nadie más se lleva esos cupos
  // mientras el usuario completa los datos.
  // Flujo manual: clic en el número de disponibilidad o en "Reservar" abre el modal nativo de cantidad
  const promptPassengerCountAndHold = (product) => {
    const disponibles = Number(product.disponibilidad) || 0;
    if (disponibles <= 0) return;
    setQuantityModalProduct(product);
    setPassengerCount(1);
    setQuantityError('');
  };

  const closeQuantityModal = () => {
    setQuantityModalProduct(null);
    setPassengerCount(1);
    setQuantityError('');
  };

  const handleConfirmQuantityModal = async (e) => {
    if (e) e.preventDefault();
    if (!quantityModalProduct) return;
    const disponibles = Number(quantityModalProduct.disponibilidad) || 0;
    const count = Number(passengerCount);

    if (!count || !Number.isInteger(count) || count < 1) {
      setQuantityError('Ingresá una cantidad válida.');
      return;
    }
    if (count > disponibles) {
      setQuantityError(`Solo hay ${disponibles} cupo(s) disponible(s).`);
      return;
    }

    setQuantitySubmitting(true);
    setQuantityError('');
    try {
      const holdInfo = await ReservationService.createHold(quantityModalProduct.id, count);
      setSelectedProduct(quantityModalProduct);
      setForm({
        ...EMPTY_FORM,
        pedido_id: holdInfo.pedidoId,
        passengers: Array.from({ length: count }, () => ({ ...EMPTY_PASSENGER })),
      });
      setHold(holdInfo);
      setHoldExpired(false);
      setQuantityModalProduct(null);
      setModalOpen(true);
    } catch (error) {
      setQuantityError(error.message || 'Puede que alguien más ya lo haya tomado. Se actualizó la disponibilidad.');
      fetchAvailability();
    } finally {
      setQuantitySubmitting(false);
    }
  };

  const closeReservationModal = () => {
    if (hold?.id) {
      ReservationService.releaseHold(hold.id);
      fetchAvailability();
    }
    setModalOpen(false);
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
    setHold(null);
    setHoldExpired(false);
  };

  const handleHoldExpire = useCallback(() => {
    setHoldExpired(true);
  }, []);

  // ---- Contexto de pantalla para el Asistente IA ----
  const { setPageContext, clearPageContext, registerActionHandlers } = useAIPageContext();

  // El Asistente IA abre este mismo modal para un producto puntual —
  // resuelve el id (puede venir de una posición como "el primero") contra
  // la lista de productos ya cargada y reutiliza openReservationModal tal
  // cual la usa el botón "Reservar" de la tabla.
  const handleAIOpenReservationModal = useCallback((productId) => {
    const product = data.find((p) => String(p.id) === String(productId));
    if (!product) return;
    openReservationModal(product);
  }, [data]);

  // El Asistente IA completa el formulario de pasajeros ya abierto (con
  // datos extraídos de una foto de DNI/pasaporte, o filas vacías si solo se
  // sabe la cantidad) — el usuario revisa y confirma manualmente después.
  // Si el usuario ya le dio la ficha de venta en el chat, también viaja acá
  // (nunca sale de una foto de documento, ver ai_handler.go) para no
  // obligarlo a tipearla de nuevo en el formulario.
  const handleAIFillPassengers = useCallback((passengers, extra) => {
    if (!Array.isArray(passengers) || passengers.length === 0) return;
    setForm((prev) => ({
      ...prev,
      passengers: passengers.map((p) => ({
        nombre: p?.nombre || '',
        apellido: p?.apellido || '',
        documento: p?.documento || '',
        nacimiento: p?.nacimiento || '',
        nacionalidad: p?.nacionalidad || '',
        tipo_pasajero: p?.tipo_pasajero || 'Adulto',
      })),
      ...(extra?.ficha_venta ? { ficha_venta: extra.ficha_venta } : {}),
    }));
  }, []);

  useEffect(() => {
    const visibleItems = filteredData.map((item) => ({
      id: String(item.id),
      label: `${item.destino} — ${item.compania} — $${item.precio || 0} — ${item.disponibilidad} cupo(s) disponibles`,
    }));
    setPageContext({ page: 'disponibilidad', visibleItems });
  }, [filteredData, setPageContext]);

  useEffect(() => {
    const cleanup = registerActionHandlers({
      openReservationModal: handleAIOpenReservationModal,
      fillPassengers: handleAIFillPassengers,
    });
    return cleanup;
  }, [registerActionHandlers, handleAIOpenReservationModal, handleAIFillPassengers]);

  useEffect(() => () => clearPageContext(), [clearPageContext]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPassenger = () => {
    setForm((prev) => ({
      ...prev,
      passengers: [...prev.passengers, { nombre: '', apellido: '', documento: '', nacimiento: '', nacionalidad: '', nacionalidadFromAtlas: false, tipo_pasajero: 'Adulto' }],
    }));
  };

  const handleRemovePassenger = (index) => {
    setForm((prev) => ({
      ...prev,
      passengers: prev.passengers.filter((_, i) => i !== index),
    }));
  };

  // Buscar contacto en Atlas (backoffice) mediante modal nativo — "target"
  // es 'contacto' (botón general, llena solo Datos de contacto) o el índice
  // de una fila de pasajero puntual (botón junto al campo Documento).
  const handleOpenAtlasSearch = (target = 'contacto') => {
    setAtlasTarget(target);
    setAtlasFiltroTipo('documento');
    setAtlasValor('');
    setAtlasResultados([]);
    setAtlasError('');
    setAtlasModalOpen(true);
  };

  const handleCloseAtlasSearch = () => {
    if (atlasSearching || atlasApplying) return;
    setAtlasModalOpen(false);
    setAtlasResultados([]);
    setAtlasError('');
  };

  const applyAtlasContacto = async (contactoCodigo) => {
    setAtlasApplying(true);
    setAtlasError('');
    try {
      const detalle = await AtlasService.detalleContacto(contactoCodigo);
      setForm((prev) => {
        const next = {
          ...prev,
          contacto_nombre: detalle.contacto_nombre || prev.contacto_nombre,
          contacto_email: detalle.contacto_email || prev.contacto_email,
          contacto_telefono: detalle.contacto_telefono || prev.contacto_telefono,
        };
        if (typeof atlasTarget === 'number' && detalle.passenger) {
          const pasajero = detalle.passenger;
          next.passengers = prev.passengers.map((p, i) => {
            if (i !== atlasTarget) return p;
            const nacimiento = pasajero.nacimiento || p.nacimiento;
            return {
              ...p,
              nombre: pasajero.nombre || p.nombre,
              apellido: pasajero.apellido || p.apellido,
              documento: pasajero.documento || p.documento,
              nacimiento,
              nacionalidad: pasajero.nacionalidad || p.nacionalidad,
              nacionalidadFromAtlas: !!pasajero.nacionalidad || p.nacionalidadFromAtlas,
              tipo_pasajero: nacimiento ? calcTipoPasajero(nacimiento, selectedProduct?.fecha_salida) : p.tipo_pasajero,
            };
          });
        }
        return next;
      });
      setAtlasModalOpen(false);
      setAtlasResultados([]);
    } catch (error) {
      console.error('Error al traer el detalle del contacto:', error);
      setAtlasError(error.message || 'No se pudo traer el detalle del contacto.');
    } finally {
      setAtlasApplying(false);
    }
  };

  const handleSearchAtlas = async (e) => {
    if (e) e.preventDefault();
    const valor = atlasValor.trim();
    if (!valor) {
      setAtlasError('Ingresá un valor para buscar.');
      return;
    }

    setAtlasSearching(true);
    setAtlasError('');
    setAtlasResultados([]);
    try {
      const response = await AtlasService.buscarContacto(atlasFiltroTipo, valor);
      const contactos = response.contactos || [];
      if (contactos.length === 0) {
        setAtlasError('No se encontraron contactos en Atlas para ese criterio.');
      } else if (contactos.length === 1) {
        await applyAtlasContacto(contactos[0].contacto_codigo);
      } else {
        setAtlasResultados(contactos);
      }
    } catch (error) {
      console.error('Error al buscar en Atlas:', error);
      setAtlasError(error.message || 'No se pudo conectar con Atlas.');
    } finally {
      setAtlasSearching(false);
    }
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
        hold_id: hold?.id || undefined,
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
      // La reserva ya consumió el hold en el backend (Estado dejó de ser
      // hold_temporal) — se limpia el estado local sin volver a llamar a
      // releaseHold, para no pisar la reserva recién creada.
      setModalOpen(false);
      setSelectedProduct(null);
      setForm(EMPTY_FORM);
      setHold(null);
      setHoldExpired(false);
      await Promise.all([fetchAvailability(), fetchBlockedReservations()]);
    } catch (error) {
      const message = error.message || 'No se pudo crear la reserva.';
      // El backend devuelve este texto cuando el hold venció/ya no existe
      // (410) — no tiene sentido dejar reintentar el mismo submit.
      if (hold?.id && /bloqueo temporal/i.test(message)) {
        setHoldExpired(true);
        Swal.fire({ icon: 'warning', title: 'El bloqueo temporal expiró', text: 'El cupo se liberó. Cerrá el formulario e intentá reservar de nuevo.' });
      } else {
        Swal.fire({ icon: 'error', title: 'Error al reservar', text: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = formatDateOnly;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disponibilidad"
        description="Busca cupos disponibles por destino, compañía y temporada. Reservá en un clic."
        icon={Plane}
        action={
          <Button size="sm" onClick={refresh} disabled={refreshing} title="Actualizar catálogo">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <StatsHero
        stats={[
          {
            icon: BarChart3,
            label: 'Total de cupos',
            value: filteredData.length,
            description: temporadaFilter !== 'Todas' ? `Temporada: ${temporadaFilter}` : 'Total de vuelos cargados.',
            color: 'text-blue-300 bg-blue-500/10 border-blue-500/20'
          },
          {
            icon: Clock3,
            label: 'Cupos agotados',
            value: filteredData.filter((item) => Number(item.disponibilidad) <= 0).length,
            description: 'Vuelos sin asientos libres.',
            color: 'text-amber-300 bg-amber-500/10 border-amber-500/20'
          },
          {
            icon: Plane,
            label: 'Cupos disponibles',
            value: filteredData.filter((item) => Number(item.disponibilidad) > 0).length,
            description: 'Vuelos listos para reservar.',
            color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
          }
        ]}
      />

      {/* Bloqueos temporales de TODA la agencia — solo destino + cuenta
          regresiva, nunca datos de pasajero, para que cualquier usuario sepa
          que un cupo en 0 tiene un bloqueo de un compañero esperando
          confirmación y pueda decidir si esperar o no. */}
      {blockedReservations.length > 0 && (
        <div className="rounded-2xl border border-amber-100 dark:border-amber-950/30 bg-amber-50/10 dark:bg-amber-950/5 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">Reservas bloqueadas temporalmente</h2>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {blockedReservations.length} reserva{blockedReservations.length > 1 ? 's' : ''} de tu agencia esperando confirmación. El cupo se liberará automáticamente al vencer.
              </p>
            </div>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blockedReservations.map((item) => {
              const expiry = formatExpiry(item.Bloqueo_Expira_At);
              return (
                <div
                  key={item.Pedido_ID || item.id}
                  className="flex flex-col justify-between gap-2.5 rounded-xl border border-amber-250/30 dark:border-amber-900/10 bg-white dark:bg-zinc-900 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.Vuelo_Destino || '—'}</p>
                      <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-550 font-mono mt-0.5">{item.Pedido_ID}</p>
                    </div>
                    {expiry && (
                      <span className={`flex shrink-0 items-center gap-1 text-xs font-bold ${expiry.color}`}>
                        <Clock3 className="h-3 w-3" />
                        {expiry.label}
                      </span>
                    )}
                  </div>
                  {(item.Vuelo_Salida || item.Temporada) && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {item.Vuelo_Salida && (
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-medium">
                          Salida: {formatDate(item.Vuelo_Salida)}
                        </span>
                      )}
                      {item.Temporada && (
                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium border border-amber-100 dark:border-amber-900/30">
                          {item.Temporada}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              <TableHead className="sticky left-0 z-10 bg-white dark:bg-zinc-900 text-center">Reservar</TableHead>
              <TableHead className="text-center">Cupo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Compañía</TableHead>
              <TableHead>Disponibilidad</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Regreso</TableHead>
              <TableHead>Temporada</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-center">Equipaje</TableHead>
              <TableHead>Adulto</TableHead>
              <TableHead>Bebé</TableHead>
              <TableHead>Niño</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={15}>
                  Cargando disponibilidad...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10" colSpan={15}>
                  {temporadaFilter !== 'Todas'
                    ? `No hay cupos para la temporada "${temporadaFilter}".`
                    : 'No hay cupos disponibles.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="sticky left-0 z-10 bg-white dark:bg-zinc-900 text-center">
                    <Button
                      size="sm"
                      onClick={() => promptPassengerCountAndHold(item)}
                      disabled={Number(item.disponibilidad) <= 0}
                      title={Number(item.disponibilidad) <= 0 ? 'Sin disponibilidad' : 'Reservar este cupo'}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Reservar
                    </Button>
                  </TableCell>
                  <TableCell className="text-center font-medium">{item.codigo_cupo}</TableCell>
                  <TableCell className="text-center">{item.tipo_producto || '—'}</TableCell>
                  <TableCell className="text-center">{item.destino}</TableCell>
                  <TableCell className="text-center">{item.compania}</TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => promptPassengerCountAndHold(item)}
                      disabled={Number(item.disponibilidad) <= 0}
                      title={Number(item.disponibilidad) <= 0 ? 'Sin disponibilidad' : 'Elegir cantidad de pasajeros y reservar'}
                      className="disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Badge variant={getAvailabilityVariant(Number(item.disponibilidad))}>
                        {item.disponibilidad}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-center">{formatDate(item.fecha_salida)}</TableCell>
                  <TableCell className="text-center">{formatDate(item.fecha_regreso)}</TableCell>
                  <TableCell className="text-center">{item.temporada || '—'}</TableCell>
                  <TableCell className="text-center">
                    {item.ruta ? (
                      <button
                        type="button"
                        onClick={() => setRouteModalProduct(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                        title="Ver detalle de la ruta"
                      >
                        <MapPin className="h-3 w-3" />
                        Ruta
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(item.notas_externas || item.notas_internas) ? (
                      <button
                        type="button"
                        onClick={() => setNotesModalProduct(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                        title="Ver notas"
                      >
                        <StickyNote className="h-3 w-3" />
                        Notas
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <BaggageFranchise item={item} />
                  </TableCell>
                  <TableCell className="text-center">
                    {item.precio ? `$${Number(item.precio).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.inf_fare ? `$${Number(item.inf_fare).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.chd_fare ? `$${Number(item.chd_fare).toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableComponent>
      </Card>

      {/* Modal de Reserva individual */}
      <Modal title={`Reservar: ${selectedProduct?.codigo_cupo || ''} - ${selectedProduct?.destino || ''}`} open={modalOpen} onClose={closeReservationModal} size="2xl">
        <div>
          <form onSubmit={handleSubmitReservation} className="space-y-6 sm:space-y-8 py-2">
            {hold?.expiresAt && (
              <div className={`flex items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5 ${holdExpired ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div>
                  <p className={`text-sm font-semibold ${holdExpired ? 'text-red-800' : 'text-emerald-800'}`}>
                    {holdExpired ? 'El bloqueo temporal expiró' : `Cupo reservado para ${form.passengers.length} pasajero(s)`}
                  </p>
                  <p className={`text-xs mt-1 ${holdExpired ? 'text-red-600' : 'text-emerald-700'}`}>
                    {holdExpired
                      ? 'El cupo se liberó. Cerrá el formulario y volvé a intentar.'
                      : 'Completá los datos antes de que venza el cronómetro.'}
                  </p>
                </div>
                <CountdownTimer expiresAt={hold.expiresAt} onExpire={handleHoldExpire} />
              </div>
            )}

            <fieldset disabled={holdExpired} className="contents">

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Compañía:</span><span className="ml-2 font-semibold text-slate-900">{selectedProduct?.compania}</span></div>
                <div><span className="text-slate-500">Cantidad de Pasajeros:</span><span className="ml-2 font-semibold text-slate-900">{form.passengers.length}</span></div>
                <div><span className="text-slate-500">Salida:</span><span className="ml-2 font-semibold text-slate-900">{formatDate(selectedProduct?.fecha_salida)}</span></div>
                <div><span className="text-slate-500">Regreso:</span><span className="ml-2 font-semibold text-slate-900">{formatDate(selectedProduct?.fecha_regreso)}</span></div>
                <div><span className="text-slate-500">Temporada:</span><span className="ml-2 font-semibold text-slate-900">{selectedProduct?.temporada || '—'}</span></div>
                <div><span className="text-slate-500">Ruta:</span><span className="ml-2 font-semibold text-slate-900">{selectedProduct?.ruta || '—'}</span></div>
                <div><span className="text-slate-500">Disponibles:</span><span className="ml-2 font-semibold text-slate-900">{selectedProduct?.disponibilidad}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
              <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-slate-500" />N° de Pedido
              </label>
              <input type="text" value={form.pedido_id} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600 cursor-not-allowed font-mono" />
            </div>

            <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <legend className="px-2.5 text-sm font-bold text-slate-800">Datos de contacto</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-500" />Nombre contacto *
                  </label>
                  <input type="text" value={form.contacto_nombre} onChange={(e) => handleFormChange('contacto_nombre', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />Email contacto *
                  </label>
                  <input type="email" value={form.contacto_email} onChange={(e) => handleFormChange('contacto_email', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: juan@agencia.com" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />Teléfono contacto
                  </label>
                  <input type="text" value={form.contacto_telefono} onChange={(e) => handleFormChange('contacto_telefono', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: +54 11 1234-5678" />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <legend className="px-2.5 text-sm font-bold text-slate-800">Datos del pasajero</legend>
              <div className="space-y-4 mt-2">
                {form.passengers.map((passenger, index) => (
                  <fieldset key={index} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-4">
                    <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-600">Pasajero {index + 1}</legend>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Nombre *</label>
                        <input type="text" value={passenger.nombre} onChange={(e) => handlePassengerChange(index, 'nombre', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: María" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Apellido *</label>
                        <input type="text" value={passenger.apellido} onChange={(e) => handlePassengerChange(index, 'apellido', e.target.value)} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: González" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Documento</label>
                        <div className="flex gap-1.5">
                          <input type="text" value={passenger.documento} onChange={(e) => handlePassengerChange(index, 'documento', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: 12345678" />
                          <button
                            type="button"
                            onClick={() => handleOpenAtlasSearch(index)}
                            title="Buscar este pasajero en Atlas"
                            className="flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {passenger.nacionalidadFromAtlas && passenger.nacionalidad && (
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Nacionalidad</label>
                          <input type="text" value={passenger.nacionalidad} readOnly title="Dato traído de Atlas" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-100 text-slate-600 cursor-not-allowed" />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" />Fecha de nacimiento
                        </label>
                        <input type="date" value={passenger.nacimiento} onChange={(e) => handlePassengerChange(index, 'nacimiento', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de pasajero</label>
                        <select value={passenger.tipo_pasajero} onChange={(e) => handlePassengerChange(index, 'tipo_pasajero', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white">
                          {TIPO_PASAJERO_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-end pt-1">
                      <Button variant="secondary" size="sm" onClick={() => handleRemovePassenger(index)} disabled={form.passengers.length === 1 || !!hold} title={hold ? 'La cantidad quedó fija al reservar el cupo — cancelá y volvé a empezar para cambiarla' : undefined}>
                        <X className="h-4 w-4 mr-1" />Eliminar
                      </Button>
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="pt-2 flex flex-wrap gap-2.5">
                <Button variant="secondary" size="sm" onClick={() => handleAddPassenger()} disabled={!!hold} title={hold ? 'La cantidad quedó fija al reservar el cupo — cancelá y volvé a empezar para cambiarla' : undefined}>
                  <Plus className="h-4 w-4 mr-1" />Agregar Pasajero
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenAtlasSearch('contacto')} className="border-dashed">
                  <Search className="h-4 w-4 mr-1" />Buscar contacto en Atlas
                </Button>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <legend className="px-2.5 text-sm font-bold text-slate-800">Documentación (opcional)</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Ficha de venta</label>
                  <input type="text" value={form.ficha_venta} onChange={(e) => handleFormChange('ficha_venta', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: FV-001" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Doc. Contable</label>
                  <input type="text" value={form.doc_contable} onChange={(e) => handleFormChange('doc_contable', e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Ej: DC-001" />
                </div>
              </div>
            </fieldset>

            </fieldset>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 mt-6">
              <Button variant="secondary" type="button" onClick={closeReservationModal} disabled={submitting} className="mr-2">
                <X className="h-4 w-4 mr-1" />{holdExpired ? 'Cerrar' : 'Cancelar'}
              </Button>
              <Button type="submit" disabled={submitting || holdExpired}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                {submitting ? 'Reservando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── Modal Seleccionar Cantidad de Lugares ─── */}
      <Modal
        title="Seleccionar Cantidad de Pasajeros"
        open={!!quantityModalProduct}
        onClose={closeQuantityModal}
        size="md"
      >
        {quantityModalProduct && (
          <form onSubmit={handleConfirmQuantityModal} className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900">{quantityModalProduct.codigo_cupo}</span>
                <Badge variant={getAvailabilityVariant(Number(quantityModalProduct.disponibilidad))}>
                  {quantityModalProduct.disponibilidad} disponible(s)
                </Badge>
              </div>
              <div className="text-slate-600 text-xs grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/60">
                <div><span className="text-slate-400">Destino:</span> {quantityModalProduct.destino}</div>
                <div><span className="text-slate-400">Compañía:</span> {quantityModalProduct.compania}</div>
                <div><span className="text-slate-400">Salida:</span> {formatDate(quantityModalProduct.fecha_salida)}</div>
                <div><span className="text-slate-400">Regreso:</span> {formatDate(quantityModalProduct.fecha_regreso)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                ¿Cuántos lugares querés reservar?
              </label>
              <p className="text-xs text-slate-500">
                Se bloquearán temporalmente los cupos mientras completás los datos del formulario.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPassengerCount((prev) => Math.max(1, prev - 1))}
                  disabled={passengerCount <= 1 || quantitySubmitting}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={Number(quantityModalProduct.disponibilidad) || 1}
                  value={passengerCount}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(Number(quantityModalProduct.disponibilidad) || 1, Number(e.target.value) || 1));
                    setPassengerCount(val);
                  }}
                  disabled={quantitySubmitting}
                  className="h-10 w-24 rounded-xl border border-slate-300 px-3 text-center text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setPassengerCount((prev) => Math.min(Number(quantityModalProduct.disponibilidad) || 1, prev + 1))}
                  disabled={passengerCount >= (Number(quantityModalProduct.disponibilidad) || 1) || quantitySubmitting}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {quantityError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{quantityError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
              <Button variant="secondary" type="button" onClick={closeQuantityModal} disabled={quantitySubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={quantitySubmitting}>
                {quantitySubmitting ? 'Reservando...' : 'Reservar cupo'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Modal Buscar Contacto en Atlas ─── */}
      <Modal
        title={typeof atlasTarget === 'number' ? `Buscar en Atlas para Pasajero ${atlasTarget + 1}` : 'Buscar contacto en Atlas'}
        open={atlasModalOpen}
        onClose={handleCloseAtlasSearch}
        size="md"
      >
        <form onSubmit={handleSearchAtlas} className="space-y-4">
          <p className="text-sm text-slate-600">
            Buscá un contacto ya cargado en Atlas por documento, email, celular o nombre para autocompletar
            {typeof atlasTarget === 'number' ? ' los datos de este pasajero.' : ' los datos de contacto.'}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Buscar por</label>
              <select
                value={atlasFiltroTipo}
                onChange={(e) => setAtlasFiltroTipo(e.target.value)}
                disabled={atlasSearching || atlasApplying}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
              >
                <option value="documento">Documento</option>
                <option value="email">Email</option>
                <option value="celular">Celular</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Valor *</label>
              <input
                type="text"
                value={atlasValor}
                onChange={(e) => setAtlasValor(e.target.value)}
                placeholder="Ej: 12345678"
                autoFocus
                disabled={atlasSearching || atlasApplying}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {atlasResultados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">Se encontraron {atlasResultados.length} contactos — elegí uno:</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {atlasResultados.map((contacto) => (
                  <button
                    key={contacto.contacto_codigo}
                    type="button"
                    disabled={atlasApplying}
                    onClick={() => applyAtlasContacto(contacto.contacto_codigo)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-slate-900">{contacto.nombre || 'Sin nombre'}</div>
                    <div className="text-xs text-slate-500">
                      {[contacto.documento, contacto.email, contacto.celular].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {atlasError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{atlasError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" type="button" onClick={handleCloseAtlasSearch} disabled={atlasSearching || atlasApplying}>
              Cancelar
            </Button>
            <Button type="submit" disabled={atlasSearching || atlasApplying || !atlasValor.trim()}>
              {atlasSearching || atlasApplying ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {atlasApplying ? 'Aplicando...' : 'Buscando...'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Search className="h-4 w-4" />
                  Buscar
                </span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal Ver Ruta ─── */}
      {routeModalProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setRouteModalProduct(null)}>
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl max-h-screen sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Detalle de Ruta
                  </h2>
                  <p className="text-sm text-slate-500">
                    {routeModalProduct.codigo_cupo} — {routeModalProduct.destino}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRouteModalProduct(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Contenido */}
            <div className="p-5">
              <ItineraryTable ruta={routeModalProduct.ruta} showCopyButton={true} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Modal Ver Notas ─── */}
      {notesModalProduct && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setNotesModalProduct(null)}>
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl max-h-screen sm:max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <StickyNote className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Notas del Producto</h2>
                  <p className="text-sm text-slate-500">
                    {notesModalProduct.codigo_cupo} — {notesModalProduct.destino}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesModalProduct(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  {notesModalProduct.notas_externas || 'Sin notas.'}
                </p>
              </div>
              {/* El backend ya no manda notas_internas a agencias no-admin —
                  si llega vacía, esta sección simplemente no se muestra. */}
              {notesModalProduct.notas_internas && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notas internas (solo admin)</h3>
                  <p className="whitespace-pre-wrap rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-700">
                    {notesModalProduct.notas_internas}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
