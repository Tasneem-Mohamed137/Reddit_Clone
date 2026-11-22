import { Router } from 'express';
import { postController } from '../controllers/post.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { feedQuerySchema } from '../services/post.service.js';
import { authRouter } from './auth.routes.js';
import { chatRouter } from './chat.routes.js';
import { commentRouter } from './comment.routes.js';
import { communityRouter } from './community.routes.js';
import { postRouter } from './post.routes.js';
import { searchRouter } from './search.routes.js';
import { uploadRouter } from './upload.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/communities', communityRouter);
apiRouter.use('/posts', postRouter);
apiRouter.use('/comments', commentRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/chats', chatRouter);
apiRouter.get('/feed', optionalAuth, validate(feedQuerySchema, 'query'), postController.feed);