import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  searchCategories,
  updateCategory
} from '../controllers/CategoryController.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

router.get('/category/search', searchCategories);
router.get('/category/:id', getCategoryById);
router.post('/category', authMiddleware, createCategory);
router.put('/category/:id', authMiddleware, updateCategory);
router.delete('/category/:id', authMiddleware, deleteCategory);

export default router;