import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);
notificationRouter.get('/', notificationController.list);
notificationRouter.get('/unread-count', notificationController.unreadCount);
notificationRouter.post('/read-all', notificationController.readAll);