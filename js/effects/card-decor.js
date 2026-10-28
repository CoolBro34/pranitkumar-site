/**
 * Shared DOM plumbing for decorating cards (`CARD_SELECTOR`) with a background
 * layer — a blurred cloud by day, an aurora canvas by night.
 *
 * Decoration is *inserted first* inside the card and the card's real content
 * is lifted above it by wrapping each child node in `.pk-card-content`.
 * Wrapping is per node (not one wrapper for all) because some cards are CSS
 * grids (.skills-grid p) whose direct children must stay separate grid items.
 */
import { CARD_SELECTOR } from '../core/dom.js';

const DECOR_CLASSES = ['pk-cloud-bg', 'pk-aurora-canvas', 'pk-card-content'];

const isDecoration = (node) =>
  node.nodeType === Node.ELEMENT_NODE && DECOR_CLASSES.some((c) => node.classList.contains(c));
const isBlankText = (node) =>
  node.nodeType === Node.TEXT_NODE && !node.textContent.trim();

/** Idempotent: nodes that are decoration, already wrapped, or blank text are skipped. */
export function liftCardContent(card) {
  for (const node of Array.from(card.childNodes)) {
    if (isDecoration(node) || isBlankText(node)) continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'pk-card-content';
    card.insertBefore(wrapper, node);
    wrapper.appendChild(node);
  }
}

/** Remove whichever decoration a card has and stop its float animation. */
export function clearCardDecor(card) {
  card.querySelector('.pk-cloud-bg')?.remove();
  card.querySelector('.pk-aurora-canvas')?.remove();
}

export function clearAllCardDecor() {
  document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
    clearCardDecor(card);
    card.style.animation = '';
  });
}
