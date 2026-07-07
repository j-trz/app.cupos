package main

import (
	"log"
	"os"

	"backend-go/internal/database"
	"backend-go/internal/handlers"
	"backend-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	database.InitDB()

	r := gin.Default()

	api := r.Group("/api")
	{
		// Rutas públicas
		api.POST("/auth/login", handlers.Login)
		api.POST("/auth/register", handlers.Register)

		// Rutas protegidas
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/auth/profile", handlers.GetProfile)

			// Productos
			products := protected.Group("/products")
			{
				products.GET("/", handlers.GetProducts)
				products.POST("/", middleware.AdminOnly(), handlers.CreateProduct)
				products.POST("/bulk", middleware.AdminOnly(), handlers.BulkCreateProducts)
			}

			// Reservas (Ordenes)
			orders := protected.Group("/orders")
			{
				orders.GET("/", handlers.GetAllReservations)
				orders.POST("/", handlers.CreateReservation)
				orders.POST("/:id/confirm", middleware.AdminOnly(), handlers.ConfirmReservation)
				orders.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteReservation)
			}

			// Usuarios
			users := protected.Group("/users")
			users.Use(middleware.AdminOnly())
			{
				users.GET("/", handlers.ListUsers)
				users.GET("/:id", handlers.GetUserById)
				users.POST("/", handlers.CreateUser)
				users.PUT("/:id", handlers.UpdateUser)
				users.DELETE("/:id", handlers.DeleteUser)
				users.PUT("/:id/status", handlers.ToggleUserStatus)
			}

			// Reportes
			reports := protected.Group("/reports")
			{
				reports.GET("/stats", handlers.GetStats)
				reports.GET("/evolution", handlers.GetEvolutionPassengers)
				reports.GET("/agency-share", handlers.GetAgencyShare)
				reports.GET("/destinations-detail", handlers.GetDestinationsDetail)
			}

			// Ajustes
			settings := protected.Group("/settings")
			settings.Use(middleware.AdminOnly())
			{
				settings.GET("/", handlers.ListSettings)
				settings.PUT("/:key", handlers.UpdateSetting)
			}

			// Backup
			protected.GET("/backup", middleware.AdminOnly(), handlers.GetBackup)

			// Exportación
			protected.GET("/export/csv/:entityType", handlers.ExportCSV)

			// IA
			ai := protected.Group("/ai")
			{
				ai.POST("/chat", handlers.Chat)
				ai.GET("/providers", handlers.ListAIProviders)
			}

			// CRUD Dinámico (Data)
			data := protected.Group("/data")
			{
				data.GET("/", handlers.GetData)
				data.POST("/", handlers.ExecuteCRUD)
				data.PUT("/", handlers.ExecuteCRUD)
				data.DELETE("/", handlers.ExecuteCRUD)
			}

			// Agencias
			agencies := protected.Group("/agencies")
			{
				agencies.GET("/", handlers.ListAgencies)
				agencies.POST("/", middleware.AdminOnly(), handlers.CreateAgency)
			}

			// White Label
			whiteLabel := protected.Group("/white-label")
			{
				whiteLabel.GET("/config", handlers.GetWhiteLabelConfig)
				whiteLabel.PUT("/config/:id", handlers.UpdateWhiteLabelConfig)
			}

			// RBAC - Roles
			roles := protected.Group("/roles")
			roles.Use(middleware.AdminOnly())
			{
				roles.GET("/", handlers.ListRoles)
				roles.GET("/:id", handlers.GetRoleById)
				roles.POST("/", handlers.CreateRole)
				roles.PUT("/:id", handlers.UpdateRole)
				roles.DELETE("/:id", handlers.DeleteRole)
				roles.GET("/:id/users", handlers.GetRoleUsers)
				roles.GET("/:id/permissions", handlers.GetRolePermissions)
				roles.POST("/:id/permissions", handlers.AssignPermissionsToRole)
			}

			// RBAC - Permisos
			permissions := protected.Group("/permissions")
			permissions.Use(middleware.AdminOnly())
			{
				permissions.GET("/", handlers.ListPermissions)
				permissions.GET("/:id", handlers.GetPermissionById)
				permissions.POST("/", handlers.CreatePermission)
				permissions.PUT("/:id", handlers.UpdatePermission)
				permissions.DELETE("/:id", handlers.DeletePermission)
			}

			// RBAC - User Roles
			protected.POST("/user-roles", middleware.AdminOnly(), handlers.AssignRoleToUser)

			// SSE
			protected.GET("/sse", handlers.SSEHandler)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5002"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
