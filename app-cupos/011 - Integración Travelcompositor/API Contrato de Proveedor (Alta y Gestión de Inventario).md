**Esta es la API real que necesitamos** para "cargar productos a Travelcompositor con gestión de inventario" (ver [[Checklist y Estado]] 1.b) — separada de la que documenta [[API Transportes (Búsqueda y Reserva)]] (esa es de **distribución**: buscar/reservar el inventario que Travelcompositor ya tiene de SUS proveedores). Esta acá es la de **contrato/proveedor**: nosotros damos de alta NUESTRO propio inventario para que Travelcompositor (y las agencias que lo usan) lo puedan encontrar y reservar.

> Fuente: `https://online.travelcompositor.com/resources/swagger.json` (el spec OpenAPI completo del API, con 141 endpoints en 7 tags de alto nivel + muchos más sub-tags reales por operación). Explorado directamente 2026-09-15 vía el spec, no vino en el clip de Julian (`API Travelcompositor - Transportes.md` solo cubre las secciones narrativas de "Getting started" — Accommodation/Transport/Transfer/Closed Tour/Ticket/Webhooks, todas del lado distribución). El spec completo es explorable en `https://online.travelcompositor.com/api/` (Swagger UI) o descargable del link de arriba.

## 1. La jerarquía de 3 niveles

```
Supplier (nosotros, una vez)
 └─ Transport / Hotel / Ticket / Transfer / Golf / Closed Tour (el "contrato" — nivel producto/ruta)
     └─ Option (nivel tarifa/variante concreta — la que trae el inventario/stock real)
```

Mismo patrón repetido para cada tipo de producto (`Contract - Transport`, `Contract - Hotel`, `Contract - Ticket`, `Contract - Transfer`, `Contract - Golf` son 5 tags distintos en el spec, todos con la misma forma create/update de 2 niveles). Documentamos acá **Transport** en detalle por ser el foco actual (ver el pedido original mencionaba "producto" en general — confirmar con Julian si además de vuelos hace falta Hotel/Ticket/Transfer, que siguen el mismo patrón).

## 2. Paso 0 — Alta de proveedor (una sola vez)

`POST /suppliers` (tag `Contract - Supplier`) — nos da un `supplierId` que se usa como prefijo de todos los endpoints de contrato de acá en adelante (`/transport/{supplierId}`, etc.).

Campos principales del body: `commercialName`, `legalName`, `taxpayerId`, `supplierUsername`, `email`/`fromEmail`/`replyEmail`, `address` (`AddressVO`), `country` (`CountryVO`), `contact` (`PersonNameVO`), `phoneNumber`/`mobile`/`emergencyNumber`, `active` (bool), más un grupo de flags de política (`hotelExclusive`, `sendPassengerEmail`, `sendAccommodationDetails`, `mandatoryContactPhone`, `mandatoryEmergencyContact`, `mandatoryPassengerDocument`, `mandatoryPassengerDocumentExpiryDate`, `mandatoryPassengerBithdate` [sic, typo real del proveedor], `denySupplierToBookingVoucher`), `externalCode`/`notes`/`remarks` libres.

**Sin confirmar todavía**: si esto lo gestiona Julian directamente (cuenta ya provista por el account manager con un `supplierId` fijo), o si el flujo real es que nuestro backend haga este alta la primera vez. Probablemente esto se resuelve a mano una sola vez y `supplierId` queda hardcodeado/configurado, no algo que el código haga en cada sync.

## 3. Paso 1 — Alta/edición del "contrato" de transporte (nivel ruta)

