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
  const sections = anchors.map((a) => {
  const href = a.getAttribute('href');
  if (href === '#about') return document.querySelector('.hero');
  return document.querySelector(href);
}).filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        anchors.forEach((a) => {
          a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-5% 0px -50% 0px', threshold: 0 });

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

  // ═══════════════════════════════════════════════════════════════
  // CURSOR CONFIG — all visual properties live here, edit freely
  // ═══════════════════════════════════════════════════════════════
  const t = window.SiteTheme || {};
  const C = {
    // Orb radius in each state
    ORB_MOVE          : 7,     // plain orb while moving
    ORB_IDLE          : 10,    // orb size at rest (blobs active)
    ORB_HOVER         : 28,    // orb size when over a clickable

    // Follow feel
    LERP_POSITION     : 0.18,  // position tracking tightness (0–1)
    LERP_RADIUS       : 0.10,  // radius transition speed
    LERP_IN           : 0.03,  // how slowly idle fades IN
    LERP_OUT          : 0.22,  // how quickly idle snaps OUT on move

    // Idle trigger
    IDLE_DELAY_MS     : 1200,  // ms still before idle activates

    // Bloom pulse (expanding ring on idle/hover entry)
    BLOOM_STRENGTH    : 22,    // peak extra radius added to bloom
    BLOOM_DECAY       : 0.84,  // how fast bloom collapses per frame

    // Blobs — same behavior for both idle and hover, only orb size changes
    BLOB_COUNT        : 4,
    BLOB_ORBIT_RADIUS : 24,    // full orbit distance from orb centre
    BLOB_WIDTH        : 9,     // semi-major axis (stretched direction)
    BLOB_HEIGHT       : 4,     // semi-minor axis
    BLOB_PULSE        : 0.18,  // size breathing amount
    RING_SPEED_IDLE   : 0.028, // rotation speed at rest
    RING_SPEED_HOVER  : 0.055, // rotation speed on hover

    // Surface wave
    WAVE_POINTS       : 64,    // polygon resolution — higher = smoother
    WAVE_AMPLITUDE    : 2.6,   // max surface displacement in px
    WAVE_FREQUENCY    : 3,     // wave peaks around the orb
    WAVE_SPEED        : 0.055,

    // Colors
    COL_PRIMARY       : t.cursorPrimary || '#2563eb',
    COL_LIGHT         : t.cursorLight   || '#7aabf7',
    COL_DARK          : t.cursorDark    || '#1a4fd6',
    COL_GLOW          : t.cursorGlow    || '37,99,235',
  };
  // ═══════════════════════════════════════════════════════════════

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:100010;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let orbX = mouseX, orbY = mouseY;
  let currentR = C.ORB_MOVE, targetR = C.ORB_MOVE;
  let isVisible = true, isHover = false;
  let ringAngle = 0, wavePhase = 0;
  let es = 0, targetEs = 0;   // effectStrength: 0 = moving, 1 = idle/hover
  let prevEs = 0, bloomR = 0;
  let idleTimer = null;

  function startIdleCountdown() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      targetEs = 1;
      targetR  = C.ORB_IDLE;
    }, C.IDLE_DELAY_MS);
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isHover) {
      targetEs = 0;
      targetR  = C.ORB_MOVE;
    }
    startIdleCountdown();
  });
  document.addEventListener('mouseleave', () => { isVisible = false; });
  document.addEventListener('mouseenter', () => { isVisible = true; startIdleCountdown(); });

  const clickables = 'a, button, input, textarea, select, label, [role="button"]';
  document.querySelectorAll(clickables).forEach(el => {
    el.addEventListener('mouseenter', () => {
      isHover  = true;
      targetEs = 1;
      targetR  = C.ORB_HOVER;
      clearTimeout(idleTimer);
    });
    el.addEventListener('mouseleave', () => {
      isHover  = false;
      targetEs = 0;
      targetR  = C.ORB_MOVE;
      startIdleCountdown();
    });
  });

  // Wobbly orb outline path
  function wobblyPath(cx, cy, r, phase, amp) {
    ctx.beginPath();
    for (let i = 0; i <= C.WAVE_POINTS; i++) {
      const theta = (i / C.WAVE_POINTS) * Math.PI * 2;
      const d = Math.sin(theta * C.WAVE_FREQUENCY + phase) * amp
              + Math.sin(theta * (C.WAVE_FREQUENCY + 1) - phase * 1.3) * (amp * 0.4);
      const x = cx + (r + d) * Math.cos(theta);
      const y = cy + (r + d) * Math.sin(theta);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawBlob(cx, cy, angle, idx, orbR, strength) {
    if (strength <= 0.005) return;

    // Key fix: orbit starts at 0 (blob sits on orb centre) and
    // travels to BLOB_ORBIT_RADIUS as strength rises to 1.
    // Blobs are full size the whole time — you see them physically
    // emerge from inside the orb and travel outward.
    const orbitDist = C.BLOB_ORBIT_RADIUS * strength;

    // Alpha: invisible while still inside the orb, then ramps to
    // full opacity as the blob crosses the orb surface.
    // This creates a clean "emitted from orb" appearance.
    const surfaceEdge = orbR;
    const alpha = Math.max(0, Math.min(1, (orbitDist - surfaceEdge * 0.4) / (surfaceEdge * 0.6 + 1)));

    if (alpha <= 0.01) return;

    const bx = cx + Math.cos(angle) * orbitDist;
    const by = cy + Math.sin(angle) * orbitDist;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);
    ctx.globalAlpha = alpha;

    const pulse = 1 + C.BLOB_PULSE * Math.sin(wavePhase * 2 + idx);
    ctx.beginPath();
    ctx.ellipse(0, 0, C.BLOB_WIDTH * pulse, C.BLOB_HEIGHT * pulse, 0, 0, Math.PI * 2);

    const g = ctx.createRadialGradient(0, -C.BLOB_HEIGHT * 0.3, 0, 0, 0, C.BLOB_WIDTH * pulse);
    g.addColorStop(0,   'rgba(91,142,240,0.9)');
    g.addColorStop(0.6, 'rgba(37,99,235,0.7)');
    g.addColorStop(1,   `rgba(${C.COL_GLOW},0)`);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function animate() {
    orbX     += (mouseX  - orbX)    * C.LERP_POSITION;
    orbY     += (mouseY  - orbY)    * C.LERP_POSITION;
    currentR += (targetR - currentR) * C.LERP_RADIUS;

    const rate = targetEs > es ? C.LERP_IN : C.LERP_OUT;
    es += (targetEs - es) * rate;

    // Bloom: fires whenever es is rising (idle or hover entry)
    const delta = es - prevEs;
    if (delta > 0) bloomR += delta * C.BLOOM_STRENGTH;
    bloomR *= C.BLOOM_DECAY;
    prevEs = es;

    const ringSpeed = C.RING_SPEED_IDLE + (C.RING_SPEED_HOVER - C.RING_SPEED_IDLE) * (isHover ? 1 : es);
    ringAngle += ringSpeed;
    wavePhase += C.WAVE_SPEED;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isVisible) { requestAnimationFrame(animate); return; }

    const drawR   = currentR + bloomR;
    const waveAmp = C.WAVE_AMPLITUDE * es;

    if (es < 0.005) {
      // ── MOVING: original plain flat orb, nothing else ──
      ctx.beginPath();
      ctx.arc(orbX, orbY, currentR, 0, Math.PI * 2);
      ctx.fillStyle = C.COL_PRIMARY;
      ctx.fill();

    } else {
      // ── IDLE or HOVER: glow + blobs + wobbly orb ──

      // Glow
      const glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, drawR * 2.8);
      glow.addColorStop(0, `rgba(${C.COL_GLOW},${(0.08 + 0.10 * es).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${C.COL_GLOW},0)`);
      ctx.beginPath();
      ctx.arc(orbX, orbY, drawR * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Blobs — emerge from orb centre, travel outward
      for (let i = 0; i < C.BLOB_COUNT; i++) {
        drawBlob(orbX, orbY, ringAngle + (i / C.BLOB_COUNT) * Math.PI * 2, i, drawR, es);
      }

      // Orb body: crossfade from flat circle → wobbly as es rises
      // Flat layer (fades out)
      ctx.globalAlpha = 1 - es;
      ctx.beginPath();
      ctx.arc(orbX, orbY, drawR, 0, Math.PI * 2);
      ctx.fillStyle = C.COL_PRIMARY;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Wobbly layer (fades in) — drawn twice: fill then highlight
      ctx.globalAlpha = es;

      wobblyPath(orbX, orbY, drawR, wavePhase, waveAmp);
      const body = ctx.createRadialGradient(
        orbX - drawR * 0.25, orbY - drawR * 0.3, 0,
        orbX, orbY, drawR
      );
      body.addColorStop(0,   C.COL_LIGHT);
      body.addColorStop(0.5, C.COL_PRIMARY);
      body.addColorStop(1,   C.COL_DARK);
      ctx.fillStyle = body;
      ctx.fill();

      wobblyPath(orbX, orbY, drawR, wavePhase, waveAmp);
      const hl = ctx.createRadialGradient(
        orbX - drawR * 0.3, orbY - drawR * 0.35, 0,
        orbX - drawR * 0.3, orbY - drawR * 0.35, drawR * 0.6
      );
      hl.addColorStop(0, 'rgba(255,255,255,0.6)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(animate);
  }

  startIdleCountdown();
  animate();
}
