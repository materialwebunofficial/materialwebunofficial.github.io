/**
 * Showcase controller: theme state, adaptive navigation, the component
 * catalog, copy actions, and the wiring of interactive examples.
 */

// One module graph: the showcase uses the same bundle that defines the components.
import {
  SpringPhysics, applyDynamicTheme, rgbToHct, hexToRgb, hctToHex, resolvePaletteVariant,
  FloatingToolbarScrollBehavior, ToolbarScrollExpansion, TopAppBarScrollBehavior, BottomAppBarScrollBehavior
} from '../dist/md3-expressive.esm.js';

const STORAGE_KEYS = {
  THEME_MODE: 'md3e_theme_mode',
  THEME_SCHEME: 'md3e_theme_scheme',
  MOTION_SCHEME: 'md3e_motion_scheme',
  HCT_STATE: 'md3e_hct_state',
  HCT_VERSION: 'md3e_hct_version',
  SEED_HEX: 'md3e_seed_hex',
  PALETTE_VARIANT: 'md3e_palette_variant',
  CONTRAST: 'md3e_contrast',
  // The last generated color roles, applied before the first paint on the next visit.
  SCHEME_CACHE: 'md3e_scheme_cache'
};

// Example seed colors for the showcase. They are inputs, not official palettes.
const SEED_PRESETS = [
  { name: 'Purple', hex: '#6750A4' },
  { name: 'Blue', hex: '#185EAC' },
  { name: 'Ocean', hex: '#00639B' },
  { name: 'Green', hex: '#386A20' },
  { name: 'Amber', hex: '#7D5700' },
  { name: 'Coral', hex: '#9C4146' }
];
const CONTRAST_LEVELS = ['standard', 'medium', 'high'];
const PRIMARY_TABS = ['home', 'get-started', 'components'];

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} }
};

