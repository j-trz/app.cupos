const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

// Suponiendo que ya tienes modelos definidos
const models = {
  User: require('../models/User'),
  Agency: require('../models/Agency'),
  Reservation: require('../models/Reservation'),
  Product: require('../models/Product'),
  AuditLog: require('../models/AuditLog')
};

class ExportService {
  // Función para obtener los datos según el tipo de entidad
  static async getDataByEntityType(entityType, filters = {}) {
    const model = models[entityType];
    
    if (!model) {
      throw new Error(`Modelo no encontrado para la entidad: ${entityType}`);
    }

    try {
      const data = await model.findAll({
        where: filters.where || {},
        attributes: filters.attributes || { exclude: ['password'] }, // Excluir campos sensibles
        order: filters.order || [['createdAt', 'DESC']]
      });

      // Convertir a JSON para asegurar compatibilidad
      return data.map(item => item.toJSON());
    } catch (error) {
      throw new Error(`Error obteniendo datos para ${entityType}: ${error.message}`);
    }
  }

  // Exportar a CSV
  static async exportToCSV(data, filename) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Obtener encabezados desde la primera fila
    const headers = Object.keys(data[0]);
    const csvHeader = headers.join(',');
    
    // Convertir cada fila a formato CSV
    const csvRows = [];
    csvRows.push(csvHeader);
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] === null || row[header] === undefined ? '' : row[header];
        // Escapar comillas y añadir comillas si contiene comas o saltos de línea
        let escapedValue = String(value);
        if (escapedValue.includes(',') || escapedValue.includes('\n') || escapedValue.includes('"')) {
          escapedValue = `"${escapedValue.replace(/"/g, '""')}"`;
        }
        return escapedValue;
      });
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const filePath = path.join(__dirname, '..', 'exports', `${filename}.csv`);
    
    // Asegurar que el directorio existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, csvString);
    
    return filePath;
  }

  // Exportar a Excel
  static async exportToExcel(data, filename) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    // Crear un libro de trabajo
    const workbook = xlsx.utils.book_new();
    
    // Convertir datos a hoja
    const worksheet = xlsx.utils.json_to_sheet(data);
    
    // Ajustar anchos de columna
    const header = Object.keys(data[0]);
    const colWidths = header.map(field => ({ wch: Math.max(field.length, 15) }));
    worksheet['!cols'] = colWidths;
    
    // Añadir hoja al libro
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Datos');
    
    // Escribir archivo
    const filePath = path.join(__dirname, '..', 'exports', `${filename}.xlsx`);
    
    // Asegurar que el directorio existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    xlsx.writeFile(workbook, filePath);
    
    return filePath;
  }

  // Exportar a PDF
  static async exportToPDF(data, filename, title = 'Reporte de Datos') {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    return new Promise((resolve, reject) => {
      try {
        // Crear documento PDF
        const doc = new createPdf();
        
        const filePath = path.join(__dirname, '..', 'exports', `${filename}.pdf`);
        
        // Asegurar que el directorio existe
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Título del documento
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        
        // Cabecera de la tabla
        const headers = Object.keys(data[0]);
        let yPos = doc.y;
        
        headers.forEach((header, index) => {
          doc.fontSize(10).text(header, 50 + (index * 100), yPos, { width: 100, align: 'left' });
        });
        
        yPos += 30; // Espacio después de la cabecera
        
        // Línea divisoria
        doc.moveTo(50, yPos - 5).lineTo(550, yPos - 5).stroke();
        
        // Filas de datos
        data.forEach((row, rowIndex) => {
          const currentY = yPos + (rowIndex * 20);
          
          // Verificar si se necesita nueva página
          if (currentY > 700) {
            doc.addPage();
            yPos = 50; // Reiniciar posición Y en nueva página
          }
          
          let colX = 50;
          headers.forEach(header => {
            const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            doc.fontSize(9).text(value.substring(0, 30) + (value.length > 30 ? '...' : ''), colX, currentY, { width: 100, align: 'left' });
            colX += 100;
          });
        });
        
        doc.end();
        
        stream.on('finish', () => {
          resolve(filePath);
        });
        
        stream.on('error', (error) => {
          reject(new Error(`Error escribiendo archivo PDF: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`Error generando PDF: ${error.message}`));
      }
    });
  }

  // Método principal para exportar según tipo
  static async exportData(entityType, format, filters = {}, filename = null) {
    if (!filename) {
      filename = `${entityType}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    }

    const data = await this.getDataByEntityType(entityType, filters);
    
    switch (format.toLowerCase()) {
      case 'csv':
        return await this.exportToCSV(data, filename);
      case 'excel':
      case 'xlsx':
        return await this.exportToExcel(data, filename);
      case 'pdf':
        return await this.exportToPDF(data, filename, `Reporte de ${entityType}`);
      default:
        throw new Error(`Formato no soportado: ${format}. Formatos soportados: csv, excel, pdf`);
    }
  }
}

module.exports = ExportService;