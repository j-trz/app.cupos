import React, { useEffect, useState } from "react";
// Filtros deben ir dentro del componente
import Layout from "../components/Layout";
import { supabase } from '../supabaseClient';

export default function Solicitudes() {
  const [seccion, setSeccion] = useState("solicitudes");
  const [datos, setDatos] = useState([]);
  // const [loading, setLoading] = useState(true);
  // const [perfil, setPerfil] = useState(null);

// Filtros
const [filtroEstado, setFiltroEstado] = useState("");
const [filtroAgencia, setFiltroAgencia] = useState("");
const [filtroDestino, setFiltroDestino] = useState("");
const [filtroPedido, setFiltroPedido] = useState("");
const [filtroFechaDesde] = useState("");
const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

useEffect(() => {
  let intervalId;
  async function fetchPerfilYDatos() {
    // setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setDatos([]);
      // setLoading(false);
      return;
    }
    const { data: perfilData } = await supabase
      .from('profiles')
      .select('admin, agencia')
      .eq('id', user.id)
      .single();
    try {
      const response = await fetch(import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      let all = response.ok ? await response.json() : [];
      all = all.filter(item => item.Estado === "Solicitado");
      if (!perfilData?.admin && perfilData?.agencia) {
        all = all.filter(item => item.Agencia === perfilData.agencia);
      }
      setDatos(all);
    } catch {
      setDatos([]);
    }
    // setLoading(false);
  }
  fetchPerfilYDatos();
  intervalId = setInterval(fetchPerfilYDatos, 30000);
  return () => clearInterval(intervalId);
}, []);

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
        <h1 className="text-2xl font-bold text-[#2c4b8b] mb-4">Solicitudes</h1>
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
              className="border px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b]"
              placeholder="Buscar Pedido ID"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => setFiltroFechaHasta(e.target.value)}
              className="border px-2 py-1 rounded focus:ring-0 focus:border-[#2c4b8b]"
            />
          </div>
        </div>
        </div>
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Pedido ID</th>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Agencia</th>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Contacto</th>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Vuelo Destino</th>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Nombre Pasajero</th>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Estado</th>
              <th className="px-4 py-2 text-center text-[#2c4b8b]">Fecha Registro</th>
            </tr>
          </thead>
          <tbody>
            {datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">No hay solicitudes registradas</td>
              </tr>
            ) : datosFiltrados.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-center">{item.Pedido_ID}</td>
                <td className="px-4 py-2 text-center">{item.Agencia}</td>
                <td className="px-4 py-2 text-center">{item.Contacto_Nombre}</td>
                <td className="px-4 py-2 text-center">{item.Vuelo_Destino}</td>
                <td className="px-4 py-2 text-center">{item.Nombre_Pasajero} {item.Apellido_Pasajero}</td>
                <td className="px-4 py-2 text-center">{item.Estado}</td>
                <td className="px-4 py-2 text-center">{item.Fecha_Registro ? new Date(item.Fecha_Registro).toLocaleDateString("es-ES") : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </Layout>
  );
}
