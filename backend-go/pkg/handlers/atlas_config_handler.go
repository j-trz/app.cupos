package handlers

import (
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// resolveAgencyForAtlasConfig determina sobre qué agencia opera el usuario
// actual. Un admin puede pasar ?agency_id=<uuid> para gestionar otra agencia;
// el resto opera siempre sobre la suya (c.Get("agencia")). Mismo patrón que
// resolveAgencyForEmailConfig en email_config_handler.go.
func resolveAgencyForAtlasConfig(c *gin.Context) (agencyID *uuid.UUID, agencyCode string, err error) {
	role, _ := c.Get("role")
	if role == "admin" {
		if idStr := c.Query("agency_id"); idStr != "" {
			id, parseErr := uuid.Parse(idStr)
			if parseErr != nil {
				return nil, "", parseErr
			}
			var agency models.Agency
			if dbErr := database.DB.First(&agency, "id = ?", id).Error; dbErr != nil {
				return nil, "", dbErr
			}
			return &agency.ID, agency.Code, nil
		}
	}

	agenciaVal, _ := c.Get("agencia")
	agenciaCode, _ := agenciaVal.(string)
	if agenciaCode == "" {
		return nil, "", nil
	}

	agency, dbErr := services.FindAgencyByCodeOrName(agenciaCode)
	if dbErr != nil {
		return nil, agenciaCode, nil
	}
	return &agency.ID, agency.Code, nil
}

// resolveAtlasConfigForRequest resuelve la config de Atlas activa para el
// usuario que hace el request (agencia propia, o la de ?agency_id= si es
// admin), usada por los handlers de búsqueda/detalle de contacto.
func resolveAtlasConfigForRequest(c *gin.Context) (*models.AtlasConfig, error) {
	_, agencyCode, err := resolveAgencyForAtlasConfig(c)
	if err != nil {
		return nil, err
	}
	return services.ResolveAtlasConfig(agencyCode)
}

func GetAtlasConfig(c *gin.Context) {
	agencyID, agencyCode, err := resolveAgencyForAtlasConfig(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cfg models.AtlasConfig
	var dbErr error
	if agencyID != nil {
		dbErr = database.DB.Where("agency_id = ?", *agencyID).First(&cfg).Error
	} else {
		dbErr = database.DB.Where("agency_id IS NULL").First(&cfg).Error
	}
	if dbErr == nil {
		cfg.Clave = "" // no se devuelve la clave al frontend una vez guardada
		c.JSON(http.StatusOK, gin.H{"config": cfg, "isDefault": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config": gin.H{
			"usuario": "", "clave": "", "empresa": "", "sucursal": "", "environment": "test",
		},
		"isDefault":  true,
		"agencyCode": agencyCode,
	})
}

func CreateAtlasConfig(c *gin.Context) {
	agencyID, _, err := resolveAgencyForAtlasConfig(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var input models.AtlasConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.ID = uuid.New()
	input.AgencyID = agencyID
	input.Clave = services.EncryptSecret(input.Clave)

	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo crear la configuración de Atlas"})
		return
	}
	input.Clave = ""
	c.JSON(http.StatusCreated, gin.H{"config": input})
}

func UpdateAtlasConfig(c *gin.Context) {
	id := c.Param("id")
	var cfg models.AtlasConfig
	if err := database.DB.First(&cfg, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuración no encontrada"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	delete(input, "id")
	delete(input, "agency_id")
	// La clave solo se actualiza si vino con contenido — así el frontend
	// puede reenviar el resto del formulario sin tener que resubmitear la
	// clave real (que nunca se devuelve en GetAtlasConfig). Si vino, se cifra
	// acá antes de guardar (ver services.EncryptSecret).
	if clave, ok := input["clave"].(string); ok {
		if clave == "" {
			delete(input, "clave")
		} else {
			input["clave"] = services.EncryptSecret(clave)
		}
	}

	if err := database.DB.Model(&cfg).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo actualizar la configuración"})
		return
	}
	database.DB.First(&cfg, "id = ?", id)
	cfg.Clave = ""
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

func DeleteAtlasConfig(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.AtlasConfig{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo eliminar la configuración"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// TestAtlasConnection godoc
// POST /api/atlas-config/test
// Prueba las credenciales de Atlas de la agencia actual (o las que vengan en
// el body, para poder probar antes de guardar) contra wscontactovendedorbuscar.
func TestAtlasConnectionHandler(c *gin.Context) {
	var input models.AtlasConfig
	hasBody := c.ShouldBindJSON(&input) == nil

	var cfg *models.AtlasConfig
	if hasBody && input.Usuario != "" && input.Clave != "" {
		cfg = &input
	} else {
		resolved, err := resolveAtlasConfigForRequest(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		cfg = resolved
	}

	if err := services.TestAtlasConnection(cfg); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
