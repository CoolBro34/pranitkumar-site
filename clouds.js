// clouds.js
// ─────────────────────────────────────────────────────────────────
// CLOUD CONFIG
// ─────────────────────────────────────────────────────────────────
const CLOUD = {
  // Each value is [min, max] percentage for border-radius generation
  BUMP_MIN  : 40,   // minimum curve percentage
  BUMP_MAX  : 70,   // maximum curve percentage
  // Float animation
  FLOAT_DURATION_MIN : 4,    // seconds
  FLOAT_DURATION_MAX : 7,
  FLOAT_DISTANCE_MIN : 4,    // px up/down
  FLOAT_DISTANCE_MAX : 9,
  FLOAT_DELAY_MAX    : 3,    // max seconds between card start offsets
};
// ─────────────────────────────────────────────────────────────────

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generates a CSS border-radius string with 8 values (4 horizontal / 4 vertical)
// giving an organic cloud-like silhouette. Each call produces a unique shape.
function randomCloudRadius() {
  const v = () => randBetween(CLOUD.BUMP_MIN, CLOUD.BUMP_MAX);
  // Format: TL TR BR BL / TL TR BR BL
  return `${v()}% ${v()}% ${v()}% ${v()}% / ${v()}% ${v()}% ${v()}% ${v()}%`;
}

function applyCloudShapes() {
  const cards = document.querySelectorAll('.card, .skills-grid p, .grid-item');
  cards.forEach((card) => {
    card.style.borderRadius = randomCloudRadius();
    const duration = (randBetween(CLOUD.FLOAT_DURATION_MIN * 10, CLOUD.FLOAT_DURATION_MAX * 10) / 10).toFixed(1);
    const distance = randBetween(CLOUD.FLOAT_DISTANCE_MIN, CLOUD.FLOAT_DISTANCE_MAX);
    const delay    = (randBetween(0, CLOUD.FLOAT_DELAY_MAX * 10) / 10).toFixed(1);

    card.style.setProperty('--float-duration', `${duration}s`);
    card.style.setProperty('--float-distance', `${distance}px`);
    card.style.setProperty('--float-delay', `${delay}s`);
    card.classList.add('cloud-float');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyCloudShapes);
} else {
  applyCloudShapes();
}
