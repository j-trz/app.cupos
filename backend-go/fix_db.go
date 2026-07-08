package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = db.Exec("ALTER TABLE availability_transfers DROP CONSTRAINT IF EXISTS fk_availability_transfers_product").Error
	if err != nil {
		log.Println("Error dropping constraint:", err)
	} else {
		fmt.Println("Dropped constraint")
	}

	err = db.Exec("ALTER TABLE availability_transfers ADD CONSTRAINT fk_availability_transfers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE").Error
	if err != nil {
		log.Println("Error adding constraint:", err)
	} else {
		fmt.Println("Added constraint with CASCADE")
	}
}
