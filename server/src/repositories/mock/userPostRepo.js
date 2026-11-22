import { getDb, persist } from './store.js';

const has = (list, userId, postId) => list.some((r) => r.userId === userId && r.postId === postId);

// Flips a per-user flag. Each (userId, postId) pair exists at most once per list (a unique index in Mongo).
const setFlag = (key, userId, postId, on) => {
  const db = getDb();
  const exists = has(db[key], userId, postId);
  if (on && !exists) db[key].push({ userId, postId, createdAt: new Date().toISOString() });
  if (!on && exists) db[key] = db[key].filter((r) => !(r.userId === userId && r.postId === postId));
  if (on !== exists) persist();
};

const idsOf = (key, userId) =>
  getDb()[key].filter((r) => r.userId === userId).map((r) => r.postId);

// What one user did with a post: saved it, hid it, reported it.
export const userPostRepo = {
  async setSaved(userId, postId, saved) {
    setFlag('saves', userId, postId, saved);
  },
  async setHidden(userId, postId, hidden) {
    setFlag('hides', userId, postId, hidden);
  },
  async listSavedIds(userId) {
    return idsOf('saves', userId);
  },
  async listHiddenIds(userId) {
    return idsOf('hides', userId);
  },
  async savedAmong(userId, postIds) {
    const wanted = new Set(postIds);
    return idsOf('saves', userId).filter((id) => wanted.has(id));
  },
  // Returns false when this user already reported this post.
  async report({ userId, postId, reason }) {
    const db = getDb();
    if (has(db.reports, userId, postId)) return false;
    db.reports.push({ userId, postId, reason, createdAt: new Date().toISOString() });
    persist();
    return true;
  },
  async listReportsFor(postIds) {
    const wanted = new Set(postIds);
    return getDb().reports.filter((r) => wanted.has(r.postId));
  },
};