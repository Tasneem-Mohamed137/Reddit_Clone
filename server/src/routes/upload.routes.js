import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { handleUpload } from '../middleware/upload.js';

export const uploadRouter = Router();

// Auth and rate limit run BEFORE multer, so anonymous users never get to write files to disk.
uploadRouter.post('/', requireAuth, rateLimit({ windowMs: 60_000, max: 20 }), handleUpload, uploadController.create);