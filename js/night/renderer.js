/**
 * Night-sky renderer — pure canvas-2D drawing with no DOM access.
 *
 * The same class runs inside the Web Worker (OffscreenCanvas contexts) and, as
 * a fallback, on the main thread (regular canvas contexts); both expose the
 * identical 2D API, so visual output is the same everywhere.
 *
 * Owns: the sky (stars, rays, ribbons, glow) and a list of "cards" (glowing
 * blobs behind page cards). Callers own scheduling — they call render(t).
 */
import { NIGHT } from './config.js';
import { generateSky } from './generators.js';

const TAU = Math.PI * 2;

// ── Quality presets (performance mode trades layers for frame time) ─────────
/** [widthScale, opacityScale] per ribbon glow pass. */
const RIBBON_PASSES = {
  full: [[.40, 1.00], [.65, .58], [.95, .32], [1.35, .17], [1.90, .09], [2.70, .046], [3.90, .022], [5.50, .010], [8.0, .004]],
  perf: [[.40, 1.00], [.95, .32], [1.90, .09]],
};
/** [radiusScale, opacityScale] per card-blob pass. */
const BLOB_PASSES = {
  full: [[1, .85], [1.6, .40], [2.4, .18], [3.8, .07]],
  perf: [[1, .85]],
};
const RIBBON_SEGMENTS = { full: 28, perf: 10 };

const lerpColor = ([r1, g1, b1], [r2, g2, b2], k) =>
  `${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)}`;

// ── Ribbon geometry ─────────────────────────────────────────────────────────
/** Sample a wavering cubic Bézier into points with unit normals. */
function sampleRibbon(rib, t, vh, segments) {
  const wv  = Math.sin(t * rib.spd + rib.ph) * vh * .04;
  const wv2 = Math.sin(t * rib.spd * .72 + rib.ph + 1.1) * vh * .025;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, mt = 1 - u;
    const x = mt*mt*mt*rib.x0 + 3*mt*mt*u*rib.cx1 + 3*mt*u*u*rib.cx2 + u*u*u*rib.x1;
    const y = mt*mt*mt*rib.y0 + 3*mt*mt*u*(rib.cy1 + wv) + 3*mt*u*u*(rib.cy2 + wv2) + u*u*u*rib.y1;
    const dx = 3*mt*mt*(rib.cx1 - rib.x0) + 6*mt*u*(rib.cx2 - rib.cx1) + 3*u*u*(rib.x1 - rib.cx2);
    const dy = 3*mt*mt*(rib.cy1 + wv - rib.y0) + 6*mt*u*(rib.cy2 + wv2 - rib.cy1 - wv) + 3*u*u*(rib.y1 - rib.cy2 - wv2);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    pts.push({ x, y, nx: -dy / len, ny: dx / len });
  }
  return pts;
}

function drawRibbon(ctx, rib, t, vh, quality) {
  const pts = sampleRibbon(rib, t, vh, RIBBON_SEGMENTS[quality]);
  const col = lerpColor(rib.cols[0], rib.cols[1], (Math.sin(t * .13 + rib.ph) + 1) / 2);
  const opacity = rib.op + rib.tw * Math.sin(t * .55 + rib.ph * 2.1);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [widthScale, opacityScale] of RIBBON_PASSES[quality]) {
    const halfW = rib.w * widthScale * .5;
    const a = opacity * opacityScale;

    // Offset the centre line ± along the normal to form a closed band.
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x + p.nx * halfW, y = p.y + p.ny * halfW;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x - pts[i].nx * halfW, pts[i].y - pts[i].ny * halfW);
    ctx.closePath();

    const g = ctx.createLinearGradient(rib.x0, rib.y0, rib.x1, rib.y1);
    g.addColorStop(0,   `rgba(${col},0)`);
    g.addColorStop(.12, `rgba(${col},${a.toFixed(4)})`);
    g.addColorStop(.50, `rgba(${col},${(a * 1.25).toFixed(4)})`);
    g.addColorStop(.88, `rgba(${col},${a.toFixed(4)})`);
    g.addColorStop(1,   `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

// ── Sky layers ──────────────────────────────────────────────────────────────
function drawStars(ctx, { stars, specials }, t) {
  for (const s of stars) {
    const op = Math.max(0, s.base + s.amp * Math.sin(t * s.spd + s.off));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fillStyle = `rgba(210,228,255,${op.toFixed(3)})`; ctx.fill();
  }
  for (const s of specials) {
    const op = Math.max(0, s.base + s.amp * Math.sin(t * s.spd + s.off));
    const [r, g, b] = s.col;
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
    glow.addColorStop(0, `rgba(${r},${g},${b},${op.toFixed(3)})`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, TAU);
    ctx.fillStyle = glow; ctx.fill();
  }
}

function drawRays(ctx, rays, vw, vh, t, quality) {
  const strength = quality === 'perf' ? [1.0, 0.4] : [2.8, 1.0];   // [head, mid] opacity multipliers
  ctx.save();
  if (quality !== 'perf') ctx.globalCompositeOperation = 'screen';
  const top = vh * .01;
  for (const ray of rays) {
    const x = ray.xf * vw + Math.sin(t * ray.spd + ray.off) * ray.wob;
    const h = ray.hf * vh;
    const op = .018 + .014 * Math.sin(t * 1.05 + ray.off);
    const g = ctx.createLinearGradient(x, top, x, top + h);
    g.addColorStop(0,   `hsla(${ray.hue},100%,75%,${(op * strength[0]).toFixed(4)})`);
    g.addColorStop(.45, `hsla(${ray.hue},100%,68%,${(op * strength[1]).toFixed(4)})`);
    g.addColorStop(1,   `hsla(${ray.hue},100%,65%,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - ray.w * .5, top, ray.w, h);
  }
  ctx.restore();
}

