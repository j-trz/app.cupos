import { useMemo } from 'react';
import Swal from 'sweetalert2';
import { AIRLINE_LOGOS, AIRLINES, AIRPORTS } from './ItineraryDetails.jsx';

const FALLBACK_LOGO = 'https://documents.sabre.com/static/images/tc/mail/icon-air.png';

function parseRuta(ruta) {
  if (!ruta) return [];
  const tokens = String(ruta)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  const vuelos = [];
  for (let i = 0; i < tokens.length; i += 7) {
    if (tokens.length - i >= 7) {
      vuelos.push({
        compania: tokens[i],
        vuelo: tokens[i + 1],
        fecha: tokens[i + 2],
        origen: tokens[i + 3],
        destino: tokens[i + 4],
        salida: tokens[i + 5],
        llegada: tokens[i + 6],
      });
    }
  }
  return vuelos;
}

function _toMarkdown(segments) {
  const header = ['Compañía','Nro Vuelo','Fecha','Origen','Destino','Salida','Llegada'];
  const sep = header.map(() => '---');
  const rows = segments.map(s => {
    const code = (s.compania || '').toUpperCase().trim();
    const name = AIRLINES[code] || code;
    const originName = AIRPORTS[(s.origen || '').toUpperCase().trim()] || (s.origen || '');
    const destName = AIRPORTS[(s.destino || '').toUpperCase().trim()] || (s.destino || '');
    return `| ${name} | ${s.vuelo || ''} | ${s.fecha || ''} | ${originName} | ${destName} | ${s.salida || ''} | ${s.llegada || ''} |`;
  });
  return ['| ' + header.join(' | ') + ' |', '| ' + sep.join(' | ') + ' |', ...rows].join('\n');
}

