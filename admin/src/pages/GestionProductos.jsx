import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaSync, FaSave, FaTimes, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'; // eslint-disable-line no-unused-vars
import Swal from 'sweetalert2';
import Layout from '../components/Layout'; // eslint-disable-line no-unused-vars
import ConnectionService from '../services/connectionService';
import DataOperationsService from '../services/dataOperationsService';

const GestionProductos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeConnection, setActiveConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [seccion, setSeccion] = useState('gestion-productos');

  // Estado del formulario
  const [formData, setFormData] = useState({
    codigo_cupo: '',
    destino: '',
    compania: '',
    disponibilidad: '',
    salida: '',
    regreso: '',
    precio: '',
    ruta: '',
    pnr: '',
    ficha: '',
    temporada: ''
  });

  useEffect(() => {
    checkActiveConnection();
  }, []);

  useEffect(() => {
    if (activeConnection) {
      loadProductos();
    }
  }, [activeConnection]);

  const checkActiveConnection = async () => {
    try {
      setConnectionStatus('checking');
      const connection = await ConnectionService.getActiveConnection();
      
      if (connection) {
        setActiveConnection(connection);
        setConnectionStatus('connected');
        console.log('✅ Conexión activa detectada:', connection);
      } else {
        setConnectionStatus('no_connection');
        console.warn('⚠️ No hay conexión activa configurada');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('❌ Error verificando conexión activa:', error);
    }
  };

  const loadProductos = async () => {
    if (!activeConnection) return;

    setLoading(true);
    try {
      console.log('🔄 Cargando productos desde conexión activa...');
      
      // Usar ConnectionService para obtener datos de productos
      const result = await ConnectionService.getDataFromActiveConnection('productos');
      
      if (result.success && result.data) {
        setProductos(result.data);
        console.log(`✅ ${result.data.length} productos cargados exitosamente`);
        
        // Mostrar warning si hay problemas de validación
        if (result.validationWarning) {
          Swal.fire({
            icon: 'warning',
            title: 'Datos cargados con advertencias',
            text: result.validationWarning,
            timer: 3000
          });
        }
      } else {
        throw new Error(result.error || 'No se pudieron cargar los productos');
      }
    } catch (error) {
      console.error('❌ Error cargando productos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar productos',
        text: error.message || 'No se pudieron cargar los productos desde la conexión activa'
      });
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      codigo_cupo: '',
      destino: '',
      compania: '',
      disponibilidad: '',
      salida: '',
      regreso: '',
      precio: '',
      ruta: '',
      pnr: '',
      ficha: '',
      temporada: ''
    });
    setShowModal(true);
  };

  const handleEdit = (producto) => {
    setEditingProduct(producto);
    setFormData({
      codigo_cupo: producto.codigo_cupo || '',
      destino: producto.destino || '',
      compania: producto.compania || '',
      disponibilidad: String(producto.disponibilidad || ''),
      salida: producto.salida || '',
      regreso: producto.regreso || '',
      precio: String(producto.precio || ''),
      ruta: producto.ruta || '',
      pnr: producto.pnr || '',
      ficha: producto.ficha || '',
      temporada: producto.temporada || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (producto) => {
    if (!activeConnection) {
      Swal.fire({
        icon: 'error',
        title: 'Sin conexión activa',
        text: 'No hay una conexión API activa configurada'
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar producto?',
      html: `
        ¿Estás seguro de eliminar este producto?<br>
        <strong>Código:</strong> ${producto.codigo_cupo}<br>
        <strong>Destino:</strong> ${producto.destino}<br>
        <strong>Compañía:</strong> ${producto.compania}
      `,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        console.log('🗑️ Eliminando producto:', producto);
        
        // Usar DataOperationsService para eliminar
        const deleteResult = await DataOperationsService.deleteData(
          activeConnection.type,
          activeConnection,
          producto.ItemInternalId || producto.id,
          'productos'
        );

        if (deleteResult.success) {
          await loadProductos(); // Recargar lista
          Swal.fire({
            icon: 'success',
            title: 'Producto eliminado',
            text: 'El producto se eliminó correctamente',
            timer: 2000
          });
        } else {
          throw new Error(deleteResult.error || 'Error al eliminar el producto');
        }
      } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al eliminar',
          text: error.message || 'No se pudo eliminar el producto'
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!activeConnection) {
      Swal.fire({
        icon: 'error',
        title: 'Sin conexión activa',
        text: 'No hay una conexión API activa configurada'
      });
      return;
    }

    // Validaciones básicas
    if (!formData.codigo_cupo || !formData.destino || !formData.compania) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Código de cupo, destino y compañía son obligatorios'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Preparar datos según estructura estándar
      const productData = {
        codigo_cupo: formData.codigo_cupo,
        destino: formData.destino,
        compania: formData.compania,
        disponibilidad: parseInt(formData.disponibilidad) || 0,
        salida: formData.salida,
        regreso: formData.regreso,
        precio: parseFloat(formData.precio) || 0,
        ruta: formData.ruta,
        pnr: formData.pnr,
        ficha: formData.ficha,
        temporada: formData.temporada
      };

      console.log(editingProduct ? '✏️ Actualizando producto:' : '➕ Creando producto:', productData);

      let result;
      if (editingProduct) {
        // Actualizar producto existente (implementar método updateData si no existe)
        result = await DataOperationsService.updateData(
          activeConnection.type,
          activeConnection,
          editingProduct.ItemInternalId || editingProduct.id,
          productData,
          'productos'
        );
      } else {
        // Crear nuevo producto
        result = await DataOperationsService.insertData(
          activeConnection,
          [productData]
        );
      }

      if (result.success) {
        await loadProductos(); // Recargar lista
        setShowModal(false);
        
        Swal.fire({
          icon: 'success',
          title: editingProduct ? 'Producto actualizado' : 'Producto creado',
          text: editingProduct ? 
            'El producto se actualizó correctamente' : 
            'El producto se creó correctamente',
          timer: 2000
        });
      } else {
        throw new Error(result.error || 'Error en la operación');
      }
    } catch (error) {
      console.error('❌ Error guardando producto:', error);
      Swal.fire({
        icon: 'error',
        title: editingProduct ? 'Error al actualizar' : 'Error al crear',
        text: error.message || 'No se pudo guardar el producto'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProductos = productos.filter(producto =>
    (producto.codigo_cupo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (producto.destino?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (producto.compania?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin text-[#2c4b8b] mr-3">⏳</div>
              <span className="text-[#2c4b8b]">Verificando conexión activa...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-3" />
                <div>
                  <span className="text-green-700 font-medium">Conectado a: {activeConnection?.name}</span>
                  <p className="text-green-600 text-sm">Tipo: {activeConnection?.type}</p>
                </div>
              </div>
              <button
                onClick={checkActiveConnection}
                className="text-green-600 hover:text-green-700"
                title="Verificar conexión"
              >
                <FaSync />
              </button>
            </div>
          </div>
        );
      case 'no_connection':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-yellow-500 mr-3" />
              <div>
                <span className="text-yellow-700 font-medium">Sin conexión activa</span>
                <p className="text-yellow-600 text-sm">
                  Configura una conexión API en la sección de Gestión de Conexiones
                </p>
              </div>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 mr-3" />
              <div>
                <span className="text-red-700 font-medium">Error de conexión</span>
                <p className="text-red-600 text-sm">
                  No se pudo verificar la conexión activa
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Productos</h1>
          <div className="flex gap-3">
            <button
              onClick={loadProductos}
              disabled={!activeConnection || loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#2c4b8b] text-white rounded hover:bg-[#2c4b8b] disabled:bg-gray-400 transition-colors"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={handleCreate}
              disabled={!activeConnection}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
              <FaPlus />
              Nuevo Producto
            </button>
          </div>
        </div>

        {renderConnectionStatus()}

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, destino o compañía..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:[#2c4b8b]"
            />
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-500">Cargando productos...</p>
            </div>
          ) : filteredProductos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos disponibles'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código Cupo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destino
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compañía
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disponibilidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salida
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProductos.map((producto, index) => (
                    <tr key={producto.ItemInternalId || producto.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {producto.codigo_cupo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.destino}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.compania}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          parseInt(producto.disponibilidad) > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {producto.disponibilidad || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${producto.precio || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.salida || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(producto)}
                            className="text-[#2c4b8b] hover:text-blue-900"
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(producto)}
                            className="text-red-600 hover:text-red-900"
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
        </div>

        {/* Modal de formulario */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-[#2c4b8b]">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Código Cupo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Cupo *
                    </label>
                    <input
                      type="text"
                      value={formData.codigo_cupo}
                      onChange={(e) => setFormData({...formData, codigo_cupo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:[#2c4b8b]"
                      required
                    />
                  </div>

                  {/* Destino */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Destino *
                    </label>
                    <input
                      type="text"
                      value={formData.destino}
                      onChange={(e) => setFormData({...formData, destino: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      required
                    />
                  </div>

                  {/* Compañía */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compañía *
                    </label>
                    <input
                      type="text"
                      value={formData.compania}
                      onChange={(e) => setFormData({...formData, compania: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      required
                    />
                  </div>

                  {/* Disponibilidad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Disponibilidad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.disponibilidad}
                      onChange={(e) => setFormData({...formData, disponibilidad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Fecha Salida */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Salida
                    </label>
                    <input
                      type="date"
                      value={formData.salida}
                      onChange={(e) => setFormData({...formData, salida: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Fecha Regreso */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Regreso
                    </label>
                    <input
                      type="date"
                      value={formData.regreso}
                      onChange={(e) => setFormData({...formData, regreso: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Ruta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ruta
                    </label>
                    <input
                      type="text"
                      value={formData.ruta}
                      onChange={(e) => setFormData({...formData, ruta: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* PNR */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PNR
                    </label>
                    <input
                      type="text"
                      value={formData.pnr}
                      onChange={(e) => setFormData({...formData, pnr: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Ficha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ficha
                    </label>
                    <input
                      type="text"
                      value={formData.ficha}
                      onChange={(e) => setFormData({...formData, ficha: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Temporada */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temporada
                    </label>
                    <input
                      type="text"
                      value={formData.temporada}
                      onChange={(e) => setFormData({...formData, temporada: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[#2c4b8b]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2c4b8b] text-white rounded hover:bg-[#2a4a7b] disabled:bg-gray-400 transition-colors"
                  >
                    <FaSave />
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GestionProductos;