# SwingEdge — Swing Trade Analyzer

A 5-layer swing trade analyzer powered by live **Polygon.io** market data and **Claude AI**.  
Works on desktop and mobile. Hosted free on Render — no laptop required.

---

## Files

| File | Purpose |
|------|---------|
| `swing-trade-analyzer.html` | The full app UI |
| `server.js` | Node.js proxy server (fixes CORS, serves the HTML) |
| `package.json` | Node.js project config |
| `render.yaml` | Render blueprint — auto-configures deployment settings |

---

## Option A — Deploy to Render (recommended — phone access anywhere, free)

### Step 1 — Create a GitHub repo (one-time, ~2 min)

1. Go to [github.com](https://github.com) and sign up / log in (free)
2. Click the **+** icon → **New repository**
3. Name it `swingedge`, leave everything else as default → **Create repository**
4. On the next screen click **uploading an existing file**
5. Drag and drop all 4 files:
   - `swing-trade-analyzer.html`
   - `server.js`
   - `package.json`
   - `render.yaml`
6. Click **Commit changes**

---

### Step 2 — Deploy on Render (one-time, ~3 min)

1. Go to [render.com](https://render.com) and sign up with GitHub (free, no credit card)
2. Click **New +** → **Web Service**
3. Under **Connect a repository**, select your `swingedge` repo
4. Render reads `render.yaml` automatically and fills in all settings — you don't need to change anything
5. Click **Create Web Service**
6. Wait ~1 minute for the first deploy to finish
7. Your app URL appears at the top — something like:
   ```
   https://swingedge.onrender.com
   ```
8. Open that URL on your phone ✓

---

### Step 3 — Enter API keys on your phone

1. Open your Render URL in your phone browser
2. Paste your **Polygon.io** API key → it saves automatically
3. Paste your **Anthropic** API key → it saves automatically
4. Keys are stored in your phone's browser storage — you only do this once

---

### Step 4 (optional) — Keep the app awake 24/7 for free

Render's free tier sleeps after 15 minutes of inactivity. The first visit after sleep takes ~30–60 seconds to wake up. To prevent this:

1. Go to [uptimerobot.com](https://uptimerobot.com) and sign up free
2. Click **Add New Monitor**
3. Set:
   - Monitor type: **HTTP(s)**
   - Friendly name: `SwingEdge`
   - URL: your Render URL (e.g. `https://swingedge.onrender.com/health`)
   - Monitoring interval: **5 minutes**
4. Click **Create Monitor**

UptimeRobot pings your app every 5 minutes — Render never puts it to sleep. Completely free.

---

### Updating the app in future

When you get a new version of the HTML file from Claude:

1. Go to your GitHub repo at github.com
2. Click `swing-trade-analyzer.html`
3. Click the **pencil (edit) icon** in the top right
4. Select all the text and paste the new file content
5. Click **Commit changes**
6. Render auto-redeploys in ~60 seconds — no action needed on your part

---

## Option B — Run locally (desktop + mobile on same WiFi)

**Requirements:** [Node.js](https://nodejs.org) v18+ (free, one-time install)

```bash
# 1. Open Terminal, go to the folder with the files
cd ~/Desktop/swingedge

# 2. Start the server
node server.js
```

Terminal output:
```
  ╔══════════════════════════════════════════════════╗
  ║   SwingEdge — Local Server                       ║
  ║   Desktop : http://localhost:3000                ║
  ║   Mobile  : http://192.168.1.5:3000              ║
  ║   (phone must be on same WiFi)                   ║
  ╚══════════════════════════════════════════════════╝
```

- **Desktop:** open `http://localhost:3000`
- **Mobile:** open the Mobile URL (phone must be on same WiFi as your computer)

---

## Option C — Desktop only, no server

Open `swing-trade-analyzer.html` directly in **Chrome** or **Edge**.  
Mobile will not work this way — use Option A or B for mobile.

---

## API Keys

| Key | Where to get it |
|-----|----------------|
| Polygon.io | [polygon.io/dashboard/api-keys](https://polygon.io/dashboard/api-keys) — free tier works |
| Anthropic | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |

Keys are saved in your **browser's localStorage** — they never touch the Render server.  
Each device (phone, desktop) stores its own copy.

---

## Excel / CSV Upload Format

Upload any `.xlsx`, `.xls`, or `.csv` file with tickers. The app looks for a column named  
**Ticker**, **Symbol**, **Stock**, **Name**, or **Scrip** — or uses the first column automatically.

```
Ticker
NVDA
AAPL
META
MSFT
TSM
AMD
```

---

## Render Free Tier Limits

| Feature | Free tier |
|---------|-----------|
| Compute hours | 750 hrs/month (enough for 24/7) |
| Credit card required | No |
| Sleep on inactivity | Yes, after 15 min (fix with UptimeRobot) |
| Auto-deploy from GitHub | Yes |
| Custom domain | Yes (free) |
| Upgrade for always-on | $7/month |
