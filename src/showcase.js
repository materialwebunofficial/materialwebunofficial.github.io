/**
 * Material Design 3 Expressive (MD3E) — Showcase Controller
 * Pure M3 Tonal Surface, 15-Step Typescale, Dynamic CAM16 HCT Theming, and Spring Physics
 */

import { SpringPhysics } from './motion/spring-physics.js';
import { applyDynamicTheme, rgbToHct, hexToRgb, hctToHex } from './theme/hct-color-engine.js';
import {FloatingToolbarScrollBehavior,ToolbarScrollExpansion} from './components/toolbar-scroll.js';
import {TopAppBarScrollBehavior} from './components/top-app-bar-scroll.js';
import {BottomAppBarScrollBehavior} from './components/bottom-app-bar-scroll.js';

const STORAGE_KEYS = {
  THEME_MODE: 'md3e_theme_mode',
  THEME_SCHEME: 'md3e_theme_scheme',
  MOTION_SCHEME: 'md3e_motion_scheme',
  HCT_STATE: 'md3e_hct_state',
  HCT_VERSION: 'md3e_hct_version',
  SEED_HEX: 'md3e_seed_hex'
};

const MD3_PRESETS = [
  { name: 'Baseline Purple', hex: '#6750A4' },
  { name: 'Expressive Violet', hex: '#185EAC' },
  { name: 'Expressive Ocean', hex: '#00639B' },
  { name: 'Forest Green', hex: '#386A20' },
  { name: 'Warm Amber', hex: '#7D5700' },
  { name: 'Vibrant Coral', hex: '#9C4146' }
];

