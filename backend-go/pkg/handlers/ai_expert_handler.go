package handlers

import (
	"io"
	"net/http"
	"strings"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// expertAgencyScope devuelve la agencia del usuario autenticado y si es
// admin (que ve/gestiona expertos de todas las agencias). Mismo criterio de
// scoping que el resto del sistema (Product/Reservation).
func expertAgencyScope(c *gin.Context) (agencia string, isAdmin bool) {
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agencia, _ = agenciaVal.(string)
	isAdmin = role == "admin"
	return
}

type expertInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Persona     string `json:"persona"`
	IsActive    *bool  `json:"is_active"`
	Agencia     string `json:"agencia"` // solo usado por admin al crear
}

// findExpertScoped busca un experto por ID y verifica que pertenezca a la
// agencia del usuario (o sea admin) — helper compartido por todos los
// endpoints de expertos y documentos, para que el chequeo de scoping viva en
// un solo lugar.
func findExpertScoped(c *gin.Context, expertID string) (*models.AIExpert, bool) {
	var expert models.AIExpert
	if err := database.DB.First(&expert, "id = ?", expertID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experto no encontrado"})
		return nil, false
	}
	agencia, isAdmin := expertAgencyScope(c)
	if !isAdmin && !strings.EqualFold(expert.Agencia, agencia) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experto no encontrado"})
		return nil, false
	}
	return &expert, true
}

// expertNameTaken verifica si ya existe otro experto activo con el mismo
// nombre (case-insensitive) en la misma agencia — el nombre es el único
// identificador que usa la tool consultar_experto, así que dos expertos con
// el mismo nombre harían que la IA consulte uno al azar.
func expertNameTaken(agencia, name string, excludeID uuid.UUID) bool {
	var count int64
	q := database.DB.Model(&models.AIExpert{}).
		Where("LOWER(agencia) = LOWER(?) AND LOWER(name) = LOWER(?)", agencia, name)
	if excludeID != uuid.Nil {
		q = q.Where("id != ?", excludeID)
	}
	q.Count(&count)
	return count > 0
}

// ListAIExperts lista los expertos visibles para el usuario — scopeados a su
// agencia (admin puede ver todos, o filtrar con ?agencia=).
func ListAIExperts(c *gin.Context) {
	agencia, isAdmin := expertAgencyScope(c)
	q := database.DB.Model(&models.AIExpert{}).Preload("Documents")
	if isAdmin {
		if filtro := c.Query("agencia"); filtro != "" {
			q = q.Where("LOWER(agencia) = LOWER(?)", filtro)
		}
	} else {
		q = q.Where("LOWER(agencia) = LOWER(?)", agencia)
	}
	var experts []models.AIExpert
	q.Order("created_at desc").Find(&experts)
	c.JSON(http.StatusOK, gin.H{"experts": experts})
}

// GetAIExpert obtiene un experto puntual (con sus documentos).
func GetAIExpert(c *gin.Context) {
	expert, ok := findExpertScoped(c, c.Param("id"))
	if !ok {
		return
	}
	database.DB.Preload("Documents").First(expert, "id = ?", expert.ID)
	c.JSON(http.StatusOK, expert)
}

// CreateAIExpert crea un experto nuevo para la agencia del usuario
// (agency_admin/admin — la ruta ya está gateada por rol).
func CreateAIExpert(c *gin.Context) {
	var input expertInput
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre del experto es requerido"})
		return
	}
	agencia, isAdmin := expertAgencyScope(c)
	if isAdmin && strings.TrimSpace(input.Agencia) != "" {
		agencia = input.Agencia
	}
	if agencia == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Falta la agencia del experto"})
		return
	}
	name := strings.TrimSpace(input.Name)
	if expertNameTaken(agencia, name, uuid.Nil) {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya existe un experto con ese nombre en tu agencia"})
		return
	}
	userID, _ := currentUserID(c)
	expert := models.AIExpert{
		Agencia: agencia, Name: name, Description: input.Description,
		Persona: input.Persona, IsActive: true, CreatedBy: userID,
	}
	if err := database.DB.Create(&expert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo crear el experto"})
		return
	}
	c.JSON(http.StatusCreated, expert)
}

