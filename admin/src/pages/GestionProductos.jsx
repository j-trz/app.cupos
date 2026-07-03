import { useState, useEffect, useCallback } from 'react';
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
import { createCustomSupabaseClient } from '../supabaseClient';
import DataOperationsService from '../services/dataOperationsService';
import AgencyService from '../services/agencyService';
import { AIRLINE_LOGOS, AIRLINES } from '../components/ItineraryDetails.jsx';
import ItineraryTable from '../components/ItineraryTable.jsx'; // eslint-disable-line no-unused-vars
import FlightSegmentBuilder from '../components/FlightSegmentBuilder.jsx'; // eslint-disable-line no-unused-vars
import UserService from '../services/userService';
import { FaSuitcaseRolling } from 'react-icons/fa6';// eslint-disable-line no-unused-vars
import { HiOutlineBriefcase } from "react-icons/hi2";// eslint-disable-line no-unused-vars
import { MdOutlineLuggage } from "react-icons/md";// eslint-disable-line no-unused-vars
import { LuGitBranchPlus } from "react-icons/lu";// eslint-disable-line no-unused-vars


// Iconos de equipaje usando react-icons con overlay de tachado cuando no está incluido
// Prefijamos con _ para evitar la regla no-unused-vars cuando ESLint analiza exports
const _BaggageIcon = ({ included, children }) => (
  <span className="relative inline-flex items-center justify-center">
    <span className={included ? 'text-green-600' : 'text-gray-400'}>
      {children}
    </span>
    {!included && (
      <span className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
          <line x1="10" y1="90" x2="90" y2="10" stroke="#ef4444" strokeWidth="10" />
        </svg>
      </span>
    )}
  </span>
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
  const [agencias, setAgencias] = useState([]);
  const [distribucionesMap, setDistribucionesMap] = useState({}); // productId -> distribucion record
  const [agencyView, setAgencyView] = useState('Global'); // 'Global' or agency name to preview
  const [showDistribuirModal, setShowDistribuirModal] = useState(false);
  const [distribucion, setDistribucion] = useState({}); // { agenciaName: cantidad }

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

  const loadProductos = useCallback(async () => {
    if (!activeConnection) return;

    setLoading(true);
    try {
      console.warn('🔄 Cargando productos desde conexión activa...');

      // Usar ConnectionService para obtener datos de productos
      const result = await ConnectionService.getDataFromActiveConnection('productos');

      if (result.success && result.data) {
        setProductos(result.data);
        console.warn(`✅ ${result.data.length} productos cargados exitosamente`);

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
  }, [activeConnection]);

  // Cargar distribuciones desde tabla separada 'distribuciones'
  const loadDistribuciones = useCallback(async () => {
    if (!activeConnection) return;
    try {
      console.warn('🔄 Cargando distribuciones desde la tabla de distribuciones...');
      const res = await ConnectionService.getDataFromActiveConnection('distribuciones');
      if (res && res.success && Array.isArray(res.data)) {
        const map = {};
        res.data.forEach(r => {
          // intentar asociar al producto por campos comunes
          const pid = r.product_id ?? r.productId ?? r.product ? (r.product_id ?? r.productId ?? r.product) : null;
          if (pid) {
            map[String(pid)] = r;
          }
        });
        setDistribucionesMap(map);
        console.warn('✅ Distribuciones cargadas:', Object.keys(map).length);
      } else {
        console.warn('⚠️ No hay distribuciones en la conexión o no se pudo leer');
        setDistribucionesMap({});
      }
    } catch (err) {
      console.error('❌ Error cargando distribuciones:', err);
      setDistribucionesMap({});
    }
  }, [activeConnection]);

  useEffect(() => {
    checkActiveConnection();
  }, []);

  useEffect(() => {
    (async () => {
      if (activeConnection) {
        await loadProductos();
        await loadDistribuciones();
      }
    })();
  }, [activeConnection, loadProductos, loadDistribuciones]);

  // Cargar agencias al montar (por si se necesita antes de conexión)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await AgencyService.listAgencies({ activeOnly: true, limit: 500 });
        if (!mounted) return;
        const list = (res && res.data) ? res.data.map(a => a.name) : [];
        if (mounted) setAgencias(list);
      } catch {
        if (mounted) setAgencias(UserService.getValidAgencies());
      }
    })();
    return () => { mounted = false; };
  }, []);

  const checkActiveConnection = async () => {
    try {
      setConnectionStatus('checking');
      const connection = await ConnectionService.getActiveConnection('productos');
      
      if (connection) {
        setActiveConnection(connection);
        setConnectionStatus('connected');
  console.warn('✅ Conexión activa detectada:', connection);
      } else {
        setConnectionStatus('no_connection');
        console.warn('⚠️ No hay conexión activa configurada');
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('❌ Error verificando conexión activa:', error);
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

  const openDistribuir = (producto) => {
    setEditingProduct(producto);
    // Inicializar distribución: por defecto dejamos en undefined (ilimitado)
    // y solo prellenamos las agencias que ya tienen un valor explícito.
    const init = {};
    agencias.forEach(a => { init[a] = undefined; });
    // Si producto tiene campo distribucion por agencia, aplicarlo
    if (producto.distribucion && typeof producto.distribucion === 'object') {
      Object.entries(producto.distribucion).forEach(([k, v]) => {
        // v === null/''/undefined -> unlimited
        init[k] = v === null || v === '' ? undefined : Number(v) || undefined;
      });
    }
    setDistribucion(init);
    setShowDistribuirModal(true);
  };

  const handleDistributeStock = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    // No descontamos stock al guardar una distribución: los caps son límites de visibilidad
    // y no se suman. Simplemente persistimos la configuración de caps por agencia.

    try {
      setLoading(true);
      // Persistir distribuciones en una tabla separada 'distribuciones' en lugar de
      // sobrescribir el producto directamente. Mantendremos product.disponibilidad
      // como el total base; la disponibilidad por agencia se calcula en la UI.
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

      const recordId = resolveId(editingProduct);
      // Para operaciones específicas sobre la tabla 'distribuciones' no
      // asumimos el tableName por defecto de la conexión. Creamos un objeto
      // temporal con credentials.tableName = 'distribuciones' para pasar
      // explícitamente el destino al servicio de datos.
      const connForDistrib = {
        ...connWithCreds,
        credentials: {
          ...(connWithCreds.credentials || {}),
          tableName: 'distribuciones'
        }
      };

      // Usar la función RPC SECURITY DEFINER en la base: fn_upsert_distribucion
      // Construir cliente Supabase desde las credenciales desencriptadas
      if (connForDistrib && connForDistrib.credentials) {
        const creds = connForDistrib.credentials;
        const supabaseUrl = creds.projectUrl || creds.project_url || creds.url || creds.supabaseUrl || creds.supabase_url;
        const anonKey = creds.anonKey || creds.anon_key || creds.key;
        if (!supabaseUrl || !anonKey) throw new Error('Credenciales Supabase incompletas para RPC');
        // crear cliente temporal que reutiliza el storageKey por tabla
        const supabase = createCustomSupabaseClient(
          supabaseUrl,
          anonKey,
          { storageKey: `sb-rpc-distribuciones` }
        );

        // Sanitize payload: representamos 'unlimited' as null
        const distribForRpc = {};
        Object.entries(distribucion || {}).forEach(([k, v]) => {
          if (v === undefined || v === null || v === '') {
            distribForRpc[k] = null; // means unlimited for that agency
          } else if (!Number.isNaN(Number(v))) {
            distribForRpc[k] = Number(v);
          }
        });

        const payload = {
          p_product_id: Number(recordId),
          p_distribucion: distribForRpc,
          p_total_asignado: null,
          p_updated_at: new Date().toISOString()
        };

        console.warn('🔄 Llamando RPC fn_upsert_distribucion con payload:', payload);
        const { error: rpcErr } = await supabase.rpc('fn_upsert_distribucion', payload);
        if (rpcErr) {
          // mostrar mensaje más legible si viene de la DB
          throw new Error(rpcErr.message || JSON.stringify(rpcErr));
        }
      } else {
        throw new Error('Conexión para distribuciones no configurada');
      }

      // Éxito
      await loadDistribuciones();
      setShowDistribuirModal(false);
      Swal.fire({ icon: 'success', title: 'Distribución guardada', timer: 1600, showConfirmButton: false });
    } catch (error) {
      console.error('Error guardando distribución:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo guardar la distribución' });
    } finally {
      setLoading(false);
    }
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
  console.warn('🗑️ Eliminando producto:', producto);
  console.warn('🆔 ID detectado para delete:', resolveId(producto));
        
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
  op: formData.op !== '' && formData.op != null ? String(Number(formData.op).toFixed(2)) : null,
        carryon: Boolean(formData.carryon),
        handbag: Boolean(formData.handbag),
        checkedbag: Boolean(formData.checkedbag),
        inf_fare: formData.inf_fare
      };

  console.warn(editingProduct ? '✏️ Actualizando producto:' : '➕ Creando producto:', productData);

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
  console.warn('🔎 ID detectado para update:', recordId, editingProduct);
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

  // Memoized handler para cambios de ruta (evita recrear la función en cada render)
  const handleRutaChange = useCallback((value) => {
    setFormData(prev => {
      // Normalizar a string JSON canónica
      let newRuta = '';
      try {
        if (!value) newRuta = '';
        else if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            newRuta = JSON.stringify(parsed);
          } catch {
            newRuta = value;
          }
        } else if (typeof value === 'object') {
          newRuta = JSON.stringify(value);
        } else {
          newRuta = String(value);
        }
      } catch {
        newRuta = String(value);
      }

      try {
        const prevRutaCanonical = prev.ruta ? JSON.stringify(JSON.parse(prev.ruta)) : '';
        if (prevRutaCanonical === newRuta) return prev;
      } catch {
        if (prev.ruta === newRuta) return prev;
      }

      return { ...prev, ruta: newRuta };
    });
  }, []);

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
          <div className="flex gap-2 items-center">
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
            {/* Selector de vista por agencia */}
            <div className="flex items-center space-x-2 ml-3">
              <label className="text-sm text-gray-600">Ver disponibilidad:</label>
              <select value={agencyView} onChange={(e) => setAgencyView(e.target.value)} className="px-2 py-1 border rounded">
                <option value="Global">Global</option>
                {agencias.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
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
                        {
                          (() => {
                            const pid = String(resolveId(producto) ?? '');
                            const distRecord = distribucionesMap[pid];
                            const base = Number(producto.disponibilidad || 0);
                            // helper to sum distribuciones object
                            const sumDistrib = (obj) => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);

                            let displayValue = base;
                            let assignedNote = null;

                            if (agencyView === 'Global') {
                              if (distRecord && distRecord.distribucion && typeof distRecord.distribucion === 'object') {
                                const total = sumDistrib(distRecord.distribucion);
                                displayValue = total;
                                assignedNote = `Asignado: ${total}`;
                              } else {
                                displayValue = base;
                              }
                            } else {
                              // view by specific agency
                              if (distRecord && distRecord.distribucion && typeof distRecord.distribucion === 'object') {
                                const val = Number(distRecord.distribucion[agencyView] || 0);
                                displayValue = val;
                                const total = sumDistrib(distRecord.distribucion);
                                assignedNote = `Asignado total: ${total}`;
                              } else {
                                // no distribuciones -> show base availability as full
                                displayValue = base;
                              }
                            }

                            const badgeClass = displayValue > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

                            return (
                              <>
                                <span className={`px-2 py-1 rounded-full text-xs ${badgeClass}`}>
                                  {displayValue}
                                </span>
                                {assignedNote && (
                                  <div className="text-xs text-gray-500 mt-1">{assignedNote}</div>
                                )}
                              </>
                            );
                          })()
                        }
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
                        {(
                          producto.ruta && (
                            (typeof producto.ruta === 'string' && producto.ruta.trim() !== '') ||
                            (typeof producto.ruta === 'object' && Array.isArray(producto.ruta.vuelos) && producto.ruta.vuelos.length > 0)
                          )
                        ) ? (
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
                        {producto.op ? `$${producto.op}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-center text-gray-500">
                        <div className="flex items-center justify-center gap-3">
                          <span title="Handbag">
                            <_BaggageIcon included={!!producto.handbag}>
                              <HiOutlineBriefcase size={25} />
                            </_BaggageIcon>
                          </span>
                          <span title="Carry-on">
                            <_BaggageIcon included={!!producto.carryon}>
                              <MdOutlineLuggage size={25} />
                            </_BaggageIcon>
                          </span>
                          <span title="Checked bag">
                            <_BaggageIcon included={!!producto.checkedbag}>
                              <FaSuitcaseRolling size={25} />
                            </_BaggageIcon>
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
                          <button
                            onClick={() => openDistribuir(producto)}
                            className="text-[#767c87] px-3 py-1 rounded text-sm hover:text-[#2c4b8b] transition-colors"
                            title="Distribuir stock"
                          >
                            <LuGitBranchPlus className='w-5 h-5'/>
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

        {/* Modal de formulario mejorado */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-[#2c4b8b]">
                      {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete la información del producto. Los campos marcados con * son obligatorios.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <HiMiniXMark className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                {/* Sección de Información Básica */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#2c4b8b] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">1</span>
                    Información Básica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-9">
                    {/* Código Cupo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código Cupo *
                      </label>
                      <input
                        type="text"
                        value={formData.codigo_cupo}
                        onChange={(e) => setFormData({...formData, codigo_cupo: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                        placeholder="Ej: ABC123"
                        required
                      />
                    </div>

                    {/* Destino */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destino *
                      </label>
                      <input
                        type="text"
                        value={formData.destino}
                        onChange={(e) => setFormData({...formData, destino: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                        placeholder="Ej: Madrid"
                        required
                      />
                    </div>

                    {/* Compañía */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Compañía *
                      </label>
                      <select
                        value={formData.compania}
                        onChange={(e) => setFormData({...formData, compania: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                        required
                      >
                        <option value="">Seleccionar compañía</option>
                        {Object.entries(AIRLINES).map(([code, name]) => (
                          <option key={code} value={code}>{code} - {name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Disponibilidad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disponibilidad
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.disponibilidad}
                        onChange={(e) => setFormData({...formData, disponibilidad: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                        placeholder="0"
                      />
                    </div>

                    {/* PNR */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PNR
                      </label>
                      <input
                        type="text"
                        value={formData.pnr}
                        onChange={(e) => setFormData({...formData, pnr: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                        placeholder="Ej: ABC123"
                      />
                    </div>

                    {/* Ficha */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ficha
                      </label>
                      <input
                        type="text"
                        value={formData.ficha}
                        onChange={(e) => setFormData({...formData, ficha: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                        placeholder="Número de ficha"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección de Fechas y Precios */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#2c4b8b] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">2</span>
                    Fechas y Precios
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pl-9">
                    {/* Fecha Salida */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Salida
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_salida}
                        onChange={(e) => setFormData({...formData, fecha_salida: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                      />
                    </div>

                    {/* Fecha Regreso */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Regreso
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_regreso}
                        onChange={(e) => setFormData({...formData, fecha_regreso: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                      />
                    </div>

                    {/* Precio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.precio}
                          onChange={(e) => setFormData({...formData, precio: e.target.value})}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Neto 1 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Neto 1
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.neto_1}
                          onChange={(e) => setFormData({...formData, neto_1: e.target.value})}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Temporada */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temporada
                      </label>
                      <select
                        value={formData.temporada}
                        onChange={(e) => setFormData({...formData, temporada: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                      >
                        <option value="">Seleccionar</option>
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                    </div>

                    {/* OP */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        OP (monto)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.op}
                          onChange={(e) => setFormData({...formData, op: e.target.value})}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Tarifa Infante */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tarifa Infante
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.inf_fare}
                          onChange={(e) => setFormData({...formData, inf_fare: e.target.value})}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2c4b8b] focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección de Ruta */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#2c4b8b] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">3</span>
                    Ruta de Vuelo
                  </h3>
                  <div className="pl-9">
                    <FlightSegmentBuilder
                      value={formData.ruta}
                      onChange={handleRutaChange}
                    />
                  </div>
                </div>

                {/* Sección de Equipaje */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="bg-[#2c4b8b] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">4</span>
                    Configuración de Equipaje
                  </h3>
                  <div className="pl-9">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={!!formData.handbag}
                            onChange={(e) => setFormData({...formData, handbag: e.target.checked})}
                            className="w-5 h-5 text-[#2c4b8b] border-gray-300 rounded focus:ring-[#2c4b8b]"
                          />
                          <div className="flex items-center space-x-2">
                            <HiOutlineBriefcase className={`w-6 h-6 ${formData.handbag ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              Handbag (Bolso de mano)
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={!!formData.carryon}
                            onChange={(e) => setFormData({...formData, carryon: e.target.checked})}
                            className="w-5 h-5 text-[#2c4b8b] border-gray-300 rounded focus:ring-[#2c4b8b]"
                          />
                          <div className="flex items-center space-x-2">
                            <MdOutlineLuggage className={`w-6 h-6 ${formData.carryon ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              Carry-on (Equipaje de mano)
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={!!formData.checkedbag}
                            onChange={(e) => setFormData({...formData, checkedbag: e.target.checked})}
                            className="w-5 h-5 text-[#2c4b8b] border-gray-300 rounded focus:ring-[#2c4b8b]"
                          />
                          <div className="flex items-center space-x-2">
                            <FaSuitcaseRolling className={`w-6 h-6 ${formData.checkedbag ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              Checked bag (Equipaje facturado)
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#2c4b8b] text-white rounded-lg hover:bg-[#1e355e] disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <HiOutlineCheck className="w-5 h-5" />
                        {editingProduct ? 'Actualizar' : 'Crear'} Producto
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modal distribuir stock */}
      {showDistribuirModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2c4b8b]">Distribuir Stock por Agencia</h3>
              <button onClick={() => setShowDistribuirModal(false)} className="text-gray-500">&times;</button>
            </div>
            <form onSubmit={handleDistributeStock} className="space-y-4">
              <div className="text-sm text-gray-600">Disponibilidad total: <strong>{editingProduct?.disponibilidad || 0}</strong></div>
              <div className="grid grid-cols-1 gap-3">
                {agencias.map((a) => (
                  <label key={a} className="flex items-center justify-between">
                    <span>{a}</span>
                    <input
                      type="number"
                      min="0"
                      value={distribucion[a] ?? 0}
                      onChange={(e) => setDistribucion({...distribucion, [a]: Number(e.target.value)})}
                      className="w-28 px-3 py-1 border rounded"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowDistribuirModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#2c4b8b] text-white rounded">Guardar distribución</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GestionProductos;