package middleware

import (
	"net/http"
	"os"
	"strings"

	"backend-go/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado. Se requiere token Bearer."})
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
