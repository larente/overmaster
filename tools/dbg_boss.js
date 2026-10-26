const G = require(__dirname + '/../game.js');
const type = process.argv[2] || "lich"; const L = +process.argv[3] || 18; if (process.argv[4]) G.BOSS_TYPES[type].F.hp = +process.argv[4];
const ids = G.DEFAULT_PARTY;
const s = G.newGame(42, { party: ids, villain: { type } });
s.heroes = ids.map(id => G.heroFrom(G.ROSTER_BY[id], L));
G.startVillainBattle(s, true); G.beginBattle(s);
const b = s.battle; let g = 0; const acts = {};
while (!b.over && !b.pendingTPK && g++ < 1500) {
  const u = b.units.find(x => x.id === b.cur);
  const a = G.autoAction(s);
  if (u && u.boss) { const k = a.type + (a.key ? ':' + a.key : ''); acts[k] = (acts[k] || 0) + 1; }
  const err = G.act(s, a); if (err) { console.log('err', err, a); G.act(s, { type: 'defend' }); }
}
console.log('rounds', b.round, 'over', b.over, b.pendingTPK, 'boss acts', acts, 'dmgTaken', b.dmgTaken, 'startMax', b.startMax);
const boss = b.units.find(u => u.boss); console.log('boss hp', boss.hp, '/', boss.maxHp, 'pos', boss.pos, 'images', boss.images);
console.log(b.log.filter(l => /boss|Soul|Meteor|breath|Breath|blink|charm|mirror|phylactery|dust/i.test(l.t)).slice(0, 25).map(l => 'R' + l.r + ' ' + l.t).join('\n'));
