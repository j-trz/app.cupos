import { Printer, Plane, PlaneTakeoff, PlaneLanding, Clock3, ArrowRightLeft, Backpack, ShoppingBag, Luggage } from 'lucide-react';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { AIRLINES, AIRLINE_LOGOS, AIRPORTS, AIRPORT_TIMEZONES, parseRuta } from './ItineraryTable';

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

const MESES_GDS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const MESES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Distintos puntos de la app pasan al pasajero con distinto casing
// (passengers[] crudo del backend -> snake_case; filas ya adaptadas en
// GestionReservas -> camelCase) — se acepta cualquiera de las dos formas.
function readPax(p, snakeKey, camelKey) {
  return p[snakeKey] ?? p[camelKey];
}

// Entiende tanto fechas ISO ("2026-07-20") como el formato GDS sin año
// ("20JUL" o "20JUL26") que deja parseSegmentLine al parsear una ruta en
// texto plano (que es el único formato que hoy produce el formulario de
// productos — el campo "Ruta" es texto libre).
function parseFlightDate(fecha, referenceYear) {
  if (!fecha) return null;
  const s = String(fecha).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return { year: parseInt(iso[1], 10), month: parseInt(iso[2], 10) - 1, day: parseInt(iso[3], 10) };
  }
  const gds = s.toUpperCase().match(/^(\d{1,2})([A-Z]{3})(\d{2,4})?$/);
  if (gds) {
    const month = MESES_GDS[gds[2]];
    if (month === undefined) return null;
    let year = referenceYear;
    if (gds[3]) year = gds[3].length === 2 ? 2000 + parseInt(gds[3], 10) : parseInt(gds[3], 10);
    return { year, month, day: parseInt(gds[1], 10) };
  }
  return null;
}

function displayFlightDate(fecha, referenceYear) {
  const parsed = parseFlightDate(fecha, referenceYear);
  if (!parsed) return fecha || '';
  const dd = String(parsed.day).padStart(2, '0');
  return `${dd}${MESES_ES[parsed.month]}${String(parsed.year).slice(-2)}`;
}

function parseHHmm(t) {
  if (!t) return null;
  const s = String(t).replace(':', '').trim();
  if (!/^\d{3,4}$/.test(s)) return null;
  const padded = s.padStart(4, '0');
  return { h: parseInt(padded.slice(0, 2), 10), m: parseInt(padded.slice(2), 10) };
}

function displayHHmm(hhmm) {
  if (!hhmm) return '';
  return `${String(hhmm.h).padStart(2, '0')}:${String(hhmm.m).padStart(2, '0')}`;
}

