import { useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, UserCircle2 } from 'lucide-react';
import ApiClient from '../services/apiClient';
import { Card } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/ui/StatCard.jsx';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await ApiClient.get('/auth/profile');
        setProfile((result && result.profile) || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Define stats useMemo before any early returns to maintain hook order
  const stats = useMemo(
    () => profile ? [
      {
        label: 'Acceso',
        value: profile.role || 'Usuario',
        icon: UserCircle2,
        description: 'Nivel de permisos asignado al usuario.',
      },
      {
        label: 'Ubicación',
        value: profile.location || 'Desconocida',
        icon: MapPin,
        description: 'Ciudad desde donde opera el usuario.',
      },
    ] : [],
    [profile],
  );

  if (loading) {
    return <div className="text-slate-500">Cargando perfil...</div>;
  }

  if (!profile) {
    return <div className="text-slate-500">No se encontró información de usuario.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil"
        description="Administra tu información de cuenta y revisa el estado de acceso."
        icon={UserCircle2}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-slate-100 p-3 text-slate-900">
              <UserCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{profile.nombre || profile.full_name || 'Mi Perfil'}</h2>
              <p className="text-sm text-slate-500">Revisa tus datos de usuario y rol.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Correo</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{profile.email || '-'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Agencia</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{profile.agencia || '-'}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {stats.map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              description={item.description}
            />
          ))}
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Nombre</p>
            <p className="mt-2 text-base font-medium text-slate-900">{profile.nombre || profile.full_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Apellido</p>
            <p className="mt-2 text-base font-medium text-slate-900">{profile.apellido || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Rol</p>
            <p className="mt-2 text-base font-medium text-slate-900">{profile.role || 'Usuario'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Teléfono</p>
            <p className="mt-2 text-base font-medium text-slate-900">{profile.telefono || 'No disponible'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}