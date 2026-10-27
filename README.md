# Pranit Kumar — personal website

A no-build static website published with GitHub Pages. The HTML, CSS, JavaScript, images, and PDFs are served directly from the repository root; there is no package manager or compile step.

## Pages

- `index.html` — portfolio homepage, education/AP scores, projects, experience, and contact information.
- `gallery.html` — photography gallery populated from `gallery/manifest.json`.
- `404.html` — custom not-found page. It uses both a meta refresh and a JavaScript redirect as fallbacks.
- `fun.html` — standalone prank page with intentionally exaggerated fake opportunity popups. Its portfolio copy is a separate copy, not automatically synchronized with the homepage.
- `japanesestrokeordertool.html` — large, standalone Japanese stroke-order tool. Treat it as a self-contained utility; avoid broad formatting or data extraction without checking its interactions and any embedded data.

## Runtime architecture

There is no bundler. Script order is important:

1. `tz-table.js` defines `TZ_TABLE`, keyed by IANA time-zone names, with representative latitude and longitude values.
2. `theme.js` reads that table to resolve automatic day/night mode, applies theme CSS variables, and injects theme/performance controls. Load the table before this script.
3. Page markup defines the elements shared scripts expect, including `#topbar`, `#sky-bg`, `#nav-hamburger`, and `#mobile-nav-overlay`.
4. `site.js` handles shared navigation state, the mobile menu, and the custom cursor. It uses `body[data-page]` to distinguish the homepage from the gallery.
5. `clouds.js` handles day clouds and night-mode canvas setup. When supported, it transfers canvases to `aurora-worker.js`; otherwise it uses a main-thread fallback.
6. `gallery.js` runs only on the gallery page. It fetches the manifest after the gallery markup exists and reveals each image after it loads successfully.

The shared scripts are included at the bottom of the page where they need the completed body markup, except `tz-table.js` and `theme.js`, which are loaded in the document head because theme resolution needs the timezone table early.

### Theme and animation contracts

- `theme.js` owns the theme definitions and emits `pk-theme-applied` when theme CSS variables change.
- `clouds.js` owns canvas creation, visibility observation, lifecycle cleanup, and reduced-motion handling.
- `aurora-worker.js` owns night-mode drawing when `Worker` and `OffscreenCanvas` are available. Its messages are `init-sky`, `add-card`, `start`, `stop`, `visibility`, and `perf-mode`; it returns `sky-seed` so generated sky data can be cached for the session.
- Keep the night-mode configuration that is shared by `clouds.js` and `aurora-worker.js` aligned. The main-thread fallback is a separate implementation and should be checked whenever worker drawing logic changes.
- Storage is only a cache/preference layer. The page should still render if local/session storage is unavailable.
- Respect `prefers-reduced-motion` when adding new animations or animation loops.

## Gallery images

Add image files under `images/`, then add their repository-root-relative paths to `gallery/manifest.json`. Manifest entries may be plain filename strings or objects with a `filename` and optional `caption`. Human-written alt text is not currently part of the manifest schema, so the renderer falls back to the filename; provide meaningful captions and alt text as the collection grows.

`images.json` currently mirrors `gallery/manifest.json`, but the site's gallery renderer reads the latter. Keep the two files synchronized if the mirror is still needed.

## Deployment

`.github/workflows/deploy.yml` is the single GitHub Pages deployment workflow. It runs on pushes to `main` and can also be launched manually. It uploads the repository root because the project has no build output directory; if the project structure changes, update the uploaded path and all asset paths together. Keep only one active Pages deployment workflow to avoid competing deploys.

## Safe editing guidelines

- Preserve element IDs/classes consumed by `site.js`, `theme.js`, `clouds.js`, or `gallery.js` unless updating every dependent reference.
- Keep the page-specific `data-page` values in sync with the branches in `site.js`.
- Avoid broad reformatting of the inline data-heavy Japanese stroke-order tool until it has been behaviorally tested.
- Keep `404.html`'s root-absolute asset URLs aligned with the root-hosted GitHub Pages/custom-domain deployment.
- When adding a new interactive page, include a manual test path instead of assuming syntax checks cover its behavior.

## Verification checklist

There is no automated browser-test suite at present. After changing code, at minimum:

1. Check JavaScript syntax and JSON validity, and inspect the Git diff for accidental formatting-only churn.
2. Open `index.html` at the top and from a scrolled position; test desktop/mobile navigation, theme selection, automatic theme switching, performance mode, and reduced-motion behavior.
3. Open `gallery.html` with both valid and invalid image paths; verify load, error, caption, and mobile layout behavior.
4. Open a nonexistent URL to verify the 404 page, then manually exercise `fun.html`'s mouse/touch popup dragging and close behavior.
5. Open the Japanese stroke-order tool and verify its search, rendering, and interaction workflows before making changes to it.

Syntax validation is useful, but it does not replace browser, accessibility, or cross-device testing.
