import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Serves a fixture site the plain way: no compression, no security headers, 404 for anything missing. */
export async function serveFixture(name: string): Promise<{ url: string; close: () => Promise<void> }> {
  const root = new URL(`../../../fixtures/sites/${name}/`, import.meta.url).pathname;
  const server: Server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const file = path === '/' ? 'index.html' : extname(path) ? path.slice(1) : `${path.slice(1)}.html`;
    try {
      const body = await readFile(join(root, file));
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>404</title><h1>Nie znaleziono</h1>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  return { url: `http://localhost:${port}/`, close: () => new Promise((resolve) => server.close(() => resolve())) };
}
