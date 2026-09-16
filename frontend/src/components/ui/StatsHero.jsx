import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';

// Hero oscuro con estadísticas — mismo diseño que Disponibilidad (fondo
// degradado slate/índigo, cards translúcidas), reutilizado en todas las
// páginas que antes mostraban sus StatCard sueltas en blanco. El botón de
// actualizar/refrescar NO va acá — vive en el topbar (PageHeader action),
// igual que en el resto de las pantallas. `stat.onClick` es opcional: cuando
// se pasa, la tarjeta se renderiza como <button> (con chevron y cursor de
// mano) en vez de <div> inerte — no todos los llamadores lo necesitan.
export default function StatsHero({ stats }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4 py-6 sm:px-8 sm:py-8 text-white shadow-lg">
      {/* Decoración de fondo */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />

      {/* Apiladas en teléfono, 3 columnas desde sm en adelante */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 relative z-10">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const Wrapper = stat.onClick ? 'button' : 'div';
          return (
            <Wrapper
              key={i}
              type={stat.onClick ? 'button' : undefined}
              onClick={stat.onClick}
              className={clsx(
                'group flex w-full items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 transition-colors duration-200',
                stat.onClick && 'cursor-pointer'
              )}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${stat.color || 'text-blue-300 bg-blue-500/10 border-blue-500/20'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-350">{stat.label}</p>
                <h3 className="text-xl font-bold text-white mt-0.5">{stat.value}</h3>
                {stat.description && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{stat.description}</p>
                )}
              </div>
              {stat.onClick && (
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
