import React, { useEffect, useState } from "react";
import Layout from '../components/Layout';

function formatearFecha(fecha) {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleDateString("es-ES");
  } catch {
    return fecha;
  }
}

export default function Disponibilidad() {
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
  const [enviando, setEnviando] = useState(false);

  // Cargar disponibilidad al montar
  useEffect(() => {
    fetchDisponibilidad();
  }, []);

  async function fetchDisponibilidad() {
    setLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_POWERAUTOMATE_GET_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        setDatos(await response.json());
      } else {
        setDatos([]);
      }
    } catch {
      setDatos([]);
    }
    setLoading(false);
  }

  // Eliminado: función de login

  // Abrir modal reserva
  function abrirReserva(vuelo) {
    setVueloSeleccionado(vuelo);
    setPedidoId(`PED-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`);
    setPasajeros([
      { nombre: "", apellido: "", documento: "", nacimiento: "", nacionalidad: "", tipo: "Adulto" }
    ]);
    setModalOpen(true);
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

  // Enviar reserva
  async function enviarReserva(e) {
    e.preventDefault();
    setEnviando(true);
    const registros = pasajeros.map(p => ({
      pedido_id: pedidoId,
      agencia: contacto.agencia,
      contacto_nombre: contacto.nombre,
      contacto_email: contacto.email,
      contacto_telefono: contacto.telefono,
      vuelo_codigo: vueloSeleccionado.codigo_cupo,
      vuelo_destino: vueloSeleccionado.destino,
      vuelo_compania: vueloSeleccionado.compania,
      vuelo_salida: vueloSeleccionado.salida,
      vuelo_precio: vueloSeleccionado.precio,
      nombre_pasajero: p.nombre,
      apellido_pasajero: p.apellido,
      documento_pasajero: p.documento,
      nacimiento_pasajero: p.nacimiento,
      nacionalidad_pasajero: p.nacionalidad,
      tipo_pasajero: p.tipo
    }));

    let exitos = 0, errores = 0;
    for (const registro of registros) {
      try {
        const response = await fetch(import.meta.env.VITE_POWERAUTOMATE_POST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registro)
        });
        if (response.ok) exitos++;
        else errores++;
      } catch {
        errores++;
      }
    }
    setEnviando(false);
    setModalOpen(false);
    fetchDisponibilidad();
    alert(`Reservas exitosas: ${exitos}, con error: ${errores}`);
  }

  // Render directo, sin login

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c4b8b]">Disponibilidad de Cupos Aéreos</h1>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center">Código Cupo</th>
                <th className="px-6 py-3 text-center">Destino</th>
                <th className="px-6 py-3 text-center">Compañía</th>
                <th className="px-6 py-3 text-center">Disponibilidad</th>
                <th className="px-6 py-3 text-center">Salida</th>
                <th className="px-6 py-3 text-center">Regreso</th>
                <th className="px-6 py-3 text-center">Precio</th>
                <th className="px-6 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-gray-500">Cargando datos...</td>
                </tr>
              ) : datos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-gray-500">No hay datos disponibles</td>
                </tr>
              ) : datos.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-center">{item.codigo_cupo}</td>
                  <td className="px-6 py-4 text-center">{item.destino}</td>
                  <td className="px-6 py-4 text-center">{item.compania}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.disponibilidad > 5 ? "bg-green-100 text-green-800" :
                      item.disponibilidad > 0 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {item.disponibilidad || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{formatearFecha(item.salida)}</td>
                  <td className="px-6 py-4 text-center">{formatearFecha(item.regreso)}</td>
                  <td className="px-6 py-4 text-center">${item.precio ? parseFloat(item.precio).toFixed(2) : "0.00"}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => abrirReserva(item)} className="bg-blue-800 text-white px-3 py-1 rounded text-sm">Solicitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>

      {/* Modal reserva */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Formulario de Reserva</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={enviarReserva} className="p-6 space-y-6">
              <label className="block text-sm font-medium mb-1">Número de Pedido</label>
              <input type="text" value={pedidoId} readOnly className="w-[200px] px-3 py-2 border rounded bg-gray-100" />
              {/* Info vuelo */}
              <div className="bg-blue-50 border rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Código</p>
                    <p className="font-medium">{vueloSeleccionado.codigo_cupo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Destino</p>
                    <p className="font-medium">{vueloSeleccionado.destino}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Compañía</p>
                    <p className="font-medium">{vueloSeleccionado.compania}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Salida</p>
                    <p className="font-medium">{formatearFecha(vueloSeleccionado.salida)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Precio</p>
                    <p className="font-medium">${vueloSeleccionado.precio ? parseFloat(vueloSeleccionado.precio).toFixed(2) : "0.00"}</p>
                  </div>
                </div>
              </div>
              {/* Contacto */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" required placeholder="Nombre Contacto" value={contacto.nombre} onChange={e => cambiarContacto("nombre", e.target.value)} className="w-full px-3 py-2 border rounded" />
                  <input type="email" required placeholder="Email" value={contacto.email} onChange={e => cambiarContacto("email", e.target.value)} className="w-full px-3 py-2 border rounded" />
                  <input type="tel" required placeholder="Teléfono" value={contacto.telefono} onChange={e => cambiarContacto("telefono", e.target.value)} className="w-full px-3 py-2 border rounded" />
                  <input type="text" placeholder="Agencia" value={contacto.agencia} onChange={e => cambiarContacto("agencia", e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              {/* Pasajeros */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Pasajeros</h3>
                  <button type="button" onClick={agregarPasajero} className="bg-green-500 text-white px-4 py-2 rounded text-sm">+ Agregar Pasajero</button>
                </div>
                {pasajeros.map((p, idx) => (
                  <div key={idx} className="pasajero-item bg-gray-50 border rounded-lg p-4 mb-2">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium">Pasajero {idx + 1}</h4>
                      {pasajeros.length > 1 && (
                        <button type="button" onClick={() => eliminarPasajero(idx)} className="text-red-500 text-sm">Eliminar</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <input type="text" required placeholder="Nombre" value={p.nombre} onChange={e => cambiarPasajero(idx, "nombre", e.target.value)} className="w-full px-2 py-1 border rounded" />
                      <input type="text" required placeholder="Apellido" value={p.apellido} onChange={e => cambiarPasajero(idx, "apellido", e.target.value)} className="w-full px-2 py-1 border rounded" />
                      <input type="text" required placeholder="Documento" value={p.documento} onChange={e => cambiarPasajero(idx, "documento", e.target.value)} className="w-full px-2 py-1 border rounded" />
                      <input type="date" required placeholder="Nacimiento" value={p.nacimiento} onChange={e => cambiarPasajero(idx, "nacimiento", e.target.value)} className="w-full px-2 py-1 border rounded" />
                      <input type="text" required placeholder="Nacionalidad" value={p.nacionalidad} onChange={e => cambiarPasajero(idx, "nacionalidad", e.target.value)} className="w-full px-2 py-1 border rounded" />
                      <select value={p.tipo} onChange={e => cambiarPasajero(idx, "tipo", e.target.value)} className="w-full px-2 py-1 border rounded">
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
                <button type="submit" disabled={enviando} className="bg-blue-800 text-white py-3 px-8 rounded shadow-md">{enviando ? "Enviando..." : "Enviar Reserva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </Layout>
  );
}