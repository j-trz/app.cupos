package database

import (
	"fmt"
	"log"
	"os"

	"backend-go/internal/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
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
		&models.Passenger{},
		&models.Agency{},
		&models.WhiteLabelConfig{},
		&models.SystemSetting{},
		&models.Notification{},
		&models.Permission{},
		&models.Role{},
		&models.UserRole{},
		&models.EmailSMTPConfig{},
		&models.AIProvider{},
	)

	DB = db
}
