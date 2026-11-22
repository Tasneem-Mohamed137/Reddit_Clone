import { z } from 'zod';
import { communityRepo, followRepo, postRepo, userPostRepo, userRepo, voteRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { mediaUrlSchema } from '../utils/mediaUrl.js';
import { communityService, findCommunityOrThrow } from './community.service.js';
import { mediaService } from './media.service.js';

// Like Reddit's single composer: a post is a title plus any mix of text, media and a link.
// The `type` is NOT sent by the client; it is derived from the content (see typeOf).
export const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  body: z.string().max(40000).default(''),
  mediaUrls: z.array(mediaUrlSchema).max(10).default([]),
  linkUrl: z.string().url().max(2048).nullish(),
  tags: z.array(z.enum(['nsfw', 'spoiler'])).max(2).default([]),
});

// The title cannot be edited (same as Reddit); body and media can.
export const updatePostSchema = z
  .object({
    body: z.string().max(40000).optional(),
    mediaUrls: z.array(mediaUrlSchema).max(10).optional(),
  })
  .refine((value) => value.body !== undefined || value.mediaUrls !== undefined, { message: 'Nothing to update' });

export const feedQuerySchema = z.object({
  sort: z.enum(['best', 'hot', 'new', 'top']).default('best'),
  range: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// "best" is Reddit's default ordering; here it is the same as "hot".
const SORT_ALIASES = { best: 'hot', hot: 'hot', new: 'new', top: 'top' };
const toRepoQuery = (q) => ({ sort: SORT_ALIASES[q.sort], range: q.range, cursor: q.cursor, limit: q.limit });

// Posts the viewer hid never show up in listings.
const listQuery = async (query, viewerId) => ({
  ...toRepoQuery(query),
  excludeIds: viewerId ? await userPostRepo.listHiddenIds(viewerId) : [],
});

// The type is only a label for feeds/filters; it always follows the content, so it can never disagree with it.
const typeOf = (mediaUrls, linkUrl) => (mediaUrls.length > 0 ? 'image' : linkUrl ? 'link' : 'text');

export const findPostOrThrow = async (id) => {
  const post = await postRepo.findById(id);
  if (!post) throw AppError.notFound('Post not found');
  return post;
};

// Turns raw rows into API objects using batched lookups (no N+1 queries).
const hydrate = async (posts, viewerId) => {
  const ids = posts.map((p) => p.id);
  const communities = new Map((await communityRepo.findByIds([...new Set(posts.map((p) => p.communityId))])).map((c) => [c.id, c]));
  const authors = new Map((await userRepo.findByIds([...new Set(posts.map((p) => p.authorId))])).map((u) => [u.id, u]));
  const votes = viewerId ? await voteRepo.getUserVotes(viewerId, ids) : {};
  const saved = new Set(viewerId ? await userPostRepo.savedAmong(viewerId, ids) : []);
  const joined = viewerId
    ? new Set((await communityRepo.listJoinedBy(viewerId)).map((c) => c.id))
    : new Set();

  return posts.map((post) => {
    const community = communities.get(post.communityId);
    const author = authors.get(post.authorId);
    return {
      id: post.id,
      type: post.type,
      title: post.title,
      body: post.body,
      mediaUrls: post.mediaUrls,
      linkUrl: post.linkUrl,
      tags: post.tags ?? [], // posts created before tags existed have none
      pinned: Boolean(post.pinned),
      score: post.score,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      edited: post.updatedAt !== post.createdAt,
      community: { id: community.id, name: community.name, iconUrl: community.iconUrl },
      author: author
        ? { username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl }
        : null,
      userVote: votes[post.id] ?? 0,
      isSaved: saved.has(post.id),
      isJoined: joined.has(post.communityId),
    };
  });
};

const toPage = async ({ items, nextCursor }, viewerId) => ({
  items: await hydrate(items, viewerId),
  nextCursor,
});

export const postService = {
  async create(userId, communityName, input) {
    const community = await findCommunityOrThrow(communityName);
    const linkUrl = input.linkUrl ?? null;
    const post = await postRepo.create({
      communityId: community.id,
      authorId: userId,
      type: typeOf(input.mediaUrls, linkUrl),
      title: input.title,
      body: input.body,
      mediaUrls: input.mediaUrls,
      linkUrl,
      tags: input.tags,
    });
    return (await hydrate([post], userId))[0];
  },

  async get(id, viewerId) {
    return (await hydrate([await findPostOrThrow(id)], viewerId))[0];
  },

  async update(id, userId, patch) {
    const post = await findPostOrThrow(id);
    if (post.authorId !== userId) throw AppError.forbidden('Only the author can edit this post');

    const mediaUrls = patch.mediaUrls ?? post.mediaUrls;
    const updated = await postRepo.update(id, { ...patch, type: typeOf(mediaUrls, post.linkUrl) });
    // Files the author removed from the post are deleted from disk.
    await mediaService.removeIfUnused(post.mediaUrls.filter((url) => !mediaUrls.includes(url)));
    return (await hydrate([updated], userId))[0];
  },

  async remove(id, userId) {
    const post = await findPostOrThrow(id);
    const allowed = post.authorId === userId || (await communityService.isModerator(post.communityId, userId));
    if (!allowed) throw AppError.forbidden('Only the author or a moderator can delete this post');
    await postRepo.deleteCascade(id);
    await mediaService.removeIfUnused(post.mediaUrls);
  },

  // Pinned posts lead the FIRST page only; later pages continue with the normal order.
  async listByCommunity(name, query, viewerId) {
    const community = await findCommunityOrThrow(name);
    const base = await listQuery(query, viewerId);
    const pinned = await postRepo.listPinned(community.id);
    const page = await postRepo.list({
      ...base,
      communityIds: [community.id],
      excludeIds: [...base.excludeIds, ...pinned.map((p) => p.id)],
    });
    const visiblePinned = pinned.filter((p) => !base.excludeIds.includes(p.id));
    const items = query.cursor ? page.items : [...visiblePinned, ...page.items];
    return toPage({ items, nextCursor: page.nextCursor }, viewerId);
  },

  async listByUser(username, query, viewerId) {
    const user = await userRepo.findByUsername(username);
    if (!user) throw AppError.notFound('User not found');
    return toPage(await postRepo.list({ ...(await listQuery(query, viewerId)), authorId: user.id }), viewerId);
  },

  async listSaved(userId, query) {
    const ids = await userPostRepo.listSavedIds(userId);
    return toPage(await postRepo.list({ ...toRepoQuery(query), ids }), userId);
  },

  async search(q, limit, viewerId) {
    return { items: await hydrate(await postRepo.search(q, limit), viewerId) };
  },

  async popular(query, viewerId) {
    return toPage(await postRepo.list(await listQuery(query, viewerId)), viewerId);
  },

  // "Following": posts from joined communities OR from people I follow.
  // Logged out, or nothing joined/followed yet: falls back to Popular.
  async feed(query, viewerId) {
    if (!viewerId) return this.popular(query, viewerId);
    const [joined, followingIds] = await Promise.all([
      communityRepo.listJoinedBy(viewerId),
      followRepo.listFollowingIds(viewerId),
    ]);
    if (joined.length === 0 && followingIds.length === 0) return this.popular(query, viewerId);
    return toPage(
      await postRepo.list({ ...(await listQuery(query, viewerId)), communityIds: joined.map((c) => c.id), orAuthorIds: followingIds }),
      viewerId,
    );
  },
};