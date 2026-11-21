import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkCron } from '../api/_auth.js';

const saved = process.env.CRON_SECRET;
afterEach(() => { if (saved === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = saved; });

test('false with no header', () => {
  process.env.CRON_SECRET = 's3cret-value';
  assert.equal(checkCron({ headers: {} }), false);
});
test('false when CRON_SECRET unset', () => {
  delete process.env.CRON_SECRET;
  assert.equal(checkCron({ headers: { authorization: 'Bearer ' } }), false);
  assert.equal(checkCron({ headers: { authorization: 'Bearer undefined' } }), false);
});
test('false on wrong secret', () => {
  process.env.CRON_SECRET = 's3cret-value';
  assert.equal(checkCron({ headers: { authorization: 'Bearer wrong-value' } }), false);
});
test('true when they match', () => {
  process.env.CRON_SECRET = 's3cret-value';
  assert.equal(checkCron({ headers: { authorization: 'Bearer s3cret-value' } }), true);
});
