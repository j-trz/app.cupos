import express from 'express';
import auditController from '../controllers/auditController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Ruta para obtener logs de auditoría (solo administradores)
router.get('/', requireAuth, (req, res, next) => {
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
router.delete('/cleanup', requireAuth, (req, res, next) => {
  // Verificar si el usuario es administrador
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.'
    });
  }
  auditController.cleanupLogs(req, res).catch(next);
});

export default router;