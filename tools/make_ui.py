#!/usr/bin/env python3
"""Overmaster: generates the fantasy UI kit (all original, procedural).

Textures and 9-slice frames are drawn at twice their final size, downsampled for clean edges,
saved to ../ui/ and embedded as data URIs in ../ui-assets.css (custom properties on :root).

Materials: carved oak (frames and buttons), forged iron (brackets, rims, channels),
dark stone (panel interiors), parchment (in-world documents), and a starry night sky.
"""
import base64, io, os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.join(ROOT, 'ui')
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- noise and colour helpers
def smooth(t):
    return t * t * (3 - 2 * t)

def vnoise(w, h, cx, cy, seed):
    """Tileable value noise: cx by cy lattice cells across a w by h image."""
    g = np.random.default_rng(seed).random((cy, cx))
    xs = np.arange(w) * cx / w; ys = np.arange(h) * cy / h
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int)
    fx = smooth(xs - x0)[None, :]; fy = smooth(ys - y0)[:, None]
    x1 = (x0 + 1) % cx; y1 = (y0 + 1) % cy
    a = g[np.ix_(y0, x0)]; b = g[np.ix_(y0, x1)]; c = g[np.ix_(y1, x0)]; d = g[np.ix_(y1, x1)]
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy

def fbm(w, h, cx, cy, octaves, seed, gain=0.5):
    t = np.zeros((h, w)); amp = 1.0; tot = 0.0
    for o in range(octaves):
        t += vnoise(w, h, cx * 2 ** o, cy * 2 ** o, seed + o * 13) * amp
        tot += amp; amp *= gain
    return t / tot

