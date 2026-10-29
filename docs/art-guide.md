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

**Later:** PixelLab can animate these same characters (walk, attack, and so on) per direction. The game doesn't play animations yet.

## The look

Dark gothic fantasy, hand-painted: muted earthy colours, deep shadows, warm rim light, gritty brushwork, like the isometric action-RPGs of the late 1990s. Aim for the mood, but keep every character your own. Don't put another game's name in a prompt; many tools ignore or block it, and the art is meant to be original anyway.

## Sprite rules

These matter, because the game cuts the character out and stands it on the map:

1. **One character, full body**, head to feet, nothing cropped.
2. **Three-quarter view, facing the right side of the picture**, seen from slightly above. The game mirrors the sprite when the character turns left.
3. **Plain flat background**: transparent, or one solid colour that is not in the character. Grey works for most. Avoid green behind goblins, orcs and trolls, and red behind demons; use magenta or grey for those.
4. **No ground, no cast shadow, no base, no frame, no text.** The game adds its own shadow.
5. **Neutral standing or ready pose**, weapons held close. Wide poses look tiny once shrunk.
6. **Soft light from above and in front**, the same for every character.
7. **At least 1024 px tall.** Size in the picture doesn't matter: the game sets how big a goblin or a giant stands on the map.

## Portrait rules

Head and shoulders, three-quarter view, looking at the viewer, face in the upper middle of a square picture. A dark moody background is fine here: the portrait is cropped into a circle.

## Tools and workflow

Any image generator works. The ones that suit this job best:

- **Scenario**: made for game assets; you can train a style model on a few images you like so everything matches.
- **Midjourney**: strongest painterly look; lock the style with a style reference (`--sref`) to one image you like.
- **Leonardo**: has style references and a transparent-background option.
- **ChatGPT image generation**: can output a transparent PNG directly if you ask.

Workflow:

1. **Lock the style first.** Make 3 or 4 test characters (a goblin, Brakka, the Lich), choose the best, and use it as the style reference for everything after.
2. **Make each sprite and its portrait in the same session**, so the face matches.
3. **Check the facing** (rule 2). Flip the image in any editor if it faces left.
4. Keep the originals. The importer makes the small game copies.
5. If you plan to sell the game, check each tool's terms for commercial use.

Later, the same images can be turned into true 3D models with an image-to-3D tool such as Meshy or Tripo, if you want 3D characters after all.

## Prompts

### Master style (paste at the start of every sprite prompt)

> dark gothic fantasy character art, hand-painted digital painting, muted earthy palette, deep shadows, warm rim light, gritty textured brushwork, full body from head to feet, three-quarter view facing right, seen slightly from above, standing ready pose, single character, centered, plain flat grey background, no ground, no shadow, no text

### Negative prompt (or "avoid": where the tool has one)

> scenery, ground, floor, cast shadow, base, multiple characters, cropped feet, cropped head, text, watermark, logo, frame, border, photo, 3d render, anime, chibi, cartoon outline, blurry

### Portrait version

Swap the master style for this, and use the same character description:

> dark gothic fantasy portrait, hand-painted digital painting, head and shoulders, three-quarter view, looking at the viewer, dramatic warm side light, dark vignette background, square

Each prompt below is the character part. Add it after the master style. Where the game doesn't say whether a hero is a man or a woman, a choice has been made below; change anything you like.

### Heroes

Save as `<name>.png` and `<name>.portrait.png`, for example `brakka.png`.

