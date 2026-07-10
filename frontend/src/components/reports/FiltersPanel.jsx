import React, { useState, useRef, useEffect } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Tooltip } from 'react-tooltip';

export default function FiltersPanel({ fields, filters, onFilterChange, onApplyFilters, temporadasValidas }) {
  let mappedFields = fields;
  const companiaField = fields.find(f => f.field === 'Compañía');
  if (companiaField && !fields.find(f => f.field === 'Proveedor')) {
    mappedFields = [
      { ...companiaField, field: 'Proveedor' },
      ...fields
    ];
  }
  mappedFields = mappedFields.map(f =>
    f.field === 'Temporada' && Array.isArray(temporadasValidas) && temporadasValidas.length > 0
      ? { ...f, values: temporadasValidas }
      : f
  );
  const allowed = [
    'Proveedor',
    'Tipo de servicio', 'Tipo Servicio', 'Tipo de operación', 'Destino', 'Compañia', 'Salida', 'Regreso', 'Temporada'
  ];

  React.useEffect(() => {
    const tipoServicioField = mappedFields.find(f => f.field === 'Tipo Servicio' || f.field === 'Tipo de servicio');
    const hayFiltros = Object.values(filters).some(v => v);
    if (tipoServicioField && !filters[tipoServicioField.field] && !hayFiltros) {
      onFilterChange(tipoServicioField.field, 'Aéreo');
    }
  }, [mappedFields, filters, onFilterChange]);

  const multiFields = ['Temporada', 'Tipo de servicio', 'Tipo Servicio', 'Tipo de producto', 'Producto'];
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});

  useEffect(() => {
    function handleClickOutside(event) {
      if (openDropdown && dropdownRefs.current[openDropdown] && !dropdownRefs.current[openDropdown].contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  return (
    <div className="w-72 bg-white rounded-lg p-3 mb-4">
      <div className="flex flex-col gap-2 mb-3">
        {mappedFields.filter(f => allowed.includes(f.field)).map(f => (
          <div key={f.field} className="relative" ref={el => { if (el) dropdownRefs.current[f.field] = el; }}>
            {(() => {
              let tooltipText = '';
              if (f.field === 'Proveedor' || f.field === 'Compañia') tooltipText = 'Proveedor / compañía responsable del cupo (aerolínea o proveedor).';
              if (f.field === 'Tipo de servicio' || f.field === 'Tipo Servicio') tooltipText = 'Tipo de servicio (Aéreo, Barco, etc.). Algunos cálculos ignoran este filtro.';
              if (f.field === 'Tipo de operación') tooltipText = 'Tipo de operación calculado a partir del cupo: CHARTERS, DESTINO ARG o CUPOS.';
              if (f.field === 'Destino') tooltipText = 'Destino comercial del cupo/pasajero.';
              if (f.field === 'Salida') tooltipText = 'Fecha de salida del servicio (filtro por fecha).';
              if (f.field === 'Regreso') tooltipText = 'Fecha de regreso del servicio (filtro por fecha).';
              if (f.field === 'Temporada') tooltipText = 'Temporada comercial (ej.: Semana Santa 2025). Usado para agrupar y filtrar.';
              const labelText = f.field === 'Tipo de operación' ? 'Tipo producto' : f.field === 'Aerolinea' ? 'Aerolínea' : f.field;
              return (
                <>
                  <label
                    className="block text-xs font-semibold mb-1 text-[#304D85]"
                    data-tooltip-id={tooltipText ? `tt-${f.field}` : undefined}
                    data-tooltip-content={tooltipText || undefined}
                    style={{ cursor: tooltipText ? 'help' : undefined }}
                  >
                    {labelText}
                  </label>
                  {tooltipText && (
                    <Tooltip
                      id={`tt-${f.field}`}
                      place="top"
                      style={{
                        background: 'linear-gradient(135deg, #23272f 60%, #434a54 100%)',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)',
                        padding: '6px 10px',
                        zIndex: 2147483647,
                        pointerEvents: 'auto'
                      }}
                      wrapperStyle={{ zIndex: 2147483647 }}
                    />
                  )}
                </>
              );
            })()}
            {(multiFields.includes(f.field) || f.field === 'Tipo de operación') ? (
              <Listbox
                value={Array.isArray(filters[f.field]) ? filters[f.field] : []}
                onChange={val => onFilterChange(f.field, val)}
                multiple
              >
                <div className="relative">
                  <ListboxButton className="w-full border border-[#d1d5db] rounded-lg p-1.5 bg-white cursor-pointer min-h-8 flex items-center justify-between transition-all duration-150 shadow-sm text-xs">
                    <span className="truncate">
                      {Array.isArray(filters[f.field]) && filters[f.field].length > 0
                        ? filters[f.field].join(', ')
                        : `Seleccionar ${f.field.toLowerCase()}...`}
                    </span>
                    <ChevronUpDownIcon className="w-4 h-4 text-gray-400 ml-1" aria-hidden="true" />
                  </ListboxButton>
                  <ListboxOptions className="absolute z-10 bg-white border border-[#d1d5db] rounded-lg shadow-lg w-full mt-1 max-h-36 overflow-y-auto text-xs">
                    {f.values.map((v, idx) => {
                      const value = typeof v === 'object' ? v.text : v;
                      return (
                        <ListboxOption key={value + '-' + idx} value={value} className={({ active }) => `flex items-center px-2 py-1 cursor-pointer ${active ? 'bg-blue-50' : ''}`}>
                          {() => (
                            <>
                              <input
                                type="checkbox"
                                checked={Array.isArray(filters[f.field]) && filters[f.field].includes(value)}
                                readOnly
                                className="mr-2"
                              />
                              <span>{value}</span>
                            </>
                          )}
                        </ListboxOption>
                      );
                    })}
                  </ListboxOptions>
                </div>
              </Listbox>
            ) : (f.field === 'Salida' || f.field === 'Regreso') ? (
              <input
                type="date"
                className="w-full border border-[#d1d5db] rounded-lg p-1.5 transition-all duration-150 shadow-sm text-xs"
                value={filters[f.field] || ''}
                onChange={e => onFilterChange(f.field, e.target.value)}
              />
            ) : (
              <div className="relative">
                <select
                  className="w-full border border-[#d1d5db] rounded-lg p-1.5 appearance-none pr-8 transition-all duration-150 shadow-sm focus:outline-none focus:ring-0 focus:border-[#d1d5db] text-xs"
                  style={{ borderRadius: '0.5rem' }}
                  value={filters[f.field] || ''}
                  onChange={e => onFilterChange(f.field, e.target.value)}
                >
                  <option value="">
                    {f.field === 'Aerolinea' ? '-- Seleccionar aerolínea --' : '-- Seleccionar --'}
                  </option>
                  {f.field === 'Tipo de servicio' || f.field === 'Tipo Servicio' ? (
                    <>
                      <option value="Aéreo">Aéreo</option>
                      <option value="Barco">Barco</option>
                    </>
                  ) : f.field === 'Tipo de operación' ? (
                    <>
                      <option value="CHARTERS">CHARTERS</option>
                      <option value="DESTINO ARG">DESTINO ARG</option>
                      <option value="CUPOS">CUPOS</option>
                    </>
                  ) : (
                    f.values.map((v, idx) => (
                      <option key={(typeof v === 'object' ? v.text : v) + '-' + idx} value={typeof v === 'object' ? v.text : v}>
                        {typeof v === 'object' ? v.text : v}
                      </option>
                    ))
                  )}
                </select>
                <ChevronUpDownIcon className="w-4 h-4 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mb-3">
        <button
          className="px-4 py-1.5 bg-[#2563eb] text-white rounded-full shadow-md hover:bg-[#304D85] transition font-semibold text-sm flex items-center gap-2 cursor-pointer"
          onClick={onApplyFilters}
        >
          Aplicar
        </button>
      </div>
      <div className="mb-2 flex flex-wrap items-center">
        <span className="font-semibold text-[#304D85] text-xs">Filtros activos:</span>
        {Object.entries(filters).filter(([, v]) => v && ((Array.isArray(v) && v.length > 0) || (!Array.isArray(v) && v))).map(([k, v], idx) => (
          <span key={k + '-' + idx} className="ml-1 px-2 py-0.5 bg-blue-100 text-[#304D85] rounded shadow flex items-center text-xs">
            {k}: {Array.isArray(v) ? v.join(', ') : v}
            <button
              className="ml-2 text-red-500 font-bold hover:text-red-700 focus:outline-none"
              title="Quitar filtro"
              onClick={() => onFilterChange(k, Array.isArray(v) ? [] : '')}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}