`POST /transport/{supplierId}` (crear) / `PUT /transport/{supplierId}` (editar) — tag `Contract - Transport`.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string | — |
| `name` | string | **requerido** |
| `airlineCode` | string | **requerido** |
| `transportType` | enum | **requerido** — `PLANE`\|`TRAIN`\|`BUS`\|`CAR`\|`BOAT`\|`BUGGY`\|`VAN`\|`COMBINED` |
| `segments` | array de `ContractTransportSegmentVO` | **requerido** — ver tabla abajo |
| `productTypes` | array de `TripType` | qué tipo de venta habilita (`ONLY_FLIGHT`, `FLIGHT_HOTEL`, etc. — 25 valores posibles en el enum, ver `TripType` en el spec) |
| `startDate` / `endDate` | string (date) | vigencia del contrato |
| `operationalDays` | array de día de semana | qué días opera |
| `pricePerPax` | bool | precio por pasajero vs. por vehículo |
| `currency` | enum `Currency` | — |
| `baseAdultPrice` / `baseChildrenPrice` / `baseInfantPrice` | number | **precio base One Way, por tipo de pasajero** — mapea directo a `Product.TarifaAdt/Chd/Inf` |
| `baseAdultRTPrice` / `baseChildrenRTPrice` / `baseInfantRTPrice` | number | precio base Round Trip, por tipo |
| `adultTaxesAmount` / `childrenTaxesAmount` / `infantTaxesAmount` (+ sus variantes `*RTTaxesAmount`) | number | **impuestos OW/RT por tipo** — mapea a `Product.ImpuestosAdt/Chd/Inf` |
| `minChildAge`/`maxChildAge`/`minInfantAge`/`maxInfantAge` | integer | rangos de edad propios del contrato (no fijos como en la API de distribución, que usaba 2-17/0-1 fijo) |
| `allowOWPrice` / `allowRTPrice` | bool | qué modalidades de venta habilita |
| `minStayNights` / `maxStayNights` | integer | para RT |
| `cancellationRanges` | array de `ContractTransportCancellationRangeVO` (`days`, `percentage`, `isBeforeStart`) | política de cancelación **estructurada** (a diferencia del texto libre `fareRules` del lado distribución) |
| `releaseContract` | integer | días de release (a confirmar significado exacto con soporte) |
| `onlyHolidayPackage` | bool | si el contrato solo se vende dentro de un paquete armado, no suelto |
| `combinableRtContracts` / `combinableAsInboundRTPrice` | array / bool | combinabilidad entre contratos para armar un RT con tramos de contratos distintos |

**`ContractTransportSegmentVO`** (un elemento de `segments[]` — el tramo/horario del vuelo, sin fecha concreta todavía, eso es la Option):

| Campo | Tipo | Nota |
|---|---|---|
| `departureLocationCode` | string, **requerido** | código de origen |
| `arrivalLocationCode` | string, **requerido** | código de destino |
| `departureTime` | string (hora), **requerido** | hora de salida |
| `arrivalTime` | string (hora), **requerido** | hora de llegada |
| `plusDays` | integer | si llega +N días después (vuelo overnight) |
| `durationTime` | string (hora) | duración |
| `model` | string | modelo de la unidad (ej. avión) |
| `numService` | string | número de vuelo/servicio |

## 4. Paso 2 — Alta/edición de la "Option" (nivel tarifa + inventario real)

`POST /transport/{supplierId}/{transportId}` (crear opción) / `PUT /transport/{supplierId}/{transportId}` (editar opción) — **esto es lo que trae el stock**.

| Campo | Tipo | Nota |
|---|---|---|
| `code` | string, **requerido** | identificador de la opción |
| `cabinClassType` | enum, **requerido** | `BUSINESS`\|`FIRST`\|`PREMIUM_ECONOMY`\|`ECONOMY`\|`PREFERRED`\|`TOURIST_PLUS`\|`TOURIST` |
| `baggageAllowance` + `baggageAllowanceType` (`KG`\|`PC`) | string + enum | franquicia de equipaje — mapea a `Product.CarryOn/HandBag/CheckedBag` + `*Kg` (mismo problema de "mezcla peso/piezas" ya visto en el lado distribución) |
| `minPassengers` / `maxPassengers` | integer | — |
| `onRequest` | bool | si es a pedido (sin stock firme) |
| `agencyId` | string | opcional — restringir la opción a una agencia puntual del microsite |
| `prices` | array de `ContractTransportOptionPriceVO` | **suplementos** de precio por rango de fecha (no el precio base, eso está en el contrato) |
| `inventories` | array de `ContractTransportOptionInventoryVO` | **★ el stock/cupo real ★** |
| `translations` | object | textos multi-idioma |

