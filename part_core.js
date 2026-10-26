
  const d20 = () => rint(1, 20);
  const rollDice = (n, s) => { const out = []; for (let i = 0; i < n; i++) out.push(rint(1, s)); return out; };
  const avgDie = (n, s, f) => n * (s + 1) / 2 + (f || 0);
  const pHit = (hit, ac) => clamp((21 - (ac - hit)) / 20, 0.05, 0.95);

  /* ================= heroes ================= */
  const DRIVES = {
    glory: { label: 'Glory', want: 'a big, worthy fight' },
    greed: { label: 'Greed', want: 'treasure and loot' },
    duty: { label: 'Duty', want: 'people to help' },
    curiosity: { label: 'Curiosity', want: 'mysteries and old secrets' }
  };
  const ABILITIES = {
    rage: { name: 'Rage', text: '+2 damage on every hit.' },
    reckless: { name: 'Reckless Attack', text: 'Attacks with advantage, but enemies attack them with advantage too.' },
    double: { name: 'Extra Attack', text: 'Attacks twice.' },
    roar: { name: 'Fearsome Roar', text: 'Enemies attack with disadvantage in the first round.' },
    relentless: { name: 'Relentless', text: 'Once per battle, drops to 1 HP instead of 0.' },
    cleave: { name: 'Cleave', text: 'Also swings at a second enemy standing next to them.' },
    titan: { name: "Titan's Grip", text: '+1d6 damage on every hit.' },
    unstoppable: { name: 'Unstoppable', text: '+2 AC and +20 max HP.' },
    sneak: { name: 'Sneak Attack', text: '+1d6 damage on hits, and enemies can\'t strike back. Spots traps.' },
    cunning: { name: 'Cunning Action', text: '20% chance to dodge a hit.' },
    backstab: { name: 'Backstab', text: 'Sneak Attack grows by 1d6 now, and again at levels 5 and 7.' },
    uncanny: { name: 'Uncanny Dodge', text: 'Halves the first hit they take each round.' },
    evasion: { name: 'Evasion', text: 'Takes half damage from traps, breath and area spells.' },
    assassin: { name: 'Assassinate', text: 'Critical hits on 18, 19 or 20.' },
    shadow: { name: 'Shadowstep', text: '+3 speed.' },
    cure: { name: 'Cure Wounds', text: 'Spell (5 mana): heals an ally 2d8 + level.' },
    bless: { name: 'Bless', text: 'Every hero adds 1d4 to attack rolls.' },
    masscure: { name: 'Mass Cure', text: 'Spell (9 mana): heals every conscious ally 1d8 + level.' },
    stoneskin: { name: 'Shield of Faith', text: 'The whole party gets +1 AC.' },
    holyword: { name: 'Holy Word', text: 'Spell (10 mana): 3d6 + level to every enemy stack, save for half. Double against undead.' },
    resurrect: { name: 'Resurrection', text: 'Spell (12 mana): a fallen ally gets back up with half HP.' },
    aura: { name: 'Aura of Valor', text: 'The whole party gets +1 to hit and +1 AC.' },
    miracle: { name: 'Miracle', text: 'Once per battle, fully heals a fallen ally.' },
    arrow: { name: 'Magic Missile', text: 'Spell (4 mana): darts of 1d4+1 that never miss. More darts with levels.' },
    shield: { name: 'Shield', text: '+3 AC.' },
    fireball: { name: 'Fireball', text: 'Spell (8 mana): 8d6 fire in a 7-hex blast, save for half. Needs no line of sight. Fire Bolt grows to 2d10.' },
    haste: { name: 'Haste', text: 'The whole party gets +1 speed.' },
    lightning: { name: 'Lightning Bolt', text: 'Spell (10 mana): 8d6 + level to one stack in sight, save for half.' },
    ward: { name: 'Arcane Ward', text: 'Absorbs the first 20 damage they take each battle.' },
    chain: { name: 'Chain Lightning', text: 'Spell (14 mana): 6d8 to three stacks, halving with each jump.' },
    meteor: { name: 'Meteor Shower', text: 'Spell (18 mana): 6d6 + 2×level to every enemy stack, save for half.' },
    empowered: { name: 'Empowered Evocation', text: '+5 damage on every spell.' },
    // levels 9-20
    brutal: { name: 'Brutal Critical', text: 'Critical hits on 19 or 20.' },
    warcry: { name: 'War Cry', text: 'The whole party gets +1 to hit.' },
    thick: { name: 'Thick Hide', text: 'Takes 4 less damage from every weapon hit.' },
    whirlwind: { name: 'Whirlwind', text: 'Cleave hits every enemy standing next to them.' },
    undying: { name: 'Undying Fury', text: 'Relentless works twice per battle.' },
    avatar: { name: 'Avatar of War', text: 'A third attack each turn, and +3 damage.' },
    deadly: { name: 'Deadly Precision', text: 'Sneak Attack grows by 1d6 now, and again at levels 12, 15 and 18.' },
    elusive: { name: 'Elusive', text: '+2 AC.' },
    reliable: { name: 'Reliable Talent', text: 'Skill checks never roll lower than 10.' },
    slippery: { name: 'Slippery Mind', text: '+3 to every saving throw.' },
    stroke: { name: 'Stroke of Luck', text: 'Once per battle, a missed attack hits instead.' },
    phantom: { name: 'Master of Shadows', text: 'Dodges 35% of hits and gets +2 speed.' },
    divine: { name: 'Divine Strike', text: '+2d8 radiant damage on every weapon hit.' },
    heal: { name: 'Heal', text: 'Cure Wounds becomes Heal: 4d8 + twice the cleric\'s level.' },
    spirits: { name: 'Spirit Guardians', text: 'Enemies next to the cleric take 3d8 radiant at the end of each of their turns, save for half.' },
    hallowed: { name: 'Hallowed Ground', text: 'Every conscious hero heals 6% of their HP at the start of each round.' },
    massheal: { name: 'Mass Heal', text: 'Mass Cure heals 2d8 + twice the cleric\'s level.' },
    intervention: { name: 'Divine Intervention', text: 'Once per battle, when a hero falls, every standing hero heals half their HP.' },
    greaterward: { name: 'Greater Ward', text: 'Arcane Ward absorbs the first 50 damage instead of 20.' },
    disintegrate: { name: 'Disintegrate', text: 'Spell (12 mana): 10d6 + 40 to one stack in sight, save for half.' },
    potent: { name: 'Potent Fire Bolt', text: 'Fire Bolt grows to 3d10.' },
    timestop: { name: 'Time Stop', text: 'Once per battle, takes a second turn right after casting a spell.' },
    archmage: { name: 'Archmage', text: 'Spells cost 2 less mana, Fire Bolt grows to 4d10, and Meteor Shower deals 10d6 + twice the wizard\'s level.' }
  };
  const CLASSES = {
    barbarian: { label: 'Barbarian', drive: 'glory', hp: 48, hpL: 12, ac: 14, hit: 5, dice: [1, 12, 3], spd: 5, mana: 0, manaL: 0, ranged: false, save: 2,
      skills: { might: 5, finesse: 1, charm: 0, lore: -1 },
      names: ['Brakka Stonejaw', 'Hulda Ironmane', 'Gorm the Red', 'Sigrun Ashfist', 'Torvald Kettle'],
      ab: { 1: 'rage', 2: 'reckless', 3: 'double', 4: 'roar', 5: 'relentless', 6: 'cleave', 7: 'titan', 8: 'unstoppable', 10: 'brutal', 12: 'warcry', 14: 'thick', 16: 'whirlwind', 18: 'undying', 20: 'avatar' } },
    rogue: { label: 'Rogue', drive: 'greed', hp: 34, hpL: 8, ac: 15, hit: 6, dice: [1, 8, 3], spd: 7, mana: 0, manaL: 0, ranged: false, save: 5,
      skills: { might: 1, finesse: 6, charm: 3, lore: 2 },
      names: ['Vex Nightbloom', 'Pip Thistledown', 'Sable Marrow', 'Nico Fenn', 'Lark Ashby'],
      ab: { 1: 'sneak', 2: 'cunning', 3: 'backstab', 4: 'uncanny', 5: 'double', 6: 'evasion', 7: 'assassin', 8: 'shadow', 9: 'deadly', 11: 'elusive', 13: 'reliable', 15: 'slippery', 17: 'stroke', 20: 'phantom' } },
    cleric: { label: 'Cleric', drive: 'duty', hp: 38, hpL: 9, ac: 17, hit: 4, dice: [1, 8, 2], spd: 5, mana: 12, manaL: 4, ranged: false, save: 3,
      skills: { might: 2, finesse: 0, charm: 5, lore: 3 },
      names: ['Sister Ione', 'Brother Aldous', 'Mother Wren', 'Father Corin', 'Sister Maud'],
      ab: { 1: 'cure', 2: 'bless', 3: 'masscure', 4: 'stoneskin', 5: 'holyword', 6: 'resurrect', 7: 'aura', 8: 'miracle', 10: 'divine', 11: 'heal', 13: 'spirits', 15: 'hallowed', 17: 'massheal', 20: 'intervention' } },
    wizard: { label: 'Wizard', drive: 'curiosity', hp: 28, hpL: 6, ac: 12, hit: 6, dice: [1, 10, 0], spd: 5, mana: 16, manaL: 5, ranged: true, save: 2,
      skills: { might: 0, finesse: 2, charm: 2, lore: 6 },
      names: ['Orrin Quill', 'Maelis Vane', 'Tobias Ink', 'Esk the Grey', 'Juniper Holt'],
      ab: { 1: 'arrow', 2: 'shield', 3: 'fireball', 4: 'haste', 5: 'lightning', 6: 'ward', 7: 'chain', 8: 'meteor', 9: 'empowered', 11: 'greaterward', 13: 'disintegrate', 15: 'potent', 17: 'timestop', 20: 'archmage' } }
  };
  const CLASS_ORDER = ['barbarian', 'rogue', 'cleric', 'wizard'];
  /* ================= races and the roster of twenty ================= */
  const RACES = {
    human: { label: 'Human', trait: 'Versatile', text: '+1 to hit and +1 to every skill check.', hit: 1, skill: { might: 1, finesse: 1, charm: 1, lore: 1 } },
    elf: { label: 'Elf', trait: 'Keen Senses', text: '+1 speed in battle and +2 to Finesse and Lore checks. A party with an elf sees a tile farther.', spd: 1, sight: 1, skill: { finesse: 2, lore: 2 } },
    dwarf: { label: 'Dwarf', trait: 'Dwarven Resilience', text: '+2 max HP per level and +2 to saves, but 1 slower in battle.', hpL: 2, save: 2, spd: -1, skill: { might: 1 } },
    halfling: { label: 'Halfling', trait: 'Lucky', text: 'Rerolls natural 1s on attacks, saves and death saves. +1 AC.', ac: 1, lucky: true, skill: { finesse: 1, charm: 1 } },
    halforc: { label: 'Half-Orc', trait: 'Relentless Endurance', text: 'Once per battle, drops to 1 HP instead of falling. Critical hits roll an extra weapon die. +2 Might.', relent: 1, savage: true, skill: { might: 2 } }
  };
  const RACE_ORDER = ['human', 'elf', 'dwarf', 'halfling', 'halforc'];
  // look: skin, hair, beard (or null), cloth, trim; long = long hair
  const ROSTER = [
    { id: 'brakka', name: 'Brakka Stonejaw', race: 'human', cls: 'barbarian', drive: 'glory', bio: 'A northern raider who wants his name in every tavern song.', look: { skin: '#e0a882', hair: '#c4542a', beard: '#c4542a', cloth: '#7a5a3a', trim: '#d8d0c0' } },
    { id: 'thrain', name: 'Thrain Emberbeard', race: 'dwarf', cls: 'barbarian', drive: 'duty', bio: 'Swore on his grandfather\'s axe to drive the darkness out of the hills.', look: { skin: '#d8966c', hair: '#8a3a1a', beard: '#c25a22', cloth: '#5a4a3a', trim: '#b8a070' } },
    { id: 'grukka', name: 'Grukka Two-Teeth', race: 'halforc', cls: 'barbarian', drive: 'glory', bio: 'Champion of the fighting pits, looking for a bigger arena.', look: { skin: '#8aa070', hair: '#1e1a16', beard: null, cloth: '#6a3a2a', trim: '#c8b890', long: true } },
    { id: 'sylvaine', name: 'Sylvaine Thornwild', race: 'elf', cls: 'barbarian', drive: 'curiosity', bio: 'A wild elf who left the deep woods to find out what lies past them.', look: { skin: '#f0d0b0', hair: '#e8d496', beard: null, cloth: '#4a6a3a', trim: '#a8c070', long: true } },
    { id: 'bramble', name: 'Bramble Hardfoot', race: 'halfling', cls: 'barbarian', drive: 'greed', bio: 'Small, furious, and very clear about his fee.', look: { skin: '#e8b890', hair: '#6a4426', beard: null, cloth: '#8a4a2a', trim: '#d8c090' } },
    { id: 'vex', name: 'Vex Nightbloom', race: 'elf', cls: 'rogue', drive: 'greed', bio: 'A cat burglar with expensive tastes and no fear of heights.', look: { skin: '#e8c8a8', hair: '#2a2a3a', beard: null, cloth: '#2f4a32', trim: '#8aa070', long: true } },
    { id: 'pip', name: 'Pip Thistledown', race: 'halfling', cls: 'rogue', drive: 'curiosity', bio: 'Has opened every lock in Millbrook, just to see what was inside.', look: { skin: '#f0c098', hair: '#c88a3a', beard: null, cloth: '#5a6a2a', trim: '#c8b060' } },
    { id: 'sable', name: 'Sable Marrow', race: 'human', cls: 'rogue', drive: 'greed', bio: 'A fence turned adventurer. Knows exactly what everything is worth.', look: { skin: '#b07a52', hair: '#1a1210', beard: null, cloth: '#3a3040', trim: '#a08ab0', long: true } },
    { id: 'korra', name: 'Korra Blackgum', race: 'halforc', cls: 'rogue', drive: 'glory', bio: 'Wants to be the most famous thief alive, which is its own kind of problem.', look: { skin: '#7a9a6a', hair: '#3a2a1a', beard: null, cloth: '#3a2a2a', trim: '#b05a3a' } },
    { id: 'nilsa', name: 'Nilsa Copperlock', race: 'dwarf', cls: 'rogue', drive: 'duty', bio: 'A guild trapsmith on loan to the party. Takes the job very seriously.', look: { skin: '#e0a882', hair: '#b8642a', beard: null, cloth: '#5a4a2a', trim: '#d8a050', long: true } },
    { id: 'ione', name: 'Sister Ione', race: 'human', cls: 'cleric', drive: 'duty', bio: 'A temple healer who believes every life can be saved.', look: { skin: '#f0c8a0', hair: '#e8d090', beard: null, cloth: '#e8e4d8', trim: '#d8b040' } },
    { id: 'durgan', name: 'Brother Durgan Ironpsalm', race: 'dwarf', cls: 'cleric', drive: 'duty', bio: 'Sings hymns at the top of his lungs, mostly during battle.', look: { skin: '#d8a07a', hair: '#8a8a8a', beard: '#b4b4b4', cloth: '#d8d0bc', trim: '#c8a040' } },
    { id: 'wren', name: 'Mother Wren Applebough', race: 'halfling', cls: 'cleric', drive: 'greed', bio: 'Collects generous donations for her temple. Mostly for her temple.', look: { skin: '#f0c098', hair: '#b4a898', beard: null, cloth: '#d8c8a0', trim: '#b88a3a' } },
    { id: 'aelith', name: 'Aelith Dawnsong', race: 'elf', cls: 'cleric', drive: 'glory', bio: 'A sun priestess who wants the gods to watch her shine.', look: { skin: '#f4dcc0', hair: '#f0e0b0', beard: null, cloth: '#f0e8d0', trim: '#e8b830', long: true } },
    { id: 'ushka', name: 'Ushka the Mender', race: 'halforc', cls: 'cleric', drive: 'duty', bio: 'Raised by monks. Heals gently and hits very hard.', look: { skin: '#8a9a72', hair: '#2a2a2a', beard: null, cloth: '#c8c0a8', trim: '#a87a3a' } },
    { id: 'orrin', name: 'Orrin Quill', race: 'human', cls: 'wizard', drive: 'curiosity', bio: 'An absent-minded scholar chasing a footnote about the Dark Tower.', look: { skin: '#f0c8a0', hair: '#e8e8f0', beard: '#e8e8f0', cloth: '#3a5aa8', trim: '#f4e27a' } },
    { id: 'maelis', name: 'Maelis Vane', race: 'elf', cls: 'wizard', drive: 'curiosity', bio: 'Studies forbidden magic, strictly for academic reasons.', look: { skin: '#f0d8c8', hair: '#c8c8e0', beard: null, cloth: '#5a3a7a', trim: '#d8b0ff', long: true } },
    { id: 'tobias', name: 'Tobias Inkfoot', race: 'halfling', cls: 'wizard', drive: 'greed', bio: 'Sells copies of his spellbook on the side.', look: { skin: '#e8b890', hair: '#5a3a20', beard: null, cloth: '#3a6a5a', trim: '#e8d070' } },
    { id: 'esk', name: 'Esk Grimmbrew', race: 'dwarf', cls: 'wizard', drive: 'glory', bio: 'A runesmith who wants a rune named after him.', look: { skin: '#d89a72', hair: '#4a3a2a', beard: '#5a4430', cloth: '#8a3a2a', trim: '#ffb050' } },
    { id: 'zarga', name: 'Zarga Bonereader', race: 'halforc', cls: 'wizard', drive: 'curiosity', bio: 'Reads the future in bones, and badly wants to know how this ends.', look: { skin: '#7a8a62', hair: '#1a1a1a', beard: null, cloth: '#4a3a2a', trim: '#e8dcc0', long: true } }
  ];
  const ROSTER_BY = {}; for (const r of ROSTER) ROSTER_BY[r.id] = r;
  const DEFAULT_PARTY = ['brakka', 'vex', 'ione', 'orrin'];
  // pick a party: 'random' (any four) or 'balanced' (one of each class)
  function rollParty(mode, rnd) {
    rnd = rnd || Math.random;
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (mode === 'balanced') return CLASS_ORDER.map(c => shuffle(ROSTER.filter(r => r.cls === c))[0].id);
    return shuffle(ROSTER).slice(0, 4).map(r => r.id);
  }
  // what the players should know about a party before they commit to it
  function partyNotes(ids) {
    const rs = ids.map(id => ROSTER_BY[id]).filter(Boolean); const cls = c => rs.filter(r => r.cls === c).length; const out = [];
    if (rs.length < 4) return out;
    if (!cls('cleric')) out.push({ tone: 'warn', text: 'No cleric: the heroes carry healing potions instead, but the final showdown is a lot harder without a healer.' });
    if (!cls('wizard')) out.push({ tone: 'warn', text: 'No wizard: no area spells to thin out big crowds.' });
    if (!cls('barbarian') && cls('rogue') + cls('wizard') >= 3) out.push({ tone: 'warn', text: 'Fragile: few heroes can stand in the front line.' });
    if (cls('cleric') >= 2) out.push({ tone: 'good', text: 'Two healers: hard to wear down.' });
    if (cls('barbarian') >= 2) out.push({ tone: 'good', text: 'A heavy front line.' });
    if (rs.some(r => r.race === 'elf')) out.push({ tone: 'good', text: 'An elf in the party: they see one tile farther on the map.' });
    const drives = new Set(rs.map(r => r.drive));
    if (drives.size <= 2) out.push({ tone: 'warn', text: 'The players all want the same few things. Spotlights will be harder to spread around.' });
    return out;
  }

  /* ================= the villain ================= */
  const PRON = {
    he: { label: 'He', he: 'he', him: 'him', his: 'his', self: 'himself' },
    she: { label: 'She', he: 'she', him: 'her', his: 'her', self: 'herself' },
    they: { label: 'They', he: 'they', him: 'them', his: 'their', self: 'themself' },
    it: { label: 'It', he: 'it', him: 'it', his: 'its', self: 'itself' }
  };
  // Every Big Bad fights at level 20 on the throne. F is the final form; map forms scale down from it.
  const BOSS_TYPES = {
    lich: { label: 'Lich', icon: 'king', title: 'the Hollow King', pron: 'he', names: ['Malgrith', 'Vorthak', 'Seleth', 'Azurnyx', 'Morvane', 'Kel-Adras'],
      titles: ['the Hollow King', 'the Deathless', 'Lord of Bones', 'the Last Necromancer'],
      blurb: 'An undead sorcerer-king. Shreds souls at range, raises the dead, and rises once more from a hidden phylactery.',
      F: { hp: 3400, ac: 20, hit: 17, dice: [2, 10, 20], attacks: 2, spd: 6, sv: 9, ranged: true, shots: 99 }, est: { dpr: 1.08, ehp: 1.08 },
      powers: ['rend', 'servants', 'phylactery'], servant: 'skeleton', servantName: 'skeletons', minion: 'knight',
      sigil: 'a crowned skull', origin: 'was crowned in death', plan: 'means to turn every grave in the realm into a soldier' },
    dragon: { label: 'Ancient Dragon', icon: 'wyrm', title: 'the Ashen Wyrm', pron: 'it', names: ['Vyraxis', 'Kalgorath', 'Ysmeer', 'Thraxxus', 'Ignivar', 'Ashkareth'],
      titles: ['the Ashen Wyrm', 'Doom of Aldmere', 'the Burning Sky', 'Eater of Kings'],
      blurb: 'A flying fortress of scales. Terrifies the party in the first round and breathes fire across whole groups of heroes.',
      F: { hp: 3200, ac: 21, hit: 17, dice: [2, 10, 17], attacks: 3, spd: 8, sv: 9, flyer: true }, est: { dpr: 1, ehp: 1 },
      powers: ['breath', 'fear'], servant: 'orc', servantName: 'dragon cultists', minion: 'knight',
      sigil: 'a coiled wyrm', origin: 'burned the old kingdom of Aldmere to ash', plan: 'wants the whole realm as a hoard' },
    demon: { label: 'Demon Prince', icon: 'archfiend', title: 'Prince of the Ninth Pit', pron: 'he', names: ['Baalzeth', 'Orcavex', 'Zhaal', 'Mephrax', 'Ulguroth', 'Nazgaroth'],
      titles: ['Prince of the Ninth Pit', 'the Burning Hunger', 'Lord of Cinders', 'the Unchained'],
      blurb: 'A towering fiend wreathed in fire. Burns anyone who stands next to it, hurls hellfire, and calls up shadows from the Pit.',
      F: { hp: 3050, ac: 20, hit: 17, dice: [3, 10, 16], attacks: 2, spd: 7, sv: 8 }, est: { dpr: 1.12, ehp: 1.12 },
      powers: ['aura', 'hellfire', 'servants'], servant: 'wraith', servantName: 'shadow fiends', minion: 'knight',
      sigil: 'a burning sigil', origin: 'clawed out of the Ninth Pit through a crack in the world', plan: 'means to open the crack wide enough for the rest of the Pit' },
    archmage: { label: 'Archmage', icon: 'archmage', title: 'the Unbound', pron: 'she', names: ['Calyra Voss', 'Thessaly', 'Seraphine Dusk', 'Ezrion', 'Morgaunt', 'Ilvarre'],
      titles: ['the Unbound', 'the Star-Thief', 'Keeper of the Black Library', 'the Last Archmage'],
      blurb: 'A mortal wizard with godlike power. Hides behind mirror images, blinks away from danger, stops time, and calls down meteors.',
      F: { hp: 3700, ac: 22, hit: 18, dice: [2, 10, 18], attacks: 3, spd: 6, sv: 10, ranged: true, shots: 99 }, est: { dpr: 0.92, ehp: 0.92 },
      powers: ['meteor', 'blink', 'images', 'timestop'], servant: 'knight', servantName: 'animated armor', minion: 'knight',
      sigil: 'a star inside an eye', origin: 'traded a kingdom\'s soul for the secrets of the stars', plan: 'means to rewrite the world as one great spell' },
    vampire: { label: 'Vampire Lord', icon: 'vlord', title: 'the Crimson Count', pron: 'he', names: ['Cassimir', 'Corvin Ashgrave', 'Vladimir Kross', 'Strahza', 'Lucrezia', 'Nyssa Vael'],
      titles: ['the Crimson Count', 'the Night Eternal', 'Lord of the Red Court', 'the Thirst'],
      blurb: 'Drinks the party\'s life with every bite, heals as it fights, charms heroes into standing still, and calls the wolves.',
      F: { hp: 2550, ac: 20, hit: 17, dice: [2, 10, 16], attacks: 3, spd: 8, sv: 9, drain: true }, est: { dpr: 1.14, ehp: 1.14 },
      powers: ['charm', 'servants', 'regen'], servant: 'wolf', servantName: 'wolves', minion: 'knight',
      sigil: 'a bleeding rose', origin: 'drank the last king of this land dry and took his crown', plan: 'wants every village to pay a tithe in blood' },
    deathknight: { label: 'Death Knight', icon: 'dknight', title: 'the Oathbreaker', pron: 'he', names: ['Lord Kaelvor', 'Sir Mordane', 'Dame Ysolde', 'Varrick Gloam', 'Orsk the Black', 'Lady Ravenna'],
      titles: ['the Oathbreaker', 'the Black Paladin', 'Knight of the Hollow Crown', 'the Unforgiven'],
      blurb: 'A cursed champion in black plate. Leads a bigger, deadlier honor guard and hurls orbs of hellfire.',
      F: { hp: 2800, ac: 22, hit: 18, dice: [2, 12, 16], attacks: 3, spd: 6, sv: 9 }, est: { dpr: 0.94, ehp: 0.94 },
      powers: ['orb', 'command'], servant: 'skeleton', servantName: 'skeletons', minion: 'knight',
      sigil: 'a broken sword', origin: 'broke a holy oath and was cursed to walk forever', plan: 'means to make the whole realm kneel the way he never would' }
  };
  const BOSS_ORDER = ['lich', 'dragon', 'demon', 'archmage', 'vampire', 'deathknight'];
  const BOSS_POWERS = {
    rend: { name: 'Soul Rend', text: 'Every third turn, a wave of necrotic power hits every hero. Save for half.' },
    meteor: { name: 'Meteor Swarm', text: 'Every third turn, meteors fall on every hero. Save for half.' },
    breath: { name: 'Fire Breath', text: 'Engulfs a hero and everyone within 2 hexes. Save for half. Recharges on a 5 or 6.' },
    fear: { name: 'Frightful Presence', text: 'Heroes attack with disadvantage in the first round.' },
    aura: { name: 'Fire Aura', text: 'Heroes standing next to it burn at the start of each of its turns.' },
    hellfire: { name: 'Hellfire', text: 'Every other turn, a blast of fire hits a hex and everything around it. Save for half.' },
    orb: { name: 'Hellfire Orb', text: 'Every other turn, an orb of hellfire bursts on a hex and everything around it. Save for half.' },
    servants: { name: 'Call Servants', text: 'Once per battle, below 60% HP, calls servants onto the field.' },
    phylactery: { name: 'Phylactery', text: 'In the throne room, the first death does not take. It rises again with a quarter of its HP.' },
    blink: { name: 'Blink', text: 'Every other turn, teleports away from heroes before acting.' },
    images: { name: 'Mirror Image', text: 'Three illusory doubles soak up attacks that would have hit.' },
    timestop: { name: 'Time Stop', text: 'Once per battle, below half HP, takes two extra turns.' },
    charm: { name: 'Charm', text: 'Every third turn, one hero must save or lose their next turn.' },
    regen: { name: 'Regeneration', text: 'Heals 2% of its HP at the start of each turn.' },
    command: { name: 'Lord of the Damned', text: 'Its honor guard is 40% bigger and gets +2 to hit.' }
  };
  const vName = s => (s.villain && s.villain.name) || 'Malgrith';
  const vTitle = s => (s.villain && s.villain.title) || 'the Hollow King';
  const vFull = s => vTitle(s) ? `${vName(s)}, ${vTitle(s)}` : vName(s);
  const vP = s => PRON[(s.villain && s.villain.pron) || 'he'] || PRON.he;
  const vType = s => BOSS_TYPES[(s.villain && s.villain.type) || 'lich'] || BOSS_TYPES.lich;
  const capFirst = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  function cleanVillain(v) {
    v = v || {};
    const type = BOSS_TYPES[v.type] ? v.type : 'lich'; const T = BOSS_TYPES[type];
    const name = String(v.name || '').replace(/[<>]/g, '').trim().slice(0, 28) || T.names[0];
    const title = String(v.title === undefined ? T.title : v.title).replace(/[<>]/g, '').trim().slice(0, 40);
    return { type, name, title, pron: PRON[v.pron] ? v.pron : T.pron };
  }
  const SKILL_NAMES = { might: 'Might', finesse: 'Finesse', charm: 'Charm', lore: 'Lore' };
  const MAX_LEVEL = 20;
  const BOSS_LEVEL = 20;
  const XP_TABLE = [0,  0,  150,  350,  650,  1050,  1600,  2300,  3200,  4250,  5600,  7150,  8950,  11000,  13250,  15850,  18800,  22050,  25650,  29600,  33950];

  function abilitiesOf(h) { const out = []; for (let l = 1; l <= h.level; l++) if (CLASSES[h.cls].ab[l]) out.push(CLASSES[h.cls].ab[l]); return out; }
  const has = (h, a) => (h.ab || abilitiesOf(h)).indexOf(a) >= 0;
  function recalcHero(h) {
    const c = CLASSES[h.cls]; h.ab = abilitiesOf(h);
    const oldMax = h.maxHp || 0, oldMana = h.maxMana || 0;
    const R = RACES[h.race] || RACES.human;
    h.maxHp = c.hp + c.hpL * (h.level - 1) + (R.hpL || 0) * h.level + (has(h, 'unstoppable') ? 20 : 0) + (h.gear.hp || 0);
    h.maxMana = c.mana ? c.mana + c.manaL * (h.level - 1) + (h.gear.mana || 0) : 0;
    if (oldMax && h.status !== 'dead') { h.hp = Math.min(h.maxHp, h.hp + Math.max(0, h.maxHp - oldMax)); h.mana = Math.min(h.maxMana, h.mana + Math.max(0, h.maxMana - oldMana)); }
  }
  // a hero from a roster entry (or any {id, name, race, cls, drive, look})
  function heroFrom(r, level, gen) {
    const h = { id: r.id, rid: r.rid || r.id, cls: r.cls, race: RACES[r.race] ? r.race : 'human', name: r.name, drive: r.drive || CLASSES[r.cls].drive, look: r.look || null, level, xp: XP_TABLE[level] || 0,
      hp: 0, maxHp: 0, mana: 0, maxMana: 0, status: 'ok', gear: { att: 0, def: 0, dmg: 0, hp: 0, mana: 0, save: 0 }, items: [], gen: gen || 0 };
    recalcHero(h); h.hp = h.maxHp; h.mana = h.maxMana;
    return h;
  }
  // older entry point: a hero of a class, using that class's first roster entry for looks
  function makeHero(cls, level, name, gen) {
    const r = ROSTER.find(x => x.cls === cls && x.race === 'human') || ROSTER.find(x => x.cls === cls);
    return heroFrom(Object.assign({}, r, { id: cls + (gen ? '-' + gen : ''), name: name || r.name }), level, gen);
  }
  function partyFlags(heroes) {
    const live = heroes.filter(h => h.status === 'ok');
    const any = a => live.some(h => has(h, a));
    return { bless: any('bless'), stoneskin: any('stoneskin'), aura: any('aura'), haste: any('haste'), warcry: any('warcry') };
  }
  const sneakN = h => 1 + (has(h, 'backstab') ? 1 : 0) + (h.level >= 5 && has(h, 'backstab') ? 1 : 0) + (h.level >= 7 && has(h, 'backstab') ? 1 : 0) + (has(h, 'deadly') ? 1 + [12, 15, 18].filter(l => h.level >= l).length : 0);
  function heroStats(h, f, s) {
    const c = CLASSES[h.cls], L = h.level, R = RACES[h.race] || RACES.human;
    const tb = townBonus(s, h);
    const hit = c.hit + (R.hit || 0) + Math.floor(L / 2) + (h.gear.att || 0) + (f.aura ? 1 : 0) + (f.warcry ? 1 : 0) + (s && s.crown ? 1 : 0) + tb.hit;
    const ac = tb.ac + c.ac + (R.ac || 0) + (h.gear.def || 0) + (has(h, 'shield') ? 3 : 0) + (has(h, 'unstoppable') ? 2 : 0) + (has(h, 'elusive') ? 2 : 0) + (f.stoneskin ? 1 : 0) + (f.aura ? 1 : 0);
    const flat = tb.dmg + c.dice[2] + (h.gear.dmg || 0) + (has(h, 'rage') ? 2 : 0) + (has(h, 'avatar') ? 3 : 0) + Math.floor((L - 1) / 2) + (h.cls === 'wizard' && has(h, 'empowered') ? 5 : 0);
    const n = h.cls === 'wizard' ? (has(h, 'archmage') ? 4 : has(h, 'potent') ? 3 : has(h, 'fireball') ? 2 : 1) : c.dice[0];
    const extra = [];
    if (has(h, 'titan')) extra.push({ n: 1, s: 6, label: "Titan's Grip" });
    if (h.cls === 'rogue') extra.push({ n: sneakN(h), s: 6, label: 'Sneak Attack' });
    if (has(h, 'divine')) extra.push({ n: 2, s: 8, label: 'Divine Strike' });
    const spd = c.spd + (R.spd || 0) + (has(h, 'shadow') ? 3 : 0) + (has(h, 'phantom') ? 2 : 0) + (f.haste ? 1 : 0);
    return { hit, ac, dice: [n, c.dice[1], flat], extra, spd, save: c.save + (R.save || 0) + Math.floor(L / 3) + (h.gear.save || 0) + (has(h, 'slippery') ? 3 : 0) };
  }
  const skillBonus = (h, sk) => CLASSES[h.cls].skills[sk] + Math.floor(h.level / 2) + (((RACES[h.race] || RACES.human).skill || {})[sk] || 0);

  /* ================= creatures ================= */
  const CREATURES = {
    goblin: { name: 'Goblins', one: 'Goblin', hp: 6, ac: 12, hit: 3, dice: [1, 6, 1], spd: 5, sv: 1, base: 12, cost: 2, mspd: 7, smart: true, text: 'Cowardly in small numbers, dangerous in a mob. Scatter from strong parties.' },
    wolf: { name: 'Wolves', one: 'Wolf', hp: 11, ac: 13, hit: 4, dice: [2, 4, 2], spd: 7, sv: 2, base: 8, cost: 3, mspd: 9, text: 'Fast pack hunters that reach the back line on the first turn.' },
    bandit: { name: 'Bandits', one: 'Bandit', hp: 11, ac: 13, hit: 4, dice: [1, 8, 1], spd: 5, sv: 2, base: 6, cost: 3, mspd: 7, smart: true, shooter: true, shots: 2, text: 'Highway robbers. Open with a crossbow volley, then close in with cudgels. Run when the fight turns.' },
    skeleton: { name: 'Skeletons', one: 'Skeleton', hp: 7, ac: 13, hit: 3, dice: [1, 6, 1], spd: 4, sv: 1, base: 14, cost: 3, mspd: 5, undead: true, text: 'Slow, hard to hurt, and never afraid.' },
    orc: { name: 'Orc Archers', one: 'Orc Archer', hp: 12, ac: 13, hit: 4, dice: [1, 8, 2], spd: 4, sv: 1, base: 6, cost: 4, mspd: 6, shooter: true, shots: 12, text: 'Shoot from across the field. Hide them behind rocks; weak when someone reaches them.' },
    ogre: { name: 'Ogres', one: 'Ogre', hp: 45, ac: 11, hit: 6, dice: [2, 8, 4], spd: 4, sv: 0, base: 3, cost: 6, mspd: 5, text: 'Slow brutes that hit like a falling tree.' },
    wraith: { name: 'Wraiths', one: 'Wraith', hp: 30, ac: 13, hit: 5, dice: [2, 6, 3], spd: 6, sv: 3, base: 3, cost: 7, mspd: 7, flyer: true, drain: true, undead: true, text: 'Fly over anything and drain life to raise their fallen.' },
    troll: { name: 'Trolls', one: 'Troll', hp: 45, ac: 15, hit: 7, dice: [2, 6, 5], spd: 7, sv: 2, base: 3, cost: 9, mspd: 6, regen: true, text: 'Fast and regenerating. Wounds close every turn.' },
    giant: { name: 'Hill Giants', one: 'Hill Giant', hp: 120, ac: 13, hit: 8, dice: [3, 10, 6], spd: 5, sv: 1, base: 1, cost: 10, mspd: 5, shooter: true, shots: 8, text: 'Hurls boulders across the battlefield.' },
    dragon: { name: 'Young Dragon', one: 'Young Dragon', hp: 200, ac: 17, hit: 9, dice: [4, 10, 6], spd: 11, sv: 4, base: 1, cost: 20, mspd: 10, flyer: true, breath: true, text: 'Flies anywhere. Its breath scorches the target and everyone beside it.' },
    vampire: { name: 'Vampires', one: 'Vampire', hp: 75, ac: 16, hit: 10, dice: [2, 8, 6], spd: 8, sv: 4, base: 2, cost: 12, mspd: 8, drain: true, undead: true, attacks: 2, text: 'Fast and cunning. They strike twice and heal by drinking blood.' },
    hydra: { name: 'Hydras', one: 'Hydra', hp: 190, ac: 15, hit: 9, dice: [2, 10, 5], spd: 5, sv: 3, base: 1, cost: 14, mspd: 5, regen: true, attacks: 3, text: 'Three snapping heads, and wounds that close every turn.' },
    demon: { name: 'Pit Demons', one: 'Pit Demon', hp: 330, ac: 18, hit: 12, dice: [3, 10, 10], spd: 8, sv: 6, base: 1, cost: 26, mspd: 8, flyer: true, attacks: 2, text: 'A towering fiend of the pit. Strikes twice, and its wings carry it anywhere on the field.' },
    // 0.24: one unique monster per villain, raised in a lair from that villain's own talent path. stand/tint/sc: stand-in art until PixelLab art exists
    colossus: { name: 'Bone Colossi', one: 'Bone Colossus', hp: 90, ac: 15, hit: 6, dice: [2, 8, 4], spd: 4, sv: 1, base: 1, cost: 8, mspd: 4, undead: true, villain: 'lich', stand: 'skeleton', tint: '#efe2c4', sc: 1.45, text: 'A walking cathedral of fused bones, slow and very hard to knock down.' },
    drake: { name: 'Drakes', one: 'Drake', hp: 48, ac: 14, hit: 6, dice: [2, 6, 3], spd: 9, sv: 2, base: 2, cost: 8, mspd: 9, flyer: true, villain: 'dragon', stand: 'dragon', tint: '#d39a52', sc: 0.72, text: 'The dragon\'s lesser kin. Fast flyers that dive on the back line.' },
    hellhound: { name: 'Hellhounds', one: 'Hellhound', hp: 28, ac: 13, hit: 5, dice: [2, 6, 2], spd: 8, sv: 2, base: 4, cost: 5, mspd: 10, villain: 'demon', stand: 'wolf', tint: '#ff6a36', sc: 1.12, text: 'Burning dogs of the Pit that hunt in big packs.' },
    irongolem: { name: 'Iron Golems', one: 'Iron Golem', hp: 80, ac: 17, hit: 6, dice: [2, 8, 4], spd: 4, sv: 4, base: 1, cost: 9, mspd: 4, villain: 'archmage', stand: 'ogre', tint: '#9fb6d6', sc: 1.05, text: 'Rune-carved iron that shrugs off blades. Slow, and almost impossible to hurt.' },
    werewolf: { name: 'Werewolves', one: 'Werewolf', hp: 50, ac: 13, hit: 6, dice: [2, 6, 3], spd: 8, sv: 2, base: 2, cost: 8, mspd: 9, regen: true, villain: 'vampire', stand: 'wolf', tint: '#7d6a5c', sc: 1.4, text: 'The Count\'s hunters. Fast, savage, and their wounds close as they fight.' },
    rider: { name: 'Black Riders', one: 'Black Rider', hp: 55, ac: 16, hit: 7, dice: [1, 10, 4], spd: 9, sv: 2, base: 2, cost: 8, mspd: 10, villain: 'deathknight', stand: 'knight', tint: '#5a5870', sc: 1.12, text: 'Cursed cavalry in black plate. They ride down heroes who stray from the group.' },
    knight: { name: 'Hollow Knights', one: 'Hollow Knight', hp: 35, ac: 16, hit: 6, dice: [2, 6, 4], spd: 6, sv: 2, base: 3, cost: 8, mspd: 6, undead: true, hidden: true, text: 'Your villain\'s honor guard, black armor with nothing inside. Only your villain can lead them.' }
  };
  const CREATURE_ORDER = ['goblin', 'wolf', 'bandit', 'skeleton', 'orc', 'hellhound', 'ogre', 'wraith', 'drake', 'werewolf', 'rider', 'colossus', 'irongolem', 'troll', 'giant', 'dragon', 'vampire', 'hydra', 'demon'];
  function quantityWord(n) { return n < 5 ? 'A few' : n < 10 ? 'Several' : n < 20 ? 'A pack of' : n < 50 ? 'Lots of' : n < 100 ? 'A horde of' : 'A throng of'; }

  /* ================= DM content ================= */
  // monster lairs your minions build on the map. Each raises one kind of monster every night and sends war
  // parties at heroes within its reach. unit/rate/price/needs/tier are the 0.9 fields; cost/grow/band/tech are kept for old saves.
  const DUNGEONS = {
    warren: { name: 'Goblin Warren', unit: 'goblin', rate: 6, price: { gold: 8, lumber: 4 }, needs: [], tier: 1, home: ['grass', 'forest'], text: 'A burrow under a thorny mound. Goblins breed faster than anyone can count.', cost: 6, tech: 'throne', grow: { goblin: 2.4 }, band: { goblin: 8 } },
    kennel: { name: 'Wolf Den', unit: 'wolf', rate: 3.2, price: { gold: 8, lumber: 6 }, needs: [], tier: 1, home: ['forest', 'snow'], text: 'A cave strewn with gnawed bones. Fast hunters with a long reach.', cost: 6, tech: 'throne', grow: { wolf: 1.2 }, band: { wolf: 4 } },
    hideout: { name: "Bandits' Hideout", unit: 'bandit', rate: 3.4, price: { gold: 10, lumber: 6 }, needs: [], tier: 1, home: ['forest', 'dirt'], text: 'Cutthroats who work for a cut. Crossbows first, then cudgels.', cost: 7, tech: 'throne', grow: { bandit: 1.2 }, band: { bandit: 4 } },
    bonecrypt: { name: 'Bone Crypt', unit: 'skeleton', rate: 5.3, price: { gold: 8, ore: 4 }, needs: [], tier: 1, home: ['swamp', 'waste'], text: 'Skeletons claw their way up every night. Slow, cheap and never afraid.', cost: 8, tech: 'throne', grow: { skeleton: 1.8 }, band: { skeleton: 9 } },
    camp: { name: 'Orc War Camp', unit: 'orc', rate: 3, price: { gold: 12, lumber: 8, ore: 2 }, needs: [], tier: 1, home: ['dirt', 'waste'], text: 'Tents and a palisade. Orc archers shoot from across the field.', cost: 8, tech: 'throne', grow: { orc: 0.9 }, band: { orc: 4 } },
    den: { name: 'Ogre Den', unit: 'ogre', rate: 2.4, price: { gold: 16, lumber: 6, ore: 6 }, needs: ['camp'], tier: 2, home: ['dirt', 'forest'], text: 'Fighting pits where brutes are fattened for war.', cost: 11, tech: 'ogre', grow: { ogre: 0.3 }, band: { ogre: 2 } },
    barrow: { name: 'Haunted Barrow', unit: 'wraith', rate: 2.5, price: { gold: 16, ore: 8, lore: 4 }, needs: ['bonecrypt'], tier: 2, home: ['swamp', 'snow'], text: 'An old king\'s grave mound. Wraiths fly and drain life. Gives your villain the Dread Aura.', cost: 11, tech: 'altar', grow: { wraith: 0.3 }, band: { wraith: 2 } },
    fens: { name: 'Troll Bog', unit: 'troll', rate: 3.3, price: { gold: 22, lumber: 10, ore: 8, lore: 6 }, needs: ['den'], tier: 3, home: ['swamp', 'forest'], text: 'A stilt hut over black water. Trolls are fast and their wounds close every turn.', cost: 14, tech: 'troll', grow: { troll: 0.24 }, band: { troll: 2 } },
    hold: { name: "Giant's Hold", unit: 'giant', rate: 1.6, price: { gold: 24, lumber: 6, ore: 14, lore: 6 }, needs: ['den'], tier: 3, home: ['snow', 'dirt'], text: 'A rough stone hall with doors forty feet high. Hill giants hurl boulders.', cost: 15, tech: 'giant', grow: { giant: 0.15 }, band: { giant: 1 } },
    keep: { name: 'Vampire Manor', unit: 'vampire', rate: 1.35, price: { gold: 30, lumber: 12, ore: 10, lore: 10 }, needs: ['barrow'], tier: 3, home: ['forest', 'snow', 'waste'], text: 'A shuttered manor on a hill. Vampires strike twice. Gives your villain the Dark Ritual.', cost: 18, tech: 'blood', grow: { vampire: 0.18 }, band: { vampire: 2 } },
    mire: { name: 'Hydra Mire', unit: 'hydra', rate: 1.05, price: { gold: 32, lumber: 14, ore: 10, lore: 10 }, needs: ['fens'], tier: 4, home: ['swamp'], text: 'A drowned grove that stinks of rot. The heads grow back.', cost: 18, tech: 'mire', grow: { hydra: 0.09 }, band: { hydra: 1 } },
    roost: { name: 'Dragon Roost', unit: 'dragon', rate: 1, price: { gold: 36, lumber: 8, ore: 18, lore: 12 }, needs: ['hold', 'barrow'], tier: 4, home: ['waste', 'snow', 'dirt'], text: 'A crag heaped with stolen gold, where young dragons nest.', cost: 20, tech: 'roost', grow: { dragon: 0.09 }, band: { dragon: 1 } },
    abyss: { name: 'Demon Pit', unit: 'demon', rate: 0.8, price: { gold: 44, lumber: 10, ore: 22, lore: 16 }, needs: ['roost', 'keep'], tier: 5, home: ['waste'], text: 'A crack in the world that glows red. Pit demons, the strongest monsters there are.', cost: 28, tech: 'gate', grow: { demon: 0.06 }, band: { demon: 1 } }
  };
  // 0.24: each villain's own lair, unlocked in its talent path (villain: only that villain can build it)
  Object.assign(DUNGEONS, {
    boneforge: { name: 'Bone Forge', unit: 'colossus', rate: 1.8, price: { gold: 16, ore: 8 }, needs: [], tier: 2, home: ['swamp', 'waste'], villain: 'lich', stand: 'bonecrypt', tint: '#f3e9d2', text: 'A furnace where bones are melted together into colossi.' },
    eyrie: { name: 'Drake Eyrie', unit: 'drake', rate: 1.6, price: { gold: 18, lumber: 6, ore: 6 }, needs: [], tier: 2, home: ['snow', 'dirt', 'waste'], villain: 'dragon', stand: 'roost', tint: '#e0a060', text: 'A crag of nests where the dragon\'s brood hatches.' },
    brimstone: { name: 'Brimstone Kennels', unit: 'hellhound', rate: 2.8, price: { gold: 14, lumber: 6, ore: 4 }, needs: [], tier: 2, home: ['waste', 'dirt'], villain: 'demon', stand: 'kennel', tint: '#ff7040', text: 'Smouldering pens that smell of sulphur. Hellhounds breed in the coals.' },
    foundry: { name: 'Golem Foundry', unit: 'irongolem', rate: 1.5, price: { gold: 18, ore: 10 }, needs: [], tier: 2, home: ['dirt', 'snow'], villain: 'archmage', stand: 'hold', tint: '#a9c0e0', text: 'Anvils, moulds and a ring of runes. Each night another golem wakes.' },
    lodge: { name: 'Werewolf Lodge', unit: 'werewolf', rate: 1.7, price: { gold: 16, lumber: 10 }, needs: [], tier: 2, home: ['forest', 'snow'], villain: 'vampire', stand: 'kennel', tint: '#8c7c6c', text: 'A hunting lodge deep in the woods, empty by day.' },
    stables: { name: 'Black Stables', unit: 'rider', rate: 1.6, price: { gold: 18, lumber: 8, ore: 4 }, needs: [], tier: 2, home: ['grass', 'dirt'], villain: 'deathknight', stand: 'camp', tint: '#6a6880', text: 'Stalls of black horses that never eat, and riders who never sleep.' }
  });
  const LAIR_ORDER = ['warren', 'kennel', 'hideout', 'bonecrypt', 'camp', 'boneforge', 'eyrie', 'brimstone', 'foundry', 'lodge', 'stables', 'den', 'barrow', 'fens', 'hold', 'keep', 'mire', 'roost', 'abyss'];
  // the lairs this villain can ever build
  const lairsFor = s => LAIR_ORDER.filter(k => !DUNGEONS[k].villain || DUNGEONS[k].villain === ((s && s.villain && s.villain.type) || 'lich'));
  // a lair's price to build (the deadlier ones still take Lore every time, on top of their research)
  const buildPrice = k => { const P = Object.assign({}, DUNGEONS[k].price); if (P.lore) { P.gold = (P.gold || 0) + 2 * P.lore; delete P.lore; } return P; };
  const RES_KEYS = ['gold', 'lumber', 'ore'];
  const RES_NAME = { gold: 'gold', lumber: 'lumber', ore: 'ore', lore: 'Lore' };
  // places on the map your minions can work, a few of each, fixed per map
  const NODE_KINDS = {
    gold: { name: 'Gold Mine', raw: 'Gold Deposit', res: 'gold', per: 3, cap: 1, verb: 'digs', sink: 'sink a mine', rawText: 'A seam of gold in the hills.', text: 'A gold mine in the hills.' },
    lumber: { name: 'Lumber Camp', raw: 'Timber Stand', res: 'lumber', per: 3, cap: 1, verb: 'cuts', sink: 'clear a camp', rawText: 'Old trees ready for the axe.', text: 'A lumber camp in the old trees.' },
    ore: { name: 'Ore Mine', raw: 'Ore Deposit', res: 'ore', per: 2, cap: 1, verb: 'hauls', sink: 'dig a mine', rawText: 'Black iron under the rock.', text: 'An ore mine cut into the rock.' }
  };
  // a site is a raw deposit until a minion spends a night turning it into a mine or camp
  const nodeName = n => n.dev ? NODE_KINDS[n.kind].name : NODE_KINDS[n.kind].raw;
  const STARTING_MINIONS = 2;
  // each villain sends out its own kind of servant to gather and build
  const MINION_TYPES = {
    lich: { name: 'Bone Thralls', one: 'Bone Thrall', look: 'thrall', perk: 'ore', text: 'Skeletons that never tire. Each digs 1 extra ore a day at an ore vein.' },
    dragon: { name: 'Kobolds', one: 'Kobold', look: 'kobold', perk: 'gold', text: 'Scaly little hoarders. Each digs 1 extra gold a day at a gold mine.' },
    demon: { name: 'Imps', one: 'Imp', look: 'imp', perk: 'fast', text: 'Winged pests. They travel twice as far in a day.' },
    archmage: { name: 'Clay Servants', one: 'Clay Servant', look: 'golem', perk: 'build', text: 'Animated clay that never sleeps. They build lairs twice as fast.' },
    vampire: { name: 'Thralls', one: 'Thrall', look: 'ghoul', perk: 'cheap', text: 'Pale servants in the Count\'s livery. They cost 8 gold instead of 12.' },
    deathknight: { name: 'Grave Diggers', one: 'Grave Digger', look: 'digger', perk: 'lumber', text: 'Hooded diggers with spades. Each cuts 1 extra lumber a day at a lumber camp.' }
  };
  const MINION_MP = 90, MAX_MINIONS = 16, LIBRARY = [null, { gold: 20, lumber: 10 }, { gold: 35, lumber: 15, ore: 10 }];   // 0.24: each level is a talent point
  const BUILD_DAYS = [0, 1, 1, 2, 3, 3]; // (before 0.15; kept for old saves)
  // RTS pacing (0.15): lairs take days to raise, minions days to summon, the Library days to build
  const LAIR_DAYS = { warren: 2, kennel: 3, hideout: 3, bonecrypt: 3, camp: 3, den: 4, barrow: 4, fens: 5, hold: 5, keep: 5, mire: 6, roost: 6, abyss: 7, boneforge: 4, eyrie: 4, brimstone: 3, foundry: 4, lodge: 4, stables: 4 };
  const buildDays = k => LAIR_DAYS[k] || BUILD_DAYS[(DUNGEONS[k] || {}).tier] || 3;
  const SUMMON_DAYS = 2, MAX_SUMMONS = 4, LIBRARY_DAYS = [0, 3, 4];
  /* research at the Dark Tower (0.16): Lore and nights buy new lairs, dark powers and better servants, one at a time.
     needs: other research; the five starting lairs count as known. ranks: how many times it can be taken. */
  const START_LAIRS = ['warren', 'kennel', 'hideout', 'bonecrypt', 'camp'];
  /* talents (0.24): instead of buying research, the DM earns talent points over the campaign and spends them
     in trees, WoW-style. Three trees every villain shares, plus one path of the villain's own with its unique monster.
     tier t needs TIER_NEED[t] points spent in the same tree first; needs: other talents (or starting lairs).
     fx (per rank): mod {units, hp, ac, hit, dmg, regen, drain}, rate {units|all, pct}, yield {gold|lumber|ore},
     nightly {gold}, perLair {gold}, townTithe, bandCost, summonCost, minions, reach, sight, buildDays, summonDays,
     empire, warded, cap, bands, vets, guards, infamy, villain {hp, hit}, points */
  const TIER_NEED = [0, 2, 4, 6, 8];
  const TREES = {
    brood: { name: 'The Brood', blurb: 'Your monsters: new lairs, bigger broods and deadlier beasts.' },
    dominion: { name: 'Dominion', blurb: 'Your servants, mines and gold: a richer, faster tower.' },
    dread: { name: 'Dread', blurb: 'Your villain and the final showdown.' },
    'v-lich': { name: 'The Endless Dead', villain: 'lich', blurb: 'The Lich\'s own path: bone colossi and an army that never stays dead.' },
    'v-dragon': { name: 'Fire and Hoard', villain: 'dragon', blurb: 'The Dragon\'s own path: drakes, gold and fire.' },
    'v-demon': { name: 'The Burning Legion', villain: 'demon', blurb: 'The Demon Prince\'s own path: hellhounds and the fires of the Pit.' },
    'v-archmage': { name: 'Spellcraft', villain: 'archmage', blurb: 'The Archmage\'s own path: iron golems and talents that pay for themselves.' },
    'v-vampire': { name: 'The Night Court', villain: 'vampire', blurb: 'The Vampire Lord\'s own path: werewolves, and blood from Millbrook\'s purse.' },
    'v-deathknight': { name: 'The Black Legion', villain: 'deathknight', blurb: 'The Death Knight\'s own path: black riders and veteran bands.' }
  };
  const SMALL = ['goblin', 'bandit', 'orc'], BRUTES = ['ogre', 'troll', 'giant'], UNDEAD = ['skeleton', 'wraith', 'vampire', 'colossus'];
  const TALENTS = {
    // --- the Brood
    fecund: { tree: 'brood', tier: 0, ranks: 3, name: 'Fecund Broods', text: 'Every lair breeds 10% more monsters a night.', fx: { rate: { all: true, pct: 0.1 } } },
    den: { tree: 'brood', tier: 0, lair: true, needs: ['camp'] },
    barrow: { tree: 'brood', tier: 0, lair: true, needs: ['bonecrypt'] },
    skirmish: { tree: 'brood', tier: 1, ranks: 2, name: 'Cutthroat Drill', text: 'Goblins, bandits and orc archers: +1 to hit and +15% hit points.', fx: { mod: { units: SMALL, hit: 1, hp: 0.15 } } },
    packs: { tree: 'brood', tier: 1, ranks: 2, name: 'Dire Packs', text: 'Wolves: +20% hit points and +1 damage.', fx: { mod: { units: ['wolf'], hp: 0.2, dmg: 1 } } },
    fens: { tree: 'brood', tier: 1, lair: true, needs: ['den'] },
    hold: { tree: 'brood', tier: 1, lair: true, needs: ['den'] },
    bonearmor: { tree: 'brood', tier: 2, ranks: 2, name: 'Bone Armour', text: 'Skeletons and wraiths: +1 AC and +15% hit points.', fx: { mod: { units: ['skeleton', 'wraith'], ac: 1, hp: 0.15 } } },
    keep: { tree: 'brood', tier: 2, lair: true, needs: ['barrow'] },
    warbands: { tree: 'brood', tier: 2, name: 'War Bands', text: 'Each lair keeps three bands out instead of two, and holds half as many monsters again at home.', fx: { bands: 1, cap: 0.5 } },
    brutes: { tree: 'brood', tier: 3, ranks: 2, name: 'Brutes', text: 'Ogres, trolls and hill giants: +1 to hit and +2 damage.', fx: { mod: { units: BRUTES, hit: 1, dmg: 2 } } },
    bloodthirst: { tree: 'brood', tier: 3, name: 'Bloodthirst', text: 'Ogres, trolls and hill giants drink the life they spill: they heal when they hit.', fx: { mod: { units: BRUTES, drain: true } } },
    mire: { tree: 'brood', tier: 3, lair: true, needs: ['fens'] },
    roost: { tree: 'brood', tier: 3, lair: true, needs: ['hold', 'barrow'] },
    abyss: { tree: 'brood', tier: 4, lair: true, needs: ['roost', 'keep'] },
    apex: { tree: 'brood', tier: 4, name: 'Apex Predators', text: 'Every monster: +10% hit points and +1 to hit.', fx: { mod: { units: 'all', hp: 0.1, hit: 1 } } },
    // --- Dominion
    swift: { tree: 'dominion', tier: 0, name: 'Swift Summoning', text: 'Summoning a new minion takes 1 night instead of 2.', fx: { summonDays: 1 } },
    masons: { tree: 'dominion', tier: 0, name: 'Master Masons', text: 'Every lair needs a day less work to build (never less than one).', fx: { buildDays: 1 } },
    veins: { tree: 'dominion', tier: 0, ranks: 2, name: 'Rich Veins', text: 'Gold mines dig 1 more gold a night.', fx: { yield: { gold: 1 } } },
    hands: { tree: 'dominion', tier: 1, needs: ['masons'], name: 'Tireless Hands', text: '+1 gold, lumber or ore every night from each mine and camp your minions work.', fx: { yield: { gold: 1, lumber: 1, ore: 1 } } },
    overseers: { tree: 'dominion', tier: 1, name: 'Overseers', text: 'Minions cost a third less gold to summon, and the tower can feed 4 more.', fx: { summonCost: 1 / 3, minions: 4 } },
    tithe: { tree: 'dominion', tier: 1, name: 'Tithe of Fear', text: 'Every lair you\'ve built sends 1 gold to the tower each night.', fx: { perLair: { gold: 1 } } },
    warchest: { tree: 'dominion', tier: 2, name: 'War Chest', text: 'Levelling up a band costs a third less.', fx: { bandCost: 1 / 3 } },
    march: { tree: 'dominion', tier: 2, name: 'Forced March', text: 'War parties from your lairs reach 2 tiles farther.', fx: { reach: 2 } },
    spies: { tree: 'dominion', tier: 2, name: 'Spies', text: 'Your minions see 2 tiles farther, so the map clears faster.', fx: { sight: 2 } },
    vaults: { tree: 'dominion', tier: 3, name: 'Treasure Vaults', text: '+4 gold to the tower every night.', fx: { nightly: { gold: 4 } } },
    deep: { tree: 'dominion', tier: 3, name: 'Deep Mines', text: 'Lumber camps and ore mines yield 1 more a night.', fx: { yield: { lumber: 1, ore: 1 } } },
    empire: { tree: 'dominion', tier: 4, name: 'Dark Empire', text: 'Every lair goes up in a single night.', fx: { empire: true } },
    // --- Dread
    vigor: { tree: 'dread', tier: 0, ranks: 3, power: 'vigor' },
    menace: { tree: 'dread', tier: 0, name: 'Menace', text: 'Close fights and fallen heroes earn half as much Infamy again, so talent points come faster.', fx: { infamy: 0.5 } },
    raise: { tree: 'dread', tier: 1, power: 'raise' },
    dread: { tree: 'dread', tier: 1, power: 'dread' },
    traps: { tree: 'dread', tier: 2, ranks: 3, power: 'traps' },
    guard: { tree: 'dread', tier: 2, name: 'Honor Guard', text: 'Half as many monsters again guard the gate to the throne room in the finale.', fx: { guards: 0.5 } },
    ritual: { tree: 'dread', tier: 3, power: 'ritual' },
    ascend: { tree: 'dread', tier: 4, name: 'Ascension', text: 'In the finale your villain has +15% hit points and +1 to hit.', fx: { villain: { hp: 0.15, hit: 1 } } },
    // --- the Lich
    boneforge: { tree: 'v-lich', tier: 0, lair: true },
    gravetithe: { tree: 'v-lich', tier: 0, ranks: 2, name: 'Grave Tithe', text: 'Bone Crypts and Bone Forges breed 25% more.', fx: { rate: { units: ['skeleton', 'colossus'], pct: 0.25 } } },
    ossified: { tree: 'v-lich', tier: 1, ranks: 2, name: 'Ossified', text: 'Skeletons and bone colossi: +1 AC and +15% hit points.', fx: { mod: { units: ['skeleton', 'colossus'], ac: 1, hp: 0.15 } } },
    chill: { tree: 'v-lich', tier: 2, ranks: 2, name: 'Grave Chill', text: 'Every undead monster (skeletons, wraiths, vampires, bone colossi): +1 to hit.', fx: { mod: { units: UNDEAD, hit: 1 } } },
    phylactery: { tree: 'v-lich', tier: 3, name: 'Hidden Phylactery', text: 'In the finale the Lich has +15% hit points.', fx: { villain: { hp: 0.15 } } },
    deathless: { tree: 'v-lich', tier: 4, name: 'Lord of the Deathless', text: 'Every undead monster\'s wounds close each turn.', fx: { mod: { units: UNDEAD, regen: true } } },
    // --- the Ancient Dragon
    eyrie: { tree: 'v-dragon', tier: 0, lair: true },
    hoard: { tree: 'v-dragon', tier: 0, ranks: 2, name: 'Hoard Lust', text: '+2 gold to the tower every night.', fx: { nightly: { gold: 2 } } },
    scales: { tree: 'v-dragon', tier: 1, ranks: 2, name: 'Iron Scales', text: 'Drakes and dragons: +1 AC and +10% hit points.', fx: { mod: { units: ['drake', 'dragon'], ac: 1, hp: 0.1 } } },
    kobolds: { tree: 'v-dragon', tier: 2, name: 'Kobold Warrens', text: 'Minions cost a third less gold to summon, and the tower can feed 4 more.', fx: { summonCost: 1 / 3, minions: 4 } },
    wyrmfire: { tree: 'v-dragon', tier: 3, ranks: 2, name: 'Wyrmfire', text: 'Drakes and dragons: +3 damage.', fx: { mod: { units: ['drake', 'dragon'], dmg: 3 } } },
    ancient: { tree: 'v-dragon', tier: 4, name: 'Ancient Wrath', text: 'In the finale the Dragon has +10% hit points and +1 to hit.', fx: { villain: { hp: 0.1, hit: 1 } } },
    // --- the Demon Prince
    brimstone: { tree: 'v-demon', tier: 0, lair: true },
    pact: { tree: 'v-demon', tier: 0, ranks: 2, name: 'Infernal Pact', text: 'Every lair breeds 8% more monsters a night.', fx: { rate: { all: true, pct: 0.08 } } },
    hellfire: { tree: 'v-demon', tier: 1, ranks: 2, name: 'Hellfire', text: 'Hellhounds and pit demons: +2 damage.', fx: { mod: { units: ['hellhound', 'demon'], dmg: 2 } } },
    burning: { tree: 'v-demon', tier: 2, name: 'Burning Roads', text: 'War parties from your lairs reach 3 tiles farther.', fx: { reach: 3 } },
    ninth: { tree: 'v-demon', tier: 3, ranks: 2, name: 'Fires of the Ninth Pit', text: 'Every monster: +1 damage.', fx: { mod: { units: 'all', dmg: 1 } } },
    unchained: { tree: 'v-demon', tier: 4, name: 'Unchained', text: 'In the finale the Demon Prince has +10% hit points and +2 to hit.', fx: { villain: { hp: 0.1, hit: 2 } } },
    // --- the Archmage
    foundry: { tree: 'v-archmage', tier: 0, lair: true },
    scholar: { tree: 'v-archmage', tier: 0, ranks: 2, name: 'Arcane Scholar', text: 'Costs 1 talent point and gives 2 back.', fx: { points: 2 } },
    runes: { tree: 'v-archmage', tier: 1, ranks: 2, name: 'Runic Plating', text: 'Iron golems and hollow knights: +1 AC and +10% hit points.', fx: { mod: { units: ['irongolem', 'knight'], ac: 1, hp: 0.1 } } },
    wards: { tree: 'v-archmage', tier: 2, name: 'Warded Lairs', text: 'Lairs the heroes wreck are dug out in 1 day instead of 4.', fx: { warded: true } },
    timeweave: { tree: 'v-archmage', tier: 3, ranks: 2, name: 'Timeweave', text: 'Summoning a minion and building a lair each take a night less (never less than one).', fx: { buildDays: 1, summonDays: 1 } },
    unbound: { tree: 'v-archmage', tier: 4, name: 'The Unbound', text: 'In the finale the Archmage has +15% hit points and +1 to hit.', fx: { villain: { hp: 0.15, hit: 1 } } },
    // --- the Vampire Lord
    lodge: { tree: 'v-vampire', tier: 0, lair: true },
    bloodtithe: { tree: 'v-vampire', tier: 0, ranks: 2, name: 'Blood Tithe', text: 'Each night 2 gold slips out of Millbrook\'s purse and into the tower\'s.', fx: { townTithe: 2 } },
    nightkin: { tree: 'v-vampire', tier: 1, ranks: 2, name: 'Children of the Night', text: 'Wolves and werewolves: +20% hit points and +1 to hit.', fx: { mod: { units: ['wolf', 'werewolf'], hp: 0.2, hit: 1 } } },
    thirst: { tree: 'v-vampire', tier: 2, name: 'The Thirst', text: 'Wolves and werewolves drink the life they spill: they heal when they hit.', fx: { mod: { units: ['wolf', 'werewolf'], drain: true } } },
    court: { tree: 'v-vampire', tier: 3, ranks: 2, name: 'Crimson Court', text: 'Vampires: +20% hit points and +2 damage.', fx: { mod: { units: ['vampire'], hp: 0.2, dmg: 2 } } },
    eternal: { tree: 'v-vampire', tier: 4, name: 'Eternal Night', text: 'Every monster: +1 to hit.', fx: { mod: { units: 'all', hit: 1 } } },
    // --- the Death Knight
    stables: { tree: 'v-deathknight', tier: 0, lair: true },
    discipline: { tree: 'v-deathknight', tier: 0, ranks: 2, name: 'Iron Discipline', text: 'Levelling up a band costs 20% less.', fx: { bandCost: 0.2 } },
    lances: { tree: 'v-deathknight', tier: 1, ranks: 2, name: 'Black Lances', text: 'Black riders: +1 to hit and +2 damage.', fx: { mod: { units: ['rider'], hit: 1, dmg: 2 } } },
    drill: { tree: 'v-deathknight', tier: 2, ranks: 2, name: 'Drilled Ranks', text: 'Skeletons and black riders: +1 AC and +10% hit points.', fx: { mod: { units: ['skeleton', 'rider'], ac: 1, hp: 0.1 } } },
    veterans: { tree: 'v-deathknight', tier: 3, name: 'Veterans', text: 'Bands march out of your lairs a level higher.', fx: { vets: 1 } },
    oath: { tree: 'v-deathknight', tier: 4, name: 'Lord of the Damned', text: 'In the finale the Death Knight has +10% hit points and +2 to hit.', fx: { villain: { hp: 0.1, hit: 2 } } }
  };
  const TALENT_ORDER = Object.keys(TALENTS);
  const INFAMY_STEP = 6;     // Infamy for a bonus talent point
  const RESEARCH = {
    den: { branch: 'lairs', lair: 'den', cost: 4, days: 2 },
    barrow: { branch: 'lairs', lair: 'barrow', cost: 4, days: 2 },
    fens: { branch: 'lairs', lair: 'fens', cost: 6, days: 3 },
    hold: { branch: 'lairs', lair: 'hold', cost: 6, days: 3 },
    keep: { branch: 'lairs', lair: 'keep', cost: 10, days: 3 },
    mire: { branch: 'lairs', lair: 'mire', cost: 10, days: 4 },
    roost: { branch: 'lairs', lair: 'roost', cost: 12, days: 4 },
    abyss: { branch: 'lairs', lair: 'abyss', cost: 16, days: 5 },
    vigor: { branch: 'powers', power: 'vigor', cost: 3, days: 2, ranks: 3, needs: [] },
    raise: { branch: 'powers', power: 'raise', cost: 5, days: 3, needs: ['bonecrypt'] },
    dread: { branch: 'powers', power: 'dread', cost: 4, days: 2, needs: ['barrow'] },
    ritual: { branch: 'powers', power: 'ritual', cost: 5, days: 3, needs: ['keep'] },
    swift: { branch: 'servants', name: 'Swift Summoning', cost: 4, days: 2, needs: [], text: 'Summoning a new minion takes 1 night instead of 2.' },
    masons: { branch: 'servants', name: 'Master Masons', cost: 5, days: 2, needs: [], text: 'Every lair needs a day less work to build (never less than one).' },
    hands: { branch: 'servants', name: 'Tireless Hands', cost: 6, days: 3, needs: ['masons'], text: '+1 gold, lumber or ore every night from each mine and camp your minions work.' }
  };
  const RESEARCH_ORDER = Object.keys(RESEARCH);
  const MAX_RESEARCH = 3;
  const LOOT = { tense: 0.55, harrowing: 0.8 };
  const LAIR_UP = { growth: 1.5, cap: [0, 2, 3] };
  const lairUpCost = k => Math.ceil(DUNGEONS[k].cost * 0.6);
  const MAX_STACKS = 18, MAX_CONJURED = 24;
  // the DM's citadel at the Dark Tower: one building a day, each unlocks monsters, lairs, traps or dark powers
  const TECH = {
    throne: { tier: 0, row: 1.5, name: 'Throne of Shadows', cost: 0, req: [], gives: 'Goblins, wolves, hidden pits and the Goblin Warren.', text: 'The seat of your power at the Dark Tower.' },
    barracks: { tier: 1, row: 0, name: 'Orc Barracks', cost: 5, req: ['throne'], gives: 'Orc archers and the Orc War Camp.', text: 'Drill yards and war drums.' },
    ossuary: { tier: 1, row: 1, name: 'Ossuary', cost: 5, req: ['throne'], gives: 'Skeletons, the Bone Crypt, and your villain\'s Call Servants.', text: 'Bones stacked to the rafters, waiting for a voice.' },
    forge: { tier: 1, row: 2, name: 'Trap Forge', cost: 3, req: ['throne'], gives: 'Fire runes and snares, and Trapped Halls for the finale.', text: 'Springs, spikes and runes of burning.' },
    library: { tier: 1, row: 3, name: 'Forbidden Library', cost: 6, req: ['throne'], gives: '+1 Lore every day.', text: 'Books nobody should read. You read them all.', lore: 1 },
    ogre: { tier: 2, row: 0, name: 'Ogre Pits', cost: 8, req: ['barracks'], gives: 'Ogres and the Ogre Den.', text: 'Fighting pits where brutes are fattened for war.' },
    altar: { tier: 2, row: 1, name: 'Shadow Altar', cost: 8, req: ['ossuary'], gives: 'Wraiths, the Haunted Barrow, and your villain\'s Dread Aura.', text: 'Black stone that drinks the light.' },
    spire: { tier: 2, row: 3, name: 'Scrying Spire', cost: 7, req: ['library'], gives: '+1 more Lore a day, and rumors cost nothing.', text: 'A glass eye that watches the tavern in Millbrook.', lore: 1 },
    troll: { tier: 3, row: 0, name: 'Troll Fens', cost: 11, req: ['ogre'], gives: 'Trolls and the Troll Bog.', text: 'A drowned garden where trolls breed.' },
    giant: { tier: 3, row: 1, name: "Giants' Hall", cost: 12, req: ['ogre'], gives: 'Hill giants and the Giant\'s Hold.', text: 'A hall with doors forty feet high.' },
    knights: { tier: 3, row: 2, name: 'Hollow Chapel', cost: 10, req: ['altar', 'forge'], gives: 'Hollow Knights for your villain\'s army, and the Dark Ritual.', text: 'Empty armor kneels here, and waits for orders.' },
    roost: { tier: 4, row: 1, name: 'Dragon Roost', cost: 18, req: ['giant', 'altar'], gives: 'Young dragons and the Dragon Roost lair.', text: 'A crown of black rock where dragons nest.' },
    mire: { tier: 4, row: 0, name: 'Hydra Mire', cost: 16, req: ['troll'], gives: 'Hydras and the Hydra Mire lair.', text: 'A sunken garden where the heads grow back.' },
    blood: { tier: 4, row: 2, name: 'Blood Keep', cost: 16, req: ['knights'], gives: 'Vampires and the Vampire Manor lair.', text: 'Velvet, candles, and a cellar nobody comes back from.' },
    gate: { tier: 5, row: 1.5, name: 'Abyssal Gate', cost: 26, req: ['roost', 'blood'], gives: 'Pit demons and the Demon Pit lair. The strongest monsters there are.', text: 'A ring of black iron that opens onto somewhere worse.' }
  };
  const TECH_ORDER = ['throne', 'barracks', 'ossuary', 'forge', 'library', 'ogre', 'altar', 'spire', 'troll', 'giant', 'knights', 'mire', 'roost', 'blood', 'gate'];
  const CREATURE_TECH = { goblin: 'throne', wolf: 'throne', bandit: 'throne', orc: 'barracks', skeleton: 'ossuary', ogre: 'ogre', wraith: 'altar', troll: 'troll', giant: 'giant', dragon: 'roost', knight: 'knights', hydra: 'mire', vampire: 'blood', demon: 'gate' };
  const TRAP_TECH = { pit: 'throne', rune: 'forge', snare: 'forge' };
  const POWER_TECH = { vigor: 'throne', traps: 'forge', raise: 'ossuary', dread: 'altar', ritual: 'blood' };

  /* ================= your tower: buildings that raise monsters every day ================= */
  // each building raises one kind of monster into your garrison every night (grow = per day at party level 1),
  // or makes Lore; expanding it once raises 75% more. Keys match the old citadel so the finale guards still work.
  const BUILDINGS = {
    warren: { name: 'Goblin Warren', unit: 'goblin', grow: 2.4, cost: 0, up: 6, req: [], text: 'A burrow under the tower. Goblins breed here faster than you can count them.' },
    kennels: { name: 'Wolf Kennels', unit: 'wolf', grow: 1.2, cost: 6, up: 6, req: [], text: 'Iron cages and gnawed bones. Fast hunters that reach the back line first.' },
    hideout: { name: "Bandits' Hideout", unit: 'bandit', grow: 1.2, cost: 7, up: 6, req: [], text: 'Cutthroats who will work for a cut. Crossbows first, then cudgels.' },
    ossuary: { name: 'Ossuary', unit: 'skeleton', grow: 1.8, cost: 8, up: 7, req: [], text: 'Bones stacked to the rafters. Skeletons are slow, cheap and never afraid.' },
    barracks: { name: 'Orc Barracks', unit: 'orc', grow: 0.9, cost: 9, up: 8, req: [], text: 'Drill yards and war drums. Orc archers shoot from across the field.' },
    library: { name: 'Forbidden Library', lore: 2, cost: 10, up: 12, req: [], text: 'Books nobody should read. +2 Lore every day, +2 more when expanded.' },
    ogre: { name: 'Ogre Pits', unit: 'ogre', grow: 0.3, cost: 18, up: 12, req: ['barracks'], text: 'Fighting pits where brutes are fattened for war.' },
    altar: { name: 'Shadow Altar', unit: 'wraith', grow: 0.3, cost: 18, up: 12, req: ['ossuary'], text: 'Black stone that drinks the light. Wraiths fly and drain life. Gives your villain the Dread Aura.' },
    troll: { name: 'Troll Fens', unit: 'troll', grow: 0.24, cost: 26, up: 16, req: ['ogre'], text: 'A drowned garden. Trolls are fast and their wounds close every turn.' },
    giant: { name: "Giants' Hall", unit: 'giant', grow: 0.15, cost: 28, up: 17, req: ['ogre'], text: 'A hall with doors forty feet high. Hill giants hurl boulders.' },
    blood: { name: 'Blood Keep', unit: 'vampire', grow: 0.18, cost: 34, up: 22, req: ['altar'], text: 'Velvet, candles, and a cellar nobody comes back from. Vampires strike twice. Gives your villain the Dark Ritual.' },
    mire: { name: 'Hydra Mire', unit: 'hydra', grow: 0.09, cost: 38, up: 24, req: ['troll'], text: 'A sunken garden where the heads grow back.' },
    roost: { name: 'Dragon Roost', unit: 'dragon', grow: 0.09, cost: 42, up: 26, req: ['giant', 'altar'], text: 'A crown of black rock where young dragons nest.' },
    gate: { name: 'Abyssal Gate', unit: 'demon', grow: 0.06, cost: 52, up: 32, req: ['roost', 'blood'], text: 'A ring of black iron that opens onto somewhere worse. Pit demons, the strongest monsters there are.' }
  };
  const BUILD_ORDER = ['warren', 'kennels', 'hideout', 'ossuary', 'barracks', 'library', 'ogre', 'altar', 'troll', 'giant', 'blood', 'mire', 'roost', 'gate'];
  const UNIT_BUILDING = {}; for (const k of BUILD_ORDER) if (BUILDINGS[k].unit) UNIT_BUILDING[BUILDINGS[k].unit] = k;
  const MAX_ATTACK_STACKS = 7, GARRISON_DAYS = 4;
  const ITEMS = {
    chest: { cat: 'treasure', name: 'Treasure Chest', cost: 1, drives: ['greed'], text: 'Gold for the greedy and experience for everyone.' },
    artifact: { cat: 'treasure', name: 'Artifact', cost: 4, drives: ['greed'], text: 'A magic item that makes one hero permanently stronger.' },
    shrine: { cat: 'place', name: 'Healing Shrine', cost: 3, drives: ['duty'], text: 'Heals the party by half and restores spells.' },
    refugees: { cat: 'place', name: 'Refugee Camp', cost: 2, drives: ['duty'], text: 'People who need help. Heroes driven by duty live for this.' },
    omen: { cat: 'place', name: 'Omen Stone', cost: 2, drives: ['curiosity', 'duty'], text: 'Foreshadows your villain. Each omen adds +5 thrill to the finale (up to three).' },
    stranger: { cat: 'encounter', name: 'Hooded Stranger', cost: 2, drives: ['curiosity', 'duty'], text: 'A social encounter. You decide who the stranger really is; the party has to talk their way through.' },
    pass: { cat: 'encounter', name: 'Rope Bridge', cost: 2, drives: ['glory'], text: 'A skill challenge: three checks to cross a gorge. You set how deadly it is.' },
    captive: { cat: 'encounter', name: 'Wounded Captive', cost: 2, drives: ['duty'], text: 'A moral dilemma. The players argue over mercy; you decide the truth behind it.' },
    riddle: { cat: 'encounter', name: 'Riddle Stone', cost: 2, drives: ['curiosity'], text: 'A puzzle. You pick how hard the riddle is; failure stings.' },
    tourney: { cat: 'encounter', name: 'Tournament', cost: 3, drives: ['glory'], town: true, text: 'Announce a tournament in Millbrook. The party\'s champion jousts against a challenger you pick.' },
    pit: { cat: 'trap', name: 'Hidden Pit', cost: 2, dc: 13, drives: [], text: 'One hero falls in: 2d6 + 2 per week, save for half. A rogue may spot it.' },
    rune: { cat: 'trap', name: 'Fire Rune', cost: 3, dc: 15, drives: [], text: 'Explodes under the whole party: 2d6 + 2 per week each, save for half.' },
    snare: { cat: 'trap', name: 'Snare', cost: 2, dc: 14, drives: [], text: 'Hurts one hero and stops the party for the rest of the day.' }
  };
  // magic items in three tiers; the treasure you place matches how famous the party has become
  const ARTIFACTS = [
    { id: 'blade', tier: 1, name: 'Ember Blade', text: '+1 to hit, +2 damage', for: ['barbarian', 'rogue'], gear: { att: 1, dmg: 2 } },
    { id: 'mail', tier: 1, name: 'Wardstone Mail', text: '+2 AC', for: ['barbarian', 'cleric', 'rogue'], gear: { def: 2 } },
    { id: 'ring', tier: 1, name: 'Ring of the Archmage', text: '+10 mana', for: ['wizard', 'cleric'], gear: { mana: 10 } },
    { id: 'amulet', tier: 1, name: 'Amulet of Vigor', text: '+15 max HP', for: ['wizard', 'rogue', 'cleric', 'barbarian'], gear: { hp: 15 } },
    { id: 'crown', tier: 1, name: 'Crown of Old Kings', text: '+1 to hit for the whole party', party: true },
    { id: 'boots', tier: 1, name: 'Boots of the Long Road', text: '+20% movement for the party', party: true },
    { id: 'flametongue', tier: 2, name: 'Flametongue', text: '+2 to hit, +5 damage', for: ['barbarian', 'rogue', 'cleric'], gear: { att: 2, dmg: 5 } },
    { id: 'mithral', tier: 2, name: 'Mithral Plate', text: '+3 AC', for: ['barbarian', 'cleric', 'rogue'], gear: { def: 3 } },
    { id: 'staff', tier: 2, name: 'Staff of Power', text: '+25 mana, +2 AC', for: ['wizard', 'cleric'], gear: { mana: 25, def: 2 } },
    { id: 'periapt', tier: 2, name: 'Periapt of Health', text: '+40 max HP', for: ['wizard', 'rogue', 'cleric', 'barbarian'], gear: { hp: 40 } },
    { id: 'cloak', tier: 2, name: 'Cloak of Protection', text: '+2 AC, +2 to saves', for: ['wizard', 'rogue', 'cleric'], gear: { def: 2, save: 2 } },
    { id: 'vorpal', tier: 3, name: 'Vorpal Sword', text: '+3 to hit, +8 damage', for: ['barbarian', 'rogue'], gear: { att: 3, dmg: 8 } },
    { id: 'invuln', tier: 3, name: 'Armor of Invulnerability', text: '+4 AC, +30 max HP', for: ['barbarian', 'cleric'], gear: { def: 4, hp: 30 } },
    { id: 'avenger', tier: 3, name: 'Holy Avenger', text: '+3 to hit, +6 damage, +3 to saves', for: ['cleric', 'barbarian'], gear: { att: 3, dmg: 6, save: 3 } },
    { id: 'robe', tier: 3, name: 'Robe of the Archmagi', text: '+40 mana, +3 AC, +3 to saves', for: ['wizard'], gear: { mana: 40, def: 3, save: 3 } },
    { id: 'regen', tier: 3, name: 'Ring of Regeneration', text: '+70 max HP', for: ['wizard', 'rogue', 'cleric', 'barbarian'], gear: { hp: 70 } }
  ];
  const artTier = s => avgLevel(s) >= 14 ? 3 : avgLevel(s) >= 7 ? 2 : 1;
  const DM_SPELLS = {
    // 0.19: spells that help the heroes are paid from Millbrook's purse, the one that helps your monsters from the tower's
    pull: { name: 'Pull Punches', cost: 6, purse: 'town', rail: 12, mood: 4, text: 'Your monsters deal half damage for the rest of this round.' },
    lucky: { name: 'Lucky Break', cost: 10, purse: 'town', rail: 18, mood: 6, text: 'A fallen hero gets back up with a quarter of their HP.' },
    reinforce: { name: 'Reinforcements', cost: 10, purse: 'tower', rail: 0, mood: 0, text: 'A fresh stack joins the fight on your side. More danger, more XP. Once a fight.' },
    retreat: { name: 'Sound the Retreat', cost: 0, purse: 'tower', rail: 8, mood: 3, text: 'Your monsters flee and the battle ends. Survivors go back to your garrison. Feels like an anticlimax.' },
    deus: { name: 'Deus ex Machina', cost: 25, purse: 'town', rail: 30, mood: 10, text: 'Only when every hero has fallen: Millbrook\'s priests pray, and a stranger saves them.' }
  };
  const LAIR = {
    vigor: { name: 'Dark Vigor', cost: 3, max: 3, text: '+10% HP for your villain, each time.' },
    dread: { name: 'Dread Aura', cost: 4, max: 1, text: 'Heroes attack with disadvantage in the first round of any battle with your villain.' },
    raise: { name: 'Call Servants', cost: 5, max: 1, text: 'Once per battle, when wounded, your villain calls a stack of servants. Villains who already can call 50% more.' },
    traps: { name: 'Trapped Halls', cost: 2, max: 3, text: '+1 free hidden spike trap in the final battle at the Dark Tower.' },
    ritual: { name: 'Dark Ritual', cost: 5, max: 1, text: '+10% HP and +1 to hit. Beating your villain after the ritual is worth +6 thrill.' }
  };
  const WEEKS_FX = {
    party: { name: 'Week of the Party', text: 'A new adventure begins. Nothing unusual this week.' },
    goblin: { name: 'Week of the Goblin', text: 'Goblins everywhere. Your Goblin Warren raises half again as many this week.', creature: 'goblin' },
    wolf: { name: 'Week of the Wolf', text: 'The wolves gather. Your Wolf Kennels raise half again as many this week.', creature: 'wolf' },
    skeleton: { name: 'Week of Bones', text: 'The dead stir. Your Ossuary raises half again as many skeletons this week.', creature: 'skeleton' },
    orc: { name: 'Week of the War Drum', text: 'The drums never stop. Your Orc Barracks train half again as many archers this week.', creature: 'orc' },
    moon: { name: 'Week of the Blood Moon', text: 'A red moon hangs over the tower. Every building raises a quarter more monsters this week.', allBoost: 1.25 },
    harvest: { name: 'Week of the Harvest', text: 'The land is generous. The party heals 30% each night instead of 15%.' },
    fog: { name: 'Week of Fog', text: 'Thick fog. The party sees one tile less, so you can place things closer.' },
    omens: { name: 'Week of Omens', text: 'Omen Stones cost 1 Lore this week.' },
    storms: { name: 'Week of Storms', text: 'Mud and rain. The party moves 20% slower.' },
    king: { name: 'The Final March', text: 'The party marches on the Dark Tower. Send what you like at them on the road, then give them a finale to remember.' }
  };

  /* ================= state ================= */
  const dayKey = s => s.week * 10 + s.day;
  function newGame(seed, opts) {
    seed = seed || (1 + Math.floor(Math.random() * 1e9)); opts = opts || {};
    let ids = (opts.party || DEFAULT_PARTY).filter((id, i, a) => ROSTER_BY[id] && a.indexOf(id) === i).slice(0, 4);
    for (const id of DEFAULT_PARTY.concat(ROSTER.map(r => r.id))) if (ids.length < 4 && ids.indexOf(id) < 0) ids.push(id);
    const vil = cleanVillain(opts.villain);
    const layout = opts.layout === 'classic' ? 'classic' : 'random'; // classic: the original fixed map (for comparisons)
    const L0 = { seed, layout }; const town = siteOf(L0, 'town'), tower = siteOf(L0, 'tower');
    const s = {
      v: 15, layout, seed, week: 1, day: 1, name: String(opts.name || '').replace(/[<>]/g, '').trim().slice(0, 48) || `The Fall of ${vil.name}`, created: Date.now(), lore: 18, engagement: 60, railroad: 0, phase: 'map', result: null,
      citadel: { built: { throne: 1 }, day: 0 }, base: { library: 0, libBuild: null }, summons: [], talents: newTalents(), town: newTown(), res: { gold: 20, lumber: 12, ore: 6 }, nodes: [], minions: [], unlocked: {}, attackDay: 0, seen: {}, march: null, finaleTries: 0,
      heroes: ids.map(id => heroFrom(ROSTER_BY[id], 1)), rosterUsed: ids.slice(),
      party: { x: town.x, y: town.y, prev: { x: town.x, y: town.y }, mp: MP_PER_DAY, path: [], target: null, intent: [] },
      objects: [], uid: 1, explored: new Array(MW * MH).fill(0), visited: {}, weekFx: 'party', omens: 0, crown: false, boots: false,
      wk: newWeekLog(), todayActive: false, battle: null, enc: null, recap: null, log: [], history: [], deaths: 0, totalThrill: 0, pendingLevelUps: [], lastBattle: null,
      quests: [], townEvent: null,
      villain: { type: vil.type, name: vil.name, title: vil.title, pron: vil.pron, state: 'lair', x: tower.x, y: tower.y, mp: VILLAIN_MP, banish: 0, army: [], up: { vigor: 0, dread: 0, raise: 0, traps: 0, ritual: 0 }, known: false, glimpsed: 0, movedDay: 0 }
    };
    s.nodes = genNodes(s);
    for (let i = 0; i < STARTING_MINIONS; i++) spawnMinion(s);
    startingLair(s);
    const w0 = myLairs(s)[0]; if (w0) releaseBand(s, w0, 8);
    reveal(s);
    s.dmSeen = new Array(MW * MH).fill(0); dmReveal(s);
    if (opts.wilds !== false) populateWilds(s);
    planRoute(s);
    say(s, 'Day 1. Your players sit down with fresh character sheets. Their heroes set out from Millbrook.', 'sys');
    return s;
  }
  // a Goblin Warren already stands in the hills near Millbrook, so there's a war party to send on day one
  function startingLair(s) {
    const town = siteOf(s, 'town'); const r = mulberry((s.seed * 7 + 3) | 0); let best = null, bs = -Infinity;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const d = Math.hypot(x - town.x, y - town.y); if (d < 5.2 || d > 7) continue;
      if (spotCheck(s, x, y) || partyDist(s)[tIdx(x, y)] > 9) continue;
      const sc = (DUNGEONS.warren.home.indexOf(terrainAt(s, x, y)) >= 0 ? 2 : 0) + r();
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (!best) return;
    const o = { id: 'o' + (s.uid++), kind: 'dungeon', dtype: 'warren', mine: true, pool: { goblin: 14 }, level: 1, mode: 'hold', x: best[0], y: best[1], known: false, rumored: false, paid: 0, placed: dayKey(s), movedDay: 0, building: 0 };
    s.objects.push(o); s.unlocked.warren = true;
  }
  const newTalents = () => ({ r: {}, earned: 1, lv: 1, inf: 0, resetWeek: 0 });
  // bring an older save up to date (v5 had a fixed party and Malgrith the lich)
  // v11 (0.14): every campaign has its own map layout. Older saves keep the classic one they were played on.
  function migrate(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.heroes)) return null;
    if (s.v === 15) return s;
    if (s.v === 14) return toV15(s);
    if (s.v === 13) return toV15(toV14(s));
    if (s.v === 12) return toV15(toV14(toV13(s)));
    if (s.v === 11) return toV15(toV14(toV13(toV12(s))));
    if (!s.layout) s.layout = 'classic'; // before anything below looks up where the tower is
    const out = migrateTo10(s);
    return out ? toV15(toV14(toV13(toV12(out)))) : null;
  }
  // v15 (0.24): research becomes talents. Everything researched stays learned, research waiting in line is refunded,
  // and the villain has as many points as a party of this level would have earned
  function toV15(s) {
    const done = (s.research && s.research.done) || {}; const r = {};
    for (const k of Object.keys(done)) if (TALENTS[k] && done[k] > 0) r[k] = Math.min(talentRanks(k), done[k]);
    for (const q of (s.research && s.research.queue) || []) if (q.cost && typeof q.cost === 'object') for (const c of Object.keys(q.cost)) s.res[c] = (s.res[c] || 0) + q.cost[c];
    const L = Math.max(1, avgLevel(s)); const spent = Object.keys(r).reduce((t, k) => t + r[k], 0);
    s.talents = { r, earned: Math.max(spent, L), lv: L, inf: 0, resetWeek: 0 };
    delete s.research; syncTalents(s);
    s.v = 15; return s;
  }
  // v14 (0.19): no more Lore; Millbrook gets its own purse and buildings. Research waiting in line is dropped (it was paid in Lore)
  function toV14(s) {
    s.town = s.town || newTown(); if (s.research) s.research.queue = [];
    for (const m of s.minions || []) if (m.job && m.job.kind === 'plot') m.job = null;
    s.v = 14; return s;
  }
  // v13 (0.16): research. Whatever you could build or had bought before counts as researched
  function toV13(s) {
    const done = {};
    for (const k of RESEARCH_ORDER) { const R = RESEARCH[k]; if (R.lair && (unlocked(s, R.lair) || DUNGEONS[R.lair].needs.every(r => unlocked(s, r)))) done[k] = 1; if (R.power && s.villain && s.villain.up && s.villain.up[R.power]) done[k] = s.villain.up[R.power]; }
    s.research = { done, queue: [] }; s.v = 13; return s;
  }
  // v12 (0.15): summoning queue, Library construction, each lair under construction knows its full build time
  function toV12(s) {
    s.summons = s.summons || []; s.base = s.base || { library: 0 };
    for (const o of s.objects || []) if (o.kind === 'dungeon' && o.mine && o.building && !o.buildTotal) o.buildTotal = Math.max(o.building, BUILD_DAYS[(DUNGEONS[o.dtype] || {}).tier] || o.building);
    s.v = 12; return s;
  }
  function migrateTo10(s) {
    if (s.v === 10) return s;
    if (s.v === 9) return toV10(s);
    if (s.v === 8) return toV10(toV9(s));
    if (s.v === 7) return toV10(toV9(toV8(s)));
    if (s.v === 6) return toV10(toV9(toV8(toV7(s))));
    if (s.v !== 5) return null;
    const legacy = { barbarian: 'brakka', rogue: 'vex', cleric: 'ione', wizard: 'orrin' };
    for (const h of s.heroes) {
      const r = ROSTER_BY[legacy[h.cls]];
      if (!h.race) h.race = r && h.name === r.name ? r.race : 'human';
      if (!h.look) h.look = r ? r.look : null;
      if (!h.rid) h.rid = r && h.name === r.name ? r.id : h.id;
    }
    s.rosterUsed = s.heroes.map(h => h.rid);
    Object.assign(s.villain, { type: 'lich', name: 'Malgrith', title: 'the Hollow King', pron: 'he' });
    s.name = s.name || 'The Fall of Malgrith'; s.created = s.created || Date.now();
    if (s.battle) {
      const b = s.battle; b.vname = 'Malgrith'; b.vpron = 'he'; b.vtitle = 'the Hollow King';
      for (const u of b.units) {
        if (u.side === 'party') { u.icon = 'hero-' + u.hero; const h = s.heroes.find(x => x.id === u.hero); u.race = h ? h.race : 'human'; if (u.relentMax === undefined) u.relentMax = u.ab.indexOf('relentless') >= 0 ? (u.ab.indexOf('undying') >= 0 ? 2 : 1) : 0; }
        if (u.boss && !u.P) { const nb = bossUnit(u.level, s.villain.up, u.level >= BOSS_LEVEL, 'lich', 'Malgrith'); for (const k of ['btype', 'icon', 'P', 'cd', 'used', 'aoe', 'aoeDC', 'servants', 'servantsBoost', 'images', 'phyl', 'final']) if (u[k] === undefined) u[k] = nb[k]; }
      }
    }
    s.v = 6;
    return toV10(toV9(toV8(toV7(s))));
  }
  // v6 had lairs on the map, quests and a research tree; v7 keeps the heroes and the world and gives you a tower
  function toV7(s) {
    const built = (s.citadel && s.citadel.built) || {};
    const b = { warren: 1 };
    for (const k of Object.keys(built)) if (BUILDINGS[k]) b[k] = 1;
    if (built.forge || built.spire) b.library = 1;
    const garrison = { goblin: 14 };
    const keep = [];
    for (const o of s.objects || []) {
      if (o.wild) { keep.push(o); continue; }
      if (o.kind === 'stack' && CREATURES[o.type] && !CREATURES[o.type].hidden) garrison[o.type] = (garrison[o.type] || 0) + o.count;
      if (o.kind === 'dungeon') for (const t of Object.keys(o.pool || {})) garrison[t] = (garrison[t] || 0) + Math.floor(o.pool[t]);
    }
    s.objects = keep;
    s.base = { b, garrison };
    s.attackDay = 0;
    for (const q of s.quests || []) if (q.status === 'open') q.status = 'void';
    s.railroad = 0;
    if (s.villain && s.villain.state === 'map') { s.villain.state = 'lair'; s.villain.known = false; }
    if (s.phase === 'map') planRoute(s);
    s.v = 7;
    return s;
  }
  // v7 had a tower town screen; v8 puts lairs on the map. Each tower building becomes a lair near the tower, with its share of the garrison
  function toV8(s) {
    const map = { warren: 'warren', kennels: 'kennel', hideout: 'hideout', ossuary: 'bonecrypt', barracks: 'camp', ogre: 'den', altar: 'barrow', troll: 'fens', giant: 'hold', blood: 'keep', mire: 'mire', roost: 'roost', gate: 'abyss' };
    const old = s.base || { b: {}, garrison: {} };
    s.base = { library: old.b && old.b.library ? old.b.library : 0 };
    s.res = { gold: 30, lumber: 16, ore: 10 }; s.nodes = []; s.minions = []; s.unlocked = {};
    s.nodes = genNodes(s);
    for (let i = 0; i < STARTING_MINIONS; i++) spawnMinion(s);
    const tw = siteOf(s, 'tower');
    for (const k of Object.keys(old.b || {})) {
      const dt = map[k]; if (!dt) continue;
      let spot = null;
      for (let r = 2; r <= 8 && !spot; r++) for (let a = 0; a < 16 && !spot; a++) { const x = Math.round(tw.x + Math.cos(a * 0.39) * r), y = Math.round(tw.y + Math.sin(a * 0.39) * r); if (!spotCheck(s, x, y)) spot = [x, y]; }
      if (!spot) continue;
      const u = DUNGEONS[dt].unit;
      const o = { id: 'o' + (s.uid++), kind: 'dungeon', dtype: dt, mine: true, pool: { [u]: Math.floor((old.garrison || {})[u] || 0) }, level: old.b[k] >= 2 ? 2 : 1, mode: 'hold', x: spot[0], y: spot[1], known: false, rumored: false, paid: 0, placed: dayKey(s), movedDay: 0, building: 0 };
      s.objects.push(o); s.unlocked[dt] = true;
    }
    if (!myLairs(s).length) startingLair(s);
    s.v = 8;
    return s;
  }
  // v8 sites took up to three minions and needed no work to open; v9: one minion each, and a site that was being worked is already a mine
  function toV9(s) {
    for (const n of s.nodes || []) {
      const list = (s.minions || []).filter(m => m.job && m.job.kind === 'work' && m.job.node === n.id).sort((a, b) => (a.path.length - b.path.length));
      n.dev = list.length > 0;
      for (const m of list.slice(1)) { m.job = null; m.path = []; }
    }
    for (const m of s.minions || []) m.trip = m.path.length;
    s.v = 9;
    return s;
  }
  // v10: war parties are gone, so lairs send their broods out as bands; the DM gets a fog of war (seeded from what the heroes explored)
  function toV10(s) {
    s.dmSeen = (s.explored || []).map(v => v ? 1 : 0); while (s.dmSeen.length < MW * MH) s.dmSeen.push(0);
    dmReveal(s);
    s.v = 10;
    return s;
  }
  /* ================= the wilds: monsters and finds the world makes on its own ================= */
  // low-level wanderers the DM didn't have to pay for: the party always has something to do early on
  const WILD_TYPES = ['goblin', 'wolf', 'bandit'];
  const WILD_FINDS = ['chest', 'chest', 'chest', 'shrine', 'refugees', 'omen', 'stranger', 'riddle', 'captive', 'pass', 'pit', 'snare'];
  function wildSpot(s, r, minTown, minGap) {
    const M = mapOf(s); const town = siteOf(s, 'town'), tw = siteOf(s, 'tower');
    for (let g = 0; g < 400; g++) {
      const x = Math.floor(r() * MW), y = Math.floor(r() * MH);
      if (!isFinite(tileCost(s, x, y)) || !M.reach[tIdx(x, y)]) continue;
      if (objAt(s, x, y) || siteAt(s, x, y) || (s.party.x === x && s.party.y === y) || nodeAt(s, x, y)) continue;
      if (villainOnMap(s) && s.villain.x === x && s.villain.y === y) continue;
      if (s.objects.some(o => o.mine && Math.hypot(o.x - x, o.y - y) < 2.5)) continue;
      if (Math.hypot(x - town.x, y - town.y) < minTown || Math.hypot(x - tw.x, y - tw.y) < 4) continue;
      if (inSight(s, x, y)) continue;
      if (sitesOf(s).some(z => Math.hypot(z.x - x, z.y - y) < 1.5)) continue;
      if (s.objects.some(o => Math.hypot(o.x - x, o.y - y) < minGap)) continue;
      return [x, y];
    }
    return null;
  }
  function addWild(s, o, x, y) {
    Object.assign(o, { id: 'o' + (s.uid++), x, y, known: false, rumored: false, paid: 0, placed: dayKey(s), movedDay: 0, wild: true });
    if (o.kind === 'artifact') o.art = pickArtifact(s, s.objects.filter(z => z.art).map(z => z.art)).id;
    s.objects.push(o); return o;
  }
  // a band sized so the party finds it a fair fight (ratio is party power over band power)
  function wildBand(s, type, ratio) {
    const cap = { goblin: 40, wolf: 26, bandit: 26 }[type] || 30;
    return Math.max(2, Math.min(cap, Math.round(partyPower(s) / ratio / stackPower(type, 1))));
  }
  function populateWilds(s) {
    const r = mulberry((s.seed * 31 + 7) | 0);
    const ratios = [3.2, 2.6, 2.4, 2.2, 2, 2, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4];
    ratios.forEach((q, i) => {
      const type = WILD_TYPES[i % 3]; const far = 6 + Math.round((3.2 - q) * 6);
      const at = wildSpot(s, r, far, 3) || wildSpot(s, r, 5, 2); if (!at) return;
      addWild(s, { kind: 'stack', type, count: wildBand(s, type, q), size: 1 }, at[0], at[1]);
    });
    const town = siteOf(s, 'town'); const near = s.objects.filter(o => o.wild && o.kind === 'stack').sort((a, b) => Math.hypot(a.x - town.x, a.y - town.y) - Math.hypot(b.x - town.x, b.y - town.y)).slice(0, 3);
    for (const o of near) { o.known = true; o.rumored = true; }
    for (const k of ['chest', 'chest', 'artifact', 'shrine', 'omen', 'stranger', 'riddle', 'captive', 'pit']) { const at = wildSpot(s, r, 4, 2); if (at) addWild(s, { kind: k }, at[0], at[1]); }
  }
  // each new week a few fresh bands wander in while the heroes are still low level, and a find or two turns up
  function weeklyWilds(s) {
    if (s.march) return [];
    const r = mulberry((s.seed * 17 + s.week * 101) | 0); const out = [];
    const wildStacks = s.objects.filter(o => o.kind === 'stack' && o.wild).length;
    const L = avgLevel(s);
    // the wilds keep up with the heroes: tougher kinds of monster wander in as they grow
    const pool = L < 4 ? ['goblin', 'wolf', 'bandit'] : L < 8 ? ['wolf', 'bandit', 'orc', 'skeleton', 'ogre'] : L < 12 ? ['ogre', 'wraith', 'troll', 'orc'] : L < 16 ? ['troll', 'giant', 'wraith', 'vampire'] : ['giant', 'vampire', 'hydra', 'dragon'];
    const n = Math.max(0, Math.min(3, 8 - wildStacks));
    for (let i = 0; i < n; i++) {
      const type = pool[Math.floor(r() * pool.length)]; const q = 1.5 + r() * 0.9;
      const at = wildSpot(s, r, 5, 2); if (!at) continue;
      const count = Math.max(1, Math.min(60, Math.ceil(fightRatio(s, { type, count: 1, lvl: 1 }) / q)));
      const o = addWild(s, { kind: 'stack', type, count, size: 1 }, at[0], at[1]); o.known = true; o.rumored = true; out.push(`${CREATURES[type].name.toLowerCase()} near ${regionName(s, at[0], at[1])}`);
    }
    const finds = s.objects.filter(o => o.wild && o.kind !== 'stack').length;
    for (let i = 0; i < (finds < 6 ? 2 : finds < 9 ? 1 : 0); i++) {
      const k = WILD_FINDS[Math.floor(r() * WILD_FINDS.length)]; const at = wildSpot(s, r, 4, 2);
      if (at) addWild(s, { kind: k }, at[0], at[1]);
    }
    if (out.length) say(s, `Travellers in Millbrook warn of new trouble: ${out.join('; ')}.`, 'dm');
    return out;
  }
  const VILLAIN_MP = 90;
  function newWeekLog() { return { thrill: [], idle: 0, spot: {}, battles: 0 }; }
  function say(s, text, cls) { s.log.push({ w: s.week, d: s.day, t: text, c: cls || 'note' }); if (s.log.length > 160) s.log.splice(0, s.log.length - 160); }
  const living = s => s.heroes.filter(h => h.status === 'ok');
  const avgLevel = s => { let l = living(s); if (!l.length) l = s.heroes; return Math.round(sum(l, h => h.level) / l.length); };
  const partyHpFrac = s => { const l = living(s); return sum(l, h => h.hp) / Math.max(1, sum(l, h => h.maxHp)); };
  const sightRadius = s => (s.weekFx === 'fog' ? SIGHT - 1 : SIGHT) + (s.heroes && s.heroes.some(h => h.status === 'ok' && h.race === 'elf') ? 1 : 0);
  const mpPerDay = s => Math.round(MP_PER_DAY * (s.weekFx === 'storms' ? 0.8 : 1) * (s.boots ? 1.2 : 1));
  const villainOnMap = s => s.villain && s.villain.state === 'map';

  function reveal(s) {
    const P = s.party, R = sightRadius(s); const spotted = [];
    for (let y = Math.floor(P.y - R); y <= P.y + R; y++) for (let x = Math.floor(P.x - R); x <= P.x + R; x++) {
      if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      if (Math.hypot(x - P.x, y - P.y) <= R) s.explored[tIdx(x, y)] = 1;
    }
    for (const o of s.objects) {
      if (o.known || ITEMS[o.kind] && ITEMS[o.kind].cat === 'trap') continue;
      if (Math.hypot(o.x - P.x, o.y - P.y) <= R) { o.known = true; spotted.push(o); }
    }
    for (const n of s.nodes || []) if (!n.known && Math.hypot(n.x - P.x, n.y - P.y) <= R) n.known = true;
    const V = s.villain;
    if (villainOnMap(s) && Math.hypot(V.x - P.x, V.y - P.y) <= R) {
      if (!V.known) spotted.push({ kind: 'villain' });
      V.known = true;
      if (V.glimpsed !== s.week) { V.glimpsed = s.week; thrill(s, `The players glimpsed ${vName(s)} on the horizon`, 3); say(s, `The party spots ${vFull(s)}, riding with ${vP(s).his} army!`, 'boss'); }
    }
    return spotted;
  }
  const inSight = (s, x, y) => Math.hypot(x - s.party.x, y - s.party.y) <= sightRadius(s);
  const objAt = (s, x, y) => s.objects.find(o => o.x === x && o.y === y);
  const siteAt = (s, x, y) => sitesOf(s).find(S => S.x === x && S.y === y);
  const isTrap = o => ITEMS[o.kind] && ITEMS[o.kind].cat === 'trap';
  const isEnc = o => ITEMS[o.kind] && ITEMS[o.kind].cat === 'encounter';
  function stackGuarding(s, x, y) {
    return s.objects.find(o => o.kind === 'stack' && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && !(o.x === x && o.y === y));
  }
  const villainAdjacent = (s, x, y) => villainOnMap(s) && Math.abs(s.villain.x - x) <= 1 && Math.abs(s.villain.y - y) <= 1;

  /* ================= power estimates (the party's judgment) ================= */
  function stackStats(type, count) {
    const c = CREATURES[type];
    const dpr = count * avgDie(c.dice[0], c.dice[1], c.dice[2]) * (c.attacks || 1) * pHit(c.hit, 15) * (c.shooter || c.flyer ? 1.15 : 1) * (c.breath ? 1.7 : 1) * (c.pf || 1);
    const ehp = count * c.hp * (1 + 0.1 * (c.ac - 13)) * (c.regen ? 1.25 : 1) * (c.drain ? 1.35 : 1) * (c.pf || 1);
    return { dpr, ehp };
  }
  function bossStats(L, up, final, type) {
    const B = bossUnit(L, up || {}, final, type); const E = (BOSS_TYPES[type] || BOSS_TYPES.lich).est || {};
    return { dpr: B.attacks * avgDie(B.dice[0], B.dice[1], B.dice[2]) * pHit(B.hit, 15) * 1.3 * (E.dpr || 1), ehp: B.hp * (1 + 0.06 * (B.ac - 13)) * (E.ehp || 1) };
  }
  const forcePower = list => Math.sqrt(sum(list, x => x.dpr) * sum(list, x => x.ehp));
  const stackPower = (type, count) => forcePower([stackStats(type, count)]);
  function partyPower(s) {
    const f = partyFlags(s.heroes); let dpr = 0, ehp = 0;
    for (const h of living(s)) {
      const st = heroStats(h, f, s);
      const avg = avgDie(st.dice[0], st.dice[1], st.dice[2]) + sum(st.extra, e => avgDie(e.n, e.s, 0));
      dpr += avg * pHit(st.hit + (f.bless ? 2.5 : 0), 13) * (has(h, 'double') ? 1.9 : 1) + (h.maxMana ? 3 + 2.5 * h.level : 0);
      ehp += Math.max(1, h.hp) * (1 + 0.06 * (st.ac - 14));
    }
    return Math.sqrt(dpr * ehp) * POWER_K * (0.85 + 0.05 * avgLevel(s));
  }
  let POWER_K = 1.0;
  const setPowerK = k => { POWER_K = k; };
  function garrisonOf(o) {
    const D = DUNGEONS[o.dtype]; const out = [];
    if (o.mine) { const n = lairCount(o); return n >= 1 ? [[D.unit, n]] : []; }
    for (const t of Object.keys(D.grow)) { const n = Math.floor(o.pool[t] || 0); if (n >= 1) out.push([t, n]); }
    if (!out.length) { const t = Object.keys(D.grow)[0]; out.push([t, Math.max(1, Math.ceil(CREATURES[t].base / 2))]); }
    return out;
  }
  const garrisonPower = o => forcePower(garrisonOf(o).map(([t, n]) => stackStats(t, n)));
  // the villain rides the map as a projection a little above the party; on the throne it is level 20
  const mapBossLevel = s => Math.min(BOSS_LEVEL - 2, avgLevel(s) + 2);
  function villainPower(s) {
    const V = s.villain;
    return forcePower([bossStats(mapBossLevel(s), V.up, false, V.type)].concat(V.army.map(a => stackStats(a.type, a.count))));
  }
  // the honor guard that stands with the villain in the throne room when there is no army
  function honorGuard(s) { const cmd = vType(s).powers.indexOf('command') >= 0; const n = Math.max(2, Math.round(partyPower(s) / 9 / stackPower('knight', 1) * (cmd ? 1.4 : 1))); return ['knight', n]; }
  function throneStacks(s) { const V = s.villain; const st = V.army.map(a => [a.type, a.count]); if (!st.length) st.push(honorGuard(s)); return st; }
  function thronePower(s) { const cmd = vType(s).powers.indexOf('command') >= 0; return forcePower([bossStats(BOSS_LEVEL, s.villain.up, true, s.villain.type)].concat(throneStacks(s).map(([t, n]) => { const st = stackStats(t, n); if (cmd && t === 'knight') st.dpr *= 1.2; return st; }))); }
  // your citadel defends its gates with monsters from the highest buildings you've raised
  const GUARD_POSTS = [['gate', 'demon'], ['blood', 'vampire'], ['mire', 'hydra'], ['roost', 'dragon'], ['knights', 'knight'], ['giant', 'giant'], ['troll', 'troll'], ['altar', 'wraith'], ['ogre', 'ogre'], ['ossuary', 'skeleton'], ['barracks', 'orc'], ['throne', 'goblin']];
  function gateGuards(s) {
    const posts = GUARD_POSTS.filter(([k]) => hasTech(s, k)).slice(0, 3);
    if (posts.length < 2) posts.push(['throne', 'wolf']);
    const each = partyPower(s) / (2.4 * posts.length) * (1 + talentFx(s).guards);
    return posts.map(([, t]) => [t, Math.max(1, Math.round(each / stackPower(t, 1)))]);
  }
  const READY = 1.08;
  // how the showdown would go today: from level 10 the party plays it out in its head (a quick simulation,
  // remembered until something that matters changes), so healers, items and the villain's kind all count
  const ODDS_NEED = 0.55;
  function finaleOdds(s) {
    const V = s.villain;
    const key = [V.type, JSON.stringify(V.up), V.army.map(a => a.type + a.count).join(), Object.keys((s.base && s.base.b) || s.citadel.built).sort().join(), s.heroes.map(h => h.id + ':' + h.level + ':' + h.items.length).join(), s.crown ? 1 : 0].join('|');
    if (s.odds && s.odds.key === key) return s.odds;
    const r = simulateFinale(s, 10);
    s.odds = { key, win: r.win, gate: r.gateLoss };
    return s.odds;
  }
  function readiness(s) {
    const q = questOn(s, { kind: 'site', id: 'tower' });
    const ratio = partyPower(s) / thronePower(s);
    const L = avgLevel(s);
    if (L < 10) {
      const label = ratio < READY * 0.6 ? 'Hopeless' : 'Long odds';
      return { ratio, need: READY, win: null, label, ready: false };
    }
    const need = Math.max(0.3, ODDS_NEED - (q ? q.reward * 0.02 : 0));
    const win = finaleOdds(s).win;
    const label = win < 0.15 ? 'Hopeless' : win < need * 0.65 ? 'Long odds' : win < need ? 'Almost ready' : win < 0.9 ? 'Ready' : 'Overpowered';
    return { ratio, need, win, label, ready: win >= need };
  }
  // how the party feels about a fight, given the ratio of their power to the enemy's
  const JUDGE = { avoid: 1.2, worthy: 2.2, easy: 3.8 };
  function judge(ratio, reward) {
    const shift = (reward || 0) * 0.035;
    if (ratio < JUDGE.avoid - shift) return 'avoid';
    if (ratio < JUDGE.worthy) return 'worthy';
    if (ratio < JUDGE.easy) return 'beatable';
    return 'trivial';
  }

  /* ================= quests ================= */
  const MAX_QUESTS = 3;
  function refEq(a, b) { return a && b && a.kind === b.kind && a.id === b.id; }
  function questOn(s, ref) { return s.quests.find(q => q.status === 'open' && refEq(q.ref, ref)); }
  function refTarget(s, ref) {
    if (ref.kind === 'obj') return s.objects.find(o => o.id === ref.id) || null;
    if (ref.kind === 'site') return siteOf(s, ref.id) || null;
    if (ref.kind === 'villain') return villainOnMap(s) ? s.villain : null;
    return null;
  }
  function questName(s, ref) {
    const t = refTarget(s, ref); if (!t) return 'A lost cause';
    if (ref.kind === 'villain') return `Hunt down ${vName(s)}`;
    if (ref.kind === 'site') return t.kind === 'landmark' ? `Explore ${t.name}` : t.kind === 'tower' ? 'Storm the Dark Tower' : `Reach ${t.name}`;
    if (t.kind === 'stack') return `Slay the ${CREATURES[t.type].name}`;
    if (t.kind === 'dungeon') return `Destroy the ${DUNGEONS[t.dtype].name}`;
    return ({ chest: 'Recover the lost treasure', artifact: 'Recover a lost artifact', shrine: 'Find the hidden shrine', refugees: 'Aid the refugees', omen: 'Investigate the omen stone',
      stranger: 'Meet the hooded stranger', pass: 'Cross the rope bridge', captive: 'Find the wounded captive', riddle: 'Solve the riddle stone' })[t.kind] || 'Seek it out';
  }
  function questCheck(s, ref) {
    if (s.phase === 'over') return null;
    const q = questOn(s, ref);
    if (!q) return null;
    if (ref.kind === 'site' && ref.id === 'tower') return null;
    q.status = 'done';
    const xp = questXp(s, q.reward);
    giveXp(s, xp);
    const c = byDriveLive(s, 'duty');
    thrill(s, `Quest complete: ${q.name}`, 3 + Math.round(q.reward * 0.6), c && c.id);
    say(s, `Quest complete: ${q.name}! The reward is paid (+${xp} XP each).`, 'level');
    return q;
  }
  function postQuest(s, ref, reward) {
    reward = Math.round(reward);
    if (s.phase !== 'map') return 'Quests are posted between days.';
    if (ref.kind === 'site' && ref.id === 'tower' && avgLevel(s) < 10) return 'The party is nowhere near ready to face a level 20 king. They need level 10 at least.';
    if (s.quests.filter(q => q.status === 'open').length >= MAX_QUESTS) return 'The board is full. Three quests at a time.';
    if (!(reward >= 1 && reward <= 12)) return 'Pick a reward from 1 to 12.';
    if ((s.town ? s.town.res.gold : 0) < reward * QUEST_GOLD) return `Millbrook needs ${reward * QUEST_GOLD} gold for that reward.`;
    const t = refTarget(s, ref);
    if (!t) return 'That target is gone.';
    if (questOn(s, ref)) return 'There is already a quest for that.';
    if (ref.kind === 'obj' && (isTrap(t))) return 'Nobody posts a quest to walk into a trap.';
    if (ref.kind === 'site' && !(t.kind === 'landmark' && !s.visited[t.id]) && t.kind !== 'tower') return `Pick an unvisited landmark, the Dark Tower, a monster, a lair, ${vName(s)}, or something you placed.`;
    if (s.march) return 'The party is already marching on the Dark Tower.';
    s.town.res.gold -= reward * QUEST_GOLD;
    const q = { id: 'q' + (s.uid++), ref: { kind: ref.kind, id: ref.id }, name: questName(s, ref), reward, week: s.week, status: 'open' };
    s.quests.push(q);
    if (ref.kind === 'obj') { t.known = true; t.rumored = true; }
    if (ref.kind === 'villain') s.villain.known = true;
    say(s, `A new notice on the Millbrook quest board: "${q.name}." Reward: ${ref.kind === 'site' && ref.id === 'tower' ? 'the gratitude of the realm' : rewardText(s, reward)}.`, 'dm');
    planRoute(s);
    return null;
  }
  function xpStep(L) { L = clamp(L, 1, MAX_LEVEL - 1); return XP_TABLE[L + 1] - XP_TABLE[L]; }
  // XP worth a fraction of the party's next level
  const lvXp = (s, f) => Math.max(10, Math.round(xpStep(avgLevel(s)) * f / 5) * 5);
  const questXp = (s, r) => lvXp(s, 0.15 + 0.06 * r);
  function rewardText(s, r) { return `${questXp(s, r)} XP each` + (r >= 8 ? ' and a hero\'s welcome' : r >= 4 ? ' and a fat purse' : ''); }

  /* ================= the party's choices ================= */
  function planRoute(s) {
    const P = s.party; P.path = []; P.target = null; P.intent = []; P.goal = null;
    const live = living(s); if (!live.length) return;
    const V = s.villain;
    const knownStack = (x, y) => s.objects.find(o => o.kind === 'stack' && o.known && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && !(o.x === x && o.y === y));
    const vZone = (x, y) => villainOnMap(s) && V.known && Math.abs(V.x - x) <= 1 && Math.abs(V.y - y) <= 1;
    const zone = (x, y) => !!knownStack(x, y) || vZone(x, y);
    const blocked = (x, y) => s.objects.some(o => o.kind === 'stack' && o.known && o.x === x && o.y === y) || (villainOnMap(s) && V.known && V.x === x && V.y === y);
    const enter = (x, y) => blocked(x, y) ? Infinity : tileCost(s, x, y);
    const terminal = (x, y) => zone(x, y) || s.objects.some(o => o.kind !== 'stack' && !isTrap(o) && o.known && o.x === x && o.y === y) || !!siteAt(s, x, y) || (s.nodes || []).some(n => n.x === x && n.y === y && n.known && workersAt(s, n).length > 0);
    const D = dijkstra(P.x, P.y, enter, terminal);
    const mp = mpPerDay(s);
    const frac = partyHpFrac(s);
    const byDrive = d => live.find(h => h.drive === d);
    const cands = [];
    const add = (key, x, y, value, why, ref, label) => {
      const d = D.dist[tIdx(x, y)]; if (!isFinite(d) || value <= 0) return;
      cands.push({ key, x, y, score: value - d / mp * 3, why, ref, d, label });
    };
    const bestZoneTile = (cx, cy) => {
      let bx = -1, by = -1, bd = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        const dd = D.dist[tIdx(x, y)]; if (dd < bd) { bd = dd; bx = x; by = y; }
      }
      return bx >= 0 ? [bx, by] : null;
    };
    const pp = partyPower(s);
    const weak = frac < 0.5;
    const finale = !!s.march;
    const g = byDrive('glory');
    const fightValue = (ratio, reward, name) => {
      const j = judge(ratio, reward);
      let v, why;
      if (j === 'avoid') { v = g && ratio > JUDGE.avoid * 0.85 && !weak ? 2 : -10; why = `${g ? g.name : 'Someone'} wants to take on the ${name}, and nobody else does.`; }
      else if (j === 'worthy') { v = 4 + (g ? 6 : 0); why = g ? `${g.name} wants a real fight with the ${name}.` : `The party sizes up the ${name}.`; }
      else if (j === 'beatable') { v = 3 + (g ? 3 : 0); why = `The ${name} look beatable. Easy experience.`; }
      else { v = -0.5; why = `The ${name} aren't worth their time anymore.`; }
      if (weak) v -= 8;
      if (finale) v -= 3;
      return { v, why };
    };
    for (const o of s.objects) {
      if (!o.known || isTrap(o)) continue;
      const q = questOn(s, { kind: 'obj', id: o.id }); const qb = q ? 4 + q.reward * 1.2 : 0;
      const rum = o.rumored ? 1.3 : 1; const rb = o.rumored ? 4 : 0;
      if (o.kind === 'stack') {
        const name = CREATURES[o.type].name;
        const fv = fightValue(fightRatio(s, o), q ? q.reward : 0, name);
        const t = bestZoneTile(o.x, o.y);
        if (t) add(o.id, t[0], t[1], fv.v * rum + rb + (fv.v > 0 ? qb : 0), q ? `The quest board offers a reward for the ${name}. ${fv.why}` : fv.why, o, name);
        continue;
      }
      if (o.kind === 'dungeon' && o.mine && o.building) {
        const d = byDrive('duty');
        add(o.id, o.x, o.y, 1.5 + (d ? 2.5 : 0) - (weak ? 3 : 0), d ? `${d.name} spotted the villain's minions building something and wants it torn down.` : 'The party wants to see what the villain\'s minions are building.', o, 'a half-built ' + DUNGEONS[o.dtype].name);
        continue;
      }
      if (o.kind === 'dungeon' && o.mine && lairWrecked(s, o)) continue;
      if (o.kind === 'dungeon') {
        const name = DUNGEONS[o.dtype].name;
        const fv = fightValue(pp / garrisonPower(o), q ? q.reward : 0, name.toLowerCase() + '\'s garrison');
        add(o.id, o.x, o.y, (fv.v > 0 ? (o.mine ? fv.v * 0.5 + (byDrive('duty') ? 1.5 : 0) : fv.v + 3 + (byDrive('duty') ? 2 : 0)) : fv.v) * rum + rb + (fv.v > 0 ? qb : 0), fv.v > 0 ? `They want to ${o.mine ? 'wreck' : 'destroy'} the ${name} before it spawns more monsters.` : fv.why, o, name);
        continue;
      }
      const it = ITEMS[o.kind]; const h = it.drives.map(byDrive).find(Boolean);
      let v = 2;
      if (o.kind === 'chest') v = 3 + (h ? 6 : 0);
      if (o.kind === 'artifact') v = 5 + (h ? 4 : 0);
      if (o.kind === 'shrine') v = 2 + (byDrive('duty') ? 3 : 0) + (1 - frac) * 14 + (live.some(x => x.maxMana && x.mana < x.maxMana / 2) ? 3 : 0);
      if (o.kind === 'refugees' || o.kind === 'captive') v = 2 + (h ? 6 : 0);
      if (o.kind === 'riddle' || o.kind === 'stranger') v = 2 + (h ? 6 : 0);
      if (o.kind === 'pass') v = 2 + (h ? 5 : 0) - (weak ? 3 : 0);
      if (o.kind === 'omen') v = 1 + (byDrive('curiosity') ? 3 : 0) + (byDrive('duty') ? 2 : 0);
      if (finale) v *= 0.4;
      const why = q ? `The quest board offers a reward: "${q.name}."` : o.rumored ? `A tavern rumor about a ${it.name} has everyone curious.` : h ? `${h.name} spotted a ${it.name} and wants to see it.` : `The party heads for the ${it.name}.`;
      add(o.id, o.x, o.y, v * rum + rb + qb, why, o, it.name);
    }
    // sites the villain's minions are working: the heroes want them gone, if the guards aren't too much
    for (const n of s.nodes || []) {
      if (!n.known || nodeRaided(s, n) || !workersAt(s, n).length) continue;
      const K = NODE_KINDS[n.kind]; const gl = guardOf(s, n);
      let v = 0.5 + (byDrive('duty') ? 1 : 0) + (n.kind === 'gold' && byDrive('greed') ? 1.5 : 0); let why = `The villain's ${minionType(s).name.toLowerCase()} are working the ${nodeName(n)}. The heroes want them gone.`;
      if (gl) { const fv = fightValue(pp / garrisonPower(gl), 0, DUNGEONS[gl.dtype].name.toLowerCase() + '\'s guards'); v = fv.v > 0 ? v + fv.v * 0.5 : fv.v; if (fv.v <= 0) why = fv.why; }
      if (weak) v -= 4; if (finale) v *= 0.3;
      add('node:' + n.id, n.x, n.y, v, why, n, nodeName(n));
    }
    // the villain in person
    if (villainOnMap(s) && V.known) {
      const q = questOn(s, { kind: 'villain' });
      const ratio = pp / villainPower(s);
      const j = judge(ratio, q ? q.reward : 0);
      if (j !== 'avoid') {
        const t = bestZoneTile(V.x, V.y);
        if (t) add('villain', t[0], t[1], 8 + (g ? 6 : 0) + (q ? 4 + q.reward * 1.2 : 0) - (weak ? 10 : 0), q ? `The quest board calls for ${vName(s)}'s head, and they mean to collect.` : `They think they can take ${vName(s)}. ${g ? g.name + ' is already charging.' : ''}`, { kind: 'villain' }, vName(s));
      }
    }
    for (const S of sitesOf(s)) {
      if (S.kind === 'landmark' && !s.visited[S.id]) {
        const h = byDrive(S.drive); const q = questOn(s, { kind: 'site', id: S.id });
        add(S.id, S.x, S.y, (3 + (h ? 6 : 0)) * (finale ? 0.3 : 1) + (q ? 4 + q.reward * 1.2 : 0), q ? `The quest board offers a reward: "${q.name}."` : h ? `${h.name} wants to see ${S.name}.` : `The party has heard tales of ${S.name}.`, S, S.name);
      }
      if (S.kind === 'town') {
        const anyDead = s.heroes.some(h => h.status !== 'ok');
        const manaLow = live.some(x => x.maxMana && x.mana < x.maxMana * 0.35);
        const fear = villainOnMap(s) && V.known && judge(pp / villainPower(s), 0) === 'avoid' && Math.hypot(V.x - P.x, V.y - P.y) < 7 ? 8 : 0;
        const fest = s.townEvent ? 5 + (g ? 5 : 0) : 0;
        const need = (1 - frac) * 26 + (anyDead ? 12 : 0) + (manaLow ? 3 : 0) + fear + fest;
        if (need > 6 && !(P.x === S.x && P.y === S.y)) {
          const cl = byDrive('duty') || live[0];
          add(S.id, S.x, S.y, need, fest && need - fest < 6 ? `Millbrook is holding a tournament. ${g ? g.name + ' wants to compete.' : 'Everyone wants to watch.'}` : fear ? `${vName(s)} is too close. The party falls back to Millbrook.` : anyDead ? 'They need to recruit at the Millbrook tavern.' : `${cl.name}: "We need rest. Back to Millbrook."`, S, S.name);
        }
      }
      if (S.kind === 'tower' && finale) add(S.id, S.x, S.y, 100, s.march === 'bored' ? 'The players are done with side quests. "Let\'s just go fight the boss." The party marches on the Dark Tower.' : `The heroes feel ready. The whole table agrees: storm the Dark Tower and face ${vName(s)}.`, S, S.name);
      if (S.kind === 'town' && finale && s.heroes.some(h => h.status === 'waiting') && !(P.x === S.x && P.y === S.y)) add('recruits', S.x, S.y, 110, 'Before the final battle, they ride back to Millbrook to pick up the new party member.', S, S.name);
    }
    cands.sort((a, b) => b.score - a.score);
    let best = cands[0];
    const important = finale ? siteOf(s, 'tower') : (!best || best.score <= 0) ? sitesOf(s).find(z => z.kind === 'landmark' && !s.visited[z.id]) : null;
    if (important && !isFinite(D.dist[tIdx(important.x, important.y)])) {
      const D2 = dijkstra(P.x, P.y, (x, y) => blocked(x, y) ? Infinity : tileCost(s, x, y) + (zone(x, y) ? 400 : 0), (x, y) => !!siteAt(s, x, y) && !(x === important.x && y === important.y));
      const p2 = tracePath(D2.prev, tIdx(P.x, P.y), tIdx(important.x, important.y));
      if (p2) {
        const cut = p2.findIndex(([x, y]) => zone(x, y));
        if (cut >= 0) {
          const [zx, zy] = p2[cut]; const blocker = knownStack(zx, zy);
          if (isFinite(D.dist[tIdx(zx, zy)])) best = { key: blocker ? blocker.id : 'villain', x: zx, y: zy, score: 1, ref: blocker || { kind: 'villain' }, why: blocker ? `${quantityWord(blocker.count)} ${CREATURES[blocker.type].name} block the only way to ${important.name}. The party will have to fight through.` : `${vName(s)} blocks the way to ${important.name}.` };
        }
      }
    }
    if (!best || best.score <= 0) {
      let bi = -1, bs = -Infinity;
      for (let i = 0; i < MW * MH; i++) {
        if (!isFinite(D.dist[i]) || D.dist[i] === 0) continue;
        const x = i % MW, y = (i / MW) | 0;
        let unk = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < MW && yy < MH && !s.explored[tIdx(xx, yy)]) unk++; }
        if (!unk) continue;
        const sc = unk * 0.6 - D.dist[i] / mp * 3 + rng() * 0.5;
        if (sc > bs) { bs = sc; bi = i; }
      }
      if (bi >= 0) best = { key: 'explore', x: bi % MW, y: (bi / MW) | 0, why: 'Nothing calls to them, so the party scouts the unknown.', score: 0 };
    }
    if (!best) { P.intent = ['The party stays put. There is nowhere left to go.']; return; }
    const path = tracePath(D.prev, tIdx(P.x, P.y), tIdx(best.x, best.y));
    if (!path) return;
    P.path = path; P.target = best.key; P.goal = best.label || (best.key === 'explore' ? 'the unknown' : null);
    const also = cands.filter(c => c !== best && c.score > 0).slice(0, 1).map(c => `Also tempting: ${c.label || 'something nearby'}.`);
    P.intent = [best.why].concat(also);
  }

  /* ================= resources, minions and lairs on the map (0.9) ================= */
  const dayIndex = s => (s.week - 1) * 7 + s.day;
  const minionType = s => MINION_TYPES[s.villain && s.villain.type] || MINION_TYPES.lich;
  const myLairs = s => s.objects.filter(o => o.kind === 'dungeon' && o.mine);
  const builtLairs = s => myLairs(s).filter(o => !o.building);
  const nodeAt = (s, x, y) => (s.nodes || []).find(n => n.x === x && n.y === y);
  const assignedTo = (s, n) => (s.minions || []).filter(m => m.job && m.job.kind === 'work' && m.job.node === n.id);
  const workersAt = (s, n) => assignedTo(s, n).filter(m => !m.path.length && m.x === n.x && m.y === n.y);
  const nodeRaided = (s, n) => !!n.raidedUntil && n.raidedUntil > dayIndex(s);
  const unlocked = (s, k) => !!(s.unlocked && s.unlocked[k]);
  const resOf = (s, k) => k === 'lore' ? s.lore : ((s.res && s.res[k]) || 0);
  const canAfford = (s, price) => Object.keys(price).every(k => resOf(s, k) >= price[k]);
  function pay(s, price) { for (const k of Object.keys(price)) { if (k === 'lore') s.lore -= price[k]; else s.res[k] -= price[k]; } }
  const priceText = p => Object.keys(p).filter(k => p[k]).map(k => `${p[k]} ${RES_NAME[k]}`).join(', ');
  function upPrice(k) { const P = DUNGEONS[k].price; const out = {}; for (const r of RES_KEYS) if (P[r]) out[r] = Math.ceil(P[r] / 2); out.gold = (out.gold || 0) + 2 * (Math.ceil((P.lore || 0) / 2) + 2 * DUNGEONS[k].tier); return out; }
  const minionCost = s => Math.round((minionType(s).perk === 'cheap' ? 8 : 12) * (1 - talentFx(s).summonCost));
  const maxMinions = s => MAX_MINIONS + talentFx(s).minions;
  const libraryLevel = s => (s.base && s.base.library) || 0;
  // the old research keys still decide the finale's gate guards and the dark powers; now each means "you've built that lair"
  const TECH_LAIR = { barracks: 'camp', ossuary: 'bonecrypt', ogre: 'den', altar: 'barrow', troll: 'fens', giant: 'hold', blood: 'keep', mire: 'mire', roost: 'roost', gate: 'abyss', knights: 'keep' };

  /* --- the map's resource sites --- */
  function genNodes(s) {
    const M = mapOf(s); const r = mulberry((s.seed * 13 + 5) | 0); const tw = siteOf(s, 'tower'); const town = siteOf(s, 'town');
    const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
    const isT = (x, y, t) => inMap(x, y) && M.T[tIdx(x, y)] === t;
    const around = (x, y, f) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && f(x + dx, y + dy)) n++; return n; };
    const C = { gold: [], lumber: [], ore: [] };
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (!isFinite(tileCost(s, x, y)) || !M.reach[tIdx(x, y)] || M.road[tIdx(x, y)]) continue;
      if (sitesOf(s).some(z => Math.hypot(z.x - x, z.y - y) < 2.5) || Math.hypot(town.x - x, town.y - y) < 4) continue;
      const t = M.T[tIdx(x, y)]; const m = around(x, y, (a, b) => isT(a, b, 'mount'));
      if (m >= 1 && t !== 'forest' && t !== 'swamp') C.gold.push([x, y]);
      if (t === 'forest' && around(x, y, (a, b) => isT(a, b, 'forest')) >= 4) C.lumber.push([x, y]);
      if (m >= 2) C.ore.push([x, y]);
    }
    const nodes = [];
    const taken = (x, y, gap) => nodes.some(n => Math.hypot(n.x - x, n.y - y) < gap);
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const add = (kind, x, y) => nodes.push({ id: 'n' + (nodes.length + 1), kind, x, y, known: false, raidedUntil: 0, dev: false });
    for (const [kind, want] of [['gold', 5], ['lumber', 6], ['ore', 5]]) {
      // one within easy reach of the tower, the rest spread over the land
      const first = C[kind].slice().sort((a, b) => Math.hypot(a[0] - tw.x, a[1] - tw.y) - Math.hypot(b[0] - tw.x, b[1] - tw.y)).find(([x, y]) => !taken(x, y, 3));
      if (first) add(kind, first[0], first[1]);
      for (const [x, y] of shuffle(C[kind])) { if (nodes.filter(n => n.kind === kind).length >= want) break; if (!taken(x, y, 5)) add(kind, x, y); }
    }
    return nodes;
  }

  /* --- the dungeon master's fog of war: you see what your tower, minions and lairs see, and all around the heroes --- */
  const DM_SIGHT = { tower: 5, minion: 3, lair: 2 };
  // pos: where a minion stands right now, for a page animating them mid-walk
  function dmVisible(s, pos) {
    const v = new Uint8Array(MW * MH);
    const mark = (cx, cy, r) => {
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(MH - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(MW - 1, Math.ceil(cx + r)); x++)
        if (Math.hypot(x - cx, y - cy) <= r + 0.25) v[y * MW + x] = 1;
    };
    const tw = siteOf(s, 'tower'); mark(tw.x, tw.y, DM_SIGHT.tower);
    const ms = DM_SIGHT.minion + talentFx(s).sight;
    for (const m of s.minions || []) { const p = pos ? pos(m) : m; mark(p.x, p.y, ms); }
    for (const o of s.objects) if (o.kind === 'dungeon' && o.mine) mark(o.x, o.y, o.building ? 1 : DM_SIGHT.lair);
    if (s.heroes && s.heroes.some(h => h.status === 'ok')) mark(s.party.x, s.party.y, sightRadius(s) + 1);
    return v;
  }
  function dmReveal(s) {
    if (!s.dmSeen) s.dmSeen = new Array(MW * MH).fill(0);
    const v = dmVisible(s); for (let i = 0; i < v.length; i++) if (v[i]) s.dmSeen[i] = 1;
  }
  const dmSees = (s, x, y) => dmVisible(s)[tIdx(x, y)] === 1;
  const dmSeen = (s, x, y) => !s.dmSeen || !!s.dmSeen[tIdx(x, y)];

  /* --- minions --- */
  function freeNear(s, cx, cy, maxR) {
    for (let r = 1; r <= (maxR || 4); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= MW || y >= MH || !isFinite(tileCost(s, x, y)) || !mapOf(s).reach[tIdx(x, y)] || siteAt(s, x, y) || objAt(s, x, y)) continue;
      return [x, y];
    }
    return [cx, cy];
  }
  function spawnMinion(s) { const tw = siteOf(s, 'tower'); const [x, y] = freeNear(s, tw.x, tw.y, 3); const m = { id: 'w' + (s.uid++), x, y, path: [], job: null }; s.minions.push(m); return m; }
  function minionPath(s, m, tx, ty) {
    if (m.x === tx && m.y === ty) return [];
    const D = dijkstra(m.x, m.y, (x, y) => tileCost(s, x, y), null, tIdx(tx, ty));
    return tracePath(D.prev, tIdx(m.x, m.y), tIdx(tx, ty));
  }
  const idleMinions = s => (s.minions || []).filter(m => !m.job);
  function nearestIdle(s, x, y) { return idleMinions(s).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null; }
  function trainCheck(s) {
    if (s.phase !== 'map') return 'Not now.';
    const q = (s.summons || []).length;
    if ((s.minions || []).length + q >= maxMinions(s)) return `You already command ${maxMinions(s)}. That's all the tower can feed.`;
    if (q >= MAX_SUMMONS) return `${MAX_SUMMONS} are already waiting to be summoned.`;
    if (resOf(s, 'gold') < minionCost(s)) return `Needs ${minionCost(s)} gold.`;
    return null;
  }
  // a new minion is summoned at the tower: paid now, ready after SUMMON_DAYS nights, one at a time
  function trainMinion(s) {
    const err = trainCheck(s); if (err) return err;
    s.res.gold -= minionCost(s); (s.summons = s.summons || []).push({ days: summonDays(s), total: summonDays(s), cost: minionCost(s) });
    const n = s.summons.length; const wait = s.summons.reduce((t, q) => t + q.days, 0);
    say(s, n > 1 ? `Another ${minionType(s).one.toLowerCase()} joins the summoning queue. Ready in ${wait} days.` : `You begin summoning a ${minionType(s).one.toLowerCase()} at the Dark Tower. Ready in ${wait} days.`, 'dm');
    return null;
  }
  function cancelSummon(s, i) {
    const q = s.summons || []; i = i === undefined ? q.length - 1 : i; const it = q[i]; if (!it) return 'Nothing to cancel.';
    q.splice(i, 1); s.res.gold += it.cost || minionCost(s); return null;
  }
  // each night the minion at the head of the queue takes shape; true when one steps out
  function summonDay(s) {
    const q = s.summons || []; if (!q.length) return null;
    q[0].days -= 1; if (q[0].days > 0) return null;
    q.shift(); const m = spawnMinion(s);
    say(s, `A new ${minionType(s).one.toLowerCase()} crawls out of the Dark Tower, ready to work.`, 'dm');
    return m.id;
  }
  function orderWork(s, nodeId, minionId) {
    const n = (s.nodes || []).find(z => z.id === nodeId); if (!n) return 'No such site.';
    if (nodeRaided(s, n)) return `The heroes drove your minions off. It's safe to go back in ${n.raidedUntil - dayIndex(s)} day${n.raidedUntil - dayIndex(s) > 1 ? 's' : ''}.`;
    if (assignedTo(s, n).filter(z => z.id !== minionId).length >= NODE_KINDS[n.kind].cap) return `Another ${minionType(s).one.toLowerCase()} already works that ${nodeName(n)}.`;
    const m = minionId ? s.minions.find(z => z.id === minionId) : nearestIdle(s, n.x, n.y);
    if (!m) return `No idle ${minionType(s).name.toLowerCase()}. Summon more at the tower, or call one off another job.`;
    const path = minionPath(s, m, n.x, n.y); if (!path) return 'Your minions can\'t get there.';
    m.job = { kind: 'work', node: n.id }; m.path = path; m.trip = path.length; return null;
  }
  function recallMinion(s, id) { const m = (s.minions || []).find(z => z.id === id); if (!m) return 'No such minion.'; m.job = null; m.path = []; return null; }
  // plot: stay put and scheme, +1 Lore every night; dance: stay put and dance
  function orderPlot(s, id) { const m = (s.minions || []).find(z => z.id === id); if (!m) return 'No such minion.'; m.job = { kind: 'plot' }; m.path = []; m.trip = 0; return null; }
  function orderDance(s, id) { const m = (s.minions || []).find(z => z.id === id); if (!m) return 'No such minion.'; m.job = { kind: 'dance' }; m.path = []; m.trip = 0; return null; }
  // walk somewhere and wait there (busy until it arrives)
  function moveCheck(s, x, y) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return 'Off the map.';
    if (!isFinite(tileCost(s, x, y)) || !mapOf(s).reach[tIdx(x, y)]) return 'They can\'t walk there.';
    const site = siteAt(s, x, y); if (site && site.id !== 'tower') return site.kind === 'town' ? 'Millbrook\'s guards would cut them down.' : 'Not there. Pick open ground.';
    const o = objAt(s, x, y); if (o && !(o.kind === 'dungeon' && o.mine)) return 'Something is already there.';
    return null;
  }
  function orderMove(s, id, x, y) {
    const m = (s.minions || []).find(z => z.id === id); if (!m) return 'No such minion.';
    const err = moveCheck(s, x, y); if (err) return err;
    const path = minionPath(s, m, x, y); if (!path) return 'They can\'t get there.';
    m.job = path.length ? { kind: 'move', x, y } : null; m.path = path; m.trip = path.length; return null;
  }
  function homeSpot(s) { const tw = siteOf(s, 'tower'); return freeNear(s, tw.x, tw.y, 3); }
  function orderHome(s, id) { const [x, y] = homeSpot(s); return orderMove(s, id, x, y); }
  // send a minion to work on a lair that's still going up
  function orderHelp(s, lairId, id) {
    const o = myLairs(s).find(z => z.id === lairId); if (!o || !o.building) return 'Nothing to build there.';
    const m = id ? (s.minions || []).find(z => z.id === id) : idleMinions(s).sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))[0];
    if (!m) return `No idle ${minionType(s).name.toLowerCase()}.`;
    const path = minionPath(s, m, o.x, o.y); if (!path) return 'They can\'t get there.';
    m.job = { kind: 'build', lair: o.id }; m.path = path; m.trip = path.length; return null;
  }
  function recallFrom(s, nodeId) {
    const n = (s.nodes || []).find(z => z.id === nodeId); if (!n) return 'No such site.';
    const list = assignedTo(s, n); if (!list.length) return 'Nobody works there.';
    const m = list.find(z => z.path.length) || list[list.length - 1]; m.job = null; m.path = []; return null;
  }

  /* --- building lairs --- */
  function spotCheck(s, x, y) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return 'Off the map.';
    if (!dmSeen(s, x, y)) return 'You haven\'t explored there yet. Send a minion first.';
    if (!isFinite(tileCost(s, x, y)) || !mapOf(s).reach[tIdx(x, y)]) return 'Nothing can be built there.';
    if (siteAt(s, x, y)) return 'That spot is taken.';
    const town = siteOf(s, 'town'); if (Math.hypot(x - town.x, y - town.y) < 4) return 'Too close to Millbrook. The town guard would burn it.';
    if (objAt(s, x, y) || nodeAt(s, x, y)) return 'Something is already there.';
    if (mapOf(s).road[tIdx(x, y)]) return 'Not on the road. Build beside it.';
    if (s.objects.some(o => o.kind === 'dungeon' && Math.hypot(o.x - x, o.y - y) < 2)) return 'Too close to another lair.';
    if (s.party.x === x && s.party.y === y) return 'The heroes are standing there.';
    if (inSight(s, x, y)) return 'The heroes would see you build it. Pick a spot out of their sight.';
    return null;
  }
  function lairCheck(s, k) {
    const D = DUNGEONS[k]; if (!D || !D.unit) return 'Unknown lair.';
    if (!lairKnown(s, k)) return `Research the ${D.name} at the Dark Tower first.`;
    const P = buildPrice(k); if (!canAfford(s, P)) return `Needs ${priceText(P)}.`;
    return null;
  }
  function buildCheck(s, k, x, y, minionId) {
    if (s.phase !== 'map') return 'Not now.';
    const e1 = lairCheck(s, k); if (e1) return e1;
    if (x !== undefined) { const e2 = spotCheck(s, x, y); if (e2) return e2; }
    if (minionId ? !(s.minions || []).some(m => m.id === minionId) : !idleMinions(s).length) return `No idle ${minionType(s).name.toLowerCase()} to build it.`;
    return null;
  }
  function orderBuild(s, k, x, y, minionId) {
    const err = buildCheck(s, k, x, y, minionId); if (err) return err;
    const D = DUNGEONS[k]; const m = minionId ? s.minions.find(z => z.id === minionId) : nearestIdle(s, x, y); const path = minionPath(s, m, x, y);
    if (!path) return 'Your minions can\'t get there.';
    pay(s, buildPrice(k));
    const o = { id: 'o' + (s.uid++), kind: 'dungeon', dtype: k, mine: true, pool: { [D.unit]: 0 }, level: 1, mode: 'hold', x, y, known: false, rumored: false, paid: 0, placed: dayKey(s), movedDay: 0, building: lairDays(s, k), buildTotal: lairDays(s, k) };
    s.objects.push(o);
    m.job = { kind: 'build', lair: o.id }; m.path = path; m.trip = path.length;
    say(s, `You order a ${D.name} built near ${regionName(s, x, y)}. A ${minionType(s).one.toLowerCase()} sets off to raise it: ${lairDays(s, k)} days of work once it gets there.`, 'dm');
    return null;
  }
  function cancelBuild(s, id) {
    const o = myLairs(s).find(z => z.id === id); if (!o || !o.building) return 'Nothing to cancel.';
    const P = buildPrice(o.dtype); for (const r of Object.keys(P)) s.res[r] += Math.floor(P[r] / 2);
    s.objects = s.objects.filter(z => z !== o);
    for (const m of s.minions) if (m.job && m.job.kind === 'build' && m.job.lair === id) { m.job = null; m.path = []; }
    return null;
  }
  function expandCheck(s, id) {
    const o = myLairs(s).find(z => z.id === id); if (!o) return 'No such lair.';
    if (o.building) return 'Finish building it first.';
    if ((o.level || 1) >= 2) return 'Already expanded.';
    const P = upPrice(o.dtype); if (!canAfford(s, P)) return `Needs ${priceText(P)}.`;
    return null;
  }
  function expandLair(s, id) {
    const err = expandCheck(s, id); if (err) return err;
    const o = myLairs(s).find(z => z.id === id); pay(s, upPrice(o.dtype)); o.level = 2;
    say(s, `The ${DUNGEONS[o.dtype].name} is expanded. It raises more ${CREATURES[DUNGEONS[o.dtype].unit].name.toLowerCase()} and reaches farther.`, 'dm');
    return null;
  }
  function libraryCheck(s) {
    const lv = libraryLevel(s); if (lv >= 2) return 'Already expanded.';
    if (s.base && s.base.libBuild) return `Your minions are still building it: ${s.base.libBuild.days} day${s.base.libBuild.days > 1 ? 's' : ''} to go.`;
    const P = LIBRARY[lv + 1]; if (!canAfford(s, P)) return `Needs ${priceText(P)}.`;
    return null;
  }
  function buildLibrary(s) {
    const err = libraryCheck(s); if (err) return err; const lv = libraryLevel(s); pay(s, LIBRARY[lv + 1]);
    s.base.libBuild = { days: LIBRARY_DAYS[lv + 1], total: LIBRARY_DAYS[lv + 1] };
    say(s, lv ? `Your minions start a new wing on the Forbidden Library. Ready in ${LIBRARY_DAYS[lv + 1]} days.` : `Your minions start raising the Forbidden Library at the Dark Tower. Ready in ${LIBRARY_DAYS[lv + 1]} days.`, 'dm');
    return null;
  }
  function libraryDay(s) {
    const B = s.base && s.base.libBuild; if (!B) return false;
    B.days -= 1; if (B.days > 0) return false;
    s.base.library = libraryLevel(s) + 1; s.base.libBuild = null;
    say(s, s.base.library > 1 ? 'The Forbidden Library\'s new wing is finished: one more talent point.' : 'The Forbidden Library is finished: a talent point to spend.', 'dm');
    return true;
  }

  /* ================= Millbrook, the heroes' town (0.19) ================= */
  // each building has levels; each level costs the town's own gold, lumber and ore and takes days to raise, one at a time
  const TOWN_B = {
    market: { name: 'Market', max: 3, kind: 'income', costs: [{ gold: 20, lumber: 10 }, { gold: 35, lumber: 15, ore: 5 }, { gold: 55, lumber: 25, ore: 10 }], days: [2, 3, 4], income: [{ gold: 3 }, { gold: 5 }, { gold: 8 }], text: 'Traders bring gold into town every day.' },
    sawmill: { name: 'Sawmill', max: 3, kind: 'income', costs: [{ gold: 15, lumber: 5 }, { gold: 30, lumber: 10, ore: 5 }, { gold: 45, lumber: 15, ore: 10 }], days: [2, 3, 4], income: [{ lumber: 3 }, { lumber: 5 }, { lumber: 7 }], text: 'Planks and beams for the town every day.' },
    ironworks: { name: 'Ironworks', max: 3, kind: 'income', costs: [{ gold: 20, lumber: 10 }, { gold: 35, lumber: 15 }, { gold: 50, lumber: 25 }], days: [2, 3, 4], income: [{ ore: 2 }, { ore: 3 }, { ore: 5 }], text: 'Iron for the town every day.' },
    smith: { name: 'Blacksmith', max: 3, kind: 'heroes', costs: [{ gold: 25, lumber: 10, ore: 10 }, { gold: 45, lumber: 15, ore: 20 }, { gold: 70, lumber: 20, ore: 35 }], days: [3, 4, 5], levels: ['+1 to hit for every hero', '+1 armour class for every hero', '+2 damage for every hero'], text: 'Better blades and armour for the party.' },
    temple: { name: 'Temple', max: 2, kind: 'heroes', costs: [{ gold: 30, lumber: 15, ore: 5 }, { gold: 60, lumber: 20, ore: 20 }], days: [3, 5], levels: ['the heroes heal twice as fast between fights', 'once a week, a fallen hero comes back to life instead of being replaced'], text: 'Priests who keep the heroes alive.' },
    guild: { name: 'Mage Guild', max: 2, kind: 'heroes', costs: [{ gold: 35, lumber: 10, ore: 15 }, { gold: 60, lumber: 15, ore: 30 }], days: [3, 5], levels: ['wizards and clerics: +1 to hit, +2 damage', 'wizards and clerics: another +1 to hit, +2 damage'], text: 'Spellbooks and teachers for the casters.' },
    yard: { name: 'Training Yard', max: 2, kind: 'heroes', costs: [{ gold: 30, lumber: 20 }, { gold: 55, lumber: 30, ore: 10 }], days: [3, 4], levels: ['+15% experience from every fight', '+30% experience from every fight'], text: 'Drills and sparring between adventures.' },
    tavern: { name: 'Tavern', max: 2, kind: 'heroes', costs: [{ gold: 20, lumber: 15 }, { gold: 40, lumber: 25, ore: 5 }], days: [2, 3], levels: ['the table\'s mood rises a little every day', 'the mood rises more, and new heroes arrive with a magic item'], text: 'Songs, ale and new faces.' }
  };
  const TOWN_ORDER = ['market', 'sawmill', 'ironworks', 'smith', 'temple', 'guild', 'yard', 'tavern'];
  const TOWN_TAX = { gold: 4, lumber: 1, ore: 1 }; // what Millbrook makes on its own every day
  const QUEST_GOLD = 4; // town gold per point of quest reward
  const townLv = (s, k) => (s && s.town && s.town.b[k]) || 0;
  function townCost(s, k) { const B = TOWN_B[k]; const l = townLv(s, k); return B && l < B.max ? B.costs[l] : null; }
  const townAfford = (s, P) => Object.keys(P).every(r => (s.town.res[r] || 0) >= P[r]);
  function townCheck(s, k) {
    if (s.phase !== 'map') return 'Not now.';
    const B = TOWN_B[k]; if (!B) return 'Unknown building.';
    if (townLv(s, k) >= B.max) return 'Fully built.';
    if (s.town.build) return `Millbrook's builders are busy with the ${TOWN_B[s.town.build.k].name}: ${s.town.build.days} day${s.town.build.days > 1 ? 's' : ''} to go.`;
    const P = townCost(s, k); if (!townAfford(s, P)) return `Millbrook needs ${priceText(P)}.`;
    return null;
  }
  function townBuild(s, k) {
    const err = townCheck(s, k); if (err) return err;
    const P = townCost(s, k); for (const r of Object.keys(P)) s.town.res[r] -= P[r];
    const l = townLv(s, k); const d = TOWN_B[k].days[l];
    s.town.build = { k, days: d, total: d, cost: P };
    say(s, `Millbrook starts ${l ? 'enlarging its' : 'building a'} ${TOWN_B[k].name}. Ready in ${d} days.`, 'good');
    return null;
  }
  function townCancel(s) {
    const B = s.town.build; if (!B) return 'Nothing to cancel.';
    for (const r of Object.keys(B.cost)) s.town.res[r] += B.cost[r]; s.town.build = null; return null;
  }
  function townIncome(s) {
    const out = Object.assign({}, TOWN_TAX);
    for (const k of TOWN_ORDER) { const B = TOWN_B[k]; const l = townLv(s, k); if (l && B.income) for (const [r, v] of Object.entries(B.income[l - 1])) out[r] = (out[r] || 0) + v; }
    return out;
  }
  // what a building level does to the heroes
  function townBonus(s, h) {
    const sm = townLv(s, 'smith'), gu = h && (h.cls === 'wizard' || h.cls === 'cleric') ? townLv(s, 'guild') : 0;
    return { hit: (sm >= 1 ? 1 : 0) + gu, ac: sm >= 2 ? 1 : 0, dmg: (sm >= 3 ? 2 : 0) + 2 * gu };
  }
  // the town's day: income comes in and the builders work
  function townDay(s) {
    const T = s.town; if (!T) return null;
    const inc = townIncome(s); for (const r of RES_KEYS) T.res[r] = (T.res[r] || 0) + (inc[r] || 0);
    let built = null;
    if (T.build) {
      T.build.days -= 1;
      if (T.build.days <= 0) {
        built = T.build.k; T.b[built] = townLv(s, built) + 1; T.build = null; const B = TOWN_B[built];
        say(s, `Millbrook's ${B.name} is ${T.b[built] > 1 ? 'enlarged' : 'finished'}: ${B.levels ? B.levels[T.b[built] - 1] : 'more ' + Object.keys(B.income[0])[0] + ' every day'}.`, 'good');
      }
    }
    if (townLv(s, 'tavern')) s.engagement = clamp(s.engagement + townLv(s, 'tavern'), 0, 100);
    return { income: inc, built };
  }
  // 0.20: each town's main building grows as the town does, every few levels of building (Millbrook) or research (the tower)
  const HALL_STAGES = [{ at: 0, name: 'Hamlet Hall' }, { at: 3, name: 'Village Hall' }, { at: 7, name: 'Town Hall' }, { at: 12, name: 'City Hall' }, { at: 18, name: 'Capitol' }];
  const TOWER_STAGES = [{ at: 0, name: 'Watchtower' }, { at: 3, name: 'Dark Tower' }, { at: 7, name: 'Black Citadel' }, { at: 12, name: 'Dread Fortress' }, { at: 16, name: 'Throne of Night' }];
  const townLevels = s => TOWN_ORDER.reduce((t, k) => t + townLv(s, k), 0);
  const towerLevels = s => Math.round(talentSpent(s) * 0.7) + libraryLevel(s);
  function stageOf(stages, n) {
    let i = 0; while (i + 1 < stages.length && n >= stages[i + 1].at) i++;
    const next = stages[i + 1];
    return { stage: i + 1, of: stages.length, name: stages[i].name, n, next: next ? next.at : null, nextName: next ? next.name : null };
  }
  const hallStage = s => stageOf(HALL_STAGES, townLevels(s));
  const towerStage = s => stageOf(TOWER_STAGES, towerLevels(s));
  // the heroes bring their loot home: a share of every fight they win goes to Millbrook
  const LOOT_SHARE = { Trivial: 0.3, Easy: 0.6, Tense: 1, Harrowing: 1.4 };
  const lootGold = (s, label) => Math.round((3 + 2 * avgLevel(s)) * (LOOT_SHARE[label] || 0.5));
  const newTown = () => ({ res: { gold: 40, lumber: 20, ore: 10 }, b: {}, build: null, revived: 0 });

  /* --- talents (0.24) --- */
  const tRank = (s, k) => (s.talents && s.talents.r && s.talents.r[k]) || 0;
  // kept under its old name: lairs, powers and servant talents all answer "how many ranks?"
  const researched = (s, k) => START_LAIRS.indexOf(k) >= 0 ? 1 : tRank(s, k);
  const lairKnown = (s, k) => START_LAIRS.indexOf(k) >= 0 || tRank(s, k) > 0;
  const talentRanks = k => (TALENTS[k] && TALENTS[k].ranks) || (TALENTS[k] && TALENTS[k].power ? LAIR[TALENTS[k].power].max : 1);
  const talentName = k => { const T = TALENTS[k]; return T.name || (T.lair ? DUNGEONS[k].name : LAIR[T.power].name); };
  const talentText = k => { const T = TALENTS[k]; if (T.text) return T.text; if (T.power) return LAIR[T.power].text;
    const D = DUNGEONS[k], C = CREATURES[D.unit]; return `Your minions can build the ${D.name}, which raises ${C.name.toLowerCase()}. ${C.text || D.text}`; };
  const talentNeeds = k => TALENTS[k].needs || [];
  // this villain's trees: the three everyone shares, then its own path
  const talentTrees = s => ['brood', 'dominion', 'dread', 'v-' + ((s.villain && s.villain.type) || 'lich')];
  const talentsIn = tree => TALENT_ORDER.filter(k => TALENTS[k].tree === tree);
  const spentIn = (s, tree) => talentsIn(tree).reduce((t, k) => t + tRank(s, k), 0);
  const talentSpent = s => TALENT_ORDER.reduce((t, k) => t + tRank(s, k), 0);
  // what all the learned talents add up to (recomputed only when the ranks change)
  const FX_MEMO = { key: null, fx: null };
  function talentFx(s) {
    const r = (s.talents && s.talents.r) || {}; const key = JSON.stringify(r);
    if (FX_MEMO.key === key) return FX_MEMO.fx;
    const fx = { mod: {}, modAll: { hp: 0, ac: 0, hit: 0, dmg: 0 }, rate: {}, rateAll: 0, yield: { gold: 0, lumber: 0, ore: 0 }, nightly: 0, perLair: 0, townTithe: 0, bandCost: 0, summonCost: 0, minions: 0,
      reach: 0, sight: 0, buildDays: 0, summonDays: 0, empire: false, warded: false, cap: 0, bands: 0, vets: 0, guards: 0, infamy: 0, villain: { hp: 0, hit: 0 }, points: 0 };
    const addMod = (u, m, n) => { const t = u === 'all' ? fx.modAll : (fx.mod[u] = fx.mod[u] || { hp: 0, ac: 0, hit: 0, dmg: 0 }); for (const f of ['hp', 'ac', 'hit', 'dmg']) if (m[f]) t[f] += m[f] * n; if (m.regen) t.regen = true; if (m.drain) t.drain = true; };
    for (const k of Object.keys(r)) {
      const n = r[k] || 0; const F = TALENTS[k] && TALENTS[k].fx; if (!n || !F) continue;
      if (F.mod) for (const u of (F.mod.units === 'all' ? ['all'] : F.mod.units)) addMod(u, F.mod, n);
      if (F.rate) { if (F.rate.all) fx.rateAll += F.rate.pct * n; else for (const u of F.rate.units) fx.rate[u] = (fx.rate[u] || 0) + F.rate.pct * n; }
      if (F.yield) for (const y of Object.keys(F.yield)) fx.yield[y] += F.yield[y] * n;
      if (F.nightly) fx.nightly += F.nightly.gold * n;
      if (F.perLair) fx.perLair += F.perLair.gold * n;
      if (F.villain) { fx.villain.hp += (F.villain.hp || 0) * n; fx.villain.hit += (F.villain.hit || 0) * n; }
      for (const f of ['townTithe', 'bandCost', 'summonCost', 'minions', 'reach', 'sight', 'buildDays', 'summonDays', 'cap', 'bands', 'vets', 'guards', 'infamy', 'points']) if (F[f]) fx[f] += F[f] * n;
      if (F.empire) fx.empire = true; if (F.warded) fx.warded = true;
    }
    fx.bandCost = Math.min(0.7, fx.bandCost); fx.summonCost = Math.min(0.7, fx.summonCost);
    FX_MEMO.key = key; FX_MEMO.fx = fx; return fx;
  }
  // points: one to start, one for every level the party gains, Infamy from close fights, the Forbidden Library and some talents
  const talentEarned = s => ((s.talents && s.talents.earned) || 0) + libraryLevel(s) + talentFx(s).points;
  const talentFree = s => Math.max(0, talentEarned(s) - talentSpent(s));
  function talentCheck(s, k) {
    const T = TALENTS[k]; if (!T) return 'Unknown talent.';
    if (talentTrees(s).indexOf(T.tree) < 0) return 'Another villain\'s talent.';
    if (tRank(s, k) >= talentRanks(k)) return 'Already mastered.';
    const need = TIER_NEED[T.tier] || 0; const got = spentIn(s, T.tree);
    if (got < need) return `Spend ${need - got} more point${need - got > 1 ? 's' : ''} in ${TREES[T.tree].name} first.`;
    const miss = talentNeeds(k).filter(r => !researched(s, r));
    if (miss.length) return `Needs ${miss.map(r => TALENTS[r] ? talentName(r) : DUNGEONS[r].name).join(' and ')} first.`;
    if (talentFree(s) < 1) return 'No talent points to spend.';
    return null;
  }
  function learnTalent(s, k) {
    const err = talentCheck(s, k); if (err) return err;
    s.talents.r[k] = tRank(s, k) + 1; syncTalents(s);
    const T = TALENTS[k]; const rk = talentRanks(k) > 1 ? ' ' + roman(s.talents.r[k]) : '';
    say(s, T.lair ? `Talent: the ${talentName(k)}. Your minions can build it now.` : T.power ? `Talent: ${vName(s)} gains ${talentName(k)}${rk}.` : `Talent: ${talentName(k)}${rk}. ${talentText(k)}`, 'dm');
    return null;
  }
  // one free reset a week: every point comes back. Lairs already built keep working; you just can't build new ones of that kind
  function resetCheck(s) {
    if (!talentSpent(s)) return 'No talents to unlearn.';
    if (s.talents.resetWeek === s.week) return 'You\'ve already unlearned your talents this week. You can again next week.';
    return null;
  }
  function resetTalents(s) {
    const err = resetCheck(s); if (err) return err;
    const n = talentSpent(s); s.talents.r = {}; s.talents.resetWeek = s.week; syncTalents(s);
    say(s, `${vName(s)} unlearns every talent. ${n} point${n > 1 ? 's' : ''} to spend again.`, 'dm');
    return null;
  }
  // the dark powers live on the villain, where the battles read them
  function syncTalents(s) {
    const V = s.villain; if (!V) return; V.up = V.up || {};
    for (const k of TALENT_ORDER) { const P = TALENTS[k].power; if (P) V.up[P] = Math.min(LAIR[P].max, tRank(s, k)); }
    const fx = talentFx(s); V.up.hpPct = fx.villain.hp; V.up.hitBonus = fx.villain.hit;
  }
  // earning: a point for every party level gained, and one for every INFAMY_STEP Infamy
  function talentTick(s) {
    const T = s.talents; if (!T) return 0;
    const L = avgLevel(s); let got = 0;
    if (L > (T.lv || 1)) { got += L - (T.lv || 1); T.earned += L - (T.lv || 1); T.lv = L; }
    while (T.inf >= INFAMY_STEP) { T.inf -= INFAMY_STEP; T.earned++; got++; }
    if (got) say(s, `${got > 1 ? got + ' talent points' : 'A talent point'} for ${vName(s)}. Spend ${got > 1 ? 'them' : 'it'} at the Dark Tower.`, 'dm');
    return got;
  }
  function addInfamy(s, n) { if (!s.talents || !(n > 0)) return; s.talents.inf += n * (1 + talentFx(s).infamy); talentTick(s); }
  const summonDays = s => Math.max(1, SUMMON_DAYS - talentFx(s).summonDays);
  const lairDays = (s, k) => talentFx(s).empire ? 1 : Math.max(1, buildDays(k) - talentFx(s).buildDays);
  const siteYield = (s, n) => { const K = NODE_KINDS[n.kind]; return K.per + (minionType(s).perk === K.res ? 1 : 0) + (talentFx(s).yield[K.res] || 0); };
  // a learned talent's monster bonuses, applied to a fighting unit
  function talentPower(s, type) {
    const fx = talentFx(s); const a = fx.modAll, m = fx.mod[type]; const C = CREATURES[type]; if (!C || (!m && !a.hp && !a.ac && !a.hit && !a.dmg)) return 1;
    const g = f => a[f] + ((m && m[f]) || 0); const die = Math.max(1, C.dice[0] * (C.dice[1] + 1) / 2 + C.dice[2]);
    const ehp = (1 + g('hp')) * (1 + 0.1 * g('ac')) * ((m && m.regen && !C.regen) ? 1.25 : 1) * ((m && m.drain && !C.drain) ? 1.35 : 1);
    const dpr = (1 + g('dmg') * C.dice[0] / die) * (1 + 0.05 * g('hit'));
    return Math.sqrt(ehp * dpr);
  }
  function talentMod(s, u) {
    const fx = talentFx(s); const a = fx.modAll, m = fx.mod[u.type] || { hp: 0, ac: 0, hit: 0, dmg: 0 };
    const hp = a.hp + m.hp; if (hp) u.hp = u.maxHp = Math.round(u.maxHp * (1 + hp));
    u.ac += a.ac + m.ac; u.hit += a.hit + m.hit;
    const d = a.dmg + m.dmg; if (d) { u.dice = u.dice.slice(); u.dice[2] += d; }
    if ((m.regen || a.regen) && !u.regen) u.regenT = true;   // a talent's regeneration is gentler than a troll's
    if (m.drain || a.drain) u.drain = true;
    return u;
  }
  const roman = n => ['', 'I', 'II', 'III', 'IV'][n] || String(n);

  /* --- what a lair raises, and how far its monsters can strike --- */
  function lairRate(s, o) {
    const D = DUNGEONS[o.dtype]; const wk = WEEKS_FX[s.weekFx] || {};
    // a fixed brood per night, like a dwelling: the stronger the heroes, the deadlier the lairs you need
    const fx = talentFx(s);
    return D.rate * ((o.level || 1) >= 2 ? 1.75 : 1) * (D.home.indexOf(terrainAt(s, o.x, o.y)) >= 0 ? 1.25 : 1) * (wk.creature === D.unit ? 1.5 : 1) * (wk.allBoost || 1) * (1 + fx.rateAll + (fx.rate[D.unit] || 0));
  }
  const lairCap = (s, o) => Math.max(lairRate(s, o) * GARRISON_DAYS, CREATURES[DUNGEONS[o.dtype].unit].base * 2) * (1 + talentFx(s).cap);
  const bandsPerLair = s => BANDS_PER_LAIR + talentFx(s).bands;
  const lairWrecked = (s, o) => !!o.wrecked && o.wrecked > dayIndex(s);
  function wreckLair(s, o) { const d = talentFx(s).warded ? 1 : 4; o.wrecked = dayIndex(s) + d; for (const k of Object.keys(o.pool)) o.pool[k] = 0; o.known = false; say(s, `The heroes wreck the ${DUNGEONS[o.dtype].name}. It will take your minions ${d > 1 ? 'four days' : 'a day'} to dig it out.`, 'big'); }
  const lairCount = o => Math.floor((o.pool && o.pool[DUNGEONS[o.dtype].unit]) || 0);
  function lairsProduce(s) {
    const out = []; out.released = [];
    for (const o of builtLairs(s)) {
      if (lairWrecked(s, o)) continue;
      const u = DUNGEONS[o.dtype].unit; const before = lairCount(o); const cap = lairCap(s, o);
      if ((o.pool[u] || 0) < cap) o.pool[u] = Math.min(cap, (o.pool[u] || 0) + lairRate(s, o));
      const n = lairCount(o) - before; if (n > 0) out.push([u, n]);
      // two nights' brood marches out as a band and waits by the lair
      if (lairCount(o) >= bandAt(s, o) && bandsOf(s, o) < bandsPerLair(s)) { const b = releaseBand(s, o); if (b) out.released.push(b.id); }
    }
    return out;
  }
  /* --- bands: the monsters out on the map. You don't control them, but you can tell them what to do --- */
  const BAND_NIGHTS = 2, BANDS_PER_LAIR = 2, PATROL_RANGE = 14;
  // a level makes a band tougher, not just bigger: +2 to hit, +1 AC, +30% hit points, +1 damage, and a fifth more of them (up to level 5)
  const BAND_MAX_LEVEL = 5, LVL_POW = [1, 1, 1.75, 3, 5, 8];
  const bandGrowth = () => 1.2;
  const bandPower = (o, s) => stackPower(o.type, o.count) * LVL_POW[Math.min(BAND_MAX_LEVEL, o.lvl || 1)] * (s ? talentPower(s, o.type) : 1);
  // how a band looks to the heroes sizing it up: high-level heroes cut through hordes of weak monsters (spells, armour),
  // and are a good deal stronger than their raw numbers say
  const HERO_EDGE = L => 1 + 0.06 * (L - 1);
  function bandThreatPower(s, o) {
    const L = Math.max(1, avgLevel(s)); const unit = stackPower(o.type, 1) / stackPower('goblin', 1) * (1 + 0.5 * ((o.lvl || 1) - 1));
    return bandPower(o, s) * Math.min(1, Math.pow((unit * 2 + 2) / L, 2));
  }
  const fightRatio = (s, o) => partyPower(s) * HERO_EDGE(avgLevel(s)) / Math.max(0.001, bandThreatPower(s, o));
  // levelling costs gold, more for bigger and higher bands
  function bandLevelCost(o, s) { const cut = s ? talentFx(s).bandCost : 0; return { gold: Math.max(3, Math.ceil(stackPower(o.type, o.count) / stackPower('goblin', 1) * 0.25 * bandLevel(o) * (1 - cut))) }; }
  function bandAt(s, o) {
    const u = DUNGEONS[o.dtype].unit; const two = Math.max(1, Math.round(lairRate(s, o) * BAND_NIGHTS));
    const r1 = s.heroes && s.heroes.some(h => h.status === 'ok') ? fightRatio(s, { type: u, count: 1, lvl: 1 }) : 0;
    const worthy = Math.ceil(r1 / 1.8);
    return Math.max(1, Math.min(Math.floor(lairCap(s, o)), Math.max(two, worthy)));
  }
  const bandsOf = (s, o) => s.objects.filter(z => z.kind === 'stack' && z.lair === o.id).length;
  const bandLevel = o => o.lvl || 1;
  function releaseBand(s, o, count) {
    if (s.objects.filter(z => z.kind === 'stack').length >= MAX_STACKS) return null;
    const u = DUNGEONS[o.dtype].unit; const c = Math.min(Math.floor(o.pool[u] || 0), count || Infinity); if (c < 1) return null;
    const P = s.party; const spots = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = o.x + dx, y = o.y + dy; if ((!dx && !dy) || x < 0 || y < 0 || x >= MW || y >= MH) continue;
      if (!isFinite(tileCost(s, x, y)) || objAt(s, x, y) || siteAt(s, x, y) || nodeAt(s, x, y) || !mapOf(s).reach[tIdx(x, y)]) continue;
      if (Math.abs(x - P.x) <= 1 && Math.abs(y - P.y) <= 1) continue;
      if (villainOnMap(s) && s.villain.x === x && s.villain.y === y) continue;
      spots.push([x, y, Math.hypot(dx, dy) + (mapOf(s).road[tIdx(x, y)] ? 0.6 : 0)]);
    }
    if (!spots.length) return null;
    spots.sort((a, b) => a[2] - b[2]);
    o.pool[u] -= c;
    const b = spawnStack(s, o, u, c, spots[0][0], spots[0][1]); b.lvl = Math.min(BAND_MAX_LEVEL, 1 + talentFx(s).vets);
    say(s, `${c} ${c > 1 ? CREATURES[u].name : CREATURES[u].one} march${c > 1 ? '' : 'es'} out of your ${DUNGEONS[o.dtype].name}.`, 'dm');
    return b;
  }
  function bandCheck(s, id) {
    if (s.phase !== 'map') return [null, 'Not now.'];
    const o = s.objects.find(z => z.id === id && z.kind === 'stack'); if (!o) return [null, 'No monsters there.'];
    if (!dmSees(s, o.x, o.y)) return [null, 'You can\'t see them any more. Send a minion that way.'];
    return [o, null];
  }
  const bandName = o => `${o.count} ${o.count > 1 ? CREATURES[o.type].name : CREATURES[o.type].one}`;
  // a route for a band that keeps clear of the heroes, sites and anything else on the map
  function bandPath(s, o, tx, ty) {
    const P = s.party;
    const enter = (x, y) => (Math.abs(x - P.x) <= 1 && Math.abs(y - P.y) <= 1) || siteAt(s, x, y) || nodeAt(s, x, y) || s.objects.some(z => z !== o && z.x === x && z.y === y) ? Infinity : tileCost(s, x, y);
    const D = dijkstra(o.x, o.y, enter, null, tIdx(tx, ty));
    return tracePath(D.prev, tIdx(o.x, o.y), tIdx(tx, ty));
  }
  function patrolCheck(s, o, x, y) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return 'Off the map.';
    if (!dmSeen(s, x, y)) return 'You haven\'t explored there.';
    if (!isFinite(tileCost(s, x, y)) || siteAt(s, x, y) || nodeAt(s, x, y) || s.objects.some(z => z !== o && z.x === x && z.y === y)) return 'They can\'t patrol there.';
    if (Math.hypot(x - o.x, y - o.y) > PATROL_RANGE) return `Too far. Pick a spot within ${PATROL_RANGE} tiles of them.`;
    if (Math.abs(x - s.party.x) <= 1 && Math.abs(y - s.party.y) <= 1) return 'Not right on top of the heroes. Pick a spot near their road.';
    return null;
  }
  // patrol: walk back and forth between where they stand and a spot you pick, a day's march each night
  function bandPatrol(s, id, x, y) {
    const [o, err] = bandCheck(s, id); if (err) return err;
    if (x === o.x && y === o.y) { o.patrol = null; return null; }
    const e2 = patrolCheck(s, o, x, y); if (e2) return e2;
    if (!bandPath(s, o, x, y)) return 'They can\'t get there.';
    o.patrol = { a: [o.x, o.y], b: [x, y], to: 1 };
    say(s, `You send ${bandName(o).toLowerCase()} to patrol toward ${regionName(s, x, y)}.`, 'dm');
    return null;
  }
  function bandHold(s, id) { const [o, err] = bandCheck(s, id); if (err) return err; o.patrol = null; return null; }
  // level up: a bigger, bolder band (half again as many, then a third more)
  function bandLevelCheck(s, o) { if (bandLevel(o) >= BAND_MAX_LEVEL) return 'They can\'t grow any stronger.'; const c = bandLevelCost(o, s); if (!canAfford(s, c)) return `Needs ${priceText(c)}.`; return null; }
  function bandLevelUp(s, id) {
    const [o, err] = bandCheck(s, id); if (err) return err;
    const e2 = bandLevelCheck(s, o); if (e2) return e2;
    const L = bandLevel(o); pay(s, bandLevelCost(o, s)); o.count = Math.ceil(o.count * bandGrowth(o)); o.lvl = L + 1;
    say(s, `You whisper to the ${CREATURES[o.type].name.toLowerCase()} near ${regionName(s, o.x, o.y)}. They grow bolder and more join them: ${o.count}, level ${o.lvl}.`, 'dm');
    planRoute(s); return null;
  }
  // go away: off into the wilds, never to be seen again
  function bandAway(s, id) {
    const [o, err] = bandCheck(s, id); if (err) return err;
    s.objects = s.objects.filter(z => z !== o);
    say(s, `The ${CREATURES[o.type].name.toLowerCase()} near ${regionName(s, o.x, o.y)} slink off into the wilds.`, 'dm');
    planRoute(s); return null;
  }
  // the night: patrols walk their legs; bands without orders prowl near their lair; wild ones stay put
  function bandsMove(s) {
    const P = s.party; const today = dayKey(s);
    const closeToHeroes = (x, y) => Math.abs(x - P.x) <= 1 && Math.abs(y - P.y) <= 1;
    for (const o of s.objects.slice()) {
      if (o.kind !== 'stack') continue; o.trail = null;
      let path = null;
      if (o.patrol) {
        let tgt = o.patrol.to ? o.patrol.b : o.patrol.a;
        if (o.x === tgt[0] && o.y === tgt[1]) { o.patrol.to = o.patrol.to ? 0 : 1; tgt = o.patrol.to ? o.patrol.b : o.patrol.a; }
        path = bandPath(s, o, tgt[0], tgt[1]);
      } else if (o.home && o.movedDay !== today && Math.hypot(o.x - o.home.x, o.y - o.home.y) <= LEASH + 0.5 && Math.hypot(o.x - P.x, o.y - P.y) > 2.5 && chance(0.5)) {
        const R = unitReach(s, o.x, o.y, Math.min(stackMP(o), 30), o.id); const opts = [];
        for (const [i] of R.tiles) { const x = i % MW, y = (i / MW) | 0; if (Math.hypot(x - o.home.x, y - o.home.y) > LEASH || Math.abs(x - P.x) <= 2 && Math.abs(y - P.y) <= 2 || nodeAt(s, x, y)) continue; opts.push([x, y]); }
        if (opts.length) { const [x, y] = pick(opts); path = tracePath(R.prev, tIdx(o.x, o.y), tIdx(x, y)); }
      }
      if (!path || !path.length) continue;
      let left = stackMP(o), px = o.x, py = o.y; const trail = [[px, py]];
      for (const [nx, ny] of path) { const c = stepCost(s, px, py, nx, ny); if (c > left || closeToHeroes(nx, ny)) break; left -= c; px = nx; py = ny; trail.push([px, py]); }
      // never stop on top of a site or something else
      while (trail.length > 1) { const [lx, ly] = trail[trail.length - 1]; if (!siteAt(s, lx, ly) && !nodeAt(s, lx, ly) && !s.objects.some(z => z !== o && z.x === lx && z.y === ly)) break; trail.pop(); }
      [px, py] = trail[trail.length - 1];
      if (trail.length < 2) continue;
      o.x = px; o.y = py; o.trail = trail;
      if (o.patrol) { const tgt = o.patrol.to ? o.patrol.b : o.patrol.a; if (o.x === tgt[0] && o.y === tgt[1]) o.patrol.to = o.patrol.to ? 0 : 1; }
      if (!o.known) o.known = inSight(s, o.x, o.y);
    }
  }
  function lairReach(o, s) { const C = CREATURES[DUNGEONS[o.dtype].unit]; return C.mspd + 3 + (C.flyer ? 2 : 0) + ((o.level || 1) >= 2 ? 2 : 0) + (s ? talentFx(s).reach : 0); }
  // walking distance in tiles from the party, remembered while the party stands still
  let PD = null;
  function partyDist(s) {
    const key = s.seed + ':' + s.party.x + ',' + s.party.y;
    if (PD && PD.key === key) return PD.dist;
    const D = dijkstra(s.party.x, s.party.y, (x, y) => isFinite(tileCost(s, x, y)) ? 1 : Infinity);
    PD = { key, dist: D.dist }; return D.dist;
  }
  const lairDist = (s, o) => partyDist(s)[tIdx(o.x, o.y)];
  const inReach = (s, o) => !o.building && !lairWrecked(s, o) && lairDist(s, o) <= lairReach(o, s);
  const lairsInReach = s => builtLairs(s).filter(o => inReach(s, o)).sort((a, b) => lairDist(s, a) - lairDist(s, b));
  // what you can send today: everything raised by lairs within reach of the heroes
  function garrisonCount(s, t) { return sum(lairsInReach(s).filter(o => DUNGEONS[o.dtype].unit === t), lairCount); }
  function garrisonList(s) { return CREATURE_ORDER.filter(t => garrisonCount(s, t) >= 1).map(t => [t, garrisonCount(s, t)]); }
  function attackCheck(s) {
    if (s.phase !== 'map') return 'Not now.';
    if (!living(s).length) return 'Nobody to attack.';
    if (s.attackDay === dayKey(s)) return 'You already attacked today. End the day to send another.';
    if (!lairsInReach(s).some(o => lairCount(o) >= 1)) return builtLairs(s).length ? 'None of your lairs can reach the heroes today.' : 'You have no lairs yet. Build one near the heroes.';
    return null;
  }
  function cleanStacks(s, stacks) {
    const out = [];
    for (const [t, n0] of stacks || []) {
      const n = Math.min(garrisonCount(s, t), Math.floor(n0)); if (!CREATURES[t] || n < 1) continue;
      const ex = out.find(x => x[0] === t); if (ex) ex[1] = Math.min(garrisonCount(s, t), ex[1] + n); else out.push([t, n]);
    }
    return out.slice(0, MAX_ATTACK_STACKS);
  }
  function sendAttack(s, stacks) {
    const err = attackCheck(s); if (err) return err;
    const st = cleanStacks(s, stacks); if (!st.length) return 'Pick some monsters from the lairs in reach first.';
    // take from the nearest lairs first, and remember who came from where so the survivors go home
    const from = [];
    for (const [t, n] of st) {
      let left = n;
      for (const o of lairsInReach(s).filter(z => DUNGEONS[z.dtype].unit === t)) { const k = Math.min(left, lairCount(o)); if (k < 1) continue; o.pool[t] -= k; from.push([o.id, t, k]); left -= k; if (!left) break; }
    }
    s.attackDay = dayKey(s);
    s.party.path = []; s.party.pending = null;
    say(s, `You send a war party against the heroes: ${st.map(([t, n]) => `${n} ${CREATURES[t].name}`).join(', ')}.`, 'dm');
    startBattle(s, null, { stacks: st, attack: true });
    s.battle.sentFrom = from;
    return null;
  }
  function returnSurvivors(s, b, byKind) {
    const home = [];
    for (const k of byKind) {
      let left = k.count;
      for (const [id, t, n] of b.sentFrom || []) { if (t !== k.type || left < 1) continue; const o = myLairs(s).find(z => z.id === id); if (!o) continue; const back = Math.min(left, n); o.pool[t] = (o.pool[t] || 0) + back; left -= back; }
      if (k.count - left > 0) home.push([k.type, k.count - left]);
    }
    return home;
  }
  // the minions' day: walk, then dig, chop, haul and build
  function minionDay(s) {
    const T = minionType(s); const mp = T.perk === 'fast' ? MINION_MP * 2 : MINION_MP; const out = { res: { gold: 0, lumber: 0, ore: 0 }, built: [], opened: [], yields: [], plot: 0, summoned: [], library: false, researched: null };
    const sm = summonDay(s); if (sm) out.summoned.push(sm);
    out.library = libraryDay(s); out.researched = null;
    // talents that pay every night: vaults and hoards, a tithe per lair, and the Count's cut of Millbrook's purse
    { const fx = talentFx(s); let g = fx.nightly + fx.perLair * builtLairs(s).length;
      if (fx.townTithe && s.town) { const t = Math.min(fx.townTithe, Math.floor(s.town.res.gold || 0)); s.town.res.gold -= t; g += t; }
      if (g) { s.res.gold += g; out.res.gold += g; } }
    for (const m of s.minions || []) {
      m.from = [m.x, m.y]; let left = mp; let px = m.x, py = m.y;
      while (m.path.length) { const [nx, ny] = m.path[0]; const c = stepCost(s, px, py, nx, ny); if (c > left) break; left -= c; m.path.shift(); px = nx; py = ny; }
      m.x = px; m.y = py;
      if (m.job && m.job.kind === 'move' && !m.path.length) m.job = null;
    }
    // minions plotting in the dark: a Lore each
    for (const n of s.nodes || []) {
      if (nodeRaided(s, n)) continue;
      const K = NODE_KINDS[n.kind]; const w = workersAt(s, n).slice(0, K.cap); if (!w.length) continue;
      if (!n.dev) { n.dev = true; out.opened.push(n.id); say(s, `Your ${T.one.toLowerCase()} turns the ${K.raw} near ${regionName(s, n.x, n.y)} into a ${K.name}.`, 'dm'); continue; }
      const got = siteYield(s, n) * w.length; s.res[K.res] += got; out.res[K.res] += got; out.yields.push([n.id, got]);
    }
    for (const o of myLairs(s).filter(z => z.building > 0)) {
      const bs = s.minions.filter(m => m.job && m.job.kind === 'build' && m.job.lair === o.id && !m.path.length && m.x === o.x && m.y === o.y);
      if (!bs.length) continue;
      o.building = Math.max(0, o.building - bs.length * (T.perk === 'build' ? 2 : 1));
      if (!o.building) {
        const D = DUNGEONS[o.dtype]; s.unlocked[o.dtype] = true; o.pool[D.unit] = Math.max(1, lairRate(s, o));
        for (const m of bs) m.job = null;
        out.built.push(o.id); say(s, `The ${D.name} is finished near ${regionName(s, o.x, o.y)}. The first ${CREATURES[D.unit].name.toLowerCase()} crawl out.`, 'dm');
      }
    }
    // builders whose lair is gone stop working
    for (const m of s.minions || []) if (m.job && m.job.kind === 'build' && !myLairs(s).some(o => o.id === m.job.lair)) m.job = null;
    return out;
  }
  // heroes who reach a worked site drive your minions off; about one in four doesn't make it home
  function scatterMinions(s, list) {
    let lost = 0; const tw = siteOf(s, 'tower');
    for (const m of list) {
      if (chance(0.25)) { s.minions = s.minions.filter(z => z !== m); lost++; continue; }
      m.job = null; const [hx, hy] = freeNear(s, tw.x, tw.y, 3); m.path = minionPath(s, m, hx, hy) || []; m.trip = m.path.length;
    }
    return lost;
  }
  // a lair within two tiles of a site guards it: raiders have to get past its garrison first
  function guardOf(s, n) { return builtLairs(s).filter(o => Math.hypot(o.x - n.x, o.y - n.y) <= 2.3 && lairCount(o) >= 1).sort((a, b) => lairCount(b) - lairCount(a))[0] || null; }
  function raidNode(s, n) {
    const w = assignedTo(s, n).filter(m => Math.hypot(m.x - n.x, m.y - n.y) < 1.5);
    const lost = scatterMinions(s, w);
    n.raidedUntil = dayIndex(s) + 3;
    const K = NODE_KINDS[n.kind]; const h = byDriveLive(s, n.kind === 'gold' ? 'greed' : 'duty');
    const one = minionType(s).one.toLowerCase();
    const m = w.length ? `The heroes storm the ${nodeName(n)} and drive off your ${one}${lost ? `. It doesn't make it home` : `, which flees back to the tower`}. Nobody can work it for three days.` : `The heroes storm the ${nodeName(n)}. Nobody can work it for three days.`;
    say(s, m, 'big'); thrill(s, `Drove the villain's minions from the ${nodeName(n)}`, 2 + db(s, h, 1), h && h.id);
    giveXp(s, lvXp(s, 0.06));
    return m;
  }
  // a good place for a new lair: close enough to strike where the heroes are heading, out of their sight
  function lairSpots(s, k, n) {
    const D = DUNGEONS[k]; const reach = lairReach({ dtype: k, level: 1 }, s); const dist = partyDist(s);
    const P = s.party; const goal = P.path.length ? P.path[Math.min(P.path.length - 1, 6)] : [P.x, P.y];
    const out = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (spotCheck(s, x, y)) continue;
      const d = dist[tIdx(x, y)]; if (!isFinite(d) || d > reach + 3) continue;
      const g = Math.hypot(x - goal[0], y - goal[1]);
      const sc = -Math.abs(d - (reach - 2)) - g * 0.3 + (D.home.indexOf(terrainAt(s, x, y)) >= 0 ? 1 : 0) - s.objects.filter(o => o.kind === 'dungeon' && Math.hypot(o.x - x, o.y - y) < 4).length;
      out.push({ x, y, sc });
    }
    return out.sort((a, b) => b.sc - a.sc).slice(0, n || 5);
  }

  // a magic item left on the heroes' road: the surest way to get them ready for the showdown
  const giftCost = s => 8 + 4 * (s.gifts || 0);
  function giftCheck(s) {
    if (s.phase !== 'map') return 'Not now.';
    if (s.giftDay === dayKey(s)) return 'One treasure a day.';
    if (s.lore < giftCost(s)) return `Needs ${giftCost(s)} Lore.`;
    return null;
  }
  function gift(s) {
    const err = giftCheck(s); if (err) return err;
    s.lore -= giftCost(s); s.gifts = (s.gifts || 0) + 1; s.giftDay = dayKey(s);
    const t = grantArtifact(s, randomArtifact(s));
    say(s, `By the roadside the heroes find ${t}`, 'good'); thrill(s, 'They found a magic item', 2);
    return null;
  }
  // a quick first pick for the composer: the strongest kinds you have, sized for a close fight on paper
  function fairAttack(s, scale) {
    const pp = partyPower(s); const target = pp / 1.9 * (scale || 1);
    const avail = garrisonList(s).filter(([t]) => stackPower(t, 1) <= target * 0.95);
    if (!avail.length) return [];
    avail.sort((a, b) => stackPower(b[0], b[1]) - stackPower(a[0], a[1]));
    const use = avail.slice(0, 3); const tot = sum(use, ([t, n]) => stackPower(t, n));
    if (tot <= target) return use.map(([t, n]) => [t, n]);
    return use.map(([t, n]) => [t, Math.max(1, Math.min(n, Math.round(n * target / tot)))]);
  }

  /* ================= the citadel (tech tree) ================= */
  const hasTech = (s, k) => !k || k === 'throne' || (s.unlocked ? (k === 'library' || k === 'forge' || k === 'spire' ? libraryLevel(s) > 0 : unlocked(s, TECH_LAIR[k])) : !!(s.base && s.base.b ? s.base.b[k] : s.citadel && s.citadel.built[k]));
  function techCheck(s, k) {
    const T = TECH[k]; if (!T) return 'Unknown building.';
    if (hasTech(s, k)) return 'Already built.';
    if (s.phase !== 'map') return 'Build between days.';
    const miss = T.req.filter(r => !hasTech(s, r));
    if (miss.length) return `Needs ${miss.map(r => TECH[r].name).join(' and ')}.`;
    if (s.citadel.day === dayKey(s)) return 'You already built something today. One building a day.';
    if (s.lore < T.cost) return `You need ${T.cost} Lore.`;
    return null;
  }
  function buildTech(s, k) {
    const err = techCheck(s, k); if (err) return err;
    s.lore -= TECH[k].cost; s.citadel.built[k] = dayKey(s); s.citadel.day = dayKey(s);
    say(s, `Your minions raise the ${TECH[k].name} at the Dark Tower. ${TECH[k].gives}`, 'dm');
    return null;
  }
  // what a building, monster, lair, trap or dark power still needs (null when unlocked)
  function lockedBy(s, kind) {
    const k = CREATURE_TECH[kind] || (DUNGEONS[kind] && DUNGEONS[kind].tech) || TRAP_TECH[kind] || POWER_TECH[kind];
    return k && !hasTech(s, k) ? k : null;
  }
  const loreIncome = s => 2 + Math.min(2, Math.floor((s.week - 1) / 2)) + 2 * libraryLevel(s);
  const rumorCost = s => hasTech(s, 'spire') ? 0 : 1;

  /* ================= DM placement ================= */
  function itemCost(s, kind, size) {
    if (CREATURES[kind]) {
      let c = CREATURES[kind].cost;
      if (WEEKS_FX[s.weekFx].creature === kind) c = Math.max(1, c - 1);
      return c * (size || 1);
    }
    if (DUNGEONS[kind]) return DUNGEONS[kind].cost - (DUNGEONS[kind].grow[WEEKS_FX[s.weekFx].creature] ? 1 : 0);
    if (kind === 'omen' && s.weekFx === 'omens') return 1;
    return ITEMS[kind].cost;
  }
  function placeCheck(s, kind, x, y, size) {
    if (s.phase !== 'map') return 'You can only place things between days.';
    if (kind === 'tourney') {
      if (s.townEvent) return 'A tournament is already announced.';
      if (s.march) return 'No tournaments while the party marches on the Dark Tower.';
      return s.lore >= itemCost(s, kind) ? null : `You need ${itemCost(s, kind)} Lore.`;
    }
    const lock = lockedBy(s, kind);
    if (lock) return `Build the ${TECH[lock].name} in your citadel first.`;
    if (CREATURES[kind] && CREATURES[kind].hidden) return `Only ${vName(s)} can lead them.`;
    if (CREATURES[kind] && s.objects.filter(o => o.kind === 'stack').length >= MAX_CONJURED) return `The land can hold ${MAX_CONJURED} monster stacks at most. Move or remove some first.`;
    if (x < 0 || y < 0 || x >= MW || y >= MH) return 'Off the map.';
    const M = mapOf(s);
    const tw = siteOf(s, 'tower');
    if (Math.hypot(x - tw.x, y - tw.y) < 1.5) return 'Your citadel stands there.';
    if (DUNGEONS[kind] && s.objects.some(o => o.kind === 'dungeon' && Math.hypot(o.x - x, o.y - y) < 3)) return 'Too close to another lair. They fight over territory.';
    if (!isFinite(tileCost(s, x, y))) return 'Nothing can stand there.';
    if (!M.reach[tIdx(x, y)]) return 'The party could never reach that spot.';
    if (objAt(s, x, y) || siteAt(s, x, y)) return 'Something is already there.';
    if (villainOnMap(s) && s.villain.x === x && s.villain.y === y) return `${vName(s)} is standing there.`;
    if (s.party.x === x && s.party.y === y) return 'The party is standing there.';
    if (inSight(s, x, y)) return 'The party can see that spot. Build things where they can\'t see.';
    if (Math.hypot(x - siteOf(s, 'town').x, y - siteOf(s, 'town').y) < 2.5) return 'Millbrook\'s guards keep its surroundings safe.';
    const cost = itemCost(s, kind, size);
    if (s.lore < cost) return `You need ${cost} Lore.`;
    return null;
  }
  function place(s, kind, x, y, size) {
    const err = placeCheck(s, kind, x, y, size); if (err) return err;
    const cost = itemCost(s, kind, size);
    s.lore -= cost;
    if (kind === 'tourney') { s.townEvent = 'tourney'; say(s, 'Heralds ride out: Millbrook will hold a tournament! Champions are welcome.', 'dm'); planRoute(s); return null; }
    let o;
    if (CREATURES[kind]) o = { kind: 'stack', type: kind, count: CREATURES[kind].base * (size || 1), size: size || 1 };
    else if (DUNGEONS[kind]) { o = { kind: 'dungeon', dtype: kind, pool: {}, level: 1, mode: 'roam' }; for (const t of Object.keys(DUNGEONS[kind].grow)) o.pool[t] = DUNGEONS[kind].grow[t] * 2; }
    else o = { kind };
    Object.assign(o, { id: 'o' + (s.uid++), x, y, known: false, rumored: false, paid: cost, placed: dayKey(s), movedDay: 0 });
    if (kind === 'artifact') {
      const owned = s.heroes.flatMap(h => h.items.map(i => i.id)).concat(s.crown ? ['crown'] : [], s.boots ? ['boots'] : []);
      o.art = pickArtifact(s, s.objects.filter(z => z.art).map(z => z.art)).id;
    }
    s.objects.push(o);
    planRoute(s);
    return null;
  }
  function removeObject(s, id) {
    const o = s.objects.find(z => z.id === id);
    if (!o || s.phase !== 'map') return 'Nothing to remove.';
    if (o.known) return 'The party already knows about it.';
    const fresh = o.placed === dayKey(s) && o.kind !== 'stack' || (o.kind === 'stack' && o.placed === dayKey(s) && !o.fromDungeon);
    if (fresh) s.lore += o.paid;
    s.objects = s.objects.filter(z => z !== o);
    for (const q of s.quests) if (q.status === 'open' && refEq(q.ref, { kind: 'obj', id })) q.status = 'void';
    planRoute(s);
    return fresh ? `Refunded ${o.paid} Lore.` : 'Removed. Things placed on earlier days have no refund.';
  }
  function rumor(s, id) {
    const o = s.objects.find(z => z.id === id);
    if (!o || s.phase !== 'map') return 'Nothing to whisper about.';
    if (isTrap(o)) return 'Nobody spreads rumors about their own traps.';
    if (o.rumored) return 'That rumor is already spreading.';
    const rc = rumorCost(s);
    if (s.lore < rc) return `You need ${rc} Lore.`;
    s.lore -= rc; o.rumored = true; o.known = true;
    say(s, `A rumor spreads through the Millbrook tavern about ${o.kind === 'stack' ? quantityWord(o.count).toLowerCase() + ' ' + CREATURES[o.type].name : o.kind === 'dungeon' ? 'a ' + DUNGEONS[o.dtype].name : 'a ' + ITEMS[o.kind].name}.`, 'dm');
    planRoute(s);
    return null;
  }

  /* ================= dungeons and moving monsters ================= */
  function releaseCost() { return 0; }
  function freeAdjacent(s, x, y) {
    const out = [];
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      if (!isFinite(tileCost(s, nx, ny)) || objAt(s, nx, ny) || siteAt(s, nx, ny)) continue;
      if (s.party.x === nx && s.party.y === ny) continue;
      if (villainOnMap(s) && s.villain.x === nx && s.villain.y === ny) continue;
      out.push([nx, ny]);
    }
    return out;
  }
  function release(s, id, type, count) {
    const o = s.objects.find(z => z.id === id && z.kind === 'dungeon');
    if (!o || s.phase !== 'map') return 'No dungeon there.';
    count = Math.floor(count);
    if (!(count >= 1) || count > Math.floor(o.pool[type] || 0)) return 'Not that many creatures in the pool.';
    if (s.objects.filter(z => z.kind === 'stack').length >= MAX_STACKS) return `The land can only hold ${MAX_STACKS} monster stacks at once.`;
    const spots = freeAdjacent(s, o.x, o.y); if (!spots.length) return 'No room around the lair.';
    const [x, y] = spots[0];
    o.pool[type] -= count;
    spawnStack(s, o, type, count, x, y);
    say(s, `${count} ${CREATURES[type].name} crawl out of the ${DUNGEONS[o.dtype].name}.`, 'dm');
    planRoute(s);
    return null;
  }
  function spawnStack(s, lair, type, count, x, y) {
    const st = { id: 'o' + (s.uid++), kind: 'stack', type, count, size: 1, x, y, known: inSight(s, x, y), rumored: false, paid: 0, placed: dayKey(s), movedDay: 0, fromDungeon: true, lair: lair.id, home: { x: lair.x, y: lair.y } };
    s.objects.push(st);
    return st;
  }
  const lairMult = (s, o) => (o.level >= 2 ? LAIR_UP.growth : 1) * (DUNGEONS[o.dtype].home.indexOf(terrainAt(s, o.x, o.y)) >= 0 ? 1.5 : 1);
  // bands grow bolder as the weeks pass, and bigger from an upgraded lair
  // bands grow bolder as the heroes grow famous
  const lvScale = s => 1 + 0.12 * (avgLevel(s) - 1);
  const bandSize = (s, o, t) => DUNGEONS[o.dtype].band[t] * lvScale(s) * (o.level >= 2 ? 1.25 : 1);
  const lairBands = (s, o) => s.objects.filter(z => z.kind === 'stack' && z.lair === o.id).length;
  function lairGrow(s, o) {
    const D = DUNGEONS[o.dtype]; const m = lairMult(s, o) * lvScale(s);
    for (const t of Object.keys(D.grow)) o.pool[t] = Math.min(Math.max(D.grow[t] * 7 * m, bandSize(s, o, t) * 1.5), (o.pool[t] || 0) + D.grow[t] * m);
  }
  // a lair on the roam sends one full band out into the area each night
  function lairSpawn(s, o) {
    if (o.mode !== 'roam' || lairBands(s, o) >= LAIR_UP.cap[o.level || 1]) return null;
    if (s.objects.filter(z => z.kind === 'stack').length >= MAX_STACKS) return null;
    const D = DUNGEONS[o.dtype];
    const t = Object.keys(D.band).find(k => Math.floor(o.pool[k] || 0) >= Math.round(bandSize(s, o, k))); if (!t) return null;
    const P = s.party; const spots = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = o.x + dx, y = o.y + dy; if ((!dx && !dy) || x < 0 || y < 0 || x >= MW || y >= MH) continue;
      if (!isFinite(tileCost(s, x, y)) || objAt(s, x, y) || siteAt(s, x, y) || (P.x === x && P.y === y)) continue;
      if (Math.abs(x - P.x) <= 1 && Math.abs(y - P.y) <= 1) continue;
      if (villainOnMap(s) && s.villain.x === x && s.villain.y === y) continue;
      if (!mapOf(s).reach[tIdx(x, y)]) continue;
      spots.push([x, y, Math.hypot(dx, dy) + rng() * 0.8]);
    }
    if (!spots.length) return null;
    spots.sort((a, b) => a[2] - b[2]);
    const n = Math.max(1, Math.round(bandSize(s, o, t)));
    const c = Math.min(Math.floor(o.pool[t]), n);
    o.pool[t] -= c;
    const st = spawnStack(s, o, t, c, spots[0][0], spots[0][1]);
    say(s, `${c} ${CREATURES[t].name} crawl out of the ${D.name} and prowl the land around it.`, 'dm');
    return st;
  }
  // monsters bred by a lair wander near it unless you moved them that day or sent them far away
  const LEASH = 4;
  function patrol(s) {
    const P = s.party; const today = dayKey(s); let moved = 0;
    for (const o of s.objects.slice()) {
      if (o.kind !== 'stack' || !o.home || o.movedDay === today) continue;
      if (Math.hypot(o.x - o.home.x, o.y - o.home.y) > LEASH + 0.5) continue;
      if (Math.hypot(o.x - P.x, o.y - P.y) <= 2.5) continue; // hold position when the party is close
      if (!chance(0.65)) continue;
      const R = unitReach(s, o.x, o.y, Math.min(stackMP(o), 30), o.id);
      const opts = [];
      for (const [i] of R.tiles) {
        const x = i % MW, y = (i / MW) | 0;
        if (Math.hypot(x - o.home.x, y - o.home.y) > LEASH) continue;
        if (Math.abs(x - P.x) <= 2 && Math.abs(y - P.y) <= 2) continue;
        opts.push([x, y]);
      }
      if (!opts.length) continue;
      const [x, y] = pick(opts);
      o.x = x; o.y = y; moved++;
      if (!o.known) o.known = inSight(s, x, y) || !!questOn(s, { kind: 'obj', id: o.id });
    }
    return moved;
  }
  function upgradeLair(s, id) {
    const o = s.objects.find(z => z.id === id && z.kind === 'dungeon');
    if (!o || s.phase !== 'map') return 'No lair there.';
    if ((o.level || 1) >= 2) return 'Already fully upgraded.';
    const c = lairUpCost(o.dtype); if (s.lore < c) return `You need ${c} Lore.`;
    s.lore -= c; o.level = 2;
    say(s, `The ${DUNGEONS[o.dtype].name} grows deeper. It breeds faster and sends out bigger bands.`, 'dm');
    return null;
  }
  function setLairMode(s, id, mode) {
    const o = s.objects.find(z => z.id === id && z.kind === 'dungeon'); if (!o) return 'No lair there.';
    o.mode = mode === 'hold' ? 'hold' : 'roam'; return null;
  }
  // reachable tiles for a DM unit; returns Map tileIndex -> {d, prev}
  function unitReach(s, sx, sy, mp, selfId) {
    const P = s.party;
    const blockedFor = (x, y) => {
      if (siteAt(s, x, y)) return !(selfId === 'villain' && siteAt(s, x, y).id === 'tower');
      if (s.objects.some(o => o.x === x && o.y === y && o.id !== selfId)) return true;
      if (selfId !== 'villain' && villainOnMap(s) && s.villain.x === x && s.villain.y === y) return true;
      return false;
    };
    const enter = (x, y) => (x === P.x && y === P.y) ? Infinity : blockedFor(x, y) ? Infinity : tileCost(s, x, y);
    const nearParty = (x, y) => Math.abs(x - P.x) <= 1 && Math.abs(y - P.y) <= 1;
    const D = dijkstra(sx, sy, enter, nearParty);
    const out = new Map();
    for (let i = 0; i < MW * MH; i++) if (D.dist[i] <= mp && i !== tIdx(sx, sy)) out.set(i, { d: D.dist[i], prev: D.prev[i] });
    return { tiles: out, prev: D.prev };
  }
  const stackMP = o => CREATURES[o.type].mspd * 10;
  function stackReach(s, id) {
    const o = s.objects.find(z => z.id === id && z.kind === 'stack'); if (!o) return null;
    if (o.movedDay === dayKey(s)) return { tiles: new Map(), prev: null, moved: true };
    return unitReach(s, o.x, o.y, stackMP(o), o.id);
  }
  function afterDmMove(s, unitKnownBefore, x, y) {
    const P = s.party;
    return Math.abs(x - P.x) <= 1 && Math.abs(y - P.y) <= 1;
  }
  function moveStack(s, id, x, y) {
    if (s.phase !== 'map') return { err: 'Monsters move between days.' };
    const o = s.objects.find(z => z.id === id && z.kind === 'stack'); if (!o) return { err: 'No monsters there.' };
    if (o.movedDay === dayKey(s)) return { err: 'That stack already moved today.' };
    const R = unitReach(s, o.x, o.y, stackMP(o), o.id);
    const e = R.tiles.get(tIdx(x, y)); if (!e) return { err: 'They can\'t get there today.' };
    const path = tracePath(R.prev, tIdx(o.x, o.y), tIdx(x, y)) || [[x, y]];
    const from = { x: o.x, y: o.y };
    o.x = x; o.y = y; o.movedDay = dayKey(s);
    const q = questOn(s, { kind: 'obj', id: o.id });
    o.known = inSight(s, x, y) || o.rumored || !!q;
    if (Math.abs(x - s.party.x) <= 1 && Math.abs(y - s.party.y) <= 1) {
      say(s, `${quantityWord(o.count)} ${CREATURES[o.type].name} charge the party!`, 'big');
      startBattle(s, o);
      return { battle: true, path, from };
    }
    planRoute(s);
    return { path, from };
  }

  /* ================= the villain ================= */
  function villainReach(s) {
    const V = s.villain; if (!villainOnMap(s)) return null;
    return unitReach(s, V.x, V.y, V.mp, 'villain');
  }
  function rideOut(s) {
    const V = s.villain;
    if (s.phase !== 'map') return `${vName(s)} moves between days.`;
    if (V.state !== 'lair') return V.state === 'banished' ? `${vName(s)} is still recovering for ${V.banish} more day${V.banish > 1 ? 's' : ''}.` : `${vName(s)} is already out.`;
    if (s.march) return `${vName(s)} awaits the heroes on the throne.`;
    const tower = siteOf(s, 'tower');
    V.state = 'map'; V.x = tower.x; V.y = tower.y; V.known = inSight(s, V.x, V.y);
    say(s, `${vName(s)} rides out from the Dark Tower.`, 'dm');
    return null;
  }
  function moveVillain(s, x, y) {
    const V = s.villain;
    if (s.phase !== 'map' || !villainOnMap(s)) return { err: `${vName(s)} isn't out on the map.` };
    const R = villainReach(s); const e = R.tiles.get(tIdx(x, y));
    if (!e) return { err: 'He can\'t get there today.' };
    const path = tracePath(R.prev, tIdx(V.x, V.y), tIdx(x, y)) || [[x, y]];
    const from = { x: V.x, y: V.y };
    V.mp -= e.d; V.x = x; V.y = y;
    const site = siteAt(s, x, y);
    if (site && site.id === 'tower') { V.state = 'lair'; V.known = false; say(s, `${vName(s)} returns to the Dark Tower.`, 'dm'); planRoute(s); return { path, from, home: true }; }
    V.known = inSight(s, x, y) || !!questOn(s, { kind: 'villain' });
    if (inSight(s, x, y)) reveal(s);
    if (Math.abs(x - s.party.x) <= 1 && Math.abs(y - s.party.y) <= 1) {
      say(s, `${vName(s)} and ${vP(s).his} army fall upon the party!`, 'boss');
      startVillainBattle(s);
      return { battle: true, path, from };
    }
    planRoute(s);
    return { path, from };
  }
  function recruit(s, type, size) {
    const V = s.villain;
    if (s.phase !== 'map') return 'Recruit between days.';
    if (V.state !== 'lair') return `${vName(s)} can only muster troops at the Dark Tower.`;
    const lock = lockedBy(s, type); if (lock) return `Build the ${TECH[lock].name} first.`;
    const cost = itemCost(s, type, size); if (s.lore < cost) return `You need ${cost} Lore.`;
    const ex = V.army.find(a => a.type === type);
    if (!ex && V.army.length >= 3) return 'His army holds three stacks at most.';
    s.lore -= cost;
    const n = CREATURES[type].base * size;
    if (ex) ex.count += n; else V.army.push({ type, count: n });
    say(s, `${n} ${CREATURES[type].name} swear themselves to ${vName(s)}.`, 'dm');
    return null;
  }
  function dismiss(s, type) { const V = s.villain; if (s.phase !== 'map' || V.state !== 'lair') return 'Only at the Dark Tower.'; V.army = V.army.filter(a => a.type !== type); return null; }
  function lairUpgrade(s, key) {
    const V = s.villain; const U = LAIR[key];
    if (s.phase !== 'map') return 'Upgrade between days.';
    if ((V.up[key] || 0) >= U.max) return 'Already at its peak.';
    const lock = lockedBy(s, key); if (lock) return `Build the ${TECH[lock].name} first.`;
    if (s.lore < U.cost) return `You need ${U.cost} Lore.`;
    s.lore -= U.cost; V.up[key] = (V.up[key] || 0) + 1;
    say(s, `${vName(s)} gains ${U.name}.`, 'dm');
    return null;
  }

  /* ================= thrill bookkeeping ================= */
  function thrill(s, label, v, heroId) {
    if (!v && !label) return;
    s.wk.thrill.push({ label, v });
    if (heroId) s.wk.spot[heroId] = true;
    s.todayActive = true;
  }
  function db(s, h, v) { return !h ? 0 : (s.wk.spot[h.id] ? Math.ceil(v / 3) : v); }
  const byDriveLive = (s, d) => s.heroes.find(h => h.status === 'ok' && h.drive === d);

  /* ================= checks (dice records) ================= */
  function check(h, skill, dc, title) {
    const r0 = d20(); const r = has(h, 'reliable') ? Math.max(10, r0) : r0; const bonus = skillBonus(h, skill); const total = r + bonus;
    const ok = r === 20 || (r !== 1 && total >= dc);
    return { t: 'roll', kind: 'check', title, who: h.name, skill: SKILL_NAMES[skill], d20: [r], nat: r, bonus, extras: [], total, vs: dc, vsLabel: 'DC', result: ok ? 'success' : 'fail', crit: r === 20, fumble: r === 1, notes: [] };
  }
  function saveRoll(name, bonus, dc, title) {
    const r = d20(); const total = r + bonus; const ok = r === 20 || (r !== 1 && total >= dc);
    return { t: 'roll', kind: 'save', title: title || `${name} saves`, who: name, d20: [r], nat: r, bonus, extras: [], total, vs: dc, vsLabel: 'DC', result: ok ? 'success' : 'fail', notes: [] };
  }
  function dmgRecord(title, n, sides, flat, mult) {
    const dice = rollDice(n, sides).map(v => ({ s: sides, v }));
    const raw = sum(dice, d => d.v) + (flat || 0);
    const total = Math.max(1, Math.round(raw * (mult || 1)));
    return { t: 'roll', kind: 'dmg', title, dmg: { dice, flat: flat || 0, scale: 1, mult: mult || 1, total } };
  }

  /* ================= moving the party ================= */
  function stepCost(s, ax, ay, bx, by) { return tileCost(s, bx, by) * (ax !== bx && ay !== by ? 1.4 : 1); }
  function partyStep(s) {
    const P = s.party;
    if (s.phase !== 'map') return { t: 'none' };
    if (!living(s).length) return { t: 'stop', why: 'dead' };
    if (P.pending && P.pending.x === P.x && P.pending.y === P.y) {
      P.pending = null;
      const r = arrive(s, P.x, P.y, { x: P.x, y: P.y }, []);
      if (r) return r;
    }
    P.pending = null;
    if (!P.path.length) {
      planRoute(s);
      if (!P.path.length) {
        // marching on the tower while already standing at its gate: storm it now (they never "arrive" otherwise)
        const here = siteAt(s, P.x, P.y);
        if (s.march && here && here.kind === 'tower') { const r = visitSite(s, here); if (r && r.battle) return { t: 'battle', from: { x: P.x, y: P.y }, x: P.x, y: P.y }; }
        return { t: 'stop', why: 'nothing' };
      }
    }
    const [nx, ny] = P.path[0];
    const cost = stepCost(s, P.x, P.y, nx, ny);
    if (P.mp < cost) return { t: 'stop', why: 'tired' };
    P.path.shift(); P.prev = { x: P.x, y: P.y }; P.x = nx; P.y = ny; P.mp -= cost;
    const spotted = reveal(s); if (s.dmSeen) dmReveal(s);
    const from = P.prev;
    // hidden trap underfoot
    const trap = s.objects.find(o => isTrap(o) && o.x === nx && o.y === ny);
    if (trap) { s.objects = s.objects.filter(o => o !== trap); const r = resolveTrap(s, trap); P.path = []; return { t: 'trap', from, x: nx, y: ny, rolls: r.rolls, msgs: r.msgs }; }
    // the villain next to them
    if (villainAdjacent(s, nx, ny)) {
      P.path = [];
      if (siteAt(s, nx, ny) || s.objects.some(z => z.x === nx && z.y === ny && z.kind !== 'stack')) P.pending = { x: nx, y: ny };
      say(s, `The party clashes with ${vName(s)} and ${vP(s).his} army!`, 'boss');
      startVillainBattle(s);
      return { t: 'battle', from, x: nx, y: ny };
    }
    const st = stackGuarding(s, nx, ny);
    if (st) {
      const ratio = fightRatio(s, st);
      if (judge(ratio, 0) === 'trivial' && chance(0.7) && !questOn(s, { kind: 'obj', id: st.id })) {
        s.objects = s.objects.filter(o => o !== st);
        const m = `${quantityWord(st.count)} ${CREATURES[st.type].name} take one look at the party and scatter. Too easy to be worth any experience.`;
        say(s, m, 'quirk'); thrill(s, `${CREATURES[st.type].name} fled without a fight`, 0);
        s.todayActive = true; P.path = [];
        return { t: 'event', from, x: nx, y: ny, msgs: [m] };
      }
      P.path = [];
      if (siteAt(s, nx, ny) || s.objects.some(z => z.x === nx && z.y === ny && z.kind !== 'stack' && !isTrap(z))) P.pending = { x: nx, y: ny };
      startBattle(s, st);
      return { t: 'battle', from, x: nx, y: ny };
    }
    const r = arrive(s, nx, ny, from, spotted);
    if (r) return r;
    if (spotted.length) {
      const names = spotted.map(o2 => o2.kind === 'villain' ? `${vName(s)} in person` : o2.kind === 'stack' ? `${quantityWord(o2.count).toLowerCase()} ${CREATURES[o2.type].name}` : o2.kind === 'dungeon' ? `a ${DUNGEONS[o2.dtype].name}` : `a ${ITEMS[o2.kind].name}`);
      say(s, `The party spots ${names.join(' and ')}.`, 'spot');
      planRoute(s);
      return { t: 'move', from, x: nx, y: ny, spotted: names };
    }
    if (!P.path.length) planRoute(s);
    return { t: 'move', from, x: nx, y: ny };
  }
  // the party arrives on a tile with something on it
  function arrive(s, x, y, from, spotted) {
    const P = s.party;
    const site = siteAt(s, x, y);
    if (site) {
      P.path = [];
      if (site.kind === 'town' && s.townEvent && living(s).length) {
        s.townEvent = null;
        visitSite(s, site);
        s.phase = 'encounter'; s.enc = makeEncounter(s, { id: 'tourney', kind: 'tourney' });
        return { t: 'encounter', from, x, y };
      }
      const r = visitSite(s, site);
      if (r && r.battle) return { t: 'battle', from, x, y };
      return { t: 'event', from, x, y, msgs: r ? r.msgs : [] };
    }
    const node = nodeAt(s, x, y);
    if (node && workersAt(s, node).length && !nodeRaided(s, node)) {
      P.path = []; const gl = guardOf(s, node);
      if (gl) { say(s, `The ${DUNGEONS[gl.dtype].name} nearby sends its brood to defend the ${nodeName(node)}!`, 'big'); startBattle(s, null, { stacks: garrisonOf(gl), guardLair: gl.id, raidNode: node.id }); return { t: 'battle', from, x, y }; }
      return { t: 'event', from, x, y, msgs: [raidNode(s, node)] };
    }
    const o = s.objects.find(z => z.x === x && z.y === y && z.kind !== 'stack' && !isTrap(z));
    if (!o) return null;
    P.path = [];
    if (o.kind === 'dungeon' && o.mine && o.building) {
      s.objects = s.objects.filter(z => z !== o); s.todayActive = true;
      const lost = scatterMinions(s, s.minions.filter(m => m.job && m.job.kind === 'build' && m.job.lair === o.id));
      const m = `The heroes tear down the half-built ${DUNGEONS[o.dtype].name} and chase off the builders${lost ? ` (${lost} didn't make it home)` : ''}.`;
      say(s, m, 'big'); thrill(s, `Tore down a half-built ${DUNGEONS[o.dtype].name}`, 2);
      return { t: 'event', from, x, y, msgs: [m] };
    }
    if (o.kind === 'dungeon') {
      if (o.mine && lairWrecked(s, o)) return { t: 'event', from, x, y, msgs: [] };
      if (judge(partyPower(s) / garrisonPower(o), 0) === 'trivial' && !questOn(s, { kind: 'obj', id: o.id })) {
        s.todayActive = true;
        if (o.mine) { wreckLair(s, o); thrill(s, `Wrecked the ${DUNGEONS[o.dtype].name}`, 2); return { t: 'event', from, x, y, msgs: [s.log[s.log.length - 1].t] }; }
        s.objects = s.objects.filter(z => z !== o);
        const m = o.mine && !lairCount(o) ? `The ${DUNGEONS[o.dtype].name} stands empty. The party burns it to the ground.` : `The garrison of the ${DUNGEONS[o.dtype].name} takes one look at the heroes and flees. The party burns it to the ground. Too easy to be worth any experience.`;
        say(s, m, 'quirk'); thrill(s, `Burned down the ${DUNGEONS[o.dtype].name}`, 2);
        return { t: 'event', from, x, y, msgs: [m] };
      }
      say(s, `The party storms the ${DUNGEONS[o.dtype].name}!`, 'big');
      startBattle(s, null, { dungeonId: o.id, stacks: garrisonOf(o) });
      return { t: 'battle', from, x, y };
    }
    if (isEnc(o)) {
      s.phase = 'encounter'; s.enc = makeEncounter(s, o);
      return { t: 'encounter', from, x, y };
    }
    const msgs = interact(s, o);
    return { t: 'event', from, x, y, msgs };
  }

  function resolveTrap(s, o) {
    const T = ITEMS[o.kind]; const rolls = []; const msgs = [];
    const live = s.heroes.filter(h => h.status === 'ok');
    const rogue = live.find(h => h.cls === 'rogue');
    s.todayActive = true;
    if (rogue) {
      const c = check(rogue, 'finesse', T.dc + Math.floor((avgLevel(s) - 1) / 2), `${rogue.name} checks for traps`);
      rolls.push(c);
      if (c.result === 'success') {
        const m = `${rogue.name} spots the ${T.name} and disarms it.`;
        msgs.push(m); say(s, m, 'good'); thrill(s, `${rogue.name} disarmed a ${T.name}`, 1 + db(s, rogue, 2), rogue.id);
        return { rolls, msgs };
      }
    }
    const W = Math.max(1, Math.ceil(avgLevel(s) / 2)); const dc = T.dc + Math.floor((avgLevel(s) - 1) / 3);
    const hurt = (h, dmg) => { h.hp = Math.max(1, h.hp - dmg); };
    if (o.kind === 'pit' || o.kind === 'snare') {
      const v = pick(live);
      const dr = o.kind === 'pit' ? dmgRecord(`${T.name}: ${v.name} falls in`, 2, 6, 2 * W) : dmgRecord(`${T.name}: ${v.name} is caught`, 1, 6, W);
      const sv = saveRoll(v.name, heroStats(v, partyFlags(s.heroes), s).save, dc, `${v.name} tries to dodge`);
      rolls.push(sv);
      let d = dr.dmg.total; if (sv.result === 'success') d = Math.floor(d / 2); if (v.cls === 'rogue' && has(v, 'evasion')) d = sv.result === 'success' ? 0 : Math.floor(d / 2);
      dr.dmg.total = d; rolls.push(dr);
      hurt(v, d);
      const m = o.kind === 'pit' ? `${v.name} falls into a hidden pit and takes ${d} damage.` : `A snare yanks ${v.name} off their feet (${d} damage). The party spends the rest of the day cutting free.`;
      msgs.push(m); say(s, m, 'hurt');
      if (o.kind === 'snare') s.party.mp = 0;
      thrill(s, o.kind === 'pit' ? 'Someone fell into a hidden pit' : 'The party got caught in a snare', 2);
    } else {
      const dr = dmgRecord('Fire Rune explodes!', 2, 6, 2 * W);
      rolls.push(dr);
      const parts = [];
      for (const h of live) {
        const sv = saveRoll(h.name, heroStats(h, partyFlags(s.heroes), s).save, dc, `${h.name} dives for cover`);
        rolls.push(sv);
        let d = dr.dmg.total; if (sv.result === 'success') d = Math.floor(d / 2); if (h.cls === 'rogue' && has(h, 'evasion')) d = sv.result === 'success' ? 0 : Math.floor(d / 2);
        hurt(h, d); parts.push(`${h.name.split(' ')[0]} ${d}`);
      }
      const m = `A fire rune explodes under the party! (${parts.join(', ')})`;
      msgs.push(m); say(s, m, 'hurt');
      thrill(s, 'A fire rune went off under the party', 3);
    }
    return { rolls, msgs };
  }

  function giveXp(s, xp) {
    xp = Math.round(xp * (1 + 0.15 * townLv(s, 'yard')));
    for (const h of living(s)) {
      h.xp += xp;
      while (h.level < MAX_LEVEL && h.xp >= XP_TABLE[h.level + 1]) {
        const f = partyFlags(s.heroes); const before = heroStats(h, f, s);
        h.level++; recalcHero(h);
        const after = heroStats(h, partyFlags(s.heroes), s);
        const ab = CLASSES[h.cls].ab[h.level];
        s.pendingLevelUps.push({ id: h.id, name: h.name, cls: h.cls, level: h.level, ability: ab, gains: { hit: after.hit - before.hit, ac: after.ac - before.ac, hp: CLASSES[h.cls].hpL } });
        say(s, `${h.name} reaches level ${h.level}${ab ? ' and learns ' + ABILITIES[ab].name : ''}.`, 'level');
      }
    }
    // heirlooms (0.16): as their fame grows (party level 10, 12, 14, 16, 18) someone hands the heroes a magic item
    const L = avgLevel(s); s.heirloom = s.heirloom || 8;
    while (s.heirloom < 18 && L >= s.heirloom + 2) { s.heirloom += 2; say(s, `Word of the heroes spreads. ${pick(HEIRLOOM_GIVERS)} gives them ${grantArtifact(s, randomArtifact(s))}`, 'good'); }
    talentTick(s);   // 0.24: the villain earns a talent point for every level the party gains
  }
  const HEIRLOOM_GIVERS = ['An old knight in Millbrook', 'A grateful merchant', 'The temple of Millbrook', 'A retired adventurer', 'A mysterious patron', 'The lord of the realm'];
  function grantArtifact(s, a) {
    const live = living(s);
    if (a.party) { if (a.id === 'crown') s.crown = true; if (a.id === 'boots') s.boots = true; return `the ${a.name}! ${a.text}.`; }
    const who = live.filter(h => a.for.indexOf(h.cls) >= 0).sort((x, y) => x.items.length - y.items.length)[0] || live[0];
    for (const k of Object.keys(a.gear)) who.gear[k] = (who.gear[k] || 0) + a.gear[k];
    // recalcHero already adds the new max HP and mana to the current values
    who.items.push({ id: a.id, name: a.name, text: a.text }); recalcHero(who);
    who.hp = Math.min(who.hp, who.maxHp); who.mana = Math.min(who.mana, who.maxMana);
    s.wk.spot[who.id] = true;
    return `the ${a.name}! ${who.name} claims it (${a.text}).`;
  }
  function pickArtifact(s, extra) {
    const owned = s.heroes.flatMap(h => h.items.map(i => i.id)).concat(s.crown ? ['crown'] : [], s.boots ? ['boots'] : [], extra || []);
    const T = artTier(s);
    for (let t = T; t >= 1; t--) { const pool = ARTIFACTS.filter(a => a.tier === t && owned.indexOf(a.id) < 0); if (pool.length) return pick(pool); }
    return pick(ARTIFACTS.filter(a => a.tier === T && !a.party));
  }
  function randomArtifact(s) { return pickArtifact(s); }
  function interact(s, o) {
    const msgs = []; const add = (t, c) => { msgs.push(t); say(s, t, c || 'good'); };
    s.objects = s.objects.filter(z => z !== o);
    s.todayActive = true;
    const live = s.heroes.filter(h => h.status === 'ok');
    if (o.kind === 'chest') {
      const r = byDriveLive(s, 'greed'); const xp = lvXp(s, 0.12); const g = 8 + avgLevel(s);
      giveXp(s, xp); if (s.town) s.town.res.gold += g;
      add(r ? `${r.name} pries open the chest: gold and gems (+${g} gold for Millbrook), plus an old map worth ${xp} XP to everyone.` : `A treasure chest. The party sends the gold home to Millbrook (+${g}) and studies a map inside (+${xp} XP).`);
      thrill(s, 'Opened a treasure chest', 1 + db(s, r, 3), r && r.id);
    } else if (o.kind === 'artifact') {
      const a = ARTIFACTS.find(z => z.id === o.art) || pickArtifact(s); const r = byDriveLive(s, 'greed');
      const th = 3 + db(s, r, 2);
      add('An artifact: ' + grantArtifact(s, a));
      thrill(s, `Found the ${a.name}`, th, r && r.id);
    } else if (o.kind === 'shrine') {
      for (const h of live) { h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp / 2)); h.mana = h.maxMana; }
      const c = byDriveLive(s, 'duty');
      add('A healing shrine. Soft light mends wounds and restores every spell.', 'heal');
      thrill(s, 'Found a healing shrine', 2 + db(s, c, 1), c && c.id);
    } else if (o.kind === 'refugees') {
      const c = byDriveLive(s, 'duty'); const xp = lvXp(s, 0.14); giveXp(s, xp);
      add(c ? `Refugees from the wilds beg for help. ${c.name} organizes food and an escort to Millbrook (+${xp} XP).` : `The party helps a camp of refugees, a bit awkwardly (+${xp} XP).`);
      thrill(s, 'Helped a refugee camp', 1 + db(s, c, 3), c && c.id);
    } else if (o.kind === 'omen') {
      s.omens++; const w = byDriveLive(s, 'curiosity') || byDriveLive(s, 'duty');
      add(`An omen stone carved with ${vType(s).sigil}. Someone whispers the name: ${vFull(s)}.`, 'boss');
      thrill(s, `An omen of ${vName(s)}`, 1 + db(s, w, 2) + (s.weekFx === 'omens' ? 1 : 0), w && w.id);
    }
    questCheck(s, { kind: 'obj', id: o.id });
    return msgs;
  }
  function visitSite(s, S) {
    const msgs = []; const add = (t, c) => { msgs.push(t); say(s, t, c || 'good'); };
    if (S.kind === 'town') {
      s.party.mp = 0; s.todayActive = true;
      const recruits = recruitDead(s);
      for (const h of living(s)) { h.hp = h.maxHp; h.mana = h.maxMana; }
      add(`The party rests in Millbrook. Everyone is fully healed.${recruits.length ? ' ' + recruits.join(' ') : ''}`, 'heal');
      return { msgs };
    }
    if (S.kind === 'tower') {
      if (!s.march) { add('The party eyes the black walls of the Dark Tower and backs away. Not yet.', 'note'); return { msgs }; }
      startFinale(s);
      return { battle: true };
    }
    if (s.visited[S.id]) { add(`The party passes through ${S.name} again. Nothing new here.`, 'note'); return { msgs }; }
    s.visited[S.id] = true; s.todayActive = true;
    const h = byDriveLive(s, S.drive);
    if (S.id === 'mine') { const xp = lvXp(s, 0.3); giveXp(s, xp); add(`The party stakes a claim at the Old Silver Mine. ${h ? h.name + ' is ecstatic.' : ''} (+${xp} XP)`); }
    if (S.id === 'woods') { const xp = lvXp(s, 0.3); giveXp(s, xp); add(`At the Hermit's Glade, ${h ? h.name : 'the party'} tends to the hiding villagers. (+${xp} XP)`); }
    if (S.id === 'crypt') { const xp = lvXp(s, 0.35); giveXp(s, xp); s.omens++; add(`${h ? h.name : 'The party'} deciphers the Sunken Crypt's carvings. They speak of ${vFull(s)}, who ${vType(s).origin}. (+${xp} XP, +1 omen)`); }
    if (S.id === 'peaks') { if (h) { h.gear.att += 1; } add(`${h ? h.name + ' stands on the Giant\'s Overlook and roars. The view sharpens their resolve (+1 to hit).' : 'The party admires the view from the Giant\'s Overlook.'}`); }
    thrill(s, `Visited ${S.name}`, 2 + db(s, h, 3), h && h.id);
    questCheck(s, { kind: 'site', id: S.id });
    return { msgs };
  }
  // a fallen hero's player rolls up a replacement at the same level, with none of the old gear
  function replaceFallen(s, h) {
    // a Temple raised high enough brings one fallen hero back each week
    if (townLv(s, 'temple') >= 2 && s.town.revived !== s.week) {
      s.town.revived = s.week; h.status = 'ok'; h.hp = Math.ceil(h.maxHp / 2); h.mana = h.maxMana;
      say(s, `The priests of Millbrook's temple call ${h.name} back from the dead.`, 'good'); return h;
    }
    const c = CLASSES[h.cls]; const gen = (h.gen || 0) + 1;
    // the player rolls up someone from the roster who hasn't played yet, same class if possible
    s.rosterUsed = s.rosterUsed || s.heroes.map(x => x.rid || x.id);
    const fresh = ROSTER.filter(r => s.rosterUsed.indexOf(r.id) < 0 && !s.heroes.some(x => x.id === r.id));
    const pickR = fresh.find(r => r.cls === h.cls);
    let nh;
    if (pickR) { nh = heroFrom(pickR, h.level, gen); s.rosterUsed.push(pickR.id); }
    else {
      const base = ROSTER.find(r => r.cls === h.cls && r.race === h.race) || ROSTER.find(r => r.cls === h.cls);
      let id = h.cls + '-' + gen; while (s.heroes.some(x => x.id === id)) id += 'x';
      nh = heroFrom(Object.assign({}, base, { id, rid: base.id, name: c.names[gen % c.names.length], race: h.race || base.race, drive: h.drive }), h.level, gen);
    }
    nh.xp = Math.max(XP_TABLE[h.level] || 0, h.xp); nh.status = 'waiting';
    s.heroes = s.heroes.map(x => x === h ? nh : x);
    const gift = townLv(s, 'tavern') >= 2 ? grantArtifact(s, randomArtifact(s)) : null;
    say(s, `${h.name}'s player rolls up ${nh.name}, a level ${nh.level} ${RACES[nh.race].label.toLowerCase()} ${c.label.toLowerCase()}, who waits at the Millbrook tavern${gift ? ' with a gift from the regulars: ' + gift : ' with no magic items.'}`, 'level');
    return nh;
  }
  function recruitDead(s) {
    const out = [];
    for (const h of s.heroes.filter(x => x.status === 'dead')) replaceFallen(s, h);
    for (const h of s.heroes) {
      if (h.status !== 'waiting') continue;
      h.status = 'ok'; h.hp = h.maxHp; h.mana = h.maxMana;
      out.push(`${h.name}, a level ${h.level} ${RACES[h.race].label.toLowerCase()} ${CLASSES[h.cls].label.toLowerCase()}, joins the party at the tavern.`);
    }
    return out;
  }

  /* ================= encounters ================= */
  function bestFor(s, skill, exclude) {
    const ok = s.heroes.filter(h => h.status === 'ok' && (!exclude || exclude.indexOf(h.id) < 0));
    return ok.sort((a, b) => skillBonus(b, skill) - skillBonus(a, skill))[0] || null;
  }
  const ENC = {
    stranger: {
      art: 'stranger', intro: 'A hooded stranger waits by the road, watching the party approach. Who is it really?',
      choices: [
        { k: 'informant', label: 'A helpful informant', dc: 10, text: 'Easy to win over. Shares what she knows about your villain.' },
        { k: 'smuggler', label: 'A cagey smuggler', dc: 14, text: 'Has a magic item to trade, if they can talk him into it.' },
        { k: 'agent', label: 'An agent of your villain', dc: 16, text: 'Unmasking him is a big moment. If they fail, he curses them and pays your tower 8 gold.' }
      ],
      plan(s, e) {
        let who = bestFor(s, 'charm'); const bb = s.heroes.find(h => h.status === 'ok' && h.cls === 'barbarian');
        e.narr.push(`${who.name} steps forward to do the talking.`);
        if (bb && bb !== who && chance(0.2)) { who = bb; e.narr.push(`...but ${bb.name} shoves in front. "I'll handle this."`); }
        return [{ type: 'check', hero: who.id, skill: 'charm', dc: e.dc, label: 'talks with the stranger' }];
      },
      resolve(s, e, ok) {
        const h = s.heroes.find(x => x.id === e.steps[0].hero); const w = byDriveLive(s, 'curiosity');
        if (e.choice === 'informant') {
          if (ok) { s.omens++; giveXp(s, lvXp(s, 0.14)); return { text: `She leans close and whispers how ${vName(s)} ${vType(s).origin}. (+1 omen)`, th: [['The stranger shared secrets', 2 + db(s, w, 2), w]] }; }
          return { text: 'She shrugs, pulls up her hood and walks away.', th: [['The stranger wasn\'t interested', 1]] };
        }
        if (e.choice === 'smuggler') {
          if (ok) { const a = randomArtifact(s); const t = grantArtifact(s, a); return { text: `He grins and opens his coat. They trade for ${t}`, th: [['Haggled a magic item from a smuggler', 3 + db(s, byDriveLive(s, 'greed'), 2), h]] }; }
          return { text: 'He sells them a "magic" ring that turns their fingers green. Worthless.', th: [['Swindled by a smuggler', 1]] };
        }
        if (ok) { const xp = lvXp(s, 0.3); s.omens++; giveXp(s, xp); return { text: `${h.name} catches the lie. The stranger is an agent of ${vName(s)}! He flees, dropping coded orders. (+1 omen, +${xp} XP)`, th: [[`Unmasked an agent of ${vName(s)}`, 5 + db(s, w, 2), h]] }; }
        for (const x of living(s)) x.hp = Math.max(1, Math.round(x.hp * 0.75));
        s.res.gold += 8;
        return { text: `The stranger smiles, mutters a curse, and vanishes in black smoke. Everyone feels drained, and ${vName(s)} now knows their faces. (Your tower gains 8 gold.)`, th: [[`Cursed by ${vName(s)}'s agent`, 3]] };
      }
    },
    pass: {
      art: 'pass', intro: 'The road crosses a deep gorge on a rotten rope bridge. Three things have to go right.',
      choices: [
        { k: 'easy', label: 'Sturdy enough', dc: 10, text: 'DC 10 checks. Small reward.' },
        { k: 'hard', label: 'Swaying and frayed', dc: 13, text: 'DC 13 checks. Falls hurt.' },
        { k: 'deadly', label: 'Snapping as they cross', dc: 16, text: 'DC 16 checks. Big reward; falls hurt a lot.' }
      ],
      plan(s, e) {
        const used = []; const steps = [];
        for (const [sk, lab] of [['might', 'holds the ropes steady'], ['finesse', 'crosses the slick planks first'], ['lore', 'picks the safest route']]) {
          const h = bestFor(s, sk, used) || bestFor(s, sk); used.push(h.id);
          steps.push({ type: 'check', hero: h.id, skill: sk, dc: e.dc, label: lab });
        }
        return steps;
      },
      onFail(s, e, step) {
        const h = s.heroes.find(x => x.id === step.hero); const m = { easy: 1, hard: 1.5, deadly: 2 }[e.choice];
        const r = dmgRecord(`${h.name} slips`, 1, 10, Math.round((1 + avgLevel(s)) * m));
        h.hp = Math.max(1, h.hp - r.dmg.total);
        e.narr.push(`${h.name} slips and slams into the cliff (${r.dmg.total} damage).`);
        return r;
      },
      resolve(s, e, ok, wins) {
        const xp = lvXp(s, { easy: 0.12, hard: 0.22, deadly: 0.35 }[e.choice]);
        const g = byDriveLive(s, 'glory');
        if (wins >= 2) { giveXp(s, xp); return { text: `They make it across, ${wins === 3 ? 'barely breaking a sweat' : 'hearts pounding'}. (+${xp} XP)`, th: [['Crossed the rope bridge', 2 + (e.choice === 'deadly' ? 3 : e.choice === 'hard' ? 1 : 0) + db(s, g, 2), g]] }; }
        s.party.mp = 0;
        return { text: 'The bridge gives way behind the first hero. The rest turn back and lose the day finding another route.', th: [['Turned back at the rope bridge', 1]] };
      }
    },
    captive: {
      art: 'captive', intro: 'A wounded orc scout lies by the road, begging for mercy. What is really going on?',
      choices: [
        { k: 'honest', label: 'He\'s an honest deserter', dc: 13, text: 'Mercy is rewarded. Killing him just feels bad.' },
        { k: 'liar', label: 'It\'s an ambush', dc: 13, text: 'His friends hide nearby. Trusting him starts a fight.' },
        { k: 'secrets', label: 'He knows your villain\'s plans', dc: 13, text: 'Spared or questioned, he reveals an omen. Killed, the secret dies.' }
      ],
      plan(s, e) {
        const votes = { spare: 0, kill: 0, question: 0 };
        for (const h of s.heroes.filter(x => x.status === 'ok')) {
          const v = { cleric: ['spare', 2, '"We show mercy. That\'s who we are."'], barbarian: ['kill', 1.6, '"An orc is an orc. End it."'], rogue: ['spare', 1, '"Let him go. After I check his pockets."'], wizard: ['question', 1.6, '"Wait. He might know something."'] }[h.cls];
          votes[v[0]] += v[1] + rng() * 0.6; e.narr.push(`${h.name}: ${v[2]}`);
        }
        e.decision = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
        e.narr.push({ spare: 'The table votes to spare him.', kill: 'The table votes to finish him.', question: 'The table votes to question him first.' }[e.decision]);
        if (e.decision === 'question') { const w = bestFor(s, 'lore'); return [{ type: 'check', hero: w.id, skill: 'lore', dc: 13, label: 'questions the captive' }]; }
        return [];
      },
      resolve(s, e, ok) {
        const c = byDriveLive(s, 'duty'), w = byDriveLive(s, 'curiosity'), g = byDriveLive(s, 'glory');
        const debate = ['The players argued about it for ten minutes', 2];
        const ambush = () => { const t = ambushStack(s); e.ambush = t; };
        const T = e.choice, D = e.decision;
        if (D === 'spare') {
          if (T === 'honest') { const xp = lvXp(s, 0.1); giveXp(s, xp); return { text: `He thanks them through tears and limps away toward Millbrook. (+${xp} XP)`, th: [debate, ['Showed mercy to a deserter', 1 + db(s, c, 3), c]] }; }
          if (T === 'liar') { ambush(); return { text: 'As they turn their backs, he whistles. His friends burst from the brush!', th: [debate, ['The captive was bait. Ambush!', 3]] }; }
          const xp = lvXp(s, 0.16); s.omens++; giveXp(s, xp); return { text: `Grateful, he tells them how ${vName(s)} ${vType(s).origin}. (+1 omen, +${xp} XP)`, th: [debate, ['Mercy paid off with secrets', 2 + db(s, c, 2), c]] };
        }
        if (D === 'kill') {
          if (T === 'liar') { ambush(); return { text: 'His hidden friends see him fall and charge out for revenge!', th: [debate, ['The captive\'s friends wanted revenge', 3, g]] }; }
          return { text: T === 'secrets' ? 'It\'s quick. Whatever he knew dies with him.' : 'It\'s quick. The cleric\'s player goes quiet.', th: [debate, ['Finished the captive', 1 + db(s, g, 1), g]] };
        }
        if (ok) {
          if (T === 'liar') { const xp = lvXp(s, 0.22); giveXp(s, xp); return { text: `They see through the act, sneak up on his hidden friends, and send them running. (+${xp} XP)`, th: [debate, ['Saw through an ambush', 3 + db(s, w, 2), w]] }; }
          if (T === 'secrets') { const xp = lvXp(s, 0.25); s.omens++; giveXp(s, xp); return { text: `Careful questions pull it out of him: ${vName(s)} ${vType(s).plan}. (+1 omen, +${xp} XP)`, th: [debate, ['Interrogated a captive', 3 + db(s, w, 2), w]] }; }
          const xp = lvXp(s, 0.12); giveXp(s, xp); return { text: `He's telling the truth. They let him go. (+${xp} XP)`, th: [debate, ['Got the truth from a captive', 2 + db(s, w, 2), w]] };
        }
        if (T === 'liar') { ambush(); return { text: 'He stalls until his friends arrive. Ambush!', th: [debate, ['The captive stalled for an ambush', 3]] }; }
        return { text: 'He slips his bonds in the night and escapes.', th: [debate, ['The captive escaped', 1]] };
      }
    },
    riddle: {
      art: 'riddle', intro: 'A standing stone carved with a riddle. The answer opens a hidden cache.',
      choices: [
        { k: 'simple', label: 'A simple riddle', dc: 10, text: 'DC 10. Small reward, mild sting.' },
        { k: 'cryptic', label: 'A cryptic riddle', dc: 14, text: 'DC 14. Good reward.' },
        { k: 'maddening', label: 'A maddening riddle', dc: 18, text: 'DC 18. Big reward; failure curses everyone.' }
      ],
      plan(s, e) { const w = bestFor(s, 'lore'); return [{ type: 'check', hero: w.id, skill: 'lore', dc: e.dc, label: 'works out the riddle' }]; },
      resolve(s, e, ok) {
        const w = byDriveLive(s, 'curiosity'); const h = s.heroes.find(x => x.id === e.steps[0].hero);
        const xp = lvXp(s, { simple: 0.1, cryptic: 0.2, maddening: 0.32 }[e.choice]);
        if (ok) { giveXp(s, xp); return { text: `${h.name} speaks the answer. The stone slides aside. (+${xp} XP)`, th: [[`${h.name} solved a ${e.choice} riddle`, 2 + (e.choice === 'maddening' ? 2 : 0) + db(s, w, 3), h]] }; }
        const n = { simple: 1, cryptic: 2, maddening: 3 }[e.choice];
        const r = dmgRecord('The stone\'s curse', n, 6, n * Math.floor(avgLevel(s) / 2)); e.extraRolls.push(r);
        for (const x of living(s)) x.hp = Math.max(1, x.hp - r.dmg.total);
        return { text: `Wrong answer. The carvings flare and a curse stings everyone (${r.dmg.total} damage each).`, th: [['Argued over a riddle and lost', 1]] };
      }
    },
    tourney: {
      art: 'tourney', intro: 'Millbrook holds its tournament. The party\'s champion rides into the lists. Who waits at the other end?',
      choices: [
        { k: 'local', label: 'The village favorite', bonus: 3, text: '+3 to their rolls. Small reward.' },
        { k: 'knight', label: 'A knight errant', bonus: 6, text: '+6 to their rolls. Good reward.' },
        { k: 'grand', label: 'The grand champion', bonus: 9, text: '+9 to their rolls. Win an artifact.' }
      ],
      plan(s, e) {
        const h = bestFor(s, 'might'); e.narr.push(`${h.name} rides out as the party's champion.`);
        const name = { local: 'the village favorite', knight: 'the knight errant', grand: 'the grand champion' }[e.choice];
        return [1, 2, 3].map(i => ({ type: 'opposed', hero: h.id, skill: 'might', foe: name, foeBonus: e.bonus, label: `Joust ${i}` }));
      },
      resolve(s, e, ok, wins) {
        const h = s.heroes.find(x => x.id === e.steps[0].hero); const g = byDriveLive(s, 'glory');
        const xp = lvXp(s, { local: 0.12, knight: 0.22, grand: 0.32 }[e.choice]);
        if (wins >= 2) {
          giveXp(s, xp); let extra = '';
          if (e.choice === 'grand') extra = ' The prize: ' + grantArtifact(s, randomArtifact(s));
          return { text: `${h.name} wins the tournament! The crowd roars. (+${xp} XP)${extra}`, th: [['Won the Millbrook tournament', 3 + (e.choice === 'grand' ? 3 : e.choice === 'knight' ? 2 : 0) + db(s, g, 3), h]] };
        }
        h.hp = Math.max(1, Math.round(h.hp * 0.85));
        return { text: `${h.name} is unhorsed and limps off to polite applause.`, th: [['Lost the tournament, but what a show', 1]] };
      }
    }
  };
  function ambushStack(s) {
    const pp = partyPower(s); let best = ['goblin', 12];
    for (const t of ['goblin', 'orc', 'wolf']) for (const k of [1, 1.5, 2, 3, 4]) { const n = Math.round(CREATURES[t].base * k); const j = judge(pp / stackPower(t, n), 0); if (j === 'worthy') best = [t, n]; }
    return best;
  }
  function makeEncounter(s, o) {
    const E = ENC[o.kind];
    const tier = Math.floor((avgLevel(s) - 1) / 2);
    const choices = E.choices.map(c => { const x = Object.assign({}, c); if (x.dc) { x.dc += tier; x.text = x.text.replace(/DC \d+/, 'DC ' + x.dc); } if (x.bonus) { x.bonus += tier; x.text = x.text.replace(/\+\d+ to their rolls/, `+${x.bonus} to their rolls`); } return x; });
    return { id: o.id, kind: o.kind, name: ITEMS[o.kind].name, art: E.art, stage: 'setup', intro: E.intro, choices, choice: null, steps: [], idx: 0, rolls: [], extraRolls: [], narr: [], fudged: false, canFudge: false, wins: 0, outcome: null };
  }
  function encChoose(s, k) {
    const e = s.enc; if (!e || e.stage !== 'setup') return 'No encounter to set up.';
    const E = ENC[e.kind]; const ch = e.choices.find(c => c.k === k); if (!ch) return 'Unknown choice.';
    e.choice = k; e.dc = ch.dc; e.bonus = ch.bonus; e.stage = 'rolling';
    e.steps = E.plan(s, e);
    if (!e.steps.length) e.stage = 'ready';
    return null;
  }
  function encRoll(s) {
    const e = s.enc; if (!e || e.stage !== 'rolling') return null;
    const st = e.steps[e.idx]; const h = s.heroes.find(x => x.id === st.hero);
    let rec;
    if (st.type === 'opposed') {
      const a = d20(), b = d20(); const ab = skillBonus(h, st.skill);
      rec = { t: 'roll', kind: 'opposed', title: `${st.label}: ${h.name} vs ${st.foe}`, who: h.name, a: { name: h.name.split(' ')[0], d20: [a], bonus: ab, total: a + ab }, b: { name: st.foe.replace(/^the /, ''), d20: [b], bonus: st.foeBonus, total: b + st.foeBonus } };
      rec.result = rec.a.total >= rec.b.total ? 'success' : 'fail';
    } else rec = check(h, st.skill, st.dc, `${h.name} ${st.label}`);
    e.rolls.push(rec); e.idx++;
    if (rec.result === 'success') e.wins++;
    e.canFudge = false; // 0.19: no more fudging encounter rolls (it cost Lore)
    e.pendingFail = rec.result === 'fail' ? st : null;
    if (e.idx >= e.steps.length) e.stage = 'ready';
    return rec;
  }
  function encFudge(s) {
    const e = s.enc; if (!e || !e.canFudge) return 'Nothing to fudge.';
    const rec = e.rolls[e.rolls.length - 1];
    s.engagement = clamp(s.engagement - 3, 0, 100);
    rec.result = 'success'; rec.fudged = true; e.fudged = true; e.canFudge = false; e.wins++; e.pendingFail = null;
    return null;
  }
  // apply consequences of a failed step that wasn't fudged (called before the next roll or the finish)
  function encSettle(s) {
    const e = s.enc; if (!e || !e.pendingFail) return null;
    const E = ENC[e.kind]; const st = e.pendingFail; e.pendingFail = null; e.canFudge = false;
    return E.onFail ? E.onFail(s, e, st) : null;
  }
  function encFinish(s) {
    const e = s.enc; if (!e || e.stage !== 'ready') return null;
    const fr = encSettle(s); if (fr) e.extraRolls.push(fr);
    const E = ENC[e.kind];
    const ok = e.steps.length ? e.wins >= Math.ceil(e.steps.length / 2) : true;
    const out = E.resolve(s, e, ok, e.wins);
    const lines = [];
    for (const [label, v, h] of out.th) { thrill(s, label, v, h && h.id); lines.push({ label, v }); }
    s.todayActive = true;
    e.outcome = { text: out.text, lines, ok };
    e.stage = 'done';
    say(s, `${e.name}: ${out.text}`, ok ? 'good' : 'note');
    return e.outcome;
  }
  function encClose(s) {
    const e = s.enc; if (!e || e.stage !== 'done') return null;
    s.objects = s.objects.filter(o => o.id !== e.id);
    questCheck(s, { kind: 'obj', id: e.id });
    s.enc = null;
    if (e.ambush) { s.phase = 'map'; startBattle(s, null, { stacks: [e.ambush] }); return 'battle'; }
    s.phase = 'map'; planRoute(s);
    return 'map';
  }

  /* ================= days and weeks ================= */
  function endDay(s) {
    if (s.phase !== 'map') return;
    if (!s.todayActive) { s.wk.idle++; say(s, 'A quiet day of travel. Nothing happened.', 'idle'); }
    s.todayActive = false;
    s.townToday = townDay(s);
    const regen = (s.weekFx === 'harvest' ? 0.3 : 0.15) * (townLv(s, 'temple') ? 2 : 1);
    for (const h of living(s)) { h.hp = Math.min(h.maxHp, h.hp + Math.ceil(h.maxHp * regen)); h.mana = Math.min(h.maxMana, h.mana + Math.ceil(h.maxMana * 0.25)); }
    bandsMove(s);
    for (const o of s.objects.slice()) if (o.kind === 'dungeon' && !o.mine) { lairGrow(s, o); lairSpawn(s, o); }
    if (s.minions) {
      // your side of the night: minions walk, dig and build, the tower pays its tithe, and every lair raises its brood
      const md = minionDay(s); s.res.gold += 2; md.res.gold += 2;
      const lp = lairsProduce(s);
      s.lastDay = { res: md.res, built: md.built, opened: md.opened, yields: md.yields, plot: md.plot, raised: lp, released: lp.released, summoned: md.summoned, library: md.library, researched: md.researched, town: s.townToday || null };
      dmReveal(s);
    }
    const V = s.villain; V.mp = VILLAIN_MP;
    if (V.state === 'banished') { V.banish--; if (V.banish <= 0) { V.state = 'lair'; say(s, `${vName(s)} has recovered in the Dark Tower.`, 'dm'); } }
    if (!s.march && readiness(s).ready) startMarch(s, 'ready');
    else if (!s.march && living(s).every(h => h.level >= MAX_LEVEL)) startMarch(s, 'maxed');
    if (s.day >= 7) { weekEnd(s); return; }
    s.day++;
    s.party.mp = mpPerDay(s);
    planRoute(s);
  }
  function weekEnd(s) {
    for (const q of s.quests) if (q.status === 'open' && q.week <= s.week) { q.status = 'failed'; thrill(s, `Quest left unfinished: ${q.name}`, -2); }
    const lines = s.wk.thrill.filter(l => l.v !== 0 || /fled/.test(l.label));
    const thr = sum(s.wk.thrill, l => l.v);
    const eng = [];
    eng.push({ label: 'Thrill this week', v: thr });
    eng.push({ label: 'Players expect more every week', v: -weeklyDrain(s) });
    if (s.wk.idle) eng.push({ label: `${s.wk.idle} day${s.wk.idle > 1 ? 's' : ''} with nothing happening`, v: -s.wk.idle });
    const dead = s.heroes.filter(h => h.status === 'dead');
    const delta = sum(eng, e => e.v);
    const before = s.engagement;
    s.engagement = clamp(s.engagement + delta, 0, 100);
    s.totalThrill += thr;
    const railBefore = s.railroad; s.railroad = Math.max(0, s.railroad - 15);
    const fxC = WEEKS_FX[s.weekFx].creature; let grew = 0;
    for (const o of s.objects) if (o.kind === 'stack') { const g = o.type === fxC ? 1.5 : 1.12; const n = Math.ceil(o.count * g); if (n > o.count) grew++; o.count = n; }
    const recruits = [];
    s.history.push({ week: s.week, thrill: thr, eng: s.engagement, level: avgLevel(s) });
    const march = false; // 0.19: the table's mood is a score; at zero the players grumble, but nobody marches early
    const nextFx = pick(['goblin', 'wolf', 'skeleton', 'orc', 'moon', 'harvest', 'storms'].filter(k => k !== s.weekFx));
    s.recap = { week: s.week, lines, thrill: thr, eng, before, after: s.engagement, delta, railBefore, railAfter: s.railroad, grew, recruits, dead: dead.map(h => h.name), nextFx, result: null, march, level: avgLevel(s), ready: readiness(s) };
    s.phase = 'week';
  }
  function startNextWeek(s) {
    if (s.phase !== 'week') return;
    if (s.recap.result) { s.result = s.recap.result; s.phase = 'over'; return; }
    s.week++; s.day = 1; s.weekFx = s.recap.nextFx; s.wk = newWeekLog(); s.todayActive = false;
    s.party.mp = mpPerDay(s);
    say(s, `Week ${s.week}. Astrologers proclaim the ${WEEKS_FX[s.weekFx].name}.`, 'sys');
    const march = s.recap.march;
    s.recap = null; s.phase = 'map';
    reveal(s);
    weeklyWilds(s);
    if (march) startMarch(s, 'bored');
    planRoute(s);
  }
  // expectations rise for the first two months, then hold
  const weeklyDrain = s => 18 + 2 * Math.min(s.week, 8);
  // the party sets out for the final showdown: because they feel ready, or because they are bored of waiting
  function startMarch(s, why) {
    if (s.march) return;
    s.march = why;
    const V = s.villain;
    if (V.state !== 'lair') { V.state = 'lair'; V.banish = 0; V.known = false; }
    s.townEvent = null;
    for (const q of s.quests) if (q.status === 'open' && !(q.ref.kind === 'site' && q.ref.id === 'tower')) q.status = 'void';
    say(s, why === 'bored' ? 'The players have had enough of waiting around. "Let\'s just go fight the boss!" The party marches on the Dark Tower, ready or not.' : why === 'maxed' ? `The heroes can't grow any stronger. Ready or not, they march on the Dark Tower to face ${vName(s)}.` : `The heroes feel ready. They march on the Dark Tower to end ${vName(s)}'s reign. ${vName(s)} returns to the throne to meet them.`, 'boss');
    planRoute(s);
  }
  // 0.19: there's no clock, but the sooner the heroes win the better. The table's thrill and mood add to the score; lost heroes cost.
  const campaignDays = s => (s.week - 1) * 7 + s.day;
  const SCORE = { par: 140, perDay: 10, mood: 3, death: 30 };
  function campaignScore(s) {
    const days = campaignDays(s); const won = s.result === 'victory';
    const rows = [];
    if (won) rows.push({ label: `Won on day ${days} (week ${s.week})`, v: Math.max(0, (SCORE.par - days) * SCORE.perDay) });
    rows.push({ label: 'Thrill over the campaign', v: s.totalThrill || 0 });
    rows.push({ label: `The table's mood at the end (${s.engagement})`, v: s.engagement * SCORE.mood });
    if (s.deaths) rows.push({ label: `${s.deaths} hero${s.deaths > 1 ? 'es' : ''} lost`, v: -s.deaths * SCORE.death });
    const total = rows.reduce((t, r) => t + r.v, 0);
    const tier = !won ? null : s.week <= 8 ? 'Legendary campaign' : s.week <= 10 ? 'Great campaign' : s.week <= 13 ? 'Solid campaign' : 'Long campaign';
    return { days, rows, total, tier };
  }
  // a failed assault sends them home to regroup; the epic attempt rekindles the table's interest
  function endMarch(s) { s.march = null; s.engagement = Math.max(s.engagement, 45); s.finaleTries = (s.finaleTries || 0) + 1; }
