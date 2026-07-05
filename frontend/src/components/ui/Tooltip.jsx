import React, { useState } from 'react';
import clsx from 'clsx';

export default function Tooltip({ label, children, position = 'top' }) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="cursor-pointer"
      >
        {children}
      </div>
      {visible && (
        <div
          className={clsx(
            'absolute z-10 rounded-lg bg-slate-900 px-2 py-1 text-xs text-white whitespace-nowrap',
            positionClasses[position]
          )}
        >
          {label}
          <div
            className={clsx(
              'absolute h-2 w-2 rotate-45 bg-slate-900',
              position === 'top' && 'bottom-[-4px] left-1/2 transform -translate-x-1/2',
              position === 'bottom' && 'top-[-4px] left-1/2 transform -translate-x-1/2',
              position === 'left' && 'right-[-4px] top-1/2 transform -translate-y-1/2',
              position === 'right' && 'left-[-4px] top-1/2 transform -translate-y-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
}

