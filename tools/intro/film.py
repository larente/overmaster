#!/usr/bin/env python3
"""Overmaster film mode: record game footage for the intro, frame by frame, with no menus on screen.

    python3 tools/intro/film.py --site dist/site --out FOLDER [shot ...]     # s12 s13a s13b s13c s14 s16 (default: all)

The game runs in a headless browser on a virtual clock: every frame advances the game exactly 1/30 s, however long
the 3D view takes to draw it, so the footage is smooth even on a slow machine. Randomness is seeded, so a shot
plays the same every time. Each shot is set up through the game's own rules (Game.* and window.__bts), then the
camera is flown along a path while the game plays. Frames land in FOLDER/<shot>/0000.jpg..., which is what
build_intro.py reads as footage.
Needs Python 3 with Playwright (and its Chromium).
"""
import argparse, json, math, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FPS = 30
W, H = 1920, 1080

# A virtual clock, switched on by __film.start(): performance.now, Date.now, requestAnimationFrame and timers
# all run off it, and __film.step(ms) moves it on. Math.random is seeded from the start so every take matches.
CLOCK = r"""
(() => {
  if (!/[?&]film/.test(location.search)) return;
  let seed = 20261029 >>> 0;
  Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const F = window.__film = { on: false, t: 0, cam: null };
  const P = performance, rnow = P.now.bind(P), rDate = Date.now;
  const rAF = window.requestAnimationFrame.bind(window), cAF = window.cancelAnimationFrame.bind(window);
  const rST = window.setTimeout.bind(window), cST = window.clearTimeout.bind(window);
  const rSI = window.setInterval.bind(window), cSI = window.clearInterval.bind(window);
  const frames = new Map(), timers = new Map(); let id = 1e7, dateBase = 0;
  P.now = () => F.on ? F.t : rnow();
  Date.now = () => F.on ? Math.round(dateBase + F.t) : rDate();
  window.requestAnimationFrame = cb => { if (!F.on) return rAF(cb); const i = ++id; frames.set(i, cb); return i; };
  window.cancelAnimationFrame = i => { frames.delete(i); cAF(i); };
  window.setTimeout = (cb, ms, ...a) => { if (!F.on) return rST(cb, ms, ...a); const i = ++id; timers.set(i, { at: F.t + (+ms || 0), cb, a }); return i; };
  window.clearTimeout = i => { timers.delete(i); cST(i); };
  window.setInterval = (cb, ms, ...a) => { if (!F.on) return rSI(cb, ms, ...a); const i = ++id; const e = Math.max(4, +ms || 0); timers.set(i, { at: F.t + e, cb, a, every: e }); return i; };
  window.clearInterval = i => { timers.delete(i); cSI(i); };
  const run = f => { try { f(); } catch (e) { console.error('film: ' + (e && e.stack || e)); } };
  F.start = () => { if (F.on) return; F.t = rnow(); dateBase = rDate() - F.t; F.on = true; };
  F.step = ms => {
    const end = F.t + ms;
    for (let guard = 0; guard < 500; guard++) {
      let best = null;
      for (const [i, T] of timers) if (T.at <= end && (!best || T.at < best[1].at)) best = [i, T];
      if (!best) break;
      const [i, T] = best; F.t = Math.max(F.t, T.at);
      if (T.every) T.at += T.every; else timers.delete(i);
      run(() => typeof T.cb === 'function' ? T.cb(...T.a) : (0, eval)(T.cb));
    }
    F.t = end;
    if (F.before) run(() => F.before(F.t));
    const fs = [...frames.values()]; frames.clear();
    for (const cb of fs) run(() => cb(F.t));
    return F.t;
  };
})();
"""

# No menus: the 3D map (or battlefield) fills the window. Labels that name things stay; panels and toasts go.
FILM_HIDE = ['.side', '.minimap', '#toasts', '#maptray', '.tray', '#endday', '.bar', '.topbar', '.hud', '#screen', '.bark', '.bhead', '.bfoot',
             '.mapbtns', '.zoombtns', '.compass', '.vbar', '.chron', '.tips', '.tip', '#bdeploy', '#btpk', '.l3:not(.l-say)']
