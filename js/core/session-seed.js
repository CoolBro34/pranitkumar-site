import { session } from './storage.js';
import { isReloadNavigation } from './dom.js';

/**
 * Per-tab "seed slot" for randomly generated decoration (cloud layout, star
 * field). Navigating between pages of the site reuses the stored layout so
 * the sky doesn't reshuffle; a hard reload deliberately generates a new one.
 *
 * Storage layout (unchanged from the original site):
 *   pk-<ns>-key   -> random id of the current layout
 *   pk-<ns>-<id>  -> JSON payload
 *
 * @param {string} namespace e.g. 'sky' | 'night'
 * @returns {{ read(): any|null, write(value: any): void }}
 */
export function seedSlot(namespace) {
  const keyName = `pk-${namespace}-key`;
  let id = session.get(keyName);

  if (!id || isReloadNavigation()) {
    if (id) session.remove(`pk-${namespace}-${id}`);   // drop the stale layout
    id = Math.random().toString(36).slice(2);
    session.set(keyName, id);
  }
  const storeKey = `pk-${namespace}-${id}`;

  return {
    read() {
      try { return JSON.parse(session.get(storeKey) || 'null'); } catch (_) { return null; }
    },
    write(value) { session.set(storeKey, JSON.stringify(value)); },
  };
}
