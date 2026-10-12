/* Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 *
 * <md-app-bar-with-search>: port of Compose Material3 AppBarWithSearch
 * (SearchBar.kt AppBarWithSearchImpl, SearchBarDefaults.appBarWithSearchColors,
 * EnterAlwaysSearchBarScrollBehavior; AppBarTokens) at AndroidX a095da93.
 *
 * - A Row: the navigation icon 4dp from the start, the search bar (the slotted
 *   md-search-bar) in the remaining width, centred, 360-720dp wide with 8dp
 *   horizontal and 4dp vertical padding, then the actions 4dp from the end.
 * - Colors: the app bar is Surface (AppBarTokens.ContainerColor) and turns
 *   SurfaceContainer (OnScrollContainerColor) once content scrolls under it
 *   (overlapped fraction above 0.01), animated on DefaultEffects; the search
 *   bar turns from SurfaceContainerHigh to SurfaceContainerHighest at once.
 *   Navigation icons use OnSurface, actions OnSurfaceVariant.
 * - While a full-screen search collapses, the bar in the app bar is invisible
 *   so the expanding surface is not drawn twice.
 * - scroll-behavior="enter-always" (enterAlwaysSearchBarScrollBehavior): the
 *   bar scrolls away with content and returns on any upward scroll; when
 *   scrolling ends between the two, it snaps (DefaultEffects) to the nearer
 *   end, judged from where it stopped.
 *
 * Web adapters: the scroll target is a DOM scroller (scrollTarget), whose
 * consumed movement is reported after the browser scrolls; window insets are
 * the safe-area insets.
 */
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { FrameResizeObserver } from '../utils/resize-observer.js';
import { HostStyleSheet } from '../utils/host-style.js';
import { AsStateColorMotion } from '../motion/animate-as-state.js';
import { SpringValue } from '../motion/selection-motion.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { ScrollPosition } from '../motion/scroll-position.js';
import { observeThemeContext } from '../theme/theme-context.js';
import './md-search-bar.js';

const style = `
  :host { display: block; box-sizing: border-box; width: 100%; min-width: 0; overflow: clip;
    height: var(--_app-bar-height, auto); -webkit-tap-highlight-color: transparent; }
  :host([hidden]) { display: none !important; }
  .bar { box-sizing: border-box; width: 100%; background: var(--_app-bar-color, var(--md-sys-color-surface, #FEF7FF));
    padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) 0 env(safe-area-inset-left, 0px);
    transform: translateY(var(--_app-bar-offset, 0px)); }
  .row { display: flex; align-items: center; }
  .navigation { flex: none; display: flex; align-items: center; padding-inline-start: 4px;
    --md-icon-button-content-color: var(--md-sys-color-on-surface, #1D1B20); }
  .actions { flex: none; display: flex; align-items: center; justify-content: flex-end; padding-inline-end: 4px;
    --md-icon-button-content-color: var(--md-sys-color-on-surface-variant, #49454F); }
  .navigation:not(.filled), .actions:not(.filled) { display: none; }
  .search { flex: 1 1 0; min-width: 0; display: flex; justify-content: center; padding: 4px 8px; }
  .search.hidden ::slotted(*) { opacity: 0; }
  ::slotted(md-search-bar) { width: 100%; max-width: 720px; }
`;
const sheet = createComponentSheet(style);
const COLOR_THRESHOLD = 0.01;

