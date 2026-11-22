import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { validate } from '../middleware/validate.js';
import { searchSchema } from '../services/search.service.js';

export const searchRouter = Router();

searchRouter.get('/', validate(searchSchema, 'query'), searchController.search);