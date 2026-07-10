# Implementación de Módulo de Reportes Avanzados (Go Migration)

Este documento detalla los cambios realizados para migrar y adaptar la lógica de reportes del archivo `REPORT_MODULE.md` y el backend original de Node.js al nuevo backend en Go.

## 1. Cambios en Modelos de Datos (Backend Go)

### Product (`internal/models/models.go`)
Se añadieron los siguientes campos para soportar métricas financieras y categorización:
- `Cupo`, `Vendidos`: Para seguimiento de inventario.
- `OP`: Utilidad Operativa por unidad.
- `Neto1`: Costo unitario (protegido para no-admins).
- `TipoProducto`: Categorización automática (CHARTERS, CUPOS, DESTINO ARG).
- `CarryOn`, `HandBag`, `CheckedBag`, `InfFare`, `ChdFare`: Paridad funcional con el backend original.

### Reservation (`internal/models/models.go`)
Se añadieron campos detallados del pasajero y metadatos de vuelo para persistencia histórica, independiente de si el producto original se modifica.

### Passenger (Nuevo Modelo)
Se creó la tabla `passengers` para permitir múltiples viajeros por reserva.
- Incluye el campo `NRO` para identificar "Ventas Válidas" (1 = Venta, 0 = Acompañante/Infante).

## 2. Lógica de Negocio y Handlers

### Categorización Automática (`product_handler.go`)
Se implementó la función `categorizeProduct` que asigna el `TipoProducto` basado en patrones en el `CodigoCupo`:
- `_CH-` o `_CH_` -> CHARTERS
- `DEST_ARG` -> DESTINO ARG
- Otros -> CUPOS

### Regla de Oro: Venta Válida (`order_handler.go`)
Al crear una reserva, se evalúa cada pasajero:
- El primer pasajero siempre es `NRO = 1`.
- Acompañantes son `NRO = 1` si son "Adulto" o "Niño".
- Si son "Infante", solo son `NRO = 1` si tienen menos de 2 años a la fecha de regreso.

### Endpoints de Reportes (`report_handler.go`)
Se implementaron 3 nuevos endpoints:
1. `GET /api/reports/evolution`: Agregación de pasajeros (SUM nro) por mes.
2. `GET /api/reports/agency-share`: Market share basado en el nombre de la agencia (Lógica: Contiene 'tienda' -> Tienda Viajes, else -> Jetmar).
3. `GET /api/reports/destinations-detail`: KPIs por Destino + Temporada.
   - Rentabilidad: `SUM(vendidos * op)`
   - Costo Real: `SUM(vendidos * neto_1)`
   - Venta Real: `SUM(vendidos * precio)`
   - Riesgo: `SUM(disponibilidad * neto_1)`


## 3. Frontend (React)

### Nueva Sección: Reportes
- **Ruta**: `/reportes`
- **Componentes**:
  - Gráfico de Líneas: Evolución temporal de pasajeros.
  - Gráfico de Torta: Market Share por Agencia.
  - Tabla de KPIs: Detalle financiero por destino y temporada.
- **Servicios**: Se actualizaron `reportService.js` y el hook `useReports.js` para conectar con el backend en Go.

## 4. Trazabilidad de Paridad
Con estos cambios, se alcanza la paridad en el módulo de Reportes y se mejora la estructura de datos al separar Pasajeros de Reservas, permitiendo un análisis más granular.
