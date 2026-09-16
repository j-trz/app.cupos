**Nada de esto está construido todavía.** Esta nota es el punto de partida de una integración nueva: publicar/sincronizar `Product` (cupos) hacia **Travelcompositor** (Travel Compositor API), con ida y vuelta (no solo lectura, como arrancó en su momento [[../007 - Integración Netviax Atlas/Conexión y Estructura General|Netviax Atlas]]). Se va completando a medida que Julian pasa documentación de la API — cada sección de abajo tiene lo que ya sabemos y lo que falta confirmar. Credenciales/autenticación/convenciones generales ya confirmadas por la doc oficial → ver [[Conexión y Estructura General]], no repetidas acá.

> Kickoff: 2026-09-15. Nombre de plataforma confirmado 2026-09-15: **Travelcompositor**.

## 1. Qué pidió Julian (textual)

> "Vamos a agregar un módulo que envía vía API el producto a una plataforma externa, la idea es poder cargar productos y tener todo el ida y vuelta."

Lectura inicial: no es un one-way push — hay datos que también vuelven desde la plataforma hacia el Sistema de Cupos. Qué datos exactamente, en qué dirección y con qué disparador, **sin confirmar todavía** (ver checklist).

## ✅ 1.b — Resuelto: existe una API de proveedor separada (2026-09-15)

Julian confirmó: el objetivo es carga masiva de productos + gestión de inventario en Travelcompositor, y que se sincronice acá cuando hay un book del lado de ellos. La API narrada en el clip de Julian (Quote/Confirm/Prebook/Book, ver [[API Transportes (Búsqueda y Reserva)]]) es efectivamente solo de distribución — pero explorando directamente el spec OpenAPI completo del API (`https://online.travelcompositor.com/resources/swagger.json`, 141 endpoints) apareció la familia de tags **`Contract - Transport`/`Contract - Hotel`/`Contract - Ticket`/`Contract - Transfer`/`Contract - Golf`/`Contract - Supplier`** — esa es la API de alta/edición de inventario propio que faltaba. Documentada en detalle en [[API Contrato de Proveedor (Alta y Gestión de Inventario)]]: jerarquía Supplier → Contrato (ruta) → Option (tarifa + `inventories[]`, el stock real). El webhook de booking (`CREATED`/`MODIFIED`/`CANCELED`, ya documentado en la sección Webhooks del clip de Julian) es la pieza que cierra "que se sincronice el inventario en la app" cuando alguien reserva del lado de Travelcompositor.

**Ya no es bloqueante** — el resto de esta nota se actualiza para reflejar el nuevo mapeo real.

## 2. Identidad y alcance

- **Nombre de la plataforma externa**: **Travelcompositor** (Travel Compositor API) — confirmado 2026-09-15.
- **Nosotros → plataforma**: alta/edición de contrato de transporte (ruta) + option (tarifa/inventario) vía `Contract - Transport` (ver [[API Contrato de Proveedor (Alta y Gestión de Inventario)]]). Confirmado 2026-09-15 — el objetivo es publicar `Product` (posiblemente también Hotel/Ticket/Transfer si aplica, mismo patrón, sin explorar en detalle todavía).
- **Plataforma → nosotros**: cuando alguien reserva contra nuestro inventario del lado de Travelcompositor, llega un webhook (`type: CREATED/MODIFIED/CANCELED`) con el `bookingReference` — hay que consultar el detalle (`GET /booking/getBookings/{micrositeId}/{bookingReference}`) y reflejarlo en nuestro stock (`Product.Disponibilidad`/`Vendidos`). **Sin confirmar todavía**: si además hace falta crear una `Reservation` propia por cada venta de Travelcompositor (para que aparezca en Gestión de Reservas/Nóminas como cualquier otra venta), o si alcanza con solo ajustar el contador de stock.
- **¿Reemplaza o convive con algo existente?** (Netviax Atlas es un backoffice de contactos/fichas, no de catálogo de productos — en principio esta integración es un proveedor nuevo y distinto, a confirmar que no se superponen).

## 3. Disparador (trigger)

- **Nosotros → Travelcompositor**: sin confirmar todavía — ¿push automático al crear/guardar un producto en Gestión de Productos, botón manual ("Publicar"/"Sincronizar"), proceso batch programado (cron), o combinación?
- **Travelcompositor → nosotros**: **resuelto** — es webhook entrante (no polling), configurado desde su Backoffice hacia una URL nuestra, con hasta 3 endpoints por microsite y un token secreto embebido en la URL (ver [[API Contrato de Proveedor (Alta y Gestión de Inventario)]] sección 5). Igual aplica el mismo gotcha ya anotado para Atlas sobre IP de salida no estática en Vercel serverless — pero acá es al revés: nosotros somos quienes exponemos el endpoint que Travelcompositor llama, no al revés, así que no aplica directamente (el problema de IP saliente es para llamar HACIA otro sistema, no para recibir).

