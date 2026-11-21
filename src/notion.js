import { Client, LogLevel } from '@notionhq/client';

export const NOTION_VERSION = '2025-09-03';

export function client(token) {
  return new Client({ auth: token, notionVersion: NOTION_VERSION, logLevel: LogLevel.ERROR });
}

const text = (content) => [{ type: 'text', text: { content } }];

export async function createPage(notion, parentPageId, title, icon) {
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: parentPageId },
    icon: icon ? { type: 'emoji', emoji: icon } : undefined,
    properties: { title: { title: text(title) } },
  });
  return { pageId: page.id, url: page.url };
}

export async function createDatabase(notion, parentPageId, title, properties, icon) {
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: text(title),
    icon: icon ? { type: 'emoji', emoji: icon } : undefined,
    initial_data_source: { properties },
  });
  return { databaseId: db.id, dataSourceId: db.data_sources[0].id };
}

export async function addProperties(notion, dataSourceId, properties) {
  return notion.dataSources.update({ data_source_id: dataSourceId, properties });
}

export async function getSyncedName(notion, childDataSourceId, relationPropName) {
  const ds = await notion.dataSources.retrieve({ data_source_id: childDataSourceId });
  const name = ds.properties[relationPropName]?.relation?.dual_property?.synced_property_name;
  if (!name) throw new Error(`Relation "${relationPropName}" has no synced property; is it dual_property?`);
  return name;
}

export async function createRow(notion, dataSourceId, properties) {
  const page = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dataSourceId },
    properties,
  });
  return page.id;
}

export async function readNumber(notion, pageId, propName) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const prop = page.properties[propName];
  if (prop?.type === 'rollup') return prop.rollup.number;
  if (prop?.type === 'formula') return prop.formula.number;
  if (prop?.type === 'number') return prop.number;
  throw new Error(`Property "${propName}" not found or not numeric`);
}

export async function archivePage(notion, pageId) {
  return notion.pages.update({ page_id: pageId, in_trash: true });
}

export const values = {
  title: (s) => ({ title: text(s) }),
  number: (n) => ({ number: n }),
  date: (d) => ({ date: d ? { start: d } : null }),
  select: (name) => ({ select: { name } }),
  checkbox: (b) => ({ checkbox: b }),
  relation: (...ids) => ({ relation: ids.map((id) => ({ id })) }),
};

export function todayIn(timeZone = process.env.TZ_NAME || 'Asia/Dhaka', now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone });
}

export async function addExpense(notion, ids, { name, amount, category, paidWith }) {
  const amt = Number(amount);
  if (!name || !Number.isFinite(amt) || amt <= 0) throw new Error('Expense needs a name and a positive amount.');
  const cats = await notion.dataSources.query({
    data_source_id: ids.CATEGORIES_DS_ID,
    filter: { property: 'Name', title: { equals: category } },
    page_size: 1,
  });
  if (!cats.results.length) throw new Error(`Category "${category}" not found in Notion.`);
  const properties = {
    Name: values.title(String(name).slice(0, 100)),
    'Amount (৳)': values.number(amt),
    Date: values.date(todayIn()),
    Category: values.relation(cats.results[0].id),
    Wallet: values.relation(ids.WALLET_PAGE_ID),
  };
  if (paidWith) properties['Paid With'] = values.select(paidWith);
  await createRow(notion, ids.EXPENSES_DS_ID, properties);
  return { ok: true, category: cats.results[0] };
}

export async function readSummary(notion, ids) {
  const wallet = await notion.pages.retrieve({ page_id: ids.WALLET_PAGE_ID });
  const num = (p) => (p?.type === 'formula' ? p.formula.number : p?.rollup?.number) ?? 0;
  return {
    leftToSpend: num(wallet.properties['Left to Spend (৳)']),
    spentThisMonth: num(wallet.properties['Spent This Month (৳)']),
  };
}

export async function addWishlistItem(notion, ids, { item, price, verdict, affordableOn }) {
  const page = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: ids.WISHLIST_DS_ID },
    properties: {
      Item: values.title(String(item || 'Wishlist item').slice(0, 100)),
      'Price (৳)': values.number(Number(price)),
      Verdict: values.select(verdict === 'yes' ? 'Yes' : 'Not yet'),
      'Affordable On': affordableOn ? values.date(affordableOn) : { date: null },
      'Checked On': values.date(todayIn()),
      Wallet: values.relation(ids.WALLET_PAGE_ID),
    },
  });
  return page.url;
}
