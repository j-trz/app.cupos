package main

import (
	"log"
	"os"

	"backend-go/internal/database"
	"backend-go/internal/handlers"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	database.InitDB()

	r := gin.Default()

	api := r.Group("/api")
	{
		products := api.Group("/products")
		{
			products.GET("/", handlers.GetProducts)
			products.POST("/", handlers.CreateProduct)
			products.POST("/bulk", handlers.BulkCreateProducts)
		}

		reports := api.Group("/reports")
		{
			reports.GET("/stats", handlers.GetStats)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5002"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
