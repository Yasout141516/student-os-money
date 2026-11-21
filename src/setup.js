import 'dotenv/config';
import { loadConfig } from './config.js';
import { explainNotionError } from './errors.js';
import { FORMULAS, baseProperties, formula, relationProp, rollupSum } from './schema.js';
import { buildSeed } from './seed.js';
import { formatIds } from './ids.js';
import {
  client, createPage, createDatabase, addProperties, getSyncedName, createRow, values as v,
} from './notion.js';

const DATABASES = [
  ['wallet', '👛 Wallet'],
  ['categories', '🏷️ Categories'],
  ['expenses', '💸 Expenses'],
  ['income', '💵 Income'],
  ['subscriptions', '📺 Subscriptions'],
  ['goals', '🎯 Goals'],
];

// [child db, relation name on child, parent db, name for the synced property on parent]
const DUAL_RELATIONS = [
  ['expenses', 'Wallet', 'wallet', 'Expenses'],
  ['income', 'Wallet', 'wallet', 'Income'],
  ['subscriptions', 'Wallet', 'wallet', 'Subscriptions'],
  ['expenses', 'Category', 'categories', 'Expenses'],
];

const MANUAL_STEPS = `
Manual steps in Notion (about 10 min, see README):
  1. Dashboard: callout with a linked view of Wallet (Left to Spend), columns with chart + Upcoming Renewals
  2. Chart: Expenses -> new Chart view, group by Category, sum Amount (৳), filter This Month = checked
  3. Buttons: "🥤 Coke ৳40" and "🚗 Ride" quick-add expenses (Wallet = My Wallet, Date = today)
  4. Default templates on Expenses and Income with Wallet = My Wallet and Date = today
  5. Reminders: 1 day before each subscription's Next Renewal
  6. Views: Subscriptions as Calendar, Goals as Gallery
  7. Progress bars: Goals -> Progress formula display = Bar`;

async function main() {
  const cfg = loadConfig();
  const withSample = !process.argv.includes('--no-sample');
  const notion = client(cfg.token);
  const log = (msg) => console.log(`• ${msg}`);

  const money = await createPage(notion, cfg.parentPageId, 'Money', '💰');
  log('Created 💰 Money page');

  const ds = {};
  for (const [key, title] of DATABASES) {
    const [icon, ...rest] = title.split(' ');
    ds[key] = (await createDatabase(notion, money.pageId, rest.join(' '), baseProperties[key], icon)).dataSourceId;
    log(`Created ${title}`);
  }

  for (const [child, relName, parent, parentName] of DUAL_RELATIONS) {
    await addProperties(notion, ds[child], { [relName]: relationProp(ds[parent]) });
    const synced = await getSyncedName(notion, ds[child], relName);
    if (synced !== parentName) {
      await addProperties(notion, ds[parent], { [synced]: { name: parentName } });
    }
  }
  if (cfg.coursesDbId) {
    const courses = await notion.databases.retrieve({ database_id: cfg.coursesDbId });
    await addProperties(notion, ds.expenses, { Course: relationProp(courses.data_sources[0].id, false) });
  }
  log('Linked databases');

  await addProperties(notion, ds.wallet, {
    'Spent This Month (৳)': rollupSum('Expenses', 'Amount This Month'),
    'Income This Month (৳)': rollupSum('Income', 'Amount This Month'),
    'Subscriptions Monthly (৳)': rollupSum('Subscriptions', 'Monthly Cost'),
  });
  await addProperties(notion, ds.categories, {
    'Spent This Month (৳)': rollupSum('Expenses', 'Amount This Month'),
  });
  await addProperties(notion, ds.wallet, { 'Left to Spend (৳)': formula(FORMULAS.leftToSpend) });
  await addProperties(notion, ds.categories, { 'Budget Left (৳)': formula(FORMULAS.budgetLeft) });
  log('Added rollups and formulas');

  let walletPageId = null;
  if (withSample) {
    const seed = buildSeed(new Date());
    walletPageId = await createRow(notion, ds.wallet, { Name: v.title('My Wallet') });
    const wallet = v.relation(walletPageId);
    const categoryIds = {};
    for (const c of seed.categories) {
      categoryIds[c.name] = await createRow(notion, ds.categories, {
        Name: v.title(c.name), 'Monthly Budget (৳)': v.number(c.budget),
      });
    }
    for (const e of seed.expenses) {
      await createRow(notion, ds.expenses, {
        Name: v.title(e.name), 'Amount (৳)': v.number(e.amount), Date: v.date(e.date),
        'Paid With': v.select(e.paidWith), Category: v.relation(categoryIds[e.category]), Wallet: wallet,
      });
    }
    for (const i of seed.income) {
      await createRow(notion, ds.income, {
        Name: v.title(i.name), 'Amount (৳)': v.number(i.amount), Date: v.date(i.date),
        Source: v.select(i.source), Wallet: wallet,
      });
    }
    for (const s of seed.subscriptions) {
      await createRow(notion, ds.subscriptions, {
        Name: v.title(s.name), 'Price (৳)': v.number(s.price), Billing: v.select(s.billing),
        'Next Renewal': v.date(s.nextRenewal), Active: v.checkbox(s.active), Wallet: wallet,
      });
    }
    for (const g of seed.goals) {
      await createRow(notion, ds.goals, {
        Name: v.title(g.name), 'Target (৳)': v.number(g.target), 'Saved (৳)': v.number(g.saved),
        Deadline: v.date(g.deadline),
      });
    }
    log(`Seeded ${seed.expenses.length} expenses, ${seed.income.length} income, ${seed.subscriptions.length} subscriptions, ${seed.goals.length} goals`);
  }

  console.log(`\nDone! Open your Money section: ${money.url}`);
  console.log(MANUAL_STEPS);
  console.log('\n# Add-on IDs: paste into .env and Vercel env vars');
  console.log(formatIds({
    EXPENSES_DS_ID: ds.expenses, CATEGORIES_DS_ID: ds.categories, GOALS_DS_ID: ds.goals,
    WALLET_PAGE_ID: walletPageId, MONEY_PAGE_ID: money.pageId,
  }));
}

main().catch((err) => {
  console.error(explainNotionError(err));
  process.exit(1);
});
