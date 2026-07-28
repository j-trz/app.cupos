package models

import (
	"time"

	"github.com/google/uuid"
)

// APIKey representa una llave de acceso para integraciones externas (M2M).
type APIKey struct {
	ID          uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name        string     `gorm:"type:varchar(150);not null" json:"name"`
	Prefix      string     `gorm:"type:varchar(20);not null;index" json:"prefix"`
	KeyHash     string     `gorm:"type:varchar(255);not null;uniqueIndex" json:"-"`
	AgencyID    *uuid.UUID `gorm:"type:uuid;index" json:"agency_id,omitempty"`
	CreatedByID uuid.UUID  `gorm:"type:uuid;not null" json:"created_by_id"`
	Scopes      string     `gorm:"type:text;default:'*'" json:"scopes"` // ej. "products:read,reservations:create" o "*"
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relaciones
	Agency    *Agency  `gorm:"foreignKey:AgencyID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"agency,omitempty"`
	CreatedBy *Profile `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"created_by,omitempty"`
}

// CreateAPIKeyRequest payload de entrada para generar una nueva clave.
type CreateAPIKeyRequest struct {
	Name      string     `json:"name" binding:"required"`
	AgencyID  *uuid.UUID `json:"agency_id"`
	Scopes    []string   `json:"scopes"`
	ExpiresAt *time.Time `json:"expires_at"`
}

// CreateAPIKeyResponse devuelve la clave secreta en texto plano UNA sola vez.
type CreateAPIKeyResponse struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Prefix    string     `json:"prefix"`
	SecretKey string     `json:"secret_key"` // Solo devuelta en creación
	Scopes    string     `json:"scopes"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}
