package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
)

// ─────────────────────────────────────────────
// NETVIAX ATLAS — Integración con el backoffice (Contactos)
//
// Doc de referencia: colección Postman "NETVIAX ATLAS.postman_collection.json"
// (carpeta Contactos). Esa colección no trae ejemplos de respuesta guardados,
// solo de request — el nombre de la clave que envuelve la lista de
// resultados de wscontactobuscar ("WSContactos" acá abajo) es la mejor
// conjetura por convención de nombres (WSContacto singular en detalle, plural
// en buscar) y debe confirmarse contra el sandbox real antes de producción.
//
// Fase actual: solo lectura (buscar + detalle). El alta/actualización
// (wscontactoguardar) queda para una etapa posterior.
// ─────────────────────────────────────────────

func atlasBaseURL(environment string) string {
	if environment == "prod" {
		if v := os.Getenv("ATLAS_API_URL_PROD"); v != "" {
			return v
		}
		// Confirmado por el usuario contra un request real: el dominio real es
		// api-atlas.netviax.com, no el *.azurewebsites.net que se había
		// asumido a partir del link de Gmail (probablemente un alias/redirect
		// viejo, o el custom domain apunta al mismo backend de Azure).
		return "https://api-atlas.netviax.com/rest"
	}
	if v := os.Getenv("ATLAS_API_URL_TEST"); v != "" {
		return v
	}
	// Sin confirmar todavía (nadie probó el sandbox con esta URL real) — si
	// falla, pedir la URL de test/sandbox correcta y setear ATLAS_API_URL_TEST.
	return "https://api-atlas-netviax-com-test.azurewebsites.net/rest"
}

// ResolveAtlasConfig busca, en orden: la config activa de la agencia y la
// config global (sin agencia asociada) — mismo patrón que resolveSMTPConfig
// en email_service.go.
func ResolveAtlasConfig(agencyCode string) (*models.AtlasConfig, error) {
	if agencyCode != "" {
		if agency, err := FindAgencyByCodeOrName(agencyCode); err == nil {
			var cfg models.AtlasConfig
			if database.DB.Where("agency_id = ? AND is_active = true", agency.ID).First(&cfg).Error == nil {
				return &cfg, nil
			}
		}
	}
	var cfg models.AtlasConfig
	if database.DB.Where("agency_id IS NULL AND is_active = true").First(&cfg).Error == nil {
		return &cfg, nil
	}
	return nil, fmt.Errorf("Atlas no está configurado para la agencia %q ni existe una configuración global", agencyCode)
}

// AtlasCredentials son los 4 campos que Atlas exige en el BODY de cada
// llamada (no van en headers). Debe quedar exportado (no "atlasCredentials")
// para que encoding/json pueda promover sus campos al embeberlo de forma
// anónima en los structs de request de más abajo.
type AtlasCredentials struct {
	Usuario  string `json:"Usuario"`
	Clave    string `json:"Clave"`
	Empresa  string `json:"Empresa"`
	Sucursal string `json:"Sucursal"`
}

func credentialsFromConfig(cfg *models.AtlasConfig) AtlasCredentials {
	return AtlasCredentials{Usuario: cfg.Usuario, Clave: cfg.Clave, Empresa: cfg.Empresa, Sucursal: cfg.Sucursal}
}

// AtlasFlexString existe porque Atlas no es consistente entre endpoints: la
// colección Postman muestra "Error"/"Mensaje" como string ("0", ""), pero
// wscontactovendedorbuscar los devuelve como número (0) — un string común
// tira "cannot unmarshal number into Go struct field" apenas llega la
// primera respuesta real. Acepta cualquiera de las dos formas y normaliza a
// string.
type AtlasFlexString string

func (s *AtlasFlexString) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		*s = AtlasFlexString(str)
		return nil
	}
	var num json.Number
	if err := json.Unmarshal(data, &num); err != nil {
		return fmt.Errorf("no es ni string ni número: %w", err)
	}
	*s = AtlasFlexString(num.String())
	return nil
}

// AtlasEnvelope son los campos de negocio que Atlas usa para indicar
// éxito/error ("0" = OK) — el status HTTP no es confiable (ver
// doAtlasRequest), así que el éxito/fracaso se decide siempre con este campo.
type AtlasEnvelope struct {
	Error   AtlasFlexString `json:"Error"`
	Mensaje AtlasFlexString `json:"Mensaje"`
}

func (e AtlasEnvelope) asError() error {
	if e.Error != "" && e.Error != "0" {
		return fmt.Errorf("Atlas: %s", e.Mensaje)
	}
	return nil
}

