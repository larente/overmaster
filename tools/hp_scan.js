// scan HP multipliers per villain type: node tools/hp_scan.js N type mults
const G = require(__dirname + '/../game.js');
const N = +process.argv[2] || 30; const type = process.argv[3]; const mults = (process.argv[4] || '0.8,1,1.2,1.4').split(',').map(Number);
const ids = (process.env.PARTY || G.DEFAULT_PARTY.join(',')).split(',');
const base = G.BOSS_TYPES[type].F.hp;
function party(L, items) {
  const s = G.newGame(42, { party: ids, villain: { type } });
  s.heroes = ids.map(id => G.heroFrom(G.ROSTER_BY[id], L));
  if (items) { for (const id of ['flametongue', 'mithral', 'staff', 'periapt']) G.grantArtifact(s, G.ARTIFACTS.find(a => a.id === id)); for (const h of s.heroes) { h.hp = h.maxHp; h.mana = h.maxMana; } }
  return s;
}
for (const m of mults) {
  G.BOSS_TYPES[type].F.hp = m > 10 ? m : Math.round(base * m);
  const row = [];
  for (const [L, it] of [[18, 0], [18, 2], [16, 2]]) { const s = party(L, it); const r = G.simulateFinale(s, N); row.push(`L${L}i${it} ${(r.win * 100).toFixed(0).padStart(3)}% r${G.readiness(s).ratio.toFixed(2)}`); }
  console.log(type.padEnd(11), 'hp', String(G.BOSS_TYPES[type].F.hp).padStart(5), row.join(' | '));
}
