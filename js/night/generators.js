/**
 * Procedural data for the night sky. Pure functions of (viewport, device class)
 * plus Math.random; the result is plain JSON so it can be cached per tab.
 */
import { rnd } from '../core/random.js';
import { NIGHT } from './config.js';

const TAU = Math.PI * 2;

/** Background stars + a few larger coloured "special" stars. */
function generateStars(vw, vh, isMobile) {
  const count = isMobile ? Math.floor(NIGHT.STAR_COUNT * 0.5) : NIGHT.STAR_COUNT;
  const stars = Array.from({ length: count }, () => ({
    x: rnd(0, vw), y: rnd(0, vh * .9),
    // ~65% tiny, ~30% small, rest large
    r: Math.random() < .65 ? .5 : Math.random() < .85 ? .9 : 1.3,
    base: .15 + rnd(0, .4), amp: .10 + rnd(0, .35),
    spd: .25 + rnd(0, 1.5), off: rnd(0, TAU),
  }));

  const specials = Array.from({ length: isMobile ? 3 : NIGHT.STAR_SPECIALS }, () => ({
    x: rnd(0, vw), y: rnd(0, vh * .75),
    r: 1.0 + rnd(0, .7),
    base: .30, amp: .45, spd: .4 + rnd(0, .9), off: rnd(0, TAU),
    col: Math.random() < .5 ? [255, 230, 140] : [160, 190, 255],   // warm | cool
  }));
  return { stars, specials };
}

/**
 * Thin vertical aurora rays, hue-swept green → violet left to right.
 * NOTE: `hue` divides by the *desktop* ray count even on mobile, so phones only
 * span the green–cyan end of the sweep. Kept as-is to preserve the shipped look.
 */
function generateRays(isMobile) {
  const rayCount = isMobile ? 30 : NIGHT.RAY_COUNT;
  return Array.from({ length: rayCount }, (_, i) => ({
    xf: .02 + (i / rayCount) * .96,
    hf: .16 + rnd(0, .52),
    hue: 148 + (i / NIGHT.RAY_COUNT) * 140,
    spd: .1 + rnd(0, .22),
    off: rnd(0, TAU),
    wob: (rnd(0, 1) - .5) * 22,
    w: 1.8 + rnd(0, 2.2),
  }));
}

/** One bright hero ribbon sweeping across the sky plus a few dimmer accents (cubic Béziers). */
function generateRibbons(vw, vh) {
  const ACCENT_COLORS = [
    [[0, 255, 165], [0, 200, 255]], [[90, 50, 255], [200, 0, 255]],
    [[0, 235, 210], [0, 160, 255]], [[255, 80, 200], [100, 0, 255]],
    [[0, 210, 120], [40, 255, 200]], [[180, 0, 255], [0, 150, 255]],
  ];
  const pickColors = () => ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

  const hx0 = vw * (.04 + rnd(0, .12)), hx1 = vw * (.72 + rnd(0, .26)), hy1 = vh * (.62 + rnd(0, .22));
  const ribbons = [{
    hero: true, x0: hx0, y0: vh * .01,
    cx1: hx0 + vw * (.12 + rnd(0, .12)), cy1: vh * (.22 + rnd(0, .18)),
    cx2: hx1 - vw * (.18 + rnd(0, .10)), cy2: vh * (.38 + rnd(0, .18)),
    x1: hx1, y1: hy1, w: vh * (.18 + rnd(0, .12)),
    cols: [[0, 255, 170], [0, 190, 255]],
    op: .34, tw: .12, spd: .13 + rnd(0, .08), ph: rnd(0, TAU),
  }];

  for (let i = 0; i < NIGHT.RIBBON_ACCENT_COUNT; i++) {
    const ax0 = vw * (.08 + rnd(0, .35)), ax1 = vw * (.45 + rnd(0, .50)), ay1 = vh * (.38 + rnd(0, .32));
    ribbons.push({
      hero: false, x0: ax0, y0: vh * (.02 + rnd(0, .08)),
      cx1: ax0 + vw * (.08 + rnd(0, .14)), cy1: vh * (.14 + rnd(0, .18)),
      cx2: ax1 - vw * (.12 + rnd(0, .10)), cy2: vh * (.26 + rnd(0, .16)),
      x1: ax1, y1: ay1, w: vh * (.06 + rnd(0, .06)),
      cols: pickColors(), op: .15 + rnd(0, .12), tw: .05 + rnd(0, .07),
      spd: .11 + rnd(0, .14), ph: rnd(0, TAU),
    });
  }
  return ribbons;
}

/** Full sky description: { star: {stars, specials}, ribbon: [...], rays: [...] }. */
export function generateSky(vw, vh, isMobile) {
  return {
    star: generateStars(vw, vh, isMobile),
    ribbon: generateRibbons(vw, vh),
    rays: generateRays(isMobile),
  };
}
