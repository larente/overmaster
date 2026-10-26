/* Overmaster — animated dice for attack rolls, saves, checks and damage */
const Dice = (() => {
  'use strict';
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D20 = '<svg viewBox="0 0 40 44" aria-hidden="true"><path class="f" d="M20 1L38 11.5V32.5L20 43L2 32.5V11.5Z"/><path class="l" d="M20 1L9 15H31ZM9 15L2 32.5M31 15L38 32.5M9 15L20 34L31 15M2 32.5L20 34L38 32.5M20 34V43M20 1V1" /></svg>';
  const SHAPE = { 4: 'd4', 6: 'd6', 8: 'd8', 10: 'd10', 12: 'd12', 20: 'd20' };
  const sgn = v => (v >= 0 ? '+' : '−') + Math.abs(v);
  const RES = { hit: 'Hit', crit: 'Critical!', miss: 'Miss', fumble: 'Natural 1', success: 'Success', fail: 'Fail' };

  function d20Html(v, dim) { return `<span class="die20${dim ? ' dim' : ''}"><span class="n">${v}</span>${D20}</span>`; }
  function smallDie(d, hidden) { return `<span class="die ${SHAPE[d.s] || 'd6'}${d.label ? ' x' : ''}" title="d${d.s}${d.label ? ' (' + esc(d.label) + ')' : ''}"><span class="n">${hidden ? '?' : d.v}</span></span>`; }

  // render one roll record into an element; returns a promise that resolves when the animation ends
  function show(el, rec, speed) {
    speed = reduced ? 0.01 : (speed || 1);
    el.innerHTML = render(rec);
    el.hidden = false;
    const card = el.lastElementChild;
    card.classList.add('rolling');
    const rollMs = 420 * speed, settle = 160 * speed;
    const nums = Array.from(card.querySelectorAll('.die20 .n'));
    const finals = nums.map(n => n.textContent);
    const smalls = Array.from(card.querySelectorAll('.rdmg .die .n'));
    const smallFinals = smalls.map(n => n.textContent);
    smalls.forEach(n => { n.parentElement.classList.add('pending'); });
    const t0 = performance.now();
    return new Promise(done => {
      if (speed < 0.05) { card.classList.remove('rolling'); card.classList.add('settled'); smalls.forEach(n => n.parentElement.classList.remove('pending')); done(); return; }
      const iv = setInterval(() => {
        const t = performance.now() - t0;
        if (t < rollMs) { nums.forEach(n => { n.textContent = 1 + Math.floor(Math.random() * 20); }); return; }
        clearInterval(iv);
        nums.forEach((n, i) => { n.textContent = finals[i]; });
        card.classList.remove('rolling'); card.classList.add('settled');
        // damage dice tumble in one after another
        const per = Math.max(12, Math.min(60, 360 / Math.max(1, smalls.length))) * speed;
        smalls.forEach((n, i) => setTimeout(() => { n.parentElement.classList.remove('pending'); n.parentElement.classList.add('pop'); n.textContent = smallFinals[i]; }, settle + i * per));
        const after = settle + smalls.length * per + (smalls.length ? 260 : 120) * speed;
        setTimeout(() => { card.classList.add('done'); done(); }, after);
      }, 45);
    });
  }

  function exprHtml(rec) {
    const parts = [`<b class="nat">${rec.nat}</b>`];
    if (rec.bonus) parts.push(`<span>${sgn(rec.bonus)}</span>`);
    for (const e of rec.extras || []) parts.push(`<span class="xd">${sgn(e.v)} <small>d${e.s} ${esc(e.label)}</small></span>`);
    const vs = rec.vsLabel === 'needs' ? `<span class="vs">needs 10</span>` : `<span class="vs">vs ${rec.vsLabel} ${rec.vs}</span>`;
    return `${parts.join(' ')} <span class="eq">=</span> <b class="tot">${rec.total}</b> ${vs}`;
  }
  function dmgHtml(dm, heal) {
    const max = 24; const shown = dm.dice.slice(0, max);
    const more = dm.dice.length - shown.length;
    let h = `<div class="rdmg${heal ? ' heal' : ''}"><span class="dice">${shown.map(d => smallDie(d)).join('')}${more > 0 ? `<span class="more">+${more} dice</span>` : ''}</span>`;
    const mods = [];
    if (dm.flat) mods.push(`<span>${sgn(dm.flat)}</span>`);
    if (dm.scale && dm.scale !== 1) mods.push(`<span title="Large stacks roll for ten and scale up">×${(Math.round(dm.scale * 10) / 10)}</span>`);
    if (dm.mult && dm.mult !== 1) mods.push(`<span title="${dm.mult < 1 ? 'Reduced' : 'Increased'} damage">×${dm.mult === 0.5 ? '½' : dm.mult === 0.25 ? '¼' : dm.mult}</span>`);
    h += `<span class="mods">${mods.join(' ')}</span><span class="eq">=</span><b class="dtot">${dm.total}</b><span class="unit">${heal ? 'healed' : 'damage'}</span></div>`;
    return h;
  }
  function render(rec) {
    const res = rec.result;
    const cls = `rollcard k-${rec.kind} r-${res || 'none'}`;
    let h = `<div class="${cls}"><div class="rtitle">${esc(rec.title || '')}${rec.skill ? ` <small>${esc(rec.skill)} check</small>` : ''}</div>`;
    if (rec.kind === 'opposed') {
      h += `<div class="ropp"><div class="side"><span class="who">${esc(rec.a.name)}</span>${d20Html(rec.a.d20[0])}<span class="expr"><span>${sgn(rec.a.bonus)}</span> = <b class="tot">${rec.a.total}</b></span></div>
        <span class="vsbig">vs</span>
        <div class="side"><span class="who">${esc(rec.b.name)}</span>${d20Html(rec.b.d20[0])}<span class="expr"><span>${sgn(rec.b.bonus)}</span> = <b class="tot">${rec.b.total}</b></span></div></div>
        <div class="rfoot"><span class="rres">${res === 'success' ? esc(rec.a.name) + ' wins' : esc(rec.b.name) + ' wins'}</span>${rec.fudged ? '<span class="fudge">fudged</span>' : ''}</div></div>`;
      return h;
    }
    if (rec.kind === 'dmg') { h += dmgHtml(rec.dmg, rec.heal) + '</div>'; return h; }
    const dice = rec.d20 || [];
    const keep = rec.mode === 'adv' ? Math.max(...dice) : rec.mode === 'dis' ? Math.min(...dice) : dice[0];
    let dropped = false;
    const dh = dice.map(v => { const dim = dice.length > 1 && (v !== keep || dropped); if (!dim) dropped = true; return d20Html(v, dim); }).join('');
    h += `<div class="rrow"><span class="d20s${rec.mode ? ' ' + rec.mode : ''}">${dh}</span><span class="expr">${exprHtml(rec)}</span><span class="rres">${RES[res] || ''}</span></div>`;
    const notes = (rec.notes || []).slice();
    if (rec.mode === 'adv') notes.unshift('Advantage');
    if (rec.mode === 'dis') notes.unshift('Disadvantage');
    if (rec.fudged) notes.push('Fudged by the DM');
    if (notes.length) h += `<div class="rnotes">${notes.map(esc).join(' · ')}</div>`;
    if (rec.dmg) h += dmgHtml(rec.dmg, rec.heal);
    return h + '</div>';
  }
  return { show, render };
})();
