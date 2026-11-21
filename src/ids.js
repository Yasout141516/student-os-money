const KEYS = ['EXPENSES_DS_ID', 'CATEGORIES_DS_ID', 'GOALS_DS_ID', 'WALLET_PAGE_ID', 'MONEY_PAGE_ID'];

export function formatIds(ids) {
  return KEYS.map((k) => `${k}=${ids[k] ?? ''}`).join('\n');
}

export function loadIds(env = process.env) {
  const missing = KEYS.filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing ${missing.join(', ')}. Run \`npm run ids\` and paste the output into .env.`);
  return Object.fromEntries(KEYS.map((k) => [k, env[k]]));
}

async function children(notion, blockId) {
  const out = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

// Finds the most recently created "Money" page under the parent and resolves the add-on IDs.
export async function findIds(notion, parentPageId) {
  const pages = (await children(notion, parentPageId))
    .filter((b) => b.type === 'child_page' && b.child_page.title === 'Money')
    .sort((a, b) => b.created_time.localeCompare(a.created_time));
  if (!pages.length) throw new Error('No "Money" page found under NOTION_PARENT_PAGE_ID. Run `npm run setup` first.');
  const moneyPageId = pages[0].id;

  const ds = {};
  for (const b of await children(notion, moneyPageId)) {
    if (b.type !== 'child_database') continue;
    const db = await notion.databases.retrieve({ database_id: b.id });
    ds[b.child_database.title] = db.data_sources[0].id;
  }
  for (const name of ['Wallet', 'Categories', 'Expenses', 'Goals']) {
    if (!ds[name]) throw new Error(`Database "${name}" not found in the Money page.`);
  }
  const wallet = await notion.dataSources.query({ data_source_id: ds.Wallet, page_size: 1 });
  if (!wallet.results.length) throw new Error('Wallet has no row. Add "My Wallet" to the Wallet database.');

  return {
    EXPENSES_DS_ID: ds.Expenses,
    CATEGORIES_DS_ID: ds.Categories,
    GOALS_DS_ID: ds.Goals,
    WALLET_PAGE_ID: wallet.results[0].id,
    MONEY_PAGE_ID: moneyPageId,
  };
}
