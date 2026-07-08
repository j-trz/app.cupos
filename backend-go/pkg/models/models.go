package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Profile struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Email             string    `gorm:"unique;not null" json:"email"`
	// Password nunca se persiste (gorm:"-"): solo se usa para recibir el valor
	// en texto plano del request y hashearlo hacia EncryptedPassword.
	Password          string    `gorm:"-" json:"password,omitempty" binding:"required"`
	EncryptedPassword string    `gorm:"column:encrypted_password" json:"-"`
	Nombre            string    `json:"nombre"`
	Apellido          string    `json:"apellido"`
	Telefono          string    `json:"telefono"`
	Agencia           string    `json:"agencia"`
	Admin             bool      `gorm:"default:false" json:"admin"`
	// IsActive es un campo propio, distinto de Admin (antes ToggleUserStatus
	// reusaba la columna "admin" como proxy de "activo", lo cual mezclaba
	// privilegio de administrador con habilitación de la cuenta).
	IsActive          bool      `gorm:"default:true" json:"activo"`
	Role              string    `gorm:"default:'agency_user'" json:"role"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Product struct {
	ID                     uint       `gorm:"primaryKey" json:"id"`
	CodigoCupo             string     `gorm:"not null" json:"codigo_cupo"`
	Destino                string     `gorm:"not null" json:"destino"`
	Compania               string     `gorm:"not null" json:"compania"`
	Disponibilidad         int        `gorm:"not null" json:"disponibilidad"`
	Cupo                   int        `json:"cupo"`
	Vendidos               int        `json:"vendidos"`
	FechaSalida            *time.Time `json:"fecha_salida"`
	FechaRegreso           *time.Time `json:"fecha_regreso"`
	Precio                 float64    `json:"precio"`
	Neto1                  float64    `json:"neto_1"`
	OP                     float64    `json:"op"`
	Ruta                   string     `json:"ruta"`
	PNR                    string     `json:"pnr"`
	Ficha                  string     `json:"ficha"`
	Temporada              string     `json:"temporada"`
	TipoProducto           string     `json:"tipo_producto"`
	BloqueoTemporalMinutos int        `json:"bloqueo_temporal_minutos"`
	CarryOn                bool       `gorm:"column:carryon;default:false" json:"carryon"`
	HandBag                bool       `gorm:"column:handbag;default:false" json:"handbag"`
	CheckedBag             bool       `gorm:"column:checkedbag;default:false" json:"checkedbag"`
	InfFare                float64    `json:"inf_fare"`
	ChdFare                float64    `json:"chd_fare"`
	IsBlockedForSale       bool       `gorm:"default:false" json:"is_blocked_for_sale"`
	// Agencia es la agencia DUEÑA de este cupo. Ya no existe un "catálogo
	// general" visible para todas las agencias por defecto: sin cesión de por
	// medio, un producto solo lo ve (y lo puede reservar) su propia agencia
	// dueña (y el admin, que ve todo). Otra agencia solo lo ve si se le cedió
	// disponibilidad (ver RestrictedAgency más abajo).
	Agencia string `gorm:"column:agencia" json:"agencia"`
	// RestrictedAgency, si está seteado, hace que este producto solo sea
	// visible/reservable para esa agencia (+ admin) — se usa en los productos
	// "espejo" que crea una cesión, para que el cupo cedido lo vea únicamente
	// la agencia destino y no el catálogo de la agencia dueña.
	RestrictedAgency string `gorm:"column:restricted_agency" json:"restricted_agency,omitempty"`
	// SourceAgency es quién cedió ESTE producto-espejo puntual (la agencia
	// cedente inmediata de este hop). A diferencia de RestrictedAgency (quién
	// lo tiene hoy), esto permite que la agencia cedente también vea el
	// producto en pantallas de gestión (no en Disponibilidad) aunque ya no
	// sea la dueña actual — necesario para poder volver a cederlo hacia atrás
	// y para no perder trazabilidad de quién se lo dio a quién.
	SourceAgency string `gorm:"column:source_agency" json:"source_agency,omitempty"`
	// TransferID vincula un producto-espejo de cesión con su AvailabilityTransfer
	// de origen, para poder auditar el movimiento completo.
	TransferID *uuid.UUID `gorm:"type:uuid;column:transfer_id" json:"transfer_id,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// Estados posibles de Reservation.Estado (antes convivían "confirmado"/"confirmada" como
// valores distintos sin querer; se unifican acá para que el cron y las notificaciones
// puedan filtrar de forma consistente).
const (
	EstadoBloqueoTemporal      = "bloqueo_temporal"
	EstadoConfirmada           = "confirmada"
	EstadoSolicitudCancelacion = "solicitud_cancelacion"
	EstadoCancelada            = "cancelada"
	EstadoExpirada             = "expirada"
	// EstadoCedida marca la línea que queda en la agencia cedente cuando cede
	// disponibilidad a otra agencia — es un registro de auditoría del stock
	// que salió de su pool, no una reserva de pasajero real.
	EstadoCedida = "cedido"
)

