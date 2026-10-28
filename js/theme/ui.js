/**
 * Theme UI — builds and wires every theme-related control:
 *   • #theme-transition-overlay   black flash between themes
 *   • #theme-popup                "Choose your experience" dialog
 *   • .pk-right-rail              desktop buttons (mode + performance) + Contact link
 *   • #pk-overlay-theme-btn       mobile topbar button (left of the hamburger)
 * Behaviour (state changes) is delegated to controller.js.
 */
import { themeState } from './state.js';
import { ICONS } from './icons.js';
import { switchTheme, setPerfMode } from './controller.js';

const MODE_ICON = { light: 'sun', dark: 'moon', auto: 'clock' };
const MODE_TITLE = {
  light: 'Light mode — click to change',
  dark:  'Dark mode — click to change',
  auto:  'Time-based — click to change',
};
const FIRST_VISIT_DELAY_MS = 900;

const byId = (id) => document.getElementById(id);

// ── Popup ───────────────────────────────────────────────────────────────────
function syncPerfControls() {
  const on = themeState.perf;
  const popupBtn = byId('pk-popup-perf-btn');
  if (popupBtn) {
    popupBtn.classList.toggle('pk-perf-active', on);
    popupBtn.querySelector('.pk-perf-status').textContent = on ? 'ON' : 'OFF';
  }
  byId('pk-nav-perf-btn')?.classList.toggle('pk-theme-active', on);
}

export function showThemePopup() {
  syncPerfControls();
  byId('theme-popup')?.classList.add('pk-popup-visible');
}
function hideThemePopup() {
  byId('theme-popup')?.classList.remove('pk-popup-visible');
}

function popupOption(pick, icon, label, description) {
  return `
    <button class="pk-popup-btn" data-pick="${pick}">
      <span class="pk-popup-icon">${icon}</span>
      <span class="pk-popup-label">${label}</span>
      <span class="pk-popup-desc">${description}</span>
    </button>`;
}

function buildPopup() {
  const popup = document.createElement('div');
  popup.id = 'theme-popup';
  popup.innerHTML = `
    <div class="pk-popup-inner">
      <p class="pk-popup-title">Choose your experience</p>
      <p class="pk-popup-sub">You can change this anytime from the nav.</p>
      <p class="pk-popup-reload-note">↺ Reload the page to see new clouds &amp; aurora layouts</p>
      <div class="pk-popup-options">
        ${popupOption('light', ICONS.sun, 'Light', 'Day sky · clouds')}
        ${popupOption('dark', ICONS.moon, 'Dark', 'Night sky · aurora')}
        ${popupOption('auto', ICONS.clock, 'Time-based', 'Follows your local sunrise &amp; sunset')}
      </div>
      <div class="pk-popup-divider"></div>
      <div class="pk-popup-perf-row">
        <div class="pk-popup-perf-text">
          <span class="pk-popup-perf-label">${ICONS.perf} Performance mode</span>
          <span class="pk-popup-perf-desc">Reduces aurora complexity on slower devices</span>
        </div>
        <button class="pk-perf-toggle-btn" id="pk-popup-perf-btn" title="Toggle performance mode">
          <span class="pk-perf-status">OFF</span>
        </button>
      </div>
    </div>`;

  popup.addEventListener('click', (e) => {
    const option = e.target.closest('.pk-popup-btn[data-pick]');
    if (option) {
      switchTheme(option.dataset.pick);
      hideThemePopup();
    } else if (e.target.closest('#pk-popup-perf-btn')) {
      setPerfMode(!themeState.perf);
      // At night the change is visible behind the popup only once it's closed.
      if (document.documentElement.dataset.theme === 'night') hideThemePopup();
    } else if (e.target === popup) {
      hideThemePopup();                                    // backdrop click
    }
  });

  document.body.appendChild(popup);
}

// ── Topbar controls ─────────────────────────────────────────────────────────
function iconButton({ id, className, title, icon, onClick }) {
  const btn = document.createElement('button');
  if (id) btn.id = id;
  if (className) btn.className = className;
  btn.title = title;
  btn.innerHTML = icon;
  btn.addEventListener('click', onClick);
  return btn;
}

function buildTopbarControls() {
  const topbar = byId('topbar');
  if (!topbar || topbar.querySelector('.pk-right-rail')) return;

  const rail = document.createElement('div');
  rail.className = 'pk-right-rail';
  rail.append(
    iconButton({
      id: 'pk-active-mode-btn', className: 'pk-theme-btn', title: 'Change theme',
      icon: ICONS[MODE_ICON[themeState.mode]], onClick: showThemePopup,
    }),
    iconButton({
      id: 'pk-nav-perf-btn', className: 'pk-theme-btn', title: 'Performance mode',
      icon: ICONS.perf, onClick: () => setPerfMode(!themeState.perf),
    }),
  );

  // Move (not clone) the Contact link into the rail so it keeps its listeners.
  const contact = topbar.querySelector('.contact-rail');
  if (contact) rail.appendChild(contact);
  topbar.appendChild(rail);

  // Mobile: a theme button sits immediately left of the hamburger.
  const hamburger = byId('nav-hamburger');
  if (hamburger && !byId('pk-overlay-theme-btn')) {
    const mobileBtn = iconButton({
      id: 'pk-overlay-theme-btn', title: 'Change theme',
      icon: ICONS[MODE_ICON[themeState.mode]],
      onClick: (e) => { e.stopPropagation(); showThemePopup(); },
    });
    mobileBtn.dataset.mode = themeState.mode;
    hamburger.before(mobileBtn);
  }
}

/** Refresh the mode icons/titles to reflect themeState.mode. */
function syncModeControls() {
  const mode = themeState.mode;
  const icon = ICONS[MODE_ICON[mode]] ?? ICONS.clock;

  const active = byId('pk-active-mode-btn');
  if (active) { active.innerHTML = icon; active.title = MODE_TITLE[mode] ?? 'Change theme'; }

  const mobile = byId('pk-overlay-theme-btn');
  if (mobile) { mobile.innerHTML = icon; mobile.dataset.mode = mode; }

  syncPerfControls();
}

// ── Entry point ─────────────────────────────────────────────────────────────
/** @param {{ isFirstVisit: boolean }} opts */
export function mountThemeUI({ isFirstVisit }) {
  if (!byId('theme-transition-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'theme-transition-overlay';
    document.body.appendChild(overlay);
  }
  if (!byId('theme-popup')) buildPopup();
  buildTopbarControls();
  syncModeControls();

  window.addEventListener('pk-theme-applied', syncModeControls);
  window.addEventListener('pk-perf-changed', syncPerfControls);

  // First visit: invite the visitor to pick an experience.
  if (isFirstVisit) setTimeout(showThemePopup, FIRST_VISIT_DELAY_MS);
}
