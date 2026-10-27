# Overmaster — roadmap

## Delivered in alpha 0.30: the villain edition (step 1 of 3)
You play only the villain now, in the spirit of Dungeon Keeper. The dungeon-master version, where you ran both sides, is kept on the `classic` branch and as the "Overmaster Classic" preview.
- **Your villain rises from level 1.** Infamy levels it up: hurting, downing and killing heroes, breaking into Millbrook, plunder, burned buildings, and every lair you keep standing. Each level is a talent point and a stronger villain on the throne, and its battle powers unlock at levels 6, 11 and 16. A window marks each level-up.
- **Lairs attack on their own.** When a lair fills up, three nights' brood marches down the road to Millbrook as a wave. You only build and upgrade lairs; you can still level a wave up, send it away, or turn it into a patrol.
- **Sieges.** A wave at the gates fights Millbrook's archer towers, ballista, arcane tower and temple bell, then batters the walls. Once through (flyers go straight over), it damages the town hall, carries gold, lumber and ore off to your tower, and burns buildings down a level. Brutes break walls twice as fast; undead fear the bell. A report and floating numbers over Millbrook show what happened each night.
- **The heroes defend their town.** If they're home when a wave arrives, they man the walls: a battle outside Millbrook's gate, the wall across the field with breaches where it's battered, and the towers firing every round. On the road, they go out of their way to stop a wave.
- **Millbrook runs itself.** It spends its taxes and the heroes' loot on trade, the heroes' buildings, and whichever defence would best stop the waves that have been hurting it. It posts bounties on the lairs that hurt it most, and its tavern replaces a wiped-out party with a new, greener one. Its screens are for scouting now: the town, its walls and hall, the waves on the road and how each would fare, and what it's building.
- **Win** by razing Millbrook (its hall falls) or wiping out its heroes once the tavern is gone. **Lose** if the heroes beat your villain on the throne; from level 12 they size up the showdown and march when they like their odds. The score rewards a fast win and Infamy, and counts how long a fallen reign lasted.
- **Gone:** the spells that helped the heroes, posting quests, running Millbrook's builders, and the players' mood.
- **New title text:** "The heroes are coming. Be ready."
- **Millbrook's defences have their pixel art:** the palisade, stone walls and great walls at the town gate, archer towers I–III, ballista I–II, arcane tower I–II and the temple bell, in the town view and on the Defences cards. They're drawn at about two thirds of a building's size so the front of the valley isn't crowded, and the town view's hint moved to the top.
- **Balance.** In 60 simulated campaigns with a scripted villain (10 per villain), the villain won 58%: Millbrook was razed in week 3 to 11 (usually 6 to 8), and the losses came in week 6 to 13, once one at 18. No villain won fewer than half. The villain reaches level 20 around week 9 to 10, about when the heroes reach 14 to 16.
- **Saves:** version 16. Older campaigns carry on with a villain two levels above their heroes.

**Next, step 2:** a much bigger map (about 80 by 56 tiles instead of 40 by 28), with several roads into Millbrook and longer quests for the heroes. **Step 3:** a Siegecraft talent path (war drums, battering rams, plunder), then each paid villain's own map rules on top (the Death Knight's Legion raiding farms, the Vampire Lord's thralls draining the town, the Dragon burning a watchtower).

## Delivered in alpha 0.24
- **Talents instead of research.** The villain no longer buys research with gold and ore. Instead the villain earns **talent points**:
  - one to start;
  - one every time the heroes gain a level;
  - one for every 6 **Infamy**, which comes from tense and harrowing fights and from heroes knocked down;
  - one for each level of the Forbidden Library.
- **The trees.** Points are spent at the Dark Tower in four trees, World of Warcraft style. A row opens once enough points are spent in its tree (0, 2, 4, 6 and 8), and many talents have 2 or 3 ranks.
  - **The Brood:** new lairs, bigger broods, and tougher goblins, wolves, brutes and undead, up to Apex Predators.
  - **Dominion:** faster summoning and building, richer mines, nightly gold, longer reach and sharper eyes, up to Dark Empire (lairs go up in one night).
  - **Dread:** the villain's dark powers, the honor guard, and Ascension for the final fight.
  - **The villain's own path,** six to seven ranks of talents only that villain has.
