import 'dotenv/config';
import { client, addProperties } from './notion.js';
import { loadIds } from './ids.js';
import { FORMULAS, formula } from './schema.js';
import { explainNotionError } from './errors.js';

// Adds the "Over Budget" checkbox formula to Categories in an existing Money page.
try {
  const ids = loadIds();
  await addProperties(client(process.env.NOTION_TOKEN), ids.CATEGORIES_DS_ID, { 'Over Budget': formula(FORMULAS.overBudget) });
  console.log('Added "Over Budget" to Categories.');
} catch (err) {
  console.error(explainNotionError(err));
  process.exit(1);
}
