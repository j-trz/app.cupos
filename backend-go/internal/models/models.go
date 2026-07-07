package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Profile struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Email             string    `gorm:"unique;not null" json:"email"`
	EncryptedPassword string    `gorm:"column:encrypted_password" json:"-"`
	Nombre            string    `json:"nombre"`
	Agencia           string    `json:"agencia"`
	Admin             bool      `gorm:"default:false" json:"admin"`
	Role              string    `gorm:"default:'agency_user'" json:"role"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Product struct {
	ID                     uint       `gorm:"primaryKey" json:"id"`
	CodigoCupo            string     `gorm:"not null" json:"codigo_cupo"`
	Destino                string     `gorm:"not null" json:"destino"`
	Compania               string     `gorm:"not null" json:"compania"`
	Disponibilidad         int        `gorm:"not null" json:"disponibilidad"`
	Salida                 *time.Time `json:"salida"`
	Regreso                *time.Time `json:"regreso"`
	FechaSalida           *time.Time `json:"fecha_salida"`
	FechaRegreso          *time.Time `json:"fecha_regreso"`
	Precio                 float64    `json:"precio"`
	Ruta                   string     `json:"ruta"`
	PNR                    string     `json:"pnr"`
	Ficha                  string     `json:"ficha"`
	Temporada              string     `json:"temporada"`
	BloqueoTemporalMinutos int        `json:"bloqueo_temporal_minutos"`
	Neto1                  float64    `json:"neto_1"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type Reservation struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	ProductID        uint      `json:"product_id"`
	CreatedBy        uuid.UUID `gorm:"type:uuid" json:"created_by"`
	Estado           string    `gorm:"default:'bloqueo_temporal'" json:"estado"`
	PrecioVenta      float64   `gorm:"not null" json:"precio_venta"`
	PedidoID         string    `gorm:"not null" json:"pedido_id"`
	Agencia          string    `gorm:"not null" json:"agencia"`
	ContactoNombre   string    `gorm:"not null" json:"contacto_nombre"`
	ContactoEmail    string    `gorm:"not null" json:"contacto_email"`
	VueloCodigo      string    `json:"vuelo_codigo"`
	VueloDestino     string    `json:"vuelo_destino"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Agency struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Code      string    `gorm:"unique;not null" json:"code"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Website   string    `json:"website"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type WhiteLabelConfig struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgencyID          string    `gorm:"not null" json:"agency_id"`
	CompanyName       string    `json:"company_name"`
	PrimaryColor      string    `gorm:"default:'#3b82f6'" json:"primary_color"`
	SecondaryColor    string    `gorm:"default:'#64748b'" json:"secondary_color"`
	LogoURL           string    `json:"logo_url"`
	IsActive          bool      `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type SystemSetting struct {
	Key       string         `gorm:"primaryKey" json:"key"`
	Value     datatypes.JSON `gorm:"type:jsonb;not null" json:"value"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type Notification struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Type         string    `gorm:"not null" json:"type"`
	Title        string    `gorm:"not null" json:"title"`
	Message      string    `gorm:"not null" json:"message"`
	TargetUserID *uuid.UUID `gorm:"type:uuid" json:"target_user_id"`
	TargetRole   string    `json:"target_role"`
	CreatedAt    time.Time `json:"created_at"`
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

type EmailSMTPConfig struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgencyID  uuid.UUID `gorm:"type:uuid" json:"agency_id"`
	SMTPHost  string    `json:"smtp_host"`
	SMTPPort  int       `json:"smtp_port"`
	SMTPUser  string    `json:"smtp_user"`
	SMTPPass  string    `json:"smtp_pass"`
	EmailFrom string    `json:"email_from"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AIProvider struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"unique;not null" json:"name"`
	DisplayName string    `json:"display_name"`
	BaseURL     string    `json:"base_url"`
	DefaultModel string   `json:"default_model"`
	IsActive    bool      `gorm:"default:false" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
