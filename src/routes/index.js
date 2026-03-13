import { Router } from 'express';
import userRoutes from './userRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';

const router = Router();

router.use('/v1', userRoutes);
router.use('/v1', categoryRoutes);
router.use('/v1', productRoutes);

export default router;