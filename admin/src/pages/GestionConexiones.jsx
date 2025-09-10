import { useEffect, useState } from "react";
import Layout from "../components/Layout";// eslint-disable-line no-unused-vars
import { useCredentials } from "../contexts/CredentialsContext";
import ConnectionService from "../services/connectionService";
import EncryptionService from "../services/encryptionService";
import DataMappingModal from "../components/DataMappingModal"; // eslint-disable-line no-unused-vars
import DataTypeConnectionManager from "../components/DataTypeConnectionManager";
import { supabase } from "../supabaseClient";
import { FaPlus, FaSync, FaEdit, FaTrash, FaPlay, FaDownload, FaUpload, FaEye, FaEyeSlash, FaTable, FaCog, FaDatabase } from 'react-icons/fa';// eslint-disable-line no-unused-vars
import { SiMongodb, SiTableau, SiSupabase } from 'react-icons/si';// eslint-disable-line no-unused-vars
import { TiVendorMicrosoft } from 'react-icons/ti';// eslint-disable-line no-unused-vars
import Swal from 'sweetalert2';

export default function GestionConexiones() {
  const [seccion, setSeccion] = useState("gestion-conexiones");
  const [conexiones, setConexiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'test'
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [userRole, setUserRole] = useState(null);// eslint-disable-line no-unused-vars
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedConnectionForMapping, setSelectedConnectionForMapping] = useState(null);
  const [dataTypeManagerOpen, setDataTypeManagerOpen] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    credentials: {}
  });

  useEffect(() => {
    fetchConexiones();
    checkUserRole();
    
    // Listener para refrescar cuando se crea la conexión Power Automate automáticamente
    const handlePowerAutomateCreated = () => {
      console.log("Evento recibido: Power Automate connection created, refrescando lista...");
      fetchConexiones();
    };
    
    window.addEventListener('powerAutomateConnectionCreated', handlePowerAutomateCreated);
    
    return () => {
      window.removeEventListener('powerAutomateConnectionCreated', handlePowerAutomateCreated);
    };
  }, []);

  // Refrescar datos cuando cambia la sección (se navega a la página)
  useEffect(() => {
    if (seccion === "gestion-conexiones") {
      fetchConexiones();
    }
  }, [seccion]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTypeDropdown && !event.target.closest('.type-dropdown')) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTypeDropdown]);

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setUserRole(profile?.role || 'user');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('user');
    }
  }


  async function fetchConexiones() {
    setLoading(true);
    try {
      const result = await ConnectionService.getUserConnections();
      if (result.success) {
        setConexiones(result.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las conexiones'
      });
    }
    setLoading(false);
  }

  function abrirModal(type, connection = null) {
    setModalType(type);
    setSelectedConnection(connection);
    setUserPassword('');
    
    if (connection && type === 'edit') {
      setFormData({
        name: connection.name,
        type: connection.type,
        description: connection.description,
        credentials: {}
      });
    } else {
      setFormData({
        name: '',
        type: '',
        description: '',
        credentials: {}
      });
    }
    
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setSelectedConnection(null);
    setUserPassword('');
    setFormData({
      name: '',
      type: '',
      description: '',
      credentials: {}
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!userPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La contraseña es requerida para encriptar las credenciales'
      });
      return;
    }

    // Validar contraseña
    const passwordValidation = EncryptionService.validatePassword(userPassword);
    if (!passwordValidation.valid) {
      Swal.fire({
        icon: 'error',
        title: 'Contraseña no válida',
        html: passwordValidation.errors.map(error => `• ${error}`).join('<br>')
      });
      return;
    }

    try {
      setLoading(true);
      
      if (modalType === 'create') {
        await ConnectionService.createConnection(formData, userPassword);
        Swal.fire({
          icon: 'success',
          title: 'Conexión creada',
          text: 'La conexión se ha creado correctamente'
        });
      } else if (modalType === 'edit') {
        await ConnectionService.updateConnection(
          selectedConnection.id,
          formData,
          userPassword
        );
        Swal.fire({
          icon: 'success',
          title: 'Conexión actualizada',
          text: 'La conexión se ha actualizado correctamente'
        });
      }
      
      cerrarModal();
      await fetchConexiones();
    } catch (error) {
      console.error('Error saving connection:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  const { getDecryptedCredentials } = useCredentials();

  async function testConnection(connection) {
    try {
      setLoading(true);
      // The getDecryptedCredentials function will trigger the password prompt if needed
      const result = await ConnectionService.testConnection(connection, getDecryptedCredentials);
      
      if (result.success) {
        // Si el test es exitoso, preguntar si desea activar la conexión
        const activateResult = await Swal.fire({
          icon: 'success',
          title: 'Conexión exitosa',
          text: result.message,
          showCancelButton: true,
          confirmButtonText: 'Activar conexión',
          cancelButtonText: 'Solo probar',
          confirmButtonColor: '#2c4b8b'
        });

        // Si el usuario confirma, activar la conexión
        if (activateResult.isConfirmed) {
          try {
            await ConnectionService.setActiveConnection(connection.id);
            Swal.fire({
              icon: 'success',
              title: 'Conexión activada',
              text: 'La conexión se ha activado correctamente. Los datos ahora se obtendrán de esta fuente.',
              timer: 3000,
              showConfirmButton: false
            });
          } catch (activateError) {
            Swal.fire({
              icon: 'error',
              title: 'Error al activar',
              text: activateError.message || 'No se pudo activar la conexión'
            });
          }
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: result.message
        });
      }
      
      await fetchConexiones(); // Actualizar estado de conexión
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteConnection(connection) {
    const result = await Swal.fire({
      title: '¿Eliminar conexión?',
      text: `Esta acción eliminará permanentemente la conexión "${connection.name}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      await ConnectionService.deleteConnection(connection.id);
      Swal.fire({
        icon: 'success',
        title: 'Conexión eliminada',
        text: 'La conexión se ha eliminado correctamente'
      });
      await fetchConexiones();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  async function exportConnection(connection) {
    const { value: password } = await Swal.fire({
      title: 'Exportar Conexión',
      text: 'Ingresa tu contraseña para crear el respaldo encriptado:',
      input: 'password',
      inputPlaceholder: 'Contraseña',
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar'
    });

    if (!password) return;

    try {
      const backupData = await ConnectionService.exportConnection(connection.id, password);
      
      // Crear archivo de descarga
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connection-backup-${connection.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: 'Respaldo creado',
        text: 'El archivo de respaldo se ha descargado correctamente'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });
    }
  }

  async function importConnection() {
    const { value: file } = await Swal.fire({
      title: 'Importar Conexión',
      input: 'file',
      inputAttributes: {
        accept: '.json',
        'aria-label': 'Seleccionar archivo de respaldo'
      },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });

    if (!file) return;

    const { value: password } = await Swal.fire({
      title: 'Contraseña de Respaldo',
      text: 'Ingresa la contraseña usada para crear el respaldo:',
      input: 'password',
      inputPlaceholder: 'Contraseña',
      showCancelButton: true,
      confirmButtonText: 'Importar',
      cancelButtonText: 'Cancelar'
    });

    if (!password) return;

    try {
      const fileContent = await file.text();
      await ConnectionService.importConnection(fileContent, password);
      
      Swal.fire({
        icon: 'success',
        title: 'Conexión importada',
        text: 'La conexión se ha importado correctamente'
      });
      
      await fetchConexiones();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al importar',
        text: error.message
      });
    }
  }

  async function activateConnection(connectionId) {
    try {
      setLoading(true);
      await ConnectionService.setActiveConnection(connectionId);
      
      Swal.fire({
        icon: 'success',
        title: 'Conexión activada',
        text: 'La conexión se ha activado correctamente. Los datos ahora se obtendrán de esta fuente.',
        timer: 3000,
        showConfirmButton: false
      });
      
      await fetchConexiones();
    } catch (error) {
      console.error('Error activating connection:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  function openMappingModal(connection) {
    setSelectedConnectionForMapping(connection);
    setMappingModalOpen(true);
  }

  function closeMappingModal() {
    setMappingModalOpen(false);
    setSelectedConnectionForMapping(null);
  }

  async function saveMappingConfiguration(connectionId, mappingData) {
    try {
      await ConnectionService.updateConnection(connectionId, mappingData);
      await fetchConexiones(); // Refresh the list
    } catch (error) {
      console.error('Error saving mapping configuration:', error);
      throw error;
    }
  }

  const supportedTypes = ConnectionService.getSupportedConnectionTypes();

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'testing': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'powerautomate': return <TiVendorMicrosoft className="text-blue-600 text-2xl" />;
      case 'supabase': return <SiSupabase className="text-green-600 text-2xl" />;
      case 'smartsheet': return <FaTable className="text-orange-600 text-2xl" />;
      case 'mongodb': return <SiMongodb className="text-green-700 text-2xl" />;
      case 'tableau': return <SiTableau className="text-blue-500 text-2xl" />;
      default: return <span className="text-gray-500 text-2xl">🔗</span>;
    }
  };

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c4b8b]">Gestión de Conexiones API</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setDataTypeManagerOpen(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              title="Gestionar conexiones por tipo de datos"
            >
              <FaDatabase />
              Multi-Conexión
            </button>
            <button
              onClick={importConnection}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              <FaUpload />
              Importar
            </button>
            <button
              onClick={() => abrirModal('create')}
              className="flex items-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] transition-colors"
            >
              <FaPlus />
              Nueva Conexión
            </button>
          </div>
        </div>


        {loading ? (
          <div className="text-center py-10">
            <FaSync className="animate-spin text-4xl text-[#2c4b8b] mx-auto mb-4" />
            <p className="text-gray-500">Cargando conexiones...</p>
          </div>
        ) : (
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
                {conexiones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No hay conexiones configuradas
                    </td>
                  </tr>
                ) : conexiones.map((connection) => (
                  <tr key={connection.id} className="last:border-b-0 transition-all duration-150 hover:bg-[#e6f0fa]" style={{ height: '64px' }}>
                    <td className="px-6 py-4 text-center">
                      {getTypeIcon(connection.type)}
                    </td>
                    <td className="px-6 py-4 text-base font-medium text-center">{connection.name}</td>
                    <td className="px-6 py-4 text-base text-gray-600 text-center">{connection.description}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.connection_status)}`}>
                        {connection.connection_status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {connection.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Activa
                        </span>
                      ) : (
                        <button
                          onClick={() => activateConnection(connection.id)}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                          disabled={loading}
                        >
                          Activar
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-base text-gray-600 text-center">
                      {connection.last_tested_at
                        ? new Date(connection.last_tested_at).toLocaleDateString('es-ES')
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => testConnection(connection)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                          title="Probar conexión"
                        >
                          <FaPlay />
                        </button>
                        <button
                          onClick={() => abrirModal('edit', connection)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => exportConnection(connection)}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                          title="Exportar respaldo"
                        >
                          <FaDownload />
                        </button>
                        {connection.type !== 'powerautomate' && (
                          <button
                            onClick={() => openMappingModal(connection)}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                            title="Configurar mapeo de datos"
                          >
                            <FaCog />
                          </button>
                        )}
                        <button
                          onClick={() => deleteConnection(connection)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Eliminar"
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

        {/* Modal para crear/editar conexión */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">
                  {modalType === 'create' ? 'Nueva Conexión' : 'Editar Conexión'}
                </h2>
                <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Tipo de conexión */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Conexión</label>
                  <div className="relative type-dropdown">
                    <div
                      onClick={() => modalType !== 'edit' && setShowTypeDropdown(!showTypeDropdown)}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:border-[#2c4b8b] cursor-pointer bg-white flex items-center justify-between ${modalType === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {formData.type ? (
                        <div className="flex items-center gap-2">
                          {getTypeIcon(formData.type)}
                          <span>{supportedTypes.find(t => t.type === formData.type)?.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Seleccionar tipo...</span>
                      )}
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {showTypeDropdown && modalType !== 'edit' && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {supportedTypes.map(type => (
                          <div
                            key={type.type}
                            onClick={() => {
                              setFormData({...formData, type: type.type, credentials: {}});
                              setShowTypeDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                          >
                            {(() => {
                              switch (type.type) {
                                case 'powerautomate': return <TiVendorMicrosoft className="text-blue-600" />;
                                case 'supabase': return <SiSupabase className="text-green-600" />;
                                case 'smartsheet': return <FaTable className="text-orange-600" />;
                                case 'mongodb': return <SiMongodb className="text-green-700" />;
                                case 'tableau': return <SiTableau className="text-blue-500" />;
                                default: return <span className="text-gray-500">🔗</span>;
                              }
                            })()}
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-sm text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#2c4b8b]"
                    required
                    placeholder="Nombre descriptivo de la conexión"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#2c4b8b]"
                    rows={3}
                    placeholder="Descripción opcional de la conexión"
                  />
                </div>

                {/* Campos específicos del tipo */}
                {formData.type && (
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Configuración de {supportedTypes.find(t => t.type === formData.type)?.name}</h3>
                      {supportedTypes.find(t => t.type === formData.type)?.docs && (
                        <a
                          href={supportedTypes.find(t => t.type === formData.type)?.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                        >
                          📖 Ver documentación
                        </a>
                      )}
                    </div>
                    {supportedTypes.find(t => t.type === formData.type)?.fields.map(field => (
                      <div key={field.name} className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block text-sm font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.tooltip && (
                            <div className="group relative">
                              <span className="text-gray-400 text-sm cursor-help">ℹ️</span>
                              <div className="absolute bottom-6 left-0 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                {field.tooltip}
                              </div>
                            </div>
                          )}
                        </div>
                        <input
                          type={field.type}
                          value={formData.credentials[field.name] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            credentials: {
                              ...formData.credentials,
                              [field.name]: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#2c4b8b] text-sm"
                          required={field.required}
                          placeholder={field.placeholder || field.label}
                        />
                        {!field.required && (
                          <p className="text-xs text-gray-500 mt-1">Opcional</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Contraseña para encriptar */}
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <h3 className="font-medium mb-2 text-yellow-800">🔒 Encriptación Zero-Knowledge</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Tu contraseña se usa para encriptar las credenciales localmente. 
                    Nunca se envía al servidor.
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:border-[#2c4b8b]"
                      required
                      placeholder="Contraseña para encriptar credenciales"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    Mínimo 12 caracteres, incluye mayúsculas, minúsculas y números
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#2c4b8b] text-white rounded hover:bg-[#1e355e] disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Guardando...' : (modalType === 'create' ? 'Crear' : 'Actualizar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de mapeo de datos */}
        <DataMappingModal
          isOpen={mappingModalOpen}
          onClose={closeMappingModal}
          connection={selectedConnectionForMapping}
          onSave={saveMappingConfiguration}
        />

        {/* Modal de gestión de tipos de datos */}
        <DataTypeConnectionManager
          isOpen={dataTypeManagerOpen}
          onClose={() => setDataTypeManagerOpen(false)}
        />
      </div>
    </Layout>
  );
}