// Overmaster: opens a Stripe Checkout page for one unlock or bundle.
// The game calls this when a signed-in player clicks Unlock. Prices live here, on the server,
// never in the game, and the player's owned unlocks are checked so a bundle is priced fairly.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY   sk_test_... while testing, sk_live_... to take real money
//   SITE_URLS           optional: comma-separated addresses the game runs at, e.g. https://overmaster.example.workers.dev
//   STRIPE_TAX          optional: "on" to have Stripe Tax calculate and add sales tax
// Turn OFF "Verify JWT" for this function: it checks the player's sign-in itself (below).

const CURRENCY = 'cad';
// Keep in step with CATALOG in shop.js (the game shows these names and prices).
const CATALOG = {
  'villain-demon': { name: 'Demon Prince', blurb: 'Play as the Demon Prince, Prince of the Ninth Pit.', price: 299, grants: ['villain-demon'] },
  'villain-archmage': { name: 'Archmage', blurb: 'Play as the Archmage, the Unbound.', price: 299, grants: ['villain-archmage'] },
  'villain-vampire': { name: 'Vampire Lord', blurb: 'Play as the Vampire Lord, the Crimson Count.', price: 299, grants: ['villain-vampire'] },
  'villain-deathknight': { name: 'Death Knight', blurb: 'Play as the Death Knight, the Oathbreaker.', price: 299, grants: ['villain-deathknight'] },
  'bundle-dark-court': { name: 'The Dark Court', blurb: 'All four: the Demon Prince, the Archmage, the Vampire Lord and the Death Knight.', price: 799, grants: ['villain-demon', 'villain-archmage', 'villain-vampire', 'villain-deathknight'] }
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = k => (Deno.env.get(k) || '').trim();

// the server's own key, which can write unlocks; new projects keep it in SUPABASE_SECRET_KEYS
function adminKey() {
  try { const ks = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}'); if (ks && ks.default) return ks.default; } catch (e) { /* not set */ }
  return env('SUPABASE_SERVICE_ROLE_KEY');
}
function adminHeaders() {
  const k = adminKey(); const h = { apikey: k, 'Content-Type': 'application/json' };
  if (!k.startsWith('sb_secret_')) h.Authorization = 'Bearer ' + k;
  return h;
}
function publicKey(req) {
  if (req.headers.get('apikey')) return req.headers.get('apikey');
  try { const ks = JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS') || '{}'); if (ks && ks.default) return ks.default; } catch (e) { /* not set */ }
  return env('SUPABASE_ANON_KEY');
}

// Stripe takes form-encoded parameters, with nested objects written as a[b][c]
function form(obj, prefix, out) {
  out = out || new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out); else out.append(key, String(v));
  }
  return out;
}

// what a bundle costs this player: never more than the unlocks they don't own yet
function priceFor(sku, owned) {
  const item = CATALOG[sku]; if (!item) return null;
  const missing = item.grants.filter(g => !owned.has(g));
  if (!missing.length) return 0;
  if (item.grants.length === 1) return item.price;
  const separately = missing.reduce((sum, g) => sum + (CATALOG[g] ? CATALOG[g].price : 0), 0);
  return Math.min(item.price, separately);
}

// only send players back to addresses the game really runs at
function returnBase(req, asked) {
  const allowed = env('SITE_URLS').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  let u; try { u = new URL(asked); } catch (e) { return null; }
  const origin = u.origin;
  if (allowed.length) return allowed.some(a => origin === new URL(a).origin) ? u.origin + u.pathname : null;
  const reqOrigin = req.headers.get('origin');
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return (origin === reqOrigin && (u.protocol === 'https:' || local)) ? u.origin + u.pathname : null;
}

async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const stripeKey = env('STRIPE_SECRET_KEY');
  if (!stripeKey) return reply(500, { error: 'The shop isn\'t set up yet (no Stripe key).' });

  // who is asking: Supabase checks the sign-in token for us
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return reply(401, { error: 'Sign in first.' });
  const base = env('SUPABASE_URL');
  const ur = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey: publicKey(req) } });
  if (!ur.ok) return reply(401, { error: 'Your sign-in has expired. Sign in again.' });
  const user = await ur.json();
  if (!user || !user.id) return reply(401, { error: 'Sign in first.' });

  let body = {}; try { body = await req.json(); } catch (e) { /* empty */ }
  const sku = String(body.sku || '');
  const item = CATALOG[sku];
  if (!item) return reply(400, { error: 'That isn\'t something the shop sells.' });
  const back = returnBase(req, String(body.returnTo || ''));
  if (!back) return reply(400, { error: 'This copy of the game isn\'t allowed to open the shop.' });

  // what they already own
  const er = await fetch(`${base}/rest/v1/entitlements?select=sku&user_id=eq.${encodeURIComponent(user.id)}`, { headers: adminHeaders() });
  if (!er.ok) return reply(500, { error: 'The shop couldn\'t read your unlocks. Try again in a minute.' });
  const owned = new Set((await er.json()).map(r => r.sku));
  for (const s of [...owned]) for (const g of (CATALOG[s] ? CATALOG[s].grants : [])) owned.add(g);   // an owned bundle owns what's in it
  const amount = priceFor(sku, owned);
  if (!amount) return reply(409, { error: 'You already own everything in that.', owned: true });

  const params = {
    mode: 'payment',
    success_url: `${back}?purchase=done&sku=${encodeURIComponent(sku)}`,
    cancel_url: `${back}?purchase=cancel&sku=${encodeURIComponent(sku)}`,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
    allow_promotion_codes: 'true',
    line_items: { 0: { quantity: 1, price_data: { currency: CURRENCY, unit_amount: amount, product_data: { name: `Overmaster: ${item.name}`, description: item.blurb } } } },
    metadata: { user_id: user.id, sku, grants: item.grants.join(',') },
    payment_intent_data: { metadata: { user_id: user.id, sku } }
  };
  if (env('STRIPE_TAX') === 'on') { params.automatic_tax = { enabled: 'true' }; params.billing_address_collection = 'required'; }
  const sr = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(params)
  });
  const session = await sr.json();
  if (!sr.ok) { console.error('stripe', session && session.error); return reply(502, { error: 'Stripe couldn\'t open the checkout. Try again in a minute.' }); }

  // a log of the attempt; the webhook marks it paid
  await fetch(`${base}/rest/v1/purchases`, {
    method: 'POST', headers: { ...adminHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ id: session.id, user_id: user.id, sku, amount, currency: CURRENCY, status: 'open' })
  }).catch(e => console.error('purchase log', e));

  return reply(200, { url: session.url });
}

Deno.serve(handle);
