/** 404 page: JS fallback for the <meta http-equiv="refresh"> redirect (same 5 s as the progress bar). */
const REDIRECT_DELAY_MS = 5000;

export function init() {
  window.setTimeout(() => window.location.replace('/'), REDIRECT_DELAY_MS);
}
