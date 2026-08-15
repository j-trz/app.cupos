Postmortems de bugs ya corregidos, para no re-investigar desde cero si un síntoma parecido reaparece. Ver [[Gotchas y Reglas de Oro]] para las reglas operativas generales (no ligadas a un bug puntual).

> Entradas verificadas contra código al momento de escribirse; fecha propia en cada una.

## Bandeja de Tickets: reservas emitidas no "caían" ahí + selección múltiple de Reservas rota

**Síntoma** (reportado por Julian): la Bandeja de Tickets no mostraba las reservas emitidas, y los botones "Confirmar"/"Emitir" de la selección múltiple en Gestión de Reservas tiraban error.

**Causa raíz 1 — emisión individual nunca generaba tickets**: `GenerateTicketsForReservationInternal()` (`ticket_handler.go`) es la función que crea las filas de `Ticket` cuando una reserva pasa a `EstadoInterno = "Emitido"` — pero solo la llamaba `BulkUpdateReservations` (`order_handler.go`), agregada junto con la selección múltiple. `UpdateReservation` (el flujo normal, de a una reserva por vez, usado desde Gestión de Nóminas/Reservas) calculaba `emitido_at` pero **nunca** llamaba a esa función — la enorme mayoría de emisiones (todo lo que no pasa por seleccionar varias reservas y usar el botón masivo) nunca generaba ticket, así que nunca aparecía en la Bandeja. Esto también explica la duda de Julian sobre Atlas: no hay ninguna dependencia de Atlas en la generación de tickets (`AtlasStatus` arranca en `"pendiente"` y el ticket ya es visible), el problema era puramente que no se generaba el ticket en absoluto en el flujo individual.

**Fix**: `UpdateReservation` ahora también llama a `GenerateTicketsForReservationInternal()` cuando detecta la transición a "Emitido" (mismo criterio que ya usaba para calcular `emitido_at`). La función ya es idempotente (si ya existen tickets para esa reserva, los devuelve sin duplicar), así que no hay riesgo de tickets repetidos si en algún momento se emite tanto individual como en bulk.

**Causa raíz 2 — selección múltiple de Reservas (Confirmar/Emitir) rota**: `reservationService.js` tenía dos bugs simultáneos en `bulkUpdateReservations`:
1. Llamaba `PUT /reservations/bulk-update` — pero la ruta real está registrada como `POST /orders/bulk-update` (no existe ningún grupo de rutas `/reservations` en el backend; toda esta lógica vive bajo `/orders`, ver `order_handler.go`). Método Y path equivocados → 404/405 seguro.
2. Mandaba `{ ids, estado: 'confirmado' }` o `{ ids, estado: 'emitido' }` — pero el backend tiene DOS campos independientes: `Reservation.Estado` (ciclo de vida, valor real `"confirmada"`, no `"confirmado"`) y `Reservation.EstadoInterno` (seguimiento de backoffice, valores válidos `Pendiente`/`Seña`/`Pagado`/`Emitido`, con mayúscula). El frontend nunca mandaba `estado_interno`, así que aunque el path/método se arreglaran solos, "Emitir" jamás iba a disparar la generación de tickets (el backend solo la dispara cuando `EstadoInterno == "Emitido"`).

**Fix**: `reservationService.js` ahora expone `bulkConfirmReservations(ids)` (→ `POST /orders/bulk-update` con `estado: 'confirmada'`) y `bulkEmitReservations(ids)` (→ mismo endpoint con `estado_interno: 'Emitido'`) como métodos separados en vez de uno genérico que mezclaba los dos campos. `GestionReservas.jsx` actualizado para llamar al método correcto según la acción.

**Causa raíz 3 (descubierta 2026-08-14, después de que el fix anterior llegara a producción)**: con el path/método y los campos ya corregidos, "Emitir"/"Confirmar" seguían tirando el mismo error genérico "Se requiere un array 'ids'...". `BulkUpdateReservations` y `BulkCancelReservations` (`order_handler.go`) declaraban `IDs []uuid.UUID` en el struct del request — pero `Reservation.ID` es `uint`, no UUID. Cuando el frontend manda `{ids: [42], ...}`, Gin intenta bindear `42` contra `uuid.UUID` (que solo acepta un string de 36 caracteres con guiones), `ShouldBindJSON` falla, y el handler cae en el mismo `if err != nil || len(req.IDs) == 0` que devuelve el mensaje genérico — indistinguible en el frontend de "mandaste el array vacío". **Fix**: ambos structs pasan a `IDs []uint`, sin tocar el resto de la lógica (`Where("id IN ?", req.IDs)` funciona igual con cualquier tipo de slice).

**Causa raíz 4 (descubierta 2026-08-14, con el fix 3 ya aplicado, reproducida con un script puntual contra la base — no era ni `Estado` ni `EstadoInterno`, esos dos campos ya funcionaban como estaba diseñado)**: `GenerateTicketsForReservationInternal()` (`ticket_handler.go`) tenía dos bugs propios que dejaban la generación de tickets fallando en silencio incluso con la reserva correctamente marcada `EstadoInterno="Emitido"`:
1. El chequeo de "¿ya existe un ticket para esta reserva?" comparaba `reservation_id = ?` contra `res.ID` (un `uint`) — pero `Ticket.ReservationID` es un `uuid.UUID` derivado por hash (`uuid.NewSHA1(...)`), no el ID entero. Postgres rechaza esa comparación (`unable to encode into binary format for uuid`), y el error no se chequeaba (`database.DB.Where(...).Find(&existing)` sin `.Error`) — silenciosamente seguía de largo como si nunca existiera un ticket.
2. **La causa que de verdad bloqueaba la creación**: `Ticket.UsuarioEmisorID` tiene un FK real hacia `profiles(id)` (`fk_tickets_emisor_user`). Si el `userID` sacado del contexto de auth no corresponde a una fila real de `profiles` (parseo de UUID fallido, contexto sin seteo, o cualquier discrepancia), el `INSERT` del ticket viola el FK — y tanto `GenerateTicketsForReservationInternal` como sus dos únicos llamadores (`UpdateReservation`/`BulkUpdateReservations`) descartaban el error con `_, _ = ...`. El resultado visible: la reserva se actualiza "correctamente" (el `UPDATE` de `estado_interno` sí funciona, es una operación separada), el usuario ve éxito, pero el ticket nunca se crea y no queda ningún rastro en logs.

**Fix**: el chequeo de duplicados ahora usa el mismo hash UUID que se usa para crear (`resIDUUID`, calculado una sola vez al principio de la función); todos los `Create()` fallidos ahora loguean el error real (`log.Printf`) y la función devuelve un error real si no pudo crear ningún ticket, en vez de devolver éxito silencioso; `UpdateReservation`/`BulkUpdateReservations` ya no descartan ese error con `_, _ =`, lo loguean. **Esto no soluciona la causa de fondo de por qué el `userID` no matchea un `profiles.id` real en producción** (posible desajuste entre el claim del JWT y la tabla `profiles`, a investigar si vuelve a pasar) — pero ahora, si vuelve a fallar, va a quedar un log claro en vez de silencio total. Verificado extremo a extremo con un script puntual (`cmd/debug_tickets`, descartado después de usarlo): reserva + producto + profile reales creados a mano, `GenerateTicketsForReservationInternal` devolvió el ticket creado y confirmado buscable por la misma query que usa `GetTickets`.

