#!/usr/bin/env python3
"""Overmaster intro: cut the cinematic and its trailers from intro.json and whatever assets exist.

    python3 tools/intro/build_intro.py --assets DIR --out DIR             # every cut
    python3 tools/intro/build_intro.py --assets DIR --out DIR game t30    # just these cuts
    python3 tools/intro/build_intro.py ... --fast                         # half size, quick encode, for checking
    python3 tools/intro/build_intro.py ... --sheet                        # also a contact sheet (one frame per shot)

DIR holds what the generation kit made, as it comes off the Mac:
    out-intro/voice/L1-1.mp3 (+ .json timing)   the storyteller's takes (and all.mp3, the read-through)
    out-intro/music/intro-dark.mp3 ...          the score
    out-intro/sfx/door-crash.mp3 ...            the new sound effects
    out-intro/scenes/A.png ...                  the PixelLab scenes
    out-intro/storyteller/portrait.png, eyes.png, lean/, blow/, talk/, talk-happy/
    footage/s12.mp4 (or footage/s12/0000.jpg ...)  game captures (tools/intro/film.js)
Anything missing is stood in for: a labelled slate for art, the game's own sounds and music for audio, and
subtitles alone for lines not yet recorded. So the cut always plays at the right length and the timing can be
judged before the art arrives.

Each cut gets <cut>.mp4 and <cut>.vtt (subtitles). The game intro is kept under 24 MB.
Needs Python 3 with Pillow and numpy, and ffmpeg.
"""
import argparse, copy, json, math, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FONT_DIR = os.path.join(HERE, 'fonts')


def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), int(size))


def ease(u, kind='inout'):
    u = max(0.0, min(1.0, u))
    if kind == 'linear':
        return u
    if kind == 'out':
        return 1 - (1 - u) ** 3
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def probe_dur(path):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True).stdout.decode().strip()
        return float(out)
    except Exception:
        return None


# ---------------------------------------------------------------- assets
class Assets:
    def __init__(self, root, art, data):
        self.root, self.art, self.data = root, art, data
        self.intro = os.path.join(root, 'out-intro') if root else None
        self.cache, self.durs, self.used, self.missing = {}, {}, {}, set()
        self.temp = data['edit'].get('temp', {})

    def _p(self, *parts):
        if not self.intro:
            return None
        p = os.path.join(self.intro, *parts)
        return p if os.path.exists(p) else None

    def dur(self, path):
        if path not in self.durs:
            self.durs[path] = probe_dur(path)
        return self.durs[path]

    # pictures --------------------------------------------------
    def scene(self, sid):
        """the scene upscaled by whole pixels to at least 3840 wide, or None"""
        key = ('scene', sid)
        if key not in self.cache:
            p = self._p('scenes', sid + '.png')
            im = None
            if p:
                im = Image.open(p).convert('RGBA')
                # PixelLab sometimes leaves a transparent margin: trim it, then crop to 16:9 from the middle
                a = np.asarray(im).astype(int)
                solid = (a[..., 3] > 200) & ~((a[..., 0] > 238) & (a[..., 1] > 238) & (a[..., 2] > 238))   # not see-through, not paper-white
                rows, cols = np.where(solid.mean(1) > 0.5)[0], np.where(solid.mean(0) > 0.5)[0]
                bb = (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1) if len(rows) and len(cols) else None
                if bb and (bb[2] - bb[0] < im.width - 2 or bb[3] - bb[1] < im.height - 2):
                    im = im.crop((bb[0] + 1, bb[1] + 1, bb[2] - 1, bb[3] - 1))
                w, h = im.size
                if abs(w / h - 16 / 9) > 0.01:
                    if w / h > 16 / 9:
                        nw = int(round(h * 16 / 9)); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
                    else:
                        nh = int(round(w * 9 / 16)); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
                k = max(1, math.ceil(3840 / im.width))
                im = im.resize((im.width * k, im.height * k), Image.NEAREST)
                self.used['scene ' + sid] = p
            else:
                self.missing.add('scene ' + sid)
            self.cache[key] = im
        return self.cache[key]

    def story(self, part):
        """storyteller pictures: 'portrait', 'eyes' (one image each), 'lean'/'blow' (lists), 'talk'/'talk-happy' (dict)"""
        key = ('story', part)
        if key in self.cache:
            return self.cache[key]
        up = lambda im: im.resize((im.width * 4, im.height * 4), Image.NEAREST)
        val = None
        if part in ('portrait', 'eyes'):
            p = self._p('storyteller', part + '.png')
            val = up(Image.open(p).convert('RGBA')) if p else None
        elif part in ('lean', 'blow'):
            d = self._p('storyteller', part)
            if d:
                fs = sorted(f for f in os.listdir(d) if f.endswith('.png'))
                raw = [Image.open(os.path.join(d, f)).convert('RGBA') for f in fs]
                if part == 'blow' and raw:
                    # the animation forgets his red eyes after its first frame: lay them back on every frame
                    pe, pp = self._p('storyteller', 'eyes.png'), self._p('storyteller', 'portrait.png')
                    if pe and pp:
                        E = np.asarray(Image.open(pe).convert('RGBA')).astype(int); P0 = np.asarray(Image.open(pp).convert('RGBA')).astype(int)
                        red = (E[..., 0] > 150) & (E[..., 0] - E[..., 1] > 70) & (np.abs(E[..., :3] - P0[..., :3]).sum(-1) > 90)
                        out = []
                        for im in raw:
                            a = np.asarray(im).copy(); a[red] = E[red]; out.append(Image.fromarray(a.astype(np.uint8), 'RGBA'))
                        raw = out
                val = [up(im) for im in raw] or None
        elif part.startswith('talk'):
            d = self._p('storyteller', part)
            if d and os.path.exists(os.path.join(d, 'visemes.json')):
                vj = json.load(open(os.path.join(d, 'visemes.json')))
                plans = json.load(open(os.path.join(d, 'lines.json'))) if os.path.exists(os.path.join(d, 'lines.json')) else {}
                imgs = {v: up(Image.open(os.path.join(d, f)).convert('RGBA')) for v, f in vj['files'].items() if os.path.exists(os.path.join(d, f))}
                val = {'order': vj['order'], 'imgs': imgs, 'plans': plans}
        if val is None:
            self.missing.add('storyteller ' + part)
        else:
            self.used['storyteller ' + part] = part
        self.cache[key] = val
        return val

    def game_img(self, rel):
        key = ('game', rel)
        if key not in self.cache:
            p = os.path.join(self.art, rel)
            self.cache[key] = Image.open(p).convert('RGBA') if os.path.exists(p) else None
        return self.cache[key]

    def sprite(self, key, d):
        strip = self.game_img('sprites/%s.webp' % key)
        if strip is None:
            return None
        w = strip.width // 8
        return strip.crop((w * d, 0, w * (d + 1), strip.height))

    def portrait(self, key):
        return self.game_img('portraits/%s.webp' % key)

    def footage(self, name):
        if not self.root:
            return None
        for p in (os.path.join(self.root, 'footage', name + '.mp4'), os.path.join(self.root, 'footage', name)):
            if os.path.exists(p):
                self.used['footage ' + name] = p
                return p
        self.missing.add('footage ' + name)
        return None

    # sounds ----------------------------------------------------
    def voice(self, lid, take):
        """(path, offset, duration, meta) of a line's chosen take; take 'all' slices the read-through"""
        if take == 'all':
            p, j = self._p('voice', 'all.mp3'), self._p('voice', 'all.json')
            line = next((l for l in self.data['lines'] if l['id'] == lid), None)
            if p and j and line:
                meta = json.load(open(j)); say = line.get('say', line['text'])
                al = meta.get('alignment') or {}
                i = (meta.get('say') or '').find(say)
                st, en = al.get('character_start_times_seconds') or [], al.get('character_end_times_seconds') or []
                if i >= 0 and len(en) >= i + len(say):
                    t0, t1 = st[i], en[i + len(say) - 1]
                    sub = {'say': say, 'alignment': {'characters': list(say),
                           'character_start_times_seconds': st[i:i + len(say)], 'character_end_times_seconds': en[i:i + len(say)]}}
                    return p, max(0.0, t0 - 0.05), (t1 - t0) + 0.25, sub
            take = 1
        p, j = self._p('voice', '%s-%s.mp3' % (lid, take)), self._p('voice', '%s-%s.json' % (lid, take))
        if not p:
            self.missing.add('voice ' + lid)
            return None
        self.used['voice %s' % lid] = p
        meta = json.load(open(j)) if j else {}
        al = meta.get('alignment') or {}
        st, en, say = al.get('character_start_times_seconds') or [], al.get('character_end_times_seconds') or [], meta.get('say') or ''
        if st and en and len(st) == len(say):
            # the spoken part only: from the first real letter (after any [tag]) to the last, a breath either side
            # a line that opens with a [tag] (a chuckle, a whisper) keeps everything from the top: the tag is the sound
            i0 = 0 if say.startswith('[') else next((k for k, c in enumerate(say) if c != ' '), 0)
            off = 0.0 if say.startswith('[') else max(0.0, st[i0] - 0.06); end = min(self.dur(p) or en[-1], en[-1] + 0.14)
            return p, off, end - off, meta
        return p, 0.0, self.dur(p), meta

    def music(self, key):
        p = self._p('music', key + '.mp3')
        if p:
            self.used['music ' + key] = p
            return p
        self.missing.add('music ' + key)
        t = self.temp.get('music', {}).get(key)
        if t:
            g = os.path.join(self.art, 'audio', t + '.mp3')
            if os.path.exists(g):
                return g
        return None

    def sfx(self, key):
        p = self._p('sfx', key + '.mp3')
        if p:
            self.used['sfx ' + key] = p
            return p
        for name in (key, self.temp.get('sfx', {}).get(key)):
            if not name:
                continue
            for ext in ('.mp3', '.wav'):
                g = os.path.join(self.art, 'audio', name + ext)
                if os.path.exists(g):
                    return g
        if key in self.data.get('sfx', {}):
            self.missing.add('sfx ' + key)
        return None