def hexc(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255

def ramp(t, stops):
    t = np.clip(t, 0, 1); out = np.zeros(t.shape + (3,))
    pos = [p for p, _ in stops]; cols = [hexc(c) for _, c in stops]
    for ch in range(3):
        out[..., ch] = np.interp(t, pos, [c[ch] for c in cols])
    return out

LIGHT = np.array([-0.55, -0.62, 0.56]); LIGHT /= np.linalg.norm(LIGHT)

def lit(height, strength=1.0):
    """Lambert shading of a height field, light from the top left. A flat surface returns 1."""
    gy, gx = np.gradient(height)
    n = np.stack([-gx * strength, -gy * strength, np.ones_like(height)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    d = n @ LIGHT
    return 0.38 + 1.1 * d

def save(name, rgb, alpha=None, size=None, q=82):
    rgb = np.clip(rgb, 0, 1)
    if alpha is not None:
        arr = np.dstack([rgb, np.clip(alpha, 0, 1)[..., None]])
        im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), 'RGBA')
    else:
        im = Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB')
    if size:
        im = im.resize(size, Image.LANCZOS)
    path = os.path.join(OUT, name + '.webp')
    im.save(path, 'WEBP', quality=min(95, q + 10), method=6)
    return path

# ---------------------------------------------------------------- materials
def wood_strip(w, h, seed, rings=5, dark='#2e1c0e', mid='#6e4626', light='#a8744a', warpk=2.0):
    """Oak with the grain running along x: early and late wood bands, thin dark ring lines,
    open pores as short dark flecks, and broad weathering. Tileable in both directions."""
    rings = int(rings * 2.6)
    y = (np.arange(h)[:, None] / h) * np.ones((1, w))
    warp = fbm(w, h, 2, 2, 4, seed) - 0.5
    warp2 = fbm(w, h, 8, 3, 3, seed + 5) - 0.5
    phase = y * rings + warp * warpk * 1.6 + warp2 * 0.3
    f = phase - np.floor(phase)
    band = smooth(np.clip(f / 0.75, 0, 1))
    line = np.clip(1 - np.abs(f - 0.97) / 0.06, 0, 1) ** 1.5
    pores = np.clip((vnoise(w, h, max(16, w // 2), h, seed + 9) - 0.72) * 4, 0, 1)
    fibers = vnoise(w, h, max(6, w // 14), h, seed + 11)
    blot = fbm(w, h, 4, 3, 4, seed + 21)
    t = 0.7 - 0.28 * band - 0.32 * line - 0.22 * pores - 0.12 * (fibers - 0.5) + 0.3 * (blot - 0.5)
    return ramp(t, [(0, dark), (0.45, mid), (1, light)])

def iron_color(w, h, seed, base='#5c6066', hi='#8a8f96', lo='#2a2c30', rust=0.25):
    n = fbm(w, h, 6, 6, 4, seed); fine = vnoise(w, h, max(8, w // 3), max(8, h // 3), seed + 3)
    col = ramp(0.5 + (n - 0.5) * 0.9 + (fine - 0.5) * 0.25, [(0, lo), (0.55, base), (1, hi)])
    if rust:
        r = fbm(w, h, 5, 5, 3, seed + 7)
        k = np.clip((r - 0.62) * 4, 0, 1)[..., None] * rust
        col = col * (1 - k) + hexc('#6a4228') * k
    return col

def stone(w, h, seed):
    n = fbm(w, h, 4, 4, 6, seed); m = fbm(w, h, 12, 12, 4, seed + 4)
    rng = np.random.default_rng(seed + 9)
    grit = ndimage.gaussian_filter(rng.standard_normal((h, w)), 0.6, mode='wrap')
    speck = ndimage.gaussian_filter((rng.random((h, w)) > 0.982).astype(float), 0.7, mode='wrap')
    ridge = 1 - np.abs(2 * fbm(w, h, 5, 5, 4, seed + 12) - 1)
    crack = np.clip((ridge - 0.93) * 14, 0, 1)
    crack = ndimage.gaussian_filter(crack, 0.8, mode='wrap')
    t = 0.5 + (n - 0.5) * 0.85 + (m - 0.5) * 0.4 + grit * 0.08 - speck * 0.5 - crack * 0.1
    return ramp(t, [(0, '#1c1c18'), (0.45, '#2e2d26'), (0.75, '#3c3a30'), (1, '#4a473a')])

def parchment(w, h, seed):
    n = fbm(w, h, 3, 3, 6, seed); m = fbm(w, h, 16, 16, 4, seed + 2)
    rng = np.random.default_rng(seed + 3)
    grit = ndimage.gaussian_filter(rng.standard_normal((h, w)), 0.7, mode='wrap')
    fib = vnoise(w, h, w // 2, h // 24, seed + 5) - 0.5
    fib2 = vnoise(w, h, w // 30, h // 2, seed + 6) - 0.5
    stains = np.clip((fbm(w, h, 4, 4, 4, seed + 8) - 0.58) * 3, 0, 1)
    t = 0.64 + (n - 0.5) * 0.6 + (m - 0.5) * 0.2 + fib * 0.1 + fib2 * 0.06 + grit * 0.035 - stains * 0.3
    return ramp(t, [(0, '#9a7a46'), (0.45, '#cdb17a'), (0.75, '#e4cf9c'), (1, '#f2e2b8')])

# ---------------------------------------------------------------- frames
def edge_fields(S):
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    dist = np.stack([yy, S - 1 - yy, xx, S - 1 - xx])  # top, bottom, left, right
    d = dist.min(0); edge = dist.argmin(0)
    srt = np.sort(dist, 0); seam = (srt[1] - srt[0]) < 0.9
    along = np.where(edge < 2, xx, yy)
    return xx, yy, d, edge, along, seam

def profile(v, pts):
    xs, ys = zip(*pts)
    return np.interp(v, xs, ys)

def bracket_mask(S, arm, width, inset):
    """L-shaped corner brackets at all four corners, with tapered tips and a rounded heel."""
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    def tl(x, y):
        x = x - inset; y = y - inset
        horiz = (x >= 0) & (y >= 0) & (x < arm) & (y < width * np.clip((arm - x) / (width * 0.9), 0.35, 1))
        vert = (x >= 0) & (y >= 0) & (y < arm) & (x < width * np.clip((arm - y) / (width * 0.9), 0.35, 1))
        heel = (x >= 0) & (y >= 0) & (np.hypot(x - width * 0.55, y - width * 0.55) < width * 0.95)
        return horiz | vert | heel
    m = tl(xx, yy) | tl(S - 1 - xx, yy) | tl(xx, S - 1 - yy) | tl(S - 1 - xx, S - 1 - yy)
    return m

def dome(S, cx, cy, r):
    yy, xx = np.mgrid[0:S, 0:S].astype(float)
    dd = np.hypot(xx - cx, yy - cy)
    return np.sqrt(np.clip(r * r - dd * dd, 0, None)), dd < r

def mirrored_points(S, pts):
    out = []
    for x, y in pts:
        out += [(x, y), (S - 1 - x, y), (x, S - 1 - y), (S - 1 - x, S - 1 - y)]
    return out

def oak_frame(name, S, T, seed, prof, bracket=None, rivets=(), gem=None, outline=True, inner_shadow=8, final=None):
    xx, yy, d, edge, along, seam = edge_fields(S)
    strip = wood_strip(S, max(T, 8) * 2, seed)
    v = np.clip(d / T, 0, 0.999)
    rows = np.clip((v * strip.shape[0]).astype(int), 0, strip.shape[0] - 1)
    cols = ((along + edge * 61) % S).astype(int)
    wood = strip[rows, cols]
    height = profile(v, prof) * T * 0.42
    height = ndimage.gaussian_filter(height, 0.7)
    shade = lit(height)
    rgb = wood * shade[..., None]
    rgb[seam & (d < T)] *= 0.55
    if outline:
        rgb[d < 1.6] *= 0.35
    alpha = (d < T).astype(float)
    # soft shadow the frame casts on whatever it surrounds
    sh = np.clip(1 - (d - T) / inner_shadow, 0, 1) * (d >= T)
    alpha = np.maximum(alpha, sh * 0.6)
    rgb = np.where((d >= T)[..., None], 0.0, rgb)
    if bracket:
        arm, width, inset = bracket
        m = bracket_mask(S, arm, width, inset)
        dist = ndimage.distance_transform_edt(m)
        groove = np.clip(1 - np.abs(dist - width * 0.2) / 1.6, 0, 1)
        h = np.minimum(dist, 3.5) * 1.3 + (fbm(S, S, 16, 16, 2, seed + 40) - 0.5) * 0.8 - groove * 2.2
        metal = iron_color(S, S, seed + 31) * lit(h, 1.0)[..., None]
        metal[(dist > 0) & (dist < 1.3)] *= 0.45
        # rivets and an optional gem on each bracket
        for (cx, cy) in mirrored_points(S, rivets):
            hd, inside = dome(S, cx, cy, width * 0.16)
            rs = lit(hd * 1.4)
            metal[inside] = (hexc('#9a9ea4') * rs[inside][..., None])
        if gem:
            gx, gy, gr, gcol = gem
            for (cx, cy) in mirrored_points(S, [(gx, gy)]):
                hd, inside = dome(S, cx, cy, gr)
                yy2, xx2 = np.mgrid[0:S, 0:S].astype(float)
                rr = np.hypot(xx2 - cx, yy2 - cy) / gr
                base = hexc(gcol)
                c = base[None, None, :] * (0.55 + 0.8 * (1 - rr))[..., None]
                spec = np.exp(-(((xx2 - (cx - gr * 0.35)) ** 2 + (yy2 - (cy - gr * 0.35)) ** 2) / (gr * 0.22) ** 2))
                c = c + spec[..., None] * 0.9
                rim = (rr > 0.82) & inside
                c[rim] = hexc('#2a1a08')
                metal[inside] = c[inside]
                # setting ring
                ring = (rr >= 1.0) & (rr < 1.22)
                metal[ring] = hexc('#b08a3a') * lit(-np.abs(rr - 1.11) * 8)[ring][..., None]
                m = m | ring
        # drop shadow of the bracket
        shd = ndimage.gaussian_filter(np.roll(np.roll(m.astype(float), 3, 0), 3, 1), 2.2) * 0.75
        rgb = rgb * (1 - shd[..., None] * alpha[..., None] * 0.7)
        alpha = np.maximum(alpha, shd * 0.85)
        rgb = np.where(m[..., None], metal, rgb)
        alpha = np.where(m, 1.0, alpha)
    return save(name, rgb, alpha, final)

def iron_frame(name, S, T, seed, rivet_r=None, final=None):
    xx, yy, d, edge, along, seam = edge_fields(S)
    v = np.clip(d / T, 0, 0.999)
    height = profile(v, [(0, 0), (0.15, 0.9), (0.3, 1), (0.7, 0.95), (0.85, 0.7), (1, 0.1)]) * T * 0.5
    height += (fbm(S, S, 10, 10, 3, seed) - 0.5) * 1.2
    height = ndimage.gaussian_filter(height, 0.6)
    rgb = iron_color(S, S, seed, rust=0.3) * lit(height)[..., None]
    rgb[d < 1.5] *= 0.3
    rgb[seam & (d < T)] *= 0.7
    alpha = (d < T).astype(float)
    sh = np.clip(1 - (d - T) / 6, 0, 1) * (d >= T)
    alpha = np.maximum(alpha, sh * 0.55)
    rgb = np.where((d >= T)[..., None], 0.0, rgb)
    if rivet_r:
        for (cx, cy) in mirrored_points(S, [(T * 0.5, T * 0.5)]):
            hd, inside = dome(S, cx, cy, rivet_r)
            rgb[inside] = hexc('#a4a8ae') * lit(hd * 1.5)[inside][..., None]
    return save(name, rgb, alpha, final)

def button_frame(name, S, seed, final=None, rim='#7a7e84'):
    """Oak button rim: black outline, an iron band, a raised oak bevel, then a groove into the panel."""
    T = S * 0.2
    xx, yy, d, edge, along, seam = edge_fields(S)
    v = np.clip(d / T, 0, 0.999)
    strip = wood_strip(S, 64, seed, light='#b8844e')
    rows = np.clip((v * 64).astype(int), 0, 63); cols = ((along + edge * 37) % S).astype(int)
    wood = strip[rows, cols]
    iron = iron_color(S, S, seed + 4, base=rim, rust=0.1)
    height = profile(v, [(0, 0), (0.08, 0.6), (0.2, 0.7), (0.26, 0.55), (0.34, 1.0), (0.62, 0.9), (0.8, 0.45), (0.9, 0.15), (1, 0.05)]) * T * 0.5
    height = ndimage.gaussian_filter(height, 0.6)
    shade = lit(height)
    mat = np.where((v < 0.25)[..., None], iron, wood)
    rgb = mat * shade[..., None]
    rgb[d < 1.5] *= 0.25
    rgb[seam & (d < T)] *= 0.6
    alpha = (d < T).astype(float)
    sh = np.clip(1 - (d - T) / 5, 0, 1) * (d >= T)
    alpha = np.maximum(alpha, sh * 0.7)
    rgb = np.where((d >= T)[..., None], 0.0, rgb)
    return save(name, rgb, alpha, final)

# ---------------------------------------------------------------- build the kit
def build():
    files = {}
    # the big frame around the map, battlefield, screens and dialogs: oak molding, iron brackets with an amber gem
    S = 512; T = 76
    files['frame-oak'] = oak_frame('frame-oak', S, T, 3,
        [(0, 0), (0.06, 0.7), (0.12, 0.85), (0.42, 0.9), (0.5, 0.62), (0.6, 0.6), (0.68, 0.4), (0.76, 0.75), (0.86, 0.72), (0.93, 0.25), (1, 0.05)],
        bracket=(150, 58, 6), rivets=[(6 + 58 * 0.5, 120), (120, 6 + 58 * 0.5)], gem=(6 + 58 * 0.52, 6 + 58 * 0.52, 15, '#e0a028'), final=(256, 256))
    # the light frame for side panels and cards: thin oak with small iron corner plates
    files['frame-thin'] = oak_frame('frame-thin', 256, 26, 8,
        [(0, 0), (0.12, 0.8), (0.45, 0.9), (0.6, 0.55), (0.8, 0.7), (0.92, 0.2), (1, 0.05)],
        bracket=(46, 30, 3), rivets=[(3 + 30 * 0.5, 3 + 30 * 0.5)], final=(128, 128))
    # forged iron rim for parchment, the minimap, inputs and dice cards
    files['frame-iron'] = iron_frame('frame-iron', 192, 22, 12, rivet_r=6.5, final=(96, 96))
    # buttons
    files['btn-oak'] = button_frame('btn-oak', 128, 21, final=(64, 64))
    files['btn-oak-hi'] = button_frame('btn-oak-hi', 128, 21, final=(64, 64), rim='#b09a6a')
    # tiles
    plank = wood_strip(512, 256, 33, rings=6, dark='#24160a', mid='#553519', light='#8a5a32', warpk=1.6)
    files['wood'] = save('wood', plank, size=(256, 128), q=80)
    plank2 = wood_strip(512, 256, 34, rings=5, dark='#3a2412', mid='#7a4c28', light='#b07a48', warpk=1.8)
    files['wood-light'] = save('wood-light', plank2, size=(256, 128), q=80)
    files['stone'] = save('stone', stone(768, 768, 41), size=(384, 384), q=78)
    files['parch'] = save('parch', parchment(512, 512, 51), size=(384, 384), q=80)
    files['sky'] = save('sky', night_sky(1600, 1000, 61), q=74)
    return files

def night_sky(w, h, seed):
    y = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    base = ramp(y, [(0, '#0b1a33'), (0.6, '#0a152a'), (1, '#060d1b')])
    neb = fbm(w, h, 3, 2, 6, seed)
    neb2 = fbm(w, h, 5, 3, 5, seed + 3)
    cloud = np.clip((neb - 0.45) * 2.2, 0, 1) ** 1.6
    teal = np.clip((neb2 - 0.55) * 3, 0, 1) ** 2
    rgb = base + cloud[..., None] * hexc('#1d3a66') * 0.55 + teal[..., None] * hexc('#1b4a5a') * 0.35
    rng = np.random.default_rng(seed + 9)
    stars = np.zeros((h, w))
    n = 1400
    xs = rng.integers(0, w, n); ys = rng.integers(0, h, n); br = rng.random(n) ** 3
    stars[ys, xs] = 0.35 + br * 0.9
    stars = ndimage.gaussian_filter(stars, 0.7) * 4.0 + ndimage.gaussian_filter(stars, 2.5) * 6.0 * (stars.max() > 0)
    rgb = rgb + np.clip(stars, 0, 1.2)[..., None] * hexc('#cfe0ff') * (0.35 + 0.65 * cloud[..., None] + 0.3)
    vign = 1 - 0.35 * np.clip(np.hypot((np.linspace(-1, 1, w)[None, :]) * 0.8, np.linspace(-1, 1, h)[:, None]) - 0.4, 0, 1)
    return rgb * vign[..., None]

def write_css(files):
    lines = ['/* generated by tools/make_ui.py: original procedural UI textures, embedded as data URIs */', ':root {']
    total = 0
    for k, p in files.items():
        data = open(p, 'rb').read(); total += len(data)
        lines.append(f'  --ui-{k}: url(data:image/webp;base64,{base64.b64encode(data).decode()});')
    lines.append('}')
    open(os.path.join(ROOT, 'ui-assets.css'), 'w').write('\n'.join(lines) + '\n')
    return total

if __name__ == '__main__':
    files = build()
    total = write_css(files)
    for k, p in files.items():
        print(f'{k:12s} {os.path.getsize(p) / 1024:6.1f} KB')
    print(f'total {total / 1024:.1f} KB')
