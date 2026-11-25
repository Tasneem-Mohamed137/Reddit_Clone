import { withTransaction } from './connection.js';
import { Comment, CommentVote, Hide, Post, Report, Save, Vote } from './models.js';
import { afterCursorFilter, decodeCursor, encodeCursor, keyOf } from './pagination.js';
import { escapeRegex, toRecord, toRecords } from './record.js';

const RANGE_MS = {
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

// Which stored field each sort uses. 'hot' must be STORED to be sortable by an index.
const SORT_FIELDS = { new: 'createdAt', top: 'score', hot: 'hotScore' };

/**
 * Reddit's classic "hot" formula: log-scaled score plus a recency bonus (+1 per 12.5 hours).
 * computeHotScore() is used when a post is created; voteRepo recomputes it inside the database
 * with HOT_SCORE_EXPR in the same atomic update that changes the score. Both must stay identical.
 */
export const computeHotScore = (score, createdAt) =>
  Math.sign(score) * Math.log10(Math.max(Math.abs(score), 1)) + new Date(createdAt).getTime() / 45_000_000;

export const HOT_SCORE_EXPR = {
  $add: [
    { $multiply: [{ $cmp: ['$score', 0] }, { $log10: { $max: [{ $abs: '$score' }, 1] } }] }, // $cmp gives -1 / 0 / 1 = sign
    { $divide: [{ $toLong: '$createdAt' }, 45_000_000] },
  ],
};

const EDITABLE_FIELDS = ['body', 'mediaUrls', 'type'];

export const postRepo = {
  async create({ communityId, authorId, type = 'text', title, body = '', mediaUrls = [], linkUrl = null, tags = [], createdAt }) {
    const now = createdAt ? new Date(createdAt) : new Date();
    const post = await Post.create({
      communityId, authorId, type, title, body, mediaUrls, linkUrl, tags,
      createdAt: now,
      updatedAt: now, // same instant: the service shows "edited" only when they differ
      hotScore: computeHotScore(0, now),
    });
    return toRecord(post);
  },

  async findById(id) {
    return toRecord(await Post.findById(id).lean());
  },

  async findByIds(ids) {
    return toRecords(await Post.find({ _id: { $in: ids } }).lean());
  },

  // Applies only the fields present in `patch` and bumps updatedAt (also invalidates the AI summary).
  async update(id, patch) {
    const $set = { updatedAt: new Date() };
    for (const field of EDITABLE_FIELDS) if (patch[field] !== undefined) $set[field] = patch[field];
    return toRecord(await Post.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true }).lean());
  },

  async setPinned(id, pinned) {
    return toRecord(await Post.findByIdAndUpdate(id, { $set: { pinned } }, { new: true }).lean());
  },

  async listPinned(communityId) {
    return toRecords(await Post.find({ communityId, pinned: true }).sort({ createdAt: -1 }).lean());
  },

  async countPinned(communityId) {
    return Post.countDocuments({ communityId, pinned: true });
  },

  // True while some post still shows this uploaded file. `mediaUrls: url` matches inside the array.
  async isMediaUsed(url) {
    return Boolean(await Post.exists({ mediaUrls: url }));
  },

  /**
   * Removes the post and EVERYTHING that points at it, in one transaction:
   * either all of it disappears, or (on any error) nothing does. No orphan comments/votes.
   */
  async deleteCascade(id) {
    await withTransaction(async (session) => {
      const commentIds = await Comment.distinct('_id', { postId: id }).session(session);
      await CommentVote.deleteMany({ commentId: { $in: commentIds } }, { session });
      await Comment.deleteMany({ postId: id }, { session });
      await Vote.deleteMany({ postId: id }, { session });
      await Save.deleteMany({ postId: id }, { session });
      await Hide.deleteMany({ postId: id }, { session });
      await Report.deleteMany({ postId: id }, { session });
      await Post.deleteOne({ _id: id }, { session });
    });
  },

  // Karma: summed by the DATABASE with an aggregation, not by loading every post into Node.
  async sumScoreByAuthor(userId) {
    const [row] = await Post.aggregate([{ $match: { authorId: userId } }, { $group: { _id: null, total: { $sum: '$score' } } }]);
    return row?.total ?? 0;
  },

  async search(q, limit = 20) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    return toRecords(
      await Post.find({ $or: [{ title: pattern }, { body: pattern }] }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean(),
    );
  },

  async list({ communityIds, orAuthorIds, authorId, ids, excludeIds, sort = 'hot', range = 'all', cursor, limit = 10 }) {
    const field = SORT_FIELDS[sort] ?? SORT_FIELDS.hot;
    const and = [];

    // communityIds and orAuthorIds combine with OR: "from my communities OR written by people I follow".
    if (communityIds || orAuthorIds) {
      and.push({ $or: [{ communityId: { $in: communityIds ?? [] } }, { authorId: { $in: orAuthorIds ?? [] } }] });
    }
    if (authorId) and.push({ authorId });
    if (ids) and.push({ _id: { $in: ids } });
    if (excludeIds?.length) and.push({ _id: { $nin: excludeIds } });
    if (sort === 'top' && range !== 'all' && RANGE_MS[range]) {
      and.push({ createdAt: { $gte: new Date(Date.now() - RANGE_MS[range]) } });
    }
    const after = afterCursorFilter(field, decodeCursor(cursor));
    if (after) and.push(after);

    // Ask for ONE extra document: if it exists, there is a next page.
    const docs = await Post.find(and.length ? { $and: and } : {})
      .sort({ [field]: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const page = docs.slice(0, limit);
    const last = page.at(-1);
    return {
      items: toRecords(page),
      nextCursor: docs.length > limit && last ? encodeCursor({ k: keyOf(field, last), id: last._id }) : null,
    };
  },
};
