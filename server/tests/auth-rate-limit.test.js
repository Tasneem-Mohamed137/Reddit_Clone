import test, { after } from 'node:test';
import assert from 'node:assert/strict';

process.env.AUTH_RATE_LIMIT_MAX = '3'; // must be set before the helper imports the app
const { closeServer, request } = await import('./helpers.js');

after(closeServer);

test('login attempts are limited per IP (429 after the limit)', async () => {
  const statuses = [];
  for (let i = 0; i < 5; i += 1) {
    statuses.push((await request('POST', '/auth/login', { body: { identifier: 'nobody', password: 'x' } })).status);
  }
  assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
});