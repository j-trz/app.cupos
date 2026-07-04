import { query } from '../db.js';

// Crear un nuevo producto
exports.createProduct = async (req, res) => {
  try {
    const { 
      codigo_cupo, destino, compania, disponibilidad, salida, regreso, 
      fecha_salida, fecha_regreso, precio, ruta, pnr, ficha, temporada, 
      neto_1, op, carryon, handbag, checkedbag, inf_fare 
    } = req.body;

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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
};

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
};

// Obtener un producto por ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};

// Actualizar un producto por ID
exports.updateProduct = async (req, res) => {
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
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
};

// Eliminar un producto por ID
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json({ message: 'Producto eliminado exitosamente', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};
