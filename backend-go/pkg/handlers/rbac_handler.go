package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// resolveCallerAgencyID resuelve el ID de Agency del usuario autenticado a
// partir de su Profile.Agencia (código o nombre — ver
// services.FindAgencyByCodeOrName). Se usa para forzar el scoping de roles
// personalizados a la propia agencia de un agency_admin.
func resolveCallerAgencyID(c *gin.Context) (*uuid.UUID, error) {
	agenciaVal, _ := c.Get("agencia")
	agenciaStr, _ := agenciaVal.(string)
	if agenciaStr == "" {
		return nil, fmt.Errorf("tu usuario no tiene una agencia asociada")
	}
	agency, err := services.FindAgencyByCodeOrName(agenciaStr)
	if err != nil {
		return nil, fmt.Errorf("no se encontró la agencia %q", agenciaStr)
	}
	return &agency.ID, nil
}

// callerCanAccessRole: admin siempre puede; el resto solo si el rol es
// global (AgencyID nil) o pertenece a su propia agencia.
func callerCanAccessRole(c *gin.Context, role models.Role) bool {
	callerRole, _ := c.Get("role")
	if callerRole == "admin" {
		return true
	}
	if role.AgencyID == nil {
		return true
	}
	callerAgencyID, err := resolveCallerAgencyID(c)
	if err != nil {
		return false
	}
	return *callerAgencyID == *role.AgencyID
}

// ListRoles devuelve los roles globales/de sistema más los personalizados de
// la propia agencia del usuario. Un admin ve todos, sin filtrar.
func ListRoles(c *gin.Context) {
	role, _ := c.Get("role")
	query := database.DB.Model(&models.Role{})
	if role != "admin" {
		callerAgencyID, err := resolveCallerAgencyID(c)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": []models.Role{}})
			return
		}
		query = query.Where("agency_id IS NULL OR agency_id = ?", *callerAgencyID)
	}
	var roles []models.Role
	query.Find(&roles)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": roles})
}

func GetRoleById(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.Where("id = ?", id).First(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
		return
	}
	if !callerCanAccessRole(c, role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este rol."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": role})
}

func CreateRole(c *gin.Context) {
	var role models.Role
	if err := c.ShouldBindJSON(&role); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	role.ID = uuid.New()
	// Un rol de sistema solo se crea vía seed (db.go), nunca por API.
	role.IsSystem = false

	callerRole, _ := c.Get("role")
	if callerRole != "admin" {
		// Un agency_admin (o cualquier otro rol con ROLES_CREATE) siempre crea
		// el rol scopeado a su propia agencia — nunca global ni de otra agencia,
		// sin importar qué agency_id haya mandado el request.
		callerAgencyID, err := resolveCallerAgencyID(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		role.AgencyID = callerAgencyID
	}

	if err := database.DB.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el rol."})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": role})
}

func UpdateRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.Where("id = ?", id).First(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
		return
	}
	if !callerCanAccessRole(c, role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este rol."})
		return
	}

	var input models.Role
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&role).Updates(map[string]interface{}{
		"name":        input.Name,
		"description": input.Description,
		"is_active":   input.IsActive,
	})

	c.JSON(http.StatusOK, gin.H{"success": true, "data": role})
}

func DeleteRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.Where("id = ?", id).First(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
		return
	}

	if role.IsSystem {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se pueden eliminar roles del sistema."})
		return
	}
	if !callerCanAccessRole(c, role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este rol."})
		return
	}

	if err := database.DB.Delete(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el rol."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Rol eliminado correctamente."})
}

