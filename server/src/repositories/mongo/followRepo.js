import { isDuplicateKey } from './connection.js';
import { Follow, newId } from './models.js';

export const followRepo = {
  /**
   * Idempotent follow in ONE atomic operation: "insert if missing, otherwise do nothing".
   * $setOnInsert only writes when the upsert actually inserts. The unique index blocks the rare
   * case where two identical requests insert at the same instant; that loser is a no-op.
   */
  async follow(followerId, followeeId) {
    try {
      await Follow.updateOne(
        { followerId, followeeId },
        { $setOnInsert: { _id: newId(), createdAt: new Date() } },
        { upsert: true },
      );
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  },

  async unfollow(followerId, followeeId) {
    await Follow.deleteOne({ followerId, followeeId });
  },

  async isFollowing(followerId, followeeId) {
    return Boolean(await Follow.exists({ followerId, followeeId }));
  },

  async listFollowingIds(userId) {
    return Follow.find({ followerId: userId }).distinct('followeeId');
  },

  async listFollowerIds(userId) {
    return Follow.find({ followeeId: userId }).distinct('followerId');
  },

  // countDocuments uses the indexes on followerId / followeeId.
  async countFollowers(userId) {
    return Follow.countDocuments({ followeeId: userId });
  },

  async countFollowing(userId) {
    return Follow.countDocuments({ followerId: userId });
  },

  // Every follow edge that STARTS at one of the given users (for "followed by people I follow").
  async listFollowingOf(userIds) {
    const rows = await Follow.find({ followerId: { $in: userIds } }, { _id: 0, followerId: 1, followeeId: 1 }).lean();
    return rows;
  },
};
