package main

import (
	"log"
	"os"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/handlers"
	"backend-go/pkg/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	database.InitDB()

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestLogger())

	// Configuración CORS dinámica desde variable de entorno
	frontendURL := os.Getenv("URL_FRONTEND")
	if frontendURL == "" {
		frontendURL = "https://app-cupos-8uxo.vercel.app/"
	}

	r.Use(func(c *gin.Context) {
		clientOrigin := c.GetHeader("Origin")

		// Normalizar origen para comparar
		normalizedClient := strings.TrimRight(clientOrigin, "/")

		allowedOrigins := []string{
			strings.TrimRight(frontendURL, "/"),
			"localhost:5173",
			"localhost:3000",
		}

		var allowed bool
		for _, origin := range allowedOrigins {
			// Comparamos sin protocolo (http:// o https://)
			clientNoProto := strings.TrimPrefix(normalizedClient, "http://")
			clientNoProto = strings.TrimPrefix(clientNoProto, "https://")

			originNoProto := strings.TrimPrefix(origin, "http://")
			originNoProto = strings.TrimPrefix(originNoProto, "https://")
			originNoProto = strings.TrimRight(originNoProto, "/")

			if clientNoProto == originNoProto {
				allowed = true
				break
			}
		}

		// Permitir si está en lista blanca o si no hay origin (curl, postman)
		if allowed || clientOrigin == "" {
			c.Header("Access-Control-Allow-Origin", clientOrigin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			c.Header("Access-Control-Max-Age", "86400")

			// Preflight request
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
		}

		c.Next()
	})

	api := r.Group("/api")
	{
		// Rutas públicas
		api.POST("/auth/login", handlers.Login)
		api.POST("/auth/register", handlers.Register)

		// Cron externo (protegido por header X-Cron-Secret, no por JWT)
		api.GET("/cron/expire-reservations", handlers.ExpireReservations)

		// Rutas protegidas
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/auth/profile", handlers.GetProfile)

			// Productos
			products := protected.Group("/products")
			{
				products.GET("/", handlers.GetProducts)
				products.GET("/:id", handlers.GetProductByID)
				products.POST("/", middleware.AdminOnly(), handlers.CreateProduct)
				products.PUT("/:id", middleware.AdminOnly(), handlers.UpdateProduct)
				products.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteProduct)
				products.POST("/bulk", middleware.AdminOnly(), handlers.BulkCreateProducts)
				products.GET("/:id/shared-agencies", handlers.ListSharedAgencies)
				products.POST("/:id/shared-agencies", handlers.ShareProduct)
				products.DELETE("/:id/shared-agencies/:agencia", handlers.UnshareProduct)
			}

			// Reservas (Ordenes)
			orders := protected.Group("/orders")
			{
				orders.GET("/", handlers.GetAllReservations)
				orders.GET("/blocked", handlers.GetBlockedReservations)
				orders.POST("/", handlers.CreateReservation)
				orders.GET("/:id", handlers.GetReservationByID)
				orders.PUT("/:id", handlers.UpdateReservation)
				orders.PUT("/:id/doc-contable", handlers.AddDocContable)
				orders.PUT("/:id/cancel-request", handlers.RequestCancellation)
				orders.POST("/:id/confirm", handlers.ConfirmReservation)
				orders.PUT("/:id/passengers/:passengerId", handlers.UpdatePassengerTicket)
				orders.PUT("/:id/passengers/:passengerId/full", handlers.UpdatePassenger)
				orders.POST("/:id/passengers", handlers.AddPassenger)
				orders.POST("/:id/passengers/:passengerId/duplicate", handlers.DuplicatePassenger)
				orders.DELETE("/:id/passengers/:passengerId", handlers.DeletePassenger)
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

			// Reportes (solo admin y agency_admin)
			reports := protected.Group("/reports")
			reports.Use(middleware.AgencyAdminOrAdmin())
			{
				reports.GET("/stats", handlers.GetStats)
				reports.GET("/evolution", handlers.GetEvolutionPassengers)
				reports.GET("/agency-share", handlers.GetAgencyShare)
				reports.GET("/destinations-detail", handlers.GetDestinationsDetail)
				// Nuevos endpoints del dashboard profesional
				reports.GET("/evolution-revenue", handlers.GetEvolutionRevenue)
				reports.GET("/occupancy", handlers.GetOccupancy)
				reports.GET("/top-products", handlers.GetTopProducts)
				reports.GET("/risk-alerts", handlers.GetRiskAlerts)
				reports.GET("/cancellations", handlers.GetCancellations)

				// Endpoints de backend-report (compatibilidad legacy)
				reports.GET("/fields", handlers.GetFieldsHandler)
				reports.POST("/dashboard-data", handlers.DashboardDataHandler)
				reports.POST("/evolucion-agencias", handlers.EvolucionAgenciasHandler)
				reports.POST("/agencias-data", handlers.AgenciasDataHandler)
				reports.POST("/detalle-destinos", handlers.DetalleDestinosHandler)
				reports.POST("/destinos-compania", handlers.DestinosCompaniaHandler)
				reports.POST("/evolucion-pasajeros", handlers.EvolucionPasajerosHandler)
				reports.POST("/evolucion-por-cupo", handlers.EvolucionPorCupoHandler)
				reports.POST("/share-por-cupo", handlers.SharePorCupoHandler)
				reports.POST("/por-salida", handlers.PorSalidaHandler)
				reports.GET("/metrics-summary", handlers.MetricsSummaryHandler)
				reports.GET("/metrics-by-destination", handlers.MetricsByDestinationHandler)
				reports.GET("/forecast-sales", handlers.ForecastSalesHandler)
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
				ai.GET("/providers", middleware.AdminOnly(), handlers.ListAIProviders)
				ai.POST("/providers", middleware.AdminOnly(), handlers.CreateAIProvider)
				ai.PUT("/providers/:id", middleware.AdminOnly(), handlers.UpdateAIProvider)
				ai.DELETE("/providers/:id", middleware.AdminOnly(), handlers.DeleteAIProvider)
				ai.POST("/providers/:id/test", middleware.AdminOnly(), handlers.TestAIProvider)
				ai.GET("/sessions", handlers.ListAISessions)
				ai.GET("/sessions/:id/messages", handlers.GetSessionMessages)
				ai.DELETE("/sessions/:id", handlers.DeleteSession)
				ai.PUT("/sessions/:id/title", handlers.UpdateSessionTitle)
				ai.GET("/stats", middleware.AdminOnly(), handlers.GetAIStats)
				ai.GET("/logs", middleware.AdminOnly(), handlers.GetAILogs)
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
				agencies.PUT("/:id", middleware.AdminOnly(), handlers.UpdateAgency)
				agencies.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteAgency)
			}

			// White Label
			whiteLabel := protected.Group("/white-label")
			{
				whiteLabel.GET("/config", handlers.GetWhiteLabelConfig)
				whiteLabel.POST("/config", middleware.AgencyAdminOrAdmin(), handlers.CreateWhiteLabelConfig)
				whiteLabel.PUT("/config/:id", middleware.AgencyAdminOrAdmin(), handlers.UpdateWhiteLabelConfig)
				whiteLabel.DELETE("/config/:id", middleware.AgencyAdminOrAdmin(), handlers.DeleteWhiteLabelConfig)
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

			// Notificaciones
			notifications := protected.Group("/notifications")
			{
				notifications.GET("", handlers.GetNotifications)
				notifications.GET("/unread-count", handlers.GetUnreadCount)
				notifications.PUT("/read-all", handlers.MarkAllNotificationsRead)
				notifications.PUT("/:id/read", handlers.MarkNotificationRead)
				notifications.PUT("/:id/hide", handlers.HideNotification)
				notifications.POST("", middleware.AdminOnly(), handlers.CreateNotification)
				notifications.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteNotification)
			}

			// Cesión de disponibilidad (Transfers)
			transfers := protected.Group("/transfers")
			{
				transfers.GET("", handlers.GetUserTransfers)
				// Ceder y recuperar cupos es una operación exclusiva de administración:
				// no requiere autorización de la agencia afectada ni pasa por
				// solicitudes, así que solo el admin puede ejecutarla.
				transfers.POST("", middleware.AdminOnly(), handlers.CreateTransfer)
				transfers.POST("/:id/reclaim", middleware.AdminOnly(), handlers.ReclaimTransfer)
			}
			protected.GET("/transfers/all", middleware.AdminOnly(), handlers.ListTransfers)

			// Backoffice (Importar Pasajeros)
			backoffice := protected.Group("/backoffice")
			{
				backoffice.GET("/importar-pasajeros", handlers.ImportarPasajeros)
			}

			// Logs del sitio (solo admin)
			protected.GET("/logs", middleware.AdminOnly(), handlers.GetSystemLogs)

			// Configuración de email (SMTP + plantillas) por agencia
			emailConfig := protected.Group("/email-config")
			{
				emailConfig.GET("/config", handlers.GetEmailConfig)
				emailConfig.POST("/config", handlers.CreateEmailConfig)
				emailConfig.PUT("/config/:id", handlers.UpdateEmailConfig)
				emailConfig.DELETE("/config/:id", handlers.DeleteEmailConfig)
				emailConfig.POST("/test", handlers.TestEmailConnection)
				emailConfig.POST("/send-test", handlers.SendTestEmail)
				emailConfig.GET("/templates", handlers.GetEmailTemplates)
				emailConfig.PUT("/templates/:id", handlers.UpdateEmailTemplate)
				emailConfig.GET("/templates/:id/preview", handlers.PreviewEmailTemplate)
			}

			// Plantillas de notificaciones in-app (campana), por agencia
			notificationConfig := protected.Group("/notification-config")
			{
				notificationConfig.GET("/templates", handlers.GetNotificationTemplates)
				notificationConfig.PUT("/templates/:id", handlers.UpdateNotificationTemplate)
				notificationConfig.GET("/templates/:id/preview", handlers.PreviewNotificationTemplate)
			}
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5002"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
