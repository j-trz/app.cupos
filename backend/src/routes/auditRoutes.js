const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');

// Ruta para obtener logs de auditoría (solo administradores)
router.get('/', authenticateToken, (req, res, next) => {
  // Verificar si el usuario es administrador
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.'
    });
  }
  auditController.getLogs(req, res).catch(next);
});

// Ruta para limpiar logs antiguos (solo administradores)
router.delete('/cleanup', authenticateToken, (req, res, next) => {
  // Verificar si el usuario es administrador
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.'
    });
  }
  auditController.cleanupLogs(req, res).catch(next);
});

module.exports = router;