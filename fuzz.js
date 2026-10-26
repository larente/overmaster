const G = require(__dirname + '/game.js');
const N = +process.argv[2] || 100;
const R = () => Math.random();
const pickA = a => a[Math.floor(R() * a.length)];
const res = {}; const c = { powers: 0, charms: 0, tech: 0, lairup: 0, spawned: 0, battles: 0, spells: 0, acts: 0, enc: 0, moves: 0, vmoves: 0, quests: 0, releases: 0, traps: 0, deploy: 0 };
const kinds = G.CREATURE_ORDER.concat(Object.keys(G.ITEMS), Object.keys(G.DUNGEONS));
function check(s) {
  if (isNaN(s.lore) || s.lore < 0) throw new Error('lore ' + s.lore);
  for (const h of s.heroes) if (h.status !== 'dead' && (isNaN(h.hp) || h.hp > h.maxHp || h.hp < 0)) throw new Error('hero hp ' + JSON.stringify(h));
  if (s.heroes.some(h => h.status === 'dead') && s.phase !== 'over') throw new Error('dead hero not replaced');
  if (s.heroes.some(h => h.level > 20 || !(h.xp >= 0))) throw new Error('bad level');
  for (const o of s.objects) if (o.kind === 'stack' && !(o.count >= 1)) throw new Error('bad stack ' + JSON.stringify(o));
  const ids = s.heroes.map(h => h.id); if (new Set(ids).size !== ids.length) throw new Error('duplicate hero ids ' + ids);
  if (s.heroes.length !== 4) throw new Error('party size');
  const pos = s.objects.map(o => o.x + ',' + o.y); if (new Set(pos).size !== pos.length) throw new Error('two objects on a tile');
  if (s.objects.filter(o => o.kind === 'stack').length > 24) throw new Error('too many stacks');
  for (const o of s.objects) { if (G.siteAt(o.x, o.y)) throw new Error('object on site'); if (o.x === s.party.x && o.y === s.party.y && o.kind === 'stack') throw new Error('stack on party ' + JSON.stringify(o) + ' party ' + JSON.stringify([s.party.x, s.party.y, s.party.prev]) + ' phase ' + s.phase + '\n' + s.log.slice(-6).map(l => l.t).join('\n')); if (o.kind === 'dungeon') for (const t in o.pool) if (!(o.pool[t] >= 0)) throw new Error('bad pool ' + JSON.stringify(o)); }
  JSON.parse(JSON.stringify(s));
}
function battle(s) {
  c.battles++; let g = 0;
  const b0 = s.battle;
  if (b0.phase === 'deploy') {
    for (let i = 0; i < 6; i++) { if (R() < 0.5) { if (!G.deployTrap(s, Math.floor(R() * G.BW * G.BH))) c.deploy++; } else { const u = pickA(b0.units.filter(x => x.side === 'dm')); if (u) G.deployMove(s, u.id, Math.floor(R() * G.BW * G.BH)); } }
    G.beginBattle(s);
  }
  while (s.battle && !s.battle.over && g++ < 4000) {
    const b = s.battle;
    if (b.pendingTPK) { if (R() < 0.5 && !G.dmSpell(s, 'deus')) c.spells++; else G.acceptTPK(s); continue; }
    const u = b.units.find(x => x.id === b.cur);
    if (u.side === 'dm' && R() < 0.7) {
      if (R() < 0.12) { if (!G.dmSpell(s, pickA(Object.keys(G.DM_SPELLS)))) c.spells++; }
      if (!s.battle || s.battle.over || s.battle.pendingTPK) continue;
      const cu = s.battle.units.find(x => x.id === s.battle.cur); if (!cu || cu.side !== 'dm') continue;
      const o = G.options(b, cu); const r = R(); let err;
      const pw = cu.boss ? G.bossPowers(b, cu) : [];
      if (pw.length && R() < 0.5) { const p = pickA(pw); err = G.act(s, { type: 'power', key: p.key }); if (!err) c.powers++; if (!err && p.key === 'blink') continue; }
      else if (r < 0.5 && o.targets.length) { const t = pickA(o.targets); err = G.act(s, { type: 'attack', target: t.id, from: pickA(t.from) }); }
      else if (r < 0.7) { const ks = Array.from(o.reach.keys()); err = G.act(s, { type: 'move', to: pickA(ks) }); }
      else if (r < 0.85) err = G.act(s, { type: 'wait' }); else err = G.act(s, { type: 'defend' });
      if (err) { err = G.autoStep(s); if (err) throw new Error('auto after err: ' + err); }
    } else { const err = G.autoStep(s); if (err) throw new Error('auto: ' + err); }
    c.acts++;
    for (const x of b.units) if (x.alive && (isNaN(x.hp) || x.hp < 0 || !(x.count >= 0))) throw new Error('bad unit ' + JSON.stringify(x));
    const occ = b.units.filter(x => x.alive).map(x => x.pos); if (new Set(occ).size !== occ.length) throw new Error('two units on one hex');
    if (b.units.some(x => x.alive && b.tiles[x.pos] && G.TILE_INFO[b.tiles[x.pos]].block)) throw new Error('unit on blocking tile');
    if (b.units.some(x => x.alive && (x.pos < 0 || x.pos >= G.BW * G.BH))) throw new Error('unit off field');
  }
  if (g >= 4000) throw new Error('battle stuck');
  G.finishBattle(s);
}
function encounter(s) {
  c.enc++;
  const e = s.enc; if (G.encChoose(s, pickA(e.choices).k)) throw new Error('enc choose');
  let g = 0;
  while (s.enc.stage === 'rolling' && g++ < 10) { G.encRoll(s); if (s.enc.canFudge && R() < 0.4) G.encFudge(s); G.encSettle(s); }
  if (!G.encFinish(s)) throw new Error('enc finish');
  const r = G.encClose(s);
  if (r === 'battle') battle(s);
}
for (let i = 0; i < N; i++) {
  const s = G.newGame(9000 + i, { party: G.rollParty(R() < 0.5 ? 'random' : 'balanced', R), villain: { type: pickA(G.BOSS_ORDER), name: 'Fuzz' + i } }); let guard = 0;
  while (s.phase !== 'over' && guard++ < 400 && s.week < 14) {
    if (s.phase === 'battle') { battle(s); continue; }
    if (s.phase === 'encounter') { encounter(s); continue; }
    if (s.phase === 'map') {
      for (let k = 0; k < 6; k++) G.place(s, pickA(kinds), Math.floor(R() * G.MW), Math.floor(R() * G.MH), 1 + Math.floor(R() * 3));
      if (R() < 0.2) G.place(s, 'tourney');
      if (R() < 0.5) { const k = pickA(G.TECH_ORDER); if (!G.buildTech(s, k)) c.tech++; }
      for (const d of s.objects.filter(z => z.kind === 'dungeon')) { if (R() < 0.1) { if (!G.upgradeLair(s, d.id)) c.lairup++; } if (R() < 0.2) G.setLairMode(s, d.id, R() < 0.5 ? 'hold' : 'roam'); }
      const objs = s.objects;
      const o = pickA(objs.length ? objs : [null]);
      if (o && R() < 0.3) G.rumor(s, o.id);
      if (o && R() < 0.15) G.removeObject(s, o.id);
      if (o && R() < 0.3) { if (!G.postQuest(s, { kind: 'obj', id: o.id }, 1 + Math.floor(R() * 12))) c.quests++; }
      if (R() < 0.1) { if (!G.postQuest(s, { kind: 'site', id: pickA(G.SITES).id }, 3)) c.quests++; }
      if (R() < 0.1) { if (!G.postQuest(s, { kind: 'villain' }, 5)) c.quests++; }
      if (R() < 0.05) { if (!G.postQuest(s, { kind: 'site', id: 'tower' }, 1 + Math.floor(R() * 12))) c.quests++; }
      if (R() < 0.02) G.startMarch(s, R() < 0.5 ? 'bored' : 'ready');
      if (R() < 0.05) for (const h of s.heroes) G.giveXp(s, 400 * G.avgLevel(s));
      for (const d of s.objects.filter(z => z.kind === 'dungeon')) { const t = pickA(Object.keys(d.pool)); if (!G.release(s, d.id, t, 1 + Math.floor(R() * Math.max(1, d.pool[t])))) c.releases++; }
      for (const st of s.objects.filter(z => z.kind === 'stack')) {
        if (s.phase !== 'map') break;
        if (R() < 0.5) { const Rr = G.stackReach(s, st.id); if (Rr && Rr.tiles.size) { const ks = Array.from(Rr.tiles.keys()); const k = pickA(ks); const r = G.moveStack(s, st.id, k % G.MW, (k / G.MW) | 0); if (!r.err) c.moves++; if (r.battle) battle(s); } }
      }
      if (s.phase !== 'map') continue;
      if (R() < 0.3) G.recruit(s, pickA(G.CREATURE_ORDER), 1);
      if (R() < 0.2) G.lairUpgrade(s, pickA(Object.keys(G.LAIR)));
      if (R() < 0.3) G.rideOut(s);
      if (G.villainOnMap(s) && R() < 0.7) { const Rr = G.villainReach(s); if (Rr && Rr.tiles.size) { const ks = Array.from(Rr.tiles.keys()); const k = pickA(ks); const r = G.moveVillain(s, k % G.MW, (k / G.MW) | 0); if (!r.err) c.vmoves++; if (r.battle) { battle(s); continue; } } }
      if (s.phase !== 'map') continue;
      check(s);
      let steps = 0;
      for (;;) {
        const ev = G.partyStep(s);
        if (ev.t === 'battle') { battle(s); if (s.phase !== 'map') break; continue; }
        if (ev.t === 'encounter') { encounter(s); if (s.phase !== 'map') break; continue; }
        if (ev.t === 'trap') c.traps++;
        if (ev.t === 'stop' || ev.t === 'none' || steps++ > 300) break;
      }
      if (s.phase === 'map') { const n0 = s.uid; G.endDay(s); c.spawned += s.uid - n0; }
    }
    if (s.phase === 'week') G.startNextWeek(s);
    if (s.phase !== 'over') check(s);
  }
  res[s.result || 'none:' + s.phase] = (res[s.result || 'none:' + s.phase] || 0) + 1;
}
console.log(res, c);
