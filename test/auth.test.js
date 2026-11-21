import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPin } from '../api/_auth.js';

const req = (pin) => ({ headers: pin === undefined ? {} : { 'x-pin': pin } });

test('false with no header', () => {
  process.env.APP_PIN = '1234';
  assert.equal(checkPin(req()), false);
});

test('false when APP_PIN unset, even with a header', () => {
  delete process.env.APP_PIN;
  assert.equal(checkPin(req('1234')), false);
  assert.equal(checkPin(req('')), false);
});

test('false on wrong pin, true on match', () => {
  process.env.APP_PIN = '1234';
  assert.equal(checkPin(req('9999')), false);
  assert.equal(checkPin(req('1234')), true);
});
