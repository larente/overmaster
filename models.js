/* Overmaster — procedural low-poly models for the 3D map and battlefield (three.js r128) */
const Models = (() => {
  'use strict';
  const T = window.THREE;
  if (!T) return null;
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const lin = hex => new T.Color(hex).convertSRGBToLinear();

  /* ---------- geometry builder: merges primitives into one vertex-coloured mesh ---------- */
  const UP = V3(0, 1, 0);
  // surface kinds, read by the painted shader to choose a texture pattern
  const SURF = { cloth: 0, stone: 1, wood: 2, roof: 3, metal: 4, skin: 5, leaf: 6, rock: 7, fur: 8, timber: 9, scale: 10 };
  class Builder {
    constructor(seed) { this.p = []; this.n = []; this.c = []; this.m = []; this.dm = 0; this.r = rng(seed || 7); }
    add(geo, color, o) {
      o = o || {};
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      const m = new T.Matrix4();
      const q = o.q || new T.Quaternion().setFromEuler(new T.Euler(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'XYZ'));
      const sc = o.s === undefined ? [1, 1, 1] : typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s;
      m.compose(V3(o.x || 0, o.y || 0, o.z || 0), q, V3(sc[0], sc[1], sc[2]));
      g.applyMatrix4(m);
      if (o.parent) g.applyMatrix4(o.parent);
      if (!g.attributes.normal) g.computeVertexNormals();
      const pos = g.attributes.position.array, nor = g.attributes.normal.array;
      const col = lin(color); const c2 = o.grad ? lin(o.grad[2]) : null;
      // per-face colour jitter is kept small: the painted shader supplies the texture now
      const j = (o.jit === undefined ? 0.07 : o.jit) * 0.35;
      const surf = o.m !== undefined ? o.m : geo.userData && geo.userData.m !== undefined ? geo.userData.m : this.dm;
      for (let i = 0; i < pos.length; i += 9) {
        const f = 1 + (this.r() - 0.5) * 2 * j;
        for (let k = 0; k < 3; k++) {
          const vi = i + k * 3;
          this.p.push(pos[vi], pos[vi + 1], pos[vi + 2]); this.n.push(nor[vi], nor[vi + 1], nor[vi + 2]); this.m.push(surf);
          let cr = col.r, cg = col.g, cb = col.b;
          if (c2) { const t = Math.max(0, Math.min(1, (pos[vi + 1] - o.grad[0]) / (o.grad[1] - o.grad[0]))); cr += (c2.r - cr) * t; cg += (c2.g - cg) * t; cb += (c2.b - cb) * t; }
          this.c.push(cr * f, cg * f, cb * f);
        }
      }
      g.dispose();
      return this;
    }
    // a limb from point a to point b
    seg(a, b, r0, r1, color, o) {
      const A = V3(a[0], a[1], a[2]), B = V3(b[0], b[1], b[2]);
      const d = B.clone().sub(A); const len = d.length();
      const q = new T.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
      const mid = A.clone().add(B).multiplyScalar(0.5);
      return this.add(new T.CylinderGeometry(r1, r0, len, (o && o.seg) || 6), color, Object.assign({}, o, { x: mid.x, y: mid.y, z: mid.z, q }));
    }
    get empty() { return !this.p.length; }
    // opts.ao bakes soft occlusion into the colours: dark at the feet, lighter towards the top,
    // and darker on faces that point at the ground (the way hand-painted RTS textures are lit)
    build(opts) {
      const g = new T.BufferGeometry();
      if (opts && opts.ao && this.p.length) {
        let y0 = Infinity, y1 = -Infinity;
        for (let i = 1; i < this.p.length; i += 3) { if (this.p[i] < y0) y0 = this.p[i]; if (this.p[i] > y1) y1 = this.p[i]; }
        const span = Math.max(0.02, Math.min((y1 - y0) * 0.5, opts.ao === true ? 0.3 : opts.ao));
        const floor = opts.aoMin === undefined ? 0.52 : opts.aoMin;
        for (let i = 0; i < this.p.length; i += 3) {
          const t = Math.max(0, Math.min(1, (this.p[i + 1] - y0) / span));
          let a = floor + (1 - floor) * t * t * (3 - 2 * t);
          const ny = this.n[i + 1]; if (ny < 0) a *= 1 + ny * 0.3;
          this.c[i] *= a; this.c[i + 1] *= a; this.c[i + 2] *= a;
        }
      }
      g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
      g.setAttribute('aSurf', new T.Float32BufferAttribute(this.m, 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    }
  }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s) => new T.CylinderGeometry(rt, rb, h, s || 7);
  const cone = (r, h, s) => new T.ConeGeometry(r, h, s || 7);
  const sph = (r, d) => new T.IcosahedronGeometry(r, d === undefined ? 1 : d);
  const dode = r => new T.DodecahedronGeometry(r, 0);
  function blob(r, seed, amp, detail) {
    const g = new T.IcosahedronGeometry(r, detail === undefined ? 1 : detail); const p = g.attributes.position; const R = rng(seed);
    const k = [R() * 10, R() * 10, R() * 10];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * 9.1 + k[0]) * Math.sin(y * 7.3 + k[1]) * Math.sin(z * 8.7 + k[2]) + 0.5 * Math.sin(x * 17 + y * 13 + k[2]);
      const f = 1 + n * (amp === undefined ? 0.18 : amp);
      p.setXYZ(i, x * f, y * f, z * f);
    }
    // radial normals give the blob a soft, rounded look even at low detail
    const nr = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const l = Math.hypot(x, y, z) || 1; nr[i * 3] = x / l; nr[i * 3 + 1] = y / l; nr[i * 3 + 2] = z / l; }
    g.setAttribute('normal', new T.BufferAttribute(nr, 3));
    return g;
  }
  function rock(r, seed, squash) {
    const g = new T.DodecahedronGeometry(r, 1); const p = g.attributes.position; const R = rng(seed);
    const k = [R() * 10, R() * 10, R() * 10];
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * 6 / r + k[0]) * Math.cos(z * 5 / r + k[1]) + 0.6 * Math.sin(y * 9 / r + k[2]);
      const f = 1 + n * 0.16;
      p.setXYZ(i, x * f, y * f * (squash || 0.75), z * f);
    }
    g.computeVertexNormals(); g.userData.m = SURF.rock;
    return g;
  }
  // a jagged rock spire: a low-poly cone with its rim and ridges pushed around
  function spire(r, h, seed) {
    const g = new T.ConeGeometry(r, h, 6, 3); g.translate(0, h / 2, 0); const p = g.attributes.position; const R = rng(seed);
    const k = [R() * 10, R() * 10];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > h * 0.98) { p.setX(i, x + (R() - 0.5) * r * 0.3); continue; }
      const n = Math.sin(x * 11 + k[0]) * Math.cos(z * 9 + k[1]) * 0.25 + Math.sin(y * 13 + k[0]) * 0.12;
      p.setXYZ(i, x * (1 + n), y * (1 + n * 0.3), z * (1 + n));
    }
    g.computeVertexNormals(); g.userData.m = SURF.rock; return g;
  }
  // a flat ring/plane shape lying on the ground
  function disc(r, s) { const g = new T.CircleGeometry(r, s || 16); g.rotateX(-Math.PI / 2); return g; }
  function prismRoof(w, h, d) {
    const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); g.userData.m = SURF.roof; return g;
  }

  /* ---------- grain texture: four tileable patterns in one RGBA image ----------
     r: soft fbm (brush grain), g: fine noise, b: cells (Worley F1), a: cell borders (F2 - F1) */
  function grainTexture(size, seed) {
    const d = new Uint8Array(size * size * 4); const R = rng(seed);
    const hash = (i, j, n, s) => { let h = Math.imul(((i % n) + n) % n, 374761393) + Math.imul(((j % n) + n) % n, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const sm = t => t * t * (3 - 2 * t);
    const vn = (x, y, n, s) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi); const a = hash(xi, yi, n, s), b = hash(xi + 1, yi, n, s), c = hash(xi, yi + 1, n, s), e = hash(xi + 1, yi + 1, n, s); return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v; };
    const N = 11; const pts = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([i + 0.15 + R() * 0.7, j + 0.15 + R() * 0.7]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let f = 0, amp = 0.5, tot = 0;
      for (let o = 0, n = 4; o < 5; o++, n *= 2) { f += vn(u * n, v * n, n, seed + o) * amp; tot += amp; amp *= 0.55; }
      f /= tot;
      const fine = vn(u * 64, v * 64, 64, seed + 9) * 0.6 + vn(u * 128, v * 128, 128, seed + 11) * 0.4;
      const cx = u * N, cy = v * N; const ix = Math.floor(cx), iy = Math.floor(cy); let d1 = 9, d2 = 9;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const gx = ix + i, gy = iy + j; const p = pts[(((gy % N) + N) % N) * N + (((gx % N) + N) % N)];
        const px = p[0] + (gx - (((gx % N) + N) % N)), py = p[1] + (gy - (((gy % N) + N) % N));
        const dd = Math.hypot(px - cx, py - cy); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
      }
      const o = (y * size + x) * 4;
      d[o] = Math.round(Math.min(1, Math.max(0, (f - 0.5) * 1.9 + 0.5)) * 255);
      d[o + 1] = Math.round(fine * 255);
      d[o + 2] = Math.round(Math.min(1, d1 / 0.75) * 255);
      d[o + 3] = Math.round(Math.min(1, (d2 - d1) / 0.6) * 255);
    }
    const t = new T.DataTexture(d, size, size, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  }
  const GRAIN = grainTexture(256, 5);

  /* ---------- the painted material ----------
     Vertex colours stay the base paint; the shader adds a texture chosen by surface kind
     (projected in the model's own space, so it scales with the model), plus a cool rim light. */
  const PAINT_VERT_HEAD = '#include <common>\nattribute float aSurf;\nvarying float vSurf;\nvarying vec3 vObjP;\nvarying vec3 vObjN;\n';
  const PAINT_FRAG_HEAD = '#include <common>\nuniform sampler2D uGrain;\nuniform vec3 uRim;\nvarying float vSurf;\nvarying vec3 vObjP;\nvarying vec3 vObjN;\n' +
    'float pHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n';
  const PAINT_FRAG = `
    float sk = floor(vSurf + 0.5);
    vec3 an = abs(normalize(vObjN)); an = an * an; an = an * an; an /= max(an.x + an.y + an.z, 1e-4);
    vec3 op = vObjP * 1.7;
    vec4 gr = texture2D(uGrain, op.zy) * an.x + texture2D(uGrain, op.xz) * an.y + texture2D(uGrain, op.xy) * an.z;
    vec2 hn = vObjN.xz; float hl = length(hn);
    float hc = hl > 0.15 ? dot(vObjP.xz, vec2(-hn.y, hn.x) / hl) : vObjP.x + vObjP.z;
    // one extra sample, its coordinates picked by the surface kind (stretched for wood grain and hair)
    vec2 auxUV = op.xz * 3.1 + op.y * 1.3;
    if (sk > 1.5 && sk < 2.5) auxUV = vec2(hc * 9.0, vObjP.y * 1.2);
    else if (sk > 7.5 && sk < 8.5) auxUV = vec2(hc * 16.0, vObjP.y * 2.4);
    vec4 aux = texture2D(uGrain, auxUV);
    float shade = 0.84 + 0.3 * gr.r + 0.1 * (gr.g - 0.5);
    vec3 tint = vec3(1.0);
    if (sk > 0.5 && sk < 1.5) { // masonry
      vec2 bp = an.y > 0.65 ? vObjP.xz * 26.0 : vec2(hc * 24.0, vObjP.y * 40.0);
      float row = floor(bp.y); bp.x += mod(row, 2.0) * 0.5;
      vec2 f = fract(bp); float h = pHash(floor(bp));
      float e = min(min(f.x, 1.0 - f.x) * 0.6, min(f.y, 1.0 - f.y)) + (gr.g - 0.5) * 0.06;
      float mortar = 1.0 - smoothstep(0.03, 0.1, e);
      shade = (0.78 + 0.32 * h) * (0.8 + 0.34 * gr.r) * (1.0 - 0.55 * mortar) * (0.94 + 0.12 * smoothstep(0.5, 0.0, f.y));
      tint = mix(vec3(1.0), vec3(0.95, 1.0, 0.9), gr.b * 0.5);
    } else if (sk > 1.5 && sk < 2.5) { // wood
      float streak = aux.g * 0.6 + aux.r * 0.4;
      shade = 0.62 + 0.62 * streak; shade *= 0.85 + 0.25 * gr.r;
    } else if (sk > 2.5 && sk < 3.5) { // roof shingles / slates
      vec2 sp = vec2(hc * 30.0, vObjP.y * 32.0); float row = floor(sp.y); sp.x += mod(row, 2.0) * 0.5 + pHash(vec2(row, 3.0)) * 0.3;
      vec2 f = fract(sp); float h = pHash(floor(sp));
      float gap = 1.0 - smoothstep(0.03, 0.09, min(f.x, 1.0 - f.x));
      shade = (0.8 + 0.34 * h) * mix(1.06, 0.52, smoothstep(0.5, 1.0, f.y)) * (1.0 - 0.45 * gap) * (0.86 + 0.26 * gr.r);
      shade += 0.12 * (1.0 - smoothstep(0.0, 0.1, f.y));
    } else if (sk > 3.5 && sk < 4.5) { // metal
      shade = 0.74 + 0.4 * gr.g * gr.r + 0.18 * gr.r;
    } else if (sk > 4.5 && sk < 5.5) { // skin
      shade = 0.95 + 0.1 * gr.r; tint = vec3(1.02, 0.99, 0.97);
    } else if (sk > 5.5 && sk < 6.5) { // foliage: clumps of leaves with dark gaps
      float leaf = 1.0 - smoothstep(0.08, 0.8, gr.b);
      float fine = aux.b;
      leaf = leaf * 0.7 + (1.0 - smoothstep(0.1, 0.9, fine)) * 0.3;
      shade = mix(0.5, 1.25, leaf) * (0.86 + 0.28 * gr.r);
      tint = mix(vec3(0.74, 0.9, 1.08), vec3(1.14, 1.08, 0.78), leaf);
    } else if (sk > 6.5 && sk < 7.5) { // natural rock: cracks and strata
      float crack = 1.0 - smoothstep(0.0, 0.08, gr.a + (gr.g - 0.5) * 0.04);
      float strata = 0.5 + 0.5 * sin(vObjP.y * 55.0 + gr.r * 7.0);
      shade = (0.62 + 0.6 * gr.r) * (1.0 - 0.55 * crack) * (0.88 + 0.14 * strata);
      tint = mix(vec3(1.04, 1.0, 0.95), vec3(0.92, 0.96, 1.04), gr.b);
    } else if (sk > 7.5 && sk < 8.5) { // fur, hair, thatch
      float st = aux.g;
      shade = (0.66 + 0.6 * st) * (0.86 + 0.24 * gr.r);
    } else if (sk > 8.5 && sk < 9.5) { // timber-framed plaster
      float bx = abs(fract(hc * 11.0) - 0.5);
      float by = abs(fract(vObjP.y * 9.0 + 0.05) - 0.5);
      float beam = max(1.0 - smoothstep(0.38, 0.42, 0.5 - bx), 1.0 - smoothstep(0.36, 0.41, 0.5 - by));
      beam *= step(an.y, 0.7);
      shade = 0.9 + 0.16 * gr.r;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.045, 0.025) * (0.7 + 0.6 * gr.g), beam);
      float plinth = 1.0 - smoothstep(0.03, 0.036, vObjP.y + (gr.g - 0.5) * 0.008);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.15, 0.13) * (0.7 + 0.6 * gr.r), plinth);
    } else if (sk > 9.5 && sk < 10.5) { // scales
      float sc = 1.0 - gr.b; float edge = 1.0 - smoothstep(0.0, 0.12, gr.a);
      shade = (0.6 + 0.6 * sc) * (1.0 - 0.45 * edge) * (0.9 + 0.2 * gr.r);
    }
    diffuseColor.rgb *= shade * tint;
  `;
  const PAINT_ROUGH = `
    if (sk > 3.5 && sk < 4.5) roughnessFactor = 0.32 + 0.3 * gr.g;
    else if (sk > 4.5 && sk < 5.5) roughnessFactor = 0.62;
    else roughnessFactor = clamp(roughnessFactor + (0.95 - shade) * 0.25, 0.55, 1.0);
  `;
  const PAINT_RIM = `
    #include <aomap_fragment>
    float rimF = pow(1.0 - saturate(dot(geometry.normal, geometry.viewDir)), 3.0);
    reflectedLight.indirectDiffuse += uRim * rimF * (0.35 + 0.65 * diffuseColor.rgb);
  `;
  const RIM = new T.Vector3(0.16, 0.19, 0.26);
  // opts.sway: a {value} time uniform makes instanced foliage sway in the wind
  function painted(opts) {
    opts = opts || {};
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: opts.rough || 0.86, metalness: 0, transparent: !!opts.transparent });
    const key = 'bts-paint' + (opts.sway ? '-sway' : '') + (opts.fog ? '-fog' : '');
    mat.customProgramCacheKey = () => key;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uGrain = { value: GRAIN }; sh.uniforms.uRim = { value: RIM };
      if (opts.sway) sh.uniforms.uTime = opts.sway;
      if (opts.fog) { sh.uniforms.uFog = opts.fog.uFog; sh.uniforms.uMapSize = opts.fog.uMapSize; }
      sh.vertexShader = sh.vertexShader.replace('#include <common>', PAINT_VERT_HEAD + (opts.sway ? 'uniform float uTime;\n' : '') + (opts.fog ? 'varying vec3 vFogW;\n' : ''))
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vObjP = position; vObjN = normal; vSurf = aSurf;` + (opts.sway ? `
          #ifdef USE_INSTANCING
          float ph = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 1.3;
          float sway = sin(uTime * 1.4 + ph) * 0.022 * max(0.0, transformed.y - 0.12);
          transformed.x += sway; transformed.z += sway * 0.6;
          #endif` : ''))
        .replace('#include <project_vertex>', '#include <project_vertex>' + (opts.fog ? `
          vec4 fw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
          fw = instanceMatrix * fw;
          #endif
          vFogW = (modelMatrix * fw).xyz;` : ''));
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', PAINT_FRAG_HEAD + (opts.fog ? 'uniform sampler2D uFog;\nuniform vec2 uMapSize;\nvarying vec3 vFogW;\n' : ''))
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + PAINT_FRAG)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + PAINT_ROUGH)
        .replace('#include <aomap_fragment>', PAINT_RIM);
      // the map's fog of war: dim where nobody of yours can see, near black where nobody has ever been
      if (opts.fog) sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          vec2 fv = texture2D(uFog, vFogW.xz / uMapSize).rg;
          float flum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
          vec3 fogc = mix(vec3(0.012, 0.012, 0.022), mix(vec3(flum), gl_FragColor.rgb, 0.3) * 0.42 + vec3(0.015, 0.02, 0.045), fv.g);
          gl_FragColor.rgb = mix(fogc, gl_FragColor.rgb, fv.r);`);
    };
    return mat;
  }
  const MAT = {
    body: painted(),
    glow: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  };

  /* ---------- glow sprite texture ---------- */
  function radialTex(stops) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [o, col] of stops) g.addColorStop(o, col);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    const t = new T.CanvasTexture(cv); return t;
  }
  const GLOW_TEX = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [0.6, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
  const spriteMats = {};
  function glowSprite(color, size, opacity) {
    const key = color + ':' + (opacity || 1);
    if (!spriteMats[key]) spriteMats[key] = new T.SpriteMaterial({ map: GLOW_TEX, color: new T.Color(color), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity || 1, toneMapped: false });
    const s = new T.Sprite(spriteMats[key]); s.scale.set(size, size, 1); return s;
  }

  /* ================= creatures and heroes ================= */
  // standing humanoid figurine; height H with feet at y = 0, facing +z
  function humanoid(b, g, o) {
    const H = o.h, sk = o.skin, cl = o.cloth, c2 = o.cloth2 || o.cloth;
    const bw = o.bulk || 1; // width factor
    const lx = 0.075 * H * bw, legH = (o.legs || 0.42) * H;
    const hunch = o.hunch || 0;
    // legs
    if (!o.robe) {
      b.seg([-lx, 0.02 * H, 0], [-lx * 0.9, legH, 0], 0.055 * H * bw, 0.065 * H * bw, o.legC || c2);
      b.seg([lx, 0.02 * H, 0], [lx * 0.9, legH, 0], 0.055 * H * bw, 0.065 * H * bw, o.legC || c2);
      for (const sx0 of [-lx, lx]) {
        b.add(box(0.1 * H * bw, 0.07 * H, 0.15 * H), o.boot || '#3a2a1c', { x: sx0, y: 0.035 * H, z: 0.025 * H, m: SURF.fur });
        b.add(cyl(0.066 * H * bw, 0.06 * H * bw, 0.05 * H, 8), o.boot || '#3a2a1c', { x: sx0 * 0.97, y: 0.1 * H, m: SURF.fur });
      }
    } else {
      b.add(cyl(0.12 * H * bw, 0.2 * H * bw, legH + 0.05 * H, 8), c2, { y: (legH + 0.05 * H) / 2 });
    }
    // torso
    const t0 = legH, t1 = legH + 0.32 * H;
    b.add(cyl(0.165 * H * bw, 0.12 * H * bw, t1 - t0, 9), cl, { y: (t0 + t1) / 2, z: hunch * 0.3 * H, rx: hunch });
    b.add(sph(0.15 * H * bw, 1), cl, { y: t1 - 0.1 * H, z: 0.025 * H + hunch * 0.45 * H, s: [1.08, 0.78, 0.78] }); // chest
    if (o.belly) b.add(sph(0.13 * H * bw, 1), sk, { y: t0 + 0.1 * H, z: 0.06 * H, s: [1, 0.9, 0.8], m: SURF.skin });
    if (o.belt) b.add(cyl(0.135 * H * bw, 0.135 * H * bw, 0.04 * H, 8), o.belt, { y: t0 + 0.03 * H });
    // head
    const hy = t1 + 0.11 * H, hz = hunch * 0.55 * H;
    if (o.skull) {
      b.add(sph(0.1 * H, 1), '#e8e0c8', { y: hy, z: hz });
      g.add(sph(0.022 * H, 0), o.eyes || '#3a0a0a', { x: -0.04 * H, y: hy + 0.01 * H, z: hz + 0.085 * H, jit: 0 });
      g.add(sph(0.022 * H, 0), o.eyes || '#3a0a0a', { x: 0.04 * H, y: hy + 0.01 * H, z: hz + 0.085 * H, jit: 0 });
    } else if (!o.noHead) {
      b.add(sph(0.105 * H * (o.headS || 1), 1), sk, { y: hy, z: hz, m: SURF.skin });
      if (o.eyes) {
        g.add(sph(0.018 * H, 0), o.eyes, { x: -0.038 * H, y: hy + 0.012 * H, z: hz + 0.09 * H, jit: 0 });
        g.add(sph(0.018 * H, 0), o.eyes, { x: 0.038 * H, y: hy + 0.012 * H, z: hz + 0.09 * H, jit: 0 });
      }
    }
    if (o.ears) { b.add(cone(0.035 * H, 0.16 * H, 4), sk, { x: -0.12 * H, y: hy + 0.03 * H, z: hz, rz: 1.25, m: SURF.skin }); b.add(cone(0.035 * H, 0.16 * H, 4), sk, { x: 0.12 * H, y: hy + 0.03 * H, z: hz, rz: -1.25, m: SURF.skin }); }
    if (o.nose) b.add(cone(0.03 * H, 0.09 * H, 5), sk, { y: hy, z: hz + 0.12 * H, rx: Math.PI / 2, m: SURF.skin });
    if (o.tusks) { b.add(cone(0.015 * H, 0.06 * H, 4), '#f2ead2', { x: -0.04 * H, y: hy - 0.05 * H, z: hz + 0.08 * H }); b.add(cone(0.015 * H, 0.06 * H, 4), '#f2ead2', { x: 0.04 * H, y: hy - 0.05 * H, z: hz + 0.08 * H }); }
    if (o.beard) b.add(cone(0.08 * H, 0.18 * H, 6), o.beard, { y: hy - 0.1 * H, z: hz + 0.05 * H, rx: Math.PI + 0.25, m: SURF.fur });
    if (o.hair) b.add(sph(0.11 * H, 1), o.hair, { y: hy + 0.03 * H, z: hz - 0.02 * H, s: [1.05, 0.9, 1.05], m: SURF.fur });
    if (o.hood) b.add(cone(0.14 * H, 0.3 * H, 7), o.hood, { y: hy + 0.06 * H, z: hz - 0.02 * H });
    if (o.hat) { b.add(cyl(0.2 * H, 0.2 * H, 0.015 * H, 10), o.hat, { y: hy + 0.07 * H, z: hz }); b.add(cone(0.1 * H, 0.32 * H, 8), o.hat, { y: hy + 0.23 * H, z: hz - 0.02 * H, rx: -0.2 }); }
    if (o.helm) { b.add(cyl(0.11 * H, 0.115 * H, 0.14 * H, 8), o.helm, { y: hy + 0.02 * H, z: hz, m: SURF.metal }); if (o.plume) b.add(cone(0.03 * H, 0.16 * H, 4), o.plume, { y: hy + 0.16 * H, z: hz - 0.03 * H }); }
    if (o.horns) { b.add(cone(0.03 * H, 0.14 * H, 5), o.horns, { x: -0.08 * H, y: hy + 0.1 * H, z: hz, rz: 0.5 }); b.add(cone(0.03 * H, 0.14 * H, 5), o.horns, { x: 0.08 * H, y: hy + 0.1 * H, z: hz, rz: -0.5 }); }
    if (o.crown) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.add(cone(0.02 * H, 0.09 * H, 4), o.crown, { x: Math.cos(a) * 0.085 * H, y: hy + 0.13 * H, z: hz + Math.sin(a) * 0.085 * H, m: SURF.metal }); } b.add(cyl(0.1 * H, 0.1 * H, 0.035 * H, 10), o.crown, { y: hy + 0.09 * H, z: hz, m: SURF.metal }); }
    // shoulders and arms
    const sy = t1 - 0.03 * H, sx = 0.17 * H * bw;
    if (o.pads) { b.add(sph(0.08 * H * bw, 1), o.pads, { x: -sx * 1.04, y: sy + 0.01 * H, s: [1.15, 0.8, 1.1], m: SURF.metal }); b.add(sph(0.08 * H * bw, 1), o.pads, { x: sx * 1.04, y: sy + 0.01 * H, s: [1.15, 0.8, 1.1], m: SURF.metal }); }
    else { b.add(sph(0.06 * H * bw, 1), o.bareArms ? sk : cl, { x: -sx, y: sy, m: o.bareArms ? SURF.skin : SURF.cloth }); b.add(sph(0.06 * H * bw, 1), o.bareArms ? sk : cl, { x: sx, y: sy, m: o.bareArms ? SURF.skin : SURF.cloth }); }
    const armL = (o.arms || 0.3) * H, ar = 0.045 * H * bw;
    const lHand = [-sx - 0.03 * H, sy - armL, 0.04 * H];
    const rHand = o.raise ? [sx + 0.05 * H, sy + 0.05 * H, 0.1 * H] : [sx + 0.03 * H, sy - armL * 0.9, 0.1 * H];
    const armM = o.bareArms && !o.armC ? SURF.skin : SURF.cloth;
    b.seg([-sx, sy, 0], lHand, ar, ar * 0.85, o.armC || (o.bareArms ? sk : cl), { m: armM });
    b.seg([sx, sy, 0], rHand, ar, ar * 0.85, o.armC || (o.bareArms ? sk : cl), { m: armM });
    b.add(sph(ar * 1.45, 1), sk, { x: lHand[0], y: lHand[1], z: lHand[2], m: SURF.skin });
    b.add(sph(ar * 1.45, 1), sk, { x: rHand[0], y: rHand[1], z: rHand[2], m: SURF.skin });
    // cape
    if (o.cape) b.add(box(0.3 * H * bw, (t1 - 0.12 * H), 0.02 * H), o.cape, { y: (t1 + 0.12 * H) / 2, z: -0.13 * H * bw, rx: 0.12 });
    // weapon in the right hand
    const [wx, wy, wz] = rHand;
    const HW = H * 1.25;
    switch (o.weapon) {
      case 'sword': b.add(box(0.03 * HW, 0.42 * HW, 0.012 * HW), '#c8ccd4', { x: wx, y: wy + 0.22 * HW, z: wz + 0.02 * HW, rx: 0.25, m: SURF.metal }); b.add(box(0.12 * HW, 0.025 * HW, 0.03 * HW), '#8a6a2a', { x: wx, y: wy + 0.02 * HW, z: wz, m: SURF.metal }); break;
      case 'great': b.add(box(0.045 * HW, 0.62 * HW, 0.015 * HW), o.blade || '#b8bcc8', { x: wx, y: wy + 0.3 * HW, z: wz + 0.04 * HW, rx: 0.2, m: SURF.metal }); b.add(box(0.16 * HW, 0.03 * HW, 0.04 * HW), '#4a3a5a', { x: wx, y: wy + 0.02 * HW, z: wz, m: SURF.metal }); break;
      case 'axe': b.seg([wx, wy - 0.05 * HW, wz], [wx, wy + 0.42 * HW, wz + 0.08 * HW], 0.016 * HW, 0.016 * HW, '#6a4a2a', { m: SURF.wood }); b.add(box(0.02 * HW, 0.16 * HW, 0.18 * HW), '#b8bcc2', { x: wx, y: wy + 0.36 * HW, z: wz + 0.14 * HW, rx: 0.15, m: SURF.metal }); break;
      case 'dagger': b.add(box(0.02 * HW, 0.16 * HW, 0.01 * HW), '#c8ccd4', { x: wx, y: wy + 0.08 * HW, z: wz + 0.04 * HW, rx: 0.6, m: SURF.metal }); b.add(box(0.02 * HW, 0.14 * HW, 0.01 * HW), '#c8ccd4', { x: lHand[0], y: lHand[1] + 0.07 * HW, z: lHand[2] + 0.04 * HW, rx: 0.6, m: SURF.metal }); break;
      case 'spear': b.seg([wx, wy - 0.25 * HW, wz - 0.05 * HW], [wx, wy + 0.45 * HW, wz + 0.1 * HW], 0.012 * HW, 0.012 * HW, '#7a5a32', { m: SURF.wood }); b.add(cone(0.025 * HW, 0.1 * HW, 4), '#b0b4b8', { x: wx, y: wy + 0.5 * HW, z: wz + 0.11 * HW, rx: 0.2, m: SURF.metal }); break;
      case 'mace': b.seg([wx, wy - 0.05 * HW, wz], [wx, wy + 0.28 * HW, wz + 0.06 * HW], 0.015 * HW, 0.015 * HW, '#8a6a3a', { m: SURF.wood }); b.add(dode(0.05 * HW), '#c6b26a', { x: wx, y: wy + 0.3 * HW, z: wz + 0.07 * HW, m: SURF.metal }); break;
      case 'club': b.seg([wx, wy - 0.06 * HW, wz], [wx, wy + 0.36 * HW, wz + 0.12 * HW], 0.025 * HW, 0.06 * HW, '#6a4a2a', { m: SURF.wood }); break;
      case 'staff': b.seg([wx, wy - 0.4 * HW, wz], [wx, wy + 0.42 * HW, wz], 0.014 * HW, 0.014 * HW, '#6a4a2a', { m: SURF.wood }); g.add(sph(0.05 * HW, 1), o.orb || '#8fd8ff', { x: wx, y: wy + 0.47 * HW, z: wz, jit: 0 }); break;
      case 'bow': {
        const arc = new T.TorusGeometry(0.22 * HW, 0.012 * HW, 4, 10, Math.PI * 0.95);
        b.add(arc, '#6a4a2a', { m: SURF.wood, x: lHand[0] - 0.01 * HW, y: lHand[1] + 0.02 * HW, z: lHand[2] + 0.06 * HW, rz: Math.PI / 2 + Math.PI * 0.025, ry: Math.PI / 2 });
        b.add(cyl(0.035 * HW, 0.03 * HW, 0.22 * HW, 6), '#5a3a22', { x: 0.06 * HW, y: t1 - 0.05 * HW, z: -0.14 * HW, rx: -0.3, rz: 0.3 });
        break;
      }
      case 'boulder': b.add(rock(0.12 * HW, 3), '#8a8270', { x: wx, y: wy + 0.12 * HW, z: wz + 0.04 * HW }); break;
      default: break;
    }
    if (o.shield) {
      const sg = o.shieldKind === 'tower' ? box(0.2 * H, 0.32 * H, 0.025 * H) : cyl(0.12 * H, 0.12 * H, 0.025 * H, 10);
      b.add(sg, o.shield, { m: SURF.metal, x: lHand[0] - 0.02 * H, y: lHand[1] + 0.1 * H, z: lHand[2] + 0.06 * H, rx: o.shieldKind === 'tower' ? 0 : Math.PI / 2, ry: 0.3 });
      if (o.emblem) g.add(o.shieldKind === 'tower' ? box(0.05 * H, 0.05 * H, 0.03 * H) : sph(0.03 * H, 0), o.emblem, { x: lHand[0] - 0.02 * H, y: lHand[1] + 0.1 * H, z: lHand[2] + 0.08 * H, jit: 0 });
    }
  }
  function quadruped(b, g, o) {
    const L = o.len, H = o.h;
    const by = H * 0.62;
    b.dm = SURF.fur;
    b.add(sph(L * 0.32, 1), o.fur, { y: by, s: [0.75, 0.62, 1.35] });
    b.add(sph(L * 0.22, 1), o.fur2 || o.fur, { y: by + 0.05 * H, z: L * 0.22, s: [0.85, 0.85, 0.9] }); // chest
    // head
    const hz = L * 0.5, hy = by + 0.18 * H;
    b.add(sph(L * 0.15, 1), o.fur, { y: hy, z: hz });
    b.add(box(L * 0.12, L * 0.1, L * 0.2), o.snoutC || o.fur, { y: hy - 0.03 * H, z: hz + L * 0.15 });
    b.add(sph(L * 0.025, 0), '#1a1414', { y: hy - 0.01 * H, z: hz + L * 0.26, jit: 0 });
    if (o.eyes) { g.add(sph(L * 0.025, 0), o.eyes, { x: -L * 0.06, y: hy + 0.03 * H, z: hz + L * 0.1, jit: 0 }); g.add(sph(L * 0.025, 0), o.eyes, { x: L * 0.06, y: hy + 0.03 * H, z: hz + L * 0.1, jit: 0 }); }
    b.add(cone(L * 0.05, L * 0.12, 4), o.fur, { x: -L * 0.07, y: hy + L * 0.13, z: hz - L * 0.02 });
    b.add(cone(L * 0.05, L * 0.12, 4), o.fur, { x: L * 0.07, y: hy + L * 0.13, z: hz - L * 0.02 });
    // legs
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.seg([x * L * 0.14, by - 0.05 * H, z * L * 0.28], [x * L * 0.15, 0.02, z * L * 0.3 + 0.02], L * 0.05, L * 0.04, o.legC || o.fur);
    // tail
    b.seg([0, by + 0.05 * H, -L * 0.42], [0, by + 0.2 * H, -L * 0.75], L * 0.06, L * 0.02, o.fur);
    b.dm = SURF.cloth;
  }
  function dragon(b, g, o) {
    const H = o.h; const c = o.scale, cb = o.belly; b.dm = SURF.scale;
    b.add(sph(H * 0.32, 1), c, { y: H * 0.42, s: [0.85, 0.75, 1.4] });
    b.add(sph(H * 0.22, 1), cb, { y: H * 0.36, z: H * 0.12, s: [0.8, 0.7, 1.1] });
    // neck & head
    b.seg([0, H * 0.5, H * 0.3], [0, H * 0.85, H * 0.5], H * 0.11, H * 0.08, c);
    b.add(sph(H * 0.12, 1), c, { y: H * 0.9, z: H * 0.58, s: [0.9, 0.8, 1.2] });
    b.add(box(H * 0.12, H * 0.08, H * 0.2), c, { y: H * 0.86, z: H * 0.74 });
    b.add(cone(H * 0.03, H * 0.16, 4), '#e8dcc0', { x: -H * 0.07, y: H * 1.0, z: H * 0.5, rx: -0.9 });
    b.add(cone(H * 0.03, H * 0.16, 4), '#e8dcc0', { x: H * 0.07, y: H * 1.0, z: H * 0.5, rx: -0.9 });
    g.add(sph(H * 0.025, 0), '#ffd23a', { x: -H * 0.06, y: H * 0.93, z: H * 0.68, jit: 0 });
    g.add(sph(H * 0.025, 0), '#ffd23a', { x: H * 0.06, y: H * 0.93, z: H * 0.68, jit: 0 });
    // spines
    for (let i = 0; i < 5; i++) b.add(cone(H * 0.035, H * 0.1, 4), '#3a1210', { y: H * (0.68 - i * 0.03), z: H * (0.2 - i * 0.16) });
    // legs
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.seg([x * H * 0.2, H * 0.36, z * H * 0.24], [x * H * 0.24, 0.02, z * H * 0.28 + H * 0.05], H * 0.07, H * 0.05, c);
    // tail
    let p = [0, H * 0.42, -H * 0.42];
    for (let i = 0; i < 4; i++) { const q = [Math.sin(i * 0.9) * H * 0.12, H * (0.36 - i * 0.07), p[2] - H * 0.2]; b.seg(p, q, H * (0.09 - i * 0.02), H * (0.07 - i * 0.02), c); p = q; }
    b.add(cone(H * 0.06, H * 0.14, 3), c, { x: p[0], y: p[1], z: p[2] - H * 0.05, rx: -Math.PI / 2 });
    // wings (membranes)
    const wing = side => {
      const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(H * 0.95, H * 0.35); s.lineTo(H * 0.85, -H * 0.05); s.lineTo(H * 0.6, -H * 0.12); s.lineTo(H * 0.35, -H * 0.2); s.closePath();
      const geo = new T.ShapeGeometry(s); const m = new T.Matrix4();
      const q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2 + 0.55, side < 0 ? Math.PI : 0, side * 0.35));
      m.compose(V3(side * H * 0.14, H * 0.62, H * 0.05), q, V3(1, 1, 1));
      const g2 = geo.toNonIndexed(); g2.applyMatrix4(m); g2.computeVertexNormals();
      // double-sided by duplicating with flipped winding
      const pa = g2.attributes.position.array; const flip = new Float32Array(pa.length);
      for (let i = 0; i < pa.length; i += 9) { flip.set(pa.subarray(i, i + 3), i); flip.set(pa.subarray(i + 6, i + 9), i + 3); flip.set(pa.subarray(i + 3, i + 6), i + 6); }
      const g3 = new T.BufferGeometry(); g3.setAttribute('position', new T.BufferAttribute(flip, 3)); g3.computeVertexNormals();
      b.add(g2, o.wing, { jit: 0.04 }); b.add(g3, o.wing, { jit: 0.04 });
      b.seg([side * H * 0.14, H * 0.62, H * 0.05], [side * H * 0.95 * Math.cos(0.35) + side * H * 0.14, H * 0.62 + H * 0.35 * 0.7, H * 0.05 + H * 0.35 * 0.5], H * 0.03, H * 0.015, c);
    };
    wing(1); wing(-1); b.dm = SURF.cloth;
  }
  function hydra(b, g, o) {
    const H = o.h; const c = '#3f7a5a', c2 = '#7ab88a'; b.dm = SURF.scale;
    b.add(sph(H * 0.36, 1), c, { y: H * 0.3, s: [1.1, 0.7, 1.25] });
    b.add(sph(H * 0.26, 1), c2, { y: H * 0.24, z: H * 0.1, s: [1, 0.6, 1] });
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.seg([x * H * 0.26, H * 0.24, z * H * 0.24], [x * H * 0.3, 0.02, z * H * 0.3], H * 0.08, H * 0.06, c);
    let p = [0, H * 0.3, -H * 0.4];
    for (let i = 0; i < 3; i++) { const q = [Math.sin(i) * H * 0.1, H * (0.24 - i * 0.07), p[2] - H * 0.2]; b.seg(p, q, H * (0.1 - i * 0.025), H * (0.08 - i * 0.025), c); p = q; }
    for (const [ax, lean] of [[-0.24, -0.5], [0, 0], [0.24, 0.5]]) {
      const base = [ax * H, H * 0.4, H * 0.25], top = [ax * H * 1.6 + lean * H * 0.15, H * 0.95 - Math.abs(lean) * H * 0.12, H * 0.5];
      b.seg(base, top, H * 0.085, H * 0.06, c);
      b.add(sph(H * 0.09, 1), c, { x: top[0], y: top[1] + H * 0.02, z: top[2] + H * 0.04, s: [0.9, 0.8, 1.3] });
      b.add(box(H * 0.08, H * 0.04, H * 0.12), c2, { x: top[0], y: top[1] - H * 0.02, z: top[2] + H * 0.13 });
      g.add(sph(H * 0.018, 0), '#ffe04a', { x: top[0] - H * 0.035, y: top[1] + H * 0.05, z: top[2] + H * 0.09, jit: 0 });
      g.add(sph(H * 0.018, 0), '#ffe04a', { x: top[0] + H * 0.035, y: top[1] + H * 0.05, z: top[2] + H * 0.09, jit: 0 });
    }
    b.dm = SURF.cloth;
  }
  function wraith(b, g, o) {
    const H = o.h;
    const cloak = new T.ConeGeometry(H * 0.2, H * 0.75, 9, 3, true);
    const p = cloak.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -H * 0.3) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y + Math.sin(a * 5) * H * 0.06); } }
    b.add(cloak, '#2a2e3e', { y: H * 0.5, jit: 0.12 });
    b.add(cone(H * 0.22, H * 0.5, 9, 1, true), '#3a3f55', { y: H * 0.42, rx: Math.PI, jit: 0.1 });
    b.add(sph(H * 0.11, 1), '#1a1c26', { y: H * 0.86, z: H * 0.02 });
    b.add(cone(H * 0.12, H * 0.22, 7), '#2a2e3e', { y: H * 0.94, z: -H * 0.02, rx: -0.25 });
    g.add(sph(H * 0.022, 0), '#9ff0ff', { x: -H * 0.035, y: H * 0.86, z: H * 0.1, jit: 0 });
    g.add(sph(H * 0.022, 0), '#9ff0ff', { x: H * 0.035, y: H * 0.86, z: H * 0.1, jit: 0 });
    b.seg([-H * 0.12, H * 0.72, 0], [-H * 0.3, H * 0.5, H * 0.15], H * 0.035, H * 0.02, '#2a2e3e');
    b.seg([H * 0.12, H * 0.72, 0], [H * 0.3, H * 0.5, H * 0.15], H * 0.035, H * 0.02, '#2a2e3e');
    g.add(sph(H * 0.03, 0), '#9ff0ff', { x: -H * 0.31, y: H * 0.49, z: H * 0.16, jit: 0 });
    g.add(sph(H * 0.03, 0), '#9ff0ff', { x: H * 0.31, y: H * 0.49, z: H * 0.16, jit: 0 });
  }

  function dragonWings(b, H, col, y) {
    for (const side of [1, -1]) {
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(H * 0.6, H * 0.4); sh.lineTo(H * 0.55, H * 0.02); sh.lineTo(H * 0.35, -H * 0.1); sh.closePath();
      const g2 = new T.ShapeGeometry(sh).toNonIndexed(); const m = new T.Matrix4();
      m.compose(V3(side * H * 0.12, H * y, -H * 0.1), new T.Quaternion().setFromEuler(new T.Euler(0.3, side < 0 ? Math.PI + 0.5 : -0.5, side * 0.3)), V3(1, 1, 1));
      g2.applyMatrix4(m); g2.computeVertexNormals(); b.add(g2, col, { jit: 0.05 });
      const pa = g2.attributes.position.array; const fl = new Float32Array(pa.length);
      for (let i = 0; i < pa.length; i += 9) { fl.set(pa.subarray(i, i + 3), i); fl.set(pa.subarray(i + 6, i + 9), i + 3); fl.set(pa.subarray(i + 3, i + 6), i + 6); }
      const g3 = new T.BufferGeometry(); g3.setAttribute('position', new T.BufferAttribute(fl, 3)); g3.computeVertexNormals(); b.add(g3, col, { jit: 0.05 });
    }
  }
  // every blueprint: { body, glow, lights: [[x,y,z,color,size]], h, float }
  const UNIT_DEF = {
    // the villains' minions: small, with a tool, and a sack on the back
    'm-thrall': (b, g) => { humanoid(b, g, { h: 0.42, skin: '#e8e0c8', cloth: '#5a4a38', cloth2: '#4a3a2a', skull: true, bulk: 0.72, weapon: 'axe', eyes: '#7ad0ff', boot: '#d8d0b8', armC: '#e0d8c0' }); b.add(sph(0.09, 1), '#8a7050', { y: 0.27, z: -0.08, s: [1, 1.1, 0.8], m: SURF.cloth }); },
    'm-kobold': (b, g) => { humanoid(b, g, { h: 0.36, skin: '#b0562a', cloth: '#6a4a2a', cloth2: '#4a3020', nose: true, horns: '#e8d9a8', headS: 1.15, legs: 0.38, weapon: 'axe', eyes: '#f2c13a', bulk: 0.9 }); b.add(sph(0.08, 1), '#8a7050', { y: 0.22, z: -0.07, s: [1, 1.1, 0.8], m: SURF.cloth }); },
    'm-imp': (b, g) => { humanoid(b, g, { h: 0.34, skin: '#c8402a', cloth: '#3a1a14', cloth2: '#2a100c', horns: '#2a1a14', bareArms: true, weapon: 'spear', eyes: '#ffd23a', bulk: 0.85 }); dragonWings(b, 0.34, '#5a1410', 0.62); },
    'm-golem': (b, g) => { humanoid(b, g, { h: 0.46, skin: '#a8744a', cloth: '#9a6a40', cloth2: '#8a5a34', bulk: 1.3, bareArms: true, weapon: 'club', eyes: '#8ad0ff', emblem: '#e8c35a' }); },
    'm-ghoul': (b, g) => { humanoid(b, g, { h: 0.44, skin: '#c8c0b8', cloth: '#3a1620', cloth2: '#24101a', hood: '#3a1620', weapon: 'axe', eyes: '#c03030', hunch: 0.25, belt: '#c8a040' }); b.add(sph(0.09, 1), '#6a5040', { y: 0.27, z: -0.09, s: [1, 1.1, 0.8], m: SURF.cloth }); },
    'm-digger': (b, g) => { humanoid(b, g, { h: 0.46, skin: '#9aa08a', cloth: '#3a3a30', cloth2: '#26261e', hood: '#3a3a30', weapon: 'axe', eyes: '#ffb03a', hunch: 0.2 }); b.add(sph(0.09, 1), '#5a5040', { y: 0.28, z: -0.09, s: [1, 1.1, 0.8], m: SURF.cloth }); },
    goblin: (b, g) => humanoid(b, g, { h: 0.42, skin: '#7fa83a', cloth: '#7a5232', cloth2: '#5a3a24', ears: true, nose: true, weapon: 'spear', eyes: '#ffe14a', headS: 1.15, legs: 0.36, bulk: 0.9 }),
    wolf: (b, g) => quadruped(b, g, { len: 0.62, h: 0.42, fur: '#8a8a90', fur2: '#c8c4bc', eyes: '#ffd23a' }),
    bandit: (b, g) => humanoid(b, g, { h: 0.55, skin: '#c89070', cloth: '#5a3e24', cloth2: '#3e2a18', hood: '#4e3620', cape: '#4a3220', weapon: 'bow', belt: '#2a1a0e', bulk: 0.95, eyes: '#1e140c' }),
    skeleton: (b, g) => humanoid(b, g, { h: 0.52, skin: '#e8e0c8', cloth: '#d8d0b8', cloth2: '#c8c0a8', skull: true, bulk: 0.7, weapon: 'sword', shield: '#6a5a3a', eyes: '#ff5a2a', boot: '#d8d0b8', armC: '#e0d8c0' }),
    orc: (b, g) => humanoid(b, g, { h: 0.56, skin: '#5f8048', cloth: '#6a4a2e', cloth2: '#4a3424', tusks: true, weapon: 'bow', pads: '#8a7a5a', belt: '#3a2a1a', bulk: 1.05, eyes: '#ff9a3a' }),
    ogre: (b, g) => humanoid(b, g, { h: 0.78, skin: '#c8a074', cloth: '#7a5a3a', cloth2: '#5a4028', belly: true, bulk: 1.45, weapon: 'club', bareArms: true, legs: 0.38, nose: true, horns: '#e8dcc0' }),
    wraith: (b, g) => wraith(b, g, { h: 0.66 }),
    troll: (b, g) => humanoid(b, g, { h: 0.82, skin: '#6f8a6a', cloth: '#4a5a3a', cloth2: '#3a4630', bulk: 1.2, hunch: 0.35, arms: 0.42, nose: true, tusks: true, bareArms: true, weapon: 'club', hair: '#2a3a2a', eyes: '#ffe14a' }),
    giant: (b, g) => humanoid(b, g, { h: 1.05, skin: '#d4a882', cloth: '#7a6248', cloth2: '#5a4a38', bulk: 1.35, beard: '#8a5a3a', hair: '#8a5a3a', weapon: 'boulder', raise: true, bareArms: true, belt: '#4a3424' }),
    dragon: (b, g) => dragon(b, g, { h: 0.85, scale: '#b8372a', belly: '#e0a050', wing: '#8a2a22' }),
    knight: (b, g) => humanoid(b, g, { h: 0.6, skin: '#2a2a34', cloth: '#3a3a48', cloth2: '#2a2a36', helm: '#3a3a48', plume: '#6a2a8a', pads: '#4a4a5a', weapon: 'sword', shield: '#2a2a36', shieldKind: 'tower', emblem: '#c06cff', eyes: '#c06cff', noHead: false, cape: '#3a1a4a' }),
    vampire: (b, g) => humanoid(b, g, { h: 0.62, skin: '#e8dce4', cloth: '#1a1018', cloth2: '#14101a', hair: '#14101a', cape: '#7a1020', pads: '#5a0e16', weapon: 'sword', eyes: '#ff2a3a', bulk: 0.95 }),
    hydra: (b, g) => hydra(b, g, { h: 0.8 }),
    demon: (b, g) => { humanoid(b, g, { h: 1.05, skin: '#b02a1e', cloth: '#3a1a14', cloth2: '#2a120e', horns: '#2a1a14', bulk: 1.35, weapon: 'great', blade: '#ff7a2a', eyes: '#ffd23a', bareArms: true, belt: '#1a0a08' }); dragonWings(b, 1.05, '#5a1410', 0.62); },
    // the other Big Bads (the lich keeps 'king')
    wyrm: (b, g) => dragon(b, g, { h: 1.0, scale: '#4a4856', belly: '#8a7a68', wing: '#2e2c38' }),
    archfiend: (b, g) => { humanoid(b, g, { h: 1.1, skin: '#5a1a3a', cloth: '#2a0a1a', cloth2: '#1a0610', horns: '#c8a040', crown: '#c8a040', bulk: 1.35, weapon: 'great', blade: '#ff4a2a', eyes: '#ff5a2a', bareArms: true, belt: '#1a0a08' }); dragonWings(b, 1.1, '#3a0a1a', 0.62); },
    archmage: (b, g) => humanoid(b, g, { h: 0.72, skin: '#e8d0c0', cloth: '#3a2460', cloth2: '#2a1a48', robe: true, hood: '#3a2460', weapon: 'staff', orb: '#c9a0ff', eyes: '#c9a0ff', cape: '#2a1a48', emblem: '#fff0a0' }),
    vlord: (b, g) => humanoid(b, g, { h: 0.74, skin: '#e8dce4', cloth: '#1a1018', cloth2: '#14101a', hair: '#14101a', cape: '#8a1020', pads: '#5a0e16', crown: '#c8a040', weapon: 'sword', eyes: '#ff2a3a', bulk: 1.02 }),
    dknight: (b, g) => humanoid(b, g, { h: 0.8, skin: '#1a1a20', cloth: '#24222a', cloth2: '#1a1820', helm: '#24222a', horns: '#d8cfc0', pads: '#3a3440', weapon: 'great', blade: '#ff6a2a', eyes: '#ff7a2a', cape: '#3a0a0a', bulk: 1.2 }),
    king: (b, g) => humanoid(b, g, { h: 0.78, skin: '#4a4058', cloth: '#2a2236', cloth2: '#1e1828', helm: null, crown: '#d8b040', pads: '#5a4a6a', weapon: 'great', blade: '#9a8ad0', cape: '#6a1a2a', eyes: '#ff4ad8', bulk: 1.15 }),
    barbarian: (b, g) => humanoid(b, g, { h: 0.6, skin: '#e0a882', cloth: '#7a5a3a', cloth2: '#5a4630', hair: '#c4542a', beard: '#c4542a', bareArms: true, weapon: 'axe', belt: '#3a2a1a', pads: '#d8d0c0', bulk: 1.15 }),
    rogue: (b, g) => humanoid(b, g, { h: 0.55, skin: '#e8b890', cloth: '#2f4a32', cloth2: '#2a2a2a', hood: '#24402a', cape: '#24402a', weapon: 'dagger', bulk: 0.9 }),
    cleric: (b, g) => humanoid(b, g, { h: 0.56, skin: '#f0c8a0', cloth: '#e8e4d8', cloth2: '#d8d2c0', robe: true, hair: '#e8d090', weapon: 'mace', shield: '#d8b040', emblem: '#fff4b0', belt: '#c8a040' }),
    wizard: (b, g) => humanoid(b, g, { h: 0.58, skin: '#f0c8a0', cloth: '#3a5aa8', cloth2: '#2a4488', robe: true, hat: '#2a4488', beard: '#e8e8f0', weapon: 'staff', orb: '#8fe0ff' })
  };
  const UNIT_LIGHTS = { wraith: [[0, 0.55, 0, '#7ad8ff', 0.9]], dragon: [], king: [[0, 0.5, 0, '#b05aff', 1.6]], knight: [], wizard: [[0.12, 0.85, 0.06, '#8fe0ff', 0.35]], archmage: [[0.14, 1.02, 0.08, '#c9a0ff', 0.6], [0, 0.55, 0, '#7a5aff', 1.4]], archfiend: [[0, 0.7, 0, '#ff4a2a', 1.8]], wyrm: [[0, 0.5, 0.3, '#ff7a2a', 0.8]], vlord: [[0, 0.5, 0, '#ff2a3a', 1.2]], dknight: [[0, 0.55, 0, '#ff6a2a', 1.3]] };
  /* ---------- heroes from the roster: class kit, race build, their own colors ---------- */
  const dkr = (hex, f) => { const n = parseInt(String(hex || '#777777').slice(1), 16); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join(''); };
  const RACE_BUILD = { human: { h: 1, bulk: 1 }, elf: { h: 1.06, bulk: 0.88, ears: true }, dwarf: { h: 0.78, bulk: 1.3 }, halfling: { h: 0.72, bulk: 0.96, headS: 1.18, legs: 0.36 }, halforc: { h: 1.05, bulk: 1.16, tusks: true } };
  function heroOpts(r) {
    const L = r.look || {}; const R = RACE_BUILD[r.race] || RACE_BUILD.human;
    const skin = L.skin || '#e0b08a', hair = L.hair || '#5a3a20', cloth = L.cloth || '#6a4a2a', trim = L.trim || '#d8c090';
    const base = {
      barbarian: { h: 0.6, cloth: dkr(cloth, 1), cloth2: dkr(cloth, 0.75), bareArms: true, weapon: 'axe', belt: '#3a2a1a', pads: trim, bulk: 1.15, hair, helm: '#7b848e', horns: '#efe6d0' },
      rogue: { h: 0.55, cloth, cloth2: '#2a2a2a', hood: dkr(cloth, 0.85), cape: dkr(cloth, 0.8), weapon: 'dagger', bulk: 0.9 },
      cleric: { h: 0.56, cloth, cloth2: dkr(cloth, 0.92), robe: true, hair, weapon: 'mace', shield: trim, emblem: '#fff4b0', belt: trim },
      wizard: { h: 0.58, cloth, cloth2: dkr(cloth, 0.8), robe: true, hat: dkr(cloth, 0.85), weapon: 'staff', orb: '#8fe0ff' }
    }[r.cls] || {};
    const o = Object.assign({}, base, { skin, h: base.h * R.h, bulk: (base.bulk || 1) * R.bulk });
    if (R.ears) o.ears = true; if (R.tusks) o.tusks = true; if (R.headS) o.headS = R.headS; if (R.legs) o.legs = R.legs;
    if (L.beard) o.beard = L.beard; else if (r.race === 'dwarf' && r.cls === 'barbarian') o.beard = hair;
    if (r.cls === 'barbarian' && r.race === 'elf') { o.helm = null; o.horns = null; }
    return o;
  }
  function defineHero(r) {
    const key = 'hero-' + r.id; if (UNIT_DEF[key]) return 'unit-' + key;
    const o = heroOpts(r);
    UNIT_DEF[key] = (b, g) => humanoid(b, g, o);
    if (r.cls === 'wizard') { const k = o.h / 0.58; UNIT_LIGHTS[key] = [[0.12 * k, 0.85 * k, 0.06 * k, '#8fe0ff', 0.35]]; }
    return 'unit-' + key;
  }
  if (typeof Game !== 'undefined') for (const r of Game.ROSTER) defineHero(r);

  /* ================= map props ================= */
  const P = {};
  // houses
  function house(b, x, z, w, d, h, wall, roof, ry) {
    const m = new T.Matrix4().makeRotationY(ry || 0).setPosition(x, 0, z);
    b.add(box(w, h, d), wall, { y: h / 2, parent: m, m: SURF.timber });
    b.add(prismRoof(w * 1.15, h * 0.75, d * 1.1), roof, { y: h, parent: m });
    b.add(box(w * 0.22, h * 0.45, 0.01), '#3a2818', { y: h * 0.22, z: d / 2 + 0.005, parent: m, jit: 0, m: SURF.wood });
  }
  P.town = (b, g, L) => {
    // walls
    const R = 1.05, n = 14;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2; if (i === 3 || i === 10) continue;
      const a2 = (i + 1) / n * Math.PI * 2; const am = (a + a2) / 2; const len = 2 * R * Math.sin(Math.PI / n);
      b.add(box(len * 1.02, 0.18, 0.08), '#9a8f7c', { x: Math.cos(am) * R, y: 0.09, z: Math.sin(am) * R, ry: -am + Math.PI / 2, m: SURF.stone });
      b.add(cyl(0.065, 0.075, 0.26, 8), '#8e836f', { x: Math.cos(a) * R, y: 0.13, z: Math.sin(a) * R, m: SURF.stone });
      b.add(cone(0.09, 0.12, 8), '#5a3226', { x: Math.cos(a) * R, y: 0.32, z: Math.sin(a) * R, m: SURF.roof });
    }
    // keep
    b.add(box(0.34, 0.6, 0.34), '#ada391', { y: 0.3, z: -0.25, m: SURF.stone });
    b.add(cone(0.3, 0.32, 4), '#743226', { y: 0.76, z: -0.25, ry: Math.PI / 4, m: SURF.roof });
    for (const [x, z] of [[-0.17, -0.42], [0.17, -0.42], [-0.17, -0.08], [0.17, -0.08]]) { b.add(cyl(0.06, 0.062, 0.72, 9), '#a29884', { x, y: 0.36, z, m: SURF.stone }); b.add(cone(0.08, 0.2, 9), '#26406a', { x, y: 0.82, z, m: SURF.roof }); }
    b.seg([0, 0.9, -0.25], [0, 1.15, -0.25], 0.008, 0.008, '#3a2a1a');
    b.add(box(0.16, 0.08, 0.005), '#c83a2a', { x: 0.08, y: 1.1, z: -0.25, jit: 0 });
    g.add(box(0.05, 0.07, 0.01), '#ffd27a', { y: 0.42, z: -0.075, jit: 0 });
    // houses
    const H = [[-0.55, 0.15, 0.26, 0.2, 0.2, '#d6c9aa', '#7e3022', 0.3], [-0.45, 0.55, 0.22, 0.2, 0.18, '#cabd9e', '#3a4a72', -0.2], [0.55, 0.2, 0.26, 0.22, 0.22, '#d0c2a4', '#743222', -0.4], [0.4, 0.6, 0.24, 0.2, 0.18, '#d6c9aa', '#6a4024', 0.5], [0.05, 0.45, 0.22, 0.2, 0.2, '#c4b698', '#7e3022', 0], [-0.62, -0.35, 0.2, 0.18, 0.18, '#d0c2a4', '#3a4a72', 0.8], [0.62, -0.32, 0.2, 0.2, 0.18, '#cabd9e', '#743222', -0.7]];
    for (const [x, z, w, d, h, wc, rc, ry] of H) house(b, x, z, w, d, h, wc, rc, ry);
    // windmill
    b.add(cyl(0.08, 0.12, 0.5, 10), '#c8bca6', { x: 0.62, y: 0.25, z: 0.7, m: SURF.stone }); b.add(cone(0.11, 0.14, 10), '#6a4024', { x: 0.62, y: 0.57, z: 0.7, m: SURF.roof });
    // market square well
    b.add(cyl(0.06, 0.06, 0.06, 8), '#8a8274', { x: 0, y: 0.03, z: 0.1, m: SURF.stone });
    L.push([0.3, 0.4, 0.3, '#ffcf7a', 0.35], [-0.35, 0.35, 0.4, '#ffcf7a', 0.3], [0, 0.42, -0.08, '#ffd27a', 0.3]);
  };
  P.townMill = () => { const b = new Builder(5); for (let i = 0; i < 4; i++) b.add(box(0.04, 0.34, 0.01), '#e8dcc8', { y: 0.17, rz: 0, parent: new T.Matrix4().makeRotationZ(i * Math.PI / 2) }); return b.build(); };
  P.tower = (b, g, L) => {
    b.add(cyl(0.42, 0.55, 0.28, 8), '#38333e', { y: 0.14, m: SURF.stone });
    b.add(cyl(0.22, 0.32, 1.5, 8), '#322d38', { y: 1.0, m: SURF.stone });
    b.add(cyl(0.3, 0.22, 0.18, 8), '#3a3542', { y: 1.82, m: SURF.stone });
    b.add(cone(0.26, 0.7, 8), '#221f28', { y: 2.26, m: SURF.roof });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(cone(0.04, 0.22, 4), '#1c1a22', { x: Math.cos(a) * 0.28, y: 1.98, z: Math.sin(a) * 0.28, m: SURF.metal }); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; b.add(cone(0.06, 0.6, 5), '#2a2630', { x: Math.cos(a) * 0.45, y: 0.4, z: Math.sin(a) * 0.45, rz: Math.cos(a) * 0.35, rx: -Math.sin(a) * 0.35, m: SURF.rock }); }
    for (let k = 0; k < 4; k++) for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + k; g.add(box(0.05, 0.1, 0.02), '#c06cff', { x: Math.cos(a) * 0.25, y: 0.55 + k * 0.33, z: Math.sin(a) * 0.25, ry: -a + Math.PI / 2, jit: 0 }); }
    g.add(sph(0.08, 1), '#e8a8ff', { y: 2.66, jit: 0 });
    b.add(box(0.18, 0.28, 0.02), '#140e18', { y: 0.36, z: 0.31, jit: 0 });
    L.push([0, 2.66, 0, '#c06cff', 1.4], [0, 0.4, 0.34, '#a050ff', 0.6]);
  };
  P.woods = (b, g, L) => { // hermit's glade: cottage, well, stone circle
    house(b, -0.15, -0.1, 0.34, 0.28, 0.24, '#b8a07a', '#8a7a4a', 0.4);
    b.add(cyl(0.06, 0.07, 0.3, 6), '#7a6a5a', { x: 0.05, y: 0.4, z: -0.2, m: SURF.stone });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; b.add(box(0.07, 0.24 + (i % 2) * 0.06, 0.05), '#8a857a', { x: 0.45 * Math.cos(a) + 0.2, y: 0.12, z: 0.45 * Math.sin(a) + 0.15, ry: -a, m: SURF.rock }); }
    b.add(cyl(0.08, 0.09, 0.08, 8), '#8a8274', { x: 0.25, y: 0.04, z: 0.3, m: SURF.stone });
    g.add(box(0.05, 0.05, 0.01), '#ffd27a', { x: -0.08, y: 0.14, z: 0.05, jit: 0 });
    L.push([0.2, 0.25, 0.15, '#9ff7c0', 0.6], [-0.1, 0.18, 0.08, '#ffcf7a', 0.25]);
  };
  P.mine = (b, g, L) => {
    b.add(rock(0.6, 11, 0.7), '#8a7a62', { y: 0.12, z: -0.2 });
    b.add(rock(0.38, 12, 0.8), '#7a6a56', { x: 0.45, y: 0.1, z: -0.15 });
    b.add(box(0.06, 0.34, 0.06), '#6a4a2a', { x: -0.14, y: 0.17, z: 0.22, m: SURF.wood }); b.add(box(0.06, 0.34, 0.06), '#6a4a2a', { x: 0.14, y: 0.17, z: 0.22, m: SURF.wood });
    b.add(box(0.38, 0.06, 0.07), '#6a4a2a', { y: 0.35, z: 0.22, m: SURF.wood });
    b.add(box(0.22, 0.28, 0.02), '#120e0a', { y: 0.14, z: 0.2, jit: 0 });
    b.add(box(0.03, 0.01, 0.5), '#5a5048', { x: -0.06, y: 0.01, z: 0.45 }); b.add(box(0.03, 0.01, 0.5), '#5a5048', { x: 0.06, y: 0.01, z: 0.45 });
    b.add(box(0.16, 0.1, 0.12), '#5a4a3a', { y: 0.08, z: 0.5 }); b.add(sph(0.05, 0), '#c0c4cc', { y: 0.15, z: 0.5, s: [1.2, 0.6, 1] });
    L.push([0, 0.36, 0.28, '#ffc06a', 0.4]);
    g.add(sph(0.025, 0), '#ffd27a', { x: 0.17, y: 0.33, z: 0.26, jit: 0 });
  };
  P.crypt = (b, g, L) => {
    b.add(box(0.7, 0.08, 0.55), '#7a7a6a', { y: 0.04, rz: 0.05, m: SURF.stone });
    b.add(box(0.5, 0.36, 0.38), '#8a8a7a', { y: 0.26, rz: 0.06, m: SURF.stone });
    for (const x of [-0.22, -0.08, 0.08, 0.22]) b.add(cyl(0.035, 0.035, 0.36, 8), '#a8a898', { x, y: 0.26, z: 0.22, rz: 0.06, m: SURF.rock });
    b.add(prismRoof(0.6, 0.2, 0.48), '#5e5e50', { y: 0.44, rz: 0.06 });
    g.add(box(0.12, 0.2, 0.02), '#6aff9a', { y: 0.18, z: 0.2, rz: 0.06, jit: 0 });
    b.add(cyl(0.3, 0.32, 0.03, 10), '#3a4a3a', { x: 0.3, y: 0.0, z: 0.35 });
    L.push([0, 0.25, 0.3, '#5aff8a', 0.9]);
  };
  P.peaks = (b, g, L) => {
    b.add(rock(0.45, 21, 1.3), '#8a8a8e', { y: 0.35 });
    b.add(rock(0.3, 22, 1.1), '#9a9aa0', { x: 0.3, y: 0.18, z: 0.15 });
    b.add(cyl(0.12, 0.15, 0.5, 8), '#a89c88', { y: 0.95, m: SURF.stone });
    b.add(cyl(0.17, 0.14, 0.08, 8), '#9a8e7a', { y: 1.22, m: SURF.stone });
    g.add(sph(0.09, 1), '#ffb03a', { y: 1.34, s: [1, 1.4, 1], jit: 0 });
    L.push([0, 1.36, 0, '#ffa03a', 1.0]);
  };
  // lairs
  P.warren = (b, g, L) => {
    b.add(blob(0.42, 31, 0.15), '#5e5032', { y: 0.0, s: [1, 0.5, 1], m: SURF.rock });
    b.add(blob(0.22, 32, 0.2), '#3e5a24', { x: -0.25, y: 0.12, z: -0.1, s: [1, 0.6, 1], m: SURF.leaf });
    b.add(cyl(0.12, 0.14, 0.04, 8), '#140e08', { y: 0.12, z: 0.3, rx: -1.1, jit: 0 });
    for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.3; b.add(cone(0.025, 0.28, 4), '#8a6a42', { x: Math.cos(a) * 0.55, y: 0.1, z: Math.sin(a) * 0.55, rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5 }); }
    b.seg([0.3, 0, 0.25], [0.3, 0.5, 0.25], 0.012, 0.012, '#5a3a22');
    b.add(box(0.14, 0.1, 0.005), '#b8302a', { x: 0.37, y: 0.44, z: 0.25, jit: 0.1 });
    b.add(sph(0.04, 0), '#e8e0c8', { x: 0.3, y: 0.53, z: 0.25 });
  };
  P.camp = (b, g, L) => {
    for (const [x, z, s, c] of [[-0.25, -0.1, 1, '#8a6a46'], [0.25, -0.15, 0.9, '#7a5a3a'], [0, 0.25, 0.8, '#9a7a52']]) { b.add(cone(0.2 * s, 0.38 * s, 6), c, { x, y: 0.19 * s, z }); b.seg([x, 0.3 * s, z], [x, 0.48 * s, z], 0.01, 0.01, '#4a3020'); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; if (i === 4) continue; b.add(cone(0.025, 0.24, 4), '#7a5a32', { x: Math.cos(a) * 0.6, y: 0.1, z: Math.sin(a) * 0.6, m: SURF.wood }); }
    b.add(cyl(0.07, 0.08, 0.04, 7), '#3a3028', { x: 0.2, y: 0.02, z: 0.3 });
    g.add(cone(0.05, 0.12, 5), '#ffa03a', { x: 0.2, y: 0.08, z: 0.3, jit: 0 });
    L.push([0.2, 0.12, 0.3, '#ff9a3a', 0.6]);
    b.seg([-0.4, 0, 0.3], [-0.4, 0.55, 0.3], 0.012, 0.012, '#4a3020'); b.add(box(0.12, 0.16, 0.005), '#3a2a1a', { x: -0.34, y: 0.47, z: 0.3 }); g.add(sph(0.025, 0), '#ff4a2a', { x: -0.34, y: 0.47, z: 0.305, jit: 0 });
  };
  P.bonecrypt = (b, g, L) => {
    b.add(box(0.42, 0.3, 0.34), '#7a7468', { y: 0.15, m: SURF.stone });
    b.add(box(0.48, 0.06, 0.4), '#6a645a', { y: 0.33, m: SURF.stone });
    b.add(sph(0.06, 1), '#e8e0c8', { y: 0.4, z: 0.12 });
    g.add(box(0.14, 0.18, 0.02), '#7aff8a', { y: 0.1, z: 0.17, jit: 0 });
    for (const [x, z] of [[-0.45, 0.3], [0.45, 0.25], [-0.4, -0.3], [0.42, -0.35], [0, 0.5]]) { b.add(box(0.1, 0.16, 0.04), '#8a8478', { x, y: 0.08, z, rz: (x > 0 ? 0.15 : -0.12) }); }
    for (let i = 0; i < 6; i++) b.add(sph(0.03, 0), '#e8e0c8', { x: -0.2 + i * 0.08, y: 0.02, z: 0.32 + (i % 2) * 0.05 });
    L.push([0, 0.15, 0.25, '#5aff7a', 0.7]);
  };
  P.barrow = (b, g, L) => {
    b.add(blob(0.5, 41, 0.08), '#4a6430', { y: 0, s: [1.1, 0.42, 0.9], m: SURF.leaf });
    b.add(box(0.06, 0.26, 0.06), '#8a8a82', { x: -0.11, y: 0.13, z: 0.42, m: SURF.rock }); b.add(box(0.06, 0.26, 0.06), '#8a8a82', { x: 0.11, y: 0.13, z: 0.42, m: SURF.rock }); b.add(box(0.32, 0.06, 0.08), '#8a8a82', { y: 0.28, z: 0.42, m: SURF.rock });
    g.add(box(0.16, 0.24, 0.02), '#a8f0ff', { y: 0.12, z: 0.4, jit: 0 });
    for (const [x, z] of [[-0.55, 0.1], [0.55, 0.05], [0.4, -0.45]]) b.add(box(0.07, 0.3, 0.06), '#7a7a74', { x, y: 0.15, z, rz: x * 0.2 });
    L.push([0, 0.2, 0.45, '#8ae8ff', 0.9]);
  };
  P.den = (b, g, L) => {
    b.add(rock(0.48, 51, 0.75), '#7a6a5a', { x: -0.05, y: 0.15, z: -0.1 });
    b.add(rock(0.3, 52, 0.9), '#6a5a4a', { x: 0.35, y: 0.12, z: 0.05 });
    b.add(rock(0.26, 53, 0.9), '#6a5a4a', { x: -0.38, y: 0.1, z: 0.1 });
    b.add(cyl(0.16, 0.18, 0.02, 9), '#0e0a08', { y: 0.16, z: 0.32, rx: -1.2, jit: 0 });
    for (let i = 0; i < 5; i++) b.add(cyl(0.012, 0.012, 0.14, 4), '#e8e0c8', { x: -0.1 + i * 0.06, y: 0.01, z: 0.45 + (i % 2) * 0.04, rz: Math.PI / 2, ry: i });
    b.seg([0.5, 0, 0.35], [0.5, 0.45, 0.35], 0.02, 0.02, '#5a3a22'); b.add(sph(0.05, 0), '#e8e0c8', { x: 0.5, y: 0.48, z: 0.35 }); b.add(cone(0.015, 0.08, 4), '#e8e0c8', { x: 0.45, y: 0.52, z: 0.35, rz: 0.8 }); b.add(cone(0.015, 0.08, 4), '#e8e0c8', { x: 0.55, y: 0.52, z: 0.35, rz: -0.8 });
  };
  P.fens = (b, g, L) => {
    b.add(cyl(0.45, 0.5, 0.02, 12), '#24301e', { y: 0.005, jit: 0.02 });
    for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) b.seg([x, 0, z], [x, 0.28, z], 0.018, 0.018, '#4a3a22');
    b.add(box(0.4, 0.04, 0.4), '#5a4a2a', { y: 0.28, m: SURF.wood });
    b.add(box(0.3, 0.2, 0.3), '#6a5a3a', { y: 0.4, m: SURF.wood });
    b.add(cone(0.3, 0.24, 4), '#5a6232', { y: 0.62, ry: Math.PI / 4, m: SURF.fur });
    for (let i = 0; i < 10; i++) { const a = i * 1.7; b.add(cone(0.01, 0.2, 3), '#6a7a3a', { x: Math.cos(a) * 0.4, y: 0.1, z: Math.sin(a) * 0.4, rx: Math.sin(a) * 0.2 }); }
    g.add(box(0.06, 0.06, 0.01), '#d8ff7a', { y: 0.4, z: 0.155, jit: 0 });
    L.push([0, 0.42, 0.2, '#c8ff6a', 0.4]);
  };
  P.hold = (b, g, L) => {
    b.add(box(0.7, 0.38, 0.46), '#8a8070', { y: 0.19, m: SURF.stone });
    b.add(prismRoof(0.8, 0.3, 0.55), '#6a5a42', { y: 0.38 });
    b.add(box(0.2, 0.28, 0.02), '#1a140e', { y: 0.14, z: 0.235, jit: 0 });
    for (const [x, z, r] of [[-0.5, 0.35, 0.14], [0.52, 0.3, 0.18], [0.45, -0.4, 0.12]]) b.add(rock(r, x * 10 | 0), '#9a9284', { x, y: r * 0.6, z });
    b.add(new T.TorusGeometry(0.15, 0.025, 4, 8, Math.PI), '#e8dcc0', { x: -0.22, y: 0.0, z: 0.35, ry: 0.3 });
    b.add(new T.TorusGeometry(0.15, 0.025, 4, 8, Math.PI), '#e8dcc0', { x: 0.22, y: 0.0, z: 0.35, ry: -0.3 });
  };
  P.roost = (b, g, L) => {
    b.add(cone(0.35, 1.0, 6), '#4a3a36', { y: 0.5, jit: 0.15 });
    b.add(cone(0.22, 0.6, 5), '#3a2e2a', { x: 0.35, y: 0.3, z: 0.1, rz: -0.3, jit: 0.15 });
    b.add(cone(0.2, 0.5, 5), '#3a2e2a', { x: -0.32, y: 0.25, z: 0.15, rz: 0.35, jit: 0.15 });
    b.add(new T.TorusGeometry(0.2, 0.06, 5, 10), '#6a5232', { y: 1.0, rx: Math.PI / 2 });
    for (let i = 0; i < 7; i++) g.add(sph(0.035, 0), '#ffd24a', { x: Math.cos(i) * 0.25, y: 0.03, z: Math.sin(i) * 0.25 + 0.3, jit: 0.1 });
    L.push([0, 1.05, 0, '#ff6a3a', 0.8], [0, 0.05, 0.3, '#ffd24a', 0.5]);
  };
  P.mire = (b, g, L) => {
    b.add(cyl(0.55, 0.6, 0.02, 14), '#1a2620', { y: 0.005, jit: 0.02 });
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.3; const x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2; b.seg([x, 0, z], [x * 1.4, 0.45 + i * 0.06, z * 1.4 + 0.1], 0.05, 0.035, '#3f7a5a'); b.add(sph(0.06, 1), '#4f9470', { x: x * 1.4, y: 0.5 + i * 0.06, z: z * 1.4 + 0.14, s: [0.9, 0.8, 1.3] }); g.add(sph(0.012, 0), '#ffe04a', { x: x * 1.4 + 0.02, y: 0.53 + i * 0.06, z: z * 1.4 + 0.2, jit: 0 }); }
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + 1; b.add(cone(0.06, 0.5, 5), '#4a3e30', { x: Math.cos(a) * 0.55, y: 0.25, z: Math.sin(a) * 0.55, rz: Math.cos(a) * 0.3, jit: 0.15 }); }
    for (let i = 0; i < 12; i++) { const a = i * 0.9; b.add(cone(0.01, 0.2, 3), '#5a6a32', { x: Math.cos(a) * 0.5, y: 0.1, z: Math.sin(a) * 0.5 }); }
  };
  P.keep = (b, g, L) => {
    b.add(box(0.6, 0.42, 0.42), '#463a42', { y: 0.21, m: SURF.stone });
    b.add(prismRoof(0.66, 0.26, 0.48), '#2a2228', { y: 0.42 });
    b.add(cyl(0.09, 0.1, 0.8, 9), '#463a42', { x: 0.3, y: 0.4, z: -0.12, m: SURF.stone }); b.add(cone(0.13, 0.3, 9), '#2a2228', { x: 0.3, y: 0.95, z: -0.12, m: SURF.roof });
    for (const x of [-0.18, 0.06]) g.add(box(0.07, 0.1, 0.01), '#ff3a4a', { x, y: 0.25, z: 0.215, jit: 0 });
    b.add(box(0.12, 0.2, 0.01), '#0d080b', { x: -0.06, y: 0.1, z: 0.215, jit: 0 });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.seg([Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], [Math.cos(a) * 0.55, 0.2, Math.sin(a) * 0.55], 0.012, 0.008, '#1a1418'); }
    L.push([-0.06, 0.25, 0.25, '#ff2a3a', 0.45]);
  };
  P.abyss = (b, g, L) => {
    b.add(cyl(0.5, 0.55, 0.04, 14), '#2a0c08', { y: 0.02 });
    g.add(cyl(0.32, 0.36, 0.02, 14), '#ff5a1a', { y: 0.04, jit: 0 });
    g.add(cyl(0.16, 0.18, 0.02, 12), '#ffd24a', { y: 0.05, jit: 0 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(cone(0.06, 0.42 + (i % 2) * 0.2, 4), '#3a2a26', { x: Math.cos(a) * 0.48, y: 0.24, z: Math.sin(a) * 0.48, rz: -Math.cos(a) * 0.25, rx: Math.sin(a) * 0.25 }); }
    L.push([0, 0.15, 0, '#ff4a1a', 1.4], [0, 0.5, 0, '#ff7a2a', 0.8]);
  };
  // lairs added in 0.9
  P.kennel = (b, g, L) => {
    b.add(rock(0.46, 61, 0.7), '#6a645a', { x: 0, y: 0.12, z: -0.12 });
    b.add(rock(0.26, 62, 0.9), '#5a544a', { x: -0.38, y: 0.08, z: 0.08 });
    b.add(cyl(0.15, 0.17, 0.02, 9), '#0e0a08', { y: 0.15, z: 0.24, rx: -1.15, jit: 0 });
    for (let i = 0; i < 7; i++) b.add(cyl(0.012, 0.012, 0.12, 4), '#e8e0c8', { x: -0.25 + i * 0.08, y: 0.01, z: 0.42 + (i % 3) * 0.04, rz: Math.PI / 2, ry: i * 1.3 });
    b.add(sph(0.045, 0), '#e8e0c8', { x: 0.32, y: 0.03, z: 0.38 });
    g.add(sph(0.018, 0), '#ffd23a', { x: -0.035, y: 0.13, z: 0.27, jit: 0 }); g.add(sph(0.018, 0), '#ffd23a', { x: 0.035, y: 0.13, z: 0.27, jit: 0 });
  };
  P.hideout = (b, g, L) => {
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; if (i === 3 || i === 4) continue; b.add(cyl(0.03, 0.035, 0.3, 5), '#6a4a2a', { x: Math.cos(a) * 0.55, y: 0.15, z: Math.sin(a) * 0.55, m: SURF.wood }); b.add(cone(0.032, 0.06, 5), '#6a4a2a', { x: Math.cos(a) * 0.55, y: 0.33, z: Math.sin(a) * 0.55 }); }
    b.add(cone(0.26, 0.36, 4), '#5a4a3a', { x: -0.08, y: 0.18, z: -0.1, ry: 0.78, m: SURF.cloth });
    b.add(box(0.1, 0.14, 0.02), '#1a1410', { x: -0.08, y: 0.07, z: 0.08, jit: 0 });
    b.seg([0.25, 0, -0.25], [0.25, 0.55, -0.25], 0.012, 0.012, '#3a2a1a'); b.add(box(0.14, 0.1, 0.005), '#1a1a1a', { x: 0.32, y: 0.5, z: -0.25 });
    b.add(cyl(0.07, 0.08, 0.03, 7), '#3a3028', { x: 0.22, y: 0.015, z: 0.22 });
    g.add(cone(0.05, 0.12, 5), '#ffa03a', { x: 0.22, y: 0.07, z: 0.22, jit: 0 }); L.push([0.22, 0.12, 0.22, '#ff9a3a', 0.6]);
  };
  // a lair going up: scaffolding, stacked stone and a pile of timber
  P.building = (b, g, L) => {
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) b.seg([x, 0, z], [x, 0.5, z], 0.016, 0.016, '#8a6a3a');
    for (const y of [0.25, 0.5]) { b.add(box(0.64, 0.025, 0.03), '#8a6a3a', { y, z: -0.3, m: SURF.wood }); b.add(box(0.64, 0.025, 0.03), '#8a6a3a', { y, z: 0.3, m: SURF.wood }); b.add(box(0.03, 0.025, 0.64), '#8a6a3a', { x: -0.3, y, m: SURF.wood }); b.add(box(0.03, 0.025, 0.64), '#8a6a3a', { x: 0.3, y, m: SURF.wood }); }
    b.add(box(0.36, 0.16, 0.28), '#7a7468', { y: 0.08, m: SURF.stone });
    for (let i = 0; i < 4; i++) b.add(cyl(0.035, 0.035, 0.5, 6), '#9a6a34', { x: 0.48, y: 0.035 + i * 0.065, z: -0.1 + (i % 2) * 0.07, rz: Math.PI / 2, m: SURF.wood });
  };
  P.wrecked = (b, g, L) => {
    for (let i = 0; i < 7; i++) { const a = i * 0.9; b.add(rock(0.12 + (i % 3) * 0.04, 70 + i, 0.6), i % 2 ? '#3a3430' : '#4a423a', { x: Math.cos(a) * 0.3, y: 0.03, z: Math.sin(a) * 0.3 }); }
    b.add(cyl(0.3, 0.32, 0.02, 10), '#1a1210', { y: 0.005, jit: 0 });
    g.add(sph(0.04, 0), '#ff6a2a', { x: -0.12, y: 0.04, z: 0.1, jit: 0 }); L.push([-0.12, 0.08, 0.1, '#ff6a2a', 0.45]);
  };
  // raw deposits: what a site looks like before a minion turns it into a mine or camp
  P['dep-gold'] = (b, g, L) => {
    // a low outcrop streaked with gold: no boulder, no timbers yet
    for (const [x, z, r, sd] of [[-0.2, -0.05, 0.26, 81], [0.12, -0.18, 0.22, 84], [0.22, 0.16, 0.16, 85], [-0.06, 0.22, 0.13, 86]]) b.add(rock(r, sd, 0.7), '#6a5c4a', { x, y: r * 0.35, z });
    for (const [x, y, z] of [[-0.24, 0.17, 0.1], [-0.12, 0.2, 0.05], [0.08, 0.15, -0.04], [0.16, 0.12, -0.08], [0.25, 0.1, 0.24], [-0.02, 0.08, 0.3], [-0.3, 0.1, -0.02]]) g.add(sph(0.045, 0), '#ffd24a', { x, y, z, jit: 0.2 });
    L.push([-0.15, 0.22, 0.08, '#ffd24a', 0.55]); L.push([0.18, 0.16, 0.05, '#ffd24a', 0.4]);
  };
  P['dep-lumber'] = (b, g, L) => {
    for (const [x, z, h] of [[-0.3, -0.18, 0.95], [0.05, -0.32, 1.1], [0.32, -0.05, 0.9], [-0.05, 0.22, 0.8]]) { b.add(cyl(0.05, 0.06, h * 0.3, 6), '#5a3a1a', { x, y: h * 0.15, z, m: SURF.wood }); b.add(cone(0.2, h * 0.5, 7), '#2e5a26', { x, y: h * 0.48, z, m: SURF.leaf }); b.add(cone(0.15, h * 0.4, 7), '#3a6c2e', { x, y: h * 0.72, z, m: SURF.leaf }); }
  };
  P['dep-ore'] = (b, g, L) => {
    b.add(rock(0.42, 91, 0.9), '#5a5560', { x: -0.08, y: 0.14, z: -0.12 });
    b.add(rock(0.26, 92, 1.1), '#4a4650', { x: 0.3, y: 0.12, z: -0.2 });
    b.add(rock(0.18, 94, 1), '#55505c', { x: 0.22, y: 0.08, z: 0.25 });
    for (const [x, y, z] of [[-0.2, 0.25, 0.12], [0.05, 0.3, 0.08], [0.25, 0.22, -0.02], [-0.05, 0.12, 0.25], [0.3, 0.16, 0.3]]) g.add(new T.OctahedronGeometry(0.05, 0), '#9ac8ff', { x, y, z, jit: 0.2 });
    L.push([0, 0.25, 0.1, '#7ab8ff', 0.35]);
  };
  // places your minions work
  P['node-gold'] = (b, g, L) => {
    b.add(rock(0.48, 81, 0.75), '#6e604c', { y: 0.12, z: -0.2 });
    // a timbered adit, a lantern, rails and a cart of gold
    b.add(box(0.07, 0.42, 0.07), '#5a3a1e', { x: -0.17, y: 0.21, z: 0.16, m: SURF.wood }); b.add(box(0.07, 0.42, 0.07), '#5a3a1e', { x: 0.17, y: 0.21, z: 0.16, m: SURF.wood }); b.add(box(0.46, 0.07, 0.09), '#5a3a1e', { y: 0.43, z: 0.16, m: SURF.wood });
    b.add(box(0.27, 0.36, 0.03), '#0c0806', { y: 0.18, z: 0.14, jit: 0 });
    for (const x of [-0.07, 0.07]) b.add(box(0.025, 0.012, 0.5), '#3a3a40', { x, y: 0.008, z: 0.38, m: SURF.metal });
    b.add(box(0.2, 0.1, 0.14), '#5a4030', { x: 0, y: 0.08, z: 0.52, m: SURF.wood });
    for (let i = 0; i < 5; i++) g.add(sph(0.038, 0), '#ffd24a', { x: -0.06 + (i % 3) * 0.06, y: 0.15 + (i >> 2) * 0.03, z: 0.5 + (i % 2) * 0.03, jit: 0 });
    g.add(sph(0.035, 1), '#ffb84a', { x: 0.2, y: 0.36, z: 0.22, jit: 0 });
    L.push([0, 0.18, 0.52, '#ffd24a', 0.45]); L.push([0.2, 0.36, 0.22, '#ffaa3a', 0.5]);
  };
  P['node-lumber'] = (b, g, L) => {
    for (const [x, z, h] of [[-0.32, -0.22, 0.6], [0.3, -0.3, 0.7]]) { b.add(cyl(0.04, 0.05, h * 0.3, 6), '#5a3a1a', { x, y: h * 0.15, z, m: SURF.wood }); b.add(cone(0.18, h * 0.7, 7), '#2e5a26', { x, y: h * 0.62, z, m: SURF.leaf }); }
    for (let i = 0; i < 5; i++) b.add(cyl(0.05, 0.05, 0.56, 7), i % 2 ? '#9a6a34' : '#8a5a2a', { x: -0.05 + (i % 3) * 0.02, y: 0.05 + Math.floor(i / 2) * 0.08, z: 0.12 + (i % 2) * 0.1 - Math.floor(i / 2) * 0.05, rz: Math.PI / 2, m: SURF.wood });
    b.add(cyl(0.09, 0.1, 0.1, 8), '#7a5a32', { x: 0.32, y: 0.05, z: 0.25, m: SURF.wood });
    b.seg([0.32, 0.1, 0.25], [0.42, 0.32, 0.18], 0.01, 0.01, '#5a3a1a'); b.add(box(0.1, 0.06, 0.012), '#b8c0c8', { x: 0.43, y: 0.33, z: 0.18, m: SURF.metal });
  };
  P['node-ore'] = (b, g, L) => {
    b.add(rock(0.44, 91, 0.9), '#4e4a56', { x: -0.04, y: 0.14, z: -0.2 });
    b.add(rock(0.22, 92, 1.1), '#44404c', { x: 0.34, y: 0.1, z: -0.12 });
    for (const [x, y, z] of [[-0.25, 0.28, 0.0], [0.1, 0.34, -0.05], [0.32, 0.2, 0.0]]) g.add(new T.OctahedronGeometry(0.045, 0), '#9ac8ff', { x, y, z, jit: 0.2 });
    // a shored-up shaft and a cart of ore
    b.add(box(0.07, 0.38, 0.07), '#4a3018', { x: -0.16, y: 0.19, z: 0.12, m: SURF.wood }); b.add(box(0.07, 0.38, 0.07), '#4a3018', { x: 0.16, y: 0.19, z: 0.12, m: SURF.wood }); b.add(box(0.44, 0.07, 0.09), '#4a3018', { y: 0.39, z: 0.12, m: SURF.wood });
    b.add(box(0.25, 0.32, 0.03), '#0a0808', { y: 0.16, z: 0.1, jit: 0 });
    b.add(box(0.22, 0.1, 0.15), '#4a3a2a', { x: 0.05, y: 0.08, z: 0.46, m: SURF.wood });
    for (let i = 0; i < 4; i++) b.add(rock(0.05, 93 + i, 1), '#6a6a78', { x: -0.02 + (i % 2) * 0.08, y: 0.15, z: 0.43 + (i >> 1) * 0.06 });
    L.push([0, 0.3, 0, '#7ab8ff', 0.35]);
  };
  // items on the map
  P.chest = (b, g, L) => { b.add(box(0.3, 0.16, 0.2), '#7a4e24', { y: 0.08, m: SURF.wood }); b.add(cyl(0.1, 0.1, 0.3, 8, 1, false), '#6a4020', { y: 0.16, rz: Math.PI / 2, s: [1, 1, 1], m: SURF.wood }); b.add(box(0.32, 0.03, 0.22), '#c8a038', { y: 0.12, m: SURF.metal }); b.add(box(0.04, 0.06, 0.02), '#d8b850', { y: 0.14, z: 0.105, m: SURF.metal }); g.add(sph(0.05, 1), '#ffe07a', { y: 0.27, jit: 0 }); L.push([0, 0.3, 0, '#ffd24a', 0.7]); };
  P.artifact = (b, g, L) => { b.add(cyl(0.12, 0.16, 0.2, 6), '#9a948a', { y: 0.1, m: SURF.stone }); b.add(cyl(0.16, 0.14, 0.04, 6), '#aaa498', { y: 0.22, m: SURF.stone }); g.add(new T.OctahedronGeometry(0.1, 0), '#7ae8ff', { y: 0.42, s: [1, 1.5, 1], jit: 0.15 }); L.push([0, 0.42, 0, '#6ad8ff', 1.0]); };
  P.shrine = (b, g, L) => { b.add(cyl(0.28, 0.3, 0.06, 8), '#a8a498', { y: 0.03, m: SURF.stone }); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.78; b.add(cyl(0.035, 0.035, 0.36, 8), '#c8c4b8', { x: Math.cos(a) * 0.2, y: 0.24, z: Math.sin(a) * 0.2, m: SURF.rock }); } b.add(cone(0.3, 0.16, 4), '#c8c4b8', { y: 0.5, ry: 0.78, m: SURF.stone }); g.add(sph(0.06, 1), '#9ff7ff', { y: 0.2, jit: 0 }); L.push([0, 0.2, 0, '#7af0ff', 0.9]); };
  P.refugees = (b, g, L) => { b.add(cone(0.18, 0.3, 5), '#a89a7a', { x: -0.18, y: 0.15, z: -0.08 }); b.add(cone(0.15, 0.26, 5), '#9a8a6a', { x: 0.2, y: 0.13, z: -0.12 }); b.add(box(0.2, 0.08, 0.12), '#7a5a3a', { x: 0.1, y: 0.08, z: 0.22 }); b.add(cyl(0.05, 0.05, 0.02, 8), '#3a2a1a', { x: -0.1, y: 0.06, z: 0.2, rz: Math.PI / 2 }); g.add(cone(0.04, 0.1, 5), '#ffa03a', { x: -0.12, y: 0.05, z: 0.18, jit: 0 }); L.push([-0.12, 0.1, 0.18, '#ff9a3a', 0.45]); };
  P.omen = (b, g, L) => { b.add(box(0.14, 0.6, 0.12), '#4a4452', { y: 0.3, rz: 0.04, m: SURF.rock }); b.add(cone(0.1, 0.14, 4), '#3a3442', { y: 0.67, ry: 0.78 }); for (let i = 0; i < 3; i++) g.add(box(0.06, 0.04, 0.01), '#c06cff', { y: 0.18 + i * 0.14, z: 0.062, jit: 0 }); L.push([0, 0.35, 0.08, '#b05aff', 0.7]); };
  P.stranger = (b, g, L) => { humanoid(b, g, { h: 0.48, skin: '#c8a888', cloth: '#4a4a52', cloth2: '#3a3a42', hood: '#3a3a44', robe: true, weapon: 'staff', orb: '#ffd27a', cape: '#3a3a44' }); b.add(cyl(0.06, 0.07, 0.03, 7), '#3a2a1a', { x: 0.25, y: 0.015, z: 0.2 }); g.add(cone(0.04, 0.1, 5), '#ffa03a', { x: 0.25, y: 0.06, z: 0.2, jit: 0 }); L.push([0.25, 0.1, 0.2, '#ff9a3a', 0.45]); };
  P.pass = (b, g, L) => { for (const x of [-0.25, 0.25]) for (const z of [-0.3, 0.3]) b.seg([x, 0, z], [x, 0.3, z], 0.02, 0.02, '#6a4a2a'); for (let i = 0; i < 6; i++) b.add(box(0.46, 0.015, 0.07), '#8a6a3a', { y: 0.12 + Math.sin(i / 5 * Math.PI) * -0.05, z: -0.25 + i * 0.1 }); b.seg([-0.25, 0.28, -0.3], [-0.25, 0.2, 0.3], 0.006, 0.006, '#c8b088'); b.seg([0.25, 0.28, -0.3], [0.25, 0.2, 0.3], 0.006, 0.006, '#c8b088'); };
  P.captive = (b, g, L) => { b.add(box(0.36, 0.03, 0.36), '#5a4028', { y: 0.015 }); b.add(box(0.36, 0.03, 0.36), '#5a4028', { y: 0.4 }); for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const x = [-0.17, 0.17][i % 2], z = [-0.17, 0.17][i >> 1]; b.seg([x + (k - 1) * 0.0, 0.02, z], [x, 0.4, z], 0.012, 0.012, '#4a3020'); } for (let k = 0; k < 4; k++) { b.seg([-0.17 + k * 0.11, 0.02, 0.17], [-0.17 + k * 0.11, 0.4, 0.17], 0.008, 0.008, '#3a2a1a'); } humanoid(b, g, { h: 0.3, skin: '#d8b090', cloth: '#8a7a6a', cloth2: '#6a5a4a' }); };
  P.riddle = (b, g, L) => { b.dm = SURF.rock; b.add(box(0.36, 0.08, 0.26), '#8a8478', { y: 0.04 }); b.add(box(0.28, 0.4, 0.1), '#9a948a', { y: 0.28 }); b.add(sph(0.12, 1), '#9a948a', { y: 0.52, s: [1, 0.5, 0.4] }); for (let i = 0; i < 3; i++) g.add(box(0.05, 0.05, 0.01), '#ffe07a', { x: -0.08 + i * 0.08, y: 0.3, z: 0.052, jit: 0 }); L.push([0, 0.32, 0.08, '#ffd24a', 0.55]); };
  P.tourney = (b, g, L) => { for (const [x, c] of [[-0.2, '#c83a2a'], [0.2, '#2a5ac8']]) { b.seg([x, 0, 0], [x, 0.55, 0], 0.012, 0.012, '#6a4a2a'); b.add(box(0.12, 0.2, 0.005), c, { x: x + 0.065, y: 0.43 }); } };
  P.pit = (b, g, L) => { b.add(cyl(0.22, 0.2, 0.02, 10), '#140c08', { y: 0.005, jit: 0 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(cone(0.02, 0.12, 4), '#8a7a6a', { x: Math.cos(a) * 0.12, y: 0.04, z: Math.sin(a) * 0.12 }); } };
  P.rune = (b, g, L) => { g.add(new T.TorusGeometry(0.22, 0.015, 3, 20), '#ff5a2a', { y: 0.02, rx: Math.PI / 2, jit: 0 }); g.add(new T.TorusGeometry(0.12, 0.012, 3, 6), '#ff8a3a', { y: 0.02, rx: Math.PI / 2, jit: 0 }); L.push([0, 0.05, 0, '#ff4a2a', 0.6]); };
  P.snare = (b, g, L) => { b.add(new T.TorusGeometry(0.16, 0.012, 3, 14), '#c8b088', { y: 0.02, rx: Math.PI / 2 }); b.seg([0.16, 0.02, 0], [0.3, 0.4, 0], 0.012, 0.006, '#7a5a32'); };
  P.quest = (b, g, L) => {};
  // citadel buildings around the Dark Tower
  const CB = {};
  CB.barracks = (b, g, L) => { b.add(box(0.5, 0.2, 0.26), '#3a3238', { y: 0.1, m: SURF.stone }); b.add(prismRoof(0.56, 0.16, 0.32), '#5a2a22', { y: 0.2, ry: Math.PI / 2, s: [1, 1, 1] }); for (const x of [-0.3, 0.3]) { b.seg([x, 0, 0.2], [x, 0.4, 0.2], 0.01, 0.01, '#2a2026'); b.add(box(0.1, 0.12, 0.005), '#8a1a1a', { x: x + 0.055, y: 0.34, z: 0.2 }); } };
  CB.ossuary = (b, g, L) => { b.add(blob(0.24, 61, 0.2), '#d8d0b8', { y: 0.05, s: [1, 0.55, 1] }); b.add(box(0.2, 0.18, 0.18), '#5a5450', { x: 0.25, y: 0.09, z: -0.1 }); g.add(box(0.06, 0.08, 0.01), '#7aff8a', { x: 0.25, y: 0.08, z: 0.0, jit: 0 }); };
  CB.forge = (b, g, L) => { b.add(box(0.3, 0.2, 0.26), '#4a3e3a', { y: 0.1, m: SURF.stone }); b.add(cone(0.24, 0.12, 4), '#3a2e2a', { y: 0.26, ry: Math.PI / 4 }); b.add(box(0.07, 0.36, 0.07), '#3a3030', { x: 0.1, y: 0.25, z: -0.06 }); g.add(box(0.12, 0.08, 0.01), '#ff8a2a', { y: 0.07, z: 0.135, jit: 0 }); L.push([0, 0.1, 0.18, '#ff7a2a', 0.5], [0.1, 0.46, -0.06, '#ff7a2a', 0.25]); };
  CB.library = (b, g, L) => { b.add(cyl(0.14, 0.16, 0.42, 8), '#4a4250', { y: 0.21, m: SURF.stone }); b.add(sph(0.15, 1), '#3a6a8a', { y: 0.44, s: [1, 0.7, 1] }); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; g.add(box(0.04, 0.07, 0.01), '#8fd8ff', { x: Math.cos(a) * 0.15, y: 0.3, z: Math.sin(a) * 0.15, ry: -a + Math.PI / 2, jit: 0 }); } L.push([0, 0.3, 0, '#7ad0ff', 0.4]); };
  CB.ogre = (b, g, L) => { b.add(cyl(0.3, 0.3, 0.04, 10), '#4a3a2a', { y: 0.02 }); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.seg([Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], [Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3], 0.015, 0.012, '#6a4a2a'); } b.add(cyl(0.3, 0.3, 0.015, 12, 1, true), '#7a5a32', { y: 0.12 }); };
  CB.altar = (b, g, L) => { b.add(box(0.36, 0.08, 0.26), '#24202a', { y: 0.04 }); b.add(box(0.12, 0.5, 0.1), '#1c1822', { y: 0.33, ry: 0.4 }); g.add(sph(0.05, 1), '#c06cff', { y: 0.62, jit: 0 }); L.push([0, 0.62, 0, '#b05aff', 0.7]); };
  CB.spire = (b, g, L) => { b.add(cyl(0.05, 0.1, 0.8, 6), '#3a3448', { y: 0.4 }); b.add(new T.TorusGeometry(0.1, 0.015, 4, 10), '#8a7aa8', { y: 0.86, rx: Math.PI / 2 }); g.add(sph(0.07, 1), '#9fe8ff', { y: 0.92, jit: 0 }); L.push([0, 0.92, 0, '#8fe0ff', 0.8]); };
  CB.troll = (b, g, L) => { b.add(cyl(0.3, 0.32, 0.015, 10), '#24301e', { y: 0.005 }); for (const [x, z] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) b.seg([x, 0, z], [x, 0.18, z], 0.012, 0.012, '#4a3a22'); b.add(box(0.26, 0.14, 0.26), '#5a4a32', { y: 0.25 }); b.add(cone(0.22, 0.16, 4), '#5a6a32', { y: 0.4, ry: Math.PI / 4 }); };
  CB.giant = (b, g, L) => { b.add(box(0.46, 0.3, 0.34), '#7a7266', { y: 0.15, m: SURF.stone }); b.add(prismRoof(0.52, 0.22, 0.4), '#5a4a3a', { y: 0.3 }); b.add(box(0.14, 0.22, 0.01), '#140e0a', { y: 0.11, z: 0.175, jit: 0 }); };
  CB.knights = (b, g, L) => { b.add(box(0.3, 0.32, 0.4), '#2a2632', { y: 0.16, m: SURF.stone }); b.add(prismRoof(0.34, 0.24, 0.44), '#1a1820', { y: 0.32, ry: Math.PI / 2 }); b.add(cyl(0.06, 0.07, 0.56, 6), '#2a2632', { x: 0, y: 0.28, z: -0.24 }); b.add(cone(0.08, 0.2, 6), '#1a1820', { y: 0.66, z: -0.24 }); g.add(box(0.08, 0.12, 0.01), '#c06cff', { y: 0.16, z: 0.205, jit: 0 }); L.push([0, 0.18, 0.24, '#a050ff', 0.4]); };
  CB.roost = (b, g, L) => { b.add(cone(0.22, 0.7, 6), '#3a2e2a', { y: 0.35, jit: 0.15 }); b.add(new T.TorusGeometry(0.13, 0.04, 5, 9), '#6a5232', { y: 0.7, rx: Math.PI / 2 }); g.add(sph(0.05, 0), '#ff7a3a', { y: 0.74, jit: 0 }); L.push([0, 0.74, 0, '#ff6a3a', 0.5]); };
  CB.mire = (b, g, L) => { b.add(cyl(0.3, 0.32, 0.015, 10), '#1a2620', { y: 0.005 }); for (let i = 0; i < 3; i++) { const a = i * 2.1; b.seg([Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1], [Math.cos(a) * 0.15, 0.32, Math.sin(a) * 0.15], 0.03, 0.02, '#3f7a5a'); b.add(sph(0.04, 0), '#4f9470', { x: Math.cos(a) * 0.15, y: 0.34, z: Math.sin(a) * 0.15 }); } };
  CB.blood = (b, g, L) => { b.add(box(0.32, 0.3, 0.28), '#3a2e36', { y: 0.15, m: SURF.stone }); b.add(prismRoof(0.36, 0.2, 0.32), '#241c22', { y: 0.3 }); g.add(box(0.06, 0.08, 0.01), '#ff3a4a', { y: 0.18, z: 0.145, jit: 0 }); L.push([0, 0.18, 0.17, '#ff2a3a', 0.3]); };
  CB.gate = (b, g, L) => { b.add(new T.TorusGeometry(0.28, 0.05, 6, 16), '#2a2228', { y: 0.32 }); g.add(new T.CircleGeometry(0.24, 16), '#ff5a1a', { y: 0.32, jit: 0 }); b.add(box(0.12, 0.08, 0.12), '#2a2228', { x: -0.26, y: 0.04 }); b.add(box(0.12, 0.08, 0.12), '#2a2228', { x: 0.26, y: 0.04 }); L.push([0, 0.32, 0.05, '#ff4a1a', 0.9]); };
  // where each citadel building stands around the tower (local offset in tiles, rotation)
  const CITADEL_SPOTS = { barracks: [-0.95, 0.35, 0.4], ossuary: [0.9, 0.5, -0.4], forge: [-0.75, -0.65, 0.9], library: [0.75, -0.75, -0.8], ogre: [-1.55, -0.1, 0.2], altar: [0.25, 1.05, 0], spire: [1.45, -0.25, 0], troll: [-1.25, 1.1, 0.3], giant: [1.5, 0.95, -0.5], knights: [-0.2, -1.25, 0.1], roost: [0.45, -1.6, 0], mire: [-1.75, 0.8, 0.4], blood: [1.15, -1.35, -0.3], gate: [-0.95, -1.5, 0.2] };

  /* ================= trees, rocks and ground cover (instanced) ================= */
  // one drooping tier of a pine: a cone whose rim is pulled into hanging branch tips
  function pineTier(r, h, lobes, seed) {
    const g = new T.ConeGeometry(r, h, lobes * 3, 1, true); const p = g.attributes.position; const R = rng(seed); const ph = R() * 6.28;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const rr = Math.hypot(x, z); if (rr < 1e-5) continue;
      const a = Math.atan2(z, x); const k = 0.5 + 0.5 * Math.cos(a * lobes + ph);
      const t = (h / 2 - y) / h; // 0 at the tip, 1 at the rim
      const out = 1 + (k * 0.34 - 0.12) * t * t;
      const w = 0.97 + 0.06 * Math.sin(a * 3 + ph);
      p.setXYZ(i, x * out * w, y - k * h * 0.26 * t * t + (t > 0.9 ? h * 0.08 * (1 - k) : 0), z * out * w);
    }
    g.computeVertexNormals();
    return g;
  }
  // a leafy clump with an uneven, overhanging silhouette
  function clump(r, seed) {
    const g = blob(r, seed, 0.28, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) p.setY(i, y * 0.62); }
    return g;
  }
  function treeGeo(kind, seed) {
    const b = new Builder(seed); const R = rng(seed);
    let ao = { ao: 0.32, aoMin: 0.4 };
    if (kind === 'broad') {
      // a tall summer tree: forked trunk and a heavy, uneven crown of dark leaf clumps
      const h = 0.3 + R() * 0.1, lean = (R() - 0.5) * 0.06;
      b.add(new T.CylinderGeometry(0.03, 0.055, h, 6, 1, true), '#4a3626', { x: lean / 2, y: h / 2, rz: -lean / h, m: SURF.wood });
      for (let i = 0; i < 2; i++) { const a = i * 3.1 + R(); b.add(new T.CylinderGeometry(0.01, 0.022, 0.16, 4, 1, true), '#4a3626', { x: lean + Math.cos(a) * 0.05, y: h + 0.04, z: Math.sin(a) * 0.05, rz: -Math.cos(a) * 0.7, rx: Math.sin(a) * 0.7, m: SURF.wood }); }
      const greens = ['#2a4419', '#30501c', '#26401a', '#36561f'];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const top = i === 0; const a = i / (n - 1) * Math.PI * 2 + R() * 0.6; const rr = top ? 0 : 0.12 + R() * 0.04;
        const y = h + (top ? 0.24 : 0.06 + R() * 0.14);
        b.add(clump(top ? 0.18 : 0.13 + R() * 0.04, seed * 7 + i), greens[i % 4], { x: lean + Math.cos(a) * rr, y, z: Math.sin(a) * rr, m: SURF.leaf, jit: 0.05, grad: [h - 0.02, h + 0.42, '#55702a'] });
      }
    } else if (kind === 'pine' || kind === 'snowpine') {
      // a tall, narrow conifer with four drooping tiers
      const snow = kind === 'snowpine';
      const h = 0.1 + R() * 0.04;
      b.add(new T.CylinderGeometry(0.012, 0.03, h + 0.1, 5, 1, true), '#3a2a1c', { y: (h + 0.1) / 2, m: SURF.wood });
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const q = i / (tiers - 1); const r = 0.22 - q * 0.12, ch = 0.22 - q * 0.06, y = h + i * 0.13 + ch / 2;
        const base = snow ? '#26402e' : '#22402a';
        b.add(pineTier(r, ch, 5 + (i < 2 ? 1 : 0), seed * 3 + i), base, { y, ry: R() * 3, m: SURF.leaf, jit: 0.05, grad: snow ? [y - ch * 0.05, y + ch * 0.25, '#dde6ee'] : [y - ch / 2, y + ch / 2, '#4a6a36'] });
      }
    } else if (kind === 'dead') {
      const h = 0.4 + R() * 0.15;
      b.seg([0, 0, 0], [0.03, h, 0.01], 0.045, 0.018, '#4a3e34', { m: SURF.wood });
      for (let i = 0; i < 5; i++) {
        const a = R() * 6.28; const y = h * (0.45 + R() * 0.45); const ex = [Math.cos(a) * 0.17, y + 0.08 + R() * 0.06, Math.sin(a) * 0.17];
        b.seg([0.01, y, 0], ex, 0.016, 0.008, '#4a3e34', { m: SURF.wood });
        b.seg(ex, [ex[0] * 1.35 + (R() - 0.5) * 0.05, ex[1] + 0.07, ex[2] * 1.35], 0.008, 0.003, '#4a3e34', { m: SURF.wood });
      }
      ao = { ao: 0.2, aoMin: 0.6 };
    } else if (kind === 'bush') {
      for (let i = 0; i < 3; i++) b.add(clump(0.08 + R() * 0.04, seed + i), ['#2c4a1c', '#34521e', '#28441a', '#3a5a22'][i], { x: (R() - 0.5) * 0.16, y: 0.05 + R() * 0.03, z: (R() - 0.5) * 0.16, m: SURF.leaf, jit: 0.05, grad: [0, 0.16, '#5a7430'] });
      ao = { ao: 0.12, aoMin: 0.5 };
    } else if (kind === 'reeds') {
      for (let i = 0; i < 11; i++) b.add(cone(0.008, 0.2 + R() * 0.12, 3), R() < 0.5 ? '#5a6632' : '#7a7442', { x: (R() - 0.5) * 0.25, y: 0.1, z: (R() - 0.5) * 0.25, rx: (R() - 0.5) * 0.4, rz: (R() - 0.5) * 0.4, m: SURF.fur });
      ao = { ao: 0.15, aoMin: 0.55 };
    } else if (kind === 'rock') {
      b.add(rock(0.12, seed), '#6a645a', { y: 0.05 });
      if (R() < 0.6) b.add(rock(0.06, seed + 9), '#767064', { x: 0.12, y: 0.02, z: 0.05 });
      ao = { ao: 0.1, aoMin: 0.6 };
    } else if (kind === 'crag' || kind === 'snowcrag') {
      // a cluster of jagged rock spires
      const snow = kind === 'snowcrag';
      const n = 3 + Math.floor(R() * 2);
      // each spire reaches a third of its height below ground, so it never shows a flat base on a slope
      for (let i = 0; i < n; i++) {
        const h = (i === 0 ? 0.95 : 0.45 + R() * 0.4); const r = h * (0.42 + R() * 0.12); const sink = h * 0.34;
        const a = R() * 6.28, d = i === 0 ? 0 : 0.18 + R() * 0.16;
        b.add(spire(r, h + sink, seed * 5 + i), i % 2 ? '#4c463d' : '#403b34', { x: Math.cos(a) * d, y: -sink, z: Math.sin(a) * d, ry: R() * 6, jit: 0.14, grad: snow ? [h * 0.7, h * 0.84, '#dfe6ec'] : [-sink, h, '#665d50'] });
      }
      // scree around the foot blends the rock into the slope
      for (let i = 0; i < 5; i++) { const a = i * 1.257 + R() * 0.6, d = 0.3 + R() * 0.12; b.add(rock(0.1 + R() * 0.05, seed * 7 + i), i % 2 ? '#4a443b' : '#57503f', { x: Math.cos(a) * d, y: -0.03, z: Math.sin(a) * d, jit: 0.1 }); }
      ao = { ao: 0.4, aoMin: 0.5 };
    } else if (kind === 'flowers') {
      const cs = ['#d8c458', '#e2ded2', '#9c84c0', '#c07484'];
      const c = cs[Math.floor(R() * 4)];
      for (let i = 0; i < 7; i++) b.add(sph(0.014, 0), c, { x: (R() - 0.5) * 0.3, y: 0.02, z: (R() - 0.5) * 0.3, jit: 0.15 });
      ao = null;
    }
    return b.build(ao);
  }

  /* ================= blueprint cache and instancing ================= */
  const cache = {};
  function blueprint(key) {
    if (cache[key]) return cache[key];
    // stand-ins (0.24): a villain's own monster or lair with no model yet borrows another's, scaled, until its art arrives
    { const Gm = typeof Game !== 'undefined' ? Game : {}; const u = key.startsWith('unit-') ? key.slice(5) : null, pre = key.startsWith('obj-') ? 'obj-' : '';
      const C = u && !UNIT_DEF[u] && Gm.CREATURES && Gm.CREATURES[u], D = !u && !P[key] && Gm.DUNGEONS && Gm.DUNGEONS[key.slice(pre.length)];
      const st = C && C.stand ? 'unit-' + C.stand : D && D.stand ? pre + D.stand : null;
      if (st && st !== key) { const base = blueprint(st); const sc = (C && C.sc) || 1; cache[key] = Object.assign({}, base, { h: base.h * sc, scale: sc }); return cache[key]; } }
    const b = new Builder(key.length * 31 + key.charCodeAt(0)), g = new Builder(3); const L = [];
    let h = 0.5;
    const unit = key.startsWith('unit-') ? key.slice(5) : null;
    const cit = key.startsWith('cit-') ? key.slice(4) : null;
    if (unit && UNIT_DEF[unit]) { UNIT_DEF[unit](b, g); for (const l of UNIT_LIGHTS[unit] || []) L.push(l); }
    else if (cit && CB[cit]) CB[cit](b, g, L);
    else if (P[key]) P[key](b, g, L);
    else b.add(box(0.2, 0.2, 0.2), '#ff00ff', { y: 0.1 });
    const body = b.empty ? null : b.build({ ao: true }); const glow = g.empty ? null : g.build();
    if (body) h = body.boundingBox.max.y;
    cache[key] = { body, glow, lights: L, h };
    return cache[key];
  }
  // a renderable group for a blueprint; opts.mat overrides the body material (for flashing units)
  function make(key, opts) {
    opts = opts || {};
    const bp = blueprint(key); const grp = new T.Group();
    const k = bp.scale || 1;
    if (bp.body) { const m = new T.Mesh(bp.body, opts.mat || MAT.body); m.scale.setScalar(k); m.castShadow = opts.shadow !== false; m.receiveShadow = true; grp.add(m); grp.userData.body = m; }
    if (bp.glow) { const m = new T.Mesh(bp.glow, opts.glowMat || MAT.glow); m.scale.setScalar(k); grp.add(m); grp.userData.glow = m; }
    if (!opts.noLights) for (const [x, y, z, c, s] of bp.lights) { const sp = glowSprite(c, s * (opts.lightScale || 1), 0.85); sp.position.set(x * k, y * k, z * k); grp.add(sp); }
    grp.userData.h = bp.h;
    return grp;
  }
  const TREE_KINDS = ['broad', 'pine', 'snowpine', 'dead', 'bush', 'reeds', 'rock', 'crag', 'snowcrag', 'flowers'];
  const treeCache = {};
  function treeVariants(kind) {
    if (!treeCache[kind]) treeCache[kind] = [0, 1, 2].map(i => treeGeo(kind, 100 + i * 17 + kind.length * 5));
    return treeCache[kind];
  }

  /* ================= magic circles under units ================= */
  const circleTex = {};
  function runeCircle(color) {
    if (circleTex[color]) return circleTex[color];
    const S = 256; const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
    c.translate(S / 2, S / 2);
    const glow = c.createRadialGradient(0, 0, S * 0.15, 0, 0, S * 0.5);
    glow.addColorStop(0, 'rgba(255,255,255,0.0)'); glow.addColorStop(0.75, 'rgba(255,255,255,0.22)'); glow.addColorStop(0.86, 'rgba(255,255,255,0.05)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, S / 2, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, S * 0.4, 0, 7); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(0, 0, S * 0.33, 0, 7); c.stroke();
    c.lineWidth = 2.5;
    for (let i = 0; i < 12; i++) { c.save(); c.rotate(i / 12 * Math.PI * 2); c.beginPath(); c.moveTo(0, -S * 0.39); c.lineTo(S * 0.02, -S * 0.35); c.lineTo(-S * 0.02, -S * 0.35); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(-2, -S * 0.355, 4, 8); c.restore(); }
    c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 * 2; const r = S * 0.33; if (i) c.lineTo(Math.sin(a) * r, -Math.cos(a) * r); else c.moveTo(0, -r); } c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1;
    const t = new T.CanvasTexture(cv);
    circleTex[color] = t;
    return t;
  }
  function circleMesh(color, size, opacity) {
    const m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: runeCircle('w'), color: new T.Color(color), transparent: true, opacity: opacity || 0.9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
    return m;
  }

  return { T, MAT, SURF, GRAIN, painted, Builder, rng, lin, make, blueprint, glowSprite, GLOW_TEX, radialTex, treeVariants, TREE_KINDS, circleMesh, runeCircle, CITADEL_SPOTS, blob, rock, UNIT_DEF, defineHero, heroOpts };
})();
