import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// All of this must run BEFORE the app (and therefore env.js) is imported.
const dataFile = path.join(os.tmpdir(), `reddit-clone-test-${process.pid}-${Date.now()}.json`);
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret',
  DB_DRIVER: 'mock',
  DATA_FILE: dataFile, // a throwaway database, the real data.json is never touched
  AI_PROVIDER: 'mock',
  AI_API_KEY: '',
});
process.env.AUTH_RATE_LIMIT_MAX ??= '10000'; // a test file can lower it before importing this helper

const { app } = await import('../src/app.js');
const { flush } = await import('../src/repositories/mock/store.js');

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
  flush(); // writes pending data and cancels the debounce timer, so nothing re-creates the file afterwards
  fs.rmSync(dataFile, { force: true });
};