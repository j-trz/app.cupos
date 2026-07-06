import AuditLog from '../models/AuditLog.js';
import { Op } from 'sequelize';

class AuditService {
  // Obtener logs de auditoría con filtros
  static async getAuditLogs(filters = {}) {
    const {
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      orderBy = 'timestamp',
      orderDirection = 'DESC'
    } = filters;

    const whereClause = {};
    
    if (userId) whereClause.userId = userId;
    if (action) whereClause.action = { [Op.iLike]: `%${action}%` };
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereClause.timestamp[Op.lte] = new Date(endDate);
    }

    const options = {
      where: whereClause,
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [[orderBy, orderDirection]]
    };

    try {
      const logs = await AuditLog.findAndCountAll(options);
      return {
        logs: logs.rows,
        total: logs.count,
        page: parseInt(page),
        totalPages: Math.ceil(logs.count / limit)
      };
    } catch (error) {
      throw new Error(`Error obteniendo logs de auditoría: ${error.message}`);
    }
  }

  // Crear manualmente una entrada de auditoría
  static async createAuditLog(entry) {
    try {
      return await AuditLog.create(entry);
    } catch (error) {
      throw new Error(`Error creando log de auditoría: ${error.message}`);
    }
  }

  // Eliminar logs antiguos
  static async cleanupOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const deletedCount = await AuditLog.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          }
        }
      });
      
      return deletedCount;
    } catch (error) {
      throw new Error(`Error eliminando logs antiguos: ${error.message}`);
    }
  }
}

export default AuditService;