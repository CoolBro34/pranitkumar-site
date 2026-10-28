/**
 * Storage wrappers that never throw.
 *
 * localStorage / sessionStorage can be unavailable (private mode, blocked
 * cookies, sandboxed iframes). Everything stored here is a cache or a
 * preference, so on failure we silently behave as if nothing is stored.
 */
function safeStore(getStore) {
  return {
    get(key)        { try { return getStore().getItem(key); }   catch (_) { return null; } },
    set(key, value) { try { getStore().setItem(key, value); }    catch (_) { /* optional */ } },
    remove(key)     { try { getStore().removeItem(key); }        catch (_) { /* optional */ } },
  };
}

export const local   = safeStore(() => window.localStorage);
export const session = safeStore(() => window.sessionStorage);
