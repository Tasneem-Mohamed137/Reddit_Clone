import { withTransaction } from './connection.js';
import { Comment, CommentVote, Post } from './models.js';
import { toRecord, toRecords } from './record.js';

export const commentRepo = {
  // parentId = null for top-level comments; unlimited nesting through parentId.
  // The comment insert and post.commentCount +1 commit together.
  async create({ postId, parentId = null, authorId, body, createdAt }) {
    return withTransaction(async (session) => {
      const [comment] = await Comment.create(
        [{ postId, parentId, authorId, body, ...(createdAt ? { createdAt: new Date(createdAt) } : {}) }],
        { session },
      );
      await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }, { session });
      return toRecord(comment);
    });
  },

  async findById(id) {
    return toRecord(await Comment.findById(id).lean());
  },

  async listByPost(postId) {
    return toRecords(await Comment.find({ postId }).sort({ createdAt: 1, _id: 1 }).lean());
  },

  async listByAuthor(authorId) {
    return toRecords(await Comment.find({ authorId }).lean());
  },

  async update(id, { body }) {
    return toRecord(await Comment.findByIdAndUpdate(id, { $set: { body, editedAt: new Date() } }, { new: true }).lean());
  },

  /**
   * Keeps the row (so replies stay attached) but hides its content.
   * The filter `deleted: false` makes it idempotent: deleting twice matches nothing the
   * second time, so commentCount drops exactly ONCE even if two delete requests race.
   */
  async softDelete(id) {
    await withTransaction(async (session) => {
      const comment = await Comment.findOneAndUpdate(
        { _id: id, deleted: false },
        { $set: { deleted: true, body: '[deleted]', authorId: null } },
        { session },
      ).lean();
      if (comment) await Post.updateOne({ _id: comment.postId }, { $inc: { commentCount: -1 } }, { session });
    });
  },

  async hasChildren(id) {
    return Boolean(await Comment.exists({ parentId: id }));
  },

  // Total score of the user's comments (comment karma), computed by the database.
  async sumScoreByAuthor(userId) {
    const [row] = await Comment.aggregate([{ $match: { authorId: userId } }, { $group: { _id: null, total: { $sum: '$score' } } }]);
    return row?.total ?? 0;
  },

  // Physical delete of a comment and its votes (no count change: softDelete already did it).
  async remove(id) {
    await withTransaction(async (session) => {
      await CommentVote.deleteMany({ commentId: id }, { session });
      await Comment.deleteOne({ _id: id }, { session });
    });
  },
};
