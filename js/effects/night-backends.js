/**
 * Night rendering backends. Both expose the same interface so night.js never
 * cares where pixels are produced:
 *
 *   initSky(canvas, { vw, vh, isMobile, seed, perfMode, reducedMotion }, onSeed)
 *   addCard(canvas, { w, h, palIdx, blobs })
 *   setCardVisible(index, visible)
 *   setPerfMode(enabled)
 *   start()
 *   dispose()
 *
 * Worker backend      — canvases are transferred to night-worker.js (off-thread).
 * Main-thread backend — the very same NightRenderer runs on the UI thread, used
 *                       when Worker / OffscreenCanvas / module workers are missing.
 */
import { NightRenderer } from '../night/renderer.js';

// ── Capability detection ────────────────────────────────────────────────────
/** True if `new Worker(url, { type: 'module' })` is honoured (Chrome 80+, Safari 15+, Firefox 114+). */
function supportsModuleWorkers() {
  let read = false;
  try {
    const probe = new Worker('data:text/javascript,', { get type() { read = true; return 'module'; } });
    probe.terminate();
  } catch (_) { return false; }
  return read;
}

/** Offscreen rendering needs Worker + transferable canvas + a working OffscreenCanvas 2D context. */
export const workerBackendSupported = (() => {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return false;
  if (typeof HTMLCanvasElement === 'undefined' ||
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== 'function') return false;
  try { if (!new OffscreenCanvas(1, 1).getContext('2d')) return false; } catch (_) { return false; }
  return supportsModuleWorkers();
})();

// ── Worker backend ──────────────────────────────────────────────────────────
function createWorkerBackend() {
  const worker = new Worker(new URL('../night/night-worker.js', import.meta.url), { type: 'module' });
  const post = (type, payload, transfer = []) => worker.postMessage({ type, payload }, transfer);

  return {
    initSky(canvas, options, onSeed) {
      const offscreen = canvas.transferControlToOffscreen();
      if (!options.seed) {
        // The worker generates the sky and sends it back once so we can cache it.
        worker.addEventListener('message', function onMessage(e) {
          if (e.data.type !== 'sky-seed') return;
          onSeed(e.data.payload);
          worker.removeEventListener('message', onMessage);
        });
      }
      post('init-sky', { canvas: offscreen, ...options }, [offscreen]);
    },
    addCard(canvas, options) {
      const offscreen = canvas.transferControlToOffscreen();
      post('add-card', { canvas: offscreen, ...options }, [offscreen]);
    },
    setCardVisible: (index, visible) => post('visibility', { index, visible }),
    setPerfMode:    (enabled) => post('perf-mode', { enabled }),
    start:          () => post('start', null),
    dispose:        () => worker.terminate(),
  };
}

// ── Main-thread backend ─────────────────────────────────────────────────────
function createMainThreadBackend({ perfMode }) {
  const renderer = new NightRenderer({
    perfMode,
    createScratch: (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }),
  });
  let reducedMotion = false;
  let frame = null;

  return {
    initSky(canvas, { reducedMotion: reduced, ...options }, onSeed) {
      reducedMotion = reduced;
      const generated = renderer.initSky({ ctx: canvas.getContext('2d'), ...options });
      if (generated) onSeed(generated);
    },
    addCard: (canvas, options) => renderer.addCard({ ctx: canvas.getContext('2d'), ...options }),
    setCardVisible: (index, visible) => renderer.setCardVisible(index, visible),
    setPerfMode: (enabled) => renderer.setPerfMode(enabled),
    start() {
      if (reducedMotion) { renderer.render(0); return; }      // one still frame
      const tick = (ms) => { renderer.render(ms / 1000); frame = requestAnimationFrame(tick); };
      frame = requestAnimationFrame(tick);
    },
    dispose() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      renderer.dispose();
    },
  };
}

export function createNightBackend({ perfMode }) {
  return workerBackendSupported ? createWorkerBackend() : createMainThreadBackend({ perfMode });
}
