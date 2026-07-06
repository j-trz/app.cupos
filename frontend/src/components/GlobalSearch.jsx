import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

const GlobalSearch = ({ onSearch, placeholder, autoFocus = false }) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Abrir resultados cuando haya texto
    if (value.trim() && !isOpen) {
      setIsOpen(true);
    } else if (!value.trim()) {
      setIsOpen(false);
    }
  };

  // Cerrar búsqueda al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Atajo de teclado para búsqueda (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder || t('search') + '...'}
          className={`w-full px-4 py-2 pl-10 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg
            className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          <kbd className={`hidden md:inline-block text-xs px-2 py-1 rounded ${
            theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-500'
          }`}>
            Ctrl K
          </kbd>
        </div>
      </form>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-full rounded-md shadow-lg ${
            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('search_results')}:
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {query ? `${t('results_for')} "${query}"` : t('enter_search_term')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;