FILM_CSS = """
body.film .adv, body.film .mapwrap, body.film .battle, body.film .bfield { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; }
body.film .mapwrap, body.film .bfield { z-index: 90 !important; box-shadow: none !important; }
body.film .mapwrap::after, body.film .bfield::after, body.film .mapwrap::before, body.film .bfield::before { display: none !important; }
body.film #modal, body.film .bark { z-index: 120 !important; }
body.film .film-press { box-shadow: 0 0 0 3px #ffd36a, 0 0 26px 6px rgba(255, 200, 90, .75) !important; transform: scale(1.06); transition: transform .15s; }
"""


def fonts_route(page, sp):
    FD = os.path.join(sp, 'fonts', 'node_modules', '@fontsource')
    faces = []
    for fam, d, wts in [('Cinzel', 'cinzel', [('500', 'normal'), ('700', 'normal'), ('800', 'normal')]),
                        ('Alegreya', 'alegreya', [('400', 'normal'), ('400', 'italic'), ('500', 'normal'), ('700', 'normal'), ('700', 'italic')])]:
        for w, st in wts:
            faces.append("@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:block;src:url(https://fonts.gstatic.com/x/%s/%s-latin-%s-%s.woff2) format('woff2')}" % (fam, st, w, d, d, w, st))
    css = '\n'.join(faces)
    page.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=css))

    def gst(r):
        parts = r.request.url.split('/'); fn = os.path.join(FD, parts[-2], 'files', parts[-1])
        if os.path.exists(fn):
            r.fulfill(status=200, content_type='font/woff2', body=open(fn, 'rb').read(), headers={'access-control-allow-origin': '*'})
        else:
            r.abort()
    page.route('**/fonts.gstatic.com/**', gst)


