import { Router } from 'express';
import { commentController } from '../controllers/comment.controller.js';
import { postController } from '../controllers/post.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { commentsQuerySchema, createCommentSchema } from '../services/comment.service.js';
import { feedQuerySchema, updatePostSchema } from '../services/post.service.js';
import { voteSchema } from '../services/vote.service.js';

export const postRouter = Router();

postRouter.get('/', optionalAuth, validate(feedQuerySchema, 'query'), postController.popular);
postRouter.get('/:id', optionalAuth, postController.get);
postRouter.patch('/:id', requireAuth, validate(updatePostSchema), postController.update);
postRouter.delete('/:id', requireAuth, postController.remove);
postRouter.put('/:id/vote', requireAuth, validate(voteSchema), postController.vote);
postRouter.get('/:id/comments', validate(commentsQuerySchema, 'query'), commentController.listByPost);
postRouter.post('/:id/comments', requireAuth, validate(createCommentSchema), commentController.create);
// 5 summaries per minute per user: each call may cost money on the AI provider.
postRouter.post('/:id/summarize', requireAuth, rateLimit({ windowMs: 60_000, max: 5 }), postController.summarize);