**`ContractTransportOptionInventoryVO`** — la pieza clave para "gestión de inventario":
```json
{ "inventoryDate": { "start": "2026-12-01", "end": "2026-12-01" }, "quantity": 20 }
```
Un array de estos: cada uno dice "entre esta fecha y esta fecha, hay `quantity` lugares". Mapea **directo** a `Product.Cupo`/`Disponibilidad` — la diferencia es que acá es un array de rangos de fecha con cantidad, no un contador único como en `Product` (nuestro modelo es 1 producto = 1 fecha de salida = 1 contador; Travelcompositor modela 1 contrato = N fechas, cada una con su propio `quantity`). **Esto es la decisión de mapeo más importante a resolver**: ¿un `Product` nuestro se traduce a una `Option` con un solo `inventories[]` de un día, o agrupamos varias salidas del mismo contrato/ruta en una sola `Option` con múltiples entradas de `inventories[]`?

**`ContractTransportOptionPriceVO`** (suplemento de precio, no el precio base): `name`, `startDate`/`endDate`, `adultPriceSupplement`/`childrenPriceSupplement`/`infantPriceSupplement` (+ sus variantes `*RTPriceSupplement`).

**Gotcha de actualización de stock**: no hay un endpoint chico tipo `PATCH .../inventory` para tocar solo la cantidad — para actualizar el stock hay que mandar el `PUT /transport/{supplierId}/{transportId}` con la Option completa (incluyendo `prices`/`inventories` enteros). Al implementar, verificar si es reemplazo total del array o merge — **a confirmar con soporte/probando en sandbox**, es fácil pisar sin querer otras fechas ya cargadas si se asume merge y en realidad reemplaza.

## 5. La otra mitad: que Travelcompositor nos avise cuando alguien reserva

Esto ya está resuelto y documentado del lado "Getting started" del clip de Julian — ver la sección Webhooks (líneas ~19130-19198 de `API Travelcompositor - Transportes.md`, todavía sin nota propia en el vault, pendiente de escribir). Resumen rápido:

- Se configuran hasta 3 endpoints de webhook por microsite, desde su Backoffice (permiso `micrositeSettings`), con un token secreto embebido en la URL (no se puede mandar por header).
- Body de la notificación: `{ "timestamp", "type": "CREATED"|"MODIFIED"|"CANCELED"|"CLIENT_REQUEST"|"REFUND", "micrositeId", "bookingReference" }`.
- Con el `bookingReference` recibido, se consulta el detalle real vía `GET /booking/getBookings/{micrositeId}/{bookingReference}` (tag `Booking`) — el webhook solo avisa que algo pasó, no manda el detalle completo.
- Reintentos: 1, 5, 15 y 30 min si el endpoint no responde; si falla del todo, email a los "Booking Mails" del microsite.
- Headers opcionales de seguridad: `X-Webhook-Api-Key` + `X-Webhook-Signature` (HMAC-SHA256).

**Esto es lo que cierra el círculo de "que se sincronice el inventario en la app"**: cuando llega un webhook `CREATED` para una reserva sobre nuestro propio inventario (`supplierId` nuestro), hay que decrementar `Product.Disponibilidad`/incrementar `Vendidos` del lado nuestro — mismo tipo de lock/transacción que ya usamos para cualquier venta propia (ver regla de oro sobre lockear `Product.Disponibilidad`, [[../006 - Operación y Mantenimiento/Gotchas y Reglas de Oro|Gotchas y Reglas de Oro]]).

## 6. Qué falta confirmar antes de diseñar el mapeo final

1. ¿Ya existe un `supplierId` asignado por Travelcompositor, o hay que darlo de alta nosotros vía `POST /suppliers`?
2. Mapeo 1 `Product` ↔ cuántos `Transport`/`Option` (ver duda de la sección 4 sobre `inventories[]`).
3. Semántica exacta de `PUT` sobre una Option: ¿reemplaza el array `inventories`/`prices` entero, o mergea por fecha? Probar en sandbox antes de asumir.
4. Si además de Transport hace falta Hotel/Ticket/Transfer/Golf (mismo patrón `Contract - *`, no explorado en detalle todavía).
5. Si el disparador va a ser automático (cada vez que se guarda un `Product` en Gestión de Productos) o manual/batch — ver [[Checklist y Estado]] sección 3.
6. Confirmar si `agencyId` en la Option sirve para el scoping por agencia que ya preguntamos en el checklist (¿una Option por agencia, o un solo contrato compartido?).
