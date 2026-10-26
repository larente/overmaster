const G = require(__dirname + '/game.js');
const N = +process.argv[2] || 40;
const VERBOSE = process.argv[3] === 'v';
const USE_EXTRAS = process.argv[4] !== 'basic';
const TECHS = process.argv[5] !== 'notech';

function pickStack(s, lo, hi, budget) {
  const pp = G.partyPower(s); let best = null;
  for (const t of G.CREATURE_ORDER) for (const size of [1, 2, 3]) {
    if (G.lockedBy(s, t)) continue;
    const cost = G.itemCost(s, t, size); if (cost > budget) continue;
    const ratio = pp / G.stackPower(t, G.CREATURES[t].base * size);
    if (ratio >= lo && ratio <= hi && (!best || cost > best.cost)) best = { t, size, cost };
  }
  return best;
}
function botPrep(s) {
  const P = s.party;
  if (!P.path.length) return;
  if (TECHS) {
    const next = TECH_PLAN.find(k => !G.hasTech(s, k));
    if (next && !G.techCheck(s, next) && s.lore >= G.TECH[next].cost + 2) G.buildTech(s, next);
  }
  const ppow = G.partyPower(s);
  const near = s.objects.some(o => o.kind === 'stack' && Math.hypot(o.x - P.x, o.y - P.y) < 12 && ppow / G.stackPower(o.type, o.count) > 1.3 && ppow / G.stackPower(o.type, o.count) < 3.2);
  if (!near && s.lore >= 4) {
    outer: for (let i = 5; i < Math.min(P.path.length, 14); i++) {
      const [x, y] = P.path[i];
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) {
        const best = pickStack(s, 1.45, 2.2, s.lore - 2); if (!best) break outer;
        if (!G.placeCheck(s, best.t, x + dx, y + dy, best.size)) { G.place(s, best.t, x + dx, y + dy, best.size); break outer; }
      }
    }
  }
  if (USE_EXTRAS) extrasNew(s);
  if (s.lore >= 6) {
    const kinds = ['chest', 'riddle', 'refugees', 'omen', 'stranger', 'captive', 'pass', 'shrine'];
    const k = kinds[(s.week * 7 + s.day) % kinds.length];
    for (let i = 6; i < Math.min(P.path.length, 12); i++) { const [x, y] = P.path[i]; if (!G.placeCheck(s, k, x, y)) { G.place(s, k, x, y); break; } }
  }
}
const TECH_PLAN = ['barracks', 'library', 'ossuary', 'ogre', 'altar', 'troll', 'giant'];
const LAIR_PLAN = [[1, 2, 'warren'], [1, 5, 'camp'], [2, 3, 'den'], [2, 6, 'bonecrypt'], [3, 2, 'hold'], [3, 4, 'barrow'], [3, 6, 'fens']];
function placeNear(s, kind, rmin, rmax) {
  const P = s.party; const tgt = P.path.length ? P.path[Math.min(P.path.length - 1, 10)] : [P.x, P.y];
  for (let r = rmin; r < rmax; r++) for (let a = 0; a < 16; a++) {
    const x = Math.round(tgt[0] + Math.cos(a * 0.4) * r), y = Math.round(tgt[1] + Math.sin(a * 0.4) * r);
    if (!G.placeCheck(s, kind, x, y)) { G.place(s, kind, x, y); return true; }
  }
  return false;
}
function extrasNew(s) {
  for (const [w, d, k] of LAIR_PLAN) {
    if (s.week === w && s.day === d && !G.lockedBy(s, k) && s.lore >= G.DUNGEONS[k].cost + 2 && s.objects.filter(o => o.kind === 'dungeon').length < 4) placeNear(s, k, 6, 12);
  }
  for (const d of s.objects.filter(o => o.kind === 'dungeon')) if ((d.level || 1) < 2 && s.week >= 2 && s.lore >= G.lairUpCost(d.dtype) + 8) G.upgradeLair(s, d.id);
  // lairs: roam only when their bands would be a real fight, otherwise hoard and release a fitted band
  const pp0 = G.partyPower(s);
  for (const d of s.objects.filter(o => o.kind === 'dungeon')) {
    const D = G.DUNGEONS[d.dtype];
    const t0 = Object.keys(D.band)[0];
    const r = pp0 / G.stackPower(t0, Math.round(G.bandSize(s, d, t0)));
    G.setLairMode(s, d.id, r > 3.2 ? 'hold' : 'roam');
    if (d.mode === 'hold' && !s.objects.some(o => o.kind === 'stack' && o.lair === d.id)) {
      for (const t of Object.keys(d.pool)) {
        let n = Math.floor(d.pool[t]); if (n < 1) continue;
        while (n > 1 && pp0 / G.stackPower(t, n) < 1.5) n--;
        if (pp0 / G.stackPower(t, n) <= 2.4) { G.release(s, d.id, t, n); break; }
      }
    }
  }
  // march lair bands at the party when the fight looks worthy
  const pp = G.partyPower(s);
  for (const o of s.objects.filter(z => z.kind === 'stack' && z.fromDungeon)) {
    if (s.phase !== 'map') return;
    const ratio = pp / G.stackPower(o.type, o.count);
    if (ratio < 1.35 || ratio > 3.2) continue;
    const R = G.stackReach(s, o.id); if (!R || !R.tiles.size) continue;
    let best = null, bd = Infinity;
    for (const [i] of R.tiles) { const x = i % G.MW, y = (i / G.MW) | 0; const dd = Math.hypot(x - s.party.x, y - s.party.y); if (dd < bd && (dd > G.sightRadius(s) + 0.5 || dd < 1.5)) { bd = dd; best = [x, y]; } }
    if (best) { const r = G.moveStack(s, o.id, best[0], best[1]); if (r.battle) return; }
  }
  // quests
  if (s.quests.filter(q => q.status === 'open').length === 0 && s.lore >= 8 && s.week < G.WEEKS) {
    const t = s.objects.find(o => o.kind === 'dungeon' || o.kind === 'stack');
    if (t) G.postQuest(s, { kind: 'obj', id: t.id }, 4);
  }
  // villain
  const V = s.villain;
  if (s.week >= 2 && s.week < G.WEEKS && V.state === 'lair' && s.lore >= 12 && !V.army.length) { G.recruit(s, 'wolf', 1); G.rideOut(s); }
  else if (V.state === 'lair' && s.week >= 2 && s.week < G.WEEKS && V.army.length) G.rideOut(s);
  if (G.villainOnMap(s) && s.phase === 'map') {
    const R = G.villainReach(s);
    if (R && R.tiles.size) {
      let best = null, bd = Infinity;
      for (const [i] of R.tiles) { const x = i % G.MW, y = (i / G.MW) | 0; const dd = Math.hypot(x - s.party.x, y - s.party.y); if (dd < bd) { bd = dd; best = [x, y]; } }
      const ratio = G.partyPower(s) / G.villainPower(s);
      if (best && ratio > 1.3) G.moveVillain(s, best[0], best[1]);
    }
  }
  if (s.week === G.WEEKS - 1 && s.day === 5 && V.state === 'lair') { G.lairUpgrade(s, 'vigor'); G.lairUpgrade(s, 'traps'); }
}
function runBattle(s, st) {
  let g = 0;
  if (s.battle && s.battle.phase === 'deploy') {
    if (s.battle.freeTraps) for (let c = 6; c <= 8 && s.battle.traps.length < s.battle.freeTraps; c++) G.deployTrap(s, G.hk(c, 5));
    G.beginBattle(s);
  }
  while (s.battle && !s.battle.over && g++ < 3000) {
    const b = s.battle;
    if (b.pendingTPK) { if (s.lore >= 6) G.dmSpell(s, 'deus'); else G.acceptTPK(s); continue; }
    const err = G.autoStep(s);
    if (err) throw new Error('battle err ' + err);
  }
  if (g >= 3000) throw new Error('battle stuck');
  const r = G.finishBattle(s);
  if (st && r) { st.labels[r.label] = (st.labels[r.label] || 0) + 1; if (r.boss && !r.finale) st.villainFights++; if (r.dungeon) st.dungeonFights++; }
  return r;
}
function runEncounter(s, st) {
  const e = s.enc; G.encChoose(s, e.choices[1].k);
  let g = 0; while (s.enc.stage === 'rolling' && g++ < 10) { G.encRoll(s); G.encSettle(s); }
  G.encFinish(s); st.enc[e.kind] = (st.enc[e.kind] || 0) + 1;
  const r = G.encClose(s);
  if (r === 'battle') runBattle(s, st);
}

