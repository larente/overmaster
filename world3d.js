/* Overmaster — 3D adventure map and battlefield (three.js r128) */
const World3D = (() => {
  'use strict';
  const T = window.THREE, M = typeof Models !== 'undefined' ? Models : null, G3 = typeof Game !== 'undefined' ? Game : null;
  if (!T || !M) return null;
  const G = Game;
  const EX = 8, RES = 4, WATER_Y = -0.1;
  const SQ3 = Math.sqrt(3);
  const lin = M.lin;
  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ================= noise ================= */
  function hash2(i, j, s) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y, s, o) => { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < (o || 3); i++) { t += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= 0.5; f *= 2.03; } return t / n; };
  // tileable grey noise for detail and water
  function noiseTexture(size, seed) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d');
    const img = c.createImageData(size, size); const d = img.data;
    const oct = [[size / 4, 0.42], [size / 8, 0.26], [size / 16, 0.17], [size / 32, 0.1], [size / 64, 0.05]];
    const lat = oct.map(([cell]) => { const n = Math.round(size / cell); const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = hash2(i % n, (i / n) | 0, seed + n); return { n, a }; });
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 0;
      for (let k = 0; k < oct.length; k++) {
        const { n, a } = lat[k]; const cell = size / n; const fx = x / cell, fy = y / cell;
        const x0 = Math.floor(fx), y0 = Math.floor(fy); const u = smooth(fx - x0), w = smooth(fy - y0);
        const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
        const p = a[y0 * n + x0], q = a[y0 * n + x1], r = a[y1 * n + x0], s2 = a[y1 * n + x1];
        v += (p + (q - p) * u + (r - p) * w + (p - q - r + s2) * u * w) * oct[k][1];
      }
      const i = (y * size + x) * 4; const b = clamp(Math.round(v * 255), 0, 255); d[i] = d[i + 1] = d[i + 2] = b; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    return t;
  }

  /* ================= ground patterns: one tileable RGBA texture =================
     r: grass (blades and clumps), g: dirt (grit and pebbles), b: rock (plates and cracks), a: cobbles */
  function groundPattern(S) {
    const R = M.rng(901), N = S * S;
    const gr = new Float32Array(N), dr = new Float32Array(N), out = new Uint8Array(N * 4);
    const wrapI = v => ((v % S) + S) % S;
    // tileable value noise with a lattice period that divides the texture
    const lat = (i, j, n, sd) => hash2(((i % n) + n) % n, ((j % n) + n) % n, sd);
    const vnT = (x, y, n, sd) => { const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi); const a = lat(xi, yi, n, sd), b = lat(xi + 1, yi, n, sd), c = lat(xi, yi + 1, n, sd), e = lat(xi + 1, yi + 1, n, sd); return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v; };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S, i = y * S + x;
      const clumps = vnT(u * 8, v * 8, 8, 31) * 0.6 + vnT(u * 16, v * 16, 16, 32) * 0.4;
      gr[i] = 0.46 + (clumps - 0.5) * 0.8;
      const blot = vnT(u * 6, v * 6, 6, 33) * 0.6 + vnT(u * 24, v * 24, 24, 34) * 0.4;
      dr[i] = 0.44 + (blot - 0.5) * 0.45 + (R() - 0.5) * 0.24;
    }
    // grass blades: short curved strokes, light tips over dark roots
    for (let k = 0; k < 15000; k++) {
      const x0 = R() * S, y0 = R() * S, an = R() * Math.PI * 2, L = 5 + R() * 9, bend = (R() - 0.5) * 0.08, dark = R() < 0.42;
      const v = dark ? 0.08 + R() * 0.2 : 0.62 + R() * 0.38, al = dark ? 0.5 : 0.62; let a = an;
      let x = x0, y = y0;
      for (let t = 0; t < L; t++) {
        const i = wrapI(Math.round(y)) * S + wrapI(Math.round(x)); const f = dark ? al : al * (0.5 + 0.5 * t / L);
        gr[i] += (v - gr[i]) * f;
        if (t < L * 0.6) { const j = wrapI(Math.round(y)) * S + wrapI(Math.round(x + 1)); gr[j] += (v - gr[j]) * f * 0.5; }
        x += Math.cos(a); y += Math.sin(a); a += bend;
      }
    }
    // pebbles, lit from the top left with a shadow to the bottom right
    for (let k = 0; k < 1400; k++) {
      const cx = R() * S, cy = R() * S, rx = 1.5 + R() * 4.5, ry = rx * (0.55 + R() * 0.4), rot = R() * 3, base = 0.45 + R() * 0.4;
      const cs = Math.cos(rot), sn = Math.sin(rot), ext = Math.ceil(rx + 3);
      for (let dy = -ext; dy <= ext; dy++) for (let dx = -ext; dx <= ext; dx++) {
        const i = wrapI(Math.floor(cy) + dy) * S + wrapI(Math.floor(cx) + dx);
        const px = Math.floor(cx) + dx - cx, py = Math.floor(cy) + dy - cy;
        const lx = (px * cs + py * sn) / rx, ly = (-px * sn + py * cs) / ry; const r2 = lx * lx + ly * ly;
        if (r2 <= 1) { const lit = clamp(0.62 - 0.38 * (px / rx + py / ry) + 0.25 * (1 - r2), 0.2, 1.25); dr[i] = base * lit; }
        else { const sx = px - 1.3, sy = py - 1.5; const sl = ((sx * cs + sy * sn) / rx) ** 2 + ((-sx * sn + sy * cs) / ry) ** 2; if (sl <= 1) dr[i] *= 0.55; }
      }
    }
    // rock (plates and cracks) and cobbles: cellular patterns
    const cells = (n, seed) => { const P = new Float32Array(n * n * 3); const Rr = M.rng(seed); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const o = (j * n + i) * 3; P[o] = i + 0.12 + Rr() * 0.76; P[o + 1] = j + 0.12 + Rr() * 0.76; P[o + 2] = Rr(); } return P; };
    const res = [0, 0, 0];
    const near = (P, n, u, v) => {
      const cx = u * n, cy = v * n, ix = Math.floor(cx), iy = Math.floor(cy); let d1 = 99, d2 = 99, id = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const gx = ix + i, gy = iy + j, wx = ((gx % n) + n) % n, wy = ((gy % n) + n) % n, o = (wy * n + wx) * 3;
        const ddx = P[o] + gx - wx - cx, ddy = P[o + 1] + gy - wy - cy, dd = ddx * ddx + ddy * ddy;
        if (dd < d1) { d2 = d1; d1 = dd; id = P[o + 2]; } else if (dd < d2) d2 = dd;
      }
      res[0] = Math.sqrt(d1); res[1] = Math.sqrt(d2); res[2] = id; return res;
    };
    const RP = cells(7, 77), RP2 = cells(19, 78), CP = cells(13, 79);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S, o = (y * S + x) * 4; const grit = hash2(x, y, 5);
      near(RP, 7, u, v); const plate1 = res[2], crack = Math.min(1, (res[1] - res[0]) / 0.06);
      near(RP2, 19, u, v); const plate2 = res[2], crack2 = Math.min(1, (res[1] - res[0]) / 0.08);
      const rock = (0.35 + plate1 * 0.4 + plate2 * 0.15) * (0.45 + 0.55 * crack) * (0.75 + 0.25 * crack2) + (grit - 0.5) * 0.12;
      near(CP, 13, u, v); const dome = clamp(1 - res[0] / 0.7, 0, 1), gap = clamp((res[1] - res[0]) / 0.12, 0, 1);
      const cob = (0.3 + 0.5 * Math.sqrt(dome) + res[2] * 0.2) * (0.25 + 0.75 * gap) + (grit - 0.5) * 0.1;
      const i = y * S + x;
      out[o] = clamp(Math.round(gr[i] * 255), 0, 255); out[o + 1] = clamp(Math.round(dr[i] * 255), 0, 255);
      out[o + 2] = clamp(Math.round(rock * 255), 0, 255); out[o + 3] = clamp(Math.round(cob * 255), 0, 255);
    }
    const t = new T.DataTexture(out, S, S, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    return t;
  }
  // how strongly each terrain shows each ground pattern: [grass, dirt, rock, cobble]
  const SPLAT = { grass: [1, 0.12, 0, 0], forest: [0.7, 0.45, 0, 0], dirt: [0.15, 1, 0.12, 0], swamp: [0.45, 0.6, 0, 0], snow: [0, 0.22, 0.12, 0], waste: [0, 0.75, 0.45, 0], water: [0, 0.85, 0, 0], mount: [0, 0.35, 1, 0] };

  /* ================= colour grade: filmic curve, a little desaturation, warm highlights and cool shadows ================= */
  if (!T.ShaderChunk.tonemapping_pars_fragment.includes('btsGrade')) {
    T.ShaderChunk.tonemapping_pars_fragment = T.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', `
      vec3 CustomToneMapping( vec3 color ) { // btsGrade
        vec3 c = ACESFilmicToneMapping( color );
        float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
        c = mix( vec3( l ), c, 0.86 );
        c *= mix( vec3( 0.9, 0.96, 1.1 ), vec3( 1.06, 1.0, 0.9 ), smoothstep( 0.02, 0.45, l ) );
        vec3 g = pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) );
        g = mix( g, g * g * ( 3.0 - 2.0 * g ), 0.28 );
        return saturate( pow( g, vec3( 2.2 ) ) );
      }`);
  }

  /* ================= renderer ================= */
  let renderer = null, canvas = null, raf = 0, mode = null, hooks = null, holder = null, labelsEl = null;
  let quality = { pr: 1, slow: 0, frames: 0, acc: 0, warm: 6 };
  let DETAIL = null, NOISE = null, PAT = null;
  function supported() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function init(h) {
    hooks = h;
    if (renderer) return true;
    try { renderer = new T.WebGLRenderer({ antialias: !window.__film, powerPreference: 'high-performance' }); } catch (e) { renderer = null; return false; }
    quality.pr = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(quality.pr);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.CustomToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    canvas = renderer.domElement; canvas.className = 'gl3d';
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (hooks && hooks.lost) hooks.lost(); });
    DETAIL = noiseTexture(256, 11); NOISE = noiseTexture(256, 29); PAT = groundPattern(512);
    labelsEl = document.createElement('div'); labelsEl.className = 'lbl3d';
    return true;
  }
  function attach(container, before) {
    holder = container;
    if (canvas.parentElement !== container) container.insertBefore(canvas, before || container.firstChild);
    if (labelsEl.parentElement !== container) container.insertBefore(labelsEl, canvas.nextSibling);
    resize();
  }
  function resize() {
    if (!holder || !renderer) return;
    const r = holder.getBoundingClientRect(); const w = Math.max(50, r.width), h = Math.max(50, r.height);
    renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    for (const c of [MAP.camera, BAT.camera, TWN.camera]) if (c) { c.aspect = w / h; c.updateProjectionMatrix(); }
    if (mode === 'battle') fitBattleCamera();
    if (TWN.camera) fitTownCamera();
  }
  function start() { if (!raf) { last = performance.now(); quality.warm = 6; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  let last = 0, paused = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (paused) { last = now; return; }
    // a long load can hand us a frame time from before it started: never step time backwards
    const raw = (now - last) / 1000; const dt = Math.max(0, Math.min(0.1, raw)); last = now;
    if (!hooks || !hooks.state()) return;
    // adaptive quality: drop resolution, then shadows, when frames are slow
    if (quality.warm > 0) quality.warm--;
    else if (document.visibilityState === 'visible' && raw < 3) {
      quality.frames++; quality.acc += raw;
      if (raw > 0.2) quality.slow++; else quality.slow = Math.max(0, quality.slow - 1);
      const avg = quality.frames >= 60 ? quality.acc / quality.frames : 0;
      if (quality.slow >= 3 || avg > 0.045) { quality.slow = 0; quality.frames = 0; quality.acc = 0; degrade(); }
      if (quality.frames >= 60) { quality.frames = 0; quality.acc = 0; }
    }
    if (mode === 'map' && MAP.scene) { updateMap(now / 1000, dt); faceSprites(MAP.camera); renderer.render(MAP.scene, MAP.camera); placeLabels(MAP.camera, MAP.labels); if (hooks.mapFrame) hooks.mapFrame(MAP.cam); }
    else if (mode === 'battle' && BAT.scene) { updateBattle(now / 1000, dt); faceSprites(BAT.camera); renderer.render(BAT.scene, BAT.camera); placeLabels(BAT.camera, BAT.labels); }
    else if (mode === 'town' && TWN.scene) { syncTown(now / 1000); faceSprites(TWN.camera); renderer.render(TWN.scene, TWN.camera); }
  }
  function degrade() {
    if (quality.pr > 1) { quality.pr = 1; renderer.setPixelRatio(1); resize(); return; }
    if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; for (const sc of [MAP.scene, BAT.scene, TWN.scene]) if (sc) sc.traverse(o => { if (o.material) o.material.needsUpdate = true; }); return; }
    if (quality.pr > 0.75) { quality.pr = 0.75; renderer.setPixelRatio(0.75); resize(); }
  }
  function setMode(m) {
    mode = m;
    for (const el of labelsEl.children) el.style.display = 'none';
    if (m) start(); else stop();
  }

  /* ================= labels (HTML over the canvas) ================= */
  function label(store, id, cls, html) {
    let L = store.get(id);
    if (!L) { const el = document.createElement('div'); el.className = 'l3 ' + cls; labelsEl.appendChild(el); L = { el, html: null, cls, pos: new T.Vector3(), on: true, seen: 0 }; store.set(id, L); }
    if (L.cls !== cls) { L.el.className = 'l3 ' + cls; L.cls = cls; }
    if (L.html !== html) { L.el.innerHTML = '<span class="lc">' + html + '</span>'; L.html = html; }
    L.seen = frameNo; L.on = true;
    return L;
  }
  let frameNo = 0;
  const tmpV = new T.Vector3();
  function placeLabels(camera, store) {
    frameNo++;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const zoom = camera === MAP.camera ? clamp(17 / MAP.cam.d, 0.65, 1.45) : clamp(BAT.scale || 1, 0.7, 1.3);
    labelsEl.style.setProperty('--z', zoom.toFixed(3));
    for (const [id, L] of store) {
      if (L.seen < frameNo - 1) { L.el.remove(); store.delete(id); continue; }
      tmpV.copy(L.pos).project(camera);
      const vis = L.on && tmpV.z < 1 && tmpV.x > -1.1 && tmpV.x < 1.1 && tmpV.y > -1.1 && tmpV.y < 1.1;
      if (!vis) { if (L.el.style.display !== 'none') L.el.style.display = 'none'; continue; }
      if (L.el.style.display === 'none') L.el.style.display = '';
      const x = (tmpV.x + 1) / 2 * w, y = (1 - tmpV.y) / 2 * h;
      L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
  }
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ================= lighting ================= */
  function addLights(scene, sunDir) {
    const hemi = new T.HemisphereLight(0x9cb2cc, 0x30261c, 0.62); scene.add(hemi);
    const sun = new T.DirectionalLight(0xffdcb0, 1.9);
    sun.position.copy(sunDir).multiplyScalar(30); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
    scene.add(sun); scene.add(sun.target);
    const fill = new T.DirectionalLight(0x7f9ce0, 0.22); fill.position.set(18, 10, -12); scene.add(fill);
    return { hemi, sun, fill };
  }
  // keep the shadow camera centred on what the player looks at, snapped to texels to avoid shimmer
  function followShadow(L, cx, cz, span) {
    const sun = L.sun; const s = span || 16;
    const sc = sun.shadow.camera; if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix(); }
    const texel = (2 * s) / sun.shadow.mapSize.x;
    const x = Math.round(cx / texel) * texel, z = Math.round(cz / texel) * texel;
    sun.target.position.set(x, 0, z); sun.position.set(x + L.dir.x * 30, L.dir.y * 30, z + L.dir.z * 30);
  }

  /* ================= ground material with detail, rock slopes and overlays ================= */
  function groundMaterial(map, U, opts) {
    const mat = new T.MeshStandardMaterial({ map, roughness: 0.94, metalness: 0 });
    mat.customProgramCacheKey = () => 'bts-ground-' + (opts.map ? 'map' : 'field');
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNorm = normalize(mat3(modelMatrix) * objectNormal);');
      let head = '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nuniform sampler2D uDetail;\nuniform sampler2D uPat;\nuniform sampler2D uSplat;\nuniform vec4 uSplatBox;\nuniform float uSnowLine;\n';
      if (opts.map) head += 'uniform sampler2D uFog;\nuniform sampler2D uOverlay;\nuniform vec2 uMapSize;\nuniform vec4 uSight;\nuniform float uTime;\n';
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', head)
        .replace('#include <map_fragment>', `#include <map_fragment>
          float dt = texture2D(uDetail, vWPos.xz * 0.37).r * 0.55 + texture2D(uDetail, vWPos.xz * 1.6).r * 0.45;
          float big = texture2D(uDetail, vWPos.xz * 0.09).r;
          // painted ground patterns, weighted by the splat map (grass, dirt, rock, cobbles)
          vec4 sp = texture2D(uSplat, (vWPos.xz - uSplatBox.xy) / uSplatBox.zw);
          vec2 guv = vWPos.xz * 0.42;
          vec4 pa = texture2D(uPat, guv), pb = texture2D(uPat, mat2(0.8, -0.6, 0.6, 0.8) * guv * 0.41 + 0.37);
          vec4 pp = mix(pa, pb, 0.38);
          float ws = sp.r + sp.g + sp.b + sp.a;
          vec3 tex = sp.r * mix(vec3(0.5, 0.64, 0.84), vec3(1.26, 1.16, 0.8), pp.r)
                   + sp.g * mix(vec3(0.5, 0.48, 0.5), vec3(1.34, 1.28, 1.18), pp.g)
                   + sp.b * mix(vec3(0.42, 0.44, 0.5), vec3(1.4, 1.34, 1.24), pp.b)
                   + sp.a * mix(vec3(0.4, 0.38, 0.38), vec3(1.4, 1.34, 1.24), pp.a);
          tex /= max(ws, 0.001);
          diffuseColor.rgb *= mix(vec3(1.0), tex, clamp(ws, 0.0, 1.0)) * (0.8 + 0.28 * dt) * (0.88 + 0.24 * big);
          // steep ground turns to cliff rock with vertical strata
          float slope = 1.0 - clamp(vWNorm.y, 0.0, 1.0);
          float rk = texture2D(uPat, vec2(vWPos.x + vWPos.z, vWPos.y * 2.4) * 0.5).b * 0.65 + pp.b * 0.35;
          vec3 rockC = vec3(0.085, 0.074, 0.06) * (0.45 + 1.1 * rk);
          diffuseColor.rgb = mix(diffuseColor.rgb, rockC, smoothstep(0.3, 0.52, slope + (dt - 0.5) * 0.2));
          float snowK = smoothstep(uSnowLine, uSnowLine + 0.35, vWPos.y + (dt - 0.5) * 0.5) * (1.0 - smoothstep(0.5, 0.75, slope));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.85, 0.92) * (0.9 + 0.16 * pp.g), snowK);`)
        .replace('#include <dithering_fragment>', (opts.map ? `
          vec2 tuv = vWPos.xz / uMapSize;
          vec2 fv = texture2D(uFog, tuv).rg; float ex = fv.r;
          float outside = max(max(-vWPos.x, vWPos.x - uMapSize.x), max(-vWPos.z, vWPos.z - uMapSize.y));
          vec3 cc = gl_FragColor.rgb;
          float lum = dot(cc, vec3(0.3, 0.59, 0.11));
          float cloud = texture2D(uDetail, vWPos.xz * 0.12 + vec2(uTime * 0.004, 0.0)).r;
          vec3 fogc = mix(vec3(lum), cc, 0.3) * (0.36 + 0.12 * cloud) + vec3(0.015, 0.02, 0.045);
          fogc = mix(vec3(0.012, 0.012, 0.022) + vec3(0.02, 0.02, 0.03) * cloud, fogc, fv.g);
          cc = mix(fogc, cc, ex);
          if (outside <= 0.0) {
            vec4 ov = texture2D(uOverlay, tuv);
            float oa = ov.a * 255.0; float border = step(127.5, oa); float fill = mod(oa, 128.0) / 127.0;
            vec2 cell = fract(vWPos.xz); float de = min(min(cell.x, cell.y), min(1.0 - cell.x, 1.0 - cell.y));
            float edgeLine = 1.0 - smoothstep(0.03, 0.07, de);
            cc = mix(cc, ov.rgb, fill * (0.5 + 0.5 * (1.0 - smoothstep(0.0, 0.5, de))));
            cc = mix(cc, ov.rgb * 1.25 + 0.08, border * edgeLine);
          }
          if (uSight.w > 0.5) {
            float dd = distance(vWPos.xz, uSight.xy);
            float ang = atan(vWPos.z - uSight.y, vWPos.x - uSight.x);
            float ring = (1.0 - smoothstep(0.02, 0.07, abs(dd - uSight.z))) * step(0.45, fract(ang * 9.0));
            cc = mix(cc, vec3(1.0, 0.86, 0.5), ring * 0.9);
            cc += vec3(0.07, 0.055, 0.02) * (1.0 - step(uSight.z, dd));
          }
          cc *= 1.0 - smoothstep(0.0, 7.0, outside) * 0.8;
          gl_FragColor.rgb = cc;
        ` : '') + '\n#include <dithering_fragment>');
    };
    return mat;
  }
  function treeMaterial(U) { return M.painted({ sway: U.uTime, rough: 0.92, fog: U }); }

  /* ================= the adventure map ================= */
  const MAP = { scene: null, camera: null, seed: null, cam: { tx: 20, tz: 14, d: 19, goal: null }, labels: new Map(), objs: new Map(), overlay: null };
  const TH = { grass: 0.12, dirt: 0.16, forest: 0.17, swamp: 0.0, snow: 0.34, waste: 0.18, water: -0.58, mount: 1.25 };
  // ground colours (sRGB) per terrain: base, light, dark
  const TC = {
    grass: ['#4c7228', '#5f8430', '#3a5e22'], forest: ['#34521f', '#42602a', '#283f1a'], dirt: ['#7e6442', '#937852', '#634d34'],
    swamp: ['#4c5530', '#5e6838', '#343c26'], snow: ['#d8e0e8', '#eef3f7', '#b8c6d4'], waste: ['#4a413d', '#5e524a', '#363030'],
    water: ['#8a7c58', '#a29068', '#5e5a42'], mount: ['#4c463b', '#5a5245', '#3a352d']
  };
  const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const TCRGB = {}; for (const k in TC) TCRGB[k] = TC[k].map(hexRGB);

  // the six fixed places (Millbrook, the Dark Tower...): rebuilt when painted art arrives
  function placeSites(scene, S) {
    if (MAP.sites) for (const g of Object.values(MAP.sites)) scene.remove(g);
    MAP.sites = {};
    for (const s of G.sitesOf(S)) {
      // the Dark Tower looks different for each villain, when there's art for it
      const vt = s.id === 'tower' && S.villain && SPR.art.has('obj-tower-' + S.villain.type) ? 'tower-' + S.villain.type : null;
      const g = vt ? prop(vt, { lightScale: 1 }, 'tower') : prop(s.id, { lightScale: 1 }); const y = MAP.hAt(s.x + 0.5, s.y + 0.5);
      g.position.set(s.x + 0.5, y, s.y + 0.5); if (s.id === 'town') g.rotation.y = 0.15; if (s.id === 'tower') g.rotation.y = -0.3;
      g.scale.setScalar(s.kind === 'town' ? 1.35 : s.kind === 'tower' ? 1.25 : 1.25);
      scene.add(g); MAP.sites[s.id] = g;
      if (s.id === 'town' && !g.userData.sprite) { const mill = new T.Mesh(M.blueprint('town').body ? millGeo() : millGeo(), M.MAT.body); mill.position.set(0.62, 0.52, 0.82); g.add(mill); g.userData.mill = mill; }
      if (s.id === 'tower') { const c = M.circleMesh('#9a4aff', 2.6, 0.5); c.position.y = 0.05; if (g.userData.prop) c.renderOrder = 0; g.add(c); g.userData.circle = c; } // rings under a picture glow beneath it, not over it
    }
  }
  function buildMap(S) {
    if (MAP.seed === S.seed && MAP.size === G.sizeKey() && MAP.scene) return;
    disposeScene(MAP.scene);
    MAP.seed = S.seed; MAP.size = G.sizeKey(); MAP.prot = undefined; MAP.hintRing = null; MAP.vrot = null; MAP.objs = new Map(); MAP.nodes = new Map(); MAP.mins = new Map(); for (const L of MAP.labels.values()) L.el.remove(); MAP.labels = new Map();
    const Mp = G.mapOf(S); const MW = G.MW, MH = G.MH;
    const W = MW + 2 * EX, H = MH + 2 * EX;
    // the map's outermost ring is a border of water and mountain tiles nobody can walk on. Drawn as tiles it made square
    // pools and stripes at the edge of the world, so (0.24) that ring and everything beyond take the look of the land just
    // inside, and heightFn's coast() cuts it off with a ragged shoreline into the sea
    const tclamp = (x, y) => Mp.T[clamp(y, 1, MH - 2) * MW + clamp(x, 1, MW - 2)];
    const roadAt = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && Mp.road[y * MW + x] ? 1 : 0;
    const seed = S.seed % 100000;
    // base height per tile (with a little variety for mountains)
    const tileH = new Float32Array(W * H), mountI = new Float32Array(W * H), roadI = new Float32Array(W * H);
    // how deep each mountain tile sits inside its range: the edges are foothills that rise out of the ground,
    // the middle holds the peaks, so a range never stands on the map like a block
    const mDepth = new Float32Array(W * H); const q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (tclamp(x - EX, y - EX) === 'mount') mDepth[i] = 99; else { mDepth[i] = 0; q.push(i); } }
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi]; const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; const nd = mDepth[i] + (dx && dy ? 1.4 : 1);
        if (nd < mDepth[j]) { mDepth[j] = nd; q.push(j); }
      }
    }
    MAP.mDepth = (tx, ty) => mDepth[clamp(ty + EX, 0, H - 1) * W + clamp(tx + EX, 0, W - 1)];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tx = x - EX, ty = y - EX; const t = tclamp(tx, ty); const i = y * W + x;
      const outside = tx < 0 || ty < 0 || tx >= MW || ty >= MH;
      const md = t === 'mount' ? Math.min(mDepth[i], 4) : 0;
      tileH[i] = t === 'mount' ? 0.25 + 0.55 * (md - 1) + hash2(tx, ty, seed) * 0.35 * Math.min(1, md - 1) + (outside ? 0.2 : 0) : TH[t] + (t === 'water' && outside ? -0.15 : 0);
      mountI[i] = t === 'mount' ? Math.min(1, 0.35 + 0.3 * (md - 1)) : 0; roadI[i] = roadAt(tx, ty);
    }
    const sampleGrid = (A, wx, wz) => {
      const fx = wx + EX - 0.5, fz = wz + EX - 0.5; const x0 = Math.floor(fx), z0 = Math.floor(fz);
      const u = smooth(clamp(fx - x0, 0, 1)), v = smooth(clamp(fz - z0, 0, 1));
      const g = (x, z) => A[clamp(z, 0, H - 1) * W + clamp(x, 0, W - 1)];
      const a = g(x0, z0), b = g(x0 + 1, z0), c = g(x0, z0 + 1), d = g(x0 + 1, z0 + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const sites = G.sitesOf(S).map(s => ({ x: s.x + 0.5, z: s.y + 0.5, h: TH[s.base], r: s.kind === 'town' ? 1.55 : s.kind === 'tower' ? 1.35 : 1.0 }));
    function heightFn(wx, wz) {
      let h = sampleGrid(tileH, wx, wz);
      const mw = sampleGrid(mountI, wx, wz);
      if (mw > 0.01) { const r = 1 - Math.abs(2 * fbm(wx * 0.55, wz * 0.55, seed + 5, 3) - 1); h += mw * mw * (r * 0.95 + fbm(wx * 1.9, wz * 1.9, seed + 9, 2) * 0.35); }
      h += (fbm(wx * 0.35, wz * 0.35, seed + 3, 3) - 0.5) * 0.12 * (1 - mw);
      const rw = sampleGrid(roadI, wx, wz);
      if (rw > 0.05) h -= Math.min(1, rw * 1.6) * 0.035;
      for (const s of sites) { const d = Math.hypot(wx - s.x, wz - s.z); if (d < s.r) { const k = 1 - smooth(clamp((d - s.r * 0.55) / (s.r * 0.45), 0, 1)); h = h + (s.h + 0.02 - h) * k; } }
      return coast(wx, wz, h);
    }
    // beyond the edge (0.24): the land runs on a little way and ends in a ragged coast, bays and headlands, with the
    // sea out to the dark (mountain ranges reach farther out). Before, the edge tiles just stretched out in stripes.
    const SEA = TH.water - 0.3;
    function coast(wx, wz, h) {
      const o = Math.max(1 - wx, wx - (MW - 1), 1 - wz, wz - (MH - 1)); if (o <= 0) return h;   // how far past the walkable land
      const n = fbm(wx * 0.23 + 3.3, wz * 0.23 - 8.1, seed + 41, 3);
      const reach = 0.7 + n * 2.6 + sampleGrid(mountI, wx, wz) * 1.6;   // where the shore is, here
      const k = smooth(clamp((o - reach) / 1.1 + 0.5, 0, 1));
      return h + (SEA - h) * k;
    }
    // height grid
    const GW = W * RES + 1, GH = H * RES + 1;
    const hg = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) hg[j * GW + i] = heightFn(-EX + i / RES, -EX + j / RES);
    const hAt = (wx, wz) => {
      const fx = clamp((wx + EX) * RES, 0, GW - 1.001), fz = clamp((wz + EX) * RES, 0, GH - 1.001);
      const x0 = Math.floor(fx), z0 = Math.floor(fz); const u = fx - x0, v = fz - z0;
      const a = hg[z0 * GW + x0], b = hg[z0 * GW + x0 + 1], c = hg[(z0 + 1) * GW + x0], d = hg[(z0 + 1) * GW + x0 + 1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    MAP.hAt = hAt; MAP.tclamp = tclamp;

    const scene = new T.Scene(); MAP.scene = scene;
    scene.background = new T.Color(0x0d1016);
    scene.fog = new T.Fog(0x2a3440, 30, 70);
    const sunDir = new T.Vector3(-0.55, 1.0, 0.42).normalize();
    MAP.lights = addLights(scene, sunDir); MAP.lights.dir = sunDir;
    const camera = new T.PerspectiveCamera(34, 1.6, 0.1, 160); MAP.camera = camera;

    // uniforms shared by the ground and water
    const fogData = new Uint8Array(MW * MH * 4); const fogTex = new T.DataTexture(fogData, MW, MH, T.RGBAFormat); fogTex.magFilter = T.LinearFilter; fogTex.minFilter = T.LinearFilter; fogTex.needsUpdate = true;
    const ovData = new Uint8Array(MW * MH * 4); const ovTex = new T.DataTexture(ovData, MW, MH, T.RGBAFormat); ovTex.magFilter = T.NearestFilter; ovTex.minFilter = T.NearestFilter; ovTex.needsUpdate = true;
    const U = { uDetail: { value: DETAIL }, uFog: { value: fogTex }, uOverlay: { value: ovTex }, uMapSize: { value: new T.Vector2(MW, MH) }, uSight: { value: new T.Vector4(0, 0, 0, 0) }, uTime: { value: 0 }, uSnowLine: { value: 2.55 } };
    MAP.U = U; MAP.fogData = fogData; MAP.fogTex = fogTex; MAP.ovData = ovData; MAP.ovTex = ovTex; MAP.fogKey = -1;

    // ---- ground texture ----
    const groundTex = paintGround(S, Mp, W, H, tclamp, roadAt, hAt, seed);
    groundTex.encoding = T.sRGBEncoding;
    U.uPat = { value: PAT }; U.uSplat = { value: splatMap(W, H, tclamp, roadAt, hAt, seed) }; U.uSplatBox = { value: new T.Vector4(-EX, -EX, W, H) };
    const geo = new T.PlaneGeometry(W, H, W * RES, H * RES); geo.rotateX(-Math.PI / 2); geo.translate(W / 2 - EX, 0, H / 2 - EX);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setY(k, hAt(pos.getX(k), pos.getZ(k)));
    geo.computeVertexNormals();
    const ground = new T.Mesh(geo, groundMaterial(groundTex, U, { map: true }));
    ground.receiveShadow = true; scene.add(ground); MAP.ground = ground;

    // ---- water ----
    const HR = 2; const hw = W * HR, hh = H * HR; const hdata = new Uint8Array(hw * hh * 4);
    for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) { const v = clamp((hAt(-EX + (i + 0.5) / HR, -EX + (j + 0.5) / HR) + 1.5) / 3, 0, 1); const o = (j * hw + i) * 4; hdata[o] = Math.round(v * 255); hdata[o + 3] = 255; }
    const htex = new T.DataTexture(hdata, hw, hh, T.RGBAFormat); htex.magFilter = T.LinearFilter; htex.minFilter = T.LinearFilter; htex.needsUpdate = true;
    const water = new T.Mesh(new T.PlaneGeometry(W, H, 1, 1), waterMaterial(htex, U, sunDir, W, H));
    water.rotation.x = -Math.PI / 2; water.position.set(W / 2 - EX, WATER_Y, H / 2 - EX); water.renderOrder = 1; scene.add(water); MAP.water = water;

    // ---- vegetation and rocks ----
    buildVegetation(S, Mp, scene, U, W, H, tclamp, roadAt, hAt, seed);

    // ---- sites ----
    placeSites(scene, S);
    // the party marker and selection ring
    MAP.party = makeParty(); scene.add(MAP.party);
    MAP.selRing = M.circleMesh('#ffe39a', 1.15, 0.9); MAP.selRing.visible = false; scene.add(MAP.selRing);
    // route arrows
    MAP.arrows = arrowSet(90, 0.34); scene.add(MAP.arrows.mesh); MAP.xmarks = xSet(6); scene.add(MAP.xmarks.mesh);
    MAP.parrows = arrowSet(240, 0.3); scene.add(MAP.parrows.mesh);
    MAP.mrings = [];
    MAP.citadel = {}; MAP.tw = {};
    MAP.ghost = null; MAP.ghostKey = '';
    const town = G.siteOf(S, 'town'); MAP.cam.tx = town.x + 0.5; MAP.cam.tz = town.y + 0.5;
  }
  function millGeo() { const b = new M.Builder(5); for (let i = 0; i < 4; i++) { const m = new T.Matrix4().makeRotationZ(i * Math.PI / 2); b.add(new T.BoxGeometry(0.035, 0.3, 0.008), '#ece0cc', { y: 0.15, parent: m }); } return b.build(); }

  function paintGround(S, Mp, W, H, tclamp, roadAt, hAt, seed) {
    const PX = 12, K = 3;
    const bw = W * PX, bh = H * PX;
    const base = document.createElement('canvas'); base.width = bw; base.height = bh;
    const bc = base.getContext('2d'); const img = bc.createImageData(bw, bh); const d = img.data;
    const wl = WATER_Y;
    const sand = hexRGB('#c9b27c'), wet = hexRGB('#8f8058'), deepBed = hexRGB('#2f4f52');
    for (let py = 0; py < bh; py++) for (let px = 0; px < bw; px++) {
      const wx = -EX + (px + 0.5) / PX, wz = -EX + (py + 0.5) / PX;
      const warpX = (vnoise(wx * 0.8, wz * 0.8, seed + 41) - 0.5) * 0.7, warpZ = (vnoise(wx * 0.8 + 9, wz * 0.8, seed + 43) - 0.5) * 0.7;
      const sx = wx + warpX - 0.5, sz = wz + warpZ - 0.5; const x0 = Math.floor(sx), z0 = Math.floor(sz);
      const fu = smooth(clamp(sx - x0, 0, 1)), fv = smooth(clamp(sz - z0, 0, 1));
      const ws = [(1 - fu) * (1 - fv), fu * (1 - fv), (1 - fu) * fv, fu * fv];
      const ts = [tclamp(x0, z0), tclamp(x0 + 1, z0), tclamp(x0, z0 + 1), tclamp(x0 + 1, z0 + 1)];
      let r = 0, g = 0, b = 0, wsum = 0;
      const n1 = vnoise(wx * 1.3, wz * 1.3, seed + 7), n2 = vnoise(wx * 3.1, wz * 3.1, seed + 13);
      for (let k = 0; k < 4; k++) {
        const w = ws[k] * ws[k] * ws[k]; const c = TCRGB[ts[k]];
        const m = n1 > 0.62 ? 1 : n1 < 0.36 ? 2 : 0; const blend = m === 0 ? 0 : Math.min(1, Math.abs(n1 - (m === 1 ? 0.62 : 0.36)) * 6);
        const cr = c[0][0] + (c[m][0] - c[0][0]) * blend, cg = c[0][1] + (c[m][1] - c[0][1]) * blend, cb = c[0][2] + (c[m][2] - c[0][2]) * blend;
        r += cr * w; g += cg * w; b += cb * w; wsum += w;
      }
      r /= wsum; g /= wsum; b /= wsum;
      const f = 0.9 + n2 * 0.2; r *= f; g *= f; b *= f;
      // sandy shores and the lake bed
      const h = hAt(wx, wz);
      if (h < wl + 0.14) {
        const k = 1 - smooth(clamp((h - wl - 0.02) / 0.12, 0, 1));
        let sr = sand[0], sg = sand[1], sb = sand[2];
        if (h < wl) { const q = smooth(clamp((wl - h) / 0.45, 0, 1)); sr = wet[0] + (deepBed[0] - wet[0]) * q; sg = wet[1] + (deepBed[1] - wet[1]) * q; sb = wet[2] + (deepBed[2] - wet[2]) * q; }
        r += (sr - r) * k; g += (sg - g) * k; b += (sb - b) * k;
      }
      const o = (py * bw + px) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    bc.putImageData(img, 0, 0);
    const cv = document.createElement('canvas'); cv.width = bw * K; cv.height = bh * K;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(base, 0, 0, cv.width, cv.height);
    const TP = PX * K; // pixels per tile
    const R = M.rng(seed + 77);
    const tx = wx => (wx + EX) * TP, tz = wz => (wz + EX) * TP;
    // speckles, tufts, pebbles, puddles and cracks
    for (let y = -EX; y < G.MH + EX; y++) for (let x = -EX; x < G.MW + EX; x++) {
      const t = tclamp(x, y); const n = t === 'water' ? 0 : t === 'mount' ? 6 : 16;
      for (let k = 0; k < n; k++) {
        const wx = x + R(), wz = y + R(); if (hAt(wx, wz) < WATER_Y + 0.05) continue;
        const X = tx(wx), Z = tz(wz); const v = R();
        if (t === 'grass' || t === 'forest') {
          c.fillStyle = v < 0.5 ? `rgba(30,60,18,${0.18 + R() * 0.2})` : `rgba(170,200,90,${0.12 + R() * 0.16})`;
          c.fillRect(X, Z, 1.5 + R() * 2, 1.5 + R() * 2);
          if (k % 6 === 0) { c.strokeStyle = 'rgba(40,70,20,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(X, Z); c.lineTo(X + (R() - 0.5) * 3, Z - 3 - R() * 3); c.stroke(); }
          if (t === 'forest' && k % 5 === 0) { c.fillStyle = `rgba(110,80,40,${0.2 + R() * 0.2})`; c.fillRect(X, Z, 2, 2); }
        } else if (t === 'dirt' || t === 'waste' || t === 'mount') {
          if (v < 0.35) { c.fillStyle = `rgba(${t === 'waste' ? '120,110,105' : '150,140,125'},${0.4 + R() * 0.3})`; c.beginPath(); c.ellipse(X, Z, 1 + R() * 2.2, 0.8 + R() * 1.5, R() * 3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,240,0.18)'; c.fillRect(X - 0.5, Z - 1, 1.5, 1); }
          else { c.fillStyle = `rgba(40,28,18,${0.12 + R() * 0.18})`; c.fillRect(X, Z, 2, 2); }
          if (t === 'waste' && k % 9 === 0) { c.strokeStyle = R() < 0.25 ? 'rgba(170,70,26,0.3)' : 'rgba(20,14,12,0.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(X, Z); for (let s = 0; s < 3; s++) c.lineTo(X + (R() - 0.5) * 14, Z + (R() - 0.5) * 14); c.stroke(); }
        } else if (t === 'snow') {
          c.fillStyle = v < 0.6 ? `rgba(150,170,200,${0.12 + R() * 0.15})` : 'rgba(255,255,255,0.5)'; c.fillRect(X, Z, 1.5 + R() * 2, 1.5 + R());
        } else if (t === 'swamp') {
          if (k % 7 === 0) { c.fillStyle = `rgba(30,40,28,${0.3 + R() * 0.2})`; c.beginPath(); c.ellipse(X, Z, 4 + R() * 7, 2 + R() * 4, R() * 3, 0, 7); c.fill(); c.fillStyle = 'rgba(160,180,140,0.15)'; c.beginPath(); c.ellipse(X - 1, Z - 1, 2, 1, 0, 0, 7); c.fill(); }
          else { c.fillStyle = `rgba(${v < 0.5 ? '90,110,50' : '40,50,26'},${0.2 + R() * 0.2})`; c.fillRect(X, Z, 2, 2); }
        }
      }
    }
    // roads: worn earth with a stony crown (the cobble pattern comes from the splat map)
    const segs = roadSegments(roadAt);
    const strokeRoads = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); for (const [a, b, e, f] of segs) { c.moveTo(tx(a), tz(b)); c.lineTo(tx(e), tz(f)); } c.stroke(); };
    strokeRoads(TP * 0.5, 'rgba(60,46,28,0.3)');
    strokeRoads(TP * 0.4, '#7c6a4e');
    strokeRoads(TP * 0.26, 'rgba(150,134,108,0.8)');
    for (const [a, b, e, f] of segs) for (let k = 0; k < 7; k++) {
      const q = R(); const X = tx(a + (e - a) * q) + (R() - 0.5) * TP * 0.4, Z = tz(b + (f - b) * q) + (R() - 0.5) * TP * 0.4;
      c.fillStyle = R() < 0.5 ? 'rgba(70,56,38,0.45)' : 'rgba(170,156,130,0.45)'; c.beginPath(); c.ellipse(X, Z, 1.2 + R() * 1.8, 1 + R(), R() * 3, 0, 7); c.fill();
    }
    const t = new T.CanvasTexture(cv); t.anisotropy = 4;
    return t;
  }

  function roadSegments(roadAt) {
    const segs = [];
    for (let y = 0; y < G.MH; y++) for (let x = 0; x < G.MW; x++) {
      if (!roadAt(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy; if (!roadAt(nx, ny)) continue;
        if (dx && dy && (roadAt(x + dx, y) || roadAt(x, y + dy))) continue;
        segs.push([x + 0.5, y + 0.5, nx + 0.5, ny + 0.5]);
      }
    }
    return segs;
  }
  // splat map: per-pixel weights of the four ground patterns, blended like the painted colours
  function splatMap(W, H, tclamp, roadAt, hAt, seed) {
    const PX = 8, bw = W * PX, bh = H * PX; const out = new Uint8Array(bw * bh * 4);
    // road mask, drawn on a canvas and read back
    const rc = document.createElement('canvas'); rc.width = bw; rc.height = bh; const c = rc.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, bw, bh); c.strokeStyle = '#fff'; c.lineWidth = PX * 0.3; c.lineCap = 'round'; c.lineJoin = 'round';
    c.filter = 'blur(1px)'; c.beginPath(); for (const [a, b, e, f] of roadSegments(roadAt)) { c.moveTo((a + EX) * PX, (b + EX) * PX); c.lineTo((e + EX) * PX, (f + EX) * PX); } c.stroke(); c.filter = 'none';
    const road = c.getImageData(0, 0, bw, bh).data;
    for (let py = 0; py < bh; py++) for (let px = 0; px < bw; px++) {
      const wx = -EX + (px + 0.5) / PX, wz = -EX + (py + 0.5) / PX;
      const warpX = (vnoise(wx * 0.8, wz * 0.8, seed + 41) - 0.5) * 0.7, warpZ = (vnoise(wx * 0.8 + 9, wz * 0.8, seed + 43) - 0.5) * 0.7;
      const sx = wx + warpX - 0.5, sz = wz + warpZ - 0.5; const x0 = Math.floor(sx), z0 = Math.floor(sz);
      const fu = smooth(clamp(sx - x0, 0, 1)), fv = smooth(clamp(sz - z0, 0, 1));
      const ws = [(1 - fu) * (1 - fv), fu * (1 - fv), (1 - fu) * fv, fu * fv];
      const ts = [tclamp(x0, z0), tclamp(x0 + 1, z0), tclamp(x0, z0 + 1), tclamp(x0 + 1, z0 + 1)];
      const acc = [0, 0, 0, 0]; let tot = 0;
      for (let k = 0; k < 4; k++) { const w = ws[k] * ws[k] * ws[k]; const sv = SPLAT[ts[k]] || SPLAT.grass; for (let q = 0; q < 4; q++) acc[q] += sv[q] * w; tot += w; }
      for (let q = 0; q < 4; q++) acc[q] /= tot;
      // bare patches in the grass, grassy tufts on the dirt
      const n = vnoise(wx * 1.1, wz * 1.1, seed + 61);
      if (n > 0.66) { const k = Math.min(1, (n - 0.66) * 5) * acc[0] * 0.6; acc[0] -= k; acc[1] += k; }
      const h = hAt(wx, wz); if (h < WATER_Y + 0.14) { const k = 1 - smooth(clamp((h - WATER_Y - 0.02) / 0.12, 0, 1)); acc[0] *= 1 - k; acc[2] *= 1 - k; acc[1] = acc[1] + (0.8 - acc[1]) * k; }
      const rd = road[(py * bw + px) * 4] / 255; const o = (py * bw + px) * 4;
      out[o] = Math.round(acc[0] * (1 - rd) * 255); out[o + 1] = Math.round(Math.min(1, acc[1] * (1 - rd) + rd * 0.25) * 255); out[o + 2] = Math.round(acc[2] * (1 - rd) * 255); out[o + 3] = Math.round(rd * 255);
    }
    const t = new T.DataTexture(out, bw, bh, T.RGBAFormat); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter; t.needsUpdate = true;
    return t;
  }

  function waterMaterial(htex, U, sunDir, W, H) {
    const mat = new T.ShaderMaterial({
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {
        uTime: { value: 0 }, uHeight: { value: null }, uNoise: { value: null }, uFog: { value: null }, uExt: { value: new T.Vector4(-EX, -EX, W, H) },
        uMapSize: { value: new T.Vector2(G.MW, G.MH) }, uSun: { value: sunDir.clone() }, uWaterY: { value: WATER_Y },
        uShallow: { value: new T.Vector3() }, uDeep: { value: new T.Vector3() }, uSky: { value: new T.Vector3() }, uDim: { value: 1 }
      }]),
      vertexShader: `varying vec3 vWPos;
        #include <fog_pars_vertex>
        void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWPos = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime; uniform sampler2D uHeight; uniform sampler2D uNoise; uniform sampler2D uFog; uniform vec4 uExt; uniform vec2 uMapSize; uniform vec3 uSun; uniform float uWaterY;
        uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uSky; uniform float uDim;
        varying vec3 vWPos;
        #include <common>
        #include <fog_pars_fragment>
        void main() {
          float h = texture2D(uHeight, (vWPos.xz - uExt.xy) / uExt.zw).r * 3.0 - 1.5;
          float depth = uWaterY - h;
          if (depth < -0.03) discard;
          vec2 uv1 = vWPos.xz * 0.21 + vec2(uTime * 0.018, uTime * 0.011);
          vec2 uv2 = vWPos.xz * 0.47 - vec2(uTime * 0.015, -uTime * 0.021);
          float n1 = texture2D(uNoise, uv1).r, n2 = texture2D(uNoise, uv2).r;
          float e = 0.006;
          float hx = (texture2D(uNoise, uv1 + vec2(e, 0.0)).r - n1) + (texture2D(uNoise, uv2 + vec2(e, 0.0)).r - n2);
          float hz = (texture2D(uNoise, uv1 + vec2(0.0, e)).r - n1) + (texture2D(uNoise, uv2 + vec2(0.0, e)).r - n2);
          vec3 N = normalize(vec3(-hx * 5.0, 1.0, -hz * 5.0));
          vec3 V = normalize(cameraPosition - vWPos); vec3 L = normalize(uSun); vec3 Hh = normalize(L + V);
          float spec = pow(max(dot(N, Hh), 0.0), 180.0);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
          float dk = smoothstep(0.0, 0.62, depth);
          vec3 col = mix(uShallow, uDeep, dk);
          col *= 0.86 + 0.28 * max(dot(N, L), 0.0);
          col = mix(col, uSky, fres * 0.6);
          col += spec * vec3(1.0, 0.92, 0.75) * 0.8;
          float sp = texture2D(uNoise, vWPos.xz * 1.9 + vec2(uTime * 0.07, uTime * 0.05)).r * texture2D(uNoise, vWPos.xz * 2.3 - vec2(uTime * 0.06, -uTime * 0.04)).r;
          col += smoothstep(0.5, 0.55, sp) * vec3(0.6, 0.62, 0.58) * (0.08 + dk * 0.25);
          float fw = 0.05 + 0.05 * n1;
          float foam = 1.0 - smoothstep(0.0, fw, depth);
          float foamLine = smoothstep(0.35, 0.65, sin(depth * 60.0 - uTime * 2.2 + n2 * 9.0) * 0.5 + 0.5) * (1.0 - smoothstep(0.0, 0.16, depth));
          foam = max(foam * (0.6 + 0.4 * n2), foamLine * 0.45);
          col = mix(col, vec3(0.72, 0.78, 0.76), foam * 0.7);
          float alpha = mix(0.35, 0.94, smoothstep(0.0, 0.3, depth));
          alpha = max(alpha, foam * 0.9);
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
          vec2 tuv = vWPos.xz / uMapSize;
          vec2 fv = texture2D(uFog, tuv).rg; float ex = fv.r;
          float outside = max(max(-vWPos.x, vWPos.x - uMapSize.x), max(-vWPos.z, vWPos.z - uMapSize.y));
          vec3 cc = gl_FragColor.rgb;
          float lum = dot(cc, vec3(0.3, 0.59, 0.11));
          cc = mix(mix(mix(vec3(0.012, 0.012, 0.022), vec3(lum), fv.g), cc, 0.3 * fv.g) * 0.4 + vec3(0.015, 0.02, 0.045) * fv.g, cc, ex);
          cc *= 1.0 - smoothstep(0.0, 7.0, outside) * 0.8;
          gl_FragColor.rgb = cc * uDim;
        }`,
      transparent: true, depthWrite: false, fog: true
    });
    mat.uniforms.uHeight.value = htex; mat.uniforms.uNoise.value = NOISE; mat.uniforms.uFog.value = U.uFog.value;
    const sh = lin('#356f68'), dp = lin('#0c2a36'), sk = lin('#7e98aa');
    mat.uniforms.uShallow.value.set(sh.r, sh.g, sh.b); mat.uniforms.uDeep.value.set(dp.r, dp.g, dp.b); mat.uniforms.uSky.value.set(sk.r, sk.g, sk.b);
    mat.uniforms.uTime = U.uTime;
    return mat;
  }

  function buildVegetation(S, Mp, scene, U, W, H, tclamp, roadAt, hAt, seed) {
    const R = M.rng(seed + 3);
    const buckets = {}; // kind -> [variant][] of {m, c}
    const put = (kind, x, z, s, ry, tint) => {
      const v = Math.floor(R() * 3); const key = kind + v; (buckets[key] = buckets[key] || { kind, v, list: [] }).list.push({ x, z, s, ry, tint });
    };
    const siteNear = (x, z) => G.sitesOf(S).some(s => Math.hypot(s.x + 0.5 - x, s.y + 0.5 - z) < (s.kind === 'town' ? 1.6 : s.kind === 'tower' ? 2.2 : 1.05));
    const regionAt = (x, y) => x >= 0 && y >= 0 && x < G.MW && y < G.MH ? Mp.regionOf[y * G.MW + x] : null;
    for (let y = -EX; y < G.MH + EX; y++) for (let x = -EX; x < G.MW + EX; x++) {
      const t = tclamp(x, y); const reg = regionAt(x, y); const inside = x >= 0 && y >= 0 && x < G.MW && y < G.MH;
      if (inside && roadAt(x, y)) { if (R() < 0.08) put('flowers', x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7, 1, R() * 6, 1); continue; }
      const spot = (minC) => { for (let k = 0; k < 6; k++) { const px = x + 0.08 + R() * 0.84, pz = y + 0.08 + R() * 0.84; if (inside && Math.hypot(px - x - 0.5, pz - y - 0.5) < minC) continue; if (siteNear(px, pz)) continue; if (hAt(px, pz) < WATER_Y + 0.05) continue; return [px, pz]; } return null; };
      const add = (kind, minC, s, tint) => { const p = spot(minC); if (p) put(kind, p[0], p[1], s, R() * 6.28, tint); };
      const cold = reg === 'peaks' || t === 'snow';
      if (t === 'forest') {
        const n = 4 + Math.floor(R() * 3);
        for (let i = 0; i < n; i++) {
          const kind = cold ? 'snowpine' : (reg === 'woods' ? (R() < 0.85 ? 'broad' : 'pine') : (R() < 0.62 ? 'broad' : 'pine'));
          add(kind, inside ? 0.3 : 0, 0.8 + R() * 0.35, 0.72 + R() * 0.26);
        }
        if (R() < 0.5) add('bush', 0.25, 1, 1);
      } else if (t === 'grass') {
        if (R() < 0.07) add('broad', 0.33, 0.9 + R() * 0.4, 0.9 + R() * 0.2);
        if (R() < 0.16) add('bush', 0.3, 1, 1);
        if (R() < 0.3) add('flowers', 0.15, 1, 1);
        if (R() < 0.05) add('rock', 0.3, 1, 1);
      } else if (t === 'dirt') {
        if (R() < 0.18) add('rock', 0.3, 1 + R() * 0.6, 1);
        if (R() < 0.08) add('bush', 0.3, 1, 0.9);
        if (R() < 0.05) add(cold ? 'snowpine' : 'dead', 0.33, 1, 1);
      } else if (t === 'swamp') {
        if (R() < 0.32) add('dead', 0.32, 0.9 + R() * 0.3, 0.9);
        if (R() < 0.6) add('reeds', 0.25, 1, 1);
        if (R() < 0.4) add('reeds', 0.25, 1, 1);
        if (R() < 0.2) add('bush', 0.3, 1, 0.8);
      } else if (t === 'snow') {
        if (R() < 0.14) add('snowpine', 0.33, 0.9 + R() * 0.4, 1);
        if (R() < 0.08) add('rock', 0.3, 1, 1.1);
      } else if (t === 'waste') {
        if (R() < 0.16) add('dead', 0.33, 0.9 + R() * 0.3, 0.75);
        if (R() < 0.2) add('rock', 0.3, 1 + R() * 0.5, 0.7);
      } else if (t === 'mount') {
        const n = inside ? 1 + Math.floor(R() * 2) : (R() < 0.6 ? 1 : 0); const deep = Math.min(1, (MAP.mDepth(x, y) - 1) / 2);
        for (let i = 0; i < n; i++) add(cold || hAt(x + 0.5, y + 0.5) > 2.3 ? 'snowcrag' : 'crag', 0, (0.55 + deep * 0.45) + R() * (0.3 + deep * 0.5), 0.8 + R() * 0.25);
        if (!cold && R() < 0.35) add('pine', 0, 0.8, 0.9);
      }
    }
    const mat = treeMaterial(U); MAP.treeMat = mat;
    const tmpM = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), p = new T.Vector3(), col = new T.Color();
    for (const key of Object.keys(buckets)) {
      const B = buckets[key]; const geo = M.treeVariants(B.kind)[B.v];
      const im = new T.InstancedMesh(geo, mat, B.list.length);
      B.list.forEach((it, i) => {
        q.setFromAxisAngle(new T.Vector3(0, 1, 0), it.ry); sc.set(it.s, it.s * (0.9 + (i % 5) * 0.05), it.s);
        // big rocks sit on the lowest point of the ground under them, so no edge hangs in the air
        let gy = hAt(it.x, it.z);
        if (B.kind === 'crag' || B.kind === 'snowcrag' || B.kind === 'rock') { const rr = (B.kind === 'rock' ? 0.18 : 0.42) * it.s; for (let k = 0; k < 8; k++) gy = Math.min(gy, hAt(it.x + Math.cos(k * 0.785) * rr, it.z + Math.sin(k * 0.785) * rr)); gy -= 0.02 * it.s; }
        p.set(it.x, gy - 0.015, it.z);
        tmpM.compose(p, q, sc); im.setMatrixAt(i, tmpM); col.setScalar(it.tint); im.setColorAt(i, col);
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      const small = B.kind === 'flowers' || B.kind === 'reeds';
      im.castShadow = !small; im.receiveShadow = true;
      scene.add(im);
    }
  }

  /* --- route arrows on the ground --- */
  function arrowSet(n, size) {
    const s = new T.Shape(); s.moveTo(0.5, 0); s.lineTo(-0.35, -0.42); s.lineTo(-0.12, 0); s.lineTo(-0.35, 0.42); s.closePath();
    const geo = new T.ShapeGeometry(s); geo.rotateX(-Math.PI / 2); geo.scale(size, 1, size);
    const mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6 });
    const mesh = new T.InstancedMesh(geo, mat, n); mesh.setColorAt(0, new T.Color(1, 1, 1)); mesh.count = 0; mesh.renderOrder = 3; mesh.frustumCulled = false;
    return { mesh, n, key: '' };
  }
  function xSet(n) {
    const b = new M.Builder(1); b.add(new T.BoxGeometry(0.42, 0.02, 0.09), '#ffffff', { ry: 0.785, jit: 0 }); b.add(new T.BoxGeometry(0.42, 0.02, 0.09), '#ffffff', { ry: -0.785, jit: 0 });
    const mat = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
    const mesh = new T.InstancedMesh(b.build(), mat, n); mesh.setColorAt(0, new T.Color(1, 1, 1)); mesh.count = 0; mesh.renderOrder = 3; mesh.frustumCulled = false;
    return { mesh, n, key: '' };
  }
  function setArrows(set, pts, colors, xs) {
    // pts: [[x,y,ang]] tile coords; colors: [hex]
    const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(1, 1, 1), p = new T.Vector3(), c = new T.Color(); const up = new T.Vector3(0, 1, 0);
    const n = Math.min(set.n, pts.length);
    for (let i = 0; i < n; i++) {
      const [x, y, a] = pts[i]; const wx = x + 0.5, wz = y + 0.5;
      p.set(wx, MAP.hAt(wx, wz) + 0.05, wz); q.setFromAxisAngle(up, -a); m.compose(p, q, s);
      set.mesh.setMatrixAt(i, m); c.set(colors[i]); set.mesh.setColorAt(i, c);
    }
    set.mesh.count = n; set.mesh.instanceMatrix.needsUpdate = true; if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
  }

  /* ================= sprites: characters as painted cut-outs standing in the 3D world ================= */
  // Every hero, monster, minion and villain can be a flat sprite that always faces the camera (the "HD-2D" look).
  // Painted art dropped into art/ is used when there is some; until then each sprite is a picture of the 3D model,
  // rendered once from a three-quarter view the first time it's needed. Single pictures face right and flip to face
  // left. Directional art (a strip of 8 frames: S, SE, E, NE, N, NW, W, SW) shows the frame for the way the character
  // faces relative to the camera. Pixel art keeps hard pixel edges when it's drawn larger than it was made.
  const SPR = { on: true, tex: new Map(), art: new Map(), list: new Set(), geo: new Map(), rt: null, scene: null, cam: null, shadow: null };
  const SPR_W = 192, SPR_H = 256, SPR_LIGHT = 0.62;
  function spriteRig() {
    if (SPR.rt) return;
    SPR.rt = new T.WebGLRenderTarget(SPR_W, SPR_H, { encoding: T.sRGBEncoding });
    SPR.scene = new T.Scene();
    SPR.scene.add(new T.HemisphereLight(0x9cb2cc, 0x30261c, 0.62 * SPR_LIGHT));
    const sun = new T.DirectionalLight(0xffdcb0, 1.9 * SPR_LIGHT); sun.position.set(-3, 6, 5); SPR.scene.add(sun);
    const rim = new T.DirectionalLight(0x9ab8ff, 0.5 * SPR_LIGHT); rim.position.set(4, 3, -4); SPR.scene.add(rim);
    SPR.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    const sh = M.radialTex([[0, 'rgba(0,0,0,0.5)'], [0.55, 'rgba(0,0,0,0.28)'], [1, 'rgba(0,0,0,0)']]);
    SPR.shadow = { geo: new T.PlaneGeometry(1, 1), mat: new T.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false, toneMapped: false }) };
  }
  // trims a canvas to what's drawn on it; returns the box in pixels
  function alphaBox(cv) {
    const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  // a picture of the 3D model: three-quarter view from the front left, so it faces right
  function prerender(key) {
    spriteRig();
    const model = M.make(key, { noLights: true }); SPR.scene.add(model); model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model); const size = box.getSize(new T.Vector3()); const ctr = box.getCenter(new T.Vector3());
    const az = -0.95, el = 0.42; const dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const hh = Math.max(size.y * 0.62, Math.max(size.x, size.z) * 0.62 * SPR_H / SPR_W, 0.05) * 1.08;
    const cam = SPR.cam; cam.top = hh; cam.bottom = -hh; cam.left = -hh * SPR_W / SPR_H; cam.right = hh * SPR_W / SPR_H; cam.updateProjectionMatrix();
    cam.position.copy(ctr).addScaledVector(dir, 10); cam.lookAt(ctr); cam.updateMatrixWorld();
    const prevRT = renderer.getRenderTarget(); const prevCC = renderer.getClearColor(new T.Color()); const prevCA = renderer.getClearAlpha(); const prevSh = renderer.shadowMap.enabled;
    renderer.shadowMap.enabled = false; renderer.setRenderTarget(SPR.rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(SPR.scene, cam);
    const px = new Uint8Array(SPR_W * SPR_H * 4); renderer.readRenderTargetPixels(SPR.rt, 0, 0, SPR_W, SPR_H, px);
    renderer.setRenderTarget(prevRT); renderer.setClearColor(prevCC, prevCA); renderer.shadowMap.enabled = prevSh;
    SPR.scene.remove(model);
    const cv = document.createElement('canvas'); cv.width = SPR_W; cv.height = SPR_H; const c = cv.getContext('2d', { willReadFrequently: true }); const im = c.createImageData(SPR_W, SPR_H);
    for (let y = 0; y < SPR_H; y++) im.data.set(px.subarray((SPR_H - 1 - y) * SPR_W * 4, (SPR_H - y) * SPR_W * 4), y * SPR_W * 4);
    c.putImageData(im, 0, 0);
    // where the model's feet landed in the picture
    const foot = new T.Vector3(0, 0, 0).project(cam); const fx = (foot.x + 1) / 2 * SPR_W, fy = (1 - foot.y) / 2 * SPR_H;
    const upp = 2 * hh / SPR_H;
    return cutSprite(cv, upp, fx, fy, false);
  }
  // painted art: feet at the bottom middle, as tall as the model it stands in for
  function fromArt(key, a) {
    const img = a.img; if (a.dirs > 1) return fromStrip(key, img, a.dirs, a.pixel);
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth || img.width; cv.height = img.naturalHeight || img.height; cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
    const bx = alphaBox(cv); if (!bx) return null;
    const bp = M.blueprint(key); const hWorld = (bp && bp.h ? bp.h : 0.6) * 1.12;
    const upp = hWorld / bx.h;
    const r = cutSprite(cv, upp, bx.x + bx.w / 2, bx.y + bx.h, true);
    if (a.pixel) pixelTex(r.tex);
    return r;
  }
  function pixelTex(tex) { tex.magFilter = T.NearestFilter; tex.anisotropy = 1; tex.needsUpdate = true; }
  // a strip of n frames, one per direction. Every frame is cut to the same box, centred on the frame, so the feet
  // stay in one place as the character turns.
  function fromStrip(key, img, n, pixel) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height, fw = Math.floor(W / n); if (!fw) return null;
    const src = document.createElement('canvas'); src.width = W; src.height = H; const sc = src.getContext('2d', { willReadFrequently: true }); sc.drawImage(img, 0, 0);
    const d = sc.getImageData(0, 0, W, H).data; let x0 = fw, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < fw * n; x++) if (d[(y * W + x) * 4 + 3] > 8) { const lx = x % fw; if (lx < x0) x0 = lx; if (lx > x1) x1 = lx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const cx = Math.floor(fw / 2); const half = Math.min(cx, Math.max(cx - x0, x1 + 1 - cx) + 1);
    const bw = half * 2, fy0 = Math.max(0, y0 - 1), bh = y1 + 1 - fy0, fx0 = cx - half;
    const G = 2; // a clear gutter between frames, so neighbouring frames never bleed in
    const pot = v => { let p = 1; while (p < v) p *= 2; return p; }; // power-of-two sizes: no resizing (and blurring) on upload
    const out = document.createElement('canvas'); out.width = pot((bw + G * 2) * n); out.height = pot(bh + G * 2); const oc = out.getContext('2d'); oc.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) oc.drawImage(src, i * fw + fx0, fy0, bw, bh, i * (bw + G * 2) + G, G, bw, bh);
    const tex = new T.CanvasTexture(out); tex.encoding = T.sRGBEncoding; if (pixel) pixelTex(tex); else tex.anisotropy = 2;
    const bp = M.blueprint(key); const upp = (bp && bp.h ? bp.h : 0.6) * 1.12 / (y1 + 1 - y0);
    const w = bw * upp, h = bh * upp;
    return { tex, w, h, left: -w / 2, bottom: 0, painted: true, top: h, dirs: n, cell: (bw + G * 2) / out.width, inset: G / out.width, frame: bw / out.width, v0: 1 - (G + bh) / out.height, v1: 1 - G / out.height };
  }
  // crops to the drawing and works out the quad's size and where its feet are, in world units
  function cutSprite(cv, upp, fx, fy, painted) {
    const bx = alphaBox(cv) || { x: 0, y: 0, w: cv.width, h: cv.height };
    const pad = 2; const x0 = Math.max(0, bx.x - pad), y0 = Math.max(0, bx.y - pad), x1 = Math.min(cv.width, bx.x + bx.w + pad), y1 = Math.min(cv.height, Math.max(bx.y + bx.h, Math.ceil(fy)) + pad);
    const out = document.createElement('canvas'); out.width = x1 - x0; out.height = y1 - y0; out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    const tex = new T.CanvasTexture(out); tex.encoding = T.sRGBEncoding; tex.anisotropy = 2;
    const w = out.width * upp, h = out.height * upp;
    // quad from (left, bottom) with the feet at the origin
    const left = -(fx - x0) * upp, bottom = -(y1 - fy) * upp;
    return { tex, w, h, left, bottom, painted, top: h + bottom };
  }
  function spriteTex(key) {
    if (SPR.tex.has(key)) return SPR.tex.get(key);
    let rec = null; const art = SPR.art.get(key);
    if (art) rec = fromArt(key, art);
    if (!rec) rec = prerender(key);
    SPR.tex.set(key, rec); return rec;
  }
  function spriteGeo(key, r, dir) {
    const ck = r.dirs ? key + '#' + (dir || 0) : key;
    let g = SPR.geo.get(ck); if (g) return g;
    g = new T.PlaneGeometry(r.w, r.h); g.translate(r.left + r.w / 2, r.bottom + r.h / 2, 0);
    if (r.dirs) {
      // point this quad at one frame of the strip
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) { uv.setX(i, (dir || 0) * r.cell + r.inset + uv.getX(i) * r.frame); uv.setY(i, r.v0 + uv.getY(i) * (r.v1 - r.v0)); }
      uv.needsUpdate = true;
    }
    SPR.geo.set(ck, g); return g;
  }
  // a character: a sprite, or the 3D model when sprites are off
  function figure(key, opts) {
    opts = opts || {};
    if (!SPR.on || !renderer) return M.make(key, opts);
    const r = spriteTex(key);
    const g = new T.Group();
    const mat = new T.MeshBasicMaterial({ map: r.tex, transparent: true, alphaTest: 0.1, depthWrite: true, side: T.DoubleSide, toneMapped: !r.painted });
    if (!r.painted) mat.color.setScalar(1 / SPR_LIGHT * 0.94);
    const q = new T.Mesh(spriteGeo(key, r, 0), mat); q.renderOrder = 1;
    if (r.dirs) q.userData = { key, rec: r, dir: 0, dirs: r.dirs };
    g.add(q); SPR.list.add(q);
    const sh = new T.Mesh(SPR.shadow.geo, SPR.shadow.mat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.set(Math.max(0.2, r.w * 0.85), Math.max(0.12, r.w * 0.42), 1); sh.renderOrder = 0; g.add(sh);
    g.userData = { sprite: true, quad: q, mat, shadow: sh, top: r.top, base: mat.color.clone() };
    return g;
  }
  // every frame: turn the sprites to the camera, flip the ones facing left, and tip over the fallen
  const _cq = new T.Quaternion(), _pq = new T.Quaternion(), _rq = new T.Quaternion(), _f = new T.Vector3(), _r = new T.Vector3(), _cf = new T.Vector3(), _bk = new T.Vector3(), _Z = new T.Vector3(0, 0, 1);
  const angDiff = (a, b) => Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  function faceSprites(camera) {
    if (!SPR.list.size) return;
    camera.getWorldQuaternion(_cq); _r.set(1, 0, 0).applyQuaternion(_cq); _cf.set(0, 0, -1).applyQuaternion(_cq);
    for (const q of SPR.list) {
      const g = q.parent; let top = g; while (top && top.parent) top = top.parent;
      if (!g || !top || !top.isScene) { if (!g || !g.parent) SPR.list.delete(q); continue; }
      if (!g.visible) continue;
      g.getWorldQuaternion(_pq);
      _f.set(0, 0, 1).applyQuaternion(_pq);
      const d = _f.x * _r.x + _f.z * _r.z; const ud = q.userData;
      if (ud.still) {
        _pq.invert();
        if (ud.anchor) { _bk.set(-_cf.x, 0, -_cf.z).normalize().applyQuaternion(_pq); q.position.set(_bk.x * ud.anchor, 0, _bk.z * ud.anchor); }
        q.quaternion.copy(_pq).multiply(_cq); continue;
      }
      if (ud.dirs) {
        // which way it faces as seen from the camera: 0 = towards us (south), a quarter turn to the right = east
        const step = Math.PI * 2 / ud.dirs; const a = Math.atan2(d, -(_f.x * _cf.x + _f.z * _cf.z));
        let i = ((Math.round(a / step) % ud.dirs) + ud.dirs) % ud.dirs;
        if (i !== ud.dir && angDiff(a, ud.dir * step) < step / 2 + 0.12) i = ud.dir; // a little stickiness, so it doesn't flicker
        if (i !== ud.dir) { ud.dir = i; q.geometry = spriteGeo(ud.key, ud.rec, i); }
        _rq.setFromAxisAngle(_Z, -g.rotation.z);
        q.quaternion.copy(_pq.invert()).multiply(_cq).multiply(_rq);
        q.scale.x = 1; continue;
      }
      if (ud.flip === undefined) ud.flip = d < 0 ? -1 : 1; else if (d < -0.12) ud.flip = -1; else if (d > 0.12) ud.flip = 1;
      _rq.setFromAxisAngle(_Z, -g.rotation.z * ud.flip);
      q.quaternion.copy(_pq.invert()).multiply(_cq).multiply(_rq);
      q.scale.x = ud.flip;
    }
  }
  // A map building or object: a pixel-art cut-out standing where the 3D model would, when art/ has a picture for
  // it ('obj-<key>'); otherwise the 3D model. The picture is sized to the model's footprint.
  const PROP_DIMS = new Map();
  function propDims(key) {
    let d = PROP_DIMS.get(key); if (d) return d;
    const m = M.make(key); const sz = new T.Box3().setFromObject(m).getSize(new T.Vector3());
    d = { w: Math.max(sz.x, sz.z, 0.3), h: Math.max(sz.y, 0.15) }; PROP_DIMS.set(key, d); return d;
  }
  function propTex(key) {
    const ak = 'obj-' + key; if (SPR.tex.has(ak)) return SPR.tex.get(ak);
    const a = SPR.art.get(ak); if (!a) return null;
    const img = a.img; const cv = document.createElement('canvas'); cv.width = img.naturalWidth || img.width; cv.height = img.naturalHeight || img.height;
    cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
    const bx = alphaBox(cv); if (!bx) return null;
    const pot = v => { let p = 1; while (p < v) p *= 2; return p; };
    const G2 = 2; const out = document.createElement('canvas'); out.width = pot(bx.w + G2 * 2); out.height = pot(bx.h + G2 * 2);
    const oc = out.getContext('2d'); oc.imageSmoothingEnabled = false; oc.drawImage(cv, bx.x, bx.y, bx.w, bx.h, G2, G2, bx.w, bx.h);
    const tex = new T.CanvasTexture(out); tex.encoding = T.sRGBEncoding; pixelTex(tex);
    const rec = { tex, pw: bx.w, ph: bx.h, u0: G2 / out.width, u1: (G2 + bx.w) / out.width, v0: 1 - (G2 + bx.h) / out.height, v1: 1 - G2 / out.height };
    SPR.tex.set(ak, rec); return rec;
  }
  const PROP_FIT = 1.0; // picture width : the model's footprint
  // model: the 3D model to fall back on, and whose footprint sets the size (e.g. 'tower' for 'tower-lich')
  function prop(key, opts, model) {
    model = model || key;
    if (!SPR.on || !renderer || !SPR.art.has('obj-' + key)) return M.make(model, opts);
    const r = propTex(key); if (!r) return M.make(model, opts);
    const d = propDims(model);
    const k = Math.min(d.w * PROP_FIT / r.pw, Math.max(d.h * 2.4, d.w * 1.2) / r.ph); // world units per pixel
    const w = r.pw * k, h = r.ph * k;
    const geo = new T.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, r.u0 + uv.getX(i) * (r.u1 - r.u0)); uv.setY(i, r.v0 + uv.getY(i) * (r.v1 - r.v0)); } uv.needsUpdate = true;
    // drawn under the characters (no depth writes, an earlier render order), so heroes in town stay in view;
    // trees and hills in front still hide it
    const mat = new T.MeshBasicMaterial({ map: r.tex, transparent: true, alphaTest: 0.1, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    // a picture drawn from above shows the ground in its lower part: stand it at the near edge of the footprint
    const q = new T.Mesh(geo, mat); q.renderOrder = 0.5; q.userData = { still: true, anchor: d.w * 0.45 }; // after ground rings (0), before characters (1)
    const g = new T.Group(); g.add(q); SPR.list.add(q);
    spriteRig(); const sh = new T.Mesh(SPR.shadow.geo, SPR.shadow.mat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.set(w * 0.9, w * 0.45, 1); g.add(sh);
    g.userData = { sprite: true, prop: true, quad: q, mat, shadow: sh, top: h };
    return g;
  }

  /* --- construction: a lair rises out of its scaffolding, bottom first, while its builders work --- */
  // tiny pixel textures, drawn once: a wooden scaffold, a dust puff, a spark
  const FXT = {};
  function pxCanvas(w, h, draw) {
    const pot = v => { let p = 1; while (p < v) p *= 2; return p; };
    const cv = document.createElement('canvas'); cv.width = pot(w); cv.height = pot(h);
    const c = cv.getContext('2d'); const px = (x, y, col, ww, hh) => { c.fillStyle = col; c.fillRect(x, y, ww || 1, hh || 1); };
    draw(px, c);
    const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; pixelTex(tex);
    return { tex, pw: w, ph: h, u0: 0, u1: w / cv.width, v0: 1 - h / cv.height, v1: 1 };
  }
  function scaffoldTex() {
    if (FXT.scaf) return FXT.scaf;
    const W = 104, H = 52; const poles = [2, 34, 67, 99];
    FXT.scaf = pxCanvas(W, H, px => {
      const line = (x0, y0, x1, y1, col) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); px(x, y, col, 2, 2); } };
      // cross braces behind the planks
      for (let k = 0; k < 3; k++) { const a = poles[k] + 3, b = poles[k + 1] - 1; if (k % 2) { line(a, 8, b, 27, '#6a4422'); line(a, 32, b, 50, '#6a4422'); } else { line(a, 27, b, 8, '#6a4422'); line(a, 50, b, 32, '#6a4422'); } }
      // the poles
      for (const x of poles) { px(x, 0, '#5a3a1e', 3, H); px(x, 0, '#8a5a30', 1, H); px(x, 0, '#a8743e', 3, 1); }
      // two walkways of planks, with a lashing of rope where they cross a pole
      for (const y of [4, 28]) { px(0, y, '#d09a58', W, 1); px(0, y + 1, '#b07a40', W, 2); px(0, y + 3, '#7a4e26', W, 1); for (let x = 9; x < W; x += 13) px(x, y + 1, '#8a5a30', 1, 2); for (const x of poles) { px(x, y - 1, '#d8c890', 3, 1); px(x, y + 4, '#d8c890', 3, 1); } }
      // a bucket and a few bricks up top
      px(48, 0, '#3a3a44', 6, 4); px(49, 1, '#6a6a78', 4, 1); px(78, 1, '#a04a3a', 7, 3); px(79, 1, '#c86a52', 5, 1);
    });
    return FXT.scaf;
  }
  function puffTex() {
    return FXT.puff || (FXT.puff = pxCanvas(16, 16, px => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 6.2) continue; px(x, y, d > 5 ? '#a8957a' : y > 9 ? '#c8b494' : '#e6d6b8'); }
    }));
  }
  function sparkTex() {
    return FXT.spark || (FXT.spark = pxCanvas(8, 8, px => { px(1, 1, '#ffffff66', 5, 5); px(3, 0, '#fff', 1, 7); px(0, 3, '#fff', 7, 1); }));
  }
  // 0.31: a minion's tool, a little pickaxe-hammer swung while it works
  function toolTex() {
    return FXT.tool || (FXT.tool = pxCanvas(16, 16, px => {
      for (let i = 0; i < 11; i++) { px(2 + i, 13 - i, '#8a5a30', 2, 2); px(3 + i, 13 - i, '#b07a40', 1, 1); }   // the handle, corner to corner
      px(9, 1, '#5a5a66', 7, 3); px(10, 1, '#9a9aa8', 5, 1); px(12, 4, '#5a5a66', 3, 3); px(15, 0, '#c8c8d4', 1, 2);   // the head
    }));
  }
  const fxHash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  // a handful of sprites that live and die on their own clock: no bookkeeping, nothing to clean up
  function workFx(nPuff, nSpark, sparkCol) {
    const g = new T.Group(); const puffs = [], sparks = [];
    for (let i = 0; i < nPuff; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: puffTex().tex, transparent: true, depthWrite: false, toneMapped: false })); sp.renderOrder = 0.5; sp.visible = false; g.add(sp); puffs.push(sp); }
    for (let i = 0; i < nSpark; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: sparkTex().tex, color: new T.Color(sparkCol || '#ffd27a'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.renderOrder = 0.5; sp.visible = false; g.add(sp); sparks.push(sp); }
    g.userData = { puffs, sparks, seed: Math.random() * 100 };
    return g;
  }
  // work: 0 (nobody there) to 1 (a crew hard at it); y: where the work is happening; w: how wide; rise: how high things float
  function runFx(fx, t, work, y, w, rise) {
    const U = fx.userData; rise = rise || 1;
    U.puffs.forEach((sp, i) => {
      const P = 1.5, ph = t / P + i / U.puffs.length + U.seed, a = ph % 1, c = Math.floor(ph);
      const on = work > 0 && fxHash(c, i + U.seed) < 0.35 + 0.6 * work; sp.visible = on; if (!on) return;
      const x = (fxHash(c + 7, i) - 0.5) * w * 0.8, sz = (0.1 + 0.16 * a) * (0.8 + 0.4 * fxHash(c, i + 3));
      sp.position.set(x + (fxHash(c, i + 9) - 0.5) * 0.12 * a, y + a * 0.3 * rise, 0.04); sp.scale.set(sz, sz, 1);
      sp.material.opacity = (a < 0.12 ? a / 0.12 : 1 - (a - 0.12) / 0.88) * 0.7;
    });
    U.sparks.forEach((sp, i) => {
      const P = 0.55, ph = t / P + i * 0.37 + U.seed, a = ph % 1, c = Math.floor(ph);
      const on = work > 0 && a < 0.35 && fxHash(c, i + 21) < 0.25 + 0.6 * work; sp.visible = on; if (!on) return;
      const sz = 0.05 + 0.05 * (1 - a / 0.35); sp.scale.set(sz, sz, 1);
      sp.position.set((fxHash(c + 3, i + 5) - 0.5) * w * 0.7, y + (fxHash(c, i + 8) - 0.3) * 0.12 + a * 0.15 * rise, 0.06);
      sp.material.opacity = 1 - a / 0.35;
    });
  }
  // a lair being built: the finished picture, shown only as high as it's got; a faint blueprint of the rest;
  // scaffolding around the part going up; dust and sparks while the builders are there
  function makeSite(o) {
    const art = SPR.on && renderer && SPR.art.has('obj-' + o.dtype) ? propTex(o.dtype) : null;
    if (!art) { const g = prop('building'); const fx = workFx(6, 4); g.add(fx); g.userData.fx = fx; return g; }
    const g = prop(o.dtype); const u = g.userData; const q = u.quad; const h = u.top; const w = q.geometry.parameters.width; const A = q.userData.anchor;
    // the plan of the rest: a pale blue glow in the lair's shape
    const gm = new T.MeshBasicMaterial({ map: art.tex, transparent: true, opacity: 0.5, color: new T.Color('#86b4f0'), alphaTest: 0.04, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const gq = new T.Mesh(q.geometry.clone(), gm); gq.renderOrder = 0.5; gq.userData = { still: true, anchor: A - 0.02 }; g.add(gq); SPR.list.add(gq);
    const st = scaffoldTex(); const k = w / art.pw; const sw = st.pw * k, sh = st.ph * k;
    const sg = new T.PlaneGeometry(sw, sh); sg.translate(0, sh / 2, 0);
    const suv = sg.attributes.uv; for (let i = 0; i < suv.count; i++) { suv.setX(i, st.u0 + suv.getX(i) * (st.u1 - st.u0)); suv.setY(i, st.v0 + suv.getY(i) * (st.v1 - st.v0)); }
    const sq = new T.Mesh(sg, new T.MeshBasicMaterial({ map: st.tex, transparent: true, alphaTest: 0.1, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    sq.renderOrder = 0.5; sq.userData = { still: true, anchor: A + 0.03 }; g.add(sq); SPR.list.add(sq);
    const fx = workFx(7, 5); g.add(fx);
    Object.assign(u, { rise: { h, w, sh, v0: art.v0, v1: art.v1, p: -1 }, ghost: gq, scaf: sq, fx });
    return g;
  }
  // move the cut: the lair up to p, the blueprint above it, the scaffold riding the edge
  function setRise(u, p) {
    const R = u.rise; if (Math.abs(R.p - p) < 0.002) return; R.p = p;
    const cut = R.h * p, vc = R.v0 + (R.v1 - R.v0) * p;
    // a 1x1 plane: vertices 0 and 1 are the top edge, 2 and 3 the bottom
    const edit = (geo, top, y, v) => { const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < 4; i++) if ((i < 2) === top) { pos.setY(i, y); uv.setY(i, v); } pos.needsUpdate = true; uv.needsUpdate = true; geo.computeBoundingSphere(); };
    edit(u.quad.geometry, true, cut, vc); edit(u.ghost.geometry, false, cut, vc);
    const y0 = Math.max(0, Math.min(R.h - R.sh * 0.6, cut - R.sh * 0.7)); const sp = u.scaf.geometry.attributes.position;
    for (let i = 0; i < 4; i++) sp.setY(i, i < 2 ? y0 + R.sh : y0);
    sp.needsUpdate = true; u.scaf.geometry.computeBoundingSphere();
  }
  // the fx ride on the front of the picture
  function fxOnQuad(fx, q) { fx.position.copy(q.position); fx.quaternion.copy(q.quaternion); }
  function setSprites(on) { on = !!on; if (on === SPR.on) return; SPR.on = on; refreshFigures(); }
  // painted art arrives: use it from now on
  function setArt(key, img, meta) {
    SPR.art.set(key, Object.assign({ img }, meta || {})); const r = SPR.tex.get(key); if (r && r.tex) r.tex.dispose(); SPR.tex.delete(key);
    for (const k of [...SPR.geo.keys()]) if (k === key || k.indexOf(key + '#') === 0) SPR.geo.delete(k);
  }
  // throw away every character figure; they're rebuilt on the next frame
  function refreshFigures() {
    if (MAP.scene) {
      for (const [id, E] of MAP.objs) { MAP.scene.remove(E.grp); MAP.objs.delete(id); }
      if (MAP.nodes) { for (const E of MAP.nodes.values()) MAP.scene.remove(E.grp); MAP.nodes = new Map(); }
      if (MAP.sites && MAP.hAt && hooks.state()) placeSites(MAP.scene, hooks.state());
      for (const E of MAP.mins.values()) MAP.scene.remove(E.grp); MAP.mins = new Map();
      if (MAP.party) MAP.party.userData.sig = null;
      if (MAP.villain) { MAP.scene.remove(MAP.villain); MAP.villain = null; }
      if (MAP.tw) { for (const k of ['sum', 'lib']) if (MAP.tw[k]) MAP.scene.remove(MAP.tw[k].g || MAP.tw[k]); MAP.tw = {}; }
    }
    if (BAT.scene) { for (const E of BAT.units.values()) BAT.scene.remove(E); BAT.units = new Map(); }
    if (TWN.scene) { for (const E of TWN.items.values()) TWN.scene.remove(E.g); for (const E of TWN.figs.values()) TWN.scene.remove(E.g); TWN.items = new Map(); TWN.figs = new Map(); }
    SPR.list.clear();
  }

  /* --- party, stacks, villain, objects --- */
  // the four heroes walking together; rebuilt whenever someone new joins the party
  const PARTY_SPOTS = [[-0.17, 0.14], [0.17, 0.14], [-0.18, -0.15], [0.16, -0.16]];
  function partyFigures(g, heroesList) {
    if (g.userData.figs) for (const f of g.userData.figs) g.remove(f);
    const heroes = {}; const figs = [];
    heroesList.forEach((hero, i) => {
      const key = M.defineHero(hero); const sp = PARTY_SPOTS[i % 4];
      const h = figure(key, { lightScale: 0.8 }); h.position.set(sp[0], 0, sp[1]); h.scale.setScalar(0.82); g.add(h); heroes[hero.id] = h; figs.push(h);
    });
    g.userData.heroes = heroes; g.userData.figs = figs; g.userData.sig = heroesList.map(h => h.id).join();
  }
  function makeParty() {
    const g = new T.Group();
    const ring = M.circleMesh('#ffcf5a', 1.0, 0.7); ring.position.y = 0.03; g.add(ring); g.userData.ring = ring;
    const glow = M.glowSprite('#ffd87a', 0.9, 0.22); glow.position.y = 0.25; g.add(glow);
    const S0 = hooks.state(); partyFigures(g, S0 ? S0.heroes : []);
    const heroes = g.userData.heroes;
    // banner
    const b = new M.Builder(9); b.seg([0, 0, 0], [0, 0.95, 0], 0.012, 0.012, '#5a3a1a'); b.add(new T.ConeGeometry(0.025, 0.06, 5), '#e8c050', { y: 0.98 });
    const pole = new T.Mesh(b.build(), M.MAT.body); pole.position.set(0.02, 0, -0.32); pole.castShadow = true; g.add(pole);
    const flagG = new T.PlaneGeometry(0.3, 0.2, 6, 1); flagG.translate(0.15, 0, 0);
    const flag = new T.Mesh(flagG, new T.MeshStandardMaterial({ color: new T.Color('#c8302a').convertSRGBToLinear(), side: T.DoubleSide, roughness: 0.8 }));
    flag.position.set(0.02, 0.84, -0.32); g.add(flag); g.userData.flag = flag; g.userData.flagBase = flagG.attributes.position.array.slice();
    g.userData.heroes = heroes;
    return g;
  }
  function stackFigs(type, count) { const big = ['ogre', 'troll', 'giant', 'dragon', 'wraith'].indexOf(type) >= 0; if (type === 'dragon' || type === 'giant') return 1; if (big) return count >= 3 ? 2 : 1; return count < 5 ? 1 : count < 15 ? 2 : 3; }
  const FIG_POS = [[[0, 0]], [[-0.15, 0.06], [0.16, -0.06]], [[0, 0.16], [-0.19, -0.1], [0.19, -0.1]]];
  function makeStack(o) {
    const g = new T.Group(); const n = stackFigs(o.type, o.count);
    const ring = M.circleMesh('#ff5a3a', 0.95, 0.75); ring.position.y = 0.03; g.add(ring); g.userData.ring = ring;
    const figs = [];
    for (const [x, z] of FIG_POS[n - 1]) { const f = figure('unit-' + o.type); f.position.set(x, 0, z); f.scale.setScalar(n === 1 ? 1 : 0.86); f.rotation.y = (x - z) * 0.4; g.add(f); figs.push(f); }
    g.userData.figs = figs; g.userData.float = o.type === 'wraith' || o.type === 'dragon';
    return g;
  }
  function makeVillain() {
    const g = new T.Group();
    const ring = M.circleMesh('#b25aff', 1.15, 0.95); ring.position.y = 0.03; g.add(ring); g.userData.ring = ring;
    const S0 = hooks.state(); const icon = S0 && S0.villain && G3.BOSS_TYPES[S0.villain.type] ? G3.BOSS_TYPES[S0.villain.type].icon : 'king';
    const k = figure('unit-' + icon); if (icon === 'wyrm') { k.scale.setScalar(0.75); g.userData.float = true; } else if (icon === 'archfiend') k.scale.setScalar(0.8); g.add(k); g.userData.king = k;
    const aura = M.glowSprite('#9a40ff', 1.6, 0.45); aura.position.y = 0.4; g.add(aura); g.userData.aura = aura;
    return g;
  }
  function makeObj(o, variant) {
    if (o.kind === 'stack') return makeStack(o);
    if (o.kind === 'dungeon') {
      const g = variant === 'b' ? makeSite(o) : prop(variant === 'w' ? 'wrecked' : o.dtype); const ring = M.circleMesh(o.mine ? '#c04aff' : '#ff6a3a', 1.35, 0.35); ring.position.y = 0.03; if (g.userData.prop) ring.renderOrder = 0; g.add(ring); g.userData.ring = ring;
      if ((o.level || 1) >= 2 && !g.userData.sprite) { const b = new M.Builder(4); for (const [x, z] of [[-0.42, -0.35], [0.45, -0.3]]) { b.seg([x, 0, z], [x, 0.62, z], 0.012, 0.012, '#3a2a1a'); b.add(new T.BoxGeometry(0.14, 0.18, 0.005), '#8a1a1a', { x: x + 0.075, y: 0.52, z }); b.add(new T.ConeGeometry(0.02, 0.05, 4), '#d8b040', { x, y: 0.64, z }); } const m = new T.Mesh(b.build(), M.MAT.body); m.castShadow = true; g.add(m); }
      return g;
    }
    const g = prop(o.kind);
    if (G.ITEMS[o.kind] && G.ITEMS[o.kind].cat === 'trap') { const ring = M.circleMesh('#ff3a2a', 0.8, 0.55); ring.position.y = 0.03; if (g.userData.prop) ring.renderOrder = 0; g.add(ring); g.userData.ring = ring; g.userData.trap = true; }
    if (o.kind === 'artifact') g.userData.spin = g.userData.glow;
    return g;
  }
  const objKey = o => o.kind === 'stack' ? 'st:' + o.type + ':' + stackFigs(o.type, o.count) : o.kind === 'dungeon' ? 'lr:' + o.dtype + ':' + (o.level || 1) : 'it:' + o.kind;

  /* --- per-frame map update --- */
  const spec = { tiles: null, sight: null, ghost: null, path: null, pathColor: '#9cc4ff', pathColors: null, sel: null, minSel: null, minHover: null };
  function setMapSpec(s) { Object.assign(spec, s); }
  function updateMap(t, dt) {
    const S = hooks.state(); if (!S || !MAP.scene) return;
    const U = MAP.U; U.uTime.value = t;
    const hAt = MAP.hAt;
    // camera
    const C = MAP.cam;
    if (C.goal) { const k = 1 - Math.exp(-dt * 6); C.tx += (C.goal.x - C.tx) * k; C.tz += (C.goal.z - C.tz) * k; if (Math.hypot(C.goal.x - C.tx, C.goal.z - C.tz) < 0.01) C.goal = null; }
    if (C.dGoal) { const k = 1 - Math.exp(-dt * 5); C.d += (C.dGoal - C.d) * k; if (Math.abs(C.dGoal - C.d) < 0.02) { C.d = C.dGoal; C.dGoal = null; } }
    applyCam();
    followShadow(MAP.lights, C.tx, C.tz - 1, Math.max(12, C.d * 0.95));
    MAP.scene.fog.near = C.d * 1.25; MAP.scene.fog.far = C.d * 3.6;
    // fog of war texture
    const FG = hooks.fog ? hooks.fog() : null;
    if (FG) { if (FG !== MAP.fogKey) { MAP.fogKey = FG; const d = MAP.fogData; for (let i = 0; i < FG.vis.length; i++) { d[i * 4] = FG.vis[i] ? 255 : 0; d[i * 4 + 1] = FG.seen[i] ? 255 : 0; d[i * 4 + 3] = 255; } MAP.fogTex.needsUpdate = true; } }
    else { let ec = 0; for (let i = 0; i < S.explored.length; i++) ec += S.explored[i]; if (ec !== MAP.fogKey) { MAP.fogKey = ec; const d = MAP.fogData; for (let i = 0; i < S.explored.length; i++) { const v = S.explored[i] ? 255 : 0; d[i * 4] = v; d[i * 4 + 1] = 255; d[i * 4 + 3] = 255; } MAP.fogTex.needsUpdate = true; } }
    // overlay texture
    const od = MAP.ovData; od.fill(0);
    if (spec.tiles) for (const [i, c] of spec.tiles) { const o = i * 4; od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2]; od[o + 3] = Math.round(clamp(c[3], 0, 1) * 127) + (c[4] ? 128 : 0); }
    MAP.ovTex.needsUpdate = true;
    if (spec.sight) U.uSight.value.set(spec.sight.x, spec.sight.z, spec.sight.r, 1); else U.uSight.value.w = 0;
    // sites
    const town = MAP.sites.town; if (town && town.userData.mill) town.userData.mill.rotation.z = t * 0.8;
    const tw = MAP.sites.tower; if (tw && tw.userData.circle) { tw.userData.circle.rotation.z = t * 0.15; tw.userData.circle.material.opacity = 0.35 + 0.15 * Math.sin(t * 1.3); }
    syncCitadel(S);
    syncFlags(S, t);
    syncTowerWork(S, t);
    // objects
    const seen = new Set();
    for (const o of S.objects) {
      seen.add(o.id);
      const variant = o.kind === 'dungeon' && o.mine ? ((hooks.lairBuilding ? hooks.lairBuilding(o) : o.building) ? 'b' : G.lairWrecked(S, o) ? 'w' : '') : '';
      let E = MAP.objs.get(o.id); const key = objKey(o) + variant;
      if (!E || E.key !== key) { const was = E && E.key; if (E) { MAP.scene.remove(E.grp); } const grp = makeObj(o, variant); MAP.scene.add(grp); E = { grp, key, rot: null }; MAP.objs.set(o.id, E); if (was && was.slice(-1) === 'b' && variant !== 'b') E.pop = t; }
      const ap = hooks.animPos(o.id); const x = ap ? ap.x : o.x, y = ap ? ap.y : o.y;
      const wx = x + 0.5, wz = y + 0.5; E.grp.position.set(wx, hAt(wx, wz), wz);
      const shown = hooks.seeObj ? hooks.seeObj(o) : true; E.grp.visible = shown; if (!shown) continue;
      const u = E.grp.userData;
      if (u.ring) { u.ring.rotation.z = t * 0.3 * (o.kind === 'stack' ? 1 : 0.4); }
      if (o.kind === 'stack') {
        const P = hooks.partyPos(); const want = Math.atan2(P.x - x, P.y - y);
        E.rot = E.rot === null ? want : lerpAng(E.rot, want, 1 - Math.exp(-dt * 4)); E.grp.rotation.y = E.rot;
        const moved = o.movedDay === G.dayKey(S);
        u.ring.material.opacity = moved ? 0.35 : 0.75;
        u.figs.forEach((f, i) => { f.position.y = u.float ? 0.12 + Math.sin(t * 2 + i) * 0.04 : Math.max(0, Math.sin(t * 3 + i * 1.7 + o.x)) * 0.012; });
        if (ap) u.figs.forEach((f, i) => { f.position.y += Math.abs(Math.sin(t * 14 + i)) * 0.05; });
      }
      if (u.spin) { u.spin.rotation.y = t * 1.5; u.spin.position.y = Math.sin(t * 2) * 0.04; }
      if (u.fx) {
        const crew = hooks.lairCrew ? hooks.lairCrew(o) : 0; const work = crew ? Math.min(1, 0.45 + crew * 0.3) : 0;
        if (u.rise) {
          const left = hooks.lairBuilding ? hooks.lairBuilding(o) : o.building; const tot = o.buildTotal || G.buildDays(o.dtype);
          const p = Math.max(0.04, Math.min(1, 1 - left / tot)); setRise(u, p);
          u.ghost.material.opacity = 0.5 + 0.12 * Math.sin(t * 2.4 + o.x);
          fxOnQuad(u.fx, u.quad); runFx(u.fx, t, work, u.rise.h * p, u.rise.w * 0.75, 1);
        } else { if (u.quad) fxOnQuad(u.fx, u.quad); runFx(u.fx, t, work, (u.top || 0.5) * 0.3, 0.9, 1); }
      }
      if (E.pop !== undefined) { const a = t - E.pop; if (a > 1.2) { E.grp.scale.setScalar(1); E.pop = undefined; } else E.grp.scale.setScalar(1 + 0.14 * Math.exp(-a * 4) * Math.sin(a * 16)); }
      // labels
      const lbl = objLabel(S, o); const top = (u.h || 0.5) * (o.kind === 'stack' ? 1 : 1) + 0.12;
      if (lbl) { const L = label(MAP.labels, o.id, lbl.cls, lbl.html); L.pos.set(wx, hAt(wx, wz) + top + (o.kind === 'stack' ? 0.18 : 0.05), wz); if (lbl.below) L.pos.set(wx, hAt(wx, wz) + 0.02, wz + 0.48); }
    }
    for (const [id, E] of MAP.objs) if (!seen.has(id)) { MAP.scene.remove(E.grp); MAP.objs.delete(id); const L = MAP.labels.get(id); if (L) { L.el.remove(); MAP.labels.delete(id); } }
    // the places your minions work, and the minions themselves
    if (!MAP.nodes) MAP.nodes = new Map(); if (!MAP.mins) MAP.mins = new Map();
    for (const n of S.nodes || []) {
    // 0.30: mines and camps stand smaller than the Dark Tower (they were 1.2)
      const look = hooks.nodeLook ? hooks.nodeLook(n) : 'node-' + n.kind; const nseen = hooks.seeTile ? hooks.seeTile(n.x, n.y) : true;
      let E = MAP.nodes.get(n.id); if (!E || E.look !== look) { if (E) MAP.scene.remove(E.grp); const grp = prop(look); grp.scale.setScalar(0.72); MAP.scene.add(grp); E = { grp, look }; MAP.nodes.set(n.id, E); }
      const wx = n.x + 0.5, wz = n.y + 0.5; E.grp.position.set(wx, hAt(wx, wz), wz); E.grp.visible = nseen; if (!nseen) continue;
      const html = hooks.nodeLabel ? hooks.nodeLabel(n) : ''; if (html) { const L = label(MAP.labels, 'node-' + n.id, 'l-node', html); L.pos.set(wx, hAt(wx, wz) + 0.02, wz + 0.5); }
    }
    const look = G3.MINION_TYPES[S.villain && S.villain.type] ? G3.MINION_TYPES[S.villain.type].look : 'thrall'; const seenM = new Set();
    for (const m of S.minions || []) {
      seenM.add(m.id); let E = MAP.mins.get(m.id);
      if (!E || E.look !== look) {
        if (E) { MAP.scene.remove(E.grp); MAP.scene.remove(E.kit); }
        const grp = new T.Group(); const f = figure('unit-m-' + look, { lightScale: 0.6 }); grp.add(f); grp.userData.fig = f; MAP.scene.add(grp);
        // 0.31: what it works with: a tool to swing, and the dust and sparks it raises (kept upright, outside the turning figure)
        const kit = new T.Group(); const tool = new T.Sprite(new T.SpriteMaterial({ map: toolTex().tex, transparent: true, depthWrite: false, toneMapped: false }));
        tool.center.set(0.18, 0.12); tool.scale.set(0.2, 0.2, 1); tool.renderOrder = 0.6; kit.add(tool); const fx = workFx(3, 4); kit.add(fx); kit.userData = { tool, fx }; MAP.scene.add(kit);
        E = { grp, look, rot: 0, last: null, kit }; MAP.mins.set(m.id, E);
      }
      const p = hooks.minionPos ? hooks.minionPos(m) : { x: m.x, y: m.y }; const wx = p.x + 0.5, wz = p.y + 0.5;
      if (E.last && (Math.abs(E.last.x - wx) + Math.abs(E.last.z - wz)) > 0.001) E.rot = Math.atan2(wx - E.last.x, wz - E.last.z);
      E.last = { x: wx, z: wz }; E.grp.position.set(wx, hAt(wx, wz), wz); E.grp.rotation.y = E.rot;
      E.grp.userData.fig.position.y = p.moving ? Math.abs(Math.sin(t * 12 + m.x)) * 0.04 : p.dance ? Math.abs(Math.sin(t * 9 + m.x)) * 0.09 : 0;
      if (p.dance) { E.grp.rotation.y = t * 5 + m.x; E.grp.userData.fig.rotation.z = Math.sin(t * 4.5) * 0.25; }
      else if (p.work) {
        // 0.31: a proper swing: lean back with the tool raised, then bring it down hard, a hop, dust and sparks on every blow
        const ph = (t * 1.6 + m.x * 0.37 + m.y * 0.21) % 1; const up = ph < 0.6 ? ph / 0.6 : 1 - (ph - 0.6) / 0.4;   // 0: struck, 1: raised
        const ease = up * up * (3 - 2 * up);
        E.grp.userData.fig.rotation.z = 0.22 * ease - 0.28 * (1 - ease);
        E.grp.userData.fig.position.y = ph > 0.6 && ph < 0.75 ? 0.05 * Math.sin((ph - 0.6) / 0.15 * Math.PI) : 0;
        E.grp.userData.fig.scale.y = 1 - 0.08 * Math.max(0, 1 - Math.abs(ph - 0.98) / 0.06);
      }
      else { E.grp.userData.fig.rotation.z = 0; E.grp.userData.fig.scale.y = 1; }
      { const K = E.kit.userData; const work = !!p.work && E.grp.visible !== false; K.tool.visible = work; E.kit.position.set(wx, hAt(wx, wz), wz);
        if (work) { const ph = (t * 1.6 + m.x * 0.37 + m.y * 0.21) % 1; const up = ph < 0.6 ? ph / 0.6 : 1 - (ph - 0.6) / 0.4; const ease = up * up * (3 - 2 * up);
          K.tool.position.set(0.1, 0.2 + 0.06 * ease, 0.05); K.tool.material.rotation = -0.9 + 2.0 * ease; }
        runFx(K.fx, t * 1.6 + m.x, work ? 1 : 0, 0.03, 0.5, 0.8); }
      // 0.33: what it says when you click it or give it an order, in a bubble over its head
      { const say = hooks.minionBubble ? hooks.minionBubble(m) : null; if (say && E.grp.visible !== false) { const L = label(MAP.labels, 'msay-' + m.id, 'l-say', esc(say)); L.pos.set(wx, hAt(wx, wz) + 0.95, wz); } }
    }
    for (const [id, E] of MAP.mins) if (!seenM.has(id)) { MAP.scene.remove(E.grp); if (E.kit) MAP.scene.remove(E.kit); MAP.mins.delete(id); }
    // rings under the minions you've selected (and a faint one under the one you point at)
    if (!MAP.mrings) MAP.mrings = [];
    const want = (spec.minSel || []).filter(id => MAP.mins.has(id)).map(id => [id, false]);
    if (spec.minHover && MAP.mins.has(spec.minHover) && !(spec.minSel || []).includes(spec.minHover)) want.push([spec.minHover, true]);
    while (MAP.mrings.length < want.length) { const r = M.circleMesh('#ffe39a', 0.72, 0.95); MAP.scene.add(r); MAP.mrings.push(r); }
    MAP.mrings.forEach((r, i) => {
      if (i >= want.length) { r.visible = false; return; }
      const E = MAP.mins.get(want[i][0]); const p = E.grp.position; r.visible = true;
      r.position.set(p.x, p.y + 0.04, p.z); r.rotation.z = -t * 0.9; r.material.opacity = want[i][1] ? 0.4 : 0.75 + 0.2 * Math.sin(t * 5);
    });
    for (const s of G.sitesOf(S)) {
      const sseen = hooks.seeTile ? hooks.seeTile(s.x, s.y) : true; if (MAP.sites[s.id]) MAP.sites[s.id].visible = sseen; if (!sseen) continue;
      const L = label(MAP.labels, 'site-' + s.id, 'l-site' + (s.kind === 'tower' ? ' tower' : ''), esc(s.name) + questTag(S, { kind: 'site', id: s.id }));
      L.pos.set(s.x + 0.5, hAt(s.x + 0.5, s.y + 0.5) + 0.02, s.y + 0.5 + (s.kind === 'town' ? 1.25 : s.kind === 'tower' ? 0.9 : 0.62));
    }
    // 0.31: until you've seen Millbrook, a ring of rumour where it might be
    { const H = hooks.townHint ? hooks.townHint() : null;
      if (H && (!MAP.hintRing || MAP.hintRing.userData.r !== H.r)) {
        if (MAP.hintRing) MAP.scene.remove(MAP.hintRing);
        // a dashed ring of gold on the ground, drawn over the fog
        const g = new T.Group(); const mat = new T.MeshBasicMaterial({ color: new T.Color('#e6c46c'), transparent: true, opacity: 0.6, depthTest: false, depthWrite: false, side: T.DoubleSide });
        const N = Math.max(24, Math.round(H.r * 5));
        for (let i = 0; i < N; i++) { const seg = new T.Mesh(new T.RingGeometry(H.r - 0.09, H.r + 0.09, 3, 1, i / N * Math.PI * 2, Math.PI / N), mat); seg.rotation.x = -Math.PI / 2; seg.renderOrder = 3; g.add(seg); }
        g.userData.r = H.r; MAP.hintRing = g; MAP.scene.add(g);
      }
      if (MAP.hintRing) { MAP.hintRing.visible = !!H; if (H) { const hx = H.x + 0.5, hz = H.y + 0.5; MAP.hintRing.position.set(hx, hAt(hx, hz) + 0.25, hz); MAP.hintRing.rotation.y = t * 0.03; } }
      if (H) { const L = label(MAP.labels, 'town-hint', 'l-site hint', 'Millbrook lies somewhere here'); L.pos.set(H.x + 0.5, hAt(H.x + 0.5, H.y + 0.5) + 0.3, H.y + 0.5); } }
    // villain
    const V = S.villain; const onMap = G.villainOnMap(S);
    if (onMap && !MAP.villain) { MAP.villain = makeVillain(); MAP.scene.add(MAP.villain); MAP.vrot = null; }
    if (!onMap && MAP.villain) { MAP.scene.remove(MAP.villain); MAP.villain = null; }
    if (MAP.villain) MAP.villain.visible = !hooks.seeNow || hooks.seeNow(V.x, V.y);
    if (MAP.villain && MAP.villain.visible) {
      const ap = hooks.animPos('villain'); const x = ap ? ap.x : V.x, y = ap ? ap.y : V.y; const wx = x + 0.5, wz = y + 0.5;
      MAP.villain.position.set(wx, hAt(wx, wz), wz);
      const P = hooks.partyPos(); const want = Math.atan2(P.x - x, P.y - y); MAP.vrot = MAP.vrot === null ? want : lerpAng(MAP.vrot, want, 1 - Math.exp(-dt * 4)); MAP.villain.userData.king.rotation.y = MAP.vrot;
      MAP.villain.userData.ring.rotation.z = -t * 0.5; MAP.villain.userData.aura.material.opacity = 0.3 + 0.2 * Math.sin(t * 2.5);
      const L = label(MAP.labels, 'villain', 'l-vil', `${esc(V.name || 'Malgrith')}${V.known ? ' <i class="k">!</i>' : ''}${questTag(S, { kind: 'villain' })}`); L.pos.set(wx, hAt(wx, wz) + 1.0, wz);
    }
    // party
    const P = hooks.partyPos(); const pw = { x: P.x + 0.5, z: P.y + 0.5 };
    const pg = MAP.party; pg.position.set(pw.x, hAt(pw.x, pw.z), pw.z); pg.visible = hooks.partyShown ? hooks.partyShown() : true;   // 0.31: the heroes walk in the fog
    const head = hooks.partyHeading(); if (head !== null) { MAP.prot = MAP.prot === undefined ? head : lerpAng(MAP.prot, head, 1 - Math.exp(-dt * 8)); }
    pg.rotation.y = MAP.prot || 0;
    pg.userData.ring.rotation.z = t * 0.4;
    const moving = hooks.partyMoving();
    if (pg.userData.sig !== S.heroes.map(h => h.id).join()) partyFigures(pg, S.heroes);
    for (const h of S.heroes) { const f = pg.userData.heroes[h.id]; if (!f) continue; f.visible = h.status !== 'dead'; f.position.y = moving ? Math.abs(Math.sin(t * 13 + f.position.x * 9)) * 0.05 : 0; }
    waveFlag(pg.userData.flag, pg.userData.flagBase, t);
    // routes
    const R = hooks.route();
    const rk = R ? R.key : '';
    if (rk !== MAP.arrows.key) { MAP.arrows.key = rk; if (R) { setArrows(MAP.arrows, R.arrows, R.colors); const xs = R.end ? [R.end] : []; setArrows(MAP.xmarks, xs.map(e => [e[0], e[1], 0]), xs.map(e => e[2])); } else { MAP.arrows.mesh.count = 0; MAP.xmarks.mesh.count = 0; } }
    const pk = spec.path ? spec.path.map(p => p[0] + ',' + p[1] + ',' + p[2].toFixed(2)).join(';') + spec.pathColor + (spec.pathColors ? spec.pathColors.join() : '') : '';
    if (pk !== MAP.parrows.key) { MAP.parrows.key = pk; if (spec.path && spec.path.length) setArrows(MAP.parrows, spec.path, spec.pathColors || spec.path.map(() => spec.pathColor)); else MAP.parrows.mesh.count = 0; }
    // selection ring
    if (spec.sel) { MAP.selRing.visible = true; const wx = spec.sel.x + 0.5, wz = spec.sel.y + 0.5; MAP.selRing.position.set(wx, hAt(wx, wz) + 0.05, wz); MAP.selRing.rotation.z = -t * 0.6; MAP.selRing.material.opacity = 0.7 + 0.25 * Math.sin(t * 4); } else MAP.selRing.visible = false;
    // placement ghost
    const gk = spec.ghost ? spec.ghost.kind + ':' + (spec.ghost.err ? 1 : 0) : '';
    if (gk !== MAP.ghostKey) {
      MAP.ghostKey = gk; if (MAP.ghost) { MAP.scene.remove(MAP.ghost); MAP.ghost = null; }
      if (spec.ghost) { MAP.ghost = makeGhost(spec.ghost.kind, spec.ghost.err); MAP.scene.add(MAP.ghost); }
    }
    if (MAP.ghost && spec.ghost) { const wx = spec.ghost.x + 0.5, wz = spec.ghost.y + 0.5; MAP.ghost.position.set(wx, hAt(wx, wz), wz); MAP.ghost.rotation.y = Math.sin(t) * 0.2; }
    // floating texts
    const fl = hooks.floats();
    let fi = 0;
    for (const f of fl) { const age = (performance.now() - f.t0) / 1800; if (age > 1) continue; const L = label(MAP.labels, 'float' + (f.id || (f.id = Math.random().toString(36).slice(2))), 'l-float', `<span style="color:${f.color || '#ffe9a8'}">${esc(f.text)}</span>`); const wx = f.x + 0.5, wz = f.y + 0.5; L.pos.set(wx, hAt(wx, wz) + 0.9 + age * 0.7, wz); L.el.style.opacity = (1 - age * age).toFixed(2); fi++; }
  }
  function lerpAng(a, b, k) {
    if (!isFinite(a) || !isFinite(b)) return isFinite(b) ? b : 0;
    const P2 = Math.PI * 2; a = ((a % P2) + P2) % P2; let d = (((b - a) % P2) + P2) % P2; if (d > Math.PI) d -= P2;
    return a + d * clamp(k, 0, 1);
  }
  function waveFlag(flag, base, t) { if (!flag) return; const p = flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3]; p.setZ(i, Math.sin(t * 5 - x * 14) * 0.035 * x / 0.3); } p.needsUpdate = true; }
  function questTag(S, ref) { const q = G.questOn(S, ref); return q ? ` <i class="q" title="Quest">✦</i>` : ''; }
  function objLabel(S, o) {
    const known = o.known ? `<i class="k${o.rumored ? ' r' : ''}">${o.rumored ? '?' : '!'}</i>` : '';
    const qt = questTag(S, { kind: 'obj', id: o.id });
    if (o.kind === 'stack') { const ml = hooks.monLevel ? hooks.monLevel(o) : null;   // 0.31: a band of the wilds shows its level, coloured against your villain's
      return { cls: 'l-stack' + (o.patrol ? ' patrol' : ''), html: `<b>${o.count}</b>${ml ? `<span class="mlv c-${ml.cls}">Lv ${ml.L}</span>` : (o.lvl || 1) > 1 ? `<span class="lv">★${o.lvl}</span>` : ''}${known}${qt}` }; }
    if (o.kind === 'dungeon') return { cls: 'l-lair' + (o.mine ? ' mine' : ''), below: true, html: `${esc(G.DUNGEONS[o.dtype].name)}${(o.level || 1) > 1 ? ' <span class="lv">II</span>' : ''}${o.mine && hooks.lairLabel ? ' ' + hooks.lairLabel(o) : ''}${known}${qt}` };
    if (G.ITEMS[o.kind] && G.ITEMS[o.kind].cat === 'trap') return null;
    if (known || qt) return { cls: 'l-item', html: known + qt };
    return null;
  }
  function makeGhost(kind, err) {
    const isC = !!G.CREATURES[kind];
    const g = isC ? makeStack({ type: kind, count: G.CREATURES[kind].base }) : makeObj({ kind: G.DUNGEONS[kind] ? 'dungeon' : kind, dtype: kind, level: 1 });
    const mat = new T.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: err ? 0.35 : 0.7, color: err ? new T.Color(1, 0.35, 0.3) : new T.Color(0.75, 1, 0.75), depthWrite: false, flatShading: true });
    g.traverse(m => { if (m.isMesh && m.material && m.material.vertexColors && !m.material.toneMapped === false) { m.material = mat; m.castShadow = false; } if (m.isMesh && m.material === M.MAT.body) { m.material = mat; m.castShadow = false; } });
    return g;
  }
  function syncCitadel(S) {
    const tw = G.siteOf(S, 'tower');
    for (const k of Object.keys(S.citadel ? S.citadel.built : {})) {
      if (k === 'throne' || MAP.citadel[k]) continue;
      const sp = M.CITADEL_SPOTS[k]; if (!sp) continue;
      const g = M.make('cit-' + k); const wx = tw.x + 0.5 + sp[0], wz = tw.y + 0.5 + sp[1];
      g.position.set(wx, MAP.hAt(wx, wz), wz); g.rotation.y = sp[2];
      MAP.scene.add(g); MAP.citadel[k] = g;
    }
  }
  // at the Dark Tower: a minion taking shape in a circle of runes, and the Forbidden Library going up beside it
  const SUMMON_AT = [1.35, 1.05], LIB_AT = [-1.55, 1.0];
  function syncTowerWork(S, t) {
    const tw = G.siteOf(S, 'tower'); const W = MAP.tw || (MAP.tw = {}); const seen = !hooks.seeTile || hooks.seeTile(tw.x, tw.y);
    const at = (g, o) => { const wx = tw.x + 0.5 + o[0], wz = tw.y + 0.5 + o[1]; g.position.set(wx, MAP.hAt(wx, wz), wz); g.visible = seen; };
    const sm = hooks.summoning ? hooks.summoning() : null;
    if (!sm && W.sum) { MAP.scene.remove(W.sum.g); W.sum = null; }
    if (sm && !W.sum) {
      const g = new T.Group(); const c = M.circleMesh('#b468ff', 1.05, 0.8); c.position.y = 0.04; g.add(c);
      const f = figure('unit-m-' + sm.look, { lightScale: 0.6 }); f.visible = !!f.userData.sprite; // a 3D model can't go see-through: just the circle then
      if (f.userData.sprite) { const m = f.userData.mat; m.depthWrite = false; m.blending = T.AdditiveBlending; m.color.set('#c99cff'); }
      const glow = M.glowSprite('#8a3aff', 1.1, 0.55); glow.position.y = 0.32; g.add(glow);
      g.add(f); const fx = workFx(0, 10, '#d4a4ff'); g.add(fx);
      MAP.scene.add(g); W.sum = { g, c, f, fx, glow };
    }
    if (W.sum) {
      const U = W.sum, p = Math.max(0, Math.min(1, sm.p)); at(U.g, SUMMON_AT);
      U.c.rotation.z = -t * 0.7; U.c.material.opacity = 0.5 + 0.25 * Math.sin(t * 3);
      if (U.f.userData.sprite) { U.f.userData.mat.opacity = 0.55 + 0.35 * p + 0.1 * Math.sin(t * 5); U.f.position.y = -(1 - p) * 0.12 + 0.04 + Math.sin(t * 2.2) * 0.03; U.f.scale.setScalar(0.75 + 0.25 * p); }
      U.glow.scale.setScalar(0.9 + 0.35 * p + 0.08 * Math.sin(t * 3.1)); runFx(U.fx, t, 1, 0.05, 0.7, 2.6);
    }
    const lb = hooks.libraryWork ? hooks.libraryWork() : null;
    const want = lb && lb.building ? 'b' : lb && lb.level && SPR.on && SPR.art.has('obj-library') ? 'L' : '';
    if ((W.libKey || '') !== want) {
      if (W.lib) MAP.scene.remove(W.lib); W.lib = null; W.libKey = want;
      if (want === 'b') { const g = prop('building'); g.scale.setScalar(0.85); const fx = workFx(6, 4); g.add(fx); g.userData.fx = fx; W.lib = g; }
      else if (want === 'L') W.lib = prop('library', null, 'building');
      if (W.lib) MAP.scene.add(W.lib);
    }
    if (W.lib) { at(W.lib, LIB_AT); const u = W.lib.userData; if (u.fx) { if (u.quad) fxOnQuad(u.fx, u.quad); runFx(u.fx, t, lb.crew ? 1 : 0.6, (u.top || 0.5) * 0.35, 0.8, 1); } }
  }
  function syncFlags(S, t) {
    // visited landmarks get a red flag; a tournament puts banners by town
    for (const s of G.sitesOf(S)) {
      if (s.kind !== 'landmark') continue;
      const g = MAP.sites[s.id]; if (!g) continue;
      if (S.visited[s.id] && !g.userData.flag) {
        const b = new M.Builder(3); b.seg([0, 0, 0], [0, 0.6, 0], 0.01, 0.01, '#4a2a12'); b.add(new T.BoxGeometry(0.18, 0.11, 0.005), '#c8302a', { x: 0.09, y: 0.53 });
        const m = new T.Mesh(b.build(), M.MAT.body); m.position.set(0.45, 0, 0.35); m.castShadow = true; g.add(m); g.userData.flag = m;
      }
    }
    const town = MAP.sites.town;
    if (town) {
      if (S.townEvent && !town.userData.tourney) { const tg = prop('tourney'); tg.position.set(-0.7, 0, 0.75); tg.scale.setScalar(1.3); town.add(tg); town.userData.tourney = tg; }
      if (!S.townEvent && town.userData.tourney) { town.remove(town.userData.tourney); town.userData.tourney = null; }
    }
  }

  /* --- map camera --- */
  const PITCH = 0.88;
  function applyCam() {
    const C = MAP.cam; const cam = MAP.camera; if (!cam) return;
    C.tx = clamp(C.tx, -1, G.MW + 1); C.tz = clamp(C.tz, -1, G.MH + 1);
    const gy = 0.2;
    cam.position.set(C.tx, gy + C.d * Math.sin(PITCH), C.tz + C.d * Math.cos(PITCH));
    cam.lookAt(C.tx, gy, C.tz);
    cam.updateMatrixWorld();
  }
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function rayFrom(cx, cy, camera) {
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera || MAP.camera);
    return ray.ray;
  }
  function planeHit(r, y) { const t = (y - r.origin.y) / r.direction.y; if (!(t > 0)) return null; return r.origin.clone().addScaledVector(r.direction, t); }
  function groundHit(cx, cy) {
    const r = rayFrom(cx, cy);
    // march the heightfield from above the tallest peaks down to the lake bed
    let t0 = (3.6 - r.origin.y) / r.direction.y; if (t0 < 0) t0 = 0;
    const t1 = (-1.2 - r.origin.y) / r.direction.y;
    const p = new T.Vector3(); let prevT = t0, prevD = null;
    const step = 0.12;
    for (let t = t0; t <= t1; t += step) {
      p.copy(r.origin).addScaledVector(r.direction, t);
      const d = p.y - Math.max(MAP.hAt(p.x, p.z), WATER_Y);
      if (d <= 0) {
        let a = prevT, b = t;
        for (let k = 0; k < 10; k++) { const m = (a + b) / 2; p.copy(r.origin).addScaledVector(r.direction, m); if (p.y - Math.max(MAP.hAt(p.x, p.z), WATER_Y) > 0) a = m; else b = m; }
        return p.clone();
      }
      prevT = t; prevD = d;
    }
    return planeHit(r, 0.15);
  }
  function pickTile(cx, cy) {
    if (!MAP.scene) return null;
    const p = groundHit(cx, cy); if (!p) return null;
    const x = Math.floor(p.x), y = Math.floor(p.z);
    if (x < 0 || y < 0 || x >= G.MW || y >= G.MH) return null;
    return { x, y };
  }
  // the minion figure under the pointer, if any (they're small, so pick by screen distance)
  function pickMinion(cx, cy) {
    if (!MAP.mins || !MAP.camera || !canvas) return null;
    const r = canvas.getBoundingClientRect(); const v = new T.Vector3(); let best = null, bd = Infinity;
    const rad = 26 * clamp(17 / MAP.cam.d, 0.55, 1.6);
    for (const [id, E] of MAP.mins) {
      v.copy(E.grp.position); v.y += 0.22; v.project(MAP.camera); if (v.z > 1) continue;
      const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
      const d = Math.hypot(sx - cx, (sy - cy) * 1.15); if (d < rad && d < bd) { bd = d; best = id; }
    }
    return best;
  }
  let drag = null;
  function dragStart(cx, cy) { const p = planeHit(rayFrom(cx, cy), 0.2); drag = p ? { p, tx: MAP.cam.tx, tz: MAP.cam.tz, cam: MAP.camera.clone() } : null; }
  function dragMove(cx, cy) {
    if (!drag) return;
    const r = rayFrom(cx, cy, drag.cam); const p = planeHit(r, 0.2); if (!p) return;
    MAP.cam.goal = null; MAP.cam.dGoal = null; MAP.cam.tx = drag.tx - (p.x - drag.p.x); MAP.cam.tz = drag.tz - (p.z - drag.p.z); applyCam();
  }
  function dragEnd() { drag = null; }
  function zoomAt(delta, cx, cy) {
    const C = MAP.cam; C.dGoal = null; const before = planeHit(rayFrom(cx, cy), 0.2);
    const nd = clamp(C.d * Math.exp(delta * 0.0012), 7, 34); if (nd === C.d) return;
    C.d = nd; applyCam();
    const after = planeHit(rayFrom(cx, cy), 0.2);
    if (before && after) { C.tx += before.x - after.x; C.tz += before.z - after.z; C.goal = null; applyCam(); }
  }
  function pan(dx, dy) { const C = MAP.cam; C.goal = { x: (C.goal ? C.goal.x : C.tx) + dx, z: (C.goal ? C.goal.z : C.tz) + dy }; }
  function centerOn(x, y, instant) { const C = MAP.cam; if (instant) { C.tx = x + 0.5; C.tz = y + 0.5; C.goal = null; applyCam(); } else C.goal = { x: x + 0.5, z: y + 0.5 }; }
  function ensureVisible(x, y) {
    if (!MAP.camera) return;
    const v = new T.Vector3(x + 0.5, MAP.hAt(x + 0.5, y + 0.5), y + 0.5).project(MAP.camera);
    if (Math.abs(v.x) > 0.62 || v.y > 0.55 || v.y < -0.62) centerOn(x, y);
  }
  // glide (and zoom out, never in) so a box of tiles is in view; and put the camera back afterwards
  function inView(x, y, margin) {
    if (!MAP.camera) return true; const v = new T.Vector3(x + 0.5, MAP.hAt(x + 0.5, y + 0.5), y + 0.5).project(MAP.camera); const m = 1 - (margin || 0.12);
    return v.z < 1 && Math.abs(v.x) < m && Math.abs(v.y) < m;
  }
  function frameTiles(x0, y0, x1, y1) {
    const C = MAP.cam; const cam = MAP.camera; if (!cam) return;
    const vf = cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * cam.aspect);
    const w = x1 - x0 + 3, h = y1 - y0 + 3;
    const need = Math.max(w / (2 * Math.tan(hf)) * 1.05, h * Math.sin(PITCH) / (2 * Math.tan(vf)) * 1.25);
    C.goal = { x: (x0 + x1) / 2 + 0.5, z: (y0 + y1) / 2 + 0.5 + 0.4 }; C.dGoal = clamp(Math.max(need, C.d), 7, 34);
  }
  const camState = () => MAP.cam ? { x: MAP.cam.goal ? MAP.cam.goal.x : MAP.cam.tx, z: MAP.cam.goal ? MAP.cam.goal.z : MAP.cam.tz, d: MAP.cam.dGoal || MAP.cam.d } : null;
  function camTo(st) { if (!st || !MAP.cam) return; MAP.cam.goal = { x: st.x, z: st.z }; MAP.cam.dGoal = st.d; }
  // ground footprint of the view, in tile units, for the minimap
  function viewQuad() {
    if (!MAP.camera || !canvas) return null;
    const r = canvas.getBoundingClientRect(); const pts = [];
    for (const [fx, fy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const p = planeHit(rayFrom(r.left + fx * r.width, r.top + fy * r.height), 0.2); if (!p) return null; pts.push([p.x, p.z]); }
    return pts;
  }

  /* ================= the battlefield ================= */
  const BAT = { scene: null, camera: null, units: new Map(), labels: new Map(), fx: new Map(), overlayKey: '' };
  const FW = (G.BW + 0.5) * SQ3, FH = 1.5 * (G.BH - 1) + 2;
  const hexW = k => { const c = k % G.BW, r = Math.floor(k / G.BW); return { x: SQ3 * (c + 0.5 * (r & 1)) + SQ3 / 2, z: 1.5 * r + 1 }; };
  const BTC = { grass: ['#4c7228', '#628632'], forest: ['#3a5a22', '#4a6a2a'], dirt: ['#7e6442', '#937852'], swamp: ['#4c5530', '#5e6838'], snow: ['#d8e0e8', '#eef3f7'], waste: ['#4a413d', '#5e524a'] };
  function enterBattle(S, BF) {
    const b = S.battle; BAT.bf = BF;
    disposeScene(BAT.scene);
    for (const L of BAT.labels.values()) L.el.remove(); BAT.labels = new Map(); BAT.units = new Map(); BAT.fx = new Map(); BAT.overlayKey = '';
    const scene = new T.Scene(); BAT.scene = scene; scene.background = new T.Color(0x10141a);
    const terr = BTC[b.terrain] ? b.terrain : 'grass';
    scene.fog = new T.Fog(0x2c3440, 34, 70);
    const sunDir = new T.Vector3(-0.45, 1.0, 0.5).normalize(); BAT.lights = addLights(scene, sunDir); BAT.lights.dir = sunDir;
    followShadow(BAT.lights, FW / 2, FH / 2, 20);
    BAT.camera = new T.PerspectiveCamera(34, 1.6, 0.1, 200);
    const seed = (S.seed + S.week * 31 + S.day * 7) % 100000;
    const R = M.rng(seed);
    // ground: flat field in a shallow bowl of hills
    const GWd = 70, GHd = 52; const geo = new T.PlaneGeometry(GWd, GHd, 140, 104); geo.rotateX(-Math.PI / 2); geo.translate(FW / 2, 0, FH / 2);
    const p = geo.attributes.position;
    const hillAmp = terr === 'swamp' ? 0.9 : terr === 'snow' ? 3.4 : terr === 'waste' ? 2.4 : 2.0;
    const hf = (x, z) => {
      const dx = Math.max(0, Math.max(-x + 0.2, x - FW - 0.2)), dz = Math.max(0, Math.max(-z + 0.4, z - FH - 0.4)); const d = Math.hypot(dx, dz);
      const base = (fbm(x * 0.35, z * 0.35, seed, 2) - 0.5) * 0.05;
      return base + smooth(clamp(d / 7, 0, 1)) * hillAmp * (0.6 + fbm(x * 0.18, z * 0.18, seed + 3, 3) * 0.9) + (d > 0 ? smooth(clamp(d / 3, 0, 1)) * 0.25 : 0);
    };
    BAT.hf = hf;
    for (let i = 0; i < p.count; i++) p.setY(i, hf(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    // painted ground
    const cw = 768, ch = Math.round(cw * GHd / GWd); const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d');
    const im = c.createImageData(cw, ch); const dd = im.data; const c0 = hexRGB(BTC[terr][0]), c1 = hexRGB(BTC[terr][1]);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const wx = x / cw * GWd + FW / 2 - GWd / 2, wz = y / ch * GHd + FH / 2 - GHd / 2;
      const n = fbm(wx * 0.4, wz * 0.4, seed + 21, 3); const n2 = vnoise(wx * 2, wz * 2, seed + 4);
      const inF = wx > 0 && wx < FW && wz > 0 && wz < FH;
      let r = c0[0] + (c1[0] - c0[0]) * n, g = c0[1] + (c1[1] - c0[1]) * n, bb = c0[2] + (c1[2] - c0[2]) * n;
      const f = (0.88 + n2 * 0.22) * (inF ? 1.04 : 0.96); r *= f; g *= f; bb *= f;
      const o = (y * cw + x) * 4; dd[o] = r; dd[o + 1] = g; dd[o + 2] = bb; dd[o + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    for (let i = 0; i < 1200; i++) { const x = R() * cw, y = R() * ch; c.fillStyle = R() < 0.5 ? 'rgba(20,30,10,0.16)' : 'rgba(255,255,220,0.08)'; c.fillRect(x, y, 1 + R() * 2, 1 + R() * 2); }
    const gt = new T.CanvasTexture(cv); gt.encoding = T.sRGBEncoding; gt.anisotropy = 4;
    // splat: the terrain's own ground pattern with worn patches where the fighting happens
    const sw = 140, sh = 104, sd = new Uint8Array(sw * sh * 4); const base = SPLAT[terr] || SPLAT.grass;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const wx = x / sw * GWd + FW / 2 - GWd / 2, wz = y / sh * GHd + FH / 2 - GHd / 2;
      const n = fbm(wx * 0.3, wz * 0.3, seed + 71, 3); const inF = wx > -0.5 && wx < FW + 0.5 && wz > -0.5 && wz < FH + 0.5;
      const wear = clamp((n - 0.5) * 3.2 + (inF ? 0.25 : -0.1), 0, 1) * (terr === 'snow' ? 0.3 : 0.75);
      const o = (y * sw + x) * 4; const g = base[0] * (1 - wear), d = Math.min(1, base[1] + wear * Math.max(0.4, base[0]));
      sd[o] = g * 255; sd[o + 1] = d * 255; sd[o + 2] = base[2] * 255; sd[o + 3] = 0;
    }
    const stex = new T.DataTexture(sd, sw, sh, T.RGBAFormat); stex.magFilter = T.LinearFilter; stex.minFilter = T.LinearFilter; stex.needsUpdate = true;
    const U = { uDetail: { value: DETAIL }, uSnowLine: { value: terr === 'snow' ? 0.4 : 99 }, uTime: { value: 0 }, uPat: { value: PAT }, uSplat: { value: stex }, uSplatBox: { value: new T.Vector4(FW / 2 - GWd / 2, FH / 2 - GHd / 2, GWd, GHd) } };
    BAT.U = U;
    const ground = new T.Mesh(geo, groundMaterial(gt, U, {})); ground.receiveShadow = true; scene.add(ground);
    // hex overlay
    const ow = 1280, oh = Math.round(ow * FH / FW); const ocv = document.createElement('canvas'); ocv.width = ow; ocv.height = oh;
    BAT.ocv = ocv; BAT.octx = ocv.getContext('2d'); BAT.oscale = ow / FW;
    const otex = new T.CanvasTexture(ocv); otex.encoding = T.sRGBEncoding; otex.anisotropy = 4; BAT.otex = otex;
    const oplane = new T.Mesh(new T.PlaneGeometry(FW, FH), new T.MeshBasicMaterial({ map: otex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    oplane.rotation.x = -Math.PI / 2; oplane.position.set(FW / 2, 0.03, FH / 2); oplane.renderOrder = 2; scene.add(oplane);
    // surroundings
    const deco = { grass: ['broad', 'broad', 'pine', 'bush', 'rock'], forest: ['broad', 'pine', 'broad', 'pine', 'bush'], dirt: ['rock', 'dead', 'bush', 'pine', 'rock'], swamp: ['dead', 'reeds', 'reeds', 'bush', 'dead'], snow: ['snowpine', 'snowpine', 'snowcrag', 'rock', 'snowpine'], waste: ['dead', 'rock', 'crag', 'dead', 'rock'] }[terr];
    const buckets = {};
    for (let i = 0; i < 520; i++) {
      const x = FW / 2 + (R() - 0.5) * 64, z = FH / 2 + (R() - 0.5) * 46;
      const dx = Math.max(0, Math.max(-x, x - FW)), dz = Math.max(0, Math.max(-z, z - FH)); const d = Math.hypot(dx, dz);
      if (d < 0.9 || R() > 1.2 - d * 0.08) continue;
      const kind = deco[Math.floor(R() * deco.length)]; const v = Math.floor(R() * 3);
      (buckets[kind + v] = buckets[kind + v] || { kind, v, list: [] }).list.push([x, z, 1.8 + R() * 1.4, R() * 6.3]);
    }
    // the battlefield has no fog of war: its trees and rocks use the plain painted material
    const tmat = M.painted({ sway: U.uTime, rough: 0.92 }); const tm = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), pp = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    for (const k of Object.keys(buckets)) {
      const B = buckets[k]; const mesh = new T.InstancedMesh(M.treeVariants(B.kind)[B.v], tmat, B.list.length);
      B.list.forEach(([x, z, sc, ry], i) => { q.setFromAxisAngle(up, ry); s.setScalar(sc); pp.set(x, hf(x, z) - 0.03, z); tm.compose(pp, q, s); mesh.setMatrixAt(i, tm); });
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    // obstacles on the field
    for (const k of Object.keys(b.tiles)) {
      const t = b.tiles[k]; const w = hexW(+k); const r = M.rng(+k * 7 + seed);
      const grp = new T.Group(); grp.position.set(w.x, 0, w.z);
      if (t === 'rock') { for (let i = 0; i < 2 + Math.floor(r() * 2); i++) { const m = new T.Mesh(M.treeVariants(terr === 'snow' ? 'snowcrag' : 'crag')[Math.floor(r() * 3)], tmat); m.scale.setScalar(0.9 + r() * 0.6); m.position.set((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8); m.rotation.y = r() * 6; m.castShadow = m.receiveShadow = true; grp.add(m); } }
      else if (t === 'tree') { const kinds = terr === 'snow' ? ['snowpine'] : terr === 'swamp' || terr === 'waste' ? ['dead'] : ['broad', 'pine']; for (let i = 0; i < 2; i++) { const m = new T.Mesh(M.treeVariants(kinds[Math.floor(r() * kinds.length)])[Math.floor(r() * 3)], tmat); m.scale.setScalar(2.2 + r() * 0.8); m.position.set((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9); m.rotation.y = r() * 6; m.castShadow = m.receiveShadow = true; grp.add(m); } }
      else if (t === 'brush') { for (let i = 0; i < 6; i++) { const m = new T.Mesh(M.treeVariants('bush')[Math.floor(r() * 3)], tmat); m.scale.setScalar(2.1 + r() * 0.9); const a = r() * 6.3, rr = r() * 0.6; m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); m.castShadow = m.receiveShadow = true; grp.add(m); } }
      else if (t === 'wall') {
        // 0.30: Millbrook's wall: sharpened logs for a palisade, grey blocks with merlons for stone
        if ((b.wallLv || 1) <= 1) {
          const wood = new T.MeshStandardMaterial({ color: lin('#7a5636'), roughness: 0.92 }), tip = new T.MeshStandardMaterial({ color: lin('#a07a50'), roughness: 0.9 });
          for (let i = 0; i < 6; i++) {
            const h = 1.35 + r() * 0.3; const zz = -0.95 + i * 0.38 + (r() - 0.5) * 0.06;
            const log = new T.Mesh(new T.CylinderGeometry(0.17, 0.19, h, 7), wood); log.position.set((r() - 0.5) * 0.1, h / 2, zz); log.castShadow = log.receiveShadow = true; grp.add(log);
            const c = new T.Mesh(new T.ConeGeometry(0.17, 0.32, 7), tip); c.position.set(log.position.x, h + 0.16, zz); c.castShadow = true; grp.add(c);
          }
          const beam = new T.Mesh(new T.BoxGeometry(0.1, 0.14, 2.1), wood); beam.position.set(-0.2, 0.75, 0); beam.castShadow = true; grp.add(beam);
        } else {
          const stone = new T.MeshStandardMaterial({ color: lin(b.wallLv >= 3 ? '#9a9488' : '#8a8478'), roughness: 0.95 });
          const h = b.wallLv >= 3 ? 1.9 : 1.55;
          const wall = new T.Mesh(new T.BoxGeometry(0.75, h, 2.05), stone); wall.position.y = h / 2; wall.castShadow = wall.receiveShadow = true; grp.add(wall);
          for (let i = 0; i < 4; i++) { const m = new T.Mesh(new T.BoxGeometry(0.8, 0.3, 0.3), stone); m.position.set(0, h + 0.15, -0.8 + i * 0.53); m.castShadow = true; grp.add(m); }
        }
      }
      else if (t === 'bog') {
        const pool = new T.Mesh(new T.CircleGeometry(0.85, 18), new T.MeshStandardMaterial({ color: lin('#2a3a2c'), roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }));
        pool.rotation.x = -Math.PI / 2; pool.position.y = 0.02; pool.scale.set(1, 0.8 + r() * 0.3, 1); grp.add(pool);
        for (let i = 0; i < 2; i++) { const m = new T.Mesh(M.treeVariants('reeds')[i], tmat); m.scale.setScalar(2.2); m.position.set((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.2); grp.add(m); }
      }
      scene.add(grp);
    }
    // trap spikes (visible to the DM)
    BAT.traps = new Map();
    // units
    BAT.cur = M.circleMesh('#ffd36a', 1.9, 0.95); BAT.cur.position.y = 0.05; scene.add(BAT.cur);
    fitBattleCamera();
  }
  function fitBattleCamera() {
    const cam = BAT.camera; if (!cam) return;
    const pitch = 0.86; const vf = cam.fov * Math.PI / 180 / 2; const hf = Math.atan(Math.tan(vf) * cam.aspect);
    const dW = (FW / 2 + 0.6) / Math.tan(hf);
    const dH = (FH / 2 + 1.6) / Math.tan(vf) * Math.sin(pitch) * 0.92;
    const d = Math.max(dW, dH) * 0.98;
    cam.position.set(FW / 2, d * Math.sin(pitch), FH / 2 + 1.2 + d * Math.cos(pitch));
    cam.lookAt(FW / 2, 0, FH / 2 + 0.6); cam.updateMatrixWorld();
    // keep the fog behind the field however far a tall, narrow screen pushes the camera back
    if (BAT.scene && BAT.scene.fog) { BAT.scene.fog.near = Math.max(34, d * 1.15); BAT.scene.fog.far = Math.max(70, d * 2.6); }
    BAT.scale = clamp(18 / d, 0.75, 1.2);
  }
  const UNIT_SCALE = { goblin: 3.77, wolf: 3.38, bandit: 3.55, skeleton: 3.51, orc: 3.38, ogre: 3.06, wraith: 3.25, troll: 2.99, giant: 2.79, dragon: 3.38, knight: 3.38, king: 3.38, barbarian: 3.51, rogue: 3.58, cleric: 3.51, wizard: 3.51, vampire: 3.38, hydra: 2.99, wyrm: 3.1, archfiend: 2.6, archmage: 3.3, vlord: 3.3, dknight: 3.2, demon: 2.73 };
  const BIG = 1.25; // battle figures read better a little larger than the hexes strictly allow
  function makeUnit(u) {
    const g = new T.Group();
    let key = u.icon || 'king';
    if (u.side === 'party') { const S0 = hooks.state(); const hero = S0 && S0.heroes.find(h => h.id === u.hero); key = hero ? M.defineHero(hero).slice(5) : key; }
    const stand = typeof Game !== 'undefined' && Game.CREATURES[key] && Game.CREATURES[key].stand;   // a stand-in keeps its model's scale (its own size is in the blueprint)
    const sc = (UNIT_SCALE[key] || (stand && UNIT_SCALE[stand]) || (key.indexOf('hero-') === 0 ? 3.5 : 1.7)) * BIG;
    let mat = M.painted({ transparent: true }); let fig;
    if (SPR.on && renderer) { fig = figure('unit-' + key); mat = fig.userData.mat; } else fig = M.make('unit-' + key, { mat, lightScale: 1.6 });
    fig.scale.setScalar(sc); g.add(fig);
    const ring = M.circleMesh(u.side === 'party' ? '#ffcf5a' : u.boss ? '#b25aff' : '#ff5a3a', 1.8, 0.45); ring.position.y = 0.04; g.add(ring);
    g.userData = { fig, ring, mat, key, sc, h: (fig.userData.sprite ? fig.userData.top : (M.blueprint('unit-' + key).h || 0.6)) * sc, rot: u.side === 'party' ? Math.PI / 2 : -Math.PI / 2 };
    return g;
  }
  const pxToW = (px, py) => ({ x: (px - BAT.bf.x0) / BAT.bf.R, z: (py - BAT.bf.y0) / BAT.bf.R });
  function updateBattle(t, dt) {
    const S = hooks.state(); const b = S && S.battle; if (!b || !BAT.scene) return;
    BAT.U.uTime.value = t;
    const view = hooks.view(); const now = performance.now();
    const seen = new Set();
    for (const u of b.units) {
      const v = view[u.id]; if (!v) continue;
      if (!v.alive && v.fade <= 0) { const E0 = BAT.units.get(u.id); if (E0) { BAT.scene.remove(E0); BAT.units.delete(u.id); } continue; }
      seen.add(u.id);
      let E = BAT.units.get(u.id); if (!E) { E = makeUnit(u); BAT.scene.add(E); BAT.units.set(u.id, E); }
      const w = v.px ? pxToW(v.px.x, v.px.y) : hexW(v.pos);
      const lift = (v.lift || 0) / BAT.bf.R;
      const ud = E.userData;
      E.position.set(w.x, 0, w.z);
      const float = ud.key === 'wraith' || ud.key === 'dragon';
      ud.fig.position.y = lift + (float ? 0.25 + Math.sin(t * 2 + w.x) * 0.08 : 0);
      // facing: toward the target while attacking, else toward the other side
      let want = u.side === 'party' ? Math.PI / 2 : -Math.PI / 2;
      if (v.face) { const tw = hexW(v.face); want = Math.atan2(tw.x - w.x, tw.z - w.z); }
      ud.rot = lerpAng(ud.rot, want, 1 - Math.exp(-dt * 8)); ud.fig.rotation.y = ud.rot;
      ud.fig.rotation.z = v.down ? Math.PI / 2 * 0.95 : 0; if (v.down) ud.fig.position.y = 0.12;
      const fade = v.alive ? (v.down ? 0.6 : 1) : Math.max(0, v.fade);
      ud.mat.opacity = fade; ud.mat.depthWrite = fade > 0.95;
      const fl = v.flash && now - v.flash < 260 ? 1 - (now - v.flash) / 260 : 0;
      if (ud.mat.emissive) ud.mat.emissive.setRGB(fl * 0.9, fl * 0.12, fl * 0.05);
      else { const b0 = ud.fig.userData.base; ud.mat.color.setRGB(b0.r * (1 + fl * 0.6), b0.g * (1 - fl * 0.6), b0.b * (1 - fl * 0.65)); }
      if (!v.down && v.alive && !v.px) ud.fig.scale.y = ud.sc * (1 + Math.sin(t * 2.4 + w.x) * 0.012);
      ud.ring.material.opacity = (u.defending && v.alive && !v.down ? 0.95 : 0.4) * fade;
      ud.ring.material.color.set(u.defending && v.alive && !v.down ? '#7ab0ff' : u.side === 'party' ? '#ffcf5a' : u.boss ? '#b25aff' : '#ff5a3a');
      ud.ring.rotation.z = t * 0.2;
      // labels: counts and health
      if (v.alive) {
        let html, cls;
        if (u.side === 'dm' && !u.boss) { html = `<b>${v.count}</b>`; cls = 'b-count'; if (u.count === 1 && u.maxHp >= 60) html += hpBar(v.hp / u.maxHp, 'm'); }
        else { const f = Math.max(0, v.hp / u.maxHp); html = hpBar(f, u.boss ? 'b' : f < 0.3 ? 'l' : f < 0.6 ? 'w' : 'g') + (v.down ? '<span class="dn">DOWN</span>' : ''); cls = 'b-hp'; }
        const L = label(BAT.labels, 'u' + u.id, cls, html); L.pos.set(w.x, ud.h + lift + 0.25, w.z);
      }
    }
    for (const [id, E] of BAT.units) if (!seen.has(id)) { BAT.scene.remove(E); BAT.units.delete(id); }
    // current unit ring
    const cur = hooks.curId();
    const ce = cur && BAT.units.get(cur);
    if (ce) { BAT.cur.visible = true; BAT.cur.position.set(ce.position.x, 0.06, ce.position.z); BAT.cur.rotation.z = t * 0.9; BAT.cur.material.opacity = 0.6 + 0.35 * Math.sin(t * 5); } else BAT.cur.visible = false;
    // traps
    for (const tr of b.traps) {
      const key = tr.k + ':' + (tr.sprung ? 1 : 0); let E = BAT.traps.get(tr.k);
      if (!E || E.key !== key) { if (E) BAT.scene.remove(E.g); const g = spikes(tr.sprung); const w = hexW(tr.k); g.position.set(w.x, 0, w.z); BAT.scene.add(g); E = { g, key }; BAT.traps.set(tr.k, E); }
    }
    for (const [k, E] of BAT.traps) if (!b.traps.some(tr => tr.k === k)) { BAT.scene.remove(E.g); BAT.traps.delete(k); }
    // overlay canvas
    drawOverlay(hooks.bspec());
    // effects and floating numbers
    updateFx(hooks.fx(), now);
    for (const f of hooks.floats()) {
      if (!f.battle) continue; const age = (now - f.t0) / 1400; if (age > 1 || age < 0) continue;
      const L = label(BAT.labels, 'f' + (f.id || (f.id = Math.random().toString(36).slice(2))), 'b-float', `<span style="color:${f.color}">${esc(f.text)}</span>`);
      const w = pxToW(f.x, f.y); L.pos.set(w.x, 2.2 + age * 1.2, w.z); L.el.style.opacity = (1 - age * age).toFixed(2);
    }
  }
  function hpBar(f, c) { return `<i class="hpb ${c}"><i style="width:${Math.round(clamp(f, 0, 1) * 100)}%"></i></i>`; }
  function spikes(sprung) {
    const b = new M.Builder(5);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = i % 3 === 0 ? 0 : 0.35; b.add(new T.ConeGeometry(0.06, sprung ? 0.12 : 0.36, 4), sprung ? '#6a2a22' : '#9a9088', { x: Math.cos(a) * r, y: sprung ? 0.04 : 0.16, z: Math.sin(a) * r, rz: sprung ? 1.2 : 0 }); }
    const g = new T.Group(); const m = new T.Mesh(b.build(), M.MAT.body); m.castShadow = true; g.add(m);
    const ring = M.circleMesh('#ff3a2a', 1.4, sprung ? 0.15 : 0.45); ring.position.y = 0.04; g.add(ring);
    return g;
  }
  function drawOverlay(sp) {
    if (!sp) return;
    if (sp.key === BAT.overlayKey) return; BAT.overlayKey = sp.key;
    const c = BAT.octx, s = BAT.oscale; c.clearRect(0, 0, BAT.ocv.width, BAT.ocv.height);
    const hex = (k, r) => { const w = hexW(k); c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const x = (w.x + r * Math.cos(a)) * s, y = (w.z + r * Math.sin(a)) * s; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); };
    for (let k = 0; k < G.BW * G.BH; k++) {
      hex(k, 0.97);
      const f = sp.fill && sp.fill[k]; if (f) { c.fillStyle = f; c.fill(); }
      c.strokeStyle = 'rgba(20,16,8,0.32)'; c.lineWidth = 2; c.stroke();
    }
    for (const o of sp.outline || []) { hex(o.k, 0.93); c.strokeStyle = o.c; c.lineWidth = o.w || 5; c.stroke(); }
    if (sp.line) { const a = hexW(sp.line.a), z = hexW(sp.line.b); c.strokeStyle = sp.line.c; c.lineWidth = 5; c.setLineDash(sp.line.dash ? [16, 12] : []); c.beginPath(); c.moveTo(a.x * s, a.z * s); c.lineTo(z.x * s, z.z * s); c.stroke(); c.setLineDash([]); }
    BAT.otex.needsUpdate = true;
  }
  // map 2D fx records (in virtual pixel space) onto 3D effects
  function updateFx(list, now) {
    const live = new Set();
    for (const f of list) {
      if (now < f.t0) continue; const tt = (now - f.t0) / f.dur; if (tt > 1) continue;
      live.add(f);
      let E = BAT.fx.get(f);
      if (!E) { E = makeFx(f); BAT.fx.set(f, E); if (E.obj) BAT.scene.add(E.obj); }
      E.update(tt);
    }
    for (const [f, E] of BAT.fx) if (!live.has(f)) { if (E.obj) BAT.scene.remove(E.obj); BAT.fx.delete(f); }
  }
  function makeFx(f) {
    const a = pxToW(f.x, f.y); const R = BAT.bf.R;
    const col = f.color || '#ffe9a8';
    if (f.kind === 'shot') {
      const z = pxToW(f.x2, f.y2 + R * 0.2); a.z += 0.2;
      const g = new T.Group(); const s = M.glowSprite(col, 0.9, 1); g.add(s); const core = M.glowSprite('#ffffff', 0.35, 1); g.add(core);
      const arc = (f.arc || 0.8) * 1.6;
      return { obj: g, update: t => { const q = Math.min(1, t * 1.3); g.position.set(a.x + (z.x - a.x) * q, 1.0 + Math.sin(q * Math.PI) * arc, a.z + (z.z - a.z) * q); g.visible = q < 1; } };
    }
    if (f.kind === 'bolt') {
      const z = pxToW(f.x2, f.y2); const pts = []; const n = 8;
      for (let i = 0; i <= n; i++) { const q = i / n; pts.push(new T.Vector3(a.x + (z.x - a.x) * q + (i && i < n ? Math.sin(i * 12.9 + f.seed) * 0.35 : 0), 1.0 + (i && i < n ? Math.cos(i * 7.3 + f.seed) * 0.3 : 0), a.z + (z.z - a.z) * q)); }
      const g = new T.Group();
      const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: new T.Color(col).multiplyScalar(2), transparent: true, blending: T.AdditiveBlending, toneMapped: false }));
      g.add(line); for (const p of [pts[0], pts[n]]) { const s = M.glowSprite('#9fd8ff', 1.2, 0.9); s.position.copy(p); g.add(s); }
      return { obj: g, update: t => { line.material.opacity = 1 - t * 0.7; g.children.forEach(c => { if (c.isSprite) c.material.opacity = 1 - t; }); } };
    }
    if (f.kind === 'boom' || f.kind === 'flame') {
      const g = new T.Group(); const s = M.glowSprite(f.kind === 'boom' ? '#ffb040' : '#ff7a2a', 1, 1); s.material = s.material.clone(); g.add(s);
      const s2 = M.glowSprite('#fff0b0', 1, 1); s2.material = s2.material.clone(); g.add(s2); g.position.set(a.x, 0.7, a.z);
      return { obj: g, update: t => { const r = f.kind === 'boom' ? 1.2 + t * 3.2 : 1.6 + Math.sin(t * 20) * 0.2; s.scale.set(r * 1.5, r * 1.5, 1); s2.scale.set(r * 0.7, r * 0.7, 1); s.material.opacity = 1 - t; s2.material.opacity = (1 - t) * 0.9; g.position.y = 0.7 + t * 0.5; } };
    }
    if (f.kind === 'heal') {
      const g = new T.Group(); const sps = [];
      for (let i = 0; i < 9; i++) { const s = M.glowSprite('#8dffa8', 0.32, 1); s.material = s.material.clone(); g.add(s); sps.push([s, i * 0.7 + f.seed, 0.3 + (i % 3) * 0.2]); }
      g.position.set(a.x, 0, a.z);
      return { obj: g, update: t => { for (const [s, ph, r] of sps) { s.position.set(Math.cos(ph + t * 3) * r, 0.3 + t * 2.0 + Math.sin(ph) * 0.2, Math.sin(ph + t * 3) * r); s.material.opacity = 1 - t; } } };
    }
    if (f.kind === 'ring') {
      const m = M.circleMesh(col, 1, 1); m.material = m.material.clone(); m.position.set(a.x, 0.08, a.z);
      return { obj: m, update: t => { const r = 1 + t * 10; m.scale.set(r, r, 1); m.material.opacity = 1 - t; } };
    }
    if (f.kind === 'holy') {
      const g = new T.Group();
      const beam = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 8, 12, 1, true), new T.MeshBasicMaterial({ color: new T.Color('#fff6c8'), transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      beam.position.y = 4; g.add(beam); const s = M.glowSprite('#fff6c8', 2.5, 1); s.material = s.material.clone(); s.position.y = 0.4; g.add(s); g.position.set(a.x, 0, a.z);
      return { obj: g, update: t => { beam.material.opacity = (1 - t) * 0.8; beam.scale.set(1 - t * 0.6, 1, 1 - t * 0.6); s.material.opacity = 1 - t; } };
    }
    return { obj: null, update: () => {} };
  }
  function pickHexPx(cx, cy) {
    if (!BAT.camera) return null;
    const p = planeHit(rayFrom(cx, cy, BAT.camera), 0); if (!p) return null;
    return { x: BAT.bf.x0 + p.x * BAT.bf.R, y: BAT.bf.y0 + p.z * BAT.bf.R };
  }
  function exitBattle() { disposeScene(BAT.scene); BAT.scene = null; for (const L of BAT.labels.values()) L.el.remove(); BAT.labels = new Map(); BAT.units = new Map(); BAT.fx = new Map(); }

  function disposeScene(sc) {
    if (!sc) return;
    sc.traverse(o => {
      if (o.isInstancedMesh || (o.isMesh && o.geometry && !o.geometry.userData.shared)) { /* model geometries are cached and shared; only dispose ground-level ones */ }
      if (o.userData && o.userData.disposeGeo && o.geometry) o.geometry.dispose();
    });
  }
  // minimap helper
  function minimapInfo() { return viewQuad(); }

  /* ================= the town views (0.20): Millbrook and the Dark Tower as small dioramas =================
     ui.js describes the scene once (ground, road, water, trees: enterTown(spec)) and, every frame, what stands where
     (hooks.townItems(): buildings, building sites, empty plots, figures). Buildings are the same pixel-art pictures as
     the map's, standing on their plots; one going up rises out of its scaffolding like a lair on the map. */
  const TWN = { scene: null, camera: null, spec: null, items: new Map(), figs: new Map(), U: null, live: false, t: 0, circle: null };
  const TFW = 18, TFH = 11; // the town's own ground: x 0..18, z 0..11 (the camera looks from +z)
  function enterTown(spec) {
    exitTown();
    TWN.spec = spec; TWN.live = false;
    const dark = spec.kind === 'tower';
    const scene = new T.Scene(); TWN.scene = scene;
    scene.background = new T.Color(spec.sky || (dark ? '#0b0a10' : '#121820'));
    scene.fog = new T.Fog(new T.Color(spec.fog || (dark ? '#241c2c' : '#3c4a5a')), 24, 58);
    const sunDir = new T.Vector3(-0.5, 1.0, 0.6).normalize(); TWN.lights = addLights(scene, sunDir); TWN.lights.dir = sunDir;
    if (spec.sun) TWN.lights.sun.color.set(spec.sun);
    if (dark) { TWN.lights.sun.intensity = 1.35; TWN.lights.hemi.intensity = 0.55; }
    followShadow(TWN.lights, TFW / 2, TFH / 2, 15);
    TWN.camera = new T.PerspectiveCamera(30, 1.6, 0.1, 200);
    if (canvas && canvas.clientWidth && canvas.clientHeight) TWN.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    TWN.camera.updateProjectionMatrix();
    const seed = (spec.seed || 1) % 100000; const R = M.rng(seed + 7);
    // ---- the ground: a flat valley floor, hills rising behind and to the sides, a dip for the water ----
    const GWd = 64, GHd = 44, X0 = TFW / 2 - GWd / 2, Z0 = TFH / 2 - GHd / 2 - 6;
    const pond = spec.pond, mounds = spec.mounds || [];
    const hf = (x, z) => {
      const dx = Math.max(0, Math.max(-x - 0.5, x - TFW - 0.5)), back = Math.max(0, -z - 0.2), front = Math.max(0, z - TFH - 1.5);
      let h = (fbm(x * 0.3, z * 0.3, seed, 3) - 0.5) * 0.14;
      h += smooth(clamp(back / 7, 0, 1)) * (2.4 + fbm(x * 0.15, z * 0.15, seed + 3, 3) * 2.2) + smooth(clamp(dx / 6, 0, 1)) * (1.4 + fbm(x * 0.2, z * 0.2, seed + 5, 2) * 1.2);
      h -= smooth(clamp(front / 8, 0, 1)) * 0.4;
      for (const m of mounds) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.r) h += m.h * smooth(1 - d / m.r); }
      if (pond) { const d = Math.hypot((x - pond.x) / pond.rx, (z - pond.z) / pond.rz); if (d < 1.25) h -= 0.42 * smooth(clamp((1.25 - d) / 0.45, 0, 1)); }
      return h;
    };
    TWN.hf = hf;
    const geo = new T.PlaneGeometry(GWd, GHd, 128, 88); geo.rotateX(-Math.PI / 2); geo.translate(X0 + GWd / 2, 0, Z0 + GHd / 2);
    const gp = geo.attributes.position; for (let i = 0; i < gp.count; i++) gp.setY(i, hf(gp.getX(i), gp.getZ(i))); geo.computeVertexNormals(); geo.userData.disposeGeo = true;
    // painted ground: the terrain's colours, the road and the square in packed earth or cobbles, a shore round the water
    const cw = 1024, ch = Math.round(cw * GHd / GWd); const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d');
    const TCs = dark ? (spec.groundCols || ['#3e3634', '#544842']) : ['#4c7228', '#628632'];
    const c0 = hexRGB(TCs[0]), c1 = hexRGB(TCs[1]); const im = c.createImageData(cw, ch); const dd = im.data;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const wx = X0 + x / cw * GWd, wz = Z0 + y / ch * GHd; const n = fbm(wx * 0.4, wz * 0.4, seed + 21, 3), n2 = vnoise(wx * 2.2, wz * 2.2, seed + 4);
      const f = 0.88 + n2 * 0.22; const o = (y * cw + x) * 4;
      dd[o] = (c0[0] + (c1[0] - c0[0]) * n) * f; dd[o + 1] = (c0[1] + (c1[1] - c0[1]) * n) * f; dd[o + 2] = (c0[2] + (c1[2] - c0[2]) * n) * f; dd[o + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    const PX = wx => (wx - X0) / GWd * cw, PZ = wz => (wz - Z0) / GHd * ch, PS = cw / GWd;
    for (let i = 0; i < 1600; i++) { c.fillStyle = R() < 0.5 ? 'rgba(20,30,10,0.16)' : 'rgba(255,255,220,0.08)'; c.fillRect(R() * cw, R() * ch, 1 + R() * 2, 1 + R() * 2); }
    const path = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w * PS; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(PX(x), PZ(z)) : c.moveTo(PX(x), PZ(z))); c.stroke(); };
    const roadCol = dark ? ['#2a2422', '#5a4c44', '#6c5c50'] : ['#6a5236', '#a8875a', '#c2a070'];
    if (spec.road) { path(spec.road, 1.5, roadCol[0]); path(spec.road, 1.2, roadCol[1]); path(spec.road, 0.7, roadCol[2]); }
    if (spec.plaza) { const P = spec.plaza; c.fillStyle = roadCol[0]; c.beginPath(); c.ellipse(PX(P.x), PZ(P.z), (P.r + 0.2) * PS, (P.r * 0.8 + 0.2) * PS, 0, 0, 7); c.fill(); c.fillStyle = roadCol[1]; c.beginPath(); c.ellipse(PX(P.x), PZ(P.z), P.r * PS, P.r * 0.8 * PS, 0, 0, 7); c.fill(); }
    for (const p of spec.paths || []) { path(p, 0.55, roadCol[0]); path(p, 0.36, roadCol[1]); }
    if (pond) { c.fillStyle = dark ? '#1e1a1a' : '#5e5a42'; c.beginPath(); c.ellipse(PX(pond.x), PZ(pond.z), pond.rx * 1.18 * PS, pond.rz * 1.18 * PS, 0, 0, 7); c.fill(); }
    const gt = new T.CanvasTexture(cv); gt.encoding = T.sRGBEncoding; gt.anisotropy = 4;
    // splat: the ground's own pattern, cobbles under the road and the square
    const sw = 192, sh = 132, sd = new Uint8Array(sw * sh * 4); const base = SPLAT[dark ? 'waste' : 'grass'];
    const nearPath = (pts, x, z) => { let best = 99; for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i]; const vx = bx - ax, vz = bz - az; const L = vx * vx + vz * vz || 1; const t = clamp(((x - ax) * vx + (z - az) * vz) / L, 0, 1); best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t)); } return best; };
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const wx = X0 + x / sw * GWd, wz = Z0 + y / sh * GHd; const o = (y * sw + x) * 4;
      let cob = 0; if (spec.road) cob = Math.max(cob, 1 - smooth(clamp((nearPath(spec.road, wx, wz) - 0.45) / 0.3, 0, 1)));
      if (spec.plaza) { const P = spec.plaza; cob = Math.max(cob, 1 - smooth(clamp((Math.hypot((wx - P.x) / P.r, (wz - P.z) / (P.r * 0.8)) - 0.85) / 0.2, 0, 1))); }
      const n = fbm(wx * 0.3, wz * 0.3, seed + 71, 3); const wear = clamp((n - 0.55) * 2, 0, 1) * 0.4;
      sd[o] = base[0] * (1 - cob) * (1 - wear) * 255; sd[o + 1] = Math.min(1, base[1] + wear) * (1 - cob * 0.5) * 255; sd[o + 2] = base[2] * 255; sd[o + 3] = cob * 255;
    }
    const stex = new T.DataTexture(sd, sw, sh, T.RGBAFormat); stex.magFilter = T.LinearFilter; stex.minFilter = T.LinearFilter; stex.needsUpdate = true;
    const U = { uDetail: { value: DETAIL }, uSnowLine: { value: 99 }, uTime: { value: 0 }, uPat: { value: PAT }, uSplat: { value: stex }, uSplatBox: { value: new T.Vector4(X0, Z0, GWd, GHd) } };
    TWN.U = U;
    const ground = new T.Mesh(geo, groundMaterial(gt, U, {})); ground.receiveShadow = true; scene.add(ground);
    // ---- water: a village pond, or the villain's pool (lava, poison, blood...) ----
    if (pond) {
      const wm = new T.MeshStandardMaterial({ color: lin(pond.color || '#2c5878'), roughness: pond.glow ? 0.5 : 0.1, metalness: pond.glow ? 0 : 0.3, transparent: true, opacity: 0.94 });
      if (pond.glow) { wm.emissive = new T.Color(pond.color || '#333').lerp(new T.Color(pond.glow), 0.3).convertSRGBToLinear(); wm.emissiveIntensity = 0.55; TWN.poolMat = wm; }
      const w = new T.Mesh(new T.CircleGeometry(1, 48), wm); w.rotation.x = -Math.PI / 2; w.scale.set(pond.rx * 1.05, pond.rz * 1.05, 1); w.position.set(pond.x, -0.16, pond.z); w.renderOrder = 0.2; scene.add(w); TWN.water = w;
      if (pond.glow) { const L = new T.PointLight(new T.Color(pond.glow), 1.6, 7, 2); L.position.set(pond.x, 0.8, pond.z); scene.add(L); TWN.poolLight = L; }
    }
    // ---- trees, bushes and rocks round the edge; crags and hills behind ----
    const keep = (spec.keepOut || []).concat(pond ? [[pond.x, pond.z, Math.max(pond.rx, pond.rz) + 0.6]] : []);
    const blocked = (x, z) => { if (spec.road && nearPath(spec.road, x, z) < 1.1) return true; if (spec.plaza && Math.hypot(x - spec.plaza.x, z - spec.plaza.z) < spec.plaza.r + 0.6) return true; for (const [kx, kz, kr] of keep) if (Math.hypot(x - kx, z - kz) < kr) return true; return false; };
    const deco = spec.deco || (dark ? ['dead', 'rock', 'crag', 'dead', 'rock'] : ['broad', 'broad', 'pine', 'bush', 'pine']);
    const buckets = {}; const put = (kind, x, z, sc) => { const v = Math.floor(R() * 3); (buckets[kind + v] = buckets[kind + v] || { kind, v, list: [] }).list.push([x, z, sc, R() * 6.3]); };
    for (let i = 0; i < 900; i++) {
      const x = X0 + 4 + R() * (GWd - 8), z = Z0 + 4 + R() * (GHd - 10);
      const dx = Math.max(0, Math.max(-x + 0.3, x - TFW + 0.3)), dz = Math.max(0, Math.max(-z + 0.6, z - TFH - 0.6)); const d = Math.hypot(dx, dz);
      if (d < 0.5 ? R() > 0.03 : R() > 1.25 - d * 0.1) continue;
      if (blocked(x, z) || z > TFH + 6) continue;
      // in front of the town only small things, so nothing big stands between the camera and the buildings
      const front = z > TFH - 0.8; const kind = deco[Math.floor(R() * deco.length)];
      if (front && (kind === 'crag' || Math.abs(x - TFW / 2) < 4.5)) continue;
      put(kind, x, z, front ? 1.3 + R() * 0.7 : 1.8 + R() * 1.6);
    }
    for (const [x, z, s, kind] of spec.trees || []) put(kind || deco[0], x, z, s || 2.2);
    const crag = spec.crag || (dark ? 'crag' : 'crag');
    for (let i = 0; i < 26; i++) { const x = X0 + 6 + R() * (GWd - 12), z = -3.5 - R() * 9; put(crag, x, z, 4 + R() * 5); }
    const tmat = M.painted({ sway: U.uTime, rough: 0.92 }); const tm = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), pp = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    for (const k of Object.keys(buckets)) {
      const B = buckets[k]; const mesh = new T.InstancedMesh(M.treeVariants(B.kind)[B.v], tmat, B.list.length);
      B.list.forEach(([x, z, sc, ry], i) => { q.setFromAxisAngle(up, ry); s.setScalar(sc); pp.set(x, hf(x, z) - 0.03, z); tm.compose(pp, q, s); mesh.setMatrixAt(i, tm); });
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    if (spec.glow) { const L = new T.PointLight(new T.Color(spec.glow), 1.2, 10, 2); L.position.set(spec.glowAt ? spec.glowAt[0] : TFW / 2, 2.2, spec.glowAt ? spec.glowAt[1] : 3); scene.add(L); }
    fitTownCamera();
  }
  function fitTownCamera() {
    const cam = TWN.camera; if (!cam) return;
    const pitch = 0.74, vf = cam.fov * Math.PI / 180 / 2, hfv = Math.atan(Math.tan(vf) * cam.aspect);
    // on a tall, narrow screen show the middle of the town larger rather than all of it tiny
    const hw = cam.aspect < 1.2 ? 6.2 : TFW / 2 - 0.6;
    const dW = hw / Math.tan(hfv), dH = (TFH / 2 + 2.2) / Math.tan(vf) * Math.sin(pitch) * 0.95;
    TWN.d = Math.max(dW, dH) * 0.97; TWN.pitch = pitch;
    placeTownCam(0);
    if (TWN.scene && TWN.scene.fog) { TWN.scene.fog.near = Math.max(24, TWN.d * 1.2); TWN.scene.fog.far = Math.max(58, TWN.d * 3); }
  }
  // a slow drift, so the town breathes
  function placeTownCam(t) {
    const cam = TWN.camera; const d = TWN.d, p = TWN.pitch; const sx = Math.sin(t * 0.05) * 0.35, sz = Math.sin(t * 0.037) * 0.15;
    cam.position.set(TFW / 2 + sx, d * Math.sin(p), TFH / 2 + 0.6 + d * Math.cos(p) + sz);
    // aimed a little high, so the tall buildings at the back keep their tops
    cam.lookAt(TFW / 2 + sx * 0.6, 0.9, TFH / 2 + 0.1); cam.updateMatrixWorld();
  }
  // a picture of a given width standing on the ground, facing the camera: a building, a banner, a pile of gold
  function townQuad(key, w, cvs) {
    let r = null;
    if (cvs) { r = cvs.__rec; if (!r) { const tex = new T.CanvasTexture(cvs); tex.encoding = T.sRGBEncoding; pixelTex(tex); r = cvs.__rec = { tex, pw: cvs.width, ph: cvs.height, u0: 0, u1: 1, v0: 0, v1: 1, cv: cvs }; } }
    else r = propTex(key);
    if (!r) return null;
    const k = w / r.pw, h = r.ph * k;
    const geo = new T.PlaneGeometry(w, h); geo.translate(0, h / 2, 0); geo.userData.disposeGeo = true;
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, r.u0 + uv.getX(i) * (r.u1 - r.u0)); uv.setY(i, r.v0 + uv.getY(i) * (r.v1 - r.v0)); } uv.needsUpdate = true;
    const mat = new T.MeshBasicMaterial({ map: r.tex, transparent: true, alphaTest: 0.1, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const qd = new T.Mesh(geo, mat); qd.renderOrder = 0.5; qd.userData = { still: true, anchor: w * 0.22 };
    return { q: qd, mat, rec: r, w, h };
  }
  function makeTownItem(it) {
    const g = new T.Group(); const u = g.userData = { id: it.id, mode: it.mode };
    const Q = townQuad(it.art, it.w, it.cv);
    if (it.mode === 'plot') {
      // an empty plot: a faint ring of stakes on the ground, and the building's ghost when you point at it
      const ring = M.circleMesh(it.ring || '#f0dca0', it.w * 0.8, 0.22); ring.position.y = 0.04; g.add(ring); u.ring = ring;
      if (Q) { Q.mat.color.set('#9fd0ff'); Q.mat.blending = T.AdditiveBlending; Q.mat.opacity = 0; Q.mat.alphaTest = 0.04; g.add(Q.q); SPR.list.add(Q.q); u.quad = Q.q; u.rec = Q.rec; u.ghostOnly = true; }
      return g;
    }
    if (!Q) return g;
    g.add(Q.q); SPR.list.add(Q.q); u.quad = Q.q; u.mat = Q.mat; u.rec = Q.rec; u.top = Q.h; u.base = Q.mat.color.clone();
    spriteRig(); const sh = new T.Mesh(SPR.shadow.geo, SPR.shadow.mat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.014; sh.scale.set(it.w * 0.85, it.w * 0.4, 1); g.add(sh);
    if (it.mode === 'site') {
      // going up: the finished picture shown as high as the work has got, a blue plan of the rest, scaffolding, dust
      const A = Q.q.userData.anchor;
      const gm = new T.MeshBasicMaterial({ map: Q.rec.tex, transparent: true, opacity: 0.5, color: new T.Color('#86b4f0'), alphaTest: 0.04, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      const gq = new T.Mesh(Q.q.geometry.clone(), gm); gq.geometry.userData.disposeGeo = true; gq.renderOrder = 0.5; gq.userData = { still: true, anchor: A - 0.02 }; g.add(gq); SPR.list.add(gq);
      const st = scaffoldTex(); const sw = it.w * 0.95, shh = st.ph * (sw / st.pw);
      const sg = new T.PlaneGeometry(sw, shh); sg.translate(0, shh / 2, 0); sg.userData.disposeGeo = true;
      const suv = sg.attributes.uv; for (let i = 0; i < suv.count; i++) { suv.setX(i, st.u0 + suv.getX(i) * (st.u1 - st.u0)); suv.setY(i, st.v0 + suv.getY(i) * (st.v1 - st.v0)); }
      const sq = new T.Mesh(sg, new T.MeshBasicMaterial({ map: st.tex, transparent: true, alphaTest: 0.1, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      sq.renderOrder = 0.5; sq.userData = { still: true, anchor: A + 0.03 }; g.add(sq); SPR.list.add(sq);
      const fx = workFx(8, 6); g.add(fx);
      Object.assign(u, { rise: { h: Q.h, w: it.w, sh: shh, v0: Q.rec.v0, v1: Q.rec.v1, p: -1 }, ghost: gq, scaf: sq, fx });
    }
    if (it.smoke) { const sm = smokeFx(); g.add(sm); u.smoke = sm; }
    return g;
  }
  // chimney smoke: grey puffs that drift up and fade
  function smokeFx() {
    const g = new T.Group(); const puffs = [];
    for (let i = 0; i < 6; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: puffTex().tex, color: new T.Color('#cfcac4'), transparent: true, depthWrite: false, toneMapped: false })); sp.renderOrder = 0.6; g.add(sp); puffs.push(sp); }
    g.userData = { puffs, seed: Math.random() * 10 }; return g;
  }
  function runSmoke(sm, t, x, y) {
    sm.userData.puffs.forEach((sp, i) => { const a = (t / 4.5 + i / 6 + sm.userData.seed) % 1; const sz = 0.18 + a * 0.5; sp.position.set(x + a * 0.35 + Math.sin(t + i) * 0.05, y + a * 1.3, 0.05); sp.scale.set(sz, sz, 1); sp.material.opacity = (a < 0.15 ? a / 0.15 : 1 - (a - 0.15) / 0.85) * 0.55; });
  }
  const _tq = new T.Vector3();
  function syncTown(t) {
    const V = hooks.townItems ? hooks.townItems() : null; if (!V || !TWN.scene) return;
    TWN.U.uTime.value = t; placeTownCam(t);
    if (TWN.poolLight) TWN.poolLight.intensity = 1.4 + Math.sin(t * 1.7) * 0.25 + Math.sin(t * 3.1) * 0.12;
    if (TWN.poolMat) TWN.poolMat.emissiveIntensity = 0.5 + 0.12 * Math.sin(t * 1.3);
    const seen = new Set();
    for (const it of V.items) {
      seen.add(it.id);
      const sig = (it.art || (it.cv ? 'cv' + (it.cv.__id || (it.cv.__id = Math.random())) : '')) + '|' + it.w.toFixed(2) + '|' + it.mode + '|' + (it.smoke ? 1 : 0);
      let E = TWN.items.get(it.id);
      if (E && E.sig !== sig) { TWN.scene.remove(E.g); TWN.items.delete(it.id); const grew = E.mode !== 'plot' || it.mode !== 'site'; E = null; if (TWN.live && grew && it.mode === 'built') TWN.pops.set(it.id, t); }
      if (!E) { const g = makeTownItem(it); E = { g, sig, mode: it.mode }; TWN.items.set(it.id, E); TWN.scene.add(g); }
      const g = E.g, u = g.userData;
      const y = (TWN.hf ? TWN.hf(it.x, it.z) : 0) - 0.02; g.position.set(it.x, y, it.z);
      // a building that has just appeared pops into place with a puff of dust
      const t0 = TWN.pops.get(it.id); let sc = 1;
      if (t0 !== undefined) { const k = (t - t0) / 0.9; if (k >= 1) TWN.pops.delete(it.id); else { sc = 1 + 0.12 * Math.sin(Math.PI * k) * (1 - k); if (!u.popFx) { u.popFx = workFx(10, 0); g.add(u.popFx); } runFx(u.popFx, t * 2.5, 1 - k, 0.1, it.w * 0.9, 1.5); } }
      else if (u.popFx) { g.remove(u.popFx); u.popFx = null; }
      g.scale.setScalar(sc * (it.scale || 1));
      if (u.rise) { setRise(u, clamp(it.p || 0, 0.04, 1)); fxOnQuad(u.fx, u.quad); runFx(u.fx, t, it.crew === false ? 0.3 : 1, u.rise.h * clamp(it.p || 0, 0.04, 1) * 0.8, it.w * 0.8, 1); }
      if (u.popFx) fxOnQuad(u.popFx, u.quad);
      if (u.ghostOnly) { const on = it.hi ? 0.55 + 0.12 * Math.sin(t * 4) : 0; u.quad.material.opacity = on; if (u.ring) u.ring.material.opacity = it.hi ? 0.6 : 0.2 + 0.06 * Math.sin(t * 2 + it.x); }
      else if (u.mat) { const k = it.hi ? 1.28 + 0.06 * Math.sin(t * 5) : 1; u.mat.color.copy(u.base || u.mat.color).multiplyScalar(k); if (it.dim) u.mat.color.multiplyScalar(0.55); }
      if (u.smoke) { fxOnQuad(u.smoke, u.quad); runSmoke(u.smoke, t, (it.smokeAt ? it.smokeAt[0] : 0.1) * it.w, (u.top || 1) * (it.smokeAt ? it.smokeAt[1] : 0.85)); }
    }
    for (const [id, E] of TWN.items) if (!seen.has(id)) { TWN.scene.remove(E.g); TWN.items.delete(id); }
    // people: the heroes in the square, the villain at the tower, minions about their work
    const fseen = new Set();
    for (const f of V.figs || []) {
      fseen.add(f.id); let E = TWN.figs.get(f.id);
      if (E && E.key !== f.key) { TWN.scene.remove(E.g); E = null; }
      if (!E) { const g = new T.Group(); const fig = figure(f.key, { lightScale: 0.8 }); g.add(fig); if (f.ghost && fig.userData.sprite) { const m = fig.userData.mat; m.depthWrite = false; m.blending = T.AdditiveBlending; m.color.set('#c99cff'); } E = { g, fig, key: f.key }; TWN.figs.set(f.id, E); TWN.scene.add(g); }
      const bob = f.bob ? Math.abs(Math.sin(t * 6 + f.x * 3)) * 0.05 : 0;
      E.g.position.set(f.x, (TWN.hf ? TWN.hf(f.x, f.z) : 0) + (f.lift || 0) + bob, f.z); E.g.rotation.y = f.face || 0; E.fig.scale.setScalar(f.s || 1);
      if (f.ghost && E.fig.userData.sprite) E.fig.userData.mat.opacity = f.ghost;
    }
    for (const [id, E] of TWN.figs) if (!fseen.has(id)) { TWN.scene.remove(E.g); TWN.figs.delete(id); }
    // the summoning circle at the tower
    const C = V.circle;
    if (C && !TWN.circle) { const g = new T.Group(); const ring = M.circleMesh(C.color || '#b468ff', C.r || 2, 0.7); ring.position.y = 0.05; g.add(ring); const glow = M.glowSprite(C.color || '#8a3aff', 1.6, 0.4); glow.position.y = 0.4; g.add(glow); const fx = workFx(0, 10, '#d4a4ff'); g.add(fx); TWN.scene.add(g); TWN.circle = { g, ring, glow, fx }; }
    if (!C && TWN.circle) { TWN.scene.remove(TWN.circle.g); TWN.circle = null; }
    if (TWN.circle) { const U2 = TWN.circle; U2.g.position.set(C.x, (TWN.hf ? TWN.hf(C.x, C.z) : 0), C.z); U2.ring.rotation.z = -t * (C.on ? 0.8 : 0.15); U2.ring.material.opacity = C.on ? 0.6 + 0.25 * Math.sin(t * 3) : 0.3; U2.glow.visible = !!C.on; U2.glow.scale.setScalar(1.2 + 0.2 * Math.sin(t * 3.1)); if (C.on) runFx(U2.fx, t, 1, 0.05, 1.1, 2.6); else runFx(U2.fx, t, 0, 0, 1, 1); }
    TWN.live = true;
  }
  TWN.pops = new Map();
  // what's under the pointer: the front-most building whose picture isn't see-through there
  const tRay = new T.Raycaster();
  function pickTown(cx, cy) {
    if (!TWN.camera || !canvas) return null;
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    tRay.setFromCamera(ndc, TWN.camera);
    // buildings first, then the ghosts of empty plots (which are invisible until pointed at)
    for (const ghosts of [false, true]) {
      const quads = []; for (const [id, E] of TWN.items) { const u = E.g.userData; if (u.quad && !!u.ghostOnly === ghosts) { u.quad.userData.pickId = id; quads.push(u.quad); } }
      for (const h of tRay.intersectObjects(quads, false)) {
        const rec = TWN.items.get(h.object.userData.pickId); if (!rec) continue; const R = rec.g.userData.rec;
        if (!h.uv || !R || alphaAt(R, h.uv.x, h.uv.y) > 24) return h.object.userData.pickId;
      }
    }
    // an empty plot: near its ring on the ground
    const p = planeHit(tRay.ray, 0.05); if (!p) return null;
    let best = null, bd = 9; for (const [id, E] of TWN.items) { if (E.mode !== 'plot') continue; const d = Math.hypot(E.g.position.x - p.x, (E.g.position.z - p.z) * 1.2); const rr = (E.g.userData.ring ? E.g.userData.ring.geometry.parameters.width * 0.5 : 1); if (d < rr && d < bd) { bd = d; best = id; } }
    return best;
  }
  // the alpha of a picture at a point, read from its canvas once and kept
  function alphaAt(R, u, v) {
    if (!R.alpha) { const img = R.cv || R.tex.image; if (!img || !img.getContext) return 255; R.alpha = { d: img.getContext('2d').getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height }; }
    const A = R.alpha; const x = clamp(Math.floor(u * A.w), 0, A.w - 1), y = clamp(Math.floor((1 - v) * A.h), 0, A.h - 1);
    return A.d[(y * A.w + x) * 4 + 3];
  }
  // where a spot in the town is on the screen (for cards and tips)
  function townScreen(x, z, y) { if (!TWN.camera) return null; const v = new T.Vector3(x, (TWN.hf ? TWN.hf(x, z) : 0) + (y || 0), z).project(TWN.camera); return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }; }
  function exitTown() {
    if (TWN.scene) disposeScene(TWN.scene);
    TWN.scene = null; TWN.items = new Map(); TWN.figs = new Map(); TWN.circle = null; TWN.water = null; TWN.poolLight = null; TWN.pops = new Map(); TWN.live = false;
  }

  return { _map: () => MAP, _bat: () => BAT, _spec: () => spec, _fn: () => frameNo, _mode: () => mode, _pause: v => { paused = !!v; }, supported, init, attach, resize, setMode, buildMap, setMapSpec, setSprites, setArt, refreshFigures, spritesOn: () => SPR.on, _spr: () => SPR, pickTile, pickMinion, inView, frameTiles, camState, camTo, dragStart, dragMove, dragEnd, zoomAt, pan, centerOn, ensureVisible, viewQuad: minimapInfo, enterBattle, exitBattle, pickHexPx, fitBattleCamera, enterTown, exitTown, pickTown, townScreen, _town: () => TWN, get canvas() { return canvas; }, get ready() { return !!renderer; } };
})();
