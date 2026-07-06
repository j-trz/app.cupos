import { Checkbox } from './Checkbox';

export { Checkbox };
import React from 'react';
import clsx from 'clsx';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <input
      ref={ref}
      type="checkbox"
      className={clsx(
        'h-4 w-4 rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
        className
      )}
      checked={checked}
      onChange={handleChange}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export default Checkbox;