## 4. Alcance por agencia — sin confirmar

- ¿Todas las agencias publican con una sola cuenta/credencial de la plataforma, o cada agencia tiene la suya propia? (Mismo patrón ya resuelto para `AtlasConfig` y, más recientemente, `AIProvider` — ver [[../006 - Operación y Mantenimiento/Historial de Bugs Resueltos|Historial de Bugs Resueltos]], caso `AIProvider` scopeado por agencia 2026-09-15 — probablemente el mismo criterio aplica acá: credenciales + visibilidad scopeadas por `Agencia`, admin ve/gestiona todas.)
- ¿Todos los productos se publican automáticamente, o es opt-in por producto/agencia?

## 5. Técnico

**Ya confirmado** (ver [[Conexión y Estructura General]]): autenticación en 2 pasos (`username`/`password`/`micrositeId` → token JWT válido 7200s), formato REST/JSON, `Accept-Encoding: gzip` obligatorio en todo request, `traceId`/`Travelc-Trace-Id` para soporte.

**Todavía sin confirmar** (se completa con la próxima tanda de documentación):
- **Resuelto 2026-09-16**: el token va como header plano `auth-token: <token>` (confirmado contra el spec OpenAPI) — NO `Authorization: Bearer`.
- Qué pasa cuando el token expira a mitad de una operación — ¿401 explícito a reautenticar, o algo distinto?
- ¿Sandbox/test además de producción, o `micrositeId` ya distingue ambiente dentro de la misma URL?
- Rate limits conocidos.
- **Idempotencia**: `POST /transport/{supplierId}` (crear contrato) vs. `PUT` (editar) están separados por método HTTP — no hace falta buscar-antes-de-crear como en Atlas. Pero para el nivel Option, no hay endpoint de "solo actualizar cantidad" — el `PUT` de la Option manda el objeto entero (`prices`/`inventories` completos). **Sin confirmar**: si ese PUT reemplaza el array entero o mergea por fecha — probar en sandbox antes de asumir (ver [[API Contrato de Proveedor (Alta y Gestión de Inventario)]] sección 4).
- **Manejo de errores**: no confirmado todavía para los endpoints de contrato específicamente (sí para el lado distribución, ver [[API Transportes (Búsqueda y Reserva)]] sección 5 — status en el body, no en el HTTP code).
- **Ya resuelto**: endpoints concretos de alta/edición SÍ existen y están mapeados — ver [[API Contrato de Proveedor (Alta y Gestión de Inventario)]].

## 6. Qué tenemos disponible de nuestro lado (para mapear cuando se sepa el shape del otro lado)

`Product` ya tiene, entre otros: `CodigoCupo`, `Destino`, `Compania`, `Ruta`, `FechaSalida`/`FechaRegreso`, `Cupo`/`Disponibilidad`/`Vendidos`, tarifas por tipo de pasajero (`TarifaAdt/Chd/Inf`, `ImpuestosAdt/Chd/Inf`, `OPAdt/Chd/Inf` — ver [[../005 - Arquitectura y Datos/Modelo de Datos|Modelo de Datos]]), franquicia de equipaje (`CarryOn`/`HandBag`/`CheckedBag` + `*Kg`), `PackageLinks`, `Agencia`/`RestrictedAgency`/`SourceAgency` (cesión entre agencias). Mapeo campo a campo pendiente de la documentación real de la plataforma.

## 7.b Prueba manual en curso (2026-09-16)

Julian va a probar el flujo de alta (Supplier → Transport → Option con inventario) manualmente contra la API real antes de escribir código, con Thunder Client. Colección + environment + instrucciones en `tools/travelcompositor-test/` (raíz del repo, no en el vault — es una herramienta de prueba, no documentación). Cubre solo **Transport** (no Hotel/Ticket/Transfer todavía, a pedido explícito). Resultado de la prueba (qué campos/enums acepta realmente, si el `PUT` de Option reemplaza o mergea `inventories`, mensajes de error reales) se vuelca acá y en [[API Contrato de Proveedor (Alta y Gestión de Inventario)]] apenas se corra.

## 7. Próximos pasos

1. Julian pasa documentación de la API externa (de a poco).
2. Esta nota se va actualizando sección por sección a medida que se confirma cada punto de la lista de arriba.
3. Una vez que el shape esté razonablemente claro, se arma una nota de arquitectura separada (mismo patrón que [[../007 - Integración Netviax Atlas/Conexión y Estructura General|Conexión y Estructura General]] de Atlas: credenciales, URLs, formato de request/response, manejo de errores, tabla de endpoints) antes de escribir código.