class Film:
    every = 1   # --preview records every 4th frame, small, to check a shot's framing quickly

    def __init__(self, page, out):
        self.pg, self.out = page, out

    def js(self, code, arg=None):
        return self.pg.evaluate(code, arg)

    def new_game(self, villain='lich'):
        pg = self.pg
        pg.evaluate("sessionStorage.setItem('om-intro','1')"); pg.reload(timeout=180000)
        pg.wait_for_selector('[data-fx="new"]', timeout=120000); pg.wait_for_timeout(500)
        pg.click('[data-fx="new"]'); pg.wait_for_timeout(500)
        pg.click('[data-fx="vtype"][data-k="%s"]' % villain); pg.wait_for_timeout(400)
        pg.click('[data-fx="toparty"]'); pg.wait_for_timeout(400)
        pg.click('[data-fx="begin"]'); pg.wait_for_timeout(8000)
        for _ in range(3):
            if pg.evaluate("!!document.querySelector('#modal [data-act=close]')"):
                pg.click('#modal [data-act="close"]'); pg.wait_for_timeout(600)

    def film_on(self, show=()):
        hide = [q for q in FILM_HIDE if q not in show]
        self.pg.add_style_tag(content=FILM_CSS + ', '.join('body.film ' + q for q in hide) + ' { display: none !important; }')
        self.js("() => { document.body.classList.add('film'); window.dispatchEvent(new Event('resize')); World3D.resize(); }")
        self.pg.wait_for_timeout(500)
        # onto the virtual clock, then restart the 3D loop so its next frame is ours to give
        self.js("() => { __film.start(); World3D.resize(); const m = World3D._mode(); World3D.setMode(null); World3D.setMode(m); }")
        # the camera: the game places it each frame, then we move it where the shot wants it
        self.js("""() => {
          const M = World3D._map(); const cam = M.camera; if (cam.__film) return; cam.__film = true;
          const look = cam.lookAt.bind(cam);
          cam.lookAt = (...a) => { const c = __film.cam; if (!c) return look(...a);
            const ty = M.hAt(c.x, c.z) + (c.lift || 0.2);
            const p = Math.max(0.15, Math.min(1.45, c.pitch)), yaw = c.yaw || 0;
            cam.position.set(c.x + Math.sin(yaw) * Math.cos(p) * c.d, ty + Math.sin(p) * c.d, c.z + Math.cos(yaw) * Math.cos(p) * c.d);
            if (c.fov && cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
            look(c.x, ty, c.z); };
          // a shot can follow something that moves (the party, a band, a minion), smoothed so the camera never jitters
          const where = f => { if (f === 'party') return M.party && M.party.position;
            if (f.startsWith('obj:')) { const E = M.objs.get(f.slice(4)); return E && E.grp.position; }
            if (f.startsWith('min:')) { const E = M.mins && M.mins.get(f.slice(4)); return E && E.grp.position; }
            if (f === 'villain') { const E = M.villain || (M.objs && M.objs.get('villain')); return E && (E.grp ? E.grp.position : E.position); }
            return null; };
          __film.before = () => { const c = __film.cam; if (!c) return;
            if (c.bat) {   // the battlefield: circle the fighters, close in
              const B = World3D._bat(), cam = B.camera; if (!cam) return; let sx = 0, sz = 0, n = 0;
              for (const E of B.units.values()) if (E.visible !== false) { sx += E.position.x; sz += E.position.z; n++; }
              if (!n) return; const tx = sx / n + (c.ox || 0), tz = sz / n + (c.oz || 0);
              const k = __film.bpos ? (c.k || 0.1) : 1; __film.bpos = __film.bpos || { x: tx, z: tz }; __film.bpos.x += (tx - __film.bpos.x) * k; __film.bpos.z += (tz - __film.bpos.z) * k;
              const P = __film.bpos, p = c.pitch, yaw = c.yaw || 0, ly = c.lift || 0.6;
              cam.position.set(P.x + Math.sin(yaw) * Math.cos(p) * c.d, ly + Math.sin(p) * c.d, P.z + Math.cos(yaw) * Math.cos(p) * c.d);
              cam.lookAt(P.x, ly, P.z); cam.updateMatrixWorld(); return; }
            if (c.follow) { const p = where(c.follow); if (p) { const k = __film.fpos ? (c.k || 0.12) : 1; __film.fpos = __film.fpos || { x: p.x, z: p.z };
              __film.fpos.x += (p.x - __film.fpos.x) * k; __film.fpos.z += (p.z - __film.fpos.z) * k; c.x = __film.fpos.x + (c.ox || 0); c.z = __film.fpos.z + (c.oz || 0); } }
            const C = M.cam; C.goal = null; C.dGoal = null; C.tx = c.x; C.tz = c.z; C.d = c.d; };
        }""")

    def reveal(self):
        # no fog: the whole map lit, the heroes in plain sight
        self.js("""() => { const S = window.__bts.state(); for (const k of ['dmSeen', 'explored']) if (S[k]) S[k].fill(1);
          const all = () => new Uint8Array(Game.MW * Game.MH).fill(1); Game.dmVisible = all; window.__bts.ui.fog = null; window.__bts.commit(); }""")

    def quiet_heroes(self):
        # the heroes sit the day out, so the night (and your minions) comes straight after End day
        self.js("() => { Game.partyStep = () => ({ t: 'rest' }); }")

    def end_day(self):
        return "() => { document.querySelector('#endday').click(); }"

    def record(self, name, secs, cam, at=None, settle=0.0, speed=1.0):
        """cam(t) -> dict(x, z, d, pitch, yaw, lift, fov); at: {seconds: js} run when the clock passes it;
        speed < 1 plays the game slower than the film runs"""
        folder = os.path.join(self.out, name); os.makedirs(folder, exist_ok=True)
        for f in os.listdir(folder):
            if f.endswith(('.png', '.jpg')): os.remove(os.path.join(folder, f))
        at = dict(at or {}); done = set()
        n = int(round(secs * FPS)); dt = 1000.0 / FPS * speed
        t_settle = int(round(settle * FPS))
        t0 = time.time()
        e = self.every
        for i in range(-t_settle, n, e):
            t = i / FPS
            for k in sorted(at):
                if k <= t and k not in done:
                    done.add(k); self.js(at[k])
            self.js("c => { __film.cam = c; }", cam(max(0.0, t)))
            self.js("ms => __film.step(ms)", dt * e)
            if i >= 0:
                self.pg.screenshot(path=os.path.join(folder, '%04d.jpg' % i), type='jpeg', quality=93, timeout=180000)
        print('%s: %d frames in %.0f s' % (name, n, time.time() - t0), flush=True)


def ease(u):
    u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return a + (b - a) * u


