/**
 * SwingEdge — Server
 * Works locally AND on Render (or any Node.js host).
 *
 * LOCAL:
 *   node server.js
 *   Desktop → http://localhost:3000
 *   Mobile  → http://<your-local-ip>:3000  (same WiFi)
 *
 * RENDER (cloud):
 *   Push to GitHub → connect Render → done.
 *   Access from anywhere at your Render URL.
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');
const os    = require('os');

// Render injects PORT via env; fall back to 3000 locally
const PORT     = parseInt(process.env.PORT || '3000', 10);
const IS_CLOUD = !!(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME);
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
    console.log('  ║   SwingEdge — Running on Render                  ║');
    console.log(`  ║   Port : ${String(PORT).padEnd(42)}║`);
    console.log('  ║   Access via your Render URL                     ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║   SwingEdge — Local Server                       ║');
    console.log(`  ║   Desktop : http://localhost:${pad(PORT, 21)}║`);
    if (localIP) {
      const mobileUrl = `http://${localIP}:${PORT}`;
      console.log(`  ║   Mobile  : ${pad(mobileUrl, 38)}║`);
      console.log('  ║   (phone must be on same WiFi)                   ║');
    }
    console.log('  ║   Ctrl+C to stop                                 ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
  }
  console.log('');
}

// ── Main server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url, `http://localhost:${PORT}`);

  // CORS — allow everything (needed for mobile browsers calling the proxy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── /proxy/polygon/* → api.polygon.io ─────────────────────────────────────
  if (pathname.startsWith('/proxy/polygon/')) {
    const polyPath = pathname.replace('/proxy/polygon', '') + (search || '');
    console.log(`[polygon] ${polyPath.split('?')[0]}`);
    proxyRequest('https://api.polygon.io' + polyPath, 'GET', {}, null, res);
    return;
  }

  // ── /proxy/anthropic → api.anthropic.com/v1/messages ──────────────────────
  // Uses streaming proxy: forwards response chunks immediately so Render's
  // 30-second response timeout is never triggered on long AI responses.
  if (pathname === '/proxy/anthropic') {
    const body = await readBody(req);
    console.log(`[anthropic] ${body.length} bytes`);

    // Parse body and force streaming mode
    let payload;
    try { payload = JSON.parse(body); } catch(e) { payload = {}; }
    payload.stream = true;
    const streamBody = Buffer.from(JSON.stringify(payload));

    const parsed = new URL('https://api.anthropic.com/v1/messages');
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-api-key':          req.headers['x-api-key'] || '',
        'anthropic-version':  req.headers['anthropic-version'] || '2023-06-01',
        'Content-Length':     streamBody.length,
        'User-Agent':         'SwingEdge/2.0'
      }
    };

    const proxyReq = https.request(options, upstream => {
      // Stream: collect SSE chunks, extract text, reassemble into one JSON response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      });

      let fullText = '';
      let buffer = '';
      let inputTokens = 0, outputTokens = 0;

      upstream.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            // Accumulate text deltas
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              fullText += evt.delta.text || '';
            }
            // Capture usage
            if (evt.type === 'message_delta' && evt.usage) {
              outputTokens = evt.usage.output_tokens || 0;
            }
            if (evt.type === 'message_start' && evt.message?.usage) {
              inputTokens = evt.message.usage.input_tokens || 0;
            }
          } catch(e) {}
        }
      });

      upstream.on('end', () => {
        // Send back a standard non-streaming Anthropic response shape
        const response = {
          content: [{ type: 'text', text: fullText }],
          usage: { input_tokens: inputTokens, output_tokens: outputTokens }
        };
        console.log(`[anthropic] done — ${fullText.length} chars`);
        res.end(JSON.stringify(response));
      });

      upstream.on('error', err => {
        console.error('[anthropic stream error]', err.message);
        res.end(JSON.stringify({ error: { message: err.message } }));
      });
    });

    proxyReq.on('error', err => {
      console.error('[anthropic proxy error]', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
    });

    proxyReq.write(streamBody);
    proxyReq.end();
    return;
  }

  // ── /health — browser uses this to detect proxy mode ──────────────────────
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, version: '2.0', cloud: IS_CLOUD, platform: process.env.RENDER ? 'render' : IS_CLOUD ? 'cloud' : 'local' }));
  }

  // ── Serve HTML ─────────────────────────────────────────────────────────────
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

// Bind 0.0.0.0 so both localhost AND local network IP work
server.listen(PORT, '0.0.0.0', printStartup);
