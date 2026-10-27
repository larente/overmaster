/* Overmaster — adventure-map edition v3. Pure game logic, no DOM. */
const Game = (() => {
  'use strict';

  /* ================= dice ================= */
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = Math.random;
  const setRng = f => { rng = f; };
  const rint = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const chance = p => rng() < p;
  const pick = a => a[Math.floor(rng() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ================= map data ================= */
  // 0.31: the map's size belongs to the campaign. New ones are 80 x 56; saves from before keep 40 x 28. useSize() is
  // called by newGame and migrate, so everything below works on the campaign that's open.
  let MW = 40, MH = 28;
  const MAP_SMALL = [40, 28], MAP_BIG = [80, 56];
  function useSize(w, h) { MW = w || MAP_SMALL[0]; MH = h || MAP_SMALL[1]; }
  const sizeKey = () => MW + 'x' + MH;
  const mapScale = () => Math.min(MW / MAP_SMALL[0], MH / MAP_SMALL[1]);   // 1 on the old maps, 2 on the big ones
  const TERRAIN = {
    grass: { cost: 10, name: 'Grassland' }, dirt: { cost: 10, name: 'Rough dirt' }, forest: { cost: 15, name: 'Forest' },
    swamp: { cost: 17, name: 'Swamp' }, snow: { cost: 15, name: 'Snowfield' }, waste: { cost: 12, name: 'Ashen waste' },
    water: { cost: Infinity, name: 'Lake' }, mount: { cost: Infinity, name: 'Mountains' }
  };
  const ROAD_COST = 7;
  const MP_PER_DAY = 110;
  const SIGHT = 4.5;
  const WEEKS = 4;

  const SITES = [
    { id: 'town', kind: 'town', name: 'Millbrook', x: 11, y: 14, base: 'grass', text: 'The party\'s home town. Resting here fully heals everyone and restores spells. Fallen heroes are replaced at the tavern.' },
    { id: 'woods', kind: 'landmark', name: "Hermit's Glade", region: 'Whispering Woods', x: 6, y: 6, base: 'forest', drive: 'duty', text: 'Frightened villagers hide here. Heroes driven by duty will want to help.' },
    { id: 'mine', kind: 'landmark', name: 'Old Silver Mine', region: 'The Silver Hills', x: 22, y: 4, base: 'dirt', drive: 'greed', text: 'The seams were never empty. Greedy heroes want to stake a claim.' },
    { id: 'crypt', kind: 'landmark', name: 'Sunken Crypt', region: 'Mirefen', x: 7, y: 23, base: 'swamp', drive: 'curiosity', text: 'Carved in a script nobody alive can read. Curious heroes are desperate to see it.' },
    { id: 'peaks', kind: 'landmark', name: "Giant's Overlook", region: 'Shattered Peaks', x: 32, y: 8, base: 'snow', drive: 'glory', text: 'Where heroes go to prove themselves. Glory seekers want to stand on top.' },
    { id: 'tower', kind: 'tower', name: 'The Dark Tower', region: 'The Ashlands', x: 34, y: 23, base: 'waste', text: 'Your citadel, and your villain\'s lair. The villain rides out from here at your command, and the heroes storm it for the final showdown.' }
  ];

  /* ================= grid pathfinding ================= */
  const DIRS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4], [1, -1, 1.4], [-1, 1, 1.4], [-1, -1, 1.4]];
  function heapPush(h, item) { h.push(item); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  function heapPop(h) {
    const top = h[0]; const last = h.pop();
    if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
    return top;
  }
  // Dijkstra over the tile grid. enterCost(x,y) -> cost or Infinity. terminal(x,y) -> can enter but not leave.
  function dijkstra(sx, sy, enterCost, terminal, stopAt) {
    const N = MW * MH; const dist = new Float64Array(N).fill(Infinity); const prev = new Int32Array(N).fill(-1);
    const s = sy * MW + sx; dist[s] = 0; const h = [[0, s]];
    while (h.length) {
      const [d, i] = heapPop(h);
      if (d > dist[i]) continue;
      if (stopAt !== undefined && i === stopAt) break;
      const x = i % MW, y = (i / MW) | 0;
      if (i !== s && terminal && terminal(x, y)) continue;
      for (const [dx, dy, m] of DIRS8) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        if (dx && dy && (!isFinite(enterCost(x + dx, y)) || !isFinite(enterCost(x, y + dy)))) continue;
        const c = enterCost(nx, ny); if (!isFinite(c)) continue;
        const nd = d + c * m; const j = ny * MW + nx;
        if (nd < dist[j]) { dist[j] = nd; prev[j] = i; heapPush(h, [nd, j]); }
      }
    }
    return { dist, prev };
  }
  function tracePath(prev, from, to) {
    const out = []; let i = to;
    while (i !== -1 && i !== from) { out.push([i % MW, (i / MW) | 0]); i = prev[i]; }
    if (i === -1) return null;
    return out.reverse();
  }

  /* ================= layout: where the sites and lakes go ================= */
  // Every campaign gets its own map: the six sites (Millbrook, the Dark Tower and the four landmarks) and the lakes are
  // placed from the seed. Millbrook and the tower start far apart; the landmarks spread out between and around them.
  // Saves from before 0.14 keep the classic layout (s.layout === 'classic'), so their maps don't change under them.
  const CLASSIC_LAKES = [{ x: 19.5, y: 18, rx: 5.2, ry: 3.1 }];
  const TOWER_MIN = 26, MARK_MIN = 9, EDGE = 4, NEAR_RING = [8, 12.5], FAR_RING = [12, 25];
  // 0.31: on the big map things spread out, though not twice as far: the tower is a few days' walk from Millbrook
  const LAYOUT_BIG = { tower: 36, mark: 12, edge: 5, near: [10, 17], far: [16, 34], toTower: 22, fromTower: 10, lakes: [2, 3], lakeK: 1.4, lakeGap: 14 };
  function genLayout(seed) {
    const r = mulberry((seed * 31 + 17) | 0);
    const big = mapScale() > 1.5;
    const TOWER_MIN = big ? LAYOUT_BIG.tower : 26, MARK_MIN = big ? LAYOUT_BIG.mark : 9, EDGE = big ? LAYOUT_BIG.edge : 4, NEAR_RING = big ? LAYOUT_BIG.near : [8, 12.5], FAR_RING = big ? LAYOUT_BIG.far : [12, 25];
    const at = () => [EDGE + Math.floor(r() * (MW - 2 * EDGE)), EDGE + Math.floor(r() * (MH - 2 * EDGE))];
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (let tries = 0; tries < 500; tries++) {
      const town = at(); let tower = null;
      for (let k = 0; k < 80 && !tower; k++) { const p = at(); if (d(p, town) >= TOWER_MIN) tower = p; }
      if (!tower) continue;
      // two landmarks close to Millbrook, two farther out (the classic map's pacing); which ones is random
      const ids = ['woods', 'mine', 'crypt', 'peaks']; for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      const need = Math.max(big ? 9 : 6, MARK_MIN - tries / 80); const marks = []; let ok = true;
      for (let n = 0; n < 4 && ok; n++) {
        // ...and one of the far ones out toward the Dark Tower, so the journey leads into the villain's country
        const [lo, hi] = n < 2 ? NEAR_RING : FAR_RING; const towardTower = n === 2; let got = null;
        const fromT = big ? LAYOUT_BIG.fromTower : 8, toT = big ? LAYOUT_BIG.toTower : 16;
        for (let k = 0; k < 200 && !got; k++) { const p = at(); const dt = d(p, town), dw = d(p, tower); if (dt >= lo && dt <= hi && dw >= fromT && (!towardTower || dw <= toT) && marks.every(m => d(p, m) >= need)) got = p; }
        if (got) marks.push(got); else ok = false;
      }
      if (!ok) continue;
      const pos = { town, tower }; ids.forEach((id, i) => { pos[id] = marks[i]; });
      // one or two lakes, clear of every site
      const lakes = []; const nl = big ? (r() < 0.5 ? LAYOUT_BIG.lakes[1] : LAYOUT_BIG.lakes[0]) : r() < 0.55 ? 2 : 1;
      const lk = big ? LAYOUT_BIG.lakeK : 1, gap = big ? LAYOUT_BIG.lakeGap : 10;
      for (let k = 0; k < 160 && lakes.length < nl; k++) {
        const L = { x: 6 + r() * (MW - 12), y: 6 + r() * (MH - 12), rx: (2.8 + r() * 2.6) * lk, ry: (1.9 + r() * 1.4) * lk };
        if (Object.values(pos).every(p => Math.hypot((p[0] - L.x) / (L.rx + 2.6), (p[1] - L.y) / (L.ry + 2.6)) > 1) && lakes.every(o => Math.hypot(o.x - L.x, o.y - L.y) > gap)) lakes.push(L);
      }
      return { pos, lakes };
    }
    return null;
  }
  const layoutCache = {};
  function layoutOf(s) {
    const key = s.layout === 'classic' ? 'classic' : s.seed + ':' + sizeKey();
    if (layoutCache[key]) return layoutCache[key];
    let L = s.layout === 'classic' ? null : genLayout(s.seed);
    const sites = SITES.map(z => Object.assign({}, z, L ? { x: L.pos[z.id][0], y: L.pos[z.id][1] } : {}));
    return (layoutCache[key] = { sites, lakes: L ? L.lakes : CLASSIC_LAKES, classic: !L });
  }
  // this campaign's sites, with their places on its map
  const sitesOf = s => layoutOf(s).sites;
  const siteOf = (s, id) => layoutOf(s).sites.find(z => z.id === id);

  /* ================= map generation ================= */
  function genMap(seed, lay) {
    lay = lay || { sites: SITES, lakes: CLASSIC_LAKES };
    const SITES_ = lay.sites; const P = id => SITES_.find(z => z.id === id);
    const r = mulberry(seed);
    const noise = scale => {
      const gw = Math.ceil(MW / scale) + 3, gh = Math.ceil(MH / scale) + 3;
      const g = Array.from({ length: gw * gh }, () => r());
      const sm = t => t * t * (3 - 2 * t);
      return (x, y) => {
        const fx = Math.max(0, x) / scale, fy = Math.max(0, y) / scale;
        const x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = sm(fx - x0), ty = sm(fy - y0);
        const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
        const top = a + (b - a) * tx, bot = c + (d - c) * tx; return top + (bot - top) * ty;
      };
    };
    const nA = noise(4), nB = noise(2.6), nC = noise(6.5);
    // each landmark sits in its own kind of country; the classic map nudged a few region centres off their sites
    const NUDGE = lay.classic === false ? {} : { woods: [1, 0], mine: [0, 1], crypt: [1, -1], tower: [-1, -1] };
    const rk = mapScale() > 1.5 ? 1.5 : 1;   // 0.31: wider regions on the big map
    const REG = [['woods', 'forest', 7.5], ['mine', 'dirt', 6.5], ['peaks', 'snow', 7.5], ['crypt', 'swamp', 6.5], ['tower', 'waste', 6.5]]
      .map(([id, t, rad]) => { const S = P(id); const n = NUDGE[id] || [0, 0]; return { id, t, x: S.x + n[0], y: S.y + n[1], rad: rad * rk }; });
    const T = new Array(MW * MH);
    const regionOf = new Array(MW * MH).fill(null);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      let t = 'grass'; const b = nB(x, y);
      if (b > 0.74) t = 'forest'; else if (b < 0.2) t = 'dirt';
      let best = null, bd = 1e9;
      for (const g of REG) { const d = Math.hypot(x - g.x, (y - g.y) * 1.15) + (nA(x, y) - 0.5) * 5; if (d < g.rad && d < bd) { bd = d; best = g; } }
      if (best) {
        t = best.t; regionOf[y * MW + x] = best.id;
        if (best.t === 'forest' && nB(x + 50, y) < 0.24) t = 'grass';
        if (best.t === 'swamp' && nB(x, y + 40) < 0.22) t = 'grass';
        if (best.t === 'snow' && bd > best.rad - 1.6) t = nB(x, y) > 0.5 ? 'dirt' : 'snow';
        if (best.t === 'waste' && bd > best.rad - 1.2) t = 'dirt';
      }
      for (const L of lay.lakes) { const lx = (x - L.x) / L.rx, ly = (y - L.y) / L.ry; if (lx * lx + ly * ly + (nA(x + 20, y) - 0.5) * 0.9 < 1) t = 'water'; }
      const m = nC(x, y);
      if (Math.abs(m - 0.5) < 0.05 && t !== 'water') t = 'mount';
      if (best && (best.id === 'peaks' || best.id === 'mine') && nA(x + 11, y + 7) > 0.64) t = 'mount';
      if (best && best.id === 'tower' && nA(x + 5, y + 3) > 0.7) t = 'mount';
      if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) t = nB(x * 1.7, y * 1.3) > 0.4 ? 'mount' : 'water';
      T[y * MW + x] = t;
    }
    for (const S of SITES_) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = S.x + dx, y = S.y + dy;
        if (x < 1 || y < 1 || x >= MW - 1 || y >= MH - 1 || Math.hypot(dx, dy) > 2.3) continue;
        const i = y * MW + x;
        if (T[i] === 'mount' || T[i] === 'water' || (dx === 0 && dy === 0)) T[i] = S.base;
      }
    }
    const road = new Uint8Array(MW * MH);
    const rc = { grass: 1, dirt: 1, forest: 2.5, swamp: 3, snow: 2, waste: 1.6, water: Infinity, mount: Infinity };
    const town = P('town');
    for (const S of SITES_.filter(z => z.id !== 'town')) {
      const cost = (x, y) => road[y * MW + x] ? 0.45 : rc[T[y * MW + x]];
      let res = dijkstra(town.x, town.y, cost, null, S.y * MW + S.x);
      let path = tracePath(res.prev, town.y * MW + town.x, S.y * MW + S.x);
      if (!path) {
        const n = Math.max(Math.abs(S.x - town.x), Math.abs(S.y - town.y));
        for (let k = 0; k <= n; k++) {
          const x = Math.round(town.x + (S.x - town.x) * k / n), y = Math.round(town.y + (S.y - town.y) * k / n);
          for (const [ox, oy] of [[0, 0], [1, 0], [0, 1]]) { const i = (y + oy) * MW + (x + ox); if (T[i] === 'mount' || T[i] === 'water') T[i] = 'dirt'; }
        }
        res = dijkstra(town.x, town.y, cost, null, S.y * MW + S.x);
        path = tracePath(res.prev, town.y * MW + town.x, S.y * MW + S.x) || [];
      }
      for (const [x, y] of path) road[y * MW + x] = 1;
    }
    road[town.y * MW + town.x] = 1;
    // what can be reached from town at all
    const reach = new Uint8Array(MW * MH);
    const fr = dijkstra(town.x, town.y, (x, y) => TERRAIN[T[y * MW + x]].cost, null);
    for (let i = 0; i < MW * MH; i++) if (isFinite(fr.dist[i])) reach[i] = 1;
    return { T, road, reach, regionOf };
  }
  // cache maps by seed and layout (terrain never changes during a game)
  const mapCache = {};
  function mapOf(s) { const k = s.seed + (s.layout === 'classic' ? ':c' : ':r') + ':' + sizeKey(); if (!mapCache[k]) mapCache[k] = genMap(s.seed, layoutOf(s)); return mapCache[k]; }
  const tIdx = (x, y) => y * MW + x;
  function terrainAt(s, x, y) { return mapOf(s).T[tIdx(x, y)]; }
  function tileCost(s, x, y) { const M = mapOf(s); const t = M.T[tIdx(x, y)]; if (!isFinite(TERRAIN[t].cost)) return Infinity; return M.road[tIdx(x, y)] ? ROAD_COST : TERRAIN[t].cost; }
  function regionName(s, x, y) {
    const id = mapOf(s).regionOf[tIdx(x, y)];
    if (!id) return 'The Midlands';
    const S = SITES.find(z => z.id === id); return S.region || S.name; // names don't move, only places
  }

