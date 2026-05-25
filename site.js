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
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:100010;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const BASE_R           = 7;
  const EXPANDED_R       = 28;
  const LERP_POS         = 0.18;
  const LERP_R           = 0.10;
  const LERP_EFFECT      = 0.04;
  const BLOB_COUNT       = 4;
  const BLOB_ORBIT_R     = 22;
  const BLOB_W           = 9;
  const BLOB_H           = 4;
  const RING_SPEED_IDLE  = 0.028;
  const RING_SPEED_HOVER = 0.055;
  const WAVE_POINTS      = 64;
  const WAVE_AMP_MAX     = 2.6;
  const WAVE_FREQ        = 3;
  const WAVE_SPEED       = 0.055;
  const IDLE_DELAY_MS    = 1200;

  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let orbX = mouseX, orbY = mouseY;
  let currentR = BASE_R, targetR = BASE_R;
  let isVisible = true, isHover = false;
  let ringAngle = 0, wavePhase = 0;
  let effectStrength = 0, targetEffect = 0;
  let idleTimer = null;

  function startIdleCountdown() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { targetEffect = 1; }, IDLE_DELAY_MS);
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    targetEffect = isHover ? 1 : 0;
    startIdleCountdown();
  });
  document.addEventListener('mouseleave', () => { isVisible = false; });
  document.addEventListener('mouseenter', () => { isVisible = true; startIdleCountdown(); });

  const clickables = 'a, button, input, textarea, select, label, [role="button"]';
  document.querySelectorAll(clickables).forEach(el => {
    el.addEventListener('mouseenter', () => {
      isHover = true;
      targetR = EXPANDED_R;
      targetEffect = 1;
      clearTimeout(idleTimer);
    });
    el.addEventListener('mouseleave', () => {
      isHover = false;
      targetR = BASE_R;
      targetEffect = 0;
      startIdleCountdown();
    });
  });

  function drawWobblyOrb(cx, cy, r, phase, amp) {
    ctx.beginPath();
    for (let i = 0; i <= WAVE_POINTS; i++) {
      const theta = (i / WAVE_POINTS) * Math.PI * 2;
      const d =
        Math.sin(theta * WAVE_FREQ + phase)              * amp +
        Math.sin(theta * (WAVE_FREQ + 1) - phase * 1.3) * (amp * 0.4);
      const rad = r + d;
      const x = cx + rad * Math.cos(theta);
      const y = cy + rad * Math.sin(theta);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawBlob(cx, cy, angle, blobIndex, r, alpha) {
    if (alpha <= 0.01) return;
    const bx = cx + Math.cos(angle) * (BLOB_ORBIT_R + r * 0.5);
    const by = cy + Math.sin(angle) * (BLOB_ORBIT_R + r * 0.5);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);
    ctx.globalAlpha = alpha;
    const pulse = 1 + 0.18 * Math.sin(wavePhase * 2 + blobIndex);
    ctx.beginPath();
    ctx.ellipse(0, 0, BLOB_W * pulse, BLOB_H * pulse, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(0, -BLOB_H * 0.3, 0, 0, 0, BLOB_W * pulse);
    grad.addColorStop(0,   'rgba(91,142,240,0.9)');
    grad.addColorStop(0.6, 'rgba(37,99,235,0.7)');
    grad.addColorStop(1,   'rgba(37,99,235,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function animate() {
    orbX     += (mouseX  - orbX)     * LERP_POS;
    orbY     += (mouseY  - orbY)     * LERP_POS;
    currentR += (targetR - currentR) * LERP_R;
    effectStrength += (targetEffect - effectStrength) * LERP_EFFECT;

    const ringSpeed = RING_SPEED_IDLE + (RING_SPEED_HOVER - RING_SPEED_IDLE) * (isHover ? 1 : effectStrength);
    ringAngle += ringSpeed;
    wavePhase += WAVE_SPEED;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isVisible) {
      const es = effectStrength;
      const waveAmp = WAVE_AMP_MAX * es;

      // When purely moving (es near 0), draw the original flat solid orb
      if (es < 0.01) {
        ctx.beginPath();
        ctx.arc(orbX, orbY, currentR, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
      } else {
        // Glow
        const glowAlpha = 0.08 + 0.10 * es;
        const glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, currentR * 2.8);
        glow.addColorStop(0, `rgba(37,99,235,${glowAlpha.toFixed(3)})`);
        glow.addColorStop(1, 'rgba(37,99,235,0)');
        ctx.beginPath();
        ctx.arc(orbX, orbY, currentR * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Blobs
        for (let i = 0; i < BLOB_COUNT; i++) {
          const angle = ringAngle + (i / BLOB_COUNT) * Math.PI * 2;
          drawBlob(orbX, orbY, angle, i, currentR, es);
        }

        // Wobbly orb body — crossfade from flat circle to wobbly
        // We draw both and blend using globalAlpha
        // Flat circle at (1 - es) opacity
        ctx.globalAlpha = 1 - es;
        ctx.beginPath();
        ctx.arc(orbX, orbY, currentR, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.globalAlpha = 1;

        // Wobbly orb at es opacity
        ctx.globalAlpha = es;
        drawWobblyOrb(orbX, orbY, currentR, wavePhase, waveAmp);
        const body = ctx.createRadialGradient(
          orbX - currentR * 0.25, orbY - currentR * 0.3, 0,
          orbX, orbY, currentR
        );
        body.addColorStop(0,   '#7aabf7');
        body.addColorStop(0.5, '#2563eb');
        body.addColorStop(1,   '#1a4fd6');
        ctx.fillStyle = body;
        ctx.fill();

        // Specular highlight
        drawWobblyOrb(orbX, orbY, currentR, wavePhase, waveAmp);
        const hl = ctx.createRadialGradient(
          orbX - currentR * 0.3, orbY - currentR * 0.35, 0,
          orbX - currentR * 0.3, orbY - currentR * 0.35, currentR * 0.6
        );
        hl.addColorStop(0, 'rgba(255,255,255,0.6)');
        hl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hl;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    requestAnimationFrame(animate);
  }

  startIdleCountdown();
  animate();
}
