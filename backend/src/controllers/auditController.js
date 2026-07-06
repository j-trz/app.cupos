import AuditService from '../services/auditService.js';

const auditController = {
  // Obtener logs de auditoría
  getLogs: async (req, res) => {
    try {
      const filters = {
        ...req.query,
        page: req.query.page || 1,
        limit: req.query.limit || 50
      };

      const result = await AuditService.getAuditLogs(filters);
      
      res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
          limit: parseInt(filters.limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Limpiar logs antiguos
  cleanupLogs: async (req, res) => {
    try {
      const daysToKeep = parseInt(req.body.daysToKeep) || 30;
      const deletedCount = await AuditService.cleanupOldLogs(daysToKeep);
      
      res.status(200).json({
        success: true,
        message: `${deletedCount} logs antiguos eliminados`,
        deletedCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default auditController;