export function initShowcase() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // =========================================================================
  // 1. Theme state
  // =========================================================================
  const savedMode = storage.get(STORAGE_KEYS.THEME_MODE);
  const theme = {
    dark: savedMode === 'dark' || (savedMode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches),
    motion: storage.get(STORAGE_KEYS.MOTION_SCHEME) === 'standard' ? 'standard' : 'expressive',
    variant: resolvePaletteVariant(storage.get(STORAGE_KEYS.PALETTE_VARIANT)),
    contrast: CONTRAST_LEVELS.includes(storage.get(STORAGE_KEYS.CONTRAST)) ? storage.get(STORAGE_KEYS.CONTRAST) : 'standard',
    hct: rgbToHct(103, 80, 164)
  };
  let migrated = false;
  try {
    const raw = JSON.parse(storage.get(STORAGE_KEYS.HCT_STATE) || 'null');
    if (raw && ['hue', 'chroma', 'tone'].every(key => Number.isFinite(raw[key]))) theme.hct = raw;
    // Older releases stored Lab-LCH coordinates; recompute HCT from the seed.
    if (storage.get(STORAGE_KEYS.HCT_VERSION) !== 'mcu-0.4.0') {
      const rgb = hexToRgb(storage.get(STORAGE_KEYS.SEED_HEX) || '#6750a4');
      theme.hct = rgbToHct(rgb.r, rgb.g, rgb.b);
      migrated = storage.get(STORAGE_KEYS.HCT_STATE) !== null || storage.get(STORAGE_KEYS.SEED_HEX) !== null;
    }
  } catch {}

  const seedHex = () => hctToHex(theme.hct.hue, theme.hct.chroma, theme.hct.tone);
  // Stored colors from an older release are rewritten once in the current format.
  if (migrated) persistColor();

  function applyTheme() {
    root.setAttribute('data-theme', theme.dark ? 'dark' : 'light');
    // The expressive theme pairs MaterialExpressiveTheme with the expressive
    // motion scheme; the palette variant is chosen independently.
    root.setAttribute('data-theme-scheme', theme.motion);
    root.setAttribute('data-motion-scheme', theme.motion);
    root.setAttribute('data-palette-variant', theme.variant);
    root.setAttribute('data-contrast', theme.contrast);
    SpringPhysics.setScheme(theme.motion);
    applyDynamicTheme(theme.hct, theme.dark, theme.variant);
    cacheScheme();
    syncThemeControls();
  }

  function cacheScheme() {
    const roles = {};
    for (const name of root.style) if (name.startsWith('--md-sys-color-')) roles[name] = root.style.getPropertyValue(name);
    storage.set(STORAGE_KEYS.SCHEME_CACHE, JSON.stringify({ dark: theme.dark, roles }));
  }

  function persistColor() {
    storage.set(STORAGE_KEYS.HCT_STATE, JSON.stringify(theme.hct));
    storage.set(STORAGE_KEYS.HCT_VERSION, 'mcu-0.4.0');
    storage.set(STORAGE_KEYS.SEED_HEX, seedHex());
  }

  const darkToggles = ['rail-theme-toggle', 'mobile-theme-toggle'].map(id => document.getElementById(id)).filter(Boolean);
  const motionToggles = ['rail-motion-toggle', 'mobile-motion-toggle'].map(id => document.getElementById(id)).filter(Boolean);

  function syncThemeControls() {
    darkToggles.forEach(toggle => { toggle.selected = theme.dark; });
    motionToggles.forEach(toggle => { toggle.selected = theme.motion === 'expressive'; });
    syncColorControls();
  }

  darkToggles.forEach(toggle => toggle.addEventListener('change', () => {
    theme.dark = toggle.selected;
    storage.set(STORAGE_KEYS.THEME_MODE, theme.dark ? 'dark' : 'light');
    applyTheme();
  }));
  motionToggles.forEach(toggle => toggle.addEventListener('change', () => {
    theme.motion = toggle.selected ? 'expressive' : 'standard';
    storage.set(STORAGE_KEYS.MOTION_SCHEME, theme.motion);
    storage.set(STORAGE_KEYS.THEME_SCHEME, theme.motion);
    applyTheme();
    announce(theme.motion === 'expressive' ? 'Expressive motion is on' : 'Standard motion is on');
  }));

  // Follow the system color mode until the visitor chooses one.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (storage.get(STORAGE_KEYS.THEME_MODE)) return;
    theme.dark = event.matches;
    applyTheme();
  });

  // =========================================================================
  // 2. Snackbar feedback
  // =========================================================================
  const appSnackbar = document.getElementById('app-snackbar');
  const bottomNav = document.querySelector('md-navigation-bar.mobile-bottom-nav');
  const mainEl = document.getElementById('main');

  function positionSnackbar(snackbar) {
    const rect = mainEl.getBoundingClientRect();
    const left = Math.max(0, rect.left) + 16, right = Math.max(0, window.innerWidth - rect.right) + 16;
    const bottom = (getComputedStyle(bottomNav).display === 'none' ? 0 : bottomNav.getBoundingClientRect().height) + 16;
    const rtl = getComputedStyle(snackbar).direction === 'rtl';
    snackbar.style.setProperty('--md-snackbar-inline-start', (rtl ? right : left) + 'px');
    snackbar.style.setProperty('--md-snackbar-inline-end', (rtl ? left : right) + 'px');
    snackbar.style.setProperty('--md-snackbar-bottom', bottom + 'px');
  }

  function announce(message) {
    if (!appSnackbar) return;
    document.querySelectorAll('#snackbars md-snackbar[open]').forEach(other => other.close());
    if (appSnackbar.open) appSnackbar.close();
    appSnackbar.message = message;
    positionSnackbar(appSnackbar);
    appSnackbar.show();
  }

  // =========================================================================
  // 3. Adaptive navigation: rail, navigation bar, top app bar, catalog drawer
  // =========================================================================
  const rail = document.querySelector('md-navigation-rail.app-nav-rail');
  const topBar = document.getElementById('app-top-bar');
  const drawer = document.getElementById('components-sub-nav');
  const drawerToggles = ['mobile-drawer-toggle', 'rail-drawer-toggle'].map(id => document.getElementById(id)).filter(Boolean);
  const largeWindow = matchMedia('(min-width: 1200px)');
  const catalog = drawer.items.map((item, index) => ({ ...item, index })).filter(item => item.value);
  const tabViews = [...document.querySelectorAll('.tab-view')];
  let activeTab = 'home';
  let drawerPinned = true;

  // Large windows show the catalog beside the content while browsing
  // components; other windows and views open it as a modal sheet.
  function syncDrawerVariant() {
    const docked = largeWindow.matches && activeTab === 'components';
    const variant = docked ? 'dismissible' : 'modal';
    if (drawer.variant !== variant) {
      drawer.open = false;
      drawer.variant = variant;
    }
    // A docked catalog is part of the layout: it is in place, not slid in.
    if (docked && drawer.open !== drawerPinned) drawer.snapTo(drawerPinned);
    syncDrawerToggles();
  }

  function syncDrawerToggles() {
    drawerToggles.forEach(button => button.setAttribute('aria-expanded', String(drawer.open)));
    // The modal sheet follows drags only while it is open (swipe to close), so a
    // horizontal drag on the page never pulls the catalog open by accident.
    drawer.gesturesEnabled = drawer.variant === 'modal' && drawer.open;
  }

  new MutationObserver(syncDrawerToggles).observe(drawer, { attributes: true, attributeFilter: ['open'] });
  largeWindow.addEventListener('change', syncDrawerVariant);
  drawerToggles.forEach(button => button.addEventListener('click', () => {
    if (drawer.variant === 'dismissible') drawerPinned = !drawer.open;
    if (drawer.open) drawer.close(); else drawer.show();
  }));

  // =========================================================================
  // Deferred catalog examples
  // =========================================================================
  // Every example card is parsed as an inert template. Cards are created as
  // they approach the viewport and then, card by card, in idle time while the
  // catalog is open, so no single task creates hundreds of components.
  const pending = new Set(document.querySelectorAll('template[data-defer]'));
  const mountHooks = [];
  let nearViewport = null;
  function mountTemplate(template) {
    if (!pending.delete(template)) return;
    const grid = template.parentElement, section = template.closest('.category-section');
    const fragment = template.content;
    const card = fragment.firstElementChild;
    template.replaceWith(fragment);
    if (!grid.querySelector('template[data-defer]')) {
      grid.removeAttribute('data-deferred');
      grid.style.removeProperty('--deferred-one');
      grid.style.removeProperty('--deferred-two');
    }
    // A section with every card created no longer needs to be watched.
    if (section && !section.querySelector('template[data-defer]')) nearViewport?.unobserve(section);
    if (card) for (const hook of mountHooks) hook(card);
  }
  // A grid above the viewport that changes height (a card created, or drawn
  // for the first time) moves everything below it. Keep what is on screen
  // still by scrolling by that change, after layout and before paint.
  const gridHeights = new WeakMap();
  const gridSizes = new ResizeObserver(entries => {
    let delta = 0;
    // A section scroll follows its target's live position itself.
    const following = !!sectionScroll;
    for (const entry of entries) {
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.offsetHeight, previous = gridHeights.get(entry.target);
      gridHeights.set(entry.target, height);
      if (previous === undefined || activeTab !== 'components' || !height && !previous) continue;
      if (entry.target.getBoundingClientRect().bottom <= 0) delta += height - previous;
    }
    if (delta && !following) { window.scrollBy({ top: delta, behavior: 'instant' }); compensatedY = Math.round(window.scrollY); }
  });
  document.querySelectorAll('#tab-view-components .cards-grid').forEach(grid => gridSizes.observe(grid));
  function mountSection(section) {
    section?.querySelectorAll('template[data-defer]').forEach(mountTemplate);
  }
  // Sections approaching the viewport are created ahead of idle work, a few
  // cards per task, so scrolling never waits on one long task.
  const soon = [];
  let soonScheduled = false;
  function mountSoon(section) {
    for (const template of section.querySelectorAll('template[data-defer]')) if (!soon.includes(template)) soon.push(template);
    if (!soonScheduled) { soonScheduled = true; setTimeout(drainSoon, 0); }
  }
  function drainSoon() {
    soonScheduled = false;
    const start = performance.now();
    do mountTemplate(soon.shift()); while (soon.length && performance.now() - start < 12);
    if (soon.length) { soonScheduled = true; setTimeout(drainSoon, 0); }
  }
  nearViewport = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      nearViewport.unobserve(entry.target);
      mountSoon(entry.target);
    }
  }, { rootMargin: '1200px 0px' });
  document.querySelectorAll('#tab-view-components .category-section').forEach(section => {
    if (section.querySelector('template[data-defer]')) nearViewport.observe(section);
  });
  const requestIdle = window.requestIdleCallback
    ? callback => requestIdleCallback(callback, { timeout: 1500 })
    : callback => setTimeout(() => callback({ timeRemaining: () => 0 }), 32);
  let idleScheduled = false;
  // Cards that grow above the viewport while a scroll is running would move its
  // destination, so idle mounting waits until scrolling has settled.
  let lastScroll = 0, compensatedY = null;
  window.addEventListener('scroll', () => {
    // The compensation for a card mounted above is not a reader's scroll.
    if (Math.round(window.scrollY) === compensatedY) { compensatedY = null; return; }
    lastScroll = performance.now();
  }, { passive: true });
  function mountInIdle() {
    if (idleScheduled || !pending.size) return;
    idleScheduled = true;
    requestIdle(deadline => {
      idleScheduled = false;
      if (performance.now() - lastScroll < 200) { setTimeout(mountInIdle, 200); return; }
      // One card per idle period, more while the period lasts, so the catalog
      // keeps filling in even while animations leave only short idle periods.
      do mountTemplate(pending.values().next().value);
      while (pending.size && deadline.timeRemaining() > 12);
      mountInIdle();
    });
  }
  /** Finds an element by id, creating its card first if it is still deferred. */
  function findTarget(id) {
    const found = document.getElementById(id);
    if (found) return found;
    for (const template of pending) {
      if (template.content.getElementById(id)) {
        mountSection(template.closest('.category-section'));
        return document.getElementById(id);
      }
    }
    return null;
  }
  /** Mounts a section and its neighbours before scrolling to it. */
  function prepareSection(target) {
    const section = target?.closest('.category-section');
    if (!section) return;
    mountSection(section);
    let previous = section.previousElementSibling;
    while (previous && !previous.classList.contains('category-section')) previous = previous.previousElementSibling;
    mountSection(previous);
    let next = section.nextElementSibling;
    while (next && !next.classList.contains('category-section')) next = next.nextElementSibling;
    mountSection(next);
  }

  function setTabSelection(tabId) {
    const index = PRIMARY_TABS.indexOf(tabId);
    if (rail) rail.selected = index;
    if (bottomNav) bottomNav.selected = index;
  }

  function switchTab(tabId, { scroll = true, hash = true } = {}) {
    activeTab = tabId;
    document.body.setAttribute('data-active-tab', tabId);
    document.body.setAttribute('data-routed', '');
    tabViews.forEach(view => view.classList.toggle('active', view.id === `tab-view-${tabId}`));
    setTabSelection(tabId);
    if (drawer.variant === 'modal') drawer.close();
    syncDrawerVariant();
    if (tabId === 'components') mountInIdle();
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    if (hash) history.replaceState(null, '', `#${tabId}`);
  }

  function selectCatalogEntry(id) {
    const entry = catalog.find(item => item.value === id);
    if (entry && drawer.selected !== entry.index) drawer.selected = entry.index;
  }

  function navigateToSection(id, smooth = true) {
    if (activeTab !== 'components') switchTab('components', { scroll: false, hash: false });
    history.replaceState(null, '', `#${id}`);
    const target = findTarget(id);
    prepareSection(target);
    if (target) scrollToSection(target, smooth);
    selectCatalogEntry(target?.closest('.category-section')?.id ?? id);
  }

  // Cards the scroll passes are laid out on the way and replace their
  // estimated heights with real ones, so a section's position moves while the
  // page scrolls to it. The scroll follows the section's live position (a
  // critically damped spring, or a direct jump with reduced motion) until it
  // rests on it; any wheel, touch, key or pointer input hands control back.
  let sectionScroll = null;
  function scrollToSection(target, smooth) {
    sectionScroll?.stop();
    const root = document.documentElement, animate = smooth && !reducedMotion.matches;
    const destination = () => {
      const margin = (parseFloat(getComputedStyle(target).scrollMarginTop) || 0) + (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0);
      return Math.max(0, Math.min(root.scrollHeight - innerHeight, window.scrollY + target.getBoundingClientRect().top - margin));
    };
    let frame = 0, position = window.scrollY, velocity = 0, last = performance.now(), settled = 0;
    const began = last, inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const stop = () => {
      cancelAnimationFrame(frame);
      for (const type of inputs) window.removeEventListener(type, stop, true);
      if (sectionScroll === control) sectionScroll = null;
      selectCatalogEntry(target.closest('.category-section')?.id ?? target.id);
    };
    const control = { stop };
    const step = now => {
      const to = destination();
      if (animate) {
        const state = SpringPhysics.solve({ from: position, to, velocity, dampingRatio: 1, stiffness: 200, time: Math.min(64, now - last) / 1000 });
        position = state.position; velocity = state.velocity;
      } else position = to;
      last = now;
      window.scrollTo({ top: position, behavior: 'instant' });
      if (Math.abs(window.scrollY - position) > 2) position = window.scrollY;
      settled = Math.abs(to - position) < 1 && Math.abs(velocity) < 2 ? settled + 1 : 0;
      if (settled >= 6 || now - began > 4000) { if (settled) window.scrollTo({ top: to, behavior: 'instant' }); stop(); return; }
      frame = requestAnimationFrame(step);
    };
    sectionScroll = control;
    for (const type of inputs) window.addEventListener(type, stop, true);
    frame = requestAnimationFrame(step);
  }

  rail?.addEventListener('change', event => {
    const tabId = PRIMARY_TABS[event.detail.index];
    if (tabId) switchTab(tabId);
  });
  bottomNav?.addEventListener('change', event => {
    const tabId = PRIMARY_TABS[event.detail.index];
    if (tabId) switchTab(tabId);
  });
  drawer.addEventListener('change', event => {
    const id = event.detail.value;
    if (drawer.variant === 'modal') drawer.close();
    if (id) navigateToSection(id);
  });

  document.querySelectorAll('[data-navigate-tab]').forEach(el => {
    el.addEventListener('click', event => {
      event.preventDefault();
      switchTab(el.getAttribute('data-navigate-tab'));
    });
  });

  // In-page links (including buttons with an href) stay inside the app.
  document.addEventListener('navigate', event => {
    const href = event.detail.href || '';
    if (!href.startsWith('#')) return;
    event.preventDefault();
    routeTo(href.slice(1), true);
  });
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.getAttribute('href').slice(1);
    if (!id || !findTarget(id)) return;
    event.preventDefault();
    routeTo(id, true);
  });

  // Anchors from earlier versions of the catalog.
  const LEGACY_ANCHORS = { progress: 'progress-indicators', selection: 'switch', 'selection-controls': 'checkbox',
    segmented: 'segmented-buttons', 'time-picker': 'time-pickers', 'date-picker': 'date-pickers', overview: 'overview' };

  function routeTo(id, smooth) {
    id = LEGACY_ANCHORS[id] ?? id;
    if (!id || id === 'home') return switchTab('home', { hash: id === 'home' });
    if (id === 'get-started' || id === 'getstarted') return switchTab('get-started');
    if (id === 'components') return switchTab('components');
    const target = findTarget(id);
    if (!target) return switchTab('home', { hash: false });
    const view = target.closest('.tab-view');
    if (view?.id === 'tab-view-get-started') {
      switchTab('get-started', { scroll: false, hash: false });
      history.replaceState(null, '', `#${id}`);
      target.scrollIntoView({ behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant', block: 'start' });
      return;
    }
    navigateToSection(id, smooth);
  }

  window.addEventListener('hashchange', () => routeTo(location.hash.slice(1), false));

  // Compact top app bar: the container changes color while content scrolls under it.
  const syncTopBar = () => { if (topBar) topBar.scrolled = window.scrollY > 0; };
  window.addEventListener('scroll', syncTopBar, { passive: true });
  syncTopBar();

  // Scroll spy for the catalog.
  const spyTargets = [document.getElementById('overview'), ...document.querySelectorAll('#tab-view-components .category-section')].filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    if (activeTab !== 'components' || sectionScroll) return;
    for (const entry of entries) if (entry.isIntersecting) selectCatalogEntry(entry.target.id);
  }, { rootMargin: '-20% 0px -70% 0px' });
  spyTargets.forEach(target => spy.observe(target));

  // =========================================================================
  // 4. Copy actions
  // =========================================================================
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    }
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('md-icon-button.code-copy, md-icon-button.section-link');
    if (!button) return;
    event.stopPropagation();
    if (button.classList.contains('section-link')) {
      const id = button.dataset.anchor;
      const url = `${location.origin}${location.pathname}#${id}`;
      history.replaceState(null, '', `#${id}`);
      announce(await copyText(url) ? 'Link copied to clipboard' : 'Couldn’t copy the link');
      return;
    }
    const code = button.closest('.comp-code-box, .code-block-wrapper')?.querySelector('code');
    const text = code?.textContent.trim();
    if (text) announce(await copyText(text) ? 'Copied to clipboard' : 'Couldn’t copy the code');
  });

  // =========================================================================
  // 5. Seed color chips, color lab
  // =========================================================================
  function populateSeedChips(set) {
    if (!set || set.dataset.populated) return;
    set.dataset.populated = 'true';
    for (const preset of SEED_PRESETS) {
      const chip = document.createElement('md-chip');
      chip.className = 'preset-swatch-item';
      chip.setAttribute('variant', 'filter');
      chip.setAttribute('label', preset.name);
      chip.dataset.hex = preset.hex;
      // Selected before it connects, so the chip is laid out once in its final state.
      chip.selected = preset.hex.toLowerCase() === seedHex().toLowerCase();
      const swatch = document.createElement('span');
      swatch.slot = 'leading-icon';
      swatch.className = 'seed-swatch';
      swatch.style.setProperty('--seed', preset.hex);
      chip.append(swatch);
      chip.addEventListener('change', () => setSeedHex(preset.hex));
      set.append(chip);
    }
  }
  populateSeedChips(document.getElementById('home-seed-chips'));

  // Color lab controls exist once the Color section is mounted.
  const lab = {};

  function syncColorControls({ fromSlider = null } = {}) {
    const hex = seedHex().toLowerCase();
    document.querySelectorAll('.preset-swatch-item').forEach(chip => {
      chip.selected = chip.dataset.hex.toLowerCase() === hex;
    });
    if (lab.hexInput && document.activeElement !== lab.hexInput) lab.hexInput.value = hex.toUpperCase();
    if (lab.hueSlider && fromSlider !== lab.hueSlider) lab.hueSlider.value = theme.hct.hue;
    if (lab.chromaSlider && fromSlider !== lab.chromaSlider) lab.chromaSlider.value = theme.hct.chroma;
    if (lab.toneSlider && fromSlider !== lab.toneSlider) lab.toneSlider.value = theme.hct.tone;
    if (lab.hueValue) lab.hueValue.textContent = `${Math.round(theme.hct.hue)}°`;
    if (lab.chromaValue) lab.chromaValue.textContent = `${Math.round(theme.hct.chroma)}`;
    if (lab.toneValue) lab.toneValue.textContent = `${Math.round(theme.hct.tone)}`;
    if (lab.variantSelect && lab.variantSelect.value !== theme.variant) lab.variantSelect.value = theme.variant;
    if (lab.contrastControl) {
      const index = CONTRAST_LEVELS.indexOf(theme.contrast);
      if (lab.contrastControl.getAttribute('selected-index') !== String(index)) lab.contrastControl.setAttribute('selected-index', String(index));
    }
  }

  function setSeedHex(hex) {
    const rgb = hexToRgb(hex);
    theme.hct = rgbToHct(rgb.r, rgb.g, rgb.b);
    persistColor();
    applyTheme();
  }

  // A slider re-themes the page once per frame with its latest value.
  let colorFrame = 0, colorSlider = null;
  function applyColor(fromSlider) {
    colorSlider = fromSlider;
    if (colorFrame) return;
    colorFrame = requestAnimationFrame(() => {
      colorFrame = 0;
      applyDynamicTheme(theme.hct, theme.dark, theme.variant);
      syncColorControls({ fromSlider: colorSlider });
      persistColorSoon();
    });
  }
  const scheduleColor = applyColor;
  // Storage writes and the cached scheme wait until the value rests.
  let persistTimer = 0;
  function persistColorSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { persistColor(); cacheScheme(); }, 250);
  }

  function wireColorLab(root) {
    const find = id => root.querySelector('#' + id);
    if (!find('hue-slider') || lab.hueSlider) return;
    Object.assign(lab, {
      hueSlider: find('hue-slider'), chromaSlider: find('chroma-slider'), toneSlider: find('tone-slider'),
      hueValue: find('hue-val-display'), chromaValue: find('chroma-val-display'), toneValue: find('tone-val-display'),
      hexInput: find('hex-code-input'), variantSelect: find('palette-variant-select'), contrastControl: find('contrast-segmented'),
    });
    populateSeedChips(find('preset-swatches'));
    for (const [slider, key] of [[lab.hueSlider, 'hue'], [lab.chromaSlider, 'chroma'], [lab.toneSlider, 'tone']]) {
      slider?.addEventListener('input', event => {
        theme.hct = { ...theme.hct, [key]: typeof event.detail?.value === 'number' ? event.detail.value : Number(slider.value) };
        scheduleColor(slider);
      });
      slider?.addEventListener('change', () => applyColor(slider));
    }
    lab.hexInput?.addEventListener('input', () => {
      let value = String(lab.hexInput.value || '').trim();
      if (!value.startsWith('#')) value = `#${value}`;
      if (/^#[0-9a-f]{6}$/i.test(value)) setSeedHex(value);
    });
    lab.variantSelect?.addEventListener('change', () => {
      theme.variant = resolvePaletteVariant(lab.variantSelect.value);
      storage.set(STORAGE_KEYS.PALETTE_VARIANT, theme.variant);
      applyTheme();
    });
    lab.contrastControl?.addEventListener('change', event => {
      const index = Number(event.detail?.selectedIndex ?? lab.contrastControl.getAttribute('selected-index'));
      theme.contrast = CONTRAST_LEVELS[index] ?? 'standard';
      storage.set(STORAGE_KEYS.CONTRAST, theme.contrast);
      applyTheme();
    });
    find('reset-color-btn')?.addEventListener('click', () => {
      theme.variant = 'tonal-spot';
      theme.contrast = 'standard';
      storage.set(STORAGE_KEYS.PALETTE_VARIANT, theme.variant);
      storage.set(STORAGE_KEYS.CONTRAST, theme.contrast);
      setSeedHex(SEED_PRESETS[0].hex);
    });
    syncColorControls();
  }

  applyTheme();

  // Initial route, after the theme so first measurements use final tokens.
  const initialHash = LEGACY_ANCHORS[location.hash.slice(1)] ?? location.hash.slice(1);
  activeTab = PRIMARY_TABS.includes(initialHash) ? initialHash
    : initialHash && document.getElementById(initialHash)?.closest('#tab-view-get-started') ? 'get-started'
    : initialHash && findTarget(initialHash) ? 'components' : 'home';
  switchTab(activeTab, { scroll: false, hash: false });
  if (initialHash && !PRIMARY_TABS.includes(initialHash)) {
    requestAnimationFrame(() => routeTo(initialHash, false));
  }

  // =========================================================================
  // 6. Home examples
  // =========================================================================
  const heroSlider = document.getElementById('hero-live-slider');
  const heroSliderValue = document.getElementById('hero-slider-val');
  heroSlider?.addEventListener('input', event => {
    const value = typeof event.detail?.value === 'number' ? event.detail.value : Number(heroSlider.value);
    if (heroSliderValue) heroSliderValue.textContent = `${Math.round(value)}`;
  });

  // Progress animates with ProgressIndicatorDefaults.ProgressAnimationSpec:
  // spring(dampingRatio = 1, stiffness = 50, visibilityThreshold = 0.001).
  const heroProgress = document.getElementById('hero-wavy-progress');
  const heroProgressValue = document.getElementById('hero-progress-val');
  if (heroProgress) {
    const steps = [{ target: 0.08, wait: 900 }, { target: 0.27, wait: 900 }, { target: 0.68, wait: 1100 },
      { target: 0.96, wait: 900 }, { target: 1, wait: 2400 }, { target: 0, wait: 1200 }];
    let step = 0, position = 0, velocity = 0, from = 0, start = 0;
    const render = value => {
      heroProgress.value = value * 100;
      if (heroProgressValue) heroProgressValue.textContent = `${Math.round(value * 100)}%`;
    };
    const advance = () => {
      if (document.hidden || activeTab !== 'home') { setTimeout(advance, 1000); return; }
      const target = steps[step].target;
      from = position; start = performance.now();
      if (reducedMotion.matches || target === 0) {
        position = target; velocity = 0; render(position);
        step = (step + 1) % steps.length;
        setTimeout(advance, steps[(step + steps.length - 1) % steps.length].wait);
        return;
      }
      const startVelocity = velocity;
      const frame = now => {
        const state = SpringPhysics.solve({ from, to: target, velocity: startVelocity, dampingRatio: 1, stiffness: 50, time: (now - start) / 1000 });
        position = state.position; velocity = state.velocity;
        if (Math.abs(position - target) < 0.001 && Math.abs(velocity) < 0.001) {
          position = target; velocity = 0; render(position);
          const wait = steps[step].wait;
          step = (step + 1) % steps.length;
          setTimeout(advance, wait);
          return;
        }
        render(position);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    setTimeout(advance, 600);
  }

  // =========================================================================
  // 7. Component examples (wired as each card is mounted)
  // =========================================================================
  const snackbarExamples = () => [...document.querySelectorAll('#snackbars md-snackbar')];
  const positionSnackbarExamples = () => snackbarExamples().concat(appSnackbar ? [appSnackbar] : []).forEach(positionSnackbar);
  const snackbarLayout = new ResizeObserver(positionSnackbarExamples);
  snackbarLayout.observe(mainEl);
  snackbarLayout.observe(bottomNav);
  new MutationObserver(positionSnackbarExamples).observe(root, { attributes: true, attributeFilter: ['dir'] });
  // The observer's first notification positions them after layout.
  const wiredDemoNodes = new WeakSet();
  const claim = node => !wiredDemoNodes.has(node) && !!wiredDemoNodes.add(node);
  const within = (scope, selector) => [...(scope.matches?.(selector) ? [scope] : []), ...scope.querySelectorAll(selector)];
  function wireDemos(scope) {
    const openers = [['open-dialog-btn', 'sample-dialog'], ['open-bottom-sheet-btn', 'sample-bottom-sheet'],
      ['open-side-sheet-btn', 'sample-side-sheet'], ['open-date-picker-btn', 'sample-date-picker'],
      ['open-time-picker-btn', 'sample-time-picker']];
    for (const [buttonId, targetId] of openers) {
      const button = within(scope, '#' + buttonId)[0], target = document.getElementById(targetId);
      if (button && target && claim(button)) button.addEventListener('click', () => target.show());
    }

    within(scope, '[data-toggle-rail]').forEach(button => {
      if (!claim(button)) return;
      button.addEventListener('click', () => {
        const demoRail = document.getElementById(button.dataset.toggleRail);
        if (!demoRail) return;
        demoRail.expanded = !demoRail.expanded;
        button.textContent = demoRail.expanded ? 'Collapse rail' : 'Expand rail';
      });
    });

    within(scope, '[data-open-drawer], [data-close-drawer]').forEach(button => {
      if (!claim(button)) return;
      button.addEventListener('click', () => {
        const demoDrawer = document.getElementById(button.dataset.openDrawer || button.dataset.closeDrawer);
        if (!demoDrawer) return;
        if (button.hasAttribute('data-open-drawer')) demoDrawer.show();
        else demoDrawer.close();
      });
    });

    within(scope, '[data-snackbar-target]').forEach(button => {
      if (!claim(button)) return;
      const snackbar = document.getElementById(button.dataset.snackbarTarget);
      if (snackbar) button.addEventListener('click', () => {
        document.querySelectorAll('#snackbars md-snackbar[open]').forEach(other => { if (other !== snackbar) other.close(); });
        if (appSnackbar?.open) appSnackbar.close();
        positionSnackbar(snackbar);
        snackbar.show();
      });
    });



    // Floating toolbar state belongs to its caller, as in the Compose samples.
    within(scope, '[data-toolbar-shape]').forEach(control => {
      if (!claim(control)) return;
      const toolbar = document.getElementById(control.dataset.toolbarShape);
      if (!toolbar) return;
      const shapes = [null, {type: 'rounded', corners: 16}, {type: 'cut', corners: 16}];
      control.addEventListener('change', event => {
        toolbar.shape = shapes[event.detail.selectedIndex] ?? null;
      });
    });
    within(scope, '[data-fab-toggle]').forEach(control => {
      if (!claim(control)) return;
      const examples = document.getElementById(control.dataset.fabToggle);
      if (!examples) return;
      const fabs = [...examples.querySelectorAll('md-fab')];
      const update = () => {
        const expanded = fabs.some(fab => fab.expanded);
        control.label = expanded ? 'Collapse labels' : 'Expand labels';
        control.setAttribute('aria-controls', examples.id);
        control.setAttribute('aria-expanded', String(expanded));
      };
      control.addEventListener('click', () => {
        const expanded = fabs.some(fab => fab.expanded);
        for (const fab of fabs) fab.expanded = !expanded;
        update();
      });
      examples.addEventListener('expanded-change', update);
      update();
    });
    within(scope, '[data-toolbar-toggle]').forEach(control => {
      if (!claim(control)) return;
      const toolbar = document.getElementById(control.dataset.toolbarToggle);
      if (!toolbar) return;
      const noun = toolbar.id === 'drawing-toolbar' ? 'tools' : 'actions';
      const update = () => {
        control.setAttribute('label', `${toolbar.expanded ? 'Collapse' : 'Expand'} ${noun}`);
        control.setAttribute('aria-controls', toolbar.id);
        control.setAttribute('aria-expanded', String(toolbar.expanded));
      };
      control.addEventListener('click', () => toolbar.toggle());
      toolbar.addEventListener('expanded-change', update);
      update();
    });
    within(scope, '[data-toolbar-scroll]').forEach(toolbar => {
      if (!claim(toolbar)) return;
      toolbar.scrollTarget=document.getElementById(toolbar.dataset.toolbarScroll);
      if(toolbar.dataset.toolbarScrollMode==='expand'){
        toolbar.scrollExpansion=new ToolbarScrollExpansion({expanded:toolbar.expanded,onExpand:()=>toolbar.expand(),onCollapse:()=>toolbar.collapse()});
      }else toolbar.scrollBehavior=new FloatingToolbarScrollBehavior({exitDirection:'bottom'});
    });
    within(scope, '[data-toolbar-fab-toggle]').forEach(fab => {
      if (!claim(fab)) return;
      const toolbar=document.getElementById(fab.dataset.toolbarFabToggle);if(!toolbar)return;
      // AndroidX HorizontalFloatingToolbarWithFabSample owns this callback.
      const update=()=>{
        const expanded=String(toolbar.expanded);
        fab.setAttribute('aria-label',toolbar.expanded?'Collapse actions':'Expand actions');
        fab.setAttribute('aria-controls',toolbar.id);fab.setAttribute('aria-expanded',expanded);
      };
      fab.addEventListener('click',()=>toolbar.toggle());toolbar.addEventListener('expanded-change',update);update();
    });
    within(scope, '[data-top-app-bar-scroll]').forEach(bar => {
      if (!claim(bar)) return;
      const content=document.getElementById(bar.dataset.topAppBarScroll);
      if(!content)return;
      bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways({isScrollingContentAtStart:()=>content.scrollTop===0});
      bar.scrollTarget=content;
    });
    within(scope, '[data-bottom-app-bar-scroll]').forEach(bar => {
      if (!claim(bar)) return;
      const content=document.getElementById(bar.dataset.bottomAppBarScroll);if(!content)return;
      bar.scrollBehavior=BottomAppBarScrollBehavior.exitAlways({element:bar});bar.scrollTarget=content;
    });

    const paginator = within(scope, '#demo-paginator')[0];
    const pagePreview = document.querySelector('#paginator-content-preview .md-title-medium');
    if (paginator && pagePreview && claim(paginator)) {
      const updatePage = () => {
        const start = paginator.length ? paginator.pageIndex * paginator.pageSize + 1 : 0;
        const end = Math.min((paginator.pageIndex + 1) * paginator.pageSize, paginator.length);
        pagePreview.textContent = `Active Page Records ${start}–${end} (Page ${paginator.pageIndex + 1})`;
      };
      paginator.addEventListener('page', updatePage);
      updatePage();
    }

    // Stepper Interactive Wizard Wiring
    const stepper = within(scope, '#demo-stepper')[0];
    const prevBtn = document.getElementById('stepper-prev-btn');
    const nextBtn = document.getElementById('stepper-next-btn');
    const resetBtn = document.getElementById('stepper-reset-btn');

    if (stepper && claim(stepper)) {
      const syncStepperActions = () => {
        const steps = stepper.getSteps();
        if (prevBtn) prevBtn.disabled = !steps.slice(0, stepper.activeStep).some(step => !step.disabled);
        if (nextBtn) nextBtn.disabled = !steps.slice(stepper.activeStep + 1).some(step => !step.disabled);
      };
      stepper.addEventListener('step-change', syncStepperActions);
      stepper.addEventListener('reset', syncStepperActions);
      syncStepperActions();
      nextBtn?.addEventListener('click', () => {
        stepper.next();
      });
      prevBtn?.addEventListener('click', () => {
        stepper.prev();
      });
      resetBtn?.addEventListener('click', () => {
        stepper.reset();
      });
    }

    // Shapes Interactive Morph Wiring
    const morphShape = document.getElementById('interactive-morph-shape');
    const shapeButtons = within(scope, '.shape-btn');
    shapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const shapeName = btn.dataset.shape || btn.getAttribute('data-shape');
        if (morphShape && shapeName) {
          morphShape.setAttribute('name', shapeName);
          shapeButtons.forEach(b => b.removeAttribute('selected'));
          btn.setAttribute('selected', '');
        }
      });
    });
  }
  mountHooks.push(card => { wireDemos(card); wireColorLab(card); highlightAllCodeBlocks(card); });
  wireDemos(document);
  wireColorLab(document);

  // =========================================================================
  // 8. Code highlighting (color roles only)
  // =========================================================================
  // One left-to-right scan, so a URL inside a string is never read as a comment.
  const SYNTAX = new RegExp([
    '(?<comment>&lt;!--[\\s\\S]*?--&gt;|\\/\\/[^\\n]*)',
    '(?<string>"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)',
    '(?<tag>&lt;\\/?[a-zA-Z][\\w-]*|\\/?&gt;)',
    '(?<attr>\\b[a-zA-Z_][\\w-]*(?==))',
    '(?<keyword>\\b(?:import|from|export|default|const|let|return|function|class|new|if|else)\\b)',
    '(?<cmd>\\b(?:npm|pnpm|bun|npx|yarn)\\b(?= ))',
    '(?<pkg>@materialwebunofficial\\/md3e-web[\\w./-]*)',
    '(?<num>\\b\\d+(?:\\.\\d+)?\\b|\\b(?:true|false|null|undefined)\\b)',
    '(?<func>\\b(?:applyDynamicTheme|useEffect|defineConfig|createElement|addEventListener|setAttribute|startsWith)\\b)'
  ].join('|'), 'g');

  function highlightAllCodeBlocks(scope = document) {
    scope.querySelectorAll('.code-block-wrapper pre code, .comp-code-box code').forEach(el => {
      if (el.dataset.highlighted) return;
      const escaped = el.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      el.innerHTML = escaped.replace(SYNTAX, (match, ...args) => {
        const groups = args.at(-1);
        const kind = Object.keys(groups).find(name => groups[name] !== undefined);
        return `<span class="syn-${kind}">${match}</span>`;
      });
      el.dataset.highlighted = 'true';
    });
  }

  highlightAllCodeBlocks();

  // =========================================================================
  // 9. AMBIENT SEQUENTIAL BACKGROUND WAVE ENGINE (MD3E SHOWCASE EXCLUSIVE)
  // =========================================================================
  function initAmbientSequentialWave() {
    const stageWrapper = document.getElementById('ambientStageWrapper');
    const anchor = document.getElementById('ambientWaveAnchor');
    const canvas = document.getElementById('ambientWaveCanvas');
    if (!stageWrapper || !anchor || !canvas) return;
    const ambientMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Sequential Pipeline Steps (Configured by User)
    const pipelineSteps = [
      {
        stepIndex: 1,
        name: 'Animasyon 1 (Dikey Akış)',
        scale: 4.00,
        flowMode: 'forward',
        formation: 'linear',
        lineCount: 1,
        lineGap: 120,
        leadLag: 0,
        phaseOffset: 85,
        strokeWidth: 80,
        amplitude: 55,
        wavelength: 200,
        pulsePercent: 45,
        speed: 1.8,
        angle: 115,
        posX: 0,
        posY: 0,
        lengthVh: 200,
        opacity: 0.75,
        trackMode: 'none',
        waitAfterSeconds: 1.2,
        zIndex: 2 // Behind Live Showcase & All Texts/Cards
      },
      {
        stepIndex: 2,
        name: 'Animasyon 2 (Çift Hat Çapraz Akış)',
        scale: 2.35,
        flowMode: 'bidirectional',
        formation: 'random',
        lineCount: 4,
        lineGap: 215,
        leadLag: 240,
        phaseOffset: 100,
        strokeWidth: 22,
        amplitude: 30,
        wavelength: 120,
        pulsePercent: 25,
        speed: 1.3,
        angle: 210,
        posX: 0,
        posY: -25, // Lifted into the hero & live showcase area
        lengthVh: 120,
        opacity: 0.25,
        trackMode: 'none',
        waitAfterSeconds: 0.0,
        zIndex: 10 // Over Live Showcase card surface, behind all inner elements, texts and cards
      }
    ];

    // Zero-Reflow Dynamic Theme Color Cache
    let cachedThemeColor = '';
    function updateThemeColor() {
      const computed = getComputedStyle(document.documentElement);
      const primary = computed.getPropertyValue('--md-sys-color-primary').trim();
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      cachedThemeColor = primary || (isDark ? '#d0bcff' : '#6750a4');
    }
    updateThemeColor();

    const themeObserver = new MutationObserver(() => updateThemeColor());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-theme-scheme', 'style']
    });

    function getFormationOffset(i, count, leadLag, formation) {
      if (count <= 1 || leadLag === 0) return 0;
      const norm = (i - (count - 1) / 2);

      switch (formation) {
        case 'v-shape':
          return -Math.abs(norm) * Math.abs(leadLag) * (leadLag >= 0 ? 1 : -1);
        case 'inverted-v':
          return Math.abs(norm) * Math.abs(leadLag) * (leadLag >= 0 ? 1 : -1);
        case 'zigzag':
          return (i % 2 === 0 ? 0.6 : -0.6) * leadLag;
        case 'random':
          return Math.sin((i + 1) * 12.9898) * leadLag;
        case 'linear':
        default:
          return norm * leadLag;
      }
    }

    function getStepMetrics(step) {
      const scale = step.scale || 1.0;
      const screenDiag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
      const vhPx = window.innerHeight * (step.lengthVh / 100);
      // Cap maximum canvas width to screen diagonal with comfortable bleed margin (avoids 13k px buffer thrashing)
      const w = Math.min(3200, Math.max(screenDiag * 1.3, vhPx, 2400));

      const strokeWidth = step.strokeWidth * scale;
      const amplitude = step.amplitude * scale;
      const wavelength = step.wavelength * scale;
      const lineGap = (step.lineGap || 48) * scale;
      const leadLag = (step.leadLag || 0) * scale;
      const pulseLengthPx = w * (step.pulsePercent / 100);
      const maxLeadLagSpan = Math.abs(leadLag) * (step.lineCount - 1);
      const totalTravelDist = w + pulseLengthPx + maxLeadLagSpan;

      const duration = (totalTravelDist / (350 * scale)) / step.speed;
      return {
        w,
        scale,
        strokeWidth,
        amplitude,
        wavelength,
        lineGap,
        leadLag,
        pulseLengthPx,
        maxLeadLagSpan,
        totalTravelDist,
        duration
      };
    }

    // Pre-calculated Timeline (Zero allocation per frame)
    let timeline = [];
    let totalCycle = 1;

    function buildTimeline() {
      timeline = [];
      let cursor = 0;
      pipelineSteps.forEach(step => {
        const metrics = getStepMetrics(step);
        const start = cursor;
        const end = start + metrics.duration;
        const nextStart = end + step.waitAfterSeconds;
        timeline.push({
          step,
          metrics,
          start,
          end,
          nextStart,
          duration: metrics.duration
        });
        cursor = nextStart;
      });
      totalCycle = cursor || 1;
    }

    buildTimeline();
    window.addEventListener('resize', buildTimeline, { passive: true });

    let startTime = performance.now();
    let ambientPaused = false;
    // The loop only runs while the homepage is visible; it resumes when it is shown again.
    let running = false;
    let pausedAt = null;
    // Nothing is drawn while the waves are scrolled out of view.
    let onScreen = true;
    const shouldRun = () => onScreen && !ambientMotionPreference.matches && !document.hidden &&
      (document.body.getAttribute('data-active-tab') || 'home') === 'home' && window.innerWidth > 839;
    const resume = () => {
      if (running || !shouldRun()) return;
      if (pausedAt !== null) { startTime += performance.now() - pausedAt; pausedAt = null; }
      running = true;
      requestAnimationFrame(draw);
    };
    ambientMotionPreference.addEventListener('change', () => {
      if (ambientPaused && !ambientMotionPreference.matches) {
        ambientPaused = false;
        startTime = performance.now();
      }
      resume();
    });
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('resize', resume, { passive: true });
    new MutationObserver(resume).observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
    new IntersectionObserver(entries => {
      onScreen = entries.at(-1).isIntersecting;
      resume();
    }).observe(canvas);

    function draw(now) {
      const activeTab = document.body.getAttribute('data-active-tab') || 'home';
      const isMobile = window.innerWidth <= 839;
      if (ambientMotionPreference.matches) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ambientPaused = true;
        running = false;
        return;
      }
      if (!onScreen || document.hidden || activeTab !== 'home' || isMobile) {
        running = false;
        pausedAt = now;
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const totalElapsed = (now - startTime) / 1000;
      const cycleTime = totalElapsed % totalCycle;

      // Find active step
      let currentItem = null;
      let isWaitingGap = false;

      for (let i = 0; i < timeline.length; i++) {
        const item = timeline[i];
        if (cycleTime >= item.start && cycleTime < item.end) {
          currentItem = item;
          isWaitingGap = false;
          break;
        } else if (cycleTime >= item.end && cycleTime < item.nextStart) {
          currentItem = item;
          isWaitingGap = true;
          break;
        }
      }

      // Clear canvas
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentItem && !isWaitingGap) {
        const step = currentItem.step;
        const m = currentItem.metrics;

        // Dynamic Stacking Layer per Animation Step
        const targetZ = step.zIndex ? String(step.zIndex) : '2';
        if (stageWrapper.style.zIndex !== targetZ) {
          stageWrapper.style.zIndex = targetZ;
        }

        // Position & Rotate
        const transform = `translateX(-50%) translate(${step.posX}vw, ${step.posY}vh) rotate(${step.angle}deg)`;
        if (anchor.style.transform !== transform) anchor.style.transform = transform;

        const count = step.lineCount || 1;
        const totalSpan = (count - 1) * m.lineGap;
        const h = Math.max(240, (m.amplitude * 2) + totalSpan + m.strokeWidth + 120);
        const centerY = h / 2;

        const reqW = Math.round(m.w * dpr);
        const reqH = Math.round(h * dpr);

        if (canvas.width !== reqW || canvas.height !== reqH) {
          canvas.width = reqW;
          canvas.height = reqH;
          canvas.style.width = `${m.w}px`;
          canvas.style.height = `${h}px`;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const stepTime = cycleTime - currentItem.start;
        const wavelength = m.wavelength;
        const amp = m.amplitude;
        const pulseLengthPx = m.pulseLengthPx;
        const totalTravelDist = m.totalTravelDist;
        const activeDuration = currentItem.duration;

        const progress = stepTime / activeDuration;
        const basePhase = (stepTime * (wavelength * step.speed * 0.8)) % wavelength;
        const staggerFrac = (step.phaseOffset / 100);

        // Adaptive step resolution for 60fps / 120fps hardware acceleration
        const stepX = Math.max(4, Math.round(wavelength / 36));

        for (let i = 0; i < count; i++) {
          const lineOffset = (i - (count - 1) / 2) * m.lineGap;
          const strandPhase = (basePhase + (i * wavelength * staggerFrac * 0.35)) % wavelength;
          const waveY = (x) => (centerY + lineOffset) + amp * Math.sin(((x - strandPhase) * 2 * Math.PI) / wavelength);

          const formOffset = getFormationOffset(i, count, m.leadLag, step.formation || 'linear');

          ctx.beginPath();
          ctx.strokeStyle = cachedThemeColor;
          ctx.globalAlpha = step.opacity;
          ctx.lineWidth = m.strokeWidth;

          const strokeSlice = (sX, eX) => {
            const clampedS = Math.max(0, sX);
            const clampedE = Math.min(m.w, eX);
            if (clampedE > clampedS) {
              ctx.moveTo(clampedS, waveY(clampedS));
              for (let x = clampedS + stepX; x < clampedE; x += stepX) {
                ctx.lineTo(x, waveY(x));
              }
              ctx.lineTo(clampedE, waveY(clampedE));
            }
          };

          switch (step.flowMode) {
            case 'reverse': {
              const head = m.w - (progress * totalTravelDist) - formOffset;
              const tail = head + pulseLengthPx;
              strokeSlice(head, tail);
              break;
            }
            case 'bidirectional': {
              if (i % 2 === 0) {
                const head = (progress * totalTravelDist) + formOffset;
                const tail = head - pulseLengthPx;
                strokeSlice(tail, head);
              } else {
                const head = m.w - (progress * totalTravelDist) - formOffset;
                const tail = head + pulseLengthPx;
                strokeSlice(head, tail);
              }
              break;
            }
            case 'center-out': {
              const halfW = m.w / 2;
              const halfDist = halfW + pulseLengthPx;
              const headR = halfW + (progress * halfDist) + formOffset;
              const tailR = headR - pulseLengthPx;
              strokeSlice(tailR, headR);
              const headL = halfW - (progress * halfDist) - formOffset;
              const tailL = headL + pulseLengthPx;
              strokeSlice(headL, tailL);
              break;
            }
            case 'converge': {
              const halfW = m.w / 2;
              const halfDist = halfW + pulseLengthPx;
              const headR = m.w - (progress * halfDist) - formOffset;
              const tailR = headR + pulseLengthPx;
              strokeSlice(headR, tailR);
              const headL = (progress * halfDist) + formOffset;
              const tailL = headL - pulseLengthPx;
              strokeSlice(tailL, headL);
              break;
            }
            case 'endless': {
              const travel = (progress * (m.w + pulseLengthPx));
              const head = travel + formOffset;
              const tail = head - pulseLengthPx;
              strokeSlice(tail, head);
              const headWrap = head - (m.w + pulseLengthPx);
              const tailWrap = headWrap - pulseLengthPx;
              strokeSlice(tailWrap, headWrap);
              break;
            }
            case 'forward':
            default: {
              const head = (progress * totalTravelDist) + formOffset;
              const tail = head - pulseLengthPx;
              strokeSlice(tail, head);
              break;
            }
          }

          ctx.stroke();
        }
      }

      ctx.restore();
      if (currentItem && isWaitingGap) {
        // Between passes the canvas stays clear: sleep until the next pass starts.
        setTimeout(() => requestAnimationFrame(draw), (currentItem.nextStart - cycleTime) * 1000);
      } else {
        requestAnimationFrame(draw);
      }
    }

    resume();
  }

  initAmbientSequentialWave();

}
