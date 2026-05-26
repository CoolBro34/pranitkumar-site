// clouds.js
// Handles all visual background effects for both day and night themes.
// Day:   cloud blob backgrounds on cards + static canvas sky clouds
// Night: aurora canvas backgrounds on cards + animated stars/aurora sky

// ─────────────────────────────────────────────────────────────────
// CONFIG 
// ─────────────────────────────────────────────────────────────────

const CLOUD = {
  BLEED_X    : 36,
  BLEED_Y    : 28,
  FLOAT_DUR  : [4.5, 7.2],
  FLOAT_DELAY: [0,   2.8],
};

const NIGHT = {
  STAR_COUNT           : 200,
  STAR_SPECIALS        :   8,
  RIBBON_ACCENT_COUNT  :   2,   // number of accent ribbons alongside the hero curtain
  CARD_BLOBS: [
    {cx:.50,cy:.50,rx:.52,ry:.56},
    {cx:.14,cy:.30,rx:.34,ry:.36},
    {cx:.84,cy:.26,rx:.30,ry:.32},
    {cx:.50,cy:.12,rx:.26,ry:.28},
    {cx:.22,cy:.78,rx:.26,ry:.26},
    {cx:.76,cy:.80,rx:.22,ry:.24},
  ],
  CARD_PALETTES: [
    {cols:[[  0,255,170],[  0,160,255]], ph:0.0},
    {cols:[[110, 50,255],[  0,210,200]], ph:2.2},
    {cols:[[  0,200,255],[140,  0,255]], ph:4.5},
    {cols:[[  0,255,120],[ 40,200,255]], ph:1.1},
    {cols:[[200,  0,255],[  0,210,200]], ph:3.3},
    {cols:[[150,  0,255],[  0,180,255]], ph:5.5},
    {cols:[[  0,255,170],[  0,160,255]], ph:0.7},
    {cols:[[  0,200,255],[100,  0,200]], ph:2.8},
  ],
};

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

function rnd(a, b) { return a + Math.random() * (b - a); }

// ─────────────────────────────────────────────────────────────────
// DAY — cloud blob backgrounds on individual cards
// ─────────────────────────────────────────────────────────────────

function _makeCloudBg(el) {
  const old = el.querySelector('.pk-cloud-bg');
  if (old) old.remove();
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  const bgW = w + CLOUD.BLEED_X * 2;
  const bgH = h + CLOUD.BLEED_Y * 2;
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
    const jx = rnd(-.06,.06), jy = rnd(-.05,.05), jr = rnd(-.05,.07);
    const cx = (b.cx+jx)*bgW, cy = (b.cy+jy)*bgH;
    const rx = (b.rx+jr)*bgW, ry = (b.ry+jr*.8)*bgH;
    const blob = document.createElement('div');
    blob.style.cssText = [
      'position:absolute',
      'background:var(--card-bg,rgba(255,255,255,0.85))',
      'border-radius:50%',
      `left:${cx-rx}px`,
      `top:${cy-ry}px`,
      `width:${rx*2}px`,
      `height:${ry*2}px`,
    ].join(';');
    bg.appendChild(blob);
  });

  el.style.position = 'relative';
  el.insertBefore(bg, el.firstChild);

  // Wrap existing children above the blob layer
  Array.from(el.childNodes).forEach(n => {
    if (n === bg || n._pkWrapped) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;z-index:1;';
    n._pkWrapped = true;
    el.insertBefore(wrap, n);
    wrap.appendChild(n);
  });

  const dur   = rnd(...CLOUD.FLOAT_DUR).toFixed(2);
  const delay = rnd(...CLOUD.FLOAT_DELAY).toFixed(2);
  el.style.animation = `cloudFloat ${dur}s ease-in-out ${delay}s infinite`;
}

function _initDayCards() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.card, .skills-grid p').forEach(_makeCloudBg);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// DAY — static sky cloud canvas (drawn once, persisted per session)
// ─────────────────────────────────────────────────────────────────

