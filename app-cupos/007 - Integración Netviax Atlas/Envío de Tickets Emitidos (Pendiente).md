**Nada de esto está construido todavía.** Esta nota es el punto de partida para la próxima fase de desarrollo con Netviax: reportar hacia Atlas el detalle de los tickets ya emitidos (nosotros → Atlas, al revés de todo lo documentado en [[Búsqueda de Contactos (Lectura)]] y [[Búsqueda de Fichas (Lectura)]], que es Atlas → nosotros). Objetivo de esta nota: que la estructura, lo que sabemos y lo que falta confirmar con Netviax quede 100% claro antes de la próxima conversación con ellos.

> Última verificación contra código: 2026-08-10. Estado: **sin cambios desde entonces** — nada nuevo implementado.

## 1. Qué necesitamos comunicarle a Atlas

Cuando un pasajero queda **emitido** (ticket asignado y confirmado) en el Sistema de Cupos, la idea es que Atlas se entere — para que su backoffice quede sincronizado con la venta real, sin que alguien lo cargue a mano ahí también.

Datos que en principio Atlas necesitaría recibir por pasajero emitido:
- Identificación del pasajero/contacto en Atlas (`ContactoCodigo`, si el pasajero se cargó vía búsqueda de contacto/ficha; puede no existir si el pasajero se tipeó a mano sin buscarlo en Atlas primero — a resolver con Netviax, ver checklist).
- Número de ticket.
- Ficha de venta asociada (número).
- Localizador/PNR, compañía, ruta, fecha de salida.
- Precio de venta.

## 2. Qué tenemos disponible de nuestro lado, listo para mapear

