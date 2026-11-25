import assert from 'node:assert/strict';

// Run against a throwaway database on the same cluster, so real data is never touched.
process.env.MONGODB_DB_NAME = `reddit_clone_votetest_${process.pid}`;
process.env.JWT_SECRET ??= 'test-secret';

const { userRepo, communityRepo, postRepo, voteRepo } = await import('../repositories/index.js');
const { Post, Vote } = await import('../repositories/mongo/models.js');
const mongoose = (await import('mongoose')).default;

try {
  const users = await Promise.all(
    Array.from({ length: 6 }, (_, i) => userRepo.create({ email: `u${i}@test.com`, username: `user${i}`, passwordHash: 'x' })),
  );
  const community = await communityRepo.create({ name: 'testing', creatorId: users[0].id });
  const post = await postRepo.create({ communityId: community.id, authorId: users[0].id, title: 'race condition test' });

  const VALUES = [1, -1, 0];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const requests = Array.from({ length: 100 }, () => ({ userId: pick(users).id, value: pick(VALUES) }));

  // Fire all 100 at the same time (mixed up / down / unvote, same and different users).
  // Unlike the old mock, a real database finishes them in ANY order, so we check the invariants
  // that must hold whatever the order is.
  await Promise.all(requests.map(({ userId, value }) => voteRepo.setVote(userId, post.id, value)));

  const stored = await Post.findById(post.id).lean();
  const votes = await Vote.find({ postId: post.id }).lean();
  const sumOfVotes = votes.reduce((sum, v) => sum + v.value, 0);

  assert.equal(new Set(votes.map((v) => v.userId)).size, votes.length, 'a user has more than one vote on the post');
  assert.equal(stored.score, sumOfVotes, 'score must equal the sum of the stored votes');
  for (const v of votes) {
    const requested = requests.filter((r) => r.userId === v.userId).map((r) => r.value);
    assert.ok(requested.includes(v.value), 'a stored vote must be one of the values that user sent');
  }

  // Idempotency: sending the same vote again must not change the score.
  const first = await voteRepo.setVote(users[0].id, post.id, 1);
  const second = await voteRepo.setVote(users[0].id, post.id, 1);
  assert.equal(first.score, second.score, 'repeating a vote must be idempotent');

  // Unknown post -> null (the service turns it into 404).
  assert.equal(await voteRepo.setVote(users[0].id, 'does-not-exist', 1), null);

  console.log(`PASS: 100 concurrent votes -> score ${stored.score} = sum of ${votes.length} vote rows, no duplicates.`);
} finally {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
