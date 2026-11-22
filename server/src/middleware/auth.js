import { AppError } from '../utils/AppError.js';
import { COOKIE_NAME, verifyAccessToken } from '../utils/token.js';

const readUserId = (req) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return verifyAccessToken(token).sub;
  } catch {
    return null;
  }
};

export const requireAuth = (req, _res, next) => {
  const userId = readUserId(req);
  if (!userId) return next(AppError.unauthorized());
  req.userId = userId;
  next();
};

export const optionalAuth = (req, _res, next) => {
  req.userId = readUserId(req);
  next();
};