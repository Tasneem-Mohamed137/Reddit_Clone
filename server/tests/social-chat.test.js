import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { closeServer, newUser, request } from './helpers.js';

after(closeServer);

const ann = await newUser('ann');
const ben = await newUser('ben');
const cat = await newUser('cat');

test('follow is idempotent, cannot target yourself, and unfollow works', async () => {
  const follow = await request('POST', `/users/${ben.username}/follow`, { cookie: ann.cookie });
  assert.deepEqual(follow.body, { isFollowing: true, followerCount: 1 });
  assert.equal((await request('POST', `/users/${ben.username}/follow`, { cookie: ann.cookie })).body.followerCount, 1);
  assert.equal((await request('POST', `/users/${ann.username}/follow`, { cookie: ann.cookie })).status, 400);
  assert.equal((await request('POST', '/users/nobody_here/follow', { cookie: ann.cookie })).status, 404);

  const unfollow = await request('DELETE', `/users/${ben.username}/follow`, { cookie: ann.cookie });
  assert.equal(unfollow.body.isFollowing, false);
  await request('POST', `/users/${ben.username}/follow`, { cookie: ann.cookie });
});

test('suggestions never contain me or people I already follow', async () => {
  const items = (await request('GET', '/users/me/suggestions', { cookie: ann.cookie })).body.items;
  const names = items.map((p) => p.username);
  assert.ok(!names.includes(ann.username));
  assert.ok(!names.includes(ben.username));
  assert.ok(names.includes(cat.username));
});

test('following someone notifies them once; commenting on a post notifies its author', async () => {
  const afterFollow = await request('GET', '/notifications', { cookie: ben.cookie });
  assert.equal(afterFollow.body.unreadCount, 1); // followed twice, notified once
  assert.equal(afterFollow.body.items[0].type, 'follow');

  await request('POST', '/communities', { cookie: ben.cookie, body: { name: 'notify' } });
  const post = (await request('POST', '/communities/notify/posts', { cookie: ben.cookie, body: { title: 'hello' } })).body.post;
  await request('POST', `/posts/${post.id}/comments`, { cookie: ben.cookie, body: { body: 'my own comment' } }); // no self notification
  await request('POST', `/posts/${post.id}/comments`, { cookie: ann.cookie, body: { body: 'nice' } });

  const list = await request('GET', '/notifications', { cookie: ben.cookie });
  assert.equal(list.body.items[0].type, 'post_comment');
  assert.equal(list.body.unreadCount, 2);
  await request('POST', '/notifications/read-all', { cookie: ben.cookie });
  assert.equal((await request('GET', '/notifications/unread-count', { cookie: ben.cookie })).body.count, 0);
});

test('chat: open, send, unread count, mark read', async () => {
  const opened = await request('POST', '/chats', { cookie: ann.cookie, body: { usernames: [ben.username] } });
  assert.equal(opened.status, 200);
  const chatId = opened.body.chat.id;
  assert.equal(opened.body.chat.isGroup, false);

  // Opening again returns the SAME chat.
  assert.equal((await request('POST', '/chats', { cookie: ann.cookie, body: { usernames: [ben.username] } })).body.chat.id, chatId);

  // A chat nobody wrote in is invisible to the other person.
  assert.equal((await request('GET', '/chats', { cookie: ben.cookie })).body.items.length, 0);

  const sent = await request('POST', `/chats/${chatId}/messages`, { cookie: ann.cookie, body: { body: 'hi ben' } });
  assert.equal(sent.status, 201);

  const benChats = (await request('GET', '/chats', { cookie: ben.cookie })).body.items;
  assert.equal(benChats[0].unreadCount, 1);
  assert.equal(benChats[0].lastMessage.body, 'hi ben');

  await request('POST', `/chats/${chatId}/read`, { cookie: ben.cookie });
  assert.equal((await request('GET', '/chats', { cookie: ben.cookie })).body.items[0].unreadCount, 0);
});

test('chat privacy and validation', async () => {
  const chatId = (await request('GET', '/chats', { cookie: ann.cookie })).body.items[0].id;
  assert.equal((await request('GET', `/chats/${chatId}/messages`, { cookie: cat.cookie })).status, 404); // not a member
  assert.equal((await request('POST', `/chats/${chatId}/messages`, { cookie: cat.cookie, body: { body: 'let me in' } })).status, 404);
  assert.equal((await request('POST', `/chats/${chatId}/messages`, { cookie: ann.cookie, body: { body: '   ' } })).status, 400);
  assert.equal((await request('POST', '/chats', { cookie: ann.cookie, body: { usernames: [ann.username] } })).status, 400);
  assert.equal((await request('GET', '/chats')).status, 401);

  const group = await request('POST', '/chats', { cookie: ann.cookie, body: { usernames: [ben.username, cat.username] } });
  assert.equal(group.body.chat.isGroup, true);
});