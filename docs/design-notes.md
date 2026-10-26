# Overmaster — design notes (alpha 0.21; called Behind the Screen until 0.20)

A browser game where you are the dungeon master, and you run both sides. The Dark Tower is the villain's town: its minions gather gold, lumber and ore and raise monster lairs across the map, whose bands give four autonomous heroes their fights. Millbrook is the heroes' town, with its own purse and buildings that make the party stronger, and a quest board that pulls them where you want (0.19). You win when the heroes grow strong enough to beat your level 20 villain; the sooner, the higher your score. The campaign runs until the party wins or is wiped out.

The game ships two ways from the same source:
- **The website** (`dist/site/`): static files for Netlify or any host. Optional Supabase project for accounts, cloud saves and feedback.
- **The Claude preview** (`dist/behind-the-screen.html`): same game, saves in the browser only.

Source modules: game.js (map, core, battle), art.js (SVG portraits and icons), dice.js, three.js r128, models.js (3D models), world3d.js (3D map and battles), ui.js (in-game UI), store.js (saves, accounts, feedback), front.js (title, setup, menus). Painted character art lives in art/ (see docs/art-guide.md) and tools/art_import.py brings it in. Styles: style.css, front.css and screens.css for layout, then ui-assets.css (generated textures), skin.css (the fantasy skin) and loop.css (the sidebar, balance meter, tower screen, map panels and battle steps) on top.

## Look and feel (alpha 0.6)
Aimed at a Warcraft 3–style painted fantasy look rather than flat low-poly.
- **Ground**: four tileable painted patterns (grass blades and clumps, dirt and pebbles, rock plates and cracks, cobbles) blended per terrain by a splat map. Roads are worn earth with a cobbled crown. Steep slopes turn to dark cliff rock with vertical strata.
- **Models**: smooth shading with a hand-painted texture chosen per surface: cloth, masonry, wood grain, roof shingles, metal, skin, leaves, rock, fur, timber-framed plaster, scales. Soft occlusion is baked in (dark at the feet, lighter at the top) and a cool rim light separates figures from the ground.
- **Trees**: tall summer trees with a heavy crown of leaf clumps, narrow pines with four drooping tiers, gnarled dead trees.
- **Heroes and monsters**: broader chests, shoulders and hands, weapons a quarter larger. Battle figures are drawn 25% larger than before.
- **Light and colour**: a warmer, stronger sun and cooler shadows; a filmic grade with slight desaturation, warm highlights, cool shadows and gentle contrast; a soft vignette. Water is darker and calmer.
- **Portraits**: painted finish on the medallions (brushy edges, canvas grain, light from the top left) and a worn gold rim.
- **Performance**: textures are generated at startup in about a third of a second. The adaptive quality system still drops resolution and then shadows on slow machines.
- **Mountains (alpha 0.9)**: a range rises from foothills at its edge to peaks in the middle, so it no longer stands on the map like a block with cliff walls. Rock spires reach a third of their height below ground and get scree around the foot, and big rocks sit on the lowest point of the ground under them.

## Characters as painted sprites (alpha 0.11)
The world stays 3D; every character in it (heroes, monsters, minions, the villain) is a flat painted sprite that always faces the camera, the "HD-2D" approach.
- **Stand-ins**: until real art exists, each sprite is rendered once from the character's 3D model into a 192 × 256 picture (three-quarter view from slightly above), so the game already plays in this style. The stand-ins take a few milliseconds each and are reused.
- **Facing**: a sprite is drawn facing right and mirrored when its character turns left. Downed units tip over. Each sprite has a soft round shadow at its feet. Battle hits flash the sprite red.
- **Painted art**: `art/manifest.json` lists the paintings, `art/sprites/<key>.webp` (full body, 384 px tall) and `art/portraits/<key>.webp` (256 × 256). The game starts on the stand-ins and swaps paintings in as they load, so art never slows the first screen. A sprite is scaled to the character's height in the game; a portrait becomes the round token with the gold rim everywhere that character appears.
- **Making art**: `docs/art-guide.md` has the look, the picture rules, the tools, a style prompt and a prompt for every hero, monster, villain and minion. `tools/art_import.py` cuts away flat backgrounds, trims, shrinks to WebP and updates the manifest; build.sh copies `art/` into the site.
- **Setting**: Settings → Sprite characters (called Painted characters in 0.11; on by default) switches back to the 3D figures.

