// aurora-worker.js
// Runs entirely off the main thread. Owns all night-mode drawing.
// Receives OffscreenCanvas handles for sky + each card via postMessage.
// Drives its own animation loop — zero main-thread cost during animation.

'use strict';

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────

let _skyCtx    = null;
let _skyW = 0, _skyH = 0;
let _skyData   = null;   // { star, ribbon, rays }

let _cards     = [];     // [{ ctx, w, h, pal, blobs, lastT, visible }]
let _perfMode  = false;
let _loopId    = null;
let _running   = false;
let _startTime = null;

// Shared offscreen scratch used for card draws (avoids per-card GPU flush)
let _scratch   = null;
let _scratchCtx= null;
let _scratchW  = 0, _scratchH = 0;

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

function rnd(a, b) { return a + Math.random() * (b - a); }

function _ensureScratch(w, h) {
  if (_scratch && _scratchW >= w && _scratchH >= h) return;
  _scratchW = Math.max(_scratchW, w);
  _scratchH = Math.max(_scratchH, h);
  _scratch    = new OffscreenCanvas(_scratchW, _scratchH);
  _scratchCtx = _scratch.getContext('2d');
}

// ─────────────────────────────────────────────────────────────────
// NIGHT CONFIG (must mirror clouds.js NIGHT constants)
// ─────────────────────────────────────────────────────────────────

const NIGHT = {
  STAR_COUNT          : 400,
  STAR_SPECIALS       :   20,
  RIBBON_ACCENT_COUNT :   2,
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
// DATA GENERATORS (same logic as clouds.js)
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
  }));
}

function _genRibbons(vw, vh) {
  const ribbons = [];
  const COLORS = [
    [[0,255,165],[0,200,255]],[[90,50,255],[200,0,255]],
    [[0,235,210],[0,160,255]],[[255,80,200],[100,0,255]],
    [[0,210,120],[40,255,200]],[[180,0,255],[0,150,255]],
  ];
  const rc = () => COLORS[Math.floor(Math.random()*COLORS.length)];
  const hx0 = vw*(.04+rnd(0,.12)), hx1 = vw*(.72+rnd(0,.26)), hy1 = vh*(.62+rnd(0,.22));
  ribbons.push({
    hero:true, x0:hx0, y0:vh*.01,
    cx1:hx0+vw*(.12+rnd(0,.12)), cy1:vh*(.22+rnd(0,.18)),
    cx2:hx1-vw*(.18+rnd(0,.10)), cy2:vh*(.38+rnd(0,.18)),
    x1:hx1, y1:hy1, w:vh*(.18+rnd(0,.12)),
    cols:[[0,255,170],[0,190,255]],
    op:.34, tw:.12, spd:.13+rnd(0,.08), ph:rnd(0,Math.PI*2),
  });
  for (let i = 0; i < NIGHT.RIBBON_ACCENT_COUNT; i++) {
    const ax0=vw*(.08+rnd(0,.35)), ax1=vw*(.45+rnd(0,.50)), ay1=vh*(.38+rnd(0,.32));
    ribbons.push({
      hero:false, x0:ax0, y0:vh*(.02+rnd(0,.08)),
      cx1:ax0+vw*(.08+rnd(0,.14)), cy1:vh*(.14+rnd(0,.18)),
      cx2:ax1-vw*(.12+rnd(0,.10)), cy2:vh*(.26+rnd(0,.16)),
      x1:ax1, y1:ay1, w:vh*(.06+rnd(0,.06)),
      cols:rc(), op:.15+rnd(0,.12), tw:.05+rnd(0,.07),
      spd:.11+rnd(0,.14), ph:rnd(0,Math.PI*2),
    });
  }
  return ribbons;
}

// ─────────────────────────────────────────────────────────────────
// DRAW — SKY
// ─────────────────────────────────────────────────────────────────

