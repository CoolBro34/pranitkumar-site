/**
 * Mobile full-screen menu.
 *
 * The overlay's links are generated from the desktop `.site-nav` (+ Contact),
 * so there is one list to maintain per page. Each link gets --i (index) and the
 * <nav> gets --n (count); nav.css turns those into the staggered animation.
 * Pages without a hamburger (404) are skipped.
 */
const CLOSE_ANIMATION_MS = 250;               // keep in sync with overlayOut in nav.css

function buildLinks(overlay) {
  const nav = overlay.querySelector('nav');
  const contact = document.querySelector('.contact-rail');
  const sources = [...document.querySelectorAll('.site-nav a'), ...(contact ? [contact] : [])];

  const links = sources.map((source, i) => {
    const a = document.createElement('a');
    a.href = source.getAttribute('href');
    a.textContent = source.textContent.trim();            // "Contact ↗" keeps its arrow
    a.style.setProperty('--i', i);
    return a;
  });
  nav.style.setProperty('--n', links.length);
  nav.replaceChildren(...links);
  return links;
}

export function initMobileMenu() {
  const hamburger = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (!hamburger || !overlay) return;

  const links = buildLinks(overlay);
  let closeTimer = null;
  const isOpen = () => overlay.classList.contains('open');

  function open() {
    clearTimeout(closeTimer);
    overlay.classList.remove('closing');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));   // next frame so the animation starts from 0
    overlay.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';                      // lock page scroll behind the menu
  }

  function close() {
    clearTimeout(closeTimer);
    overlay.classList.add('closing');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    closeTimer = setTimeout(() => {
      overlay.classList.remove('closing');
      overlay.style.display = 'none';
    }, CLOSE_ANIMATION_MS);
  }

  hamburger.addEventListener('click', () => (isOpen() ? close() : open()));
  links.forEach((link) => link.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });

  // Anchor jumps inside the page must never leave scrolling locked.
  window.addEventListener('hashchange', () => { document.body.style.overflow = ''; });
}
