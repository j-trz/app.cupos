import React from 'react';
import { Badge } from './Badge.jsx';

const FilterBadge = ({ type, text, count, onRemove, className = '', ...props }) => {
  const getVariant = () => {
    switch (type) {
      case 'product':
      case 'products':
        return 'product';
      case 'request':
      case 'requests':
        return 'request';
      case 'confirmation':
      case 'confirmations':
        return 'confirmation';
      case 'availability':
        return 'availability';
      case 'reservation':
      case 'reservations':
        return 'reservation';
      case 'agency':
      case 'agencies':
        return 'agency';
      case 'user':
      case 'users':
        return 'user';
      case 'setting':
      case 'settings':
        return 'setting';
      case 'report':
      case 'reports':
        return 'report';
      default:
        return 'secondary';
    }
  };

  return (
    <Badge variant={getVariant()} className={`flex items-center gap-1 ${className}`} {...props}>
      <span>{text}</span>
      {count !== undefined && count !== null && (
        <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
          {count}
        </span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
          aria-label={`Eliminar filtro ${text}`}
        >
          <span className="text-[10px]">×</span>
        </button>
      )}
    </Badge>
  );
};

export default FilterBadge;