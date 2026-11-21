import { values as v } from './notion.js';

const WEEKS_PER_MONTH = 4.3;
const CUTS_PER_WEEK = 2;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTaka(n) {
  const r = Math.round(n);
  return `${r < 0 ? '-' : ''}৳${Math.abs(r).toLocaleString('en-US')}`;
}

const byCategory = (expenses) => {
  const m = new Map();
  for (const e of expenses) {
    const c = m.get(e.category) ?? { name: e.category, total: 0, count: 0 };
    c.total += e.amount;
    c.count += 1;
    m.set(e.category, c);
  }
  return [...m.values()];
};

const weeks = (months) => {
  const w = Math.max(1, Math.round(months * WEEKS_PER_MONTH));
  return `${w} week${w === 1 ? '' : 's'}`;
};
const oneDecimal = (n) => Math.round(n * 10) / 10;

export function buildInsights({ today, expenses, leftToSpend, incomeThisMonth, goals }) {
  if (!expenses.length) return ['No spending logged this month yet.'];
  const cats = byCategory(expenses);
  const total = cats.reduce((s, c) => s + c.total, 0);
  const lines = [];

  const top = [...cats].sort((a, b) => b.total - a.total)[0];
  lines.push(`${top.name} is your top drain: ${Math.round((top.total / total) * 100)}% of spending (${formatTaka(top.total)} of ${formatTaka(total)}).`);

  const often = [...(cats.length > 1 ? cats.filter((c) => c !== top) : cats)].sort((a, b) => b.count - a.count || b.total - a.total)[0];
  lines.push(`${often.name}: ${often.count} buys so far, ${formatTaka(often.total)}. Small, but it adds up.`);

  const cutCat = cats.find((c) => /rides?/i.test(c.name)) ?? top;
  const avg = cutCat.total / cutCat.count;
  const cut = Math.round(avg * CUTS_PER_WEEK * WEEKS_PER_MONTH);
  const isRides = /rides?/i.test(cutCat.name);
  const what = isRides ? 'rides' : `${cutCat.name} buys`;
  lines.push(`Your average ${isRides ? 'ride' : `${cutCat.name} buy`} costs ${formatTaka(avg)}. Skipping ${CUTS_PER_WEEK} ${what} a week saves about ${formatTaka(cut)}/month.`);

  const goal = goals.find((g) => g.target > 0 && g.saved < g.target);
  if (goal) {
    const remaining = goal.target - goal.saved;
    const surplus = Math.max(leftToSpend, 0);
    const after = remaining / (surplus + cut);
    if (surplus === 0) {
      lines.push(cut > 0
        ? `🎯 At current spending you won't reach ${goal.name} (${formatTaka(remaining)} to go); cutting saves ${formatTaka(cut)}/month and gets you there in ${weeks(after)}.`
        : `🎯 At current spending you won't reach ${goal.name} (${formatTaka(remaining)} to go).`);
    } else {
      const before = remaining / surplus;
      lines.push(`🎯 ${goal.name}: ${formatTaka(remaining)} to go. At ${formatTaka(surplus)}/month that's ${oneDecimal(before)} months; with the cut it's ${oneDecimal(after)} months, ${weeks(before - after)} sooner.`);
    }
  }

  const day = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projected = (total / day) * daysInMonth;
  lines.push(projected > incomeThisMonth
    ? `📈 At this pace you'll spend ${formatTaka(projected)} this month, over by ${formatTaka(projected - incomeThisMonth)} vs your ${formatTaka(incomeThisMonth)} income.`
    : `📈 At this pace you'll spend ${formatTaka(projected)} this month: on track with your ${formatTaka(incomeThisMonth)} income.`);
  return lines;
}

async function queryAll(notion, dataSourceId, filter) {
  const out = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: dataSourceId, filter, start_cursor: cursor, page_size: 100 });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

const title = (p) => p.properties.Name.title.map((t) => t.plain_text).join('');
const num = (prop) => (prop?.type === 'formula' ? prop.formula.number : prop?.type === 'rollup' ? prop.rollup.number : prop?.number) ?? 0;

export async function loadCoachData(notion, ids, today = new Date()) {
  const categories = await queryAll(notion, ids.CATEGORIES_DS_ID);
  const catName = Object.fromEntries(categories.map((c) => [c.id, title(c)]));
  const rows = await queryAll(notion, ids.EXPENSES_DS_ID, { property: 'This Month', formula: { checkbox: { equals: true } } });
  const expenses = rows.map((r) => ({
    name: title(r),
    amount: r.properties['Amount (৳)'].number ?? 0,
    category: catName[r.properties.Category.relation[0]?.id] ?? '🎁 Other',
    date: r.properties.Date.date?.start ?? null,
  }));
  const wallet = await notion.pages.retrieve({ page_id: ids.WALLET_PAGE_ID });
  const goals = (await queryAll(notion, ids.GOALS_DS_ID)).map((g) => ({
    name: title(g), target: g.properties['Target (৳)'].number ?? 0, saved: g.properties['Saved (৳)'].number ?? 0,
  }));
  return {
    today,
    expenses,
    leftToSpend: num(wallet.properties['Left to Spend (৳)']),
    incomeThisMonth: num(wallet.properties['Income This Month (৳)']),
    spentThisMonth: num(wallet.properties['Spent This Month (৳)']),
    goals,
  };
}

const rich = (content) => [{ type: 'text', text: { content } }];

export async function writeCoachPage(notion, moneyPageId, lines, today = new Date()) {
  const [first, ...rest] = lines;
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: moneyPageId },
    properties: { title: v.title(`🧠 Money Coach · ${today.getDate()} ${MON[today.getMonth()]} ${today.getFullYear()}`) },
    children: [
      { type: 'callout', callout: { rich_text: rich(first), icon: { type: 'emoji', emoji: '🧠' }, color: 'yellow_background' } },
      ...rest.map((l) => ({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: rich(l) } })),
    ],
  });
  return page.url;
}

export async function runCoach(notion, ids, today = new Date()) {
  const data = await loadCoachData(notion, ids, today);
  const lines = buildInsights(data);
  const url = await writeCoachPage(notion, ids.MONEY_PAGE_ID, lines, today);
  return { lines, url };
}
