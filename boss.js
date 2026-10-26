const G = require(__dirname + '/game.js');
function party(L) {
  const s = G.newGame(42);
  for (const h of s.heroes) { const c = G.CLASSES[h.cls]; h.level = L; h.ab = []; for (let l = 1; l <= L; l++) if (c.ab[l]) h.ab.push(c.ab[l]); h.maxHp = c.hp + c.hpL * (L - 1) + (h.ab.includes('unstoppable') ? 20 : 0); h.hp = h.maxHp; h.maxMana = c.mana ? c.mana + c.manaL * (L - 1) : 0; h.mana = h.maxMana; }
  return s;
}
for (const L of [4, 5, 6, 7]) for (const cfg of [{}, { ritual: 1, vigor: 2 }, { army: true }, { army: true, ritual: 1, vigor: 2, raise: 1, dread: 1 }]) {
  let tpk = 0, frac = 0; const N = 24;
  for (let i = 0; i < N; i++) {
    const s = party(L); Object.assign(s.villain.up, cfg); if (cfg.army) s.villain.army = [{ type: 'orc', count: 12 }, { type: 'wolf', count: 16 }];
    s.uid = i;
    const stacks = s.villain.army.map(a => [a.type, a.count]); if (!stacks.length) stacks.push(['knight', 1 + Math.floor(L / 2)]);
    G.startBattle(s, null, { boss: true, finale: true, stacks }); G.beginBattle(s);
    const b = s.battle; let g = 0;
    while (!b.over && !b.pendingTPK && g++ < 800) G.autoStep(s);
    if (b.pendingTPK) tpk++; else frac += b.dmgTaken / b.startMax;
  }
  console.log(`L${L} ${JSON.stringify(cfg)} tpk=${(tpk / N).toFixed(2)} frac=${(frac / Math.max(1, N - tpk)).toFixed(2)}`);
}
