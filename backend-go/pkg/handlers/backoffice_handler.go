package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ─────────────────────────────────────────────
// BACKOFFICE - Importar Pasajeros
//
// Permite conectar el sistema con un backoffice externo para importar
// los datos de pasajeros automáticamente a partir de una ficha de venta.
//
// NOTA: Actualmente en modo SIMULACIÓN hasta tener las credenciales del backoffice.
// Cuando lleguen las credenciales, reemplazar la función simulateBackofficeAPI
// con la llamada HTTP real al sistema externo.
// ─────────────────────────────────────────────

// PasajeroImportado representa un pasajero devuelto por el backoffice
type PasajeroImportado struct {
	Nombre       string `json:"nombre"`
	Apellido     string `json:"apellido"`
	Documento    string `json:"documento"`
	Nacimiento   string `json:"nacimiento"`   // formato YYYY-MM-DD
	Nacionalidad string `json:"nacionalidad"`
	TipoPasajero string `json:"tipo_pasajero"` // Adulto | Menor | Infante
}

// ImportarPasajerosResponse es la respuesta del endpoint
type ImportarPasajerosResponse struct {
	Success     bool                `json:"success"`
	FichaVenta  string              `json:"ficha_venta"`
	Pasajeros   []PasajeroImportado `json:"pasajeros"`
}

// ImportarPasajeros godoc
// GET /api/backoffice/importar-pasajeros?ficha_venta=FV-123
// Requiere autenticación. Importa pasajeros del backoffice por ficha de venta.
func ImportarPasajeros(c *gin.Context) {
	fichaVenta := c.Query("ficha_venta")
	if fichaVenta == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La ficha de venta es requerida para la importación."})
		return
	}

	// Simular latencia de red del backoffice externo
	time.Sleep(600 * time.Millisecond)

	// ─────────────────────────────────────────────────────────────────
	// MODO SIMULACIÓN — Reemplazar por llamada real cuando haya credenciales
	// Ejemplo de integración real futura:
	//   pasajeros, err := callRealBackofficeAPI(fichaVenta)
	//   if err != nil {
	//       c.JSON(http.StatusBadGateway, gin.H{"error": "Error al conectar con el backoffice: " + err.Error()})
	//       return
	//   }
	// ─────────────────────────────────────────────────────────────────
	pasajeros := simulateBackofficeAPI(fichaVenta)

	c.JSON(http.StatusOK, ImportarPasajerosResponse{
		Success:    true,
		FichaVenta: fichaVenta,
		Pasajeros:  pasajeros,
	})
}

// simulateBackofficeAPI simula la respuesta del backoffice según la ficha de venta.
// Cuando lleguen las credenciales reales, esta función se reemplaza por la llamada HTTP real.
func simulateBackofficeAPI(fichaVenta string) []PasajeroImportado {
	lower := strings.ToLower(fichaVenta)

	switch {
	case strings.Contains(lower, "123"):
		// Caso: 2 pasajeros (Adulto + Menor)
		return []PasajeroImportado{
			{
				Nombre:       "Juan Carlos",
				Apellido:     "Pérez",
				Documento:    "38472910",
				Nacimiento:   "1994-05-15",
				Nacionalidad: "Argentina",
				TipoPasajero: "Adulto",
			},
			{
				Nombre:       "Mariana Belén",
				Apellido:     "Pérez",
				Documento:    "51123987",
				Nacimiento:   "2018-09-20",
				Nacionalidad: "Argentina",
				TipoPasajero: "Menor",
			},
		}

	case strings.Contains(lower, "456"):
		// Caso: 3 pasajeros (2 Adultos + 1 Infante)
		return []PasajeroImportado{
			{
				Nombre:       "Roberto",
				Apellido:     "Gómez Fernández",
				Documento:    "28194837",
				Nacimiento:   "1980-11-02",
				Nacionalidad: "Uruguay",
				TipoPasajero: "Adulto",
			},
			{
				Nombre:       "Estela Maris",
				Apellido:     "López",
				Documento:    "30485920",
				Nacimiento:   "1983-04-24",
				Nacionalidad: "Argentina",
				TipoPasajero: "Adulto",
			},
			{
				Nombre:       "Sofía",
				Apellido:     "Gómez López",
				Documento:    "62194837",
				Nacimiento:   "2025-01-10",
				Nacionalidad: "Argentina",
				TipoPasajero: "Infante",
			},
		}

	default:
		// Caso por defecto: 1 pasajero Adulto
		return []PasajeroImportado{
			{
				Nombre:       "Pasajero",
				Apellido:     fmt.Sprintf("FV %s", fichaVenta),
				Documento:    "35194820",
				Nacimiento:   "1990-08-12",
				Nacionalidad: "Argentina",
				TipoPasajero: "Adulto",
			},
		}
	}
}
