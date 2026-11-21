import { addExpense, readSummary } from '../src/notion.js';
import { budgetStatus } from '../src/budget.js';
import { route } from './_lib.js';

const num = (p) => (p?.type === 'formula' ? p.formula.number : p?.type === 'rollup' ? p.rollup.number : p?.number) ?? 0;

export default route('POST', async (notion, ids, req) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const before = await readSummary(notion, ids);
  const { category } = await addExpense(notion, ids, body);
  // Notion rollups take a few seconds to catch up, so add this expense to the values read before writing.
  const amount = Number(body.amount);
  const status = budgetStatus({
    budget: category.properties['Monthly Budget (৳)']?.number,
    spent: num(category.properties['Spent This Month (৳)']) + amount,
  });
  return { ok: true, leftToSpend: before.leftToSpend - amount, budget: { category: body.category, ...status } };
});