function _initDaySky() {
  if (window.matchMedia('(max-width: 768px)').matches) return;
  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  Array.from(bg.querySelectorAll('canvas')).forEach(c => c.remove());

  const DAY_SKY = {
    COUNT       : 7,
    MIN_W       : 240,
    MAX_W       : 540,
    OPACITY_MIN : 0.35,
    OPACITY_MAX : 0.60,
    BLOBS: [
      {cx:.50,cy:.52,rx:.45,ry:.38},
      {cx:.18,cy:.38,rx:.28,ry:.30},
      {cx:.80,cy:.34,rx:.26,ry:.28},
      {cx:.50,cy:.22,rx:.22,ry:.26},
      {cx:.30,cy:.68,rx:.20,ry:.22},
      {cx:.68,cy:.70,rx:.19,ry:.20},
    ],
  };

  const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  let skyKey = sessionStorage.getItem('pk-sky-key');
  if (!skyKey || isReload) {
    if (skyKey) sessionStorage.removeItem('pk-sky-' + skyKey);
    skyKey = Math.random().toString(36).slice(2);
    sessionStorage.setItem('pk-sky-key', skyKey);
  }
  const storeKey = 'pk-sky-' + skyKey;
  let configs = null;
  try { configs = JSON.parse(sessionStorage.getItem(storeKey) || 'null'); } catch(e) {}

  if (!configs) {
    const cols = 3, rows = Math.ceil(DAY_SKY.COUNT / cols);
    configs = [];
    for (let i = 0; i < DAY_SKY.COUNT; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const w   = rnd(DAY_SKY.MIN_W, DAY_SKY.MAX_W);
      configs.push({
        w, h: w * rnd(.38,.58),
        op : rnd(DAY_SKY.OPACITY_MIN, DAY_SKY.OPACITY_MAX),
        x  : Math.min(.92, Math.max(.05, ((col/cols)*100+(1/cols)*50+rnd(-12,12))/100)),
        y  : Math.min(.92, Math.max(.05, ((row/rows)*100+(1/rows)*50+rnd(-10,10))/100)),
        blobs: DAY_SKY.BLOBS.map(() => ({
          jx:rnd(-.07,.07), jy:rnd(-.06,.06), jr:rnd(-.06,.08),
        })),
      });
    }
    sessionStorage.setItem(storeKey, JSON.stringify(configs));
  }

  const vw = window.innerWidth, vh = window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = vw; canvas.height = vh;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  const ctx = canvas.getContext('2d');

  configs.forEach(c => {
    const cx0 = c.x * vw, cy0 = c.y * vh;
    DAY_SKY.BLOBS.forEach((b, i) => {
      const j  = c.blobs[i];
      const cx = cx0 + (b.cx-.5+j.jx)*c.w, cy = cy0 + (b.cy-.5+j.jy)*c.h;
      const rx = (b.rx+j.jr)*c.w, ry = (b.ry+j.jr*.8)*c.h;
      const r  = Math.max(rx, ry);
      ctx.save();
      ctx.translate(cx,cy); ctx.scale(rx/r, ry/r); ctx.translate(-cx,-cy);
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      grad.addColorStop(0,   `rgba(255,255,255,${c.op.toFixed(2)})`);
      grad.addColorStop(.45, `rgba(255,255,255,${(c.op*.75).toFixed(2)})`);
      grad.addColorStop(.8,  `rgba(255,255,255,${(c.op*.25).toFixed(2)})`);
      grad.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.restore();
    });
  });
  bg.appendChild(canvas);
}

// ─────────────────────────────────────────────────────────────────
// NIGHT — aurora card backgrounds (animated canvas per card)
// ─────────────────────────────────────────────────────────────────

let _nightAnimFrame = null;
let _nightCardData  = [];
let _nightSkyData   = null;

