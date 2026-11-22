import { getDb, persist } from './store.js';

/**
 * ATOMIC VOTING (mock) -> MongoDB translation
 * -------------------------------------------
 * Rule: at most ONE vote per (user, target); the score is NEVER computed with read-modify-write
 * in application code, only with a delta applied atomically. Posts and comments use the same design.
 *
 * Mock: a per-target async mutex serialises every vote on the same post/comment, so two requests
 * can never interleave between "read old vote" and "apply delta".
 *
 * MongoDB (votes for posts; comment_votes works exactly the same with commentId):
 *   1. Unique index:  db.votes.createIndex({ userId: 1, postId: 1 }, { unique: true })
 *      -> two concurrent first votes by the same user cannot both insert (E11000, retry once).
 *   2. One transaction (session.withTransaction) containing:
 *        // value !== 0  -> upsert, and get the PREVIOUS document back
 *        const before = await votes.findOneAndUpdate(
 *          { userId, postId }, { $set: { value } },
 *          { upsert: true, returnDocument: 'before', session });
 *        // value === 0  -> const before = await votes.findOneAndDelete({ userId, postId }, { session });
 *        const delta = value - (before?.value ?? 0);
 *        const post = await posts.findOneAndUpdate(
 *          { _id: postId }, { $inc: { score: delta } },
 *          { returnDocument: 'after', session });
 *   3. Vote upsert + $inc commit together or not at all (one atomic unit).
 *   Idempotent: repeating the same value gives delta 0.
 */
const locks = new Map();

// Chains `task` behind the previous task with the same key.
// Order of execution == order of calls, which also makes the concurrency test deterministic.
const withLock = (key, task) => {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(task);
  const tail = run.catch(() => {}); // a failed task must not block the queue
  locks.set(key, tail);
  tail.then(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
  return run;
};

const POST = { targets: 'posts', votes: 'votes', idField: 'postId' };
const COMMENT = { targets: 'comments', votes: 'commentVotes', idField: 'commentId' };

const castVote = ({ targets, votes, idField }, userId, id, value) =>
  withLock(`${targets}:${id}`, async () => {
    const db = getDb();
    const target = db[targets].find((t) => t.id === id);
    if (!target) return null;

    const existing = db[votes].find((v) => v.userId === userId && v[idField] === id);
    const delta = value - (existing?.value ?? 0);

    if (value === 0) {
      if (existing) db[votes] = db[votes].filter((v) => v !== existing);
    } else if (existing) {
      existing.value = value;
    } else {
      db[votes].push({ userId, [idField]: id, value });
    }

    target.score += delta; // $inc: { score: delta }
    persist();
    return { score: target.score, userVote: value };
  });

const votesOf = ({ votes, idField }, userId, ids) => {
  const wanted = new Set(ids);
  const result = {};
  for (const vote of getDb()[votes]) {
    if (vote.userId === userId && wanted.has(vote[idField])) result[vote[idField]] = vote.value;
  }
  return result;
};

export const voteRepo = {
  setVote: (userId, postId, value) => castVote(POST, userId, postId, value),
  setCommentVote: (userId, commentId, value) => castVote(COMMENT, userId, commentId, value),
  async getUserVotes(userId, postIds) {
    return votesOf(POST, userId, postIds);
  },
  async getUserCommentVotes(userId, commentIds) {
    return votesOf(COMMENT, userId, commentIds);
  },
};