# 🔧 Debug: Tabla y Gráficos por Destino Vacíos

## 🎯 Cambios Implementados para Debug

### **1. Backend - Logs de Debug Agregados**
- ✅ **Debug en `/api/detalle-destinos`**: Logs detallados del proceso
- ✅ **Lógica simplificada**: Removí complejidad innecesaria
- ✅ **Endpoint de prueba**: `/api/test-detalle-simple` para verificar datos básicos

### **2. Frontend - Debug Agregado**
- ✅ **Logs en consola**: Para ver datos recibidos
- ✅ **Endpoint de prueba**: Temporal para verificar flujo de datos
- ✅ **Importaciones corregidas**: Sin errores de ESLint

---

## 🚀 Pasos para Debug

### **1. Deploy del Backend Actualizado**
```bash
git add .
git commit -m "🔧 Debug: Logs y simplificación para tabla vacía"
git push origin main
```

### **2. Testing del Endpoint de Prueba**
```bash
# Probar el endpoint simple primero
curl -X POST https://panel-cupos.onrender.com/api/test-detalle-simple \
  -H "Content-Type: application/json" \
  -d '{"userId": "tu-user-id"}'
```

**Esperado**: Respuesta con 5 filas de datos de prueba + información de debug.

### **3. Testing del Endpoint Principal**
```bash
# Probar el endpoint principal con logs
curl -X POST https://panel-cupos.onrender.com/api/detalle-destinos \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "tu-user-id",
    "filters": {}
  }'
```

### **4. Revisar Logs en Render**
En Render Dashboard -> Tu backend -> Logs, buscar:
```
🔍 DEBUG /api/detalle-destinos - Iniciando procesamiento
🔍 DEBUG - userId: [tu-user-id]
🔍 DEBUG - filters: {}
🔍 DEBUG - Datos cargados - cupos: X, pasajeros: Y
🔍 DEBUG - Iniciando lógica simplificada
🔍 DEBUG - Cupos únicos después de filtrar duplicados: Z
🔍 DEBUG - Filas calculadas después de filtros: W
🔍 DEBUG - Grupos finales: V
🔍 DEBUG - Resultado final - rowsDetalle: V filas
```

---

## 🔍 Posibles Problemas y Soluciones

### **Problema 1: "userId no válido"**
```bash
# Verificar que el userId sea correcto
# En la consola del frontend, buscar:
console.log('🔍 Debug - userId:', userId);
```

**Solución**: El userId debe coincidir con los archivos subidos en Supabase.

### **Problema 2: "Datos cargados pero 0 filas después de filtros"**
```bash
# En logs del backend ver:
🔍 DEBUG - Datos cargados - cupos: 1000, pasajeros: 500  # ✅ Datos OK
🔍 DEBUG - Filas calculadas después de filtros: 0        # ❌ Filtros muy restrictivos
```

**Solución**: Los filtros están eliminando todos los datos. Probar sin filtros:
```javascript
filters: {}  // Sin filtros para ver todos los datos
```

### **Problema 3: "Sin datos en Supabase Storage"**
```bash
# En logs ver:
🔍 DEBUG - Datos cargados - cupos: 0, pasajeros: 0
```

**Solución**:
1. Verificar que los archivos estén subidos en Supabase Storage
2. Verificar que los nombres de archivo coincidan
3. Re-subir archivos si es necesario

### **Problema 4: "Datos llegan al frontend pero tabla sigue vacía"**
```bash
# En consola del browser ver:
🔍 Frontend - Test data recibida: {columns: [...], data: [...]}
🔍 Debug - detalleDestinos: {columns: [...], data: [...]}
```

**Solución**: Verificar que el componente DataTable reciba los datos correctamente.

---

## 📊 Testing en Frontend

### **1. Abrir Developer Tools**
- **F12** en Chrome/Edge/Firefox
- **Ir a Console tab**

### **2. Aplicar Filtros y Verificar Logs**
Buscar estos mensajes en consola:
```
🔍 Frontend - Probando endpoint simple primero...
🔍 Frontend - Test data recibida: [objeto con datos]
🔍 Debug - Iniciando carga de datos con filtros: [filtros]
🔍 Debug - Datos recibidos:
- evolucionPasajeros: [datos]
- detalleDestinos: [datos]
```

### **3. Verificar Network Tab**
- **Network tab** en Developer Tools
- **Filtrar por "XHR" o "Fetch"**
- Buscar llamadas a:
  - `/api/test-detalle-simple` ✅ (debe responder con datos)
  - `/api/detalle-destinos` ✅ (debe responder con datos)
  - `/api/evolucion-pasajeros` ✅ (debe responder con datos)

---

## 🎯 Resultados Esperados

### **Endpoint de Prueba (`/api/test-detalle-simple`)**
```json
{
  "columns": ["Destino", "Temporada", "Cupos tomados", ...],
  "data": [
    {
      "Destino": "BRASIL",
      "Temporada": "Verano 2026",
      "Cupos tomados": 120,
      "Lugares vendidos": 89,
      ...
    }
  ],
  "debug": {
    "totalCupos": 1523,
    "totalPasajeros": 890,
    "primerosDestinos": ["BRASIL", "MEXICO", "CHILE"]
  }
}
```

### **Frontend Console**
```
🔍 Frontend - Test data recibida: {columns: Array(8), data: Array(5), debug: {…}}
🔍 Debug - Datos recibidos:
- evolucionPasajeros: {labels: Array(12), values: Array(12)}
- detalleDestinos: {columns: Array(8), data: Array(5)}
```

### **Tabla en Frontend**
- ✅ **Columnas visibles**: Destino, Temporada, Cupos tomados, etc.
- ✅ **Filas con datos**: Al menos 5 filas de prueba
- ✅ **Gráficos poblados**: Barras con datos correspondientes

---

## 🚨 Si Aún No Funciona

### **Último Recurso: Endpoint Directo**
Si todo falla, podemos crear un endpoint ultra-simple que devuelva datos fijos:

```javascript
// Endpoint de emergencia con datos fijos
router.post('/api/emergency-data', (req, res) => {
  res.json({
    columns: ['Destino', 'Temporada', 'Cupos tomados', 'Lugares vendidos'],
    data: [
      { Destino: 'BRASIL', Temporada: 'Verano 2026', 'Cupos tomados': 100, 'Lugares vendidos': 80 },
      { Destino: 'MEXICO', Temporada: 'Verano 2026', 'Cupos tomados': 50, 'Lugares vendidos': 30 },
      { Destino: 'CHILE', Temporada: 'Invierno 2025', 'Cupos tomados': 75, 'Lugares vendidos': 60 }
    ]
  });
});
```

---

## 📞 Próximo Paso

1. **Deploy** estos cambios con debug
2. **Probar** el endpoint de prueba primero
3. **Revisar logs** en Render Dashboard
4. **Reportar** qué mensajes aparecen en logs y consola
5. **Ajustar** según los resultados del debug

**🔧 Con estos logs detallados podremos identificar exactamente dónde está el problema!**