// clouds.js
// ─────────────────────────────────────────────────────────────────
// CLOUD CONFIG
// ─────────────────────────────────────────────────────────────────
const CLOUD = {
  // Card clouds
  BLEED_X         : 40,
  BLEED_Y         : 32,
  FLOAT_DUR       : [4.5, 7.2],
  FLOAT_DELAY     : [0, 2.8],
  // Card cloud blobs
  CARD_BLOBS : [
    { cx:.50, cy:.52, rx:.42, ry:.36 },
    { cx:.18, cy:.30, rx:.26, ry:.28 },
    { cx:.80, cy:.26, rx:.24, ry:.26 },
    { cx:.50, cy:.16, rx:.22, ry:.24 },
    { cx:.26, cy:.70, rx:.20, ry:.22 },
    { cx:.72, cy:.72, rx:.18, ry:.20 },
  ],
  // Background clouds
  BG_COUNT        : 7,
  BG_MIN_W        : 240,
  BG_MAX_W        : 540,
  BG_OPACITY_MIN  : 0.38,
  BG_OPACITY_MAX  : 0.65,
  BG_FLOAT_DUR    : [9, 16],
  BG_FLOAT_DELAY  : [0, 6],
  BG_BLOBS : [
    { cx:.50, cy:.52, rx:.45, ry:.38 },
    { cx:.18, cy:.38, rx:.28, ry:.30 },
    { cx:.80, cy:.34, rx:.26, ry:.28 },
    { cx:.50, cy:.22, rx:.22, ry:.26 },
    { cx:.30, cy:.68, rx:.20, ry:.22 },
    { cx:.68, cy:.70, rx:.19, ry:.20 },
  ],
};
// ─────────────────────────────────────────────────────────────────

function rnd(a, b) { return a + Math.random() * (b - a); }

// Draw a cloud shape onto a canvas using radial gradients.
// Each blob is a soft radial gradient — no filter:blur needed.
// The result is one single GPU layer per cloud regardless of
// blob count, and the browser can never evict it mid-paint.
function drawCloudCanvas(canvas, w, h, blobs, jitters, opacity) {
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  blobs.forEach((b, i) => {
    const j  = jitters[i];
    const cx = (b.cx + j.jx) * w;
    const cy = (b.cy + j.jy) * h;
    const rx = (b.rx + j.jr) * w;
    const ry = (b.ry + j.jr * .8) * h;
    // Use the larger radius for the radial gradient
    const r  = Math.max(rx, ry);

    ctx.save();
    // Scale non-uniformly to get ellipse shape from a circle gradient
    ctx.translate(cx, cy);
    ctx.scale(rx / r, ry / r);
    ctx.translate(-cx, -cy);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   `rgba(255,255,255,${opacity.toFixed(2)})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${(opacity * 0.7).toFixed(2)})`);
    grad.addColorStop(1,   'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  });
}

// ── Card clouds ───────────────────────────────────────────────────
function makeCloudBg(el) {
  // Remove old canvas if reshuffling
  const old = el.querySelector('.pk-cloud-canvas');
  if (old) old.remove();

  // Wrap content in a z-index layer if not already done
  Array.from(el.childNodes).forEach(n => {
    if (n._cloudWrapped || n.nodeType !== 1) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;z-index:1;';
    n._cloudWrapped = true;
    el.insertBefore(wrap, n);
    wrap.appendChild(n);
  });

  el.style.position = 'relative';

  const w = el.offsetWidth  + CLOUD.BLEED_X * 2;
  const h = el.offsetHeight + CLOUD.BLEED_Y * 2;

  const jitters = CLOUD.CARD_BLOBS.map(() => ({
    jx : rnd(-.06, .06),
    jy : rnd(-.05, .05),
    jr : rnd(-.05, .07),
  }));

  const canvas = document.createElement('canvas');
  canvas.className = 'pk-cloud-canvas';
  canvas.style.cssText = [
    'position:absolute',
    `left:${-CLOUD.BLEED_X}px`,
    `top:${-CLOUD.BLEED_Y}px`,
    `width:${w}px`,
    `height:${h}px`,
    'z-index:0',
    'pointer-events:none',
    'will-change:transform',
  ].join(';');

  drawCloudCanvas(canvas, w, h, CLOUD.CARD_BLOBS, jitters, 0.92);

  el.insertBefore(canvas, el.firstChild);

  const dur   = rnd(...CLOUD.FLOAT_DUR).toFixed(2);
  const delay = rnd(...CLOUD.FLOAT_DELAY).toFixed(2);
  el.style.animation = `cloudFloat ${dur}s ease-in-out ${delay}s infinite`;
}

function init() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.card, .skills-grid p, .grid-item')
        .forEach(makeCloudBg);
    });
  });
}

