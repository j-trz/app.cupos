Catálogo de las tablas principales del **Sistema de Gestión de Cupos**, definidas en `backend-go/pkg/models/models.go` (GORM). Complementa [Referencia de API](../001%20-%20API/Referencia%20de%20API.md) y [Flujos de Funcionalidades](../003%20-%20Funcionalidades/Flujos%20de%20Funcionalidades.md) con el detalle de columnas y relaciones que esos documentos no repiten.

> Fuente de verdad: el propio `models.go`. Este documento resume la forma y el *por qué* de cada tabla; ante cualquier duda puntual de tipo/columna, el código gana.
>
> Última lectura completa de `models.go` contra este documento: 2026-08-11 (nuevo formato de `CodigoCupo`, corrección de la nota sobre `Neto1` vs `Product.Neto1` — ver [[Feedback equipo de testing (UTG) — Sistema de Cupos|Feedback UTG]] §10-11 y regla 11-12 de [[Gotchas y Reglas de Oro]]).

## Índice

1. [Núcleo del negocio: Product, Reservation, Passenger](#1-núcleo-del-negocio-product-reservation-passenger)
2. [Identidad y acceso: Profile, Agency, UserAgency](#2-identidad-y-acceso-profile-agency-useragency)
3. [RBAC: Permission, Role, UserRole, RolePermission](#3-rbac-permission-role-userrole-rolepermission)
4. [Cesión y compartición de cupos](#4-cesión-y-compartición-de-cupos)
5. [Grupos (vuelos a medida)](#5-grupos-vuelos-a-medida)
6. [Configuración por agencia](#6-configuración-por-agencia)
7. [Asistente IA](#7-asistente-ia)
8. [Notificaciones y logs](#8-notificaciones-y-logs)
9. [Catálogos globales](#9-catálogos-globales)

---

## 1. Núcleo del negocio: Product, Reservation, Passenger

### `Product` (tabla `products`)

Un **cupo** — bloqueo aéreo, paquete o servicio publicado por una agencia. Campos clave:

- **Identidad**: `CodigoCupo`, `Destino`, `Compania`, `Ruta`, `PNR`, `Ficha`, `Temporada`, `TipoProducto`, `Servicio` (texto libre distinto de `TipoProducto`, ej. "Traslado"/"Seguro de viaje"). `CodigoCupo` se autogenera (`generateCodigoCupo`, `product_handler.go`) con el formato `{fecha_salida DD/MM/YY}-{destino 3 letras}-{secuencial 6 dígitos}_{CH|CP}-{aerolínea 2 letras}` (ej. `20/09/26-REC-431123_CH-AD`) — `CH` si `Servicio == "Charter"`, sino `CP` (Cupo); cambiado 2026-08-11, antes era `TIPO-DESTINO-secuencial`.
- **Stock**: `Disponibilidad` (lugares libres), `Cupo` (total original), `Vendidos`. **`Disponibilidad` es un campo calculado desde 2026-08-11** — `Cupo - Vendidos`, recalculado en cada `CreateProduct`/`UpdateProduct`/`BulkCreateProducts` (`recomputeDisponibilidad()`, `product_handler.go`) sin importar qué valor venga en el request; el input ya no existe en `ProductForm.jsx`, solo se muestra de solo lectura. Así, si se amplía el `Cupo` (ej. se compran 10 lugares más sobre un cupo ya parcialmente vendido), la disponibilidad libre sube sola en vez de quedar pisada por un valor manual desalineado. Las ventas/cancelaciones (`order_handler.go`) siguen moviendo `Disponibilidad` y `Vendidos` en el mismo paso — el invariante `Disponibilidad = Cupo - Vendidos` se mantiene sin tocar esos puntos.
- **Precios**: `TarifaAdt`/`ImpuestosAdt` y sus equivalentes `TarifaChd`/`ImpuestosChd`, `TarifaInf`/`ImpuestosInf` — tarifa e impuestos separados por tipo de pasajero. **`OP` (ganancia) se individualizó por tipo el 2026-08-10**: `OPAdt`/`OPChd`/`OPInf` son los reales; el campo `OP` (singular) queda como legado, sincronizado a `OPAdt` en `applyCalculatedPrices` para que cualquier lector viejo siga viendo algo razonable. **El Neto1 real NO es un valor único** — es siempre `TarifaX + ImpuestosX` del tipo de ESE pasajero (`Product.NetoForTipo()` en `models.go`; ver también el cálculo en vivo en `ProductForm.jsx`, sección Precios), y así se asigna al vender: `Passenger.Neto1` se completa con `product.NetoForTipo(tipoPasajero)` en `CreateReservation` y `AddPassenger` (`order_handler.go`) — nunca un valor compartido entre pasajeros de distinto tipo del mismo pedido. Aparte de eso existe `Product.Neto1` (singular, campo independiente) que **no** representa "el Neto1" de nadie — se usa únicamente como insumo de "Riesgo" en reportes (`disponibles × Product.Neto1`, `report_handler.go`/`analytics_handler.go`), etiquetado en el formulario de producto como "Neto 1 (Riesgo)" para no confundirlo con el Neto1 real por pasajero. **Desde 2026-08-11 también es un campo calculado, no manual**: `prorratedRiskNeto1()` (`product_handler.go`, llamada desde `applyCalculatedPrices`/`reconcilePricesForImport`) lo autocompleta como el promedio entre Neto ADT y Neto CHD — `(TarifaAdt+ImpuestosAdt + TarifaChd+ImpuestosChd) / 2` — sin infante (no ocupa lugar/cupo, no participa de un riesgo basado en lugares sin vender). El input manual ya no existe en `ProductForm.jsx`, solo un recuadro de solo lectura. `Precio`/`ChdFare`/`InfFare` son la **Venta calculada** de cada tipo (`applyCalculatedPrices`): `Tarifa + Impuestos + OP` de ese tipo, usando ahora el `OP` de ESE tipo (antes usaba el único `OP` para los 3).
- **Equipaje**: `CarryOn`/`HandBag`/`CheckedBag` (booleanos) + `CarryOnKg`/`HandBagKg`/`CheckedBagKg` (float64, kilaje de cada franquicia — puede variar por producto, agregado 2026-08-10).
- **Paquetes**: `PackageLinks` (`datatypes.JSON`, array de `{url, label}`) — links a los paquetes armados a partir de este cupo, mostrados en la columna "Paquetes" de Disponibilidad (agregado 2026-08-10).
- **Visibilidad multi-agencia**: `Agencia` (dueña), `RestrictedAgency` (si está seteado, solo esa agencia + admin ven el producto — usado en los productos-espejo de una cesión), `SourceAgency` (quién cedió este espejo puntual, distinto de quién lo tiene *hoy*), `TransferID` (vincula el espejo con su `AvailabilityTransfer`). Sin cesión de por medio, **un producto solo lo ve su agencia dueña** — no existe un catálogo general visible para todos.
- **Bloqueo de venta**: `IsBlockedForSale` (oculta de Disponibilidad sin tocar reservas existentes).
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
- **Servicios** (agregado 2026-08-10): `Hotel` (texto libre), `TrasladosIncluye` (bool), `TrasladosNotas` (texto libre) — sección "Servicios" del formulario de reserva.

### `Passenger` (tabla `passengers`)

La unidad real de "cupo aéreo": **cada pasajero ocupa 1 lugar y se crea siempre de forma individual** (con su propio ticket), aunque varios comparten `PedidoID`/`ReservationID` por haberse reservado juntos — **excepto el infante, que es pasajero pero no ocupa lugar/cupo** (ver más abajo). `NRO` distingue `1 = Venta` de `0 = Acompañante`. `Documento` (CI) y `Pasaporte` son campos separados — un pasajero puede tener uno, el otro, o ambos (típico si vino cargado desde Atlas). Cada pasajero progresa de forma independiente dentro del mismo pedido: tiene su propio `Estado`, `NumeroTicket`, `PrecioVenta`, `Neto1`, `DocContable`, `BloqueoExpiraAt`.

- **Vencimiento de documento** (agregado 2026-08-10): `DocumentoVencimiento` (`*time.Time`) + `DocumentoVitalicio` (bool, si es true el vencimiento se ignora).

**Infante no ocupa lugar** (implementado 2026-08-10): cada pasajero con `TipoPasajero == "Infante"` sigue creando su propia fila en `passengers` (sigue siendo pasajero, cuenta para `Vendidos`), pero **no** resta de `Product.Disponibilidad`. La lógica vive centralizada en `countPassengerSeats()` (`order_handler.go`) — separa "seats" (excluye infantes, para `Disponibilidad`) de "total" (todos, para `Vendidos`) — usada en los ~9 puntos donde se descuenta o devuelve stock: `CreateReservation`, `AddPassenger`, `DuplicatePassenger`, `DeletePassenger`, `DeleteReservation`, `ResolveCancellation`, `expireOverdueReservations` (cron), el tool de IA `crear_reserva`/cancelación, y `AdminReleaseHold`. El **hold** (`CreateHold`, antes de tener datos de pasajero) sigue descontando el conteo total sin distinguir tipo — todavía no se sabe qué tipo es cada uno — y la diferencia se reconcilia en `CreateReservation` una vez que el tipo real de cada pasajero es conocido.

> Nota de negocio pendiente de reflejar en el modelo: el **infante no ocupa lugar/cupo pero sí es pasajero** — hoy `Passenger` no distingue esto a nivel de stock (cada fila resta 1 de `Disponibilidad` por igual). Ver [[Feedback equipo de testing (UTG) — Sistema de Cupos|Feedback UTG]], sección Reserva.

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