// UpdateAIExpert edita nombre/descripción/persona/estado de un experto, solo
// si pertenece a la agencia del usuario (o es admin).
func UpdateAIExpert(c *gin.Context) {
	expert, ok := findExpertScoped(c, c.Param("id"))
	if !ok {
		return
	}
	var input expertInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}
	updates := map[string]interface{}{
		"description": input.Description,
		"persona":     input.Persona,
	}
	if name := strings.TrimSpace(input.Name); name != "" {
		if expertNameTaken(expert.Agencia, name, expert.ID) {
			c.JSON(http.StatusConflict, gin.H{"error": "Ya existe otro experto con ese nombre en tu agencia"})
			return
		}
		updates["name"] = name
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	database.DB.Model(expert).Updates(updates)
	database.DB.First(expert, "id = ?", expert.ID)
	c.JSON(http.StatusOK, expert)
}

// DeleteAIExpert elimina un experto y todo su conocimiento asociado
// (documentos y chunks), solo si pertenece a la agencia del usuario (o es admin).
func DeleteAIExpert(c *gin.Context) {
	expert, ok := findExpertScoped(c, c.Param("id"))
	if !ok {
		return
	}
	database.DB.Where("expert_id = ?", expert.ID).Delete(&models.AIExpertChunk{})
	database.DB.Where("expert_id = ?", expert.ID).Delete(&models.AIExpertDocument{})
	database.DB.Delete(expert)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UploadAIExpertDocument agrega un documento de conocimiento a un experto,
// convirtiéndolo a Markdown en memoria (nunca se persiste el archivo
// original — ver services.ConvertToMarkdown). Acepta multipart/form-data con
// un campo "file", o JSON con {"url": "..."} para agregar contenido de una
// página pública.
func UploadAIExpertDocument(c *gin.Context) {
	expert, ok := findExpertScoped(c, c.Param("id"))
	if !ok {
		return
	}
	userID, _ := currentUserID(c)

	var fileName, sourceType, sourceURL, markdown string
	var convErr error

	if strings.HasPrefix(c.ContentType(), "multipart/form-data") {
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Falta el archivo (campo 'file')"})
			return
		}
		defer file.Close()
		raw, err := io.ReadAll(io.LimitReader(file, services.MaxExpertUploadBytes+1))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No se pudo leer el archivo"})
			return
		}
		fileName = header.Filename
		markdown, sourceType, convErr = services.ConvertToMarkdown(fileName, raw)

		// Fallback de OCR vía IA: un PDF sin capa de texto (típicamente
		// escaneado) no se puede leer con extracción de texto normal — en
		// vez de darlo por perdido, se intenta transcribirlo con el
		// proveedor de IA activo de la agencia (ver ocrPDFWithAI).
		if convErr != nil && sourceType == "pdf" {
			if ocrText, ocrErr := ocrPDFWithAI(raw); ocrErr == nil && strings.TrimSpace(ocrText) != "" {
				markdown = ocrText
				if len(markdown) > services.MaxExpertMarkdownBytes {
					markdown = markdown[:services.MaxExpertMarkdownBytes]
				}
				convErr = nil
			} else if ocrErr != nil {
				// Reemplaza el error genérico de "sin capa de texto" por el
				// motivo específico del fallback (más accionable: qué
				// proveedor está activo, o el error real de la API).
				convErr = ocrErr
			}
		}
	} else {
		var input struct {
			URL string `json:"url"`
		}
		if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.URL) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Falta la URL"})
			return
		}
		sourceURL = strings.TrimSpace(input.URL)
		fileName = sourceURL
		sourceType = "url"
		markdown, convErr = services.ConvertURLToMarkdown(sourceURL)
	}

	doc := models.AIExpertDocument{
		ExpertID: expert.ID, FileName: fileName, SourceType: sourceType, SourceURL: sourceURL,
		CreatedBy: userID,
	}
	if convErr != nil {
		doc.Status = "error"
		doc.ErrorMessage = convErr.Error()
	} else {
		doc.Status = "ready"
		doc.ContentMarkdown = markdown
		doc.CharCount = len(markdown)
	}
	if err := database.DB.Create(&doc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo guardar el documento"})
		return
	}

	if convErr != nil {
		// El documento igual queda guardado (status "error", para que se vea
		// en el listado con su motivo) pero la request en sí debe fallar con
		// un status de error — si respondiéramos 201 acá, el frontend nunca
		// entra a su bloque de manejo de error y el usuario no se entera de
		// que la conversión falló (parece que "no pasó nada").
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": doc.ErrorMessage, "document": doc})
		return
	}

	reindexExpertChunks(expert.ID)
	c.JSON(http.StatusCreated, doc)
}

