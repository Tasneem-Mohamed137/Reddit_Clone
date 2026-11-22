import fs from 'node:fs/promises';
import { AppError } from '../utils/AppError.js';
import { MAX_IMAGE_BYTES } from '../middleware/upload.js';

const removeFiles = (files) => Promise.all(files.map((file) => fs.rm(file.path, { force: true })));

export const uploadService = {
  // Turns the files multer saved into API objects. Rejected batches are deleted from disk.
  // To move to cloud storage (S3/Cloudinary) only this file and middleware/upload.js change.
  async publish(files) {
    if (files.length === 0) throw AppError.badRequest('No files uploaded', 'UPLOAD_ERROR');

    const oversizedImage = files.find((f) => f.mimetype.startsWith('image/') && f.size > MAX_IMAGE_BYTES);
    if (oversizedImage) {
      await removeFiles(files);
      throw new AppError(413, 'UPLOAD_ERROR', 'Images must be 10 MB or smaller');
    }

    return files.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      size: file.size,
    }));
  },
};