function _makeAuroraCard(el, palIdx) {
  el.querySelector('.pk-cloud-bg')?.remove();
  el.querySelector('.pk-aurora-canvas')?.remove();
  el.style.animation = 'none';

  // Ensure existing content children sit above the canvas
  Array.from(el.childNodes).forEach(n => {
    if (n._pkWrapped) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;z-index:1;';
    n._pkWrapped = true;
    el.insertBefore(wrap, n);
    wrap.appendChild(n);
  });

  const w = el.offsetWidth  || 260;
  const h = el.offsetHeight || 100;

  const canvas = document.createElement('canvas');
  canvas.className = 'pk-aurora-canvas';
  canvas.width  = w;
  canvas.height = h;
  canvas.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'z-index:0',
    'border-radius:12px',
    'pointer-events:none',
  ].join(';');
  el.style.position = 'relative';
  el.insertBefore(canvas, el.firstChild);

  const pal   = NIGHT.CARD_PALETTES[palIdx % NIGHT.CARD_PALETTES.length];
  const blobs = NIGHT.CARD_BLOBS.map(b => ({
    ...b,
    jx: rnd(-.14,.14), jy: rnd(-.12,.12), jr: rnd(-.12,.12),
  }));

  return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: false }), pal, blobs, w, h };
}

