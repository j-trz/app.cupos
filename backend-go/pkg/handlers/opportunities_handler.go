package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// fixOpportunityDates convierte fechas "YYYY-MM-DD" a RFC3339
func fixOpportunityDates(data map[string]interface{}) {
	dateFields := []string{"validez", "fecha_salida", "fecha_llegada"}
	for _, field := range dateFields {
		if v, ok := data[field]; ok && v != nil {
			if s, ok := v.(string); ok && len(s) == 10 {
				data[field] = s + "T00:00:00Z"
			}
		}
	}
}

// fixOpportunityNumbers convierte strings numéricos a float64/int
func fixOpportunityNumbers(data map[string]interface{}) {
	floatFields := []string{"neto_1", "neto_2"}
	intFields := []string{"total_lugares", "total_liberados"}
	for _, field := range floatFields {
		if v, ok := data[field]; ok {
			if s, ok := v.(string); ok {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					data[field] = f
				}
			}
		}
	}
	for _, field := range intFields {
		if v, ok := data[field]; ok {
			if s, ok := v.(string); ok {
				if i, err := strconv.Atoi(s); err == nil {
					data[field] = i
				}
			}
		}
	}
}

// GetOpportunities lista oportunidades
func GetOpportunities(c *gin.Context) {
	opportunities := []models.Opportunity{}
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)

	// Parámetros de query
	searchTerm := c.Query("search")
	estado := c.Query("estado")
	temporada := c.Query("temporada")
	destino := c.Query("destino")
	compania := c.Query("compania")
	filterAgencia := c.Query("agencia") // solo admin puede filtrar por agencia

	query := database.DB.Order("created_at DESC")

	// Scoping de agencia: admin ve todas, otros solo su agencia
	if role != "admin" {
		query = query.Where("LOWER(agencia) = LOWER(?)", agencia)
	} else if filterAgencia != "" {
		query = query.Where("LOWER(agencia) = LOWER(?)", filterAgencia)
	}

	// Filtros
	if searchTerm != "" {
		searchTerm = "%" + strings.ToLower(searchTerm) + "%"
		query = query.Where(
			"LOWER(destino) LIKE ? OR LOWER(compania) LIKE ?",
			searchTerm, searchTerm,
		)
	}
	if estado != "" {
		query = query.Where("estado = ?", estado)
	}
	if temporada != "" {
		query = query.Where("temporada = ?", temporada)
	}
	if destino != "" {
		query = query.Where("destino = ?", destino)
	}
	if compania != "" {
		query = query.Where("compania = ?", compania)
	}

	query.Preload("CargadorUser").Preload("AutorizadorUser").Find(&opportunities)
	c.JSON(http.StatusOK, opportunities)
}

// GetOpportunity obtiene una oportunidad por ID
func GetOpportunity(c *gin.Context) {
	id := c.Param("id")
	var opp models.Opportunity

	if err := database.DB.Preload("CargadorUser").Preload("AutorizadorUser").First(&opp, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Oportunidad no encontrada"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)

	// Validar permisos: admin o pertenece a su agencia
	if role != "admin" && strings.ToLower(opp.Agencia) != strings.ToLower(agencia) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para ver esta oportunidad"})
		return
	}

	c.JSON(http.StatusOK, opp)
}

// CreateOpportunity crea una nueva oportunidad
func CreateOpportunity(c *gin.Context) {
	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fixOpportunityDates(rawData)
	fixOpportunityNumbers(rawData)

	// Convertir a models.Opportunity
	jsonBytes, err := json.Marshal(rawData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error procesando datos"})
		return
	}

	var opp models.Opportunity
	if err := json.Unmarshal(jsonBytes, &opp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-completar campos
	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))
	opp.UsuarioCargador = uid

	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	opp.Agencia = services.ResolveAgencyCode(agenciaRaw)

	opp.FechaCargado = time.Now()
	if opp.Estado == "" {
		opp.Estado = "pendiente"
	}

	// Validaciones
	if opp.Destino == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Destino es requerido"})
		return
	}
	if opp.Compania == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Compañía es requerida"})
		return
	}
	if opp.FechaSalida.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fecha de salida es requerida"})
		return
	}
	if opp.TotalLugares < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Total de lugares no puede ser negativo"})
		return
	}

	// Crear en DB
	if err := database.DB.Create(&opp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear oportunidad"})
		return
	}

	c.JSON(http.StatusCreated, opp)
}

// UpdateOpportunity actualiza una oportunidad
func UpdateOpportunity(c *gin.Context) {
	id := c.Param("id")
	var opp models.Opportunity

	if err := database.DB.First(&opp, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Oportunidad no encontrada"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)
	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))

	// Validar permisos
	isAdmin := role == "admin"
	isCreator := opp.UsuarioCargador == uid
	isSameAgency := strings.ToLower(opp.Agencia) == strings.ToLower(agencia)

	if !isAdmin && (!isCreator || !isSameAgency) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para editar esta oportunidad"})
		return
	}

	// Terminal: ya se convirtió a producto, no se edita más (ni admin) — ver
	// ConvertOpportunityToProduct.
	if opp.Estado == "producto" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Esta oportunidad ya fue convertida a producto y no puede editarse"})
		return
	}

	// Non-admin solo puede editar si estado es pendiente
	if !isAdmin && opp.Estado != "pendiente" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo se pueden editar oportunidades en estado pendiente"})
		return
	}

	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fixOpportunityDates(rawData)
	fixOpportunityNumbers(rawData)

	// No permitir editar campos críticos
	delete(rawData, "usuario_cargador")
	delete(rawData, "fecha_cargado")
	delete(rawData, "agencia")

	// No-admin no puede cambiar estado ni usuario_autorizador
	if !isAdmin {
		delete(rawData, "estado")
		delete(rawData, "usuario_autorizador")
	}

	// Aplicar cambios
	if err := database.DB.Where("id = ?", id).Model(&opp).Updates(rawData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
		return
	}

	// Re-fetch
	database.DB.First(&opp, "id = ?", id)
	c.JSON(http.StatusOK, opp)
}