| Dato | Campo en nuestro modelo |
|---|---|
| Número de ticket | `Passenger.NumeroTicket` |
| Precio de venta (por pasajero) | `Passenger.PrecioVenta` |
| Documento / Pasaporte | `Passenger.Documento` / `Passenger.Pasaporte` |
| Ficha de venta | `Reservation.FichaVenta` |
| Localizador / PNR | **Resuelto 2026-08-15**: `Ticket.PNR` ahora es el PNR real de la aerolínea (`Product.PNR`), no el ID de pedido interno |
| Compañía / Ruta / Fecha de salida | `Reservation.VueloCompania` / `Reservation.VueloRuta` / `Reservation.VueloSalida` |
| Itinerario normalizado por tramo (nro. vuelo, fecha, origen, destino, salida, llegada) | **Nuevo 2026-08-15**: `Ticket.Segmentos` (JSONB, array — un ticket puede tener más de 1 tramo), calculado con `services.ParseRuta()` (`backend-go/pkg/services/itinerary_parser.go`). Esto es exactamente el shape que un endpoint de boletaje de Atlas probablemente va a pedir por tramo — ver [Modelo de Datos §Ticket](../005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md#ticket-tabla-tickets--bandeja-de-tickets) para el detalle completo de campos. |
| Marca de "ya reportado a Atlas" | `Reservation.StatusBack` — **ya existe**, hoy es una anotación manual libre (ej. "BO OK"), pensado desde el vamos para pasar a automático el día que exista esta integración |
| Momento en que se decide "está emitido" | `Reservation.EstadoInterno` pasando a `"Emitido"` → dispara `Reservation.EmitidoAt` (se calcula solo, una vez) |

Ver [Modelo de Datos §1](../005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md#1-núcleo-del-negocio-product-reservation-passenger) para el resto de los campos de `Reservation`/`Passenger`.

**El punto de partida natural para el trigger de esta integración es el momento en que `EstadoInterno` pasa a `Emitido`** — es el único punto del sistema donde hoy ya se distingue "vendido" de "efectivamente emitido/ticketeado".

## 3. Candidatos de endpoint en Atlas (sin confirmar)

Según la colección Postman de Netviax (la misma que documenta los endpoints de lectura ya implementados — ver [[Conexión y Estructura General]]), existen dos endpoints de escritura que nunca se llegaron a mirar en detalle porque esta integración arrancó como solo-lectura:

- **`wscontactoguardar`** — alta/edición de un contacto. El código ya documentado asume (comentario en `netviax_atlas_service.go`) que su shape de request es el mismo que el de respuesta de `wscontactodetallebuscar` (`WSContacto`, ~90 campos en total según la colección, de los cuales solo modelamos 13 hoy). Sirve para actualizar datos de un contacto — **no está claro que sea el lugar correcto para reportar un ticket emitido**, ya que un contacto es una persona, no una venta.
- **`wsfichaguardar`** — alta/edición de una ficha de venta. Candidato más natural si Atlas modela el número de ticket a nivel de la ficha o de cada contacto-dentro-de-la-ficha (similar a como `wsfichabuscar` ya devuelve un array `Contactos` por ficha, ver [[Búsqueda de Fichas (Lectura)]]) — pero el shape exacto de request/response **no está confirmado**, no hay ningún ejemplo guardado en la colección Postman para este endpoint tampoco.

**Ninguno de los dos es seguro sin confirmar con Netviax primero.** Es posible que exista un tercer endpoint de "boletaje"/emisión dedicado que no está en la porción de la colección Postman que se revisó — ver el checklist abajo.

## 4. Gotchas del proveedor que aplican a esta fase (anotados, sin re-verificar desde que se anotaron)

Estos vinieron de la documentación/colección de Netviax en su momento, no del sandbox real (nunca se llegó a probar un guardado) — tratarlos como hipótesis a confirmar, no como hechos:

- **Buscar antes de crear.** Atlas espera que se busque un contacto (`wscontactobuscar`) antes de intentar crear uno nuevo — evita duplicados. Cualquier flujo de escritura debería primero intentar resolver el `ContactoCodigo` existente.
- **Campos planos, no arrays anidados** en el request de guardado de contacto (a diferencia de, por ejemplo, el array `Contactos` que sí devuelve `wsfichabuscar` al leer una ficha).
- **No reintentar un guardado a ciegas ante un `5xx`.** Por el gotcha de [[Conexión y Estructura General]] (Atlas puede devolver `5xx` con la operación ya aplicada), reintentar un `wscontactoguardar`/`wsfichaguardar` sin decodificar primero la respuesta real podría duplicar la operación.
- **Dígito verificador de cédula uruguaya**: Atlas valida (o exige) el dígito verificador de la CI uruguaya en algún punto del guardado — a confirmar exactamente dónde y con qué severidad de error.

## 5. Checklist para la próxima conversación con Netviax

1. ¿Qué endpoint corresponde para reportar que un pasajero fue **emitido/ticketeado** — es a nivel de Ficha (`wsfichaguardar`), de Contacto (`wscontactoguardar`), o existe un endpoint de boletaje/emisión dedicado que no vimos en la colección que tenemos?
2. Pedir **ejemplos reales de request y response** para ese endpoint — la colección Postman actual no trae ninguno guardado para los endpoints de escritura (fue el mismo problema que retrasó confirmar `wscontactobuscar` al principio).
3. Confirmar la **URL de test/sandbox real** — la que tenemos hoy hardcodeada (`https://api-atlas-netviax-com-test.azurewebsites.net/rest`) nunca se probó contra un request real.
4. Confirmar si el **whitelisting de IP** (Netviax filtra por IP de origen desde 2026-07-01) aplica también al ambiente de test, y qué IP habría que whitelistear una vez decidido el hosting final (hoy Vercel serverless no tiene IP de salida estática — este punto sigue diferido, ver [[Conexión y Estructura General]]).
5. Confirmar si el campo `Error`/`Mensaje` de éxito/fracaso viene consistente en el/los endpoint(s) de escritura, o si hay que blindarse con `AtlasFlexString` igual que en los de lectura (ver el gotcha de tipos en [[Conexión y Estructura General]]).
6. Confirmar si Atlas necesita el `ContactoCodigo` para asociar el ticket a un contacto ya existente, y qué hacer si el pasajero emitido nunca se buscó en Atlas (se tipeó a mano) — ¿hay que crearlo antes (`wscontactoguardar`) o Atlas acepta reportar el ticket sin contacto asociado?

## 6. Una vez confirmado el endpoint y el shape

El patrón de implementación a seguir es el mismo que ya usan los 4 endpoints de lectura (ver [[Conexión y Estructura General]]): un struct de request con `AtlasCredentials` embebido, `AtlasEnvelope`/`AtlasFlexString` para decodificar éxito/error, y `doAtlasRequest()` para la llamada HTTP (que ya maneja el gotcha del `5xx`-con-éxito). No hace falta reinventar la capa de transporte — solo modelar el struct nuevo en `netviax_atlas_service.go`, el handler en `backoffice_handler.go` (o uno nuevo si el dominio lo justifica) y actualizar `Reservation.StatusBack` a algo automático en vez de la anotación manual actual.
