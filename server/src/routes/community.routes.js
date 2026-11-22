import { Router } from 'express';
import { communityController } from '../controllers/community.controller.js';
import { postActionController } from '../controllers/postAction.controller.js';
import { postController } from '../controllers/post.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCommunitySchema, listCommunitiesSchema, updateCommunitySchema } from '../services/community.service.js';
import { createPostSchema, feedQuerySchema } from '../services/post.service.js';

export const communityRouter = Router();

communityRouter.get('/', validate(listCommunitiesSchema, 'query'), communityController.list);
communityRouter.post('/', requireAuth, validate(createCommunitySchema), communityController.create);
communityRouter.get('/:name', optionalAuth, communityController.get);
communityRouter.patch('/:name', requireAuth, validate(updateCommunitySchema), communityController.update);
communityRouter.post('/:name/membership', requireAuth, communityController.join);
communityRouter.delete('/:name/membership', requireAuth, communityController.leave);
communityRouter.get('/:name/reports', requireAuth, postActionController.reports);
communityRouter.get('/:name/posts', optionalAuth, validate(feedQuerySchema, 'query'), postController.listByCommunity);
communityRouter.post('/:name/posts', requireAuth, validate(createPostSchema), postController.create);