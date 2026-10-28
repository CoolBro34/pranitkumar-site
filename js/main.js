/**
 * Site entry point (ES module, deferred). One file wires every page; each
 * page declares itself with <body data-page="home|gallery|404">.
 *
 * Boot order mirrors the original script order:
 *   navigation → cursor → theme controls → background effects → page module
 * (js/boot/theme-boot.js has already set <html data-theme> before first paint.)
 */
import { initTopbarScrollState } from './nav/topbar.js';
import { initActiveNav } from './nav/active-link.js';
import { initMobileMenu } from './nav/mobile-menu.js';
import { initCursor } from './cursor/orb.js';
import { initThemeController } from './theme/controller.js';
import { mountThemeUI } from './theme/ui.js';
import { initEffects } from './effects/index.js';

/** Page-specific code is fetched only on the page that needs it. */
const PAGE_MODULES = {
  gallery: () => import('./pages/gallery.js'),
  404: () => import('./pages/not-found.js'),
};

const page = document.body.dataset.page;

initTopbarScrollState();
initActiveNav(page);
initMobileMenu();
initCursor();

mountThemeUI(initThemeController());
initEffects();

PAGE_MODULES[page]?.().then((module) => module.init());
