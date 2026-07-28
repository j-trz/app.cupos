import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, UserCircle2, Shield, Building2 } from 'lucide-react';
import Swal from 'sweetalert2';
import ApiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Input from '../components/ui/Input.jsx';

function normalizeRole(role) {
  if (!role) return 'Usuario';
  if (role === 'admin') return 'Administrador';
  if (role === 'agency_admin') return 'Admin de Agencia';
  if (role === 'agency_user') return 'Usuario de Agencia';
  // Capitalize and return as-is for unknown roles
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleBadgeVariant(role) {
  if (role === 'admin') return 'danger';
  if (role === 'agency_admin') return 'warning';
  return 'info';
}

function getInitials(nombre, email) {
  if (nombre && nombre.trim()) {
    const parts = nombre.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export default function Profile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);

  // Editable field state — only Nombre is persisted (Apellido & Telefono are UI-only
  // until the Profile DB model gains those columns).
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '' });
  const [saving, setSaving] = useState(false);

  // Selector de agencia activa (solo visible si el usuario tiene más de una
  // asignada) — GetProfile ya devuelve `agencies` con la propia + las
  // adicionales que le haya asignado el superadmin vía UserAgeciesModal.
  const [selectedAgency, setSelectedAgency] = useState('');
  const [switchingAgency, setSwitchingAgency] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await ApiClient.get('/auth/profile');
        const p = (result && result.profile) || null;
        setProfile(p);
        if (p) {
          setForm({
            nombre: p.nombre || '',
            apellido: p.apellido || '',
            telefono: p.telefono || '',
          });
          setSelectedAgency(p.agencia || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    async function loadPermissions() {
      try {
        const result = await ApiClient.get('/permissions');
        // Handle both array and { permissions: [] } shapes
        const list = Array.isArray(result)
          ? result
          : (result && Array.isArray(result.permissions))
            ? result.permissions
            : [];
        setPermissions(list);
      } catch {
        // Endpoint may be admin-only; silently skip
      }
    }

    loadProfile();
    loadPermissions();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await ApiClient.put('/auth/profile', {
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
      });
      const updated = result && result.profile;
      if (updated) {
        setProfile(updated);
        setForm({
          nombre: updated.nombre || form.nombre,
          apellido: updated.apellido || form.apellido,
          telefono: updated.telefono || form.telefono,
        });
      }
      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Tus datos han sido guardados correctamente.',
        confirmButtonColor: '#0f172a',
        timer: 2500,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: 'No se pudo actualizar el perfil. Intenta de nuevo.',
        confirmButtonColor: '#0f172a',
      });
    } finally {
      setSaving(false);
    }
  }

  // Pisa Profile.Agencia en el servidor, pero el JWT ya emitido sigue
  // teniendo la agencia vieja hasta el próximo login (el backend no lo
  // reemite) — por eso se fuerza un logout inmediato después de confirmar.
  async function handleSwitchAgency() {
    if (!selectedAgency || selectedAgency === profile.agencia) return;

    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Cambiar de agencia activa?',
      html: `Vas a pasar a operar como <strong>${selectedAgency}</strong>. Tenés que volver a iniciar sesión para que el cambio se aplique.`,
      showCancelButton: true,
      confirmButtonText: 'Cambiar y cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0f172a',
    });
    if (!confirm.isConfirmed) return;

    setSwitchingAgency(true);
    try {
      await ApiClient.put('/auth/active-agency', { agencia: selectedAgency });
      await Swal.fire({
        icon: 'success',
        title: 'Agencia actualizada',
        text: 'Iniciá sesión de nuevo para continuar con tu nueva agencia activa.',
        confirmButtonColor: '#0f172a',
      });
      signOut();
      navigate('/login');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo cambiar de agencia.',
        confirmButtonColor: '#0f172a',
      });
    } finally {
      setSwitchingAgency(false);
    }
  }

  if (loading) {
    return <div className="text-slate-500">Cargando perfil...</div>;
  }

  if (!profile) {
    return <div className="text-slate-500">No se encontró información de usuario.</div>;
  }

  const initials = getInitials(profile.nombre, profile.email);
  const roleLabel = normalizeRole(profile.role);
  const roleBadgeVariant = getRoleBadgeVariant(profile.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil"
        description="Administra tu información de cuenta y revisa el estado de acceso."
        icon={UserCircle2}
      />

      {/* Top card: avatar, read-only info, role badge */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Avatar */}
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-2xl font-bold text-white">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">
                {profile.nombre || 'Mi Perfil'} {profile.apellido || ""}
              </h2>
              <Badge variant={roleBadgeVariant}>{roleLabel}</Badge>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{profile.email || '-'}</span>
              </div>
              {profile.agencia && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span>{profile.agencia}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Edit card */}
      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Editar información</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="nombre">
                Nombre
              </label>
              <Input
                id="nombre"
                placeholder="Tu nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="apellido">
                Apellido
              </label>
              <Input
                id="apellido"
                placeholder="Tu apellido"
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="telefono">
                Teléfono
              </label>
              <Input
                id="telefono"
                placeholder="Tu teléfono"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>

            {/* Read-only: email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
              <Input value={profile.email || ''} disabled readOnly />
            </div>

            {/* Read-only: agencia */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Agencia</label>
              <Input value={profile.agencia || '-'} disabled readOnly />
            </div>

            {/* Read-only: rol */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Rol</label>
              <Input value={roleLabel} disabled readOnly />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Cambio de agencia activa — solo si el superadmin le asignó más de una */}
      {Array.isArray(profile.agencies) && profile.agencies.length > 1 && (
        <Card className="p-6">
          <h3 className="mb-1 text-base font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            Agencia activa
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            Tenés más de una agencia asignada. Elegí con cuál operar — vas a tener que volver a iniciar sesión para que el cambio se aplique.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="agencia-activa">Agencia</label>
              <select
                id="agencia-activa"
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                disabled={switchingAgency}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {profile.agencies.map((agencia) => (
                  <option key={agencia} value={agencia}>{agencia}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleSwitchAgency}
              disabled={switchingAgency || !selectedAgency || selectedAgency === profile.agencia}
            >
              {switchingAgency ? 'Cambiando...' : 'Cambiar agencia'}
            </Button>
          </div>
        </Card>
      )}

      {/* Permissions card — only rendered when the user has visible permissions */}
      {permissions.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Permisos asignados</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {permissions.map((perm) => (
              <div
                key={perm.id || perm.code || perm.name}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{perm.name}</p>
                {perm.description && (
                  <p className="mt-1 text-xs text-slate-500">{perm.description}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
