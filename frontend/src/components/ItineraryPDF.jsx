import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { AIRLINES, AIRLINE_LOGOS, AIRPORTS } from './ItineraryTable';

const FALLBACK_LOGO = 'https://documents.sabre.com/static/images/tc/mail/icon-air.png';

// ─── Normaliza un array de vuelos desde distintos formatos ────────────────────
function normalizeVuelos(vuelos) {
  if (!vuelos || !Array.isArray(vuelos)) return [];
  return vuelos.map((v) => ({
    aerolinea: v.aerolinea || v.compania || '',
    numeroVuelo: v.numeroVuelo || v.vuelo || '',
    fecha: v.fecha || '',
    origen: v.origen || '',
    destino: v.destino || '',
    horaSalida: v.horaSalida || v.salida || '',
    horaLlegada: v.horaLlegada || v.llegada || '',
    clase: v.clase || v.cabina || '',
  }));
}

// ─── Componente de Itinerario con PDF ─────────────────────────────────────────
// Props:
//   reservation   — objeto reserva (id, pedido_id, contacto_nombre, etc.)
//   passengers    — array de pasajeros [{nombre, apellido, documento, tipo_pasajero, ...}]
//   product       — objeto producto (ruta, codigo_cupo, destino, fecha_salida, etc.)
//   vuelos        — array de vuelos ya estructurado (opcional, tiene precedencia sobre product.ruta)
export default function ItineraryPDF({ reservation, passengers = [], product, vuelos: vuelosProp }) {
  const { config } = useWhiteLabel();

  // Branding desde White Label
  const primaryColor = config?.colors?.primary || '#2c4b8b';
  const agencyName = config?.identity?.agency_name || '';
  const agencyEmail = config?.identity?.contact_email || '';
  const agencySlogan = config?.identity?.slogan || '';
  const logoUrl = config?.identity?.logoUrl || '';

  // Resolver vuelos
  let vuelos = [];
  if (vuelosProp && vuelosProp.length) {
    vuelos = normalizeVuelos(vuelosProp);
  } else if (product?.ruta) {
    try {
      let parsed = product.ruta;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { /* legacy */ }
      }
      if (parsed?.vuelos) vuelos = normalizeVuelos(parsed.vuelos);
    } catch { /* ignore */ }
  }

  const localizador = reservation?.pedido_id || reservation?.id || '—';

  const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: white; color: #1e293b; font-size: 12px; line-height: 1.5; }
    .itinerary-content { max-width: 960px; margin: 0 auto; padding: 24px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: center; background: ${primaryColor}; color: white; padding: 20px 24px; border-radius: 10px; margin-bottom: 20px; }
    .agency-logo { width: 100px; height: 60px; object-fit: contain; }
    .agency-info { flex: 1; padding-left: 16px; }
    .agency-name { font-size: 18px; font-weight: 700; }
    .agency-sub { font-size: 11px; opacity: 0.85; }
    .title-block { text-align: right; }
    .title-block h1 { font-size: 22px; font-weight: 700; }
    .title-block p { font-size: 11px; opacity: 0.85; }
    .section { background: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .section-title { font-size: 13px; font-weight: 700; color: ${primaryColor}; margin-bottom: 10px; }
    .pax-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pax-item { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .pax-name { font-weight: 700; font-size: 13px; color: #0f172a; }
    .pax-detail { font-size: 11px; color: #64748b; margin-top: 2px; }
    .flight-card { background: white; border-radius: 8px; padding: 14px; margin-bottom: 10px; border: 1px solid #e2e8f0; display: flex; gap: 14px; align-items: flex-start; }
    .airline-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 6px; border: 1px solid #f1f5f9; flex-shrink: 0; }
    .flight-info { flex: 1; }
    .flight-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
    .airline-name { font-size: 15px; font-weight: 700; color: #1e293b; }
    .flight-num { font-size: 11px; color: #64748b; margin-top: 2px; }
    .flight-code { color: ${primaryColor}; font-weight: 700; }
    .flight-date { font-size: 11px; color: #64748b; text-align: right; text-transform: uppercase; }
    .route-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .route-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .route-airport { color: ${primaryColor}; font-size: 12px; font-weight: 600; margin-top: 2px; }
    .route-time { font-size: 11px; color: #64748b; }
    .footer { margin-top: 24px; background: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 8px; padding: 16px; }
    .footer-title { font-size: 13px; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px; }
    .footer-text { font-size: 11px; color: #64748b; line-height: 1.7; }
    .confirmation-badge { background: white; border: 2px solid white; border-radius: 8px; padding: 8px 16px; text-align: center; }
    .conf-label { font-size: 10px; opacity: 0.85; }
    .conf-value { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
    @media print { .no-print { display: none !important; } @page { size: A4; margin: 15mm; } }
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
      {/* Botón imprimir */}
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

      {/* Contenido del itinerario */}
      <div className="itinerary-content">
        {/* Header con branding */}
        <div className="header">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={agencyName} className="agency-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✈️</div>
            )}
            <div className="agency-info">
              {agencyName && <div className="agency-name">{agencyName}</div>}
              {agencyEmail && <div className="agency-sub">{agencyEmail}</div>}
              {agencySlogan && <div className="agency-sub">{agencySlogan}</div>}
            </div>
          </div>
          <div className="title-block">
            <h1>Itinerario</h1>
            <div className="confirmation-badge" style={{ marginTop: 8, color: primaryColor }}>
              <div className="conf-label" style={{ color: '#64748b' }}>Nro Reserva</div>
              <div className="conf-value">{localizador}</div>
            </div>
          </div>
        </div>

        {/* Pasajeros */}
        {passengers.length > 0 && (
          <div className="section">
            <div className="section-title">Pasajeros</div>
            <div className="pax-grid">
              {passengers.map((p, idx) => (
                <div key={idx} className="pax-item">
                  <div className="pax-name">{p.nombre} {p.apellido}</div>
                  <div className="pax-detail">
                    {p.tipo_pasajero && <span className="mr-2">{p.tipo_pasajero}</span>}
                    {p.documento && <span>Doc: {p.documento}</span>}
                  </div>
                  {p.nacionalidad && <div className="pax-detail">Nacionalidad: {p.nacionalidad}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vuelos */}
        {vuelos.length > 0 && (
          <div className="section">
            <div className="section-title">Detalle de Vuelos</div>
            {vuelos.map((vuelo, i) => {
              const code = (vuelo.aerolinea || '').toUpperCase().trim();
              const airlineName = AIRLINES[code] || code;
              const logoSrc = AIRLINE_LOGOS[code] || FALLBACK_LOGO;
              const originName = AIRPORTS[(vuelo.origen || '').toUpperCase()] || vuelo.origen || '';
              const destName = AIRPORTS[(vuelo.destino || '').toUpperCase()] || vuelo.destino || '';
              return (
                <div key={i} className="flight-card">
                  <img src={logoSrc} alt={airlineName} className="airline-logo" onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }} />
                  <div className="flight-info">
                    <div className="flight-header">
                      <div>
                        <div className="airline-name">{airlineName}</div>
                        <div className="flight-num">Vuelo: <span className="flight-code">{code}{vuelo.numeroVuelo}</span></div>
                        {vuelo.clase && <div className="flight-num">Cabina: <strong>{vuelo.clase}</strong></div>}
                      </div>
                      <div className="flight-date">{vuelo.fecha}</div>
                    </div>
                    <div className="route-grid">
                      <div>
                        <div className="route-label">Salida</div>
                        <div className="route-airport">{originName}</div>
                        {vuelo.horaSalida && <div className="route-time">{vuelo.horaSalida} hs.</div>}
                      </div>
                      <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: primaryColor, fontSize: 20 }}>✈</span>
                      </div>
                      <div>
                        <div className="route-label">Llegada</div>
                        <div className="route-airport">{destName}</div>
                        {vuelo.horaLlegada && <div className="route-time">{vuelo.horaLlegada} hs.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <div className="footer-title">Información general</div>
          <div className="footer-text">
            Estimado cliente, te deseamos un muy buen viaje!<br />
            Favor verificá la documentación con la cual estarás viajando (visas y vacunas si fueran necesarias).<br />
            No olvides solicitarle a tu asesor que ingrese tu número de viajero frecuente en la reserva.<br />
            Te aconsejamos hacer el web check-in con anticipación.{' '}
            <strong>¡Gracias por elegirnos!</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
