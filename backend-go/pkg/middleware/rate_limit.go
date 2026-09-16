package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateVisitor struct {
	count   int
	resetAt time.Time
}

// RateLimit limita requests por IP a `limit` cada `window`, en memoria de
// proceso (sin dependencia externa ni tabla nueva).
//
// ponytail: ventana fija, no token bucket — una ráfaga que cruce el borde de
// la ventana puede colar hasta ~2x el límite. Tampoco se comparte entre
// instancias serverless concurrentes (cada una tiene su propio mapa), así que
// en Vercel es una capa de defensa parcial, no un límite exacto global. Si
// hace falta precisión real o un límite compartido entre instancias, pasar a
// un token bucket contra un store compartido (ej. Upstash Redis, dado que el
// resto ya corre en Vercel).
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	visitors := make(map[string]*rateVisitor)

	go func() {
		for range time.Tick(window) {
			mu.Lock()
			now := time.Now()
			for ip, v := range visitors {
				if now.After(v.resetAt) {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		mu.Lock()
		v, ok := visitors[ip]
		if !ok || now.After(v.resetAt) {
			v = &rateVisitor{resetAt: now.Add(window)}
			visitors[ip] = v
		}
		v.count++
		count := v.count
		resetAt := v.resetAt
		mu.Unlock()

		if count > limit {
			retryAfter := int(time.Until(resetAt).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Demasiadas solicitudes. Intentá de nuevo en unos segundos."})
			return
		}
		c.Next()
	}
}
