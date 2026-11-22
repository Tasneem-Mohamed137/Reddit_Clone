import { chatService } from '../services/chat.service.js';

export const chatController = {
  async list(req, res) {
    res.json({ items: await chatService.list(req.userId) });
  },
  async open(req, res) {
    res.json({ chat: await chatService.open(req.userId, req.body.usernames) });
  },
  async messages(req, res) {
    res.json(await chatService.messages(req.userId, req.params.id, req.query));
  },
  async send(req, res) {
    res.status(201).json({ message: await chatService.send(req.userId, req.params.id, req.body.body) });
  },
  async markRead(req, res) {
    await chatService.markRead(req.userId, req.params.id);
    res.status(204).end();
  },
};