- **Each villain's own monster,** learned at the top of its path:

  | Villain | Monster | Lair |
  |---|---|---|
  | Lich | Bone Colossi | Bone Forge |
  | Ancient Dragon | Drakes | Drake Eyrie |
  | Demon Prince | Hellhounds | Brimstone Kennels |
  | Archmage | Iron Golems | Golem Foundry |
  | Vampire Lord | Werewolves | Werewolf Lodge |
  | Death Knight | Black Riders | Black Stables |

  Their pixel art is in: all six monsters, and the Bone Forge, Drake Eyrie, Brimstone Kennels and Werewolf Lodge. The Golem Foundry and Black Stables came out wrong (a lone anvil, and an empty pen), so they keep a tinted stand-in until they're redone (`pixellab_gen.py objects foundry stables --redo`). Anything without its own art borrows another monster's or lair's picture, tinted. The monsters have no portraits yet (`pixellab_gen.py portraits colossus drake hellhound irongolem werewolf rider`), so their round tokens are cut from their sprites.
- **More art in:**
  - the Dark Tower's works in the tower view: the Forbidden Library and its second wing, the Blood Fountain at three sizes, the Barracks, the Black Obelisk, the Ritual Altar, the Masons' Yard, the Storehouse and the Treasury;
  - the redone Village Hall;
  - Orrin's and Maelis's talking portraits.
  - The redone Blacksmith III and Training Yard II came out small again, a brazier and a tiny figure, so they still use stand-ins.
- **The edge of the world** is a coastline now. The map's outer ring of water and mountain tiles used to show as square pools and stripes. That ring and everything beyond now continue the land just inside, which ends in a ragged shore of bays and headlands, with the sea out to the dark.
- **Respec.** Once a week, every point can be unlearned and spent again. Lairs already built keep working.
- **Old saves** keep everything they had researched as talents, get their queued research refunded, and start with as many points as their heroes' level would have earned.
- **The villain picker** shows each villain's own monster and talent path. The shop's unlock panel lists them too.
- **Fixes:**
  - Heroes who started their march while standing on the tower's tile now storm it, instead of waiting forever.
  - A non-boss battle that drags past round 40 ends with the monsters fleeing.
  - Talents that grant regeneration heal 10% a turn, not a troll's 30%.
- **Balance.** In 56 simulated campaigns with a scripted villain, the heroes won about 80% of the time, in week 9 to 10 on average. The villain earned about 22 talent points in a campaign: 17 from levels, 4 from Infamy and 1 to 2 from the Library.

## Delivered in alpha 0.23
- **The party sheet.** One window with all four heroes side by side. Each hero shows HP, mana and XP bars; to hit, AC, damage (with its average), speed and save; skills; abilities, with the next one due; and artifacts. Treasures the whole party shares are listed underneath, along with how ready the heroes are for the showdown. Bonuses from Millbrook's buildings are called out under each hero's stats. Open it with the **Party** button beside "Heading for", or the **P** key. A portrait opens that hero's full sheet, which now has a **Whole party** button back.

## Delivered in alpha 0.22
- **The shop, in test mode** (plan: `docs/monetization-plan.md`). The Lich and the Ancient Dragon are free. The Demon Prince, Archmage, Vampire Lord and Death Knight are $2.99 CAD each, or $7.99 for all four (the Dark Court). Owning some lowers the bundle's price to what's missing.
- Locked villains show a price on the villain picker, with an unlock panel and **Unlock to play** in place of Next. The title screen has a **Shop** with **Restore purchases**.
- Buying as a guest asks the player to sign in first (Google first, email as a backup), then offers to carry on to Stripe's checkout. Coming back from Stripe lands on the same villain and unlocks it in a few seconds.
- Unlocks live in Supabase (`entitlements`, readable only by their owner, writable only by the server). Two Edge Functions, `checkout` and `stripe-webhook`, set prices on the server, check Stripe's signature, and take unlocks back on a full refund. `node tools/test_store_functions.mjs` tests both.
- **Redeem a code** in the account window, in the Shop, or from a link ending in `?redeem=CODE`, which survives signing in. Alex makes codes in the SQL Editor (`make_codes` for batches of random single-use codes, `make_code` for a shared code like BETA2026), with labels, use limits and expiry dates. Redeeming goes through one database function (`redeem_code`) that counts uses, gives each player one use, and makes a player wait after ten wrong codes in an hour. `node tools/test_codes_sql.mjs` tests it on a real Postgres.
- The store is off until `config.js` says `store: true`. Until then, and in the Claude preview, every villain is unlocked. Setup is step 6 of `site/README.md`.

