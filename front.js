/* Overmaster — title screen (and its opening), new-campaign setup, saves, accounts, settings and feedback */
const Front = (() => {
  'use strict';
  const G = Game, A = Art, UI = window.BTS_UI;
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = { villain: { type: 'lich', name: '', title: '', pron: '' }, campaign: '', party: [], filter: 'all', latest: null, busy: false };
  const randomOf = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- small helpers ---------- */
  function toast(text, tone, ms) {
    if (UI.active()) { UI.toast(text, tone); return; }
    const box = $('ftoasts'); const el = document.createElement('div'); el.className = 'toast ' + (tone || ''); el.textContent = text; box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms || 3600);
  }
  const heroKey = h => 'unit-hero-' + (h.rid || h.id);
  const LOCK = '<svg class="lk" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="7" width="10" height="7.5" rx="1.4" fill="currentColor"/></svg>';
  const GLOGO = '<svg class="glogo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const skuName = sku => { const c = Shop.CATALOG[sku]; return !c ? 'that' : c.villain ? 'the ' + c.name : c.name; };
  const ssx = {
    get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* storage off */ } }
  };
  const portraitOf = h => A.URI[heroKey(h)] || A.portrait(h);
  const ago = t => {
    if (!t) return '';
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return `${Math.round(s / 60)} min ago`; if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const where = it => it.meta ? `Week ${it.meta.week} · day ${it.meta.day} · level ${it.meta.level}` : '';
  const vIcon = type => 'unit-' + (G.BOSS_TYPES[type] || G.BOSS_TYPES.lich).icon;
  function busy(el, on, text) { if (!el) return; if (on) { el.dataset.label = el.textContent; el.textContent = text || 'Working…'; el.disabled = true; } else { el.textContent = el.dataset.label || el.textContent; el.disabled = false; } }

  /* ================= the opening: a few seconds before the title, once a visit ================= */
  const EMBLEM_SRC = `<svg class="emblem" viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="emH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c5aa8"/><stop offset="1" stop-color="#0f1f46"/></linearGradient><linearGradient id="emV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1a66"/><stop offset="1" stop-color="#14061e"/></linearGradient><linearGradient id="emG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset=".5" stop-color="#e8bf5a"/><stop offset="1" stop-color="#8a5f1c"/></linearGradient><clipPath id="emS"><path d="M60 8 106 20 104 70C102 103 84 122 60 132 36 122 18 103 16 70L14 20Z"/></clipPath></defs><g clip-path="url(#emS)"><rect x="0" y="0" width="60" height="140" fill="url(#emH)"/><rect x="60" y="0" width="60" height="140" fill="url(#emV)"/><g fill="#f2c75a"><circle cx="35" cy="48" r="7"/><path d="M35 34v6M35 56v6M21 48h6M43 48h6M25 38l4 4M41 54l4 4M25 58l4-4M41 42l4-4" stroke="#f2c75a" stroke-width="2.4" stroke-linecap="round"/></g><path d="M74 49q11-10 22 0-11 10-22 0Z" fill="#ffcf9a"/><circle cx="85" cy="49" r="4.2" fill="#d4202a"/><circle cx="85" cy="49" r="1.6" fill="#1a0408"/><path d="M73 40l-5-9 9 6M97 40l5-9-9 6" fill="#c9b07a"/></g><path d="M60 8 106 20 104 70C102 103 84 122 60 132 36 122 18 103 16 70L14 20Z" fill="none" stroke="url(#emG)" stroke-width="5" stroke-linejoin="round"/><path d="M60 8V132" stroke="url(#emG)" stroke-width="2.4"/><g transform="translate(60 86)"><path d="M0-25 21.6-12.5V12.5L0 25-21.6 12.5V-12.5Z" fill="#1c140c" stroke="url(#emG)" stroke-width="3.2" stroke-linejoin="round"/><path d="M0-25-10.8-3.5h21.6ZM-10.8-3.5-21.6-12.5M10.8-3.5 21.6-12.5M-10.8-3.5 0 13.5 10.8-3.5M0 13.5V25M-21.6 12.5 0 13.5 21.6 12.5" fill="none" stroke="url(#emG)" stroke-width="1.6" stroke-linejoin="round"/><text y="7" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-size="9" font-weight="800" fill="#fff0c0">20</text></g></svg>`;
  const emblem = k => EMBLEM_SRC.replace(/\bem([HVGS])\b/g, 'em$1' + k);  // own gradient ids per copy
  const wordmark = cls => `<h1 class="wordmark ${cls || ''}" aria-label="Overmaster">${'OVERMASTER'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</h1>`;
  function showIntro() {
    let seen = false; try { seen = sessionStorage.getItem('om-intro') === '1'; } catch (e) { /* no storage */ }
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = $('intro'); if (!el || seen || calm) return;
    el.innerHTML = `<canvas class="i-embers" aria-hidden="true"></canvas>
      <p class="i-pres"><span>Alex Larente</span><small>presents</small></p>
      <div class="i-logo">${emblem('i')}${wordmark('big')}<p class="i-tag">Heroes need villains. You're both.</p></div>
      <p class="i-press">${window.matchMedia && matchMedia('(hover: none)').matches ? 'Tap to begin' : 'Press any key'}</p>`;
    el.hidden = false; el.classList.remove('out', 'go'); $('front').classList.add('introing');
    embers(el.querySelector('canvas'), () => !el.hidden);
    // start the sequence once the display font is in, so the wordmark never flashes in a fallback face
    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    fonts.then(() => el.classList.add('go'));
    let done = false;
    const go = e => {
      if (done) return; done = true; if (e) { e.preventDefault(); e.stopPropagation(); }
      try { sessionStorage.setItem('om-intro', '1'); } catch (err) { /* no storage */ }
      removeEventListener('keydown', go, true); el.removeEventListener('pointerdown', go);
      if (window.SND) setTimeout(() => SND.play('dark', { vol: 0.55, rate: 0.8 }), 30);
      el.classList.add('out', 'go'); $('front').classList.remove('introing'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 900);
    };
    addEventListener('keydown', go, true); el.addEventListener('pointerdown', go);
  }
  // sparks drifting up from below, like embers from a brazier
  function embers(cv, alive) {
    const c = cv.getContext('2d'); const P = [];
    const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; c.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener('resize', fit);
    const spawn = (w, h, y) => ({ x: Math.random() * w, y: y === undefined ? h + 10 : y, v: 18 + Math.random() * 40, s: 0.6 + Math.random() * 2.2, ph: Math.random() * 6.3, life: 0.4 + Math.random() * 0.6 });
    let last = performance.now();
    const step = now => {
      if (!alive()) { removeEventListener('resize', fit); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const w = cv.clientWidth, h = cv.clientHeight;
      while (P.length < 70) P.push(spawn(w, h, P.length < 40 ? Math.random() * h : undefined));
      c.clearRect(0, 0, w, h); c.globalCompositeOperation = 'lighter';
      for (const p of P) {
        p.y -= p.v * dt; p.x += Math.sin(now / 900 + p.ph) * 0.3; if (p.y < -10) Object.assign(p, spawn(w, h));
        const a = Math.max(0, Math.min(1, p.y / h)) * p.life; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 4);
        g.addColorStop(0, `rgba(255,214,140,${a})`); g.addColorStop(0.4, `rgba(255,140,40,${a * 0.5})`); g.addColorStop(1, 'rgba(255,90,0,0)');
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.s * 4, 0, 7); c.fill();
      }
      c.globalCompositeOperation = 'source-over'; requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ================= title ================= */
  function showTitle() {
    $('front').hidden = false; $('setup').hidden = true; $('title').hidden = false;
    if (window.SND) { try { SND.setVolumes(Store.settings()); } catch (e) { /* no settings */ } SND.music('music-title'); SND.amb(null); }
    const bg = $('fbg'); const in3d = UI.startTitle(bg); bg.classList.toggle('flat', !in3d); if (!in3d) UI.flatTitle(bg);
    renderTitle();
    Store.latest().then(l => { F.latest = l; renderTitle(); }).catch(() => {});
  }
  function accountHtml() {
    const u = Store.user();
    if (!Store.cloudReady()) return `<p class="acct-note">Saves stay in this browser. Export a save file from the menu to move it to another computer.</p>`;
    if (u) return `<div class="acct"><span class="av" aria-hidden="true">${esc((u.name || '?').charAt(0).toUpperCase())}</span><span class="awho"><b>${esc(u.name)}</b><small>Saves go to your account</small></span><button class="lnk" data-fx="account">Account</button></div>`;
    return `<div class="acct guest"><span class="awho"><b>Playing as a guest</b><small>Saves stay in this browser</small></span><button class="btn sm" data-fx="account">Sign in</button></div>`;
  }
  function renderTitle() {
    const L = F.latest;
    const cont = L ? `<button class="tbtn primary" data-fx="continue"><span>Continue</span><small>${esc(L.name)} · ${esc(where(L))}</small></button>` : '';
    $('title').innerHTML = `<div class="tcol">
        <div class="tlogo">${emblem('t')}<div>${wordmark()}<p class="eyebrow">Heroes need villains. You're both.</p></div></div>
        <p class="tag">Run the villain's tower and the heroes' town. Breed monsters, raise a blacksmith, and push four heroes until they're strong enough to tear your tower down.</p>
        <nav class="tmenu" aria-label="Main menu">
          ${cont}
          <button class="tbtn${L ? '' : ' primary'}" data-fx="new"><span>New campaign</span>${L ? '' : '<small>Pick a villain and a party of four</small>'}</button>
          <button class="tbtn" data-fx="load"><span>Load game</span></button>
          ${Shop.enabled() ? `<button class="tbtn" data-fx="shop"><span>Shop</span>${Shop.paidVillains().every(Shop.owns) ? '' : '<small>Unlock more villains</small>'}</button>` : ''}
          <button class="tbtn" data-fx="howto"><span>How to play</span></button>
          <button class="tbtn" data-fx="settings"><span>Settings</span></button>
        </nav>
        ${accountHtml()}
      </div>
      <footer class="tfoot"><span class="credit">Developed by <b>Alex Larente</b></span><span class="ver">Alpha ${esc(Store.VERSION.replace(/-alpha$/, ''))}</span><button class="lnk" data-fx="feedback">Send feedback</button><button class="lnk" data-fx="feedback" data-kind="bug">Report a bug</button></footer>`;
  }

  /* ================= new campaign: villain ================= */
  function newCampaign() {
    const T = G.BOSS_TYPES.lich;
    F.villain = { type: 'lich', name: T.names[0], title: T.title, pron: T.pron }; F.campaign = ''; F.party = G.DEFAULT_PARTY.slice(); F.filter = 'all';
    showSetup('villain');
  }
  function showSetup(step) {
    F.step = step; UI.stopTitle();
    $('title').hidden = true; $('setup').hidden = false; $('front').hidden = false;
    $('fbg').classList.add('flat');
    renderSetup(); $('setup').scrollTop = 0;
  }
  function renderSetup() {
    const step = F.step;
    const head = `<header class="shead"><button class="lnk back" data-fx="${step === 'villain' ? 'title' : 'tovillain'}">${step === 'villain' ? '← Title screen' : '← Villain'}</button>
      <ol class="steps"><li class="${step === 'villain' ? 'on' : 'done'}"><b>1</b> Your villain</li><li class="${step === 'party' ? 'on' : ''}"><b>2</b> The heroes</li></ol></header>`;
    $('setup').innerHTML = `<div class="sin">${head}${step === 'villain' ? villainHtml() : partyHtml()}</div>`;
  }
  function villainHtml() {
    const V = F.villain; const T = G.BOSS_TYPES[V.type];
    const cards = G.BOSS_ORDER.map(k => { const t = G.BOSS_TYPES[k]; const lk = !Shop.villainOpen(k); return `<button class="vcard${k === V.type ? ' on' : ''}${lk ? ' locked' : ''}" data-fx="vtype" data-k="${k}" aria-pressed="${k === V.type}">
        ${lk ? `<span class="lockchip" title="Unlock for ${esc(Shop.label(Shop.villainSku(k)))}">${LOCK}${esc(Shop.money(Shop.price(Shop.villainSku(k))))}</span>` : ''}<img src="${A.URI[vIcon(k)]}" data-icon="${vIcon(k)}" alt="" draggable="false"><span class="vtxt"><b>${esc(t.label)}</b><span>${esc(t.blurb)}</span><i>${t.powers.map(p => esc(G.BOSS_POWERS[p].name)).join(' · ')}</i></span></button>`; }).join('');
    const pr = Object.keys(G.PRON).map(k => `<button class="pill${V.pron === k ? ' on' : ''}" data-fx="vpron" data-k="${k}" aria-pressed="${V.pron === k}">${G.PRON[k].label}</button>`).join('');
    const full = V.title ? `${V.name || T.names[0]}, ${V.title}` : (V.name || T.names[0]);
    return `<div class="stitle"><h2>Who is your Big Bad?</h2><p>Every villain waits on the throne of the Dark Tower at level 20. Each kind fights differently, so the heroes will need different things from you to get ready.</p></div>
      <div class="vgrid">
        <div class="vcards" role="group" aria-label="Kind of villain">${cards}</div>
        <aside class="vform">
          <img class="vbig" src="${A.URI[vIcon(V.type)]}" data-icon="${vIcon(V.type)}" alt="">
          <p class="vfull" id="v-full">${esc(full)}</p>
          <p class="vkind">A level 20 ${esc(T.label.toLowerCase())}</p>
          ${Shop.villainOpen(V.type) ? '' : unlockPanel(V.type)}
          <label class="fld" for="v-name"><span>Name</span><span class="inrow"><input id="v-name" maxlength="28" autocomplete="off" value="${esc(V.name)}"><button class="btn sm" data-fx="vroll" title="Pick a random name and title">Roll</button></span></label>
          <label class="fld" for="v-title"><span>Title</span><input id="v-title" maxlength="40" autocomplete="off" list="v-titles" value="${esc(V.title)}"><datalist id="v-titles">${T.titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
          <div class="fld"><span>Referred to as</span><div class="pills" role="group" aria-label="Pronouns">${pr}</div></div>
          <label class="fld" for="c-name"><span>Campaign name</span><input id="c-name" maxlength="48" autocomplete="off" placeholder="The Fall of ${esc(V.name || T.names[0])}" value="${esc(F.campaign)}"></label>
        </aside>
      </div>
      <footer class="sfoot"><button class="btn" data-fx="title">Cancel</button>${Shop.villainOpen(V.type) ? '<button class="btn big" data-fx="toparty">Next: choose the heroes</button>'
        : `<button class="btn big" data-fx="buy" data-sku="${Shop.villainSku(V.type)}">${LOCK} Unlock to play · ${esc(Shop.money(Shop.price(Shop.villainSku(V.type))))}</button>`}</footer>`;
  }
  // what a locked villain offers, and the buttons to unlock it
  function unlockPanel(type) {
    const T = G.BOSS_TYPES[type], M = G.MINION_TYPES[type], sku = Shop.villainSku(type), bundle = 'bundle-dark-court';
    const both = Shop.price(bundle) > Shop.price(sku);
    return `<div class="unlock"><p class="ulead">${LOCK}Unlock the ${esc(T.label)} to play it</p>
      <ul class="plain udiff">${T.signature ? `<li><b>On the map:</b> ${esc(T.signature)}</li>` : ''}<li><b>Minions:</b> ${esc(M.name)}. ${esc(M.text)}</li><li><b>In the final battle:</b> ${T.powers.map(p => esc(G.BOSS_POWERS[p].name)).join(' · ')}</li></ul>
      <button class="btn big" data-fx="buy" data-sku="${sku}">Unlock · ${esc(Shop.label(sku))}</button>
      ${both ? `<button class="btn" data-fx="buy" data-sku="${bundle}">All four paid villains · ${esc(Shop.label(bundle))}</button>` : ''}
      <p class="hint">Yours for good, on every device you sign in on.</p></div>`;
  }

  /* ================= new campaign: party ================= */
  function partyHtml() {
    const ids = F.party;
    const slots = [0, 1, 2, 3].map(i => { const r = G.ROSTER_BY[ids[i]]; return r
      ? `<button class="pslot" data-fx="pick" data-id="${r.id}" title="Remove ${esc(r.name)}"><img src="${portraitOf(r)}" data-icon="${heroKey(r)}" alt=""><span><b>${esc(r.name)}</b><small>${esc(G.RACES[r.race].label)} ${esc(G.CLASSES[r.cls].label.toLowerCase())}</small></span><i aria-hidden="true">×</i></button>`
      : `<div class="pslot empty"><span class="ring" aria-hidden="true"></span><span><b>Seat ${i + 1}</b><small>Pick a hero below</small></span></div>`; }).join('');
    const notes = G.partyNotes(ids).map(n => `<li class="${n.tone}">${esc(n.text)}</li>`).join('');
    const filters = [['all', 'All twenty']].concat(G.CLASS_ORDER.map(c => [c, G.CLASSES[c].label + 's'])).map(([k, n]) => `<button class="pill${F.filter === k ? ' on' : ''}" data-fx="filter" data-k="${k}" aria-pressed="${F.filter === k}">${n}</button>`).join('');
    const races = G.RACE_ORDER.map(k => { const R = G.RACES[k]; return `<li><b>${esc(R.label)}</b> · ${esc(R.trait)}: ${esc(R.text)}</li>`; }).join('');
    const cards = G.ROSTER.filter(r => F.filter === 'all' || r.cls === F.filter).map(r => {
      const n = ids.indexOf(r.id); const on = n >= 0; const D = G.DRIVES[r.drive];
      return `<button class="hcard${on ? ' on' : ''}" data-fx="pick" data-id="${r.id}" aria-pressed="${on}"${!on && ids.length >= 4 ? ' data-full="1"' : ''}>
        <img src="${portraitOf(r)}" data-icon="${heroKey(r)}" alt="" draggable="false">
        <span class="htxt"><b>${esc(r.name)}</b><span class="rc">${esc(G.RACES[r.race].label)} ${esc(G.CLASSES[r.cls].label.toLowerCase())}</span><span class="drv d-${r.drive}">${esc(D.label)}: ${esc(D.want)}</span><span class="bio">${esc(r.bio)}</span></span>
        ${on ? `<span class="seat" aria-label="Seat ${n + 1}">${n + 1}</span>` : ''}</button>`;
    }).join('');
    return `<div class="stitle"><h2>Who sits at your table?</h2><p>Your four players each run one of these heroes. You never control them. They chase what they want, so a mix of wants keeps everyone busy.</p></div>
      <div class="pbar"><div class="pslots">${slots}</div>
        <div class="ptools"><button class="btn sm" data-fx="roll" data-k="balanced">One of each class</button><button class="btn sm" data-fx="roll" data-k="random">Random party</button><button class="btn sm" data-fx="clear"${ids.length ? '' : ' disabled'}>Clear</button></div>
        ${notes ? `<ul class="pnotes">${notes}</ul>` : ''}</div>
      <div class="rhead"><div class="pills" role="group" aria-label="Show">${filters}</div><details class="races"><summary>What each race brings</summary><ul>${races}</ul></details></div>
      <div class="roster">${cards}</div>
      <footer class="sfoot"><button class="btn" data-fx="tovillain">Back</button><span class="sum">${ids.length}/4 heroes${ids.length === 4 ? ` · against ${esc(fullName())}` : ''}</span><button class="btn big" data-fx="begin"${ids.length === 4 ? '' : ' disabled'}>Begin the campaign</button></footer>`;
  }
  const fullName = () => { const V = F.villain; const T = G.BOSS_TYPES[V.type]; return V.title ? `${V.name || T.names[0]}, ${V.title}` : (V.name || T.names[0]); };
  function pick(id) {
    const i = F.party.indexOf(id);
    if (i >= 0) F.party.splice(i, 1);
    else if (F.party.length < 4) F.party.push(id);
    else { toast('The table is full. Click a seated hero to make room.', 'warn'); return; }
    const y = $('setup').scrollTop; renderSetup(); $('setup').scrollTop = y;
  }
  function begin(btn) {
    if (F.party.length !== 4 || F.busy) return;
    if (!Shop.villainOpen(F.villain.type)) { showSetup('villain'); return; }
    F.busy = true; busy(btn, true, 'Rolling up the world…');
    setTimeout(() => {
      const state = G.newGame(null, { party: F.party, villain: F.villain, name: F.campaign });
      Store.autosave(state, true);
      $('front').hidden = true; F.busy = false;
      UI.open(state, { fresh: true });
    }, 30);
  }

  /* ================= saves ================= */
  function saveRow(it, opts) {
    const m = it.meta || {}; const heroes = m.heroes || [];
    const ps = heroes.map(h => `<img src="${portraitOf(h)}" data-icon="${heroKey(h)}" alt="">`).join('');
    const done = m.result ? `<span class="tagx ${m.result === 'victory' ? 'good' : 'bad'}">${m.result === 'victory' ? 'Won' : 'Party fell'}</span>` : '';
    return `<div class="srow" data-slot="${esc(it.slot)}" data-where="${it.where}">
      <div class="sparty"><img class="sv" src="${A.URI[vIcon(m.vtype)]}" data-icon="${vIcon(m.vtype)}" alt="">${ps}</div>
      <div class="sinfo"><b>${esc(it.name)}</b> ${done}<span>${esc(m.villain || '')}</span><small>${esc(it.label)} · ${esc(where(it))}${it.updated ? ' · ' + esc(ago(it.updated)) : ''}</small></div>
      <div class="sact">${opts.save ? `<button class="btn sm" data-fx="saveto" data-slot="${esc(it.slot)}" data-where="${it.where}">Save here</button>` : `<button class="btn sm" data-fx="loadit" data-slot="${esc(it.slot)}" data-where="${it.where}">Load</button><button class="btn sm" data-fx="exportit" data-slot="${esc(it.slot)}" data-where="${it.where}" title="Download this save as a file">Export</button><button class="btn sm danger" data-fx="delask" data-slot="${esc(it.slot)}" data-where="${it.where}">Delete</button>`}</div></div>`;
  }
  async function showLoad() {
    UI.modal(`<h1 class="dtitle">Load a game</h1><p class="hint" id="ld-msg">Looking for your saves…</p><div id="ld-list"></div>
      <div class="row end"><label class="btn" for="ld-file">Import a save file</label><input type="file" id="ld-file" accept=".json,application/json" hidden><button class="btn" data-act="close">Close</button></div>`, null, 'wide saves');
    const { cloud, local, cloudErr } = await Store.list();
    const u = Store.user(); let h = '';
    if (Store.cloudReady()) h += `<h2 class="cap">${u ? 'Your account' : 'Your account (sign in to see these)'}</h2>${u ? (cloud.length ? cloud.map(it => saveRow(it, {})).join('') : '<p class="hint">No saves in your account yet.</p>') : `<p class="hint"><button class="lnk" data-fx="account">Sign in</button> to load games saved on other devices.</p>`}`;
    h += `<h2 class="cap">This browser</h2>${local.length ? local.map(it => saveRow(it, {})).join('') : '<p class="hint">No saves in this browser yet.</p>'}`;
    if (!$('ld-list')) return;
    $('ld-list').innerHTML = h; $('ld-msg').textContent = cloudErr ? cloudErr : 'Autosaves keep your three most recent campaigns. Slots keep whatever you put there.';
  }
  async function loadIt(slot, where_, btn) {
    busy(btn, true, 'Loading…');
    let s = null; try { s = await Store.load(slot, where_); } catch (e) { busy(btn, false); toast(e.message, 'bad'); return; }
    busy(btn, false);
    if (!s) { toast('That save couldn\'t be read.', 'bad'); return; }
    openGame(s);
  }
  function openGame(s) { UI.closeModal(); UI.stopTitle(); $('front').hidden = true; UI.open(s); }
  async function showSave() {
    const s = UI.state(); if (!s) return;
    const u = Store.user(); const w = u ? 'cloud' : 'local';
    UI.modal(`<h1 class="dtitle">Save the game</h1><p class="hint">${u ? 'Saves go to your account, so you can load them on any device.' : Store.cloudReady() ? 'Saves stay in this browser. Sign in to keep them in the cloud.' : 'Saves stay in this browser.'} The game also autosaves as you play.</p><div id="sv-list"><p class="hint">Looking for your slots…</p></div>
      <div class="row end"><button class="btn" data-fx="exportcur">Export to a file</button><button class="btn" data-act="close">Close</button></div>`, null, 'wide saves');
    const { cloud, local } = await Store.list();
    const have = (w === 'cloud' ? cloud : local).filter(x => Store.SLOTS.indexOf(x.slot) >= 0);
    const rows = Store.SLOTS.map(slot => { const it = have.find(x => x.slot === slot); return it ? saveRow(it, { save: true }) : `<div class="srow empty"><div class="sparty"></div><div class="sinfo"><b>${Store.slotLabel(slot)}</b><small>Empty</small></div><div class="sact"><button class="btn sm" data-fx="saveto" data-slot="${slot}" data-where="${w}">Save here</button></div></div>`; }).join('');
    if ($('sv-list')) $('sv-list').innerHTML = rows;
  }
  async function saveTo(slot, w, btn) {
    const s = UI.state(); if (!s) return;
    if (btn.dataset.sure !== '1' && btn.closest('.srow:not(.empty)')) { btn.dataset.sure = '1'; btn.textContent = 'Replace it?'; btn.classList.add('danger'); return; }
    busy(btn, true, 'Saving…');
    const err = await Store.save(slot, s, w);
    busy(btn, false);
    if (err) { toast(err, 'bad'); return; }
    UI.closeModal(); toast(`Saved to ${Store.slotLabel(slot).toLowerCase()}${w === 'cloud' ? ' in your account' : ''}.`, 'good');
  }
  async function exportSlot(slot, w) {
    const s = await Store.load(slot, w).catch(() => null);
    if (!s) { toast('That save couldn\'t be read.', 'bad'); return; }
    exportState(s);
  }
  async function exportState(s) {
    const file = (s.name || 'campaign').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + `-week${s.week}.json`;
    const err = await Store.download(file, Store.exportText(s));
    toast(err || 'Save file downloaded.', err ? 'bad' : 'good');
  }
  function importFile(file) {
    const rd = new FileReader();
    rd.onload = () => { const r = Store.importText(String(rd.result)); if (r.error) { toast(r.error, 'bad'); return; } Store.autosave(r.state, true); openGame(r.state); toast(`Loaded ${r.state.name}.`, 'good'); };
    rd.onerror = () => toast('That file couldn\'t be read.', 'bad');
    rd.readAsText(file);
  }
  async function delAsk(btn) {
    if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'Delete for good?'; return; }
    const err = await Store.remove(btn.dataset.slot, btn.dataset.where);
    if (err) { toast(err, 'bad'); return; }
    const row = btn.closest('.srow'); if (row) row.remove();
    toast('Save deleted.', 'sys');
    if (!UI.active()) Store.latest().then(l => { F.latest = l; if (!$('title').hidden) renderTitle(); }).catch(() => {});
  }

  /* ================= account ================= */
  function showAccount(mode, note) {
    if (!Store.cloudReady()) { UI.modal(`<h1 class="dtitle">Accounts</h1><p>This copy of the game doesn't have accounts set up, so saves stay in this browser. Use <b>Export</b> in the Load screen to move a save to another computer.</p><div class="row end"><button class="btn" data-act="close">Close</button></div>`); return; }
    const u = Store.user();
    if (Store.recovering()) mode = 'reset';
    if (u && mode !== 'reset') {
      const mine = Shop.paidVillains().filter(Shop.owns).map(k => Shop.CATALOG[k].name);
      const unlocks = (Shop.enabled() ? `<p class="hint">${mine.length ? `Unlocked: ${esc(mine.join(', '))}.` : 'No paid villains unlocked yet.'} <button type="button" class="lnk" data-fx="shop">Shop</button></p>` : '')
        + '<div class="coderow"><span>Have a code from a giveaway or the beta?</span><button type="button" class="btn sm" data-fx="redeem">Redeem a code</button></div>';
      UI.modal(`<h1 class="dtitle">Your account</h1><form class="form" id="acc-form" data-form="rename">
        <label class="fld" for="acc-name"><span>Name shown in the game</span><input id="acc-name" maxlength="40" value="${esc(u.name)}" autocomplete="nickname"></label>
        <p class="hint">Signed in as ${esc(u.email)}. Your saves${Shop.enabled() ? ' and unlocks' : ''} follow you to any device where you sign in.</p>${unlocks}
        <p class="msg" id="acc-msg" role="status"></p>
        <div class="row end"><button type="button" class="btn danger" data-fx="signout">Sign out</button><button type="submit" class="btn">Save name</button><button type="button" class="btn" data-act="close">Close</button></div></form>`);
      return;
    }
    mode = mode || 'signin';
    const tabs = mode === 'reset' ? '' : `<div class="atabs" role="tablist"><button role="tab" class="atab${mode === 'signin' ? ' on' : ''}" aria-selected="${mode === 'signin'}" data-fx="acctab" data-k="signin">Sign in</button><button role="tab" class="atab${mode === 'signup' ? ' on' : ''}" aria-selected="${mode === 'signup'}" data-fx="acctab" data-k="signup">Create an account</button></div>`;
    const body = mode === 'reset' ? `<p>Choose a new password for your account.</p>
        <label class="fld" for="acc-pw"><span>New password</span><input id="acc-pw" type="password" minlength="8" required autocomplete="new-password"></label>`
      : `${mode === 'signup' ? '<label class="fld" for="acc-name"><span>Your name</span><input id="acc-name" maxlength="40" required autocomplete="nickname"></label>' : ''}
        <label class="fld" for="acc-email"><span>Email</span><input id="acc-email" type="email" required autocomplete="email"></label>
        <label class="fld" for="acc-pw"><span>Password${mode === 'signup' ? ' (at least 8 characters)' : ''}</span><input id="acc-pw" type="password" minlength="${mode === 'signup' ? 8 : 1}" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}"></label>`;
    const extra = mode === 'signin' ? `<div class="row alt"><button type="button" class="lnk" data-fx="magic">Email me a sign-in link instead</button><button type="button" class="lnk" data-fx="forgot">Forgot your password?</button></div>` : '';
    const google = Store.google && mode !== 'reset' ? `<button type="button" class="btn wide gbtn" data-fx="google">${GLOGO}Continue with Google</button><div class="or"><span>or use email</span></div>` : '';
    const lead = note || (Shop.enabled() ? 'An account keeps your saves and unlocks in the cloud, so you can pick up a campaign on any device.' : 'An account keeps your saves in the cloud, so you can pick up a campaign on any device.');
    UI.modal(`<h1 class="dtitle">${mode === 'reset' ? 'Set a new password' : 'Your account'}</h1>${mode === 'reset' ? '' : `<p class="hint${note ? ' note' : ''}">${esc(lead)}</p>`}${google}${tabs}
      <form class="form" id="acc-form" data-form="${mode}">${body}<p class="msg" id="acc-msg" role="status"></p>
      <div class="row end"><button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn big">${mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Save password' : 'Sign in'}</button></div>${extra}</form>`);
  }
  function accMsg(t, tone) { const el = $('acc-msg'); if (el) { el.textContent = t; el.className = 'msg ' + (tone || ''); } }
  async function submitAccount(form) {
    const mode = form.dataset.form; const btn = form.querySelector('[type="submit"]');
    const v = id => ($(id) ? $(id).value.trim() : '');
    busy(btn, true); accMsg('');
    let r;
    if (mode === 'signin') r = await Store.signIn(v('acc-email'), $('acc-pw').value);
    else if (mode === 'signup') r = await Store.signUp(v('acc-email'), $('acc-pw').value, v('acc-name'));
    else if (mode === 'reset') r = await Store.setPassword($('acc-pw').value);
    else if (mode === 'rename') r = await Store.rename(v('acc-name'));
    busy(btn, false);
    if (r.error) { accMsg(r.error, 'bad'); return; }
    if (mode === 'signup' && r.needConfirm) { accMsg(`Almost there. We sent a confirmation link to ${v('acc-email')}. Open it, then sign in here.`, 'good'); return; }
    UI.closeModal();
    toast(mode === 'reset' ? 'Password changed.' : mode === 'rename' ? 'Name saved.' : `Signed in as ${Store.user() ? Store.user().name : 'you'}.`, 'good');
    afterAuth();
  }
  async function emailOnly(kind, btn) {
    const email = $('acc-email') ? $('acc-email').value.trim() : '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { accMsg('Type your email address first.', 'warn'); return; }
    busy(btn, true, 'Sending…');
    const r = kind === 'magic' ? await Store.magicLink(email) : await Store.forgot(email);
    busy(btn, false);
    accMsg(r.error || (kind === 'magic' ? `Check ${email} for a sign-in link. It brings you right back here.` : `Check ${email} for a link to choose a new password.`), r.error ? 'bad' : 'good');
  }
  function afterAuth() { if (!UI.active() && !$('front').hidden && !$('title').hidden) { renderTitle(); Store.latest().then(l => { F.latest = l; renderTitle(); }).catch(() => {}); } }

  /* ================= the shop ================= */
  function showShop() {
    const u = Store.user(); const bundle = 'bundle-dark-court';
    const btn = sku => Shop.ownsAll(sku) ? '<span class="owned">Owned</span>' : `<button class="btn${Shop.CATALOG[sku].bundle ? ' big' : ''}" data-fx="buy" data-sku="${sku}">${esc(Shop.label(sku))}</button>`;
    const vs = Shop.paidVillains();
    const rows = vs.map(sku => { const k = Shop.CATALOG[sku].villain, T = G.BOSS_TYPES[k];
      return `<div class="sitem${Shop.owns(sku) ? ' have' : ''}"><img src="${A.URI[vIcon(k)]}" data-icon="${vIcon(k)}" alt=""><div><b>${esc(T.label)}</b><small>${esc(T.blurb)}</small></div>${btn(sku)}</div>`; }).join('');
    const stack = vs.map(sku => { const k = Shop.CATALOG[sku].villain; return `<img src="${A.URI[vIcon(k)]}" data-icon="${vIcon(k)}" alt="">`; }).join('');
    const save = Shop.price(bundle) && Shop.price(bundle) < vs.filter(v => !Shop.owns(v)).length * 299 ? ` <em>Save ${esc(Shop.money(vs.filter(v => !Shop.owns(v)).length * 299 - Shop.price(bundle)))}</em>` : '';
    UI.modal(`<h1 class="dtitle">Shop</h1>
      <p class="hint">Overmaster is free to play, and the Lich and the Ancient Dragon are always free. Unlock the other villains once and they're yours on every device you sign in on.</p>
      <div class="shoplist">
        <div class="sitem bundle${Shop.ownsAll(bundle) ? ' have' : ''}"><span class="stack">${stack}</span><div><b>${esc(Shop.CATALOG[bundle].name)}${save}</b><small>${esc(Shop.CATALOG[bundle].blurb)}</small></div>${btn(bundle)}</div>
        ${rows}
      </div>
      ${u ? `<p class="hint">Signed in as ${esc(u.email)}. Prices in Canadian dollars; checkout is handled by Stripe.</p>` : '<p class="hint note">Sign in to buy. Your unlocks are kept with your account, so they follow you to any device.</p>'}
      <p class="msg" id="shop-msg" role="status"></p>
      <div class="row end"><button class="lnk" data-fx="redeem">Redeem a code</button>${u ? '<button class="lnk" data-fx="restore">Restore purchases</button>' : '<button class="btn" data-fx="account">Sign in</button>'}<button class="btn" data-act="close">Close</button></div>`, null, 'wide');
  }
  const shopOpen = () => !!document.querySelector('#modal .shoplist');
  function shopMsg(t, tone) { const el = $('shop-msg'); if (el) { el.textContent = t; el.className = 'msg ' + (tone || ''); } else if (t) toast(t, tone); }
  async function buyFlow(sku, btn) {
    if (!Shop.enabled() || !Shop.CATALOG[sku]) return;
    // remember the setup screen, so the player comes back to the villain they were looking at
    if (!$('setup').hidden) ssx.set('om-setup', JSON.stringify({ villain: F.villain, campaign: F.campaign, party: F.party }));
    if (!Store.user()) {
      await Shop.buy(sku);
      showAccount('signin', `Sign in to unlock ${skuName(sku)}. Your unlocks are kept with your account, so they follow you to any device.`);
      return;
    }
    busy(btn, true, 'Opening checkout…');
    const r = await Shop.buy(sku);
    if (r.leaving) return;
    busy(btn, false);
    if (r.owned) { await Shop.refresh(); shopMsg('You already own that. It\'s unlocked now.', 'good'); return; }
    if (r.error) shopMsg(r.error, 'bad');
  }
  // after signing in to buy: offer to carry on to checkout
  function offerPending() {
    const sku = Shop.pending(); if (!sku || !Store.user()) return;
    if (Shop.ownsAll(sku)) { Shop.clearPending(); return; }
    UI.modal(`<h1 class="dtitle">Signed in</h1><p>Carry on to unlock <b>${esc(skuName(sku))}</b> for ${esc(Shop.label(sku))}?</p>
      <div class="row end"><button class="btn" data-fx="notnow">Not now</button><button class="btn big" data-fx="buy" data-sku="${sku}">Continue to checkout</button></div>`);
  }
  function rerenderFront() {
    if (UI.active() || $('front').hidden) return;
    if (!$('setup').hidden) renderSetup(); else if (!$('title').hidden) renderTitle();
    if (shopOpen()) showShop();
  }
  async function afterCheckout(ret) {
    const saved = ssx.get('om-setup'); ssx.set('om-setup', null);
    if (saved) { try { const o = JSON.parse(saved); F.villain = o.villain; F.campaign = o.campaign || ''; F.party = o.party || G.DEFAULT_PARTY.slice(); F.filter = 'all'; showSetup('villain'); } catch (e) { /* stay on the title */ } }
    if (ret.kind === 'cancel') { toast('Checkout cancelled. Nothing was charged.', 'sys'); return; }
    toast('Payment received. Unlocking…', 'sys');
    const got = await Shop.waitFor(ret.sku, 30000);
    rerenderFront();
    if (got) toast(`Unlocked: ${skuName(ret.sku)}. Thank you for supporting Overmaster!`, 'good', 8000);
    else toast('Your payment went through, but the unlock hasn\'t arrived yet. In a minute, open the Shop and press Restore purchases.', 'warn', 12000);
  }

  /* ================= codes ================= */
  const listNames = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function showRedeem(prefill) {
    if (!Store.cloudReady()) return;
    if (!Store.user()) { ssx.set('om-code', prefill || ''); showAccount('signin', 'Sign in to redeem your code. Whatever it unlocks is kept with your account, on every device.'); return; }
    UI.modal(`<h1 class="dtitle">Redeem a code</h1>
      <p class="hint">Codes come from giveaways, beta invitations and the developer. Each one unlocks something for your account, on every device you sign in on.</p>
      <form class="form" id="code-form" data-form="redeem"><label class="fld" for="code-in"><span>Code</span>
        <input id="code-in" class="codein" maxlength="48" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="OVM-XXXX-XXXX" value="${esc(prefill || '')}"></label>
        <p class="msg" id="code-msg" role="status"></p>
        <div class="row end"><button type="button" class="btn" data-act="close">Close</button><button type="submit" class="btn big">Redeem</button></div></form>`);
    const inp = $('code-in'); if (inp) { inp.focus(); inp.select(); }
  }
  async function submitRedeem(form) {
    const inp = $('code-in'), btn = form.querySelector('[type="submit"]'), msg = $('code-msg');
    const say = (t, tone) => { if (msg) { msg.textContent = t; msg.className = 'msg ' + (tone || ''); } };
    if (!inp.value.trim()) { say('Type the code first.', 'warn'); return; }
    busy(btn, true, 'Checking…'); say('');
    const r = await Store.redeem(inp.value);
    busy(btn, false);
    if (r.error) { say(r.error, 'bad'); inp.focus(); return; }
    await Shop.refresh();
    const names = listNames(r.unlocked.map(k => skuName(k)));
    say(`${r.label ? r.label + ': unlocked' : 'Unlocked'} ${names || 'it'}. Enjoy!`, 'good'); inp.value = '';
    toast(`Unlocked ${names}.`, 'good', 6000);
  }

  /* ================= settings, rules, feedback ================= */
  function showSettings() {
    const st = Store.settings(); const on3d = UI.view3d() !== false;
    const vol = (k, label, v, d) => { v = v === undefined || v === null ? d : v; return `<label class="vol" for="set-${k}"><span>${label}</span><input type="range" min="0" max="100" step="5" id="set-${k}" data-vol="${k}" value="${v}"><b>${v}</b></label>`; };
    const row = (k, label, hint, val) => `<label class="tog" for="set-${k}"><input type="checkbox" id="set-${k}" data-set="${k}"${val ? ' checked' : ''}><span><b>${label}</b><small>${hint}</small></span></label>`;
    UI.modal(`<h1 class="dtitle">Settings</h1><div class="form">
      ${row('view3d', '3D map and battles', 'Turn off on slower computers to use the flat painted map.', on3d)}
      ${row('sprites', 'Sprite characters', 'Heroes, monsters and minions are flat 2D figures (pixel art where there is some) in the 3D world. Off: 3D models.', st.sprites !== false)}
      ${row('fast', 'Fast battles', 'Shorter animations for monster and hero turns.', st.fast)}
      ${row('skipfights', 'Skip every fight', 'Fights are decided at once and you only see the result, so you can focus on building. The Skip button does it for one fight.', st.skipfights)}
      ${row('dice', 'Show the dice', 'Every attack, save and check rolls on screen.', st.dice)}
      ${row('log', 'Battle log', 'A running account of every roll beside the battlefield.', st.log)}
      </div>
      <h2 class="cap">Sound</h2><div class="form vols">
      ${vol('volMaster', 'Volume', st.volMaster, 80)}${vol('volMusic', 'Music', st.volMusic, 50)}${vol('volSfx', 'Sound effects', st.volSfx, 80)}${vol('volAmb', 'Ambience', st.volAmb, 50)}${vol('volVoice', 'Hero voices', st.volVoice, 90)}
      ${row('chatter', 'Heroes talk', 'Their portraits pop up with a line when a fight starts or ends, while they travel, when they find something or need a rest.', st.chatter !== false)}
      ${row('muted', 'Mute everything', 'The speaker button beside Menu does the same.', st.muted)}
      </div><p class="hint">Settings are kept in this browser.</p><div class="row end"><button class="btn" data-act="close">Done</button></div>`);
  }
  function showFeedback(kind) {
    const s = UI.state(); kind = kind || 'idea';
    const kinds = [['bug', 'Bug'], ['balance', 'Balance'], ['idea', 'Idea'], ['other', 'Something else']];
    const u = Store.user();
    UI.modal(`<h1 class="dtitle">Send feedback</h1><p class="hint">This is an alpha. Tell us what broke, what felt too easy or too hard, and what you'd love to see.</p>
      <form class="form" id="fb-form" data-form="feedback">
        <div class="fld"><span>What kind?</span><div class="pills" role="radiogroup" aria-label="Kind of feedback">${kinds.map(([k, n]) => `<button type="button" role="radio" class="pill${k === kind ? ' on' : ''}" aria-checked="${k === kind}" data-fx="fbkind" data-k="${k}">${n}</button>`).join('')}</div><input type="hidden" id="fb-kind" value="${kind}"></div>
        <label class="fld" for="fb-msg"><span>What happened, or what's your idea?</span><textarea id="fb-msg" rows="6" maxlength="5000" required placeholder="${kind === 'bug' ? 'What were you doing, and what went wrong?' : 'Tell us anything.'}"></textarea></label>
        <label class="fld" for="fb-contact"><span>How can we reach you? (optional)</span><input id="fb-contact" maxlength="200" autocomplete="email" value="${esc(u ? u.email : '')}"></label>
        ${s ? `<label class="tog" for="fb-attach"><input type="checkbox" id="fb-attach" checked><span><b>Attach my current game</b><small>Lets us load your exact campaign to reproduce a bug.</small></span></label>` : ''}
        <p class="msg" id="fb-msgline" role="status"></p>
        <div class="row end"><button type="button" class="btn" data-act="close">Cancel</button><button type="submit" class="btn big">Send</button></div></form>`, null, 'wide');
  }
  async function submitFeedback(form) {
    const s = UI.state(); const btn = form.querySelector('[type="submit"]');
    const f = { kind: $('fb-kind').value, message: $('fb-msg').value.trim(), contact: $('fb-contact').value.trim(), attach: $('fb-attach') ? $('fb-attach').checked : false, state: s };
    if (!f.message) { $('fb-msgline').textContent = 'Write a few words first.'; return; }
    if (!Store.cloudReady()) {
      const text = `[${f.kind}] ${f.message}\n\nContact: ${f.contact || '-'}\nVersion ${Store.VERSION} · ${navigator.userAgent}${s ? `\nGame: week ${s.week}, day ${s.day}, level ${G.avgLevel(s)}, villain ${s.villain.type}, seed ${s.seed}` : ''}`;
      UI.modal(`<h1 class="dtitle">Copy your feedback</h1><p>This copy of the game can't send feedback by itself. Copy this and send it to the game's creator${Store.feedbackEmail ? ` at <b class="sel">${esc(Store.feedbackEmail)}</b>` : ''}.</p><textarea id="fb-copy" class="copybox" rows="8" readonly>${esc(text)}</textarea><div class="row end"><button class="btn" data-fx="copyfb">Copy</button><button class="btn" data-act="close">Close</button></div>`, null, 'wide');
      return;
    }
    busy(btn, true, 'Sending…');
    const r = await Store.feedback(f);
    busy(btn, false);
    if (r.error) { $('fb-msgline').textContent = r.error; $('fb-msgline').className = 'msg bad'; return; }
    UI.closeModal(); toast('Thanks! Your feedback was sent.', 'good');
  }

  /* ================= the in-game menu ================= */
  function menu() {
    const st = Store.status(); const u = Store.user(); const s = UI.state();
    const when = st.at ? `Autosaved ${ago(st.at)} ${st.where === 'account' ? 'to your account' : 'in this browser'}.` : 'The game autosaves as you play.';
    UI.modal(`<h1 class="dtitle">${esc(s ? s.name : 'Menu')}</h1><p class="hint">${esc(when)}${st.err ? ' ' + esc(st.err) : ''}</p>
      <nav class="gmenu" aria-label="Game menu">
        <button class="tbtn" data-fx="savegame"><span>Save game</span></button>
        <button class="tbtn" data-fx="load"><span>Load game</span></button>
        <button class="tbtn" data-fx="howto"><span>How to play</span></button>
        ${s && s.phase !== 'battle' ? '<button class="tbtn" data-fx="chronicle"><span>Chronicle</span><small>Everything that has happened</small></button>' : ''}
        <button class="tbtn" data-fx="settings"><span>Settings</span></button>
        <button class="tbtn" data-fx="feedback"><span>Send feedback</span></button>
        ${Store.cloudReady() ? `<button class="tbtn" data-fx="account"><span>${u ? 'Account' : 'Sign in'}</span><small>${u ? esc(u.name) : 'Keep saves in the cloud'}</small></button>` : ''}
        <button class="tbtn" data-fx="exit"><span>Exit to title</span><small>Your progress is saved</small></button>
      </nav><div class="row end"><button class="btn" data-act="close">Back to the game</button></div>`);
  }
  function exitToTitle() { UI.close(); F.latest = null; showTitle(); }

  /* ================= wiring ================= */
  function onClick(e) {
    const el = e.target.closest('[data-fx]'); if (!el) return;
    const fx = el.dataset.fx; const d = el.dataset;
    switch (fx) {
      case 'continue': if (F.latest) loadIt(F.latest.slot, F.latest.where, el); return;
      case 'new': UI.closeModal(); newCampaign(); return;
      case 'title': showTitle(); return;
      case 'load': showLoad(); return;
      case 'loadit': loadIt(d.slot, d.where, el); return;
      case 'exportit': exportSlot(d.slot, d.where); return;
      case 'exportcur': { const s = UI.state(); if (s) exportState(s); return; }
      case 'delask': delAsk(el); return;
      case 'savegame': showSave(); return;
      case 'saveto': saveTo(d.slot, d.where, el); return;
      case 'howto': if (UI.active()) UI.rules(); else showHowTo(); return;
      case 'settings': showSettings(); return;
      case 'chronicle': UI.closeModal(); UI.chronicle(); return;
      case 'feedback': showFeedback(d.kind); return;
      case 'fbkind': { for (const c of el.parentElement.children) { c.classList.toggle('on', c === el); c.setAttribute('aria-checked', c === el); } $('fb-kind').value = d.k; return; }
      case 'copyfb': { const t = $('fb-copy'); const fall = () => { t.focus(); t.select(); toast('Selected. Press Ctrl+C or Cmd+C to copy.', 'sys'); }; try { navigator.clipboard.writeText(t.value).then(() => toast('Copied.', 'good'), fall); } catch (er) { fall(); } return; }
      case 'account': showAccount(); return;
      case 'shop': showShop(); return;
      case 'redeem': showRedeem(''); return;
      case 'buy': buyFlow(d.sku, el); return;
      case 'notnow': Shop.clearPending(); UI.closeModal(); return;
      case 'restore': busy(el, true, 'Checking…'); Shop.refresh().then(r => { busy(el, false); if (shopOpen()) showShop(); shopMsg(r.error || 'Your unlocks are up to date.', r.error ? 'bad' : 'good'); }); return;
      case 'acctab': showAccount(d.k); return;
      case 'magic': emailOnly('magic', el); return;
      case 'forgot': emailOnly('forgot', el); return;
      case 'google': Store.google().then(r => { if (r.error) accMsg(r.error, 'bad'); }); return;
      case 'signout': Store.signOut().then(() => { UI.closeModal(); toast('Signed out. Saves now stay in this browser.', 'sys'); afterAuth(); }); return;
      case 'exit': exitToTitle(); return;
      case 'vtype': { const T = G.BOSS_TYPES[d.k]; const V = F.villain; const wasDefault = !V.name || G.BOSS_TYPES[V.type].names.indexOf(V.name) >= 0; const wasTitle = !V.title || G.BOSS_TYPES[V.type].titles.indexOf(V.title) >= 0;
        V.type = d.k; if (wasDefault) V.name = T.names[0]; if (wasTitle) V.title = T.title; V.pron = T.pron; renderSetup(); return; }
      case 'vroll': { const T = G.BOSS_TYPES[F.villain.type]; F.villain.name = randomOf(T.names.filter(n => n !== F.villain.name)); F.villain.title = randomOf(T.titles); renderSetup(); return; }
      case 'vpron': F.villain.pron = d.k; renderSetup(); return;
      case 'toparty': { if (!Shop.villainOpen(F.villain.type)) { buyFlow(Shop.villainSku(F.villain.type), el); return; } const T = G.BOSS_TYPES[F.villain.type]; if (!F.villain.name.trim()) F.villain.name = T.names[0]; showSetup('party'); return; }
      case 'tovillain': showSetup('villain'); return;
      case 'pick': pick(d.id); return;
      case 'roll': F.party = G.rollParty(d.k); renderSetup(); return;
      case 'clear': F.party = []; renderSetup(); return;
      case 'filter': F.filter = d.k; renderSetup(); return;
      case 'begin': begin(el); return;
    }
  }
  function onInput(e) {
    const t = e.target; if (!t || !t.id) return;
    if (t.dataset && t.dataset.vol) {
      const st = Store.setSettings({ [t.dataset.vol]: +t.value }); UI.applySettings(st);
      const out = t.parentElement && t.parentElement.querySelector('b'); if (out) out.textContent = t.value;
      if (window.SND) SND.play(t.dataset.vol === 'volMusic' ? 'chime' : 'click', { gap: 120 });
      return;
    }
    if (t.id === 'v-name' || t.id === 'v-title') {
      F.villain[t.id === 'v-name' ? 'name' : 'title'] = t.value.replace(/[<>]/g, '');
      const full = $('v-full'); if (full) full.textContent = fullName();
      const c = $('c-name'); if (c) c.placeholder = `The Fall of ${F.villain.name || G.BOSS_TYPES[F.villain.type].names[0]}`;
    }
    if (t.id === 'c-name') F.campaign = t.value;
  }
  function onChange(e) {
    const t = e.target;
    if (t.id === 'ld-file' && t.files && t.files[0]) { importFile(t.files[0]); t.value = ''; return; }
    if (t.dataset && t.dataset.set) {
      const k = t.dataset.set;
      if (k === 'view3d') { UI.view3d(t.checked); if (!UI.active() && !$('title').hidden) showTitle(); return; }
      const st = Store.setSettings({ [k]: t.checked }); UI.applySettings(st);
    }
  }
  function onSubmit(e) {
    const f = e.target; if (!f.dataset || !f.dataset.form) return;
    e.preventDefault();
    if (f.dataset.form === 'feedback') submitFeedback(f); else if (f.dataset.form === 'redeem') submitRedeem(f); else submitAccount(f);
  }
  function showHowTo() {
    UI.modal(`<h1 class="dtitle">How to play</h1>
      <p>You are the dungeon master, and you run both towns. At the Dark Tower, your villain's minions gather gold, lumber and ore and raise monster lairs across the land. In Millbrook, you raise the buildings that make the heroes stronger. Four heroes ride out on their own and hunt the monsters you put in their way: make it hard enough to make them sweat, not so hard that they die.</p>
      <ol class="rules">
        <li><b>Pick a villain.</b> A lich, a dragon, a demon prince, an archmage, a vampire lord or a death knight waits at level 20 on your throne, each with its own minions.</li>
        <li><b>Pick four heroes</b> from twenty. They choose where to go; you never control them.</li>
        <li><b>Gather, explore and build.</b> You start with two minions, and they are your eyes: the map is dark where none have been. Click one and right-click a gold, timber or ore deposit: it spends a night opening a mine, then works it. Its menu has Move, Build and Dance. Lairs breed monsters that march out as bands; click any band you can see to make it patrol, level up or go away.</li>
        <li><b>Set the stage.</b> Patrol bands across the heroes' road, level them up to a real fight, or send away the ones that would wipe them. A band's card shows how the fight would go. Close fights pay the most.</li>
        <li><b>Run Millbrook.</b> The heroes bring loot home after every fight they win. Spend the town's purse on a market, a blacksmith, a temple and more, and post bounties to pull the party where you want.</li>
        <li><b>The finale.</b> When the heroes feel ready, they storm your tower: first the gate, then your villain on the throne. The sooner they win, the higher your score.</li>
      </ol>
      <p class="hint">You win when the heroes win. A fallen hero's player rolls up someone new at the same level. If all four fall at once, the campaign ends.</p>
      <div class="row end"><button class="btn big" data-act="close">Got it</button></div>`, null, 'wide');
  }
  // a shared link like https://…/?redeem=OVM-7KQ2-XH9D: take the code out of the address bar
  function takeCodeLink() {
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    if (!q.has('redeem')) return null;
    const code = (q.get('redeem') || '').slice(0, 48); q.delete('redeem');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { /* fine */ }
    return code;
  }
  async function start() {
    UI.boot();
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    window.addEventListener('error', e => Store.reportError(e.message, e.error && e.error.stack, UI.state()));
    window.addEventListener('unhandledrejection', e => Store.reportError('Unhandled: ' + (e.reason && e.reason.message || e.reason), e.reason && e.reason.stack, UI.state()));
    Store.onAuth((u, ev) => {
      if (ev === 'PASSWORD_RECOVERY') { showAccount('reset'); return; }
      afterAuth(); if (ev === 'SIGNED_IN' && !UI.active()) toast(`Signed in as ${u ? u.name : 'you'}.`, 'good');
      Shop.refresh().then(() => { if (!u) return; const c = ssx.get('om-code'); if (c !== null) { ssx.set('om-code', null); showRedeem(c); } else offerPending(); });
    });
    Shop.onChange(rerenderFront);
    await Store.init().catch(() => null);
    const ret = Shop.takeReturn();
    const link = takeCodeLink();
    Shop.refresh();
    const hot = window.claude && window.claude.hot && window.claude.hot.data;
    if (hot && hot.state && G.migrate(hot.state)) { $('front').hidden = true; UI.open(hot.state); }
    else { showTitle(); if (!ret && link === null) showIntro(); }
    if (Store.recovering()) showAccount('reset');
    else if (ret) afterCheckout(ret);
    else if (link !== null && Store.cloudReady()) { ssx.set('om-code', null); showRedeem(link); }
    else if (Store.user()) offerPending();
  }
  return { start, menu, showTitle, showLoad, showFeedback };
})();
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ state: window.BTS_UI.state() }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(() => Front.start());
else Front.start();
