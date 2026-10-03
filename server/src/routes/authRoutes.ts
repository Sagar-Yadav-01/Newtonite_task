import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

// Public auth endpoints
router.post('/auth/register', authLimiter, AuthController.register);
router.post('/auth/login', authLimiter, AuthController.login);
router.post('/auth/logout', AuthController.logout);

// Protected endpoints
router.use(authenticate);
router.get('/auth/me', AuthController.getMe);
router.get('/users', AuthController.getUsers);
router.get('/users/:id', AuthController.getUserById);
router.patch('/users/:id', AuthController.updateUser);

export default router;
