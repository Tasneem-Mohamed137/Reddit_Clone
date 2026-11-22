import { Router } from 'express';
import { commentController } from '../controllers/comment.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCommentSchema } from '../services/comment.service.js';
import { voteSchema } from '../services/vote.service.js';

export const commentRouter = Router();

commentRouter.post('/:id/replies', requireAuth, validate(createCommentSchema), commentController.reply);
commentRouter.put('/:id/vote', requireAuth, validate(voteSchema), commentController.vote);
commentRouter.patch('/:id', requireAuth, validate(createCommentSchema), commentController.update);
commentRouter.delete('/:id', requireAuth, commentController.remove);