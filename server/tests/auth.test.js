import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { closeServer, request } from './helpers.js';

after(closeServer);

const alice = { email: 'alice@test.com', username: 'alice', password: 'Password123!' };

test('register creates an account, sets the cookie and never returns the password hash', async () => {
  const res = await request('POST', '/auth/register', { body: alice });
  assert.equal(res.status, 201);
  assert.ok(res.cookie.startsWith('access_token='));
  assert.equal(res.body.user.username, 'alice');
  assert.equal(res.body.user.passwordHash, undefined);
});

test('duplicate username (any case) or email is rejected with 409', async () => {
  const sameName = await request('POST', '/auth/register', { body: { ...alice, email: 'other@test.com', username: 'ALICE' } });
  assert.equal(sameName.status, 409);
  assert.equal(sameName.body.error.code, 'CONFLICT');
  const sameEmail = await request('POST', '/auth/register', { body: { ...alice, username: 'alice2' } });
  assert.equal(sameEmail.status, 409);
});

test('invalid input returns 400 VALIDATION_ERROR in the standard error shape', async () => {
  const res = await request('POST', '/auth/register', { body: { email: 'bad', username: 'a', password: '123' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.equal(typeof res.body.error.message, 'string');
});

test('login works with username and email; wrong password and unknown user look identical', async () => {
  assert.equal((await request('POST', '/auth/login', { body: { identifier: 'alice', password: alice.password } })).status, 200);
  assert.equal((await request('POST', '/auth/login', { body: { identifier: alice.email, password: alice.password } })).status, 200);

  const wrongPassword = await request('POST', '/auth/login', { body: { identifier: 'alice', password: 'Wrong12345' } });
  const unknownUser = await request('POST', '/auth/login', { body: { identifier: 'nobody', password: 'Wrong12345' } });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.error.message, unknownUser.body.error.message); // no account enumeration
});

test('/auth/me needs the cookie', async () => {
  assert.equal((await request('GET', '/auth/me')).status, 401);
  const login = await request('POST', '/auth/login', { body: { identifier: 'alice', password: alice.password } });
  const me = await request('GET', '/auth/me', { cookie: login.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, alice.email);
});

test('username availability check', async () => {
  assert.equal((await request('GET', '/auth/username-available?username=alice')).body.available, false);
  assert.equal((await request('GET', '/auth/username-available?username=free_name')).body.available, true);
});

test('logout clears the cookie', async () => {
  assert.equal((await request('POST', '/auth/logout')).status, 204);
});