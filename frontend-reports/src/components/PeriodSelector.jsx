import { useState } from 'react';
import { HiOutlineCalendarDays } from 'react-icons/hi2';

const PERIOD_OPTIONS = [
  { value: 'hoy', label: 'Hoy', shortLabel: 'Hoy' },
  { value: 'semana', label: 'Última semana', shortLabel: '7 días' },
  { value: 'mes_actual', label: 'Mes actual', shortLabel: 'Este mes' },
  { value: 'mes', label: 'Mes a mes', shortLabel: 'Histórico' },
  { value: 'q1', label: 'Q1 (Ene-Mar)', shortLabel: 'Q1' },
  { value: 'q2', label: 'Q2 (Abr-Jun)', shortLabel: 'Q2' },
  { value: 'q3', label: 'Q3 (Jul-Sep)', shortLabel: 'Q3' },
  { value: 'q4', label: 'Q4 (Oct-Dic)', shortLabel: 'Q4' },
];

export default function PeriodSelector({ value = 'mes', onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
<<<<<<< HEAD

=======
  
>>>>>>> main
  const selectedOption = PERIOD_OPTIONS.find(o => o.value === value) || PERIOD_OPTIONS[0];

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md
          border border-gray-300 bg-white shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-all duration-150
        `}
      >
        <HiOutlineCalendarDays className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-gray-700">{selectedOption.shortLabel}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop para cerrar al hacer click fuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
<<<<<<< HEAD

=======
          
>>>>>>> main
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-1 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full text-left px-3 py-1.5 text-xs
<<<<<<< HEAD
                  ${value === option.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
=======
                  ${value === option.value 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
>>>>>>> main
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  transition-colors duration-100
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
