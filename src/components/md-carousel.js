/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-carousel>
 *
 * Spec: research/MD3E-content-selection-research.md §8 (Carousel)
 *   Standart M3 (multi-browse, hero, centered), 280dp height, CornerExtraLarge (28dp),
 *   continuous focal width morphing on scroll / item click, smooth snap physics,
 *   keyboard left/right navigation, pointer drag vs click threshold.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - XSS sanitization and safe JSON items parsing
 *   - Memory safety via AbortSignal
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    width: 100%;
    outline: none;
    user-select: none;
    box-sizing: border-box;
  }

  .carousel-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    padding: 8px 0;
  }

  .carousel-track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding: 8px 16px;
    align-items: center;
    -webkit-overflow-scrolling: touch;
  }
  .carousel-track::-webkit-scrollbar { display: none; }

  .carousel-card {
    position: relative;
    flex-shrink: 0;
    height: 280px;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    cursor: pointer;
    outline: none;
    overflow: hidden;
    scroll-snap-align: start;
    transition:
      width var(--md-sys-motion-duration-long3, 650ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.35, 1.2, 0.25, 1.0)),
      box-shadow var(--md-sys-motion-duration-medium1, 300ms) ease;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 24px;
    box-sizing: border-box;
    color: #FFFFFF;
  }
  .carousel-card:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  /* Responsive Focal Widths (Multi-Browse Spec §8) */
  .carousel-card.hero {
    width: 280px;
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.2));
  }
  .carousel-card.medium {
    width: 160px;
  }
  .carousel-card.small {
    width: 76px;
  }

  .card-bg {
    position: absolute;
    inset: 0;
    z-index: 1;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: transform 600ms cubic-bezier(0.2, 0, 0, 1);
  }
  .carousel-card:hover .card-bg {
    transform: scale(1.06);
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%);
    pointer-events: none;
    transition: opacity 500ms ease;
  }

  .card-content {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition:
      opacity var(--md-sys-motion-duration-medium2, 400ms) ease,
      transform var(--md-sys-motion-duration-long3, 650ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.35, 1.2, 0.25, 1.0));
  }

  .tag {
    align-self: flex-start;
    font: var(--md-sys-typescale-label-small-emphasized, 700 11px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-small-emphasized-tracking, 0.5px);
    text-transform: uppercase;
    background: rgba(255,255,255,0.25);
    backdrop-filter: blur(8px);
    padding: 4px 8px;
    border-radius: 9999px;
    margin-bottom: 6px;
  }

  .title {
    font: var(--md-sys-typescale-title-large, 400 22px/28px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-large-tracking, 0px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 300ms ease, max-height 400ms ease;
    max-height: 24px;
  }

  .carousel-card.small .card-content {
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
  }
  .carousel-card.medium .subtitle {
    opacity: 0;
    max-height: 0;
    pointer-events: none;
  }
`;

const carouselSheet = createComponentSheet(defaultStyle);

const DEMO_ITEMS = [
  {
    id: 1,
    title: 'La Familia',
    subtitle: 'Summer trip 2026',
    bg: '#4A3B69',
    tag: 'Featured',
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    title: 'Festivals',
    subtitle: 'Live music & art',
    bg: '#2D5B6B',
    tag: 'Trending',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    title: 'Plantas',
    subtitle: 'Urban garden & green',
    bg: '#2E604A',
    tag: 'Nature',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    title: 'Architecture',
    subtitle: 'Modern facades & lines',
    bg: '#5A4A35',
    tag: 'Design',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    title: 'Ocean View',
    subtitle: 'Coastal sunsets & tides',
    bg: '#2A4D6E',
    tag: 'Travel',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    title: 'Last Month',
    subtitle: 'Memories archive 2026',
    bg: '#6B432D',
    tag: 'Archive',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'
  }
];

export class MdCarousel extends HTMLElement {
  static get observedAttributes() {
    return [
      'layout', 'active-index', 'items', 'preferred-item-width',
      'item-spacing', 'user-scroll-enabled', 'min-small-item-width',
      'max-small-item-width', 'item-width', 'max-item-width'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, carouselSheet);
    this._activeIndex = 0;
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'active-index') {
      const idx = parseInt(newVal, 10);
      if (!isNaN(idx)) this.setActiveIndex(idx);
    } else if (name === 'items' || name === 'layout' || name === 'item-spacing' || name === 'preferred-item-width' || name === 'item-width') {
      this.render();
      this._setup();
      this._sync();
    }
  }

  get itemsList() {
    const raw = this.getAttribute('items');
    if (!raw) return DEMO_ITEMS;
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEMO_ITEMS;
  }

  get layout() { return this.getAttribute('layout') || 'multi-browse'; }
  get activeIndex() { return this._activeIndex; }

  get preferredItemWidth() {
    const w = parseFloat(this.getAttribute('preferred-item-width') || this.getAttribute('item-width'));
    return isNaN(w) ? 220 : w;
  }
  set preferredItemWidth(v) {
    if (v === null || v === undefined) {
      this.removeAttribute('preferred-item-width');
      this.removeAttribute('item-width');
    } else {
      this.setAttribute('preferred-item-width', String(v));
    }
  }

  get itemWidth() { return this.preferredItemWidth; }
  set itemWidth(v) { this.preferredItemWidth = v; }

  get itemSpacing() {
    const s = parseFloat(this.getAttribute('item-spacing'));
    return isNaN(s) ? 8 : s;
  }
  set itemSpacing(v) {
    if (v === null || v === undefined) this.removeAttribute('item-spacing');
    else this.setAttribute('item-spacing', String(v));
  }

  get userScrollEnabled() { return this.getAttribute('user-scroll-enabled') !== 'false'; }
  set userScrollEnabled(v) {
    if (v) this.setAttribute('user-scroll-enabled', 'true');
    else this.setAttribute('user-scroll-enabled', 'false');
  }

  get minSmallItemWidth() {
    const w = parseFloat(this.getAttribute('min-small-item-width'));
    return isNaN(w) ? 40 : w;
  }
  set minSmallItemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('min-small-item-width');
    else this.setAttribute('min-small-item-width', String(v));
  }

  get maxSmallItemWidth() {
    const w = parseFloat(this.getAttribute('max-small-item-width'));
    return isNaN(w) ? 56 : w;
  }
  set maxSmallItemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('max-small-item-width');
    else this.setAttribute('max-small-item-width', String(v));
  }

  get maxItemWidth() {
    const w = parseFloat(this.getAttribute('max-item-width'));
    return isNaN(w) ? 400 : w;
  }
  set maxItemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('max-item-width');
    else this.setAttribute('max-item-width', String(v));
  }

  setActiveIndex(index) {
    const items = this.itemsList;
    if (index < 0 || index >= items.length) return;
    this._activeIndex = index;
    this._updateCards(true);
    this.dispatchEvent(new CustomEvent('change', {
      detail: { index, item: items[index] },
      bubbles: true,
      composed: true
    }));
  }

  _updateCards(isUserInteraction = false) {
    const items = this.itemsList;
    const cards = this.shadowRoot.querySelectorAll('.carousel-card');
    cards.forEach((card, idx) => {
      const isHero = idx === this._activeIndex;
      const isMedium = idx === this._activeIndex + 1 || (this._activeIndex === items.length - 1 && idx === this._activeIndex - 1);
      
      card.classList.toggle('hero', isHero);
      card.classList.toggle('medium', isMedium && !isHero);
      card.classList.toggle('small', !isHero && !isMedium);
      card.setAttribute('aria-selected', isHero ? 'true' : 'false');
    });

    const track = this.shadowRoot.querySelector('.carousel-track');
    const activeCard = cards[this._activeIndex];
    if (track && activeCard && isUserInteraction) {
      const targetScrollLeft = activeCard.offsetLeft - (track.clientWidth - activeCard.clientWidth) / 2;
      track.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const track = this.shadowRoot.querySelector('.carousel-track');
    if (!track) return;

    const items = this.itemsList;
    const cards = this.shadowRoot.querySelectorAll('.carousel-card');
    cards.forEach((card, idx) => {
      let isDragging = false;
      let startX = 0;

      card.addEventListener('pointerdown', (e) => {
        startX = e.clientX;
        isDragging = false;
      }, { signal });

      card.addEventListener('pointermove', (e) => {
        if (Math.abs(e.clientX - startX) > 8) isDragging = true;
      }, { signal });

      card.addEventListener('click', () => {
        if (!isDragging) {
          this.setActiveIndex(idx);
        }
      }, { signal });

      bindPress(card, {
        disabled: () => false,
        onPress: () => pressScale(card, 0.98, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(card, 0.98, 'expressiveSpatialMedium'),
        signal
      });
    });

    this.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.setActiveIndex(Math.min(items.length - 1, this._activeIndex + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.setActiveIndex(Math.max(0, this._activeIndex - 1));
      }
    }, { signal });
  }

  _sync() {
    this._updateCards();
  }

  render() {
    const items = this.itemsList;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="carousel-container" role="region" aria-label="Photo Carousel">
        <div class="carousel-track" role="listbox" tabindex="0" aria-label="Carousel items">
          ${items.map((it, idx) => `
            <div class="carousel-card ${idx === 0 ? 'hero' : (idx === 1 ? 'medium' : 'small')}"
              data-index="${idx}"
              role="option"
              aria-selected="${idx === 0 ? 'true' : 'false'}"
              tabindex="0"
              aria-label="${it.badge ? `${escapeHtml(it.badge)} - ` : ''}${escapeHtml(it.title || '')} - ${escapeHtml(it.subtitle || '')}">
              <div class="card-bg" style="background-color: ${escapeHtml(it.bg || '#333')}; ${it.image ? `background-image: url('${escapeHtml(it.image)}');` : ''}"></div>
              <div class="card-overlay"></div>
              <div class="card-content">
                ${it.tag ? `<span class="tag">${escapeHtml(it.tag)}</span>` : ''}
                <span class="title">${escapeHtml(it.title || '')}</span>
                <span class="subtitle">${escapeHtml(it.subtitle || '')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-carousel')) {
  customElements.define('md-carousel', MdCarousel);
}
