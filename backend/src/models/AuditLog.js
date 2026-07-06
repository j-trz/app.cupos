const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
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
    allowNull: true
  },
  requestBody: {
    type: DataTypes.JSON,
    allowNull: true
  },
  responseBody: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: false
});

module.exports = AuditLog;