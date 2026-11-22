import { getDb, persist } from './store.js';

const matches = (f, followerId, followeeId) => f.followerId === followerId && f.followeeId === followeeId;

export const followRepo = {
  // Mirrors a unique (followerId, followeeId) index: following twice is a no-op.
  async follow(followerId, followeeId) {
    const { follows } = getDb();
    if (follows.some((f) => matches(f, followerId, followeeId))) return;
    follows.push({ followerId, followeeId, createdAt: new Date().toISOString() });
    persist();
  },

  async unfollow(followerId, followeeId) {
    const db = getDb();
    const before = db.follows.length;
    db.follows = db.follows.filter((f) => !matches(f, followerId, followeeId));
    if (db.follows.length < before) persist();
  },

  async isFollowing(followerId, followeeId) {
    return getDb().follows.some((f) => matches(f, followerId, followeeId));
  },

  async listFollowingIds(userId) {
    return getDb().follows.filter((f) => f.followerId === userId).map((f) => f.followeeId);
  },

  async listFollowerIds(userId) {
    return getDb().follows.filter((f) => f.followeeId === userId).map((f) => f.followerId);
  },

  async countFollowers(userId) {
    return getDb().follows.filter((f) => f.followeeId === userId).length;
  },

  async countFollowing(userId) {
    return getDb().follows.filter((f) => f.followerId === userId).length;
  },

  // Every follow edge that STARTS at one of the given users (for "followed by people I follow").
  async listFollowingOf(userIds) {
    const wanted = new Set(userIds);
    return getDb().follows.filter((f) => wanted.has(f.followerId));
  },
};