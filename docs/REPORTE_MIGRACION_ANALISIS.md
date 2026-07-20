# Reporte de Migración y Análisis Técnico de Base de Datos y Arquitectura (backend-go)

Este documento detalla todas las tareas realizadas para integrar el módulo de reportería de `backend-report` dentro del backend principal en Go (`backend-go`), resolver las inconsistencias previas de datos y mejorar la interfaz del frontend (`frontend`). Asimismo, incluye un análisis exhaustivo de la base de datos, relaciones de GORM, sistema de conexiones y esquema de seguridad.

---

## 1. Resumen de Tareas Realizadas

1. **Migración de Lógica Financiera e Integración de Reportería:**
   - Se migró toda la lógica de consultas analíticas avanzadas, filtros múltiples y fórmulas de KPIs de `backend-report/handlers/analytics.go` a un nuevo archivo unificado en `backend-go/pkg/handlers/analytics_handler.go`.
   - Se actualizaron las funciones existentes en `backend-go/pkg/handlers/report_handler.go` para que consuman esta lógica unificada basada en la nómina real de pasajeros. De esta manera, se erradicó la duplicidad de código y se garantizó la exactitud en los cálculos de ventas.
   - Se securizaron todos los endpoints nuevos y preexistentes de reportes, incluyéndolos bajo el middleware de autenticación JWT y limitándolos para el uso exclusivo de usuarios administradores y administradores de agencia (`middleware.AgencyAdminOrAdmin()`).

2. **Perfeccionamiento y Corrección de Bugs en el Frontend Cockpit:**
   - Se instalaron las dependencias necesarias en `/frontend` (`@headlessui/react`, `react-icons`, `react-tooltip`, `chart.js`, `react-chartjs-2`, `@heroicons/react`).
   - Se integraron con éxito los componentes de dashboard de alta densidad de información ("cockpit") del repositorio `frontend-reports`: `TabsCharts`, `DataTable`, `DepartureTable`, `FiltersPanel`, `KpiPanel`, `PeriodSelector`, `ProgressLoader` y `LoadingSpinner` dentro de `frontend/src/components/reports/`.
   - Se adaptaron los componentes de tabla y filtros para consumir `ReportService` conectando con el backend unificado de Go.
   - **Corrección de Bugs Críticos de Renderizado:**
     - Se definió la declaración de `minX` y `maxX` ausentes en la lógica de límites de globos del plugin `drawLabelPlugin` de `DepartureTable.jsx`.
     - Se corrigió la referencia incorrecta de `dDate` (por `d`) en el formateador de fechas de `DepartureTable.jsx`.
     - Se ajustó el nitpick de estilo CSS `justifyY` a `justifyContent` en `DataTable.jsx`.

---

## 2. Análisis Técnico de Base de Datos (Tablas y Modelos GORM)

El backend de Go utiliza **GORM** como ORM para mapear de manera robusta y relacional las tablas de PostgreSQL. A continuación se desglosa cada modelo definido en `backend-go/pkg/models/models.go`:

### A. Tabla `products` (Modelo `Product`)
Representa los contratos de cupos aéreos o bloques de asientos contratados con proveedores.
*   **Campos clave:**
    *   `ID` (uint, PK)
    *   `CodigoCupo` (string, no nulo): Código único identificador de salida.
    *   `Destino` (string, no nulo): Ciudad destino del viaje.
    *   `Compania` (string, no nulo): Aerolínea o compañía proveedora (ej. GOL, LATAM, etc.).
    *   `Disponibilidad` (int): Asientos actualmente libres para la venta.
    *   `Cupo` (int): Total de asientos originalmente contratados.
    *   `Vendidos` (int): Total de asientos ocupados por reservas confirmadas.
    *   `FechaSalida`, `FechaRegreso` (`*time.Time`): Fechas de partida y retorno.
    *   `Precio` (float64): Tarifa de venta al público (Neto Vendedor).
    *   `Neto1` (float64): Costo unitario confidencial del asiento (visible solo para admin/agency_admin).
    *   `OP` (float64): Margen de utilidad operativa unitaria estimada (`Precio` - `Neto1`).
    *   `Ficha` / `Ruta` / `PNR` (string): Datos operativos del vuelo.
    *   `Temporada` (string): Agrupación comercial (ej. "Semana Santa 2025").
    *   `TipoProducto` (string): Categoría deducida automáticamente (`CHARTERS`, `CUPOS`, `DESTINO ARG`).
    *   `CarryOn`, `HandBag`, `CheckedBag` (bool): Equipajes incluidos.
    *   `Agencia` (string): Agencia dueña del cupo comercial.
    *   `RestrictedAgency` / `SourceAgency` / `TransferID`: Auditoría y control para cesiones de disponibilidad.

