/**
 * DAY theme effects
 *   1. A static canvas of soft white clouds across the sky (layout cached per tab).
 *   2. A blurred, gently floating cloud behind every card.
 */
import { rnd } from '../core/random.js';
import { afterFrames, CARD_SELECTOR } from '../core/dom.js';
import { seedSlot } from '../core/session-seed.js';
import { liftCardContent } from './card-decor.js';

// ── Config ──────────────────────────────────────────────────────────────────
const CARD_CLOUD = {
  BLEED_X: 36, BLEED_Y: 28,          // how far the cloud extends beyond the card (px)
  FLOAT_DURATION: [4.5, 7.2],        // seconds
  FLOAT_DELAY: [0, 2.8],
  /** Normalised ellipses composing one cloud. */
  BLOBS: [
    { cx: .50, cy: .52, rx: .42, ry: .34 }, { cx: .20, cy: .28, rx: .24, ry: .26 },
    { cx: .78, cy: .24, rx: .22, ry: .24 }, { cx: .50, cy: .18, rx: .20, ry: .22 },
    { cx: .25, cy: .68, rx: .20, ry: .20 }, { cx: .74, cy: .70, rx: .18, ry: .18 },
  ],
};

const SKY_CLOUD = {
  COUNT: 7, COLUMNS: 3,
  MIN_W: 240, MAX_W: 540,
  OPACITY: [0.35, 0.60],
  BLOBS: [
    { cx: .50, cy: .52, rx: .45, ry: .38 }, { cx: .18, cy: .38, rx: .28, ry: .30 },
    { cx: .80, cy: .34, rx: .26, ry: .28 }, { cx: .50, cy: .22, rx: .22, ry: .26 },
    { cx: .30, cy: .68, rx: .20, ry: .22 }, { cx: .68, cy: .70, rx: .19, ry: .20 },
  ],
};

let cancelPendingCards = null;

// ── Sky clouds ──────────────────────────────────────────────────────────────
/** Lay clouds out on a loose 3-column grid with random jitter (positions are 0–1 fractions of the viewport). */
function generateSkyClouds() {
  const rows = Math.ceil(SKY_CLOUD.COUNT / SKY_CLOUD.COLUMNS);
  const clamp01 = (v) => Math.min(.92, Math.max(.05, v));
  return Array.from({ length: SKY_CLOUD.COUNT }, (_, i) => {
    const col = i % SKY_CLOUD.COLUMNS, row = Math.floor(i / SKY_CLOUD.COLUMNS);
    const w = rnd(SKY_CLOUD.MIN_W, SKY_CLOUD.MAX_W);
    return {
      w,
      h: w * rnd(.38, .58),
      op: rnd(...SKY_CLOUD.OPACITY),
      x: clamp01(((col / SKY_CLOUD.COLUMNS) * 100 + (1 / SKY_CLOUD.COLUMNS) * 50 + rnd(-12, 12)) / 100),
      y: clamp01(((row / rows) * 100 + (1 / rows) * 50 + rnd(-10, 10)) / 100),
      blobs: SKY_CLOUD.BLOBS.map(() => ({ jx: rnd(-.07, .07), jy: rnd(-.06, .06), jr: rnd(-.06, .08) })),
    };
  });
}

/** Paint one cloud: several radial-gradient ellipses that fade to transparent at the edge. */
function paintCloud(ctx, cloud, vw, vh) {
  const originX = cloud.x * vw, originY = cloud.y * vh;
  SKY_CLOUD.BLOBS.forEach((b, i) => {
    const j = cloud.blobs[i];
    const cx = originX + (b.cx - .5 + j.jx) * cloud.w, cy = originY + (b.cy - .5 + j.jy) * cloud.h;
    const rx = (b.rx + j.jr) * cloud.w,               ry = (b.ry + j.jr * .8) * cloud.h;
    const r = Math.max(rx, ry);

    ctx.save();
    ctx.translate(cx, cy); ctx.scale(rx / r, ry / r); ctx.translate(-cx, -cy);   // circle → ellipse
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,   `rgba(255,255,255,${cloud.op.toFixed(2)})`);
    g.addColorStop(.45, `rgba(255,255,255,${(cloud.op * .75).toFixed(2)})`);
    g.addColorStop(.8,  `rgba(255,255,255,${(cloud.op * .25).toFixed(2)})`);
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  });
}

function mountSky() {
  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  bg.querySelectorAll('canvas').forEach((c) => c.remove());

  const slot = seedSlot('sky');
  let clouds = slot.read();
  if (!clouds) { clouds = generateSkyClouds(); slot.write(clouds); }

  const vw = window.innerWidth, vh = window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.className = 'pk-sky-canvas';
  canvas.width = vw; canvas.height = vh;
  const ctx = canvas.getContext('2d');
  clouds.forEach((cloud) => paintCloud(ctx, cloud, vw, vh));
  bg.appendChild(canvas);
}

// ── Card clouds ─────────────────────────────────────────────────────────────
function decorateCard(card) {
  card.querySelector('.pk-cloud-bg')?.remove();
  const w = card.offsetWidth, h = card.offsetHeight;
  if (!w || !h) return;                                      // hidden / not laid out

  const { BLEED_X, BLEED_Y } = CARD_CLOUD;
  const bgW = w + BLEED_X * 2, bgH = h + BLEED_Y * 2;

  const cloud = document.createElement('div');
  cloud.className = 'pk-cloud-bg';
  Object.assign(cloud.style, { left: `${-BLEED_X}px`, top: `${-BLEED_Y}px`, width: `${bgW}px`, height: `${bgH}px` });

  for (const b of CARD_CLOUD.BLOBS) {
    const jx = rnd(-.06, .06), jy = rnd(-.05, .05), jr = rnd(-.05, .07);
    const cx = (b.cx + jx) * bgW, cy = (b.cy + jy) * bgH;
    const rx = (b.rx + jr) * bgW, ry = (b.ry + jr * .8) * bgH;
    const blob = document.createElement('div');
    blob.className = 'pk-cloud-blob';
    Object.assign(blob.style, { left: `${cx - rx}px`, top: `${cy - ry}px`, width: `${rx * 2}px`, height: `${ry * 2}px` });
    cloud.appendChild(blob);
  }

  card.insertBefore(cloud, card.firstChild);
  liftCardContent(card);

  // Desynchronised bobbing so neighbouring cards never move in lockstep.
  const duration = rnd(...CARD_CLOUD.FLOAT_DURATION).toFixed(2);
  const delay = rnd(...CARD_CLOUD.FLOAT_DELAY).toFixed(2);
  card.style.animation = `cloudFloat ${duration}s ease-in-out ${delay}s infinite`;
}

function mountCards() {
  // Wait two frames so layout has settled before measuring card sizes.
  cancelPendingCards = afterFrames(2, () => {
    document.querySelectorAll(CARD_SELECTOR).forEach(decorateCard);
  });
}

// ── Public API ──────────────────────────────────────────────────────────────
export function startDay() {
  mountSky();
  mountCards();
}

export function stopDay() {
  cancelPendingCards?.();
  cancelPendingCards = null;
}

