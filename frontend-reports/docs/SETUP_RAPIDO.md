# 🚀 Setup Rápido - Thunder Client Testing

## 1️⃣ Obtener Tu User ID (REQUERIDO)

### Opción A: Desde el navegador (más fácil)
```javascript
// Pegar en DevTools Console (F12):
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('🔑 Tu userId es:', payload.sub || payload.user_id);
} else {
  console.log('❌ No hay token - loguéate primero');
}
```

### Opción B: Decodificar token manualmente
1. Login en el frontend
2. Abrir DevTools → Application → Local Storage
3. Copiar el valor de `token`
4. Ir a [jwt.io](https://jwt.io)
5. Pegar el token → ver el campo `sub` en el payload

## 2️⃣ Importar y Configurar Thunder Client

### Paso 1: Importar
1. Thunder Client → Collections → Import
2. Seleccionar `THUNDER_CLIENT_TESTS.json`

### Paso 2: Reemplazar Variables
En TODOS los requests, cambiar:
```
YOUR_USER_ID → tu_user_id_real
TU_PASSWORD_AQUÍ → tu_password_real
```

## 3️⃣ Verificar Backend Running

```bash
# Verificar que el backend esté corriendo:
curl http://localhost:3001/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "cors": "enabled"
}
```

## 4️⃣ Test de Filtros - Orden de Ejecución

### 🎯 CORE TESTS (los más importantes):

1. **Test 4**: Evolución sin filtros
   - Endpoint: `POST /api/evolucion-pasajeros`
   - Body: `{"userId": "TU_ID"}`
   - 📝 **Anotar**: Cantidad de datos en `labels` array

2. **Test 5**: Evolución con filtro temporada
   - Endpoint: `POST /api/evolucion-pasajeros`
   - Body: `{"userId": "TU_ID", "Temporada": "Verano 2026"}`
   - 📝 **Comparar**: Debe tener MENOS datos que Test 4

3. **Test 6**: Evolución con filtro destino
   - Endpoint: `POST /api/evolucion-pasajeros`
   - Body: `{"userId": "TU_ID", "Destino": "RIO"}`
   - 📝 **Comparar**: Debe tener MENOS datos que Test 4

## 5️⃣ Verificación de Éxito ✅

### ✅ CORRECCIÓN FUNCIONANDO:
- Test 4 (sin filtros): 10+ elementos en `labels`
- Test 5 (con filtro): 3-5 elementos en `labels`
- Test 6 (con filtro): 2-4 elementos en `labels`
- Los arrays son DIFERENTES entre tests

### ❌ SI AÚN HAY BUG:
- Todos los tests devuelven los mismos datos
- Los filtros no tienen efecto
- Arrays `labels` y `values` idénticos

## 6️⃣ Ejemplo Rápido

### Request Test 5:
```json
POST http://localhost:3001/api/evolucion-pasajeros
Content-Type: application/json

{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "Temporada": "Verano 2026"
}
```

### Respuesta esperada (FILTRADA):
```json
{
  "labels": ["ENE 2026", "FEB 2026"],
  "values": [45, 67]
}
```

## 🔧 Troubleshooting

### Error 401:
- Verificar que el `userId` sea correcto
- Usar el userId del token JWT decodificado

### Error 500:
- Verificar que tengas archivos subidos en Supabase
- Verificar que el backend tenga acceso a las variables de entorno

### Response vacío:
- Los filtros pueden ser válidos pero no tener datos
- Probar con filtros que sepas que tienen datos

## ⚡ Test Ultra-Rápido

Si quieres verificar rápido que funciona:

1. Ejecutar Test 4 → Anotar cantidad de labels: `X`
2. Ejecutar Test 5 → Anotar cantidad de labels: `Y`
3. Si `Y < X` → ✅ **FUNCIONA!**
4. Si `Y = X` → ❌ **AÚN HAY BUG**

---

**🎯 El objetivo es demostrar que el endpoint `/api/evolucion-pasajeros` ahora SÍ aplica filtros correctamente!**