// DeleteOpportunity elimina una oportunidad
func DeleteOpportunity(c *gin.Context) {
	id := c.Param("id")
	var opp models.Opportunity

	if err := database.DB.First(&opp, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Oportunidad no encontrada"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)
	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))

	// Validar permisos: admin siempre, o creador con estado=pendiente
	isAdmin := role == "admin"
	isCreator := opp.UsuarioCargador == uid
	isSameAgency := strings.ToLower(opp.Agencia) == strings.ToLower(agencia)
	isPending := opp.Estado == "pendiente"

	if !isAdmin && (!isCreator || !isSameAgency || !isPending) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para eliminar esta oportunidad"})
		return
	}

	// Terminal: ya se convirtió a producto, no se elimina más (ni admin).
	if opp.Estado == "producto" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Esta oportunidad ya fue convertida a producto y no puede eliminarse"})
		return
	}

	if err := database.DB.Delete(&opp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Oportunidad eliminada"})
}

// ApproveOpportunity (shortcut para PUT con estado=aprobada + usuario_autorizador)
func ApproveOpportunity(c *gin.Context) {
	id := c.Param("id")
	var opp models.Opportunity

	if err := database.DB.First(&opp, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Oportunidad no encontrada"})
		return
	}

	role, _ := c.Get("role")

	// Solo admin
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo administradores pueden aprobar oportunidades"})
		return
	}

	// Terminal: ya se convirtió a producto, no puede volver a cambiar de estado.
	if opp.Estado == "producto" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Esta oportunidad ya fue convertida a producto y no puede cambiar de estado"})
		return
	}

	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))

	// Setear estado, usuario_autorizador y fecha_aprobado
	now := time.Now()
	if err := database.DB.Where("id = ?", id).Model(&opp).Updates(map[string]interface{}{
		"estado":              "aprobada",
		"usuario_autorizador": uid,
		"fecha_aprobado":      now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al aprobar"})
		return
	}

	// Re-fetch
	database.DB.Preload("CargadorUser").Preload("AutorizadorUser").First(&opp, "id = ?", id)
	c.JSON(http.StatusOK, opp)
}

// ConvertOpportunityToProduct crea un Product nuevo a partir de una
// Opportunity ya aprobada, reutilizando sus datos si el frontend los manda
// precargados (mismo shape de body que CreateProduct — el frontend reusa
// ProductForm con defaultValues salidos de la oportunidad). El producto nace
// con PendienteAprobacion=true: no aparece en Disponibilidad (GetProducts sin
// scope=management sigue exigiendo pendiente_aprobacion=false) hasta que un
// admin lo aprueba (ver ApproveProduct en product_handler.go). La oportunidad
// pasa a Estado "producto" (terminal, ver guards en Update/Delete/Approve de
// arriba) y guarda ProductoID a modo informativo.
//
// Todo esto es opcional: una agencia que nunca haga click acá sigue cargando
// productos directo desde Gestión de Productos exactamente como siempre —
// CreateProduct no se toca y no gana ningún campo obligatorio nuevo.
func ConvertOpportunityToProduct(c *gin.Context) {
	id := c.Param("id")
	var opp models.Opportunity
	if err := database.DB.First(&opp, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Oportunidad no encontrada"})
		return
	}

	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)
	userID, _ := c.Get("userID")
	uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))

	isAdmin := role == "admin"
	isCreator := opp.UsuarioCargador == uid
	isSameAgency := strings.ToLower(opp.Agencia) == strings.ToLower(agencia)
	if !isAdmin && (!isCreator || !isSameAgency) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para convertir esta oportunidad"})
		return
	}

	if opp.ProductoID != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Esta oportunidad ya fue convertida a producto"})
		return
	}
	if opp.Estado != "aprobada" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Solo se pueden convertir oportunidades aprobadas"})
		return
	}

	var rawData map[string]interface{}
	if err := c.ShouldBindJSON(&rawData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fixDates(rawData)
	fixNumbers(rawData)

	jsonBytes, err := json.Marshal(rawData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error procesando datos"})
		return
	}
	var product models.Product
	if err := json.Unmarshal(jsonBytes, &product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.PendienteAprobacion = true
	if product.CodigoCupo == "" {
		product.CodigoCupo = generateCodigoCupo(&product, 0)
	}
	if product.TipoProducto == "" {
		product.TipoProducto = "Aereo"
	}
	product.Disponibilidad = recomputeDisponibilidad(product.Cupo, product.Vendidos)
	applyCalculatedPrices(&product)

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&product).Error; err != nil {
			return err
		}
		return tx.Model(&models.Opportunity{}).Where("id = ?", opp.ID).Updates(map[string]interface{}{
			"estado":      "producto",
			"producto_id": product.ID,
		}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al convertir la oportunidad a producto: " + err.Error()})
		return
	}

	services.NotifyRoleByCode("admin", createdByFromContext(c), "product_pending_approval", "Producto pendiente de aprobación",
		fmt.Sprintf("%s convirtió una oportunidad (%s - %s) en el producto %s, pendiente de aprobación", agencia, opp.Destino, opp.Compania, product.CodigoCupo),
		map[string]string{"codigo_cupo": product.CodigoCupo, "destino": product.Destino, "compania": product.Compania})

	c.JSON(http.StatusCreated, product)
}
