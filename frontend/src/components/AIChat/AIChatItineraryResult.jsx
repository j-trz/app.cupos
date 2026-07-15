/**
 * Render enriquecido, dentro de la burbuja del chat de IA, del resultado de
 * las tools generar_itinerario_pdf/detalle_ruta. Reusa los componentes
 * existentes (ItineraryPDF, ItineraryTable) tal cual, sin modificarlos — los
 * DTOs que devuelve el backend ya usan los nombres de campo que esperan.
 */

import { useState } from 'react';
import { FileText, Route } from 'lucide-react';
import Modal from '../Modal.jsx';
import ItineraryPDF from '../ItineraryPDF.jsx';
import ItineraryTable from '../ItineraryTable.jsx';

function parseToolResult(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && !parsed.error && (parsed.tipo === 'itinerario_pdf' || parsed.tipo === 'detalle_ruta')) {
            return parsed;
        }
    } catch {
        // No era JSON con ese shape — no se renderiza nada especial.
    }
    return null;
}

export default function AIChatItineraryResult({ toolCalls }) {
    const [openIdx, setOpenIdx] = useState(null);

    const items = (toolCalls || [])
        .map((tc, idx) => ({ idx, data: parseToolResult(tc.result) }))
        .filter(x => x.data);

    if (items.length === 0) return null;

    return (
        <div className="mt-2 space-y-1.5">
            {items.map(({ idx, data }) => {
                const isPDF = data.tipo === 'itinerario_pdf';
                const pedido = data.reserva?.pedido_id;
                return (
                    <div key={idx}>
                        <button
                            type="button"
                            onClick={() => setOpenIdx(idx)}
                            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors text-xs"
                        >
                            {isPDF ? <FileText className="w-4 h-4 text-zinc-500 shrink-0" /> : <Route className="w-4 h-4 text-zinc-500 shrink-0" />}
                            <span className="flex-1 truncate font-medium text-zinc-700 dark:text-zinc-200">
                                {isPDF ? 'Itinerario' : 'Detalle de ruta'}{pedido ? ` — Pedido ${pedido}` : ''}
                            </span>
                            <span className="text-zinc-400">{isPDF ? 'Ver / Descargar' : 'Ver / Copiar'}</span>
                        </button>

                        <Modal
                            title={isPDF ? 'Itinerario PDF' : 'Detalle de Ruta'}
                            open={openIdx === idx}
                            onClose={() => setOpenIdx(null)}
                            size="3xl"
                        >
                            {isPDF ? (
                                <ItineraryPDF reservation={data.reserva} passengers={data.pasajeros} product={data.producto} />
                            ) : (
                                <ItineraryTable ruta={data.ruta} showCopyButton={true} />
                            )}
                            {data.nota && <p className="mt-3 text-xs text-amber-600">{data.nota}</p>}
                        </Modal>
                    </div>
                );
            })}
        </div>
    );
}
