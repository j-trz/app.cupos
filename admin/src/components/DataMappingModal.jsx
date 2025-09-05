import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const DataMappingModal = ({ isOpen, onClose, connection, onSave }) => {
  const [mapping, setMapping] = useState({});
  const [sampleData, setSampleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  // Campos estándar de la aplicación
  const standardFields = {
    // Campos para productos/disponibilidad
    products: [
      { key: 'codigo_cupo', label: 'Código de Cupo', required: true, type: 'string' },
      { key: 'destino', label: 'Destino', required: true, type: 'string' },
      { key: 'compania', label: 'Compañía', required: true, type: 'string' },
      { key: 'disponibilidad', label: 'Disponibilidad', required: true, type: 'number' },
      { key: 'salida', label: 'Fecha de Salida', required: false, type: 'date' },
      { key: 'regreso', label: 'Fecha de Regreso', required: false, type: 'date' },
      { key: 'precio', label: 'Precio', required: false, type: 'number' },
      { key: 'ruta', label: 'Ruta', required: false, type: 'string' },
      { key: 'pnr', label: 'PNR', required: false, type: 'string' },
      { key: 'ficha', label: 'Ficha', required: false, type: 'string' },
      { key: 'temporada', label: 'Temporada', required: false, type: 'string' },
    ],
    // Campos para pedidos/reservas
    orders: [
      { key: 'Estado', label: 'Estado', required: true, type: 'string' },
      { key: 'Pedido_ID', label: 'ID del Pedido', required: true, type: 'string' },
      { key: 'Agencia', label: 'Agencia', required: true, type: 'string' },
      { key: 'Contacto_Nombre', label: 'Nombre del Contacto', required: true, type: 'string' },
      { key: 'Contacto_Email', label: 'Email del Contacto', required: true, type: 'email' },
      { key: 'Contacto_Telefono', label: 'Teléfono del Contacto', required: false, type: 'string' },
      { key: 'Vuelo_Codigo', label: 'Código de Vuelo', required: true, type: 'string' },
      { key: 'Vuelo_Destino', label: 'Destino del Vuelo', required: true, type: 'string' },
      { key: 'Vuelo_Compania', label: 'Compañía del Vuelo', required: true, type: 'string' },
      { key: 'Vuelo_Salida', label: 'Fecha de Salida', required: true, type: 'date' },
      { key: 'Vuelo_Precio', label: 'Precio del Vuelo', required: false, type: 'number' },
      { key: 'Nombre_Pasajero', label: 'Nombre del Pasajero', required: true, type: 'string' },
      { key: 'Apellido_Pasajero', label: 'Apellido del Pasajero', required: true, type: 'string' },
      { key: 'Documento_Pasajero', label: 'Documento del Pasajero', required: true, type: 'string' },
      { key: 'Nacimiento_Pasajero', label: 'Fecha de Nacimiento', required: false, type: 'date' },
      { key: 'Nacionalidad_Pasajero', label: 'Nacionalidad', required: false, type: 'string' },
      { key: 'Tipo_Pasajero', label: 'Tipo de Pasajero', required: false, type: 'string' },
    ]
  };

  const [dataType, setDataType] = useState('products');
  const currentFields = standardFields[dataType];

  useEffect(() => {
    if (isOpen && connection) {
      loadSampleData();
      // Cargar mapeo existente si existe
      if (connection.column_mapping) {
        try {
          const existingMapping = JSON.parse(connection.column_mapping);
          setMapping(existingMapping[dataType] || {});
        } catch (error) {
          console.error('Error parsing existing mapping:', error);
        }
      }
    }
  }, [isOpen, connection, dataType]);

  const loadSampleData = async () => {
    setLoading(true);
    try {
      // Aquí simularemos datos de muestra basados en el tipo de conexión
      // En una implementación real, esto haría una llamada a la API para obtener datos de muestra
      let sample = [];
      
      switch (connection.type) {
        case 'supabase':
          sample = [
            { id: 1, cupo_code: 'CUP001', destination: 'Paris', airline: 'Air France', availability: 5 },
            { id: 2, flight_code: 'AF123', passenger_name: 'Juan', passenger_lastname: 'Pérez' }
          ];
          break;
        case 'mongodb':
          sample = [
            { _id: '507f1f77bcf86cd799439011', cupoCode: 'CUP001', destination: 'Madrid', airline: 'Iberia' },
            { _id: '507f1f77bcf86cd799439012', orderId: 'ORD001', passengerName: 'Ana', agency: 'Travel Plus' }
          ];
          break;
        case 'smartsheet':
          sample = [
            { id: 1, cells: [{ value: 'CUP001' }, { value: 'Londres' }, { value: 'British Airways' }, { value: 3 }] },
            { id: 2, cells: [{ value: 'Confirmado' }, { value: 'ORD001' }, { value: 'Travel Express' }] }
          ];
          break;
        case 'tableau':
          sample = [
            { 'Cupo Code': 'CUP001', 'Destination': 'Roma', 'Airline': 'Alitalia', 'Availability': 2 },
            { 'Order ID': 'ORD001', 'Passenger Name': 'Carlos', 'Agency': 'Viajes del Sol' }
          ];
          break;
        default:
          sample = [
            { codigo_cupo: 'CUP001', destino: 'Barcelona', compania: 'Vueling', disponibilidad: 4 },
            { Pedido_ID: 'ORD001', Nombre_Pasajero: 'María', Agencia: 'Turismo Global' }
          ];
      }
      
      setSampleData(sample);
    } catch (error) {
      console.error('Error loading sample data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos de muestra'
      });
    }
    setLoading(false);
  };

  const handleMappingChange = (standardField, sourceField) => {
    setMapping(prev => ({
      ...prev,
      [standardField]: sourceField
    }));
  };

  const generatePreview = () => {
    if (sampleData.length === 0) return;

    const preview = sampleData.map(item => {
      const mappedItem = {};
      currentFields.forEach(field => {
        const sourceField = mapping[field.key];
        if (sourceField && item[sourceField] !== undefined) {
          mappedItem[field.key] = item[sourceField];
        } else {
          mappedItem[field.key] = '';
        }
      });
      return mappedItem;
    });

    setPreviewData(preview);
  };

  const handleSave = async () => {
    try {
      // Validar que los campos requeridos estén mapeados
      const missingRequired = currentFields
        .filter(field => field.required && !mapping[field.key])
        .map(field => field.label);

      if (missingRequired.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos requeridos faltantes',
          html: `Los siguientes campos son obligatorios:<br><strong>${missingRequired.join(', ')}</strong>`
        });
        return;
      }

      // Crear mapeo completo (productos y pedidos)
      const existingMapping = connection.column_mapping ? JSON.parse(connection.column_mapping) : {};
      const fullMapping = {
        ...existingMapping,
        [dataType]: mapping
      };

      await onSave(connection.id, { column_mapping: JSON.stringify(fullMapping) });
      
      Swal.fire({
        icon: 'success',
        title: 'Mapeo guardado',
        text: 'La configuración de mapeo se ha guardado correctamente',
        timer: 2000,
        showConfirmButton: false
      });

      onClose();
    } catch (error) {
      console.error('Error saving mapping:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar el mapeo'
      });
    }
  };

  const getSourceFields = () => {
    if (sampleData.length === 0) return [];
    
    const firstItem = sampleData[0];
    if (connection.type === 'smartsheet') {
      // Para Smartsheet, mostrar posiciones de celdas
      return firstItem.cells ? firstItem.cells.map((_, index) => `cells[${index}]`) : [];
    }
    
    return Object.keys(firstItem);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <FaColumns className="text-[#2c4b8b]" />
            <div>
              <h2 className="text-xl font-semibold text-[#2c4b8b]">
                Configurar Mapeo de Datos
              </h2>
              <p className="text-sm text-gray-600">{connection?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {/* Selector de tipo de datos */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Tipo de Datos a Mapear</label>
            <div className="flex gap-4">
              <button
                onClick={() => setDataType('products')}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  dataType === 'products'
                    ? 'bg-[#2c4b8b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FaColumns />
                Productos/Disponibilidad
              </button>
              <button
                onClick={() => setDataType('orders')}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  dataType === 'orders'
                    ? 'bg-[#2c4b8b] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FaColumns />
                Pedidos/Reservas
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin text-4xl text-[#2c4b8b] mb-4">⏳</div>
              <p className="text-gray-500">Cargando datos de muestra...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel de mapeo */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FaArrowRight className="text-[#2c4b8b]" />
                  Configuración de Mapeo
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto border rounded p-4">
                  {currentFields.map(field => (
                    <div key={field.key} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {field.type}
                        </span>
                      </div>
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#2c4b8b] text-sm"
                      >
                        <option value="">-- Seleccionar campo fuente --</option>
                        {getSourceFields().map(sourceField => (
                          <option key={sourceField} value={sourceField}>
                            {sourceField}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel de vista previa */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    👁️ Vista Previa
                  </h3>
                  <button
                    onClick={generatePreview}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    <FaPlay className="text-xs" />
                    Generar Preview
                  </button>
                </div>

                {previewData.length > 0 ? (
                  <div className="border rounded overflow-hidden">
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {currentFields.slice(0, 4).map(field => (
                              <th key={field.key} className="px-2 py-2 text-left font-medium">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 3).map((item, index) => (
                            <tr key={index} className="border-t">
                              {currentFields.slice(0, 4).map(field => (
                                <td key={field.key} className="px-2 py-2">
                                  <span className={item[field.key] ? 'text-gray-900' : 'text-red-400 italic'}>
                                    {item[field.key] || 'Sin mapear'}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600">
                      Mostrando {Math.min(3, previewData.length)} de {previewData.length} registros
                    </div>
                  </div>
                ) : (
                  <div className="border rounded p-8 text-center text-gray-500">
                    <FaExclamationTriangle className="mx-auto mb-2 text-2xl" />
                    <p>Haz clic en "Generar Preview" para ver cómo se mapearán los datos</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Datos de muestra */}
          {sampleData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-3">Datos de Muestra de la Fuente</h4>
              <div className="bg-gray-50 p-4 rounded max-h-32 overflow-auto">
                <pre className="text-xs text-gray-700">
                  {JSON.stringify(sampleData.slice(0, 2), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="border-t p-6">
          <div className="flex gap-4 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FaTimes />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#2c4b8b] text-white rounded hover:bg-[#1e355e] transition-colors flex items-center gap-2"
            >
              <FaSave />
              Guardar Mapeo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMappingModal;