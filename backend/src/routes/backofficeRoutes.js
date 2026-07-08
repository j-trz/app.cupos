import express from 'express';
import { importarPasajeros } from '../controllers/backofficeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Rutas protegidas de backoffice
router.get('/importar-pasajeros', requireAuth, importarPasajeros);

export default router;
