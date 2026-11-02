# Overmaster: character art guide

How to make AI (or hand-painted) art for the heroes, monsters, minions and villains, and get it into the game.

## How the game uses art

The world stays 3D. Every character standing in it (heroes, monsters, minions and the villain) is a flat painted **sprite** that always faces the camera, like the "HD-2D" look. Until real art exists, each sprite is a picture rendered from the game's own 3D model, so the game already plays in this style.

Each character can have two images:

| Image | Where it shows | Size after import |
|---|---|---|
| **Sprite**: the full body | On the map and on the battlefield | 384 px tall WebP, about 10 to 40 KB |
| **Portrait**: head and shoulders | The round tokens in the party bar, the cards, the battle bar | 256 × 256 WebP, about 5 to 15 KB |

Either one is optional. A character with no art keeps its stand-in. The game starts with the stand-ins and swaps the paintings in as they arrive, so painted art never slows the first load.

Settings → **Sprite characters** switches between the sprites and the original 3D figures.

## Two routes

- **PixelLab (pixel art, 8 directions).** The route being tried first (alpha 0.12). Every character is pixel art drawn from 8 sides, so on the map and in battle you see the side it's actually facing, not one picture flipped. A script makes the whole cast through PixelLab's API. See *PixelLab* below.
- **Painted (any image generator).** One painted picture per character, mirrored when it turns left. Everything from *The look* onward is about this route.

The game takes either, and can mix them: a character with PixelLab art uses it, one with a painting uses that, and the rest keep their stand-ins.

## PixelLab: pixel art in 8 directions

**What you get.** Each character is a 128 × 128 pixel-art sprite (the first five test characters were 96) in a "low top-down" view, drawn facing south, south-east, east, north-east, north, north-west, west and south-west. The game:
- shows the frame for the way the character faces relative to the camera, so heroes walking away show their backs;
- keeps hard pixel edges when the sprite is drawn larger than it was made;
- uses each character's PixelLab portrait (below) as its round token, or, until it has one, cuts the token from the head and shoulders of its front-facing frame.

**Cost.** One character from a text description costs 3 PixelLab generations at 96 or 128 px (1 to draw it, 2 to turn it). The whole cast is 46 characters, so about 140 generations. The free trial's 40 covers a test batch only; the cast needs a paid plan.

**Speed.** About 4 minutes a character. On the trial PixelLab runs one at a time; paid plans run more at once.

**Making them** (on a Mac or PC with Python 3):
1. Put the PixelLab API token, from your PixelLab account page, in `pixellab-token.txt` next to `pixellab_gen.py`. It's read from there and never printed.
2. Run `python3 pixellab_gen.py test` for 7 characters, `all` for the whole cast, or list names (`brakka goblin villain-lich`).
3. Each character lands in `out/<name>/` with its 8 images. A character already made is skipped on the next run, and one PixelLab finished after the script stopped is collected rather than paid for twice.
4. To make one again with a new description, edit its line in `CAST` and run `python3 pixellab_gen.py --redo <name>`. The old pictures move to `out/<name>/previous/`.

The descriptions live in the `CAST` list at the top of `pixellab_gen.py`; edit a line there to change a character. Four-legged creatures (the wolf, both dragons, the hydra) use PixelLab's animal body templates so they can be animated later.

**Into the game:** send the `out` folder to Claude, or run `python3 tools/pixellab_import.py path/to/out` and then `bash build.sh`. Each character becomes one strip of 8 frames, `art/sprites/<key>.webp` (lossless), listed in `art/manifest.json` with `"dirs": 8, "pixel": true`.

**Portraits.** `python3 pixellab_gen.py portraits` asks PixelLab's *character to portrait* tool for a 128 × 128 pixel-art bust of every character made so far, drawn from its front-facing sprite, so face and outfit match. Each costs 15 generations (about 690 for the whole cast). It does one first and logs the price before the rest; `portraits brakka goblin` does just those, and `--redo` makes them again. The importer turns each `portrait.png` into `art/portraits/<key>.webp`, and the game shows it as the round token at 256 px, scaled by whole numbers so the pixels stay square.

**Map buildings, landmarks and icons.** `python3 pixellab_gen.py objects` makes 113 pixel-art pieces with PixelLab's map-object tool, drawn from a high top-down angle to match the map camera:
- the six sites, from Millbrook to the Dark Tower, plus a Dark Tower for each villain (`tower-lich`, `tower-dragon`, `tower-demon`, `tower-archmage`, `tower-vampire`, `tower-deathknight`) and the Forbidden Library that stands beside it once built;
- the 13 lair types, plus the half-built and wrecked looks;
- the raw and worked gold, lumber and ore spots;
- chests, shrines, encounters and traps;
- the town views (0.20), in three groups:
  - `objects millbrook` (26): every Millbrook building at every level (`t-market`, `t-market-2`, `t-market-3`...), the hall's five stages (`t-hall` to `t-hall-5`) and a notice board (`t-board`);
  - `objects darktower` (11): the library's new wing, the blood fountain in three sizes, barracks, obelisk, altar, masons' yard, storehouse and treasury;
  - `objects stages` (24, optional): each villain's tower at stages 2 to 5; `stages-lich` does one villain.
  Until they exist, the views borrow existing pictures;
