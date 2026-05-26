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
// TIME-BASED DETECTION — uses the user's local system time.
// Sunrise/sunset approximated from the browser's UTC offset to
// infer rough latitude; accurate within ~30 min for most locations.
// ─────────────────────────────────────────────────────────────────

function _localIsDaytime() {
  const now        = new Date();
  const h          = now.getHours() + now.getMinutes() / 60;
  const dayOfYear  = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  // Estimate latitude from UTC offset (rough but good enough for day/night split)
  // UTC offset in hours (e.g. -5 for EST, +9 for JST)
  const utcOffsetH = -now.getTimezoneOffset() / 60;
  // Map offset to approximate latitude: equatorial zones ~0°, poles ~±60°
  // Clamp to ±55° to avoid polar-day edge cases
  const latRad     = Math.max(-55, Math.min(55, utcOffsetH * 7.5)) * Math.PI / 180;
  // Solar declination
  const decl       = 0.4093 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
  // Sunrise/set hour angle → hours from solar noon
  const cosH       = -Math.tan(latRad) * Math.tan(decl);
  const halfDay    = (Math.abs(cosH) >= 1) ? (cosH < 0 ? 12 : 0)
                   : Math.acos(Math.max(-1, Math.min(1, cosH))) * 12 / Math.PI;
  const rise       = 12 - halfDay;
  const set        = 12 + halfDay;
  return h >= rise && h <= set;
}

