package handlers

import (
	"fmt"
	"net/http"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// groupOptionInput es una opción de itinerario dentro de una solicitud de
// grupo — tanto RequestGroup (usuario) como CreateGroup (admin, cuando quiere
// ofrecer más de una opción de una) arman N filas de Group a partir de esto,
// todas compartiendo el mismo SolicitudID.
type groupOptionInput struct {
	Itinerario string `json:"itinerario"`
	Notas      string `json:"notas"`
}

// userHasPermission replica en código de handler el mismo chequeo que hace
// middleware.RequirePermission (que solo existe como middleware de ruta, no
// como función invocable) — hace falta acá porque ListGroups/GetGroupByID
// necesitan decidir el alcance de la consulta según el permiso, no solo
// bloquear o dejar pasar la request entera.
func userHasPermission(c *gin.Context, code string) bool {
	role, _ := c.Get("role")
	if role == "admin" {
		return true
	}
	userID, _ := c.Get("userID")
	var count int64
	database.DB.Table("user_roles").
		Joins("join role_permissions on role_permissions.role_id = user_roles.role_id").
		Joins("join permissions on permissions.id = role_permissions.permission_id").
		Where("user_roles.user_id = ? and permissions.code = ? and permissions.is_active = true", userID, code).
		Count(&count)
	return count > 0
}

// canViewAllGroups: admin siempre; agency_admin (agencia propia, filtrado en
// el query) también si tiene el permiso granular GROUPS_VIEW. Cualquier otro
// usuario autenticado solo ve sus propias filas (vendedor = él mismo) — esto
// es lo que permite que Requests.jsx traiga "mis solicitudes de grupo" sin
// necesitar el permiso de gestión.
func canViewAllGroups(c *gin.Context) bool {
	role, _ := c.Get("role")
	if role == "admin" {
		return true
	}
	return userHasPermission(c, "GROUPS_VIEW")
}

func ListGroups(c *gin.Context) {
	groups := []models.Group{}
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)

	query := database.DB.Order("created_at desc")
	if canViewAllGroups(c) {
		if role != "admin" {
			query = query.Where("LOWER(agency) = LOWER(?)", agencia)
		}
	} else {
		userID, _ := c.Get("userID")
		uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))
		query = query.Where("vendedor = ?", uid)
	}
	query.Find(&groups)
	c.JSON(http.StatusOK, groups)
}

func GetGroupByID(c *gin.Context) {
	id := c.Param("id")
	var group models.Group
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}
	if !canViewAllGroups(c) {
		userID, _ := c.Get("userID")
		uid, _ := uuid.Parse(fmt.Sprintf("%v", userID))
		if group.Vendedor != uid {
			c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
			return
		}
	}
	c.JSON(http.StatusOK, group)
}

