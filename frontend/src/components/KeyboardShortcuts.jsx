import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

const KeyboardShortcuts = () => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Definir atajos de teclado
  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: t('search') },
    { keys: ['Ctrl', 'N'], description: t('create') },
    { keys: ['Ctrl', 'S'], description: t('save') },
    { keys: ['Ctrl', 'F'], description: t('filter') },
    { keys: ['Esc'], description: t('close') },
    { keys: ['F5'], description: t('refresh') },
    { keys: ['?'], description: t('show_help') }
  ];

  // Manejar teclas de acceso rápido
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Abrir búsqueda global (esto debería manejarse en el componente padre)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        // Crear nuevo elemento (esto dependerá del contexto)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Guardar (esto dependerá del contexto)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        // Activar filtros (esto dependerá del contexto)
      } else if (e.key === 'Escape') {
        // Cerrar modal o menú
        setShowShortcuts(false);
      } else if (e.key === 'F5') {
        e.preventDefault();
        // Recargar página o datos
        window.location.reload();
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Mostrar ventana de ayuda
        setShowShortcuts(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!showShortcuts) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{t('keyboard_shortcuts')}</h2>
            <button
              onClick={() => setShowShortcuts(false)}
              className={`p-1 rounded-full ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span>{shortcut.description}</span>
                <div className="flex space-x-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <kbd
                      key={keyIndex}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>{t('press_esc_to_close')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;