function _bezierPts(rib, t, vh) {
  const wv  = Math.sin(t*rib.spd+rib.ph)*vh*.04;
  const wv2 = Math.sin(t*rib.spd*.72+rib.ph+1.1)*vh*.025;
  const pts = [];
  const segs = _perfMode ? 10 : 28;
  for (let i = 0; i <= segs; i++) {
    const u=i/segs, mt=1-u;
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
  const passes = _perfMode
    ? [[.40,1.00],[.95,.32],[1.90,.09]]
    : [[.40,1.00],[.65,.58],[.95,.32],[1.35,.17],[1.90,.09],[2.70,.046],[3.90,.022],[5.50,.010],[8.0,.004]];

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

function _drawSky(t) {
  if (!_skyCtx || !_skyData) return;
  const ctx=_skyCtx, vw=_skyW, vh=_skyH;
  const {star, ribbon, rays} = _skyData;
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
  if (!_perfMode) { ctx.save(); ctx.globalCompositeOperation='screen'; }
  else ctx.save();
  rays.forEach(ray => {
    const rx = ray.xf*vw + Math.sin(t*ray.spd+ray.off)*ray.wob;
    const rh = ray.hf*vh, ry = vh*.01;
    const rop = .018 + .014*Math.sin(t*1.05+ray.off);
    const g = ctx.createLinearGradient(rx,ry,rx,ry+rh);
    if (_perfMode) {
      g.addColorStop(0,  `hsla(${ray.hue},100%,75%,${(rop*1.0).toFixed(4)})`);
      g.addColorStop(.45,`hsla(${ray.hue},100%,68%,${(rop*0.4).toFixed(4)})`);
      g.addColorStop(1,  `hsla(${ray.hue},100%,65%,0)`);
    } else {
      g.addColorStop(0,  `hsla(${ray.hue},100%,75%,${(rop*2.8).toFixed(4)})`);
      g.addColorStop(.45,`hsla(${ray.hue},100%,68%,${rop.toFixed(4)})`);
      g.addColorStop(1,  `hsla(${ray.hue},100%,65%,0)`);
    }
    ctx.fillStyle=g; ctx.fillRect(rx-ray.w*.5,ry,ray.w,rh);
  });
  ctx.restore();

  ribbon.forEach(rib => _drawRibbon(ctx, rib, vw, vh, t));

  // Focal glow
  ctx.save(); ctx.globalCompositeOperation='screen';
  const fg = ctx.createRadialGradient(vw*.07,vh*.02,0,vw*.07,vh*.02,vw*.3);
  fg.addColorStop(0,'rgba(160,255,230,0.12)');
  fg.addColorStop(.35,'rgba(60,180,220,0.05)');
  fg.addColorStop(1,'rgba(60,180,220,0)');
  ctx.fillStyle=fg; ctx.fillRect(0,0,vw,vh);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// DRAW — CARDS (via shared scratch OffscreenCanvas)
// ─────────────────────────────────────────────────────────────────

const _CARD_DT = 1 / 24; // 24fps for cards

function _drawCard(card, t) {
  if (!card.visible) return;
  if (card.lastT >= 0 && (t - card.lastT) < _CARD_DT) return;
  card.lastT = t;

  const {ctx, w, h, pal, blobs} = card;
  _ensureScratch(w, h);
  const sc = _scratchCtx;

  sc.clearRect(0, 0, w, h);

  const [r1,g1,b1]=pal.cols[0],[r2,g2,b2]=pal.cols[1];
  const mx=(Math.sin(t*.17+pal.ph)+1)/2;
  const mr=Math.round(r1+(r2-r1)*mx);
  const mg=Math.round(g1+(g2-g1)*mx);
  const mb=Math.round(b1+(b2-b1)*mx);
  const colStr=`${mr},${mg},${mb}`;

  const blobPasses = _perfMode
    ? [[1,.85]]
    : [[1,.85],[1.6,.40],[2.4,.18],[3.8,.07]];

  blobs.forEach(b => {
    const cx=(b.cx+b.jx)*w, cy=(b.cy+b.jy)*h;
    const rx=(b.rx+b.jr)*w, ry=(b.ry+b.jr*.8)*h;
    const r=Math.max(rx,ry);
    const tw=.22+.08*Math.sin(t*.45+pal.ph+b.jx*8);
    blobPasses.forEach(([ws,os])=>{
      sc.save();
      sc.translate(cx,cy); sc.scale(rx/(r*ws),ry/(r*ws)); sc.translate(-cx,-cy);
      const g=sc.createRadialGradient(cx,cy,0,cx,cy,r*ws);
      g.addColorStop(0,  `rgba(${colStr},${(tw*os).toFixed(3)})`);
      g.addColorStop(.55,`rgba(${colStr},${(tw*os*.5).toFixed(3)})`);
      g.addColorStop(1,  'rgba(0,0,0,0)');
      sc.beginPath(); sc.arc(cx,cy,r*ws,0,Math.PI*2);
      sc.fillStyle=g; sc.fill();
      sc.restore();
    });
  });

  sc.globalCompositeOperation='destination-over';
  sc.fillStyle='rgba(4,8,22,0.82)';
  sc.fillRect(0,0,w,h);
  sc.globalCompositeOperation='source-over';

  sc.strokeStyle=`rgba(${colStr},0.22)`;
  sc.lineWidth=1;
  sc.strokeRect(.5,.5,w-1,h-1);

  // Stamp to card's own OffscreenCanvas context
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(_scratch,0,0,w,h,0,0,w,h);
}

// ─────────────────────────────────────────────────────────────────
// ANIMATION LOOP — worker-owned, no rAF (not available in workers)
// Uses MessageChannel for ~60fps high-resolution scheduling
// ─────────────────────────────────────────────────────────────────

let _port = null;

function _loop() {
  if (!_running) return;
  const t = (performance.now() - _startTime) / 1000;
  _drawSky(t);
  _cards.forEach(c => _drawCard(c, t));
  // Re-schedule via port for minimal latency
  _port.postMessage(null);
}

function _startLoop() {
  if (_running) return;
  _running = true;
  _startTime = performance.now();
  // MessageChannel trick: port.onmessage fires as a microtask-adjacent
  // macrotask — much tighter than setTimeout(fn, 0), ~1ms resolution
  const { port1, port2 } = new MessageChannel();
  _port = port1;
  port2.onmessage = _loop;
  port1.postMessage(null); // kick off
}

function _stopLoop() {
  _running = false;
  if (_port) { _port.close(); _port = null; }
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE HANDLER — receives commands from main thread
// ─────────────────────────────────────────────────────────────────

self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {

    // ── Initialize sky canvas ────────────────────────────────────
    case 'init-sky': {
      const { canvas, vw, vh, isMobile, seed, perfMode } = payload;
      _perfMode = perfMode;
      _skyCtx = canvas.getContext('2d');
      _skyW = vw; _skyH = vh;
      if (seed) {
        _skyData = seed;
      } else {
        _skyData = {
          star:   _genStars(vw, vh, isMobile),
          ribbon: _genRibbons(vw, vh),
          rays:   _genRays(vw, vh, isMobile),
        };
        // Send generated data back so main thread can cache it
        self.postMessage({ type: 'sky-seed', payload: _skyData });
      }
      break;
    }

    // ── Add a card canvas ────────────────────────────────────────
    case 'add-card': {
      const { canvas, w, h, palIdx, blobs } = payload;
      _ensureScratch(w, h);
      _cards.push({
        ctx:    canvas.getContext('2d'),
        w, h,
        pal:    NIGHT.CARD_PALETTES[palIdx % NIGHT.CARD_PALETTES.length],
        blobs,
        visible: true,
        lastT:  -1,
      });
      break;
    }

    // ── Start animation ──────────────────────────────────────────
    case 'start':
      _startLoop();
      break;

    // ── Stop and reset ───────────────────────────────────────────
    case 'stop':
      _stopLoop();
      _skyCtx = null; _skyData = null;
      _cards = [];
      _scratch = null; _scratchCtx = null; _scratchW = 0; _scratchH = 0;
      break;

    // ── Visibility update from IntersectionObserver ───────────────
    case 'visibility': {
      const { index, visible } = payload;
      if (_cards[index]) _cards[index].visible = visible;
      break;
    }

    // ── Perf mode toggle ─────────────────────────────────────────
    case 'perf-mode':
      _perfMode = payload.enabled;
      break;
  }
};
