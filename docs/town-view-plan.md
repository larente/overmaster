# Town views: Millbrook and the Dark Tower (plan, October 2026; built in alpha 0.20)

Heroes 3 opened a town onto a painted view of it, and every building you raised appeared in its spot. The plan is to give Overmaster the same thing for both of its towns: Millbrook for the heroes, and the Dark Tower for the villain.

## What the player gets
- **Opening a town lands on its view.** The Millbrook and Dark Tower screens get a new first tab, View, which shows the town filling the screen. The tabs we have now stay one click away: Buildings and Quest board for Millbrook; Tower, Research, Lairs and Villain for the tower. They're quicker for scanning, and they're the fallback on small phones.
- **Each building has its own spot.** A building you haven't raised isn't there, as in Heroes 3. Hovering an empty spot shows a faint outline and "Build the Mage Guild here, 35 gold, 10 lumber, 15 ore."
- **Click a building** to open a small card over the view: what it does now, its next level, the price and a Build button. The building gets a soft glow and its name while the pointer is on it.
- **Construction you can watch.** While a building goes up, its spot shows scaffolding, and the building rises out of it with dust and hammer sparks as the days pass. This is the same effect lairs already use on the map. When it's done there's a puff, a chime and a toast. On the next visit, the camera glides to whatever was finished overnight.
- **Levels show.** Market I is two stalls; Market II adds stalls and bunting; Market III is a covered market hall. The Mage Guild grows a storey per level, and so on.
- **The towns are alive:**
  - In Millbrook: chimney smoke, flags in the wind, birds, water, villagers walking between buildings, and the heroes in the square when they're in town.
  - At the Dark Tower: minions trudging about (one for each you own, up to a dozen), the summoning circle glowing while something is summoned, the library windows lit while research is under way, and the villain on the balcony.
  - Both: it's dusk while the night plays out on the map.

## Millbrook's layout
This takes its composition from the reference picture: a valley village around a pond, a road coming in from the bottom, a hill and mountains behind. The Millbrook map sprite we already have is the town hall in the middle, there from the start.

| Building | Where | Level by level |
|---|---|---|
| Market | the square, front left | 2 stalls · more stalls and bunting · covered market hall |
| Tavern | big timber hall, front right by the pond | small inn · two storeys, lit windows and a sign |
| Blacksmith | beside the square, left | open forge · stone forge · forge with a weapon rack and chimney smoke |
| Temple | on the hill, back left | white shrine · domed temple with a bell |
| Mage Guild | slim tower, centre back | one storey per level, with a glowing crystal at the top |
| Training Yard | fenced yard by the road | dummies and a target · a bigger yard with a sparring ring |
| Sawmill | by the stream, back right | saw shed · water wheel · bigger mill |
| Ironworks | against the cliffs | furnace · furnace with a chimney · two furnaces glowing |

## The Dark Tower's layout
A crag above a dark valley, with the villain's own tower (the six we already have) in the middle. The shared scene takes on each villain's colour through the fog and light: green for the Lich, lava orange for the Dragon, red for the Demon Prince, blue for the Archmage, crimson for the Vampire Lord, grey for the Death Knight.

| Structure | Shows up when | Levels |
|---|---|---|
| The villain's tower | always | one picture per villain (we have them) |
| Summoning circle | always | glows while summoning; it's bigger after Swift Summoning |
| Forbidden Library | built | a second wing at level 2 |
| Blood fountain | Dark Vigor | fuller and redder at I, II and III |
| Barracks | Call Servants | — |
| Black obelisk with a mist ring | Dread Aura | — |
| Ritual altar | Dark Ritual | — |
| Masons' yard with a crane | Master Masons | — |
| Storehouse with ore carts | Tireless Hands | — |
| Banners on the walls | each lair researched | one banner per monster kind, painted in code from the monster's token |
| Treasury | always | the gold pile grows with the tower's gold |

## How to build it
Two ways to do it, with the 3D one recommended:

