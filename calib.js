const G = require(__dirname + '/game.js');
function party(L) {
  const s = G.newGame(42);
  for (const h of s.heroes) { const c = G.CLASSES[h.cls]; h.level = L; h.ab = []; for (let l = 1; l <= L; l++) if (c.ab[l]) h.ab.push(c.ab[l]); h.maxHp = c.hp + c.hpL * (L - 1) + (h.ab.includes('unstoppable') ? 20 : 0); h.hp = h.maxHp; h.maxMana = c.mana ? c.mana + c.manaL * (L - 1) : 0; h.mana = h.maxMana; }
  return s;
}
const rows = [];
for (const L of [1, 3, 5, 7]) {
  const s = party(L); const pp = G.partyPower(s);
  for (const t of G.CREATURE_ORDER) for (const size of [1, 2, 3, 4]) {
    const n = G.CREATURES[t].base * size;
    const r = G.simulate(s, t, n, 16);
    rows.push({ L, t, size, ratio: pp / G.stackPower(t, n), frac: r.avg, tpk: r.tpk, label: r.label, cost: G.CREATURES[t].cost * size });
  }
}
// bucket by ratio
const buckets = [0, 0.6, 0.8, 1.0, 1.2, 1.5, 1.9, 2.5, 3.6, 5, 99];
for (let i = 0; i < buckets.length - 1; i++) {
  const r = rows.filter(x => x.ratio >= buckets[i] && x.ratio < buckets[i + 1]);
  if (!r.length) continue;
  const f = r.reduce((a, x) => a + x.frac, 0) / r.length, tp = r.reduce((a, x) => a + x.tpk, 0) / r.length;
  console.log(`ratio ${buckets[i]}-${buckets[i + 1]}: n=${r.length} frac=${f.toFixed(2)} tpk=${tp.toFixed(2)} byL=${[1,3,5,7].map(L => { const q = r.filter(x => x.L === L); return q.length ? (q.reduce((a, x) => a + x.frac, 0) / q.length).toFixed(2) : '-'; }).join('/')}`);
}
for (const L of [1, 3, 5, 7]) console.log('L' + L, rows.filter(x => x.L === L && x.size <= 2).map(x => `${x.t}${x.size}:${x.ratio.toFixed(1)}/${x.label[0]}${x.tpk > 0 ? '!' : ''}`).join(' '));
