/**
 * NIGHT theme effects: an aurora sky behind the page plus a glowing aurora
 * canvas behind every card. Rendering lives in js/night/ (worker or main
 * thread — see night-backends.js); this module owns the DOM side:
 * creating canvases, measuring cards, and forwarding card visibility.
 */
import { rnd } from '../core/random.js';
import { afterFrames, CARD_SELECTOR, isMobileViewport } from '../core/dom.js';
import { prefersReducedMotion } from '../core/motion.js';
import { seedSlot } from '../core/session-seed.js';
import { NIGHT } from '../night/config.js';
import { themeState } from '../theme/state.js';
import { createNightBackend } from './night-backends.js';
import { liftCardContent, clearCardDecor } from './card-decor.js';

let backend = null;
let observer = null;
let cancelPendingCards = null;

function mountSky() {
  const bg = document.getElementById('sky-bg');
  if (!bg) return;
  bg.querySelectorAll('canvas').forEach((c) => c.remove());

  const isMobile = isMobileViewport();
  const vw = window.innerWidth, vh = window.innerHeight;
  const slot = seedSlot('night');
  const seed = slot.read();

  const canvas = document.createElement('canvas');
  canvas.className = 'pk-sky-canvas';
  canvas.width = vw; canvas.height = vh;
  bg.appendChild(canvas);

  backend.initSky(
    canvas,
    { vw, vh, isMobile, seed, perfMode: themeState.perf, reducedMotion: prefersReducedMotion() },
    (generated) => slot.write(generated),
  );
}

/** Give one card its aurora canvas; returns nothing — registers with the backend. */
function decorateCard(card, index) {
  clearCardDecor(card);
  card.style.animation = 'none';                    // no day-time bobbing at night
  liftCardContent(card);

  const w = card.offsetWidth || 260, h = card.offsetHeight || 100;
  const canvas = document.createElement('canvas');
  canvas.className = 'pk-aurora-canvas';
  canvas.width = w; canvas.height = h;
  card.insertBefore(canvas, card.firstChild);

  // Per-card jitter so no two glows look identical.
  const blobs = NIGHT.CARD_BLOBS.map((b) => ({
    ...b, jx: rnd(-.14, .14), jy: rnd(-.12, .12), jr: rnd(-.12, .12),
  }));
  backend.addCard(canvas, { w, h, palIdx: index, blobs });
}

function mountCards() {
  // Two frames: let layout settle so card sizes are final before we measure.
  cancelPendingCards = afterFrames(2, () => {
    const indexOf = new Map();                       // card element → backend index
    document.querySelectorAll(CARD_SELECTOR).forEach((card, i) => {
      decorateCard(card, i);
      indexOf.set(card, i);
    });

    // Only animate cards that are (nearly) on screen.
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const index = indexOf.get(entry.target);
        if (index !== undefined) backend.setCardVisible(index, entry.isIntersecting);
      }
    }, { rootMargin: '120px' });
    indexOf.forEach((_, card) => observer.observe(card));

    backend.start();
  });
}

export function startNight() {
  backend = createNightBackend({ perfMode: themeState.perf });
  mountSky();
  mountCards();
}

export function stopNight() {
  cancelPendingCards?.(); cancelPendingCards = null;
  observer?.disconnect(); observer = null;
  backend?.dispose();     backend = null;
}

export function setNightPerfMode(enabled) {
  backend?.setPerfMode(enabled);
}
