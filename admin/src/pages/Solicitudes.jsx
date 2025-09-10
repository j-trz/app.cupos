import React, { useEffect, useState } from "react";// eslint-disable-line no-unused-vars
import Layout from "../components/Layout";// eslint-disable-line no-unused-vars
import DataSourceInfo from '../components/DataSourceInfo';// eslint-disable-line no-unused-vars
import ReservationService from '../services/reservationService';
import { useCredentials } from '../contexts/CredentialsContext';
import { FaSync } from 'react-icons/fa';// eslint-disable-line no-unused-vars
import Swal from 'sweetalert2';

export default function Solicitudes() {
  const [seccion, setSeccion] = useState("solicitudes");
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [popupItinerarioOpen, setPopupItinerarioOpen] = useState(false);
  const [itinerarioSeleccionado, setItinerarioSeleccionado] = useState(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroAgencia, setFiltroAgencia] = useState("");
  const [filtroDestino, setFiltroDestino] = useState("");
  const [filtroPedido, setFiltroPedido] = useState("");
  const [filtroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const { getDecryptedCredentials } = useCredentials();

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  async function fetchSolicitudes(forceRefresh = false) {
    setLoading(true);
    try {
      const result = await ReservationService.getRequests(getDecryptedCredentials, !forceRefresh);
      if (result.success) {
        setDatos(result.data);
      } else {
        setDatos([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setDatos([]);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudieron cargar las solicitudes. Verifica tu conexión e intenta nuevamente.',
        confirmButtonText: 'Entendido'
      });
    }
    setLoading(false);
  }

  async function refrescarDatos() {
    setRefrescando(true);
    try {
      ReservationService.refreshCache();
      await fetchSolicitudes(true);
      Swal.fire({
        icon: 'success',
        title: 'Datos actualizados',
        text: 'Las solicitudes se han actualizado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    setRefrescando(false);
  }

  function mostrarItinerario(itinerario) {
    setItinerarioSeleccionado(itinerario);
    setPopupItinerarioOpen(true);
  }

  // Opciones únicas para select
  const agenciasUnicas = Array.from(new Set(datos.map(d => d.Agencia))).filter(Boolean);
  const destinosUnicos = Array.from(new Set(datos.map(d => d.Vuelo_Destino))).filter(Boolean);
  const estadosUnicos = Array.from(new Set(datos.map(d => d.Estado))).filter(Boolean);

  // Filtrado avanzado
  const datosFiltrados = datos.filter(item => {
    if (filtroEstado && item.Estado !== filtroEstado) return false;
    if (filtroAgencia && item.Agencia !== filtroAgencia) return false;
    if (filtroPedido && !item.Pedido_ID?.toLowerCase().includes(filtroPedido.toLowerCase())) return false;
    // if (filtroPedido && !item.Pedido_ID?.toLowerCase().includes(filtroPedido.toLowerCase())) return false;
    if (filtroDestino && item.Vuelo_Destino !== filtroDestino) return false;
    if (filtroFechaDesde) {
      const fechaItem = item.Fecha_Registro ? new Date(item.Fecha_Registro) : null;
      if (!fechaItem || fechaItem < new Date(filtroFechaDesde)) return false;
    }
    if (filtroFechaHasta) {
      const fechaItem = item.Fecha_Registro ? new Date(item.Fecha_Registro) : null;
      if (!fechaItem || fechaItem > new Date(filtroFechaHasta)) return false;
    }
    return true;
  });

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c4b8b]">Solicitudes</h1>
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
        
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm mb-1">Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b]">
              <option value="">Todos</option>
              {estadosUnicos.map((est, i) => <option key={i} value={est}>{est}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Agencia</label>
            <select value={filtroAgencia} onChange={e => setFiltroAgencia(e.target.value)} className="border px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b]">
              <option value="">Todas</option>
              {agenciasUnicas.map((ag, i) => <option key={i} value={ag}>{ag}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Destino</label>
            <select value={filtroDestino} onChange={e => setFiltroDestino(e.target.value)} className="border px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b]">
              <option value="">Todos</option>
              {destinosUnicos.map((dest, i) => <option key={i} value={dest}>{dest}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Pedido ID</label>
            <input
              type="text"
              value={filtroPedido}
              onChange={e => setFiltroPedido(e.target.value)}
              className="border border-[#2c4b8b] text-[#2c4b8b] px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b] focus:outline-none"
              placeholder="Buscar Pedido ID"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => setFiltroFechaHasta(e.target.value)}
              className="border border-[#2c4b8b] text-[#2c4b8b] px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b] focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] bg-white border-0 rounded-2xl shadow-xl">
            <thead>
              <tr className="bg-[#2c4b8b] text-white">
                <th className="px-6 py-4 text-lg font-semibold rounded-tl-2xl">Pedido ID</th>
                <th className="px-6 py-4 text-lg font-semibold">Agencia</th>
                <th className="px-6 py-4 text-lg font-semibold">Contacto</th>
                <th className="px-6 py-4 text-lg font-semibold">Vuelo Destino</th>
                <th className="px-6 py-4 text-lg font-semibold">Nombre Pasajero</th>
                <th className="px-6 py-4 text-lg font-semibold">Temporada</th>
                <th className="px-6 py-4 text-lg font-semibold">Fecha Salida</th>
                <th className="px-6 py-4 text-lg font-semibold">Estado</th>
                <th className="px-6 py-4 text-lg font-semibold">Itinerario</th>
                <th className="px-6 py-4 text-lg font-semibold rounded-tr-2xl">Fecha de solicitud</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <FaSync className="animate-spin" />
                      <span>Cargando solicitudes...</span>
                    </div>
                  </td>
                </tr>
              ) : datosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">No hay solicitudes registradas</td>
                </tr>
              ) : datosFiltrados.map((item, idx) => (
                <tr key={idx} className="last:border-b-0 cursor-pointer transition-all duration-150 hover:bg-[#e6f0fa] group" style={{ height: '64px' }}>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Pedido_ID}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Agencia}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Contacto_Nombre}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Vuelo_Destino}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Nombre_Pasajero} {item.Apellido_Pasajero}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Temporada || "-"}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Vuelo_Salida ? new Date(item.Vuelo_Salida).toLocaleDateString("es-ES") : "-"}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Estado}</td>
                  <td className="px-6 py-4 text-center">
                    {item.Ruta ? (
                      <button
                        className="bg-[#2c4b8b] text-white px-3 py-1 rounded text-sm hover:bg-[#1e355e] transition-colors"
                        onClick={() => mostrarItinerario(item.Ruta)}
                      >
                        Ver Itinerario
                      </button>
                    ) : "-"}
                  </td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">{item.Fecha_Registro ? new Date(item.Fecha_Registro).toLocaleDateString("es-ES") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Popup Itinerario */}
        {popupItinerarioOpen && (
          <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-[800px] h-auto overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">Itinerario Aéreo</h2>
                <button onClick={() => setPopupItinerarioOpen(false)} className="text-[#2c4b8b] hover:text-gray-600 text-2xl">&times;</button>
              </div>
              {itinerarioSeleccionado ? (
                (() => {
                  // Parsear itinerario similar a como se hace en Disponibilidad
                  const tokens = String(itinerarioSeleccionado)
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
                    return <div className="text-gray-500">No hay datos de itinerario disponibles.</div>;
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
                <div className="text-gray-500">No hay datos de itinerario disponibles.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
