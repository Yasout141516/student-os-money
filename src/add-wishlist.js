import 'dotenv/config';
import { client, createDatabase } from './notion.js';
import { loadIds } from './ids.js';
import { relationProp } from './schema.js';
import { explainNotionError } from './errors.js';

// Adds the ⭐ Wishlist database to an existing Money page and prints WISHLIST_DS_ID.
try {
  const ids = loadIds();
  const notion = client(process.env.NOTION_TOKEN);
  const wallet = await notion.pages.retrieve({ page_id: ids.WALLET_PAGE_ID });
  const money = { number: { format: 'number_with_commas' } };
  const { dataSourceId } = await createDatabase(notion, ids.MONEY_PAGE_ID, 'Wishlist', {
    Item: { title: {} },
    'Price (৳)': money,
    Verdict: { select: { options: [{ name: 'Yes', color: 'green' }, { name: 'Not yet', color: 'red' }] } },
    'Affordable On': { date: {} },
    'Checked On': { date: {} },
    Wallet: relationProp(wallet.parent.data_source_id),
  }, '⭐');
  console.log(`# Paste into .env and Vercel env vars:\nWISHLIST_DS_ID=${dataSourceId}`);
} catch (err) {
  console.error(explainNotionError(err));
  process.exit(1);
}
