# Overmaster — design notes (v3, from when it was called Behind the Screen)

Single-file browser game (`behind-the-screen.html`), styled after Heroes of Might and Magic 3. You are the DM; four autonomous heroes ride a top-down map day by day for 4 weeks. Source modules (assembled at build): map + pathfinding, core (heroes, DM tools, party AI, quests, encounters, days/weeks), battle (d20 hex combat), art (SVG icons, painted terrain), dice (animated rolls), ui.

## DM tools (sidebar tabs)
- **Conjure** (place out of party sight): Monsters ×1/×2/×3; Treasure (chest 1, artifact 4); Places (shrine 3, refugees 2, omen 2); Events (stranger 2, rope bridge 2, captive 2, riddle 2, tournament 3 announced in Millbrook); Traps (pit 2, fire rune 3, snare 2).
- **Dungeons**: Goblin Warren 6, Orc War Camp 8, Bone Crypt 9, Ogre Den 12. Pools grow nightly (cap 7 days). Release stacks at half price; whatever stays in the pool defends it. Clearing a dungeon removes it (+thrill, 40% artifact).
- **Movement**: every monster stack moves once a day (creature map speed). Malgrith moves 9 tiles a day. Ending next to the party attacks. Stacks that end out of sight are lost track of.
- **Lair (Malgrith)**: ride out / ride home; muster up to 3 army stacks (normal creature prices, only at the tower); dark powers: Dark Vigor (3, ×3, +20% HP), Dread Aura (4), Raise Dead (5), Trapped Halls (2, ×3, free finale traps), Dark Ritual (5, +20% HP, +2 hit, +6 finale thrill). Beaten before week 4 he escapes for 3 days (+6 thrill, quests complete). Week 4 he's recalled to his throne. "Scout the finale" runs 16 simulated finales.
- **Quests**: up to 3; target any stack, dungeon, Malgrith, unvisited landmark or placed object; reward slider 1–12 Lore = 50 + 45×reward XP per hero; quest makes target known and pulls the party (value + reward×1.2) and lowers their danger threshold by reward×0.035. Expires end of week (−2 thrill).
- **Rumor**: 1 Lore reveals an unseen thing.

## Battles
- Deployment phase: move stacks within the right 5 columns; hide spike traps (free: 2 at dungeons, 1+Trapped Halls at the finale; then 1 Lore, max 3 extra). Traps: 2d6 + 2×level, stop the hero.
- Terrain: boulders/trees block movement and sight; brush blocks sight and gives +2 AC vs ranged; bogs cost 2 movement.
- d20 rules: one attack roll per stack vs AC; advantage from flanking (target next to 2+ enemies), reckless; disadvantage vs defenders, long range (>7 hexes), Fearsome Roar / Dread Aura in round 1. Nat 20 doubles dice; assassin crits 18–20. Stacks roll damage for up to 10 creatures and scale. Saves vs spells/breath/Soul Rend; death saves.
- DM spellbook unchanged (pull, lucky, reinforce, retreat, deus). Holding back an available attack: +4 railroading (max 3 per battle).

## Events
DM picks the hidden truth/difficulty; heroes pick who rolls by skill (Might/Finesse/Charm/Lore); one failed roll per event can be fudged (2 Lore, +10 railroading). Stranger (informant/smuggler/agent), Rope Bridge (3 checks, 2 needed), Captive (truth: honest/ambush/secrets; party votes spare/kill/question), Riddle (DC 10/14/18), Tournament (best of 3 opposed rolls vs +3/+6/+9).

## Balance (headless sims)
- Party judgment calibrated against simulated d20 fights: avoid < 1.2 power ratio, worthy < 2.2, beatable < 3.8, trivial above (scatters).
- Scripted DM using all systems: ~90% wins, ~7% wipes, ~3% quits, ~1.4 deaths/game. Basic DM (only conjured monsters): ~78% wins, ~20% quits.
- Weekly engagement drain: 18 + 8×week. Lore income 3/day (weeks 1–2), 5/day (weeks 3–4), plus half of positive thrill.
- Finale at level 5+ is tense/harrowing unpowered; heavy dark powers + army can make it deadly (scout before investing).

## Ideas next
Hero personalities beyond one drive, more event types (merchant haggle, haunted inn mystery), town screen, sound, multiple save slots, difficulty settings.
