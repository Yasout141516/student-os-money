import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMULAS, baseProperties, relationProp, rollupSum } from '../src/schema.js';

const DBS = ['wallet', 'categories', 'expenses', 'income', 'subscriptions', 'goals'];

test('all six databases defined, each with a title', () => {
  assert.deepEqual(Object.keys(baseProperties).sort(), [...DBS].sort());
  for (const db of DBS) assert.ok(baseProperties[db].Name.title, `${db}.Name is title`);
});

test('every (৳) number uses number_with_commas', () => {
  let count = 0;
  for (const props of Object.values(baseProperties)) {
    for (const [name, def] of Object.entries(props)) {
      if (name.endsWith('(৳)')) {
        count++;
        assert.equal(def.number?.format, 'number_with_commas', name);
      }
    }
  }
  assert.ok(count >= 6);
});

test('expenses formulas', () => {
  assert.equal(baseProperties.expenses['This Month'].formula.expression, FORMULAS.thisMonth);
  assert.equal(baseProperties.expenses['Amount This Month'].formula.expression, FORMULAS.amountThisMonth);
});

test('income source options', () => {
  assert.deepEqual(
    baseProperties.income.Source.select.options.map((o) => o.name),
    ['Pocket Money', 'Tuition', 'Gift', 'Other'],
  );
});

test('no relations or rollups in base properties', () => {
  for (const props of Object.values(baseProperties)) {
    for (const def of Object.values(props)) {
      assert.ok(!('relation' in def) && !('rollup' in def));
    }
  }
});

test('relationProp types', () => {
  assert.equal(relationProp('ds1').relation.type, 'dual_property');
  assert.equal(relationProp('ds1').relation.data_source_id, 'ds1');
  assert.equal(relationProp('ds1', false).relation.type, 'single_property');
});

test('rollupSum', () => {
  assert.deepEqual(rollupSum('Expenses', 'Amount This Month'), {
    rollup: { relation_property_name: 'Expenses', rollup_property_name: 'Amount This Month', function: 'sum' },
  });
});

test('review focus guards', () => {
  assert.ok(FORMULAS.thisMonth.includes('empty(prop("Date"))'));
  assert.ok(FORMULAS.progress.includes('> 0'));
});
