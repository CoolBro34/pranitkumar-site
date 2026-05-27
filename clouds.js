// clouds.js
// Handles all visual background effects for both day and night themes.
// Day:   cloud blob backgrounds on cards + static canvas sky clouds
// Night: aurora runs entirely in aurora-worker.js via OffscreenCanvas.
//        Main thread only creates canvases, transfers control, and
//        forwards IntersectionObserver visibility updates.

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
  RIBBON_ACCENT_COUNT: 2,
  CARD_BLOBS: [
    {cx:.50,cy:.50,rx:.52,ry:.56},
    {cx:.14,cy:.30,rx:.34,ry:.36},
    {cx:.84,cy:.26,rx:.30,ry:.32},
    {cx:.50,cy:.12,rx:.26,ry:.28},
    {cx:.22,cy:.78,rx:.26,ry:.26},
    {cx:.76,cy:.80,rx:.22,ry:.24},
  ],
};

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

function rnd(a, b) { return a + Math.random() * (b - a); }

// ─────────────────────────────────────────────────────────────────
// OFFSCREEN CANVAS SUPPORT DETECTION
// ─────────────────────────────────────────────────────────────────

const _workerSupported = (
  typeof Worker !== 'undefined' &&
  typeof OffscreenCanvas !== 'undefined' &&
  (() => { try { new OffscreenCanvas(1,1).getContext('2d'); return true; } catch(e) { return false; } })()
);

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
  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  Array.from(bg.querySelectorAll('canvas')).forEach(c => c.remove());

  const DAY_SKY = {
    COUNT: 7, MIN_W: 240, MAX_W: 540,
    OPACITY_MIN: 0.35, OPACITY_MAX: 0.60,
    BLOBS: [
      {cx:.50,cy:.52,rx:.45,ry:.38},{cx:.18,cy:.38,rx:.28,ry:.30},
      {cx:.80,cy:.34,rx:.26,ry:.28},{cx:.50,cy:.22,rx:.22,ry:.26},
      {cx:.30,cy:.68,rx:.20,ry:.22},{cx:.68,cy:.70,rx:.19,ry:.20},
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
      const w = rnd(DAY_SKY.MIN_W, DAY_SKY.MAX_W);
      configs.push({
        w, h: w * rnd(.38,.58),
        op: rnd(DAY_SKY.OPACITY_MIN, DAY_SKY.OPACITY_MAX),
        x: Math.min(.92, Math.max(.05, ((col/cols)*100+(1/cols)*50+rnd(-12,12))/100)),
        y: Math.min(.92, Math.max(.05, ((row/rows)*100+(1/rows)*50+rnd(-10,10))/100)),
        blobs: DAY_SKY.BLOBS.map(() => ({jx:rnd(-.07,.07),jy:rnd(-.06,.06),jr:rnd(-.06,.08)})),
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
      const j = c.blobs[i];
      const cx = cx0 + (b.cx-.5+j.jx)*c.w, cy = cy0 + (b.cy-.5+j.jy)*c.h;
      const rx = (b.rx+j.jr)*c.w, ry = (b.ry+j.jr*.8)*c.h;
      const r = Math.max(rx, ry);
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
// NIGHT — Web Worker + OffscreenCanvas
// Main thread responsibilities:
//   1. Create <canvas> elements for sky and each card
//   2. Transfer control to worker via transferControlToOffscreen()
//   3. Send IntersectionObserver visibility updates to worker
//   4. Forward perf-mode changes to worker
// All drawing happens in aurora-worker.js on a separate thread.
//
// Fallback: if OffscreenCanvas unsupported, runs on main thread
// using the legacy path (same draw logic inlined below).
// ─────────────────────────────────────────────────────────────────

let _worker        = null;
let _cardObserver  = null;
let _cardElements  = [];   // parallel array to worker's _cards[]
// Legacy fallback state (used when OffscreenCanvas unsupported)
let _nightAnimFrame = null;
let _nightCardData  = [];
let _nightSkyData   = null;

function _postWorker(type, payload, transfer) {
  if (!_worker) return;
  if (transfer) _worker.postMessage({ type, payload }, transfer);
  else          _worker.postMessage({ type, payload });
}

// ── Night sky ────────────────────────────────────────────────────

function _initNightSky() {
  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  Array.from(bg.querySelectorAll('canvas')).forEach(c => c.remove());

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const vw = window.innerWidth, vh = window.innerHeight;

  // Load cached seed (avoids regenerating on page nav within session)
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

  const canvas = document.createElement('canvas');
  canvas.width = vw; canvas.height = vh;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  bg.appendChild(canvas);

  if (_workerSupported) {
    const offscreen = canvas.transferControlToOffscreen();
    _postWorker('init-sky', {
      canvas: offscreen, vw, vh, isMobile,
      seed, perfMode: !!window.PK_PERF_MODE,
    }, [offscreen]);

    // Worker sends generated seed back so we can cache it
    if (!seed) {
      _worker.addEventListener('message', function onSeed(e) {
        if (e.data.type === 'sky-seed') {
          try { sessionStorage.setItem(storeKey, JSON.stringify(e.data.payload)); } catch(_) {}
          _worker.removeEventListener('message', onSeed);
        }
      });
    }
  } else {
    // Fallback: generate locally and store
    const ctx = canvas.getContext('2d');
    const star   = _genStarsFallback(vw, vh, isMobile);
    const ribbon = _genRibbonsFallback(vw, vh);
    const rays   = _genRaysFallback(vw, vh, isMobile);
    if (!seed) {
      try { sessionStorage.setItem(storeKey, JSON.stringify({star, ribbon, rays})); } catch(_) {}
    }
    _nightSkyData = { ctx, vw, vh,
      star:   seed ? seed.star   : star,
      ribbon: seed ? seed.ribbon : ribbon,
      rays:   seed ? seed.rays   : rays,
    };
  }
}

// ── Night cards ──────────────────────────────────────────────────

function _makeCardCanvas(el, idx) {
  el.querySelector('.pk-cloud-bg')?.remove();
  el.querySelector('.pk-aurora-canvas')?.remove();
  el.style.animation = 'none';

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
    'position:absolute','inset:0','width:100%','height:100%',
    'z-index:0','border-radius:12px','pointer-events:none',
  ].join(';');
  el.style.position = 'relative';
  el.insertBefore(canvas, el.firstChild);

  // Jittered blob positions (same as before — sent to worker)
  const blobs = NIGHT.CARD_BLOBS.map(b => ({
    ...b,
    jx: rnd(-.14,.14), jy: rnd(-.12,.12), jr: rnd(-.12,.12),
  }));

  if (_workerSupported) {
    const offscreen = canvas.transferControlToOffscreen();
    _postWorker('add-card', { canvas: offscreen, w, h, palIdx: idx, blobs }, [offscreen]);
  } else {
    // Fallback — store ctx for legacy loop
    _nightCardData.push({
      el, canvas, ctx: canvas.getContext('2d'),
      pal: [{cols:[[0,255,170],[0,160,255]],ph:0},{cols:[[110,50,255],[0,210,200]],ph:2.2},
            {cols:[[0,200,255],[140,0,255]],ph:4.5},{cols:[[0,255,120],[40,200,255]],ph:1.1},
            {cols:[[200,0,255],[0,210,200]],ph:3.3},{cols:[[150,0,255],[0,180,255]],ph:5.5},
            {cols:[[0,255,170],[0,160,255]],ph:.7}, {cols:[[0,200,255],[100,0,200]],ph:2.8}][idx % 8],
      blobs, w, h, visible: true, lastT: -1,
    });
  }

  return { el, idx };
}

function _initNightCards() {
  if (_cardObserver) { _cardObserver.disconnect(); _cardObserver = null; }
  _cardElements = [];
  _nightCardData = [];

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      let idx = 0;
      document.querySelectorAll('.card, .skills-grid p').forEach(el => {
        const entry = _makeCardCanvas(el, idx);
        _cardElements.push(entry);
        idx++;
      });

      // IntersectionObserver — forwards visibility to worker (or sets flag in fallback)
      _cardObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          const found = _cardElements.find(c => c.el === e.target);
          if (!found) return;
          if (_workerSupported) {
            _postWorker('visibility', { index: found.idx, visible: e.isIntersecting });
          } else {
            const fc = _nightCardData[found.idx];
            if (fc) fc.visible = e.isIntersecting;
          }
        });
      }, { rootMargin: '120px' });

      _cardElements.forEach(c => _cardObserver.observe(c.el));
    });
  });
}

