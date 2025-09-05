# Revisión de Componentes de Solicitudes

## Problemas Identificados

### 1. Exposición de Endpoints Sensibles (Crítico)

**En `Solicitudes.jsx` (líneas 36-38):**
```jsx
const response = await fetch(import.meta.env.VITE_POWERAUTOMATE_GET_URL_SS, {
  method: "GET",
  headers: { "Content-Type": "application/json" }
});
```

Este problema es consistente con el identificado en `Disponibilidad.jsx`:
- Los endpoints de Power Automate están expuestos directamente en el frontend
- No hay capa de intermediación para proteger estas URLs sensibles
- Cualquier usuario puede descubrir estas URLs y acceder directamente a los servicios backend

### 2. Filtrado de Datos en el Frontend (Alto Riesgo)

El filtro de datos por roles se realiza completamente en el frontend:

```jsx
let all = response.ok ? await response.json() : [];
all = all.filter(item => item.Estado === "Solicitado");
if (!perfilData?.admin && perfilData?.agencia) {
  all = all.filter(item => item.Agencia === perfilData.agencia);
}
```

Esto presenta un **riesgo elevado** porque:
- No previene que usuarios no autorizados accedan a datos que no deberían ver
- Un atacante puede modificar el código en el navegador para eliminar estos filtros
- No hay verificación de autorización en el backend
- Se descargan todos los datos para luego filtrarlos, lo que es ineficiente

### 3. Ciclo de Actualización Cada 30 Segundos sin Control (Medio Riesgo)

El componente utiliza un intervalo de 30 segundos para actualizar continuamente los datos:

```jsx
useEffect(() => {
  // ...
  intervalId = setInterval(fetchPerfilYDatos, 30000);
  return () => clearInterval(intervalId);
}, []);
```

Problemas:
- Consume recursos innecesarios cuando no es necesario
- No hay retroceso exponencial ni control de errores
- No se consideran los límites de rate limiting de los servicios externos
- La actualización es demasiado frecuente para una interfaz que no requiere tiempo real

### 4. Estado y Validación de Filtros Incompletos (Bajo-Medio Riesgo)

- El filtro de fecha `filtroFechaDesde` está declarado pero no se inicializa ni se utiliza
- No hay validación de fechas (por ejemplo, que "Desde" sea anterior a "Hasta")
- No hay indicación visual al usuario sobre qué filtros están activos

### 5. Estructura de Código y Organización (Bajo Riesgo)

- Las opciones para los select se generan en cada renderización, lo que puede afectar el rendimiento
- El componente mezcla lógica de autenticación, autorización y presentación sin separación adecuada

## Recomendaciones de Seguridad

### 1. Implementar la Capa Backend Compartida

Tanto `Disponibilidad.jsx` como `Solicitudes.jsx` acceden a endpoints de Power Automate directamente. Estos componentes deben usar la misma función backend proxy recomendada anteriormente:

```jsx
// Uso consistente de la función backend para solicitudes
async function fetchSolicitudes() {
  const { data, error } = await supabase.functions.invoke('reservation-proxy', {
    body: { 
      action: 'get-requests',
      payload: {
        estado: filtroEstado,
        agencia: filtroAgencia,
        destino: filtroDestino,
        pedidoId: filtroPedido,
        fechaHasta: filtroFechaHasta
      }
    }
  });
  
  if (error) {
    console.error('Error:', error);
    return [];
  }
  
  return data || [];
}
```

### 2. Mover la Lógica de Filtros al Backend

La lógica de autorización debe trasladarse al backend para evitar manipulación:

```ts
// Ejemplo en la función backend proxy
async function getRequests(payload, user) {
  // 1. Obtener perfil del usuario
  const { data: perfil } = await supabase
    .from('profiles')
    .select('admin, agencia')
    .eq('id', user.id)
    .single();
  
  // 2. Consultar Power Automate
  const response = await fetch(Deno.env.get('VITE_POWERAUTOMATE_GET_URL_SS'), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  let solicitudes = response.ok ? await response.json() : [];
  
  // 3. Aplicar filtros según permisos - ahora seguro
  solicitudes = solicitudes.filter(item => item.Estado === "Solicitado");
  
  // 4. Filtro por agencia solo si no es admin
  if (!perfil.admin && perfil.agencia) {
    solicitudes = solicitudes.filter(item => item.Agencia === perfil.agencia);
  }
  
  // 5. Aplicar filtros adicionales del payload
  if (payload.estado) {
    solicitudes = solicitudes.filter(item => item.Estado === payload.estado);
  }
  
  return { data: solicitudes };
}
```

