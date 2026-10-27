// random play (0.31: your villain walks the map and recruits the wilds; 0.30, the villain edition: waves, sieges, Millbrook runs itself) through the 0.9 loop (0.24: talents instead of research): minions, sites, lairs on the map, war parties from lairs in reach, command-mode turns
const G = require(process.env.GAME || __dirname + '/game.js'); // 0.19: two purses, Millbrook, no Lore
const N = +process.argv[2] || 30;
const R = () => Math.random();
const pickA = a => a[Math.floor(R() * a.length)];
const res = {}; const c = { trains: 0, works: 0, builds: 0, expands: 0, cancels: 0, recalls: 0, attacks: 0, battles: 0, acts: 0, bonus: 0, spells: 0, enc: 0, gifts: 0 };
function check(s) {
  for (const k of G.RES_KEYS) if (!(s.res[k] >= 0)) throw new Error('res ' + k + ' ' + s.res[k]);
  for (const k of G.RES_KEYS) if (!(s.town.res[k] >= 0)) throw new Error('town res ' + k + ' ' + s.town.res[k]);
  if (s.town.build && !(s.town.build.days >= 1)) throw new Error('town build days');
  for (const k of G.TOWN_ORDER) if (!(G.townLv(s, k) >= 0 && G.townLv(s, k) <= G.TOWN_B[k].max)) throw new Error('town level ' + k);
  if (s.quests.filter(q => q.status === 'open').length > G.MAX_QUESTS) throw new Error('too many quests');
  if (!(s.engagement >= 0 && s.engagement <= 100)) throw new Error('mood');
  for (const h of s.heroes) if (h.status !== 'dead' && (isNaN(h.hp) || h.hp > h.maxHp || h.hp < 0)) throw new Error('hero hp ' + h.name + ' ' + h.hp + '/' + h.maxHp);
  if (s.heroes.some(h => h.status === 'dead') && s.phase !== 'over' && G.townLv(s, 'tavern') > 0 && s.heroes.every(h => h.status === 'dead')) throw new Error('wiped party not replaced');
  for (const k of G.DEF_ORDER) if (!(G.townLv(s, k) >= 0 && G.townLv(s, k) <= G.TOWN_B[k].max)) throw new Error('defence level ' + k);
  if (!(s.town.wallHp >= 0 && s.town.wallHp <= G.WALL_HP[G.townLv(s, 'walls')])) throw new Error('wall hp ' + s.town.wallHp);
  if (!(s.town.hall >= 0 && s.town.hall <= G.hallMax(s))) throw new Error('hall ' + s.town.hall + '/' + G.hallMax(s));
  if (!(s.villain.level >= 1 && s.villain.level <= 20) || !(s.villain.xp >= 0)) throw new Error('villain level ' + s.villain.level);
  if (G.VXP[s.villain.level] > s.villain.xp + 0.01) throw new Error('villain level ahead of xp');
  for (const o of s.objects) if (o.wave && o.atGates && !G.atGates(s, o.x, o.y)) throw new Error('wave at gates away from town');
  for (const o of s.objects) if (o.kind === 'stack' && !(o.count >= 1)) throw new Error('empty band ' + o.count);
  const pos = s.objects.map(o => o.x + ',' + o.y); if (new Set(pos).size !== pos.length) throw new Error('two objects on a tile');
  for (const n of s.nodes) if (G.objAt(s, n.x, n.y)) throw new Error('object on a site');
  for (const o of G.myLairs(s)) { for (const k of Object.keys(o.pool)) if (!(o.pool[k] >= 0)) throw new Error('pool ' + o.pool[k]); if (!(o.building >= 0)) throw new Error('building'); }
  if (s.minions.length > G.MAX_MINIONS + 8) throw new Error('too many minions');
  if ((s.summons || []).length > G.MAX_SUMMONS || s.minions.length + (s.summons || []).length > G.MAX_MINIONS + 8) throw new Error('summon queue');
  for (const q of s.summons || []) if (!(q.days >= 1 && q.days <= q.total)) throw new Error('summon days ' + q.days);
  if (s.base.libBuild && !(s.base.libBuild.days >= 1)) throw new Error('library days');
  for (const k of Object.keys(s.talents.r)) if (s.talents.r[k] > G.talentRanks(k) || G.talentTrees(s).indexOf(G.TALENTS[k].tree) < 0) throw new Error('talent rank ' + k);
  if (G.talentSpent(s) > G.talentEarned(s)) throw new Error('overspent talents');
  for (const o of G.myLairs(s)) if (o.dtype in G.DUNGEONS && G.DUNGEONS[o.dtype].villain && G.DUNGEONS[o.dtype].villain !== s.villain.type) throw new Error('another villain\'s lair ' + o.dtype);
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
    if (b.pendingTPK) throw new Error('pending TPK in the villain edition');
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
  let g = 0; while (s.enc.stage === 'rolling' && g++ < 10) { G.encRoll(s); G.encSettle(s); }
  G.encFinish(s); if (G.encClose(s) === 'battle') battle(s);
}
for (let i = 0; i < N; i++) {
  const s = G.newGame((+process.env.BASE || 10300) + i, { party: G.rollParty(R() < 0.5 ? 'random' : 'balanced', R), villain: { type: pickA(G.BOSS_ORDER), name: 'Fuzz' + i } }); let guard = 0;
  if (R() < 0.4) { s.res.gold += 200; s.res.lumber += 150; s.res.ore += 150; s.town.res.gold += 300; s.town.res.lumber += 150; s.town.res.ore += 100; }
  while (s.phase !== 'over' && guard++ < 900 && s.week < 16) {
    if (s.phase === 'battle') { battle(s); continue; }
    if (s.phase === 'encounter') { encounter(s); continue; }
    if (s.phase === 'week') { G.startNextWeek(s); if (s.phase !== 'over') check(s); continue; }
    if (R() < 0.4 && !G.trainMinion(s)) c.trains++;
    for (let t = 0; t < 3; t++) { const k = pickA(G.TALENT_ORDER); if (!G.learnTalent(s, k)) c.talents = (c.talents || 0) + 1; }
    if (R() < 0.02 && !G.resetTalents(s)) c.resets = (c.resets || 0) + 1;
    if ((s.summons || []).length && R() < 0.08) { const g0 = s.res.gold; if (!G.cancelSummon(s, Math.floor(R() * s.summons.length)) && s.res.gold > g0) c.cancels++; }
    for (let k = 0; k < 3; k++) if (R() < 0.6 && !G.orderWork(s, pickA(s.nodes).id)) c.works++;
    for (let k = 0; k < 2; k++) { const x = Math.floor(R() * G.MW), y = Math.floor(R() * G.MH); if (!G.orderBuild(s, pickA(G.lairsFor(s)), x, y)) c.builds++; }
    if (R() < 0.5) { const sp = G.lairSpots(s, 'warren', 3); if (sp.length && !G.orderBuild(s, pickA(G.lairsFor(s)), sp[0].x, sp[0].y)) c.builds++; }
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
      else if (r < 0.8) { const sp = G.lairSpots(s, 'warren', 3); if (sp.length && !G.orderBuild(s, pickA(G.lairsFor(s)), sp[0].x, sp[0].y, m.id)) c.mbuilds = (c.mbuilds || 0) + 1; }
    }
    // 0.10: band orders, plotting and dancing
    { const bs = s.objects.filter(o => o.kind === 'stack'); if (bs.length) { const o = pickA(bs); const r = R();
      if (r < 0.3) { if (!G.bandPatrol(s, o.id, o.x + Math.floor(R() * 13) - 6, o.y + Math.floor(R() * 13) - 6)) c.patrols = (c.patrols || 0) + 1; }
      else if (r < 0.45) { if (!G.bandLevelUp(s, o.id)) c.levels = (c.levels || 0) + 1; }
      else if (r < 0.52) { if (!G.bandAway(s, o.id)) c.aways = (c.aways || 0) + 1; }
      else if (r < 0.6) G.bandHold(s, o.id); } }
    if (s.minions.length && R() < 0.15) { const m = pickA(s.minions); G.orderDance(s, m.id); }
    for (const o of s.objects) if (o.kind === 'stack' && (o.lvl || 1) > G.BAND_MAX_LEVEL) throw new Error('band level');
    if (s.dmSeen.length !== G.MW * G.MH) throw new Error('fog size');
    for (const n of s.nodes) if (G.assignedTo(s, n).length > 1) throw new Error('two minions on one site');
    for (const m of s.minions) { if (m.job && m.job.kind === 'move' && !m.path.length) throw new Error('arrived walker still busy'); if (m.job && m.job.kind === 'work' && !s.nodes.some(n => n.id === m.job.node)) throw new Error('work at nothing'); }
    if (R() < 0.1) G.buildLibrary(s);
    // 0.19: Millbrook
    c.sieges = (c.sieges || 0) + ((s.lastDay && s.lastDay.sieges) || []).length;
    if (R() < 0.3) { const t = pickA(s.objects.concat([null])); const ref = t ? { kind: 'obj', id: t.id } : R() < 0.5 ? { kind: 'villain', id: 'villain' } : { kind: 'site', id: pickA(G.sitesOf(s)).id };
      const g0 = s.town.res.gold; const r = pickA([2, 5, 9]); if (!G.postQuest(s, ref, r)) throw new Error('the player posted a quest'); if (s.town.res.gold !== g0) throw new Error('quest refusal cost gold'); }
    if (R() < 0.03) for (const h of s.heroes) G.giveXp(s, 300 * G.avgLevel(s));
    check(s);
    // 0.31: send the villain somewhere, and deal with whatever band it meets
    if (R() < 0.35 && !(s.villain.path || []).length) { const w = s.objects.filter(o => o.kind === 'stack' && o.wild); const t = w.length && R() < 0.7 ? pickA(w) : null;
      const x = t ? t.x : Math.floor(R() * G.MW), y = t ? t.y : Math.floor(R() * G.MH); if (!G.villainOrder(s, x, y)) c.vorders = (c.vorders || 0) + 1; }
    if (G.meetBand(s) && s.phase === 'map') {
      const o = G.meetBand(s); const opt = G.parleyOptions(s, o); const r = R(); c.meets = (c.meets || 0) + 1;
      if (opt.level !== G.monsterLevel(s, o)) throw new Error('parley level');
      if (r < 0.4) { const k = pickA(Object.keys(G.SKILLS)); const x = G.parleyTalk(s, k); if (x.result === 'join') c.joins = (c.joins || 0) + 1; }
      else if (r < 0.55) { if (G.parleyPay(s).result === 'join') c.joins = (c.joins || 0) + 1; }
      else if (r < 0.85) { if (!G.startDuel(s)) c.duels = (c.duels || 0) + 1; }
      else G.parleyLeave(s);
      if (s.phase === 'battle') { const x = battle(s); if (!x.duel) throw new Error('duel lost its flag'); c['duel_' + x.result] = (c['duel_' + x.result] || 0) + 1; if (s.phase !== 'map') continue; }
    }
    if (G.commanded(s) > G.commandCap(s) + 0) { /* a level can't drop, but recruits made before a cap change may exceed it */ }
    for (const o of s.objects) if (o.kind === 'stack' && o.yours && o.wild) throw new Error('recruit still wild');
    for (const o of s.objects) if (o.kind === 'stack' && o.yours && !o.wave && !(o.healUntil > 0) && o.joined && !o.patrol) throw new Error('idle recruit');
    { const V = s.villain; if (!(V.x >= 0 && V.y >= 0 && V.x < G.MW && V.y < G.MH)) throw new Error('villain off the map'); }
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