| | **A. A small 3D scene** (recommended) | **B. A flat 2D picture** (Heroes 3's way) |
|---|---|---|
| How | Reuse the map's 3D engine for a little diorama: ground, trees, water, sky, light, fog. Each building is a PixelLab picture standing on its spot, like the lairs on the map. | One painted backdrop with an empty spot for each building, and the buildings laid over it as cut-out pictures. |
| Looks | Matches the map. Trees sway and water ripples, and dusk is free. The camera can drift slowly. | Closest to Heroes 3, but static unless we animate pieces by hand. |
| Art | About 20 building pictures for Millbrook and 15 for the tower, all with tools we already run. | The same pictures plus a backdrop per town. PixelLab tops out at about 530×300 pixels for one image (on its higher plans), so the backdrop has to be scaled up, which puts it at a different pixel size from the buildings. |
| Changes | Moving or adding a building is a number in the code. | A new layout means a new backdrop. |
| Screens | Fits any shape and size. | Fixed 16:9, letterboxed. |
| Work | More engine work up front: the map renderer has to build a second scene. | Simpler code; the art is the hard part. |

**Recommendation: A.** It matches the map players already know, it gets lights, water and the rising-construction effect for free, and it stays cheap to change while the layout is still being found. If it doesn't feel enough like Heroes 3, B can still be done later with the same building pictures.

Under the hood, for A:
- A scene description per town (in code, then perhaps in `art/manifest.json`):
  - the ground shape, the water and the tree clusters;
  - every spot's position, size and which way it faces;
  - which picture to show at each level, where the scaffolding sits, and the camera.
- world3d.js learns to build and switch to a second scene. It pauses the map's scene while a town view is open and keeps both in memory, so switching is instant.
- Picking: a ray from the pointer to each building's picture, with a check against the picture's transparent pixels so you can click through gaps.
- The view reads the game state each frame, the same way the map does:
  - Millbrook: building levels and anything under construction, the party (in town or not), and day or night;
  - the tower: summoning, research, dark powers, gold and minion count.
  No new rules are needed.
- Phones: the same view with a closer camera and tap-to-select; the list tabs remain.

## Art and sound to make
- **PixelLab map objects** in the same high three-quarter view as the map buildings:
  - Millbrook: the 8 buildings at every level, 20 pictures in all;
  - the tower: summoning circle (2), library wing, blood fountain (3), barracks, obelisk, altar, masons' yard, storehouse and treasury (3 sizes), 14 pictures in all.
  - Small extras: bunting, villagers (4 walkers) and a cart.
  The `t-*` building prompts are already in `pixellab_gen.py`; they'd get level variants (`t-market-2` and so on).
- **Banners** are painted in code from each monster's token, so they need no new art.
- **Sound:** a town theme and village ambience (`elevenlabs_gen.py music-town amb-town`, already set up), plus a tower-grounds ambience with wind on the crag and distant chanting. The construction sounds already exist.

## Phases
1. **Millbrook view with stand-ins.** The scene, the spots, hover and click, building and the rise effect, using today's icons and the existing Millbrook sprite. This is enough to judge the layout and the feel.
2. **Millbrook art and life.** The building pictures at every level, smoke, flags, villagers, the party in the square, and dusk.
3. **The Dark Tower view.** The crag scene, the villain's tower, the structures, banners and treasury, the minions and the villain, and the villain's colours.
4. **Polish.** Camera glides to new buildings, sounds, a phone pass, and the town theme.

## Decisions made (25 October 2026)
1. Keep the pixel-art style we've been using: pixel-art buildings in the map's 3D style (option A).
2. Opening a town goes straight to the view.
3. The main building grows every few levels: Millbrook's hall and the villain's tower each have five stages. Other buildings get a picture per level, with stand-ins scaled up until then.
4. When the heroes are in town, or the villain is at the tower, they appear in the view, and so do the tower's idle minions.
