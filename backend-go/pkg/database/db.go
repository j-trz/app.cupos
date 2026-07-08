package database

import (
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
		&models.SystemLog{},
		&models.AIProvider{},
		&models.AIAction{},
		&models.AISession{},
		&models.AIMessage{},
	)

	// Run SQL migrations for columns/tables that need ALTER statements
	runSQLMigrations(db)

	seedEmailTemplates(db)

	DB = db
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
