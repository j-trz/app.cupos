import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING, // Cambiado de INTEGER a STRING para aceptar UUIDs
    allowNull: true,
    field: 'user_id'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  duration: {
    type: DataTypes.INTEGER, // Duración en milisegundos
    allowNull: true
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'status_code'
  },
  requestBody: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'request_body'
  },
  responseBody: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'response_body'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false,
  // Asegurar que no haya sincronización automática que sobrescriba nuestra definición
  // Esto evita que Sequelize intente modificar la tabla según la definición del modelo
});

export default AuditLog;