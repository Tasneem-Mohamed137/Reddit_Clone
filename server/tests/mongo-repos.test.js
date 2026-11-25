import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { closeServer, newUser, request } from './helpers.js'; // first: sets the throwaway test database

const { userRepo, communityRepo, postRepo, commentRepo, voteRepo, followRepo, chatRepo, userPostRepo } = await import(
  '../src/repositories/index.js'
);
const { Comment, CommentVote, Vote, Save } = await import('../src/repositories/mongo/models.js');

after(closeServer);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
let n = 0;
const makeUser = () => {
  n += 1;
  return userRepo.create({ email: `repo${n}@test.com`, username: `repo_user${n}`, passwordHash: 'x' });
};

test('records keep the contract shape: string id, no _id/__v, ISO date strings', async () => {
  const user = await makeUser();
  assert.equal(typeof user.id, 'string');
  assert.equal(user._id, undefined);
  assert.equal(user.__v, undefined);
  assert.match(user.createdAt, ISO);
  assert.deepEqual(await userRepo.findById(user.id), user);
  assert.equal(await userRepo.findById('not-a-real-id'), null); // no CastError
});

test('usernames, emails and community names are unique case-insensitively', async () => {
  const user = await makeUser();
  await assert.rejects(userRepo.create({ email: user.email.toUpperCase(), username: 'other_name1', passwordHash: 'x' }), { status: 409 });
  await assert.rejects(userRepo.create({ email: 'other1@test.com', username: user.username.toUpperCase(), passwordHash: 'x' }), { status: 409 });
  assert.equal((await userRepo.findByUsername(user.username.toUpperCase())).id, user.id);
  assert.equal(await userRepo.usernameExists(user.username.toUpperCase()), true);

  await communityRepo.create({ name: 'CaseTest', creatorId: user.id });
  await assert.rejects(communityRepo.create({ name: 'casetest', creatorId: user.id }), { status: 409 });
  assert.equal((await communityRepo.findByName('CASETEST')).name, 'CaseTest');
});

test('memberCount always equals the number of membership rows (join twice, leave twice)', async () => {
  const [owner, joiner] = [await makeUser(), await makeUser()];
  const community = await communityRepo.create({ name: 'counting', creatorId: owner.id });
  await communityRepo.addMember(community.id, owner.id, 'moderator');
  await Promise.all([communityRepo.addMember(community.id, joiner.id), communityRepo.addMember(community.id, joiner.id)]);
  assert.equal((await communityRepo.findById(community.id)).memberCount, 2);
  assert.deepEqual(await communityRepo.listModeratorIds(community.id), [owner.id]);

  await communityRepo.removeMember(community.id, joiner.id);
  await communityRepo.removeMember(community.id, joiner.id);
  assert.equal((await communityRepo.findById(community.id)).memberCount, 1);
  assert.equal(await communityRepo.getMember(community.id, joiner.id), null);
});

