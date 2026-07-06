import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './Dialog';

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

// Contexto para compartir el estado del diálogo
const DialogContext = React.createContext({ open: false, setOpen: () => {} });

// Componente principal del diálogo
const Dialog = ({ children, open = false, onOpenChange }) => {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

// Trigger para abrir/cerrar el diálogo
const DialogTrigger = ({ children, onClick, ...props }) => {
  const { setOpen } = React.useContext(DialogContext);

  const handleClick = (e) => {
    setOpen(prev => !prev);
    if (onClick) onClick(e);
  };

  return React.cloneElement(children, {
    onClick: handleClick,
    ...props
  });
};

// Contenido del diálogo
const DialogContent = ({ children, className, ...props }) => {
  const { open, setOpen } = React.useContext(DialogContext);

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClickOutside}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={clsx(
              'relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto',
              className
            )}
            {...props}
          >
            {children}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Header del diálogo
const DialogHeader = ({ children, className, ...props }) => {
  return (
    <div className={clsx('p-6 pb-4', className)} {...props}>
      {children}
    </div>
  );
};

// Título del diálogo
const DialogTitle = ({ children, className, ...props }) => {
  return (
    <h3 className={clsx('text-xl font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  );
};

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle };