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
		frontendURL = "https://app-cupos-frontend.vercel.app"
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
				products.POST("", middleware.AdminOnly(), handlers.CreateProduct)
				products.POST("/bulk", middleware.AdminOnly(), handlers.BulkCreateProducts)
			}

			// Reservas (Ordenes)
			orders := protected.Group("/orders")
			{
				orders.GET("", handlers.GetAllReservations)
				orders.POST("", handlers.CreateReservation)
				orders.GET("/:id", handlers.GetReservationByID)
				orders.PUT("/:id", handlers.UpdateReservation)
				orders.PUT("/:id/doc-contable", handlers.AddDocContable)
				orders.PUT("/:id/cancel-request", handlers.RequestCancellation)
				orders.POST("/:id/confirm", handlers.ConfirmReservation)
				orders.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteReservation)
			}

			// Usuarios
			users := protected.Group("/users")
			users.Use(middleware.AdminOnly())
			{
				users.GET("", handlers.ListUsers)
				users.GET("/:id", handlers.GetUserById)
				users.POST("", handlers.CreateUser)
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
			}
			// Métricas personales para usuarios regulares
			protected.GET("/reports/user-metrics", handlers.GetUserMetrics)

			// Ajustes
			settings := protected.Group("/settings")
			settings.Use(middleware.AdminOnly())
			{
				settings.GET("", handlers.ListSettings)
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
				ai.POST("/providers", middleware.AdminOnly(), handlers.CreateAIProvider)
				ai.PUT("/providers/:id", middleware.AdminOnly(), handlers.UpdateAIProvider)
				ai.DELETE("/providers/:id", middleware.AdminOnly(), handlers.DeleteAIProvider)
				ai.POST("/providers/:id/test", middleware.AdminOnly(), handlers.TestAIProvider)
				ai.GET("/actions", handlers.ListAIActions)
				ai.POST("/actions", middleware.AdminOnly(), handlers.CreateAIAction)
				ai.PUT("/actions/:id", middleware.AdminOnly(), handlers.UpdateAIAction)
				ai.DELETE("/actions/:id", middleware.AdminOnly(), handlers.DeleteAIAction)
				ai.GET("/sessions", handlers.ListAISessions)
				ai.GET("/stats", handlers.GetAIStats)
				ai.GET("/logs", handlers.GetAILogs)
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
				agencies.POST("", middleware.AdminOnly(), handlers.CreateAgency)
				agencies.PUT("/:id", middleware.AdminOnly(), handlers.UpdateAgency)
				agencies.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteAgency)
			}

			// White Label — agency_admin puede gestionar su propia agencia
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
				roles.GET("", handlers.ListRoles)
				roles.GET("/:id", handlers.GetRoleById)
				roles.POST("", handlers.CreateRole)
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
				permissions.GET("", handlers.ListPermissions)
				permissions.GET("/:id", handlers.GetPermissionById)
				permissions.POST("", handlers.CreatePermission)
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
				transfers.POST("", handlers.CreateTransfer)
			}
			// Lista completa solo para admin
			protected.GET("/transfers/all", middleware.AdminOnly(), handlers.ListTransfers)

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
		}
	}
}

// Handler es el punto de entrada para Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	router.ServeHTTP(w, r)
}
