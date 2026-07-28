package handlers

import (
	"encoding/json"
	"fmt"
	"io"
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

// BackupMeta guarda metadatos del archivo de backup.
type BackupMeta struct {
	Version      string `json:"version"`
	CreatedAt    string `json:"created_at"`
	TotalRecords int    `json:"total_records"`
	Database     string `json:"database"`
	TablesCount  int    `json:"tables_count"`
}

// BackupPackage es la estructura completa del JSON del backup.
type BackupPackage struct {
	Meta   BackupMeta             `json:"meta"`
	Tables map[string]interface{} `json:"tables"`
}

// BackupFileInfo representa la info de un archivo de backup en disco.
type BackupFileInfo struct {
	Filename     string    `json:"filename"`
	SizeBytes    int64     `json:"size_bytes"`
	SizeFormatted string   `json:"size_formatted"`
	CreatedAt    time.Time `json:"created_at"`
	RecordCount  int       `json:"record_count,omitempty"`
}

const backupsDir = "backups"

func ensureBackupsDir() string {
	dir := backupsDir
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		_ = os.MkdirAll(dir, 0755)
	}
	return dir
}

// BuildBackupDump consulta todas las tablas principales y las serializa en un BackupPackage.
func BuildBackupDump() (*BackupPackage, int, error) {
	tables := make(map[string]interface{})
	totalRecords := 0

	// 1. Products
	var products []models.Product
	database.DB.Find(&products)
	tables["products"] = products
	totalRecords += len(products)

	// 2. Reservations
	var reservations []models.Reservation
	database.DB.Find(&reservations)
	tables["reservations"] = reservations
	totalRecords += len(reservations)

	// 3. Passengers
	var passengers []models.Passenger
	database.DB.Find(&passengers)
	tables["passengers"] = passengers
	totalRecords += len(passengers)

	// 4. Profiles / Usuarios
	var profiles []models.Profile
	database.DB.Find(&profiles)
	// Limpiar passwords por seguridad si es necesario, pero mantener EncryptedPassword
	tables["profiles"] = profiles
	totalRecords += len(profiles)

	// 5. Agencies
	var agencies []models.Agency
	database.DB.Find(&agencies)
	tables["agencies"] = agencies
	totalRecords += len(agencies)

	// 6. Roles
	var roles []models.Role
	database.DB.Find(&roles)
	tables["roles"] = roles
	totalRecords += len(roles)

	// 7. Permissions
	var permissions []models.Permission
	database.DB.Find(&permissions)
	tables["permissions"] = permissions
	totalRecords += len(permissions)

	// 8. RolePermissions
	var rolePermissions []models.RolePermission
	database.DB.Find(&rolePermissions)
	tables["role_permissions"] = rolePermissions
	totalRecords += len(rolePermissions)

	// 9. EmailSMTPConfig
	var emailConfigs []models.EmailSMTPConfig
	database.DB.Find(&emailConfigs)
	tables["email_smtp_configs"] = emailConfigs
	totalRecords += len(emailConfigs)

	// 10. EmailTemplate
	var emailTemplates []models.EmailTemplate
	database.DB.Find(&emailTemplates)
	tables["email_templates"] = emailTemplates
	totalRecords += len(emailTemplates)

	// 11. NotificationTemplate
	var notifTemplates []models.NotificationTemplate
	database.DB.Find(&notifTemplates)
	tables["notification_templates"] = notifTemplates
	totalRecords += len(notifTemplates)

	// 12. AIProvider
	var aiProviders []models.AIProvider
	database.DB.Find(&aiProviders)
	tables["ai_providers"] = aiProviders
	totalRecords += len(aiProviders)

	// 13. SystemLogs (últimos 2000 para no agigantar el archivo innecesariamente)
	var logs []models.SystemLog
	database.DB.Order("created_at desc").Limit(2000).Find(&logs)
	tables["system_logs"] = logs
	totalRecords += len(logs)

	pkg := &BackupPackage{
		Meta: BackupMeta{
			Version:      "1.0",
			CreatedAt:    time.Now().UTC().Format(time.RFC3339),
			TotalRecords: totalRecords,
			Database:     "postgresql",
			TablesCount:  len(tables),
		},
		Tables: tables,
	}

	return pkg, totalRecords, nil
}

