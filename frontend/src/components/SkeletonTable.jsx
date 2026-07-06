import React from 'react';
import { Skeleton } from './ui/Skeleton';

const SkeletonTable = ({ columns = 5, rows = 5 }) => {
  return (
    <div className="space-y-4">
      {/* Encabezados */}
      <div className="flex items-center space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-[150px]" />
        ))}
      </div>
      
      {/* Filas */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex items-center space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-12 w-[150px]" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonTable;