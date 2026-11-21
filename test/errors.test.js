import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainNotionError } from '../src/errors.js';

test('404 explains Connections', () => {
  assert.match(explainNotionError({ status: 404, code: 'object_not_found' }), /Connections/);
});

test('403 explains Insert content', () => {
  assert.match(explainNotionError({ status: 403 }), /Insert content/);
});

test('401 explains token', () => {
  assert.match(explainNotionError({ status: 401 }), /NOTION_TOKEN/);
});

test('other errors return message', () => {
  assert.equal(explainNotionError(new Error('boom')), 'boom');
});
