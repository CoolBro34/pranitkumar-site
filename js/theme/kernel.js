/**
 * Typed access to the pre-paint kernel published by js/boot/theme-boot.js
 * (window.PKTheme). Includes a safe fallback so a missing/blocked boot script
 * degrades to "day" instead of throwing.
 */
const kernel = window.PKTheme;

export const STORAGE_KEY = kernel?.storageKey ?? 'pk-theme-mode';
/** The mode saved in localStorage, or null on a first visit. */
export const savedMode = kernel?.savedMode ?? null;
/** 'light' | 'dark' | 'auto' → 'day' | 'night'. */
export const resolveThemeKey = kernel?.resolveThemeKey ?? ((mode) => (mode === 'dark' ? 'night' : 'day'));
