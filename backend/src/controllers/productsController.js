import { query } from '../db.js';

// Crear un nuevo producto
export const createProduct = async (req, res) => {
  try {
    const isAdminUser = req.user && req.user.role === 'admin';
    const {
      codigo_cupo, destino, compania, disponibilidad, salida, regreso,
      fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada,
      neto_1, op, carryon, handbag, checkedbag, inf_fare
    } = req.body;
    
    // Validación de datos
    if (!codigo_cupo || !destino || !compania || !disponibilidad) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }

    const result = await query(
      `INSERT INTO products (
        codigo_cupo, destino, compania, disponibilidad, salida, regreso, 
        fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada, 
        neto_1, op, carryon, handbag, checkedbag, inf_fare
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        codigo_cupo, destino, compania, disponibilidad, salida, regreso, 
        fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada, 
        neto_1, op, carryon, handbag, checkedbag, inf_fare
      ]
    );

    const row = { ...result.rows[0] };
    if (!isAdminUser && Object.prototype.hasOwnProperty.call(row, 'neto_1')) delete row.neto_1;
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

// Obtener todos los productos
export const getAllProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products');
    const isAdminUser = req.user && req.user.role === 'admin';
    if (!isAdminUser) {
      const sanitized = result.rows.map(r => {
        const copy = { ...r };
        if (Object.prototype.hasOwnProperty.call(copy, 'neto_1')) delete copy.neto_1;
        return copy;
      });
      return res.status(200).json(sanitized);
    }
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los productos', details: err.message });
  }
};

// Obtener un producto por ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const isAdminUser = req.user && req.user.role === 'admin';
    const row = { ...result.rows[0] };
    if (!isAdminUser && Object.prototype.hasOwnProperty.call(row, 'neto_1')) delete row.neto_1;
    res.status(200).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto', details: err.message });
  }
};

// Actualizar un producto por ID
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_cupo, destino, compania, disponibilidad, salida, regreso,
      fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada,
      neto_1, op, carryon, handbag, checkedbag, inf_fare
    } = req.body;

    const result = await query(
      `UPDATE products SET
        codigo_cupo = $1, destino = $2, compania = $3, disponibilidad = $4, salida = $5, regreso = $6,
        fecha_salida = $7, fecha_regreso = $8, precio = $9, ruta = $10, pnr = $11, ficha = $12, temporada = $13,
        neto_1 = $14, op = $15, carryon = $16, handbag = $17, checkedbag = $18, inf_fare = $19
      WHERE id = $20 RETURNING *`,
      [
        codigo_cupo, destino, compania, disponibilidad, salida, regreso,
        fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada,
        neto_1, op, carryon, handbag, checkedbag, inf_fare, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const isAdminUser = req.user && req.user.role === 'admin';
    const row = { ...result.rows[0] };
    if (!isAdminUser && Object.prototype.hasOwnProperty.call(row, 'neto_1')) delete row.neto_1;
    res.status(200).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto', details: err.message });
  }
};

// Eliminar un producto por ID
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const isAdminUser = req.user && req.user.role === 'admin';
    const deleted = { ...result.rows[0] };
    if (!isAdminUser && Object.prototype.hasOwnProperty.call(deleted, 'neto_1')) delete deleted.neto_1;
    res.status(200).json({ message: 'Producto eliminado exitosamente', deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el producto', details: err.message });
  }
};

// Carga masiva de productos
export const bulkCreateProducts = async (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de productos no vacío.' });
  }

  // Importar pool para obtener un cliente para la transacción
  const { default: pool } = await import('../db.js');
  const client = await pool.connect();

  try {
    const insertedProducts = [];
    const errors = [];

    // Usar una transacción para asegurar que todos se inserten o ninguno
    await client.query('BEGIN');

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      try {
        if (!p.codigo_cupo || !p.destino || !p.compania || !p.disponibilidad) {
          throw new Error(`Faltan campos obligatorios en el producto en la posición ${i}`);
        }

        const result = await client.query(
          `INSERT INTO products (
            codigo_cupo, destino, compania, disponibilidad, salida, regreso,
            fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada,
            neto_1, op, carryon, handbag, checkedbag, inf_fare
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
          [
            p.codigo_cupo, p.destino, p.compania, p.disponibilidad, p.salida, p.regreso,
            p.fecha_salida, p.fecha_regreso, p.precio, p.ruta, p.pnr, p.ficha, p.temporada,
            p.neto_1, p.op, p.carryon, p.handbag, p.checkedbag, p.inf_fare
          ]
        );
        insertedProducts.push(result.rows[0]);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Error en la carga masiva. Se realizó un rollback.',
        details: errors
      });
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: `${insertedProducts.length} productos insertados correctamente.`,
      count: insertedProducts.length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 Error en bulkCreateProducts:', err);
    res.status(500).json({ error: 'Error al procesar la carga masiva.' });
  } finally {
    client.release();
  }
};
