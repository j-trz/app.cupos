package handlers

import (
	"fmt"
	"net/http"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TransferInput representa el payload para crear una cesión
type TransferInput struct {
	ProductID    uint   `json:"product_id" binding:"required"`
	TargetAgency string `json:"target_agency" binding:"required"`
	Quantity     int    `json:"quantity" binding:"required,min=1"`
}

// CreateTransfer crea una cesión de disponibilidad entre agencias. También
// permite "devolver"/re-ceder un cupo que ya es un producto-espejo de una
// cesión anterior (a la misma agencia dueña original o a una tercera): en
// ese caso la agencia cedente de ESTA cesión es quien hoy tiene restringido
// ese producto (RestrictedAgency), no la agencia del usuario que ejecuta la
// acción — así un admin puede operar la devolución en nombre de la agencia
// sin que quede mal atribuida.
func CreateTransfer(c *gin.Context) {
	var input TransferInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, _ := c.Get("userID")
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	callerAgencia, _ := agenciaVal.(string)

	var createdBy uuid.UUID
	if s, ok := userIDStr.(string); ok {
		createdBy, _ = uuid.Parse(s)
	}

	// Obtener producto
	var product models.Product
	if err := database.DB.First(&product, input.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto no encontrado"})
		return
	}

	// La agencia cedente de ESTA cesión: si el producto ya es un espejo de
	// otra cesión, es quien lo tiene hoy (RestrictedAgency) — no el catálogo
	// general. Si es un producto del catálogo compartido (sin restricción),
	// la agencia cedente es la del usuario que ejecuta la acción.
	sourceAgency := callerAgencia
	if product.RestrictedAgency != "" {
		sourceAgency = product.RestrictedAgency
		if role != "admin" && callerAgencia != product.RestrictedAgency {
			c.JSON(http.StatusForbidden, gin.H{"error": "No podés ceder un cupo que no te pertenece"})
			return
		}
	}

	// Validar que origen y destino sean diferentes
	if sourceAgency == input.TargetAgency {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La agencia origen y destino no pueden ser la misma"})
		return
	}

	// Validar disponibilidad suficiente
	if product.Disponibilidad < input.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":     "Disponibilidad insuficiente",
			"available": product.Disponibilidad,
			"requested": input.Quantity,
		})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Descontar del producto original (stock de origen)
	if err := tx.Model(&models.Product{}).Where("id = ?", input.ProductID).
		Update("disponibilidad", gorm.Expr("disponibilidad - ?", input.Quantity)).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar disponibilidad"})
		return
	}

	// 2. Crear producto espejo para la agencia destino — restringido a esa
	// agencia (RestrictedAgency) para que el resto del catálogo no lo vea ni
	// lo pueda reservar.
	transferID := uuid.New()
	productTransfer := models.Product{
		CodigoCupo:             product.CodigoCupo,
		Destino:                product.Destino,
		Compania:               product.Compania,
		Disponibilidad:         input.Quantity,
		FechaSalida:            product.FechaSalida,
		FechaRegreso:           product.FechaRegreso,
		Precio:                 product.Precio,
		Neto1:                  product.Neto1,
		OP:                     product.OP,
		Ruta:                   product.Ruta,
		Temporada:              product.Temporada,
		TipoProducto:           product.TipoProducto,
		BloqueoTemporalMinutos: product.BloqueoTemporalMinutos,
		InfFare:                product.InfFare,
		ChdFare:                product.ChdFare,
		CarryOn:                product.CarryOn,
		HandBag:                product.HandBag,
		CheckedBag:             product.CheckedBag,
		RestrictedAgency:       input.TargetAgency,
		SourceAgency:           sourceAgency,
		TransferID:             &transferID,
	}
	if err := tx.Create(&productTransfer).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear producto destino"})
		return
	}

	// 3. Crear registro de cesión
	transfer := models.AvailabilityTransfer{
		ID:           transferID,
		ProductID:    input.ProductID,
		SourceAgency: sourceAgency,
		TargetAgency: input.TargetAgency,
		Quantity:     input.Quantity,
		CreatedBy:    createdBy,
	}
	if err := tx.Create(&transfer).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear cesión"})
		return
	}

	// 4. Línea de auditoría en Reservas para la agencia cedente: no es un
	// pasajero real, solo deja registro de que ese stock salió de su pool.
	cesionReservation := models.Reservation{
		ProductID:      input.ProductID,
		CreatedBy:      createdBy,
		Estado:         models.EstadoCedida,
		PedidoID:       fmt.Sprintf("CESION-%s", transferID.String()[:8]),
		Agencia:        sourceAgency,
		TransferID:     &transferID,
		ContactoNombre: fmt.Sprintf("Cesión de %d cupos a %s", input.Quantity, input.TargetAgency),
	}
	if err := tx.Create(&cesionReservation).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar la cesión en reservas"})
		return
	}

	tx.Commit()

	// Recargar producto para devolver estado actualizado
	database.DB.First(&product, input.ProductID)

	createdByPtr := &createdBy
	services.NotifyAgency(input.TargetAgency, createdByPtr, "info", "Recibiste una cesión de disponibilidad",
		fmt.Sprintf("La agencia %s te cedió %d cupos del producto %s hacia %s", sourceAgency, input.Quantity, product.CodigoCupo, product.Destino))
	services.NotifyRole("admin", createdByPtr, "info", "Nueva cesión entre agencias",
		fmt.Sprintf("%s cedió %d cupos de %s a %s", sourceAgency, input.Quantity, product.CodigoCupo, input.TargetAgency))

	c.JSON(http.StatusCreated, gin.H{
		"transfer":     transfer,
		"product":      product,
		"product_copy": productTransfer,
	})
}

