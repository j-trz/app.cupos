  import { useState, useEffect } from "react";

// Diccionario de aerolíneas
const AIRLINES = {
  'AD': 'Azul Linhas Aéreas',
  'AR': 'Aerolíneas Argentinas',
  'LA': 'LATAM Airlines',
  'G3': 'Gol Linhas Aéreas',
  'JJ': 'TAM Airlines',
  'UX': 'Air Europa',
  'IB': 'Iberia',
  'KL': 'KLM Royal Dutch Airlines',
  'AF': 'Air France',
  'LH': 'Lufthansa',
  'UA': 'United Airlines',
  'AA': 'American Airlines',
  'DL': 'Delta Air Lines',
  'AV': 'Avianca',
  'CM': 'Copa Airlines',
  'P5': 'Wingo',
  'VY': 'Vueling',
  'FR': 'Ryanair',
  'U2': 'easyJet'
};

// Diccionario de imágenes de aerolíneas
const AIRLINE_LOGOS = {
  'AD': 'https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/img_airlines/ad.png',
  'AR': 'https://content.airhex.com/content/logos/airlines_AR_40.png',
  'LA': 'https://content.airhex.com/content/logos/airlines_LA_40.png',
  'G3': 'https://content.airhex.com/content/logos/airlines_G3_40.png',
  'JJ': 'https://content.airhex.com/content/logos/airlines_JJ_40.png',
  'UX': 'https://content.airhex.com/content/logos/airlines_UX_40.png',
  'IB': 'https://content.airhex.com/content/logos/airlines_IB_40.png',
  'KL': 'https://content.airhex.com/content/logos/airlines_KL_40.png',
  'AF': 'https://content.airhex.com/content/logos/airlines_AF_40.png',
  'LH': 'https://content.airhex.com/content/logos/airlines_LH_40.png',
  'UA': 'https://content.airhex.com/content/logos/airlines_UA_40.png',
  'AA': 'https://content.airhex.com/content/logos/airlines_AA_40.png',
  'DL': 'https://content.airhex.com/content/logos/airlines_DL_40.png',
  'AV': 'https://content.airhex.com/content/logos/airlines_AV_40.png',
  'CM': 'https://content.airhex.com/content/logos/airlines_CM_40.png',
  'P5': 'https://content.airhex.com/content/logos/airlines_P5_40.png',
  'VY': 'https://content.airhex.com/content/logos/airlines_VY_40.png',
  'FR': 'https://content.airhex.com/content/logos/airlines_FR_40.png',
  'U2': 'https://content.airhex.com/content/logos/airlines_U2_40.png'
};

// Diccionario de aeropuertos
const AIRPORTS = {
  'MVD': 'Montevideo, Carrasco',
  'REC': 'Recife, Guararapes',
  'FOR': 'Fortaleza, Pinto Martins',
  'NAT': 'Natal, Augusto Severo',
  'SSA': 'Salvador, Deputado Luís Eduardo Magalhães',
  'EZE': 'Buenos Aires, Ezeiza',
  'AEP': 'Buenos Aires, Jorge Newbery',
  'GRU': 'São Paulo, Guarulhos',
  'CGH': 'São Paulo, Congonhas',
  'GIG': 'Rio de Janeiro, Galeão',
  'SDU': 'Rio de Janeiro, Santos Dumont',
  'BSB': 'Brasília',
  'SCL': 'Santiago de Chile',
  'LIM': 'Lima, Jorge Chávez',
  'BOG': 'Bogotá, El Dorado',
  'UIO': 'Quito, Mariscal Sucre',
  'CCS': 'Caracas, Simón Bolívar',
  'ASU': 'Asunción, Silvio Pettirossi',
  'LPB': 'La Paz, El Alto',
  'MAD': 'Madrid, Barajas',
  'BCN': 'Barcelona, El Prat',
  'CDG': 'París, Charles de Gaulle',
  'AMS': 'Ámsterdam, Schiphol',
  'FRA': 'Frankfurt am Main',
  'MIA': 'Miami',
  'JFK': 'Nueva York, John F. Kennedy',
  'LAX': 'Los Ángeles',
  'PTY': 'Ciudad de Panamá, Tocumen'
};

