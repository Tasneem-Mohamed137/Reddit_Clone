import fs from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { UPLOAD_DIR } from '../src/middleware/upload.js';
import { closeServer, newUser, request } from './helpers.js';

after(closeServer);

const mod = await newUser('mod');
const reader = await newUser('reader');
const community = (await request('POST', '/communities', { cookie: mod.cookie, body: { name: 'features' } })).body.community;
const feedPath = `/communities/${community.name}/posts`;
const create = (user, body) => request('POST', feedPath, { cookie: user.cookie, body });

test('the post type is derived from the content and bad media URLs are refused', async () => {
  assert.equal((await create(reader, { title: 't' })).body.post.type, 'text');
  assert.equal((await create(reader, { title: 't', mediaUrls: ['https://example.com/a.png'] })).body.post.type, 'image');
  assert.equal((await create(reader, { title: 't', linkUrl: 'https://example.com' })).body.post.type, 'link');
  const tagged = await create(reader, { title: 't', tags: ['spoiler'] });
  assert.deepEqual(tagged.body.post.tags, ['spoiler']);

  assert.equal((await create(reader, { title: 't', mediaUrls: ['javascript:alert(1)'] })).status, 400);
  assert.equal((await create(reader, { title: 't', mediaUrls: ['/uploads/../../secret.png'] })).status, 400);
  assert.equal((await create(reader, { title: '' })).status, 400);
});

test('cursor pagination: no duplicates, no gaps, ends with a null cursor', async () => {
  const other = (await request('POST', '/communities', { cookie: mod.cookie, body: { name: 'paging' } })).body.community;
  for (let i = 0; i < 12; i += 1) {
    await request('POST', `/communities/${other.name}/posts`, { cookie: mod.cookie, body: { title: `post ${i}` } });
  }

  const ids = [];
  let cursor = null;
  const sizes = [];
  do {
    const page = (await request('GET', `/communities/${other.name}/posts?sort=new&limit=5${cursor ? `&cursor=${cursor}` : ''}`)).body;
    sizes.push(page.items.length);
    ids.push(...page.items.map((p) => p.id));
    cursor = page.nextCursor;
  } while (cursor);

  assert.deepEqual(sizes, [5, 5, 2]);
  assert.equal(new Set(ids).size, 12);
});

test('save and hide', async () => {
  const post = (await create(mod, { title: 'save and hide me' })).body.post;

  assert.equal((await request('PUT', `/posts/${post.id}/save`, { cookie: reader.cookie })).status, 200);
  const saved = (await request('GET', '/users/me/saved', { cookie: reader.cookie })).body.items;
  assert.deepEqual(saved.map((p) => p.id), [post.id]);
  assert.equal(saved[0].isSaved, true);
  await request('DELETE', `/posts/${post.id}/save`, { cookie: reader.cookie });
  assert.equal((await request('GET', '/users/me/saved', { cookie: reader.cookie })).body.items.length, 0);

  await request('PUT', `/posts/${post.id}/hide`, { cookie: reader.cookie });
  const forReader = (await request('GET', `${feedPath}?limit=50`, { cookie: reader.cookie })).body.items;
  const forMod = (await request('GET', `${feedPath}?limit=50`, { cookie: mod.cookie })).body.items;
  assert.ok(!forReader.some((p) => p.id === post.id));
  assert.ok(forMod.some((p) => p.id === post.id));
});

test('pinned posts lead the first page; at most 2 can be pinned', async () => {
  const [a, b, c] = await Promise.all([1, 2, 3].map(async (n) => (await create(mod, { title: `pin ${n}` })).body.post));
  assert.equal((await request('PUT', `/posts/${a.id}/pin`, { cookie: mod.cookie })).status, 200);
  assert.equal((await request('PUT', `/posts/${b.id}/pin`, { cookie: mod.cookie })).status, 200);
  const third = await request('PUT', `/posts/${c.id}/pin`, { cookie: mod.cookie });
  assert.equal(third.status, 400);
  assert.equal(third.body.error.code, 'TOO_MANY_PINNED');

  const first = (await request('GET', `${feedPath}?sort=new&limit=5`)).body.items;
  assert.deepEqual(new Set(first.slice(0, 2).map((p) => p.id)), new Set([a.id, b.id]));
  assert.ok(first[0].pinned);
  await request('DELETE', `/posts/${a.id}/pin`, { cookie: mod.cookie });
});

test('reports reach the moderators; the same user reporting twice counts once', async () => {
  const post = (await create(mod, { title: 'reported' })).body.post;
  await request('POST', `/posts/${post.id}/report`, { cookie: reader.cookie, body: { reason: 'spam' } });
  await request('POST', `/posts/${post.id}/report`, { cookie: reader.cookie, body: { reason: 'hate' } });
  assert.equal((await request('POST', `/posts/${post.id}/report`, { cookie: reader.cookie, body: { reason: 'nonsense' } })).status, 400);

  const queue = (await request('GET', `/communities/${community.name}/reports`, { cookie: mod.cookie })).body.items;
  const entry = queue.find((q) => q.post.id === post.id);
  assert.equal(entry.reports.length, 1);
  assert.equal(entry.reports[0].reason, 'spam');
});

test('moderators edit the community rules', async () => {
  const rules = [{ title: 'Be kind', description: 'No harassment.' }];
  const res = await request('PATCH', `/communities/${community.name}`, { cookie: mod.cookie, body: { description: 'About us', rules } });
  assert.equal(res.status, 200);
  const page = (await request('GET', `/communities/${community.name}`)).body.community;
  assert.equal(page.description, 'About us');
  assert.deepEqual(page.rules, rules);
});

test('search finds posts by title', async () => {
  await create(mod, { title: 'a very unique zebra title' });
  const found = (await request('GET', '/search?q=zebra&type=posts')).body.items;
  assert.equal(found.length, 1);
  assert.equal(found[0].title, 'a very unique zebra title');
});

test('deleting a post also deletes its uploaded file from disk', async () => {
  const name = `test-${Date.now()}.png`;
  const file = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(file, 'not really a png');

  const post = (await create(mod, { title: 'with upload', mediaUrls: [`/uploads/${name}`] })).body.post;
  assert.ok(fs.existsSync(file));
  assert.equal((await request('DELETE', `/posts/${post.id}`, { cookie: mod.cookie })).status, 204);
  assert.ok(!fs.existsSync(file));
});