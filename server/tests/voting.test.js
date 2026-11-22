import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { closeServer, newUser, request } from './helpers.js';

after(closeServer);

const author = await newUser('author');
const voters = await Promise.all(Array.from({ length: 6 }, () => newUser('voter')));
await request('POST', '/communities', { cookie: author.cookie, body: { name: 'voting' } });
const post = (await request('POST', '/communities/voting/posts', { cookie: author.cookie, body: { title: 'vote on me' } })).body.post;

const vote = (user, value, path = `/posts/${post.id}/vote`) => request('PUT', path, { cookie: user.cookie, body: { value } });
const scoreOf = async () => (await request('GET', `/posts/${post.id}`)).body.post.score;

test('voting needs login and a value of 1, -1 or 0', async () => {
  assert.equal((await request('PUT', `/posts/${post.id}/vote`, { body: { value: 1 } })).status, 401);
  assert.equal((await vote(voters[0], 2)).status, 400);
  assert.equal((await vote(voters[0], 1, '/posts/missing/vote')).status, 404);
});

test('upvote, repeat (idempotent), switch to downvote, remove: the score follows the delta', async () => {
  const [user] = voters;
  assert.equal((await vote(user, 1)).body.score, 1);
  assert.equal((await vote(user, 1)).body.score, 1); // same vote again changes nothing
  assert.equal((await vote(user, -1)).body.score, -1); // +1 -> -1 is a delta of -2
  assert.equal((await vote(user, 0)).body.score, 0);
  assert.equal((await vote(user, 0)).body.score, 0);
});

test('120 concurrent mixed votes: the score equals the sum of every user\'s final vote', async () => {
  const values = [1, -1, 0];
  const calls = [];
  for (let i = 0; i < 120; i += 1) {
    calls.push(vote(voters[i % voters.length], values[Math.floor(Math.random() * values.length)]));
  }
  await Promise.all(calls);

  let sum = 0;
  for (const user of voters) {
    sum += (await request('GET', `/posts/${post.id}`, { cookie: user.cookie })).body.post.userVote;
  }
  assert.equal(await scoreOf(), sum);
});

test('comment votes work the same way and "top" sorts by score', async () => {
  const first = (await request('POST', `/posts/${post.id}/comments`, { cookie: author.cookie, body: { body: 'first' } })).body.comment;
  const second = (await request('POST', `/posts/${post.id}/comments`, { cookie: author.cookie, body: { body: 'second' } })).body.comment;
  const voteComment = (user, id, value) => vote(user, value, `/comments/${id}/vote`);

  assert.equal((await voteComment(voters[1], second.id, 1)).body.score, 1);
  assert.equal((await voteComment(voters[1], second.id, 1)).body.score, 1); // idempotent
  assert.equal((await voteComment(voters[2], second.id, 1)).body.score, 2);
  assert.equal((await voteComment(voters[1], first.id, -1)).body.score, -1);

  const top = (await request('GET', `/posts/${post.id}/comments?sort=top`, { cookie: voters[1].cookie })).body.items;
  assert.deepEqual(top.map((c) => c.id), [second.id, first.id]);
  assert.equal(top[0].userVote, 1);
  assert.equal(top[1].userVote, -1);
});

test('a deleted comment cannot be voted on', async () => {
  const comment = (await request('POST', `/posts/${post.id}/comments`, { cookie: author.cookie, body: { body: 'bye' } })).body.comment;
  await request('DELETE', `/comments/${comment.id}`, { cookie: author.cookie });
  const res = await vote(voters[3], 1, `/comments/${comment.id}/vote`);
  assert.ok([400, 404].includes(res.status));
});