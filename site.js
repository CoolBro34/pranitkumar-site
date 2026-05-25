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

  // ── Canvas setup ───────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'pointer-events:none',
    'z-index:99999',
  ].join(';');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── State ───────────────────────────────────────────────────────
  const ACCENT        = '#2563eb';
  const BASE_R        = 10;       // resting orb radius
  const EXPANDED_R    = 28;       // radius when hovering a clickable
  const LERP_SPEED    = 0.18;     // how tightly the orb follows the mouse

  // Blob ring config
  const BLOB_COUNT    = 4;
  const BLOB_ORBIT_R  = 22;       // orbit radius from orb centre
  const BLOB_W        = 9;        // blob semi-major axis (stretched)
  const BLOB_H        = 4;        // blob semi-minor axis
  const RING_SPEED    = 0.028;    // radians per frame

  // Orb surface-wave config
  const WAVE_POINTS   = 64;       // polygon resolution for wobbly edge
  const WAVE_AMP      = 2.6;      // max displacement of surface wave
  const WAVE_FREQ     = 3;        // number of wave peaks around the orb
  const WAVE_SPEED    = 0.055;    // wave animation speed

  let mouseX    = window.innerWidth  / 2;
  let mouseY    = window.innerHeight / 2;
  let orbX      = mouseX;
  let orbY      = mouseY;
  let currentR  = BASE_R;
  let targetR   = BASE_R;
  let isVisible = true;
  let ringAngle = 0;
  let wavePhase = 0;
  let frame     = 0;

  // ── Mouse tracking ──────────────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  document.addEventListener('mouseleave', () => { isVisible = false; });
  document.addEventListener('mouseenter', () => { isVisible = true;  });

  // ── Hover expand ────────────────────────────────────────────────
  const clickables = 'a, button, input, textarea, select, label, [role="button"]';
  document.querySelectorAll(clickables).forEach(el => {
    el.addEventListener('mouseenter', () => { targetR = EXPANDED_R; });
    el.addEventListener('mouseleave', () => { targetR = BASE_R;     });
  });

  // ── Draw helpers ────────────────────────────────────────────────

  // Draw the wobbly orb body using a polar polygon
  function drawWobblyOrb(cx, cy, r, phase) {
    ctx.beginPath();
    for (let i = 0; i <= WAVE_POINTS; i++) {
      const theta = (i / WAVE_POINTS) * Math.PI * 2;
      // Layer two sine waves for organic feel
      const displacement =
        Math.sin(theta * WAVE_FREQ + phase)       * WAVE_AMP +
        Math.sin(theta * (WAVE_FREQ + 1) - phase * 1.3) * (WAVE_AMP * 0.4);
      const rad = r + displacement;
      const x = cx + rad * Math.cos(theta);
      const y = cy + rad * Math.sin(theta);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // Draw one stretched blob at a given orbit position and rotation
  function drawBlob(cx, cy, angle, blobAngle, r) {
    const bx = cx + Math.cos(angle) * (BLOB_ORBIT_R + r * 0.5);
    const by = cy + Math.sin(angle) * (BLOB_ORBIT_R + r * 0.5);

    ctx.save();
    ctx.translate(bx, by);
    // Rotate blob so its long axis is tangent to the orbit
    ctx.rotate(angle + Math.PI / 2);

    // Subtle size pulse per blob, offset in phase
    const pulse = 1 + 0.18 * Math.sin(wavePhase * 2 + blobAngle);

    ctx.beginPath();
    ctx.ellipse(0, 0, BLOB_W * pulse, BLOB_H * pulse, 0, 0, Math.PI * 2);

    // Gradient inside each blob
    const grad = ctx.createRadialGradient(0, -BLOB_H * 0.3, 0, 0, 0, BLOB_W * pulse);
    grad.addColorStop(0,   'rgba(91,142,240,0.9)');
    grad.addColorStop(0.6, 'rgba(37,99,235,0.7)');
    grad.addColorStop(1,   'rgba(37,99,235,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // ── Main render loop ────────────────────────────────────────────
  function animate() {
    frame++;
    // Smooth follow
    orbX += (mouseX - orbX) * LERP_SPEED;
    orbY += (mouseY - orbY) * LERP_SPEED;
    // Smooth radius transition
    currentR += (targetR - currentR) * 0.1;
    // Advance animations
    ringAngle += RING_SPEED;
    wavePhase += WAVE_SPEED;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isVisible) {

      // 1 — Soft outer glow behind everything
      const glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, currentR * 2.8);
      glow.addColorStop(0,   'rgba(37,99,235,0.18)');
      glow.addColorStop(1,   'rgba(37,99,235,0)');
      ctx.beginPath();
      ctx.arc(orbX, orbY, currentR * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // 2 — Orbiting blobs (drawn behind the orb)
      for (let i = 0; i < BLOB_COUNT; i++) {
        const angle = ringAngle + (i / BLOB_COUNT) * Math.PI * 2;
        drawBlob(orbX, orbY, angle, i, currentR);
      }

      // 3 — Wobbly orb body
      drawWobblyOrb(orbX, orbY, currentR, wavePhase);

      // Filled body gradient
      const body = ctx.createRadialGradient(
        orbX - currentR * 0.25, orbY - currentR * 0.3, 0,
        orbX, orbY, currentR
      );
      body.addColorStop(0,   '#7aabf7');
      body.addColorStop(0.5, '#2563eb');
      body.addColorStop(1,   '#1a4fd6');
      ctx.fillStyle = body;
      ctx.fill();

      // 4 — Specular highlight on orb
      drawWobblyOrb(orbX, orbY, currentR, wavePhase);
      const hl = ctx.createRadialGradient(
        orbX - currentR * 0.3, orbY - currentR * 0.35, 0,
        orbX - currentR * 0.3, orbY - currentR * 0.35, currentR * 0.6
      );
      hl.addColorStop(0,   'rgba(255,255,255,0.6)');
      hl.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
}
