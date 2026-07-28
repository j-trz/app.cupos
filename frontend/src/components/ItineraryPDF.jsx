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

  const primaryColor = config?.colors?.primary || '#304D85';
  const agencyName = config?.identity?.agency_name || '';
  const agencyEmail = config?.identity?.contact_email || '';
  const logoUrl = config?.identity?.pdf_logo_url || config?.identity?.logoUrl || '';
  const agencyPhone = config?.identity?.phone || '';
  const agencyAddress = config?.identity?.address || '';
  const pdfFooterMessage = config?.identity?.pdf_footer_message ||
    'Estimado cliente, te deseamos un muy buen viaje! Favor verificá la documentación con la cual estarás viajando (visas y vacunas si fueran necesarias). No olvides solicitarle a tu asesor que ingrese tu número de viajero frecuente en la reserva. Te aconsejamos hacer el web check-in con anticipación. ¡Gracias por elegirnos!';
  const pdfShowLogo = config?.identity?.pdf_show_logo !== false;

  const codigoReserva = product?.pnr || reservation?.pnr || reservation?.pedido_id || '—';
  const estadoLabel = ESTADO_LABELS[reservation?.estado] || null;
  const estadoColors = ESTADO_COLORS[estadoLabel] || { bg: '#dcfce7', text: '#166534' };

  const vuelos = parseRuta(product?.ruta);
  const referenceYear = product?.fecha_salida ? new Date(product.fecha_salida).getFullYear() : new Date().getFullYear();

  const carryOn = product?.carryon ?? product?.CarryOn;
  const handBag = product?.handbag ?? product?.HandBag;
  const checkedBag = product?.checkedbag ?? product?.CheckedBag;
  const hasBaggageInfo = carryOn !== undefined || handBag !== undefined || checkedBag !== undefined;

  const passengerNames = passengers
    .map((p) => `${p.nombre || ''} ${p.apellido || ''}`.trim())
    .filter(Boolean);

  const headingFont = config?.fonts?.heading || 'Montserrat';
  const bodyFont = config?.fonts?.body || 'Montserrat';

  const cssStyles = `
    .itinerary-content { font-family: "${bodyFont}", "Montserrat", sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: white; color: #0f172a; }
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

    .itin-baggage-row { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
    .itin-baggage-item { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #94a3b8; }
    .itin-baggage-ok { color: #166534; }
    .itin-baggage-no { color: #94a3b8; text-decoration: line-through; text-decoration-thickness: 2px; }

    .itin-footer { text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .itin-footer-body { font-size: 11px; color: #475569; line-height: 1.7; white-space: pre-line; }
    .itin-footer-agency { font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 8px; }
    @media (max-width: 600px) {
      .itin-grid { grid-template-columns: 1fr; }
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
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
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
          className="print-btn"
          style={{ backgroundColor: primaryColor }}
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </button>
      </div>

      <style>{cssStyles}</style>

      <div className="itinerary-content">
        <div className="header">
          {pdfShowLogo && logoUrl ? (
            <img src={logoUrl} alt={agencyName} className="logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="logo" style={{ display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: primaryColor }}>{agencyName}</div>
          )}
          <div className="title">Detalle de Itinerario</div>
        </div>

        <div className="card">
          <div className="info-grid">
            <div>
              <p className="info-label">Pasajero(s)</p>
              <div>
                <div style={{ marginBottom: 0 }}>
                  <p className="info-value">{passengerNames.length > 0 ? passengerNames.join(', ') : '—'}</p>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="info-label">Código de Reserva</p>
              <p className="info-value">{codigoReserva}</p>
            </div>
          </div>
        </div>

        {vuelos.length > 0 && (
          <>
            <h2 className="section-title">Segmentos de Vuelo</h2>
            <div className="card">
              {vuelos.map((vuelo, i) => {
                const total = vuelos.length;
                const code = (vuelo.compania || '').toUpperCase().trim();
                const airlineName = AIRLINES[code] || code;
                const logoSrc = AIRLINE_LOGOS[code] || FALLBACK_LOGO;
                const originName = AIRPORTS[(vuelo.origen || '').toUpperCase().trim()] || vuelo.origen || '';
                const destName = AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino || '';

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
                        <div className="connection-badge">
                          <Clock3 size={16} />
                          Cambio de avión en <strong>{AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino}</strong>
                        </div>
                      );
                    }
                  } else {
                    connectionEl = (
                      <div className="openjaw-badge">
                        <ArrowRightLeft size={16} />
                        Tramo terrestre: {AIRPORTS[(vuelo.destino || '').toUpperCase().trim()] || vuelo.destino} → {AIRPORTS[(sig.origen || '').toUpperCase().trim()] || sig.origen}
                      </div>
                    );
                  }
                }

                return (
                  <div key={i}>
                    <div className="flight-segment">
                      <div className="flight-icon-col">
                        <LegIcon size={24} className="flight-icon" />
                        {i < total - 1 ? <div className="flight-line"></div> : null}
                      </div>
                      <div>
                        <div className="flight-header">
                          <div className="flight-route">
                            <img src={logoSrc} alt={airlineName} className="airline-logo" onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }} />
                            <div className="route-info">
                              <span className="route-text">{originName || vuelo.origen} → {destName || vuelo.destino}</span>
                              <span className="flight-info">{airlineName} - {vuelo.vuelo}</span>
                            </div>
                          </div>
                          {estadoLabel && (
                            <span className="badge" style={{ background: estadoColors.bg, color: estadoColors.text }}>
                              {estadoLabel}
                            </span>
                          )}
                        </div>
                        <div className="details-grid">
                          <div>
                            <div className="detail-item">
                              <p className="detail-label">Salida</p>
                              <p className="detail-value">{displayFlightDate(vuelo.fechaSalida, referenceYear)}{salidaHora ? ` - ${salidaHora}` : ''}</p>
                            </div>
                            <div className="detail-item">
                              <p className="detail-label">Cabina</p>
                              <p className="detail-value">{vuelo.clase || 'Economy'}</p>
                            </div>
                          </div>
                          <div>
                            <div className="detail-item">
                              <p className="detail-label">Llegada{vuelo.nextDay ? ' (+1)' : ''}</p>
                              <p className="detail-value">{displayFlightDate(vuelo.fechaLlegada || vuelo.fechaSalida, referenceYear)}{llegadaHora ? ` - ${llegadaHora}` : ''}</p>
                            </div>
                            <div className="detail-item">
                              <p className="detail-label">Duración</p>
                              <p className="detail-value">{duracion || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {hasBaggageInfo && (
                          <div className="detail-item mt-5">
                            <p className="detail-label">Franquicia de equipaje</p>
                            <div className="baggage-grid">
                              <div className={`baggage-item ${handBag ? 'baggage-included' : 'baggage-excluded'}`}>
                                <ShoppingBag size={16} />
                                <span className="baggage-label">Artículo personal</span>
                              </div>
                              <div className={`baggage-item ${carryOn ? 'baggage-included' : 'baggage-excluded'}`}>
                                <Backpack size={16} />
                                <span className="baggage-label">Equipaje de mano</span>
                              </div>
                              <div className={`baggage-item ${checkedBag ? 'baggage-included' : 'baggage-excluded'}`}>
                                <Luggage size={16} />
                                <span className="baggage-label">Equipaje en bodega</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {i === 0 && hasBaggageInfo && (
                        <div className="itin-baggage-row">
                          <span className={`itin-baggage-item ${carryOn ? 'itin-baggage-ok' : 'itin-baggage-no'}`}>
                            <Backpack size={14} /> Equipaje de mano
                          </span>
                          <span className={`itin-baggage-item ${handBag ? 'itin-baggage-ok' : 'itin-baggage-no'}`}>
                            <ShoppingBag size={14} /> Artículo personal
                          </span>
                          <span className={`itin-baggage-item ${checkedBag ? 'itin-baggage-ok' : 'itin-baggage-no'}`}>
                            <Luggage size={14} /> Equipaje en bodega
                          </span>
                        </div>
                      )}
                    </div>
                    {connectionEl}
                  </div>
                );
              })}
            </div>
          </>
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
