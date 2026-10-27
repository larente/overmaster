/* Overmaster — the shop: which villains and packs a player has unlocked, and buying more.
   The store only switches on when config.js says store: true and accounts are set up.
   Without it (the Claude preview, a site without Supabase) everything is unlocked.
   Prices here are for showing only; the checkout function on the server sets what Stripe charges. */
const Shop = (() => {
  'use strict';
  const CFG = window.BTS_CONFIG || {};
  const CURRENCY = 'CAD';
  // keep in step with CATALOG in supabase/functions/checkout/index.ts
  const CATALOG = {
    'villain-demon': { name: 'Demon Prince', villain: 'demon', price: 299, grants: ['villain-demon'] },
    'villain-archmage': { name: 'Archmage', villain: 'archmage', price: 299, grants: ['villain-archmage'] },
    'villain-vampire': { name: 'Vampire Lord', villain: 'vampire', price: 299, grants: ['villain-vampire'] },
    'villain-deathknight': { name: 'Death Knight', villain: 'deathknight', price: 299, grants: ['villain-deathknight'] },
    'bundle-dark-court': { name: 'The Dark Court', bundle: true, price: 799, grants: ['villain-demon', 'villain-archmage', 'villain-vampire', 'villain-deathknight'],
      blurb: 'All four paid villains: the Demon Prince, the Archmage, the Vampire Lord and the Death Knight.' }
  };
  const FREE = new Set(['villain-lich', 'villain-dragon']);
  const villainSku = type => 'villain-' + type;
  const KEY = 'om-owned:';                 // + user id: the last unlocks we saw, so they work offline
  const PENDING = 'om-buy';                // a purchase waiting for the player to sign in
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage off */ } }
  };
  const ss = {
    get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* storage off */ } }
  };
  let owned = new Set(), ownedFor = null;
  const cbs = [];
  const emit = () => { for (const cb of cbs) { try { cb(); } catch (e) { console.error(e); } } };

  const enabled = () => !!CFG.store && Store.cloudReady();
  // an owned bundle owns everything in it
  function expand(skus) {
    const out = new Set(skus);
    for (const s of skus) for (const g of (CATALOG[s] ? CATALOG[s].grants : [])) out.add(g);
    return out;
  }
  function useCache(uid) {
    if (ownedFor === uid) return;
    ownedFor = uid; owned = new Set();
    if (uid) { try { owned = expand(JSON.parse(ls.get(KEY + uid) || '[]')); } catch (e) { /* damaged cache */ } }
  }
  async function refresh() {
    const u = Store.user();
    useCache(u ? u.id : null);
    if (!enabled() || !u) { emit(); return { ok: true }; }
    const r = await Store.entitlements();
    if (r.error) { emit(); return { error: r.error }; }      // keep what we knew
    owned = expand(r.skus); ls.set(KEY + u.id, JSON.stringify(r.skus));
    emit(); return { ok: true };
  }

  function owns(sku) {
    if (!enabled() || FREE.has(sku)) return true;
    const u = Store.user(); useCache(u ? u.id : null);
    return owned.has(sku);
  }
  const villainOpen = type => owns(villainSku(type));
  const ownsAll = sku => !CATALOG[sku] || CATALOG[sku].grants.every(owns);
  // what this player would pay: a bundle never costs more than the unlocks they're missing
  function price(sku) {
    const item = CATALOG[sku]; if (!item) return 0;
    const missing = item.grants.filter(g => !owns(g));
    if (!missing.length) return 0;
    if (item.grants.length === 1) return item.price;
    return Math.min(item.price, missing.reduce((s, g) => s + (CATALOG[g] ? CATALOG[g].price : 0), 0));
  }
  const money = cents => '$' + (cents / 100).toFixed(2);
  const label = sku => money(price(sku)) + ' ' + CURRENCY;

  // to Stripe's checkout page; a guest is asked to sign in first and the purchase waits
  async function buy(sku) {
    if (!CATALOG[sku]) return { error: 'That isn\'t something the shop sells.' };
    if (!enabled()) return { error: 'The shop isn\'t open on this copy of the game.' };
    if (!Store.user()) { ss.set(PENDING, sku); return { needSignIn: true }; }
    ss.set(PENDING, null);
    const r = await Store.invoke('checkout', { sku, returnTo: location.origin + location.pathname });
    if (r.error && r.missing) return { error: 'The shop isn\'t taking payments yet. If you have a beta code, redeem it from your account.' };
    if (r.error) return { error: r.error, owned: !!(r.data && r.data.owned) };
    if (!r.data || !r.data.url) return { error: 'The shop didn\'t answer. Try again in a minute.' };
    location.assign(r.data.url);
    return { ok: true, leaving: true };
  }
  function pending() { const s = ss.get(PENDING); return s && CATALOG[s] ? s : null; }
  function clearPending() { ss.set(PENDING, null); }

  // back from Stripe: ?purchase=done|cancel&sku=...; tidy the address bar and say what happened
  function takeReturn() {
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    const kind = q.get('purchase'); if (kind !== 'done' && kind !== 'cancel') return null;
    const sku = q.get('sku');
    q.delete('purchase'); q.delete('sku');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { /* fine */ }
    return { kind, sku: CATALOG[sku] ? sku : null };
  }
  // the webhook can take a few seconds after Stripe sends the player back
  async function waitFor(sku, ms) {
    const until = Date.now() + (ms || 30000);
    while (Date.now() < until) {
      await refresh();
      if (sku && ownsAll(sku)) return true;
      await new Promise(r => setTimeout(r, 2000));
    }
    return sku ? ownsAll(sku) : false;
  }

  return {
    CATALOG, CURRENCY, FREE, enabled, refresh, owns, ownsAll, villainOpen, villainSku, price, money, label, buy, pending, clearPending, takeReturn, waitFor,
    onChange: cb => cbs.push(cb),
    paidVillains: () => Object.keys(CATALOG).filter(k => CATALOG[k].villain)
  };
})();