type Reservation struct {
	ID                   uint       `gorm:"primaryKey" json:"id"`
	ProductID            uint       `json:"product_id"`
	CreatedBy            uuid.UUID  `gorm:"type:uuid" json:"created_by"`
	Estado               string     `gorm:"default:'bloqueo_temporal'" json:"estado"`
	BloqueoExpiraAt      *time.Time `json:"bloqueo_expira_at"`
	PrecioVenta          float64    `json:"precio_venta"`
	Neto1                float64    `json:"neto_1"`
	PedidoID             string     `gorm:"not null" json:"pedido_id"`
	Agencia              string     `json:"agencia"`
	TransferID           *uuid.UUID `gorm:"type:uuid;column:transfer_id" json:"transfer_id,omitempty"`
	OriginalAgency       string     `gorm:"column:original_agency" json:"original_agency,omitempty"`
	ContactoNombre       string     `gorm:"not null" json:"contacto_nombre"`
	ContactoEmail        string     `json:"contacto_email"`
	ContactoTelefono     string     `json:"contacto_telefono"`
	VueloCodigo          string     `json:"vuelo_codigo"`
	VueloDestino         string     `json:"vuelo_destino"`
	VueloCompania        string     `json:"vuelo_compania"`
	VueloSalida          *time.Time `json:"vuelo_salida"`
	VueloPrecio          float64    `json:"vuelo_precio"`
	VueloRuta            string     `json:"vuelo_ruta"`
	NombrePasajero       string     `json:"nombre_pasajero"`
	ApellidoPasajero     string     `json:"apellido_pasajero"`
	DocumentoPasajero    string     `json:"documento_pasajero"`
	NacimientoPasajero   *time.Time `json:"nacimiento_pasajero"`
	NacionalidadPasajero string     `json:"nacionalidad_pasajero"`
	TipoPasajero         string     `json:"tipo_pasajero"`
	FichaVenta           string     `json:"ficha_venta"`
	DocContable          string     `json:"doc_contable"`
	DocContableExpiresAt *time.Time `json:"doc_contable_expires_at"`
	// ExpirationWarningSentAt evita reenviar el aviso de "por vencer" en cada corrida del cron.
	ExpirationWarningSentAt *time.Time `json:"expiration_warning_sent_at"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
	// Passengers son los pasajeros desglosados de la reserva (puede haber más de
	// uno). Si viene vacío, la UI debe usar los campos *Pasajero de arriba como
	// fallback (reservas creadas sin desglose de pasajeros).
	Passengers []Passenger `gorm:"foreignKey:ReservationID" json:"passengers,omitempty"`
}

// Passenger es la unidad real de "cupo aéreo": cada pasajero ocupa 1 lugar y
// se crea siempre de forma individual (con su propio ticket), aunque varios
// pasajeros compartan PedidoID/ReservationID por haberse reservado juntos.
type Passenger struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	ReservationID uint       `json:"reservation_id"`
	PedidoID      string     `json:"pedido_id"`
	Nombre        string     `json:"nombre"`
	Apellido      string     `json:"apellido"`
	Documento     string     `json:"documento"`
	Nacimiento    *time.Time `json:"nacimiento"`
	Nacionalidad  string     `json:"nacionalidad"`
	TipoPasajero  string     `json:"tipo_pasajero"`
	NRO           int        `json:"nro"` // 1 = Venta, 0 = Acompañante
	// Campos de ticket individual: cada pasajero progresa de forma
	// independiente dentro del mismo pedido.
	Estado                  string     `gorm:"default:'bloqueo_temporal'" json:"estado"`
	NumeroTicket            string     `json:"numero_ticket"`
	PrecioVenta             float64    `json:"precio_venta"`
	Neto1                   float64    `json:"neto_1"`
	DocContable             string     `json:"doc_contable"`
	DocContableExpiresAt    *time.Time `json:"doc_contable_expires_at"`
	BloqueoExpiraAt         *time.Time `json:"bloqueo_expira_at"`
	ExpirationWarningSentAt *time.Time `json:"expiration_warning_sent_at"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

type Agency struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Code      string    `gorm:"unique;not null" json:"code"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Website   string    `json:"website"`
	Color     string    `gorm:"default:'#3b82f6'" json:"color"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type WhiteLabelConfig struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgencyID  string         `gorm:"not null;uniqueIndex" json:"agency_id"`
	Config    datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"config"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type SystemSetting struct {
	Key       string         `gorm:"primaryKey" json:"key"`
	Value     datatypes.JSON `gorm:"type:jsonb;not null" json:"value"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type Notification struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Type         string     `gorm:"not null;default:'info'" json:"type"`
	Title        string     `gorm:"not null" json:"title"`
	Message      string     `gorm:"not null" json:"message"`
	Icon         string     `gorm:"default:'📢'" json:"icon"`
	Color        string     `gorm:"default:'blue'" json:"color"`
	Priority     string     `gorm:"default:'medium'" json:"priority"`
	TargetUserID *uuid.UUID `gorm:"type:uuid" json:"target_user_id"`
	TargetRole   string     `json:"target_role"`
	TargetAgency string     `json:"target_agency"`
	IsRead       bool       `gorm:"default:false" json:"is_read"`
	IsHidden     bool       `gorm:"default:false" json:"is_hidden"`
	CreatedBy    *uuid.UUID `gorm:"type:uuid" json:"created_by"`
	CreatedAt    time.Time  `json:"created_at"`
}

// SystemLog registra requests y eventos de negocio (errores, cron, email) para
// la sección de administración "Logs del sitio".
type SystemLog struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Level      string     `gorm:"default:'info';index" json:"level"` // info | warning | error
	Source     string     `gorm:"index" json:"source"`               // http | cron | email | ...
	Method     string     `json:"method"`
	Path       string     `json:"path"`
	StatusCode int        `json:"status_code"`
	Message    string     `json:"message"`
	Details    string     `json:"details"`
	UserID     *uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Agencia    string     `json:"agencia"`
	DurationMs int64      `json:"duration_ms"`
	CreatedAt  time.Time  `gorm:"index" json:"created_at"`
}

type Permission struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Code        string    `gorm:"unique;not null" json:"code"`
	Module      string    `gorm:"not null" json:"module"`
	Description string    `json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Role struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Code        string    `gorm:"unique;not null" json:"code"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"default:false" json:"is_system"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UserRole struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	RoleID    uuid.UUID `gorm:"type:uuid;not null" json:"role_id"`
	GrantedAt time.Time `json:"granted_at"`
}

type RolePermission struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	RoleID       uuid.UUID `gorm:"type:uuid;not null" json:"role_id"`
	PermissionID uuid.UUID `gorm:"type:uuid;not null" json:"permission_id"`
}

type EmailSMTPConfig struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgencyID   *uuid.UUID `gorm:"type:uuid" json:"agency_id,omitempty"`
	SMTPHost   string    `json:"smtp_host"`
	SMTPPort   int       `json:"smtp_port"`
	SMTPUser   string    `json:"smtp_user"`
	SMTPPass   string    `json:"smtp_pass"`
	SMTPSecure bool      `gorm:"default:false" json:"smtp_secure"`
	EmailFrom  string    `json:"email_from"`
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// EmailTemplate define el asunto/cuerpo de un email transaccional identificado
// por Code (ej. "reservation_blocked"). AgencyID nulo = plantilla global/default,
// usada cuando la agencia no definió una propia para ese Code.
type EmailTemplate struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Code      string     `gorm:"not null;index" json:"code"`
	Name      string     `json:"name"`
	Subject   string     `json:"subject"`
	BodyHTML  string     `json:"body_html"`
	AgencyID  *uuid.UUID `gorm:"type:uuid" json:"agency_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type AIProvider struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name         string    `gorm:"unique;not null" json:"name"`
	DisplayName  string    `json:"display_name"`
	ProviderType string    `gorm:"column:provider_type;default:'openai'" json:"provider_type"`
	APIKey       string    `gorm:"column:api_key" json:"api_key,omitempty"`
	APIEndpoint  string    `gorm:"column:api_endpoint" json:"api_endpoint"`
	BaseURL      string    `json:"base_url"`
	DefaultModel string    `json:"default_model"`
	Temperature  float64   `gorm:"default:0.7" json:"temperature"`
	MaxTokens    int       `gorm:"default:4096" json:"max_tokens"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	IsDefault    bool      `gorm:"default:false" json:"is_default"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AIAction struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"unique;not null" json:"name"`
	Description string         `json:"description"`
	ActionType  string         `gorm:"column:action_type;default:'api_call'" json:"action_type"`
	Endpoint    string         `json:"endpoint"`
	Method      string         `gorm:"default:'GET'" json:"method"`
	Parameters  datatypes.JSON `json:"parameters"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type AISession struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AIMessage struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SessionID  uuid.UUID      `gorm:"type:uuid" json:"session_id"`
	UserID     uuid.UUID      `gorm:"type:uuid" json:"user_id"`
	Role       string         `json:"role"`
	Content    string         `json:"content"`
	TokenUsage datatypes.JSON `gorm:"column:token_usage" json:"token_usage"`
	CreatedAt  time.Time      `json:"created_at"`
}

// AvailabilityTransfer representa una cesión de disponibilidad entre agencias
type AvailabilityTransfer struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProductID    uint      `gorm:"not null" json:"product_id"`
	SourceAgency string    `gorm:"not null;column:source_agency" json:"source_agency"`
	TargetAgency string    `gorm:"not null;column:target_agency" json:"target_agency"`
	Quantity     int       `gorm:"not null" json:"quantity"`
	CreatedBy    uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	// Relaciones
	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// Agregar campos de cesión a Reservation
// (Ya existen en el model, pero aseguramos compatibilidad)
