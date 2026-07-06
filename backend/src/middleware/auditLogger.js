const AuditLog = require('../models/AuditLog');

const auditLogger = async (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar la respuesta original
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Crear entrada de auditoría
    const auditEntry = {
      userId: req.user?.id || null,
      action: `${req.method} ${req.path}`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date(),
      duration,
      statusCode: res.statusCode,
      requestBody: req.body && Object.keys(req.body).length > 0 ? req.body : null,
      responseBody: data && typeof data === 'string' && (data.startsWith('{') || data.startsWith('[')) ? JSON.parse(data) : null
    };
    
    // Registrar en segundo plano para no afectar el rendimiento
    AuditLog.create(auditEntry).catch(err => {
      console.error('Error al registrar en auditoría:', err);
    });
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = auditLogger;