| File name | Hero | Character prompt |
|---|---|---|
| `brakka` | Brakka Stonejaw, human barbarian | a burly northern raider, wild copper-red hair and braided red beard, fur cloak over brown leather with bone-white trim, huge two-handed axe, cocky grin |
| `thrain` | Thrain Emberbeard, dwarf barbarian | a stocky dwarf berserker, dark auburn hair, long fiery orange braided beard, grey-brown leathers with brass fittings, an old heirloom greataxe, stern eyes |
| `grukka` | Grukka Two-Teeth, half-orc barbarian | a scarred half-orc pit fighter, grey-green skin, long black hair, two big lower tusks, rust-red fighting harness with chains, heavy spiked maul |
| `sylvaine` | Sylvaine Thornwild, elf barbarian | a wild elf woman warrior, long pale golden hair, moss-green hide armour with leaf trim, tribal war paint, a long spear |
| `bramble` | Bramble Hardfoot, halfling barbarian | a small furious halfling man, messy brown hair, rust-orange tunic with tan trim, oversized hand axe, fierce scowl |
| `vex` | Vex Nightbloom, elf rogue | a slender elf woman cat burglar, long black hair, dark green fitted leathers with olive trim, twin daggers, sly smile |
| `pip` | Pip Thistledown, halfling rogue | a cheerful halfling man thief, curly ginger hair, olive-green jerkin with mustard trim, ring of lockpicks on his belt, short sword |
| `sable` | Sable Marrow, human rogue | a sharp-eyed woman fence turned adventurer, brown skin, long black hair, charcoal and plum long coat with lavender trim, rings, a jewelled dagger |
| `korra` | Korra Blackgum, half-orc rogue | a flamboyant half-orc woman thief, green skin, dark brown hair, dark red-brown leathers with rust trim, a showy cape, curved knife |
| `nilsa` | Nilsa Copperlock, dwarf rogue | a serious dwarf woman trapsmith, braided copper hair, ochre work leathers with amber trim, tool belt, small crossbow |
| `ione` | Sister Ione, human cleric | a gentle woman temple healer, honey-blonde hair, white robes with gold trim, holy symbol, light mace, kind face |
| `durgan` | Brother Durgan Ironpsalm, dwarf cleric | a loud dwarf war priest, grey hair, big silver-white beard, cream robes over chainmail with gold trim, warhammer and hymnbook, mid-song |
| `wren` | Mother Wren Applebough, halfling cleric | an older halfling woman priestess, grey-blonde bun, beige robes with bronze trim, a locked donation box and a wooden staff, shrewd smile |
| `aelith` | Aelith Dawnsong, elf cleric | a radiant elf woman sun priestess, long pale gold hair, ivory robes with bright gold sun motifs, sun-disc staff, proud pose |
| `ushka` | Ushka the Mender, half-orc cleric | a calm half-orc woman monk-healer, grey-green skin, black hair in a topknot, simple cream robes with bronze trim, prayer beads, heavy quarterstaff |
| `orrin` | Orrin Quill, human wizard | an absent-minded old scholar wizard, white hair and long white beard, deep blue robes with yellow trim, quill behind his ear, armful of notes and a staff |
| `maelis` | Maelis Vane, elf wizard | an elf woman sorceress of forbidden magic, long silver-lilac hair, deep purple robes with pale violet runes, glowing tome |
| `tobias` | Tobias Inkfoot, halfling wizard | a halfling man wizard-merchant, brown hair, teal robes with gold trim, satchel full of spellbook copies, short staff |
| `esk` | Esk Grimmbrew, dwarf wizard | a dwarf runesmith wizard, dark brown hair and beard, brick-red robes with glowing orange runes, rune hammer, proud |
| `zarga` | Zarga Bonereader, half-orc wizard | a half-orc woman seer, grey-green skin, long black hair with bone beads, brown robes with bone-white trim, a pouch of casting bones, carved staff |

### Monsters

Save as `<name>.png` and `<name>.portrait.png`.

| File name | Monster | Character prompt |
|---|---|---|
| `goblin` | Goblin | a scrawny green goblin, big ears, ragged leather, rusty short blade, crouched and sneaky (use a grey or magenta background) |
| `wolf` | Wolf | a large grey wolf, hackles up, snarling, shown side-on facing right |
| `bandit` | Bandit | a human highway bandit, hooded, scarf over the face, patched leather, crossbow or short sword |
| `skeleton` | Skeleton | an undead skeleton warrior, yellowed bones, rusted helm, cracked round shield and old sword |
| `orc` | Orc Archer | a muscular orc archer, dark green skin, crude iron armour, big recurve bow, quiver of black arrows (grey background) |
| `ogre` | Ogre | a huge fat ogre, pale tan skin, loincloth and hide, tree-trunk club |
| `wraith` | Wraith | a hooded wraith of shadow and tattered black cloth, glowing pale eyes, no legs, fading into smoke at the bottom |
| `troll` | Troll | a hunched long-armed troll, mossy grey-green skin, long claws, stringy hair (grey background) |
| `giant` | Hill Giant | a hulking hill giant in furs, crude stone club, wild beard |
| `dragon` | Young Dragon | a young red dragon on all fours, wings half spread, shown side-on facing right |
| `vampire` | Vampire | an aristocratic vampire, pale skin, slicked black hair, high-collared black and crimson coat, fangs bared |
| `hydra` | Hydra | a swamp hydra with five serpent heads, scaly dark green-bronze body, side-on facing right |
| `demon` | Pit Demon | a towering horned pit demon, red-black skin, burning cracks, bat wings, flaming whip (magenta background) |
| `knight` | Hollow Knight | an empty suit of dark plate armour walking on its own, cold blue light inside the helm, longsword and kite shield |

### The villain

Save as `villain-<type>.png` and `villain-<type>.portrait.png`.

