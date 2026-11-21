import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetStatus } from '../src/budget.js';

test('over budget', () => assert.deepEqual(budgetStatus({ budget: 2000, spent: 2200 }), { over: true, overBy: 200, pct: 110 }));
test('zero budget never over', () => assert.equal(budgetStatus({ budget: 0, spent: 500 }).over, false));
test('empty budget never over', () => assert.deepEqual(budgetStatus({ budget: null, spent: 500 }), { over: false, overBy: 0, pct: 0 }));
test('under budget', () => assert.deepEqual(budgetStatus({ budget: 1500, spent: 1275 }), { over: false, overBy: 0, pct: 85 }));
