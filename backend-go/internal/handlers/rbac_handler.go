package handlers

import (
	"net/http"

	"backend-go/internal/database"
	"backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func ListRoles(c *gin.Context) {
	var roles []models.Role
	database.DB.Find(&roles)
	c.JSON(http.StatusOK, roles)
}

func ListPermissions(c *gin.Context) {
	var permissions []models.Permission
	database.DB.Find(&permissions)
	c.JSON(http.StatusOK, permissions)
}

func AssignRoleToUser(c *gin.Context) {
	var userRole models.UserRole
	if err := c.ShouldBindJSON(&userRole); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&userRole)
	c.JSON(http.StatusCreated, userRole)
}
