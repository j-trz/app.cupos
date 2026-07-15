package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"backend-go/pkg/database"
	"backend-go/pkg/models"
	"backend-go/pkg/services"

	"github.com/gin-gonic/gin"
)

// CheckDeadlineReminders avisa con antelación configurable (dias_aviso_vencimientos,
// default 3) los deadlines operativos de Grupos confirmados y de Productos:
// vencimiento de pago, fecha de nominación, fecha de emisión y entrada en
// gastos. Mismo patrón que ExpireReservations (cron_handler.go): protegido por
// X-Cron-Secret, sin AuthMiddleware, pensado para un trigger externo (ver
// .github/workflows/check-deadlines.yml).
func CheckDeadlineReminders(c *gin.Context) {
	secret := os.Getenv("CRON_SECRET")
	if secret == "" || c.GetHeader("X-Cron-Secret") != secret {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No autorizado"})
		return
	}

	dias := services.GetIntSetting("dias_aviso_vencimientos", 3)
	limite := time.Now().AddDate(0, 0, dias)

	groupsWarned := warnGroupDeadlines(limite, dias)
	productsWarned := warnProductDeadlines(limite, dias)

	c.JSON(http.StatusOK, gin.H{"success": true, "grupos_avisados": groupsWarned, "productos_avisados": productsWarned})
}

var groupDeadlineFields = []struct {
	code        string
	getDate     func(*models.Group) *time.Time
	alreadySent func(*models.Group) bool
	flagColumn  string
}{
	{"group_deadline_pago", func(g *models.Group) *time.Time { return g.VencimientoPago }, func(g *models.Group) bool { return g.AvisoPagoEnviado }, "aviso_pago_enviado"},
	{"group_deadline_nominacion", func(g *models.Group) *time.Time { return g.NominationDate }, func(g *models.Group) bool { return g.AvisoNominacionEnviado }, "aviso_nominacion_enviado"},
	{"group_deadline_emision", func(g *models.Group) *time.Time { return g.FechaEmision }, func(g *models.Group) bool { return g.AvisoEmisionEnviado }, "aviso_emision_enviado"},
	{"group_deadline_gastos", func(g *models.Group) *time.Time { return g.FechaGastos }, func(g *models.Group) bool { return g.AvisoGastosEnviado }, "aviso_gastos_enviado"},
}

var productDeadlineFields = []struct {
	code        string
	getDate     func(*models.Product) *time.Time
	alreadySent func(*models.Product) bool
	flagColumn  string
}{
	{"product_deadline_pago", func(p *models.Product) *time.Time { return p.VencimientoPago }, func(p *models.Product) bool { return p.AvisoPagoEnviado }, "aviso_pago_enviado"},
	{"product_deadline_nominacion", func(p *models.Product) *time.Time { return p.NominationDate }, func(p *models.Product) bool { return p.AvisoNominacionEnviado }, "aviso_nominacion_enviado"},
	{"product_deadline_emision", func(p *models.Product) *time.Time { return p.FechaEmision }, func(p *models.Product) bool { return p.AvisoEmisionEnviado }, "aviso_emision_enviado"},
	{"product_deadline_gastos", func(p *models.Product) *time.Time { return p.FechaGastos }, func(p *models.Product) bool { return p.AvisoGastosEnviado }, "aviso_gastos_enviado"},
}

// warnGroupDeadlines recorre los grupos ya confirmados (los deadlines
// operativos solo corren una vez que el admin confirmó, no antes) y avisa al
// vendedor + al rol admin (única vía que además dispara las casillas extra
// de email, ver NotifyRoleByCode) por cada deadline que caiga dentro de la
// ventana y todavía no se haya avisado.
func warnGroupDeadlines(limite time.Time, dias int) int {
	var groups []models.Group
	database.DB.Where("estado_reservar = ?", models.GroupReservarConfirmada).Find(&groups)

	now := time.Now()
	warned := 0
	for i := range groups {
		g := &groups[i]
		for _, f := range groupDeadlineFields {
			fecha := f.getDate(g)
			if fecha == nil || fecha.Before(now) || fecha.After(limite) || f.alreadySent(g) {
				continue
			}

			data := map[string]string{
				"destino": g.Destino,
				"fecha":   fecha.Format("02/01/2006"),
				"dias":    fmt.Sprintf("%d", dias),
			}
			services.NotifyUserByCode(g.Vendedor, nil, g.Agency, f.code, "Vencimiento próximo",
				fmt.Sprintf("El grupo hacia %s tiene un vencimiento el %s", g.Destino, data["fecha"]), data)
			services.NotifyRoleByCode("admin", nil, f.code, "Vencimiento próximo",
				fmt.Sprintf("El grupo hacia %s (agencia %s) tiene un vencimiento el %s", g.Destino, g.Agency, data["fecha"]), data)

			database.DB.Model(&models.Group{}).Where("id = ?", g.ID).Update(f.flagColumn, true)
			warned++
		}
	}
	return warned
}

// warnProductDeadlines recorre todo el catálogo (un producto siempre está
// vigente hasta que se borra, no hay un estado análogo a "confirmado") y
// avisa a la agencia dueña + al rol admin.
func warnProductDeadlines(limite time.Time, dias int) int {
	var products []models.Product
	database.DB.Find(&products)

	now := time.Now()
	warned := 0
	for i := range products {
		p := &products[i]
		for _, f := range productDeadlineFields {
			fecha := f.getDate(p)
			if fecha == nil || fecha.Before(now) || fecha.After(limite) || f.alreadySent(p) {
				continue
			}

			data := map[string]string{
				"codigo_cupo": p.CodigoCupo,
				"destino":     p.Destino,
				"fecha":       fecha.Format("02/01/2006"),
				"dias":        fmt.Sprintf("%d", dias),
			}
			services.NotifyAgencyByCode(p.Agencia, nil, f.code, "Vencimiento próximo",
				fmt.Sprintf("El cupo %s hacia %s tiene un vencimiento el %s", p.CodigoCupo, p.Destino, data["fecha"]), data)
			services.NotifyRoleByCode("admin", nil, f.code, "Vencimiento próximo",
				fmt.Sprintf("El cupo %s hacia %s (agencia %s) tiene un vencimiento el %s", p.CodigoCupo, p.Destino, p.Agencia, data["fecha"]), data)

			database.DB.Model(&models.Product{}).Where("id = ?", p.ID).Update(f.flagColumn, true)
			warned++
		}
	}
	return warned
}
