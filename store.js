/* Overmaster — accounts and saved games.
   Saves in this browser always work. With a Supabase project configured in config.js,
   players can also sign in and keep their saves in the cloud, and feedback reaches you. */
const Store = (() => {
  'use strict';
  const VERSION = '0.30.0-alpha';
  const CFG = window.BTS_CONFIG || {};
  const G = Game;
  const LOCAL = 'bts5-save:';           // + slot
  const SETTINGS = 'bts5-settings';
  const LEGACY = 'bts-adventure-v4';    // the single save from the v4 build
  const SLOTS = ['s1', 's2', 's3', 's4', 's5', 's6'];   // manual slots; autosaves are 'a<campaign id>', newest three kept
  const AUTOS_KEPT = 3;
  const autoSlot = s => 'a' + (s.created || s.seed);
  const isAuto = slot => slot.charAt(0) === 'a';
  const cloudReady = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient);
  let sb = null, user = null, recovery = false;
  const authCbs = [];
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return null; } catch (e) { return e; } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------- what a save looks like in a list ---------- */
  function meta(s) {
    return {
      name: s.name || 'Untitled campaign', villain: G.vFull(s), vtype: (s.villain && s.villain.type) || 'lich',
      party: s.heroes.map(h => h.name), heroes: s.heroes.map(h => ({ id: h.id, rid: h.rid, race: h.race, cls: h.cls, look: h.look })),
      level: G.avgLevel(s), week: s.week, day: s.day, phase: s.phase, result: s.result || null
    };
  }
  const slotLabel = slot => isAuto(slot) ? 'Autosave' : slot === 'legacy' ? 'From the previous version' : 'Slot ' + slot.slice(1);

  /* ---------- settings (this browser) ---------- */
  function settings() { try { return Object.assign({ fast: false, dice: true, log: false, sprites: true }, JSON.parse(ls.get(SETTINGS) || '{}')); } catch (e) { return { fast: false, dice: true, log: false, sprites: true }; } }
  function setSettings(patch) { const s = Object.assign(settings(), patch); ls.set(SETTINGS, JSON.stringify(s)); return s; }

  /* ---------- this browser ---------- */
  function localList() {
    const out = [];
    let keys = []; try { keys = Object.keys(localStorage).filter(k => k.indexOf(LOCAL) === 0); } catch (e) { /* storage unavailable */ }
    for (const key of keys) {
      const slot = key.slice(LOCAL.length); const raw = ls.get(key); if (!raw) continue;
      try { const r = JSON.parse(raw); out.push({ where: 'local', slot, label: slotLabel(slot), name: r.meta.name, meta: r.meta, updated: r.updated }); } catch (e) { /* skip a damaged entry */ }
    }
    out.sort((a, b) => (isAuto(b.slot) - isAuto(a.slot)) || (b.updated || 0) - (a.updated || 0));
    const old = ls.get(LEGACY);
    if (old) { try { const s = G.migrate(JSON.parse(old)); if (s) out.push({ where: 'local', slot: 'legacy', label: 'From the previous version', name: s.name, meta: meta(s), updated: null }); } catch (e) { /* ignore */ } }
    return out;
  }
  function localSave(slot, s) {
    const body = JSON.stringify({ meta: meta(s), state: s, updated: Date.now(), version: VERSION });
    const err = ls.set(LOCAL + slot, body);
    if (!err && isAuto(slot)) { const autos = localList().filter(x => isAuto(x.slot)); for (const x of autos.slice(AUTOS_KEPT)) ls.del(LOCAL + x.slot); }
    if (err) return 'This browser\'s storage is full or switched off. Delete an old save, export this one to a file, or sign in to save in the cloud.';
    return null;
  }
  function localLoad(slot) {
    if (slot === 'legacy') { try { return G.migrate(JSON.parse(ls.get(LEGACY))); } catch (e) { return null; } }
    try { const r = JSON.parse(ls.get(LOCAL + slot)); return G.migrate(r.state); } catch (e) { return null; }
  }

  /* ---------- accounts ---------- */
  const shapeUser = u => u ? { id: u.id, email: u.email || '', name: (u.user_metadata && (u.user_metadata.display_name || u.user_metadata.full_name || u.user_metadata.name)) || (u.email ? u.email.split('@')[0] : 'Player') } : null;
  function emit(ev) { for (const cb of authCbs) { try { cb(user, ev); } catch (e) { console.error(e); } } }
  async function init() {
    if (!cloudReady) return null;
    try {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      sb.auth.onAuthStateChange((event, session) => {
        const was = user && user.id; user = shapeUser(session && session.user);
        if (event === 'PASSWORD_RECOVERY') recovery = true;
        if (event === 'PASSWORD_RECOVERY' || (user && user.id) !== was || event === 'USER_UPDATED') setTimeout(() => emit(event), 0);
      });
      const { data } = await sb.auth.getSession();
      user = shapeUser(data && data.session && data.session.user);
    } catch (e) { console.error('Sign-in service unavailable', e); sb = null; }
    return user;
  }
  const redirect = () => location.origin + location.pathname;
  const friendly = e => {
    const m = (e && (e.message || e.error_description || String(e))) || 'Something went wrong.';
    if (/invalid login credentials/i.test(m)) return 'That email and password don\'t match an account.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first. The link is in your inbox.';
    if (/already registered|already been registered/i.test(m)) return 'There\'s already an account with that email. Sign in instead, or reset the password.';
    if (/password should be at least|password.*characters/i.test(m)) return 'Use a password of at least 8 characters.';
    if (/rate limit|too many/i.test(m)) return 'Too many tries in a short time. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(m)) return 'Can\'t reach the save server. Check your connection and try again.';
    return m;
  };
  async function signUp(email, password, name) {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name || email.split('@')[0] }, emailRedirectTo: redirect() } });
    if (error) return { error: friendly(error) };
    return { ok: true, needConfirm: !data.session };
  }
  async function signIn(email, password) {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: friendly(error) } : { ok: true };
  }
  async function magicLink(email) {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect(), shouldCreateUser: true } });
    return error ? { error: friendly(error) } : { ok: true };
  }
  async function google() {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } });
    return error ? { error: friendly(error) } : { ok: true };
  }
  async function forgot(email) {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect() });
    return error ? { error: friendly(error) } : { ok: true };
  }
  async function setPassword(password) {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    const { error } = await sb.auth.updateUser({ password });
    if (!error) recovery = false;
    return error ? { error: friendly(error) } : { ok: true };
  }
  async function rename(name) {
    if (!sb || !user) return { error: 'Sign in first.' };
    const { data, error } = await sb.auth.updateUser({ data: { display_name: name } });
    if (!error && data && data.user) user = shapeUser(data.user);
    return error ? { error: friendly(error) } : { ok: true };
  }
  async function signOut() { await flush(); if (sb) await sb.auth.signOut(); user = null; emit('SIGNED_OUT'); }

  /* ---------- unlocks and the shop's server function ---------- */
  async function entitlements() {
    if (!sb || !user) return { skus: [] };
    const { data, error } = await sb.from('entitlements').select('sku');
    return error ? { error: friendly(error) } : { skus: (data || []).map(r => r.sku) };
  }
  // a promo or beta code: the database checks it, counts the use and writes the unlocks
  async function redeem(code) {
    if (!sb || !user) return { error: 'Sign in to redeem a code.' };
    const { data, error } = await sb.rpc('redeem_code', { p_code: String(code || '').slice(0, 60) });
    if (error) return { error: /function .*redeem_code|could not find the function/i.test(error.message || '') ? 'Codes aren\'t set up on this site yet.' : friendly(error) };
    return data && data.ok ? { ok: true, unlocked: data.unlocked || [], label: data.label || null } : { error: (data && data.error) || 'That code didn\'t work.' };
  }
  async function invoke(name, body) {
    if (!sb) return { error: 'Accounts aren\'t set up on this site.' };
    try {
      const { data, error } = await sb.functions.invoke(name, { body });
      if (!error) return { data };
      let msg = friendly(error), extra = null;
      try { extra = await error.context.json(); if (extra && extra.error) msg = extra.error; } catch (e) { /* no JSON body */ }
      return { error: msg, data: extra };
    } catch (e) { return { error: friendly(e) }; }
  }

  /* ---------- the cloud ---------- */
  async function cloudList() {
    if (!sb || !user) return [];
    const { data, error } = await sb.from('saves').select('slot,name,meta,updated_at').order('updated_at', { ascending: false });
    if (error) throw new Error(friendly(error));
    return (data || []).map(r => ({ where: 'cloud', slot: r.slot, label: slotLabel(r.slot), name: r.name, meta: r.meta, updated: Date.parse(r.updated_at) }));
  }
  async function cloudSave(slot, s) {
    if (!sb || !user) return 'Sign in to save to your account.';
    const m = meta(s);
    const { error } = await sb.from('saves').upsert({ user_id: user.id, slot, name: m.name, meta: m, state: s, game_version: VERSION, updated_at: new Date().toISOString() }, { onConflict: 'user_id,slot' });
    return error ? friendly(error) : null;
  }
  async function pruneCloud() {
    const { data } = await sb.from('saves').select('slot,updated_at').like('slot', 'a%').order('updated_at', { ascending: false });
    const old = (data || []).slice(AUTOS_KEPT).map(r => r.slot);
    if (old.length) await sb.from('saves').delete().in('slot', old);
  }
  async function cloudLoad(slot) {
    if (!sb || !user) return null;
    const { data, error } = await sb.from('saves').select('state').eq('slot', slot).maybeSingle();
    if (error) throw new Error(friendly(error));
    return data ? G.migrate(data.state) : null;
  }

  /* ---------- one interface for both ---------- */
  async function list() {
    let cloud = [], cloudErr = null;
    try { cloud = await cloudList(); } catch (e) { cloudErr = e.message; }
    return { cloud, local: localList(), cloudErr };
  }
  async function save(slot, s, where) {
    where = where || (user ? 'cloud' : 'local');
    if (where === 'cloud') { const err = await cloudSave(slot, s); if (!err) localSave(autoSlot(s), s); return err; }
    return localSave(slot, s);
  }
  async function load(slot, where) { return where === 'cloud' ? cloudLoad(slot) : localLoad(slot); }
  async function remove(slot, where) {
    if (where === 'cloud') { if (!sb || !user) return 'Sign in first.'; const { error } = await sb.from('saves').delete().eq('slot', slot); return error ? friendly(error) : null; }
    if (slot === 'legacy') ls.del(LEGACY); else ls.del(LOCAL + slot);
    return null;
  }
  // the newest save anywhere, for the title screen's Continue button
  async function latest() {
    const { cloud, local } = await list();
    const all = cloud.concat(local).filter(x => x.meta && !x.meta.result);
    all.sort((a, b) => (b.updated || 0) - (a.updated || 0));
    return all[0] || null;
  }

  /* ---------- autosave ---------- */
  let pending = null, timer = 0, lastCloud = 0, status = { at: 0, where: '', err: null }, pruned = '';
  function autosave(s, checkpoint) {
    const err = localSave(autoSlot(s), s);
    status = { at: Date.now(), where: 'browser', err };
    if (!user || !sb) return;
    pending = s; clearTimeout(timer);
    const wait = checkpoint ? 1500 : Math.max(1500, 20000 - (Date.now() - lastCloud));
    timer = setTimeout(flush, wait);
  }
  async function flush() {
    clearTimeout(timer); if (!pending || !user || !sb) return false;
    const s = pending; pending = null; lastCloud = Date.now();
    const slot = autoSlot(s);
    const err = await cloudSave(slot, s);
    status = { at: Date.now(), where: err ? 'browser' : 'account', err };
    if (!err && pruned !== slot) { pruned = slot; pruneCloud().catch(() => {}); }
    return !err;
  }
  window.addEventListener('pagehide', () => { flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  /* ---------- save files ---------- */
  function exportText(s) { return JSON.stringify({ game: 'overmaster', version: VERSION, saved: new Date().toISOString(), meta: meta(s), state: s }); }
  function importText(text) {
    let o; try { o = JSON.parse(text); } catch (e) { return { error: 'That file isn\'t an Overmaster save.' }; }
    if (o && o.game && o.game !== 'overmaster' && o.game !== 'behind-the-screen') return { error: 'That file isn\'t an Overmaster save.' };
    const s = G.migrate(o && o.state ? o.state : o);
    if (!s) return { error: 'That save is from a version this build can\'t read.' };
    return { state: s };
  }
  async function download(filename, text) {
    const cap = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (cap) { try { await cap.save({ filename, data: text }); return null; } catch (e) { return 'The download was cancelled.'; } }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); return null;
    } catch (e) { return 'This browser blocked the download.'; }
  }

  /* ---------- feedback and error reports ---------- */
  function context(s) {
    return { version: VERSION, page: location.origin + location.pathname, agent: navigator.userAgent.slice(0, 300), screen: `${innerWidth}x${innerHeight}`, view3d: document.body.classList.contains('view3d'),
      game: s ? { week: s.week, day: s.day, phase: s.phase, level: G.avgLevel(s), villain: s.villain && s.villain.type, party: s.heroes.map(h => h.rid || h.id), seed: s.seed } : null };
  }
  async function feedback(f) {
    if (!sb) return { error: 'Feedback can\'t be sent from this copy of the game.' };
    const row = { kind: f.kind, message: String(f.message || '').slice(0, 5000), contact: String(f.contact || '').slice(0, 200) || null, game_version: VERSION, context: context(f.state), save_state: f.attach && f.state ? f.state : null };
    if (user) row.user_id = user.id;
    const { error } = await sb.from('feedback').insert(row);
    return error ? { error: friendly(error) } : { ok: true };
  }
  const reported = new Set(); let reports = 0;
  function reportError(message, stack, s) {
    if (!sb || reports >= 3) return;
    const key = String(message).slice(0, 120); if (reported.has(key)) return; reported.add(key); reports++;
    const row = { kind: 'error', message: (String(message) + '\n' + String(stack || '')).slice(0, 5000), game_version: VERSION, context: context(s) };
    if (user) row.user_id = user.id;
    sb.from('feedback').insert(row).then(() => {}, () => {});
  }

  return {
    VERSION, SLOTS, slotLabel, isAuto, autoSlot, cloudReady: () => cloudReady && !!sb, google: CFG.googleSignIn ? google : null, feedbackEmail: CFG.feedbackEmail || '',
    init, user: () => user, onAuth: cb => authCbs.push(cb), recovering: () => recovery,
    signUp, signIn, magicLink, forgot, setPassword, rename, signOut, entitlements, invoke, redeem,
    list, save, load, remove, latest, autosave, flush, status: () => status,
    exportText, importText, download, feedback, reportError, settings, setSettings, meta
  };
})();
