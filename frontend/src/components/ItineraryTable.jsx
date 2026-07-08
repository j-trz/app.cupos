import { useMemo } from 'react';
import Swal from 'sweetalert2';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

// ─── Diccionarios ─────────────────────────────────────────────────────────────
export const AIRLINES = {
  'A3': 'Aegean Airlines', 'AA': 'American Airlines', 'AC': 'Air Canada',
  'AD': 'Azul Linhas Aéreas', 'AI': 'Air India', 'AM': 'Aeroméxico',
  'AF': 'Air France', 'AR': 'Aerolíneas Argentinas', 'AS': 'Alaska Airlines',
  'AT': 'Royal Air Maroc', 'AV': 'Avianca', 'AY': 'Finnair', 'AZ': 'Alitalia',
  'BA': 'British Airways', 'BR': 'EVA Air', 'CA': 'Air China',
  'CI': 'China Airlines', 'CM': 'Copa Airlines', 'CX': 'Cathay Pacific',
  'DL': 'Delta Air Lines', 'EI': 'Aer Lingus', 'EK': 'Emirates',
  'ET': 'Ethiopian Airlines', 'EY': 'Etihad Airways', 'F9': 'Frontier Airlines',
  'FI': 'Icelandair', 'FR': 'Ryanair', 'G3': 'Gol Linhas Aéreas',
  'GF': 'Gulf Air', 'HA': 'Hawaiian Airlines', 'HU': 'Hainan Airlines',
  'IB': 'Iberia', 'JA': 'Jetsmart', 'JL': 'Japan Airlines', 'KE': 'Korean Air',
  'KL': 'KLM Royal Dutch Airlines', 'LA': 'LATAM Airlines', 'LH': 'Lufthansa',
  'LY': 'EL AL Israel Airlines', 'LO': 'LOT Polish Airlines',
  'LX': 'Swiss International Air Lines', 'MH': 'Malaysia Airlines',
  'MS': 'EgyptAir', 'NH': 'All Nippon Airways', 'NZ': 'Air New Zealand',
  'OB': 'Boliviana de Aviación', 'OS': 'Austrian Airlines', 'OZ': 'Asiana Airlines',
  'QF': 'Qantas', 'QR': 'Qatar Airways', 'SK': 'SAS',
  'SA': 'South African Airways', 'SQ': 'Singapore Airlines', 'TK': 'Turkish Airlines',
  'TP': 'TAP Air Portugal', 'U2': 'easyJet', 'UA': 'United Airlines',
  'UX': 'Air Europa', 'W6': 'Wizz Air', 'P5': 'Wingo', 'VY': 'Vueling',
};

export const AIRLINE_LOGOS = {
  'AA': 'https://resources.netviax.com/images/airlines/AA.png',
  'AF': 'https://resources.netviax.com/images/airlines/AF.png',
  'AR': 'https://resources.netviax.com/images/airlines/AR.png',
  'AV': 'https://resources.netviax.com/images/airlines/AV.png',
  'AD': 'https://resources.netviax.com/images/airlines/AD.png',
  'BA': 'https://resources.netviax.com/images/airlines/BA.png',
  'CM': 'https://resources.netviax.com/images/airlines/CM.png',
  'DL': 'https://resources.netviax.com/images/airlines/DL.png',
  'EK': 'https://resources.netviax.com/images/airlines/EK.png',
  'G3': 'https://resources.netviax.com/images/airlines/G3.png',
  'IB': 'https://resources.netviax.com/images/airlines/IB.png',
  'JA': 'https://resources.netviax.com/images/airlines/JA.png',
  'JL': 'https://resources.netviax.com/images/airlines/JL.png',
  'KL': 'https://resources.netviax.com/images/airlines/KL.png',
  'LA': 'https://resources.netviax.com/images/airlines/LA.png',
  'LH': 'https://resources.netviax.com/images/airlines/LH.png',
  'NH': 'https://resources.netviax.com/images/airlines/NH.png',
  'QF': 'https://resources.netviax.com/images/airlines/QF.png',
  'QR': 'https://resources.netviax.com/images/airlines/QR.png',
  'SK': 'https://resources.netviax.com/images/airlines/SK.png',
  'SQ': 'https://resources.netviax.com/images/airlines/SQ.png',
  'TK': 'https://resources.netviax.com/images/airlines/TK.png',
  'TP': 'https://resources.netviax.com/images/airlines/TP.png',
  'UA': 'https://resources.netviax.com/images/airlines/UA.png',
  'UX': 'https://resources.netviax.com/images/airlines/UX.png',
};

