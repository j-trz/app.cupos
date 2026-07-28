---
title: Flujos de Funcionalidades
nav_order: 20
nav_group: Arquitectura
---

# Flujos de Funcionalidades

Este documento describe cada funcionalidad del **Sistema de Gestión de Cupos** junto con su diagrama de flujo. Cada sección incluye una breve descripción textual y un diagrama que refleja la lógica real implementada en el repositorio (validaciones, estados y endpoints).


## Índice

1. [Autenticación y Login con JWT y RBAC](#1-autenticación-y-login-con-jwt-y-rbac)
2. [Disponibilidad y Creación de Reserva](#2-disponibilidad-y-creación-de-reserva)
3. [Ciclo de Vida de la Reserva](#3-ciclo-de-vida-de-la-reserva)
4. [Solicitudes y Confirmaciones](#4-solicitudes-y-confirmaciones)
5. [Cesión de Cupos entre Agencias](#5-cesión-de-cupos-entre-agencias)
6. [Grupos y Vuelos a Medida](#6-grupos-y-vuelos-a-medida)
7. [Gestión de Productos](#7-gestión-de-productos)
8. [Gestión de Nóminas](#8-gestión-de-nóminas)
9. [RBAC Usuarios Roles y Permisos](#9-rbac-usuarios-roles-y-permisos)
10. [Asistente IA](#10-asistente-ia)
11. [Expiración Automática de Reservas](#11-expiración-automática-de-reservas)
12. [Reportes y Dashboard](#12-reportes-y-dashboard)
13. [Notificaciones](#13-notificaciones)
14. [Configuraciones](#14-configuraciones)

---

## 1. Autenticación y Login con JWT y RBAC

El login valida las credenciales contra `Profile` (comparando el hash `bcrypt`), verifica que la cuenta esté activa y, si todo es correcto, firma un **JWT HS256** de 24 horas con los claims `id`, `email`, `agencia`, `role` y `admin`. En cada request protegida el `AuthMiddleware` valida el token y adjunta esos datos al contexto; `RequirePermission` gatea los endpoints sensibles.

La resolución de permisos **RBAC** ocurre una sola vez después del login: el frontend llama a `GET /users/me/permissions` para saber qué mostrar/habilitar. Un `admin` recibe **todos** los códigos activos (bypass total), mientras que el resto los obtiene navegando `user_roles → role_permissions → permissions`. El `Sidebar` filtra sus ítems de menú según esos códigos.

- Backend: `POST /api/auth/login` (`user_handler.go`), `GET /users/me/permissions` (`rbac_handler.go`), middleware `AuthMiddleware` / `RequirePermission` (`middleware/auth.go`).
- Frontend: `frontend/src/components/ui/Sidebar.jsx`.

```mermaid
flowchart TD
    A["Usuario ingresa email y password"] --> B["POST /api/auth/login"]
    B --> C{"¿Perfil existe y password válida con bcrypt?"}
    C -->|"No"| D["401 Credenciales inválidas"]
    C -->|"Sí"| E{"¿profile.IsActive es verdadero?"}
    E -->|"No"| F["401 Cuenta inactiva"]
    E -->|"Sí"| G["Firma JWT HS256 con id, email, agencia, role, admin y exp 24h"]
    G --> H["Devuelve token y datos del usuario"]
    H --> I["Frontend guarda sesión y llama GET /users/me/permissions"]
    I --> J{"¿role es admin?"}
    J -->|"Sí"| K["Devuelve TODOS los códigos de permiso activos"]
    J -->|"No"| L["Resuelve códigos vía user_roles, role_permissions y permissions"]
    K --> M["Sidebar filtra los ítems del menú según los permisos"]
    L --> M
    M --> N["Cada request protegida pasa por AuthMiddleware y RequirePermission"]
```

---

## 2. Disponibilidad y Creación de Reserva

La pantalla de **Disponibilidad** es el catálogo de vuelos reservables. El backend solo muestra productos con `disponibilidad > 0`, no bloqueados para venta y accesibles para la agencia (propios, cedidos vía `RestrictedAgency` o compartidos vía `ProductSharedAgency`). Desde ahí la agencia carga un formulario con uno o más pasajeros y confirma.

`CreateReservation` valida acceso al cupo, verifica disponibilidad suficiente para la cantidad de pasajeros, descuenta `disponibilidad` y suma `vendidos`, y calcula la expiración del bloqueo (`bloqueo_temporal_minutos` del producto o el setting `bloqueo_minutos_default`, 60 por defecto). Si se cargó `doc_contable` la reserva nace **confirmada**; si no, en **bloqueo_temporal**. Cada pasajero se crea como su propio ticket individual (1 lugar, 1 fila en `passengers`) y se calcula su `NRO`. Finalmente notifica al admin, avisa si la disponibilidad quedó baja y envía email a la agencia.

- Backend: `POST /api/orders/` → `CreateReservation` (`order_handler.go`), `GET /api/products/` → `GetProducts` (`product_handler.go`).
- Frontend: `frontend/src/pages/Availability.jsx`; sección `DisponibilidadSection` en `Documentacion.jsx`.

```mermaid
flowchart TD
    A["Agencia abre Disponibilidad"] --> B["GET /api/products/ con disponibilidad mayor a 0 y no bloqueado, filtrado por agencia"]
    B --> C["Elige producto y completa el formulario con N pasajeros"]
    C --> D["POST /api/orders/ (CreateReservation)"]
    D --> E{"¿No es admin y el cupo no es propio, cedido ni compartido?"}
    E -->|"Sí"| F["403 No tenés acceso a este cupo"]
    E -->|"No"| G{"¿Disponibilidad mayor o igual a N pasajeros?"}
    G -->|"No"| H["400 No hay disponibilidad suficiente"]
    G -->|"Sí"| I["Descuenta disponibilidad y suma vendidos"]
    I --> J["Calcula bloqueo_expira_at según minutos del producto o setting default"]
    J --> K{"¿Se cargó doc_contable al crear?"}
    K -->|"Sí"| L["Estado = confirmada"]
    K -->|"No"| M["Estado = bloqueo_temporal"]
    L --> N["Crea Reservation y un Passenger por pasajero, cada uno un ticket con su NRO"]
    M --> N
    N --> O["Notifica al admin, avisa baja disponibilidad y envía email a la agencia"]
```

---

## 3. Ciclo de Vida de la Reserva

Una reserva se mueve por una máquina de estados. Los valores canónicos definidos en el backend (`models.go`) son: `bloqueo_temporal`, `confirmada`, `solicitud_cancelacion`, `cancelada`, `expirada` y `cedido`. La documentación de usuario (`ReservasSection` en `Documentacion.jsx`) además presenta visualmente el estado **`procesando`** (el operador tomó la solicitud y está emitiendo el ticket) y el badge **`cedido`** (cupo prestado por otra agencia).

Transiciones reales:
- **bloqueo_temporal → confirmada**: al cargar el documento contable (`AddDocContable`) o al confirmar (`ConfirmReservation`).
- **bloqueo_temporal → expirada**: el cron libera el cupo cuando vence `bloqueo_expira_at` (ver sección 11).
- **cualquiera → solicitud_cancelacion**: `RequestCancellation` guarda el estado previo en `pre_cancel_estado`.
- **solicitud_cancelacion → cancelada**: `ResolveCancellation` aprueba, libera el cupo y conserva la fila en el historial.
- **solicitud_cancelacion → estado previo**: `ResolveCancellation` rechaza y restaura `pre_cancel_estado`.

- Backend: `order_handler.go` (`AddDocContable`, `ConfirmReservation`, `RequestCancellation`, `ResolveCancellation`), `cron_handler.go`. Referencia de datos: `ESTRUCTURA_BD_GO.md`.

```mermaid
stateDiagram-v2
    [*] --> bloqueo_temporal: CreateReservation sin doc_contable
    [*] --> confirmada: CreateReservation con doc_contable
    bloqueo_temporal --> confirmada: AddDocContable o ConfirmReservation
    bloqueo_temporal --> expirada: cron vence el bloqueo
    bloqueo_temporal --> solicitud_cancelacion: RequestCancellation
    confirmada --> solicitud_cancelacion: RequestCancellation
    solicitud_cancelacion --> cancelada: ResolveCancellation aprueba
    solicitud_cancelacion --> confirmada: ResolveCancellation rechaza y restaura
    expirada --> [*]
    cancelada --> [*]
    note right of bloqueo_temporal
        La UI también muestra procesando y cedido
        como estados visuales de una reserva.
    end note
```

---

## 4. Solicitudes y Confirmaciones

Ambas vistas de agencia consumen el mismo endpoint `GET /api/orders/` (`GetAllReservations`, que ya filtra por rol/agencia) y separan las filas del lado del cliente en `reservationService.js`: **Solicitudes** excluye las reservas `confirmada` y `cedido`; **Confirmaciones** muestra solo las `confirmada`/`confirmado`.

En **Solicitudes** la agencia puede cargar el documento contable (que confirma la reserva), solicitar la cancelación, y ve una cuenta regresiva mientras la reserva está en `bloqueo_temporal`. En **Confirmaciones** puede solicitar la cancelación y generar el **Itinerario PDF** (con la marca white-label de su agencia), obteniendo el detalle completo de pasajeros vía `GET /api/orders/:id`.

- Frontend: `frontend/src/pages/Requests.jsx`, `frontend/src/pages/Confirmations.jsx`, `frontend/src/services/reservationService.js`.

```mermaid
flowchart TD
    A["GET /api/orders/ (GetAllReservations)"] --> B["El frontend separa las filas por estado"]
    B --> C["Solicitudes: excluye confirmadas y cedidas"]
    B --> D["Confirmaciones: solo confirmada o confirmado"]
    C --> E{"Acción en Solicitudes"}
    E -->|"Agregar doc contable"| F["PUT /api/orders/:id/doc-contable pasa a confirmada"]
    E -->|"Solicitar cancelación"| G["PUT /api/orders/:id/cancel-request pasa a solicitud_cancelacion"]
    E -->|"Ver vencimiento"| H["Cuenta regresiva del bloqueo_temporal"]
    D --> I{"Acción en Confirmaciones"}
    I -->|"Itinerario PDF"| J["GET /api/orders/:id y arma el PDF con white-label"]
    I -->|"Solicitar cancelación"| G
```

---

## 5. Cesión de Cupos entre Agencias

El operador (owner) o un admin puede **ceder (prestar) cupos** de un producto a otra agencia. `CreateTransfer` determina la agencia cedente (la dueña `Agencia`, o la `RestrictedAgency` si el producto ya es un espejo de una cesión previa), valida que origen y destino difieran y que haya disponibilidad suficiente. Luego, en una transacción: descuenta el stock del producto origen, crea un **producto espejo** restringido a la agencia destino (`RestrictedAgency`, `SourceAgency`, `TransferID`) y registra un `AvailabilityTransfer`. La agencia receptora reserva sobre ese espejo con normalidad.

Ceder o recuperar **no** genera reservas de auditoría: la trazabilidad queda en `AvailabilityTransfer`. `ReclaimTransfer` devuelve el stock disponible del espejo al producto original (total o parcial); los cupos ya reservados no se pueden recuperar.

- Backend: `POST /api/transfers` y `POST /api/transfers/:id/reclaim` (`transfer_handler.go`).
- Frontend: `CesionSection` en `Documentacion.jsx`, `components/TransferModal.jsx`.

```mermaid
flowchart TD
    A["Admin u owner elige Ceder en Gestión de Productos"] --> B["POST /api/transfers (CreateTransfer)"]
    B --> C{"¿La cedente es dueña o RestrictedAgency del producto?"}
    C -->|"No y no es admin"| D["403 No podés ceder un cupo que no te pertenece"]
    C -->|"Sí"| E{"¿Origen distinto de destino y disponibilidad suficiente?"}
    E -->|"No"| F["400 Error de validación"]
    E -->|"Sí"| G["Descuenta el stock del producto origen"]
    G --> H["Crea producto espejo con RestrictedAgency, SourceAgency y TransferID"]
    H --> I["Crea el registro AvailabilityTransfer"]
    I --> J["Notifica a la agencia destino y al admin"]
    J --> K["La agencia destino reserva sobre el producto espejo"]
    H --> L["Recuperar: POST /api/transfers/:id/reclaim devuelve stock total o parcial al origen"]
```

---

## 6. Grupos y Vuelos a Medida

Un **grupo** es un vuelo a medida que la agencia propone y el admin cotiza. Tiene una máquina de estados de **2 fases** (`models.go`):

- **Fase 1 — `EstadoCotizacion`**: `pendiente → cotizada → aceptada | rechazada`.
- **Fase 2 — `EstadoReservar`** (solo tras aceptar): `confirmada → cancelacion_solicitada → cancelada` (o vuelve a `confirmada` si se rechaza la cancelación).

La agencia crea la solicitud con una o más opciones de itinerario (`RequestGroup`, cada opción comparte `solicitud_id`). El admin completa la cotización y la envía explícitamente (`SendGroupQuote`, que exige condiciones, neto y vencimiento de cotización). La agencia acepta una opción (`AcceptGroupQuote`, no puede estar vencida; sus hermanas quedan `rechazada`). El admin confirma (`ConfirmGroup`, recién ahí se revelan nominación/emisión/gastos). La cancelación de un grupo confirmado se solicita y se resuelve (`RequestGroupCancellation` / `ResolveGroupCancellation`).

- Backend: `group_handler.go`, `models.go`.
- Frontend: `frontend/src/pages/GestionGrupos.jsx` (admin), `frontend/src/pages/Requests.jsx` (agencia).

```mermaid
stateDiagram-v2
    [*] --> pendiente: RequestGroup o CreateGroup
    pendiente --> cotizada: SendGroupQuote con datos mínimos
    pendiente --> rechazada: rechazo
    cotizada --> aceptada: AcceptGroupQuote no vencida
    cotizada --> rechazada: rechazo o hermana aceptada
    aceptada --> confirmada: ConfirmGroup
    confirmada --> cancelacion_solicitada: RequestGroupCancellation
    cancelacion_solicitada --> cancelada: ResolveGroupCancellation aprueba
    cancelacion_solicitada --> confirmada: ResolveGroupCancellation rechaza
    rechazada --> [*]
    cancelada --> [*]
    note right of pendiente
        Fase 1 EstadoCotizacion: pendiente, cotizada, aceptada, rechazada.
        Fase 2 EstadoReservar: confirmada, cancelacion_solicitada, cancelada.
    end note
```

---

## 7. Gestión de Productos

Pantalla de administración del inventario (**cupos**/bloqueos aéreos). Permite el CRUD de productos (gateado por `PRODUCTS_CREATE/UPDATE/DELETE`), la **importación masiva desde Excel** (descarga de plantilla XLSX, carga y `POST /api/products/bulk` que procesa fila por fila reportando errores) y el **bloqueo de venta** (`is_blocked_for_sale`), que oculta el producto de Disponibilidad sin afectar reservas existentes.

El borrado se bloquea si el producto tiene reservas o cesiones asociadas. Desde acá también se accede a ceder/compartir cupos (ver sección 5).

- Backend: `product_handler.go` (`GetProducts`, `CreateProduct`, `UpdateProduct`, `DeleteProduct`, `BulkCreateProducts`).
- Frontend: `frontend/src/pages/GestionProductos.jsx`, `ProductosSection` en `Documentacion.jsx`, `components/ProductBulkUpload.jsx`.

```mermaid
flowchart TD
    A["Gestión de Productos"] --> B{"Acción"}
    B -->|"Crear o editar"| C["POST o PUT /api/products con PRODUCTS_CREATE o PRODUCTS_UPDATE"]
    B -->|"Importar Excel"| D["Descarga plantilla, completa y POST /api/products/bulk"]
    D --> E["Procesa fila por fila y reporta errores por fila"]
    B -->|"Bloquear venta"| F["is_blocked_for_sale = true, deja de aparecer en Disponibilidad"]
    B -->|"Eliminar"| G{"¿Tiene reservas o cesiones asociadas?"}
    G -->|"Sí"| H["Bloquea el borrado"]
    G -->|"No"| I["DELETE /api/products/:id"]
    B -->|"Ceder o compartir"| J["Ver sección de Cesión y ProductSharedAgency"]
```

---

## 8. Gestión de Nóminas

La nómina es el **roster de pasajeros** por producto. Consume `GET /api/orders/` (con `Passengers` y `roster_product_id`) y agrupa cada pasajero por `roster_product_id`: si la venta se hizo sobre un producto-espejo cedido, la nómina real es la del producto **dueño** (la agencia que gestiona el vuelo), evitando fragmentar el roster.

Cada pasajero es un ticket individual: se le puede **asignar número de ticket** y precio de venta (`PUT /api/orders/:id/passengers/:passengerId`), editar todos sus datos (`.../full`), generar el **itinerario PDF** con marca white-label (requiere ticket asignado) y exportar el roster a XLSX.

- Backend: `order_handler.go` (`GetAllReservations`, `UpdatePassengerTicket`, `UpdatePassenger`).
- Frontend: `frontend/src/pages/GestionNominas.jsx`.

```mermaid
flowchart TD
    A["Gestión de Nóminas"] --> B["GET /api/orders/ con pasajeros y roster_product_id"]
    B --> C["Agrupa pasajeros por roster_product_id, el producto dueño real"]
    C --> D{"Acción por pasajero"}
    D -->|"Asignar ticket"| E["PUT /api/orders/:id/passengers/:pid con numero_ticket y precio_venta"]
    D -->|"Editar datos"| F["PUT /api/orders/:id/passengers/:pid/full"]
    D -->|"Itinerario PDF"| G["Genera el PDF con white-label si el pasajero tiene ticket"]
    D -->|"Exportar"| H["Descarga el roster en XLSX"]
```

---

## 9. RBAC Usuarios Roles y Permisos

El control de acceso es granular y basado en códigos `MODULE_ACTION` (ej. `PRODUCTS_CREATE`, `RESERVATIONS_DELETE`). Los **permisos** son el catálogo de códigos; los **roles** agrupan permisos (`role_permissions`); los **usuarios** reciben un rol (`user_roles`). La gestión de cada entidad está gateada por sus propios permisos (`USERS_*`, `ROLES_*`, `PERMISSIONS_*`).

En tiempo de request, el middleware `RequirePermission(code)` deja pasar siempre al `admin` (bypass total) y, para el resto, verifica que exista el `code` activo recorriendo `user_roles → role_permissions → permissions`; si no, responde `403`.

- Backend: `middleware/auth.go` (`RequirePermission`), `rbac_handler.go`, `user_handler.go`, `services/rbac_service.go`.
- Frontend: `frontend/src/pages/GestionUsuarios.jsx`, `GestionRoles.jsx`, `GestionPermisos.jsx`.

```mermaid
flowchart TD
    A["Administración de Usuarios, Roles y Permisos"] --> B["Permisos: CRUD /api/permissions con códigos MODULE_ACTION"]
    A --> C["Roles: CRUD /api/roles y asignar permisos con POST /api/roles/:id/permissions"]
    A --> D["Usuarios: CRUD /api/users y asignar rol con POST /api/user-roles"]
    C --> E["role_permissions"]
    D --> F["user_roles"]
    E --> G["RequirePermission(code) en cada request protegida"]
    F --> G
    G --> H{"¿role es admin?"}
    H -->|"Sí"| I["Bypass total"]
    H -->|"No"| J{"¿user_roles y role_permissions incluyen el code activo?"}
    J -->|"Sí"| K["Continúa la request"]
    J -->|"No"| L["403 Permisos insuficientes"]
```

---

## 10. Asistente IA

El asistente (`POST /api/ai/chat`) arma un **system prompt** dinámico según el rol y los permisos granulares del usuario, con reglas de seguridad críticas: un usuario `user`/`agency_user` solo ve sus propias reservas y nunca datos financieros (neto, OP, rentabilidad) ni de otras agencias; `agency_admin` solo su agencia; `admin` todo. También recibe el **contexto de pantalla** (`pageContext`) para resolver referencias posicionales.

El backend expone un **toolset filtrado por rol** (con function calling sobre OpenAI/Anthropic/Google). Las herramientas son de lectura/acción sobre la DB (`buscar_productos`, `mis_reservas`, `crear_reserva`, `cotizar_grupo`, `rentabilidad`, etc.) o **UIActions** que instruyen al frontend (`abrir_modal_reserva`, `navegar_a_pantalla`, `completar_formulario_pasajeros`). El bucle llama al modelo, ejecuta las tools que pida respetando las reglas de seguridad, y repite hasta la respuesta final.

- Backend: `backend-go/pkg/handlers/ai_handler.go`.

```mermaid
flowchart TD
    A["Usuario escribe en el chat con imágenes y pageContext"] --> B["POST /api/ai/chat"]
    B --> C["Construye el system prompt según rol y permisos granulares"]
    C --> D["Arma el toolset filtrado por rol admin, agency_admin o user"]
    D --> E["Llama al proveedor LLM con function calling"]
    E --> F{"¿El modelo pidió ejecutar una tool?"}
    F -->|"Sí"| G["executeTool respeta las reglas de seguridad por rol"]
    G --> H{"Tipo de tool"}
    H -->|"Lectura o acción en DB"| I["buscar_productos, mis_reservas, crear_reserva, cotizar_grupo"]
    H -->|"UIAction"| J["abrir_modal_reserva, navegar_a_pantalla, completar_formulario_pasajeros"]
    I --> E
    J --> E
    F -->|"No"| K["Responde al usuario y el front ejecuta las UIActions"]
```

---

## 11. Expiración Automática de Reservas

Un servicio de cron externo (cron-job.org, GitHub Actions, etc.) golpea `GET /api/cron/expire-reservations` cada 5–15 minutos. No usa JWT: se protege con el header `X-Cron-Secret` comparado contra `CRON_SECRET`.

El handler hace dos pasadas sobre las reservas en `bloqueo_temporal`: primero **avisa** las que vencen en menos de 15 minutos y aún no tienen aviso (`expiration_warning_sent_at`), enviando notificación + email y marcando la bandera; luego **expira** las que ya pasaron su `bloqueo_expira_at`, devolviendo la disponibilidad al producto (resta `vendidos`), poniendo reserva y pasajeros en `expirada`, notificando a usuario y admin, enviando email y dejando un `SystemLog`. Responde con la cantidad avisada y expirada.

- Backend: `cron_handler.go` (`ExpireReservations`), documentado en `backend-go/README.md`.

```mermaid
flowchart TD
    A["Cron externo cada 5 a 15 minutos"] --> B["GET /api/cron/expire-reservations con header X-Cron-Secret"]
    B --> C{"¿El secret coincide con CRON_SECRET?"}
    C -->|"No"| D["401 No autorizado"]
    C -->|"Sí"| E["warnExpiringReservations: bloqueos que vencen en menos de 15 min sin aviso"]
    E --> F["Notifica, envía email por vencer y marca expiration_warning_sent_at"]
    C -->|"Sí"| G["expireOverdueReservations: bloqueos con bloqueo_expira_at ya vencido"]
    G --> H["Devuelve disponibilidad y resta vendidos"]
    H --> I["Pone reserva y pasajeros en estado expirada"]
    I --> J["Notifica a usuario y admin, envía email y crea SystemLog"]
    F --> K["Responde con warned y expired"]
    J --> K
```

---

## 12. Reportes y Dashboard

El **Dashboard** y **Reportes** (gateados por `REPORTS_VIEW`) consumen métricas del backend. `GetStats` calcula totales del sistema (reservas, ventas de reservas confirmadas, usuarios activos de los últimos 30 días, pasajeros confirmados). Otros endpoints entregan ocupación, top de productos, alertas de riesgo y evoluciones. Los conceptos clave: **Rentabilidad** = `OP × vendidos` y **Riesgo** = `disponibles × neto_1`. La **exportación** entrega un CSV por tipo de entidad.

> Nota: el `backend-go/README.md` documenta los endpoints como `GET /api/analytics/stats` y `GET /api/reports/export`; en el ruteo actual (`main.go`) están implementados como `GET /api/reports/stats` (más los `/api/reports/*`) y la exportación como `GET /api/export/csv/:entityType` (permiso `REPORTS_EXPORT`).

- Backend: `report_handler.go` (`GetStats`, `GetRiskAlerts`, etc.), `analytics_handler.go`, `export_handler.go`.
- Frontend: `frontend/src/pages/Reportes.jsx`, `frontend/src/pages/Dashboard.jsx`.

```mermaid
flowchart TD
    A["Dashboard y Reportes con permiso REPORTS_VIEW"] --> B["GET /api/reports/stats (GetStats)"]
    A --> C["GET /api/reports/... ocupación, top-products, risk-alerts, evolución"]
    A --> D["POST /api/reports/dashboard-data y pipeline legacy de analytics"]
    B --> E["Totales: reservas, ventas confirmadas, usuarios activos y pasajeros"]
    C --> F["Rentabilidad = OP por vendidos; Riesgo = disponibles por neto_1"]
    A --> G["GET /api/export/csv/:entityType con permiso REPORTS_EXPORT descarga CSV"]
```

---

## 13. Notificaciones

Los eventos del sistema (nueva reserva, cesión recibida, grupo cotizado/aceptado/confirmado, expiración, etc.) generan `Notification` mediante los helpers `services.Notify*`. El `Sidebar` hace **polling** de `GET /api/notifications/unread-count` cada **20 segundos** y muestra el badge de no leídas.

La pantalla de **Notificaciones** lista los avisos (`GET /api/notifications`) y permite marcarlos como leídos (individual o todos), ocultarlos y —con `NOTIFICATIONS_CREATE`— crear notificaciones manuales.

- Backend: `notification_handler.go`, `services` de notificación.
- Frontend: `frontend/src/pages/Notificaciones.jsx`, polling en `frontend/src/components/ui/Sidebar.jsx`.

```mermaid
flowchart TD
    A["Eventos del sistema: reserva, cesión, grupo, expiración"] --> B["services.Notify crea una Notification"]
    B --> C["Sidebar hace polling de GET /api/notifications/unread-count cada 20 segundos"]
    C --> D["Muestra el badge con la cantidad de no leídas"]
    D --> E["Pantalla Notificaciones: GET /api/notifications"]
    E --> F{"Acción del usuario"}
    F -->|"Marcar leída"| G["PUT /api/notifications/:id/read"]
    F -->|"Marcar todas"| H["PUT /api/notifications/read-all"]
    F -->|"Ocultar"| I["PUT /api/notifications/:id/hide"]
    F -->|"Crear con NOTIFICATIONS_CREATE"| J["POST /api/notifications"]
```

---

## 14. Configuraciones

La sección de configuración agrupa varios módulos, cada uno gateado por su permiso:

- **Ajustes generales**: pares clave-valor vía `GET/PUT /api/settings/:key` (ej. `bloqueo_minutos_default`). Permisos `SETTINGS_VIEW/UPDATE`.
- **Diseño / White-Label**: logo y colores de la agencia (`/api/white-label/config`), usados en la UI y en los itinerarios PDF. Permiso `WHITE_LABEL_*`.
- **Email**: configuración SMTP y plantillas por agencia (`/api/email-config/config`, `/templates`, `/test`, `/send-test`). Permiso `EMAIL_*`.
- **Plantillas de notificación** in-app (`/api/notification-config/templates` y preview). Permiso `NOTIFICATION_TEMPLATES_*`.
- **Config de IA**: alta/edición/prueba de proveedores LLM (`/api/ai/providers`). Permiso `AI_*`.

- Frontend: `frontend/src/pages/Settings.jsx`, `WhiteLabelConfig.jsx`, `EmailConfig.jsx`, `NotificationTemplates.jsx`, `AIConfig.jsx`.

```mermaid
flowchart TD
    A["Sección de Configuración"] --> B["Ajustes generales: GET y PUT /api/settings/:key, ej. bloqueo_minutos_default"]
    A --> C["Diseño y White-Label: /api/white-label/config para logo y colores del PDF y la UI"]
    A --> D["Email: /api/email-config/config, templates y envíos de prueba"]
    A --> E["Plantillas de notificación: /api/notification-config/templates y preview"]
    A --> F["Config de IA: /api/ai/providers para crear, editar y probar proveedores LLM"]
    B --> G["Cada módulo está gateado por su permiso: SETTINGS, WHITE_LABEL, EMAIL, NOTIFICATION_TEMPLATES o AI"]
    C --> G
    D --> G
    E --> G
    F --> G
```
