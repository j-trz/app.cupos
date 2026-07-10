# 🧪 Guía Thunder Client - Testing Backend Filtros

## ⚡ Setup Inicial

### 1. Importar Colección
1. Abrir Thunder Client en VSCode
2. Click en "Collections" → "Import"
3. Seleccionar `THUNDER_CLIENT_TESTS.json`
4. La colección "Backend Filtros Testing" aparecerá

### 2. Obtener Tu User ID
Necesitas decodificar tu token JWT para obtener el `userId`:

#### Método A: Desde el frontend corriendo
1. Abrir DevTools (F12) en el navegador
2. En Console ejecutar:
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('UserId:', payload.sub || payload.user_id);
```

#### Método B: Usar Thunder Client para login
1. Ejecutar request "2. Login - Obtener Token"
2. Reemplazar `TU_PASSWORD_AQUÍ` con tu password real
3. El response dará un token
4. Decodificar el token en [jwt.io](https://jwt.io)

## 🔧 Configuración de Variables

### Reemplazar en TODOS los requests:
```
YOUR_USER_ID → tu_user_id_real (ej: 123e4567-e89b-12d3-a456-426614174000)
```

**Ejemplo de cómo debe quedar:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "Temporada": "Verano 2026"
}
```

## 📋 Plan de Testing

### Test 1: Health Check ✅
```
GET http://localhost:3001/health
```
**Resultado esperado:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "cors": "enabled",
  "environment": "development"
}
```

### Test 2: Login ✅
```
POST http://localhost:3001/api/login
```
**Body:**
```json
{
  "email": "julian.estefan@jetmar.com.uy",
  "password": "tu_password_real"
}
```
**Resultado esperado:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Test 3: Get Fields ✅
```
GET http://localhost:3001/api/fields?userId=TU_USER_ID
```
**Resultado esperado:** Lista de campos con valores posibles

### Test 4: ⭐ CORE TEST - Evolución Pasajeros SIN FILTROS
```
POST http://localhost:3001/api/evolucion-pasajeros
```
**Body:**
```json
{
  "userId": "TU_USER_ID"
}
```
**Resultado esperado:** Datos de evolución COMPLETOS

### Test 5: ⭐ CORE TEST - Evolución Pasajeros CON FILTRO TEMPORADA
```
POST http://localhost:3001/api/evolucion-pasajeros
```
**Body:**
```json
{
  "userId": "TU_USER_ID",
  "Temporada": "Verano 2026"
}
```
**Resultado esperado:** Datos FILTRADOS solo para Verano 2026

### Test 6: ⭐ CORE TEST - Evolución Pasajeros CON FILTRO DESTINO
```
POST http://localhost:3001/api/evolucion-pasajeros
```
**Body:**
```json
{
  "userId": "TU_USER_ID",
  "Destino": "RIO"
}
```
**Resultado esperado:** Datos FILTRADOS solo para RIO

### Test 7: ⭐ CORE TEST - Filtros Combinados
```
POST http://localhost:3001/api/evolucion-pasajeros
```
**Body:**
```json
{
  "userId": "TU_USER_ID",
  "Temporada": "Verano 2026",
  "Destino": "RIO"
}
```
**Resultado esperado:** Datos para RIO en Verano 2026 ÚNICAMENTE

## 🎯 Qué Verificar

### ✅ ANTES de la corrección (comportamiento incorrecto):
- Request 4 (sin filtros): Devuelve datos completos ✅
- Request 5 (con filtro): Devolvía datos completos (❌ BUG)
- Request 6 (con filtro): Devolvía datos completos (❌ BUG)
- Request 7 (filtros combinados): Devolvía datos completos (❌ BUG)

### ✅ DESPUÉS de la corrección (comportamiento correcto):
- Request 4 (sin filtros): Devuelve datos completos ✅
- Request 5 (con filtro): Devuelve SOLO datos de esa temporada ✅
- Request 6 (con filtro): Devuelve SOLO datos de ese destino ✅
- Request 7 (filtros combinados): Devuelve SOLO datos que cumplan AMBOS filtros ✅

## 🔍 Comparación de Resultados

### Request 4 vs Request 5:
- Los arrays `labels` y `values` deben ser DIFERENTES
- Request 5 debe tener MENOS datos que Request 4

### Request 4 vs Request 6:
- Los arrays deben ser DIFERENTES
- Request 6 debe tener MENOS datos que Request 4

### Request 7 (combinado):
- Debe tener los MENOS datos de todos
- Solo debe incluir intersección de ambos filtros

## 🚨 Errores Comunes

1. **401 Unauthorized**: Verificar que el userId sea correcto
2. **500 Internal Server Error**: Verificar que los archivos estén subidos en Supabase
3. **CORS Error**: Verificar que el backend esté corriendo en puerto 3001
4. **Empty Response**: Verificar que existan datos para los filtros aplicados

## ✅ Test de Éxito

Si el endpoint `/api/evolucion-pasajeros` responde con datos DIFERENTES cuando se aplican filtros, entonces ¡la corrección funciona! 🎉

## 📊 Ejemplo de Respuesta Esperada

### Sin filtros:
```json
{
  "labels": ["ENE 2024", "FEB 2024", "MAR 2024", "ABR 2024", "MAY 2024"],
  "values": [100, 150, 200, 180, 220]
}
```

### Con filtro "Verano 2026":
```json
{
  "labels": ["ENE 2026", "FEB 2026", "MAR 2026"],
  "values": [50, 75, 60]
}
```

¡Los arrays deben ser más cortos y con valores diferentes!