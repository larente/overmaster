// finale win rates per villain type: node tools/cal_boss.js N [types] [parties]
const G = require(__dirname + '/../game.js');
const N = +process.argv[2] || 16;
const types = (process.argv[3] || G.BOSS_ORDER.join(',')).split(',');
const PARTIES = { std: G.DEFAULT_PARTY, tank: ['thrain', 'grukka', 'durgan', 'esk'], squishy: ['vex', 'pip', 'maelis', 'tobias'], twoheal: ['brakka', 'ione', 'aelith', 'orrin'], nohealer: ['brakka', 'vex', 'orrin', 'zarga'] };
const parties = (process.argv[4] || 'std').split(',');
function party(ids, L, items, type) {
  const s = G.newGame(42, { party: ids, villain: { type } });
  s.heroes = ids.map(id => G.heroFrom(G.ROSTER_BY[id], L));
  if (items) {
    const picks = { 2: ['flametongue', 'mithral', 'staff', 'periapt'], 3: ['vorpal', 'invuln', 'robe', 'avenger', 'regen', 'cloak'] }[items];
    for (const id of picks) G.grantArtifact(s, G.ARTIFACTS.find(a => a.id === id));
    for (const h of s.heroes) { h.hp = h.maxHp; h.mana = h.maxMana; }
  }
  return s;
}
for (const p of parties) for (const type of types) {
  const out = [];
  for (const [L, it] of (process.env.CFG || '18:0,18:2,16:2').split(',').map(x => x.split(':').map(Number))) {
    const s = party(PARTIES[p], L, it, type);
    const t0 = Date.now();
    const r = G.simulateFinale(s, N);
    const rd = G.readiness(s);
    out.push(`L${L}i${it} win ${(r.win * 100).toFixed(0).padStart(3)}% (ratio ${rd.ratio.toFixed(2)} ${rd.label}) ${((Date.now() - t0) / N).toFixed(0)}ms`);
  }
  console.log(p.padEnd(8), type.padEnd(12), out.join(' | '));
}
