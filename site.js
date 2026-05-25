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
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:100003;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const HISTORY  = 15;   // trail length — more = longer tail
  const HEAD_R   = 7;    // radius of the head dot in px
  const TAIL_W   = 14;   // max width of tail at the head end in px
  const LERP     = 0.5; // follow speed — lower = more lag/curve
  const COLOR    = '#2563eb';

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let orbX = mouseX, orbY = mouseY;
  let initialized = false, isExpanded = false, isVisible = true;
  let currentHeadR = HEAD_R;
  
  const hist = Array.from({ length: HISTORY }, () => ({ x: orbX, y: orbY }));

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!initialized) {
      orbX = mouseX; orbY = mouseY;
      hist.forEach(p => { p.x = orbX; p.y = orbY; });
      initialized = true;
    }
  });

  document.addEventListener('mouseleave', () => { isVisible = false; });
  document.addEventListener('mouseenter', () => { isVisible = true; });

  const clickables = 'a, button, input, textarea, select, label, [role="button"]';
  document.querySelectorAll(clickables).forEach(el => {
    el.addEventListener('mouseenter', () => { isExpanded = true; });
    el.addEventListener('mouseleave', () => { isExpanded = false; });
  });

  function drawTail() {
    // Draw pairs of segments using midpoints for smooth curves
    // Each segment is drawn individually so lineWidth can taper
    for (let i = 0; i < HISTORY - 2; i++) {
      const t0 = i       / (HISTORY - 1);
      const t1 = (i + 1) / (HISTORY - 1);

      const p0 = hist[i];
      const p1 = hist[i + 1];
      const p2 = hist[i + 2];

      // Midpoints — the actual start/end of this bezier segment
      const mx0 = (p0.x + p1.x) / 2;
      const my0 = (p0.y + p1.y) / 2;
      const mx1 = (p1.x + p2.x) / 2;
      const my1 = (p1.y + p2.y) / 2;

      const alpha = t0 * t0;           // quadratic falloff — fades toward tail
      const width = isExpanded ? 1.5 : t1 * TAIL_W;

      ctx.beginPath();
      ctx.moveTo(mx0, my0);
      ctx.quadraticCurveTo(p1.x, p1.y, mx1, my1);
      ctx.strokeStyle = COLOR;
      ctx.globalAlpha = alpha;
      ctx.lineWidth   = width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
    }
  }
  function drawHead() {
    ctx.beginPath();
    ctx.arc(orbX, orbY, currentHeadR, 0, Math.PI * 2);
    ctx.fillStyle  = isExpanded ? 'rgba(37,99,235,0.35)' : COLOR;
    ctx.globalAlpha = 1;
    ctx.fill();
  }

  function animate() {
    orbX += (mouseX - orbX) * LERP;
    orbY += (mouseY - orbY) * LERP;
    const targetR = isExpanded ? HEAD_R * 2.8 : HEAD_R;
    currentHeadR += (targetR - currentHeadR) * 0.12;

    hist.shift();
    hist.push({ x: orbX, y: orbY });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isVisible) { drawTail(); drawHead(); }

    requestAnimationFrame(animate);
  }

  animate();
}
