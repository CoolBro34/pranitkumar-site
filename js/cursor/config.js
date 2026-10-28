/** Cursor-orb tuning. All visual/feel parameters live here — edit freely. */
export const CURSOR = Object.freeze({
  // Orb radius (px) per state
  ORB_MOVE: 7,         // plain orb while moving
  ORB_IDLE: 10,        // at rest (blobs active)
  ORB_HOVER: 28,       // over a clickable

  // Follow feel (fraction of remaining distance covered per frame)
  LERP_POSITION: 0.18,
  LERP_RADIUS: 0.10,
  LERP_IN: 0.03,       // idle effect fades IN slowly…
  LERP_OUT: 0.22,      // …and snaps OUT when the mouse moves

  IDLE_DELAY_MS: 1200, // stillness before the idle effect starts

  // Bloom pulse: an expanding ring when idle/hover begins
  BLOOM_STRENGTH: 22,
  BLOOM_DECAY: 0.84,

  // Orbiting blobs (identical for idle and hover; only orb size differs)
  BLOB_COUNT: 4,
  BLOB_ORBIT_RADIUS: 24,
  BLOB_WIDTH: 9,       // semi-major axis
  BLOB_HEIGHT: 4,      // semi-minor axis
  BLOB_PULSE: 0.18,
  RING_SPEED_IDLE: 0.028,
  RING_SPEED_HOVER: 0.055,

  // Wobbly surface
  WAVE_POINTS: 64,
  WAVE_AMPLITUDE: 2.6,
  WAVE_FREQUENCY: 3,
  WAVE_SPEED: 0.055,
});

/** Interactive elements that trigger the hover state. */
export const CLICKABLE_SELECTOR = 'a, button, input, textarea, select, label, [role="button"]';

/** Fallback colours (blue) used if the theme tokens can't be read. */
export const DEFAULT_COLORS = Object.freeze({
  primary: '#2563eb', light: '#7aabf7', dark: '#1a4fd6', glow: '37,99,235',
});
