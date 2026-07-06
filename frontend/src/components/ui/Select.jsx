import React, { createContext, useContext } from 'react';
import clsx from 'clsx';

const SelectContext = createContext();

// Componente principal del select
export const Select = ({ children, value, onValueChange }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  );
};

// Componente del trigger del select
export const SelectTrigger = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        'flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Componente del valor del select
export const SelectValue = ({ placeholder, ...props }) => {
  return (
    <span {...props}>
      {placeholder}
    </span>
  );
};

// Componente del contenido del select
export const SelectContent = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md mt-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Componente del item del select
export const SelectItem = ({ children, value: itemValue, className, ...props }) => {
  const { value, onValueChange } = useContext(SelectContext);

  const handleClick = () => {
    if (onValueChange) {
      onValueChange(itemValue);
    }
  };

  return (
    <div
      className={clsx(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
};

