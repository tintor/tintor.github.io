# Прегорело

A co-op cooking game set in Serbian restaurants, inspired by Overcooked 2. Three levels (a kafana, a bakery at dawn and a wedding on a salaš) and online multiplayer for up to 4 players through invite links.

The whole game is a single file, `index.html`, with no build step.

## Files

| File | Where it goes | Needed? |
|---|---|---|
| `index.html` | GitHub Pages (this repo) | **Yes**, this is the game |
| `turn-worker.js` | Cloudflare Workers | Optional, only for the TURN relay (see below) |
| `README.md` | This repo | No, documentation only |

`turn-worker.js` does **not** run on GitHub Pages. It's a small server that hands out temporary TURN credentials. Keeping a copy in this repo is harmless, because it contains no secrets; the keys live only in Cloudflare's settings.

---

## 1. Deploy the game to GitHub Pages

1. Create a new repository, e.g. `pregorelo`. It can be public, or private if your plan supports Pages for private repos.
2. Upload `index.html` to the **root** of the repository (**Add file → Upload files**), then commit.
3. Open **Settings → Pages**. Under **Build and deployment** choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main`, folder `/ (root)`

   Then click **Save**.
4. After a minute or two the game is live at:

   ```
   https://<your-username>.github.io/pregorelo/
   ```

### Updating

Replace `index.html` in the repo and commit; Pages redeploys automatically. Browsers may cache the old version for a few minutes, so use a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) if you don't see your changes.

### Settings inside `index.html`

Search the file for these lines:

```js
const UNLOCK_ALL=true;   // all levels open (for playtesting); set to false to unlock levels in order
const TURN_URL='';       // empty = no TURN relay; see section 2
```

---

## 2. Optional: TURN relay with a Cloudflare Worker

**Do you need it?** Multiplayer connects players directly to each other (WebRTC, peer to peer), using public Nostr relays only to exchange the initial handshake. That works on most home networks. Some networks, such as certain mobile carriers, corporate Wi-Fi and strict NATs, block direct connections. A TURN server relays the game traffic for those players. If everyone connects fine, you can skip this section.

The waiting room shows how each player is connected:

- **директна веза**: direct connection (no TURN needed)
- **преко TURN сервера**: relayed through your TURN server

### Step 1: Create a TURN key

In the Cloudflare dashboard, go to **Realtime → TURN Server → Create**. Copy the **Turn Token ID** and the **API Token**. Menu names may differ slightly as Cloudflare updates its dashboard.

### Step 2: Create the Worker

1. Go to **Workers & Pages → Create → Create Worker**. Name it, e.g. `pregorelo-turn`, and click **Deploy**.
2. Click **Edit code**, replace everything with the contents of `turn-worker.js`, and click **Deploy** again.

### Step 3: Add the Worker's settings

In the Worker's **Settings → Variables and Secrets**, add:

| Name | Type | Value |
|---|---|---|
| `TURN_KEY_ID` | Secret | the Turn Token ID |
| `TURN_KEY_API_TOKEN` | Secret | the API Token |
| `ALLOWED_ORIGIN` | Text | `https://<your-username>.github.io` |

For `ALLOWED_ORIGIN`, use the origin only: no repo name and no trailing slash. Separate several origins with commas.

### Step 4: Point the game at the Worker

Copy the Worker's address, e.g. `https://pregorelo-turn.<your-subdomain>.workers.dev/`, and set it in `index.html`:

```js
const TURN_URL='https://pregorelo-turn.<your-subdomain>.workers.dev/';
```

Commit the updated `index.html`.

### Checking it

- Opening the Worker's address directly in a browser tab shows `Forbidden: set ALLOWED_ORIGIN to your site`. **That's expected**, because a direct visit doesn't come from your game's site.
- In the game, players on difficult networks should show **преко TURN сервера** in the waiting room.

### Cost

Cloudflare bills TURN by relayed traffic, with a free monthly allowance; check their current pricing. The game sends very little data, and TURN is used only by players who can't connect directly.

### Alternative: Metered

Instead of the Worker, `TURN_URL` also accepts a Metered credentials URL:

```js
const TURN_URL='https://<your-app>.metered.live/api/v1/turn/credentials?apiKey=<your-key>';
```

That key is visible to anyone who opens the page, so restrict it in your Metered dashboard if possible. The Cloudflare Worker keeps its key hidden.

---

## Playing

- **Solo:** open the page and pick a level.
- **Multiplayer:** the host creates a game and shares the invite link, which looks like `…/pregorelo/#igra=abc123`. Friends open the link, or paste it into the join field. Up to 4 players. The host's browser runs the game, so if the host leaves, the game ends for everyone.

## Credits

Bundles [Trystero](https://github.com/dmotz/trystero) 0.25.4 (MIT) for WebRTC peer connections, which in turn includes code from [paulmillr](https://github.com/paulmillr)'s libraries (MIT License (c) 2019 Paul Miller). Fonts are loaded from Google Fonts, with system fonts as a fallback.