test('keyset pagination returns every post exactly once for new, top and hot', async () => {
  const author = await makeUser();
  const community = await communityRepo.create({ name: 'paging', creatorId: author.id });
  const base = Date.now() - 3_600_000;
  const posts = [];
  for (let i = 0; i < 13; i += 1) {
    // Several posts share a createdAt on purpose: the _id tie breaker must keep the order stable.
    posts.push(await postRepo.create({ communityId: community.id, authorId: author.id, title: `p${i}`, createdAt: new Date(base + Math.floor(i / 3) * 1000).toISOString() }));
  }
  await voteRepo.setVote(author.id, posts[5].id, 1);

  for (const sort of ['new', 'top', 'hot']) {
    const seen = [];
    let cursor;
    do {
      const page = await postRepo.list({ communityIds: [community.id], sort, cursor, limit: 4 });
      seen.push(...page.items.map((p) => p.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.equal(seen.length, 13, `${sort}: wrong number of posts`);
    assert.equal(new Set(seen).size, 13, `${sort}: a post appeared twice`);
  }
  const top = await postRepo.list({ communityIds: [community.id], sort: 'top', limit: 1 });
  assert.equal(top.items[0].id, posts[5].id);
});

test('votes: one row per user, score = sum of votes, comment votes work the same way', async () => {
  const [a, b] = [await makeUser(), await makeUser()];
  const community = await communityRepo.create({ name: 'voting_repo', creatorId: a.id });
  const post = await postRepo.create({ communityId: community.id, authorId: a.id, title: 'vote me' });

  assert.deepEqual(await voteRepo.setVote(a.id, post.id, 1), { score: 1, userVote: 1 });
  assert.deepEqual(await voteRepo.setVote(a.id, post.id, -1), { score: -1, userVote: -1 }); // up -> down = delta -2
  assert.deepEqual(await voteRepo.setVote(b.id, post.id, -1), { score: -2, userVote: -1 });
  assert.deepEqual(await voteRepo.setVote(a.id, post.id, 0), { score: -1, userVote: 0 });
  assert.equal(await Vote.countDocuments({ postId: post.id }), 1);
  assert.deepEqual(await voteRepo.getUserVotes(b.id, [post.id]), { [post.id]: -1 });

  const comment = await commentRepo.create({ postId: post.id, authorId: a.id, body: 'hi' });
  await Promise.all([voteRepo.setCommentVote(b.id, comment.id, 1), voteRepo.setCommentVote(b.id, comment.id, 1)]);
  assert.equal((await commentRepo.findById(comment.id)).score, 1);
  assert.equal(await CommentVote.countDocuments({ commentId: comment.id }), 1);
});

test('comments: commentCount follows create/soft delete (once), deleteCascade leaves no orphans', async () => {
  const user = await makeUser();
  const community = await communityRepo.create({ name: 'cascade', creatorId: user.id });
  const post = await postRepo.create({ communityId: community.id, authorId: user.id, title: 'to delete' });
  const top = await commentRepo.create({ postId: post.id, authorId: user.id, body: 'top' });
  const reply = await commentRepo.create({ postId: post.id, parentId: top.id, authorId: user.id, body: 'reply' });
  assert.equal((await postRepo.findById(post.id)).commentCount, 2);
  assert.equal(await commentRepo.hasChildren(top.id), true);

  await Promise.all([commentRepo.softDelete(top.id), commentRepo.softDelete(top.id)]);
  const deleted = await commentRepo.findById(top.id);
  assert.deepEqual([deleted.deleted, deleted.body, deleted.authorId], [true, '[deleted]', null]);
  assert.equal((await postRepo.findById(post.id)).commentCount, 1);

  await voteRepo.setVote(user.id, post.id, 1);
  await voteRepo.setCommentVote(user.id, reply.id, 1);
  await userPostRepo.setSaved(user.id, post.id, true);
  await postRepo.deleteCascade(post.id);
  assert.equal(await postRepo.findById(post.id), null);
  assert.equal(await Comment.countDocuments({ postId: post.id }), 0);
  assert.equal(await Vote.countDocuments({ postId: post.id }), 0);
  assert.equal(await CommentVote.countDocuments({ commentId: reply.id }), 0);
  assert.equal(await Save.countDocuments({ postId: post.id }), 0);
});

test('follows, saves and reports are idempotent', async () => {
  const [a, b] = [await makeUser(), await makeUser()];
  await Promise.all([followRepo.follow(a.id, b.id), followRepo.follow(a.id, b.id)]);
  assert.equal(await followRepo.countFollowers(b.id), 1);
  assert.deepEqual(await followRepo.listFollowingIds(a.id), [b.id]);
  assert.deepEqual(await followRepo.listFollowingOf([a.id]), [{ followerId: a.id, followeeId: b.id }]);

  const community = await communityRepo.create({ name: 'flags', creatorId: a.id });
  const post = await postRepo.create({ communityId: community.id, authorId: a.id, title: 'flag me' });
  await userPostRepo.setSaved(b.id, post.id, true);
  await userPostRepo.setSaved(b.id, post.id, true);
  assert.deepEqual(await userPostRepo.listSavedIds(b.id), [post.id]);
  assert.equal(await userPostRepo.report({ userId: b.id, postId: post.id, reason: 'spam' }), true);
  assert.equal(await userPostRepo.report({ userId: b.id, postId: post.id, reason: 'spam' }), false);
});

test('chats: one chat per member set (any order), unread counts, messages in send order', async () => {
  const [a, b] = [await makeUser(), await makeUser()];
  const [first, second] = await Promise.all([
    chatRepo.create({ participantIds: [a.id, b.id], creatorId: a.id }),
    chatRepo.create({ participantIds: [b.id, a.id], creatorId: b.id }),
  ]);
  assert.equal(first.id, second.id);
  assert.equal((await chatRepo.findByParticipants([b.id, a.id])).id, first.id);

  for (const body of ['1', '2', '3']) await chatRepo.addMessage({ chatId: first.id, senderId: a.id, body });
  assert.deepEqual(await chatRepo.unreadCounts(b.id), { [first.id]: 3 });
  assert.deepEqual(await chatRepo.unreadCounts(a.id), {}); // own messages are never unread
  const { items, hasMore } = await chatRepo.listMessages(first.id, { limit: 2 });
  assert.deepEqual(items.map((m) => m.body), ['2', '3']);
  assert.equal(hasMore, true);
  assert.equal((await chatRepo.lastMessages([first.id]))[first.id].body, '3');

  await chatRepo.markRead(first.id, b.id);
  assert.deepEqual(await chatRepo.unreadCounts(b.id), {});
  assert.deepEqual((await chatRepo.listForUser(b.id)).map((c) => c.id), [first.id]);
});

test('API: an unknown id is a 404, never a 500', async () => {
  const user = await newUser('ids');
  assert.equal((await request('GET', '/posts/not-an-object-id')).status, 404);
  assert.equal((await request('PUT', '/posts/not-an-object-id/vote', { cookie: user.cookie, body: { value: 1 } })).status, 404);
});
