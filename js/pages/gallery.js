/**
 * Gallery page: renders gallery/manifest.json into #grid.
 *
 * Manifest = JSON array whose entries are either
 *   "images/photo.jpg"                         (plain path)
 *   { "filename": "images/photo.jpg", "caption": "Optional caption" }
 * A bare filename (no "/") is resolved under gallery/.
 */
const MANIFEST_URL = 'gallery/manifest.json';

/** Normalise a manifest entry → { filename, caption } or null if unusable. */
function parseEntry(entry) {
  if (!entry || (typeof entry !== 'string' && typeof entry !== 'object')) return null;
  const filename = typeof entry === 'string' ? entry : entry.filename;
  if (typeof filename !== 'string' || !filename.trim()) return null;
  const caption = typeof entry === 'object' && typeof entry.caption === 'string' && entry.caption.trim()
    ? entry.caption : null;
  return { filename, caption };
}

/** Human-ish alt text until the manifest carries real descriptions: "IMG_4126.JPG" → "IMG 4126". */
const altFromFilename = (filename) =>
  filename.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');

function createFigure({ filename, caption }) {
  const figure = document.createElement('figure');
  figure.className = 'grid-item';
  figure.style.visibility = 'hidden';          // hold the grid slot; reveal only if the image loads

  if (caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;
    figure.appendChild(figcaption);
  }

  const img = document.createElement('img');
  img.className = 'gallery-image';
  img.src = filename.includes('/') ? filename : `gallery/${filename}`;
  img.alt = altFromFilename(filename);
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('load', () => { figure.style.visibility = 'visible'; }, { once: true });
  img.addEventListener('error', () => figure.remove(), { once: true });   // no empty cards for broken images
  figure.appendChild(img);

  return figure;
}

export async function init() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) throw new Error(`Gallery manifest request failed: ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest)) throw new TypeError('Gallery manifest must be a JSON array.');

    grid.append(...manifest.map(parseEntry).filter(Boolean).map(createFigure));
  } catch (error) {
    console.error('Unable to load gallery:', error);                // keep failures visible
    const message = document.createElement('p');
    message.className = 'gallery-error';
    message.textContent = 'Unable to load gallery.';
    grid.replaceChildren(message);
  }
}