def path(keys):
    """keys: [(t, dict), ...] -> cam(t), eased between keys"""
    def f(t):
        if t <= keys[0][0]:
            return dict(keys[0][1])
        for (ta, A), (tb, B) in zip(keys, keys[1:]):
            if t <= tb:
                u = ease((t - ta) / max(1e-6, tb - ta))
                return {k: lerp(A[k], B.get(k, A[k]), u) if isinstance(A[k], (int, float)) else A[k] for k in A}
        return dict(keys[-1][1])
    return f


SHOTS = {}


def shot(fn):
    SHOTS[fn.__name__.replace('shot_', '')] = fn
    return fn


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('shots', nargs='*')
    ap.add_argument('--site', default=os.path.join(ROOT, 'dist', 'site'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'dist', 'intro-footage'))
    ap.add_argument('--fonts', default=os.environ.get('FONTS_DIR', ''), help='folder holding node_modules/@fontsource (Cinzel, Alegreya)')
    ap.add_argument('--port', type=int, default=8131)
    ap.add_argument('--probe', action='store_true', help='set up the first shot and save one picture, no recording')
    ap.add_argument('--preview', action='store_true', help='small, every 4th frame: to check framing before a full take')
    a = ap.parse_args()
    global W, H
    if a.preview:
        W, H = 960, 540; Film.every = 4
    names = a.shots or list(SHOTS)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(a.port)], cwd=a.site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            for name in names:
                ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
                ctx.add_init_script(CLOCK)
                pg = ctx.new_page(); pg.set_default_timeout(180000)
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
                pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' and 'fonts.g' not in m.text else None)
                if a.fonts:
                    fonts_route(pg, a.fonts)
                pg.goto('http://localhost:%d/index.html?film' % a.port, wait_until='load')
                pg.wait_for_timeout(2500)
                F = Film(pg, a.out)
                SHOTS[name](F, a.probe)
                for e in errs[:10]:
                    print('  ', name, 'page:', e)
                ctx.close()
            b.close()
    finally:
        srv.terminate()


# ---------------------------------------------------------------- the shots
@shot
def shot_probe(F, probe):
    F.new_game('lich')
    F.pg.screenshot(path=os.path.join(F.out, 'probe-ui.png'))
    F.film_on(); F.reveal()
    for _ in range(8): F.js("() => __film.step(33.3)")
    print(F.js("() => [World3D._fn(), World3D._mode(), document.querySelector('#mapwrap').getBoundingClientRect().width, document.elementsFromPoint(960, 540).map(e => e.tagName + '#' + e.id + '.' + (e.className && e.className.baseVal === undefined ? e.className : '')).slice(0, 8), [...document.querySelectorAll('canvas')].map(c => [c.id, c.className, c.width, c.height, getComputedStyle(c).display, c.getBoundingClientRect().width])]"))
    F.js("() => __film.step(33.3)"); print(F.js("() => World3D._fn()"))
    F.pg.screenshot(path=os.path.join(F.out, 'probe-film.png'))
    print(F.js("""() => { const S = window.__bts.state(), G = Game; const tw = G.siteOf(S, 'tower'), town = G.siteOf(S, 'town');
       return { tower: [tw.x, tw.y], town: [town.x, town.y], minions: S.minions.map(m => [m.id, m.x, m.y]), party: [S.party.x, S.party.y], MW: G.MW, MH: G.MH,
                cls: [...document.body.children].map(e => e.id + '.' + e.className).slice(0, 20) }; }"""))



def site_near_tower(F, k='warren', r0=4, r1=7, toward='town'):
    """a buildable spot a few tiles out from the tower, on the side facing Millbrook"""
    return F.js("""([k, r0, r1, toward]) => { const S = window.__bts.state(), G = Game; S.res.gold += 500; S.res.lumber += 300; S.res.ore += 300;
      const tw = G.siteOf(S, 'tower'), to = G.siteOf(S, toward); const ang = Math.atan2(to.y - tw.y, to.x - tw.x); let best = null;
      for (let r = r0; r <= r1; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = tw.x + dx, y = tw.y + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (G.spotCheck(S, x, y) || G.buildCheck(S, k, x, y, S.minions[0].id)) continue;
        const da = Math.abs(((Math.atan2(dy, dx) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (!best || da < best.da) best = { x, y, da };
      }
      return best ? { tower: [tw.x, tw.y], site: [best.x, best.y], mins: S.minions.map(m => [m.x, m.y]) } : null; }""", [k, r0, r1, toward])