## Delivered in alpha 0.21.1
- **Pixel portraits on a first visit.** On a fresh visit to the website, the villain and hero pictures on the setup screens showed their old cartoon stand-ins and kept them, because those screens were drawn before the pixel art had downloaded. Every picture now swaps to its pixel art the moment that art arrives, on every screen.

## Delivered in alpha 0.21
- **The game is called Overmaster** ("Heroes need villains. You're both."). It replaces Behind the Screen, which was already the name of a game on Steam, and it stays clear of Wizards of the Coast's "Dungeon Master" trademark. Saves, settings and save files from earlier builds still load.
- **An opening.** The first time the game loads in a visit: "Alex Larente presents", then the emblem and the OVERMASTER wordmark rise letter by letter through drifting embers, then the tagline and "Press any key" (or "Tap to begin" on phones). Any key, click or tap skips it, unlocks sound and plays a low sting. It's skipped when the player has asked for reduced motion and when a game is restored after a reload.
- **A new title screen**: the emblem (a shield split between the heroes' blue and gold and the villain's purple, with a d20 at its heart), the wordmark with a slow gold shine, and "Developed by Alex Larente" in the footer. The emblem is also the browser-tab icon.
- **Ready for GitHub.** A `.gitignore` that keeps built files, keys and tokens out, a top-level README, and a GitHub route in `site/README.md`: Cloudflare Pages builds the site from the repository on every push (`bash build.sh`, output `dist/site`).

## Delivered in alpha 0.20.1
- **Millbrook's own pixel art** (PixelLab, 26 pictures): every building at every level, from a market stall to a covered market hall and from a hamlet hall to the Capitol. The town view sizes them all at one pixel scale, so a bigger level really is a bigger building.
- **The heroes speak** (the 0.18 voices, now in): all 20 heroes have their 14 voiced lines. 18 of them have a talking, lip-synced portrait; Orrin's and Maelis's mouth shapes timed out at PixelLab and need another run (`pixellab_gen.py talk orrin maelis`). Until then their portraits bob while they talk.
- Each hero's voice lines are now one file per hero, and their mouth shapes one picture strip. A published artifact holds at most 511 files, and one file per line (280 of them) would have gone over.
- To redo: `t-hall-2` faces the camera head-on, `t-smith-3` came out smaller than level 2, and `t-yard-2` is drawn from straight above (`pixellab_gen.py objects t-hall-2 t-smith-3 t-yard-2 --redo`).

## Delivered in alpha 0.20
- **Town views.** Opening Millbrook or the Dark Tower now shows the town itself, as in Heroes 3: a small 3D scene in the map's style, with every building a pixel-art picture standing on its own plot. Lists are one tab over (Buildings and Quest board; Tower, Research, Lairs and Villain).
  - **Empty plots** are rings on the ground. Point at one to see the ghost of what would stand there and its price.
  - **Building:** while a building goes up it rises out of scaffolding, with dust and sparks. When it's finished it pops into place.
  - **Clicking a building** opens its card over the view (build, enlarge, research, summon...).
- **The main building grows as the town does**, in five stages each:
  - Millbrook's hall goes from Hamlet Hall to Village Hall, Town Hall, City Hall and the Capitol, at 3, 7, 12 and 18 building levels.
  - The villain's tower goes from Watchtower to Dark Tower, Black Citadel, Dread Fortress and Throne of Night, at 3, 7, 12 and 16 researches (library levels count too).
  - The header shows the stage and when the next one comes.
- **Who's home shows:** the heroes stand in Millbrook's square while the party is in town, and recruits wait outside the tavern. At the tower, the villain waits at the door when at home, idle minions wander the yard, and a new minion takes shape in the summoning circle.
- **The tower's works come from research.** A blood fountain fills with each rank of Dark Vigor; Call Servants raises barracks, Dread Aura a black obelisk and Dark Ritual an altar; Master Masons adds a masons' yard and Tireless Hands a storehouse. A banner for every kind of monster you can raise lines the road, and the treasury's gold pile grows with your gold. Everything takes on the villain's colours: the Lich's green pool, the Dragon's lava, and so on.
- **Ready for art:** `pixellab_gen.py objects millbrook` draws every Millbrook building at every level, the hall's five stages and a notice board (26 pictures). `objects darktower` draws the tower's works (11), and `objects stages` draws each villain's tower at stages 2 to 5 (24; `stages-lich` does one villain). Until the art exists, the views borrow existing pictures, scaled up a little for each level.
- The flat map setting has a flat version of the views, and on a phone the view shows the middle of the town larger.

