// All of this must run BEFORE the app (and therefore env.js) is imported.
// MONGODB_URI comes from server/.env (same cluster), but every test FILE gets its own throwaway
// database, so tests never touch real data and test files never see each other's users.
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret',
  MONGODB_DB_NAME: `reddit_clone_test_${process.pid}_${Date.now()}`,
  AI_PROVIDER: 'mock',
  AI_API_KEY: '',
});
process.env.AUTH_RATE_LIMIT_MAX ??= '10000'; // a test file can lower it before importing this helper

const { app } = await import('../src/app.js');
const mongoose = (await import('mongoose')).default;

const server = await new Promise((resolve) => {
  const listening = app.listen(0, () => resolve(listening));
});
const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

// Calls the API in-process. Pass `cookie` to act as a logged-in user.
export const request = async (method, url, { body, cookie } = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    cookie: response.headers.getSetCookie()[0]?.split(';')[0],
  };
};

let counter = 0;
export const newUser = async (prefix = 'user') => {
  counter += 1;
  const username = `${prefix}${counter}`;
  const res = await request('POST', '/auth/register', {
    body: { email: `${username}@test.com`, username, password: 'Password123!' },
  });
  return { username, cookie: res.cookie, id: res.body.user.id };
};

export const closeServer = async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase(); // delete this file's throwaway test database
  await mongoose.disconnect(); // an open connection would keep the test process alive
};