export function initShowcase() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // 1. Theme & Scheme Controls Wiring
  const schemeToggle = document.getElementById('scheme-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const railMotionToggle = document.getElementById('rail-motion-toggle');
  const railThemeToggle = document.getElementById('rail-theme-toggle');
  const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
  const mobileMotionToggle = document.getElementById('mobile-motion-toggle');

  // Load Persisted Settings from localStorage (works on localhost, github.io, etc.)
  let savedThemeMode = 'dark';
  let savedThemeScheme = 'expressive';
  let savedMotionScheme = 'expressive';
  let savedHct = rgbToHct(103, 80, 164);

  try {
    const mode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    if (mode === 'dark' || mode === 'light') savedThemeMode = mode;

    const scheme = localStorage.getItem(STORAGE_KEYS.THEME_SCHEME);
    if (scheme) savedThemeScheme = scheme;

    const motion = localStorage.getItem(STORAGE_KEYS.MOTION_SCHEME);
    if (motion) savedMotionScheme = motion;

    const rawHct = localStorage.getItem(STORAGE_KEYS.HCT_STATE);
    if (rawHct) {
      const parsed = JSON.parse(rawHct);
      if (typeof parsed.hue === 'number' && typeof parsed.chroma === 'number' && typeof parsed.tone === 'number') {
        savedHct = parsed;
      }
    }
    // Older releases persisted Lab-LCH under the HCT name. Preserve the selected
    // sRGB seed, then recompute real HCT instead of interpreting old coordinates.
    if (localStorage.getItem(STORAGE_KEYS.HCT_VERSION) !== 'mcu-0.4.0') {
      const previousSeed = localStorage.getItem(STORAGE_KEYS.SEED_HEX) || '#6750a4';
      const rgb = hexToRgb(previousSeed);
      savedHct = rgbToHct(rgb.r, rgb.g, rgb.b);
    }
  } catch (_) {}

  // Apply initial persisted settings to document
  document.documentElement.setAttribute('data-theme', savedThemeMode);
  document.documentElement.setAttribute('data-theme-scheme', savedThemeScheme);
  document.documentElement.setAttribute('data-motion-scheme', savedMotionScheme);
  SpringPhysics.setScheme(savedMotionScheme);

  // HCT Live State initialized from saved storage
  const hctState = {
    hue: savedHct.hue,
    chroma: savedHct.chroma,
    tone: savedHct.tone
  };

  function syncSchemeButtonLabels() {
    const currentScheme = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';
    const isExpressive = currentScheme === 'expressive';
    if (schemeToggle) {
      schemeToggle.textContent = `Scheme: ${isExpressive ? 'Expressive' : 'Standard'}`;
    }
    if (railMotionToggle) {
      const icon = railMotionToggle.querySelector('.mat-sym');
      if (icon) icon.textContent = isExpressive ? 'auto_awesome' : 'tune';
      railMotionToggle.title = `Theme Scheme: ${isExpressive ? 'Expressive (Active)' : 'Standard (Active)'}`;
    }
    if (mobileMotionToggle) {
      const icon = mobileMotionToggle.querySelector('.mat-sym');
      if (icon) icon.textContent = isExpressive ? 'auto_awesome' : 'tune';
      mobileMotionToggle.title = `Theme Scheme: ${isExpressive ? 'Expressive (Active)' : 'Standard (Active)'}`;
    }
  }

  function toggleThemeScheme() {
    const current = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';
    const next = current === 'expressive' ? 'standard' : 'expressive';
    document.documentElement.setAttribute('data-theme-scheme', next);
    document.documentElement.setAttribute('data-motion-scheme', next);
    SpringPhysics.setScheme(next);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_SCHEME, next);
      localStorage.setItem(STORAGE_KEYS.MOTION_SCHEME, next);
    } catch (_) {}
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyDynamicTheme(hctState, isDark, next);
    syncSchemeButtonLabels();
  }

  if (schemeToggle) {
    schemeToggle.addEventListener('click', toggleThemeScheme);
  }

  if (railMotionToggle) {
    railMotionToggle.addEventListener('click', toggleThemeScheme);
  }

  if (mobileMotionToggle) {
    mobileMotionToggle.addEventListener('click', toggleThemeScheme);
  }

  function syncThemeButtonLabels() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (themeToggle) {
      themeToggle.textContent = `Mode: ${isDark ? 'Dark' : 'Light'}`;
    }
    if (railThemeToggle) {
      const icon = railThemeToggle.querySelector('.mat-sym');
      if (icon) icon.textContent = isDark ? 'dark_mode' : 'light_mode';
    }
    if (mobileThemeToggle) {
      const icon = mobileThemeToggle.querySelector('.mat-sym');
      if (icon) icon.textContent = isDark ? 'dark_mode' : 'light_mode';
    }
  }

  function toggleColorMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextMode = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextMode);
    try { localStorage.setItem(STORAGE_KEYS.THEME_MODE, nextMode); } catch (_) {}
    const scheme = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';
    applyDynamicTheme(hctState, nextMode === 'dark', scheme);
    syncThemeButtonLabels();
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleColorMode);
  }

  if (railThemeToggle) {
    railThemeToggle.addEventListener('click', toggleColorMode);
  }

  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', toggleColorMode);
  }

  syncSchemeButtonLabels();
  syncThemeButtonLabels();

  // Use the audited drawer for responsive catalogue navigation.
  const catalogueDrawer = document.getElementById('components-sub-nav');
  const drawerToggles = [document.getElementById('mobile-drawer-toggle'), document.getElementById('rail-drawer-toggle')].filter(Boolean);
  const permanentDrawer = window.matchMedia('(min-width: 1200px)');
  function syncDrawerVariant() {
    catalogueDrawer.close();
    catalogueDrawer.variant = permanentDrawer.matches ? 'standard' : 'modal';
  }
  syncDrawerVariant();
  permanentDrawer.addEventListener('change', syncDrawerVariant);
  const syncDrawerToggles = () => {
    // Gestures belong to the visible catalogue sheet, avoiding closed sibling demo drawers.
    catalogueDrawer.gesturesEnabled = catalogueDrawer.open && !permanentDrawer.matches;
    drawerToggles.forEach(button => button.setAttribute('aria-expanded', String(catalogueDrawer.open)));
  };
  new MutationObserver(syncDrawerToggles).observe(catalogueDrawer, { attributes: true, attributeFilter: ['open'] });
  drawerToggles.forEach(button => button.addEventListener('click', () => {
    if (catalogueDrawer.open) catalogueDrawer.close();
    else catalogueDrawer.show();
  }));

  // 3. Tab Switching Architecture (home, get-started, components)
  const railNavigation = document.querySelector('md-navigation-rail.app-nav-rail');
  const mobileNavigation = document.querySelector('md-navigation-bar.mobile-bottom-nav');
  const primaryTabs = ['home', 'get-started', 'components'];
  const tabViews = document.querySelectorAll('.tab-view');
  const subNavLinks = document.querySelectorAll('.sub-nav-drawer a[href]');

  function switchTab(tabId, scrollToTop = true, updateHash = true) {
    document.body.setAttribute('data-active-tab', tabId);

    if (railNavigation) railNavigation.selected = primaryTabs.indexOf(tabId);

    if (mobileNavigation) mobileNavigation.selected = primaryTabs.indexOf(tabId);

    catalogueDrawer.selected = primaryTabs.indexOf(tabId);

    tabViews.forEach(view => {
      view.classList.toggle('active', view.id === `tab-view-${tabId}`);
    });

    if (tabId === 'components') {
      document.body.classList.remove('drawer-collapsed');
    } else {
      document.body.classList.add('drawer-collapsed');
    }

    catalogueDrawer.close();
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (updateHash) {
      history.replaceState(null, '', `#${tabId}`);
    }
  }

  // Set initial active tab synchronously from URL hash (prevents CLS)
  const initialHash = (window.location.hash || '').replace('#', '').trim();
  let initialTab = 'home';
  if (initialHash === 'components' || initialHash === 'overview' || document.getElementById(initialHash)) {
    initialTab = 'components';
  } else if (initialHash === 'get-started' || initialHash === 'getstarted') {
    initialTab = 'get-started';
  }

  document.body.setAttribute('data-active-tab', initialTab);
  if (initialTab === 'components') {
    document.body.classList.remove('drawer-collapsed');
  } else {
    document.body.classList.add('drawer-collapsed');
  }

  tabViews.forEach(view => {
    view.classList.toggle('active', view.id === `tab-view-${initialTab}`);
  });
  if (railNavigation) railNavigation.selected = primaryTabs.indexOf(initialTab);
  if (mobileNavigation) mobileNavigation.selected = primaryTabs.indexOf(initialTab);
  catalogueDrawer.selected = primaryTabs.indexOf(initialTab);


  railNavigation?.addEventListener('change', event => {
    const tabId = primaryTabs[event.detail.index];
    if (tabId) switchTab(tabId, true, true);
  });

  mobileNavigation?.addEventListener('change', event => {
    const tabId = primaryTabs[event.detail.index];
    if (tabId) switchTab(tabId, true, true);
  });

  document.querySelectorAll('[data-toggle-rail]').forEach(button => {
    button.addEventListener('click', () => {
      const rail = document.getElementById(button.dataset.toggleRail);
      if (!rail) return;
      rail.expanded = !rail.expanded;
      button.textContent = rail.expanded ? 'Collapse rail' : 'Expand rail';
    });
  });

  document.querySelectorAll('[data-open-drawer], [data-close-drawer]').forEach(button => {
    button.addEventListener('click', () => {
      const drawer = document.getElementById(button.dataset.openDrawer || button.dataset.closeDrawer);
      if (!drawer) return;
      if (button.hasAttribute('data-open-drawer')) drawer.show();
      else drawer.close();
    });
  });

  catalogueDrawer.addEventListener('click', event => {
    if (event.composedPath().some(node => node.matches?.('.item[role="tab"]'))) catalogueDrawer.close();
  });
  catalogueDrawer.addEventListener('change', event => {
    const tabId = primaryTabs[event.detail.index];
    if (tabId) switchTab(tabId, true, true);
  });

  // Generic navigation attribute handler: [data-navigate-tab]
  document.querySelectorAll('[data-navigate-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = el.getAttribute('data-navigate-tab');
      if (tabId) switchTab(tabId, true, true);
    });
  });

  // 4. Sub-Navigation Accordions & Links
  function setAccordionOpen(accordion, open) {
    accordion.classList.toggle('open', open);
    accordion.querySelector('.sub-nav-accordion-header').setAttribute('aria-expanded', String(open));
  }
  document.querySelectorAll('.sub-nav-accordion').forEach(accordion => {
    const header = accordion.querySelector('.sub-nav-accordion-header');
    const content = accordion.querySelector('.sub-nav-accordion-content');
    content.id = `catalogue-group-${accordion.dataset.group}`;
    header.setAttribute('aria-controls', content.id);
    header.setAttribute('aria-expanded', String(accordion.classList.contains('open')));
    header.addEventListener('click', () => setAccordionOpen(accordion, !accordion.classList.contains('open')));
  });
  function setSectionSelection(targetId) {
    subNavLinks.forEach(link => {
      const active = link.dataset.target === targetId;
      link.classList.toggle('active', active);
      if (active) {
        link.setAttribute('aria-current', 'location');
        const accordion = link.closest('.sub-nav-accordion');
        if (accordion) setAccordionOpen(accordion, true);
      } else link.removeAttribute('aria-current');
    });
  }

  function navigateToSection(targetId, smooth = true) {
    switchTab('components', false, false);
    history.replaceState(null, '', `#${targetId}`);

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
      setSectionSelection(targetId);
    }
  }

  subNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href')?.replace('#', '') || link.dataset.target;
      if (targetId) {
        e.preventDefault();
        navigateToSection(targetId, true);
      }
    });
  });

  // Delegate in-page category title anchor clicks
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor || anchor.closest('.sub-nav-drawer') || anchor.closest('.app-nav-rail')) return;
    const targetId = anchor.getAttribute('href')?.replace('#', '');
    if (targetId) {
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        navigateToSection(targetId, true);
      }
    }
  });

  // 5. Initial Hash Router (Handles direct URL / F5 refresh)
  function handleRouteFromHash() {
    const rawHash = (window.location.hash || '').replace('#', '').trim();
    if (!rawHash || rawHash === 'home') {
      switchTab('home', false, false);
      return;
    }

    if (rawHash === 'get-started' || rawHash === 'getstarted') {
      switchTab('get-started', false, false);
      return;
    }

    if (rawHash === 'components' || rawHash === 'overview') {
      switchTab('components', false, false);
      const overviewEl = document.getElementById('overview');
      if (overviewEl) overviewEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      setSectionSelection('overview');
      return;
    }

    // Any other section anchor (e.g. #tabs, #segmented-buttons, #chips, #buttons, etc.)
    navigateToSection(rawHash, false);
  }

  window.addEventListener('hashchange', handleRouteFromHash);
  handleRouteFromHash();

  // 6. Scroll-spy active drawer item
  const componentSections = [...document.querySelectorAll('#tab-view-components .category-section, #overview')];
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        setSectionSelection(id);
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  componentSections.forEach(sec => sec && scrollObserver.observe(sec));

  // 6. Interactive Demo Wiring (Dialog, Sheet, Time Picker, Snackbar)
  const openDialogBtn = document.getElementById('open-dialog-btn');
  const sampleDialog = document.getElementById('sample-dialog');
  if (openDialogBtn && sampleDialog) {
    openDialogBtn.addEventListener('click', () => sampleDialog.show());
  }

  const openBottomSheetBtn = document.getElementById('open-bottom-sheet-btn');
  const sampleBottomSheet = document.getElementById('sample-bottom-sheet');
  if (openBottomSheetBtn && sampleBottomSheet) {
    openBottomSheetBtn.addEventListener('click', () => sampleBottomSheet.show());
  }

  const openSideSheetBtn = document.getElementById('open-side-sheet-btn');
  const sampleSideSheet = document.getElementById('sample-side-sheet');
  if (openSideSheetBtn && sampleSideSheet) {
    openSideSheetBtn.addEventListener('click', () => sampleSideSheet.show());
  }

  const snackbarExamples = [...document.querySelectorAll('#snackbars md-snackbar')];
  const snackbarMain = document.querySelector('main.main'), snackbarBottomNav = document.querySelector('md-navigation-bar.mobile-bottom-nav');
  const positionSnackbarExamples = () => {
    const rect = snackbarMain.getBoundingClientRect();
    const left = Math.max(0, rect.left) + 16, right = Math.max(0, window.innerWidth - rect.right) + 16;
    const bottom = (getComputedStyle(snackbarBottomNav).display === 'none' ? 0 : snackbarBottomNav.getBoundingClientRect().height) + 16;
    snackbarExamples.forEach(snackbar => {
      const rtl = getComputedStyle(snackbar).direction === 'rtl';
      snackbar.style.setProperty('--md-snackbar-inline-start', (rtl ? right : left) + 'px');
      snackbar.style.setProperty('--md-snackbar-inline-end', (rtl ? left : right) + 'px');
      snackbar.style.setProperty('--md-snackbar-bottom', bottom + 'px');
    });
  };
  const snackbarLayout = new ResizeObserver(positionSnackbarExamples); snackbarLayout.observe(snackbarMain); snackbarLayout.observe(snackbarBottomNav);
  const snackbarDirection = new MutationObserver(positionSnackbarExamples);
  snackbarDirection.observe(document.documentElement, {attributes: true, attributeFilter: ['dir']});
  snackbarDirection.observe(document.body, {attributes: true, attributeFilter: ['dir']});
  positionSnackbarExamples();
  document.querySelectorAll('[data-snackbar-target]').forEach(button => {
    const snackbar = document.getElementById(button.dataset.snackbarTarget);
    if (snackbar) button.addEventListener('click', () => {
      document.querySelectorAll('#snackbars md-snackbar[open]').forEach(other => { if (other !== snackbar) other.close(); });
      positionSnackbarExamples();
      snackbar.show();
    });
  });

  const openDatePickerBtn = document.getElementById('open-date-picker-btn');
  const sampleDatePicker = document.getElementById('sample-date-picker');
  if (openDatePickerBtn && sampleDatePicker) {
    openDatePickerBtn.addEventListener('click', () => sampleDatePicker.show());
  }

  const openTimePickerBtn = document.getElementById('open-time-picker-btn');
  const sampleTimePicker = document.getElementById('sample-time-picker');
  if (openTimePickerBtn && sampleTimePicker) {
    openTimePickerBtn.addEventListener('click', () => sampleTimePicker.show());
  }

  // 6.1 Expressive Slider Independent Binding
  const heroLiveSlider = document.getElementById('hero-live-slider');
  const heroSliderVal = document.getElementById('hero-slider-val');

  if (heroLiveSlider) {
    heroLiveSlider.addEventListener('input', (e) => {
      const val = typeof e.detail?.value === 'number' ? Math.round(e.detail.value) : Math.round(parseFloat(heroLiveSlider.value || '50'));
      if (heroSliderVal) heroSliderVal.textContent = `${val}`;
    });
  }

  // 6.2 Autonomous Organic Download Simulation Loop for Wavy Progress (8%, 27%, 68%, 96%, 100%)
  const heroWavyProgress = document.getElementById('hero-wavy-progress');
  const heroProgressVal = document.getElementById('hero-progress-val');

  if (heroWavyProgress) {
    const downloadSteps = [
      { target: 8, duration: 750, wait: 400 },
      { target: 27, duration: 950, wait: 350 },
      { target: 68, duration: 1200, wait: 500 },
      { target: 96, duration: 850, wait: 450 },
      { target: 100, duration: 400, wait: 2000 },
      { target: 0, duration: 300, wait: 600 }
    ];

    let stepIndex = 0;
    let currentVal = 0;

    function animateToNextStep() {
      const step = downloadSteps[stepIndex];
      const startVal = currentVal;
      const targetVal = step.target;
      const startTime = performance.now();

      function stepFrame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / step.duration, 1);
        // Emphasized Decelerate Easing (M3)
        const ease = 1 - Math.pow(1 - progress, 3);
        const floatVal = startVal + (targetVal - startVal) * ease;
        currentVal = floatVal;

        if (heroWavyProgress) heroWavyProgress.value = floatVal;
        if (heroProgressVal) heroProgressVal.textContent = `${Math.round(floatVal)}%`;

        if (progress < 1) {
          requestAnimationFrame(stepFrame);
        } else {
          currentVal = targetVal;
          if (heroWavyProgress) heroWavyProgress.value = targetVal;
          if (heroProgressVal) heroProgressVal.textContent = `${Math.round(targetVal)}%`;

          stepIndex = (stepIndex + 1) % downloadSteps.length;
          setTimeout(animateToNextStep, step.wait);
        }
      }

      requestAnimationFrame(stepFrame);
    }

    setTimeout(animateToNextStep, 600);
  }

  // 7. Dynamic Color Seed Dot Engine (Home Experiment Band & Elsewhere)
  function applyColorHex(hex) {
    syncAllFromHex(hex);
  }

  document.querySelectorAll('.quick-color-dot, .seed-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const hex = dot.dataset.hex;
      if (hex) applyColorHex(hex);
    });
  });

  // 8. Framework Code Switcher Tabs (Get Started Tab)
  const frameworkBtns = document.querySelectorAll('.framework-tab-btn');
  const frameworkPanels = document.querySelectorAll('.framework-tab-panel');

  frameworkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const framework = btn.dataset.framework;
      frameworkBtns.forEach(b => b.classList.toggle('active', b.dataset.framework === framework));
      frameworkPanels.forEach(p => p.classList.toggle('active', p.dataset.framework === framework));
      highlightAllCodeBlocks();
    });
  });

  // 9. Unified Code Copy Engine
  async function handleSnippetCopy(btn, targetContainer) {
    const codeEl = targetContainer.querySelector('code');
    if (!codeEl) return;
    const textToCopy = codeEl.textContent.trim();
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      const originalHTML = btn.innerHTML;
      btn.classList.add('copied');
      
      // If the button originally had text (like in Get Started .copy-code-btn), include "Copied!" text
      if (btn.classList.contains('copy-code-btn') && originalHTML.includes('Copy')) {
        btn.innerHTML = `<span class="mat-sym" style="font-size: 16px; color: var(--md-sys-color-on-primary, #ffffff) !important;">check</span> Copied!`;
      } else {
        btn.innerHTML = `<span class="mat-sym" style="font-size: 16px; color: var(--md-sys-color-on-primary, #ffffff) !important;">check</span>`;
      }

      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = originalHTML;
      }, 1600);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  }

  // Bind to all copy buttons across the entire site
  document.querySelectorAll('.copy-code-btn, .comp-code-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const container = btn.closest('.code-block-wrapper, .comp-code-box, .install-snippet-box, .next-steps-card');
      if (container) {
        handleSnippetCopy(btn, container);
      }
    });
  });

  // 9.2 Section Heading Copy Link Anchor Buttons
  document.querySelectorAll('.copy-anchor-btn').forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      pressScale(btn, 0.88, 'expressiveSpatialFast');
    });
    const releaseAnchor = () => {
      releaseScale(btn, 0.88, 'expressiveSpatialMedium');
    };
    btn.addEventListener('pointerup', releaseAnchor);
    btn.addEventListener('pointercancel', releaseAnchor);

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const anchor = btn.dataset.anchor;
      const url = `${window.location.origin}${window.location.pathname}#${anchor}`;

      try {
        await navigator.clipboard.writeText(url);
      } catch (_) {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }

      if (history.pushState) {
        history.pushState(null, null, `#${anchor}`);
      }

      const tooltip = btn.querySelector('.copy-anchor-tooltip');
      btn.classList.add('copied');
      if (tooltip) tooltip.textContent = 'Link copied';

      setTimeout(() => {
        btn.classList.remove('copied');
        if (tooltip) tooltip.textContent = 'Copy link';
      }, 2000);
    });
  });

  // 10. Dynamic HCT Color Customizer Wiring (#theming section)
  const presetSwatchesContainer = document.getElementById('preset-swatches');
  const hueSlider = document.getElementById('hue-slider');
  const chromaSlider = document.getElementById('chroma-slider');
  const toneSlider = document.getElementById('tone-slider');
  const hueValDisplay = document.getElementById('hue-val-display');
  const chromaValDisplay = document.getElementById('chroma-val-display');
  const toneValDisplay = document.getElementById('tone-val-display');
  const nativeColorPicker = document.getElementById('native-color-picker');
  const hexCodeInput = document.getElementById('hex-code-input');
  const resetColorBtn = document.getElementById('reset-color-btn');

  const customColorSwatchDisplay = document.getElementById('custom-color-swatch-display');

  function applyHctColor(updateInputs = true) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const scheme = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';
    applyDynamicTheme(hctState, isDark, scheme);

    const hex = hctToHex(hctState.hue, hctState.chroma, hctState.tone);

    try {
      localStorage.setItem(STORAGE_KEYS.HCT_STATE, JSON.stringify(hctState));
      localStorage.setItem(STORAGE_KEYS.HCT_VERSION, 'mcu-0.4.0');
      localStorage.setItem(STORAGE_KEYS.SEED_HEX, hex);
    } catch (_) {}

    if (customColorSwatchDisplay) {
      customColorSwatchDisplay.style.backgroundColor = hex;
    }

    if (updateInputs) {
      if (nativeColorPicker) nativeColorPicker.value = hex;
      if (hexCodeInput) hexCodeInput.value = hex.toUpperCase();
    }

    if (presetSwatchesContainer) {
      presetSwatchesContainer.querySelectorAll('.preset-swatch-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.hex.toLowerCase() === hex.toLowerCase());
      });
    }

    document.querySelectorAll('.quick-color-dot, .seed-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.hex.toLowerCase() === hex.toLowerCase());
    });
  }

  function syncAllFromHex(hex) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const scheme = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';

    const rgb = hexToRgb(hex);
    const hct = rgbToHct(rgb.r, rgb.g, rgb.b);

    hctState.hue = hct.hue;
    hctState.chroma = hct.chroma;
    hctState.tone = hct.tone;

    try {
      localStorage.setItem(STORAGE_KEYS.HCT_STATE, JSON.stringify(hctState));
      localStorage.setItem(STORAGE_KEYS.HCT_VERSION, 'mcu-0.4.0');
      localStorage.setItem(STORAGE_KEYS.SEED_HEX, hex);
    } catch (_) {}

    applyDynamicTheme(hctState, isDark, scheme);

    if (customColorSwatchDisplay) {
      customColorSwatchDisplay.style.backgroundColor = hex;
    }

    if (hueSlider) hueSlider.value = hctState.hue;
    if (chromaSlider) chromaSlider.value = hctState.chroma;
    if (toneSlider) toneSlider.value = hctState.tone;

    if (hueValDisplay) hueValDisplay.textContent = `${Math.round(hctState.hue)}°`;
    if (chromaValDisplay) chromaValDisplay.textContent = `${Math.round(hctState.chroma)}`;
    if (toneValDisplay) toneValDisplay.textContent = `${Math.round(hctState.tone)}`;

    if (nativeColorPicker) nativeColorPicker.value = hex;
    if (hexCodeInput) hexCodeInput.value = hex.toUpperCase();

    if (presetSwatchesContainer) {
      presetSwatchesContainer.querySelectorAll('.preset-swatch-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.hex.toLowerCase() === hex.toLowerCase());
      });
    }

    document.querySelectorAll('.quick-color-dot, .seed-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.hex.toLowerCase() === hex.toLowerCase());
    });
  }

  let hctRafId = null;
  function scheduleApplyHctColor(updateInputs = true) {
    if (hctRafId) cancelAnimationFrame(hctRafId);
    hctRafId = requestAnimationFrame(() => {
      applyHctColor(updateInputs);
      hctRafId = null;
    });
  }

  if (presetSwatchesContainer) {
    const currentInitHex = hctToHex(hctState.hue, hctState.chroma, hctState.tone).toLowerCase();
    presetSwatchesContainer.innerHTML = MD3_PRESETS.map(p => `
      <button class="preset-swatch-item ${p.hex.toLowerCase() === currentInitHex ? 'active' : ''}" data-hex="${p.hex}" type="button">
        <span class="preset-swatch-dot" style="background-color: ${p.hex};"></span>
        <span>${p.name}</span>
      </button>
    `).join('');

    presetSwatchesContainer.querySelectorAll('.preset-swatch-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hex;
        syncAllFromHex(hex);
      });
    });
  }

  if (hueSlider) {
    hueSlider.addEventListener('input', (e) => {
      const val = typeof e.detail?.value === 'number' ? e.detail.value : parseFloat(hueSlider.value);
      hctState.hue = val;
      if (hueValDisplay) hueValDisplay.textContent = `${Math.round(val)}°`;
      scheduleApplyHctColor(true);
    });
  }

  if (chromaSlider) {
    chromaSlider.addEventListener('input', (e) => {
      const val = typeof e.detail?.value === 'number' ? e.detail.value : parseFloat(chromaSlider.value);
      hctState.chroma = val;
      if (chromaValDisplay) chromaValDisplay.textContent = `${Math.round(val)}`;
      scheduleApplyHctColor(true);
    });
  }

  if (toneSlider) {
    toneSlider.addEventListener('input', (e) => {
      const val = typeof e.detail?.value === 'number' ? e.detail.value : parseFloat(toneSlider.value);
      hctState.tone = val;
      if (toneValDisplay) toneValDisplay.textContent = `${Math.round(val)}`;
      scheduleApplyHctColor(true);
    });
  }

  // Initial Sync from loaded / persisted HCT state
  if (hueSlider) hueSlider.value = hctState.hue;
  if (chromaSlider) chromaSlider.value = hctState.chroma;
  if (toneSlider) toneSlider.value = hctState.tone;
  if (hueValDisplay) hueValDisplay.textContent = `${Math.round(hctState.hue)}°`;
  if (chromaValDisplay) chromaValDisplay.textContent = `${Math.round(hctState.chroma)}`;
  if (toneValDisplay) toneValDisplay.textContent = `${Math.round(hctState.tone)}`;
  applyHctColor(true);

  // HSV / RGB conversion helpers for 2D picker
  function hsvToRgb(h, s, v) {
    const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return {
      r: Math.round(f(5) * 255),
      g: Math.round(f(3) * 255),
      b: Math.round(f(1) * 255)
    };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s, v };
  }

  function rgbToHexStr(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // MD3E Color Picker Popover Elements
  const md3eColorPopover = document.getElementById('md3e-color-popover');
  const popoverCloseBtn = document.getElementById('popover-close-btn');
  const popoverApplyBtn = document.getElementById('popover-apply-btn');
  const colorSvArea = document.getElementById('color-sv-area');
  const colorSvHandle = document.getElementById('color-sv-handle');
  const colorHueBar = document.getElementById('color-hue-bar');
  const colorHueHandle = document.getElementById('color-hue-handle');
  const popoverHexVal = document.getElementById('popover-hex-val');

  let currentHsv = { h: 280, s: 0.6, v: 0.64 };

  function updatePopoverControls(hex) {
    if (popoverHexVal) popoverHexVal.textContent = hex.toUpperCase();
    const rgb = hexToRgb(hex);
    currentHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    if (colorSvArea) {
      const pureHueRgb = hsvToRgb(currentHsv.h, 1, 1);
      colorSvArea.style.backgroundColor = rgbToHexStr(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b);
    }
    if (colorSvHandle) {
      colorSvHandle.style.left = `${Math.min(100, Math.max(0, currentHsv.s * 100))}%`;
      colorSvHandle.style.top = `${Math.min(100, Math.max(0, (1 - currentHsv.v) * 100))}%`;
    }
    if (colorHueHandle) {
      colorHueHandle.style.left = `${Math.min(100, Math.max(0, (currentHsv.h / 360) * 100))}%`;
    }
  }

  function openPopover() {
    if (!md3eColorPopover) return;
    md3eColorPopover.removeAttribute('hidden');
    md3eColorPopover.style.display = 'flex';
    customColorSwatchDisplay?.setAttribute('aria-expanded', 'true');
    const curHex = hctToHex(hctState.hue, hctState.chroma, hctState.tone);
    updatePopoverControls(curHex);
  }

  function closePopover() {
    if (!md3eColorPopover) return;
    md3eColorPopover.setAttribute('hidden', '');
    md3eColorPopover.style.display = 'none';
    customColorSwatchDisplay?.setAttribute('aria-expanded', 'false');
  }

  function togglePopover() {
    const isHidden = md3eColorPopover?.hasAttribute('hidden') || md3eColorPopover?.style.display === 'none';
    if (isHidden) {
      openPopover();
    } else {
      closePopover();
    }
  }

  if (customColorSwatchDisplay) {
    customColorSwatchDisplay.addEventListener('pointerdown', () => {
      pressScale(customColorSwatchDisplay, 0.88, 'expressiveSpatialFast');
    });
    const releaseSwatch = () => {
      releaseScale(customColorSwatchDisplay, 0.88, 'expressiveSpatialMedium');
    };
    customColorSwatchDisplay.addEventListener('pointerup', releaseSwatch);
    customColorSwatchDisplay.addEventListener('pointercancel', releaseSwatch);

    customColorSwatchDisplay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover();
    });
  }

  if (popoverCloseBtn) {
    popoverCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
    });
  }

  if (popoverApplyBtn) {
    popoverApplyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
    });
  }

  document.addEventListener('click', (e) => {
    if (!md3eColorPopover || md3eColorPopover.hasAttribute('hidden')) return;
    const wrapper = document.getElementById('custom-color-swatch-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      closePopover();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && md3eColorPopover && !md3eColorPopover.hasAttribute('hidden')) {
      closePopover();
    }
  });

  // 2D SV Canvas Pointer Interaction
  if (colorSvArea) {
    let svDragging = false;
    const updateSvFromPointer = (e) => {
      const rect = colorSvArea.getBoundingClientRect();
      const x = Math.min(rect.width, Math.max(0, e.clientX - rect.left));
      const y = Math.min(rect.height, Math.max(0, e.clientY - rect.top));
      const s = x / rect.width;
      const v = 1 - (y / rect.height);
      currentHsv.s = s;
      currentHsv.v = v;
      if (colorSvHandle) {
        colorSvHandle.style.left = `${s * 100}%`;
        colorSvHandle.style.top = `${(1 - v) * 100}%`;
      }
      const rgb = hsvToRgb(currentHsv.h, currentHsv.s, currentHsv.v);
      const hex = rgbToHexStr(rgb.r, rgb.g, rgb.b);
      syncAllFromHex(hex);
      if (popoverHexVal) popoverHexVal.textContent = hex;
    };

    colorSvArea.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      svDragging = true;
      colorSvArea.setPointerCapture?.(e.pointerId);
      updateSvFromPointer(e);
    });

    colorSvArea.addEventListener('pointermove', (e) => {
      if (!svDragging) return;
      updateSvFromPointer(e);
    });

    const endSv = (e) => {
      if (svDragging) {
        svDragging = false;
        try { colorSvArea.releasePointerCapture?.(e.pointerId); } catch (_) {}
      }
    };
    colorSvArea.addEventListener('pointerup', endSv);
    colorSvArea.addEventListener('pointercancel', endSv);
  }

  // Hue Bar Pointer Interaction
  if (colorHueBar) {
    let hueDragging = false;
    const updateHueFromPointer = (e) => {
      const rect = colorHueBar.getBoundingClientRect();
      const x = Math.min(rect.width, Math.max(0, e.clientX - rect.left));
      const ratio = x / rect.width;
      const h = Math.min(360, Math.max(0, ratio * 360));
      currentHsv.h = h;
      if (colorHueHandle) {
        colorHueHandle.style.left = `${ratio * 100}%`;
      }
      if (colorSvArea) {
        const pureHueRgb = hsvToRgb(h, 1, 1);
        colorSvArea.style.backgroundColor = rgbToHexStr(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b);
      }
      const rgb = hsvToRgb(currentHsv.h, currentHsv.s, currentHsv.v);
      const hex = rgbToHexStr(rgb.r, rgb.g, rgb.b);
      syncAllFromHex(hex);
      if (popoverHexVal) popoverHexVal.textContent = hex;
    };

    colorHueBar.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      hueDragging = true;
      colorHueBar.setPointerCapture?.(e.pointerId);
      updateHueFromPointer(e);
    });

    colorHueBar.addEventListener('pointermove', (e) => {
      if (!hueDragging) return;
      updateHueFromPointer(e);
    });

    const endHue = (e) => {
      if (hueDragging) {
        hueDragging = false;
        try { colorHueBar.releasePointerCapture?.(e.pointerId); } catch (_) {}
      }
    };
    colorHueBar.addEventListener('pointerup', endHue);
    colorHueBar.addEventListener('pointercancel', endHue);
  }

  // Swatches inside Popover
  document.querySelectorAll('.popover-swatch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const hex = btn.dataset.hex;
      if (hex) {
        syncAllFromHex(hex);
        updatePopoverControls(hex);
      }
    });
  });

  if (hexCodeInput) {
    hexCodeInput.addEventListener('input', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        syncAllFromHex(val);
        updatePopoverControls(val);
      }
    });
  }

  if (resetColorBtn) {
    resetColorBtn.addEventListener('click', () => {
      Object.assign(hctState, rgbToHct(103, 80, 164));
      applyHctColor(true);
      if (hueSlider) hueSlider.value = 300;
      if (chromaSlider) chromaSlider.value = 48;
      if (toneSlider) toneSlider.value = 40;
      if (hueValDisplay) hueValDisplay.textContent = '300°';
      if (chromaValDisplay) chromaValDisplay.textContent = '48';
      if (toneValDisplay) toneValDisplay.textContent = '40';
      const hex = hctToHex(300, 48, 40);
      updatePopoverControls(hex);
    });
  }

  // 11. Built-in Micro Syntax Highlighter
  function highlightAllCodeBlocks() {
    document.querySelectorAll('.code-block-wrapper pre code, .comp-code-box code, .install-snippet-box code').forEach(el => {
      if (el.dataset.highlighted) return;
      const text = el.textContent;

      const tokens = [];
      function addToken(content, cls) {
        const id = `@@@MD3E_TK_${tokens.length}@@@`;
        tokens.push(`<span class="${cls}">${content}</span>`);
        return id;
      }

      // Step 1: Escape HTML entities from raw source text
      let raw = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Step 2: Extract & tokenize Comments (<!-- ... -->, // ..., # ...)
      raw = raw.replace(/(&lt;!--[\s\S]*?--&gt;|\/\/[^\n]*|#[^\n]*)/g, m => addToken(m, 'syn-comment'));

      // Step 3: Extract & tokenize Strings ("...", '...', `...`)
      raw = raw.replace(/(&quot;(?:\\&quot;|[^&"\n])*&quot;|'(?:\\'|[^'\n])*'|"(?:\\"|[^"\n])*"`?|`(?:\\`|[^`])*`)/g, m => addToken(m, 'syn-string'));

      // Step 4: Extract & tokenize HTML / Web Component tags (&lt;/?tag-name and &gt;)
      raw = raw.replace(/(&lt;\/?[a-zA-Z0-9_-]+)/g, m => addToken(m, 'syn-tag'));
      raw = raw.replace(/(&gt;)/g, m => addToken(m, 'syn-tag'));

      // Step 5: Extract & tokenize HTML attributes before '='
      raw = raw.replace(/\b([a-zA-Z0-9_-]+)(?==)/g, m => addToken(m, 'syn-attr'));

      // Step 5.1: Standalone boolean attributes
      raw = raw.replace(/\s(interactive|toggle|selected|dismissible|multi-select)\b/g, (m, p1) => ' ' + addToken(p1, 'syn-attr'));

      // Step 6: CLI Commands & Package Names
      raw = raw.replace(/\b(npm|pnpm|bun|npx|yarn)\b/g, m => addToken(m, 'syn-cmd'));
      raw = raw.replace(/\b(@materialwebunofficial\/md3e-web|md3e-web-unofficial|md3e-web)\b/g, m => addToken(m, 'syn-pkg'));

      // Step 7: Language Keywords
      raw = raw.replace(/\b(import|from|export|default|const|let|var|return|function|class|extends|new|if|else|install|add|standalone|schemas|template|selector)\b/g, m => addToken(m, 'syn-keyword'));

      // Step 8: Numbers & Booleans
      raw = raw.replace(/\b(\d+(?:\.\d+)?|true|false|null|undefined)\b/g, m => addToken(m, 'syn-num'));

      // Step 9: Functions
      raw = raw.replace(/\b(applyDynamicTheme|SpringPhysics|generateKeyframes|useEffect|defineConfig|animate|querySelector|querySelectorAll|addEventListener|startsWith)\b/g, m => addToken(m, 'syn-func'));

      // Step 10: Re-insert all tokens
      for (let j = 0; j < tokens.length; j++) {
        raw = raw.replace(`@@@MD3E_TK_${j}@@@`, tokens[j]);
      }

      el.innerHTML = raw;
      el.dataset.highlighted = 'true';
    });
  }

  highlightAllCodeBlocks();


  // =========================================================================
  // 10. AMBIENT SEQUENTIAL BACKGROUND WAVE ENGINE (MD3E SHOWCASE EXCLUSIVE)
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
