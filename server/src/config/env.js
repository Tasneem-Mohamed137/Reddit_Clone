import 'dotenv/config';

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

const text = (key, fallback = '') => (process.env[key] ?? fallback).trim();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  isProd: process.env.NODE_ENV === 'production',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  // MongoDB is the only database. The URI comes from Atlas ("Connect" -> "Drivers").
  mongoUri: required('MONGODB_URI'),
  mongoDbName: text('MONGODB_DB_NAME', 'reddit_clone') || 'reddit_clone',
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20), // register/login attempts per minute per IP
  ai: {
    // Lower-cased and trimmed, so "Gemini " in .env still works.
    provider: text('AI_PROVIDER', 'mock').toLowerCase() || 'mock',
    apiKey: text('AI_API_KEY'),
    model: text('AI_MODEL'),
  },
};