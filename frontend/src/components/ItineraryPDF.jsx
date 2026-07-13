import { Users, Plane, ArrowRightLeft, Clock3, Backpack, ShoppingBag, Luggage } from 'lucide-react';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { AIRLINES, AIRLINE_LOGOS, AIRPORTS, parseRuta } from './ItineraryTable';

const FALLBACK_LOGO = 'https://documents.sabre.com/static/images/tc/mail/icon-air.png';

const ESTADO_LABELS = {
  confirmada: 'Confirmado', confirmado: 'Confirmado',
  bloqueo_temporal: 'Reservado', procesando: 'Procesando',
  cancelada: 'Cancelado', cancelado: 'Cancelado',
  solicitud_cancelacion: 'Sol. Cancelación', expirada: 'Expirada',
  cedido: 'Cedido',
};
const ESTADO_COLORS = {
  Confirmado: { bg: '#dcfce7', text: '#166534' },
  Reservado: { bg: '#dbeafe', text: '#1e40af' },
  Procesando: { bg: '#f3f4f6', text: '#374151' },
  Cancelado: { bg: '#fee2e2', text: '#991b1b' },
  'Sol. Cancelación': { bg: '#fef3c7', text: '#92400e' },
  Expirada: { bg: '#f3f4f6', text: '#374151' },
  Cedido: { bg: '#e0e7ff', text: '#3730a3' },
};

// Distintos puntos de la app pasan al pasajero con distinto casing
// (passengers[] crudo del backend -> snake_case; filas ya adaptadas en
// GestionReservas -> camelCase) — se acepta cualquiera de las dos formas.
function readPax(p, snakeKey, camelKey) {
  return p[snakeKey] ?? p[camelKey];
}

