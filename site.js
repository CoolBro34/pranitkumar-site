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
  const HEAD_R   = 10;    // radius of the head dot in px
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
    for (let i = 0; i < HISTORY; i++) {
      const t = i / (HISTORY - 1);
      const p = hist[i];
      const r = t * currentHeadR * 1.15;
      if (r < 0.5) continue;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0,   `rgba(37,99,235,${(t * t * 0.85).toFixed(3)})`);
      grad.addColorStop(0.6, `rgba(37,99,235,${(t * t * 0.4).toFixed(3)})`);
      grad.addColorStop(1,   'rgba(37,99,235,0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1;
      ctx.fill();
    }
  }  
  function drawHead() {
    const r = currentHeadR;

    // Soft outer glow
    const glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, r * 2.2);
    glow.addColorStop(0,   'rgba(37,99,235,0.25)');
    glow.addColorStop(1,   'rgba(37,99,235,0)');
    ctx.beginPath();
    ctx.arc(orbX, orbY, r * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.globalAlpha = 1;
    ctx.fill();

    // Main orb body
    const body = ctx.createRadialGradient(orbX - r * 0.2, orbY - r * 0.25, r * 0.1, orbX, orbY, r);
    body.addColorStop(0,   '#5b8ef0');
    body.addColorStop(0.5, '#2563eb');
    body.addColorStop(1,   '#1a4fd6');
    ctx.beginPath();
    ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();

    // Specular highlight — top-left bright spot
    const hl = ctx.createRadialGradient(
      orbX - r * 0.32, orbY - r * 0.35, 0,
      orbX - r * 0.32, orbY - r * 0.35, r * 0.52
    );
    hl.addColorStop(0,   'rgba(255,255,255,0.65)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    hl.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(orbX, orbY, r, 0, Math.PI * 2);
    ctx.fillStyle = hl;
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
