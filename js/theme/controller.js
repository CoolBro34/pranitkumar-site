/**
 * Theme controller — owns *state transitions* (no DOM construction; see ui.js).
 *
 * Events emitted on `window` (the public contract other modules rely on):
 *   pk-theme-applied  detail: { name: 'day' | 'night' }   after data-theme changes
 *   pk-perf-changed   detail: boolean                      after performance mode toggles
 */
import { local } from '../core/storage.js';
import { themeState } from './state.js';
import { STORAGE_KEY, savedMode, resolveThemeKey } from './kernel.js';

const PERF_STORAGE_KEY = 'pk-perf-mode';
const AUTO_RECHECK_MS = 60_000;            // follow sunrise/sunset while the tab stays open

// Black-flash timings: fade in → swap theme → fade out → release lock.
const FADE_MS = 280, HOLD_MS = 80, LOCK_TAIL_MS = 400;

let switchLock = false;

export function applyTheme(key) {
  if (key !== 'day' && key !== 'night') return;
  document.documentElement.dataset.theme = key;
  window.dispatchEvent(new CustomEvent('pk-theme-applied', { detail: { name: key } }));
}

/**
 * Persist `mode` and transition to its theme behind a black flash that hides
 * the canvas rebuild. Ignored while a previous transition is in flight.
 * @param {'light'|'dark'|'auto'} mode
 */
export function switchTheme(mode) {
  if (switchLock) return;
  switchLock = true;
  local.set(STORAGE_KEY, mode);
  themeState.mode = mode;

  const overlay = document.getElementById('theme-transition-overlay');
  const setOverlay = (visible) => {
    if (!overlay) return;
    overlay.style.opacity = visible ? '1' : '0';
    overlay.style.pointerEvents = visible ? 'all' : 'none';
  };

  setOverlay(true);
  setTimeout(() => {
    applyTheme(resolveThemeKey(mode));
    setTimeout(() => {
      setOverlay(false);
      setTimeout(() => { switchLock = false; }, LOCK_TAIL_MS);
    }, HOLD_MS);
  }, FADE_MS);
}

export function setPerfMode(enabled) {
  themeState.perf = !!enabled;
  local.set(PERF_STORAGE_KEY, themeState.perf ? '1' : '0');
  window.dispatchEvent(new CustomEvent('pk-perf-changed', { detail: themeState.perf }));
}

/** Load saved preferences and start the auto-mode watcher. */
export function initThemeController() {
  themeState.mode = savedMode || 'auto';
  themeState.perf = local.get(PERF_STORAGE_KEY) === '1';

  setInterval(() => {
    if (themeState.mode !== 'auto') return;
    if (resolveThemeKey('auto') !== document.documentElement.dataset.theme) switchTheme('auto');
  }, AUTO_RECHECK_MS);

  return { isFirstVisit: !savedMode };
}
