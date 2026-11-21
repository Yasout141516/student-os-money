import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSms, guessCategory } from '../src/sms.js';

const fixtures = readFileSync(new URL('./fixtures/sms.txt', import.meta.url), 'utf8')
  .split(/^---$/m)
  .map((block) => {
    const lines = block.split('\n');
    const expect = lines.find((l) => l.startsWith('# expect:'));
    const text = lines.filter((l) => l.trim() && !l.startsWith('#')).join('\n');
    return { text, expect: JSON.parse(expect.slice('# expect:'.length)) };
  });

for (const f of fixtures) {
  test(`fixture: ${f.text.slice(0, 40)}…`, () => assert.deepEqual(parseSms(f.text), f.expect));
}

test('comma amount parses (Review Focus 3)', () => {
  assert.deepEqual(
    parseSms('You have paid Tk 1,250.00 to Pathao Ltd. Fee Tk 0.00. TrxID ABC123XYZ at 21/11/2026'),
    { amount: 1250, merchant: 'Pathao Ltd', trxId: 'ABC123XYZ', kind: 'payment' },
  );
});

test('৳ and BDT amounts', () => {
  assert.equal(parseSms('You have paid ৳ 99 to Spotify. TrxID X1').amount, 99);
  assert.equal(parseSms('Payment BDT 2,000.50 to KFC successful.').amount, 2000.5);
});

test('unrecognised SMS (Review Focus 4)', () => {
  const r = parseSms('hello world');
  assert.equal(r.amount, null);
  assert.equal(r.kind, 'unknown');
  assert.equal(parseSms('').kind, 'unknown');
});

test('guessCategory', () => {
  assert.equal(guessCategory('Pathao Ltd'), '🚗 Rides');
  assert.equal(guessCategory('Pathao Food'), '🍛 Food');
  assert.equal(guessCategory('Spotify'), '📺 Subscriptions');
  assert.equal(guessCategory('OpenAI LLC'), '📺 Subscriptions');
  assert.equal(guessCategory('Random Shop'), '🎁 Other');
  assert.equal(guessCategory(null), '🎁 Other');
});

test('public/sms.js is a copy of src/sms.js', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  assert.equal(read('../public/sms.js'), read('../src/sms.js'));
});
