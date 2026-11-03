(function () {
  'use strict';
  const G = Game, A = Art;
  const KEY = 'bts-adventure-v4';
  const VIEWKEY = 'bts-view';
  const TILE = 48;
  const SQ3 = Math.sqrt(3);
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tidx = (x, y) => y * G.MW + x;

  let S = null;
  const ui = {
    screen: null, tool: null, size: 1, sel: null, hover: null, cam: { x: 0, y: 0 }, drag: null, moving: false, anim: null, manim: null,
    est: null, estKey: '', vw: 0, vh: 0, modal: null, autoBattle: false, fast: false, dice: true, playing: false, view: {}, floats: [], fx: [],
    bhover: null, logOpen: false, deploySel: null, trapMode: false, finaleEst: null, release: {}, rel: {},
    r3d: false, techSel: null, bspec: null, mapSpec: null
  };
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let terrainCv = null, terrainKey = null, miniBase = null;

  // autosave: this browser right away, the account (when signed in) a little later; checkpoint = end of a day or battle
  function save(checkpoint) { if (!ui.active || !S) return; if (typeof Store !== 'undefined') Store.autosave(S, !!checkpoint); else try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

  /* ============ helpers ============ */
  const sfx = (k, o) => { if (window.SND) SND.play(k, o); };
  const sfxOr = (k, alt, o) => { if (!window.SND) return; SND.play(SND.has(k) ? k : alt, o); };   // 0.38: a new sound, or an old one until it's recorded
  // data-icon lets a picture swap to its pixel art the moment that art arrives
  const img = (key, cls, alt) => `<img class="${cls || ''}" src="${A.URI[key]}" data-icon="${key}" alt="${esc(alt || '')}" draggable="false">`;
  // the villain and heroes are chosen per campaign
  const VN = () => G.vName(S), VF = () => G.vFull(S), VP = () => G.vP(S), VT = () => G.vType(S);
  const vIcon = () => 'unit-' + VT().icon;
  const heroImg = (h, cls, alt) => img(A.ensureHero(h), cls, alt);
  const raceCls = h => `${(G.RACES[h.race] || G.RACES.human).label} ${G.CLASSES[h.cls].label.toLowerCase()}`;
  const today = () => G.dayKey(S);
  const isTrapKind = k => G.ITEMS[k] && G.ITEMS[k].cat === 'trap';

  function toast(text, tone, ms) {
    const box = $('toasts'); if (!box) return;
    const el = document.createElement('div'); el.className = 'toast ' + (tone || ''); el.textContent = text;
    if (tone === 'bad') sfx('deny', { vol: 0.7, gap: 300 });
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms || 3800);
  }
  const shortName = n => { const p = n.split(' '); return /^(Sister|Brother|Mother|Father)$/.test(p[0]) && p[1] ? p[1] : p[0]; };
  const diceSpeed = () => ui.fast ? 0.5 : 1;

  /* ============ mouse cursors: what a click will do, at a glance ============ */
  const svgCur = (svg, x, y, fallback) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${svg}</svg>`)}") ${x} ${y}, ${fallback}`;
  const CUR = {
    // walking boots: move here
    move: svgCur('<g stroke="#120a04" stroke-width="1.6" stroke-linejoin="round"><path d="M5 6h7v9l5 3c2 1 2 4-1 4H5z" fill="#9fe08a"/><path d="M5 22h11" stroke-width="2.4"/><path d="M15 12h7v9l5 3c2 1 2 4-1 4H15z" fill="#c8f0b8"/><path d="M15 28h11" stroke-width="2.4"/></g>', 16, 16, 'pointer'),
    // a sword: attack whoever is here
    attack: svgCur('<g stroke="#1a0604" stroke-width="1.5" stroke-linejoin="round"><path d="M2 2l6 1.5 14 14-4.5 4.5-14-14z" fill="#f2f0ea"/><path d="M5.5 5.5l14 14" stroke="#b0aaa0" stroke-width="1"/><path d="M14 24.5l10.5-10.5 2 2-10.5 10.5z" fill="#d9b24a"/><path d="M21 23l2-2 6 6-2 2z" fill="#7a2a14"/><circle cx="29" cy="29" r="2" fill="#d9b24a"/></g><path d="M2 2l6 1.5" stroke="#ff4a3a" stroke-width="2"/>', 2, 2, 'crosshair'),
    // a target: shoot from where you stand
    shoot: svgCur('<g fill="none"><circle cx="16" cy="16" r="10" stroke="#1a0604" stroke-width="4.5"/><circle cx="16" cy="16" r="10" stroke="#ff9a3a" stroke-width="2"/><path d="M16 1v9M16 22v9M1 16h9M22 16h9" stroke="#1a0604" stroke-width="4"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7" stroke="#ffd27a" stroke-width="2"/></g><circle cx="16" cy="16" r="2.2" fill="#ff5a2a" stroke="#1a0604"/>', 16, 16, 'crosshair'),
    // a map pin with a plus: build or place it here
    place: svgCur('<path d="M16 31C10 22 5.5 18 5.5 12a10.5 10.5 0 0 1 21 0c0 6-4.5 10-10.5 19z" fill="#e6c46c" stroke="#1a1008" stroke-width="1.6"/><path d="M16 6.5v11M10.5 12h11" stroke="#1a1008" stroke-width="2.8" stroke-linecap="round"/>', 16, 31, 'copy'),
    // spikes in the grass: hide a trap here
    trap: svgCur('<path d="M3 28h26" stroke="#1a0604" stroke-width="3"/><path d="M5 27l3-12 3 12M12 27l4-17 4 17M21 27l3-12 3 12" fill="#c9c0aa" stroke="#1a0604" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 15v-2M16 10V8M24 15v-2" stroke="#ff6a50" stroke-width="2" stroke-linecap="round"/>', 16, 28, 'copy'),
    // a sealed notice: post a quest for this
    quest: svgCur('<path d="M6 4h17a3 3 0 0 1 3 3v19a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3z" fill="#efe2bf" stroke="#1a1008" stroke-width="1.6"/><path d="M10 10h12M10 15h12M10 20h7" stroke="#7a5a2a" stroke-width="1.8"/><circle cx="23" cy="24" r="5" fill="#b8352a" stroke="#1a1008" stroke-width="1.4"/>', 6, 4, 'pointer'),
    // a struck-through circle: nothing will happen here
    no: svgCur('<circle cx="16" cy="16" r="10.5" fill="rgba(0,0,0,.35)" stroke="#1a0604" stroke-width="5"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="#e8604f" stroke-width="2.6"/><path d="M8.5 23.5l15-15" stroke="#1a0604" stroke-width="5"/><path d="M8.5 23.5l15-15" stroke="#e8604f" stroke-width="2.6"/>', 16, 16, 'not-allowed'),
    // a pickaxe: put the selected minions to work here
    work: svgCur('<g stroke="#140c04" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M9 25L22 12" stroke-width="5"/><path d="M9 25L22 12" stroke="#a8743a" stroke-width="2.6"/><path d="M12 6c6-3 12-1 16 5-5-2-9-2-12 0z" fill="#d9dde2"/><path d="M15 9l3 3" stroke-width="3"/></g>', 6, 26, 'pointer'),
    // a hammer: help raise the lair that's going up here
    build: svgCur('<g stroke="#140c04" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M8 27l12-12" stroke-width="5"/><path d="M8 27l12-12" stroke="#a8743a" stroke-width="2.6"/><path d="M15 6l6-2 8 8-2 6-3-1-6-6z" fill="#c9ccd2"/></g>', 7, 26, 'pointer'),
    select: 'pointer', wait: 'progress', pan: 'grab', none: ''
  };
  function setCur(el, kind) { if (!el) return; const c = CUR[kind] !== undefined ? CUR[kind] : ''; if (el.dataset.cur !== kind) { el.style.cursor = c; el.dataset.cur = kind; } }
  // the map: placing a lair, giving orders, or selecting
  function mapCursor(t) {
    if (!S || S.phase !== 'map') return 'none';
    if (ui.moving || ui.manim) return 'wait';
    if (ui.place) return t && !G.spotCheck(S, t.x, t.y) ? 'place' : 'no';
    if (ui.mode === 'patrol') { const b = selBand(); return t && b && !G.patrolCheck(S, b, t.x, t.y) ? 'move' : 'no'; }
    if (ui.mode === 'vmove') return t ? 'move' : 'pan';
    if (ui.mode === 'move' && t) { const o = orderAt(t); return o.kind === 'work' ? 'work' : o.kind === 'help' ? 'build' : o.kind === 'no' ? 'no' : 'move'; }
    if (ui.hoverMin) return 'select';
    if (t && hasSeen(t.x, t.y)) { const n = G.nodeAt(S, t.x, t.y); if (n && G.nodeFull(S, n) && !G.nodeRaided(S, n)) return 'select'; }
    if (t && selMinions().length) { const o = orderAt(t); if (o.kind === 'work') return 'work'; if (o.kind === 'help') return 'build'; if (o.kind === 'home') return 'move'; if (o.kind === 'no' && o.target) return 'no'; }
    if (t && thingAt(t.x, t.y).type !== 'spot') return 'select';
    return 'pan';
  }
  // the battlefield: during deployment and on your monsters' turns
  function battleCursor(k) {
    const b = S && S.battle; if (!b) return 'none';
    if (ui.playing) return 'wait';
    if (k === null || k === undefined || k < 0) return 'none';
    const who = b.units.find(x => x.alive && x.pos === k);
    if (b.phase === 'deploy') {
      if (ui.trapMode) { const free = !who && !(b.tiles[k] && G.TILE_INFO[b.tiles[k]].block); return b.traps.some(t => t.k === k) ? 'select' : G.isTrapZone(k) && free ? 'trap' : 'no'; }
      if (who && who.side === 'dm') return 'select';
      if (ui.deploySel) return G.isDmZone(k) && !who && !(b.tiles[k] && G.TILE_INFO[b.tiles[k]].block) ? 'move' : 'no';
      return 'none';
    }
    if (!isDmTurn()) return b.over || b.pendingTPK ? 'none' : 'wait';
    const u = curUnit(); const o = curOptions(); if (!u || !o) return 'none';
    if (who && who.side === 'party' && !who.down) { const t = o.targets.find(z => z.id === who.id); return t ? (t.ranged ? 'shoot' : 'attack') : 'no'; }
    if (o.reach.has(k) && k !== u.pos) return 'move';
    return 'no';
  }
  /* ============ 3D view ============ */
  const W3 = typeof World3D !== 'undefined' ? World3D : null;
  function wantsView3d() { try { return localStorage.getItem(VIEWKEY) !== '2d'; } catch (e) { return true; } }
  const hooks3d = {
    state: () => S,
    animPos: id => { const bt = bandTile(id); if (bt) return bt; if (!ui.manim || ui.manim.id !== id) return null; const p = lerpPath(ui.manim, performance.now()); return { x: p.x / TILE - 0.5, y: p.y / TILE - 0.5 }; },
    partyPos: () => { const p = partyPx(); return { x: p.x / TILE - 0.5, y: p.y / TILE - 0.5 }; },
    partyHeading: () => { const P = S.party; let a = null, b = null; if (ui.anim) { a = ui.anim.from; b = ui.anim.to; } else if (P.path.length) { a = P; b = { x: P.path[0][0], y: P.path[0][1] }; } return a && b && (a.x !== b.x || a.y !== b.y) ? Math.atan2(b.x - a.x, b.y - a.y) : null; },
    partyMoving: () => !!ui.anim,
    partyShown: () => partyShown(),
    monLevel: o => monLevel(o),
    townHint: () => townHint(),
    route: () => partyShown() ? routeSpec() : null,
    floats: () => S.phase === 'battle' ? ui.floats : ui.floats.filter(f => !f.battle).map(f => { if (!f.id) f.id = Math.random().toString(36).slice(2); return { id: f.id, t0: f.t0, text: f.text, color: f.color, x: f.x / TILE - 0.5, y: f.y / TILE - 0.75 }; }),
    view: () => ui.view, fx: () => ui.fx, bspec: () => ui.bspec,
    minionBubble: m => minionBubble(m),
    minionIdle: m => minionIdle(m),   // 0.39: Zz over an idle minion
    minionPos: m => { const p = minionTile(m); const d = (ui.mspots && ui.mspots.get(m.id)) || { dx: 0, dy: 0 }; return { x: p.x + d.dx, y: p.y + d.dy, moving: minionWalking(m), dance: !!(m.job && m.job.kind === 'dance' && !minionWalking(m)), work: minionWorking(m) }; },
    nodeLook: n => (nodeShownDev(n) ? 'node-' : 'dep-') + n.kind,
    fog: () => fogNow(),
    seeObj: o => o.kind === 'stack' ? canSeeObj(o) : hasSeen(o.x, o.y),
    seeTile: (x, y) => hasSeen(x, y),
    seeNode: (x, y) => hasScouted(x, y),
    seeNow: (x, y) => canSee(x, y),
    lairBuilding: o => lairShownBuilding(o),
    // how many minions stand hammering at a half-built lair right now
    lairCrew: o => lairShownBuilding(o) > 0 ? (S.minions || []).filter(m => m.x === o.x && m.y === o.y && !minionWalking(m)).length : 0,
    summoning: () => (S.summons || []).length ? { p: 1 - S.summons[0].days / S.summons[0].total, look: MT().look, n: S.summons.length } : null,
    libraryWork: () => ({ building: !!(S.base && S.base.libBuild), level: G.libraryLevel(S), crew: true }),
    nodeLabel: n => {
      const nm = `<span class="nm">${esc(shownNodeName(n))}</span>`; if (G.nodeRaided(S, n)) return `${nm} wrecked`; const f = nodeBar(n); if (f !== null) return `${nm} ${pbar(f)}`;
      // 0.35: filling, or full and waiting for you
      const p = nodeProg(n); if (p === null) return nm;
      if (p >= 1) return `${nm} <b class="full ${n.kind}">+${G.nodeStock(S, n)} ${G.NODE_KINDS[n.kind].res}</b>`;
      return `${nm} ${pbar(p, 'fill ' + n.kind)}${ui.night ? '' : `<small class="dl">${nodeLeft(n)}d</small>`}`;
    },
    villainHome: () => vDoor(),
    nodeState: n => { if (!n.dev || G.nodeRaided(S, n) || !nodeShownDev(n)) return 'idle'; return nodeShownFull(n) ? 'full' : 'work'; },
    nodePop: n => (ui.npop && ui.npop.get(n.id)) || 0,
    lairLabel: o => { const f = lairBar(o); if (f !== null) return `${pbar(f, 'build')} ${Math.max(0, Math.ceil(lairShownBuilding(o) || 0)) || ''}${lairShownBuilding(o) ? 'd' : ''}`; return G.lairWrecked(S, o) ? `wrecked · ${o.wrecked - G.dayIndex(S)}d` : `<b>${G.lairCount(o)}</b>`; },
    townItems: () => viewItems(),
    curId: () => { const b = S.battle; if (!b) return null; if (b.phase === 'deploy') return ui.deploySel; return ui.playing ? null : b.cur; },
    lost: () => { setView3d(false, true); toast('The 3D view stopped working, so the flat map is back.', 'bad'); },
    mapFrame: cam => { const k = cam.tx.toFixed(2) + ',' + cam.tz.toFixed(2) + ',' + cam.d.toFixed(2); if (k !== ui.miniCam) { ui.miniCam = k; drawMini(); } }
  };
  function init3d() {
    try { if (W3 && W3.setSprites) W3.setSprites(Store.settings().sprites !== false); } catch (e) { /* settings unavailable */ }
    if (!W3 || !wantsView3d() || !W3.supported() || !W3.init(hooks3d)) { ui.r3d = false; document.body.classList.remove('view3d'); updateViewBtn(); return false; }
    ui.r3d = true; document.body.classList.add('view3d');
    if (S.phase === 'battle' && S.battle) W3.attach($('bfield'), $('bcv')); else W3.attach($('mapwrap'), $('map'));
    W3.buildMap(S); W3.centerOn(S.party.x, S.party.y, true);
    W3.setMode(S.phase === 'battle' && S.battle ? null : 'map');
    updateViewBtn();
    return true;
  }
  function setView3d(on, silent) {
    const reView = !!ui.viewKind; unmountView();
    try { localStorage.setItem(VIEWKEY, on ? '3d' : '2d'); } catch (e) { /* storage unavailable */ }
    if (!on) { if (W3 && W3.ready) { W3.setMode(null); const c = W3.canvas; if (c && c.parentElement) c.parentElement.removeChild(c); const l = document.querySelector('.lbl3d'); if (l) l.remove(); } ui.r3d = false; document.body.classList.remove('view3d'); terrainKey = null; }
    else if (!init3d()) { if (!silent) toast('This browser can\'t show the 3D view, so the flat map stays.', 'bad'); }
    if (S.phase === 'battle' && S.battle) { sizeBattle(); if (ui.r3d) { W3.attach($('bfield'), $('bcv')); W3.enterBattle(S, BF); W3.setMode('battle'); } kick(); } else { sizeMap(); drawMap(); }
    if (reView && ui.screen) renderScreen();
    updateViewBtn();
  }
  function updateViewBtn() { const b = $('b-view'); if (b) { b.textContent = ui.r3d ? '3D' : '2D'; b.title = ui.r3d ? 'Showing the 3D map. Click for the flat map.' : 'Showing the flat map. Click for the 3D map.'; b.classList.toggle('on', ui.r3d); } }
  // the party's planned route as arrows: green for today, red for later
  function routeSpec() {
    const P = S.party; if (ui.titleOn) return null; if (ui.anim || S.phase !== 'map' || !P.path.length) return null;
    let mp = P.mp, px = P.x, py = P.y; const arrows = [], colors = []; let end = null;
    for (let i = 0; i < P.path.length; i++) {
      const [x, y] = P.path[i]; mp -= G.stepCost(S, px, py, x, y); const col = mp >= 0 ? '#7ee06a' : '#e8604f';
      if (i === P.path.length - 1) end = [x, y, col];
      else { const [nx, ny] = P.path[i + 1]; arrows.push([x, y, Math.atan2(ny - y, nx - x)]); colors.push(col); }
      px = x; py = y;
    }
    return { arrows, colors, end, key: P.x + ',' + P.y + ':' + P.mp + ':' + P.path.map(p => p[0] + '.' + p[1]).join(';') };
  }
  // what to tint on the 3D ground this frame (the same decisions the flat map draws)
  function mapSpec3d() {
    const tiles = new Map(); const sp = { tiles, sight: null, ghost: null, path: null, pathColor: '#9cc4ff', sel: null };
    const set = (x, y, hex, a, border) => { if (x < 0 || y < 0 || x >= G.MW || y >= G.MH) return; const c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), a, border]; const k = tidx(x, y); const o = tiles.get(k); if (!o || border || a > o[3]) tiles.set(k, o && !border ? c : c); };
    const zoneOf = [];
    const hov = ui.hover && G.objAt(S, ui.hover.x, ui.hover.y);
    if (hov && hov.kind === 'stack') zoneOf.push(hov);
    if (ui.sel && ui.sel.type === 'obj') { const o = S.objects.find(z => z.id === ui.sel.id); if (o && o.kind === 'stack' && zoneOf.indexOf(o) < 0) zoneOf.push(o); }
    for (const o of zoneOf) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) set(o.x + dx, o.y + dy, '#dc3c28', 0.3, false);
    if (ui.sel && ui.sel.x !== undefined && !ui.manim && ui.sel.type !== 'minion') { const sx = ui.sel.type === 'villain' ? S.villain.x : ui.sel.x, sy = ui.sel.type === 'villain' ? S.villain.y : ui.sel.y; sp.sel = { x: sx, y: sy }; }
    if (ui.hover) set(ui.hover.x, ui.hover.y, '#fff4d6', 0.08, true);
    if (ui.sel && ui.sel.type === 'spot') { const err = G.spotCheck(S, ui.sel.x, ui.sel.y); set(ui.sel.x, ui.sel.y, err ? '#dc3c28' : '#78dc78', 0.45, true); }
    if (ui.sel && ui.sel.type !== 'party' && ui.sel.type !== 'minion') sp.sel = { x: ui.sel.x, y: ui.sel.y };
    // minions: rings under the selected ones, their routes, and what a right-click would do
    const ms = selMinions(); sp.minSel = ms.map(m => m.id); sp.minHover = ui.hoverMin || null; sp.pathColors = null;
    if (ms.length) {
      const r = minionRoutes(ms); sp.path = r.arrows; sp.pathColors = r.colors;
      if (ui.hover && !ui.place && !ui.hoverMin) { const o = orderAt(ui.hover); const col = ORDER_COL[o.kind]; if (col && (o.kind !== 'move')) set(ui.hover.x, ui.hover.y, col, 0.4, true); }
    }
    if (ui.sel && ui.sel.type === 'villain' && !ui.night) { const r = villainRoute(); if (r) { sp.path = r.arrows; sp.pathColors = r.colors; } }
    // 0.41: point anywhere with the villain picked: the road he'd take, or a red tile where he can't go
    if (ui.sel && ui.sel.type === 'villain' && !ui.night && !ui.moving && ui.hover && !ui.hoverMin) {
      const pv = villainPreview(ui.hover);
      if (pv === false) set(ui.hover.x, ui.hover.y, '#dc3c28', 0.5, true);
      else if (pv) { sp.path = pv.arrows; sp.pathColors = pv.colors; set(ui.hover.x, ui.hover.y, '#d0aaff', 0.35, true); }
    }
    const band = selBand();
    sp.block = !ui.night && !!(ms.length || (ui.sel && ui.sel.type === 'villain') || band);   // 0.41: show where nobody can walk
    if (band && !ui.night) { const r = bandRoute(band); if (r.length) { sp.path = r.map((p, i) => [p[0], p[1], i + 1 < r.length ? Math.atan2(r[i + 1][1] - p[1], r[i + 1][0] - p[0]) : 0]).slice(0, -1); sp.pathColor = '#ff9a7a'; } }
    if (ui.mode === 'patrol' && band && ui.hover) set(ui.hover.x, ui.hover.y, G.patrolCheck(S, band, ui.hover.x, ui.hover.y) ? '#dc3c28' : '#ff9a7a', 0.45, true);
    if (ui.mode === 'move' && ui.hover && ms.length) { const o = orderAt(ui.hover); set(ui.hover.x, ui.hover.y, ORDER_COL[o.kind] || '#e8d4ff', 0.45, true); }
    if (ui.place) {
      if (partyShown()) { const pp = partyPx(); sp.sight = { x: pp.x / TILE, z: pp.y / TILE, r: G.sightRadius(S) + 0.5 }; }
      if (ui.hover) { const err = G.spotCheck(S, ui.hover.x, ui.hover.y); set(ui.hover.x, ui.hover.y, err ? '#dc3c28' : '#78dc78', 0.45, true); sp.ghost = { kind: ui.place.k, x: ui.hover.x, y: ui.hover.y, err: !!err }; }
    }
    return sp;
  }

  /* ============ map rendering ============ */
  const mapCv = () => $('map');
  function ensureTerrain() {
    const k = Math.min(1.5, dpr); const key = S.seed + ':' + G.sizeKey() + ':' + k;
    if (terrainKey === key) return;
    const M = G.mapOf(S);
    terrainCv = A.paintMap(S.seed, M.T, M.road, TILE * k); terrainKey = key;
  }
  function sizeMap() {
    const cv = mapCv(); if (!cv) return;
    const r = cv.parentElement.getBoundingClientRect();
    ui.vw = Math.max(50, r.width); ui.vh = Math.max(50, r.height);
    cv.width = Math.round(ui.vw * dpr); cv.height = Math.round(ui.vh * dpr);
    if (ui.r3d) { W3.resize(); const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); }
    clampCam(); drawMap();
  }
  function clampCam() {
    const mw = G.MW * TILE, mh = G.MH * TILE;
    ui.cam.x = mw <= ui.vw ? (mw - ui.vw) / 2 : Math.max(0, Math.min(mw - ui.vw, ui.cam.x));
    ui.cam.y = mh <= ui.vh ? (mh - ui.vh) / 2 : Math.max(0, Math.min(mh - ui.vh, ui.cam.y));
  }
  function centerOn(tx, ty, instant) { if (ui.r3d) W3.centerOn(tx, ty, instant); ui.cam.x = tx * TILE + TILE / 2 - ui.vw / 2; ui.cam.y = ty * TILE + TILE / 2 - ui.vh / 2; clampCam(); }
  function lerpPath(a, now) {
    const t = Math.min(1, (now - a.t0) / a.dur); const pts = a.pts; const f = t * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f)); const q = f - i; const p = pts[i], z = pts[i + 1] || p;
    return { x: (p[0] + (z[0] - p[0]) * q) * TILE + TILE / 2, y: (p[1] + (z[1] - p[1]) * q) * TILE + TILE / 2 };
  }
  function partyPx() {
    const P = S.party;
    if (ui.anim) { const t = Math.min(1, (performance.now() - ui.anim.t0) / ui.anim.dur); return { x: (ui.anim.from.x + (ui.anim.to.x - ui.anim.from.x) * t) * TILE + TILE / 2, y: (ui.anim.from.y + (ui.anim.to.y - ui.anim.from.y) * t) * TILE + TILE / 2 }; }
    return { x: P.x * TILE + TILE / 2, y: P.y * TILE + TILE / 2 };
  }

  function drawMap() {
    const cv = mapCv(); if (!cv || !S || !ui.active || S.phase === 'battle') return;
    if (ui.r3d) { ui.floats = ui.floats.filter(f => performance.now() - f.t0 < 1800); ui.mspots = minionSpots(); W3.setMapSpec(mapSpec3d()); drawMini(); return; }
    ensureTerrain();
    const c = cv.getContext('2d'); const now = performance.now();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#0b0907'; c.fillRect(0, 0, ui.vw, ui.vh);
    const ox = -Math.round(ui.cam.x), oy = -Math.round(ui.cam.y);
    c.imageSmoothingEnabled = true;
    c.drawImage(terrainCv, 0, 0, terrainCv.width, terrainCv.height, ox, oy, G.MW * TILE, G.MH * TILE);
    const fog = document.createElement('canvas'); fog.width = G.MW; fog.height = G.MH;
    const fc = fog.getContext('2d'); const fd = fc.createImageData(G.MW, G.MH);
    const FG = fogNow();
    for (let i = 0; i < G.MW * G.MH; i++) { fd.data[i * 4] = 6; fd.data[i * 4 + 1] = 5; fd.data[i * 4 + 2] = 10; fd.data[i * 4 + 3] = FG.vis[i] ? 0 : FG.far[i] ? 60 : FG.scout[i] ? 120 : 248; }
    fc.putImageData(fd, 0, 0);
    c.drawImage(fog, 0, 0, G.MW, G.MH, ox - TILE / 2, oy - TILE / 2, G.MW * TILE + TILE, G.MH * TILE + TILE);
    const pp = partyPx();
    // guard zones
    const zoneOf = [];
    const hov = ui.hover && G.objAt(S, ui.hover.x, ui.hover.y);
    if (hov && hov.kind === 'stack') zoneOf.push(hov);
    if (ui.sel && ui.sel.type === 'obj') { const o = S.objects.find(z => z.id === ui.sel.id); if (o && o.kind === 'stack' && zoneOf.indexOf(o) < 0) zoneOf.push(o); }
    for (const o of zoneOf) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; c.fillStyle = 'rgba(220,60,40,0.20)'; c.fillRect((o.x + dx) * TILE + ox, (o.y + dy) * TILE + oy, TILE, TILE);
    }
    // a selected band's patrol, and where a click would send it
    const SB = selBand();
    if (SB && !ui.night) {
      const r = bandRoute(SB); if (r.length > 1) { c.strokeStyle = 'rgba(255,150,120,0.9)'; c.lineWidth = 3; c.setLineDash([6, 5]); c.beginPath(); r.forEach(([x, y], i) => { const X = x * TILE + TILE / 2 + ox, Y = y * TILE + TILE / 2 + oy; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); }); c.stroke(); c.setLineDash([]); }
      if (SB.patrol) for (const e of [SB.patrol.a, SB.patrol.b]) { c.strokeStyle = '#ff9a7a'; c.lineWidth = 2; c.beginPath(); c.arc(e[0] * TILE + TILE / 2 + ox, e[1] * TILE + TILE / 2 + oy, 8, 0, 7); c.stroke(); }
      if (ui.mode === 'patrol' && ui.hover) { const bad = G.patrolCheck(S, SB, ui.hover.x, ui.hover.y); c.strokeStyle = bad ? '#dc3c28' : '#ff9a7a'; c.lineWidth = 2.5; c.strokeRect(ui.hover.x * TILE + ox + 2, ui.hover.y * TILE + oy + 2, TILE - 4, TILE - 4); }
    }
    // 0.31: the selected villain's road
    if (ui.sel && ui.sel.type === 'villain' && !ui.night) { const r = villainRoute(); if (r) { c.lineWidth = 3; c.setLineDash([6, 5]); r.arrows.forEach(([x, y], i) => { const nx = i + 1 < r.arrows.length ? r.arrows[i + 1][0] : S.villain.path[S.villain.path.length - 1][0], ny = i + 1 < r.arrows.length ? r.arrows[i + 1][1] : S.villain.path[S.villain.path.length - 1][1]; c.strokeStyle = r.colors[i]; c.beginPath(); c.moveTo(x * TILE + TILE / 2 + ox, y * TILE + TILE / 2 + oy); c.lineTo(nx * TILE + TILE / 2 + ox, ny * TILE + TILE / 2 + oy); c.stroke(); }); c.setLineDash([]); } }
    if (ui.mode === 'move' && ui.hover && selMinions().length) { const o = orderAt(ui.hover); c.strokeStyle = ORDER_COL[o.kind] || '#e8d4ff'; c.lineWidth = 2.5; c.strokeRect(ui.hover.x * TILE + ox + 2, ui.hover.y * TILE + oy + 2, TILE - 4, TILE - 4); }
    if (ui.sel && ui.sel.type === 'spot') { const err = G.spotCheck(S, ui.sel.x, ui.sel.y); c.fillStyle = err ? 'rgba(220,60,40,0.3)' : 'rgba(120,220,120,0.28)'; c.fillRect(ui.sel.x * TILE + ox, ui.sel.y * TILE + oy, TILE, TILE); }
    if (!ui.anim && S.phase === 'map' && partyShown()) drawRoute(c, ox, oy);
    // 0.31: Millbrook's rough whereabouts, until you've seen the town
    { const H = townHint(); if (H) { const hx = H.x * TILE + TILE / 2 + ox, hy = H.y * TILE + TILE / 2 + oy;
      c.setLineDash([10, 8]); c.strokeStyle = 'rgba(230,196,108,0.7)'; c.lineWidth = 2; c.beginPath(); c.arc(hx, hy, H.r * TILE, 0, 7); c.stroke(); c.setLineDash([]);
      c.font = '700 13px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText('Millbrook lies somewhere here', hx, hy); c.fillStyle = '#e6c46c'; c.fillText('Millbrook lies somewhere here', hx, hy); } }
    // where the selected minions are walking: bright for tonight's leg, dim for later
    const msl = selMinions();
    if (msl.length && !ui.night) {
      const mp = G.minionMpOf(S);
      for (const m of msl) {
        if (!m.path.length) continue; let px = m.x, py = m.y, left = mp;
        c.lineWidth = 3; c.setLineDash([5, 4]);
        for (const [x, y] of m.path) { left -= G.stepCost(S, px, py, x, y); c.strokeStyle = left >= 0 ? 'rgba(232,212,255,0.95)' : 'rgba(170,130,220,0.7)'; c.beginPath(); c.moveTo(px * TILE + TILE / 2 + ox, py * TILE + TILE / 2 + oy); c.lineTo(x * TILE + TILE / 2 + ox, y * TILE + TILE / 2 + oy); c.stroke(); px = x; py = y; }
        c.setLineDash([]); c.strokeStyle = '#e8d4ff'; c.lineWidth = 2; c.beginPath(); c.arc(px * TILE + TILE / 2 + ox, py * TILE + TILE / 2 + oy, 7, 0, 7); c.stroke();
      }
      if (ui.hover && !ui.place && !ui.hoverMin) { const o = orderAt(ui.hover); const col = ORDER_COL[o.kind]; if (col && o.kind !== 'move') { c.strokeStyle = col; c.lineWidth = 2.5; c.strokeRect(ui.hover.x * TILE + ox + 2, ui.hover.y * TILE + oy + 2, TILE - 4, TILE - 4); } }
    }
    if (ui.place && partyShown()) {
      const rr = G.sightRadius(S) * TILE + TILE * 0.5;
      c.fillStyle = 'rgba(230,196,108,0.10)'; c.beginPath(); c.arc(pp.x + ox, pp.y + oy, rr, 0, 7); c.fill();
      c.setLineDash([6, 5]); c.strokeStyle = 'rgba(230,196,108,0.75)'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    }
    const items = [];
    for (const site of G.sitesOf(S)) if (hasSeen(site.x, site.y)) items.push({ y: site.y, f: () => drawSite(c, site, ox, oy) });
    for (const o of S.objects) if (o.kind === 'stack' ? canSeeObj(o) : hasSeen(o.x, o.y)) items.push({ y: o.y, f: () => drawObj(c, o, ox, oy, now) });
    for (const n of S.nodes || []) if (hasScouted(n.x, n.y)) items.push({ y: n.y, f: () => drawNode(c, n, ox, oy) });
    const spots = minionSpots(); const look = G.minionType(S).look;
    const msel = new Set(selMinions().map(m => m.id));
    for (const m of S.minions || []) { const p = minionTile(m); const d = spots.get(m.id) || { dx: 0, dy: 0 }; items.push({ y: p.y + d.dy + 0.05, f: () => {
      const cx = (p.x + 0.5 + d.dx) * TILE + ox, by = (p.y + 0.5 + d.dy) * TILE + oy;
      if (msel.has(m.id) || ui.hoverMin === m.id) { c.strokeStyle = msel.has(m.id) ? '#ffe39a' : 'rgba(255,227,154,0.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, by + 1, 13, 6, 0, 0, 7); c.stroke(); }
      if (m.job && m.job.kind === 'dance' && !minionWalking(m)) { const t = now / 1000 + m.x; c.save(); c.translate(cx, by - 9 - Math.abs(Math.sin(t * 9)) * 6); c.rotate(Math.sin(t * 4.5) * 0.35); c.drawImage(A.IMG['unit-m-' + look], -13, -13, 26, 26); c.restore(); kick(); }
      else if (minionWorking(m)) {
        // hammering away at a half-built lair or a new mine (0.31: a tool on a swing, a hop, and dust on every blow)
        const ph = (now / 1000 * 1.6 + m.x * 0.37 + m.y * 0.21) % 1; const up = ph < 0.6 ? ph / 0.6 : 1 - (ph - 0.6) / 0.4; const e = up * up * (3 - 2 * up);
        const hop = ph > 0.6 && ph < 0.75 ? 3 * Math.sin((ph - 0.6) / 0.15 * Math.PI) : 0;
        c.save(); c.translate(cx, by - 9 - hop); c.rotate(0.22 * e - 0.28 * (1 - e)); c.drawImage(A.IMG['unit-m-' + look], -13, -13, 26, 26); c.restore();
        c.save(); c.translate(cx + 6, by - 12); c.rotate(-0.9 + 2.0 * e); c.strokeStyle = '#8a5a30'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(11, -8); c.stroke(); c.fillStyle = '#9a9aa8'; c.fillRect(8, -12, 7, 4); c.restore();
        if (ph > 0.92 || ph < 0.08) { c.fillStyle = 'rgba(230,214,184,0.7)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(cx + 10 + i * 4 - 4, by - 2 - i, 2 + i * 0.6, 0, 7); c.fill(); } }
        kick();
      } else c.drawImage(A.IMG['unit-m-' + look], cx - 13, by - 22, 26, 26);
      // 0.39: an idle minion snores (Zz) until it gets an order
      if (!minionBubble(m) && minionIdle(m)) { const t = now / 1000 + m.x * 0.7; const bob = Math.sin(t * 2.4) * 2.5; c.save(); c.font = 'bold 13px Alegreya, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(20,14,8,0.9)';
        c.strokeText('Z', cx + 9, by - 26 + bob); c.fillStyle = '#ffd36a'; c.fillText('Z', cx + 9, by - 26 + bob); c.font = 'bold 10px Alegreya, Georgia, serif'; c.strokeText('z', cx + 16, by - 34 + bob * 0.7); c.fillText('z', cx + 16, by - 34 + bob * 0.7); c.restore(); kick(); }
      // 0.33: its words in a bubble
      { const say = minionBubble(m); if (say) { c.save(); c.font = 'italic 12px Alegreya, Georgia, serif'; const w = c.measureText(say).width + 14; const bx = cx - w / 2, byy = by - 48;
        c.fillStyle = 'rgba(20,14,8,0.92)'; c.strokeStyle = '#c8a050'; c.lineWidth = 1; c.beginPath(); c.roundRect(bx, byy, w, 20, 6); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(cx - 4, byy + 20); c.lineTo(cx, byy + 26); c.lineTo(cx + 4, byy + 20); c.fill(); c.fillStyle = '#f2e6c8'; c.textAlign = 'center'; c.fillText(say, cx, byy + 14); c.restore(); kick(); } } } }); }
    if (G.villainOnMap(S) && canSee(S.villain.x, S.villain.y)) items.push({ y: S.villain.y + 0.01, f: () => drawVillain(c, ox, oy, now) });
    else if (vDoor()) items.push({ y: vDoor().y - 0.2, f: () => drawVillain(c, ox, oy, now) });
    if (partyShown()) items.push({ y: pp.y / TILE - 0.5 + 0.02, f: () => { c.drawImage(A.IMG['obj-party'], pp.x + ox - 28, pp.y + oy - 46, 56, 56); } });
    items.sort((a, b) => a.y - b.y); for (const it of items) it.f();
    // 0.37: the war camp's name over its bands (the 3D map has its own label)
    if (!ui.r3d) { const B = G.campBands(S).filter(o => canSeeObj(o)); if (B.length) {
      let cx = 0, cy = 0; for (const o of B) { cx += o.x + 0.5; cy += o.y + 0.5; } cx = cx / B.length * TILE + ox; cy = Math.min(...B.map(o => o.y)) * TILE + oy - 8;
      const txt = `WAR CAMP ${B.reduce((a, o) => a + o.count, 0)}`; c.font = '700 11px Cinzel, Georgia, serif'; const w = c.measureText(txt).width + 14;
      c.fillStyle = 'rgba(40,12,8,0.85)'; c.strokeStyle = '#c8603a'; c.lineWidth = 1; c.beginPath(); roundRect(c, cx - w / 2, cy - 15, w, 16, 3); c.fill(); c.stroke();
      c.fillStyle = '#f2d8b0'; c.textAlign = 'center'; c.fillText(txt, cx, cy - 3); } }
    // quest markers
    for (const q of S.quests) {
      if (q.status !== 'open') continue;
      const t = G.refTarget(S, q.ref); if (!t) continue;
      const x = t.x * TILE + TILE / 2 + ox - 26, y = t.y * TILE + oy - 26;
      c.drawImage(A.IMG['obj-quest'], x, y, 22, 22);
    }
    if (ui.sel && ui.sel.x !== undefined && !ui.manim && ui.sel.type !== 'minion') {
      const sx = ui.sel.type === 'villain' ? S.villain.x : ui.sel.x, sy = ui.sel.type === 'villain' ? S.villain.y : ui.sel.y;
      c.strokeStyle = '#ffe9a8'; c.lineWidth = 2; c.strokeRect(sx * TILE + ox + 1, sy * TILE + oy + 1, TILE - 2, TILE - 2);
    }
    if (ui.place && ui.hover) {
      const { x, y } = ui.hover; const err = G.spotCheck(S, x, y);
      c.fillStyle = err ? 'rgba(220,60,40,0.28)' : 'rgba(120,220,120,0.25)'; c.fillRect(x * TILE + ox, y * TILE + oy, TILE, TILE);
      c.strokeStyle = err ? 'rgba(255,120,100,0.9)' : 'rgba(160,255,160,0.9)'; c.lineWidth = 2; c.strokeRect(x * TILE + ox + 1, y * TILE + oy + 1, TILE - 2, TILE - 2);
      c.globalAlpha = err ? 0.35 : 0.8; c.drawImage(A.IMG['obj-' + ui.place.k], x * TILE + ox + TILE / 2 - 23, y * TILE + oy + TILE - 48, 46, 46); c.globalAlpha = 1;
    }
    ui.floats = ui.floats.filter(f => now - f.t0 < 1800);
    for (const f of ui.floats) {
      if (f.battle) continue;
      const t = (now - f.t0) / 1800; c.globalAlpha = 1 - t * t;
      c.font = '700 15px Cinzel, Georgia, serif'; c.textAlign = 'center';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(f.text, f.x + ox, f.y + oy - 30 - t * 26);
      c.fillStyle = f.color || '#ffe9a8'; c.fillText(f.text, f.x + ox, f.y + oy - 30 - t * 26);
      c.globalAlpha = 1;
    }
    drawMini();
  }
  function drawRoute(c, ox, oy) {
    const P = S.party; if (!P.path.length) return;
    let mp = P.mp, px = P.x, py = P.y;
    for (let i = 0; i < P.path.length; i++) {
      const [x, y] = P.path[i];
      mp -= G.stepCost(S, px, py, x, y);
      const today_ = mp >= 0;
      const cx = x * TILE + TILE / 2 + ox, cy = y * TILE + TILE / 2 + oy;
      if (i === P.path.length - 1) {
        c.strokeStyle = today_ ? '#7ee06a' : '#e8604f'; c.lineWidth = 3; c.beginPath();
        c.moveTo(cx - 7, cy - 7); c.lineTo(cx + 7, cy + 7); c.moveTo(cx + 7, cy - 7); c.lineTo(cx - 7, cy + 7); c.stroke();
      } else {
        const [nx, ny] = P.path[i + 1]; const ang = Math.atan2(ny - y, nx - x);
        c.save(); c.translate(cx, cy); c.rotate(ang);
        c.fillStyle = 'rgba(0,0,0,0.55)'; c.beginPath(); c.moveTo(8, 1); c.lineTo(-5, -6); c.lineTo(-2, 1); c.lineTo(-5, 8); c.closePath(); c.fill();
        c.fillStyle = today_ ? '#7ee06a' : '#e8604f'; c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -6); c.lineTo(-2, 0); c.lineTo(-5, 6); c.closePath(); c.fill();
        c.restore();
      }
      px = x; py = y;
    }
  }
  function drawSite(c, site, ox, oy) {
    const im = A.IMG[siteIcon(site)]; const sz = site.kind === 'town' || site.kind === 'tower' ? 72 : 60;
    const cx = site.x * TILE + TILE / 2 + ox, by = site.y * TILE + TILE + oy + 4;
    c.drawImage(im, cx - sz / 2, by - sz, sz, sz);
    if (site.kind === 'landmark' && S.visited[site.id]) { c.fillStyle = 'rgba(184,53,42,0.95)'; c.beginPath(); c.moveTo(cx + 18, by - sz + 8); c.lineTo(cx + 30, by - sz + 12); c.lineTo(cx + 18, by - sz + 16); c.fill(); c.fillStyle = '#5a3a1a'; c.fillRect(cx + 17, by - sz + 7, 2, 20); }
    c.font = '700 11px Cinzel, Georgia, serif'; c.textAlign = 'center';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.8)'; c.strokeText(site.name, cx, by + 10);
    c.fillStyle = site.kind === 'tower' ? '#d9a8ff' : '#f2e4c0'; c.fillText(site.name, cx, by + 10);
  }
  function badge(c, bx, by, kind) {
    c.fillStyle = kind === '?' ? '#8e5ad8' : '#d9a83a'; c.beginPath(); c.arc(bx, by, 7, 0, 7); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#fff'; c.font = '700 10px Alegreya, Georgia, serif'; c.textAlign = 'center'; c.fillText(kind, bx, by + 3.5);
  }
  function drawObj(c, o, ox, oy, now) {
    let cx = o.x * TILE + TILE / 2 + ox, by = o.y * TILE + TILE + oy;
    if (ui.manim && ui.manim.id === o.id) { const p = lerpPath(ui.manim, now); cx = p.x + ox; by = p.y + TILE / 2 + oy; }
    const bt = bandTile(o.id); if (bt) { cx = (bt.x + 0.5) * TILE + ox; by = (bt.y + 1) * TILE + oy; }
    if (o.kind === 'stack') {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(cx, by - 5, 17, 5, 0, 0, 7); c.fill();
      c.drawImage(A.IMG['unit-' + o.type], cx - 19, by - 44, 38, 38);
      const t = String(o.count); c.font = '700 11px Alegreya, Georgia, serif';
      const w = Math.max(18, c.measureText(t).width + 8);
      c.fillStyle = o.movedDay === today() ? '#3a3a3a' : '#1a2246'; c.strokeStyle = '#d9b45e'; c.lineWidth = 1;
      c.beginPath(); roundRect(c, cx - w / 2, by - 11, w, 13, 3); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(t, cx, by - 1);
      const ml = monLevel(o);
      if (ml) { c.font = '700 10px Alegreya, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText('Lv ' + ml.L, cx, by - 46); c.fillStyle = MLV_COL[ml.cls]; c.fillText('Lv ' + ml.L, cx, by - 46); }
      else if ((o.lvl || 1) > 1) { c.font = '700 9px Alegreya, Georgia, serif'; c.fillStyle = '#ffd36a'; c.fillText('★' + o.lvl, cx, by - 46); }
      if (ui.sel && ui.sel.type === 'obj' && ui.sel.id === o.id) { c.strokeStyle = '#ff9a7a'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, by - 5, 20, 7, 0, 0, 7); c.stroke(); }
    } else if (o.kind === 'dungeon') {
      const wrecked = o.mine && G.lairWrecked(S, o);
      const bld = o.mine ? lairShownBuilding(o) : 0;
      if (bld) {
        // going up: a faint outline of the finished lair, the built part solid, dust while the builders hammer
        const im = A.IMG['obj-' + o.dtype], p = Math.max(0.06, lairBar(o) || 0), iw = im.width, ih = im.height;
        c.save(); c.globalAlpha = 0.22; c.drawImage(im, cx - 30, by - 56, 60, 60); c.restore();
        c.drawImage(im, 0, ih * (1 - p), iw, ih * p, cx - 30, by - 56 + 60 * (1 - p), 60, 60 * p);
        c.fillStyle = '#7a4e26'; c.fillRect(cx - 24, by - 60 + 60 * (1 - p), 48, 3); c.fillRect(cx - 22, by - 60 + 60 * (1 - p), 3, 14); c.fillRect(cx + 19, by - 60 + 60 * (1 - p), 3, 14);
        if (hooks3d.lairCrew(o)) { const t = now / 1000; for (let i = 0; i < 4; i++) { const a = (t / 1.4 + i / 4) % 1; c.globalAlpha = (1 - a) * 0.6; c.fillStyle = '#e6d6b8'; c.beginPath(); c.arc(cx - 18 + ((i * 37) % 36), by - 58 + 60 * (1 - p) - a * 14, 2 + a * 4, 0, 7); c.fill(); } c.globalAlpha = 1; kick(); }
      } else c.drawImage(A.IMG[wrecked ? 'obj-wrecked' : 'obj-' + o.dtype], cx - 30, by - 56, 60, 60);
      const lb = o.mine ? lairBar(o) : null; if (lb !== null) bar2d(c, cx, by - 62, 40, lb, '#7ad86a');
      const name = G.DUNGEONS[o.dtype].name + ((o.level || 1) > 1 ? ' II' : '');
      c.font = '700 10px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.8)'; c.strokeText(name, cx, by + 9); c.fillStyle = '#ffb8a8'; c.fillText(name, cx, by + 9);
      if (o.mine && !bld && !wrecked) { const t = String(G.lairCount(o)); c.font = '700 11px Alegreya, Georgia, serif'; const w = Math.max(18, c.measureText(t).width + 8); c.fillStyle = '#3a1a46'; c.strokeStyle = '#d9b45e'; c.lineWidth = 1; c.beginPath(); roundRect(c, cx + 10, by - 20, w, 13, 3); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(t, cx + 10 + w / 2, by - 10); }
      if (o.mine && ((bld && o.building) || wrecked)) { const t = bld ? `${o.building}d` : `${o.wrecked - G.dayIndex(S)}d`; c.font = '700 10px Alegreya, Georgia, serif'; c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(cx + 10, by - 20, 24, 13); c.fillStyle = '#ffd27a'; c.textAlign = 'center'; c.fillText(t, cx + 22, by - 10); }
    } else if (o.kind === 'relic') {
      // 0.36: a relic, glowing in its tier's colour, stars winking around it
      const col = ['', '#8fb4e0', '#b07aff', '#ffc040'][o.tier] || '#b07aff'; const t = now / 1000; const b = 0.75 + 0.25 * Math.sin(t * 2.2 + o.x);
      const g = c.createRadialGradient(cx, by - 20, 2, cx, by - 20, 28 * b); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(cx - 32, by - 52, 64, 64);
      c.drawImage(A.IMG[A.IMG['obj-relic'] ? 'obj-relic' : 'obj-artifact'], cx - 19, by - 39, 38, 38);
      for (let i = 0; i < 5; i++) { const a = (t / 1.4 + i / 5 + o.x * 0.31) % 1, k = Math.sin(Math.PI * a), q = Math.floor(t / 1.4 + i / 5 + o.x * 0.31); const hx = Math.sin(q * 127.1 + i * 311.7) * 43758.5, hy = Math.sin(q * 269.5 + i * 183.3) * 43758.5; const sx = cx + ((hx - Math.floor(hx)) - 0.5) * 36, sy = by - 4 - (hy - Math.floor(hy)) * 38; const r = 1 + 3 * k; c.fillStyle = `rgba(255,255,240,${k})`; c.fillRect(sx - r, sy - 0.5, r * 2, 1); c.fillRect(sx - 0.5, sy - r, 1, r * 2); }
      if (!rafOn) kick();
    } else {
      const sz = isTrapKind(o.kind) ? 40 : 46;
      if (isTrapKind(o.kind)) c.globalAlpha = 0.85;
      c.drawImage(A.IMG['obj-' + o.kind], cx - sz / 2, by - sz - 1, sz, sz);
      c.globalAlpha = 1;
    }
    if (o.known) badge(c, cx + 15, by - 42, o.rumored ? '?' : '!');
  }
  function bar2d(c, cx, y, w, f, col) {
    c.fillStyle = 'rgba(10,8,6,0.85)'; c.beginPath(); roundRect(c, cx - w / 2 - 1.5, y - 1.5, w + 3, 8, 3); c.fill();
    c.fillStyle = col || '#e8b84a'; if (f > 0) { c.beginPath(); roundRect(c, cx - w / 2, y, Math.max(2, w * Math.min(1, f)), 5, 2); c.fill(); }
    c.strokeStyle = 'rgba(255,230,170,0.55)'; c.lineWidth = 1; c.beginPath(); roundRect(c, cx - w / 2 - 1.5, y - 1.5, w + 3, 8, 3); c.stroke();
  }
  function drawNode(c, n, ox, oy) {
    const cx = n.x * TILE + TILE / 2 + ox, by = n.y * TILE + TILE + oy;
    if (G.nodeRaided(S, n)) c.globalAlpha = 0.55;
    const p = nodeProg(n); const full = p !== null && p >= 1; const now = performance.now() / 1000; const sd = n.x * 1.7 + n.y * 0.9;
    // 0.35: full: a glow breathes behind it
    if (full) { const b = 0.8 + 0.2 * Math.sin(now * 2.6 + sd); const g = c.createRadialGradient(cx, by - 20, 2, cx, by - 20, 30 * b); g.addColorStop(0, RES_COL[n.kind] + '88'); g.addColorStop(1, RES_COL[n.kind] + '00'); c.fillStyle = g; c.fillRect(cx - 34, by - 54, 68, 68); }
    c.drawImage(A.IMG['obj-' + (nodeShownDev(n) ? 'node-' : 'dep-') + n.kind], cx - 20, by - 40, 40, 40); c.globalAlpha = 1;
    // a mine's lantern flickers while it's yours
    const L = LAMP2D[n.kind]; if (p !== null && L) { const fl = 0.78 + 0.12 * Math.sin(now * 7.3 + sd) + 0.07 * Math.sin(now * 17.1 + sd * 2); const lx = cx - 20 + 40 * L[0] / L[2], ly = by - 40 + 40 * L[1] / L[3]; const g = c.createRadialGradient(lx, ly, 0, lx, ly, 7 * fl); g.addColorStop(0, `rgba(255,210,120,${0.95 * fl})`); g.addColorStop(1, 'rgba(255,150,50,0)'); c.fillStyle = g; c.fillRect(lx - 8, ly - 8, 16, 16); c.fillStyle = '#fff2c0'; c.fillRect(lx - 0.75, ly - 0.75, 1.5, 1.5); }
    const f = nodeBar(n);
    if (f !== null && !G.nodeRaided(S, n)) { bar2d(c, cx, by + 2, 34, f); return; }
    if (p !== null && !full) { bar2d(c, cx, by + 2, 30, p, RES_COL[n.kind]); return; }
    if (full) for (let i = 0; i < 6; i++) { const a = (now / 1.3 + i / 6 + sd * 0.37) % 1, k = Math.sin(Math.PI * a), q = Math.floor(now / 1.3 + i / 6 + sd * 0.37); const hx = Math.sin(q * 127.1 + i * 311.7) * 43758.5; const hy = Math.sin(q * 269.5 + i * 183.3) * 43758.5; const sx = cx + ((hx - Math.floor(hx)) - 0.5) * 38, sy = by - 6 - (hy - Math.floor(hy)) * 38 - a * 4; const r = 1 + 3 * k; c.fillStyle = `rgba(255,255,230,${k})`; c.fillRect(sx - r, sy - 0.5, r * 2, 1); c.fillRect(sx - 0.5, sy - r, 1, r * 2); }
    const t = G.nodeRaided(S, n) ? 'wrecked' : full ? `+${G.nodeStock(S, n)} ${G.NODE_KINDS[n.kind].res}` : '';
    if (!t) return;
    c.font = '700 10px Alegreya, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(t, cx, by + 8); c.fillStyle = full ? RES_COL[n.kind] : '#c8b898'; c.fillText(t, cx, by + 8);
  }
  // 0.35: your villain stands on the tower's doorstep while at home, so you can see (and click) them from the first day
  function vDoor() { if (!S || S.title || !S.villain || G.villainOnMap(S) || S.villain.state !== 'lair' || S.march) return null; const tw = G.siteOf(S, 'tower'); return { x: tw.x, y: tw.y + 1 }; }
  // where each mine's lantern hangs on its picture: [x, y, picture width, picture height]
  const LAMP2D = { gold: [69, 40, 118, 104], ore: [39, 6, 42, 50] };
  function drawVillain(c, ox, oy, now) {
    const V = S.villain; const door = vDoor();
    let cx = (door ? door.x + 0.9 : V.x) * TILE + TILE / 2 + ox, by = (door ? door.y : V.y) * TILE + TILE + oy;
    if (ui.manim && ui.manim.id === 'villain') { const p = lerpPath(ui.manim, now); cx = p.x + ox; by = p.y + TILE / 2 + oy; }
    const bt = bandTile('villain'); if (bt) { cx = (bt.x + 0.5) * TILE + ox; by = (bt.y + 1) * TILE + oy; }
    const pulse = 0.5 + 0.5 * Math.sin(now / 400);
    c.fillStyle = `rgba(160,90,255,${0.12 + pulse * 0.1})`; c.beginPath(); c.arc(cx, by - 20, 26, 0, 7); c.fill();
    c.drawImage(A.IMG['obj-villain'], cx - 28, by - 54, 56, 56);
    if (V.known) badge(c, cx + 16, by - 46, '!');
    if (!rafOn) kick();
  }
  function roundRect(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // the minimap: terrain and the heroes' explored land are cached; the dots and view box are drawn fresh
  function drawMini() {
    const cv = $('mini'); if (!cv || !S || cv.offsetParent === null) return;
    const FG = fogNow(); const key = S.seed + ':' + G.sizeKey() + ':' + FG.k;
    if (!miniBase || miniBase.key !== key) {
      const M = G.mapOf(S); miniBase = document.createElement('canvas'); miniBase.width = G.MW * 6; miniBase.height = G.MH * 6; miniBase.key = key;
      const m = miniBase.getContext('2d');
      for (let y = 0; y < G.MH; y++) for (let x = 0; x < G.MW; x++) { const i = tidx(x, y); if (!FG.scout[i]) { m.fillStyle = '#07060b'; m.fillRect(x * 6, y * 6, 6, 6); continue; } m.fillStyle = M.road[i] ? '#c4aa7a' : A.MINI[M.T[i]]; m.fillRect(x * 6, y * 6, 6, 6); if (!FG.vis[i]) { m.fillStyle = 'rgba(8,6,14,0.5)'; m.fillRect(x * 6, y * 6, 6, 6); } }
    }
    const W = cv.clientWidth || 200, H = Math.round(W * G.MH / G.MW);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = false; c.drawImage(miniBase, 0, 0, W, H);
    const sx = W / G.MW, sy = H / G.MH; const dot = Math.max(3, sx * 0.8);
    const sq = (x, y, col, z, edge) => { const r = (z || dot) / 2; c.fillStyle = col; c.fillRect((x + 0.5) * sx - r, (y + 0.5) * sy - r, r * 2, r * 2); if (edge) { c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect((x + 0.5) * sx - r, (y + 0.5) * sy - r, r * 2, r * 2); } };
    for (const site of G.sitesOf(S)) if (FG.seen[tidx(site.x, site.y)]) sq(site.x, site.y, site.kind === 'tower' ? '#c47cff' : site.kind === 'town' ? '#fff4d6' : '#d9ccb0', site.kind === 'landmark' ? dot * 0.8 : dot * 1.5, '#1a1008');
    for (const n of S.nodes || []) if (FG.scout[tidx(n.x, n.y)]) sq(n.x, n.y, G.nodeRaided(S, n) ? '#6a6458' : MINI_RES[n.kind], dot * 1.1, '#140c04');
    for (const o of S.objects) {
      if (o.kind === 'stack' ? !canSeeObj(o) : !FG.seen[tidx(o.x, o.y)]) continue;
      if (o.kind === 'dungeon' && o.mine) sq(o.x, o.y, o.building ? '#5a2a78' : G.lairWrecked(S, o) ? '#4a3a52' : '#c04aff', dot * 1.4, '#f0d8ff');
      else if (!isTrapKind(o.kind)) sq(o.x, o.y, o.kind === 'stack' ? '#ff5a45' : o.kind === 'dungeon' ? '#ff9a6a' : '#ffd25a', dot * 0.9);
    }
    const msel = new Set(selMinions().map(m => m.id));
    for (const m of S.minions || []) { const p = minionTile(m); c.fillStyle = msel.has(m.id) ? '#ffffff' : '#e2ccff'; c.beginPath(); c.arc((p.x + 0.5) * sx, (p.y + 0.5) * sy, msel.has(m.id) ? 2.6 : 1.9, 0, 7); c.fill(); if (msel.has(m.id)) { c.strokeStyle = '#3a1a5a'; c.lineWidth = 1; c.stroke(); } }
    if (G.villainOnMap(S) && FG.vis[tidx(S.villain.x, S.villain.y)]) { c.fillStyle = '#c06cff'; c.beginPath(); c.arc((S.villain.x + 0.5) * sx, (S.villain.y + 0.5) * sy, 3.5, 0, 7); c.fill(); }
    // 0.31: the heroes only where you can see them; otherwise a faint mark where you last did, and Millbrook's rough whereabouts
    if (partyShown()) { const pp = partyPx(); c.fillStyle = '#ff2a1a'; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(pp.x / TILE * sx, pp.y / TILE * sy, 3.8, 0, 7); c.fill(); c.stroke(); }
    else if (S.partySeen) { c.strokeStyle = 'rgba(255,90,70,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.arc((S.partySeen.x + 0.5) * sx, (S.partySeen.y + 0.5) * sy, 3.2, 0, 7); c.stroke(); }
    { const H = townHint(); if (H) { c.setLineDash([3, 3]); c.strokeStyle = 'rgba(230,196,108,0.85)'; c.lineWidth = 1.2; c.beginPath(); c.arc((H.x + 0.5) * sx, (H.y + 0.5) * sy, H.r * sx, 0, 7); c.stroke(); c.setLineDash([]); } }
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.2;
    const q = ui.r3d && W3.viewQuad();
    if (q) { c.beginPath(); q.forEach(([x, y], i) => { if (i) c.lineTo(x * sx, y * sy); else c.moveTo(x * sx, y * sy); }); c.closePath(); c.stroke(); }
    else if (!ui.r3d) c.strokeRect(ui.cam.x / TILE * sx, ui.cam.y / TILE * sy, ui.vw / TILE * sx, ui.vh / TILE * sy);
  }
  const MINI_RES = { gold: '#ffd23a', lumber: '#62c24a', ore: '#a9c2dc' };
  function toggleMini(on) {
    const el = $('minimap'); if (!el) return;
    if (on === undefined) on = el.classList.contains('off');
    el.classList.toggle('off', !on); const b = $('minitog'); if (b) { b.textContent = on ? '–' : '▸'; b.title = on ? 'Hide the minimap' : 'Show the minimap'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    try { localStorage.setItem(isPhone() ? 'bts-mini-p' : 'bts-mini', on ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    if (on) drawMini();
  }

  /* ============ map input ============ */
  function tileAt(ev) {
    if (ui.r3d) return W3.pickTile(ev.clientX, ev.clientY);
    const r = mapCv().getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left + ui.cam.x) / TILE), y = Math.floor((ev.clientY - r.top + ui.cam.y) / TILE);
    if (x < 0 || y < 0 || x >= G.MW || y >= G.MH) return null;
    return { x, y };
  }
  /* ============ 0.40: phones on their side ============ */
  // a phone held sideways: the panel is a drawer, two fingers pinch to zoom, press and hold to give an order
  const PHONE = typeof matchMedia === 'function' ? matchMedia('(orientation: landscape) and (max-height: 540px)') : { matches: false };
  const isPhone = () => PHONE.matches;
  const drawerOpen = () => { const a = $('app'); return !!a && a.classList.contains('drawer'); };
  function setDrawer(on, auto) {
    const app = $('app'); if (!app) return; on = !!on;
    if (on === drawerOpen()) { if (!on) ui.drawerAuto = false; return; }
    app.classList.toggle('drawer', on); ui.drawerAuto = on && !!auto;
    const b = $('drawbtn'); if (b) { b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Hide the panel' : 'Show the panel'); }
    if (on && ui.sel) keepClear(ui.sel.x, ui.sel.y);
  }
  // with the drawer open, glide the camera so the thing you picked isn't hidden behind it
  function keepClear(x, y) {
    if (!S || x === undefined || !isPhone()) return;
    const dw = ($('sidebody') || {}).offsetWidth || 0; const p = tileScreen(x, y); const r = mapCv().getBoundingClientRect();
    const room = r.right - dw - 24; if (p.x < room && p.x > r.left + 24) return;
    const want = (r.left + room) / 2;
    if (ui.r3d) { const a = W3.pickTile(r.left + r.width / 2, r.top + r.height / 2), b = W3.pickTile(r.left + r.width / 2 + 160, r.top + r.height / 2); const tpp = a && b ? Math.max(0.01, (b.x - a.x) / 160) : 0.02; W3.pan((p.x - want) * tpp, 0); }
    else { ui.cam.x += p.x - want; clampCam(); }
    drawMap();
  }
  // after every render: a pick with no orders of its own (a lair, a mine, a band of the wilds, the town) opens the drawer
  const DRAWER_SEL = new Set(['lair', 'node', 'obj', 'site', 'party']);
  function phoneSync() {
    if (!isPhone() || !S || S.title) return;
    if (S.phase !== 'map' || ui.place || ui.mode) { if (drawerOpen()) setDrawer(false); return; }
    const sel = ui.sel; const key = sel ? `${sel.type}:${sel.id || ''}:${sel.x},${sel.y}` : '';
    if (key === ui.drawerKey) return; ui.drawerKey = key;
    const b = selBand(); if (sel && DRAWER_SEL.has(sel.type) && !(b && (b.lair || b.yours))) setDrawer(true, true);
    else if (ui.drawerAuto) setDrawer(false);
  }
  // the right-click orders, for a mouse or a long press
  function rightAt(ev) {
    if (ui.place || ui.mode) { ui.place = null; ui.mode = null; renderSide(); drawMap(); return; }
    if (S && S.phase === 'map' && !ui.moving && selMinions().length) { const t = tileAt(ev); if (t) giveOrder(t); return; }
    if (S && S.phase === 'map' && !ui.moving && selBand()) { const t = tileAt(ev); if (t) patrolTo(t); return; }
    if (S && S.phase === 'map' && !ui.moving && ui.sel && ui.sel.type === 'villain') { const t = tileAt(ev); if (t) sendVillain(t.x, t.y); return; }
    if (ui.sel) { ui.sel = null; renderSide(); drawMap(); }
  }
  function bindMap() {
    const cv = mapCv();
    const fingers = new Map();
    const mid = () => { const [a, b] = [...fingers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; };
    const dropPress = () => { if (ui.press) { clearTimeout(ui.press); ui.press = null; } };
    const endFinger = e => {
      if (!fingers.delete(e.pointerId)) return;
      if (!fingers.size) { ui.pinch = null; dropPress(); return; }
      if (ui.pinch && fingers.size < 2) {   // one finger left after a pinch: it drags from where it is
        ui.pinch = null; const [f] = [...fingers.values()];
        ui.drag = { x: f.x, y: f.y, cx: ui.cam.x, cy: ui.cam.y, moved: true }; if (ui.r3d) W3.dragStart(f.x, f.y);
      }
    };
    cv.addEventListener('pointerdown', e => {
      if (e.button === 2) return; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      if (e.pointerType === 'touch') {
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (fingers.size === 2) { dropPress(); if (ui.drag) { ui.drag.moved = true; if (ui.r3d) W3.dragEnd(); } ui.pinch = mid(); return; }
        if (fingers.size > 2) return;
        // press and hold: what a right-click does (walk there, patrol there, call off a build order)
        dropPress(); const at = { clientX: e.clientX, clientY: e.clientY };
        ui.press = setTimeout(() => { ui.press = null; const d = ui.drag; if (!d || d.moved || ui.pinch) return; d.moved = true; d.held = true; if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) { /* no buzz */ } rightAt(at); }, 480);
      }
      ui.drag = { x: e.clientX, y: e.clientY, cx: ui.cam.x, cy: ui.cam.y, moved: false }; if (ui.r3d) W3.dragStart(e.clientX, e.clientY);
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' && fingers.has(e.pointerId)) {
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ui.pinch && fingers.size >= 2) {
          const m = mid(), p = ui.pinch; if (ui.night) ui.night.keepCam = true;
          if (ui.r3d) { W3.dragStart(p.x, p.y); W3.dragMove(m.x, m.y); W3.dragEnd(); if (p.d > 8 && m.d > 8) W3.zoomAt(Math.log(p.d / m.d) / 0.0012, m.x, m.y); }
          else { ui.cam.x -= m.x - p.x; ui.cam.y -= m.y - p.y; clampCam(); }
          ui.pinch = m; drawMap(); return;
        }
      }
      if (ui.drag) {
        const dx = e.clientX - ui.drag.x, dy = e.clientY - ui.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > (e.pointerType === 'touch' ? 10 : 6)) { ui.drag.moved = true; dropPress(); }
        if (ui.drag.moved) { if (ui.night) ui.night.keepCam = true; if (ui.r3d) W3.dragMove(e.clientX, e.clientY); else { ui.cam.x = ui.drag.cx - dx; ui.cam.y = ui.drag.cy - dy; clampCam(); } cv.style.cursor = 'grabbing'; cv.dataset.cur = 'grabbing'; drawMap(); return; }
      }
      const t = tileAt(e); const hm = e.pointerType === 'touch' ? null : minionAtPx(e);
      if (!t || !ui.hover || t.x !== ui.hover.x || t.y !== ui.hover.y || hm !== ui.hoverMin) { ui.hover = t; ui.hoverMin = hm; drawMap(); status(); setCur(cv, mapCursor(t)); }
    });
    cv.addEventListener('pointercancel', e => { endFinger(e); ui.drag = null; if (ui.r3d) W3.dragEnd(); });
    cv.addEventListener('pointerup', e => {
      const many = fingers.size > 1; endFinger(e); if (many) return;
      const d = ui.drag; ui.drag = null; cv.dataset.cur = ''; setCur(cv, mapCursor(ui.hover)); if (ui.r3d) W3.dragEnd();
      if (!d || d.moved || !S || S.phase !== 'map' || ui.moving) return;
      const t = tileAt(e);
      if (ui.place) { if (t) placeAt(t); return; }
      if (ui.mode === 'move') { if (t) { giveOrder(t); ui.mode = null; renderSide(); } return; }
      if (ui.mode === 'vmove') { if (t) { ui.mode = null; sendVillain(t.x, t.y); renderSide(); } return; }
      if (ui.mode === 'patrol') { if (t) patrolTo(t); return; }
      const mid = minionAtPx(e); if (mid) { clickMinion(mid, e.shiftKey); return; }
      // on a touch screen there's no right-click: tapping a site, a half-built lair or the tower gives the order
      if (t && e.pointerType === 'touch' && selMinions().length) { const o = orderAt(t); if (o.kind === 'work' || o.kind === 'help' || o.kind === 'home') { giveOrder(t); return; } }
      if (t) clickTile(t, e.shiftKey);
      // a tap on the map that picks nothing puts the drawer away
      if (isPhone() && drawerOpen() && !ui.sel && !ui.place && !ui.mode) setDrawer(false);
    });
    cv.addEventListener('pointerleave', () => { ui.hover = null; ui.hoverMin = null; drawMap(); status(); });
    cv.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (fingers.size || e.pointerType === 'touch') return;   // a phone's own long-press menu: the press timer gives the order
      rightAt(e);
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); if (ui.night) ui.night.keepCam = true; if (ui.r3d) { W3.zoomAt(e.deltaY * (e.deltaMode === 1 ? 30 : 1), e.clientX, e.clientY); drawMap(); return; } ui.cam.x += e.deltaX || (e.shiftKey ? e.deltaY : 0); ui.cam.y += e.shiftKey ? 0 : e.deltaY; clampCam(); drawMap(); }, { passive: false });
    const mini = $('mini'); if (!mini) return;
    const miniTile = e => { const r = mini.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * G.MW, y: (e.clientY - r.top) / r.height * G.MH }; };
    const jump = e => { const { x, y } = miniTile(e); if (ui.r3d) W3.centerOn(x - 0.5, y - 0.5, true); ui.cam.x = x * TILE - ui.vw / 2; ui.cam.y = y * TILE - ui.vh / 2; clampCam(); drawMap(); };
    mini.addEventListener('pointerdown', e => { if (e.button === 2) return; mini.setPointerCapture(e.pointerId); jump(e); mini.onpointermove = jump; });
    mini.addEventListener('pointerup', () => { mini.onpointermove = null; });
    // right-click the minimap to send the selected minions there
    mini.addEventListener('contextmenu', e => {
      e.preventDefault(); if (!S || S.phase !== 'map' || ui.moving || !selMinions().length) return;
      const p = miniTile(e); let t = { x: Math.max(0, Math.min(G.MW - 1, Math.floor(p.x))), y: Math.max(0, Math.min(G.MH - 1, Math.floor(p.y))) };
      // snap to a site or lair if one is right there: they're tiny on the minimap
      const near = [...(S.nodes || []), ...G.myLairs(S).filter(o => o.building), G.siteOf(S, 'tower')].map(o => ({ o, d: Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 1.3) t = { x: near.o.x, y: near.o.y };
      giveOrder(t);
    });
  }
  // what's on a tile, for clicks and hover
  function thingAt(x, y) {
    // 0.41: land made out from afar shows its deposits, and nothing else that's on it
    if (!hasSeen(x, y)) { const n = hasScouted(x, y) && G.nodeAt(S, x, y); if (n) return { type: 'node', id: n.id, x, y }; return x === S.party.x && y === S.party.y && partyShown() ? { type: 'party', x, y } : { type: 'spot', x, y }; }
    let o = G.objAt(S, x, y); if (o && o.kind === 'stack' && !canSeeObj(o)) o = null;
    if (o && o.kind === 'dungeon' && o.mine) return { type: 'lair', id: o.id, x, y };
    const n = G.nodeAt(S, x, y); if (n) return { type: 'node', id: n.id, x, y };
    if (o) return { type: 'obj', id: o.id, x, y };
    { const d = vDoor(); if (d && (x === d.x || x === d.x + 1) && d.y === y) return { type: 'villain', x: S.villain.x, y: S.villain.y }; }
    const site = G.siteAt(S, x, y); if (site) return { type: 'site', id: site.id, x, y };
    const m = (S.minions || []).find(z => z.x === x && z.y === y); if (m) return { type: 'minion', id: m.id, x, y };
    if (G.villainOnMap(S) && S.villain.x === x && S.villain.y === y) return { type: 'villain', x, y };
    if (x === S.party.x && y === S.party.y && partyShown()) return { type: 'party', x, y };
    return { type: 'spot', x, y };
  }
  // click anything to see it in the sidebar; click open ground to build a lair there
  function clickTile(t, shift) {
    if (!S || S.phase !== 'map' || ui.moving) return;
    const th = thingAt(t.x, t.y);
    if (th.type === 'minion') { clickMinion(th.id, shift); return; }
    ui.mbuild = false;
    if (th.type === 'site' && th.id === 'tower') { ui.sel = null; openScreen('tower'); return; }
    ui.mode = null; ui.threat = null;
    // open ground: nothing to select (lairs are built from a minion's Build order)
    if (th.type === 'spot') { if (ui.sel) { ui.sel = null; renderSide(); drawMap(); } return; }
    // 0.35: a full mine or camp: one click collects it (and shows it in the sidebar, filling again)
    if (th.type === 'node') { const n = S.nodes.find(z => z.id === th.id); if (n && G.nodeFull(S, n) && !G.nodeRaided(S, n)) { if (!(selMinions().length)) ui.sel = th; collectAt(n); return; } }
    const same = ui.sel && ui.sel.type === th.type && ui.sel.x === th.x && ui.sel.y === th.y;
    ui.sel = same ? null : th;
    if (!same && th.type === 'villain') vsay('select');
    ui.scrollTo = 'sel'; renderSide(); drawMap();
  }
  /* ============ the dungeon master's fog of war ============ */
  // vis: what your tower, minions (where they stand right now, even mid-walk) and lairs see, plus around the heroes; seen: ever seen
  function fogNow() {
    const N = ui.night;
    const mpos = m => { const p = minionTile(m); return { x: Math.round(p.x), y: Math.round(p.y) }; };
    const k = [S.party.x, S.party.y, (S.minions || []).map(m => { const p = N ? mpos(m) : m; return p.x + ',' + p.y; }).join(';'), S.objects.filter(o => o.kind === 'dungeon' && o.mine).map(o => o.x + ',' + o.y + (o.building ? 'b' : '')).join(';'), S.objects.filter(o => o.kind === 'stack' && (o.lair || o.yours)).map(o => o.x + ',' + o.y).join(';'), G.villainOnMap(S) ? S.villain.x + ',' + S.villain.y : '-', living()].join('|');   // 0.31: your bands and villain see too
    if (ui.fog && ui.fog.k === k && ui.fog.seenRef === (N ? N.seen0 : S.dmSeen)) return ui.fog;
    // the title screen's world has no fog
    if (S.title) { const all = new Uint8Array(G.MW * G.MH).fill(1); ui.fog = { k, vis: all, far: all, seen: all, scout: all, seenRef: S.dmSeen }; return ui.fog; }
    // 0.41: two rings of sight. Near (vis): everything, monsters, relics and heroes too. Far (a ring farther): the land and its
    // deposits only. seen remembers what was near once; scout remembers the land made out from afar as well
    const vis = G.dmVisible(S, N ? mpos : null), far = G.dmVisible(S, N ? mpos : null, G.DM_FAR);
    const base = (N && N.seen0) || S.dmSeen || []; const fbase = (N && N.far0) || S.dmFar || base;
    const seen = new Uint8Array(vis.length), scout = new Uint8Array(vis.length);
    for (let i = 0; i < vis.length; i++) { seen[i] = vis[i] || base[i] ? 1 : 0; scout[i] = seen[i] || far[i] || fbase[i] ? 1 : 0; }
    ui.fog = { k, vis, far, seen, scout, seenRef: N ? N.seen0 : S.dmSeen }; return ui.fog;
  }
  const living = () => S.heroes.filter(h => h.status === 'ok').length;
  const canSee = (x, y) => x >= 0 && y >= 0 && x < G.MW && y < G.MH && fogNow().vis[tidx(Math.round(x), Math.round(y))] === 1;
  const hasSeen = (x, y) => x >= 0 && y >= 0 && x < G.MW && y < G.MH && fogNow().seen[tidx(x, y)] === 1;
  const hasScouted = (x, y) => x >= 0 && y >= 0 && x < G.MW && y < G.MH && fogNow().scout[tidx(x, y)] === 1;   // 0.41: the land, made out at least from afar
  const canSeeObj = o => { const t = bandTile(o.id); return t ? canSee(t.x, t.y) : canSee(o.x, o.y); };
  // 0.31: the heroes walk in the fog: they show only where one of yours can see them, or in a fight
  function partyShown() {
    if (!S || S.title || ui.titleOn || S.phase === 'battle' || S.phase === 'over') return true;
    const p = partyPx(); return canSee(p.x / TILE - 0.5, p.y / TILE - 0.5);
  }
  // where you last saw them, as a line for the sidebar
  function lastSeenText() {
    const L = S.partySeen; if (!L) return 'not seen yet';
    const days = G.dayIndex(S) - ((L.w - 1) * 7 + L.d); const when = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
    return `last seen ${when}, ${G.regionName(S, L.x, L.y)}`;
  }
  // 0.31: a band's level next to your villain's: easy, even, hard, or too strong to bargain with
  function monLevel(o) {
    if (!o || o.kind !== 'stack' || !o.wild) return null;
    const L = G.monsterLevel(S, o), V = G.villainLevel(S);
    return { L, cls: L >= V + G.TOO_HIGH ? 'deadly' : L >= V + 2 ? 'hard' : L <= V - 2 ? 'easy' : 'even' };
  }
  const MLV_COL = { easy: '#9fe08a', even: '#ffd36a', hard: '#ff9a5a', deadly: '#ff5a4a' };
  const MLV_TXT = { easy: 'well below your villain', even: 'about your villain\'s match', hard: 'stronger than your villain', deadly: 'far too strong to bargain with' };
  // Millbrook's whereabouts, until one of yours has seen the town
  const townHint = () => S && !S.title && S.townHint && !G.townKnown(S) ? S.townHint : null;

  /* ============ bands: the monsters on the map. Click one to tell it what to do ============ */
  const selBand = () => { if (!ui.sel || ui.sel.type !== 'obj' || !S) return null; const o = S.objects.find(z => z.id === ui.sel.id); return o && o.kind === 'stack' ? o : null; };
  // where a band walks next: toward the end of its patrol leg
  function bandRoute(o) {
    // 0.30: a wave's road to Millbrook's gates
    if (o.wave) { const key = ['w', o.id, o.x, o.y, S.party.x, S.party.y, S.objects.length].join(':'); if (ui.broute && ui.broute.key === key) return ui.broute.r; const p = G.wavePath(S, o); const r = p && p.length ? [[o.x, o.y]].concat(p) : []; ui.broute = { key, r }; return r; }
    if (!o.patrol) return [];
    const tgt = o.patrol.to ? o.patrol.b : o.patrol.a; const key = [o.id, o.x, o.y, tgt.join(), S.party.x, S.party.y, S.objects.length].join(':');
    if (ui.broute && ui.broute.key === key) return ui.broute.r;
    const p = G.bandPath(S, o, tgt[0], tgt[1]); const r = p ? [[o.x, o.y]].concat(p) : [];
    ui.broute = { key, r }; return r;
  }
  function patrolTo(t) {
    const b = selBand(); if (!b) { ui.mode = null; return; }
    const err = G.bandPatrol(S, b.id, t.x, t.y); if (err) { toast(err, 'bad'); return; } sfx('horde', { vol: 0.7 });
    ui.mode = null; ui.broute = null;
    ui.floats.push({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE * 0.3, text: b.patrol ? 'Patrol' : 'Hold', color: '#ff9a7a', t0: performance.now() });
    kick(); commit();
  }
  // how a band would fare against the heroes right now (a few practice fights, worked out after the click)
  function bandThreat(o) {
    const key = [o.id, o.type, o.count, o.lvl || 1, S.heroes.map(h => h.id + ':' + h.hp + ':' + h.level + ':' + h.status).join(','), today()].join('|');
    if (ui.threat && ui.threat.key === key) return ui.threat.r || null;
    if (!ui.threat || ui.threat.key !== key) {
      ui.threat = { key, r: null }; const tok = key;
      setTimeout(() => { if (!ui.threat || ui.threat.key !== tok || !S) return; const r = G.simulateStacks(S, [[o.type, o.count]], 8, o.lvl || 1); if (ui.threat && ui.threat.key === tok) { ui.threat.r = r || { label: '—' }; renderSide(); } }, 40);
    }
    return null;
  }
  const THREAT_TXT = { Trivial: 'Trivial: the heroes would hardly notice them. No Infamy, and no experience for the heroes either.', Easy: 'Easy: a few bruises, a little Infamy.', Tense: 'Tense: real blood spilled, and real experience for the heroes if they win.', Harrowing: 'Harrowing: it could go either way.', Deadly: 'Deadly: this could wipe out the party.' };

  /* ============ minions: select, then right-click to give orders ============ */
  const selMinions = () => ui.sel && ui.sel.type === 'minion' && S ? (ui.sel.ids || [ui.sel.id]).map(id => (S.minions || []).find(m => m.id === id)).filter(Boolean) : [];
  function setMinionSel(ids) {
    const list = ids.map(id => S.minions.find(m => m.id === id)).filter(Boolean);
    if (list.length && !(ui.sel && ui.sel.type === 'minion' && ui.sel.ids && ui.sel.ids.join() === list.map(m => m.id).join())) sfx('minion', { vol: 0.7, gap: 150 });
    ui.sel = list.length ? { type: 'minion', id: list[0].id, ids: list.map(m => m.id), x: list[0].x, y: list[0].y } : null;
  }
  // click a minion to select it; shift-click to add it to (or take it out of) the selection
  function clickMinion(id, add) {
    if (!S || S.phase !== 'map' || ui.moving) return;
    let ids = selMinions().map(m => m.id);
    if (add) ids = ids.includes(id) ? ids.filter(z => z !== id) : ids.concat(id); else ids = [id];
    setMinionSel(ids); if (ids.includes(id)) minionSay(S.minions.find(m => m.id === id), 'select'); ui.place = null; ui.mbuild = false; ui.mode = null; ui.scrollTo = 'sel'; renderSide(); drawMap();
  }
  // the minion figure under the pointer (they stand off-centre on busy tiles, so pick by pixel)
  function minionAtPx(ev) {
    if (!S || S.phase !== 'map' || !(S.minions || []).length) return null;
    if (ui.r3d) return W3.pickMinion(ev.clientX, ev.clientY);
    const r = mapCv().getBoundingClientRect(); const px = ev.clientX - r.left, py = ev.clientY - r.top;
    const ox = -Math.round(ui.cam.x), oy = -Math.round(ui.cam.y); const spots = minionSpots(); let best = null, bd = 15;
    for (const m of S.minions) { const p = minionTile(m); const d = spots.get(m.id) || { dx: 0, dy: 0 }; const dist = Math.hypot(px - ((p.x + 0.5 + d.dx) * TILE + ox), py - ((p.y + 0.5 + d.dy) * TILE + oy - 9)); if (dist < bd) { bd = dist; best = m.id; } }
    return best;
  }
  const MICON = {
    move: '<svg viewBox="0 0 24 24"><path d="M5 4h5v7l4 2c2 1 1 4-1 4H5z" fill="#c8f0b8" stroke="#140c04" stroke-width="1.4"/><path d="M5 20h9" stroke="#140c04" stroke-width="2"/><path d="M15 6l4 4-4 4" fill="none" stroke="#e8d4ff" stroke-width="2.2" stroke-linecap="round"/></svg>',
    build: '<svg viewBox="0 0 24 24"><path d="M5 21l9-9" stroke="#140c04" stroke-width="4"/><path d="M5 21l9-9" stroke="#a8743a" stroke-width="2"/><path d="M11 4l5-1 6 6-1 5-2-1-5-5z" fill="#c9ccd2" stroke="#140c04" stroke-width="1.2"/></svg>',
    plot: '<svg viewBox="0 0 24 24"><path d="M4 18c3-7 13-7 16 0z" fill="#3a1a46" stroke="#140c04" stroke-width="1.2"/><circle cx="9" cy="14" r="1.6" fill="#d9a8ff"/><circle cx="15" cy="14" r="1.6" fill="#d9a8ff"/><path d="M12 3l1.4 3 3.2.4-2.3 2.2.6 3.2L12 10.3 9.1 11.8l.6-3.2L7.4 6.4l3.2-.4z" fill="#ffd36a" stroke="#140c04" stroke-width=".8"/></svg>',
    dance: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.6" fill="#f0e2c2" stroke="#140c04" stroke-width="1"/><path d="M12 8l-1 7M11 10l-5-2M12 10l5 3M11 15l-4 5M11 15l5 4" stroke="#f0e2c2" stroke-width="2.2" stroke-linecap="round"/><path d="M19 4l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L16 6.3 18 6z" fill="#ffd36a"/></svg>',
    patrol: '<svg viewBox="0 0 24 24"><path d="M4 16c4-8 12-8 16 0" fill="none" stroke="#ff9a7a" stroke-width="2.4" stroke-dasharray="3 2.5"/><path d="M17 12l3 4-5 .5" fill="none" stroke="#ff9a7a" stroke-width="2.2" stroke-linecap="round"/><circle cx="4" cy="16" r="2.2" fill="#f0e2c2"/></svg>',
    level: '<svg viewBox="0 0 24 24"><path d="M12 3l7 8h-4v9H9v-9H5z" fill="#ffd36a" stroke="#140c04" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    away: '<svg viewBox="0 0 24 24"><path d="M4 12h12" stroke="#c8b898" stroke-width="2.6" stroke-linecap="round"/><path d="M12 6l6 6-6 6" fill="none" stroke="#c8b898" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4v16" stroke="#c8b898" stroke-width="2" opacity=".6"/></svg>'
  };
  const TOUCHY = () => { try { return matchMedia('(hover: none)').matches; } catch (e) { return false; } };
  // 0.40: on a touch screen the right-click is a long press
  const RCLK = cap => TOUCHY() ? (cap ? 'Press and hold' : 'press and hold') : (cap ? 'Right-click' : 'right-click');
  const ORDER_COL = { work: '#ffd36a', help: '#78dc78', home: '#c9a2ff', move: '#e8d4ff', no: '#dc3c28' };
  // what a right-click on this tile would tell the selected minions to do
  function orderAt(t) {
    const ms = selMinions(); if (!ms.length || !t) return { kind: 'none' };
    if (!hasScouted(t.x, t.y)) { const e = G.moveCheck(S, t.x, t.y); return e && !/walk there/.test(e) ? { kind: 'move', x: t.x, y: t.y } : e ? { kind: 'no', why: e } : { kind: 'move', x: t.x, y: t.y }; }
    const n = G.nodeAt(S, t.x, t.y);
    if (n) {
      const K = G.NODE_KINDS[n.kind];
      if (G.nodeRaided(S, n)) { const d = n.raidedUntil - G.dayIndex(S); return { kind: 'no', target: true, why: `The heroes wrecked this ${G.nodeName(n)}. It yields again in ${d} day${d > 1 ? 's' : ''}.` }; }
      if (n.dev) return { kind: 'no', target: true, why: G.nodeFull(S, n) ? `The ${G.nodeName(n)} is full. Left-click it to collect ${G.nodeStock(S, n)} ${K.res}.` : `The ${G.nodeName(n)} is already yours. It fills with ${nodeYield(n) * G.nodeDays(n)} ${K.res} every ${G.nodeDays(n)} days on its own.` };
      const others = G.assignedTo(S, n).filter(m => !ms.includes(m)).length;
      if (others >= K.cap) return { kind: 'no', target: true, why: `Another ${MT().one.toLowerCase()} is already on its way to sink it.` };
      return { kind: 'work', n, room: K.cap - others };
    }
    const o = G.objAt(S, t.x, t.y);
    if (o && o.kind === 'dungeon' && o.mine && o.building) return { kind: 'help', o };
    const site = G.siteAt(S, t.x, t.y); if (site && site.id === 'tower') return { kind: 'home' };
    const err = G.moveCheck(S, t.x, t.y); if (err) return { kind: 'no', why: err };
    return { kind: 'move', x: t.x, y: t.y };
  }
  // 0.41: the road the villain would take to a tile (false: he can't go there), worked out once per tile pointed at
  function villainPreview(t) {
    const V = S.villain; const key = [t.x, t.y, V.x, V.y, V.state, S.day, S.objects.length, (V.path || []).length].join(':');
    if (ui.vprev && ui.vprev.key === key) return ui.vprev.r;
    let r = null;
    const tw = G.siteOf(S, 'tower'); const home = t.x === tw.x && t.y === tw.y;
    const o = G.objAt(S, t.x, t.y); const tgt = o && o.kind === 'stack' && o.wild && canSeeObj(o) ? o : null;
    const loot = o && (o.kind === 'relic' || o.kind === 'artifact') && hasSeen(o.x, o.y);
    const end = V.path && V.path.length ? V.path[V.path.length - 1] : null;
    if (S.march || V.state === 'banished' || (end && end[0] === t.x && end[1] === t.y) || (home && !G.villainOnMap(S))) r = null;
    else if (!tgt && !home && !loot && (!isFinite(G.tileCost(S, t.x, t.y)) || (o && hasSeen(o.x, o.y)) || (G.siteAt(S, t.x, t.y) && hasSeen(t.x, t.y)))) r = false;
    else {
      const path = G.villainPathTo(S, t.x, t.y, tgt);
      if (!path) r = false;
      else if (path.length) {
        const from = G.villainOnMap(S) ? V : tw; const arrows = [], colors = []; let px = from.x, py = from.y, left = G.VILLAIN_DAY_MP, day = 0;
        for (const [x, y] of path) { const c = G.stepCost(S, px, py, x, y); if (c > left) { day++; left = G.VILLAIN_DAY_MP; } left -= c; arrows.push([px, py, Math.atan2(y - py, x - px)]); colors.push(day === 0 ? '#cfa8ff' : day === 1 ? '#9a74d8' : '#6e54a0'); px = x; py = y; }
        r = { arrows, colors };
      }
    }
    ui.vprev = { key, r }; return r;
  }
  // the villain's road as arrows: bright for tonight's march, dim for later
  function villainRoute() {
    const V = S.villain; const from = G.villainOnMap(S) ? V : G.siteOf(S, 'tower'); if (!V.path || !V.path.length) return null;
    const arrows = [], colors = []; let px = from.x, py = from.y, left = G.VILLAIN_DAY_MP;
    for (const [x, y] of V.path) { left -= G.stepCost(S, px, py, x, y); arrows.push([px, py, Math.atan2(y - py, x - px)]); colors.push(left >= 0 ? '#e0c0ff' : '#8a62c8'); px = x; py = y; }
    return { arrows, colors };
  }
  // 0.31: your villain walks the map: to a band of the wilds to win it over, to a spot, or home
  function sendVillain(x, y) {
    const o = G.objAt(S, x, y); const band = o && o.kind === 'stack' && o.wild && canSeeObj(o) ? o : null;
    const wasOut = G.villainOnMap(S);
    const err = G.villainOrder(S, band ? band.x : x, band ? band.y : y); if (err) { toast(err, 'bad'); sfx('deny'); return; }
    const V = S.villain; const tw = G.siteOf(S, 'tower');
    if (!wasOut && G.villainOnMap(S)) vsay('ride'); else if (!V.meet) vsay('order');   // 0.35: an answer to every order
    const loot = o && (o.kind === 'relic' || o.kind === 'artifact');
    ui.floats.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE * 0.3, text: band ? 'Parley' : loot ? 'Claim' : x === tw.x && y === tw.y ? 'Home' : 'Go', color: '#d0aaff', t0: performance.now() });
    sfx('dark', { vol: 0.5 }); ui.sel = { type: 'villain', x: V.x, y: V.y }; commit(); kick();
    if (V.meet) showParley();
  }
  function villainLine() {
    const V = S.villain; const out = G.villainOnMap(S);
    if (V.state === 'banished') return `Recovering at the Dark Tower: ${V.banish} more day${V.banish > 1 ? 's' : ''}.`;
    if (!out) return 'At the Dark Tower.';
    const meet = G.meetBand(S); if (meet) return `Face to face with the ${esc(G.CREATURES[meet.type].name.toLowerCase())}.`;
    const tgt = V.target && S.objects.find(z => z.id === V.target);
    const nights = V.path && V.path.length ? Math.max(1, Math.ceil(V.path.length / 11)) : 0;
    if (tgt) return `On the way to the ${esc(G.CREATURES[tgt.type].name.toLowerCase())}${nights ? `: about ${nights} night${nights > 1 ? 's' : ''}` : ''}.`;
    if (V.goHome) return `Riding home to the Dark Tower${nights ? `: about ${nights} night${nights > 1 ? 's' : ''}` : ''}.`;
    if (V.path && V.path.length) return `Walking to ${esc(G.regionName(S, V.path[V.path.length - 1][0], V.path[V.path.length - 1][1]))}.`;
    return `Waiting in ${esc(G.regionName(S, V.x, V.y))}.`;
  }
  // an audience with a band of the wilds: fight, pay, or talk
  function parleyHtml(o, result) {
    const C = G.CREATURES[o.type]; const opt = G.parleyOptions(S, o); const ml = monLevel(o) || { L: opt.level, cls: 'even' };
    const pct = p => Math.round(p * 100) + '%';
    const talk = opt.tooHigh ? '' : opt.talk.map(t => `<button class="pbtn" data-act="ptalk" data-k="${t.k}"${t.err ? ` disabled title="${esc(t.err)}"` : ` title="${esc(t.text)} d20 + ${t.bonus} against ${t.dc}."`}><b>${esc(t.name)}</b><small>${t.dc === null ? 'won\'t work' : opt.full ? 'banner full' : t.err && t.err.indexOf('few days') >= 0 ? 'not again yet' : pct(t.p)}</small></button>`).join('');
    const pay = opt.tooHigh ? '' : opt.pay ? `<button class="pbtn" data-act="ppay"${opt.pay.err ? ` disabled title="${esc(opt.pay.err)}"` : ''}><b>Pay</b><small>${opt.full ? 'banner full' : opt.pay.cost + ' gold'}</small></button>` : '<button class="pbtn" disabled title="They have no use for gold."><b>Pay</b><small>no use for gold</small></button>';
    return `<h1 class="dtitle">An audience with the ${esc(C.name.toLowerCase())}</h1>
      <div class="parley"><div class="pl-who">${img('unit-' + o.type, 'port')}<div><h2 class="cap">${o.count} ${esc((o.count > 1 ? C.name : C.one))} <span class="mlv c-${ml.cls}">Level ${ml.L}</span></h2>
        <p>${esc(VN())} is level ${opt.vlevel}. They are ${MLV_TXT[ml.cls]}.</p><p class="hint">${esc(opt.temper)}</p></div></div>
        ${result ? `<p class="pl-result ${result.result}">${esc(result.text || '')}</p>` : ''}
        ${opt.tooHigh ? `<p class="warn">They're too strong to bargain with. They would only fight ${esc(VN())}.</p>` : `<h2 class="cap">Win them over</h2><div class="pl-acts">${talk}${pay}</div>
        ${opt.full ? `<p class="warn">Your banner is full: ${opt.command.n} of ${opt.command.cap} bands already follow ${esc(VN())}. Room for more opens as your recruits fall at Millbrook, and as ${esc(VN())} grows (one more every ${G.CMD_PER || 5} levels).</p>` : ''}
        <p class="hint">Talking is a d20 roll plus ${esc(VN())}'s knack for it, against how hard they are to sway. Fail badly and they attack. Won over, they march on Millbrook. Banner: ${opt.command.n} of ${opt.command.cap}.</p>`}
        <h2 class="cap">Or</h2><div class="pl-acts"><button class="pbtn fight" data-act="pfight"><b>Fight</b><small>${esc(VN())} alone</small></button><button class="pbtn" data-act="pleave"><b>Leave</b><small>for now</small></button></div>
        <p class="hint">Beat them down and they may kneel: they heal for ${G.HEAL_DAYS} days, then march on Millbrook${opt.full ? ' (with your banner full, they buy their lives instead)' : ''}. If they fight to the last, they leave their hoard behind.</p></div>`;
  }
  function showParley(result) {
    const o = G.meetBand(S); if (!o) return;
    centerOn(o.x, o.y);
    modal(parleyHtml(o, result), null, 'wide parley-m');
    // 0.31: your villain opens the audience and the band answers (the mindless and the beasts just stare)
    if (!result) { const said = vsay('parley', { prio: 3, force: true }); msay(o.type, G.parleyOptions(S, o).tooHigh ? 'attack' : 'greet', said ? { queue: true } : { prio: 3 }); }
  }
  function parleyAct(act, k) {
    const band = G.meetBand(S); const type = band && band.type;
    const r = act === 'ptalk' ? G.parleyTalk(S, k) : act === 'ppay' ? G.parleyPay(S) : act === 'pfight' ? (G.startDuel(S) ? { err: 'They are gone.' } : { result: 'fight' }) : (G.parleyLeave(S), { result: 'leave' });
    if (r.err) { toast(r.err, 'bad'); sfx('deny'); return; }
    // what your villain says, and the band's answer
    if (type && act !== 'pleave') {
      const said = vsay(act === 'ptalk' ? k : act === 'ppay' ? 'pay' : 'fight', { prio: 3, force: true });
      const reply = r.result === 'join' ? 'join' : r.result === 'attack' || r.result === 'fight' ? 'attack' : 'refuse';
      msay(type, reply, said ? { queue: true } : { prio: 3 });
    }
    save(true);
    if (r.result === 'join') { sfx(act === 'ppay' ? 'coins' : 'dark'); closeModal(); toast(r.text, 'good'); ui.threat = null; commit(); kick(); return; }
    if (r.result === 'attack' || r.result === 'fight') { closeModal(); if (r.result === 'attack') toast(r.text, 'bad'); enterBattle(); return; }
    if (r.result === 'leave') { closeModal(); commit(); return; }
    sfx('deny'); showParley(r);   // they refused: gold or a fight remain
  }
  function giveOrder(t) {
    const o = orderAt(t); const ms = selMinions(); if (!ms.length || o.kind === 'none') return;
    if (o.kind === 'no') { toast(o.why, 'bad'); return; }
    const tx = o.n ? o.n.x : o.o ? o.o.x : t.x, ty = o.n ? o.n.y : o.o ? o.o.y : t.y;
    const sorted = ms.slice().sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty));
    let ok = 0, err = null; const one = MT().one.toLowerCase();
    for (const m of sorted) {
      let e = null;
      if (o.kind === 'work') { if (m.job && m.job.kind === 'work' && m.job.node === o.n.id) { ok++; continue; } if (ok >= o.room) { e = 'full'; } else e = G.orderWork(S, o.n.id, m.id); }
      else if (o.kind === 'help') e = G.orderHelp(S, o.o.id, m.id);
      else if (o.kind === 'home') e = G.orderHome(S, m.id);
      else e = G.orderMove(S, m.id, t.x, t.y);
      if (e) err = err || e; else ok++;
    }
    if (!ok) { toast(err === 'full' ? 'That site is full.' : err || 'They can\'t do that.', 'bad'); return; }
    const label = { work: o.n ? G.nodeName(o.n) : 'Work', help: 'Build', home: 'Home', move: 'Go' }[o.kind];
    minionAck(sorted[0], o.kind === 'work' ? 'mine' : o.kind === 'help' ? 'build' : 'move');
    sfx('minion-go', { vol: 0.8 }); sfx('minion', { vol: 0.6 });
    ui.floats.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE * 0.3, text: label, color: ORDER_COL[o.kind], t0: performance.now() });
    if (o.kind === 'work' && ok < ms.length) toast(`Only one minion can work the ${G.nodeName(o.n)}. The rest stay where they are.`, 'sys');
    else if (err && err !== 'full') toast(err, 'bad');
    kick(); commit();
  }
  // send the selected minions to the nearest site of a kind that has room
  function workNearest(kind) {
    const ms = selMinions(); if (!ms.length) return;
    let sent = 0, last = null;
    for (const m of ms) {
      if (m.job && m.job.kind === 'work' && (S.nodes.find(n => n.id === m.job.node) || {}).kind === kind) { sent++; continue; }
      // nearest first, but an open mine beats a raw deposit a few tiles closer
      const opts = S.nodes.filter(n => n.kind === kind && hasScouted(n.x, n.y) && !n.dev && !G.nodeRaided(S, n) && G.assignedTo(S, n).length < G.NODE_KINDS[kind].cap).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) + (a.dev ? 0 : 3) - Math.hypot(b.x - m.x, b.y - m.y) - (b.dev ? 0 : 3));
      for (const n of opts) { if (!G.orderWork(S, n.id, m.id)) { sent++; last = n; break; } }
    }
    if (!sent) { toast(`No free ${kind} deposit that you've found and can reach: send a minion or your villain exploring to find more.`, 'bad'); return; }
    if (last) ui.floats.push({ x: last.x * TILE + TILE / 2, y: last.y * TILE + TILE * 0.3, text: G.nodeName(last), color: ORDER_COL.work, t0: performance.now() });
    if (sent < ms.length) toast(`Only ${sent} found a free ${kind} site.`, 'sys');
    minionAck(ms[0], 'mine'); sfx('minion-go', { vol: 0.8 });
    kick(); commit();
  }
  // placing a lair for the selected minions: click open ground; the nearest one builds, the rest help
  function placeAt(t) {
    const P = ui.place; const ms = selMinions(); if (!P) return;
    if (!ms.length) { ui.place = null; renderSide(); drawMap(); return; }
    const sorted = ms.slice().sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
    const err = G.buildCheck(S, P.k, t.x, t.y, sorted[0].id); if (err) { toast(err, 'bad'); return; }
    const e2 = G.orderBuild(S, P.k, t.x, t.y, sorted[0].id); if (e2) { toast(e2, 'bad'); return; } sfx('minion-go'); sfx('coins', { vol: 0.6 });
    const lair = S.objects[S.objects.length - 1]; for (const m of sorted.slice(1)) G.orderHelp(S, lair.id, m.id);
    minionAck(sorted[0], 'build');
    ui.place = null; ui.mbuild = false; ui.finaleEst = null;
    ui.floats.push({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE * 0.3, text: 'Build', color: ORDER_COL.help, t0: performance.now() });
    toast(`${ms.length > 1 ? `${ms.length} ${MT().name.toLowerCase()} set` : `Your ${MT().one.toLowerCase()} sets`} off to build the ${G.DUNGEONS[P.k].name}: ${G.lairDays(S, P.k)} days of work${ms.length > 1 ? ', less with helpers' : ''}.`, 'good');
    kick(); commit();
  }
  // I: jump to the next idle minion (shift: select them all)
  function nextIdle(all) {
    const idle = G.idleMinions(S).filter(m => !m.path.length).concat(G.idleMinions(S).filter(m => m.path.length));
    if (!idle.length) { toast(`No idle ${MT().name.toLowerCase()}.`, 'sys'); return; }
    if (all) { setMinionSel(idle.map(m => m.id)); }
    else { const cur = ui.sel && ui.sel.type === 'minion' ? idle.findIndex(m => m.id === ui.sel.id) : -1; setMinionSel([idle[(cur + 1) % idle.length].id]); }
    const f = selMinions()[0]; minionSay(f, 'select'); centerOn(f.x, f.y); ui.place = null; ui.mbuild = false; ui.scrollTo = 'sel'; renderSide(); drawMap();
  }
  // the selected minions' routes as ground arrows: bright for tonight's walk, dim for later
  function minionRoutes(ms) {
    const arrows = [], colors = []; if (ui.night) return { arrows, colors };
    const mp = G.minionMpOf(S);
    for (const m of ms) {
      let px = m.x, py = m.y, left = mp;
      for (const [x, y] of m.path) { left -= G.stepCost(S, px, py, x, y); arrows.push([px, py, Math.atan2(y - py, x - px)]); colors.push(left >= 0 ? '#ecdcff' : '#9a72cc'); px = x; py = y; }
    }
    return { arrows, colors };
  }
  function minionDays(m) { let c = 0, px = m.x, py = m.y; for (const [a, b] of m.path) { c += G.stepCost(S, px, py, a, b); px = a; py = b; } const mp = G.minionMpOf(S); return Math.max(1, Math.ceil(c / mp - 0.001)); }
  function minionJob(m) {
    const away = m.path.length ? `, ${minionDays(m)} day${minionDays(m) > 1 ? 's' : ''} away` : '';
    if (!m.job) return m.path.length ? `Heading back to the tower${away}.` : 'Idle, waiting for orders.';
    if (m.job.kind === 'work') { const n = S.nodes.find(z => z.id === m.job.node) || { kind: 'gold', x: m.x, y: m.y }; return `${m.path.length ? 'Walking to' : n.dev ? 'Working' : `Will ${G.NODE_KINDS[n.kind].sink} tonight at`} the ${esc(G.nodeName(n))} near ${esc(G.regionName(S, n.x, n.y))}${away}.`; }
    if (m.job.kind === 'build') { const o = S.objects.find(z => z.id === m.job.lair) || { dtype: 'warren' }; return `${m.path.length ? 'Walking to build' : 'Building'} the ${esc(G.DUNGEONS[o.dtype].name)}${away}.`; }
    if (m.job.kind === 'grounds') { const b = G.groundsBuilds(S).find(z => z.id === m.job.b); const B = b && G.GROUNDS[b.k]; const nm = B ? (B.at ? `${B.name} ${G.roman(b.to)}` : `the ${B.name}`) : 'the Grounds'; return `${m.path.length ? 'Walking home to build' : 'Building'} ${esc(nm)} at the Dark Tower${b && !m.path.length ? `: ${b.days} night${b.days > 1 ? 's' : ''} left` : ''}.`; }
    if (m.job.kind === 'move') return `Walking to ${esc(G.regionName(S, m.job.x, m.job.y))}${away}.`;
    return 'Busy.';
  }


  // minions slide along to where they ended the night
  function minionTile(m) {
    const N = ui.night; const w = N && N.mins.get(m.id);
    if (w) { const st = Math.max(0, Math.min(w.len, nightT() / N.spt)); const i = Math.min(w.len - 1, Math.floor(st)), f = st - i; const a = w.pts[i], b = w.pts[i + 1]; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f }; }
    return { x: m.x, y: m.y };
  }
  // a band mid-walk during the night, in tile units
  function bandTile(id) { const N = ui.night; const w = N && N.bands && N.bands.get(id); if (!w) return null; const st = Math.max(0, Math.min(w.len, nightT() / N.spt)); const i = Math.min(w.len - 1, Math.floor(st)), f = st - i; const a = w.pts[i], b = w.pts[i + 1]; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f }; }
  const minionWalking = m => { const N = ui.night; const w = N && N.mins.get(m.id); return !!w && nightT() < w.len * N.spt; };

  /* ============ the night: you watch your minions walk, sites open and lairs rise ============ */
  const nightT = () => ui.night ? Math.max(0, (performance.now() - ui.night.t0) / 1000) : 0;
  const pbar = (f, cls) => `<span class="pgb${cls ? ' ' + cls : ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, f)) * 100)}%"></i></span>`;
  const RES_COL = { gold: '#ffd23a', lumber: '#8ee06a', ore: '#a9cdf2' };
  const nodeYield = n => G.siteYield(S, n);
  // a site that opened tonight still looks like a deposit until its bar fills
  function nodeFill(n) { const N = ui.night; if (!N || !N.opened.has(n.id)) return null; return Math.max(0, Math.min(1, (nightT() - N.opened.get(n.id)) / N.work)); }
  function nodeShownDev(n) { const f = nodeFill(n); return f === null ? !!n.dev : f >= 1; }
  const shownNodeName = n => nodeShownDev(n) ? G.NODE_KINDS[n.kind].name : G.NODE_KINDS[n.kind].raw;
  // 0.35: how full a site you hold looks: it fills a night at a time (the bar creeps up while the night plays), then waits to be collected
  function nodeProg(n) {
    if (!nodeShownDev(n) || G.nodeRaided(S, n)) return null;
    const D = G.nodeDays(n); const N = ui.night; const fl = N && N.fills && N.fills.get(n.id);
    if (fl) { const k = Math.max(0, Math.min(1, nightT() / Math.max(0.4, N.dur * 0.85))); return (fl[0] + (fl[1] - fl[0]) * k) / D; }
    if (N && N.opened.has(n.id)) return 0;
    return Math.min(1, (n.fill || 0) / D);
  }
  const nodeShownFull = n => { const p = nodeProg(n); return p !== null && p >= 1; };
  const nodeLeft = n => Math.max(0, G.nodeDays(n) - (n.fill || 0));
  // click a full site: what it holds goes to the tower and it starts filling again
  function collectAt(n) {
    const r = G.collectNode(S, n.id); if (r.err) { toast(r.err, 'bad'); sfx('deny'); return false; }
    ui.floats.push({ x: n.x * TILE + TILE / 2, y: n.y * TILE + TILE * 0.2, text: `+${r.amt} ${r.res}`, color: RES_COL[n.kind], t0: performance.now() });
    (ui.npop = ui.npop || new Map()).set(n.id, performance.now());
    sfx('coins', { vol: 0.8 }); kick(); commit(); return true;
  }
  // the next full site, for the action bar's button and its key
  function nextFull() {
    const list = G.fullNodes(S).filter(n => hasSeen(n.x, n.y)); if (!list.length) return null;
    ui.fullIx = ((ui.fullIx || 0) + 1) % list.length; return list[ui.fullIx];
  }
  // the bar over a site: filling tonight, or empty while a minion is on its way to open it
  function nodeBar(n) { const f = nodeFill(n); if (f !== null) return f < 1 ? f : null; return !n.dev && G.assignedTo(S, n).length ? 0 : null; }
  function lairShownBuilding(o) { const L = ui.night && ui.night.lairs.get(o.id); if (!L) return o.building || 0; const f = Math.max(0, Math.min(1, (nightT() - L.t0) / ui.night.work)); return f >= 1 ? L.to : L.from + (L.to - L.from) * f; }
  function lairBar(o) { if (!o.mine) return null; const b = lairShownBuilding(o); if (!b) return null; const tot = o.buildTotal || G.buildDays(o.dtype); return Math.max(0, Math.min(1, 1 - b / tot)); }
  // before the engine runs the night: where everyone stands and what's half-built
  function nightBefore() {
    return { mins: new Map((S.minions || []).map(m => [m.id, { x: m.x, y: m.y, path: m.path.map(p => p.slice()) }])), lairs: new Map(G.myLairs(S).filter(o => o.building).map(o => [o.id, o.building])), seen0: (S.dmSeen || []).slice(), far0: (S.dmFar || S.dmSeen || []).slice() };
  }
  // after it: who walked where, which sites opened, which lairs went up
  function nightPlan(pre) {
    const d = S.lastDay || {}; const mins = new Map(); let maxLen = 0;
    for (const m of S.minions || []) {
      const p = pre.mins.get(m.id); if (!p) continue;
      const steps = p.path.length - m.path.length; let pts = [[p.x, p.y]].concat(steps > 0 ? p.path.slice(0, steps) : []);
      const last = pts[pts.length - 1]; if (last[0] !== m.x || last[1] !== m.y) pts = [[p.x, p.y], [m.x, m.y]];
      const len = pts.length - 1; if (len > 0 && (len > 1 || last[0] !== p.x || last[1] !== p.y)) { mins.set(m.id, { pts, len }); maxLen = Math.max(maxLen, len); }
    }
    // bands on patrol or prowling: animate the ones you could see along the way
    const bands = new Map(); const vis0 = G.dmVisible(S);
    for (const o of S.objects) if (o.kind === 'stack' && o.trail && o.trail.length > 1) { bands.set(o.id, { pts: o.trail, len: o.trail.length - 1 }); maxLen = Math.max(maxLen, o.trail.length - 1); }
    { const V = S.villain; if (V && V.trail && V.trail.length > 1) { bands.set('villain', { pts: V.trail, len: V.trail.length - 1 }); maxLen = Math.max(maxLen, V.trail.length - 1); } }   // 0.31: your villain on the road
    const sp = ui.fast ? 0.55 : 1; const spt = Math.min(0.28, 3.4 / Math.max(1, maxLen)) * sp; const work = 1.0 * sp;
    const arrive = id => { const w = mins.get(id); return w ? w.len * spt : 0; };
    const opened = new Map(); for (const id of d.opened || []) { const n = S.nodes.find(z => z.id === id); if (!n) continue; const m = G.workersAt(S, n)[0]; opened.set(id, m ? arrive(m.id) : 0); }
    const fills = new Map((d.fills || []).map(([id, a, b]) => [id, [a, b]]));
    const lairs = new Map();
    for (const [id, before] of pre.lairs) {
      const o = S.objects.find(z => z.id === id); if (!o || (o.building || 0) === before) continue;
      const bs = S.minions.filter(m => m.x === o.x && m.y === o.y);
      lairs.set(id, { from: before, to: o.building || 0, t0: bs.length ? Math.min(...bs.map(m => arrive(m.id))) : 0 });
    }
    if (!mins.size && !opened.size && !lairs.size && !bands.size && !fills.size) return null;
    const noCam = !mins.size && !opened.size && !lairs.size && !bands.size;   // only bars filling: no need to fly anywhere
    let end = Math.max(maxLen * spt, fills.size ? work : 0); for (const t of opened.values()) end = Math.max(end, t + work); for (const L of lairs.values()) end = Math.max(end, L.t0 + work);
    // the box to keep in view: every walk, every site that opened, every lair that rose
    const xs = [], ys = []; for (const w of mins.values()) for (const [x, y] of w.pts) { xs.push(x); ys.push(y); }
    for (const id of opened.keys()) { const n = S.nodes.find(z => z.id === id); xs.push(n.x); ys.push(n.y); }
    for (const id of lairs.keys()) { const o = S.objects.find(z => z.id === id); xs.push(o.x); ys.push(o.y); }
    for (const [id, w] of bands) { const [x, y] = w.pts[w.pts.length - 1]; if (vis0[y * G.MW + x] || pre.seen0[y * G.MW + x]) for (const [a, b] of w.pts) { xs.push(a); ys.push(b); } }
    if (!xs.length) { const tw = G.siteOf(S, 'tower'); xs.push(tw.x); ys.push(tw.y); }   // 0.31: not the heroes: they may be in the fog
    return { t0: performance.now(), mins, bands, seen0: pre.seen0, far0: pre.far0, spt, work, opened, lairs, fills, noCam, dur: end + 0.4 * sp, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], filled: d.filled || [] };
  }
  // glide out to watch, then back to where you were looking
  function nightCamera(N) {
    if (N.noCam) return 0;
    const [x0, y0, x1, y1] = N.box; const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    if (ui.r3d) { if (pts.every(([x, y]) => W3.inView(x, y, 0.1))) return 0; N.cam = W3.camState(); W3.frameTiles(x0, y0, x1, y1); return 0.55; }
    const inside = ([x, y]) => x * TILE >= ui.cam.x && (x + 1) * TILE <= ui.cam.x + ui.vw && y * TILE >= ui.cam.y && (y + 1) * TILE <= ui.cam.y + ui.vh;
    if (pts.every(inside)) return 0;
    N.cam2 = { x: ui.cam.x, y: ui.cam.y }; centerOn((x0 + x1) / 2, (y0 + y1) / 2); return 0.15;
  }
  function startNight(N, done) {
    const lead = nightCamera(N); N.t0 = performance.now() + lead * 1000; ui.night = N; kick();
    sfx('night', { vol: 0.8 }); syncAudio();
    if (N.lairs && N.lairs.size) sfx('build', { delay: lead + N.dur * 0.35, vol: 0.8 });
    setTimeout(() => {
      // 0.35: the sites that filled tonight say so as the sun rises
      for (const id of N.filled) { const n = S.nodes.find(z => z.id === id); if (n && hasSeen(n.x, n.y)) ui.floats.push({ x: n.x * TILE + TILE / 2, y: n.y * TILE + TILE * 0.2, text: 'Full!', color: RES_COL[n.kind], t0: performance.now() }); }
      // 0.30: what the night's sieges did to Millbrook, floating up over the town
      { const tw = G.siteOf(S, 'town'); let dy = 0;
        for (const r of (S.lastDay && S.lastDay.sieges) || []) { ui.floats.push({ x: tw.x * TILE + TILE / 2, y: tw.y * TILE + TILE * (0.1 - dy), text: r.hallDmg ? `Sacked! Hall −${r.hallDmg}` : r.wallDmg ? `Walls −${r.wallDmg}` : 'Repelled', color: r.hallDmg ? '#ff7a4a' : r.wallDmg ? '#ffb27a' : '#c8c8c8', t0: performance.now() }); dy += 0.35; } }
      if (!N.keepCam) { if (N.cam) W3.camTo(N.cam); if (N.cam2) { ui.cam.x = N.cam2.x; ui.cam.y = N.cam2.y; clampCam(); } }
      ui.night = null; kick(); syncAudio(); if (N.filled && N.filled.length) sfx('chime', { vol: 0.6 }); done();
    }, lead * 1000 + N.dur * 1000);
  }
  // several minions on one tile stand in a little ring
  function minionSpots() {
    const groups = new Map(); const out = new Map();
    for (const m of S.minions || []) { const k = m.x + ',' + m.y; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
    for (const list of groups.values()) list.forEach((m, i) => { const n = list.length; const busy = G.nodeAt(S, m.x, m.y) || G.objAt(S, m.x, m.y); const r = busy ? 0.38 : n > 1 ? 0.2 : 0; const a = i / Math.max(1, n) * Math.PI * 2 + 0.6; out.set(m.id, { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.7 }); });
    return out;
  }

  function status() { }

  /* ============ animation loop ============ */
  let rafOn = false;
  function kick() { if (!rafOn) { rafOn = true; requestAnimationFrame(frame); } }
  function frame() {
    rafOn = false;
    if (!S || !ui.active) return;
    if (S.phase === 'battle') { drawBattle(); if (ui.playing || ui.floats.length || ui.fx.length || S.battle) kick(); return; }
    drawMap();
    if (ui.anim || ui.manim || ui.floats.length || G.villainOnMap(S) || ui.night) kick();
    else if (!ui.r3d && S.phase === 'map' && !ui.slowT && (S.nodes || []).some(n => n.dev && !G.nodeRaided(S, n))) ui.slowT = setTimeout(() => { ui.slowT = 0; kick(); }, 90);
  }
  // the party's footsteps: the sound of the ground they're on, for as long as they keep walking
  const STEPS = { grass: 'steps-grass', forest: 'steps-forest', snow: 'steps-snow', swamp: 'steps-swamp', water: 'steps-swamp' };
  function partySteps(to, dur) {
    if (!window.SND) return;
    const road = G.mapOf(S).road[to.y * G.MW + to.x]; const k = road ? 'steps-road' : STEPS[G.terrainAt(S, to.x, to.y)] || 'steps-road';
    SND.steps(SND.has(k) ? k : 'steps-road');
    clearTimeout(ui.stepT); ui.stepT = setTimeout(() => SND.steps(null), dur + 260);
  }
  function animateParty(from, to, done) {
    // 0.31: out of your sight the heroes walk unseen: no animation, no footsteps, and the camera stays put
    const shown = canSee(to.x, to.y) || canSee(from.x, from.y);
    const dur = reduced || !shown ? 1 : ui.fast ? 70 : 150;
    ui.anim = { from, to, t0: performance.now(), dur }; if (shown) partySteps(to, dur);
    const px = to.x * TILE, py = to.y * TILE; const m = TILE * 3;
    if (!shown) { /* nothing to follow */ }
    else if (ui.r3d) W3.ensureVisible(to.x, to.y);
    else if (px - ui.cam.x < m || px - ui.cam.x > ui.vw - m || py - ui.cam.y < m || py - ui.cam.y > ui.vh - m) centerOn(to.x, to.y);
    kick();
    setTimeout(() => { ui.anim = null; done(); }, dur);
  }

  /* ============ day flow ============ */
  /* ============ sound: which music and ambience fit the moment, and a sound for each event ============ */
  function syncAudio() {
    if (!window.SND) return;
    if (!S || !ui.active) return;
    const b = S.phase === 'battle' && S.battle;
    const over = S.phase === 'over';
    SND.music(over ? (S.result === 'razed' || S.result === 'wiped' ? 'music-victory' : 'music-defeat') : b ? (b.finale || b.boss ? 'music-finale' : 'music-battle') : ui.screen === 'tower' ? 'music-tower' : ui.screen === 'town' && SND.has('music-town') ? 'music-town' : 'music-map');
    SND.amb(over || b ? null : ui.screen === 'tower' ? 'amb-tower' : ui.night ? 'amb-night' : 'amb-day');
  }
  /* ============ the heroes talk: a portrait pops up and says a line, voiced and lip-synced when it's been recorded ============ */
  // 0.31: so do your villain and the monsters of the wilds. A speaker is { key (voice and mouth shapes in the manifest),
  // id, name, lines, port() (the portrait to fall back on), kind: hero | villain | monster }
  const VO = { last: -1e9, cat: {}, cur: null, said: {}, queue: [], pick: {} };
  const LINES = () => window.HERO_LINES || {};
  const HLINES = () => LINES().heroes || {};
  const VO_PRIORITY = { boss: 3, win: 3, dying: 3, march: 2, down: 2, hired: 2, walls: 2 };
  const VO_GAP = { explore: 70000, rest: 120000, town: 45000, start: 20000, danger: 20000, hard: 25000, easy: 25000, down: 12000, levelup: 8000, loot: 8000, march: 3e9, boss: 3e9, win: 3e9,
    walls: 30000, wave: 40000, lair: 40000, villain: 120000, dying: 0, hired: 0,
    'v:ride': 60000, 'v:spotted': 120000, 'v:lair': 45000, 'v:wave': 60000, 'v:breach': 45000, 'v:kill': 12000, 'v:levelup': 0, 'v:march': 3e9, 'v:intro': 3e9,
    'v:select': 5000, 'v:repelled': 60000, 'v:talent': 15000, 'v:summon': 20000, 'v:lairlost': 30000, 'v:minelost': 45000, 'v:bounty': 60000, 'v:heroesgrow': 90000, 'v:newparty': 0, 'v:dawn': 150000 };
  const portImg = key => { if (!key) return null; if (A.IMG[key]) return A.IMG[key]; const u = A.URI[key]; if (!u) return null; const im = new Image(); im.src = u; A.IMG[key] = im; return im; };
  function heroSpeaker(h) {
    const H = HLINES()[h && h.rid]; if (!H) return null;
    return { key: h.rid, id: h.id, name: shortName(h.name), lines: H.lines, port: () => A.IMG[A.ensureHero(h)], kind: 'hero' };
  }
  function villainSpeaker() {
    const t = S && S.villain && S.villain.type; const V = (LINES().villains || {})[t]; if (!V) return null;
    return { key: V.key || 'villain-' + t, id: 'villain', name: VN(), lines: V.lines, port: () => portImg(vIcon()), kind: 'villain' };
  }
  function monsterSpeaker(type) {
    const M = (LINES().monsters || {})[type]; if (!M) return null; const C = G.CREATURES[type] || {};
    return { key: type, id: 'm-' + type, name: M.name || C.one || type, lines: M.lines, port: () => portImg('unit-' + type), kind: 'monster' };
  }
  // a hero says something: the one the moment is about, or whoever has been quiet longest
  // cat: start, danger, hard, easy, down, rest, explore, levelup, loot, town, march, boss, win; 0.31: walls, wave, lair, villain, dying, hired
  function bark(cat, who, o) {
    o = o || {};
    if (!S || !ui.active || ui.chatter === false) return false;
    const H = HLINES();
    let h = who && (who.status !== 'dead' || cat === 'dying') && H[who.rid] ? who : null;
    if (!h) {
      const live = S.heroes.filter(x => x.status === 'ok' && H[x.rid]); if (!live.length) return false;
      h = live.map(x => [x, (VO.said[x.id] || 0) + Math.random() * 30000]).sort((a, b) => a[1] - b[1])[0][0];
    }
    const key = cat === 'explore' ? (Math.random() < 0.5 ? 'explore1' : 'explore2') : cat;
    return speak(heroSpeaker(h), key, Object.assign({ gapKey: cat }, o));
  }
  // your villain says something (vsay) or the band you're parleying with (msay)
  const vsay = (cat, o) => speak(villainSpeaker(), cat, Object.assign({ gapKey: 'v:' + cat }, o));
  const msay = (type, cat, o) => speak(monsterSpeaker(type), cat, Object.assign({ gapKey: 'm:' + cat, force: true }, o));
  // o: force (skip the waits), queue (wait for the line that's playing, then speak), prio (interrupt a lower one)
  // 0.33: a category can have variants (cat, cat2, cat3...): pick one, never the one said last time
  function pickLine(sp, key) {
    const L = sp.lines || {}; const vs = Object.keys(L).filter(k => k === key || (k.indexOf(key) === 0 && /^\d+$/.test(k.slice(key.length))));
    if (!vs.length) return null; if (vs.length === 1) return vs[0];
    const last = VO.pick[sp.key + ':' + key]; const pool = vs.filter(k => k !== last);
    const k = pool[Math.floor(Math.random() * pool.length)]; VO.pick[sp.key + ':' + key] = k; return k;
  }
  function speak(sp, key, o) {
    o = o || {};
    if (!sp || !S || !ui.active || ui.chatter === false) return false;
    const gk0 = o.gapKey || key; key = pickLine(sp, key); if (!key) return false; o = Object.assign({}, o, { gapKey: gk0 });
    const text = sp.lines && sp.lines[key]; if (!text) return false;
    const gk = o.gapKey || key; const now = performance.now();
    const pr = o.prio !== undefined ? o.prio : VO_PRIORITY[gk] || (sp.kind === 'hero' ? 0 : 1);
    if (VO.cur && o.queue) { if (VO.queue.length < 3) VO.queue.push({ sp, key, text, o }); return true; }
    if (VO.cur && pr < 2 && !(VO.cur.ending)) return false;
    if (!o.force && !pr && now - VO.last < (S.phase === 'battle' ? 4000 : 9000)) return false;
    if (!o.force && VO.cat[gk] && now - VO.cat[gk] < (VO_GAP[gk] !== undefined ? VO_GAP[gk] : 10000)) return false;
    VO.last = now; VO.cat[gk] = now; VO.said[sp.id] = now;
    showBark(sp, key, text); return true;
  }
  function barkEl() {
    let el = $('bark'); if (el) return el;
    el = document.createElement('div'); el.id = 'bark'; el.className = 'bark'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="bkport"><canvas width="128" height="128"></canvas></div><div class="bkbody"><b class="bkname"></b><p class="bktext"></p></div>';
    document.body.appendChild(el); return el;
  }
  // top-left of whatever's showing, map or battlefield
  function placeBark() {
    const el = $('bark'); if (!el || el.hidden) return;
    const area = S && S.phase === 'battle' && !$('battle').hidden ? $('bfield') : $('mapwrap');
    const r = area ? area.getBoundingClientRect() : { left: 20, top: 20 };
    el.style.left = Math.round(r.left + 26) + 'px'; el.style.top = Math.round(r.top + 26) + 'px';
  }
  function showBark(sp, key, text) {
    const el = barkEl(); const V = ART.voice && ART.voice[sp.key] && ART.voice[sp.key][key]; const T = ART.talk && ART.talk[sp.key];
    if (VO.cur && VO.cur.stop) VO.cur.stop();
    // the mouth shapes: one strip per speaker (0.20.1), or one file each (older art)
    if (T && !T.imgs) { if (T.strip) { const im = new Image(); im.src = 'art/' + T.strip; T.imgs = [im]; } else T.imgs = (T.frames || []).map(f => { const im = new Image(); im.src = 'art/' + f; return im; }); }
    el.querySelector('.bkname').textContent = sp.name;
    el.querySelector('.bktext').textContent = text;
    el.classList.remove('k-hero', 'k-villain', 'k-monster'); el.classList.add('k-' + sp.kind);
    el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in'); placeBark();
    const cv = el.querySelector('canvas'); const c = cv.getContext('2d');
    const portrait = sp.port();
    const cur = VO.cur = { sp, t0: performance.now(), dur: V ? V.dur : Math.max(2.2, text.length * 0.065), sync: V && V.sync, play: null, stop: null, ending: false };
    const draw = () => {
      if (VO.cur !== cur) return;
      const t = cur.play ? cur.play.now() : (performance.now() - cur.t0) / 1000;
      c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
      const talking = t >= 0 && t < cur.dur;
      let im = null;
      let fw = 0, fx = 0;
      if (T && T.imgs && T.imgs.length) {
        const nf = T.strip ? T.n || 7 : T.imgs.length;
        let idx = T.rest || 0;
        if (talking && cur.sync && cur.play) { for (const [i, until] of cur.sync) if (t < until) { idx = i; break; } }
        else if (talking && !cur.sync) idx = [T.rest || 0, 1, 2, 1][Math.floor(t * 8) % 4] % nf; // no plan: a simple flap
        im = T.strip ? T.imgs[0] : T.imgs[idx]; if (!im || !im.complete || !im.naturalWidth) im = null;
        if (im && T.strip) { fw = im.naturalWidth / nf; fx = Math.min(nf - 1, idx) * fw; }
      }
      if (im && fw) c.drawImage(im, fx, 0, fw, im.naturalHeight, 0, 0, cv.width, cv.height);
      else if (im) c.drawImage(im, 0, 0, cv.width, cv.height);
      else if (portrait && (portrait.naturalWidth || (portrait.width && portrait.complete !== false))) { const bob = talking ? Math.abs(Math.sin(t * 10)) * 4 : 0; c.drawImage(portrait, 0, 4 - bob, cv.width, cv.height); }
      el.classList.toggle('talking', talking);
      // a reply waits for the line before it: it starts a moment after this one ends, not after the pop-up fades
      if (!talking && t >= cur.dur) cur.ending = true;
      if (cur.ending && VO.queue.length && t >= cur.dur + 0.25) { const n = VO.queue.shift(); VO.cur = null; VO.last = performance.now(); VO.cat[n.o.gapKey || n.key] = VO.last; VO.said[n.sp.id] = VO.last; showBark(n.sp, n.key, n.text); return; }
      if (t < cur.dur + 1.8) requestAnimationFrame(draw); else hideBark(cur);
    };
    if (V && window.SND) SND.voice('voice/' + V.file.replace(/^voice\//, ''), V.at, V.dur).then(p => { if (VO.cur === cur && p) { cur.play = p; cur.dur = p.dur; cur.stop = p.stop; } else if (p && p.stop) p.stop(); });
    requestAnimationFrame(draw);
  }
  addEventListener('resize', () => placeBark());
  function hideBark(cur) {
    if (VO.cur !== cur) return; VO.cur = null;
    if (VO.queue.length) { const n = VO.queue.shift(); showBark(n.sp, n.key, n.text); return; }
    const el = $('bark'); if (!el) return;
    el.classList.remove('in'); el.classList.add('out'); setTimeout(() => { if (!VO.cur) el.hidden = true; }, 350);
  }
  // 0.31: moments to speak that nothing else announces: the heroes stepping out of the fog (your villain notices, or you
  // overhear them), the heroes catching sight of your villain, and a new party taking up the sword at the tavern
  function voiceWatch() {
    if (!S || S.title || S.phase !== 'map' || ui.modal) return;
    const w = ui.vwatch || (ui.vwatch = { shown: partyShown(), wipes: S.wipes || 0, hidden: 0 });
    if ((S.wipes || 0) > w.wipes) { w.wipes = S.wipes || 0; const h = S.heroes.find(x => x.status === 'ok'); if (h) setTimeout(() => { if (bark('hired', h, { force: true })) vsay('newparty', { queue: true }); else vsay('newparty'); }, 900); return; }
    // 0.33: what the heroes did to you today: a lair or a mine wrecked, a bounty posted
    { const wl = G.myLairs(S).filter(o => G.lairWrecked(S, o)).length, wm = (S.nodes || []).filter(n => n.dev && G.nodeRaided(S, n)).length, nq = (S.quests || []).filter(q => q.status === 'open').length;
      if (w.wl !== undefined && wl > w.wl) vsay('lairlost'); else if (w.wm !== undefined && wm > w.wm) vsay('minelost'); else if (w.nq !== undefined && nq > w.nq) vsay('bounty');
      w.wl = wl; w.wm = wm; w.nq = nq; }
    const shown = partyShown(); const day = G.dayIndex(S);
    if (!shown && w.shown) w.hidden = day;
    if (shown && !w.shown && day > w.hidden) {
      if (Math.random() < 0.55 && vsay('spotted')) bark('explore', null, { queue: true, force: true });
      else bark('explore', null, { force: true });
    }
    w.shown = shown;
    if (shown && G.villainOnMap(S) && Math.hypot(S.villain.x - S.party.x, S.villain.y - S.party.y) <= G.sightRadius(S) + 1) bark('villain');
  }
  // 0.33: minions talk in a bubble over their heads (voiced when recorded), the way units answer in a strategy game
  function minionSay(m, cat) {
    if (!m || !S || !ui.active || ui.chatter === false) return false;
    const look = MT().look; const M = (LINES().minions || {})[look]; if (!M) return false;
    const sp = { key: M.key || 'minion-' + look, lines: M.lines };
    const now = performance.now(); ui.msay = ui.msay || new Map();
    if (cat === 'select' && now - (VO.cat['m:select'] || 0) < 2500) return false;
    const key = pickLine(sp, cat); if (!key) return false; VO.cat['m:' + cat] = now;
    const V = ART.voice && ART.voice[sp.key] && ART.voice[sp.key][key];
    const dur = V ? V.dur : Math.max(1.4, M.lines[key].length * 0.06);
    for (const [id, b] of ui.msay) if (b.voice && b.voice.stop) b.voice.stop();
    ui.msay.clear(); const b = { text: M.lines[key], until: now + dur * 1000 + 900 }; ui.msay.set(m.id, b);
    if (V && window.SND) SND.voice('voice/' + V.file.replace(/^voice\//, ''), V.at, V.dur).then(p => { if (ui.msay.get(m.id) === b && p) b.voice = p; else if (p && p.stop) p.stop(); });
    minionTalk(m, b, sp, V, dur); kick(); return true;
  }
  // 0.39: while a minion you've selected speaks, its portrait in the action bar moves its mouth (when it has a talking portrait)
  function abTalkCv() { if (!ui.abTalk) { const c = document.createElement('canvas'); c.className = 'abtalk'; c.width = 256; c.height = 256; c.setAttribute('aria-hidden', 'true'); ui.abTalk = c; } return ui.abTalk; }
  function minionTalk(m, b, sp, V, dur) {
    const T = ART.talk && ART.talk[sp.key]; if (!T || !T.strip) return;
    if (!T.imgs) { const im = new Image(); im.src = 'art/' + T.strip; T.imgs = [im]; }
    const t0 = performance.now();
    const step = () => {
      const cv = abTalkCv(); const live = ui.msay && ui.msay.get(m.id) === b && performance.now() < b.until;
      const shown = live && cv.isConnected && selMinions().some(z => z.id === m.id);
      if (live || ui.abTalkFor === b) { cv.classList.toggle('on', !!shown); ui.abTalkFor = b; }
      if (!live) return;
      if (shown) {
        const im = T.imgs[0]; const nf = T.n || 7;
        if (im.complete && im.naturalWidth) {
          const t = b.voice && b.voice.now ? b.voice.now() : (performance.now() - t0) / 1000; const talking = t >= 0 && t < dur;
          let idx = T.rest || 0;
          if (talking && V && V.sync && b.voice) { for (const [i, until] of V.sync) if (t < until) { idx = i; break; } }
          else if (talking) idx = [T.rest || 0, 1, 2, 1][Math.floor(t * 8) % 4] % nf;
          const fw = im.naturalWidth / nf; tokenDraw(cv.getContext('2d'), cv.width, im, Math.min(nf - 1, idx) * fw, 0, fw, im.naturalHeight);   // framed like its portrait
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  /* ============ 0.36: relics: what your villain finds on the map, carries and wears ============ */
  const TIER_NAME = ['', 'Lesser relic', 'Greater relic', 'Legendary relic'];
  const TIER_COL = ['', ['#c9b08a', '#8fb4e0'], ['#b9a8d8', '#b07aff'], ['#ffd56a', '#ff9a3a']];
  // a small pixel-style picture for each kind of relic, in its tier's colours (metal, then the stone or glow)
  function relicSvg(kind, tier, cursed) {
    const [m, g] = cursed ? ['#8a8a8a', '#e04848'] : TIER_COL[tier] || TIER_COL[1]; const o = '#140c04';
    const P = {
      crown: `<path d="M4 18V9l4 3 4-6 4 6 4-3v9z" fill="${m}" stroke="${o}" stroke-width="1.2" stroke-linejoin="round"/><rect x="4" y="16" width="16" height="3" fill="${m}" stroke="${o}" stroke-width="1"/><circle cx="12" cy="13" r="1.6" fill="${g}"/>`,
      jar: `<path d="M8 6h8v3l2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8l2-2z" fill="${m}" stroke="${o}" stroke-width="1.2"/><path d="M9 14c2-2 4 2 6 0" stroke="${g}" stroke-width="2" fill="none"/><rect x="7" y="4" width="10" height="2" fill="${o}"/>`,
      boots: `<path d="M6 4h5v9l5 3v4H6z" fill="${m}" stroke="${o}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 17h10" stroke="${g}" stroke-width="1.6"/>`,
      eye: `<path d="M3 12c4-6 14-6 18 0-4 6-14 6-18 0z" fill="${m}" stroke="${o}" stroke-width="1.2"/><circle cx="12" cy="12" r="3.2" fill="${g}" stroke="${o}"/><circle cx="12" cy="12" r="1.2" fill="${o}"/>`,
      horn: `<path d="M4 9c6-1 11 2 15 9-3 1-6-1-8-4-2-2-5-3-7-2z" fill="${m}" stroke="${o}" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 9v4" stroke="${g}" stroke-width="2"/>`,
      idol: `<path d="M9 20h6l-1-5 2-2-1-5a3 3 0 0 0-6 0l-1 5 2 2z" fill="${m}" stroke="${o}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="8" r="1.1" fill="${g}"/><rect x="7" y="19" width="10" height="2" fill="${o}"/>`,
      pick: `<path d="M6 19l9-9" stroke="${o}" stroke-width="3.4"/><path d="M6 19l9-9" stroke="#a8743a" stroke-width="1.8"/><path d="M7 7c4-4 9-4 12 0-3-1-6-1-9 2z" fill="${m}" stroke="${o}" stroke-width="1.1"/><circle cx="15" cy="7" r="1" fill="${g}"/>`,
      book: `<path d="M5 5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z" fill="${m}" stroke="${o}" stroke-width="1.2"/><path d="M8 9h7M8 12h7M8 15h5" stroke="${o}" stroke-width="1"/><circle cx="16" cy="18" r="1.3" fill="${g}"/>`,
      mask: `<path d="M5 6h14v6a7 7 0 0 1-14 0z" fill="${m}" stroke="${o}" stroke-width="1.2"/><path d="M8 10h3M13 10h3" stroke="${o}" stroke-width="1.8"/><path d="M9 15c2 1.5 4 1.5 6 0" stroke="${g}" stroke-width="1.6" fill="none"/>`,
      hourglass: `<path d="M7 4h10M7 20h10" stroke="${o}" stroke-width="2"/><path d="M8 4c0 5 8 5 8 8s-8 3-8 8h8c0-5-8-5-8-8s8-3 8-8z" fill="${m}" stroke="${o}" stroke-width="1.1"/><path d="M10 18h4l-2-3z" fill="${g}"/>`,
      banner: `<path d="M6 3v18" stroke="${o}" stroke-width="2"/><path d="M7 4h11l-3 4 3 4H7z" fill="${m}" stroke="${o}" stroke-width="1.1" stroke-linejoin="round"/><circle cx="11" cy="8" r="1.5" fill="${g}"/>`,
      bell: `<path d="M7 16c1-2 1-5 1-7a4 4 0 0 1 8 0c0 2 0 5 1 7z" fill="${m}" stroke="${o}" stroke-width="1.2"/><rect x="5" y="16" width="14" height="2" fill="${o}"/><circle cx="12" cy="19.5" r="1.4" fill="${g}"/>`,
      chalice: `<path d="M6 5h12c0 5-2 8-6 8s-6-3-6-8z" fill="${m}" stroke="${o}" stroke-width="1.2"/><path d="M12 13v5M8 20h8" stroke="${o}" stroke-width="1.8"/><path d="M8 7h8" stroke="${g}" stroke-width="2"/>`,
      ring: `<circle cx="12" cy="14" r="5.5" fill="none" stroke="${o}" stroke-width="3.4"/><circle cx="12" cy="14" r="5.5" fill="none" stroke="${m}" stroke-width="1.8"/><path d="M9 7l3-4 3 4-3 2z" fill="${g}" stroke="${o}" stroke-width="1"/>`,
      cloak: `<path d="M9 4h6l4 16H5z" fill="${m}" stroke="${o}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 4v16" stroke="${o}" stroke-width="1"/><circle cx="12" cy="6" r="1.4" fill="${g}"/>`,
      sword: `<path d="M12 2l2 3v10h-4V5z" fill="${m}" stroke="${o}" stroke-width="1.1"/><path d="M7 15h10" stroke="${o}" stroke-width="2.4"/><path d="M12 16v5" stroke="#6a4422" stroke-width="2"/><path d="M12 5v9" stroke="${g}" stroke-width="1"/>`,
      orb: `<circle cx="12" cy="11" r="6.5" fill="${g}" stroke="${o}" stroke-width="1.2"/><circle cx="10" cy="9" r="2" fill="#ffffff66"/><path d="M8 18h8l-1 3H9z" fill="${m}" stroke="${o}" stroke-width="1"/>`,
      gem: `<path d="M7 9l5-5 5 5-5 11z" fill="${g}" stroke="${o}" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 9h10M12 4v16" stroke="${m}" stroke-width="1"/>`,
      mirror: `<ellipse cx="12" cy="10" rx="5.5" ry="6.5" fill="${g}" stroke="${o}" stroke-width="1.2"/><ellipse cx="12" cy="10" rx="3.8" ry="4.8" fill="#d8e4f0" opacity=".55"/><path d="M12 16v5" stroke="${m}" stroke-width="2.4"/>`
    };
    return `<svg class="rsvg" viewBox="0 0 24 24" aria-hidden="true">${P[kind] || P.gem}</svg>`;
  }
  const relicIcon = id => { const R = G.RELICS[id]; return R ? relicSvg(R.icon, R.tier, R.cursed) : ''; };
  // what an effect does, in words (relics and talents speak the same language)
  function fxText(F) {
    const out = []; const pct = v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`; const n = v => `${v > 0 ? '+' : ''}${v}`;
    if (F.villain) { if (F.villain.hp) out.push(`${pct(F.villain.hp)} health for ${VN()}`); if (F.villain.hit) out.push(`${n(F.villain.hit)} to hit for ${VN()}`); }
    if (F.duel) { const d = []; if (F.duel.hp) d.push(`${pct(F.duel.hp)} health`); if (F.duel.hit) d.push(`${n(F.duel.hit)} to hit`); if (d.length) out.push(`${d.join(' and ')} in duels`); }
    if (F.vheal) out.push(`${VN()} heals ${pct(F.vheal)} more of ${VP().his} health each night`);
    if (F.social) out.push(`${n(F.social)} to Intimidate, Persuade and Deceive`);
    if (F.stride) out.push(`${pct(F.stride)} walking distance for ${VN()}`);
    if (F.sight) out.push(`${n(F.sight)} sight for your servants`);
    if (F.banner) out.push(`${n(F.banner)} band${Math.abs(F.banner) > 1 ? 's' : ''} in your banner`);
    if (F.recruitLv) out.push(`recruits join ${F.recruitLv} level${F.recruitLv > 1 ? 's' : ''} higher`);
    if (F.kneel) out.push(`beaten bands kneel ${pct(F.kneel)} more often`);
    if (F.loot) out.push(`${pct(F.loot)} loot from bands you beat`);
    if (F.payCost) out.push(`bands cost ${Math.round(F.payCost * 100)}% less to pay`);
    if (F.nightly && F.nightly.gold) out.push(`${n(F.nightly.gold)} gold every night`);
    if (F.yield) { const y = Object.keys(F.yield).filter(k => F.yield[k]); if (y.length) out.push(`mines and camps make ${n(F.yield[y[0]])} ${y.length === 3 ? 'of everything' : y.join(' and ')} a night`); }
    if (F.fill) out.push(`mines and camps fill ${F.fill} night${F.fill > 1 ? 's' : ''} sooner`);
    if (F.rate) out.push(`${pct(F.rate.pct)} breeding in ${F.rate.all ? 'every lair' : 'some lairs'}`);
    if (F.mod) { const d = []; if (F.mod.hp) d.push(`${pct(F.mod.hp)} health`); if (F.mod.ac) d.push(`${n(F.mod.ac)} armour`); if (F.mod.hit) d.push(`${n(F.mod.hit)} to hit`); if (F.mod.dmg) d.push(`${n(F.mod.dmg)} damage`); if (d.length) out.push(`${d.join(', ')} for ${F.mod.units === 'all' ? 'all your monsters' : 'some of your monsters'}`); }
    if (F.waveSize) out.push(`${pct(F.waveSize)} bigger waves`);
    if (F.wallDmg) out.push(`${pct(F.wallDmg)} damage to Millbrook's walls`);
    if (F.hallDmg) out.push(`${pct(F.hallDmg)} damage to its hall`);
    if (F.infamy) out.push(`${pct(F.infamy)} Infamy`);
    return out;
  }
  // the relics worn, as a strip of little pictures on the villain's sidebar card
  const relicStrip = () => { const R = G.relicsOf(S); return R.worn.length ? `<small class="vrel" title="Relics worn: ${esc(R.worn.map(k => G.RELICS[k].name).join(', '))}">${R.worn.map(relicIcon).join('')}</small>` : ''; };
  function relicTile(id, where) {
    const R = G.RELICS[id];
    return `<button class="relic t${R.tier}${R.cursed ? ' cursed' : ''}${ui.relSel === id ? ' on' : ''}" data-act="relsel" data-k="${id}" title="${esc(R.name)}: ${esc(fxText(R.fx).join('; '))}">${relicIcon(id)}<span>${esc(R.name)}</span>${where === 'worn' ? '<i class="wtag">worn</i>' : ''}</button>`;
  }
  function relicsCard() {
    const R = G.relicsOf(S); const sel = ui.relSel && (R.worn.includes(ui.relSel) || R.bag.includes(ui.relSel)) ? ui.relSel : null;
    const slots = []; for (let i = 0; i < G.relicSlots(S); i++) slots.push(R.worn[i] ? relicTile(R.worn[i], 'worn') : '<div class="relic empty"><span>Empty</span></div>');
    let detail = '';
    if (sel) {
      const X = G.RELICS[sel]; const worn = R.worn.includes(sel); const full = R.worn.length >= G.relicSlots(S);
      detail = `<div class="rdetail">${relicIcon(sel)}<div><h3>${esc(X.name)}</h3><p class="rtier t${X.tier}${X.cursed ? ' cursed' : ''}">${X.cursed ? 'Cursed · ' : ''}${TIER_NAME[X.tier]}</p><p class="hint">${esc(X.text)}</p>
        <ul class="plain rfx">${fxText(X.fx).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="row">${worn ? `<button class="btn sm" data-act="reloff" data-k="${sel}">Take it off</button>` : `<button class="btn sm primary" data-act="relon" data-k="${sel}"${full ? ' disabled' : ''}>Wear it</button>${full ? '<span class="hint">All three slots are taken: take one off first.</span>' : ''}`}</div></div></div>`;
    }
    const lying = S.objects.filter(o => o.kind === 'relic' && hasSeen(o.x, o.y)).length;
    return `<section class="tcard relics wide"><h2 class="cap">Relics</h2>
      <p class="hint">${esc(VN())} can wear ${G.relicSlots(S)} at a time; the rest wait in the bag. They lie hidden around the map and glow where your servants have seen one${lying ? ` (<b>${lying}</b> seen now)` : ''}: select ${esc(VN())} and ${RCLK()} one to go and claim it. ${esc(capWord(VP().he))} can seize the heroes' artifacts before they do, too.</p>
      <div class="rwrap"><div><h3 class="rsub">Worn</h3><div class="rslots">${slots.join('')}</div>
        <h3 class="rsub">Bag</h3><div class="rbag">${R.bag.length ? R.bag.map(k => relicTile(k, 'bag')).join('') : '<p class="hint">Empty.</p>'}</div></div>
        <div class="rside">${detail || '<p class="hint">Pick a relic to see what it does.</p>'}</div></div></section>`;
  }
  // the five numbers that say what your relics and talents have made of your villain
  function attrsCard() {
    const A = G.villainAttrs(S); const sg = v => (v > 0 ? '+' : '') + v;
    const row = (name, val, tip) => `<li title="${esc(tip)}"><span>${name}</span><b>${val}</b></li>`;
    return `<section class="tcard attrs"><h2 class="cap">Attributes</h2><ul class="plain alist">
      ${row('Might', `${sg(Math.round(A.hp * 100))}% health · ${sg(A.hit)} to hit`, 'On the throne and in duels')}
      ${row('Menace', sg(A.menace), 'Added to Intimidate, Persuade and Deceive when you parley with a band')}
      ${row('Stride', `${sg(Math.round(A.stride * 100))}%`, 'How much farther than usual your villain walks in a night')}
      ${row('Sight', sg(A.sight), 'How much farther your servants see')}
      ${row('Command', `${A.command} band${A.command === 1 ? '' : 's'}`, 'How many bands of the wilds can follow your banner at once')}
    </ul><p class="hint">From your talents and the relics you wear.</p></section>`;
  }
  const capWord = w => w ? w[0].toUpperCase() + w.slice(1) : w;
  // after a night that turned one up: what it is, and a button to wear it
  function relicNews() {
    const news = (S.relicNews || []).filter(id => G.RELICS[id]); if (!news.length || ui.modal || ui.night || ui.moving || S.phase !== 'map') return false;
    S.relicNews = []; save();
    const R = G.relicsOf(S); sfx('item', { vol: 0.9 });
    const rows = news.map(id => { const X = G.RELICS[id]; const worn = R.worn.includes(id);
      return `<div class="rfound">${relicIcon(id)}<div><h2 class="cap">${esc(X.name)}</h2><p class="rtier t${X.tier}${X.cursed ? ' cursed' : ''}">${X.cursed ? 'Cursed · ' : ''}${TIER_NAME[X.tier]}${worn ? ' · worn' : ' · in the bag'}</p><p class="hint">${esc(X.text)}</p><ul class="plain rfx">${fxText(X.fx).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        ${!worn && R.worn.length < G.relicSlots(S) ? `<div class="row"><button class="btn sm primary" data-act="relon" data-k="${id}" data-close="1">Wear it</button></div>` : ''}</div></div>`; }).join('');
    modal(`<p class="eyebrow">A relic</p>${rows}<div class="row end"><button class="btn" data-act="nav" data-k="relics">See the relics</button><button class="btn big" data-act="close">Good</button></div>`, null, 'relicnews');
    vsay('talent');
    return true;
  }
  function navTo(k) {
    if (!S || !ui.active) return;
    if (k === 'party') { closeScreen(); showParty(); return; }
    if (ui.modal) closeModal();
    if (k === 'chronicle') { if (ui.screen === 'chronicle') closeScreen(); else openScreen('chronicle'); return; }
    const tab = k === 'relics' ? 'villain' : k;
    if (ui.screen === 'tower' && ui.towerTab === tab && k !== 'relics') { closeScreen(); return; }   // the same key again closes it
    ui.towerTab = tab; ui.tsel = null; openScreen('tower');
    if (k === 'relics') setTimeout(() => { const r = document.querySelector('.tcard.relics'); if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
  }
  const NAV_KEYS = { t: 'villain', k: 'talents', l: 'lairs', r: 'relics', j: 'chronicle' };

  /* ============ 0.35: the action bar along the bottom of the map: your units, the one you picked, and what you can tell it to do ============ */
  const ABI = {
    gather: '<svg viewBox="0 0 24 24"><path d="M6 20l9-9" stroke="#140c04" stroke-width="4"/><path d="M6 20l9-9" stroke="#a8743a" stroke-width="2"/><path d="M8 7c4-4 9-4 12 0-3-1-6-1-9 2z" fill="#c9ccd2" stroke="#140c04" stroke-width="1.2"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M8 21V9l4-5 4 5v12z" fill="#5a4a7a" stroke="#140c04" stroke-width="1.3"/><path d="M11 21v-5h2v5" fill="#140c04"/><circle cx="12" cy="10" r="1.6" fill="#b4ff7a"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" fill="#c8402a" stroke="#140c04" stroke-width="1.4"/><path d="M9 12h6" stroke="#fff2d8" stroke-width="2.4" stroke-linecap="round"/></svg>',
    idle: '<svg viewBox="0 0 24 24"><path d="M5 8h6l-6 7h6" fill="none" stroke="#e8dcc0" stroke-width="2" stroke-linejoin="round"/><path d="M13 4h5l-5 5h5" fill="none" stroke="#b8a888" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="#ffe27a" stroke="#140c04" stroke-width="1"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="#fff6c8"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6" fill="none" stroke="#e8dcc0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    relic: '<svg viewBox="0 0 24 24"><path d="M12 3l3 5-3 13-3-13z" fill="#b07aff" stroke="#140c04" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 8h6" stroke="#140c04" stroke-width="1"/><path d="M12 3l1.2 5" stroke="#e8d0ff" stroke-width="1"/></svg>',
    parley: '<svg viewBox="0 0 24 24"><path d="M4 6h12v8H9l-4 3v-3H4z" fill="#d0aaff" stroke="#140c04" stroke-width="1.2" stroke-linejoin="round"/><path d="M18 9h2v8h-1v3l-3-3h-5v-1" fill="none" stroke="#e8dcc0" stroke-width="1.4"/></svg>'
  };
  const plain = h => String(h).replace(/<[^>]+>/g, '');
  const minionState = m => !m.job ? (m.path.length ? 'walk' : 'idle') : m.path.length ? 'walk' : { work: 'work', build: 'build', grounds: 'build', dance: 'dance' }[m.job.kind] || 'walk';
  const STATE_TXT = { idle: 'idle', walk: 'walking', work: 'working', build: 'building', dance: 'dancing', home: 'at the tower', out: 'out on the map', rest: 'recovering' };
  function abBtn(o) {
    const hk = o.hk ? (o.hk === 'space' ? 'Spc' : o.hk.toUpperCase()) : '';
    return `<button class="abtn${o.on ? ' on' : ''}${o.cls ? ' ' + o.cls : ''}" data-act="${o.act}"${o.k !== undefined ? ` data-k="${esc(o.k)}"` : ''}${o.id ? ` data-id="${o.id}"` : ''}${o.kind ? ` data-kind="${o.kind}"` : ''}${o.hk ? ` data-hk="${o.hk}"` : ''}${o.dis ? ' disabled' : ''} title="${esc((o.tip || o.label) + (hk ? ` (${hk})` : ''))}" aria-pressed="${o.on ? 'true' : 'false'}">${o.icon}<span>${esc(o.label)}</span>${hk ? `<kbd>${esc(hk)}</kbd>` : ''}</button>`;
  }
  function abUnits() {
    const V = S.villain; const vsel = ui.sel && ui.sel.type === 'villain'; const msel = new Set(selMinions().map(m => m.id));
    const vst = V.state === 'banished' ? 'rest' : G.villainOnMap(S) ? (V.path && V.path.length ? 'walk' : 'out') : 'home';
    let h = `<button class="aunit v${vsel ? ' on' : ''}" data-act="vsel" title="${esc(VN())}, ${STATE_TXT[vst]} (V)">${img(vIcon(), 'aport')}<i class="ast ${vst}"></i></button>`;
    for (const m of S.minions || []) { const st = minionState(m); const idle = st === 'idle'; h += `<button class="aunit${msel.has(m.id) ? ' on' : ''}${idle ? ' idle' : ''}" data-act="abm" data-id="${m.id}" title="${esc(MT().one)}: ${plain(minionJob(m))} Shift-click to add.">${img(minionIcon(), 'aport')}${idle ? '<i class="azz" aria-label="idle">Zz</i>' : `<i class="ast ${st}"></i>`}</button>`; }
    return h;
  }
  function abCard() {
    const ms = selMinions(); const sel = ui.sel;
    if (ms.length) { const idle = ms.filter(m => !m.job).length;
      const one = ms.length === 1 && minionIdle(ms[0]);
      return `<span class="abigw">${img(minionIcon(), 'abig')}</span><div><b>${ms.length > 1 ? `${ms.length} ${esc(MT().name)}` : esc(MT().one)}</b><small${one ? ' class="idletxt"' : ''}>${ms.length > 1 ? `${idle ? `<span class="idletxt">${idle} idle</span>, ` : ''}${ms.length - idle} busy.` : one ? 'Idle, waiting for orders. Gather, build or send it somewhere.' : minionJob(ms[0])}</small></div>`; }
    if (sel && sel.type === 'villain') { const V = S.villain; const hp = Math.round((V.hpFrac === undefined ? 1 : V.hpFrac) * 100);
      return `${img(vIcon(), 'abig')}<div><b>${esc(VN())} · Lv ${G.villainLevel(S)}</b><small>${villainLine()}${G.villainOnMap(S) ? ` Health ${hp}%.` : ''}</small></div>`; }
    if (sel && sel.type === 'node') { const n = S.nodes.find(z => z.id === sel.id); if (n) { const K = G.NODE_KINDS[n.kind]; const p = nodeProg(n);
      return `${img('obj-' + (n.dev ? 'node-' : 'dep-') + n.kind, 'abig')}<div><b>${esc(G.nodeName(n))}</b><small>${G.nodeRaided(S, n) ? 'Wrecked by the heroes.' : p === null ? 'Not yours yet. Send a minion to work it.' : p >= 1 ? `Full: ${G.nodeStock(S, n)} ${K.res}. Click it to collect.` : `${Math.round(p * 100)}% full. ${nodeLeft(n)} more night${nodeLeft(n) > 1 ? 's' : ''}.`}</small>${p !== null && p < 1 ? pbar(p, 'fill ' + n.kind) : ''}</div>`; } }
    const b = selBand(); if (b) { const C = G.CREATURES[b.type]; return `${img('unit-' + b.type, 'abig')}<div><b>${b.count} ${esc(C.name)}</b><small>${b.camp ? 'In the war camp outside Millbrook.' : b.wave ? 'Marching to the war camp.' : b.patrol ? 'On patrol.' : 'Holding their ground.'}</small></div>`; }
    const idle = G.idleMinions(S).length;
    return `<div><b>Your servants</b><small>Click a ${esc(MT().one.toLowerCase())} or ${esc(VN())} to give orders.${idle ? ` <span class="idletxt">${idle} idle: press I.</span>` : ''}</small></div>`;
  }
  function abCmds() {
    const ms = selMinions(); const sel = ui.sel; const out = []; const B = o => out.push(abBtn(o));
    if (!ms.length && ui.abSub) ui.abSub = null;
    if (ms.length && ui.abSub === 'gather') {
      ['gold', 'lumber', 'ore'].forEach((k, i) => B({ act: 'mworknear', kind: k, hk: String(i + 1), label: { gold: 'Gold', lumber: 'Timber', ore: 'Ore' }[k], icon: img('obj-res-' + k, 'aico'), tip: `Send them to the nearest free ${G.NODE_KINDS[k].raw.toLowerCase()}` }));
      B({ act: 'mmove', hk: 'm', label: 'Pick one', icon: MICON.move, on: ui.mode === 'move', tip: 'Then click the deposit to work' });
      B({ act: 'absub', k: '', label: 'Back', icon: ABI.back, tip: 'Back (Esc)' });
    } else if (ms.length && ui.abSub === 'build') {
      const known = G.lairsFor(S).filter(k => G.lairKnown(S, k));
      known.forEach((k, i) => { const D = G.DUNGEONS[k]; const e = G.lairCheck(S, k); const cn = G.CREATURES[D.unit].name; B({ act: 'placelair', k, hk: i < 9 ? String(i + 1) : '', label: cn.length > 10 ? cn.split(' ').pop() : cn, icon: img('obj-' + k, 'aico'), on: !!(ui.place && ui.place.k === k), dis: !!e, cls: 'lair', tip: `${D.name}: raises ${G.CREATURES[D.unit].name.toLowerCase()}. ${G.priceText(G.buildPrice(k))}, eats ${G.lairFood(k)} food, ${G.lairDays(S, k)} days to build.${e ? ' ' + e : ''}` }); });
      B({ act: 'tower', k: 'talents', label: 'More', icon: MICON.level, tip: 'Learn talents at the Dark Tower to raise more kinds of lair' });
      B({ act: 'absub', k: '', label: 'Back', icon: ABI.back, tip: 'Back (Esc)' });
    } else if (ms.length) {
      B({ act: 'mmove', hk: 'm', label: 'Move', icon: MICON.move, on: ui.mode === 'move', tip: 'Then click where to go: a deposit puts them to work, a half-built lair to building' });
      B({ act: 'absub', k: 'gather', hk: 'g', label: 'Gather', icon: ABI.gather, tip: 'Send them to work a gold, timber or ore deposit' });
      B({ act: 'absub', k: 'build', hk: 'b', label: 'Build', icon: MICON.build, on: !!ui.mbuild, tip: 'Build a lair' });
      B({ act: 'mhome', hk: 'h', label: 'Home', icon: ABI.home, tip: 'Back to the Dark Tower' });
      B({ act: 'mstop', hk: 'x', label: 'Stop', icon: ABI.stop, tip: 'Stop what they are doing' });
      B({ act: 'mdance', hk: 'n', label: 'Dance', icon: MICON.dance, on: ms.every(m => m.job && m.job.kind === 'dance') });
    } else if (sel && sel.type === 'villain') {
      const V = S.villain; const out2 = G.villainOnMap(S); const rest = V.state === 'banished';
      B({ act: 'vmove', hk: 'm', label: 'Move', icon: MICON.move, on: ui.mode === 'vmove', dis: rest || !!S.march, tip: `Then click where ${VP().he} should go: a band of the wilds to win it over, anywhere else to walk there` });
      B({ act: 'vhome', hk: 'h', label: 'Home', icon: ABI.home, dis: !out2, tip: 'Back to the Dark Tower' });
      B({ act: 'vstop', hk: 'x', label: 'Stop', icon: ABI.stop, dis: !(out2 && V.path && V.path.length), tip: 'Stop where you are' });
      if (V.meet) B({ act: 'vmeet', hk: 'g', label: 'Parley', icon: ABI.parley, tip: 'Hold the audience' });
      B({ act: 'nav', k: 'relics', label: 'Relics', icon: ABI.relic, tip: `${VN()}'s relics (R)` });
    } else if (selBand() && (selBand().lair || selBand().yours)) {
      B({ act: 'bpatrol', hk: 'q', label: 'Patrol', icon: MICON.patrol, on: ui.mode === 'patrol' });
      B({ act: 'bcamp', hk: 'w', label: 'To camp', icon: img('unit-mb-gate', 'aico'), dis: !!selBand().wave, tip: selBand().wave ? (selBand().camp ? 'Already in the war camp' : 'Already marching to the war camp') : 'March to the war camp outside Millbrook and join the next assault' });
      B({ act: 'bhold', hk: 'x', label: 'Hold', icon: ABI.stop });
      B({ act: 'blevel', hk: 'u', label: 'Level up', icon: MICON.level });
    } else if (sel && sel.type === 'node') {
      const n = S.nodes.find(z => z.id === sel.id); if (n && G.nodeFull(S, n) && !G.nodeRaided(S, n)) B({ act: 'collect', id: n.id, hk: 'space', label: 'Collect', icon: img('obj-res-' + n.kind, 'aico'), cls: 'hot', tip: `Collect ${G.nodeStock(S, n)} ${G.NODE_KINDS[n.kind].res}` });
    }
    const nf = G.fullNodes(S).filter(n => hasSeen(n.x, n.y)).length; const ni = G.idleMinions(S).length;
    const tail = [abBtn({ act: 'nextidle', hk: 'i', label: ni ? `Idle ${ni}` : 'Idle', icon: ABI.idle, dis: !ni, cls: ni ? 'hot idle' : '', tip: `Next idle ${MT().one.toLowerCase()}; Shift for all of them` }),
      abBtn({ act: 'nextfull', hk: 'c', label: nf ? `Full ${nf}` : 'Full', icon: ABI.full, dis: !nf, cls: nf ? 'hot' : '', tip: 'Next full mine or camp, ready to collect' })];
    return `<div class="acmds" style="--cols:${Math.max(1, Math.ceil(out.length / 2))}">${out.join('')}</div><div class="atail">${tail.join('')}</div>`;
  }
  function renderActions() {
    const el = $('abar'); if (!el) return;
    const on = !!(S && ui.active && !S.title && S.phase === 'map');
    el.hidden = !on; $('mapwrap').classList.toggle('hasbar', on); if (!on) return;
    el.innerHTML = `<div class="abin${ui.moving || ui.night ? ' busy' : ''}"><div class="aunits" role="group" aria-label="Your units">${abUnits()}</div><div class="acard">${abCard()}</div>${abCmds()}</div>`;
    // the talking portrait's canvas lives on across re-renders, so a line in progress keeps moving its mouth
    const w = el.querySelector('.abigw'); if (w) w.appendChild(abTalkCv());
  }
  // 0.35: every order gets an answer, in the minion's own voice: "As you command", "I was going there anyway", or a word about the job
  function minionAck(m, cat) { if (Math.random() < 0.5 && minionSay(m, 'ack')) return true; return minionSay(m, cat || 'ack') || minionSay(m, 'ack'); }
  // 0.39: idle means no job and standing still (one walking home with no job will be idle when it arrives)
  const minionIdle = m => !!m && !m.job && !minionWalking(m);
  const minionBubble = m => { const b = ui.msay && ui.msay.get(m.id); if (!b) return null; if (performance.now() > b.until) { ui.msay.delete(m.id); return null; } return b.text; };
  // after anything that might have handed a hero a magic item, the one who got it says so
  function lootCheck(quiet) {
    if (!S) return; ui.items = ui.items || {};
    for (const h of S.heroes) { const n = h.items.length, was = ui.items[h.id]; ui.items[h.id] = n; if (!quiet && was !== undefined && n > was && S.phase !== 'battle') setTimeout(() => bark('loot', h), 600); }
  }
  // what a battle event sounds like
  const BIG = ['ogre', 'troll', 'giant', 'dragon', 'hydra', 'demon'];
  function battleSfx(ev) {
    const b = S.battle; if (!b) return;
    const unit = id => b.units.find(x => x.id === id);
    if (ev.t === 'roll') { if (ui.dice) sfx('dice', { vol: 0.7, gap: 250 }); return; }
    if (ev.t === 'attack') { const a = unit(ev.src); if (ev.ranged) sfx('arrow', { vol: 0.8 }); else if (a && (a.boss || BIG.indexOf(a.type) >= 0) && Math.random() < 0.35) sfx('roar', { vol: 0.7, gap: 4000 }); return; }
    if (ev.t === 'miss') { sfx('miss'); return; }
    if (ev.t === 'hit') {
      const d = unit(ev.target);
      if (ev.dodge) return sfx('miss');
      if (ev.escaped) return sfx('dark', { vol: 0.7 });
      if (d && d.side === 'party' && !d.wild && (ev.down || ev.died)) {
        sfx('hit'); sfx('down', { delay: 0.15 });
        const dead = ev.died && S.heroes.find(x => x.id === d.hero);
        if (dead) { setTimeout(() => { if (bark('dying', dead, { force: true })) vsay('kill', { queue: true }); else vsay('kill'); }, 600); return; }
        const up = b.units.filter(u => u.side === 'party' && u.alive && !u.down && u.id !== d.id).map(u => S.heroes.find(x => x.id === u.hero)).filter(Boolean);
        if (up.length) setTimeout(() => bark('down', up[Math.floor(Math.random() * up.length)]), 700);
        return;
      }
      if (ev.crit) sfx('crit'); else if (ev.dmg) sfx('hit');
      if (ev.died || ev.killed) sfx('die', { vol: 0.6, delay: 0.12, gap: 300 });
      return;
    }
    if (ev.t === 'spell') return;   // 0.41: spellFx times each spell's sounds to its own wind-up and impact
    if (ev.t === 'summon') { sfx('summoned', { vol: 0.8 }); return; }
    if (ev.t === 'revive') { sfx('holy', { vol: 0.8 }); }
  }
  function endDay() {
    if (S.phase !== 'map' || ui.moving || ui.manim) return;
    { const live = S.heroes.filter(h => h.status === 'ok'); const f = live.reduce((t, h) => t + h.hp / h.maxHp, 0) / Math.max(1, live.length);
      if (S.march && !(S.vo && S.vo.march)) { S.vo = Object.assign(S.vo || {}, { march: true }); if (vsay('march', { prio: 3, force: true })) bark('march', null, { queue: true, force: true }); else bark('march'); }
      else if (f < 0.5 && partyShown()) bark('rest'); }
    ui.place = null; ui.mode = null; if (!(ui.sel && ui.sel.type === 'minion')) ui.sel = null; ui.moving = true; renderSide(); stepLoop();
  }
  function stepLoop() {
    if (S.phase === 'battle') { enterBattle(); return; }
    if (S.phase !== 'map') { ui.moving = false; return; }
    if (S.pendingLevelUps.length) { showLevelUps(() => stepLoop()); return; }
    const ev = G.partyStep(S);
    if (ev.t === 'move') {
      const site = G.siteAt(S, ev.x, ev.y);
      if (site && site.kind === 'town') { if (!ui.inTown) { ui.inTown = true; if (partyShown()) bark('town'); } } else ui.inTown = false;
      if (Math.random() < 0.06 && partyShown()) bark('explore');
    }
    if (['move', 'event', 'battle', 'trap'].indexOf(ev.t) >= 0) {
      animateParty(ev.from, { x: ev.x, y: ev.y }, () => {
        renderBar(); voiceWatch();
        const seenHere = canSee(ev.x, ev.y);
        if (ev.spotted && seenHere) ui.floats.push({ x: ev.x * TILE + TILE / 2, y: ev.y * TILE, text: '!', color: '#ffe066', t0: performance.now() });
        if (ev.t === 'battle') { save(); enterBattle(); return; }
        if (ev.t === 'trap') { save(); playMapRolls(ev.rolls, () => { for (const m of ev.msgs) toast(m, 'bad'); renderSide(); setTimeout(stepLoop, ui.fast ? 200 : 500); }); return; }
        if (ev.t === 'event') {
          if (!seenHere) { stepLoop(); return; }   // what the heroes find in the fog, you hear about later in the chronicle
          for (const m of ev.msgs) toast(m, 'good');
          if (ev.msgs.some(m => /drive off your/.test(m))) { const fm = (S.minions || []).find(m => m.path && m.path.length); if (fm) minionSay(fm, 'fled'); }
          ui.floats.push({ x: ev.x * TILE + TILE / 2, y: ev.y * TILE, text: '★', color: '#ffe066', t0: performance.now() });
          renderSide(); setTimeout(stepLoop, ui.fast ? 250 : 650); return;
        }
        if (ev.spotted && seenHere) { renderSide(); setTimeout(stepLoop, ui.fast ? 150 : 350); return; }
        stepLoop();
      });
      return;
    }
    const pre = nightBefore();
    G.endDay(S);
    const N = reduced ? null : nightPlan(pre);
    if (N) { save(); startNight(N, dawn); renderSide(); } else dawn();
  }
  // the minions waiting to be summoned at the tower, the first one taking shape
  function summonQueue() {
    const q = S.summons || []; if (!q.length) return '';
    const par = G.summonPar(S);   // 0.39: a wider circle summons more than one at a time
    return `<div class="squeue">${q.map((it, i) => `<div class="prow">${img(minionIcon(), 'ticon')}${pbar(i >= par ? 0 : 1 - it.days / it.total, 'summon')}<small>${i >= par ? 'waiting' : `${it.days} day${it.days > 1 ? 's' : ''} left`}</small><button class="lnk" data-act="unsummon" data-i="${i}" title="Cancel and get the gold back">cancel</button></div>`).join('')}</div>`;
  }
  function dawn() {
    ui.moving = false; track('day');
    const n = S.lastDay;
    if (n) {
      const got = G.RES_KEYS.filter(k => n.res[k]).map(k => `+${n.res[k]} ${k}`).join(', ');
      if (got || n.raised.length) toast(`Overnight: ${got || 'no resources'}${n.raised.length ? '. Your lairs raised ' + n.raised.map(([t, c]) => `${c} ${c > 1 ? G.CREATURES[t].name.toLowerCase() : G.CREATURES[t].one.toLowerCase()}`).join(', ') : ''}.`, 'sys');
      for (const id of n.opened || []) { const nd = S.nodes.find(z => z.id === id); if (nd) toast(`Your ${MT().one.toLowerCase()} opened a ${G.NODE_KINDS[nd.kind].name} near ${G.regionName(S, nd.x, nd.y)}.`, 'good'); }
      for (const id of n.released || []) { const b = S.objects.find(z => z.id === id); if (b) toast(`${G.bandName(b)} march ${b.wave ? 'for the war camp from' : 'out of'} your ${G.DUNGEONS[(S.objects.find(z => z.id === b.lair) || { dtype: 'warren' }).dtype].name}.`, 'good'); }
      sfx('dawn', { vol: 0.6 });
      let at = 0.9; const later = k => { sfx(k, { delay: at }); at += 0.8; };
      if (n.built.length || n.library || (n.town && n.town.built)) later('built');
      if ((n.summoned || []).length) later('summoned');
      for (const id of n.built) { const o = S.objects.find(z => z.id === id); if (o) toast(`The ${G.DUNGEONS[o.dtype].name} is finished.`, 'good'); }
      if (n.town && n.town.built) { const B = G.TOWN_B[n.town.built]; const l = G.townLv(S, n.town.built); toast(`Millbrook's ${B.name}${l > 1 ? ' ' + G.roman(l) : ''} is ${l > 1 ? 'enlarged' : 'finished'}: ${B.levels ? B.levels[l - 1] : '+' + G.priceText(B.income[l - 1]) + ' a day'}.`, 'good'); }
      if ((n.summoned || []).length) toast(`A new ${MT().one.toLowerCase()} crawls out of the Dark Tower, ready to work.`, 'good');
      if (n.library) toast(G.libraryLevel(S) > 1 ? "The Forbidden Library's new wing is finished: one more talent point." : 'The Forbidden Library is finished: a talent point to spend.', 'good');
      for (const k of (n.grounds || []).filter(k => k !== 'library')) { const B = G.GROUNDS[k]; const lv = G.groundsLv(S, k); toast(`${B.at ? `${B.name} ${G.roman(lv)} forged` : lv > 1 ? `The ${B.name} reaches level ${lv}` : `The ${B.name} is finished`}: ${B.lv(lv)}.`, 'good'); }   // 0.39
      { const idl = (S.minions || []).filter(minionIdle).length; if (idl) toast(`${idl === 1 ? `A ${MT().one.toLowerCase()} is` : `${idl} ${MT().name.toLowerCase()} are`} idle, waiting for orders. Press I to find ${idl === 1 ? 'it' : 'them'}.`, 'idle', 6000); }   // 0.39
      // 0.30: the night's sieges, and what Millbrook is up to
      for (const r of n.sieges || []) { toast(r.text, r.breached ? 'good' : 'sys'); if (r.breached) later('coins'); }
      if ((n.camped || []).length) { const c = G.campCount(S); toast(`${n.camped.length > 1 ? 'More of your monsters reach' : `${G.bandName(S.objects.find(z => z.id === n.camped[0]) || { type: 'goblin', count: 1 })} reach`} the war camp outside Millbrook. ${c} wait for the assault at the end of the week.`, 'good'); }
      // 0.31: your villain has something to say about the night
      { const br = (n.sieges || []).some(r => r.breached || r.hallDmg > 0); const wv = (n.released || []).some(id => { const b = S.objects.find(z => z.id === id); return b && b.wave; });
        const rp = !br && (n.sieges || []).length > 0;
        const cat = br ? 'breach' : rp ? 'repelled' : n.built.length ? 'lair' : wv ? 'wave' : Math.random() < 0.3 ? 'dawn' : null; if (cat) setTimeout(() => vsay(cat), 900);
        // the minions: one that finished a job says so, a new one introduces itself, an idle one grumbles
        const at = (x, y) => (S.minions || []).find(m => m.x === x && m.y === y);
        const doneM = n.built.map(id => S.objects.find(z => z.id === id)).filter(Boolean).map(o => at(o.x, o.y)).concat((n.opened || []).map(id => S.nodes.find(z => z.id === id)).filter(Boolean).map(nd => at(nd.x, nd.y))).filter(Boolean)[0];
        const newM = (n.summoned || []).length ? S.minions[S.minions.length - 1] : null; const idleM = G.idleMinions(S)[0];
        setTimeout(() => { if (doneM) minionSay(doneM, 'done'); else if (newM) minionSay(newM, 'summoned'); else if (idleM && Math.random() < 0.35) minionSay(idleM, 'idle'); }, 2600); }
      if (n.town && n.town.started) { const k = n.town.started; toast(`Millbrook starts work on ${k === 'walls' ? G.TOWN_B.walls.names[G.townLv(S, 'walls')].toLowerCase() : 'the ' + G.TOWN_B[k].name + (G.townLv(S, k) ? ' ' + G.roman(G.townLv(S, k) + 1) : '')}.`, 'sys'); }
    }
    if (S.phase === 'over') { commit(); showOver(); return; }
    const go = () => { if (S.phase === 'council') { commit(); showCouncil(); return; } if (S.phase === 'week') { commit(); showWeek(); return; } commit(); morning(); };
    if (S.vUps && S.vUps.length) { commit(); showVillainUps(go); return; }
    go();
  }
  function playMapRolls(rolls, done) {
    const tray = $('maptray'); let i = 0;
    const next = () => {
      if (i >= rolls.length || !ui.dice) { setTimeout(() => { tray.hidden = true; done(); }, ui.dice ? 700 : 0); return; }
      Dice.show(tray, rolls[i++], diceSpeed()).then(() => setTimeout(next, 350 * diceSpeed()));
    };
    next();
  }

  /* ============ sidebar: the heroes, your war party, your tower ============ */
  function heroRow(h) {
    const st = h.status === 'dead';
    const hpPct = h.maxHp ? Math.max(0, h.hp) / h.maxHp * 100 : 0;
    return `<button class="hero${st ? ' dead' : ''}" data-act="hero" data-id="${h.id}" title="${esc(h.name)}, level ${h.level} ${G.CLASSES[h.cls].label}. ${st ? 'Dead.' : h.hp + '/' + h.maxHp + ' HP.'} Wants ${esc(G.DRIVES[h.drive].want)}.">
      ${heroImg(h, 'port', h.name)}
      <span class="hname">${esc(shortName(h.name))}</span><span class="hsub">Lv ${h.level} · ${G.CLASSES[h.cls].label}</span>
      <span class="bars"><i class="hp" style="width:${hpPct.toFixed(0)}%"></i></span>
    </button>`;
  }
  const perNight = (n, C) => n >= 1.25 ? `${Math.round(n * 10) / 10} ${C.name.toLowerCase()} a night` : n >= 0.75 ? `about 1 ${C.one.toLowerCase()} a night` : `1 ${C.one.toLowerCase()} every ${Math.max(2, Math.round(1 / n))} nights`;
  function readinessHtml(full) {
    const r = G.readiness(S); const pct = r.win === null ? Math.min(30, r.ratio / r.need * 30) : Math.max(4, r.win * 100); const mark = r.need <= 1 ? r.need * 100 : 55;
    const cls = r.ready ? 'bad' : r.label === 'Almost ready' ? 'warn' : 'good';
    const lab = S.march ? 'Marching on you' : r.win === null ? 'No threat yet' : r.ready ? 'Ready to march' : r.label === 'Almost ready' ? 'Almost ready' : 'Not ready';
    return `<div class="readybox"><p><b class="${cls}">${esc(lab)}</b> · heroes level ${G.avgLevel(S)} against ${esc(VN())} at level ${G.villainLevel(S)}${S.march ? ` · <b class="warn">they're on their way to the Dark Tower</b>` : ''}</p>
      <div class="readymeter" title="${r.win === null ? `Below level ${Math.max(G.MARCH_LV, G.villainLevel(S) - 6)} the heroes don't even think about the tower.` : `They think they'd beat you about ${Math.round(r.win * 100)}% of the time. The white line is where they march.`}"><i style="width:${pct.toFixed(0)}%"></i><em style="left:${mark.toFixed(0)}%"></em></div>
      ${full ? `<p class="hint">From level ${G.MARCH_LV} the heroes size up the showdown at your throne every time something changes: their levels and items, your level and powers. When they think they'd win more often than not, they march on the Dark Tower. Keep levelling up to stay ahead of them.${r.win !== null ? ` Right now they'd win about ${Math.round(r.win * 100)}% of the time.` : ''}</p>` : ''}</div>`;
  }
  // what's waiting for orders: idle minions
  function towerBadge() { return G.idleMinions(S).length; }
  // a new talent point (the heroes levelled, or Infamy filled up): say so once
  function talentNews() {
    if (!S.talents) return; const f = G.talentFree(S);
    if (ui.tFree !== undefined && f > ui.tFree && S.phase === 'map') { const n = f - ui.tFree; setTimeout(() => { sfx('research'); toast(n > 1 ? `${n} new talent points! Spend them at the Dark Tower.` : 'A new talent point! Spend it at the Dark Tower.', 'good'); }, 400); }
    if (S.phase === 'map' || f < (ui.tFree || 0)) ui.tFree = f;
  }
  // the talent tree a locked lair is learned in
  const lairTree = k => { const T = G.TALENTS[k]; return T && G.TREES[T.tree] ? G.TREES[T.tree].name : 'the talents'; };
  const RES_LABEL = { gold: 'gold', lumber: 'lumber', ore: 'ore' };
  const purseRes = w => w === 'town' ? (S.town ? S.town.res : {}) : S.res;
  const priceChips = (p, w) => { const R = purseRes(w); return Object.keys(p).filter(k => p[k]).map(k => { const h = Math.floor(R[k] || 0); return `<span class="pc ${k}${h < p[k] ? ' short' : ''}" title="${p[k]} ${RES_LABEL[k]} (${w === 'town' ? 'Millbrook has' : 'you have'} ${h})">${img(RES_ICON[k], 'ric')}${p[k]}</span>`; }).join(''); };
  // a screen's header: the purse that screen spends from
  const purseHtml = w => `<span class="scpurse ${w}">${img(w === 'town' ? 'obj-town' : siteIcon({ id: 'tower' }), 'pic')}<span class="pn">${w === 'town' ? 'Millbrook' : 'Tower'}</span>${G.RES_KEYS.map(k => `<b class="pc ${k}" title="${w === 'town' ? 'Millbrook' : 'Tower'} ${RES_LABEL[k]}">${img(RES_ICON[k], 'ric')}${Math.floor(purseRes(w)[k] || 0)}</b>`).join('')}</span>`;
  const RES_ICON = { gold: 'obj-res-gold', lumber: 'obj-res-lumber', ore: 'obj-res-ore', lore: 'obj-lore' };
  const daysAway = (m, x, y) => { const path = G.minionPath(S, m, x, y); if (!path) return null; let c = 0, px = m.x, py = m.y; for (const [a, b] of path) { c += G.stepCost(S, px, py, a, b); px = a; py = b; } const mp = G.minionMpOf(S); return Math.max(0, Math.ceil(c / mp - 0.001)); };
  const MT = () => G.minionType(S);
  const minionIcon = () => 'unit-m-' + MT().look;
  // 0.31: hammering at a lair going up, or sinking a mine at the deposit it stands on
  const minionWorking = m => !minionWalking(m) && (G.myLairs(S).some(o => o.x === m.x && o.y === m.y && lairShownBuilding(o) > 0)
    || !!(m.job && m.job.kind === 'work' && (S.nodes || []).some(n => n.id === m.job.node && n.x === m.x && n.y === m.y && !n.dev)));
  // the sidebar card for whatever you clicked on the map
  function selPanel() {
    const sel = ui.sel; if (!sel || !S || S.phase !== 'map') return '';
    const close = '<button class="xbtn" data-act="desel" title="Close (Esc)">×</button>';
    if (sel.type === 'villain') {
      const V = S.villain; const out = G.villainOnMap(S); const hp = Math.round((V.hpFrac === undefined ? 1 : V.hpFrac) * 100);
      const meet = G.meetBand(S);
      return `<section class="panel sel vpanel">${img(vIcon(), 'selimg')}<div>${close}<h2 class="cap">${esc(VN())} <span class="lv">Lv ${G.villainLevel(S)}</span></h2>
        <p>${villainLine()}${out ? ` Health ${hp}%.` : ''}</p>
        ${meet ? '<div class="row"><button class="btn sm" data-act="vmeet">Hold the audience</button></div>' : ''}
        <p class="hint">${V.state === 'banished' ? 'Beaten and resting. Back on the road soon.' : `<b>${RCLK(1)}</b> a band of the wilds to go and win it over, anywhere else to walk there, or the Dark Tower to come home. ${esc(VP().he[0].toUpperCase() + VP().he.slice(1))} walks about ${Math.round(G.VILLAIN_DAY_MP / 10)} tiles a night, around the heroes, and heals a quarter a night.`}</p>
        <div class="row">${out ? '<button class="btn sm" data-act="vhome">Return to the tower</button>' : ''}${out && V.path && V.path.length ? '<button class="btn sm" data-act="vstop">Stop</button>' : ''}</div></div></section>`;
    }
    if (sel.type === 'node') {
      const n = S.nodes.find(z => z.id === sel.id); if (!n) { ui.sel = null; return ''; }
      const K = G.NODE_KINDS[n.kind]; const raided = G.nodeRaided(S, n); const one = MT().one.toLowerCase(); const per = nodeYield(n);
      const a = G.assignedTo(S, n)[0]; const here = a && !a.path.length && a.x === n.x && a.y === n.y; const days = a && a.path.length ? minionDays(a) : 0;
      const gl = G.guardOf(S, n); const near = Math.hypot(n.x - S.party.x, n.y - S.party.y) < G.sightRadius(S) + 2;
      let st, bar = '';
      if (raided) st = `<b class="warn">The heroes wrecked it. It yields again in ${n.raidedUntil - G.dayIndex(S)} day${n.raidedUntil - G.dayIndex(S) > 1 ? 's' : ''}.</b>`;
      else if (!n.dev) {
        st = !a ? `Untouched. A minion spends a day here to ${K.sink}; after that it fills with ${per * K.days} ${K.res} every ${K.days} days on its own, for you to collect.` : here ? `Your ${one} will ${K.sink} here tonight. Then it fills with ${per * K.days} ${K.res} every ${K.days} days.` : `A ${one} is on the way, ${days} day${days > 1 ? 's' : ''} out. It needs one night here to ${K.sink}.`;
        if (a) bar = `<div class="prow">${pbar(here ? 0 : 1 - a.path.length / Math.max(a.trip || 0, a.path.length))}<small>${here ? 'opens tonight' : 'on the way'}</small></div>`;
      } else if (G.nodeFull(S, n)) { st = `<b class="good">Full: ${G.nodeStock(S, n)} ${K.res} waiting.</b> Collect it and it starts again. Until then it sits idle.`; bar = `<div class="prow">${pbar(1, 'fill ' + n.kind)}<small>full</small></div>`; }
      else { const f = n.fill || 0; st = `<b class="good">Yours.</b> It ${K.verb} ${per} ${K.res} a night on its own, with nobody there. When it holds ${per * K.days} it waits for you to come and collect.`; bar = `<div class="prow">${pbar(f / K.days, 'fill ' + n.kind)}<small>full in ${K.days - f} night${K.days - f > 1 ? 's' : ''}</small></div>`; }
      return `<section class="panel sel">${img('obj-' + (n.dev ? 'node-' : 'dep-') + n.kind, 'selimg')}<div>${close}<h2 class="cap">${esc(G.nodeName(n))}</h2>
        <p>${esc(n.dev ? K.text : K.rawText)} ${st}</p>${bar}
        <p class="hint">${n.dev ? 'The heroes wreck mines they reach, and carry off whatever is piled up there.' : 'One minion sinks it, then it works on its own.'}${gl ? ` Guarded by your ${esc(G.DUNGEONS[gl.dtype].name)}.` : ' Unguarded: a lair within two tiles would defend it.'}${near ? ' <b class="warn">The heroes are close.</b>' : ''}</p>
        <div class="row">${n.dev ? (G.nodeFull(S, n) && !raided ? `<button class="btn sm primary" data-act="collect" data-id="${n.id}">Collect ${G.nodeStock(S, n)} ${esc(K.res)}</button>` : '') : !a ? `<button class="btn sm" data-act="work" data-id="${n.id}"${raided || !G.idleMinions(S).length ? ' disabled' : ''}>Send a ${esc(one)}</button>${!G.idleMinions(S).length && !raided ? '<span class="hint">No idle minions</span>' : ''}` : `<button class="btn sm" data-act="recall" data-id="${n.id}">Call it off</button>`}</div></div></section>`;
    }
    if (sel.type === 'lair') {
      const o = S.objects.find(z => z.id === sel.id); if (!o) { ui.sel = null; return ''; }
      const D = G.DUNGEONS[o.dtype]; const C = G.CREATURES[D.unit]; const wrecked = G.lairWrecked(S, o);
      const builders = S.minions.filter(m => m.job && m.job.kind === 'build' && m.job.lair === o.id);
      let body;
      const tot = o.buildTotal || G.buildDays(o.dtype);
      if (o.building) body = `<div class="prow">${pbar(1 - o.building / tot, 'build')}<small>${tot - o.building} of ${tot} day${tot > 1 ? 's' : ''}</small></div><p>Going up: ${o.building} day${o.building > 1 ? 's' : ''} of work left${builders.length ? `, ${builders.length} ${builders.length > 1 ? MT().name.toLowerCase() : MT().one.toLowerCase()} assigned${builders.some(m => m.path.length) ? ' (on the way)' : ''}` : '. Nobody is working on it.'}.</p><div class="row">${!builders.length ? `<button class="btn sm" data-act="buildhelp" data-id="${o.id}"${!G.idleMinions(S).length ? ' disabled' : ''}>Send a ${esc(MT().one.toLowerCase())}</button>` : ''}<button class="btn sm" data-act="cancelbuild" data-id="${o.id}">Cancel · half back</button></div>`;
      else if (wrecked) body = `<p class="warn">The heroes wrecked it. It raises nothing for ${o.wrecked - G.dayIndex(S)} more day${o.wrecked - G.dayIndex(S) > 1 ? 's' : ''}.</p>`;
      else {
        const P = G.upPrice(o.dtype); const err = G.expandCheck(S, o.id); const out = G.wavesOf(S, o); const max = G.wavesPerLair(S); const at = Math.min(Math.floor(G.lairCap(S, o)), G.waveAt(S, o) + Math.max(1, Math.round(G.lairRate(S, o))));
        body = `<p>Raises ${esc(perNight(G.lairRate(S, o), C))}${D.home.indexOf(G.terrainAt(S, o.x, o.y)) >= 0 ? ' (home ground: +25%)' : ''}. <b>${G.lairCount(o)}</b> here.</p>
          <div class="prow">${pbar(Math.min(1, G.lairCount(o) / at), 'build')}<small>${out >= max ? 'a wave is on the road' : `next wave at ${at}`}</small></div>
          <p class="hint">When it's full (${at}), ${G.waveAt(S, o)} of them march down the road to Millbrook as a wave, on their own. The rest stay to guard the lair. ${out} of ${max} on the road now.${o.harm ? ' <b class="warn">Millbrook knows where its waves come from.</b>' : ''}</p>
          ${(o.level || 1) < 2 ? `<div class="row"><button class="btn sm" data-act="expand" data-id="${o.id}"${err ? ' disabled' : ''}>Expand</button>${priceChips(P)}</div><p class="hint">Expanding raises 75% more and reaches 2 tiles farther.</p>` : '<p class="hint">Fully expanded.</p>'}`;
      }
      return `<section class="panel sel">${img(o.building ? 'obj-building' : wrecked ? 'obj-wrecked' : 'obj-' + o.dtype, 'selimg')}<div>${close}<h2 class="cap">${esc(D.name)}${(o.level || 1) > 1 ? ' II' : ''}</h2>${body}<p class="hint">${o.known ? 'The heroes know it is here.' : 'The heroes don\'t know it is here.'}</p>${o.building ? '' : bountyRow({ kind: 'obj', id: o.id })}</div></section>`;
    }
    if (sel.type === 'minion') {
      const ms = selMinions(); if (!ms.length) { ui.sel = null; return ''; }
      const many = ms.length > 1; const m = ms[0];
      const allJob = k => ms.every(z => z.job && z.job.kind === k);
      const lairRows = ui.mbuild ? G.lairsFor(S).map(k => {
        const D = G.DUNGEONS[k]; const lock = !G.lairKnown(S, k); const e = G.lairCheck(S, k);
        return `<div class="brow${lock ? ' locked' : ''}${ui.place && ui.place.k === k ? ' on' : ''}">${img('obj-' + k, 'ticon')}<span class="bname"><b>${esc(D.name)}</b><small>${lock ? `🔒 <button class="lnk" data-act="tower" data-k="talents">Talent in ${esc(lairTree(k))}</button>` : `${esc(G.CREATURES[D.unit].name)} · ${G.lairDays(S, k)} days to build · eats ${G.lairFood(k)} food`}</small><span class="prices">${priceChips(G.buildPrice(k))}</span></span>
          <button class="btn sm" data-act="placelair" data-k="${k}"${e ? ' disabled' : ''}>Place</button></div>`;
      }).join('') : '';
      const trip = !many && m.path.length ? `<div class="prow">${pbar(1 - m.path.length / Math.max(m.trip || 0, m.path.length))}<small>on the way</small></div>` : '';
      const list = many ? `<ul class="mjobs">${ms.map(z => `<li><button class="lnk" data-act="selm" data-id="${z.id}">${esc(MT().one)}</button> ${minionJob(z)}</li>`).join('')}</ul>` : `<p>${minionJob(m)}</p>${trip}`;
      const act = (k, label, on, title) => `<button class="mbtn${on ? ' on' : ''}" data-act="m${k}" aria-pressed="${on ? 'true' : 'false'}" title="${esc(title)}">${MICON[k]}<span>${label}</span></button>`;
      const modeHint = ui.place ? `<b>Click open ground</b> you've explored, out of the heroes' sight (the dashed ring), to place the ${esc(G.DUNGEONS[ui.place.k].name)}.` : ui.mode === 'move' ? '<b>Click where to go.</b> A deposit, mine or camp puts them to work there; a half-built lair, to building.' : '';
      return `<section class="panel sel mpanel${ui.place || ui.mode ? ' placing' : ''}">${img(minionIcon(), 'selimg')}<div>${close}<h2 class="cap">${many ? `${ms.length} ${esc(MT().name)}` : esc(MT().one)}</h2>${list}
        <div class="mmenu three">${act('move', 'Move', ui.mode === 'move', 'M: click where to go')}${act('build', 'Build', ui.mbuild, 'B: build a lair')}${act('dance', 'Dance', allJob('dance'), 'Dance')}</div>
        ${modeHint ? `<p class="hint placehint">${modeHint} ${TOUCHY() ? 'Press and hold to cancel.' : 'Right-click or Esc to cancel.'}</p>` : `<p class="hint mhint">${TOUCHY() ? 'Tap a deposit, mine or camp to put them to work. Press and hold anywhere else to walk there.' : '<b>Right-click</b> is a shortcut: a deposit, mine or camp to work it (one minion each), a half-built lair to help, the tower to go home, anywhere else to walk there.'}</p>`}
        ${ui.mbuild ? `<div class="blist">${lairRows}</div>` : ''}</div></section>`;
    }
    if (sel.type === 'spot') {
      const err = G.spotCheck(S, sel.x, sel.y); const m = G.idleMinions(S).sort((a, b) => Math.hypot(a.x - sel.x, a.y - sel.y) - Math.hypot(b.x - sel.x, b.y - sel.y))[0];
      const days = m && !err ? daysAway(m, sel.x, sel.y) : null; const terr = G.TERRAIN[G.terrainAt(S, sel.x, sel.y)].name;
      const rows = G.lairsFor(S).map(k => {
        const D = G.DUNGEONS[k]; const lock = !G.lairKnown(S, k); const e = G.buildCheck(S, k, sel.x, sel.y); const home = D.home.indexOf(G.terrainAt(S, sel.x, sel.y)) >= 0;
        return `<div class="brow${lock ? ' locked' : ''}">${img('obj-' + k, 'ticon')}<span class="bname"><b>${esc(D.name)}</b><small>${lock ? `🔒 <button class="lnk" data-act="tower" data-k="talents">Talent in ${esc(lairTree(k))}</button>` : `${esc(G.CREATURES[D.unit].name)} · ${G.DUNGEONS[k].tier > 1 ? 'tier ' + D.tier + ' · ' : ''}eats ${G.lairFood(k)} food · ${G.lairDays(S, k)} days to build${home ? ' · <i class="good">home ground</i>' : ''}`}</small><span class="prices">${priceChips(G.buildPrice(k))}</span></span>
          <button class="btn sm" data-act="buildlair" data-k="${k}"${e ? ' disabled' : ''}>Build</button></div>`;
      }).join('');
      return `<section class="panel sel buildspot"><div>${close}<h2 class="cap">Build a lair here</h2><p class="hint">${esc(terr)}, ${esc(G.regionName(S, sel.x, sel.y))}. ${err ? `<b class="warn">${esc(err)}</b>` : m ? `Your nearest idle ${esc(MT().one.toLowerCase())} can be here ${days ? `in ${days} day${days > 1 ? 's' : ''}` : 'today'}.` : `<b class="warn">No idle ${esc(MT().name.toLowerCase())}. Summon one at the tower or call one off a job.</b>`}</p>
        ${err ? '' : `<div class="blist">${rows}</div>`}</div></section>`;
    }
    if (sel.type === 'obj') {
      const o = S.objects.find(z => z.id === sel.id); if (!o) { ui.sel = null; return ''; }
      if (o.kind === 'stack') {
        if (!canSeeObj(o)) { ui.sel = null; ui.mode = null; return ''; }
        const C = G.CREATURES[o.type]; const L = o.lvl || 1; const lair = o.lair && S.objects.find(z => z.id === o.lair);
        const from = lair ? `Bred in your ${esc(G.DUNGEONS[lair.dtype].name)}.` : o.lair ? 'Their lair is gone.' : 'Wanderers from the wilds.';
        const eta = o.wave ? G.waveEta(S, o) : null;
        const doing = o.wave ? (o.camp ? `<b class="good">In the war camp outside Millbrook.</b> They join the assault when the week ends (${daysToAssault()}).` : `Marching to the war camp outside Millbrook${eta !== null ? `: ${eta} night${eta > 1 ? 's' : ''} away` : ', but the way is blocked'}.`) : o.patrol ? `Patrolling between ${esc(G.regionName(S, o.patrol.a[0], o.patrol.a[1]))} and ${esc(G.regionName(S, o.patrol.b[0], o.patrol.b[1]))}.` : o.home ? 'Prowling near their lair.' : 'Standing their ground.';
        const out = o.wave && !o.camp ? G.siegeOutlook(S, o) : null;
        const siege = out ? `<p class="threat t-${esc(String(OUTLOOK_CLS[out.label]).toLowerCase())}"><b>Against Millbrook now: ${esc(out.label)}.</b> ${out.hallDmg ? `About ${out.hallDmg} damage to the hall, if nothing stops them.` : out.wallDmg ? `They'd hack ${out.wallDmg} off the walls.` : 'The towers would cut them down.'}</p>` : '';
        const th = bandThreat(o); const lc = L < 3 ? G.bandLevelCost(o) : null; const lerr = G.bandLevelCheck(S, o);
        const thr = th ? `<p class="threat t-${esc(String(th.label).toLowerCase())}"><b>Against the heroes now: ${esc(th.label)}.</b> ${th.avg !== undefined ? `They'd lose about ${Math.round(Math.min(1, th.avg) * 100)}% of their health.` : ''}</p><p class="hint">${esc(THREAT_TXT[th.label] || '')}</p>` : '<p class="hint">Sizing them up against the heroes…</p>';
        return `<section class="panel sel bpanel${ui.mode === 'patrol' ? ' placing' : ''}">${img('unit-' + o.type, 'selimg')}<div>${close}<h2 class="cap">${esc(G.bandName(o))}${L > 1 ? ` <span class="lv">Lv ${L}</span>` : ''}</h2>
          <p>${from} ${doing}${o.known ? ' The heroes know they\'re here.' : ''}</p>${siege}${thr}${wildBlock(o)}
          <div class="mmenu"><button class="mbtn${ui.mode === 'patrol' ? ' on' : ''}" data-act="bpatrol" title="${o.wave ? 'Leave the war camp. Click a spot: they patrol between here and there instead' : `${TOUCHY() ? 'Tap' : 'Click'} a spot: they walk back and forth between here and there`}">${MICON.patrol}<span>Patrol</span></button><button class="mbtn" data-act="blevel"${lerr ? ` disabled title="${esc(lerr)}"` : ` title="+2 to hit, +1 AC, +30% hit points, +1 damage, and a fifth more of them"`}>${MICON.level}<span>Level up${lc ? ` · ${lc.gold} gold` : ''}</span></button><button class="mbtn" data-act="bcamp"${o.wave ? ' disabled' : ''} title="March to the war camp outside Millbrook and join the next assault">${img('unit-mb-gate', 'aico')}<span>To camp</span></button><button class="mbtn" data-act="baway" title="They leave the map for good">${MICON.away}<span>Go away</span></button></div>
          ${ui.mode === 'patrol' ? `<p class="hint placehint"><b>Click where they should patrol to</b> (explored ground within ${G.PATROL_RANGE} tiles).${o.wave ? ' They stop marching on Millbrook.' : ''} ${TOUCHY() ? 'Press and hold to cancel.' : 'Right-click or Esc to cancel.'}</p>` : o.patrol ? '<div class="row"><button class="btn sm" data-act="bhold">Stop patrolling</button></div>' : o.wave ? `<p class="hint">Level them up to hit harder, or ${RCLK()} the map to make them patrol instead.</p>` : `<p class="hint">${RCLK(1)} the map to set a patrol.</p>`}${bountyRow({ kind: 'obj', id: o.id })}</div></section>`;
      }
      if (o.kind === 'relic') {
        const out = G.villainOnMap(S); const busy = S.villain.state === 'banished' || S.march;
        return `<section class="panel sel relcard">${img('obj-artifact', 'selimg')}<div>${close}<h2 class="cap">${TIER_NAME[o.tier] || 'A relic'}</h2>
          <p>Something old and dark lies buried here, near ${esc(G.regionName(S, o.x, o.y))}. Only ${esc(VN())} can sense it; the heroes walk right past.</p>
          <p class="hint">Send ${esc(VN())} to claim it: it goes into the bag, or straight onto an empty slot. ${o.tier === 3 ? 'Legendary relics lie far from the tower.' : ''}</p>
          <div class="row"><button class="btn sm primary" data-act="vgo" data-id="${o.id}"${busy ? ' disabled' : ''}>Send ${esc(VN())}</button>${busy ? `<span class="hint">${S.march ? 'The heroes are marching on you.' : `${esc(capWord(VP().he))} is recovering.`}</span>` : out ? '' : `<span class="hint">${esc(capWord(VP().he))} rides out from the tower.</span>`}</div></div></section>`;
      }
      const name = o.kind === 'dungeon' ? G.DUNGEONS[o.dtype].name : (G.ITEMS[o.kind] || { name: 'Something' }).name;
      return `<section class="panel sel">${img(o.kind === 'dungeon' ? 'obj-' + o.dtype : 'obj-' + o.kind, 'selimg')}<div>${close}<h2 class="cap">${esc(name)}</h2><p class="hint">${o.wild ? 'The world put this here, not you. ' : ''}${o.known ? 'The heroes know it is here.' : 'The heroes haven\'t found it yet.'}</p>${isTrapKind(o.kind) ? '' : bountyRow({ kind: 'obj', id: o.id })}${o.kind === 'artifact' ? `<p class="hint">${esc(VN())} can seize it before the heroes do, and twist it into a relic.</p><div class="row"><button class="btn sm" data-act="vgo" data-id="${o.id}"${S.villain.state === 'banished' || S.march ? ' disabled' : ''}>Send ${esc(VN())}</button></div>` : ''}</div></section>`;
    }
    if (sel.type === 'site') {
      const site = G.siteOf(S, sel.id);
      const qable = (site.kind === 'landmark' && !S.visited[site.id]) || site.kind === 'tower';
      return `<section class="panel sel">${img(siteIcon(site), 'selimg')}<div>${close}<h2 class="cap">${esc(site.name)}</h2><p class="hint">${esc(site.text)}</p>${site.kind === 'town' && S.town ? `<p class="hint">${esc(G.wallName(S))} ${Math.round(S.town.wallHp)}/${G.WALL_HP[G.townLv(S, 'walls')] || 0} · hall ${Math.round(S.town.hall)}/${G.hallMax(S)}. Burn the hall to the ground and the realm is yours.</p>` : site.kind === 'tower' ? '<div class="row"><button class="btn sm" data-act="tower">Open the tower</button></div>' : ''}${qable ? bountyRow({ kind: 'site', id: site.id }) : ''}</div></section>`;
    }
    return '';
  }
  // 0.31: a band of the wilds: its level against your villain's, and what you could try
  function wildBlock(o) {
    const ml = monLevel(o); if (!ml) return '';
    const opt = G.parleyOptions(S, o); const T = G.temperOf(S, o);
    const tries = opt.tooHigh ? 'Too strong to bargain with: they would only fight.' : [opt.pay ? `pay ${opt.pay.cost} gold` : null].concat(opt.talk.filter(t => t.dc !== null).map(t => `${t.name.toLowerCase()} ${Math.round(t.p * 100)}%`)).filter(Boolean).join(', ');
    return `<div class="wildb"><p><span class="mlv c-${ml.cls}">Level ${ml.L}</span> ${esc(VN())} is level ${opt.vlevel}: they're ${MLV_TXT[ml.cls]}.</p><p class="hint">${esc(T.text)} ${opt.tooHigh ? esc(tries) : `Win them over: ${esc(tries)}.`}${opt.sulking ? ' They won\'t talk again for a few days.' : ''}</p>
      <div class="row"><button class="btn sm" data-act="vgo" data-id="${o.id}"${S.villain.state === 'banished' || S.march ? ' disabled' : ''}>Send ${esc(VN())}</button></div></div>`;
  }
  function updateSoundBtn() { const b = $('b-sound'); if (!b || !window.SND) return; b.classList.toggle('off', SND.muted); b.setAttribute('aria-pressed', SND.muted ? 'true' : 'false'); b.title = SND.muted ? 'Sound is off. Click to turn it on.' : 'Sound is on. Click to mute (volumes are in Settings).'; }
  function renderSide() {
    const el = $('sidebody'); if (!el || !S) return;
    syncAudio(); lootCheck(!ui.items); talentNews(); voiceWatch();
    const keep = el.scrollTop; const P = S.party;
    const waiting = S.heroes.filter(h => h.status === 'waiting');
    const nl = G.builtLairs(S).length; const nb = towerBadge();
    const shown = partyShown();
    const goal = S.march ? 'the Dark Tower, for the final showdown' : P.goal ? P.goal : 'nowhere yet';
    el.innerHTML = `
      <section class="panel"><div class="heroes">${S.heroes.map(heroRow).join('')}</div>
        <div class="phead">${shown || S.march ? `<p class="heading" title="${esc(P.intent.join(' '))}"><span class="k">Heading for</span> <b>${esc(goal)}</b></p>` : `<p class="heading" title="The heroes walk in the fog: you only see them where your tower, minions, lairs, bands or villain can."><span class="k">In the fog</span> <b>${esc(lastSeenText())}</b></p>`}<button class="partybtn" data-act="party" title="All four heroes side by side: health, damage, skills and artifacts (P)">Party<kbd>P</kbd></button></div>
        ${waiting.length ? `<p class="hint">${waiting.map(h => esc(h.name)).join(' and ')} wait${waiting.length > 1 ? '' : 's'} at the Millbrook tavern to join the party.</p>` : ''}</section>
      <div id="selwrap">${selPanel()}</div>
      <button class="vilbtn${S.villain.meet ? ' hot' : ''}" data-act="vsel" title="Your villain on the map (V). Select ${esc(VN())}, then ${RCLK()} a band of the wilds to win it over, or anywhere to walk there.">${img(vIcon(), 'cicon')}<span><b>${esc(VN())} · Lv ${G.villainLevel(S)}</b><small>${villainLine()}</small><small class="vban" title="How many bands of the wilds follow you at once. One more every ${G.CMD_PER} levels.">Banner ${G.commanded(S)} of ${G.commandCap(S)}</small>${relicStrip()}</span><kbd>V</kbd></button>
      <button class="towerbtn" data-act="tower">${img(siteIcon({ id: 'tower' }), 'cicon')}<span><b>Your tower</b><small>${nl} lair${nl === 1 ? '' : 's'} · ${S.minions.length} ${esc(MT().name.toLowerCase())}${nb ? ` · ${nb} idle` : ''}${(S.summons || []).length ? ` · ${S.summons.length} summoning` : ''}${G.talentFree(S) ? ` · <b class="gold">${G.talentFree(S)} talent point${G.talentFree(S) > 1 ? 's' : ''}</b>` : ''}${S.base.libBuild ? ' · library going up' : ''}</small></span>${G.talentFree(S) ? `<i class="badge pts" title="Talent points to spend">${G.talentFree(S)}</i>` : nb ? `<i class="badge">${nb}</i>` : ''}</button>
      ${S.town ? townBtn() : ''}`;
    el.scrollTop = keep;
    if (ui.scrollTo) { const t = $('selwrap'); if (t && t.firstElementChild) el.scrollTop = Math.max(0, t.offsetTop - el.offsetTop - 4); ui.scrollTo = null; }
    const btn = $('endday');
    if (btn) { btn.disabled = ui.moving || S.phase !== 'map'; btn.querySelector('span').textContent = ui.night ? 'Night falls…' : ui.moving ? 'Travelling…' : 'End day'; }
    if (ui.screen) renderScreen();
    renderBar(); renderActions(); phoneSync();
  }
  // 0.37: when the week's assault comes
  const daysToAssault = () => S.day >= 7 ? 'tonight' : `in ${8 - S.day} days`;
  // the sidebar's Millbrook card: its walls and hall, what it's building, and any bounty on your lairs
  function townBtn() {
    const T = S.town; const wm = G.WALL_HP[G.townLv(S, 'walls')] || 0; const hm = G.hallMax(S); const nq = S.quests.filter(q => q.status === 'open').length;
    const camp = G.campCount(S);
    const doing = T.build ? `building ${T.build.k === 'walls' ? G.TOWN_B.walls.names[G.townLv(S, 'walls')].toLowerCase() : G.TOWN_B[T.build.k].name.toLowerCase()}` : 'saving up';
    return `<button class="towerbtn townbtn" data-act="town" title="Millbrook: its walls, and the hall your waves have to burn down to win. Click to see it on the map.">${img('obj-town', 'cicon')}<span><b>Millbrook</b><small>${esc(G.wallName(S))} ${Math.round(T.wallHp)}/${wm} · hall ${Math.round(T.hall)}/${hm} · ${esc(doing)}${nq ? ` · ${nq} bount${nq > 1 ? 'ies' : 'y'} on you` : ''}</small>${hpBar(T.hall, hm, 'hall')}${camp ? `<small class="campline">War camp: <b>${camp}</b> monsters · assault ${daysToAssault()}</small>` : ''}</span>${camp ? `<i class="badge" title="${camp} monsters in your war camp">${camp}</i>` : ''}</button>`;
  }
  // the villain's level and the Infamy to the next one
  function villainXpHtml() {
    const L = G.villainLevel(S); const lo = G.VXP[L] || 0, hi = G.villainNext(S); const xp = S.villain.xp || 0;
    return `<div class="vxp"><span class="k">Infamy</span>${hpBar(hi ? xp - lo : 1, hi ? hi - lo : 1, 'inf')}<small>${hi ? `${Math.floor(xp)} / ${hi} to level ${L + 1}` : `${Math.floor(xp)}, the highest level there is`}</small></div>`;
  }
  function renderBar() {
    if (!S) return;
    for (const k of G.RES_KEYS) { const e = $('b-' + k); if (e) e.textContent = Math.floor(S.res[k] || 0); const t = $('b-m' + k); if (t) t.textContent = Math.floor((S.town && S.town.res[k]) || 0); }
    { const e = $('b-food'); if (e) { const fu = G.foodUsed(S), fc = G.foodCap(S); e.textContent = fu + '/' + fc; const w = $('b-foodw'); if (w) w.classList.toggle('full', fu >= fc); } }   // 0.39
    { const tp = $('b-tpic'); const key = siteIcon({ id: 'tower' }); if (tp && A.URI[key] && tp.dataset.k !== key) { tp.src = A.URI[key]; tp.dataset.k = key; } }
    { const tb = $('b-townbusy'); if (tb) { const B = S.town && S.town.build; tb.hidden = !B; if (B) tb.title = `Building: ${G.TOWN_B[B.k].name}, ${B.days} day${B.days > 1 ? 's' : ''} left`; } }
    { const L = G.villainLevel(S); const lo = G.VXP[L] || 0, hi = G.villainNext(S); const xp = S.villain.xp || 0;
      $('b-vlv').textContent = 'Lv ' + L; $('b-inf').textContent = hi ? `${Math.floor(xp)}/${hi}` : Math.floor(xp);
      $('b-infbar').style.width = (hi ? Math.max(0, Math.min(1, (xp - lo) / (hi - lo))) * 100 : 100).toFixed(0) + '%';
      $('g-inf').title = `${VN()} is level ${L}. ${hi ? `${Math.ceil(hi - xp)} more Infamy to level ${L + 1}.` : 'The highest level there is.'} Hurting and killing heroes, breaking into Millbrook, plunder and every lair you keep standing earn Infamy. Each level makes your villain stronger on the throne and gives a talent point.`; }
    $('b-date').innerHTML = `<span class="dw">Week ${S.week} · </span>Day ${S.day}`;
    { const dd = $('drawdot'); if (dd) { const n = G.talentFree(S); dd.hidden = !n; dd.textContent = n || ''; dd.title = n ? `${n} talent point${n > 1 ? 's' : ''} to spend` : ''; } }
    { const c = $('b-camp'); if (c) { const n = G.campCount(S); c.hidden = !n; if (n) { c.innerHTML = `${img('unit-mb-gate', 'ci')}War camp <b>${n}</b><span class="cx"> · assault ${daysToAssault()}</span>`; c.title = `Your war camp outside Millbrook: ${n} monsters. The assault: ${daysToAssault()}. Waves and recruits gather there; when the week ends, the whole camp storms the town.`; c.classList.toggle('soon', S.day >= 6); } } }
    const fx = G.WEEKS_FX[S.weekFx]; $('b-week').textContent = fx.name; $('b-week').title = fx.text;
    $('b-lvl').textContent = 'Lv ' + G.avgLevel(S);
    const r = G.readiness(S); const rd = $('b-ready');
    // 0.30: from your side, the heroes being ready is the danger
    rd.textContent = S.march ? 'Marching on you!' : r.win === null ? 'No threat yet' : r.ready ? 'Ready to march' : r.label === 'Almost ready' ? 'Almost ready' : `${Math.round(r.win * 100)}% odds`;
    rd.className = 'ready ' + (S.march ? 'march' : r.ready ? 'r-bad' : r.label === 'Almost ready' ? 'r-near' : 'r-ok');
    rd.title = r.win === null ? `Until they reach level ${Math.max(G.MARCH_LV, G.villainLevel(S) - 6)} the heroes don't even think about the Dark Tower.` : `They think they'd beat ${VN()} on the throne about ${Math.round(r.win * 100)}% of the time. They march at ${Math.round(r.need * 100)}%.`;
  }
  // a new day: offer a fair fight right away, so the usual move is one click
  function morning() {
    if (S && S.phase === 'map' && !ui.moving && G.meetBand(S)) { setTimeout(() => { if (!ui.modal && G.meetBand(S)) showParley(); }, 400); }
    else if (S && (S.relicNews || []).length) setTimeout(() => relicNews(), 700);   // 0.36: a relic turned up in the night
  }

  /* ============ the tower screen ============ */
  function openScreen(k) {
    if (!ui.screen) sfx('open', { vol: 0.8 });
    ui.screen = k || 'tower'; ui.hover = null; syncAudio();
    renderScreen(true); renderSide(); drawMap();
  }
  function closeScreen() {
    if (!ui.screen) return;
    unmountView(); ui.screen = null; syncAudio(); const el = $('screen'); el.hidden = true; el.innerHTML = '';
    renderSide(); drawMap();
  }
  /* ============ the Dark Tower: tabs for the tower, talents, lairs and the villain ============ */
  // 0.36: the villain first (with the relics), then talents, lairs, the servants and the library, and the tower's grounds
  const TOWER_TABS = [['villain', 'Villain'], ['talents', 'Talents'], ['lairs', 'Lairs'], ['servants', 'Servants'], ['view', 'Grounds']];
  function scrTower() {
    if (ui.towerTab === 'research') ui.towerTab = 'talents'; if (ui.towerTab === 'tower') ui.towerTab = 'servants';
    const tab = TOWER_TABS.some(([k]) => k === ui.towerTab) ? ui.towerTab : 'villain'; ui.towerTab = tab; const nl = G.myLairs(S).length; const ns = (S.summons || []).length; const tf = G.talentFree(S);
    const rn = (S.relicNews || []).length;
    const badge = { servants: ns ? `<i class="tb busy" title="${ns} being summoned">${ns}</i>` : '', talents: tf ? `<i class="tb pts" title="${tf} talent point${tf > 1 ? 's' : ''} to spend">${tf}</i>` : '', lairs: nl ? `<i class="tb">${nl}</i>` : '', villain: '', view: '' };
    const tabs = `<nav class="ttabs" role="tablist">${TOWER_TABS.map(([k, n], i) => `<button class="ttab${k === tab ? ' on' : ''}" role="tab" aria-selected="${k === tab}" data-act="ttab" data-k="${k}" title="${n} (${i + 1})">${n}${badge[k] || ''}</button>`).join('')}</nav>`;
    if (tab === 'view') return `${tabs}<div class="tvslot"></div>`;
    const body = tab === 'talents' ? towerTalents() : tab === 'lairs' ? towerLairs() : tab === 'servants' ? towerHome() : towerVillain();
    return `${tabs}<div class="tpanel t-${tab}">${body}</div>`;
  }
  // a talent's picture: a lair's own, the villain for powers and the showdown, the monster it improves, or something to do with the work
  function talentIcon(k) {
    const T = G.TALENTS[k]; if (!T) return 'obj-lore';
    if (T.lair) return 'obj-' + k;
    if (T.power) return vIcon();
    const F = T.fx || {};
    if (F.villain || F.infamy || F.guards) return F.guards ? 'unit-knight' : vIcon();
    if (F.mod) return F.mod.units === 'all' ? 'unit-demon' : 'unit-' + F.mod.units[F.mod.units.length - 1];
    if (F.rate) return F.rate.all ? 'obj-warren' : 'unit-' + F.rate.units[F.rate.units.length - 1];
    if (F.summonCost || F.minions || F.summonDays) return minionIcon();
    if (F.buildDays || F.empire) return 'obj-building';
    if (F.yield) return F.yield.gold && !F.yield.ore ? 'obj-node-gold' : F.yield.ore ? 'obj-mine' : 'obj-node-lumber';
    if (F.nightly || F.perLair || F.bandCost) return 'obj-res-gold';
    if (F.townTithe) return 'obj-tourney';
    if (F.reach) return 'obj-camp';
    if (F.sight) return 'obj-lore';
    if (F.warded) return 'obj-wrecked';
    if (F.bands || F.cap || F.vets) return 'obj-den';
    if (F.groundsCost) return 'obj-building';
    if (F.militia) return 'unit-militia';
    if (F.points) return 'obj-lore';
    return 'obj-lore';
  }
  const tLabel = (k, rank) => G.talentName(k) + (G.talentRanks(k) > 1 && rank ? ' ' + G.roman(rank) : '');
  // the minions' card and the Library's card: on the Tower tab, and over the tower's view when you click them
  function summonCard() {
    const mt = MT(); const idle = G.idleMinions(S); const terr = G.trainCheck(S); const sd = G.summonDays(S);
    return `<div class="vmini">${img(minionIcon(), 'vportrait')}<div><p><b>${S.minions.length}</b> serve you, <b>${idle.length}</b> idle${(S.summons || []).length ? `, <b>${S.summons.length}</b> being summoned` : ''}.</p><p class="hint">${esc(mt.text)} They walk about ${mt.perk === 'fast' ? 18 : 9} tiles a day and are your eyes: the map stays dark where none of them have been.</p></div></div>
        <div class="row"><button class="btn sm" data-act="train"${terr ? ' disabled' : ''}>Summon one · ${sd} night${sd > 1 ? 's' : ''}</button>${priceChips({ gold: G.minionCost(S) })}${terr && !/gold/.test(terr) ? `<span class="hint">${esc(terr)}</span>` : ''}</div>
        ${summonQueue()}`;
  }
  function libraryCard() {
    const lib = G.libraryLevel(S); const lerr = G.libraryCheck(S);
    return `<p class="hint">${lib ? `Your scholars have given you ${lib > 1 ? 'two talent points' : 'a talent point'}.` : 'Not built yet. Each level is one more talent point to spend.'}</p>${gDetail('library', true)}`;   // 0.39: built like the rest of the Grounds
  }
  function towerHome() {
    const mt = MT(); const d = S.lastDay;
    return `<div class="tgrid">
      <section class="tcard"><h2 class="cap">${esc(mt.name)}</h2>${summonCard()}</section>
      <section class="tcard"><h2 class="cap">The Forbidden Library</h2>${libraryCard()}</section>
      <section class="tcard"><h2 class="cap">The Grounds</h2><p class="hint">Buildings around the tower raise your limits: food for more lairs, room for more minions, weapons and armour for every monster. Your lairs eat <b>${G.foodUsed(S)}</b> of <b>${G.foodCap(S)}</b> food.${G.groundsBuilds(S).length ? ` Going up: ${G.groundsBuilds(S).map(b => esc(G.GROUNDS[b.k].name)).join(', ')}.` : ''}</p><div class="row"><button class="btn sm" data-act="ttab" data-k="view">Open the Grounds</button></div></section>
      ${d ? `<section class="tcard"><h2 class="cap">Last night</h2><p class="hint">${G.RES_KEYS.map(k => `+${d.res[k]} ${k}`).join(', ')}${d.raised && d.raised.length ? '. Your lairs raised ' + d.raised.map(([t, n]) => `${n} ${G.CREATURES[t].name.toLowerCase()}`).join(', ') : ''}.</p></section>` : ''}
    </div>`;
  }
  /* --- talents (0.24): four trees, World of Warcraft style --- */
  function tInfo(k) {
    const have = G.tRank(S, k), max = G.talentRanks(k); const err = G.talentCheck(S, k);
    if (have >= max) return { st: 'maxed', have, max, err };
    if (!err) return { st: 'avail', have, max };
    if (/No talent points/.test(err)) return { st: have ? 'part' : 'ready', have, max, err };
    return { st: have ? 'part' : 'locked', have, max, err };
  }


  /* --- the talent web (0.31): every talent a node around your villain's sigil; take one next to one you have --- */
  const REG_NAME = r => r === 4 ? (G.TREES['v-' + S.villain.type] || {}).name || 'Your own path' : G.TREES[G.T_REGIONS[r].id].name;
  const REG_BLURB = r => r === 4 ? (G.TREES['v-' + S.villain.type] || {}).blurb || '' : G.TREES[G.T_REGIONS[r].id].blurb;
  const octa = (r, k) => { const pts = []; for (let i = 0; i < 8; i++) { const a = (i * 45 + 22.5) * Math.PI / 180; pts.push((r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1)); } return `<polygon class="${k}" points="${pts.join(' ')}"/>`; };
  function webState() {
    const W = G.webOf(S); const own = new Set(G.ownedNodes(S)); const free = G.talentFree(S);
    const st = id => own.has(id) ? 'own' : G.nodeOpen(S, id) ? (free > 0 ? 'open' : 'near') : 'lock';
    const sel = ui.tsel && W.nodes[ui.tsel] ? ui.tsel : null;
    const path = sel && !own.has(sel) ? (G.talentPath(S, sel) || []) : [];
    return { W, own, free, st, sel, path: new Set(path), pathList: path };
  }
  function webSvg(X) {
    const { W, own, st, sel, path } = X; const R = 540;
    const wedge = i => { const a0 = (-120 + i * 60) * Math.PI / 180, a1 = (-60 + i * 60) * Math.PI / 180; return `M0 0 L${(R * Math.cos(a0)).toFixed(1)} ${(R * Math.sin(a0)).toFixed(1)} A${R} ${R} 0 0 1 ${(R * Math.cos(a1)).toFixed(1)} ${(R * Math.sin(a1)).toFixed(1)}Z`; };
    const defs = G.T_REGIONS.map((g, i) => `<radialGradient id="twg${i}" cx="0" cy="0" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0.1" stop-color="${g.color}" stop-opacity="0"/><stop offset="0.75" stop-color="${g.color}" stop-opacity=".16"/><stop offset="1" stop-color="${g.color}" stop-opacity=".02"/></radialGradient>`).join('');
    const seps = G.T_REGIONS.map((g, i) => { const a = (-120 + i * 60) * Math.PI / 180; return `<line class="tsep" x1="${(62 * Math.cos(a)).toFixed(1)}" y1="${(62 * Math.sin(a)).toFixed(1)}" x2="${(R * Math.cos(a)).toFixed(1)}" y2="${(R * Math.sin(a)).toFixed(1)}"/>`; }).join('');
    const labels = G.T_REGIONS.map((g, i) => { const a = (-90 + i * 60) * Math.PI / 180, r = 538; return `<text class="treg" x="${(r * Math.cos(a)).toFixed(1)}" y="${(r * Math.sin(a) + 8).toFixed(1)}" fill="${g.color}">${esc(REG_NAME(i))}</text>`; }).join('');
    const links = W.links.map(([a, b]) => {
      const A = W.nodes[a], B = W.nodes[b]; const oa = own.has(a), ob = own.has(b);
      const cls = oa && ob ? 'on' : (path.has(a) || oa) && (path.has(b) || ob) && (path.has(a) || path.has(b)) ? 'path' : oa || ob ? 'near' : 'off';
      return `<line class="tl ${cls}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }).join('');
    const hubLinks = W.list.filter(n => n.start).map(n => `<line class="tl ${own.has(n.id) ? 'on' : path.has(n.id) ? 'path' : 'hub'}" x1="0" y1="0" x2="${n.x}" y2="${n.y}"/>`).join('');
    const nodes = W.list.map(n => {
      const c = G.T_REGIONS[n.reg].color; const s0 = st(n.id); const T = G.TALENTS[n.t];
      const r = n.kind === 'k' ? 27 : n.kind === 'n' ? 19 : 12;
      const shape = n.kind === 'm' ? `<circle class="tsh" r="${r}"/><circle class="tdot" r="4.5"/>` : (n.kind === 'k' ? octa(r + 6, 'tring') : '') + octa(r, 'tsh') + `<image href="${A.URI[talentIcon(n.t)] || ''}" x="${-r * 0.72}" y="${-r * 0.72}" width="${r * 1.44}" height="${r * 1.44}" class="tico"/>`;
      const rk = n.of > 1 ? ' ' + G.roman(n.rank) : '';
      return `<g class="tn k-${n.kind} s-${s0}${n.id === sel ? ' sel' : ''}${path.has(n.id) ? ' path' : ''}" style="--c:${c}" transform="translate(${n.x} ${n.y})" data-act="tnode" data-id="${n.id}" role="button" tabindex="0" aria-label="${esc(G.talentName(n.t) + rk)}"><title>${esc(G.talentName(n.t) + rk)}${T.lair ? ' (new lair)' : T.power ? ' (dark power)' : T.keystone ? ' (keystone)' : ''}</title>${shape}</g>`;
    }).join('');
    const hub = `<g class="thub"><circle r="54" class="thring"/><clipPath id="thclip"><circle r="46"/></clipPath><image href="${A.URI[vIcon()] || ''}" x="-46" y="-46" width="92" height="92" clip-path="url(#thclip)"/></g>`;
    return `<svg class="twsvg" viewBox="-560 -560 1120 1120" role="img" aria-label="Talent web"><defs>${defs}<filter id="twglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      ${G.T_REGIONS.map((g, i) => `<path class="twedge" d="${wedge(i)}" fill="url(#twg${i})"/>`).join('')}${seps}${labels}<g class="tls">${hubLinks}${links}</g>${hub}<g class="tns">${nodes}</g></svg>`;
  }
  function webSide(X) {
    const { W, own, free, sel, pathList } = X;
    if (!sel) return `<h3>The talent web</h3><p class="hint">Start at any of the six talents around ${esc(VN())}'s sigil. Each new talent has to join one you already have, so the way you go decides what you can reach. A campaign earns about two dozen points; the web holds ${W.list.length} talents.</p>
      <ul class="tlegend"><li><i class="lg m"></i>Small talents, often a rank of a bigger one</li><li><i class="lg n"></i>Notable: a new lair, a dark power or a big effect</li><li><i class="lg k"></i>Keystone: build-defining, sometimes with a cost</li><li><i class="lg own"></i>Learned</li><li><i class="lg open"></i>Can be learned now</li></ul>
      <p class="hint">Pick a talent to see what it does and the way to it.</p>${G.T_REGIONS.map((g, i) => `<p class="treglist"><b style="color:${g.color}">${esc(REG_NAME(i))}.</b> <span class="hint">${esc(REG_BLURB(i))}</span></p>`).join('')}`;
    const n = W.nodes[sel]; const T = G.TALENTS[n.t]; const c = G.T_REGIONS[n.reg].color;
    const kindL = T.lair ? 'New lair' : T.power ? 'Dark power' : n.kind === 'k' ? 'Keystone' : n.kind === 'n' ? 'Notable' : 'Talent';
    let extra = '';
    if (T.lair) { const D = G.DUNGEONS[n.t]; extra = `<p class="hint">About ${D.rate} ${esc(G.CREATURES[D.unit].name.toLowerCase())} a night. To build: ${esc(G.priceText(G.buildPrice(n.t)))}, ${G.lairDays(S, n.t)} days of work.</p>`; }
    const rank = n.of > 1 ? `<p class="hint">Rank ${n.rank} of ${n.of}: each ${esc(G.talentName(n.t))} node adds one. You have ${G.tRank(S, n.t)}.</p>` : '';
    let act;
    if (own.has(sel)) act = '<p class="good">Learned.</p>';
    else if (!pathList.length) act = '<p class="hint warn">Out of reach.</p>';
    else if (pathList.length === 1) act = free ? `<button class="btn big" data-act="tlearn" data-id="${sel}">Learn · 1 point</button>` : '<p class="hint">Next to a talent you have. You need a talent point: your villain earns one every level.</p>';
    else act = `<p class="hint">${pathList.length - 1} talent${pathList.length > 2 ? 's' : ''} on the way: ${pathList.slice(0, -1).map(id => esc(G.talentName(W.nodes[id].t))).join(', ')}.</p>` + (free >= pathList.length ? `<button class="btn big" data-act="tpath" data-id="${sel}">Learn the way · ${pathList.length} points</button>` : `<p class="hint">That takes ${pathList.length} points; you have ${free}.</p>`);
    return `<p class="tkind" style="color:${c}">${esc(REG_NAME(n.reg))} · ${kindL}</p><h3>${esc(G.talentName(n.t))}${n.of > 1 ? ' ' + G.roman(n.rank) : ''}</h3>
      <div class="tsel-row">${img(talentIcon(n.t), 'tsel-ico')}<p>${esc(G.talentText(n.t))}</p></div>${extra}${rank}<div class="tact">${act}</div><button class="lnk" data-act="tnode" data-id="">Back to the legend</button>`;
  }
  function towerTalents() {
    const tf = G.talentFree(S), earned = G.talentEarned(S); const T = S.talents || {};
    const lv = Math.max(0, G.villainLevel(S) - 1); const lib = G.libraryLevel(S);
    const rerr = G.resetCheck(S); const L = G.villainLevel(S), lo = G.VXP[L] || 0, hi = G.villainNext(S), xp = S.villain.xp || 0;
    const head = `<div class="twhead"><div class="tpts${tf ? ' has' : ''}"><b>${tf}</b><span>talent point${tf === 1 ? '' : 's'}<br>to spend</span></div>
        <div class="treset"><button class="btn sm" data-act="treset"${rerr ? ' disabled' : ''} title="${esc(rerr || 'Get every point back to spend again. Lairs already built keep working.')}">Unlearn all</button><small>free once a week</small></div></div>
      <p class="hint tearn">${earned} earned: 1 to start, ${lv} from ${esc(VN())}'s levels${lib ? `, ${lib} from the Library` : ''}${G.talentFx(S).points ? `, ${G.talentFx(S).points} from your own talents` : ''}.${T.redrawn ? ' <b>The talents are a web now: every point you had is back to spend.</b>' : ''}</p>
      <div class="tinf" title="Hurting and killing heroes, breaking into Millbrook, beating the monsters of the wilds and every lair you keep standing earn Infamy. Every level is another talent point."><span>Infamy</span>${pbar(hi ? (xp - lo) / (hi - lo) : 1, 'summon')}<small>${hi ? `${Math.floor(xp)} / ${hi} to level ${L + 1}` : `level ${L}, the highest`}</small></div><hr class="tsplit">`;
    const X = webState();
    return `<div class="tweb"><div class="twmap">${webSvg(X)}</div><aside class="tside">${head}${webSide(X)}</aside></div>`;
  }
  function towerLairs() {
    const rows = G.myLairs(S).map(o => {
      const D = G.DUNGEONS[o.dtype]; const wr = G.lairWrecked(S, o); const bands = G.bandsOf(S, o); const tot = o.buildTotal || G.buildDays(o.dtype);
      const st = o.building ? `<div class="prow">${pbar(1 - o.building / tot, 'build')}<small>going up, ${o.building} of ${tot} days left</small></div>` : wr ? `<p class="hint warn">Wrecked by the heroes: rebuilt in ${o.wrecked - G.dayIndex(S)} days.</p>` : `<p class="hint">${G.lairCount(o)} ${esc(G.CREATURES[D.unit].name.toLowerCase())} at home${G.wavesOf(S, o) ? ', a wave on the road' : ''}${bands - G.wavesOf(S, o) > 0 ? `, ${bands - G.wavesOf(S, o)} band${bands - G.wavesOf(S, o) > 1 ? 's' : ''} out` : ''}.${G.questOn(S, { kind: 'obj', id: o.id }) ? ' <b class="warn">Millbrook has a bounty on it.</b>' : ''}</p>`;
      return `<div class="lcard">${img(o.building ? 'obj-building' : wr ? 'obj-wrecked' : 'obj-' + o.dtype, 'licon')}<div><b>${esc(D.name)}${(o.level || 1) > 1 ? ' II' : ''}</b><small>${esc(G.regionName(S, o.x, o.y))}</small>${st}</div><button class="btn sm" data-act="sellair" data-id="${o.id}">Show</button></div>`;
    }).join('');
    const fu = G.foodUsed(S), fc = G.foodCap(S);
    return `<section class="tcard"><h2 class="cap">Your lairs</h2><p class="hint">To build one, select a minion on the map and pick Build. New kinds of lair come from talents: The Brood, and your villain's own path.</p><p class="${fu >= fc ? 'warn' : 'hint'}">${img('obj-food', 'ric')} Your lairs eat <b>${fu}</b> of the <b>${fc}</b> food your Farm grows (1 for a small lair, 2 for a middling one, 3 for the greatest). <button class="lnk" data-act="gsel" data-k="farm">The Farm</button></p>${rows ? `<div class="lcards">${rows}</div>` : '<p class="hint">No lairs yet.</p>'}</section>`;
  }
  function towerVillain() {
    const T = VT(); const est = ui.finaleEst; const V = S.villain;
    const gate = G.gateGuards(S).map(([t, n]) => `${n} ${G.CREATURES[t].name}`).join(', ');
    const pw = T.powers.map((k, i) => { const at = G.POWER_LV[i] || 1; const on = G.villainLevel(S) >= at; return `<li class="${on ? 'on' : 'off'}"><b>${esc(G.BOSS_POWERS[k].name)}.</b> ${on ? esc(G.BOSS_POWERS[k].text) : `<i>Learned at level ${at}.</i>`}</li>`; }).join('');
    const dark = ['vigor', 'raise', 'dread', 'ritual'].map(k => { const U = G.LAIR[k]; const n = V.up[k] || 0; return `<li class="${n ? 'on' : 'off'}">${img(vIcon(), 'ticon')}<span><b>${esc(U.name)}${U.max > 1 ? ` · ${n} of ${U.max}` : n ? '' : ''}</b><small>${n ? esc(U.text) : 'Not learned yet.'}</small></span></li>`; }).join('');
    return `<div class="tgrid two">
      <section class="tcard"><h2 class="cap">${esc(VF())}</h2><div class="vmini">${img(vIcon(), 'vportrait')}<div><p class="fxname">${esc(T.label)} · level ${G.villainLevel(S)}</p>${villainXpHtml()}<p class="hint">On the throne ${esc(VP().he)} fights at the level ${esc(VP().he)} has reached. If the heroes win that fight, your reign is over.</p><ul class="plain pw">${pw}</ul></div></div>
        ${readinessHtml(true)}<p class="hint">At the gates today: ${esc(gate)}. Then the throne room.</p>
        <div class="row"><button class="btn sm" data-act="scoutfinale">Scout the showdown</button>${est ? `<span class="est ${est.win >= 0.6 ? 'Tense' : est.win >= 0.3 ? 'Harrowing' : 'Deadly'}">They win ${Math.round(est.win * 100)}%${est.gateLoss >= 0.1 ? ` · ${Math.round(est.gateLoss * 100)}% fall at the gates` : ''}</span>` : ''}</div></section>
      ${attrsCard()}
      ${relicsCard()}
      <section class="tcard"><h2 class="cap">Dark powers</h2><p class="hint">Talents in the Dread region of the web. They make the final fight harder, and more memorable.</p><ul class="plain dpw">${dark}</ul>
        <div class="row"><button class="btn sm" data-act="ttab" data-k="talents">Talents</button></div></section>
    </div>`;
  }
  /* ============ Millbrook: the heroes' town. The game runs it now (0.30); you can only spy on it ============ */
  const OUTLOOK_CLS = { Crushed: 'Trivial', Repelled: 'Easy', 'Breaks in': 'Tense', 'Sacks the town': 'Deadly' };

  const hpBar = (v, max, cls) => `<span class="hpline ${cls || ''}"><i style="width:${(max ? Math.max(0, Math.min(1, v / max)) * 100 : 0).toFixed(0)}%"></i></span>`;




  // the bounty line on a map card: Millbrook has put a price on it
  function bountyRow(ref) {
    if (!S.town || S.phase !== 'map') return '';
    const q = G.questOn(S, ref);
    return q ? `<p class="bounty on">${img('obj-quest', 'ric')}<span>Millbrook has put a bounty on it: <b>${esc(G.rewardText(S, q.reward))}</b> for the heroes.</span></p>` : '';
  }

  // a quest's target, as data-rk/data-rid name it
  function refFrom(d) {
    if (d.rk === 'obj') { const o = S.objects.find(z => String(z.id) === d.rid); return o ? { kind: 'obj', id: o.id } : null; }
    if (d.rk === 'site') { const z = G.siteOf(S, d.rid); return z ? { kind: 'site', id: z.id } : null; }
    return d.rk === 'villain' ? { kind: 'villain', id: 'villain' } : null;
  }
  // close the screen and show it on the map
  function showRef(ref) {
    const t = ref && G.refTarget(S, ref); if (!t) return;
    closeScreen();
    if (ref.kind === 'obj') { const mine = t.kind === 'dungeon' && t.mine; const bt = t.kind === 'stack' ? bandTile(t.id) : null; ui.sel = { type: mine ? 'lair' : 'obj', id: t.id, x: t.x, y: t.y }; centerOn(bt ? bt.x : t.x, bt ? bt.y : t.y); }
    else if (ref.kind === 'site') { ui.sel = { type: 'site', id: t.id, x: t.x, y: t.y }; centerOn(t.x, t.y); }
    else centerOn(t.x, t.y);
    ui.scrollTo = 'sel'; renderSide(); drawMap();
  }
  /* ============ the town views (0.20): Millbrook and the Dark Tower as you've built them ============
     Opening either town lands on its View tab: a little diorama in the map's 3D world (or a flat picture when the
     3D view is off) where every building stands on its own plot. Empty plots show the building's ghost when you
     point at them; one going up rises out of its scaffolding; the main building grows as the town does. */
  const TFW = 18, TFH = 11;
  const hasArt = k => !!ART.keys['obj-' + k];
  // stand-ins that would look too big at a building's size
  const STAND_W = { shrine: 0.62, artifact: 0.7, omen: 0.9, 'node-ore': 0.8, quest: 1 };
  // the newest picture there is for this level: t-market-3, else t-market-2, else t-market, else the stand-in
  function levelArt(base, lv, standIn) { for (let l = lv; l >= 2; l--) if (hasArt(base + '-' + l)) return { art: base + '-' + l, own: true }; return hasArt(base) ? { art: base, own: lv <= 1 } : { art: standIn, own: false }; }
   // their own pictures are drawn a little smaller than the town's buildings, so the front of the valley isn't crowded
  // the Dark Tower: the tower in the middle, its works around a dark yard
  // 0.39: the Grounds: every building has its plot around the tower (the Blacksmith's weapons and armour are forged inside it)
  const DT_AT = { library: [4.3, 3.3, 2.9], farm: [6.3, 7.6, 2.4], quarters: [14.8, 3.5, 2.9], obelisk: [2.4, 6.3, 1.3], reliquary: [11.8, 6.0, 1.6],
    storehouse: [15.6, 9.1, 2.3], smith: [3.2, 9.3, 2.5], muster: [16.9, 6.3, 2.4], stockade: [1.4, 2.6, 2.0] };
  const DT_MAIN = [9, 3.3], TOWER_W = [2.5, 2.9, 3.3, 3.7, 4.1], DT_CIRCLE = [13.4, 7.2], DT_TREASURY = [12.0, 9.6];
  // [its own picture (g-<key>, from pixellab_gen.py grounds), the stand-in until then]
  const DT_ART = { farm: ['g-farm', 'den'], smith: ['g-smith', 't-ironworks'], quarters: ['g-quarters', 't-raise'], obelisk: ['g-obelisk', 't-dread'], reliquary: ['g-reliquary', 't-ritual'],
    storehouse: ['g-storehouse', 't-hands'], muster: ['g-muster', 'camp'], stockade: ['g-stockade', 't-walls'], library: ['t-library', 'library'] };
  const DT_STAND = { library: 'keep' };
  // the picture for a building at a level (the Blacksmith grows with what's been forged there)
  function gArt(k, lv) {
    const [own, stand] = DT_ART[k] || ['g-' + k, 'building'];
    if (k === 'smith') { const f = G.groundsLv(S, 'weapons') + G.groundsLv(S, 'armour'); lv = 1 + (f >= 2 ? 1 : 0) + (f >= 5 ? 1 : 0); if (!hasArt(own)) return { art: f >= 5 && hasArt('t-ironworks-3') ? 't-ironworks-3' : f >= 2 && hasArt('t-ironworks-2') ? 't-ironworks-2' : 't-ironworks', own: true }; }
    if (k === 'library') return levelArt('t-library', lv, hasArt('library') ? 'library' : 'keep');
    return levelArt(own, lv, hasArt(stand) ? stand : 'building');
  }
  const gIcon = k => { const B = G.GROUNDS[k]; if (B && B.at) return k === 'weapons' ? 'unit-orc' : 'unit-knight'; if (k === 'circle') return minionIcon(); const a = gArt(k, Math.max(1, G.groundsLv(S, k))); return 'obj-' + a.art; };
  const VPAL = { lich: { glow: '#7dff8a', pool: '#1f5a2a', fog: '#1c2620', sun: '#d0ffd8', cloth: '#2e6a3a' }, dragon: { glow: '#ff8a2a', pool: '#c84a10', fog: '#2a1a14', sun: '#ffb070', cloth: '#8a2a12' },
    demon: { glow: '#ff3a2a', pool: '#a01a10', fog: '#281414', sun: '#ff9a80', cloth: '#7a1414' }, archmage: { glow: '#6ab4ff', pool: '#1c3c8a', fog: '#161e2c', sun: '#c0d8ff', cloth: '#24408a' },
    vampire: { glow: '#ff2a5a', pool: '#6a0a1a', fog: '#22141a', sun: '#ffa8b8', cloth: '#6a0a22' }, deathknight: { glow: '#9ab0c8', pool: '#20262e', fog: '#1a1c22', sun: '#d8e0ec', cloth: '#2a3040' } };
  const vpal = () => VPAL[(S.villain && S.villain.type) || 'lich'] || VPAL.lich;
  const plotsOut = at => Object.values(at).map(([x, z, w]) => [x, z, (w || 2) * 0.62]);
  // the scenery, built once when the view opens
  function viewSpec(kind) {
    const P = vpal();
    return { kind, seed: S.seed + 23, road: [[9, 18], [9, 12], [9, 6.8]], plaza: { x: 9, z: 5.9, r: 2.0 }, paths: [[[7.3, 5.6], [4.6, 4.2]], [[10.6, 5.6], [14.4, 4.2]], [[10.6, 6.6], [13.0, 7.3]], [[9.6, 9.3], [11.6, 9.7]]],
      pond: { x: 5.2, z: 9.9, rx: 1.7, rz: 1.0, color: P.pool, glow: P.glow }, fog: P.fog, sun: P.sun, glow: P.glow, glowAt: [9, 4.6],
      keepOut: plotsOut(DT_AT).concat([[DT_MAIN[0], DT_MAIN[1], 2.4], [DT_CIRCLE[0], DT_CIRCLE[1], 1.6], [DT_TREASURY[0], DT_TREASURY[1], 1.0]]) };
  }
  // what stands where right now, and who's about
  function viewItems() {
    const kind = ui.viewKind; if (!kind || !S) return null;
    const items = [], figs = []; const hov = ui.tvHover, sel = ui.tvSel;
    const add = o => { o.hi = o.id === hov || o.id === sel; items.push(o); };
    const now = performance.now() / 1000;
    // the Dark Tower
    const st = G.towerStage(S); const vt = (S.villain && S.villain.type) || 'lich';
    const base = hasArt('tower-' + vt) ? 'tower-' + vt : 'tower'; const ma = levelArt('tower-' + vt, st.stage, base);
    add({ id: 'main', mode: 'built', art: ma.art, x: DT_MAIN[0], z: DT_MAIN[1], w: TOWER_W[st.stage - 1] });
    // 0.39: the Grounds: built, going up (out of its scaffolding) or an empty plot
    for (const k of Object.keys(DT_AT)) {
      const [x, z, w0] = DT_AT[k]; const lv = G.groundsLv(S, k); const b = G.groundsBuild(S, k);
      const a = gArt(k, Math.max(1, b ? b.to : lv)); const big = 1 + 0.1 * (Math.max(1, b ? b.to : lv) - 1); const w = (a.own ? w0 : w0 * (STAND_W[a.art] || 1)) * (k === 'smith' ? 1 : big);
      if (b) add({ id: k, mode: 'site', art: a.art, x, z, w, p: 1 - b.days / b.total }); else add({ id: k, mode: lv ? 'built' : 'plot', art: a.art, x, z, w });
    }
    add({ id: 'summon', mode: 'plot', art: null, x: DT_CIRCLE[0], z: DT_CIRCLE[1], w: 2.8 + 0.4 * G.groundsLv(S, 'circle'), ring: '#b468ff' });
    { const own = hasArt('t-treasury'); const g = S.res.gold || 0;   // its own picture is a vault, already heaped with gold: it grows less
      add({ id: 'treasury', mode: 'built', art: own ? 't-treasury' : 'dep-gold', x: DT_TREASURY[0], z: DT_TREASURY[1], w: own ? 1.3 + Math.min(0.5, g / 400) : 0.9 + Math.min(1.5, g / 100) }); }
    // 0.35: the avenue of monster banners up the road is gone (too pixelated, and in the way)
    // the villain at home, minions about the yard, one taking shape in the circle
    const V = S.villain; const tw = G.siteOf(S, 'tower');
    if (V && V.state === 'lair') figs.push({ id: 'villain', key: vIcon(), tok: vIcon(), x: DT_MAIN[0] + 1.3, z: DT_MAIN[1] + 1.6, s: VT().icon === 'wyrm' ? 1.5 : 2.0, face: Math.sin(now * 0.4) * 0.3, lift: VT().icon === 'wyrm' ? 0.3 : 0 });
    const homeM = (S.minions || []).filter(m => m.x === tw.x && m.y === tw.y && !m.path.length).slice(0, 10);
    homeM.forEach((m, i) => { const a = now * 0.22 + i * 2.4, r = 1.6 + (i % 3) * 0.7; const cx = 9 + (i % 2 ? 2.6 : -2.6), cz = 7.2; const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.45; figs.push({ id: 'm-' + m.id, key: minionIcon(), tok: minionIcon(), x, z, s: 1.25, face: Math.atan2(-Math.sin(a) * r, Math.cos(a) * r * 0.45), bob: true }); });
    const sm = (S.summons || []).length ? S.summons[0] : null;
    if (sm) figs.push({ id: 'summoning', key: minionIcon(), x: DT_CIRCLE[0], z: DT_CIRCLE[1] + 0.1, s: 1.1 + 0.3 * (1 - sm.days / sm.total), ghost: 0.5 + 0.4 * (1 - sm.days / sm.total), face: now });
    return { items, figs, circle: { x: DT_CIRCLE[0], z: DT_CIRCLE[1], on: !!sm, r: 2.2 + 0.3 * G.groundsLv(S, 'circle'), color: vpal().glow } };
  }
  /* --- what a hover tip and a click card say --- */

  function viewTip(id) {
    const T = S.town;
    if (id === 'main') { const st = G.towerStage(S); return `${st.name} · stage ${st.stage} of ${st.of}`; }
    if (id === 'summon') { const n = (S.summons || []).length; return n ? `Summoning circle · ${n} being summoned` : `Summoning circle · summon ${MT().name.toLowerCase()} here`; }
    if (id === 'treasury') return `Treasury · ${Math.floor(S.res.gold)} gold`;
    const B = G.GROUNDS[id]; if (!B) return '';
    const lv = G.groundsLv(S, id); const b = G.groundsBuild(S, id);
    return b ? `${B.name} · going up, ${b.days} night${b.days > 1 ? 's' : ''} left` : lv ? `${B.name} · level ${lv} of ${B.max} · ${B.lv(lv)}` : `Empty plot · build a ${B.name}`;
  }
  function viewCard(id) {
    const head = (art, title, sub) => `<div class="tvc-h">${art ? img(art, 'licon') : ''}<div><h3>${esc(title)}</h3>${sub ? `<p class="hint">${sub}</p>` : ''}</div></div>`;
    const stageTxt = (st, what) => `<p>${st.next !== null ? `Grows into the <b>${esc(st.nextName)}</b> at ${st.next} ${what} (now ${st.n}).` : `Fully grown (${st.n} ${what}).`}</p>`;
    if (id === 'main') { const st = G.towerStage(S);
      return head(vIcon(), st.name, `${esc(VF())}'s seat · stage ${st.stage} of ${st.of}`) + stageTxt(st, 'building levels on the Grounds') + '<p class="hint">Every level of every building around the tower counts, and each stage opens new buildings and levels.</p>' + `<p class="hint">${V_HOME()}</p><div class="row"><button class="btn sm" data-act="ttab" data-k="talents">Talents</button><button class="btn sm" data-act="ttab" data-k="villain">The villain</button></div>`; }
    if (id === 'summon') return head(minionIcon(), 'Summoning circle', esc(MT().name)) + summonCard() + `<div class="gsub"><h4>Widen the circle</h4>${gRow('circle')}${gDetail('circle')}</div>`;
    if (id === 'treasury') { const d = S.lastDay; return head('obj-res-gold', 'Treasury', 'The tower\'s purse') + `<p>${purseHtml('tower')}</p>${d ? `<p class="hint">Last night: ${G.RES_KEYS.map(k => `+${d.res[k]} ${k}`).join(', ')}.</p>` : ''}<p class="hint">Your minions bring it in from the mines and camps, and the tower adds 2 gold a day.</p>`; }
    const B = G.GROUNDS[id]; if (!B) return '';
    const lv = G.groundsLv(S, id);
    let extra = '';
    if (id === 'farm') { const fu = G.foodUsed(S), fc = G.foodCap(S); extra = `<p class="${fu >= fc ? 'warn' : 'hint'}">Your lairs eat <b>${fu}</b> of <b>${fc}</b> food.${fu >= fc ? ' No room for another lair until the Farm grows.' : ''}</p>`; }
    if (id === 'smith' && lv) extra = `<div class="gsub"><h4>Forge</h4>${gRow('weapons', true)}${gDetail('weapons')}${gRow('armour', true)}${gDetail('armour')}</div>`;
    if (id === 'library') extra = `<p class="hint">${lv ? `Your scholars have given you ${lv > 1 ? 'two talent points' : 'a talent point'}.` : 'Each level is one more talent point to spend.'}</p>`;
    return head(gIcon(id), B.name, `Level ${lv} of ${B.max}`) + `<p>${esc(B.text)}</p>` + extra + gDetail(id, id !== 'smith');
  }
  // 0.39: a building's row in the Grounds list: picture, level, what it does now, and its button
  function gRow(k, sub) {
    const B = G.GROUNDS[k]; const lv = G.groundsLv(S, k); const b = G.groundsBuild(S, k);
    const pips = `<span class="gpips">${Array.from({ length: B.max }, (_, i) => `<i class="${i < lv ? 'on' : b && i === lv ? 'up' : ''}"></i>`).join('')}</span>`;
    let act;
    if (b) act = `<span class="gstat">${pbar(1 - b.days / b.total, 'build')}<small>${b.days} night${b.days > 1 ? 's' : ''}</small></span>`;
    else if (lv >= B.max) act = '<span class="gstat done">Done</span>';
    else { const e = G.groundsCheck(S, k); const lock = e && /^(Opens|Build the)/.test(e); act = `<button class="btn sm${lock ? ' lock' : ''}" data-act="gbuild" data-k="${k}"${e ? ` disabled title="${esc(e)}"` : ''}>${lock ? '🔒' : lv ? 'Upgrade' : 'Build'}</button>`; }
    return `<div class="grow${sub ? ' sub' : ''}${ui.tvSel === k ? ' on' : ''}" data-act="gsel" data-k="${k}">${img(gIcon(k), 'gico')}<span class="gname"><b>${esc(B.name)}</b>${pips}<small>${esc(lv ? B.lv(lv) : b ? 'Going up' : 'Not built')}</small></span>${act}</div>`;
  }
  // what the next level does, what it costs, and the buttons (or how the work's going)
  function gDetail(k, full) {
    const B = G.GROUNDS[k]; const lv = G.groundsLv(S, k); const b = G.groundsBuild(S, k);
    if (b) {
      const nb = b.old ? 1 : G.groundsBuilders(S, b.id).length; const home = nb && G.groundsBuilders(S, b.id).some(m => !m.path.length);
      return `<div class="gdet"><p>Level ${b.to}: <b>${esc(B.lv(b.to))}</b></p><div class="prow">${pbar(1 - b.days / b.total, 'build')}<small>${b.days} night${b.days > 1 ? 's' : ''} of work left · ${nb ? (home || b.old ? `${nb} at work` : 'your minion is on the way home') : '<b class="warn">no one is working on it</b>'}</small></div>
        ${b.old ? '' : `<div class="row">${!nb ? `<button class="btn sm" data-act="ghelp" data-id="${b.id}"${G.idleMinions(S).length ? '' : ' disabled title="No idle minion"'}>Send a minion</button>` : ''}<button class="btn sm ghost" data-act="gcancel" data-id="${b.id}" title="Half the cost comes back">Call it off</button></div>`}</div>`;
    }
    if (lv >= B.max) return full ? '<p class="hint">Built in full.</p>' : '';
    const e = G.groundsCheck(S, k); const P = G.groundsPrice(S, k); const d = G.groundsDays(S, k);
    return `<div class="gdet"><p>${lv ? 'Next' : 'Build it'}: <b>${esc(B.lv(lv + 1))}</b></p><div class="row"><button class="btn sm" data-act="gbuild" data-k="${k}"${e ? ' disabled' : ''}>${lv ? 'Upgrade' : 'Build'} · ${d} night${d > 1 ? 's' : ''}</button>${priceChips(P)}</div>${e ? `<p class="hint">${esc(e)}</p>` : `<p class="hint">A ${esc(MT().one.toLowerCase())} walks home and works on it.</p>`}</div>`;
  }
  // the list along the side of the Grounds: everything you can build, in the order you'll want it
  function groundsList() {
    const st = G.towerStage(S); const fu = G.foodUsed(S), fc = G.foodCap(S);
    const rows = G.GROUNDS_ORDER.filter(k => k !== 'weapons' && k !== 'armour').map(k => gRow(k) + (k === 'smith' && G.groundsLv(S, 'smith') ? gRow('weapons', true) + gRow('armour', true) : '')).join('');
    return `<header><h3>The Grounds</h3><p class="hint">${esc(st.name)} · ${st.n} building level${st.n === 1 ? '' : 's'}${st.next !== null ? ` · the ${esc(st.nextName)} at ${st.next}` : ''}</p><p class="gfood${fu >= fc ? ' full' : ''}">${img('obj-food', 'ric')} Food <b>${fu}/${fc}</b></p></header><div class="glist">${rows}</div>`;
  }
  const V_HOME = () => S.villain && S.villain.state === 'lair' ? `${esc(VN())} is at home on the throne.` : `${esc(VN())} is out in the world.`;
  /* --- the view's own element, kept across re-renders so the 3D canvas never leaves it --- */
  function tviewEl() {
    if (ui.tview) return ui.tview;
    const el = document.createElement('div'); el.className = 'tview'; el.id = 'tview';
    el.innerHTML = '<div class="tvtip" hidden></div><aside class="tvlist"></aside><aside class="tvcard" hidden></aside><p class="tvhint"></p>';
    el.addEventListener('pointermove', e => { if (e.target.closest('.tvcard, .tvlist')) { setViewHover(null); return; } const id = pickView(e.clientX, e.clientY); setViewHover(id, e); });
    el.addEventListener('pointerleave', () => setViewHover(null));
    el.addEventListener('click', e => {
      if (e.target.closest('.tvcard, .tvlist')) return;
      const id = pickView(e.clientX, e.clientY);
      if (id) sfx('click', { vol: 0.6 });
      ui.tvSel = id && id !== ui.tvSel ? id : null; updateViewCard();
    });
    return (ui.tview = el);
  }
  function setViewHover(id, e) {
    if (ui.tvHover !== id) { ui.tvHover = id; if (!ui.r3d) kickView(); }
    const tip = ui.tview && ui.tview.querySelector('.tvtip'); if (!tip) return;
    if (!id) { tip.hidden = true; ui.tview.style.cursor = ''; return; }
    tip.hidden = false; tip.textContent = viewTip(id); ui.tview.style.cursor = 'pointer';
    if (e) { const r = ui.tview.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; tip.style.transform = `translate(${Math.min(x + 14, r.width - tip.offsetWidth - 8)}px,${Math.max(8, y - 34)}px)`; }
  }
  function updateViewCard() {
    const el = ui.tview; if (!el) return;
    const card = el.querySelector('.tvcard'); const html = ui.tvSel ? viewCard(ui.tvSel) : '';
    card.hidden = !html; card.innerHTML = html ? `<button class="xbtn" data-act="tvclose" title="Close">×</button>${html}` : '';
    el.querySelector('.tvhint').textContent = ui.tvSel ? '' : `${TOUCHY() ? 'Tap' : 'Click'} a building or a plot. Build around the tower to raise your limits, and the tower grows with them.`;
    const L = el.querySelector('.tvlist'); if (L && ui.viewKind === 'tower') { const sc = (L.querySelector('.glist') || {}).scrollTop || 0; L.innerHTML = groundsList(); const g = L.querySelector('.glist'); if (g) g.scrollTop = sc; } else if (L) L.innerHTML = '';
    // the 3D picture moves over to make room for the list (on a narrow screen the list sits along the bottom instead)
    if (ui.r3d && W3 && W3.setTownInset) W3.setTownInset(L && L.innerHTML && L.offsetHeight && el.clientWidth > 760 ? L.offsetWidth + 12 : 0);
    if (!ui.r3d) kickView();
  }
  // which thing the pointer is over
  function pickView(cx, cy) { if (ui.r3d) return W3.pickTown(cx, cy); return pick2d(cx, cy); }
  function mountView(kind) {
    const el = tviewEl();
    if (ui.viewKind === kind) return;
    unmountView(); ui.viewKind = kind; ui.tvSel = null; ui.tvHover = null; el.querySelector('.tvtip').hidden = true;
    if (ui.r3d) { W3.attach(el, el.firstChild); W3.enterTown(viewSpec(kind)); W3.setMode('town'); }
    else { if (!ui.tv2d) { ui.tv2d = document.createElement('canvas'); ui.tv2d.className = 'tv2d'; } el.insertBefore(ui.tv2d, el.firstChild); ui.tv2dBg = null; kickView(); }
    updateViewCard();
  }
  function unmountView() {
    if (!ui.viewKind) return;
    ui.viewKind = null; ui.tvSel = null; ui.tvHover = null;
    if (ui.r3d && W3 && W3.setTownInset) W3.setTownInset(0);
    if (ui.r3d && W3 && W3.ready) { W3.exitTown(); W3.attach($('mapwrap'), $('map')); W3.setMode('map'); }
    if (ui.tv2d && ui.tv2d.parentElement) ui.tv2d.parentElement.removeChild(ui.tv2d);
  }
  /* --- the flat picture, when the 3D view is off --- */
  let v2raf = 0;
  function kickView() { if (!v2raf && ui.viewKind && !ui.r3d) v2raf = requestAnimationFrame(() => { v2raf = 0; drawView2d(); }); }
  function view2dXf() {
    // fill the frame: the town's ground (with a margin of forest) covers the view, cropped at the sides on narrow screens
    const cv = ui.tv2d; const W = cv.clientWidth, H = cv.clientHeight; const k = Math.max(W / (TFW + 1.5), H / (TFH * 0.62 + 3.4));
    const ox = W / 2 - TFW / 2 * k, oy = H / 2 - (TFH * 0.62 / 2 - 1.1) * k;
    return { W, H, k, X: x => ox + x * k, Y: z => oy + z * k * 0.62 };
  }
  function drawView2d() {
    const cv = ui.tv2d; if (!cv || !ui.viewKind) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1); const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ui.tv2dBg = null; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
    const X = view2dXf(); const sp = viewSpec(ui.viewKind);
    if (!ui.tv2dBg) {
      const bg = A.paintField('waste', W, H, sp.seed); const b = bg.getContext('2d');
      const line = (pts, w, col) => { b.strokeStyle = col; b.lineWidth = w * X.k; b.lineCap = 'round'; b.lineJoin = 'round'; b.beginPath(); pts.forEach(([x, z], i) => i ? b.lineTo(X.X(x), X.Y(z)) : b.moveTo(X.X(x), X.Y(z))); b.stroke(); };
      const rc = ['#2a2422', '#5a4c44'];
      for (const p of sp.paths || []) { line(p, 0.7, rc[0]); line(p, 0.45, rc[1]); }
      line(sp.road, 1.4, rc[0]); line(sp.road, 1.1, rc[1]);
      const P = sp.plaza; b.fillStyle = rc[1]; b.beginPath(); b.ellipse(X.X(P.x), X.Y(P.z), P.r * X.k, P.r * X.k * 0.62, 0, 0, 7); b.fill();
      const W2 = sp.pond; if (W2) { b.fillStyle = '#1e1a1a'; b.beginPath(); b.ellipse(X.X(W2.x), X.Y(W2.z), W2.rx * 1.15 * X.k, W2.rz * 1.15 * X.k * 0.62, 0, 0, 7); b.fill(); b.fillStyle = W2.color || '#2c5878'; b.beginPath(); b.ellipse(X.X(W2.x), X.Y(W2.z), W2.rx * X.k, W2.rz * X.k * 0.62, 0, 0, 7); b.fill(); }
      // hills and a dark treeline behind, trees and rocks crowding in at the edges
      const hz = X.Y(-0.4); const hg = b.createLinearGradient(0, 0, 0, hz); hg.addColorStop(0, '#140f12'); hg.addColorStop(1, '#2a2224');
      b.fillStyle = hg; b.beginPath(); b.moveTo(0, 0); b.lineTo(W, 0); for (let x = W; x >= 0; x -= 24) b.lineTo(x, hz - 10 - 14 * Math.sin(x * 0.013 + sp.seed) - 8 * Math.sin(x * 0.041)); b.closePath(); b.fill();
      const r = G.mulberry(sp.seed); const tall = [];
      for (let i = 0; i < 420; i++) {
        const x = r() * (TFW + 6) - 3, z = r() * (TFH + 3) - 1.6; const d = Math.max(0.6 - x, x - TFW + 0.6, 0.5 - z, z - TFH + 0.3, 0);
        if (r() > 0.12 + d * 0.45) continue; if ((sp.keepOut || []).some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + 0.3)) continue;
        if (sp.pond && Math.hypot((x - sp.pond.x) / (sp.pond.rx + 0.5), (z - sp.pond.z) / (sp.pond.rz + 0.5)) < 1) continue;
        tall.push({ x, z, kind: r() < 0.55 ? 'tree' : 'rock', i });
      }
      tall.sort((a, q) => a.z - q.z);
      for (const t of tall) A.obstacle(b, X.X(t.x), X.Y(t.z), X.k * (t.kind === 'tree' ? 0.42 : 0.3), 'waste', t.i + sp.seed, t.kind);
      ui.tv2dBg = bg;
    }
    c.drawImage(ui.tv2dBg, 0, 0, W, H);
    const V = viewItems(); if (!V) return; const t = performance.now() / 1000;
    if (V.circle) { const C = V.circle; c.save(); c.globalAlpha = C.on ? 0.55 + 0.2 * Math.sin(t * 3) : 0.3; c.strokeStyle = C.color; c.lineWidth = 3; c.beginPath(); c.ellipse(X.X(C.x), X.Y(C.z), C.r * X.k * 0.5, C.r * X.k * 0.31, 0, 0, 7); c.stroke(); c.restore(); }
    const list = V.items.map(o => ({ z: o.z, o })).concat(V.figs.map(f => ({ z: f.z, f }))).sort((a, b) => a.z - b.z);
    ui.v2rects = [];
    for (const e of list) {
      if (e.f) { const f = e.f; const im = A.IMG[f.tok || f.key]; if (im) { const s = X.k * 0.6; c.globalAlpha = f.ghost || 1; c.drawImage(im, X.X(f.x) - s / 2, X.Y(f.z) - s, s, s); c.globalAlpha = 1; } continue; }
      const o = e.o; const im = o.cv || (o.art ? A.IMG['obj-' + o.art] : null);
      const x = X.X(o.x), y = X.Y(o.z);
      if (o.mode === 'plot') { c.save(); c.globalAlpha = o.hi ? 0.7 : 0.3; c.strokeStyle = o.ring || '#f0dca0'; c.setLineDash([4, 4]); c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, o.w * X.k * 0.4, o.w * X.k * 0.25, 0, 0, 7); c.stroke(); c.restore(); }
      if (!im) { ui.v2rects.push({ id: o.id, x: x - o.w * X.k * 0.4, y: y - o.w * X.k * 0.3, w: o.w * X.k * 0.8, h: o.w * X.k * 0.6 }); continue; }
      const w = o.w * X.k * (o.cv ? 0.6 : 1), h = w * im.height / im.width; const rx = x - w / 2, ry = y - h + w * 0.12;
      ui.v2rects.push({ id: o.id, x: rx, y: ry, w, h, im });
      if (o.mode === 'plot') { if (!o.hi) continue; c.save(); c.globalAlpha = 0.45; c.drawImage(im, rx, ry, w, h); c.restore(); continue; }
      if (o.mode === 'site') { const p = Math.max(0.05, o.p || 0); c.save(); c.globalAlpha = 0.25; c.drawImage(im, rx, ry, w, h); c.restore(); c.drawImage(im, 0, im.height * (1 - p), im.width, im.height * p, rx, ry + h * (1 - p), w, h * p); const sc = A.IMG['obj-building']; if (sc) c.drawImage(sc, rx + w * 0.1, ry + h * (1 - p) - w * 0.25, w * 0.8, w * 0.5); kickView(); continue; }
      c.drawImage(im, rx, ry, w, h);
      if (o.hi) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18; c.drawImage(im, rx, ry, w, h); c.restore(); }
    }
    if (V.figs.some(f => f.bob || f.ghost) || V.circle) kickView();
  }
  function pick2d(cx, cy) {
    if (!ui.tv2d || !ui.v2rects) return null; const r = ui.tv2d.getBoundingClientRect(); const x = cx - r.left, y = cy - r.top;
    for (let i = ui.v2rects.length - 1; i >= 0; i--) { const R = ui.v2rects[i]; if (x < R.x || y < R.y || x > R.x + R.w || y > R.y + R.h) continue;
      if (!R.im || !R.im.getContext) return R.id;
      try { const ix = Math.floor((x - R.x) / R.w * R.im.width), iy = Math.floor((y - R.y) / R.h * R.im.height); if (R.im.getContext('2d').getImageData(ix, iy, 1, 1).data[3] > 24) return R.id; } catch (e) { return R.id; } }
    return null;
  }
  function renderScreen(fresh) {
    const el = $('screen'); if (!el) return;
    if (!ui.screen || !S || S.phase === 'battle') { el.hidden = true; return; }
    const sb = $('scbody'); const keep = fresh || !sb ? 0 : sb.scrollTop;
    const body = ui.screen === 'chronicle' ? scrChronicle() : scrTower();
    const vkind = ui.screen === 'tower' && (ui.towerTab || 'view') === 'view' ? 'tower' : null;
    const head = ui.screen === 'chronicle' ? ['Chronicle', 'Everything that has happened in this campaign, newest first.'] : ['The Dark Tower', `Your seat of power: summon ${MT().name.toLowerCase()}, study dark secrets and watch over your lairs.`];
    el.hidden = false;
    if (vkind) { const st = G.towerStage(S); head[1] = `${st.name}, stage ${st.stage} of ${st.of}. ${st.next !== null ? `Grows into the ${st.nextName} at ${st.next} building levels (now ${st.n}).` : 'Fully grown.'}`; }
    el.innerHTML = `<div class="scr solo"><div class="scbody${vkind ? ' vmode' : ''}" id="scbody"><header class="schd"><div class="schd-t"><h1 class="dtitle">${esc(head[0])}</h1><p>${esc(head[1])}</p></div>${ui.screen === 'chronicle' ? '' : purseHtml(ui.screen === 'town' ? 'town' : 'tower')}<button class="btn" data-act="closescreen" title="Back to the map (Esc)">Back to the map</button></header>${body}</div></div>`;
    const nb = $('scbody'); if (nb) nb.scrollTop = keep;
    // the view keeps one element (and the 3D canvas inside it) for as long as it's open
    const slot = el.querySelector('.tvslot');
    if (vkind && slot) { slot.appendChild(tviewEl()); mountView(vkind); updateViewCard(); } else unmountView();
  }
  function scrChronicle() {
    let lastKey = ''; const items = [];
    for (const l of S.log.slice().reverse()) { const key = `Week ${l.w}, day ${l.d}`; if (key !== lastKey) { items.push(`<li class="lday">${key}</li>`); lastKey = key; } items.push(`<li class="l-${l.c}">${esc(l.t)}</li>`); }
    return `<section class="sblock log"><ul class="chron">${items.join('')}</ul></section>`;
  }

  /* ============ modals ============ */
  function modal(html, onClose, cls) {
    const m = $('modal'); m.hidden = false;
    m.innerHTML = `<div class="dialog ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
    ui.modal = { onClose };
    const f = m.querySelector('[data-act="close"]') || m.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  function closeModal() {
    const m = $('modal'); m.hidden = true; m.innerHTML = '';
    const cb = ui.modal && ui.modal.onClose; ui.modal = null; if (cb) cb();
  }
  function ledger(rows, total, label) {
    return `<div class="ledger">${rows.map(r => `<div><span>${esc(r.label)}</span><b class="${r.v > 0 ? 'pos' : r.v < 0 ? 'neg' : ''}">${signed(r.v)}</b></div>`).join('')}<div class="tot"><span>${label}</span><b class="${total > 0 ? 'pos' : total < 0 ? 'neg' : ''}">${signed(total)}</b></div></div>`;
  }
  function showWeek() {
    save(true);
    const r = S.recap; const fx = G.WEEKS_FX[r.nextFx];
    const L = r.vlevel; const lo = G.VXP[L] || 0, hi = r.next;
    const A = r.assault;
    const siege = A ? `<p><b>The assault: ${esc(A.label.toLowerCase())}.</b> ${A.gateFell ? 'The gate fell. ' : ''}${A.fell.length ? `${A.fell.length} of its towers came down. ` : ''}${A.hallDmg ? `The hall took ${A.hallDmg} damage. ` : ''}${A.lost} of your monsters fell${A.left ? `, ${A.left} are still in the war camp` : ''}.</p>`
      : G.campCount(S) ? `<p>You held the war camp back this week: ${G.campCount(S)} monsters wait outside Millbrook.</p>`
      : r.sieges ? `<p>${r.sieges} siege${r.sieges > 1 ? 's' : ''} of Millbrook, ${r.breaches ? `<b class="good">${r.breaches} broke in</b>` : 'none got in'}${r.plunder ? `, ${r.plunder} gold plundered` : ''}${r.burned ? `, ${r.burned} building level${r.burned > 1 ? 's' : ''} burned` : ''}.</p>` : '<p class="hint">None of your waves reached Millbrook this week.</p>';
    modal(`<h1 class="dtitle">End of week ${r.week}</h1>
      <div class="cols"><div><h2 class="cap">Infamy</h2>${ledger(r.lines.length ? r.lines : [{ label: 'Nothing to boast about', v: 0 }], r.infamy, 'This week')}
        <p class="big">${esc(VN())} · <b>level ${L}</b></p>${hpBar(hi ? r.xp - lo : 1, hi ? hi - lo : 1, 'inf')}<p class="hint">${hi ? `${Math.floor(r.xp)} / ${hi} Infamy to level ${L + 1}.` : 'The highest level there is.'}</p></div>
      <div><h2 class="cap">Millbrook</h2>${siege}
        <p><b>${esc(G.wallName(S))}</b> ${Math.round(r.wall)} / ${r.wallMax}</p>${hpBar(r.wall, r.wallMax, 'wall')}<p><b>The hall</b> ${Math.round(r.hall)} / ${r.hallMax}</p>${hpBar(r.hall, r.hallMax, 'hall')}
        ${r.grew ? `<p class="hint">Wild monster bands out on the map grew this week (${r.grew}).</p>` : ''}
        <p class="hint">The heroes are level ${r.heroLevel}. Against you on the throne: <b>${esc(r.ready.win === null ? 'no threat yet' : r.ready.ready ? 'ready to march' : r.ready.label === 'Almost ready' ? 'almost ready' : Math.round(r.ready.win * 100) + '% odds')}</b>.</p></div></div>
      <div class="astro"><h2 class="cap">Astrologers proclaim</h2><p class="fxname">${esc(fx.name)}</p><p>${esc(fx.text)}</p></div>
      <div class="row end"><button class="btn big" data-act="close">Begin week ${r.week + 1}</button></div>`,
    () => { const was = S.march; G.startNextWeek(S); if (S.phase === 'over') { commit(); showOver(); return; } ui.est = null; ui.finaleEst = null; commit(); toast(`Week ${S.week}: ${G.WEEKS_FX[S.weekFx].name}.`, 'sys'); if (S.march && !was) toast('The heroes march on the Dark Tower! Stop them on the road, or meet them at the throne.', 'warn'); morning(); }, 'wide');
  }
  /* ============ 0.37: the war camp, the war council and the assault on Millbrook ============ */
  const capF = x => x ? x[0].toUpperCase() + x.slice(1) : x;
  const DEF_TOWERS = ['watch', 'ballista', 'arcane', 'bell'];
  // 0.38: the icon for a piece of Millbrook: its building art for that level when loaded, else the drawn token
  const DEF_ART = { gate: 'walls', hall: 'hall', watch: 'watch', ballista: 'ballista', arcane: 'arcane', bell: 'bell' };
  function defIcon(kind, lvl) {
    if (lvl === undefined) lvl = kind === 'hall' ? G.hallStage(S).stage : kind === 'gate' ? G.townLv(S, 'walls') : Math.max(1, G.townLv(S, kind));
    if (kind === 'watch') lvl = Math.min(2, lvl);
    const k = 'obj-t-' + DEF_ART[kind] + (lvl > 1 ? '-' + lvl : ''); return A.URI[k] ? k : 'unit-mb-' + kind;
  }
  // Millbrook as your scouts at the war camp see it
  function defenceRows() {
    const T = S.town; if (!T) return '';
    const wl = G.townLv(S, 'walls'), wm = G.WALL_HP[wl] || 0, hm = G.hallMax(S); const hall = T.hall === undefined ? hm : T.hall;
    const bar = (v, m, cls) => `<i class="dbar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, v / Math.max(1, m))) * 100)}%"></i></i>`;
    const row = (icon, name, right, extra) => `${img(icon)}<span><b>${esc(name)}</b>${extra || ''}</span><span>${right}</span>`;
    let h = row(defIcon('hall'), 'Town hall', `${Math.round(hall)} / ${hm}`, bar(hall, hm, 'hall'));
    h += wl ? row(defIcon('gate'), `${G.wallName(S)} and gate`, (T.wallHp || 0) > 0 ? `${Math.round(T.wallHp)} / ${wm}` : 'broken', bar(T.wallHp || 0, wm, (T.wallHp || 0) > 0 ? '' : 'gone')) : row('unit-mb-gate', 'No walls', '');
    for (const k of DEF_TOWERS) { const l = G.townLv(S, k); if (l) h += row(defIcon(k, l), G.TOWN_B[k].name + (l > 1 ? ' ' + G.roman(l) : ''), k === 'watch' ? `${Math.min(2, l)} tower${Math.min(2, l) > 1 ? 's' : ''}` : k === 'bell' ? 'burns undead' : `level ${l}`); }
    h += row('unit-militia', 'Militia', `about ${G.militiaCount(S)}`);
    return `<div class="def">${h}</div>`;
  }
  function showCouncil() {
    save(true); syncAudio();
    const bands = G.campBands(S); const n = G.campCount(S); const V = S.villain; const home = G.partyHome(S); const P = VP();
    const groups = []; for (const o of bands) { const g = groups.find(x => x.type === o.type && (x.lvl || 1) === (o.lvl || 1)); if (g) g.count += o.count; else groups.push({ type: o.type, lvl: o.lvl || 1, count: o.count }); }
    const army = groups.map(o => { const C = G.CREATURES[o.type]; return `<span class="band">${img('unit-' + o.type)}<b>${o.count}</b>${esc(o.count > 1 ? C.name : C.one)}${(o.lvl || 1) > 1 ? `<small>level ${o.lvl}</small>` : ''}</span>`; }).join('');
    const heroes = home ? `<p class="warn">The heroes are inside Millbrook (level ${G.avgLevel(S)}). They will man the walls.</p>` : `<p class="good">The heroes are not in Millbrook. Only the militia and the towers stand in your way.</p>`;
    const can = G.canLead(S); const hp = Math.round((V.hpFrac === undefined ? 1 : V.hpFrac) * 100);
    const leadTxt = can ? `${esc(VN())} can lead the assault in person (health ${hp}%). ${capF(P.he)} breaks gates and halls like nothing else in your army, but every bow on the walls will turn on ${P.him}. Below half health ${P.he} flees to the Dark Tower for 3 days, and the heroes earn experience for driving ${P.him} off.`
      : `${esc(VN())} is still recovering in the Dark Tower and can't lead this one.`;
    modal(`<div class="council"><h1 class="dtitle">The war council</h1><p class="hint">Week ${S.week} is over. ${n} monsters wait outside Millbrook for your word. Bring down its town hall and Millbrook is yours.</p>
      <div class="cols"><div><h2 class="cap">Your war camp</h2><div class="army">${army}</div>${heroes}</div>
      <div><h2 class="cap">Millbrook</h2>${defenceRows()}</div></div>
      <div class="odds" id="codds"><span class="wait">Your captains size up the walls…</span></div>
      <p class="lead">${leadTxt}</p>
      <div class="row end"><button class="btn" data-act="council" data-k="hold" title="The camp waits another week (and so do the heroes)">Hold back a week</button>${can ? '<button class="btn big lead" data-act="council" data-k="lead">Lead the assault</button>' : ''}<button class="btn big" data-act="council" data-k="attack">Attack</button></div></div>`, null, 'wide');
    { const a = document.querySelector('#modal [data-k="attack"]'); if (a) a.focus({ preventScroll: true }); }
    setTimeout(() => { if (!vsay('council', { prio: 2, force: true })) vsay('wave', { prio: 2 }); }, 600);
    councilOdds(can);
  }
  // a few practice assaults on copies of the state, a frame apart, so the dialog opens at once
  function councilOdds(can) {
    const tok = ui.councilTok = (ui.councilTok || 0) + 1; const out = {};
    const word = e => e.razed >= 0.5 ? '<b class="good">Likely to raze Millbrook</b>' : e.razed >= 0.2 ? '<b class="good">A real chance to raze Millbrook</b>' : e.hallDmg >= 120 ? '<b>Likely to sack the town</b>' : e.hallDmg > 0 || e.gate >= 0.5 ? '<b>Likely to break in</b>' : e.wallDmg > 20 || e.towers >= 0.5 ? '<b>Will batter the defences</b>' : '<b class="warn">Will be thrown back</b>';
    const line = (k, e) => `<div class="row2"><span>${k}</span><span>${word(e)} · gate ${Math.round(e.gate * 100)}% · towers −${e.towers.toFixed(1)} · hall −${e.hallDmg} · you lose ${Math.round(e.lost * 100)}%${e.vfell !== undefined && k !== 'Attack' ? ` · ${Math.round(e.vfell * 100)}% that ${esc(VN())} falls` : ''}</span></div>`;
    const step = (k, lead) => new Promise(res => setTimeout(() => { if (ui.councilTok !== tok || S.phase !== 'council') return res(); try { out[k] = G.simAssault(S, lead, 4); } catch (e) { /* no estimate */ } res(); }, 60));
    step('Attack', false).then(() => can ? step('Lead the assault', true) : null).then(() => {
      const el = $('codds'); if (!el || ui.councilTok !== tok) return;
      el.innerHTML = Object.keys(out).map(k => out[k] ? line(k, out[k]) : '').join('') + '<span class="hint">Your captains\' guess, from a few practice runs. Dice decide the rest.</span>';
    });
  }
  function councilAct(k) {
    if (S.phase !== 'council') return;
    ui.councilTok = (ui.councilTok || 0) + 1;
    if (k === 'hold') { const err = G.holdBack(S); if (err) { toast(err, 'bad'); return; } closeModal(); vsay('hold', { prio: 3, force: true }); commit(); showWeek(); return; }
    const err = G.orderAssault(S, k === 'lead'); if (err) { toast(err, 'bad'); return; }
    closeModal(); sfxOr('warhorn', 'horde'); setTimeout(() => { if (!vsay(k === 'lead' ? 'lead' : 'assault', { prio: 3, force: true }) && k === 'lead') vsay('ride', { prio: 3, force: true }); }, 300);
    commit(); enterBattle();
  }
  // what the assault did
  function assaultResult(res) {
    const won = res.result === 'razed'; const P = VP();
    const title = won ? 'Millbrook falls!' : res.label === 'Sacked' ? 'You sack Millbrook' : res.label === 'Broke in' ? 'You break into Millbrook' : res.label === 'Battered' ? 'Millbrook\'s defences crack' : 'Millbrook holds';
    if (!won) setTimeout(() => { if (res.heroesIn && (res.label === 'Repelled' || res.label === 'Battered')) { if (bark('held', null, { force: true })) setTimeout(() => vsay('repelled', { queue: true }), 200); else vsay('repelled', { prio: 3, force: true }); } else vsay(res.hallDmg > 0 || res.gateFell ? 'breach' : 'repelled', { prio: 3, force: true }); }, 500);
    const pic = (k, gone, label) => `<span class="${gone ? 'gone' : ''}">${img(defIcon(k, k === 'gate' ? Math.max(1, G.townLv(S, 'walls')) : Math.max(1, G.townLv(S, k) + 1)))}${esc(label)}</span>`;
    const fell = (res.gateFell ? pic('gate', true, 'Gate broken') : '') + res.fell.map(k => pic(k, true, (G.TOWN_B[k] || {}).name || k)).join('') + (res.burned || []).map(k => `<span class="gone">${img('unit-mb-hall')}${esc((G.TOWN_B[k] || {}).name || k)} burned</span>`).join('');
    const hm = G.hallMax(S); const pl = Object.keys(res.plunder || {}).filter(k => res.plunder[k]).map(k => `${res.plunder[k]} ${k}`).join(', ');
    const killed = Object.keys(res.killed || {}).map(k => `<li>${res.killed[k]} ${esc(res.killed[k] > 1 ? res.plural[k] || k : k)}</li>`).join('') || '<li class="hint">None.</li>';
    const infSum = Math.round(res.lines.reduce((t, l) => t + l.v, 0) * 10) / 10;
    const wipe = res.wiped ? (res.newParty ? `<p class="fxname">The whole party fell on the walls. In the tavern a greener party takes up the sword: ${res.newParty.map(esc).join(', ')}.</p>` : '<p class="fxname">The whole party fell on the walls, and with the tavern in ashes nobody is left to take up the sword.</p>') : '';
    sfx(won || res.hallDmg > 0 ? 'win' : 'lose');
    modal(`<div class="assault"><h1 class="dtitle">${title}</h1>
      <p>${res.led ? `${esc(VN())} led ${res.lost + res.left} monsters against the walls` : `${res.lost + res.left} monsters stormed the walls`}${res.heroesIn ? ', and the heroes stood against them' : ' while the heroes were away'}. The fighting lasted ${res.rounds} round${res.rounds > 1 ? 's' : ''}.</p>
      ${fell ? `<div class="fell">${fell}</div>` : '<p class="hint">Nothing of Millbrook\'s fell this time.</p>'}
      ${won ? '' : `<p><b>The town hall</b> ${Math.round(res.hallLeft)} / ${hm}${res.hallDmg ? ` <b class="good">(−${res.hallDmg})</b>` : ''}</p>${hpBar(res.hallLeft, hm, 'hall')}`}
      ${pl ? `<div class="payoff"><span>${img('obj-res-gold', 'ticon')}<b class="gold">Plunder: ${esc(pl)}</b> carried back to the Dark Tower.</span></div>` : ''}
      ${res.vfell ? `<p class="warn">${esc(VN())} was driven off. ${capF(P.he)} flees to the Dark Tower and needs 3 days to recover.</p>` : res.led ? `<p>${esc(VN())} comes back from the walls (health ${Math.round((S.villain.hpFrac || 1) * 100)}%).</p>` : ''}
      <div class="cols"><div><h2 class="cap">Your losses</h2><p>${res.lost} fell${res.left ? `, ${res.left} go back to the war camp` : ''}.</p><ul class="plain">${killed}</ul>
        <h2 class="cap">Millbrook's losses</h2><p>${res.milLost ? `${res.milLost} of ${res.militia} militia cut down.` : 'The militia held.'}</p>${res.died.length ? `<p class="good">Heroes slain: ${res.died.map(esc).join(', ')}.</p>` : ''}${res.xp ? `<p class="hint">Each hero gains ${res.xp} XP from the fight.</p>` : ''}${wipe}</div>
      <div><h2 class="cap">Infamy</h2>${res.lines.length ? ledger(res.lines, infSum, 'From the assault') : '<p class="hint">Nothing to boast about.</p>'}</div></div>
      <div class="row end"><button class="btn big" data-act="close">${won ? 'Continue' : 'To the week\'s end'}</button></div></div>`,
    () => {
      exitBattle();
      if (S.phase === 'over') { showOver(); return; }
      const go = () => { if (S.phase === 'week') { commit(); showWeek(); } else commit(); };
      const after = () => showVillainUps(go);
      if (S.pendingLevelUps.length) showLevelUps(after); else after();
    }, 'wide');
  }
  // the heroes levelling up is news from the enemy camp now (0.30): a line, not a dialog
  function showLevelUps(then) {
    const L = S.pendingLevelUps.splice(0);
    if (L.length) {
      const who = S.heroes.find(x => x.id === L[Math.floor(Math.random() * L.length)].id); if (who && Math.random() < 0.5) setTimeout(() => { const b = bark('levelup', who); if (Math.random() < 0.5) vsay('heroesgrow', b ? { queue: true } : {}); }, 500);
      const lv = Math.max.apply(null, L.map(u => u.level)); const ab = L.filter(u => u.ability).map(u => `${shortName(u.name)}: ${G.ABILITIES[u.ability].name}`);
      toast(`The heroes grow stronger: level ${lv}.${ab.length ? ' ' + ab.slice(0, 4).join(', ') + '.' : ''}`, 'sys');
    }
    renderSide(); if (then) then();
  }
  // your villain levelling up: worth a dialog, with the powers it learns
  function showVillainUps(then) {
    const U = (S.vUps || []).splice(0); S.vUps = [];
    if (!U.length || S.phase === 'over') { if (then) then(); return; }
    const from = U[0].from, to = U[U.length - 1].to; const powers = [].concat.apply([], U.map(u => u.powers || []));
    sfx('research'); renderBar(); setTimeout(() => vsay('levelup', { prio: 3, force: true }), 400);
    const next = G.villainNext(S);
    modal(`<h1 class="dtitle">${esc(VN())} grows stronger</h1><div class="lvrow">${img(vIcon(), 'port lg')}<div><b>Level ${to}</b>${to - from > 1 ? ` <span class="hint">(up from ${from})</span>` : ''}<br><span class="hint">Stronger on the throne: more hit points, harder blows, a surer aim. ${to - from > 1 ? `${to - from} talent points` : 'A talent point'} to spend at the Dark Tower.${next ? ` ${next - Math.floor(S.villain.xp || 0)} more Infamy to level ${to + 1}.` : ''}</span>
      ${powers.map(k => `<p><b class="gold">${esc(G.BOSS_POWERS[k].name)}.</b> ${esc(G.BOSS_POWERS[k].text)}</p>`).join('')}</div></div>
      <div class="row end"><button class="btn" data-act="vtalents">Spend the point${to - from > 1 ? 's' : ''}</button><button class="btn big" data-act="close">Onward</button></div>`, () => { renderSide(); if (then) then(); });
  }
  /* --- the party sheet: all four heroes side by side --- */
  const avgRoll = (n, sides) => n * (sides + 1) / 2;
  const dmgText = st => `${st.dice[0]}d${st.dice[1]}${st.dice[2] ? '+' + st.dice[2] : ''}${st.extra.map(e => ' +' + e.n + 'd' + e.s).join('')}`;
  const dmgAvg = st => Math.round(avgRoll(st.dice[0], st.dice[1]) + st.dice[2] + st.extra.reduce((a, e) => a + avgRoll(e.n, e.s), 0));
  const GEM = '<svg class="gem" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h8l3 4-7 9-7-9z" fill="#d9b45e"/><path d="M4 2l2 4h4l2-4M1 6h14M6 6l2 9 2-9" fill="none" stroke="#6b4a14" stroke-width=".9"/></svg>';
  function bar(cls, cur, max, label) {
    const pct = max ? Math.max(0, Math.min(1, cur / max)) * 100 : 0;
    return `<div class="statbar sb-${cls}"><i style="width:${pct.toFixed(0)}%"></i><span>${label}</span></div>`;
  }
  function partyCol(h, flags) {
    const c = G.CLASSES[h.cls], st = G.heroStats(h, flags, S), tb = G.townBonus(S, h);
    const dead = h.status === 'dead', waiting = h.status === 'waiting';
    const next = G.XP_TABLE[h.level + 1], prev = G.XP_TABLE[h.level] || 0;
    const xp = next ? bar('xp', h.xp - prev, next - prev, `${h.xp} XP · level ${h.level + 1} at ${next}`) : bar('xp', 1, 1, `${h.xp} XP · max level`);
    const town = [tb.hit ? `+${tb.hit} to hit` : '', tb.ac ? `+${tb.ac} AC` : '', tb.dmg ? `+${tb.dmg} damage` : ''].filter(Boolean);
    const skills = Object.keys(G.SKILL_NAMES).map(k => { const v = G.skillBonus(h, k); return `<div><span>${G.SKILL_NAMES[k]}</span><b>${v > 0 ? '+' + v : v}</b></div>`; }).join('');
    const abil = h.ab.map(a => `<li title="${esc(G.ABILITIES[a].text)}">${esc(G.ABILITIES[a].name)}</li>`).join('');
    const nextAb = c.ab[h.level + 1] ? `<li class="soon" title="${esc(G.ABILITIES[c.ab[h.level + 1]].text)}">Level ${h.level + 1}: ${esc(G.ABILITIES[c.ab[h.level + 1]].name)}</li>` : '';
    const items = h.items.map(i => `<li>${GEM}<span><b>${esc(i.name)}</b><small>${esc(i.text)}</small></span></li>`).join('');
    return `<article class="pcol${dead ? ' dead' : ''}">
      <header class="phd"><button class="pport" data-act="hero" data-id="${h.id}" title="Open ${esc(h.name)}'s full sheet">${heroImg(h, 'port lg', h.name)}</button>
        <div><h2>${esc(h.name)}</h2><p>Level ${h.level} ${esc(raceCls(h))}</p><p class="pdrive">Wants ${esc(G.DRIVES[h.drive].want)}</p></div></header>
      ${dead ? '<p class="pstate bad">Fallen</p>' : waiting ? '<p class="pstate">Waiting at the Millbrook tavern</p>' : ''}
      ${bar('hp', dead ? 0 : h.hp, h.maxHp, dead ? `0 / ${h.maxHp} HP` : `${h.hp} / ${h.maxHp} HP`)}
      ${h.maxMana ? bar('mp', h.mana, h.maxMana, `${h.mana} / ${h.maxMana} mana`) : (flags.anyMana ? '<div class="statbar sb-gap" aria-hidden="true"></div>' : '')}
      ${xp}
      <div class="pstats"><div><span>To hit</span><b>+${st.hit}</b></div><div><span>AC</span><b>${st.ac}</b></div>
        <div class="dmg"><span>Damage</span><b>${dmgText(st)}</b><small>about ${dmgAvg(st)} a hit${st.extra.length ? ` · ${esc(st.extra.map(e => e.label).join(', '))}` : ''}</small></div>
        <div><span>Speed</span><b>${st.spd}</b></div><div><span>Save</span><b>+${st.save}</b></div></div>
      ${town.length ? `<p class="ptown" title="From the buildings you've raised in Millbrook. Already counted above.">Millbrook: ${town.join(', ')}</p>` : ''}
      <h3 class="cap">Skills</h3><div class="pskills">${skills}</div>
      <h3 class="cap">Abilities</h3><ul class="ptags">${abil || '<li class="none">None yet</li>'}${nextAb}</ul>
      <h3 class="cap">Artifacts</h3>${items ? `<ul class="pitems">${items}</ul>` : '<p class="hint none">None yet.</p>'}
    </article>`;
  }
  function showParty() {
    const flags = Object.assign({}, G.partyFlags(S.heroes), { anyMana: S.heroes.some(h => h.maxMana) });
    const shared = G.ARTIFACTS.filter(a => a.party && ((a.id === 'crown' && S.crown) || (a.id === 'boots' && S.boots)));
    const live = S.heroes.filter(h => h.status !== 'dead');
    const hp = live.reduce((a, h) => a + h.hp, 0), maxHp = live.reduce((a, h) => a + h.maxHp, 0);
    const P = S.party || {};
    const goal = S.march ? 'the Dark Tower, for the final showdown' : P.goal ? P.goal : 'nowhere yet';
    modal(`<h1 class="dtitle">The party</h1>
      <p class="hint">Level ${G.avgLevel(S)} on average · ${hp} / ${maxHp} HP between them · ${partyShown() || S.march ? `heading for <b>${esc(goal)}</b>` : `in the fog, ${esc(lastSeenText())}`}. Select a portrait for a hero's full sheet.</p>
      <div class="pgrid">${S.heroes.map(h => partyCol(h, flags)).join('')}</div>
      ${shared.length ? `<div class="pshared"><h3 class="cap">Shared by the party</h3><ul class="pitems">${shared.map(a => `<li>${GEM}<span><b>${esc(a.name)}</b><small>${esc(a.text)}</small></span></li>`).join('')}</ul></div>` : ''}
      ${readinessHtml(false)}
      <div class="row end"><button class="btn" data-act="close">Close</button></div>`, null, 'partysheet');
  }
  function showHero(id) {
    const h = S.heroes.find(x => x.id === id); const c = G.CLASSES[h.cls];
    const st = G.heroStats(h, G.partyFlags(S.heroes), S);
    const next = G.XP_TABLE[h.level + 1];
    const abil = h.ab.map(a => `<li><b>${esc(G.ABILITIES[a].name)}.</b> ${esc(G.ABILITIES[a].text)}</li>`).join('');
    const nextAb = c.ab[h.level + 1] ? `<li class="hint">Level ${h.level + 1}: ${esc(G.ABILITIES[c.ab[h.level + 1]].name)}</li>` : '';
    const items = h.items.map(i => `<li><b>${esc(i.name)}.</b> ${esc(i.text)}</li>`).join('') || '<li class="hint">None yet.</li>';
    const skills = Object.keys(G.SKILL_NAMES).map(k => `<div><span>${G.SKILL_NAMES[k]}</span><b>${signed(G.skillBonus(h, k)) || '+0'}</b></div>`).join('');
    const dmg = `${st.dice[0]}d${st.dice[1]}${st.dice[2] ? '+' + st.dice[2] : ''}${st.extra.map(e => ' +' + e.n + 'd' + e.s).join('')}`;
    const R = G.RACES[h.race] || G.RACES.human; const bio = (G.ROSTER_BY[h.rid] || G.ROSTER_BY[h.id] || {}).bio;
    modal(`<div class="sheet">${heroImg(h, 'port xl')}<div><h1 class="dtitle">${esc(h.name)}</h1><p>Level ${h.level} ${esc(raceCls(h))}. Wants ${esc(G.DRIVES[h.drive].want)} (${G.DRIVES[h.drive].label}).</p>${bio ? `<p class="hint"><i>${esc(bio)}</i></p>` : ''}<p class="hint"><b>${esc(R.trait)}.</b> ${esc(R.text)}</p>
      <p class="hint">${h.xp} XP${next ? ' · level ' + (h.level + 1) + ' at ' + next : ' · max level'}</p></div></div>
      <div class="stats"><div><span>To hit</span><b>+${st.hit}</b></div><div><span>AC</span><b>${st.ac}</b></div><div><span>Damage</span><b>${dmg}</b></div><div><span>Speed</span><b>${st.spd}</b></div><div><span>HP</span><b>${h.hp}/${h.maxHp}</b></div><div><span>Mana</span><b>${h.maxMana ? h.mana + '/' + h.maxMana : '—'}</b></div></div>
      <h2 class="cap">Skills</h2><div class="stats">${skills}</div>
      <div class="cols"><div><h2 class="cap">Abilities</h2><ul class="plain">${abil}${nextAb}</ul></div><div><h2 class="cap">Artifacts</h2><ul class="plain">${items}</ul></div></div>
      <div class="row end"><button class="btn" data-act="party">Whole party</button><button class="btn" data-act="close">Close</button></div>`, null, 'wide');
  }
  function showRules(first) {
    const mt = G.minionType(S);
    modal(`<h1 class="dtitle">Overmaster</h1>
      <p>You are ${esc(VF())}, a ${esc(VT().label.toLowerCase())} newly risen in the Dark Tower, and still weak: level 1. Your minions dig, build lairs and breed monsters, and your lairs send them down the roads to burn Millbrook, the heroes' town. The game runs Millbrook and its four heroes. They will grow stronger, and one day they will march on your tower.</p>
      <ol class="rules">
        <li><b>Your eyes are your minions.</b> You start with two ${esc(mt.name.toLowerCase())} at the tower. The map stays dark where none of them have been; you see what your tower, your lairs, your bands, your minions and your villain see. <b>The heroes walk in the fog:</b> you only see them where one of yours can. You know roughly where Millbrook lies (the gold ring) until one of yours sees it.</li>
        <li><b>Gather.</b> Your units sit in the <b>action bar</b> along the bottom of the map: click one (Shift-click for more, <b>I</b> for the next idle minion) and give it an order there, or with its key: <b>M</b> move, <b>G</b> gather, <b>B</b> build, <b>H</b> home, <b>X</b> stop. Send a minion to a gold deposit, timber stand or ore deposit (or ${RCLK()} it): it spends a day sinking a mine or clearing a camp, then the minion is free and the site works on its own. <b>A site fills over a few nights</b> (a gold mine in three) and then waits, sparkling, until you <b>click it to collect</b>; only then does it start again. Press <b>C</b> to jump to the next full one. You start with two minions; the talent A Third Servant (in Dominion) lets you keep a third. The heroes wreck mines they reach, and carry off whatever was piled up there.</li>
        <li><b>Build lairs.</b> Pick <b>Build</b>, choose a lair and click explored ground the heroes can't see. Each lair breeds one kind of monster every night. <b>When it's full, a wave marches to your war camp outside Millbrook on its own.</b> A lair near the town reinforces the camp quickly; one far away is harder for the heroes to find.</li>
        <li><b>Build up the Grounds.</b> The Dark Tower's <b>Grounds</b> tab (or the food counter in the bottom bar) lists the buildings you can raise around the tower with gold, lumber and ore; a minion walks home and works a few nights on each. They raise your limits: the <b>Farm</b> grows the food your lairs eat (1 to 3 each, so you can't keep more lairs than it feeds), the <b>Servants' Quarters</b> house more minions, the <b>Blacksmith</b> forges weapons and armour for every monster, and the Storehouse, Black Obelisk, Library, Summoning Circle, Muster Field, Stockade and Reliquary do the rest. Every level counts toward the tower's growth, and each stage of the tower opens more.</li>
        <li><b>The war camp and the weekly assault.</b> Your waves and the bands that join you gather in a war camp just outside Millbrook; the heroes leave it alone. <b>When the week ends, you hold a war council</b>: attack, lead the assault yourself, or hold back a week. The assault is a battle against Millbrook's gate, towers, militia and town hall (and the heroes, if they're home). Break the gate or a tower to get in; every tower that falls loses Millbrook a level of it; whatever gets inside damages the hall, plunders gold and burns buildings. <b>Bring the hall down and Millbrook is yours.</b> Your villain hits hardest of all, but if ${esc(VP().he)} falls below half health ${esc(VP().he)} flees to the tower for 3 days.</li>
        <li><b>Infamy.</b> Hurting and killing heroes, breaking into Millbrook, plunder and every lair you keep standing earn Infamy. Infamy levels up your villain: stronger on the throne, a new power at levels 6, 11 and 16, and a talent point every level. Spend talents at the Dark Tower on the talent web: six regions around your sigil (The Brood, Dominion, Siegecraft, Dread, ${esc(VN())}'s own path with a monster only ${esc(VP().he)} can raise, and the Wilds for recruiting). Each talent you take has to join one you already have, so every campaign walks its own path.</li>
        <li><b>Your villain walks the map.</b> Click ${esc(VN())} in the sidebar, then ${RCLK()} a band of the wilds to go and win it over: <b>pay</b> it, <b>talk</b> (Intimidate, Persuade or Deceive, a d20 each), or <b>fight</b> it alone. Every wild band shows its level next to ${esc(VP().his)}: a band four levels above ${esc(VP().him)} only fights. Bands that join you march on Millbrook; your banner holds 1 band plus 1 for every ${G.CMD_PER} levels at a time. Beaten, a band may kneel (or buy its life, if your banner is full) and march once it has healed; one that fights to the last leaves its hoard. Lose, and ${esc(VN())} limps home to recover.</li>
        <li><b>Relics.</b> Dark treasures lie hidden around the map, and only ${esc(VN())} can sense them: they glow where your servants have seen one, rarer the farther they lie from the tower. Select ${esc(VN())} and ${RCLK()} one to go and claim it (${esc(VP().he)} can seize the heroes' artifacts before they do, too). ${esc(capWord(VP().he))} wears three at a time and carries the rest; each adds to ${esc(VP().his)} might, menace, stride or command, or gives a power. Some are cursed. <b>R</b> opens them.</li>
        <li><b>The heroes.</b> You never control them. They hunt the monsters they think they can beat, intercept your waves, storm your lairs and raid your mines. Millbrook puts bounties on the lairs that hurt it most. Click any band you can see to <b>Patrol</b>, <b>Level up</b> or send it <b>Away</b>; the card tells you how it would fare against the heroes, and a wave's card how it would fare against the town.</li>
        <li><b>The lie of the land.</b> Battlefields have rivers and ponds (only flyers cross deep water; shallows are slow and leave you easier to hit), bridges, ruins that block sight, low walls that give cover against shots across them, brush to hide in and hills that give archers +1 and let them shoot over cover. Hover a hex to see what it does.</li>
        <li><b>Watch, or take command.</b> Battles play out on their own. Press <b>Take command</b> to play your monsters: every unit gets a <b>Move</b>, an <b>Attack</b> and a <b>Bonus</b> action each turn. <b>Skip</b> jumps to the end of a fight.</li>
        <li><b>Winning and losing.</b> You win if Millbrook's hall falls, or if your monsters wipe out the whole party while the tavern lies in ashes (with a tavern, a new and greener party takes up the sword). You lose if the heroes beat you on your throne. From level ${G.MARCH_LV} they size up the showdown, and they march when they think they'd win, so stay ahead of them. The sooner you win, the higher your score.</li>
      </ol>
      <p class="hint">The game autosaves; the Menu has saving, loading, settings and the chronicle. Drag the map to look around, scroll to zoom, click the minimap to jump, Esc to deselect. Keys: E end day · T your villain and relics · K talents · L lairs · P the heroes · J the chronicle (1–5 switch the Dark Tower's tabs) · I next idle minion (Shift+I all of them) · C next full mine or camp · V your villain · with minions selected: M move, G gather, B build, H home, X stop, N dance (1–9 pick in the Gather and Build menus). In command: M move · F attack · B bonus · E end turn · W wait · D defend · A let the AI play this turn.</p>
      <div class="row end"><button class="btn big" data-act="close">${first ? 'Begin your reign' : 'Back to the game'}</button></div>`, first ? () => setTimeout(() => vsay('intro', { prio: 3, force: true }), 500) : null, 'wide');
  }
  function showOver() {
    const res = S.result; const won = res === 'razed' || res === 'wiped';
    if (!S.trackedOver) { S.trackedOver = true; track('over'); }
    save(true); syncAudio(); sfx(won ? 'win' : 'lose');
    if (!won && res === 'defeat') setTimeout(() => { if (vsay('lose', { prio: 3, force: true })) bark('win', null, { queue: true, force: true }); else bark('win', null, { force: true }); }, 1500);
    if (won) setTimeout(() => vsay('win', { prio: 3, force: true }), 1500);
    const title = res === 'razed' ? 'Millbrook burns' : res === 'wiped' ? 'The heroes are no more' : `${esc(VN())} falls`;
    const text = res === 'razed' ? `Your monsters broke Millbrook's walls and burned its hall to the ground. With the heroes' town gone, the realm is yours. ${esc(VF())} reigns at level ${G.villainLevel(S)}.`
      : res === 'wiped' ? `The last of Millbrook's heroes is dead, and with its tavern in ashes nobody is left to take up the sword. ${esc(VF())} reigns at level ${G.villainLevel(S)}.`
      : `The heroes stormed your citadel at level ${G.avgLevel(S)} and cast down ${esc(VF())}, level ${G.villainLevel(S)}. The realm is saved. Your reign is over, for now.`;
    const sc = G.campaignScore(S);
    const hist = S.history.slice(-16).map(h => { const v = h.vlevel || 0, hl = h.level || 0; return `<div class="wk"><span>W${h.week}</span><i style="height:${Math.max(4, v * 3.6)}%" title="${esc(VN())} level ${v}"></i><b>${v}${hl ? ` · ${hl}` : ''}</b></div>`; }).join('');
    modal(`<h1 class="dtitle xl">${title}</h1><p>${text}</p>
      <div class="stats"><div><span>Score</span><b>${sc.total}</b></div><div><span>Days</span><b>${sc.days}</b></div><div><span>${esc(VN())}</span><b>Lv ${G.villainLevel(S)}</b></div><div><span>Heroes slain</span><b>${S.deaths}</b></div></div>
      ${sc.tier ? `<p class="fxname">${sc.tier}</p>` : ''}
      <div class="cols"><div><h2 class="cap">Score</h2>${ledger(sc.rows, sc.total, 'Total')}<p class="hint">${won ? 'The sooner you win, the higher the score.' : 'A reign that ends on the throne scores for how long it lasted.'}</p></div>
      <div><h2 class="cap">Your level, and the heroes', by week</h2><div class="hist">${hist}</div></div></div>
      <div class="row end"><button class="btn big" data-act="newgame">Start a new campaign</button></div>`, null, 'wide');
  }

  /* ============ encounters ============ */
  /* ============ battle ============ */
  let BF = null;
  const bcv = () => $('bcv');
  // 0.33: a fight between the heroes and a band of the wilds (nothing of yours in it) happens off stage: no battle screen
  function offstageFight() {
    const b = S.battle; if (!b) return false;
    if (b.duel || b.siege || b.finale || b.boss || b.dungeonId || b.guardLair || b.attack || b.raidNode) return false;
    const o = b.objId && S.objects.find(z => z.id === b.objId);
    return !(o && (o.lair || o.yours || o.wave || o.mine));
  }
  function resolveOffstage() {
    const b = S.battle; const o = b.objId && S.objects.find(z => z.id === b.objId); const seen = partyShown();
    const foe = o && G.CREATURES[o.type] ? (o.count > 1 ? G.CREATURES[o.type].name : G.CREATURES[o.type].one).toLowerCase() : 'monsters';
    let g = 0;
    while (S.battle && !S.battle.over && g++ < 20000) {
      if (S.battle.phase === 'deploy') { G.beginBattle(S); continue; }
      if (S.battle.pendingTPK) { G.acceptTPK(S); continue; }
      if (G.autoStep(S)) break;
    }
    const res = S.battle ? G.finishBattle(S) : null;
    renderBar(); save(true);
    if (res) {
      if (res.died && res.died.length) toast(`${res.died.join(' and ')} ${res.died.length > 1 ? 'were' : 'was'} killed fighting ${foe} in the wilds.${res.wiped ? ' The whole party is dead.' : ''}`, 'good', 7000);
      else if (seen) { toast(res.result === 'win' ? `The heroes cut down the ${foe}.` : `The ${foe} drive the heroes off.`, 'sys'); if (res.result === 'win' && Math.random() < 0.4) setTimeout(() => bark(res.label === 'Tense' || res.label === 'Harrowing' ? 'hard' : 'easy'), 400); }
    }
    if (S.phase === 'over') { showOver(); return; }
    if (S.phase === 'battle' && S.battle) { enterBattle(); return; }
    const goOn = () => { if (ui.moving) stepLoop(); else commit(); };
    const after = () => showVillainUps(goOn);
    if (S.pendingLevelUps.length) showLevelUps(after); else after();
  }
  function enterBattle() {
    if (offstageFight()) { resolveOffstage(); return; }
    // no deployment: your monsters line up and the fight starts at once
    if (S.battle.phase === 'deploy') G.beginBattle(S);
    $('adv').hidden = true; $('battle').hidden = false;
    $('battle').classList.toggle('command', !ui.autoBattle);
    $('blogwrap').classList.toggle('open', !!ui.logOpen);
    ui.view = captureView(); ui.playing = false; ui.fx = []; ui.floats = []; BF = null; ui.deploySel = null; ui.trapMode = false;
    $('blog').innerHTML = ''; $('btray').hidden = true;
    for (const l of S.battle.log) appendLog(l.t, l.c);
    S.battle.events = [];
    sizeBattle();
    if (ui.r3d) { W3.attach($('bfield'), $('bcv')); W3.enterBattle(S, BF); W3.setMode('battle'); }
    renderBattleUI(); kick();
    if (ui.autoSkip) setTimeout(() => { if (S.phase === 'battle') skipBattle(); }, 500);
    ui.itemsAtStart = S.heroes.reduce((t, h) => t + h.items.length, 0);
    sfx(S.battle.finale && S.battle.stage !== 1 ? 'laugh' : 'battle', { vol: 0.8 }); syncAudio();
    { const b = S.battle;
      // 0.31: your villain greets the heroes on the throne, then they answer; at the walls, on the road after a wave, at your lair, each has its line
      if (b.duel) { /* the parley already spoke */ }
      else if (b.finale && b.stage !== 1) setTimeout(() => { if (vsay('throne', { prio: 3, force: true })) bark('boss', null, { queue: true, force: true }); else bark('boss'); }, 2600);
      else if (b.assault) {
        if (b.heroesIn) setTimeout(() => bark('walls', null, { force: true, queue: true }), 1800);
        const big = b.units.filter(x => x.side === 'dm' && !x.boss && x.alive).sort((x, y) => y.count * y.maxHp - x.count * x.maxHp)[0];
        if (big) setTimeout(() => msay(big.type, 'charge', { queue: true }), 4200);
      }
      else if (b.siege) setTimeout(() => bark('walls', null, { force: true }), 1100);
      else {
        const o = b.objId && S.objects.find(z => z.id === b.objId);
        const cat = o && o.wave ? 'wave' : b.dungeonId ? 'lair' : b.boss || b.challenge === 'avoid' || b.finale ? 'danger' : 'start';
        if (cat === 'wave' || cat === 'lair' || Math.random() < 0.8) setTimeout(() => bark(cat), 1100);
      } }
    if (S.battle.phase !== 'deploy') setTimeout(battleTick, 400);
  }
  function exitBattle() {
    $('battle').hidden = true; $('adv').hidden = false; BF = null;
    if (ui.itemsAtStart !== undefined && S.heroes.reduce((t, h) => t + h.items.length, 0) > ui.itemsAtStart) sfx('item', { delay: 0.4 });
    ui.itemsAtStart = undefined; syncAudio();
    if (ui.r3d) { W3.exitBattle(); W3.attach($('mapwrap'), $('map')); W3.setMode('map'); W3.centerOn(S.party.x, S.party.y, true); }
    sizeMap(); renderSide();
  }
  function sizeBattle() {
    const cv = bcv(); if (!cv || !S.battle) return;
    const wrap = cv.parentElement.getBoundingClientRect();
    const W = Math.max(300, wrap.width), H = Math.max(240, wrap.height);
    const m = 18; // keep units out from under the oak frame
    const R = Math.min(44, (W - 2 * m) / ((G.BW + 0.5) * SQ3 + 0.4), (H - 2 * m) / (1.5 * (G.BH - 1) + 2.4));
    const fw = (G.BW + 0.5) * SQ3 * R, fh = (1.5 * (G.BH - 1) + 2) * R;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    BF = { R, W, H, x0: (W - fw) / 2, y0: (H - fh) / 2, field: null };
    if (ui.r3d) { W3.resize(); return; }
    BF.field = A.paintField(S.battle.terrain, Math.round(W * dpr), Math.round(H * dpr), S.seed + S.week * 31 + S.day);
  }
  function hexXY(k) { const { c, r } = G.hc(k); const R = BF.R; return { x: BF.x0 + SQ3 * R * (c + 0.5 * (r & 1)) + SQ3 * R / 2, y: BF.y0 + 1.5 * R * r + R }; }
  function hexPath(c, cx, cy, R) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const px = cx + R * Math.cos(a), py = cy + R * Math.sin(a); if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); }
  function hexAtPoint(px, py) {
    let best = -1, bd = Infinity;
    for (let k = 0; k < G.BW * G.BH; k++) { const p = hexXY(k); const d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = k; } }
    return bd <= BF.R ? best : -1;
  }
  function captureView() {
    const v = {}; const b = S.battle; if (!b) return v;
    for (const u of b.units) v[u.id] = { pos: u.pos, count: u.count, hp: u.hp, alive: u.alive, down: u.down, fade: u.alive ? 1 : 0 };
    return v;
  }
  function curUnit() { const b = S.battle; return b && b.units.find(u => u.id === b.cur); }
  function isDmTurn() { const u = curUnit(); const b = S.battle; return b && b.phase !== 'deploy' && u && u.side === 'dm' && !ui.autoBattle && ui.autoTurnFor !== u.id && !b.over && !b.pendingTPK; }
  // what the acting monster can do right now, narrowed by the Move / Attack / Bonus button you picked
  function curOptions() {
    const b = S.battle; const u = curUnit(); if (!u) return null;
    const id = [u.id, b.round, u.pos, u.mv, u.acted ? 1 : 0, u.bonused ? 1 : 0, ui.bmode || '-'].join(':');
    if (ui.optCache && ui.optCache.id === id) return ui.optCache.o;
    let o = G.options(b, u);
    if (u.mv <= 0) o = { reach: new Map([[u.pos, { d: 0, prev: -1 }]]), targets: o.targets, canShoot: o.canShoot };
    if (ui.bmode === 'bonus') { const bo = G.bonusOptions(b, u); o = { reach: new Map(bo ? bo.hexes.map(k => [k, { d: 1, prev: u.pos }]) : []), targets: bo ? bo.targets.map(tid => ({ id: tid, ranged: true, from: [u.pos], bonus: true })) : [], canShoot: false, bonus: true }; }
    else if (ui.bmode === 'move') o = { reach: o.reach, targets: [], canShoot: false };
    else if (ui.bmode === 'attack') o = { reach: new Map([[u.pos, { d: 0, prev: -1 }]]), targets: o.targets, canShoot: o.canShoot };
    ui.optCache = { id, o }; return o;
  }
  const bonusName = u => { const k = G.bonusOf(u); return k ? G.BONUS[k].name : null; };
  // what the 3D battlefield should highlight: zones, reach, hover, targets and line of sight
  function battleSpec3d() {
    const b = S.battle; const deploy = b.phase === 'deploy'; const dm = isDmTurn() && !ui.playing; const u = curUnit();
    const opts = dm ? curOptions() : null; const fill = {}; const outline = []; let line = null;
    for (let k = 0; k < G.BW * G.BH; k++) {
      if (deploy && !ui.trapMode && G.isDmZone(k)) fill[k] = 'rgba(90,130,230,0.22)';
      if (deploy && ui.trapMode && G.isTrapZone(k)) fill[k] = 'rgba(230,90,70,0.18)';
      if (opts && opts.reach.has(k)) fill[k] = 'rgba(255,240,200,0.24)';
    }
    if (deploy && ui.bhover !== null && ui.bhover >= 0) { const ok = ui.trapMode ? G.isTrapZone(ui.bhover) : ui.deploySel && G.isDmZone(ui.bhover); outline.push({ k: ui.bhover, c: ok ? '#ffd36a' : 'rgba(255,255,255,0.45)' }); }
    if (dm && ui.bhover !== null && ui.bhover >= 0) {
      const target = b.units.find(x => x.side === 'party' && x.alive && !x.down && ui.view[x.id] && ui.view[x.id].pos === ui.bhover);
      if (target) {
        const t = opts.targets.find(z => z.id === target.id);
        outline.push({ k: ui.bhover, c: t ? '#ff6a50' : 'rgba(255,255,255,0.5)', w: 6 });
        if (u.ranged && u.shots > 0) { const clear = G.los(b, u.pos, target.pos); line = { a: u.pos, b: target.pos, c: clear ? 'rgba(255,230,140,0.9)' : 'rgba(255,90,70,0.95)', dash: !clear }; }
        if (t && !t.ranged) outline.push({ k: pickFrom(t, ui.bmouse), c: '#ffd36a' });
      } else if (opts.reach.has(ui.bhover)) outline.push({ k: ui.bhover, c: '#ffd36a' });
    }
    if (deploy && ui.deploySel) { const du = b.units.find(x => x.id === ui.deploySel); if (du) outline.push({ k: du.pos, c: '#ffe39a', w: 6 }); }
    const key = JSON.stringify([Object.keys(fill).length, deploy, ui.trapMode, opts ? Array.from(opts.reach.keys()).join(',') : '', outline, line, b.traps.length]);
    return { fill, outline, line, key };
  }
  function drawBattle() {
    const cv = bcv(); const b = S.battle; if (!cv || !b || !BF) return;
    if (ui.r3d) { const now = performance.now(); ui.fx = ui.fx.filter(f => now - f.t0 < f.dur); ui.floats = ui.floats.filter(f => now - f.t0 < 1400); ui.bspec = battleSpec3d(); battleFlash(now); return; }
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(BF.field, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = BF.R; const now = performance.now();
    const deploy = b.phase === 'deploy';
    const dm = isDmTurn() && !ui.playing;
    const u = curUnit();
    const opts = dm ? curOptions() : null;
    // ground features first
    for (const k of Object.keys(b.tiles)) { const t = b.tiles[k]; const p = hexXY(+k); if (t === 'bog') A.bog(c, p.x, p.y, R, +k * 3 + S.seed); else if (t === 'water' || t === 'ford' || t === 'bridge') A.water(c, p.x, p.y, R, t, +k * 5 + S.seed); else if (t === 'hill') A.hill(c, p.x, p.y, R, b.terrain); }
    for (let k = 0; k < G.BW * G.BH; k++) {
      const p = hexXY(k); hexPath(c, p.x, p.y, R * 0.97);
      if (deploy && !ui.trapMode && G.isDmZone(k)) { c.fillStyle = 'rgba(90,130,230,0.13)'; c.fill(); }
      if (deploy && ui.trapMode && G.isTrapZone(k)) { c.fillStyle = 'rgba(230,90,70,0.10)'; c.fill(); }
      if (opts && opts.reach.has(k)) { c.fillStyle = 'rgba(255,240,200,0.14)'; c.fill(); }
      c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1; c.stroke();
    }
    for (const t of b.traps) { const p = hexXY(t.k); A.spikes(c, p.x, p.y, R, t.sprung); }
    if (deploy && ui.bhover !== null && ui.bhover >= 0) {
      const p = hexXY(ui.bhover); hexPath(c, p.x, p.y, R * 0.97);
      const ok = ui.trapMode ? G.isTrapZone(ui.bhover) : ui.deploySel && G.isDmZone(ui.bhover);
      c.strokeStyle = ok ? '#ffd36a' : 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5; c.stroke();
    }
    if (dm && ui.bhover !== null && ui.bhover >= 0) {
      const target = b.units.find(x => x.side === 'party' && x.alive && !x.down && ui.view[x.id] && ui.view[x.id].pos === ui.bhover);
      const p = hexXY(ui.bhover);
      if (target) {
        const t = opts.targets.find(z => z.id === target.id);
        hexPath(c, p.x, p.y, R * 0.97); c.strokeStyle = t ? '#ff6a50' : 'rgba(255,255,255,0.4)'; c.lineWidth = 3; c.stroke();
        if (u.ranged && u.shots > 0) {
          const up = hexXY(u.pos); const clear = G.los(b, u.pos, target.pos);
          c.strokeStyle = clear ? 'rgba(255,230,140,0.8)' : 'rgba(255,90,70,0.85)'; c.setLineDash(clear ? [] : [6, 5]); c.lineWidth = 2;
          c.beginPath(); c.moveTo(up.x, up.y); c.lineTo(p.x, p.y); c.stroke(); c.setLineDash([]);
        }
        if (t && !t.ranged) { const from = pickFrom(t, ui.bmouse); const fp = hexXY(from); hexPath(c, fp.x, fp.y, R * 0.97); c.strokeStyle = '#ffd36a'; c.lineWidth = 2.5; c.stroke(); }
      } else if (opts.reach.has(ui.bhover)) { hexPath(c, p.x, p.y, R * 0.97); c.strokeStyle = '#ffd36a'; c.lineWidth = 2.5; c.stroke(); }
    }
    const draw = [];
    for (const k of Object.keys(b.tiles)) {
      const t = b.tiles[k]; if (t === 'bog' || t === 'water' || t === 'ford' || t === 'bridge' || t === 'hill') continue; const p = hexXY(+k);
      draw.push({ y: p.y - 0.1, f: () => { if (t === 'brush') A.brush(c, p.x, p.y, R, b.terrain, +k * 7 + S.seed); else A.obstacle(c, p.x, p.y, R, b.terrain, +k * 7 + S.seed, t === 'wall' && b.wallLv >= 2 ? 'stonewall' : t); } });
    }
    for (const x of b.units) {
      const v = ui.view[x.id]; if (!v || (!v.alive && v.fade <= 0) || v.ghost) continue;
      const p0 = v.px || hexXY(v.pos); const p = v.lift ? { x: p0.x, y: p0.y - v.lift } : p0;
      draw.push({ y: p0.y, f: () => drawUnit(c, x, v, p, R, now) });
    }
    draw.sort((a, z) => a.y - z.y); for (const d of draw) d.f();
    ui.fx = ui.fx.filter(f => now - f.t0 < f.dur);
    for (const f of ui.fx) if (now >= f.t0) drawFx(c, f, (now - f.t0) / f.dur, R);
    battleFlash(now);
    ui.floats = ui.floats.filter(f => now - f.t0 < 1400);
    for (const f of ui.floats) {
      if (!f.battle) continue;
      const t = (now - f.t0) / 1400; c.globalAlpha = 1 - t * t;
      c.font = `700 ${Math.round(R * 0.46)}px Cinzel, Georgia, serif`; c.textAlign = 'center';
      c.lineWidth = 3.5; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(f.text, f.x, f.y - R * 0.6 - t * R);
      c.fillStyle = f.color; c.fillText(f.text, f.x, f.y - R * 0.6 - t * R); c.globalAlpha = 1;
    }
  }
  function drawUnit(c, x, v, p, R, now) {
    const sz = R * (x.structure ? 2.15 : 1.62); const b = S.battle;
    const cur = (b.cur === x.id && !ui.playing && b.phase !== 'deploy') || (b.phase === 'deploy' && ui.deploySel === x.id);
    c.save();
    if (!v.alive) c.globalAlpha = Math.max(0, v.fade);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(p.x, p.y + R * 0.62, R * 0.62, R * 0.2, 0, 0, 7); c.fill();
    if (cur) { const pulse = 0.55 + 0.45 * Math.sin(now / 220); c.strokeStyle = `rgba(255,214,110,${pulse})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y - R * 0.12, sz / 2 + 4, 0, 7); c.stroke(); }
    if (x.defending && v.alive && !v.down) { c.strokeStyle = 'rgba(140,190,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y - R * 0.12, sz / 2 + 1, 0, 7); c.stroke(); }
    if (v.down) { c.globalAlpha *= 0.55; c.translate(p.x, p.y); c.rotate(Math.PI / 2.4); c.translate(-p.x, -p.y); }
    if (v.flash && now - v.flash < 260) { c.shadowColor = '#ff3020'; c.shadowBlur = 18; }
    { const bi = x.structure && x.art && A.IMG['obj-' + x.art]; const bw = bi && (bi.naturalWidth || bi.width);
      if (bw) { const bh = bi.naturalHeight || bi.height; const k = Math.min(R * 2.5 / bh, R * 2.3 / bw); c.drawImage(bi, p.x - bw * k / 2, p.y + R * 0.6 - bh * k, bw * k, bh * k); }   // 0.38: the town's own building art
      else c.drawImage(A.IMG['unit-' + x.icon], p.x - sz / 2, p.y - sz / 2 - R * 0.12, sz, sz); }
    c.restore();
    if (!v.alive) return;
    if (x.side === 'dm' || x.militia) {
      const t = String(v.count); c.font = `700 ${Math.round(R * 0.36)}px Alegreya, Georgia, serif`;
      const w = Math.max(R * 0.6, c.measureText(t).width + 8), h = R * 0.42;
      const bx = p.x + R * 0.25, by = p.y + R * 0.38;
      if (!x.boss) { c.fillStyle = x.militia ? '#5a1a14' : '#1a2a5a'; c.strokeStyle = '#d9b45e'; c.lineWidth = 1; c.beginPath(); roundRect(c, bx - w / 2, by, w, h, 3); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(t, bx, by + h * 0.78); }
      if (x.boss || (x.count === 1 && x.maxHp >= 60)) { const f = Math.max(0, v.hp / x.maxHp); c.fillStyle = '#000'; c.fillRect(p.x - R * 0.55, p.y + R * 0.86, R * 1.1, 4); c.fillStyle = x.boss ? '#c06cff' : '#e8604f'; c.fillRect(p.x - R * 0.55, p.y + R * 0.86, R * 1.1 * f, 4); }
    } else {
      const f = Math.max(0, v.hp / x.maxHp);
      c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(p.x - R * 0.6, p.y + R * 0.58, R * 1.2, 6);
      c.fillStyle = f < 0.3 ? '#e8604f' : f < 0.6 ? '#e6a94a' : '#64b04c'; c.fillRect(p.x - R * 0.6 + 1, p.y + R * 0.58 + 1, (R * 1.2 - 2) * f, 4);
      if (v.down) { c.font = `700 ${Math.round(R * 0.3)}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.fillStyle = '#ff8a7a'; c.fillText('DOWN', p.x, p.y + R * 0.5); }
    }
  }
  // 0.41: the 3D spells' kinds, drawn the simple way on the flat battlefield
  const FX2D = { cast: 'ring', orb: 'shot', dart: 'shot', mist: 'shot', blast: 'boom', beam: 'bolt', nova: 'ring', souls: 'ring', clock: 'ring', portal: 'ring', poof: 'ring', pillar: 'holy', heal2: 'heal', breath2: 'flame' };
  function drawFx(c, f, t, R) {
    if (f.kind === 'flash') return;
    if (FX2D[f.kind]) { const g = Object.assign({}, f, { kind: FX2D[f.kind] }); if (f.kind === 'orb' && f.sky) { g.x = f.x2 - R * 2; g.y = f.y2 - R * 7; } if (f.kind === 'cast' || f.kind === 'poof') t = Math.min(1, t * 2.5); if (f.kind === 'breath2') { g.x = f.x2; g.y = f.y2; } if (g.kind === 'ring' && !g.color) g.color = '#c9a0ff'; f = g; }
    c.save();
    if (f.kind === 'boom') { c.globalAlpha = 1 - t; const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * (0.6 + t * 1.6)); g.addColorStop(0, 'rgba(255,240,170,0.95)'); g.addColorStop(0.5, 'rgba(255,140,40,0.8)'); g.addColorStop(1, 'rgba(160,30,10,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, R * (0.6 + t * 1.6), 0, 7); c.fill(); }
    if (f.kind === 'bolt') { c.globalAlpha = 1 - t * 0.7; c.strokeStyle = f.color || '#bfe6ff'; c.lineWidth = 3; c.shadowColor = f.color || '#8fd0ff'; c.shadowBlur = 12; c.beginPath(); c.moveTo(f.x, f.y); const n = 6; for (let i = 1; i <= n; i++) { const q = i / n; c.lineTo(f.x + (f.x2 - f.x) * q + (i < n ? (Math.sin(i * 12.9 + f.seed) * R * 0.35) : 0), f.y + (f.y2 - f.y) * q + (i < n ? Math.cos(i * 7.3 + f.seed) * R * 0.35 : 0)); } c.stroke(); }
    if (f.kind === 'shot') { const q = Math.min(1, t * 1.3); const px = f.x + (f.x2 - f.x) * q, py = f.y + (f.y2 - f.y) * q - Math.sin(q * Math.PI) * R * (f.arc || 0.8); c.fillStyle = f.color || '#ffe9a8'; c.shadowColor = f.color || '#ffe9a8'; c.shadowBlur = 10; c.beginPath(); c.arc(px, py, R * 0.14, 0, 7); c.fill(); }
    if (f.kind === 'heal') { c.globalAlpha = 1 - t; c.fillStyle = '#9dffb0'; for (let i = 0; i < 7; i++) { const a = i * 0.9 + f.seed; c.beginPath(); c.arc(f.x + Math.cos(a) * R * 0.45, f.y - t * R * 1.1 + Math.sin(a * 2) * R * 0.2, R * 0.08, 0, 7); c.fill(); } }
    if (f.kind === 'ring') { c.globalAlpha = 1 - t; c.strokeStyle = f.color || '#c06cff'; c.lineWidth = 4; c.shadowColor = f.color || '#c06cff'; c.shadowBlur = 16; c.beginPath(); c.arc(f.x, f.y, R * (0.5 + t * 6), 0, 7); c.stroke(); }
    if (f.kind === 'holy') { c.globalAlpha = 1 - t; c.fillStyle = 'rgba(255,250,210,0.8)'; c.fillRect(f.x - R * 0.12, f.y - R * 3 * (1 - t), R * 0.24, R * 3 * (1 - t)); }
    if (f.kind === 'flame') { c.globalAlpha = 1 - t; const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * 1.1); g.addColorStop(0, 'rgba(255,220,120,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, R * 1.1, 0, 7); c.fill(); }
    c.restore();
  }
  function pickFrom(t, mouse) {
    if (t.from.length === 1 || !mouse) return t.from[0];
    const tp = hexXY(S.battle.units.find(x => x.id === t.id).pos);
    const ang = Math.atan2(mouse.y - tp.y, mouse.x - tp.x);
    let best = t.from[0], bd = Infinity;
    for (const k of t.from) { const p = hexXY(k); const a = Math.atan2(p.y - tp.y, p.x - tp.x); let d = Math.abs(a - ang); if (d > Math.PI) d = 2 * Math.PI - d; if (d < bd) { bd = d; best = k; } }
    return best;
  }

  /* --- battle playback --- */
  function play(events, done) {
    ui.playing = true; kick();
    const speed = reduced ? 0.01 : ui.fast ? 0.45 : 1;
    let i = 0; const tok = ui.skipTok;
    const next = () => {
      if (ui.skipTok !== tok) return; // the fight was skipped: this playback is over
      if (i >= events.length) { ui.view = captureView(); ui.playing = false; renderBattleUI(); kick(); done(); return; }
      const ev = events[i++];
      const d = playEvent(ev, speed);
      if (d && d.then) d.then(() => setTimeout(next, 120 * speed)); else if (d > 0) setTimeout(next, d); else next();
    };
    next();
  }
  function playEvent(ev, speed) {
    battleSfx(ev);
    const b = S.battle; const now = performance.now();
    const unit = id => b.units.find(x => x.id === id);
    if (ev.t === 'log') { appendLog(ev.text, ev.c); return 0; }
    if (ev.t === 'roll') {
      if (!ui.dice) return 0;
      const tray = $('btray'); clearTimeout(ui.trayHide);
      return Dice.show(tray, ev, speed).then(() => { ui.trayHide = setTimeout(() => { if (!ui.playing || !ui.dice) tray.hidden = true; }, 2600); });
    }
    if (ev.t === 'move' && S.battle && (ev.path || []).some(k => S.battle.tiles[k] === 'ford')) sfxOr('splash', 'steps-swamp', { vol: 0.5, gap: 300 });   // 0.38: wading
    if (ev.t === 'move' && ev.blink) {   // 0.41: a teleport: a puff where it goes, a puff where it comes back
      const v = ui.view[ev.id]; if (!v) return 0;
      const a = hexXY(ev.path[0]), z = hexXY(ev.path[ev.path.length - 1]); const col = { misty: '#c9b0ff', phase: '#bfe8ff', mist: '#ff6a7a' }[ev.style] || '#c08aff';
      const per = 420 * speed; ui.fx.push({ kind: 'poof', x: a.x, y: a.y, color: col, t0: now, dur: 620 * speed, seed: Math.random() * 9 }); ui.fx.push({ kind: 'poof', x: z.x, y: z.y, color: col, t0: now + per * 0.8, dur: 620 * speed, seed: Math.random() * 9 });
      sfxOr('sp-poof', 'open', { vol: 0.5 }); v.ghost = true; setTimeout(() => { v.pos = ev.path[ev.path.length - 1]; v.px = null; v.lift = 0; v.ghost = false; }, per * 0.85);
      return per + 60 * speed;
    }
    if (ev.t === 'move') {
      const v = ui.view[ev.id]; if (!v) return 0;
      const pts = ev.path.map(hexXY); const per = (ev.fly ? 360 : 110 * (pts.length - 1)) * speed;
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / Math.max(1, per));
        if (ev.fly) { const a = pts[0], z = pts[pts.length - 1]; v.px = { x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t }; v.lift = Math.sin(t * Math.PI) * BF.R * 1.2; }
        else { const f = t * (pts.length - 1); const i = Math.min(pts.length - 2, Math.floor(f)); const q = f - i; const a = pts[i], z = pts[i + 1] || a; v.px = { x: a.x + (z.x - a.x) * q, y: a.y + (z.y - a.y) * q }; }
        if (t < 1) requestAnimationFrame(step); else { v.px = null; v.lift = 0; v.pos = ev.path[ev.path.length - 1]; }
      };
      step(); return per + 20;
    }
    if (ev.t === 'attack') {
      const a = unit(ev.src); const va = ui.view[ev.src], vd = ui.view[ev.target]; if (!va || !vd) return 0;
      const pa = hexXY(va.pos), pd = hexXY(vd.pos);
      va.face = vd.pos; va.atk = performance.now(); clearTimeout(va.faceT); va.faceT = setTimeout(() => { va.face = null; }, 900 * speed + 200);   // 0.38: atk starts its attack animation
      if (ev.ranged) { ui.fx.push({ kind: 'shot', x: pa.x, y: pa.y - BF.R * 0.2, x2: pd.x, y2: pd.y - BF.R * 0.2, t0: now, dur: 320 * speed, color: a.side === 'party' ? '#ffb060' : a.type === 'giant' ? '#8a7a6a' : '#ffe9a8', arc: a.type === 'giant' ? 1.4 : 0.5 }); return 260 * speed; }
      const t0 = performance.now(); const dur = 220 * speed;
      const step = () => { const t = Math.min(1, (performance.now() - t0) / Math.max(1, dur)); const q = Math.sin(t * Math.PI) * 0.35; va.px = { x: pa.x + (pd.x - pa.x) * q, y: pa.y + (pd.y - pa.y) * q }; if (t < 1) requestAnimationFrame(step); else va.px = null; };
      step(); return dur * 0.6;
    }
    if (ev.t === 'miss') { const vd = ui.view[ev.target]; if (!vd) return 0; const p = hexXY(vd.pos); ui.floats.push({ battle: true, x: p.x, y: p.y, text: 'Miss', color: '#c9c0aa', t0: now }); return 150 * speed; }
    if (ev.t === 'fall') { const vd = ui.view[ev.id]; if (!vd) return 0; const p = hexXY(vd.pos); vd.alive = false; fadeOut(vd, speed * 2); ui.fx.push({ kind: 'boom', x: p.x, y: p.y, t0: now, dur: 900 * speed }); ui.floats.push({ battle: true, x: p.x, y: p.y, text: ev.kind === 'gate' ? 'The gate falls!' : ev.kind === 'hall' ? 'The hall falls!' : 'Destroyed!', color: '#ffd36a', t0: now });
      if (ev.kind === 'gate') sfxOr('splinter', 'crit'); else sfxOr('crumble', 'crit'); sfx('fire', { delay: 0.25, vol: 0.6 });
      { const bb = S.battle; const heroes = bb && bb.heroesIn && bb.units.some(x => G.isHeroUnit(x) && x.alive && !x.down);   // 0.38: who says what as the town comes apart
        if (ev.kind === 'gate') { if (!vsay('breach', { prio: 3 }) && heroes) bark('gate', null, { force: true }); else if (heroes) setTimeout(() => bark('gate', null, { queue: true }), 300); }
        else if (ev.kind !== 'hall') { if (Math.random() < 0.6) vsay('tower', { prio: 2 }); else if (heroes) bark('tower', null, { force: true }); } }
      renderBattleUI(true); return 700 * speed; }
    if (ev.t === 'trapfx') { const p = hexXY(ev.k); ui.fx.push({ kind: 'ring', x: p.x, y: p.y, t0: now, dur: 400 * speed, color: '#ff6a50' }); return 200 * speed; }
    if (ev.t === 'revive') { const v = ui.view[ev.id]; const u = unit(ev.id); if (v && u) { v.down = false; v.hp = u.hp; } renderBattleUI(true); return 200 * speed; }
    if (ev.t === 'hit') {
      const d = unit(ev.target); const vd = ui.view[ev.target]; if (!d || !vd) return 0;
      const p = hexXY(vd.pos);
      if (ev.dodge) { ui.floats.push({ battle: true, x: p.x, y: p.y, text: 'Dodge!', color: '#bfe6ff', t0: now }); return 260 * speed; }
      vd.flash = now;
      if (ev.escaped) { vd.alive = false; fadeOut(vd, speed); ui.fx.push({ kind: 'ring', x: p.x, y: p.y, t0: now, dur: 700 * speed, color: '#c06cff' }); ui.floats.push({ battle: true, x: p.x, y: p.y, text: 'Vanishes!', color: '#d9a8ff', t0: now }); renderBattleUI(true); return 500 * speed; }
      if (d.side === 'dm' || d.militia) { if (d.boss) vd.hp = Math.max(0, vd.hp - ev.dmg); vd.count = Math.max(0, vd.count - (ev.killed || 0)); if (ev.died) { vd.alive = false; fadeOut(vd, speed); } }
      else { vd.hp = Math.max(0, vd.hp - ev.dmg); if (ev.down) vd.down = true; if (ev.died) { vd.alive = false; fadeOut(vd, speed); } if (ev.relentless) vd.hp = 1; }
      if (ev.dmg || ev.died) {
        const txt = (ev.crit ? 'Crit! ' : '') + '−' + ev.dmg + (ev.killed ? ` (${ev.killed} slain)` : '') + (ev.down ? ' · down' : '');
        ui.floats.push({ battle: true, x: p.x, y: p.y, text: txt, color: d.side === 'party' ? '#ff8a7a' : ev.crit ? '#ffe066' : '#fff4d6', t0: now });
      }
      renderBattleUI(true);
      return 260 * speed;
    }
    if (ev.t === 'spell') return spellFx(ev, speed);
    if (ev.t === 'summon') { const u = unit(ev.id); const p = hexXY(u.pos); ui.fx.push({ kind: 'portal', x: p.x, y: p.y, t0: now, dur: 1100 * speed, color: u.undead ? '#7affc0' : '#9a5aff', seed: Math.random() * 9 }); ui.fx.push({ kind: 'ring', x: p.x, y: p.y, t0: now, dur: 500 * speed, color: '#8fb0ff' }); ui.view[ev.id] = { pos: u.pos, count: u.count, hp: u.hp, alive: true, down: false, fade: 1, born: now + 320 * speed }; return 420 * speed; }
    return 0;
  }
  /* ============ 0.41: spells, played out ============
     Each spell is a wind-up at the caster (a circle of runes, light gathering in the hands) and then what it does:
     the kinds of effect are drawn by world3d.js (or simply, on the flat battlefield, by drawFx). Returns how long the
     next event should wait, so the damage numbers land with the blow. */
  const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const SPELL_COL = { arcane: '#c08aff', fire: '#ffb040', holy: '#ffe08a', necro: '#b07aff', nature: '#7dff9a', storm: '#a8d8ff', blood: '#ff4a6a', time: '#bfe0ff', hell: '#ff6a3a', green: '#7dff6a' };
  function spellFx(ev, speed) {
    const b = S.battle; const now = performance.now(); const sp = speed;
    const at = id => { const v = ui.view[id]; return v ? hexXY(v.pos) : null; };
    const unitOf = id => b.units.find(x => x.id === id);
    const src = ev.src && ui.view[ev.src] ? ev.src : null; const su = src && unitOf(src); const ps = src ? at(src) : { x: BF.W - 40, y: 40 };
    const tg = (ev.targets || []).filter(id => ui.view[id]);
    const add = (kind, o, delay, dur) => ui.fx.push(Object.assign({ kind, t0: now + delay * sp, dur: dur * sp, seed: Math.random() * 9 }, o));
    const flash = (color, op, delay, dur) => add('flash', { color, op }, delay, dur);
    // sounds at their moment: a new spell sound if it's been made (elevenlabs_gen.py spells), else the nearest old one
    const snd = (k, alt, delay, vol) => { const go = () => { if (!window.SND) return; const n = SND.has(k) ? k : alt; if (n) SND.play(n, { vol: vol == null ? 0.8 : vol, gap: 30 }); }; if (delay > 0) setTimeout(go, delay * sp); else go(); };
    // the wind-up: the caster turns to face its target and starts its cast; a building just glows
    const cast = (color, dur, toward) => {
      if (!src) return 0;
      const tp = toward || (tg[0] && tg[0] !== src && at(tg[0])) || null;
      add('cast', { x: ps.x, y: ps.y, x2: tp ? tp.x : ps.x, y2: tp ? tp.y : ps.y + 1, src, color, frac: su && su.structure ? 0.92 : null }, 0, dur);
      snd('sp-cast', null, 0, 0.55);
      const v = ui.view[src];
      if (v && !(su && su.structure)) { v.atk = now; const tv = tg[0] && tg[0] !== src ? ui.view[tg[0]] : null; if (tv) { v.face = tv.pos; clearTimeout(v.faceT); v.faceT = setTimeout(() => { v.face = null; }, dur * sp + 900 * sp); } }
      return dur * (su && su.structure ? 0.35 : 0.6);
    };
    const P = ev.power, F = ev.fx;
    // healing, in every flavour: light rising around whoever it lands on
    if (ev.heal) {
      const pal = P === 'potion' ? 'potion' : P === 'wind' ? 'wind' : P === 'phylactery' ? 'phyl' : P === 'divine' || F === 'resurrect' || F === 'miracle' || F === 'holyword' ? 'gold' : 'green';
      for (const id of tg) { const tv = ui.view[id], u2 = unitOf(id); if (tv && u2) { tv.hp = u2.hp; tv.down = u2.down; tv.alive = u2.alive; } }
      if (P === 'phylactery') { snd('sp-soul', 'dark', 0); const p = at(src) || ps; add('portal', { x: p.x, y: p.y, color: '#6affb8' }, 0, 1300); add('heal2', { x: p.x, y: p.y, dst: src, pal: 'phyl' }, 300, 1200); flash('#6affb8', 0.25, 250, 700); renderBattleUI(true); return 950 * sp; }
      const big = pal === 'gold' && (P === 'divine' || F === 'resurrect' || F === 'miracle' || F === 'holyword');
      const d0 = src && pal !== 'potion' && pal !== 'wind' ? cast(pal === 'gold' ? SPELL_COL.holy : SPELL_COL.nature, 480) : 0;
      tg.forEach((id, i) => { const p = at(id); if (big) add('pillar', { x: p.x, y: p.y, dst: id, color: '#ffe9a0' }, d0 + i * 60, 950); add('heal2', { x: p.x, y: p.y, dst: id, pal }, d0 + i * 60 + (big ? 160 : 0), 1150); });
      if (big) flash('#fff2c0', 0.3, d0, 500);
      if (pal === 'potion') snd('item', null, 0, 0.6); snd(big ? 'sp-holy' : 'sp-heal', 'holy', d0, 0.75);
      renderBattleUI(true);
      return (d0 + 420 + tg.length * 60) * sp;
    }
    // fire: a Fireball, the Arcane Tower's fire, the hellfire orb; a demon's hellfire falls from the sky instead
    if (F === 'fireball') {
      const cp = hexXY(ev.center != null ? ev.center : (ui.view[tg[0]] || {}).pos || 0);
      if (P === 'hellfire') {
        const d0 = cast(SPELL_COL.hell, 600, cp);
        add('orb', { x: cp.x, y: cp.y, x2: cp.x, y2: cp.y, sky: true, pal: 'hell', size: 1.5 }, d0, 430);
        add('blast', { x: cp.x, y: cp.y, pal: 'hell', size: 1.5, shake: 0.3 }, d0 + 410, 1150); snd('sp-boom', 'fire', d0 + 400); flash('#ff5a2a', 0.38, d0 + 410, 520);
        return (d0 + 410 + 420) * sp;
      }
      const pal = P === 'orb' ? 'hell' : P === 'arcane' ? 'arcane' : 'fire';
      const d0 = cast(pal === 'arcane' ? SPELL_COL.arcane : pal === 'hell' ? SPELL_COL.hell : SPELL_COL.fire, 540, cp); const fl = 430;
      add('orb', { x: ps.x, y: ps.y, x2: cp.x, y2: cp.y, src, pal, size: P === 'orb' ? 1.15 : 0.85, arc: 1.4, frac: su && su.structure ? 0.92 : null }, d0, fl);
      add('blast', { x: cp.x, y: cp.y, pal, size: 1.55 }, d0 + fl - 20, 1100); snd('sp-boom', 'fire', d0 + fl - 30); flash(pal === 'arcane' ? '#c08aff' : '#ffb060', 0.32, d0 + fl, 460);
      return (d0 + fl + 380) * sp;
    }
    // Meteor Shower and the Archmage's Meteor Swarm: a falling star for every hero it hits
    if (F === 'meteor') {
      const d0 = cast('#ff9a3a', 640, null);
      tg.forEach((id, i) => { const p = at(id); const dl = d0 + i * 150 + Math.random() * 70; add('orb', { x: p.x, y: p.y, x2: p.x, y2: p.y, dst: id, sky: true, pal: 'fire', size: 1.15 }, dl, 470); add('blast', { x: p.x, y: p.y, pal: 'fire', size: 1.05, shake: 0.28 }, dl + 450, 1000); snd('sp-boom', 'fire', dl + 440, 0.7); });
      if (tg.length) flash('#ffa040', 0.25, d0 + 450, tg.length * 150 + 450);
      return (d0 + tg.length * 150 + 450 + 320) * sp;
    }
    // Lightning Bolt, and Chain Lightning leaping from one target to the next
    if (F === 'lightning' || F === 'chain') {
      const d0 = cast(SPELL_COL.storm, 440);
      tg.forEach((id, i) => { const p = at(id); const prev = F === 'chain' && i ? tg[i - 1] : null; const fp = prev ? at(prev) : ps; const dl = d0 + (F === 'chain' ? i * 210 : 0);
        add('bolt', { x: fp.x, y: fp.y, x2: p.x, y2: p.y, src: prev ? null : src, from: prev, dst: id, color: '#bfe6ff' }, dl, 540); flash('#e4f2ff', 0.42, dl, 200); snd('sp-thunder', 'crit', dl, i ? 0.6 : 0.85); });
      return (d0 + (F === 'chain' ? (tg.length - 1) * 210 : 0) + 430) * sp;
    }
    // Millbrook's towers loose arrows from the nearest standing tower
    if (F === 'arrow' && (ev.arrows || !src)) {
      const towers = b.units.filter(x => x.structure && x.alive && x.side === 'party' && x.kind !== 'gate' && x.kind !== 'hall');
      tg.forEach((id, i) => { const p = at(id); const tw = towers.length ? towers[i % towers.length] : null; const fp = tw ? at(tw.id) : ps; add('shot', { x: fp.x, y: fp.y - BF.R * 0.8, x2: p.x, y2: p.y, color: '#ffe9a8', arc: 0.5 }, i * 60, 340); });
      snd('arrow', null, 0, 0.8);
      return (300 + tg.length * 60) * sp;
    }
    // Magic Missile: one dart for every missile, each on its own curve
    if (F === 'arrow') {
      const id = tg[0]; const p = id && at(id); const n = Math.min(9, ev.n || 3); const d0 = cast(SPELL_COL.arcane, 420); if (!p) return d0 * sp;
      for (let i = 0; i < n; i++) { add('dart', { x: ps.x, y: ps.y, x2: p.x, y2: p.y, src, dst: id, color: '#c08aff' }, d0 + i * 75, 560); snd('sp-zap', i ? null : 'arrow', d0 + i * 75, 0.5); }
      return (d0 + n * 75 + 470) * sp;
    }
    // Disintegrate: the green ray
    if (F === 'disintegrate') {
      const id = tg[0]; const p = id && at(id); const d0 = cast(SPELL_COL.green, 500);
      if (p) { add('beam', { x: ps.x, y: ps.y, x2: p.x, y2: p.y, src, dst: id, color: '#7dff6a' }, d0, 950); flash('#9aff8a', 0.28, d0, 320); snd('sp-beam', 'dark', d0); }
      return (d0 + 650) * sp;
    }
    // radiant: Holy Word, the Temple Bell, Spirit Guardians
    if (F === 'holyword') {
      if (P === 'spirits') {
        add('nova', { x: ps.x, y: ps.y, src, color: '#ffe08a', radius: 2.4 }, 0, 700); snd('sp-holy', 'holy', 0, 0.6);
        tg.forEach((id, i) => { const p = at(id); add('dart', { x: ps.x, y: ps.y, x2: p.x, y2: p.y, src, dst: id, color: '#ffe08a', low: true }, i * 90, 520); add('pillar', { x: p.x, y: p.y, dst: id, color: '#fff2b0', h: 4 }, i * 90 + 370, 650); });
        return (tg.length * 90 + 620) * sp;
      }
      const d0 = su && su.structure ? 150 : cast(SPELL_COL.holy, 540);
      add('nova', { x: ps.x, y: ps.y, src, color: '#ffd86a', color2: '#fff0c0', radius: su && su.structure ? 9 : 7 }, Math.max(0, d0 - 80), 1000);
      tg.forEach((id, i) => { const p = at(id); add('pillar', { x: p.x, y: p.y, dst: id, color: '#ffd86a' }, d0 + 120 + i * 70, 850); });
      flash('#fff4c0', 0.34, d0, 420); snd('sp-holy', 'holy', Math.max(0, d0 - 80));
      return (d0 + 120 + tg.length * 70 + 450) * sp;
    }
    // the vampire's Charm: a ribbon of crimson mist, then motes circling the charmed hero's head
    if (P === 'charm') {
      const id = tg[0]; const d0 = cast(SPELL_COL.blood, 500);
      if (id) { const p = at(id); add('mist', { x: ps.x, y: ps.y, x2: p.x, y2: p.y, src, dst: id }, Math.max(0, d0 - 120), 1350); } snd('sp-charm', 'dark', Math.max(0, d0 - 120));
      return (d0 + 820) * sp;
    }
    // Time Stop: a clock of runes over the whole field
    if (P === 'timestop') { const d0 = cast(SPELL_COL.time, 620); add('clock', { x: ps.x, y: ps.y, src }, Math.max(0, d0 - 150), 1900); snd('sp-time', 'dark', Math.max(0, d0 - 150)); flash('#bfe0ff', 0.42, Math.max(0, d0 - 100), 1500); return (d0 + 950) * sp; }
    // Soul Rend: a necrotic wave from the lich, and a wisp of every hero's soul dragged back to it
    if (F === 'rend') {
      const d0 = cast(SPELL_COL.necro, 720);
      add('nova', { x: ps.x, y: ps.y, src, color: '#9a5aff', color2: '#4a1a7a', radius: 14, dark: true }, Math.max(0, d0 - 150), 1100);
      tg.forEach((id, i) => { const p = at(id); add('souls', { x: p.x, y: p.y, x2: ps.x, y2: ps.y, dst: id, src, color: '#c9a8ff' }, d0 + 150 + i * 60, 1250); });
      flash('#6a2aaa', 0.32, d0, 650); snd('sp-soul', 'dark', Math.max(0, d0 - 150));
      return (d0 + 720) * sp;
    }
    // fire from the jaws (the dragon, a dragon in your army) and a demon's fire aura
    if (F === 'breath') {
      if (P === 'aura') { snd('fire', null, 0, 0.7); add('nova', { x: ps.x, y: ps.y, src, color: '#ff8a2a', color2: '#ff4a1a', radius: 2.6 }, 0, 800); tg.forEach((id, i) => { const p = at(id); add('blast', { x: p.x, y: p.y, pal: 'fire', size: 0.6, shake: 0.05 }, 180 + i * 60, 800); }); return 640 * sp; }
      const d0 = cast('#ff9a3a', 380, tg[0] && at(tg[0]));
      tg.forEach((id, i) => { const p = at(id); add('breath2', { x: ps.x, y: ps.y, x2: p.x, y2: p.y, src, dst: id }, d0 + i * 40, 1100); add('blast', { x: p.x, y: p.y, pal: 'fire', size: 0.75, shake: 0.08 }, d0 + 320 + i * 40, 900); });
      if (tg.length) flash('#ff8a3a', 0.22, d0 + 200, 620); snd('sp-breath', 'fire', d0);
      return (d0 + 860) * sp;
    }
    return (cast('#c9a0ff', 420) + 150) * sp;
  }
  // 0.41: the screen's own flash for the big spells (both battlefields): a soft wash of the spell's colour
  function battleFlash(now) {
    const el = $('bflash'); if (!el) return; let best = null, op = 0;
    for (const f of ui.fx) { if (f.kind !== 'flash' || now < f.t0) continue; const t = (now - f.t0) / f.dur; if (t > 1) continue; const o = (f.op || 0.3) * Math.min(1, t * 5) * (1 - t) * (REDUCED ? 0.5 : 1); if (o > op) { op = o; best = f; } }
    el.style.opacity = op.toFixed(3); if (best && el.dataset.c !== best.color) { el.dataset.c = best.color; el.style.background = `radial-gradient(ellipse at 50% 55%, ${best.color} 0%, transparent 75%)`; }
  }
  function fadeOut(v, speed) { const t0 = performance.now(); const dur = 450 * speed; const step = () => { v.fade = 1 - Math.min(1, (performance.now() - t0) / Math.max(1, dur)); if (v.fade > 0) requestAnimationFrame(step); }; step(); }
  function appendLog(text, cls) {
    const el = $('blog'); if (!el) return;
    const li = document.createElement('li'); li.className = 'l-' + (cls || 'note'); li.textContent = text;
    el.appendChild(li); while (el.children.length > 80) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }
  // skip: the rest of the fight is decided at once, and it's straight to the result
  function skipBattle() {
    if (!S.battle || S.phase !== 'battle') return;
    ui.skipTok = (ui.skipTok || 0) + 1; clearTimeout(ui.btimer); ui.playing = false; ui.autoTurnFor = null;
    let g = 0;
    while (S.battle && !S.battle.over && g++ < 20000) {
      if (S.battle.phase === 'deploy') { G.beginBattle(S); continue; }
      if (S.battle.pendingTPK) { G.acceptTPK(S); continue; }
      if (G.autoStep(S)) break;
    }
    if (!S.battle) return;
    S.battle.events = []; ui.view = captureView(); ui.fx = []; ui.floats = []; $('btray').hidden = true;
    renderBattleUI();
    if (S.battle.over) finishBattle();
  }
  function battleTick() {
    if (ui.playing || S.phase !== 'battle') return;
    const b = S.battle; if (!b || b.phase === 'deploy') return;
    renderBattleUI();
    if (b.over) { setTimeout(finishBattle, ui.fast ? 200 : 600); return; }
    if (b.pendingTPK) return;
    const u = curUnit(); if (!u) return;
    if (ui.autoTurnFor && ui.autoTurnFor !== u.id) ui.autoTurnFor = null;
    const ai = cu => cu.side === 'party' || ui.autoBattle || ui.autoTurnFor === cu.id;
    if (ai(u)) {
      clearTimeout(ui.btimer);
      // the AI plays a turn step by step; ending a turn is instant
      const step = () => { if (ui.playing || !S.battle || S.battle.over || S.battle.pendingTPK) return; const cu = curUnit(); if (!cu || !ai(cu)) { battleTick(); return; } const a = G.autoAction(S); if (a && a.type === 'end') { G.act(S, a); ui.optCache = null; battleTick(); return; } doAct(a); };
      ui.btimer = setTimeout(step, reduced ? 50 : ui.fast ? 140 : u.steps ? 260 : 420);
    } else { ui.optCache = null; kick(); }
  }
  function doAct(a) {
    if (!a || ui.playing) return;
    const err = G.act(S, a);
    if (err) { toast(err, 'bad'); return; }
    ui.optCache = null; ui.bhover = null; ui.bmode = null;
    play(S.battle.events, () => { save(); battleTick(); });
  }
  function dmCast(k) {
    const err = G.dmSpell(S, k);
    if (err) { toast(err, 'bad'); return; }
    closeModal(); ui.optCache = null; renderBar();
    play(S.battle.events, () => { save(); battleTick(); });
  }
  function beginBattle() {
    G.beginBattle(S); ui.deploySel = null; ui.trapMode = false; renderBar();
    play(S.battle.events, () => { save(); battleTick(); });
  }
  function finishBattle() {
    const b = S.battle; if (!b || !b.over) return;
    const res = G.finishBattle(S);
    renderBar(); save(true); $('btray').hidden = true;
    if (res && res.duel) { duelResult(res); return; }
    if (res && res.assault) { assaultResult(res); return; }
    if (res.result === 'win' && !(res.finale && res.stage !== 1)) { const hard = res.label === 'Tense' || res.label === 'Harrowing'; if (Math.random() < (hard ? 0.85 : 0.35)) setTimeout(() => bark(hard ? 'hard' : 'easy'), 700); }
    const killed = Object.keys(res.killed).map(k => `<li>${res.killed[k]} ${esc(res.killed[k] > 1 ? res.plural[k] || k : k)}</li>`).join('') || '<li class="hint">Nothing.</li>';
    const title = res.result === 'win' ? (res.finale && res.stage === 1 ? 'The heroes break through your gates' : res.finale ? `${esc(VN())} falls` : res.boss ? `${esc(VN())} is driven off` : res.dungeon ? 'The heroes wreck your lair' : res.siege ? 'Millbrook holds' : res.attack ? 'The heroes beat your war party' : 'The heroes win')
      : res.result === 'tpk' ? 'Total party kill' : res.finale ? 'The assault on the Dark Tower fails' : res.result === 'retreat' ? 'The heroes retreat' : 'Your monsters flee';
    const xpLine = res.xp ? `<p class="hint">Each hero gains ${res.xp} XP${res.xpMult > 1 ? ' (a harrowing fight is worth extra)' : res.xpMult < 1 ? ' (an easy fight is worth less)' : ''}.</p>` : res.noXp ? '<p class="good">No experience for them: the fight was too easy for heroes of their level.</p>' : '';
    const infSum = Math.round(res.lines.reduce((t, l) => t + l.v, 0) * 10) / 10;
    const wipe = res.wiped ? (res.newParty ? `<p class="fxname">The whole party is dead. In Millbrook's tavern a new, greener party takes up the sword: ${res.newParty.map(esc).join(', ')}.</p>` : '<p class="fxname">The whole party is dead, and with the tavern in ashes there is nobody left to take their place.</p>') : '';
    modal(`<h1 class="dtitle">${title}</h1><p>${res.label === 'Easy' ? 'An' : 'A'} <b class="est ${res.label}">${res.label}</b> fight for the heroes: they lost ${Math.round(Math.min(1, res.frac) * 100)}% of their health over ${res.rounds} round${res.rounds > 1 ? 's' : ''}.${res.escaped ? ` ${esc(VN())} escaped to the Dark Tower to recover.` : ''}</p>
      ${res.townGold ? `<div class="payoff"><span>${img('obj-town', 'ticon')}<b class="gold">+${res.townGold} gold for Millbrook</b> The heroes carry their share of the loot home.</span></div>` : ''}
      <div class="cols"><div><h2 class="cap">Your dead</h2><ul class="plain">${killed}</ul>${xpLine}${res.died.length && !res.wiped ? `<p class="good">Slain: ${res.died.map(esc).join(', ')}. ${G.townLv(S, 'tavern') ? 'Someone new will come to Millbrook\'s tavern to take their place.' : 'With the tavern burned, nobody comes to take their place.'}</p>` : ''}${wipe}${res.next === 'throne' ? `<p class="fxname">The throne room is next. The heroes catch their breath, then climb to face ${esc(VN())}.</p>` : ''}${res.finale && res.result !== 'win' && res.result !== 'tpk' ? '<p class="hint">The heroes fall back to regroup. They\'ll be back when they feel ready.</p>' : ''}</div>
      <div><h2 class="cap">Infamy</h2>${res.lines.length ? ledger(res.lines, infSum, 'From this battle') : '<p class="hint">Nothing to boast about: the heroes barely got a scratch.</p>'}</div></div>
      <div class="row end"><button class="btn big" data-act="close">${res.next === 'throne' ? 'To the throne room' : 'Continue'}</button></div>`,
    () => {
      if (S.phase === 'battle' && S.battle) { if (S.pendingLevelUps.length) showLevelUps(() => enterBattle()); else enterBattle(); return; }
      exitBattle();
      if (S.phase === 'over') { showOver(); return; }
      const goOn = () => { if (ui.moving) stepLoop(); else commit(); };
      const after = () => showVillainUps(goOn);
      if (S.pendingLevelUps.length) showLevelUps(after); else after();
    }, 'wide');
  }
  // 0.31: how your villain's duel with a band of the wilds ended
  function duelResult(res) {
    const C = G.CREATURES[res.type] || { name: 'monsters', one: 'monster' }; const nm = C.name.toLowerCase();
    const title = res.result === 'tribute' ? `The ${esc(nm)} buy their lives` : res.result === 'surrender' ? `The ${esc(nm)} kneel` : res.result === 'tpk' ? `${esc(VN())} cuts them down` : res.result === 'fled' || res.result === 'retreat' ? `${esc(VN())} breaks off the fight` : `The ${esc(nm)} drive ${esc(VN())} off`;
    const body = res.result === 'tribute' ? `<p>They throw down their arms, but your banner is full. They pay <b>${esc(G.priceText(res.loot || {}))}</b> for their lives and scatter into the hills.</p>` : res.result === 'surrender' ? `<p>${res.left} ${esc(nm)} throw down their arms. They rest for ${G.HEAL_DAYS} days while their wounds close, then march on Millbrook under your banner.</p>`
      : res.result === 'tpk' ? `<p>They fought to the last. Their hoard is yours: <b>${esc(G.priceText(res.loot || {}))}</b>.</p>`
      : res.result === 'fled' || res.result === 'retreat' ? `<p>${res.left} ${esc(nm)} are left standing. They won't talk to ${esc(VN())} for a few days.</p>`
      : `<p>${esc(VN())} limps back to the Dark Tower to recover for 3 days. ${res.left} ${esc(nm)} are left standing.</p>`;
    const infSum = Math.round(res.lines.reduce((t, l) => t + l.v, 0) * 10) / 10;
    sfx(res.result === 'surrender' || res.result === 'tpk' || res.result === 'tribute' ? 'win' : 'lose');
    if (res.result === 'surrender' || res.result === 'tribute') msay(res.type, 'kneel', { prio: 3 });
    else if (res.result !== 'tpk' && res.result !== 'fled' && res.result !== 'retreat') vsay('beaten', { prio: 3, force: true });
    modal(`<h1 class="dtitle">${title}</h1>${body}<p class="hint">${esc(VN())}'s health: ${Math.round(Math.max(0, res.villainHp) * 100)}%.</p>
      <div><h2 class="cap">Infamy</h2>${res.lines.filter(l => l.v).length ? ledger(res.lines.filter(l => l.v), infSum, 'From this fight') : '<p class="hint">Nothing to boast about.</p>'}</div>
      <div class="row end"><button class="btn big" data-act="close">Continue</button></div>`, () => { exitBattle(); if (S.phase === 'over') { showOver(); return; } showVillainUps(() => commit()); }, 'wide');
  }
  function renderBattleUI(light) {
    const b = S.battle; if (!b) return;
    const u = curUnit();
    const party = b.units.filter(x => x.side === 'party' && !x.structure && !x.militia);
    // 0.37: in an assault, Millbrook's defences sit beside the heroes as small health bars (the militia as one head count)
    const mb = !b.assault ? '' : (() => {
      const st = b.units.filter(x => x.structure); const mil = b.units.filter(x => x.militia); const mv = mil.reduce((t, x) => t + ((ui.view[x.id] || x).alive ? (ui.view[x.id] || x).count : 0), 0);
      return `<div class="bmb">${st.map(x => { const v = ui.view[x.id] || x; const f = v.alive ? Math.max(0, v.hp / x.maxHp) * 100 : 0; return `<span class="mbs${v.alive ? '' : ' dead'}" title="${esc(x.name)}: ${v.alive ? Math.max(0, Math.round(v.hp)) + ' / ' + x.maxHp : 'destroyed'}">${img(x.art && A.URI['obj-' + x.art] ? 'obj-' + x.art : 'unit-' + x.icon, 'mbi')}<i class="hpb${x.hall ? ' hall' : ''}"><i style="width:${f.toFixed(0)}%"></i></i></span>`; }).join('')}${mil.length ? `<span class="mbs mil${mv ? '' : ' dead'}" title="Millbrook's militia: ${mv} left">${img('unit-militia', 'mbi')}<b>${mv}</b></span>` : ''}</div>`;
    })();
    $('bparty').innerHTML = (b.assault && !party.length ? '<div class="bh away"><span><b>The heroes are away</b><small>Only the militia and the towers defend</small></span></div>' : '') + party.map(x => { const v = ui.view[x.id] || x; const f = Math.max(0, v.hp / x.maxHp) * 100; return `<div class="bh${!v.alive ? ' dead' : v.down ? ' down' : ''}${b.cur === x.id ? ' cur' : ''}">${img('unit-' + x.icon, 'port sm')}<span><b>${esc(shortName(x.name))}</b><i class="hpb"><i style="width:${f.toFixed(0)}%"></i></i><small>${v.alive ? (v.down ? 'Down' : Math.max(0, v.hp) + '/' + x.maxHp) : 'Dead'} · AC ${x.ac}${x.maxMana ? ' · ' + x.mana + ' mana' : ''}</small></span></div>`; }).join('') + mb;
    $('bround').textContent = b.phase === 'deploy' ? 'Deployment' : `Round ${b.round}`;
    $('bterrain').textContent = b.siege ? 'Millbrook\'s gates' : G.TERRAIN[b.terrain] ? G.TERRAIN[b.terrain].name : '';
    $('bdm').innerHTML = `<span title="The tower's gold: pays for extra traps and reinforcements">Tower <b>${Math.floor(S.res.gold)}</b></span><span title="${esc(VN())}'s level">${esc(VN())} <b>Lv ${G.villainLevel(S)}</b></span>${b.assault ? `<span>The assault on Millbrook · dawn after round ${G.AS.rounds}</span>` : b.siege ? '<span>The siege of Millbrook</span>' : b.attack ? '<span>Your war party</span>' : b.finale ? '<span>The final showdown</span>' : ''}`;
    if (light) return;
    const dep = $('bdeploy');
    if (b.phase === 'deploy') {
      const free = Math.max(0, b.freeTraps - b.traps.filter(t => t.free).length);
      dep.hidden = false;
      dep.innerHTML = `<b class="gold">Deploy your forces.</b> <span>Click one of your stacks, then a blue hex to move it. ${ui.trapMode ? 'Click hexes in the middle of the field to hide spike traps (click again to remove).' : 'Spike traps hurt the first hero who walks onto them.'}</span>
        <span class="row">${b.duel ? '' : `<button class="btn sm${ui.trapMode ? ' on' : ''}" data-act="trapmode">${ui.trapMode ? 'Done with traps' : 'Hide spike traps'}</button><span class="hint">${b.traps.length} placed · ${free ? free + ' free, then ' : ''}${G.TRAP_GOLD} gold each</span>`}<button class="btn" data-act="beginbattle">Begin battle</button></span>`;
    } else dep.hidden = true;
    const order = b.phase === 'deploy' ? [] : [b.cur].concat(b.queue, b.waitQ || []).filter((id, i, a) => id && a.indexOf(id) === i).map(id => b.units.find(x => x.id === id)).filter(x => x && x.alive && !x.down);
    $('bqueue').innerHTML = order.slice(0, 12).map((x, i) => `<span class="q ${x.side}${i === 0 ? ' now' : ''}" title="${esc(x.name)}">${img('unit-' + x.icon, 'qimg')}${x.side === 'dm' && !x.boss ? `<b>${x.count}</b>` : ''}</span>`).join('');
    const dm = isDmTurn();
    let st = '';
    if (b.phase === 'deploy') st = b.duel ? `${VN()} stands alone. The monsters are lined up on the left. Begin when you're ready, and take command to fight with ${VP().his} powers.` : 'Arrange your monsters, then begin. The heroes are lined up on the left.';
    else if (b.pendingTPK) st = 'Every hero has fallen.';
    else if (b.over) st = 'The battle is over.';
    else if (dm) {
      const bn = bonusName(u); const bo = G.bonusOptions(b, u);
      const CK = TOUCHY() ? 'Tap' : 'Click'; const hint = ui.bmode === 'move' ? `${CK} a lit hex to move.` : ui.bmode === 'attack' ? `${CK} a hero to attack.` : ui.bmode === 'bonus' ? `Pick a ${bo && bo.hexes.length ? 'hex' : 'target'} for ${bn}.` : `${CK} a hero to attack, or a lit hex to move.`;
      st = `Your turn: ${u.count > 1 ? u.count + ' ' : ''}${u.name}${u.ranged ? ' (' + u.shots + ' shots)' : ''}. ${hint}`;
    }
    else if (u) st = `${u.count > 1 ? u.count + ' ' + u.name : (u.side === 'dm' && u.one && !u.boss ? 'The ' + u.one : u.name)} ${u.side === 'party' ? (u.count > 1 ? 'act' : 'acts') + ' on their own…' : (u.count > 1 ? 'act…' : 'acts…')}${ui.autoBattle && u.side === 'dm' ? ' Press Take command to play your monsters yourself.' : ''}`;
    const tr = $('bturn');
    if (tr) {
      const show = u && !b.over && !b.pendingTPK && b.phase !== 'deploy';
      tr.hidden = !show;
      if (show) { const bn = bonusName(u); tr.innerHTML = `<span class="who">${img('unit-' + u.icon, 'qimg')}</span><i class="pip${u.mv < u.spd ? ' used' : ''}" title="Move">Move${u.mv > 0 && u.mv < u.spd ? ` <small>${u.mv}</small>` : ''}</i><i class="pip${u.acted ? ' used' : ''}" title="Action">${u.dashed ? 'Dash' : 'Attack'}</i>${bn ? `<i class="pip${u.bonused ? ' used' : ''}" title="${esc(G.BONUS[G.bonusOf(u)].text)}">${esc(bn)}</i>` : ''}`; }
    }
    $('bstatus').textContent = st;
    for (const id of ['bw', 'bd', 'ba', 'bmove', 'batk', 'bbonus', 'bend']) $(id).disabled = !dm || ui.playing;
    if (dm && u) {
      const o = G.options(b, u); const bo = G.bonusOptions(b, u);
      $('bmove').disabled = $('bmove').disabled || u.mv <= 0 || o.reach.size <= 1;
      $('batk').disabled = $('batk').disabled || u.acted || !o.targets.length;
      $('bbonus').disabled = $('bbonus').disabled || !bo; $('bbonus').textContent = bonusName(u) || 'Bonus'; $('bbonus').title = G.bonusOf(u) ? G.BONUS[G.bonusOf(u)].text : 'This monster has no bonus action.';
      $('bd').disabled = $('bd').disabled || u.acted;
      $('bw').disabled = $('bw').disabled || u.acted || u.bonused || u.mv < u.spd;
      for (const [id, m] of [['bmove', 'move'], ['batk', 'attack'], ['bbonus', 'bonus']]) $(id).classList.toggle('on', ui.bmode === m);
    }
    setCur(bcv(), battleCursor(ui.bhover));
    const pw = dm && u && u.boss ? G.bossPowers(b, u) : []; const pbox = $('bpowers');
    if (pbox) { pbox.hidden = !pw.length; pbox.innerHTML = pw.length ? `<span class="k">${esc(u.name)}</span>` + pw.map(p => `<button class="btn pw${p.ready ? ' ready' : ''}" data-act="bpower" data-k="${p.key}"${p.ready && !ui.playing ? '' : ' disabled'} title="${esc(p.text + (p.why ? ' ' + p.why : ''))}">${esc(p.name)}</button>`).join('') : ''; }
    $('bw').disabled = $('bw').disabled || (u && u.waited);
    $('bspell').disabled = !S.battle || b.over || b.phase === 'deploy' || (!dm && !b.pendingTPK) || ui.playing;
    for (const [id, on] of [['bauto', !ui.autoBattle], ['bfast', ui.fast]]) { $(id).classList.toggle('on', on); $(id).setAttribute('aria-pressed', on); }
    $('bauto').textContent = ui.autoBattle ? 'Take command' : 'Let them fight';
    $('bauto').title = ui.autoBattle ? 'Play your monsters yourself, and use the spellbook' : 'Go back to watching: the monsters fight on their own';
    $('battle').classList.toggle('command', !ui.autoBattle);
    const tpk = $('btpk'); if (tpk) tpk.hidden = true;   // 0.30: no rescue from behind the screen
  }
  function spellbook() {
    const rows = Object.keys(G.DM_SPELLS).map(k => { const sp = G.DM_SPELLS[k]; const err = G.canDmSpell(S, k); return `<button class="spell" data-act="cast" data-k="${k}"${err ? ' disabled' : ''}><b>${esc(sp.name)}</b><span class="tcost">${sp.cost ? `${sp.cost} tower gold` : 'Free'}</span><small>${esc(sp.text)}${err ? `<br><i>${esc(err)}</i>` : ''}</small></button>`; }).join('');
    modal(`<h1 class="dtitle">${esc(VN())}'s spellbook</h1><p class="hint">One spell per round, on one of your monsters' turns, paid from the tower's purse.</p><div class="spells">${rows}</div><div class="row end"><button class="btn" data-act="close">Close</button></div>`);
  }
  function bindBattle() {
    const cv = bcv();
    const bpt = e => { if (ui.r3d) return W3.pickHexPx(e.clientX, e.clientY) || { x: -999, y: -999 }; const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointermove', e => {
      if (!BF) return; const bp = bpt(e); const px = bp.x, py = bp.y;
      ui.bmouse = { x: px, y: py }; const k = hexAtPoint(px, py);
      if (k !== ui.bhover) { ui.bhover = k; bStatusHover(); }
      kick();
    });
    cv.addEventListener('pointerleave', () => { ui.bhover = null; ui.bmouse = null; bStatusHover(); kick(); });
    cv.addEventListener('click', e => {
      if (!BF || ui.playing) return;
      const b = S.battle; const bp = bpt(e); const px = bp.x, py = bp.y; const k = hexAtPoint(px, py); if (k < 0) return;
      if (b.phase === 'deploy') {
        if (ui.trapMode) { const err = G.deployTrap(S, k); if (err) toast(err, 'bad'); renderBattleUI(); renderBar(); kick(); return; }
        const mine = b.units.find(x => x.side === 'dm' && x.alive && x.pos === k);
        if (mine) { ui.deploySel = mine.id; kick(); return; }
        if (ui.deploySel) { const err = G.deployMove(S, ui.deploySel, k); if (err) toast(err, 'bad'); else { ui.view = captureView(); } kick(); }
        return;
      }
      if (!isDmTurn()) return;
      const u = curUnit(); const o = curOptions();
      if (ui.bmode === 'bonus') {
        const who = b.units.find(x => x.alive && x.pos === k);
        if (who && o.targets.some(t => t.id === who.id)) { doAct({ type: 'bonus', target: who.id }); return; }
        if (o.reach.has(k)) { doAct({ type: 'bonus', to: k }); return; }
        toast('Not a valid choice for ' + bonusName(u) + '.', 'bad'); return;
      }
      const target = b.units.find(x => x.side === 'party' && x.alive && !x.down && x.pos === k);
      if (target && ui.bmode !== 'move') { if (u.acted) { toast('This monster already used its action this turn.', 'bad'); return; } const t = o.targets.find(z => z.id === target.id); if (!t) { toast(`${target.name} is out of reach this turn${u.ranged && u.shots > 0 && !G.los(b, u.pos, target.pos) ? ' (no line of sight)' : ''}.`, 'bad'); return; } doAct({ type: 'attack', target: target.id, from: t.ranged ? undefined : pickFrom(t, { x: px, y: py }) }); return; }
      if (o.reach.has(k) && k !== u.pos) { doAct({ type: 'move', to: k }); return; }
    });
  }
  function bStatusHover() {
    const b = S.battle; if (!b || !BF) return; const el = $('bstatus');
    const k = ui.bhover; const u = curUnit();
    setCur(bcv(), battleCursor(k));
    if (k === null || k < 0) { renderBattleUI(); return; }
    const tile = b.tiles[k]; const tileTxt = tile ? `${G.TILE_INFO[tile].name}: ${G.TILE_INFO[tile].text}` : '';
    const trap = b.traps.find(t => t.k === k && !t.sprung);
    const who = b.units.find(x => x.alive && x.pos === k);
    if (b.phase === 'deploy') { el.textContent = who ? `${who.count > 1 ? who.count + ' ' : ''}${who.name}${who.side === 'dm' ? ' (click to select)' : ''}` : trap ? 'Your hidden spike trap.' : tileTxt || (ui.trapMode ? (G.isTrapZone(k) ? 'Hide a spike trap here.' : 'Traps go in the middle columns.') : G.isDmZone(k) ? 'Your deployment zone.' : 'Open ground.'); return; }
    if (isDmTurn() && !ui.playing && u) {
      const o = curOptions();
      if (who && who.side === 'party' && !who.down) {
        const t = o.targets.find(z => z.id === who.id);
        if (t) {
          const hitP = Math.round(G.pHit(u.hit, who.ac + (t.ranged && b.tiles[who.pos] === 'brush' ? 2 : 0)) * 100);
          const notes = [];
          if (!t.ranged && b.units.some(x => x.side === 'dm' && x !== u && G.conscious(x) && G.hexDist(x.pos, who.pos) === 1)) notes.push('flanking: advantage');
          if (who.defending) notes.push('defending: disadvantage');
          if (t.ranged && b.tiles[who.pos] === 'brush') notes.push('in cover: +2 AC');
          if (t.ranged && G.hexDist(u.pos, who.pos) > 7) notes.push('long range: disadvantage');
          el.textContent = `${t.ranged ? 'Shoot' : 'Attack'} ${who.name} (AC ${who.ac}, ${who.hp}/${who.maxHp} HP): about ${hitP}% to hit, ${u.count > 1 ? u.count + '× ' : ''}${u.dice[0]}d${u.dice[1]}+${u.dice[2]} each${!t.ranged && u.ranged ? ', half damage in melee' : ''}.${notes.length ? ' ' + notes.join(', ') + '.' : ''}`;
        } else el.textContent = `${who.name} is out of reach this turn${u.ranged && u.shots > 0 && !G.los(b, u.pos, who.pos) ? '. No line of sight.' : '.'}`;
        return;
      }
      if (o.reach.has(k) && k !== u.pos) { el.textContent = (o.targets.length ? 'Move here without attacking.' : 'Move here.') + (tileTxt ? ' ' + tileTxt : ''); return; }
    }
    if (who) { el.textContent = who.side === 'dm' ? `${who.boss ? '' : who.count + ' '}${who.name}: ${G.totalHp(who)} HP, AC ${who.ac}, +${who.hit} to hit, ${who.dice[0]}d${who.dice[1]}+${who.dice[2]}${who.boss ? ' ×2' : ' each'}, speed ${who.spd}${who.ranged ? ', shooter' : ''}${who.flyer ? ', flies' : ''}.` : `${who.name}: ${who.hp}/${who.maxHp} HP, AC ${who.ac}, +${who.hit} to hit, speed ${who.spd}.`; return; }
    if (tileTxt || trap) { el.textContent = trap ? 'Your hidden spike trap.' : tileTxt; return; }
    renderBattleUI();
  }

  /* ============ painted art: images dropped into art/ and listed in art/manifest.json ============ */
  // { "art": { "unit-goblin": { "sprite": "sprites/unit-goblin.webp", "portrait": "portraits/unit-goblin.webp" }, ... } }
  // Sprites stand in the 3D world; portraits become the round tokens everywhere else. Anything missing keeps its stand-in.
  const ART = { asked: false, keys: {}, size: {} };
  const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  // 0.39: the same round token, drawn straight from part of a picture (a talking portrait's mouth shape) onto a canvas you already have
  function tokenDraw(c, N, im, sx, sy, sw, sh) {
    const R = N / 128; c.clearRect(0, 0, N, N); c.imageSmoothingEnabled = false;
    c.save(); c.beginPath(); c.arc(N / 2, N / 2, N / 2 - 4 * R, 0, 7); c.clip();
    const g = c.createRadialGradient(N / 2, N * 0.35, 4 * R, N / 2, N / 2, N / 2); g.addColorStop(0, '#3e3248'); g.addColorStop(1, '#120e16'); c.fillStyle = g; c.fillRect(0, 0, N, N);
    let sc = Math.max(N / sw, N / sh); if (sc >= 1) sc = Math.ceil(sc - 0.001);
    const w = sw * sc, h = sh * sc; c.drawImage(im, sx, sy, sw, sh, Math.round((N - w) / 2), Math.min(0, Math.round((N - h) * 0.3)), w, h);
    c.restore();
    c.lineWidth = 6 * R; c.strokeStyle = '#1a1208'; c.beginPath(); c.arc(N / 2, N / 2, N / 2 - 3 * R, 0, 7); c.stroke();
    c.lineWidth = 3 * R; c.strokeStyle = '#d9b45e'; c.beginPath(); c.arc(N / 2, N / 2, N / 2 - 4 * R, 0, 7); c.stroke();
  }
  function tokenFrom(im, pixel) {
    // pixel art gets a 256 px token, so it stays sharp on high-density screens
    const N = pixel ? 256 : 128; const R = N / 128; const cv = document.createElement('canvas'); cv.width = cv.height = N;
    // a CPU canvas: turning it into a picture needs no slow GPU read-back
    const c = cv.getContext('2d', { willReadFrequently: true }); if (pixel) c.imageSmoothingEnabled = false;
    c.save(); c.beginPath(); c.arc(N / 2, N / 2, N / 2 - 4 * R, 0, 7); c.clip();
    const g = c.createRadialGradient(N / 2, N * 0.35, 4 * R, N / 2, N / 2, N / 2); g.addColorStop(0, '#3e3248'); g.addColorStop(1, '#120e16'); c.fillStyle = g; c.fillRect(0, 0, N, N);
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    // pixel art scales by whole numbers so every pixel stays square; paintings just cover the circle
    let sc = Math.max(N / iw, N / ih) * (pixel ? 1 : 1.02); if (pixel && sc >= 1) sc = Math.ceil(sc - 0.001);
    const w = iw * sc, h = ih * sc;
    c.drawImage(im, Math.round((N - w) / 2), Math.min(0, Math.round((N - h) * 0.3)), w, h);
    c.restore();
    c.lineWidth = 6 * R; c.strokeStyle = '#1a1208'; c.beginPath(); c.arc(N / 2, N / 2, N / 2 - 3 * R, 0, 7); c.stroke();
    c.lineWidth = 3 * R; c.strokeStyle = '#d9b45e'; c.beginPath(); c.arc(N / 2, N / 2, N / 2 - 4 * R, 0, 7); c.stroke();
    return cv;
  }
  // a pixel-art icon: trimmed, centred and scaled up by whole numbers onto a square, transparent canvas
  // a site's icon; the Dark Tower looks different for each villain when there's art for it
  function siteIcon(site) {
    if (site.id === 'tower' && S && S.villain) { const k = 'obj-tower-' + S.villain.type; if (A.URI[k]) return k; }
    return 'obj-' + site.id;
  }
  function iconFrom(im) {
    const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
    const src = document.createElement('canvas'); src.width = W; src.height = H; const sc = src.getContext('2d', { willReadFrequently: true }); sc.drawImage(im, 0, 0);
    const d = sc.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, side = Math.max(w, h); const N = Math.max(128, side); const k = Math.max(1, Math.floor(N / side));
    const out = document.createElement('canvas'); out.width = out.height = N; const oc = out.getContext('2d', { willReadFrequently: true }); oc.imageSmoothingEnabled = false;
    oc.drawImage(src, x0, y0, w, h, Math.round((N - w * k) / 2), Math.round((N - h * k) / 2), w * k, h * k);
    return out;
  }
  // the top of the first (front-facing) frame of a strip, as a square picture
  function headCrop(im, n) {
    const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height, fw = Math.floor(W / n);
    const cv = document.createElement('canvas'); cv.width = fw; cv.height = H; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, fw, H, 0, 0, fw, H);
    const d = c.getImageData(0, 0, fw, H).data; let x0 = fw, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    // centre on the head: the middle of what's drawn in the top fifth
    const band = Math.max(2, Math.round((y1 - y0) * 0.2)); let sx = 0, cnt = 0;
    for (let y = y0; y < y0 + band; y++) for (let x = x0; x <= x1; x++) if (d[(y * fw + x) * 4 + 3] > 8) { sx += x; cnt++; }
    const hx = cnt ? sx / cnt : (x0 + x1) / 2; const side = Math.max(8, Math.round((y1 - y0 + 1) * 0.52));
    const out = document.createElement('canvas'); out.width = out.height = side; const oc = out.getContext('2d', { willReadFrequently: true }); oc.imageSmoothingEnabled = false;
    oc.drawImage(cv, Math.round(hx - side / 2), y0 - Math.round(side * 0.08), side, side, 0, 0, side, side);
    return out;
  }
  // art for one key has arrived: remember it and update every picture already on screen that shows its stand-in
  function setIcon(key, cv) {
    A.IMG[key] = cv; A.URI[key] = cv.toDataURL('image/png'); ART.keys[key] = true;
    for (const im of document.querySelectorAll(`img[data-icon="${key}"]`)) im.src = A.URI[key];
  }
  // stand-ins (0.24): the villains' own monsters and lairs borrow another's picture, tinted, until their own art exists
  const STANDS = () => {
    const out = [];
    for (const k of Object.keys(G.CREATURES)) { const C = G.CREATURES[k]; if (C.stand) out.push({ key: 'unit-' + k, from: 'unit-' + C.stand, tint: C.tint || '#c08040' }); }
    for (const k of Object.keys(G.DUNGEONS)) { const D = G.DUNGEONS[k]; if (D.stand) out.push({ key: 'obj-' + k, from: 'obj-' + D.stand, tint: D.tint || '#c08040' }); }
    return out;
  };
  function tinted(src, color) {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height; const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.imageSmoothingEnabled = false; c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'color'; c.fillStyle = color; c.fillRect(0, 0, w, h);          // the stand-in's hue and colour, its shading kept
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.3; c.drawImage(src, 0, 0);     // a little of the original back for detail
    c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in'; c.drawImage(src, 0, 0);   // and its outline exactly
    return cv;
  }
  // before any art loads: the drawn icon of the creature or lair it stands in for, tinted
  function standIcons() {
    for (const st of STANDS()) {
      if (A.URI[st.key] || !A.URI[st.from]) continue;
      A.URI[st.key] = A.URI[st.from]; A.IMG[st.key] = A.IMG[st.from];
      const im = A.IMG[st.from]; const go = () => { if (!ART.keys[st.key] && (im.naturalWidth || im.width)) { try { setIcon(st.key, tinted(im, st.tint)); ART.keys[st.key] = false; } catch (e) { /* keep the plain stand-in */ } } };
      if (im.complete) go(); else im.addEventListener('load', go, { once: true });
    }
  }
  function loadArt() {
    if (ART.asked) return; ART.asked = true;
    let base = 'art/';
    fetch(base + 'manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(man => {
      if (man && man.audio && window.SND) { SND.load(man.audio, base); syncAudio(); }
      if (man && man.voice) ART.voice = man.voice; if (man && man.talk) ART.talk = man.talk;
      if (!man || !man.art) return;
      const jobs = [];
      // each picture also serves, tinted, the stand-ins that borrow it (those without art of their own)
      const borrowers = {}; for (const st of STANDS()) if (!man.art[st.key]) (borrowers[st.from] = borrowers[st.from] || []).push(st);
      const forAll = (key, fn) => { fn(key, null); for (const st of borrowers[key] || []) fn(st.key, st.tint); };
      const tint = (im, t) => t ? tinted(im, t) : im;
      for (const [key, e] of Object.entries(man.art)) {
        if (e.portrait) jobs.push(loadImg(base + e.portrait).then(im => forAll(key, (k, t) => setIcon(k, tokenFrom(tint(im, t), e.pixel)))).catch(err => { if (err instanceof Error) console.error('art', key, err); /* a missing file just keeps the stand-in */ }));
        if (e.icon && e.icon !== e.sprite) jobs.push(loadImg(base + e.icon).then(im => forAll(key, (k, t) => { const c = iconFrom(tint(im, t)); if (c) setIcon(k, c); })).catch(err => { if (err instanceof Error) console.error('art', key, err); }));
        if (e.sprite) jobs.push(loadImg(base + e.sprite).then(im => forAll(key, (k, t) => {
          const pic = tint(im, t);
          if (W3) W3.setArt(k, pic, { dirs: e.dirs || 0, pixel: !!e.pixel });
          ART.size[k] = [im.naturalWidth || im.width, im.naturalHeight || im.height];
          // map buildings and objects: the same picture is their icon
          if (e.icon === e.sprite) { const c = iconFrom(pic); if (c) setIcon(k, c); }
          // directional pixel art with no portrait: the token is the head and shoulders of the front-facing frame
          if (!e.portrait && e.dirs > 1) { const hc = headCrop(pic, e.dirs); if (hc) setIcon(k, tokenFrom(hc, e.pixel)); }
        })).catch(err => { if (err instanceof Error) console.error('art', key, err); /* a missing file just keeps the stand-in */ }));
      }
      // 0.35: animation sheets (a column per direction, a row per frame): minions walking and building
      for (const [key, set] of Object.entries(man.anim || {})) for (const [name, e] of Object.entries(set)) {
        if (e.sprite && W3 && W3.setAnim) jobs.push(loadImg(base + e.sprite).then(im => W3.setAnim(key, name, im, { dirs: e.dirs || 8, frames: e.frames || 8, fps: e.fps || 10, pixel: e.pixel !== false })).catch(() => { /* no animation: the wobble stays */ }));
      }
      return Promise.all(jobs).then(() => {
        for (const im of document.querySelectorAll('img[data-icon]')) if (ART.keys[im.dataset.icon]) im.src = A.URI[im.dataset.icon];
        if (W3 && W3.refreshFigures) W3.refreshFigures();
        if (S && ui.active) { renderSide(); if (S.phase === 'battle') renderBattleUI(); else drawMap(); }
      });
    }).catch(() => { /* no art folder: the stand-ins stay */ });
  }

  /* ============ wiring ============ */
  function commit() { save(); renderSide(); drawMap(); }
  // instant hover tips: the browser's own wait a second or more before showing a title
  function initTips() {
    if ($('tip')) return;
    const tip = document.createElement('div'); tip.id = 'tip'; tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
    let cur = null;
    const hide = () => { if (cur) { tip.hidden = true; cur = null; } };
    const show = el => {
      const t = el.getAttribute('data-tip'); if (!t) return hide();
      cur = el; tip.textContent = t; tip.hidden = false;
      const r = el.getBoundingClientRect(); const w = tip.offsetWidth, h = tip.offsetHeight;
      const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
      let y = r.top - h - 8; if (y < 8) y = Math.min(innerHeight - h - 8, r.bottom + 8);
      tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
    };
    document.addEventListener('mouseover', e => {
      const el = e.target && e.target.closest ? e.target.closest('[title], [data-tip]') : null;
      if (!el) return hide();
      // take the title over, so the browser's slow one never shows
      if (el.hasAttribute('title')) { const t = el.getAttribute('title'); el.removeAttribute('title'); if (t) el.setAttribute('data-tip', t); else el.removeAttribute('data-tip'); }
      if (el !== cur || tip.hidden) show(el);
    });
    document.addEventListener('mouseout', e => { if (cur && !(e.relatedTarget && cur.contains(e.relatedTarget))) hide(); });
    document.addEventListener('mousedown', hide, true);
    addEventListener('scroll', hide, true); addEventListener('blur', hide);
  }
  function boot() {
    initTips(); standIcons();
    for (const im of document.querySelectorAll('[data-icon]')) im.src = A.URI[im.dataset.icon];
    loadArt();
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const act = el.dataset.act; const d = el.dataset;
      if (act !== 'ttab') sfx('click', { vol: 0.45, gap: 40 });
      switch (act) {
        case 'close': closeModal(); return;
        case 'council': councilAct(d.k); return;
        case 'bskip': skipBattle(); return;
        case 'sound': { if (!window.SND) return; const st = typeof Store !== 'undefined' ? Store.setSettings({ muted: !SND.muted }) : { muted: !SND.muted }; SND.setVolumes(st); updateSoundBtn(); if (!SND.muted) sfx('chime'); return; }
        case 'hero': showHero(d.id); return;
        case 'party': showParty(); return;
        case 'tower': if (d.k) ui.towerTab = d.k; openScreen('tower'); return;
        case 'vtalents': closeModal(); ui.towerTab = 'talents'; openScreen('tower'); return;
        case 'ttab': sfx('tab'); ui.towerTab = d.k; renderScreen(true); return;
        case 'town': {   // 0.36: Millbrook's card and purse show the town on the map (it was a dead button)
          if (!G.townKnown(S)) { toast('Millbrook lies somewhere inside the gold ring on the minimap. Send a minion or your villain that way to find it.', 'sys'); return; }
          const tw = G.siteOf(S, 'town'); closeScreen(); ui.sel = { type: 'site', id: 'town', x: tw.x, y: tw.y }; ui.mode = null; centerOn(tw.x, tw.y); ui.scrollTo = 'sel'; renderSide(); drawMap(); return;
        }
        case 'nav': navTo(d.k); return;
        case 'relsel': ui.relSel = ui.relSel === d.k ? null : d.k; renderScreen(); return;
        case 'relon': { const err = G.wearRelic(S, d.k); if (err) { toast(err, 'bad'); return; } sfx('item', { vol: 0.7 }); ui.relSel = d.k; if (d.close) closeModal(); commit(); if (ui.screen) renderScreen(); return; }
        case 'reloff': { const err = G.removeRelic(S, d.k); if (err) { toast(err, 'bad'); return; } sfx('click'); commit(); if (ui.screen) renderScreen(); return; }
        case 'tvclose': ui.tvSel = null; updateViewCard(); return;
        case 'townbuild': { const err = G.townBuild(S, d.k); if (err) { sfx('deny'); toast(err, 'bad'); return; } sfx('build'); const B = S.town.build; toast(`Millbrook starts on the ${G.TOWN_B[B.k].name}: ${B.days} days.`, 'good'); commit(); return; }
        case 'towncancel': { const err = G.townCancel(S); if (err) { toast(err, 'bad'); return; } sfx('coins'); toast('Building stopped. The materials are back in the town\'s purse.', 'sys'); commit(); return; }
        case 'quest': { const ref = refFrom(d); if (!ref) return; const err = G.postQuest(S, ref, +d.r); if (err) { sfx('deny'); toast(err, 'bad'); return; } sfx('coins'); toast(S.log[S.log.length - 1].t, 'good'); ui.est = null; commit(); return; }
        case 'qshow': showRef(refFrom(d)); return;
        case 'tnode': { ui.tsel = d.id || null; if (S.talents && S.talents.redrawn && d.id) S.talents.redrawn = false; sfx('tab'); renderScreen(); return; }
        case 'tlearn': case 'tpath': {
          const n = G.webOf(S).nodes[d.id]; if (!n) return;
          const err = act === 'tpath' ? G.learnPath(S, d.id) : G.learnTalent(S, d.id); if (err) { sfx('deny'); toast(err, 'bad'); return; }
          sfx('researched'); toast(`Talent: ${tLabel(n.t, G.tRank(S, n.t))}.`, 'good'); vsay('talent');
          ui.finaleEst = null; ui.est = null; ui.tFree = G.talentFree(S); commit(); return;
        }
        case 'talent': {
          const err = G.learnTalent(S, d.k); if (err) { sfx('deny'); toast(err, 'bad'); return; }
          sfx('researched'); const T = G.TALENTS[d.k]; const r = G.tRank(S, d.k);
          toast(T.lair ? `Talent: the ${G.talentName(d.k)}. Your minions can build it now.` : `Talent: ${tLabel(d.k, r)}.`, 'good');
          ui.finaleEst = null; ui.est = null; ui.tFree = G.talentFree(S); commit(); return;
        }
        case 'treset': {
          const err = G.resetCheck(S); if (err) { toast(err, 'bad'); return; }
          modal(`<h1 class="dtitle">Unlearn every talent?</h1><p>All ${G.talentSpent(S)} points come back to spend again, in any tree. Lairs you've already built keep raising monsters, but you can't build new ones of a kind you no longer know.</p><p class="hint">You can do this once a week.</p>
            <div class="row end"><button class="btn" data-act="close">Keep them</button><button class="btn big" data-act="tresetok">Unlearn all</button></div>`);
          return;
        }
        case 'tresetok': { closeModal(); const err = G.resetTalents(S); if (err) { toast(err, 'bad'); return; } sfx('dark'); toast(`${G.talentFree(S)} talent points to spend again.`, 'sys'); ui.finaleEst = null; ui.est = null; ui.tFree = G.talentFree(S); commit(); return; }
        case 'screen': openScreen(d.k); return;
        case 'closescreen': closeScreen(); return;
        case 'desel': ui.sel = null; ui.place = null; ui.mbuild = false; ui.mode = null; renderSide(); drawMap(); return;
        case 'selm': setMinionSel([d.id]); ui.mbuild = false; ui.place = null; { const m = selMinions()[0]; if (m) centerOn(m.x, m.y); } renderSide(); drawMap(); return;
        case 'nextidle': closeScreen(); nextIdle(e.shiftKey); return;
        case 'mmove': ui.mode = ui.mode === 'move' ? null : 'move'; ui.place = null; ui.mbuild = false; renderSide(); drawMap(); return;
        case 'mdance': for (const m of selMinions()) G.orderDance(S, m.id); minionSay(selMinions()[0], 'dance'); ui.mode = null; ui.place = null; kick(); commit(); return;
        case 'bpatrol': ui.mode = ui.mode === 'patrol' ? null : 'patrol'; renderSide(); drawMap(); return;
        case 'vsel': { const V = S.villain; if (!V.meet) vsay('select'); ui.sel = { type: 'villain', x: V.x, y: V.y }; ui.mode = null; const p = G.villainOnMap(S) ? V : G.siteOf(S, 'tower'); centerOn(p.x, p.y); renderSide(); drawMap(); if (V.meet) showParley(); return; }
        case 'vgo': { const o = S.objects.find(z => z.id === d.id); if (o) sendVillain(o.x, o.y); return; }
        case 'vhome': { const tw = G.siteOf(S, 'tower'); sendVillain(tw.x, tw.y); return; }
        case 'vstop': { S.villain.path = []; S.villain.target = null; S.villain.goHome = false; vsay('order'); commit(); return; }
        case 'vmeet': showParley(); return;
        case 'ptalk': case 'ppay': case 'pfight': case 'pleave': parleyAct(act, d.k); return;
        case 'bcamp': { const b = selBand(); if (!b) return; const err = G.bandToCamp(S, b.id); if (err) { toast(err, 'bad'); return; } sfx('horde', { vol: 0.6 }); ui.mode = null; commit(); return; }
        case 'bhold': { const b = selBand(); if (b) { const err = G.bandHold(S, b.id); if (err) toast(err, 'bad'); } ui.mode = null; commit(); return; }
        case 'blevel': { const b = selBand(); if (!b) return; const err = G.bandLevelUp(S, b.id); if (err) { toast(err, 'bad'); return; } sfx('growl'); ui.threat = null; ui.floats.push({ x: b.x * TILE + TILE / 2, y: b.y * TILE, text: 'Lv ' + b.lvl, color: '#ffd36a', t0: performance.now() }); kick(); commit(); return; }
        case 'baway': { const b = selBand(); if (!b) return; const err = G.bandAway(S, b.id); if (err) { toast(err, 'bad'); return; } ui.floats.push({ x: b.x * TILE + TILE / 2, y: b.y * TILE, text: 'Gone', color: '#c8b898', t0: performance.now() }); ui.sel = null; ui.mode = null; kick(); commit(); return; }
        case 'mworknear': workNearest(d.kind); return;
        case 'mhome': { let ok = 0, err = null; for (const m of selMinions()) { const r = G.orderHome(S, m.id); if (r) err = err || r; else ok++; } if (!ok) { toast(err || 'They can\'t get home.', 'bad'); return; } minionAck(selMinions()[0], 'move'); sfx('minion-go', { vol: 0.8 }); commit(); return; }
        case 'mstop': for (const m of selMinions()) G.recallMinion(S, m.id); ui.place = null; ui.mode = null; if (selMinions().length) minionSay(selMinions()[0], 'ack'); commit(); return;
        case 'mbuild': ui.mbuild = !ui.mbuild; ui.mode = null; if (!ui.mbuild) ui.place = null; renderSide(); drawMap(); return;
        case 'placelair': { if (ui.place && ui.place.k === d.k) { ui.place = null; renderSide(); drawMap(); return; } const err = G.lairCheck(S, d.k); if (err) { toast(err, 'bad'); return; } ui.place = { k: d.k }; renderSide(); drawMap(); return; }
        case 'minimap': toggleMini(); return;
        case 'drawer': setDrawer(!drawerOpen()); return;
        case 'buildlair': { if (!ui.sel || ui.sel.type !== 'spot') return; const { x, y } = ui.sel; const err = G.orderBuild(S, d.k, x, y); if (err) { toast(err, 'bad'); return; } sfx('minion-go'); sfx('coins', { vol: 0.6 }); const o = S.objects[S.objects.length - 1]; ui.sel = { type: 'lair', id: o.id, x, y }; toast(`Your ${MT().one.toLowerCase()} sets off to build the ${G.DUNGEONS[d.k].name}: ${G.lairDays(S, d.k)} days of work.`, 'good'); ui.finaleEst = null; commit(); return; }
        case 'work': { const err = G.orderWork(S, d.id); if (err) { toast(err, 'bad'); return; } sfx('minion-go'); toast(`A ${MT().one.toLowerCase()} sets off for the ${G.nodeName(S.nodes.find(n => n.id === d.id))}.`, 'good'); commit(); return; }
        case 'recall': { const err = G.recallFrom(S, d.id); if (err) toast(err, 'bad'); commit(); return; }
        case 'collect': { const n = S.nodes.find(z => z.id === d.id); if (n) collectAt(n); return; }
        case 'nextfull': { const n = nextFull(); if (!n) { toast('No mine or camp is full yet.', 'sys'); return; } closeScreen(); ui.sel = { type: 'node', id: n.id, x: n.x, y: n.y }; ui.mode = null; ui.place = null; centerOn(n.x, n.y); renderSide(); drawMap(); return; }
        case 'abm': { const only = selMinions().length === 1 && selMinions()[0].id === d.id; clickMinion(d.id, e.shiftKey); if (only && !e.shiftKey) { const m = S.minions.find(z => z.id === d.id); if (m) { centerOn(m.x, m.y); drawMap(); } } return; }
        case 'absub': { const k = d.k || null; ui.abSub = ui.abSub === k ? null : k; ui.mode = null; if (ui.abSub === 'build') ui.mbuild = true; else { ui.mbuild = false; ui.place = null; } renderSide(); drawMap(); return; }
        case 'vmove': ui.mode = ui.mode === 'vmove' ? null : 'vmove'; ui.place = null; renderSide(); drawMap(); return;
        case 'recallm': { G.recallMinion(S, d.id); commit(); return; }
        case 'buildhelp': { const err = G.orderHelp(S, d.id); if (err) { toast(err, 'bad'); return; } commit(); return; }
        case 'cancelbuild': { G.cancelBuild(S, d.id); ui.sel = null; toast('Building called off. Half the cost comes back.', 'sys'); commit(); return; }
        case 'expand': { const err = G.expandLair(S, d.id); if (err) { toast(err, 'bad'); return; } ui.reachCache = null; toast('The lair is expanded.', 'good'); commit(); return; }
        case 'train': { const err = G.trainMinion(S); if (err) { toast(err, 'bad'); return; } sfx('summon'); vsay('summon'); const w = S.summons.reduce((t, q) => t + q.days, 0); toast(`Summoning a ${MT().one.toLowerCase()} at the tower: ready in ${w} days.`, 'good'); commit(); return; }
        case 'unsummon': { sfx('coins'); const err = G.cancelSummon(S, +d.i); if (err) { toast(err, 'bad'); return; } toast('Summoning cancelled. The gold is back in your coffers.', 'sys'); commit(); return; }
        case 'library': case 'gbuild': { const k = act === 'library' ? 'library' : d.k; const err = G.orderGrounds(S, k); if (err) { toast(err, 'bad'); return; } sfx('build'); const b = G.groundsBuild(S, k); toast(`A ${MT().one.toLowerCase()} heads home to build ${G.GROUNDS[k].at ? G.GROUNDS[k].name + ' ' + G.roman(b.to) : 'the ' + G.GROUNDS[k].name}: ${b.days} night${b.days > 1 ? 's' : ''} of work.`, 'good'); commit(); return; }
        case 'gsel': { if (ui.screen !== 'tower' || ui.towerTab !== 'view') { ui.towerTab = 'view'; openScreen('tower'); } ui.tvSel = d.k; updateViewCard(); return; }
        case 'ghelp': { const err = G.groundsHelp(S, d.id); if (err) { toast(err, 'bad'); return; } commit(); return; }
        case 'gcancel': { G.groundsCancel(S, d.id); toast('Building called off. Half the cost comes back.', 'sys'); commit(); return; }
        case 'sellair': case 'selnode': { const o = act === 'sellair' ? S.objects.find(z => z.id === d.id) : S.nodes.find(z => z.id === d.id); if (!o) return; closeScreen(); ui.sel = { type: act === 'sellair' ? 'lair' : 'node', id: o.id, x: o.x, y: o.y }; centerOn(o.x, o.y); ui.scrollTo = 'sel'; renderSide(); drawMap(); return; }
        case 'chronicle': closeModal(); openScreen('chronicle'); return;
        case 'scoutfinale': { el.disabled = true; el.textContent = 'Scouting…'; setTimeout(() => { ui.finaleEst = G.simulateFinale(S, 16); renderSide(); }, 30); return; }
        case 'endday': endDay(); return;
        case 'rules': showRules(false); return;
        case 'gamemenu': if (typeof Front !== 'undefined') Front.menu(); return;
        case 'bpower': if (isDmTurn() && !ui.playing) doAct({ type: 'power', key: d.k }); return;
        case 'wait': doAct({ type: 'wait' }); return;
        case 'defend': doAct({ type: 'defend' }); return;
        case 'bmode': { if (!isDmTurn()) return; const u = curUnit(); if (d.m === 'bonus') { const bo = G.bonusOptions(S.battle, u); if (!bo) return; if (bo.self) { doAct({ type: 'bonus' }); return; } } ui.bmode = ui.bmode === d.m ? null : d.m; ui.optCache = null; renderBattleUI(); kick(); return; }
        case 'endturn': if (isDmTurn()) doAct({ type: 'end' }); return;
        case 'autoturn': if (isDmTurn()) { ui.autoTurnFor = curUnit().id; ui.bmode = null; battleTick(); } return;
        case 'autobattle': ui.autoBattle = !ui.autoBattle; ui.bmode = null; ui.autoTurnFor = null; if (!ui.autoBattle && S.battle) S.battle.manual = true; ui.optCache = null; renderBattleUI(); battleTick(); return;
        case 'fast': ui.fast = !ui.fast; renderBattleUI(); return;
        case 'dice': ui.dice = !ui.dice; if (!ui.dice) $('btray').hidden = true; renderBattleUI(); return;
        case 'spellbook': spellbook(); return;
        case 'cast': dmCast(d.k); return;
        case 'deus': dmCast('deus'); return;
        case 'tpk': G.acceptTPK(S); renderBattleUI(); battleTick(); return;
        case 'blog': ui.logOpen = !ui.logOpen; $('blogwrap').classList.toggle('open', ui.logOpen); return;
        case 'trapmode': ui.trapMode = !ui.trapMode; ui.deploySel = null; renderBattleUI(); kick(); return;
        case 'beginbattle': beginBattle(); return;
      }
    });
    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!ui.active) { if (e.key === 'Escape' && ui.modal && document.querySelector('#modal [data-act="close"]')) closeModal(); return; }
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (ui.modal) { if (!document.querySelector('#modal [data-act="close"]')) return; closeModal(); return; }
        if (ui.screen && ui.tvSel) { ui.tvSel = null; updateViewCard(); return; }
        if (ui.screen) { closeScreen(); return; }
        if (ui.place || ui.mode) { ui.place = null; ui.mode = null; renderSide(); drawMap(); return; }
        if (drawerOpen()) { setDrawer(false); return; }
        if (ui.abSub) { ui.abSub = null; ui.mbuild = false; renderSide(); drawMap(); return; }
        if (ui.sel) { ui.sel = null; ui.mbuild = false; renderSide(); drawMap(); }
        return;
      }
      { const k0 = e.key.toLowerCase();
        if (!ui.modal && S.phase !== 'battle' && NAV_KEYS[k0] && !ui.moving) { e.preventDefault(); navTo(NAV_KEYS[k0]); return; }
        if (!ui.modal && ui.screen === 'tower' && /^[1-5]$/.test(k0)) { const t = TOWER_TABS[+k0 - 1]; if (t) { sfx('tab'); ui.towerTab = t[0]; ui.tsel = null; renderScreen(true); } return; } }
      if (ui.modal || ui.screen) return;
      const k = e.key.toLowerCase();
      if (k === 'p' && S.phase === 'map') { showParty(); return; }
      if (S.phase === 'map') {
        if (k === 'e') { endDay(); return; }
        if (k === 'i' || k === '.') { if (!ui.moving) nextIdle(e.shiftKey); return; }
        if (k === 'v' && !ui.moving) { const b = document.querySelector('[data-act="vsel"]'); if (b) b.click(); return; }   // 0.31: your villain
        // 0.35: the action bar's keys (M move, G gather, B build, H home, X stop, N dance, C next full site, 1-9 in its menus, Space collect)
        if (!ui.moving) { const hk = k === ' ' ? 'space' : k; const b = /^[a-z0-9]$|^space$/.test(hk) && document.querySelector(`#abar [data-hk="${hk}"]`); if (b) { e.preventDefault(); if (!b.disabled) b.click(); return; } }
        const pan = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] }[k];
        if (pan) { e.preventDefault(); if (ui.r3d) W3.pan(pan[0] * 3, pan[1] * 3); ui.cam.x += pan[0] * TILE * 3; ui.cam.y += pan[1] * TILE * 3; clampCam(); drawMap(); }
      } else if (S.phase === 'battle' && isDmTurn() && !ui.playing) {
        const btn = { w: 'bw', d: 'bd', a: 'ba', m: 'bmove', f: 'batk', b: 'bbonus', e: 'bend' }[k];
        if (btn && $(btn) && !$(btn).disabled) $(btn).click();
      }
    });
    const ro = new ResizeObserver(() => { if (S && S.phase === 'battle') { if (S.battle) { sizeBattle(); kick(); } } else sizeMap(); });
    ro.observe($('mapwrap')); ro.observe($('bfield'));
    bindMap(); bindBattle();
    // 0.40: a phone starts with the minimap folded away (its own setting, apart from the computer's)
    try { const k = isPhone() ? 'bts-mini-p' : 'bts-mini'; const v = localStorage.getItem(k); if (v === '0' || (isPhone() && v !== '1')) toggleMini(false); } catch (e) { if (isPhone()) toggleMini(false); }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawMap(); kick(); });
  }
  /* ============ entering and leaving a campaign (the title screen lives in front.js) ============ */
  let booted = false;
  function ensureBoot() { if (!booted) { booted = true; boot(); } }
  function resetUi() {
    ui.reachCache = null; ui.night = null;
    VO.queue = []; ui.vwatch = null;
    Object.assign(ui, { mode: null, fog: null, threat: null, broute: null, place: null, mbuild: false, hoverMin: null, miniCam: '', sel: null, moving: false, anim: null, manim: null, est: null, estKey: '', finaleEst: null, screen: null, playing: false, view: {}, floats: [], fx: [], deploySel: null, trapMode: false, reach: null, reachKey: '', comp: {}, meter: null, fair: null, autoBattle: true });
    terrainKey = null; miniBase = null;
  }
  // 0.36: anonymous progress for the alpha (how far campaigns get); play time only counts while someone is actually playing
  function track(ev) { if (typeof Store !== 'undefined' && Store.track && S && !S.title) Store.track(S, ev); }
  ui.lastInput = Date.now();
  for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, () => { ui.lastInput = Date.now(); }, { passive: true, capture: true });
  setInterval(() => {
    if (!ui.active || !S || S.title || S.phase === 'over' || document.hidden || Date.now() - ui.lastInput > 120000) return;
    S.playSec = (S.playSec || 0) + 15;
  }, 15000);
  function open(state, opts) {
    opts = opts || {};
    ensureBoot();
    A.ready(() => {
      stopTitle();
      S = G.migrate(state) || state; ui.active = true; ui.tFree = S.talents ? G.talentFree(S) : undefined;
      for (const h of S.heroes) A.ensureHero(h);
      resetUi();
      if (ui.modal) closeModal();
      $('app').hidden = false; document.body.classList.add('ingame');
      $('battle').hidden = true; $('adv').hidden = false;
      const st = typeof Store !== 'undefined' ? Store.settings() : {};
      ui.fast = !!st.fast; ui.dice = st.dice !== false; ui.logOpen = !!st.log;
      if (window.SND) { SND.setVolumes(st); updateSoundBtn(); }
      ui.chatter = st.chatter !== false; ui.items = null; ui.autoSkip = !!st.skipfights;
      if (!ui.tried3d) { ui.tried3d = true; init3d(); }
      else if (ui.r3d) { W3.exitBattle(); W3.attach($('mapwrap'), $('map')); W3.buildMap(S); W3.centerOn(S.party.x, S.party.y, true); W3.setMode('map'); }
      // 0.30: a new reign opens on your own tower
      { const c = opts.fresh || !G.partyVisible(S) ? G.siteOf(S, 'tower') : S.party; sizeMap(); centerOn(c.x, c.y, true); } commit(); drawMap();
      if (S.phase === 'battle' && S.battle) enterBattle();
      else if (S.phase === 'week') showWeek();
      else if (S.phase === 'council') showCouncil();
      else if (S.phase === 'over') showOver();
      else if (opts.fresh) setTimeout(() => { if (ui.active && S && !ui.modal) vsay('intro', { prio: 3, force: true }); }, 1400);   // 0.35: no rules popup; the villain just speaks
      if (opts.fresh) setTimeout(() => { if (ui.active && S) toast(`Your goal: raze Millbrook. Your lairs send their monsters to a war camp at its gates, and every week ends with an assault on the town. Bring down its town hall and you win.`, 'sys', 12000); }, 5200);   // 0.37
      morning();
      track(opts.fresh ? 'start' : 'resume');
    });
  }
  function close() {
    if (ui.active && S && typeof Store !== 'undefined') Store.autosave(S, true);
    ui.active = false; clearTimeout(ui.btimer);
    if (ui.modal) closeModal();
    $('app').hidden = true; document.body.classList.remove('ingame');
    if (W3 && W3.ready) { W3.exitBattle(); W3.setMode(null); }
  }
  // a slow flight over a sample map behind the title screen (3D only)
  function demoState() {
    const d = G.newGame(4242, { party: G.DEFAULT_PARTY, size: G.MAP_SMALL });
    d.unlocked = Object.assign(d.unlocked || {}, { camp: 1, bonecrypt: 1, den: 1 }); d.base.library = 1;
    d.lore = 999;
    const put = (k, x, y, n) => { if (!G.placeCheck(d, k, x, y, n)) G.place(d, k, x, y, n); };
    for (const [k, x, y, n] of [['camp', 12, 9], ['warren', 20, 20], ['bonecrypt', 31, 8], ['den', 28, 22], ['orc', 16, 14, 2], ['wolf', 24, 12, 2], ['skeleton', 34, 14, 1], ['ogre', 30, 17, 1], ['chest', 18, 7], ['shrine', 22, 16]]) put(k, x, y, n || 1);
    d.explored.fill(1); d.title = true;
    return d;
  }
  function startTitle(container) {
    if (!container || !W3 || !wantsView3d() || !W3.supported()) { if (container) for (const n of container.querySelectorAll('canvas, .lbl3d')) n.remove(); return false; }
    ensureBoot();
    if (!W3.init(hooks3d)) return false;
    ui.active = false; S = demoState(); resetUi(); ui.titleOn = true;
    W3.attach(container, null); W3.buildMap(S); W3.setMode('map');
    const way = G.sitesOf(S).filter(z => z.kind !== 'tower').map(z => [z.x, z.y]).concat([[S.villain.x, S.villain.y]]);
    let i = 0; W3.centerOn(way[0][0], way[0][1], true);
    clearInterval(ui.titleTimer);
    ui.titleTimer = setInterval(() => { if (!ui.titleOn) return; i = (i + 1) % way.length; W3.centerOn(way[i][0], way[i][1], false); }, 7000);
    return true;
  }
  // without 3D, the title sits over the painted map instead, drifting slowly
  function flatTitle(container) {
    if (!container || container.querySelector('canvas.flatmap')) return;
    ensureBoot();
    A.ready(() => {
      if (container.querySelector('canvas.flatmap')) return;
      const seed = 4242; const st = { seed }; const M = G.mapOf(st); const T = 40;
      const cv = A.paintMap(seed, M.T, M.road, T); const c = cv.getContext('2d');
      for (const site of G.sitesOf(st)) { const im = A.IMG['obj-' + site.id]; if (im) c.drawImage(im, site.x * T - 12, site.y * T - 30, 64, 64); }
      cv.className = 'flatmap'; container.insertBefore(cv, container.firstChild);
    });
  }
  function stopTitle() { if (!ui.titleOn) return; ui.titleOn = false; clearInterval(ui.titleTimer); if (W3 && W3.ready) W3.setMode(null); }
  window.BTS_UI = {
    boot: ensureBoot, open, close, startTitle, stopTitle, flatTitle, modal, closeModal, toast, esc, img,
    state: () => (ui.active ? S : null), active: () => !!ui.active, save, view3d: on => { if (on === undefined) return ui.active ? ui.r3d : wantsView3d(); if (ui.active) setView3d(on); else try { localStorage.setItem(VIEWKEY, on ? '3d' : '2d'); } catch (e) { /* storage unavailable */ } },
    applySettings: st => { if (window.SND) { SND.setVolumes(st); updateSoundBtn(); } ui.chatter = st.chatter !== false; ui.autoSkip = !!st.skipfights; if (W3 && W3.setSprites) W3.setSprites(st.sprites !== false); ui.fast = !!st.fast; ui.dice = st.dice !== false; ui.logOpen = !!st.log; const w = $('blogwrap'); if (w) w.classList.toggle('open', ui.logOpen); if (!ui.dice) { const t = $('btray'); if (t) t.hidden = true; } if (S && S.phase === 'battle' && ui.active) renderBattleUI(); },
    rules: () => showRules(false), chronicle: () => { if (ui.active && S && S.phase !== 'battle') openScreen('chronicle'); }
  };
  // where a minion stands on screen (client px), for tests
  function minionScreen(id) {
    const m = (S.minions || []).find(z => z.id === id); if (!m) return null;
    if (ui.r3d) { const E = W3._map().mins && W3._map().mins.get(id); if (!E) return null; const v = E.grp.position.clone(); v.y += 0.22; v.project(W3._map().camera); const r = W3.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
    const r = mapCv().getBoundingClientRect(); const d = minionSpots().get(id) || { dx: 0, dy: 0 }; const p = minionTile(m);
    return { x: r.left + (p.x + 0.5 + d.dx) * TILE - Math.round(ui.cam.x), y: r.top + (p.y + 0.5 + d.dy) * TILE - Math.round(ui.cam.y) - 9 };
  }
  function tileScreen(x, y) {
    if (ui.r3d) { const M = W3._map(); const T3 = M.camera.position.constructor; const v = new T3(x + 0.5, M.hAt(x + 0.5, y + 0.5), y + 0.5); v.project(M.camera); const r = W3.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
    const r = mapCv().getBoundingClientRect(); return { x: r.left + (x + 0.5) * TILE - Math.round(ui.cam.x), y: r.top + (y + 0.5) * TILE - Math.round(ui.cam.y) };
  }
  // 0.40: the "turn your phone sideways" screen offers full screen, locked sideways, where the phone allows it (Android)
  { const fsb = $('rotfs'); const de = document.documentElement;
    if (fsb && de.requestFullscreen && typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
      fsb.hidden = false;
      fsb.addEventListener('click', () => { de.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation.lock('landscape')).catch(() => { /* the phone said no */ }); });
    } }
  window.__bts = { spell: (ev, sp) => spellFx(ev, sp || 1), state: () => S, ui, vo: () => VO, bark: (c, w, o) => bark(c, w, o), vsay: (c, o) => vsay(c, o), msay: (t, c, o) => msay(t, c, o), minionSay: (m, c) => minionSay(m, c), minionBubble: m => minionBubble(m), TILE, minionScreen, tileScreen, centerOn: (x, y) => { centerOn(x, y, true); drawMap(); }, enterBattle: () => enterBattle(), commit: () => commit(), openScreen: k => openScreen(k), renderSide: () => renderSide(), showOver: () => showOver(), spellbook: () => spellbook(), select: sel => { ui.sel = sel; renderSide(); drawMap(); }, showWeek: () => showWeek(), showVillainUps: () => showVillainUps(), dawn: () => dawn(), parley: r => showParley(r), parleyAct: (a, k) => parleyAct(a, k), endDay: () => endDay() };
})();
