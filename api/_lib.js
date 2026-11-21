import { client } from '../src/notion.js';
import { loadIds } from '../src/ids.js';
import { explainNotionError } from '../src/errors.js';
import { checkPin } from './_auth.js';

// Wraps a handler with the PIN gate, Notion client and plain-English errors.
export function route(method, fn) {
  return async (req, res) => {
    if (!checkPin(req)) return res.status(401).json({ error: 'Wrong PIN' });
    if (req.method !== method) return res.status(405).json({ error: `Use ${method}` });
    try {
      const notion = client(process.env.NOTION_TOKEN);
      res.status(200).json(await fn(notion, loadIds(), req));
    } catch (err) {
      res.status(500).json({ error: explainNotionError(err) });
    }
  };
}
