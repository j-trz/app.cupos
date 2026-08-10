Búsqueda de una ficha de venta en Netviax Atlas, con todos sus pasajeros asociados — **ya construido, solo lectura**. Ver [[Conexión y Estructura General]] para credenciales, URLs y manejo de errores.

> Última verificación contra código: 2026-08-10.

## Endpoint interno (nuestra API)

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/backoffice/atlas/fichas/buscar` | Busca una ficha de venta por número exacto |

Handler: `BuscarFichaAtlas` en `backend-go/pkg/handlers/backoffice_handler.go`.

## `wsfichabuscar`

**Gotcha confirmado con un request real**: el campo de filtro correcto es **`FichaNumero`** — probamos `"Ficha"` y `"FichaCodigo"` primero y Atlas los **ignora en silencio**, devolviendo el listado completo sin filtrar (no un error, lo cual hace que el bug sea fácil de no notar).

**Qué enviamos:**

```json
{
  "Usuario": "...", "Clave": "...", "Empresa": "...", "Sucursal": "...",
  "WSFichaFiltro": {
    "Filtros": "S",
    "FichaNumero": "12345",
    "Paginado": "N",
    "PaginadoRegistros": "20",
    "PaginadoPaginas": "1"
  }
}
```

**Qué recibimos** — la respuesta ya trae el **detalle completo** de la ficha, incluyendo el array `Contactos` con **todos** los pasajeros asociados. No hace falta llamar a un `wsfichadetallebuscar` aparte (de hecho no se usa ninguno):

```json
{
  "Error": "0", "Mensaje": "",
  "WSFichas": [
    {
      "Error": "0", "Mensaje": "",
      "FichaSerie": "A", "FichaNumero": "12345",
      "FichaAsunto": "Cancún Vacaciones", "FichaDescripcion": "...",
      "FichaViajeEstimadoInicio": "2026-09-18", "FichaViajeEstimadoFin": "2026-09-25",
      "EstadoCodigo": "CONF", "EstadoNombre": "Confirmada",
      "Vendedor1Nombre": "María Gómez",
      "Contactos": [
        {
          "ContactoCodigo": "C-00123",
          "ContactoPrimerNombre": "Juan", "ContactoSegundoNombre": "",
          "ContactoPrimerApellido": "Pérez", "ContactoSegundoApellido": "",
          "ContactoDocumentoIdentificacionCodigo": "CI", "ContactoDocumentoPaisCodigo": "UY", "ContactoDocumento": "12345678",
          "ContactoDocumento2IdentificacionCodigo": "PAS", "ContactoDocumento2PaisCodigo": "UY", "ContactoDocumento2": "A1234567",
          "ContactoTelefono": "", "ContactoCelular": "099123456", "ContactoEmail": "juan@example.com",
          "ContactoNacionalidadPaisCodigo": "UY", "ContactoNacionalidadPaisNombre": "Uruguay",
          "ContactoNacimiento": "1990-05-12",
          "ContactoTipoCodigo": "ADT",
          "ContactoEsPasajero": "S", "ContactoEsCliente": "N"
        }
      ]
    }
  ]
}
```

**Nota sobre `Error`/`Mensaje` en este endpoint**: viene en 2 niveles distintos, con tipos distintos — número en el nivel raíz de `WSFichas` (envolvente) y string dentro de cada ficha individual. Por eso se usa `AtlasEnvelope` (con `AtlasFlexString`) en los dos lugares, y el código chequea `asError()` tanto en la respuesta completa como en cada ficha individual del array.

Nuestra API lo re-mapea así, filtrando solo pasajeros reales y separando documento/pasaporte:

```json
{
  "ficha_numero": "12345",
  "asunto": "Cancún Vacaciones",
  "pasajeros": [
    {
      "contacto_codigo": "C-00123",
      "nombre": "Juan", "apellido": "Pérez",
      "documento": "12345678", "pasaporte": "A1234567",
      "nacionalidad": "Uruguay", "nacimiento": "1990-05-12",
      "tipo_pasajero": "Adulto",
      "telefono": "099123456", "email": "juan@example.com"
    }
  ]
}
```

**Reglas de mapeo a notar:**
- **Filtro de pasajeros reales**: solo se incluyen contactos con `ContactoEsPasajero == "S"` — la ficha puede traer otros contactos asociados (ej. el cliente que paga, si no es también pasajero) que se descartan.
- **Documento vs pasaporte**: Atlas manda 2 documentos por contacto (`Documento`/`Documento2`) sin fijar cuál es cuál — se decide por `IdentificacionCodigo`: el que tenga código `"PAS"` es pasaporte, el resto va a `documento` (CI). Ver `splitDocumentosFicha()` en `backoffice_handler.go` si hace falta tocar esta lógica.
- **Tipo de pasajero**: Atlas usa el estándar de industria `ADT`/`CHD`/`INF` (`ContactoTipoCodigo`) — se traduce a `Adulto`/`Menor`/`Infante` (las 3 opciones que ya usa nuestro formulario) vía `tipoPasajeroFromAtlas()`. **Ojo**: esta traducción es puramente por el código de Atlas, no repite el bug de cálculo por fecha de regreso que sí tiene nuestro formulario (ver `006 - Operación y Mantenimiento/Historial de Bugs Resueltos.md`... en realidad ese bug de fecha de regreso está documentado como bug abierto en `Feedback UTG`, no en Historial — revisar ahí si aplica acá también).
- **Nombre/apellido**: mismo patrón que en la búsqueda de contactos — concatena `PrimerNombre`+`SegundoNombre` y `PrimerApellido`+`SegundoApellido`.

## `wsfichaguardar` — existe en Atlas, deliberadamente no implementado

La colección Postman de Netviax incluye un endpoint de alta/edición de fichas (`wsfichaguardar`), pero **no se construyó** — esta integración es explícitamente de solo lectura del lado de fichas. Es uno de los dos candidatos para la próxima fase de escritura (reportar tickets emitidos) — ver [[Envío de Tickets Emitidos (Pendiente)]].

## Dónde se usa en la UI

`Availability.jsx`: en el formulario de reserva, buscar por número de ficha para traer e importar de una todos los pasajeros asociados (alternativa a buscar contacto por contacto).
