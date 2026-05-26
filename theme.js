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
    textPrimary:       '#eef5ff',
    textSecondary:     '#9ab8d8',
    textMuted:         '#6a8aaa',
    textLabel:         '#00d2a0',
    navText:           '#ddeeff',
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
// TIME-BASED DETECTION — uses the user's local system time
// ─────────────────────────────────────────────────────────────────

function _localIsDaytime() {
  const now        = new Date();
  const h          = now.getHours() + now.getMinutes() / 60;
  const dayOfYear  = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const utcOffsetH = -now.getTimezoneOffset() / 60;
  const latRad     = Math.max(-55, Math.min(55, utcOffsetH * 7.5)) * Math.PI / 180;
  const decl       = 0.4093 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
  const cosH       = -Math.tan(latRad) * Math.tan(decl);
  const halfDay    = (Math.abs(cosH) >= 1) ? (cosH < 0 ? 12 : 0)
                   : Math.acos(Math.max(-1, Math.min(1, cosH))) * 12 / Math.PI;
  return h >= (12 - halfDay) && h <= (12 + halfDay);
}

function resolveThemeKey(mode) {
  if (mode === 'light') return 'day';
  if (mode === 'dark')  return 'night';
  return _localIsDaytime() ? 'day' : 'night';
}

// ─────────────────────────────────────────────────────────────────
// APPLY THEME
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
  r.style.setProperty('--cursor-primary',      t.cursorPrimary);
  r.style.setProperty('--cursor-light',        t.cursorLight);
  r.style.setProperty('--cursor-dark',         t.cursorDark);
  r.style.setProperty('--cursor-glow',         t.cursorGlow);
  r.dataset.theme = key;
  window.SiteTheme = t;
  window.dispatchEvent(new CustomEvent('pk-theme-applied', { detail: t }));
}

// ─────────────────────────────────────────────────────────────────
// THEME SWITCH — black-flash transition
// ─────────────────────────────────────────────────────────────────

let _switchLock = false;