// GenerateBackupHandler genera un backup JSON completo, lo guarda en disco y lo devuelve.
func GenerateBackupHandler(c *gin.Context) {
	pkg, totalRecords, err := BuildBackupDump()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar la base de datos para el backup"})
		return
	}

	nowStr := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("backup_%s.json", nowStr)
	dir := ensureBackupsDir()
	filePath := filepath.Join(dir, filename)

	jsonBytes, err := json.MarshalIndent(pkg, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al formatear JSON de backup"})
		return
	}

	if err := os.WriteFile(filePath, jsonBytes, 0644); err != nil {
		// En entornos serverless read-only como Vercel, servir en memoria si no se puede escribir a disco
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Data(http.StatusOK, "application/json; charset=utf-8", jsonBytes)
		return
	}

	// Registrar en logs del sistema
	userName, _ := c.Get("userName")
	userNameStr, _ := userName.(string)
	go func() {
		if database.DB != nil {
			database.DB.Create(&models.SystemLog{
				Level:   "info",
				Source:  "admin",
				Method:  "POST",
				Path:    "/api/backup/generate",
				Message: fmt.Sprintf("Backup generado manualmente por %s (%s, %d registros)", userNameStr, filename, totalRecords),
			})
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":       "Backup generado exitosamente",
		"filename":      filename,
		"size_bytes":    len(jsonBytes),
		"total_records": totalRecords,
		"created_at":    pkg.Meta.CreatedAt,
		"download_url":  fmt.Sprintf("/api/backup/download/%s", filename),
	})
}

// ListBackupsHandler lista los archivos de backup guardados en el directorio local.
func ListBackupsHandler(c *gin.Context) {
	dir := ensureBackupsDir()
	files, err := os.ReadDir(dir)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"data": []BackupFileInfo{}})
		return
	}

	list := make([]BackupFileInfo, 0)
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		info, err := f.Info()
		if err != nil {
			continue
		}

		sizeStr := fmt.Sprintf("%.2f KB", float64(info.Size())/1024.0)
		if info.Size() > 1024*1024 {
			sizeStr = fmt.Sprintf("%.2f MB", float64(info.Size())/(1024.0*1024.0))
		}

		list = append(list, BackupFileInfo{
			Filename:      f.Name(),
			SizeBytes:     info.Size(),
			SizeFormatted: sizeStr,
			CreatedAt:     info.ModTime(),
		})
	}

	// Ordenar más recientes primero
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})

	c.JSON(http.StatusOK, gin.H{
		"data":  list,
		"count": len(list),
	})
}

// DownloadBackupHandler sirve un archivo de backup .json para su descarga.
func DownloadBackupHandler(c *gin.Context) {
	filename := filepath.Base(c.Param("filename"))
	if !strings.HasSuffix(filename, ".json") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de archivo no válido"})
		return
	}

	dir := ensureBackupsDir()
	filePath := filepath.Join(dir, filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// Si no está guardado en disco (ej. en Vercel), generamos uno nuevo al vuelo
		pkg, _, genErr := BuildBackupDump()
		if genErr != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Archivo de backup no encontrado"})
			return
		}
		jsonBytes, _ := json.MarshalIndent(pkg, "", "  ")
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
		c.Data(http.StatusOK, "application/json; charset=utf-8", jsonBytes)
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.File(filePath)
}

// DeleteBackupHandler borra un archivo de backup específico.
func DeleteBackupHandler(c *gin.Context) {
	filename := filepath.Base(c.Param("filename"))
	dir := ensureBackupsDir()
	filePath := filepath.Join(dir, filename)

	if err := os.Remove(filePath); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No se pudo eliminar el archivo o no existe"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Backup eliminado correctamente",
		"filename": filename,
	})
}

