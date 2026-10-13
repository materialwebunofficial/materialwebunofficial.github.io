import {FrameResizeObserver} from '../utils/resize-observer.js';
/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-carousel>
 *
 * Port of AndroidX a095da93f8e98dea8748ceed79ea8427aade245f
 * compose/material3/carousel (HorizontalMultiBrowseCarousel,
 * HorizontalUncontainedCarousel, HorizontalCenteredHeroCarousel, Carousel,
 * Modifier.carouselItem, CarouselDefaults; keyline math in carousel-keylines.js)
 * and the foundation pager it scrolls with (Pager, PagerState,
 * PagerSnapDistance, PagerSnapLayoutInfoProvider, SnapFlingBehavior).
 *
 * - Items. Every child element is an item, as the Compose content lambda is.
 *   Items are laid out end to end at the strategy's large item size with the
 *   item spacing (the pager), then each is masked to its interpolated keyline
 *   size around its center and translated so masked items meet. The mask has
 *   the Extra Large shape (maskClip(MaterialTheme.shapes.extraLarge) in the
 *   samples). The focal item is drawn in front; z order falls off with the
 *   distance from the current item.
 * - Layouts. layout="multi-browse" (default; preferred-item-width),
 *   "uncontained" (item-width) and "hero" (centered hero; preferred-item-width
 *   optional). item-spacing (0dp), min-small-item-width (40dp),
 *   max-small-item-width (56dp) and content-padding (0dp, start and end) are
 *   CarouselDefaults.
 * - Scrolling. A drag scrolls the pager past the touch slop. Multi-browse and
 *   hero release with singleAdvanceFlingBehavior: PagerSnapDistance.atMost(1),
 *   the pager's snapping bounds and positional thresholds, and a
 *   StiffnessMediumLow critically damped spring from the release velocity.
 *   Uncontained releases with noSnapFlingBehavior: Android's spline decay.
 *   fling-behavior="multi-browse" selects multiBrowseFlingBehavior for the
 *   multi-browse and hero layouts: PagerSnapLayoutInfoProvider's approach
 *   offset to the decay's suggested page, a decay (or snap spring) approach
 *   to one page before it, then the snap with the velocity reached.
 * - Web bindings. A horizontal wheel or trackpad scrolls directly and settles
 *   like a release without velocity. Arrow keys on the carousel animate to the
 *   next or previous item (animateScrollToItem with the default spring), and
 *   focus moving into an item brings it to its resting position. Items outside
 *   the viewport are hidden from focus and assistive technology, as the pager
 *   does not compose them.
 * - Multi-aspect. layout="multi-aspect" is the LazyRow of the source's
 *   MultiAspectCarouselRowSample with Modifier.carouselParallaxScrollEffect
 *   (CarouselParallaxScrollEffect.kt, carousel-parallax.js) on every item.
 *   Items keep their own widths (the child's CSS width, an image's aspect
 *   ratio at the carousel's height, or the items attribute's width) and are
 *   laid out end to end with item-spacing and content-padding. They scroll
 *   without snapping (the list's default spline decay fling); entering or
 *   leaving the viewport, an item is masked with the Extra Large shape and its
 *   content translated by the parallax distance, both from its aspect ratio
 *   against the list's height. As in the source, mask and translation are
 *   physical (left-based) in RTL too. currentItem is the list's
 *   firstVisibleItemIndex; animateScrollToItem is LazyLayoutScrollScope's, and
 *   focus brings an item into view with the default BringIntoViewSpec.
 *
 * The items attribute (JSON [{ image, title, width }]) is a convenience that
 * creates image items; children take precedence.
 */

import {
  Strategy, multiBrowseKeylineList, uncontainedKeylineList, heroKeylineList,
  getSnapPositionOffset, calculateCurrentScrollOffset, calculateMaxScrollOffset, carouselItemPlacement, CarouselDefaults,
} from './carousel-keylines.js';
import { calculateParallaxItemInfo } from './carousel-parallax.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';
import { AndroidFlingDecay } from '../motion/android-fling.js';
import { pointerSlop } from '../motion/touch-slop.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { springDuration } from '../motion/spring-duration.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { delegateHostAria } from '../utils/host-aria.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

// PagerDefaults / SnapFlingBehavior constants (one CSS pixel per dp).
const MIN_FLING_VELOCITY = 400;          // MinFlingVelocityDp
const DEFAULT_POSITION_THRESHOLD = 56;   // DefaultPositionThreshold
const SNAP_POSITIONAL_THRESHOLD = 0.5;
const MAX_PAGES_FOR_ANIMATE_SCROLL = 3;
const MAX_FLING_VELOCITY = 8000;
// spring(stiffness = StiffnessMediumLow, visibilityThreshold = Int.VisibilityThreshold)
const SNAP_SPRING = { dampingRatio: 1, stiffness: 400, visibilityThreshold: 1 };
// spring(): animateScrollToItem's default spec.
const SCROLL_SPRING = { dampingRatio: 1, stiffness: 1500, visibilityThreshold: 0.01 };
const WHEEL_SETTLE_DELAY = 100;
// LazyLayoutScrollScope.animateScrollToItem: TargetDistance, BoundDistance,
// MinimumDistance (dp) and LazyListState's NumberOfItemsToTeleport.
const TARGET_DISTANCE = 2500, BOUND_DISTANCE = 1500, MINIMUM_DISTANCE = 50, ITEMS_FOR_TELEPORT = 100;

/** BringIntoViewSpec.defaultCalculateScrollDistance. */
function bringIntoViewDistance(offset, size, containerSize) {
  const leadingEdge = offset, trailingEdge = offset + size;
  if (leadingEdge >= 0 && trailingEdge <= containerSize) return 0;
  if (leadingEdge < 0 && trailingEdge > containerSize) return 0;
  return Math.abs(leadingEdge) < Math.abs(trailingEdge - containerSize) ? leadingEdge : trailingEdge - containerSize;
}

const defaultStyle = `
  :host {
    display: block;
    position: relative;
    -webkit-tap-highlight-color: transparent;
  }
  :host([hidden]) { display: none; }
  .viewport {
    position: relative;
    display: grid;
    height: 100%;
    overflow: hidden;
    outline: none;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }
  .viewport:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
  }
  .item {
    grid-area: 1 / 1;
    position: relative;
    justify-self: start;
    min-width: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
  .item[data-offscreen] { visibility: hidden; }
  ::slotted(*), .item > img {
    display: block;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    margin: 0;
  }
  ::slotted(img), .item > img { object-fit: cover; -webkit-user-drag: none; }
  /* LazyRow items size themselves. */
  :host([layout="multi-aspect"]) ::slotted(*), :host([layout="multi-aspect"]) .item > img { width: auto; }
`;

const carouselSheet = createComponentSheet(defaultStyle);

const number = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class MdCarousel extends HTMLElement {
  static get observedAttributes() {
    return [
      'layout', 'active-index', 'items', 'preferred-item-width', 'item-width',
      'item-spacing', 'user-scroll-enabled', 'min-small-item-width',
      'max-small-item-width', 'content-padding', 'aria-label',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
    adoptSheet(this.shadowRoot, carouselSheet);
    this._rendered = false;
    this._abortController = null;
    this._scroll = 0;
    this._strategy = Strategy.Empty;
    this._items = [];
    this._motion = null;
    this._drag = null;
    this._currentPage = 0;
    this._pendingPage = null;
    this._list = null;
  }

  /* ------------------------------------------------------------- properties -- */

  /** 'multi-browse' (default), 'uncontained', 'hero' or 'multi-aspect'. */
  get layout() {
    const value = this.getAttribute('layout');
    return value === 'uncontained' || value === 'hero' || value === 'multi-aspect' ? value : 'multi-browse';
  }
  set layout(v) { this.setAttribute('layout', v); }

  get preferredItemWidth() { return number(this.getAttribute('preferred-item-width') ?? this.getAttribute('item-width'), 220); }
  set preferredItemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('preferred-item-width');
    else this.setAttribute('preferred-item-width', String(v));
  }

  /** HorizontalUncontainedCarousel's itemWidth. */
  get itemWidth() { return number(this.getAttribute('item-width') ?? this.getAttribute('preferred-item-width'), 220); }
  set itemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('item-width');
    else this.setAttribute('item-width', String(v));
  }

  get itemSpacing() { return number(this.getAttribute('item-spacing'), CarouselDefaults.ItemSpacing); }
  set itemSpacing(v) {
    if (v === null || v === undefined) this.removeAttribute('item-spacing');
    else this.setAttribute('item-spacing', String(v));
  }

  get minSmallItemWidth() { return number(this.getAttribute('min-small-item-width'), CarouselDefaults.MinSmallItemSize); }
  set minSmallItemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('min-small-item-width');
    else this.setAttribute('min-small-item-width', String(v));
  }

  get maxSmallItemWidth() { return number(this.getAttribute('max-small-item-width'), CarouselDefaults.MaxSmallItemSize); }
  set maxSmallItemWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('max-small-item-width');
    else this.setAttribute('max-small-item-width', String(v));
  }

  /** Start and end content padding, in dp. */
  get contentPadding() { return Math.max(0, number(this.getAttribute('content-padding'), 0)); }
  set contentPadding(v) {
    if (v === null || v === undefined) this.removeAttribute('content-padding');
    else this.setAttribute('content-padding', String(v));
  }

  /**
   * The release behavior of the pager layouts: 'single-advance' (default,
   * CarouselDefaults.singleAdvanceFlingBehavior) or 'multi-browse'
   * (CarouselDefaults.multiBrowseFlingBehavior). Uncontained always uses
   * noSnapFlingBehavior and multi-aspect the list's decay.
   */
  get flingBehavior() { return this.getAttribute('fling-behavior') === 'multi-browse' ? 'multi-browse' : 'single-advance'; }
  set flingBehavior(v) { this.setAttribute('fling-behavior', v); }

  get userScrollEnabled() { return this.getAttribute('user-scroll-enabled') !== 'false'; }
  set userScrollEnabled(v) { this.setAttribute('user-scroll-enabled', v ? 'true' : 'false'); }

  /** CarouselState.currentItem: the item closest to its resting position. */
  get activeIndex() { return this._currentPage; }
  set activeIndex(v) { this.setAttribute('active-index', String(v)); }
  get currentItem() { return this._currentPage; }

  get itemsList() {
    const parsed = safeJsonParse(this.getAttribute('items') || '', null);
    return Array.isArray(parsed) ? parsed : [];
  }

  /* -------------------------------------------------------------- lifecycle -- */

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      const initial = parseInt(this.getAttribute('active-index'), 10);
      this._pendingPage = Number.isFinite(initial) ? initial : 0;
    }
    this._bind();
    this._measure();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._stopMotion();
    this._drag = null;
    clearTimeout(this._wheelTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._rendered || oldValue === newValue) return;
    if (name === 'active-index') {
      const index = parseInt(newValue, 10);
      if (Number.isFinite(index) && index !== this._currentPage) this.animateScrollToItem(index);
      return;
    }
    if (name === 'aria-label') { this._labelViewport(); return; }
    if (name === 'items') { this.render(); this._bind(); }
    if (name === 'user-scroll-enabled') return;
    this._measure();
  }

  /* ----------------------------------------------------------------- public -- */

  /** CarouselState.scrollToItem (LazyListState.scrollToItem for multi-aspect). */
  scrollToItem(index) {
    this._stopMotion();
    const count = this._items.length;
    if (!count) return;
    const target = Math.min(Math.max(0, Math.trunc(index)), count - 1);
    if (this._list) this._scroll = this._listItemScroll(target, 0);
    else this._setScrollForPage(target, 0);
    this._draw();
  }

  /** CarouselState.animateScrollToItem with the default spring. */
  animateScrollToItem(index) {
    if (this._list) { this._listAnimateScrollToItem(index); return; }
    const count = this._items.length;
    if (!count || !this._strategy.isValid) { this._pendingPage = index; return; }
    const target = Math.min(Math.max(0, Math.trunc(index)), count - 1);
    if (target === this._currentPage && Math.abs(this._currentPageOffsetFraction()) < 1e-6) return;
    this._stopMotion();
    // Far targets out of view: pre-jump to one viewport away first.
    const pages = this._visiblePages();
    const first = pages[0]?.index ?? 0, last = pages.at(-1)?.index ?? 0;
    const forward = target > first;
    if (((forward && target > last) || (!forward && target < first)) && Math.abs(target - first) >= MAX_PAGES_FOR_ANIMATE_SCROLL) {
      const visible = last - first + 1;
      const preJump = forward ? Math.max(target - visible, first) : Math.min(target + visible, first);
      this._scrollTo(preJump * this._pageStride());
    }
    const distance = this._pageOffset(target) - this._snapOffset(target);
    this._animateBy(distance, 0, SCROLL_SPRING);
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="viewport" part="viewport" role="region" aria-roledescription="carousel" tabindex="0"></div>
    `;
    this._viewport = this.shadowRoot.querySelector('.viewport');
    this._labelViewport();
    this._buildItems();
  }

  /* ------------------------------------------------------------------ items -- */

  _labelViewport() {
    this._viewport?.setAttribute('aria-label', this.getAttribute('aria-label') || 'Carousel');
  }

  /** One masked box per item: a child element, or an image from the items attribute. */
  _buildItems() {
    const children = [...this.children];
    const sources = children.length ? children : this.itemsList;
    for (const item of this._items) this._resizeObserver?.unobserve(item.box);
    this._viewport.replaceChildren();
    this._items = sources.map((source, index) => {
      const box = document.createElement('div');
      box.className = 'item';
      box.setAttribute('part', 'item');
      box.setAttribute('role', 'group');
      box.setAttribute('aria-roledescription', 'slide');
      box.setAttribute('aria-label', `${index + 1} of ${sources.length}`);
      if (source instanceof Element) {
        const slot = document.createElement('slot');
        box.append(slot);
        this._viewport.append(box);
        slot.assign(source);
      } else {
        const width = Number(source?.width);
        const size = Number.isFinite(width) && width > 0 ? ` style="width:${width}px"` : '';
        box.innerHTML = source?.image ? `<img src="${escapeHtml(source.image)}" alt="${escapeHtml(source.title || source.alt || '')}" draggable="false"${size}>` : '';
        this._viewport.append(box);
      }
      return { box, mask: -1, left: NaN, z: -1, hidden: null, start: 0, size: 0 };
    });
  }

  /* ------------------------------------------------------------- measuring -- */

  /** CarouselPageSize.calculateMainAxisPageSize: the strategy for the viewport. */
  _measure() {
    if (!this._viewport) return;
    const availableSpace = this._viewport.clientWidth;
    this._rtl = getComputedStyle(this).direction === 'rtl';
    if (this.layout === 'multi-aspect') { this._measureList(availableSpace); return; }
    if (this._list) {
      for (const item of this._items) { this._resizeObserver?.unobserve(item.box); item.mask = null; }
      this._list = null;
      this._scroll = 0;
    }
    const previousPage = this._strategy.isValid ? this._currentPage : null;
    const previousFraction = this._strategy.isValid ? this._currentPageOffsetFraction() : 0;
    const itemCount = this._items.length;
    const itemSpacing = Math.round(this.itemSpacing);
    const padding = this.contentPadding;
    let keylines;
    if (this.layout === 'uncontained') {
      keylines = uncontainedKeylineList({ carouselMainAxisSize: availableSpace, itemSize: this.itemWidth, itemSpacing });
    } else if (this.layout === 'hero') {
      const preferred = this.hasAttribute('preferred-item-width') ? this.preferredItemWidth : null;
      keylines = heroKeylineList({
        carouselMainAxisSize: availableSpace, preferredItemSize: preferred, itemSpacing, itemCount, isCentered: true,
        minSmallItemSize: this.minSmallItemWidth, maxSmallItemSize: this.maxSmallItemWidth,
      });
    } else {
      keylines = multiBrowseKeylineList({
        carouselMainAxisSize: availableSpace, preferredItemSize: this.preferredItemWidth, itemSpacing, itemCount,
        minSmallItemSize: this.minSmallItemWidth, maxSmallItemSize: this.maxSmallItemWidth,
      });
    }
    this._strategy = new Strategy(keylines, availableSpace, itemSpacing, padding, padding);
    this._availableSpace = availableSpace;
    this._pageSpacing = itemSpacing;
    this._pageSize = this._strategy.isValid ? Math.round(this._strategy.itemMainAxisSize) : availableSpace;
    for (const item of this._items) {
      item.box.style.width = `${this._pageSize}px`;
      item.left = NaN;
    }
    if (!this._strategy.isValid || !itemCount) { this._draw(); return; }
    if (this._pendingPage !== null) {
      const page = Math.min(Math.max(0, this._pendingPage), itemCount - 1);
      this._pendingPage = null;
      this._setScrollForPage(page, 0);
    } else if (previousPage !== null) {
      // A new size keeps the current item and its offset fraction.
      this._setScrollForPage(Math.min(previousPage, itemCount - 1), previousFraction);
    }
    this._draw();
  }

  /**
   * LazyRow measure for layout="multi-aspect": items at their own widths, end
   * to end with the item spacing, keeping the first visible item and its
   * offset across size changes.
   */
  _measureList(availableSpace) {
    const previous = this._list ? this._listVisibleRange() : null;
    this._strategy = Strategy.Empty;
    const spacing = Math.round(this.itemSpacing), padding = Math.round(this.contentPadding);
    for (const item of this._items) {
      item.box.style.width = '';
      item.left = NaN; item.mask = null;
      if (item.z !== null) { item.box.style.zIndex = ''; item.z = null; }
      this._resizeObserver?.observe(item.box);
    }
    let start = 0;
    for (const item of this._items) { item.size = item.box.offsetWidth; item.start = start; start += item.size + spacing; }
    this._list = { spacing, padding, content: Math.max(0, start - spacing), cross: this._viewport.clientHeight };
    this._availableSpace = availableSpace;
    const count = this._items.length;
    if (!count) { this._scroll = 0; this._draw(); return; }
    if (this._pendingPage !== null) {
      const page = Math.min(Math.max(0, this._pendingPage), count - 1);
      this._pendingPage = null;
      this._scroll = this._listItemScroll(page, 0);
    } else if (previous) {
      this._scroll = this._listItemScroll(Math.min(previous.first, count - 1), previous.firstOffset);
    } else {
      this._scroll = Math.min(Math.max(0, this._scroll), this._maxScroll());
    }
    this._draw();
  }

  /** The scroll position of an item's start plus an offset, within the list's range. */
  _listItemScroll(index, offset) {
    return Math.min(Math.max(0, this._items[index].start + offset), this._maxScroll());
  }

  /**
   * LazyListLayoutInfo at the current (whole pixel) scroll: firstVisibleItemIndex
   * and its scroll offset, the composed items (those reaching into the content
   * padding too) and their average size with spacing.
   */
  _listVisibleRange() {
    const list = this._list, scroll = Math.round(this._scroll), count = this._items.length;
    const viewportStart = -list.padding, viewportEnd = this._availableSpace - list.padding;
    let first = -1, firstOffset = 0, firstComposed = -1, last = -1, sum = 0, composed = 0;
    for (let index = 0; index < count; index++) {
      const item = this._items[index], offset = item.start - scroll;
      if (first < 0 && (offset + item.size + list.spacing > 0 || index === count - 1)) { first = index; firstOffset = -offset; }
      if (offset + item.size + list.spacing > viewportStart && offset < viewportEnd) {
        if (firstComposed < 0) firstComposed = index;
        last = index; sum += item.size; composed++;
      }
    }
    return { first: Math.max(0, first), firstOffset, firstComposed, last, average: composed ? Math.trunc(sum / composed) + list.spacing : 0 };
  }

  /** LazyRow placement, with carouselParallaxScrollEffect on every item. */
  _drawList() {
    const list = this._list, count = this._items.length, available = this._availableSpace;
    const scroll = Math.round(this._scroll), rtl = this._rtl;
    const previous = this._currentPage;
    const range = this._listVisibleRange();
    this._currentPage = range.first;
    for (let index = 0; index < count; index++) {
      const item = this._items[index];
      const offset = item.start - scroll;
      const isItemVisible = index >= range.firstComposed && index <= range.last;
      const info = calculateParallaxItemInfo({
        isItemVisible, itemMainAxisSize: item.size, itemCrossAxisSize: list.cross, itemOffset: offset,
        viewportStartOffset: -list.padding, viewportEndOffset: available - list.padding,
      });
      // MaskShape: the shape over [maskStart, maskEnd], or the whole item.
      const maskStart = info.size === 0 ? 0 : info.maskStart, maskEnd = info.size === 0 ? item.size : info.maskEnd;
      const left = list.padding + offset;
      const x = rtl ? available - left - item.size : left;
      // The content is drawn translated by the parallax distance under a mask
      // that stays with the item: the box moves, its clip moves back.
      const boxX = x + info.parallax;
      if (item.left !== boxX) { item.box.style.transform = `translateX(${boxX}px)`; item.left = boxX; }
      const mask = `${maskStart - info.parallax} ${maskEnd - info.parallax}`;
      if (item.mask !== mask) {
        item.box.style.clipPath = `inset(0px ${item.size - maskEnd + info.parallax}px 0px ${maskStart - info.parallax}px round var(--md-sys-shape-corner-extra-large, 28px))`;
        item.mask = mask;
      }
      const hidden = !isItemVisible || item.size === 0 || x + maskEnd <= 0 || x + maskStart >= available;
      if (item.hidden !== hidden) { item.box.toggleAttribute('data-offscreen', hidden); item.hidden = hidden; }
    }
    if (previous !== this._currentPage) {
      this.dispatchEvent(new CustomEvent('change', { detail: { index: this._currentPage }, bubbles: true, composed: true }));
    }
  }

  /**
   * LazyLayoutScrollScope.animateScrollToItem (scroll offset 0) with the
   * default spring: straight to a visible item; otherwise spring toward it in
   * bounded legs until it is visible, then on to it with the velocity reached.
   */
  _listAnimateScrollToItem(index) {
    const count = this._items.length;
    if (!count) return;
    index = Math.min(Math.max(0, Math.trunc(index)), count - 1);
    this._stopMotion();
    const snapToItem = () => { this._scroll = this._listItemScroll(index, 0); this._draw(); };
    if (this._reducedMotion()) { snapToItem(); this._settled(); return; }
    const isItemVisible = () => { const { first, last } = this._listVisibleRange(); return index >= first && index <= last; };
    const calculateDistanceTo = () => {
      const { first, last, average, firstOffset } = this._listVisibleRange();
      return index >= first && index <= last ? this._items[index].start - Math.round(this._scroll) : average * (index - first) - firstOffset;
    };
    const forward = index > this._listVisibleRange().first;
    const isOvershot = () => {
      const { first, firstOffset } = this._listVisibleRange();
      return forward ? first > index || (first === index && firstOffset > 0) : first < index || (first === index && firstOffset < 0);
    };
    const searchTarget = () => {
      const expected = calculateDistanceTo();
      const distance = Math.abs(expected) < TARGET_DISTANCE ? Math.max(Math.abs(expected), MINIMUM_DISTANCE) : TARGET_DISTANCE;
      return forward ? distance : -distance;
    };
    const motion = { frame: 0 };
    let leg = null, loops = 1;
    const animate = (target, velocity, seek) => {
      const duration = springDuration({ from: 0, to: target, velocity, stiffness: SCROLL_SPRING.stiffness, dampingRatio: SCROLL_SPRING.dampingRatio, visibilityThreshold: SCROLL_SPRING.visibilityThreshold });
      leg = { target, velocity, seek, previous: 0, start: performance.now(), duration };
    };
    const end = snap => { this._motion = null; if (snap) snapToItem(); this._settled(); };
    if (isItemVisible()) animate(calculateDistanceTo(), 0, true);
    else animate(searchTarget(), 0, false);
    const step = now => {
      if (this._motion !== motion) return;
      const elapsed = now - leg.start, done = elapsed >= leg.duration, target = leg.target;
      const state = done ? { position: target, velocity: 0 }
        : SpringPhysics.solve({ from: 0, to: target, velocity: leg.velocity, dampingRatio: SCROLL_SPRING.dampingRatio, stiffness: SCROLL_SPRING.stiffness, time: elapsed / 1000 });
      const value = state.position;
      // Springs can overshoot their target: clamp to it.
      const coerced = target > 0 ? Math.min(value, target) : target < 0 ? Math.max(value, target) : 0;
      if (leg.seek) {
        const delta = coerced - leg.previous;
        const consumed = this._scrollBy(delta);
        leg.previous += delta;
        if (done || delta !== consumed || coerced !== value) { end(true); return; }
      } else {
        let cancelled = false;
        if (!isItemVisible()) {
          const delta = coerced - leg.previous;
          const consumed = this._scrollBy(delta);
          if (!isItemVisible() && !isOvershot()) {
            // Hit the end without finding the item.
            if (delta !== consumed) { end(false); return; }
            leg.previous += delta;
            if (forward ? value > BOUND_DISTANCE : value < -BOUND_DISTANCE) cancelled = true;
            const { first, last } = this._listVisibleRange();
            if (forward && loops >= 2 && index - last > ITEMS_FOR_TELEPORT) { this._scroll = this._listItemScroll(index - ITEMS_FOR_TELEPORT, 0); this._draw(); }
            if (!forward && loops >= 2 && first - index > ITEMS_FOR_TELEPORT) { this._scroll = this._listItemScroll(index + ITEMS_FOR_TELEPORT, 0); this._draw(); }
          }
        }
        if (isOvershot()) { end(true); return; }
        if (isItemVisible()) animate(calculateDistanceTo(), state.velocity, true);
        else if (cancelled || done) { loops++; animate(searchTarget(), cancelled ? state.velocity : 0, false); }
      }
      motion.frame = requestAnimationFrame(step);
    };
    this._motion = motion;
    motion.frame = requestAnimationFrame(step);
  }

  /* -------------------------------------------------------------- pager state -- */

  _pageStride() { return this._pageSize + this._pageSpacing; }
  _maxScroll() {
    if (this._list) return Math.max(0, this._list.content + 2 * this._list.padding - this._availableSpace);
    const count = this._items.length;
    return Math.max(0, count * this._pageSize + (count - 1) * this._pageSpacing - this._availableSpace);
  }
  /** A page's offset from the viewport start. */
  _pageOffset(index) { return index * this._pageStride() - this._scroll; }
  _snapOffset(index) { return getSnapPositionOffset(this._strategy, index, this._items.length); }

  _visiblePages() {
    const pages = [];
    for (let index = 0; index < this._items.length; index++) {
      const offset = this._pageOffset(index);
      if (offset + this._pageSize > 0 && offset < this._availableSpace) pages.push({ index, offset });
    }
    return pages;
  }

  /** PagerMeasure.calculateNewCurrentPage: the visible page closest to its snap position. */
  _computeCurrentPage() {
    let best = null, bestDistance = -Infinity;
    for (const page of this._visiblePages()) {
      const distance = -Math.abs(page.offset - this._snapOffset(page.index));
      if (distance > bestDistance) { bestDistance = distance; best = page.index; }
    }
    return best ?? this._currentPage;
  }

  _currentPageOffsetFraction() {
    const stride = this._pageStride();
    if (!stride) return 0;
    const page = this._currentPage;
    return (this._snapOffset(page) - this._pageOffset(page)) / stride;
  }

  /** Scroll so a page sits its offset fraction away from its snap position. */
  _setScrollForPage(page, fraction) {
    const stride = this._pageStride();
    const offset = this._snapOffset(page) - fraction * stride;
    this._scroll = Math.min(Math.max(0, page * stride - offset), this._maxScroll());
    this._currentPage = page;
  }

  /** ScrollScope.scrollBy: the consumed part of a delta. */
  _scrollBy(delta) {
    const target = this._scroll + delta;
    const next = Math.min(Math.max(0, target), this._maxScroll());
    // An unclamped delta is consumed whole ((a + d) - a can differ from d).
    const consumed = next === target ? delta : next - this._scroll;
    this._scroll = next;
    if (consumed !== 0) this._draw();
    return consumed;
  }

  _scrollTo(value) { return this._scrollBy(value - this._scroll); }

  /* ------------------------------------------------------------------ drawing -- */

  /** Modifier.carouselItem for every item at the current scroll offset. */
  _draw() {
    if (this._list) { this._drawList(); return; }
    const strategy = this._strategy, count = this._items.length;
    if (!strategy.isValid || !count) {
      for (const item of this._items) item.box.toggleAttribute('data-offscreen', true);
      return;
    }
    const previous = this._currentPage;
    this._currentPage = this._computeCurrentPage();
    // calculateCurrentScrollOffset, from the pager's current page and fraction.
    const scrollOffset = calculateCurrentScrollOffset(strategy, this._currentPage, this._currentPageOffsetFraction(), count);
    const maxScrollOffset = calculateMaxScrollOffset(strategy, count);
    const rtl = this._rtl;
    for (let index = 0; index < count; index++) {
      const item = this._items[index];
      const placement = carouselItemPlacement(strategy, index, scrollOffset, maxScrollOffset);
      const left = this._pageOffset(index) + placement.translation;
      const visibleStart = left + placement.maskStart, visibleEnd = left + placement.maskEnd;
      const hidden = placement.size <= 0 || visibleEnd <= 0 || visibleStart >= this._availableSpace;
      const x = rtl ? this._availableSpace - left - this._pageSize : left;
      if (item.left !== x) { item.box.style.transform = `translateX(${x}px)`; item.left = x; }
      const mask = `${placement.maskStart}`;
      if (item.mask !== mask) {
        const end = this._pageSize - placement.maskEnd;
        item.box.style.clipPath = `inset(0px ${end}px 0px ${placement.maskStart}px round var(--md-sys-shape-corner-extra-large, 28px))`;
        item.mask = mask;
      }
      // The focal item in front; z order falls off with the distance from it.
      const z = count - Math.abs(index - this._currentPage);
      if (item.z !== z) { item.box.style.zIndex = String(z); item.z = z; }
      if (item.hidden !== hidden) { item.box.toggleAttribute('data-offscreen', hidden); item.hidden = hidden; }
    }
    if (previous !== this._currentPage) {
      this.dispatchEvent(new CustomEvent('change', { detail: { index: this._currentPage }, bubbles: true, composed: true }));
    }
  }

  /* --------------------------------------------------------------- animation -- */

  _stopMotion() {
    if (this._motion) cancelAnimationFrame(this._motion.frame);
    this._motion = null;
  }

  _reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /**
   * SnapFlingBehavior.animateWithTarget: a spring over a scroll distance from
   * a velocity, coerced so it never passes the target, ending when the scroll
   * is no longer consumed.
   */
  _animateBy(target, velocity, spec) {
    this._stopMotion();
    if (target === 0) return;
    if (this._reducedMotion()) { this._scrollBy(target); return; }
    const duration = springDuration({ from: 0, to: target, velocity, stiffness: spec.stiffness, dampingRatio: spec.dampingRatio, visibilityThreshold: spec.visibilityThreshold });
    const motion = { frame: 0, start: performance.now(), consumed: 0 };
    const coerce = value => (target > 0 ? Math.min(value, target) : Math.max(value, target));
    const step = now => {
      if (this._motion !== motion) return;
      const elapsed = now - motion.start;
      const done = elapsed >= duration;
      const raw = done ? target : SpringPhysics.solve({ from: 0, to: target, velocity, dampingRatio: spec.dampingRatio, stiffness: spec.stiffness, time: elapsed / 1000 }).position;
      const value = coerce(raw);
      const delta = value - motion.consumed;
      const consumed = this._scrollBy(delta);
      motion.consumed += consumed;
      if (done || Math.abs(delta - consumed) > 0.5 || value !== raw) { this._motion = null; this._settled(); return; }
      motion.frame = requestAnimationFrame(step);
    };
    this._motion = motion;
    motion.frame = requestAnimationFrame(step);
  }

  /** noSnapFlingBehavior: the spline-based decay, ended when it stops being consumed. */
  _decay(velocity) {
    this._stopMotion();
    if (!velocity) return;
    const decay = new AndroidFlingDecay();
    if (this._reducedMotion()) { this._scrollBy(decay.target(0, velocity)); return; }
    const duration = decay.info(velocity).duration;
    const motion = { frame: 0, start: performance.now(), consumed: 0 };
    const step = now => {
      if (this._motion !== motion) return;
      const elapsed = Math.min(now - motion.start, duration);
      const value = decay.sample(elapsed, 0, velocity).position;
      const delta = value - motion.consumed;
      const consumed = this._scrollBy(delta);
      motion.consumed += consumed;
      if (elapsed >= duration || Math.abs(delta - consumed) > 0.5) { this._motion = null; this._settled(); return; }
      motion.frame = requestAnimationFrame(step);
    };
    this._motion = motion;
    motion.frame = requestAnimationFrame(step);
  }

  _settled() {
    this.dispatchEvent(new CustomEvent('settle', { detail: { index: this._currentPage }, bubbles: true, composed: true }));
  }

  /* ------------------------------------------------------------------- fling -- */

  /**
   * TargetedFlingBehavior.performFling for a release with a scroll velocity
   * (px/s, positive scrolls forward) and the gesture's down-to-up distance.
   */
  _fling(velocity, dragDelta) {
    // The list's default fling: the spline decay, without snapping.
    if (this._list) { if (this._items.length) this._decay(velocity); return; }
    if (!this._strategy.isValid || !this._items.length) return;
    if (this.layout === 'uncontained') { this._decay(velocity); return; }
    if (this.flingBehavior === 'multi-browse') { this._multiBrowseFling(velocity, dragDelta); return; }
    // singleAdvanceFlingBehavior: with PagerSnapDistance.atMost(1) the
    // approach offset is always zero, so the release snaps directly.
    const snapOffset = this._calculateSnapOffset(velocity, dragDelta);
    this._animateBy(snapOffset, velocity, SNAP_SPRING);
  }

  /**
   * multiBrowseFlingBehavior: SnapFlingBehavior.fling with
   * PagerSnapLayoutInfoProvider and a PagerSnapDistance that keeps the
   * suggested target page. The approach runs the decay (or, when the decay
   * cannot cover it, the snap spring) to one page before the target; the snap
   * then continues with the velocity reached.
   */
  _multiBrowseFling(velocity, dragDelta) {
    this._stopMotion();
    const decay = new AndroidFlingDecay();
    const decayOffset = decay.target(0, velocity);
    const remaining = Math.abs(this._approachOffset(velocity, decayOffset)) * Math.sign(velocity);
    const snap = finalVelocity => this._animateBy(this._calculateSnapOffset(finalVelocity, dragDelta), finalVelocity, SNAP_SPRING);
    // No velocity or no approach offset: no approach animation.
    if (remaining === 0 || velocity === 0) { snap(velocity); return; }
    if (this._reducedMotion()) { this._scrollBy(remaining); snap(0); return; }
    const coerceToTarget = (value, target) => target === 0 ? 0 : target > 0 ? Math.min(value, target) : Math.max(value, target);
    const motion = { frame: 0, start: performance.now(), previous: 0 };
    const done = finalVelocity => { if (this._motion !== motion) return; this._motion = null; snap(finalVelocity); };
    let step;
    if (Math.abs(decayOffset) >= Math.abs(remaining)) {
      // DecayApproachAnimation: the decay, cut at the approach offset.
      const duration = decay.info(velocity).duration;
      step = now => {
        if (this._motion !== motion) return;
        const elapsed = Math.min(now - motion.start, duration);
        const state = decay.sample(elapsed, 0, velocity);
        let value = state.position, cancel = elapsed >= duration;
        if (Math.abs(value) >= Math.abs(remaining)) { value = coerceToTarget(value, remaining); cancel = true; }
        const delta = value - motion.previous;
        const consumed = this._scrollBy(delta);
        motion.previous = value;
        if (Math.abs(delta - consumed) > 0.5) cancel = true;
        if (cancel) { done(state.velocity); return; }
        motion.frame = requestAnimationFrame(step);
      };
    } else {
      // TargetApproachAnimation: the snap spring to the approach offset; the
      // velocity it ends with is kept within the initial velocity.
      const duration = springDuration({ from: 0, to: remaining, velocity, stiffness: SNAP_SPRING.stiffness, dampingRatio: SNAP_SPRING.dampingRatio, visibilityThreshold: SNAP_SPRING.visibilityThreshold });
      step = now => {
        if (this._motion !== motion) return;
        const elapsed = now - motion.start, finished = elapsed >= duration;
        const state = finished ? { position: remaining, velocity: 0 }
          : SpringPhysics.solve({ from: 0, to: remaining, velocity, dampingRatio: SNAP_SPRING.dampingRatio, stiffness: SNAP_SPRING.stiffness, time: elapsed / 1000 });
        const realValue = coerceToTarget(state.position, remaining);
        const delta = realValue - motion.previous;
        const consumed = this._scrollBy(delta);
        motion.previous += consumed;
        if (finished || Math.abs(delta - consumed) > 0.5 || realValue !== state.position) { done(coerceToTarget(state.velocity, velocity)); return; }
        motion.frame = requestAnimationFrame(step);
      };
    }
    this._motion = motion;
    motion.frame = requestAnimationFrame(step);
  }

  /**
   * PagerSnapLayoutInfoProvider.calculateApproachOffset with the suggested
   * target page: the fling's distance up to one page before that page.
   */
  _approachOffset(velocity, decayOffset) {
    const effectivePageSize = this._pageSize + this._pageSpacing;
    if (effectivePageSize === 0) return 0;
    const count = this._items.length;
    const firstVisiblePage = this._visiblePages()[0]?.index ?? 0;
    const startPage = velocity < 0 ? firstVisiblePage + 1 : firstVisiblePage;
    const pagesInAnimationOffset = Math.trunc(Math.fround(decayOffset / effectivePageSize));
    const targetPage = Math.min(Math.max(startPage + pagesInAnimationOffset, 0), count);
    // multiBrowseFlingBehavior's PagerSnapDistance returns the suggested page.
    const correctedTargetPage = Math.min(Math.max(targetPage, 0), count);
    const proposedFlingOffset = (correctedTargetPage - startPage) * effectivePageSize;
    const flingApproachOffset = Math.max(Math.abs(proposedFlingOffset) - effectivePageSize, 0);
    return flingApproachOffset === 0 ? 0 : flingApproachOffset * Math.sign(velocity);
  }

  _isScrollingForward(velocity, dragDelta) {
    const isNotGestureAction = Math.trunc(dragDelta) === 0;
    const isForward = (isNotGestureAction ? -velocity : dragDelta) > 0;
    // reverseLayout is false.
    return !isForward;
  }

  /** PagerSnapLayoutInfoProvider.calculateSnapOffset. */
  _calculateSnapOffset(velocity, dragDelta) {
    let lower = -Infinity, upper = Infinity;
    for (const page of this._visiblePages()) {
      const offset = page.offset - this._snapOffset(page.index);
      if (offset <= 0 && offset > lower) lower = offset;
      if (offset >= 0 && offset < upper) upper = offset;
    }
    if (lower === -Infinity) lower = upper;
    if (upper === Infinity) upper = lower;
    const forward = this._isScrollingForward(velocity, dragDelta);
    // Do not move past the bounds.
    if (this._scroll >= this._maxScroll()) {
      upper = 0;
      if (forward) lower = 0;
    }
    if (this._scroll <= 0) {
      lower = 0;
      if (!forward) upper = 0;
    }
    const distance = this._calculateFinalSnappingBound(velocity, dragDelta, lower, upper);
    return Number.isFinite(distance) ? distance : 0;
  }

  /** calculateFinalSnappingBound with the 0.5 snap positional threshold. */
  _calculateFinalSnappingBound(velocity, dragDelta, lower, upper) {
    const scrollingForward = this._isScrollingForward(velocity, dragDelta);
    const isForward = this._rtl ? !scrollingForward : scrollingForward;
    const pageSize = this._pageSize;
    // Pages moved by the drag; only the fraction matters.
    const offsetFromSnappedPosition = pageSize === 0 ? 0 : dragDelta / pageSize;
    const overflow = offsetFromSnappedPosition - Math.trunc(offsetFromSnappedPosition);
    if (Math.abs(velocity) < MIN_FLING_VELOCITY) {
      if (Math.abs(overflow) > SNAP_POSITIONAL_THRESHOLD) return isForward ? upper : lower;
      const positionThresholdFraction = Math.min(DEFAULT_POSITION_THRESHOLD, pageSize / 2) / pageSize;
      if (Math.abs(offsetFromSnappedPosition) >= Math.abs(positionThresholdFraction)) return isForward ? lower : upper;
      return Math.abs(lower) < Math.abs(upper) ? lower : upper;
    }
    return velocity > 0 ? upper : lower;
  }

  /* ------------------------------------------------------------------- input -- */

  _bind() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const viewport = this._viewport;
    this._resizeObserver?.disconnect();
    this._resizeObserver = new FrameResizeObserver(() => this._measure());
    this._resizeObserver.observe(viewport);
    signal.addEventListener('abort', () => this._resizeObserver?.disconnect(), { once: true });
    this._childObserver?.disconnect();
    this._childObserver = new MutationObserver(() => { this._buildItems(); this._measure(); });
    this._childObserver.observe(this, { childList: true });
    signal.addEventListener('abort', () => this._childObserver?.disconnect(), { once: true });

    viewport.addEventListener('pointerdown', event => this._pointerDown(event), { signal });
    viewport.addEventListener('pointermove', event => this._pointerMove(event), { signal });
    viewport.addEventListener('pointerup', event => this._pointerUp(event), { signal });
    viewport.addEventListener('pointercancel', event => this._pointerUp(event, true), { signal });
    // Only the carousel's own capture ending cancels a drag (a touch is first
    // captured implicitly by the element under it).
    viewport.addEventListener('lostpointercapture', event => {
      if (event.target === viewport && this._drag?.id === event.pointerId && this._drag.moved) this._pointerUp(event, true);
    }, { signal });
    // A drag is not a click on the item under it, nor a native image drag.
    viewport.addEventListener('click', event => {
      if (this._suppressClick) { event.preventDefault(); event.stopPropagation(); this._suppressClick = false; }
    }, { signal, capture: true });
    viewport.addEventListener('dragstart', event => event.preventDefault(), { signal });
    viewport.addEventListener('wheel', event => this._wheel(event), { signal, passive: false });
    viewport.addEventListener('keydown', event => this._key(event), { signal });
    // Focus moving into an item brings it to its resting position.
    viewport.addEventListener('focusin', event => {
      const index = this._items.findIndex(item => item.box.contains(event.target) ||
        item.box.querySelector('slot')?.assignedElements().some(el => el === event.target || el.contains(event.target)));
      if (index < 0 || this._drag) return;
      if (this._list) {
        // Focus brings the item into view (BringIntoViewSpec's default distance).
        const item = this._items[index];
        const distance = bringIntoViewDistance(this._list.padding + item.start - Math.round(this._scroll), item.size, this._availableSpace);
        if (distance) this._animateBy(distance, 0, SCROLL_SPRING);
        return;
      }
      if (index !== this._currentPage) this.animateScrollToItem(index);
    }, { signal });
  }

  _pointerDown(event) {
    if (!this.userScrollEnabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // A touch on a moving carousel stops it.
    this._stopMotion();
    const tracker = new PointerVelocityTracker();
    tracker.down(event.timeStamp, event.clientX);
    this._rtl = getComputedStyle(this).direction === 'rtl';
    this._drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, moved: false, tracker, slop: pointerSlop(event.pointerType) };
    this._suppressClick = false;
  }

  _pointerMove(event) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    drag.tracker.move(event.timeStamp, event.clientX);
    const rtl = this._rtl;
    if (!drag.moved) {
      const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
      if (Math.abs(dx) <= drag.slop) return;
      // A mostly vertical move belongs to the page.
      if (Math.abs(dy) > Math.abs(dx)) { this._drag = null; return; }
      drag.moved = true;
      // The slop is not scrolled.
      drag.x = drag.startX + Math.sign(dx) * drag.slop;
      this._viewport.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    const delta = (event.clientX - drag.x) * (rtl ? 1 : -1);
    drag.x = event.clientX;
    this._scrollBy(delta);
  }

  _pointerUp(event, cancelled = false) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    this._drag = null;
    if (!drag.moved) return;
    this._suppressClick = !cancelled;
    this._viewport.releasePointerCapture?.(event.pointerId);
    const rtl = this._rtl;
    const pointerVelocity = cancelled ? 0 : drag.tracker.up(event.timeStamp, MAX_FLING_VELOCITY);
    // Scroll velocity: a pointer moving toward the start scrolls forward.
    const velocity = pointerVelocity * (rtl ? 1 : -1);
    const upDownDifference = (cancelled ? drag.x : event.clientX) - drag.startX;
    this._fling(velocity, upDownDifference);
  }

  _wheel(event) {
    if (!this.userScrollEnabled) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this._availableSpace : 1;
    // Horizontal wheels and trackpads, or Shift with a vertical wheel.
    const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (!raw) return;
    this._stopMotion();
    const rtl = this._rtl;
    const consumed = this._scrollBy(raw * unit * (rtl ? -1 : 1));
    if (consumed !== 0) event.preventDefault();
    clearTimeout(this._wheelTimer);
    // When the wheel stops, settle as a release without velocity does.
    if (this.layout !== 'uncontained' && !this._list) this._wheelTimer = setTimeout(() => this._fling(0, 0), WHEEL_SETTLE_DELAY);
  }

  _key(event) {
    if (event.target !== this._viewport || event.altKey || event.ctrlKey || event.metaKey) return;
    const rtl = this._rtl;
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, Home: -Infinity, End: Infinity }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const count = this._items.length;
    const target = step === -Infinity ? 0 : step === Infinity ? count - 1 : this._currentPage + step;
    this.animateScrollToItem(Math.min(Math.max(0, target), count - 1));
  }
}

if (!customElements.get('md-carousel')) {
  customElements.define('md-carousel', delegateHostAria(MdCarousel));
}
