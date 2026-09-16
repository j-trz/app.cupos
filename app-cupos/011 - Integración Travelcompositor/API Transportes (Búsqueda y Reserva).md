Resumen destilado de la sección **Transport API** (vuelos/trenes) de la documentación oficial de Travelcompositor, pegada completa por Julian en `API Travelcompositor - Transportes.md` (19.198 líneas — ese archivo es en realidad un clip de **todo** el sitio de docs: Accommodation, Transport, Transfer, Closed Tour y Ticket, no solo Transportes). La sección de Transport ocupa las líneas **2286 a 8414** de ese archivo (después sigue Transfer API). Esta nota es el destilado; el archivo original queda como fuente cruda de referencia, no se repite acá.

> Procesado: 2026-09-15.

## ⚠️ Hallazgo crítico — releer antes de seguir

**Esta API (Transport) es de distribución: buscar y reservar el inventario de vuelos/trenes que Travelcompositor ya tiene contratado con sus proveedores. No existe ningún endpoint para publicar/crear/subir un producto propio.** No hay `POST .../transports` de alta, ni `PUT` de edición de un producto de transporte, ni bulk upload. La cantidad de vuelos disponibles depende explícitamente de "los proveedores conectados por el cliente" (proveedores de Travelcompositor, no nuestros). Mismo patrón en Accommodation/Transfer/Closed Tour/Ticket (todas las secciones del archivo): Quote/Confirm/Prebook/Book/Cancel/Refresh/Get — nunca un alta de producto.

**Esto es la dirección opuesta a "cargar productos" tal como lo planteó Julian originalmente** (ver [[Checklist y Estado]] punto 1) — hay que confirmar con él si:
(a) el objetivo real es **consumir** el inventario de Travelcompositor (buscar/reservar sus vuelos desde nuestro sistema, mostrárselo a las agencias), en vez de publicar los cupos propios ahí, o
(b) existe otra sección de la API (no vista en este clip, quizás un "Content API"/"Supplier API" aparte) donde sí se puede dar de alta inventario propio como proveedor, o
(c) la idea es una integración indirecta (ej. leer disponibilidad propia y ofertarla manualmente en Travelcompositor por otro medio, fuera de esta API).

Ver pregunta agregada al checklist.

## 1. Flujo de reserva

1. **Quote** (`quoteTransport`) — búsqueda One Way / Round Trip. Devuelve `services[]` (los tramos/legs reales) + `recommendations[]` (combinaciones ya con precio, que referencian legs vía `outboundRef`/`inboundRef`).
2. **Quote Fare Family** (opcional, solo si `hasFareFamilyUpSell: true`) — tarifas alternativas (LITE/STANDARD/FLEX/BUSINESS) para el mismo itinerario.
3. **Confirm** — fija un `recommendationKey`, devuelve precio autoritativo, campos de pasajero requeridos, reglas de tarifa (texto libre), largo máximo de nombre, opciones de equipaje extra.
4. **Prebook** — manda datos de pasajeros + equipaje elegido contra el `recommendationKey` de Confirm; pre-reserva con precio confirmado y política de cancelación. Todavía no persiste.
5. **Book** — manda el `recommendationKey` de Prebook (+ `externalReference`/`fakeBooking` opcionales); crea la reserva real. Devuelve `bookingReference` + `status`.
6. **Post-booking**: cuota de cancelación (GET), cancelar (DELETE), refresh de estado con el proveedor (PUT), detalle de la reserva (GET, sin llamar al proveedor).

Existe además un flujo **Multi-Engine** (vuelo+hotel combinado): mismo patrón pero corriendo Quote de accommodation y de transport en paralelo, y un solo Confirm/Prebook/Book/Get combinado que carga ambos `combinationKey` (hotel) + `recommendationKey` (transporte).

## 2. Endpoints

