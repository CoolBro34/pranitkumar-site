/**
 * Gallery page renderer.
 *
 * Reads gallery/manifest.json and accepts either a filename string or an
 * object with a filename and optional caption. Keep this file separate from
 * site.js so shared navigation/theme behavior never has to know gallery data.
 */
(() => {
  const grid = document.getElementById('grid');
  if (!grid) return;

  fetch('gallery/manifest.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Gallery manifest request failed: ${response.status}`);
      return response.json();
    })
    .then((images) => {
      if (!Array.isArray(images)) throw new TypeError('Gallery manifest must be a JSON array.');

      images.forEach((entry) => {
        if (!entry || (typeof entry !== 'string' && typeof entry !== 'object')) return;
        const filename = typeof entry === 'string' ? entry : entry.filename;
        if (typeof filename !== 'string' || !filename.trim()) return;

        const wrapper = document.createElement('figure');
        wrapper.className = 'grid-item';
        // Keep a layout slot while loading, then reveal only successful images.
        wrapper.style.visibility = 'hidden';

        const img = document.createElement('img');
        img.className = 'gallery-image';
        img.src = filename.includes('/') ? filename : `gallery/${filename}`;
        // Use a filename-derived fallback because the manifest does not yet
        // contain human-written alt text for every photograph.
        img.alt = filename.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        img.loading = 'lazy';
        img.decoding = 'async';

        img.addEventListener('load', () => {
          wrapper.style.visibility = 'visible';
        }, { once: true });

        img.addEventListener('error', () => {
          // Don't leave an empty grid card for an unavailable image.
          wrapper.remove();
        }, { once: true });

        if (typeof entry === 'object' && typeof entry.caption === 'string' && entry.caption.trim()) {
          const caption = document.createElement('figcaption');
          caption.textContent = entry.caption;
          wrapper.appendChild(caption);
        }

        wrapper.appendChild(img);
        grid.appendChild(wrapper);
      });
    })
    .catch((error) => {
      // Keep the failure visible instead of presenting an empty gallery.
      console.error('Unable to load gallery:', error);
      grid.textContent = 'Unable to load gallery.';
    });
})();
