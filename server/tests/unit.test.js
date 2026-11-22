import test from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/middleware/rateLimit.js';

test('rateLimit lets `max` requests through per window and blocks the rest with 429', () => {
  const limit = rateLimit({ windowMs: 60_000, max: 2 });
  const outcomes = [];
  for (let i = 0; i < 3; i += 1) limit({ ip: '1.2.3.4' }, {}, (err) => outcomes.push(err?.status ?? 'ok'));
  assert.deepEqual(outcomes, ['ok', 'ok', 429]);
});

test('rateLimit counts every user/IP separately', () => {
  const limit = rateLimit({ windowMs: 60_000, max: 1 });
  const outcomes = [];
  for (const ip of ['1.1.1.1', '2.2.2.2']) limit({ ip }, {}, (err) => outcomes.push(err?.status ?? 'ok'));
  assert.deepEqual(outcomes, ['ok', 'ok']);
});