// ListTransfers lista todas las cesiones (solo admin)
func ListTransfers(c *gin.Context) {
	transfers := []models.AvailabilityTransfer{}

	// Preload producto
	database.DB.Preload("Product").Order("created_at desc").Find(&transfers)

	c.JSON(http.StatusOK, transfers)
}

// GetUserTransfers lista las cesiones del usuario actual (por agencia)
func GetUserTransfers(c *gin.Context) {
	agencia, _ := c.Get("agencia")
	role, _ := c.Get("role")

	transfers := []models.AvailabilityTransfer{}

	query := database.DB.Preload("Product").Order("created_at desc")

	if role != "admin" {
		query = query.Where("source_agency = ? OR target_agency = ?", agencia, agencia)
	}

	query.Find(&transfers)

	c.JSON(http.StatusOK, transfers)
}

// ReclaimTransfer recupera el stock de un producto cedido (producto espejo)
// y lo devuelve al producto origen. Acepta un body opcional {"quantity": N}
// para devolver solo una parte de lo cedido (ej. se cedieron 5 y se quieren
// recuperar solo 2) — si no se manda, se recupera todo lo que quede
// disponible en el espejo (comportamiento anterior, compatible hacia atrás).
func ReclaimTransfer(c *gin.Context) {
	productID := c.Param("id")
	agenciaVal, _ := c.Get("agencia")
	callerAgencia, _ := agenciaVal.(string)
	role, _ := c.Get("role")

	var input struct {
		Quantity int `json:"quantity"`
	}
	_ = c.ShouldBindJSON(&input)

	var mirrorProduct models.Product
	if err := database.DB.First(&mirrorProduct, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Producto cedido no encontrado"})
		return
	}

	if mirrorProduct.RestrictedAgency == "" || mirrorProduct.SourceAgency == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este producto no es una cesión"})
		return
	}

	if role != "admin" && callerAgencia != mirrorProduct.SourceAgency {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permiso para recuperar este cupo"})
		return
	}

	if mirrorProduct.Disponibilidad <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hay disponibilidad para recuperar"})
		return
	}

	if mirrorProduct.TransferID == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falta el TransferID original"})
		return
	}

	var transfer models.AvailabilityTransfer
	if err := database.DB.First(&transfer, mirrorProduct.TransferID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Registro de transferencia no encontrado"})
		return
	}

	var originalProduct models.Product
	if err := database.DB.First(&originalProduct, transfer.ProductID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Producto origen no encontrado"})
		return
	}

	qtyToReclaim := mirrorProduct.Disponibilidad
	if input.Quantity > 0 {
		if input.Quantity > mirrorProduct.Disponibilidad {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":     "La cantidad a devolver supera la disponibilidad cedida",
				"available": mirrorProduct.Disponibilidad,
			})
			return
		}
		qtyToReclaim = input.Quantity
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Devolver al original
	if err := tx.Model(&models.Product{}).Where("id = ?", originalProduct.ID).
		Update("disponibilidad", gorm.Expr("disponibilidad + ?", qtyToReclaim)).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar producto origen"})
		return
	}

	// Restar al espejo solo la cantidad devuelta (puede ser parcial)
	if err := tx.Model(&models.Product{}).Where("id = ?", mirrorProduct.ID).
		Update("disponibilidad", gorm.Expr("disponibilidad - ?", qtyToReclaim)).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar producto espejo"})
		return
	}

	// Registrar reserva de devolución
	var createdBy uuid.UUID
	if s, ok := c.Get("userID"); ok {
		if sStr, ok := s.(string); ok {
			createdBy, _ = uuid.Parse(sStr)
		}
	}
	cesionReservation := models.Reservation{
		ProductID:      originalProduct.ID,
		CreatedBy:      createdBy,
		Estado:         models.EstadoCedida,
		PedidoID:       fmt.Sprintf("RECUP-%s", transfer.ID.String()[:8]),
		Agencia:        mirrorProduct.SourceAgency,
		TransferID:     mirrorProduct.TransferID,
		ContactoNombre: fmt.Sprintf("Recuperación de %d cupos de %s", qtyToReclaim, mirrorProduct.RestrictedAgency),
	}
	if err := tx.Create(&cesionReservation).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar recuperación"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Cupos recuperados", "quantity": qtyToReclaim})
}
