// clouds.js

const CLOUD = {
  BLEED_X    : 36,
  BLEED_Y    : 28,
  FLOAT_DUR  : [4.5, 7.2],
  FLOAT_DELAY: [0, 2.8],
};

function rnd(a, b) { return a + Math.random() * (b - a); }

// ── Card clouds — unchanged from working version ──────────────────
function makeCloudBg(el) {
  const old = el.querySelector('.pk-cloud-bg');
  if (old) old.remove();
  const w = el.offsetWidth, h = el.offsetHeight;
  const bgW = w + CLOUD.BLEED_X * 2, bgH = h + CLOUD.BLEED_Y * 2;
  const bg = document.createElement('div');
  bg.className = 'pk-cloud-bg';
  bg.style.cssText = [
    'position:absolute',
    `left:${-CLOUD.BLEED_X}px`,
    `top:${-CLOUD.BLEED_Y}px`,
    `width:${bgW}px`,
    `height:${bgH}px`,
    'pointer-events:none',
    'filter:blur(10px)',
    'z-index:0',
    'overflow:visible',
  ].join(';');

  [
    {cx:.50,cy:.52,rx:.42,ry:.34},
    {cx:.20,cy:.28,rx:.24,ry:.26},
    {cx:.78,cy:.24,rx:.22,ry:.24},
    {cx:.50,cy:.18,rx:.20,ry:.22},
    {cx:.25,cy:.68,rx:.20,ry:.20},
    {cx:.74,cy:.70,rx:.18,ry:.18},
  ].forEach(b => {
    const jx = rnd(-.06, .06), jy = rnd(-.05, .05), jr = rnd(-.05, .07);
    const cx = (b.cx + jx) * bgW, cy = (b.cy + jy) * bgH;
    const rx = (b.rx + jr) * bgW, ry = (b.ry + jr * .8) * bgH;
    const blob = document.createElement('div');
    blob.style.cssText = [
      'position:absolute',
      `background:var(--card-bg,rgba(255,255,255,0.85))`,
      'border-radius:50%',
      `left:${cx - rx}px`,
      `top:${cy - ry}px`,
      `width:${rx * 2}px`,
      `height:${ry * 2}px`,
    ].join(';');
    bg.appendChild(blob);
  });

  el.style.position = 'relative';
  el.insertBefore(bg, el.firstChild);

  Array.from(el.childNodes).forEach(n => {
    if (n === bg || n._wrapped) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;z-index:1;';
    n._wrapped = true;
    el.insertBefore(wrap, n);
    wrap.appendChild(n);
  });

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

// ── Background clouds — canvas based, no filter:blur ─────────────
// Each cloud is drawn onto a single <canvas> using radial gradients.
// A canvas element is a single GPU layer that the browser never
// evicts, unlike filter:blur DOM stacks which get dropped under
// memory pressure and visually pop when repromoted.
function drawBgCloud(canvas, w, h, blobs, jitters, opacity) {
  canvas.width  = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  blobs.forEach((b, i) => {
    const j  = jitters[i];
    const cx = (b.cx + j.jx) * w;
    const cy = (b.cy + j.jy) * h;
    const rx = (b.rx + j.jr) * w;
    const ry = (b.ry + j.jr * .8) * h;
    const r  = Math.max(rx, ry);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx / r, ry / r);
    ctx.translate(-cx, -cy);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,    `rgba(255,255,255,${opacity.toFixed(2)})`);
    grad.addColorStop(0.45, `rgba(255,255,255,${(opacity * 0.75).toFixed(2)})`);
    grad.addColorStop(0.8,  `rgba(255,255,255,${(opacity * 0.3).toFixed(2)})`);
    grad.addColorStop(1,    'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  });
}

function initSkyBg() {
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const bg = document.getElementById('sky-bg');
  if (!bg || bg.children.length > 0) return;

  const BG = {
    COUNT       : 7,
    MIN_W       : 240,
    MAX_W       : 540,
    OPACITY_MIN : 0.38,
    OPACITY_MAX : 0.65,
    FLOAT_DUR   : [9, 16],
    FLOAT_DELAY : [0, 6],
    BLOBS : [
      { cx:.50, cy:.52, rx:.45, ry:.38 },
      { cx:.18, cy:.38, rx:.28, ry:.30 },
      { cx:.80, cy:.34, rx:.26, ry:.28 },
      { cx:.50, cy:.22, rx:.22, ry:.26 },
      { cx:.30, cy:.68, rx:.20, ry:.22 },
      { cx:.68, cy:.70, rx:.19, ry:.20 },
    ],
  };

  // Session key in sessionStorage survives page navigation.
  // Reload detection clears the key so clouds regenerate on refresh.
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
    const rows = Math.ceil(BG.COUNT / cols);
    configs = [];

    for (let i = 0; i < BG.COUNT; i++) {
      const col   = i % cols;
      const row   = Math.floor(i / cols);
      const w     = rnd(BG.MIN_W, BG.MAX_W);
      const h     = w * rnd(0.38, 0.58);
      const zoneX = (col / cols) * 100 + (1 / cols) * 50;
      const zoneY = (row / rows) * 100 + (1 / rows) * 50;

      configs.push({
        w,
        h,
        op    : rnd(BG.OPACITY_MIN, BG.OPACITY_MAX),
        dur   : rnd(...BG.FLOAT_DUR),
        delay : rnd(...BG.FLOAT_DELAY),
        x     : Math.min(90, Math.max(0,  zoneX + rnd(-14, 14))),
        y     : Math.min(88, Math.max(-8, zoneY + rnd(-12, 12))),
        blobs : BG.BLOBS.map(() => ({
          jx : rnd(-.07, .07),
          jy : rnd(-.06, .06),
          jr : rnd(-.06, .08),
        })),
      });
    }

    sessionStorage.setItem(storeKey, JSON.stringify(configs));
  }

  // Build into a DocumentFragment — one DOM insertion means one
  // compositing recalculation instead of one per cloud
  const fragment = document.createDocumentFragment();

  configs.forEach(c => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position:absolute',
      `left:${c.x}%`,
      `top:${c.y}%`,
      'transform:translate(-50%,-50%)',
      // will-change promotes to GPU layer immediately at page load,
      // before card clouds run and trigger any recalculation
      'will-change:transform',
      `animation:bgCloudFloat ${c.dur.toFixed(1)}s ease-in-out ${c.delay.toFixed(1)}s infinite`,
    ].join(';');

    const canvas = document.createElement('canvas');
    canvas.style.cssText = `display:block;width:${c.w}px;height:${c.h}px;`;

    drawBgCloud(canvas, c.w, c.h, BG.BLOBS, c.blobs, c.op);

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
