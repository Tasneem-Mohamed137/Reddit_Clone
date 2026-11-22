import { uploadService } from '../services/upload.service.js';

export const uploadController = {
  async create(req, res) {
    res.status(201).json({ items: await uploadService.publish(req.files ?? []) });
  },
};