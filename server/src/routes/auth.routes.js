import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, usernameQuerySchema } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
authRouter.get('/username-available', validate(usernameQuerySchema, 'query'), authController.usernameAvailable);