import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import FilterBadge from '../ui/FilterBadge.jsx';

const AdvancedFilters = ({ 
  filters, 
  onApplyFilters, 
  onResetFilters, 
  filterOptions = {} 
}) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  const handleFilterChange = (filterKey, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const applyFilters = () => {
    onApplyFilters(activeFilters);
    setExpanded(false);
  };

  const resetFilters = () => {
    setActiveFilters({});
    onResetFilters();
    setExpanded(false);
  };

  const removeFilter = (filterKey) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  // Función para determinar el tipo de filtro para la badge
  const getFilterType = (filterKey) => {
    if (filterKey.includes('product') || filterKey.includes('producto')) return 'product';
    if (filterKey.includes('request') || filterKey.includes('solicitud')) return 'request';
    if (filterKey.includes('confirmation') || filterKey.includes('confirmacion')) return 'confirmation';
    if (filterKey.includes('availability') || filterKey.includes('disponibilidad')) return 'availability';
    if (filterKey.includes('reservation') || filterKey.includes('reserva')) return 'reservation';
    if (filterKey.includes('agency') || filterKey.includes('agencia')) return 'agency';
    if (filterKey.includes('user') || filterKey.includes('usuario')) return 'user';
    if (filterKey.includes('setting') || filterKey.includes('config')) return 'setting';
    if (filterKey.includes('report') || filterKey.includes('reporte')) return 'report';
    return 'secondary';
  };

  return (
    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center justify-between w-full p-3 rounded-lg border ${
          expanded 
            ? (theme === 'dark' ? 'border-blue-500 bg-gray-700' : 'border-blue-500 bg-blue-50') 
            : (theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white')
        } transition-colors duration-200`}
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`h-5 w-5 ${hasActiveFilters ? 'text-blue-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
            />
          </svg>
          <span className="font-medium">{t('filter')}</span>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {Object.keys(activeFilters).filter(key => activeFilters[key]).length}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 transform transition-transform ${expanded ? 'rotate-180' : ''} ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Mostrar badges de filtros activos */}
      {hasActiveFilters && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null;
            
            // Obtener el label del filtro correspondiente
            const filter = filters.find(f => f.key === key);
            const label = filter ? (filter.label || t(key)) : key;
            
            return (
              <FilterBadge
                key={key}
                type={getFilterType(key)}
                text={`${label}: ${value}`}
                onRemove={() => removeFilter(key)}
              />
            );
          })}
        </div>
      )}

      {expanded && (
        <div className={`mt-2 p-4 rounded-lg border ${
          theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {filters.map((filter) => {
              const filterOption = filterOptions[filter.key] || {};
              
              if (filter.type === 'select') {
                return (
                  <div key={filter.key}>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {filter.label || t(filter.key)}
                    </label>
                    <select
                      value={activeFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="">{filter.placeholder || t('select_option')}</option>
                      {filter.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label || option.value}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              } else if (filter.type === 'date') {
                return (
                  <div key={filter.key}>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {filter.label || t(filter.key)}
                    </label>
                    <input
                      type="date"
                      value={activeFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                );
              } else if (filter.type === 'range') {
                return (
                  <div key={filter.key}>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {filter.label || t(filter.key)} ({filterOption.unit || ''})
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder={filterOption.minPlaceholder || 'Min'}
                        value={activeFilters[`${filter.key}_min`] || ''}
                        onChange={(e) => handleFilterChange(`${filter.key}_min`, e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                      <input
                        type="number"
                        placeholder={filterOption.maxPlaceholder || 'Max'}
                        value={activeFilters[`${filter.key}_max`] || ''}
                        onChange={(e) => handleFilterChange(`${filter.key}_max`, e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={filter.key}>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {filter.label || t(filter.key)}
                    </label>
                    <input
                      type="text"
                      placeholder={filter.placeholder || ''}
                      value={activeFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                );
              }
            })}
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={resetFilters}
              className={`px-4 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              } transition-colors duration-200`}
            >
              {t('cancel')}
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              {t('filter')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;