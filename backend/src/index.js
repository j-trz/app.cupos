import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as themesController from './controllers/themesController.js';
import * as productsController from './controllers/productsController.js';
import dotenv from 'dotenv';

// Importar middlewares de autenticación
import { requireAuth, isAdmin, isAgencyAdminOrAdmin } from './middleware/auth.js';

// Importar controladores
import * as authController from './controllers/authController.js';
import * as userController from './controllers/userController.js';
import * as connectionController from './controllers/connectionController.js';
import * as notificationController from './controllers/notificationController.js';
import * as dataController from './controllers/dataController.js';
import * as ordersController from './controllers/ordersController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares globales
app.use(cors({ origin: '*' })); // Permitir acceso del frontend desde cualquier origen
app.use(express.json());
app.use(morgan('dev'));

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

// Rutas de Productos (/api/products)
const productRouter = express.Router();
productRouter.use(requireAuth);
productRouter.post('/', isAdmin, productsController.createProduct);
productRouter.get('/', isAdmin, productsController.getAllProducts);
productRouter.get('/:id', isAdmin, productsController.getProductById);
productRouter.put('/:id', isAdmin, productsController.updateProduct);
productRouter.delete('/:id', isAdmin, productsController.deleteProduct);
app.use('/api/products', productRouter);

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
orderRouter.post('/', isAdmin, ordersController.createReservation);
orderRouter.get('/', isAdmin, ordersController.getAllReservations);
orderRouter.get('/:id', isAdmin, ordersController.getReservationById);
orderRouter.put('/:id', isAdmin, ordersController.updateReservation);
orderRouter.delete('/:id', isAdmin, ordersController.deleteReservation);
app.use('/api/orders', orderRouter);

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