### 3. Implementar Politica de Polling Más Eficiente

**Opción 1 - Intervalo configurable:**
```jsx
// Usar intervalos más largos y permitir control manual
const POLLING_INTERVAL = 60000; // 60 segundos en lugar de 30

useEffect(() => {
  const intervalId = setInterval(fetchSolicitudes, POLLING_INTERVAL);
  return () => clearInterval(intervalId);
}, [filtroEstado, filtroAgencia, filtroDestino, filtroPedido, filtroFechaHasta]);
```

**Opción 2 - Control manual con botón:**
```jsx
// Eliminar el intervalo y agregar un botón de actualización manual
function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <>
      <button onClick={handleRefresh}>
        Actualizar datos
      </button>
      <Solicitudes key={refreshTrigger} />
    </>
  );
}
```

### 4. Mejoras en la UI y Validaciones

**Validación de fechas en frontend:**
```jsx
function validarFechas(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return true;
  
  const desde = new Date(fechaDesde);
  const hasta = new Date(fechaHasta);
  
  return desde <= hasta;
}

// En el componente
const [errorFecha, setErrorFecha] = useState('');
useEffect(() => {
  if (filtroFechaDesde && filtroFechaHasta) {
    const esValida = validarFechas(filtroFechaDesde, filtroFechaHasta);
    setErrorFecha(esValida ? '' : 'La fecha "Desde" debe ser anterior a "Hasta"');
  }
}, [filtroFechaDesde, filtroFechaHasta]);
```

**Indicador de filtros activos:**
```jsx
function FiltrosActivos({ filtros, onLimpiar }) {
  const filtrosActivos = Object.entries(filtros)
    .filter(([clave, valor]) => valor)
    .map(([clave]) => clave);
  
  if (filtrosActivos.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
      <span>Filtros aplicados:</span>
      <div className="flex gap-1">
        {filtrosActivos.map(filtro => (
          <span key={filtro} className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm">
            {filtro}
          </span>
        ))}
      </div>
      <button 
        onClick={onLimpiar}
        className="ml-2 text-sm text-gray-600 hover:text-gray-800"
      >
        Limpiar
      </button>
    </div>
  );
}
```

## Recomendaciones Arquitectónicas

1. **Crear un servicio común** para manejar todas las llamadas a Power Automate desde una sola ubicación:
```jsx
// src/services/reservationService.js
class ReservationService {
  static async getAvailability() { /* ... */ }
  static async getRequests(filters) { /* ... */ }
  static async getConfirmations(filters) { /* ... */ }
  static async submitReservation(data) { /* ... */ }
}
```

2. **Implementar un contexto de reservas** para compartir el estado de datos entre componentes:
```jsx
// src/context/ReservationsContext.js
const ReservationsContext = createContext();

export function ReservationsProvider({ children }) {
  const [availability, setAvailability] = useState([]);
  const [requests, setRequests] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  
  const refreshAvailability = useCallback(() => { /* ... */ }, []);
  const refreshRequests = useCallback(() => { /* ... */ }, []);
  
  return (
    <ReservationsContext.Provider value={{
      availability,
      requests,
      confirmations,
      refreshAvailability,
      refreshRequests
    }}>
      {children}
    </ReservationsContext.Provider>
  );
}
```

## Conclusión

La revisión de `Solicitudes.jsx` confirma los problemas arquitectónicos más amplios identificados en toda la aplicación:
1. **Falta de capa de backend** para operaciones sensibles
2. **Lógica de autorización en frontend** manipulable por atacantes
3. **Exposición de infraestructura** interna a través de URLs sensibles
4. **Inconsistencias en la implementación** de patrones de diseño

La solución definitiva requiere una reestructuración arquitectónica que:
- Implemente Supabase Functions como intermediarios seguros
- Mueva toda la lógica de autorización al backend
- Centralice las llamadas a servicios externos
- Mejore las validaciones y experiencia de usuario

Esto es consistente con las recomendaciones para `Disponibilidad.jsx` y refuerza la urgencia de abordar estos problemas sistémicamente.