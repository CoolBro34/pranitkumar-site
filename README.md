# Pranit Kumar — personal website

A no-build static site published with GitHub Pages. HTML, CSS, ES modules, images and PDFs are served straight from the repository root — no package manager, bundler or compile step. (`tools/` holds optional developer helpers only.)

## Repository map

```
index.html · gallery.html · 404.html     pages (static, SEO-friendly markup)
fun.html                                  standalone prank page (own CSS/JS, no theme system)
japanesestrokeordertool.html              standalone 11 MB utility — intentionally untouched
css/
  theme.css        design tokens: day palette (:root) + night palette ([data-theme=night])
  base.css         reset, typography, page container, a11y media queries
  effects.css      hooks for canvases / cloud layers / theme-flash overlay
  nav.css          topbar, desktop links, mobile overlay
  components.css   hero, cards, chips, education, projects, skills, gallery, contact
  controls.css     theme buttons + "Choose your experience" popup
  night.css        only the rules that differ at night (loaded last)
  pages/           error.css (404) · fun.css (fun.html)
js/
  boot/theme-boot.js    CLASSIC, render-blocking: sets <html data-theme> before first paint
  data/tz-table.js      CLASSIC: time zone → [lat, lon] for sunrise/sunset estimation
  main.js               ES-module entry for every page (dispatches on body[data-page])
  core/                 storage (never throws), random, motion, dom helpers, per-tab seed slots
  theme/                state · kernel · controller (transitions/events) · ui (DOM controls) · icons
  nav/                  topbar scroll state · scroll-spy · mobile menu (links generated from .site-nav)
  cursor/               config · orb (liquid cursor)
  effects/              orchestrator · day (sky + card clouds) · night (DOM side) · backends · card-decor
  night/                config · generators · renderer (pure canvas) · night-worker (module worker)
  pages/                gallery · not-found · fun (lazy / standalone)
gallery/manifest.json   gallery source of truth (images.json is a legacy mirror — safe to delete)
docs/                   design document (concept, visual language, branding, marketing)
tools/list-modules.sh   regenerates the <link rel="modulepreload"> block
```

## How a page boots

1. `<head>`: `tz-table.js` → `theme-boot.js` (classic, blocking) resolve *light / dark / auto* and set `html[data-theme]`. CSS tokens do the rest, so there is never a wrong-theme flash. In *auto* the kernel estimates daylight from the visitor's time zone (latitude → day length, longitude → solar-noon offset).
2. `<head>`: seven stylesheets in cascade order (listed in the map above).
3. End of `<body>`: `<script type="module" src="js/main.js">`, which runs in this order:
   navigation → cursor → theme controller + UI → background effects → page module.

`<link rel="modulepreload">` tags fetch the whole module graph in parallel. After changing imports run `sh tools/list-modules.sh` and update the block in each page.

### Contracts between modules

| Contract | Owner | Consumers |
| --- | --- | --- |
| `window.PKTheme` (`savedMode`, `resolveThemeKey`) | `boot/theme-boot.js` | `theme/kernel.js` |
| `pk-theme-applied` `{ detail: { name } }` | `theme/controller.js` | `effects/`, `cursor/`, `theme/ui.js` |
| `pk-perf-changed` `{ detail: boolean }` | `theme/controller.js` | `effects/`, `theme/ui.js` |
| `--cursor-*` CSS tokens | `css/theme.css` | `cursor/orb.js` |
| Worker messages `init-sky · add-card · start · visibility · perf-mode` ⇄ `sky-seed` | `night/night-worker.js` | `effects/night-backends.js` |
| `body[data-page]` = `home \| gallery \| 404` | each page | `main.js`, `nav/active-link.js` |

### Night rendering

`night/renderer.js` is pure canvas-2D with no DOM access. `effects/night-backends.js` runs it either **in a module Worker on OffscreenCanvases** (preferred) or **on the main thread** when Worker/OffscreenCanvas/module workers are unavailable — the same code in both, so output is identical. Constants live once in `night/config.js` (the old "keep these two files in sync" rule is gone). Cards animate at 24 fps and only while within 120 px of the viewport; performance mode drops glow passes and ribbon segments.

Module workers need Chrome 80+, Safari 15+, Firefox 114+; older browsers transparently use the main-thread backend.

## CSS notes worth knowing

* All colours are tokens in `theme.css`; nothing else hard-codes a palette colour.
* `a:hover` is intentionally low-specificity so components can opt out of the accent hover.
* In night, `[data-theme=night] p, li` out-ranks single-class colours, so paragraphs (`.meta`, `.role`, `.ap-*`, `.label`) read as `--text-secondary`. This matches the shipped look; see the header of `night.css`.
* The mobile menu stagger is `calc()` over `--i` / `--n` set by `mobile-menu.js` — no per-item rules.
* Popup/topbar mobile overrides no longer use `!important`; order of the `<link>`s matters.

## Gallery images

Add files under `images/`, then add their repository-root-relative paths to `gallery/manifest.json`. Entries are a path string or `{ "filename": "...", "caption": "..." }` (a bare filename resolves under `gallery/`). There is no per-image alt-text field yet; alt falls back to the filename. If you add one, update `js/pages/gallery.js` and this section together.

## Deployment

`.github/workflows/deploy.yml` uploads the repository root to GitHub Pages on every push to `main` (or manually). Keep it the only Pages workflow. `404.html` uses root-absolute asset URLs because it can be served from any missing path.

## Behaviour changes from the pre-refactor code (deliberate, small)

1. **Esc with the menu closed** no longer triggers the close animation (it used to flash the overlay).
2. **Cursor hover** is delegated, so controls injected after load (theme buttons, popup) now enlarge the orb like every other control.
3. **Main-thread night fallback** now renders the full sky (specials, focal glow, all ribbons, performance mode) — it used to be a simplified copy.
4. **Theme transitions can't leak timers**: effect rebuilds cancel pending frame callbacks, and card wrappers are reused instead of nested on each theme switch.
5. No-JS visitors get the day palette (tokens live in CSS).

Everything else — including cascade quirks listed above — was verified pixel-identical or computed-style-identical against the original in day/night × desktop/mobile (see "Verification").

## Verification checklist

Automated checks used for the refactor: pixel diff of 21 captures (desktop + mobile, day + night, menu open, first-visit popup, gallery, 404, prank page), computed-style diff of ~50 selectors incl. hover states, and interaction probes (theme popup, perf toggle, scroll-spy, mobile menu, gallery bad manifests, blocked storage).

Manual checklist after any change:
1. Open `index.html` at the top and from `#projects`; test desktop/mobile nav, all three theme modes, performance mode and reduced-motion.
2. `gallery.html` with valid and invalid image paths; captions; mobile layout.
3. A nonexistent URL (404 redirect after 5 s); drag/close popups on `fun.html`.
4. Stroke-order tool: search, rendering, interactions (it was not modified).
5. Browser DevTools console is clean in both themes.

## Ideas not done (kept out to preserve behaviour)

* Gallery JPEGs are 1.4–1.8 MB each; resizing to ~1600 px WebP/AVIF with `srcset` would cut gallery weight by ~85 %.
* `japanesestrokeordertool.html` embeds its data inline; splitting it needs behavioural tests first.
