import { notificationService } from '../services/notification.service.js';

export const notificationController = {
  async list(req, res) {
    res.json({
      items: await notificationService.list(req.userId),
      unreadCount: await notificationService.unreadCount(req.userId),
    });
  },
  async unreadCount(req, res) {
    res.json({ count: await notificationService.unreadCount(req.userId) });
  },
  async readAll(req, res) {
    await notificationService.markAllRead(req.userId);
    res.status(204).end();
  },
};