**Causa raíz 5 (descubierta 2026-08-15, con los 4 fixes anteriores ya en vivo en producción — Julian seguía sin ver tickets en la Bandeja)**: las causas 1-4 asumían que el disparador real de "un pasajero fue emitido" era el dropdown `estado_interno` de `Reservation` (en el modal de editar reserva, o el botón masivo "Emitir"). **Ese no es el flujo que se usa en la práctica.** El flujo real es cargar el número de ticket real de la aerolínea por pasajero, desde el botón "Asignar" en Gestión de Reservas o desde "Editar Pasajero" en Nóminas — ambos llaman a `ReservationService.updatePassengerTicket()` → `PUT /orders/:id/passengers/:passengerId` → `UpdatePassengerTicket` (`order_handler.go`). Este handler **nunca estuvo conectado** a `GenerateTicketsForReservationInternal` ni a `EstadoInterno` — solo guardaba `Passenger.NumeroTicket` en la tabla `passengers` y ahí terminaba todo. Cargar el ticket real de un pasajero (la acción que la agencia realmente hace al ticketear) no generaba ninguna fila en `Ticket` ni tocaba la reserva.

Encontrado además, al refactorizar: el chequeo de "¿ya existen tickets de esta reserva?" (causa raíz 4) operaba a nivel **reserva completa** — si CUALQUIER pasajero de la reserva ya tenía un ticket creado, la función devolvía ese ticket y se salteaba **todos los pasajeros restantes sin ticket**. Para una reserva de varios pasajeros ticketeados en momentos distintos (lo normal: la aerolínea no siempre confirma todos los boletos el mismo día), esto significaba que solo el primer pasajero ticketeado alguna vez generaba su fila — los demás quedaban para siempre sin ticket aunque se les cargara el número real después.

**Fix — dos cambios**:
1. `GenerateTicketsForReservationInternal` pasó a ser genuinamente por-pasajero: una nueva función `upsertTicketForPassenger()` chequea/crea/actualiza el ticket de UN pasajero puntual (nunca "¿existe algún ticket de la reserva?"), así que una reserva con emisión escalonada genera cada ticket en el momento correcto sin bloquearse por los pasajeros ya ticketeados.
2. `UpdatePassengerTicket` ahora, al guardar un `numero_ticket` no vacío, llama a `upsertTicketForPassenger()` para ESE pasajero (usando el número real recién cargado, no un placeholder) y marca `Reservation.EstadoInterno = "Emitido"` si no lo estaba — conectando por primera vez el flujo real de carga de ticket con la Bandeja. El placeholder sintético `045-...` (usado cuando se emite en bloque sin haber cargado todavía el número real) se preserva como fallback y se **actualiza automáticamente** al número real la próxima vez que alguien lo carga (si el ticket ya existía con el placeholder, `upsertTicketForPassenger` corrige el `numero_ticket` en vez de duplicar).

Verificado extremo a extremo con un script puntual (`cmd/debug_tickets2`, descartado después de usarlo): reserva con 2 pasajeros, uno con ticket real cargado y otro sin cargar — la función generó el ticket del primero con su número real y el del segundo con placeholder, sin bloquearse; una segunda llamada no duplicó nada.

**Causa raíz 6 — la real, la que hacía inútiles las causas 1-5 (descubierta 2026-08-15, minutos después de la 5, cuando Julian confirmó que re-seleccionar y "Emitir" tampoco mostraba nada en la Bandeja)**: el backend nunca tuvo el problema — se verificó llamando directo a `GET https://app-cupos-umber.vercel.app/api/tickets` (con el token del propio Julian) y la API devolvía correctamente los 5 tickets ya creados, con sus números reales. El bug estaba puramente en el frontend: `BandejaTickets.jsx` hacía `ticketService.getTickets(...).then((r) => r.data)` — pero `ApiClient` (`apiClient.js`) **no es axios**: `request()` ya devuelve el body JSON parseado directo (un array), no un objeto `{ data: [...] }` envolviéndolo. `r.data` sobre un array es `undefined`, y el default de `useQuery` (`data: tickets = []`) tapaba el `undefined` con un array vacío — la Bandeja iba a mostrarse **siempre vacía**, sin importar cuántos tickets hubiera en la base ni qué tan bien funcionara el backend. Ninguna de las causas 1-5 era falsa (los bugs de backend eran reales y quedaron corregidos), pero **ninguna podía arreglar el síntoma que reportaba Julian**, porque el problema real vivía en una capa distinta.

De paso se encontró un bug relacionado en `ApiClient.get(endpoint)`: su firma no aceptaba un segundo parámetro, así que `ticketService.getTickets({ estado: ... })` (que llama `api.get('/tickets', { params })`) descartaba el filtro en silencio — el dropdown de estado de la Bandeja nunca había filtrado nada server-side.

**Fix**: `BandejaTickets.jsx` ya no hace `.then(r => r.data)` (usa el array que devuelve `ticketService.getTickets()` directo). `ApiClient.get()` ahora acepta `{ params }` y arma el querystring, para que el filtro de estado llegue de verdad al backend.

**Lección para la próxima vez que algo "no aparece" pese a que el backend está bien**: verificar la capa de transporte llamando directo a la API (`fetch` con el token real desde la consola del navegador) ANTES de seguir buscando en el backend — si la API ya devuelve los datos correctos, el problema es de deserialización/wrapping en el frontend, no de generación de datos.

## Modal de detalle del ticket (Bandeja de Tickets): Origen/Destino/PNR mal derivados

**Síntoma** (reportado por Julian, apenas la Bandeja empezó a mostrar tickets reales): el diseño del boleto le gustó, pero Destino mostraba "???", Origen mostraba el itinerario completo en vez de un código de aeropuerto, y el PNR mostrado era el ID de pedido interno, no el localizador real de la aerolínea.

**Causa raíz**: `TicketDetailModal` (`BandejaTickets.jsx`) derivaba Origen/Destino con `ticket.ruta?.split('-')[0/1]`, asumiendo que `Ruta` sería un simple `"MVD-RIO"`. En la realidad, `Ticket.Ruta` (copiado de `Reservation.VueloRuta`, que a su vez viene de `Product.Ruta`) es el itinerario completo de vuelo, texto libre multi-tramo (ej. `"1JA763 31DEC MVDGIG 1432 1715  2JA762 09JAN GIGMVD 0950 1200"`), sin ningún guión — `split('-')` devolvía el string entero como "origen" y `undefined` (→ "???") como "destino". Por separado, `Ticket.PNR` se poblaba con `Reservation.PedidoID` (nuestro ID interno, ej. "PED-2026-...") — el PNR real de la aerolínea (ej. "V9L8SZ") vive en `Product.PNR` y nunca se leía.

