import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import { ShieldCheck, Sparkles, Users, Gauge, Activity, CalendarDays } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const cards = useMemo(
    () => [
      {
        title: 'Rol actual',
        value: user?.role || 'Usuario',
        icon: ShieldCheck,
        description: 'Nivel de acceso dentro del sistema.',
      },
      {
        title: 'Agencia',
        value: user?.agencia || 'No definida',
        icon: Users,
        description: 'Empresa asociada a tu cuenta.',
      },
      {
        title: 'Estado',
        value: user ? 'Activo' : 'No autenticado',
        icon: Activity,
        description: 'Tu sesión está lista para usar.',
      },
    ],
    [user],
  );

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl shadow-slate-800/20">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-white shadow-lg shadow-slate-950/20">
                <Gauge className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Panel de control</p>
                <h1 className="text-4xl font-semibold text-white">Hola, {user?.nombre || user?.email}</h1>
              </div>
            </div>
            <p className="max-w-2xl text-slate-300 leading-7">
              Bienvenido al nuevo frontend de Form Cupos. Navega desde la barra lateral para ver disponibilidad, solicitudes y confirmaciones con una experiencia más clara y moderna.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 p-4 text-slate-100 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Actualización</p>
                <p className="mt-3 text-xl font-semibold">Siempre al día</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 text-slate-100 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Soporte</p>
                <p className="mt-3 text-xl font-semibold">Diseño optimizado</p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-slate-100">
              <div className="rounded-3xl bg-slate-100/10 p-3">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Fecha</p>
                <p className="mt-1 text-lg font-semibold">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="mt-8 grid gap-4">
              <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">Estado de la sesión</p>
                <p className="mt-2 text-2xl font-semibold text-white">{user ? 'Activa' : 'Inactiva'}</p>
              </div>
              <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-300">Última acción</p>
                <p className="mt-2 text-2xl font-semibold text-white">Navega el panel</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-3xl bg-slate-100 p-3 text-slate-900">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{card.value}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{card.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
