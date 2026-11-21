import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInsights, formatTaka } from '../src/coach.js';

const today = new Date(2026, 10, 21);
const rep = (n, e) => Array.from({ length: n }, (_, i) => ({ ...e, date: `2026-11-${String((i % 21) + 1).padStart(2, '0')}` }));
// Rides ৳3,200 (8 × ৳400), Snacks ৳1,240 (31 × ৳40), Food ৳3,160 (10 × ৳316) → total ৳7,600
const expenses = [
  ...rep(8, { name: 'Uber', amount: 400, category: '🚗 Rides' }),
  ...rep(31, { name: 'Coke', amount: 40, category: '🥤 Snacks & Drinks' }),
  ...rep(10, { name: 'Lunch', amount: 316, category: '🍛 Food' }),
];
const base = { today, expenses, leftToSpend: 2000, incomeThisMonth: 9600, goals: [{ name: 'New headphones', target: 6000, saved: 1000 }] };

test('top drain line first', () => {
  const [first] = buildInsights(base);
  for (const s of ['Rides', '42%', '৳3,200']) assert.ok(first.includes(s), first);
});

test('small-but-often line', () => {
  assert.ok(buildInsights(base).some((l) => l.includes('31') && l.includes('৳1,240')));
});

test('cut suggestion = average ride × 2/week × 4.3', () => {
  // average ride ৳400 → 400 × 2 × 4.3 = ৳3,440
  assert.ok(buildInsights(base).some((l) => l.includes('৳3,440')));
});

test('goal impact in weeks sooner', () => {
  const line = buildInsights(base).find((l) => l.includes('New headphones'));
  assert.ok(line && /weeks? sooner/.test(line), line);
});

test('no surplus → won\'t reach, no Infinity/NaN', () => {
  const lines = buildInsights({ ...base, leftToSpend: -500 });
  const line = lines.find((l) => l.includes('New headphones'));
  assert.ok(line.includes("won't reach"), line);
  for (const l of lines) assert.ok(!/Infinity|NaN/.test(l), l);
});

test('no expenses', () => {
  assert.deepEqual(buildInsights({ ...base, expenses: [] }), ['No spending logged this month yet.']);
});

test('skips goal line when no goals or goal reached', () => {
  assert.equal(buildInsights({ ...base, goals: [] }).length, 4);
  assert.equal(buildInsights({ ...base, goals: [{ name: 'Done', target: 100, saved: 100 }] }).length, 4);
});

test('pace line', () => {
  // 7600 / 21 × 30 = 10,857 projected vs 9,600 income → over by ৳1,257
  const last = buildInsights(base).at(-1);
  assert.ok(last.includes('over by ৳1,257'), last);
  assert.ok(buildInsights({ ...base, incomeThisMonth: 20000 }).at(-1).includes('on track'));
});

test('formatTaka', () => {
  assert.equal(formatTaka(1240.4), '৳1,240');
  assert.equal(formatTaka(-290), '-৳290');
});
