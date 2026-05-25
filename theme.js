// theme.js
// ─────────────────────────────────────────────────────────────────
// THEME DEFINITIONS
// To add a new theme, copy the structure of an existing entry and
// add it to the THEMES object. Then add a toggle button if needed.
// ─────────────────────────────────────────────────────────────────

const THEMES = {

  day: {
    name: 'day',
    // Sky gradient — top to bottom
    skyTop:           '#5ba3e0',
    skyBottom:        '#c9e8ff',
    // Cards
    cardBg:           'rgba(255, 255, 255, 0.82)',
    cardBorder:       'rgba(255, 255, 255, 0.95)',
    cardShadow:       '0 8px 32px rgba(30, 80, 160, 0.13)',
    // Text
    textPrimary:      '#0d0d0d',
    textSecondary:    '#374151',
    textMuted:        '#6b7280',
    textLabel:        '#2563eb',
    // Nav
    navText:          '#0d0d0d',
    navActive:        '#2563eb',
    navScrolledBg:    'rgba(162, 207, 254, 0.90)',
    navScrolledBorder:'rgba(255, 255, 255, 0.5)',
    // Accent
    accent:           '#2563eb',
    accentHover:      '#1a4fd6',
    // Chips
    chipBg:           'rgba(255, 255, 255, 0.55)',
    chipBorder:       'rgba(37, 99, 235, 0.35)',
    chipText:         '#1f2937',
    // Mobile overlay
    overlayBg:        '#a2cffe',
    // Cursor
    cursorPrimary:    '#2563eb',
    cursorLight:      '#7aabf7',
    cursorDark:       '#1a4fd6',
    cursorGlow:       '37,99,235',
    // Cloud shape opacity
    cloudOpacity:     0.82,
  },

  // NIGHT THEME PLACEHOLDER — fill values in when ready
  // night: {
  //   name: 'night',
  //   skyTop:        '#0a0a1a',
  //   skyBottom:     '#1a1a3a',
  //   cardBg:        'rgba(255,255,255,0.06)',
  //   ...etc
  // },

};

const CURRENT_THEME_KEY = 'day'; // change this to switch themes

function applyTheme(key) {
  const t = THEMES[key];
  if (!t) return;
  const r = document.documentElement;
  r.style.setProperty('--sky-top',            t.skyTop);
  r.style.setProperty('--sky-bottom',         t.skyBottom);
  r.style.setProperty('--card-bg',            t.cardBg);
  r.style.setProperty('--card-border',        t.cardBorder);
  r.style.setProperty('--card-shadow',        t.cardShadow);
  r.style.setProperty('--text-primary',       t.textPrimary);
  r.style.setProperty('--text-secondary',     t.textSecondary);
  r.style.setProperty('--text-muted',         t.textMuted);
  r.style.setProperty('--text-label',         t.textLabel);
  r.style.setProperty('--nav-text',           t.navText);
  r.style.setProperty('--nav-active',         t.navActive);
  r.style.setProperty('--nav-scrolled-bg',    t.navScrolledBg);
  r.style.setProperty('--nav-scrolled-border',t.navScrolledBorder);
  r.style.setProperty('--accent',             t.accent);
  r.style.setProperty('--accent-hover',       t.accentHover);
  r.style.setProperty('--chip-bg',            t.chipBg);
  r.style.setProperty('--chip-border',        t.chipBorder);
  r.style.setProperty('--chip-text',          t.chipText);
  r.style.setProperty('--overlay-bg',         t.overlayBg);
  r.style.setProperty('--cloud-opacity',      t.cloudOpacity);
  // Cursor colors exposed for site.js to read
  window.SiteTheme = t;
}

applyTheme(CURRENT_THEME_KEY);
