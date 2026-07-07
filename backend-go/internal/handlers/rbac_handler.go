package handlers

import (
	"net/http"

	"backend-go/internal/database"
	"backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListRoles(c *gin.Context) {
	var roles []models.Role
	database.DB.Find(&roles)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": roles})
}

func GetRoleById(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.Where("id = ?", id).First(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rol no encontrado."})
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

	if err := database.DB.Delete(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el rol."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Rol eliminado correctamente."})
}

func GetRoleUsers(c *gin.Context) {
	roleId := c.Param("id")
	var users []models.Profile
	database.DB.Joins("JOIN user_roles ON user_roles.user_id = profiles.id").
		Where("user_roles.role_id = ?", roleId).
		Find(&users)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
}

func GetRolePermissions(c *gin.Context) {
	roleId := c.Param("id")
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

	// Eliminar permisos existentes
	database.DB.Where("role_id = ?", roleId).Delete(&models.RolePermission{})

	// Crear nuevos permisos
	for _, permissionId := range input.Permissions {
		rolePermission := models.RolePermission{
			RoleID:     roleId,
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

func AssignRoleToUser(c *gin.Context) {
	var userRole models.UserRole
	if err := c.ShouldBindJSON(&userRole); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userRole.ID = uuid.New()
	database.DB.Create(&userRole)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": userRole})
}
