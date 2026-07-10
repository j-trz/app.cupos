# 🚨 FORMATO CORRECTO - Thunder Client

## ❌ Formato INCORRECTO (lo que causaba el error):
```json
{
  "userId": "1e07c1dc-c022-4e0c-8a07-2cc86a26f5c5",
  "Temporada": "Verano 2026"
}
```

## ✅ Formato CORRECTO (usar este):
```json
{
  "userId": "1e07c1dc-c022-4e0c-8a07-2cc86a26f5c5",
  "filters": {
    "Temporada": "Verano 2026"
  }
}
```

## 🧪 Prueba Inmediata

Cambia tu request de Thunder Client a:

```
POST https://panel-cupos.onrender.com/api/detalle-destinos
Content-Type: application/json

{
  "userId": "1e07c1dc-c022-4e0c-8a07-2cc86a26f5c5",
  "filters": {
    "Temporada": "Verano 2026"
  }
}
```

**Resultado esperado:** Solo datos con `"Temporada": "Verano 2026"` (no "Verano 2025")

## 📋 Otros Ejemplos Correctos:

### Filtro por Destino:
```json
{
  "userId": "1e07c1dc-c022-4e0c-8a07-2cc86a26f5c5",
  "filters": {
    "Destino": "RIO"
  }
}
```

### Filtros Combinados:
```json
{
  "userId": "1e07c1dc-c022-4e0c-8a07-2cc86a26f5c5",
  "filters": {
    "Temporada": "Verano 2026",
    "Destino": "RIO"
  }
}
```

## 💡 Explicación Técnica

El backend espera los filtros **dentro de un objeto `filters`**.

En el código:
```javascript
const { userId, filters = {} } = req.body;
```

Y luego usa el objeto `filters`:
```javascript
Object.entries(filters).forEach(([key, val]) => {
  // procesa cada filtro del objeto filters
});
```

Por eso el formato correcto es poner los filtros DENTRO del objeto `filters`.