package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ExportCSV(c *gin.Context) {
	entity := c.Param("entityType")
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment;filename=export_"+entity+".csv")
	c.String(http.StatusOK, "ID,Nombre,Email\n1,Prueba,test@example.com")
}
