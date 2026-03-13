import { Router } from 'express';
import { createUser, deleteUser, getUserById, updateUser } from '../controllers/UserController.js';
import { createToken } from '../controllers/AuthController.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

router.get('/user/:id', getUserById);
router.post('/user', createUser);
router.post('/user/token', createToken);
router.put('/user/:id', authMiddleware, updateUser);
router.delete('/user/:id', authMiddleware, deleteUser);

export default router;