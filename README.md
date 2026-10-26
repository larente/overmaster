# Overmaster

*Heroes need villains. You're both.*

A browser strategy game by **Alex Larente**. You run both sides at once: the villain's Dark Tower, with its minions, lairs and research, and the heroes' town of Millbrook, with its buildings and bounty board. Push four heroes until they're strong enough to tear your own tower down.

Alpha. All rights reserved.

## Build

```sh
bash build.sh
```

This makes two things from the same sources:

- `dist/site/`: the website (open `index.html` through a local server: `cd dist/site && python3 -m http.server 8000`).
- `dist/behind-the-screen.html`: the single-page version published as a Claude artifact (the file keeps its old name so the artifact's link stays the same).

## Deploy

Cloudflare builds from this repository with `bash build.sh`. As a Pages project, the build output directory is `dist/site`; as a Worker, the deploy command `npx wrangler deploy` reads `wrangler.jsonc`, which points at the same folder. Every push to `main` goes live; other branches get a preview address. Accounts and cloud saves need the two public Supabase values in `site/config.js`. The full guide is `site/README.md`.

## What's where

| | |
|---|---|
| `part_map.js`, `part_core.js`, `part_battle.js`, `part_end.js` | The rules, with no page code (joined into `game.js` by the build) |
| `ui.js`, `front.js`, `store.js` | The game screens, the title and setup screens, and saves and accounts |
| `world3d.js`, `models.js`, `art.js`, `dice.js`, `sound.js` | 3D map, battlefield and town views; models; icons; dice; sound |
| `shell.html`, `*.css` | The page's markup and styles |
| `art/` | Pixel art, portraits, voices, music and sound, listed in `art/manifest.json` |
| `site/` | Website extras: config, favicon, hosting headers, Supabase schema, deploy guide |
| `tools/` | Art and audio scripts (PixelLab, ElevenLabs). They read their keys from files outside the repository |
| `docs/` | Roadmap, design notes, art guide and plans |
| `fuzz*.js`, `sim*.js` | Balance simulations and fuzz tests (`node fuzz10.js`) |