function resolveThemeKey(mode) {
  if (mode === 'light') return 'day';
  if (mode === 'dark')  return 'night';
  return _localIsDaytime() ? 'day' : 'night'; // 'auto'
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
  // Cursor vars — picked up live by site.js canvas cursor
  r.style.setProperty('--cursor-primary',      t.cursorPrimary);
  r.style.setProperty('--cursor-light',        t.cursorLight);
  r.style.setProperty('--cursor-dark',         t.cursorDark);
  r.style.setProperty('--cursor-glow',         t.cursorGlow);
  r.dataset.theme = key;
  window.SiteTheme = t;
  // Signal cursor code to re-read colors
  window.dispatchEvent(new CustomEvent('pk-theme-applied', { detail: t }));
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
// SVG ICONS — monochrome, stroke-based, theme-neutral
// ─────────────────────────────────────────────────────────────────
const _ICONS = {
  sun:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>`,
  moon:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  perf:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
};

// Live clock — updates every second, shows user's local time HH:MM
let _clockTimer = null;
function _startClock(el) {
  if (_clockTimer) clearInterval(_clockTimer);
  const tick = () => {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2,'0');
    const mm  = String(now.getMinutes()).padStart(2,'0');
    el.textContent = `${hh}:${mm}`;
  };
  tick();
  _clockTimer = setInterval(tick, 1000);
}

function _updateToggleUI(mode) {
  document.querySelectorAll('.pk-theme-btn').forEach(b => {
    b.classList.toggle('pk-theme-active', b.dataset.mode === mode);
  });
  const mob = document.getElementById('theme-mobile-toggle');
  if (mob) {
    const iconKey    = { light: 'sun', dark: 'moon', auto: 'clock' }[mode] || 'clock';
    mob.innerHTML    = _ICONS[iconKey];
    mob.dataset.mode = mode;
    mob.title        = { light: 'Light mode', dark: 'Dark mode', auto: 'Time-based' }[mode] || '';
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
            <span class="pk-popup-icon">${_ICONS.sun}</span>
            <span class="pk-popup-label">Light</span>
            <span class="pk-popup-desc">Day sky · clouds</span>
          </button>
          <button class="pk-popup-btn" data-pick="dark">
            <span class="pk-popup-icon">${_ICONS.moon}</span>
            <span class="pk-popup-label">Dark</span>
            <span class="pk-popup-desc">Night sky · aurora</span>
          </button>
          <button class="pk-popup-btn" data-pick="auto">
            <span class="pk-popup-icon">${_ICONS.clock}</span>
            <span class="pk-popup-label">Time-based</span>
            <span class="pk-popup-desc">Follows your local sunrise &amp; sunset</span>
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

  // ── Desktop right-rail: [clock] [sun] [moon] [clock-btn] [perf] [contact] ──
  const topbar = document.getElementById('topbar');
  if (topbar && !topbar.querySelector('.pk-right-rail')) {
    const contact = topbar.querySelector('.contact-rail');

    // Build the right rail wrapper (replaces where contact was)
    const rail = document.createElement('div');
    rail.className = 'pk-right-rail';

    // Live clock display
    const clockEl = document.createElement('span');
    clockEl.className = 'pk-nav-clock';
    clockEl.setAttribute('aria-label', 'Local time');
    _startClock(clockEl);
    rail.appendChild(clockEl);

    // Theme toggle group
    const group = document.createElement('div');
    group.className = 'pk-theme-group';
    group.setAttribute('aria-label', 'Theme');
    group.innerHTML = `
      <button class="pk-theme-btn" data-mode="light" title="Light mode">${_ICONS.sun}</button>
      <button class="pk-theme-btn" data-mode="dark"  title="Dark mode">${_ICONS.moon}</button>
      <button class="pk-theme-btn" data-mode="auto"  title="Time-based">${_ICONS.clock}</button>
    `;
    group.querySelectorAll('.pk-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTheme(btn.dataset.mode));
    });
    rail.appendChild(group);

    // Performance mode toggle (Gecko-friendly; stored in localStorage)
    const perfBtn = document.createElement('button');
    perfBtn.className = 'pk-theme-btn pk-perf-btn';
    perfBtn.title     = 'Performance mode (reduces aurora complexity)';
    perfBtn.innerHTML = _ICONS.perf;
    const perfOn = localStorage.getItem('pk-perf-mode') === '1';
    window.PK_PERF_MODE = perfOn;
    if (perfOn) perfBtn.classList.add('pk-theme-active');
    perfBtn.addEventListener('click', () => {
      window.PK_PERF_MODE = !window.PK_PERF_MODE;
      localStorage.setItem('pk-perf-mode', window.PK_PERF_MODE ? '1' : '0');
      perfBtn.classList.toggle('pk-theme-active', window.PK_PERF_MODE);
      // Re-init effects if night mode is active
      if (document.documentElement.dataset.theme === 'night' &&
          typeof window.reinitEffects === 'function') {
        window.reinitEffects('night');
      }
    });
    rail.appendChild(perfBtn);

    // Contact link (moved into right rail)
    if (contact) {
      contact.remove();
      rail.appendChild(contact);
    }

    topbar.appendChild(rail);

    // ── Mobile single-cycle button ───────────────────────────────
    const hamburger = document.getElementById('nav-hamburger');
    if (hamburger) {
      const mob = document.createElement('button');
      mob.id           = 'theme-mobile-toggle';
      mob.className    = 'pk-theme-mobile';
      mob.dataset.mode = window.PK_THEME_MODE || 'auto';
      const initIcon   = { light: 'sun', dark: 'moon', auto: 'clock' }[window.PK_THEME_MODE] || 'clock';
      mob.innerHTML    = _ICONS[initIcon];
      mob.title        = 'Cycle theme';
      mob.addEventListener('click', _cycleMobileTheme);
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


document.addEventListener('DOMContentLoaded', () => {
  const popupBody = document.querySelector('.theme-popup-body');

  if (popupBody && !popupBody.querySelector('.theme-popup-note')) {
    const note = document.createElement('div');
    note.className = 'theme-popup-note';
    note.innerHTML = `
      Uses your local sunrise & sunset times.<br>
      Reload the page to see different clouds and aurora patterns.
    `;
    popupBody.appendChild(note);

    const perf = document.createElement('button');
    perf.className = 'popup-performance-toggle';
    perf.textContent = window.PK_PERFORMANCE_MODE
      ? 'Disable Performance Mode'
      : 'Enable Performance Mode';

    perf.addEventListener('click', () => {
      const next = !(localStorage.getItem('pk-performance-mode') === '1');
      localStorage.setItem('pk-performance-mode', next ? '1' : '0');
      location.reload();
    });

    popupBody.appendChild(perf);
  }
});
