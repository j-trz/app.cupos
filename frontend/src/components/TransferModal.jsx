import { useState, useEffect } from 'react';
import TransferService from '../services/transferService';
import AgencyService from '../services/agencyService';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import Swal from 'sweetalert2';

export default function TransferModal({ open, onClose, product, onTransferComplete }) {
    const { user } = useAuth();
    const [agencies, setAgencies] = useState([]);
    const [targetAgency, setTargetAgency] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchAgencies();
            setQuantity(1);
            setTargetAgency('');
        }
    }, [open]);

    const fetchAgencies = async () => {
        try {
            const data = await AgencyService.listAgencies();
            // Filtrar para mostrar solo agencias diferentes a la del usuario
            // (user.agencia guarda el código de agencia, no el nombre)
            const filtered = data.filter(a => a.code !== user?.agencia);
            setAgencies(filtered);
        } catch (error) {
            console.error('Error fetching agencies:', error);
        }
    };

    const handleSubmit = async () => {
        if (!targetAgency) {
            Swal.fire({ icon: 'warning', title: 'Error', text: 'Selecciona una agencia destino' });
            return;
        }
        if (quantity < 1 || quantity > product?.disponibilidad) {
            Swal.fire({ icon: 'warning', title: 'Error', text: 'Cantidad inválida' });
            return;
        }

        setLoading(true);
        try {
            await TransferService.createTransfer({
                product_id: product.id,
                target_agency: targetAgency,
                quantity: quantity,
            });

            Swal.fire({
                icon: 'success',
                title: 'Cesión exitosa',
                text: `Se cedieron ${quantity} cupos a ${targetAgency}`,
                timer: 2000,
                showConfirmButton: false,
            });

            onClose();
            onTransferComplete?.();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo crear la cesión',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Ceder Disponibilidad" open={open} onClose={onClose} size="sm">
            <div className="space-y-4">
                {product && (
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <p className="text-sm text-slate-500">Producto</p>
                        <p className="font-medium text-slate-900">{product.codigo_cupo} - {product.destino}</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Disponible: <span className="font-semibold text-slate-900">{product.disponibilidad}</span> cupos
                        </p>
                    </div>
                )}

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Agencia Destino *
                    </label>
                    <select
                        value={targetAgency}
                        onChange={(e) => setTargetAgency(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        disabled={loading}
                    >
                        <option value="">Seleccionar agencia...</option>
                        {agencies.map(agency => (
                            <option key={agency.id} value={agency.name}>
                                {agency.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Cantidad a Ceder *
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={product?.disponibilidad || 1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        disabled={loading}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                        Máximo: {product?.disponibilidad} cupos disponibles
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-2xl font-medium h-10 px-4 py-2 text-base bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="inline-flex items-center justify-center rounded-2xl font-medium h-10 px-4 py-2 text-base bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        disabled={loading || !targetAgency}
                    >
                        {loading ? 'Procesando...' : 'Ceder Cupos'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
