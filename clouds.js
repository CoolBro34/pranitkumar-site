// clouds.js — scatter, size, cloud-shape, drag

const CLOUD = {
  // Layout — controls how cards are distributed in their section
  COLS:          2,      // number of placement columns per section
  ROW_H:         220,    // approximate vertical spacing between rows (px)
  JITTER_X_FRAC: 0.20,   // horizontal randomness as fraction of column width
  JITTER_Y_FRAC: 0.28,   // vertical randomness as fraction of row height
  MAX_TRIES:     60,     // collision resolution attempts before fallback
  CONTENT_WIDTH: 210,    // fixed width of card text content (px)

  // Cloud shape — controls how far the cloud silhouette bleeds past the card text
  BLEED_X: 32,           // horizontal bleed on each side (px)
  BLEED_Y: 24,           // vertical bleed on each side (px)
  GAP:     18,           // minimum clear space between adjacent clouds (px)

  // Float animation — the gentle up/down drift on each card
  FLOAT_DUR:   [4.5, 7.2],  // [min, max] duration in seconds
  FLOAT_DELAY: [0,   2.8],  // [min, max] start delay in seconds
  FLOAT_DIST:  6,           // vertical travel distance in px

  // Cloud silhouette shape — border-radius randomness range
  BUMP_MIN: 38,   // minimum curve percentage
  BUMP_MAX: 68,   // maximum curve percentage
};

function rnd(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rnd(a, b + 1)); }

function randomCloudRadius() {
  const v = () => randInt(CLOUD.BUMP_MIN, CLOUD.BUMP_MAX);
  return `${v()}% ${v()}% ${v()}% ${v()}% / ${v()}% ${v()}% ${v()}% ${v()}%`;
}

function makeCloudBg(cardEl, contentW, contentH) {
  const old = cardEl.querySelector('.pk-cloud-bg');
  if (old) old.remove();

  const bgW = contentW + CLOUD.BLEED_X * 2;
  const bgH = contentH + CLOUD.BLEED_Y * 2;

  const bg = document.createElement('div');
  bg.className = 'pk-cloud-bg';
  bg.style.cssText = `position:absolute;left:${-CLOUD.BLEED_X}px;top:${-CLOUD.BLEED_Y}px;width:${bgW}px;height:${bgH}px;pointer-events:none;filter:blur(10px);z-index:0;overflow:visible;`;

  const blobs = [
    { cx:.50, cy:.52, rx:.42, ry:.34 },
    { cx:.20, cy:.28, rx:.24, ry:.26 },
    { cx:.78, cy:.24, rx:.22, ry:.24 },
    { cx:.50, cy:.18, rx:.20, ry:.22 },
    { cx:.25, cy:.68, rx:.20, ry:.20 },
    { cx:.74, cy:.70, rx:.18, ry:.18 },
  ];

  blobs.forEach(b => {
    const jx = rnd(-.06, .06), jy = rnd(-.05, .05), jr = rnd(-.05, .07);
    const cx = (b.cx + jx) * bgW, cy = (b.cy + jy) * bgH;
    const rx = (b.rx + jr) * bgW, ry = (b.ry + jr * .8) * bgH;
    const blob = document.createElement('div');
    blob.style.cssText = `position:absolute;background:var(--card-bg, rgba(255,255,255,0.85));border-radius:50%;left:${cx-rx}px;top:${cy-ry}px;width:${rx*2}px;height:${ry*2}px;`;
    bg.appendChild(blob);
  });

  cardEl.insertBefore(bg, cardEl.firstChild);
  return { w: bgW, h: bgH };
}

function rectsOverlap(a, b) {
  const g = CLOUD.GAP;
  return !(a.x + a.w + g < b.x || b.x + b.w + g < a.x ||
           a.y + a.h + g < b.y || b.y + b.h + g < a.y);
}

function makeDraggable(el, region, allCards) {
  let sx, sy, ol, ot, origAnim;
  let lastValidLeft = ol;
  let lastValidTop  = ot;

  function down(e) {
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    sx = cx; sy = cy;
    ol = parseFloat(el.style.left) || 0;
    ot = parseFloat(el.style.top)  || 0;
    origAnim = el.style.animation;
    lastValidLeft = ol;
    lastValidTop = ot;
    el.style.animation = 'none';
    el.style.zIndex = '200';
    el.style.transform = 'scale(1.04)';
    el.style.transition = 'transform .15s ease';
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup',   up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend',  up);
  }

  function move(e) {
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const rW = region.offsetWidth, rH = region.offsetHeight;
    const newLeft = Math.max(-CLOUD.BLEED_X, Math.min(rW - el.offsetWidth  + CLOUD.BLEED_X, ol + cx - sx));
    const newTop  = Math.max(-CLOUD.BLEED_Y, Math.min(rH - el.offsetHeight + CLOUD.BLEED_Y, ot + cy - sy));

    const candidate = { x: newLeft, y: newTop, w: el.offsetWidth, h: el.offsetHeight };
    const blocked = allCards.some(other => {
      if (other === el) return false;
      const ox = parseFloat(other.style.left) || 0;
      const oy = parseFloat(other.style.top)  || 0;
      return rectsOverlap(candidate, { x: ox, y: oy, w: other.offsetWidth, h: other.offsetHeight });
    });

    if (!blocked) {
      lastValidLeft = newLeft;
      lastValidTop  = newTop;
      el.style.left = newLeft + 'px';
      el.style.top  = newTop  + 'px';
    }
  }

  function up() {
    ol = lastValidLeft;
    ot = lastValidTop;
    el.style.zIndex = '1';
    el.style.transform = '';
    el.style.animation = origAnim;
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup',   up);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend',  up);
  }

  el.addEventListener('mousedown',  down);
  el.addEventListener('touchstart', down, { passive: false });
}

