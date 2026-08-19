/**
 * Material Design 3 Expressive (MD3E) — Showcase Controller
 * Pure M3 Tonal Surface, 15-Step Typescale, Dynamic CAM16 HCT Theming, and Spring Physics
 */

import { SpringPhysics } from './motion/spring-physics.js';
import { MdExpressiveTheme } from './index.js';
import { applyDynamicTheme, rgbToHct, hexToRgb, hctToHex } from './theme/hct-color-engine.js';

const STORAGE_KEYS = {
  THEME_MODE: 'md3e_theme_mode',
  THEME_SCHEME: 'md3e_theme_scheme',
  MOTION_SCHEME: 'md3e_motion_scheme',
  HCT_STATE: 'md3e_hct_state',
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
  let savedHct = { hue: 305, chroma: 52, tone: 40 };

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

  // 2. Mobile Drawer & Scrim Wiring
  const mobileDrawerToggle = document.getElementById('mobile-drawer-toggle');
  const drawerScrim = document.getElementById('drawer-scrim');
  if (mobileDrawerToggle) {
    mobileDrawerToggle.addEventListener('click', () => {
      document.body.classList.toggle('mobile-drawer-open');
    });
  }
  if (drawerScrim) {
    drawerScrim.addEventListener('click', () => {
      document.body.classList.remove('mobile-drawer-open');
    });
  }

  // 3. Tab Switching Architecture (home, get-started, components)
  const railItems = document.querySelectorAll('.rail-item');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  const drawerDestItems = document.querySelectorAll('.drawer-dest-item');
  const tabViews = document.querySelectorAll('.tab-view');
  const subNavLinks = document.querySelectorAll('.sub-nav-drawer a[href]');

  function switchTab(tabId, scrollToTop = true, updateHash = true) {
    document.body.setAttribute('data-active-tab', tabId);

    railItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    mobileNavItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    drawerDestItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    tabViews.forEach(view => {
      view.classList.toggle('active', view.id === `tab-view-${tabId}`);
    });

    if (tabId === 'components') {
      document.body.classList.remove('drawer-collapsed');
    } else {
      document.body.classList.add('drawer-collapsed');
    }

    document.body.classList.remove('mobile-drawer-open');
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (updateHash) {
      history.replaceState(null, '', `#${tabId}`);
    }
  }

  // Set initial active tab
  document.body.setAttribute('data-active-tab', 'home');


  railItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab, true, true);
    });
  });

  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab, true, true);
    });
  });

  drawerDestItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab, true, true);
    });
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
  document.querySelectorAll('.sub-nav-accordion-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const accordion = header.closest('.sub-nav-accordion');
      if (accordion) {
        accordion.classList.toggle('open');
      }
    });
  });

  function navigateToSection(targetId, smooth = true) {
    switchTab('components', false, false);
    document.body.classList.remove('mobile-drawer-open');
    history.replaceState(null, '', `#${targetId}`);

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
      subNavLinks.forEach(l => {
        const hrefId = (l.getAttribute('href') || '').replace('#', '');
        const isActive = hrefId === targetId || l.dataset.target === targetId;
        l.classList.toggle('active', isActive);
        if (isActive) {
          const accordion = l.closest('.sub-nav-accordion');
          if (accordion) accordion.classList.add('open');
        }
      });
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
    if (!anchor || anchor.closest('.sub-nav-drawer') || anchor.closest('.rail-item')) return;
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
      return;
    }

    // Any other section anchor (e.g. #tabs, #segmented-buttons, #chips, #buttons, etc.)
    switchTab('components', false, false);
    setTimeout(() => {
      navigateToSection(rawHash, false);
    }, 60);
  }

  window.addEventListener('hashchange', handleRouteFromHash);
  handleRouteFromHash();

  // 6. Scroll-spy active drawer item
  const componentSections = [...document.querySelectorAll('#tab-view-components .category-section, #overview')];
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        subNavLinks.forEach(l => {
          const hrefId = (l.getAttribute('href') || '').replace('#', '');
          if (hrefId === id || l.dataset.target === id) {
            subNavLinks.forEach(item => item.classList.remove('active'));
            l.classList.add('active');
          }
        });
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

  const showSnackbarBtn = document.getElementById('show-snackbar-btn');
  const sampleSnackbar = document.getElementById('sample-snackbar');
  if (showSnackbarBtn && sampleSnackbar) {
    showSnackbarBtn.addEventListener('click', () => sampleSnackbar.show('Item archived to your cloud storage.'));
  }

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

    hctState.hue = Math.round(hct.hue);
    hctState.chroma = Math.round(hct.chroma);
    hctState.tone = Math.round(hct.tone);

    try {
      localStorage.setItem(STORAGE_KEYS.HCT_STATE, JSON.stringify(hctState));
      localStorage.setItem(STORAGE_KEYS.SEED_HEX, hex);
    } catch (_) {}

    applyDynamicTheme(hctState, isDark, scheme);

    if (customColorSwatchDisplay) {
      customColorSwatchDisplay.style.backgroundColor = hex;
    }

    if (hueSlider) hueSlider.value = hctState.hue;
    if (chromaSlider) chromaSlider.value = hctState.chroma;
    if (toneSlider) toneSlider.value = hctState.tone;

    if (hueValDisplay) hueValDisplay.textContent = `${hctState.hue}°`;
    if (chromaValDisplay) chromaValDisplay.textContent = `${hctState.chroma}`;
    if (toneValDisplay) toneValDisplay.textContent = `${hctState.tone}`;

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
      hctState.hue = 300;
      hctState.chroma = 48;
      hctState.tone = 40;
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
      raw = raw.replace(/\b(md3e-web-unofficial)\b/g, m => addToken(m, 'syn-pkg'));

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

    const ctx = canvas.getContext('2d');
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


    function getDynamicThemeColor() {
      const computed = getComputedStyle(document.documentElement);
      const primary = computed.getPropertyValue('--md-sys-color-primary').trim();
      if (primary) return primary;
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      return isDark ? '#d0bcff' : '#6750a4';
    }

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
      const w = Math.max(screenDiag * 1.8, vhPx * scale, 3400);

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

    let startTime = performance.now();

    function draw(now) {
      const activeTab = document.body.getAttribute('data-active-tab') || 'home';
      const isMobile = window.innerWidth <= 839;
      if (document.hidden || activeTab !== 'home' || isMobile) {
        requestAnimationFrame(draw);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const totalElapsed = (now - startTime) / 1000;
      const dynamicPrimaryColor = getDynamicThemeColor();

      // Build active timeline
      const timeline = [];
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

      const totalCycle = cursor || 1;
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
        stageWrapper.style.zIndex = step.zIndex ? String(step.zIndex) : '2';

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

        const anchorRect = anchor.getBoundingClientRect();
        const anchorCenterX = anchorRect.left + anchorRect.width / 2;
        const anchorCenterY = anchorRect.top + anchorRect.height / 2;

        for (let i = 0; i < count; i++) {
          const lineOffset = (i - (count - 1) / 2) * m.lineGap;
          const strandPhase = (basePhase + (i * wavelength * staggerFrac * 0.35)) % wavelength;
          const waveY = (x) => (centerY + lineOffset) + amp * Math.sin(((x - strandPhase) * 2 * Math.PI) / wavelength);

          const formOffset = getFormationOffset(i, count, m.leadLag, step.formation || 'linear');

          ctx.beginPath();
          ctx.strokeStyle = dynamicPrimaryColor;
          ctx.globalAlpha = step.opacity;
          ctx.lineWidth = m.strokeWidth;

          const strokeSlice = (sX, eX) => {
            const clampedS = Math.max(0, sX);
            const clampedE = Math.min(m.w, eX);
            if (clampedE > clampedS) {
              ctx.moveTo(clampedS, waveY(clampedS));
              for (let x = clampedS + 2; x < clampedE; x += 2) {
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

}
