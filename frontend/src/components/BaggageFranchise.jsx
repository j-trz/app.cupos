import clsx from 'clsx';

// Íconos representando personal_bag / carry_on_bag / travel_luggage_and_bags
// (pedido explícito de UTG: reemplazar los genéricos de Lucide por íconos más
// representativos de equipaje de mano vs. de cabina vs. despachado).
//
// NOTA: son SVG propios, dibujados a mano en el mismo estilo trazo/stroke que
// el resto de los íconos de la app (Lucide) — no son el glyph literal de
// Google Material Symbols. No hubo forma de traer el path oficial exacto de
// esos 3 íconos puntuales en este entorno; si más adelante se consigue el SVG
// real de Material Symbols, reemplazar el contenido de cada <svg> acá abajo
// sin tocar el resto del componente.
function PersonalBagIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
    </svg>
  );
}

function CarryOnBagIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 6V4h4v2" />
      <rect x="6" y="6" width="12" height="15" rx="2" />
      <line x1="9" y1="10" x2="9" y2="17" />
      <line x1="15" y1="10" x2="15" y2="17" />
      <circle cx="9" cy="22" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="22" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TravelLuggageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

// Ícono de franquicia de equipaje: verde si incluye, gris y tachado si no.
// Usado por Disponibilidad, Solicitudes, Confirmaciones y Gestión de Productos
// para que la columna "Equipaje" se vea igual en toda la app. `kg`, si viene,
// se muestra en el aria-label y en el title (tooltip nativo al hover).
function BaggageIcon({ icon: Icon, included, label, kg, size = 'h-4 w-4' }) {
  const isIncluded = !!included;
  const kgText = isIncluded && kg ? ` (${kg} kg)` : '';
  return (
    <span
      role="img"
      aria-label={`${label}: ${isIncluded ? 'Incluido' : 'No incluido'}${kgText}`}
      title={`${label}${isIncluded ? kgText || ' — incluido' : ' — no incluido'}`}
      className="relative inline-flex h-6 w-6 items-center justify-center"
    >
      <Icon className={clsx(size, isIncluded ? 'text-emerald-600' : 'text-slate-300')} />
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
  const carryOnKg = item.carryon_kg ?? item.CarryOnKg;
  const handBagKg = item.handbag_kg ?? item.HandBagKg;
  const checkedBagKg = item.checkedbag_kg ?? item.CheckedBagKg;
  // Orden pedido: handbag (izq) - carry-on (centro) - checked bag (der),
  // de izquierda a derecha va creciendo la franquicia — tamaño del ícono
  // también crece en el mismo sentido para que se note a simple vista.
  return (
    <div className="flex items-center justify-center gap-2">
      <BaggageIcon icon={PersonalBagIcon} included={handBag} label="Handbag" kg={handBagKg} size="h-3.5 w-3.5" />
      <BaggageIcon icon={CarryOnBagIcon} included={carryOn} label="Carry-on" kg={carryOnKg} size="h-4 w-4" />
      <BaggageIcon icon={TravelLuggageIcon} included={checkedBag} label="Valija despachada" kg={checkedBagKg} size="h-5 w-5" />
    </div>
  );
}
