#!/usr/bin/env python3
"""Bring PixelLab characters (8 directions each) into the game.

    python3 tools/pixellab_import.py PATH/TO/bts-art/out [--art art]

Each folder in out/ is one character, named like the art guide (brakka, goblin, villain-lich, thrall...),
holding its 8 direction images as pixellab_gen.py saved them. They're joined into one strip,
south, south-east, east, north-east, north, north-west, west, south-west, saved as lossless WebP,
art/sprites/<key>.webp, and art/manifest.json gets {"sprite": ..., "dirs": 8, "pixel": true}.
A portrait.png in the folder (from `pixellab_gen.py portraits`) becomes art/portraits/<key>.webp, the round token.
0.35: anim-<name>/<direction>/NN.png folders (from `pixellab_gen.py moves`) become animation sheets,
art/sprites/<key>-<name>.webp (a column per direction in the order above, a row per frame), listed under
"anim" in the manifest: {"anim": {"unit-m-thrall": {"walk": {"sprite": ..., "dirs": 8, "frames": 8, "fps": 10}}}}.

    python3 tools/pixellab_import.py PATH/TO/bts-art/out-objects

Map buildings, landmarks and icons (`pixellab_gen.py objects`): each <name>/object.png becomes
art/objects/obj-<name>.webp, used both as the sprite on the 3D map and as the icon everywhere else.
"""
import argparse, json, os, re, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from art_import import key_for, ROOT, cut_background  # noqa: E402

ORDER = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
# PixelLab's rotation endpoints list images in this order when they come as a plain list
LIST_ORDER = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east']
NAMES = sorted(ORDER, key=len, reverse=True)


def direction_of(name):
    n = name.lower().replace('_', '-')
    for d in NAMES:
        if re.search(r'(^|[^a-z])' + d + r'($|[^a-z-])', n):
            return d
    return None


def frames_for(folder, list_order):
    files = [f for f in sorted(os.listdir(folder)) if f.lower().endswith(('.png', '.webp'))]
    named = {}
    for f in files:
        d = direction_of(os.path.splitext(f)[0])
        if d and d not in named:
            named[d] = f
    if len(named) == 8:
        return [os.path.join(folder, named[d]) for d in ORDER]
    # images numbered 0..7 in PixelLab's list order
    numbered = {}
    for f in files:
        m = re.search(r'(?:^|\.)(\d)\.(png|webp)$', f.lower())
        if m:
            numbered[int(m.group(1))] = f
    if len(numbered) >= 8:
        by_dir = {list_order[i]: numbered[i] for i in range(8)}
        return [os.path.join(folder, by_dir[d]) for d in ORDER]
    return None