function scatterSection(section) {
  // Find the card container — could be .grid-two, .stack, .grid-projects, etc.
  const container = section.querySelector('.grid-two, .stack, .grid-projects, .grid-three');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll(':scope > .card'));
  if (cards.length < 2) return;

  // Convert container to a scatter region
  container.style.position = 'relative';
  container.style.display  = 'block';

  // Step 1: measure each card at natural width
  cards.forEach(card => {
    card.style.position   = 'absolute';
    card.style.width      = CLOUD.CONTENT_WIDTH + 'px';
    card.style.visibility = 'hidden';
    card.style.top        = '0px';
    card.style.left       = '0px';
    card.style.background = 'transparent';
    card.style.border     = 'none';
    card.style.boxShadow  = 'none';
    card.style.backdropFilter = 'none';
  });

  // Step 2: after paint, measure and place
  requestAnimationFrame(() => {
    const regionW = container.offsetWidth || 680;
    const zoneW   = (regionW - CLOUD.BLEED_X * 2) / CLOUD.COLS;
    const JX      = zoneW  * CLOUD.JITTER_X_FRAC;
    const JY      = CLOUD.ROW_H * CLOUD.JITTER_Y_FRAC;
    const placed  = [];

    cards.forEach((card, i) => {
      const contentH = card.offsetHeight;
      const { w: cloudW, h: cloudH } = makeCloudBg(card, CLOUD.CONTENT_WIDTH, contentH);

      // Wrap content in a z-index layer so it sits above the cloud bg
      Array.from(card.childNodes).forEach(n => {
        if (n.classList && n.classList.contains('pk-cloud-bg')) return;
        if (n._contentWrapped) return;
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;z-index:1;';
        n._contentWrapped = true;
        n.parentNode.insertBefore(wrap, n);
        wrap.appendChild(n);
      });

      const col = i % CLOUD.COLS;
      const row = Math.floor(i / CLOUD.COLS);
      const zoneCX = CLOUD.BLEED_X + zoneW * col + zoneW * 0.5 - cloudW * 0.5;
      const zoneCY = CLOUD.BLEED_Y + CLOUD.ROW_H * row;

      let pos = null;
      for (let t = 0; t < CLOUD.MAX_TRIES; t++) {
        const scale = 1 - (t / CLOUD.MAX_TRIES) * 0.65;
        const tx = Math.max(0, zoneCX + rnd(-JX, JX) * scale);
        const ty = Math.max(0, zoneCY + rnd(-JY, JY) * scale);
        const cand = { x: tx, y: ty, w: cloudW, h: cloudH };
        if (!placed.some(p => rectsOverlap(p, cand))) { pos = cand; break; }
      }
      if (!pos) pos = { x: Math.max(0, zoneCX), y: Math.max(0, zoneCY), w: cloudW, h: cloudH };
      placed.push(pos);

      card.style.left       = pos.x + 'px';
      card.style.top        = pos.y  + 'px';
      card.style.visibility = '';
      card.style.opacity    = '0';
      card.style.transition = 'opacity .5s ease';

      const dur   = rnd(...CLOUD.FLOAT_DUR).toFixed(2);
      const delay = rnd(...CLOUD.FLOAT_DELAY).toFixed(2);
      card.style.animation = `cloudFloat ${dur}s ease-in-out ${delay}s infinite`;
      card.style.setProperty('--float-distance', CLOUD.FLOAT_DIST + 'px');

      makeDraggable(card, container, cards);
      setTimeout(() => { card.style.opacity = '1'; }, 80 + i * 100);
    });

    const maxBottom = placed.reduce((m, p) => Math.max(m, p.y + p.h), 0);
    container.style.minHeight = (maxBottom + CLOUD.BLEED_Y * 2) + 'px';
  });
}

function initClouds() {
  if (window.innerWidth <= 768) return;

  document.querySelectorAll('.section').forEach(section => {
    scatterSection(section);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClouds);
} else {
  initClouds();
}
