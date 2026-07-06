import { useState, useEffect } from 'react';

let count = 0;
const genId = () => {
  count = (count + 1) % Number.MAX_VALUE;
  return count;
};

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Limpiar toasts antiguos
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(toast => !toast.expires || toast.expires > Date.now()));
    }, 30000); // Limpiar cada 30 segundos

    return () => clearTimeout(timer);
  }, []);

  const toast = ({ title, description, variant = 'default', duration = 4000, action } = {}) => {
    const id = genId();
    const newToast = {
      id,
      title,
      description,
      variant,
      action,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dismissToast(id);
        }
      },
      expires: Date.now() + duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, open: false } : toast
    ));

    // Remove toast after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 200);
  };

  const dismissAll = () => {
    setToasts([]);
  };

  return {
    toasts,
    toast,
    dismissToast,
    dismissAll
  };
};

export { useToast };