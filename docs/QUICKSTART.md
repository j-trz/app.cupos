---
title: Quickstart
nav_order: 1
nav_group: Empezar
---

# Quickstart

Esta guía cubre lo mínimo para hacer tu primera llamada autenticada a la API del Sistema de Gestión de Cupos: cómo conseguir un token, cómo mandarlo en cada request, y qué esperar de las respuestas.

## 1. Base URL

Todas las rutas de la API cuelgan del prefijo `/api`:

```
https://<tu-dominio-de-despliegue>/api
```

En local, `backend-go` corre por defecto en el puerto `5002` (`PORT=5002` si no se configura otra cosa), así que el equivalente local es `http://localhost:5002/api`.

> No hay versionado en la URL (no existe `/v1`, `/v2`, etc.) — la API expone una única superficie estable bajo `/api`.

## 2. Iniciá sesión

No hay API keys: la autenticación es por usuario/contraseña contra `POST /api/auth/login`, que devuelve un JWT.

```bash
curl -X POST https://<tu-dominio>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "vos@tuagencia.com", "password": "tu-contraseña"}'
```

Respuesta (`200 OK`):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6f2c...",
    "email": "vos@tuagencia.com",
    "nombre": "Tu Nombre",
    "role": "agency_user",
    "agencia": "TOCTOC",
    "activo": true,
    "ai_habilitado": true
  }
}
```

Credenciales inválidas o cuenta inactiva devuelven `401` con un mensaje explicativo (ver [Referencia de API](API_REFERENCE.html#convenciones) para el formato de error).

**El token expira a las 24 horas** de emitido — no hay refresh token: pasado ese tiempo, volvé a llamar a `/api/auth/login`.

## 3. Usá el token en cada request

Todo el resto de la API (salvo login/registro) requiere el header `Authorization` con el esquema `Bearer`:

```bash
curl https://<tu-dominio>/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Sin ese header (o con un token vencido/inválido), la API responde `401`.

## 4. Hacé tu primera reserva

Un flujo típico de integración: consultar disponibilidad, reservar un cupo temporalmente y confirmarlo.

```bash
# 1. Elegí un producto disponible
curl https://<tu-dominio>/api/products \
  -H "Authorization: Bearer $TOKEN"

# 2. Reservá el stock (hold temporal, ~10 min por defecto)
curl -X POST https://<tu-dominio>/api/orders/hold \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 123, "passenger_count": 2}'

# 3. Confirmá la reserva con los datos reales de los pasajeros,
#    referenciando el hold del paso anterior por su id
curl -X POST https://<tu-dominio>/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "product_id": 123,
        "hold_id": 456,
        "contacto_nombre": "Juan Pérez",
        "contacto_email": "juan@agencia.com",
        "passengers": [
          {"nombre": "Juan", "apellido": "Pérez", "nacimiento": "1990-05-12", "tipo_pasajero": "Adulto"},
          {"nombre": "Ana", "apellido": "Pérez", "nacimiento": "2016-02-03", "tipo_pasajero": "Menor"}
        ]
      }'
```

Si no llamás a `/orders/hold` primero, `POST /api/orders` igual funciona (crea la reserva y descuenta el stock en el mismo paso) — el hold es opcional y solo tiene sentido si tu integración necesita "apartar" el cupo mientras termina de juntar los datos de los pasajeros.

## 5. Errores

Todos los errores devuelven el mismo formato:

```json
{ "error": "Descripción legible del problema" }
```

con el código HTTP correspondiente (`400`, `401`, `403`, `404` o `500`). El detalle completo de convenciones y permisos está en la [Referencia de API](API_REFERENCE.html).

## Siguientes pasos

- **[Referencia de API](API_REFERENCE.html)** — catálogo completo de endpoints, convenciones de errores y permisos.
- **[Flujos de Funcionalidades](FLUJOS_FUNCIONALIDADES.html)** — cómo funciona cada módulo por dentro (con diagramas), si necesitás entender la lógica de negocio detrás de un endpoint.
