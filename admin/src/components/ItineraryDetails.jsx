  import { useState, useEffect } from "react";

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
                <div style={{ textAlign: "center" }}>
                  <div>
                    <div>
                      <span className="ms-Button-flexContainer flexContainer-159" data-automationid="splitbuttonprimary" />
                    </div>

                    <div style={{ width: "100%", background: "white", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <img width={180} src="https://jetmar.com.uy/assets/jetmar-logo.svg" alt="Logo" />
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 700, color: "#686868" }}>Jetmar Viajes</div>
                            <div style={{ color: "#686868" }}>Gral. Santander 1970</div>
                            <div style={{ color: "#686868" }}>598 2 1793</div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <h2 style={{ margin: 0, fontSize: 30, color: "#323C46" }}>Itinerario</h2>
                        </div>
                      </div>

                      <div style={{ background: "#323C46", height: 6 }} />

                      <div style={{ padding: 16 }}>
                   

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                          <div>
                            <div style={{ color: "#686868" }}>
                              <strong>Pasajero:</strong>
                            </div>
                            <div style={{ color: "#686868" }}>
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

                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: "#686868" }}>Confirmación:</div>
                            <div style={{ fontWeight: 700 }}>{localizadorReserva}</div>
                          </div>
                        </div>

                        <hr style={{ margin: "16px 0" }} />

                        <div id="itinerary-segments">
                          {vuelos.length === 0 && <div style={{ color: "#686868" }}>No hay vuelos para mostrar.</div>}

                          {vuelos.map((vuelo, i) => (
                            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderBottom: "1px solid #eee" }}>
                              <div style={{ width: 48 }}>
                                <img src="https://documents.sabre.com/static/images/tc/mail/icon-air.png" alt="icon" width={31} height={31} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <div>
                                    <div style={{ textTransform: "uppercase", color: "#686868", fontWeight: 700 }}>{vuelo.aerolinea}</div>
                                    <div style={{ color: "#686868" }}>
                                      N° de vuelo:  <strong style={{ color: "#2E6BA4" }}> {vuelo.numeroVuelo}</strong>
                                    </div>
                                    <div style={{ color: "#686868" }}>
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right", color: "#686868" }}>{vuelo.fecha}</div>
                                </div>

                                <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                                  <div style={{ width: "30%" }}>
                                    <div style={{ color: "#686868", fontWeight: 700 }}>Salida:</div>
                                    <div style={{ color: "#2E6BA4", textTransform: "uppercase" }}>{vuelo.origen}</div>
                                    <div style={{ color: "#2E6BA4" }}>{vuelo.horaSalida}</div>
                                  </div>
                                  <div style={{ width: "30%" }}>
                                    <div style={{ color: "#686868", fontWeight: 700 }}>Llegada:</div>
                                    <div style={{ color: "#2E6BA4", textTransform: "uppercase" }}>{vuelo.destino}</div>
                                    <div style={{ color: "#2E6BA4" }}>{vuelo.horaLlegada}</div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ color: "#686868" }}>Cabina: <strong>{vuelo.clase}</strong></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
    

    
