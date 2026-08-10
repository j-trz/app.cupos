Búsqueda y detalle de contactos en Netviax Atlas — **ya construido, solo lectura**. Ver [[Conexión y Estructura General]] para credenciales, URLs y el manejo de errores (aplica igual acá).

> Última verificación contra código: 2026-08-10.

## Endpoint interno (nuestra API)

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/backoffice/atlas/contactos/buscar` | Busca contactos por documento/email/celular/nombre |
| `GET` | `/api/backoffice/atlas/contactos/:codigo` | Detalle completo de un contacto |

Handlers: `BuscarContactoAtlas`/`DetalleContactoAtlas` en `backend-go/pkg/handlers/backoffice_handler.go`.

## 1. Buscar (`wscontactobuscar`)

**Qué enviamos a Atlas** — un único criterio relleno por búsqueda, el resto vacío:

```json
{
  "Usuario": "...", "Clave": "...", "Empresa": "...", "Sucursal": "...",
  "WSContactoFiltro": {
    "Filtros": "S",
    "Paginado": "N",
    "PaginadoRegistros": "20",
    "PaginadoPaginas": "1",

    "ContactoDocumento": "12345678",
    "ContactoDocumentoIdentificacionCodigo": "CI",
    "ContactoDocumentoPaisCodigo": "UY"
  }
}
```

Los 4 criterios posibles (uno a la vez, nunca combinados):

| Criterio | Campo(s) en `WSContactoFiltro` |
|---|---|
| Documento | `ContactoDocumento` + `ContactoDocumentoIdentificacionCodigo` (CI/PAS/DNI/RUT) + `ContactoDocumentoPaisCodigo` (ISO alpha-2, ej. `"UY"`) — **los 3 son obligatorios juntos**, Atlas permite el mismo número repetido entre países/tipos de documento, así que sin los 3 el filtro queda ambiguo |
| Email | `ContactoEmail` |
| Celular | `ContactoCelular` |
| Nombre | `ContactoNombre` |

**Qué recibimos** — clave confirmada `"WSContactos"` (array, aunque el nombre singular del tipo de detalle podría hacer pensar lo contrario):

```json
{
  "Error": "0", "Mensaje": "",
  "WSContactos": [
    {
      "ContactoCodigo": "C-00123",
      "ContactoNombre": "Juan Pérez",
      "ContactoDocumento1": "12345678",
      "ContactoComunicacion1Email": "juan@example.com",
      "ContactoComunicacion1Celular": "099123456"
    }
  ]
}
```

Nuestra API lo re-mapea a un shape más simple para el frontend:

```json
{ "contactos": [
  { "contacto_codigo": "C-00123", "nombre": "Juan Pérez", "documento": "12345678", "email": "juan@example.com", "celular": "099123456" }
]}
```

## 2. Detalle (`wscontactodetallebuscar`)

**Qué enviamos:**

```json
{ "Usuario": "...", "Clave": "...", "Empresa": "...", "Sucursal": "...", "ContactoCodigo": "C-00123" }
```

**Qué recibimos** — Atlas trae muchos más campos (según la colección Postman, ~90 campos en total, el mismo shape que espera `wscontactoguardar` para escribir — ver [[Envío de Tickets Emitidos (Pendiente)]]), de los cuales hoy solo modelamos 13 (los que necesitamos para autocompletar):

```json
{
  "ContactoCodigo": "C-00123",
  "ContactoNombre": "Juan Pérez",
  "ContactoPrimerNombre": "Juan",
  "ContactoSegundoNombre": "",
  "ContactoPrimerApellido": "Pérez",
  "ContactoSegundoApellido": "",
  "ContactoDocumento1": "12345678",
  "ContactoNacimiento": "1990-05-12",
  "ContactoNacionalidadPaisCodigo": "UY",
  "ContactoNacionalidadPaisNombre": "Uruguay",
  "ContactoGeneroCodigo": "M",
  "ContactoComunicacion1Email": "juan@example.com",
  "ContactoComunicacion1Celular": "099123456",
  "ContactoComunicacion1Telefono": ""
}
```

Nuestra API lo re-mapea a datos de contacto + una fila de pasajero, listos para pisar el formulario de reserva:

```json
{
  "contacto_nombre": "Juan Pérez",
  "contacto_email": "juan@example.com",
  "contacto_telefono": "099123456",
  "passenger": {
    "nombre": "Juan", "apellido": "Pérez", "documento": "12345678",
    "nacimiento": "1990-05-12", "nacionalidad": "Uruguay"
  }
}
```

**Reglas de mapeo a notar:**
- Nombre/apellido de pasajero se arman concatenando `PrimerNombre`+`SegundoNombre` (si existe) y `PrimerApellido`+`SegundoApellido` (si existe).
- Teléfono preferido: celular; si viene vacío, cae a `ContactoComunicacion1Telefono`.
- Fecha placeholder vacía de Atlas: `"0000-00-00"` → se normaliza a `""` (`NormalizeAtlasDate` en `netviax_atlas_service.go`) — **cualquier código nuevo que lea una fecha de Atlas debe pasar por esta función**, si no el placeholder se filtra tal cual hacia la UI.

## Dónde se usa en la UI

`Availability.jsx`: botón **"Buscar contacto en Atlas"** (llena los campos de contacto del formulario) y un ícono de búsqueda junto a **Documento** en cada fila de pasajero (llena esa fila puntual). Ambos abren el mismo modal de búsqueda (`atlasService.js`, método `buscarContacto`/`detalleContacto`).
