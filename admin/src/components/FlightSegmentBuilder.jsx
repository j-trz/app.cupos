import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowRight } from 'react-icons/hi2'; // eslint-disable-line no-unused-vars
import { AIRLINES, AIRLINE_LOGOS, AIRPORTS } from './ItineraryDetails';

const FlightSegmentBuilder = ({ value, onChange, disabled }) => {
  const [segments, setSegments] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);

  // Parsear el valor inicial cuando cambia
  useEffect(() => {
    if (value && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed.vuelos && Array.isArray(parsed.vuelos)) {
          setSegments(parsed.vuelos);
        }
      } catch {
        // Si no es JSON válido, intentar parsear formato legacy
        console.log('Parsing legacy format:', value);
      }
    }
  }, [value]);

  // Actualizar el valor cuando cambian los segmentos
  useEffect(() => {
    if (segments.length > 0) {
      const rutaObj = {
        localizadorReserva: "",
        detallesViajero: [],
        vuelos: segments
      };
      onChange(JSON.stringify(rutaObj));
    } else {
      onChange('');
    }
  }, [segments, onChange]);

  const addSegment = () => {
    const newSegment = {
      aerolinea: '',
      numeroVuelo: '',
      fecha: '',
      origen: '',
      destino: '',
      horaSalida: '',
      horaLlegada: '',
      clase: 'Economy'
    };
    setSegments([...segments, newSegment]);
    setShowBuilder(true);
  };

  const updateSegment = (index, field, value) => {
    const updatedSegments = segments.map((seg, i) => 
      i === index ? { ...seg, [field]: value } : seg
    );
    setSegments(updatedSegments);
  };

  const removeSegment = (index) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const formatSegmentDisplay = (segment) => {
    return `${segment.aerolinea}${segment.numeroVuelo} - ${segment.origen} → ${segment.destino}`;
  };

  return (
    <div className="space-y-4">
      {/* Vista compacta de segmentos */}
      {!showBuilder && segments.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Ruta actual</span>
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="text-xs text-[#2c4b8b] hover:underline"
              disabled={disabled}
            >
              Editar ruta
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                <span>{formatSegmentDisplay(segment)}</span>
                {index < segments.length - 1 && <HiOutlineArrowRight className="text-gray-400" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Builder expandido */}
      {(showBuilder || segments.length === 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Segmentos de vuelo</h4>
            {segments.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Colapsar
              </button>
            )}
          </div>

          {/* Lista de segmentos */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {segments.map((segment, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 relative">
                <button
                  type="button"
                  onClick={() => removeSegment(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  disabled={disabled}
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-[#2c4b8b] text-white text-xs font-bold px-2 py-1 rounded">
                    Vuelo {index + 1}
                  </span>
                  {segment.aerolinea && AIRLINE_LOGOS[segment.aerolinea] && (
                    <img
                      src={AIRLINE_LOGOS[segment.aerolinea]}
                      alt={AIRLINES[segment.aerolinea] || segment.aerolinea}
                      className="h-6 w-6 object-contain"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Aerolínea */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Aerolínea (código IATA)
                    </label>
                    <select
                      value={segment.aerolinea}
                      onChange={(e) => updateSegment(index, 'aerolinea', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    >
                      <option value="">Seleccionar...</option>
                      {Object.entries(AIRLINES).sort(([,a], [,b]) => a.localeCompare(b)).map(([code, name]) => (
                        <option key={code} value={code}>
                          {code} - {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Número de vuelo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Número de vuelo
                    </label>
                    <input
                      type="text"
                      value={segment.numeroVuelo}
                      onChange={(e) => updateSegment(index, 'numeroVuelo', e.target.value)}
                      placeholder="Ej: 1234"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    />
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={segment.fecha}
                      onChange={(e) => updateSegment(index, 'fecha', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    />
                  </div>

                  {/* Clase */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Clase
                    </label>
                    <select
                      value={segment.clase}
                      onChange={(e) => updateSegment(index, 'clase', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    >
                      <option value="Economy">Economy</option>
                      <option value="Premium Economy">Premium Economy</option>
                      <option value="Business">Business</option>
                      <option value="First">First</option>
                    </select>
                  </div>

                  {/* Origen */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Origen (código IATA)
                    </label>
                    <input
                      type="text"
                      value={segment.origen}
                      onChange={(e) => updateSegment(index, 'origen', e.target.value.toUpperCase())}
                      placeholder="Ej: MVD"
                      maxLength="3"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    />
                    {segment.origen && AIRPORTS[segment.origen] && (
                      <p className="text-xs text-gray-500 mt-1">{AIRPORTS[segment.origen]}</p>
                    )}
                  </div>

                  {/* Destino */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Destino (código IATA)
                    </label>
                    <input
                      type="text"
                      value={segment.destino}
                      onChange={(e) => updateSegment(index, 'destino', e.target.value.toUpperCase())}
                      placeholder="Ej: MAD"
                      maxLength="3"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    />
                    {segment.destino && AIRPORTS[segment.destino] && (
                      <p className="text-xs text-gray-500 mt-1">{AIRPORTS[segment.destino]}</p>
                    )}
                  </div>

                  {/* Hora salida */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hora salida
                    </label>
                    <input
                      type="time"
                      value={segment.horaSalida}
                      onChange={(e) => updateSegment(index, 'horaSalida', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    />
                  </div>

                  {/* Hora llegada */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hora llegada
                    </label>
                    <input
                      type="time"
                      value={segment.horaLlegada}
                      onChange={(e) => updateSegment(index, 'horaLlegada', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#2c4b8b]"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón agregar segmento */}
          <button
            type="button"
            onClick={addSegment}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
            disabled={disabled}
          >
            <HiOutlinePlus className="w-4 h-4" />
            Agregar segmento de vuelo
          </button>
        </div>
      )}

      {/* Campo oculto con el valor JSON */}
      <input
        type="hidden"
        value={value || ''}
      />
    </div>
  );
};

export default FlightSegmentBuilder;