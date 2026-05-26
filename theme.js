// theme.js
// ─────────────────────────────────────────────────────────────────
// THEME DEFINITIONS
// ─────────────────────────────────────────────────────────────────

const THEMES = {

  day: {
    name: 'day',
    skyTop:            '#5ba3e0',
    skyBottom:         '#c9e8ff',
    cardBg:            'rgba(255,255,255,0.82)',
    cardBorder:        'rgba(255,255,255,0.95)',
    cardShadow:        '0 8px 32px rgba(30,80,160,0.13)',
    textPrimary:       '#0d0d0d',
    textSecondary:     '#374151',
    textMuted:         '#6b7280',
    textLabel:         '#1e3a5f',
    navText:           '#0d0d0d',
    navActive:         '#1e3a5f',
    navScrolledBg:     'rgba(162,207,254,0.90)',
    navScrolledBorder: 'rgba(255,255,255,0.5)',
    accent:            '#1e3a5f',
    accentHover:       '#162d47',
    chipBg:            'rgba(255,255,255,0.55)',
    chipBorder:        'rgba(37,99,235,0.35)',
    chipText:          '#1f2937',
    overlayBg:         '#a2cffe',
    cursorPrimary:     '#1e3a5f',
    cursorLight:       '#4a7aa8',
    cursorDark:        '#0f1f33',
    cursorGlow:        '30,58,95',
    cloudOpacity:      0.82,
  },

  night: {
    name: 'night',
    skyTop:            '#010407',
    skyBottom:         '#061530',
    cardBg:            'rgba(4,8,22,0.85)',
    cardBorder:        'rgba(0,210,160,0.22)',
    cardShadow:        '0 8px 32px rgba(0,210,160,0.10)',
    textPrimary:       '#ddeeff',
    textSecondary:     '#7a9cc0',
    textMuted:         '#4e6e96',
    textLabel:         '#00d2a0',
    navText:           '#c8dcff',
    navActive:         '#00d2a0',
    navScrolledBg:     'rgba(1,4,9,0.88)',
    navScrolledBorder: 'rgba(0,210,160,0.20)',
    accent:            '#00d2a0',
    accentHover:       '#00b88a',
    chipBg:            'rgba(0,210,160,0.07)',
    chipBorder:        'rgba(0,210,160,0.35)',
    chipText:          '#00d2a0',
    overlayBg:         '#010d1e',
    cursorPrimary:     '#00d2a0',
    cursorLight:       '#40e8c0',
    cursorDark:        '#007a5c',
    cursorGlow:        '0,210,160',
    cloudOpacity:      0,
  },

};

// ─────────────────────────────────────────────────────────────────
// TIME-BASED DETECTION — uses Phoenix, AZ local time
// Phoenix observes MST (UTC-7) year-round (no DST)
// ─────────────────────────────────────────────────────────────────

function getPhoenixIsDaytime() {
  const now       = new Date();
  const utcMs     = now.getTime() + now.getTimezoneOffset() * 60000;
  const phoenix   = new Date(utcMs + (-7 * 3600000));
  const h         = phoenix.getHours() + phoenix.getMinutes() / 60;
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  // Approximate Phoenix sunrise/sunset by day of year
  const rise = 6.5  - 0.75 * Math.cos(2 * Math.PI * (dayOfYear - 172) / 365);
  const set  = 18.3 + 1.05 * Math.cos(2 * Math.PI * (dayOfYear - 172) / 365);
  return h >= rise && h <= set;
}

function resolveThemeKey(mode) {
  if (mode === 'light') return 'day';
  if (mode === 'dark')  return 'night';
  return getPhoenixIsDaytime() ? 'day' : 'night'; // 'auto'
}

// ─────────────────────────────────────────────────────────────────
// APPLY THEME — sets all CSS custom properties + data-theme attr
// ─────────────────────────────────────────────────────────────────

