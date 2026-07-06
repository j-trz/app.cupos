import BackupService from '../services/backupService.js';

const backupController = {
  // Crear backup
  createBackup: async (req, res) => {
    try {
      const { type = 'full' } = req.body;
      
      const result = await BackupService.createConfigBackup(type);
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Restaurar desde backup
  restoreFromBackup: async (req, res) => {
    try {
      const { filepath } = req.body;
      
      if (!filepath) {
        return res.status(400).json({
          success: false,
          message: 'Ruta del archivo de backup requerida'
        });
      }
      
      const result = await BackupService.restoreConfigFromBackup(filepath);
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Obtener lista de backups
  getBackups: async (req, res) => {
    try {
      const result = await BackupService.getAvailableBackups();
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Eliminar backup
  deleteBackup: async (req, res) => {
    try {
      const { filename } = req.params;
      
      const result = await BackupService.deleteBackup(filename);
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Descargar backup
  downloadBackup: async (req, res) => {
    try {
      const { filename } = req.params;
      const filepath = (await import('path')).join(BackupService.backupDir, filename);
      
      // Verificar que el archivo existe
      const fs = (await import('fs')).default;
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          message: 'Archivo de backup no encontrado'
        });
      }
      
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Error enviando archivo:', err);
          res.status(500).json({
            success: false,
            message: 'Error al descargar el archivo'
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default backupController;