import { client } from '../src/notion.js';
import { loadIds } from '../src/ids.js';
import { loadCoachData, buildInsights, writeCoachPage } from '../src/coach.js';
import { explainNotionError } from '../src/errors.js';
import { checkCron } from './_auth.js';

// Weekly auto-coach: Vercel Cron (Mondays 03:00 UTC = 9 AM Dhaka) writes a Coach page to Notion.
export default async function handler(req, res) {
  if (!checkCron(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const notion = client(process.env.NOTION_TOKEN);
    const ids = loadIds();
    const today = new Date();
    const lines = buildInsights(await loadCoachData(notion, ids, today));
    res.status(200).json({ url: await writeCoachPage(notion, ids.MONEY_PAGE_ID, lines, today) });
  } catch (err) {
    res.status(500).json({ error: explainNotionError(err) });
  }
}