# ---------------------------------------------------------------- the timeline
def shot_list(data, cut):
    shots = {s['n']: s for s in data['edit']['shots']}
    out, t = [], 0.0
    for e in cut['shots']:
        n, ov = (e, {}) if isinstance(e, str) else (e[0], e[1])
        s = copy.deepcopy(shots[n]); s.update(copy.deepcopy(ov))
        s['t0'] = t; t += s['dur']; s['t1'] = t
        out.append(s)
    return out, t


def word_frac(text, word):
    i = text.lower().find(word.lower())
    return (max(0, i), len(text)) if i >= 0 else (0, len(text))


class Timeline:
    """Shots laid end to end. A shot can start on a word of a line already placed ("start": {"word": [line, words], "lead": s}),
    which also ends the shot before it; and it can stretch to hold its lines ("fit": true, "tail": s). Lines are placed
    from the start of their shot. With the real voice in, the cut follows the storyteller's pace."""
    def __init__(self, data, cut, assets):
        self.data, self.assets = data, assets
        ed = data['edit']
        self.tempo = float(cut.get('voice_tempo', ed.get('voice_tempo', 1.0)))
        self.lines = {l['id']: l for l in data['lines']}
        takes = ed.get('takes', {})
        self.placed = {}   # line id -> {start, dur, path, off, src, meta, text, say}
        shots, _ = shot_list(data, cut)
        t = 0.0
        for i, s in enumerate(shots):
            st = s.get('start')
            if isinstance(st, dict) and 'word' in st and i:
                w = self.word_time(*st['word'])
                if w is not None:
                    t = max(shots[i - 1]['t0'] + 0.3, w - st.get('lead', 0.12))
                    shots[i - 1]['t1'] = t; shots[i - 1]['dur'] = t - shots[i - 1]['t0']
            s['t0'] = t
            end = t + s['dur']
            for lid, at in s.get('lines', []):
                L = self.lines[lid]
                v = assets.voice(lid, takes.get(lid, 1))
                if v:
                    path, off, src, meta = v
                    dur = src / self.tempo
                else:
                    path, off, src, meta = None, 0.0, 0.0, {}
                    dur = 0.35 + len(L['text'].split()) / 2.4
                self.placed[lid] = {'start': t + at, 'dur': dur, 'path': path, 'off': off, 'src': src, 'meta': meta, 'text': L['text'],
                                    'say': L.get('say', L['text']), 'shot': s['n']}
            if s.get('fit'):
                # hold until every line already running (this shot's, or one carried over from before) has finished
                last = max([P['start'] + P['dur'] for P in self.placed.values()] or [t])
                end = max(end, last + s.get('tail', 0.5))
            s['t1'] = end; s['dur'] = end - t
            t = end
        self.shots, self.length = shots, t
        self.warn = []
        order = sorted(self.placed.items(), key=lambda kv: kv[1]['start'])
        for (a, A), (b, B) in zip(order, order[1:]):
            if A['start'] + A['dur'] > B['start'] - 0.1:
                self.warn.append('%s runs into %s by %.2f s' % (a, b, A['start'] + A['dur'] - B['start'] + 0.1))
        if order:
            a, A = order[-1]
            if A['start'] + A['dur'] > self.length:
                self.warn.append('%s runs past the end by %.2f s' % (a, A['start'] + A['dur'] - self.length))

    def char_time(self, P, i):
        """when character i of a placed line is spoken, on the cut's clock"""
        al = (P['meta'] or {}).get('alignment') or {}
        st = al.get('character_start_times_seconds') or []
        if P['path'] and len(st) > i:
            return P['start'] + max(0.0, st[i] - P['off']) / self.tempo
        return P['start'] + P['dur'] * i / max(1, len(P['say']))

    def shot_at(self, t):
        for s in self.shots:
            if s['t0'] <= t < s['t1']:
                return s
        return self.shots[-1]

    def shot_start(self, n):
        for s in self.shots:
            if s['n'] == n:
                return s['t0']
        return None

    def word_time(self, lid, word):
        P = self.placed.get(lid)
        if not P:
            return None
        i = P['say'].lower().find(word.lower())
        return self.char_time(P, max(0, i)) if i >= 0 else P['start']

    def when(self, shot, at):
        if isinstance(at, dict) and 'word' in at:
            return self.word_time(*at['word'])
        return shot['t0'] + float(at)

    def caption_at(self, t):
        for lid, P in self.placed.items():
            if P['start'] <= t < P['start'] + P['dur'] + 0.15:
                return P['text']
        return None


