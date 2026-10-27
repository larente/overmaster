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
    bhover: null, logOpen: false, reach: null, reachKey: '', deploySel: null, trapMode: false, finaleEst: null, release: {}, rel: {},
    r3d: false, techSel: null, bspec: null, mapSpec: null, comp: {}, meter: null, meterT: 0, meterTok: 0, fair: null
  };
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let terrainCv = null, terrainKey = null, miniBase = null;

  // autosave: this browser right away, the account (when signed in) a little later; checkpoint = end of a day or battle
  function save(checkpoint) { if (!ui.active || !S) return; if (typeof Store !== 'undefined') Store.autosave(S, !!checkpoint); else try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

  /* ============ helpers ============ */
  const sfx = (k, o) => { if (window.SND) SND.play(k, o); };
  // data-icon lets a picture swap to its pixel art the moment that art arrives
  const img = (key, cls, alt) => `<img class="${cls || ''}" src="${A.URI[key]}" data-icon="${key}" alt="${esc(alt || '')}" draggable="false">`;
  // the villain and heroes are chosen per campaign
  const VN = () => G.vName(S), VF = () => G.vFull(S), VP = () => G.vP(S), VT = () => G.vType(S);
  const vIcon = () => 'unit-' + VT().icon;
  const heroImg = (h, cls, alt) => img(A.ensureHero(h), cls, alt);
  const raceCls = h => `${(G.RACES[h.race] || G.RACES.human).label} ${G.CLASSES[h.cls].label.toLowerCase()}`;
  const today = () => G.dayKey(S);
  const isTrapKind = k => G.ITEMS[k] && G.ITEMS[k].cat === 'trap';
  function objName(o) {
    if (o.kind === 'stack') return `${G.quantityWord(o.count)} ${G.CREATURES[o.type].name}`;
    if (o.kind === 'dungeon') return G.DUNGEONS[o.dtype].name;
    if (o.kind === 'artifact') return 'Artifact';
    return G.ITEMS[o.kind].name;
  }
  const objIcon = o => o.kind === 'stack' ? 'unit-' + o.type : o.kind === 'dungeon' ? 'obj-' + o.dtype : 'obj-' + o.kind;
  const OPINION = {
    avoid: { t: 'Too dangerous. They will avoid it unless it blocks their way or a quest pays enough.', c: 'bad' },
    worthy: { t: 'A worthy fight. Glory seekers will want it.', c: 'good' },
    beatable: { t: 'Beatable. Easy experience for them.', c: 'warn' },
    trivial: { t: 'Not worth their time. Likely to scatter before a fight.', c: 'dim' }
  };
  const opinionOf = (power, reward) => OPINION[G.judge(G.partyPower(S) / power, reward || 0)];
  function toast(text, tone) {
    const box = $('toasts'); if (!box) return;
    const el = document.createElement('div'); el.className = 'toast ' + (tone || ''); el.textContent = text;
    if (tone === 'bad') sfx('deny', { vol: 0.7, gap: 300 });
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3800);
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
  // the map: placing, posting quests, moving your monsters or the villain, or selecting
  function mapCursor(t) {
    if (!S || S.phase !== 'map') return 'none';
    if (ui.moving || ui.manim) return 'wait';
    if (ui.place) return t && !G.spotCheck(S, t.x, t.y) ? 'place' : 'no';
    if (ui.mode === 'patrol') { const b = selBand(); return t && b && !G.patrolCheck(S, b, t.x, t.y) ? 'move' : 'no'; }
    if (ui.mode === 'move' && t) { const o = orderAt(t); return o.kind === 'work' ? 'work' : o.kind === 'help' ? 'build' : o.kind === 'no' ? 'no' : 'move'; }
    if (ui.hoverMin) return 'select';
    if (t && selMinions().length) { const o = orderAt(t); if (o.kind === 'work') return 'work'; if (o.kind === 'help') return 'build'; if (o.kind === 'home') return 'move'; if (o.kind === 'no' && o.target) return 'no'; }
    if (t && thingAt(t.x, t.y).type !== 'spot') return 'select';
    return 'pan';
    // eslint-disable-next-line no-unreachable
    if (!t) return 'pan';
    if (ui.tool === 'quest') return questTargetAt(t.x, t.y) ? 'quest' : 'no';
    if (ui.tool && ui.tool !== 'tourney') return G.placeCheck(S, ui.tool, t.x, t.y, ui.size) ? 'no' : 'place';
    const R = selReach();
    if (R && R.tiles && R.tiles.has(tidx(t.x, t.y))) { const P = S.party; return Math.abs(t.x - P.x) <= 1 && Math.abs(t.y - P.y) <= 1 ? 'attack' : 'move'; }
    const somethingHere = G.objAt(S, t.x, t.y) || G.siteAt(S, t.x, t.y) || (G.villainOnMap(S) && S.villain.x === t.x && S.villain.y === t.y) || (t.x === S.party.x && t.y === S.party.y);
    if (somethingHere) return 'select';
    if (R && R.tiles && R.tiles.size) return 'no';
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
    route: () => routeSpec(),
    floats: () => S.phase === 'battle' ? ui.floats : ui.floats.filter(f => !f.battle).map(f => { if (!f.id) f.id = Math.random().toString(36).slice(2); return { id: f.id, t0: f.t0, text: f.text, color: f.color, x: f.x / TILE - 0.5, y: f.y / TILE - 0.75 }; }),
    view: () => ui.view, fx: () => ui.fx, bspec: () => ui.bspec,
    minionPos: m => { const p = minionTile(m); const d = (ui.mspots && ui.mspots.get(m.id)) || { dx: 0, dy: 0 }; return { x: p.x + d.dx, y: p.y + d.dy, moving: minionWalking(m), dance: !!(m.job && m.job.kind === 'dance' && !minionWalking(m)), work: !minionWalking(m) && G.myLairs(S).some(o => o.x === m.x && o.y === m.y && lairShownBuilding(o) > 0) }; },
    nodeLook: n => (nodeShownDev(n) ? 'node-' : 'dep-') + n.kind,
    fog: () => fogNow(),
    seeObj: o => o.kind === 'stack' ? canSeeObj(o) : hasSeen(o.x, o.y),
    seeTile: (x, y) => hasSeen(x, y),
    seeNow: (x, y) => canSee(x, y),
    lairBuilding: o => lairShownBuilding(o),
    // how many minions stand hammering at a half-built lair right now
    lairCrew: o => lairShownBuilding(o) > 0 ? (S.minions || []).filter(m => m.x === o.x && m.y === o.y && !minionWalking(m)).length : 0,
    summoning: () => (S.summons || []).length ? { p: 1 - S.summons[0].days / S.summons[0].total, look: MT().look, n: S.summons.length } : null,
    libraryWork: () => ({ building: !!(S.base && S.base.libBuild), level: G.libraryLevel(S), crew: true }),
    nodeLabel: n => { const nm = `<span class="nm">${esc(shownNodeName(n))}</span>`; if (G.nodeRaided(S, n)) return `${nm} raided`; const f = nodeBar(n); if (f !== null) return `${nm} ${pbar(f)}`; return nodeShownDev(n) ? `${nm} ${G.workersAt(S, n).length ? `<b class="yl ${n.kind}">+${nodeYield(n)}</b>` : '<i class="idle">idle</i>'}` : nm; },
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
    const placing = ui.tool && ui.tool !== 'quest' && S.phase === 'map';
    if (placing) { const pp = partyPx(); sp.sight = { x: pp.x / TILE, z: pp.y / TILE, r: G.sightRadius(S) + 0.5 }; }
    const R = null;
    if (R && R.tiles && R.tiles.size && !ui.manim) {
      const col = ui.sel.type === 'villain' ? '#a06aff' : '#6aa0ff';
      for (const [i] of R.tiles) set(i % G.MW, (i / G.MW) | 0, col, 0.32, false);
      if (ui.hover && R.tiles.has(tidx(ui.hover.x, ui.hover.y))) {
        const path = []; let i = tidx(ui.hover.x, ui.hover.y); let g = 0;
        while (i !== -1 && R.tiles.has(i) && g++ < 200) { path.push(i); i = R.prev[i]; }
        path.reverse();
        const s0 = ui.sel.type === 'villain' ? S.villain : S.objects.find(o => o.id === ui.sel.id);
        let ax = s0 ? s0.x : 0, ay = s0 ? s0.y : 0; const arr = [];
        for (const k of path) { const x = k % G.MW, y = (k / G.MW) | 0; arr.push([ax, ay, Math.atan2(y - ay, x - ax)]); ax = x; ay = y; }
        sp.path = arr.slice(1).length ? arr : arr; sp.pathColor = ui.sel.type === 'villain' ? '#d0aaff' : '#a8ccff';
        const P = S.party; if (Math.abs(ui.hover.x - P.x) <= 1 && Math.abs(ui.hover.y - P.y) <= 1) set(ui.hover.x, ui.hover.y, '#ff6a50', 0.45, true);
        else set(ui.hover.x, ui.hover.y, ui.sel.type === 'villain' ? '#d0aaff' : '#a8ccff', 0.45, true);
      }
    }
    const zoneOf = [];
    const hov = ui.hover && G.objAt(S, ui.hover.x, ui.hover.y);
    if (hov && hov.kind === 'stack') zoneOf.push(hov);
    if (ui.sel && ui.sel.type === 'obj') { const o = S.objects.find(z => z.id === ui.sel.id); if (o && o.kind === 'stack' && zoneOf.indexOf(o) < 0) zoneOf.push(o); }
    for (const o of zoneOf) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) set(o.x + dx, o.y + dy, '#dc3c28', 0.3, false);
    if (ui.sel && ui.sel.x !== undefined && !ui.manim && ui.sel.type !== 'minion') { const sx = ui.sel.type === 'villain' ? S.villain.x : ui.sel.x, sy = ui.sel.type === 'villain' ? S.villain.y : ui.sel.y; sp.sel = { x: sx, y: sy }; }
    if (placing && ui.hover && !ui.moving && ui.tool !== 'tourney') {
      const { x, y } = ui.hover; const err = G.placeCheck(S, ui.tool, x, y, ui.size);
      set(x, y, err ? '#dc3c28' : '#78dc78', 0.4, true);
      sp.ghost = { kind: ui.tool, x, y, err: !!err };
    }
    if (ui.tool === 'quest' && ui.hover) set(ui.hover.x, ui.hover.y, questTargetAt(ui.hover.x, ui.hover.y) ? '#ffe066' : '#ff7864', 0.25, true);
    if (!ui.tool && ui.hover && !(R && R.tiles && R.tiles.has(tidx(ui.hover.x, ui.hover.y)))) set(ui.hover.x, ui.hover.y, '#fff4d6', 0.08, true);
    if (ui.sel && ui.sel.type === 'spot') { const err = G.spotCheck(S, ui.sel.x, ui.sel.y); set(ui.sel.x, ui.sel.y, err ? '#dc3c28' : '#78dc78', 0.45, true); }
    if (ui.sel && ui.sel.type !== 'party' && ui.sel.type !== 'minion') sp.sel = { x: ui.sel.x, y: ui.sel.y };
    // minions: rings under the selected ones, their routes, and what a right-click would do
    const ms = selMinions(); sp.minSel = ms.map(m => m.id); sp.minHover = ui.hoverMin || null; sp.pathColors = null;
    if (ms.length) {
      const r = minionRoutes(ms); sp.path = r.arrows; sp.pathColors = r.colors;
      if (ui.hover && !ui.place && !ui.hoverMin) { const o = orderAt(ui.hover); const col = ORDER_COL[o.kind]; if (col && (o.kind !== 'move')) set(ui.hover.x, ui.hover.y, col, 0.4, true); }
    }
    const band = selBand();
    if (band && !ui.night) { const r = bandRoute(band); if (r.length) { sp.path = r.map((p, i) => [p[0], p[1], i + 1 < r.length ? Math.atan2(r[i + 1][1] - p[1], r[i + 1][0] - p[0]) : 0]).slice(0, -1); sp.pathColor = '#ff9a7a'; } }
    if (ui.mode === 'patrol' && band && ui.hover) set(ui.hover.x, ui.hover.y, G.patrolCheck(S, band, ui.hover.x, ui.hover.y) ? '#dc3c28' : '#ff9a7a', 0.45, true);
    if (ui.mode === 'move' && ui.hover && ms.length) { const o = orderAt(ui.hover); set(ui.hover.x, ui.hover.y, ORDER_COL[o.kind] || '#e8d4ff', 0.45, true); }
    if (ui.place) {
      const pp = partyPx(); sp.sight = { x: pp.x / TILE, z: pp.y / TILE, r: G.sightRadius(S) + 0.5 };
      if (ui.hover) { const err = G.spotCheck(S, ui.hover.x, ui.hover.y); set(ui.hover.x, ui.hover.y, err ? '#dc3c28' : '#78dc78', 0.45, true); sp.ghost = { kind: ui.place.k, x: ui.hover.x, y: ui.hover.y, err: !!err }; }
    }
    return sp;
  }

  /* ============ map rendering ============ */
  const mapCv = () => $('map');
  function ensureTerrain() {
    const k = Math.min(1.5, dpr); const key = S.seed + ':' + k;
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
  function selReach() {
    if (!ui.sel || S.phase !== 'map' || ui.moving) return null;
    const key = ui.sel.type + ':' + ui.sel.id + ':' + today() + ':' + S.objects.length + ':' + S.villain.x + ',' + S.villain.y + ':' + S.villain.mp + ':' + S.party.x + ',' + S.party.y;
    if (ui.reachKey === key) return ui.reach;
    ui.reachKey = key;
    ui.reach = ui.sel.type === 'villain' ? G.villainReach(S) : ui.sel.type === 'obj' ? G.stackReach(S, ui.sel.id) : null;
    return ui.reach;
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
    for (let i = 0; i < G.MW * G.MH; i++) { fd.data[i * 4] = 6; fd.data[i * 4 + 1] = 5; fd.data[i * 4 + 2] = 10; fd.data[i * 4 + 3] = FG.vis[i] ? 0 : FG.seen[i] ? 120 : 248; }
    fc.putImageData(fd, 0, 0);
    c.drawImage(fog, 0, 0, G.MW, G.MH, ox - TILE / 2, oy - TILE / 2, G.MW * TILE + TILE, G.MH * TILE + TILE);
    const pp = partyPx();
    const placing = ui.tool && ui.tool !== 'quest' && S.phase === 'map';
    if (placing) {
      const rr = G.sightRadius(S) * TILE + TILE * 0.5;
      c.fillStyle = 'rgba(230,196,108,0.10)'; c.beginPath(); c.arc(pp.x + ox, pp.y + oy, rr, 0, 7); c.fill();
      c.setLineDash([6, 5]); c.strokeStyle = 'rgba(230,196,108,0.75)'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    }
    const R = null;
    if (R && R.tiles && R.tiles.size && !ui.manim) {
      c.fillStyle = ui.sel.type === 'villain' ? 'rgba(170,110,255,0.18)' : 'rgba(110,170,255,0.18)';
      for (const [i] of R.tiles) c.fillRect((i % G.MW) * TILE + ox + 1, ((i / G.MW) | 0) * TILE + oy + 1, TILE - 2, TILE - 2);
      if (ui.hover && R.tiles.has(tidx(ui.hover.x, ui.hover.y))) {
        const path = []; let i = tidx(ui.hover.x, ui.hover.y); let g = 0;
        while (i !== -1 && R.tiles.has(i) && g++ < 200) { path.push(i); i = R.prev[i]; }
        c.strokeStyle = ui.sel.type === 'villain' ? '#c9a2ff' : '#9cc4ff'; c.lineWidth = 3; c.setLineDash([5, 4]); c.beginPath();
        const s0 = ui.sel.type === 'villain' ? S.villain : S.objects.find(o => o.id === ui.sel.id);
        if (s0) c.moveTo(s0.x * TILE + TILE / 2 + ox, s0.y * TILE + TILE / 2 + oy);
        for (const k of path.reverse()) c.lineTo((k % G.MW) * TILE + TILE / 2 + ox, ((k / G.MW) | 0) * TILE + TILE / 2 + oy);
        c.stroke(); c.setLineDash([]);
        const P = S.party; const attack = Math.abs(ui.hover.x - P.x) <= 1 && Math.abs(ui.hover.y - P.y) <= 1;
        if (attack) { c.strokeStyle = '#ff6a50'; c.lineWidth = 3; c.strokeRect(ui.hover.x * TILE + ox + 2, ui.hover.y * TILE + oy + 2, TILE - 4, TILE - 4); }
      }
    }
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
    if (ui.mode === 'move' && ui.hover && selMinions().length) { const o = orderAt(ui.hover); c.strokeStyle = ORDER_COL[o.kind] || '#e8d4ff'; c.lineWidth = 2.5; c.strokeRect(ui.hover.x * TILE + ox + 2, ui.hover.y * TILE + oy + 2, TILE - 4, TILE - 4); }
    if (ui.sel && ui.sel.type === 'spot') { const err = G.spotCheck(S, ui.sel.x, ui.sel.y); c.fillStyle = err ? 'rgba(220,60,40,0.3)' : 'rgba(120,220,120,0.28)'; c.fillRect(ui.sel.x * TILE + ox, ui.sel.y * TILE + oy, TILE, TILE); }
    if (!ui.anim && S.phase === 'map') drawRoute(c, ox, oy);
    // where the selected minions are walking: bright for tonight's leg, dim for later
    const msl = selMinions();
    if (msl.length && !ui.night) {
      const mp = G.minionType(S).perk === 'fast' ? G.MINION_MP * 2 : G.MINION_MP;
      for (const m of msl) {
        if (!m.path.length) continue; let px = m.x, py = m.y, left = mp;
        c.lineWidth = 3; c.setLineDash([5, 4]);
        for (const [x, y] of m.path) { left -= G.stepCost(S, px, py, x, y); c.strokeStyle = left >= 0 ? 'rgba(232,212,255,0.95)' : 'rgba(170,130,220,0.7)'; c.beginPath(); c.moveTo(px * TILE + TILE / 2 + ox, py * TILE + TILE / 2 + oy); c.lineTo(x * TILE + TILE / 2 + ox, y * TILE + TILE / 2 + oy); c.stroke(); px = x; py = y; }
        c.setLineDash([]); c.strokeStyle = '#e8d4ff'; c.lineWidth = 2; c.beginPath(); c.arc(px * TILE + TILE / 2 + ox, py * TILE + TILE / 2 + oy, 7, 0, 7); c.stroke();
      }
      if (ui.hover && !ui.place && !ui.hoverMin) { const o = orderAt(ui.hover); const col = ORDER_COL[o.kind]; if (col && o.kind !== 'move') { c.strokeStyle = col; c.lineWidth = 2.5; c.strokeRect(ui.hover.x * TILE + ox + 2, ui.hover.y * TILE + oy + 2, TILE - 4, TILE - 4); } }
    }
    if (ui.place) {
      const rr = G.sightRadius(S) * TILE + TILE * 0.5;
      c.fillStyle = 'rgba(230,196,108,0.10)'; c.beginPath(); c.arc(pp.x + ox, pp.y + oy, rr, 0, 7); c.fill();
      c.setLineDash([6, 5]); c.strokeStyle = 'rgba(230,196,108,0.75)'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    }
    const items = [];
    for (const site of G.sitesOf(S)) if (hasSeen(site.x, site.y)) items.push({ y: site.y, f: () => drawSite(c, site, ox, oy) });
    for (const o of S.objects) if (o.kind === 'stack' ? canSeeObj(o) : hasSeen(o.x, o.y)) items.push({ y: o.y, f: () => drawObj(c, o, ox, oy, now) });
    for (const n of S.nodes || []) if (hasSeen(n.x, n.y)) items.push({ y: n.y, f: () => drawNode(c, n, ox, oy) });
    const spots = minionSpots(); const look = G.minionType(S).look;
    const msel = new Set(selMinions().map(m => m.id));
    for (const m of S.minions || []) { const p = minionTile(m); const d = spots.get(m.id) || { dx: 0, dy: 0 }; items.push({ y: p.y + d.dy + 0.05, f: () => {
      const cx = (p.x + 0.5 + d.dx) * TILE + ox, by = (p.y + 0.5 + d.dy) * TILE + oy;
      if (msel.has(m.id) || ui.hoverMin === m.id) { c.strokeStyle = msel.has(m.id) ? '#ffe39a' : 'rgba(255,227,154,0.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, by + 1, 13, 6, 0, 0, 7); c.stroke(); }
      if (m.job && m.job.kind === 'dance' && !minionWalking(m)) { const t = now / 1000 + m.x; c.save(); c.translate(cx, by - 9 - Math.abs(Math.sin(t * 9)) * 6); c.rotate(Math.sin(t * 4.5) * 0.35); c.drawImage(A.IMG['unit-m-' + look], -13, -13, 26, 26); c.restore(); kick(); }
      else if (!minionWalking(m) && G.myLairs(S).some(o => o.x === m.x && o.y === m.y && lairShownBuilding(o) > 0)) {
        // hammering away at a half-built lair
        const k = Math.pow(Math.max(0, Math.sin(now / 1000 * 7 + m.x * 1.7)), 6); c.save(); c.translate(cx, by - 9); c.rotate(-0.35 * k); c.drawImage(A.IMG['unit-m-' + look], -13, -13, 26, 26); c.restore(); kick();
      } else c.drawImage(A.IMG['unit-m-' + look], cx - 13, by - 22, 26, 26); } }); }
    if (G.villainOnMap(S) && canSee(S.villain.x, S.villain.y)) items.push({ y: S.villain.y + 0.01, f: () => drawVillain(c, ox, oy, now) });
    items.push({ y: pp.y / TILE - 0.5 + 0.02, f: () => { c.drawImage(A.IMG['obj-party'], pp.x + ox - 28, pp.y + oy - 46, 56, 56); } });
    items.sort((a, b) => a.y - b.y); for (const it of items) it.f();
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
    if (placing && ui.hover && !ui.moving && ui.tool !== 'tourney') {
      const { x, y } = ui.hover; const err = G.placeCheck(S, ui.tool, x, y, ui.size);
      c.fillStyle = err ? 'rgba(220,60,40,0.28)' : 'rgba(120,220,120,0.25)'; c.fillRect(x * TILE + ox, y * TILE + oy, TILE, TILE);
      c.strokeStyle = err ? 'rgba(255,120,100,0.9)' : 'rgba(160,255,160,0.9)'; c.lineWidth = 2; c.strokeRect(x * TILE + ox + 1, y * TILE + oy + 1, TILE - 2, TILE - 2);
      c.globalAlpha = err ? 0.35 : 0.8;
      const key = G.CREATURES[ui.tool] ? 'unit-' + ui.tool : 'obj-' + ui.tool;
      const sz = G.CREATURES[ui.tool] ? 38 : 46; c.drawImage(A.IMG[key], x * TILE + ox + TILE / 2 - sz / 2, y * TILE + oy + TILE - sz - 2, sz, sz);
      c.globalAlpha = 1;
    }
    if (ui.place && ui.hover) {
      const { x, y } = ui.hover; const err = G.spotCheck(S, x, y);
      c.fillStyle = err ? 'rgba(220,60,40,0.28)' : 'rgba(120,220,120,0.25)'; c.fillRect(x * TILE + ox, y * TILE + oy, TILE, TILE);
      c.strokeStyle = err ? 'rgba(255,120,100,0.9)' : 'rgba(160,255,160,0.9)'; c.lineWidth = 2; c.strokeRect(x * TILE + ox + 1, y * TILE + oy + 1, TILE - 2, TILE - 2);
      c.globalAlpha = err ? 0.35 : 0.8; c.drawImage(A.IMG['obj-' + ui.place.k], x * TILE + ox + TILE / 2 - 23, y * TILE + oy + TILE - 48, 46, 46); c.globalAlpha = 1;
    }
    if (ui.tool === 'quest' && ui.hover) {
      const t = questTargetAt(ui.hover.x, ui.hover.y);
      c.strokeStyle = t ? '#ffe066' : 'rgba(255,120,100,0.7)'; c.lineWidth = 2.5; c.strokeRect(ui.hover.x * TILE + ox + 1, ui.hover.y * TILE + oy + 1, TILE - 2, TILE - 2);
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
    if (site.kind === 'town' && S.townEvent) c.drawImage(A.IMG['obj-tourney'], cx + 14, by - sz - 4, 30, 30);
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
      if ((o.lvl || 1) > 1) { c.font = '700 9px Alegreya, Georgia, serif'; c.fillStyle = '#ffd36a'; c.fillText('Lv ' + o.lvl, cx, by - 46); }
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
    c.drawImage(A.IMG['obj-' + (nodeShownDev(n) ? 'node-' : 'dep-') + n.kind], cx - 24, by - 46, 48, 48); c.globalAlpha = 1;
    const f = nodeBar(n);
    if (f !== null && !G.nodeRaided(S, n)) { bar2d(c, cx, by + 2, 34, f); return; }
    const w = G.workersAt(S, n).length;
    const t = G.nodeRaided(S, n) ? 'raided' : !nodeShownDev(n) ? '' : w ? `+${nodeYield(n)}` : 'idle';
    if (!t) return;
    c.font = '700 10px Alegreya, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(t, cx, by + 8); c.fillStyle = w ? RES_COL[n.kind] : '#c8b898'; c.fillText(t, cx, by + 8);
  }
  function drawVillain(c, ox, oy, now) {
    const V = S.villain;
    let cx = V.x * TILE + TILE / 2 + ox, by = V.y * TILE + TILE + oy;
    if (ui.manim && ui.manim.id === 'villain') { const p = lerpPath(ui.manim, now); cx = p.x + ox; by = p.y + TILE / 2 + oy; }
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
    const FG = fogNow(); const key = S.seed + ':' + FG.k;
    if (!miniBase || miniBase.key !== key) {
      const M = G.mapOf(S); miniBase = document.createElement('canvas'); miniBase.width = G.MW * 6; miniBase.height = G.MH * 6; miniBase.key = key;
      const m = miniBase.getContext('2d');
      for (let y = 0; y < G.MH; y++) for (let x = 0; x < G.MW; x++) { const i = tidx(x, y); if (!FG.seen[i]) { m.fillStyle = '#07060b'; m.fillRect(x * 6, y * 6, 6, 6); continue; } m.fillStyle = M.road[i] ? '#c4aa7a' : A.MINI[M.T[i]]; m.fillRect(x * 6, y * 6, 6, 6); if (!FG.vis[i]) { m.fillStyle = 'rgba(8,6,14,0.5)'; m.fillRect(x * 6, y * 6, 6, 6); } }
    }
    const W = cv.clientWidth || 200, H = Math.round(W * G.MH / G.MW);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.imageSmoothingEnabled = false; c.drawImage(miniBase, 0, 0, W, H);
    const sx = W / G.MW, sy = H / G.MH; const dot = Math.max(3, sx * 0.8);
    const sq = (x, y, col, z, edge) => { const r = (z || dot) / 2; c.fillStyle = col; c.fillRect((x + 0.5) * sx - r, (y + 0.5) * sy - r, r * 2, r * 2); if (edge) { c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect((x + 0.5) * sx - r, (y + 0.5) * sy - r, r * 2, r * 2); } };
    for (const site of G.sitesOf(S)) if (FG.seen[tidx(site.x, site.y)]) sq(site.x, site.y, site.kind === 'tower' ? '#c47cff' : site.kind === 'town' ? '#fff4d6' : '#d9ccb0', site.kind === 'landmark' ? dot * 0.8 : dot * 1.5, '#1a1008');
    for (const n of S.nodes || []) if (FG.seen[tidx(n.x, n.y)]) sq(n.x, n.y, G.nodeRaided(S, n) ? '#6a6458' : MINI_RES[n.kind], dot * 1.1, '#140c04');
    for (const o of S.objects) {
      if (o.kind === 'stack' ? !canSeeObj(o) : !FG.seen[tidx(o.x, o.y)]) continue;
      if (o.kind === 'dungeon' && o.mine) sq(o.x, o.y, o.building ? '#5a2a78' : G.lairWrecked(S, o) ? '#4a3a52' : '#c04aff', dot * 1.4, '#f0d8ff');
      else if (!isTrapKind(o.kind)) sq(o.x, o.y, o.kind === 'stack' ? '#ff5a45' : o.kind === 'dungeon' ? '#ff9a6a' : '#ffd25a', dot * 0.9);
    }
    const msel = new Set(selMinions().map(m => m.id));
    for (const m of S.minions || []) { const p = minionTile(m); c.fillStyle = msel.has(m.id) ? '#ffffff' : '#e2ccff'; c.beginPath(); c.arc((p.x + 0.5) * sx, (p.y + 0.5) * sy, msel.has(m.id) ? 2.6 : 1.9, 0, 7); c.fill(); if (msel.has(m.id)) { c.strokeStyle = '#3a1a5a'; c.lineWidth = 1; c.stroke(); } }
    if (G.villainOnMap(S) && FG.vis[tidx(S.villain.x, S.villain.y)]) { c.fillStyle = '#c06cff'; c.beginPath(); c.arc((S.villain.x + 0.5) * sx, (S.villain.y + 0.5) * sy, 3.5, 0, 7); c.fill(); }
    const pp = partyPx(); c.fillStyle = '#ff2a1a'; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(pp.x / TILE * sx, pp.y / TILE * sy, 3.8, 0, 7); c.fill(); c.stroke();
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
    try { localStorage.setItem('bts-mini', on ? '1' : '0'); } catch (e) { /* storage unavailable */ }
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
  function bindMap() {
    const cv = mapCv();
    cv.addEventListener('pointerdown', e => { if (e.button === 2) return; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } ui.drag = { x: e.clientX, y: e.clientY, cx: ui.cam.x, cy: ui.cam.y, moved: false }; if (ui.r3d) W3.dragStart(e.clientX, e.clientY); });
    cv.addEventListener('pointermove', e => {
      if (ui.drag) {
        const dx = e.clientX - ui.drag.x, dy = e.clientY - ui.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) ui.drag.moved = true;
        if (ui.drag.moved) { if (ui.night) ui.night.keepCam = true; if (ui.r3d) W3.dragMove(e.clientX, e.clientY); else { ui.cam.x = ui.drag.cx - dx; ui.cam.y = ui.drag.cy - dy; clampCam(); } cv.style.cursor = 'grabbing'; cv.dataset.cur = 'grabbing'; drawMap(); return; }
      }
      const t = tileAt(e); const hm = e.pointerType === 'touch' ? null : minionAtPx(e);
      if (!t || !ui.hover || t.x !== ui.hover.x || t.y !== ui.hover.y || hm !== ui.hoverMin) { ui.hover = t; ui.hoverMin = hm; drawMap(); status(); setCur(cv, mapCursor(t)); }
    });
    cv.addEventListener('pointerup', e => {
      const d = ui.drag; ui.drag = null; cv.dataset.cur = ''; setCur(cv, mapCursor(ui.hover)); if (ui.r3d) W3.dragEnd();
      if (!d || d.moved || !S || S.phase !== 'map' || ui.moving) return;
      const t = tileAt(e);
      if (ui.place) { if (t) placeAt(t); return; }
      if (ui.mode === 'move') { if (t) { giveOrder(t); ui.mode = null; renderSide(); } return; }
      if (ui.mode === 'patrol') { if (t) patrolTo(t); return; }
      const mid = minionAtPx(e); if (mid) { clickMinion(mid, e.shiftKey); return; }
      // on a touch screen there's no right-click: tapping a site, a half-built lair or the tower gives the order
      if (t && e.pointerType === 'touch' && selMinions().length) { const o = orderAt(t); if (o.kind === 'work' || o.kind === 'help' || o.kind === 'home') { giveOrder(t); return; } }
      if (t) clickTile(t, e.shiftKey);
    });
    cv.addEventListener('pointerleave', () => { ui.hover = null; ui.hoverMin = null; drawMap(); status(); });
    cv.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (ui.place || ui.mode) { ui.place = null; ui.mode = null; renderSide(); drawMap(); return; }
      if (S && S.phase === 'map' && !ui.moving && selMinions().length) { const t = tileAt(e); if (t) giveOrder(t); return; }
      if (S && S.phase === 'map' && !ui.moving && selBand()) { const t = tileAt(e); if (t) patrolTo(t); return; }
      if (ui.tool || ui.sel) { ui.tool = null; ui.sel = null; renderSide(); drawMap(); }
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
  const questTargetAt = () => null;
  // what's on a tile, for clicks and hover
  function thingAt(x, y) {
    if (!hasSeen(x, y)) return x === S.party.x && y === S.party.y ? { type: 'party', x, y } : { type: 'spot', x, y };
    let o = G.objAt(S, x, y); if (o && o.kind === 'stack' && !canSeeObj(o)) o = null;
    if (o && o.kind === 'dungeon' && o.mine) return { type: 'lair', id: o.id, x, y };
    const n = G.nodeAt(S, x, y); if (n) return { type: 'node', id: n.id, x, y };
    if (o) return { type: 'obj', id: o.id, x, y };
    const site = G.siteAt(S, x, y); if (site) return { type: 'site', id: site.id, x, y };
    const m = (S.minions || []).find(z => z.x === x && z.y === y); if (m) return { type: 'minion', id: m.id, x, y };
    if (x === S.party.x && y === S.party.y) return { type: 'party', x, y };
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
    const same = ui.sel && ui.sel.type === th.type && ui.sel.x === th.x && ui.sel.y === th.y;
    ui.sel = same ? null : th;
    ui.scrollTo = 'sel'; ui.reachKey = ''; renderSide(); drawMap();
  }
  /* ============ the dungeon master's fog of war ============ */
  // vis: what your tower, minions (where they stand right now, even mid-walk) and lairs see, plus around the heroes; seen: ever seen
  function fogNow() {
    const N = ui.night;
    const mpos = m => { const p = minionTile(m); return { x: Math.round(p.x), y: Math.round(p.y) }; };
    const k = [S.party.x, S.party.y, (S.minions || []).map(m => { const p = N ? mpos(m) : m; return p.x + ',' + p.y; }).join(';'), S.objects.filter(o => o.kind === 'dungeon' && o.mine).map(o => o.x + ',' + o.y + (o.building ? 'b' : '')).join(';'), living()].join('|');
    if (ui.fog && ui.fog.k === k && ui.fog.seenRef === (N ? N.seen0 : S.dmSeen)) return ui.fog;
    // the title screen's world has no fog
    if (S.title) { const all = new Uint8Array(G.MW * G.MH).fill(1); ui.fog = { k, vis: all, seen: all, seenRef: S.dmSeen }; return ui.fog; }
    const vis = G.dmVisible(S, N ? mpos : null); const base = (N && N.seen0) || S.dmSeen || []; const seen = new Uint8Array(vis.length);
    for (let i = 0; i < vis.length; i++) seen[i] = vis[i] || base[i] ? 1 : 0;
    ui.fog = { k, vis, seen, seenRef: N ? N.seen0 : S.dmSeen }; return ui.fog;
  }
  const living = () => S.heroes.filter(h => h.status === 'ok').length;
  const canSee = (x, y) => x >= 0 && y >= 0 && x < G.MW && y < G.MH && fogNow().vis[tidx(Math.round(x), Math.round(y))] === 1;
  const hasSeen = (x, y) => x >= 0 && y >= 0 && x < G.MW && y < G.MH && fogNow().seen[tidx(x, y)] === 1;
  const canSeeObj = o => { const t = bandTile(o.id); return t ? canSee(t.x, t.y) : canSee(o.x, o.y); };

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
    setMinionSel(ids); ui.place = null; ui.mbuild = false; ui.mode = null; ui.scrollTo = 'sel'; renderSide(); drawMap();
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
  const ORDER_COL = { work: '#ffd36a', help: '#78dc78', home: '#c9a2ff', move: '#e8d4ff', no: '#dc3c28' };
  // what a right-click on this tile would tell the selected minions to do
  function orderAt(t) {
    const ms = selMinions(); if (!ms.length || !t) return { kind: 'none' };
    if (!hasSeen(t.x, t.y)) { const e = G.moveCheck(S, t.x, t.y); return e && !/walk there/.test(e) ? { kind: 'move', x: t.x, y: t.y } : e ? { kind: 'no', why: e } : { kind: 'move', x: t.x, y: t.y }; }
    const n = G.nodeAt(S, t.x, t.y);
    if (n) {
      const K = G.NODE_KINDS[n.kind];
      if (G.nodeRaided(S, n)) { const d = n.raidedUntil - G.dayIndex(S); return { kind: 'no', target: true, why: `The heroes drove your minions off this ${G.nodeName(n)}. It's safe again in ${d} day${d > 1 ? 's' : ''}.` }; }
      const others = G.assignedTo(S, n).filter(m => !ms.includes(m)).length;
      if (others >= K.cap) return { kind: 'no', target: true, why: `Another ${MT().one.toLowerCase()} already works that ${G.nodeName(n)}. One minion per site.` };
      return { kind: 'work', n, room: K.cap - others };
    }
    const o = G.objAt(S, t.x, t.y);
    if (o && o.kind === 'dungeon' && o.mine && o.building) return { kind: 'help', o };
    const site = G.siteAt(S, t.x, t.y); if (site && site.id === 'tower') return { kind: 'home' };
    const err = G.moveCheck(S, t.x, t.y); if (err) return { kind: 'no', why: err };
    return { kind: 'move', x: t.x, y: t.y };
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
      const opts = S.nodes.filter(n => n.kind === kind && !G.nodeRaided(S, n) && G.assignedTo(S, n).length < G.NODE_KINDS[kind].cap).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) + (a.dev ? 0 : 3) - Math.hypot(b.x - m.x, b.y - m.y) - (b.dev ? 0 : 3));
      for (const n of opts) { if (!G.orderWork(S, n.id, m.id)) { sent++; last = n; break; } }
    }
    if (!sent) { toast(`Every ${kind} site already has a minion, or was raided.`, 'bad'); return; }
    if (last) ui.floats.push({ x: last.x * TILE + TILE / 2, y: last.y * TILE + TILE * 0.3, text: G.nodeName(last), color: ORDER_COL.work, t0: performance.now() });
    if (sent < ms.length) toast(`Only ${sent} found a free ${kind} site.`, 'sys');
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
    const f = selMinions()[0]; centerOn(f.x, f.y); ui.place = null; ui.mbuild = false; ui.scrollTo = 'sel'; renderSide(); drawMap();
  }
  // the selected minions' routes as ground arrows: bright for tonight's walk, dim for later
  function minionRoutes(ms) {
    const arrows = [], colors = []; if (ui.night) return { arrows, colors };
    const mp = G.minionType(S).perk === 'fast' ? G.MINION_MP * 2 : G.MINION_MP;
    for (const m of ms) {
      let px = m.x, py = m.y, left = mp;
      for (const [x, y] of m.path) { left -= G.stepCost(S, px, py, x, y); arrows.push([px, py, Math.atan2(y - py, x - px)]); colors.push(left >= 0 ? '#ecdcff' : '#9a72cc'); px = x; py = y; }
    }
    return { arrows, colors };
  }
  function minionDays(m) { let c = 0, px = m.x, py = m.y; for (const [a, b] of m.path) { c += G.stepCost(S, px, py, a, b); px = a; py = b; } const mp = G.minionType(S).perk === 'fast' ? G.MINION_MP * 2 : G.MINION_MP; return Math.max(1, Math.ceil(c / mp - 0.001)); }
  function minionJob(m) {
    const away = m.path.length ? `, ${minionDays(m)} day${minionDays(m) > 1 ? 's' : ''} away` : '';
    if (!m.job) return m.path.length ? `Heading back to the tower${away}.` : 'Idle, waiting for orders.';
    if (m.job.kind === 'work') { const n = S.nodes.find(z => z.id === m.job.node) || { kind: 'gold', x: m.x, y: m.y }; return `${m.path.length ? 'Walking to' : n.dev ? 'Working' : `Will ${G.NODE_KINDS[n.kind].sink} tonight at`} the ${esc(G.nodeName(n))} near ${esc(G.regionName(S, n.x, n.y))}${away}.`; }
    if (m.job.kind === 'build') { const o = S.objects.find(z => z.id === m.job.lair) || { dtype: 'warren' }; return `${m.path.length ? 'Walking to build' : 'Building'} the ${esc(G.DUNGEONS[o.dtype].name)}${away}.`; }
    if (m.job.kind === 'move') return `Walking to ${esc(G.regionName(S, m.job.x, m.job.y))}${away}.`;
    return 'Busy.';
  }

  // tiles a lair's war parties can reach, for tinting the map
  function lairReachTiles(o) {
    const key = o.id + ':' + (o.level || 1);
    if (ui.reachCache && ui.reachCache.key === key) return ui.reachCache.set;
    const r = G.lairReach(o); const set = new Set(); const MWm = G.MW;
    const dist = new Map([[o.y * MWm + o.x, 0]]); const q = [[o.x, o.y]];
    while (q.length) {
      const [x, y] = q.shift(); const d = dist.get(y * MWm + x); set.add(y * MWm + x);
      for (const [dx, dy, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4], [-1, 1, 1.4], [1, -1, 1.4], [-1, -1, 1.4]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MWm || ny >= G.MH || !isFinite(G.tileCost(S, nx, ny))) continue;
        const nd = d + c; const k = ny * MWm + nx; if (nd > r || (dist.has(k) && dist.get(k) <= nd)) continue; dist.set(k, nd); q.push([nx, ny]);
      }
    }
    ui.reachCache = { key, set }; return set;
  }
  const selLair = () => ui.sel && ui.sel.type === 'lair' ? S.objects.find(o => o.id === ui.sel.id) : null;
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
  // the bar over a site: filling tonight, or empty while a minion is on its way to open it
  function nodeBar(n) { const f = nodeFill(n); if (f !== null) return f < 1 ? f : null; return !n.dev && G.assignedTo(S, n).length ? 0 : null; }
  function lairShownBuilding(o) { const L = ui.night && ui.night.lairs.get(o.id); if (!L) return o.building || 0; const f = Math.max(0, Math.min(1, (nightT() - L.t0) / ui.night.work)); return f >= 1 ? L.to : L.from + (L.to - L.from) * f; }
  function lairBar(o) { if (!o.mine) return null; const b = lairShownBuilding(o); if (!b) return null; const tot = o.buildTotal || G.buildDays(o.dtype); return Math.max(0, Math.min(1, 1 - b / tot)); }
  // before the engine runs the night: where everyone stands and what's half-built
  function nightBefore() {
    return { mins: new Map((S.minions || []).map(m => [m.id, { x: m.x, y: m.y, path: m.path.map(p => p.slice()) }])), lairs: new Map(G.myLairs(S).filter(o => o.building).map(o => [o.id, o.building])), seen0: (S.dmSeen || []).slice() };
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
    const sp = ui.fast ? 0.55 : 1; const spt = Math.min(0.28, 3.4 / Math.max(1, maxLen)) * sp; const work = 1.0 * sp;
    const arrive = id => { const w = mins.get(id); return w ? w.len * spt : 0; };
    const opened = new Map(); for (const id of d.opened || []) { const n = S.nodes.find(z => z.id === id); if (!n) continue; const m = G.workersAt(S, n)[0]; opened.set(id, m ? arrive(m.id) : 0); }
    const lairs = new Map();
    for (const [id, before] of pre.lairs) {
      const o = S.objects.find(z => z.id === id); if (!o || (o.building || 0) === before) continue;
      const bs = S.minions.filter(m => m.x === o.x && m.y === o.y);
      lairs.set(id, { from: before, to: o.building || 0, t0: bs.length ? Math.min(...bs.map(m => arrive(m.id))) : 0 });
    }
    if (!mins.size && !opened.size && !lairs.size && !bands.size) return null;
    let end = maxLen * spt; for (const t of opened.values()) end = Math.max(end, t + work); for (const L of lairs.values()) end = Math.max(end, L.t0 + work);
    // the box to keep in view: every walk, every site that opened, every lair that rose
    const xs = [], ys = []; for (const w of mins.values()) for (const [x, y] of w.pts) { xs.push(x); ys.push(y); }
    for (const id of opened.keys()) { const n = S.nodes.find(z => z.id === id); xs.push(n.x); ys.push(n.y); }
    for (const id of lairs.keys()) { const o = S.objects.find(z => z.id === id); xs.push(o.x); ys.push(o.y); }
    for (const [id, w] of bands) { const [x, y] = w.pts[w.pts.length - 1]; if (vis0[y * G.MW + x] || pre.seen0[y * G.MW + x]) for (const [a, b] of w.pts) { xs.push(a); ys.push(b); } }
    if (!xs.length) { xs.push(S.party.x); ys.push(S.party.y); }
    return { t0: performance.now(), mins, bands, seen0: pre.seen0, spt, work, opened, lairs, dur: end + 0.4 * sp, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], yields: d.yields || [] };
  }
  // glide out to watch, then back to where you were looking
  function nightCamera(N) {
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
      // what each site brought in, floating up as the sun rises
      for (const [id, amt] of N.yields) { const n = S.nodes.find(z => z.id === id); if (n) ui.floats.push({ x: n.x * TILE + TILE / 2, y: n.y * TILE + TILE * 0.2, text: `+${amt} ${G.NODE_KINDS[n.kind].res}`, color: RES_COL[n.kind], t0: performance.now() }); }
      if (!N.keepCam) { if (N.cam) W3.camTo(N.cam); if (N.cam2) { ui.cam.x = N.cam2.x; ui.cam.y = N.cam2.y; clampCam(); } }
      ui.night = null; kick(); syncAudio(); if (N.yields && N.yields.length) sfx('coins', { vol: 0.7 }); done();
    }, lead * 1000 + N.dur * 1000);
  }
  // several minions on one tile stand in a little ring
  function minionSpots() {
    const groups = new Map(); const out = new Map();
    for (const m of S.minions || []) { const k = m.x + ',' + m.y; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
    for (const list of groups.values()) list.forEach((m, i) => { const n = list.length; const busy = G.nodeAt(S, m.x, m.y) || G.objAt(S, m.x, m.y); const r = busy ? 0.38 : n > 1 ? 0.2 : 0; const a = i / Math.max(1, n) * Math.PI * 2 + 0.6; out.set(m.id, { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.7 }); });
    return out;
  }
  function animateUnit(id, from, path, done) {
    const pts = [[from.x, from.y]].concat(path);
    ui.manim = { id, pts, t0: performance.now(), dur: reduced ? 1 : Math.min(1400, 90 * pts.length) };
    kick();
    setTimeout(() => { ui.manim = null; done(); }, ui.manim.dur + 30);
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
    const dur = reduced ? 1 : ui.fast ? 70 : 150;
    ui.anim = { from, to, t0: performance.now(), dur }; partySteps(to, dur);
    const px = to.x * TILE, py = to.y * TILE; const m = TILE * 3;
    if (ui.r3d) W3.ensureVisible(to.x, to.y);
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
    SND.amb(over || b ? null : ui.screen === 'tower' ? 'amb-tower' : ui.screen === 'town' && SND.has('amb-town') ? 'amb-town' : ui.night ? 'amb-night' : 'amb-day');
  }
  /* ============ the heroes talk: a portrait pops up and says a line, voiced and lip-synced when it's been recorded ============ */
  const VO = { last: -1e9, cat: {}, cur: null, said: {} };
  const HLINES = () => (window.HERO_LINES && window.HERO_LINES.heroes) || {};
  const VO_PRIORITY = { boss: 3, win: 3, march: 2, down: 2 };
  const VO_GAP = { explore: 150000, rest: 120000, town: 60000, start: 20000, danger: 20000, hard: 25000, easy: 25000, down: 12000, levelup: 8000, loot: 8000, march: 3e9, boss: 3e9, win: 3e9 };
  // cat: start, danger, hard, easy, down, rest, explore, levelup, loot, town, march, boss, win. who: the hero who should say it
  function bark(cat, who, o) {
    o = o || {};
    if (!S || !ui.active || ui.chatter === false) return false;
    const now = performance.now(); const pr = VO_PRIORITY[cat] || 0;
    if (VO.cur && pr < 2) return false;
    if (!pr && now - VO.last < (S.phase === 'battle' ? 5000 : 15000)) return false;
    if (!o.force && VO.cat[cat] && now - VO.cat[cat] < (VO_GAP[cat] || 10000)) return false;
    const H = HLINES();
    let h = who && who.status !== 'dead' && H[who.rid] ? who : null;
    if (!h) {
      const live = S.heroes.filter(x => x.status === 'ok' && H[x.rid]); if (!live.length) return false;
      h = live.map(x => [x, (VO.said[x.id] || 0) + Math.random() * 30000]).sort((a, b) => a[1] - b[1])[0][0];
    }
    const key = cat === 'explore' ? (Math.random() < 0.5 ? 'explore1' : 'explore2') : cat;
    const text = H[h.rid].lines[key]; if (!text) return false;
    VO.last = now; VO.cat[cat] = now; VO.said[h.id] = now;
    showBark(h, key, text); return true;
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
  function showBark(h, key, text) {
    const el = barkEl(); const V = ART.voice && ART.voice[h.rid] && ART.voice[h.rid][key]; const T = ART.talk && ART.talk[h.rid];
    if (VO.cur && VO.cur.stop) VO.cur.stop();
    // the mouth shapes: one strip per hero (0.20.1), or one file each (older art)
    if (T && !T.imgs) { if (T.strip) { const im = new Image(); im.src = 'art/' + T.strip; T.imgs = [im]; } else T.imgs = (T.frames || []).map(f => { const im = new Image(); im.src = 'art/' + f; return im; }); }
    el.querySelector('.bkname').textContent = shortName(h.name);
    el.querySelector('.bktext').textContent = text;
    el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in'); placeBark();
    const cv = el.querySelector('canvas'); const c = cv.getContext('2d');
    const portrait = A.IMG[A.ensureHero(h)];
    const cur = VO.cur = { h, t0: performance.now(), dur: V ? V.dur : Math.max(2.2, text.length * 0.065), sync: V && V.sync, play: null, stop: null };
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
      else if (portrait) { const bob = talking ? Math.abs(Math.sin(t * 10)) * 4 : 0; c.drawImage(portrait, 0, 4 - bob, cv.width, cv.height); }
      el.classList.toggle('talking', talking);
      if (t < cur.dur + 1.8) requestAnimationFrame(draw); else hideBark(cur);
    };
    if (V && window.SND) SND.voice('voice/' + V.file.replace(/^voice\//, ''), V.at, V.dur).then(p => { if (VO.cur === cur && p) { cur.play = p; cur.dur = p.dur; cur.stop = p.stop; } });
    requestAnimationFrame(draw);
  }
  addEventListener('resize', () => placeBark());
  function hideBark(cur) {
    if (VO.cur !== cur) return; VO.cur = null;
    const el = $('bark'); if (!el) return;
    el.classList.remove('in'); el.classList.add('out'); setTimeout(() => { if (!VO.cur) el.hidden = true; }, 350);
  }
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
      if (d && d.side === 'party' && (ev.down || ev.died)) {
        sfx('hit'); sfx('down', { delay: 0.15 });
        const up = b.units.filter(u => u.side === 'party' && u.alive && !u.down && u.id !== d.id).map(u => S.heroes.find(x => x.id === u.hero)).filter(Boolean);
        if (up.length) setTimeout(() => bark('down', up[Math.floor(Math.random() * up.length)]), 700);
        return;
      }
      if (ev.crit) sfx('crit'); else if (ev.dmg) sfx('hit');
      if (ev.died || ev.killed) sfx('die', { vol: 0.6, delay: 0.12, gap: 300 });
      return;
    }
    if (ev.t === 'spell') { const f = ev.fx; sfx(ev.heal || f === 'holyword' ? 'holy' : f === 'fireball' || f === 'meteor' || f === 'breath' || f === 'lightning' || f === 'chain' ? 'fire' : 'dark'); return; }
    if (ev.t === 'summon') { sfx('summoned', { vol: 0.8 }); return; }
    if (ev.t === 'revive') { sfx('holy', { vol: 0.8 }); }
  }
  function endDay() {
    if (S.phase !== 'map' || ui.moving || ui.manim || ui.fair) return;
    { const live = S.heroes.filter(h => h.status === 'ok'); const f = live.reduce((t, h) => t + h.hp / h.maxHp, 0) / Math.max(1, live.length);
      if (S.march && !(S.vo && S.vo.march)) { S.vo = Object.assign(S.vo || {}, { march: true }); bark('march'); }
      else if (f < 0.5) bark('rest'); }
    clearTimeout(ui.meterT); ui.meterTok++;
    ui.tool = null; ui.place = null; ui.mode = null; if (!(ui.sel && ui.sel.type === 'minion')) ui.sel = null; ui.moving = true; renderSide(); stepLoop();
  }
  function stepLoop() {
    if (S.phase === 'battle') { enterBattle(); return; }
    if (S.phase === 'encounter') { showEncounter(); return; }
    if (S.phase !== 'map') { ui.moving = false; return; }
    if (S.pendingLevelUps.length) { showLevelUps(() => stepLoop()); return; }
    const ev = G.partyStep(S);
    if (ev.t === 'move') {
      const site = G.siteAt(S, ev.x, ev.y);
      if (site && site.kind === 'town') { if (!ui.inTown) { ui.inTown = true; bark('town'); } } else ui.inTown = false;
      if (Math.random() < 0.04) bark('explore');
    }
    if (['move', 'event', 'battle', 'trap', 'encounter'].indexOf(ev.t) >= 0) {
      animateParty(ev.from, { x: ev.x, y: ev.y }, () => {
        renderBar();
        if (ev.spotted) ui.floats.push({ x: ev.x * TILE + TILE / 2, y: ev.y * TILE, text: '!', color: '#ffe066', t0: performance.now() });
        if (ev.t === 'battle') { save(); enterBattle(); return; }
        if (ev.t === 'encounter') { save(); showEncounter(); return; }
        if (ev.t === 'trap') { save(); playMapRolls(ev.rolls, () => { for (const m of ev.msgs) toast(m, 'bad'); renderSide(); setTimeout(stepLoop, ui.fast ? 200 : 500); }); return; }
        if (ev.t === 'event') {
          for (const m of ev.msgs) toast(m, 'good');
          ui.floats.push({ x: ev.x * TILE + TILE / 2, y: ev.y * TILE, text: '★', color: '#ffe066', t0: performance.now() });
          renderSide(); setTimeout(stepLoop, ui.fast ? 250 : 650); return;
        }
        if (ev.spotted) { renderSide(); setTimeout(stepLoop, ui.fast ? 150 : 350); return; }
        stepLoop();
      });
      return;
    }
    const pre = nightBefore();
    G.endDay(S);
    ui.comp = {}; ui.meter = null;
    const N = reduced ? null : nightPlan(pre);
    if (N) { save(); startNight(N, dawn); renderSide(); } else dawn();
  }
  // the minions waiting to be summoned at the tower, the first one taking shape
  function summonQueue() {
    const q = S.summons || []; if (!q.length) return '';
    return `<div class="squeue">${q.map((it, i) => `<div class="prow">${img(minionIcon(), 'ticon')}${pbar(i ? 0 : 1 - it.days / it.total, 'summon')}<small>${i ? 'waiting' : `${it.days} day${it.days > 1 ? 's' : ''} left`}</small><button class="lnk" data-act="unsummon" data-i="${i}" title="Cancel and get the gold back">cancel</button></div>`).join('')}</div>`;
  }
  function dawn() {
    ui.moving = false;
    const n = S.lastDay;
    if (n) {
      const got = G.RES_KEYS.filter(k => n.res[k]).map(k => `+${n.res[k]} ${k}`).join(', ');
      if (got || n.raised.length) toast(`Overnight: ${got || 'no resources'}${n.raised.length ? '. Your lairs raised ' + n.raised.map(([t, c]) => `${c} ${c > 1 ? G.CREATURES[t].name.toLowerCase() : G.CREATURES[t].one.toLowerCase()}`).join(', ') : ''}.`, 'sys');
      for (const id of n.opened || []) { const nd = S.nodes.find(z => z.id === id); if (nd) toast(`Your ${MT().one.toLowerCase()} opened a ${G.NODE_KINDS[nd.kind].name} near ${G.regionName(S, nd.x, nd.y)}.`, 'good'); }
      for (const id of n.released || []) { const b = S.objects.find(z => z.id === id); if (b) toast(`${G.bandName(b)} march ${b.wave ? 'on Millbrook from' : 'out of'} your ${G.DUNGEONS[(S.objects.find(z => z.id === b.lair) || { dtype: 'warren' }).dtype].name}.`, 'good'); }
      sfx('dawn', { vol: 0.6 });
      let at = 0.9; const later = k => { sfx(k, { delay: at }); at += 0.8; };
      if (n.built.length || n.library || (n.town && n.town.built)) later('built');
      if ((n.summoned || []).length) later('summoned');
      for (const id of n.built) { const o = S.objects.find(z => z.id === id); if (o) toast(`The ${G.DUNGEONS[o.dtype].name} is finished.`, 'good'); }
      if (n.town && n.town.built) { const B = G.TOWN_B[n.town.built]; const l = G.townLv(S, n.town.built); toast(`Millbrook's ${B.name}${l > 1 ? ' ' + G.roman(l) : ''} is ${l > 1 ? 'enlarged' : 'finished'}: ${B.levels ? B.levels[l - 1] : '+' + G.priceText(B.income[l - 1]) + ' a day'}.`, 'good'); }
      if ((n.summoned || []).length) toast(`A new ${MT().one.toLowerCase()} crawls out of the Dark Tower, ready to work.`, 'good');
      if (n.library) toast(G.libraryLevel(S) > 1 ? "The Forbidden Library's new wing is finished: one more talent point." : 'The Forbidden Library is finished: a talent point to spend.', 'good');
      // 0.30: the night's sieges, and what Millbrook is up to
      for (const r of n.sieges || []) { toast(r.text, r.breached ? 'good' : 'sys'); if (r.breached) later('coins'); }
      for (const o of S.objects.filter(z => z.wave && z.atGates)) toast(`${G.bandName(o)} wait at Millbrook's gates. The heroes will man the walls.`, 'warn');
      if (n.town && n.town.started) { const k = n.town.started; toast(`Millbrook starts work on ${k === 'walls' ? G.TOWN_B.walls.names[G.townLv(S, 'walls')].toLowerCase() : 'the ' + G.TOWN_B[k].name + (G.townLv(S, k) ? ' ' + G.roman(G.townLv(S, k) + 1) : '')}.`, 'sys'); }
    }
    if (S.phase === 'over') { commit(); showOver(); return; }
    const go = () => { if (S.phase === 'week') { commit(); showWeek(); return; } commit(); morning(); };
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
  const BICON = { warren: 'obj-warren', kennels: 'unit-wolf', hideout: 'unit-bandit', ossuary: 'obj-bonecrypt', barracks: 'obj-camp', library: 'obj-lore', ogre: 'obj-den', altar: 'obj-barrow', troll: 'obj-fens', giant: 'obj-hold', blood: 'obj-keep', mire: 'obj-mire', roost: 'obj-roost', gate: 'obj-abyss' };
  const perNight = (n, C) => n >= 1.25 ? `${Math.round(n * 10) / 10} ${C.name.toLowerCase()} a night` : n >= 0.75 ? `about 1 ${C.one.toLowerCase()} a night` : `1 ${C.one.toLowerCase()} every ${Math.max(2, Math.round(1 / n))} nights`;
  function readinessHtml(full) {
    const r = G.readiness(S); const pct = r.win === null ? Math.min(30, r.ratio / r.need * 30) : Math.max(4, r.win * 100); const mark = r.need <= 1 ? r.need * 100 : 55;
    const cls = r.ready ? 'bad' : r.label === 'Almost ready' ? 'warn' : 'good';
    const lab = S.march ? 'Marching on you' : r.win === null ? 'No threat yet' : r.ready ? 'Ready to march' : r.label === 'Almost ready' ? 'Almost ready' : 'Not ready';
    return `<div class="readybox"><p><b class="${cls}">${esc(lab)}</b> · heroes level ${G.avgLevel(S)} against ${esc(VN())} at level ${G.villainLevel(S)}${S.march ? ` · <b class="warn">they're on their way to the Dark Tower</b>` : ''}</p>
      <div class="readymeter" title="${r.win === null ? `Below level ${Math.max(G.MARCH_LV, G.villainLevel(S) - 6)} the heroes don't even think about the tower.` : `They think they'd beat you about ${Math.round(r.win * 100)}% of the time. The white line is where they march.`}"><i style="width:${pct.toFixed(0)}%"></i><em style="left:${mark.toFixed(0)}%"></em></div>
      ${full ? `<p class="hint">From level ${G.MARCH_LV} the heroes size up the showdown at your throne every time something changes: their levels and items, your level and powers. When they think they'd win more often than not, they march on the Dark Tower. Keep levelling up to stay ahead of them.${r.win !== null ? ` Right now they'd win about ${Math.round(r.win * 100)}% of the time.` : ''}</p>` : ''}</div>`;
  }
  /* --- the war party you are putting together, and how the fight would go --- */
  const compList = () => G.CREATURE_ORDER.filter(t => (ui.comp[t] || 0) > 0).map(t => [t, ui.comp[t]]);
  const compKey = () => compList().map(x => x.join(':')).join(',') + '|' + S.heroes.map(h => h.id + h.level + ':' + h.hp + ':' + h.mana + ':' + h.items.length).join(',') + '|' + today();
  function clampComp() {
    for (const t of Object.keys(ui.comp)) { const have = G.garrisonCount(S, t); if (ui.comp[t] > have) ui.comp[t] = have; if (!(ui.comp[t] > 0)) delete ui.comp[t]; }
  }
  // practice runs happen a couple at a time between frames, so the page never freezes
  function runMeter() {
    clearTimeout(ui.meterT);
    const key = compKey(); const list = compList();
    if (!list.length) { ui.meter = null; paintMeter(); return; }
    if (ui.meter && ui.meter.key === key && (ui.meter.done || ui.meter.busy)) { paintMeter(); return; }
    const m = ui.meter = { key, runs: [], busy: true, done: false, sum: null };
    paintMeter();
    const N = 10; const tok = ++ui.meterTok;
    const chunk = () => {
      if (tok !== ui.meterTok || !S || S.phase !== 'map') return;
      for (let i = 0; i < 2 && m.runs.length < N; i++) m.runs.push(G.simAttackRun(S, list, m.runs.length));
      m.sum = G.simAttackSum(m.runs);
      if (m.runs.length >= N) { m.busy = false; m.done = true; }
      paintMeter();
      if (!m.done) ui.meterT = setTimeout(chunk, 0);
    };
    ui.meterT = setTimeout(chunk, 30);
  }
  function scheduleMeter() { clearTimeout(ui.meterT); ui.meterTok++; ui.meter = null; paintMeter(); ui.meterT = setTimeout(runMeter, 260); }
  function findFair() {
    if (!S || S.phase !== 'map') return;
    clearTimeout(ui.meterT); const tok = ++ui.meterTok;
    const f = G.fairSearch(S); ui.fair = f; paintMeter(); paintComposerBtns();
    const chunk = () => {
      if (tok !== ui.meterTok || !S || S.phase !== 'map') { ui.fair = null; paintComposerBtns(); return; }
      for (let i = 0; i < 2 && !f.done; i++) f.step();
      if (!f.done) { ui.meterT = setTimeout(chunk, 0); return; }
      ui.fair = null;
      const best = f.best;
      if (!best) { toast('Your garrison is empty. Raise monsters in your tower first.', 'bad'); renderSide(); return; }
      ui.comp = {}; for (const [t, n] of best.comp) ui.comp[t] = n;
      ui.meter = { key: compKey(), runs: [], busy: false, done: true, sum: best.r };
      renderSide();
    };
    ui.meterT = setTimeout(chunk, 20);
  }
  const ZONES = [['Trivial', 'Stomp', 0, 0.06], ['Easy', 'Easy', 0.06, 0.18], ['Tense', 'Sweet spot', 0.18, 0.38], ['Harrowing', 'Harrowing', 0.38, 0.62], ['Deadly', 'Deadly', 0.62, 1]];
  function meterPos(r) {
    if (r.label === 'Deadly') return 80 + Math.min(1, Math.max(0, (r.avg - 0.62) / 0.38)) * 20;
    const i = Math.max(0, ZONES.findIndex(z => r.avg < z[3])); const z = ZONES[i];
    return i * 20 + Math.min(1, (r.avg - z[2]) / (z[3] - z[2])) * 20;
  }
  function meterHtml() {
    const m = ui.meter; const r = m && m.sum; const list = compList();
    const zones = ZONES.map(z => `<i class="z z-${z[0]}"></i>`).join('');
    const labels = ZONES.map(z => `<span class="${z[0] === 'Tense' ? 'sw' : ''}">${z[1]}</span>`).join('');
    let read;
    if (ui.fair) read = '<p class="mread hint">Scouting the heroes for a fair fight…</p>';
    else if (!list.length) read = `<p class="mread hint">${G.garrisonList(S).length ? 'Pick monsters with the sliders, or let the scouts find a fair fight.' : 'Your garrison is empty. Your tower raises more every night.'}</p>`;
    else if (!r) read = '<p class="mread hint">Playing out the fight…</p>';
    else {
      const pay = r.label === 'Deadly' ? 0 : G.ATTACK_LORE[r.label];
      const risk = r.tpk >= 0.1 ? `<span class="neg">They could all die (${Math.round(r.tpk * 100)}% of runs).</span>` : r.death >= 0.1 ? `<span class="neg">A hero dies in ${Math.round(r.death * 10)} of 10 runs.</span>` : r.death > 0 ? '<span class="warn">A hero might die.</span>' : '';
      read = `<p class="mread"><b class="est ${r.label}">${r.label === 'Tense' ? 'Tense: just right' : r.label}</b> They'd lose about ${Math.round(Math.min(1, r.avg) * 100)}% of their health${r.xp ? ` for ≈${r.xp} XP each` : ', and learn nothing'}. ${risk}${m.busy ? ' <span class="hint">…</span>' : ''}</p>
        <p class="hint mpay">${r.label === 'Deadly' ? 'Too much. Send fewer.' : r.label === 'Trivial' ? 'A stomp bores the table and pays nothing.' : `Pays your tower about ${4 * pay} gold if it plays out like this.`}</p>`;
    }
    const mk = r && !ui.fair ? `<b class="mk${m.busy ? ' busy' : ''}" style="left:${meterPos(r).toFixed(1)}%"></b>` : '';
    return `<div class="meter" role="img" aria-label="${r ? 'Balance: ' + r.label : 'Balance meter'}"><div class="mtrack">${zones}${mk}</div><div class="mlabels">${labels}</div></div>${read}`;
  }
  function paintMeter() { const el = $('meterbox'); if (el) el.innerHTML = meterHtml(); }
  function paintComposerBtns() {
    const f = $('fairbtn'); if (f) { f.disabled = !!ui.fair || !G.garrisonList(S).length || !!G.attackCheck(S); f.textContent = ui.fair ? 'Scouting…' : 'Find a fair fight'; }
    const s = $('sendbtn'); if (s) s.disabled = !!ui.fair || !compList().length || !!G.attackCheck(S) || ui.moving;
  }
  function garrisonRow(t, have) {
    const C = G.CREATURES[t]; const n = Math.min(have, ui.comp[t] || 0);
    return `<div class="grow">${img('unit-' + t, 'ticon', C.name)}<span class="gname"><b id="gn-${t}">${n}</b> / ${have} ${esc(C.name)}</span>
      <input type="range" min="0" max="${have}" value="${n}" data-act="comp" data-t="${t}" aria-label="How many ${esc(C.name)} to send"></div>`;
  }
  function composerHtml() {
    const g = G.garrisonList(S); const err = G.attackCheck(S);
    const done = S.attackDay === today();
    const inR = G.lairsInReach(S);
    const rows = g.length ? g.map(([t, n]) => garrisonRow(t, n)).join('') : '';
    const from = inR.length ? `<p class="reachline"><span class="k">In reach</span> ${inR.map(o => `<button class="lnk" data-act="sellair" data-id="${o.id}">${esc(G.DUNGEONS[o.dtype].name)}</button> <small>${Math.round(G.lairDist(S, o))} tiles</small>`).join(' · ')}</p>`
      : `<p class="hint warn">${G.builtLairs(S).length ? 'None of your lairs can reach the heroes today.' : 'You have no lairs yet.'} Click open ground near ${esc(S.party.goal || 'where they are heading')} to build one.</p>`;
    return `<section class="panel war${done ? ' spent' : ''}"><h2 class="cap">Send a war party</h2>
      ${done ? `<p class="hint">You attacked today. End the day and your lairs raise more monsters overnight.</p>` : !g.length ? from : `${from}<div class="garrison">${rows}</div><div id="meterbox">${meterHtml()}</div>
      <div class="row wbtns"><button class="btn sm" id="fairbtn" data-act="fair"${ui.fair || !g.length || err ? ' disabled' : ''}>${ui.fair ? 'Scouting…' : 'Find a fair fight'}</button><button class="btn big" id="sendbtn" data-act="send"${ui.fair || !compList().length || err || ui.moving ? ' disabled' : ''}>Send attack</button></div>`}
    </section>`;
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
  const daysAway = (m, x, y) => { const path = G.minionPath(S, m, x, y); if (!path) return null; let c = 0, px = m.x, py = m.y; for (const [a, b] of path) { c += G.stepCost(S, px, py, a, b); px = a; py = b; } const mp = G.minionType(S).perk === 'fast' ? G.MINION_MP * 2 : G.MINION_MP; return Math.max(0, Math.ceil(c / mp - 0.001)); };
  const MT = () => G.minionType(S);
  const minionIcon = () => 'unit-m-' + MT().look;
  // the sidebar card for whatever you clicked on the map
  function selPanel() {
    const sel = ui.sel; if (!sel || !S || S.phase !== 'map') return '';
    const close = '<button class="xbtn" data-act="desel" title="Close (Esc)">×</button>';
    if (sel.type === 'node') {
      const n = S.nodes.find(z => z.id === sel.id); if (!n) { ui.sel = null; return ''; }
      const K = G.NODE_KINDS[n.kind]; const raided = G.nodeRaided(S, n); const one = MT().one.toLowerCase(); const per = nodeYield(n);
      const a = G.assignedTo(S, n)[0]; const here = a && !a.path.length && a.x === n.x && a.y === n.y; const days = a && a.path.length ? minionDays(a) : 0;
      const gl = G.guardOf(S, n); const near = Math.hypot(n.x - S.party.x, n.y - S.party.y) < G.sightRadius(S) + 2;
      let st, bar = '';
      if (raided) st = `<b class="warn">The heroes drove your minions off. Safe to go back in ${n.raidedUntil - G.dayIndex(S)} day${n.raidedUntil - G.dayIndex(S) > 1 ? 's' : ''}.</b>`;
      else if (!n.dev) {
        st = !a ? `Untouched. A minion needs one night here to ${K.sink}; after that it ${K.verb} ${per} ${K.res} a day.` : here ? `Your ${one} will ${K.sink} here tonight. From tomorrow night it ${K.verb} ${per} ${K.res} a day.` : `A ${one} is on the way, ${days} day${days > 1 ? 's' : ''} out. It needs one night here to ${K.sink}.`;
        if (a) bar = `<div class="prow">${pbar(here ? 0 : 1 - a.path.length / Math.max(a.trip || 0, a.path.length))}<small>${here ? 'opens tonight' : 'on the way'}</small></div>`;
      } else st = here ? `Your ${one} ${K.verb} ${per} ${K.res} a day here.` : a ? `A ${one} is on the way, ${days} day${days > 1 ? 's' : ''} out.` : `Nobody works it. One minion here ${K.verb} ${per} ${K.res} a day.`;
      return `<section class="panel sel">${img('obj-' + (n.dev ? 'node-' : 'dep-') + n.kind, 'selimg')}<div>${close}<h2 class="cap">${esc(G.nodeName(n))}</h2>
        <p>${esc(n.dev ? K.text : K.rawText)} ${st}</p>${bar}
        <p class="hint">One minion per site.${gl ? ` Guarded by your ${esc(G.DUNGEONS[gl.dtype].name)}.` : ' Unguarded: a lair within two tiles would defend it.'}${near ? ' <b class="warn">The heroes are close.</b>' : ''}</p>
        <div class="row">${!a ? `<button class="btn sm" data-act="work" data-id="${n.id}"${raided || !G.idleMinions(S).length ? ' disabled' : ''}>Send a ${esc(one)}</button>${!G.idleMinions(S).length && !raided ? '<span class="hint">No idle minions</span>' : ''}` : `<button class="btn sm" data-act="recall" data-id="${n.id}">Call it off</button>`}</div></div></section>`;
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
        return `<div class="brow${lock ? ' locked' : ''}${ui.place && ui.place.k === k ? ' on' : ''}">${img('obj-' + k, 'ticon')}<span class="bname"><b>${esc(D.name)}</b><small>${lock ? `🔒 <button class="lnk" data-act="tower" data-k="talents">Talent in ${esc(lairTree(k))}</button>` : `${esc(G.CREATURES[D.unit].name)} · ${G.lairDays(S, k)} days to build`}</small><span class="prices">${priceChips(G.buildPrice(k))}</span></span>
          <button class="btn sm" data-act="placelair" data-k="${k}"${e ? ' disabled' : ''}>Place</button></div>`;
      }).join('') : '';
      const trip = !many && m.path.length ? `<div class="prow">${pbar(1 - m.path.length / Math.max(m.trip || 0, m.path.length))}<small>on the way</small></div>` : '';
      const list = many ? `<ul class="mjobs">${ms.map(z => `<li><button class="lnk" data-act="selm" data-id="${z.id}">${esc(MT().one)}</button> ${minionJob(z)}</li>`).join('')}</ul>` : `<p>${minionJob(m)}</p>${trip}`;
      const act = (k, label, on, title) => `<button class="mbtn${on ? ' on' : ''}" data-act="m${k}" aria-pressed="${on ? 'true' : 'false'}" title="${esc(title)}">${MICON[k]}<span>${label}</span></button>`;
      const modeHint = ui.place ? `<b>Click open ground</b> you've explored, out of the heroes' sight (the dashed ring), to place the ${esc(G.DUNGEONS[ui.place.k].name)}.` : ui.mode === 'move' ? '<b>Click where to go.</b> A deposit, mine or camp puts them to work there; a half-built lair, to building.' : '';
      return `<section class="panel sel mpanel${ui.place || ui.mode ? ' placing' : ''}">${img(minionIcon(), 'selimg')}<div>${close}<h2 class="cap">${many ? `${ms.length} ${esc(MT().name)}` : esc(MT().one)}</h2>${list}
        <div class="mmenu three">${act('move', 'Move', ui.mode === 'move', 'M: click where to go')}${act('build', 'Build', ui.mbuild, 'B: build a lair')}${act('dance', 'Dance', allJob('dance'), 'Dance')}</div>
        ${modeHint ? `<p class="hint placehint">${modeHint} Right-click or Esc to cancel.</p>` : `<p class="hint mhint">${TOUCHY() ? 'Tap a deposit, mine or camp to put them to work.' : '<b>Right-click</b> is a shortcut: a deposit, mine or camp to work it (one minion each), a half-built lair to help, the tower to go home, anywhere else to walk there.'}</p>`}
        ${ui.mbuild ? `<div class="blist">${lairRows}</div>` : ''}</div></section>`;
    }
    if (sel.type === 'spot') {
      const err = G.spotCheck(S, sel.x, sel.y); const m = G.idleMinions(S).sort((a, b) => Math.hypot(a.x - sel.x, a.y - sel.y) - Math.hypot(b.x - sel.x, b.y - sel.y))[0];
      const days = m && !err ? daysAway(m, sel.x, sel.y) : null; const terr = G.TERRAIN[G.terrainAt(S, sel.x, sel.y)].name;
      const rows = G.lairsFor(S).map(k => {
        const D = G.DUNGEONS[k]; const lock = !G.lairKnown(S, k); const e = G.buildCheck(S, k, sel.x, sel.y); const home = D.home.indexOf(G.terrainAt(S, sel.x, sel.y)) >= 0;
        return `<div class="brow${lock ? ' locked' : ''}">${img('obj-' + k, 'ticon')}<span class="bname"><b>${esc(D.name)}</b><small>${lock ? `🔒 <button class="lnk" data-act="tower" data-k="talents">Talent in ${esc(lairTree(k))}</button>` : `${esc(G.CREATURES[D.unit].name)} · ${G.DUNGEONS[k].tier > 1 ? 'tier ' + D.tier + ' · ' : ''}${G.lairDays(S, k)} days to build${home ? ' · <i class="good">home ground</i>' : ''}`}</small><span class="prices">${priceChips(G.buildPrice(k))}</span></span>
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
        const doing = o.wave ? (o.atGates ? '<b class="warn">At Millbrook\'s gates.</b>' : `Marching on Millbrook${eta !== null ? `: ${eta} night${eta > 1 ? 's' : ''} to the gates` : ', but the way is blocked'}.`) : o.patrol ? `Patrolling between ${esc(G.regionName(S, o.patrol.a[0], o.patrol.a[1]))} and ${esc(G.regionName(S, o.patrol.b[0], o.patrol.b[1]))}.` : o.home ? 'Prowling near their lair.' : 'Standing their ground.';
        const out = o.wave ? G.siegeOutlook(S, o) : null;
        const siege = out ? `<p class="threat t-${esc(String(OUTLOOK_CLS[out.label]).toLowerCase())}"><b>Against Millbrook now: ${esc(out.label)}.</b> ${out.hallDmg ? `About ${out.hallDmg} damage to the hall, if nothing stops them.` : out.wallDmg ? `They'd hack ${out.wallDmg} off the walls.` : 'The towers would cut them down.'}</p>` : '';
        const th = bandThreat(o); const lc = L < 3 ? G.bandLevelCost(o) : null; const lerr = G.bandLevelCheck(S, o);
        const thr = th ? `<p class="threat t-${esc(String(th.label).toLowerCase())}"><b>Against the heroes now: ${esc(th.label)}.</b> ${th.avg !== undefined ? `They'd lose about ${Math.round(Math.min(1, th.avg) * 100)}% of their health.` : ''}</p><p class="hint">${esc(THREAT_TXT[th.label] || '')}</p>` : '<p class="hint">Sizing them up against the heroes…</p>';
        return `<section class="panel sel bpanel${ui.mode === 'patrol' ? ' placing' : ''}">${img('unit-' + o.type, 'selimg')}<div>${close}<h2 class="cap">${esc(G.bandName(o))}${L > 1 ? ` <span class="lv">Lv ${L}</span>` : ''}</h2>
          <p>${from} ${doing}${o.known ? ' The heroes know they\'re here.' : ''}</p>${siege}${thr}
          <div class="mmenu three"><button class="mbtn${ui.mode === 'patrol' ? ' on' : ''}" data-act="bpatrol" title="${o.wave ? 'Stop the march on Millbrook. Click a spot: they patrol between here and there instead' : 'Click a spot: they walk back and forth between here and there'}">${MICON.patrol}<span>Patrol</span></button><button class="mbtn" data-act="blevel"${lerr ? ` disabled title="${esc(lerr)}"` : ` title="+2 to hit, +1 AC, +30% hit points, +1 damage, and a fifth more of them"`}>${MICON.level}<span>Level up${lc ? ` · ${lc.gold} gold` : ''}</span></button><button class="mbtn" data-act="baway" title="They leave the map for good">${MICON.away}<span>Go away</span></button></div>
          ${ui.mode === 'patrol' ? `<p class="hint placehint"><b>Click where they should patrol to</b> (explored ground within ${G.PATROL_RANGE} tiles).${o.wave ? ' They stop marching on Millbrook.' : ''} Right-click or Esc to cancel.</p>` : o.patrol ? '<div class="row"><button class="btn sm" data-act="bhold">Stop patrolling</button></div>' : o.wave ? '<p class="hint">Level them up to hit harder, or right-click the map to make them patrol instead.</p>' : '<p class="hint">Right-click the map to set a patrol.</p>'}${bountyRow({ kind: 'obj', id: o.id })}</div></section>`;
      }
      const name = o.kind === 'dungeon' ? G.DUNGEONS[o.dtype].name : (G.ITEMS[o.kind] || { name: 'Something' }).name;
      return `<section class="panel sel">${img(o.kind === 'dungeon' ? 'obj-' + o.dtype : 'obj-' + o.kind, 'selimg')}<div>${close}<h2 class="cap">${esc(name)}</h2><p class="hint">${o.wild ? 'The world put this here, not you. ' : ''}${o.known ? 'The heroes know it is here.' : 'The heroes haven\'t found it yet.'}</p>${isTrapKind(o.kind) ? '' : bountyRow({ kind: 'obj', id: o.id })}</div></section>`;
    }
    if (sel.type === 'site') {
      const site = G.siteOf(S, sel.id);
      const qable = (site.kind === 'landmark' && !S.visited[site.id]) || site.kind === 'tower';
      return `<section class="panel sel">${img(siteIcon(site), 'selimg')}<div>${close}<h2 class="cap">${esc(site.name)}</h2><p class="hint">${esc(site.text)}</p>${site.kind === 'town' ? '<div class="row"><button class="btn sm" data-act="town">Spy on Millbrook</button></div>' : site.kind === 'tower' ? '<div class="row"><button class="btn sm" data-act="tower">Open the tower</button></div>' : ''}${qable ? bountyRow({ kind: 'site', id: site.id }) : ''}</div></section>`;
    }
    return '';
  }
  function updateSoundBtn() { const b = $('b-sound'); if (!b || !window.SND) return; b.classList.toggle('off', SND.muted); b.setAttribute('aria-pressed', SND.muted ? 'true' : 'false'); b.title = SND.muted ? 'Sound is off. Click to turn it on.' : 'Sound is on. Click to mute (volumes are in Settings).'; }
  function renderSide() {
    const el = $('sidebody'); if (!el || !S) return;
    syncAudio(); lootCheck(!ui.items); talentNews();
    const keep = el.scrollTop; const P = S.party;
    clampComp();
    const waiting = S.heroes.filter(h => h.status === 'waiting');
    const nl = G.builtLairs(S).length; const nb = towerBadge();
    const goal = S.march ? 'the Dark Tower, for the final showdown' : P.goal ? P.goal : 'nowhere yet';
    el.innerHTML = `
      <section class="panel"><div class="heroes">${S.heroes.map(heroRow).join('')}</div>
        <div class="phead"><p class="heading" title="${esc(P.intent.join(' '))}"><span class="k">Heading for</span> <b>${esc(goal)}</b></p><button class="partybtn" data-act="party" title="All four heroes side by side: health, damage, skills and artifacts (P)">Party<kbd>P</kbd></button></div>
        ${waiting.length ? `<p class="hint">${waiting.map(h => esc(h.name)).join(' and ')} wait${waiting.length > 1 ? '' : 's'} at the Millbrook tavern to join the party.</p>` : ''}</section>
      <div id="selwrap">${selPanel()}</div>
      <button class="towerbtn" data-act="tower">${img(siteIcon({ id: 'tower' }), 'cicon')}<span><b>Your tower</b><small>${nl} lair${nl === 1 ? '' : 's'} · ${S.minions.length} ${esc(MT().name.toLowerCase())}${nb ? ` · ${nb} idle` : ''}${(S.summons || []).length ? ` · ${S.summons.length} summoning` : ''}${G.talentFree(S) ? ` · <b class="gold">${G.talentFree(S)} talent point${G.talentFree(S) > 1 ? 's' : ''}</b>` : ''}${S.base.libBuild ? ' · library going up' : ''}</small></span>${G.talentFree(S) ? `<i class="badge pts" title="Talent points to spend">${G.talentFree(S)}</i>` : nb ? `<i class="badge">${nb}</i>` : ''}</button>
      ${S.town ? townBtn() : ''}
      ${nb ? `<button class="idlebtn" data-act="nextidle" title="Select the next idle one (I). Shift-click or Shift+I selects them all.">${img(minionIcon(), 'cicon')}<span><b>${nb} idle ${esc((nb === 1 ? MT().one : MT().name).toLowerCase())}</b><small>Select ${nb === 1 ? 'it' : 'the next one'} and give orders</small></span><kbd>I</kbd></button>` : ''}`;
    el.scrollTop = keep;
    if (ui.scrollTo) { const t = $('selwrap'); if (t && t.firstElementChild) el.scrollTop = Math.max(0, t.offsetTop - el.offsetTop - 4); ui.scrollTo = null; }
    const btn = $('endday');
    if (btn) { btn.disabled = ui.moving || S.phase !== 'map' || !!ui.fair; btn.querySelector('span').textContent = ui.night ? 'Night falls…' : ui.moving ? 'Travelling…' : 'End day'; }
    if (ui.screen) renderScreen();
    renderBar();
  }
  // the sidebar's Millbrook card: its walls and hall, what it's building, and any bounty on your lairs
  function townBtn() {
    const T = S.town; const wm = G.WALL_HP[G.townLv(S, 'walls')] || 0; const hm = G.hallMax(S); const nq = S.quests.filter(q => q.status === 'open').length;
    const gates = S.objects.filter(o => o.wave && o.atGates).length;
    const doing = T.build ? `building ${T.build.k === 'walls' ? G.TOWN_B.walls.names[G.townLv(S, 'walls')].toLowerCase() : G.TOWN_B[T.build.k].name.toLowerCase()}` : 'saving up';
    return `<button class="towerbtn townbtn" data-act="town" title="Spy on Millbrook: its defences, its buildings and the bounties on your lairs">${img('obj-town', 'cicon')}<span><b>Millbrook</b><small>${esc(G.wallName(S))} ${Math.round(T.wallHp)}/${wm} · hall ${Math.round(T.hall)}/${hm} · ${esc(doing)}${nq ? ` · ${nq} bount${nq > 1 ? 'ies' : 'y'} on you` : ''}</small>${hpBar(T.hall, hm, 'hall')}</span>${gates ? `<i class="badge" title="${gates} wave${gates > 1 ? 's' : ''} at the gates">${gates}</i>` : ''}</button>`;
  }
  // the villain's level and the Infamy to the next one
  function villainXpHtml() {
    const L = G.villainLevel(S); const lo = G.VXP[L] || 0, hi = G.villainNext(S); const xp = S.villain.xp || 0;
    return `<div class="vxp"><span class="k">Infamy</span>${hpBar(hi ? xp - lo : 1, hi ? hi - lo : 1, 'inf')}<small>${hi ? `${Math.floor(xp)} / ${hi} to level ${L + 1}` : `${Math.floor(xp)}, the highest level there is`}</small></div>`;
  }
  function renderBar() {
    if (!S) return;
    for (const k of G.RES_KEYS) { const e = $('b-' + k); if (e) e.textContent = Math.floor(S.res[k] || 0); const t = $('b-m' + k); if (t) t.textContent = Math.floor((S.town && S.town.res[k]) || 0); }
    { const tp = $('b-tpic'); const key = siteIcon({ id: 'tower' }); if (tp && A.URI[key] && tp.dataset.k !== key) { tp.src = A.URI[key]; tp.dataset.k = key; } }
    { const tb = $('b-townbusy'); if (tb) { const B = S.town && S.town.build; tb.hidden = !B; if (B) tb.title = `Building: ${G.TOWN_B[B.k].name}, ${B.days} day${B.days > 1 ? 's' : ''} left`; } }
    { const L = G.villainLevel(S); const lo = G.VXP[L] || 0, hi = G.villainNext(S); const xp = S.villain.xp || 0;
      $('b-vlv').textContent = 'Lv ' + L; $('b-inf').textContent = hi ? `${Math.floor(xp)}/${hi}` : Math.floor(xp);
      $('b-infbar').style.width = (hi ? Math.max(0, Math.min(1, (xp - lo) / (hi - lo))) * 100 : 100).toFixed(0) + '%';
      $('g-inf').title = `${VN()} is level ${L}. ${hi ? `${Math.ceil(hi - xp)} more Infamy to level ${L + 1}.` : 'The highest level there is.'} Hurting and killing heroes, breaking into Millbrook, plunder and every lair you keep standing earn Infamy. Each level makes your villain stronger on the throne and gives a talent point.`; }
    $('b-date').textContent = `Week ${S.week} · Day ${S.day}`;
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
    if (!S || S.phase !== 'map' || G.attackCheck(S) || ui.moving) return;
    clampComp();
    /* war parties are gone: the heroes find your monsters on the map */
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
  const TOWER_TABS = [['view', 'View'], ['tower', 'Tower'], ['talents', 'Talents'], ['lairs', 'Lairs'], ['villain', 'Villain']];
  function scrTower() {
    if (ui.towerTab === 'research') ui.towerTab = 'talents';
    const tab = ui.towerTab || 'view'; const nl = G.myLairs(S).length; const ns = (S.summons || []).length; const tf = G.talentFree(S);
    const badge = { tower: ns ? `<i class="tb busy" title="${ns} being summoned">${ns}</i>` : '', talents: tf ? `<i class="tb pts" title="${tf} talent point${tf > 1 ? 's' : ''} to spend">${tf}</i>` : '', lairs: nl ? `<i class="tb">${nl}</i>` : '', villain: '', view: '' };
    const tabs = `<nav class="ttabs" role="tablist">${TOWER_TABS.map(([k, n]) => `<button class="ttab${k === tab ? ' on' : ''}" role="tab" aria-selected="${k === tab}" data-act="ttab" data-k="${k}">${n}${badge[k]}</button>`).join('')}</nav>`;
    if (tab === 'view') return `${tabs}<div class="tvslot"></div>`;
    const body = tab === 'talents' ? towerTalents() : tab === 'lairs' ? towerLairs() : tab === 'villain' ? towerVillain() : towerHome();
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
    return `<p class="hint">${lib ? `Your scholars have given you ${lib > 1 ? 'two talent points' : 'a talent point'}.` : 'Not built yet. Each level is one more talent point to spend.'}</p>
        ${S.base.libBuild ? `<div class="prow">${pbar(1 - S.base.libBuild.days / S.base.libBuild.total, 'build')}<small>${lib ? 'New wing going up' : 'Going up'}: ${S.base.libBuild.days} day${S.base.libBuild.days > 1 ? 's' : ''} left</small></div>`
          : lib < 2 ? `<div class="row"><button class="btn sm" data-act="library"${lerr ? ' disabled' : ''}>${lib ? 'Expand' : 'Build'} · +1 talent point · ${G.LIBRARY_DAYS[lib + 1]} nights</button>${priceChips(G.LIBRARY[lib + 1])}</div>` : '<p class="hint">Fully expanded.</p>'}`;
  }
  function towerHome() {
    const mt = MT(); const d = S.lastDay; const tf = G.talentFree(S);
    return `<div class="tgrid">
      <section class="tcard"><h2 class="cap">${esc(mt.name)}</h2>${summonCard()}</section>
      <section class="tcard"><h2 class="cap">Talents</h2><p class="hint">${tf ? `<b class="gold">${tf} talent point${tf > 1 ? 's' : ''}</b> to spend.` : 'No points to spend right now.'} ${G.talentSpent(S)} spent so far. Every level ${esc(VN())} gains gives you another.</p>
        <div class="row"><button class="btn sm${tf ? ' big' : ''}" data-act="ttab" data-k="talents">Open the talents</button></div></section>
      <section class="tcard"><h2 class="cap">The Forbidden Library</h2>${libraryCard()}</section>
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
  function tTip(k) {
    const T = G.TALENTS[k]; const I = tInfo(k);
    let t = `${tLabel(k, Math.min(I.max, I.have + (I.have < I.max ? 1 : 0)))}: ${G.talentText(k)}`;
    if (T.lair) { const D = G.DUNGEONS[k]; t += ` About ${D.rate} a night. To build: ${G.priceText(G.buildPrice(k))}, ${G.lairDays(S, k)} days of work.`; }
    if (I.max > 1) t += ` (rank ${I.have} of ${I.max})`;
    if (I.err && I.st !== 'maxed') t += ` ${I.err}`;
    return t;
  }
  function tNode(k) {
    const I = tInfo(k); const T = G.TALENTS[k];
    const pips = I.max > 1 ? `<span class="tpips">${Array.from({ length: I.max }, (_, i) => `<i class="${i < I.have ? 'on' : ''}"></i>`).join('')}</span>` : '';
    return `<button class="tnode ${I.st}${T.lair ? ' lair' : ''}" data-act="talent" data-k="${k}"${I.st === 'avail' ? '' : ' aria-disabled="true"'} title="${esc(tTip(k))}">
      ${img(talentIcon(k), 'tni')}<span class="tnt"><b>${esc(G.talentName(k))}</b><small>${T.lair ? 'New lair' : T.power ? 'Dark power' : esc(I.max > 1 ? `${I.have} / ${I.max}` : I.have ? 'Learned' : '1 rank')}</small></span>${pips}</button>`;
  }
  function tTree(id) {
    const TR = G.TREES[id]; const spent = G.spentIn(S, id); const ks = G.talentsIn(id); const own = !!TR.villain;
    const rows = G.TIER_NEED.map((need, t) => {
      const here = ks.filter(k => G.TALENTS[k].tier === t); if (!here.length) return '';
      const open = spent >= need;
      return `<div class="trow${open ? '' : ' shut'}"><span class="tneed" title="${open ? 'Open' : `Spend ${need - spent} more point${need - spent > 1 ? 's' : ''} in this tree to open this row`}">${need ? (open ? need : `${G.roman(t + 1)} · ${need}`) : '·'}</span><div class="tnodes">${here.map(tNode).join('')}</div></div>`;
    }).join('');
    return `<section class="ttree${own ? ' own' : ''}"><header><h3>${esc(TR.name)}</h3><b class="tspent" title="Points spent in this tree">${spent}</b></header><p class="hint">${esc(TR.blurb)}${own ? ` Only ${esc(VT().label === 'Lich' ? 'the Lich' : 'the ' + VT().label)} has it.` : ''}</p>${rows}</section>`;
  }
  function towerTalents() {
    const tf = G.talentFree(S), earned = G.talentEarned(S), spent = G.talentSpent(S); const T = S.talents || {};
    const lv = Math.max(0, G.villainLevel(S) - 1); const lib = G.libraryLevel(S);
    const rerr = G.resetCheck(S); const L = G.villainLevel(S), lo = G.VXP[L] || 0, hi = G.villainNext(S), xp = S.villain.xp || 0;
    const head = `<section class="tcard thead"><div class="tpts${tf ? ' has' : ''}"><b>${tf}</b><span>talent point${tf === 1 ? '' : 's'}<br>to spend</span></div>
      <div class="tsrc"><p class="hint">${earned} earned: 1 to start, ${lv} from ${esc(VN())}'s levels${lib ? `, ${lib} from the Library` : ''}${G.talentFx(S).points ? `, ${G.talentFx(S).points} from your own talents` : ''}. A row opens once enough points are spent in its tree.</p>
        <div class="tinf" title="Hurting and killing heroes, breaking into Millbrook, plunder and every lair you keep standing earn Infamy. Every level is another talent point."><span>Infamy</span>${pbar(hi ? (xp - lo) / (hi - lo) : 1, 'summon')}<small>${hi ? `${Math.floor(xp)} / ${hi} to level ${L + 1}` : `level ${L}, the highest`}</small></div></div>
      <div class="treset"><button class="btn sm" data-act="treset"${rerr ? ' disabled' : ''} title="${esc(rerr || 'Get every point back to spend again. Lairs already built keep working.')}">Unlearn all</button><small>free once a week</small></div></section>`;
    return head + `<div class="ttrees">${G.talentTrees(S).map(tTree).join('')}</div>`;
  }
  function towerLairs() {
    const rows = G.myLairs(S).map(o => {
      const D = G.DUNGEONS[o.dtype]; const wr = G.lairWrecked(S, o); const bands = G.bandsOf(S, o); const tot = o.buildTotal || G.buildDays(o.dtype);
      const st = o.building ? `<div class="prow">${pbar(1 - o.building / tot, 'build')}<small>going up, ${o.building} of ${tot} days left</small></div>` : wr ? `<p class="hint warn">Wrecked by the heroes: rebuilt in ${o.wrecked - G.dayIndex(S)} days.</p>` : `<p class="hint">${G.lairCount(o)} ${esc(G.CREATURES[D.unit].name.toLowerCase())} at home${G.wavesOf(S, o) ? ', a wave on the road' : ''}${bands - G.wavesOf(S, o) > 0 ? `, ${bands - G.wavesOf(S, o)} band${bands - G.wavesOf(S, o) > 1 ? 's' : ''} out` : ''}.${G.questOn(S, { kind: 'obj', id: o.id }) ? ' <b class="warn">Millbrook has a bounty on it.</b>' : ''}</p>`;
      return `<div class="lcard">${img(o.building ? 'obj-building' : wr ? 'obj-wrecked' : 'obj-' + o.dtype, 'licon')}<div><b>${esc(D.name)}${(o.level || 1) > 1 ? ' II' : ''}</b><small>${esc(G.regionName(S, o.x, o.y))}</small>${st}</div><button class="btn sm" data-act="sellair" data-id="${o.id}">Show</button></div>`;
    }).join('');
    return `<section class="tcard"><h2 class="cap">Your lairs</h2><p class="hint">To build one, select a minion on the map and pick Build. New kinds of lair come from talents: The Brood, and your villain's own path.</p>${rows ? `<div class="lcards">${rows}</div>` : '<p class="hint">No lairs yet.</p>'}</section>`;
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
      <section class="tcard"><h2 class="cap">Dark powers</h2><p class="hint">Talents in the Dread tree. They make the final fight harder, and more memorable.</p><ul class="plain dpw">${dark}</ul>
        <div class="row"><button class="btn sm" data-act="ttab" data-k="talents">Talents</button></div></section>
    </div>`;
  }
  /* ============ Millbrook: the heroes' town. The game runs it now (0.30); you can only spy on it ============ */
  const TOWN_TABS = [['view', 'View'], ['defence', 'Defences'], ['build', 'Buildings'], ['quests', 'Bounties']];
  const TOWN_ICON = { market: 'obj-tourney', sawmill: 'obj-node-lumber', ironworks: 'obj-mine', smith: 'obj-wrecked', temple: 'obj-shrine', guild: 'obj-tower-archmage', yard: 'obj-den', tavern: 'obj-woods', walls: 'obj-camp', watch: 'obj-peaks', ballista: 'obj-wrecked', arcane: 'obj-t-guild', bell: 'obj-shrine' };
  // a building's own picture once art/objects has one (obj-t-market...), the nearest stand-in until then
  const townIcon = k => { const l = Math.max(1, S ? G.townLv(S, k) : 1); for (let i = l; i >= 2; i--) if (ART.keys['obj-t-' + k + '-' + i]) return 'obj-t-' + k + '-' + i; return ART.keys['obj-t-' + k] ? 'obj-t-' + k : k === 'walls' && l >= 2 ? 'obj-hold' : TOWN_ICON[k]; };
  // levels that add up (the smith's +1 hit stays when the armour comes), and levels that replace the one before
  const TOWN_STACKS = { smith: 1, temple: 1, guild: 1 };
  const townBName = k => k === 'walls' ? G.TOWN_B.walls.names[Math.max(0, G.townLv(S, 'walls') - 1)] : G.TOWN_B[k].name;
  const OUTLOOK_CLS = { Crushed: 'Trivial', Repelled: 'Easy', 'Breaks in': 'Tense', 'Sacks the town': 'Deadly' };
  function scrTown() {
    const tab = ui.townTab === 'build' || ui.townTab === 'quests' || ui.townTab === 'defence' ? ui.townTab : ui.townTab === 'view' ? 'view' : 'view';
    const nq = S.quests.filter(q => q.status === 'open').length; const gates = S.objects.filter(o => o.wave && o.atGates).length;
    const badge = { build: S.town.build ? '<i class="tb busy" title="Building">1</i>' : '', defence: gates ? `<i class="tb idle" title="At the gates">${gates}</i>` : '', quests: nq ? `<i class="tb">${nq}</i>` : '', view: '' };
    const tabs = `<nav class="ttabs" role="tablist">${TOWN_TABS.map(([k, n]) => `<button class="ttab${k === tab ? ' on' : ''}" role="tab" aria-selected="${k === tab}" data-act="ztab" data-k="${k}">${n}${badge[k]}</button>`).join('')}</nav>`;
    if (tab === 'view') return `${tabs}<div class="tvslot"></div>`;
    return `${tabs}<div class="tpanel z-${tab}">${tab === 'quests' ? townQuests() : tab === 'defence' ? townDefences() : townBuildings()}</div>`;
  }
  const hpBar = (v, max, cls) => `<span class="hpline ${cls || ''}"><i style="width:${(max ? Math.max(0, Math.min(1, v / max)) * 100 : 0).toFixed(0)}%"></i></span>`;
  // the waves on the map you can see, soonest at the gates first
  function wavesInSight() {
    return S.objects.filter(o => o.kind === 'stack' && o.wave && canSeeObj(o)).map(o => ({ o, eta: G.waveEta(S, o), out: G.siegeOutlook(S, o) })).sort((a, b) => (a.eta === null ? 99 : a.eta) - (b.eta === null ? 99 : b.eta));
  }
  function townDefences() {
    const T = S.town; const wl = G.townLv(S, 'walls'); const wm = G.WALL_HP[wl] || 0; const hm = G.hallMax(S);
    const W = wavesInSight();
    const wrow = ({ o, eta, out }) => `<div class="qrow">${img('unit-' + o.type, 'ticon')}<span><b>${esc(G.bandName(o))}${(o.lvl || 1) > 1 ? ` · Lv ${o.lvl}` : ''}</b><small>${o.atGates ? '<b class="warn">At the gates</b>' : eta === null ? 'No way through' : `${eta} night${eta > 1 ? 's' : ''} to the gates`}${o.atGates && G.partyHome(S) ? ' · the heroes will man the walls' : ''}</small></span><span class="est ${OUTLOOK_CLS[out.label]}" title="${esc(`If it reached the gates now: it would kill ${out.killed} of them${out.wallDmg ? `, hack ${out.wallDmg} off the walls` : ''}${out.hallDmg ? `, and do ${out.hallDmg} damage to the hall` : ''}.`)}">${esc(out.label)}</span><button class="lnk" data-act="qshow" data-rk="obj" data-rid="${esc(o.id)}">show</button></div>`;
    const last = (S.log || []).filter(l => /attack Millbrook|batter Millbrook|sack Millbrook/.test(l.t)).slice(-4).reverse();
    const cards = G.DEF_ORDER.map(townCard).join('');
    return `<div class="tgrid two">
      <section class="tcard"><h2 class="cap">The walls and the hall</h2>
        <p><b>${esc(G.wallName(S))}</b> ${Math.round(T.wallHp)} / ${wm}</p>${hpBar(T.wallHp, wm, 'wall')}
        <p><b>The hall</b> ${Math.round(T.hall)} / ${hm}</p>${hpBar(T.hall, hm, 'hall')}
        <p class="hint">Your waves have to break the walls before they can sack the town (flyers go straight over). Sacking damages the hall, plunders the purse and burns buildings down a level. <b>If the hall falls, Millbrook is razed and you win.</b> The town patches its walls a fifth of the way and its hall a little every day.</p></section>
      <section class="tcard"><h2 class="cap">Waves on the road</h2>${W.map(wrow).join('') || '<p class="hint">None of your waves are in sight. When a lair is full, it sends one down the road to Millbrook.</p>'}
        <p class="hint">How each would do against the town as it stands: Crushed, Repelled, Breaks in, or Sacks the town.</p>
        ${last.length ? `<h3 class="cap sm">Lately</h3><ul class="plain log">${last.map(l => `<li><small>W${l.w} D${l.d}</small> ${esc(l.t)}</li>`).join('')}</ul>` : ''}</section>
    </div>
    <section class="rsec"><h3>Defences</h3><p class="hint">Millbrook builds these against whatever has been hurting it: ballistas against brutes, the arcane tower against swarms, the bell against the undead.</p><div class="towncards">${cards}</div></section>`;
  }
  function townBuildings() {
    const T = S.town; const inc = G.townIncome(S); const B0 = T.build; const d = S.lastDay && S.lastDay.town;
    const now = B0 ? `<div class="prow rnow">${img(townIcon(B0.k), 'ticon')}<b>${esc(B0.k === 'walls' ? G.TOWN_B.walls.names[G.townLv(S, 'walls')] : G.TOWN_B[B0.k].name + (G.townLv(S, B0.k) ? ' ' + G.roman(G.townLv(S, B0.k) + 1) : ''))}</b>${pbar(1 - B0.days / B0.total, 'build')}<small>${B0.days} day${B0.days > 1 ? 's' : ''} left</small></div>`
      : '<p class="hint">The builders are idle: Millbrook is saving up for its next building.</p>';
    const cards = G.TOWN_ORDER.map(townCard).join('');
    return `<div class="tgrid two">
      <section class="tcard"><h2 class="cap">The town's purse</h2>${purseHtml('town')}<p>Every day: <b>${esc(G.priceText(inc))}</b>.</p><p class="hint">Taxes bring ${esc(G.priceText(G.TOWN_TAX))} a day; the market, sawmill and ironworks add more. The heroes bring home a share of the loot from every fight they win. Your waves plunder it when they break in${d && d.built ? `. Finished last night: the ${esc(townBName(d.built))}` : ''}.</p></section>
      <section class="tcard"><h2 class="cap">Builders</h2>${now}<p class="hint">Millbrook decides for itself: trade first, then the heroes' buildings, and walls and towers whenever your waves have been getting through.</p></section>
    </div>
    <section class="rsec"><h3>Buildings</h3><p class="hint">What makes the town money, and what makes its heroes stronger. Their effects show on the heroes' sheets.</p><div class="towncards">${cards}</div></section>`;
  }
  function townCard(k) {
    const B = G.TOWN_B[k]; const l = G.townLv(S, k); const T = S.town; const busy = T.build && T.build.k === k;
    const eff = i => B.levels ? B.levels[i] : `+${G.priceText(B.income[i])} a day`;
    const pips = Array.from({ length: B.max }, (_, i) => `<i class="${i < l ? 'on' : busy && i === l ? 'up' : ''}"></i>`).join('');
    const have = l ? `<p class="have"><span class="k">Now</span> ${esc(cap1(TOWN_STACKS[k] ? B.levels.slice(0, l).join('; ') : eff(l - 1)))}</p>` : '';
    const next = l < B.max ? `<p class="next"><span class="k">${l ? 'Next' : 'Could build'}</span> ${esc(cap1(eff(l)))} <span class="prices">${priceChips(G.townCost(S, k), 'town')}</span></p>` : '';
    const need = Object.keys(B.needs || {}).find(n => G.townLv(S, n) < B.needs[n]);
    const ctrl = busy ? `<div class="prow">${pbar(1 - T.build.days / T.build.total, 'build')}<small>going up: ${T.build.days} day${T.build.days > 1 ? 's' : ''} left</small></div>`
      : l >= B.max ? '<p class="hint">Fully built.</p>' : need ? `<p class="hint">Needs the ${esc(G.TOWN_B[need].name)} first.</p>` : '';
    const nm = k === 'walls' ? (l ? B.names[l - 1] : 'No walls') : B.name + (l ? ' ' + G.roman(l) : '');
    return `<div class="tbcard${l ? ' built' : ''}${busy ? ' busy' : ''}">${img(townIcon(k), 'licon')}<div><h4>${esc(nm)}<span class="pips" title="Level ${l} of ${B.max}">${pips}</span></h4><p class="hint">${esc(B.text)}</p>${have}${next}${ctrl}</div></div>`;
  }
  const cap1 = t => t ? t[0].toUpperCase() + t.slice(1) : t;
  // the bounty line on a map card: Millbrook has put a price on it
  function bountyRow(ref) {
    if (!S.town || S.phase !== 'map') return '';
    const q = G.questOn(S, ref);
    return q ? `<p class="bounty on">${img('obj-quest', 'ric')}<span>Millbrook has put a bounty on it: <b>${esc(G.rewardText(S, q.reward))}</b> for the heroes.</span></p>` : '';
  }
  function townQuests() {
    const open = S.quests.filter(q => q.status === 'open');
    const rows = open.map(q => { const t = G.refTarget(S, q.ref);
      return `<div class="qrow">${img('obj-quest', 'ticon')}<span><b>${esc(q.name)}</b><small>${esc(G.rewardText(S, q.reward))} · lapses at the end of the week</small></span>${t && t.x !== undefined ? `<button class="btn sm" data-act="qshow" data-rk="${q.ref.kind}" data-rid="${esc(String(q.ref.id))}">Show</button>` : ''}</div>`; }).join('');
    return `<div class="tgrid two">
      <section class="tcard"><h2 class="cap">On the board · ${open.length}</h2>${rows || '<p class="hint">No bounties posted.</p>'}</section>
      <section class="tcard"><h2 class="cap">What it means</h2><p class="hint">When your waves hurt Millbrook, the survivors' tracks lead back to their lair, and the town puts a price on it. A bounty pulls the heroes toward that lair, and pays them in experience when they wreck it. Guard it, or let them come.</p></section>
    </div>`;
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
  // stand-ins until PixelLab has drawn each building (pixellab_gen.py objects t-market ...)
  const TOWN_STAND = { market: 'tourney', sawmill: 'node-lumber', ironworks: 'mine', smith: 'wrecked', temple: 'shrine', guild: 'tower-archmage', yard: 'den', tavern: 'woods' };
  // Millbrook: [x, z, width] on its 18 x 11 ground, the hall in the middle of the valley, the square in front of it
  const MB_AT = { temple: [2.5, 2.8, 2.6], ironworks: [5.7, 1.6, 2.4], guild: [13.4, 2.0, 1.9], sawmill: [16.0, 4.9, 2.6], smith: [4.6, 5.6, 2.6], market: [6.4, 8.9, 3.1], tavern: [12.7, 7.9, 3.1], yard: [1.9, 8.7, 3.0] };
  const MB_HALL = [9.3, 3.3], HALL_W = [3.2, 3.7, 4.2, 4.7, 5.2], MB_BOARD = [11.0, 5.2];
  // 0.30: Millbrook's defences. The gate stands on the road at the front of the valley, the towers beside it
  const MB_DEF = { walls: [9.0, 10.5, 2.4], watch: [11.5, 10.3, 1.25], ballista: [6.6, 10.5, 1.3], arcane: [16.6, 2.3, 1.5], bell: [4.6, 3.9, 0.9] };
  const DEF_STAND = { walls: 'camp', watch: 'peaks', ballista: 'wrecked', arcane: 't-guild', bell: 'shrine' };
  // PixelLab's buildings all share one pixel size, so a bigger level is a bigger picture: world units per pixel
  const TOWN_UPP = 0.026;
  const artW = k => (ART.size['obj-' + k] || [0])[0];
  const MB_SQUARE = [[8.2, 6.6], [9.0, 6.9], [9.8, 6.6], [9.0, 6.1]];
  // the Dark Tower: the tower in the middle, its works around a dark yard
  const DT_AT = { library: [4.3, 3.3, 2.9], vigor: [6.1, 7.5, 1.9], raise: [14.8, 3.5, 2.9], dread: [2.4, 6.3, 1.3], ritual: [11.8, 6.0, 1.6], masons: [3.3, 9.2, 2.8], hands: [15.6, 9.1, 2.3] };
  const DT_MAIN = [9, 3.3], TOWER_W = [2.5, 2.9, 3.3, 3.7, 4.1], DT_CIRCLE = [13.4, 7.2], DT_TREASURY = [12.0, 9.6];
  const DT_STAND = { library: 'keep', vigor: 'abyss', raise: 'camp', dread: 'omen', ritual: 'artifact', masons: 'building', hands: 'node-ore' };
  const DT_NAME = { library: 'Forbidden Library', vigor: 'Blood Fountain', raise: 'Barracks', dread: 'Black Obelisk', ritual: 'Ritual Altar', masons: "Masons' Yard", hands: 'Storehouse' };
  const DT_RES = { vigor: 'vigor', raise: 'raise', dread: 'dread', ritual: 'ritual', masons: 'masons', hands: 'hands' };
  const VPAL = { lich: { glow: '#7dff8a', pool: '#1f5a2a', fog: '#1c2620', sun: '#d0ffd8', cloth: '#2e6a3a' }, dragon: { glow: '#ff8a2a', pool: '#c84a10', fog: '#2a1a14', sun: '#ffb070', cloth: '#8a2a12' },
    demon: { glow: '#ff3a2a', pool: '#a01a10', fog: '#281414', sun: '#ff9a80', cloth: '#7a1414' }, archmage: { glow: '#6ab4ff', pool: '#1c3c8a', fog: '#161e2c', sun: '#c0d8ff', cloth: '#24408a' },
    vampire: { glow: '#ff2a5a', pool: '#6a0a1a', fog: '#22141a', sun: '#ffa8b8', cloth: '#6a0a22' }, deathknight: { glow: '#9ab0c8', pool: '#20262e', fog: '#1a1c22', sun: '#d8e0ec', cloth: '#2a3040' } };
  const vpal = () => VPAL[(S.villain && S.villain.type) || 'lich'] || VPAL.lich;
  const plotsOut = at => Object.values(at).map(([x, z, w]) => [x, z, (w || 2) * 0.62]);
  // the scenery, built once when the view opens
  function viewSpec(kind) {
    if (kind === 'town') return { kind, seed: S.seed + 11, road: [[9, 18], [9, 12], [9, 7.6]], plaza: { x: 9, z: 6.3, r: 2.1 },
      paths: [[[7.2, 6.3], [5.2, 6.1], [2.7, 3.4]], [[10.7, 6.9], [12.4, 8.1]], [[7.6, 7.3], [6.5, 8.8], [2.4, 9.0]], [[10.6, 5.7], [13.2, 2.6]], [[10.9, 6.3], [15.6, 5.2]]],
      pond: { x: 15.6, z: 9.5, rx: 2.0, rz: 1.2 }, mounds: [{ x: 2.5, z: 2.5, r: 2.7, h: 0.6 }],
      keepOut: plotsOut(MB_AT).concat(plotsOut(MB_DEF), [[MB_HALL[0], MB_HALL[1], 2.6], [MB_BOARD[0], MB_BOARD[1], 0.6]]) };
    const P = vpal();
    return { kind, seed: S.seed + 23, road: [[9, 18], [9, 12], [9, 6.8]], plaza: { x: 9, z: 5.9, r: 2.0 }, paths: [[[7.3, 5.6], [4.6, 4.2]], [[10.6, 5.6], [14.4, 4.2]], [[10.6, 6.6], [13.0, 7.3]], [[9.6, 9.3], [11.6, 9.7]]],
      pond: { x: 5.2, z: 9.9, rx: 1.7, rz: 1.0, color: P.pool, glow: P.glow }, fog: P.fog, sun: P.sun, glow: P.glow, glowAt: [9, 4.6],
      keepOut: plotsOut(DT_AT).concat([[DT_MAIN[0], DT_MAIN[1], 2.4], [DT_CIRCLE[0], DT_CIRCLE[1], 1.6], [DT_TREASURY[0], DT_TREASURY[1], 1.0]]) };
  }
  // a cloth banner with a monster on it, for each kind of lair you know
  const BANNERS = {};
  function bannerCanvas(type) {
    const P = vpal(); const key = type + P.cloth; if (BANNERS[key]) return BANNERS[key];
    const cv = document.createElement('canvas'); cv.width = 24; cv.height = 52; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#2a1c12'; c.fillRect(11, 0, 2, 52); c.fillStyle = '#c8a040'; c.fillRect(10, 0, 4, 2);
    c.fillStyle = P.cloth; c.fillRect(2, 4, 20, 28); c.beginPath(); c.moveTo(2, 32); c.lineTo(12, 38); c.lineTo(22, 32); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(2, 4, 20, 2); c.fillStyle = '#d8b050'; c.fillRect(2, 6, 20, 1);
    const im = A.IMG['unit-' + type]; if (im) c.drawImage(im, 4, 10, 16, 16);
    return (BANNERS[key] = cv);
  }
  // what stands where right now, and who's about
  function viewItems() {
    const kind = ui.viewKind; if (!kind || !S) return null;
    const items = [], figs = []; const hov = ui.tvHover, sel = ui.tvSel;
    const add = o => { o.hi = o.id === hov || o.id === sel; items.push(o); };
    const now = performance.now() / 1000;
    if (kind === 'town') {
      const st = G.hallStage(S); const ha = levelArt('t-hall', st.stage, 'town');
      const hw = ha.art.indexOf('t-hall') === 0 && artW(ha.art) ? artW(ha.art) * TOWN_UPP * (ha.own ? 1 : 1 + 0.1 * (st.stage - 1)) : HALL_W[st.stage - 1];
      add({ id: 'hall', mode: 'built', art: ha.art, x: MB_HALL[0], z: MB_HALL[1], w: hw, smoke: true, smokeAt: [0.28, 0.9] });
      add({ id: 'board', mode: 'built', art: hasArt('t-board') ? 't-board' : 'quest', x: MB_BOARD[0], z: MB_BOARD[1], w: hasArt('t-board') ? artW('t-board') * TOWN_UPP * 0.55 : 0.6 });
      const B = S.town.build;
      for (const k of G.TOWN_ORDER) {
        const [x, z, w0] = MB_AT[k]; const l = G.townLv(S, k); const going = B && B.k === k;
        const lv = going ? l + 1 : Math.max(1, l); const a = levelArt('t-' + k, lv, TOWN_STAND[k]);
        const real = a.art.indexOf('t-') === 0 && artW(a.art); const w = real ? artW(a.art) * TOWN_UPP * (a.own ? 1 : 1 + 0.1 * (lv - 1)) : w0 * (STAND_W[a.art] || 1) * (1 + 0.1 * (lv - 1));
        if (going) add({ id: k, mode: 'site', art: a.art, x, z, w, p: 1 - B.days / B.total });
        else if (l) add({ id: k, mode: 'built', art: a.art, x, z, w, smoke: k === 'smith' || k === 'ironworks' || k === 'tavern', smokeAt: k === 'tavern' ? [0.25, 0.92] : [-0.15, 0.8] });
        else add({ id: k, mode: 'plot', art: a.art, x, z, w });
      }
      // 0.30: the walls and towers Millbrook has raised against you (no empty plots: you can't build them)
      for (const k of G.DEF_ORDER) {
        const [x, z, w0] = MB_DEF[k]; const l = G.townLv(S, k); const going = B && B.k === k; if (!l && !going) continue;
        const lv = going ? l + 1 : l; const stand = k === 'walls' && lv >= 2 ? 'hold' : DEF_STAND[k]; const a = levelArt('t-' + k, lv, stand);
        const real = a.art.indexOf('t-') === 0 && artW(a.art) && a.art !== 't-guild'; const w = real ? artW(a.art) * TOWN_UPP * (a.own ? 1 : 1 + 0.1 * (lv - 1)) : w0 * (1 + 0.1 * (lv - 1));
        if (going) add({ id: k, mode: 'site', art: a.art, x, z, w, p: 1 - B.days / B.total }); else add({ id: k, mode: 'built', art: a.art, x, z, w });
      }
      // the heroes stand in the square while they're in town; new recruits wait outside the tavern
      const tw = G.siteOf(S, 'town'); const home = S.party.x === tw.x && S.party.y === tw.y;
      if (home) S.heroes.filter(h => h.status === 'ok').forEach((h, i) => { const p = MB_SQUARE[i % 4]; figs.push({ id: 'h-' + h.id, key: Models.defineHero(h), tok: A.ensureHero(h), x: p[0], z: p[1], s: 1.6, face: Math.sin(now * 0.3 + i) * 0.5, bob: false }); });
      S.heroes.filter(h => h.status === 'waiting').forEach((h, i) => figs.push({ id: 'w-' + h.id, key: Models.defineHero(h), tok: A.ensureHero(h), x: 11.6 + i * 0.6, z: 9.0, s: 1.5, face: 0.4 }));
      return { items, figs };
    }
    // the Dark Tower
    const st = G.towerStage(S); const vt = (S.villain && S.villain.type) || 'lich';
    const base = hasArt('tower-' + vt) ? 'tower-' + vt : 'tower'; const ma = levelArt('tower-' + vt, st.stage, base);
    add({ id: 'main', mode: 'built', art: ma.art, x: DT_MAIN[0], z: DT_MAIN[1], w: TOWER_W[st.stage - 1] });
    const lib = G.libraryLevel(S), LB = S.base && S.base.libBuild;
    { const [x, z, w0] = DT_AT.library; const lv = LB ? lib + 1 : Math.max(1, lib); const a = levelArt('t-library', lv, hasArt('library') ? 'library' : DT_STAND.library); const w = a.own ? w0 : w0 * (1 + 0.12 * (lv - 1));
      if (LB) add({ id: 'library', mode: 'site', art: a.art, x, z, w, p: 1 - LB.days / LB.total }); else add({ id: 'library', mode: lib ? 'built' : 'plot', art: a.art, x, z, w }); }
    for (const k of Object.keys(DT_RES)) {
      const [x, z, w0] = DT_AT[k]; const rk = DT_RES[k]; const done = G.researched(S, rk);
      const lv = Math.max(1, done); const a = levelArt('t-' + k, lv, DT_STAND[k]); const w = a.own ? w0 : w0 * (STAND_W[a.art] || 1) * (1 + 0.12 * (lv - 1));
      add({ id: k, mode: done ? 'built' : 'plot', art: a.art, x, z, w });
    }
    add({ id: 'summon', mode: 'plot', art: null, x: DT_CIRCLE[0], z: DT_CIRCLE[1], w: G.researched(S, 'swift') ? 3.4 : 2.8, ring: '#b468ff' });
    { const own = hasArt('t-treasury'); const g = S.res.gold || 0;   // its own picture is a vault, already heaped with gold: it grows less
      add({ id: 'treasury', mode: 'built', art: own ? 't-treasury' : 'dep-gold', x: DT_TREASURY[0], z: DT_TREASURY[1], w: own ? 1.3 + Math.min(0.5, g / 400) : 0.9 + Math.min(1.5, g / 100) }); }
    // a banner on the wall for every kind of monster you can raise
    const kinds = G.lairsFor(S).filter(k => G.lairKnown(S, k)); const n = kinds.length;
    // an avenue of banners up the road to the tower, one for every kind of monster you can raise
    kinds.forEach((k, i) => { const side = i % 2 ? 1 : -1, j = Math.floor(i / 2); add({ id: 'ban-' + k, mode: 'built', cv: bannerCanvas(G.DUNGEONS[k].unit), x: 9 + side * 1.05, z: 7.4 + j * 0.95, w: 0.7 }); });
    // the villain at home, minions about the yard, one taking shape in the circle
    const V = S.villain; const tw = G.siteOf(S, 'tower');
    if (V && V.state === 'lair') figs.push({ id: 'villain', key: vIcon(), tok: vIcon(), x: DT_MAIN[0] + 1.3, z: DT_MAIN[1] + 1.6, s: VT().icon === 'wyrm' ? 1.5 : 2.0, face: Math.sin(now * 0.4) * 0.3, lift: VT().icon === 'wyrm' ? 0.3 : 0 });
    const homeM = (S.minions || []).filter(m => m.x === tw.x && m.y === tw.y && !m.path.length).slice(0, 10);
    homeM.forEach((m, i) => { const a = now * 0.22 + i * 2.4, r = 1.6 + (i % 3) * 0.7; const cx = 9 + (i % 2 ? 2.6 : -2.6), cz = 7.2; const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.45; figs.push({ id: 'm-' + m.id, key: minionIcon(), tok: minionIcon(), x, z, s: 1.25, face: Math.atan2(-Math.sin(a) * r, Math.cos(a) * r * 0.45), bob: true }); });
    const sm = (S.summons || []).length ? S.summons[0] : null;
    if (sm) figs.push({ id: 'summoning', key: minionIcon(), x: DT_CIRCLE[0], z: DT_CIRCLE[1] + 0.1, s: 1.1 + 0.3 * (1 - sm.days / sm.total), ghost: 0.5 + 0.4 * (1 - sm.days / sm.total), face: now });
    return { items, figs, circle: { x: DT_CIRCLE[0], z: DT_CIRCLE[1], on: !!sm, r: G.researched(S, 'swift') ? 2.8 : 2.2, color: vpal().glow } };
  }
  /* --- what a hover tip and a click card say --- */
  function viewName(id) {
    if (ui.viewKind === 'town') { if (id === 'hall') return G.hallStage(S).name; if (id === 'board') return 'Quest board'; if (id === 'walls') return G.wallName(S); const B = G.TOWN_B[id]; return B ? B.name + (G.townLv(S, id) > 1 ? ' ' + G.roman(G.townLv(S, id)) : '') : id; }
    if (id === 'main') return G.towerStage(S).name; if (id === 'summon') return 'Summoning circle'; if (id === 'treasury') return 'Treasury';
    if (id.indexOf('ban-') === 0) { const D = G.DUNGEONS[id.slice(4)]; return D ? G.CREATURES[D.unit].name + ' banner' : id; }
    return DT_NAME[id] || id;
  }
  function viewTip(id) {
    const T = S.town;
    if (ui.viewKind === 'town') {
      if (id === 'hall') { const st = G.hallStage(S); return `${st.name} · ${Math.round(T.hall)} of ${G.hallMax(S)}: if it falls, Millbrook is razed`; }
      if (id === 'board') { const n = S.quests.filter(q => q.status === 'open').length; return `Quest board · ${n} bount${n === 1 ? 'y' : 'ies'} on your lairs`; }
      if (id === 'walls') return `${G.wallName(S)} · ${Math.round(T.wallHp)} of ${G.WALL_HP[G.townLv(S, 'walls')]}`;
      const B = G.TOWN_B[id]; const l = G.townLv(S, id);
      if (T.build && T.build.k === id) return `${B.name} · going up, ${T.build.days} day${T.build.days > 1 ? 's' : ''} left`;
      if (!l) return `Empty plot · no ${B.name} yet`;
      return `${viewName(id)} · ${B.levels ? B.levels[l - 1] : '+' + G.priceText(B.income[l - 1]) + ' a day'}`;
    }
    if (id === 'main') { const st = G.towerStage(S); return `${st.name} · stage ${st.stage} of ${st.of}`; }
    if (id === 'summon') { const n = (S.summons || []).length; return n ? `Summoning circle · ${n} being summoned` : `Summoning circle · summon ${MT().name.toLowerCase()} here`; }
    if (id === 'treasury') return `Treasury · ${Math.floor(S.res.gold)} gold`;
    if (id === 'library') { const lib = G.libraryLevel(S); return S.base.libBuild ? 'Forbidden Library · going up' : lib ? `Forbidden Library${lib > 1 ? ' II' : ''} · ${lib > 1 ? 'two talent points' : 'a talent point'}` : 'Empty plot · build the Forbidden Library'; }
    if (id.indexOf('ban-') === 0) return viewName(id);
    const rk = DT_RES[id]; const done = G.researched(S, rk);
    return done ? `${DT_NAME[id]} · ${tLabel(rk, done)}` : `Empty plot · learn ${G.talentName(rk)} to raise the ${DT_NAME[id]}`;
  }
  function viewCard(id) {
    const head = (art, title, sub) => `<div class="tvc-h">${art ? img(art, 'licon') : ''}<div><h3>${esc(title)}</h3>${sub ? `<p class="hint">${sub}</p>` : ''}</div></div>`;
    const stageTxt = (st, what) => `<p>${st.next !== null ? `Grows into the <b>${esc(st.nextName)}</b> at ${st.next} ${what} (now ${st.n}).` : `Fully grown (${st.n} ${what}).`}</p>`;
    if (ui.viewKind === 'town') {
      if (id === 'hall') { const st = G.hallStage(S); const inc = G.townIncome(S);
        return head('obj-' + levelArt('t-hall', st.stage, 'town').art, st.name, `Stage ${st.stage} of ${st.of}`) + `<p><b>${Math.round(S.town.hall)}</b> of ${G.hallMax(S)}</p>${hpBar(S.town.hall, G.hallMax(S), 'hall')}<p class="hint">Your waves damage it when they sack the town. <b>If it falls, Millbrook is razed and you win.</b> Millbrook makes ${esc(G.priceText(inc))} a day.</p><div class="row"><button class="btn sm" data-act="ztab" data-k="defence">Defences</button><button class="btn sm" data-act="ztab" data-k="build">All buildings</button></div>`; }
      if (id === 'board') { const open = S.quests.filter(q => q.status === 'open');
        return head('obj-quest', 'Quest board', `${open.length} bount${open.length === 1 ? 'y' : 'ies'} on your lairs`) + (open.length ? `<ul class="plain">${open.map(q => `<li><b>${esc(q.name)}</b> <span class="hint">${esc(G.rewardText(S, q.reward))}</span></li>`).join('')}</ul>` : '<p class="hint">Nothing posted. When your waves hurt the town, it puts a price on the lair they came from.</p>') + '<div class="row"><button class="btn sm" data-act="ztab" data-k="quests">Bounties</button></div>'; }
      if (G.TOWN_B[id]) return townCard(id);
      return '';
    }
    if (id === 'main') { const st = G.towerStage(S);
      return head(vIcon(), st.name, `${esc(VF())}'s seat · stage ${st.stage} of ${st.of}`) + stageTxt(st, 'talent points and Library levels') + `<p class="hint">${V_HOME()}</p><div class="row"><button class="btn sm" data-act="ttab" data-k="talents">Talents</button><button class="btn sm" data-act="ttab" data-k="villain">The villain</button></div>`; }
    if (id === 'summon') return head(minionIcon(), 'Summoning circle', esc(MT().name)) + summonCard();
    if (id === 'library') return head(hasArt('library') ? 'obj-library' : 'obj-lore', 'The Forbidden Library', '') + libraryCard();
    if (id === 'treasury') { const d = S.lastDay; return head('obj-res-gold', 'Treasury', 'The tower\'s purse') + `<p>${purseHtml('tower')}</p>${d ? `<p class="hint">Last night: ${G.RES_KEYS.map(k => `+${d.res[k]} ${k}`).join(', ')}.</p>` : ''}<p class="hint">Your minions bring it in from the mines and camps, and the tower adds 2 gold a day.</p>`; }
    if (id.indexOf('ban-') === 0) { const k = id.slice(4); const D = G.DUNGEONS[k]; const nb = G.myLairs(S).filter(o => o.dtype === k).length;
      return head('obj-' + k, D.name, `Raises ${esc(G.CREATURES[D.unit].name.toLowerCase())}`) + `<p class="hint">${esc(D.text)}</p><p>${nb ? `You have ${nb} on the map.` : 'None built yet: select a minion on the map and pick Build.'}</p><div class="row"><button class="btn sm" data-act="ttab" data-k="lairs">Your lairs</button></div>`; }
    const rk = DT_RES[id]; if (!rk) return '';
    const I = tInfo(rk); const done = G.researched(S, rk); const tr = G.TREES[G.TALENTS[rk].tree].name;
    const btn = I.st === 'avail' ? `<button class="btn sm" data-act="talent" data-k="${rk}">Learn · 1 point</button>` : '';
    return head(talentIcon(rk), DT_NAME[id], esc(tLabel(rk, done)) + ` · ${esc(tr)}`) + `<p>${esc(G.talentText(rk))}</p><p class="hint">${I.st === 'maxed' ? 'Learned in full.' : done ? `Rank ${done} of ${I.max}. ${esc(I.err || '')}` : esc(I.err || 'Ready to learn.')}</p><div class="row">${btn}<button class="btn sm" data-act="ttab" data-k="talents">Talents</button></div>`;
  }
  const V_HOME = () => S.villain && S.villain.state === 'lair' ? `${esc(VN())} is at home on the throne.` : `${esc(VN())} is out in the world.`;
  /* --- the view's own element, kept across re-renders so the 3D canvas never leaves it --- */
  function tviewEl() {
    if (ui.tview) return ui.tview;
    const el = document.createElement('div'); el.className = 'tview'; el.id = 'tview';
    el.innerHTML = '<div class="tvtip" hidden></div><aside class="tvcard" hidden></aside><p class="tvhint"></p>';
    el.addEventListener('pointermove', e => { if (e.target.closest('.tvcard')) { setViewHover(null); return; } const id = pickView(e.clientX, e.clientY); setViewHover(id, e); });
    el.addEventListener('pointerleave', () => setViewHover(null));
    el.addEventListener('click', e => {
      if (e.target.closest('.tvcard')) return;
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
    el.querySelector('.tvhint').textContent = ui.tvSel ? '' : ui.viewKind === 'town' ? 'Click a building to see what it does. Empty plots are what Millbrook hasn\'t built yet.' : 'Click a building to run it. Your talents raise new ones around the tower.';
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
    const X = view2dXf(); const town = ui.viewKind === 'town'; const sp = viewSpec(ui.viewKind);
    if (!ui.tv2dBg) {
      const bg = A.paintField(town ? 'grass' : 'waste', W, H, sp.seed); const b = bg.getContext('2d');
      const line = (pts, w, col) => { b.strokeStyle = col; b.lineWidth = w * X.k; b.lineCap = 'round'; b.lineJoin = 'round'; b.beginPath(); pts.forEach(([x, z], i) => i ? b.lineTo(X.X(x), X.Y(z)) : b.moveTo(X.X(x), X.Y(z))); b.stroke(); };
      const rc = town ? ['#6a5236', '#a8875a'] : ['#2a2422', '#5a4c44'];
      for (const p of sp.paths || []) { line(p, 0.7, rc[0]); line(p, 0.45, rc[1]); }
      line(sp.road, 1.4, rc[0]); line(sp.road, 1.1, rc[1]);
      const P = sp.plaza; b.fillStyle = rc[1]; b.beginPath(); b.ellipse(X.X(P.x), X.Y(P.z), P.r * X.k, P.r * X.k * 0.62, 0, 0, 7); b.fill();
      const W2 = sp.pond; if (W2) { b.fillStyle = town ? '#5e5a42' : '#1e1a1a'; b.beginPath(); b.ellipse(X.X(W2.x), X.Y(W2.z), W2.rx * 1.15 * X.k, W2.rz * 1.15 * X.k * 0.62, 0, 0, 7); b.fill(); b.fillStyle = W2.color || '#2c5878'; b.beginPath(); b.ellipse(X.X(W2.x), X.Y(W2.z), W2.rx * X.k, W2.rz * X.k * 0.62, 0, 0, 7); b.fill(); }
      // hills and a dark treeline behind, trees and rocks crowding in at the edges
      const hz = X.Y(-0.4); const hg = b.createLinearGradient(0, 0, 0, hz); hg.addColorStop(0, town ? '#1c2a1a' : '#140f12'); hg.addColorStop(1, town ? '#34502a' : '#2a2224');
      b.fillStyle = hg; b.beginPath(); b.moveTo(0, 0); b.lineTo(W, 0); for (let x = W; x >= 0; x -= 24) b.lineTo(x, hz - 10 - 14 * Math.sin(x * 0.013 + sp.seed) - 8 * Math.sin(x * 0.041)); b.closePath(); b.fill();
      const r = G.mulberry(sp.seed); const tall = [];
      for (let i = 0; i < 420; i++) {
        const x = r() * (TFW + 6) - 3, z = r() * (TFH + 3) - 1.6; const d = Math.max(0.6 - x, x - TFW + 0.6, 0.5 - z, z - TFH + 0.3, 0);
        if (r() > 0.12 + d * 0.45) continue; if ((sp.keepOut || []).some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + 0.3)) continue;
        if (sp.pond && Math.hypot((x - sp.pond.x) / (sp.pond.rx + 0.5), (z - sp.pond.z) / (sp.pond.rz + 0.5)) < 1) continue;
        tall.push({ x, z, kind: town ? (r() < 0.75 ? 'tree' : 'rock') : (r() < 0.55 ? 'tree' : 'rock'), i });
      }
      tall.sort((a, q) => a.z - q.z);
      for (const t of tall) A.obstacle(b, X.X(t.x), X.Y(t.z), X.k * (t.kind === 'tree' ? 0.42 : 0.3), town ? 'grass' : 'waste', t.i + sp.seed, t.kind);
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
    const body = ui.screen === 'chronicle' ? scrChronicle() : ui.screen === 'town' ? scrTown() : scrTower();
    const vkind = ui.screen === 'town' && (ui.townTab || 'view') === 'view' ? 'town' : ui.screen === 'tower' && (ui.towerTab || 'view') === 'view' ? 'tower' : null;
    const head = ui.screen === 'chronicle' ? ['Chronicle', 'Everything that has happened in this campaign, newest first.'] : ui.screen === 'town' ? ['Millbrook', 'The heroes\' home town, and your target. It runs itself: it builds walls and towers against your waves, makes its heroes stronger, and puts bounties on your lairs.'] : ['The Dark Tower', `Your seat of power: summon ${MT().name.toLowerCase()}, study dark secrets and watch over your lairs.`];
    el.hidden = false;
    if (vkind) { const st = vkind === 'town' ? G.hallStage(S) : G.towerStage(S); head[1] = `${st.name}, stage ${st.stage} of ${st.of}. ${st.next !== null ? `Grows into the ${st.nextName} at ${st.next} ${vkind === 'town' ? 'building levels' : 'talent points'} (now ${st.n}).` : 'Fully grown.'}`; }
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
    const siege = r.sieges ? `<p>${r.sieges} siege${r.sieges > 1 ? 's' : ''} of Millbrook, ${r.breaches ? `<b class="good">${r.breaches} broke in</b>` : 'none got in'}${r.plunder ? `, ${r.plunder} gold plundered` : ''}${r.burned ? `, ${r.burned} building level${r.burned > 1 ? 's' : ''} burned` : ''}.</p>` : '<p class="hint">None of your waves reached Millbrook this week.</p>';
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
  // the heroes levelling up is news from the enemy camp now (0.30): a line, not a dialog
  function showLevelUps(then) {
    const L = S.pendingLevelUps.splice(0);
    if (L.length) {
      const who = S.heroes.find(x => x.id === L[Math.floor(Math.random() * L.length)].id); if (who && Math.random() < 0.5) setTimeout(() => bark('levelup', who), 500);
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
    sfx('research'); renderBar();
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
      <p class="hint">Level ${G.avgLevel(S)} on average · ${hp} / ${maxHp} HP between them · heading for <b>${esc(goal)}</b>. Select a portrait for a hero's full sheet.</p>
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
        <li><b>Your eyes are your minions.</b> You start with two ${esc(mt.name.toLowerCase())} at the tower. The map stays dark where none of them have been; you always see what your tower, your lairs and your minions see, and everything around the heroes.</li>
        <li><b>Gather.</b> Click a minion to select it (Shift-click for more, <b>I</b> for the next idle one) and pick <b>Move</b>, <b>Build</b> or <b>Dance</b>. Right-click a gold deposit, timber stand or ore deposit to put it to work: it spends a night opening a mine or camp, then digs <b class="gold">gold</b>, cuts <b>lumber</b> or hauls <b>ore</b> every night. One minion per site.</li>
        <li><b>Build lairs.</b> Pick <b>Build</b>, choose a lair and click explored ground the heroes can't see. Each lair breeds one kind of monster every night. <b>When it's full, a wave marches down the road to Millbrook on its own.</b> A lair near the town strikes often; one far away is harder for the heroes to find.</li>
        <li><b>The siege.</b> A wave at the gates fights Millbrook's archers, ballista, arcane tower and temple bell, and batters its walls. Once it's through, or if it flies over, it sacks the town: it damages the hall, plunders gold and burns buildings. If the heroes are home, they man the walls and fight it themselves, with the towers firing. Millbrook builds its own defences against whatever keeps hurting it, so mix up what you send.</li>
        <li><b>Infamy.</b> Hurting and killing heroes, breaking into Millbrook, plunder and every lair you keep standing earn Infamy. Infamy levels up your villain: stronger on the throne, a new power at levels 6, 11 and 16, and a talent point every level. Spend talents at the Dark Tower in four trees: The Brood (new lairs and fiercer monsters), Dominion (servants, mines and gold), Dread (your villain and the showdown), and ${esc(VN())}'s own path, with a monster only ${esc(VP().he)} can raise.</li>
        <li><b>The heroes.</b> You never control them. They hunt the monsters they think they can beat, intercept your waves, storm your lairs and raid your mines. Millbrook puts bounties on the lairs that hurt it most. Click any band you can see to <b>Patrol</b>, <b>Level up</b> or send it <b>Away</b>; the card tells you how it would fare against the heroes, and a wave's card how it would fare against the town.</li>
        <li><b>Watch, or take command.</b> Battles play out on their own. Press <b>Take command</b> to play your monsters: every unit gets a <b>Move</b>, an <b>Attack</b> and a <b>Bonus</b> action each turn. <b>Skip</b> jumps to the end of a fight.</li>
        <li><b>Winning and losing.</b> You win if Millbrook's hall falls, or if your monsters wipe out the whole party while the tavern lies in ashes (with a tavern, a new and greener party takes up the sword). You lose if the heroes beat you on your throne. They march when they think they'd win, so stay ahead of them. The sooner you win, the higher your score.</li>
      </ol>
      <p class="hint">The game autosaves; the Menu has saving, loading, settings and the chronicle. Drag the map to look around, scroll to zoom, click the minimap to jump, Esc to deselect. Keys: E end day · I next idle minion (Shift+I all of them) · with minions selected: M move, B build. In command: M move · F attack · B bonus · E end turn · W wait · D defend · A let the AI play this turn.</p>
      <div class="row end"><button class="btn big" data-act="close">${first ? 'Begin your reign' : 'Back to the game'}</button></div>`, null, 'wide');
  }
  function showOver() {
    const res = S.result; const won = res === 'razed' || res === 'wiped';
    save(true); syncAudio(); sfx(won ? 'win' : 'lose');
    if (!won && res === 'defeat') setTimeout(() => bark('win', null, { force: true }), 1500);
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
  function showEncounter() {
    const e = S.enc; if (!e) return;
    ui.moving = true;
    const head = `<div class="enc-head">${img('obj-' + e.art, 'port xl')}<div><p class="eyebrow">An event</p><h1 class="dtitle">${esc(e.name)}</h1><p>${esc(e.intro)}</p></div></div>`;
    if (e.stage === 'setup') {
      const ch = e.choices.map(c => `<button class="choice" data-act="encchoose" data-k="${c.k}"><b>${esc(c.label)}</b><small>${esc(c.text)}</small></button>`).join('');
      modal(`${head}<h2 class="cap">Your scheme</h2><div class="choices">${ch}</div><p class="hint">The heroes can't see this choice. You set the scene; the dice decide the rest.</p>`, null, 'wide enc');
      return;
    }
    modal(`${head}<div class="enc-narr" id="enc-narr"></div><div class="enc-rolls" id="enc-rolls"></div><div class="tray inline" id="enc-tray" hidden></div><div class="enc-narr" id="enc-out"></div><div class="row end" id="enc-ctrl"></div>`, null, 'wide enc');
    const narr = $('enc-narr');
    for (const n of e.narr) { const p = document.createElement('p'); p.textContent = n; narr.appendChild(p); }
    // replay rolls already done (after a reload)
    for (const r of e.rolls) addRollChip(r);
    encNext();
  }
  function addRollChip(r) {
    const box = $('enc-rolls'); if (!box) return;
    const d = document.createElement('div'); d.className = 'chip r-' + r.result; d.innerHTML = Dice.render(r); box.appendChild(d);
  }
  function encNext() {
    const e = S.enc; const ctrl = $('enc-ctrl'); if (!ctrl) return;
    if (e.stage === 'rolling') {
      ctrl.innerHTML = `<button class="btn big" data-act="encroll">${e.idx === 0 ? 'Roll the dice' : 'Next roll'}</button>`;
      ctrl.querySelector('button').focus({ preventScroll: true });
      return;
    }
    if (e.stage === 'ready') { ctrl.innerHTML = `<button class="btn big" data-act="encfinish">See what happens</button>`; ctrl.querySelector('button').focus({ preventScroll: true }); return; }
    if (e.stage === 'done') {
      const o = e.outcome;
      for (const r of e.extraRolls) addRollChip(r);
      const box = $('enc-out'); const p = document.createElement('p'); p.className = 'outcome ' + (o.ok ? 'neg' : 'pos'); p.textContent = o.text; box.appendChild(p);
      if (o.infamy) { const l = document.createElement('div'); l.innerHTML = ledger([{ label: 'The heroes stumbled', v: o.infamy }], o.infamy, 'Infamy'); box.appendChild(l.firstElementChild); }
      ctrl.innerHTML = `<button class="btn big" data-act="encclose">${e.ambush ? 'To battle!' : 'Continue'}</button>`;
      ctrl.querySelector('button').focus({ preventScroll: true });
      renderBar();
    }
  }
  function encRoll() {
    const e = S.enc; const ctrl = $('enc-ctrl');
    const pre = G.encSettle(S); // a failed roll that wasn't fudged takes effect now
    if (pre) { addRollChip(pre); const p = document.createElement('p'); p.textContent = e.narr[e.narr.length - 1]; $('enc-narr').appendChild(p); }
    const rec = G.encRoll(S); if (!rec) { encNext(); return; }
    ctrl.innerHTML = '';
    const tray = $('enc-tray');
    Dice.show(tray, rec, diceSpeed()).then(() => {
      save();
      tray.hidden = true; addRollChip(rec); encNext();
    });
  }
  function encAfterFudgeChoice(fudge) {
    const e = S.enc; const rec = e.rolls[e.rolls.length - 1];
    if (fudge) { const err = G.encFudge(S); if (err) toast(err, 'bad'); else toast('You nudge the die when nobody is looking.', 'warn'); }
    $('enc-tray').hidden = true; addRollChip(rec); renderBar(); encNext();
  }
  function encClose() {
    const r = G.encClose(S);
    closeModal(); save();
    if (r === 'battle') { enterBattle(); return; }
    renderSide(); drawMap();
    const goOn = () => stepLoop();
    if (S.pendingLevelUps.length) showLevelUps(goOn); else goOn();
  }

  /* ============ battle ============ */
  let BF = null;
  const bcv = () => $('bcv');
  function enterBattle() {
    clearTimeout(ui.meterT); ui.meterTok++; ui.fair = null;
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
    { const b = S.battle; if (b.finale && b.stage !== 1) setTimeout(() => bark('boss'), 3200); else if (Math.random() < 0.65) setTimeout(() => bark(b.boss || b.challenge === 'avoid' || b.finale ? 'danger' : 'start'), 1100); }
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
    if (ui.r3d) { const now = performance.now(); ui.fx = ui.fx.filter(f => now - f.t0 < f.dur); ui.floats = ui.floats.filter(f => now - f.t0 < 1400); ui.bspec = battleSpec3d(); return; }
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(BF.field, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = BF.R; const now = performance.now();
    const deploy = b.phase === 'deploy';
    const dm = isDmTurn() && !ui.playing;
    const u = curUnit();
    const opts = dm ? curOptions() : null;
    // ground features first
    for (const k of Object.keys(b.tiles)) { const t = b.tiles[k]; const p = hexXY(+k); if (t === 'bog') A.bog(c, p.x, p.y, R, +k * 3 + S.seed); }
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
      const t = b.tiles[k]; if (t === 'bog') continue; const p = hexXY(+k);
      draw.push({ y: p.y - 0.1, f: () => { if (t === 'brush') A.brush(c, p.x, p.y, R, b.terrain, +k * 7 + S.seed); else A.obstacle(c, p.x, p.y, R, b.terrain, +k * 7 + S.seed, t); } });
    }
    for (const x of b.units) {
      const v = ui.view[x.id]; if (!v || (!v.alive && v.fade <= 0)) continue;
      const p0 = v.px || hexXY(v.pos); const p = v.lift ? { x: p0.x, y: p0.y - v.lift } : p0;
      draw.push({ y: p0.y, f: () => drawUnit(c, x, v, p, R, now) });
    }
    draw.sort((a, z) => a.y - z.y); for (const d of draw) d.f();
    ui.fx = ui.fx.filter(f => now - f.t0 < f.dur);
    for (const f of ui.fx) if (now >= f.t0) drawFx(c, f, (now - f.t0) / f.dur, R);
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
    const sz = R * 1.62; const b = S.battle;
    const cur = (b.cur === x.id && !ui.playing && b.phase !== 'deploy') || (b.phase === 'deploy' && ui.deploySel === x.id);
    c.save();
    if (!v.alive) c.globalAlpha = Math.max(0, v.fade);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(p.x, p.y + R * 0.62, R * 0.62, R * 0.2, 0, 0, 7); c.fill();
    if (cur) { const pulse = 0.55 + 0.45 * Math.sin(now / 220); c.strokeStyle = `rgba(255,214,110,${pulse})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y - R * 0.12, sz / 2 + 4, 0, 7); c.stroke(); }
    if (x.defending && v.alive && !v.down) { c.strokeStyle = 'rgba(140,190,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y - R * 0.12, sz / 2 + 1, 0, 7); c.stroke(); }
    if (v.down) { c.globalAlpha *= 0.55; c.translate(p.x, p.y); c.rotate(Math.PI / 2.4); c.translate(-p.x, -p.y); }
    if (v.flash && now - v.flash < 260) { c.shadowColor = '#ff3020'; c.shadowBlur = 18; }
    c.drawImage(A.IMG['unit-' + x.icon], p.x - sz / 2, p.y - sz / 2 - R * 0.12, sz, sz);
    c.restore();
    if (!v.alive) return;
    if (x.side === 'dm') {
      const t = String(v.count); c.font = `700 ${Math.round(R * 0.36)}px Alegreya, Georgia, serif`;
      const w = Math.max(R * 0.6, c.measureText(t).width + 8), h = R * 0.42;
      const bx = p.x + R * 0.25, by = p.y + R * 0.38;
      if (!x.boss) { c.fillStyle = '#1a2a5a'; c.strokeStyle = '#d9b45e'; c.lineWidth = 1; c.beginPath(); roundRect(c, bx - w / 2, by, w, h, 3); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(t, bx, by + h * 0.78); }
      if (x.boss || (x.count === 1 && x.maxHp >= 60)) { const f = Math.max(0, v.hp / x.maxHp); c.fillStyle = '#000'; c.fillRect(p.x - R * 0.55, p.y + R * 0.86, R * 1.1, 4); c.fillStyle = x.boss ? '#c06cff' : '#e8604f'; c.fillRect(p.x - R * 0.55, p.y + R * 0.86, R * 1.1 * f, 4); }
    } else {
      const f = Math.max(0, v.hp / x.maxHp);
      c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(p.x - R * 0.6, p.y + R * 0.58, R * 1.2, 6);
      c.fillStyle = f < 0.3 ? '#e8604f' : f < 0.6 ? '#e6a94a' : '#64b04c'; c.fillRect(p.x - R * 0.6 + 1, p.y + R * 0.58 + 1, (R * 1.2 - 2) * f, 4);
      if (v.down) { c.font = `700 ${Math.round(R * 0.3)}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.fillStyle = '#ff8a7a'; c.fillText('DOWN', p.x, p.y + R * 0.5); }
    }
  }
  function drawFx(c, f, t, R) {
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
      va.face = vd.pos; clearTimeout(va.faceT); va.faceT = setTimeout(() => { va.face = null; }, 900 * speed + 200);
      if (ev.ranged) { ui.fx.push({ kind: 'shot', x: pa.x, y: pa.y - BF.R * 0.2, x2: pd.x, y2: pd.y - BF.R * 0.2, t0: now, dur: 320 * speed, color: a.side === 'party' ? '#ffb060' : a.type === 'giant' ? '#8a7a6a' : '#ffe9a8', arc: a.type === 'giant' ? 1.4 : 0.5 }); return 260 * speed; }
      const t0 = performance.now(); const dur = 220 * speed;
      const step = () => { const t = Math.min(1, (performance.now() - t0) / Math.max(1, dur)); const q = Math.sin(t * Math.PI) * 0.35; va.px = { x: pa.x + (pd.x - pa.x) * q, y: pa.y + (pd.y - pa.y) * q }; if (t < 1) requestAnimationFrame(step); else va.px = null; };
      step(); return dur * 0.6;
    }
    if (ev.t === 'miss') { const vd = ui.view[ev.target]; if (!vd) return 0; const p = hexXY(vd.pos); ui.floats.push({ battle: true, x: p.x, y: p.y, text: 'Miss', color: '#c9c0aa', t0: now }); return 150 * speed; }
    if (ev.t === 'trapfx') { const p = hexXY(ev.k); ui.fx.push({ kind: 'ring', x: p.x, y: p.y, t0: now, dur: 400 * speed, color: '#ff6a50' }); return 200 * speed; }
    if (ev.t === 'revive') { const v = ui.view[ev.id]; const u = unit(ev.id); if (v && u) { v.down = false; v.hp = u.hp; } renderBattleUI(true); return 200 * speed; }
    if (ev.t === 'hit') {
      const d = unit(ev.target); const vd = ui.view[ev.target]; if (!d || !vd) return 0;
      const p = hexXY(vd.pos);
      if (ev.dodge) { ui.floats.push({ battle: true, x: p.x, y: p.y, text: 'Dodge!', color: '#bfe6ff', t0: now }); return 260 * speed; }
      vd.flash = now;
      if (ev.escaped) { vd.alive = false; fadeOut(vd, speed); ui.fx.push({ kind: 'ring', x: p.x, y: p.y, t0: now, dur: 700 * speed, color: '#c06cff' }); ui.floats.push({ battle: true, x: p.x, y: p.y, text: 'Vanishes!', color: '#d9a8ff', t0: now }); renderBattleUI(true); return 500 * speed; }
      if (d.side === 'dm') { if (d.boss) vd.hp = Math.max(0, vd.hp - ev.dmg); vd.count = Math.max(0, vd.count - (ev.killed || 0)); if (ev.died) { vd.alive = false; fadeOut(vd, speed); } }
      else { vd.hp = Math.max(0, vd.hp - ev.dmg); if (ev.down) vd.down = true; if (ev.died) { vd.alive = false; fadeOut(vd, speed); } if (ev.relentless) vd.hp = 1; }
      if (ev.dmg || ev.died) {
        const txt = (ev.crit ? 'Crit! ' : '') + '−' + ev.dmg + (ev.killed ? ` (${ev.killed} slain)` : '') + (ev.down ? ' · down' : '');
        ui.floats.push({ battle: true, x: p.x, y: p.y, text: txt, color: d.side === 'party' ? '#ff8a7a' : ev.crit ? '#ffe066' : '#fff4d6', t0: now });
      }
      renderBattleUI(true);
      return 260 * speed;
    }
    if (ev.t === 'spell') {
      const src = ev.src ? ui.view[ev.src] : null; const ps = src ? hexXY(src.pos) : { x: BF.W - 40, y: 40 };
      const targets = (ev.targets || []).map(id => ui.view[id]).filter(Boolean);
      if (ev.heal) { for (const tv of targets) { const tp = hexXY(tv.pos); ui.fx.push({ kind: 'heal', x: tp.x, y: tp.y, t0: now, dur: 800 * speed, seed: Math.random() * 6 }); const u2 = b.units.find(x => ui.view[x.id] === tv); if (u2) { tv.hp = u2.hp; tv.down = u2.down; tv.alive = u2.alive; } } renderBattleUI(true); return 400 * speed; }
      if (ev.fx === 'fireball') { const cp = hexXY(ev.center); ui.fx.push({ kind: 'shot', x: ps.x, y: ps.y, x2: cp.x, y2: cp.y, t0: now, dur: 300 * speed, color: '#ffb040', arc: 0.6 }); ui.fx.push({ kind: 'boom', x: cp.x, y: cp.y, t0: now + 280 * speed, dur: 600 * speed }); return 520 * speed; }
      if (ev.fx === 'meteor') { for (const tv of targets) { const tp = hexXY(tv.pos); ui.fx.push({ kind: 'boom', x: tp.x, y: tp.y, t0: now + Math.random() * 200, dur: 600 * speed }); } return 520 * speed; }
      if (ev.fx === 'lightning' || ev.fx === 'chain') { let from = ps; for (const tv of targets) { const tp = hexXY(tv.pos); ui.fx.push({ kind: 'bolt', x: from.x, y: from.y, x2: tp.x, y2: tp.y, t0: now, dur: 420 * speed, seed: Math.random() * 9 }); if (ev.fx === 'chain') from = tp; } return 420 * speed; }
      if (ev.fx === 'arrow') { for (const tv of targets) { const tp = hexXY(tv.pos); ui.fx.push({ kind: 'shot', x: ps.x, y: ps.y, x2: tp.x, y2: tp.y, t0: now, dur: 300 * speed, color: '#c9a0ff', arc: 0.2 }); } return 300 * speed; }
      if (ev.fx === 'holyword') { for (const tv of targets) { const tp = hexXY(tv.pos); ui.fx.push({ kind: 'holy', x: tp.x, y: tp.y, t0: now, dur: 600 * speed }); } return 450 * speed; }
      if (ev.fx === 'rend') { ui.fx.push({ kind: 'ring', x: ps.x, y: ps.y, t0: now, dur: 800 * speed, color: '#c06cff' }); return 500 * speed; }
      if (ev.fx === 'breath') { for (const tv of targets) { const tp = hexXY(tv.pos); ui.fx.push({ kind: 'flame', x: tp.x, y: tp.y, t0: now, dur: 700 * speed }); } return 450 * speed; }
      return 250 * speed;
    }
    if (ev.t === 'summon') { const u = unit(ev.id); ui.view[ev.id] = { pos: u.pos, count: u.count, hp: u.hp, alive: true, down: false, fade: 1 }; const p = hexXY(u.pos); ui.fx.push({ kind: 'ring', x: p.x, y: p.y, t0: now, dur: 500 * speed, color: '#8fb0ff' }); return 400 * speed; }
    return 0;
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
  function renderBattleUI(light) {
    const b = S.battle; if (!b) return;
    const u = curUnit();
    const party = b.units.filter(x => x.side === 'party');
    $('bparty').innerHTML = party.map(x => { const v = ui.view[x.id] || x; const f = Math.max(0, v.hp / x.maxHp) * 100; return `<div class="bh${!v.alive ? ' dead' : v.down ? ' down' : ''}${b.cur === x.id ? ' cur' : ''}">${img('unit-' + x.icon, 'port sm')}<span><b>${esc(shortName(x.name))}</b><i class="hpb"><i style="width:${f.toFixed(0)}%"></i></i><small>${v.alive ? (v.down ? 'Down' : Math.max(0, v.hp) + '/' + x.maxHp) : 'Dead'} · AC ${x.ac}${x.maxMana ? ' · ' + x.mana + ' mana' : ''}</small></span></div>`; }).join('');
    $('bround').textContent = b.phase === 'deploy' ? 'Deployment' : `Round ${b.round}`;
    $('bterrain').textContent = G.TERRAIN[b.terrain] ? G.TERRAIN[b.terrain].name : '';
    $('bdm').innerHTML = `<span title="The tower's gold: pays for extra traps and reinforcements">Tower <b>${Math.floor(S.res.gold)}</b></span><span title="${esc(VN())}'s level">${esc(VN())} <b>Lv ${G.villainLevel(S)}</b></span>${b.siege ? '<span>The siege of Millbrook</span>' : b.attack ? '<span>Your war party</span>' : b.finale ? '<span>The final showdown</span>' : ''}`;
    if (light) return;
    const dep = $('bdeploy');
    if (b.phase === 'deploy') {
      const free = Math.max(0, b.freeTraps - b.traps.filter(t => t.free).length);
      dep.hidden = false;
      dep.innerHTML = `<b class="gold">Deploy your forces.</b> <span>Click one of your stacks, then a blue hex to move it. ${ui.trapMode ? 'Click hexes in the middle of the field to hide spike traps (click again to remove).' : 'Spike traps hurt the first hero who walks onto them.'}</span>
        <span class="row"><button class="btn sm${ui.trapMode ? ' on' : ''}" data-act="trapmode">${ui.trapMode ? 'Done with traps' : 'Hide spike traps'}</button><span class="hint">${b.traps.length} placed · ${free ? free + ' free, then ' : ''}${G.TRAP_GOLD} gold each</span><button class="btn" data-act="beginbattle">Begin battle</button></span>`;
    } else dep.hidden = true;
    const order = b.phase === 'deploy' ? [] : [b.cur].concat(b.queue, b.waitQ || []).filter((id, i, a) => id && a.indexOf(id) === i).map(id => b.units.find(x => x.id === id)).filter(x => x && x.alive && !x.down);
    $('bqueue').innerHTML = order.slice(0, 12).map((x, i) => `<span class="q ${x.side}${i === 0 ? ' now' : ''}" title="${esc(x.name)}">${img('unit-' + x.icon, 'qimg')}${x.side === 'dm' && !x.boss ? `<b>${x.count}</b>` : ''}</span>`).join('');
    const dm = isDmTurn();
    let st = '';
    if (b.phase === 'deploy') st = 'Arrange your monsters, then begin. The heroes are lined up on the left.';
    else if (b.pendingTPK) st = 'Every hero has fallen.';
    else if (b.over) st = 'The battle is over.';
    else if (dm) {
      const bn = bonusName(u); const bo = G.bonusOptions(b, u);
      const hint = ui.bmode === 'move' ? 'Click a lit hex to move.' : ui.bmode === 'attack' ? 'Click a hero to attack.' : ui.bmode === 'bonus' ? `Pick a ${bo && bo.hexes.length ? 'hex' : 'target'} for ${bn}.` : 'Click a hero to attack, or a lit hex to move.';
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
        case 'bskip': skipBattle(); return;
        case 'sound': { if (!window.SND) return; const st = typeof Store !== 'undefined' ? Store.setSettings({ muted: !SND.muted }) : { muted: !SND.muted }; SND.setVolumes(st); updateSoundBtn(); if (!SND.muted) sfx('chime'); return; }
        case 'hero': showHero(d.id); return;
        case 'party': showParty(); return;
        case 'tower': ui.towerTab = d.k || 'view'; openScreen('tower'); return;
        case 'vtalents': closeModal(); ui.towerTab = 'talents'; openScreen('tower'); return;
        case 'ttab': sfx('tab'); ui.towerTab = d.k; renderScreen(true); return;
        case 'town': if (!S.town) return; ui.townTab = d.k || 'view'; openScreen('town'); return;
        case 'tvclose': ui.tvSel = null; updateViewCard(); return;
        case 'ztab': sfx('tab'); ui.townTab = d.k; renderScreen(true); return;
        case 'townbuild': { const err = G.townBuild(S, d.k); if (err) { sfx('deny'); toast(err, 'bad'); return; } sfx('build'); const B = S.town.build; toast(`Millbrook starts on the ${G.TOWN_B[B.k].name}: ${B.days} days.`, 'good'); commit(); return; }
        case 'towncancel': { const err = G.townCancel(S); if (err) { toast(err, 'bad'); return; } sfx('coins'); toast('Building stopped. The materials are back in the town\'s purse.', 'sys'); commit(); return; }
        case 'quest': { const ref = refFrom(d); if (!ref) return; const err = G.postQuest(S, ref, +d.r); if (err) { sfx('deny'); toast(err, 'bad'); return; } sfx('coins'); toast(S.log[S.log.length - 1].t, 'good'); ui.est = null; commit(); return; }
        case 'qshow': showRef(refFrom(d)); return;
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
        case 'mdance': for (const m of selMinions()) G.orderDance(S, m.id); ui.mode = null; ui.place = null; kick(); commit(); return;
        case 'bpatrol': ui.mode = ui.mode === 'patrol' ? null : 'patrol'; renderSide(); drawMap(); return;
        case 'bhold': { const b = selBand(); if (b) { const err = G.bandHold(S, b.id); if (err) toast(err, 'bad'); } ui.mode = null; commit(); return; }
        case 'blevel': { const b = selBand(); if (!b) return; const err = G.bandLevelUp(S, b.id); if (err) { toast(err, 'bad'); return; } sfx('growl'); ui.threat = null; ui.floats.push({ x: b.x * TILE + TILE / 2, y: b.y * TILE, text: 'Lv ' + b.lvl, color: '#ffd36a', t0: performance.now() }); kick(); commit(); return; }
        case 'baway': { const b = selBand(); if (!b) return; const err = G.bandAway(S, b.id); if (err) { toast(err, 'bad'); return; } ui.floats.push({ x: b.x * TILE + TILE / 2, y: b.y * TILE, text: 'Gone', color: '#c8b898', t0: performance.now() }); ui.sel = null; ui.mode = null; kick(); commit(); return; }
        case 'mworknear': workNearest(d.kind); return;
        case 'mhome': { let ok = 0, err = null; for (const m of selMinions()) { const r = G.orderHome(S, m.id); if (r) err = err || r; else ok++; } if (!ok) { toast(err || 'They can\'t get home.', 'bad'); return; } commit(); return; }
        case 'mstop': for (const m of selMinions()) G.recallMinion(S, m.id); ui.place = null; commit(); return;
        case 'mbuild': ui.mbuild = !ui.mbuild; ui.mode = null; if (!ui.mbuild) ui.place = null; renderSide(); drawMap(); return;
        case 'placelair': { if (ui.place && ui.place.k === d.k) { ui.place = null; renderSide(); drawMap(); return; } const err = G.lairCheck(S, d.k); if (err) { toast(err, 'bad'); return; } ui.place = { k: d.k }; renderSide(); drawMap(); return; }
        case 'minimap': toggleMini(); return;
        case 'buildlair': { if (!ui.sel || ui.sel.type !== 'spot') return; const { x, y } = ui.sel; const err = G.orderBuild(S, d.k, x, y); if (err) { toast(err, 'bad'); return; } sfx('minion-go'); sfx('coins', { vol: 0.6 }); const o = S.objects[S.objects.length - 1]; ui.sel = { type: 'lair', id: o.id, x, y }; toast(`Your ${MT().one.toLowerCase()} sets off to build the ${G.DUNGEONS[d.k].name}: ${G.lairDays(S, d.k)} days of work.`, 'good'); ui.finaleEst = null; commit(); return; }
        case 'work': { const err = G.orderWork(S, d.id); if (err) { toast(err, 'bad'); return; } sfx('minion-go'); toast(`A ${MT().one.toLowerCase()} sets off for the ${G.nodeName(S.nodes.find(n => n.id === d.id))}.`, 'good'); commit(); return; }
        case 'recall': { const err = G.recallFrom(S, d.id); if (err) toast(err, 'bad'); commit(); return; }
        case 'recallm': { G.recallMinion(S, d.id); commit(); return; }
        case 'buildhelp': { const err = G.orderHelp(S, d.id); if (err) { toast(err, 'bad'); return; } commit(); return; }
        case 'cancelbuild': { G.cancelBuild(S, d.id); ui.sel = null; toast('Building called off. Half the cost comes back.', 'sys'); commit(); return; }
        case 'expand': { const err = G.expandLair(S, d.id); if (err) { toast(err, 'bad'); return; } ui.reachCache = null; toast('The lair is expanded.', 'good'); ui.meter = null; commit(); return; }
        case 'train': { const err = G.trainMinion(S); if (err) { toast(err, 'bad'); return; } sfx('summon'); const w = S.summons.reduce((t, q) => t + q.days, 0); toast(`Summoning a ${MT().one.toLowerCase()} at the tower: ready in ${w} days.`, 'good'); commit(); return; }
        case 'unsummon': { sfx('coins'); const err = G.cancelSummon(S, +d.i); if (err) { toast(err, 'bad'); return; } toast('Summoning cancelled. The gold is back in your coffers.', 'sys'); commit(); return; }
        case 'library': { const err = G.buildLibrary(S); if (err) { toast(err, 'bad'); return; } sfx('build'); toast(`Your ${MT().name.toLowerCase()} start on the ${G.libraryLevel(S) ? "Library's new wing" : 'Forbidden Library'}: ${S.base.libBuild.days} days.`, 'good'); commit(); return; }
        case 'sellair': case 'selnode': { const o = act === 'sellair' ? S.objects.find(z => z.id === d.id) : S.nodes.find(z => z.id === d.id); if (!o) return; closeScreen(); ui.sel = { type: act === 'sellair' ? 'lair' : 'node', id: o.id, x: o.x, y: o.y }; centerOn(o.x, o.y); ui.scrollTo = 'sel'; renderSide(); drawMap(); return; }
        case 'gift': { const err = G.gift(S); if (err) { toast(err, 'bad'); return; } toast(S.log[S.log.length - 1].t, 'good'); ui.finaleEst = null; ui.meter = null; commit(); return; }
        case 'fair': findFair(); return;
        case 'send': {
          if (ui.fair || ui.moving) return;
          const err = G.sendAttack(S, compList()); if (err) { toast(err, 'bad'); return; }
          clearTimeout(ui.meterT); ui.meterTok++; ui.comp = {}; ui.meter = null;
          save(); enterBattle(); return;
        }
        case 'chronicle': closeModal(); openScreen('chronicle'); return;
        case 'upgrade': { const err = G.lairUpgrade(S, d.k); if (err) toast(err, 'bad'); else toast(`${VN()} gains ${G.LAIR[d.k].name}.`, 'warn'); ui.finaleEst = null; commit(); return; }
        case 'scoutfinale': { el.disabled = true; el.textContent = 'Scouting…'; setTimeout(() => { ui.finaleEst = G.simulateFinale(S, 16); renderSide(); }, 30); return; }
        case 'endday': endDay(); return;
        case 'rules': showRules(false); return;
        case 'gamemenu': if (typeof Front !== 'undefined') Front.menu(); return;
        case 'bpower': if (isDmTurn() && !ui.playing) doAct({ type: 'power', key: d.k }); return;
        case 'encchoose': { G.encChoose(S, d.k); save(); showEncounter(); return; }
        case 'encroll': el.disabled = true; encRoll(); return;
        case 'encfudge': encAfterFudgeChoice(true); return;
        case 'enclet': encAfterFudgeChoice(false); return;
        case 'encfinish': {
          const pre = G.encSettle(S);
          if (pre) { addRollChip(pre); const p = document.createElement('p'); p.textContent = S.enc.narr[S.enc.narr.length - 1]; $('enc-narr').appendChild(p); }
          G.encFinish(S); save(); encNext(); return;
        }
        case 'encclose': encClose(); return;
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
    document.addEventListener('input', e => {
      const el = e.target; if (!el.dataset || el.dataset.act !== 'comp' || !S) return;
      const t = el.dataset.t; let n = +el.value;
      if (n > 0 && !ui.comp[t] && compList().length >= G.MAX_ATTACK_STACKS) { n = 0; el.value = 0; toast(`At most ${G.MAX_ATTACK_STACKS} kinds of monster in one war party.`, 'bad'); }
      if (n > 0) ui.comp[t] = n; else delete ui.comp[t];
      const lab = $('gn-' + t); if (lab) lab.textContent = n;
      ui.fair = null; scheduleMeter(); paintComposerBtns();
    });
    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!ui.active) { if (e.key === 'Escape' && ui.modal && document.querySelector('#modal [data-act="close"]')) closeModal(); return; }
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (ui.modal) { if (S.phase === 'encounter') return; if (!document.querySelector('#modal [data-act="close"]')) return; closeModal(); return; }
        if (ui.screen && ui.tvSel) { ui.tvSel = null; updateViewCard(); return; }
        if (ui.screen) { closeScreen(); return; }
        if (ui.place || ui.mode) { ui.place = null; ui.mode = null; renderSide(); drawMap(); return; }
        if (ui.sel) { ui.sel = null; ui.mbuild = false; renderSide(); drawMap(); }
        return;
      }
      if (ui.modal || ui.screen) return;
      const k = e.key.toLowerCase();
      if (k === 'p' && S.phase === 'map') { showParty(); return; }
      if (S.phase === 'map') {
        if (k === 'e') { endDay(); return; }
        if (k === 'i' || k === '.') { if (!ui.moving) nextIdle(e.shiftKey); return; }
        if (selMinions().length && !ui.moving && { m: 1, b: 1 }[k]) { const b = document.querySelector(`[data-act="m${k === 'm' ? 'move' : 'build'}"]`); if (b) b.click(); return; }
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
    try { if (localStorage.getItem('bts-mini') === '0') toggleMini(false); } catch (e) { /* storage unavailable */ }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawMap(); kick(); });
  }
  /* ============ entering and leaving a campaign (the title screen lives in front.js) ============ */
  let booted = false;
  function ensureBoot() { if (!booted) { booted = true; boot(); } }
  function resetUi() {
    clearTimeout(ui.meterT); ui.meterTok++; ui.reachCache = null; ui.night = null;
    Object.assign(ui, { mode: null, fog: null, threat: null, broute: null, place: null, mbuild: false, hoverMin: null, miniCam: '', tool: null, sel: null, moving: false, anim: null, manim: null, est: null, estKey: '', finaleEst: null, screen: null, playing: false, view: {}, floats: [], fx: [], deploySel: null, trapMode: false, reach: null, reachKey: '', comp: {}, meter: null, fair: null, autoBattle: true });
    terrainKey = null; miniBase = null;
  }
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
      { const c = opts.fresh ? G.siteOf(S, 'tower') : S.party; sizeMap(); centerOn(c.x, c.y, true); } commit(); drawMap();
      if (S.phase === 'battle' && S.battle) enterBattle();
      else if (S.phase === 'encounter' && S.enc) showEncounter();
      else if (S.phase === 'week') showWeek();
      else if (S.phase === 'over') showOver();
      else if (opts.fresh) showRules(true);
      morning();
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
    const d = G.newGame(4242, { party: G.DEFAULT_PARTY });
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
  window.__bts = { state: () => S, ui, vo: () => VO, bark: (c, w, o) => bark(c, w, o), TILE, minionScreen, tileScreen, centerOn: (x, y) => { centerOn(x, y, true); drawMap(); }, enterBattle: () => enterBattle(), commit: () => commit(), openScreen: k => openScreen(k), renderSide: () => renderSide(), findFair: () => findFair(), showOver: () => showOver(), spellbook: () => spellbook(), select: sel => { ui.sel = sel; renderSide(); drawMap(); }, showWeek: () => showWeek(), showVillainUps: () => showVillainUps(), dawn: () => dawn() };
})();
