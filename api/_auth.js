import { timingSafeEqual } from 'node:crypto';

export function checkPin(req) {
  const expected = process.env.APP_PIN || '';
  const got = String(req.headers?.['x-pin'] ?? '');
  if (!expected || !got || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

// Vercel Cron sends "Authorization: Bearer $CRON_SECRET" automatically when CRON_SECRET is set.
export function checkCron(req) {
  const secret = process.env.CRON_SECRET || '';
  const got = String(req.headers?.authorization ?? '');
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
