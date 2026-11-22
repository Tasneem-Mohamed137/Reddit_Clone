import assert from 'node:assert/strict';
import fs from 'node:fs';

// Use a throwaway database file so the real data.json is never touched.
process.env.DATA_FILE = 'data.test.json';
process.env.JWT_SECRET ??= 'test-secret';

const { resetDb, getDb, flush } = await import('../repositories/mock/store.js');
const { userRepo, communityRepo, postRepo, voteRepo } = await import('../repositories/index.js');

resetDb();
const users = await Promise.all(
  Array.from({ length: 6 }, (_, i) => userRepo.create({ email: `u${i}@test.com`, username: `user${i}`, passwordHash: 'x' })),
);
const community = await communityRepo.create({ name: 'testing', creatorId: users[0].id });
const post = await postRepo.create({ communityId: community.id, authorId: users[0].id, title: 'race condition test' });

const VALUES = [1, -1, 0];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const requests = Array.from({ length: 100 }, () => ({ userId: pick(users).id, value: pick(VALUES) }));

// Requests of the same post are served in call order, so the LAST request of each user decides their final vote.
const lastValueByUser = new Map();
for (const { userId, value } of requests) lastValueByUser.set(userId, value);
const expectedScore = [...lastValueByUser.values()].reduce((sum, value) => sum + value, 0);

// Fire all 100 at the same time (mixed up / down / unvote, same and different users).
await Promise.all(requests.map(({ userId, value }) => voteRepo.setVote(userId, post.id, value)));

const db = getDb();
const storedPost = db.posts.find((p) => p.id === post.id);
const postVotes = db.votes.filter((v) => v.postId === post.id);
const sumOfVotes = postVotes.reduce((sum, v) => sum + v.value, 0);

assert.equal(new Set(postVotes.map((v) => v.userId)).size, postVotes.length, 'a user has more than one vote on the post');
assert.equal(storedPost.score, sumOfVotes, 'score must equal the sum of the stored votes');
assert.equal(storedPost.score, expectedScore, 'score must equal the sum of each user\'s final vote');

// Captured BEFORE the idempotency check below, which may change the post.
const finalScore = storedPost.score;
const finalVoteRows = postVotes.length;

// Idempotency: sending the same vote again must not change the score.
const first = await voteRepo.setVote(users[0].id, post.id, 1);
const second = await voteRepo.setVote(users[0].id, post.id, 1);
assert.equal(first.score, second.score, 'repeating a vote must be idempotent');

console.log(`PASS: 100 concurrent votes -> score ${finalScore} (sum of final votes = ${sumOfVotes}), ${finalVoteRows} vote rows, no duplicates.`);

flush();
fs.rmSync('data.test.json', { force: true });