def strip(paths):
    ims = [Image.open(p).convert('RGBA') for p in paths]
    w = max(i.width for i in ims); h = max(i.height for i in ims)
    out = Image.new('RGBA', (w * len(ims), h), (0, 0, 0, 0))
    for k, im in enumerate(ims):
        # same canvas for every frame; centre horizontally, feet on the bottom row
        out.paste(im, (k * w + (w - im.width) // 2, h - im.height))
    return out


ANIM_FPS = {'walk': 10, 'build': 9}


def sheet(folder):
    """anim-<name>/<direction>/NN.png -> one image: a column per direction, a row per frame (None if a direction is missing)"""
    cols = []
    for d in ORDER:
        dd = os.path.join(folder, d)
        fs = sorted(f for f in os.listdir(dd) if f.lower().endswith('.png')) if os.path.isdir(dd) else []
        if not fs:
            return None, 0
        cols.append([Image.open(os.path.join(dd, f)).convert('RGBA') for f in fs])
    n = min(len(c) for c in cols)
    w = max(i.width for c in cols for i in c); h = max(i.height for c in cols for i in c)
    out = Image.new('RGBA', (w * len(ORDER), h * n), (0, 0, 0, 0))
    for x, c in enumerate(cols):
        for y, im in enumerate(c[:n]):
            out.paste(im, (x * w + (w - im.width) // 2, y * h + (h - im.height)))
    return out, n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input')
    ap.add_argument('--art', default=os.path.join(ROOT, 'art'))
    ap.add_argument('--list-order', default=','.join(LIST_ORDER), help='direction order of numbered images')
    ap.add_argument('--skip', default='', help='comma-separated names to leave out')
    args = ap.parse_args()
    list_order = args.list_order.split(',')
    os.makedirs(os.path.join(args.art, 'sprites'), exist_ok=True)
    mpath = os.path.join(args.art, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'art': {}}
    man.setdefault('art', {})
    done, skipped = [], []
    skip = set(filter(None, args.skip.split(',')))
    for name in sorted(os.listdir(args.input)):
        if name in skip:
            continue
        op = os.path.join(args.input, name, 'object.png')
        if os.path.exists(op):
            os.makedirs(os.path.join(args.art, 'objects'), exist_ok=True)
            im = cut_background(Image.open(op).convert('RGBA'))  # a few come back on a flat colour: cut it away
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb:
                im = im.crop((max(0, bb[0] - 1), max(0, bb[1] - 1), min(im.width, bb[2] + 1), min(im.height, bb[3] + 1)))
            key = 'obj-' + name; rel = 'objects/%s.webp' % key
            im.save(os.path.join(args.art, rel), 'WEBP', lossless=True, method=4, quality=100)
            man['art'][key] = {'sprite': rel, 'icon': rel, 'pixel': True}
            done.append('%s -> %s (%dx%d, %d KB)' % (name, rel, im.width, im.height, os.path.getsize(os.path.join(args.art, rel)) // 1024))
            continue
        folder = os.path.join(args.input, name)
        if not os.path.isdir(folder):
            continue
        key = key_for(name)
        paths = frames_for(folder, list_order) if key else None
        if not paths:
            skipped.append(name)
            continue
        im = strip(paths)
        rel = 'sprites/%s.webp' % key
        im.save(os.path.join(args.art, rel), 'WEBP', lossless=True, method=6, quality=100)  # lossless: every pixel kept
        e = man['art'].setdefault(key, {})
        e.update({'sprite': rel, 'dirs': 8, 'pixel': True})
        done.append('%s -> %s (%dx%d, %d KB)' % (name, rel, im.width, im.height, os.path.getsize(os.path.join(args.art, rel)) // 1024))
        # 0.35: its animations
        for sub in sorted(os.listdir(folder)):
            if not sub.startswith('anim-') or not os.path.isdir(os.path.join(folder, sub)):
                continue
            an = sub[5:]; sim, nf = sheet(os.path.join(folder, sub))
            if not sim:
                skipped.append('%s %s (a direction is missing)' % (name, an)); continue
            arel = 'sprites/%s-%s.webp' % (key, an)
            sim.save(os.path.join(args.art, arel), 'WEBP', lossless=True, method=6, quality=100)
            man.setdefault('anim', {}).setdefault(key, {})[an] = {'sprite': arel, 'dirs': 8, 'frames': nf, 'fps': ANIM_FPS.get(an, 10), 'pixel': True}
            done.append('%s %s -> %s (%d frames, %dx%d, %d KB)' % (name, an, arel, nf, sim.width, sim.height, os.path.getsize(os.path.join(args.art, arel)) // 1024))
        # the bust portrait, if PixelLab made one (pixellab_gen.py portraits)
        pp = os.path.join(folder, 'portrait.png')
        if os.path.exists(pp):
            os.makedirs(os.path.join(args.art, 'portraits'), exist_ok=True)
            pim = Image.open(pp).convert('RGBA')
            prel = 'portraits/%s.webp' % key
            pim.save(os.path.join(args.art, prel), 'WEBP', lossless=True, method=4, quality=100)
            e['portrait'] = prel
            done.append('%s -> %s (%dx%d, %d KB)' % (name, prel, pim.width, pim.height, os.path.getsize(os.path.join(args.art, prel)) // 1024))
    with open(mpath, 'w') as f:
        json.dump(man, f, indent=1, sort_keys=True)
    for d in done:
        print(d)
    if skipped:
        print('Skipped (no 8 directions found, or name not recognised):', ', '.join(skipped))
    print('%d imported. Manifest: %s' % (len(done), mpath))


if __name__ == '__main__':
    main()