export const AIRPORTS = {
  'EZE': 'Buenos Aires, Ezeiza',
  'AEP': 'Buenos Aires, Aeroparque',
  'MVD': 'Montevideo, Carrasco',
  'SCL': 'Santiago, Arturo Merino Benítez',
  'GRU': 'São Paulo, Guarulhos',
  'GIG': 'Río de Janeiro, Galeão',
  'BOG': 'Bogotá, El Dorado',
  'LIM': 'Lima, Jorge Chávez',
  'MIA': 'Miami, FL, US',
  'JFK': 'Nueva York, John F. Kennedy, US',
  'LAX': 'Los Ángeles, California',
  'MAD': 'Madrid, Barajas',
  'PUJ': 'Punta Cana, Rep. Dominicana',
  'CUN': 'Cancún, México',
  'AUA': 'Aruba',
  'CUR': 'Curazao',
  'PTY': 'Panamá, Tocumen',
  'SJO': 'San José, Costa Rica',
  'MCZ': 'Maceio, Alagoas',
  'SSA': 'Salvador, Bahia',
  'REC': 'Recife, Pernambuco',
  'NAT': 'Natal, Río Grande do Norte',
  'POA': 'Porto Alegre, Rio Grande do Sul',
  'FLN': ' Florianópolis, Santa Catarina',
  'FOR': 'Fortaleza, Ceará',
  'CBF': 'Cabo Frio, Rio de Janeiro',

};

const FALLBACK_LOGO = 'https://documents.sabre.com/static/images/tc/mail/icon-air.png';

function parseRuta(ruta) {
  if (!ruta) return [];
  try {
    let parsed = ruta;
    if (typeof ruta === 'string') {
      try { parsed = JSON.parse(ruta); } catch { parsed = ruta; }
    }
    if (parsed && typeof parsed === 'object' && parsed.vuelos && Array.isArray(parsed.vuelos)) {
      return parsed.vuelos.map((v) => ({
        compania: v.aerolinea || v.compania || '',
        vuelo: v.numeroVuelo || v.vuelo || '',
        fecha: v.fecha || '',
        origen: v.origen || '',
        destino: v.destino || '',
        salida: v.horaSalida || v.salida || '',
        llegada: v.horaLlegada || v.llegada || '',
        clase: v.clase || v.cabina || '',
      }));
    }
  } catch { /* ignore */ }
  const tokens = String(ruta).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
  const vuelos = [];
  for (let i = 0; i < tokens.length; i += 7) {
    if (tokens.length - i >= 7) {
      vuelos.push({
        compania: tokens[i], vuelo: tokens[i + 1], fecha: tokens[i + 2],
        origen: tokens[i + 3], destino: tokens[i + 4],
        salida: tokens[i + 5], llegada: tokens[i + 6],
      });
    }
  }
  return vuelos;
}