### B. Tabla `reservations` (Modelo `Reservation`)
Representa una orden de pedido o reserva realizada por un agente de viajes que puede agrupar a varios pasajeros.
*   **Relaciones:** `BelongsTo` con `Product` (a través de `ProductID`) y `HasMany` con `Passenger`.
*   **Campos clave:**
    *   `ID` (uint, PK)
    *   `ProductID` (uint, FK)
    *   `CreatedBy` (uuid.UUID, FK): Identificador del perfil que creó la reserva.
    *   `Estado` (string): Estados posibles: `bloqueo_temporal`, `confirmada`, `solicitud_cancelacion`, `cancelada`, `expirada`.
    *   `BloqueoExpiraAt` (`*time.Time`): Fecha de caducidad para el bloqueo preventivo de asientos.
    *   `PrecioVenta` / `Neto1` (float64): Valores de venta y costo consolidados.
    *   `PedidoID` (string, no nulo): ID único del pedido (ej. "AI-1700000000-15").
    *   `Agencia` (string): Agencia vendedora (Jetmar o Tienda Viajes).
    *   `ContactoNombre` / `ContactoEmail` / `ContactoTelefono` (string): Datos del titular del pedido.
    *   `VueloCodigo` / `VueloDestino` / `VueloCompania` / `VueloSalida` / `VueloRuta`: Datos de vuelo persistidos de forma estática para auditoría histórica.
    *   `Passengers` ([]Passenger): Colección de pasajeros de la reserva.

### C. Tabla `passengers` (Modelo `Passenger`)
Representa al pasajero individual. Cada pasajero consume exactamente un asiento del stock y se asocia a un boleto.
*   **Relaciones:** `BelongsTo` con `Reservation` (a través de `ReservationID`).
*   **Campos clave:**
    *   `ID` (uint, PK)
    *   `ReservationID` (uint, FK): Vínculo con la orden superior.
    *   `PedidoID` (string): ID de pedido de la orden.
    *   `Nombre` / `Apellido` / `Documento` / `Nacionalidad` (string): Datos de identidad extraídos por IA o ingresados manualmente.
    *   `Nacimiento` (`*time.Time`): Fecha de nacimiento para cálculo de edad en fecha de retorno.
    *   `TipoPasajero` (string): Categoría (`Adulto`, `Niño`, `Infante`).
    *   `NRO` (int): Campo crítico de control (`1` = Venta Válida, `0` = Acompañante/Infante).
    *   `Estado` (string): Estado del pasaje (mismos estados de la reserva).
    *   `PrecioVenta` / `Neto1` (float64): Precios desglosados unitarios.
    *   `NumeroTicket` (string): Número de boleto aéreo emitido.

### D. Otras Tablas de la Base de Datos
*   **`profiles`:** Usuarios del sistema con privilegios (`admin`, `agency_admin`, `agency_user`).
*   **`agencies`:** Agencias autorizadas en la plataforma (Jetmar, Tienda Viajes, Buemes, etc.).
*   **`white_label_configs`:** Configuraciones visuales, logos y colores específicos por agencia.
*   **`system_settings`:** Ajustes globales guardados en JSONB.
*   **`notifications`:** Canal de alertas por usuario, rol o agencia.
*   **`system_logs`:** Registro de requests HTTP, auditoría de logs, errores y ejecuciones de tareas Cron.
*   **`permissions`, `roles`, `user_roles`, `role_permissions`:** Estructura para el Control de Acceso Basado en Roles (RBAC).
*   **`email_smtp_configs`, `email_templates`:** Configuraciones SMTP de correo y plantillas HTML para correos transaccionales por agencia.
*   **`ai_providers`, `ai_actions`, `ai_sessions`, `ai_messages`:** Datos y logs de interacciones de chat con Inteligencia Artificial.
*   **`availability_transfers`:** Registro de cesión o transferencia de disponibilidad de cupos entre agencias.
*   **`product_shared_agencies`:** Cupos compartidos de manera directa sin duplicar registros.

---

## 3. Conexión de Base de Datos (GORM y PostgreSQL)

