// clouds.js

const CLOUD = {
  // Cloud silhouette shape — border-radius randomness range
  BUMP_MIN: 38,
  BUMP_MAX: 68,

  // Float animation
  FLOAT_DURATION_MIN: 4.0,   // seconds
  FLOAT_DURATION_MAX: 7.5,
  FLOAT_DISTANCE_MIN: 4,     // px
  FLOAT_DISTANCE_MAX: 9,
  FLOAT_DELAY_MAX:    3.0,   // max stagger between cards
};

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCloudRadius() {
  const v = () => randBetween(CLOUD.BUMP_MIN, CLOUD.BUMP_MAX);
  return `${v()}% ${v()}% ${v()}% ${v()}% / ${v()}% ${v()}% ${v()}% ${v()}%`;
}

function applyCloudShapes() {
  const cards = document.querySelectorAll('.card, .skills-grid p, .grid-item');
  cards.forEach((card) => {
    card.style.borderRadius = randomCloudRadius();

    const duration = (randBetween(
      CLOUD.FLOAT_DURATION_MIN * 10,
      CLOUD.FLOAT_DURATION_MAX * 10
    ) / 10).toFixed(1);
    const distance = randBetween(CLOUD.FLOAT_DISTANCE_MIN, CLOUD.FLOAT_DISTANCE_MAX);
    const delay    = (randBetween(0, CLOUD.FLOAT_DELAY_MAX * 10) / 10).toFixed(1);

    card.style.setProperty('--float-duration', `${duration}s`);
    card.style.setProperty('--float-distance', `${distance}px`);
    card.style.setProperty('--float-delay',    `${delay}s`);
    card.classList.add('cloud-float');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyCloudShapes);
} else {
  applyCloudShapes();
}