@shot
def shot_s12(F, probe):
    """two minions leave the tower and start hammering at a new lair"""
    F.new_game('lich'); F.film_on(); F.reveal(); F.quiet_heroes()
    info = site_near_tower(F)
    if not info:
        print('s12: no spot to build'); return
    (tx, ty), (sx, sy) = info['tower'], info['site']
    print('s12:', info)
    err = F.js("""([x, y]) => { const S = window.__bts.state(), G = Game; const [a, b] = S.minions;
      const e = G.orderBuild(S, 'warren', x, y, a.id); if (e) return e;
      const lair = S.objects.find(o => o.kind === 'dungeon' && o.mine && o.x === x && o.y === y);
      const e2 = b ? G.orderHelp(S, lair.id, b.id) : null; window.__bts.commit(); return e2; }""", [sx, sy])
    if err:
        print('s12: order refused:', err)
    mx, my = info['mins'][0]
    # from the west, so the minions stand in front of the tower; then round toward the new lair as they walk
    cam = path([(0.0, dict(x=mx + 0.6, z=my + 0.4, d=6.5, pitch=0.55, yaw=-1.15, lift=0.3)),
                (1.0, dict(x=mx + 0.6, z=my + 0.2, d=6.8, pitch=0.55, yaw=-1.1, lift=0.3)),
                (5.0, dict(x=sx - 0.1, z=sy + 0.4, d=6.0, pitch=0.52, yaw=-0.95, lift=0.3))])
    if probe:
        for _ in range(6): F.js("() => __film.step(33.3)")
        F.js("c => { __film.cam = c; }", cam(0)); F.js("() => __film.step(33.3)")
        F.pg.screenshot(path=os.path.join(F.out, 'probe-s12.png')); return
    F.record('s12', 5.0, cam, at={0.6: F.end_day()}, settle=0.4, speed=0.75)



def town_road(F, n=5, lead=9, types=('goblin', 'orc', 'wolf', 'ogre', 'skeleton')):
    """a column of waves on the road to Millbrook, the first `lead` tiles from the gates"""
    return F.js("""([n, lead, types]) => { const S = window.__bts.state(), G = Game;
      const lair = S.objects.find(o => o.kind === 'dungeon' && o.mine); const town = G.siteOf(S, 'town');
      const tw = G.siteOf(S, 'tower'); const p1 = G.wavePath(S, lair) || [], p2 = G.wavePath(S, { x: tw.x, y: tw.y }) || [];
      const path = p2.length > p1.length ? p2 : p1; if (path.length < lead + n + 1) return null;
      const ids = [];
      for (let i = 0; i < n; i++) { const [x, y] = path[path.length - lead - i];
        const st = { id: 'o' + (S.uid++), kind: 'stack', type: types[i % types.length], count: 6 + i * 2, size: 1, x, y, known: true, rumored: false, paid: 0,
                     placed: G.dayKey(S), movedDay: 0, fromDungeon: true, lair: lair.id, home: { x: lair.x, y: lair.y }, wave: true, lvl: 2 };
        S.objects.push(st); ids.push(st.id); }
      window.__bts.commit();
      const [hx, hy] = path[path.length - lead], [tx, ty] = path[path.length - lead - n + 1];
      return { ids, head: [hx, hy], tail: [tx, ty], town: [town.x, town.y] }; }""", [n, lead, list(types)])


def yaw_toward(fx, fy, tx, ty):
    """the yaw that puts the camera behind (fx, fy) looking toward (tx, ty)"""
    return math.atan2(-(tx - fx), -(ty - fy))


