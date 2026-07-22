package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/pkg/errors"
	"gorm.io/gorm"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// profileWithAIFlag agrega `ai_habilitado` (resuelto desde la agencia del
// perfil, no una columna propia de Profile) a la respuesta de Login/GetProfile
// — así el frontend sabe si debe mostrar el widget de chat sin depender de
// que la primera llamada a /ai/chat falle.
type profileWithAIFlag struct {
	models.Profile
	AIHabilitado bool `json:"ai_habilitado"`
}

func withAIFlag(profile models.Profile) profileWithAIFlag {
	return profileWithAIFlag{Profile: profile, AIHabilitado: services.ResolveAgencyAIHabilitado(profile.Agencia)}
}

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

	if !profile.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tu cuenta está inactiva. Contactá a un administrador."})
		return
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "fallback_secret_key"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       profile.ID,
		"email":    profile.Email,
		"nombre":   profile.Nombre,
		"apellido": profile.Apellido,
		"telefono": profile.Telefono,
		"agencia":  profile.Agencia,
		"role":     profile.Role,
		"admin":    profile.Admin,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar el token."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   tokenString,
		"user":    withAIFlag(profile),
	})
}

func GetProfile(c *gin.Context) {
	userID, _ := c.Get("userID")
	var profile models.Profile
	if err := database.DB.Where("id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Perfil no encontrado."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "profile": withAIFlag(profile)})
}

// UpdateMyProfile allows the authenticated user to update their own profile fields.
// Persists Nombre, Apellido and Telefono (all three are DB columns in the Profile model).
func UpdateMyProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var profile models.Profile
	if err := database.DB.First(&profile, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Perfil no encontrado."})
		return
	}

	var input struct {
		Nombre   string `json:"nombre"`
		Apellido string `json:"apellido"`
		Telefono string `json:"telefono"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Nombre != "" {
		updates["nombre"] = input.Nombre
	}

	if input.Apellido != "" {
		updates["apellido"] = input.Apellido
	}

	if input.Telefono != "" {
		updates["telefono"] = input.Telefono
	}

	if len(updates) > 0 {
		database.DB.Model(&profile).Updates(updates)
	}

	database.DB.First(&profile, "id = ?", userID)
	c.JSON(http.StatusOK, gin.H{"success": true, "profile": profile})
}

// UserWithRole agrega el rol granular (UserRole -> Role) resuelto a la
// respuesta de un usuario — sin esto, el frontend no tiene forma de mostrar
// ni de pre-seleccionar en el modal de edición el rol personalizado que se le
// asignó, y a simple vista "no queda guardado" aunque el UserRole sí se haya
// creado correctamente.
type UserWithRole struct {
	models.Profile
	RoleID   *uuid.UUID `json:"role_id,omitempty"`
	RoleName string     `json:"role_name,omitempty"`
}

func attachUserRoles(users []models.Profile) []UserWithRole {
	result := make([]UserWithRole, len(users))
	for i, u := range users {
		result[i] = UserWithRole{Profile: u}
		var ur models.UserRole
		if err := database.DB.Where("user_id = ?", u.ID).First(&ur).Error; err != nil {
			continue
		}
		roleID := ur.RoleID
		result[i].RoleID = &roleID
		var role models.Role
		if database.DB.First(&role, "id = ?", roleID).Error == nil {
			result[i].RoleName = role.Name
		}
	}
	return result
}

func ListUsers(c *gin.Context) {
	users := []models.Profile{}
	database.DB.Order("created_at desc").Find(&users)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": attachUserRoles(users)})
}

func CreateUser(c *gin.Context) {
	// RoleID viaja aparte de models.Profile (el rol granular vive en la tabla
	// UserRole, no en Profile) — se embebe Profile para bindear ambos campos
	// del mismo body sin pisar los json tags de Profile.
	var input struct {
		models.Profile
		RoleID *uuid.UUID `json:"role_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	profile := input.Profile

	// El campo bindeado desde JSON es Password (texto plano); EncryptedPassword
	// tiene json:"-" y nunca llega en el request, así que hashear ese campo
	// (como se hacía antes) dejaba la contraseña sin encriptar guardada.
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
	profile.Password = ""

	profile.ID = uuid.New()

	if err := database.DB.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el usuario."})
		return
	}

	if input.RoleID != nil {
		if err := setUserRole(profile.ID, *input.RoleID, profile.Agencia); err != nil {
			c.JSON(http.StatusCreated, gin.H{"success": true, "user": profile, "role_warning": err.Error()})
			return
		}
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

	// Struct dedicado (sin Password): models.Profile tiene Password con
	// binding:"required" pensado para el alta — bindear la edición directo
	// contra ese struct hacía fallar CADA actualización porque el formulario
	// de edición nunca manda password.
	// Todos los campos son punteros para poder distinguir "no vino en el
	// request" de "vino en false/''" — el formulario de edición hoy no manda
	// telefono ni admin, y con campos no-puntero esos valores se pisaban a
	// blanco/false en cada actualización aunque el usuario no los tocara.
	var input struct {
		Nombre   *string    `json:"nombre"`
		Apellido *string    `json:"apellido"`
		Telefono *string    `json:"telefono"`
		Agencia  *string    `json:"agencia"`
		Role     *string    `json:"role"`
		Admin    *bool      `json:"admin"`
		IsActive *bool      `json:"activo"`
		RoleID   *uuid.UUID `json:"role_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Actualizar solo los campos que vinieron en el request (map, no struct,
	// para que los booleans en false se graben igual — GORM's Updates con
	// struct ignora campos en su zero value).
	updates := map[string]interface{}{}
	if input.Nombre != nil {
		updates["nombre"] = *input.Nombre
	}
	if input.Apellido != nil {
		updates["apellido"] = *input.Apellido
	}
	if input.Telefono != nil {
		updates["telefono"] = *input.Telefono
	}
	if input.Agencia != nil {
		updates["agencia"] = *input.Agencia
	}
	if input.Role != nil {
		updates["role"] = *input.Role
	}
	if input.Admin != nil {
		updates["admin"] = *input.Admin
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if len(updates) > 0 {
		database.DB.Model(&profile).Updates(updates)
	}

	database.DB.First(&profile, "id = ?", id)

	if input.RoleID != nil {
		if err := setUserRole(profile.ID, *input.RoleID, profile.Agencia); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "user": profile, "role_warning": err.Error()})
			return
		}
	}

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

	database.DB.Model(&profile).Update("is_active", input.Active)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Estado actualizado."})
}
