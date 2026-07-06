import React, { createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';

const DialogContext = createContext();

// Componente principal del diálogo
export const Dialog = ({ children, open = false, onOpenChange }) => {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

// Componente del trigger del diálogo
export const DialogTrigger = ({ children, ...props }) => {
  const { setOpen } = useContext(DialogContext);

  const handleClick = () => {
    setOpen(true);
  };

  return React.cloneElement(children, {
    onClick: handleClick,
    ...props
  });
};

// Componente del contenido del diálogo
export const DialogContent = ({ children, ...props }) => {
  const { open, setOpen } = useContext(DialogContext);

  const handleClose = () => {
    setOpen(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={clsx(
              'relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl',
              props.className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente del encabezado del diálogo
export const DialogHeader = ({ children, className, ...props }) => {
  return (
    <div className={clsx("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props}>
      {children}
    </div>
  );
};

// Componente del título del diálogo
export const DialogTitle = ({ children, className, ...props }) => {
  return (
    <h3 className={clsx("text-lg font-semibold leading-none tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
};