### Pixel art in 8 directions (alpha 0.12)
- **PixelLab**: `tools/pixellab_gen.py` makes characters with PixelLab's create-character-v3 (text in, a 128 px character drawn from 8 sides out). It reads PixelLab's own API spec at start, so each request matches the current API, and it resumes characters already paid for. `tools/pixellab_import.py` joins each character's 8 images into one strip.
- **Directions**: a strip's frames run S, SE, E, NE, N, NW, W, SW. Every frame is cut to one shared box centred on the frame, so the feet don't slide as a character turns. Each frame, a sprite works out which way its character faces relative to the camera and shows that frame, with a little stickiness at the boundaries so it doesn't flicker. Nothing is mirrored.
- **Crisp pixels**: pixel-art textures use nearest-neighbour magnification and are padded to power-of-two sizes, so no browser rescales (and blurs) them on upload. Small sprites still use smoothed mipmaps, so they don't sparkle at a distance.
- **Tokens**: PixelLab bust portraits (character_to_portrait, 128 px) become the round tokens. Pixel-art tokens are drawn at 256 px and scaled by whole numbers, so they stay sharp at the 84 px hero sheet on high-density screens. A character with directional art and no portrait gets its token from the head and shoulders of the south (front) frame. Art loading reports code errors to the console; a missing file just keeps the stand-in quietly.
- **Buildings and objects** (alpha 0.13): with a picture `obj-<key>` in art/, sites, lairs (and their half-built and wrecked looks), resource spots and map objects become still pixel cut-outs instead of 3D models, sized to the model's footprint. A picture drawn from above shows the object's ground in its lower part, so each cut-out stands at the near edge of its footprint, the edge facing the camera, and moves round as the camera turns. Cut-outs draw after ground rings and before characters, without depth writes, so heroes in Millbrook stay in view; trees and hills in front still hide them. When art arrives after the map is built, sites, objects and resource spots are rebuilt.
- **Icons**: the same `obj-*` pictures replace the drawn icons everywhere (trimmed, centred, scaled by whole numbers). The resource bar and prices now use their own icons (`obj-res-gold/lumber/ore`) instead of the mine pictures, falling back to the drawn ones.
- **Load speed**: canvases the sprite code reads back (pixel scans, tokens turned into pictures) are created as CPU canvases (`willReadFrequently`). Read-backs from GPU canvases stalled page load by seconds per character in testing.

## Interface (alpha 0.7)
A fantasy game interface in the spirit of classic RPG and RTS menus. All art is original: `tools/make_ui.py` draws every texture and frame procedurally and embeds them in `ui-assets.css` (about 70 KB), so nothing needs licensing and the game stays one file.
- **Materials carry meaning.** Carved oak frames the main views and is what you click. Forged iron rims information and holds bars. Dark stone fills panels. Parchment is for in-world documents: the party's plan and the chronicle. Enamel and gems show state: teal for secondary buttons, sapphire for toggles that are on, ruby for danger, amethyst for villain powers, amber and emerald markers.
- **The bold piece**: a mitred oak frame with iron corner brackets, rivets and an amber gem around the map, the battlefield, the full screens and dialogs. Side panels get a thinner oak frame with small iron corners.
- **Backdrop**: a starry navy night sky behind everything.
- **Type**: Cinzel in engraved gold for headings and buttons, Alegreya for reading. Headers end in an iron flourish with an emerald.
- **Buttons**: oak planks with an iron band and gold lettering; disabled buttons grey out. Health and other bars sit in iron channels with glossy fills.
- To regenerate the art: `python3 tools/make_ui.py`, then `bash build.sh`.
- Technical note: keep the 2px border on the map and battlefield containers. The canvas sizing relies on it; without it the battlefield can lock up.

## Title screen and setup
- Title: Continue (newest unfinished save), New campaign, Load game, How to play, Settings, Send feedback, account chip. A slow 3D flight over the map behind the menu; the painted map when 3D is off.
- New campaign, step 1: pick the villain. Six kinds, a name, a title, pronouns (he/she/they/it) and the campaign name.
- Step 2: seat four of 20 heroes, or roll a random party or one of each class. Party notes warn about missing healers or front-liners.

## Villains (all level 20 on the throne)
| Kind | Signature powers |
|---|---|
| Lich | Soul Rend (every 3rd turn, all heroes), Call Servants (skeletons), Phylactery (rises once at 25% HP) |
| Ancient Dragon | Fire Breath (2-hex burst, recharges on 5–6), Frightful Presence (round 1 disadvantage), flies |
| Demon Prince | Fire Aura (burns adjacent heroes each turn), Hellfire (1-hex burst, every other turn), Call Servants (shadow fiends) |
| Archmage | Meteor Swarm (every 3rd turn), Blink (free teleport), Mirror Image (3 images), Time Stop (two extra turns, once) |
| Vampire Lord | Life drain, Charm (a hero loses a turn), Call Servants (wolves), Regeneration 2% a turn |
| Death Knight | Hellfire Orb (1-hex burst), Lord of the Damned (honor guard 40% bigger, +2 to hit) |

On the road, the villain rides as a level (party + 2) shadow and escapes at 35% HP. In battle, the DM fires powers from buttons on the battle bar, or the monster AI does.

## Heroes
- 20 heroes: Barbarian, Rogue, Cleric, Wizard × Human, Elf, Dwarf, Halfling, Half-Orc. Each has a name, a drive (glory, greed, duty, curiosity), a bio and a look used for the portrait and 3D model.
- Races: Human +1 to hit and skills · Elf +1 speed, +2 Finesse/Lore, party sees 1 tile farther · Dwarf +2 HP/level, +2 saves, −1 speed · Halfling rerolls natural 1s, +1 AC · Half-Orc drops to 1 HP once per battle, crits roll an extra die.
- A fallen hero is replaced by an unused roster hero of the same class, same level, no items.
- A party without a cleric carries two healing potions per hero per battle.