const st = { res: {}, lvl: {}, eng: {}, lore: {}, battles: {}, idle: {}, labels: {}, deaths: 0, thr: {}, enc: {}, villainFights: 0, dungeonFights: 0, quests: 0, traps: 0 };
const push = (o, k, v) => { (o[k] = o[k] || []).push(v); };
for (let i = 0; i < N; i++) {
  const s = G.newGame(1000 + i);
  let guard = 0;
  while (s.phase !== 'over' && guard++ < 500) {
    if (s.phase === 'battle') { runBattle(s, st); continue; }
    if (s.phase === 'encounter') { runEncounter(s, st); continue; }
    if (s.phase === 'map') {
      botPrep(s);
      if (s.phase !== 'map') continue;
      let steps = 0;
      for (;;) {
        const ev = G.partyStep(s);
        if (ev.t === 'battle') { runBattle(s, st); if (s.phase !== 'map') break; continue; }
        if (ev.t === 'encounter') { runEncounter(s, st); if (s.phase !== 'map') break; continue; }
        if (ev.t === 'trap') st.traps++;
        if (ev.t === 'stop' || ev.t === 'none' || steps++ > 300) break;
      }
      if (s.phase === 'map') G.endDay(s);
    }
    if (s.phase === 'week') {
      const r = s.recap;
      push(st.lvl, r.week, G.avgLevel(s)); push(st.eng, r.week, r.after); push(st.lore, r.week, s.lore); push(st.battles, r.week, s.wk.battles); push(st.idle, r.week, s.wk.idle); push(st.thr, r.week, r.thrill);
      if (VERBOSE && i < 2) console.log(`W${r.week} thrill=${r.thrill} eng=${r.after} lore=${s.lore} lvl=${G.avgLevel(s)} battles=${s.wk.battles}`, r.lines.map(l => l.label + ':' + l.v).join(' | '));
      G.startNextWeek(s);
    }
  }
  st.quests += s.quests.filter(q => q.status === 'done').length;
  st.tech = (st.tech || 0) + Object.keys(s.citadel.built).length - 1;
  const key = s.result || 'stuck@w' + s.week + s.phase;
  st.res[key] = (st.res[key] || 0) + 1;
  st.deaths += s.deaths;
  if (VERBOSE && i < 2) console.log('END', s.result, 'week', s.week, 'day', s.day, s.log.slice(-4).map(l => l.t).join(' / '));
}
const avg = a => a ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
const row = (n, o) => console.log(n.padEnd(10), [1, 2, 3, 4].map(w => avg(o[w])).join('  '));
console.log('results', st.res, 'deaths/game', (st.deaths / N).toFixed(2));
row('level', st.lvl); row('engage', st.eng); row('lore', st.lore); row('battles', st.battles); row('idle', st.idle); row('thrill', st.thr);
console.log('fight labels', st.labels, 'villain fights', st.villainFights, 'dungeon fights', st.dungeonFights, 'quests done', st.quests, 'traps', st.traps);
console.log('encounters', st.enc, 'tech/game', (st.tech / N).toFixed(1));
