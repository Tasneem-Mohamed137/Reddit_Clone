import { Router } from 'express';
import { commentController } from '../controllers/comment.controller.js';
import { postActionController } from '../controllers/postAction.controller.js';
import { postController } from '../controllers/post.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { commentsQuerySchema, createCommentSchema } from '../services/comment.service.js';
import { feedQuerySchema, updatePostSchema } from '../services/post.service.js';
import { reportSchema } from '../services/postAction.service.js';
import { voteSchema } from '../services/vote.service.js';

export const postRouter = Router();

postRouter.get('/', optionalAuth, validate(feedQuerySchema, 'query'), postController.popular);
postRouter.get('/:id', optionalAuth, postController.get);
postRouter.patch('/:id', requireAuth, validate(updatePostSchema), postController.update);
postRouter.delete('/:id', requireAuth, postController.remove);
postRouter.put('/:id/vote', requireAuth, validate(voteSchema), postController.vote);

postRouter.put('/:id/save', requireAuth, postActionController.save);
postRouter.delete('/:id/save', requireAuth, postActionController.unsave);
postRouter.put('/:id/hide', requireAuth, postActionController.hide);
postRouter.delete('/:id/hide', requireAuth, postActionController.unhide);
postRouter.post('/:id/report', requireAuth, validate(reportSchema), postActionController.report);
postRouter.put('/:id/pin', requireAuth, postActionController.pin);
postRouter.delete('/:id/pin', requireAuth, postActionController.unpin);

postRouter.get('/:id/comments', optionalAuth, validate(commentsQuerySchema, 'query'), commentController.listByPost);
postRouter.post('/:id/comments', requireAuth, validate(createCommentSchema), commentController.create);
// 5 summaries per minute per user: each call may cost money on the AI provider.
postRouter.post('/:id/summarize', requireAuth, rateLimit({ windowMs: 60_000, max: 5 }), postController.summarize);