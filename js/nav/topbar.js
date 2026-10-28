/** Adds `.scrolled` to the topbar (blurred background + border) once the page leaves the top. */
const SCROLL_THRESHOLD_PX = 8;

export function initTopbarScrollState() {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  const sync = () => topbar.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD_PX);
  window.addEventListener('scroll', sync, { passive: true });
  sync();
}
