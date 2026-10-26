/* Overmaster — sound. Effects and ambience through Web Audio; music on two crossfading audio elements.
   Files come from art/audio/ as listed under "audio" in art/manifest.json; with none there, everything is silent.
   Browsers only allow sound after the first click or key press, so nothing plays before that. */
const SND = (() => {
  const S = {
    ctx: null, master: null, bus: {}, buf: {}, pending: {}, files: {}, base: 'art/', unlocked: false, muted: false,
    vol: { master: 0.8, music: 0.5, sfx: 0.8, amb: 0.5, voice: 0.9 }, last: {}, duck: 1,
    mus: { key: null, want: null, el: null, fade: 0, old: [] },
    amb: { key: null, want: null, src: null, gain: null },
    steps: { key: null, want: null, src: null, gain: null }
  };
  const has = k => !!S.files[k];
  // 'hit' plays hit, hit-1, hit-2... at random
  const variants = name => Object.keys(S.files).filter(k => k === name || (k.indexOf(name + '-') === 0 && /^\d+$/.test(k.slice(name.length + 1))));

  function load(audio, base) {
    S.files = audio || {}; S.base = base || S.base;
    if (S.unlocked) { preload(); if (S.mus.want) music(S.mus.want); if (S.amb.want) amb(S.amb.want); }
  }
  function ensure() {
    if (S.ctx) return S.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { S.ctx = new AC(); } catch (e) { return null; }
    S.master = S.ctx.createGain(); S.master.connect(S.ctx.destination);
    for (const k of ['sfx', 'amb', 'voice']) { const g = S.ctx.createGain(); g.connect(S.master); S.bus[k] = g; }
    apply(); return S.ctx;
  }
  function unlock() {
    const c = ensure(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    if (S.unlocked) return;
    S.unlocked = true; preload();
    if (S.mus.want) music(S.mus.want); if (S.amb.want) amb(S.amb.want);
  }
  function decode(k) {
    if (S.buf[k]) return Promise.resolve(S.buf[k]);
    if (S.pending[k]) return S.pending[k];
    const f = S.files[k]; if (!f || !ensure()) return Promise.resolve(null);
    S.pending[k] = fetch(S.base + f.file).then(r => r.ok ? r.arrayBuffer() : null)
      .then(a => a && new Promise((res, rej) => S.ctx.decodeAudioData(a, res, rej)))
      .then(b => { S.buf[k] = b; return b; }).catch(() => null);
    return S.pending[k];
  }
  // the short effects first, then the ambience loops; music streams when it's needed
  function preload() {
    const ks = Object.keys(S.files).filter(k => S.files[k].kind !== 'music').sort((a, b) => (S.files[a].kind === 'amb') - (S.files[b].kind === 'amb'));
    let i = 0; const next = () => { if (i < ks.length) decode(ks[i++]).then(next); }; next(); next();
  }
  function apply() {
    const m = S.muted ? 0 : S.vol.master;
    if (S.master) { S.master.gain.value = m; S.bus.sfx.gain.value = S.vol.sfx; S.bus.amb.gain.value = S.vol.amb * S.duck; S.bus.voice.gain.value = S.vol.voice; }
    if (S.mus.el) S.mus.el.volume = Math.max(0, Math.min(1, m * S.vol.music * S.mus.fade * S.duck));
  }
  // an effect: o.vol (0..1), o.rate (playback speed), o.delay (seconds)
  function play(name, o) {
    o = o || {};
    if (!S.unlocked || S.muted || !S.vol.master || !S.vol.sfx) return;
    const now = performance.now(); if (S.last[name] && now - S.last[name] < (o.gap || 60)) return; S.last[name] = now;
    const vs = variants(name); if (!vs.length) return;
    const k = vs[Math.floor(Math.random() * vs.length)];
    const go = b => {
      if (!b || !S.ctx) return;
      const src = S.ctx.createBufferSource(); src.buffer = b;
      src.playbackRate.value = o.rate || (0.96 + Math.random() * 0.08);
      const g = S.ctx.createGain(); g.gain.value = o.vol === undefined ? 1 : o.vol;
      src.connect(g); g.connect(S.bus.sfx); src.start(S.ctx.currentTime + (o.delay || 0));
    };
    if (S.buf[k]) go(S.buf[k]); else decode(k).then(b => { if (performance.now() - now < 400) go(b); });
  }
  // music: one track at a time, crossfading over a second and a half; null fades to silence
  function music(name) {
    S.mus.want = name;
    if (!S.unlocked || name === S.mus.key) return;
    const f = name && S.files[name];
    if (S.mus.el) { const old = S.mus.el; S.mus.old.push({ el: old, v0: old.volume, t0: performance.now() }); }
    S.mus.el = null; S.mus.key = name; S.mus.fade = 0;
    if (f) {
      const el = new Audio(S.base + f.file); el.loop = f.loop !== false; el.volume = 0; el.preload = 'auto';
      el.play().catch(() => {}); S.mus.el = el; S.mus.t0 = performance.now();
    }
    tick();
  }
  let ticking = false;
  function tick() {
    if (ticking) return; ticking = true;
    const step = () => {
      const now = performance.now(); let busy = false;
      if (S.mus.el && S.mus.fade < 1) { S.mus.fade = Math.min(1, (now - S.mus.t0) / 1500); apply(); busy = busy || S.mus.fade < 1; }
      S.mus.old = S.mus.old.filter(o => { const f = Math.max(0, 1 - (now - o.t0) / 1200); o.el.volume = o.v0 * f; if (f <= 0) { o.el.pause(); o.el.src = ''; return false; } busy = true; return true; });
      if (busy) requestAnimationFrame(step); else ticking = false;
    };
    requestAnimationFrame(step);
  }
  // a seamless loop on one layer (L), faded in over fin seconds and out over fout
  function layer(L, name, bus, fin, fout) {
    L.want = name;
    if (!S.unlocked || name === L.key || !ensure()) return;
    L.key = name; const t = S.ctx.currentTime;
    if (L.src) { const { src, gain } = L; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + fout); src.stop(t + fout + 0.05); L.src = null; }
    if (!name || !has(name)) return;
    decode(name).then(b => {
      if (!b || L.key !== name || L.src) return;
      const src = S.ctx.createBufferSource(); src.buffer = b; src.loop = true;
      const g = S.ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(S.bus[bus]);
      const t0 = S.ctx.currentTime; g.gain.linearRampToValueAtTime(1, t0 + fin);
      src.start(t0, Math.random() * b.duration); // a different stretch each time, so a short walk isn't always the same few steps
      L.src = src; L.gain = g;
    });
  }
  // ambience: under everything, crossfaded slowly
  const amb = name => layer(S.amb, name, 'amb', 2, 1.5);
  // footsteps while the party walks: quick to start, quick to stop, with the effects volume
  const steps = name => layer(S.steps, name, 'sfx', 0.2, 0.35);
  // a hero speaks: the line plays on its own bus and the music dips under it. Resolves to { t0, dur, now() } or null.
  // A hero's lines share one file: at and dur pick the line out of it (0.20.1).
  const vbuf = {};
  function voice(file, at, len) {
    if (!S.unlocked || S.muted || !S.vol.master || !S.vol.voice || !ensure()) return Promise.resolve(null);
    const p = vbuf[file] || (vbuf[file] = fetch(S.base + file).then(r => r.ok ? r.arrayBuffer() : null).then(a => a && new Promise((res, rej) => S.ctx.decodeAudioData(a, res, rej))).catch(() => null));
    return p.then(b => {
      if (!b) return null;
      const src = S.ctx.createBufferSource(); src.buffer = b; src.connect(S.bus.voice);
      const off = Math.max(0, Math.min(b.duration, at || 0)), dur = len ? Math.min(len + 0.05, b.duration - off) : b.duration - off;
      const t0 = S.ctx.currentTime + 0.05; src.start(t0, off, dur);
      S.duck = 0.45; apply(); clearTimeout(S.duckT); S.duckT = setTimeout(() => { S.duck = 1; apply(); }, (dur + 0.4) * 1000);
      return { t0, dur, now: () => S.ctx.currentTime - t0, stop: () => { try { src.stop(); } catch (e) { /* already done */ } } };
    });
  }
  // settings are 0..100
  function setVolumes(st) {
    const v = (x, d) => (x === undefined || x === null ? d : Math.max(0, Math.min(100, +x)) / 100);
    S.vol = { master: v(st.volMaster, 0.8), music: v(st.volMusic, 0.5), sfx: v(st.volSfx, 0.8), amb: v(st.volAmb, 0.5), voice: v(st.volVoice, 0.9) };
    S.muted = !!st.muted; apply();
  }
  function setMuted(on) { S.muted = !!on; apply(); }
  // nothing plays while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!S.ctx) return;
    if (document.hidden) { S.ctx.suspend().catch(() => {}); if (S.mus.el) S.mus.el.pause(); }
    else if (S.unlocked) { S.ctx.resume().catch(() => {}); if (S.mus.el) S.mus.el.play().catch(() => {}); }
  });
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { capture: true, passive: true });
  return { load, unlock, play, music, amb, steps, voice, setVolumes, setMuted, has: k => variants(k).length > 0, get muted() { return S.muted; }, _s: () => S };
})();
window.SND = SND;
