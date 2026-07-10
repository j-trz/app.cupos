import React, { useState, useRef, useEffect } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Tooltip } from 'react-tooltip';
import Button from '../ui/Button.jsx';

const INPUT_CLASSES = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200';

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

  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v && ((Array.isArray(v) && v.length > 0) || (!Array.isArray(v) && v))
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
                    className="mb-1 block text-xs font-medium text-slate-600"
                    data-tooltip-id={tooltipText ? `tt-${f.field}` : undefined}
                    data-tooltip-content={tooltipText || undefined}
                    style={{ cursor: tooltipText ? 'help' : undefined }}
                  >
                    {labelText}
                  </label>
                  {tooltipText && <Tooltip id={`tt-${f.field}`} place="top" />}
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
                  <ListboxButton className={`${INPUT_CLASSES} flex min-h-[38px] cursor-pointer items-center justify-between`}>
                    <span className="truncate text-left">
                      {Array.isArray(filters[f.field]) && filters[f.field].length > 0
                        ? filters[f.field].join(', ')
                        : `Seleccionar ${f.field.toLowerCase()}...`}
                    </span>
                    <ChevronUpDownIcon className="ml-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </ListboxButton>
                  <ListboxOptions className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white text-sm shadow-lg">
                    {f.values.map((v, idx) => {
                      const value = typeof v === 'object' ? v.text : v;
                      return (
                        <ListboxOption key={value + '-' + idx} value={value} className={({ active }) => `flex items-center px-3 py-1.5 cursor-pointer ${active ? 'bg-slate-50' : ''}`}>
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
                className={INPUT_CLASSES}
                value={filters[f.field] || ''}
                onChange={e => onFilterChange(f.field, e.target.value)}
              />
            ) : (
              <div className="relative">
                <select
                  className={`${INPUT_CLASSES} appearance-none pr-8`}
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
                <ChevronUpDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.length > 0 && (
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Filtros activos:</span>
          )}
          {activeFilters.map(([k, v], idx) => (
            <span key={k + '-' + idx} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {k}: {Array.isArray(v) ? v.join(', ') : v}
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                title="Quitar filtro"
                onClick={() => onFilterChange(k, Array.isArray(v) ? [] : '')}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <Button size="sm" onClick={onApplyFilters}>Aplicar filtros</Button>
      </div>
    </div>
  );
}
