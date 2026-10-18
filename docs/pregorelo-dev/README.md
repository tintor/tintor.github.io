# Прегорело

A co-op cooking game set in Serbian restaurants, inspired by Overcooked 2. Three levels (a kafana, a bakery at dawn and a wedding on a salaš) and multiplayer for up to 4 players: online through invite links, or couch co-op on one computer.

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
const UNLOCK_ALL=false;  // true = all levels open (for playtesting); false = levels unlock in order
const TURN_URL='';       // empty = no TURN relay; see section 2
const TIP={kofi:'', usd:3, ipsAccount:'', ipsName:'', rsd:300}; // empty = no tip jar; see section 3
```

For testing, add `?debugging` to the address (e.g. `.../pregorelo-dev/?debugging`): every level and every chef is open for as long as the flag is in the URL. Nothing is written to the saved progress, so dropping the flag brings back your real stars and unlocks.

---

## 2. Optional: TURN relay with a Cloudflare Worker

**Do you need it?** Multiplayer connects players directly to each other (WebRTC, peer to peer), using public Nostr relays only to exchange the initial handshake. That works on most home networks. Some networks, such as certain mobile carriers, corporate Wi-Fi and strict NATs, block direct connections. A TURN server relays the game traffic for those players. If everyone connects fine, you can skip this section.

The waiting room shows how each player is connected:

- **директна веза**: direct connection (no TURN needed)
- **преко TURN сервера**: relayed through your TURN server

### Network panel

In multiplayer, a panel in the bottom-right corner shows each step of connecting. **⧉** copies its text, so a friend who can't join can send it to you. During a level it shrinks to one line with the round-trip time to each player.

| Line | Meaning |
|---|---|
| `Nostr: 6/6 релеја` | Signalling relays connected (they only introduce players to each other). The relay list is `NOSTR_RELAYS` in `index.html`. `0/6` means no internet, or something blocks WebSockets. |
| `Домаћин: тражим… / пронађен` | Guest only: whether the host has answered yet. |
| `<name>: директно srflx/srflx udp · 182 ms` | Connected: route, local/remote ICE candidate types, protocol and round-trip time. |
| `ICE: 1 checking · неуспело: 1` | Connections whose offer and answer were exchanged, by ICE state, and how many failed. **A failure here means the two networks can't connect directly: set up TURN (above).** |
| `NAT: обичан / симетричан` | This player's NAT, from a test connection to two STUN servers. Symmetric NAT (common on mobile data and carrier-grade NAT) rarely connects directly without TURN. `STUN не одговара` means UDP is blocked. |
| `TURN: …` | Not configured, loading, works (the test connection got a relay address), or the error. |

When a guest gives up after 25 seconds, the message says which step failed: no relays, host never answered, or host found but no direct connection.

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

## 3. Optional: tip jar

A one-time tip unlocks every level and every chef. The main menu shows **♥ Подржи игру**, which opens a screen with the ways to pay. The player then presses **Уплаћено, откључај све** to unlock everything. The game doesn't check the payment, and the screen says so.

With both `kofi` and `ipsAccount` empty, the menu shows no tip button.

### Ko-fi (cards and PayPal)

1. Create a page on [ko-fi.com](https://ko-fi.com) and connect Stripe or PayPal to receive the money.
2. In Ko-fi, set the price of one coffee to $3, or to whatever `usd` is set to; the game shows that number.
3. Set `kofi` to the page address, e.g. `'https://ko-fi.com/yourname'`.

Players don't see your bank details: Ko-fi pays into your Stripe or PayPal account.

### NBS IPS QR (bank apps in Serbia)

```js
const TIP={kofi:'https://ko-fi.com/yourname', usd:3, ipsAccount:'160-0000000123456-78', ipsName:'Ime Prezime', rsd:300};
```

- `ipsAccount`: a dinar account, written as the bank prints it (`160-0000000123456-78` or `160-123456-78`) or as 18 digits. The game checks the control digits. If they're wrong, the browser console says so and there is no QR code.
- `ipsName`: the account holder, in Latin script. NBS rejects Cyrillic in this field.
- `rsd`: the amount in dinars.

The game draws the QR code itself. It holds the account, the name, the amount, payment code 289 and the purpose *Podrška igri Pregorelo*. Players see the account number and the name, so use an account opened only for tips if you'd rather not publish your main one.

To check the code, take a screenshot of it and send it to NBS's free validator:

```sh
curl -F file=@qr.png https://nbs.rs/QRcode/api/qr/v1/upload
```

`"code":0` means a bank app will read it.

---

## Playing

- **Solo:** open the page and pick a level.
- **Controls:** keyboard, touch, or a gamepad (any standard controller: Xbox, PlayStation, Switch Pro and others; the browser only reports it after its first button press, and the main menu then says it is connected). On a gamepad, the left stick or d-pad moves, **A** (✕) grabs, **X** (□) works (chop, wash, stir, flip), **B** (○) or **RB** dashes, **Y** (△) shows or hides the on-screen recipes on levels that have them (**H** on the keyboard), and **Start** opens the game menu. Every menu works with a gamepad alone: the d-pad or left stick moves to the nearest button in that direction, **A** presses it, **B** goes back (resume, close, cancel; **Esc** does the same on the keyboard), and the right stick scrolls long screens. Text fields are skipped, since a gamepad cannot type. The main menu lists all of this, with a small diagram showing where each face button sits, because Nintendo controllers put the letters in different places. Phones and tablets show a note that the game plays best with a keyboard or controller.
- **Online multiplayer** (the **Онлајн са друштвом** tab): the host creates a game and gets a six-digit code and an invite link, e.g. `tintor.net/pregorelo-dev/123456`. Friends open the link, or type the code (or paste the link) into the join field. Up to 4 players. The host's browser runs the game, so if the host leaves, the game ends for everyone.

  The short link works because `404.html` at the site root (`docs/404.html` in this repo) turns `/pregorelo/123456` and `/pregorelo-dev/123456` into `…/#igra=123456`; GitHub Pages has no other way to rewrite paths. If you deploy the game somewhere without that page, links of the form `…/pregorelo-dev/#igra=123456` still work.
