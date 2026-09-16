package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/handlers"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKeyHeader := c.GetHeader("X-API-Key")
		authHeader := c.GetHeader("Authorization")

		// 1. Verificar si viene una API Key por X-API-Key o Bearer cupo_live_sk_
		rawAPIKey := ""
		if apiKeyHeader != "" {
			rawAPIKey = strings.TrimSpace(apiKeyHeader)
		} else if strings.HasPrefix(authHeader, "Bearer cupo_live_sk_") {
			rawAPIKey = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		}

		if rawAPIKey != "" {
			// Autenticación por API Key
			keyHash := handlers.HashAPIKey(rawAPIKey)
			var apiKey models.APIKey
			err := database.DB.Preload("Agency").Where("key_hash = ? AND is_active = true", keyHash).First(&apiKey).Error
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "API Key inválida, revocada o expirada."})
				c.Abort()
				return
			}

			// Verificar si expiró
			if apiKey.ExpiresAt != nil && apiKey.ExpiresAt.Before(time.Now()) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "La API Key ha expirado."})
				c.Abort()
				return
			}

			// Actualizar última fecha de uso asincrónicamente
			go func(keyID uuid.UUID) {
				now := time.Now()
				database.DB.Model(&models.APIKey{}).Where("id = ?", keyID).Update("last_used_at", now)
			}(apiKey.ID)

			// Inyectar contexto
			c.Set("userID", apiKey.CreatedByID)
			c.Set("authMethod", "api_key")
			c.Set("apiKeyID", apiKey.ID)
			c.Set("apiKeyName", apiKey.Name)

			if apiKey.AgencyID != nil && apiKey.Agency != nil {
				c.Set("agencyID", *apiKey.AgencyID)
				c.Set("agencia", apiKey.Agency.Name)
				c.Set("role", "agency_admin")
			} else {
				c.Set("role", "admin")
			}
			c.Set("userName", "API Key ("+apiKey.Name+")")

			c.Next()
			return
		}

		// 2. Fallback: Autenticación normal por JWT para sesión web
		if authHeader == "" {
			if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
				authHeader = "Bearer " + cookieToken
			} else if cookieToken, err := c.Cookie("access_token"); err == nil && cookieToken != "" {
				authHeader = "Bearer " + cookieToken
			} else if queryToken := c.Query("token"); queryToken != "" {
				authHeader = "Bearer " + queryToken
			}
		}

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado. Se requiere token Bearer o X-API-Key."})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "JWT_SECRET no configurado en el servidor."})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido o expirado."})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Claims inválidos."})
			c.Abort()
			return
		}

		// Adjuntar datos del usuario al contexto
		c.Set("userID", claims["id"])
		c.Set("role", claims["role"])
		c.Set("agencia", claims["agencia"])
		c.Set("admin", claims["admin"])
		if name, exists := claims["name"]; exists {
			c.Set("userName", name)
		} else if nombre, exists := claims["nombre"]; exists {
			c.Set("userName", nombre)
		}
		if email, exists := claims["email"]; exists {
			c.Set("userEmail", email)
		}

		c.Next()
	}
}

func RequirePermission(code string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role == "admin" {
			c.Next()
			return
		}

		userID, _ := c.Get("userID")
		var count int64
		// Verificar si el usuario tiene un rol que contenga este permiso
		// Esta consulta asume que las tablas están correctamente relacionadas
		err := database.DB.Table("user_roles").
			Joins("join role_permissions on role_permissions.role_id = user_roles.role_id").
			Joins("join permissions on permissions.id = role_permissions.permission_id").
			Where("user_roles.user_id = ? and permissions.code = ? and permissions.is_active = true", userID, code).
			Count(&count).Error

		if err != nil || count == 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Acceso prohibido. Permisos insuficientes.",
				"message": "Se requiere el permiso: " + code,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Acceso prohibido. Se requiere rol de administrador."})
			c.Abort()
			return
		}
		c.Next()
	}
}

func AgencyAdminOrAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" && role != "agency_admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Acceso prohibido. Permisos insuficientes."})
			c.Abort()
			return
		}
		c.Next()
	}
}
