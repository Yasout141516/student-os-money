import 'dotenv/config';
import { loadConfig } from './config.js';
import { explainNotionError } from './errors.js';
import { FORMULAS, formula, relationProp, rollupSum } from './schema.js';
import {
  client, createPage, createDatabase, addProperties, getSyncedName,
  createRow, readNumber, archivePage, values as v,
} from './notion.js';

const ymd = (d) => d.toISOString().slice(0, 10);

async function main() {
  const cfg = loadConfig();
  const notion = client(cfg.token);
  const scratch = await createPage(notion, cfg.parentPageId, 'Rollup check (scratch)', '🧪');
  try {
    const expenses = await createDatabase(notion, scratch.pageId, 'Expenses', {
      Name: { title: {} },
      'Amount (৳)': { number: { format: 'number_with_commas' } },
      Date: { date: {} },
      'This Month': formula(FORMULAS.thisMonth),
      'Amount This Month': formula(FORMULAS.amountThisMonth),
    });
    const wallet = await createDatabase(notion, scratch.pageId, 'Wallet', { Name: { title: {} } });

    await addProperties(notion, expenses.dataSourceId, { Wallet: relationProp(wallet.dataSourceId) });
    const synced = await getSyncedName(notion, expenses.dataSourceId, 'Wallet');
    await addProperties(notion, wallet.dataSourceId, {
      'Spent This Month (৳)': rollupSum(synced, 'Amount This Month'),
    });

    const walletRow = await createRow(notion, wallet.dataSourceId, { Name: v.title('My Wallet') });
    const today = new Date();
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(today.getMonth() - 2);
    for (const [name, amount, d] of [['Coke', 40, today], ['Old ride', 100, twoMonthsAgo]]) {
      await createRow(notion, expenses.dataSourceId, {
        Name: v.title(name),
        'Amount (৳)': v.number(amount),
        Date: v.date(ymd(d)),
        Wallet: v.relation(walletRow),
      });
    }

    const total = await readNumber(notion, walletRow, 'Spent This Month (৳)');
    if (total === 40) {
      console.log(`Rollup OK: ${total}`);
    } else {
      console.error(`Rollup MISMATCH: expected 40, got ${total}`);
      process.exitCode = 1;
    }
  } finally {
    await archivePage(notion, scratch.pageId);
  }
}

main().catch((err) => {
  console.error(explainNotionError(err));
  process.exit(1);
});
