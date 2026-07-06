import ExportService from '../services/exportService.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Exportar individualmente cada función
export const exportCSV = async (req, res) => {
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
};

export const exportExcel = async (req, res) => {
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
};

export const exportPDF = async (req, res) => {
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
};

export const getExportStats = async (req, res) => {
  try {
    // Esta función puede ser extendida para proporcionar estadísticas sobre las exportaciones
    // Por ahora, devolvemos información básica
    const statsDir = join(__dirname, '..', 'exports');
    
    // Contar archivos exportados
    const fs = await import('fs');
    let fileCount = 0;
    let totalSize = 0;
    
    if (fs.default.existsSync(statsDir)) {
      const files = fs.default.readdirSync(statsDir);
      fileCount = files.length;
      files.forEach(file => {
        const filePath = join(statsDir, file);
        const stats = fs.default.statSync(filePath);
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
};

// Exportar también como objeto por si se importa así
export default {
  exportCSV,
  exportExcel,
  exportPDF,
  getExportStats
};