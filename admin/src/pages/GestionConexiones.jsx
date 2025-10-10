import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConnectionService from "../services/connectionService";
import { FaPlus, FaSync, FaEdit, FaTrash, FaPlay, FaTable, FaDatabase, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { SiMongodb, SiTableau, SiSupabase } from 'react-icons/si';
import { TiVendorMicrosoft } from 'react-icons/ti';
import Swal from 'sweetalert2';

export default function GestionConexiones() {
  const [conexiones, setConexiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

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
      const result = await ConnectionService.getConnections();
      if (result.success) {
        setConexiones(result.connections);
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load connections.' });
    }
    setLoading(false);
  }

  async function abrirModal(connection = null) {
    if (connection) {
      try {
        setLoading(true);
        const details = await ConnectionService.getConnectionDetails(connection.id);
        setFormData({
          id: details.id,
          name: details.name,
          type: details.type,
          description: details.description || '',
          credentials: details.credentials || {}
        });
        setSelectedConnection(details);
        setModalOpen(true);
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: `Could not fetch connection details: ${error.message}` });
      } finally {
        setLoading(false);
      }
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
        Swal.fire({ icon: 'error', title: 'Missing Required Fields', text: `Please complete: ${missingFields.join(", ")}` });
        return;
      }
    }

    setLoading(true);
    try {
      await ConnectionService.saveConnection(formData);
      Swal.fire({ icon: 'success', title: 'Connection Saved', text: 'The connection has been saved successfully.' });
      cerrarModal();
      await fetchConexiones();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function testConnection(connectionId) {
    setLoading(true);
    try {
      const result = await ConnectionService.testConnection(connectionId);
      if (result.success) {
        Swal.fire({ icon: 'success', title: 'Connection Successful', text: result.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Connection Failed', text: result.message });
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
      await ConnectionService.activateConnection(connectionId);
      Swal.fire({ icon: 'success', title: 'Connection Activated', text: 'The connection is now active.' });
      await fetchConexiones();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: `Could not activate connection: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function deleteConnection(connection) {
    const result = await Swal.fire({
      title: 'Delete Connection?',
      text: `This will permanently delete the connection "${connection.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await ConnectionService.deleteConnection(connection.id);
      Swal.fire({ icon: 'success', title: 'Connection Deleted', text: 'The connection has been deleted.' });
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

  const getStatusPill = (status) => {
    if (status === 'connected') {
      return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Connected</span>;
    }
    if (status === 'failed') {
      return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">Failed</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">Unknown</span>;
  };

  return (
    <Layout>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c4b8b]">API Connection Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] transition-colors"
            >
              <FaPlus />
              New Connection
            </button>
          </div>
        </div>

        {loading && !modalOpen ? (
          <div className="text-center py-10">
            <FaSync className="animate-spin text-4xl text-[#2c4b8b] mx-auto mb-4" />
            <p className="text-gray-500">Loading connections...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] bg-white">
              <thead>
                <tr className="bg-[#2c4b8b] text-white">
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Active</th>
                  <th className="px-6 py-3 text-left">Last Tested</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conexiones.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No connections configured.
                    </td>
                  </tr>
                ) : conexiones.map((connection) => (
                  <tr key={connection.id} className="border-b transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-center">{getTypeIcon(connection.type)}</td>
                    <td className="px-6 py-4 font-medium">{connection.name}</td>
                    <td className="px-6 py-4">{getStatusPill(connection.connection_status)}</td>
                    <td className="px-6 py-4">
                        {connection.is_active ?
                           <FaCheckCircle className="text-green-500" /> :
                           <button onClick={() => activateConnection(connection.id)} className="text-gray-400 hover:text-green-500"><FaCheckCircle /></button>
                        }
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => testConnection(connection.id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                          title="Test Connection"
                        >
                          <FaPlay />
                        </button>
                        <button
                          onClick={() => abrirModal(connection)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteConnection(connection)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">
                  {selectedConnection ? 'Edit Connection' : 'New Connection'}
                </h2>
                <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Connection Type</label>
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
                        <span className="text-gray-500">Select a type...</span>
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
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                  />
                </div>

                {formData.type && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium mb-3">Credentials for {supportedTypes.find(t => t.type === formData.type)?.name}</h3>
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
                  <button type="button" onClick={cerrarModal} className="flex-1 px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[#2c4b8b] text-white rounded disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Connection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}