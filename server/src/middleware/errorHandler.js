import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export const notFound = (_req, _res, next) => next(AppError.notFound('Route not found'));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};