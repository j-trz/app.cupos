# Sentencias SQL para Crear Tablas en la Base de Datos

## Tabla `products`

```sql
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    codigo_cupo VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    compania VARCHAR(255) NOT NULL,
    disponibilidad INTEGER NOT NULL,
    salida DATE,
    regreso DATE,
    fecha_salida DATE,
    fecha_regreso DATE,
    precio NUMERIC(10, 2),
    ruta VARCHAR(255),
    pnr VARCHAR(255),
    ficha VARCHAR(255),
    temporada VARCHAR(255),
    neto_1 NUMERIC(10, 2),
    op VARCHAR(255),
    carryon BOOLEAN DEFAULT FALSE,
    handbag BOOLEAN DEFAULT FALSE,
    checkedbag BOOLEAN DEFAULT FALSE,
    inf_fare NUMERIC(10, 2)
);
```

## Tabla `reservations`

```sql
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    estado VARCHAR(255) NOT NULL,
    pedido_id VARCHAR(255) NOT NULL,
    agencia VARCHAR(255) NOT NULL,
    contacto_nombre VARCHAR(255) NOT NULL,
    contacto_email VARCHAR(255) NOT NULL,
    contacto_telefono VARCHAR(255),
    vuelo_codigo VARCHAR(255) NOT NULL,
    vuelo_destino VARCHAR(255) NOT NULL,
    vuelo_compania VARCHAR(255) NOT NULL,
    vuelo_salida DATE NOT NULL,
    vuelo_precio NUMERIC(10, 2),
    nombre_pasajero VARCHAR(255) NOT NULL,
    apellido_pasajero VARCHAR(255) NOT NULL,
    documento_pasajero VARCHAR(255) NOT NULL,
    nacimiento_pasajero DATE,
    nacionalidad_pasajero VARCHAR(255),
    tipo_pasajero VARCHAR(255)
);
```

