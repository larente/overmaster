const G = require(__dirname + '/game.js');
const src = require('fs').readFileSync('./sim.js', 'utf8');
const mode = process.argv[2] || 'full';
eval(src.split('const st = {')[0].replace("const G = require(__dirname + '/game.js');", '').replace(/const N = .*\n/, '').replace(/const VERBOSE = .*\n/, '').replace(/const USE_EXTRAS = .*\n/, `const USE_EXTRAS = ${mode === 'full'};\n`));
const st = { labels: {}, enc: {}, villainFights: 0, dungeonFights: 0 };
const where = {}; const hpAtTpk = [];
for (let i = 0; i < 60; i++) {
  const s = G.newGame(3000 + i); let guard = 0; let lastFight = null;
  while (s.phase !== 'over' && guard++ < 500) {
    if (s.phase === 'battle') { lastFight = describe(s); runBattle(s, st); continue; }
    if (s.phase === 'encounter') { runEncounter(s, st); continue; }
    if (s.phase === 'map') { botPrep(s); if (s.phase !== 'map') continue; let steps = 0; for (;;) { const ev = G.partyStep(s); if (ev.t === 'battle') { lastFight = describe(s); runBattle(s, st); if (s.phase !== 'map') break; continue; } if (ev.t === 'encounter') { runEncounter(s, st); if (s.phase !== 'map') break; continue; } if (ev.t === 'stop' || ev.t === 'none' || steps++ > 300) break; } if (s.phase === 'map') G.endDay(s); }
    if (s.phase === 'week') G.startNextWeek(s);
  }
  if (s.result === 'tpk') { const k = 'W' + s.week + ' ' + lastFight.kind; where[k] = (where[k] || 0) + 1; hpAtTpk.push(lastFight.hp + ' L' + lastFight.L + ' ' + lastFight.desc); }
}
function describe(s) { const b = s.battle; const dm = b.units.filter(u => u.side === 'dm'); return { kind: b.finale ? 'finale' : b.villain ? 'villain' : b.dungeonId ? 'dungeon' : 'stack', hp: G.partyHpFrac(s).toFixed(2), L: G.avgLevel(s), desc: dm.map(u => u.count + ' ' + u.name).join('+') + ' ratio=' + (G.partyPower(s) / Math.max(1, dm.filter(u => !u.boss).reduce((a, u) => a + G.stackPower(u.type, u.count), 0))).toFixed(2) }; }
console.log(where); console.log(hpAtTpk.join('\n'));
