import { AppError } from '../utils/AppError.js';

// Sliding-window limiter kept in memory (enough for one server instance).
// Keyed by user id when logged in, otherwise by IP.
export const rateLimit = ({ windowMs, max }) => {
  const hits = new Map();
  return (req, _res, next) => {
    const key = req.userId ?? req.ip;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= max) {
      return next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again in a minute'));
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
};