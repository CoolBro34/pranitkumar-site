/**
 * Night-mode rendering worker (module worker; no DOM access).
 *
 * Message protocol (main thread → worker):
 *   init-sky     { canvas, vw, vh, isMobile, seed, perfMode, reducedMotion }
 *   add-card     { canvas, w, h, palIdx, blobs }
 *   start        —  begin animating (or draw one still frame if reducedMotion)
 *   visibility   { index, visible }   from the main thread's IntersectionObserver
 *   perf-mode    { enabled }
 * Worker → main thread:
 *   sky-seed     <sky data>           sent once when no cached seed was supplied
 *
 * The worker is torn down with Worker#terminate(), so no explicit "stop".
 */
import { NightRenderer } from './renderer.js';
import { NIGHT } from './config.js';

const renderer = new NightRenderer({ createScratch: (w, h) => new OffscreenCanvas(w, h) });

let reducedMotion = false;
let running = false;
let startTime = 0;
let timer = null;

/** setTimeout (not rAF) — workers have no display link; 16 ms ≈ 60 fps without spinning a core. */
function loop() {
  if (!running) return;
  renderer.render((performance.now() - startTime) / 1000);
  timer = setTimeout(loop, NIGHT.LOOP_INTERVAL_MS);
}

function start() {
  if (running) return;
  if (reducedMotion) { renderer.render(0); return; }    // single still frame
  running = true;
  startTime = performance.now();
  timer = setTimeout(loop, 0);                          // first frame immediately
}

const handlers = {
  'init-sky'({ canvas, vw, vh, isMobile, seed, perfMode, reducedMotion: reduced }) {
    renderer.setPerfMode(perfMode);
    reducedMotion = !!reduced;
    const generated = renderer.initSky({ ctx: canvas.getContext('2d'), vw, vh, isMobile, seed });
    if (generated) self.postMessage({ type: 'sky-seed', payload: generated });   // main thread caches it
  },
  'add-card':    (card) => renderer.addCard({ ...card, ctx: card.canvas.getContext('2d') }),
  'start':       start,
  'visibility':  ({ index, visible }) => renderer.setCardVisible(index, visible),
  'perf-mode':   ({ enabled }) => renderer.setPerfMode(enabled),
};

self.onmessage = ({ data: { type, payload } }) => handlers[type]?.(payload);
