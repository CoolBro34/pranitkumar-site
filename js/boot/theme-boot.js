/**
 * Pre-paint theme kernel.
 *
 * A *classic* script on purpose: it runs synchronously in <head> (after
 * data/tz-table.js) so `<html data-theme>` is correct before the first paint
 * and the page never flashes the wrong palette. Everything else on the site
 * is an ES module that loads after parsing.
 *
 * Responsibilities
 *   1. Decide "day" or "night" from the saved mode ('light' | 'dark' | 'auto').
 *   2. In 'auto', estimate local daylight from latitude/longitude derived from
 *      the visitor's IANA time zone (no geolocation permission needed).
 *   3. Publish `window.PKTheme` for js/theme/kernel.js to consume.
 *
 * Palette values live in css/theme.css - this file only picks the key.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pk-theme-mode';
  var AXIAL_TILT_RAD = 0.4093;           // 23.45 degrees
  var MS_PER_DAY = 86400000;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /** Saved mode, or null when storage is blocked / nothing saved yet. */
  function readSavedMode() {
    try { return window.localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  /**
   * Representative coordinates for the visitor's time zone.
   * Falls back to a latitude guess from the UTC offset (longitude unknown,
   * so the solar-noon correction is skipped).
   */
  function resolveCoords() {
    var table = typeof TZ_TABLE !== 'undefined' ? TZ_TABLE : null;
    if (table) {
      var entry = table[Intl.DateTimeFormat().resolvedOptions().timeZone];
      if (entry) return { lat: entry[0], lon: entry[1] };
    }
    var offsetH = -new Date().getTimezoneOffset() / 60;
    return { lat: clamp(offsetH * 7.5, -55, 55), lon: null };
  }

  /**
   * Is it daytime at (lat, lon) right now?
   *
   * Day length comes from the standard hour-angle formula with a sinusoidal
   * solar declination. Solar noon is shifted by how far the longitude sits from
   * the zone's standard meridian (4 minutes per degree), so e.g. Phoenix,
   * about 7 degrees west of its meridian, gets solar noon near 12:28, not 12:00.
   */
  function isDaytime(lat, lon) {
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / MS_PER_DAY);
    var latRad = clamp(lat, -89, 89) * Math.PI / 180;

    // (dayOfYear - 81) phases the sine so it peaks at the June solstice.
    var decl = AXIAL_TILT_RAD * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
    var cosH = -Math.tan(latRad) * Math.tan(decl);
    var halfDayHours = Math.abs(cosH) >= 1
      ? (cosH < 0 ? 12 : 0)                                  // polar day / night
      : Math.acos(clamp(cosH, -1, 1)) * 12 / Math.PI;

    var solarNoon = 12;
    if (lon != null) {
      var stdMeridian = (-now.getTimezoneOffset() / 60) * 15;
      solarNoon = 12 + (stdMeridian - lon) / 15;
    }

    var hour = now.getHours() + now.getMinutes() / 60;
    return hour >= solarNoon - halfDayHours && hour <= solarNoon + halfDayHours;
  }

  /** 'light' -> day, 'dark' -> night, anything else (auto) -> by local daylight. */
  function resolveThemeKey(mode) {
    if (mode === 'light') return 'day';
    if (mode === 'dark') return 'night';
    var c = resolveCoords();
    return isDaytime(c.lat, c.lon) ? 'day' : 'night';
  }

  var saved = readSavedMode();
  document.documentElement.dataset.theme = resolveThemeKey(saved || 'auto');

  window.PKTheme = Object.freeze({
    storageKey: STORAGE_KEY,
    savedMode: saved,          // null on a first visit
    resolveThemeKey: resolveThemeKey,
  });
})();
