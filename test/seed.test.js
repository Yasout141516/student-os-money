import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed, ymd } from '../src/seed.js';

const local = (y, m, d) => new Date(y, m - 1, d);

for (const today of [local(2026, 11, 30), local(2026, 11, 1), local(2026, 2, 28)]) {
  test(`dates stay in current month and not in future (${ymd(today)})`, () => {
    const seed = buildSeed(today);
    const month = ymd(today).slice(0, 7);
    for (const row of [...seed.expenses, ...seed.income]) {
      assert.equal(row.date.slice(0, 7), month, `${row.name} ${row.date}`);
      assert.ok(row.date <= ymd(today), `${row.name} ${row.date} in future`);
    }
  });
}

test('rides is the biggest category', () => {
  const totals = {};
  for (const e of buildSeed(local(2026, 11, 21)).expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  const [top] = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  assert.equal(top[0], '🚗 Rides');
});

test('expenses are many and positive, categories exist', () => {
  const seed = buildSeed(local(2026, 11, 21));
  const cats = new Set(seed.categories.map((c) => c.name));
  assert.ok(seed.expenses.length >= 20);
  for (const e of seed.expenses) {
    assert.ok(typeof e.amount === 'number' && e.amount > 0, e.name);
    assert.ok(cats.has(e.category), e.category);
  }
  for (const c of seed.categories) assert.ok(c.budget > 0);
});

test('income covers all sources', () => {
  const sources = new Set(buildSeed(local(2026, 11, 21)).income.map((i) => i.source));
  for (const s of ['Pocket Money', 'Tuition', 'Gift']) assert.ok(sources.has(s), s);
});

test('subscriptions renew within 14 days', () => {
  const today = local(2026, 11, 21);
  const max = ymd(local(2026, 12, 5));
  const subs = buildSeed(today).subscriptions;
  assert.equal(subs.length, 3);
  for (const s of subs) assert.ok(s.nextRenewal >= ymd(today) && s.nextRenewal <= max, s.nextRenewal);
});

test('two goals', () => {
  assert.equal(buildSeed(local(2026, 11, 21)).goals.length, 2);
});