| File name | Villain | Character prompt |
|---|---|---|
| `villain-lich` | the Lich, the Hollow King | a skeletal sorcerer-king, cracked crown, rotting royal robes in black and violet, a staff topped with a skull, green soul-fire in the eye sockets |
| `villain-dragon` | the Ancient Dragon, the Ashen Wyrm | an enormous ancient dragon in flight, ash-grey scales, glowing ember cracks, wings spread wide, side-on facing right |
| `villain-demon` | the Demon Prince | a towering demon prince wreathed in fire, great curled horns, obsidian armour, burning sigil on the chest, a flaming sword (magenta background) |
| `villain-archmage` | the Archmage, the Unbound | a regal woman archmage, flowing midnight robes covered in stars, an eye-and-star sigil, floating spellbook, hands crackling with arcane light |
| `villain-vampire` | the Vampire Lord, the Crimson Count | a tall vampire lord, pale, black hair, crimson and black regal coat, high collar, a bleeding rose brooch, cruel smile |
| `villain-deathknight` | the Death Knight, the Oathbreaker | a cursed knight in black spiked plate armour, broken-sword emblem, glowing red eyes in the helm, huge greatsword |

### Minions

Save as `<name>.png`. Portraits are optional.

| File name | Minion (villain) | Character prompt |
|---|---|---|
| `thrall` | Bone Thrall (Lich) | a small undead skeleton labourer with a pickaxe and a battered sack |
| `kobold` | Kobold (Dragon) | a small scaly reddish kobold miner with a pick and a sack of gold coins |
| `imp` | Imp (Demon Prince) | a small red winged imp, mischievous grin, little horns and tail |
| `golem` | Clay Servant (Archmage) | a squat animated clay servant, terracotta body with glowing rune lines, carrying building tools |
| `ghoul` | Thrall (Vampire Lord) | a pale hollow-eyed human servant in a worn crimson and black livery, carrying a lantern |
| `digger` | Grave Digger (Death Knight) | a hooded hunchbacked grave digger with a spade and a lantern |

## Getting the art into the game

**Easiest:** attach the images in a chat with Claude, named as above. Claude cuts them out, imports them, checks them in the game and republishes.

**Yourself**, with the importer (`art_import.py`, saved in the project next to this guide):

1. Put all the images in one folder, named as above. PNG, JPG or WebP all work.
2. Run `python3 art_import.py path/to/that/folder --art path/to/site/art`, pointing `--art` at the `art` folder of the website files. This needs Python with Pillow, numpy and scipy.
3. Upload the website files again. In the game's source folder, `bash build.sh` does the copying for you.

The importer cuts away a flat background, trims the empty space, shrinks the images and writes them to `art/sprites/` and `art/portraits/` as WebP. It also updates `art/manifest.json`, which is the list the game reads at start. A file it doesn't recognise is listed as skipped.

Every name also works in its full form: `hero-brakka`, `m-thrall`, or the game's own key such as `unit-goblin`.

### Before importing, check

- The character faces right.
- Feet and head are both in the picture.
- The background is transparent or one flat colour that touches every edge.
- There's no ground shadow.


## Sound and music (ElevenLabs, alpha 0.17)
`tools/elevenlabs_gen.py` makes every sound through ElevenLabs' API; copy it next to `elevenlabs-key.txt` (your API key, never pasted anywhere else) and run it in Terminal:
- `python3 elevenlabs_gen.py test` makes four sounds to hear the style; `sfx`, `music` or `all` makes the lot; names make just those; `--redo` makes them again (the old file goes to `out-audio/previous/`).
- Sound effects use the text-to-sound-effects endpoint (`eleven_text_to_sound_v2`, 40 credits a second); ambience asks for seamless loops. Music uses Eleven Music (`music_v2_5`, instrumental only). The whole set cost about 5,500 credits.
- The descriptions are in the `SFX` and `MUSIC` lists at the top of the script. Variants are numbered (`hit-1`, `hit-2`...) and the game picks one at random.
- For Millbrook (0.19): `python3 elevenlabs_gen.py music-town amb-town` makes a warm village theme and a market-square ambience loop for the town screen (about 1,000 credits). Until they're in, the town screen plays the map music.
- `python3 tools/audio_import.py PATH/TO/out-audio` evens out the loudness with ffmpeg, trims leading silence from effects, keeps ambience loops exact (as WAV) and adds everything to `art/manifest.json`.

Licence: sound effects from a paid ElevenLabs plan can be used commercially. Eleven Music on self-serve plans excludes "Studio Games" (a game that is both monetised and on more than one platform); a free browser game is fine, but selling it on Steam as well as the web would need ElevenLabs' enterprise music licence or new music.


