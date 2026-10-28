/** Small DOM helpers shared across modules. */

/** Elements that receive a decorative cloud (day) / aurora (night) background. */
export const CARD_SELECTOR = '.card, .skills-grid p';

export const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;

/**
 * Run `fn` after `frames` animation frames. Two frames guarantees layout has
 * settled, so offsetWidth/offsetHeight reads are final. Returns a cancel fn.
 */
export function afterFrames(frames, fn) {
  let id = 0, cancelled = false;
  const tick = (left) => {
    id = requestAnimationFrame(() => {
      if (cancelled) return;
      if (left > 1) tick(left - 1); else fn();
    });
  };
  tick(frames);
  return () => { cancelled = true; cancelAnimationFrame(id); };
}

/** True when the current navigation is a page reload (not a link/back-forward). */
export const isReloadNavigation = () =>
  performance.getEntriesByType('navigation')[0]?.type === 'reload';
