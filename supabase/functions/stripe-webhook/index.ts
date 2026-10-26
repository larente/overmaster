// Overmaster: Stripe tells this function when a payment goes through (or is refunded),
// and it writes the player's unlocks. It only trusts messages signed with your webhook secret.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   STRIPE_WEBHOOK_SECRET  whsec_... from Stripe -> Developers -> Webhooks -> your endpoint -> Signing secret
// Turn OFF "Verify JWT" for this function: Stripe can't sign in; the signature check below replaces it.
// Stripe events to send: checkout.session.completed, checkout.session.async_payment_succeeded,
//                        checkout.session.expired, charge.refunded

const env = k => (Deno.env.get(k) || '').trim();
const ok = (msg) => new Response(JSON.stringify({ received: true, note: msg || '' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fail = (status, msg) => new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });

function adminKey() {
  try { const ks = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}'); if (ks && ks.default) return ks.default; } catch (e) { /* not set */ }
  return env('SUPABASE_SERVICE_ROLE_KEY');
}
function adminHeaders(extra) {
  const k = adminKey(); const h = { apikey: k, 'Content-Type': 'application/json', ...(extra || {}) };
  if (!k.startsWith('sb_secret_')) h.Authorization = 'Bearer ' + k;
  return h;
}
const rest = (path, init) => fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, init);

// Stripe-Signature: t=timestamp,v1=hex(hmac_sha256(secret, `${t}.${body}`))
async function verify(payload, header, secret, now) {
  if (!header || !secret) return false;
  const parts = header.split(',').map(p => p.split('='));
  const t = (parts.find(p => p[0] === 't') || [])[1];
  const sigs = parts.filter(p => p[0] === 'v1').map(p => p[1]);
  if (!t || !sigs.length) return false;
  if (Math.abs((now || Date.now() / 1000) - Number(t)) > 300) return false;   // older than 5 minutes: a replay
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`)));
  const hex = Array.from(mac, b => b.toString(16).padStart(2, '0')).join('');
  return sigs.some(s => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

async function grant(session) {
  const md = session.metadata || {};
  const userId = md.user_id || session.client_reference_id;
  const grants = String(md.grants || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!userId || !grants.length) { console.error('session without a player or unlocks', session.id); return; }
  const rows = grants.map(sku => ({ user_id: userId, sku, source: 'stripe', ref: session.id }));
  // a player who already owns one of these keeps their original row (and its refund link)
  const r = await rest('entitlements?on_conflict=user_id,sku', { method: 'POST', headers: adminHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }), body: JSON.stringify(rows) });
  if (!r.ok) throw new Error('could not write unlocks: ' + r.status + ' ' + await r.text());
  await rest(`purchases?id=eq.${encodeURIComponent(session.id)}`, {
    method: 'PATCH', headers: adminHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ status: 'paid', amount: session.amount_total, currency: session.currency, payment_intent: session.payment_intent || null, updated_at: new Date().toISOString() })
  });
}

async function refund(charge) {
  if (!charge.refunded || !charge.payment_intent) return;   // only a full refund takes unlocks back
  const r = await rest(`purchases?select=id&payment_intent=eq.${encodeURIComponent(charge.payment_intent)}`, { headers: adminHeaders() });
  const rows = r.ok ? await r.json() : [];
  for (const p of rows) {
    await rest(`entitlements?ref=eq.${encodeURIComponent(p.id)}`, { method: 'DELETE', headers: adminHeaders({ Prefer: 'return=minimal' }) });
    await rest(`purchases?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', headers: adminHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify({ status: 'refunded', updated_at: new Date().toISOString() }) });
  }
}

async function handle(req) {
  if (req.method !== 'POST') return fail(405, 'Use POST.');
  const payload = await req.text();
  if (!await verify(payload, req.headers.get('stripe-signature'), env('STRIPE_WEBHOOK_SECRET'))) return fail(400, 'Bad signature.');
  let event; try { event = JSON.parse(payload); } catch (e) { return fail(400, 'Bad JSON.'); }
  const obj = event.data && event.data.object;
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (obj.payment_status === 'paid') await grant(obj);
        return ok(obj.payment_status);
      case 'checkout.session.expired':
        await rest(`purchases?id=eq.${encodeURIComponent(obj.id)}&status=eq.open`, { method: 'PATCH', headers: adminHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify({ status: 'expired', updated_at: new Date().toISOString() }) });
        return ok('expired');
      case 'charge.refunded':
        await refund(obj);
        return ok('refund');
      default:
        return ok('ignored');
    }
  } catch (e) {
    console.error(event.type, e);
    return fail(500, 'Could not record it; Stripe will retry.');   // Stripe retries failed deliveries for days
  }
}

Deno.serve(handle);
