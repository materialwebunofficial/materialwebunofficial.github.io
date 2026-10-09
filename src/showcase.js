/**
 * Showcase controller: theme state, adaptive navigation, the component
 * catalog, copy actions, and the wiring of interactive examples.
 */

import { SpringPhysics } from './motion/spring-physics.js';
import { applyDynamicTheme, rgbToHct, hexToRgb, hctToHex, resolvePaletteVariant } from './theme/hct-color-engine.js';
import {FloatingToolbarScrollBehavior,ToolbarScrollExpansion} from './components/toolbar-scroll.js';
import {TopAppBarScrollBehavior} from './components/top-app-bar-scroll.js';
import {BottomAppBarScrollBehavior} from './components/bottom-app-bar-scroll.js';

const STORAGE_KEYS = {
  THEME_MODE: 'md3e_theme_mode',
  THEME_SCHEME: 'md3e_theme_scheme',
  MOTION_SCHEME: 'md3e_motion_scheme',
  HCT_STATE: 'md3e_hct_state',
  HCT_VERSION: 'md3e_hct_version',
  SEED_HEX: 'md3e_seed_hex',
  PALETTE_VARIANT: 'md3e_palette_variant',
  CONTRAST: 'md3e_contrast'
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
  try {
    const raw = JSON.parse(storage.get(STORAGE_KEYS.HCT_STATE) || 'null');
    if (raw && ['hue', 'chroma', 'tone'].every(key => Number.isFinite(raw[key]))) theme.hct = raw;
    // Older releases stored Lab-LCH coordinates; recompute HCT from the seed.
    if (storage.get(STORAGE_KEYS.HCT_VERSION) !== 'mcu-0.4.0') {
      const rgb = hexToRgb(storage.get(STORAGE_KEYS.SEED_HEX) || '#6750a4');
      theme.hct = rgbToHct(rgb.r, rgb.g, rgb.b);
    }
  } catch {}

  const seedHex = () => hctToHex(theme.hct.hue, theme.hct.chroma, theme.hct.tone);

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
    syncThemeControls();
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
    if (docked) drawer.open = drawerPinned;
    drawer.gesturesEnabled = !docked;
    syncDrawerToggles();
  }

  function syncDrawerToggles() {
    drawerToggles.forEach(button => button.setAttribute('aria-expanded', String(drawer.open)));
  }

  new MutationObserver(syncDrawerToggles).observe(drawer, { attributes: true, attributeFilter: ['open'] });
  largeWindow.addEventListener('change', syncDrawerVariant);
  drawerToggles.forEach(button => button.addEventListener('click', () => {
    if (drawer.variant === 'dismissible') drawerPinned = !drawer.open;
    if (drawer.open) drawer.close(); else drawer.show();
  }));

  function setTabSelection(tabId) {
    const index = PRIMARY_TABS.indexOf(tabId);
    if (rail) rail.selected = index;
    if (bottomNav) bottomNav.selected = index;
  }

  function switchTab(tabId, { scroll = true, hash = true } = {}) {
    activeTab = tabId;
    document.body.setAttribute('data-active-tab', tabId);
    tabViews.forEach(view => view.classList.toggle('active', view.id === `tab-view-${tabId}`));
    setTabSelection(tabId);
    if (drawer.variant === 'modal') drawer.close();
    syncDrawerVariant();
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
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant', block: 'start' });
    selectCatalogEntry(id);
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
    if (!id || !document.getElementById(id)) return;
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
    const target = document.getElementById(id);
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
    if (activeTab !== 'components') return;
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
  const chipSets = [document.getElementById('preset-swatches'), document.getElementById('home-seed-chips')].filter(Boolean);
  chipSets.forEach(set => {
    for (const preset of SEED_PRESETS) {
      const chip = document.createElement('md-chip');
      chip.className = 'preset-swatch-item';
      chip.setAttribute('variant', 'filter');
      chip.setAttribute('label', preset.name);
      chip.dataset.hex = preset.hex;
      const swatch = document.createElement('span');
      swatch.slot = 'leading-icon';
      swatch.className = 'seed-swatch';
      swatch.style.setProperty('--seed', preset.hex);
      chip.append(swatch);
      chip.addEventListener('change', () => setSeedHex(preset.hex));
      set.append(chip);
    }
  });

  const hueSlider = document.getElementById('hue-slider');
  const chromaSlider = document.getElementById('chroma-slider');
  const toneSlider = document.getElementById('tone-slider');
  const hueValue = document.getElementById('hue-val-display');
  const chromaValue = document.getElementById('chroma-val-display');
  const toneValue = document.getElementById('tone-val-display');
  const hexInput = document.getElementById('hex-code-input');
  const variantSelect = document.getElementById('palette-variant-select');
  const contrastControl = document.getElementById('contrast-segmented');

  function syncColorControls({ fromSlider = null } = {}) {
    const hex = seedHex().toLowerCase();
    document.querySelectorAll('.preset-swatch-item').forEach(chip => {
      chip.selected = chip.dataset.hex.toLowerCase() === hex;
    });
    if (hexInput && document.activeElement !== hexInput) hexInput.value = hex.toUpperCase();
    if (hueSlider && fromSlider !== hueSlider) hueSlider.value = theme.hct.hue;
    if (chromaSlider && fromSlider !== chromaSlider) chromaSlider.value = theme.hct.chroma;
    if (toneSlider && fromSlider !== toneSlider) toneSlider.value = theme.hct.tone;
    if (hueValue) hueValue.textContent = `${Math.round(theme.hct.hue)}°`;
    if (chromaValue) chromaValue.textContent = `${Math.round(theme.hct.chroma)}`;
    if (toneValue) toneValue.textContent = `${Math.round(theme.hct.tone)}`;
    if (variantSelect && variantSelect.value !== theme.variant) variantSelect.value = theme.variant;
    if (contrastControl) {
      const index = CONTRAST_LEVELS.indexOf(theme.contrast);
      if (contrastControl.getAttribute('selected-index') !== String(index)) contrastControl.setAttribute('selected-index', String(index));
    }
  }

  function setSeedHex(hex) {
    const rgb = hexToRgb(hex);
    theme.hct = rgbToHct(rgb.r, rgb.g, rgb.b);
    persistColor();
    applyTheme();
  }

  let colorFrame = 0;
  function scheduleColor(fromSlider) {
    cancelAnimationFrame(colorFrame);
    colorFrame = requestAnimationFrame(() => {
      persistColor();
      applyDynamicTheme(theme.hct, theme.dark, theme.variant);
      syncColorControls({ fromSlider });
    });
  }

  for (const [slider, key] of [[hueSlider, 'hue'], [chromaSlider, 'chroma'], [toneSlider, 'tone']]) {
    slider?.addEventListener('input', event => {
      theme.hct = { ...theme.hct, [key]: typeof event.detail?.value === 'number' ? event.detail.value : Number(slider.value) };
      scheduleColor(slider);
    });
  }

  hexInput?.addEventListener('input', () => {
    let value = String(hexInput.value || '').trim();
    if (!value.startsWith('#')) value = `#${value}`;
    if (/^#[0-9a-f]{6}$/i.test(value)) setSeedHex(value);
  });

  variantSelect?.addEventListener('change', () => {
    theme.variant = resolvePaletteVariant(variantSelect.value);
    storage.set(STORAGE_KEYS.PALETTE_VARIANT, theme.variant);
    applyTheme();
  });

  contrastControl?.addEventListener('change', event => {
    const index = Number(event.detail?.selectedIndex ?? contrastControl.getAttribute('selected-index'));
    theme.contrast = CONTRAST_LEVELS[index] ?? 'standard';
    storage.set(STORAGE_KEYS.CONTRAST, theme.contrast);
    applyTheme();
  });

  document.getElementById('reset-color-btn')?.addEventListener('click', () => {
    theme.variant = 'tonal-spot';
    theme.contrast = 'standard';
    storage.set(STORAGE_KEYS.PALETTE_VARIANT, theme.variant);
    storage.set(STORAGE_KEYS.CONTRAST, theme.contrast);
    setSeedHex(SEED_PRESETS[0].hex);
  });

  applyTheme();

  // Initial route, after the theme so first measurements use final tokens.
  const initialHash = LEGACY_ANCHORS[location.hash.slice(1)] ?? location.hash.slice(1);
  activeTab = PRIMARY_TABS.includes(initialHash) ? initialHash
    : initialHash && document.getElementById(initialHash)?.closest('#tab-view-get-started') ? 'get-started'
    : initialHash && document.getElementById(initialHash) ? 'components' : 'home';
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
  // 7. Component examples
  // =========================================================================
  const openers = [['open-dialog-btn', 'sample-dialog'], ['open-bottom-sheet-btn', 'sample-bottom-sheet'],
    ['open-side-sheet-btn', 'sample-side-sheet'], ['open-date-picker-btn', 'sample-date-picker'],
    ['open-time-picker-btn', 'sample-time-picker']];
  for (const [buttonId, targetId] of openers) {
    const button = document.getElementById(buttonId), target = document.getElementById(targetId);
    if (button && target) button.addEventListener('click', () => target.show());
  }

  document.querySelectorAll('[data-toggle-rail]').forEach(button => {
    button.addEventListener('click', () => {
      const demoRail = document.getElementById(button.dataset.toggleRail);
      if (!demoRail) return;
      demoRail.expanded = !demoRail.expanded;
      button.textContent = demoRail.expanded ? 'Collapse rail' : 'Expand rail';
    });
  });

  document.querySelectorAll('[data-open-drawer], [data-close-drawer]').forEach(button => {
    button.addEventListener('click', () => {
      const demoDrawer = document.getElementById(button.dataset.openDrawer || button.dataset.closeDrawer);
      if (!demoDrawer) return;
      if (button.hasAttribute('data-open-drawer')) demoDrawer.show();
      else demoDrawer.close();
    });
  });

  const snackbarExamples = [...document.querySelectorAll('#snackbars md-snackbar')];
  const positionSnackbarExamples = () => snackbarExamples.concat(appSnackbar ? [appSnackbar] : []).forEach(positionSnackbar);
  const snackbarLayout = new ResizeObserver(positionSnackbarExamples);
  snackbarLayout.observe(mainEl);
  snackbarLayout.observe(bottomNav);
  new MutationObserver(positionSnackbarExamples).observe(root, { attributes: true, attributeFilter: ['dir'] });
  positionSnackbarExamples();
  document.querySelectorAll('[data-snackbar-target]').forEach(button => {
    const snackbar = document.getElementById(button.dataset.snackbarTarget);
    if (snackbar) button.addEventListener('click', () => {
      document.querySelectorAll('#snackbars md-snackbar[open]').forEach(other => { if (other !== snackbar) other.close(); });
      if (appSnackbar?.open) appSnackbar.close();
      positionSnackbar(snackbar);
      snackbar.show();
    });
  });

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

  function highlightAllCodeBlocks() {
    document.querySelectorAll('.code-block-wrapper pre code, .comp-code-box code').forEach(el => {
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
    ambientMotionPreference.addEventListener('change', () => {
      if (ambientPaused && !ambientMotionPreference.matches) {
        ambientPaused = false;
        startTime = performance.now();
        requestAnimationFrame(draw);
      }
    });

    function draw(now) {
      const activeTab = document.body.getAttribute('data-active-tab') || 'home';
      const isMobile = window.innerWidth <= 839;
      if (ambientMotionPreference.matches) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ambientPaused = true;
        return;
      }
      if (document.hidden || activeTab !== 'home' || isMobile) {
        requestAnimationFrame(draw);
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
        anchor.style.transform = `translateX(-50%) translate(${step.posX}vw, ${step.posY}vh) rotate(${step.angle}deg)`;

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
      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }

  initAmbientSequentialWave();


  // Floating toolbar state belongs to its caller, as in the Compose samples.
  document.querySelectorAll('[data-toolbar-shape]').forEach(control => {
    const toolbar = document.getElementById(control.dataset.toolbarShape);
    if (!toolbar) return;
    const shapes = [null, {type: 'rounded', corners: 16}, {type: 'cut', corners: 16}];
    control.addEventListener('change', event => {
      toolbar.shape = shapes[event.detail.selectedIndex] ?? null;
    });
  });
  document.querySelectorAll('[data-fab-toggle]').forEach(control => {
    const examples = document.getElementById(control.dataset.fabToggle);
    if (!examples) return;
    const fabs = [...examples.querySelectorAll('md-fab')];
    const update = () => {
      const expanded = fabs.some(fab => fab.expanded);
      control.label = expanded ? 'Collapse labels' : 'Expand labels';
      control.setAttribute('aria-expanded', String(expanded));
      const button = control.shadowRoot?.querySelector('button');
      button?.setAttribute('aria-controls', examples.id);
      button?.setAttribute('aria-expanded', String(expanded));
    };
    control.addEventListener('click', () => {
      const expanded = fabs.some(fab => fab.expanded);
      for (const fab of fabs) fab.expanded = !expanded;
      update();
    });
    examples.addEventListener('expanded-change', update);
    update();
  });
  document.querySelectorAll('[data-toolbar-toggle]').forEach(control => {
    const toolbar = document.getElementById(control.dataset.toolbarToggle);
    if (!toolbar) return;
    const noun = toolbar.id === 'drawing-toolbar' ? 'tools' : 'actions';
    const update = () => {
      control.setAttribute('label', `${toolbar.expanded ? 'Collapse' : 'Expand'} ${noun}`);
      control.setAttribute('aria-expanded', String(toolbar.expanded));
      const button = control.shadowRoot?.querySelector('button');
      button?.setAttribute('aria-controls', toolbar.id);
      button?.setAttribute('aria-expanded', String(toolbar.expanded));
    };
    control.addEventListener('click', () => toolbar.toggle());
    toolbar.addEventListener('expanded-change', update);
    update();
  });
  document.querySelectorAll('[data-toolbar-scroll]').forEach(toolbar => {
    toolbar.scrollTarget=document.getElementById(toolbar.dataset.toolbarScroll);
    if(toolbar.dataset.toolbarScrollMode==='expand'){
      toolbar.scrollExpansion=new ToolbarScrollExpansion({expanded:toolbar.expanded,onExpand:()=>toolbar.expand(),onCollapse:()=>toolbar.collapse()});
    }else toolbar.scrollBehavior=new FloatingToolbarScrollBehavior({exitDirection:'bottom'});
  });
  document.querySelectorAll('[data-toolbar-fab-toggle]').forEach(fab=>{
    const toolbar=document.getElementById(fab.dataset.toolbarFabToggle);if(!toolbar)return;
    // AndroidX HorizontalFloatingToolbarWithFabSample owns this callback.
    const update=()=>{
      const expanded=String(toolbar.expanded);
      fab.setAttribute('aria-label',toolbar.expanded?'Collapse actions':'Expand actions');
      for(const node of [fab,fab.shadowRoot?.querySelector('button')].filter(Boolean)){
        node.setAttribute('aria-controls',toolbar.id);node.setAttribute('aria-expanded',expanded);
      }
    };
    fab.addEventListener('click',()=>toolbar.toggle());toolbar.addEventListener('expanded-change',update);update();
  });
  document.querySelectorAll('[data-top-app-bar-scroll]').forEach(bar=>{
    const content=document.getElementById(bar.dataset.topAppBarScroll);
    if(!content)return;
    bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways({isScrollingContentAtStart:()=>content.scrollTop===0});
    bar.scrollTarget=content;
  });
  document.querySelectorAll('[data-bottom-app-bar-scroll]').forEach(bar=>{
    const content=document.getElementById(bar.dataset.bottomAppBarScroll);if(!content)return;
    bar.scrollBehavior=BottomAppBarScrollBehavior.exitAlways({element:bar});bar.scrollTarget=content;
  });

  const paginator = document.getElementById('demo-paginator');
  const pagePreview = document.querySelector('#paginator-content-preview .md-title-medium');
  if (paginator && pagePreview) {
    const updatePage = () => {
      const start = paginator.length ? paginator.pageIndex * paginator.pageSize + 1 : 0;
      const end = Math.min((paginator.pageIndex + 1) * paginator.pageSize, paginator.length);
      pagePreview.textContent = `Active Page Records ${start}–${end} (Page ${paginator.pageIndex + 1})`;
    };
    paginator.addEventListener('page', updatePage);
    updatePage();
  }

  // Stepper Interactive Wizard Wiring
  const stepper = document.getElementById('demo-stepper');
  const prevBtn = document.getElementById('stepper-prev-btn');
  const nextBtn = document.getElementById('stepper-next-btn');
  const resetBtn = document.getElementById('stepper-reset-btn');

  if (stepper) {
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
  const shapeButtons = document.querySelectorAll('.shape-btn');
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
