import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAfford } from '../src/coach.js';

const today = new Date(2026, 10, 20);
const goals = [{ name: 'New headphones', target: 6000, saved: 1000 }];

test('yes when price fits left to spend', () => {
  const r = canAfford({ price: 2500, leftToSpend: 3000, incomeThisMonth: 9000, spentThisMonth: 6000, goals, today });
  assert.equal(r.verdict, 'yes');
  assert.match(r.line, /৳500/);
  assert.match(r.line, /New headphones slips by \d+ weeks?/);
  assert.equal(r.affordableOn, '2026-11-20');
});

test('no: affordable after shortfall / daily surplus days', () => {
  const r = canAfford({ price: 1800, leftToSpend: 1000, incomeThisMonth: 9000, spentThisMonth: 7000, goals, today });
  assert.equal(r.verdict, 'no');
  assert.equal(r.affordableOn, '2026-11-28');
  assert.match(r.line, /৳800 short.*28 Nov/);
});

test('no surplus: not this month, no date', () => {
  const r = canAfford({ price: 1800, leftToSpend: -200, incomeThisMonth: 5000, spentThisMonth: 5200, goals, today });
  assert.equal(r.affordableOn, null);
  assert.match(r.line, /Not this month/);
  assert.doesNotMatch(r.line, /Invalid|Infinity|NaN/);
});

test('bad price rejected', () => {
  for (const price of [0, -5, 'abc', '']) {
    assert.deepEqual(canAfford({ price, leftToSpend: 3000, incomeThisMonth: 1, spentThisMonth: 0, today }), { ok: false, reason: 'Enter a price above ৳0' });
  }
});