## Hero voices and talking portraits (alpha 0.18)
- `python3 elevenlabs_gen.py heroes` designs a voice for each hero from the `voice` description in `hero_lines.json` (ElevenLabs Voice Design, `eleven_ttv_v3`; the first of three takes is kept and saved to your account, one custom voice slot each; ids in `out-voice/voices.json`), then speaks every line with `eleven_v3`, keeping the time each letter is spoken (`<line>.json`). Voices cost about 3,400 credits and the 280 lines about 6,800.
- `python3 pixellab_gen.py talk` turns each hero's portrait into 7 mouth shapes (rest, closed, small, medium and wide open, round, teeth) with PixelLab's vocal animation (6 generations a hero), then asks for the free lip-sync plan of every line.
- `python3 tools/voice_import.py --voice out-voice --talk out` evens out the voices and writes `art/voice/<hero>.mp3` and `art/talk/<hero>.webp`. Since 0.20.1 each hero's 14 lines go in one mono 64 kbps MP3, with 0.4 seconds of silence between lines, and each hero's 7 mouth shapes go in one strip. That keeps the published game under the artifact's limit of 511 files. The `voice` and `talk` lists in `art/manifest.json` say where each line starts (`at`) and how long it runs (`dur`), along with its lip-sync plan. The script replaces the old one-file-per-line layout.
- To change a line: edit it in `hero_lines.json`, then `elevenlabs_gen.py heroes <hero>` (it re-speaks only the lines whose text changed; `--redo` re-speaks them all) and `pixellab_gen.py talk <hero>` for the new plan (free).

## The intro cinematic (alpha 0.34)
The storyteller's intro (script and shot list: the "Overmaster intro cinematic" doc) is made in four steps. Everything it needs is described in `tools/intro/intro.json`: the 16 narration lines, the narrator's voice, the three music cues, 16 new sound effects, the storyteller and the 10 PixelLab scenes, the 19 shots and the five cuts.

1. **Sounds**, on the Mac: `python3 elevenlabs_gen.py intro` (with `intro.json` next to it). It designs the storyteller's voice (one voice slot), records every line three times plus one read-through of the whole script (with letter timings), composes the music as timed parts (`intro-tavern`, `intro-dark`, `intro-sting`) and makes the new effects. About 10,000 credits. `intro voice`, `intro music` or `intro sfx` makes one part; `--redo` makes it again. Everything lands in `out-intro/`.
2. **Pictures**, on the Mac: `python3 pixellab_gen.py intro`. The storyteller's close-up comes first (it sets the pixel size and shading of every scene), then the 10 scenes at 640 × 360, then his red eyes, his lean and candle animations and his talking mouth shapes in two moods (neutral and happy), with a lip-sync plan for every line. It logs what the first of each costs and stops if the balance gets near 40 generations. `intro scenes`, `intro storyteller` or scene letters (`intro A G`) do one part.
3. **Game footage**, in the workspace: `python3 tools/intro/film.py --fonts FONTS --out FOOTAGE` records shots 12, 13a–c, 14 and 16 from the real game in a headless browser. The game runs on a virtual clock (every frame moves it exactly 1/30 s however long the 3D view takes to draw), randomness is seeded, menus are hidden, and the camera flies a scripted path. `--preview` makes a small, quick version to check framing. A full set takes about two hours in the cloud workspace.
4. **The edit**: `python3 tools/intro/build_intro.py --assets DIR --out OUT` cuts `game` (the 1:30 intro), `full` (1:39 trailer), `t60`, `t30` and `vertical`, each an MP4 with a `.vtt` subtitle file. Anything not made yet is stood in for (a labelled slate for a picture, the game's own music and sounds for audio, subtitles alone for an unrecorded line), so the timing can be judged before the art exists. `--fast` makes half-size previews, `--sheet` a contact sheet of every shot, and `--install` copies the game cut into `art/intro/` (MP4 under 24 MB, a WebM copy and the subtitles) and lists it in `art/manifest.json`.

**In the game:** on a device that hasn't seen it, the opening shows "Alex Larente presents" and "Press any key"; that key press (which browsers require before sound) starts the intro, full screen with subtitles. Any key or tap a second or more later skips it, and the title screen's footer gets **Watch the intro**. Players who've asked for reduced motion get the link but no autoplay. Until `art/manifest.json` lists an intro, the opening is exactly as before.

**Licence note:** the music comes from Eleven Music, whose self-serve terms exclude "Studio Games" (monetised and on more than one platform); check the terms before the trailer or the intro go to Steam.
