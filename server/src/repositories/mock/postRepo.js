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

  // Real DB: do this in one transaction.
  async deleteCascade(id) {
    const db = getDb();
    db.posts = db.posts.filter((p) => p.id !== id);
    db.comments = db.comments.filter((c) => c.postId !== id);
    db.votes = db.votes.filter((v) => v.postId !== id);
    persist();
  },

  async sumScoreByAuthor(userId) {
    return getDb()
      .posts.filter((p) => p.authorId === userId)
      .reduce((sum, p) => sum + p.score, 0);
  },

    async list({ communityIds, orAuthorIds, authorId, sort = 'hot', range = 'all', cursor, limit = 10 }) {
    let posts = getDb().posts;
    // communityIds and orAuthorIds combine with OR: "from my communities OR written by people I follow".
    if (communityIds || orAuthorIds) {
      const inCommunities = new Set(communityIds ?? []);
      const byAuthors = new Set(orAuthorIds ?? []);
      posts = posts.filter((p) => inCommunities.has(p.communityId) || byAuthors.has(p.authorId));
    }
    if (authorId) posts = posts.filter((p) => p.authorId === authorId);
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