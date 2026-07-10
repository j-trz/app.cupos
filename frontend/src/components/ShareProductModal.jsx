import { useState, useEffect } from 'react';
import ProductService from '../services/productService';
import AgencyService from '../services/agencyService';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';

// A diferencia de TransferModal (que cede una porción de stock a UNA agencia
// creando una fila espejo con su propio Disponibilidad), esto comparte la
// MISMA fila de producto con varias agencias a la vez — el stock es uno solo
// y baja para todas por igual.
export default function ShareProductModal({ open, onClose, product, onShareChange }) {
  const { user } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [sharedWith, setSharedWith] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadData();
    }
  }, [open, product]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agenciesResult, sharedResult] = await Promise.all([
        AgencyService.listAgencies(),
        ProductService.getSharedAgencies(product.id),
      ]);
      setAgencies(agenciesResult.filter((a) => a.code !== product.agencia));
      setSharedWith(Array.isArray(sharedResult) ? sharedResult : []);
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
      await ProductService.shareProduct(product.id, selectedAgency);
      setSharedWith((prev) => (prev.includes(selectedAgency) ? prev : [...prev, selectedAgency]));
      setSelectedAgency('');
      onShareChange?.();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo compartir el producto.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (agencia) => {
    setSaving(true);
    try {
      await ProductService.unshareProduct(product.id, agencia);
      setSharedWith((prev) => prev.filter((a) => a !== agencia));
      onShareChange?.();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo quitar la agencia.' });
    } finally {
      setSaving(false);
    }
  };

  const availableToAdd = agencies.filter((a) => !sharedWith.includes(a.code));

  return (
    <Modal title="Compartir Producto" open={open} onClose={onClose} size="sm">
      <div className="space-y-4">
        {product && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Producto</p>
            <p className="font-medium text-slate-900">{product.codigo_cupo} - {product.destino}</p>
            <p className="mt-1 text-xs text-slate-400">
              Comparte el mismo cupo (un solo stock) con otras agencias, sin ceder una porción fija — el disponible baja para todas por igual.
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Agencias con acceso compartido</label>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : sharedWith.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se compartió con ninguna agencia.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sharedWith.map((agencia) => (
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
                    title="Quitar acceso"
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
