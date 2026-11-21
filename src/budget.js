export function budgetStatus({ budget, spent }) {
  const b = Number(budget) || 0;
  const s = Number(spent) || 0;
  if (b <= 0) return { over: false, overBy: 0, pct: 0 };
  return { over: s > b, overBy: Math.max(0, Math.round(s - b)), pct: Math.round((s / b) * 100) };
}