// doAtlasRequest hace el POST a Atlas y decodifica la respuesta en out.
//
// Gotcha: Atlas a veces devuelve HTTP 5xx con la operación completada (dos
// JSON pegados en la misma respuesta) — por eso NO se corta por
// resp.StatusCode acá; json.Decoder.Decode lee solo el primer valor JSON
// válido del stream e ignora cualquier basura pegada atrás. El éxito/fracaso
// de negocio se decide después, con el campo "Error" de out (ver
// AtlasEnvelope.asError).
func doAtlasRequest(cfg *models.AtlasConfig, endpoint string, body interface{}, out interface{}) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("no se pudo serializar el request a Atlas: %w", err)
	}

	url := atlasBaseURL(cfg.Environment) + "/" + endpoint
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("no se pudo conectar con Atlas: %w", err)
	}
	defer resp.Body.Close()

	if err := json.NewDecoder(io.LimitReader(resp.Body, 5<<20)).Decode(out); err != nil {
		return fmt.Errorf("Atlas devolvió una respuesta que no se pudo interpretar (HTTP %d): %w", resp.StatusCode, err)
	}
	return nil
}

// ---- Búsqueda de contactos (wscontactobuscar) ----

type WSContactoFiltro struct {
	Filtros          string `json:"Filtros"`
	ContactoCodigo   string `json:"ContactoCodigo,omitempty"`
	ContactoNombre   string `json:"ContactoNombre,omitempty"`
	ContactoTelefono string `json:"ContactoTelefono,omitempty"`
	ContactoCelular  string `json:"ContactoCelular,omitempty"`
	ContactoEmail    string `json:"ContactoEmail,omitempty"`
	// Buscar por documento requiere los 3 juntos — Atlas soporta el mismo
	// número de documento repetido en distintos países/tipos, así que sin
	// IdentificacionCodigo (CI/PAS/DNI/RUT) y PaisCodigo (ISO alpha-2 del
	// país emisor) el filtro queda ambiguo.
	ContactoDocumento                     string `json:"ContactoDocumento,omitempty"`
	ContactoDocumentoIdentificacionCodigo string `json:"ContactoDocumentoIdentificacionCodigo,omitempty"`
	ContactoDocumentoPaisCodigo           string `json:"ContactoDocumentoPaisCodigo,omitempty"`
	Paginado                              string `json:"Paginado"`
	PaginadoRegistros                     string `json:"PaginadoRegistros"`
	PaginadoPaginas                       string `json:"PaginadoPaginas"`
}

type wsContactoBuscarRequest struct {
	AtlasCredentials
	WSContactoFiltro WSContactoFiltro `json:"WSContactoFiltro"`
}

// WSContactoResumen es el subconjunto de campos de un contacto que alcanza
// para mostrar una lista de resultados de búsqueda al usuario.
type WSContactoResumen struct {
	ContactoCodigo               string `json:"ContactoCodigo"`
	ContactoNombre               string `json:"ContactoNombre"`
	ContactoDocumento1           string `json:"ContactoDocumento1"`
	ContactoComunicacion1Email   string `json:"ContactoComunicacion1Email"`
	ContactoComunicacion1Celular string `json:"ContactoComunicacion1Celular"`
}

type wsContactoBuscarResponse struct {
	AtlasEnvelope
	WSContactos []WSContactoResumen `json:"WSContactos"`
}

// BuscarContactoParams son los criterios de búsqueda — documentoTipo
// (CI/PAS/DNI/RUT) y documentoPais (ISO alpha-2 del país emisor, ej. "UY")
// solo aplican cuando FiltroTipo es "documento"; el resto de los tipos los
// ignora.
type BuscarContactoParams struct {
	FiltroTipo    string
	Valor         string
	DocumentoTipo string
	DocumentoPais string
}

// BuscarContacto arma un filtro con un único criterio relleno (documento,
// email, celular o nombre) y devuelve los contactos que matchean.
func BuscarContacto(cfg *models.AtlasConfig, params BuscarContactoParams) ([]WSContactoResumen, error) {
	filtro := WSContactoFiltro{Filtros: "S", Paginado: "N", PaginadoRegistros: "20", PaginadoPaginas: "1"}
	switch params.FiltroTipo {
	case "documento":
		if params.DocumentoTipo == "" || params.DocumentoPais == "" {
			return nil, fmt.Errorf("para buscar por documento hace falta el tipo (CI/PAS/DNI/RUT) y el país emisor")
		}
		filtro.ContactoDocumento = params.Valor
		filtro.ContactoDocumentoIdentificacionCodigo = params.DocumentoTipo
		filtro.ContactoDocumentoPaisCodigo = params.DocumentoPais
	case "email":
		filtro.ContactoEmail = params.Valor
	case "celular":
		filtro.ContactoCelular = params.Valor
	case "nombre":
		filtro.ContactoNombre = params.Valor
	default:
		return nil, fmt.Errorf("tipo de filtro desconocido: %q", params.FiltroTipo)
	}

	req := wsContactoBuscarRequest{AtlasCredentials: credentialsFromConfig(cfg), WSContactoFiltro: filtro}
	var resp wsContactoBuscarResponse
	if err := doAtlasRequest(cfg, "wscontactobuscar", req, &resp); err != nil {
		return nil, err
	}
	if err := resp.asError(); err != nil {
		return nil, err
	}
	return resp.WSContactos, nil
}

