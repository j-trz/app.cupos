/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConnectionService from "../services/connectionService";
import { FaPlus, FaSync, FaEdit, FaTrash, FaPlay, FaTable, FaDatabase, FaCheckCircle, FaColumns } from 'react-icons/fa';
import { SiMongodb, SiTableau, SiSupabase } from 'react-icons/si';
import { TiVendorMicrosoft } from 'react-icons/ti';
import Swal from 'sweetalert2';
import DataMappingModal from "../components/DataMappingModal";
import DataTypeConnectionManager from "../components/DataTypeConnectionManager";

export default function GestionConexiones() {
  const [seccion, setSeccion] = useState("gestion-conexiones");
  const [conexiones, setConexiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingConnection, setMappingConnection] = useState(null);
  const [assignManagerOpen, setAssignManagerOpen] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    type: '',
    description: '',
    credentials: {}
  });

  useEffect(() => {
    fetchConexiones();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTypeDropdown && !event.target.closest('.type-dropdown')) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypeDropdown]);

  async function fetchConexiones() {
    setLoading(true);
    try {
      const result = await ConnectionService.getUserConnections();
      if (result.success) {
        setConexiones(result.connections);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las conexiones.' });
    }
    setLoading(false);
  }

  async function abrirModal(connection = null) {
    if (connection) {
      // Para editar, usar los datos de la conexión existente
      setFormData({
        id: connection.id,
        name: connection.name,
        type: connection.type,
        description: connection.description || '',
        credentials: {} // Las credenciales no se muestran por seguridad
      });
      setSelectedConnection(connection);
      setModalOpen(true);
    } else {
      setFormData({ id: null, name: '', type: '', description: '', credentials: {} });
      setSelectedConnection(null);
      setModalOpen(true);
    }
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const typeDef = supportedTypes.find(t => t.type === formData.type);
    if (typeDef) {
      const missingFields = typeDef.fields
        .filter(f => f.required && (!formData.credentials[f.name] || String(formData.credentials[f.name]).trim() === ""))
        .map(f => f.label);

      if (missingFields.length > 0) {
        Swal.fire({ icon: 'error', title: 'Campos Requeridos', text: `Por favor complete: ${missingFields.join(", ")}` });
        return;
      }
    }

    setLoading(true);
    try {
      if (formData.id) {
        // Actualizar conexión existente
        const updateData = {
          name: formData.name,
          description: formData.description
        };
        
        // Solo enviar credenciales si hay valores no vacíos
        const hasCredentials = Object.keys(formData.credentials).some(
          key => formData.credentials[key] && formData.credentials[key].trim() !== ''
        );
        
        if (hasCredentials) {
          updateData.credentials = formData.credentials;
        }
        
        await ConnectionService.updateConnection(formData.id, updateData);
      } else {
        // Crear nueva conexión
        await ConnectionService.createConnection(formData);
      }
      Swal.fire({ icon: 'success', title: 'Conexión Guardada', text: 'La conexión se ha guardado exitosamente.' });
      cerrarModal();
      await fetchConexiones();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMapping(connectionId, update) {
    setLoading(true);
    try {
      await ConnectionService.updateConnection(connectionId, update);
      await fetchConexiones();
      Swal.fire({ icon: 'success', title: 'Mapeo guardado', text: 'El mapeo se guardó correctamente.' });
      setMappingOpen(false);
      setMappingConnection(null);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar el mapeo.' });
    } finally {
      setLoading(false);
    }
  }

  async function testConnection(connection) {
    setLoading(true);
    try {
      const result = await ConnectionService.testConnection(connection);
      if (result.success) {
        Swal.fire({ icon: 'success', title: 'Conexión Exitosa', text: result.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Conexión Fallida', text: result.message });
      }
      await fetchConexiones();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function activateConnection(connectionId) {
    setLoading(true);
    try {
      await ConnectionService.setActiveConnection(connectionId);
      Swal.fire({ icon: 'success', title: 'Conexión Activada', text: 'La conexión ahora está activa.' });
      await fetchConexiones();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo activar la conexión: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function deleteConnection(connection) {
    const result = await Swal.fire({
      title: '¿Eliminar Conexión?',
      text: `Esto eliminará permanentemente la conexión "${connection.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await ConnectionService.deleteConnection(connection.id);
      Swal.fire({ icon: 'success', title: 'Conexión Eliminada', text: 'La conexión ha sido eliminada.' });
      await fetchConexiones();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  const supportedTypes = ConnectionService.getSupportedConnectionTypes();

  const getTypeIcon = (type) => {
    switch (type) {
      case 'powerautomate': return <TiVendorMicrosoft className="text-blue-600 text-2xl" />;
      case 'supabase': return <SiSupabase className="text-green-600 text-2xl" />;
      case 'smartsheet': return <FaTable className="text-orange-600 text-2xl" />;
      case 'mongodb': return <SiMongodb className="text-green-700 text-2xl" />;
      case 'tableau': return <SiTableau className="text-blue-500 text-2xl" />;
      default: return <FaDatabase className="text-gray-500 text-2xl" />;
    }
  };


  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c4b8b]">Gestión de Conexiones API</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setAssignManagerOpen(true)}
              className="flex items-center gap-2 bg-gray-100 text-[#2c4b8b] px-4 py-2 rounded hover:bg-gray-200 transition-colors"
            >
              <FaColumns />
              Asignar a sección
            </button>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] transition-colors"
            >
              <FaPlus />
              Nueva Conexión
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] bg-white border-0 rounded-2xl shadow-xl">
            <thead>
              <tr className="bg-[#2c4b8b] text-white">
                <th className="px-6 py-4 text-lg font-semibold rounded-tl-2xl">Tipo</th>
                <th className="px-6 py-4 text-lg font-semibold">Nombre</th>
                <th className="px-6 py-4 text-lg font-semibold">Descripción</th>
                <th className="px-6 py-4 text-lg font-semibold">Estado</th>
                <th className="px-6 py-4 text-lg font-semibold">Activa</th>
                <th className="px-6 py-4 text-lg font-semibold">Última Prueba</th>
                <th className="px-6 py-4 text-lg font-semibold rounded-tr-2xl">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && !modalOpen ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <FaSync className="animate-spin" />
                      <span>Cargando conexiones...</span>
                    </div>
                  </td>
                </tr>
              ) : conexiones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No hay conexiones configuradas
                  </td>
                </tr>
              ) : conexiones.map((connection) => (
                <tr key={connection.id} className="last:border-b-0 cursor-pointer transition-all duration-150 hover:bg-[#e6f0fa] group" style={{ height: '64px' }}>
                  <td className="px-6 py-4 text-center">{getTypeIcon(connection.type)}</td>
                  <td className="px-6 py-4 text-base whitespace-nowrap">
                    <span className="font-medium">{connection.name}</span>
                  </td>
                  <td className="px-6 py-4 text-base">
                    <span className="block truncate max-w-xs" title={connection.description}>
                      {connection.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {connection.connection_status === 'connected' ? (
                      <span className="px-2 py-2 inline-flex text-md leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Conectado
                      </span>
                    ) : connection.connection_status === 'failed' ? (
                      <span className="px-2 py-2 inline-flex text-md leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Fallido
                      </span>
                    ) : (
                      <span className="px-2 py-2 inline-flex text-md leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Desconocido
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {connection.is_active ? (
                      <span className="inline-flex">
                        <FaCheckCircle className="text-green-500 text-xl" />
                      </span>
                    ) : (
                      <button
                        onClick={() => activateConnection(connection.id)}
                        className="text-gray-400 hover:text-green-500 transition-colors"
                        title="Activar conexión"
                      >
                        <FaCheckCircle className="text-xl" />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-base whitespace-nowrap text-center">
                    {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleDateString() : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => testConnection(connection)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        title="Probar Conexión"
                      >
                        <FaPlay className="inline" />
                      </button>
                      <button
                        onClick={() => { setMappingConnection(connection); setMappingOpen(true); }}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                        title="Configurar Mapeo"
                      >
                        <FaColumns className="inline" />
                      </button>
                      <button
                        onClick={() => abrirModal(connection)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        title="Editar"
                      >
                        <FaEdit className="inline" />
                      </button>
                      <button
                        onClick={() => deleteConnection(connection)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                        title="Eliminar"
                      >
                        <FaTrash className="inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">
                  {selectedConnection ? 'Editar Conexión' : 'Nueva Conexión'}
                </h2>
                <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Conexión</label>
                  <div className="relative type-dropdown">
                    <div
                      onClick={() => !selectedConnection && setShowTypeDropdown(!showTypeDropdown)}
                      className={`w-full px-3 py-2 border rounded cursor-pointer bg-white flex items-center justify-between ${selectedConnection ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {formData.type ? (
                        <div className="flex items-center gap-2">
                          {getTypeIcon(formData.type)}
                          <span>{supportedTypes.find(t => t.type === formData.type)?.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Seleccione un tipo...</span>
                      )}
                    </div>
                    {showTypeDropdown && !selectedConnection && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {supportedTypes.map(type => (
                          <div
                            key={type.type}
                            onClick={() => {
                              const initialCreds = {};
                              type.fields.forEach(f => { initialCreds[f.name] = ""; });
                              setFormData({...formData, type: type.type, credentials: initialCreds});
                              setShowTypeDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          >
                            {getTypeIcon(type.type)}
                            <span>{type.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                  />
                </div>

                {formData.type && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium mb-3">Credenciales para {supportedTypes.find(t => t.type === formData.type)?.name}</h3>
                    {supportedTypes.find(t => t.type === formData.type)?.fields.map(field => (
                      <div key={field.name} className="mb-3">
                        <label className="block text-sm font-medium mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={formData.credentials[field.name] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: { ...formData.credentials, [field.name]: e.target.value }
                          })}
                          className="w-full px-3 py-2 border rounded text-sm"
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={cerrarModal} className="flex-1 px-4 py-2 border rounded">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[#2c4b8b] text-white rounded disabled:opacity-50">
                    {loading ? 'Guardando...' : 'Guardar Conexión'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mappingOpen && (
          <DataMappingModal
            isOpen={mappingOpen}
            onClose={() => { setMappingOpen(false); setMappingConnection(null); }}
            connection={mappingConnection}
            onSave={handleSaveMapping}
          />
        )}

        {assignManagerOpen && (
          <DataTypeConnectionManager
            isOpen={assignManagerOpen}
            onClose={() => setAssignManagerOpen(false)}
          />
        )}
      </div>
    </Layout>
  );
}