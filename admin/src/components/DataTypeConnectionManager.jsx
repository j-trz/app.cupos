import React, { useState, useEffect } from 'react';// eslint-disable-line no-unused-vars
import { FaDatabase, FaCog, FaCheck, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';// eslint-disable-line no-unused-vars
import ConnectionService from '../services/connectionService';
import dataApiService from '../services/dataApiService';
import ApiClient from '../services/apiClient';
import Swal from 'sweetalert2';

/**
 * Componente para gestionar asignaciones de tipos de datos a conexiones específicas
 */
const DataTypeConnectionManager = ({ isOpen, onClose }) => {
  const [connections, setConnections] = useState([]);
  const [dataTypeAssignments, setDataTypeAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    dataType: '',
    connectionId: '',
    isActive: true
  });

  const dataTypes = [
    { value: 'productos', label: 'Productos/Disponibilidad', description: 'Gestión de cupos y disponibilidad' },
    { value: 'pedidos', label: 'Pedidos/Reservas', description: 'Solicitudes y reservas de clientes' },
    { value: 'all', label: 'Todos los datos', description: 'Conexión por defecto para todos los tipos' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (ConnectionService.CLIENT_CONNECTIONS_REMOVED) {
        setConnections([]);
        await loadDataTypeAssignments();
        setLoading(false);
        return;
      }
      // Cargar conexiones disponibles
      const connectionsResult = await ConnectionService.getUserConnections();
      if (connectionsResult.success) {
        setConnections(connectionsResult.connections);
      }

      // Cargar asignaciones existentes
      await loadDataTypeAssignments();
    } catch (error) {
      console.error('Error loading data:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cargar los datos',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDataTypeAssignments = async () => {
    try {
      const user = ApiClient.getSessionUser();
      if (!user) return;

      const filters = JSON.stringify({ user_id: user.id });
      const data = await dataApiService.getData('connection_data_types', JSON.parse(filters), {
        orderBy: 'data_type',
        ascending: true
      });

      setDataTypeAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setDataTypeAssignments([]);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.dataType || !newAssignment.connectionId) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Selecciona un tipo de datos y una conexión',
        icon: 'warning'
      });
      return;
    }

    try {
      const user = ApiClient.getSessionUser();
      if (!user) return;

      // Verificar si ya existe asignación para este tipo de datos
      const existingAssignment = dataTypeAssignments.find(
        assignment => assignment.data_type === newAssignment.dataType
      );

      if (existingAssignment) {
        const result = await Swal.fire({
          title: 'Asignación existente',
          text: `Ya existe una asignación para ${getDataTypeLabel(newAssignment.dataType)}. ¿Deseas reemplazarla?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Reemplazar',
          cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        // Actualizar asignación existente
        await dataApiService.updateData('connection_data_types', existingAssignment.id, {
          connection_id: newAssignment.connectionId,
          is_active: newAssignment.isActive,
          updated_at: new Date().toISOString()
        });
      } else {
        // Crear nueva asignación
        await dataApiService.insertData('connection_data_types', {
          user_id: user.id,
          connection_id: newAssignment.connectionId,
          data_type: newAssignment.dataType,
          is_active: newAssignment.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      // Limpiar formulario y recargar datos
      setNewAssignment({ dataType: '', connectionId: '', isActive: true });
      await loadDataTypeAssignments();

      Swal.fire({
        title: 'Éxito',
        text: 'Asignación guardada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      Swal.fire({
        title: 'Error',
        text: error.message || 'Error al guardar la asignación',
        icon: 'error'
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId, dataType) => {
    const result = await Swal.fire({
      title: '¿Eliminar asignación?',
      text: `Se eliminará la asignación para ${getDataTypeLabel(dataType)}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });

    if (!result.isConfirmed) return;

    try {
      await dataApiService.deleteData('connection_data_types', assignmentId);

      await loadDataTypeAssignments();

      Swal.fire({
        title: 'Eliminado',
        text: 'Asignación eliminada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al eliminar la asignación',
        icon: 'error'
      });
    }
  };

  const handleToggleActive = async (assignmentId, currentStatus) => {
    try {
      await dataApiService.updateData('connection_data_types', assignmentId, {
        is_active: !currentStatus,
        updated_at: new Date().toISOString()
      });

      await loadDataTypeAssignments();
    } catch (error) {
      console.error('Error toggling assignment:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al cambiar el estado',
        icon: 'error'
      });
    }
  };

  const getDataTypeLabel = (dataType) => {
    const type = dataTypes.find(t => t.value === dataType);
    return type ? type.label : dataType;
  };

  const getConnectionName = (connectionId) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection ? `${connection.name} (${connection.type})` : 'Conexión no encontrada';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaDatabase className="text-xl" />
            <div>
              <h2 className="text-xl font-bold">Gestión de Conexiones por Tipo de Datos</h2>
              <p className="text-blue-100 text-sm">
                Asigna conexiones específicas para diferentes tipos de datos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando datos...</p>
            </div>
          )}

          {!loading && ConnectionService.CLIENT_CONNECTIONS_REMOVED && (
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Conexiones deshabilitadas</h3>
              <p>La gestión de conexiones desde el cliente ha sido deshabilitada por motivos de seguridad. Las asignaciones existentes se muestran pero no se pueden crear ni modificar desde aquí.</p>
            </div>
          )}

          {!loading && !ConnectionService.CLIENT_CONNECTIONS_REMOVED && (
            <div className="space-y-6">
              {/* Información del sistema */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Sistema Multi-Conexión
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Este sistema permite usar diferentes conexiones para diferentes tipos de datos:
                      </p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li><strong>Productos:</strong> Para gestión de cupos y disponibilidad</li>
                        <li><strong>Pedidos:</strong> Para solicitudes y reservas de clientes</li>
                        <li><strong>Todos los datos:</strong> Conexión por defecto si no hay asignación específica</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario para nueva asignación */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FaPlus className="text-green-600" />
                  Nueva Asignación
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Datos
                    </label>
                    <select
                      value={newAssignment.dataType}
                      onChange={(e) => setNewAssignment({
                        ...newAssignment,
                        dataType: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar tipo...</option>
                      {dataTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conexión
                    </label>
                    <select
                      value={newAssignment.connectionId}
                      onChange={(e) => setNewAssignment({
                        ...newAssignment,
                        connectionId: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar conexión...</option>
                      {connections.map(connection => (
                        <option key={connection.id} value={connection.id}>
                          {connection.name} ({connection.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleCreateAssignment}
                      disabled={!newAssignment.dataType || !newAssignment.connectionId}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FaPlus />
                      Crear Asignación
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de asignaciones existentes */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FaCog className="text-blue-600" />
                  Asignaciones Actuales
                </h3>

                {dataTypeAssignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaDatabase className="text-4xl mx-auto mb-4 text-gray-300" />
                    <p>No hay asignaciones configuradas</p>
                    <p className="text-sm">Crea una asignación para comenzar a usar el sistema multi-conexión</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataTypeAssignments.map(assignment => (
                      <div
                        key={assignment.id}
                        className={`border rounded-lg p-4 ${assignment.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${assignment.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                <FaDatabase />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {getDataTypeLabel(assignment.data_type)}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {getConnectionName(assignment.connection_id)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {dataTypes.find(t => t.value === assignment.data_type)?.description}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(assignment.id, assignment.is_active)}
                              className={`p-2 rounded-full ${assignment.is_active
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              title={assignment.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {assignment.is_active ? <FaCheck /> : <FaTimes />}
                            </button>

                            <button
                              onClick={() => handleDeleteAssignment(assignment.id, assignment.data_type)}
                              className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                              title="Eliminar asignación"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Información adicional */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Notas importantes
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Solo puede haber una asignación activa por tipo de datos</li>
                        <li>Si no hay asignación específica, se usará la conexión 'all' si existe</li>
                        <li>Como último recurso, se usará el sistema legacy de conexiones</li>
                        <li>Las asignaciones inactivas no se utilizan pero se mantienen guardadas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTypeConnectionManager;