function applyTheme(key) {
  const t = THEMES[key];
  if (!t) return;
  const r = document.documentElement;
  r.style.setProperty('--sky-top',             t.skyTop);
  r.style.setProperty('--sky-bottom',          t.skyBottom);
  r.style.setProperty('--card-bg',             t.cardBg);
  r.style.setProperty('--card-border',         t.cardBorder);
  r.style.setProperty('--card-shadow',         t.cardShadow);
  r.style.setProperty('--text-primary',        t.textPrimary);
  r.style.setProperty('--text-secondary',      t.textSecondary);
  r.style.setProperty('--text-muted',          t.textMuted);
  r.style.setProperty('--text-label',          t.textLabel);
  r.style.setProperty('--nav-text',            t.navText);
  r.style.setProperty('--nav-active',          t.navActive);
  r.style.setProperty('--nav-scrolled-bg',     t.navScrolledBg);
  r.style.setProperty('--nav-scrolled-border', t.navScrolledBorder);
  r.style.setProperty('--accent',              t.accent);
  r.style.setProperty('--accent-hover',        t.accentHover);
  r.style.setProperty('--chip-bg',             t.chipBg);
  r.style.setProperty('--chip-border',         t.chipBorder);
  r.style.setProperty('--chip-text',           t.chipText);
  r.style.setProperty('--overlay-bg',          t.overlayBg);
  r.style.setProperty('--cloud-opacity',       t.cloudOpacity);
  r.dataset.theme = key;
  window.SiteTheme = t;
}

// ─────────────────────────────────────────────────────────────────
// THEME SWITCH — black-flash transition between themes
// ─────────────────────────────────────────────────────────────────

let _switchLock = false;

function switchTheme(mode) {
  if (_switchLock) return;
  _switchLock = true;
  localStorage.setItem('pk-theme-mode', mode);
  window.PK_THEME_MODE = mode;

  const overlay = document.getElementById('theme-transition-overlay');
  if (overlay) {
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
  }

  setTimeout(() => {
    const key = resolveThemeKey(mode);
    applyTheme(key);
    _updateToggleUI(mode);
    if (typeof window.reinitEffects === 'function') window.reinitEffects(key);

    setTimeout(() => {
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
      setTimeout(() => { _switchLock = false; }, 400);
    }, 80);
  }, 280);
}

// ─────────────────────────────────────────────────────────────────
// TOGGLE UI — sync active states across desktop buttons + mobile
// ─────────────────────────────────────────────────────────────────

function _updateToggleUI(mode) {
  document.querySelectorAll('.pk-theme-btn').forEach(b => {
    b.classList.toggle('pk-theme-active', b.dataset.mode === mode);
  });
  const mob = document.getElementById('theme-mobile-toggle');
  if (mob) {
    mob.textContent = { light: '☼', dark: '☾', auto: '⌛' }[mode] || '⌛';
    mob.dataset.mode = mode;
    mob.title = { light: 'Light mode', dark: 'Dark mode', auto: 'Time-based' }[mode] || '';
  }
}

// Cycle order for the mobile single-button tap
function _cycleMobileTheme() {
  const order   = ['light', 'dark', 'auto'];
  const current = window.PK_THEME_MODE || 'auto';
  const next    = order[(order.indexOf(current) + 1) % order.length];
  switchTheme(next);
}

// ─────────────────────────────────────────────────────────────────
// FIRST-LOAD POPUP
// ─────────────────────────────────────────────────────────────────

function showThemePopup() {
  const p = document.getElementById('theme-popup');
  if (p) p.classList.add('pk-popup-visible');
}

function hideThemePopup() {
  const p = document.getElementById('theme-popup');
  if (p) p.classList.remove('pk-popup-visible');
}

// ─────────────────────────────────────────────────────────────────
// INJECT UI — called once after DOM ready
// Injects: transition overlay, first-load popup, desktop toggle
// group, mobile cycle button. Safe to call on both pages.
// ─────────────────────────────────────────────────────────────────

