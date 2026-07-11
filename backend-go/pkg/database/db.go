package database

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"backend-go/pkg/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("WARNING: DATABASE_URL is not set")
		return
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("Connected to database")

	// Automigrate
	db.AutoMigrate(
		&models.Profile{},
		&models.Product{},
		&models.Reservation{},
		&models.AvailabilityTransfer{},
		&models.Passenger{},
		&models.Agency{},
		&models.WhiteLabelConfig{},
		&models.SystemSetting{},
		&models.Notification{},
		&models.Permission{},
		&models.Role{},
		&models.UserRole{},
		&models.RolePermission{},
		&models.EmailSMTPConfig{},
		&models.EmailTemplate{},
		&models.NotificationTemplate{},
		&models.SystemLog{},
		&models.AIProvider{},
		&models.AISession{},
		&models.AIMessage{},
		&models.ProductSharedAgency{},
	)

	// Run SQL migrations for columns/tables that need ALTER statements
	runSQLMigrations(db)

	seedEmailTemplates(db)
	seedSystemSettings(db)
	seedNotificationTemplates(db)

	DB = db
}

// seedSystemSettings crea los ajustes globales por defecto si todavía no
// existen, para que ListSettings/Settings.jsx los muestre desde el primer
// arranque y GetIntSetting tenga algo que leer aunque nadie los haya tocado.
func seedSystemSettings(db *gorm.DB) {
	defaults := map[string]interface{}{
		"bloqueo_minutos_default": 60,
		"ai_historial_horas":      4,
	}
	for key, value := range defaults {
		var count int64
		db.Model(&models.SystemSetting{}).Where("key = ?", key).Count(&count)
		if count == 0 {
			valueJSON, _ := json.Marshal(value)
			db.Create(&models.SystemSetting{Key: key, Value: valueJSON})
		}
	}
}

// seedEmailTemplates crea las plantillas globales por defecto (AgencyID = nil)
// si todavía no existen, para que el envío de emails transaccionales funcione
// aunque una agencia nunca haya personalizado sus plantillas.
func seedEmailTemplates(db *gorm.DB) {
	defaults := []models.EmailTemplate{
		{
			Code:     "reservation_blocked",
			Name:     "Reserva en bloqueo temporal",
			Subject:  "Tu reserva {{pedido_id}} está en bloqueo temporal",
			BodyHTML: "<p>Hola {{contacto_nombre}},</p><p>Tu reserva del pedido <b>{{pedido_id}}</b> quedó en bloqueo temporal y vence el {{vence}}. Confirmala antes de esa fecha o el cupo se liberará automáticamente.</p>",
		},
		{
			Code:     "reservation_expiring_soon",
			Name:     "Reserva por vencer",
			Subject:  "Tu reserva {{pedido_id}} está por vencer",
			BodyHTML: "<p>Hola {{contacto_nombre}},</p><p>Tu reserva del pedido <b>{{pedido_id}}</b> vence en menos de {{minutos}} minutos. Confirmala para no perder el cupo.</p>",
		},
		{
			Code:     "reservation_expired",
			Name:     "Reserva expirada",
			Subject:  "Tu reserva {{pedido_id}} expiró",
			BodyHTML: "<p>Hola {{contacto_nombre}},</p><p>Tu reserva del pedido <b>{{pedido_id}}</b> expiró por vencimiento del bloqueo temporal y el cupo fue liberado.</p>",
		},
		{
			Code:     "reservation_confirmed",
			Name:     "Reserva confirmada",
			Subject:  "Tu reserva {{pedido_id}} fue confirmada",
			BodyHTML: "<p>Hola {{contacto_nombre}},</p><p>Tu reserva del pedido <b>{{pedido_id}}</b> fue confirmada correctamente.</p>",
		},
		{
			Code:     "new_product",
			Name:     "Nuevo producto disponible",
			Subject:  "Nuevo producto disponible: {{codigo_cupo}}",
			BodyHTML: "<p>Se agregó un nuevo producto a disponibilidad:</p><p><b>{{codigo_cupo}}</b> hacia {{destino}} ({{compania}})</p>",
		},
		{
			Code:     "test_email",
			Name:     "Email de prueba",
			Subject:  "Email de prueba",
			BodyHTML: "<p>Este es un email de prueba para verificar la configuración SMTP.</p>",
		},
	}

	for _, tpl := range defaults {
		var count int64
		db.Model(&models.EmailTemplate{}).Where("code = ? AND agency_id IS NULL", tpl.Code).Count(&count)
		if count == 0 {
			db.Create(&tpl)
		}
	}
}

