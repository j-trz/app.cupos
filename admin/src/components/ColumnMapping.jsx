import { useState, useEffect } from 'react';
import { FaSync, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import ConnectionService from '../services/connectionService';

const ColumnMapping = ({ connection, onMappingChange, userPassword }) => {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mappings, setMappings] = useState({});

  // Campos de la aplicación que se pueden mapear
  const appFields = [
    { key: 'nombre_completo', label: 'Nombre Completo', required: true },
    { key: 'cedula', label: 'Cédula', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'telefono', label: 'Teléfono', required: false },
    { key: 'fecha_salida', label: 'Fecha de Salida', required: true },
    { key: 'ruta', label: 'Ruta/Itinerario', required: true },
    { key: 'temporada', label: 'Temporada', required: false },
    { key: 'asiento', label: 'Asiento', required: false },
    { key: 'estado', label: 'Estado', required: false },
    { key: 'observaciones', label: 'Observaciones', required: false }
  ];

  useEffect(() => {
    if (connection && userPassword) {
      fetchSchema();
    }
  }, [connection, userPassword]);

  async function fetchSchema() {
    if (!connection || !userPassword) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await ConnectionService.getTableSchema(connection.id, userPassword);
      if (result.success) {
        setSchema(result.schema);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleMappingChange(appField, externalField) {
    const newMappings = {
      ...mappings,
      [appField]: externalField
    };
    setMappings(newMappings);
    onMappingChange(newMappings);
  }

  function getUnmappedFields() {
    const mappedFields = Object.values(mappings).filter(Boolean);
    return schema?.fields?.filter(field => !mappedFields.includes(field.name)) || [];
  }

  function getMappingStatus() {
    const requiredFields = appFields.filter(field => field.required);
    const mappedRequired = requiredFields.filter(field => mappings[field.key]);
    return {
      total: appFields.length,
      mapped: Object.keys(mappings).filter(key => mappings[key]).length,
      required: requiredFields.length,
      mappedRequired: mappedRequired.length
    };
  }

  const status = getMappingStatus();
  const isValid = status.mappedRequired === status.required;

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-center">
          <FaSync className="animate-spin text-2xl text-blue-600 mr-3" />
          <span>Obteniendo esquema de la tabla...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <div className="flex items-center mb-3">
          <FaExclamationTriangle className="text-red-600 mr-2" />
          <h3 className="font-medium text-red-800">Error al obtener esquema</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchSchema}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          <FaSync />
          Reintentar
        </button>
      </div>
    );
  }

  if (!schema || !schema.fields) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <p className="text-yellow-800">No se pudo obtener el esquema de la tabla.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado del mapeo */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-800">Estado del Mapeo</h3>
            <p className="text-sm text-blue-600">
              {status.mapped} de {status.total} campos mapeados 
              ({status.mappedRequired} de {status.required} requeridos)
            </p>
          </div>
          <div className="flex items-center">
            {isValid ? (
              <div className="flex items-center text-green-600">
                <FaCheck className="mr-1" />
                <span className="font-medium">Válido</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-600">
                <FaExclamationTriangle className="mr-1" />
                <span className="font-medium">Faltan campos requeridos</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información del esquema */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Esquema de la tabla: {schema.tableName}</h3>
        <p className="text-sm text-gray-600">
          {schema.fields.length} campos disponibles en la fuente externa
        </p>
      </div>

      {/* Mapeo de campos */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Mapeo de Campos</h3>
        
        {appFields.map(appField => (
          <div key={appField.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 border rounded-lg">
            <div>
              <label className="block font-medium">
                {appField.label}
                {appField.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <p className="text-sm text-gray-500">Campo de la aplicación</p>
            </div>
            
            <div className="text-center">
              <span className="text-gray-400">→</span>
            </div>
            
            <div>
              <select
                value={mappings[appField.key] || ''}
                onChange={(e) => handleMappingChange(appField.key, e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar campo externo...</option>
                {getUnmappedFields().map(field => (
                  <option key={field.name} value={field.name}>
                    {field.name} ({field.type})
                  </option>
                ))}
                {mappings[appField.key] && (
                  <option value={mappings[appField.key]}>
                    {mappings[appField.key]} (actual)
                  </option>
                )}
              </select>
              {mappings[appField.key] && (
                <p className="text-xs text-green-600 mt-1">
                  Mapeado a: {mappings[appField.key]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Campos no mapeados */}
      {getUnmappedFields().length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2">
            Campos disponibles sin mapear ({getUnmappedFields().length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {getUnmappedFields().map(field => (
              <span
                key={field.name}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm"
              >
                {field.name} ({field.type})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de validación */}
      <div className={`p-4 rounded-lg border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h4 className={`font-medium mb-2 ${isValid ? 'text-green-800' : 'text-red-800'}`}>
          Validación del Mapeo
        </h4>
        
        {isValid ? (
          <p className="text-green-700">
            ✅ Todos los campos requeridos están mapeados. La configuración es válida.
          </p>
        ) : (
          <div className="text-red-700">
            <p className="mb-2">❌ Faltan mapear los siguientes campos requeridos:</p>
            <ul className="list-disc list-inside">
              {appFields
                .filter(field => field.required && !mappings[field.key])
                .map(field => (
                  <li key={field.key}>{field.label}</li>
                ))
              }
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnMapping;