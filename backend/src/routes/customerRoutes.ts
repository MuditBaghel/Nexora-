import { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  customerSchema,
  customerUpdateSchema,
  customerQuerySchema,
  followupSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'SALES', 'ACCOUNTS'),
  validateQuery(customerQuerySchema),
  customerController.list
);
router.get(
  '/:id',
  authorize('ADMIN', 'SALES', 'ACCOUNTS'),
  customerController.getById
);
router.post(
  '/',
  authorize('ADMIN', 'SALES'),
  validateBody(customerSchema),
  customerController.create
);
router.put(
  '/:id',
  authorize('ADMIN', 'SALES'),
  validateBody(customerUpdateSchema),
  customerController.update
);
router.delete('/:id', authorize('ADMIN'), customerController.remove);

router.get(
  '/:id/followups',
  authorize('ADMIN', 'SALES', 'ACCOUNTS'),
  customerController.listFollowups
);
router.post(
  '/:id/followups',
  authorize('ADMIN', 'SALES'),
  validateBody(followupSchema),
  customerController.addFollowup
);

export default router;
