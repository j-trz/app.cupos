import clsx from 'clsx';
import { Backpack, ShoppingBag, Luggage } from 'lucide-react';

// Ícono de franquicia de equipaje: verde si incluye, gris y tachado si no.
// Usado por Disponibilidad, Solicitudes, Confirmaciones y Gestión de Productos
// para que la columna "Equipaje" se vea igual en toda la app.
function BaggageIcon({ icon: Icon, included, label }) {
  const isIncluded = !!included;
  return (
    <span
      role="img"
      aria-label={`${label}: ${isIncluded ? 'Incluido' : 'No incluido'}`}
      className="relative inline-flex h-6 w-6 items-center justify-center"
    >
      <Icon className={clsx('h-4 w-4', isIncluded ? 'text-emerald-600' : 'text-slate-300')} />
      {!isIncluded && (
        <span className="pointer-events-none absolute h-[1.5px] w-5 -rotate-45 rounded-full bg-slate-400" />
      )}
    </span>
  );
}

export default function BaggageFranchise({ item }) {
  // Distintos adapters normalizan el producto con distinto casing
  // (adaptProduct → carryon; adaptRequest → CarryOn) — se acepta cualquiera
  // de las dos para poder reusar este componente en toda la app.
  const carryOn = item.carryon ?? item.CarryOn;
  const handBag = item.handbag ?? item.HandBag;
  const checkedBag = item.checkedbag ?? item.CheckedBag;
  return (
    <div className="flex items-center justify-center gap-2">
      <BaggageIcon icon={Backpack} included={carryOn} label="Carry-on" />
      <BaggageIcon icon={ShoppingBag} included={handBag} label="Handbag" />
      <BaggageIcon icon={Luggage} included={checkedBag} label="Valija despachada" />
    </div>
  );
}
