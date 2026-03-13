import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  searchProducts,
  updateProduct
} from '../controllers/ProductController.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

router.get('/product/search', searchProducts);
router.get('/product/:id', getProductById);
router.post('/product', authMiddleware, createProduct);
router.put('/product/:id', authMiddleware, updateProduct);
router.delete('/product/:id', authMiddleware, deleteProduct);

export default router;