// ListAIExpertDocuments lista los documentos de conocimiento de un experto.
func ListAIExpertDocuments(c *gin.Context) {
	expert, ok := findExpertScoped(c, c.Param("id"))
	if !ok {
		return
	}
	var docs []models.AIExpertDocument
	database.DB.Where("expert_id = ?", expert.ID).Order("created_at desc").Find(&docs)
	c.JSON(http.StatusOK, gin.H{"documents": docs})
}

// DeleteAIExpertDocument elimina un documento (y sus chunks) de un experto,
// y re-indexa el resto del conocimiento restante. Verifica explícitamente que
// el documento pertenezca a ESTE experto antes de borrar nada — de lo
// contrario, un docId de otra agencia pasado por error/malicia borraría los
// chunks de esa agencia sin que el borrado del documento (sí scopeado)
// hiciera nada, corrompiendo en silencio el conocimiento de un tercero.
func DeleteAIExpertDocument(c *gin.Context) {
	expert, ok := findExpertScoped(c, c.Param("id"))
	if !ok {
		return
	}
	docID := c.Param("docId")

	var doc models.AIExpertDocument
	if err := database.DB.Where("id = ? AND expert_id = ?", docID, expert.ID).First(&doc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Documento no encontrado"})
		return
	}

	database.DB.Where("document_id = ? AND expert_id = ?", doc.ID, expert.ID).Delete(&models.AIExpertChunk{})
	database.DB.Delete(&doc)
	reindexExpertChunks(expert.ID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// reindexExpertChunks recalcula los chunks de búsqueda por texto de un
// experto tras agregar/eliminar un documento: si el conocimiento total sigue
// bajo expertKnowledgeThreshold no hacen falta chunks (se borran los que
// hubiera, para que gatherExpertKnowledge vuelva a inyectar todo directo);
// si lo supera, se re-trocean todos sus documentos vigentes. El volumen
// esperado por experto es chico, así que un rebuild completo en cada cambio
// es más simple y confiable que actualizar incrementalmente.
func reindexExpertChunks(expertID uuid.UUID) {
	var docs []models.AIExpertDocument
	database.DB.Where("expert_id = ? AND status = 'ready'", expertID).Find(&docs)

	total := 0
	for _, d := range docs {
		total += d.CharCount
	}

	database.DB.Where("expert_id = ?", expertID).Delete(&models.AIExpertChunk{})
	if total <= expertKnowledgeThreshold {
		return
	}

	var rows []models.AIExpertChunk
	for _, d := range docs {
		chunks := services.ChunkMarkdown(d.ContentMarkdown, expertChunkSize, expertChunkOverlap)
		for i, content := range chunks {
			rows = append(rows, models.AIExpertChunk{
				ExpertID: d.ExpertID, DocumentID: d.ID, ChunkIndex: i, Content: content,
			})
		}
	}
	if len(rows) > 0 {
		database.DB.CreateInBatches(rows, 100)
	}
}