func GetRoleUsers(c *gin.Context) {
	roleId := c.Param("id")
	var role models.Role
	if err := database.DB.First(&role, "id = ?", roleId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
		return
	}
	if !callerCanAccessRole(c, role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este rol."})
		return
	}
	var users []models.Profile
	database.DB.Joins("JOIN user_roles ON user_roles.user_id = profiles.id").
		Where("user_roles.role_id = ?", roleId).
		Find(&users)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

func GetRolePermissions(c *gin.Context) {
	roleId := c.Param("id")
	var role models.Role
	if err := database.DB.First(&role, "id = ?", roleId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
		return
	}
	if !callerCanAccessRole(c, role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este rol."})
		return
	}
	var permissions []models.Permission
	database.DB.Table("permissions").
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Where("role_permissions.role_id = ?", roleId).
		Find(&permissions)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": permissions})
}

func AssignPermissionsToRole(c *gin.Context) {
	roleId := c.Param("id")
	var input struct {
		Permissions []uuid.UUID `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	roleUUID, err := uuid.Parse(roleId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de rol inválido."})
		return
	}

	var role models.Role
	if err := database.DB.First(&role, "id = ?", roleUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
		return
	}
	if !callerCanAccessRole(c, role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tenés acceso a este rol."})
		return
	}

	// Eliminar permisos existentes
	database.DB.Where("role_id = ?", roleId).Delete(&models.RolePermission{})

	// Crear nuevos permisos
	for _, permissionId := range input.Permissions {
		rolePermission := models.RolePermission{
			RoleID:       roleUUID,
			PermissionID: permissionId,
		}
		database.DB.Create(&rolePermission)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permisos actualizados."})
}

func ListPermissions(c *gin.Context) {
	var permissions []models.Permission
	database.DB.Find(&permissions)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": permissions})
}

func GetPermissionById(c *gin.Context) {
	id := c.Param("id")
	var permission models.Permission
	if err := database.DB.Where("id = ?", id).First(&permission).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permiso no encontrado."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": permission})
}

func CreatePermission(c *gin.Context) {
	var permission models.Permission
	if err := c.ShouldBindJSON(&permission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	permission.ID = uuid.New()
	if err := database.DB.Create(&permission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el permiso."})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": permission})
}

func UpdatePermission(c *gin.Context) {
	id := c.Param("id")
	var permission models.Permission
	if err := database.DB.Where("id = ?", id).First(&permission).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permiso no encontrado."})
		return
	}

	var input models.Permission
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&permission).Updates(map[string]interface{}{
		"name":        input.Name,
		"code":        input.Code,
		"module":      input.Module,
		"action":      input.Action,
		"description": input.Description,
		"is_active":   input.IsActive,
	})

	c.JSON(http.StatusOK, gin.H{"success": true, "data": permission})
}

func DeletePermission(c *gin.Context) {
	id := c.Param("id")
	var permission models.Permission
	if err := database.DB.Where("id = ?", id).First(&permission).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permiso no encontrado."})
		return
	}

	if err := database.DB.Delete(&permission).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el permiso."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permiso eliminado correctamente."})
}

// GetMyPermissions devuelve los códigos de permiso resueltos para el usuario
// autenticado (admin siempre tiene bypass total, igual que
// middleware.RequirePermission). El frontend la consume una sola vez después
// del login/al rehidratar sesión, para saber qué mostrar/habilitar sin
// repetir la lógica de permisos en el cliente.
func GetMyPermissions(c *gin.Context) {
	role, _ := c.Get("role")
	if role == "admin" {
		var allCodes []string
		database.DB.Model(&models.Permission{}).Where("is_active = true").Pluck("code", &allCodes)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": allCodes})
		return
	}

	userID, _ := c.Get("userID")
	var codes []string
	database.DB.Table("user_roles").
		Joins("join role_permissions on role_permissions.role_id = user_roles.role_id").
		Joins("join permissions on permissions.id = role_permissions.permission_id").
		Where("user_roles.user_id = ? and permissions.is_active = true", userID).
		Distinct().
		Pluck("permissions.code", &codes)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": codes})
}

// setUserRole reemplaza (no acumula) el rol asignado a userID — el producto
// expone "un rol por usuario" aunque el esquema UserRole soporte muchos a
// muchos. Valida que el rol sea global (AgencyID nil) o pertenezca a la misma
// agencia que userAgencia (comparando por código o nombre, igual de laxo que
// el resto del sistema — ver services.FindAgencyByCodeOrName), para que un
// agency_admin no pueda asignar el rol de otra agencia.
func setUserRole(userID uuid.UUID, roleID uuid.UUID, userAgencia string) error {
	var role models.Role
	if err := database.DB.First(&role, "id = ?", roleID).Error; err != nil {
		return fmt.Errorf("rol no encontrado")
	}
	if role.AgencyID != nil {
		var agency models.Agency
		if err := database.DB.First(&agency, "id = ?", *role.AgencyID).Error; err != nil {
			return fmt.Errorf("el rol pertenece a una agencia inválida")
		}
		if !strings.EqualFold(agency.Code, userAgencia) && !strings.EqualFold(agency.Name, userAgencia) {
			return fmt.Errorf("el rol pertenece a otra agencia")
		}
	}
	database.DB.Where("user_id = ?", userID).Delete(&models.UserRole{})
	return database.DB.Create(&models.UserRole{UserID: userID, RoleID: roleID}).Error
}

// AssignRoleToUser asigna (reemplazando cualquier rol previo) un rol a un
// usuario. Valida que el rol sea global o de la misma agencia que el usuario
// destino.
func AssignRoleToUser(c *gin.Context) {
	var input struct {
		UserID uuid.UUID `json:"user_id"`
		RoleID uuid.UUID `json:"role_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var targetUser models.Profile
	if err := database.DB.First(&targetUser, "id = ?", input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado."})
		return
	}

	if err := setUserRole(input.UserID, input.RoleID, targetUser.Agencia); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true})
}