**Fix**:
1. Nueva columna `Ticket.Destino` (migración idempotente en `db.go`), poblada desde `Reservation.VueloDestino` (que ya es un código limpio tipo "RIO") al generar el ticket — ya no se intenta derivar de `Ruta`.
2. `Ticket.PNR` ahora se puebla con `Product.PNR` (se busca el producto una vez por reserva en `GenerateTicketsForReservationInternal`, y en `UpdatePassengerTicket` al cargar un ticket individual), no con el ID de pedido.
3. El frontend reusa `parseRuta()` (ya existente en `ItineraryTable.jsx`, escrito para la feature de "Generar Itinerario" y ya probado contra este mismo formato multi-tramo) para extraer el **origen** del primer tramo — en vez de reinventar un parser con `split('-')`.

Los tickets ya emitidos antes de este fix (la columna `Destino` nueva, y el `PNR` viejo con el pedido_id) no se backfillean automáticamente — `Ticket.ReservationID` es un hash no reversible, no se puede hacer un `UPDATE ... JOIN` hacia atrás. Quedan con `destino` vacío y el PNR viejo hasta que se vuelvan a tocar (ej. un void + re-emisión), o hasta que se decida un backfill manual puntual.

Verificado con un script puntual (`cmd/debug_tickets3`, descartado después de usarlo): PNR resuelto a `V9L8SZ` (el real del producto, no el pedido), `Destino` resuelto a `RIO`.

