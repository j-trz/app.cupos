import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as themesController from './controllers/themesController.js';
import * as productsController from './controllers/productsController.js';
import * as settingsController from './controllers/settingsController.js';
import * as alertRulesController from './controllers/alertRulesController.js';
import * as agenciesController from './controllers/agenciesController.js';
import dotenv from 'dotenv';

// Importar middlewares de autenticación
import { requireAuth, isAdmin, isAgencyAdminOrAdmin, requireInternalToken } from './middleware/auth.js';

// Importar controladores
import * as authController from './controllers/authController.js';
import * as userController from './controllers/userController.js';
import * as notificationController from './controllers/notificationController.js';
import * as dataController from './controllers/dataController.js';
import * as ordersController from './controllers/ordersController.js';
import * as whiteLabelController from './controllers/whiteLabelController.js';
import * as emailConfigController from './controllers/emailConfigController.js';
import * as aiController from './controllers/aiController.js';
import * as sseController from './controllers/sseController.js';
import * as exportController from './controllers/exportController.js';

// Importar middleware de auditoría
import auditLogger from './middleware/auditLogger.js';

dotenv.config();

import pool from './config/database.js';

// Manejar eventos de conexión del pool
pool.on('connect', () => {
  console.log('✅ Pool de base de datos listo');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de base de datos:', err);
  // No salir de la aplicación, solo registrar el error
  process.exitCode = 1;
});

// Intentar obtener una conexión inmediatamente para verificar
pool.connect((err, client, release) => {
  if (err) {
    console.error('⚠️  Error inicial de conexión:', err.message);
  } else {
    console.log('✅ Conexión exitosa a la base de datos');
    release();
  }
});

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares globales
app.use(cors({ origin: '*' })); // Permitir acceso del frontend desde cualquier origen
app.use(express.json());
app.use(morgan('dev'));
// Middleware de auditoría debe estar después de morgan pero antes de las rutas
app.use(auditLogger);

// Ruta de salud de la API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API Backend funcionando correctamente.' });
});

// Rutas de Autenticación (/api/auth)
const authRouter = express.Router();
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/profile', requireAuth, authController.getProfile);
app.use('/api/auth', authRouter);

// Rutas de Usuarios (/api/users)
const userRouter = express.Router();
userRouter.use(requireAuth); // Todas requieren autenticación
userRouter.get('/', isAdmin, userController.listUsers);
userRouter.post('/', isAdmin, userController.createUser);
userRouter.put('/:id', isAdmin, userController.updateUser);
userRouter.delete('/:id', isAdmin, userController.deleteUser);
userRouter.get('/locked', isAdmin, userController.listLockedUsers);
userRouter.post('/:id/unlock', isAdmin, userController.unlockUser);
userRouter.get('/2fa', isAdmin, userController.listUsers2FA);
app.use('/api/users', userRouter);

// Importar rutas de auditoría
import auditRoutes from './routes/auditRoutes.js';

// Rutas de Auditoría (/api/audit) - debe ir antes de otras rutas para evitar ser interceptada por el middleware de auditoría
app.use('/api/audit', auditRoutes);

// Importar rutas de backup
import backupRoutes from './routes/backupRoutes.js';

// Rutas de Backup (/api/backup)
app.use('/api/backup', backupRoutes);

// Rutas de Notificaciones (/api/notifications)
const notificationRouter = express.Router();
notificationRouter.use(requireAuth);
notificationRouter.get('/', notificationController.getUserNotifications);
notificationRouter.get('/unread-count', notificationController.getUnreadCount);
notificationRouter.put('/read-all', notificationController.markAllAsRead);
notificationRouter.put('/:id/read', notificationController.markAsRead);
notificationRouter.put('/:id/hide', notificationController.hideNotification);
notificationRouter.post('/', isAdmin, notificationController.createNotification);
app.use('/api/notifications', notificationRouter);

// Rutas de Datos (/api/data)
const dataRouter = express.Router();
dataRouter.use(requireAuth); // Todas requieren autenticación
dataRouter.get('/', dataController.getData);
dataRouter.post('/', dataController.crudOperation);
dataRouter.put('/', dataController.crudOperation);
dataRouter.delete('/', dataController.crudOperation);
dataRouter.post('/query', dataController.executeQuery);
dataRouter.get('/schema/:table', dataController.getTableSchema);
dataRouter.get('/tables', dataController.getTables);
app.use('/api/data', dataRouter);

