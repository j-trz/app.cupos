# 🚀 Testing Producción - Filtros Corregidos

## ⚡ Setup Ultra-Rápido

### 1. Obtener Tu User ID
```javascript
// Ejecutar en DevTools Console (F12) en tu app:
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('🔑 UserId:', payload.sub || payload.user_id);
```

### 2. Importar Colección Thunder Client
1. Thunder Client → Collections → Import
2. Seleccionar **`THUNDER_CLIENT_PRODUCCION.json`**
3. Reemplazar en TODOS los requests:
   - `YOUR_USER_ID` → tu userId real
   - `TU_PASSWORD_AQUÍ` → tu password real

## 🎯 Tests Críticos (Solo estos 4)

### ✅ Test 1: Health Check
```
GET https://panel-cupos.onrender.com/health
```
**Esperado:** `{"status": "ok", "cors": "enabled"}`

### 🔥 Test 2: Sin Filtros (baseline)
```
POST https://panel-cupos.onrender.com/api/evolucion-pasajeros
Body: {"userId": "TU_USER_ID"}
```
**📝 Anotar:** Cantidad de elementos en `labels` (ej: 15 elementos)

### 🔥 Test 3: Con Filtro Temporada
```
POST https://panel-cupos.onrender.com/api/evolucion-pasajeros
Body: {"userId": "TU_USER_ID", "Temporada": "Verano 2026"}
```
**📝 Comparar:** Debe tener MENOS elementos que Test 2

### 🔥 Test 4: Con Filtro Destino
```
POST https://panel-cupos.onrender.com/api/evolucion-pasajeros
Body: {"userId": "TU_USER_ID", "Destino": "RIO"}
```
**📝 Comparar:** Debe tener MENOS elementos que Test 2

## ✅ Verificación de Éxito

### 🎉 CORRECCIÓN FUNCIONANDO:
- Test 2: `labels: ["ENE 2024", "FEB 2024", "MAR 2024", ...]` (15+ elementos)
- Test 3: `labels: ["ENE 2026", "FEB 2026"]` (3-5 elementos) 
- Test 4: `labels: ["MAR 2024", "ABR 2024"]` (2-4 elementos)

### ❌ SI AÚN HAY BUG:
- Todos los tests devuelven exactamente los mismos datos
- Los arrays `labels` son idénticos en todos los tests

## 🚨 Ejemplo Real de Éxito

### Test 2 (sin filtros):
```json
{
  "labels": ["ENE 2024", "FEB 2024", "MAR 2024", "ABR 2024", "MAY 2024", "JUN 2024", "JUL 2024", "AGO 2024", "SEP 2024", "OCT 2024", "NOV 2024", "DIC 2024", "ENE 2025", "FEB 2025", "MAR 2025"],
  "values": [100, 150, 200, 180, 220, 250, 280, 190, 160, 140, 170, 200, 230, 180, 160]
}
```

### Test 3 (filtro "Verano 2026"):
```json
{
  "labels": ["ENE 2026", "FEB 2026", "MAR 2026"],
  "values": [45, 67, 52]
}
```

**🎯 Si ves esta diferencia → ¡LA CORRECCIÓN FUNCIONA!**

## 🔧 Troubleshooting

### Error 500:
- Esperar 30 segundos (Render puede estar "dormido")
- Volver a intentar

### Response idéntico en todos los tests:
- ❌ La corrección no se desplegó correctamente
- Verificar que el commit se subió a la rama correcta

### Arrays vacíos:
- ✅ Normal si el filtro no tiene datos
- Probar con otros filtros que sepas que tienen datos

## ⏱️ Test de 2 Minutos

1. **Ejecutar Test 2** → Contar elementos en `labels`: `X`
2. **Ejecutar Test 3** → Contar elementos en `labels`: `Y`
3. **Resultado:**
   - Si `Y < X` → ✅ **¡FUNCIONA!** 🎉
   - Si `Y = X` → ❌ **Hay un problema**

## 📊 URLs de Producción

- **Health:** `https://panel-cupos.onrender.com/health`
- **Login:** `https://panel-cupos.onrender.com/api/login`
- **Evolución:** `https://panel-cupos.onrender.com/api/evolucion-pasajeros`

---

**🎯 El objetivo es confirmar que el endpoint `/api/evolucion-pasajeros` en PRODUCCIÓN ahora SÍ aplica filtros correctamente!**