# Backend Go - Dashboard Cupos

Este es el backend migrado a Go utilizando **Gin** para enrutamiento de API de alto rendimiento y **GORM** para la conexión con la base de datos PostgreSQL.

## Requisitos

- Go 1.25 o superior
- Base de datos PostgreSQL configurada según el archivo `ESTRUCTURA_BD`

## Configuración y Variables de Entorno

Crea un archivo `.env` en la raíz de `/backend-go` o define las siguientes variables de entorno:

```env
# URL de conexión directa a PostgreSQL
DATABASE_URL=postgres://usuario:contraseña@host:puerto/nombre_bd?sslmode=disable

# O define las credenciales de base de datos por separado:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
DB_SSLMODE=disable

# Puerto para levantar el servidor backend (default: 3001)
PORT=3001

# Modo de Gin (debug o release)
GIN_MODE=debug
```

## Ejecución del Servidor

Para iniciar el servidor en modo desarrollo:

```bash
go run main.go
```

El servidor levantará en http://localhost:3001 por defecto.

## Ejecución de Pruebas

Para correr las pruebas unitarias y de integración de la lógica de negocio y métricas:

```bash
go test -v ./handlers/...
```

## Endpoints Disponibles

### API Principal (`/api/...`)

- `GET /api/fields` - Obtiene la lista única de valores para los filtros dinámicos.
- `POST /api/dashboard-data` - Carga optimizada paralela de campos, evolución y detalles de destinos en una única llamada.
- `POST /api/evolucion-agencias` - Share histórico agrupado por agencia (Jetmar vs Tienda).
- `POST /api/agencias-data` - Valores de ventas y porcentajes de share global o por destino.
- `POST /api/detalle-destinos` - Tabla completa de cupos, ventas, costos, rentabilidad y riesgo agrupada por Destino y Temporada.
- `POST /api/destinos-compania` - Tabla comparativa e histórica por aerolínea/compañía.
- `POST /api/evolucion-pasajeros` - Serie temporal de pasajeros por mes/semana/día.
- `POST /api/evolucion-por-cupo` - Serie mensual de ventas filtrada por un Código de Cupo específico.
- `POST /api/share-por-cupo` - Porcentaje de share (Jetmar vs Tienda) para un Código de Cupo específico.
- `POST /api/por-salida` - Listado detallado e individual de cupos (salida por salida) con métricas financieras.

### Métricas y Forecast (`/metrics/...` / `/forecast/...`)

- `GET /metrics/summary` - KPIs acumulativos de ventas, costos, rentabilidad y riesgo total.
- `GET /metrics/by-destination` - Desglose de métricas financieras ordenadas por los destinos más vendidos.
- `GET /forecast/sales` - Predicción analítica (naive mean) de ventas futuras.

## Características de la Migración

1. **Sin dependencia de archivos Excel:** El backend lee y consulta la información relacional directamente de PostgreSQL mediante GORM utilizando las tablas `products`, `reservations` y `passengers`.
2. **Cero pérdida de lógica de negocio:** Se mantienen intactas las reglas de clasificación de ventas (`NRO == 1` o infantes menores de 2 años al regreso), los nombres normalizados de agencias (Jetmar vs Tienda) y las fórmulas de Costo, Rentabilidad, Venta y Riesgo.
3. **Alto rendimiento y escalabilidad:** Desarrollado sobre Go-Gin, optimizando los tiempos de procesamiento a milisegundos.
