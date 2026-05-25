const body = document.body;
const topbar = document.getElementById('topbar');
const navLinks = Array.from(document.querySelectorAll('.site-nav a'));

const syncBar = () => {
  if (!topbar) return;
  topbar.classList.toggle('scrolled', window.scrollY > 8);
};
window.addEventListener('scroll', syncBar);
syncBar();

if (body.dataset.page === 'home') {
  const anchors = navLinks.filter((link) => link.getAttribute('href').startsWith('#'));
  const sections = anchors.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        anchors.forEach((a) => {
          a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-35% 0px -50% 0px', threshold: 0 });

  sections.forEach((section) => observer.observe(section));
} else if (body.dataset.page === 'gallery') {
  navLinks.forEach((a) => {
    if (a.getAttribute('href') === 'gallery.html') a.classList.add('active');
  });
}

const grid = document.getElementById('grid');
if (grid) {
  fetch('gallery/manifest.json')
    .then((response) => response.json())
    .then((images) => {
      images.forEach((entry) => {
        const filename = typeof entry === 'string' ? entry : entry.filename;
        if (!filename) return;

        const wrapper = document.createElement('figure');
        wrapper.className = 'grid-item';

        const image = document.createElement('img');
        image.className = 'gallery-image';
        image.src = filename.includes('/') ? filename : `gallery/${filename}`;
        image.alt = 'Gallery photograph';
        image.loading = 'lazy';
        wrapper.appendChild(image);

        if (typeof entry === 'object' && entry.caption) {
          const caption = document.createElement('figcaption');
          caption.textContent = entry.caption;
          wrapper.appendChild(caption);
        }

        grid.appendChild(wrapper);
      });
    })
    .catch(() => {
      grid.textContent = 'Unable to load gallery images.';
    });
}


(function () {
  const hamburger = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('mobile-nav-overlay');

  if (!hamburger || !overlay) return;

  let closeTimer = null;

  function openMenu() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    overlay.classList.remove('closing');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (closeTimer) { clearTimeout(closeTimer); }
    overlay.classList.add('closing');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    closeTimer = setTimeout(() => {
      overlay.classList.remove('closing');
      overlay.style.display = 'none';
      closeTimer = null;
    }, 250);
  }

  hamburger.addEventListener('click', () => {
    if (overlay.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();

window.addEventListener('hashchange', () => {
  document.body.style.overflow = '';
});

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const orb = document.getElementById('cursor-orb');
  if (orb) {
    orb.style.display = 'block';

    let mouseX = 0, mouseY = 0;
    let orbX = 0, orbY = 0;
    let prevOrbX = 0, prevOrbY = 0;
    let isExpanded = false;
    let initialized = false;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!initialized) {
        orbX = mouseX; orbY = mouseY;
        prevOrbX = mouseX; prevOrbY = mouseY;
        initialized = true;
      }
    });

    function animateOrb() {
      // Smooth lerp follow
      orbX += (mouseX - orbX) * 0.01;
      orbY += (mouseY - orbY) * 0.01;

      const dx = orbX - prevOrbX;
      const dy = orbY - prevOrbY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      prevOrbX = orbX;
      prevOrbY = orbY;

      let stretch = 1, squish = 1, angle = 0;

      if (!isExpanded && speed > 0.3) {
        stretch = Math.min(1 + speed * 0.22, 3.2);
        squish  = Math.max(1 / stretch, 0.45);
        angle   = Math.atan2(dy, dx);
      }

      orb.style.transform = `
        translate(calc(${orbX}px - 50%), calc(${orbY}px - 50%))
        rotate(${angle}rad)
        scale(${stretch}, ${squish})
      `;

      requestAnimationFrame(animateOrb);
    }
    requestAnimationFrame(animateOrb);

    const clickables = 'a, button, [data-blog-toggle], input, textarea, select, label, [role="button"]';
    document.querySelectorAll(clickables).forEach((el) => {
      el.addEventListener('mouseenter', () => { isExpanded = true;  orb.classList.add('expanded'); });
      el.addEventListener('mouseleave', () => { isExpanded = false; orb.classList.remove('expanded'); });
    });

    document.addEventListener('mouseleave', () => { orb.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { orb.style.opacity = '1'; });
  }
}
