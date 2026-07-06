import { Router } from 'express';
import { listUsers, createUser, updateUser, deleteUser, listLockedUsers, unlockUser, listUsers2FA } from '../controllers/userController.js';

const router = Router();

// Listar todos los usuarios (con paginación, filtros y orden)
router.get('/', listUsers);

// Crear un nuevo usuario
router.post('/', createUser);

// Actualizar un usuario existente
router.put('/:id', updateUser);

// Eliminar un usuario
router.delete('/:id', deleteUser);

// Listar usuarios bloqueados
router.get('/locked', listLockedUsers);

// Desbloquear un usuario
router.post('/:id/unlock', unlockUser);

// Listar usuarios con 2FA activo
router.get('/2fa', listUsers2FA);

export default router;
