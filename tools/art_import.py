#!/usr/bin/env python3
"""Bring painted art (AI-generated or hand-made) into the game.

    python3 tools/art_import.py INPUT_FOLDER [--art art]

Name each file after the character it shows (see docs/art-guide.md for the full list):
    goblin.png              -> the full-body sprite for goblins (unit-goblin)
    goblin.portrait.png     -> the round portrait for goblins
    hero-brakka.png  or  brakka.png     -> Brakka Stonejaw
    m-thrall.png  or  thrall.png        -> the lich's bone thralls
    villain-lich.png  or  king.png      -> the Lich on the map and in battle
PNG, JPG or WebP. A transparent background is best; a plain flat background (white, grey, green...)
is cut away automatically. Sprites are trimmed and shrunk to 384 px tall, portraits to 256 x 256, both
saved as WebP, and art/manifest.json is updated. Then run build.sh: the game picks them up on its own.
Requires Pillow, numpy and scipy.
"""
import json, os, sys, argparse
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

ROSTER = ['brakka', 'thrain', 'grukka', 'sylvaine', 'bramble', 'vex', 'pip', 'sable', 'korra', 'nilsa',
          'ione', 'durgan', 'wren', 'aelith', 'ushka', 'orrin', 'maelis', 'tobias', 'esk', 'zarga']
MONSTERS = ['goblin', 'wolf', 'bandit', 'skeleton', 'orc', 'ogre', 'wraith', 'troll', 'giant', 'dragon', 'vampire', 'hydra', 'demon', 'knight']
# 0.24: each villain's own monster
MONSTERS += ['colossus', 'drake', 'hellhound', 'irongolem', 'werewolf', 'rider']
MINIONS = ['thrall', 'kobold', 'imp', 'golem', 'ghoul', 'digger']
VILLAINS = {'lich': 'king', 'dragon': 'wyrm', 'demon': 'archfiend', 'archmage': 'archmage', 'vampire': 'vlord', 'deathknight': 'dknight'}
VILLAIN_ICONS = set(VILLAINS.values())


def key_for(name):
    """file name (without extension) -> the game's key, or None"""
    n = name.lower().replace(' ', '-').replace('_', '-')
    if n.startswith('unit-'):
        return n
    if n.startswith('hero-') and n[5:] in ROSTER:
        return 'unit-' + n
    if n in ROSTER:
        return 'unit-hero-' + n
    if n.startswith('villain-') and n[8:] in VILLAINS:
        return 'unit-' + VILLAINS[n[8:]]
    if n in VILLAIN_ICONS:
        return 'unit-' + n
    if n.startswith('m-') and n[2:] in MINIONS:
        return 'unit-' + n
    if n in MINIONS:
        return 'unit-m-' + n
    if n in MONSTERS:
        return 'unit-' + n
    return None


def cut_background(im, tol=38):
    """Give an image a transparent background. Keeps real transparency; otherwise removes the flat colour
    that touches the edges (flood fill from the border), with a soft one-pixel edge."""
    im = im.convert('RGBA')
    a = np.asarray(im).astype(np.int16)
    alpha = a[..., 3]
    border = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
    if (border < 200).mean() > 0.5:
        return im  # already cut out
    rgb = a[..., :3]
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(edge, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    cand = dist < tol
    lab, n = ndimage.label(cand)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge_labels))
    # soften: pixels next to the background that are close to its colour become partly transparent
    near = ndimage.binary_dilation(bgmask) & ~bgmask
    out = a.copy()
    out[..., 3] = np.where(bgmask, 0, out[..., 3])
    soft = np.clip((dist - tol * 0.6) / (tol * 0.9), 0, 1)
    out[..., 3] = np.where(near, (out[..., 3] * soft).astype(np.int16), out[..., 3])
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def trim(im):
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bbox) if bbox else im


def make_sprite(path, max_h=384):
    im = Image.open(path)
    if max(im.size) > 1100:
        im.thumbnail((1100, 1100), Image.LANCZOS)
    im = trim(cut_background(im))
    if im.height > max_h:
        im = im.resize((max(1, round(im.width * max_h / im.height)), max_h), Image.LANCZOS)
    return im


def make_portrait(path, size=256):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    s = min(w, h)
    # square crop, centred, nudged up so faces stay in frame
    left = (w - s) // 2
    top = max(0, min(h - s, int((h - s) * 0.25)))
    return im.crop((left, top, left + s, top + s)).resize((size, size), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input')
    ap.add_argument('--art', default=os.path.join(ROOT, 'art'), help='the game\'s art folder (default: art/)')
    args = ap.parse_args()
    os.makedirs(os.path.join(args.art, 'sprites'), exist_ok=True)
    os.makedirs(os.path.join(args.art, 'portraits'), exist_ok=True)
    mpath = os.path.join(args.art, 'manifest.json')
    man = {'art': {}}
    if os.path.exists(mpath):
        with open(mpath) as f:
            man = json.load(f)
        man.setdefault('art', {})
    done, skipped = [], []
    for fn in sorted(os.listdir(args.input)):
        base, ext = os.path.splitext(fn)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        portrait = base.lower().endswith('.portrait') or base.lower().endswith('-portrait')
        name = base[:-9] if portrait else base
        key = key_for(name)
        if not key:
            skipped.append(fn)
            continue
        src = os.path.join(args.input, fn)
        if portrait:
            out = make_portrait(src)
            rel = 'portraits/%s.webp' % key
            out.save(os.path.join(args.art, rel), 'WEBP', quality=86, method=6)
            man['art'].setdefault(key, {})['portrait'] = rel
        else:
            out = make_sprite(src)
            rel = 'sprites/%s.webp' % key
            out.save(os.path.join(args.art, rel), 'WEBP', quality=88, method=6)
            man['art'].setdefault(key, {})['sprite'] = rel
        done.append('%s -> %s (%dx%d, %d KB)' % (fn, rel, out.width, out.height, os.path.getsize(os.path.join(args.art, rel)) // 1024))
    with open(mpath, 'w') as f:
        json.dump(man, f, indent=1, sort_keys=True)
    for d in done:
        print(d)
    if skipped:
        print('Skipped (name not recognised):', ', '.join(skipped))
    print('%d imported. Manifest: %s' % (len(done), mpath))


if __name__ == '__main__':
    main()