// CreateGroup: creación admin desde cero. Si el body trae "opciones" (más de
// un itinerario candidato), arma una fila por opción compartiendo un mismo
// solicitud_id — igual que si el pedido hubiera venido de un usuario, para
// que el flujo de aceptar-una-rechaza-las-demás funcione idéntico.
func CreateGroup(c *gin.Context) {
	var input struct {
		models.Group
		Opciones []groupOptionInput `json:"opciones"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Vendedor == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Debe seleccionar el usuario que va a recibir esta cotización."})
		return
	}

	base := input.Group
	if base.EstadoCotizacion == "" {
		base.EstadoCotizacion = models.GroupCotizacionPendiente
	}

	if len(input.Opciones) == 0 {
		if err := database.DB.Create(&base).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el grupo: " + err.Error()})
			return
		}
		c.JSON(http.StatusCreated, base)
		return
	}

	solicitudID := uuid.New()
	rows := make([]models.Group, len(input.Opciones))
	for i, opt := range input.Opciones {
		row := base
		row.SolicitudID = &solicitudID
		row.OpcionNumero = i + 1
		row.Itinerario = opt.Itinerario
		if opt.Notas != "" {
			row.NotasVendedor = opt.Notas
		}
		rows[i] = row
	}
	if err := database.DB.Create(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el grupo: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rows)
}

// UpdateGroup: el admin completa/edita los datos de cotización y operativos.
// No permite tocar vendedor/solicitud_id/opcion_numero (identidad de la fila).
func UpdateGroup(c *gin.Context) {
	id := c.Param("id")
	var existing models.Group
	if err := database.DB.First(&existing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}

	var input models.Group
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{
		"notas_vendedor":         input.NotasVendedor,
		"itinerario":             input.Itinerario,
		"ficha":                  input.Ficha,
		"destino":                input.Destino,
		"compania":               input.Compania,
		"condiciones":            input.Condiciones,
		"notas_internas":         input.NotasInternas,
		"notas_externas":         input.NotasExternas,
		"id_aerolinea":           input.IDAerolinea,
		"cantidad_lugares":       input.CantidadLugares,
		"cantidad_liberados":     input.CantidadLiberados,
		"salida":                 input.Salida,
		"regreso":                input.Regreso,
		"pnr_airline":            input.PnrAirline,
		"pnr_agency":             input.PnrAgency,
		"neto_01":                input.Neto01,
		"neto_liberado":          input.NetoLiberado,
		"vencimiento_pago":       input.VencimientoPago,
		"nomination_date":        input.NominationDate,
		"vencimiento_cotizacion": input.VencimientoCotizacion,
		"fecha_emision":          input.FechaEmision,
		"fecha_gastos":           input.FechaGastos,
	}

	// Si el admin manda un estado_cotizacion explícito lo respetamos; si no,
	// y la fila seguía "pendiente" pero ya tiene itinerario/condiciones
	// cargadas, la pasamos a "cotizada" automáticamente — así no depende de
	// que el frontend siempre setee el estado a mano.
	if input.EstadoCotizacion != "" {
		updates["estado_cotizacion"] = input.EstadoCotizacion
	} else if existing.EstadoCotizacion == models.GroupCotizacionPendiente && (input.Condiciones != "" || input.Neto01 != 0) {
		updates["estado_cotizacion"] = models.GroupCotizacionCotizada
	}

	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el grupo: " + err.Error()})
		return
	}

	database.DB.First(&existing, id)

	// Si la fila recién pasó a "cotizada", avisarle al vendedor que ya tiene
	// una cotización esperando su aceptación.
	if updates["estado_cotizacion"] == models.GroupCotizacionCotizada {
		services.NotifyUserByCode(existing.Vendedor, createdByFromContext(c), existing.Agency, "group_quoted",
			"Cotización de grupo disponible",
			fmt.Sprintf("Tu solicitud de grupo hacia %s ya tiene una cotización lista para revisar.", existing.Destino),
			map[string]string{"destino": existing.Destino})
	}

	c.JSON(http.StatusOK, existing)
}

func DeleteGroup(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Group{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el grupo: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Grupo eliminado correctamente"})
}

// RequestGroup: flujo de usuario — pide un vuelo a medida proponiendo una o
// más opciones de itinerario. Crea una fila de Group por opción, todas con el
// mismo solicitud_id, estado_cotizacion "pendiente".
func RequestGroup(c *gin.Context) {
	var input struct {
		CantidadLugares int                `json:"cantidad_lugares"`
		NotasVendedor   string             `json:"notas_vendedor"`
		Opciones        []groupOptionInput `json:"opciones"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(input.Opciones) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Agregá al menos una opción de itinerario."})
		return
	}
	if input.CantidadLugares <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La cantidad de lugares debe ser mayor a 0."})
		return
	}

	userIDVal, _ := c.Get("userID")
	uid, err := uuid.Parse(fmt.Sprintf("%v", userIDVal))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario inválido."})
		return
	}
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)

	solicitudID := uuid.New()
	rows := make([]models.Group, len(input.Opciones))
	for i, opt := range input.Opciones {
		rows[i] = models.Group{
			SolicitudID:      &solicitudID,
			OpcionNumero:     i + 1,
			Vendedor:         uid,
			Agency:           agenciaRaw,
			NotasVendedor:    input.NotasVendedor,
			Itinerario:       opt.Itinerario,
			CantidadLugares:  input.CantidadLugares,
			EstadoCotizacion: models.GroupCotizacionPendiente,
		}
		if opt.Notas != "" && input.NotasVendedor == "" {
			rows[i].NotasVendedor = opt.Notas
		}
	}
	if err := database.DB.Create(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la solicitud de grupo: " + err.Error()})
		return
	}

	services.NotifyRoleByCode("admin", createdByFromContext(c), "group_requested", "Nueva solicitud de grupo",
		fmt.Sprintf("Se solicitó un grupo con %d lugar(es) y %d opción(es) de itinerario.", input.CantidadLugares, len(input.Opciones)),
		map[string]string{"cantidad_lugares": fmt.Sprintf("%d", input.CantidadLugares)})

	c.JSON(http.StatusCreated, rows)
}

