# Documentación Técnica de Lógica de Negocio y Reportes

Este documento detalla de manera quirúrgica la lógica, modelos de datos, reglas de negocio y fórmulas financieras de la aplicación. El objetivo es facilitar la migración exacta de esta lógica a un backend en Go, permitiendo adaptarla a nuevas estructuras de datos manteniendo la integridad de los reportes.

---

## 1. Fuentes de Datos Originales

La aplicación se basa en dos archivos Excel principales:

1.  **Gestión de Cupos JTT.xlsx**: Contiene el inventario de cupos, costos, ventas proyectadas y disponibilidad.
2.  **Planilla de pasajeros - Cupos JT.xlsx**: Contiene el detalle de ventas reales, pasajeros y su relación con los cupos.

### Modelos de Datos (Campos Clave)

#### A. Modelo: Cupo (CuposData)
| Campo | Descripción |
| :--- | :--- |
| `Codigo de Cupo` | ID único de la salida/cupo. |
| `Destino` | Destino geográfico. |
| `Temporada` / `temporada` | Período de tiempo (ej. Semana Santa 2025). |
| `Cupo` | Cantidad total de lugares tomados/contratados. |
| `Vendidos` | Cantidad de lugares vendidos reportados en cupos. |
| `Cancelados/ Devolución` | Lugares cancelados. |
| `Disponibilidad` | Lugares libres. |
| `NETO 1` | Costo unitario por lugar. |
| `Neto Vendedor` | Precio de venta unitario. |
| `OP` | Utilidad operativa unitaria (`Neto Vendedor - NETO 1` usualmente). |
| `Proveedor` / `Compañía` / `Aerolínea` | Proveedor del servicio (ej. AD, H2). |
| `Tipo Servicio` / `Tipo de servicio` | Ej: Aéreo, Terrestre. |
| `Salida` | Fecha de salida del viaje. |

#### B. Modelo: Pasajero (PasajerosData)
| Campo | Descripción |
| :--- | :--- |
| `Cupo` | Relación con `Codigo de Cupo`. |
| `NRO` | Indicador de venta: `1` = Venta, `0` = Infante/Acompañante. |
| `Agencia` | Agencia que realizó la venta (Jetmar, Tienda Viajes, etc.). |
| `Creado` | Fecha de creación de la reserva/venta. |
| `Fecha Nac` | Fecha de nacimiento del pasajero. |
| `Regreso` | Fecha de regreso del viaje (para cálculo de edad). |

### Campos Técnicos Excluidos
Para la interfaz y reportes limpios, se ignoran campos de gestión interna o metadatos:
`INFO EXTRA`, `REGION`, `TASAS`, `TARIFA`, `Código de Reserva`, `Liberados`, `Gestiona`, `Cancelación sin Gastos`, `Responsable del Grupo`, `Status BOL`, `EMITIDO?`, `Utilidad OPERATIVA`, `Visible Jetmar`, `Visible Tienda`, `Link para reservar`, `CI`, `Pasaporte`, `Celular`, `Hotel`, `Traslados`, `Operador del Hotel`, `Mail del Pasajero`, `Vencimiento CI`, `Status BACK`, `Salida`.

---

## 2. Lógica de Procesamiento y Enriquecimiento

### Normalización de Cadenas
Se aplica una normalización agresiva para comparaciones:
- Eliminar acentos (NFD normalization).
- Convertir a minúsculas.
- Eliminar espacios extra.
- Reemplazar múltiples espacios por uno solo.

### Manejo de Filtros Múltiples
La aplicación permite filtrar por múltiples valores en un mismo campo (ej: varias temporadas a la vez).
- Los valores pueden venir como un Array o como una cadena separada por comas (`,`) o puntos y coma (`;`).
- Al procesar, se expanden estos valores y se comparan individualmente contra los datos normalizados.

### Identificación de "Tipo de Producto" (Tipo de Operación)
Se determina según el `Codigo de Cupo` o `Tipo Servicio`:
1.  **CHARTERS**: Si el código contiene `_CH-`, `_CH_` o `_CH`.
2.  **DESTINO ARG**: Si el código contiene `DEST_ARG`, `DEST_ARG-` o `-DEST_ARG-`.
3.  **CUPOS**: Si el `Tipo Servicio` es `AÉREO` o `AEREO`.

### Extracción de Proveedor (Compañía)
Se busca en múltiples campos (`Proveedor`, `Compañía`, `Aerolínea`). Si no existe, se intenta deducir del `Codigo de Cupo` (buscando tokens de 2-3 caracteres como `AD`, `H2`, `JA`). Se priorizan códigos cortos (<= 2 caracteres para visualización en ciertos gráficos).

