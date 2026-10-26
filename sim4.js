// scripted DM for the open-ended campaign: builds the citadel, breeds lairs, conjures fair fights, posts quests
const G = require(__dirname + '/game.js');
const N = +process.argv[2] || 20;
const VERBOSE = process.argv[3] === 'v';
const STYLE = process.argv[4] || 'good'; // good | lazy (no quests) | rush (marches early)
const TECH_PLAN = ['barracks', 'library', 'ossuary', 'ogre', 'forge', 'altar', 'spire', 'troll', 'giant', 'knights', 'mire', 'roost', 'blood', 'gate'];
const LAIRS_BY_TIER = ['warren', 'camp', 'bonecrypt', 'den', 'barrow', 'fens', 'hold', 'roost', 'keep', 'abyss'];

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
function placeNear(s, kind, rmin, rmax, size) {
  const P = s.party; const tgt = P.path.length ? P.path[Math.min(P.path.length - 1, 10)] : [P.x, P.y];
  for (let r = rmin; r < rmax; r++) for (let a = 0; a < 16; a++) {
    const x = Math.round(tgt[0] + Math.cos(a * 0.4) * r), y = Math.round(tgt[1] + Math.sin(a * 0.4) * r);
    if (!G.placeCheck(s, kind, x, y, size)) { G.place(s, kind, x, y, size); return true; }
  }
  return false;
}
function botDay(s) {
  const P = s.party; const pp = G.partyPower(s);
  // one citadel building a day, keeping a reserve
  const next = TECH_PLAN.find(k => !G.hasTech(s, k));
  if (next && s.day % 2 === 1 && !G.techCheck(s, next) && s.lore >= G.TECH[next].cost + 10) G.buildTech(s, next);
  // a lair of the best unlocked kind every so often
  const lairs = s.objects.filter(o => o.kind === 'dungeon');
  if (lairs.length < 4 && s.day % 2 === 0) {
    const k = LAIRS_BY_TIER.slice().reverse().find(k2 => !G.lockedBy(s, k2));
    if (k && s.lore >= G.DUNGEONS[k].cost + 2) placeNear(s, k, 5, 10);
  }
  for (const d of lairs) {
    const t0 = Object.keys(G.DUNGEONS[d.dtype].band)[0];
    const r = pp / G.stackPower(t0, Math.round(G.bandSize(s, d, t0)));
    G.setLairMode(s, d.id, r > 3.2 ? 'hold' : 'roam');
  }
  // march bands toward the party when the fight is fair
  for (const o of s.objects.filter(z => z.kind === 'stack')) {
    if (s.phase !== 'map') return;
    const ratio = pp / G.stackPower(o.type, o.count);
    if (ratio < 1.5 || ratio > 3.6) continue;
    const R = G.stackReach(s, o.id); if (!R || !R.tiles.size) continue;
    let best = null, bd = Infinity;
    for (const [i] of R.tiles) { const x = i % G.MW, y = (i / G.MW) | 0; const dd = Math.hypot(x - P.x, y - P.y); if (dd < bd && (dd > G.sightRadius(s) + 0.5 || dd < 1.5)) { bd = dd; best = [x, y]; } }
    if (best) { const r = G.moveStack(s, o.id, best[0], best[1]); if (r.battle) return; }
  }
  if (s.phase !== 'map' || s.march) return;
  // conjure a fair fight if nothing fair is nearby
  const near = s.objects.some(o => o.kind === 'stack' && Math.hypot(o.x - P.x, o.y - P.y) < 12 && pp / G.stackPower(o.type, o.count) > 1.3 && pp / G.stackPower(o.type, o.count) < 3.2);
  if (!near && P.path.length && process.env.CONJURE) {
    const best = pickStack(s, 1.6, 2.5, s.lore - 2);
    if (best) for (let i = 5; i < Math.min(P.path.length, 14); i++) { const [x, y] = P.path[i]; if (placeNear(s, best.t, 1, 3, best.size)) break; }
  }
  // quests keep them busy
  if (STYLE !== 'lazy') {
    const open = s.quests.filter(q => q.status === 'open').length;
    if (open < 2 && s.lore >= 5) {
      const fair = o => o.kind === 'stack' || o.kind === 'dungeon' ? (r => r > 1.6 && r < 4)(pp / (o.kind === 'stack' ? G.stackPower(o.type, o.count) : G.garrisonPower(o))) : !(G.ITEMS[o.kind] && G.ITEMS[o.kind].cat === 'trap');
      const t = s.objects.filter(o => fair(o) && !G.questOn(s, { kind: 'obj', id: o.id })).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
      if (t) G.postQuest(s, { kind: 'obj', id: t.id }, Math.max(1, Math.min(5, s.lore - 3)));
      else { const lm = G.SITES.find(z => z.kind === 'landmark' && !s.visited[z.id] && !G.questOn(s, { kind: 'site', id: z.id })); if (lm) G.postQuest(s, { kind: 'site', id: lm.id }, 3); }
    }
  }
  // treasure and events
  if (s.lore >= 10) {
    const kinds = ['artifact', 'chest', 'riddle', 'refugees', 'stranger', 'artifact', 'captive', 'pass', 'shrine'];
    const k = kinds[(s.week * 7 + s.day) % kinds.length];
    if (P.path.length > 6) placeNear(s, k, 2, 5);
  }
  if (STYLE === 'rush' && G.avgLevel(s) >= 12 && !s.march) G.startMarch(s, 'ready');
}
function runBattle(s, st) {
  let g = 0;
  if (s.battle && s.battle.phase === 'deploy') {
    if (s.battle.freeTraps) for (let c = 6; c <= 8 && s.battle.traps.length < s.battle.freeTraps; c++) G.deployTrap(s, G.hk(c, 5));
    G.beginBattle(s);
  }
  const b = s.battle; const L = G.avgLevel(s);
  while (s.battle && !s.battle.over && g++ < 4000) {
    const bb = s.battle;
    if (bb.pendingTPK) { if (s.lore >= 6 && !bb.finale) G.dmSpell(s, 'deus'); else G.acceptTPK(s); continue; }
    const err = G.autoStep(s);
    if (err) throw new Error('battle err ' + err);
  }
  if (g >= 4000) throw new Error('battle stuck');
  const r = G.finishBattle(s);
  st.labels[r.label] = (st.labels[r.label] || 0) + 1;
  if (r.finale) { const k = `stage${r.stage}:${r.result}@L${L}`; st.finale[k] = (st.finale[k] || 0) + 1; }
  if (r.noXp) st.noXp++;
  return r;
}
function runEncounter(s, st) {
  const e = s.enc; G.encChoose(s, e.choices[1].k);
  let g = 0; while (s.enc.stage === 'rolling' && g++ < 10) { G.encRoll(s); G.encSettle(s); }
  G.encFinish(s);
  const r = G.encClose(s);
  if (r === 'battle') runBattle(s, st);
}
const st = { wthr: {}, weng: {}, wlv: {}, wlore: {}, pen: {}, res: {}, weeks: [], lvAt: {}, labels: {}, finale: {}, deaths: 0, marches: {}, noXp: 0, items: [] };
for (let i = 0; i < N; i++) {
  const s = G.newGame(2000 + i);
  let guard = 0; const reached = {};
  while (s.phase !== 'over' && guard++ < 2000 && s.week <= 24) {
    if (s.phase === 'battle') { runBattle(s, st); continue; }
    if (s.phase === 'encounter') { runEncounter(s, st); continue; }
    if (s.phase === 'map') {
      const wasMarch = s.march;
      botDay(s);
      if (s.phase !== 'map') continue;
      let steps = 0;
      for (;;) {
        const ev = G.partyStep(s);
        if (ev.t === 'battle') { runBattle(s, st); if (s.phase !== 'map') break; continue; }
        if (ev.t === 'encounter') { runEncounter(s, st); if (s.phase !== 'map') break; continue; }
        if (ev.t === 'stop' || ev.t === 'none' || steps++ > 300) break;
      }
      if (s.phase === 'map') G.endDay(s);
      if (s.march && !wasMarch) { const k = s.march + '@L' + G.avgLevel(s); st.marches[k] = (st.marches[k] || 0) + 1; }
    }
    for (const L of [5, 10, 15, 18]) if (!reached[L] && G.avgLevel(s) >= L) { reached[L] = s.week + (s.day - 1) / 7; (st.lvAt[L] = st.lvAt[L] || []).push(reached[L]); }
    if (s.phase === 'week') {
      const r = s.recap;
      if (process.env.STALL && r.week === 12) console.log('STALL', s.seed, 'party', s.party.x, s.party.y, 'march', s.march, 'path', s.party.path.length, s.party.intent, s.heroes.map(h => h.status + h.hp + 'L' + h.level).join(','), '\n   ' + s.log.slice(-10).map(l => l.t).join('\n   '));
      if (VERBOSE && i < 2 && process.env.LINES) console.log('   ', r.lines.map(l => l.label.slice(0, 40) + ':' + l.v).join(' | '), '\n   ENG:', r.eng.map(l => l.label.slice(0, 30) + ':' + l.v).join(' | '));
      if (VERBOSE && i < 2) console.log(`W${r.week} thrill=${r.thrill} eng=${r.after} lore=${s.lore} lvl=${G.avgLevel(s)} ready=${r.ready.ratio.toFixed(2)} items=${s.heroes.reduce((a, h) => a + h.items.length, 0)} tech=${Object.keys(s.citadel.built).length}`);
      (st.wthr[r.week] = st.wthr[r.week] || []).push(r.thrill); (st.weng[r.week] = st.weng[r.week] || []).push(r.after); (st.wlv[r.week] = st.wlv[r.week] || []).push(G.avgLevel(s)); (st.wlore[r.week] = st.wlore[r.week] || []).push(s.lore);
      for (const l of r.eng) if (l.v < 0) st.pen[l.label.replace(/[0-9]+ /, 'N ').replace(/^.*'s player had nothing.*$/, 'no spotlight')] = (st.pen[l.label.replace(/[0-9]+ /, 'N ').replace(/^.*'s player had nothing.*$/, 'no spotlight')] || 0) + l.v;
      G.startNextWeek(s);
    }
  }
  st.res[s.result || 'unfinished'] = (st.res[s.result || 'unfinished'] || 0) + 1;
  st.weeks.push(s.week); st.deaths += s.deaths; st.items.push(s.heroes.reduce((a, h) => a + h.items.length, 0));
  if ((VERBOSE && i < 2) || (process.env.TPKLOG && s.result === "tpk")) console.log("END", s.seed, s.villain.type, s.result, 'week', s.week, 'L', G.avgLevel(s), s.log.slice(-8).map(l => l.t).join(" / "));
}
const avg = a => a && a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
console.log('results', st.res, 'weeks', avg(st.weeks), 'deaths/game', (st.deaths / N).toFixed(2), 'items at end', avg(st.items));
console.log('reached level 5/10/15/18 at week', [5, 10, 15, 18].map(L => avg(st.lvAt[L]) + ` (${(st.lvAt[L] || []).length})`).join('  '));
for (const k of ['wthr', 'weng', 'wlv', 'wlore']) console.log(k.padEnd(6), Object.keys(st[k]).map(w => w + ':' + avg(st[k][w])).join('  '));
console.log('penalties', st.pen);
console.log('marches', st.marches); console.log('finale', st.finale); console.log('labels', st.labels, 'no-xp fights', st.noXp);