| Paso | Método + path | Notas |
|---|---|---|
| Autenticar | `POST /resources/authentication/authenticate` | Ya documentado en [[Conexión y Estructura General]] |
| Quote transporte | `POST {{endpoint}}/resources/booking/transports/quote` | Body: `journeys[]` (`departureDate`, `departure`, `departureType: TRANSPORT_BASE`, `arrival`, `arrivalType`), `persons[]` (solo `age`), `language`, `sourceMarket`, `filter.includeFareFamilies` |
| Quote Fare Family | (path exacto no confirmado en este clip, solo el nombre de la llamada) | Body: `{"recommendationKey": "..."}` → `fareFamilies[]` con su propio `recommendationKey` |
| Confirm | (path no confirmado en este clip — analogía con `.../confirm` de Accommodation) | Body: `{"transports": {"recommendationKey": "..."}}` |
| Prebook | (path no confirmado — analogía `.../prebook`) | Body: `transports.recommendationKey`, `transports.extraBaggage[].optionKey`, `persons[]` con datos de contacto/nacimiento |
| Book | (path no confirmado — analogía `.../book`) | Body: `transports.recommendationKey` (de Prebook), `externalReference` opcional, `fakeBooking` opcional (`BOOK_ERROR` simula falla en test) |
| Cuota de cancelación | `GET /resources/booking/{bookingReference}/transports/{serviceBookingReference}/cancellation-fee` | |
| Cancelar | `DELETE /resources/booking/{bookingReference}/transports/{serviceBookingReference}` | → `status: CANCELED` |
| Refresh | `PUT /resources/booking/{bookingReference}/transports/{serviceBookingReference}` | re-sincroniza estado con el proveedor (ej. `RQ` → `BOOKED`) |
| Detalle de reserva | `GET /resources/booking/{bookingReference}/transports/{serviceBookingReference}` | Solo lo que TC ya tiene, no llama al proveedor |

**Los paths exactos de Confirm/Prebook/Book/Quote Fare Family no vinieron como ejemplo `curl` en este clip** (solo el body JSON y el anchor de sección `#confirmtransport`/`#prebooktransport`/`#booktransport`) — están ahí por analogía con los de Accommodation. Si hace falta el path exacto antes de implementar, sacarlo de la colección Postman de Transport (`TravelC_Api_Transports.postman_collection.json`, mencionada en la doc) o pedírselo a Julian/al account manager.

## 3. Identificadores y su vida útil

- **auth-token**: debe ser el mismo durante todo el flujo (Quote → Confirm → Prebook → Book). Expira a los **120 minutos** (consistente con `expirationInSeconds: 7200` de la autenticación).
- **recommendationKey** (transporte): identifica una combinación priceada; se renueva (nueva key) en cada respuesta. **A diferencia del `combinationKey` de Accommodation (40 min en quote / 60 min en el resto) y del `ticketKey` de Tickets (misma regla 40/60), acá la doc NO da un tiempo de expiración explícito para transporte** — solo dice "no se recomienda guardarlo porque cambia en cada respuesta". Confirmar con soporte de Travelcompositor antes de asumir una duración.
- **outboundRef / inboundRef**: no son tokens de seguridad, solo correlacionan una recomendación con sus tramos en `services[]`.
- **optionKey** (equipaje extra): key opaca por opción de equipaje, de Confirm a Prebook.

## 4. Modelo de datos de un "producto" de transporte

**Tramo/segmento** (`services[].segments[]`): `ref`, `departure`/`arrival` (códigos tipo IATA), `departureDateTime`/`arrivalDateTime`, `duration` (minutos), `marketingCompany`/`operatingCompany` (código de aerolínea), `transportNumber` (puede ser `FAKE-xxxxx` en test), `transportType` (`PLANE`/`TRAIN`), `cabinType` (`ECONOMY`/`BUSINESS`), `technicalStopsVO[]` (escalas), `fareRules[]` (solo en Confirm — texto libre, no estructurado), `includedBaggage`/`selectedBaggage[]`, `segmentsBaggageAllowance[]` (mezcla peso/piezas según proveedor).

**Recomendación/precio**: `recommendationKey`, `provider` (ej. FakeFlight, Amadeus), `fareType` (`PUBLIC`), `fare` (nombre), `lowcost` (bool), `lastTicketingDate`, `priceBreakdown.totalPrice`/`.taxes` (`amount`+`currency` — no hay campo de neto/comisión separado para transporte, a diferencia de la FAQ de Accommodation que sí lo tiene), `hasFareFamilyUpSell`, `outboundRef`/`inboundRef`.

