// Parses bKash payment SMS. Pure and dependency-free so the browser can import it too.
const AMOUNT = /(?:Tk|৳|BDT)\s*([\d,]+(?:\.\d+)?)/i;
const TRX = /TrxID\s*[:.]?\s*([A-Z0-9]+)/i;
const PARTY_END = /\.(?:\s|$)|\s+(?:Fee|TrxID|successful|Ref|Balance)\b/i;

function party(text, word) {
  const m = text.match(new RegExp(`\\b${word}\\s+(.+)`, 'i'));
  if (!m) return null;
  const end = m[1].search(PARTY_END);
  const out = (end === -1 ? m[1] : m[1].slice(0, end)).trim();
  return out || null;
}

export function parseSms(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  const received = /\breceived\b/i.test(t);
  const payment = !received && /\bpaid\b|\bpayment\b|send money|cash out/i.test(t);
  const amountMatch = t.match(AMOUNT);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null;
  const kind = amount === null ? 'unknown' : received ? 'received' : payment ? 'payment' : 'unknown';
  const amountEnd = amountMatch ? amountMatch.index + amountMatch[0].length : 0;
  const rest = t.slice(amountEnd);
  return {
    amount,
    merchant: kind === 'unknown' ? null : party(rest, received ? 'from' : 'to'),
    trxId: t.match(TRX)?.[1] ?? null,
    kind,
  };
}

const RULES = [
  [/pathao food|foodpanda|kfc|cafe|café|restaurant|pizza|burger/i, '🍛 Food'],
  [/pathao|uber|obhai|shohoz/i, '🚗 Rides'],
  [/spotify|netflix|youtube|google|chatgpt|openai/i, '📺 Subscriptions'],
];

export function guessCategory(merchant) {
  const m = String(merchant ?? '');
  return RULES.find(([re]) => re.test(m))?.[1] ?? '🎁 Other';
}
