/* Overmaster — art: SVG icons and painted terrain */
const Art = (() => {
  'use strict';
  const G = Game;

  /* ---------- medallion portraits ---------- */
  const SIDE = { party: ['#6e2a1e', '#240a07'], dm: ['#2c3c6a', '#0c1226'] };
  // painted medallion: the flat shapes get a brushy edge, a canvas-like grain and light from the top left,
  // inside a worn gold rim
  function medal(inner, side) {
    const [a, b] = SIDE[side];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>` +
      `<radialGradient id="g" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>` +
      `<clipPath id="c"><circle cx="32" cy="32" r="27"/></clipPath>` +
      `<linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2d27a"/><stop offset=".45" stop-color="#b48a34"/><stop offset=".7" stop-color="#6e5018"/><stop offset="1" stop-color="#a8822e"/></linearGradient>` +
      `<radialGradient id="l" cx="32%" cy="26%" r="80%"><stop offset="0" stop-color="#fff2d0" stop-opacity=".22"/><stop offset=".45" stop-color="#fff2d0" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>` +
      `<filter id="p" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency=".18" numOctaves="2" seed="7" result="w"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="w" scale="1.4" xChannelSelector="R" yChannelSelector="G" result="d0"/>` +
      `<feGaussianBlur in="d0" stdDeviation=".35" result="d"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency=".09 .16" numOctaves="3" seed="3" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values=".33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1" result="ng"/>` +
      `<feComposite in="d" in2="ng" operator="arithmetic" k1=".5" k2=".76" k3="0" k4="0" result="t"/>` +
      `<feComposite in="t" in2="d" operator="in"/></filter></defs>` +
      `<circle cx="32" cy="32" r="29.5" fill="url(#g)"/><g clip-path="url(#c)"><g filter="url(#p)">${inner}</g><circle cx="32" cy="32" r="27" fill="url(#l)"/></g>` +
      `<circle cx="32" cy="32" r="29" fill="none" stroke="url(#r)" stroke-width="3.4"/><circle cx="32" cy="32" r="30.6" fill="none" stroke="#000" stroke-opacity=".5" stroke-width=".8"/><circle cx="32" cy="32" r="26.6" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.3"/></svg>`;
  }
  const HEADS = {
    barbarian: `<path d="M15 31Q7 15 17 9Q14 20 21 27Z" fill="#efe6d0"/><path d="M49 31Q57 15 47 9Q50 20 43 27Z" fill="#efe6d0"/><path d="M18 31Q32 11 46 31Z" fill="#7b848e"/><ellipse cx="32" cy="39" rx="11" ry="10" fill="#d9a57a"/><rect x="18" y="28" width="28" height="5" rx="1" fill="#4b525a"/><circle cx="28" cy="38" r="1.7" fill="#2a1a10"/><circle cx="36" cy="38" r="1.7" fill="#2a1a10"/><path d="M26 34l4 1M38 34l-4 1" stroke="#5a3a20" stroke-width="1.6" stroke-linecap="round"/><path d="M20 41Q32 66 44 41Q38 48 32 47Q26 48 20 41Z" fill="#c4522a"/><path d="M27 44Q32 46 37 44" stroke="#7a2a12" stroke-width="1.4" fill="none"/>`,
    rogue: `<path d="M11 62Q13 20 32 11Q51 20 53 62Z" fill="#2f4a32"/><path d="M17 62Q19 28 32 20Q45 28 47 62Z" fill="#253b28"/><ellipse cx="32" cy="37" rx="10" ry="11" fill="#1a2419"/><rect x="21" y="40" width="22" height="9" rx="3" fill="#3b3b3b"/><path d="M25 35l5 1.5M39 35l-5 1.5" stroke="#f0d870" stroke-width="2.4" stroke-linecap="round"/><path d="M32 11v6" stroke="#3e5f42" stroke-width="2"/>`,
    cleric: `<path d="M11 62Q11 18 32 13Q53 18 53 62Z" fill="#ece6d6"/><path d="M17 62Q17 26 32 22Q47 26 47 62Z" fill="#d8d0bc"/><ellipse cx="32" cy="37" rx="10" ry="11" fill="#e2b48f"/><circle cx="32" cy="22" r="4.2" fill="#e8c35a"/><path d="M32 15v-3M32 29v0M25 22h-3M42 22h-3M27 17l-2-2M37 17l2-2" stroke="#e8c35a" stroke-width="1.6" stroke-linecap="round"/><circle cx="28" cy="36" r="1.4" fill="#3a2a20"/><circle cx="36" cy="36" r="1.4" fill="#3a2a20"/><path d="M28 42Q32 44.5 36 42" stroke="#7a3e2e" fill="none" stroke-width="1.4"/><path d="M17 54Q32 47 47 54L47 64L17 64Z" fill="#c9a24f"/>`,
    wizard: `<path d="M15 29L35 1L47 29Z" fill="#2f4c9a"/><path d="M35 1L47 29L39 29Z" fill="#243b7a"/><ellipse cx="32" cy="29" rx="21" ry="4.5" fill="#253d7c"/><circle cx="30" cy="17" r="1.6" fill="#f4e27a"/><circle cx="37" cy="23" r="1.2" fill="#f4e27a"/><circle cx="34" cy="10" r="1" fill="#f4e27a"/><ellipse cx="32" cy="37" rx="9" ry="8" fill="#e0b18c"/><circle cx="28.5" cy="36" r="1.4" fill="#2a1a10"/><circle cx="35.5" cy="36" r="1.4" fill="#2a1a10"/><path d="M21 40Q32 70 43 40Q37 45 32 44Q27 45 21 40Z" fill="#efefef"/><path d="M27 33h3M34 33h3" stroke="#d8d8d8" stroke-width="1.6"/>`,
    goblin: `<path d="M5 25L23 32L21 39Z" fill="#6f9a3a"/><path d="M59 25L41 32L43 39Z" fill="#6f9a3a"/><ellipse cx="32" cy="37" rx="13" ry="12" fill="#7fae45"/><ellipse cx="27" cy="34" rx="3.2" ry="2.3" fill="#f2d23a"/><ellipse cx="37" cy="34" rx="3.2" ry="2.3" fill="#f2d23a"/><circle cx="27" cy="34" r="1.1" fill="#000"/><circle cx="37" cy="34" r="1.1" fill="#000"/><path d="M30 38L32 41L34 38Z" fill="#5e8a2f"/><path d="M23 43Q32 50 41 43Z" fill="#fff" stroke="#3a2a10" stroke-width="1.2"/><path d="M27 44v3M31 45v3M35 45v3M39 44v2" stroke="#3a2a10" stroke-width=".9"/><path d="M24 30l5 1.5M40 30l-5 1.5" stroke="#3d5a1c" stroke-width="1.8" stroke-linecap="round"/>`,
    wolf: `<path d="M15 12L25 30L13 30Z" fill="#6b6f78"/><path d="M49 12L39 30L51 30Z" fill="#6b6f78"/><path d="M17 12L23 27L16 27Z" fill="#c9a0a0"/><path d="M47 12L41 27L48 27Z" fill="#c9a0a0"/><path d="M13 30Q32 17 51 30L45 45L37 58L27 58L19 45Z" fill="#8a8f99"/><path d="M25 43L32 60L39 43Q32 40 25 43Z" fill="#cdd0d6"/><ellipse cx="32" cy="56" rx="3.2" ry="2.2" fill="#1d1d22"/><path d="M22 35l6 2M42 35l-6 2" stroke="#f0c040" stroke-width="2.6" stroke-linecap="round"/>`,
    bandit: `<path d="M10 64Q12 24 32 14Q52 24 54 64Z" fill="#5a3e24"/><path d="M17 64Q18 30 32 23Q46 30 47 64Z" fill="#3e2a18"/><ellipse cx="32" cy="38" rx="10" ry="11" fill="#c89070"/><path d="M22 40Q32 37 42 40L41 49Q32 53 23 49Z" fill="#7a2a1e"/><path d="M24 40L40 40" stroke="#4a160e" stroke-width="1.2"/><circle cx="28" cy="35" r="1.6" fill="#1e140c"/><circle cx="36" cy="35" r="1.6" fill="#1e140c"/><path d="M24.5 31.5l5 1.4M39.5 31.5l-5 1.4" stroke="#3a2412" stroke-width="2" stroke-linecap="round"/><path d="M44 58L58 46" stroke="#6a4a2a" stroke-width="3" stroke-linecap="round"/><path d="M50 42Q60 48 54 56" stroke="#3a2a1a" stroke-width="2" fill="none"/>`,
    skeleton: `<ellipse cx="32" cy="30" rx="15" ry="15" fill="#ece8dc"/><rect x="24" y="40" width="16" height="12" rx="3" fill="#e2ddcf"/><ellipse cx="26" cy="30" rx="4.6" ry="5.2" fill="#1d1712"/><ellipse cx="38" cy="30" rx="4.6" ry="5.2" fill="#1d1712"/><path d="M32 35L29.5 40H34.5Z" fill="#1d1712"/><path d="M26 45v6M29 45v6M32 45v6M35 45v6M38 45v6" stroke="#6b6458" stroke-width="1.1"/><path d="M19 22Q22 16 28 16" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" fill="none"/>`,
    orc: `<path d="M8 56Q32 68 56 56" stroke="#7a5230" stroke-width="3" fill="none"/><path d="M8 56L56 56" stroke="#d8d0b8" stroke-width=".8"/><ellipse cx="32" cy="37" rx="14" ry="13" fill="#6f8048"/><rect x="17" y="24" width="30" height="5" rx="1" fill="#a5281f"/><path d="M47 26l6 5" stroke="#a5281f" stroke-width="3" stroke-linecap="round"/><path d="M23 33l6 2M41 33l-6 2" stroke="#2b1b0a" stroke-width="2.4" stroke-linecap="round"/><circle cx="27" cy="37" r="1.7" fill="#f2c94c"/><circle cx="37" cy="37" r="1.7" fill="#f2c94c"/><path d="M24 48L26 41L28 48Z M40 48L38 41L36 48Z" fill="#f1ead8"/><path d="M27 46Q32 48 37 46" stroke="#2b1b0a" stroke-width="1.4" fill="none"/>`,
    ogre: `<ellipse cx="32" cy="37" rx="18" ry="17" fill="#c69a6a"/><path d="M17 29Q32 22 47 29" stroke="#3c2a1a" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="26" cy="33" r="2.1" fill="#1c120a"/><circle cx="38" cy="33" r="2.1" fill="#1c120a"/><ellipse cx="32" cy="39" rx="4.5" ry="3.2" fill="#a87b50"/><path d="M21 47Q32 54 43 47L43 45L21 45Z" fill="#5a2e1a"/><path d="M23 45L25 41L27 45ZM41 45L39 41L37 45Z" fill="#f2ead8"/><path d="M15 26Q16 18 22 16" stroke="#8a6a44" stroke-width="2" fill="none"/>`,
    wraith: `<path d="M13 64Q11 22 32 9Q53 22 51 64L45 57L39 64L32 57L25 64L19 57Z" fill="#3a2d55"/><path d="M19 62Q18 28 32 18Q46 28 45 62Z" fill="#2a2040"/><ellipse cx="32" cy="35" rx="10" ry="11" fill="#0b0912"/><ellipse cx="27.5" cy="34" rx="2.8" ry="1.7" fill="#7ef2e8"/><ellipse cx="36.5" cy="34" rx="2.8" ry="1.7" fill="#7ef2e8"/><circle cx="27.5" cy="34" r="5" fill="#7ef2e8" opacity=".15"/><circle cx="36.5" cy="34" r="5" fill="#7ef2e8" opacity=".15"/>`,
    troll: `<ellipse cx="32" cy="37" rx="15" ry="17" fill="#4e7a3e"/><path d="M14 24Q32 6 50 24L46 28Q32 16 18 28Z" fill="#2f4a20"/><path d="M17 26l-3 8M47 26l3 8" stroke="#2f4a20" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="32" r="2.1" fill="#e8e04a"/><circle cx="38" cy="32" r="2.1" fill="#e8e04a"/><path d="M30 34Q31 52 37 47Q34 41 34 34Z" fill="#3f6630"/><path d="M23 51Q32 55 41 51" stroke="#1d2a12" stroke-width="2" fill="none"/><path d="M25 51l1 3M39 51l-1 3" stroke="#e8e0c8" stroke-width="1.6"/>`,
    giant: `<ellipse cx="32" cy="33" rx="16" ry="16" fill="#b8875b"/><path d="M13 37Q32 72 51 37Q46 47 32 46Q18 47 13 37Z" fill="#6a4a2e"/><path d="M15 25Q32 10 49 25" stroke="#5a3e24" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="26" cy="32" r="2.1" fill="#1c120a"/><circle cx="38" cy="32" r="2.1" fill="#1c120a"/><ellipse cx="32" cy="38" rx="4" ry="3" fill="#9a6a44"/><path d="M27 29l-3-1M37 29l3-1" stroke="#3c2a1a" stroke-width="2" stroke-linecap="round"/>`,
    dragon: `<path d="M20 22L13 4L27 18Z" fill="#e8d9a8"/><path d="M44 22L51 4L37 18Z" fill="#e8d9a8"/><path d="M13 30Q32 9 51 30L46 45L38 60L26 60L18 45Z" fill="#b8321f"/><path d="M24 45L32 62L40 45Q32 42 24 45Z" fill="#8f2416"/><path d="M17 30L28 34L20 37Z" fill="#f2c13a"/><path d="M47 30L36 34L44 37Z" fill="#f2c13a"/><circle cx="29" cy="56" r="1.5" fill="#2a0a05"/><circle cx="35" cy="56" r="1.5" fill="#2a0a05"/><path d="M22 24Q32 18 42 24" stroke="#7a1a0e" stroke-width="2" fill="none"/><path d="M14 40l-6 4M50 40l6 4" stroke="#b8321f" stroke-width="3" stroke-linecap="round"/>`,
    vampire: `<path d="M8 64L14 34Q32 52 50 34L56 64Z" fill="#5a0e16"/><path d="M14 34L22 64H42L50 34Q32 48 14 34Z" fill="#1a0a10"/><ellipse cx="32" cy="34" rx="11" ry="13" fill="#e8e0e6"/><path d="M20 30Q22 16 32 15Q42 16 44 30Q40 22 32 27Q24 22 20 30Z" fill="#14101a"/><path d="M27 33l4 1.2M37 33l-4 1.2" stroke="#2a1a22" stroke-width="1.6" stroke-linecap="round"/><circle cx="27.5" cy="36" r="1.6" fill="#ff2a3a"/><circle cx="36.5" cy="36" r="1.6" fill="#ff2a3a"/><path d="M27 43Q32 46 37 43" stroke="#6a1020" stroke-width="1.4" fill="none"/><path d="M29 43.5l1 3 1-3M33 43.5l1 3 1-3" fill="#fff"/>`,
    hydra: `<path d="M18 64Q14 44 22 34" stroke="#3f7a5a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M46 64Q50 44 42 34" stroke="#3f7a5a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M32 64V28" stroke="#4a8a66" stroke-width="8" stroke-linecap="round"/><ellipse cx="21" cy="31" rx="7" ry="5" fill="#4f9470"/><ellipse cx="43" cy="31" rx="7" ry="5" fill="#4f9470"/><ellipse cx="32" cy="22" rx="8" ry="6" fill="#5aa47c"/><circle cx="19" cy="30" r="1.3" fill="#ffe04a"/><circle cx="45" cy="30" r="1.3" fill="#ffe04a"/><circle cx="29" cy="21" r="1.4" fill="#ffe04a"/><circle cx="35" cy="21" r="1.4" fill="#ffe04a"/><path d="M15 34l-3 2M49 34l3 2M28 27h8" stroke="#8a2a2a" stroke-width="1.5" stroke-linecap="round"/><path d="M26 18l-2-5M38 18l2-5" stroke="#e8dcc0" stroke-width="2" stroke-linecap="round"/>`,
    demon: `<path d="M2 40Q10 20 22 30L18 46Z" fill="#5a1410"/><path d="M62 40Q54 20 42 30L46 46Z" fill="#5a1410"/><path d="M19 26Q8 14 14 4Q18 16 25 21Z" fill="#2a1a14"/><path d="M45 26Q56 14 50 4Q46 16 39 21Z" fill="#2a1a14"/><ellipse cx="32" cy="37" rx="14" ry="15" fill="#b82a1e"/><path d="M22 32l7 3M42 32l-7 3" stroke="#3a0a06" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="26.5" cy="36" rx="2.6" ry="1.8" fill="#ffd23a"/><ellipse cx="37.5" cy="36" rx="2.6" ry="1.8" fill="#ffd23a"/><path d="M23 45Q32 54 41 45L39 44Q32 49 25 44Z" fill="#2a0806"/><path d="M26 45l1 3 1-3M31 46l1 3 1-3M36 45l1 3 1-3" fill="#fff4d0"/><circle cx="32" cy="37" r="20" fill="#ff6a2a" opacity=".08"/>`,
    knight: `<path d="M15 58L15 27Q32 5 49 27L49 58Q32 63 15 58Z" fill="#3a3d44"/><path d="M15 31Q32 14 49 31" stroke="#5b6069" stroke-width="2" fill="none"/><rect x="19" y="35" width="26" height="5" rx="1" fill="#0a0b0d"/><rect x="29.5" y="25" width="5" height="22" rx="1" fill="#0a0b0d"/><circle cx="24" cy="37.5" r="1.6" fill="#ff4a3a"/><circle cx="40" cy="37.5" r="1.6" fill="#ff4a3a"/><path d="M32 6v-4" stroke="#7a1a12" stroke-width="3"/>`,
    king: `<circle cx="32" cy="36" r="22" fill="#9a4cff" opacity=".18"/><path d="M15 23L19 7L26 18L32 3L38 18L45 7L49 23Z" fill="#d9b24a" stroke="#7a5a1a" stroke-width="1"/><circle cx="32" cy="12" r="1.8" fill="#c0392b"/><rect x="15" y="21" width="34" height="5" rx="1" fill="#b8902e"/><ellipse cx="32" cy="37" rx="14" ry="13" fill="#e6e0cf"/><rect x="25" y="45" width="14" height="11" rx="3" fill="#ddd6c4"/><ellipse cx="26.5" cy="36" rx="4.2" ry="4.6" fill="#160f1f"/><ellipse cx="37.5" cy="36" rx="4.2" ry="4.6" fill="#160f1f"/><circle cx="26.5" cy="36.5" r="1.6" fill="#c06cff"/><circle cx="37.5" cy="36.5" r="1.6" fill="#c06cff"/><path d="M32 41L30 45H34Z" fill="#160f1f"/><path d="M28 49v5M32 49v5M36 49v5" stroke="#6b6458" stroke-width="1"/>`
  };
  const PARTY_ICONS = ['barbarian', 'rogue', 'cleric', 'wizard'];
  /* ---------- villain portraits for the other Big Bad types (the lich keeps 'king') ---------- */
  const recolor = (svg, map) => Object.keys(map).reduce((t, k) => t.split(k).join(map[k]), svg);
  HEADS.wyrm = `<circle cx="32" cy="38" r="24" fill="#ff7a2a" opacity=".14"/>` + recolor(HEADS.dragon, { '#b8321f': '#4c4a56', '#8f2416': '#2e2c36', '#7a1a0e': '#1e1c24', '#f2c13a': '#ff8a2a', '#e8d9a8': '#d8cfc0' }) + `<path d="M26 60Q32 66 38 60" stroke="#ff7a2a" stroke-width="1.6" fill="none" opacity=".8"/>`;
  HEADS.archfiend = recolor(HEADS.demon, { '#b82a1e': '#5a1a3a', '#5a1410': '#2a0a1a', '#2a1a14': '#c8a040', '#ffd23a': '#ff5a2a', '#ff6a2a': '#ff2a6a' }) + `<path d="M22 22L25 14L28 20L32 11L36 20L39 14L42 22Z" fill="#c8a040" stroke="#6a4a10" stroke-width=".8"/>`;
  HEADS.vlord = HEADS.vampire + `<path d="M22 20L24 12L28 17L32 10L36 17L40 12L42 20Z" fill="#c8a040" stroke="#6a4a10" stroke-width=".8"/><path d="M6 64L12 40L18 46L14 64Z" fill="#7a1020"/><path d="M58 64L52 40L46 46L50 64Z" fill="#7a1020"/>`;
  HEADS.dknight = recolor(HEADS.knight, { '#3a3d44': '#24222a', '#5b6069': '#4a3a2a', '#ff4a3a': '#ff7a2a', '#7a1a12': '#2a0a06' }) + `<path d="M17 27Q6 18 9 6Q13 18 21 22Z" fill="#d8cfc0"/><path d="M47 27Q58 18 55 6Q51 18 43 22Z" fill="#d8cfc0"/><rect x="19" y="35" width="26" height="5" rx="1" fill="#ff5a1a" opacity=".35"/>`;
  HEADS.archmage = `<circle cx="32" cy="36" r="24" fill="#7a5aff" opacity=".16"/><path d="M8 64Q10 22 32 10Q54 22 56 64Z" fill="#3a2460"/><path d="M15 64Q16 30 32 21Q48 30 49 64Z" fill="#2a1a48"/><ellipse cx="32" cy="38" rx="10" ry="12" fill="#0e0a18"/><ellipse cx="28" cy="37" rx="2.4" ry="1.5" fill="#c9a0ff"/><ellipse cx="36" cy="37" rx="2.4" ry="1.5" fill="#c9a0ff"/><path d="M20 27Q32 21 44 27" stroke="#e8c35a" stroke-width="2" fill="none"/><path d="M32 22l1.4 3 3 .4-2.2 2 .6 3-2.8-1.5-2.8 1.5.6-3-2.2-2 3-.4Z" fill="#fff0a0"/><circle cx="12" cy="20" r="1.4" fill="#d8c0ff"/><circle cx="52" cy="16" r="1.2" fill="#d8c0ff"/><circle cx="55" cy="30" r="1" fill="#d8c0ff"/><circle cx="9" cy="34" r="1" fill="#d8c0ff"/><path d="M14 52l4-2M50 52l-4-2" stroke="#c9a0ff" stroke-width="1.2"/>`;

  /* ---------- the villains' minions ---------- */
  // bone thrall (lich), kobold (dragon), imp (demon prince), clay servant (archmage), thrall (vampire lord), grave digger (death knight)
  HEADS['m-thrall'] = `<path d="M12 64Q13 30 32 24Q51 30 52 64Z" fill="#4a3e30"/><ellipse cx="32" cy="32" rx="13" ry="13" fill="#e4dfd0"/><rect x="25" y="40" width="14" height="9" rx="2" fill="#d6d0c0"/><ellipse cx="27" cy="31" rx="3.8" ry="4.4" fill="#1d1712"/><ellipse cx="37" cy="31" rx="3.8" ry="4.4" fill="#1d1712"/><circle cx="27" cy="31" r="1.2" fill="#7ad0ff"/><circle cx="37" cy="31" r="1.2" fill="#7ad0ff"/><path d="M28 44v4M32 44v4M36 44v4" stroke="#8a8478" stroke-width="1"/><path d="M8 18L20 40" stroke="#6a4a2a" stroke-width="3" stroke-linecap="round"/><path d="M4 16L14 12L13 20Z" fill="#9aa0a8"/>`;
  HEADS['m-kobold'] = `<path d="M22 22L16 8L27 18Z" fill="#e8d9a8"/><path d="M42 22L48 8L37 18Z" fill="#e8d9a8"/><path d="M18 32Q32 14 46 32L50 44L38 50L26 50L14 44Z" fill="#b0562a"/><path d="M26 44Q32 58 38 44Z" fill="#8a3e1a"/><circle cx="25" cy="33" r="3" fill="#f2c13a"/><circle cx="39" cy="33" r="3" fill="#f2c13a"/><path d="M25 31.5v3M39 31.5v3" stroke="#1a0a04" stroke-width="1.4"/><path d="M28 47l1 3M36 47l-1 3" stroke="#fff" stroke-width="1.2"/><path d="M18 26Q32 20 46 26" stroke="#d07a3a" stroke-width="1.2" fill="none"/><circle cx="50" cy="54" r="6" fill="#e8c040" stroke="#8a6a10"/>`;
  HEADS['m-imp'] = `<path d="M4 34Q10 18 20 28L18 40Z" fill="#7a1a14"/><path d="M60 34Q54 18 44 28L46 40Z" fill="#7a1a14"/><path d="M22 24Q16 12 20 4Q24 14 27 20Z" fill="#2a1a14"/><path d="M42 24Q48 12 44 4Q40 14 37 20Z" fill="#2a1a14"/><ellipse cx="32" cy="36" rx="12" ry="12" fill="#c8402a"/><path d="M24 33L30 35L24 37Z" fill="#ffd23a"/><path d="M40 33L34 35L40 37Z" fill="#ffd23a"/><path d="M26 43Q32 48 38 43" stroke="#3a0a06" stroke-width="2" fill="none"/><path d="M28 44l1 3M36 44l-1 3" stroke="#fff" stroke-width="1"/>`;
  HEADS['m-golem'] = `<rect x="17" y="18" width="30" height="34" rx="9" fill="#a8744a"/><path d="M17 30Q32 34 47 30" stroke="#7a5030" stroke-width="1.4" fill="none"/><path d="M22 22l6 4M42 24l-4 6" stroke="#7a5030" stroke-width="1"/><rect x="23" y="33" width="6" height="4" rx="1" fill="#2a1a10"/><rect x="35" y="33" width="6" height="4" rx="1" fill="#2a1a10"/><circle cx="26" cy="35" r="1.2" fill="#8ad0ff"/><circle cx="38" cy="35" r="1.2" fill="#8ad0ff"/><path d="M27 44h10" stroke="#2a1a10" stroke-width="2"/><path d="M28 12L32 18L36 12Z" fill="#e8c35a"/><text x="32" y="29" font-size="7" text-anchor="middle" fill="#e8c35a" font-family="serif">✦</text>`;
  HEADS['m-ghoul'] = `<path d="M10 64Q11 24 32 14Q53 24 54 64Z" fill="#3a1620"/><path d="M17 64Q18 30 32 22Q46 30 47 64Z" fill="#24101a"/><ellipse cx="32" cy="38" rx="10" ry="12" fill="#c8c0b8"/><ellipse cx="28" cy="36" rx="2.4" ry="1.6" fill="#7a1a1a"/><ellipse cx="36" cy="36" rx="2.4" ry="1.6" fill="#7a1a1a"/><path d="M27 45Q32 48 37 45" stroke="#5a2a2a" stroke-width="1.6" fill="none"/><path d="M18 56L46 56" stroke="#c8a040" stroke-width="3"/>`;
  HEADS['m-digger'] = `<path d="M10 64Q11 24 32 13Q53 24 54 64Z" fill="#3a3a30"/><path d="M17 64Q18 30 32 21Q46 30 47 64Z" fill="#26261e"/><ellipse cx="32" cy="38" rx="10" ry="11" fill="#9aa08a"/><ellipse cx="28" cy="37" rx="2.2" ry="1.4" fill="#ffb03a"/><ellipse cx="36" cy="37" rx="2.2" ry="1.4" fill="#ffb03a"/><path d="M28 45h8" stroke="#3a3a30" stroke-width="1.6"/><path d="M50 6L44 40" stroke="#6a4a2a" stroke-width="3" stroke-linecap="round"/><path d="M38 38L48 40L46 48L40 46Z" fill="#9aa0a8" stroke="#3a3a3a" stroke-width=".8"/>`;

  /* ---------- hero portraits, built from race, class and look ---------- */
  function shadeHex(hex, f) {
    const n = parseInt(String(hex || '#888888').slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function heroHead(r) {
    const L = r.look || {}; const race = r.race || 'human'; const cls = r.cls;
    const skin = L.skin || '#e0b08a', hair = L.hair || '#5a3a20', cloth = L.cloth || '#6a4a2a', trim = L.trim || '#d8c090';
    const [rx, ry] = { human: [10, 11], elf: [9, 11.5], dwarf: [11.5, 10], halfling: [11, 10.5], halforc: [11.5, 11] }[race] || [10, 11];
    const cx = 32, cy = race === 'halfling' ? 39 : 37;
    const dk = shadeHex(skin, 0.72), eye = race === 'halforc' ? '#2a1a06' : '#21160e';
    const hood = cls === 'rogue' || cls === 'cleric';
    let o = '';
    // shoulders
    o += `<path d="M5 64Q7 50 32 48.5Q57 50 59 64Z" fill="${cls === 'barbarian' ? shadeHex(skin, 0.9) : cloth}"/>`;
    if (cls === 'barbarian') o += `<path d="M8 64Q12 52 22 51L20 64Z" fill="${cloth}"/><path d="M56 64Q52 52 42 51L44 64Z" fill="${cloth}"/><path d="M10 54Q16 49 22 51" stroke="${trim}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M54 54Q48 49 42 51" stroke="${trim}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    else o += `<path d="M20 52Q32 57 44 52" stroke="${trim}" stroke-width="2" fill="none"/>`;
    // hood or veil behind the head
    if (hood) o += `<path d="M${cx - rx - 8} 63Q${cx - rx - 9} ${cy - 22} ${cx} ${cy - ry - 11}Q${cx + rx + 9} ${cy - 22} ${cx + rx + 8} 63Z" fill="${cls === 'cleric' ? cloth : shadeHex(cloth, 0.85)}"/><path d="M${cx - rx - 3} 63Q${cx - rx - 4} ${cy - 14} ${cx} ${cy - ry - 5}Q${cx + rx + 4} ${cy - 14} ${cx + rx + 3} 63Z" fill="${shadeHex(cloth, cls === 'cleric' ? 0.86 : 0.55)}"/>`;
    // long hair falls behind the face
    else if (L.long) o += `<path d="M${cx - rx - 4} ${cy + 13}Q${cx - rx - 5} ${cy - 13} ${cx} ${cy - ry - 3}Q${cx + rx + 5} ${cy - 13} ${cx + rx + 4} ${cy + 13}Q${cx} ${cy + 6} ${cx - rx - 4} ${cy + 13}Z" fill="${hair}"/>`;
    // ears
    if (race === 'elf') o += `<path d="M${cx - rx + 1.5} ${cy - 1}L${cx - rx - 8} ${cy - 10}L${cx - rx + 1} ${cy + 4}Z" fill="${skin}"/><path d="M${cx + rx - 1.5} ${cy - 1}L${cx + rx + 8} ${cy - 10}L${cx + rx - 1} ${cy + 4}Z" fill="${skin}"/>`;
    else if (race === 'halforc') o += `<path d="M${cx - rx + 1.5} ${cy - 2}L${cx - rx - 4.5} ${cy - 5}L${cx - rx + 1} ${cy + 3}Z" fill="${skin}"/><path d="M${cx + rx - 1.5} ${cy - 2}L${cx + rx + 4.5} ${cy - 5}L${cx + rx - 1} ${cy + 3}Z" fill="${skin}"/>`;
    else if (!hood) o += `<circle cx="${cx - rx + 0.5}" cy="${cy + 0.5}" r="${race === 'halfling' ? 3.2 : 2.6}" fill="${skin}"/><circle cx="${cx + rx - 0.5}" cy="${cy + 0.5}" r="${race === 'halfling' ? 3.2 : 2.6}" fill="${skin}"/>`;
    // face, with a heavier jaw for half-orcs
    o += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${skin}"/>`;
    if (race === 'halforc') o += `<ellipse cx="${cx}" cy="${cy + 4}" rx="${rx - 0.5}" ry="${ry - 3}" fill="${skin}"/>`;
    // eyes, brows, nose
    const ex = race === 'dwarf' || race === 'halforc' ? 4.6 : 4, ey = cy - 0.5;
    if (race === 'elf') o += `<path d="M${cx - ex - 2} ${ey}Q${cx - ex} ${ey - 1.8} ${cx - ex + 2} ${ey}Q${cx - ex} ${ey + 1.2} ${cx - ex - 2} ${ey}Z" fill="${eye}"/><path d="M${cx + ex - 2} ${ey}Q${cx + ex} ${ey - 1.8} ${cx + ex + 2} ${ey}Q${cx + ex} ${ey + 1.2} ${cx + ex - 2} ${ey}Z" fill="${eye}"/>`;
    else o += `<circle cx="${cx - ex}" cy="${ey}" r="1.6" fill="${eye}"/><circle cx="${cx + ex}" cy="${ey}" r="1.6" fill="${eye}"/>`;
    const bw = race === 'dwarf' || race === 'halforc' ? 2.4 : 1.5; const bc = L.beard || hair;
    o += `<path d="M${cx - ex - 2.6} ${ey - 3.4}L${cx - ex + 2.2} ${ey - 2.4}M${cx + ex + 2.6} ${ey - 3.4}L${cx + ex - 2.2} ${ey - 2.4}" stroke="${race === 'halforc' ? '#2a2018' : bc}" stroke-width="${bw}" stroke-linecap="round"/>`;
    if (race === 'dwarf') o += `<ellipse cx="${cx}" cy="${cy + 3}" rx="2.6" ry="2.2" fill="${dk}"/>`;
    else if (race === 'halforc') o += `<path d="M${cx - 2.2} ${cy + 3.5}Q${cx} ${cy + 1} ${cx + 2.2} ${cy + 3.5}" stroke="${dk}" stroke-width="1.6" fill="none"/>`;
    else o += `<path d="M${cx} ${cy + 0.5}L${cx - 1.4} ${cy + 3.6}H${cx + 0.8}" stroke="${dk}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    // mouth, tusks, beard
    const my = cy + (race === 'halforc' ? 7 : 6);
    if (L.beard) {
      const long = race === 'dwarf' || cls === 'wizard';
      o += long ? `<path d="M${cx - rx + 0.5} ${cy + 1}Q${cx - rx - 1} ${cy + 16} ${cx} ${cy + 24}Q${cx + rx + 1} ${cy + 16} ${cx + rx - 0.5} ${cy + 1}Q${cx} ${cy + 9} ${cx - rx + 0.5} ${cy + 1}Z" fill="${L.beard}"/><path d="M${cx - 3} ${cy + 12}v6M${cx + 3} ${cy + 12}v6" stroke="${shadeHex(L.beard, 0.75)}" stroke-width="1"/>`
        : `<path d="M${cx - rx + 0.5} ${cy + 1}Q${cx - rx} ${cy + 11} ${cx} ${cy + 15}Q${cx + rx} ${cy + 11} ${cx + rx - 0.5} ${cy + 1}Q${cx} ${cy + 8} ${cx - rx + 0.5} ${cy + 1}Z" fill="${L.beard}"/>`;
      o += `<path d="M${cx - 3.5} ${my - 0.5}Q${cx} ${my + 1} ${cx + 3.5} ${my - 0.5}" stroke="${shadeHex(L.beard, 0.6)}" stroke-width="1.3" fill="none"/>`;
    } else o += `<path d="M${cx - 3.2} ${my}Q${cx} ${my + 1.8} ${cx + 3.2} ${my}" stroke="${shadeHex(skin, 0.5)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    if (race === 'halforc') o += `<path d="M${cx - 4} ${my + 0.4}L${cx - 3.2} ${my - 3.6}L${cx - 2.2} ${my + 0.6}Z" fill="#f4ecd8"/><path d="M${cx + 4} ${my + 0.4}L${cx + 3.2} ${my - 3.6}L${cx + 2.2} ${my + 0.6}Z" fill="#f4ecd8"/>`;
    // hair on top (hoods and hats cover it)
    if (!hood && cls !== 'wizard' && cls !== 'barbarian') o += race === 'halfling'
      ? [-8, -4, 0, 4, 8].map((d, i) => `<circle cx="${cx + d}" cy="${cy - ry + 1 + (i % 2 ? -1 : 1)}" r="${4.2}" fill="${hair}"/>`).join('')
      : `<path d="M${cx - rx - 0.5} ${cy - 1}Q${cx - rx} ${cy - ry - 4} ${cx} ${cy - ry - 2.5}Q${cx + rx} ${cy - ry - 4} ${cx + rx + 0.5} ${cy - 1}Q${cx + 4} ${cy - ry + 3} ${cx - rx - 0.5} ${cy - 1}Z" fill="${hair}"/>`;
    // class headgear
    if (cls === 'barbarian') {
      const top = cy - ry - 10;
      o += `<path d="M${cx - rx - 3} ${cy - 5.5}Q${cx - rx - 10} ${cy - 16} ${cx - rx - 6} ${top - 6}Q${cx - rx - 4} ${cy - 13} ${cx - rx + 2} ${cy - 7}Z" fill="#efe6d0"/><path d="M${cx + rx + 3} ${cy - 5.5}Q${cx + rx + 10} ${cy - 16} ${cx + rx + 6} ${top - 6}Q${cx + rx + 4} ${cy - 13} ${cx + rx - 2} ${cy - 7}Z" fill="#efe6d0"/>`;
      o += `<path d="M${cx - rx - 2} ${cy - 5.5}Q${cx} ${top - 4} ${cx + rx + 2} ${cy - 5.5}Z" fill="#7b848e"/><rect x="${cx - rx - 2.5}" y="${cy - 8}" width="${2 * rx + 5}" height="4.5" rx="1" fill="#4b525a"/>`;
      if (L.long && race !== 'dwarf') o += `<path d="M${cx - rx - 2} ${cy - 1}Q${cx - rx - 5} ${cy + 8} ${cx - rx - 2} ${cy + 14}L${cx - rx + 1} ${cy + 2}Z" fill="${hair}"/><path d="M${cx + rx + 2} ${cy - 1}Q${cx + rx + 5} ${cy + 8} ${cx + rx + 2} ${cy + 14}L${cx + rx - 1} ${cy + 2}Z" fill="${hair}"/>`;
      if (race !== 'elf' && race !== 'halforc') o += `<path d="M${cx - 6} ${cy - 1}l3.5 1.1M${cx + 6} ${cy - 1}l-3.5 1.1" stroke="#a83a20" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>`;
    } else if (cls === 'rogue') {
      o += `<path d="M${cx - rx - 2} ${cy - 1}Q${cx - rx - 1} ${cy - ry - 7} ${cx} ${cy - ry - 7}Q${cx + rx + 1} ${cy - ry - 7} ${cx + rx + 2} ${cy - 1}Q${cx + rx - 1} ${cy - ry + 1} ${cx} ${cy - ry + 1}Q${cx - rx + 1} ${cy - ry + 1} ${cx - rx - 2} ${cy - 1}Z" fill="${shadeHex(cloth, 0.85)}"/>`;
      if (race !== 'halforc' && !L.beard) o += `<path d="M${cx - rx + 0.5} ${cy + 3.5}Q${cx} ${cy + 1.5} ${cx + rx - 0.5} ${cy + 3.5}L${cx + rx - 2} ${cy + ry - 1}Q${cx} ${cy + ry + 2} ${cx - rx + 2} ${cy + ry - 1}Z" fill="${shadeHex(cloth, 0.6)}"/>`;
      o += `<path d="M${cx + rx + 6} 60L${cx + rx + 12} 46" stroke="#d8dce4" stroke-width="2.2" stroke-linecap="round"/><path d="M${cx + rx + 4.5} 57.5l4 2" stroke="${trim}" stroke-width="2"/>`;
    } else if (cls === 'cleric') {
      o += `<path d="M${cx - rx - 2} ${cy - 2}Q${cx - rx - 1} ${cy - ry - 7} ${cx} ${cy - ry - 7}Q${cx + rx + 1} ${cy - ry - 7} ${cx + rx + 2} ${cy - 2}Q${cx + rx - 1} ${cy - ry + 1.5} ${cx} ${cy - ry + 1.5}Q${cx - rx + 1} ${cy - ry + 1.5} ${cx - rx - 2} ${cy - 2}Z" fill="${cloth}"/>`;
      const sy = cy - ry - 3;
      o += `<circle cx="${cx}" cy="${sy}" r="3.6" fill="${trim}"/><path d="M${cx} ${sy - 7}v-2.5M${cx - 7} ${sy}h-2.5M${cx + 7} ${sy}h2.5M${cx - 5} ${sy - 5}l-1.8-1.8M${cx + 5} ${sy - 5}l1.8-1.8" stroke="${trim}" stroke-width="1.6" stroke-linecap="round"/>`;
      o += `<path d="M18 54Q32 48 46 54L46 64L18 64Z" fill="${shadeHex(cloth, 0.92)}"/><path d="M29 54h6M32 51v8" stroke="${trim}" stroke-width="2.2"/>`;
    } else if (cls === 'wizard') {
      const by = cy - ry + 1;
      o += `<ellipse cx="${cx}" cy="${by}" rx="${rx + 10}" ry="4.2" fill="${shadeHex(cloth, 0.8)}"/><path d="M${cx - rx - 2} ${by}L${cx + 3} 1L${cx + rx + 3} ${by}Z" fill="${cloth}"/><path d="M${cx + 3} 1L${cx + rx + 3} ${by}L${cx + rx - 4} ${by}Z" fill="${shadeHex(cloth, 0.8)}"/>`;
      o += `<circle cx="${cx - 2}" cy="${by - 11}" r="1.5" fill="${trim}"/><circle cx="${cx + 5}" cy="${by - 5}" r="1.2" fill="${trim}"/><circle cx="${cx + 2}" cy="${by - 18}" r="1" fill="${trim}"/>`;
      if (!L.beard && !L.long) o += `<path d="M${cx - rx} ${by + 1}Q${cx - rx - 2} ${cy + 3} ${cx - rx + 1} ${cy + 4}M${cx + rx} ${by + 1}Q${cx + rx + 2} ${cy + 3} ${cx + rx - 1} ${cy + 4}" stroke="${hair}" stroke-width="2.4" fill="none"/>`;
    }
    return o;
  }
  // every roster hero has a portrait ready; heroes made later get one on demand
  const heroKey = h => 'unit-hero-' + h.id;
  function ensureHero(h) { const k = heroKey(h); if (!URI[k]) load(k, medal(heroHead(h), 'party')); return k; }

  /* ---------- map objects ---------- */
  const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".32"/>`;
  const OBJ = {
    town: `${shadow(32, 58, 30, 5)}<rect x="10" y="32" width="44" height="25" fill="#b9ad97"/><path d="M10 32h4v-4h5v4h5v-4h5v4h6v-4h5v4h5v-4h5v4" fill="#b9ad97"/><rect x="5" y="20" width="13" height="37" fill="#a69a84"/><rect x="46" y="20" width="13" height="37" fill="#a69a84"/><path d="M3 21L11.5 7L20 21Z" fill="#9b2d24"/><path d="M44 21L52.5 7L61 21Z" fill="#9b2d24"/><rect x="23" y="14" width="18" height="43" fill="#c9bea9"/><path d="M21 15L32 0L43 15Z" fill="#b8352a"/><path d="M27 57V46Q32 40 37 46V57Z" fill="#3a2a1a"/><rect x="30" y="20" width="4" height="6" rx="2" fill="#3a2a1a"/><rect x="9" y="27" width="4" height="5" rx="2" fill="#3a2a1a"/><rect x="50" y="27" width="4" height="5" rx="2" fill="#3a2a1a"/><path d="M41 20h18M5 20h13" stroke="#7d725f" stroke-width="1"/><path d="M23 30h18M10 40h13M41 40h13" stroke="#8f846f" stroke-width=".8"/>`,
    tower: `${shadow(32, 60, 22, 4)}<path d="M18 61L22 56L26 61M38 61L42 56L46 61" fill="#2a2430"/><path d="M22 61L25 18L39 18L42 61Z" fill="#2c2632"/><path d="M32 18L39 18L42 61L33 61Z" fill="#1f1a25"/><path d="M19 19L32 1L45 19Z" fill="#1a1520"/><rect x="21" y="17" width="22" height="3" fill="#4a3d55"/><rect x="29" y="25" width="6" height="9" rx="3" fill="#b45cff"/><circle cx="32" cy="29" r="8" fill="#b45cff" opacity=".2"/><rect x="30" y="41" width="4" height="7" rx="2" fill="#b45cff" opacity=".8"/><path d="M32 1v-1" stroke="#b45cff" stroke-width="2"/>`,
    mine: `${shadow(32, 59, 28, 4)}<path d="M3 59L22 21L34 36L44 19L61 59Z" fill="#7b6a58"/><path d="M44 19L61 59L47 59Z" fill="#5c4f42"/><path d="M22 21L27 31L18 31Z" fill="#9a8a76"/><path d="M21 59V42Q31 32 41 42V59Z" fill="#1c1410"/><path d="M19 59V40M43 59V40M17 40H45" stroke="#8a5a2a" stroke-width="3"/><circle cx="27" cy="50" r="1.4" fill="#e8e8f8"/><circle cx="35" cy="47" r="1.1" fill="#e8e8f8"/><rect x="44" y="51" width="13" height="6" fill="#6a4a2a"/><circle cx="47" cy="58" r="2" fill="#2a2018"/><circle cx="54" cy="58" r="2" fill="#2a2018"/><path d="M45 51l2-3h9l2 3" fill="#c8c8d8"/>`,
    crypt: `<ellipse cx="32" cy="57" rx="30" ry="6" fill="#2f4a40" opacity=".9"/><rect x="12" y="27" width="40" height="27" fill="#7d8a7a"/><path d="M8 28L32 11L56 28Z" fill="#5f6b5c"/><rect x="14" y="29" width="5" height="25" fill="#9aa596"/><rect x="45" y="29" width="5" height="25" fill="#9aa596"/><rect x="26" y="37" width="12" height="17" fill="#1a221c"/><circle cx="32" cy="45" r="5" fill="#7dff9a" opacity=".3"/><circle cx="32" cy="45" r="2" fill="#7dff9a" opacity=".8"/><path d="M14 54q4-3 8 0t8 0 8 0 8 0 8 0" stroke="#5e8a7a" stroke-width="1.5" fill="none"/>`,
    woods: `${shadow(32, 57, 24, 4)}<rect x="18" y="35" width="28" height="20" fill="#7a5a3a"/><path d="M18 40h28M18 45h28M18 50h28" stroke="#5a3e24" stroke-width=".8"/><path d="M13 37L32 19L51 37Z" fill="#56683a"/><path d="M13 37L32 19L32 37Z" fill="#647a44"/><rect x="28" y="43" width="8" height="12" fill="#2a1a10"/><rect x="38" y="40" width="5" height="5" fill="#f2c94c"/><rect x="40" y="18" width="4" height="9" fill="#5a3e24"/><circle cx="43" cy="13" r="3" fill="#bdbdbd" opacity=".6"/><circle cx="46" cy="8" r="2.4" fill="#bdbdbd" opacity=".45"/>`,
    peaks: `${shadow(32, 60, 28, 4)}<path d="M4 60L25 13L36 30L44 21L61 60Z" fill="#8c8a8e"/><path d="M25 13L31 25L27 23L22 26Z" fill="#fff"/><path d="M44 21L48 30L42 28Z" fill="#fff"/><path d="M44 21L61 60L48 60Z" fill="#6c6a70"/><path d="M25 13L36 30L30 60L44 60" fill="none"/><path d="M25 13V1" stroke="#5a3a1a" stroke-width="2"/><path d="M25 2L37 5L25 9Z" fill="#c0392b"/>`,
    chest: `${shadow(32, 54, 19, 4)}<rect x="13" y="30" width="38" height="22" rx="2" fill="#8a5a2a"/><path d="M13 31Q32 13 51 31Z" fill="#a06a32"/><path d="M13 31Q32 13 51 31" fill="none" stroke="#d9b24a" stroke-width="2"/><rect x="13" y="29" width="38" height="3" fill="#d9b24a"/><rect x="20" y="31" width="3" height="21" fill="#c9a23a"/><rect x="41" y="31" width="3" height="21" fill="#c9a23a"/><rect x="29" y="30" width="6" height="8" rx="1" fill="#e8c35a"/><circle cx="32" cy="35" r="1" fill="#3a2a10"/><circle cx="46" cy="22" r="2" fill="#fff6c0"/><path d="M46 17v10M41 22h10" stroke="#fff6c0" stroke-width="1"/>`,
    artifact: `${shadow(32, 57, 15, 4)}<circle cx="32" cy="27" r="15" fill="#ffd86a" opacity=".22"/><rect x="24" y="44" width="16" height="12" fill="#9a9488"/><rect x="21" y="41" width="22" height="4" fill="#b5afa2"/><path d="M32 9L37 28L32 40L27 28Z" fill="#7fd0ff" stroke="#e8f8ff" stroke-width="1.2"/><path d="M32 9L37 28L32 40Z" fill="#4fa8e0"/>`,
    shrine: `${shadow(32, 58, 22, 4)}<rect x="10" y="46" width="44" height="8" fill="#cfc8b6"/><rect x="14" y="41" width="36" height="6" fill="#ddd6c4"/><rect x="17" y="20" width="5" height="21" fill="#efe9dc"/><rect x="42" y="20" width="5" height="21" fill="#efe9dc"/><path d="M12 21L32 7L52 21Z" fill="#e6e0d0"/><circle cx="32" cy="31" r="9" fill="#8ad8ff" opacity=".35"/><circle cx="32" cy="31" r="4" fill="#c8f0ff"/>`,
    refugees: `${shadow(32, 56, 28, 4)}<path d="M5 54L18 28L31 54Z" fill="#c8b48a"/><path d="M18 28L23 54L31 54Z" fill="#a8946a"/><path d="M30 54L45 24L60 54Z" fill="#b8a07a"/><path d="M45 24L50 54L60 54Z" fill="#9a8460"/><path d="M15 54l3-8 3 8z" fill="#3a2a1a"/><circle cx="32" cy="50" r="5" fill="#ffc04a" opacity=".35"/><path d="M28 56l4-9 4 9z" fill="#e8742a"/><path d="M30 56l2-5 2 5z" fill="#ffd060"/>`,
    riddle: `${shadow(32, 59, 12, 3)}<path d="M25 59L28 12L32 5L36 12L39 59Z" fill="#8f8a80"/><path d="M32 5L36 12L39 59L32 59Z" fill="#6f6a62"/><circle cx="31" cy="22" r="2.4" fill="none" stroke="#e2c06a" stroke-width="1.2"/><path d="M29 30h5M30 35l3 3M29 42h5M31 47v4" stroke="#e2c06a" stroke-width="1.2"/>`,
    omen: `${shadow(32, 59, 16, 3)}<circle cx="32" cy="35" r="17" fill="#b45cff" opacity=".18"/><path d="M17 59Q15 20 32 13Q49 20 47 59Z" fill="#4a4550"/><path d="M32 13Q49 20 47 59L38 59Q40 24 32 13Z" fill="#3a3640"/><path d="M24 28L26 22L29 26L32 20L35 26L38 22L40 28Z" fill="#b45cff" opacity=".9"/><circle cx="32" cy="36" r="7" fill="none" stroke="#b45cff" stroke-width="1.4"/><circle cx="29.5" cy="35" r="1.4" fill="#d8a0ff"/><circle cx="34.5" cy="35" r="1.4" fill="#d8a0ff"/>`,
    pit: `<ellipse cx="32" cy="40" rx="20" ry="11" fill="#1a120c"/><ellipse cx="32" cy="40" rx="20" ry="11" fill="none" stroke="#e2c06a" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M22 44l2-7 2 7M30 46l2-8 2 8M38 44l2-7 2 7" fill="#8a8070"/>`,
    party: `${shadow(32, 59, 17, 4)}<rect x="29.5" y="3" width="3" height="56" fill="#5a3a1a"/><path d="M32.5 5L59 9L52 17.5L59 26L32.5 23Z" fill="#c0392b"/><path d="M32.5 5L59 9L52 17.5L59 26L32.5 23Z" fill="none" stroke="#e8c35a" stroke-width="1.4"/><path d="M42 9.5l5 3v5l-5 3-5-3v-5z" fill="none" stroke="#e8c35a" stroke-width="1.2"/><path d="M42 9.5v11M37 12.5l10 5M47 12.5l-10 5" stroke="#e8c35a" stroke-width=".7"/><path d="M17 32L30 27L43 32L43 45L30 55L17 45Z" fill="#a52d22" stroke="#e8c35a" stroke-width="2"/><path d="M30 32L37 43H23Z" fill="none" stroke="#e8c35a" stroke-width="1.3"/><path d="M30 32L17 32M30 32L43 32M23 43L17 45M37 43L43 45M23 43L30 55M37 43L30 55" stroke="#e8c35a" stroke-width=".8"/>`,
    hourglass: `<path d="M18 6H46M18 58H46" stroke="#e8c35a" stroke-width="4" stroke-linecap="round"/><path d="M21 8Q21 26 32 32Q21 38 21 56H43Q43 38 32 32Q43 26 43 8Z" fill="#e9dcc0" fill-opacity=".25" stroke="#e8c35a" stroke-width="2.5"/><path d="M25 50Q32 44 39 50L41 54H23Z" fill="#e8c35a"/><path d="M28 18H36L32 26Z" fill="#e8c35a"/><path d="M32 30v14" stroke="#e8c35a" stroke-width="1.2" stroke-dasharray="1.5 2"/>`,
    lore: `<path d="M10 14Q22 8 32 14Q42 8 54 14V54Q42 48 32 54Q22 48 10 54Z" fill="#3a2a5a" stroke="#e8c35a" stroke-width="2.5"/><path d="M32 14V54" stroke="#e8c35a" stroke-width="2"/><path d="M16 22Q22 19 27 22M16 30Q22 27 27 30M37 22Q42 19 48 22M37 30Q42 27 48 30" stroke="#c9b6ff" stroke-width="1.6" fill="none"/><circle cx="42" cy="40" r="5" fill="#b45cff" opacity=".5"/><path d="M42 35v10M37 40h10" stroke="#f0e0ff" stroke-width="1.4"/>`,
    // raw deposits, before a minion turns them into a mine or camp
    'dep-gold': `${shadow(32, 58, 26, 5)}<path d="M5 58L17 34L27 40L37 22L59 58Z" fill="#857260"/><path d="M37 22L59 58L45 58Z" fill="#62533f"/><path d="M17 34L27 40L22 46Z" fill="#9a8670"/><path d="M15 50l7-5 5 3M31 36l5 6 5-1M27 54l8-4 4 2" stroke="#f2c840" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="45" r="2.2" fill="#ffe27a"/><circle cx="41" cy="41" r="2" fill="#ffe27a"/><circle cx="35" cy="50" r="1.8" fill="#ffd860"/><path d="M48 30l1.5 3.5L53 35l-3.5 1.5L48 40l-1.5-3.5L43 35l3.5-1.5Z" fill="#fff6c8"/>`,
    'dep-lumber': `${shadow(32, 58, 27, 5)}<rect x="15" y="40" width="4" height="14" fill="#5a3a1a"/><rect x="31" y="38" width="4" height="16" fill="#4a3018"/><rect x="46" y="42" width="4" height="12" fill="#5a3a1a"/><path d="M5 44L17 8L29 44Z" fill="#2e5a26"/><path d="M8 34L17 6L26 34Z" fill="#3a6c2e"/><path d="M20 42L33 2L46 42Z" fill="#26501f"/><path d="M23 30L33 0L43 30Z" fill="#30602a"/><path d="M36 46L48 12L60 46Z" fill="#2a5422"/><path d="M39 36L48 10L57 36Z" fill="#366a2c"/><path d="M10 56h44" stroke="#3a4a22" stroke-width="2" opacity=".6"/>`,
    'dep-ore': `${shadow(32, 58, 26, 5)}<path d="M5 58L16 34L27 39L35 21L47 35L59 58Z" fill="#5c5762"/><path d="M35 21L47 35L59 58L45 58Z" fill="#46424c"/><path d="M16 34L27 39L21 45Z" fill="#6c6874"/><path d="M19 44l6 3M30 32l4 6M40 42l5 3M23 52l6-2" stroke="#2a2830" stroke-width="2"/><path d="M24 48l4-6 4 6-4 5Z" fill="#9ab8d8"/><path d="M36 50l3-5 3 5-3 4Z" fill="#b8d0ea"/><path d="M42 38l3-5 3 5-3 4Z" fill="#9ab8d8"/><path d="M29 41l2-3 2 3-2 3Z" fill="#d8e8f8"/>`,
    'node-gold': `${shadow(32, 58, 28, 5)}<path d="M4 58L20 26L30 38L40 22L60 58Z" fill="#7b6a58"/><path d="M40 22L60 58L46 58Z" fill="#5c4f42"/><path d="M22 58V44Q30 36 38 44V58Z" fill="#1c1410"/><path d="M20 58V42M40 58V42M18 42H42" stroke="#8a5a2a" stroke-width="3"/><circle cx="26" cy="52" r="2" fill="#f2c840"/><circle cx="31" cy="49" r="1.6" fill="#f2c840"/><circle cx="34" cy="53" r="1.8" fill="#f2c840"/><path d="M44 50h12l-2 6H46Z" fill="#6a4a2a"/><circle cx="48" cy="48" r="2.4" fill="#f2c840"/><circle cx="52" cy="47" r="2.2" fill="#ffd860"/>`,
    'node-lumber': `${shadow(32, 58, 28, 5)}<path d="M14 40L22 8L30 40Z" fill="#2e5a26"/><path d="M34 42L44 6L54 42Z" fill="#26501f"/><rect x="20" y="38" width="4" height="10" fill="#5a3a1a"/><rect x="42" y="40" width="4" height="8" fill="#5a3a1a"/><rect x="8" y="48" width="32" height="6" rx="3" fill="#8a5a2a"/><rect x="12" y="43" width="30" height="6" rx="3" fill="#9a6a34"/><circle cx="40" cy="51" r="3" fill="#d8b070"/><circle cx="41" cy="46" r="3" fill="#d8b070"/><path d="M50 56L58 44" stroke="#5a3a1a" stroke-width="2.5"/><path d="M55 42L61 46L58 50Z" fill="#a8b0b8"/>`,
    'node-ore': `${shadow(32, 58, 28, 5)}<path d="M6 58L18 30L28 36L36 20L48 34L58 58Z" fill="#5a5560"/><path d="M36 20L48 34L58 58L44 58Z" fill="#46424c"/><path d="M18 36l6 4M30 30l4 6M40 40l5 3M22 48l6-2" stroke="#2a2830" stroke-width="2"/><path d="M24 44l3-3 3 3-3 3Z" fill="#9ab8d8"/><path d="M38 46l3-3 3 3-3 3Z" fill="#9ab8d8"/><path d="M30 52l2-2 2 2-2 2Z" fill="#c8d8e8"/><path d="M23 58V47Q30 40 37 47V58Z" fill="#141016"/><path d="M21 58V45M39 58V45M19 45H41" stroke="#6a4a2a" stroke-width="3"/><rect x="44" y="50" width="12" height="6" fill="#4a3a2a"/><path d="M45 50l2-3h7l2 3" fill="#6a6a78"/>`,
    kennel: `${shadow(32, 58, 28, 5)}<path d="M6 58Q8 30 32 24Q56 30 58 58Z" fill="#5a5048"/><path d="M6 58Q8 30 32 24Q30 40 26 58Z" fill="#6e645a"/><path d="M22 58V46Q32 34 42 46V58Z" fill="#141010"/><circle cx="28" cy="48" r="1.6" fill="#ffd23a"/><circle cx="35" cy="48" r="1.6" fill="#ffd23a"/><path d="M10 56l6-3M48 54l7 2M14 50l5 1" stroke="#e8e0cc" stroke-width="2" stroke-linecap="round"/><circle cx="52" cy="56" r="2.4" fill="#e8e0cc"/>`,
    hideout: `${shadow(32, 58, 28, 5)}<path d="M8 58V36h4v22M16 58V34h4v24M44 58V34h4v24M52 58V36h4v22" fill="#6a4a2a"/><path d="M8 36l2-4 2 4M16 34l2-4 2 4M44 34l2-4 2 4M52 36l2-4 2 4" fill="#6a4a2a"/><path d="M20 58L32 30L44 58Z" fill="#5a4a3a"/><path d="M32 30L36 58H44Z" fill="#46382a"/><path d="M28 58L32 46L36 58Z" fill="#1a1410"/><path d="M32 30V22" stroke="#3a2a1a" stroke-width="1.5"/><path d="M32 22h8l-2 3 2 3h-8" fill="#1a1a1a"/><circle cx="24" cy="54" r="2.5" fill="#ff8a2a" opacity=".85"/>`,
    building: `${shadow(32, 58, 28, 5)}<path d="M10 58V30M54 58V30M10 30H54M10 44H54M10 30L54 58M54 30L10 58" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round"/><rect x="18" y="48" width="14" height="10" fill="#6a6a70"/><rect x="34" y="50" width="12" height="8" fill="#7a7a80"/><path d="M40 12L50 22L44 24L36 16Z" fill="#9aa0a8"/><path d="M38 18L28 30" stroke="#6a4a2a" stroke-width="3" stroke-linecap="round"/>`,
    wrecked: `${shadow(32, 58, 28, 5)}<path d="M8 58L14 40L22 46L30 34L38 44L46 38L56 58Z" fill="#3a3430"/><path d="M14 44l6 2M30 40l4 6M44 44l5 3" stroke="#1a1614" stroke-width="2"/><path d="M26 30Q22 18 30 10Q28 20 34 22Q40 14 38 6Q48 18 40 30Z" fill="#5a5a5a" opacity=".6"/><circle cx="20" cy="54" r="3" fill="#ff6a2a" opacity=".7"/><circle cx="42" cy="52" r="2.4" fill="#ff8a3a" opacity=".7"/>`,
    warren: `${shadow(32, 58, 28, 5)}<path d="M4 58Q8 30 32 26Q56 30 60 58Z" fill="#6a5a3a"/><path d="M4 58Q8 30 32 26Q20 34 18 58Z" fill="#7d6c48"/><ellipse cx="32" cy="50" rx="11" ry="9" fill="#120c06"/><path d="M21 50Q32 38 43 50" stroke="#4a3a22" stroke-width="3" fill="none"/><circle cx="28" cy="48" r="1.6" fill="#f2d23a"/><circle cx="35" cy="48" r="1.6" fill="#f2d23a"/><path d="M12 38l-4-8M52 38l4-8M46 30l2-9" stroke="#e8e0c8" stroke-width="2" stroke-linecap="round"/><circle cx="48" cy="20" r="2.2" fill="#e8e0c8"/>`,
    camp: `${shadow(32, 58, 28, 5)}<path d="M6 58L20 28L34 58Z" fill="#8a3a22"/><path d="M20 28L25 58L34 58Z" fill="#6a2a16"/><path d="M30 58L44 22L58 58Z" fill="#9a4426"/><path d="M44 22L49 58L58 58Z" fill="#76321c"/><path d="M44 22V10" stroke="#3a2a1a" stroke-width="2"/><path d="M44 10L56 13L44 16Z" fill="#2a2a2a"/><path d="M41 12l3 3 3-3" stroke="#d8d0b8" stroke-width="1" fill="none"/><path d="M2 58l4-10M10 58l3-9M54 58l3-9M62 58l-3-10" stroke="#5a3a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M16 58l4-9 4 9z" fill="#120a06"/>`,
    bonecrypt: `${shadow(32, 59, 26, 4)}<rect x="12" y="28" width="40" height="30" fill="#6a6a70"/><path d="M8 29L32 10L56 29Z" fill="#4e4e56"/><rect x="25" y="38" width="14" height="20" rx="7" fill="#0d0b12"/><ellipse cx="32" cy="22" rx="6" ry="6.5" fill="#ece8dc"/><ellipse cx="29.6" cy="21.5" rx="1.7" ry="2" fill="#1d1712"/><ellipse cx="34.4" cy="21.5" rx="1.7" ry="2" fill="#1d1712"/><path d="M29 26.5h6" stroke="#1d1712" stroke-width="1"/><circle cx="32" cy="48" r="5" fill="#7dffb0" opacity=".25"/><path d="M14 35h8M42 35h8M14 44h7M43 44h7" stroke="#55555e" stroke-width="1.2"/>`,
    den: `${shadow(32, 59, 28, 4)}<path d="M2 59L16 22L30 30L42 16L62 59Z" fill="#6d6152"/><path d="M42 16L62 59L48 59Z" fill="#544a3e"/><path d="M18 59V44Q31 30 44 44V59Z" fill="#0e0905"/><path d="M22 44l2 5 2-5M38 44l-2 5-2-5" fill="#e8e0c8"/><circle cx="27" cy="50" r="1.6" fill="#ffb03a"/><circle cx="35" cy="50" r="1.6" fill="#ffb03a"/><path d="M4 59l5-4M58 59l-4-5" stroke="#e8e0c8" stroke-width="2"/><ellipse cx="11" cy="57" rx="4" ry="1.5" fill="#e8e0c8"/>`,
    barrow: `${shadow(32, 58, 28, 4)}<path d="M2 58Q8 26 32 24Q56 26 62 58Z" fill="#5a7a3a"/><path d="M2 58Q8 26 32 24Q18 32 16 58Z" fill="#6a8c44"/><rect x="22" y="38" width="5" height="20" fill="#8a8a82"/><rect x="37" y="38" width="5" height="20" fill="#8a8a82"/><rect x="20" y="34" width="24" height="5" fill="#9a9a92"/><rect x="27" y="39" width="10" height="19" fill="#0e1418"/><circle cx="32" cy="48" r="7" fill="#9ae8ff" opacity=".3"/><circle cx="32" cy="48" r="2.5" fill="#c8f6ff"/><path d="M8 44l2-8M56 44l-2-8" stroke="#7a7a74" stroke-width="3"/>`,
    fens: `<ellipse cx="32" cy="56" rx="30" ry="6" fill="#1e2a1c"/><path d="M20 56V36M44 56V36M26 56V38M38 56V38" stroke="#4a3a22" stroke-width="2.4"/><rect x="16" y="33" width="32" height="5" fill="#5a4a2a"/><rect x="20" y="20" width="24" height="14" fill="#6a5a3a"/><path d="M15 21L32 8L49 21Z" fill="#5a6a32"/><rect x="29" y="25" width="6" height="7" fill="#d8ff7a" opacity=".85"/><path d="M6 56l-2-12M10 56l1-10M56 56l2-12M60 56l-1-9" stroke="#6a7a3a" stroke-width="1.6"/>`,
    hold: `${shadow(32, 59, 30, 4)}<rect x="8" y="30" width="48" height="28" fill="#8a8070"/><path d="M4 31L32 12L60 31Z" fill="#6a5a42"/><rect x="26" y="40" width="12" height="18" fill="#1a140e"/><circle cx="8" cy="54" r="6" fill="#9a9284"/><circle cx="57" cy="53" r="7" fill="#8a8274"/><path d="M14 40h8M42 40h8M14 48h8M42 48h8" stroke="#6a6256" stroke-width="1.4"/><path d="M18 30Q20 20 26 18M46 30Q44 20 38 18" stroke="#e8dcc0" stroke-width="2.4" fill="none"/>`,
    roost: `${shadow(32, 60, 26, 4)}<path d="M10 60L24 18L32 26L40 8L54 60Z" fill="#4a3a36"/><path d="M40 8L54 60L44 60Z" fill="#362a26"/><ellipse cx="38" cy="14" rx="9" ry="3.5" fill="#6a5232"/><circle cx="38" cy="12" r="7" fill="#ff6a3a" opacity=".25"/><path d="M14 58l4-3 4 3M42 58l4-3 4 3" fill="#ffd24a"/><circle cx="26" cy="56" r="1.6" fill="#ffd24a"/><circle cx="33" cy="57" r="1.4" fill="#ffd24a"/>`,
    mire: `<ellipse cx="32" cy="54" rx="29" ry="8" fill="#1a2620"/><ellipse cx="32" cy="54" rx="22" ry="5" fill="#24382e"/><path d="M20 54Q16 36 24 26" stroke="#3f7a5a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M44 54Q48 38 40 28" stroke="#3f7a5a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M32 54Q32 32 32 18" stroke="#4a8a66" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="25" rx="5" ry="3.5" fill="#4f9470"/><ellipse cx="40" cy="27" rx="5" ry="3.5" fill="#4f9470"/><ellipse cx="32" cy="16" rx="6" ry="4" fill="#5aa47c"/><circle cx="30" cy="15" r="1" fill="#ffe04a"/><circle cx="34" cy="15" r="1" fill="#ffe04a"/><path d="M6 50l-2-9M58 50l2-9" stroke="#4a5a2a" stroke-width="1.6"/>`,
    keep: `${shadow(32, 59, 26, 4)}<rect x="12" y="28" width="40" height="30" fill="#3a2e36"/><path d="M8 29L32 10L56 29Z" fill="#241c22"/><rect x="44" y="14" width="8" height="18" fill="#3a2e36"/><path d="M42 15L48 6L54 15Z" fill="#241c22"/><rect x="18" y="34" width="6" height="8" fill="#ff3a4a" opacity=".85"/><rect x="40" y="34" width="6" height="8" fill="#ff3a4a" opacity=".85"/><rect x="27" y="42" width="10" height="16" rx="5" fill="#0d080b"/><path d="M14 10q3-3 6 0q3-3 6 0l-3 2-3-1-3 1z" fill="#14101a"/>`,
    abyss: `<ellipse cx="32" cy="46" rx="26" ry="11" fill="#2a0c08"/><ellipse cx="32" cy="46" rx="18" ry="7" fill="#ff5a1a" opacity=".55"/><ellipse cx="32" cy="46" rx="10" ry="4" fill="#ffd24a" opacity=".8"/><path d="M8 46l4-14 3 13M22 38l3-14 3 13M36 38l3-15 3 14M50 46l3-14 3 13" fill="#3a2a26"/><circle cx="32" cy="30" r="16" fill="#ff5a1a" opacity=".12"/>`,
    villain: `${shadow(32, 60, 18, 4)}<circle cx="32" cy="36" r="22" fill="#9a4cff" opacity=".22"/><rect x="29.5" y="3" width="3" height="57" fill="#2a1a2e"/><path d="M32.5 5L59 9L52 17.5L59 26L32.5 23Z" fill="#5a1f7a"/><path d="M32.5 5L59 9L52 17.5L59 26L32.5 23Z" fill="none" stroke="#c9a2ff" stroke-width="1.4"/><ellipse cx="44" cy="14.5" rx="4.2" ry="4.6" fill="#e6e0cf"/><circle cx="42.6" cy="14" r="1.1" fill="#160f1f"/><circle cx="45.4" cy="14" r="1.1" fill="#160f1f"/><path d="M40 9.8L41.5 7L44 9L46.5 7L48 9.8Z" fill="#d9b24a"/><path d="M17 33L30 28L43 33L43 46L30 56L17 46Z" fill="#3a1450" stroke="#c9a2ff" stroke-width="2"/><path d="M23 37L26 33L30 36L34 33L37 37L37 41H23Z" fill="#d9b24a"/><ellipse cx="30" cy="46" rx="5" ry="5.5" fill="#e6e0cf"/><circle cx="28.2" cy="45.5" r="1.3" fill="#c06cff"/><circle cx="31.8" cy="45.5" r="1.3" fill="#c06cff"/>`,
    stranger: `${shadow(32, 59, 13, 3)}<path d="M18 60Q18 26 32 18Q46 26 46 60Z" fill="#3e3a4a"/><path d="M24 60Q24 32 32 27Q40 32 40 60Z" fill="#2c2936"/><ellipse cx="32" cy="34" rx="7" ry="8" fill="#0d0b12"/><circle cx="29.5" cy="34" r="1.2" fill="#e8d070"/><circle cx="34.5" cy="34" r="1.2" fill="#e8d070"/><path d="M46 60V16" stroke="#6a4a2a" stroke-width="2.5"/><circle cx="46" cy="14" r="3.5" fill="#9adfff" opacity=".7"/><circle cx="46" cy="14" r="7" fill="#9adfff" opacity=".18"/>`,
    pass: `<path d="M0 64V40Q8 36 14 40V64Z" fill="#6d6152"/><path d="M64 64V38Q56 34 50 39V64Z" fill="#6d6152"/><rect x="14" y="44" width="36" height="20" fill="#0d0a08"/><path d="M14 40Q32 50 50 39" stroke="#8a6a3a" stroke-width="2" fill="none"/><path d="M14 33Q32 43 50 32" stroke="#a8844a" stroke-width="1.5" fill="none"/><path d="M18 41.5v-6M23 43.5v-6.5M28 45v-7M33 45.5v-7M38 44.5v-7M43 43v-6.5M47 40.5v-6" stroke="#8a6a3a" stroke-width="1.2"/><path d="M18 41.5h3M22 43.6h3M27 45h3M32 45.4h3M37 44.6h3M42 43h3" stroke="#c9a46a" stroke-width="2.4"/><path d="M14 40V30M50 39V29" stroke="#5a3e24" stroke-width="3"/>`,
    captive: `${shadow(32, 58, 20, 4)}<ellipse cx="32" cy="50" rx="15" ry="7" fill="#5a6a3a"/><ellipse cx="30" cy="36" rx="9" ry="8.5" fill="#6f8048"/><path d="M23 40Q30 46 37 40" stroke="#2b1b0a" stroke-width="1.5" fill="none"/><path d="M25 33l4 1.5M35 33l-4 1.5" stroke="#2b1b0a" stroke-width="2" stroke-linecap="round"/><path d="M34 38L36 34L38 38Z" fill="#f1ead8"/><path d="M18 48h28" stroke="#a8a8b0" stroke-width="2.5" stroke-dasharray="3 1.5"/><path d="M40 28l6-6M44 31l7-4" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>`,
    tourney: `${shadow(32, 59, 26, 4)}<path d="M8 58L20 26L32 58Z" fill="#c0392b"/><path d="M20 26L24 58L32 58Z" fill="#9b2d24"/><path d="M30 58L44 22L58 58Z" fill="#2f5aa8"/><path d="M44 22L49 58L58 58Z" fill="#244a8c"/><path d="M20 26V14M44 22V9" stroke="#5a3a1a" stroke-width="1.6"/><path d="M20 14l9 3-9 3z" fill="#e8c35a"/><path d="M44 9l9 3-9 3z" fill="#e8c35a"/><path d="M4 50L60 36" stroke="#e8e0c8" stroke-width="2"/><path d="M57 37l5-2-2 4z" fill="#e8e0c8"/>`,
    rune: `<ellipse cx="32" cy="42" rx="22" ry="11" fill="#ff7a2a" opacity=".18"/><ellipse cx="32" cy="42" rx="18" ry="9" fill="none" stroke="#ff8a3a" stroke-width="2"/><ellipse cx="32" cy="42" rx="11" ry="5.5" fill="none" stroke="#ffb06a" stroke-width="1.4"/><path d="M32 33v18M22 42h20M25 37l14 10M39 37L25 47" stroke="#ffcf8a" stroke-width="1.2"/>`,
    snare: `<path d="M14 46Q32 36 50 46Q32 56 14 46Z" fill="none" stroke="#c9a46a" stroke-width="2.4"/><path d="M50 46Q56 40 54 26Q52 18 46 16" stroke="#c9a46a" stroke-width="2.4" fill="none"/><path d="M42 12l4 4 4-4" stroke="#6a8a3a" stroke-width="2.5" fill="none"/><path d="M46 16V8" stroke="#5a3e24" stroke-width="3"/><path d="M20 50l2 3M30 52l1 3M40 51l-1 3" stroke="#6a8a3a" stroke-width="1.5"/>`,
    quest: `<path d="M14 10H46Q52 10 52 16V52Q52 56 48 56H18Q12 56 12 50V14Q12 10 14 10Z" fill="#efe2bf" stroke="#7a5a2a" stroke-width="2"/><path d="M19 20h26M19 27h26M19 34h18" stroke="#7a5a2a" stroke-width="2"/><circle cx="42" cy="45" r="7" fill="#b8352a"/><path d="M42 41v5M42 48v1" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
    lair: `${shadow(32, 60, 22, 4)}<path d="M22 61L25 18L39 18L42 61Z" fill="#2c2632"/><path d="M19 19L32 1L45 19Z" fill="#1a1520"/><rect x="29" y="25" width="6" height="9" rx="3" fill="#b45cff"/><circle cx="32" cy="29" r="8" fill="#b45cff" opacity=".2"/>`
  };
  const svgWrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${inner}</svg>`;
  const uri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  const IMG = {}; const URI = {};
  let pending = 0; let onReady = null;
  function load(key, svg) {
    URI[key] = uri(svg);
    const im = new Image(); pending++;
    im.onload = im.onerror = () => { pending--; if (!pending && onReady) onReady(); };
    im.src = URI[key]; IMG[key] = im;
  }
  for (const k of Object.keys(HEADS)) load('unit-' + k, medal(HEADS[k], PARTY_ICONS.indexOf(k) >= 0 ? 'party' : 'dm'));
  for (const r of G.ROSTER) load('unit-hero-' + r.id, medal(heroHead(r), 'party'));
  const portrait = r => uri(medal(heroHead(r), 'party'));
  for (const k of Object.keys(OBJ)) load('obj-' + k, svgWrap(OBJ[k]));
  // resource icons for the bar and prices: the working sites' drawings until pixel art replaces them
  for (const r of ['gold', 'lumber', 'ore']) load('obj-res-' + r, svgWrap(OBJ['node-' + r]));
  const ready = cb => { if (!pending) cb(); else onReady = cb; };

  /* ---------- terrain painting ---------- */
  const BASE = {
    grass: [92, 138, 58], dirt: [150, 120, 78], forest: [62, 104, 46], swamp: [76, 92, 60], snow: [222, 229, 236],
    waste: [86, 62, 56], water: [44, 92, 140], mount: [118, 106, 92]
  };
  const rgb = (c, a) => a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));

  function paintMap(seed, T, road, TILE) {
    const W = G.MW, H = G.MH;
    const r = G.mulberry(seed * 7 + 3);
    const cv = document.createElement('canvas'); cv.width = W * TILE; cv.height = H * TILE;
    const x = cv.getContext('2d');
    // 1. soft base: 4px per tile low-res, scaled up smoothly
    const SUB = 4;
    const lo = document.createElement('canvas'); lo.width = W * SUB; lo.height = H * SUB;
    const lx = lo.getContext('2d'); const id = lx.createImageData(lo.width, lo.height);
    const tAt = (i, j) => T[Math.max(0, Math.min(H - 1, j)) * W + Math.max(0, Math.min(W - 1, i))];
    for (let py = 0; py < lo.height; py++) for (let px = 0; px < lo.width; px++) {
      // jitter sampling for organic borders
      const jx = (px + 0.5) / SUB + (r() - 0.5) * 0.7, jy = (py + 0.5) / SUB + (r() - 0.5) * 0.7;
      let t = tAt(Math.floor(jx), Math.floor(jy));
      let c = BASE[t];
      if (t === 'mount') c = BASE[tAt(Math.floor(jx), Math.floor(jy) + 1)] === BASE.snow ? [190, 196, 204] : [128, 114, 96];
      const n = 0.9 + r() * 0.2;
      const o = (py * lo.width + px) * 4;
      id.data[o] = c[0] * n; id.data[o + 1] = c[1] * n; id.data[o + 2] = c[2] * n; id.data[o + 3] = 255;
    }
    lx.putImageData(id, 0, 0);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(lo, 0, 0, cv.width, cv.height);
    // 2. speckle texture
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const t = T[j * W + i]; const base = BASE[t];
      for (let k = 0; k < 14; k++) {
        const px = i * TILE + r() * TILE, py = j * TILE + r() * TILE;
        x.fillStyle = rgb(shade(base, r() < 0.5 ? 0.82 : 1.14), 0.35);
        x.fillRect(px, py, 1 + r() * 2.5, 1 + r() * 2);
      }
    }
    // 3. water depth + waves
    const isW = (i, j) => i >= 0 && j >= 0 && i < W && j < H && T[j * W + i] === 'water';
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (!isW(i, j)) continue;
      let shore = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (!isW(i + di, j + dj) && i + di >= 0 && j + dj >= 0 && i + di < W && j + dj < H) shore++;
      const cx0 = i * TILE, cy0 = j * TILE;
      if (!shore) { x.fillStyle = 'rgba(14,40,74,0.28)'; x.fillRect(cx0, cy0, TILE, TILE); }
      x.strokeStyle = 'rgba(190,225,255,0.35)'; x.lineWidth = 1.4;
      for (let k = 0; k < 2; k++) { const wx = cx0 + 6 + r() * (TILE - 18), wy = cy0 + 8 + r() * (TILE - 14); x.beginPath(); x.moveTo(wx, wy); x.quadraticCurveTo(wx + 5, wy - 4, wx + 10, wy); x.stroke(); }
      if (shore) { x.strokeStyle = 'rgba(235,245,255,0.35)'; x.lineWidth = 2; x.beginPath(); x.arc(cx0 + TILE / 2, cy0 + TILE / 2, TILE * 0.42, r() * 6, r() * 6 + 1.6); x.stroke(); }
    }
    // 4. roads
    const isR = (i, j) => i >= 0 && j >= 0 && i < W && j < H && road[j * W + i];
    const segs = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (!isR(i, j)) continue;
      const ortho = [[1, 0], [0, 1]].filter(([a, b]) => isR(i + a, j + b));
      for (const [a, b] of ortho) segs.push([i, j, i + a, j + b]);
      for (const [a, b] of [[1, 1], [-1, 1]]) if (isR(i + a, j + b) && !isR(i + a, j) && !isR(i, j + b)) segs.push([i, j, i + a, j + b]);
    }
    const cen = v => v * TILE + TILE / 2;
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const [w, col] of [[TILE * 0.46, 'rgba(70,50,28,0.55)'], [TILE * 0.34, 'rgb(196,170,122)']]) {
      x.strokeStyle = col; x.lineWidth = w;
      for (const [a, b, c, d] of segs) { x.beginPath(); x.moveTo(cen(a), cen(b)); x.lineTo(cen(c), cen(d)); x.stroke(); }
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (isR(i, j)) { x.fillStyle = col; x.beginPath(); x.arc(cen(i), cen(j), w / 2, 0, 7); x.fill(); }
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (isR(i, j)) for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(120,96,60,0.55)'; x.beginPath(); x.arc(cen(i) + (r() - 0.5) * TILE * 0.3, cen(j) + (r() - 0.5) * TILE * 0.3, 1.3 + r(), 0, 7); x.fill(); }
    // 5. ground details, then tall things sorted by y
    const tall = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const t = T[j * W + i]; const cx0 = i * TILE, cy0 = j * TILE;
      if (isR(i, j) && t !== 'forest') continue;
      if (t === 'grass') {
        for (let k = 0; k < 7; k++) { const px = cx0 + r() * TILE, py = cy0 + r() * TILE; x.strokeStyle = r() < 0.5 ? 'rgba(52,92,30,0.75)' : 'rgba(140,186,92,0.7)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 2, py - 5); x.moveTo(px, py); x.lineTo(px + 2, py - 4); x.stroke(); }
        if (r() < 0.25) { x.fillStyle = ['#f2e36a', '#f0a0c0', '#ffffff'][Math.floor(r() * 3)]; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx0 + r() * TILE, cy0 + r() * TILE, 1.4, 0, 7); x.fill(); } }
        if (r() < 0.06) tall.push({ y: cy0 + TILE * 0.7, f: () => tree(x, cx0 + TILE * (0.3 + r() * 0.4), cy0 + TILE * 0.75, TILE * 0.32, r) });
      } else if (t === 'dirt') {
        for (let k = 0; k < 5; k++) { x.fillStyle = r() < 0.5 ? 'rgba(90,70,44,0.6)' : 'rgba(200,176,130,0.6)'; x.beginPath(); x.ellipse(cx0 + r() * TILE, cy0 + r() * TILE, 1.6 + r() * 2, 1 + r() * 1.4, 0, 0, 7); x.fill(); }
      } else if (t === 'swamp') {
        if (r() < 0.6) { const px = cx0 + 8 + r() * (TILE - 16), py = cy0 + 8 + r() * (TILE - 16); x.fillStyle = 'rgba(40,62,58,0.85)'; x.beginPath(); x.ellipse(px, py, 7 + r() * 6, 4 + r() * 3, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(150,180,150,0.35)'; x.lineWidth = 1; x.stroke(); }
        for (let k = 0; k < 5; k++) { const px = cx0 + r() * TILE, py = cy0 + r() * TILE; x.strokeStyle = 'rgba(120,130,60,0.85)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, py - 7 - r() * 4); x.stroke(); }
        if (r() < 0.12) tall.push({ y: cy0 + TILE * 0.7, f: () => deadTree(x, cx0 + TILE / 2, cy0 + TILE * 0.8, TILE * 0.5) });
      } else if (t === 'snow') {
        for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(160,182,206,0.35)'; x.beginPath(); x.ellipse(cx0 + r() * TILE, cy0 + r() * TILE, 6 + r() * 6, 2 + r() * 2, 0, 0, 7); x.fill(); }
        for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(cx0 + r() * TILE, cy0 + r() * TILE, 1.5, 1.5); }
        if (r() < 0.1) tall.push({ y: cy0 + TILE * 0.7, f: () => pine(x, cx0 + TILE / 2, cy0 + TILE * 0.85, TILE * 0.55, true) });
      } else if (t === 'waste') {
        x.strokeStyle = 'rgba(232,110,40,0.75)'; x.lineWidth = 1.4;
        if (r() < 0.55) { let px = cx0 + r() * TILE, py = cy0 + r() * TILE; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (r() - 0.5) * 14; py += (r() - 0.3) * 10; x.lineTo(px, py); } x.stroke(); }
        for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(40,28,26,0.75)'; x.beginPath(); x.arc(cx0 + r() * TILE, cy0 + r() * TILE, 1.5 + r() * 2.5, 0, 7); x.fill(); }
      } else if (t === 'forest') {
        const n = isR(i, j) ? 1 : 3 + Math.floor(r() * 2);
        for (let k = 0; k < n; k++) {
          const px = cx0 + TILE * (0.15 + r() * 0.7), py = cy0 + TILE * (0.3 + r() * 0.65);
          if (isR(i, j) && Math.hypot(px - cen(i), py - cen(j)) < TILE * 0.3) continue;
          const sz = TILE * (0.3 + r() * 0.14); const conifer = r() < 0.35;
          tall.push({ y: py, f: () => conifer ? pine(x, px, py, sz * 1.6, false) : tree(x, px, py, sz, r) });
        }
      } else if (t === 'mount') {
        const near = (a, b) => i + a >= 0 && j + b >= 0 && i + a < W && j + b < H && T[(j + b) * W + i + a] === 'snow';
        const sn = near(0, 1) || near(0, -1) || near(1, 0) || near(-1, 0);
        const n2 = 1 + Math.floor(r() * 2);
        for (let k = 0; k < n2; k++) {
          const px = cx0 + TILE * (0.25 + r() * 0.5), py = cy0 + TILE * (0.75 + r() * 0.25); const hgt = TILE * (0.75 + r() * 0.55); const wid = TILE * (0.55 + r() * 0.3);
          tall.push({ y: py, f: () => peak(x, px, py, wid, hgt, sn || r() < 0.3) });
        }
      }
    }
    tall.sort((a, b) => a.y - b.y);
    for (const t of tall) t.f();
    return cv;
  }
  function tree(x, px, py, sz, r) {
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(px + 2, py + 1, sz * 0.8, sz * 0.32, 0, 0, 7); x.fill();
    x.fillStyle = '#4a3220'; x.fillRect(px - sz * 0.1, py - sz * 0.55, sz * 0.2, sz * 0.6);
    x.fillStyle = '#2c4f1f'; x.beginPath(); x.arc(px, py - sz * 0.95, sz * 0.72, 0, 7); x.fill();
    x.fillStyle = '#3b6a28'; x.beginPath(); x.arc(px - sz * 0.15, py - sz * 1.08, sz * 0.52, 0, 7); x.fill();
    x.fillStyle = '#5a8d38'; x.beginPath(); x.arc(px - sz * 0.25, py - sz * 1.22, sz * 0.26, 0, 7); x.fill();
  }
  function pine(x, px, py, h, snowy) {
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(px + 2, py + 1, h * 0.3, h * 0.12, 0, 0, 7); x.fill();
    x.fillStyle = '#4a3220'; x.fillRect(px - h * 0.05, py - h * 0.2, h * 0.1, h * 0.22);
    for (let k = 0; k < 3; k++) {
      const top = py - h * (0.55 + k * 0.2), base = py - h * (0.12 + k * 0.2), w = h * (0.34 - k * 0.08);
      x.fillStyle = '#1f4a2c'; x.beginPath(); x.moveTo(px, top); x.lineTo(px + w, base); x.lineTo(px - w, base); x.closePath(); x.fill();
      x.fillStyle = '#2d6440'; x.beginPath(); x.moveTo(px, top); x.lineTo(px - w, base); x.lineTo(px - w * 0.1, base); x.closePath(); x.fill();
      if (snowy) { x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.moveTo(px, top); x.lineTo(px + w * 0.4, top + (base - top) * 0.4); x.lineTo(px - w * 0.4, top + (base - top) * 0.4); x.closePath(); x.fill(); }
    }
  }
  function deadTree(x, px, py, h) {
    x.strokeStyle = '#3a3226'; x.lineWidth = 2.5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(px, py); x.lineTo(px, py - h * 0.8); x.moveTo(px, py - h * 0.5); x.lineTo(px - h * 0.25, py - h * 0.75); x.moveTo(px, py - h * 0.6); x.lineTo(px + h * 0.22, py - h * 0.9); x.stroke();
  }
  function peak(x, px, py, w, h, snowy) {
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(px + 4, py, w * 0.62, w * 0.16, 0, 0, 7); x.fill();
    x.fillStyle = '#8b7d6c'; x.beginPath(); x.moveTo(px - w / 2, py); x.lineTo(px - w * 0.04, py - h); x.lineTo(px + w / 2, py); x.closePath(); x.fill();
    x.fillStyle = '#5f5448'; x.beginPath(); x.moveTo(px - w * 0.04, py - h); x.lineTo(px + w / 2, py); x.lineTo(px + w * 0.08, py); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(40,32,26,0.45)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px - w * 0.04, py - h); x.lineTo(px - w * 0.18, py - h * 0.45); x.lineTo(px - w * 0.1, py - h * 0.2); x.stroke();
    if (snowy) { x.fillStyle = '#f4f6f8'; x.beginPath(); x.moveTo(px - w * 0.04, py - h); x.lineTo(px + w * 0.14, py - h * 0.62); x.lineTo(px + w * 0.02, py - h * 0.7); x.lineTo(px - w * 0.1, py - h * 0.6); x.lineTo(px - w * 0.2, py - h * 0.66); x.closePath(); x.fill(); }
  }

  /* ---------- battlefield ---------- */
  const FIELD = {
    grass: ['#4f7d33', '#6a9a44'], dirt: ['#8a6c45', '#a8875a'], forest: ['#3e6a2c', '#527f38'], swamp: ['#46553a', '#5c6c45'],
    snow: ['#cfd8e2', '#eef3f7'], waste: ['#4d3832', '#6a4a40'], water: ['#4f7d33', '#6a9a44'], mount: ['#7a6c5c', '#968774']
  };
  function paintField(terrain, w, h, seed) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'); const r = G.mulberry(seed | 0);
    const [a, b] = FIELD[terrain] || FIELD.grass;
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, b); g.addColorStop(1, a);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let k = 0; k < (w * h) / 90; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    for (let k = 0; k < 26; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 60, 8 + r() * 20, 0, 0, 7); x.fill(); }
    if (terrain === 'waste') { x.strokeStyle = 'rgba(232,110,40,0.5)'; x.lineWidth = 1.5; for (let k = 0; k < 18; k++) { let px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); for (let q = 0; q < 4; q++) { px += (r() - 0.5) * 30; py += (r() - 0.5) * 20; x.lineTo(px, py); } x.stroke(); } }
    if (terrain === 'grass' || terrain === 'forest' || terrain === 'water') { for (let k = 0; k < 220; k++) { const px = r() * w, py = r() * h; x.strokeStyle = r() < 0.5 ? 'rgba(40,80,24,0.6)' : 'rgba(150,196,100,0.5)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 2, py - 6); x.moveTo(px, py); x.lineTo(px + 2, py - 5); x.stroke(); } }
    // vignette
    const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
    return cv;
  }
  function brush(x, cx, cy, R, terrain, seed) {
    const r = G.mulberry(seed | 0);
    const col = terrain === 'snow' ? ['#7a8a74', '#a3b39c'] : terrain === 'waste' ? ['#5a4038', '#7a5a4c'] : terrain === 'swamp' ? ['#4a5e34', '#6b8048'] : ['#3d6e2a', '#5f9a3e'];
    for (let i = 0; i < 6; i++) {
      const px = cx + (r() - 0.5) * R * 1.1, py = cy + (r() - 0.3) * R * 0.8;
      x.fillStyle = 'rgba(0,0,0,0.2)'; x.beginPath(); x.ellipse(px + 2, py + R * 0.18, R * 0.3, R * 0.1, 0, 0, 7); x.fill();
      x.fillStyle = col[0]; x.beginPath(); x.arc(px, py, R * (0.24 + r() * 0.1), 0, 7); x.fill();
      x.fillStyle = col[1]; x.beginPath(); x.arc(px - R * 0.06, py - R * 0.07, R * 0.14, 0, 7); x.fill();
    }
  }
  function bog(x, cx, cy, R, seed) {
    const r = G.mulberry(seed | 0);
    x.fillStyle = 'rgba(52,40,26,0.75)'; x.beginPath(); x.ellipse(cx, cy, R * 0.86, R * 0.6, r() * 0.6, 0, 7); x.fill();
    x.fillStyle = 'rgba(70,96,96,0.65)'; x.beginPath(); x.ellipse(cx + (r() - 0.5) * R * 0.3, cy, R * 0.5, R * 0.3, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(190,220,210,0.3)'; x.lineWidth = 1; x.beginPath(); x.arc(cx + R * 0.15, cy - R * 0.05, R * 0.15, 0, 7); x.stroke();
    x.strokeStyle = 'rgba(120,130,60,0.9)'; x.lineWidth = 1.3; for (let i = 0; i < 4; i++) { const px = cx + (r() - 0.5) * R * 1.2, py = cy + (r() - 0.5) * R * 0.7; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, py - R * 0.35); x.stroke(); }
  }
  function spikes(x, cx, cy, R, revealed) {
    x.save();
    x.globalAlpha = revealed ? 1 : 0.55;
    x.fillStyle = revealed ? '#2a1a12' : 'rgba(150,30,20,0.25)';
    x.beginPath(); x.ellipse(cx, cy + R * 0.1, R * 0.62, R * 0.38, 0, 0, 7); x.fill();
    x.fillStyle = revealed ? '#b8b0a0' : '#ff6a50';
    for (let i = -2; i <= 2; i++) { const px = cx + i * R * 0.22; x.beginPath(); x.moveTo(px - R * 0.08, cy + R * 0.2); x.lineTo(px, cy - R * 0.25 + Math.abs(i) * R * 0.06); x.lineTo(px + R * 0.08, cy + R * 0.2); x.closePath(); x.fill(); }
    x.restore();
  }
  function obstacle(x, cx, cy, R, terrain, seed, kind) {
    const r0 = G.mulberry((seed | 0) + 5);
    // 0.30: a stretch of Millbrook's wall: a palisade of sharpened stakes, or grey stone with merlons
    if (kind === 'wall' || kind === 'stonewall') {
      x.fillStyle = 'rgba(0,0,0,0.32)'; x.beginPath(); x.ellipse(cx + R * 0.18, cy + R * 0.2, R * 0.5, R * 1.0, 0, 0, 7); x.fill();
      if (kind === 'stonewall') {
        const w = R * 0.62, top = cy - R * 0.95, h = R * 1.75;
        x.fillStyle = '#6f6a62'; x.fillRect(cx - w / 2, top + R * 0.25, w, h - R * 0.25);
        x.fillStyle = '#9a948a'; x.fillRect(cx - w / 2, top, w, R * 0.3);
        for (let i = 0; i < 4; i++) { x.fillStyle = '#b0aa9e'; x.fillRect(cx - w / 2 + 1, top - R * 0.16 + i * R * 0.44, w - 2, R * 0.2); }
        x.strokeStyle = 'rgba(40,36,32,0.6)'; x.lineWidth = 1;
        for (let yy = top + R * 0.45; yy < top + h; yy += R * 0.3) { x.beginPath(); x.moveTo(cx - w / 2, yy); x.lineTo(cx + w / 2, yy); x.stroke(); }
        return;
      }
      for (let i = 0; i < 5; i++) {
        const sx = cx + (r0() - 0.5) * R * 0.1, base = cy - R * 0.55 + i * R * 0.34, h = R * (0.7 + r0() * 0.15), w = R * 0.4;
        x.fillStyle = '#5e4128'; x.fillRect(sx - w / 2, base - h, w, h);
        x.fillStyle = '#8e6a44'; x.fillRect(sx - w / 2, base - h, w * 0.45, h);
        x.beginPath(); x.moveTo(sx - w / 2, base - h); x.lineTo(sx, base - h - R * 0.28); x.lineTo(sx + w / 2, base - h); x.closePath(); x.fillStyle = '#a8845a'; x.fill();
      }
      return;
    }
    if (kind === 'tree') { if (terrain === 'snow') pine(x, cx, cy + R * 0.5, R * 1.3, true); else if (terrain === 'waste' || terrain === 'swamp') deadTree(x, cx, cy + R * 0.55, R * 1.1); else tree(x, cx, cy + R * 0.45, R * 0.55, r0); return; }
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(cx + 3, cy + R * 0.4, R * 0.75, R * 0.28, 0, 0, 7); x.fill();
    x.fillStyle = terrain === 'waste' ? '#3a2c2a' : '#7d756a'; x.beginPath();
    x.moveTo(cx - R * 0.7, cy + R * 0.35); x.lineTo(cx - R * 0.5, cy - R * 0.25); x.lineTo(cx - R * 0.05, cy - R * 0.55); x.lineTo(cx + R * 0.5, cy - R * 0.3); x.lineTo(cx + R * 0.72, cy + R * 0.35); x.closePath(); x.fill();
    x.fillStyle = terrain === 'waste' ? '#52403c' : '#a59c8e'; x.beginPath(); x.moveTo(cx - R * 0.5, cy - R * 0.25); x.lineTo(cx - R * 0.05, cy - R * 0.55); x.lineTo(cx + R * 0.05, cy); x.lineTo(cx - R * 0.6, cy + R * 0.2); x.closePath(); x.fill();
  }

  const MINI = { grass: '#5c8a3a', dirt: '#97784e', forest: '#2f5a24', swamp: '#4e5d3c', snow: '#dfe6ec', waste: '#5a4038', water: '#2f5f8f', mount: '#6d6152' };

  return { IMG, URI, ready, paintMap, paintField, obstacle, brush, bog, spikes, MINI, HEADS, heroHead, ensureHero, heroKey, portrait, medal, uri };
})();