// ── Start / stop ─────────────────────────────────────────────────

function _initNight() {
  // Create worker if not already running
  if (_workerSupported) {
    if (_worker) { _worker.postMessage({ type: 'stop', payload: null }); _worker.terminate(); }
    _worker = new Worker('aurora-worker.js');
  }
  _initNightSky();
  _initNightCards();

  if (_workerSupported) {
    // Give cards two rAF cycles to be created before starting the loop
    requestAnimationFrame(() => requestAnimationFrame(() => {
      _postWorker('start', null);
    }));
  } else {
    requestAnimationFrame(() => requestAnimationFrame(_startFallbackLoop));
  }
}

function _stopNight() {
  if (_workerSupported && _worker) {
    _worker.postMessage({ type: 'stop', payload: null });
    _worker.terminate();
    _worker = null;
  }
  // Fallback cleanup
  if (_nightAnimFrame) { cancelAnimationFrame(_nightAnimFrame); _nightAnimFrame = null; }
  if (_cardObserver)   { _cardObserver.disconnect(); _cardObserver = null; }
  _nightSkyData  = null;
  _nightCardData = [];
  _cardElements  = [];
}

// ─────────────────────────────────────────────────────────────────
// FALLBACK — main-thread drawing (used when OffscreenCanvas absent)
// Minimal version: same visual output, no worker.
// ─────────────────────────────────────────────────────────────────

