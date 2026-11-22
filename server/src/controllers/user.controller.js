import { userService } from '../services/user.service.js';

export const userController = {
  async get(req, res) {
    res.json({ user: await userService.getProfile(req.params.username, req.userId) });
  },
  async updateMe(req, res) {
    res.json({ user: await userService.updateMe(req.userId, req.body) });
  },
  async comments(req, res) {
    res.json({ items: await userService.listComments(req.params.username) });
  },
};