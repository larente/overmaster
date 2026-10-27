# Overmaster

*The heroes are coming. Be ready.*

A turn-based browser strategy game by **Alex Larente**. You are the villain: rise from level 1 in the Dark Tower, set your minions to dig and build, and raise lairs that send waves of monsters down the roads to burn the heroes' town of Millbrook. The game runs Millbrook and its four heroes, who grow stronger every day and will one day march on your tower. Raze the town or wipe out its heroes before they get to you.

The earlier version, where you ran both the tower and the town, is kept on the `classic` branch.

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
| `ui.js`, `front.js`, `store.js`, `shop.js` | The game screens, the title and setup screens, saves and accounts, and the shop's unlocks |
| `world3d.js`, `models.js`, `art.js`, `dice.js`, `sound.js` | 3D map, battlefield and town views; models; icons; dice; sound |
| `shell.html`, `*.css` | The page's markup and styles |
| `art/` | Pixel art, portraits, voices, music and sound, listed in `art/manifest.json` |
| `site/` | Website extras: config, favicon, hosting headers, Supabase schema, deploy guide |
| `supabase/functions/` | The shop's server functions: `checkout` (opens Stripe) and `stripe-webhook` (unlocks after payment). Tested by `node tools/test_store_functions.mjs` |
| `tools/` | Art and audio scripts (PixelLab, ElevenLabs). They read their keys from files outside the repository |
| `docs/` | Roadmap, design notes, art guide and plans |
| `tools/test_*.mjs` | Shop tests: `node tools/test_store_functions.mjs` (server functions) and `node tools/test_codes_sql.mjs` (codes, on Postgres in WebAssembly; needs `npm i @electric-sql/pglite`) |
| `fuzz*.js`, `sim*.js` | Balance simulations and fuzz tests (`node fuzz10.js`) |
