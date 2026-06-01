/**
 * SwingEdge — Server
 * Works locally AND on Railway (or any Node.js host).
 *
 * LOCAL:
 *   node server.js
 *   Desktop → http://localhost:3000
 *   Mobile  → http://<your-local-ip>:3000  (same WiFi)
 *
 * RAILWAY (cloud):
 *   Push to GitHub → connect Railway → done.
 *   Access from anywhere at your Railway URL.
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');
const os    = require('os');

// Railway injects PORT via env; fall back to 3000 locally
const PORT     = parseInt(process.env.PORT || '3000', 10);
const IS_CLOUD = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RENDER || !!process.env.PORT;
const HTML_FILE = path.join(__dirname, 'swing-trade-analyzer.html');

// ── Local network IP (only useful when running locally) ───────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

// ── HTTPS proxy helper ────────────────────────────────────────────────────────
function proxyRequest(targetUrl, method, extraHeaders, body, res) {
  const parsed = new URL(targetUrl);
  const options = {
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname + parsed.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SwingEdge/2.0',
      ...extraHeaders
    }
  };

  const req = https.request(options, upstream => {
    const chunks = [];
    upstream.on('data', c => chunks.push(c));
    upstream.on('end', () => {
      res.writeHead(upstream.statusCode, {
        'Content-Type': upstream.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      });
      res.end(Buffer.concat(chunks));
    });
  });

  req.on('error', err => {
    console.error('[proxy error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
  });

  if (body) req.write(body);
  req.end();
}

// ── Body reader ───────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Startup message ───────────────────────────────────────────────────────────
function printStartup() {
  const localIP = getLocalIP();
  console.log('');
  if (IS_CLOUD) {
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║   SwingEdge — Running on Cloud                   ║');
    console.log(`  ║   Port: ${String(PORT).padEnd(43)}║`);
    console.log('  ║   Access via your Railway URL                    ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
  } else {
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║   SwingEdge — Local Server                       ║');
    console.log(`  ║   Desktop : http://localhost:${PORT}${' '.repeat(Math.max(0,20-String(PORT).length))}║`);
    if (localIP) {
      console.log(`  ║   Mobile  : http://${localIP}:${PORT}${' '.repeat(Math.max(0,29-localIP.length-String(PORT).length))}║`);
      console.log('  ║   (phone must be on same WiFi)                   ║');
    }
    console.log('  ║   Press Ctrl+C to stop                           ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
  }
  console.log('');
}

// ── Main server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url, `http://localhost:${PORT}`);

  // CORS — allow everything
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── /proxy/polygon/* → api.polygon.io ────────────────────────────────────
  if (pathname.startsWith('/proxy/polygon/')) {
    const polyPath = pathname.replace('/proxy/polygon', '') + (search || '');
    console.log(`[polygon] ${polyPath.split('?')[0]}`);
    proxyRequest('https://api.polygon.io' + polyPath, 'GET', {}, null, res);
    return;
  }

  // ── /proxy/anthropic → api.anthropic.com/v1/messages ─────────────────────
  if (pathname === '/proxy/anthropic') {
    const body = await readBody(req);
    console.log(`[anthropic] ${body.length} bytes`);
    proxyRequest(
      'https://api.anthropic.com/v1/messages',
      'POST',
      {
        'x-api-key':           req.headers['x-api-key'] || '',
        'anthropic-version':   req.headers['anthropic-version'] || '2023-06-01',
        'Content-Length':      body.length
      },
      body, res
    );
    return;
  }

  // ── /health — used by browser to detect proxy mode ────────────────────────
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, version: '2.0', cloud: IS_CLOUD }));
  }

  // ── Serve HTML ────────────────────────────────────────────────────────────
  if (pathname === '/' || pathname === '/index.html' || pathname.endsWith('.html')) {
    try {
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch(e) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('swing-trade-analyzer.html not found next to server.js');
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// Bind to 0.0.0.0 so both localhost AND local network IP work
server.listen(PORT, '0.0.0.0', printStartup);