function _genStarsFallback(vw, vh, isMobile) {
  const count = isMobile ? 200 : 400;
  const stars = Array.from({length:count}, () => ({
    x:rnd(0,vw), y:rnd(0,vh*.9),
    r:Math.random()<.65?.5:Math.random()<.85?.9:1.3,
    base:.15+rnd(0,.4), amp:.10+rnd(0,.35), spd:.25+rnd(0,1.5), off:rnd(0,Math.PI*2),
  }));
  const specials = Array.from({length: isMobile?3:8}, () => ({
    x:rnd(0,vw), y:rnd(0,vh*.75), r:1+rnd(0,.7),
    base:.30, amp:.45, spd:.4+rnd(0,.9), off:rnd(0,Math.PI*2),
    col:Math.random()<.5?[255,230,140]:[160,190,255],
  }));
  return {stars, specials};
}

function _genRaysFallback(vw, vh, isMobile) {
  const n = isMobile ? 30 : 65;
  return Array.from({length:n},(_,i)=>({
    xf:.02+(i/n)*.96, hf:.16+rnd(0,.52), hue:148+(i/n)*140,
    spd:.1+rnd(0,.22), off:rnd(0,Math.PI*2), wob:(rnd(0,1)-.5)*22, w:1.8+rnd(0,2.2),
  }));
}