// ─── Componente de Itinerario con PDF ─────────────────────────────────────────
// Props:
//   reservation   — objeto reserva (pedido_id, estado, etc.)
//   passengers    — array de pasajeros [{nombre, apellido, documento, tipo_pasajero, ...}]
//   product       — objeto producto (ruta, codigo_cupo, destino, fecha_salida, carryon/handbag/checkedbag, etc.)
export default function ItineraryPDF({ reservation, passengers = [], product }) {
  const { config } = useWhiteLabel();

  const primaryColor = config?.colors?.primary || '#2c4b8b';
  const agencyName = config?.identity?.agency_name || '';
  const agencyEmail = config?.identity?.contact_email || '';
  const agencySlogan = config?.identity?.slogan || '';
  const logoUrl = config?.identity?.logoUrl || '';
  const agencyPhone = config?.identity?.phone || '';
  const agencyAddress = config?.identity?.address || '';
  const pdfFooterMessage = config?.identity?.pdf_footer_message ||
    'Estimado cliente, te deseamos un muy buen viaje! Favor verificá la documentación con la cual estarás viajando (visas y vacunas si fueran necesarias). No olvides solicitarle a tu asesor que ingrese tu número de viajero frecuente en la reserva. Te aconsejamos hacer el web check-in con anticipación. ¡Gracias por elegirnos!';
  const pdfShowLogo = config?.identity?.pdf_show_logo !== false;

  const localizador = reservation?.pedido_id || reservation?.id || '—';
  const estadoLabel = ESTADO_LABELS[reservation?.estado] || null;
  const estadoColors = ESTADO_COLORS[estadoLabel] || { bg: '#f3f4f6', text: '#374151' };

  // parseRuta (compartido con "Ver Ruta") entiende tanto el formato moderno
  // (JSON con { vuelos: [...] }) como el texto plano de GDS histórico — el
  // parser anterior de este componente solo entendía el primero, así que para
  // productos viejos el itinerario se generaba sin ningún vuelo.
  const vuelos = parseRuta(product?.ruta);

  const carryOn = product?.carryon ?? product?.CarryOn;
  const handBag = product?.handbag ?? product?.HandBag;
  const checkedBag = product?.checkedbag ?? product?.CheckedBag;
  const hasBaggageInfo = carryOn !== undefined || handBag !== undefined || checkedBag !== undefined;

  const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: white; color: #1e293b; font-size: 12px; line-height: 1.5; }
    .itinerary-content { max-width: 960px; margin: 0 auto; padding: 24px; background: white; }
    .itin-header { display: flex; justify-content: space-between; align-items: center; background: ${primaryColor}; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .itin-header-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .itin-logo { height: 50px; width: auto; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.15); padding: 4px; }
    .itin-agency-info { flex: 1; min-width: 0; }
    .itin-agency-name { font-size: 17px; font-weight: 700; line-height: 1.2; }
    .itin-agency-sub { font-size: 11px; opacity: 0.82; margin-top: 2px; }
    .itin-reservation-badge { text-align: right; flex-shrink: 0; background: rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 18px; }
    .itin-reservation-label { font-size: 11px; opacity: 0.75; letter-spacing: 0.03em; }
    .itin-reservation-code { font-size: 22px; font-weight: 800; letter-spacing: 0.08em; margin-top: 2px; }
    .itin-estado-badge { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: ${estadoColors.bg}; color: ${estadoColors.text}; }
    .itin-section { margin-bottom: 18px; background: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 10px; padding: 16px 18px; }
    .itin-section-title { font-size: 13px; font-weight: 700; color: ${primaryColor}; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
    .itin-pax-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .itin-pax-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
    .itin-pax-name { font-weight: 700; font-size: 13px; color: #0f172a; }
    .itin-pax-detail { font-size: 11px; color: #64748b; margin-top: 3px; }
    .itin-flight-card { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; display: flex; gap: 14px; align-items: flex-start; }
    .itin-flight-logo-col { flex-shrink: 0; }
    .itin-airline-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 8px; border: 1px solid #f1f5f9; display: block; }
    .itin-flight-body { flex: 1; min-width: 0; }
    .itin-flight-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; gap: 8px; }
    .itin-airline-name { font-size: 15px; font-weight: 700; color: #1e293b; }
    .itin-flight-num { font-size: 11px; color: #64748b; margin-top: 2px; }
    .itin-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; flex-shrink: 0; }
    .itin-route-grid { display: grid; grid-template-columns: 1fr 44px 1fr; gap: 10px; align-items: center; margin-bottom: 0; }
    .itin-route-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
    .itin-route-airport { font-size: 20px; font-weight: 800; letter-spacing: 0.04em; }
    .itin-route-city { font-size: 10px; color: #94a3b8; margin-top: 1px; margin-bottom: 4px; }
    .itin-route-time { font-size: 11px; color: #64748b; }
    .itin-connection { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: 500; color: #475569; margin-bottom: 12px; }
    .itin-baggage { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; gap: 16px; }
    .itin-baggage-item { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500; }
    .itin-baggage-ok { color: #15803d; }
    .itin-baggage-no { color: #94a3b8; text-decoration: line-through; text-decoration-thickness: 2px; }
    .itin-footer { margin-top: 24px; background: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 10px; padding: 16px 18px; }
    .itin-footer-title { font-size: 13px; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px; }
    .itin-footer-body { font-size: 11px; color: #475569; line-height: 1.7; white-space: pre-line; }
    .itin-footer-agency { font-size: 11px; color: #94a3b8; font-weight: 500; padding-top: 8px; margin-top: 10px; border-top: 1px solid #e2e8f0; }
    @media (max-width: 600px) {
      .itin-pax-grid, .itin-route-grid { grid-template-columns: 1fr; }
      .itin-flight-top { flex-direction: column; }
    }
    @media print { .no-print { display: none !important; } @page { size: A4; margin: 15mm; } .itin-flight-card { box-shadow: none; border: 1px solid #ccc; } }
  `;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const content = document.querySelector('.itinerary-content')?.innerHTML || '';
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Itinerario – ${localizador}</title><style>${cssStyles}</style></head><body><div class="itinerary-content">${content}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
  };

  return (
    <div>
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
          </svg>
          Descargar PDF
        </button>
      </div>

      <style>{cssStyles}</style>

      <div className="itinerary-content">
        {/* Header */}
        <div className="itin-header">
          <div className="itin-header-left">
            {pdfShowLogo && logoUrl ? (
              <img src={logoUrl} alt={agencyName} className="itin-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✈️</div>
            )}
            <div className="itin-agency-info">
              {agencyName && <div className="itin-agency-name">{agencyName}</div>}
              {agencyEmail && <div className="itin-agency-sub">{agencyEmail}</div>}
              {agencyPhone && <div className="itin-agency-sub">Tel: {agencyPhone}</div>}
              {agencyAddress && <div className="itin-agency-sub">{agencyAddress}</div>}
              {agencySlogan && <div className="itin-agency-sub" style={{ fontStyle: 'italic', opacity: 0.85 }}>{agencySlogan}</div>}
            </div>
          </div>
          <div className="itin-reservation-badge">
            <div className="itin-reservation-label">Itinerario de Vuelo</div>
            <div className="itin-reservation-label">Nro de Reserva</div>
            <div className="itin-reservation-code">{localizador}</div>
            {estadoLabel && <div className="itin-estado-badge">{estadoLabel}</div>}
          </div>
        </div>

        {/* Pasajeros */}
        {passengers.length > 0 && (
          <div className="itin-section">
            <div className="itin-section-title">
              <Users size={16} />
              Pasajeros
            </div>
            <div className="itin-pax-grid">
              {passengers.map((p, idx) => {
                const ticket = readPax(p, 'numero_ticket', 'numeroTicket');
                const tipo = readPax(p, 'tipo_pasajero', 'tipoPasajero');
                return (
                  <div key={idx} className="itin-pax-card">
                    <div className="itin-pax-name">{p.nombre} {p.apellido}</div>
                    <div className="itin-pax-detail">
                      {tipo && tipo !== '—' && <span style={{ marginRight: 8 }}>{tipo}</span>}
                      {p.documento && p.documento !== '—' && <span>Doc: {p.documento}</span>}
                    </div>
                    {ticket && ticket !== '—' && <div className="itin-pax-detail">Ticket: <strong>{ticket}</strong></div>}
                    {p.nacionalidad && p.nacionalidad !== '—' && <div className="itin-pax-detail">Nacionalidad: {p.nacionalidad}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vuelos */}
        {vuelos.length > 0 && (
          <div className="itin-section">
            <div className="itin-section-title">
              <Plane size={16} />
              Segmentos de Vuelo
            </div>

            {vuelos.map((vuelo, i) => {
              const total = vuelos.length;
              const code = (vuelo.compania || '').toUpperCase().trim();
              const airlineName = AIRLINES[code] || code;
              const logoSrc = AIRLINE_LOGOS[code] || FALLBACK_LOGO;
              const originName = AIRPORTS[(vuelo.origen || '').toUpperCase().trim()] || vuelo.origen || '';
              const destName = AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino || '';

              let connectionEl = null;
              if (i < total - 1) {
                const sig = vuelos[i + 1];
                if (vuelo.destino === sig.origen) {
                  if (sig.destino !== vuelo.origen) {
                    connectionEl = (
                      <div className="itin-connection">
                        <Clock3 size={14} style={{ color: '#64748b' }} />
                        Cambio de avión en <strong style={{ marginLeft: 4 }}>{AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino}</strong>
                      </div>
                    );
                  }
                } else {
                  connectionEl = (
                    <div className="itin-connection" style={{ borderColor: '#fdba74', background: '#fff7ed', color: '#c2410c' }}>
                      <ArrowRightLeft size={14} />
                      Tramo terrestre: {AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino} → {AIRPORTS[(sig.origen || '').toUpperCase().trim()] || sig.origen}
                    </div>
                  );
                }
              }

              return (
                <div key={i}>
                  <div className="itin-flight-card">
                    <div className="itin-flight-logo-col">
                      <img src={logoSrc} alt={airlineName} className="itin-airline-logo" onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }} />
                    </div>
                    <div className="itin-flight-body">
                      <div className="itin-flight-top">
                        <div>
                          <div className="itin-airline-name">{airlineName}</div>
                          <div className="itin-flight-num">Vuelo: <span style={{ color: primaryColor, fontWeight: 700 }}>{code}{vuelo.vuelo}</span></div>
                        </div>
                        {estadoLabel && (
                          <span className="itin-badge" style={{ background: estadoColors.bg, color: estadoColors.text }}>
                            {estadoLabel}
                          </span>
                        )}
                      </div>

                      <div className="itin-route-grid">
                        <div>
                          <div className="itin-route-label">Salida</div>
                          <div className="itin-route-airport" style={{ color: primaryColor }}>{vuelo.origen}</div>
                          {originName !== vuelo.origen && <div className="itin-route-city">{originName}</div>}
                          {vuelo.fechaSalida && <div className="itin-route-time">{vuelo.fechaSalida}</div>}
                          {vuelo.salida && <div className="itin-route-time" style={{ fontWeight: 700, fontSize: 13 }}>{vuelo.salida} hs.</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ color: primaryColor, fontSize: 20 }}>✈</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="itin-route-label">Llegada{vuelo.nextDay ? ' (+1)' : ''}</div>
                          <div className="itin-route-airport" style={{ color: primaryColor }}>{vuelo.destino}</div>
                          {destName !== vuelo.destino && <div className="itin-route-city">{destName}</div>}
                          {vuelo.fechaLlegada && <div className="itin-route-time">{vuelo.fechaLlegada}</div>}
                          {vuelo.llegada && <div className="itin-route-time" style={{ fontWeight: 700, fontSize: 13 }}>{vuelo.llegada} hs.</div>}
                        </div>
                      </div>

                      {i === 0 && hasBaggageInfo && (
                        <div className="itin-baggage">
                          <span className={`itin-baggage-item ${carryOn ? 'itin-baggage-ok' : 'itin-baggage-no'}`}>
                            <Backpack size={14} /> Carry-on
                          </span>
                          <span className={`itin-baggage-item ${handBag ? 'itin-baggage-ok' : 'itin-baggage-no'}`}>
                            <ShoppingBag size={14} /> Personal
                          </span>
                          <span className={`itin-baggage-item ${checkedBag ? 'itin-baggage-ok' : 'itin-baggage-no'}`}>
                            <Luggage size={14} /> Bodega
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {connectionEl}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="itin-footer">
          <div className="itin-footer-title">Información general</div>
          <div className="itin-footer-body">{pdfFooterMessage}</div>
          <div className="itin-footer-agency">
            {agencyName}
            {agencyAddress && <> · {agencyAddress}</>}
            {agencyPhone && <> · Tel: {agencyPhone}</>}
            {agencyEmail && <> · {agencyEmail}</>}
          </div>
        </div>
      </div>
    </div>
  );
}
