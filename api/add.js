import { addExpense, readSummary } from '../src/notion.js';
import { route } from './_lib.js';

export default route('POST', async (notion, ids, req) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const before = await readSummary(notion, ids);
  await addExpense(notion, ids, body);
  // Notion rollups take a few seconds to catch up, so compute the new value directly.
  return { ok: true, leftToSpend: before.leftToSpend - Number(body.amount) };
});
