import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { searchSchema } from '../services/search.service.js';

export const searchRouter = Router();

searchRouter.get('/', optionalAuth, validate(searchSchema, 'query'), searchController.search);