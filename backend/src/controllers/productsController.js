const db = require('../db');

// Crear un nuevo producto
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const result = await db.query(
            'INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING *',
            [name, description, price]
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
        const result = await db.query('SELECT * FROM products');
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
        const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
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
        const { name, description, price } = req.body;
        const result = await db.query(
            'UPDATE products SET name = $1, description = $2, price = $3 WHERE id = $4 RETURNING *',
            [name, description, price, id]
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
        const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.status(200).json({ message: 'Producto eliminado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};
