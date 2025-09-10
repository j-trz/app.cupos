import { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import Layout from '../components/Layout'; // eslint-disable-line no-unused-vars
import DataSourceInfo from '../components/DataSourceInfo';// eslint-disable-line no-unused-vars
import ReservationService from '../services/reservationService';
import { useCredentials } from "../contexts/CredentialsContext";
import UserService from '../services/userService';
import { FaSync } from 'react-icons/fa';// eslint-disable-line no-unused-vars


export default function Disponibilidad() {
  const [popupRutaOpen, setPopupRutaOpen] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [seccion, setSeccion] = useState('disponibilidad');
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
  const [pedidoId, setPedidoId] = useState("");
  const [pasajeros, setPasajeros] = useState([
    { nombre: "", apellido: "", documento: "", nacimiento: "", nacionalidad: "", tipo: "Adulto" }
  ]);
  const [contacto, setContacto] = useState({ nombre: "", email: "", telefono: "", agencia: "" });
  useEffect(() => {
    async function cargarDatosUsuario() {
      try {
        const perfil = await UserService.getCurrentUserProfile();
        if (perfil) {
          setContacto(c => ({
            ...c,
            agencia: perfil.agencia || "",
            nombre: perfil.nombre || "",
            email: perfil.email || ""
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
    cargarDatosUsuario();
  }, []);
  const [enviando, setEnviando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const { getDecryptedCredentials } = useCredentials();

  // Cargar disponibilidad al montar
  useEffect(() => {
    fetchDisponibilidad();
  }, []);

  async function fetchDisponibilidad(forceRefresh = false) {
    setLoading(true);
    try {
      const result = await ReservationService.getAvailability(getDecryptedCredentials, !forceRefresh);
      if (result.success) {
        setDatos(result.data);
      } else {
        setDatos([]);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setDatos([]);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudieron cargar los datos. Verifica tu conexión e intenta nuevamente.',
        confirmButtonText: 'Entendido'
      });
    }
    setLoading(false);
  }

  async function refrescarDatos() {
    setRefrescando(true);
    try {
      ReservationService.refreshCache();
      await fetchDisponibilidad(true);
      Swal.fire({
        icon: 'success',
        title: 'Datos actualizados',
        text: 'Los datos se han actualizado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    setRefrescando(false);
  }

  // Eliminado: función de login

  // Abrir modal reserva
  function abrirReserva(vuelo) {
    try {
      // Validar disponibilidad antes de abrir modal
      if (pasajeros.length > 0) {
        ReservationService.validateAvailability(vuelo, pasajeros);
      }
      
      setVueloSeleccionado(vuelo);
      setPedidoId(ReservationService.generatePedidoId());
      setPasajeros([
        { nombre: "", apellido: "", documento: "", nacimiento: "", nacionalidad: "", tipo: "Adulto" }
      ]);
      setModalOpen(true);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });
    }
  }

  // Agregar pasajero
  function agregarPasajero() {
    setPasajeros([...pasajeros, { nombre: "", apellido: "", documento: "", nacimiento: "", nacionalidad: "", tipo: "Adulto" }]);
  }

  // Eliminar pasajero
  function eliminarPasajero(idx) {
    setPasajeros(pasajeros.filter((_, i) => i !== idx));
  }

  // Cambiar datos pasajero
  function cambiarPasajero(idx, campo, valor) {
    setPasajeros(pasajeros.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  }

  // Cambiar datos contacto
  function cambiarContacto(campo, valor) {
    setContacto({ ...contacto, [campo]: valor });
  }

  // Enviar reserva usando el servicio seguro
  async function enviarReserva(e) {
    e.preventDefault();
    setEnviando(true);
    
    try {
      // Validar disponibilidad final antes de enviar
      ReservationService.validateAvailability(vueloSeleccionado, pasajeros);
      
      const reservationData = {
        pedidoId,
        vuelo: vueloSeleccionado,
        pasajeros,
        contacto
      };

      const result = await ReservationService.submitReservation(reservationData);
      
      if (result.success) {
        const { successful, failed, total } = result.results;
        
        Swal.fire({
          icon: successful === total ? 'success' : 'warning',
          title: 'Reserva Procesada',
          html: `
            <p><strong>Número de referencia:</strong> ${result.referenceId}</p>
            <p><strong>Total procesados:</strong> ${total}</p>
            <p><strong>Exitosos:</strong> ${successful}</p>
            <p><strong>Con errores:</strong> ${failed}</p>
          `,
          confirmButtonText: 'Entendido'
        });
        
        // Limpiar formulario y actualizar datos
        setModalOpen(false);
        await fetchDisponibilidad(true); // Forzar actualización después de reserva
      }
    } catch (error) {
      console.error('Error submitting reservation:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error en la Reserva',
        text: error.message || 'No se pudo procesar la reserva'
      });
    } finally {
      setEnviando(false);
    }
  }

  // Render directo, sin login

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary text-[#2c4b8b]">Disponibilidad</h1>
          <button
            onClick={refrescarDatos}
            disabled={loading || refrescando}
            className="flex items-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] disabled:opacity-50 transition-colors"
          >
            <FaSync className={`${refrescando ? 'animate-spin' : ''}`} />
            {refrescando ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>
        
        {/* Información de fuente de datos - Solo para admins */}
        <DataSourceInfo />
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] bg-white border-0 rounded-2xl shadow-xl">
            <thead>
              <tr className="bg-[#2c4b8b] text-white">
                <th className="px-6 py-4 text-lg font-semibold rounded-tl-2xl">Código Cupo</th>
                <th className="px-6 py-4 text-lg font-semibold">Destino</th>
                <th className="px-6 py-4 text-lg font-semibold">Compañía</th>
                <th className="px-6 py-4 text-lg font-semibold">Disponibilidad</th>
                <th className="px-6 py-4 text-lg font-semibold">Salida</th>
                <th className="px-6 py-4 text-lg font-semibold">Regreso</th>
                <th className="px-6 py-4 text-lg font-semibold">Precio</th>
                <th className="px-6 py-4 text-lg font-semibold">Temporada</th>
                <th className="px-6 py-4 text-lg font-semibold">Ruta</th>
                <th className="px-6 py-4 text-lg font-semibold rounded-tr-2xl">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <FaSync className="animate-spin" />
                      <span>Cargando datos de disponibilidad...</span>
                    </div>
                  </td>
                </tr>
              ) : datos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">No hay datos disponibles</td>
                </tr>
              ) : datos.map((item, idx) => (
                <tr key={idx} className="last:border-b-0 cursor-pointer transition-all duration-150 hover:bg-[#e6f0fa] group" style={{ height: '64px' }}>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.codigo_cupo}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.destino}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.compania}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-2 inline-flex text-md leading-5 font-semibold rounded-full ${
                      item.disponibilidad > 5 ? "bg-green-100 text-green-800" :
                      item.disponibilidad > 0 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {item.disponibilidad || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{ReservationService.formatDate(item.salida)}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{ReservationService.formatDate(item.regreso)}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">${item.precio ? parseFloat(item.precio).toFixed(2) : "0.00"}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.temporada || ""}</td>
                  <td className="px-6 py-4 text-center">{item.ruta ? <button className="bg-[#2c4b8b] text-white px-3 py-1 rounded text-sm hover:bg-[#1e355e] transition-colors" onClick={() => { setRutaSeleccionada(item.ruta); setPopupRutaOpen(true); }}>Ver vuelos</button> : ""}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => abrirReserva(item)} className="bg-[#2c4b8b] text-white px-3 py-1 rounded text-sm hover:bg-[#1e355e] transition-colors">Solicitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* Modal reserva */}
      {/* Popup ruta */}
      {popupRutaOpen && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[800px] h-auto overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#2c4b8b]">Itinerario Aéreo</h2>
              <button onClick={() => setPopupRutaOpen(false)} className="text-[#2c4b8b] hover:text-gray-600 text-2xl">&times;</button>
            </div>
            {/* Parsear y mostrar la ruta como tabla */}
            {rutaSeleccionada ? (
              (() => {
                // Formato correcto: AD 1234 10OCT MVD REC 1040 1140
                // Cada vuelo son 7 tokens separados
                const tokens = String(rutaSeleccionada)
                  .replace(/\n/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .split(' ');
                const vuelos = [];
                for (let i = 0; i < tokens.length; i += 7) {
                  if (tokens.length - i >= 7) {
                    vuelos.push({
                      compania: tokens[i],
                      vuelo: tokens[i+1],
                      fecha: tokens[i+2],
                      origen: tokens[i+3],
                      destino: tokens[i+4],
                      salida: tokens[i+5],
                      llegada: tokens[i+6]
                    });
                  }
                }
                if (vuelos.length === 0) {
                  return <div className="text-gray-500">No hay datos de ruta disponibles.</div>;
                }
                return (
                  <table className="w-full bg-white border-0 rounded-2xl shadow-xl">
                    <thead>
                      <tr className="bg-[#2c4b8b] text-white">
                        <th className="px-4 py-3 text-sm font-semibold rounded-tl-2xl">Compañía</th>
                        <th className="px-4 py-3 text-sm font-semibold">Nro Vuelo</th>
                        <th className="px-4 py-3 text-sm font-semibold">Fecha</th>
                        <th className="px-4 py-3 text-sm font-semibold">Origen</th>
                        <th className="px-4 py-3 text-sm font-semibold">Destino</th>
                        <th className="px-4 py-3 text-sm font-semibold">Salida</th>
                        <th className="px-4 py-3 text-sm font-semibold rounded-tr-2xl">Llegada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vuelos.map((v, i) => (
                        <tr key={i} className="last:border-b-0 transition-all duration-150 hover:bg-[#e6f0fa]" style={{ height: '48px' }}>
                          <td className="px-4 py-2 text-sm text-center">{v.compania}</td>
                          <td className="px-4 py-2 text-sm text-center">{v.vuelo}</td>
                          <td className="px-4 py-2 text-sm text-center">{v.fecha}</td>
                          <td className="px-4 py-2 text-sm text-center">{v.origen}</td>
                          <td className="px-4 py-2 text-sm text-center">{v.destino}</td>
                          <td className="px-4 py-2 text-sm text-center">{v.salida}</td>
                          <td className="px-4 py-2 text-sm text-center">{v.llegada}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            ) : (
              <div className="text-gray-500">No hay datos de ruta disponibles.</div>
            )}
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-[#2c4b8b]">Formulario de Reserva</h2>
              <button onClick={() => setModalOpen(false)} className="text-[#2c4b8b] hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={enviarReserva} className="p-6 space-y-6 text-[#2c4b8b]">
              <label className="block text-sm font-medium mb-1">Número de Pedido</label>
              <input type="text" value={pedidoId} readOnly className="w-[200px] px-3 py-2 border rounded bg-gray-100 focus:ring-0 focus:border-[#2c4b8b]" />
              {/* Info vuelo */}
              <div className="bg-blue-50 border rounded-lg p-4 mb-6 text-[#2c4b8b]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#2c4b8b]">Código</p>
                    <p className="font-medium">{vueloSeleccionado.codigo_cupo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#2c4b8b]">Destino</p>
                    <p className="font-medium">{vueloSeleccionado.destino}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#2c4b8b]">Compañía</p>
                    <p className="font-medium">{vueloSeleccionado.compania}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#2c4b8b]">Salida</p>
                    <p className="font-medium">{ReservationService.formatDate(vueloSeleccionado.salida)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#2c4b8b]">Precio</p>
                    <p className="font-medium">${vueloSeleccionado.precio ? parseFloat(vueloSeleccionado.precio).toFixed(2) : "0.00"}</p>
                  </div>
                </div>
              </div>
              {/* Contacto */}
              <div className="bg-gray-50 border rounded-lg p-4 text-[#2c4b8b]">
                <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" required placeholder="Nombre Contacto" value={contacto.nombre} onChange={e => cambiarContacto("nombre", e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-gray-300" />
                  <input type="email" required placeholder="Email" value={contacto.email} onChange={e => cambiarContacto("email", e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-gray-300" />
                  <input type="tel" required placeholder="Teléfono" value={contacto.telefono} onChange={e => cambiarContacto("telefono", e.target.value)} className="w-full px-3 py-2 border rounded focus:outline-none focus:border-gray-300" />
                  <input type="text" placeholder="Agencia" value={contacto.agencia} readOnly className="w-full px-3 py-2 border rounded bg-gray-100 focus:outline-none focus:border-gray-300" />
                </div>
              </div>
              {/* Pasajeros */}
              <div className="bg-white border rounded-lg p-4 text-[#2c4b8b]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Pasajeros</h3>
                  <button type="button" onClick={agregarPasajero} className="bg-green-600 text-white px-4 py-2 rounded text-sm">+ Agregar Pasajero</button>
                </div>
                {pasajeros.map((p, idx) => (
                  <div key={idx} className="pasajero-item bg-gray-50 border rounded-lg p-4 mb-2 text-[#2c4b8b]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium">Pasajero {idx + 1}</h4>
                      {pasajeros.length > 1 && (
                        <button type="button" onClick={() => eliminarPasajero(idx)} className="text-red-500 text-sm">Eliminar</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[#2c4b8b]">
                      <input type="text" required placeholder="Nombre" value={p.nombre} onChange={e => cambiarPasajero(idx, "nombre", e.target.value)} className="w-full px-2 py-1 border rounded focus:outline-none focus:border-gray-300" />
                      <input type="text" required placeholder="Apellido" value={p.apellido} onChange={e => cambiarPasajero(idx, "apellido", e.target.value)} className="w-full px-2 py-1 border rounded focus:outline-none focus:border-gray-300" />
                      <input type="text" required placeholder="Documento de viaje" value={p.documento} onChange={e => cambiarPasajero(idx, "documento", e.target.value)} className="w-full px-2 py-1 border rounded focus:outline-none focus:border-gray-300" />
                      <input type="date" required placeholder="Nacimiento" value={p.nacimiento} onChange={e => cambiarPasajero(idx, "nacimiento", e.target.value)} className="w-full px-2 py-1 border rounded focus:outline-none focus:border-gray-300" />
                      <input type="text" required placeholder="Nacionalidad" value={p.nacionalidad} onChange={e => cambiarPasajero(idx, "nacionalidad", e.target.value)} className="w-full px-2 py-1 border rounded focus:outline-none focus:border-gray-300" />
                      <select value={p.tipo} onChange={e => cambiarPasajero(idx, "tipo", e.target.value)} className="w-full px-2 py-1 border rounded focus:outline-none focus:border-gray-300">
                        <option value="Adulto">Adulto</option>
                        <option value="Niño">Niño</option>
                        <option value="Bebé">Bebé</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center space-x-4">
                <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-500 text-white py-3 px-8 rounded">Cancelar</button>
                <button type="submit" disabled={enviando} className="bg-[#2c4b8b] text-white py-3 px-8 rounded shadow-md">{enviando ? "Enviando..." : "Enviar Reserva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}