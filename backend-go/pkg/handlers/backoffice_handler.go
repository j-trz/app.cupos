package handlers

import (
	"net/http"

	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
)

// ─────────────────────────────────────────────
// BACKOFFICE (Netviax Atlas) - Búsqueda de contactos
//
// Permite buscar un contacto ya cargado en Atlas (por documento, email,
// celular o nombre) y traer su detalle para autocompletar el formulario de
// reserva. Solo lectura por ahora — el alta/actualización hacia Atlas
// (wscontactoguardar) queda para una etapa posterior.
//
// La lógica de la llamada HTTP a Atlas vive en
// pkg/services/netviax_atlas_service.go.
// ─────────────────────────────────────────────

// BuscarContactoAtlasRequest es el body de POST /api/backoffice/atlas/contactos/buscar
type BuscarContactoAtlasRequest struct {
	FiltroTipo string `json:"filtro_tipo" binding:"required"` // documento | email | celular | nombre
	Valor      string `json:"valor" binding:"required"`
	// DocumentoTipo/DocumentoPais solo aplican cuando filtro_tipo="documento"
	// (CI/PAS/DNI/RUT + país emisor ISO alpha-2, ej. "UY") — Atlas los exige
	// para no ambigüar el mismo número de documento entre países/tipos.
	DocumentoTipo string `json:"documento_tipo,omitempty"`
	DocumentoPais string `json:"documento_pais,omitempty"`
}

// ContactoAtlasResumen es la fila que se muestra en la lista de resultados.
type ContactoAtlasResumen struct {
	ContactoCodigo string `json:"contacto_codigo"`
	Nombre         string `json:"nombre"`
	Documento      string `json:"documento"`
	Email          string `json:"email"`
	Celular        string `json:"celular"`
}

// BuscarContactoAtlas godoc
// POST /api/backoffice/atlas/contactos/buscar
// Busca contactos en Atlas por documento, email, celular o nombre.
func BuscarContactoAtlas(c *gin.Context) {
	var input BuscarContactoAtlasRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filtro_tipo y valor son requeridos"})
		return
	}

	cfg, err := resolveAtlasConfigForRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resultados, err := services.BuscarContacto(cfg, services.BuscarContactoParams{
		FiltroTipo:    input.FiltroTipo,
		Valor:         input.Valor,
		DocumentoTipo: input.DocumentoTipo,
		DocumentoPais: input.DocumentoPais,
	})
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	contactos := make([]ContactoAtlasResumen, 0, len(resultados))
	for _, r := range resultados {
		contactos = append(contactos, ContactoAtlasResumen{
			ContactoCodigo: r.ContactoCodigo,
			Nombre:         r.ContactoNombre,
			Documento:      r.ContactoDocumento1,
			Email:          r.ContactoComunicacion1Email,
			Celular:        r.ContactoComunicacion1Celular,
		})
	}
	c.JSON(http.StatusOK, gin.H{"contactos": contactos})
}

// PasajeroDesdeAtlas es el pedazo del detalle que llena una fila de pasajero
// en el formulario — mismo shape que ya usa el formulario manual
// (nombre/apellido/documento/nacimiento/nacionalidad).
type PasajeroDesdeAtlas struct {
	Nombre       string `json:"nombre"`
	Apellido     string `json:"apellido"`
	Documento    string `json:"documento"`
	Nacimiento   string `json:"nacimiento"`
	Nacionalidad string `json:"nacionalidad"`
}

// DetalleContactoAtlasResponse es la respuesta de GET .../contactos/:codigo,
// ya mapeada al shape que espera el formulario de reserva.
type DetalleContactoAtlasResponse struct {
	ContactoNombre   string             `json:"contacto_nombre"`
	ContactoEmail    string             `json:"contacto_email"`
	ContactoTelefono string             `json:"contacto_telefono"`
	Passenger        PasajeroDesdeAtlas `json:"passenger"`
}

// DetalleContactoAtlas godoc
// GET /api/backoffice/atlas/contactos/:codigo
// Trae el detalle completo de un contacto por su ContactoCodigo, mapeado
// para autocompletar tanto los datos de contacto como una fila de pasajero.
func DetalleContactoAtlas(c *gin.Context) {
	codigo := c.Param("codigo")
	if codigo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El código de contacto es requerido"})
		return
	}

	cfg, err := resolveAtlasConfigForRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contacto, err := services.DetalleContacto(cfg, codigo)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	celularOTelefono := contacto.ContactoComunicacion1Celular
	if celularOTelefono == "" {
		celularOTelefono = contacto.ContactoComunicacion1Telefono
	}

	nombrePasajero := contacto.ContactoPrimerNombre
	if contacto.ContactoSegundoNombre != "" {
		nombrePasajero = nombrePasajero + " " + contacto.ContactoSegundoNombre
	}
	apellidoPasajero := contacto.ContactoPrimerApellido
	if contacto.ContactoSegundoApellido != "" {
		apellidoPasajero = apellidoPasajero + " " + contacto.ContactoSegundoApellido
	}

	c.JSON(http.StatusOK, DetalleContactoAtlasResponse{
		ContactoNombre:   contacto.ContactoNombre,
		ContactoEmail:    contacto.ContactoComunicacion1Email,
		ContactoTelefono: celularOTelefono,
		Passenger: PasajeroDesdeAtlas{
			Nombre:       nombrePasajero,
			Apellido:     apellidoPasajero,
			Documento:    contacto.ContactoDocumento1,
			Nacimiento:   contacto.ContactoNacimiento,
			Nacionalidad: contacto.ContactoNacionalidadPaisNombre,
		},
	})
}
