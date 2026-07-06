import { query } from '../db.js';

/**
 * Obtener estadísticas generales para el dashboard
 */
export const getGeneralStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const agencia = req.user.agencia;

    // Filtro por agencia si no es admin
    let agencyFilter = '';
    let params = [];
    if (!isAdmin) {
      agencyFilter = ' WHERE agencia = $1';
      params = [agencia];
    }

    // 1. Total de reservas
    const totalReservationsResult = await query(
      `SELECT COUNT(*) as total FROM reservations ${agencyFilter}`,
      params
    );
    const totalReservations = parseInt(totalReservationsResult.rows[0]?.total || 0);

    // 2. Ventas totales (solo confirmadas)
    // Usamos COALESCE para manejar casos donde precio_venta sea NULL
    const salesStats = await query(
      `SELECT COALESCE(SUM(precio_venta), 0) as total_ventas FROM reservations WHERE estado = 'confirmada' ${isAdmin ? '' : ' AND agencia = $1'}`,
      params
    );
    const totalSales = parseFloat(salesStats.rows[0]?.total_ventas || 0);

    // 3. Usuarios activos (últimos 30 días)
    const activeUsersResult = await query(
      `SELECT COUNT(DISTINCT created_by) as total FROM reservations
       WHERE created_at > NOW() - INTERVAL '30 days' ${isAdmin ? '' : ' AND agencia = $1'}`,
      params
    );
    const activeUsers = parseInt(activeUsersResult.rows[0]?.total || 0);

    // 4. Disponibilidad promedio
    const avgAvailabilityResult = await query(
      `SELECT AVG(disponibilidad) as avg FROM products ${isAdmin ? '' : ' WHERE 1=1'}`
    );
    const avgAvailability = Math.round(parseFloat(avgAvailabilityResult.rows[0]?.avg || 0));

    // 5. Total de reservas por estado
    const statusStats = await query(
      `SELECT estado, count(*) as total FROM reservations ${agencyFilter} GROUP BY estado`,
      params
    );

    // 6. Productos más vendidos
    const topProducts = await query(
      `SELECT vuelo_destino, count(*) as total
       FROM reservations
       WHERE estado = 'confirmada' ${isAdmin ? '' : ' AND agencia = $1'}
       GROUP BY vuelo_destino
       ORDER BY total DESC
       LIMIT 5`,
      params
    );

    // 7. Reservas recientes
    const recentReservations = await query(
      `SELECT * FROM reservations ${agencyFilter} ORDER BY created_at DESC LIMIT 10`,
      params
    );

    res.json({
      success: true,
      totalReservations,
      totalSales,
      activeUsers,
      avgAvailability,
      stats: {
        status_distribution: statusStats.rows,
        total_sales: totalSales,
        top_destinations: topProducts.rows,
        recent_activity: recentReservations.rows
      }
    });
  } catch (error) {
    console.error('Error en getGeneralStats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas generales.' });
  }
};

/**
 * Reporte detallado de ventas por agencia
 */
export const getAgencyReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    const result = await query(`
      SELECT agencia, count(*) as total_reservas, COALESCE(SUM(precio_venta), 0) as total_venta
      FROM reservations
      WHERE estado = 'confirmada'
      GROUP BY agencia
      ORDER BY total_venta DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getAgencyReport:', error);
    res.status(500).json({ error: 'Error al obtener reporte de agencias.' });
  }
};

/**
 * Reporte de ocupación por producto/vuelo
 */
export const getInventoryReport = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.id, p.codigo_cupo, p.destino, p.compania, p.disponibilidad as cupos_totales,
        (SELECT count(*) FROM reservations r WHERE r.product_id = p.id AND r.estado = 'confirmada') as cupos_vendidos,
        (SELECT count(*) FROM reservations r WHERE r.product_id = p.id AND r.estado = 'bloqueo_temporal') as cupos_bloqueados
      FROM products p
      ORDER BY p.fecha_salida ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getInventoryReport:', error);
    res.status(500).json({ error: 'Error al obtener reporte de inventario.' });
  }
};

/**
 * Ventas históricas (agrupadas por mes/día)
 */
export const getHistoricalSalesReport = async (req, res) => {
  try {
    const { interval = 'month' } = req.query; // 'day', 'month'
    const isAdmin = req.user.role === 'admin';
    const params = [];

    let dateTrunc = "DATE_TRUNC('month', created_at)";
    if (interval === 'day') {
      dateTrunc = "DATE_TRUNC('day', created_at)";
    }

    let sql = `
      SELECT ${dateTrunc} as period, count(*) as total_reservas, COALESCE(SUM(precio_venta), 0) as total_venta
      FROM reservations
      WHERE estado = 'confirmada'
    `;

    if (!isAdmin) {
      sql += ' AND agencia = $1';
      params.push(req.user.agencia);
    }

    sql += ` GROUP BY period ORDER BY period ASC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getHistoricalSalesReport:', error);
    res.status(500).json({ error: 'Error al obtener reporte histórico.' });
  }
};
