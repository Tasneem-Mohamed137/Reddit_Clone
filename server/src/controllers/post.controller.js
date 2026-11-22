import { aiService } from '../services/ai.service.js';
import { postService } from '../services/post.service.js';
import { voteService } from '../services/vote.service.js';

export const postController = {
  async popular(req, res) {
    res.json(await postService.popular(req.query, req.userId));
  },
  async feed(req, res) {
    res.json(await postService.feed(req.query, req.userId));
  },
  async listByCommunity(req, res) {
    res.json(await postService.listByCommunity(req.params.name, req.query, req.userId));
  },
  async listByUser(req, res) {
    res.json(await postService.listByUser(req.params.username, req.query, req.userId));
  },
  async create(req, res) {
    res.status(201).json({ post: await postService.create(req.userId, req.params.name, req.body) });
  },
  async get(req, res) {
    res.json({ post: await postService.get(req.params.id, req.userId) });
  },
  async update(req, res) {
    res.json({ post: await postService.update(req.params.id, req.userId, req.body) });
  },
  async remove(req, res) {
    await postService.remove(req.params.id, req.userId);
    res.status(204).end();
  },
  async vote(req, res) {
    res.json(await voteService.vote(req.userId, req.params.id, req.body.value));
  },
  async summarize(req, res) {
    res.json(await aiService.summarize(req.params.id));
  },
};