// Rutas de Productos (/api/products)
const productRouter = express.Router();
productRouter.use(requireAuth);
productRouter.post('/', isAdmin, productsController.createProduct);
productRouter.get('/', isAdmin, productsController.getAllProducts);
productRouter.get('/:id', isAdmin, productsController.getProductById);
productRouter.put('/:id', isAdmin, productsController.updateProduct);
productRouter.delete('/:id', isAdmin, productsController.deleteProduct);
app.use('/api/products', productRouter);

// Rutas de Ajustes del Sistema (/api/settings)
const settingsRouter = express.Router();
settingsRouter.use(requireAuth);
settingsRouter.get('/', isAdmin, settingsController.listSettings);
settingsRouter.get('/:key', isAdmin, settingsController.getSetting);
settingsRouter.put('/:key', isAdmin, settingsController.updateSetting);
app.use('/api/settings', settingsRouter);

// Rutas de Agencias (/api/agencies)
const agenciesRouter = express.Router();
agenciesRouter.use(requireAuth);
agenciesRouter.get('/', agenciesController.listAgencies);
agenciesRouter.get('/:id', agenciesController.getAgency);
agenciesRouter.post('/', isAdmin, agenciesController.createAgency);
agenciesRouter.put('/:id', isAdmin, agenciesController.updateAgency);
agenciesRouter.delete('/:id', isAdmin, agenciesController.deleteAgency);
app.use('/api/agencies', agenciesRouter);

// Rutas de Reglas de Alerta (/api/alert-rules)
const alertRulesRouter = express.Router();
alertRulesRouter.use(requireAuth);
alertRulesRouter.get('/', isAgencyAdminOrAdmin, alertRulesController.listAlertRules);
alertRulesRouter.post('/', isAgencyAdminOrAdmin, alertRulesController.createAlertRule);
alertRulesRouter.get('/:id', isAgencyAdminOrAdmin, alertRulesController.getAlertRuleById);
alertRulesRouter.put('/:id', isAgencyAdminOrAdmin, alertRulesController.updateAlertRule);
alertRulesRouter.delete('/:id', isAdmin, alertRulesController.deleteAlertRule);
app.use('/api/alert-rules', alertRulesRouter);

// Rutas de Temas (/api/themes)
const themeRouter = express.Router();
themeRouter.use(requireAuth);
themeRouter.post('/', isAdmin, themesController.createTheme);
themeRouter.get('/', isAdmin, themesController.getAllThemes);
themeRouter.get('/:id', isAdmin, themesController.getThemeById);
themeRouter.put('/:id', isAdmin, themesController.updateTheme);
themeRouter.delete('/:id', isAdmin, themesController.deleteTheme);
app.use('/api/themes', themeRouter);

// Rutas de Ordenes (/api/orders)
const orderRouter = express.Router();
orderRouter.use(requireAuth);
orderRouter.post('/', ordersController.createReservation);
orderRouter.get('/', ordersController.getAllReservations);
orderRouter.get('/:id', ordersController.getReservationById);
orderRouter.put('/:id', isAdmin, ordersController.updateReservation);
orderRouter.post('/:id/confirm', isAdmin, ordersController.confirmReservation);
orderRouter.post('/:id/resend-email', ordersController.resendReservationEmail);
orderRouter.delete('/:id', isAdmin, ordersController.deleteReservation);
app.use('/api/orders', orderRouter);

// Rutas de White Label (/api/white-label)
const whiteLabelRouter = express.Router();
whiteLabelRouter.use(requireAuth);
whiteLabelRouter.get('/config', whiteLabelController.getConfig);
whiteLabelRouter.post('/config', isAdmin, whiteLabelController.createConfig);
whiteLabelRouter.put('/config/:id', isAgencyAdminOrAdmin, whiteLabelController.updateConfig);
whiteLabelRouter.delete('/config/:id', isAdmin, whiteLabelController.deleteConfig);
whiteLabelRouter.get('/presets', whiteLabelController.getPresets);
whiteLabelRouter.get('/fonts', whiteLabelController.getFonts);
whiteLabelRouter.get('/buttons', whiteLabelController.getButtons);
whiteLabelRouter.get('/export/:id', isAdmin, whiteLabelController.exportConfig);
whiteLabelRouter.post('/import', isAdmin, whiteLabelController.importConfig);
app.use('/api/white-label', whiteLabelRouter);