### Cruce de Datos (Join)
Para reportes de pasajeros, se enriquece el registro del pasajero con datos del cupo asociado usando `Pasajero.Cupo == Cupo.Codigo de Cupo`:
- Se obtiene `Destino`, `Temporada`, `Proveedor` y `Tipo Servicio` desde el Cupo si no están presentes en el Pasajero.
- Si el pasajero no tiene un `Codigo de Cupo` exacto, se intenta una búsqueda flexible en `cuposData`.

### Canonización de Entradas
Existen mapeos para normalizar entradas de usuario a valores canónicos:
- **Productos**: "ch", "charter" -> `CHARTERS`; "aereo", "cupo" -> `CUPOS`; "dest_arg", "destino argentina" -> `DESTINO ARG`.

---

## 3. Reglas de Negocio Críticas

### Criterio de "Venta Válida"
Una fila de pasajeros cuenta como una venta si y solo si:
1.  `NRO == 1`
2.  **O** `NRO == 0` Y el pasajero es **menor de 2 años** a la fecha de regreso (`Edad < 2`).

### Identificación de Agencias
- **TIENDA VIAJES**: Nombres normalizados que contienen "tienda", "tienda viajes", "tienda de viajes srl".
- **JETMAR**: Todo lo que no sea identificado como Tienda Viajes se atribuye a Jetmar (en el contexto de esta app).

### Deduplicación de Cupos
Al cargar archivos, se deben filtrar duplicados por `Codigo de Cupo` para evitar que variantes del mismo archivo Excel sumen doble.

---

## 4. Fórmulas Financieras (KPIs)

Para un conjunto de datos filtrado:

| KPI | Fórmula |
| :--- | :--- |
| **Rentabilidad** | `SUM(Vendidos * OP)` |
| **Costo (Vendido)** | `SUM(Vendidos * NETO 1)` |
| **Costo Total (Riesgo)** | `SUM(Cupos Tomados * NETO 1)` |
| **Venta (Realizada)** | `SUM(Vendidos * Neto Vendedor)` |
| **Venta Total (Potencial)** | `SUM(Cupos Tomados * Neto Vendedor)` |
| **Riesgo Económico** | `(SUM(Cupos Tomados - Cancelados) * NETO 1) - Costo (Vendido)` |
| **Lugares Disponibles** | `Cupos Tomados - Vendidos - Cancelados` |

---

## 5. Lógica de Reportes (Endpoints / Queries)

### A. Reporte de Evolución (Pasajeros/Ventas)
- **Agrupación**: Mes y Año de la fecha `Creado`.
- **Métrica**: Suma de ventas válidas (ver sección 3).
- **Granularidad**: Soporta Mes, Semana, Hoy (por hora), Mes Actual, Trimestre (Q1-Q4).

### B. Reporte de Agencias (Market Share)
- **Cálculo**:
    1.  Si se filtra por **Destino**: Se agrupan los pasajeros por los cupos que pertenecen a ese destino. Se suma la venta por agencia.
    2.  Si NO se filtra por Destino: Suma global de ventas válidas por agencia.
- **Share**: `(Ventas Agencia / Total Ventas) * 100`.

### C. Reporte Detalle por Destino (Tabla Agregada)
- **Agrupación**: `Destino` + `Temporada`.
- **Métricas**: Sumatoria de todos los KPIs financieros (Sección 4) para todos los cupos que coincidan con la agrupación.

### D. Reporte "Por Salida" (Detalle Individual)
- Lista plana de cada cupo único.
- No hay agregación, se muestran los KPIs financieros por cada `Codigo de Cupo`.

---

## 6. Guía para Adaptación a Nuevo Backend (Go)

Al migrar a una nueva estructura de datos (ej. SQL/NoSQL en lugar de Excel):

1.  **Mapeo de Atributos**: Asegurar que la nueva estructura tenga campos equivalentes para `NRO`, `OP`, `NETO 1`, `Neto Vendedor`, `Cupo`, `Vendidos` y `Cancelados`.
2.  **Normalización en Query**: Si se usa SQL, las comparaciones deben usar `LOWER()`, `TRIM()` y idealmente una función para eliminar acentos (unaccent extension en Postgres) para emular la lógica de JS.
3.  **Lógica de Infantes**: El cálculo de `Edad < 2` debe realizarse en la consulta o en la capa de servicio de Go comparando `FechaNacimiento` vs `FechaRegreso`.
4.  **Caché**: La app implementa un TTL de 10 minutos para los datos procesados. En Go, se recomienda usar un caché in-memory (tipo `Map` con mutex o `go-cache`) o Redis si se escala horizontalmente.
5.  **Paralelismo**: Aprovechar las Goroutines para procesar los diferentes reportes (Evolución, Agencias, Detalle) en paralelo cuando se solicita el Dashboard completo.

---

*Documento generado para precisión quirúrgica en migración de sistemas.*
