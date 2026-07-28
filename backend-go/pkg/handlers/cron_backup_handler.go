package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"

	"github.com/gin-gonic/gin"
)

// CronBackup realiza la copia de seguridad automatizada de la base de datos.
// Protegido por el secreto X-Cron-Secret (sin JWT). Genera un backup JSON en
// la carpeta backups/ y mantiene la rotación de los últimos 30 archivos.
func CronBackup(c *gin.Context) {
	secret := os.Getenv("CRON_SECRET")
	headerSecret := c.GetHeader("X-Cron-Secret")
	paramSecret := c.Query("secret")

	if secret == "" || (headerSecret != secret && paramSecret != secret) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Se requiere cabecera X-Cron-Secret válida o ?secret="})
		return
	}

	pkg, totalRecords, err := BuildBackupDump()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar la base de datos para el backup automático"})
		return
	}

	nowStr := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("auto_backup_%s.json", nowStr)
	dir := ensureBackupsDir()
	filePath := filepath.Join(dir, filename)

	jsonBytes, err := json.MarshalIndent(pkg, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al formatear JSON de backup automático"})
		return
	}

	// Intentar escribir a disco local
	_ = os.WriteFile(filePath, jsonBytes, 0644)

	// Rotación automática: mantener solo los últimos 30 backups
	cleanupOldBackups(dir, 30)

	// Log de auditoría con origen "cron"
	go func() {
		if database.DB != nil {
			database.DB.Create(&models.SystemLog{
				Level:   "info",
				Source:  "cron",
				Method:  "GET",
				Path:    "/api/cron/backup",
				Message: fmt.Sprintf("Backup automático realizado con éxito (%s, %d registros)", filename, totalRecords),
				Details: fmt.Sprintf("Tamaño: %.2f KB, Tablas: %d", float64(len(jsonBytes))/1024.0, pkg.Meta.TablesCount),
			})
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":       "Backup automático completado exitosamente",
		"filename":      filename,
		"size_bytes":    len(jsonBytes),
		"total_records": totalRecords,
		"created_at":    pkg.Meta.CreatedAt,
	})
}

// cleanupOldBackups mantiene hasta maxKeep archivos de backup en el directorio dir.
func cleanupOldBackups(dir string, maxKeep int) {
	files, err := os.ReadDir(dir)
	if err != nil || len(files) <= maxKeep {
		return
	}

	type fileWithTime struct {
		name    string
		modTime time.Time
	}

	list := make([]fileWithTime, 0)
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		info, err := f.Info()
		if err != nil {
			continue
		}
		list = append(list, fileWithTime{name: f.Name(), modTime: info.ModTime()})
	}

	if len(list) <= maxKeep {
		return
	}

	// Ordenar más viejos primero para borrarlos
	sort.Slice(list, func(i, j int) bool {
		return list[i].modTime.Before(list[j].modTime)
	})

	toRemove := len(list) - maxKeep
	for i := 0; i < toRemove; i++ {
		_ = os.Remove(filepath.Join(dir, list[i].name))
	}
}