# ---------------------------------------------------------------- drawing helpers
SLATE_TINT = {'A': (70, 40, 20), 'B': (70, 60, 30), 'C': (40, 30, 20), 'D': (60, 50, 35), 'E': (70, 55, 30), 'F': (15, 22, 35),
              'G': (18, 18, 30), 'H': (30, 15, 40), 'I': (12, 14, 28), 'J': (80, 30, 10)}


def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=fnt) > width and cur:
            lines.append(cur); cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    return lines


def slate(size, title, body, tint=(30, 30, 40), kind='PixelLab scene'):
    W, H = size
    y = np.linspace(0, 1, H)[:, None]
    base = np.array(tint, float)[None, None, :]
    img = (base * (0.55 + 0.9 * (1 - y))[..., None]).repeat(W, 1)
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    d = ImageDraw.Draw(im)
    for gx in range(0, W, 48):   # a faint pixel grid, so camera moves read
        d.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 10))
    for gy in range(0, H, 48):
        d.line([(0, gy), (W, gy)], fill=(255, 255, 255, 10))
    f1, f2, f3 = font('Cinzel-700.ttf', H * 0.065), font('Alegreya-500.ttf', H * 0.032), font('Cinzel-700.ttf', H * 0.026)
    d.text((W / 2, H * 0.36), kind.upper() + ' · NOT MADE YET', font=f3, fill=(255, 230, 170, 150), anchor='mm')
    d.text((W / 2, H * 0.45), title, font=f1, fill=(255, 236, 190, 235), anchor='mm')
    yy = H * 0.54
    for ln in wrap(d, body, f2, W * 0.7)[:5]:
        d.text((W / 2, yy), ln, font=f2, fill=(235, 225, 205, 200), anchor='mm'); yy += H * 0.045
    return im


def cam_box(src_w, src_h, cam, u, ease_kind='inout', snap=None):
    (x0, y0, z0), (x1, y1, z1) = cam
    if ease_kind == 'snap':
        e = ease(u / max(1e-3, snap or 0.25), 'out') if u < (snap or 0.25) else 1.0
    else:
        e = ease(u, ease_kind)
    cx, cy, z = lerp(x0, x1, e), lerp(y0, y1, e), max(1.0, lerp(z0, z1, e))
    w, h = src_w / z, src_h / z
    l = min(max(cx * src_w - w / 2, 0), src_w - w)
    t = min(max(cy * src_h - h / 2, 0), src_h - h)
    return (l, t, l + w, t + h)


