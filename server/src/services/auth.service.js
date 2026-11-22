import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { userRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { signAccessToken } from '../utils/token.js';

export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  username: z.string().trim().regex(/^[A-Za-z0-9_-]{3,20}$/, '3-20 characters: letters, numbers, _ or -'),
  password: z.string().min(8, 'At least 8 characters').max(72),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export const usernameQuerySchema = z.object({ username: z.string().trim().min(1) });

export const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  karma: user.karma,
  createdAt: user.createdAt,
});

export const toSelf = (user) => ({ ...toPublicUser(user), email: user.email });

export const authService = {
  async register({ email, username, password }) {
    if (await userRepo.findByEmail(email)) throw AppError.conflict('Email is already registered');
    if (await userRepo.usernameExists(username)) throw AppError.conflict('Username is already taken');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepo.create({ email, username, passwordHash });
    return { user: toSelf(user), token: signAccessToken(user.id) };
  },

  async login({ identifier, password }) {
    const user = identifier.includes('@')
      ? await userRepo.findByEmail(identifier)
      : await userRepo.findByUsername(identifier);

    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect username/email or password');

    return { user: toSelf(user), token: signAccessToken(user.id) };
  },

  async getSelf(userId) {
    const user = await userRepo.findById(userId);
    if (!user) throw AppError.unauthorized('Account no longer exists');
    return toSelf(user);
  },

  async isUsernameAvailable(username) {
    return !(await userRepo.usernameExists(username));
  },
};