*   **Archivo de conexión:** `backend-go/pkg/database/db.go`
*   **Inicialización:** `database.InitDB()`
*   **Lógica de conexión:**
    - Lee la variable de entorno `DATABASE_URL` (direct connection string de PostgreSQL).
    - En caso de estar vacía, construye dinámicamente el DSN a partir de los componentes individuales: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_SSLMODE`.
    - Lanza la conexión usando `gorm.Open` con el driver `postgres.Open(dsn)`.
    - Configura el Logger predeterminado de GORM para imprimir las consultas SQL generadas en modo debug si corresponde.
    - Exporta el puntero global `DB *gorm.DB` de manera segura para ser consumido por todos los servicios y handlers del backend.

---

## 4. Arquitectura de Seguridad y RBAC

El sistema de seguridad de `backend-go` implementa control de acceso granular a dos niveles:

1.  **Autenticación JWT:**
    - El middleware `middleware.AuthMiddleware()` intercepta cada solicitud, extrae el token del header `Authorization: Bearer <token>`, valida su firma criptográfica y tiempo de expiración.
    - Inyecta en el contexto de Gin (`c.Set`) las variables `userID`, `role`, `agencia` y `email` para que estén disponibles en los controladores.

2.  **Autorización Basada en Roles (RBAC):**
    - Se definen middlewares específicos para restringir rutas críticas:
        - `middleware.AdminOnly()`: Acceso exclusivo para el rol `admin`.
        - `middleware.AgencyAdminOrAdmin()`: Acceso restringido para `admin` o `agency_admin` (este último acotado a registros de su propia agencia).
    - El módulo de reportes está completamente protegido por `AgencyAdminOrAdmin()`, previniendo que agentes regulares puedan visualizar datos agregados de costos, rentabilidad, riesgo de sucursales o márgenes financieros del negocio.

---

## 5. Reglas de Negocio de Reportería y Lógica Cockpit

Para garantizar que los reportes sean 100% exactos y paritarios con las expectativas ejecutivas, se implementó la lógica precisa de `backend-report` basada en la nómina de pasajeros:

### A. La Regla de la "Venta Válida"
No todas las filas de la tabla de pasajeros son computadas como asientos comerciales ocupados en los reportes financieros. Para ser una venta válida, el pasajero debe cumplir:
-   **Caso NRO = 1:** El pasajero es un adulto o niño que paga tarifa estándar. Se computa siempre como venta válida (`true`).
-   **Caso NRO = 0:** El pasajero es un infante o acompañante de brazos. Se computa como venta válida **ÚNICAMENTE** si su edad en la fecha de regreso del vuelo (`FechaRegreso` del producto) es **menor de 2 años**.
-   **Cálculo de edad preciso:** Se calcula la diferencia temporal exacta en base a horas anuales: `Sub(nacimiento) / (24 * 365.25)`.

### B. Fórmulas Financieras y de Riesgo
*   **Rentabilidad (Utilidad Operativa):** `SUM(Vendidos * OP)` por cada producto.
*   **Costo Real (De lo vendido):** `SUM(Vendidos * Neto1)`
*   **Costo Total de Contrato (Riesgo total de compra):** `SUM(Cupo * Neto1)`
*   **Venta Real:** `SUM(Vendidos * Precio)`
*   **Venta Total Potencial:** `SUM(Cupo * Precio)`
*   **Riesgo Económico (Asientos vacíos no vendidos):** `(Lugares Disponibles * Neto1)`
*   **Tasa de Ocupación (% de venta):** `(Lugares Vendidos / (Cupos Tomados - Cancelados)) * 100`

### C. Normalización y Comparativa
-   **Filtros Inteligentes de Acentos:** La función `normalize()` elimina acentos (ej. "AÉREO" -> "aereo"), homogeneiza espacios múltiples y convierte a minúsculas, evitando inconsistencias al filtrar por temporadas o destinos.
-   **Categorización por Código:** El tipo de producto se infiere de los prefijos del código de cupo (`_CH-` -> CHARTERS, `DEST_ARG` -> DESTINO ARG, resto -> CUPOS).
-   **Filtro de Agencia Inteligente:** El algoritmo normaliza la agencia de la reserva. Si contiene la palabra "tienda", se asigna a "Tienda Viajes"; en caso contrario, se asigna al market share de "Jetmar".

---
*Este reporte unifica y convalida la veracidad y calidad técnica de todo el desarrollo de reportería integrada en el backend y cockpit interactivo del frontend.*
