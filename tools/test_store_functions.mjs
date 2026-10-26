// Tests the shop's two server functions (supabase/functions) under Node, with a Deno stand-in
// and fake Stripe and Supabase servers. Run: node tools/test_store_functions.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import crypto from 'crypto';
const SRC = new URL('../supabase/functions/', import.meta.url).pathname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'om-fn-'));
const ENV = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_abc' }), STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test123', SUPABASE_ANON_KEY: 'anon' };
let handler = null;
globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { handler = h; } };
async function load(name) { const f = path.join(TMP, `${name}.mjs`); fs.writeFileSync(f, fs.readFileSync(SRC + name + '/index.ts', 'utf8')); handler = null; await import('file://' + f + '?' + Math.random()); return handler; }
// fake backends
const db = { entitlements: [{ user_id: 'U1', sku: 'villain-vampire', source: 'stripe', ref: 'cs_old' }], purchases: [] };
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); calls.push([init.method || 'GET', url, init.headers]);
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
  if (url.endsWith('/auth/v1/user')) return init.headers.Authorization === 'Bearer good' ? J({ id: 'U1', email: 'a@b.c' }) : J({ msg: 'bad jwt' }, 401);
  if (url.includes('/rest/v1/entitlements')) {
    if (init.headers.apikey !== 'sb_secret_abc' || init.headers.Authorization) return J({ message: 'bad key header' }, 401);
    if ((init.method || 'GET') === 'GET') { const uid = decodeURIComponent(url.split('user_id=eq.')[1]); return J(db.entitlements.filter(r => r.user_id === uid).map(r => ({ sku: r.sku }))); }
    if (init.method === 'POST') { for (const r of JSON.parse(init.body)) if (!db.entitlements.find(x => x.user_id === r.user_id && x.sku === r.sku)) db.entitlements.push(r); return new Response(null, { status: 201 }); }
    if (init.method === 'DELETE') { const ref = decodeURIComponent(url.split('ref=eq.')[1]); db.entitlements = db.entitlements.filter(r => r.ref !== ref); return new Response(null, { status: 204 }); }
  }
  if (url.includes('/rest/v1/purchases')) {
    if ((init.method || 'GET') === 'GET') { const pi = decodeURIComponent(url.split('payment_intent=eq.')[1]); return J(db.purchases.filter(p => p.payment_intent === pi).map(p => ({ id: p.id }))); }
    if (init.method === 'POST') { db.purchases.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    if (init.method === 'PATCH') { const id = decodeURIComponent(url.split('id=eq.')[1].split('&')[0]); const p = db.purchases.find(x => x.id === id); if (p) Object.assign(p, JSON.parse(init.body)); return new Response(null, { status: 204 }); }
  }
  if (url === 'https://api.stripe.com/v1/checkout/sessions') { const p = new URLSearchParams(init.body); globalThis.lastStripe = p; return J({ id: 'cs_new1', url: 'https://checkout.stripe.com/c/pay/cs_new1' }); }
  return J({ error: 'unexpected ' + url }, 500);
};
const check = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const req = (body, auth, origin) => new Request('https://proj.supabase.co/functions/v1/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}), origin: origin || 'https://overmaster.x.workers.dev', apikey: 'anon' }, body: JSON.stringify(body) });

const co = await load('checkout');
let r = await co(req({ sku: 'villain-demon', returnTo: 'https://overmaster.x.workers.dev/' }));
check(r.status === 401, 'checkout refuses a guest');
r = await co(req({ sku: 'villain-demon', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer nope'));
check(r.status === 401, 'checkout refuses a bad token');
r = await co(req({ sku: 'sword-of-x', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer good'));
check(r.status === 400, 'checkout refuses an unknown product');
r = await co(req({ sku: 'villain-demon', returnTo: 'https://evil.example/' }, 'Bearer good'));
check(r.status === 400, 'checkout refuses a return address on another site');
r = await co(req({ sku: 'villain-vampire', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer good'));
check(r.status === 409, 'checkout refuses something already owned');
r = await co(req({ sku: 'villain-demon', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer good'));
let j = await r.json();
check(r.status === 200 && j.url.startsWith('https://checkout.stripe.com/'), 'checkout returns a Stripe address');
check(lastStripe.get('line_items[0][price_data][unit_amount]') === '299' && lastStripe.get('line_items[0][price_data][currency]') === 'cad', 'single villain is 299 CAD cents');
check(lastStripe.get('metadata[grants]') === 'villain-demon' && lastStripe.get('client_reference_id') === 'U1', 'metadata carries the player and the unlock');
check(lastStripe.get('success_url') === 'https://overmaster.x.workers.dev/?purchase=done&sku=villain-demon', 'success address returns to the game');
check(r.headers.get('access-control-allow-origin') === '*', 'CORS header present');
r = await co(req({ sku: 'bundle-dark-court', returnTo: 'https://overmaster.x.workers.dev/index.html' }, 'Bearer good'));
check(r.status === 200 && lastStripe.get('line_items[0][price_data][unit_amount]') === '799', 'bundle owning one costs 799 (three would be 897)');
db.entitlements.push({ user_id: 'U1', sku: 'villain-archmage', source: 'gift' });
r = await co(req({ sku: 'bundle-dark-court', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer good'));
check(lastStripe.get('line_items[0][price_data][unit_amount]') === '598', 'bundle owning two costs 598');
db.entitlements.push({ user_id: 'U1', sku: 'bundle-dark-court', source: 'gift' });
r = await co(req({ sku: 'villain-deathknight', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer good'));
check(r.status === 409, 'an owned bundle counts as owning its villains');
db.entitlements = db.entitlements.filter(e => e.sku !== 'bundle-dark-court' && e.sku !== 'villain-archmage');
r = await co(new Request('https://x/functions/v1/checkout', { method: 'OPTIONS' }));
check(r.status === 200 && r.headers.get('access-control-allow-headers').includes('apikey'), 'CORS preflight');
r = await co(req({ sku: 'villain-demon', returnTo: 'http://localhost:8123/index.html' }, 'Bearer good', 'http://localhost:8123'));
check(r.status === 200, 'local testing address allowed when it matches the page');
ENV.SITE_URLS = 'https://overmaster.example.com';
r = await co(req({ sku: 'villain-demon', returnTo: 'https://overmaster.x.workers.dev/' }, 'Bearer good'));
check(r.status === 400, 'SITE_URLS restricts return addresses');
delete ENV.SITE_URLS;
check(db.purchases.some(p => p.id === 'cs_new1' && p.status === 'open' && p.amount === 299), 'checkout logs an open purchase');

// webhook
const wh = await load('stripe-webhook');
const sign = (body, t = Math.floor(Date.now() / 1000), secret = 'whsec_test123') => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const wreq = (obj, sig) => { const body = JSON.stringify(obj); return new Request('https://x/functions/v1/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': sig === undefined ? sign(body) : sig(body) }, body }); };
db.purchases = [{ id: 'cs_b1', user_id: 'U1', sku: 'bundle-dark-court', status: 'open' }];
const done = { type: 'checkout.session.completed', data: { object: { id: 'cs_b1', payment_status: 'paid', client_reference_id: 'U1', amount_total: 799, currency: 'cad', payment_intent: 'pi_1', metadata: { user_id: 'U1', sku: 'bundle-dark-court', grants: 'villain-demon,villain-archmage,villain-vampire,villain-deathknight' } } } };
r = await wh(wreq(done, b => sign(b, undefined, 'whsec_wrong')));
check(r.status === 400 && db.entitlements.length === 1, 'webhook rejects a wrong signature');
r = await wh(wreq(done, b => sign(b, Math.floor(Date.now() / 1000) - 1000)));
check(r.status === 400, 'webhook rejects an old (replayed) signature');
r = await wh(wreq(done));
const own = db.entitlements.filter(e => e.user_id === 'U1').map(e => e.sku + ':' + e.ref).sort().join(' ');
check(r.status === 200 && own === 'villain-archmage:cs_b1 villain-deathknight:cs_b1 villain-demon:cs_b1 villain-vampire:cs_old', 'paid bundle grants four, keeps the older vampire row: ' + own);
check(db.purchases[0].status === 'paid' && db.purchases[0].payment_intent === 'pi_1', 'purchase marked paid');
r = await wh(wreq(done));
check(r.status === 200 && db.entitlements.length === 4, 'a repeated event changes nothing');
r = await wh(wreq({ type: 'checkout.session.completed', data: { object: { id: 'cs_u', payment_status: 'unpaid', metadata: { user_id: 'U2', grants: 'villain-demon' } } } }));
check(!db.entitlements.some(e => e.user_id === 'U2'), 'unpaid session grants nothing');
r = await wh(wreq({ type: 'charge.refunded', data: { object: { refunded: false, payment_intent: 'pi_1' } } }));
check(db.entitlements.length === 4, 'partial refund keeps unlocks');
r = await wh(wreq({ type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_1' } } }));
check(db.entitlements.map(e => e.sku).join() === 'villain-vampire' && db.purchases[0].status === 'refunded', 'full refund removes the bundle unlocks but not the older purchase');
r = await wh(wreq({ type: 'customer.created', data: { object: {} } }));
check(r.status === 200, 'other events are acknowledged');

// the game's price list must match the server's
const shop = fs.readFileSync(new URL('../shop.js', import.meta.url), 'utf8');
const server = fs.readFileSync(SRC + 'checkout/index.ts', 'utf8');
const prices = t => [...t.matchAll(/'([a-z-]+)':\s*\{[^}]*?price:\s*(\d+)[^}]*?grants:\s*\[([^\]]*)\]/g)].map(m => m[1] + '=' + m[2] + ':' + m[3].replace(/\s|'/g, '')).sort().join(' ');
check(prices(shop) === prices(server) && prices(shop).split(' ').length === 5, 'shop.js and the checkout function list the same products, prices and grants');

