package models

import (
	"time"
)

// Product represents a seat block / cupo contract.
type Product struct {
	ID            uint      `gorm:"primaryKey;column:id" json:"id"`
	CodigoCupo    string    `gorm:"column:codigo_cupo;not null" json:"codigo_cupo"`
	Destino       string    `gorm:"column:destino;not null" json:"destino"`
	Compania      string    `gorm:"column:compania;not null" json:"compania"`
	Disponibilidad int       `gorm:"column:disponibilidad;not null" json:"disponibilidad"`
	Cupo          int       `gorm:"column:cupo" json:"cupo"`
	Vendidos      int       `gorm:"column:vendidos" json:"vendidos"`
	FechaSalida   time.Time `gorm:"column:fecha_salida" json:"fecha_salida"`
	FechaRegreso  time.Time `gorm:"column:fecha_regreso" json:"fecha_regreso"`
	Precio        float64   `gorm:"column:precio" json:"precio"`
	Neto1         float64   `gorm:"column:neto_1" json:"neto_1"`
	Op            float64   `gorm:"column:op" json:"op"`
	Ruta          string    `gorm:"column:ruta" json:"ruta"`
	Pnr           string    `gorm:"column:pnr" json:"pnr"`
	Ficha         string    `gorm:"column:ficha" json:"ficha"`
	Temporada     string    `gorm:"column:temporada" json:"temporada"`
	TipoProducto  string    `gorm:"column:tipo_producto" json:"tipo_producto"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt     time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName overrides the default table name for Product.
func (Product) TableName() string {
	return "products"
}

// Reservation represents a booking order which groups multiple passengers.
type Reservation struct {
	ID             uint      `gorm:"primaryKey;column:id" json:"id"`
	ProductID      uint      `gorm:"column:product_id;not null" json:"product_id"`
	CreatedBy      string    `gorm:"column:created_by;type:uuid;not null" json:"created_by"`
	Estado         string    `gorm:"column:estado;default:'bloqueo_temporal'" json:"estado"`
	PrecioVenta    float64   `gorm:"column:precio_venta" json:"precio_venta"`
	Neto1          float64   `gorm:"column:neto_1" json:"neto_1"`
	PedidoID       string    `gorm:"column:pedido_id;not null" json:"pedido_id"`
	Agencia        string    `gorm:"column:agencia" json:"agencia"`
	ContactoNombre string    `gorm:"column:contacto_nombre;not null" json:"contacto_nombre"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updated_at"`

	// Associations
	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// TableName overrides the default table name for Reservation.
func (Reservation) TableName() string {
	return "reservations"
}

// Passenger represents an individual passenger within a reservation.
type Passenger struct {
	ID            uint      `gorm:"primaryKey;column:id" json:"id"`
	ReservationID uint      `gorm:"column:reservation_id;not null" json:"reservation_id"`
	PedidoID      string    `gorm:"column:pedido_id" json:"pedido_id"`
	Nombre        string    `gorm:"column:nombre" json:"nombre"`
	Apellido      string    `gorm:"column:apellido" json:"apellido"`
	Documento     string    `gorm:"column:documento" json:"documento"`
	Nacimiento    time.Time `gorm:"column:nacimiento" json:"nacimiento"`
	Nacionalidad  string    `gorm:"column:nacionalidad" json:"nacionalidad"`
	TipoPasajero  string    `gorm:"column:tipo_pasajero" json:"tipo_pasajero"`
	Nro           int       `gorm:"column:nro" json:"nro"`
	Estado        string    `gorm:"column:estado;default:'bloqueo_temporal'" json:"estado"`
	NumeroTicket  string    `gorm:"column:numero_ticket" json:"numero_ticket"`
	PrecioVenta   float64   `gorm:"column:precio_venta" json:"precio_venta"`
	Neto1         float64   `gorm:"column:neto_1" json:"neto_1"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt     time.Time `gorm:"column:updated_at" json:"updated_at"`

	// Associations
	Reservation Reservation `gorm:"foreignKey:ReservationID" json:"reservation,omitempty"`
}

// TableName overrides the default table name for Passenger.
func (Passenger) TableName() string {
	return "passengers"
}
