import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { productSchema, productUpdateSchema, productQuerySchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  validateQuery(productQuerySchema),
  productController.list
);
router.get(
  '/:id',
  authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'),
  productController.getById
);
router.post(
  '/',
  authorize('ADMIN', 'WAREHOUSE'),
  validateBody(productSchema),
  productController.create
);
router.put(
  '/:id',
  authorize('ADMIN', 'WAREHOUSE'),
  validateBody(productUpdateSchema),
  productController.update
);

export default router;
