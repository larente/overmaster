// random play through the 0.8 loop: build, expand, gift, send random war parties, fight (sometimes in command), travel
const G = require(__dirname + '/game.js');
const N = +process.argv[2] || 60;
const R = () => Math.random();
const pickA = a => a[Math.floor(R() * a.length)];
const res = {}; const c = { builds: 0, ups: 0, gifts: 0, attacks: 0, battles: 0, acts: 0, spells: 0, enc: 0, powers: 0 };
function check(s) {
  if (isNaN(s.lore) || s.lore < 0) throw new Error('lore ' + s.lore);
  if (!(s.engagement >= 0 && s.engagement <= 100)) throw new Error('mood ' + s.engagement);
  for (const h of s.heroes) if (h.status !== 'dead' && (isNaN(h.hp) || h.hp > h.maxHp || h.hp < 0)) throw new Error('hero hp ' + JSON.stringify(h));
  if (s.heroes.some(h => h.status === 'dead') && s.phase !== 'over') throw new Error('dead hero not replaced');
  if (s.heroes.length !== 4) throw new Error('party size');
  for (const t of Object.keys(s.base.garrison)) { const n = s.base.garrison[t]; if (!(n >= 0) || !G.CREATURES[t]) throw new Error('garrison ' + t + ' ' + n); }
  for (const k of Object.keys(s.base.b)) if (!G.BUILDINGS[k] || !(s.base.b[k] >= 1 && s.base.b[k] <= 2)) throw new Error('building ' + k);
  const pos = s.objects.map(o => o.x + ',' + o.y); if (new Set(pos).size !== pos.length) throw new Error('two objects on a tile');
  JSON.parse(JSON.stringify(s));
}
function battle(s) {
  c.battles++; let g = 0;
  if (s.battle.phase === 'deploy') G.beginBattle(s);
  const command = R() < 0.3;
  while (s.battle && !s.battle.over && g++ < 5000) {
    const b = s.battle;
    if (b.pendingTPK) { if (R() < 0.5 && !G.dmSpell(s, 'deus')) c.spells++; else G.acceptTPK(s); continue; }
    const u = b.units.find(x => x.id === b.cur);
    if (command && u.side === 'dm') {
      if (R() < 0.1) { if (!G.dmSpell(s, pickA(Object.keys(G.DM_SPELLS)))) c.spells++; }
      if (!s.battle || s.battle.over || s.battle.pendingTPK) continue;
      const cu = s.battle.units.find(x => x.id === s.battle.cur); if (!cu || cu.side !== 'dm') continue;
      const o = G.options(b, cu); const r = R(); let err;
      const pw = cu.boss ? G.bossPowers(b, cu) : [];
      if (pw.length && R() < 0.5) { const p = pickA(pw); err = G.act(s, { type: 'power', key: p.key }); if (!err) c.powers++; if (!err && p.key === 'blink') continue; }
      else if (r < 0.6 && o.targets.length) { const t = pickA(o.targets); err = G.act(s, { type: 'attack', target: t.id, from: pickA(t.from) }); }
      else if (r < 0.8) { const ks = Array.from(o.reach.keys()); err = G.act(s, { type: 'move', to: pickA(ks) }); }
      else err = G.act(s, { type: R() < 0.5 ? 'wait' : 'defend' });
      if (err) { err = G.autoStep(s); if (err) throw new Error('auto after err: ' + err); }
    } else { const err = G.autoStep(s); if (err) throw new Error('auto: ' + err); }
    c.acts++;
    for (const x of b.units) if (x.alive && (isNaN(x.hp) || x.hp < 0 || !(x.count >= 0))) throw new Error('bad unit ' + JSON.stringify(x));
    const occ = b.units.filter(x => x.alive).map(x => x.pos); if (new Set(occ).size !== occ.length) throw new Error('two units on one hex');
  }
  if (g >= 5000) throw new Error('battle stuck');
  const r = G.finishBattle(s); s.pendingLevelUps = [];
  return r;
}
function encounter(s) {
  c.enc++;
  const e = s.enc; if (G.encChoose(s, pickA(e.choices).k)) throw new Error('enc choose');
  let g = 0;
  while (s.enc.stage === 'rolling' && g++ < 10) { G.encRoll(s); if (s.enc.canFudge && R() < 0.4) G.encFudge(s); G.encSettle(s); }
  if (!G.encFinish(s)) throw new Error('enc finish');
  if (G.encClose(s) === 'battle') battle(s);
}
for (let i = 0; i < N; i++) {
  const s = G.newGame(9100 + i, { party: G.rollParty(R() < 0.5 ? 'random' : 'balanced', R), villain: { type: pickA(G.BOSS_ORDER), name: 'Fuzz' + i } }); let guard = 0;
  if (R() < 0.3) s.lore += 200;
  while (s.phase !== 'over' && guard++ < 600 && s.week < 16) {
    if (s.phase === 'battle') { battle(s); continue; }
    if (s.phase === 'encounter') { encounter(s); continue; }
    if (s.phase === 'week') { G.startNextWeek(s); if (s.phase !== 'over') check(s); continue; }
    for (let k = 0; k < 3; k++) { if (!G.build(s, pickA(G.BUILD_ORDER))) c.builds++; if (!G.upgrade(s, pickA(G.BUILD_ORDER))) c.ups++; }
    if (R() < 0.15 && !G.gift(s)) c.gifts++;
    if (R() < 0.1) G.lairUpgrade(s, pickA(Object.keys(G.LAIR)));
    if (R() < 0.03) for (const h of s.heroes) G.giveXp(s, 300 * G.avgLevel(s));
    check(s);
    if (!G.attackCheck(s) && R() < 0.85) {
      const g = G.garrisonList(s);
      const comp = R() < 0.5 ? (G.fairAttackSync(s) || { comp: [] }).comp : g.filter(() => R() < 0.6).map(([t, n]) => [t, 1 + Math.floor(R() * n * 1.3)]);
      const err = G.sendAttack(s, comp);
      if (!err) { c.attacks++; const r = battle(s); if (!r.attack) throw new Error('attack flag lost'); if (s.phase === 'map' && G.sendAttack(s, comp) !== 'You already attacked today. End the day to send another.') throw new Error('second attack allowed'); }
      if (s.phase !== 'map') continue;
    }
    let steps = 0;
    for (;;) {
      const ev = G.partyStep(s);
      if (ev.t === 'battle') { battle(s); if (s.phase !== 'map') break; continue; }
      if (ev.t === 'encounter') { encounter(s); if (s.phase !== 'map') break; continue; }
      if (ev.t === 'stop' || ev.t === 'none' || steps++ > 300) break;
    }
    if (s.phase === 'map') G.endDay(s);
  }
  res[s.result || 'none:' + s.phase] = (res[s.result || 'none:' + s.phase] || 0) + 1;
}
console.log(res, c);
