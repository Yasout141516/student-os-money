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
