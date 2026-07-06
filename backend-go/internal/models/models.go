package models

import (
	"time"
	"github.com/google/uuid"
)

type Profile struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Email     string    `gorm:"unique;not null" json:"email"`
	Nombre    string    `json:"nombre"`
	Agencia   string    `json:"agencia"`
	Admin     bool      `gorm:"default:false" json:"admin"`
	Role      string    `gorm:"default:'agency_user'" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Product struct {
	ID                     uint      `gorm:"primaryKey" json:"id"`
	CodigoCupo            string    `gorm:"not null" json:"codigo_cupo"`
	Destino                string    `gorm:"not null" json:"destino"`
	Compania               string    `gorm:"not null" json:"compania"`
	Disponibilidad         int       `gorm:"not null" json:"disponibilidad"`
	Salida                 *time.Time `json:"salida"`
	Regreso                *time.Time `json:"regreso"`
	FechaSalida           *time.Time `json:"fecha_salida"`
	FechaRegreso          *time.Time `json:"fecha_regreso"`
	Precio                 float64   `json:"precio"`
	Ruta                   string    `json:"ruta"`
	PNR                    string    `json:"pnr"`
	Ficha                  string    `json:"ficha"`
	Temporada              string    `json:"temporada"`
	BloqueoTemporalMinutos int       `json:"bloqueo_temporal_minutos"`
	Neto1                  float64   `json:"neto_1"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
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
