'use strict';

/**
 * Server statis tanpa dependency untuk Threads Mutual.
 * - Variabel lingkungan: PORT (default 3000), HOST (default 0.0.0.0)
 * - Healthcheck: GET /healthz
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; " +
    "connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const TEXT = { 'Content-Type': 'text/plain; charset=utf-8' };

function reply(res, status, headers, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return reply(res, 405, { ...TEXT, Allow: 'GET, HEAD' }, 'Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return reply(res, 400, TEXT, 'Bad Request');
  }
  if (pathname.includes('\0')) return reply(res, 400, TEXT, 'Bad Request');

  if (pathname === '/healthz') {
    return reply(
      res,
      200,
      { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      req.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok' })
    );
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return reply(res, 404, TEXT, 'Not Found');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return reply(res, 404, TEXT, 'Not Found');

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath)
      .on('error', () => res.destroy())
      .pipe(res);
  });
}

const server = http.createServer(handler);
// Di belakang load balancer/proxy, keep-alive harus lebih lama dari timeout proxy.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function shutdown(signal) {
  console.log(`${signal} diterima, menutup server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Threads Mutual berjalan di http://${HOST}:${PORT}`);
  });
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = server;
