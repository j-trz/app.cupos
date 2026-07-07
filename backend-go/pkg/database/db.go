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
		&models.AIProvider{},
		&models.AIAction{},
		&models.AISession{},
		&models.AIMessage{},
	)

	// Run SQL migrations for columns/tables that need ALTER statements
	runSQLMigrations(db)

	DB = db
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

	// Add columns to reservations table (if they don't exist, ALTER ignores it)
	colSQLs := []string{
		`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES availability_transfers(id) ON DELETE SET NULL;`,
		`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS original_agency VARCHAR(255);`,
	}
	for _, sql := range colSQLs {
		if err := db.Exec(sql).Error; err != nil {
			log.Println("WARNING: Column alteration error:", err)
		}
	}
	fmt.Println("Migration applied: reservation columns ensured")
}
