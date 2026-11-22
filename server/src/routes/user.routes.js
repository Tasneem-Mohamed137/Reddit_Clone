import { Router } from 'express';
import { communityController } from '../controllers/community.controller.js';
import { postController } from '../controllers/post.controller.js';
import { socialController } from '../controllers/social.controller.js';
import { userController } from '../controllers/user.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { feedQuerySchema } from '../services/post.service.js';
import { suggestionsQuerySchema } from '../services/social.service.js';
import { updateProfileSchema } from '../services/user.service.js';

export const userRouter = Router();

// "/me/..." routes MUST be declared before "/:username", otherwise "me" is read as a username.
userRouter.get('/me/communities', requireAuth, communityController.listJoined);
userRouter.get('/me/suggestions', requireAuth, validate(suggestionsQuerySchema, 'query'), socialController.suggestions);
userRouter.get('/me/following', requireAuth, socialController.following);
userRouter.get('/me/followers', requireAuth, socialController.followers);
userRouter.patch('/me', requireAuth, validate(updateProfileSchema), userController.updateMe);

userRouter.get('/:username', optionalAuth, userController.get);
userRouter.post('/:username/follow', requireAuth, socialController.follow);
userRouter.delete('/:username/follow', requireAuth, socialController.unfollow);
userRouter.get('/:username/posts', optionalAuth, validate(feedQuerySchema, 'query'), postController.listByUser);
userRouter.get('/:username/comments', userController.comments);