## The map (alpha 0.14)
Every campaign has its own map, made from its seed:
- **Millbrook and the Dark Tower** start far apart, at least 26 tiles (the old fixed map had 24.7).
- **The four landmarks**: two in a near ring around Millbrook (8 to 12.5 tiles), two farther out (12 to 25). Which landmark goes where is random. One of the far two always lies on the tower's side, within 16 tiles of it, so the journey leads into the villain's country, as it did on the old map. Landmarks keep 9 tiles apart where they can.
- **Regions** follow their landmark: forest round the Hermit's Glade, hills round the mine, swamp round the crypt, snow round the Overlook, ash round the tower. One or two lakes go somewhere clear of every site, and mountain ridges come from noise as before.
- **Roads** run from Millbrook to every site, cutting through anything in the way, so everything is reachable.
- **Resources, wild monsters, finds and the starting Goblin Warren** were already placed from the seed; they now spread around the new layout.
- **Old saves** (before 0.14) keep the classic fixed map they were played on (`layout: 'classic'`). New games can still ask for it (`newGame(seed, { layout: 'classic' })`), which the balance sims use to compare.
- **Dark Tower art per villain**: with a picture `obj-tower-<villain>` in art/, the tower on the map, its sidebar button and its card show the villain's own lair: the Lich's bone spire, the Dragon's volcanic crag, the Demon Prince's obsidian citadel, the Archmage's crystal tower, the Vampire Lord's castle, the Death Knight's black keep.

