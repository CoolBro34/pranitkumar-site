/**
 * fun.html — standalone prank page (not part of the main module graph).
 *
 * Every few seconds a batch of fake "opportunity" popups spawns. They are
 * draggable (mouse + touch), auto-dismiss after 9 s, and every call-to-action
 * leads to the same Rickroll URL. None of these are real offers — keep them
 * isolated from any real application or recruiting flow.
 */

// ── Config ──────────────────────────────────────────────────────────────────
const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&autoplay=1';
const POPUP_W = 270;                 // px — used for clamping while dragging / spawning
const POPUP_H = 160;                 // px — approximate height for the same purpose
const FIRST_BATCH_DELAY_MS = 2000;
const BATCH_INTERVAL_MS = 2000;
const BATCH_STAGGER_MS = 200;        // popups in a batch animate in one after another
const BATCH_SIZE = 3;
const POPUP_LIFETIME_MS = 9000;

const POPUP_TEMPLATES = [
  { label: 'NEW OPPORTUNITY',   title: 'Exclusive Internship at NASA JPL',  body: 'Your profile matched our spacecraft systems division. One seat remaining.',        btn: 'Apply Now ↗' },
  { label: 'SCHOLARSHIP ALERT', title: '$50,000 Aerospace Grant',            body: 'Pre-selected based on your TechRise achievement. Claim before midnight.',          btn: 'Claim Grant ↗' },
  { label: 'MIT ADMISSIONS',    title: 'Early Decision Preview',             body: 'A message from the admissions office regarding your application status.',          btn: 'View Letter ↗' },
  { label: 'SPACEX RECRUITING', title: 'Internship Offer Inside',            body: 'Elon personally shortlisted your profile. Limited spots for summer 2026.',         btn: 'See Offer ↗' },
  { label: 'URGENT UPDATE',     title: 'Your AP Score Is Available',         body: 'All five junior year AP scores just released. Spoiler: perfect 5s.',              btn: 'View Scores ↗' },
  { label: 'PRESS RELEASE',     title: 'Featured in Space.com',              body: 'A journalist wants to profile your TechRise payload work. Respond today.',        btn: 'Read Article ↗' },
  { label: 'CONCERT NOTICE',    title: 'Solo Percussion Offer',              body: 'Phoenix Symphony wants you as featured soloist for the spring gala.',              btn: 'Accept Role ↗' },
  { label: 'ROBOT NEWS',        title: 'FTC World Championship',             body: 'Your robot has been retroactively invited to the world stage. Pack your bags.',    btn: 'Register ↗' },
  { label: 'SECURITY ALERT',    title: 'Someone Viewed Your Resume',         body: 'A recruiter from Lockheed Martin downloaded your CV 4 minutes ago.',              btn: 'See Who ↗' },
  { label: 'CALTECH PORTAL',    title: 'Application Update',                 body: 'Your Caltech portal status has changed. Log in to view your decision.',           btn: 'Log In ↗' },
  { label: 'NASA ANNOUNCEMENT', title: 'TechRise Payload Data Ready',        body: 'Your suborbital flight data has finished processing. Download now.',              btn: 'Download ↗' },
];

// ── Topbar ──────────────────────────────────────────────────────────────────
const topbar = document.getElementById('topbar');
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 8));

// ── Template picking: shuffle-bag so every template shows once before any repeats ──
let usedTemplates = [];
function pickTemplate() {
  if (usedTemplates.length >= POPUP_TEMPLATES.length) usedTemplates = [];
  const remaining = POPUP_TEMPLATES.filter((_, i) => !usedTemplates.includes(i));
  const index = POPUP_TEMPLATES.indexOf(remaining[Math.floor(Math.random() * remaining.length)]);
  usedTemplates.push(index);
  return POPUP_TEMPLATES[index];
}

function randomPosition() {
  const maxX = window.innerWidth - POPUP_W - 16;
  const maxY = window.innerHeight - POPUP_H - 16;
  return {
    left: Math.floor(Math.random() * Math.max(maxX, 10)) + 8,
    top:  Math.floor(Math.random() * Math.max(maxY, 10)) + 8,
  };
}

// ── Dragging ────────────────────────────────────────────────────────────────
// One shared controller + one set of document listeners, instead of per popup.
let activeDrag = null;

function beginDrag(el, pointerType, clientX, clientY) {
  activeDrag = {
    el, pointerType,
    startX: clientX, startY: clientY,
    origLeft: parseInt(el.style.left, 10),
    origTop: parseInt(el.style.top, 10),
  };
  el.classList.add('dragging');
}

function moveDrag(clientX, clientY, pointerType) {
  if (!activeDrag || activeDrag.pointerType !== pointerType) return;
  const { el, startX, startY, origLeft, origTop } = activeDrag;
  // Keep the popup fully inside the viewport.
  el.style.left = Math.max(0, Math.min(window.innerWidth  - POPUP_W, origLeft + clientX - startX)) + 'px';
  el.style.top  = Math.max(0, Math.min(window.innerHeight - POPUP_H, origTop  + clientY - startY)) + 'px';
}

function endDrag(pointerType) {
  if (!activeDrag || activeDrag.pointerType !== pointerType) return;
  activeDrag.el.classList.remove('dragging');
  activeDrag = null;
}

function makeDraggable(el) {
  const header = el.querySelector('.rr-header');

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.rr-close')) return;
    beginDrag(el, 'mouse', e.clientX, e.clientY);
    e.preventDefault();                                   // no text selection while dragging
  });
  header.addEventListener('touchstart', (e) => {
    if (e.target.closest('.rr-close')) return;
    const touch = e.touches[0];
    if (touch) beginDrag(el, 'touch', touch.clientX, touch.clientY);
  }, { passive: true });
}

document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY, 'mouse'));
document.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  if (touch) moveDrag(touch.clientX, touch.clientY, 'touch');
}, { passive: true });
document.addEventListener('mouseup',  () => endDrag('mouse'));
document.addEventListener('touchend', () => endDrag('touch'));

// ── Popup lifecycle ─────────────────────────────────────────────────────────
function dismissPopup(el) {
  if (!el.isConnected || el.classList.contains('dying')) return;
  if (activeDrag?.el === el) endDrag(activeDrag.pointerType);
  el.classList.add('dying');                              // CSS plays popOut, then we remove it
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

function spawnPopup() {
  const template = pickTemplate();
  const { left, top } = randomPosition();

  const el = document.createElement('div');
  el.className = 'rr-popup';
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.innerHTML = `
    <div class="rr-header">
      <div>
        <p class="rr-label">${template.label}</p>
        <p class="rr-title">${template.title}</p>
      </div>
      <button class="rr-close" aria-label="Dismiss">✕</button>
    </div>
    <p class="rr-body">${template.body}</p>
    <a class="rr-btn" href="${RICKROLL_URL}" target="_blank" rel="noopener">${template.btn}</a>`;

  document.body.appendChild(el);
  makeDraggable(el);
  el.querySelector('.rr-close').addEventListener('click', () => dismissPopup(el));
  setTimeout(() => dismissPopup(el), POPUP_LIFETIME_MS);
}

function spawnBatch() {
  for (let i = 0; i < BATCH_SIZE; i++) setTimeout(spawnPopup, i * BATCH_STAGGER_MS);
}

setTimeout(() => {
  spawnBatch();
  setInterval(spawnBatch, BATCH_INTERVAL_MS);
}, FIRST_BATCH_DELAY_MS);
