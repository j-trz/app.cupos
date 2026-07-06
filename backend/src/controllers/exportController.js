const ExportService = require('../services/exportService');
const path = require('path');

const exportController = {
  // Exportar a CSV
  exportCSV: async (req, res) => {
    try {
      const { entityType } = req.params;
      const { filters } = req.query;
      
      // Parsear filtros si vienen como string JSON
      let parsedFilters = {};
      if (filters) {
        try {
          parsedFilters = JSON.parse(filters);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Filtros inválidos. Deben ser un JSON válido.'
          });
        }
      }
      
      const filePath = await ExportService.exportData(entityType, 'csv', parsedFilters);
      
      // Enviar archivo como descarga
      res.download(filePath, `${entityType}_export.csv`, (err) => {
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
  },

  // Exportar a Excel
  exportExcel: async (req, res) => {
    try {
      const { entityType } = req.params;
      const { filters } = req.query;
      
      // Parsear filtros si vienen como string JSON
      let parsedFilters = {};
      if (filters) {
        try {
          parsedFilters = JSON.parse(filters);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Filtros inválidos. Deben ser un JSON válido.'
          });
        }
      }
      
      const filePath = await ExportService.exportData(entityType, 'excel', parsedFilters);
      
      // Enviar archivo como descarga
      res.download(filePath, `${entityType}_export.xlsx`, (err) => {
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
  },

  // Exportar a PDF
  exportPDF: async (req, res) => {
    try {
      const { entityType } = req.params;
      const { filters } = req.query;
      
      // Parsear filtros si vienen como string JSON
      let parsedFilters = {};
      if (filters) {
        try {
          parsedFilters = JSON.parse(filters);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Filtros inválidos. Deben ser un JSON válido.'
          });
        }
      }
      
      const filePath = await ExportService.exportData(entityType, 'pdf', parsedFilters);
      
      // Enviar archivo como descarga
      res.download(filePath, `${entityType}_export.pdf`, (err) => {
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
  },

  // Obtener estadísticas de exportación
  getExportStats: async (req, res) => {
    try {
      // Esta función puede ser extendida para proporcionar estadísticas sobre las exportaciones
      // Por ahora, devolvemos información básica
      const statsDir = path.join(__dirname, '..', 'exports');
      
      // Contar archivos exportados
      const fs = require('fs');
      let fileCount = 0;
      let totalSize = 0;
      
      if (fs.existsSync(statsDir)) {
        const files = fs.readdirSync(statsDir);
        fileCount = files.length;
        files.forEach(file => {
          const filePath = path.join(statsDir, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          totalExports: fileCount,
          totalSize: totalSize,
          exportDirectory: statsDir
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

module.exports = exportController;