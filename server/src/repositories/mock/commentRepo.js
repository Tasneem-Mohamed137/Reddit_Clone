import { randomUUID } from 'node:crypto';
import { getDb, persist } from './store.js';

export const commentRepo = {
  // parentId = null for top-level comments; unlimited nesting via parentId.
  async create({ postId, parentId = null, authorId, body, createdAt }) {
    const db = getDb();
    const comment = {
      id: randomUUID(),
      postId,
      parentId,
      authorId,
      body,
      deleted: false,
      score: 0,
      createdAt: createdAt ?? new Date().toISOString(),
      editedAt: null,
    };
    db.comments.push(comment);
    db.posts.find((p) => p.id === postId).commentCount += 1;
    persist();
    return comment;
  },

  async findById(id) {
    return getDb().comments.find((c) => c.id === id) ?? null;
  },

  async listByPost(postId) {
    return getDb().comments.filter((c) => c.postId === postId);
  },

  async listByAuthor(authorId) {
    return getDb().comments.filter((c) => c.authorId === authorId);
  },

  async update(id, { body }) {
    const comment = getDb().comments.find((c) => c.id === id);
    if (!comment) return null;
    comment.body = body;
    comment.editedAt = new Date().toISOString();
    persist();
    return comment;
  },

  // Keeps the row (and its replies) but hides content. The visible count drops once.
  async softDelete(id) {
    const db = getDb();
    const comment = db.comments.find((c) => c.id === id);
    if (!comment || comment.deleted) return;
    comment.deleted = true;
    comment.body = '[deleted]';
    comment.authorId = null;
    const post = db.posts.find((p) => p.id === comment.postId);
    if (post) post.commentCount -= 1;
    persist();
  },

  async hasChildren(id) {
    return getDb().comments.some((c) => c.parentId === id);
  },

  async remove(id) {
    const db = getDb();
    db.comments = db.comments.filter((c) => c.id !== id);
    persist();
  },
};