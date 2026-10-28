/**
 * Highlights the current section's link in the desktop nav.
 *   home    → scroll-spy over the in-page sections
 *   gallery → the Gallery link is always active
 */
const TOP_SNAP_PX = 60;                       // within this of the top, About is always active

function initHomeScrollSpy(links) {
  const anchors = links.filter((a) => a.getAttribute('href').startsWith('#'));

  // About points at the zero-height `#top` anchor, but the visible section is `#about`.
  const sectionFor = (href) => document.querySelector(href === '#top' ? '#about' : href);
  const sections = anchors.map((a) => sectionFor(a.getAttribute('href'))).filter(Boolean);

  const setActive = (sectionHref) => {
    const target = sectionHref === '#about' ? '#top' : sectionHref;
    anchors.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === target));
  };

  /** Near the top we force About, whatever the observer last reported. */
  const snapToTop = () => {
    if (window.scrollY >= TOP_SNAP_PX) return false;
    setActive('#top');
    return true;
  };

  // Band from 5% to 50% of the viewport height decides which section is "current".
  const observer = new IntersectionObserver((entries) => {
    if (snapToTop()) return;
    for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
  }, { rootMargin: '-5% 0px -50% 0px', threshold: 0 });
  sections.forEach((s) => observer.observe(s));

  window.addEventListener('scroll', snapToTop, { passive: true });
  snapToTop();
}

export function initActiveNav(page) {
  const links = Array.from(document.querySelectorAll('.site-nav a'));
  if (page === 'home') initHomeScrollSpy(links);
  else if (page === 'gallery') {
    links.filter((a) => a.getAttribute('href') === 'gallery.html').forEach((a) => a.classList.add('active'));
  }
}
