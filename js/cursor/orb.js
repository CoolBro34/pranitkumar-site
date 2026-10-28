/**
 * Custom cursor: a liquid orb that trails the pointer, wobbles and sheds
 * orbiting blobs when idle or hovering a clickable.
 *
 * Enabled only for fine pointers with hover support and no reduced-motion
 * preference; everyone else keeps the native cursor. Colours come from the
 * --cursor-* tokens in css/theme.css and refresh on `pk-theme-applied`.
 */
import { CURSOR as C, CLICKABLE_SELECTOR, DEFAULT_COLORS } from './config.js';

const TAU = Math.PI * 2;

function readThemeColors(previous = DEFAULT_COLORS) {
  const styles = getComputedStyle(document.documentElement);
  const token = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  return {
    primary: token('--cursor-primary', previous.primary),
    light:   token('--cursor-light',   previous.light),
    dark:    token('--cursor-dark',    previous.dark),
    glow:    token('--cursor-glow',    previous.glow),     // "r,g,b" for rgba()
  };
}

export function initCursor() {
  const wantsOrb = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
                   !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!wantsOrb) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'pk-cursor-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.documentElement.classList.add('pk-custom-cursor-enabled');

  let colors = readThemeColors();
  window.addEventListener('pk-theme-applied', () => { colors = readThemeColors(colors); });

  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  // ── State ─────────────────────────────────────────────────────────────────
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let orbX = mouseX, orbY = mouseY;
  let radius = C.ORB_MOVE, targetRadius = C.ORB_MOVE;
  let effect = 0, targetEffect = 0;           // 0 = moving (plain orb) … 1 = idle/hover (full effect)
  let prevEffect = 0, bloom = 0;
  let ringAngle = 0, wavePhase = 0;
  let isVisible = true, isHover = false;
  let idleTimer = null, frame = null;

  const startIdleCountdown = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { targetEffect = 1; targetRadius = C.ORB_IDLE; }, C.IDLE_DELAY_MS);
  };

  // ── Input ─────────────────────────────────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!isHover) { targetEffect = 0; targetRadius = C.ORB_MOVE; }
    startIdleCountdown();
  });
  document.addEventListener('mouseleave', () => { isVisible = false; });
  document.addEventListener('mouseenter', () => {
    isVisible = true;
    startIdleCountdown();
    if (frame === null) frame = requestAnimationFrame(animate);
  });

  // Delegated hover: also covers controls injected after load (theme buttons, popup).
  document.addEventListener('mouseover', (e) => {
    if (!e.target.closest?.(CLICKABLE_SELECTOR)) return;
    isHover = true; targetEffect = 1; targetRadius = C.ORB_HOVER;
    clearTimeout(idleTimer);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest?.(CLICKABLE_SELECTOR);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;   // still inside it
    isHover = false; targetEffect = 0; targetRadius = C.ORB_MOVE;
    startIdleCountdown();
  });

  // ── Drawing ───────────────────────────────────────────────────────────────
  /** Circle outline displaced by two sine waves → a living, wobbling edge. */
  function tracePath(cx, cy, r, phase, amp) {
    ctx.beginPath();
    for (let i = 0; i <= C.WAVE_POINTS; i++) {
      const theta = (i / C.WAVE_POINTS) * TAU;
      const d = Math.sin(theta * C.WAVE_FREQUENCY + phase) * amp +
                Math.sin(theta * (C.WAVE_FREQUENCY + 1) - phase * 1.3) * (amp * 0.4);
      const x = cx + (r + d) * Math.cos(theta), y = cy + (r + d) * Math.sin(theta);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /**
   * A blob "emitted" by the orb: its orbit grows from 0 → BLOB_ORBIT_RADIUS with
   * `strength`, and it only fades in once it crosses the orb's surface.
   */
  function drawBlob(cx, cy, angle, index, orbRadius, strength) {
    if (strength <= 0.005) return;
    const orbit = C.BLOB_ORBIT_RADIUS * strength;
    const alpha = Math.max(0, Math.min(1, (orbit - orbRadius * 0.4) / (orbRadius * 0.6 + 1)));
    if (alpha <= 0.01) return;

    const pulse = 1 + C.BLOB_PULSE * Math.sin(wavePhase * 2 + index);
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * orbit, cy + Math.sin(angle) * orbit);
    ctx.rotate(angle + Math.PI / 2);
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.ellipse(0, 0, C.BLOB_WIDTH * pulse, C.BLOB_HEIGHT * pulse, 0, 0, TAU);
    const g = ctx.createRadialGradient(0, -C.BLOB_HEIGHT * 0.3, 0, 0, 0, C.BLOB_WIDTH * pulse);
    g.addColorStop(0,   `rgba(${colors.glow},0.9)`);
    g.addColorStop(0.6, `rgba(${colors.glow},0.5)`);
    g.addColorStop(1,   `rgba(${colors.glow},0)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();                               // also resets globalAlpha
  }

  function drawPlainOrb() {
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius, 0, TAU);
    ctx.fillStyle = colors.primary;
    ctx.fill();
  }

  function drawLiquidOrb() {
    const drawR = radius + bloom;

    // Soft halo
    const halo = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, drawR * 2.8);
    halo.addColorStop(0, `rgba(${colors.glow},${(0.08 + 0.10 * effect).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${colors.glow},0)`);
    ctx.beginPath(); ctx.arc(orbX, orbY, drawR * 2.8, 0, TAU);
    ctx.fillStyle = halo; ctx.fill();

    for (let i = 0; i < C.BLOB_COUNT; i++) {
      drawBlob(orbX, orbY, ringAngle + (i / C.BLOB_COUNT) * TAU, i, drawR, effect);
    }

    // Body: cross-fade flat circle (out) → wobbling gradient sphere (in).
    ctx.globalAlpha = 1 - effect;
    ctx.beginPath(); ctx.arc(orbX, orbY, drawR, 0, TAU);
    ctx.fillStyle = colors.primary; ctx.fill();

    ctx.globalAlpha = effect;
    const amp = C.WAVE_AMPLITUDE * effect;

    tracePath(orbX, orbY, drawR, wavePhase, amp);
    const body = ctx.createRadialGradient(orbX - drawR * 0.25, orbY - drawR * 0.3, 0, orbX, orbY, drawR);
    body.addColorStop(0, colors.light); body.addColorStop(0.5, colors.primary); body.addColorStop(1, colors.dark);
    ctx.fillStyle = body; ctx.fill();

    tracePath(orbX, orbY, drawR, wavePhase, amp);                          // specular highlight
    const hx = orbX - drawR * 0.3, hy = orbY - drawR * 0.35;
    const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, drawR * 0.6);
    hl.addColorStop(0, 'rgba(255,255,255,0.6)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fill();

    ctx.globalAlpha = 1;
  }

  // ── Frame loop ────────────────────────────────────────────────────────────
  function animate() {
    // Ease toward targets
    orbX += (mouseX - orbX) * C.LERP_POSITION;
    orbY += (mouseY - orbY) * C.LERP_POSITION;
    radius += (targetRadius - radius) * C.LERP_RADIUS;
    effect += (targetEffect - effect) * (targetEffect > effect ? C.LERP_IN : C.LERP_OUT);

    // Bloom kicks whenever the effect is rising, then decays.
    const delta = effect - prevEffect;
    if (delta > 0) bloom += delta * C.BLOOM_STRENGTH;
    bloom *= C.BLOOM_DECAY;
    prevEffect = effect;

    ringAngle += C.RING_SPEED_IDLE + (C.RING_SPEED_HOVER - C.RING_SPEED_IDLE) * (isHover ? 1 : effect);
    wavePhase += C.WAVE_SPEED;

    frame = null;
    if (!isVisible) return;                      // pointer left the window: pause until it returns

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (effect < 0.005) drawPlainOrb(); else drawLiquidOrb();
    frame = requestAnimationFrame(animate);
  }

  startIdleCountdown();
  frame = requestAnimationFrame(animate);
}
