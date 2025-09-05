# Arquitectura de Conexiones Dinámicas vs Variables de Entorno

## Problema Identificado

El usuario correctamente identificó una contradicción fundamental en el sistema:

> "Entiendo que si en el futuro se quiere cambiar la conexión estas variables no tendrian sentido o si?"

**Respuesta: Tienes razón completamente**. Las variables de entorno hardcodeadas (`VITE_POWERAUTOMATE_GET_URL`, `VITE_POWERAUTOMATE_GET_URL_SS`) son incompatibles con el concepto de conexiones dinámicas.

## Solución Implementada

### 1. **Arquitectura Híbrida (Transición)**

```javascript
// Prioridad de selección de endpoints:
1. Conexión activa (dinámico) - FUTURO
2. Variables de entorno (fallback) - PRESENTE
3. Error si no hay ninguna - FALLO CONTROLADO
```

### 2. **Diferentes Endpoints por Tipo de Datos**

```javascript
// Antes (problemático):
getDataFromActiveConnection(); // Mezclaba todos los datos

// Ahora (correcto):
getDataFromActiveConnection("pedidos"); // Tabla pedidos (solicitudes/confirmaciones)
getDataFromActiveConnection("productos"); // Tabla productos (disponibilidad)
```

### 3. **Variables de Entorno como Fallback Temporal**

```env
# Para desarrollo y migración gradual:
VITE_POWERAUTOMATE_GET_URL=https://...      # Para productos/disponibilidad
VITE_POWERAUTOMATE_GET_URL_SS=https://...   # Para pedidos/solicitudes
```

## Evolución del Sistema

### **Fase 1: Sistema Actual (Variables Hardcodeadas)**

```
Frontend → Variables .env → Power Automate endpoints fijos
```

### **Fase 2: Sistema Híbrido (Implementado Ahora)**

```
Frontend → Conexión Activa? → Endpoints dinámicos
         ↓ (si no existe)
         → Variables .env → Endpoints fijos (fallback)
```

### **Fase 3: Sistema Completamente Dinámico (Futuro)**

```
Frontend → Conexión Activa → Cualquier API (PA, Supabase, MongoDB, etc.)
         ↓ (sin fallback)
         → Error controlado si no hay conexión
```

## Beneficios de la Nueva Arquitectura

### **1. Flexibilidad Total**

```javascript
// Un usuario puede usar Power Automate:
const conexionPA = {
  type: "powerautomate",
  credentials: {
    pedidosUrl: "https://prod-xx.powerautomate.com/flows/pedidos",
    productosUrl: "https://prod-xx.powerautomate.com/flows/productos",
  },
};

// Otro usuario puede usar Supabase:
const conexionSupabase = {
  type: "supabase",
  credentials: {
    url: "https://xyz.supabase.co",
    apiKey: "eyJhbGciOiJ...",
  },
};
```

### **2. Independencia de Entorno**

- **Desarrollo**: Variables .env como fallback
- **Producción**: Conexiones dinámicas por usuario
- **Testing**: Conexiones mockeadas

### **3. Escalabilidad**

```javascript
// Soporte futuro para múltiples fuentes simultáneas:
const usuario1 = { conexionActiva: "powerautomate" };
const usuario2 = { conexionActiva: "supabase" };
const usuario3 = { conexionActiva: "mongodb" };
```

## Implementación Técnica

### **Detección Automática de Tipo de Datos**

```javascript
// connectionService.js
static async getDataFromPowerAutomate(dataType = "pedidos") {
  if (dataType === "productos") {
    targetUrl = credentials.productosUrl || import.meta.env.VITE_POWERAUTOMATE_GET_URL;
  } else {
    targetUrl = credentials.pedidosUrl || import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS;
  }
}
```

### **Filtrado Inteligente por Tipo**

```javascript
// reservationService.js
static async _fetchAvailability() {
  // Solicitar específicamente datos de productos
  const result = await ConnectionService.getDataFromActiveConnection("productos");

  // Filtrar solo productos válidos
  const availabilityData = result.data.filter(item =>
    item.codigo_cupo && item.destino && item.compania && item.disponibilidad !== undefined
  );
}
```

## Migración Recomendada

### **Paso 1: Aplicar SQL Migration**

```sql
-- sql/add_is_active_column.sql
ALTER TABLE data_connections ADD COLUMN is_active BOOLEAN DEFAULT false;
```

### **Paso 2: Configurar Conexión Power Automate**

1. Ir a "Gestión de Conexiones"
2. Crear nueva conexión Power Automate
3. Configurar endpoints separados:
   - **Pedidos URL**: Para solicitudes y confirmaciones
   - **Productos URL**: Para disponibilidad

### **Paso 3: Eliminar Dependencia de Variables**

Una vez que todos los usuarios tengan conexiones configuradas:

```javascript
// Futuro: Eliminar fallback a variables de entorno
static async getDataFromPowerAutomate(dataType) {
  const activeConnection = await this.getActiveConnection();
  if (!activeConnection) {
    throw new Error("No hay conexión configurada");
  }
  // No más fallback a import.meta.env
}
```

## Conclusión

**La arquitectura actual resuelve la contradicción identificada** implementando:

1. **Compatibilidad hacia atrás**: Variables de entorno siguen funcionando
2. **Flexibilidad futura**: Conexiones dinámicas por usuario
3. **Separación de responsabilidades**: Diferentes endpoints para diferentes tipos de datos
4. **Transición gradual**: Sistema híbrido permite migración sin interrupciones

Esta solución permite que el sistema evolucione desde endpoints fijos hacia un sistema completamente dinámico y multi-plataforma, manteniendo la funcionalidad actual durante la transición.
