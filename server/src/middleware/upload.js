import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The stored extension comes from the MIME type, NEVER from the client's file name.
// Otherwise someone could upload "evil.html" labelled as an image and have it served as a web page.
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}.${ALLOWED[file.mimetype]}`),
  }),
  // multer has one size limit for all files; the stricter image limit is checked in upload.service.js.
  limits: { fileSize: MAX_VIDEO_BYTES, files: 10 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype]
      ? cb(null, true)
      : cb(AppError.badRequest('Only JPG, PNG, GIF, WEBP, MP4, WEBM or MOV files are allowed', 'UNSUPPORTED_FILE_TYPE')),
}).array('files', 10);

// Wraps multer so its errors use our { error: { code, message } } format.
export const handleUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      const message = tooBig
        ? 'File is too large (images up to 10 MB, videos up to 50 MB)'
        : 'Upload at most 10 files, using the "files" field';
      return next(new AppError(tooBig ? 413 : 400, 'UPLOAD_ERROR', message));
    }
    return next(err);
  });