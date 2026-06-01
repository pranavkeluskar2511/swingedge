# SwingEdge — Swing Trade Analyzer

A 5-layer swing trade analyzer powered by live **Polygon.io** market data and **Claude AI** (Anthropic).  
Works on desktop and mobile. No paid subscriptions needed beyond your existing API keys.

---

## Files

| File | Purpose |
|------|---------|
| `swing-trade-analyzer.html` | The full app UI |
| `server.js` | Node.js proxy server (fixes CORS, serves the HTML) |
| `package.json` | Node.js project config (required for Railway) |

---

## Option A — Deploy to Railway (access from phone, anywhere, no laptop needed)

### Step 1 — Push to GitHub (one-time)

1. Create a free account at [github.com](https://github.com)
2. Click **New repository** → name it `swingedge` → **Create repository**
3. Upload all three files (`swing-trade-analyzer.html`, `server.js`, `package.json`) using the **Add file → Upload files** button
4. Click **Commit changes**

### Step 2 — Deploy on Railway (one-time, ~3 minutes)

1. Create a free account at [railway.app](https://railway.app)
2. From the Railway dashboard, click **New Project**
3. Choose **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub, then select your `swingedge` repo
5. Railway auto-detects `package.json` and runs `npm start` — deployment takes ~1 minute
6. Click **Settings → Networking → Generate Domain**
7. Your app is live at a URL like `https://swingedge-production.up.railway.app`

### Step 3 — Open on your phone

1. Open the Railway URL in your phone browser
2. Enter your Polygon.io and Anthropic API keys — they save automatically to your browser's local storage
3. Done — works on any device, anywhere, no laptop required

### Updating the app

Whenever you download a new version of the HTML file from Claude:
1. Go to your GitHub repo
2. Click `swing-trade-analyzer.html` → **Edit (pencil icon)** → paste the new content → **Commit**
3. Railway auto-redeploys in ~30 seconds

---

## Option B — Run locally (desktop + mobile on same WiFi)

### Prerequisites
- [Node.js](https://nodejs.org) v18 or later (free, one-time install)

### Steps

```bash
# 1. Open Terminal and go to the folder with the files
cd ~/Desktop/swingedge

# 2. Start the server
node server.js
```

You'll see:
```
  ╔══════════════════════════════════════════════════╗
  ║   SwingEdge — Local Server                       ║
  ║   Desktop : http://localhost:3000                ║
  ║   Mobile  : http://192.168.1.5:3000              ║
  ║   (phone must be on same WiFi)                   ║
  ╚══════════════════════════════════════════════════╝
```

- **Desktop**: open `http://localhost:3000`
- **Mobile**: open the **Mobile** URL shown (your phone must be on the same WiFi as your computer)

---

## Option C — Desktop only (no server needed)

Just open `swing-trade-analyzer.html` directly in **Chrome** or **Edge** on your desktop.  
Mobile browsers will not work this way due to CORS restrictions.

---

## API Keys

| Key | Where to get it |
|-----|----------------|
| Polygon.io | [polygon.io/dashboard/api-keys](https://polygon.io/dashboard/api-keys) — free tier works |
| Anthropic | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |

Keys are saved in your **browser's localStorage** — they never leave your device/server.  
On Railway, keys are stored in each browser that accesses the app (not on the server).

---

## Excel Upload Format

Upload any `.xlsx`, `.xls`, or `.csv` file. The app looks for a column named  
**Ticker**, **Symbol**, **Stock**, **Name**, or **Scrip** — or uses the first column automatically.

Example:
```
Ticker
NVDA
AAPL
META
MSFT
TSM
```

---

## Railway Free Tier Limits

- **500 compute hours/month** — enough for ~16 hours/day of usage
- **No credit card required** to start
- App stays running 24/7 (no sleep like Render's free tier)
- If you hit the limit, upgrade to Hobby ($5/month) for unlimited hours
