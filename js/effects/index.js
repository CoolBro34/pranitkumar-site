/**
 * Visual-effects orchestrator: picks day or night effects for the active
 * theme and rebuilds them when the theme, motion preference or performance
 * mode changes. Only the decorative layer is rebuilt — page content is never
 * re-rendered.
 */
import { onMotionPreferenceChange } from '../core/motion.js';
import { startDay, stopDay } from './day.js';
import { startNight, stopNight, setNightPerfMode } from './night.js';
import { clearAllCardDecor } from './card-decor.js';

function teardown() {
  stopNight();
  stopDay();
  clearAllCardDecor();
  document.getElementById('sky-bg')?.querySelectorAll('canvas').forEach((c) => c.remove());
}

function build(themeKey) {
  if (themeKey === 'night') startNight();
  else startDay();
}

/** Rebuild effects for `themeKey` ('day' | 'night'). */
export function reinitEffects(themeKey) {
  teardown();
  build(themeKey);
}

const currentTheme = () => document.documentElement.dataset.theme || 'day';

export function initEffects() {
  build(currentTheme());

  // The theme controller announces every theme application.
  window.addEventListener('pk-theme-applied', (e) => reinitEffects(e.detail.name));
  // Performance mode only tweaks the running renderer — no rebuild needed.
  window.addEventListener('pk-perf-changed', (e) => setNightPerfMode(e.detail));
  // Flip between animated and still rendering when the OS setting changes.
  onMotionPreferenceChange(() => reinitEffects(currentTheme()));
}
