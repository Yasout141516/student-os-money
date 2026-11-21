import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('missing NOTION_TOKEN throws', () => {
  assert.throws(() => loadConfig({}), /NOTION_TOKEN/);
});

test('missing NOTION_PARENT_PAGE_ID throws', () => {
  assert.throws(() => loadConfig({ NOTION_TOKEN: 'x' }), /NOTION_PARENT_PAGE_ID/);
});

test('valid config', () => {
  assert.deepEqual(loadConfig({ NOTION_TOKEN: 'x', NOTION_PARENT_PAGE_ID: 'p' }), {
    token: 'x',
    parentPageId: 'p',
    coursesDbId: null,
  });
});