@shot
def shot_s14(F, probe):
    """a wave of monsters marches down the road to Millbrook's walls"""
    F.new_game('lich'); F.film_on(); F.reveal(); F.quiet_heroes()
    info = town_road(F)
    if not info:
        print('s14: no road'); return
    print('s14:', info)
    (hx, hy), (qx, qy), (wx, wy) = info['head'], info['tail'], info['town']
    yaw = yaw_toward(qx, qy, wx, wy)
    mx, my = (hx + qx) / 2 + 0.5, (hy + qy) / 2 + 0.5
    cam = path([(0.0, dict(x=mx, z=my, d=8.5, pitch=0.5, yaw=yaw + 0.35, lift=0.3)),
                (5.0, dict(x=hx + (wx - hx) * 0.55 + 0.5, z=hy + (wy - hy) * 0.55 + 0.5, d=9.5, pitch=0.46, yaw=yaw + 0.2, lift=0.3))])
    if probe:
        for _ in range(6): F.js("() => __film.step(33.3)")
        F.js("c => { __film.cam = c; }", cam(0)); F.js("() => __film.step(33.3)")
        F.pg.screenshot(path=os.path.join(F.out, 'probe-s14.png')); return
    F.record('s14', 5.0, cam, at={0.3: F.end_day()}, settle=0.4, speed=0.45)


@shot
def shot_s16(F, probe):
    """the heroes level up, then set off up the road"""
    F.new_game('lich'); F.film_on(); F.reveal()
    F.js("""() => { const S = window.__bts.state(); for (const h of S.heroes) { h.level = (h.level || 1) + 1; } S.pendingLevelUps = S.heroes.map(h => ({ id: h.id, name: h.name, level: h.level })); window.__bts.commit(); }""")
    p = F.js("() => { const S = window.__bts.state(); return [S.party.x, S.party.y]; }")
    cam = path([(0.0, dict(x=p[0] + 0.5, z=p[1] + 0.5, d=6.5, pitch=0.6, yaw=0.3, lift=0.3, follow='party', ox=0.0, oz=0.0, k=0.15)),
                (6.0, dict(x=p[0] + 0.5, z=p[1] + 0.5, d=8.0, pitch=0.55, yaw=0.45, lift=0.3, follow='party', ox=0.0, oz=0.0, k=0.15))])
    if probe:
        for _ in range(6): F.js("() => __film.step(33.3)")
        F.js("c => { __film.cam = c; }", cam(0)); F.js("() => __film.step(33.3)")
        F.pg.screenshot(path=os.path.join(F.out, 'probe-s16.png')); return
    F.record('s16', 6.5, cam, at={0.4: F.end_day()}, settle=0.4, speed=0.8)


def meet_band(F, types=('goblin', 'bandit', 'orc', 'wolf', 'ogre')):
    """put the villain face to face with a band of the wilds that will bargain"""
    return F.js("""(types) => { const S = window.__bts.state(), G = Game; S.res.gold += 500;
      const tw = G.siteOf(S, 'tower'); const V = S.villain;
      const bands = S.objects.filter(o => o.kind === 'stack' && o.wild && types.indexOf(o.type) >= 0)
        .filter(o => { const op = G.parleyOptions(S, o); return !op.tooHigh && op.pay && !op.pay.err; })
        .sort((a, b) => Math.hypot(a.x - tw.x, a.y - tw.y) - Math.hypot(b.x - tw.x, b.y - tw.y));
      for (const o of bands) for (const [dx, dy] of [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 1], [1, 1]]) {
        const x = o.x + dx, y = o.y + dy;
        if (!isFinite(G.tileCost(S, x, y)) || G.objAt(S, x, y) || G.siteAt(S, x, y)) continue;
        V.state = 'map'; V.x = x; V.y = y; V.known = true; V.hpFrac = 1; V.path = []; V.target = o.id; V.meet = o.id;
        window.__bts.commit(); return { band: o.id, type: o.type, at: [o.x, o.y], villain: [x, y] };
      }
      return null; }""", list(types))


@shot
def shot_s13a(F, probe):
    """gold: an audience with a band of the wilds, and the villain pays"""
    F.new_game('lich'); F.film_on(show=['#modal', '.bark']); F.reveal(); F.quiet_heroes()
    m = meet_band(F)
    if not m:
        print('s13a: no band to meet'); return
    print('s13a:', m)
    (bx, by), (vx, vy) = m['at'], m['villain']
    cx, cz = (bx + vx) / 2 + 0.5, (by + vy) / 2 + 0.5
    cam = path([(0.0, dict(x=cx, z=cz, d=6.0, pitch=0.6, yaw=0.4, lift=0.3)), (4.0, dict(x=cx, z=cz, d=5.4, pitch=0.58, yaw=0.5, lift=0.3))])
    if probe:
        F.js("() => window.__bts.parley()")
        for _ in range(10): F.js("() => __film.step(33.3)")
        F.js("c => { __film.cam = c; }", cam(0)); F.js("() => __film.step(33.3)")
        F.pg.screenshot(path=os.path.join(F.out, 'probe-s13a.png')); return
    press = "() => { const b = document.querySelector('[data-act=ppay]'); if (b) b.classList.add('film-press'); }"
    F.record('s13a', 4.0, cam, at={0.05: "() => window.__bts.parley()", 1.25: press, 1.7: "() => window.__bts.parleyAct('ppay')"}, settle=0.2)


