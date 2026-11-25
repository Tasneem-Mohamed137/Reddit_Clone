import { Notification } from './models.js';
import { toRecord, toRecords } from './record.js';

export const notificationRepo = {
  async create({ userId, type, actorId, postId = null, commentId = null }) {
    return toRecord(await Notification.create({ userId, type, actorId, postId, commentId }));
  },

  // Newest first; _id breaks ties between notifications created in the same millisecond.
  async listForUser(userId, limit = 50) {
    return toRecords(await Notification.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean());
  },

  async countUnread(userId) {
    return Notification.countDocuments({ userId, readAt: null });
  },

  // One updateMany instead of a loop: a single round trip, whatever the number of notifications.
  async markAllRead(userId) {
    await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  },
};
