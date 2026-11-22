import { communityService } from '../services/community.service.js';

export const communityController = {
  async list(req, res) {
    res.json({ items: await communityService.list(req.query.limit) });
  },
  async create(req, res) {
    res.status(201).json({ community: await communityService.create(req.userId, req.body) });
  },
  async get(req, res) {
    res.json({ community: await communityService.getByName(req.params.name, req.userId) });
  },
  async join(req, res) {
    res.json({ community: await communityService.join(req.params.name, req.userId) });
  },
  async leave(req, res) {
    res.json({ community: await communityService.leave(req.params.name, req.userId) });
  },
  async listJoined(req, res) {
    res.json({ items: await communityService.listJoined(req.userId) });
  },
};