// ── Background clouds ─────────────────────────────────────────────
function initSkyBg() {
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  if (bg.children.length > 0) return;

  // Session key — lives in sessionStorage so it survives navigation.
  // Reload detection regenerates it so clouds change on refresh.
  const isReload = (
    performance.getEntriesByType('navigation')[0]?.type === 'reload'
  );

  let skyKey = sessionStorage.getItem('pk-sky-key');

  if (!skyKey || isReload) {
    if (skyKey) sessionStorage.removeItem('pk-sky-' + skyKey);
    skyKey = Math.random().toString(36).slice(2);
    sessionStorage.setItem('pk-sky-key', skyKey);
  }

  const storeKey = 'pk-sky-' + skyKey;

  let configs = null;
  const stored = sessionStorage.getItem(storeKey);
  if (stored) {
    try { configs = JSON.parse(stored); } catch(e) { configs = null; }
  }

  if (!configs) {
    const cols = 3;
    const rows = Math.ceil(CLOUD.BG_COUNT / cols);
    configs = [];

    for (let i = 0; i < CLOUD.BG_COUNT; i++) {
      const col   = i % cols;
      const row   = Math.floor(i / cols);
      const w     = rnd(CLOUD.BG_MIN_W, CLOUD.BG_MAX_W);
      const h     = w * rnd(0.38, 0.58);
      const zoneX = (col / cols) * 100 + (1 / cols) * 50;
      const zoneY = (row / rows) * 100 + (1 / rows) * 50;

      configs.push({
        w,
        h,
        op    : rnd(CLOUD.BG_OPACITY_MIN, CLOUD.BG_OPACITY_MAX),
        dur   : rnd(...CLOUD.BG_FLOAT_DUR),
        delay : rnd(...CLOUD.BG_FLOAT_DELAY),
        x     : Math.min(90, Math.max(0,  zoneX + rnd(-14, 14))),
        y     : Math.min(88, Math.max(-8, zoneY + rnd(-12, 12))),
        blobs : CLOUD.BG_BLOBS.map(() => ({
          jx : rnd(-.07, .07),
          jy : rnd(-.06, .06),
          jr : rnd(-.06, .08),
        })),
      });
    }

    sessionStorage.setItem(storeKey, JSON.stringify(configs));
  }

  // Build into a fragment — single DOM insertion, one compositing
  // recalculation instead of one per cloud
  const fragment = document.createDocumentFragment();

  configs.forEach(c => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position:absolute',
      `left:${c.x}%`,
      `top:${c.y}%`,
      'transform:translate(-50%,-50%)',
      'will-change:transform',
      `animation:bgCloudFloat ${c.dur.toFixed(1)}s ease-in-out ${c.delay.toFixed(1)}s infinite`,
    ].join(';');

    const canvas = document.createElement('canvas');
    canvas.style.cssText = [
      `width:${c.w}px`,
      `height:${c.h}px`,
      'display:block',
    ].join(';');

    drawCloudCanvas(canvas, c.w, c.h, CLOUD.BG_BLOBS, c.blobs, c.op);

    wrapper.appendChild(canvas);
    fragment.appendChild(wrapper);
  });

  bg.appendChild(fragment);
}

// ── Init ──────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    initSkyBg();
  });
} else {
  init();
  initSkyBg();
}