// Convierte una fecha+hora de PARED en una zona horaria IANA a su instante
// UTC real — truco estándar: comparar cómo se ve la misma marca de tiempo
// interpretada en la zona objetivo vs en UTC para deducir el offset (contempla
// horario de verano correctamente porque usa la fecha real del vuelo).
function zonedToUtc({ year, month, day }, hhmm, timeZone) {
  const naiveUTC = new Date(Date.UTC(year, month, day, hhmm.h, hhmm.m));
  const asTz = new Date(naiveUTC.toLocaleString('en-US', { timeZone }));
  const asUtc = new Date(naiveUTC.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = asUtc.getTime() - asTz.getTime();
  return new Date(naiveUTC.getTime() + offsetMs);
}

// La hora de llegada es hora LOCAL de la ciudad de destino, no tiempo
// transcurrido — restar directamente "llegada - salida" como si fueran del
// mismo huso da un resultado incorrecto en cuanto origen y destino están en
// zonas horarias distintas. Si no tenemos la zona horaria de alguno de los
// dos aeropuertos, se devuelve null (se muestra "N/A" en vez de arriesgar un
// cálculo mal hecho).
function computeDuration(vuelo, referenceYear) {
  const origenTz = AIRPORT_TIMEZONES[(vuelo.origen || '').toUpperCase().trim()];
  const destinoTz = AIRPORT_TIMEZONES[(vuelo.destino || '').toUpperCase().trim()];
  if (!origenTz || !destinoTz) return null;

  const salidaHora = parseHHmm(vuelo.salida);
  const llegadaHora = parseHHmm(vuelo.llegada);
  if (!salidaHora || !llegadaHora) return null;

  const salidaFecha = parseFlightDate(vuelo.fechaSalida, referenceYear);
  if (!salidaFecha) return null;

  let llegadaFecha = parseFlightDate(vuelo.fechaLlegada, referenceYear);
  if (!llegadaFecha) {
    const base = new Date(Date.UTC(salidaFecha.year, salidaFecha.month, salidaFecha.day));
    if (vuelo.nextDay) base.setUTCDate(base.getUTCDate() + 1);
    llegadaFecha = { year: base.getUTCFullYear(), month: base.getUTCMonth(), day: base.getUTCDate() };
  }

  const salidaUTC = zonedToUtc(salidaFecha, salidaHora, origenTz);
  const llegadaUTC = zonedToUtc(llegadaFecha, llegadaHora, destinoTz);
  const diffMs = llegadaUTC.getTime() - salidaUTC.getTime();
  // Sanity check: una duración negativa o de más de 30hs es casi seguro un
  // dato mal parseado, mejor mostrar N/A que un número absurdo.
  if (diffMs <= 0 || diffMs > 1000 * 60 * 60 * 30) return null;

  const totalMin = Math.round(diffMs / 60000);
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

// ─── Componente de Itinerario con PDF ─────────────────────────────────────────
// Props:
//   reservation — { pedido_id, pnr, estado }
//   passengers  — [{nombre, apellido, documento, tipo_pasajero, ...}]
//   product     — { ruta, destino, fecha_salida, pnr, carryon/handbag/checkedbag }
export default function ItineraryPDF({ reservation, passengers = [], product }) {
  const { config } = useWhiteLabel();

  const primaryColor = config?.colors?.primary || '#2c4b8b';
  const agencyName = config?.identity?.agency_name || '';
  const agencyEmail = config?.identity?.contact_email || '';
  const logoUrl = config?.identity?.logoUrl || '';
  const agencyPhone = config?.identity?.phone || '';
  const agencyAddress = config?.identity?.address || '';
  const pdfFooterMessage = config?.identity?.pdf_footer_message ||
    'Estimado cliente, te deseamos un muy buen viaje! Favor verificá la documentación con la cual estarás viajando (visas y vacunas si fueran necesarias). No olvides solicitarle a tu asesor que ingrese tu número de viajero frecuente en la reserva. Te aconsejamos hacer el web check-in con anticipación. ¡Gracias por elegirnos!';
  const pdfShowLogo = config?.identity?.pdf_show_logo !== false;

  // El código de reserva que le sirve al pasajero es el PNR de la aerolínea,
  // no el ID interno del pedido (que solo tiene sentido puertas adentro).
  const codigoReserva = product?.pnr || reservation?.pnr || reservation?.pedido_id || '—';
  const estadoLabel = ESTADO_LABELS[reservation?.estado] || null;
  const estadoColors = ESTADO_COLORS[estadoLabel] || { bg: '#f3f4f6', text: '#374151' };

  // parseRuta (compartido con "Ver Ruta") entiende tanto el formato moderno
  // (JSON con { vuelos: [...] }) como el texto plano de GDS histórico.
  const vuelos = parseRuta(product?.ruta);
  const referenceYear = product?.fecha_salida ? new Date(product.fecha_salida).getFullYear() : new Date().getFullYear();

  const carryOn = product?.carryon ?? product?.CarryOn;
  const handBag = product?.handbag ?? product?.HandBag;
  const checkedBag = product?.checkedbag ?? product?.CheckedBag;
  const hasBaggageInfo = carryOn !== undefined || handBag !== undefined || checkedBag !== undefined;

  const passengerNames = passengers
    .map((p) => `${p.nombre || ''} ${p.apellido || ''}`.trim())
    .filter(Boolean);

  const headingFont = config?.fonts?.heading || 'Inter';
  const bodyFont = config?.fonts?.body || 'Inter';
  const monoFont = config?.fonts?.mono || 'JetBrains Mono';

  // CSS escopeada a .itinerary-content — un <style> con selector "body" acá
  // se aplicaría a TODA la página mientras el modal está abierto (un <style>
  // no queda contenido a su posición en el DOM), rompiendo el tamaño de letra
  // y color de fondo del resto de la app. Por eso todo cuelga de esta clase.
  const cssStyles = `
    .itinerary-content { font-family: "${bodyFont}", "Inter", sans-serif; max-width: 900px; margin: 0 auto; padding: 8px 4px 24px; background: white; color: #1e293b; font-size: 12px; line-height: 1.5; }
    .itinerary-content * { box-sizing: border-box; }
    .itin-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; gap: 16px; flex-wrap: wrap; }
    .itin-header-left { display: flex; align-items: center; gap: 12px; }
    .itin-logo { height: 40px; width: auto; object-fit: contain; }
    .itin-title { font-family: "${headingFont}", "Inter", sans-serif; font-size: 18px; font-weight: 800; color: ${primaryColor}; }
    .itin-info-bar { display: flex; justify-content: space-between; align-items: flex-start; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .itin-info-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
    .itin-info-value { font-size: 14px; font-weight: 700; color: #0f172a; }
    .itin-section-title { font-family: "${headingFont}", "Inter", sans-serif; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .itin-segments-box { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .itin-segment { padding: 16px 18px; }
    .itin-segment + .itin-segment { border-top: 1px solid #f1f5f9; }
    .itin-segment-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
    .itin-leg-icon { color: ${primaryColor}; flex-shrink: 0; margin-top: 2px; }
    .itin-airline-logo { width: 28px; height: 28px; object-fit: contain; border-radius: 4px; flex-shrink: 0; }
    .itin-route-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .itin-airline-line { font-size: 11px; color: #64748b; margin-top: 2px; }
    .itin-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; flex-shrink: 0; margin-left: auto; }
    .itin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
    .itin-grid-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
    .itin-grid-value { font-size: 12px; color: #334155; }
    .itin-grid-time { font-size: 13px; font-weight: 700; color: #0f172a; }
    .itin-connection { display: flex; align-items: center; gap: 6px; padding: 8px 18px; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 500; color: #64748b; }
    
    .itin-baggage-section { margin-top: 24px; margin-bottom: 24px; }
    .itin-baggage-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .itin-baggage-card { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .itin-baggage-card.included { border-left: 4px solid #166534; background: #f0fdf4; }
    .itin-baggage-card.not-included { border-left: 4px solid #94a3b8; opacity: 0.6; }
    .bag-icon { color: #475569; }
    .itin-baggage-card.included .bag-icon { color: #166534; }
    .bag-details { display: flex; flex-direction: column; }
    .bag-title { font-size: 11px; font-weight: 600; color: #1e293b; }
    .bag-status { font-size: 9px; font-weight: 700; color: #64748b; margin-top: 2px; }
    .itin-baggage-card.included .bag-status { color: #166534; }

    .itin-footer { text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .itin-footer-body { font-size: 11px; color: #475569; line-height: 1.7; white-space: pre-line; }
    .itin-footer-agency { font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 8px; }
    @media (max-width: 600px) {
      .itin-grid { grid-template-columns: 1fr; }
      .itin-baggage-container { grid-template-columns: 1fr; }
    }
    @media print { .no-print { display: none !important; } @page { size: A4; margin: 15mm; } }
  `;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const content = document.querySelector('.itinerary-content')?.innerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Itinerario – ${codigoReserva}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Lato:wght@400;700&family=Nunito:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
          :root {
            --font-heading: "${headingFont}", ui-sans-serif, system-ui, sans-serif;
            --font-body: "${bodyFont}", ui-sans-serif, system-ui, sans-serif;
            --font-mono: "${monoFont}", ui-monospace, monospace;
          }
          * { margin: 0; padding: 0; }
          ${cssStyles}
        </style>
      </head>
      <body>
        <div class="itinerary-content">${content}</div>
        <script>
          window.addEventListener('load', () => {
            const images = document.getElementsByTagName('img');
            let loadedCount = 0;
            const totalImages = images.length;
            if (totalImages === 0) {
              window.print();
              window.close();
            } else {
              for (let i = 0; i < totalImages; i++) {
                if (images[i].complete) {
                  loadedCount++;
                  if (loadedCount === totalImages) {
                    window.print();
                    window.close();
                  }
                } else {
                  images[i].addEventListener('load', () => {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                      window.print();
                      window.close();
                    }
                  });
                  images[i].addEventListener('error', () => {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                      window.print();
                      window.close();
                    }
                  });
                }
              }
            }
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div>
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </button>
      </div>

      <style>{cssStyles}</style>

      <div className="itinerary-content">
        {/* Header */}
        <div className="itin-header">
          <div className="itin-header-left">
            {pdfShowLogo && logoUrl ? (
              <img src={logoUrl} alt={agencyName} className="itin-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : null}
          </div>
          <div className="itin-title">Detalle de Itinerario</div>
        </div>

        {/* Pasajero(s) + Código de reserva */}
        <div className="itin-info-bar">
          <div>
            <div className="itin-info-label">Pasajero(s)</div>
            <div className="itin-info-value">{passengerNames.length > 0 ? passengerNames.join(', ') : '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="itin-info-label">Código de Reserva</div>
            <div className="itin-info-value">{codigoReserva}</div>
            {estadoLabel && (
              <span className="itin-badge" style={{ background: estadoColors.bg, color: estadoColors.text, marginTop: 4 }}>
                {estadoLabel}
              </span>
            )}
          </div>
        </div>

        {/* Vuelos */}
        {vuelos.length > 0 && (
          <>
            <div className="itin-section-title">Segmentos de Vuelo</div>
            <div className="itin-segments-box">
              {vuelos.map((vuelo, i) => {
                const total = vuelos.length;
                const code = (vuelo.compania || '').toUpperCase().trim();
                const airlineName = AIRLINES[code] || code;
                const logoSrc = AIRLINE_LOGOS[code] || FALLBACK_LOGO;
                const originName = AIRPORTS[(vuelo.origen || '').toUpperCase().trim()] || vuelo.origen || '';
                const destName = AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino || '';
                // Primer tramo del itinerario = despegue inicial; último tramo
                // = aterrizaje final; cualquier tramo intermedio = vuelo en
                // curso (ícono genérico), como en un itinerario de aerolínea real.
                const LegIcon = i === 0 ? PlaneTakeoff : i === total - 1 ? PlaneLanding : Plane;
                const duracion = computeDuration(vuelo, referenceYear);
                const salidaHora = displayHHmm(parseHHmm(vuelo.salida)) || vuelo.salida || '';
                const llegadaHora = displayHHmm(parseHHmm(vuelo.llegada)) || vuelo.llegada || '';

                let connectionEl = null;
                if (i < total - 1) {
                  const sig = vuelos[i + 1];
                  if (vuelo.destino === sig.origen) {
                    if (sig.destino !== vuelo.origen) {
                      connectionEl = (
                        <div className="itin-connection">
                          <Clock3 size={14} />
                          Cambio de avión en <strong>{AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino}</strong>
                        </div>
                      );
                    }
                  } else {
                    connectionEl = (
                      <div className="itin-connection" style={{ color: '#c2410c', background: '#fff7ed' }}>
                        <ArrowRightLeft size={14} />
                        Tramo terrestre: {AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino} → {AIRPORTS[(sig.origen || '').toUpperCase().trim()] || sig.origen}
                      </div>
                    );
                  }
                }

                return (
                  <div key={i}>
                    <div className="itin-segment">
                      <div className="itin-segment-top">
                        <LegIcon size={18} className="itin-leg-icon" />
                        <img src={logoSrc} alt={airlineName} className="itin-airline-logo" onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }} />
                        <div>
                          <div className="itin-route-title">{originName || vuelo.origen} → {destName || vuelo.destino}</div>
                          <div className="itin-airline-line">{airlineName} - {vuelo.vuelo}</div>
                        </div>
                        {estadoLabel && (
                          <span className="itin-badge" style={{ background: estadoColors.bg, color: estadoColors.text }}>
                            {estadoLabel}
                          </span>
                        )}
                      </div>

                      <div className="itin-grid">
                        <div>
                          <div className="itin-grid-label">Salida</div>
                          <div className="itin-grid-value">{displayFlightDate(vuelo.fechaSalida, referenceYear)}</div>
                          {salidaHora && <div className="itin-grid-time">{salidaHora}</div>}
                        </div>
                        <div>
                          <div className="itin-grid-label">Llegada{vuelo.nextDay ? ' (+1)' : ''}</div>
                          <div className="itin-grid-value">{displayFlightDate(vuelo.fechaLlegada || vuelo.fechaSalida, referenceYear)}</div>
                          {llegadaHora && <div className="itin-grid-time">{llegadaHora}</div>}
                        </div>
                        <div>
                          <div className="itin-grid-label">Duración</div>
                          <div className="itin-grid-value">{duracion || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    {connectionEl}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Franquicia de Equipaje */}
        {hasBaggageInfo && (
          <div className="itin-baggage-section">
            <div className="itin-section-title">Franquicia de Equipaje</div>
            <div className="itin-baggage-container">
              <div className={`itin-baggage-card ${carryOn ? 'included' : 'not-included'}`}>
                <Backpack className="w-5 h-5 bag-icon" />
                <div className="bag-details">
                  <span className="bag-title">Equipaje de mano</span>
                  <span className="bag-status">{carryOn ? 'INCLUIDO' : 'NO INCLUIDO'}</span>
                </div>
              </div>
              <div className={`itin-baggage-card ${handBag ? 'included' : 'not-included'}`}>
                <ShoppingBag className="w-5 h-5 bag-icon" />
                <div className="bag-details">
                  <span className="bag-title">Artículo personal</span>
                  <span className="bag-status">{handBag ? 'INCLUIDO' : 'NO INCLUIDO'}</span>
                </div>
              </div>
              <div className={`itin-baggage-card ${checkedBag ? 'included' : 'not-included'}`}>
                <Luggage className="w-5 h-5 bag-icon" />
                <div className="bag-details">
                  <span className="bag-title">Equipaje en bodega</span>
                  <span className="bag-status">{checkedBag ? 'INCLUIDO' : 'NO INCLUIDO'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="itin-footer">
          <div className="itin-footer-body">{pdfFooterMessage}</div>
          <div className="itin-footer-agency">
            {agencyAddress && <>{agencyAddress}</>}
            {agencyPhone && <>{agencyAddress ? ' · ' : ''}Tel: {agencyPhone}</>}
            {agencyEmail && <>{(agencyAddress || agencyPhone) ? ' · ' : ''}{agencyEmail}</>}
          </div>
        </div>
      </div>
    </div>
  );
}
