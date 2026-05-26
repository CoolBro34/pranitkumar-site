const CLOUD = {
  BLEED_X: 36, BLEED_Y: 28,
  FLOAT_DUR: [4.5, 7.2], FLOAT_DELAY: [0, 2.8],
};
function rnd(a,b){return a+Math.random()*(b-a);}
function makeCloudBg(el) {
  const old = el.querySelector('.pk-cloud-bg');
  if (old) old.remove();
  const w = el.offsetWidth, h = el.offsetHeight;
  const bgW = w + CLOUD.BLEED_X*2, bgH = h + CLOUD.BLEED_Y*2;
  const bg = document.createElement('div');
  bg.className = 'pk-cloud-bg';
  bg.style.cssText = `position:absolute;left:${-CLOUD.BLEED_X}px;top:${-CLOUD.BLEED_Y}px;width:${bgW}px;height:${bgH}px;pointer-events:none;filter:blur(10px);z-index:0;overflow:visible;`;
  [{cx:.50,cy:.52,rx:.42,ry:.34},{cx:.20,cy:.28,rx:.24,ry:.26},
   {cx:.78,cy:.24,rx:.22,ry:.24},{cx:.50,cy:.18,rx:.20,ry:.22},
   {cx:.25,cy:.68,rx:.20,ry:.20},{cx:.74,cy:.70,rx:.18,ry:.18}
  ].forEach(b => {
    const jx=rnd(-.06,.06),jy=rnd(-.05,.05),jr=rnd(-.05,.07);
    const cx=(b.cx+jx)*bgW, cy=(b.cy+jy)*bgH;
    const rx=(b.rx+jr)*bgW, ry=(b.ry+jr*.8)*bgH;
    const blob = document.createElement('div');
    blob.style.cssText=`position:absolute;background:var(--card-bg,rgba(255,255,255,0.85));border-radius:50%;left:${cx-rx}px;top:${cy-ry}px;width:${rx*2}px;height:${ry*2}px;`;
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
  const dur = rnd(...CLOUD.FLOAT_DUR).toFixed(2);
  const delay = rnd(...CLOUD.FLOAT_DELAY).toFixed(2);
  el.style.animation = `cloudFloat ${dur}s ease-in-out ${delay}s infinite`;
}
function init() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.card, .skills-grid p, .grid-item').forEach(makeCloudBg);
    });
  });
}

function initSkyBg() {
  const bg = document.getElementById('sky-bg');
  if (!bg) return;

  const SKY = {
    COUNT        : 8,
    MIN_W        : 220,
    MAX_W        : 520,
    BLUR         : 18,
    OPACITY_MIN  : 0.35,
    OPACITY_MAX  : 0.62,
    FLOAT_DUR    : [9, 16],
    FLOAT_DELAY  : [0, 6],
    FLOAT_DIST   : [12, 22],
  };

  // Try to load existing cloud config from this session
  let cloudConfigs;
  const stored = sessionStorage.getItem('pk-sky-clouds');
  if (stored) {
    try { cloudConfigs = JSON.parse(stored); } catch(e) { cloudConfigs = null; }
  }

  // If no stored config, generate and save it
  if (!cloudConfigs) {
    const cols = 3;
    const rows = Math.ceil(SKY.COUNT / cols);
    cloudConfigs = [];

    for (let i = 0; i < SKY.COUNT; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const w   = rnd(SKY.MIN_W, SKY.MAX_W);
      const h   = w * rnd(0.38, 0.58);

      // Generate blob jitter values and store them too
      const blobJitters = [
        { jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08) },
        { jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08) },
        { jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08) },
        { jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08) },
        { jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08) },
        { jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08) },
      ];

      const zoneX = (col / cols) * 100 + (1 / cols) * 50;
      const zoneY = (row / rows) * 100 + (1 / rows) * 50;

      cloudConfigs.push({
        w,
        h,
        op:     rnd(SKY.OPACITY_MIN, SKY.OPACITY_MAX),
        dur:    rnd(...SKY.FLOAT_DUR),
        delay:  rnd(...SKY.FLOAT_DELAY),
        dist:   rnd(...SKY.FLOAT_DIST),
        x:      Math.min(90, Math.max(0,  zoneX + rnd(-14, 14))),
        y:      Math.min(88, Math.max(-8, zoneY + rnd(-12, 12))),
        blobJitters,
      });
    }

    sessionStorage.setItem('pk-sky-clouds', JSON.stringify(cloudConfigs));
  }

  // Build DOM from config (same every time within a session)
  const blobDefs = [
    { cx:.50, cy:.52, rx:.45, ry:.38 },
    { cx:.18, cy:.38, rx:.28, ry:.30 },
    { cx:.80, cy:.34, rx:.26, ry:.28 },
    { cx:.50, cy:.22, rx:.22, ry:.26 },
    { cx:.30, cy:.68, rx:.20, ry:.22 },
    { cx:.68, cy:.70, rx:.19, ry:.20 },
  ];

  cloudConfigs.forEach(c => {
    const cloud = document.createElement('div');
    cloud.style.cssText = [
      'position:absolute',
      `left:${c.x}%`,
      `top:${c.y}%`,
      `width:${c.w}px`,
      `height:${c.h}px`,
      `opacity:${c.op.toFixed(2)}`,
      'transform:translate(-50%,-50%)',
      `animation:bgCloudFloat ${c.dur.toFixed(1)}s ease-in-out ${c.delay.toFixed(1)}s infinite`,
    ].join(';');

    const blobWrap = document.createElement('div');
    blobWrap.style.cssText = [
      'position:absolute',
      'inset:0',
      `filter:blur(${SKY.BLUR}px)`,
      'overflow:visible',
    ].join(';');

    blobDefs.forEach((b, idx) => {
      const { jx, jy, jr } = c.blobJitters[idx];
      const cx = (b.cx + jx) * c.w;
      const cy = (b.cy + jy) * c.h;
      const rx = (b.rx + jr) * c.w;
      const ry = (b.ry + jr * .8) * c.h;
      const blob = document.createElement('div');
      blob.style.cssText = [
        'position:absolute',
        `left:${cx - rx}px`,
        `top:${cy - ry}px`,
        `width:${rx * 2}px`,
        `height:${ry * 2}px`,
        'background:white',
        'border-radius:50%',
      ].join(';');
      blobWrap.appendChild(blob);
    });

    cloud.appendChild(blobWrap);
    bg.appendChild(cloud);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { init(); initSkyBg(); });
} else {
  init();
  initSkyBg();
}