// AcceptGroupQuote: el vendedor dueño de la fila acepta una opción cotizada.
// Si tiene hermanas (mismo solicitud_id), las rechaza automáticamente — solo
// se puede avanzar con una opción por solicitud.
func AcceptGroupQuote(c *gin.Context) {
	id := c.Param("id")
	var group models.Group
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}

	role, _ := c.Get("role")
	userIDVal, _ := c.Get("userID")
	uid, _ := uuid.Parse(fmt.Sprintf("%v", userIDVal))
	if role != "admin" && group.Vendedor != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
		return
	}
	if group.EstadoCotizacion != models.GroupCotizacionCotizada {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Esta opción no tiene una cotización pendiente de aceptar."})
		return
	}

	if err := database.DB.Model(&group).Update("estado_cotizacion", models.GroupCotizacionAceptada).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al aceptar la cotización."})
		return
	}
	if group.SolicitudID != nil {
		database.DB.Model(&models.Group{}).
			Where("solicitud_id = ? AND id != ? AND estado_cotizacion IN ?", group.SolicitudID, group.ID,
				[]string{models.GroupCotizacionPendiente, models.GroupCotizacionCotizada}).
			Update("estado_cotizacion", models.GroupCotizacionRechazada)
	}

	services.NotifyRoleByCode("admin", createdByFromContext(c), "group_accepted", "Cotización de grupo aceptada",
		fmt.Sprintf("El vendedor aceptó la cotización del grupo hacia %s — falta confirmar.", group.Destino),
		map[string]string{"destino": group.Destino})

	database.DB.First(&group, id)
	c.JSON(http.StatusOK, group)
}

// ConfirmGroup: el admin confirma que la opción aceptada se lleva adelante —
// recién acá se revelan al usuario nominación/fecha de emisión/gastos.
func ConfirmGroup(c *gin.Context) {
	id := c.Param("id")
	var group models.Group
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}
	if group.EstadoCotizacion != models.GroupCotizacionAceptada {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Solo se puede confirmar un grupo cuya cotización ya fue aceptada."})
		return
	}

	if err := database.DB.Model(&group).Update("estado_reservar", models.GroupReservarConfirmada).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar el grupo."})
		return
	}

	services.NotifyUserByCode(group.Vendedor, createdByFromContext(c), group.Agency, "group_confirmed", "Grupo confirmado",
		fmt.Sprintf("Tu grupo hacia %s fue confirmado.", group.Destino),
		map[string]string{"destino": group.Destino})

	database.DB.First(&group, id)
	c.JSON(http.StatusOK, group)
}

func RequestGroupCancellation(c *gin.Context) {
	id := c.Param("id")
	var group models.Group
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}

	role, _ := c.Get("role")
	userIDVal, _ := c.Get("userID")
	if role != "admin" && role != "agency_admin" {
		uid, _ := uuid.Parse(fmt.Sprintf("%v", userIDVal))
		if group.Vendedor != uid {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sin permiso."})
			return
		}
	}
	if group.EstadoReservar != models.GroupReservarConfirmada {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Solo se puede solicitar la cancelación de un grupo confirmado."})
		return
	}

	if err := database.DB.Model(&group).Updates(map[string]interface{}{
		"estado_reservar":            models.GroupReservarCancelacionSolicitada,
		"pre_cancel_estado_reservar": group.EstadoReservar,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al procesar la solicitud."})
		return
	}

	services.NotifyRoleByCode("admin", createdByFromContext(c), "group_cancel_requested", "Cancelación de grupo solicitada",
		fmt.Sprintf("Se solicitó la cancelación del grupo hacia %s.", group.Destino),
		map[string]string{"destino": group.Destino})

	database.DB.First(&group, id)
	c.JSON(http.StatusOK, group)
}