**Pasajero** (request): solo `age` en Quote; en Prebook/Book: `courtesyTitle`, `name`, `lastName`, `email`, `phone`, `phoneCountryCode`, `requestedAge`, `birthDate` (menores). No hay campo de tipo adulto/niño/infante explícito — se infiere por edad (niño 2–17, infante 0–1, ver FAQ).

**Equipaje extra** (`extraBaggageOptions[]`): `optionKey`, tiers de peso, `price`.

**Política de cancelación** (`cancellationPolicies[]`): `date` + `amount` — una sola cifra por fecha, no un esquema tarifado por tramos (más simple que el de Accommodation).

## 5. Manejo de errores

**No documentado por código HTTP** en este clip (nada de 400/401/404/500, ni un objeto de error genérico). La señal de éxito/fracaso es el campo `status` del body (a nivel reserva y a nivel cada `services[]`), más `fakeBooking: "BOOK_ERROR"` para simular una falla en el ambiente de test. **Gotcha**: un `200 OK` no implica reserva exitosa — siempre revisar `status`. Mismo espíritu que el gotcha ya documentado para Atlas (ver [[../007 - Integración Netviax Atlas/Conexión y Estructura General|Conexión y Estructura General de Atlas]]), aunque acá el vehículo es `status` en el body y no un doble-JSON pegado.

## 6. Estados de reserva (FAQ #11)

**A nivel servicio**: `BOOKED`, `BOOK_ERROR`, `CANCELED`, `PRICE_ERROR` (cambió el precio vs. Confirm/Prebook, fuera de la tolerancia configurada en el Microsite), `NOT_BOOKED` (el proveedor no confirmó), `RQ` (a pedido, pendiente), `PENDING_BOOK` (procesando).

**A nivel reserva completa** (derivado de todos sus servicios): `NOT_BOOKED`, `RQ` (hay que hacer polling con Refresh/detalle hasta que cambie), `PRICE_ERROR`, `PENDING_BOOK`, `BOOKED` (todos los servicios reservados sin error previo), `BOOK_ERROR` (fallback), `CANCELED`.

## 7. FAQ relevante (14 ítems, línea 7583 del archivo original)

- **Formato**: solo JSON.
- **Gzip**: obligatorio.
- **Máx. pasajeros**: 9 en total, máx. 9 adultos, máx. 8 niños (al menos 1 adulto obligatorio).
- **Edades**: niño 2–17 inclusive, infante 0–1 inclusive.
- **Multi-moneda**: **no soportado** — la moneda de respuesta es fija por configuración del Microsite, no se puede pedir por request ni varía por recomendación.
- **Prebook rate**: normalmente tarifa real, no cacheada (depende del proveedor).
- **Proceso de certificación**: Travelcompositor revisa logs de request/response de todas las llamadas (unos días); un sitio de staging es deseable pero no obligatorio. Prueban puntualmente: reserva One-Way, dos One-Way, Round-Trip con equipaje extra, Round-Trip con adulto+niño+infante.
- **Tarifas Nego/Corporate**: reflejan lo que esté configurado por proveedor en el Microsite operador.
- **Family Fares**: todavía no ("segunda etapa").
- **Asignación de asiento**: todavía no ("segunda etapa").
- **No respondido en esta sección** (sí existe para Accommodation/Tickets): lookup de código de destino, catálogo de errores de validación de campos obligatorios, lista de `phonecountryCode`, neto vs. comisionable, valor de tolerancia de cambio de precio.

## 8. Qué falta para poder implementar

1. **Confirmar con Julian la dirección real de la integración** (ver hallazgo crítico arriba) — esto decide si esta sección del API aplica directamente o si hace falta buscar otra.
2. Si aplica (consumo de inventario Travelcompositor): pedir los paths exactos de Confirm/Prebook/Book/Quote Fare Family (colección Postman o account manager).
3. Confirmar la vida útil real del `recommendationKey` (no documentada acá).
4. Ver [[Checklist y Estado]] para el resto de lo pendiente (scoping por agencia, credenciales, sandbox vs. prod).
