import { socialService } from '../services/social.service.js';

export const socialController = {
  async follow(req, res) {
    res.json(await socialService.follow(req.userId, req.params.username));
  },
  async unfollow(req, res) {
    res.json(await socialService.unfollow(req.userId, req.params.username));
  },
  async suggestions(req, res) {
    res.json({ items: await socialService.suggestions(req.userId, req.query.limit) });
  },
  async following(req, res) {
    res.json({ items: await socialService.listConnections(req.userId, 'following') });
  },
  async followers(req, res) {
    res.json({ items: await socialService.listConnections(req.userId, 'followers') });
  },
};