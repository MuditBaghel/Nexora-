import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators/schemas';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(rateLimit({ windowMs: 60_000, max: 60, message: 'Too many requests. Please try again later.' }));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 */
router.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 10, message: 'Too many login attempts. Try again in a minute.' }),
  validateBody(loginSchema),
  authController.login
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh the access token using the httpOnly refresh cookie
 *     tags: [Authentication]
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Revoke the session and clear the refresh cookie
 *     tags: [Authentication]
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, authController.me);

export default router;
