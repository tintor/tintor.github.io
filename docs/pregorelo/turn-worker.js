// Cloudflare Worker for "Прегорело": returns short-lived Cloudflare TURN credentials.
// The long-lived API token stays here (as a secret) and never reaches the browser.
//
// Setup (Cloudflare dashboard):
//   1. Realtime → TURN Server → Create → copy the "Turn Token ID" and "API Token".
//   2. Workers & Pages → Create Worker → paste this file → Deploy.
//   3. Worker → Settings → Variables and Secrets:
//        TURN_KEY_ID         (secret)  = the Turn Token ID
//        TURN_KEY_API_TOKEN  (secret)  = the API Token
//        ALLOWED_ORIGIN      (text)    = your site's origin, e.g. https://yourname.github.io
//                                        (comma-separated for several; no trailing slash)
//   4. In index.html set:  const TURN_URL='https://<worker-name>.<your-subdomain>.workers.dev/';

const TTL_SECONDS = 6 * 60 * 60; // credentials last 6 hours, longer than any game session

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const originOk = allowed.length > 0 && allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : 'null',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });
    if (!originOk) return new Response('Forbidden: set ALLOWED_ORIGIN to your site', { status: 403, headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json({ error: 'worker_not_configured' }, 500, cors);

    const upstream = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      },
    );
    if (!upstream.ok) return json({ error: 'turn_unavailable', status: upstream.status }, 502, cors);

    // Shape: { iceServers: [ {urls:[stun...]}, {urls:[turn...], username, credential} ] }
    return json(await upstream.json(), 200, cors);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
