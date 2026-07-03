import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Importar middlewares de autenticación
import { requireAuth, isAdmin, isAgencyAdminOrAdmin } from './middleware/auth.js';

// Importar controladores
import * as authController from './controllers/authController.js';
import * as userController from './controllers/userController.js';
import * as connectionController from './controllers/connectionController.js';
import * as notificationController from './controllers/notificationController.js';
import * as dataController from './controllers/dataController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares globales
app.use(cors({ origin: '*' })); // Permitir acceso del frontend desde cualquier origen
app.use(express.json());
app.use(morgan('dev'));

// Ruta de salud de la API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API Backend flexible funcionando correctamente.' });
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

// Rutas de Conexiones (/api/connections)
const connectionRouter = express.Router();
connectionRouter.use(requireAuth);
connectionRouter.get('/', connectionController.listConnections);
connectionRouter.post('/', isAdmin, connectionController.createConnection);
connectionRouter.delete('/:id', isAdmin, connectionController.deleteConnection);
connectionRouter.post('/:id/activate', isAdmin, connectionController.activateConnection);
connectionRouter.post('/:id/test', isAdmin, connectionController.testConnection);
app.use('/api/connections', connectionRouter);


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

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error('💥 Error no controlado en Express:', err.stack);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.', details: err.message });
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend flexible escuchando en el puerto ${PORT}`);
  console.log(`📡 URL Base de la API: http://localhost:${PORT}/api`);
});
