import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { closeServer, newUser, request } from './helpers.js';

after(closeServer);

const owner = await newUser('owner'); // creates the community, so is its moderator
const member = await newUser('member');
const outsider = await newUser('outsider');

const community = (await request('POST', '/communities', { cookie: owner.cookie, body: { name: 'permissions' } })).body.community;
const createPost = async (user, title = 'A post') =>
  (await request('POST', `/communities/${community.name}/posts`, { cookie: user.cookie, body: { title } })).body.post;

test('creating a community needs login; the creator becomes the moderator', async () => {
  assert.equal((await request('POST', '/communities', { body: { name: 'anonymous' } })).status, 401);
  const page = await request('GET', `/communities/${community.name}`, { cookie: owner.cookie });
  assert.equal(page.body.community.isModerator, true);
  assert.equal(page.body.community.moderators[0].username, owner.username);
  assert.equal((await request('POST', '/communities', { cookie: member.cookie, body: { name: 'permissions' } })).status, 409);
});

test('a moderator cannot leave; a normal member can', async () => {
  const mod = await request('DELETE', `/communities/${community.name}/membership`, { cookie: owner.cookie });
  assert.equal(mod.status, 400);
  assert.equal(mod.body.error.code, 'MODERATOR_CANNOT_LEAVE');

  await request('POST', `/communities/${community.name}/membership`, { cookie: member.cookie });
  assert.equal((await request('DELETE', `/communities/${community.name}/membership`, { cookie: member.cookie })).status, 200);
});

test('only the author edits a post', async () => {
  const post = await createPost(member);
  const patch = (user) => request('PATCH', `/posts/${post.id}`, { cookie: user.cookie, body: { body: 'edited' } });
  assert.equal((await patch(owner)).status, 403); // even the moderator cannot edit someone else's words
  assert.equal((await patch(outsider)).status, 403);
  assert.equal((await request('PATCH', `/posts/${post.id}`, { body: { body: 'x' } })).status, 401);
  assert.equal((await patch(member)).status, 200);
});

test('post deletion: author or moderator only (403 for everyone else)', async () => {
  const mine = await createPost(member, 'mine');
  assert.equal((await request('DELETE', `/posts/${mine.id}`, { cookie: outsider.cookie })).status, 403);
  assert.equal((await request('DELETE', `/posts/${mine.id}`, { cookie: member.cookie })).status, 204);

  const other = await createPost(member, 'removed by mod');
  assert.equal((await request('DELETE', `/posts/${other.id}`, { cookie: owner.cookie })).status, 204);
  assert.equal((await request('GET', `/posts/${other.id}`)).status, 404);
});

test('comment deletion: author or moderator only; a deleted comment with replies keeps its children', async () => {
  const post = await createPost(member, 'comments');
  const parent = (await request('POST', `/posts/${post.id}/comments`, { cookie: member.cookie, body: { body: 'parent' } })).body.comment;
  await request('POST', `/comments/${parent.id}/replies`, { cookie: outsider.cookie, body: { body: 'child' } });

  assert.equal((await request('DELETE', `/comments/${parent.id}`, { cookie: outsider.cookie })).status, 403);
  assert.equal((await request('DELETE', `/comments/${parent.id}`, { cookie: owner.cookie })).status, 204);

  const list = (await request('GET', `/posts/${post.id}/comments`)).body.items;
  assert.equal(list.length, 2);
  assert.equal(list.find((c) => c.id === parent.id).body, '[deleted]');
});

test('only moderators edit the community, pin posts and read reports', async () => {
  const edit = (user) => request('PATCH', `/communities/${community.name}`, { cookie: user.cookie, body: { description: 'New' } });
  assert.equal((await edit(member)).status, 403);
  assert.equal((await edit(owner)).status, 200);

  const post = await createPost(member, 'to pin');
  assert.equal((await request('PUT', `/posts/${post.id}/pin`, { cookie: member.cookie })).status, 403);
  assert.equal((await request('GET', `/communities/${community.name}/reports`, { cookie: member.cookie })).status, 403);
  assert.equal((await request('GET', `/communities/${community.name}/reports`, { cookie: owner.cookie })).status, 200);
});