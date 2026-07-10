package main

import (
	"log"
	"net/http"
	"os"

	"backend-go/database"
	"backend-go/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// CORSMiddleware sets up CORS headers and handles preflight requests.
func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := map[string]bool{
		"http://localhost:3001":   true,
		"http://127.0.0.1:3001":   true,
		"http://localhost:5173":   true,
		"http://127.0.0.1:5173":   true,
		"http://localhost:4173":   true,
		"http://127.0.0.1:4173":   true,
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" && allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		} else if origin != "" {
			// If not in our specific list but requested, allow with strict policy or fallback
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Access-Token, X-Refresh-Token, Cache-Control")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	// Load environment variables from .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize DB connection
	database.InitDB()

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Apply CORS middleware
	r.Use(CORSMiddleware())

	// Health check route
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "ok",
			"environment": os.Getenv("GIN_MODE"),
		})
	})

	// API Routes
	api := r.Group("/api")
	{
		api.GET("/fields", handlers.GetFieldsHandler)
		api.POST("/dashboard-data", handlers.DashboardDataHandler)
		api.POST("/evolucion-agencias", handlers.EvolucionAgenciasHandler)
		api.POST("/agencias-data", handlers.AgenciasDataHandler)
		api.POST("/detalle-destinos", handlers.DetalleDestinosHandler)
		api.POST("/destinos-compania", handlers.DestinosCompaniaHandler)
		api.POST("/evolucion-pasajeros", handlers.EvolucionPasajerosHandler)
		api.POST("/evolucion-por-cupo", handlers.EvolucionPorCupoHandler)
		api.POST("/share-por-cupo", handlers.SharePorCupoHandler)
		api.POST("/por-salida", handlers.PorSalidaHandler)
	}

	// Metrics endpoints
	metrics := r.Group("/metrics")
	{
		metrics.GET("/summary", handlers.MetricsSummaryHandler)
		metrics.GET("/by-destination", handlers.MetricsByDestinationHandler)
	}

	forecast := r.Group("/forecast")
	{
		forecast.GET("/sales", handlers.ForecastSalesHandler)
	}

	// Root simple endpoint
	r.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Backend Go API is running")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
