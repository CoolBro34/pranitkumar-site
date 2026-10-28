/** Reduced-motion preference (live) plus a change subscription. */
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = () => query.matches;

export function onMotionPreferenceChange(handler) {
  // Safari < 14 only implements the deprecated addListener().
  if (typeof query.addEventListener === 'function') query.addEventListener('change', handler);
  else if (typeof query.addListener === 'function') query.addListener(handler);
}
