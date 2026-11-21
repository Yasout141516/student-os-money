import { addWishlistItem } from '../src/notion.js';
import { canAfford, loadCoachData } from '../src/coach.js';
import { route } from './_lib.js';

export default route('POST', async (notion, ids, req) => {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const data = await loadCoachData(notion, ids, new Date());
  const r = canAfford({ ...data, price: body.price });
  if (!r.ok) return { verdict: null, line: r.reason, affordableOn: null };
  const out = { verdict: r.verdict, line: r.line, affordableOn: r.affordableOn };
  if (body.save === true) {
    if (!process.env.WISHLIST_DS_ID) throw new Error('WISHLIST_DS_ID is not set. Run `npm run wishlist`.');
    out.url = await addWishlistItem(notion, { ...ids, WISHLIST_DS_ID: process.env.WISHLIST_DS_ID }, { item: body.item, price: body.price, ...r });
  }
  return out;
});