**Seguimiento del mismo pedido — itinerario completo, no solo Origen/Destino (2026-08-15)**: a Julian le gustó el diseño del modal, pero pidió ir más allá: nro. de vuelo, fecha, origen, destino, salida y llegada normalizados en campos propios (no texto libre), soportando **más de un tramo** por ticket, porque esta información "viajará a nuestro backoffice". Se agregó `services.ParseRuta()` (`backend-go/pkg/services/itinerary_parser.go`) — un **puerto 1:1 a Go** del parser que ya existía en el frontend (`parseRuta()`/`ItineraryTable.jsx`, escrito para "Generar Itinerario" y ya probado contra formatos reales de ruta) — en vez de escribir un parser nuevo desde cero. Go (motor de regex RE2) no soporta lookahead, así que la lógica de "partir el texto antes de cada match" (`split(/(?=X)/)` en JS) se reimplementó a mano con `FindAllStringIndex` + slicing manual; el resto del algoritmo (3 estrategias de split por línea/nro. de segmento/nro. de vuelo, elegir la que más tramos separe, clasificar tokens por patrón) es una traducción directa. Nueva columna `Ticket.Segmentos` (`datatypes.JSON`, mismo patrón que `WhiteLabelConfig.Config`) se calcula una sola vez al emitir (`buildSegmentosJSON()` en `ticket_handler.go`) y se re-calcula sola la próxima vez que se toca el ticket si todavía estaba vacía (autocura tickets viejos sin necesitar un backfill masivo). Verificado con 4 muestras reales de ruta tomadas de esta misma conversación (JA/IB de 2 tramos, LATAM de 4 tramos con tokens de ruido como "L"/"6\*.../"GN12"/"E", AV de 4 tramos) — los 4 parsearon exactamente igual que el parser de frontend, incluida la detección de "+1 día".

**Feature nueva — void de ticket pregunta por el stock**: `VoidTicket` (`ticket_handler.go`) ahora acepta `restore_stock` (bool) en el body; si es `true`, devuelve 1 lugar al `Product` asociado (mismo patrón GORM que usa `DeleteReservation` para restituir stock: `LEAST(cupo, GREATEST(0, disponibilidad + 1))` / `GREATEST(0, vendidos - 1)`, ambos dentro de una transacción junto con el `Save` del ticket). La decisión de si el lugar ocupaba stock o no queda en manos del usuario (no se intenta inferir automáticamente) — ver limitación de diseño abajo, sobre por qué no es trivial inferirlo del lado del backend. `BandejaTickets.jsx`'s `handleVoid` ahora pregunta explícitamente "¿Devolver al stock del cupo?" vs. "Void informativo" antes de pedir el motivo.

**Limitación de diseño detectada (no corregida, solo documentada)**: `Ticket.ReservationID` y `Ticket.PassengerID` (`models.go`) se generan con `uuid.NewSHA1(...)` a partir del ID entero real de `Reservation`/`Passenger` — son identificadores **derivados, no reversibles**, no una FK real utilizable para hacer `JOIN`/lookup hacia esas tablas (`Reservation.ID`/`Passenger.ID` son `uint`, no `uuid.UUID`). Por eso el fix de "devolver stock" no intenta determinar automáticamente si el pasajero del ticket era un infante (que no ocupa lugar) — no hay forma confiable de recuperar el `Passenger` real desde `Ticket.PassengerID` con una query directa. Si en el futuro hace falta ese dato desde `Ticket` de forma confiable, la solución real es agregar una columna con el ID entero real (no el hash) o una relación GORM propiamente tipada — no intentar revertir el hash SHA1.


## Reserva emitida seguía mostrando "Confirmado" en el badge de Estado

**Síntoma** (reportado por Julian): "en reserva, cuando se emite debe cambiar al estado emitido. Hoy esta quedando confirmado".

**Causa raíz**: `Reservation.Estado` (bloqueo_temporal/confirmada/cancelada/solicitud_cancelacion/expirada) y `Reservation.EstadoInterno` (Pendiente/Seña/Pagado/Emitido) son dos campos **independientes** por diseño (ver comentario en `models.go` y el hint del propio formulario: "Seguimiento de pago/emisión, independiente del estado de arriba"). El badge de Estado visible en `GestionReservas.jsx`/`Dashboard.jsx`/`GestionNominas.jsx` (además de la exportación a Excel de Nóminas) solo leía `Estado` — que **no tiene** un valor "emitida" en su enum — así que una reserva emitida quedaba mostrando "Confirmado" para siempre, aunque `EstadoInterno` ya estuviera correctamente en `"Emitido"` (los fixes de esta misma sesión). El bug de fondo era de visualización, no de datos: el dato correcto ya existía, solo no se priorizaba al armar el badge.

**Encontrado además**: la misma lógica de badge (`getEstadoVariant`/`getEstadoLabel` o su variante `getBadgeVariant` en Nóminas) estaba duplicada de forma independiente en los 3 archivos, ya divergiendo entre sí (distintos labels/variantes para los mismos estados).

**Fix**: consolidada en [`frontend/src/lib/estadoReserva.js`](../../frontend/src/lib/estadoReserva.js) — `getEstadoVariant(estado, estadoInterno)`/`getEstadoLabel(estado, estadoInterno)` ahora priorizan `estadoInterno === 'Emitido'` (badge azul "Emitido") por sobre `estado`. Los 3 archivos importan del módulo compartido en vez de mantener su propia copia; `GestionReservas.jsx`/`GestionNominas.jsx` ahora propagan `estado_interno` hacia el objeto de fila (`buildPassengerRows`) para que el badge pueda leerlo. Verificado con `npm run build`/lint, limpios en los 3 archivos.

## Bandeja de Tickets: E-ticket completo — cada dato de ruta y backoffice como columna propia

**Pedido** (Julian): "en la tabla de tickets, debe estar por separado cada dato de la ruta, esto es para que no falle el dato" — listado explícito de ~26 campos (nro. de segmento, compañía, nro. de vuelo, fechas/horas, tarifa/impuestos/total, agencia, pasajero, PNR, nro. de ticket, tipo de pasajero, documento/tipo de documento, ficha, vendedor, emisor, ID de pedido, estado, franquicia de equipaje, fecha de reserva).

**Lo que ya existía vs. lo que faltaba**: `Ticket` (ver sección homónima en `Modelo de Datos.md`) ya tenía la mayoría como columnas propias (incluyendo `Segmentos`, agregado el mismo día para el itinerario). Faltaban 5 datos que nunca se habían snapshoteado: `TipoPasajero`, `TipoDocumento` (CI vs. Pasaporte — antes se mezclaban en un solo `PasajeroDocumento` sin indicar cuál era), `PedidoID`, `Vendedor` (email de quien creó la reserva) y `FechaReserva`, más la franquicia de equipaje (`CarryOn`/`HandBag`/`CheckedBag` + `*Kg`), que vivía solo en `Product` y nunca se copiaba al ticket.

**Fix**:
1. 6 columnas nuevas en `Ticket` (`models.go` + migración idempotente en `db.go`): `TipoPasajero`, `TipoDocumento`, `PedidoID`, `Vendedor`, `FechaReserva` (`*time.Time`, nullable — no se puede reconstruir para tickets viejos), y la franquicia de equipaje con el **mismo shape que `Product`** (`carryon`/`handbag`/`checkedbag` + `*_kg`) para poder reusar `BaggageFranchise.jsx` sin ningún mapeo.
2. `upsertTicketForPassenger`/`generateReservationLevelTicket` (`ticket_handler.go`) pasan a recibir el `Product` completo (antes solo se seleccionaba la columna `pnr`) y un `vendedorEmail` ya resuelto (`resolveVendedorEmail()`, un solo lookup de `Profile` por `Reservation.CreatedBy`) — ambos calculados una vez por reserva en `GenerateTicketsForReservationInternal` y en `UpdatePassengerTicket` (`order_handler.go`), no por pasajero. `TipoDocumento` se infiere de cuál de `Passenger.Documento`/`Pasaporte` estaba cargado; el fallback legado a nivel-reserva (`generateReservationLevelTicket`, reservas sin pasajeros desglosados) no puede distinguir los dos (`Reservation` solo tiene un campo `DocumentoPasajero`), así que ahí `TipoDocumento` queda vacío en vez de asumir uno.
3. Autocura extendida: si un ticket existente no tiene `PedidoID` (proxy de "es de antes de este fix"), se completan las 6 columnas nuevas la próxima vez que se le toca el número de ticket — mismo patrón ya usado para `Segmentos`.
4. `BandejaTickets.jsx`: la tabla ahora explota **una fila por tramo** (`buildTicketRows()`), no una por ticket — "nro. de segmento" como columna propia solo tiene sentido así, un ticket de ida y vuelta son 2 tramos con vuelo/fecha/origen/destino distintos que no entran en una sola celda sin perder datos. Las 26 columnas pedidas quedan en el orden que Julian especificó; los campos a nivel-ticket (PNR, tarifa, pasajero, etc.) se repiten en cada fila de tramo del mismo ticket — mismo patrón ya usado en `GestionReservas.jsx`/`GestionNominas.jsx` para explotar por pasajero (repetir en vez de hacer rowspan). El modal de detalle también se amplió con los mismos campos nuevos.

Verificado extremo a extremo con un script puntual (`cmd/debug_ticket_fields`, descartado después de usarlo): reserva + pasajero + producto de prueba con equipaje/vendedor/pedido reales, `GenerateTicketsForReservationInternal` devolvió un ticket con las 6 columnas nuevas y `Segmentos` correctamente poblados. `go build`/`go vet` y `npm run build`/lint, todos limpios.

## Tablas de Grupos/Oportunidades: columnas desalineadas + fondo del thead "saliéndose" del borde redondeado

**Síntoma** (reportado por Julian): la tabla de `GestionGrupos.jsx` se veía desalineada; la tabla de `GestionOportunidades.jsx` mostraba el fondo del `<thead>` saliéndose por el borde izquierdo, arriba y abajo.

**Causa raíz 1 — Grupos**: la tabla tenía la columna "Acciones" **al final**, la única de todo el repo así (el resto la tiene siempre primera, a veces `sticky`) — y ninguna `TableCell` tenía clase de alineación explícita. `Table.jsx` centra los `TableHead` por default (`text-center` en la clase base) pero **no** centra los `TableCell` (quedan alineados a la izquierda por default) — el resto de las pantallas compensa esto agregando `className="text-center"` a mano en cada celda; acá nunca se hizo, así que cada columna tenía el header centrado flotando sobre datos pegados a la izquierda.
**Fix**: "Acciones" movida a la primera columna (con sus botones `ActionIconButton`/`ActionsOverflow`, igual que el resto de la app); `text-center` agregado a todas las `TableCell`; "Lugares" y "Neto 01" (montos/conteos) alineados a la derecha con `font-mono`, igual que el resto de las tablas.

**Causa raíz 2 — Oportunidades**: la `Card` que envuelve la tabla no tenía `overflow-hidden`. Las dos primeras columnas (checkbox + Acciones) son `sticky` con `bg-slate-50` propio — sin `overflow-hidden` en el contenedor, ese fondo cuadrado se recorta contra las esquinas *rectas* del `<table>` en vez de las esquinas *redondeadas* (`rounded-3xl`) de la `Card`, así que sobresale visible en las 4 esquinas donde la columna sticky se cruza con el borde redondeado — más notorio arriba-izquierda (thead) y abajo-izquierda (última fila). Es el mismo bug ya documentado y corregido en Productos (`Card className="overflow-hidden"`, ver entrada de "Deploy roto" en este mismo archivo) que nunca se replicó en Oportunidades cuando se le agregó `sticky`. De paso se encontró el mismo gap en `GestionReservas.jsx` y `Availability.jsx` (ambas con columnas sticky, ninguna con `overflow-hidden`) — corregidas también aunque no habían sido reportadas todavía.
**Fix**: `overflow-hidden` agregado a la `Card` en los 3 archivos.

## `BandejaTickets.jsx` (`/tickets`) no seguía el diseño del resto de la app

**Síntoma** (reportado por Julian): "el diseño no corresponde al resto del sistema" en la página de tickets.

**Causa raíz**: toda la página estaba escrita con `style={{}}` inline y colores hex arbitrarios (`#2563eb`, `#0f172a`, `#e4e4e7`, etc.) en vez de Tailwind + el kit de componentes propio (`Button`/`Card`/`Badge`/`ActionIconButton`) que usa el resto de `Gestion*.jsx`. Además: el wrapper raíz tenía `style={{ padding: '1.5rem' }}` duplicando el padding que `Layout.jsx`'s `<main>` ya aplica; los botones de acción de la tabla eran `<button style={{}}>` a mano en vez de `ActionIconButton`; el badge de estado `void` usaba `variant: 'error'`, que no existe en `Badge.jsx` (quedaba sin ningún color aplicado); y el modal de detalle pasaba `title=""` a `Modal.jsx` intentando un header "de borde a borde" custom, pero `Modal.jsx` igual renderiza su propia barra de título (vacía) + botón de cerrar, dejando un header duplicado feo.

**Fix** (2026-08-13): reescrita la página completa usando el kit de componentes y clases Tailwind (paleta `slate` + variants reales de `Badge.jsx`), `ActionIconButton` en la columna Acciones, wrapper raíz sin padding propio, y el modal de detalle con un `title` real (el look de "boarding pass" quedó como un panel con gradiente DENTRO del contenido, no reemplazando el chrome del modal). Se armó [[Guía de Diseño (para agregar elementos nuevos)]] (004) para que esto no se repita en páginas futuras.

## Deploy roto: import duplicado/roto de `BulkSelectionBar.jsx` (`Trash2`/`CheckCircle2`)

**Síntoma**: build de Vercel fallaba con `The symbol "Trash2" has already been declared` (`GestionOportunidades.jsx:7`), y tras corregir eso, con `"CheckCircle2" is not exported by "BulkSelectionBar.jsx"` (`GestionProductos.jsx:20`).

**Causa raíz**: `BulkSelectionBar.jsx` (`components/ui/`) re-exporta un puñado de íconos de lucide-react "por conveniencia" (`export { Trash2, Copy, CheckCircle, XCircle };` — nótese `CheckCircle`, no `CheckCircle2`, son íconos distintos). Al agregar la barra de selección múltiple a `GestionOportunidades.jsx`/`GestionProductos.jsx`, esas páginas importaron `{ Trash2, CheckCircle2 }` desde `BulkSelectionBar.jsx` en vez de (u además de) `lucide-react`:
- `GestionOportunidades.jsx` ya importaba `Trash2`/`CheckCircle2` de `lucide-react` en otra línea → **declaración duplicada del mismo nombre**, error real de sintaxis de módulos ES (esbuild lo detecta en dev/build, no en runtime).
- `GestionProductos.jsx` importaba `CheckCircle2` únicamente de `BulkSelectionBar.jsx`, que **no exporta ese nombre** (solo `CheckCircle`) → import inexistente, error de Rollup en build de producción.

**Fix**: en ambos archivos, los íconos se importan solo de `lucide-react` (de donde realmente vienen) y el import de `BulkSelectionBar.jsx` quedó como debía ser desde el principio — solo el default export (el componente de la barra), sin re-exports de íconos.

**Cómo evitar que se repita**: `BulkSelectionBar.jsx` re-exportar íconos de lucide-react "por conveniencia" es un patrón frágil — cualquier página que también importe esos mismos íconos directo de `lucide-react` (lo normal) corre riesgo de duplicado o de pedir un nombre que ahí no existe. Si se necesita el ícono en la página, importarlo siempre de `lucide-react` directo; no depender de que un componente de UI los re-exporte.

## 5 vulnerabilidades críticas de seguridad backend (auditoría 2026-08-13) — corregidas

Detalle completo del hallazgo original en [[Auditoría de Seguridad y QA - 2026-08-13]] — acá solo el resumen de los fixes, ya aplicados.

1. **`/api/data` (CRUD dinámico sin permisos, auto-elevación a admin)**: eliminado el endpoint y `data_handler.go` entero (sin ningún caller real en el frontend, confirmado con Grep antes de borrar).
2. **Escalada de privilegios RBAC** (`agency_admin` podía auto-asignarse `SUPER_ADMIN`): `setUserRole` (`rbac_handler.go`) ahora recibe el `*gin.Context` del caller — bloquea asignar `SUPER_ADMIN` a quien no sea ya admin, y extiende el chequeo de agencia a TODOS los roles de sistema (antes solo corría para roles personalizados). `AssignPermissionsToRole` filtra los permisos otorgables al subset propio del caller. **De yapa, mismo hallazgo pero más directo** en `CreateUser`/`UpdateUser` (`user_handler.go`): `profile.Role`/`profile.Admin` se aplicaban del body sin restricción — cualquier caller con `USERS_CREATE`/`USERS_UPDATE` podía poner `role:"admin"` directo. Corregido con el mismo criterio "se ignora en vez de error" que el archivo ya usa para la reasignación de agencia cross-scope.
3. **`POST /auth/register` público aceptaba cualquier agencia** en el body: eliminada la ruta y la función `Register` (sin ninguna página de auto-registro en el frontend — el alta de usuarios sigue existiendo, pero solo vía `CreateUser` autenticado).
4. **Secreto JWT de fallback hardcodeado** (`"fallback_secret_key"` si faltaba `JWT_SECRET`): `Login` ahora falla cerrado (500), igual que `middleware/auth.go` ya hacía para validar tokens.
5. **`/orders/:id` (Confirmar/Editar/Doc.Contable/Borrar Pasajero) sin permiso ni ownership**: se agregó `RequirePermission("RESERVATIONS_UPDATE")` (ya otorgado por default a los roles base, no rompe flujos existentes) + un helper `callerOwnsReservation()` en los 4 handlers.

Verificado con `go build ./...` y `go vet ./...`, ambos limpios.

## Deploy roto: módulo "Oportunidades" armado con la estructura de OTRO proyecto (alias `@/`, componentes shadcn con otro nombre)

**Síntoma**: build de Vercel fallaba con `Rollup failed to resolve import "@/contexts/AuthContext" from ".../GestionOportunidades.jsx"`.

**Causa raíz**: el módulo completo de "Oportunidades" (`GestionOportunidades.jsx`, `OportunityForm.jsx`, `useOpportunities.ts`, `opportunitySchema.ts` — frontend; handler/rutas/modelo/migración ya existían del lado backend) se había commiteado usando convenciones de un scaffold shadcn/ui genérico que **no coinciden con este repo**:
- Alias `@/` para imports — este proyecto **no tiene ningún alias configurado** en `vite.config.js`, todo se importa con rutas relativas (`../contexts/AuthContext`).
- Nombres de componentes UI genéricos (`components/ui/button`, `dialog`, `select`, `alert-dialog`) — acá los mismos componentes existen con prefijo `shadcn-` (`shadcn-button.jsx`, `shadcn-dialog.jsx`, `shadcn-select.jsx`) y exports nombrados distintos (`ShadcnButton as Button`, `ShadcnInput as Input`) — ver el patrón ya establecido en `Notificaciones.jsx`/`Settings.jsx`.
- `apiCall()` genérico desde `@/lib/apiClient` — no existe; el cliente HTTP real del proyecto es la clase `ApiClient` (`services/apiClient.js`, métodos estáticos `.get/.post/.put/.delete`).
- `AlertDialog` (confirmación modal tipo shadcn) — **no existe en este proyecto**, solo hay un `Alert` simple (banner estático, `shadcn-alert.jsx`: `Alert`/`AlertTitle`/`AlertDescription`). El patrón real de confirmación en toda la app es `Swal.fire({...})` (SweetAlert2).

Lo demás (paquetes npm `react-hook-form`/`@hookform/resolvers`/`zod`, permisos RBAC `OPPORTUNITIES_*` en `seedRBAC()`, rutas `/opportunities` en ambos entrypoints, entrada en el Sidebar) sí estaba bien armado — el problema era puramente la capa de imports/componentes del frontend.

**Fix** (2026-08-12): reescritos los imports de los 3 archivos frontend a rutas relativas + componentes `shadcn-*` reales; `useOpportunities.ts` reescrito para usar `ApiClient`; el `AlertDialog` de confirmación de borrado reemplazado por `Swal.fire` (mismo patrón que `GestionProductos.jsx`/`GestionTemporadas.jsx`).

**Cómo evitar que se repita**: si aparece código nuevo (propio o pegado de otra fuente/herramienta) que importe con alias `@/` o que use nombres de componente `components/ui/algo` sin el prefijo `shadcn-`, es una señal de que se generó para otra estructura de proyecto — revisar contra los imports reales de `Notificaciones.jsx`/`Settings.jsx` antes de asumir que va a compilar.

**Segunda pasada, mismo día**: el build ya compilaba pero la página no tenía el mismo diseño que el resto (Julian: "el topbar dice Panel y no Oportunidades, falta el logo, faltan los botones"). Causa: `GestionOportunidades.jsx` nunca usaba `<PageHeader>` — el componente que alimenta el título/ícono/acción del topbar vía `HeaderContext` (`Layout.jsx` solo cae al título por defecto de `getTitleByPath()` si la página no llama a `PageHeader`). Se rehizo la página completa con los componentes propios de la app (`PageHeader`, `Card`, `TableComponent`, `Badge`, `ActionIconButton` con Acciones como primera columna) en vez de los `shadcn-*`, y `OportunityForm.jsx` pasó de `react-hook-form` (que necesita inputs con `forwardRef`, y el `Input.jsx` de esta app no lo tiene) a un formulario controlado simple, mismo patrón que `GestionTemporadas.jsx`.

**Tercera pasada, mismo día**: ajustes puntuales al modal `OportunityForm.jsx` pedidos por Julian —
- **Temporada**: pasó de input de texto libre a `<select>` poblado con `useTemporadas()`, mismo patrón que `ProductForm.jsx` (filtra `t.activa || t.nombre === form.temporada`, más un `<option>` de fallback si el valor viejo ya no está activo).
- **Labels**: "Estado (Admin)" → "Estado", "Estado Interno" → "Estado Aerolínea" — solo el label visible, el campo sigue siendo `estado_interno` en el modelo/API (no se tocó backend).
- **Compañía**: sigue siendo texto libre (por si la aerolínea no está en el diccionario) pero ahora autocompleta con `<datalist>` nativo contra `airlineNames` (`frontend/src/lib/data/airlineNames.js`, el mismo diccionario integrado antes para `ItineraryTable.jsx`).

Aprovechando el cambio, auditoría de "componentes sin uso" en `frontend/src/`: un primer script bash (grep por nombre de archivo) dio 32 candidatos pero con falsos positivos conocidos, así que se re-verificó cada uno individualmente con Grep dirigido (import real, no coincidencia de substring) antes de borrar nada. Confirmados y eliminados 35 archivos genuinamente huérfanos:
- `components/ExportButton.jsx`, `GlobalSearch.jsx`, `KeyboardShortcuts.jsx`, `LanguageSelector.jsx`, `OnboardingGuide.jsx` — restos de un shell de app abandonado, nunca importados en ninguna página.
- `components/reports/{AgencyShareChart,DestinationDetailTable,EvolutionChart,KPIsRow,OccupancyHeatmap,ProductPerformanceTable,ProgressLoader,ReportFilters,RiskAlertsTable,TopDestinationsChart,TooltipForIcons}` — versión vieja/duplicada del dashboard de Reportes; `Reportes.jsx` real usa otro set con otros nombres (`DashboardChart`, `DataTable`, `DepartureTable`, `FiltersPanel`, `KpiPanel`, `PeriodSelector`, `TabsCharts`, que sí siguen en uso).
- `components/ui/{Accordion,Dialog,DropdownMenu,FilterBadge,SidebarTrigger,Tooltip}.jsx` + 8 componentes `shadcn-*` sin uso (`shadcn-accordion/alert/avatar/checkbox/popover/progress/radio-group/separator/skeleton/slider/switch/tabs`) — nunca importados; los `shadcn-*` realmente usados por `Settings.jsx`/`Notificaciones.jsx` (button/card/input/label/table/dialog/textarea/select/badge/dropdown-menu/tooltip) no se tocaron.
- `schemas/opportunitySchema.ts` — huérfano directo de esta misma tercera pasada, ya que `OportunityForm.jsx` había dejado de usar `react-hook-form`/`zod` en la segunda pasada.

Verificado con `npm run build` (limpio) y `npm run lint` (0 errores en cualquier archivo tocado o borrado; el lint completo del repo tiene ~800 errores preexistentes que vienen de lintear `dist/` por un gap de config, no relacionado a este cambio).

**Cuarta pasada**: "Estado Aerolínea" (`estado_interno`) pasó de texto libre a `<select>` con 4 opciones fijas del lado frontend (`Cotizado`/`Rechazado por la aerolínea`/`Confirmado`/`Vencido` — el campo en sí sigue siendo `*string` sin constraint en DB, el enum vive solo en `OportunityForm.jsx`). Al elegir "Rechazado por la aerolínea" se dispara un popup (`Swal.fire` con `input: 'select'`, sin librería nueva) pidiendo el motivo: `Tarifa alta`/`Fechas incorrectas`/`Exceso de oferta`/`Vencido`, guardado en el nuevo campo `Opportunity.MotivoRechazo` (`*string`, migración `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS motivo_rechazo`) — el motivo queda visible bajo el select con un link "Cambiar motivo" para reabrirlo. `Vencido` en ambos combos es manual por ahora: no se armó lógica automática que lo setee solo al pasar la fecha de validez (no fue pedido explícitamente; requeriría un cron o un chequeo al leer la oportunidad).

Después, mismo hilo de conversación, se construyó el flujo "Convertir Oportunidad a Producto" — ver *Flujos de Funcionalidades* sección 19 y *Modelo de Datos* (`Opportunity.ProductoID`/`Estado="producto"`, `Product.PendienteAprobacion`) para el detalle completo, no se repite acá.

## Notificación "nuevo producto" llegaba a usuarios de TODAS las agencias, no solo a la dueña

**Síntoma** (reportado por Julian, auditoría a pedido): pidió revisar las notificaciones porque sospechaba que llegaban avisos que no le correspondían a un usuario común.

**Causa raíz**: `CreateProduct` y `BulkCreateProducts` (`product_handler.go`) usaban `services.NotifyBroadcastByCode(..., "new_product"/"new_product_bulk", ...)` — un producto es privado de su agencia dueña (nadie más lo ve ni lo puede reservar salvo cesión/compartir explícito), pero el aviso de "se cargó" se mandaba a todos los usuarios del sistema sin excepción, de cualquier agencia. Auditando el resto de los `Notify*ByCode` del código (`order_handler.go`, `group_handler.go`, `cron_handler.go`, `transfer_handler.go`, `deadline_cron_handler.go`) no se encontró ningún otro caso mal scopeado — todos usan `NotifyUserByCode`/`NotifyAgencyByCode`/`NotifyRoleByCode("admin")` correctamente.

**Fix** (2026-08-12): cambiado a `NotifyAgencyByCode(product.Agencia, ...)` — en la carga masiva, agrupado por agencia (`countByAgency`) ya que un mismo import puede traer productos de varias agencias a la vez. Además se detectó que ninguno de los dos casos (ni `product_changed`, el aviso de cambio de itinerario a quien tiene el cupo reservado) disparaba un email real, solo la notificación in-app — se agregó `services.SendTemplateEmailToAgency()` (nuevo, para "toda la agencia por email") y las plantillas de email faltantes. Ver regla 13 de [[Gotchas y Reglas de Oro]] para el detalle completo y el patrón a seguir en notificaciones nuevas.

## `AddPassenger` guardaba Neto1 = 0 si no venía explícito en el request

**Síntoma**: Julian corrigió una nota mal formulada donde se describía `Neto1` como un valor "legado"/global — en realidad el Neto1 real de una venta siempre es `Tarifa + Impuestos` del tipo de ESE pasajero (ADT/CHD/INF), igual que `OP` (ver regla 11 de [[Gotchas y Reglas de Oro]]). Al re-auditar todos los puntos donde se asigna `Passenger.Neto1`, `CreateReservation` ya estaba bien (usa `product.NetoForTipo(tipoPasajero)` desde la Fase 3 del backlog UTG) pero **`AddPassenger` no tenía ese mismo fallback**.

**Causa raíz**: en `AddPassenger` (`order_handler.go`), `neto1` se declaraba como `float64` (cero por defecto) y solo se llenaba `if input.Neto1 != nil` — a diferencia de `CreateReservation`, nunca caía a `product.NetoForTipo(tipoPasajero)` cuando el campo no venía en el body. Agregar un pasajero desde Gestión de Nóminas (botón "+") sin tipear manualmente un Neto1 dejaba ese pasajero con `Neto1 = 0` en la DB — silencioso, sin error visible.

**Fix** (2026-08-11): `neto1 := product.NetoForTipo(input.TipoPasajero)` como valor base, sobreescrito solo si `input.Neto1 != nil` viene con un override explícito — mismo criterio que `CreateReservation`.

## Cálculo de tipo de pasajero no consideraba la fecha de regreso

**Síntoma** (feedback UTG): un pasajero que cambia de categoría (infante→menor, menor→adulto) entre la fecha de salida y la de regreso quedaba mal clasificado. Caso de prueba: nacimiento 02/01/2027, regreso 09/01/2027, quedaba "Infante" cuando no correspondía.

**Causa raíz**: `calcTipoPasajero(nacimiento, fechaSalida)` en `frontend/src/pages/Availability.jsx` solo recibía `selectedProduct?.fecha_salida` en sus 2 invocaciones — `selectedProduct.fecha_regreso` ya existía y se mostraba en el mismo componente, pero nunca se pasaba al cálculo de edad. El backend no recalcula nada al recibir la reserva (confía en el `tipo_pasajero` que manda el cliente).

**Fix** (2026-08-10): las 2 invocaciones ahora pasan `selectedProduct?.fecha_regreso || selectedProduct?.fecha_salida` (fallback si el producto es solo ida). Mismo criterio de "edad al regreso" que ya usaba `cumpleEdadMenor2Anios` en `analytics_handler.go`, pero nunca se había aplicado en el punto donde se fija el valor al cargar la reserva.

## Contador ADT-CHD-INF de Nóminas no se movía al confirmar

**Síntoma** (feedback UTG): al confirmar/vender pasajeros, el desglose ADT-CHD-INF en Gestión de Nóminas no cambiaba.

**Causa raíz**: `countPassengerTypes` en `frontend/src/pages/GestionNominas.jsx` contaba **todas** las filas de pasajeros sin filtrar por `estado` — a diferencia de los badges "Confirmadas/Pendientes" vecinos, que sí filtran. Un pasajero ya estaba contado desde que se creaba (pendiente), así que confirmarlo no cambiaba el total — no era un bug de memoización, el `useMemo` estaba bien.

**Fix** (2026-08-10): se excluyen del conteo los pasajeros en `cancelada`/`cancelado` (los estados `expirada`/`cedido` ya se filtraban antes, al armar el array `reservations`). Si esto no coincide exactamente con lo que UTG espera ver (¿debería ser solo confirmados, no pendientes+confirmados?), es lo primero a confirmar con ellos.

## "Cedido" invertido/ambiguo para una agencia que da y recibe cupos (UTG)

**Síntoma** (feedback UTG): en los casos de prueba, reservas genuinas aparecían marcadas como cedidas y viceversa. UTG cede algunos cupos y recibe otros — actúa en ambos roles.

**Causa raíz, parte 1 (backend)**: `GetAllReservations` (`order_handler.go`) solo matcheaba `Reservation.Agencia = mi agencia` o `Product.Agencia = mi agencia`. Un producto-espejo de cesión nace con `Agencia=""` — así que la agencia **cedente** nunca veía las ventas que la agencia receptora hacía sobre el espejo, pese a que el comentario de `RosterProductID` ya asumía que sí las vería ("el dueño ve TODOS sus pasajeros juntos... los vendidos por agencias a las que les cedió").

**Causa raíz, parte 2 (frontend)**: al agregar el match faltante (`source_agency`) en el backend, esas ventas se volvieron visibles para la agencia cedente — pero el ternario que decide el badge en `GestionReservas.jsx` y `GestionNominas.jsx` asumía que "si `original_agency` está seteado, SIEMPRE soy quien recibió el cupo" y mostraba "Cupo cedido de {original_agency}". Para la agencia cedente viendo su propio código en `original_agency`, esto literalmente mostraba "Cupo cedido de mí mismo" — la fuente real del síntoma "invertido".

**Fix** (2026-08-10):
1. `order_handler.go`: el WHERE de `agency_admin` ahora también matchea `product.source_agency = mi agencia` (mismo patrón que el scope `management` de `GetProducts`).
2. `GestionReservas.jsx`/`GestionNominas.jsx`: el ternario del badge ahora compara `original_agency` contra la agencia del usuario logueado (`useAuth().user.agencia`) — si coincide (soy el cedente), muestra "Cedido a {agencia que vendió}" en vez de "Cupo cedido de {mí mismo}".

**Riesgo a vigilar**: el match nuevo solo amplía visibilidad para la propia agencia contra sus propios productos-espejo (`source_agency = mi agencia`) — no debería abrir visibilidad entre agencias no relacionadas. Si aparece un reporte de "veo reservas que no debería", empezar por acá.

## Contenido cortado / clipeado con el sidebar expandido

**Síntoma**: el contenido principal aparecía recortado en el borde derecho cada vez que el sidebar estaba expandido (se veía bien colapsado). Se reportó varias veces.

**Causa raíz real**: `frontend/src/index.css` tenía una regla de elemento crudo `main { min-width: calc(100vw - 100px); }` — un resabio de antes de que existiera la arquitectura flex/sidebar actual (hay un solo `<main>` en toda la app, en `Layout.jsx`). Con el sidebar expandido (~240px), ese mínimo forzado excedía el espacio flex real disponible para `<main>` (`100vw - 240px`), forzando overflow que quedaba recortado en silencio por un `overflow-x-hidden` que se había agregado en un intento de fix anterior (en vez de mostrar scroll).

**Intentos previos que NO funcionaron** (dos rondas, antes de encontrar la causa real): normalizar el valor de ancho del white-label en `Sidebar.jsx`; endurecer el flex column de `Layout.jsx` con `w-0`/`min-w-0`/`overflow-x-hidden`. Ninguno tocaba la regla real en `index.css`.

**Fix** (2026-07-09): borrar la línea `min-width` de esa regla en `index.css`.

**Si reaparece**: antes de volver a tocar clases flex de `Sidebar.jsx`/`Layout.jsx`, revisar si una regla de elemento plano nueva (en `index.css` o donde sea) está imponiendo un `min-width`/`min-height` relativo al viewport sobre `main`, `body` o similar.

---

## Marca Blanca (White-Label): cambiar fuente/color no aplicaba nada al sitio

**Síntoma**: cambiar la tipografía en `WhiteLabelConfig.jsx` nunca cambiaba la fuente real del sitio.

**Causa raíz**: tres bugs independientes y acumulativos, los tres en `frontend/src/contexts/WhiteLabelContext.jsx`:

1. **`loadConfig()` leía la forma de campo equivocada.** El backend (`white_label_handler.go`) siempre devuelve/guarda un único blob JSON anidado (`dbConfig.colors.primary`, `dbConfig.fonts.heading`) — nunca columnas planas — pero `loadConfig()` leía claves planas (`dbConfig.primary_color`, `dbConfig.font_heading`) que jamás existieron en la respuesta, así que `colors`/`fonts` siempre caían en silencio a los defaults hardcodeados sin importar lo guardado. (`identity`/`sidebar` ya estaban bien mapeados — anidado primero, plano como fallback — el bug era solo en `colors`/`fonts`.)
2. **Doble comillado del font-family** en `applyCSSVariables()`: envolvía el valor **completo** de fuente (que podía ya ser un stack tipo `"Poppins, system-ui, sans-serif"`) dentro de comillas, produciendo un nombre de familia inválido con comas embebidas — el navegador no podía matchearlo y caía silenciosamente al fallback genérico `ui-sans-serif`, sin importar qué fuente se elegía. Fix: extraer solo el nombre de la fuente primaria antes de comillar (`primaryFontName()`), retroactivo (no requiere re-guardar filas viejas con el stack antiguo).
3. **Ninguna web font se cargaba.** `frontend/index.html` no tenía ningún `<link>` de fuente — de las 8 opciones ofrecidas (Inter, Roboto, Poppins, Montserrat, Open Sans, Lato, Nunito, DM Sans), solo la que ya estuviera instalada en el sistema operativo podía renderizar. Fix: agregado un `<link>` de Google Fonts con las 8 + JetBrains Mono.

**Bug relacionado corregido de paso**: el efecto de preview en vivo de `WhiteLabelConfig.jsx` llamaba `applyCSSVariables(flat)` cuando `flattenForCSS()` en realidad devuelve `{ config: {...} }` — debía ser `applyCSSVariables(flat.config)`. Por esto la vista previa de la propia página de ajustes no mostraba ningún cambio antes de guardar.

**Fix**: 2026-07-09, todo en `WhiteLabelContext.jsx`.

**Pendiente, NO corregido (no reportado todavía)**: `buttons`/`layout` en `loadConfig()` tienen un desajuste **distinto y más profundo** — nombres de campo directamente distintos entre lo que `WhiteLabelConfig.jsx` guarda (`borderRadius`, `paddingX`, `paddingY`, `maxWidth`, etc.) y lo que `applyCSSVariables` espera (`radius`, `border_radius_sm`, etc.). Si llega un reporte de "cambié el radio de los botones y no pasó nada", empezar por ahí — mismo patrón de bug que fonts/colores, pero con otro mapeo de nombres.

---

## `GET /api/reports/user-metrics` 404 en local

**Síntoma**: el endpoint de métricas personales devolvía 404 corriendo el backend en local (`go run ./cmd/api`), aunque funcionaba en producción y estaba documentado.

**Causa raíz**: instancia real de la regla 1 de [[Gotchas y Reglas de Oro]] — la ruta estaba registrada en `api/index.go` (Vercel) pero faltaba por completo en `cmd/api/main.go` (local).

**Fix** (2026-08-10): agregada `protected.GET("/reports/user-metrics", handlers.GetUserMetrics)` a `main.go`, en el mismo punto (fuera del grupo `reports` con `RequirePermission("REPORTS_VIEW")`, directamente sobre `protected`) que ya tenía `index.go` — coherente con que este endpoint es "solo sesión", sin el permiso `REPORTS_VIEW`.

**Cómo se encontró**: comparando la lista de rutas (`grep` + `comm`) entre ambos entrypoints mientras se armaba esta documentación — vale la pena repetir ese chequeo periódicamente, no solo cuando ya hay un síntoma reportado.

---

## Retirado: hardcodeo binario "Jetmar" vs "Tienda Viajes" en Reportes

**No es un bug con síntoma de usuario** — es un patrón retirado que vale la pena recordar si reaparece la pregunta "¿por qué Reportes sigue diciendo Jetmar/Tienda?" o "¿por qué el filtro de agencia no afecta a Y?".

El módulo de Reportes (`analytics_handler.go`) tenía una función `isTienda(agencia string) bool` (`strings.Contains(normalize(agencia), "tienda")`) usada en tres handlers (más un `GetAgencyShare` legacy sin uso en `report_handler.go`) para partir todo en un binario Jetmar/Tienda Viajes en vez de agrupar por la agencia real. **Confirmado retirado** (`isTienda` ya no existe en el código, verificado 2026-08-10) — los cuatro ahora agrupan dinámicamente por `Reservation.Agencia` real (`intMapKeys`/`mapToSlice` + una paleta de 8 colores cíclica, espejada en el frontend como `AGENCY_PALETTE` en `Reportes.jsx` y `pastelPalette`/`palette` en `DashboardChart.jsx`).

**Dos matchers de filtro, no simétricos** (ver también regla 10 de [[Gotchas y Reglas de Oro]]): `passengerMatches` (filtra por `Reservation.Agencia`, quién vendió) y `productMatches` (filtra por `Product.Agencia`, quién es dueño). Ambos confirmados presentes en `analytics_handler.go` a la fecha de esta nota. Un filtro nuevo en `FiltersPanel.jsx` puede andar en los handlers que usan uno y ser un no-op silencioso en los que usan el otro, si no se agrega a los dos.

`agency_admin` queda force-scopeado server-side a su propia agencia en los handlers que usan `passengerMatches`, sin importar qué filtros mande; `admin` ve todo por defecto y puede acotar con el filtro "Agencia" (solo visible para admin en `FiltersPanel.jsx`, es un control muerto para `agency_admin`). El panel de admin de `Dashboard.jsx` (`DashboardCharts.jsx`) fue en su momento 100% mock — hoy está conectado a datos reales, siempre acotado a la agencia del usuario que lo mira (a diferencia de `Reportes.jsx`, donde admin ve todas las agencias) — decisión de producto explícita, no un bug.
