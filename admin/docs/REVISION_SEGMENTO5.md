# Revisión de Componentes de Disponibilidad y Solicitudes

## Problemas Identificados

### 1. Exposición de Endpoints Sensibles (Crítico)

**En `Disponibilidad.jsx` (líneas 70-73, 147-149):**

```jsx
// Endpoint de carga
const response = await fetch(import.meta.env.VITE_POWERAUTOMATE_GET_URL, {
  method: "GET",
  headers: { "Content-Type": "application/json" }
});

// Endpoint de envío
const response = await fetch(import.meta.env.VITE_POWERAUTOMATE_POST_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(registro)
});
```

Este es un **problema crítico** porque:
- Exposición directa de URLs sensibles en el frontend
- Cualquier persona puede inspeccionar y acceder a estos endpoints
- Sin autenticación adecuada, permite ataques a los endpoints Power Automate
- Facilita a los atacantes la identificación de la infraestructura subyacente

### 2. Manipulación de Datos Sensibles sin Protecciones (Alto Riesgo)

**En `enviarReserva()` (líneas 121-142):**
```jsx
const registros = pasajeros.map(p => ({
  pedido_id: pedidoId,
  agencia: contacto.agencia,
  contacto_nombre: contacto.nombre,
  // ...otros datos sensibles...
  documento_pasajero: p.documento,  // DATOS SENSIBLES
  nacimiento_pasajero: p.nacimiento,  // DATOS SENSIBLES
  nacionalidad_pasajero: p.nacionalidad  // DATOS SENSIBLES
}));
```

Problemas:
- Tratamiento de datos personales sensibles sin enmascaramiento
- No hay validación adecuada antes del envío
- Ausencia de cifrado en los datos sensibles
- Posible violación de regulaciones de protección de datos (GDPR, CCPA)

### 3. Autenticación Insuficiente de Operaciones (Medio-Alto Riesgo)

En el proceso de enviar reserva, no se verifica explícitamente si:
- El usuario está autenticado
- Tiene permisos para realizar reservas
- La capacidad de cupo es suficiente (la verificación depende solo del frontend)

### 4. Vulnerabilidad a Ataques de Fuerza Bruta (Medio Riesgo)

La generación de `pedidoId` es predecible:
```jsx
pedidoId(`PED-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`)
```

Esto permite a un atacante intentar predecir IDs de pedidos y realizar consultas maliciosas.

## Recomendaciones de Seguridad

### 1. Implementar Proxy Backend para Endpoints Sensibles

**Enfoque recomendado:**
```ts
// supabase/functions/reservation-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    // 1. Verificar autenticación
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
    
    // 2. Validar usuario y permisos
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);
    
    // 3. Procesar solicitud
    const { action, payload } = await req.json();
    
    switch (action) {
      case 'get-availability':
        return await fetchAvailability(payload);
      case 'submit-reservation':
        return await processReservation(payload, user);
      default:
        return jsonResponse({ error: 'Invalid action' }, 400);
    }
    
  } catch (error) {
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
```

### 2. Modificar Componente Disponibilidad para Usar la Capa de Backend

**Ejemplo de frontend seguro:**

```jsx
async function fetchDisponibilidad() {
  setLoading(true);
  try {
    // Usar función backend en lugar de llamar directamente a Power Automate
    const { data, error } = await supabase.functions.invoke('reservation-proxy', {
      body: { action: 'get-availability' }
    });
    
    if (error) throw error;
    setDatos(data || []);
    
  } catch (error) {
    console.error('Error:', error);
    setDatos([]);
  } finally {
    setLoading(false);
  }
}

async function enviarReserva(e) {
  e.preventDefault();
  setEnviando(true);
  
  try {
    // Validar datos locales antes del envío
    const isValid = validatePassengers(pasajeros);
    if (!isValid) throw new Error('Datos de pasajeros inválidos');
    
    // Enviar a la función backend
    const { data, error } = await supabase.functions.invoke('reservation-proxy', {
      body: {
        action: 'submit-reservation',
        payload: {
          pedidoId,
          vuelo: vueloSeleccionado,
          pasajeros,
          contacto
        }
      }
    });
    
    if (error) throw error;
    
    Swal.fire({
      icon: 'success',
      title: 'Reserva enviada',
      text: `Solicitud registrada. Número: ${data.referenceId}`
    });
    
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error en reserva',
      text: error.message || 'No se pudo procesar su solicitud'
    });
    
  } finally {
    setEnviando(false);
    setModalOpen(false);
    fetchDisponibilidad();
  }
}
```

### 3. Implementar Validaciones Adicionales en Frontend

```jsx
// Validar documentos de viajeros
function validarDocumento(tipo, documento) {
  if (!documento) return false;
  
  // Lógica de validación por tipo de documento
  switch(tipo) {
    case 'dni':
      return /^\d{7,8}$/.test(documento);
    case 'pasaporte':
      return /^[A-Z]{2}[0-9]{6,8}$/.test(documento);
    case 'ci':
      return /^[0-9]{6,7}[0-9A-Z]{1}$/.test(documento);
    default:
      return true; // Tipo desconocido, permitir pero registrar
  }
}

// Validar fechas de nacimiento
function validarNacimiento(fecha) {
  const hoy = new Date();
  const nacimiento = new Date(fecha);
  const edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  // Validar edad mínima
  if (edad < 18 && (edad > 0 || (edad === 0 && mes < 0))) {
    return 'El pasajero debe ser mayor de edad o acompañado';
  }
  return null;
}
```

### 4. Mejoras en Manejo de Datos Sensibles

- **Enmascarar datos sensibles** en el frontend:
  ```jsx
  // Mostrar solo los últimos 4 dígitos del documento
  function enmascararDocumento(doc) {
    return doc ? `***${doc.slice(-4)}` : '';
  }
  ```

- **Implementar confirmación de procesamiento de datos**:
  ```jsx
  // Antes de enviar la reserva
  const confirm = await Swal.fire({
    title: 'Confirmación de datos personales',
    html: `<p>Está a punto de enviar datos personales sensibles (documentos, fechas de nacimiento).</p>
           <p>¿Está seguro de que desea continuar?</p>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, enviar',
    cancelButtonText: 'Cancelar'
  });
  ```

### 5. Mejoras de Seguridad en Identificadores

- **Generar IDs de pedido criptográficamente seguros**:
  ```jsx
  // Generar ID único y no predecible
  function generarPedidoId() {
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `PED-${new Date().getFullYear()}-${randomPart.toUpperCase()}`;
  }
  ```

## Conclusión

La implementación actual de disponibilidad y solicitudes presenta riesgos significativos:
1. Exposición de endpoints internos al frontend
2. Tratamiento inseguro de datos personales sensibles
3. Falta de autorización adecuada para operaciones críticas
4. Vulnerabilidades predecibles en identificadores

**Recomendaciones Clave:**
- Implementar una capa de backend como intermediaria para todas las operaciones sensibles
- No exponer endpoints externos directamente en el frontend
- Agregar validaciones robustas para datos sensibles
- Enmascarar información sensible en la UI
- Usar identificadores no predecibles para transacciones

Esto es consistente con los problemas identificados en otras partes de la aplicación, reforzando la necesidad urgente de una arquitectura basada en una capa de backend para proteger operaciones críticas.