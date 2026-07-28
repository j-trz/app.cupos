import { useState, useEffect } from 'react';
import UserService from '../services/userService';
import AgencyService from '../services/agencyService';
import Modal from './Modal';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';

// Le permite al superadmin asignarle a un usuario agencias ADICIONALES a la
// que ya tiene activa (user.agencia) — el usuario después elige cuál de todas
// queda activa desde su propio Perfil (SwitchActiveAgency), no acá.
export default function UserAgenciesModal({ open, onClose, user }) {
  const [agencies, setAgencies] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agenciesResult, assignedResult] = await Promise.all([
        AgencyService.listAgencies(),
        UserService.listUserAgencies(user.id),
      ]);
      setAgencies(agenciesResult.filter((a) => a.code !== user.agencia));
      setAssigned(Array.isArray(assignedResult) ? assignedResult : []);
      setSelectedAgency('');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo cargar la información de agencias.' });
    } finally {
      setLoading(false);
    }
  };

  const agencyName = (code) => agencies.find((a) => a.code === code)?.name || code;

  const handleAdd = async () => {
    if (!selectedAgency) return;
    setSaving(true);
    try {
      await UserService.addUserAgency(user.id, selectedAgency);
      setAssigned((prev) => (prev.includes(selectedAgency) ? prev : [...prev, selectedAgency]));
      setSelectedAgency('');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo asignar la agencia.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (agencia) => {
    setSaving(true);
    try {
      await UserService.removeUserAgency(user.id, agencia);
      setAssigned((prev) => prev.filter((a) => a !== agencia));
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo quitar la agencia.' });
    } finally {
      setSaving(false);
    }
  };

  const availableToAdd = agencies.filter((a) => !assigned.includes(a.code));

  return (
    <Modal title="Agencias Adicionales" open={open} onClose={onClose} size="sm">
      <div className="space-y-4">
        {user && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Usuario</p>
            <p className="font-medium text-slate-900">{user.nombre || user.email}</p>
            <p className="mt-1 text-xs text-slate-400">
              Agencia activa: <strong>{user.agencia || '-'}</strong>. Asigná más agencias para que el usuario pueda elegir a cuál cambiarse desde su Perfil.
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Agencias adicionales asignadas</label>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : assigned.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no tiene agencias adicionales.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assigned.map((agencia) => (
                <span
                  key={agencia}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {agencyName(agencia)}
                  <button
                    type="button"
                    onClick={() => handleRemove(agencia)}
                    disabled={saving}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                    title="Quitar agencia"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Agregar agencia</label>
          <div className="flex gap-2">
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              disabled={saving || loading}
            >
              <option value="">Seleccionar agencia...</option>
              {availableToAdd.map((agency) => (
                <option key={agency.id} value={agency.code}>{agency.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || loading || !selectedAgency}
              className="inline-flex items-center justify-center rounded-xl font-medium h-10 px-4 text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Agregar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl font-medium h-10 px-4 py-2 text-base bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
