import 'dotenv/config';
import { loadConfig } from './config.js';
import { explainNotionError } from './errors.js';
import { client } from './notion.js';
import { loadIds } from './ids.js';
import { runCoach } from './coach.js';

try {
  const cfg = loadConfig();
  const { lines, url } = await runCoach(client(cfg.token), loadIds());
  for (const l of lines) console.log(`• ${l}`);
  console.log(`\nCoach page: ${url}`);
} catch (err) {
  console.error(explainNotionError(err));
  process.exit(1);
}
