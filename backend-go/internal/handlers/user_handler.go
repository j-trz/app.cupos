package handlers

import (
	"net/http"
	"os"
	"time"

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
	if err := database.DB.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el usuario."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "user": profile})
}
