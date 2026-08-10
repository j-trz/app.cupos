Espacio dedicado a la integración con **Netviax Atlas** (backoffice externo) — separado del resto de la documentación técnica porque es un desarrollo activo con un proveedor externo, no solo arquitectura interna. Cubre cómo nos conectamos, qué recibimos hoy (lectura, ya construido) y qué falta enviar (emisión de tickets, pendiente de definir con Netviax).

> Última verificación contra código: 2026-08-10 (lectura completa de `netviax_atlas_service.go`, `backoffice_handler.go`, `atlas_config_handler.go`, `atlasService.js`, `atlasConfigService.js`).

## Notas de esta carpeta

1. **Conexión y Estructura General** (esta nota) — credenciales, URLs, formato de request/response, manejo de errores.
2. [[Búsqueda de Contactos (Lectura)]] — `wscontactobuscar` / `wscontactodetallebuscar`, ya construido.
3. [[Búsqueda de Fichas (Lectura)]] — `wsfichabuscar`, ya construido.
4. [[Envío de Tickets Emitidos (Pendiente)]] — **lo que falta construir**, checklist de preguntas para Netviax.

Ver también [Modelo de Datos §6](../005%20-%20Arquitectura%20y%20Datos/Modelo%20de%20Datos.md#6-configuración-por-agencia) (tabla `AtlasConfig`) y la entrada de esta integración en [Referencia de API](../001%20-%20API/Referencia%20de%20API.md#netviax-atlas-backoffice).

---

## Qué es

Netviax Atlas es el backoffice externo donde la agencia ya tiene cargados sus contactos/pasajeros y sus fichas de venta. La integración permite **buscar** esos datos y autocompletar el formulario de reserva del Sistema de Cupos, evitando tipear de nuevo documento/nombre/nacimiento/etc. de alguien que ya está en Atlas.

**Fase actual: 100% lectura.** No existe (todavía) ningún endpoint que escriba de vuelta hacia Atlas — ver [[Envío de Tickets Emitidos (Pendiente)]] para el desarrollo que sigue.

## Dónde vive en el código

| Capa | Archivo |
|---|---|
| Llamadas HTTP a Atlas | `backend-go/pkg/services/netviax_atlas_service.go` |
| Endpoints de búsqueda (contactos, fichas) | `backend-go/pkg/handlers/backoffice_handler.go` |
| CRUD de credenciales + test de conexión | `backend-go/pkg/handlers/atlas_config_handler.go` |
| Modelo de credenciales | `backend-go/pkg/models/models.go` → `AtlasConfig` |
| Cliente HTTP del frontend | `frontend/src/services/atlasService.js` (búsqueda), `atlasConfigService.js` (config) |
| Pantalla de configuración | `frontend/src/pages/AtlasConfig.jsx` (ruta `/atlas-config`) |
| Botón de búsqueda en el formulario de reserva | `frontend/src/pages/Availability.jsx` |

## Credenciales

4 campos por agencia (`models.AtlasConfig`): `Usuario`, `Clave`, `Empresa`, `Sucursal`, más `Environment` (`"test"` o `"prod"`, elige la URL base). Mismo patrón de fallback que `EmailSMTPConfig`: se resuelve primero la config **de la agencia** (`agency_id = <la del usuario>`), y si no existe, la config **global** (`agency_id IS NULL`). Se administran desde **Configuración → Atlas** (`/atlas-config`), con permisos `ATLAS_VIEW`/`ATLAS_UPDATE`.

La `Clave` nunca se devuelve al frontend una vez guardada (`GetAtlasConfig`/`UpdateAtlasConfig` la vacían antes de responder) — al editar, si el campo clave llega vacío, el backend no la pisa (permite reenviar el resto del formulario sin resubmitear la contraseña real).

## Cómo se autentica cada llamada a Atlas

**No van en headers.** Las 4 credenciales (`Usuario`/`Clave`/`Empresa`/`Sucursal`) van **en el body JSON de cada request**, embebidas en todos los structs de request vía `AtlasCredentials`. No hay token/sesión de Atlas — cada llamada es autocontenida y manda las credenciales completas.

## URLs

| Entorno | URL base | Estado |
|---|---|---|
| **Producción** | `https://api-atlas.netviax.com/rest` | **Confirmada** contra un request real. El dominio `*.azurewebsites.net` que se había asumido al principio (a partir de un link visto en un mail) era un alias/redirect viejo, o el custom domain apunta al mismo backend de Azure — no usar esa URL como la "oficial". |
| **Test / sandbox** | `https://api-atlas-netviax-com-test.azurewebsites.net/rest` | **Sin confirmar.** Nadie probó todavía un request real contra esta URL. Si falla, pedirle a Netviax la URL correcta de sandbox. |

Cada endpoint se llama como `<URL base>/<nombre del endpoint>` (ej. `.../rest/wscontactobuscar`). Ambas URLs son configurables por variable de entorno (`ATLAS_API_URL_PROD`, `ATLAS_API_URL_TEST`) si Netviax las cambia o si hace falta apuntar a un servidor propio de pruebas.

## Formato de request

POST, `Content-Type: application/json`, body JSON plano (nunca envuelto en `{"data": {...}}`). Cada endpoint tiene su propio struct de request en `netviax_atlas_service.go`, siempre con `AtlasCredentials` embebido al inicio.

## Formato de respuesta y manejo de errores — el gotcha más importante

**Atlas no usa el código HTTP para indicar éxito o fracaso de negocio.** Puede devolver `5xx` con la operación completada igual — en ese caso el body trae **dos JSON pegados uno detrás del otro** en la misma respuesta. Por eso `doAtlasRequest` (en `netviax_atlas_service.go`) **ignora `resp.StatusCode`** y usa `json.Decoder.Decode`, que lee solo el primer valor JSON válido del stream e ignora cualquier basura pegada atrás.

El éxito/fracaso real de la operación se decide **siempre** con un campo de negocio en el body de respuesta:

```json
{ "Error": "0", "Mensaje": "" }
```

`Error == "0"` (o vacío) es éxito; cualquier otro valor es error, con el texto en `Mensaje`. Este campo, además, **no es consistente de tipo entre endpoints**: la colección Postman lo muestra como string (`"0"`) en unos, pero `wscontactovendedorbuscar` lo devuelve como número (`0`) — un `string` común revienta con `"cannot unmarshal number into Go struct field"` apenas llega la primera respuesta real de ese tipo. Se resuelve con un tipo custom, `AtlasFlexString`, que acepta ambas formas y normaliza a string — **cualquier endpoint nuevo que se agregue debe usar `AtlasEnvelope`/`AtlasFlexString` para el campo `Error`/`Mensaje`, no un `string` a secas.**

## Endpoints disponibles hoy

| Endpoint Atlas | Uso | Nota |
|---|---|---|
| `wscontactobuscar` | Buscar contactos (documento, email, celular o nombre) | Ver [[Búsqueda de Contactos (Lectura)]] |
| `wscontactodetallebuscar` | Detalle completo de un contacto por código | Ver [[Búsqueda de Contactos (Lectura)]] |
| `wsfichabuscar` | Buscar una ficha de venta por número exacto, con sus pasajeros | Ver [[Búsqueda de Fichas (Lectura)]] |
| `wscontactovendedorbuscar` | Sin filtros — solo valida que las credenciales funcionen | Botón "Probar conexión" en `/atlas-config` |

**No implementados** (existen en la colección Postman de Netviax, pero deliberadamente no se construyeron todavía): `wscontactoguardar` (alta/edición de contacto), `wsfichaguardar` (alta/edición de ficha). Candidatos para la fase de escritura — ver [[Envío de Tickets Emitidos (Pendiente)]].

## Cómo probamos la conexión

`wscontactovendedorbuscar` no pide ningún filtro, solo credenciales válidas — se usa exclusivamente para el botón **"Probar conexión"** en la pantalla de Configuración de Atlas, tanto contra la config ya guardada como contra datos sueltos del formulario (para poder probar antes de guardar).