- **Couch co-op** (the **Заједно** tab): up to 4 players on one computer, each with their own device. Two can share the keyboard: the left player moves with **WASD**, grabs with **Space**, works with **E** and dashes with **left Shift**; the right player moves with the **arrow keys**, grabs with **.** (or **Enter**), works with **,** and dashes with **right Shift**. A player alone on the keyboard can use all of it. Everyone else plays on a gamepad. To join, press grab on your device (**A**, **Space** or **.**); then left and right pick your cook, and **B** on a gamepad in the main menu (or **×** on your card) leaves. Any **Start** or **Esc** pauses, and unplugging a player's gamepad pauses the level.
- **Language:** Serbian by default. The **🌐** button at the top of the main menu switches to English, Spanish, Mandarin Chinese, Hindi, Portuguese, Japanese or French, and the browser remembers the choice. Serbian dish names stay in parentheses after the translated name, e.g. *Cabbage rolls (Sarma)*. In multiplayer, each player sees the game in their own language.
- **Translations:** the Serbian text in the code is the source. `tr()` looks it up in `EN` for English and in `XL.<language>` for the others; message templates with numbers or names live in `XT.<language>`, matched by `XT_RE`. A string missing from `XL` is shown in English, so a new string only needs its `EN` entry to work everywhere.

## Credits

Bundles [Trystero](https://github.com/dmotz/trystero) 0.25.4 (MIT) for WebRTC peer connections, which in turn includes code from [paulmillr](https://github.com/paulmillr)'s libraries (MIT License (c) 2019 Paul Miller), and [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT License (c) 2009 Kazuhiko Arase) for the tip jar's QR code. Fonts are loaded from Google Fonts, with system fonts as a fallback.
