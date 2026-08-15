Catálogo de las tablas principales del **Sistema de Gestión de Cupos**, definidas en `backend-go/pkg/models/models.go` (GORM). Complementa [Referencia de API](../001%20-%20API/Referencia%20de%20API.md) y [Flujos de Funcionalidades](../003%20-%20Funcionalidades/Flujos%20de%20Funcionalidades.md) con el detalle de columnas y relaciones que esos documentos no repiten.

> Fuente de verdad: el propio `models.go`. Este documento resume la forma y el *por qué* de cada tabla; ante cualquier duda puntual de tipo/columna, el código gana.
>
> Última lectura completa de `models.go` contra este documento: 2026-08-13 (`Opportunity.FechaAprobado`, relaciones `CargadorUser`/`AutorizadorUser` a `Profile`, modal de historial en `GestionOportunidades.jsx`, fix de fechas en `OportunityForm.jsx`; anteriores: `Opportunity.ProductoID`/`Estado="producto"` y `Product.PendienteAprobacion`).

## Índice

1. [Núcleo del negocio: Opportunity, Product, Reservation, Passenger](#1-núcleo-del-negocio-opportunity-product-reservation-passenger)
2. [Identidad y acceso: Profile, Agency, UserAgency](#2-identidad-y-acceso-profile-agency-useragency)
3. [RBAC: Permission, Role, UserRole, RolePermission](#3-rbac-permission-role-userrole-rolepermission)
4. [Cesión y compartición de cupos](#4-cesión-y-compartición-de-cupos)
5. [Grupos (vuelos a medida)](#5-grupos-vuelos-a-medida)
6. [Configuración por agencia](#6-configuración-por-agencia)
7. [Asistente IA](#7-asistente-ia)
8. [Notificaciones y logs](#8-notificaciones-y-logs)
9. [Catálogos globales](#9-catálogos-globales)

---

## 1. Núcleo del negocio: Opportunity, Product, Reservation, Passenger

### `Opportunity` (tabla `opportunities`)

Una oportunidad de negocio con aerolínea: es la **pre-carga de un pedido** antes de que se convierta en un `Product` real del catálogo/stock. Sirve para registrar una propuesta comercial, analizarla, evaluarla y aprobarla por la agencia o el admin antes de materializarla como cupo disponible. Campos clave:

- **Identidad**: `Agencia`, `Temporada` (opcional), `Destino`, `Compania`, `Validez` (fecha de vigencia), `FechaSalida`, `FechaLlegada` (opcional), `Estado` (`pendiente` / `aprobada` / `rechazada` / `producto`, este último terminal desde 2026-08-13, ver abajo).
- **Conversión a Producto** (agregada 2026-08-13, ver *Flujos de Funcionalidades* sección 19): `ProductoID` (`*uint`, nullable) — se completa al convertir la oportunidad en un `Product` real vía `ConvertOpportunityToProduct`, puramente informativo (no hay lectura automática de vuelta desde `Product`). Al convertirse, `Estado` pasa a `"producto"` (terminal: `UpdateOpportunity`/`DeleteOpportunity`/`ApproveOpportunity` rechazan cualquier cambio de ahí en más, ni siquiera admin). El producto resultante nace con `Product.PendienteAprobacion = true` (ver más abajo) — este flujo es enteramente opcional, no reemplaza la carga directa de productos desde Gestión de Productos.
- **Stock y economía**: `TotalLugares`, `TotalLiberados`, `Neto1`, `Neto2`. `Neto1`/`Neto2` son valores de negocio del cupo potencial (no el neto de un pasajero real), útiles para comparar propuestas y luego convertirlas en un producto normal.
- **Servicio y Equipaje** (agregados 2026-08-13): `Servicio` (`string`, selector de Tipo de Servicio ej: `Cupo` / `Charter`), `CarryOn`, `HandBag`, `CheckedBag` (booleanos) y `CarryOnKg`, `HandBagKg`, `CheckedBagKg` (float64, kilaje por franquicia). Al convertir una oportunidad a producto, estos valores se importan automáticamente a `ProductForm.jsx`.
- **Control operativo**: `EstadoInterno` — "Estado Aerolínea" en el frontend, desde 2026-08-12 un `<select>` con 4 opciones fijas (`Cotizado`/`Rechazado por la aerolínea`/`Confirmado`/`Vencido`), antes texto libre; sigue siendo un `*string` sin constraint en DB (el enum solo vive en el frontend, `OportunityForm.jsx`). `MotivoRechazo` (desde 2026-08-12): solo tiene sentido cuando `EstadoInterno = "Rechazado por la aerolínea"` — se captura vía popup `Swal.fire`. `FechaCargado`, `UsuarioCargador`, `UsuarioAutorizador`. `FechaCargado` y `UsuarioCargador` se completan automáticamente en el backend desde el JWT y la hora actual; no se aceptan desde el request para evitar spoofing.
- **Auditoría de carga y aprobación** (2026-08-13): se agregaron las relaciones GORM `CargadorUser *Profile` (`foreignKey:UsuarioCargador`) y `AutorizadorUser *Profile` (`foreignKey:UsuarioAutorizador`), y el campo `FechaAprobado *time.Time` (columna `fecha_aprobado` con migración `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, seteada en `ApproveOpportunity`). `GetOpportunities` y `GetOpportunity` ahora hacen `.Preload("CargadorUser").Preload("AutorizadorUser")` para exponer nombre/apellido. En el frontend, el botón **Historial** (icono `History`) en Acciones abre un modal con: cargado por, fecha de carga, estado actual, aprobado por y fecha de aprobación. Columna "Cargador" eliminada de la tabla (el dato vive solo en el modal). Fix de bug de fechas: `OportunityForm.jsx` usa `toDateOnlyString()` al poblar `validez`/`fecha_salida`/`fecha_llegada` en modo edición, resolviendo el error `"does not conform to the required format yyyy-MM-dd"` y el HTTP 500. Sincronización de fechas: al cambiar `fecha_salida` en `OportunityForm`, si `fecha_llegada` está vacía o es anterior se iguala automáticamente; mismo patrón para `fecha_regreso` en `ProductForm.jsx`.
- **Auditoría**: `CreatedAt`, `UpdatedAt`.

La intención funcional es mantener un registro separado del `Product`: una oportunidad puede rechazarse, modificarse varias veces y aprobarse sin dejar residuos de catálogo. El flujo de negocio va en el sentido `Oportunidad -> Aprobar -> Product` o, si se rechaza, queda como historial administrativo. La carga usa permisos granulares del RBAC (`OPPORTUNITIES_VIEW`, `OPPORTUNITIES_CREATE`, `OPPORTUNITIES_UPDATE`, `OPPORTUNITIES_DELETE`, `OPPORTUNITIES_APPROVE`) y el scoping por agencia se aplica igual que en `Product`/`Reservation`: admin ve todo, usuarios no-admin solo las de su propia agencia y solo pueden editar/eliminar si son el creador y la oportunidad todavía está en `pendiente`.

### `Product` (tabla `products`)

Un **cupo** — bloqueo aéreo, paquete o servicio publicado por una agencia. Campos clave:

- **Identidad**: `CodigoCupo`, `Destino`, `Compania`, `Ruta`, `PNR`, `Ficha`, `Temporada`, `TipoProducto`, `Servicio` (texto libre distinto de `TipoProducto`, ej. "Traslado"/"Seguro de viaje"). `CodigoCupo` se autogenera (`generateCodigoCupo`, `product_handler.go`) con el formato `{fecha_salida DD/MM/YY}-{destino 3 letras}-{secuencial 6 dígitos}_{CH|CP}-{aerolínea 2 letras}` (ej. `20/09/26-REC-431123_CH-AD`) — `CH` si `Servicio == "Charter"`, sino `CP` (Cupo); cambiado 2026-08-11, antes era `TIPO-DESTINO-secuencial`.
- **Stock**: `Disponibilidad` (lugares libres), `Cupo` (total original), `Vendidos`. **`Disponibilidad` es un campo calculado desde 2026-08-11** — `Cupo - Vendidos`, recalculado en cada `CreateProduct`/`UpdateProduct`/`BulkCreateProducts` (`recomputeDisponibilidad()`, `product_handler.go`) sin importar qué valor venga en el request; el input ya no existe en `ProductForm.jsx`, solo se muestra de solo lectura. Así, si se amplía el `Cupo` (ej. se compran 10 lugares más sobre un cupo ya parcialmente vendido), la disponibilidad libre sube sola en vez de quedar pisada por un valor manual desalineado. Las ventas/cancelaciones (`order_handler.go`) siguen moviendo `Disponibilidad` y `Vendidos` en el mismo paso — el invariante `Disponibilidad = Cupo - Vendidos` se mantiene sin tocar esos puntos.
- **Precios**: `TarifaAdt`/`ImpuestosAdt` y sus equivalentes `TarifaChd`/`ImpuestosChd`, `TarifaInf`/`ImpuestosInf` — tarifa e impuestos separados por tipo de pasajero. **`OP` (ganancia) se individualizó por tipo el 2026-08-10**: `OPAdt`/`OPChd`/`OPInf` son los reales; el campo `OP` (singular) queda como legado, sincronizado a `OPAdt` en `applyCalculatedPrices` para que cualquier lector viejo siga viendo algo razonable. **El Neto1 real NO es un valor único** — es siempre `TarifaX + ImpuestosX` del tipo de ESE pasajero (`Product.NetoForTipo()` en `models.go`; ver también el cálculo en vivo en `ProductForm.jsx`, sección Precios), y así se asigna al vender: `Passenger.Neto1` se completa con `product.NetoForTipo(tipoPasajero)` en `CreateReservation` y `AddPassenger` (`order_handler.go`) — nunca un valor compartido entre pasajeros de distinto tipo del mismo pedido. Aparte de eso existe `Product.Neto1` (singular, campo independiente) que **no** representa "el Neto1" de nadie — se usa únicamente como insumo de "Riesgo" en reportes (`disponibles × Product.Neto1`, `report_handler.go`/`analytics_handler.go`), etiquetado en el formulario de producto como "Neto 1 (Riesgo)" para no confundirlo con el Neto1 real por pasajero. **Desde 2026-08-11 también es un campo calculado, no manual**: `prorratedRiskNeto1()` (`product_handler.go`, llamada desde `applyCalculatedPrices`/`reconcilePricesForImport`) lo autocompleta como el promedio entre Neto ADT y Neto CHD — `(TarifaAdt+ImpuestosAdt + TarifaChd+ImpuestosChd) / 2` — sin infante (no ocupa lugar/cupo, no participa de un riesgo basado en lugares sin vender). El input manual ya no existe en `ProductForm.jsx`, solo un recuadro de solo lectura. `Precio`/`ChdFare`/`InfFare` son la **Venta calculada** de cada tipo (`applyCalculatedPrices`): `Tarifa + Impuestos + OP` de ese tipo, usando ahora el `OP` de ESE tipo (antes usaba el único `OP` para los 3).
- **Equipaje**: `CarryOn`/`HandBag`/`CheckedBag` (booleanos) + `CarryOnKg`/`HandBagKg`/`CheckedBagKg` (float64, kilaje de cada franquicia — puede variar por producto, agregado 2026-08-10).
- **Paquetes**: `PackageLinks` (`datatypes.JSON`, array de `{url, label}`) — links a los paquetes armados a partir de este cupo, mostrados en la columna "Paquetes" de Disponibilidad (agregado 2026-08-10).
- **Visibilidad multi-agencia**: `Agencia` (dueña), `RestrictedAgency` (si está seteado, solo esa agencia + admin ven el producto — usado en los productos-espejo de una cesión), `SourceAgency` (quién cedió este espejo puntual, distinto de quién lo tiene *hoy*), `TransferID` (vincula el espejo con su `AvailabilityTransfer`). Sin cesión de por medio, **un producto solo lo ve su agencia dueña** — no existe un catálogo general visible para todos.
- **Bloqueo de venta**: `IsBlockedForSale` (oculta de Disponibilidad sin tocar reservas existentes).
- **Pendiente de aprobación** (agregada 2026-08-13): `PendienteAprobacion` (bool, default `false`) — `true` solo para productos creados vía "Convertir a producto" desde una Oportunidad (ver arriba); mientras esté en `true`, `GetProducts` sin `scope=management` lo excluye (además de `disponibilidad > 0`/`is_blocked_for_sale = false`), o sea que no aparece en Disponibilidad ni es reservable. Un admin lo aprueba con `PUT /products/:id/approve` (`ApproveProduct`, `PRODUCTS_APPROVE`). En `GestionProductos.jsx` se muestran apartados en su propia sección hasta que se aprueban. Los productos cargados directo desde Gestión de Productos nacen en `false` (default) y nunca pasan por este gate.
- **Notas**: `NotasExternas` (cualquier agencia) vs `NotasInternas` (solo admin — se limpia antes de serializar a no-admins).
- **Deadlines operativos**: `VencimientoPago`, `NominationDate`, `FechaEmision`, `FechaGastos` + su correspondiente `Aviso*Enviado` (evita reavisar en cada corrida del cron) — mismos nombres de columna que `Group`, para que el cron de avisos trate ambos modelos de forma uniforme.

### `Reservation` (tabla `reservations`)

Un pedido — puede agrupar varios `Passenger`. Estados canónicos en [[Historial de Bugs Resueltos]] no aplica aquí; ver la máquina de estados completa en *Flujos de Funcionalidades* sección 3. Campos a destacar:

- `HoldPassengerCount`: cantidad de asientos que ocupa un pre-hold (`hold_temporal`) antes de que existan `Passenger`s reales — necesario para saber cuánto stock devolver si el hold se cancela o vence.
- `TransferID`/`OriginalAgency`: trazabilidad cuando la reserva se hizo sobre un producto-espejo cedido.
- `EstadoInterno` (`Pendiente`/`Seña`/`Pagado`/`Emitido`, carga manual admin) es **independiente** del ciclo de vida de `Estado`. `EmitidoAt` se calcula solo la primera vez que `EstadoInterno` pasa a `Emitido` (nunca lo manda el cliente).
- `StatusBack`: anotación libre de si ya se cargó en el backoffice externo — manual, no hay integración de escritura real (ver [[Flujos de Funcionalidades]] sección 17, Netviax Atlas es solo lectura).
- `PreCancelEstado`/`CancelacionNotas`: permiten restaurar el estado exacto previo si se rechaza una solicitud de cancelación.
- `ExpirationWarningSentAt`: evita reenviar el aviso de "por vencer" en cada corrida del cron.
- **Servicios** (agregado 2026-08-10): `Hotel` (texto libre), `TrasladosIncluye` (bool), `TrasladosNotas` (texto libre) — sección "Servicios" del formulario de reserva (`Availability.jsx`). Hasta 2026-08-12 solo se podían cargar ahí; no se veían ni se podían editar desde `GestionReservas.jsx` — se agregó la misma sección "Servicios" al modal de edición, más una columna en la tabla (botón "Servicios", solo si hay algo cargado) con un modal de solo lectura.
- `NotasVendedor` (agregado 2026-08-12, mismo nombre que `Group.NotasVendedor`): notas libres de quien solicita la reserva, siempre disponibles en el formulario de `Availability.jsx` (no gateadas por ninguna condición) — para dudas/comentarios al momento de cotizar. Visibles desde `Requests.jsx` (botón "Notas" si el campo no está vacío).

### `Passenger` (tabla `passengers`)

La unidad real de "cupo aéreo": **cada pasajero ocupa 1 lugar y se crea siempre de forma individual** (con su propio ticket), aunque varios comparten `PedidoID`/`ReservationID` por haberse reservado juntos — **excepto el infante, que es pasajero pero no ocupa lugar/cupo** (ver más abajo). `NRO` distingue `1 = Venta` de `0 = Acompañante`. `Documento` (CI) y `Pasaporte` son campos separados — un pasajero puede tener uno, el otro, o ambos (típico si vino cargado desde Atlas). Cada pasajero progresa de forma independiente dentro del mismo pedido: tiene su propio `Estado`, `NumeroTicket`, `PrecioVenta`, `Neto1`, `DocContable`, `BloqueoExpiraAt`.

- **Vencimiento de documento** (agregado 2026-08-10): `DocumentoVencimiento` (`*time.Time`) + `DocumentoVitalicio` (bool, si es true el vencimiento se ignora).

**Infante no ocupa lugar** (implementado 2026-08-10): cada pasajero con `TipoPasajero == "Infante"` sigue creando su propia fila en `passengers` (sigue siendo pasajero, cuenta para `Vendidos`), pero **no** resta de `Product.Disponibilidad`. La lógica vive centralizada en `countPassengerSeats()` (`order_handler.go`) — separa "seats" (excluye infantes, para `Disponibilidad`) de "total" (todos, para `Vendidos`) — usada en los ~9 puntos donde se descuenta o devuelve stock: `CreateReservation`, `AddPassenger`, `DuplicatePassenger`, `DeletePassenger`, `DeleteReservation`, `ResolveCancellation`, `expireOverdueReservations` (cron), el tool de IA `crear_reserva`/cancelación, y `AdminReleaseHold`. El **hold** (`CreateHold`, antes de tener datos de pasajero) sigue descontando el conteo total sin distinguir tipo — todavía no se sabe qué tipo es cada uno — y la diferencia se reconcilia en `CreateReservation` una vez que el tipo real de cada pasajero es conocido.

> Nota de negocio pendiente de reflejar en el modelo: el **infante no ocupa lugar/cupo pero sí es pasajero** — hoy `Passenger` no distingue esto a nivel de stock (cada fila resta 1 de `Disponibilidad` por igual). Ver [[Feedback equipo de testing (UTG) — Sistema de Cupos|Feedback UTG]], sección Reserva.

### `Ticket` (tabla `tickets`) — Bandeja de Tickets

Registro **inmutable** (nunca se borra, solo se marca `void`) del boleto GDS emitido. `Estado`: `emitido` → `enviado_atlas` (vía `SyncTicketAtlas`, sin dependencia real de que Atlas esté conectado — es un estado manual) → `void` (terminal, vía `VoidTicket`).

**El disparador real es por-pasajero, no por-reserva** (corregido 2026-08-15 — antes de esto la Bandeja quedaba vacía en la práctica): cargar el `numero_ticket` real de un pasajero (botón "Asignar" en `GestionReservas.jsx`, o "Editar Pasajero" en `GestionNominas.jsx` → `UpdatePassengerTicket` en `order_handler.go`) genera/completa el `Ticket` de ESE pasajero puntual vía `upsertTicketForPassenger()` (`ticket_handler.go`), y marca la reserva como `EstadoInterno = "Emitido"` si no lo estaba. El flujo alternativo — marcar `EstadoInterno = "Emitido"` directo (individual vía `UpdateReservation`, o en bloque vía `BulkUpdateReservations`) — sigue funcionando vía `GenerateTicketsForReservationInternal()`, que ahora itera pasajero por pasajero (`upsertTicketForPassenger`) en vez de chequear "¿la reserva ya tiene algún ticket?" (ese chequeo viejo se salteaba pasajeros restantes en una reserva con emisión escalonada). Ambos caminos son idempotentes y confluyen en la misma función.

- **`NumeroTicket`**: usa el número real cargado en `Passenger.NumeroTicket` si existe; si no, un placeholder sintético `045-YYYYMMDD-NNNNNNN` (se actualiza automáticamente al número real la próxima vez que alguien lo carga).
- **`PNR`** (corregido 2026-08-15): viene de `Product.PNR` (el localizador real de la aerolínea) — antes usaba `Reservation.PedidoID` (nuestro ID interno de pedido), que nunca fue un PNR.
- **`Destino`** (agregado 2026-08-15): copiado de `Reservation.VueloDestino` al emitir. El modal de detalle (`BandejaTickets.jsx`) NO lo deriva de `Ruta` — `Ruta` es el itinerario de vuelo completo en texto libre multi-tramo (ej. `"1JA763 31DEC MVDGIG 1432 1715 2JA762 09JAN GIGMVD 0950 1200"`), no un simple `"origen-destino"`; el Origen que sí se muestra en el modal se parsea con `parseRuta()` (`ItineraryTable.jsx`, reusado de la feature "Generar Itinerario") tomando el origen del primer tramo. Los tickets emitidos antes de este fix quedan con `destino` vacío y el `PNR` viejo (no hay backfill automático posible, ver limitación de abajo).
- **`RestoreStock` al voidear** (agregado 2026-08-13): `VoidTicket` acepta `restore_stock` (bool) en el body — si es `true`, devuelve 1 lugar al `Product` asociado (mismo patrón GORM de `DeleteReservation`, dentro de una transacción junto con el `Save` del ticket). La decisión la toma el usuario en el modal de confirmación (`BandejaTickets.jsx`), no se infiere automáticamente.
- **Limitación de diseño conocida**: `ReservationID`/`PassengerID` son `uuid.UUID` generados con `uuid.NewSHA1(...)` a partir del ID entero real de `Reservation`/`Passenger` (ambos `uint`, no `uuid.UUID`) — son identificadores derivados **no reversibles**, no una FK real utilizable para `JOIN`/lookup hacia esas tablas. Por eso, por ejemplo, no es viable determinar desde `Ticket` si el pasajero original era un infante (que no ocupa stock), ni backfillear campos nuevos (como `Destino`) hacia tickets ya existentes, sin agregar una columna nueva con el ID entero real o una relación GORM propiamente tipada.

---

## 2. Identidad y acceso: Profile, Agency, UserAgency

- **`Profile`** (tabla `profiles`): el usuario. `Password` nunca se persiste (`gorm:"-"`) — solo transporta el valor plano del request hacia `EncryptedPassword` (bcrypt). `Admin` (bool, privilegio) es un campo **distinto** de `IsActive` (bool, cuenta habilitada) — antes se mezclaban reusando la misma columna. `Role` es el string legado (`admin`/`agency_admin`/`agency_user`/etc.), todavía leído en varios `c.Get("role")` de scoping de agencia, en paralelo al sistema granular de `UserRole`.
- **`Agency`** (tabla `agencies`): `Code` único, `Color` (para gráficos de Reportes), `AIHabilitado` (permite a una agencia apagar el asistente de IA para todos sus usuarios).
- **`UserAgency`** (tabla `user_agencies`): agencias **adicionales** que puede tener un usuario, más allá de su `Profile.Agencia` (la "activa", la que viaja en el JWT). Se cambia de activa con `PUT /api/auth/active-agency`. Mismo shape que `ProductSharedAgency` (ver sección 4).

---

## 3. RBAC: Permission, Role, UserRole, RolePermission

- **`Permission`**: catálogo de códigos `MODULE_ACTION` (ej. `PRODUCTS_CREATE`). `Action` es el sufijo en minúsculas (view/create/update/delete/confirm/export/unlock/assign), separado de `Code` para poder matchear módulo+acción sin parsear el string.
- **`Role`**: `AgencyID` nulo = rol global/de sistema (disponible para cualquier agencia); no nulo = rol personalizado, exclusivo de esa agencia. `IsSystem` marca los 5 roles seedeados (`SUPER_ADMIN`, `AGENCY_ADMIN`, `SALES_SUPERVISOR`, `SALES_AGENT`, `VIEWER`).
- **`UserRole`** / **`RolePermission`**: tablas puente simples (`user_id`↔`role_id`, `role_id`↔`permission_id`). Un usuario tiene **un solo rol a la vez** por decisión de producto (aunque el esquema es many-to-many) — asignar uno nuevo reemplaza, no acumula.

Detalle de seeding, migración de usuarios legado y enforcement en middleware: ver [[Gotchas y Reglas de Oro]] y la sección 9 de *Flujos de Funcionalidades*.

---

## 4. Cesión y compartición de cupos

Dos mecanismos **distintos**, no intercambiables:

- **`AvailabilityTransfer`** (tabla `availability_transfers`): registro de auditoría de una **cesión** (`SourceAgency` → `TargetAgency`, `Quantity`). La cesión en sí crea un `Product` **espejo** (fila nueva, `RestrictedAgency` = destino) — la agencia receptora reserva sobre esa fila propia, no sobre el producto original.
- **`ProductSharedAgency`** (tabla `product_shared_agencies`): habilita que **la misma fila** de `Product` sea visible/reservable por otra agencia, **sin** forkear un espejo — todas las agencias listadas comparten el mismo `Disponibilidad`. Índice único por `(ProductID, Agencia)`.

---

## 5. Grupos (vuelos a medida)

**`Group`** (tabla `groups`): cotización a medida, con máquina de estados de 2 fases (`EstadoCotizacion`, `EstadoReservar` — detalle en *Flujos de Funcionalidades* sección 6). `SolicitudID` agrupa las N filas nacidas de una misma solicitud (una por opción de itinerario candidata); aceptar una opción rechaza automáticamente a sus hermanas. `Vendedor` es el usuario dueño de la cotización. Comparte el patrón `Aviso*Enviado`/deadlines con `Product` (mismos nombres de columna, mismo cron de avisos).

---

## 6. Configuración por agencia

Todas siguen el mismo patrón: `AgencyID *uuid.UUID` nulo = config **global/default**, usada cuando la agencia no definió la propia.

| Tabla | Uso |
|---|---|
| `EmailSMTPConfig` | Credenciales SMTP por agencia |
| `AtlasConfig` | Credenciales de Netviax Atlas por agencia (`Usuario`/`Clave`/`Empresa`/`Sucursal`/`Environment`) — ver [[Conexión y Estructura General\|007 - Integración Netviax Atlas]] para el detalle completo de la integración |
| `EmailTemplate` | Asunto/cuerpo de emails transaccionales, identificados por `Code` |
| `NotificationTemplate` | Título/mensaje de notificaciones in-app, identificadas por `Code`. Tiene además `ExtraEmails` (casillas adicionales, separadas por coma/salto de línea/`;`, que reciben el mismo aviso por email — pensado para que operaciones reciba avisos de vencimiento sin ser usuario del sistema) |
| `WhiteLabelConfig` | Identidad visual (logo, colores, tipografías) — ver [[Historial de Bugs Resueltos]] para el bug de fonts/colores ya corregido |
| `SystemSetting` | Pares clave-valor genéricos (`Key` + `Value jsonb`), ej. `bloqueo_minutos_default`. `AgencyID` también nulo = global |

---

## 7. Asistente IA

- **`AIProvider`**: proveedores LLM configurados (OpenAI/Anthropic/Google), con `IsDefault` para elegir cuál usa el chat si no se especifica.
- **`AISession`** / **`AIMessage`**: historial de conversación por usuario. `AIMessage.ToolCalls`/`TokenUsage` son JSON crudo (`datatypes.JSON`).
- **`AIExpert`**: base de conocimiento con nombre y `Persona` (tono opcional agregado al system prompt), **scopeada por `Agencia`** igual que `Product`/`Reservation`.
- **`AIExpertDocument`**: el archivo original **nunca se persiste** (no hay filesystem persistente en runtime serverless) — se convierte a Markdown en memoria al subirlo y solo se guarda `ContentMarkdown`. Editable a mano desde el panel (para corregir errores de OCR sin resubir).
- **`AIExpertChunk`**: fragmentos de un documento para búsqueda por texto (`pg_trgm`), generados **solo** cuando el conocimiento total del experto supera el umbral de inyección directa (`expertKnowledgeThreshold` en `ai_handler.go`) — si el experto es chico, se inyecta entero sin chunking.

---

## 8. Notificaciones y logs

- **`Notification`**: `TargetUserID`/`TargetRole`/`TargetAgency` son alternativas de destinatario (helpers `Notify*` eligen cuál llenar). `Type` es la categoría visual (`info`/`warning`/etc.) — no confundir con el `Code` de `NotificationTemplate`, que identifica *qué mensaje* es.
- **`SystemLog`**: `Message` debe ser una oración clara en español (lo que ve un admin no técnico); `Details` guarda el error crudo (stack/SQL) — ver el fix de legibilidad en `admin_config_system`. `Source` distingue `http`/`cron`/`email`/`ai`/`admin`.

---

## 9. Catálogos globales

- **`Temporada`** (tabla `temporadas`): lista global (no por agencia) de temporadas administrada por el admin — reemplazó el texto libre que tenía `Product.Temporada`, para que el desplegable del formulario no dependa de que cada uno tipee el nombre igual.
- **API Keys** (`models/api_key.go`, no en `models.go`): tokens M2M de larga duración, hash SHA-256 en DB — ver [Referencia de API](../001%20-%20API/Referencia%20de%20API.md#claves-de-api-para-integraciones-externas-m2m).

---

## Backup: las 13 tablas respaldadas

El sistema de backup JSON (`GET/POST /api/backup/*`) respalda explícitamente 13 tablas: `products`, `reservations`, `passengers`, `profiles`, `agencies`, `roles`, `permissions`, `role_permissions`, `email_smtp_configs`, `email_templates`, `notification_templates`, `ai_providers`, `system_logs`. Cualquier tabla nueva de negocio (no de config/catálogo) que se agregue debería evaluarse para sumarse a esa lista — hoy, por ejemplo, `groups`, `user_roles`, `availability_transfers`, `product_shared_agencies`, `user_agencies`, `atlas_configs` y `ai_expert*` **no** están en el backup.
