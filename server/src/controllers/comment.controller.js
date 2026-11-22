import { commentService } from '../services/comment.service.js';

export const commentController = {
  async listByPost(req, res) {
    res.json({ items: await commentService.listByPost(req.params.id, req.query.sort) });
  },
  async create(req, res) {
    res.status(201).json({ comment: await commentService.create(req.userId, req.params.id, req.body.body) });
  },
  async reply(req, res) {
    res.status(201).json({ comment: await commentService.reply(req.userId, req.params.id, req.body.body) });
  },
  async update(req, res) {
    res.json({ comment: await commentService.update(req.userId, req.params.id, req.body.body) });
  },
  async remove(req, res) {
    await commentService.remove(req.userId, req.params.id);
    res.status(204).end();
  },
};