export class MdAppBarWithSearch extends HTMLElement {
  static get observedAttributes() { return ['scroll-behavior']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sheet);
    this.shadowRoot.innerHTML = `
      <div class="bar" part="container"><div class="row">
        <div class="navigation"><slot name="navigation"></slot></div>
        <div class="search"><slot></slot></div>
        <div class="actions"><slot name="actions"></slot></div>
      </div></div>`;
    this._bar = this.shadowRoot.querySelector('.bar');
    this._search = this.shadowRoot.querySelector('.search');
    this._sizes = new HostStyleSheet(this.shadowRoot);
    this._scrollTarget = null;
    // SearchBarScrollState: scrollOffset in [limit, 0], contentOffset.
    this._scroll = { offset: 0, limit: 0, content: 0 };
    this._snap = new SpringValue(0);
    this._raf = null;
  }

  /** enterAlwaysSearchBarScrollBehavior when "enter-always". */
  get scrollBehavior() { return this.getAttribute('scroll-behavior') === 'enter-always' ? 'enter-always' : null; }
  set scrollBehavior(value) { if (value) this.setAttribute('scroll-behavior', value); else this.removeAttribute('scroll-behavior'); }
  /** The scroller whose content passes under the app bar (an element or window). */
  get scrollTarget() { return this._scrollTarget; }
  set scrollTarget(value) {
    if (value != null && value !== window && !(value instanceof HTMLElement)) throw new TypeError('Expected an HTMLElement or window scroll target');
    this._scrollTarget = value;
    this._bindScroll();
  }
  /** SearchBarScrollState values. */
  get scrollOffset() { return this._scroll.offset; }
  get scrollOffsetLimit() { return this._scroll.limit; }
  get contentOffset() { return this._scroll.content; }
  /** overlappedFraction(): how far content has scrolled under the bar. */
  get overlappedFraction() {
    const { limit, content } = this._scroll;
    return limit !== 0 ? 1 - Math.min(0, Math.max(limit, limit - content)) / limit : 0;
  }

  connectedCallback() {
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    for (const [name, selector] of [['navigation', '.navigation'], ['actions', '.actions']]) {
      const slot = this.shadowRoot.querySelector(`slot[name="${name}"]`), box = this.shadowRoot.querySelector(selector);
      const sync = () => box.classList.toggle('filled', slot.assignedElements().length > 0);
      slot.addEventListener('slotchange', sync, { signal });
      sync();
    }
    this.addEventListener('search-state', event => this._syncVisibility(event.detail), { signal });
    this._probe ||= Object.assign(document.createElement('span'), { hidden: true });
    if (!this._probe.isConnected) this.shadowRoot.append(this._probe);
    this._colorMotion ||= new AsStateColorMotion(this, this._probe, 'var(--md-sys-color-surface)', value => this._bar.style.setProperty('--_app-bar-color', value));
    // Color roles resolve per theme; a theme change re-resolves the current target.
    this._themeCleanup = observeThemeContext(this, () => this._syncColors(true));
    // Layout writes wait for the shared frame queue, as the other layouts do.
    this._resize = new FrameResizeObserver(() => this._measure());
    this._resize.observe(this._bar);
    this._measure();
    this._syncColors(true);
    this._bindScroll();
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._scrollAbort?.abort();
    this._resize?.disconnect();
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._colorMotion?.dispose();
    this._colorMotion = null;
    this._themeCleanup?.();
    this._themeCleanup = null;
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;
    if (!this.scrollBehavior) { this._scroll.offset = 0; this._scroll.content = 0; this._snap.animation = null; }
    this._layout();
    this._syncColors(false);
    this._bindScroll();
  }

  /** isVisible = !expandsToFullScreen || !isExpanded || target Expanded. */
  _syncVisibility({ expanded, target, fullScreen }) {
    this._search.classList.toggle('hidden', !!fullScreen && expanded && !target);
  }

  _measure() {
    const height = this._bar.offsetHeight;
    // onSizeChanged: scrollOffsetLimit = -height.
    this._scroll.limit = -height;
    this._scroll.offset = Math.max(this._scroll.limit, Math.min(0, this._scroll.offset));
    this._layout();
  }

  _layout() {
    const behavior = this.scrollBehavior;
    const offset = behavior ? Math.round(this._scroll.offset) : 0;
    const height = this._bar.offsetHeight;
    this._sizes.host.setProperty('--_app-bar-height', behavior ? `${Math.max(0, height + offset)}px` : 'auto');
    this._bar.style.setProperty('--_app-bar-offset', `${offset}px`);
  }

  /** A changed bar height resizes the scroller; that is not a user scroll. */
  _relayout() {
    const before = this._position?.captureLayout();
    this._layout();
    this._position?.restoreLayout(before);
  }

  _syncColors(initial) {
    const scrolled = !!this.scrollBehavior && this.overlappedFraction > COLOR_THRESHOLD;
    if (scrolled === this._scrolled && !initial) return;
    this._scrolled = scrolled;
    // appBarWithSearchColors: SurfaceContainerHighest once scrolled; the change is immediate.
    if (scrolled) this._sizes.host.setProperty('--md-search-bar-container-color', 'var(--md-sys-color-surface-container-highest)');
    else this._sizes.host.removeProperty('--md-search-bar-container-color');
    this._colorMotion?.set(scrolled ? 'var(--md-sys-color-surface-container)' : 'var(--md-sys-color-surface)', { snap: initial });
  }

  _bindScroll() {
    this._scrollAbort?.abort();
    const target = this._scrollTarget;
    if (!this.isConnected || !target) return;
    this._scrollAbort = new AbortController();
    const { signal } = this._scrollAbort;
    const position = this._position = new ScrollPosition(target);
    target.addEventListener('scroll', () => {
      const delta = position.consume();
      if (!delta || !this.scrollBehavior) return;
      this._stopSnap();
      // onPostScroll: the consumed movement moves the bar and the content offset.
      const s = this._scroll;
      s.offset = Math.max(s.limit, Math.min(0, s.offset + delta));
      s.content += delta;
      this._relayout();
      this._syncColors(false);
    }, { signal, passive: true });
    target.addEventListener('scrollend', () => { position.end(); this._settle(); }, { signal, passive: true });
  }

  _stopSnap() {
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._snap.animation = null;
  }

  /** settleSearchBar with no remaining fling velocity: snap to the nearer end. */
  _settle() {
    const s = this._scroll;
    if (!this.scrollBehavior || s.limit === 0) return;
    const fraction = s.offset / s.limit;
    if (fraction < 0.01 || fraction === 1) return;
    if (!(s.limit < s.offset && s.offset < 0)) return;
    const now = performance.now();
    this._snap.value = this._snap.target = s.offset;
    this._snap.animation = null;
    this._snap.to(fraction < 0.5 ? 0 : s.limit, SpringPhysics.getPreset('expressiveEffectMedium', this), { now });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) this._snap.finish();
    const tick = time => {
      this._raf = null;
      s.offset = Math.max(s.limit, Math.min(0, this._snap.sample(time).position));
      this._relayout();
      if (this._snap.animation) this._raf = requestAnimationFrame(tick);
    };
    tick(now);
  }
}

if (!customElements.get('md-app-bar-with-search')) customElements.define('md-app-bar-with-search', MdAppBarWithSearch);
