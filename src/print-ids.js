import 'dotenv/config';
import { loadConfig } from './config.js';
import { explainNotionError } from './errors.js';
import { client } from './notion.js';
import { findIds, formatIds } from './ids.js';

try {
  const cfg = loadConfig();
  const ids = await findIds(client(cfg.token), cfg.parentPageId);
  console.log('# Paste into .env and Vercel env vars:');
  console.log(formatIds(ids));
} catch (err) {
  console.error(explainNotionError(err));
  process.exit(1);
}
