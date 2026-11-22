import { authService } from '../services/auth.service.js';
import { COOKIE_NAME, cookieOptions } from '../utils/token.js';

export const authController = {
  async register(req, res) {
    const { user, token } = await authService.register(req.body);
    res.cookie(COOKIE_NAME, token, cookieOptions).status(201).json({ user });
  },

  async login(req, res) {
    const { user, token } = await authService.login(req.body);
    res.cookie(COOKIE_NAME, token, cookieOptions).json({ user });
  },

  logout(_req, res) {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined }).status(204).end();
  },

  async me(req, res) {
    res.json({ user: await authService.getSelf(req.userId) });
  },

  async usernameAvailable(req, res) {
    res.json({ available: await authService.isUsernameAvailable(req.query.username) });
  },
};