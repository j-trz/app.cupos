import React from 'react';
import { X, Trash2, Copy, CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * BulkSelectionBar — barra flotante de acciones masivas que aparece cuando
 * hay al menos un elemento seleccionado en una tabla.
 *
 * Props:
 *  - selectedCount {number}: cantidad de elementos seleccionados
 *  - onClear {function}: callback para limpiar la selección
 *  - actions {Array<{label, icon, variant, onClick, loading?}>}: botones de acción
 *  - entityLabel {string}: nombre del tipo de entidad (ej. "producto", "reserva")
 */
export default function BulkSelectionBar({ selectedCount = 0, onClear, actions = [], entityLabel = 'elemento' }) {
  if (selectedCount === 0) return null;

  const pluralLabel = selectedCount === 1 ? entityLabel : `${entityLabel}s`;

  return (
    <div className="bulk-bar">
      <div className="bulk-bar__count">
        <div className="bulk-bar__badge">{selectedCount}</div>
        <span className="bulk-bar__label">
          {selectedCount} {pluralLabel} seleccionado{selectedCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bulk-bar__actions">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              className={`bulk-bar__btn bulk-bar__btn--${action.variant || 'default'}`}
              onClick={action.onClick}
              disabled={action.loading}
              title={action.label}
            >
              {action.loading
                ? <Loader2 size={15} className="spin" />
                : Icon && <Icon size={15} />
              }
              <span>{action.label}</span>
            </button>
          );
        })}

        <button className="bulk-bar__clear" onClick={onClear} title="Limpiar selección">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

// Exportar iconos comunes para convenencia
export { Trash2, Copy, CheckCircle, XCircle };
