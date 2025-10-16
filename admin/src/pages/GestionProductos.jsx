import { useState, useEffect } from 'react';
/* eslint-disable no-unused-vars */
import {
  HiOutlinePlus,  
  HiOutlinePencilSquare,  
  HiOutlineTrash,  
  HiArrowPathRoundedSquare,  
  HiOutlineMagnifyingGlass,  
  HiMiniXMark,  
  HiOutlineExclamationTriangle,  
  HiOutlineCheck,  
} from "react-icons/hi2";
/* eslint-enable no-unused-vars */
import Swal from 'sweetalert2';
import Layout from '../components/Layout'; // eslint-disable-line no-unused-vars
import ConnectionService from '../services/connectionService';
import DataOperationsService from '../services/dataOperationsService';
import { AIRLINE_LOGOS, AIRLINES } from '../components/ItineraryDetails.jsx';
import ItineraryTable from '../components/ItineraryTable.jsx'; // eslint-disable-line no-unused-vars

// Iconos inline para equipaje: verde = incluido, rojo con tachado = no incluido
/* eslint-disable-next-line no-unused-vars */
const IconCarryOn = ({ included }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={included ? '#16a34a' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Carry-on">
    <path d="M9 8V6a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v2" />
    <rect x="6" y="8" width="12" height="10" rx="2" />
    <line x1="10" y1="12" x2="10" y2="16" />
    <line x1="14" y1="12" x2="14" y2="16" />
    {!included ? <line x1="4" y1="20" x2="20" y2="4" stroke="#ef4444" /> : null}
  </svg>
);

/* eslint-disable-next-line no-unused-vars */
const IconHandbag = ({ included }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={included ? '#16a34a' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Handbag">
    <path d="M8 10a4 4 0 0 1 8 0" />
    <rect x="5" y="10" width="14" height="9" rx="2" />
    {!included ? <line x1="4" y1="20" x2="20" y2="4" stroke="#ef4444" /> : null}
  </svg>
);

/* eslint-disable-next-line no-unused-vars */
const IconCheckedBag = ({ included }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={included ? '#16a34a' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Checked bag">
    <rect x="7" y="6" width="10" height="12" rx="2" />
    <path d="M10 6V4h4v2" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="19" r="1" />
    {!included ? <line x1="4" y1="20" x2="20" y2="4" stroke="#ef4444" /> : null}
  </svg>
);

const GestionProductos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeConnection, setActiveConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [seccion, setSeccion] = useState('gestion-productos');
  const [popupRutaOpen, setPopupRutaOpen] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);

  // Resolver ID robusto desde diferentes fuentes
  const resolveId = (obj) => {
    if (!obj) return null;
    return (
      obj.id ??
      obj.ItemInternalId ??
      obj._id ??
      obj.Item_ID ??
      obj.ItemId ??
      obj.ItemInternalID ??
      null
    );
  };

  // Estado del formulario
  const [formData, setFormData] = useState({
    codigo_cupo: '',
    destino: '',
    compania: '',
    disponibilidad: '',
    fecha_salida: '',
    fecha_regreso: '',
    precio: '',
    ruta: '',
    pnr: '',
    ficha: '',
    temporada: '',
    neto_1: '',
    op: '',
    carryon: true,
    handbag: true,
    checkedbag: true,
    inf_fare: ''
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
      const connection = await ConnectionService.getActiveConnection('productos');
      
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
      fecha_salida: '',
      fecha_regreso: '',
      precio: '',
      ruta: '',
      pnr: '',
      ficha: '',
      temporada: '',
      neto_1: '',
      op: '',
      carryon: true,
      handbag: true,
      checkedbag: true,
      inf_fare: ''
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
      fecha_salida: producto.fecha_salida || producto.salida || '',
      fecha_regreso: producto.fecha_regreso || producto.regreso || '',
      precio: String(producto.precio || ''),
      ruta: producto.ruta || '',
      pnr: producto.pnr || '',
      ficha: producto.ficha || '',
      temporada: producto.temporada || '',
      neto_1: producto.neto_1 || '',
      op: producto.op || '',
      carryon: producto.carryon ?? true,
      handbag: producto.handbag ?? true,
      checkedbag: producto.checkedbag ?? true,
      inf_fare: producto.inf_fare || ''
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

    if (activeConnection.type === 'powerautomate') {
      Swal.fire({
        icon: 'info',
        title: 'Operación no soportada',
        text: 'La eliminación no está disponible con la conexión Power Automate activa'
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
        console.log('🆔 ID detectado para delete:', resolveId(producto));
        
        // Usar DataOperationsService para eliminar (solo Supabase)
        // Preparar credenciales si la conexión es Supabase
        let connWithCreds = activeConnection;
        if (activeConnection.type === 'supabase') {
          const creds = await ConnectionService.getDecryptedCredentials(activeConnection.id);
          const supaCreds = {
            projectUrl: creds.projectUrl || creds.project_url || creds.url || creds.supabaseUrl || creds.supabase_url,
            anonKey: creds.anonKey || creds.anon_key || creds.key,
            tableName: creds.tableName || creds.table_name || creds.table || 'reservas'
          };
          connWithCreds = { ...activeConnection, credentials: supaCreds };
        }

        const deleteResult = await DataOperationsService.deleteData(
          activeConnection.type,
          connWithCreds,
          resolveId(producto),
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
        disponibilidad: String(formData.disponibilidad ?? ''),
        fecha_salida: formData.fecha_salida || null,
        fecha_regreso: formData.fecha_regreso || null,
        precio: String(formData.precio ?? ''),
        ruta: formData.ruta,
        pnr: formData.pnr,
        ficha: formData.ficha,
        temporada: formData.temporada,
        neto_1: formData.neto_1,
        op: formData.op,
        carryon: Boolean(formData.carryon),
        handbag: Boolean(formData.handbag),
        checkedbag: Boolean(formData.checkedbag),
        inf_fare: formData.inf_fare
      };

      console.log(editingProduct ? '✏️ Actualizando producto:' : '➕ Creando producto:', productData);

      // Validar conexión para creación: solo Supabase soportado
      if (!editingProduct && activeConnection.type !== 'supabase') {
        setLoading(false);
        Swal.fire({
          icon: 'info',
          title: 'Conexión no soportada',
          text: 'La creación de productos requiere una conexión Supabase activa para "productos".'
        });
        return;
      }

      // Preparar conexión con credenciales Supabase cuando aplique
      let connectionWithCreds = activeConnection;
      if (activeConnection.type === 'supabase') {
        const creds = await ConnectionService.getDecryptedCredentials(activeConnection.id);
        const supaCreds = {
          projectUrl: creds.projectUrl || creds.project_url || creds.url || creds.supabaseUrl || creds.supabase_url,
          anonKey: creds.anonKey || creds.anon_key || creds.key,
          tableName: creds.tableName || creds.table_name || creds.table || 'reservas'
        };
        connectionWithCreds = { ...activeConnection, credentials: supaCreds };
      }

      let result;
      if (editingProduct) {
        if (activeConnection.type === 'powerautomate') {
          setLoading(false);
          Swal.fire({
            icon: 'info',
            title: 'Operación no soportada',
            text: 'La edición no está disponible con la conexión Power Automate activa'
          });
          return;
        }
        // Actualizar producto existente
        const recordId = resolveId(editingProduct);
        console.log('🔎 ID detectado para update:', recordId, editingProduct);
        result = await DataOperationsService.updateData(
          activeConnection.type,
          connectionWithCreds,
          recordId,
          productData,
          'productos'
        );
      } else {
        // Crear nuevo producto
        result = await DataOperationsService.insertData(
          connectionWithCreds,
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
                <HiOutlineCheck  className="text-green-500 mr-3 w-5 h-5" />
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
                <HiArrowPathRoundedSquare />
              </button>
            </div>
          </div>
        );
      case 'no_connection':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <HiOutlineExclamationTriangle  className="text-yellow-500 mr-3" />
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
              <HiOutlineExclamationTriangle className="text-red-500 mr-3" />
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
        <h1 className="text-2xl font-bold text-[#2c4b8b]">Gestión de Productos</h1>
          <div className="flex gap-2">
            <button
              onClick={loadProductos}
              disabled={!activeConnection || loading}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <HiArrowPathRoundedSquare className={loading ? 'animate-spin' : ''} />
              Refrescar
            </button>
            <button
              onClick={handleCreate}
              disabled={!activeConnection}
              className="flex items-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] transition-colors"
            >
              <HiOutlinePlus />
              Nuevo Producto
            </button>
          </div>
        </div>

        {renderConnectionStatus()}

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <HiOutlineMagnifyingGlass  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, destino o compañía..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2c4b8b]"
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
              <table className="w-full min-w-[1400px]">
                <thead className="bg-[#2c4b8b] text-white">
                  <tr>
                    <th className="px-6 py-4 text-lg font-semibold">Código Cupo</th>
                    <th className="px-6 py-4 text-lg font-semibold">Destino</th>
                    <th className="px-6 py-4 text-lg font-semibold">Compañía</th>
                    <th className="px-6 py-4 text-lg font-semibold">Disponibilidad</th>
                    <th className="px-6 py-4 text-lg font-semibold">Precio</th>
                    <th className="px-6 py-4 text-lg font-semibold">Salida</th>
                    <th className="px-6 py-4 text-lg font-semibold">Regreso</th>
                    <th className="px-6 py-4 text-lg font-semibold">Ruta</th>
                    <th className="px-6 py-4 text-lg font-semibold">PNR</th>
                    <th className="px-6 py-4 text-lg font-semibold">Ficha</th>
                    <th className="px-6 py-4 text-lg font-semibold">Temporada</th>
                    <th className="px-6 py-4 text-lg font-semibold">Neto 1</th>
                    <th className="px-6 py-4 text-lg font-semibold">OP</th>
                    <th className="px-6 py-4 text-lg font-semibold">Equipaje</th>
                    <th className="px-6 py-4 text-lg font-semibold">Tarifa INF</th>
                    <th className="px-6 py-4 text-lg font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProductos.map((producto, index) => (
                    <tr key={producto.ItemInternalId || producto.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-center text-md font-medium text-gray-900">
                        {producto.codigo_cupo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-md text-gray-500">
                        {producto.destino}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-md text-gray-500">
                        <div className="flex items-center justify-center">
                          <img
                            src={AIRLINE_LOGOS[(producto.compania || '').toUpperCase().trim()] || 'https://documents.sabre.com/static/images/tc/mail/icon-air.png'}
                            alt={AIRLINES[(producto.compania || '').toUpperCase().trim()] || (producto.compania || '')}
                            title={AIRLINES[(producto.compania || '').toUpperCase().trim()] || (producto.compania || '')}
                            className="h-6 w-6 object-contain"
                            onError={(e) => { e.currentTarget.src = 'https://documents.sabre.com/static/images/tc/mail/icon-air.png'; }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-md text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          parseInt(producto.disponibilidad) > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {producto.disponibilidad || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        ${producto.precio || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.fecha_salida || producto.salida || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.fecha_regreso || producto.regreso || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.ruta ? (
                          <button
                            className="bg-[#2c4b8b] text-white px-3 py-1 rounded text-sm hover:bg-[#1e355e] transition-colors"
                            onClick={() => { setRutaSeleccionada(producto.ruta); setPopupRutaOpen(true); }}
                          >
                            Ver itinerario
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.pnr || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.ficha || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.temporada || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        ${producto.neto_1 || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        {producto.op || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        <div className="flex items-center justify-center gap-3">
                         <span title="Handbag">
                            <IconHandbag included={!!producto.handbag} />
                          </span>
                          <span title="Carry-on">
                            <IconCarryOn included={!!producto.carryon} />
                          </span>
                          <span title="Checked bag">
                            <IconCheckedBag included={!!producto.checkedbag} />
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        ${producto.inf_fare || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center font-medium">
                        <div className="flex space-x-2 text-center justify-center">
                          <button
                            onClick={() => handleEdit(producto)}
                            className="text-[#767c87] px-3 py-1 rounded text-xl hover:text-[#2c4b8b] transition-colors"
                            title="Editar"
                          >
                            <HiOutlinePencilSquare className='w-5 h-5' />
                          </button>
                          <button
                            onClick={() => handleDelete(producto)}
                            className="text-[#767c87] px-3 py-1 rounded text-xl hover:text-[#2c4b8b] transition-colors"
                            title="Eliminar"
                          >
                            <HiOutlineTrash className='w-5 h-5' />
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

        {/* Popup ruta - reutiliza el mismo componente/estilo que Disponibilidad */}
        {popupRutaOpen && (
          <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-[1200px] h-auto overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">Itinerario Aéreo</h2>
                <button onClick={() => setPopupRutaOpen(false)} className="text-[#2c4b8b] hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <ItineraryTable ruta={rutaSeleccionada} />
            </div>
          </div>
        )}

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
                  <HiMiniXMark  />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
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
                      value={formData.fecha_salida}
                      onChange={(e) => setFormData({...formData, fecha_salida: e.target.value})}
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
                      value={formData.fecha_regreso}
                      onChange={(e) => setFormData({...formData, fecha_regreso: e.target.value})}
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

                  {/* Neto 1 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Neto 1
                    </label>
                    <input
                      type="text"
                      value={formData.neto_1}
                      onChange={(e) => setFormData({...formData, neto_1: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* OP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OP
                    </label>
                    <input
                      type="text"
                      value={formData.op}
                      onChange={(e) => setFormData({...formData, op: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Infant Fare */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tarifa Infante (inf_fare)
                    </label>
                    <input
                      type="text"
                      value={formData.inf_fare}
                      onChange={(e) => setFormData({...formData, inf_fare: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                    />
                  </div>

                  {/* Equipaje (booleans) */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.carryon}
                        onChange={(e) => setFormData({...formData, carryon: e.target.checked})}
                      />
                      <span className="text-sm text-gray-700">Carry-on</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.handbag}
                        onChange={(e) => setFormData({...formData, handbag: e.target.checked})}
                      />
                      <span className="text-sm text-gray-700">Handbag</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formData.checkedbag}
                        onChange={(e) => setFormData({...formData, checkedbag: e.target.checked})}
                      />
                      <span className="text-sm text-gray-700">Checked bag</span>
                    </label>
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