import { Router } from 'express';
import * as stockController from '../controllers/stockController';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { stockMovementSchema, stockMovementQuerySchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/movements',
  authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTS'),
  validateQuery(stockMovementQuerySchema),
  stockController.list
);
router.post(
  '/movements',
  authorize('ADMIN', 'WAREHOUSE'),
  validateBody(stockMovementSchema),
  stockController.create
);

export default router;
