import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'access_token';

export const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};