// Función para formatear fecha a formato 15DEC25
const formatearFecha = (fechaStr) => {
  if (!fechaStr) return fechaStr;
  
  const meses = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  // Si ya está en formato correcto, devolverla
  if (/^\d{1,2}[A-Z]{3}\d{2}$/.test(fechaStr)) return fechaStr;
  
  try {
    let fecha;
    
    // Detectar formato dd/mm/aaaa o dd/mm/aa
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        const [dia, mes] = partes;
        let año = partes[2];
        
        // Convertir año de 2 dígitos a 4 dígitos si es necesario
        if (año.length === 2) {
          const añoNum = parseInt(año);
          // Si es menor a 50, asumimos que es 20xx, sino 19xx
          año = añoNum < 50 ? `20${año}` : `19${año}`;
        }
        
        // Crear fecha en formato ISO (aaaa-mm-dd)
        fecha = new Date(`${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
      } else {
        fecha = new Date(fechaStr);
      }
    } else {
      fecha = new Date(fechaStr);
    }
    
    // Verificar que la fecha sea válida
    if (isNaN(fecha.getTime())) {
      return fechaStr;
    }
    
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear().toString().slice(-2);
    return `${dia}${mes}${año}`;
  } catch {
    return fechaStr; // Si falla el parseo, devolver original
  }
};

// Función para manejar impresión/PDF
const handlePrint = () => {
  // Crear una nueva ventana para imprimir solo el contenido del itinerario
  const printWindow = window.open('', '_blank');
  const itineraryContent = document.querySelector('.itinerary-content').innerHTML;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Itinerario de Vuelo</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: 'Montserrat', sans-serif;
          margin: 0;
          padding: 0;
          background: white;
          font-size: 12px;
          line-height: 1.4;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          margin-bottom: 20px;
          background: #2c4b8b;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .company-info {
          text-align: left;
        }
        .company-name {
          font-weight: 700;
          color: white;
          font-size: 14px;
        }
        .company-details {
          color: rgba(255,255,255,0.9);
          font-size: 12px;
        }
        .title-section {
          text-align: right;
        }
        .title {
          margin: 0;
          font-size: 24px;
          color: white;
          font-weight: bold;
        }
        .divider {
          background: #2c4b8b;
          height: 4px;
          margin: 20px 0;
        }
        .passenger-section {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          margin: 20px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #2c4b8b;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .passenger-info, .confirmation-info {
          color: #686868;
          font-size: 12px;
        }
        .confirmation-info {
          text-align: right;
        }
        .confirmation-number {
          font-weight: 700;
          font-size: 14px;
        }
        .separator {
          margin: 16px 0;
          border: none;
          border-top: 1px solid #ccc;
        }
        .flight-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 20px;
          margin-bottom: 16px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #2c4b8b;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .flight-icon {
          width: 50px;
          height: 50px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        .flight-icon img {
          max-width: 40px;
          max-height: 40px;
          object-fit: contain;
        }
        .flight-details {
          flex: 1;
        }
        .flight-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }
        .airline-name {
          text-transform: camelcase;
          color: #686868;
          font-size: 16px;
          font-weight: 700;
        }
        .flight-number {
          color: #686868;
          font-size: 12px;
        }
        .flight-code {
          color: #2E6BA4;
          font-weight: bold;
        }
        .flight-date {
          text-align: right;
          color: #686868;
          font-size: 12px;
        }
        .flight-info {
          display: flex;
          gap: 24px;
        }
        .location-info {
          width: 30%;
        }
        .location-label {
          color: #686868;
          font-weight: 700;
          font-size: 11px;
        }
        .location-name {
          color: #2E6BA4;
          text-transform: camelcase;
          font-size: 12px;
          font-weight: 600;
        }
        .location-time {
          color: #2E6BA4;
          font-size: 11px;
        }
        .cabin-info {
          flex: 1;
          color: #686868;
          font-size: 11px;
        }
        .flights-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #2c4b8b;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .flights-section h3 {
          margin: 0 0 16px 0;
          color: #323C46;
          font-size: 16px;
          font-weight: bold;
        }
        .footer-section {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #2c4b8b;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .footer-title {
          font-size: 14px;
          font-weight: bold;
          color: #2c4b8b;
          margin-bottom: 10px;
        }
        .footer-content {
          font-size: 11px;
          line-height: 1.5;
          color: #686868;
        }
      </style>
    </head>
    <body>
      ${itineraryContent}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Esperar a que cargue y luego imprimir
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

export default function ItineraryDetails({ itineraryData = null }) {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si se pasan datos directamente como prop, usarlos
    if (itineraryData) {
      setItinerary(itineraryData);
      setLoading(false);
      return;
    }

    const fetchItinerary = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/itinerary");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItinerary(data);
      } catch (err) {
        console.error("Error fetching itinerary:", err);
        setError(err.message || "Error fetching itinerary");
      } finally {
        setLoading(false);
      }
    };

  fetchItinerary();
}, [itineraryData]);

if (loading) return <div>Loading itinerary...</div>;
if (error) return <div style={{ color: "#c00" }}>Error: {error}</div>;

const { localizadorReserva = "-", detallesViajero = [], vuelos = [] } = itinerary || {};

return (
  <div>
    <style>{`
      /* Estilos para que la previsualización coincida con la impresión */
      .itinerary-content {
        font-family: 'Montserrat', sans-serif;
        background: white;
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
        font-size: 12px;
        line-height: 1.4;
        
      }
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        margin-bottom: 20px;
        background: #2c4b8b;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }
      .logo-section {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .company-info {
        text-align: left;
      }
      .company-name {
        font-weight: 700;
        color: white;
        font-size: 14px;
      }
      .company-details {
        color: rgba(255,255,255,0.9);
        font-size: 12px;
      }
      .title-section {
        text-align: right;
      }
      .title {
        margin: 0;
        font-size: 24px;
        color: white;
        font-weight: bold;
      }
      .divider {
        background: #2c4b8b;
        height: 4px;
        margin: 20px 0;
      }
      .passenger-section {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        margin: 20px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #2c4b8b;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .passenger-info, .confirmation-info {
        color: #686868;
        font-size: 12px;
      }
      .confirmation-info {
        text-align: right;
      }
      .confirmation-number {
        font-weight: 700;
        font-size: 14px;
      }
      .separator {
        margin: 16px 0;
        border: none;
        border-top: 1px solid #ccc;
      }
      .flight-item {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 20px;
        margin-bottom: 16px;
        background: white;
        border-radius: 8px;
        border-left: 4px solid #2c4b8b;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .flight-icon {
        width: 50px;
        height: 50px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      .flight-icon img {
        max-width: 40px;
        max-height: 40px;
        object-fit: contain;
      }
      .flight-details {
        flex: 1;
        
      }
      .flight-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #eee;
      }
      .airline-name {
        text-transform: camelcase;
        color: #686868;
        font-size: 16px;
        font-weight: 700;
      }
      .flight-number {
        color: #686868;
        font-size: 12px;
      }
      .flight-code {
        color: #2c4b8b;
        font-weight: bold;
      }
      .flight-date {
        text-align: right;
        color: #686868;
        font-size: 12px;
      }
      .flight-info {
        display: flex;
        gap: 24px;
      }
      .location-info {
        width: 30%;
      }
      .location-label {
        color: #686868;
        font-weight: 700;
        font-size: 11px;
      }
      .location-name {
        color: #2c4b8b;
        text-transform: camelcase;
        font-size: 12px;
        font-weight: 600;
      }
      .location-time {
        color: #2c4b8b;
        font-size: 11px;
      }
      .cabin-info {
        flex: 1;
        color: #686868;
        font-size: 11px;
      }
      
      .flights-section {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        border-left: 4px solid #2c4b8b;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .flights-section h3 {
        margin: 0 0 16px 0;
        color: #323C46;
        font-size: 16px;
        font-weight: bold;
      }
      
      .footer-section {
        margin-top: 30px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #2c4b8b;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .footer-title {
        font-size: 14px;
        font-weight: bold;
        color: #2c4b8b;
        margin-bottom: 10px;
      }
      
      .footer-content {
        font-size: 11px;
        line-height: 1.5;
        color: #686868;
      }
      
      @media print {
        .no-print {
          display: none !important;
        }
      }
    `}</style>
    
    <div className="print-container">
      <div>
        <div>
          <span className="ms-Button-flexContainer flexContainer-159 no-print" data-automationid="splitbuttonprimary" />
        </div>

        <div style={{ width: "100%", background: "white" }}>
          {/* Botón de impresión/PDF */}
          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px", borderBottom: "1px solid #eee" }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: "#2c4b8b",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#1e355e"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#2c4b8b"}
            >
              🖨️ Imprimir / Descargar PDF
            </button>
          </div>

          {/* Contenido del itinerario que se imprimirá */}
          <div className="itinerary-content">
            <div className="header-section">
              <div className="logo-section">
                <img width={180} src="https://hdsmvuwrdwfivujjnubr.supabase.co/storage/v1/object/public/media/logojetmar-png%20(2).png" alt="Logo" />
                <div className="company-info">
                  <div className="company-name">Jetmar Viajes</div>
                  <div className="company-details">Gral. Santander 1970</div>
                  <div className="company-details">598 2 1793</div>
                </div>
              </div>

              <div className="title-section">
                <h2 className="title">Itinerario</h2>
              </div>
            </div>

            {/*<div className="divider"></div>*/}

            <div className="passenger-section">
              <div className="passenger-info">
                <div style={{color: "#2c4b8b"}}><strong>Pasajero:</strong></div>
                <div>
                  {detallesViajero.length > 0 ? (
                    detallesViajero.map((v, idx) => (
                      <div key={idx}>
                        {v.nombre} {v.apellido}
                      </div>
                    ))
                  ) : (
                    <div>-</div>
                  )}
                </div>
              </div>

              <div className="confirmation-info">
                <div style={{color: "#2c4b8b", fontWeight: "bold"}}>Confirmación:</div>
                <div className="confirmation-number">{localizadorReserva}</div>
              </div>
            </div>

            {/* <hr className="separator" /> */}

            <div className="flights-section">
              <h3 style={{color: "#2c4b8b"}}>Detalles de vuelos</h3>
              {vuelos.length === 0 && <div style={{ color: "#2c4b8b" }}>No hay vuelos para mostrar.</div>}

              {vuelos.map((vuelo, i) => (
                <div key={i} className="flight-item">
                  <div className="flight-icon">
                    <img 
                      src={AIRLINE_LOGOS[vuelo.aerolinea] || "https://documents.sabre.com/static/images/tc/mail/icon-air.png"} 
                      alt={AIRLINES[vuelo.aerolinea] || vuelo.aerolinea} 
                      width={40} 
                      height={40}
                      style={{ borderRadius: '4px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.src = "https://documents.sabre.com/static/images/tc/mail/icon-air.png";
                      }}
                    />
                  </div>
                  <div className="flight-details">
                    <div className="flight-header">
                      <div>
                        <div className="airline-name">
                          {AIRLINES[vuelo.aerolinea] || vuelo.aerolinea}
                        </div>
                        <div className="flight-number">
                          N° de vuelo: <span className="flight-code">{vuelo.aerolinea}{vuelo.numeroVuelo}</span>
                        </div>
                      </div>
                      <div className="flight-date">
                        {formatearFecha(vuelo.fecha)}
                      </div>
                    </div>

                    <div className="flight-info">
                      <div className="location-info">
                        <div className="location-label">Salida:</div>
                        <div className="location-name">
                          {AIRPORTS[vuelo.origen] || vuelo.origen}
                        </div>
                        <div className="location-time">{vuelo.horaSalida}hs.</div>
                      </div>
                      <div className="location-info">
                        <div className="location-label">Llegada:</div>
                        <div className="location-name">
                          {AIRPORTS[vuelo.destino] || vuelo.destino}
                        </div>
                        <div className="location-time">{vuelo.horaLlegada}hs.</div>
                      </div>
                      <div className="cabin-info">
                        <div>Cabina: <strong>{vuelo.clase}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer con información general */}
            <div className="footer-section">
              <div className="footer-title">Información general</div>
              <div className="footer-content">
                Estimado cliente, te deseamos un muy buen viaje!<br />
                Favor verifica la documentación con la cual estarás viajando<br />
                (Visas y vacunas en caso de ser necesarias).<br />
                No olvides solicitarle a tu asesor que ingrese tu número<br />
                de viajero frecuente en la reserva.<br />
                Te aconsejamos hacer el web check-in.<br />
                No olvides pedir la factura a tu asesor.<br />
                Estamos a las órdenes<br />
                <strong>¡Gracias por elegirnos!</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>);
}