// seedNotificationTemplates crea las plantillas globales de notificaciones
// in-app (campana) con el mismo texto que los handlers armaban antes a mano
// con fmt.Sprintf, para que un admin las pueda editar desde
// NotificationTemplates.jsx sin que cambie el comportamiento por defecto.
func seedNotificationTemplates(db *gorm.DB) {
	defaults := []models.NotificationTemplate{
		{Code: "new_request", Name: "Nueva reserva creada", Title: "Nueva reserva creada",
			Message: "Agencia {{agencia}} creó la reserva {{pasajero}} (pedido {{pedido_id}})"},
		{Code: "low_availability", Name: "Baja disponibilidad", Title: "Baja disponibilidad",
			Message: "El producto {{codigo_cupo}} hacia {{destino}} quedó con {{disponibilidad}} cupos disponibles"},
		{Code: "request_confirmed_admin", Name: "Reserva confirmada (aviso a admin)", Title: "Reserva confirmada",
			Message: "La reserva {{pasajero}} (pedido {{pedido_id}}) fue confirmada"},
		{Code: "request_confirmed_user", Name: "Reserva confirmada (aviso al usuario)", Title: "Tu reserva fue confirmada",
			Message: "Tu reserva del pedido {{pedido_id}} fue confirmada"},
		{Code: "reservation_deleted", Name: "Reserva eliminada", Title: "Reserva eliminada",
			Message: "Se eliminó la reserva del pedido {{pedido_id}} y se liberó el cupo"},
		{Code: "passenger_deleted", Name: "Pasajero eliminado", Title: "Pasajero eliminado",
			Message: "Se eliminó a {{nombre}} {{apellido}} del pedido {{pedido_id}} y se liberó su lugar"},
		{Code: "cancellation_pending", Name: "Solicitud de cancelación pendiente", Title: "Solicitud de cancelación pendiente",
			Message: "La reserva del pedido {{pedido_id}} tiene una solicitud de cancelación pendiente de revisión"},
		{Code: "passenger_duplicated", Name: "Pasajero duplicado", Title: "Pasajero duplicado",
			Message: "Se agregó un pasajero duplicado de {{nombre}} {{apellido}} al pedido {{pedido_id}}"},
		{Code: "passenger_added", Name: "Pasajero agregado", Title: "Pasajero agregado",
			Message: "Se agregó un nuevo pasajero al pedido {{pedido_id}}"},
		{Code: "new_product", Name: "Nuevo producto disponible", Title: "Nuevo producto disponible",
			Message: "Se agregó el producto {{codigo_cupo}} hacia {{destino}} ({{compania}})"},
		{Code: "new_product_bulk", Name: "Nuevos productos disponibles (carga masiva)", Title: "Nuevos productos disponibles",
			Message: "Se agregaron {{cantidad}} productos nuevos a disponibilidad"},
		{Code: "reservation_expiring_soon", Name: "Reserva por vencer", Title: "Tu reserva está por vencer",
			Message: "La reserva del pedido {{pedido_id}} vence en menos de {{minutos}} minutos. Confirmala o el cupo se liberará automáticamente."},
		{Code: "reservation_expired_user", Name: "Reserva expirada (aviso al usuario)", Title: "Tu reserva expiró",
			Message: "La reserva del pedido {{pedido_id}} expiró por vencimiento del bloqueo temporal y el cupo fue liberado."},
		{Code: "reservation_expired_admin", Name: "Reserva expirada (aviso a admin)", Title: "Reserva expirada",
			Message: "La reserva del pedido {{pedido_id}} (agencia {{agencia}}) expiró automáticamente por vencimiento de bloqueo"},
		{Code: "transfer_received", Name: "Cesión recibida", Title: "Recibiste una cesión de disponibilidad",
			Message: "La agencia {{agencia_origen}} te cedió {{cantidad}} cupos del producto {{codigo_cupo}} hacia {{destino}}"},
		{Code: "transfer_new_between_agencies", Name: "Nueva cesión entre agencias (aviso a admin)", Title: "Nueva cesión entre agencias",
			Message: "{{agencia_origen}} cedió {{cantidad}} cupos de {{codigo_cupo}} a {{agencia_destino}}"},
	}

	for _, tpl := range defaults {
		var count int64
		db.Model(&models.NotificationTemplate{}).Where("code = ? AND agency_id IS NULL", tpl.Code).Count(&count)
		if count == 0 {
			db.Create(&tpl)
		}
	}
}

