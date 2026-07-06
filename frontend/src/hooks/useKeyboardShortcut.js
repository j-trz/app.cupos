import { useEffect } from 'react';

const useKeyboardShortcut = (keyCombination, handler, deps = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Verificar si el evento coincide con la combinación de teclas
      const { ctrlKey, altKey, shiftKey, metaKey, key } = event;
      
      // Separar la combinación de teclas
      const keys = keyCombination.toLowerCase().split('+');
      const hasCtrl = keys.includes('ctrl');
      const hasAlt = keys.includes('alt');
      const hasShift = keys.includes('shift');
      const hasMeta = keys.includes('meta'); // Cmd en Mac
      
      // Verificar modificadores
      if (hasCtrl && !ctrlKey) return;
      if (hasAlt && !altKey) return;
      if (hasShift && !shiftKey) return;
      if (hasMeta && !metaKey) return;
      
      // Verificar tecla específica (sin contar modificadores)
      const actualKey = key.toLowerCase();
      const targetKey = keys.filter(k => !['ctrl', 'alt', 'shift', 'meta'].includes(k))[0];
      
      if (actualKey === targetKey) {
        event.preventDefault();
        handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyCombination, handler, ...deps]); // Incluimos deps para que se actualice si cambian
};

export default useKeyboardShortcut;