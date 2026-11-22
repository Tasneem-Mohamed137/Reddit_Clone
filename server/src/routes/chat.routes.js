import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { createChatSchema, messagesQuerySchema, sendMessageSchema } from '../services/chat.service.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);
chatRouter.get('/', chatController.list);
chatRouter.post('/', validate(createChatSchema), chatController.open);
chatRouter.get('/:id/messages', validate(messagesQuerySchema, 'query'), chatController.messages);
chatRouter.post('/:id/messages', rateLimit({ windowMs: 10_000, max: 20 }), validate(sendMessageSchema), chatController.send);
chatRouter.post('/:id/read', chatController.markRead);