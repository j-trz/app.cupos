import { useState, useEffect } from "react";
import { formatearFecha, calcularFechaSiguiente } from "../utils/dateUtils";

export const AIRLINES = {};
export const AIRLINE_LOGOS = {};
export const AIRPORTS = {};

// ─── Intenta leer useWhiteLabel si estamos en el contexto del frontend ─────────
function useBrandFromWhiteLabel() {
  try {
    // eslint-disable-next-line
    const mod = require("../contexts/WhiteLabelContext");
    // eslint-disable-next-line
    const { config } = mod.useWhiteLabel();
    return config || null;
  } catch {
    return null;
  }
}

export default function ItineraryDetails({ itineraryData = null, brand: brandProp = null }) {
  // Intentar leer de WhiteLabel (solo funciona cuando está en el árbol de React del frontend)
  let wlConfig = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useWhiteLabel } = require("../contexts/WhiteLabelContext");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useWhiteLabel();
    wlConfig = ctx?.config || null;
  } catch {
    // Modo extensión de Chrome: sin contexto React, se ignora
  }

  const id = wlConfig?.identity || {};
  const colors = wlConfig?.colors || {};

  const brand = {
    name:           brandProp?.name     || id.agency_name       || "Agencia de Viajes",
    email:          brandProp?.email    || id.contact_email      || "",
    phone:          brandProp?.phone    || id.phone              || "",
    address:        brandProp?.address  || id.address            || "",
    logo:           brandProp?.logo     || id.logoUrl            || "",
    slogan:         brandProp?.slogan   || id.slogan             || "",
    showLogo:       id.pdf_show_logo !== false,
    footerMessage:  brandProp?.footerMessage || id.pdf_footer_message ||
      "¡Estimado pasajero, le deseamos un muy buen viaje! Verificá los requisitos de documentación (visas y vacunas) antes de partir. No olvides hacer el web check-in con anticipación.",
    primary:        brandProp?.primary  || colors.primary        || "#2c4b8b",
    textColor:      "#ffffff",
  };

  const primary = brand.primary;

  const [itinerary, setItinerary]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [dictReady, setDictReady]   = useState(false);
  const dataModRef                  = { mod: null };

  // ─── Helpers de diccionario ───────────────────────────────────────────────
  const getAirlineNameSafe = (code) => {
    const c = String(code || "").slice(0, 2).toUpperCase();
    let val = AIRLINES[c];
    if (val && typeof val === "object" && val.name) return val.name;
    if (typeof val === "string") return val;
    return c;
  };

  const getAirlineLogoSafe = (code) => {
    const c = String(code || "").slice(0, 2).toUpperCase();
    let logo = null;
    try { logo = dataModRef.mod?.getAirlineLogo ? dataModRef.mod.getAirlineLogo(c) : null; } catch { }
    logo = logo || AIRLINE_LOGOS[c] || "";
    if (!logo) {
      return (typeof chrome !== "undefined" && chrome?.runtime?.getURL?.("img/avion-despegando.png"))
        || "https://documents.sabre.com/static/images/tc/mail/icon-air.png";
    }
    if (typeof chrome !== "undefined" && chrome?.runtime?.getURL && !/^https?:|^chrome-extension:/.test(logo)) {
      return chrome.runtime.getURL(logo.replace(/^\/+/, ""));
    }
    if (/^(img|assets)\//.test(logo) && typeof window !== "undefined") {
      return `${window.location.origin}/src/${logo.replace(/^\/+/, "")}`;
    }
    return logo;
  };

  const getAirportNameSafe = (code) => {
    const c = String(code || "").slice(0, 3).toUpperCase();
    let val = AIRPORTS[c];
    if (val && typeof val === "object" && val.name) return val.name;
    if (typeof val === "string") return val;
    return c;
  };

  // ─── Cargar diccionarios ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        let mod;
        try { mod = await import("../lib/data/index"); } catch { mod = await import("../lib/data/index.js"); }
        dataModRef.mod = mod;
        if (mod?.ensureData) {
          const { AIRPORTS: APT, AIRLINES: ALN, AIRLINE_LOGOS: LOGOS } = await mod.ensureData();
          Object.assign(AIRPORTS, APT || {});
          Object.assign(AIRLINES, ALN || {});
          Object.assign(AIRLINE_LOGOS, LOGOS || {});
        }
      } catch (err) {
        console.log("[ItineraryDetails] ensureData failed:", err);
      } finally {
        setDictReady(true);
      }
    })();
  }, []);

  // ─── Generar HTML de impresión ────────────────────────────────────────────
  const handlePrint = () => {
    const container = document.querySelector(".itinerary-content");
    if (!container) return;
    const htmlContent = container.innerHTML;
    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"><title>Itinerario - ${brand.name}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
      <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family:'Inter',sans-serif; background:white; color:#1e293b; font-size:12px; line-height:1.5;
               -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; }
        ${getCSSStyles(primary)}
        @media print { .no-print { display:none!important; } }
      </style>
    </head><body><div class="itinerary-content">${htmlContent}</div></body></html>`;

    let w = null;
    try { w = window.open("", "_blank", "noopener,noreferrer,width=980,height=800"); } catch { }
    if (!w || !w.document) {
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener,noreferrer,width=980,height=800");
      return;
    }
    w.document.write(html);
    w.document.close();
    try { w.focus(); } catch { }
  };

  // ─── Cargar datos del itinerario ──────────────────────────────────────────
  useEffect(() => {
    if (itineraryData && typeof itineraryData === "object") {
      setItinerary({
        localizadorReserva: itineraryData.localizadorReserva || "-",
        detallesViajero: Array.isArray(itineraryData.detallesViajero) ? itineraryData.detallesViajero : [],
        vuelos: Array.isArray(itineraryData.vuelos) ? itineraryData.vuelos : [],
        asientos: Array.isArray(itineraryData.asientos) ? itineraryData.asientos : []
      });
      setLoading(false);
      return;
    }

    try {
      const hash = window.location?.hash || "";
      const qIndex = hash.indexOf("?data=");
      if (qIndex !== -1) {
        const raw = hash.substring(qIndex + 6);
        let decoded = null;
        try { decoded = JSON.parse(atob(decodeURIComponent(raw))); } catch { }
        if (decoded && typeof decoded === "object") {
          setItinerary({
            localizadorReserva: decoded.localizadorReserva || "-",
            detallesViajero: Array.isArray(decoded.detallesViajero) ? decoded.detallesViajero : [],
            vuelos: Array.isArray(decoded.vuelos) ? decoded.vuelos : [],
            asientos: Array.isArray(decoded.asientos) ? decoded.asientos : []
          });
          setLoading(false);
          return;
        }
      }
    } catch { }

    (async () => {
      try {
        let payload = null;
        if (typeof chrome !== "undefined" && chrome?.storage?.session) {
          payload = await new Promise((resolve) => {
            chrome.storage.session.get(["itineraryData"], (res) => resolve(res?.itineraryData || null));
          });
        }
        if (!payload && typeof chrome !== "undefined" && chrome?.storage?.local) {
          payload = await new Promise((resolve) => {
            chrome.storage.local.get(["itineraryData"], (res) => resolve(res?.itineraryData || null));
          });
        }
        if (!payload) {
          const raw = sessionStorage.getItem("itineraryData");
          if (raw) { try { payload = JSON.parse(raw); } catch { } }
        }
        const data = payload?.itineraryData || payload || null;
        if (data && typeof data === "object") {
          setItinerary({
            localizadorReserva: data.localizadorReserva || "-",
            detallesViajero: Array.isArray(data.detallesViajero) ? data.detallesViajero : [],
            vuelos: Array.isArray(data.vuelos) ? data.vuelos : [],
            asientos: Array.isArray(data.asientos) ? data.asientos : []
          });
          setLoading(false);
          return;
        }
      } catch {
        setError("No fue posible recuperar datos del itinerario");
      }
      setItinerary({ localizadorReserva: "-", detallesViajero: [], vuelos: [], asientos: [] });
      setLoading(false);
    })();
  }, [itineraryData]);

  if (loading || !dictReady) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, fontFamily:'Inter,sans-serif', color:'#64748b' }}>
      Cargando itinerario...
    </div>
  );
  if (error) return <div style={{ color:"#c00", padding:16 }}>Error: {error}</div>;

  const { localizadorReserva = "-", detallesViajero = [], vuelos = [], asientos = [] } = itinerary || {};

  const limpiarTipoPasajero = (nombre) =>
    (nombre || '').replace(/\s*\(PFA\)|\s*\(ADT\)|\s*\(PFA\(ADT\)\)|\s*\(INF\)|\s*\(CNN\)|\s*\(CHD\)/g, '').trim();

  const getStatusBadgeColors = (estado) => {
    const colores = {
      'Confirmado': { bg:'#dcfce7', text:'#166534' }, 'Reservado':  { bg:'#dbeafe', text:'#1e40af' },
      'Devuelto':   { bg:'#fef3c7', text:'#92400e' }, 'Cancelado':  { bg:'#fee2e2', text:'#991b1b' },
      'Remitido':   { bg:'#e0e7ff', text:'#3730a3' }, 'Pendiente':  { bg:'#f3f4f6', text:'#374151' },
    };
    return colores[estado] || { bg:'#f3f4f6', text:'#374151' };
  };

  const horaAMinutos = (hora) => {
    if (!hora) return null;
    const s = String(hora).replace(/[hH]/, ':').trim();
    const m = s.match(/^(\d{1,2}):?(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  const resolverFechaLlegada = (vuelo) => {
    if (vuelo.fechaLlegada && vuelo.fechaLlegada !== vuelo.fecha) return { fecha:vuelo.fechaLlegada, esSiguienteDia:true };
    if (vuelo.llegaSiguienteDia) return { fecha:calcularFechaSiguiente(vuelo.fecha), esSiguienteDia:true };
    const ms = horaAMinutos(vuelo.horaSalida);
    const ml = horaAMinutos(vuelo.horaLlegada);
    if (ms !== null && ml !== null && ml < ms) return { fecha:calcularFechaSiguiente(vuelo.fecha), esSiguienteDia:true };
    return { fecha:vuelo.fechaLlegada || vuelo.fecha, esSiguienteDia:false };
  };

  const estadoGeneral = vuelos.length > 0 ? (vuelos[0].estado || 'Reservado') : 'Reservado';

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="itinerary-content" style={{ fontFamily:"'Inter',sans-serif", maxWidth:900, margin:'0 auto', padding:'24px 16px', background:'white', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; font-family:'Material Symbols Outlined'; }
        ${getCSSStyles(primary)}
      `}</style>

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="itin-header">
        <div className="itin-header-left">
          {brand.showLogo && brand.logo ? (
            <img src={brand.logo} alt={brand.name} className="itin-logo"
              onError={(e) => { e.currentTarget.style.display='none'; }} />
          ) : (
            <div style={{ width:48, height:48, background:'rgba(255,255,255,0.2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>✈️</div>
          )}
          <div className="itin-agency-info">
            <div className="itin-agency-name">{brand.name}</div>
            {brand.email   && <div className="itin-agency-sub">{brand.email}</div>}
            {brand.phone   && <div className="itin-agency-sub">{brand.phone}</div>}
            {brand.slogan  && <div className="itin-agency-sub" style={{ fontStyle:'italic', opacity:.75 }}>{brand.slogan}</div>}
          </div>
        </div>
        <div className="itin-reservation-badge">
          <div className="itin-reservation-label">Itinerario de Vuelo</div>
          <div className="itin-reservation-sub">Nro de Reserva</div>
          <div className="itin-reservation-code">{localizadorReserva}</div>
        </div>
      </div>

      {/* ── PASAJEROS ───────────────────────────────── */}
      {detallesViajero.length > 0 && (
        <div className="itin-section">
          <div className="itin-section-title">
            <span className="material-symbols-outlined" style={{ fontSize:18, verticalAlign:'middle', marginRight:6 }}>group</span>
            Pasajeros
          </div>
          <div className="itin-pax-grid">
            {detallesViajero.map((v, i) => (
              <div key={i} className="itin-pax-card">
                <div className="itin-pax-name">{v.nombre} {v.apellido}</div>
                {v.billeteElectronico && <div className="itin-pax-detail">Ticket: <strong>{v.billeteElectronico}</strong></div>}
                {v.tipoPasajero       && <div className="itin-pax-detail">{v.tipoPasajero}</div>}
                {v.documento          && <div className="itin-pax-detail">Doc: {v.documento}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VUELOS ──────────────────────────────────── */}
      {vuelos.length > 0 && (
        <div className="itin-section">
          <div className="itin-section-title">
            <span className="material-symbols-outlined" style={{ fontSize:18, verticalAlign:'middle', marginRight:6 }}>flight</span>
            Segmentos de Vuelo
          </div>

          {vuelos.map((vuelo, i) => {
            const totalVuelos = vuelos.length;
            const logoUrl = getAirlineLogoSafe(vuelo.aerolinea);
            const badgeColors = getStatusBadgeColors(vuelo.estado || estadoGeneral);
            const origenDisplay  = getAirportNameSafe(vuelo.origen);
            const destinoDisplay = getAirportNameSafe(vuelo.destino);
            const { fecha:fechaLlegada, esSiguienteDia } = resolverFechaLlegada(vuelo);
            const equipaje = vuelo?.equipaje || {};
            const baggageItems = [
              { key:"personalItem", label:"Art. personal",     iconOn:"personal_bag",       iconOff:"personal_bag_off",       included:Boolean(equipaje.personalItem) },
              { key:"carryOn",      label:"Equipaje de mano",  iconOn:"carry_on_bag",        iconOff:"carry_on_bag_inactive",  included:Boolean(equipaje.carryOn) },
              { key:"checkedBag",   label:"Bodega",            iconOn:"luggage",             iconOff:"no_luggage",             included:Boolean(equipaje.checkedBag) },
            ];
            const segmentoAsientos = Array.isArray(asientos)
              ? (asientos.find(a => Number(a.segmento) === Number(i))?.asientos || [])
              : [];

            // Conexión / open jaw
            let connectionEl = null;
            if (i < totalVuelos - 1) {
              const sig = vuelos[i + 1];
              const gc = (str) => (str || '').split('-')[0].trim();
              if (gc(vuelo.destino) === gc(sig.origen)) {
                if (gc(sig.destino) !== gc(vuelo.origen)) {
                  connectionEl = (
                    <div className="itin-connection">
                      <span className="material-symbols-outlined" style={{ fontSize:16, color:'#64748b', marginRight:6 }}>schedule</span>
                      Cambio de avión en <strong style={{ marginLeft:4 }}>{getAirportNameSafe(vuelo.destino)}</strong>
                    </div>
                  );
                }
              } else {
                connectionEl = (
                  <div className="itin-connection" style={{ borderColor:'#fdba74', background:'#fff7ed', color:'#c2410c' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16, marginRight:6 }}>transfer_within_a_station</span>
                    Tramo terrestre: {getAirportNameSafe(vuelo.destino)} → {getAirportNameSafe(sig.origen)}
                  </div>
                );
              }
            }

            return (
              <div key={i}>
                <div className="itin-flight-card">
                  {/* Logo aerolínea */}
                  <div className="itin-flight-logo-col">
                    <img src={logoUrl} alt={vuelo.aerolinea} className="itin-airline-logo"
                      onError={(e) => { e.currentTarget.style.display='none'; }} />
                  </div>

                  <div className="itin-flight-body">
                    {/* Aerolínea + número + estado */}
                    <div className="itin-flight-top">
                      <div>
                        <div className="itin-airline-name">{getAirlineNameSafe(vuelo.aerolinea)}</div>
                        <div className="itin-flight-num">
                          Vuelo <span style={{ color:primary, fontWeight:700 }}>{vuelo.aerolinea}{vuelo.numeroVuelo}</span>
                          {vuelo.clase && <> · {vuelo.clase}</>}
                          {vuelo.aeronave && String(vuelo.aeronave).trim() && <> · {vuelo.aeronave}</>}
                        </div>
                      </div>
                      <span className="itin-badge" style={{ background:badgeColors.bg, color:badgeColors.text }}>
                        {vuelo.estado || estadoGeneral}
                      </span>
                    </div>

                    {/* Ruta */}
                    <div className="itin-route-grid">
                      <div>
                        <div className="itin-route-label">Salida</div>
                        <div className="itin-route-airport" style={{ color:primary }}>{vuelo.origen}</div>
                        {origenDisplay !== vuelo.origen && <div className="itin-route-city">{origenDisplay}</div>}
                        <div className="itin-route-time">{formatearFecha(vuelo.fecha)}</div>
                        <div className="itin-route-time" style={{ fontWeight:700, fontSize:15 }}>{vuelo.horaSalida}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                        <span style={{ color:primary, fontSize:22 }}>✈</span>
                        {vuelo.duracion && <div style={{ fontSize:10, color:'#94a3b8', textAlign:'center' }}>{vuelo.duracion}</div>}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div className="itin-route-label">Llegada{esSiguienteDia ? ' (+1)' : ''}</div>
                        <div className="itin-route-airport" style={{ color:primary }}>{vuelo.destino}</div>
                        {destinoDisplay !== vuelo.destino && <div className="itin-route-city">{destinoDisplay}</div>}
                        <div className="itin-route-time">{formatearFecha(fechaLlegada)}</div>
                        <div className="itin-route-time" style={{ fontWeight:700, fontSize:15 }}>{vuelo.horaLlegada}</div>
                      </div>
                    </div>

                    {/* Equipaje */}
                    <div className="itin-baggage">
                      <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                        Franquicia de equipaje
                      </div>
                      <div className="itin-baggage-grid">
                        {baggageItems.map((item) => (
                          <div key={item.key} className={`itin-baggage-item ${item.included ? 'baggage-ok' : 'baggage-no'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize:18 }}>
                              {item.included ? item.iconOn : item.iconOff}
                            </span>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Asientos */}
                    {segmentoAsientos.length > 0 && (
                      <div className="itin-seats">
                        {segmentoAsientos.map((a, idx) => (
                          <div key={idx} className="itin-seat-row">
                            <span className="itin-seat-name">{limpiarTipoPasajero(a.pasajero || a.nombrePasajero)}</span>
                            <span className="itin-seat-num">
                              <span className="material-symbols-outlined" style={{ fontSize:14, verticalAlign:'middle', color:'#64748b' }}>airline_seat_recline_extra</span>
                              {' '}{a.asiento || a.numeroAsiento || 'Sin asignar'}
                            </span>
                          </div>
                        ))}
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

      {/* ── FOOTER ──────────────────────────────────── */}
      <div className="itin-footer">
        <div className="itin-footer-title">Información general</div>
        <div className="itin-footer-body">{brand.footerMessage}</div>
        <div className="itin-footer-agency">
          {brand.name}
          {brand.address && <> · {brand.address}</>}
          {brand.phone   && <> · Tel: {brand.phone}</>}
          {brand.email   && <> · {brand.email}</>}
        </div>
      </div>

      {/* ── BOTÓN IMPRIMIR (sin imprimir) ───────────── */}
      <div className="no-print" style={{ position:'fixed', bottom:20, right:20 }}>
        <button onClick={handlePrint}
          style={{ background:primary, color:'#fff', border:'none', borderRadius:12, padding:'10px 20px',
            display:'flex', alignItems:'center', gap:8, fontFamily:'Inter,sans-serif', fontWeight:600,
            fontSize:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(0,0,0,0.18)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:18 }}>print</span>
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
}

// ─── Estilos CSS del itinerario (también usados en la ventana de impresión) ───
function getCSSStyles(primary) {
  return `
    .itin-header {
      display:flex; justify-content:space-between; align-items:center;
      background:${primary}; color:#fff; padding:20px 24px; border-radius:12px;
      margin-bottom:20px; gap:16px; flex-wrap:wrap;
    }
    .itin-header-left { display:flex; align-items:center; gap:14px; flex:1; min-width:0; }
    .itin-logo { height:50px; width:auto; object-fit:contain; border-radius:8px; background:rgba(255,255,255,0.15); padding:4px; }
    .itin-agency-info { flex:1; min-width:0; }
    .itin-agency-name { font-size:17px; font-weight:700; line-height:1.2; }
    .itin-agency-sub  { font-size:11px; opacity:.82; margin-top:2px; }
    .itin-reservation-badge { text-align:right; flex-shrink:0; background:rgba(255,255,255,0.15); border-radius:10px; padding:10px 18px; }
    .itin-reservation-label { font-size:11px; opacity:.75; letter-spacing:.03em; }
    .itin-reservation-sub   { font-size:10px; opacity:.65; margin-top:2px; }
    .itin-reservation-code  { font-size:22px; font-weight:800; letter-spacing:.08em; margin-top:2px; }

    .itin-section       { margin-bottom:18px; background:#f8fafc; border-left:4px solid ${primary}; border-radius:10px; padding:16px 18px; }
    .itin-section-title { font-size:13px; font-weight:700; color:${primary}; margin-bottom:14px; display:flex; align-items:center; }

    .itin-pax-grid  { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .itin-pax-card  { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; }
    .itin-pax-name  { font-weight:700; font-size:13px; color:#0f172a; }
    .itin-pax-detail{ font-size:11px; color:#64748b; margin-top:3px; }

    .itin-flight-card     { background:#fff; border-radius:10px; padding:16px; margin-bottom:12px; border:1px solid #e2e8f0; display:flex; gap:14px; align-items:flex-start; }
    .itin-flight-logo-col { flex-shrink:0; }
    .itin-airline-logo    { width:44px; height:44px; object-fit:contain; border-radius:8px; border:1px solid #f1f5f9; display:block; }
    .itin-flight-body     { flex:1; min-width:0; }
    .itin-flight-top      { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #f1f5f9; gap:8px; }
    .itin-airline-name    { font-size:15px; font-weight:700; color:#1e293b; }
    .itin-flight-num      { font-size:11px; color:#64748b; margin-top:2px; }
    .itin-badge           { display:inline-flex; align-items:center; padding:3px 10px; border-radius:9999px; font-size:11px; font-weight:600; flex-shrink:0; }

    .itin-route-grid    { display:grid; grid-template-columns:1fr 44px 1fr; gap:10px; align-items:center; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #f1f5f9; }
    .itin-route-label   { font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
    .itin-route-airport { font-size:20px; font-weight:800; letter-spacing:.04em; }
    .itin-route-city    { font-size:10px; color:#94a3b8; margin-top:1px; margin-bottom:4px; }
    .itin-route-time    { font-size:11px; color:#64748b; }

    .itin-baggage       { margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed #e2e8f0; }
    .itin-baggage-grid  { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
    .itin-baggage-item  { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:500; }
    .baggage-ok         { color:#15803d; }
    .baggage-no         { color:#94a3b8; text-decoration:line-through; text-decoration-thickness:2px; }

    .itin-seats    { }
    .itin-seat-row { display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9; font-size:11px; }
    .itin-seat-name{ font-weight:600; color:#0f172a; }
    .itin-seat-num { color:#64748b; }

    .itin-connection { display:flex; align-items:center; padding:8px 14px; background:#f1f5f9; border:1px dashed #cbd5e1; border-radius:8px; font-size:12px; font-weight:500; color:#475569; margin-bottom:12px; }

    .itin-footer        { margin-top:24px; background:#f8fafc; border-left:4px solid ${primary}; border-radius:10px; padding:16px 18px; }
    .itin-footer-title  { font-size:13px; font-weight:700; color:${primary}; margin-bottom:8px; }
    .itin-footer-body   { font-size:11px; color:#475569; line-height:1.7; margin-bottom:10px; }
    .itin-footer-agency { font-size:11px; color:#94a3b8; font-weight:500; padding-top:8px; border-top:1px solid #e2e8f0; }

    @media (max-width:600px) {
      .itin-pax-grid, .itin-route-grid { grid-template-columns:1fr; }
      .itin-baggage-grid { grid-template-columns:1fr 1fr; }
      .itin-flight-top { flex-direction:column; }
    }
    @media print {
      .no-print { display:none!important; }
      .itin-flight-card { box-shadow:none; border:1px solid #ccc; }
    }
  `;
}