function _genRibbonsFallback(vw, vh) {
  const hx0=vw*(.04+rnd(0,.12)), hx1=vw*(.72+rnd(0,.26)), hy1=vh*(.62+rnd(0,.22));
  return [{
    hero:true, x0:hx0, y0:vh*.01,
    cx1:hx0+vw*(.12+rnd(0,.12)), cy1:vh*(.22+rnd(0,.18)),
    cx2:hx1-vw*(.18+rnd(0,.10)), cy2:vh*(.38+rnd(0,.18)),
    x1:hx1, y1:hy1, w:vh*(.18+rnd(0,.12)),
    cols:[[0,255,170],[0,190,255]], op:.34, tw:.12, spd:.13+rnd(0,.08), ph:rnd(0,Math.PI*2),
  }];
}

function _drawFallbackSky(d, t) {
  const {ctx,vw,vh,star,ribbon,rays} = d;
  ctx.clearRect(0,0,vw,vh);
  star.stars.forEach(s => {
    const op = Math.max(0, s.base+s.amp*Math.sin(t*s.spd+s.off));
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(210,228,255,${op.toFixed(3)})`; ctx.fill();
  });
  ctx.save(); ctx.globalCompositeOperation='screen';
  rays.forEach(ray => {
    const rx=ray.xf*vw+Math.sin(t*ray.spd+ray.off)*ray.wob;
    const rh=ray.hf*vh, rop=.018+.014*Math.sin(t*1.05+ray.off);
    const g=ctx.createLinearGradient(rx,vh*.01,rx,vh*.01+rh);
    g.addColorStop(0, `hsla(${ray.hue},100%,75%,${(rop*2.8).toFixed(4)})`);
    g.addColorStop(.45,`hsla(${ray.hue},100%,68%,${rop.toFixed(4)})`);
    g.addColorStop(1, `hsla(${ray.hue},100%,65%,0)`);
    ctx.fillStyle=g; ctx.fillRect(rx-ray.w*.5,vh*.01,ray.w,rh);
  });
  ctx.restore();
  // Simplified ribbon for fallback
  ribbon.forEach(rib => {
    const pts=[];
    const wv=Math.sin(t*rib.spd+rib.ph)*vh*.04;
    for(let i=0;i<=14;i++){
      const u=i/14,mt=1-u;
      const x=mt*mt*mt*rib.x0+3*mt*mt*u*rib.cx1+3*mt*u*u*rib.cx2+u*u*u*rib.x1;
      const y=mt*mt*mt*rib.y0+3*mt*mt*u*(rib.cy1+wv)+3*mt*u*u*(rib.cy2+wv)+u*u*u*rib.y1;
      const dx=3*mt*mt*(rib.cx1-rib.x0)+6*mt*u*(rib.cx2-rib.cx1)+3*u*u*(rib.x1-rib.cx2);
      const dy=3*mt*mt*(rib.cy1-rib.y0)+6*mt*u*(rib.cy2-rib.cy1)+3*u*u*(rib.y1-rib.cy2);
      const l=Math.sqrt(dx*dx+dy*dy)||1;
      pts.push({x,y,nx:-dy/l,ny:dx/l});
    }
    const hw=rib.w*.2, op=rib.op+rib.tw*Math.sin(t*.55+rib.ph*2.1);
    ctx.save(); ctx.globalCompositeOperation='screen';
    ctx.beginPath();
    pts.forEach((p,i)=>{ const x=p.x+p.nx*hw,y=p.y+p.ny*hw; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    for(let i=pts.length-1;i>=0;i--) ctx.lineTo(pts[i].x-pts[i].nx*hw,pts[i].y-pts[i].ny*hw);
    ctx.closePath();
    ctx.fillStyle=`rgba(0,220,180,${op.toFixed(3)})`; ctx.fill();
    ctx.restore();
  });
}

const _FALLBACK_CARD_DT = 1/24;
let _fallbackScratch = null, _fallbackScratchCtx = null, _fbSW = 0, _fbSH = 0;

function _drawFallbackCard(d, t) {
  if (!d.visible) return;
  if (d.lastT >= 0 && (t - d.lastT) < _FALLBACK_CARD_DT) return;
  d.lastT = t;
  const {ctx,w,h,pal,blobs} = d;
  if (!_fallbackScratch || _fbSW < w || _fbSH < h) {
    _fbSW=Math.max(_fbSW,w); _fbSH=Math.max(_fbSH,h);
    _fallbackScratch=document.createElement('canvas');
    _fallbackScratch.width=_fbSW; _fallbackScratch.height=_fbSH;
    _fallbackScratchCtx=_fallbackScratch.getContext('2d');
  }
  const sc=_fallbackScratchCtx;
  sc.clearRect(0,0,w,h);
  const [r1,g1,b1]=pal.cols[0],[r2,g2,b2]=pal.cols[1];
  const mx=(Math.sin(t*.17+pal.ph)+1)/2;
  const mr=Math.round(r1+(r2-r1)*mx),mg=Math.round(g1+(g2-g1)*mx),mb=Math.round(b1+(b2-b1)*mx);
  const cs=`${mr},${mg},${mb}`;
  blobs.forEach(b=>{
    const cx=(b.cx+b.jx)*w,cy=(b.cy+b.jy)*h,rx=(b.rx+b.jr)*w,ry=(b.ry+b.jr*.8)*h,r=Math.max(rx,ry);
    const tw=.22+.08*Math.sin(t*.45+pal.ph+b.jx*8);
    [[1,.85],[1.6,.40]].forEach(([ws,os])=>{
      sc.save(); sc.translate(cx,cy); sc.scale(rx/(r*ws),ry/(r*ws)); sc.translate(-cx,-cy);
      const g=sc.createRadialGradient(cx,cy,0,cx,cy,r*ws);
      g.addColorStop(0,`rgba(${cs},${(tw*os).toFixed(3)})`);
      g.addColorStop(.55,`rgba(${cs},${(tw*os*.5).toFixed(3)})`);
      g.addColorStop(1,'rgba(0,0,0,0)');
      sc.beginPath(); sc.arc(cx,cy,r*ws,0,Math.PI*2); sc.fillStyle=g; sc.fill();
      sc.restore();
    });
  });
  sc.globalCompositeOperation='destination-over';
  sc.fillStyle='rgba(4,8,22,0.82)'; sc.fillRect(0,0,w,h);
  sc.globalCompositeOperation='source-over';
  sc.strokeStyle=`rgba(${cs},0.22)`; sc.lineWidth=1; sc.strokeRect(.5,.5,w-1,h-1);
  ctx.clearRect(0,0,w,h); ctx.drawImage(_fallbackScratch,0,0,w,h,0,0,w,h);
}

function _startFallbackLoop() {
  function loop(ts) {
    const t = ts / 1000;
    if (_nightSkyData) _drawFallbackSky(_nightSkyData, t);
    _nightCardData.forEach(d => _drawFallbackCard(d, t));
    _nightAnimFrame = requestAnimationFrame(loop);
  }
  _nightAnimFrame = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────

function _cleanup() {
  _stopNight();
  document.querySelectorAll('.card, .skills-grid p').forEach(el => {
    el.querySelector('.pk-cloud-bg')?.remove();
    el.querySelector('.pk-aurora-canvas')?.remove();
    el.style.animation = '';
  });
  const bg = document.getElementById('sky-bg');
  if (bg) Array.from(bg.querySelectorAll('canvas')).forEach(c => c.remove());
  _fallbackScratch = null; _fallbackScratchCtx = null; _fbSW = 0; _fbSH = 0;
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────

window.reinitEffects = function(themeKey) {
  _cleanup();
  if (themeKey === 'night') {
    _initNight();
  } else {
    _initDaySky();
    _initDayCards();
  }
};

// Forward perf-mode changes to the worker
window.addEventListener('pk-perf-changed', e => {
  if (_workerSupported && _worker) {
    _postWorker('perf-mode', { enabled: e.detail });
  }
});

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

function _init() {
  const theme = document.documentElement.dataset.theme || 'day';
  if (theme === 'night') {
    _initNight();
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
