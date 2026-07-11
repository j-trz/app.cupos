package api

import (
	"net/http"
	"os"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/handlers"
	"backend-go/pkg/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var router *gin.Engine

func init() {
	godotenv.Load()
	database.InitDB()

	gin.SetMode(gin.ReleaseMode)
	router = gin.New()
	router.RedirectTrailingSlash = false
	router.Use(gin.Recovery())
	router.Use(middleware.RequestLogger())

	// Configuración CORS dinámica desde variable de entorno
	frontendURL := os.Getenv("URL_FRONTEND")
	if frontendURL == "" {
		frontendURL = "https://app-cupos-8uxo.vercel.app/"
	}

	router.Use(func(c *gin.Context) {
		clientOrigin := c.GetHeader("Origin")
		normalizedClient := strings.TrimRight(clientOrigin, "/")

		allowedOrigins := []string{
			strings.TrimRight(frontendURL, "/"),
			"localhost:5173",
			"localhost:3000",
		}

		var allowed bool
		for _, origin := range allowedOrigins {
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

		if allowed || clientOrigin == "" {
			c.Header("Access-Control-Allow-Origin", clientOrigin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			c.Header("Access-Control-Max-Age", "86400")

			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
		}

		c.Next()
	})

	// Rutas
	api := router.Group("/api")
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
			protected.PUT("/auth/profile", handlers.UpdateMyProfile)

			// Productos
			products := protected.Group("/products")
			{
				products.GET("", handlers.GetProducts)
				products.GET("/:id", handlers.GetProductByID)
				products.POST("", middleware.RequirePermission("PRODUCTS_CREATE"), handlers.CreateProduct)
				products.PUT("/:id", middleware.RequirePermission("PRODUCTS_UPDATE"), handlers.UpdateProduct)
				products.DELETE("/:id", middleware.RequirePermission("PRODUCTS_DELETE"), handlers.DeleteProduct)
				products.POST("/bulk", middleware.RequirePermission("PRODUCTS_CREATE"), handlers.BulkCreateProducts)
				products.GET("/:id/shared-agencies", handlers.ListSharedAgencies)
				products.POST("/:id/shared-agencies", handlers.ShareProduct)
				products.DELETE("/:id/shared-agencies/:agencia", handlers.UnshareProduct)
			}

			// Reservas (Ordenes)
			orders := protected.Group("/orders")
			{
				orders.GET("", handlers.GetAllReservations)
				orders.GET("/blocked", handlers.GetBlockedReservations)
				orders.POST("", handlers.CreateReservation)
				orders.GET("/:id", handlers.GetReservationByID)
				orders.PUT("/:id", handlers.UpdateReservation)
				orders.PUT("/:id/doc-contable", handlers.AddDocContable)
				orders.PUT("/:id/cancel-request", handlers.RequestCancellation)
				orders.PUT("/:id/cancel-request/resolve", middleware.RequirePermission("RESERVATIONS_DELETE"), handlers.ResolveCancellation)
				orders.POST("/:id/confirm", handlers.ConfirmReservation)
				orders.PUT("/:id/passengers/:passengerId", handlers.UpdatePassengerTicket)
				orders.PUT("/:id/passengers/:passengerId/full", handlers.UpdatePassenger)
				orders.POST("/:id/passengers", handlers.AddPassenger)
				orders.POST("/:id/passengers/:passengerId/duplicate", handlers.DuplicatePassenger)
				orders.DELETE("/:id/passengers/:passengerId", handlers.DeletePassenger)
				orders.DELETE("/:id", middleware.RequirePermission("RESERVATIONS_DELETE"), handlers.DeleteReservation)
			}

			// Mis permisos resueltos (cualquier usuario autenticado, no solo admin —
			// se registra sobre "protected" y no sobre el grupo "/users" de abajo
			// para no heredar su middleware.AdminOnly()).
			protected.GET("/users/me/permissions", handlers.GetMyPermissions)

			// Usuarios
			users := protected.Group("/users")
			{
				users.GET("", middleware.RequirePermission("USERS_VIEW"), handlers.ListUsers)
				users.GET("/:id", middleware.RequirePermission("USERS_VIEW"), handlers.GetUserById)
				users.POST("", middleware.RequirePermission("USERS_CREATE"), handlers.CreateUser)
				users.PUT("/:id", middleware.RequirePermission("USERS_UPDATE"), handlers.UpdateUser)
				users.DELETE("/:id", middleware.RequirePermission("USERS_DELETE"), handlers.DeleteUser)
				users.PUT("/:id/status", middleware.RequirePermission("USERS_UNLOCK"), handlers.ToggleUserStatus)
			}

			// Reportes
			reports := protected.Group("/reports")
			reports.Use(middleware.RequirePermission("REPORTS_VIEW"))
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
			// Métricas personales para usuarios regulares
			protected.GET("/reports/user-metrics", handlers.GetUserMetrics)

			// Ajustes
			settings := protected.Group("/settings")
			{
				settings.GET("", middleware.RequirePermission("SETTINGS_VIEW"), handlers.ListSettings)
				settings.PUT("/:key", middleware.RequirePermission("SETTINGS_UPDATE"), handlers.UpdateSetting)
			}

			// Backup
			protected.GET("/backup", middleware.RequirePermission("BACKUP_VIEW"), handlers.GetBackup)

			// Exportación
			protected.GET("/export/csv/:entityType", handlers.ExportCSV)

			// IA
			ai := protected.Group("/ai")
			{
				ai.POST("/chat", handlers.Chat)
				ai.GET("/providers", middleware.RequirePermission("AI_VIEW"), handlers.ListAIProviders)
				ai.POST("/providers", middleware.RequirePermission("AI_UPDATE"), handlers.CreateAIProvider)
				ai.PUT("/providers/:id", middleware.RequirePermission("AI_UPDATE"), handlers.UpdateAIProvider)
				ai.DELETE("/providers/:id", middleware.RequirePermission("AI_UPDATE"), handlers.DeleteAIProvider)
				ai.POST("/providers/:id/test", middleware.RequirePermission("AI_UPDATE"), handlers.TestAIProvider)
				ai.GET("/sessions", handlers.ListAISessions)
				ai.GET("/sessions/:id/messages", handlers.GetSessionMessages)
				ai.DELETE("/sessions/:id", handlers.DeleteSession)
				ai.PUT("/sessions/:id/title", handlers.UpdateSessionTitle)
				ai.GET("/stats", middleware.RequirePermission("AI_VIEW"), handlers.GetAIStats)
				ai.GET("/logs", middleware.RequirePermission("AI_VIEW"), handlers.GetAILogs)
			}

			// CRUD Dinámico (Data)
			data := protected.Group("/data")
			{
				data.GET("", handlers.GetData)
				data.POST("", handlers.ExecuteCRUD)
				data.PUT("", handlers.ExecuteCRUD)
				data.DELETE("", handlers.ExecuteCRUD)
			}

			// Agencias
			agencies := protected.Group("/agencies")
			{
				agencies.GET("", handlers.ListAgencies)
				agencies.POST("", middleware.RequirePermission("AGENCIES_CREATE"), handlers.CreateAgency)
				agencies.PUT("/:id", middleware.RequirePermission("AGENCIES_UPDATE"), handlers.UpdateAgency)
				agencies.DELETE("/:id", middleware.RequirePermission("AGENCIES_DELETE"), handlers.DeleteAgency)
			}

			// White Label — agency_admin puede gestionar su propia agencia
			whiteLabel := protected.Group("/white-label")
			{
				whiteLabel.GET("/config", handlers.GetWhiteLabelConfig)
				whiteLabel.POST("/config", middleware.RequirePermission("WHITE_LABEL_UPDATE"), handlers.CreateWhiteLabelConfig)
				whiteLabel.PUT("/config/:id", middleware.RequirePermission("WHITE_LABEL_UPDATE"), handlers.UpdateWhiteLabelConfig)
				whiteLabel.DELETE("/config/:id", middleware.RequirePermission("WHITE_LABEL_UPDATE"), handlers.DeleteWhiteLabelConfig)
			}

			// RBAC - Roles
			roles := protected.Group("/roles")
			{
				roles.GET("", middleware.RequirePermission("ROLES_VIEW"), handlers.ListRoles)
				roles.GET("/:id", middleware.RequirePermission("ROLES_VIEW"), handlers.GetRoleById)
				roles.POST("", middleware.RequirePermission("ROLES_CREATE"), handlers.CreateRole)
				roles.PUT("/:id", middleware.RequirePermission("ROLES_UPDATE"), handlers.UpdateRole)
				roles.DELETE("/:id", middleware.RequirePermission("ROLES_DELETE"), handlers.DeleteRole)
				roles.GET("/:id/users", middleware.RequirePermission("ROLES_VIEW"), handlers.GetRoleUsers)
				roles.GET("/:id/permissions", middleware.RequirePermission("ROLES_VIEW"), handlers.GetRolePermissions)
				roles.POST("/:id/permissions", middleware.RequirePermission("ROLES_ASSIGN_PERMISSIONS"), handlers.AssignPermissionsToRole)
			}

			// RBAC - Permisos
			permissions := protected.Group("/permissions")
			{
				permissions.GET("", middleware.RequirePermission("PERMISSIONS_VIEW"), handlers.ListPermissions)
				permissions.GET("/:id", middleware.RequirePermission("PERMISSIONS_VIEW"), handlers.GetPermissionById)
				permissions.POST("", middleware.RequirePermission("PERMISSIONS_CREATE"), handlers.CreatePermission)
				permissions.PUT("/:id", middleware.RequirePermission("PERMISSIONS_UPDATE"), handlers.UpdatePermission)
				permissions.DELETE("/:id", middleware.RequirePermission("PERMISSIONS_DELETE"), handlers.DeletePermission)
			}

			// RBAC - User Roles
			protected.POST("/user-roles", middleware.RequirePermission("ROLES_ASSIGN_PERMISSIONS"), handlers.AssignRoleToUser)

			// Notificaciones
			notifications := protected.Group("/notifications")
			{
				notifications.GET("", handlers.GetNotifications)
				notifications.GET("/unread-count", handlers.GetUnreadCount)
				notifications.PUT("/read-all", handlers.MarkAllNotificationsRead)
				notifications.PUT("/:id/read", handlers.MarkNotificationRead)
				notifications.PUT("/:id/hide", handlers.HideNotification)
				notifications.POST("", middleware.RequirePermission("NOTIFICATIONS_CREATE"), handlers.CreateNotification)
				notifications.DELETE("/:id", middleware.RequirePermission("NOTIFICATIONS_DELETE"), handlers.DeleteNotification)
			}

			// Cesión de disponibilidad (Transfers)
			transfers := protected.Group("/transfers")
			{
				transfers.GET("", handlers.GetUserTransfers)
				// Ceder y recuperar cupos es una operación exclusiva de administración:
				// no requiere autorización de la agencia afectada ni pasa por
				// solicitudes, así que solo quien tenga el permiso puede ejecutarla.
				transfers.POST("", middleware.RequirePermission("TRANSFERS_CREATE"), handlers.CreateTransfer)
				transfers.POST("/:id/reclaim", middleware.RequirePermission("TRANSFERS_CREATE"), handlers.ReclaimTransfer)
			}
			// Lista completa
			protected.GET("/transfers/all", middleware.RequirePermission("TRANSFERS_VIEW"), handlers.ListTransfers)

			// Logs del sitio
			protected.GET("/logs", middleware.RequirePermission("LOGS_VIEW"), handlers.GetSystemLogs)

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
}

// Handler es el punto de entrada para Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	router.ServeHTTP(w, r)
}
