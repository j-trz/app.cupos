Espacio dedicado a la integración con **Travelcompositor** (Travel Compositor API) — plataforma externa a la que vamos a publicar/sincronizar `Product` (cupos), con ida y vuelta. Separado del resto de la documentación técnica porque es un desarrollo activo con un proveedor externo, mismo criterio que [[../007 - Integración Netviax Atlas/Conexión y Estructura General|Netviax Atlas]].

> Última actualización: 2026-09-15, a partir de la sección "Getting started" de la documentación oficial de Travel Compositor pasada por Julian. Se va completando a medida que llega más documentación — ver [[Checklist y Estado]] para lo que falta confirmar.

## Notas de esta carpeta

1. **Conexión y Estructura General** (esta nota) — credenciales, autenticación, convenciones generales.
2. [[API Contrato de Proveedor (Alta y Gestión de Inventario)]] — la API real que necesitamos (alta/edición de inventario propio), separada de la de distribución.
3. [[API Transportes (Búsqueda y Reserva)]] — la que trae el clip de Julian (búsqueda/reserva del inventario de Travelcompositor, no aplica al objetivo de "cargar productos" pero queda documentada por si hace falta más adelante).
4. [[Checklist y Estado]] — qué pidió Julian, qué falta confirmar (alcance, disparador, scoping por agencia, mapeo de campos).

Prueba manual de punta a punta (Thunder Client) contra la Contract API, sin escribir código todavía: `tools/travelcompositor-test/` en la raíz del repo (README con el paso a paso).

## Qué es

Travelcompositor es una plataforma externa de terceros (no es un backoffice propio de una agencia, a diferencia de Netviax Atlas) contra la que vamos a integrar el catálogo de `Product` — alta/edición y, según lo que pidió Julian ("todo el ida y vuelta"), también recibir datos de vuelta. Qué exactamente viaja en cada sentido todavía no está confirmado — ver [[Checklist y Estado]].

## Credenciales

3 valores por cuenta: `username`, `password`, `micrositeId` — los provee el account manager de Travelcompositor (no hay self-service signup documentado). **Sin confirmar todavía** si es una única cuenta para toda la empresa o si cada agencia va a tener su propio `username`/`password`/`micrositeId` (ver pregunta de scoping por agencia en [[Checklist y Estado]]) — de ser así, el patrón a seguir es el mismo ya usado en `AtlasConfig`/`AIProvider`: modelo de credenciales con `AgencyID` nullable, resuelto por agencia del caller (o global si `AgencyID IS NULL`), nunca hardcodeado.

## Autenticación

**Flujo de 2 pasos, con token de vida corta:**

1. `POST /resources/authentication/authenticate` con `username`/`password`/`micrositeId` en el body → devuelve un `token` (JWT) + `expirationInSeconds` (**7200s = 2h** en el ejemplo de la doc).
2. Ese `token` se usa para autenticar el resto de las llamadas — **confirmado 2026-09-16 contra el spec OpenAPI** (`components`/`parameters` de cada operación protegida): va como header plano **`auth-token: <token>`**, NO `Authorization: Bearer <token>`. Aplica igual a los endpoints de contrato (`Contract - Supplier`/`Contract - Transport`/etc.) y a los de distribución.

```
POST https://online.travelcompositor.com/resources/authentication/authenticate
Content-Type: application/json
Accept-Encoding: gzip

{
    "username": "your_user_name",
    "password": "your_password",
    "micrositeId": "your_microsite_id"
}
```

```json
{
    "token": "eyJhbGciOiJIUzUxMiJ9...",
    "expirationInSeconds": 7200
}
```

**Gotcha esperable (a confirmar cuando se implemente)**: con un token que expira a las 2h, cualquier servicio que llame a Travelcompositor necesita lógica de refresh — reautenticar antes de que expire (o al recibir un 401), en vez de asumir que el token vale para toda la vida del proceso. Mismo tipo de cuidado que ya tenemos en otras integraciones con credenciales de terceros (ver `secrets_crypto.go` para el patrón de cifrado en reposo si `password` se termina guardando en nuestra base).

## URL base

`https://online.travelcompositor.com` — **sin confirmar todavía** si existe un ambiente de sandbox/test separado, o si `micrositeId` es lo que distingue test de producción dentro de la misma URL (a preguntar).

## Convenciones generales (aplican a TODAS las llamadas)

- **`Accept-Encoding: gzip` es obligatorio** en todos los requests — la API puede rechazar requests que no lo incluyan. La respuesta viene comprimida (`Content-Encoding: gzip`) y hay que descomprimirla antes de parsear. En Go, esto lo maneja solo el `http.Transport` por default si no se pisa `DisableCompression` — **verificar al implementar `travelcompositor_service.go`** que el cliente HTTP usado no tenga esto deshabilitado (mismo tipo de gotcha ya documentado para Atlas en [[../007 - Integración Netviax Atlas/Conexión y Estructura General|Conexión y Estructura General]] de esa integración, aunque ahí el gotcha es sobre el body, no sobre compresión).
- **`traceId` para soporte**: cada respuesta trae un `Travelc-Trace-Id` en el header (o `traceId` en el body) — conviene loguearlo en nuestro lado (ej. `SystemLog`, mismo patrón que otras integraciones) para poder correlacionar un reclamo con el soporte de Travelcompositor sin tener que reproducir el error.

## Dónde va a vivir en el código (placeholder — nada construido todavía)

| Capa | Archivo (propuesto, sigue el patrón de Atlas) |
|---|---|
| Llamadas HTTP a Travelcompositor | `backend-go/pkg/services/travelcompositor_service.go` |
| Endpoints propios (sync manual, webhook si aplica) | `backend-go/pkg/handlers/travelcompositor_handler.go` |
| Modelo de credenciales | `models.TravelcompositorConfig` (a definir — mismo shape que `AtlasConfig`: `Usuario`/`Clave`/`MicrositeID` + `AgencyID` nullable si el scoping termina siendo por agencia) |
| Pantalla de configuración | a definir — posible pestaña nueva o página `/travelcompositor-config`, mismo patrón que `/atlas-config` |