// Rutas de Configuración de Email (/api/email-config)
const emailConfigRouter = express.Router();
emailConfigRouter.use(requireAuth);
emailConfigRouter.get('/config', isAgencyAdminOrAdmin, emailConfigController.getConfig);
emailConfigRouter.post('/config', isAgencyAdminOrAdmin, emailConfigController.createConfig);
emailConfigRouter.put('/config/:id', isAgencyAdminOrAdmin, emailConfigController.updateConfig);
emailConfigRouter.delete('/config/:id', isAgencyAdminOrAdmin, emailConfigController.deleteConfig);
emailConfigRouter.post('/test', isAgencyAdminOrAdmin, emailConfigController.testConnection);
emailConfigRouter.post('/send-test', isAgencyAdminOrAdmin, emailConfigController.sendTestEmail);
emailConfigRouter.get('/templates', isAgencyAdminOrAdmin, emailConfigController.getTemplates);
emailConfigRouter.put('/templates/:id', isAgencyAdminOrAdmin, emailConfigController.updateTemplate);
app.use('/api/email-config', emailConfigRouter);

// Rutas de Inteligencia Artificial (/api/ai)
const aiRouter = express.Router();
aiRouter.use(requireAuth);
// Chat y sesiones
aiRouter.post('/chat', aiController.chat);
aiRouter.get('/sessions', aiController.getSessions);
aiRouter.get('/sessions/:id/messages', aiController.getSessionMessages);
aiRouter.delete('/sessions/:id', aiController.deleteSession);
aiRouter.put('/sessions/:id/title', aiController.updateSessionTitle);
// Acciones disponibles
aiRouter.get('/actions', aiController.getActions);
// Rutas admin - proveedores
aiRouter.get('/providers', isAdmin, aiController.getProviders);
aiRouter.get('/providers/:id', isAdmin, aiController.getProviderById);
aiRouter.post('/providers', isAdmin, aiController.createProvider);
aiRouter.put('/providers/:id', isAdmin, aiController.updateProvider);
aiRouter.delete('/providers/:id', isAdmin, aiController.deleteProvider);
aiRouter.post('/providers/:id/test', isAdmin, aiController.testProvider);
// Rutas admin - acciones
aiRouter.post('/actions', isAdmin, aiController.createAction);
aiRouter.put('/actions/:id', isAdmin, aiController.updateAction);
aiRouter.delete('/actions/:id', isAdmin, aiController.deleteAction);
// Rutas admin - estadísticas y logs
aiRouter.get('/stats', isAdmin, aiController.getStats);
aiRouter.get('/logs', isAdmin, aiController.getLogs);
app.use('/api/ai', aiRouter);

// Rutas de Exportación de Datos (/api/export)
const exportRouter = express.Router();
exportRouter.use(requireAuth);
exportRouter.get('/csv/:entityType', (req, res, next) => exportController.exportCSV(req, res).catch(next));
exportRouter.get('/excel/:entityType', (req, res, next) => exportController.exportExcel(req, res).catch(next));
exportRouter.get('/pdf/:entityType', (req, res, next) => exportController.exportPDF(req, res).catch(next));
exportRouter.get('/stats', (req, res, next) => exportController.getExportStats(req, res).catch(next));
app.use('/api/export', exportRouter);

// Rutas de Notificaciones en Tiempo Real (SSE) (/api/sse)
const sseRouter = express.Router();
sseRouter.get('/connect', requireAuth, sseController.connect);
sseRouter.post('/notify-user', isAdmin, sseController.notifyUser);
sseRouter.post('/notify-admins', isAdmin, sseController.notifyAdmins);
sseRouter.post('/notify-agency', isAgencyAdminOrAdmin, sseController.notifyAgency);
sseRouter.get('/stats', isAdmin, sseController.getStats);
sseRouter.post('/notify-reservation', requireAuth, sseController.notifyReservation);
sseRouter.post('/notify-product', requireAuth, sseController.notifyProduct);
app.use('/api/sse', sseRouter);

// Endpoint interno para cron de expiración de bloqueos
const internalRouter = express.Router();
internalRouter.post('/cron/expirar-bloqueos', requireInternalToken, ordersController.expireReservationsViaCron);
app.use('/internal', internalRouter);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error('💥 Error no controlado en Express:', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Ocurrió un error en el servidor.', details: err.details || 'Detalles no disponibles' });
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`);
  console.log(`📡 URL Base de la API: http://localhost:${PORT}/api`);
});