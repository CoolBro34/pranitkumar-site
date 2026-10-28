/**
 * Night-mode tuning constants. Imported by BOTH the main thread and the worker,
 * so there is a single copy (the original kept two that had to be hand-synced).
 */
export const NIGHT = Object.freeze({
  STAR_COUNT: 400,           // halved on mobile
  STAR_SPECIALS: 20,         // coloured twinkling stars (3 on mobile)
  RAY_COUNT: 65,             // vertical aurora "curtain" rays (30 on mobile)
  RIBBON_ACCENT_COUNT: 2,    // extra ribbons beside the hero ribbon

  CARD_FRAME_INTERVAL: 1 / 24,   // cards animate at 24 fps; the sky runs at ~60
  LOOP_INTERVAL_MS: 16,          // worker loop cadence (~60 fps)

  /** Normalised ellipses (centre + radii as fractions of card size) that make up a card's glow. */
  CARD_BLOBS: [
    { cx: .50, cy: .50, rx: .52, ry: .56 },
    { cx: .14, cy: .30, rx: .34, ry: .36 },
    { cx: .84, cy: .26, rx: .30, ry: .32 },
    { cx: .50, cy: .12, rx: .26, ry: .28 },
    { cx: .22, cy: .78, rx: .26, ry: .26 },
    { cx: .76, cy: .80, rx: .22, ry: .24 },
  ],

  /** Two-colour gradients (RGB) and a phase offset so neighbouring cards desync. */
  CARD_PALETTES: [
    { cols: [[  0, 255, 170], [  0, 160, 255]], ph: 0.0 },
    { cols: [[110,  50, 255], [  0, 210, 200]], ph: 2.2 },
    { cols: [[  0, 200, 255], [140,   0, 255]], ph: 4.5 },
    { cols: [[  0, 255, 120], [ 40, 200, 255]], ph: 1.1 },
    { cols: [[200,   0, 255], [  0, 210, 200]], ph: 3.3 },
    { cols: [[150,   0, 255], [  0, 180, 255]], ph: 5.5 },
    { cols: [[  0, 255, 170], [  0, 160, 255]], ph: 0.7 },
    { cols: [[  0, 200, 255], [100,   0, 200]], ph: 2.8 },
  ],
});
