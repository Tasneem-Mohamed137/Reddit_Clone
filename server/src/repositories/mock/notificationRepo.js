import { randomUUID } from 'node:crypto';
import { getDb, persist } from './store.js';

export const notificationRepo = {
  async create({ userId, type, actorId, postId = null, commentId = null }) {
    const notification = {
      id: randomUUID(),
      userId, // the person who receives it
      type,
      actorId, // the person who caused it
      postId,
      commentId,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    getDb().notifications.push(notification);
    persist();
    return notification;
  },

  // Newest first. Rows are stored in creation order, so reversing gives the newest first.
  async listForUser(userId, limit = 50) {
    return getDb()
      .notifications.filter((n) => n.userId === userId)
      .reverse()
      .slice(0, limit);
  },

  async countUnread(userId) {
    return getDb().notifications.filter((n) => n.userId === userId && !n.readAt).length;
  },

  async markAllRead(userId) {
    const now = new Date().toISOString();
    let changed = false;
    for (const n of getDb().notifications) {
      if (n.userId === userId && !n.readAt) {
        n.readAt = now;
        changed = true;
      }
    }
    if (changed) persist();
  },
};