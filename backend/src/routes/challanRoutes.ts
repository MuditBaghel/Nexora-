import { Router } from 'express';
import * as challanController from '../controllers/challanController';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { challanSchema, challanQuerySchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'SALES', 'ACCOUNTS'),
  validateQuery(challanQuerySchema),
  challanController.list
);
router.get(
  '/:id',
  authorize('ADMIN', 'SALES', 'ACCOUNTS'),
  challanController.getById
);
router.post(
  '/',
  authorize('ADMIN', 'SALES'),
  validateBody(challanSchema),
  challanController.create
);
router.post(
  '/:id/confirm',
  authorize('ADMIN', 'SALES'),
  challanController.confirm
);
router.post(
  '/:id/cancel',
  authorize('ADMIN', 'SALES'),
  challanController.cancel
);

export default router;
