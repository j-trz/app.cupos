package services

import (
	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/google/uuid"
)

// GetUserPermissionCodes resuelve los códigos de permiso (MODULE_ACTION) que
// tiene asignados un usuario vía su(s) Role(s) en UserRole/RolePermission —
// misma consulta que middleware.RequirePermission, expuesta como helper para
// que el asistente IA (ai_handler.go) pueda contarle a un usuario exactamente
// qué puede/no puede hacer según su rol granular, no solo el tier grueso
// admin/agency_admin/user.
func GetUserPermissionCodes(userID uuid.UUID) []string {
	var codes []string
	database.DB.Table("user_roles").
		Joins("join role_permissions on role_permissions.role_id = user_roles.role_id").
		Joins("join permissions on permissions.id = role_permissions.permission_id").
		Where("user_roles.user_id = ? and permissions.is_active = true", userID).
		Distinct().
		Pluck("permissions.code", &codes)
	return codes
}

// GetUserPermissions es igual a GetUserPermissionCodes pero devuelve los
// permisos completos (con Name legible), para armar una lista humana en el
// prompt de la IA en vez de solo códigos.
func GetUserPermissions(userID uuid.UUID) []models.Permission {
	var perms []models.Permission
	database.DB.Table("permissions").
		Joins("join role_permissions on role_permissions.permission_id = permissions.id").
		Joins("join user_roles on user_roles.role_id = role_permissions.role_id").
		Where("user_roles.user_id = ? and permissions.is_active = true", userID).
		Distinct().
		Find(&perms)
	return perms
}