function _drawAuroraCard(d, t) {
  const {ctx, pal, blobs, w, h} = d;
  ctx.clearRect(0,0,w,h);

  const [r1,g1,b1] = pal.cols[0], [r2,g2,b2] = pal.cols[1];
  const mx = (Math.sin(t*.17+pal.ph)+1)/2;
  const mr = Math.round(r1+(r2-r1)*mx);
  const mg = Math.round(g1+(g2-g1)*mx);
  const mb = Math.round(b1+(b2-b1)*mx);

  // In Performance Mode: single-pass blobs (skip the 3 outer glow passes)
  const blobPasses = window.PK_PERF_MODE ? [[1,.85]] : [[1,.85],[1.6,.40],[2.4,.18],[3.8,.07]];

  blobs.forEach(b => {
    const cx = (b.cx+b.jx)*w, cy = (b.cy+b.jy)*h;
    const rx = (b.rx+b.jr)*w, ry = (b.ry+b.jr*.8)*h;
    const r  = Math.max(rx, ry);
    const tw = .22 + .08*Math.sin(t*.45+pal.ph+b.jx*8);

    blobPasses.forEach(([ws,os]) => {
      ctx.save();
      ctx.translate(cx,cy); ctx.scale(rx/(r*ws), ry/(r*ws)); ctx.translate(-cx,-cy);
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r*ws);
      g.addColorStop(0,   `rgba(${mr},${mg},${mb},${(tw*os).toFixed(4)})`);
      g.addColorStop(.55, `rgba(${mr},${mg},${mb},${(tw*os*.5).toFixed(4)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx,cy,r*ws,0,Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    });
  });

  // Dark glassy base rendered behind the aurora
  ctx.globalCompositeOperation = 'destination-over';
  const bg = ctx.createLinearGradient(0,0,w,h);
  bg.addColorStop(0,'rgba(4,8,22,0.82)');
  bg.addColorStop(1,'rgba(6,12,30,0.78)');
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'source-over';

  // Aurora-tinted border
  ctx.strokeStyle = `rgba(${mr},${mg},${mb},0.22)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(.5,.5,w-1,h-1);
}

function _initNightCards() {
  _nightCardData = [];
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      let idx = 0;
      document.querySelectorAll('.card, .skills-grid p').forEach(el => {
        _nightCardData.push(_makeAuroraCard(el, idx++));
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// NIGHT — star + aurora sky (animated canvas in #sky-bg)
// ─────────────────────────────────────────────────────────────────

function _genStars(vw, vh, isMobile) {
  const count = isMobile ? Math.floor(NIGHT.STAR_COUNT * 0.5) : NIGHT.STAR_COUNT;
  const stars = Array.from({length: count}, () => ({
    x: rnd(0,vw), y: rnd(0,vh*.9),
    r: Math.random() < .65 ? .5 : Math.random() < .85 ? .9 : 1.3,
    base: .15+rnd(0,.4), amp: .10+rnd(0,.35),
    spd: .25+rnd(0,1.5), off: rnd(0,Math.PI*2),
  }));
  const specials = Array.from({length: isMobile ? 3 : NIGHT.STAR_SPECIALS}, () => ({
    x: rnd(0,vw), y: rnd(0,vh*.75),
    r: 1.0+rnd(0,.7),
    base:.30, amp:.45, spd:.4+rnd(0,.9), off:rnd(0,Math.PI*2),
    col: Math.random()<.5 ? [255,230,140] : [160,190,255],
  }));
  return {stars, specials};
}

function _genRibbons(vw, vh) {
  const ribbons = [];
  const COLORS = [
    [[0,255,165],[0,200,255]],
    [[90,50,255],[200,0,255]],
    [[0,235,210],[0,160,255]],
    [[255,80,200],[100,0,255]],
    [[0,210,120],[40,255,200]],
    [[180,0,255],[0,150,255]],
  ];
  const rc = () => COLORS[Math.floor(Math.random()*COLORS.length)];

  // Hero ribbon — always one big sweeping curtain
  const hx0 = vw*(.04+rnd(0,.12)), hx1 = vw*(.72+rnd(0,.26)), hy1 = vh*(.62+rnd(0,.22));
  ribbons.push({
    hero: true,
    x0:hx0, y0:vh*.01,
    cx1:hx0+vw*(.12+rnd(0,.12)), cy1:vh*(.22+rnd(0,.18)),
    cx2:hx1-vw*(.18+rnd(0,.10)), cy2:vh*(.38+rnd(0,.18)),
    x1:hx1, y1:hy1,
    w:vh*(.18+rnd(0,.12)),
    cols:[[0,255,170],[0,190,255]],
    op:.34, tw:.12, spd:.13+rnd(0,.08), ph:rnd(0,Math.PI*2),
  });

  // Accent ribbons — count controlled by config
  for (let i = 0; i < NIGHT.RIBBON_ACCENT_COUNT; i++) {
    const ax0 = vw*(.08+rnd(0,.35)), ax1 = vw*(.45+rnd(0,.50)), ay1 = vh*(.38+rnd(0,.32));
    ribbons.push({
      hero: false,
      x0:ax0, y0:vh*(.02+rnd(0,.08)),
      cx1:ax0+vw*(.08+rnd(0,.14)), cy1:vh*(.14+rnd(0,.18)),
      cx2:ax1-vw*(.12+rnd(0,.10)), cy2:vh*(.26+rnd(0,.16)),
      x1:ax1, y1:ay1,
      w:vh*(.06+rnd(0,.06)),
      cols:rc(),
      op:.15+rnd(0,.12), tw:.05+rnd(0,.07),
      spd:.11+rnd(0,.14), ph:rnd(0,Math.PI*2),
    });
  }
  return ribbons;
}

const RAY_COUNT = 65;
function _genRays(vw, vh, isMobile) {
  const rayCount = isMobile ? 30 : RAY_COUNT;
  return Array.from({length:rayCount},(_,i)=>({
    xf:.02+(i/rayCount)*.96,
    hf:.16+rnd(0,.52),
    hue:148+(i/RAY_COUNT)*140,
    spd:.1+rnd(0,.22),
    off:rnd(0,Math.PI*2),
    wob:(rnd(0,1)-.5)*22,
    w:1.8+rnd(0,2.2),
    vh,
  }));
}

function _initNightSky() {
  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  Array.from(bg.querySelectorAll('canvas')).forEach(c => c.remove());
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Persist aurora seed across page navigations (index ↔ gallery)
  // Same session key approach as the day sky — regenerates only on reload
  const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  let nightKey = sessionStorage.getItem('pk-night-key');
  if (!nightKey || isReload) {
    if (nightKey) sessionStorage.removeItem('pk-night-' + nightKey);
    nightKey = Math.random().toString(36).slice(2);
    sessionStorage.setItem('pk-night-key', nightKey);
  }
  const storeKey = 'pk-night-' + nightKey;
  let seed = null;
  try { seed = JSON.parse(sessionStorage.getItem(storeKey) || 'null'); } catch(e) {}

  const vw = window.innerWidth, vh = window.innerHeight;
  let star, ribbon, rays;

  if (seed) {
    // Rebuild deterministic data from stored seed using a seeded rng
    star   = seed.star;
    ribbon = seed.ribbon;
    rays   = seed.rays;
  } else {
    star   = _genStars(vw, vh, isMobile);
    ribbon = _genRibbons(vw, vh);
    rays   = _genRays(vw, vh, isMobile);
    // Store the generated data for the other page to reuse
    try {
      sessionStorage.setItem(storeKey, JSON.stringify({ star, ribbon, rays }));
    } catch(e) {} // quota exceeded — just skip caching
  }

  const canvas = document.createElement('canvas');
  canvas.width = vw; canvas.height = vh;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  bg.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  _nightSkyData = {ctx, vw, vh, star, ribbon, rays};
}

function _drawNightSky(d, t) {
  const {ctx,vw,vh,star,ribbon,rays} = d;
  ctx.clearRect(0,0,vw,vh);

  // Stars
  star.stars.forEach(s => {
    const op = Math.max(0, s.base + s.amp*Math.sin(t*s.spd+s.off));
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle = `rgba(210,228,255,${op.toFixed(3)})`; ctx.fill();
  });
  star.specials.forEach(s => {
    const op = Math.max(0, s.base+s.amp*Math.sin(t*s.spd+s.off));
    const [r,g,b] = s.col;
    const g2 = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*3);
    g2.addColorStop(0,`rgba(${r},${g},${b},${op.toFixed(3)})`);
    g2.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r*3,0,Math.PI*2);
    ctx.fillStyle=g2; ctx.fill();
  });

  // Aurora rays
  ctx.save(); ctx.globalCompositeOperation='screen';
  rays.forEach(ray => {
    const rx = ray.xf*vw + Math.sin(t*ray.spd+ray.off)*ray.wob;
    const rh = ray.hf*vh, ry = vh*.01;
    const rop = .018 + .014*Math.sin(t*1.05+ray.off);
    const g = ctx.createLinearGradient(rx,ry,rx,ry+rh);
    g.addColorStop(0,  `hsla(${ray.hue},100%,75%,${(rop*2.8).toFixed(4)})`);
    g.addColorStop(.45,`hsla(${ray.hue},100%,68%,${rop.toFixed(4)})`);
    g.addColorStop(1,  `hsla(${ray.hue},100%,65%,0)`);
    ctx.fillStyle=g; ctx.fillRect(rx-ray.w*.5,ry,ray.w,rh);
  });
  ctx.restore();

  // Aurora ribbons
  ribbon.forEach(rib => _drawRibbon(ctx, rib, vw, vh, t));

  // Focal source glow
  ctx.save(); ctx.globalCompositeOperation='screen';
  const fg = ctx.createRadialGradient(vw*.07,vh*.02,0,vw*.07,vh*.02,vw*.3);
  fg.addColorStop(0,'rgba(160,255,230,0.12)');
  fg.addColorStop(.35,'rgba(60,180,220,0.05)');
  fg.addColorStop(1,'rgba(60,180,220,0)');
  ctx.fillStyle=fg; ctx.fillRect(0,0,vw,vh);
  ctx.restore();
}

// Cubic bezier sample points + perpendicular normals for ribbon drawing
function _bezierPts(rib, t, vh) {
  const wv  = Math.sin(t*rib.spd+rib.ph)*vh*.04;
  const wv2 = Math.sin(t*rib.spd*.72+rib.ph+1.1)*vh*.025;
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const u=i/28, mt=1-u;
    const x=mt*mt*mt*rib.x0+3*mt*mt*u*rib.cx1+3*mt*u*u*rib.cx2+u*u*u*rib.x1;
    const y=mt*mt*mt*rib.y0+3*mt*mt*u*(rib.cy1+wv)+3*mt*u*u*(rib.cy2+wv2)+u*u*u*rib.y1;
    const dx=3*mt*mt*(rib.cx1-rib.x0)+6*mt*u*(rib.cx2-rib.cx1)+3*u*u*(rib.x1-rib.cx2);
    const dy=3*mt*mt*(rib.cy1+wv-rib.y0)+6*mt*u*(rib.cy2+wv2-rib.cy1-wv)+3*u*u*(rib.y1-rib.cy2-wv2);
    const l=Math.sqrt(dx*dx+dy*dy)||1;
    pts.push({x,y,nx:-dy/l,ny:dx/l});
  }
  return pts;
}

function _drawRibbon(ctx, rib, vw, vh, t) {
  const pts=_bezierPts(rib,t,vh);
  const [r1,g1,b1]=rib.cols[0],[r2,g2,b2]=rib.cols[1];
  const mx=(Math.sin(t*.13+rib.ph)+1)/2;
  const mr=Math.round(r1+(r2-r1)*mx),mg=Math.round(g1+(g2-g1)*mx),mb=Math.round(b1+(b2-b1)*mx);
  const op=rib.op+rib.tw*Math.sin(t*.55+rib.ph*2.1);
  const passes=[[.40,1.00],[.65,.58],[.95,.32],[1.35,.17],[1.90,.09],[2.70,.046],[3.90,.022],[5.50,.010],[8.0,.004]];

  ctx.save(); ctx.globalCompositeOperation='screen';
  passes.forEach(([ws,os])=>{
    const hw=rib.w*ws*.5, passOp=op*os;
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const x=p.x+p.nx*hw,y=p.y+p.ny*hw;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    for(let i=pts.length-1;i>=0;i--)
      ctx.lineTo(pts[i].x-pts[i].nx*hw,pts[i].y-pts[i].ny*hw);
    ctx.closePath();
    const g=ctx.createLinearGradient(rib.x0,rib.y0,rib.x1,rib.y1);
    g.addColorStop(0,  `rgba(${mr},${mg},${mb},0)`);
    g.addColorStop(.12,`rgba(${mr},${mg},${mb},${passOp.toFixed(4)})`);
    g.addColorStop(.50,`rgba(${mr},${mg},${mb},${(passOp*1.25).toFixed(4)})`);
    g.addColorStop(.88,`rgba(${mr},${mg},${mb},${passOp.toFixed(4)})`);
    g.addColorStop(1,  `rgba(${mr},${mg},${mb},0)`);
    ctx.fillStyle=g; ctx.fill();
  });
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// NIGHT ANIMATION LOOP
// ─────────────────────────────────────────────────────────────────

function _startNightLoop() {
  function loop(ts) {
    const t = ts / 1000;
    if (_nightSkyData)  _drawNightSky(_nightSkyData, t);
    _nightCardData.forEach(d => _drawAuroraCard(d, t));
    _nightAnimFrame = requestAnimationFrame(loop);
  }
  _nightAnimFrame = requestAnimationFrame(loop);
}

function _stopNightLoop() {
  if (_nightAnimFrame) {
    cancelAnimationFrame(_nightAnimFrame);
    _nightAnimFrame = null;
  }
  _nightSkyData  = null;
  _nightCardData = [];
}

// ─────────────────────────────────────────────────────────────────
// CLEANUP — remove all effect elements, stop loops
// ─────────────────────────────────────────────────────────────────

function _cleanup() {
  _stopNightLoop();
  document.querySelectorAll('.card, .skills-grid p').forEach(el => {
    el.querySelector('.pk-cloud-bg')?.remove();
    el.querySelector('.pk-aurora-canvas')?.remove();
    el.style.animation = '';
  });
  const bg = document.getElementById('sky-bg');
  if (bg) Array.from(bg.querySelectorAll('canvas')).forEach(c => c.remove());
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC API — called by theme.js on every theme switch
// ─────────────────────────────────────────────────────────────────

window.reinitEffects = function(themeKey) {
  _cleanup();
  if (themeKey === 'night') {
    _initNightSky();
    _initNightCards();
    requestAnimationFrame(() => requestAnimationFrame(_startNightLoop));
  } else {
    _initDaySky();
    _initDayCards();
  }
};

// ─────────────────────────────────────────────────────────────────
// INIT — runs on page load
// ─────────────────────────────────────────────────────────────────

function _init() {
  const theme = document.documentElement.dataset.theme || 'day';
  if (theme === 'night') {
    _initNightSky();
    _initNightCards();
    requestAnimationFrame(() => requestAnimationFrame(_startNightLoop));
  } else {
    _initDaySky();
    _initDayCards();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}
