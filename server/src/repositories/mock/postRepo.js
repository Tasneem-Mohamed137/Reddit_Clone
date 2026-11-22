import { randomUUID } from 'node:crypto';
import { getDb, persist } from './store.js';
import { paginate } from './pagination.js';

const RANGE_MS = {
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

// Reddit's classic "hot" formula: log-scaled score plus a recency bonus.
// NOTE: it changes as time passes, so deep paging on 'hot' can shift slightly (same on real Reddit).
const hotScore = (post) => {
  const order = Math.log10(Math.max(Math.abs(post.score), 1));
  return Math.sign(post.score) * order + Date.parse(post.createdAt) / 1000 / 45000;
};

const SORT_KEYS = {
  new: (post) => Date.parse(post.createdAt),
  top: (post) => post.score,
  hot: hotScore,
};

const EDITABLE_FIELDS = ['body', 'mediaUrls', 'type'];
const newestFirst = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

export const postRepo = {
  async create({ communityId, authorId, type = 'text', title, body = '', mediaUrls = [], linkUrl = null, tags = [], createdAt }) {
    const now = createdAt ?? new Date().toISOString();
    const post = {
      id: randomUUID(),
      communityId,
      authorId,
      type,
      title,
      body,
      mediaUrls,
      linkUrl,
      tags,
      pinned: false,
      score: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    getDb().posts.push(post);
    persist();
    return post;
  },

  async findById(id) {
    return getDb().posts.find((p) => p.id === id) ?? null;
  },

  async findByIds(ids) {
    const set = new Set(ids);
    return getDb().posts.filter((p) => set.has(p.id));
  },

  // Applies only the fields present in `patch` (body, mediaUrls, type) and bumps updatedAt,
  // which also invalidates the cached AI summary.
  async update(id, patch) {
    const post = getDb().posts.find((p) => p.id === id);
    if (!post) return null;
    for (const field of EDITABLE_FIELDS) {
      if (patch[field] !== undefined) post[field] = patch[field];
    }
    post.updatedAt = new Date().toISOString();
    persist();
    return post;
  },

  async setPinned(id, pinned) {
    const post = getDb().posts.find((p) => p.id === id);
    post.pinned = pinned;
    persist();
    return post;
  },

  async listPinned(communityId) {
    return getDb().posts.filter((p) => p.communityId === communityId && p.pinned).sort(newestFirst);
  },

  async countPinned(communityId) {
    return getDb().posts.filter((p) => p.communityId === communityId && p.pinned).length;
  },

  // True while some post still shows this uploaded file.
  async isMediaUsed(url) {
    return getDb().posts.some((p) => p.mediaUrls.includes(url));
  },

  // Real DB: do this in one transaction.
  async deleteCascade(id) {
    const db = getDb();
    const commentIds = new Set(db.comments.filter((c) => c.postId === id).map((c) => c.id));
    db.posts = db.posts.filter((p) => p.id !== id);
    db.comments = db.comments.filter((c) => c.postId !== id);
    db.votes = db.votes.filter((v) => v.postId !== id);
    db.commentVotes = db.commentVotes.filter((v) => !commentIds.has(v.commentId));
    for (const key of ['saves', 'hides', 'reports']) db[key] = db[key].filter((r) => r.postId !== id);
    persist();
  },

  async sumScoreByAuthor(userId) {
    return getDb()
      .posts.filter((p) => p.authorId === userId)
      .reduce((sum, p) => sum + p.score, 0);
  },

  async search(q, limit = 20) {
    const needle = q.toLowerCase();
    return getDb()
      .posts.filter((p) => p.title.toLowerCase().includes(needle) || p.body.toLowerCase().includes(needle))
      .sort(newestFirst)
      .slice(0, limit);
  },

  async list({ communityIds, orAuthorIds, authorId, ids, excludeIds, sort = 'hot', range = 'all', cursor, limit = 10 }) {
    let posts = getDb().posts;
    // communityIds and orAuthorIds combine with OR: "from my communities OR written by people I follow".
    if (communityIds || orAuthorIds) {
      const inCommunities = new Set(communityIds ?? []);
      const byAuthors = new Set(orAuthorIds ?? []);
      posts = posts.filter((p) => inCommunities.has(p.communityId) || byAuthors.has(p.authorId));
    }
    if (authorId) posts = posts.filter((p) => p.authorId === authorId);
    if (ids) {
      const wanted = new Set(ids);
      posts = posts.filter((p) => wanted.has(p.id));
    }
    if (excludeIds?.length) {
      const skipped = new Set(excludeIds);
      posts = posts.filter((p) => !skipped.has(p.id));
    }
    if (sort === 'top' && range !== 'all') {
      const since = Date.now() - RANGE_MS[range];
      posts = posts.filter((p) => Date.parse(p.createdAt) >= since);
    }

    const keyOf = SORT_KEYS[sort];
    // Total order: sort key DESC, then id DESC, so the cursor is unambiguous.
    const sorted = [...posts].sort((a, b) => keyOf(b) - keyOf(a) || (a.id < b.id ? 1 : -1));
    return paginate(sorted, keyOf, { cursor, limit });
  },
};