- small icons for gold, lumber, ore, the book (now the Library's) and the hourglass.

The descriptions and sizes are in the `OBJECTS` list in the script; `objects town chest` does just those, and `--redo` makes them again. The importer turns each `out-objects/<name>/object.png` into `art/objects/obj-<name>.webp`. That one picture is used twice: standing on the 3D map in place of the 3D model, and as the icon in the sidebar, cards, price lists and the flat map.

A lair under construction needs no extra art: the game shows the bottom of the finished lair's picture, as high as the work has got, with the rest as a faint blue plan, a pixel scaffold drawn in code riding the edge, and dust and sparks while minions work. The half-built picture (`building`) is only the stand-in for a lair without its own art, and the Library's building site.

**Minion animations (alpha 0.35).** `python3 pixellab_gen.py moves` animates the six minion characters with PixelLab's character animation (`/characters/animations`, custom "v3" mode): a **walk** and a **build** for each, 8 frames in all 8 directions, from an action line per minion in the `MOVES` list in the script (the Thrall swings its pickaxe, the Clay Servant pounds its mallet, the Grave Digger digs). `moves thrall` or `moves walk` does part of it; finished ones are skipped, and `--redo` makes them again. The frames land in `out/<minion>/anim-walk/<direction>/00.png` (and `anim-build`). It logs the generations each one used and stops if the balance falls under 120.
The importer packs each into one sheet, `art/sprites/unit-m-<minion>-walk.webp` (a column per direction, in the strip's order, a row per frame), listed under `"anim"` in `art/manifest.json` with its frame count and speed. In the 3D view a minion plays its walk while it walks at night and its build while it builds a lair or sinks a mine, at the same size as its standing sprite and with its feet in the same place; without the sheets it waddles and swings a drawn tool as before. Other characters could be animated the same way later.

**Battle animations (alpha 0.38).** `python3 pixellab_gen.py acts` gives every monster, villain and the militia an **idle** loop (4 frames, about 2 generations) and an **attack** (8 frames, about 3–4), facing east only; the game mirrors them for west. The descriptions are in `ACTS` in `pixellab_gen.py`; `acts goblin wolf` or `acts idle` makes just those, and the run stops with 8 generations left (run it again after the monthly refill to finish). The importer packs each into a one-column sheet (`dirs: 1`), `art/sprites/unit-<key>-idle.webp` and `-attack.webp`. `python3 pixellab_gen.py militia` makes Millbrook's militia, who man the walls in the assault. The assault's buildings (gate, towers, ballista, arcane tower, bell, hall) reuse the Millbrook art in `art/objects/obj-t-*`.

**The Grounds (alpha 0.39).** `python3 pixellab_gen.py objects grounds` draws the buildings around the Dark Tower that no other picture covers yet: the Farm (`g-farm`, `-2`, `-3`), the Blacksmith (`g-smith`, `-2`, `-3`), the Muster Field (`g-muster`, `-2`) and the Stockade (`g-stockade`, `-2`), ten generations in all, the farm first. Import them like any map object (`pixellab_import.py out-objects`). The first run (2 November) gave good pictures for the Farm, all three Blacksmiths, the Muster Field and the bigger Stockade; the second and third Farm, the second Muster Field and the first Stockade came out broken and were thrown away (the descriptions are rewritten: `objects g-farm-2 g-farm-3 g-muster-2 g-stockade --redo` draws them again). Meanwhile the Farm and the Muster Field show their first picture at every level, a little bigger each level, and the Stockade the bigger one. Until a building has any picture of its own the Grounds borrow another: the Ogre Den for the Farm, Millbrook's ironworks for the Blacksmith, the orc war camp for the Muster Field, Millbrook's palisade for the Stockade. The Servants' Quarters, Black Obelisk, Reliquary and Storehouse use the tower's old works (`t-raise`, `t-dread`, `t-ritual`, `t-hands`). A building with its own picture at a level (`g-farm-2`) shows it from that level up.

**One scale for every figure (alpha 0.39).** In 3D each sprite used to be stretched to the height of its low-poly stand-in model, weapon and all, so a wizard whose model holds a staff over its head came out a head taller than the barbarian beside it. Now heroes are sized by the body: feet to the top of the head, ignoring thin things over it (a staff or spear tip). A human hero stands 2.25 battle units, an elf 1.05 times that, a half-orc 1.08, a dwarf 0.8, a halfling 0.69 (`HERO_BODY`, `RACE_H` in world3d.js). The monsters that looked out of step are set against them in `BODY_H` (a goblin 1.75, an orc 2.35, a skeleton 2.15, an ogre 2.95, a troll 3.05, a hill giant 3.8, the Archmage and the Count 3.05); everything else keeps its old size. A new monster that looks too big or small goes in `BODY_H` with the height it should have.
