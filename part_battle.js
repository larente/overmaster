
  /* ================= hex battle ================= */
  const BW = 15, BH = 11;
  const hk = (c, r) => r * BW + c;
  const hc = k => ({ c: k % BW, r: (k / BW) | 0 });
  function hexNeighbors(k) {
    const { c, r } = hc(k); const odd = r & 1;
    const d = odd ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
    const out = [];
    for (const [dc, dr] of d) { const nc = c + dc, nr = r + dr; if (nc >= 0 && nr >= 0 && nc < BW && nr < BH) out.push(hk(nc, nr)); }
    return out;
  }
  function cube(k) { const { c, r } = hc(k); const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; }
  function hexDist(a, b) { const A = cube(a), B = cube(b); return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2])); }
  function cubeRound(x, y, z) {
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    const c = rx + (rz - (rz & 1)) / 2, r = rz;
    return (c >= 0 && r >= 0 && c < BW && r < BH) ? hk(c, r) : -1;
  }
  function hexLine(a, b) {
    const N = hexDist(a, b); const A = cube(a), B = cube(b); const out = [];
    for (let i = 0; i <= N; i++) {
      const t = N ? i / N : 0;
      out.push(cubeRound(A[0] + (B[0] - A[0]) * t + 1e-6, A[1] + (B[1] - A[1]) * t + 1e-6, A[2] + (B[2] - A[2]) * t - 2e-6));
    }
    return out;
  }
  const TILE_INFO = {
    rock: { name: 'Boulder', block: true, sight: true, text: 'Blocks movement and line of sight.' },
    tree: { name: 'Tree', block: true, sight: true, text: 'Blocks movement and line of sight.' },
    brush: { name: 'Brush', block: false, sight: true, cover: true, text: 'Half cover: +2 AC against ranged attacks. Blocks line of sight through it.' },
    bog: { name: 'Bog', block: false, sight: false, slow: true, text: 'Difficult ground: costs 2 movement to enter.' },
    // 0.30: Millbrook's walls, when the heroes defend the town
    wall: { name: 'Wall', block: true, sight: true, text: 'Millbrook\'s wall. Blocks movement and line of sight: your monsters have to come through the gate or a breach.' }
  };
  function los(b, a, z) {
    const L = hexLine(a, z);
    for (let i = 1; i < L.length - 1; i++) { const t = b.tiles[L[i]]; if (t && TILE_INFO[t].sight) return false; }
    return true;
  }
  const conscious = u => u.alive && !u.down;
  // 0.31: in a duel, a band of the wilds stands on the heroes' side of the field; only real heroes get heroes' rules
  const isHero = u => u.side === 'party' && !u.wild;
  const isHeroUnit = isHero;
  const unitAt = (b, k) => b.units.find(u => u.alive && u.pos === k);
  const foesOf = (b, u) => b.units.filter(x => x.side !== u.side && conscious(x));
  const totalHp = u => u.alive ? (u.count - 1) * u.maxHp + u.hp : 0;

  function heroUnit(h, f, s) {
    const st = heroStats(h, f, s);
    const R = RACES[h.race] || RACES.human;
    return { id: 'h-' + h.id, side: 'party', hero: h.id, cls: h.cls, race: h.race || 'human', icon: 'hero-' + h.id, name: h.name, count: 1, hp: h.hp, maxHp: h.maxHp,
      hit: st.hit, ac: st.ac, dice: st.dice, extra: st.extra, spd: st.spd, save: st.save, ranged: CLASSES[h.cls].ranged, shots: Infinity, flyer: false,
      ab: h.ab.slice(), mana: h.mana, maxMana: h.maxMana, alive: true, down: h.status !== 'ok' || h.hp <= 0, retal: true, defending: false,
      relentless: 0, relentMax: (has(h, 'relentless') ? (has(h, 'undying') ? 2 : 1) : 0) + (R.relent || 0), lucky: !!R.lucky, savage: !!R.savage, miracle: false, ward: has(h, 'greaterward') ? 50 : has(h, 'ward') ? 20 : 0, saves: 0, fails: 0, pos: 0, level: h.level,
      attacks: has(h, 'avatar') ? 2 : 1, stroke: false, timestop: false };
  }
  function stackUnit(type, count, id) {
    const c = CREATURES[type];
    return { id, side: 'dm', type, icon: type, name: c.name, one: c.one, count, hp: c.hp, maxHp: c.hp, hit: c.hit, ac: c.ac, dice: c.dice.slice(), extra: [], sv: c.sv,
      spd: c.spd, ranged: !!c.shooter, shots: c.shots || 0, flyer: !!c.flyer, regen: !!c.regen, drain: !!c.drain, breath: !!c.breath, undead: !!c.undead,
      attacks: c.attacks || 1, alive: true, down: false, retal: true, defending: false, pos: 0, startCount: count, turns: 0 };
  }
  // on the throne the villain fights in its true, level 20 form (FINAL is the classic baseline the types are tuned against)
  const FINAL = { hp: 3000, hit: 17, ac: 21, dice: [2, 10, 20], attacks: 3, rend: [6, 10, 20], rendDC: 20, spd: 7, sv: 8 };
  // 0.30: the villain starts at level 1 and levels up on Infamy. In the throne room it fights at the level it has
  // reached: the level 20 form scaled down (q = 0 at level 1, 1 at level 20). Its signature powers come one at a time.
  const POWER_LV = [1, 6, 11, 16];
  const throneScale = L => { const q = clamp((L - 1) / 19, 0, 1); return { q, hp: 0.12 + 0.88 * Math.pow(q, 1.15) }; };   // 0.30: a little stronger in the middle levels, so a villain a level or two ahead can hold
  function bossUnit(L, up, final, type, name) {
    up = up || {};
    const T = BOSS_TYPES[type] || BOSS_TYPES.lich; const F = T.F; const tk = BOSS_TYPES[type] ? type : 'lich';
    L = clamp(Math.round(L || BOSS_LEVEL), 1, BOSS_LEVEL); const Q = throneScale(L);
    // the map form keeps the classic projection's scale, shifted by how this type differs from the baseline
    const hpBase = final ? F.hp * Q.hp : (50 + 45 * L) * (F.hp / 2700);
    const hp = Math.round(hpBase * (1 + 0.1 * (up.vigor || 0)) * (up.ritual ? 1.1 : 1) * (1 + (up.hpPct || 0))); // (0.16: halved; 0.24: talents add hpPct)
    const P = {}; T.powers.forEach((k, i) => { if (L >= (POWER_LV[i] || 1)) P[k] = true; });
    const fDice = [F.dice[0], F.dice[1], Math.round(F.dice[2] * (0.3 + 0.7 * Q.q))];
    const u = { id: 'boss', side: 'dm', type: 'king', btype: tk, icon: T.icon, name: name || T.names[0], one: name || T.names[0], boss: true, count: 1, hp, maxHp: hp, level: L,
      hit: (final ? F.hit - Math.round((1 - Q.q) * 7) : 5 + Math.floor(L / 2) + (F.hit - 17)) + (up.ritual ? 1 : 0) + (up.hitBonus || 0), ac: final ? F.ac - Math.round((1 - Q.q) * 6) : 14 + Math.floor(L / 3) + (F.ac - 21),
      dice: final ? fDice : [2, 8, Math.round((2 + L) * F.dice[2] / 18)], extra: [], sv: final ? F.sv - Math.round((1 - Q.q) * 4) : 4 + (F.sv - 8), spd: final ? F.spd : Math.max(5, F.spd - 1),
      attacks: final ? (L < 6 ? 1 : L < 13 ? Math.min(2, F.attacks) : F.attacks) : Math.min(2, F.attacks), ranged: !!F.ranged, shots: F.ranged ? 99 : 0, flyer: !!F.flyer, undead: tk === 'lich' || tk === 'vampire' || tk === 'deathknight', drain: !!F.drain,
      alive: true, down: false, retal: true, defending: false, pos: 0, startCount: 1, turns: 0, final: !!final,
      // the signature powers: area damage dice and DC scale with level
      aoe: final ? [2 + Math.round(4 * Q.q), 10, Math.round(20 * Q.q)] : [2, 8, L], aoeDC: final ? 11 + Math.floor(L / 2) : 11 + Math.floor(L / 2), P, cd: {}, used: {},
      servants: !!(P.servants || up.raise), servantsBoost: !!(P.servants && up.raise), raised: false, dread: !!up.dread || !!P.fear,
      images: P.images ? 3 : 0, phyl: !!(P.phylactery && final) };
    // powers on a cooldown start partly charged: soul rend and meteors need two turns, breath starts ready
    if (P.rend) u.cd.rend = 2; if (P.meteor) u.cd.meteor = 2; if (P.charm) u.cd.charm = 1; if (P.hellfire) u.cd.hellfire = 1; if (P.orb) u.cd.orb = 1; if (P.blink) u.cd.blink = 0; if (P.breath) u.cd.breath = 0;
    return u;
  }
  // what each villain's signature powers look like on the battle bar; ready = can be used this turn
  function bossPowers(b, u) {
    if (!u || !u.boss || !u.P) return [];
    const out = []; const add = (key, ready, why) => out.push({ key, name: BOSS_POWERS[key].name, text: BOSS_POWERS[key].text, ready, why: ready ? '' : why });
    const heroes = foesOf(b, u);
    const cdTxt = k => `Ready in ${u.cd[k]} turn${u.cd[k] > 1 ? 's' : ''}.`;
    if (u.P.rend) add('rend', !u.cd.rend, cdTxt('rend'));
    if (u.P.meteor) add('meteor', !u.cd.meteor, cdTxt('meteor'));
    if (u.P.breath) add('breath', !u.cd.breath && heroes.length > 0, u.cd.breath ? 'Recharging. Each turn it recharges on a roll of 5 or 6.' : 'No target.');
    if (u.P.hellfire) add('hellfire', !u.cd.hellfire && heroes.some(h => los(b, u.pos, h.pos)), u.cd.hellfire ? cdTxt('hellfire') : 'No hero in sight.');
    if (u.P.orb) add('orb', !u.cd.orb && heroes.some(h => los(b, u.pos, h.pos)), u.cd.orb ? cdTxt('orb') : 'No hero in sight.');
    if (u.P.charm) add('charm', !u.cd.charm && heroes.length > 0, cdTxt('charm'));
    if (u.P.blink) add('blink', !u.cd.blink && !u.blinked, u.blinked ? 'Already blinked this turn.' : cdTxt('blink'));
    if (u.servants) add('servants', !u.raised && u.hp < u.maxHp * 0.6, u.raised ? 'Already called this battle.' : 'Only below 60% HP.');
    if (u.P.timestop) add('timestop', !u.stopped && u.hp < u.maxHp * 0.5, u.stopped ? 'Already used this battle.' : 'Only below half HP.');
    return out;
  }

  function makeField(r, terrain) {
    const P = { grass: [3, 1, 6, 0], forest: [1, 6, 5, 0], swamp: [1, 2, 3, 6], snow: [3, 2, 3, 0], waste: [5, 0, 2, 2], dirt: [4, 1, 4, 1], water: [3, 1, 6, 0], mount: [6, 0, 3, 0] }[terrain] || [3, 1, 5, 0];
    for (let attempt = 0; attempt < 25; attempt++) {
      const tiles = {};
      const put = (type, n) => { let g = 0; while (n > 0 && g++ < 300) { const k = hk(3 + Math.floor(r() * 9), Math.floor(r() * BH)); if (tiles[k]) continue; tiles[k] = type; n--; } };
      const cluster = (type, n, cmin, cmax) => {
        let g = 0;
        while (n > 0 && g++ < 200) {
          let k = hk(cmin + Math.floor(r() * (cmax - cmin + 1)), Math.floor(r() * BH)); const size = 1 + Math.floor(r() * 3);
          for (let i = 0; i < size && n > 0; i++) { const { c } = hc(k); if (!tiles[k] && c >= cmin && c <= cmax) { tiles[k] = type; n--; } const nb = hexNeighbors(k); k = nb[Math.floor(r() * nb.length)]; }
        }
      };
      put('rock', P[0] + Math.floor(r() * 2)); put('tree', P[1] + Math.floor(r() * 2));
      cluster('brush', P[2] + Math.floor(r() * 3), 2, 12); cluster('bog', P[3] + Math.floor(r() * 2), 3, 11);
      // the two sides must be able to reach each other
      const seen = new Set([hk(1, 5)]); const q = [hk(1, 5)];
      while (q.length) { const k = q.pop(); for (const n of hexNeighbors(k)) { if (seen.has(n) || (tiles[n] && TILE_INFO[tiles[n]].block)) continue; seen.add(n); q.push(n); } }
      if (seen.has(hk(13, 5)) && seen.has(hk(13, 2)) && seen.has(hk(13, 8))) return tiles;
    }
    return {};
  }
  // 0.30: the field outside Millbrook's gates. Its wall runs down the heroes' side with the gate in the middle;
  // a battered wall has breaches, more the worse it is. Out front, a little brush and a rock or two.
  const WALL_COL = 3;
  function makeSiegeField(r, intact) {
    for (let attempt = 0; attempt < 25; attempt++) {
      const tiles = {};
      for (let row = 0; row < BH; row++) if (row < 4 || row > 6) tiles[hk(WALL_COL, row)] = 'wall';
      const holes = intact >= 0.99 ? 0 : intact > 0.6 ? 1 : intact > 0.25 ? 2 : 3;
      for (let i = 0; i < holes; i++) { const row = [1, 8, 2, 9, 0, 10][Math.floor(r() * 6)]; delete tiles[hk(WALL_COL, row)]; }
      const put = (type, n, cmin, cmax) => { let g = 0; while (n > 0 && g++ < 300) { const k = hk(cmin + Math.floor(r() * (cmax - cmin + 1)), Math.floor(r() * BH)); if (tiles[k]) continue; tiles[k] = type; n--; } };
      put('brush', 3 + Math.floor(r() * 3), 5, 12); put('rock', 1 + Math.floor(r() * 2), 6, 11);
      const seen = new Set([hk(1, 5)]); const q = [hk(1, 5)];
      while (q.length) { const k = q.pop(); for (const n of hexNeighbors(k)) { if (seen.has(n) || (tiles[n] && TILE_INFO[tiles[n]].block)) continue; seen.add(n); q.push(n); } }
      if (seen.has(hk(13, 5)) && seen.has(hk(13, 2)) && seen.has(hk(13, 8))) return tiles;
    }
    return {};
  }
  // 0.31: where a band of the wilds lines up in a duel: the heroes' side, front columns first
  const WILD_POS = []; for (const c of [1, 2, 0]) for (const r of [5, 3, 7, 1, 9, 4, 6]) WILD_POS.push(hk(c, r));
  // starting hexes: wizards in the back row, everyone else in front, in party order
  const FRONT = [hk(1, 3), hk(1, 5), hk(1, 7), hk(1, 1), hk(1, 9)], BACK = [hk(0, 5), hk(0, 3), hk(0, 7), hk(0, 1)];
  const PREF = { barbarian: [0, 2, 1, 3, 4], rogue: [2, 0, 1, 4, 3], cleric: [1, 0, 2, 3, 4] };
  function heroPositions(heroes) {
    const used = new Set(); const out = {};
    for (const h of heroes) {
      const opts = h.cls === 'wizard' ? BACK.concat(FRONT) : (PREF[h.cls] || [0, 1, 2, 3, 4]).map(i => FRONT[i]).concat(BACK);
      const k = opts.find(x => !used.has(x)); used.add(k); out[h.id] = k;
    }
    return out;
  }
  const DM_POS = [hk(13, 5), hk(13, 2), hk(13, 8), hk(14, 0), hk(14, 10), hk(14, 4), hk(14, 6), hk(12, 4), hk(12, 6), hk(12, 1), hk(12, 9), hk(13, 3), hk(13, 7), hk(11, 5), hk(14, 2), hk(14, 8)];
  // a stack fights as several small groups, so one lucky roll can't drop a hero: about three per group, big monsters alone
  const GROUP = { goblin: 3, skeleton: 3, wolf: 3, bandit: 3, orc: 3, wraith: 2, knight: 2, ogre: 1, troll: 1, giant: 1, dragon: 1, vampire: 1, hydra: 1, demon: 1 };
  const MAX_GROUPS = 12;
  function splitStacks(stacks, cap) {
    const want = stacks.map(([t, n]) => Math.max(1, Math.min(n, Math.ceil(n / (GROUP[t] || 3)))));
    let g = want.slice(); const tot = sum(want, x => x);
    if (tot > cap) { g = want.map(w => Math.max(1, Math.floor(w * cap / tot))); while (sum(g, x => x) > cap && g.some(x => x > 1)) { const i = g.indexOf(Math.max.apply(null, g)); g[i]--; } }
    const out = [];
    stacks.forEach(([t, n], i) => { const k = Math.max(1, Math.min(g[i], n)); const base = Math.floor(n / k), extra = n % k; for (let j = 0; j < k; j++) out.push([t, base + (j < extra ? 1 : 0), i]); });
    return out;
  }
  // free hexes on your side of the field for new arrivals
  function dmFreeHexes(b, near) {
    const occ = occupied(b); const out = [];
    for (const k of DM_POS.concat(near || [])) if (!occ.has(k) && out.indexOf(k) < 0) out.push(k);
    for (let c = 14; c >= 9 && out.length < 24; c--) for (let r = 0; r < BH; r++) { const k = hk(c, r); if (!occ.has(k) && out.indexOf(k) < 0) out.push(k); }
    return out;
  }
  function addGroups(b, type, n, near) {
    const parts = splitStacks([[type, n]], 4); const spots = dmFreeHexes(b, near); const made = [];
    for (const [t, c] of parts) { const k = spots.shift(); if (k === undefined) break; const u = stackUnit(t, c, 'm' + (b.uid++)); if (b.tstate) talentMod(b.tstate, u); u.pos = k; b.units.push(u); b.waitQ.push(u.id); made.push(u); }
    // whatever didn't fit joins the last group
    const placed = sum(made, u => u.count); if (made.length && placed < n) { const L = made[made.length - 1]; L.count += n - placed; L.startCount = L.count; }
    return made;
  }
  // a levelled band: +2 to hit, +1 AC, +30% hit points and +1 damage a level
  function veteran(u, L) { const d = L - 1; u.hit += 2 * d; u.ac += d; u.hp = u.maxHp = Math.round(u.maxHp * (1 + 0.3 * d)); u.dice = u.dice.slice(); u.dice[2] += d; u.lvl = L; }
  function startBattle(s, stackObj, opts) {
    opts = opts || {};
    const f = partyFlags(s.heroes); const units = [];
    const hp0 = heroPositions(s.heroes.filter(h => h.status === 'ok'));
    // 0.31: a duel is your villain alone against a band of the wilds: no heroes on the field
    if (!opts.duel) for (const h of s.heroes) { if (h.status !== 'ok') continue; const u = heroUnit(h, f, s); u.pos = hp0[h.id]; units.push(u); }
    let k = 0;
    if (opts.boss) { const B = bossUnit(opts.bossL || avgLevel(s), s.villain.up, !!opts.finale, s.villain.type, vName(s)); B.escapes = !opts.finale; B.pos = DM_POS[k++]; if (!opts.finale) B.hp = Math.max(1, Math.round(B.maxHp * clamp(s.villain.hpFrac === undefined ? 1 : s.villain.hpFrac, 0.1, 1))); units.push(B); }
    const stacks = opts.stacks || [[stackObj.type, stackObj.count]];
    const command = opts.boss && vType(s).powers.indexOf('command') >= 0;
    const lvl = opts.lvl || (stackObj && stackObj.lvl) || 1;
    if (opts.duel) {
      // the band lines up where the heroes would; your talents don't help monsters that aren't yours
      let j = 0;
      for (const [t, n, src] of splitStacks(stacks, MAX_GROUPS - k)) { if (j >= WILD_POS.length) break; const u = stackUnit(t, n, 'w' + j); u.src = src; u.side = 'party'; u.wild = true; if (lvl > 1) veteran(u, lvl); u.pos = WILD_POS[j++]; units.push(u); }
    } else
    for (const [t, n, src] of splitStacks(stacks, MAX_GROUPS - k)) { if (k >= DM_POS.length) break; const u = talentMod(s, stackUnit(t, n, 'm' + k)); u.src = src; if (command && u.type === 'knight') { u.hit += 2; u.commanded = true; } if (lvl > 1) veteran(u, lvl); u.pos = DM_POS[k++]; units.push(u); }
    const terrain = opts.finale ? 'waste' : opts.siege ? 'grass' : opts.duel && stackObj ? terrainAt(s, stackObj.x, stackObj.y) : terrainAt(s, s.party.x, s.party.y);
    const fr = mulberry((s.seed + s.week * 97 + s.day * 13 + s.party.x * 7 + s.party.y + (s.uid || 0) * 31) | 0);
    const tiles = opts.siege ? makeSiegeField(fr, s.town ? (s.town.wallHp || 0) / Math.max(1, WALL_HP[townLv(s, 'walls')] || 1) : 1) : makeField(fr, terrain);
    for (const u of units) if (tiles[u.pos] && TILE_INFO[tiles[u.pos]].block) delete tiles[u.pos];
    const party = units.filter(isHero);
    // a party without a cleric stocks up on healing potions in Millbrook instead
    if (!opts.duel && !party.some(u => u.cls === 'cleric')) for (const u of party) u.potions = 2;
    const b = {
      tstate: { talents: { r: Object.assign({}, (s.talents && s.talents.r) || {}) } },   // the DM's talents, for monsters that join mid-fight
      duel: !!opts.duel, vtype: s.villain.type, siege: !!opts.siege, wallLv: opts.siege ? townLv(s, 'walls') : 0, towers: opts.siege && s.town ? { arrows: ARROWS[townLv(s, 'watch')] || 0, bolts: BOLTS[townLv(s, 'ballista')] || 0, splash: SPLASH[townLv(s, 'arcane')] || 0, bell: townLv(s, 'bell') > 0 } : null,
      objId: stackObj ? stackObj.id : null, dungeonId: opts.dungeonId || null, guardLair: opts.guardLair || null, raidNode: opts.raidNode || null, attack: !!opts.attack, sent: opts.attack ? stacks.map(x => [x[0], x[1]]) : null, villain: !!opts.boss, finale: !!opts.finale, stage: opts.stage || 0, terrain, boss: !!opts.boss,
      round: 1, units, tiles, traps: [], freeTraps: opts.dungeonId ? 2 : opts.stage === 1 ? 1 + (hasTech(s, 'forge') ? 2 : 0) : opts.finale ? 1 + (s.villain.up.traps || 0) : 0, boughtTraps: 0,
      hallowed: party.some(u => conscious(u) && u.ab.indexOf('hallowed') >= 0), intervention: party.some(u => u.ab.indexOf('intervention') >= 0), intervened: false,
      queue: [], waitQ: [], cur: null, log: [], over: null, phase: 'deploy', pendingTPK: false,
      startMax: sum(party, u => u.maxHp), dmgTaken: 0, downed: [], died: [], killedHp: 0, killed: {}, plural: {},
      dmSpellRound: 0, pull: false, softball: 0, healedFallen: false, aoeBig: false,
      roar: party.some(u => conscious(u) && u.ab.indexOf('roar') >= 0), dread: !!opts.boss && (!!s.villain.up.dread || vType(s).powers.indexOf('fear') >= 0),
      vname: vName(s), vpron: (s.villain && s.villain.pron) || 'he', vtitle: vTitle(s),
      events: [], uid: k + 1, rolls: 0
    };
    // how hard the fight looks on paper decides the experience it is worth
    const foes = units.filter(u => u.side === 'dm');
    const ePow = forcePower(foes.map(u => u.boss ? bossStats(u.level || avgLevel(s), s.villain.up, !!opts.finale, s.villain.type) : stackStats(u.type, u.count) ));
    b.ratio = partyPower(s) / Math.max(1, ePow); b.challenge = judge(b.ratio, 0);
    s.battle = b; s.phase = 'battle';
    if (!opts.duel) s.partySeen = { x: s.party.x, y: s.party.y, w: s.week, d: s.day };   // 0.31: a fight gives away where the heroes are
    const intro = opts.stage === 1 ? 'The citadel gates grind open. Your monsters pour out to defend the Dark Tower!'
      : opts.finale ? `${vFull(s)} rises from the throne. Level ${villainLevel(s)}, and ready. This is the final battle.`
      : opts.duel ? `${vName(s)} faces the ${stackObj ? CREATURES[stackObj.type].name.toLowerCase() : 'monsters'} alone. Beat them down and they may kneel.`
      : opts.boss ? `${vName(s)} and ${vP(s).his} army block the road!`
      : opts.siege ? `Your ${stackObj ? CREATURES[stackObj.type].name.toLowerCase() : 'monsters'} storm Millbrook. The heroes man the walls, and the towers take aim.`
      : opts.dungeonId ? `The garrison of the ${DUNGEONS[(s.objects.find(o => o.id === opts.dungeonId) || {}).dtype || 'warren'].name} pours out to meet them!`
      : opts.guardLair ? 'Your monsters rush out to guard the site!'
      : opts.attack ? (siteAt(s.party.x, s.party.y) && siteAt(s.party.x, s.party.y).kind === 'town' ? 'Your war party waits on the road outside Millbrook!' : `Your war party falls on the heroes in ${regionName(s, s.party.x, s.party.y)}!`)
      : stackObj ? `${quantityWord(stackObj.count)} ${CREATURES[stackObj.type].name} block the way!` : 'Ambush!';
    blog(b, intro, 'big');
    return b;
  }
  function startVillainBattle(s, finale) {
    const V = s.villain;
    const stacks = finale ? throneStacks(s) : V.army.map(a => [a.type, a.count]);
    return startBattle(s, null, { boss: true, finale: !!finale, stage: finale ? 2 : 0, stacks, bossL: finale ? villainLevel(s) : mapBossLevel(s) });
  }
  // the showdown at your citadel: the gate garrison first, then the throne room
  function startFinale(s) {
    say(s, 'The party reaches the Dark Tower. The final showdown begins!', 'boss');
    return startBattle(s, null, { finale: true, stage: 1, stacks: gateGuards(s) });
  }
  function blog(b, t, c) { b.log.push({ r: b.round, t, c: c || 'note' }); b.events.push({ t: 'log', text: t, c: c || 'note' }); }

  /* --- deployment --- */
  const isDmZone = k => hc(k).c >= 10;
  const isTrapZone = k => { const c = hc(k).c; return c >= 3 && c <= 11; };
  function deployMove(s, id, k) {
    const b = s.battle; if (!b || b.phase !== 'deploy') return 'Not deploying.';
    const u = b.units.find(x => x.id === id && x.side === 'dm'); if (!u) return 'Pick one of your stacks.';
    if (!isDmZone(k)) return 'Deploy in the right-hand columns.';
    if (unitAt(b, k)) return 'Someone is already there.';
    if (b.tiles[k] && TILE_INFO[b.tiles[k]].block) return 'Blocked.';
    u.pos = k; return null;
  }
  const TRAP_GOLD = 3; // an extra spike trap, from the tower's purse
  // the purse a DM spell is paid from: Millbrook's for the ones that help the heroes, the tower's for the rest
  const spellPurse = (s, sp) => sp.purse === 'town' ? (s.town ? s.town.res : { gold: 0 }) : s.res;
  function deployTrap(s, k) {
    const b = s.battle; if (!b || b.phase !== 'deploy') return 'Not deploying.';
    if (!isTrapZone(k)) return 'Traps go in the middle of the field.';
    if (unitAt(b, k) || (b.tiles[k] && TILE_INFO[b.tiles[k]].block)) return 'Can\'t trap that hex.';
    const ex = b.traps.find(t => t.k === k);
    if (ex) { b.traps = b.traps.filter(t => t !== ex); if (!ex.free) { s.res.gold += TRAP_GOLD; b.boughtTraps--; } return null; }
    const free = b.traps.filter(t => t.free).length < b.freeTraps;
    if (!free) { if (b.boughtTraps >= 3) return 'At most three extra traps.'; if ((s.res.gold || 0) < TRAP_GOLD) return `You need ${TRAP_GOLD} gold.`; s.res.gold -= TRAP_GOLD; b.boughtTraps++; }
    b.traps.push({ k, free, L: avgLevel(s) });
    return null;
  }
  function beginBattle(s) {
    const b = s.battle; if (!b || b.phase !== 'deploy') return;
    b.phase = 'fight'; b.events = [];
    if (b.traps.length) blog(b, `You hide ${b.traps.length} spike trap${b.traps.length > 1 ? 's' : ''} in the grass.`, 'dm');
    blog(b, 'Round 1', 'round');
    newRound(b);
  }

  /* --- turns --- */
  // 0.30: when the heroes defend Millbrook, its towers shoot at your monsters at the start of every round
  function towerVolley(b) {
    const T = b.towers; if (!T) return;
    const foes = () => b.units.filter(u => u.side === 'dm' && u.alive);
    const hits = []; const holyMul = u => u.undead && T.bell ? 1.5 : 1;
    if (T.arrows) { const f = foes().sort((a, z) => totalHp(a) - totalHp(z)); if (f.length) { applyDamage(b, f[0], Math.round(T.arrows * holyMul(f[0])), null, 'ranged'); hits.push(f[0].id); } }
    for (let i = 0; i < T.bolts; i++) { const f = foes().sort((a, z) => z.maxHp - a.maxHp); if (!f.length) break; applyDamage(b, f[0], Math.round(BOLT_DMG * holyMul(f[0])), null, 'ranged'); hits.push(f[0].id); }
    if (T.splash) for (const u of foes().slice(0, 4)) { applyDamage(b, u, Math.round(T.splash * Math.min(u.count, 3) * holyMul(u)), null, 'aoe'); hits.push(u.id); }
    if (T.bell) for (const u of foes().filter(x => x.undead)) { applyDamage(b, u, HOLY * Math.min(u.count, 3), null, 'aoe'); hits.push(u.id); }
    if (hits.length) { b.events.push({ t: 'spell', name: 'Millbrook\'s towers', fx: 'arrow', targets: hits.filter((id, i, a) => a.indexOf(id) === i) }); blog(b, 'Millbrook\'s towers loose a volley at your monsters.', 'note'); }
    if (!b.units.some(u => u.side === 'dm' && u.alive)) b.over = 'win';
  }
  function newRound(b) {
    if (b.towers) { towerVolley(b); if (b.over) return; }
    const alive = b.units.filter(conscious);
    alive.sort((x, y) => y.spd - x.spd || (x.side === 'party' ? -1 : 1) || (x.id < y.id ? -1 : 1));
    b.queue = alive.map(u => u.id); b.waitQ = [];
    for (const u of b.units) { u.retal = true; u.defending = false; u.uncanny = false; u.waited = false; }
    if (b.hallowed && b.round > 1) { let tot = 0; for (const u of b.units) if (u.side === 'party' && conscious(u) && u.hp < u.maxHp) { const h = Math.min(u.maxHp - u.hp, Math.ceil(u.maxHp * 0.06)); u.hp += h; tot += h; } if (tot) blog(b, `Hallowed ground mends the party (+${tot} HP).`, 'heal'); }
    b.pull = false; b.cur = null;
    nextTurn(b);
  }
  function nextTurn(b) {
    if (b.over) return;
    for (;;) {
      if (!b.queue.length && b.waitQ.length) { b.queue = b.waitQ; b.waitQ = []; }
      if (!b.queue.length) { endRound(b); return; }
      const id = b.queue.shift(); const u = b.units.find(x => x.id === id);
      if (u && conscious(u) && u.charmed) { u.charmed = false; blog(b, `${u.name} stands still, charmed, and loses the turn.`, 'boss'); continue; }
      if (u && conscious(u)) { b.cur = u.id; startTurn(b, u); return; }
    }
  }
  function startTurn(b, u) {
    // every turn: a move (split as you like), one action and one bonus action
    u.mv = u.spd; u.acted = false; u.bonused = false; u.didAttack = false; u.dashed = false; u.preDone = false; u.steps = 0; u.guard = 0; u.aim = false;
    if (u.prone) { u.prone = false; u.mv = Math.ceil(u.spd / 2); blog(b, `${u.name} get${u.count > 1 ? '' : 's'} back up.`, 'note'); }
    u.couldAttack = u.side === 'dm' && !u.boss ? options(b, u).targets.length > 0 : false;
    if (u.boss && u.P) bossTurnStart(b, u);
    if (u.regen && u.alive && u.hp < u.maxHp) { const h = Math.min(u.maxHp - u.hp, Math.max(10, Math.round(u.maxHp * 0.3))); u.hp += h; blog(b, `The ${u.name} regenerate ${h} HP.`, 'foe'); }
    else if (u.regenT && u.alive && u.hp < u.maxHp) { const h = Math.min(u.maxHp - u.hp, Math.max(3, Math.round(u.maxHp * 0.1))); u.hp += h; blog(b, `The ${u.name}'s wounds close (+${h} HP).`, 'foe'); }
  }
  function endRound(b) {
    for (const u of b.units) if (isHero(u) && u.alive && u.down && !u.stable) deathSave(b, u);
    checkEnd(b);
    if (b.over) return;
    if (b.duel) { duelRound(b); if (b.over) return; }
    if ((!b.boss || b.finale) && b.round >= 2 && !b.duel) {
      const P = b.units.filter(u => u.side === 'party');
      const ok = P.filter(conscious); const out = P.filter(u => !conscious(u)).length;
      const okFrac = sum(ok, u => u.hp) / Math.max(1, sum(ok, u => u.maxHp));
      const foes = b.units.filter(u => u.side === 'dm');
      const foeFrac = sum(foes, totalHp) / Math.max(1, sum(foes, u => u.startCount * u.maxHp));
      let p = 0;
      if (out >= 2 && okFrac < 0.5) p = 0.5; else if (okFrac < 0.25 && foeFrac > 0.35) p = 0.4;
      if (p) {
        if (ok.some(u => u.cls === 'cleric')) p += 0.2;
        if (ok.some(u => u.cls === 'barbarian')) p -= 0.2;
        if (chance(p)) { b.over = 'retreat'; blog(b, 'The party grabs its fallen and retreats from the field!', 'big'); return; }
      }
    }
    // (0.24) a fight that grinds on and on, say against monsters that heal every turn, ends with the monsters giving up
    if (b.duel && b.round >= 30) { b.over = 'fled'; blog(b, `Neither side can finish it. ${b.vname} breaks off the fight.`, 'big'); return; }
    if (!b.boss && b.round >= 40) { b.over = 'fled'; blog(b, 'After a long, grinding fight the monsters break and run.', 'big'); return; }
    b.round++;
    blog(b, `Round ${b.round}`, 'round');
    newRound(b);
  }
  function deathSave(b, u) {
    let r = d20(); let res;
    if (r === 1 && u.lucky) r = d20();
    if (r === 20) { u.down = false; u.hp = 1; u.saves = 0; u.fails = 0; res = 'crit'; }
    else { if (r === 1) u.fails += 2; else if (r >= 10) u.saves++; else u.fails++; res = r >= 10 ? 'success' : 'fail'; }
    b.events.push({ t: 'roll', kind: 'death', title: `${u.name}: death save`, who: u.name, d20: [r], nat: r, bonus: 0, extras: [], total: r, vs: 10, vsLabel: 'needs', result: res === 'crit' ? 'crit' : res, notes: [`${u.saves} saved · ${u.fails} failed`] });
    if (res === 'crit') { blog(b, `${u.name} rolls a natural 20 and staggers back up!`, 'big'); b.events.push({ t: 'revive', id: u.id }); return; }
    if (u.fails >= 3) { u.alive = false; u.dead = true; b.died.push(u.hero); blog(b, `${u.name} fails the last death save and dies.`, 'death'); b.events.push({ t: 'hit', target: u.id, dmg: 0, died: true }); }
    else if (u.saves >= 3) { u.stable = true; blog(b, `${u.name} stabilizes, still unconscious.`, 'heal'); }
    else blog(b, `${u.name} death save: ${r} (${u.saves} saved, ${u.fails} failed).`, r >= 10 ? 'note' : 'down');
  }
  function checkEnd(b) {
    if (b.over) return;
    if (!b.units.some(u => u.side === 'dm' && u.alive)) { b.over = 'win'; return; }
    if (!b.units.some(u => u.side === 'party' && conscious(u))) { if (b.duel) { b.over = 'tpk'; blog(b, `The last of them falls. ${b.vname} stands alone on the field.`, 'big'); } else tpkNow(b); }
  }
  // 0.31: a duel with a band of the wilds. Beaten down below 40% of their strength, they may throw down their arms
  const SURRENDER = { goblin: 0.8, bandit: 0.75, orc: 0.55, wolf: 0.6, skeleton: 0, ogre: 0.55, wraith: 0.25, troll: 0.4, giant: 0.5, vampire: 0.35, hydra: 0.3, dragon: 0.4 };
  function duelRound(b) {
    if (b.asked) return;
    const W = b.units.filter(u => u.side === 'party');
    const left = sum(W, totalHp) / Math.max(1, sum(W, u => (u.startCount || 1) * u.maxHp));
    if (left >= 0.4) return;
    b.asked = true;
    const t = (W[0] || {}).type; let p = SURRENDER[t] !== undefined ? SURRENDER[t] : 0.4;
    if ((t === 'skeleton' || t === 'wraith') && (b.vtype === 'lich' || b.vtype === 'deathknight')) p = 0.85;   // the dead bow to their masters
    if (chance(p)) { b.over = 'surrender'; blog(b, `The ${(W[0] || {}).name || 'monsters'} throw down their arms and kneel before ${b.vname}.`, 'big'); }
    else blog(b, `The ${(W[0] || {}).name || 'monsters'} won't yield. They fight on to the last.`, 'foe');
  }

  /* --- movement --- */
  function occupied(b, except) {
    const occ = new Set();
    for (const k of Object.keys(b.tiles)) if (TILE_INFO[b.tiles[k]].block) occ.add(+k);
    for (const u of b.units) if (u.alive && u !== except) occ.add(u.pos);
    return occ;
  }
  const moveLeft = (b, u) => b.cur === u.id && u.mv !== undefined ? Math.max(0, u.mv) : u.spd;
  function reachable(b, u, range) {
    const occ = occupied(b, u); const res = new Map(); res.set(u.pos, { d: 0, prev: -1 });
    const mv = range !== undefined ? range : moveLeft(b, u);
    if (u.flyer || range !== undefined && u.phaser) {
      for (let k = 0; k < BW * BH; k++) { if (occ.has(k)) continue; const d = hexDist(u.pos, k); if (d <= mv && d > 0) res.set(k, { d, prev: u.pos }); }
      return res;
    }
    const open = [[0, u.pos]];
    while (open.length) {
      open.sort((a, z) => a[0] - z[0]);
      const [d, k] = open.shift();
      if (d > res.get(k).d) continue;
      for (const n of hexNeighbors(k)) {
        if (occ.has(n)) continue;
        const nd = d + (b.tiles[n] === 'bog' ? 2 : 1);
        if (nd > mv) continue;
        const e = res.get(n);
        if (!e || nd < e.d) { res.set(n, { d: nd, prev: k }); open.push([nd, n]); }
      }
    }
    return res;
  }
  function pathTo(reach, k) { const out = []; let x = k; let g = 0; while (x !== -1 && x !== undefined && g++ < 300) { out.push(x); const e = reach.get(x); if (!e) break; x = e.prev; } return out.reverse(); }
  const adjacentFoe = (b, u) => foesOf(b, u).some(f => hexDist(f.pos, u.pos) === 1);
  function options(b, u) {
    const reach = reachable(b, u);
    const targets = [];
    if (b.cur === u.id && u.acted) return { reach, targets, canShoot: false };
    const canShoot = u.ranged && u.shots > 0 && !adjacentFoe(b, u);
    for (const f of foesOf(b, u)) {
      if (canShoot && los(b, u.pos, f.pos)) { targets.push({ id: f.id, ranged: true, from: [u.pos] }); continue; }
      const from = []; for (const n of hexNeighbors(f.pos)) if (reach.has(n)) from.push(n);
      if (from.length) targets.push({ id: f.id, ranged: false, from, noSight: canShoot });
    }
    return { reach, targets, canShoot };
  }
  function springTrap(b, u, t) {
    t.sprung = true;
    const L = t.L || 1;
    const rec = { t: 'roll', kind: 'dmg', title: `${u.name} steps on a hidden spike trap!`, dmg: null };
    const dice = rollDice(2, 6).map(v => ({ s: 6, v })); const flat = 2 * L;
    rec.dmg = { dice, flat, scale: 1, mult: 1, total: sum(dice, d => d.v) + flat };
    b.events.push({ t: 'trapfx', k: t.k }); b.events.push(rec);
    applyDamage(b, u, rec.dmg.total, null, 'trap');
    blog(b, `${u.name} steps on a hidden spike trap (${rec.dmg.total} damage) and stops short.`, 'hurt');
  }
  function moveUnit(b, u, k, reach) {
    if (k === u.pos) return u.pos;
    if (b.cur === u.id && u.mv !== undefined) { const e = reach.get(k); u.mv = Math.max(0, u.mv - (e ? e.d : hexDist(u.pos, k))); }
    let path = u.flyer ? [u.pos, k] : pathTo(reach, k);
    if (isHero(u) && !u.flyer) {
      for (let i = 1; i < path.length; i++) {
        const t = b.traps.find(z => z.k === path[i] && !z.sprung);
        if (t) { path = path.slice(0, i + 1); b.events.push({ t: 'move', id: u.id, path, fly: false }); u.pos = path[i]; u.mv = 0; springTrap(b, u, t); return u.pos; }
      }
    }
    b.events.push({ t: 'move', id: u.id, path, fly: u.flyer });
    u.pos = k;
    return k;
  }

  /* --- attack rolls --- */
  function flanked(b, target, attacker) {
    let n = 0;
    for (const x of b.units) if (x.side === attacker.side && conscious(x) && hexDist(x.pos, target.pos) === 1) n++;
    return n >= 2;
  }
  const inCover = (b, u) => b.tiles[u.pos] === 'brush';
  function attackRoll(b, a, d, o) {
    let adv = 0, dis = 0; const notes = [];
    if (a.ab && a.ab.indexOf('reckless') >= 0 && !o.ranged) { adv++; notes.push('Reckless'); }
    if (d.ab && d.ab.indexOf('reckless') >= 0) { adv++; notes.push('Target is reckless'); }
    if (!o.ranged && flanked(b, d, a)) { adv++; notes.push('Flanking'); }
    if (d.defending) { dis++; notes.push('Target defending'); }
    if (d.prone) { if (o.ranged) { dis++; notes.push('Target prone'); } else { adv++; notes.push('Target knocked down'); } }
    if (a.aim && o.ranged) { adv++; notes.push('Steady Aim'); a.aim = false; }
    if (o.far) { dis++; notes.push('Long range'); }
    if (a.side === 'dm' && b.round === 1 && b.roar) { dis++; notes.push('Fearsome Roar'); }
    if (a.side === 'party' && b.round === 1 && b.dread) { dis++; notes.push('Dread Aura'); }
    let r1 = d20(), r2 = d20();
    if (a.lucky) { if (r1 === 1) { r1 = d20(); notes.push('Lucky'); } if (r2 === 1) r2 = d20(); }
    const mode = adv && !dis ? 'adv' : dis && !adv ? 'dis' : null;
    const nat = mode === 'adv' ? Math.max(r1, r2) : mode === 'dis' ? Math.min(r1, r2) : r1;
    const extras = [];
    if (a.side === 'party' && b.bless) { extras.push({ s: 4, v: rint(1, 4), label: 'Bless' }); }
    const total = nat + a.hit + sum(extras, e => e.v);
    let ac = d.ac;
    if (o.ranged && inCover(b, d)) { ac += 2; notes.push('Cover +2'); }
    if (d.guard) { ac += d.guard; notes.push(`Shield Wall +${d.guard}`); }
    const critOn = a.ab && a.ab.indexOf('assassin') >= 0 ? 18 : a.ab && a.ab.indexOf('brutal') >= 0 ? 19 : 20;
    const crit = nat >= critOn, fumble = nat === 1;
    let hit = !fumble && (crit || total >= ac);
    if (!hit && a.ab && a.ab.indexOf('stroke') >= 0 && !a.stroke) { a.stroke = true; hit = true; notes.push('Stroke of Luck'); }
    return { d20: mode ? [r1, r2] : [r1], mode, nat, bonus: a.hit, extras, total, vs: ac, vsLabel: 'AC', result: crit ? 'crit' : hit ? 'hit' : fumble ? 'fumble' : 'miss', hit, crit, notes };
  }
  function damageRoll(b, a, crit, mult) {
    const k = Math.min(a.count, 10); const dice = []; let raw = 0;
    const n = a.dice[0] * (crit ? 2 : 1) + (crit && a.savage ? 1 : 0);
    for (let i = 0; i < k; i++) for (let j = 0; j < n; j++) { const v = rint(1, a.dice[1]); dice.push({ s: a.dice[1], v }); raw += v; }
    const flat = a.dice[2] * k; raw += flat;
    for (const e of a.extra || []) { const m = e.n * (crit ? 2 : 1); for (let j = 0; j < m; j++) { const v = rint(1, e.s); dice.push({ s: e.s, v, label: e.label }); raw += v; } }
    const scale = a.count > 10 ? a.count / 10 : 1;
    const m = (mult || 1) * (a.side === 'dm' && b.pull ? 0.5 : 1);
    return { dice, flat, scale, mult: m, total: Math.max(1, Math.round(raw * scale * m)) };
  }
  function applyDamage(b, d, dmg, src, kind) {
    const ev = { t: 'hit', target: d.id, dmg, killed: 0, src: src && src.id, kind };
    if (isHero(d)) {
      if ((kind === 'melee' || kind === 'ranged') && d.ab.indexOf('thick') >= 0) dmg = Math.max(1, dmg - 4);
      if ((kind === 'melee' || kind === 'ranged') && d.ab.indexOf('cunning') >= 0 && chance(d.ab.indexOf('phantom') >= 0 ? 0.35 : 0.2)) { ev.dmg = 0; ev.dodge = true; b.events.push(ev); blog(b, `${d.name} dodges out of the way!`, 'miss'); return ev; }
      if ((kind === 'aoe' || kind === 'breath' || kind === 'trap') && d.ab.indexOf('evasion') >= 0) dmg = Math.floor(dmg / 2);
      if (d.ab.indexOf('uncanny') >= 0 && !d.uncanny && (kind === 'melee' || kind === 'ranged')) { dmg = Math.ceil(dmg / 2); d.uncanny = true; ev.note = 'Uncanny Dodge halves it'; }
      if (d.ward > 0) { const a = Math.min(d.ward, dmg); d.ward -= a; dmg -= a; ev.ward = a; }
      ev.dmg = dmg;
      const before = d.hp; d.hp -= dmg; b.dmgTaken += Math.max(0, Math.min(dmg, before));
      if (d.hp <= 0) {
        const over = -d.hp;
        if ((d.relentless || 0) < (d.relentMax || 0)) { d.relentless = (d.relentless || 0) + 1; d.hp = 1; ev.relentless = true; blog(b, `${d.name} refuses to fall!`, 'big'); }
        else if (over >= d.maxHp * 1.5) { d.hp = 0; d.alive = false; d.dead = true; b.died.push(d.hero); ev.died = true; blog(b, `${d.name} is killed outright.`, 'death'); }
        else { d.hp = 0; d.down = true; d.saves = 0; d.fails = 0; d.stable = false; if (b.downed.indexOf(d.hero) < 0) b.downed.push(d.hero); ev.down = true; blog(b, `${d.name} falls, unconscious and dying.`, 'down'); }
      }
      if ((ev.down || ev.died) && b.intervention && !b.intervened && b.units.some(u => isHero(u) && conscious(u) && u.ab.indexOf('intervention') >= 0)) {
        b.intervened = true; const ids = [];
        for (const u of b.units) if (u.side === 'party' && conscious(u)) { u.hp = Math.min(u.maxHp, u.hp + Math.ceil(u.maxHp / 2)); ids.push(u.id); }
        b.events.push(ev); b.events.push({ t: 'spell', name: 'Divine Intervention', fx: 'holyword', targets: ids, heal: true });
        blog(b, 'The cleric cries out to the heavens. Divine Intervention heals every standing hero!', 'heal');
        return ev;
      }
    } else {
      if (d.boss && d.escapes) {
        d.hp -= dmg;
        if (d.hp < d.maxHp * 0.35) { d.hp = Math.max(1, d.hp); d.alive = false; d.escaped = true; ev.escaped = true; b.events.push(ev); blog(b, `${d.name} staggers, then vanishes in a swirl of shadow. "We will meet again, heroes!"`, 'boss'); return ev; }
        b.events.push(ev); return ev;
      }
      if (d.boss && d.phyl && d.hp - dmg <= 0) {
        d.phyl = false; d.hp = Math.round(d.maxHp * 0.25); ev.dmg = dmg; ev.phylactery = true;
        b.events.push(ev); b.events.push({ t: 'spell', name: 'Phylactery', src: d.id, fx: 'rend', targets: [d.id], heal: true });
        blog(b, `${d.name} crumbles to dust... and the dust rises again. Somewhere, a phylactery pulses. (${d.hp} HP)`, 'boss'); return ev;
      }
      const tot = totalHp(d) - dmg; const before = d.count;
      if (tot <= 0) { d.count = 0; d.hp = 0; d.alive = false; ev.killed = before; ev.died = true; }
      else { d.count = Math.ceil(tot / d.maxHp); d.hp = tot - (d.count - 1) * d.maxHp; ev.killed = before - d.count; }
      if (ev.killed) { b.killedHp += ev.killed * d.maxHp; const key = d.one || d.name; b.killed[key] = (b.killed[key] || 0) + ev.killed; b.plural[key] = d.name; }
    }
    b.events.push(ev);
    return ev;
  }
  const who = u => u.side === 'dm' && !u.boss ? `The ${u.count === 1 && u.one ? u.one : u.name}` : u.name;
  const whom = u => u.side === 'dm' && !u.boss ? `the ${u.count === 1 && u.one ? u.one : u.name}` : u.name;
  function strike(b, a, d, o) {
    if (!conscious(a) || !d.alive) return null;
    const far = !!o.ranged && hexDist(a.pos, d.pos) > 7;
    const R = attackRoll(b, a, d, { ranged: o.ranged, far });
    b.events.push({ t: 'attack', src: a.id, target: d.id, ranged: !!o.ranged });
    const rec = Object.assign({ t: 'roll', kind: 'attack', title: `${who(a)} ${o.verb} ${whom(d)}`, who: a.name, src: a.id, target: d.id }, R);
    if (R.hit) rec.dmg = damageRoll(b, a, R.crit, o.mult);
    b.events.push(rec); b.rolls++;
    if (!R.hit) { b.events.push({ t: 'miss', target: d.id }); blog(b, `${who(a)} ${o.verb} ${whom(d)}: ${R.total} vs AC ${R.vs}, ${R.result === 'fumble' ? 'a natural 1!' : 'miss.'}`, 'miss'); return { miss: true }; }
    if (d.images > 0 && chance(d.images / (d.images + 1))) {
      d.images--; b.events.push({ t: 'miss', target: d.id });
      blog(b, `${who(a)} ${o.verb} ${whom(d)}, but it was a mirror image. It shatters (${d.images} left).`, 'miss'); return { miss: true };
    }
    const before = d.count;
    const ev = applyDamage(b, d, rec.dmg.total, a, o.ranged ? 'ranged' : 'melee');
    ev.crit = R.crit;
    if (!ev.dodge) blog(b, `${who(a)} ${R.crit ? 'land a critical hit on' : o.verb} ${whom(d)} for ${ev.dmg}${d.side === 'dm' && ev.killed ? (ev.died ? ', destroying the stack' : `, ${ev.killed} perish`) : ''}.`, a.side === 'party' ? 'hit' : 'hurt');
    if (a.drain && ev.dmg > 0 && a.alive && a.boss) {
      const heal = Math.min(a.maxHp - a.hp, Math.floor(ev.dmg / 2)); if (heal > 0) { a.hp += heal; blog(b, `${a.name} drinks deep (+${heal} HP).`, 'foe'); }
    } else if (a.drain && ev.dmg > 0 && a.alive) {
      const heal = Math.floor(ev.dmg / 2); const max = a.startCount * a.maxHp; const tot = Math.min(max, totalHp(a) + heal);
      const nc = Math.ceil(tot / a.maxHp); if (nc > a.count) blog(b, `The ${a.name} drain life and raise ${nc - a.count} of their fallen.`, 'foe');
      a.count = nc; a.hp = tot - (nc - 1) * a.maxHp;
    }
    return ev;
  }
  const VERB = { barbarian: 'cleaves', rogue: 'stabs', cleric: 'smites', wizard: 'strikes' };
  function meleeAttack(b, u, t) {
    const verb = isHero(u) ? VERB[u.cls] : 'attack';
    const half = u.ranged && !u.boss ? 0.5 : 1;
    const n = u.attacks || 1;
    for (let i = 0; i < n; i++) {
      let tgt = t;
      if (!tgt.alive || !conscious(tgt)) tgt = foesOf(b, u).find(f => hexDist(f.pos, u.pos) === 1);
      if (!tgt) break;
      strike(b, u, tgt, { verb: i ? 'strikes again at' : verb, mult: half });
    }
    if (u.breath && t.side === 'party' && (b.round === 1 || rint(1, 6) >= 5)) breathOn(b, u, t);
    if (u.ab && u.ab.indexOf('cleave') >= 0 && conscious(u)) {
      const others = foesOf(b, u).filter(f => f !== t && hexDist(f.pos, u.pos) === 1);
      for (const other of u.ab.indexOf('whirlwind') >= 0 ? others : others.slice(0, 1)) if (conscious(u)) strike(b, u, other, { verb: u.ab.indexOf('whirlwind') >= 0 ? 'whirls into' : 'cleaves through to' });
    }
    const sneak = u.ab && u.ab.indexOf('sneak') >= 0;
    if (t.alive && conscious(t) && t.retal && !sneak && conscious(u) && hexDist(t.pos, u.pos) === 1) { t.retal = false; strike(b, t, u, { verb: 'strike back at', mult: t.ranged ? 0.5 : 1 }); }
    if (u.ab && u.ab.indexOf('double') >= 0 && conscious(u) && t.alive && conscious(t)) strike(b, u, t, { verb: 'strikes again at', mult: half });
  }
  function breathOn(b, u, t) {
    const victims = b.units.filter(v => v.side === 'party' && conscious(v) && (v === t || hexDist(v.pos, t.pos) === 1));
    const rec = dmgRecord('The dragon breathes fire!', 6, 6, 0, b.pull ? 0.5 : 1);
    b.events.push({ t: 'spell', name: 'Dragon Breath', src: u.id, fx: 'breath', targets: victims.map(v => v.id) });
    b.events.push(rec);
    for (const v of victims) {
      const sv = heroSave(v, 15, `${v.name} dodges the flames`); b.events.push(sv);
      const d = sv.result === 'success' ? Math.floor(rec.dmg.total / 2) : rec.dmg.total;
      const ev = applyDamage(b, v, d, u, 'breath'); blog(b, `  The flames scorch ${v.name} for ${ev.dmg}.`, 'hurt');
    }
  }
  function shoot(b, u, t) {
    if (u.side === 'dm') u.shots--;
    strike(b, u, t, { ranged: true, verb: isHero(u) ? 'hurls a fire bolt at' : u.type === 'giant' ? 'hurl a boulder at' : 'shoot' });
  }

  /* --- bonus actions: every unit has one, used once per turn --- */
  // kind: heal (self, once a battle), strike (half-damage extra attack on a foe next to you, after attacking),
  // healAlly, teleport (range), step (walk up to range after attacking), prone, throw (range), guard, aim
  const BONUS = {
    secondwind: { kind: 'heal', name: 'Second Wind', text: 'Once a battle: catch a breath and heal 1d10 + level.' },
    offhand: { kind: 'strike', name: 'Off-hand Strike', text: 'After attacking, a quick stab with the other blade at an enemy next to you (half damage, no sneak attack).' },
    healword: { kind: 'healAlly', name: 'Healing Word', text: '3 mana: an ally within 6 hexes heals 1d4 + 2 + half the cleric\'s level, and gets back up if down.', mana: 3, range: 6 },
    misty: { kind: 'teleport', name: 'Misty Step', text: '2 mana: vanish and reappear up to 5 hexes away.', mana: 2, range: 5 },
    nimble: { kind: 'step', name: 'Nimble Escape', text: 'After attacking, slip up to 2 hexes away.', range: 2 },
    trip: { kind: 'prone', name: 'Knock Down', text: 'An enemy next to them is knocked prone: melee attacks against it have advantage, and it loses half its move getting up.' },
    stomp: { kind: 'prone', name: 'Stomp', text: 'The ground shakes and an enemy next to them is knocked prone.' },
    daggers: { kind: 'throw', name: 'Thrown Daggers', text: 'A volley of daggers at an enemy within 4 hexes (1d4 + 1 each).', range: 4, dice: [1, 4, 1] },
    shieldwall: { kind: 'guard', name: 'Shield Wall', text: '+2 AC until their next turn.' },
    aim: { kind: 'aim', name: 'Steady Aim', text: 'Before shooting: the next shot has advantage, but they stay put for the rest of the turn.' },
    phase: { kind: 'teleport', name: 'Phase', text: 'Drift up to 3 hexes away, through anything.', range: 3 },
    mist: { kind: 'teleport', name: 'Mist Form', text: 'Dissolve and reform up to 4 hexes away.', range: 4 },
    rend: { kind: 'strike', name: 'Rend', text: 'After attacking, an extra claw at an enemy next to them (half damage).' },
    tail: { kind: 'strike', name: 'Tail Swipe', text: 'After attacking, a sweep of the tail at an enemy next to it (half damage).' },
    bite: { kind: 'strike', name: 'Extra Bite', text: 'After attacking, another head snaps at an enemy next to it (half damage).' }
  };
  const UNIT_BONUS = { barbarian: 'secondwind', rogue: 'offhand', cleric: 'healword', wizard: 'misty', goblin: 'nimble', wolf: 'trip', bandit: 'daggers', skeleton: 'shieldwall', orc: 'aim', ogre: 'trip', wraith: 'phase', troll: 'rend', giant: 'stomp', dragon: 'tail', vampire: 'mist', hydra: 'bite', demon: 'tail', knight: 'shieldwall' };
  const bonusOf = u => u.boss ? null : BONUS[UNIT_BONUS[isHero(u) ? u.cls : u.type]] ? UNIT_BONUS[isHero(u) ? u.cls : u.type] : null;
  const adjFoes = (b, u) => foesOf(b, u).filter(f => hexDist(f.pos, u.pos) === 1);
  function teleportHexes(b, u, range) { const occ = occupied(b, u); const out = []; for (let k = 0; k < BW * BH; k++) if (!occ.has(k) && k !== u.pos && hexDist(u.pos, k) <= range) out.push(k); return out; }
  // what this unit's bonus could be used on right now: { key, B, targets: [unitId], hexes: [k], self } or null
  function bonusOptions(b, u) {
    const key = bonusOf(u); if (!key || u.bonused || !conscious(u)) return null;
    const B = BONUS[key]; const o = { key, B, targets: [], hexes: [], self: false };
    if (B.mana && (u.mana || 0) < B.mana) return null;
    if (B.kind === 'heal') { if (u.sw || u.hp >= u.maxHp) return null; o.self = true; }
    else if (B.kind === 'guard') o.self = true;
    else if (B.kind === 'aim') { if (u.acted || !u.ranged || u.shots <= 0 || adjFoes(b, u).length) return null; o.self = true; }
    else if (B.kind === 'strike') { if (!u.didAttack) return null; o.targets = adjFoes(b, u).map(f => f.id); }
    else if (B.kind === 'prone') o.targets = adjFoes(b, u).filter(f => !f.prone && !f.boss).map(f => f.id);
    else if (B.kind === 'throw') o.targets = foesOf(b, u).filter(f => hexDist(f.pos, u.pos) <= B.range && los(b, u.pos, f.pos)).map(f => f.id);
    else if (B.kind === 'healAlly') o.targets = b.units.filter(x => x.side === u.side && x.alive && (x.down || x.hp < x.maxHp) && hexDist(x.pos, u.pos) <= B.range).map(x => x.id);
    else if (B.kind === 'teleport') o.hexes = teleportHexes(b, u, B.range);
    else if (B.kind === 'step') { if (!u.didAttack) return null; o.hexes = Array.from(reachable(b, u, B.range).keys()).filter(k => k !== u.pos); }
    if (!o.self && !o.targets.length && !o.hexes.length) return null;
    return o;
  }
  function doBonus(s, b, u, a) {
    const o = bonusOptions(b, u); if (!o) return 'No bonus action available.';
    const B = o.B; const t = a.target ? b.units.find(x => x.id === a.target) : null;
    if (o.targets.length && !o.self && (!t || o.targets.indexOf(t.id) < 0)) return 'Pick a target for ' + B.name + '.';
    if (o.hexes.length && (a.to === undefined || o.hexes.indexOf(a.to) < 0)) return 'Pick a hex for ' + B.name + '.';
    if (B.mana) u.mana -= B.mana;
    u.bonused = true;
    if (B.kind === 'heal') {
      u.sw = true; const h = Math.min(u.maxHp - u.hp, rint(1, 10) + (u.level || 1)); u.hp += h;
      b.events.push({ t: 'spell', name: B.name, src: u.id, fx: 'heal', targets: [u.id], heal: true }); blog(b, `${u.name} catches a second wind (+${h} HP).`, 'heal');
    } else if (B.kind === 'guard') {
      u.guard = 2; blog(b, `${who(u)} lock${u.count > 1 ? '' : 's'} shields: +2 AC until ${u.count > 1 ? 'their' : 'its'} next turn.`, 'note');
    } else if (B.kind === 'aim') {
      u.aim = true; u.mv = 0; blog(b, `${who(u)} take${u.count > 1 ? '' : 's'} careful aim.`, 'note');
    } else if (B.kind === 'strike') {
      const keep = { extra: u.extra, attacks: u.attacks };
      u.extra = []; u.attacks = 1;
      strike(b, u, t, { verb: isHero(u) ? 'slips in an off-hand stab at' : (B.key === 'tail' ? 'sweep their tails at' : 'lash out again at'), mult: 0.5 });
      u.extra = keep.extra; u.attacks = keep.attacks;
    } else if (B.kind === 'prone') {
      t.prone = true; b.events.push({ t: 'miss', target: t.id });
      blog(b, `${who(u)} knock${u.count > 1 ? '' : 's'} ${t.name} off their feet!`, 'hurt');
    } else if (B.kind === 'throw') {
      const keep = u.dice; u.dice = B.dice.slice(); strike(b, u, t, { ranged: true, verb: 'throw daggers at' }); u.dice = keep;
    } else if (B.kind === 'healAlly') {
      const h = rint(1, 4) + 2 + Math.floor((u.level || 1) / 2);
      if (t.down) { t.down = false; t.stable = false; t.hp = Math.min(t.maxHp, h); t.saves = 0; t.fails = 0; b.healedFallen = true; b.events.push({ t: 'revive', id: t.id }); blog(b, `${u.name} calls out a Healing Word, and ${t.name} gets back up (${t.hp} HP).`, 'heal'); }
      else { const g = Math.min(t.maxHp - t.hp, h); t.hp += g; blog(b, `${u.name} calls out a Healing Word to ${t.name} (+${g} HP).`, 'heal'); }
      b.events.push({ t: 'spell', name: B.name, src: u.id, fx: 'heal', targets: [t.id], heal: true });
    } else if (B.kind === 'teleport') {
      b.events.push({ t: 'move', id: u.id, path: [u.pos, a.to], fly: true, blink: true }); u.pos = a.to;
      blog(b, `${who(u)} ${B.key === 'misty' ? 'misty-steps' : 'drift'} across the field.`, 'note');
    } else if (B.kind === 'step') {
      const reach = reachable(b, u, B.range); const path = pathTo(reach, a.to);
      b.events.push({ t: 'move', id: u.id, path, fly: false }); u.pos = a.to;
      blog(b, `${who(u)} slip${u.count > 1 ? '' : 's'} away.`, 'note');
    }
    return null;
  }
  for (const k of Object.keys(BONUS)) BONUS[k].key = k;
  // the turn is over when nothing useful is left: action spent, no bonus to use, no move left
  function turnSpent(b, u) {
    if (!conscious(u)) return true;
    if (!u.acted) return false;
    if (bonusOptions(b, u)) return false;
    return u.mv <= 0 || reachable(b, u).size <= 1;
  }
  function endTurn(s, b, u) {
    if (u.side === 'party' && u.cls === 'cleric') spiritGuardians(b, u);
    if (u.side === 'dm' && !u.boss && u.couldAttack && !u.didAttack && b.manual && conscious(u)) softball(s, b, u);
    afterAction(s, b);
  }

  /* --- actions --- */
  function act(s, a) {
    const b = s.battle; if (!b || b.over || b.pendingTPK) return 'No battle action possible.';
    if (b.phase === 'deploy') return 'Begin the battle first.';
    const u = b.units.find(x => x.id === b.cur); if (!u) return 'Nobody is acting.';
    b.events = [];
    if (a.type === 'end') { endTurn(s, b, u); return null; }
    if (a.type === 'wait') {
      if (u.waited) return 'This stack already waited this round.';
      if (u.acted || u.bonused || u.mv < u.spd) return 'Only before doing anything this turn.';
      u.waited = true; b.waitQ.unshift(u.id); blog(b, `${u.name} wait${u.count > 1 ? '' : 's'}.`, 'note');
      afterAction(s, b); return null;
    }
    if (a.type === 'bonus') {
      const err = doBonus(s, b, u, a); if (err) return err;
    } else if (a.type === 'move') {
      const o = options(b, u);
      if (u.mv <= 0) return 'No movement left this turn.';
      if (!o.reach.has(a.to) || a.to === u.pos) return 'Out of reach.';
      moveUnit(b, u, a.to, o.reach);
    } else {
      // everything else is the unit's one action
      if (u.acted) return 'Already used this turn\'s action.';
      const o = options(b, u);
      if (a.type === 'defend') {
        u.defending = true; blog(b, `${u.name} take${u.count > 1 ? '' : 's'} a defensive stance. Attacks against ${u.count > 1 ? 'them' : 'them'} have disadvantage.`, 'note');
      } else if (a.type === 'dash') {
        u.mv += u.spd; u.dashed = true; blog(b, `${who(u)} dash${u.count > 1 ? '' : 'es'} forward.`, 'note');
      } else if (a.type === 'attack') {
        const t = b.units.find(x => x.id === a.target); const opt = o.targets.find(x => x.id === a.target);
        if (!t || !opt) return 'Can\'t attack that.';
        u.didAttack = true;
        if (opt.ranged) shoot(b, u, t);
        else {
          let from = a.from; if (from === undefined || opt.from.indexOf(from) < 0) from = opt.from.slice().sort((x, y) => o.reach.get(x).d - o.reach.get(y).d)[0];
          const end = moveUnit(b, u, from, o.reach);
          if (conscious(u) && hexDist(end, t.pos) === 1) meleeAttack(b, u, t);
        }
      } else if (a.type === 'cast') {
        castHeroSpell(s, b, u, a.spell, a.target); u.didAttack = true;
      } else if (a.type === 'potion') {
        if (!u.potions) return 'No potions left.';
        u.potions--; const h = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * 0.35)); u.hp += h;
        b.events.push({ t: 'spell', name: 'Healing Potion', src: u.id, fx: 'heal', targets: [u.id], heal: true });
        blog(b, `${u.name} drinks a healing potion (+${h} HP, ${u.potions} left).`, 'heal');
      } else if (a.type === 'power' || a.type === 'rend' || a.type === 'raise') {
        const key = a.type === 'power' ? a.key : a.type === 'raise' ? 'servants' : u.P && u.P.meteor ? 'meteor' : 'rend';
        const p = bossPowers(b, u).find(x => x.key === key);
        if (!p) return 'That villain has no such power.';
        if (!p.ready) return p.why || 'Not ready yet.';
        const r = bossPower(s, b, u, key);
        if (r === 'free') { checkEnd(b); return null; }
        if (r) return r;
        u.didAttack = true;
      } else return 'Unknown action.';
      u.acted = true;
    }
    checkEnd(b);
    if (b.over || !b.units.some(x => x.side === 'party' && conscious(x))) { afterAction(s, b); return null; }
    if (turnSpent(b, u)) endTurn(s, b, u);
    return null;
  }
  function heroSave(h, dc, title) {
    let sv = saveRoll(h.name, h.save, dc, title);
    if (h.lucky && sv.nat === 1) { sv = saveRoll(h.name, h.save, dc, title); sv.notes.push('Lucky reroll'); }
    return sv;
  }
  const VP = b => PRON[b.vpron] || PRON.he;
  // a wave that hits every conscious hero (Soul Rend, Meteor Swarm)
  function aoeAll(b, u, key) {
    u.cd[key] = 3;
    const nm = BOSS_POWERS[key].name;
    blog(b, key === 'rend' ? `${u.name} raises a skeletal hand. Soul Rend tears at the whole party!` : `${u.name} tears open the sky. A Meteor Swarm crashes down on the party!`, 'boss');
    const victims = b.units.filter(x => x.side === 'party' && conscious(x));
    b.events.push({ t: 'spell', name: nm, src: u.id, fx: key === 'rend' ? 'rend' : 'meteor', targets: victims.map(v => v.id) });
    const D = key === 'meteor' ? [u.aoe[0] + 2, u.aoe[1], u.aoe[2]] : u.aoe;
    const rec = dmgRecord(nm, D[0], D[1], D[2], b.pull ? 0.5 : 1); b.events.push(rec);
    for (const h of victims) {
      const sv = heroSave(h, u.aoeDC, `${h.name} resists`); b.events.push(sv);
      const d = sv.result === 'success' ? Math.floor(rec.dmg.total / 2) : rec.dmg.total;
      const ev = applyDamage(b, h, d, u, 'aoe'); blog(b, `  ${h.name} takes ${ev.dmg}.`, 'hurt');
    }
  }
  // fire (or hellfire) on a group of heroes around one hex
  function blastAt(b, u, key, center, radius) {
    const nm = BOSS_POWERS[key].name;
    const victims = b.units.filter(v => v.side === 'party' && conscious(v) && hexDist(v.pos, center) <= radius);
    const D = key === 'breath' ? [u.aoe[0] + 4, u.aoe[1], u.aoe[2]] : [u.aoe[0] + 1, u.aoe[1], u.aoe[2]];
    blog(b, key === 'breath' ? `${u.name} breathes a torrent of fire!` : key === 'orb' ? `${u.name} hurls an orb of hellfire!` : `${u.name} calls down hellfire!`, 'boss');
    b.events.push({ t: 'spell', name: nm, src: u.id, fx: key === 'breath' ? 'breath' : 'fireball', targets: victims.map(v => v.id), center });
    const rec = dmgRecord(nm, D[0], D[1], D[2], b.pull ? 0.5 : 1); b.events.push(rec);
    for (const v of victims) {
      const sv = heroSave(v, u.aoeDC, `${v.name} dives clear`); b.events.push(sv);
      const d = sv.result === 'success' ? Math.floor(rec.dmg.total / 2) : rec.dmg.total;
      const ev = applyDamage(b, v, d, u, key === 'breath' ? 'breath' : 'aoe'); blog(b, `  The flames scorch ${v.name} for ${ev.dmg}.`, 'hurt');
    }
  }
  // the best hex to center an area power on: most heroes caught, wounded heroes count a little extra
  function bestBlast(b, u, radius, needSight) {
    const heroes = foesOf(b, u); let best = null, bv = -1;
    for (const h of heroes) {
      if (needSight && !los(b, u.pos, h.pos)) continue;
      const caught = heroes.filter(x => hexDist(x.pos, h.pos) <= radius);
      const v = caught.length * 10 + sum(caught, x => 1 - x.hp / x.maxHp);
      if (v > bv) { bv = v; best = h.pos; }
    }
    return best === null ? null : { at: best, n: Math.floor(bv / 10) };
  }
  function bossPower(s, b, u, key) {
    const heroes = foesOf(b, u);
    if (key === 'rend' || key === 'meteor') { aoeAll(b, u, key); return null; }
    if (key === 'breath' || key === 'hellfire' || key === 'orb') {
      const r = key === 'breath' ? 2 : 1; const t = bestBlast(b, u, r, key !== 'breath');
      if (!t) return 'No target.';
      blastAt(b, u, key, t.at, r); u.cd[key] = key === 'breath' ? 1 : 2; if (key === 'breath') u.recharge = true;
      return null;
    }
    if (key === 'charm') {
      const t = heroes.slice().sort((x, y) => threat(y) - threat(x))[0]; if (!t) return 'No target.';
      u.cd.charm = 3;
      b.events.push({ t: 'spell', name: 'Charm', src: u.id, fx: 'rend', targets: [t.id] });
      const sv = heroSave(t, u.aoeDC - 1, `${t.name} fights the charm`); b.events.push(sv);
      if (sv.result === 'success') blog(b, `${u.name} locks eyes with ${t.name}, who shakes it off.`, 'boss');
      else { t.charmed = true; blog(b, `${u.name} locks eyes with ${t.name}. ${t.name} lowers their weapon, charmed, and will lose their next turn.`, 'boss'); }
      return null;
    }
    if (key === 'servants') { raiseDead(s, b, u); return null; }
    if (key === 'timestop') {
      u.stopped = true; b.queue.unshift(u.id, u.id);
      b.events.push({ t: 'spell', name: 'Time Stop', src: u.id, fx: 'rend', targets: [] });
      blog(b, `${u.name} stops time. The heroes freeze mid-step while ${u.name} acts twice more!`, 'boss');
      return null;
    }
    if (key === 'blink') {
      const occ = occupied(b, u); let best = null, bs = -Infinity;
      for (let k = 0; k < BW * BH; k++) {
        if (occ.has(k)) continue; const { c } = hc(k); if (c < 6) continue;
        const near = Math.min.apply(null, heroes.map(h => hexDist(h.pos, k)).concat([99]));
        const sight = heroes.filter(h => los(b, k, h.pos)).length;
        const sc = Math.min(near, 6) * 2 + sight - (near <= 1 ? 50 : 0);
        if (sc > bs) { bs = sc; best = k; }
      }
      if (best === null) return 'Nowhere to go.';
      u.cd.blink = 2; u.blinked = true;
      b.events.push({ t: 'move', id: u.id, path: [u.pos, best], fly: true, blink: true });
      u.pos = best; blog(b, `${u.name} blinks across the battlefield.`, 'boss');
      return 'free';
    }
    return 'Unknown power.';
  }
  // at the start of the villain's turn: cooldowns tick, auras burn, wounds close
  function bossTurnStart(b, u) {
    u.blinked = false;
    for (const k of Object.keys(u.cd)) if (u.cd[k] > 0 && k !== 'breath') u.cd[k]--;
    if (u.P.breath && u.cd.breath && rint(1, 6) >= 5) { u.cd.breath = 0; blog(b, `Smoke curls from ${u.name}'s jaws. The breath has recharged.`, 'boss'); }
    if (u.P.regen && u.hp < u.maxHp) { const h = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * 0.02)); u.hp += h; blog(b, `${u.name}'s wounds close (+${h} HP).`, 'foe'); }
    if (u.P.aura) {
      const near = b.units.filter(v => v.side === 'party' && conscious(v) && hexDist(v.pos, u.pos) === 1);
      if (near.length) {
        const rec = dmgRecord('Fire Aura', Math.max(1, Math.round(u.aoe[0] / 3)), 10, Math.round(u.aoe[2] / 4), b.pull ? 0.5 : 1); b.events.push(rec);
        b.events.push({ t: 'spell', name: 'Fire Aura', src: u.id, fx: 'breath', targets: near.map(v => v.id) });
        for (const v of near) { const ev = applyDamage(b, v, rec.dmg.total, u, 'aoe'); blog(b, `${u.name}'s fire aura burns ${v.name} for ${ev.dmg}.`, 'hurt'); }
      }
    }
  }
  function raiseDead(s, b, u) {
    u.raised = true;
    const T = BOSS_TYPES[u.btype] || BOSS_TYPES.lich; const type = T.servant || 'skeleton';
    const L = avgLevel(s); const skel = (4 + 2 * L) * (u.servantsBoost ? 1.5 : 1);
    const n = Math.max(1, Math.round(skel * stackPower('skeleton', 1) / stackPower(type, 1)));
    if (!dmFreeHexes(b, hexNeighbors(u.pos)).length) { blog(b, `${u.name} calls for servants, but there is no room for them.`, 'foe'); return; }
    for (const g of addGroups(b, type, n, hexNeighbors(u.pos))) b.events.push({ t: 'summon', id: g.id });
    blog(b, type === 'skeleton' ? `${u.name} raises a hand and ${n} skeletons claw out of the earth!` : `${u.name} calls, and ${n} ${T.servantName} answer!`, 'boss');
  }
  function softball(s, b, u) { b.softball++; }
  // 0.30: no rescue from behind the screen any more: when the last hero falls, your monsters finish the job
  function tpkNow(b) {
    for (const u of b.units) if (u.side === 'party' && u.alive) { u.alive = false; u.dead = true; if (b.died.indexOf(u.hero) < 0) b.died.push(u.hero); }
    b.over = 'tpk'; b.pendingTPK = false; blog(b, 'The last hero falls, and your monsters close in. Total party kill.', 'death');
  }
  function afterAction(s, b) {
    checkEnd(b);
    if (b.over) return;
    nextTurn(b);
  }

  /* --- hero spells --- */
  const SPELL_COST = { cure: 5, masscure: 9, holyword: 10, resurrect: 12, miracle: 0, arrow: 4, fireball: 8, lightning: 10, chain: 14, meteor: 18, disintegrate: 12 };
  const costOf = (u, sp) => Math.max(0, SPELL_COST[sp] - (u.ab.indexOf('archmage') >= 0 && sp !== 'miracle' ? 2 : 0));
  // area and bolt spells gain dice as the caster levels
  const spellDice = (base, L, from, per) => base + Math.max(0, Math.floor((L - from) / per));
  const spellDC = u => 11 + Math.floor(u.level / 2) + (u.cls === 'wizard' ? 1 : 0);
  function castHeroSpell(s, b, u, sp, target) {
    u.mana -= costOf(u, sp);
    const L = u.level; const emp = u.ab.indexOf('empowered') >= 0 ? 5 : 0;
    const hasA = a => u.ab.indexOf(a) >= 0;
    const name = ABILITIES[sp].name; const DC = spellDC(u);
    const ev = { t: 'spell', name, src: u.id, fx: sp, targets: [] };
    b.events.push(ev);
    const hitStack = (f, base, half, label) => {
      let dmg = base;
      if (half) { const sv = saveRoll(f.name, f.sv || 0, DC, f.boss ? `${f.name} tries to resist` : `The ${f.name} try to resist`); b.events.push(sv); if (sv.result === 'success') dmg = Math.floor(dmg / 2); }
      if (f.undead && sp === 'holyword') dmg *= 2;
      const e = applyDamage(b, f, dmg, u, 'spell'); ev.targets.push(f.id);
      blog(b, `  ${label || 'The ' + f.name} take${f.count > 1 ? '' : 's'} ${e.dmg}${e.escaped ? '' : e.killed ? (e.died ? ', destroyed' : `, ${e.killed} perish`) : ''}.`, 'hit');
      return e;
    };
    if (sp === 'cure' || sp === 'resurrect' || sp === 'miracle') {
      const t = b.units.find(x => x.id === target);
      const was = t.down;
      let amt;
      if (sp === 'cure') { const r = hasA('heal') ? dmgRecord(`${u.name} casts Heal`, 4, 8, 2 * L) : dmgRecord(`${u.name} casts Cure Wounds`, 2, 8, L); r.heal = true; b.events.push(r); amt = r.dmg.total; }
      else amt = sp === 'resurrect' ? Math.ceil(t.maxHp / 2) : t.maxHp;
      t.hp = Math.min(t.maxHp, (t.down ? 0 : t.hp) + amt); if (t.down) { t.down = false; t.stable = false; t.saves = 0; t.fails = 0; }
      if (sp === 'miracle') u.miracle = true;
      if (was) b.healedFallen = true;
      ev.targets.push(t.id); ev.heal = true;
      blog(b, `${u.name} casts ${name} on ${t === u ? 'herself' : t.name}${was ? ', who gets back up' : ''} (+${amt} HP).`, 'heal');
    } else if (sp === 'masscure') {
      const r = hasA('massheal') ? dmgRecord(`${u.name} casts Mass Heal`, 2, 8, 2 * L) : dmgRecord(`${u.name} casts Mass Cure`, 1, 8, L); r.heal = true; b.events.push(r);
      let tot = 0; for (const t of b.units.filter(x => x.side === 'party' && conscious(x))) { const before = t.hp; t.hp = Math.min(t.maxHp, t.hp + r.dmg.total); tot += t.hp - before; ev.targets.push(t.id); }
      ev.heal = true; blog(b, `${u.name} casts Mass Cure (+${tot} HP across the party).`, 'heal');
    } else if (sp === 'holyword') {
      blog(b, `${u.name} speaks a Holy Word!`, 'spell');
      const r = dmgRecord(`${u.name}: Holy Word`, spellDice(3, L, 5, 3), 6, L); b.events.push(r);
      for (const f of foesOf(b, u)) hitStack(f, r.dmg.total, true);
      if (ev.targets.length >= 3) b.aoeBig = true;
    } else if (sp === 'meteor') {
      blog(b, `${u.name} calls down a Meteor Shower!`, 'spell');
      const r = dmgRecord(`${u.name}: Meteor Shower`, hasA('archmage') ? 10 : spellDice(6, L, 8, 3), 6, 2 * L + emp); b.events.push(r);
      for (const f of foesOf(b, u)) hitStack(f, r.dmg.total, true);
      if (ev.targets.length >= 3) b.aoeBig = true;
    } else if (sp === 'fireball') {
      const area = [target].concat(hexNeighbors(target)); ev.center = target;
      blog(b, `${u.name} hurls a Fireball!`, 'spell');
      const r = dmgRecord(`${u.name}: Fireball`, spellDice(8, L, 5, 2), 6, emp); b.events.push(r);
      for (const f of foesOf(b, u)) if (area.indexOf(f.pos) >= 0) hitStack(f, r.dmg.total, true);
      if (ev.targets.length >= 2) b.aoeBig = true;
    } else if (sp === 'arrow') {
      const t = b.units.find(x => x.id === target);
      const darts = 3 + Math.floor((L - 1) / 2);
      const r = dmgRecord(`${u.name}: ${darts} Magic Missiles`, darts, 4, darts + emp); b.events.push(r);
      blog(b, `${u.name} fires ${darts} Magic Missiles at ${whom(t)}.`, 'spell'); hitStack(t, r.dmg.total, false);
    } else if (sp === 'lightning') {
      const t = b.units.find(x => x.id === target);
      const r = dmgRecord(`${u.name}: Lightning Bolt`, spellDice(8, L, 5, 2), 6, L + emp); b.events.push(r);
      blog(b, `${u.name} hurls a Lightning Bolt at ${whom(t)}.`, 'spell'); hitStack(t, r.dmg.total, true);
    } else if (sp === 'chain') {
      blog(b, `${u.name} casts Chain Lightning!`, 'spell');
      const r = dmgRecord(`${u.name}: Chain Lightning`, spellDice(6, L, 7, 3), 8, L + emp); b.events.push(r);
      const fs = foesOf(b, u).sort((x, y) => totalHp(y) - totalHp(x)).slice(0, 3);
      fs.forEach((f, i) => hitStack(f, Math.round(r.dmg.total / Math.pow(2, i)), true));
      if (fs.length >= 3) b.aoeBig = true;
    } else if (sp === 'disintegrate') {
      const t = b.units.find(x => x.id === target);
      const r = dmgRecord(`${u.name}: Disintegrate`, 10, 6, 40 + emp); b.events.push(r);
      blog(b, `${u.name} fires a green ray of Disintegration at ${whom(t)}!`, 'spell'); hitStack(t, r.dmg.total, true);
    }
    // Time Stop: once per battle the wizard acts again straight away
    if (hasA('timestop') && !u.timestop && conscious(u) && foesOf(b, u).length) { u.timestop = true; b.queue.unshift(u.id); blog(b, `${u.name} stops time and acts again!`, 'spell'); }
  }
  // Spirit Guardians: radiant spirits sear enemies next to the cleric after each of her turns
  function spiritGuardians(b, u) {
    if (!conscious(u) || u.ab.indexOf('spirits') < 0) return;
    const near = foesOf(b, u).filter(f => hexDist(f.pos, u.pos) === 1); if (!near.length) return;
    const r = dmgRecord(`${u.name}: Spirit Guardians`, 3, 8, 0); b.events.push(r);
    b.events.push({ t: 'spell', name: 'Spirit Guardians', src: u.id, fx: 'holyword', targets: near.map(f => f.id) });
    for (const f of near) {
      const sv = saveRoll(f.name, f.sv || 0, spellDC(u), `The ${f.name} resist the spirits`); b.events.push(sv);
      const e = applyDamage(b, f, sv.result === 'success' ? Math.floor(r.dmg.total / 2) : r.dmg.total, u, 'spell');
      blog(b, `  Spirits sear the ${f.name} for ${e.dmg}${e.killed ? (e.died ? ', destroyed' : `, ${e.killed} perish`) : ''}.`, 'hit');
    }
  }

  /* --- AI --- */
  const avgHit = u => u.count * (avgDie(u.dice[0], u.dice[1], u.dice[2]) + sum(u.extra || [], e => avgDie(e.n, e.s, 0)));
  function expected(a, d) { return pHit(a.hit, d.ac) * avgHit(a); }
  function threat(u) { return avgHit(u) * pHit(u.hit, 15) * (u.ranged ? 1.3 : 1) * (u.boss ? 2 : 1); }
  function bestApproach(reach, goalPos) {
    let best = null, bd = Infinity;
    for (const [k, e] of reach) { const d = hexDist(k, goalPos) * 10 + e.d * 0.1; if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function pickFromHex(b, u, t, from, reach) {
    // prefer hexes that flank, then the shortest walk
    let best = from[0], bs = -Infinity;
    for (const k of from) {
      let flank = 0; for (const x of b.units) if (x.side === u.side && x !== u && conscious(x) && hexDist(x.pos, t.pos) === 1) flank = 1;
      const sc = flank * 5 - reach.get(k).d - (b.tiles[k] === 'bog' ? 0.5 : 0) + (b.tiles[k] === 'brush' ? 0.3 : 0);
      if (sc > bs) { bs = sc; best = k; }
    }
    return best;
  }
  function sightSpot(b, u, reach, targets) {
    // a hex this ranged unit can reach that has line of sight to a target and isn't next to an enemy
    let best = null, bs = -Infinity;
    for (const [k] of reach) {
      if (k === u.pos) continue;
      if (foesOf(b, u).some(f => hexDist(f.pos, k) === 1)) continue;
      let sc = -Infinity;
      for (const f of targets) if (los(b, k, f.pos)) sc = Math.max(sc, threat(f) - hexDist(k, f.pos) * 0.2 + (b.tiles[k] === 'brush' ? 2 : 0));
      if (sc > bs) { bs = sc; best = k; }
    }
    return best;
  }
  function heroAI(s, b, u) {
    if (u.potions > 0 && u.hp < u.maxHp * 0.35) return { type: 'potion' };
    const foes = foesOf(b, u); const o = options(b, u);
    const party = b.units.filter(x => x.side === 'party');
    const has_ = a => u.ab.indexOf(a) >= 0;
    if (u.cls === 'cleric') {
      const fallen = party.filter(x => x.alive && x.down);
      if (fallen.length && has_('miracle') && !u.miracle) return { type: 'cast', spell: 'miracle', target: fallen[0].id };
      if (fallen.length && has_('resurrect') && u.mana >= costOf(u, 'resurrect')) return { type: 'cast', spell: 'resurrect', target: fallen[0].id };
      const ok = party.filter(conscious);
      const hurt = ok.filter(x => x.hp < x.maxHp * 0.5);
      if (has_('masscure') && u.mana >= costOf(u, 'masscure') && hurt.length >= 2) return { type: 'cast', spell: 'masscure' };
      const worst = ok.filter(x => x.hp < x.maxHp * 0.4).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      if (worst && has_('cure') && u.mana >= costOf(u, 'cure')) return { type: 'cast', spell: 'cure', target: worst.id };
      if (fallen.length && has_('cure') && u.mana >= costOf(u, 'cure') && !has_('resurrect')) return { type: 'cast', spell: 'cure', target: fallen[0].id };
      if (has_('holyword') && u.mana >= costOf(u, 'holyword') && foes.length >= 2) return { type: 'cast', spell: 'holyword' };
    }
    if (u.cls === 'wizard') {
      const L = u.level;
      const sighted = foes.filter(f => los(b, u.pos, f.pos));
      if (has_('meteor') && u.mana >= costOf(u, 'meteor') && foes.length >= 3) return { type: 'cast', spell: 'meteor' };
      if (has_('fireball') && u.mana >= costOf(u, 'fireball')) {
        let best = null, bv = 0; const fbd = 3.5 * spellDice(8, L, 5, 2);
        const cands = new Set(); for (const f of foes) { cands.add(f.pos); for (const n of hexNeighbors(f.pos)) cands.add(n); }
        for (const c of cands) {
          const area = [c].concat(hexNeighbors(c));
          if (party.some(p => p.alive && area.indexOf(p.pos) >= 0)) continue;
          const hit = foes.filter(f => area.indexOf(f.pos) >= 0);
          const v = sum(hit, f => Math.min(fbd, totalHp(f))) + (hit.length >= 2 ? 10 : 0);
          if (v > bv) { bv = v; best = c; }
        }
        if (best !== null && bv >= fbd * 1.2) return { type: 'cast', spell: 'fireball', target: best };
      }
      if (has_('chain') && u.mana >= costOf(u, 'chain') && foes.length >= 2) return { type: 'cast', spell: 'chain' };
      const big = sighted.slice().sort((x, y) => totalHp(y) - totalHp(x))[0];
      if (big && has_('disintegrate') && u.mana >= costOf(u, 'disintegrate') && totalHp(big) >= 70) return { type: 'cast', spell: 'disintegrate', target: big.id };
      if (big && has_('lightning') && u.mana >= costOf(u, 'lightning') && totalHp(big) >= 25) return { type: 'cast', spell: 'lightning', target: big.id };
      if (big && has_('arrow') && u.mana >= costOf(u, 'arrow') && totalHp(big) >= 12 && !(u.mana < 12 && has_('fireball') && foes.length >= 2) && !(L >= 15 && totalHp(big) < 40)) return { type: 'cast', spell: 'arrow', target: big.id };
      const shots = o.targets.filter(t => t.ranged).map(t => ({ t, f: b.units.find(x => x.id === t.id) }));
      if (shots.length) { const p = shots.sort((x, y) => (y.f.ranged ? 1e6 : 0) - (x.f.ranged ? 1e6 : 0) || threat(y.f) - threat(x.f))[0]; return { type: 'attack', target: p.t.id }; }
      if (o.canShoot) { const spot = sightSpot(b, u, o.reach, foes); if (spot !== null) return { type: 'move', to: spot }; }
      const melee = o.targets.filter(t => !t.ranged && hexDist(u.pos, b.units.find(x => x.id === t.id).pos) === 1);
      if (melee.length) return { type: 'attack', target: melee[0].id };
      return { type: 'defend' };
    }
    const tg = o.targets.map(t => ({ t, f: b.units.find(x => x.id === t.id) }));
    if (tg.length) {
      let p;
      if (u.cls === 'barbarian') p = tg.sort((x, y) => threat(y.f) - threat(x.f))[0];
      else if (u.cls === 'rogue') p = tg.sort((x, y) => (y.f.ranged ? 1e6 : 0) - (x.f.ranged ? 1e6 : 0) || totalHp(x.f) - totalHp(y.f))[0];
      else {
        const wiz = party.find(x => x.cls === 'wizard' && conscious(x));
        p = tg.sort((x, y) => ((wiz && hexDist(y.f.pos, wiz.pos) <= 2) ? 1e6 : 0) - ((wiz && hexDist(x.f.pos, wiz.pos) <= 2) ? 1e6 : 0) || totalHp(x.f) - totalHp(y.f))[0];
      }
      return { type: 'attack', target: p.t.id, from: pickFromHex(b, u, p.f, p.t.from, o.reach) };
    }
    const goal = u.cls === 'rogue' ? (foes.find(f => f.ranged) || foes.slice().sort((x, y) => totalHp(x) - totalHp(y))[0]) : foes.slice().sort((x, y) => threat(y) - threat(x))[0];
    if (!goal) return { type: 'defend' };
    if (u.cls === 'cleric') {
      const wiz = party.find(x => x.cls === 'wizard' && conscious(x));
      if (wiz && hexDist(u.pos, wiz.pos) > 2) return { type: 'move', to: bestApproach(o.reach, wiz.pos) };
    }
    return { type: 'move', to: bestApproach(o.reach, goal.pos) };
  }
  // when a villain reaches for a signature power instead of a plain attack
  function bossChoice(b, u) {
    const ready = {}; for (const p of bossPowers(b, u)) if (p.ready) ready[p.key] = true;
    const heroes = foesOf(b, u); const close = heroes.filter(h => hexDist(h.pos, u.pos) <= 1).length;
    if (ready.timestop) return 'timestop';
    if (ready.servants) return 'servants';
    if (ready.blink && close) return 'blink';
    if (ready.rend) return 'rend';
    if (ready.meteor) return 'meteor';
    if (ready.breath) { const t = bestBlast(b, u, 2, false); if (t && (t.n >= 2 || heroes.length <= 2 || b.round >= 3)) return 'breath'; }
    for (const k of ['hellfire', 'orb']) if (ready[k]) { const t = bestBlast(b, u, 1, true); if (t && (t.n >= 2 || !close)) return k; }
    if (ready.charm && heroes.length >= 2) return 'charm';
    return null;
  }
  function monsterAI(s, b, u) {
    if (u.boss && u.P) { const k = bossChoice(b, u); if (k) return { type: 'power', key: k }; }
    const o = options(b, u);
    const heroes = foesOf(b, u);
    if (!heroes.length) return { type: 'defend' };
    const tg = o.targets.map(t => ({ t, f: b.units.find(x => x.id === t.id) }));
    const shots = tg.filter(x => x.t.ranged);
    const pool = shots.length ? shots : tg;
    if (pool.length) {
      const score = x => { const e = expected(u, x.f) * (x.t.ranged ? 1 : (u.ranged ? 0.5 : 1)); return Math.min(1.5, e / Math.max(1, x.f.hp)) + (x.f.cls === 'wizard' ? 0.3 : 0) + (x.f.cls === 'cleric' ? 0.15 : 0); };
      const best = pool.sort((x, y) => score(y) - score(x))[0];
      if (u.ranged && !best.t.ranged && u.shots > 0 && !u.boss) {
        const spot = sightSpot(b, u, o.reach, heroes); if (spot !== null) return { type: 'move', to: spot };
      }
      return { type: 'attack', target: best.t.id, from: best.t.ranged ? undefined : pickFromHex(b, u, best.f, best.t.from, o.reach) };
    }
    if (u.ranged && u.shots > 0) { const spot = sightSpot(b, u, o.reach, heroes); if (spot !== null) return { type: 'move', to: spot }; }
    const goal = heroes.slice().sort((x, y) => hexDist(u.pos, x.pos) - hexDist(u.pos, y.pos))[0];
    return { type: 'move', to: bestApproach(o.reach, goal.pos) };
  }
  // how the AI uses a bonus action: 'pre' before the main action, 'post' after it
  function bonusAI(s, b, u, when) {
    const o = bonusOptions(b, u); if (!o) return null;
    const B = o.B; const foes = foesOf(b, u); const near = adjFoes(b, u);
    const unit = id => b.units.find(x => x.id === id);
    const awayHex = (hexes, keepSight) => {
      let best = null, bs = -Infinity;
      for (const k of hexes) {
        const d = Math.min.apply(null, foes.map(f => hexDist(f.pos, k)).concat([99])); if (d <= 1) continue;
        const sc = Math.min(d, 5) * 2 + (keepSight && foes.some(f => los(b, k, f.pos)) ? 4 : 0) + (b.tiles[k] === 'brush' ? 1 : 0) - hexDist(u.pos, k) * 0.1;
        if (sc > bs) { bs = sc; best = k; }
      }
      return best;
    };
    if (B.kind === 'heal') return u.hp < u.maxHp * 0.45 ? { type: 'bonus' } : null;
    if (B.kind === 'healAlly') {
      const ts = o.targets.map(unit); const down = ts.find(x => x.down);
      if (down) return { type: 'bonus', target: down.id };
      const hurt = ts.filter(x => x.hp < x.maxHp * 0.35).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      return hurt && when === 'post' ? { type: 'bonus', target: hurt.id } : null;
    }
    if (B.kind === 'aim') return when === 'pre' && options(b, u).targets.some(t => t.ranged) ? { type: 'bonus' } : null;
    if (B.kind === 'guard') return when === 'post' && near.length ? { type: 'bonus' } : null;
    if (when !== 'post' && B.kind !== 'teleport') return null;
    if (B.kind === 'teleport') {
      // casters and skirmishers slip out of melee; flyers drift away after striking
      const want = isHero(u) ? when === 'pre' && near.length : when === 'post' && near.length && u.didAttack;
      if (!want) return null;
      const k = awayHex(o.hexes, u.ranged || isHero(u)); return k === null ? null : { type: 'bonus', to: k };
    }
    if (B.kind === 'step') { const k = awayHex(o.hexes, false); return k === null ? null : { type: 'bonus', to: k }; }
    if (B.kind === 'strike' || B.kind === 'throw') { const t = o.targets.map(unit).sort((x, y) => (x.hp / x.maxHp) - (y.hp / y.maxHp))[0]; return t ? { type: 'bonus', target: t.id } : null; }
    if (B.kind === 'prone') {
      // knock down whoever the most allies can reach
      const t = o.targets.map(unit).sort((x, y) => b.units.filter(z => z.side === u.side && conscious(z) && hexDist(z.pos, y.pos) <= 2).length - b.units.filter(z => z.side === u.side && conscious(z) && hexDist(z.pos, x.pos) <= 2).length)[0];
      return t ? { type: 'bonus', target: t.id } : null;
    }
    return null;
  }
  // one step of a unit's turn: maybe a bonus first, then its action (moving in as needed), maybe a bonus after, then done
  function autoAction(s) {
    const b = s.battle; if (!b || b.phase === 'deploy') return null;
    const u = b.units.find(x => x.id === b.cur); if (!u) return null;
    u.steps = (u.steps || 0) + 1;
    if (u.steps > 10) return { type: 'end' };
    if (!u.preDone) { u.preDone = true; const bo = bonusAI(s, b, u, 'pre'); if (bo) return bo; }
    const main = () => isHero(u) ? heroAI(s, b, u) : monsterAI(s, b, u);
    if (!u.acted) {
      const a = main();
      if (a.type !== 'move') return a;
      if (a.to !== u.pos && u.mv > 0) return a;
      // nothing in reach with the move that's left: dash closer if there's anyone to chase
      const foes = foesOf(b, u);
      if (foes.length && Math.min.apply(null, foes.map(f => hexDist(f.pos, u.pos))) > 1 && !(u.ranged && u.shots > 0 && u.side === 'dm')) return { type: 'dash' };
      return { type: 'defend' };
    }
    if (u.dashed && u.mv > 0) { const a = main(); if (a.type === 'move' && a.to !== u.pos) return a; u.mv = 0; }
    if (!u.bonused) { const bo = bonusAI(s, b, u, 'post'); if (bo) return bo; }
    return { type: 'end' };
  }
  function autoStep(s) {
    const b = s.battle; if (b && b.phase === 'deploy') { beginBattle(s); return null; }
    const a = autoAction(s); if (!a) return 'No one to act.'; return act(s, a);
  }

  /* --- the DM's spellbook --- */
  function canDmSpell(s, key) {
    const b = s.battle; const sp = DM_SPELLS[key]; if (!sp) return 'Not a spell you know.';
    if (!b || s.phase !== 'battle' || b.phase === 'deploy') return 'Not in battle.';
    if ((spellPurse(s, sp).gold || 0) < sp.cost) return sp.purse === 'town' ? `Millbrook needs ${sp.cost} gold.` : `Your tower needs ${sp.cost} gold.`;
    if (key === 'reinforce' && b.reinforced) return 'Once a fight.';
    if (key === 'deus') return b.pendingTPK ? null : 'Only when every hero has fallen.';
    if (b.pendingTPK) return 'Every hero has fallen. Only a Deus ex Machina can help now.';
    if (b.over) return 'The battle is over.';
    const u = b.units.find(x => x.id === b.cur);
    if (!u || u.side !== 'dm') return 'Cast on one of your monsters\' turns.';
    if (b.dmSpellRound === b.round) return 'One spell per round.';
    if (key === 'pull' && b.pull) return 'Already pulling punches.';
    if (key === 'lucky' && !b.units.some(x => x.side === 'party' && x.alive && x.down)) return 'Nobody has fallen.';
    if (key === 'retreat' && b.finale) return `${b.vname || 'The villain'} never retreats from the throne room.`;
    if (key === 'reinforce' && b.units.filter(x => x.side === 'dm' && x.alive).length >= MAX_GROUPS + 2) return 'No room for more.';
    return null;
  }
  function dmSpell(s, key) {
    const err = canDmSpell(s, key); if (err) return err;
    const b = s.battle; const sp = DM_SPELLS[key];
    b.events = [];
    spellPurse(s, sp).gold -= sp.cost; s.railroad = clamp(s.railroad + sp.rail, 0, 100); s.engagement = clamp(s.engagement - (sp.mood || 0), 0, 100); b.dmSpellRound = b.round;
    if (key === 'pull') { b.pull = true; blog(b, 'Behind the screen, you quietly lower the monsters\' damage dice.', 'dm'); }
    if (key === 'lucky') {
      const f = b.units.find(x => x.side === 'party' && x.alive && x.down);
      f.down = false; f.stable = false; f.hp = Math.max(1, Math.round(f.maxHp / 4)); f.saves = 0; f.fails = 0;
      b.events.push({ t: 'spell', name: 'Lucky Break', fx: 'heal', targets: [f.id], heal: true });
      blog(b, `You fudge a death save. ${f.name} gasps and gets back up.`, 'dm');
    }
    if (key === 'reinforce') {
      const L = avgLevel(s);
      const type = b.boss || L >= 5 ? 'knight' : L >= 3 ? 'wolf' : 'goblin';
      const count = type === 'knight' ? 2 + Math.floor(L / 2) : type === 'wolf' ? 4 + L : 6 + 2 * L;
      if (!dmFreeHexes(b).length) { spellPurse(s, sp).gold += sp.cost; s.railroad -= sp.rail; s.engagement += sp.mood || 0; b.dmSpellRound = 0; return 'No room for reinforcements.'; }
      for (const u of addGroups(b, type, count)) b.events.push({ t: 'summon', id: u.id });
      b.reinforced = true;
      blog(b, `Reinforcements! ${count} ${CREATURES[type].name} charge onto the field.`, 'dm');
    }
    if (key === 'retreat') { b.over = 'fled'; blog(b, 'You decide the monsters have had enough. They break and run.', 'dm'); }
    if (key === 'deus') {
      b.pendingTPK = false;
      for (const x of b.units) if (x.side === 'party' && x.alive && x.down) { x.down = false; x.stable = false; x.hp = Math.max(1, Math.round(x.maxHp / 4)); }
      b.events.push({ t: 'spell', name: 'Deus ex Machina', fx: 'heal', targets: b.units.filter(x => x.side === 'party' && x.alive).map(x => x.id), heal: true });
      if (b.finale) { blog(b, 'A spectral knight steps out of the shadows and drags the heroes to their feet. "Finish this," it says, and fades.', 'dm'); nextTurn(b); }
      else { b.over = 'saved'; blog(b, 'A mysterious ranger bursts in, drives the monsters off, and vanishes. The players exchange looks.', 'dm'); }
    }
    if (sp.mood >= 4) blog(b, `One of the players narrows their eyes. "Huh. Lucky." (−${sp.mood} mood)`, 'dm');
    return null;
  }
  function acceptTPK(s) {
    const b = s.battle; if (!b || !b.pendingTPK) return;
    b.pendingTPK = false;
    for (const u of b.units) if (u.side === 'party' && u.alive) { u.alive = false; u.dead = true; b.died.push(u.hero); }
    b.over = 'tpk'; blog(b, 'The monsters finish the job. Total party kill.', 'death');
  }

  /* --- wrapping up --- */
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const ATTACK_XP = { Trivial: 0, Easy: 0.5, Tense: 1, Harrowing: 1.25 };
  const ATTACK_LORE = { Trivial: 0, Easy: 1, Tense: 3, Harrowing: 5 };
  function finishBattle(s) {
    const b = s.battle; if (!b || !b.over) return null;
    if (b.duel) return finishDuel(s);   // 0.31: your villain against a band of the wilds
    const P = s.party; const lines = []; const gold0 = s.res ? s.res.gold : 0;
    const won = b.over === 'win';
    for (const u of b.units.filter(x => x.side === 'party')) {
      const h = s.heroes.find(x => x.id === u.hero);
      if (u.dead || !u.alive) { h.status = 'dead'; h.hp = 0; continue; }
      h.hp = u.down ? 1 : Math.max(1, u.hp); h.mana = Math.max(0, u.mana); h.status = 'ok';
    }
    const frac = b.dmgTaken / Math.max(1, b.startMax);
    const label = frac < 0.06 ? 'Trivial' : frac < 0.18 ? 'Easy' : frac < 0.38 ? 'Tense' : 'Harrowing';
    const val = { Trivial: b.attack ? -2 : 0, Easy: 2, Tense: 5, Harrowing: 8 }[label];
    const firstFoe = b.units.find(u => u.side === 'dm' && !u.boss);
    const dungeon = b.dungeonId ? s.objects.find(o => o.id === b.dungeonId) : null;
    const name = b.boss ? vName(s) : dungeon ? `the ${DUNGEONS[dungeon.dtype].name}` : b.attack ? 'your war party' : firstFoe ? `the ${firstFoe.name}` : 'the monsters';
    // 0.30: Infamy for the villain: every bit of the heroes' blood your monsters spill, heroes downed and slain
    const tline = (l, v) => { const n = addInfamy(s, v, l); if (n) lines.push({ label: l, v: n }); };
    s.todayActive = true;
    if (frac >= 0.06) tline(`${cap(name)} cost the heroes ${Math.round(Math.min(1, frac) * 100)}% of their health`, Math.round(Math.min(1, frac) * 12));
    const downs = b.downed.filter(id => b.died.indexOf(id) < 0).length;
    if (downs) tline(downs > 1 ? `${downs} heroes went down` : 'A hero went down', 3 * downs);
    for (const id of b.died) { const h = s.heroes.find(x => x.id === id); if (!h) continue; tline(`${h.name} died`, 10); s.deaths++; }
    if (b.over === 'tpk') tline('The whole party fell', 15);
    if (b.traps.some(t => t.sprung)) tline('Your hidden traps caught them', 1);
    s.seen = s.seen || {};
    for (const t of b.units.filter(u => u.side === 'dm' && !u.boss && CREATURES[u.type]).map(u => u.type)) s.seen[t] = 1;
    const survivors = b.units.filter(u => u.side === 'dm' && !u.boss && u.alive && u.count > 0);
    const byKind = []; for (const u of survivors) { const e = byKind.find(x => x.type === u.type); if (e) e.count += u.count; else byKind.push({ type: u.type, count: u.count }); }
    // a lone monster stack from the map
    const obj = b.objId ? s.objects.find(o => o.id === b.objId) : null;
    if (obj) {
      if (won || b.over === 'fled' || b.over === 'saved') { s.objects = s.objects.filter(o => o !== obj); if (won) questCheck(s, { kind: 'obj', id: obj.id }); }
      else if (b.over === 'retreat' || b.over === 'tpk') { const left = sum(b.units.filter(u => u.side === 'dm' && !u.boss && u.src === 0 && u.alive), u => u.count); if (left) obj.count = left; else s.objects = s.objects.filter(o => o !== obj); }
    }
    // hard-won loot (0.16): a close fight often leaves a magic item among the fallen
    if (won && !b.boss && (label === 'Tense' || label === 'Harrowing') && avgLevel(s) >= 3 && chance(label === 'Harrowing' ? LOOT.harrowing : LOOT.tense)) { const t = grantArtifact(s, randomArtifact(s)); say(s, 'Among the fallen they find ' + t, 'good'); }
    if (dungeon) {
      if (won && dungeon.mine) {
        // your lairs are wrecked, not erased: four days to dig out and start breeding again
        wreckLair(s, dungeon); questCheck(s, { kind: 'obj', id: dungeon.id });
        if (chance(0.25)) { const t = grantArtifact(s, randomArtifact(s)); say(s, 'In the rubble they find ' + t, 'good'); }
      } else if (won) {
        s.objects = s.objects.filter(o => o !== dungeon);
        if (chance(0.4)) { const t = grantArtifact(s, randomArtifact(s)); say(s, 'In the ruins they find ' + t, 'good'); }
        questCheck(s, { kind: 'obj', id: dungeon.id });
      } else if (b.over === 'retreat' || b.over === 'fled' || b.over === 'saved') {
        for (const t of Object.keys(dungeon.pool)) dungeon.pool[t] = sum(survivors.filter(x => x.type === t), x => x.count);
      }
    }
    if (b.guardLair) {
      const gl = s.objects.find(o => o.id === b.guardLair);
      if (gl) { const u = DUNGEONS[gl.dtype].unit; gl.pool[u] = sum(byKind.filter(k => k.type === u), k => k.count); }
      const node = (s.nodes || []).find(n => n.id === b.raidNode);
      if (won && node) raidNode(s, node);
    }
    if (b.villain && !b.finale) {
      const V = s.villain; const boss = b.units.find(u => u.boss);
      if (won || (boss && boss.escaped && b.over !== 'tpk')) {
        V.state = 'banished'; V.banish = 3; V.known = false; V.army = won ? [] : byKind;
        V.path = []; V.target = null; V.meet = null; V.hpFrac = 1; { const tw = siteOf(s, 'tower'); V.x = tw.x; V.y = tw.y; }   // 0.31: home to recover
        questCheck(s, { kind: 'villain' });
      } else if (b.over === 'fled' || b.over === 'saved') { V.state = 'lair'; V.known = false; V.army = byKind; }
      else V.army = byKind;
    }
    if (b.over === 'retreat') { if (!s.objects.some(o => o.kind === 'stack' && o.x === P.prev.x && o.y === P.prev.y)) { P.x = P.prev.x; P.y = P.prev.y; } P.mp = 0; P.path = []; P.pending = null; }
    // experience only comes from fights that pushed them
    // a war party you sent pays by how close the fight actually was; anything else by how it looked on paper
    const xpMult = b.attack ? ATTACK_XP[label] : Math.max({ trivial: 0, beatable: 0.6, worthy: 1, avoid: 1.3 }[b.challenge || 'worthy'], label === 'Harrowing' ? 1.2 : 0);
    const xp = b.over === 'tpk' ? 0 : Math.round(b.killedHp * xpMult);
    let bossWin = false, next = null;
    if (b.finale && b.stage === 1 && won) next = 'throne';
    if (b.finale && b.stage === 2 && won) bossWin = true;
    const failedAssault = b.finale && !won && b.over !== 'tpk';
    if (failedAssault) tline('The heroes failed to take the Dark Tower', 12);
    let bounty = 0, home = [];
    if (b.attack) {
      // whatever survives marches home to your garrison, and a close fight fills your coffers
      home = returnSurvivors(s, b, byKind);
      bounty = b.over === 'tpk' ? 0 : b.died.length ? 1 : b.over === 'win' ? ATTACK_LORE[label] : b.over === 'retreat' ? 2 : 0;
      if (bounty) s.res.gold += 4 * bounty; // (0.19: gold for the tower instead of Lore)
    }
    if (xp) giveXp(s, xp);
    // the heroes' loot: a share of every fight they win goes home to Millbrook
    const townGold = won && !b.finale && s.town ? lootGold(s, label) : 0; if (townGold) s.town.res.gold += townGold;
    s.wk.battles++;
    if (b.over !== 'tpk') for (const id of b.died) { const h = s.heroes.find(x => x.id === id && x.status === 'dead'); if (h) replaceFallen(s, h); }
    const summary = { result: b.over, label, frac, xp, townGold, challenge: b.challenge, xpMult, attack: b.attack, bounty, home, sent: b.sent, towerGold: (s.res ? s.res.gold : 0) - gold0, noXp: !xp && b.killedHp > 0 && b.over !== 'tpk', killed: b.killed, plural: b.plural, lines, died: b.died.map(id => (b.units.find(u => u.hero === id) || {}).name), boss: b.boss, finale: b.finale, stage: b.stage, next, escaped: !!(b.units.find(u => u.boss) || {}).escaped, dungeon: !!dungeon, rounds: b.round, siege: !!b.siege };
    const killedTxt = Object.keys(b.killed).map(k => `${b.killed[k]} ${b.killed[k] > 1 ? b.plural[k] || k : k}`).join(', ');
    say(s, won ? `Victory! ${killedTxt ? 'Slain: ' + killedTxt + '. ' : ''}${label === 'Easy' ? 'An' : 'A'} ${label.toLowerCase()} fight (+${xp} XP).` : b.over === 'tpk' ? 'Total party kill.' : b.over === 'retreat' ? 'The party retreated.' : 'The monsters left the field.', b.over === 'tpk' ? 'death' : 'big');
    s.lastBattle = summary;
    s.battle = null;
    s.todayActive = true;
    if (b.over === 'tpk') {
      // 0.30: a wiped-out party. While Millbrook's tavern stands, a new one takes its place; otherwise you've won
      summary.wiped = true; summary.newParty = !partyWiped(s) ? s.heroes.map(h => h.name) : null;
      if (s.phase !== 'over') { s.phase = 'map'; planRoute(s); }
    }
    else if (bossWin) { s.result = 'defeat'; s.phase = 'over'; s.history.push({ week: s.week, level: avgLevel(s), vlevel: villainLevel(s), final: true }); say(s, `${vFull(s)} falls on the throne. The heroes of Millbrook have saved the realm.`, 'boss'); }
    else if (next === 'throne') {
      // a breather at the inner doors, then the throne room
      for (const h of living(s)) { h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp * 0.3)); h.mana = Math.min(h.maxMana, h.mana + Math.ceil(h.maxMana * 0.3)); }
      say(s, 'The heroes catch their breath at the inner doors, then climb to the throne room.', 'boss');
      s.phase = 'map'; startVillainBattle(s, true);
    }
    else {
      s.phase = 'map';
      if (failedAssault) { endMarch(s); say(s, 'The battered heroes fall back from the Dark Tower to regroup.', 'big'); }
      planRoute(s); // 0.19: a bored table no longer marches on the tower; the mood is only a score
    }
    return summary;
  }

  /* ================= estimates ================= */
  // run the two-stage showdown n times from full health: gates, a breather, then the throne room
  function simulateFinale(s, n, opts) {
    n = n || 16; opts = opts || {}; let tpk = 0, fracSum = 0, wins = 0, gateLoss = 0;
    for (let i = 0; i < n; i++) {
      const t = { seed: s.seed + i, uid: i, week: s.week, day: 1, heroes: clone(s.heroes), party: clone(s.party), crown: s.crown, villain: clone(s.villain), citadel: clone(s.citadel || { built: { throne: 1 } }), base: clone(s.base || null), town: clone(s.town || null), talents: clone(s.talents || null), unlocked: clone(s.unlocked || {}), railroad: 0, lore: 0, objects: [], phase: 'map', wk: newWeekLog(), log: [], quests: [], seen: {} };
      for (const h of t.heroes) { h.status = 'ok'; h.hp = h.maxHp; h.mana = h.maxMana; }
      const startMax = sum(t.heroes, h => h.maxHp);
      let lost = 0, dead = false;
      for (const stage of opts.throneOnly ? [2] : [1, 2]) {
        if (stage === 1) startBattle(t, null, { finale: true, stage: 1, stacks: gateGuards(t) }); else startVillainBattle(t, true);
        beginBattle(t);
        const b = t.battle; let g = 0;
        while (!b.over && !b.pendingTPK && g++ < 1500) autoStep(t);
        if (b.pendingTPK || b.over !== 'win') { dead = true; if (stage === 1) gateLoss++; break; }
        lost += b.dmgTaken;
        for (const u of b.units.filter(x => x.side === 'party')) { const h = t.heroes.find(x => x.id === u.hero); if (!u.alive) { h.status = 'dead'; continue; } h.hp = u.down ? 1 : Math.max(1, u.hp); h.mana = Math.max(0, u.mana); }
        for (const h of t.heroes) if (h.status === 'ok') { h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp * 0.3)); h.mana = Math.min(h.maxMana, h.mana + Math.ceil(h.maxMana * 0.3)); }
        t.battle = null; t.phase = 'map';
      }
      if (dead) { tpk++; fracSum += 1; continue; }
      wins++; fracSum += Math.min(1, lost / Math.max(1, startMax));
    }
    const avg = fracSum / n;
    let label = avg < 0.06 ? 'Trivial' : avg < 0.18 ? 'Easy' : avg < 0.38 ? 'Tense' : 'Harrowing';
    if (tpk / n >= 0.2) label = 'Deadly';
    return { label, avg, tpk: tpk / n, win: wins / n, gateLoss: gateLoss / n };
  }
  // one practice run of a fight against these stacks (i picks the dice), for the balance meter
  function simAttackRun(s, stacks, i, lvl) {
    const t = { seed: s.seed + i * 7919, uid: i, week: s.week, day: s.day, heroes: clone(s.heroes), party: clone(s.party), crown: s.crown, villain: clone(s.villain), base: null, town: clone(s.town || null), talents: clone(s.talents || null), railroad: 0, lore: 0, engagement: 50, objects: [], phase: 'map', wk: newWeekLog(), log: [], quests: [], seen: clone(s.seen || {}), deaths: 0, pendingLevelUps: [], heroesUsed: [] };
    if (!t.heroes.some(h => h.status === 'ok')) return null;
    startBattle(t, null, { stacks: stacks.map(x => [x[0], x[1]]), lvl: lvl || 1 });
    beginBattle(t);
    const b = t.battle; let g = 0;
    while (!b.over && !b.pendingTPK && g++ < 1200) autoStep(t);
    const tpk = !!b.pendingTPK || b.over === 'tpk';
    const frac = tpk ? 1 : b.dmgTaken / Math.max(1, b.startMax);
    const label = frac < 0.06 ? 'Trivial' : frac < 0.18 ? 'Easy' : frac < 0.38 ? 'Tense' : 'Harrowing';
    return { frac, tpk, death: b.died.length > 0, xp: tpk || b.over !== 'win' ? 0 : Math.round(b.killedHp * ATTACK_XP[label]), win: b.over === 'win' };
  }
  function simAttackSum(runs) {
    runs = runs.filter(Boolean); const n = runs.length; if (!n) return null;
    const avg = sum(runs, r => r.frac) / n; const tpk = runs.filter(r => r.tpk).length / n; const death = runs.filter(r => r.death).length / n;
    let label = avg < 0.06 ? 'Trivial' : avg < 0.18 ? 'Easy' : avg < 0.38 ? 'Tense' : 'Harrowing';
    if (tpk >= 0.2) label = 'Deadly';
    return { label, avg, tpk, death, xp: Math.round(sum(runs, r => r.xp) / n), n };
  }
  function simulateStacks(s, stacks, n, lvl) { const runs = []; for (let i = 0; i < (n || 12); i++) runs.push(simAttackRun(s, stacks, i, lvl)); return simAttackSum(runs); }
  // "find a fair fight": nudges the size of your war party until a handful of practice runs come out tense.
  // Call step() until done; each step plays one practice battle, so a page can spread the work over frames.
  const FAIR = { target: 0.3, lo: 0.18, hi: 0.38, per: 8, iters: 5 };
  function fairSearch(s) {
    const S0 = { k: 1, iter: 0, runs: [], comp: fairAttack(s, 1), done: false, tried: [], best: null };
    const score = r => Math.abs(r.avg - FAIR.target) + r.tpk * 3 + r.death * 0.6;
    const key = c => c.map(x => x.join(':')).join(',');
    if (!S0.comp.length) S0.done = true;
    S0.step = function () {
      if (S0.done) return S0;
      S0.runs.push(simAttackRun(s, S0.comp, S0.iter * 31 + S0.runs.length));
      if (S0.runs.length < FAIR.per) return S0;
      const r = simAttackSum(S0.runs); S0.runs = [];
      const entry = { comp: S0.comp, r, sc: r ? score(r) : 99 };
      S0.tried.push(entry);
      if (!S0.best || entry.sc < S0.best.sc) S0.best = entry;
      S0.iter++;
      if (!r || (r.label === 'Tense' && r.avg >= 0.22 && r.tpk === 0 && r.death <= 0.2) || S0.iter >= FAIR.iters) { S0.done = true; return S0; }
      const all = garrisonList(s); const maxed = S0.comp.every(([t, n]) => { const a = all.find(x => x[0] === t); return a && n >= a[1]; });
      if (r.avg < FAIR.lo && maxed) { S0.done = true; return S0; }
      const want = r.tpk > 0.1 || r.death > 0.25 ? 0.6 : Math.pow(FAIR.target / Math.max(0.03, r.avg), r.avg > FAIR.target ? 0.75 : 0.6);
      S0.k *= clamp(want, 0.45, 2.2);
      const next = fairAttack(s, S0.k);
      if (key(next) === key(S0.comp) || S0.tried.some(t => key(t.comp) === key(next))) { S0.done = true; return S0; }
      S0.comp = next;
      return S0;
    };
    return S0;
  }
  function fairAttackSync(s) { const f = fairSearch(s); let g = 0; while (!f.done && g++ < 200) f.step(); return f.best; }
  function simulate(s, type, count, n) { return simulateStacks(s, [[type, count]], n || 20); }