@shot
def shot_s13b(F, probe):
    """lies: the villain talks a band round, and it answers"""
    F.new_game('lich'); F.film_on(show=['#modal', '.bark']); F.reveal(); F.quiet_heroes()
    m = meet_band(F, ('orc', 'ogre', 'goblin', 'wolf'))
    if not m:
        print('s13b: no band to meet'); return
    print('s13b:', m)
    (bx, by), (vx, vy) = m['at'], m['villain']
    cx, cz = (bx + vx) / 2 + 0.5, (by + vy) / 2 + 0.5
    # the dice are the game's own (Game.setRng): loaded for this one roll, so the lie lands
    lie = """() => { const S = window.__bts.state(); const op = Game.parleyOptions(S, Game.meetBand(S));
      const t = op.talk.find(z => z.k === 'deceive' && !z.err) || op.talk.find(z => !z.err); if (!t) return;
      Game.setRng(() => 0.999); try { window.__bts.parleyAct('ptalk', t.k); } finally { Game.setRng(Math.random); } }"""
    press = """() => { const b = document.querySelector('[data-act=ptalk][data-k=deceive]') || document.querySelector('[data-act=ptalk]:not([disabled])'); if (b) b.classList.add('film-press'); }"""
    cam = path([(0.0, dict(x=cx, z=cz, d=5.6, pitch=0.55, yaw=-0.35, lift=0.3)), (4.0, dict(x=cx, z=cz, d=5.0, pitch=0.55, yaw=-0.25, lift=0.3))])
    if probe:
        F.js("() => window.__bts.parley()")
        for _ in range(10): F.js("() => __film.step(33.3)")
        F.js(lie)
        for _ in range(10): F.js("() => __film.step(33.3)")
        F.js("c => { __film.cam = c; }", cam(0)); F.js("() => __film.step(33.3)")
        F.pg.screenshot(path=os.path.join(F.out, 'probe-s13b.png')); return
    F.record('s13b', 4.0, cam, at={0.05: "() => window.__bts.parley()", 0.9: press, 1.35: lie}, settle=0.2)


@shot
def shot_s13c(F, probe):
    """fists: the villain fights a band of the wilds alone"""
    F.new_game('lich'); F.film_on(show=['.l3:not(.l-say)']); F.reveal(); F.quiet_heroes()
    m = meet_band(F, ('ogre', 'orc', 'troll', 'wolf', 'bandit', 'goblin'))
    if not m:
        print('s13c: no band to meet'); return
    print('s13c:', m)
    # the band starts a few hexes from the villain, so the fight is on at once
    F.js("""() => { const S = window.__bts.state(); window.__bts.ui.autoBattle = true; Game.startDuel(S); const b = S.battle;
      const boss = b.units.find(u => u.boss); const br = Math.floor(boss.pos / Game.BW), bc = boss.pos % Game.BW; let i = 0;
      for (const u of b.units.filter(u => u.side === 'party')) { const r = Math.max(0, Math.min(Game.BH - 1, br + [0, -1, 1, -2, 2][i % 5])); u.pos = r * Game.BW + Math.max(0, bc - 3 - (i > 2 ? 1 : 0)); i++; }
      window.__bts.enterBattle(); }""")
    for _ in range(4): F.js("() => __film.step(33.3)")
    F.js("() => { World3D.resize(); const m = World3D._mode(); World3D.setMode(null); World3D.setMode(m); }")
    cam = lambda t: None   # the game's own battle camera; the edit closes in on the fight
    if probe:
        for _ in range(40): F.js("() => __film.step(33.3)")
        F.pg.screenshot(path=os.path.join(F.out, 'probe-s13c.png')); return
    F.record('s13c', 6.0, cam, settle=0.3, speed=1.3)


if __name__ == '__main__':
    main()