function switchTheme(mode) {
  if (_switchLock) return;
  _switchLock = true;
  localStorage.setItem('pk-theme-mode', mode);
  window.PK_THEME_MODE = mode;

  const overlay = document.getElementById('theme-transition-overlay');
  if (overlay) { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all'; }

  setTimeout(() => {
    const key = resolveThemeKey(mode);
    applyTheme(key);
    _updateToggleUI(mode);
    if (typeof window.reinitEffects === 'function') window.reinitEffects(key);

    setTimeout(() => {
      if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
      setTimeout(() => { _switchLock = false; }, 400);
    }, 80);
  }, 280);
}

// ─────────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────────

const _ICONS = {
  sun:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>`,
  moon:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  perf:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
};

// ─────────────────────────────────────────────────────────────────
// UPDATE TOGGLE UI
// ─────────────────────────────────────────────────────────────────

function _updateToggleUI(mode) {
  // Update the single active-mode button in the desktop rail
  const activeBtn = document.getElementById('pk-active-mode-btn');
  if (activeBtn) {
    const iconKey = { light: 'sun', dark: 'moon', auto: 'clock' }[mode] || 'clock';
    activeBtn.innerHTML = _ICONS[iconKey];
    activeBtn.title = {
      light: 'Light mode — click to change',
      dark:  'Dark mode — click to change',
      auto:  'Time-based — click to change',
    }[mode] || 'Change theme';
  }
  // Update mobile overlay button
  const mobBtn = document.getElementById('pk-overlay-theme-btn');
  if (mobBtn) {
    const iconKey = { light: 'sun', dark: 'moon', auto: 'clock' }[mode] || 'clock';
    mobBtn.innerHTML = _ICONS[iconKey];
    mobBtn.dataset.mode = mode;
  }
  // Update popup perf button state
  _syncPerfPopupBtn();
}

function _cycleMobileTheme() {
  const order   = ['light', 'dark', 'auto'];
  const current = window.PK_THEME_MODE || 'auto';
  switchTheme(order[(order.indexOf(current) + 1) % order.length]);
}

function _syncPerfPopupBtn() {
  const btn = document.getElementById('pk-popup-perf-btn');
  if (!btn) return;
  btn.classList.toggle('pk-perf-active', !!window.PK_PERF_MODE);
  btn.querySelector('.pk-perf-status').textContent = window.PK_PERF_MODE ? 'ON' : 'OFF';
}

// ─────────────────────────────────────────────────────────────────
// POPUP
// ─────────────────────────────────────────────────────────────────

function showThemePopup() {
  _syncPerfPopupBtn();
  const p = document.getElementById('theme-popup');
  if (p) p.classList.add('pk-popup-visible');
}

function hideThemePopup() {
  const p = document.getElementById('theme-popup');
  if (p) p.classList.remove('pk-popup-visible');
}

// ─────────────────────────────────────────────────────────────────
// INJECT UI
// ─────────────────────────────────────────────────────────────────

function _injectThemeUI() {
  // ── Transition overlay ──────────────────────────────────────────
  if (!document.getElementById('theme-transition-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'theme-transition-overlay';
    document.body.appendChild(ov);
  }

  // ── Popup ───────────────────────────────────────────────────────
  if (!document.getElementById('theme-popup')) {
    const popup = document.createElement('div');
    popup.id = 'theme-popup';
    popup.innerHTML = `
      <div class="pk-popup-inner">
        <p class="pk-popup-title">Choose your experience</p>
        <p class="pk-popup-sub">You can change this anytime from the nav.</p>
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
        <div class="pk-popup-divider"></div>
        <div class="pk-popup-perf-row">
          <div class="pk-popup-perf-text">
            <span class="pk-popup-perf-label">${_ICONS.perf} Performance mode</span>
            <span class="pk-popup-perf-desc">Reduces aurora complexity on slower devices</span>
          </div>
          <button class="pk-perf-toggle-btn" id="pk-popup-perf-btn" title="Toggle performance mode">
            <span class="pk-perf-status">OFF</span>
          </button>
        </div>
        <p class="pk-popup-reload-note">↺ Reload the page to see new clouds &amp; aurora layouts</p>
      </div>
    `;
    document.body.appendChild(popup);

    // Mode buttons
    popup.querySelectorAll('.pk-popup-btn[data-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTheme(btn.dataset.pick);
        hideThemePopup();
      });
    });

    // Perf toggle inside popup
    const perfPopupBtn = document.getElementById('pk-popup-perf-btn');
    if (perfPopupBtn) {
      perfPopupBtn.addEventListener('click', () => {
        window.PK_PERF_MODE = !window.PK_PERF_MODE;
        localStorage.setItem('pk-perf-mode', window.PK_PERF_MODE ? '1' : '0');
        _syncPerfPopupBtn();
        // Re-init effects if night is active
        const perfBtn = document.getElementById('pk-nav-perf-btn');
        if (perfBtn) perfBtn.classList.toggle('pk-theme-active', window.PK_PERF_MODE);
        if (document.documentElement.dataset.theme === 'night' &&
            typeof window.reinitEffects === 'function') {
          hideThemePopup();
          window.reinitEffects('night');
        }
      });
    }

    // Close on backdrop click
    popup.addEventListener('click', e => {
      if (e.target === popup) hideThemePopup();
    });
  }

  // ── Desktop right rail: [active-mode-btn][perf-btn] [contact] ───
  const topbar = document.getElementById('topbar');
  if (topbar && !topbar.querySelector('.pk-right-rail')) {
    const contact = topbar.querySelector('.contact-rail');

    const rail = document.createElement('div');
    rail.className = 'pk-right-rail';

    // Single active-mode button — shows current mode icon, opens popup
    const activeBtn = document.createElement('button');
    activeBtn.className = 'pk-theme-btn';
    activeBtn.id        = 'pk-active-mode-btn';
    const initIconKey   = { light: 'sun', dark: 'moon', auto: 'clock' }[window.PK_THEME_MODE] || 'clock';
    activeBtn.innerHTML = _ICONS[initIconKey];
    activeBtn.title     = 'Change theme';
    activeBtn.addEventListener('click', showThemePopup);
    rail.appendChild(activeBtn);

    // Performance mode button
    const perfBtn = document.createElement('button');
    perfBtn.className = 'pk-theme-btn';
    perfBtn.id        = 'pk-nav-perf-btn';
    perfBtn.title     = 'Performance mode';
    perfBtn.innerHTML = _ICONS.perf;
    if (window.PK_PERF_MODE) perfBtn.classList.add('pk-theme-active');
    perfBtn.addEventListener('click', () => {
      window.PK_PERF_MODE = !window.PK_PERF_MODE;
      localStorage.setItem('pk-perf-mode', window.PK_PERF_MODE ? '1' : '0');
      perfBtn.classList.toggle('pk-theme-active', window.PK_PERF_MODE);
      _syncPerfPopupBtn();
      if (document.documentElement.dataset.theme === 'night' &&
          typeof window.reinitEffects === 'function') {
        window.reinitEffects('night');
      }
    });
    rail.appendChild(perfBtn);

    // Contact link
    if (contact) { contact.remove(); rail.appendChild(contact); }

    topbar.appendChild(rail);

    // ── Mobile: inject theme cycle button INTO the overlay ────────
    // Appears in top-right of overlay, next to where the X (hamburger) is
    const overlay = document.getElementById('mobile-nav-overlay');
    if (overlay && !overlay.querySelector('#pk-overlay-theme-btn')) {
      const mobBtn = document.createElement('button');
      mobBtn.id        = 'pk-overlay-theme-btn';
      mobBtn.className = 'pk-overlay-theme-btn';
      mobBtn.dataset.mode = window.PK_THEME_MODE || 'auto';
      const mobIcon = { light: 'sun', dark: 'moon', auto: 'clock' }[window.PK_THEME_MODE] || 'clock';
      mobBtn.innerHTML = _ICONS[mobIcon];
      mobBtn.title     = 'Cycle theme';
      mobBtn.addEventListener('click', e => {
        e.stopPropagation(); // don't close menu
        _cycleMobileTheme();
      });
      overlay.appendChild(mobBtn);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

function _initThemeSystem() {
  const saved = localStorage.getItem('pk-theme-mode');
  window.PK_THEME_MODE = saved || 'auto';
  window.PK_PERF_MODE  = localStorage.getItem('pk-perf-mode') === '1';
  const key = resolveThemeKey(window.PK_THEME_MODE);
  applyTheme(key);

  const onReady = () => {
    _injectThemeUI();
    _updateToggleUI(window.PK_THEME_MODE);
    if (!saved) setTimeout(showThemePopup, 900);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  setInterval(() => {
    if (window.PK_THEME_MODE === 'auto') {
      const newKey = resolveThemeKey('auto');
      if (newKey !== document.documentElement.dataset.theme) switchTheme('auto');
    }
  }, 60000);
}

_initThemeSystem();
 