async function loadImgBitmap(url) {
  try {
    if (!url) return null;
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch { return null; }
}

async function segmentsToPngBlob(segments, primaryColor = '#2c4b8b') {
  const headers = ['Compañía', 'Nro Vuelo', 'Fecha', 'Origen', 'Destino', 'Salida', 'Llegada'];
  const colWidths = [220, 110, 110, 260, 260, 110, 110];
  const width = colWidths.reduce((a, b) => a + b, 0);
  const rowH = 48, headerH = 48, radius = 12, pad = 24;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const innerHeight = headerH + segments.length * rowH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round((width + pad * 2) * dpr);
  canvas.height = Math.round((innerHeight + pad * 2) * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.translate(pad, pad);

  const rr = (c, x, y, w, h, r) => {
    const rr2 = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr2, y);
    c.arcTo(x + w, y, x + w, y + h, rr2);
    c.arcTo(x + w, y + h, x, y + h, rr2);
    c.arcTo(x, y + h, x, y, rr2);
    c.arcTo(x, y, x + w, y, rr2);
    c.closePath();
  };

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.20)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  rr(ctx, 0, 0, width, innerHeight, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  rr(ctx, 0, 0, width, innerHeight, radius);
  ctx.clip();

  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px Arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  let x = 0;
  for (let i = 0; i < headers.length; i++) {
    ctx.fillText(headers[i], x + colWidths[i] / 2, headerH / 2);
    x += colWidths[i];
  }

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let r = 1; r <= segments.length; r++) {
    const y = headerH + r * rowH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  const bitmaps = await Promise.all(segments.map(async (s) => {
    const code = (s.compania || '').toUpperCase().trim();
    return await loadImgBitmap(AIRLINE_LOGOS[code] || FALLBACK_LOGO);
  }));

  ctx.fillStyle = '#111827';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';

  for (let r = 0; r < segments.length; r++) {
    const seg = segments[r];
    const yTop = headerH + r * rowH;
    let colX = 0;
    const logo = bitmaps[r];
    const midY = yTop + rowH / 2;
    const cx0 = colX + colWidths[0] / 2;
    if (logo) ctx.drawImage(logo, cx0 - 12, midY - 12, 24, 24);
    colX += colWidths[0];
    const originName = AIRPORTS[(seg.origen || '').toUpperCase().trim()] || seg.origen || '';
    const destName = AIRPORTS[(seg.destino || '').toUpperCase().trim()] || seg.destino || '';
    ctx.fillText(seg.vuelo || '', colX + colWidths[1] / 2, midY); colX += colWidths[1];
    ctx.fillText(seg.fecha || '', colX + colWidths[2] / 2, midY); colX += colWidths[2];
    ctx.fillText(originName, colX + colWidths[3] / 2, midY); colX += colWidths[3];
    ctx.fillText(destName, colX + colWidths[4] / 2, midY); colX += colWidths[4];
    ctx.fillText(seg.salida || '', colX + colWidths[5] / 2, midY); colX += colWidths[5];
    ctx.fillText(seg.llegada || '', colX + colWidths[6] / 2, midY);
  }
  ctx.restore();
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
}

export default function ItineraryTable({ ruta, segments: inputSegments, className = '', showCopyButton = true }) {
  const { config } = useWhiteLabel();
  const primaryColor = config?.colors?.primary || '#2c4b8b';

  const segments = useMemo(() => {
    if (inputSegments && inputSegments.length) return inputSegments;
    return parseRuta(ruta);
  }, [inputSegments, ruta]);

  const handleCopy = async () => {
    try {
      const pngBlob = await segmentsToPngBlob(segments, primaryColor);
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        await Swal.fire({ icon: 'success', title: 'Itinerario copiado', text: 'Podés pegarlo en WhatsApp, email, etc.', timer: 1800, showConfirmButton: false });
      } else throw new Error('not supported');
    } catch {
      await Swal.fire({ icon: 'error', title: 'No se pudo copiar', text: 'Tu navegador no soporta copiar imágenes al portapapeles.' });
    }
  };

  if (!segments || segments.length === 0) {
    return <div className={className}><div className="text-slate-400 text-sm text-center py-4">No hay datos de ruta disponibles.</div></div>;
  }

  return (
    <div className={className}>
      {showCopyButton && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:opacity-80 transition-opacity text-sm font-medium shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
            </svg>
            Copiar imagen
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl shadow-lg border border-slate-100">
        <table className="w-full bg-white text-sm">
          <thead>
            <tr style={{ backgroundColor: primaryColor }} className="text-white">
              <th className="px-4 py-3 font-semibold text-left">Compañía</th>
              <th className="px-4 py-3 font-semibold text-center">Nro Vuelo</th>
              <th className="px-4 py-3 font-semibold text-center">Fecha</th>
              <th className="px-4 py-3 font-semibold text-center">Origen</th>
              <th className="px-4 py-3 font-semibold text-center">Destino</th>
              <th className="px-4 py-3 font-semibold text-center">Salida</th>
              <th className="px-4 py-3 font-semibold text-center">Llegada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {segments.map((v, i) => {
              const code = (v.compania || '').toUpperCase().trim();
              const originName = AIRPORTS[(v.origen || '').toUpperCase().trim()] || v.origen || '';
              const destName = AIRPORTS[(v.destino || '').toUpperCase().trim()] || v.destino || '';
              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={AIRLINE_LOGOS[code] || FALLBACK_LOGO} alt={AIRLINES[code] || code} className="h-6 w-6 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }} />
                      <span className="text-slate-700 font-medium">{AIRLINES[code] || code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-800">{v.vuelo}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{v.fecha}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{originName}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{destName}</td>
                  <td className="px-4 py-3 text-center font-semibold" style={{ color: primaryColor }}>{v.salida}</td>
                  <td className="px-4 py-3 text-center font-semibold" style={{ color: primaryColor }}>{v.llegada}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
