const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Todas las rutas requieren autenticación y permisos de administrador
router.use(authenticateToken);

// Ruta para crear backup
router.post('/', isAdmin, (req, res, next) => {
  backupController.createBackup(req, res).catch(next);
});

// Ruta para obtener lista de backups
router.get('/', isAdmin, (req, res, next) => {
  backupController.getBackups(req, res).catch(next);
});

// Ruta para restaurar desde backup
router.post('/restore', isAdmin, (req, res, next) => {
  backupController.restoreFromBackup(req, res).catch(next);
});

// Ruta para eliminar backup
router.delete('/:filename', isAdmin, (req, res, next) => {
  backupController.deleteBackup(req, res).catch(next);
});

// Ruta para descargar backup
router.get('/download/:filename', isAdmin, (req, res, next) => {
  backupController.downloadBackup(req, res).catch(next);
});

module.exports = router;