def embers(img, t, n=70, seed=3, color=(255, 170, 70)):
    W, H = img.size
    rng = np.random.RandomState(seed)
    xs, vs, ph, sz, sway = rng.rand(n), 30 + rng.rand(n) * 70, rng.rand(n) * 100, 1 + rng.rand(n) * 3, rng.rand(n) * 6.28
    over = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(over)
    s = H / 1080
    for i in range(n):
        period = (H + 40) / (vs[i] * s)
        k = ((t + ph[i]) % period) / period
        y = H + 20 - k * (H + 40)
        x = xs[i] * W + math.sin(t * 1.3 + sway[i]) * 18 * s
        a = int(255 * math.sin(math.pi * k) * 0.8)
        r = sz[i] * s
        d.ellipse([x - r * 2.5, y - r * 2.5, x + r * 2.5, y + r * 2.5], fill=color + (a // 6,))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 220, 150, a))
    img.alpha_composite(over)


def glow(size, color, strength=1.0):
    W, H = size
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W * 0.45)) ** 2 + ((yy - H / 2) / (H * 0.55)) ** 2)
    a = np.clip(1 - r, 0, 1) ** 2 * 200 * strength
    arr = np.zeros((H, W, 4), np.uint8); arr[..., :3] = color; arr[..., 3] = np.clip(a, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def hooded(size):
    """a stand-in storyteller: hood, beard, candle"""
    W = H = size
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.pieslice([W * 0.18, H * 0.08, W * 0.82, H * 0.95], 180, 360, fill=(70, 48, 32, 255))
    d.rectangle([W * 0.18, H * 0.5, W * 0.82, H], fill=(70, 48, 32, 255))
    d.ellipse([W * 0.33, H * 0.25, W * 0.67, H * 0.62], fill=(170, 120, 90, 255))
    d.polygon([(W * 0.35, H * 0.5), (W * 0.65, H * 0.5), (W * 0.5, H * 0.86)], fill=(225, 225, 225, 255))
    d.ellipse([W * 0.4, H * 0.38, W * 0.45, H * 0.42], fill=(30, 20, 15, 255)); d.ellipse([W * 0.55, H * 0.38, W * 0.6, H * 0.42], fill=(30, 20, 15, 255))
    d.rectangle([W * 0.47, H * 0.78, W * 0.53, H * 0.95], fill=(240, 230, 200, 255))
    d.ellipse([W * 0.465, H * 0.69, W * 0.535, H * 0.79], fill=(255, 200, 80, 255))
    return im


# ---------------------------------------------------------------- the renderer
class Renderer:
    def __init__(self, data, assets, tl, size, fast=False):
        self.data, self.A, self.tl, self.size, self.fast = data, assets, tl, size, fast
        self.slates, self.readers, self.footage_files = {}, {}, {}
        self.W, self.H = size

    def blank(self, c=(0, 0, 0)):
        return Image.new('RGBA', self.size, c + (255,))

    def scene_src(self, sid):
        im = self.A.scene(sid)
        if im is not None:
            return im
        if sid not in self.slates:
            S = self.data['scenes'].get(sid, {})
            self.slates[sid] = slate((1920, 1080), 'Scene %s · %s' % (sid, S.get('name', '')), S.get('prompt', ''), SLATE_TINT.get(sid, (30, 30, 40)))
        return self.slates[sid]

    def place_cam(self, src, L, u, out_size=None):
        out_size = out_size or self.size
        cam = L.get('cam') or [[0.5, 0.5, 1.0], [0.5, 0.5, 1.0]]
        box = cam_box(src.width, src.height, cam, u, L.get('ease', 'inout'), L.get('snap'))
        return src.resize(out_size, Image.BILINEAR, box=box)

    def lay_scene(self, frame, L, s, lt, u):
        src = self.scene_src(L['scene'])
        if L.get('blur'):
            small = self.place_cam(src, L, u, (self.W // 4, self.H // 4)).filter(ImageFilter.GaussianBlur(L['blur'] / 4))
            img = small.resize(self.size, Image.BILINEAR)
        else:
            img = self.place_cam(src, L, u)
        if L.get('dim'):
            img = Image.blend(img, Image.new('RGBA', self.size, (0, 0, 0, 255)), L['dim'])
        frame.alpha_composite(img)

    def story_frame(self, L, s, lt):
        """which storyteller picture to show at this moment of the shot"""
        A = self.A
        base = A.story('portrait')
        kind = L['story']
        if base is None:
            if 'hood' not in self.slates:
                self.slates['hood'] = hooded(1024)
            return self.slates['hood'], 'stand-in'
        if kind == 'still':
            return base, 'portrait'
        if kind == 'end':
            if lt >= L.get('blow', 99):
                fr = A.story('blow')
                if fr:
                    i = min(len(fr) - 1, int((lt - L['blow']) * 12))
                    return fr[i], 'blow'
            if lt >= L.get('eyes', 99):
                e = A.story('eyes')
                if e is not None:
                    return e, 'eyes'
        mood = 'talk-happy' if kind == 'end' else 'talk'
        talk = A.story(mood) or A.story('talk')
        P = self.tl.placed.get(L.get('line'))
        if talk and P and talk['imgs']:
            t = s['t0'] + lt - P['start']
            if 0 <= t <= P['dur']:
                v = self.viseme(talk, L['line'], P, t)
                if v in talk['imgs']:
                    return talk['imgs'][v], 'talk'
            rest = talk['order'][0] if talk['order'] else None
            if rest in talk['imgs']:
                return talk['imgs'][rest], 'talk'
        return base, 'portrait'

    def viseme(self, talk, lid, P, t):
        plan = talk['plans'].get(lid) or {}
        frames = plan.get('frames') or []
        if not frames:
            return talk['order'][min(len(talk['order']) - 1, int(t * 11) % 4 + 1)] if talk['order'] else None
        al = (P['meta'] or {}).get('alignment') or {}
        ends = al.get('character_end_times_seconds') or []
        shift = max(0, len(P['say']) - len(plan.get('text', P['text']))) if P['say'].endswith(plan.get('text', P['text'])[-8:]) else 0
        times = []
        if ends and P['path']:
            for f in frames:
                k = max(0, min(len(ends), int(f.get('text_offset', 0)) + shift))
                times.append((ends[k - 1] - P['off']) / self.tl.tempo if k > 0 else 0.0)
        else:
            tot = sum(f.get('duration_ms', 90) for f in frames) or 1; acc = 0
            for f in frames:
                acc += f.get('duration_ms', 90) / tot * P['dur']; times.append(acc)
        for f, end in zip(frames, times):
            if t <= end:
                return f.get('viseme')
        return talk['order'][0]

    def lay_story(self, frame, L, s, lt, u):
        img, what = self.story_frame(L, s, lt)
        h = int(L.get('h', 1.0) * self.H)
        crop = img.resize((h, h), Image.NEAREST) if img.width != h else img
        cam = L.get('cam')
        if cam:
            box = cam_box(img.width, img.height, cam, u)
            crop = img.resize((h, h), Image.BILINEAR, box=box)
        x = int(L.get('x', 0.5) * self.W - h / 2); y = int(L.get('y', 0.5) * self.H - h / 2)
        if L.get('dim'):
            a = crop.getchannel('A')
            crop = Image.blend(crop, Image.new('RGBA', crop.size, (0, 0, 0, 255)), L['dim']); crop.putalpha(a)
        frame.alpha_composite(crop, (x, y))

    def lay_sprites(self, frame, L, s, lt, u):
        h = int(L.get('h', 0.2) * self.H)
        for i, key in enumerate(L['sprites']):
            sp = self.A.sprite(key, L.get('dir', 2))
            if sp is None:
                continue
            k = max(1, round(h / sp.height))
            im = sp.resize((sp.width * k, sp.height * k), Image.NEAREST)
            x0, x1 = L['x'][i]
            x = lerp(x0, x1, u) * self.W
            y = L.get('y', 0.8) * self.H - im.height + math.sin(lt * 9 + i * 1.7) * L.get('bob', 0) * self.H
            frame.alpha_composite(im, (int(x - im.width / 2), int(y)))

    def lay_portrait(self, frame, L, s, lt, u):
        col = hexrgb(L.get('glow', '#ffaa55'))
        frame.alpha_composite(glow(self.size, col, 0.75 + 0.25 * math.sin(lt * 6)))
        embers(frame, s['t0'] + lt, 40, seed=hash(L['portrait']) % 1000, color=col)
        p = self.A.portrait(L['portrait'])
        if p is None:
            return
        h = int(L.get('h', 0.8) * self.H * lerp(1.08, 1.0, ease(lt / 0.5, 'out')))
        im = p.resize((h, h), Image.NEAREST)
        a = min(1.0, lt / 0.08)
        if a < 1:
            im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
        frame.alpha_composite(im, ((self.W - h) // 2, (self.H - h) // 2))

    def lay_portraits(self, frame, L, s, lt, u):
        """several villains side by side, rising in one after another"""
        col = hexrgb(L.get('glow', '#ffaa55'))
        frame.alpha_composite(glow(self.size, col, 0.6 + 0.2 * math.sin(lt * 5)))
        embers(frame, s['t0'] + lt, 50, seed=7, color=col)
        keys = L['portraits']; n = len(keys); h = int(L.get('h', 0.5) * self.H); gap = int(h * 0.12)
        x0 = (self.W - (n * h + (n - 1) * gap)) // 2
        for i, k in enumerate(keys):
            p = self.A.portrait(k)
            if p is None:
                continue
            a = ease((lt - i * 0.12) / 0.35, 'out')
            if a <= 0:
                continue
            im = p.resize((h, h), Image.NEAREST)
            if a < 1:
                im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
            frame.alpha_composite(im, (x0 + i * (h + gap), int((self.H - h) / 2 + (1 - a) * self.H * 0.03)))

    def lay_footage(self, frame, L, s, lt, u):
        p = self.A.footage(L['footage'])
        if not p:
            key = 'foot ' + L['footage']
            if key not in self.slates:
                self.slates[key] = slate((1920, 1080), 'Shot %s' % s['n'], s.get('desc', ''), (25, 35, 30), 'Game footage')
            frame.alpha_composite(self.place_cam(self.slates[key], {'cam': [[0.5, 0.5, 1.0], [0.5, 0.5, 1.06]]}, u))
            return
        ft = lt + L.get('from', 0.0)
        if os.path.isdir(p):
            fs = self.footage_files.get(p) or sorted(f for f in os.listdir(p) if f.endswith(('.png', '.jpg')))
            self.footage_files[p] = fs
            i = max(0, min(len(fs) - 1, int(ft * self.data['edit']['fps'])))
            im = Image.open(os.path.join(p, fs[i])).convert('RGBA')
        else:
            im = self.video_frame(p, ft)
        if L.get('cam'):
            im = self.place_cam(im, L, u)
        frame.alpha_composite(im.resize(self.size, Image.BILINEAR) if im.size != self.size else im)

    def video_frame(self, p, lt):
        r = self.readers.get(p)
        fps = self.data['edit']['fps']
        want = int(lt * fps + 1e-6)
        if r is None or want < r['i']:
            if r:
                r['proc'].kill()
            proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', p, '-vf', 'fps=%d,scale=%d:%d' % (fps, self.W, self.H), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
                                    stdout=subprocess.PIPE)
            r = self.readers[p] = {'proc': proc, 'i': 0, 'last': None}
        n = self.W * self.H * 4
        while r['i'] <= want:
            raw = r['proc'].stdout.read(n)
            if len(raw) < n:
                break
            r['last'] = Image.frombytes('RGBA', self.size, raw); r['i'] += 1
        return r['last'] or self.blank()

    def lay_title(self, frame, L, s, lt, u, small=False):
        embers(frame, s['t0'] + lt, 90)
        W, H = self.size
        if 'emblem' not in self.slates:
            self.slates['emblem'] = Image.open(os.path.join(HERE, 'emblem.png')).convert('RGBA')
        em = self.slates['emblem']
        eh = int(H * (0.2 if small else 0.34))
        k = ease((lt - 0.15) / 0.6, 'out') if not small else 1.0
        if k > 0:
            scale = lerp(0.82, 1.0, k)
            im = em.resize((max(1, int(eh * em.width / em.height * scale)), max(1, int(eh * scale))), Image.LANCZOS)
            im.putalpha(im.getchannel('A').point(lambda v: int(v * min(1, k * 1.4))))
            frame.alpha_composite(im, ((W - im.width) // 2, int(H * (0.12 if small else 0.14) + (eh - im.height) / 2)))
        f = font('Cinzel-800.ttf', H * (0.075 if small else 0.11))
        word = 'OVERMASTER'
        d = ImageDraw.Draw(frame)
        track = H * 0.012
        widths = [d.textlength(c, font=f) for c in word]
        total = sum(widths) + track * (len(word) - 1)
        x = (W - total) / 2; y = H * (0.42 if small else 0.6)
        for i, c in enumerate(word):
            k = 1.0 if small else ease((lt - 0.7 - i * 0.07) / 0.5, 'out')
            if k > 0:
                lay = Image.new('RGBA', self.size, (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)
                shine = 0 if small else max(0.0, 1 - abs(lt - 1.9 - i * 0.06) / 0.25)
                col = tuple(int(lerp(a, b, shine)) for a, b in zip((232, 191, 90), (255, 244, 205)))
                yy = y + (1 - k) * H * 0.04
                dl.text((x + 3, yy + 4), c, font=f, fill=(0, 0, 0, int(200 * k)))
                dl.text((x, yy), c, font=f, fill=col + (int(255 * k),))
                frame.alpha_composite(lay)
            x += widths[i] + track
        if not small:
            a = ease((lt - 2.2) / 0.8)
            if a > 0:
                ft = font('Alegreya-Italic.ttf', H * 0.034)
                lay = Image.new('RGBA', self.size, (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)
                dl.text((W / 2, H * 0.78), 'The heroes are coming. Be ready.', font=ft, fill=(232, 220, 188, int(255 * a)), anchor='mm')
                frame.alpha_composite(lay)

    def lay_endslate(self, frame, L, s, lt, u):
        self.lay_title(frame, L, s, lt, u, small=True)
        W, H = self.size
        d = ImageDraw.Draw(frame)
        a = int(255 * ease(lt / 0.5))
        f1, f2, f3 = font('Cinzel-700.ttf', H * 0.045), font('Cinzel-700.ttf', H * 0.04), font('Alegreya-Italic.ttf', H * 0.03)
        d.text((W / 2, H * 0.62), 'PLAY FREE IN YOUR BROWSER', font=f1, fill=(255, 236, 190, a), anchor='mm')
        addr = self.data['edit'].get('address')
        if addr:
            d.text((W / 2, H * 0.71), addr, font=f2, fill=(232, 191, 90, a), anchor='mm')
        d.text((W / 2, H * (0.8 if addr else 0.72)), 'The Lich and the Ancient Dragon are always free.', font=f3, fill=(232, 220, 188, a), anchor='mm')

    def frame(self, t):
        s = self.tl.shot_at(t)
        lt = t - s['t0']; u = lt / s['dur']
        fr = self.blank()
        for L in s.get('layers', []):
            if 'scene' in L: self.lay_scene(fr, L, s, lt, u)
            elif 'story' in L: self.lay_story(fr, L, s, lt, u)
            elif 'sprites' in L: self.lay_sprites(fr, L, s, lt, u)
            elif 'portrait' in L: self.lay_portrait(fr, L, s, lt, u)
            elif 'portraits' in L: self.lay_portraits(fr, L, s, lt, u)
            elif 'footage' in L: self.lay_footage(fr, L, s, lt, u)
            elif L.get('title'): self.lay_title(fr, L, s, lt, u)
            elif L.get('endslate'): self.lay_endslate(fr, L, s, lt, u)
        fx = s.get('fx', {})
        arr = None
        if fx.get('flicker'):
            k = 1 + fx['flicker'] * (0.6 * math.sin(t * 13.0) + 0.4 * math.sin(t * 31.7 + 1.3))
            arr = np.asarray(fr, dtype=np.float32); arr[..., :3] *= k
        for at, dur in fx.get('flash', []):
            if at <= lt < at + dur:
                if arr is None: arr = np.asarray(fr, dtype=np.float32)
                k = 1 - (lt - at) / dur
                arr[..., :3] = arr[..., :3] + (255 - arr[..., :3]) * 0.75 * k
        if fx.get('grade'):
            if arr is None: arr = np.asarray(fr, dtype=np.float32)
            g = fx['grade']; arr[..., 0] *= g[0]; arr[..., 1] *= g[1]; arr[..., 2] *= g[2]
        for b in fx.get('burst', []):
            at, dur, bx, by = b[:4]
            if at <= lt < at + dur:
                if arr is None: arr = np.asarray(fr, dtype=np.float32)
                k = (lt - at) / dur
                arr = self.burst(arr, k, bx, by, b[4] if len(b) > 4 else (255, 220, 140))
        fade = 1.0
        if fx.get('fade_in') and lt < fx['fade_in']:
            fade = ease(lt / fx['fade_in'])
        if fx.get('black_at') is not None and lt >= fx['black_at']:
            fade = 0.0
        if fade < 1:
            if arr is None: arr = np.asarray(fr, dtype=np.float32)
            arr[..., :3] *= fade
        if arr is not None:
            fr = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        for at, dur, amp in fx.get('shake', []):
            if at <= lt < at + dur:
                k = (1 - (lt - at) / dur) * amp
                dx, dy = int(math.sin(t * 90) * k * self.W), int(math.cos(t * 77) * k * self.H)
                fr = fr.transform(self.size, Image.AFFINE, (1, 0, -dx, 0, 1, -dy), fillcolor=(0, 0, 0, 255))
        return fr


def _burst(self, arr, k, bx, by, col):
    """a flash of golden light: a ring that grows and fades, rays, and a bright core"""
    H, W = arr.shape[:2]
    if not hasattr(self, '_grid') or self._grid[0].shape != (H, W):
        self._grid = np.mgrid[0:H, 0:W].astype(np.float32)
    yy, xx = self._grid
    cx, cy = bx * W, by * H; s = H / 1080
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / s
    ang = np.arctan2(yy - cy, xx - cx)
    core = np.exp(-(r / (60 + 260 * k)) ** 2) * (1 - k) ** 0.7
    ring = np.exp(-((r - 520 * k) / (40 + 30 * k)) ** 2) * (1 - k)
    rays = (0.5 + 0.5 * np.cos(ang * 12 + k * 3)) ** 6 * np.exp(-r / (420 * (0.3 + k))) * (1 - k)
    a = np.clip(core * 1.1 + ring * 0.6 + rays * 0.5, 0, 1)[..., None]
    out = arr.copy(); out[..., :3] = out[..., :3] + (np.array(col, np.float32)[None, None, :] - out[..., :3] * 0.3) * a
    return out


Renderer.burst = _burst


def draw_caption(img, text, vertical=False):
    W, H = img.size
    d = ImageDraw.Draw(img)
    if vertical:
        f = font('Alegreya-700.ttf', W * 0.068)
        lines = wrap(d, text, f, W * 0.86)
        y = H * 0.3 - len(lines) * W * 0.085 / 2
        for ln in lines:
            d.text((W / 2, y), ln, font=f, fill=(255, 244, 220), anchor='mm', stroke_width=int(W * 0.006), stroke_fill=(0, 0, 0)); y += W * 0.085
        return
    f = font('Alegreya-500.ttf', H * 0.045)
    lines = wrap(d, text, f, W * 0.8)
    y = H * 0.9 - (len(lines) - 1) * H * 0.055
    for ln in lines:
        d.text((W / 2, y), ln, font=f, fill=(255, 248, 230), anchor='mm', stroke_width=int(H * 0.004), stroke_fill=(0, 0, 0)); y += H * 0.055


# ---------------------------------------------------------------- audio
def mix_audio(data, cut, tl, assets, out_wav, report):
    ed = data['edit']
    ev = []   # (path, start, offset, dur, gain_db, fade_in, fade_out, bus)
    vg = ed.get('voice_gain_db', 0)
    for lid, P in tl.placed.items():
        if P['path']:
            ev.append((P['path'], P['start'], P['off'], P['src'], vg, 0.02, 0.06, 'voice'))
    for s in tl.shots:
        for e in s.get('sfx', []):
            key, at, gain = e[0], e[1], (e[2] if len(e) > 2 else -6)
            opt = e[3] if len(e) > 3 else {}
            p = assets.sfx(key)
            t = tl.when(s, at)
            if not p or t is None:
                continue
            d = assets.dur(p) or 3
            if opt.get('until'):
                u = tl.shot_start(opt['until'])
                if u is not None and u > t:
                    d = min(d, u - t)
            if t + d > tl.length:
                d = max(0.05, tl.length - t)
            ev.append((p, t, 0.0, d, gain, opt.get('fade_in', 0.0), opt.get('fade_out', 0.05), 'sfx'))
    for key, start, opt in cut.get('music', []):
        p = assets.music(key)
        t = tl.shot_start(start['shot'])
        if not p or t is None:
            continue
        off = start.get('from', 0.0); d = (assets.dur(p) or 60) - off
        if opt.get('until'):
            u = tl.shot_start(opt['until'])
            if u is not None:
                d = min(d, u - t)
        d = min(d, tl.length - t)
        if d <= 0.05:
            continue
        ev.append((p, t, off, d, ed.get('music_db', -6), opt.get('fade_in', 0.0), opt.get('fade_out', 0.3), 'music'))
    report['audio events'] = len(ev)
    if not ev:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '%.3f' % tl.length, out_wav], check=True)
        return
    args = ['ffmpeg', '-v', 'error', '-y']
    for e in ev:
        args += ['-i', e[0]]
    # a silent bed the full length of the cut, so the mix starts at zero and runs to the end whatever starts when
    args += ['-f', 'lavfi', '-t', '%.3f' % tl.length, '-i', 'anullsrc=r=48000:cl=stereo']
    parts, buses = [], {'voice': [], 'sfx': [], 'music': []}
    for i, (p, start, off, dur, gain, fi, fo, bus) in enumerate(ev):
        chain = '[%d:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start=%.3f:duration=%.3f,asetpts=PTS-STARTPTS' % (i, off, dur)
        if bus == 'voice' and abs(tl.tempo - 1) > 1e-3:
            chain += ',atempo=%.4f' % tl.tempo; dur = dur / tl.tempo
        if fi > 0:
            chain += ',afade=t=in:d=%.3f' % fi
        if fo > 0:
            chain += ',afade=t=out:st=%.3f:d=%.3f' % (max(0, dur - fo), fo)
        chain += ',volume=%.2fdB,adelay=%d:all=1[a%d]' % (gain, int(start * 1000), i)
        parts.append(chain); buses[bus].append('[a%d]' % i)
    outs = []
    for bus, ins in buses.items():
        if not ins:
            continue
        parts.append('%samix=inputs=%d:normalize=0:duration=longest,apad=whole_dur=%.3f[%s]' % (''.join(ins), len(ins), tl.length, bus))
        outs.append(bus)
    if 'voice' in outs and 'music' in outs:
        parts.append('[voice]asplit=2[v1][vsc]')
        parts.append('[music][vsc]sidechaincompress=threshold=0.03:ratio=%g:attack=40:release=500[mduck]' % (1 + ed.get('duck_db', 8)))
        outs = [('[v1]' if o == 'voice' else '[mduck]' if o == 'music' else '[%s]' % o) for o in outs]
    else:
        outs = ['[%s]' % o for o in outs]
    parts.append('[%d:a]anull[bed]' % len(ev))
    parts.append('[bed]%samix=inputs=%d:normalize=0:duration=first,loudnorm=I=%g:TP=-1.5:LRA=11[out]' % (''.join(outs), len(outs) + 1, ed.get('lufs', -14)))
    args += ['-filter_complex', ';'.join(parts), '-map', '[out]', '-ar', '48000', '-ac', '2', out_wav]
    subprocess.run(args, check=True)


# ---------------------------------------------------------------- subtitles
def vtt_time(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return '%02d:%02d:%06.3f' % (h, m, s)


def write_vtt(tl, path):
    rows = ['WEBVTT', '']
    for lid, P in sorted(tl.placed.items(), key=lambda kv: kv[1]['start']):
        rows += [lid, '%s --> %s' % (vtt_time(P['start']), vtt_time(min(tl.length, P['start'] + P['dur'] + 0.2))), P['text'], '']
    open(path, 'w').write('\n'.join(rows))


# ---------------------------------------------------------------- one cut
def build_cut(data, name, assets, out_dir, fast=False, sheet=False, captions=False):
    cuts = data['edit']['cuts']
    cut = copy.deepcopy(cuts[name])
    if cut.get('same_as'):
        base = copy.deepcopy(cuts[cut['same_as']]); base.update({k: v for k, v in cut.items() if k != 'same_as'}); cut = base
    tl = Timeline(data, cut, assets)
    vertical = cut.get('size', [16, 9])[1] > cut.get('size', [16, 9])[0]
    W, H = data['edit']['size']
    if fast:
        W, H = W // 2, H // 2
    R = Renderer(data, assets, tl, (W, H), fast)
    OW, OH = ((540, 960) if fast else (1080, 1920)) if vertical else (W, H)
    fps = data['edit']['fps']
    report = {'cut': name, 'length': round(tl.length, 2), 'warnings': tl.warn}
    tmp = tempfile.mkdtemp(prefix='intro-')
    wav = os.path.join(tmp, 'mix.wav')
    mix_audio(data, cut, tl, assets, wav, report)
    mp4 = os.path.join(out_dir, name + '.mp4')
    vargs = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    if fast:
        vargs += ['-preset', 'veryfast', '-crf', '26']
    elif name == 'game':
        kbps = int((21 * 8 * 1024 - 128 * tl.length) / tl.length)   # aim at 21 MB with 128 kbps audio, so the overshoot stays under 24
        vargs += ['-preset', 'slow', '-b:v', '%dk' % min(kbps, 6000), '-maxrate', '%dk' % int(min(kbps, 6000) * 1.5), '-bufsize', '%dk' % (kbps * 2), '-tune', 'animation']
    else:
        vargs += ['-preset', 'slow', '-crf', '18', '-tune', 'animation']
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (OW, OH), '-r', str(fps), '-i', '-',
                            '-i', wav] + vargs + ['-c:a', 'aac', '-b:a', '128k' if name == 'game' else '192k', '-shortest', mp4], stdin=subprocess.PIPE)
    n = int(round(tl.length * fps))
    mids = {s['n']: int((s['t0'] + s['dur'] * 0.6) * fps) for s in tl.shots}
    stills = {}
    wm = None
    for i in range(n):
        t = i / fps
        fr = R.frame(t)
        if vertical:
            band = fr.resize((OW, OW * 9 // 16), Image.BILINEAR)
            canvas = Image.new('RGBA', (OW, OH), (8, 6, 10, 255))
            canvas.alpha_composite(band, (0, (OH - band.height) // 2))
            if wm is None:
                wm = Image.new('RGBA', (OW, OH // 5), (0, 0, 0, 0)); dw = ImageDraw.Draw(wm)
                dw.text((OW / 2, OH / 10), 'OVERMASTER', font=font('Cinzel-800.ttf', OW * 0.1), fill=(232, 191, 90, 255), anchor='mm')
            if not any(L.get('title') or L.get('endslate') for L in tl.shot_at(t).get('layers', [])):
                canvas.alpha_composite(wm, (0, OH - OH // 5 - OH // 20))   # the title card carries its own
            fr = canvas
        if cut.get('captions') or captions:
            c = tl.caption_at(t)
            if c:
                draw_caption(fr, c, vertical)
        if i in mids.values():
            stills[[k for k, v in mids.items() if v == i][0]] = fr.convert('RGB').copy()
        enc.stdin.write(fr.convert('RGB').tobytes())
    enc.stdin.close(); enc.wait()
    for r in R.readers.values():
        r['proc'].kill()
    write_vtt(tl, os.path.join(out_dir, name + '.vtt'))
    report['size MB'] = round(os.path.getsize(mp4) / 1048576, 2)
    if sheet and stills:
        cols = 6; tw = 320; th = int(tw * OH / OW)
        rows = math.ceil(len(stills) / cols)
        sh = Image.new('RGB', (cols * tw, rows * (th + 22)), (20, 20, 20)); d = ImageDraw.Draw(sh)
        for k, (sn, im) in enumerate(stills.items()):
            x, y = (k % cols) * tw, (k // cols) * (th + 22)
            sh.paste(im.resize((tw, th)), (x, y + 22)); d.text((x + 4, y + 3), 'shot %s' % sn, fill=(255, 220, 150), font=font('Cinzel-700.ttf', 15))
        sh.save(os.path.join(out_dir, name + '-sheet.jpg'), quality=88)
    return report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cuts', nargs='*')
    ap.add_argument('--assets', default=None, help='folder holding out-intro/ and footage/')
    ap.add_argument('--art', default=os.path.join(ROOT, 'art'), help="the game's art folder (for stand-ins and game art)")
    ap.add_argument('--data', default=os.path.join(HERE, 'intro.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'dist', 'intro'))
    ap.add_argument('--fast', action='store_true')
    ap.add_argument('--sheet', action='store_true')
    ap.add_argument('--plan', action='store_true', help='print each cut\'s timing (shots and lines) and stop')
    ap.add_argument('--captions', action='store_true', help='burn the subtitles into every cut (for a rough cut without the narration)')
    ap.add_argument('--install', action='store_true', help="put the game cut into the game's art folder (art/intro/) and list it in art/manifest.json")
    a = ap.parse_args()
    data = json.load(open(a.data))
    os.makedirs(a.out, exist_ok=True)
    names = a.cuts or list(data['edit']['cuts'])
    bad = [n for n in names if n not in data['edit']['cuts']]
    if bad:
        sys.exit('Unknown cuts: %s (known: %s)' % (', '.join(bad), ', '.join(data['edit']['cuts'])))
    assets = Assets(a.assets, a.art, data)
    if a.plan:
        cuts = data['edit']['cuts']
        for n in names:
            cut = copy.deepcopy(cuts[n])
            if cut.get('same_as'):
                base = copy.deepcopy(cuts[cut['same_as']]); base.update({k: v for k, v in cut.items() if k != 'same_as'}); cut = base
            tl = Timeline(data, cut, assets)
            print('== %s: %.2f s (voice at %.2fx)' % (n, tl.length, tl.tempo))
            for sh in tl.shots:
                ls = ', '.join('%s %.2f-%.2f' % (lid, P['start'], P['start'] + P['dur']) for lid, P in tl.placed.items() if P['shot'] == sh['n'])
                print('  %-4s %6.2f %5.2f  %s' % (sh['n'], sh['t0'], sh['dur'], ls))
            for w in tl.warn: print('  !', w)
        return
    reports = [build_cut(data, n, assets, a.out, a.fast, a.sheet, a.captions) for n in names]
    rep = {'cuts': reports, 'used': sorted(assets.used), 'missing (stood in)': sorted(assets.missing)}
    json.dump(rep, open(os.path.join(a.out, 'report.json'), 'w'), indent=1)
    for r in reports:
        print('%-9s %6.2f s  %5.2f MB  %s' % (r['cut'], r['length'], r['size MB'], '; '.join(r['warnings']) or 'timing ok'))
    print('stood in: %d (see report.json)' % len(assets.missing))
    if a.install:
        install(a, data, reports, assets)


def install(a, data, reports, assets):
    """the game cut becomes the intro the title screen plays (front.js reads art/manifest.json's "intro")"""
    import shutil
    r = next((r for r in reports if r['cut'] == 'game'), None)
    if not r:
        sys.exit('--install needs the game cut built in the same run.')
    if a.fast:
        sys.exit('--install wants a full-size build, not --fast.')
    if r['size MB'] > 24.5:
        sys.exit('The game cut is %.1f MB: over the 25 MB a file can be on Cloudflare.' % r['size MB'])
    left = [m for m in assets.missing if not m.startswith('sfx ')]
    if left:
        print('Note: installed with stand-ins still in it: %s' % ', '.join(sorted(left)))
    dst = os.path.join(a.art, 'intro'); os.makedirs(dst, exist_ok=True)
    shutil.copy(os.path.join(a.out, 'game.mp4'), os.path.join(dst, 'intro.mp4'))
    shutil.copy(os.path.join(a.out, 'game.vtt'), os.path.join(dst, 'intro.vtt'))
    # a WebM too, for the browsers (and builds of Chromium) that can't play H.264
    # two passes, so the file lands on its budget (one pass of VP9 overshoots by half)
    kbps = int((20 * 8 * 1024 - 112 * r['length']) / r['length'])
    webm = os.path.join(dst, 'intro.webm'); src = os.path.join(a.out, 'game.mp4'); log = os.path.join(a.out, 'vp9pass')
    common = ['-c:v', 'libvpx-vp9', '-b:v', '%dk' % min(kbps, 5000), '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', '-passlogfile', log]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src] + common + ['-pass', '1', '-an', '-f', 'webm', os.devnull], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src] + common + ['-pass', '2', '-c:a', 'libopus', '-b:a', '112k', webm], check=True)
    if os.path.getsize(webm) > 24.5 * 1048576:
        sys.exit('The WebM came out %.1f MB: over what Cloudflare serves as one file.' % (os.path.getsize(webm) / 1048576))
    mp = os.path.join(a.art, 'manifest.json')
    man = json.load(open(mp)) if os.path.exists(mp) else {}
    man['intro'] = {'video': 'intro/intro.mp4', 'webm': 'intro/intro.webm', 'vtt': 'intro/intro.vtt', 'dur': r['length']}
    json.dump(man, open(mp, 'w'), indent=1)
    print('Installed: art/intro/intro.mp4 (%.1f MB) and its subtitles; the title screen plays it on a first visit.' % r['size MB'])


if __name__ == '__main__':
    main()