// ---- Detalle de contacto (wscontactodetallebuscar) ----

type wsContactoDetalleRequest struct {
	AtlasCredentials
	ContactoCodigo string `json:"ContactoCodigo"`
}

// WSContacto es el subconjunto de campos de detalle que usamos para
// autocompletar el formulario de reserva. Atlas devuelve muchos más campos
// (ver colección Postman, ~90 campos de wscontactoguardar) — no se modelan
// acá porque esta fase es de solo lectura; ampliar este struct si más
// adelante se implementa el guardado (wscontactoguardar), reusándolo tal
// cual porque el gotcha del proveedor dice que el response de detalle es
// idéntico al request de guardar.
type WSContacto struct {
	AtlasEnvelope
	ContactoCodigo                 string `json:"ContactoCodigo"`
	ContactoNombre                 string `json:"ContactoNombre"`
	ContactoPrimerNombre           string `json:"ContactoPrimerNombre"`
	ContactoSegundoNombre          string `json:"ContactoSegundoNombre"`
	ContactoPrimerApellido         string `json:"ContactoPrimerApellido"`
	ContactoSegundoApellido        string `json:"ContactoSegundoApellido"`
	ContactoDocumento1             string `json:"ContactoDocumento1"`
	ContactoNacimiento             string `json:"ContactoNacimiento"`
	ContactoNacionalidadPaisCodigo string `json:"ContactoNacionalidadPaisCodigo"`
	ContactoNacionalidadPaisNombre string `json:"ContactoNacionalidadPaisNombre"`
	ContactoGeneroCodigo           string `json:"ContactoGeneroCodigo"`
	ContactoComunicacion1Email     string `json:"ContactoComunicacion1Email"`
	ContactoComunicacion1Celular   string `json:"ContactoComunicacion1Celular"`
	ContactoComunicacion1Telefono  string `json:"ContactoComunicacion1Telefono"`
}

type wsContactoDetalleResponse struct {
	WSContacto WSContacto `json:"WSContacto"`
}

// atlasEmptyDate es el placeholder que Atlas usa para fechas vacías.
const atlasEmptyDate = "0000-00-00"

func normalizeAtlasDate(v string) string {
	if v == atlasEmptyDate {
		return ""
	}
	return v
}

// DetalleContacto trae el detalle completo de un contacto por su código.
func DetalleContacto(cfg *models.AtlasConfig, contactoCodigo string) (*WSContacto, error) {
	req := wsContactoDetalleRequest{AtlasCredentials: credentialsFromConfig(cfg), ContactoCodigo: contactoCodigo}
	var resp wsContactoDetalleResponse
	if err := doAtlasRequest(cfg, "wscontactodetallebuscar", req, &resp); err != nil {
		return nil, err
	}
	contacto := resp.WSContacto
	if err := contacto.asError(); err != nil {
		return nil, err
	}
	contacto.ContactoNacimiento = normalizeAtlasDate(contacto.ContactoNacimiento)
	return &contacto, nil
}

// ---- Probar conexión (wscontactovendedorbuscar) ----

type wsContactoVendedorBuscarRequest struct {
	AtlasCredentials
}

type wsContactoVendedorBuscarResponse struct {
	AtlasEnvelope
}

// TestAtlasConnection ejecuta wscontactovendedorbuscar (no requiere filtros,
// solo credenciales válidas) para validar que Usuario/Clave/Empresa/Sucursal
// funcionan contra Atlas.
func TestAtlasConnection(cfg *models.AtlasConfig) error {
	req := wsContactoVendedorBuscarRequest{AtlasCredentials: credentialsFromConfig(cfg)}
	var resp wsContactoVendedorBuscarResponse
	if err := doAtlasRequest(cfg, "wscontactovendedorbuscar", req, &resp); err != nil {
		return err
	}
	return resp.asError()
}
