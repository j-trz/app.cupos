# Estructura de Datos Real - Sistema de Cupos de Vuelo

## Resumen

Documentación de la estructura de datos real utilizada por el sistema de cupos de vuelo basado en SharePoint/Power Automate. Todas las fuentes de datos alternativas deben mapear a esta estructura estándar.

## Flujo de Operaciones

### 1. **Consultar Solicitudes y Confirmaciones**

**Endpoint:** GET "Tabla pedidos"  
**Descripción:** Obtiene todos los pedidos con sus estados actuales

### 2. **Consultar Disponibilidad**

**Endpoint:** GET "Tabla productos"  
**Descripción:** Obtiene cupos disponibles y precios

### 3. **Crear Solicitud**

**Endpoint:** POST "Tabla pedidos"  
**Descripción:** Crea una nueva solicitud de cupo

## Estructuras de Datos

### **Tabla Pedidos** (Solicitudes y Confirmaciones)

#### Estructura Completa de Respuesta GET:

```json
[
  {
    "@odata.etag": "", // Metadata de SharePoint
    "ItemInternalId": "b5f9d057-95c9-4270-b4ab-8d68297393df", // GUID interno
    "Estado": "Confirmado", // "Solicitado", "Confirmado", "Rechazado"
    "Pedido_ID": "PED-2025-SKL1IAPQ", // Identificador único del pedido
    "Agencia": "Jetmar Viajes", // Nombre de la agencia
    "Contacto_Nombre": "Julian Estefan", // Nombre del contacto principal
    "Contacto_Email": "julian.estefan@jetmar.com.uy", // Email del contacto
    "Contacto_Telefono": "99457412", // Teléfono del contacto
    "Vuelo_Codigo": "CUPO001", // Código del cupo
    "Vuelo_Destino": "REC", // Código del destino
    "Vuelo_Compania": "AZUL", // Compañía aérea
    "Vuelo_Salida": "10OCT25", // Fecha de salida (formato personalizado)
    "Vuelo_Precio": "1000", // Precio en string
    "Nombre_Pasajero": "Julian", // Nombre del pasajero
    "Apellido_Pasajero": "Estefan", // Apellido del pasajero
    "Documento_Pasajero": "454545", // Documento del pasajero
    "Nacimiento_Pasajero": "45814", // Fecha de nacimiento (formato especial)
    "Nacionalidad_Pasajero": "UY", // Código de nacionalidad
    "Tipo_Pasajero": "Adulto", // "Adulto", "Niño", "Bebé"
    "Temporada": "VERANO", // Temporada
    "Ruta": "AD 1234 10OCT MVD REC 10:40 11:40 AD 1054 15OCT REC MVD 01:00 03:00", // Ruta completa
    "Ficha": "123456", // Número de ficha
    "Pnr": "ABCD12", // Código PNR
    "Fecha_Registro": "2025-09-04T20:14:00.8487379Z" // Fecha ISO 8601
  }
]
```

#### Estructura POST para Crear Solicitud:

```json
{
  "pedido_id": "PED-2025-ABC123", // ID único del pedido
  "contacto_nombre": "Julian Estefan", // Nombre del contacto
  "agencia": "Jetmar Viajes", // Nombre de la agencia
  "contacto_email": "julian@jetmar.com.uy", // Email del contacto
  "contacto_telefono": "99457412", // Teléfono del contacto
  "vuelo_codigo": "CUPO001", // Código del cupo
  "pnr": "ABCD12", // Código PNR
  "ficha": "123456", // Número de ficha
  "ruta": "AD 1234 10OCT MVD REC 10:40 11:40", // Ruta del vuelo
  "temporada": "VERANO", // Temporada
  "vuelo_destino": "REC", // Destino del vuelo
  "vuelo_compania": "AZUL", // Compañía aérea
  "vuelo_salida": "10OCT25", // Fecha de salida
  "vuelo_precio": "1000", // Precio del vuelo
  "nombre_pasajero": "Julian", // Nombre del pasajero
  "apellido_pasajero": "Estefan", // Apellido del pasajero
  "documento_pasajero": "454545", // Documento del pasajero
  "nacimiento_pasajero": "45814", // Fecha de nacimiento
  "nacionalidad_pasajero": "UY", // Nacionalidad del pasajero
  "tipo_pasajero": "Adulto" // Tipo de pasajero
}
```

### **Tabla Productos** (Disponibilidad)

#### Estructura GET:

