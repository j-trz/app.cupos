// Hero oscuro con estadísticas — mismo diseño que Disponibilidad (fondo
// degradado slate/índigo, cards translúcidas), reutilizado en todas las
// páginas que antes mostraban sus StatCard sueltas en blanco. El botón de
// actualizar/refrescar NO va acá — vive en el topbar (PageHeader action),
// igual que en el resto de las pantallas.
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
          return (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors duration-200"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${stat.color || 'text-blue-300 bg-blue-500/10 border-blue-500/20'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-350">{stat.label}</p>
                <h3 className="text-xl font-bold text-white mt-0.5">{stat.value}</h3>
                {stat.description && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{stat.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
