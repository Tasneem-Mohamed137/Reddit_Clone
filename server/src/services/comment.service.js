import { z } from 'zod';
import { commentRepo, userRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';
import { communityService } from './community.service.js';
import { findPostOrThrow } from './post.service.js';

export const createCommentSchema = z.object({ body: z.string().trim().min(1, 'Comment cannot be empty').max(10000) });
export const commentsQuerySchema = z.object({ sort: z.enum(['best', 'new', 'top']).default('best') });

const toCommentDto = (comment, authors) => {
  const author = comment.authorId ? authors.get(comment.authorId) : null;
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    body: comment.body,
    deleted: comment.deleted,
    edited: Boolean(comment.editedAt),
    createdAt: comment.createdAt,
    author: author ? { username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl } : null,
  };
};

const hydrateOne = async (comment) => {
  const authors = new Map((await userRepo.findByIds([comment.authorId])).map((u) => [u.id, u]));
  return toCommentDto(comment, authors);
};

const findCommentOrThrow = async (id) => {
  const comment = await commentRepo.findById(id);
  if (!comment) throw AppError.notFound('Comment not found');
  return comment;
};

const addComment = async (userId, postId, parentId, body) => {
  const comment = await commentRepo.create({ postId, parentId, authorId: userId, body });
  return hydrateOne(comment);
};

export const commentService = {
  // Returns a FLAT list (with parentId) already ordered; the client nests it.
  // Comments have no votes in this project, so "best"/"top" rank by direct replies, "new" by date.
  async listByPost(postId, sort) {
    await findPostOrThrow(postId);
    const comments = await commentRepo.listByPost(postId);

    const replyCount = new Map();
    for (const c of comments) if (c.parentId) replyCount.set(c.parentId, (replyCount.get(c.parentId) ?? 0) + 1);

    const byDate = (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt);
    const comparators = {
      new: (a, b) => byDate(b, a),
      best: (a, b) => (replyCount.get(b.id) ?? 0) - (replyCount.get(a.id) ?? 0) || byDate(a, b),
      top: (a, b) => b.score - a.score || (replyCount.get(b.id) ?? 0) - (replyCount.get(a.id) ?? 0) || byDate(a, b),
    };

    const authorIds = [...new Set(comments.map((c) => c.authorId).filter(Boolean))];
    const authors = new Map((await userRepo.findByIds(authorIds)).map((u) => [u.id, u]));
    return [...comments].sort(comparators[sort]).map((c) => toCommentDto(c, authors));
  },

  async create(userId, postId, body) {
    await findPostOrThrow(postId);
    return addComment(userId, postId, null, body);
  },

  async reply(userId, parentId, body) {
    const parent = await findCommentOrThrow(parentId);
    if (parent.deleted) throw AppError.badRequest('You cannot reply to a deleted comment', 'COMMENT_DELETED');
    return addComment(userId, parent.postId, parent.id, body);
  },

  async update(userId, id, body) {
    const comment = await findCommentOrThrow(id);
    if (comment.deleted) throw AppError.badRequest('This comment was deleted', 'COMMENT_DELETED');
    if (comment.authorId !== userId) throw AppError.forbidden('Only the author can edit this comment');
    return hydrateOne(await commentRepo.update(id, { body }));
  },

  async remove(userId, id) {
    const comment = await findCommentOrThrow(id);
    const post = await findPostOrThrow(comment.postId);
    const allowed = comment.authorId === userId || (await communityService.isModerator(post.communityId, userId));
    if (!allowed) throw AppError.forbidden('Only the author or a moderator can delete this comment');

    // Always blank the comment first so its replies keep their place in the thread...
    await commentRepo.softDelete(id);
    // ...then physically prune deleted comments that no longer have any replies.
    let current = comment;
    while (current && (await commentRepo.findById(current.id))?.deleted && !(await commentRepo.hasChildren(current.id))) {
      await commentRepo.remove(current.id);
      current = current.parentId ? await commentRepo.findById(current.parentId) : null;
    }
  },
};