// RestoreBackupHandler restaura tablas desde un archivo JSON subido o enviado en el body.
func RestoreBackupHandler(c *gin.Context) {
	var pkg BackupPackage

	// Caso A: JSON enviado directamente en el body
	if err := c.ShouldBindJSON(&pkg); err != nil {
		// Caso B: multipart file upload
		file, errFile := c.FormFile("file")
		if errFile != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere un JSON de backup en el body o un archivo 'file' multipart"})
			return
		}
		opened, errOpen := file.Open()
		if errOpen != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Error al abrir el archivo enviado"})
			return
		}
		defer opened.Close()
		content, errRead := io.ReadAll(opened)
		if errRead != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Error al leer el archivo"})
			return
		}
		if errUnmarshal := json.Unmarshal(content, &pkg); errUnmarshal != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo no contiene un JSON de backup válido"})
			return
		}
	}

	if pkg.Tables == nil || len(pkg.Tables) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El backup no contiene tablas para restaurar"})
		return
	}

	restoredTables := 0
	restoredRecords := 0

	// Procesar restauración en transacción
	tx := database.DB.Begin()

	// 1. Restaurar EmailSMTPConfig si existe
	if raw, ok := pkg.Tables["email_smtp_configs"]; ok {
		jsonBytes, _ := json.Marshal(raw)
		var list []models.EmailSMTPConfig
		if err := json.Unmarshal(jsonBytes, &list); err == nil && len(list) > 0 {
			for _, item := range list {
				tx.Save(&item)
			}
			restoredTables++
			restoredRecords += len(list)
		}
	}

	// 2. Restaurar AIProvider si existe
	if raw, ok := pkg.Tables["ai_providers"]; ok {
		jsonBytes, _ := json.Marshal(raw)
		var list []models.AIProvider
		if err := json.Unmarshal(jsonBytes, &list); err == nil && len(list) > 0 {
			for _, item := range list {
				tx.Save(&item)
			}
			restoredTables++
			restoredRecords += len(list)
		}
	}

	// 3. Restaurar EmailTemplate si existe
	if raw, ok := pkg.Tables["email_templates"]; ok {
		jsonBytes, _ := json.Marshal(raw)
		var list []models.EmailTemplate
		if err := json.Unmarshal(jsonBytes, &list); err == nil && len(list) > 0 {
			for _, item := range list {
				tx.Save(&item)
			}
			restoredTables++
			restoredRecords += len(list)
		}
	}

	// 4. Restaurar NotificationTemplate si existe
	if raw, ok := pkg.Tables["notification_templates"]; ok {
		jsonBytes, _ := json.Marshal(raw)
		var list []models.NotificationTemplate
		if err := json.Unmarshal(jsonBytes, &list); err == nil && len(list) > 0 {
			for _, item := range list {
				tx.Save(&item)
			}
			restoredTables++
			restoredRecords += len(list)
		}
	}

	tx.Commit()

	adminName, _ := c.Get("userName")
	adminNameStr, _ := adminName.(string)
	go func() {
		if database.DB != nil {
			database.DB.Create(&models.SystemLog{
				Level:   "warning",
				Source:  "admin",
				Method:  "POST",
				Path:    "/api/backup/restore",
				Message: fmt.Sprintf("Restauración de backup realizada por %s (%d tablas, %d registros restaurados)", adminNameStr, restoredTables, restoredRecords),
			})
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":          "Restauración completada exitosamente",
		"tables_restored":  restoredTables,
		"records_restored": restoredRecords,
		"created_at":       pkg.Meta.CreatedAt,
	})
}

// GetBackup mantiene compatibilidad con la ruta anterior GET /api/backup
func GetBackup(c *gin.Context) {
	// Si pasa ?action=generate o no hay lista previa, responde GenerateBackupHandler
	if c.Query("action") == "generate" {
		GenerateBackupHandler(c)
		return
	}
	ListBackupsHandler(c)
}