// runSQLMigrations executes raw SQL migration statements
func runSQLMigrations(db *gorm.DB) {
	// Create availability_transfers table
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS availability_transfers (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
		source_agency VARCHAR(255) NOT NULL,
		target_agency VARCHAR(255) NOT NULL,
		quantity INTEGER NOT NULL CHECK (quantity > 0),
		created_by UUID NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT chk_different_agencies CHECK (source_agency != target_agency)
	);
	`
	if err := db.Exec(createTableSQL).Error; err != nil {
		log.Println("WARNING: Could not create availability_transfers table:", err)
	} else {
		fmt.Println("Migration applied: availability_transfers table ensured")
	}

	// Create product_shared_agencies table (red de seguridad — igual que
	// availability_transfers arriba, AutoMigrate no siempre alcanza en prod)
	createSharedAgenciesSQL := `
	CREATE TABLE IF NOT EXISTS product_shared_agencies (
		id SERIAL PRIMARY KEY,
		product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
		agencia VARCHAR(255) NOT NULL,
		created_by UUID,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT idx_product_shared_agency UNIQUE (product_id, agencia)
	);
	`
	if err := db.Exec(createSharedAgenciesSQL).Error; err != nil {
		log.Println("WARNING: Could not create product_shared_agencies table:", err)
	} else {
		fmt.Println("Migration applied: product_shared_agencies table ensured")
	}

	// Check if migration file exists and apply additional constraints
	if _, err := os.Stat("migrations/001_create_availability_transfers.sql"); err == nil {
		migrationSQL, err := os.ReadFile("migrations/001_create_availability_transfers.sql")
		if err != nil {
			log.Println("WARNING: Could not read migration file:", err)
		} else {
			if err := db.Exec(string(migrationSQL)).Error; err != nil {
				log.Println("WARNING: Migration file execution error:", err)
			} else {
				fmt.Println("Migration file applied successfully")
			}
		}
	}

	// Add columns to tables (if they don't exist, ALTER ignores it)
	colSQLs := []string{
		`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES availability_transfers(id) ON DELETE SET NULL;`,
		`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS original_agency VARCHAR(255);`,
		`ALTER TABLE agencies ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';`,
		// White-label: columna config JSONB para almacenar toda la configuración anidada
		`ALTER TABLE white_label_configs ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';`,
		// Índice único por agencia (puede ya existir si AutoMigrate lo creó)
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_white_label_configs_agency_id ON white_label_configs(agency_id);`,
		// Email config: agency_id nullable para permitir config global sin agencia
		`ALTER TABLE email_smtp_configs ALTER COLUMN agency_id DROP NOT NULL;`,
		// Profile.Password nunca debió persistirse (ahora es gorm:"-"): se
		`ALTER TABLE profiles DROP COLUMN IF EXISTS password;`,
		// Fix foreign key to have ON DELETE CASCADE for availability_transfers -> products
		`ALTER TABLE availability_transfers DROP CONSTRAINT IF EXISTS fk_availability_transfers_product;`,
		`ALTER TABLE availability_transfers ADD CONSTRAINT fk_availability_transfers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;`,
		// Fix boolean columns: set DEFAULT false y actualizar NULLs existentes a false
		// (estas columnas se crearon sin DEFAULT y quedan en NULL cuando el form envía false)
		`ALTER TABLE products ALTER COLUMN carryon SET DEFAULT false;`,
		`ALTER TABLE products ALTER COLUMN handbag SET DEFAULT false;`,
		`ALTER TABLE products ALTER COLUMN checkedbag SET DEFAULT false;`,
		`UPDATE products SET carryon = false WHERE carryon IS NULL;`,
		`UPDATE products SET handbag = false WHERE handbag IS NULL;`,
		`UPDATE products SET checkedbag = false WHERE checkedbag IS NULL;`,
		// Servicio (texto libre) y notas internas/externas de producto
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS servicio TEXT DEFAULT '';`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS notas_externas TEXT DEFAULT '';`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS notas_internas TEXT DEFAULT '';`,
		// passengers.neto_1/precio_venta: existen en el modelo hace tiempo pero
		// nunca quedaron creadas en la tabla real (AutoMigrate no las agregó),
		// causando "column neto_1 does not exist" al editar un pasajero.
		`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS neto_1 numeric DEFAULT 0;`,
		`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS precio_venta numeric DEFAULT 0;`,
	}
	for _, sql := range colSQLs {
		if err := db.Exec(sql).Error; err != nil {
			log.Println("WARNING: Column alteration error:", err)
		}
	}
	fmt.Println("Migration applied: all columns ensured")

	dropAgencyForeignKeys(db)
}

// dropAgencyForeignKeys revierte las FK duras profiles.agencia/reservations.agencia
// -> agencies.code que se habían agregado como "best-effort". El problema: una vez
// que la constraint lograba aplicarse, cualquier INSERT con agencia vacía (ej. una
// reserva creada por un admin, que no fuerza agencia) o con un valor que no matcheara
// exactamente un agencies.code quedaba rechazado a nivel de base de datos con un 500
// genérico ("Error al crear la reserva"), sin que el error real (FK violation) llegue
// a verse. La integridad de agencia queda a cargo de los <select> del frontend, igual
// que el resto del sistema (que ya matchea code/name de forma laxa donde corresponde).
func dropAgencyForeignKeys(db *gorm.DB) {
	fkSQLs := []string{
		`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_agencia;`,
		`ALTER TABLE reservations DROP CONSTRAINT IF EXISTS fk_reservations_agencia;`,
	}
	for _, sql := range fkSQLs {
		if err := db.Exec(sql).Error; err != nil {
			log.Println("WARNING: No se pudo quitar FK de agencia:", err)
		}
	}
}