function _injectThemeUI() {
  // ── Transition overlay ──────────────────────────────────────────
  if (!document.getElementById('theme-transition-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'theme-transition-overlay';
    document.body.appendChild(ov);
  }

  // ── First-load popup ────────────────────────────────────────────
  if (!document.getElementById('theme-popup')) {
    const popup = document.createElement('div');
    popup.id = 'theme-popup';
    popup.innerHTML = `
      <div class="pk-popup-inner">
        <p class="pk-popup-title">Choose your experience</p>
        <p class="pk-popup-sub">You can change this anytime from the navigation.</p>
        <div class="pk-popup-options">
          <button class="pk-popup-btn" data-pick="light">
            <span class="pk-popup-icon">☼</span>
            <span class="pk-popup-label">Light</span>
            <span class="pk-popup-desc">Day sky · clouds</span>
          </button>
          <button class="pk-popup-btn" data-pick="dark">
            <span class="pk-popup-icon">☾</span>
            <span class="pk-popup-label">Dark</span>
            <span class="pk-popup-desc">Night sky · aurora</span>
          </button>
          <button class="pk-popup-btn" data-pick="auto">
            <span class="pk-popup-icon">⌛</span>
            <span class="pk-popup-label">Time-based</span>
            <span class="pk-popup-desc">Follows Phoenix sunrise &amp; sunset</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelectorAll('.pk-popup-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTheme(btn.dataset.pick);
        hideThemePopup();
      });
    });
  }

  // ── Desktop toggle group (☼ ☾ ⌛) ────────────────────────────────
  const topbar = document.getElementById('topbar');
  if (topbar && !topbar.querySelector('.pk-theme-group')) {
    const group = document.createElement('div');
    group.className = 'pk-theme-group';
    group.setAttribute('aria-label', 'Theme');
    group.innerHTML = `
      <button class="pk-theme-btn" data-mode="light" title="Light mode">☼</button>
      <button class="pk-theme-btn" data-mode="dark"  title="Dark mode">☾</button>
      <button class="pk-theme-btn" data-mode="auto"  title="Time-based">⌛</button>
    `;
    // Insert just before .contact-rail
    const contact = topbar.querySelector('.contact-rail');
    topbar.insertBefore(group, contact || null);
    group.querySelectorAll('.pk-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTheme(btn.dataset.mode));
    });

    // ── Mobile single-cycle button ───────────────────────────────
    const hamburger = document.getElementById('nav-hamburger');
    if (hamburger) {
      const mob = document.createElement('button');
      mob.id            = 'theme-mobile-toggle';
      mob.className     = 'pk-theme-mobile';
      mob.dataset.mode  = window.PK_THEME_MODE || 'auto';
      mob.textContent   = { light: '☼', dark: '☾', auto: '⌛' }[window.PK_THEME_MODE] || '⌛';
      mob.title         = 'Cycle theme';
      mob.addEventListener('click', _cycleMobileTheme);
      // Insert immediately before the hamburger so it sits left of it
      hamburger.parentNode.insertBefore(mob, hamburger);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// INIT — runs immediately (before DOMContentLoaded) to set vars,
// then wires up UI and shows popup after DOM is ready
// ─────────────────────────────────────────────────────────────────

function _initThemeSystem() {
  const saved = localStorage.getItem('pk-theme-mode');
  window.PK_THEME_MODE = saved || 'auto';
  const key = resolveThemeKey(window.PK_THEME_MODE);
  applyTheme(key);   // apply CSS vars before first paint → no flash

  const onReady = () => {
    _injectThemeUI();
    _updateToggleUI(window.PK_THEME_MODE);
    // Show popup only on first ever visit (no saved preference)
    if (!saved) setTimeout(showThemePopup, 900);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  // Re-check auto mode every 60 s in case sunrise/sunset crosses while page is open
  setInterval(() => {
    if (window.PK_THEME_MODE === 'auto') {
      const newKey = resolveThemeKey('auto');
      if (newKey !== document.documentElement.dataset.theme) {
        switchTheme('auto');
      }
    }
  }, 60000);
}

_initThemeSystem();