```json
[
  {
    "@odata.etag": "", // Metadata de SharePoint
    "ItemInternalId": "1058dc2e-f093-4ab4-9dd5-88a626477cb0", // GUID interno
    "codigo_cupo": "CUPO001", // Código del cupo
    "destino": "REC", // Código del destino
    "compania": "AZUL", // Compañía aérea
    "disponibilidad": "10", // Cupos disponibles (string)
    "salida": "10FEB26", // Fecha de salida
    "regreso": "22FEB26", // Fecha de regreso
    "precio": "840", // Precio (string)
    "ruta": "AD 1234 10FEB MVD REC 10:40 11:40 AD 1054 22FEB REC MVD 01:00 03:00", // Ruta completa
    "pnr": "ABCD12", // Código PNR
    "ficha": "123456", // Número de ficha
    "temporada": "VERANO 2026" // Temporada con año
  }
]
```

## Mapeo para Fuentes Alternativas

### **Campos Obligatorios para Mapeo**

#### Solicitudes/Confirmaciones:

- `Estado` → Estado de la solicitud
- `Pedido_ID` → Identificador único
- `Agencia` → Nombre de la agencia
- `Contacto_Nombre` → Nombre del contacto
- `Vuelo_Destino` → Código del destino
- `Nombre_Pasajero` → Nombre del pasajero
- `Apellido_Pasajero` → Apellido del pasajero
- `Fecha_Registro` → Fecha de creación

#### Disponibilidad:

- `codigo_cupo` → Código del cupo
- `destino` → Código del destino
- `compania` → Compañía aérea
- `disponibilidad` → Cupos disponibles
- `precio` → Precio del cupo
- `salida` → Fecha de salida
- `temporada` → Temporada

### **Valores Estándar**

#### Estados Válidos:

- `"Solicitado"` - Solicitud pendiente
- `"Confirmado"` - Reserva confirmada
- `"Rechazado"` - Solicitud rechazada

#### Tipos de Pasajero:

- `"Adulto"` - Mayor de 12 años
- `"Niño"` - Entre 2 y 12 años
- `"Bebé"` - Menor de 2 años

#### Temporadas Comunes:

- `"VERANO"` - Temporada alta de verano
- `"INVIERNO"` - Temporada de invierno
- Formato con año: `"VERANO 2026"`

### **Formatos Especiales**

#### Fechas:

- **Registro:** ISO 8601 → `"2025-09-04T20:14:00.8487379Z"`
- **Salida/Regreso:** Formato personalizado → `"10OCT25"`, `"22FEB26"`
- **Nacimiento:** Formato especial → `"45814"` (número de días desde época)

#### Ruta:

Formato: `"VUELO FECHA ORIGEN DESTINO HORA_SAL HORA_LLEG VUELO_REG FECHA_REG DEST_REG ORIG_REG HORA_SAL_REG HORA_LLEG_REG"`

Ejemplo: `"AD 1234 10OCT MVD REC 10:40 11:40 AD 1054 15OCT REC MVD 01:00 03:00"`

## Implementación en Otras Fuentes

### **Supabase → Mapeo**

```javascript
const supabaseToStandard = (supabaseRecord) => ({
  Estado: supabaseRecord.status,
  Pedido_ID: supabaseRecord.id,
  Agencia: supabaseRecord.agency_name,
  Contacto_Nombre: supabaseRecord.contact_name,
  Vuelo_Destino: supabaseRecord.destination_code,
  // ... resto del mapeo
});
```

### **MongoDB → Mapeo**

```javascript
const mongoToStandard = (mongoDoc) => ({
  Estado: mongoDoc.status,
  Pedido_ID: mongoDoc._id,
  Agencia: mongoDoc.agencyName,
  Contacto_Nombre: mongoDoc.contactName,
  Vuelo_Destino: mongoDoc.destinationCode,
  // ... resto del mapeo
});
```

### **Smartsheet → Mapeo**

```javascript
const smartsheetToStandard = (row) => ({
  Estado: row.cells[0].value, // Columna A
  Pedido_ID: row.cells[1].value, // Columna B
  Agencia: row.cells[2].value, // Columna C
  Contacto_Nombre: row.cells[3].value, // Columna D
  // ... mapeo por posición de columna
});
```

### **Tableau → Mapeo**

```javascript
const tableauToStandard = (tableauData) => ({
  Estado: tableauData["Request Status"],
  Pedido_ID: tableauData["Order ID"],
  Agencia: tableauData["Agency Name"],
  Contacto_Nombre: tableauData["Contact Name"],
  // ... resto del mapeo
});
```

## Validaciones Requeridas

### **Campos Obligatorios:**

- Pedido_ID debe ser único
- Estado debe estar en valores válidos
- Fechas deben estar en formato correcto
- Precios deben ser numéricos (aunque se almacenen como string)
- Emails deben tener formato válido

### **Reglas de Negocio:**

- No puede haber dos pedidos con el mismo Pedido_ID
- La disponibilidad debe ser mayor a 0 para permitir solicitudes
- Los precios deben ser positivos
- Las fechas de salida deben ser futuras para nuevas solicitudes

Esta estructura garantiza compatibilidad total con el sistema existente mientras permite integración con múltiples fuentes de datos.
