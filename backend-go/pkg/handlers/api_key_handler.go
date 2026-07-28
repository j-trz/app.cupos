package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// HashAPIKey calcula la huella digital SHA-256 de una clave secreta.
func HashAPIKey(rawKey string) string {
	hash := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(hash[:])
}

// GenerateSecretKey produce una clave criptográfica de 32 bytes con prefijo.
func GenerateSecretKey() (rawKey string, prefix string, keyHash string, err error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", "", err
	}
	hexStr := hex.EncodeToString(bytes) // 48 chars
	prefix = fmt.Sprintf("cupo_live_sk_%s...", hexStr[:6])
	rawKey = fmt.Sprintf("cupo_live_sk_%s", hexStr)
	keyHash = HashAPIKey(rawKey)
	return rawKey, prefix, keyHash, nil
}

// CreateAPIKeyHandler genera una nueva API Key para integraciones externas.
func CreateAPIKeyHandler(c *gin.Context) {
	var req models.CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nombre de API Key requerido"})
		return
	}

	userIDRaw, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	userID, ok := userIDRaw.(uuid.UUID)
	if !ok {
		if userIDStr, isStr := userIDRaw.(string); isStr {
			parsedID, err := uuid.Parse(userIDStr)
			if err == nil {
				userID = parsedID
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "ID de usuario no válido"})
				return
			}
		}
	}

	roleRaw, _ := c.Get("role")
	roleStr, _ := roleRaw.(string)

	targetAgencyID := req.AgencyID

	// Para agency_admin u otros roles no-admin global, forzar la agencia propia obligatoriamente
	if roleStr != "admin" {
		agenciaVal, _ := c.Get("agencia")
		agenciaStr, _ := agenciaVal.(string)
		if agenciaStr != "" {
			var callerAgency models.Agency
			if err := database.DB.Where("LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)", agenciaStr, agenciaStr).First(&callerAgency).Error; err == nil {
				targetAgencyID = &callerAgency.ID
			}
		}

		if targetAgencyID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "No tenés asignada una agencia válida para crear API Keys."})
			return
		}
	}

	rawKey, prefix, keyHash, err := GenerateSecretKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar la clave secreta"})
		return
	}

	scopes := "*"
	if len(req.Scopes) > 0 {
		scopes = strings.Join(req.Scopes, ",")
	}

	apiKey := models.APIKey{
		Name:        strings.TrimSpace(req.Name),
		Prefix:      prefix,
		KeyHash:     keyHash,
		AgencyID:    targetAgencyID,
		CreatedByID: userID,
		Scopes:      scopes,
		IsActive:    true,
		ExpiresAt:   req.ExpiresAt,
	}

	if err := database.DB.Create(&apiKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar la API Key en la base de datos"})
		return
	}

	// Registrar en auditoría
	go func() {
		if database.DB != nil {
			database.DB.Create(&models.SystemLog{
				Level:   "info",
				Source:  "admin",
				Method:  "POST",
				Path:    "/api/api-keys",
				Message: fmt.Sprintf("API Key '%s' (%s) creada por %s", apiKey.Name, prefix, roleStr),
			})
		}
	}()

	res := models.CreateAPIKeyResponse{
		ID:        apiKey.ID,
		Name:      apiKey.Name,
		Prefix:    apiKey.Prefix,
		SecretKey: rawKey, // Se muestra UNA sola vez
		Scopes:    apiKey.Scopes,
		CreatedAt: apiKey.CreatedAt,
		ExpiresAt: apiKey.ExpiresAt,
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "API Key generada exitosamente",
		"data":    res,
	})
}

// ListAPIKeysHandler devuelve el listado de API Keys (filtrado por agencia para agency_admin).
func ListAPIKeysHandler(c *gin.Context) {
	roleRaw, _ := c.Get("role")
	roleStr, _ := roleRaw.(string)

	query := database.DB.Preload("Agency").Preload("CreatedBy").Order("created_at DESC")

	// Si no es super admin, limitar estrictamente a las llaves de su propia agencia
	if roleStr != "admin" {
		agenciaVal, _ := c.Get("agencia")
		agenciaStr, _ := agenciaVal.(string)
		var callerAgency models.Agency
		if err := database.DB.Where("LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)", agenciaStr, agenciaStr).First(&callerAgency).Error; err == nil {
			query = query.Where("agency_id = ?", callerAgency.ID)
		} else {
			query = query.Where("1 = 0")
		}
	}

	var keys []models.APIKey
	if err := query.Find(&keys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar las API Keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  keys,
		"count": len(keys),
	})
}

// RevokeAPIKeyHandler desactiva/elimina una API Key existente.
func RevokeAPIKeyHandler(c *gin.Context) {
	idParam := c.Param("id")
	keyID, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de API Key no válido"})
		return
	}

	roleRaw, _ := c.Get("role")
	roleStr, _ := roleRaw.(string)

	var key models.APIKey
	if err := database.DB.First(&key, "id = ?", keyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API Key no encontrada"})
		return
	}

	// Verificar pertenencia si no es admin global
	if roleStr != "admin" {
		agenciaVal, _ := c.Get("agencia")
		agenciaStr, _ := agenciaVal.(string)
		var callerAgency models.Agency
		if err := database.DB.Where("LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)", agenciaStr, agenciaStr).First(&callerAgency).Error; err == nil {
			if key.AgencyID == nil || *key.AgencyID != callerAgency.ID {
				c.JSON(http.StatusForbidden, gin.H{"error": "No tenés permiso para revocar esta API Key."})
				return
			}
		} else {
			c.JSON(http.StatusForbidden, gin.H{"error": "No tenés permiso para revocar esta API Key."})
			return
		}
	}

	key.IsActive = false
	if err := database.DB.Save(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al revocar la API Key"})
		return
	}

	// Log de auditoría
	go func() {
		if database.DB != nil {
			database.DB.Create(&models.SystemLog{
				Level:   "warning",
				Source:  "admin",
				Method:  "DELETE",
				Path:    "/api/api-keys/" + idParam,
				Message: fmt.Sprintf("API Key '%s' (%s) fue revocada por %s", key.Name, key.Prefix, roleStr),
			})
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "API Key revocada correctamente",
		"id":      key.ID,
	})
}