## Delivered in alpha 0.19
- **You run both towns.** The Dark Tower is the villain's town and Millbrook is the heroes'. Each has its own purse of gold, lumber and ore, shown side by side in the bottom bar (click either to open that town).
- **Millbrook.** The town earns taxes every day, and the heroes bring home a share of the loot from every fight they win: the closer the fight, the bigger the share. It spends that on eight buildings, one at a time over a few days each:
  - the Market, Sawmill and Ironworks make money;
  - the Blacksmith (+1 to hit, then +1 AC, then +2 damage for every hero), Temple (faster healing, then a weekly resurrection), Mage Guild, Training Yard (+15% then +30% experience) and Tavern (mood, and new heroes arrive with a magic item) make the party stronger.
- **The quest board is back.** From Millbrook, or from the card of anything on the map, you can post a Small, Good or Rich bounty (8, 20 or 36 of the town's gold) on a band, a lair, a find, an unexplored landmark, or the Dark Tower from party level 10. The heroes weigh the reward when they choose where to go, and they're paid in experience. Up to three bounties can be posted at once.
- **Lore is gone.** Research, the Library, expansions and the deadlier lairs are paid in the tower's gold and ore. Each level of the Library now takes a night off every research. Minions no longer Plot, and the "fudge a roll" button in events is gone. In battle, spells that help the heroes are paid from Millbrook's gold (Pull Punches 6, Lucky Break 10, Deus ex Machina 25), and Reinforcements (once a fight) and extra traps from the tower's.
- **No clock; speed is the score.** The table's mood no longer forces an early march on the tower; it's part of the score. Winning scores 10 points for each day under 140, plus the thrill, plus three times the final mood, minus 30 for each hero lost. Winning by week 8 rates a legendary campaign, by week 10 great and by week 13 solid.
- **Skip** (from 0.18, now released): one button jumps to the end of any fight, and a setting skips every fight for players who want to focus on building.
- **Balance**, over 64 scripted-DM campaigns that build up Millbrook as they go: 88% hero wins and 12% wipes, with no campaign stuck. Wins came in week 10.6 on average (8 to 21, mostly 9 to 13). In 0.16 it was 66% wins, 27% wipes and 8% still going at week 20. Without the town, the same DM wipes most of its parties.
- Ready for art and sound: pictures for each Millbrook building (`pixellab_gen.py objects t-market t-sawmill t-ironworks t-smith t-temple t-guild t-yard t-tavern`), and a town theme and village ambience (`elevenlabs_gen.py music-town amb-town`). Until then the buildings borrow existing icons and the town screen plays the map music.

## Delivered in alpha 0.18
- **The heroes talk.** Each of the 20 heroes has a voice of their own, designed with ElevenLabs from their bio, and 14 lines in character. Brakka wants his song, Bramble bills for every bruise, Orrin chases his footnote, Zarga consults the bones. Their portrait pops up at the top left with the line and a talking mouth, lip-synced by PixelLab to the words. They speak when a fight starts (or looks deadly), after a hard or an easy win, when a friend goes down, when the party needs a long rest, while they travel, on a level-up or a new magic item, arriving in Millbrook, on the march to the Dark Tower, facing the villain and at the victory. The music dips while they speak.
- Settings: a Hero voices volume and a Heroes talk switch.

## Delivered in alpha 0.17.1
- **Footsteps** while the party walks the map, matching the ground under their feet: a road, grass, a forest, snow or a swamp. They fade in with the first step and out when the party stops.

## Delivered in alpha 0.17
- **Sound and music**, made with ElevenLabs: 44 sound effects (dice, blows, misses, crits, spells, deaths, minions, building, summoning, research, the night bell and the dawn, fanfares), three seamless ambience loops (the countryside by day, the night, inside the Dark Tower) and seven music tracks (title, map, tower, battle, finale, victory, defeat). The music changes with the moment and crossfades; nothing plays until the first click, as browsers require.
- **Volume sliders** in Settings (volume, music, effects, ambience) and a speaker button beside Menu to mute.
- **A Dark Tower for each villain**: the Lich's spire, the dragon's volcano, the Demon Prince's horned fortress, the Archmage's starry tower, the vampire's castle and the Oathbreaker's keep. Also redone: the Old Silver Mine, the Wolf Den and the wrecked-lair look.

## Delivered in alpha 0.16
- **Research at the Dark Tower.** Five lairs are known from the start; the rest, from the Ogre Den to the Demon Pit, are researched with Lore and a few nights each, one at a time with up to 3 in line (cancel for a refund). The villain's dark powers moved into research too, alongside three servant upgrades: Swift Summoning (1-night summons), Master Masons (a day less work per lair) and Tireless Hands (+1 from every worked site).
- **A new Dark Tower screen** with tabs: Tower (summoning, the research under way, the Library, last night), Research (the queue and three trees with connecting lines: Monsters, The villain, Servants), Lairs and Villain. Gone: leaving magic items for the heroes, and the list of gold, lumber and ore sites (finding them is part of the fun).
- **Instant hover tips** everywhere, from the resource bar to price tags and research nodes, instead of the browser's slow ones.
- **Balance:** the heroes no longer get magic items from the DM, so they find them themselves: after most close fights, and as heirlooms when their fame grows (party levels 10, 12, 14, 16 and 18). The dark powers are half as strong (all four together: +43% HP and +1 to hit), since every DM can now research them. Over 64 scripted-DM campaigns that research everything: 66% hero wins (70% in 0.15), more Harrowing fights and more thrill. Random play ran clean.

## Delivered in alpha 0.15
- Building takes time, RTS-style. Each lair needs days of work by the minion that builds it: 2 for a Goblin Warren, 3 for the Bandits' Hideout and the other early lairs, up to 7 for the Demon Pit. Helpers standing at the site add a day's work each, and the Archmage's Clay Servants work twice as fast.
- New minions are summoned, not bought outright: 2 nights each, one at a time, up to 4 waiting in line, paid up front and cancellable for a full refund. The Forbidden Library takes 3 nights to raise and 4 more for its new wing.
- Under construction on the map: the lair rises bottom-first out of a wooden scaffold as the work goes in, the rest of it shown as a faint blue plan, with dust and sparks while the builders hammer. A finished lair pops into place. At the Dark Tower, the minion being summoned takes shape in a purple rune circle, and the Library's building site stands beside the tower while it goes up.
- The tower screen shows the summoning queue with progress bars and cancel links, and the Library's progress; the sidebar's tower button says what's summoning and building.
- Balance checked over 64 scripted-DM campaigns on random maps: 70% hero wins against 72% in 0.14, the same levelling pace, slightly more Tense fights. 60 random-play campaigns ran clean.

## Delivered in alpha 0.14
- A new map every campaign: Millbrook and the Dark Tower start far apart (26+ tiles), the four landmarks are shuffled (two near Millbrook, two farther out, one of them toward the tower), and their regions, the lakes, the roads, resources, wild monsters and finds all follow. Old saves keep the map they started on.
- Balance checked over 64 campaigns of the scripted DM on random maps: 72% hero wins against 78% on the old map (within the sims' noise), with the same levelling pace.
- Ready for a Dark Tower per villain: the Lich, Dragon, Demon Prince, Archmage, Vampire Lord and Death Knight each get their own lair on the map and in the sidebar once their PixelLab pictures are in.

## Delivered in alpha 0.13
- Map buildings and landmarks in PixelLab pixel art: Millbrook, the Dark Tower and the other sites, every lair type (plus half-built), the gold/lumber/ore spots, chests, shrines, encounters and traps now stand on the 3D map as pixel pictures instead of 3D models.
- The same pictures are the icons everywhere: sidebar, cards, prices, the flat map. The resource bar has its own gold, lumber and ore icons, and Lore and the hourglass are pixel art too.
- Still to come: the Old Silver Mine, the Wolf Den and the wrecked-lair look (being redone), then trees and rocks.

## Delivered in alpha 0.12.2
- PixelLab portraits for the whole cast: every hero, monster, villain and minion has a pixel-art bust drawn from its own sprite, shown as its round token everywhere (party bar, hero sheet, turn order, cards).
- Redone: the hydra (now a five-headed beast), the Clay Servant (a terracotta golem) and the ogre (no longer a twin of the hill giant).

## Delivered in alpha 0.12.1
- The whole cast in PixelLab pixel art: all 20 heroes, 14 monsters, 6 villains and 6 minion types, each drawn from 8 sides (1.2 MB of art in all, loaded after the game starts).

## Delivered in alpha 0.12
- Pixel-art characters from PixelLab, drawn from 8 sides: the game shows the side each character is facing, keeps the pixels crisp, and cuts the round tokens from the art. A generator script makes the cast through PixelLab's API, and an importer brings it in.

## Delivered in alpha 0.11
- Characters are painted sprites standing in the 3D world (heroes, monsters, minions, the villain), on the map and in battle. Until real art exists, they're rendered from the 3D models. Settings → Painted characters switches back.
- Drop-in art: AI-made or hand-painted pictures replace the stand-ins and the round portraits. See docs/art-guide.md for prompts for every character and tools/art_import.py for the import.

## Delivered in alpha 0.10.1
- Fixed: the fog of war darkened the trees and rocks on the 3D battlefield.

## Delivered in alpha 0.10
- Less clutter: no war party panel (the heroes find your monsters on the map), no build-anywhere click, no "work the nearest" buttons.
- Minions get an action menu: Move, Build, Plot (+1 Lore a night) and Dance. Lairs are only built from a minion's Build order.
- Bands: every monster group on the map, yours or wild, can be told to Patrol, Level up (up to level 5, for gold) or Go away. Its card shows how it would fare against the heroes right now. Lairs send their broods out as bands.
- A fog of war for the DM: you see what your tower, minions and lairs see, and around the heroes; the rest of the map is dark until a minion goes there. Works on the flat map, the 3D map and the minimap.
- Rebalanced for the new loop: hero judgement of hordes and of their own strength, wilds that keep up with the heroes, bigger bands from lairs, a gentler mood drain, trivial fights no longer cost thrill.

## Delivered in alpha 0.9.2
- End day plays the night: you watch every minion walk its route, the camera pulls out to keep them in view and comes back, and each working site floats up what it made.
- Sites start as raw deposits (Gold Deposit, Timber Stand, Ore Deposit). A minion spends a night turning one into a Gold Mine, Lumber Camp or Ore Mine; new art for both stages, flat and 3D.
- One minion per site; a mine or camp makes 3 gold, 3 lumber or 2 ore a night. You start with two minions.
- Progress bars: sites being opened, lairs going up, and minions on the road.

## Delivered in alpha 0.9.1
- The minimap is back, in the map's corner, with resource sites, your lairs and minions; click to look, right-click to send minions, and a button to hide it.
- RTS-style minion control: click (or Shift-click) minions to select them, right-click a site, a half-built lair, the tower or open ground to give orders. Cursors, rings and route arrows show what's happening; the sidebar card adds Work the nearest, Build a lair (with a placement ghost), Home and Stop; I picks the next idle minion.
- Fixed: the 3D map could freeze for good right after loading a game on some maps (a long load produced a negative frame time, and the party's facing angle ran away).

## Delivered in alpha 0.9
- Resources and minions: gold mines, lumber camps and ore veins on every map; each villain sends its own minions (bone thralls, kobolds, imps, clay servants, thralls, grave diggers), each with a perk.
- Lairs are built on the map by minions and paid for in gold, lumber and ore, plus Lore for the deadlier ones. Each raises one kind of monster and strikes heroes within its reach; war parties come from the lairs in reach.
- Raids: heroes drive minions off the sites they reach and wreck lairs they can beat. A lair next to a site guards it.
- Combat: monster stacks fight as small groups, and every unit gets a Move, an Attack and a Bonus action each turn, with a bonus for every class and monster. In command mode you play them step by step.
- Mountains rise out of foothills instead of standing on the map like blocks.
- Fixed: magic items no longer double the HP and mana they add.

## Delivered in alpha 0.8
- A simpler, base-building loop. The Dark Tower is a town screen of 14 buildings, each raising one kind of monster every night, from goblins to pit demons, plus a Library for Lore. Expand each once for 75% more.
- Once a day, send a war party from your garrison. A balance meter plays the fight out ahead of time; Find a fair fight sizes one for you, and the morning pre-fills it.
- Close fights pay the most: experience by how the fight actually went, a Lore bounty, and mood. Stomps pay nothing and bore the table.
- Battles play out on their own, with Take command and Fast. No deployment.
- The main screen is down to the heroes, the war party, Your tower and End day; the bar to Lore, Mood, readiness, date and Menu. The chronicle, dice and battle log moved into the menu and settings.
- Leave magic items on the heroes' road from the tower, to get them ready for the showdown. The heroes also march once they've all reached level 20.
- Cut: quests, placing treasure, events and traps, lairs on the map, moving monsters and the villain by hand, the research tree, the railroading meter (fudging costs mood instead), the minimap.
- Old saves convert.

## Delivered in alpha 0.7
- A fantasy interface: carved oak frames with iron brackets, oak buttons with gold lettering, enamel secondary buttons, iron-rimmed bars and dice cards, parchment for the party's plan and the chronicle, gem markers, and a starry night sky. All art is original and generated in code; a licensed asset pack could replace it later.

## Delivered in alpha 0.6
- A Warcraft 3–inspired look: painted ground patterns per terrain, cobbled roads and cliff rock; textured models (masonry, shingles, wood, metal, leaves, fur, timber framing); new trees and pines; chunkier heroes with bigger weapons; a warmer light with a filmic colour grade and vignette; calmer water; painted portrait medallions.
- Fixed: heroes were squashed to half height in 3D battles; the villain's map label always said Malgrith; spell saves said "The Malgrith try to resist".

## Delivered in alpha 0.5
- Title screen, new-campaign setup, load, settings, how to play.
- Accounts (email and password, magic link, optional Google) and cloud saves through Supabase; browser saves and save files without it.
- Feedback form and automatic error reports.
- Website package for Netlify with a deploy guide.
- 20 heroes across 5 races and 4 classes, with racial traits, portraits and 3D models.
- 6 villain kinds with their own powers, models and portraits; name, title and pronouns of your choice.
- Command menu with full screens for Lairs, Citadel, Quests, Villain, Treasure & events and Chronicle.
- No more conjured monsters: wolves, bandits and goblins populate the map and keep wandering in each week; treasure and events appear on their own too.
- Context cursors on the map and in battle.
- Readiness based on simulated showdowns, so healers, items and the villain's kind count.

## Earlier (v4)
- 3D map and battles, citadel tech tree, lairs that roam or hoard, levels 1–20, XP by challenge, the march, two-stage showdown, tiered magic items, vampires, hydras and demons.

## Next: polish list (October 2026)
Roughly in the order that would make the biggest difference.

### Before other people play it
1. ~~Sound and music~~ (done in 0.17), ~~hero barks~~ (0.18). Next for sound: a second battle track and map track so long campaigns don't loop the same piece, a sound per monster kind, and a theme for Millbrook (ready to generate).
2. **A guided first game.** Only a rules pop-up today. Walk new players through their first days: select a minion, open a mine, start a research, build a lair, end the day, watch a fight.
3. **Finish the art set.** The villain towers and the redone mine, Wolf Den and wrecked lair are in (0.17); the Forbidden Library is still to make (`pixellab_gen.py objects library`). Then trees, rocks and the ground in pixel art (the map still mixes 3D models with pixel sprites), and icons for the dark powers and servant research (they borrow the villain's and minions' tokens).
4. **Character animation.** Sprites slide and hop. PixelLab walk, attack and hit animations, starting with the four default heroes and the commonest monsters.
5. **Put the game online.** A private GitHub repository connected to Cloudflare Pages, plus Supabase, so accounts, cloud saves and tester feedback work (guide in `site/README.md`).
6. **Villain signatures** (plan in `docs/monetization-plan.md`). Each villain now has its own talent path and monster (0.24). Still to come are the map rules: the Lich's hidden Phylactery, the Dragon's hoard, the Demon's rifts, the Archmage's mana, the Vampire's thralls in Millbrook and the Death Knight's Legion.
7. **Steam.** A store page needs a capsule picture set (the emblem and wordmark are a start), a trailer, screenshots, the AI-content disclosure and the $100 Steam Direct fee. The game would be wrapped as a desktop app (for example Electron or Tauri).

### Feel
- Battles: damage and crit numbers, death and hit reactions, a little camera shake on big blows, spell effects.
- Big moments get a moment: a lair finished, a research done, an item found, a level-up, the march on the tower. Small banners and sound, not only toasts.
- A morning summary after each night: built, summoned, researched, raised, found.
- A campaign-end screen: the story of the campaign, a thrill graph, best fights, who fell.
- The villain talks too: a voice and a talking portrait for each villain's taunts. And banter between two heroes.

### Real-time strategy comforts
- Build queues for lairs, and a rally point for new minions.
- Box select and control groups.
- Keys for the tower tabs; reordering the research queue.
- Nudges when minions or scholars sit idle; pings on the minimap.
- A smarter scout that suggests good lair spots along the heroes' route.

### Balance and content
- Millbrook's gold piles up once every building is up (around week 11 for the scripted DM): something worth spending it on late, such as a fourth level for some buildings, a hall of heroes or hiring a hireling.
- The tower's lumber piles up in some test games while gold stays tight: more lumber-hungry tower upgrades, or a trade between purses.
- Hero wins are high now (88% for the scripted DM): if real players find it too easy, the dark powers or the finale guards can bite harder, since speed is the score.
- Map options at setup (size, the classic map).
- More classes (Paladin, Ranger); veteran war parties; sending the villain out once a week; hauling and roads; bands that lift the fog; rooms to dig in the Dark Tower.
- A grander look for the Vampire Lord than the plain vampire.

### Under the hood
- Load time: the page is about 1 MB plus 3.5 MB of art, and the 3D map takes several seconds to appear on a slow machine. Load art in the background, show the map sooner.
- A phone and tablet pass: map gestures, the research tree (it scrolls sideways), button sizes.
- Accessibility: keyboard focus through the tower and battle screens, contrast of greyed-out research, the reduced-motion setting everywhere.
- Tidy up leftovers from earlier versions (the old citadel and tech code, an unused stylesheet) and move the balance sims into the project, so every change gets the same 64-campaign check.
- Playtests with real people, and a feedback inbox page to read their reports.

## Decisions made
1. The game continues until the party wins or all die.
2. Four level 18 heroes with some magic items make a fair fight for the level 20 villain.
3. The final assault is a showdown at the citadel: the gate, then the throne room.
4. A dead hero is replaced at the same level with no items.
5. Alpha testers play on your own website with optional accounts (Supabase), not the Claude link.
6. The roster is 5 races × 4 classes.
7. Treasure, places, events and traps appear on their own. New low-level bands wander in each week. (In 0.8 the DM no longer places them.)
8. The art direction is a Warcraft 3–style painted fantasy look rather than flat low-poly.
9. The DM's game is base building: raise monsters and send one balanced attack a day. Quests, placing things, moving stacks, steering the villain and the railroading meter are cut, and battles play out on their own with a button to take command.
10. Combat gives every unit a Move, an Attack and a Bonus action each turn, and monster stacks fight as small groups (about three each).
11. The DM gathers gold, lumber and ore with villain-specific minions who work sites each day; lairs are built on the map by minions and war parties march from lairs in reach; heroes can raid sites and lairs.
12. The world is 3D and the characters are 2D painted sprites (alpha 0.11), with AI-made art dropped in as it is ready. The look is dark gothic painterly, original rather than copied from any one game.
14. Towns open on their view (0.20): pixel-art buildings on plots in a small 3D scene, Heroes 3 style; the main building grows every few levels; the heroes and the villain appear when they're home.
17. The villain earns talent points instead of buying research (0.24): from the heroes' levels, Infamy and the Library, spent in three shared trees and one villain path, with one free reset a week. Each villain has its own monster.
16. Free to play (0.22): the Lich and the Dragon are free; the other four villains are $2.99 CAD each or $7.99 together, sold through Stripe, with Alex as the seller. Google sign-in, with email as a backup. Future content comes as bundles (for example a Paladin hero pack).
15. The game is called Overmaster (0.21), developed by Alex Larente. The artifact page keeps its old file name so its link doesn't change, and saves keep their old storage keys.
13. The DM runs both sides (0.19): the Dark Tower and Millbrook, each a town with its own purse and buildings. Lore is cut. The goal is to power the heroes up until they destroy the villain; there's no clock, and the score rewards speed. The mood is a score, not a timer. Quests return as Millbrook's bounty board (decision 9 had cut them).
