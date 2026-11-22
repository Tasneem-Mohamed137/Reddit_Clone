import { commentService } from '../services/comment.service.js';
import { voteService } from '../services/vote.service.js';

export const commentController = {
  async listByPost(req, res) {
    res.json({ items: await commentService.listByPost(req.params.id, req.query.sort, req.userId) });
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
  async vote(req, res) {
    res.json(await voteService.voteComment(req.userId, req.params.id, req.body.value));
  },
};