function drawFocalGlow(ctx, vw, vh) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(vw * .07, vh * .02, 0, vw * .07, vh * .02, vw * .3);
  g.addColorStop(0,   'rgba(160,255,230,0.12)');
  g.addColorStop(.35, 'rgba(60,180,220,0.05)');
  g.addColorStop(1,   'rgba(60,180,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
  ctx.restore();
}

export class NightRenderer {
  /**
   * @param {object}   opts
   * @param {(w:number,h:number)=>OffscreenCanvas|HTMLCanvasElement} opts.createScratch
   *        Factory for the shared off-screen buffer (OffscreenCanvas in the
   *        worker, a detached <canvas> on the main thread).
   * @param {boolean} [opts.perfMode]
   */
  constructor({ createScratch, perfMode = false }) {
    this.createScratch = createScratch;
    this.perfMode = perfMode;
    this.sky = null;        // { ctx, vw, vh, data }
    this.cards = [];        // [{ ctx, w, h, pal, blobs, visible, lastT }]
    this.scratch = null; this.scratchCtx = null; this.scratchW = 0; this.scratchH = 0;
  }

  get quality() { return this.perfMode ? 'perf' : 'full'; }
  setPerfMode(enabled) { this.perfMode = !!enabled; }

  /**
   * Attach the sky canvas. Uses `seed` when given, otherwise generates a fresh
   * sky; returns the generated data (so callers can cache it) or null.
   */
  initSky({ ctx, vw, vh, isMobile, seed }) {
    const data = seed || generateSky(vw, vh, isMobile);
    this.sky = { ctx, vw, vh, data };
    return seed ? null : data;
  }

  addCard({ ctx, w, h, palIdx, blobs }) {
    this.#ensureScratch(w, h);
    this.cards.push({
      ctx, w, h, blobs,
      pal: NIGHT.CARD_PALETTES[palIdx % NIGHT.CARD_PALETTES.length],
      visible: true, lastT: -1,
    });
  }

  setCardVisible(index, visible) {
    if (this.cards[index]) this.cards[index].visible = visible;
  }

  /** Draw one frame of everything at time `t` (seconds). */
  render(t) {
    this.#drawSky(t);
    for (const card of this.cards) this.#drawCard(card, t);
  }

  dispose() {
    this.sky = null; this.cards = [];
    this.scratch = null; this.scratchCtx = null; this.scratchW = 0; this.scratchH = 0;
  }

  // ── internals ─────────────────────────────────────────────────────────────
  #ensureScratch(w, h) {
    if (this.scratch && this.scratchW >= w && this.scratchH >= h) return;
    this.scratchW = Math.max(this.scratchW, w);
    this.scratchH = Math.max(this.scratchH, h);
    this.scratch = this.createScratch(this.scratchW, this.scratchH);
    this.scratchCtx = this.scratch.getContext('2d');
  }

  #drawSky(t) {
    if (!this.sky) return;
    const { ctx, vw, vh, data } = this.sky;
    ctx.clearRect(0, 0, vw, vh);
    drawStars(ctx, data.star, t);
    drawRays(ctx, data.rays, vw, vh, t, this.quality);
    for (const rib of data.ribbon) drawRibbon(ctx, rib, t, vh, this.quality);
    drawFocalGlow(ctx, vw, vh);
  }

  /**
   * Cards are composed in the shared scratch buffer and then stamped onto the
   * card's own canvas — one buffer for all cards avoids per-card GPU flushes.
   */
  #drawCard(card, t) {
    if (!card.visible) return;
    if (card.lastT >= 0 && t - card.lastT < NIGHT.CARD_FRAME_INTERVAL) return;   // 24 fps cap
    card.lastT = t;

    const { ctx, w, h, pal, blobs } = card;
    this.#ensureScratch(w, h);
    const sc = this.scratchCtx;
    sc.clearRect(0, 0, w, h);

    const col = lerpColor(pal.cols[0], pal.cols[1], (Math.sin(t * .17 + pal.ph) + 1) / 2);

    for (const b of blobs) {
      const cx = (b.cx + b.jx) * w, cy = (b.cy + b.jy) * h;
      const rx = (b.rx + b.jr) * w, ry = (b.ry + b.jr * .8) * h;
      const r = Math.max(rx, ry);
      const twinkle = .22 + .08 * Math.sin(t * .45 + pal.ph + b.jx * 8);
      for (const [radiusScale, opacityScale] of BLOB_PASSES[this.quality]) {
        // Draw a circular gradient, squashed into the blob's ellipse.
        sc.save();
        sc.translate(cx, cy); sc.scale(rx / (r * radiusScale), ry / (r * radiusScale)); sc.translate(-cx, -cy);
        const g = sc.createRadialGradient(cx, cy, 0, cx, cy, r * radiusScale);
        g.addColorStop(0,   `rgba(${col},${(twinkle * opacityScale).toFixed(3)})`);
        g.addColorStop(.55, `rgba(${col},${(twinkle * opacityScale * .5).toFixed(3)})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        sc.beginPath(); sc.arc(cx, cy, r * radiusScale, 0, TAU);
        sc.fillStyle = g; sc.fill();
        sc.restore();
      }
    }

    // Dark glass base *behind* the glow, then a 1px tinted border on top.
    sc.globalCompositeOperation = 'destination-over';
    sc.fillStyle = 'rgba(4,8,22,0.82)';
    sc.fillRect(0, 0, w, h);
    sc.globalCompositeOperation = 'source-over';
    sc.strokeStyle = `rgba(${col},0.22)`;
    sc.lineWidth = 1;
    sc.strokeRect(.5, .5, w - 1, h - 1);

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.scratch, 0, 0, w, h, 0, 0, w, h);
  }
}
