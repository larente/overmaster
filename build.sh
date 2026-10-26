#!/bin/sh
# Builds two things from the same sources:
#   dist/behind-the-screen.html  the Claude artifact page (file name kept so the artifact's address stays the same) (no accounts; three.js from cdnjs)
#   dist/site/                   the website: index.html + config.js + vendor libraries + Supabase setup + guide
cd "$(dirname "$0")"
set -e
# the UI art is generated once by tools/make_ui.py (needs Python 3 with numpy and Pillow)
[ -f ui-assets.css ] || python3 tools/make_ui.py
cat part_map.js part_core.js part_battle.js part_end.js > game.js
mkdir -p dist/site/vendor dist/site/supabase
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Cinzel:wght@500;700;800&display=swap">'

game_scripts() {
  echo '<script>'; cat game.js; echo '</script>'
  echo '<script>'; cat art.js; echo '</script>'
  echo '<script>'; cat dice.js; echo '</script>'
  echo "$1"
  echo '<script>'; cat models.js; echo '</script>'
  echo '<script>'; cat world3d.js; echo '</script>'
  echo '<script>'; cat sound.js; echo '</script>'
  echo '<script>window.HERO_LINES = '; cat tools/hero_lines.json; echo ';</script>'
  echo '<script>'; cat ui.js; echo '</script>'
  echo '<script>'; cat store.js; echo '</script>'
  echo '<script>'; cat front.js; echo '</script>'
}

# 1. the Claude artifact page (the publish skeleton supplies doctype, head and body)
{
  echo '<title>Overmaster</title>'
  echo '<meta name="claude:viewport-fit-sides" content="cover">'
  echo "$FONTS"
  echo "<style>"; cat style.css front.css screens.css ui-assets.css skin.css loop.css; echo "</style>"
  cat shell.html
  game_scripts '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
} > dist/behind-the-screen.html
cp dist/behind-the-screen.html behind-the-screen.html

# 2. the website
{
  echo '<!doctype html>'
  echo '<html lang="en"><head><meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  echo '<title>Overmaster — heroes need villains. You'"'"'re both.</title>'
  echo '<meta name="description" content="Overmaster, by Alex Larente: run the villain'"'"'s Dark Tower and the heroes'"'"' town of Millbrook at once. Breed monsters, raise a blacksmith, and push four heroes until they are strong enough to tear your tower down.">'
  echo '<meta property="og:title" content="Overmaster"><meta property="og:description" content="Heroes need villains. You'"'"'re both. A two-sided town-building game by Alex Larente."><meta property="og:type" content="website">'
  echo '<meta name="theme-color" content="#08111f"><link rel="icon" href="favicon.svg" type="image/svg+xml">'
  echo "$FONTS"
  echo "<style>"; cat style.css front.css screens.css ui-assets.css skin.css loop.css; echo "</style>"
  echo '</head><body>'
  cat shell.html
  echo '<script src="config.js"></script>'
  echo '<script src="vendor/supabase.js"></script>'
  game_scripts '<script src="vendor/three.min.js"></script>'
  echo '</body></html>'
} > dist/site/index.html
cp vendor/three.min.js vendor/supabase.js dist/site/vendor/
# painted art (sprites and portraits) listed in art/manifest.json
rm -rf dist/site/art && mkdir -p dist/site/art && cp -r art/. dist/site/art/
cp site/config.js site/favicon.svg site/README.md site/netlify.toml site/_headers dist/site/
cp site/schema.sql dist/site/supabase/schema.sql
echo "built: dist/behind-the-screen.html ($(wc -c < dist/behind-the-screen.html) bytes), dist/site ($(du -sh dist/site | cut -f1))"
