// random play through the 0.9 loop: minions, sites, lairs on the map, war parties from lairs in reach, command-mode turns
const G = require(__dirname + '/game.js');
const N = +process.argv[2] || 30;
const R = () => Math.random();
const pickA = a => a[Math.floor(R() * a.length)];
const res = {}; const c = { trains: 0, works: 0, builds: 0, expands: 0, cancels: 0, recalls: 0, attacks: 0, battles: 0, acts: 0, bonus: 0, spells: 0, enc: 0, gifts: 0 };
function check(s) {
  for (const k of G.RES_KEYS) if (!(s.res[k] >= 0)) throw new Error('res ' + k + ' ' + s.res[k]);
  if (!(s.lore >= 0)) throw new Error('lore ' + s.lore);
  if (!(s.engagement >= 0 && s.engagement <= 100)) throw new Error('mood');
  for (const h of s.heroes) if (h.status !== 'dead' && (isNaN(h.hp) || h.hp > h.maxHp || h.hp < 0)) throw new Error('hero hp ' + h.name + ' ' + h.hp + '/' + h.maxHp);
  if (s.heroes.some(h => h.status === 'dead') && s.phase !== 'over') throw new Error('dead hero not replaced');
  const pos = s.objects.map(o => o.x + ',' + o.y); if (new Set(pos).size !== pos.length) throw new Error('two objects on a tile');
  for (const n of s.nodes) if (G.objAt(s, n.x, n.y)) throw new Error('object on a site');
  for (const o of G.myLairs(s)) { for (const k of Object.keys(o.pool)) if (!(o.pool[k] >= 0)) throw new Error('pool ' + o.pool[k]); if (!(o.building >= 0)) throw new Error('building'); }
  if (s.minions.length > G.MAX_MINIONS) throw new Error('too many minions');
  if ((s.summons || []).length > G.MAX_SUMMONS || s.minions.length + (s.summons || []).length > G.MAX_MINIONS) throw new Error('summon queue');
  for (const q of s.summons || []) if (!(q.days >= 1 && q.days <= q.total)) throw new Error('summon days ' + q.days);
  if (s.base.libBuild && !(s.base.libBuild.days >= 1)) throw new Error('library days');
  if (s.research.queue.length > G.MAX_RESEARCH) throw new Error('research queue');
  for (const k of Object.keys(s.research.done)) if (s.research.done[k] > G.researchRanks(k)) throw new Error('research rank ' + k);
  for (const o of G.myLairs(s)) if (!G.lairKnown(s, o.dtype)) throw new Error('lair not researched ' + o.dtype);
  for (const m of s.minions) {
    if (!isFinite(G.tileCost(s, m.x, m.y))) throw new Error('minion in a wall');
    if (m.job && m.job.kind === 'work' && !s.nodes.some(n => n.id === m.job.node)) throw new Error('bad work job');
    if (m.job && m.job.kind === 'build' && !G.myLairs(s).some(o => o.id === m.job.lair)) throw new Error('bad build job');
  }
  for (const n of s.nodes) if (G.assignedTo(s, n).length > G.NODE_KINDS[n.kind].cap) throw new Error('site overfull');
  JSON.parse(JSON.stringify(s));
}
function battle(s) {
  c.battles++; let g = 0;
  if (s.battle.phase === 'deploy') G.beginBattle(s);
  const command = R() < 0.4; if (command) s.battle.manual = true;
  while (s.battle && !s.battle.over && g++ < 8000) {
    const b = s.battle;
    if (b.pendingTPK) { if (R() < 0.5 && !G.dmSpell(s, 'deus')) c.spells++; else G.acceptTPK(s); continue; }
    const u = b.units.find(x => x.id === b.cur);
    if (command && u.side === 'dm') {
      if (R() < 0.05) { if (!G.dmSpell(s, pickA(Object.keys(G.DM_SPELLS)))) c.spells++; if (!s.battle || s.battle.over || s.battle.pendingTPK) continue; }
      const cu = s.battle.units.find(x => x.id === s.battle.cur); if (!cu || cu.side !== 'dm') continue;
      const o = G.options(b, cu); const bo = G.bonusOptions(b, cu); const r = R(); let err;
      if (r < 0.3 && o.targets.length) { const t = pickA(o.targets); err = G.act(s, { type: 'attack', target: t.id, from: pickA(t.from) }); }
      else if (r < 0.5 && o.reach.size > 1) { const ks = Array.from(o.reach.keys()); err = G.act(s, { type: 'move', to: pickA(ks) }); }
      else if (r < 0.65 && bo) { err = G.act(s, { type: 'bonus', target: bo.targets.length ? pickA(bo.targets) : undefined, to: bo.hexes.length ? pickA(bo.hexes) : undefined }); if (!err) c.bonus++; }
      else if (r < 0.72) err = G.act(s, { type: 'wait' });
      else if (r < 0.8) err = G.act(s, { type: 'defend' });
      else if (r < 0.88) err = G.act(s, { type: 'dash' });
      else err = G.act(s, { type: 'end' });
      if (err) { err = G.autoStep(s); if (err) throw new Error('auto after err: ' + err); }
    } else { const err = G.autoStep(s); if (err) throw new Error('auto: ' + err); }
    c.acts++;
    for (const x of b.units) if (x.alive && (isNaN(x.hp) || x.hp < 0 || !(x.count >= 0))) throw new Error('bad unit ' + JSON.stringify(x));
    const occ = b.units.filter(x => x.alive).map(x => x.pos); if (new Set(occ).size !== occ.length) throw new Error('two units on one hex');
    if (b.units.some(x => x.alive && (x.mv < 0 || x.mv > 40))) throw new Error('bad movement');
  }
  if (g >= 8000) throw new Error('battle stuck');
  const r = G.finishBattle(s); s.pendingLevelUps = [];
  return r;
}
function encounter(s) {
  c.enc++;
  const e = s.enc; G.encChoose(s, pickA(e.choices).k);
  let g = 0; while (s.enc.stage === 'rolling' && g++ < 10) { G.encRoll(s); if (s.enc.canFudge && R() < 0.4) G.encFudge(s); G.encSettle(s); }
  G.encFinish(s); if (G.encClose(s) === 'battle') battle(s);
}
for (let i = 0; i < N; i++) {
  const s = G.newGame(9300 + i, { party: G.rollParty(R() < 0.5 ? 'random' : 'balanced', R), villain: { type: pickA(G.BOSS_ORDER), name: 'Fuzz' + i } }); let guard = 0;
  if (R() < 0.4) { s.res.gold += 200; s.res.lumber += 150; s.res.ore += 150; s.lore += 100; }
  while (s.phase !== 'over' && guard++ < 800 && s.week < 14) {
    if (s.phase === 'battle') { battle(s); continue; }
    if (s.phase === 'encounter') { encounter(s); continue; }
    if (s.phase === 'week') { G.startNextWeek(s); if (s.phase !== 'over') check(s); continue; }
    if (R() < 0.4 && !G.trainMinion(s)) c.trains++;
    if (R() < 0.3) { const k = pickA(G.RESEARCH_ORDER); if (!G.startResearch(s, k)) c.research = (c.research || 0) + 1; }
    if (s.research.queue.length && R() < 0.06) G.cancelResearch(s, Math.floor(R() * s.research.queue.length));
    if ((s.summons || []).length && R() < 0.08) { const g0 = s.res.gold; if (!G.cancelSummon(s, Math.floor(R() * s.summons.length)) && s.res.gold > g0) c.cancels++; }
    for (let k = 0; k < 3; k++) if (R() < 0.6 && !G.orderWork(s, pickA(s.nodes).id)) c.works++;
    for (let k = 0; k < 2; k++) { const x = Math.floor(R() * G.MW), y = Math.floor(R() * G.MH); if (!G.orderBuild(s, pickA(G.LAIR_ORDER), x, y)) c.builds++; }
    if (R() < 0.5) { const sp = G.lairSpots(s, 'warren', 3); if (sp.length && !G.orderBuild(s, pickA(G.LAIR_ORDER), sp[0].x, sp[0].y)) c.builds++; }
    for (const o of G.myLairs(s)) { if (R() < 0.15 && !G.expandLair(s, o.id)) c.expands++; if (o.building && R() < 0.05 && !G.cancelBuild(s, o.id)) c.cancels++; }
    if (R() < 0.2 && s.minions.length) { if (!G.recallMinion(s, pickA(s.minions).id)) c.recalls++; }
    if (R() < 0.2 && !G.recallFrom(s, pickA(s.nodes).id)) c.recalls++;
    // 0.9.1: orders for a chosen minion
    if (s.minions.length) {
      const m = pickA(s.minions);
      const r = R();
      if (r < 0.25) { if (!G.orderWork(s, pickA(s.nodes).id, m.id)) c.mworks = (c.mworks || 0) + 1; }
      else if (r < 0.45) { if (!G.orderMove(s, m.id, Math.floor(R() * G.MW), Math.floor(R() * G.MH))) c.moves = (c.moves || 0) + 1; }
      else if (r < 0.55) { if (!G.orderHome(s, m.id)) c.homes = (c.homes || 0) + 1; }
      else if (r < 0.7) { const b = G.myLairs(s).filter(o => o.building); if (b.length && !G.orderHelp(s, pickA(b).id, m.id)) c.helps = (c.helps || 0) + 1; }
      else if (r < 0.8) { const sp = G.lairSpots(s, 'warren', 3); if (sp.length && !G.orderBuild(s, pickA(G.LAIR_ORDER), sp[0].x, sp[0].y, m.id)) c.mbuilds = (c.mbuilds || 0) + 1; }
    }
    // 0.10: band orders, plotting and dancing
    { const bs = s.objects.filter(o => o.kind === 'stack'); if (bs.length) { const o = pickA(bs); const r = R();
      if (r < 0.3) { if (!G.bandPatrol(s, o.id, o.x + Math.floor(R() * 13) - 6, o.y + Math.floor(R() * 13) - 6)) c.patrols = (c.patrols || 0) + 1; }
      else if (r < 0.45) { if (!G.bandLevelUp(s, o.id)) c.levels = (c.levels || 0) + 1; }
      else if (r < 0.52) { if (!G.bandAway(s, o.id)) c.aways = (c.aways || 0) + 1; }
      else if (r < 0.6) G.bandHold(s, o.id); } }
    if (s.minions.length && R() < 0.15) { const m = pickA(s.minions); if (R() < 0.5) G.orderPlot(s, m.id); else G.orderDance(s, m.id); }
    for (const o of s.objects) if (o.kind === 'stack' && (o.lvl || 1) > G.BAND_MAX_LEVEL) throw new Error('band level');
    if (s.dmSeen.length !== G.MW * G.MH) throw new Error('fog size');
    for (const n of s.nodes) if (G.assignedTo(s, n).length > 1) throw new Error('two minions on one site');
    for (const m of s.minions) { if (m.job && m.job.kind === 'move' && !m.path.length) throw new Error('arrived walker still busy'); if (m.job && m.job.kind === 'work' && !s.nodes.some(n => n.id === m.job.node)) throw new Error('work at nothing'); }
    if (R() < 0.1) G.buildLibrary(s);
    if (R() < 0.1 && !G.gift(s)) c.gifts++;
    if (R() < 0.03) for (const h of s.heroes) G.giveXp(s, 300 * G.avgLevel(s));
    check(s);
    if (!G.attackCheck(s) && R() < 0.85) {
      const g = G.garrisonList(s);
      const comp = R() < 0.5 ? ((G.fairAttackSync(s) || { comp: [] }).comp) : g.filter(() => R() < 0.6).map(([t, n]) => [t, 1 + Math.floor(R() * n * 1.3)]);
      const before = G.myLairs(s).reduce((a, o) => a + G.lairCount(o), 0);
      const err = G.sendAttack(s, comp);
      if (!err) { c.attacks++; const r = battle(s); if (!r.attack) throw new Error('attack flag lost'); }
      if (s.phase !== 'map') continue;
    }
    let steps = 0;
    for (;;) {
      const ev = G.partyStep(s);
      if (ev.t === 'battle') { battle(s); if (s.phase !== 'map') break; continue; }
      if (ev.t === 'encounter') { encounter(s); if (s.phase !== 'map') break; continue; }
      if (ev.t === 'stop' || ev.t === 'none' || steps++ > 300) break;
    }
    if (s.phase === 'map') { G.endDay(s); if (s.phase === 'map') check(s); }
  }
  res[s.result || 'none:' + s.phase] = (res[s.result || 'none:' + s.phase] || 0) + 1;
}
console.log(res, c);
