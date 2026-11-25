import { isDuplicateKey } from './connection.js';
import { Hide, newId, Report, Save } from './models.js';
import { toRecords } from './record.js';

// Turns a per-user flag on (idempotent upsert) or off (delete). Unique (userId, postId) per collection.
const setFlag = async (Model, userId, postId, on) => {
  if (!on) {
    await Model.deleteOne({ userId, postId });
    return;
  }
  try {
    await Model.updateOne({ userId, postId }, { $setOnInsert: { _id: newId(), createdAt: new Date() } }, { upsert: true });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
  }
};

// What one user did with a post: saved it, hid it, reported it.
export const userPostRepo = {
  setSaved: (userId, postId, saved) => setFlag(Save, userId, postId, saved),
  setHidden: (userId, postId, hidden) => setFlag(Hide, userId, postId, hidden),

  async listSavedIds(userId) {
    return Save.find({ userId }).distinct('postId');
  },
  async listHiddenIds(userId) {
    return Hide.find({ userId }).distinct('postId');
  },
  async savedAmong(userId, postIds) {
    return Save.find({ userId, postId: { $in: postIds } }).distinct('postId');
  },

  // Returns false when this user already reported this post (the unique index says so).
  async report({ userId, postId, reason }) {
    try {
      await Report.create({ userId, postId, reason });
      return true;
    } catch (err) {
      if (isDuplicateKey(err)) return false;
      throw err;
    }
  },
  async listReportsFor(postIds) {
    return toRecords(await Report.find({ postId: { $in: postIds } }).lean());
  },
};
