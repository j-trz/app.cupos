# Documentación Técnica Integral: LocalApp (Versión Offline/Electron)

Este documento proporciona una especificación quirúrgica de la lógica de negocio, modelos de datos y reportes de la versión `LocalApp`. Esta versión está diseñada para funcionar de manera local/offline, utilizando archivos Excel locales y un sistema de autenticación local, sirviendo el frontend desde un entorno compilado.

---

## 1. Arquitectura de Datos y Fuentes

La aplicación consume datos directamente de archivos Excel. En el entorno `LocalApp`, el backend busca estos archivos en una ruta configurable (`LOCAL_FILES_PATH`), facilitando el modo offline.

### Archivos Fuente
1.  **Gestion de Cupos JTT.xlsx**: Inventario, costos y rentabilidad.
2.  **Planilla de pasajeros - Cupos JT.xlsx**: Ventas reales y datos de pasajeros.

### Modelo de Datos: Cupo (Columnas Clave)
```javascript
{
  "Codigo de Cupo": string,   // ID Único de la salida
  "Destino": string,          // Destino del viaje
  "Temporada": string,        // Ej: "Semana Santa 2025"
  "Cupo": number,             // Total de lugares contratados
  "Vendidos": number,         // Lugares ya vendidos
  "Disponibilidad": number,   // Lugares libres (Calculado: Cupo - Vendidos - Cancelados)
  "NETO 1": number,           // Costo Unitario
  "Neto Vendedor": number,    // Precio de Venta Unitario
  "OP": number,               // Utilidad Operativa (Neto Vendedor - NETO 1)
  "Proveedor": string,        // Compañía (ej: AD, H2, JA)
  "Salida": date/string       // Fecha de salida
}
```

### Modelo de Datos: Pasajero
```javascript
{
  "Cupo": string,             // FK al Codigo de Cupo
  "NRO": number,              // 1 = Venta, 0 = Acompañante/Infante
  "Agencia": string,          // Agencia vendedora (Jetmar vs Tienda)
  "Creado": date/string,      // Fecha de la venta
  "Fecha Nac": date/string,   // Fecha de nacimiento
  "Regreso": date/string      // Fecha de regreso (para cálculo de edad)
}
```

---

## 2. Lógica del Backend (`api-logic.js`)

El backend actúa como un motor de procesamiento que unifica los archivos Excel y expone los resultados vía API.

### Regla de Oro: La Venta Válida
Para que una fila de pasajeros sea contada en los reportes de ventas/evolución, debe cumplir:
```javascript
function esVentaValida(pax) {
  const nro = parseInt(pax['NRO']) || 0;
  if (nro === 1) return true;
  if (nro === 0) {
    // Es venta solo si es menor de 2 años al regreso
    return calcularEdad(pax['Fecha Nac'], pax['Regreso']) < 2;
  }
  return false;
}
```

### Normalización de Filtros y Búsqueda
El backend expande filtros que vienen separados por coma o punto y coma:
```javascript
function expandFilterValues(val) {
  if (val == null) return [];
  let arr = Array.isArray(val) ? val : String(val).split(/[,;]+/);
  return Array.from(new Set(arr.map(v => v.trim().toLowerCase())));
}
```

### Categorización de Producto
La lógica deduce el tipo de operación basándose en patrones en el código de cupo:
- **CHARTERS**: Código contiene `_CH-` o `_CH_`.
- **DESTINO ARG**: Código contiene `DEST_ARG`.
- **CUPOS**: Si `Tipo Servicio` es `AÉREO`.

---

## 3. Fórmulas Financieras y KPIs

Estos cálculos son fundamentales para la precisión de la migración:

| Métrica | Lógica de Cálculo |
| :--- | :--- |
| **Rentabilidad Total** | `SUMA(Vendidos * OP)` |
| **Costo Real** | `SUMA(Vendidos * NETO 1)` |
| **Costo Total (Riesgo)** | `SUMA(Cupo * NETO 1)` |
| **Venta Real** | `SUMA(Vendidos * Neto Vendedor)` |
| **Venta Total** | `SUMA(Cupo * Neto Vendedor)` |
| **Riesgo Económico** | `(Lugares Disponibles * NETO 1)` |

*Nota: El Riesgo representa el costo de los lugares que aún no se han vendido y no han sido cancelados.*

---

## 4. Reportes Específicos

### A. Evolución de Pasajeros (`/api/evolucion-pasajeros`)
Agrupa las ventas válidas por tiempo.
- **Key**: Mes + Año de la columna `Creado`.
- **Filtros**: Aplica filtros cruzados de Destino, Temporada y Proveedor antes de agrupar.

### B. Share por Agencia (`/api/agencias-data`)
Calcula el market share entre Jetmar y Tienda Viajes.
- **Regla de Agencia**: Si el nombre normalizado incluye "tienda", se asigna a Tienda Viajes; de lo contrario, a Jetmar.
- **Especial Destino**: Si hay un filtro de Destino activo, el share se calcula sumando las ventas de todos los cupos asociados a esos destinos.

### C. Detalle Destinos (`/api/detalle-destinos`)
Agregación por `Destino + Temporada`.
- Realiza una sumatoria de todos los KPIs financieros de los cupos que pertenecen a cada par Destino/Temporada.

---

## 5. Implementación del Frontend (`dataProcessor.js`)

En el frontend, la lógica espeja la del backend para permitir cálculos en el cliente cuando sea necesario.

### Carga de Excel con SheetJS
```javascript
const workbook = XLSX.read(data, { type: 'array' });
const sheet = workbook.Sheets[sheetName];
const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
```

### Gestión de Fechas Excel
Crucial para la migración: Los números seriales de Excel (ej: 45657) deben convertirse sumando días a la fecha base `1899-12-30`.
```javascript
new Date(Math.round((excelDate - 25569) * 86400 * 1000))
```

---

## 6. Autenticación Local (`db/localAuth.js`)

`LocalApp` utiliza un sistema de archivos `users.json` para validar credenciales y generar tokens JWT locales, eliminando la dependencia de servicios externos de Auth (como Supabase) en modo offline.

---

## 7. Guía de Migración Quirúrgica a Go

Para asegurar que no haya fallos en la migración:

1.  **Tipado Estricto**: Definir `Structs` en Go que mapeen exactamente las columnas del Excel (incluyendo los alias como `NETO 1`).
2.  **Manejo de Nulos**: En Go, usar punteros o tipos `sql.NullString` / `sql.NullFloat64` ya que los Excel suelen tener celdas vacías que deben tratarse como 0 o "".
3.  **Lógica de Fechas**: Implementar una función robusta para convertir los números seriales de Excel a `time.Time`.
4.  **Agregaciones**: Utilizar `Map` o `Structs` intermedios para realizar las sumatorias de `Rentabilidad`, `Costo` y `Riesgo` antes de devolver la respuesta JSON.
5.  **Normalización UNACCENT**: En Go, usar librerías para eliminar diacríticos (acentos) al procesar filtros, igual que hace `normalize()` en JS.

---
*Este documento es la fuente de verdad técnica para la estructura y lógica de LocalApp.*
