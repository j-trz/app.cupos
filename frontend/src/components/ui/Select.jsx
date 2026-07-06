import React from 'react';
import clsx from 'clsx';

const SelectContext = React.createContext({ value: '', onValueChange: () => {} });

const Select = ({ value, onValueChange, children }) => {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const SelectValue = ({ placeholder, ...props }) => {
  const { value } = React.useContext(SelectContext);
  
  return (
    <span className="truncate">
      {value || placeholder}
    </span>
  );
};

const SelectContent = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const SelectItem = ({ value: itemValue, children, className, ...props }) => {
  const { value, onValueChange } = React.useContext(SelectContext);
  
  const handleClick = () => {
    onValueChange(itemValue);
  };

  return (
    <div
      className={clsx(
        'relative flex w-full cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-slate-100 data-[state=checked]:bg-slate-100',
        value === itemValue && 'bg-slate-100',
        className
      )}
      onClick={handleClick}
      data-state={value === itemValue ? 'checked' : 'unchecked'}
      {...props}
    >
      <span className="block truncate pl-2">{children}</span>
    </div>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };