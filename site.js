const nav = document.querySelector('.site-nav');
const toggle = document.querySelector('.menu-toggle');
const links = [...document.querySelectorAll('.site-nav a')];
const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

if (toggle) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`));
    }
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
sections.forEach(s => observer.observe(s));

fetch('images.json')
  .then(response => response.json())
  .then(images => {
    const grid = document.getElementById('grid');
    if (!grid) return;
    images.forEach(src => {
      const wrapper = document.createElement('figure');
      wrapper.className = 'grid-item';
      const image = document.createElement('img');
      image.className = 'gallery-image';
      image.src = src;
      image.alt = 'Gallery photograph';
      image.loading = 'lazy';
      wrapper.appendChild(image);
      grid.appendChild(wrapper);
    });
  })
  .catch(() => {
    const grid = document.getElementById('grid');
    if (grid) grid.textContent = 'Unable to load gallery images.';
  });

document.getElementById('year').textContent = new Date().getFullYear();
