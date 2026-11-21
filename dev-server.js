// Local stand-in for Vercel: serves public/ and api/*.js on http://localhost:3000
import 'dotenv/config';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
const port = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname.startsWith('/api/') && !pathname.includes('_') && !pathname.includes('..')) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      req.body = raw ? JSON.parse(raw) : {};
      const mod = await import(`./api/${pathname.slice(5)}.js`);
      return await mod.default(req, res);
    }
    const file = pathname === '/' ? 'index.html' : pathname.slice(1).replace(/\.\./g, '');
    const data = await readFile(join('public', file));
    res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
}).listen(port, () => console.log(`Money OS on http://localhost:${port}`));