## The loop (alpha 0.10)
The main screen is the map plus a sidebar: the heroes (with where they're heading), whatever you clicked on the map, Your tower (with a button for idle minions), Millbrook, and End day. A minimap sits in the map's bottom-left corner: terrain, sites (gold, green, blue), your lairs (purple), bands you can see, minions (lilac dots), the party (red) and the view box. Click or drag it to look; right-click it to send selected minions; the corner button hides it. The bottom bar shows the two purses (the Tower's gold, lumber and ore, then Millbrook's; click one to open that town), Mood, the party's level and readiness, the week and the date, and Menu.

A day: give your minions orders, build lairs where the heroes are heading, tell the bands you can see what to do, End day. There is no war party any more (0.10): the heroes find your monsters on the map.

**The night.** After the heroes' travel, End day plays the night: every minion and every band on the move walks its route tile by tile (all at once, up to about 3.5 seconds), the fog lifts as your minions go, the camera glides out to keep them in view if it has to and comes back afterwards (unless you drag or zoom meanwhile), progress bars fill over sites being opened and lairs going up, and each working site floats up what it brought in. Fast mode halves it; reduced motion skips it.

### Fog of war (0.10)
- You see what your tower (5 tiles), your minions (3), your lairs (2; 1 while going up) and the heroes (their sight plus 1) see, right now. Ground you've seen before stays dim, with the sites, deposits and lairs you saw; monster bands only show while someone of yours can see them. Ground nobody of yours has seen is black.
- You can only build on ground you've explored, and only talk to bands you can see. A minion can walk into the dark (right-click or Move), and what it finds stays on your map.
- The fog is the DM's. The heroes keep their own map of what they've explored, which decides what they know about.

### Resources and minions
- **Gold, lumber and ore** come from sites fixed per map: 5 gold deposits (next to mountains), about 6 timber stands (in forests) and 5 ore deposits (deep against mountains), one of each kind as close to the tower as the map allows. Each site starts raw: a minion that reaches it spends that night turning it into a Gold Mine, Lumber Camp or Ore Mine, and from the next night it produces. **One minion per site.** A worked mine or camp makes 3 gold, 3 lumber or 2 ore a night (+1 with the matching minion perk). An opened site stays open if the minion leaves or is driven off. The tower adds 2 gold a day.
- **Two purses** (0.19). Everything above goes into the tower's purse, which pays for lairs, research, minions, the Library, expansions and levelling bands. Millbrook has a purse of its own (see Millbrook below). Lore is gone: every Lore price became gold (twice the Lore) or, for research, gold and ore, and minions no longer Plot.
- **Minions** are your villain's servants and your eyes: you start with 2 at the tower and summon more there for 12 gold, up to 16. A summoning takes 2 nights and the tower summons one at a time; up to 4 can wait in line, paid up front, and a waiting one can be cancelled for the full price back. They walk about 9 tiles a day.
- **Orders.** Click a minion to select it (picked by its figure); Shift-click adds or removes more; **I** selects the next idle one, Shift+I all of them. The card has an action menu: **Move** (then click where to go; a deposit or mine puts it to work, a half-built lair to building), **Build** (pick a lair, a ghost follows the cursor, click explored ground out of the heroes' sight; the nearest selected minion builds, the others help), and **Dance** (it dances). Keys M, B. Right-click is the shortcut: a deposit, mine or camp to work it, a half-built lair to help, the tower to go home, anywhere else to walk. Selected minions get a ring and their route as arrows: bright for tonight's walk, dim for later. On a touch screen, tapping a site, a half-built lair or the tower gives the order. Clicking open ground no longer offers to build: lairs come from a minion's Build order.

| Villain | Minions | Perk |
|---|---|---|
| Lich | Bone Thralls | +1 ore a night at an ore mine |
| Ancient Dragon | Kobolds | +1 gold a night at a gold mine |
| Demon Prince | Imps | travel twice as far |
| Archmage | Clay Servants | build twice as fast |
| Vampire Lord | Thralls | cost 8 gold instead of 12 |
| Death Knight | Grave Diggers | +1 lumber a night at a lumber camp |

### Lairs on the map
Built by a minion on explored open ground the heroes can't see (not on a road, not within 4 tiles of Millbrook, 2 tiles from other lairs). A lair raises a fixed brood every night (+25% on its home terrain) and holds four nights' worth. **When enough have gathered they march out as a band** and wait beside the lair: at least two nights' brood, more if that's what it takes to give the heroes a real fight, never more than a full lair; at most 2 bands out per lair. Expanding costs about half the build price plus gold by tier, and raises 75% more.

| Lair | Raises | Per night | Cost to build | Research needs | Work to build |
|---|---|---|---|---|---|
| Goblin Warren | goblins | 6 | 8 gold, 4 lumber | — | 2 days |
| Wolf Den | wolves | 3.2 | 8 gold, 6 lumber | — | 3 days |
| Bandits' Hideout | bandits | 3.4 | 10 gold, 6 lumber | — | 3 days |
| Bone Crypt | skeletons | 5.3 | 8 gold, 4 ore | — | 3 days |
| Orc War Camp | orc archers | 3 | 12 gold, 8 lumber, 2 ore | — | 3 days |
| Ogre Den | ogres | 2.4 | 16 gold, 6 lumber, 6 ore | Orc War Camp | 4 days |
| Haunted Barrow | wraiths | 2.5 | 24 gold, 8 ore | Bone Crypt | 4 days |
| Troll Bog | trolls | 3.3 | 34 gold, 10 lumber, 8 ore | Ogre Den | 5 days |
| Giant's Hold | hill giants | 1.6 | 36 gold, 6 lumber, 14 ore | Ogre Den | 5 days |
| Vampire Manor | vampires | 1.35 | 50 gold, 12 lumber, 10 ore | Haunted Barrow | 5 days |
| Hydra Mire | hydras | 1.05 | 52 gold, 14 lumber, 10 ore | Troll Bog | 6 days |
| Dragon Roost | young dragons | 1 | 60 gold, 8 lumber, 18 ore | Giant's Hold + Haunted Barrow | 6 days |
| Demon Pit | pit demons | 0.8 | 76 gold, 10 lumber, 22 ore | Dragon Roost + Vampire Manor | 7 days |

Work to build counts minion-nights at the site (0.15): one builder takes that many nights, each helper standing there adds a night's work, and Clay Servants do two. The builder has to walk there first. On the map the lair rises out of its scaffolding as the work goes in, the rest of it a faint blue plan; dust and sparks fly while someone's hammering.

A Goblin Warren stands near Millbrook from day one, with a band of 8 goblins already out. The lairs you've built still decide the finale's gate guards.

### Research at the Dark Tower (0.16)
The five tier-1 lairs are known from the start. Everything else is researched at the tower: pay up front from the tower's purse (3 gold and 1 ore per point of cost below), and the research finishes after its nights; each level of the Forbidden Library takes a night off every research, never below one. One research at a time; up to 3 wait in line, and cancelling one gives its price back (along with anything later in line that needed it). A research can be queued as soon as what it needs is researched or ahead of it in the line.

| Research | Branch | Cost | Nights | Needs | Gives |
|---|---|---|---|---|---|
| Ogre Den | Monsters | 4 | 2 | (Orc War Camp, known) | the lair |
| Haunted Barrow | Monsters | 4 | 2 | (Bone Crypt, known) | the lair |
| Troll Bog | Monsters | 6 | 3 | Ogre Den | the lair |
| Giant's Hold | Monsters | 6 | 3 | Ogre Den | the lair |
| Vampire Manor | Monsters | 10 | 3 | Haunted Barrow | the lair |
| Hydra Mire | Monsters | 10 | 4 | Troll Bog | the lair |
| Dragon Roost | Monsters | 12 | 4 | Giant's Hold + Haunted Barrow | the lair |
| Demon Pit | Monsters | 16 | 5 | Dragon Roost + Vampire Manor | the lair |
| Dark Vigor I–III | The villain | 3, 4, 5 | 2 each | — | +10% villain HP each |
| Call Servants | The villain | 5 | 3 | — | the villain calls servants once per battle |
| Dread Aura | The villain | 4 | 2 | Haunted Barrow | heroes attack with disadvantage in round 1 |
| Dark Ritual | The villain | 5 | 3 | Vampire Manor | +10% HP, +1 to hit, +6 thrill if they win anyway |
| Swift Summoning | Servants | 4 | 2 | — | summoning takes 1 night |
| Master Masons | Servants | 5 | 2 | — | every lair needs a day less work (at least 1) |
| Tireless Hands | Servants | 6 | 3 | Master Masons | +1 from every worked mine and camp |

The deadlier lairs cost more gold every time one is built, on top of their research (their old Lore price, doubled, in gold). Dark powers used to be bought instantly; their effects were halved in 0.16 because every DM can now research all of them (all four together: +43% HP and +1 to hit, down from +92% and +2).

The tower screen has four tabs: **Tower** (summoning, the research under way, the Library, last night), **Research** (the queue and the three trees, nodes lit by state: known, researching, queued, ready, can't afford, locked), **Lairs** (every lair with its state and a Show button) and **Villain** (the villain, readiness, the gate, Scout the showdown and the dark powers known). The DM no longer hands the heroes magic items, and the list of resource sites is gone: finding them is part of the game.

### Bands (0.10)
Every monster group on the map is a band: the ones your lairs send out and the ones that wander in from the wilds. You don't control them, but you can tell any band you can see what to do. Its card says where it came from, what it's doing, and how it would fare against the heroes right now (eight practice fights: Trivial, Easy, Tense, Harrowing or Deadly, and how much health the heroes would lose).
- **Patrol**: click a spot (explored, within 14 tiles): the band walks back and forth between where it stood and there, a day's march each night, never stepping right next to the heroes. Right-click the map is the shortcut; Stop patrolling holds them. A band without orders prowls near its lair (wild ones stand their ground).
- **Level up** (up to level 5): +2 to hit, +1 AC, +30% hit points, +1 damage and a fifth more of them each level. Costs gold, scaled to the band's strength and level (about a quarter gold per goblin's worth of strength, times its level; at least 4).
- **Go away**: the band leaves the map for good.

The heroes hunt bands they think they can beat, avoid the ones that look too strong, and walk into any band they didn't know was there. How they size a band up (0.10): their party power counts for more as they level (×1 + 0.06 per level), and hordes of weak monsters count for much less against high-level heroes (spells and armour), so goblins stop being worth their time. The wilds keep up: each week up to 3 new wild bands wander in (8 at most), tougher kinds as the heroes grow (goblins, wolves, bandits; then orcs, skeletons, ogres; wraiths and trolls; giants and vampires; hydras and dragons), sized to look like a fair fight.

### Raids
- Heroes who reach a worked site drive your minion off: about one in four doesn't make it home, the rest walk back to the tower, and nobody can work the site for 3 days. The mine or camp stays open. A lair within two tiles of a site guards it: raiders fight its garrison first.
- Heroes storm lairs they think they can beat. A lair they beat, or find empty, is wrecked: no brood for 4 days. Half-built lairs are torn down.

### Millbrook (0.19)
The heroes' town, and you run it too. Its purse starts at 40 gold, 20 lumber and 10 ore, and fills from taxes (4 gold, 1 lumber and 1 ore a day), its own buildings, and the heroes' loot: after every fight they win, outside the finale, they bring home (3 + 2 × party level) gold times 0.3 for a Trivial fight, 0.6 Easy, 1 Tense, 1.4 Harrowing. A treasure chest adds 8 + party level.

One building goes up at a time, paid from Millbrook's purse up front (cancel for a full refund). The Millbrook screen has two tabs, Buildings and Quest board; the sidebar's Millbrook button says what's going up and lights when the builders are idle and something is affordable.

| Building | Levels | Each level | Cost (gold/lumber/ore) | Days |
|---|---|---|---|---|
| Market | 3 | +3 / +5 / +8 gold a day | 20/10/0, 35/15/5, 55/25/10 | 2, 3, 4 |
| Sawmill | 3 | +3 / +5 / +7 lumber a day | 15/5/0, 30/10/5, 45/15/10 | 2, 3, 4 |
| Ironworks | 3 | +2 / +3 / +5 ore a day | 20/10/0, 35/15/0, 50/25/0 | 2, 3, 4 |
| Blacksmith | 3 | +1 to hit, then +1 AC, then +2 damage, for every hero (they add up) | 25/10/10, 45/15/20, 70/20/35 | 3, 4, 5 |
| Temple | 2 | heroes heal twice as fast between fights; then once a week a fallen hero comes back to life | 30/15/5, 60/20/20 | 3, 5 |
| Mage Guild | 2 | wizards and clerics +1 to hit and +2 damage, each level | 35/10/15, 60/15/30 | 3, 5 |
| Training Yard | 2 | +15%, then +30% experience from every fight | 30/20/0, 55/30/10 | 3, 4 |
| Tavern | 2 | mood +1, then +2 a day; at level 2 new heroes arrive with a magic item | 20/15/0, 40/25/5 | 2, 3 |

**The quest board.** Post a bounty on anything you can see: a band, a lair (yours or wild), a treasure or encounter, a landmark the heroes haven't explored, the villain on the map, or the Dark Tower from party level 10. Small, Good or Rich (8, 20 or 36 of Millbrook's gold, paid now): the heroes weigh the reward when they choose where to go, and get it as experience when the job is done. Three at a time; an unfinished one lapses at the end of the week (−2 thrill). The same bounty buttons sit on the map cards of bands, lairs, finds and landmarks.

**Spells in battle** are paid from the purse of the side they help: Pull Punches (6), Lucky Break (10) and Deus ex Machina (25) from Millbrook's gold, Reinforcements (10, once a fight) from the tower's; Sound the Retreat is free. Each still costs mood and railroading. Extra spike traps cost the tower 3 gold each. Fudging an encounter roll is gone.

### Town views (0.20)
Both town screens open on a View tab: a little diorama built by world3d.js (`enterTown`) from a scene description in ui.js (`viewSpec`). The scene is an 18 × 11 valley with hills and crags behind, a road and a square, a pond (or, at the tower, a pool in the villain's colour), and trees kept off the plots. Every frame, ui.js says what stands where (`viewItems`):
- buildings (`built`), building sites (`site`, with progress) and empty plots (`plot`);
- figures;
- the summoning circle.

world3d.js keeps one sprite per item and rebuilds it when its picture, size or state changes. A finished building pops in with dust.
- **Pictures:** `levelArt('t-market', level, stand-in)` uses the newest picture there is for that level (`t-market-3`, else `t-market-2`, else `t-market`), else a stand-in from the existing art, scaled up 10–12% per level.
  - Stand-ins for Millbrook: tournament tents (market), lumber camp (sawmill), mine (ironworks), open forge (smith), shrine (temple), the Archmage's tower (guild), the Wolf Den's yard (training yard), the cottage (tavern).
  - Stand-ins at the tower: vampire manor (library), Demon Pit (blood fountain), orc camp (barracks), omen stone (obelisk), artifact pedestal (altar), building site (masons), ore cart (storehouse), gold pile (treasury).
- **Main buildings:** `hallStage(s)` counts Millbrook's building levels (stages at 0, 3, 7, 12, 18, out of 22 levels in all). `towerStage(s)` counts research ranks plus library levels (0, 3, 7, 12, 16, out of 19). Each stage is a bigger picture: `t-hall`, `t-hall-2`... and `tower-<villain>`, `tower-<villain>-2`...
- **Picking:** a ray against the pictures, ignoring their transparent pixels. Buildings come before the invisible ghosts of empty plots, and then the plot rings on the ground.
- **People:**
  - the party in Millbrook's square when it stands on the town's tile, and waiting recruits by the tavern;
  - the villain at the tower's door when at home;
  - up to 10 minions idle at the tower walking slow loops;
  - the first minion in the summoning queue as a glowing ghost in the circle.
- **The flat map setting** draws the same items on a painted field. On a narrow screen the 3D camera shows the middle 12 tiles of the town.

### Payoff and mood
- Experience depends on how the fight looked to the heroes beforehand (beatable 0.6, worthy 1, too strong 1.3 × the monsters' hit points; nothing for a fight they thought trivial).
- Thrill per fight: Trivial 0 (it was −2 when you sent the fight), Easy 2, Tense 5, Harrowing 8, plus downs, firsts and drama.
- Mood: each week, thrill minus what the players expect (20 rising to 34 by week 8; it was 30 to 44), minus 1 for every day nothing happened (was 2). Fudging in battle costs mood right away. Since 0.19 the mood is a score: at 0 the players grumble, but nobody marches early.

## Combat (alpha 0.9)
- **Groups.** Every stack fights as groups of about three (goblins, skeletons, wolves, bandits, orcs), two (wraiths, hollow knights) or one (ogres, trolls, giants, dragons, vampires, hydras, demons), up to 12 groups on the field; bigger armies make bigger groups. One attack roll can no longer drop a hero with a stack of nine.
- **Move, Attack, Bonus.** Every unit, hero or monster, gets a move (split it before and after acting), one action (attack, cast, defend, or dash for a second move) and one bonus action each turn:

| Unit | Bonus action |
|---|---|
| Barbarian | Second Wind: once a battle, heal 1d10 + level |
| Rogue | Off-hand Strike: after attacking, a half-damage stab at an adjacent enemy |
| Cleric | Healing Word: 3 mana, heal an ally within 6 hexes and get them back up |
| Wizard | Misty Step: 2 mana, teleport up to 5 hexes |
| Goblins | Nimble Escape: after attacking, slip up to 2 hexes away |
| Wolves, ogres | Knock Down: an adjacent hero is knocked prone (melee advantage against them, half a move to stand) |
| Hill giants | Stomp: the same, for giants |
| Bandits | Thrown Daggers: 1d4 + 1 each at a hero within 4 hexes |
| Skeletons, hollow knights | Shield Wall: +2 AC until their next turn |
| Orc archers | Steady Aim: before shooting, advantage on the shot, no more moving |
| Wraiths, vampires | Phase, Mist Form: drift 3 or 4 hexes away |
| Trolls, dragons, hydras, demons | Rend, Tail Swipe, Extra Bite: after attacking, a half-damage strike at an adjacent hero |

- **Command mode** shows Move, Attack, the unit's bonus by name, End turn, Wait, Defend, Auto turn (the AI finishes this turn) and the Spellbook. Clicking a hero still attacks and clicking a lit hex still moves; the buttons narrow what a click does. Keys: M, F, B, E, W, D, A. While you watch, a tracker shows each unit's Move, Attack and Bonus as it uses them.

## Sound (alpha 0.17)
Made with ElevenLabs (`tools/elevenlabs_gen.py`, run on the Mac; `tools/audio_import.py` brings the files in). Everything lives in `art/audio/` and is listed under `audio` in `art/manifest.json`; with no files, the game is silent and nothing breaks.
- **Music** follows the moment: title on the title screen, the map theme on the map, the tower theme in the Dark Tower screen, the battle theme in fights, the finale theme at the citadel, then victory or defeat. Tracks crossfade over a second and a half and loop (victory and defeat play once).
- **Ambience** under the music: the countryside by day, the night while the minions work, the tower's fire and chains in the tower screen. Seamless 20-second loops, kept as WAV so they loop without a click.
- **Effects**: a soft click for buttons, a thud when something's refused; the minions answer when selected and shuffle off when ordered; coins when paying; the night bell, hammering while lairs go up, the dawn, then a sound for each thing finished overnight (lair, summoning, research). Battles: dice, blows (three kinds), misses, crits, arrows, fire, holy and dark spells, deaths, a hero going down, the occasional roar from a big monster, a horn at the start, the villain's laugh in the throne room, a level-up chime, a treasure sound when the heroes come out with a new magic item, fanfares at the end. Repeated sounds have variants and a slight random pitch so they don't feel mechanical.
- **Footsteps** (0.17.1): while the party walks, a seamless loop for the ground under them (road, or else grass, forest, snow or swamp; dirt, wasteland and mountain passes use the road), starting at a random point so short walks vary, fading out a quarter of a second after the last step. They follow the effects volume.
- **Settings**: volume, music, effects and ambience sliders (0 to 100; defaults 80, 50, 80, 50) and Mute; the speaker button beside Menu mutes too. Nothing plays while the tab is hidden, and nothing before the first click or key (the browser's rule).
- Loudness is evened out on import (effects about -16 LUFS, music -17, ambience -24); the click, the refusal thud and the page turn are cut short so no hiss trails them. The whole set is about 14 MB.

## The heroes talk (alpha 0.18)
Every hero has 14 lines in `tools/hero_lines.json` (the text is built into the game, so they talk even before any audio exists): **start** (a fight begins), **danger** (it looks deadly, a boss, or the finale gates), **hard** and **easy** (after a win: Tense or Harrowing, Trivial or Easy), **down** (another hero falls; said by someone still standing), **rest** (the party starts a day below half health), **explore1/2** (now and then while walking), **levelup** (the hero who levelled), **loot** (the hero who got a new magic item, from any source), **town** (walking into Millbrook), **march** (the first day of the march on the tower), **boss** (the throne room, after the villain's laugh) and **win** (the realm is saved).
- One line at a time. On the map at least 15 seconds between lines (5 in battle), and each kind has its own wait (travel chatter 2½ minutes, the rest call 2 minutes, a battle start 20 seconds). The march, boss and victory lines always play; a fallen friend's cry can interrupt.
- Who speaks: the hero the moment is about, or whoever has been quiet longest, with a little chance mixed in.
- The pop-up sits at the top left of the map or battlefield: the hero's talking portrait, their name and the line. With a recording, the mouth follows the words: PixelLab's lip-sync plan gives each mouth shape the stretch of text it covers, and ElevenLabs' timing gives the moment that text is spoken. Without one, the portrait bobs while the text shows.
- Voices play on their own channel (Hero voices, default 90) and the music and ambience dip to 45% under them. Heroes talk can be switched off in Settings.

## Mouse cursors
- Map: a hand over anything you can click (lairs, sites, minions, bands, landmarks), a grab hand over open ground (drag to pan). With minions selected: a pickaxe over a site they can work, a hammer over a half-built lair, boots over the tower, a crossed circle over a full or raided site. While placing a lair: a pin where it can go, a crossed circle where it can't. In Move mode: boots, pickaxe or hammer for what a click does. Setting a patrol: boots where it can go.
- Battle, when you're in command: boots (move), sword (melee), target (shoot), crossed circle (out of reach).

## Saves, accounts, feedback
- Autosave every action to the browser. With an account, a cloud autosave about every 20 seconds and at the end of each day and battle. Three most recent campaigns kept as autosaves, plus six slots.
- Export and import save files.
- Supabase: `saves` (row-level security: players see only their own) and `feedback` (anyone can insert; only you read it, via `feedback_inbox`). The first three errors in a session report themselves.

## Readiness and the march
- Below level 10: Hopeless or Long odds.
- From level 10, the party simulates the showdown (10 runs, remembered until levels, items, tower buildings, villain or army change). They march when they'd win at least 55% of the time.
- They also march when every hero has reached level 20. (Until 0.19 they also marched, ready or not, at 0 mood.)
- **Score** (0.19): no clock, but speed pays. A win scores 10 points for every day under 140, plus the campaign's thrill, plus 3 × the mood at the end, minus 30 per hero lost. Won by week 8: a legendary campaign; by week 10 great; by 13 solid; after that long.
- Magic items (0.16): the heroes find one after 55% of their Tense wins and 80% of their Harrowing ones (from party level 3, not the finale), and someone hands them an heirloom as their fame grows, at party levels 10, 12, 14, 16 and 18. That's on top of chests, artifacts, the stranger and wrecked lairs: about 9 items a campaign. The DM's "leave a magic item" is gone.

## Old saves
Version 6 and 7 saves convert on load: each tower building from 0.8 becomes a lair near the tower with its share of the garrison, the Library carries over, and you get 4 minions, the map's sites and some starting resources.

## Balance (headless sims, alpha 0.19)
- The scripted DM from 0.16, plus Millbrook: whenever the builders are idle it builds the first thing it can afford from a fixed list (market, blacksmith, sawmill, ironworks, temple, training yard, then the second levels, mage guild, tavern...). It posts no bounties and casts no spells.
- 64 campaigns: 56 hero wins (88%), 8 wipes (12%), none still going. Wins came in week 10.6 on average (week 8: 6, weeks 9 to 10: 19, weeks 11 to 13: 23, later: 8). The town finishes everything around week 11, and its gold then piles up (several hundred by the end).
- Without the town (same DM, same rules), most parties wiped: the blacksmith, temple and training yard are what carry the heroes now that the mood no longer marches them early.
- Early fixes: Millbrook's taxes include 1 ore a day (with none, a town that hadn't built an ironworks could never afford a temple). A leftover path still marched a bored table on the tower after fights; it's gone.
- Random play with town building, bounties and spells (40 campaigns) ran without errors.

## Balance (headless sims, alpha 0.16)
- The scripted DM now researches everything in a fixed order (Ogre Den, Haunted Barrow, Master Masons, Dark Vigor, ...), two at a time in its queue, and no longer gives magic items.
- First pass (research, all dark powers at full strength, no gifts, no loot): 36% hero wins, most of the wipes in the finale. The fixes, measured over 64 campaigns each: halving the dark powers and adding loot from close fights (55%); making the heroes wait for 70% odds before marching (worse, 52%: they meet more bands on the way); restoring the per-lair Lore price (55%); heirlooms at party levels 10 to 18 (66%, kept). Tireless Hands on its own is worth only a couple of points.
- Final: 66% hero wins, 27% wipes, 8% still going at week 20; about 9 magic items a campaign; wins in week 10.5 on average; thrill 318 a campaign against 291 in 0.15.

## Balance (headless sims, alpha 0.10)
- No war parties. A scripted DM that trains up to 8 minions, works the sites, builds the strongest lair it can near the heroes' road, lets spare minions plot, and handles the bands it can see like a careful DM (only while the heroes are fresh: sends away anything that looks deadly, levels up easy prey while it still looks worthy, patrols at most two bands toward the road ahead): 16 campaigns, 13 won (weeks 8–17, mostly 8–10, level 15–20), 3 lost in the throne room at level 14–15; 22 deaths in total. Average level by the end of each week: 2.4, 4.8, 6.8, 8.4, 9.6, 10.9, 12.3, 13.4. Fights: 18% Tense, 13% Harrowing, 23% Easy, 46% trivial (now worth no thrill rather than −2).
- What got it there: hordes of weak monsters count for less against high-level heroes, heroes count for more as they level, the wilds send tougher kinds as the heroes grow, lairs send out bands big enough to matter, and the weekly mood drain is lower (20 rising to 34). An aggressive DM that levels everything and sends every band at the heroes wiped a third of its parties in weeks 2–3.

## Balance (headless sims, alpha 0.9)
- A scripted DM that trains up to 9 minions, sends idle ones to whichever resource is lowest (away from the heroes), builds the strongest lair that still makes a fair fight in numbers at the best spot near where the heroes are heading, expands lairs with spare Lore, sends the fair fight when there is one, and from level 12 leaves magic items when the heroes aren't ready: 8 of 8 campaigns won, in weeks 7–12 (mostly 9–11), at party level 15–20, with 6 deaths in total.
- Average party level by the end of each week: 3.8, 6.4, 7.9, 9.0, 10.3, 11.1, 11.7, 13.1, 14.2, 15.3.
- That DM attacked on about 4 days in 10: on the others no lair was in reach, or what was in reach couldn't make a fair fight. A player who builds ahead of the heroes will do better. Raids drove minions off about 4–5 times a campaign, and 5–18 lairs got wrecked.
- Alpha 0.9.2 (two starting minions, raw sites, one minion per site, 3/3/2 a night), same scripted DM, 16 campaigns: 15 won (weeks 6–13, mostly 7–11), 1 lost at the throne at level 14; 10 deaths in total. The same batch on the 0.9 rules: 14 won, 1 wipe, 1 unfinished, 12 deaths. Week 1 is leaner (about 50 gold and almost no lumber or ore against 70/5/6), weeks 3–8 bring in a bit more ore than before.
- Fuzz: random parties and villains, random minion orders, lairs on random spots, expansions, cancellations, war parties of any size, battles played step by step by hand or by the AI: 40 campaigns, no errors. Saves from 0.7 and 0.8 convert and play on.

## Progress bars (alpha 0.9.2)
- Over a site a minion is opening (empty while it walks there, filling on the night it arrives), and over a lair going up (days done out of days needed, green). The 3D labels and the flat map both show them.
- In the sidebar: the site card (opening tonight / on the way), the lair card (days done), and the minion card (how far along its walk it is).

## Name and title (alpha 0.21)
- **Overmaster.** Tagline: "Heroes need villains. You're both." Developed by Alex Larente.
- **Emblem:** a heater shield split down the middle, the heroes' half in blue with a gold sun and the villain's half in purple with a horned red eye, a gold d20 at its heart. One SVG (`EMBLEM_SRC` in front.js) draws it in the opening, on the title screen and as the favicon (`site/favicon.svg`). Each copy gets its own gradient ids.
- **Wordmark:** OVERMASTER in Cinzel 800, one span per letter, with a gold gradient and a white shine that sweeps letter by letter (`.wordmark`).
- **The opening** (`showIntro` in front.js, `.intro` in front.css) plays once a visit (sessionStorage `om-intro`), starts when the fonts are loaded, and is skipped for reduced motion and for a game restored after a reload. While it plays, the title column is hidden with `visibility` rather than faded, so a slow compositor can never leave the menu invisible.

