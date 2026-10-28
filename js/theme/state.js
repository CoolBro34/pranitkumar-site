/**
 * Shared, mutable UI preferences. Single writer: theme/controller.js.
 *   mode — 'light' | 'dark' | 'auto'  (what the visitor chose)
 *   perf — performance mode on/off    (lighter aurora rendering)
 */
export const themeState = { mode: 'auto', perf: false };