func ResolveGroupCancellation(c *gin.Context) {
	id := c.Param("id")
	var group models.Group
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}
	if group.EstadoReservar != models.GroupReservarCancelacionSolicitada {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este grupo no tiene una solicitud de cancelación pendiente."})
		return
	}

	var input struct {
		Decision string `json:"decision"`
		Notas    string `json:"notas"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Decision != "approve" && input.Decision != "decline" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "decision debe ser 'approve' o 'decline'"})
		return
	}

	updates := map[string]interface{}{"cancelacion_notas": input.Notas}
	if input.Decision == "approve" {
		updates["estado_reservar"] = models.GroupReservarCancelada
	} else {
		updates["estado_reservar"] = group.PreCancelEstadoReservar
	}
	if err := database.DB.Model(&group).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al resolver la cancelación."})
		return
	}

	notifCode := "group_cancel_declined"
	notifTitle := "Cancelación de grupo rechazada"
	notifMsg := fmt.Sprintf("Se rechazó la cancelación del grupo hacia %s.", group.Destino)
	if input.Decision == "approve" {
		notifCode = "group_cancel_approved"
		notifTitle = "Grupo cancelado"
		notifMsg = fmt.Sprintf("Se canceló el grupo hacia %s.", group.Destino)
	}
	services.NotifyUserByCode(group.Vendedor, createdByFromContext(c), group.Agency, notifCode, notifTitle, notifMsg,
		map[string]string{"destino": group.Destino})

	database.DB.First(&group, id)
	c.JSON(http.StatusOK, group)
}

// GetGroupsReport arma métricas simples de Grupos para su propia pestaña en
// Reportes — no reutiliza el pipeline de analytics_handler.go (pensado para
// Producto+Pasajero, con columnas como "vendidos"/"riesgo" que no aplican acá)
// sino que agrega directo sobre la tabla groups.
func GetGroupsReport(c *gin.Context) {
	role, _ := c.Get("role")
	agenciaVal, _ := c.Get("agencia")
	agenciaRaw, _ := agenciaVal.(string)
	agencia := services.ResolveAgencyCode(agenciaRaw)

	query := database.DB.Model(&models.Group{})
	if role == "agency_admin" {
		query = query.Where("LOWER(agency) = LOWER(?)", agencia)
	}

	var groups []models.Group
	query.Find(&groups)

	porCotizacion := map[string]int{}
	porReservar := map[string]int{}
	lugaresSolicitados := 0
	lugaresConfirmados := 0
	proximosVencimientos := 0
	limite := time.Now().AddDate(0, 0, 30)

	for _, g := range groups {
		estadoCot := g.EstadoCotizacion
		if estadoCot == "" {
			estadoCot = models.GroupCotizacionPendiente
		}
		porCotizacion[estadoCot]++
		if g.EstadoReservar != "" {
			porReservar[g.EstadoReservar]++
		}
		lugaresSolicitados += g.CantidadLugares
		if g.EstadoReservar == models.GroupReservarConfirmada {
			lugaresConfirmados += g.CantidadLugares
		}
		if (g.VencimientoCotizacion != nil && g.VencimientoCotizacion.Before(limite)) ||
			(g.VencimientoPago != nil && g.VencimientoPago.Before(limite)) {
			if g.EstadoCotizacion != models.GroupCotizacionRechazada && g.EstadoReservar != models.GroupReservarCancelada {
				proximosVencimientos++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total":                 len(groups),
		"por_estado_cotizacion": porCotizacion,
		"por_estado_reservar":   porReservar,
		"lugares_solicitados":   lugaresSolicitados,
		"lugares_confirmados":   lugaresConfirmados,
		"proximos_vencimientos": proximosVencimientos,
	})
}
