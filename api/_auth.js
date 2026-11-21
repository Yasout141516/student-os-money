import { timingSafeEqual } from 'node:crypto';

export function checkPin(req) {
  const expected = process.env.APP_PIN || '';
  const got = String(req.headers?.['x-pin'] ?? '');
  if (!expected || !got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