function _toHtml(segments) {
  const th = (t) => `<th style="background:#2c4b8b;color:#fff;padding:8px 12px;font-weight:600;border:1px solid #e5e7eb">${t}</th>`;
  const td = (t) => `<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${t}</td>`;
  const rows = segments.map(s => {
    const code = (s.compania || '').toUpperCase().trim();
    const name = AIRLINES[code] || code;
    const originName = AIRPORTS[(s.origen || '').toUpperCase().trim()] || (s.origen || '');
    const destName = AIRPORTS[(s.destino || '').toUpperCase().trim()] || (s.destino || '');
    const logo = AIRLINE_LOGOS[code] || FALLBACK_LOGO;
    const comp = `<div style="display:flex;align-items:center;justify-content:center;gap:6px"><img src="${logo}" alt="${name}" style="height:24px;width:24px;object-fit:contain" /> <span>${name}</span></div>`;
    return `<tr>${td(comp)}${td(s.vuelo || '')}${td(s.fecha || '')}${td(originName)}${td(destName)}${td(s.salida || '')}${td(s.llegada || '')}</tr>`;
  }).join('');
  return `<table style="border-collapse:collapse;width:100%;font-family:Arial, sans-serif;font-size:13px"><thead><tr>${['Compañía','Nro Vuelo','Fecha','Origen','Destino','Salida','Llegada'].map(th).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

/* Helpers para copiado como imagen (PNG) preservando formato/tamaño */
async function loadImageBitmap(url) {
  try {
    if (!url) return null;
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

async function segmentsToPngBlob(segments) {
  // Layout que replica el diseño visible (rounded-2xl, shadow, header azul, divide-y)
  const headers = ['Compañía','Nro Vuelo','Fecha','Origen','Destino','Salida','Llegada'];
  const colWidths = [220, 110, 110, 260, 260, 110, 110];
  const width = colWidths.reduce((a,b)=>a+b,0);
  const rowH = 48;
  const headerH = 48;
  const radius = 12; // ~ rounded-xl para coincidir con el DOM
  const pad = 24;    // margen para evitar cortar la sombra

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const innerHeight = headerH + (segments.length * rowH);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round((width + pad * 2) * dpr);
  canvas.height = Math.round((innerHeight + pad * 2) * dpr);
  canvas.style.width = (width + pad * 2) + 'px';
  canvas.style.height = (innerHeight + pad * 2) + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.translate(pad, pad);

  const roundRectPath = (c, x, y, w, h, r) => {
    const rr = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  };

  // Sombra de la tarjeta (shadow-xl)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.20)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, 0, 0, width, innerHeight, radius);
  ctx.fill();
  ctx.restore();

  // Clip a bordes redondeados
  ctx.save();
  roundRectPath(ctx, 0, 0, width, innerHeight, radius);
  ctx.clip();

  // Header azul
  ctx.fillStyle = '#2c4b8b';
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  let x = 0;
  for (let i = 0; i < headers.length; i++) {
    const cx = x + colWidths[i] / 2;
    ctx.fillText(headers[i], cx, headerH / 2);
    x += colWidths[i];
  }

  // Líneas horizontales (divide-y)
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let r = 1; r <= segments.length; r++) {
    const y = headerH + r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Pre-cargar bitmaps de logos
  const bitmaps = await Promise.all(segments.map(async (s) => {
    const code = (s.compania || '').toUpperCase().trim();
    const url = AIRLINE_LOGOS[code] || FALLBACK_LOGO;
    return await loadImageBitmap(url);
  }));

  // Filas (text-center)
  ctx.fillStyle = '#111827';
  ctx.font = '14px Arial, sans-serif';
  ctx.textAlign = 'center';

  for (let r = 0; r < segments.length; r++) {
    const seg = segments[r];
    const yTop = headerH + r * rowH;

    let colX = 0;

    // Compañía: solo logo centrado
    const logo = bitmaps[r];
    const midY = yTop + rowH / 2;
    const cx0 = colX + colWidths[0] / 2;
    const size = 24;
    if (logo) {
      ctx.drawImage(logo, cx0 - size / 2, midY - size / 2, size, size);
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(cx0, midY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
    }
    colX += colWidths[0];

    const originName = AIRPORTS[(seg.origen || '').toUpperCase().trim()] || (seg.origen || '');
    const destName = AIRPORTS[(seg.destino || '').toUpperCase().trim()] || (seg.destino || '');

    // Nro Vuelo
    ctx.fillText(seg.vuelo || '', colX + colWidths[1] / 2, midY);
    colX += colWidths[1];

    // Fecha
    ctx.fillText(seg.fecha || '', colX + colWidths[2] / 2, midY);
    colX += colWidths[2];

    // Origen
    ctx.fillText(originName, colX + colWidths[3] / 2, midY);
    colX += colWidths[3];

    // Destino
    ctx.fillText(destName, colX + colWidths[4] / 2, midY);
    colX += colWidths[4];

    // Salida
    ctx.fillText(seg.salida || '', colX + colWidths[5] / 2, midY);
    colX += colWidths[5];

    // Llegada
    ctx.fillText(seg.llegada || '', colX + colWidths[6] / 2, midY);
  }

  ctx.restore();

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
}

export default function ItineraryTable({ ruta, segments: inputSegments, className = '', showCopyButton = true }) {
  const segments = useMemo(() => {
    if (inputSegments && inputSegments.length) return inputSegments;
    return parseRuta(ruta);
  }, [inputSegments, ruta]);

  const handleCopy = async () => {
    try {
      const pngBlob = await segmentsToPngBlob(segments);

      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        await Swal.fire({
          icon: 'success',
          title: 'Itinerario copiado',
          text: 'Se copió como imagen (PNG) para pegar con formato intacto.',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        throw new Error('Clipboard image not supported');
      }
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo copiar como imagen',
        text: 'Tu navegador no soporta copiar imágenes al portapapeles.',
      });
    }
  };

  if (!segments || segments.length === 0) {
    return <div className={className || ''}><div className="text-gray-500">No hay datos de ruta disponibles.</div></div>;
  }

  return (
    <div className={className || ''}>
      {showCopyButton && (
        <div className="flex justify-end mb-6">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 bg-[#2c4b8b] text-white px-3 py-1.5 rounded hover:bg-[#1e355e] transition-colors text-sm"
            title="Copiar itinerario"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Copiar
          </button>
        </div>
      )}
      <table className="w-full bg-white border-0 rounded-xl shadow-xl">
        <thead>
          <tr className="bg-[#2c4b8b] text-white">
            <th className="px-4 py-3 text-sm font-semibold rounded-tl-2xl">Compañía</th>
            <th className="px-4 py-3 text-sm font-semibold">Nro Vuelo</th>
            <th className="px-4 py-3 text-sm font-semibold">Fecha</th>
            <th className="px-4 py-3 text-sm font-semibold">Origen</th>
            <th className="px-4 py-3 text-sm font-semibold">Destino</th>
            <th className="px-4 py-3 text-sm font-semibold">Salida</th>
            <th className="px-4 py-3 text-sm font-semibold rounded-tr-2xl">Llegada</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((v, i) => {
            const code = (v.compania || '').toUpperCase().trim();
            const originName = AIRPORTS[(v.origen || '').toUpperCase().trim()] || (v.origen || '');
            const destName = AIRPORTS[(v.destino || '').toUpperCase().trim()] || (v.destino || '');
            return (
              <tr key={i} className="last:border-b-0 transition-all duration-150" style={{ height: '48px' }}>
                <td className="px-4 py-2 text-sm text-center">
                  <div className="flex items-center justify-center">
                    <img
                      src={AIRLINE_LOGOS[code] || FALLBACK_LOGO}
                      alt={AIRLINES[code] || (v.compania || '')}
                      title={AIRLINES[code] || (v.compania || '')}
                      className="h-6 w-6 object-contain"
                      onError={(e) => { e.currentTarget.src = FALLBACK_LOGO; }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-center">{v.vuelo}</td>
                <td className="px-4 py-2 text-sm text-center">{v.fecha}</td>
                <td className="px-4 py-2 text-sm text-center">{originName}</td>
                <td className="px-4 py-2 text-sm text-center">{destName}</td>
                <td className="px-4 py-2 text-sm text-center">{v.salida}</td>
                <td className="px-4 py-2 text-sm text-center">{v.llegada}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}