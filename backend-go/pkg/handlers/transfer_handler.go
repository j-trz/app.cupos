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
	var transfers []models.AvailabilityTransfer

	// Preload producto
	database.DB.Preload("Product").Order("created_at desc").Find(&transfers)

	c.JSON(http.StatusOK, transfers)
}

// GetUserTransfers lista las cesiones del usuario actual (por agencia)
func GetUserTransfers(c *gin.Context) {
	agencia, _ := c.Get("agencia")
	role, _ := c.Get("role")

	var transfers []models.AvailabilityTransfer

	query := database.DB.Preload("Product").Order("created_at desc")

	// Si no es admin, filtrar por la agencia del usuario
	if role != "admin" {
		query = query.Where("source_agency = ? OR target_agency = ?", agencia, agencia)
	}

	query.Find(&transfers)

	c.JSON(http.StatusOK, transfers)
}
