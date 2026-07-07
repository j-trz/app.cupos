package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/pkg/errors"
	"gorm.io/gorm"

	"backend-go/internal/database"
	"backend-go/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email y password son requeridos."})
		return
	}

	// Simular la lógica de auth.users y public.profiles
	// Buscar el perfil (que ahora contiene el password encriptado para este propósito de migración)
	var profile models.Profile
	if err := database.DB.Where("email = ?", input.Email).First(&profile).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas."})
		return
	}

	// Verificar la contraseña
	if err := bcrypt.CompareHashAndPassword([]byte(profile.EncryptedPassword), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas."})
		return
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "fallback_secret_key"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":      profile.ID,
		"email":   profile.Email,
		"nombre":  profile.Nombre,
		"agencia": profile.Agencia,
		"role":    profile.Role,
		"admin":   profile.Admin,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar el token."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   tokenString,
		"user":    profile,
	})
}

func GetProfile(c *gin.Context) {
	userID, _ := c.Get("userID")
	var profile models.Profile
	if err := database.DB.Where("id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Perfil no encontrado."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "profile": profile})
}

func ListUsers(c *gin.Context) {
	var users []models.Profile
	database.DB.Find(&users)
	c.JSON(http.StatusOK, gin.H{"success": true, "users": users})
}

func CreateUser(c *gin.Context) {
	var profile models.Profile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile.ID = uuid.New()

	// Encriptar la contraseña si se proporciona
	if profile.EncryptedPassword != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(profile.EncryptedPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar la contraseña."})
			return
		}
		profile.EncryptedPassword = string(hashedPassword)
	}

	if err := database.DB.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el usuario."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "user": profile})
}

func Register(c *gin.Context) {
	var profile models.Profile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar si el email ya existe
	var existingProfile models.Profile
	err := database.DB.Where("email = ?", profile.Email).First(&existingProfile).Error
	if err == nil {
		// Email already exists
		c.JSON(http.StatusBadRequest, gin.H{"error": "El email ya está registrado."})
		return
	}
	// Check if there was an error other than record not found
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al verificar el email."})
		return
	}

	// Encriptar la contraseña
	if profile.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La contraseña es requerida."})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(profile.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al encriptar la contraseña."})
		return
	}
	profile.EncryptedPassword = string(hashedPassword)

	// Set default role and ensure no admin privileges
	profile.Role = "agency_user"
	profile.Admin = false // Explicitly set admin to false
	profile.ID = uuid.New()

	if err := database.DB.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el usuario."})
		return
	}

	// Generar token JWT para el nuevo usuario
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "fallback_secret_key"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":      profile.ID,
		"email":   profile.Email,
		"nombre":  profile.Nombre,
		"agencia": profile.Agencia,
		"role":    profile.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(), // Remove admin claim from token
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar el token."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"token":   tokenString,
		"user":    profile,
	})
}

func GetUserById(c *gin.Context) {
	id := c.Param("id")
	var profile models.Profile
	if err := database.DB.Where("id = ?", id).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "user": profile})
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var profile models.Profile
	if err := database.DB.Where("id = ?", id).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}

	var input models.Profile
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Actualizar campos
	database.DB.Model(&profile).Updates(map[string]interface{}{
		"nombre":  input.Nombre,
		"agencia": input.Agencia,
		"role":    input.Role,
		"admin":   input.Admin,
	})

	c.JSON(http.StatusOK, gin.H{"success": true, "user": profile})
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	var profile models.Profile
	if err := database.DB.Where("id = ?", id).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}

	if err := database.DB.Delete(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el usuario."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Usuario eliminado correctamente."})
}

func ToggleUserStatus(c *gin.Context) {
	id := c.Param("id")
	var profile models.Profile
	if err := database.DB.Where("id = ?", id).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}

	var input struct {
		Active bool `json:"active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Actualizar el estado del usuario (usamos admin como proxy por ahora)
	database.DB.Model(&profile).Update("admin", input.Active)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Estado actualizado."})
}
