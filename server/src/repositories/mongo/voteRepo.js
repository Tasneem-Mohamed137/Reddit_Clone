import { isDuplicateKey, withTransaction } from './connection.js';
import { Comment, CommentVote, newId, Post, Vote } from './models.js';
import { HOT_SCORE_EXPR } from './postRepo.js';

/**
 * ATOMIC VOTING
 * -------------
 * Rules (from the ERD):
 *   1. at most ONE vote per (user, post)       -> unique index { userId, postId } in models.js
 *   2. score is changed ONLY by a delta         -> never "read score, add, write back" in Node
 *
 * Why a transaction? A vote is TWO writes: the user's vote row and the post's score.
 * If the server crashed between them, the score would no longer equal the sum of the votes.
 * Inside session.withTransaction both commit together or not at all.
 *
 * Why it is race-safe: if two requests touch the same vote row or the same post at the same
 * time, MongoDB detects a WriteConflict; withTransaction aborts the loser and re-runs it with
 * the fresh data. So the delta is always computed from the real previous vote.
 *
 *   value  1 or -1 -> upsert the vote row, getting the PREVIOUS row back (returnDocument 'before')
 *   value  0       -> delete the vote row, getting it back
 *   delta = value - previous (0 if none)      e.g. up -> down = -1 - 1 = -2
 *   target.score += delta                     (and posts also recompute hotScore in the same update)
 *   Same vote twice -> delta 0 -> idempotent.
 */
const POST = { Target: Post, Votes: Vote, idField: 'postId', alsoUpdateHot: true };
const COMMENT = { Target: Comment, Votes: CommentVote, idField: 'commentId', alsoUpdateHot: false };

const castVoteOnce = ({ Target, Votes, idField, alsoUpdateHot }, userId, targetId, value) =>
  withTransaction(async (session) => {
    if (!(await Target.exists({ _id: targetId }).session(session))) return null;

    const key = { userId, [idField]: targetId };
    const previous =
      value === 0
        ? await Votes.findOneAndDelete(key, { session }).lean()
        : await Votes.findOneAndUpdate(key, { $set: { value }, $setOnInsert: { _id: newId() } }, { upsert: true, new: false, runValidators: true, session }).lean();
    const delta = value - (previous?.value ?? 0);

    // Posts: an update PIPELINE (array) lets the database compute hotScore from the NEW score
    // in the same atomic write. Comments only need $inc.
    const update = alsoUpdateHot
      ? [{ $set: { score: { $add: ['$score', delta] } } }, { $set: { hotScore: HOT_SCORE_EXPR } }]
      : { $inc: { score: delta } };
    const target = await Target.findOneAndUpdate({ _id: targetId }, update, { new: true, session, projection: { score: 1 } }).lean();
    return { score: target.score, userVote: value };
  });

// Two FIRST votes by the same user at the same instant can both try to insert; the unique index
// lets only one in. The other gets E11000 and is simply retried (it will now see the existing row).
const castVote = async (config, userId, targetId, value) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await castVoteOnce(config, userId, targetId, value);
    } catch (err) {
      if (!isDuplicateKey(err) || attempt >= 3) throw err;
    }
  }
};

const votesOf = async ({ Votes, idField }, userId, ids) => {
  const rows = await Votes.find({ userId, [idField]: { $in: ids } }, { [idField]: 1, value: 1 }).lean();
  return Object.fromEntries(rows.map((v) => [v[idField], v.value]));
};

export const voteRepo = {
  setVote: (userId, postId, value) => castVote(POST, userId, postId, value),
  setCommentVote: (userId, commentId, value) => castVote(COMMENT, userId, commentId, value),
  getUserVotes: (userId, postIds) => votesOf(POST, userId, postIds),
  getUserCommentVotes: (userId, commentIds) => votesOf(COMMENT, userId, commentIds),
};
