# Material Design 3 Expressive (MD3E) for Web — Unofficial

> **Web Components (Custom Elements v1) and CSS Design Tokens implementing Google's Material Design 3 Expressive design specifications.**

[![NPM Version](https://img.shields.io/npm/v/md3e-web-unofficial.svg)](https://www.npmjs.com/package/md3e-web-unofficial)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/bundle_size-345KB_min-blue.svg)](dist/md3-expressive.min.js)
[![Tests](https://img.shields.io/badge/tests-180_passed-green.svg)](scripts/)

> [!NOTE]
> **Unofficial Hobby Project & Disclaimer:** This library is an independent hobby project by [saglame193](https://github.com/saglame193), based on AndroidX Compose Material 3 (1.4+) and [m3.material.io](https://m3.material.io/) public specifications. It is not affiliated with or endorsed by Google.  
> Provided "as-is" without any warranty or guarantee of ongoing maintenance, updates, or support. Use at your own discretion.

---

## 1. Overview

`md3e-web-unofficial` provides vanilla web components and CSS tokens for Material Design 3 Expressive. Because it is built on standard Custom Elements, it can be used directly in plain HTML or with bundlers and frameworks (Vite, Webpack, React, Vue, Svelte, Next.js, Astro, Angular).

### Technical Overview
* **Standard Web Components:** Uses native Custom Elements v1 and Shadow DOM. No framework runtime required.
* **HCT Color Engine:** JavaScript implementation of CAM16-based HCT (Hue-Chroma-Tone) color calculations for dynamic tonal palettes and light/dark theme switching.
* **Spring Physics:** Numeric/analytic harmonic oscillator solver for motion presets (`MotionScheme.expressive()`).
* **Form Associated (FACE):** Inputs (`md-text-field`, `md-checkbox`, `md-radio-button`, `md-switch`, `md-slider`, `md-button`) integrate with native HTML `<form>` submission and validation.
* **TypeScript Support:** Includes full `.d.ts` declarations and `HTMLElementTagNameMap` mappings.

---

## 2. Installation & Usage

### NPM

```bash
npm install md3e-web-unofficial
```

### Module Bundlers (Vite, Webpack, Rollup, Next.js, etc.)

```javascript
// Import design tokens
import 'md3e-web-unofficial/tokens.css';

// Import components and utilities
import { MdButton, MdTheme, applyDynamicTheme } from 'md3e-web-unofficial';

// Optional: Apply HCT theme
applyDynamicTheme('#6750A4', false);
```

#### Selective / Subpath Imports:

```javascript
// Import specific token files
import 'md3e-web-unofficial/tokens/colors';
import 'md3e-web-unofficial/tokens/shapes';

// Import specific components
import { MdButton, MdSlider, MdDatePicker } from 'md3e-web-unofficial';
```

#### Example Markup:

```html
<md-button variant="filled" label="Submit" icon="send"></md-button>
<md-slider min="0" max="100" value="50" labeled ticks></md-slider>
<md-switch checked></md-switch>

<md-theme seed="#006A60" mode="light">
  <md-card variant="elevated">
    <md-progress-indicator value="75" wave></md-progress-indicator>
  </md-card>
</md-theme>
```

---

### CDN / Plain HTML (No Build Step)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MD3 Expressive Web Demo</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/md3e-web-unofficial/dist/tokens.min.css">
</head>
<body>

  <md-top-app-bar headline="App Title"></md-top-app-bar>
  <md-button variant="filled" label="Click Me" icon="check"></md-button>

  <script type="module" src="https://cdn.jsdelivr.net/npm/md3e-web-unofficial/dist/md3-expressive.min.js"></script>
</body>
</html>
```

---

## 3. Component Catalog

The library includes 36 component modules defining 38 Custom Element classes:

| Category | Components | Notes |
| :--- | :--- | :--- |
| **Actions & Buttons** | `<md-button>`, `<md-split-button>`, `<md-icon-button>`, `<md-fab>`, `<md-fab-menu>`, `<md-segmented-button>` | 5 size variants (XS–XL), shape morph on press, spring physics response. |
| **Inputs & Controls** | `<md-text-field>`, `<md-checkbox>`, `<md-radio-button>`, `<md-switch>`, `<md-slider>`, `<md-search-bar>` | 16dp slider track, 44dp handle, 3-stage switch morph, form-associated. |
| **Indicators & Progress** | `<md-progress-indicator>`, `<md-loading-indicator>`, `<md-badge>` | 7-shape morphing loading indicator, linear/circular wavy progress bars, badges. |
| **Content & Collections** | `<md-card>`, `<md-chip>`, `<md-list>`, `<md-list-item>`, `<md-carousel>`, `<md-divider>` | Multi-browse carousel, segmented list items, filter/action chips. |
| **Pickers** | `<md-date-picker>`, `<md-time-picker>` | 256dp radial clock face, calendar grid modal. |
| **Navigation & Bars** | `<md-top-app-bar>`, `<md-bottom-app-bar>`, `<md-navigation-bar>`, `<md-navigation-rail>`, `<md-navigation-drawer>`, `<md-tabs>`, `<md-toolbar>` | Floating and docked toolbars, active indicator pill transitions. |
| **Surfaces & Overlays** | `<md-dialog>`, `<md-bottom-sheet>`, `<md-side-sheet>`, `<md-menu>`, `<md-menu-item>`, `<md-snackbar>`, `<md-tooltip>` | Draggable bottom sheet with touch gestures, plain & rich tooltips (150ms enter / 100ms exit motion). |
| **Theme System** | `<md-theme>`, `<md-expressive-theme>` | Dynamic HCT palette injection and CSS variable management. |

---

## 4. Development & Testing

### Scripts

* **Build Distribution (`dist/`):**
  ```bash
  npm run build
  ```
* **Run Test Suite:**
  ```bash
  npm test
  ```
  Runs 180 automated unit, token, FACE, memory leak, and bundle integration tests.
* **Start Local Dev Server:**
  ```bash
  npm start
  ```

---

## 5. License, Disclaimer & Attribution

* **License:** Licensed under the **[Apache License 2.0](LICENSE)**.  
* **Author:** [saglame193](https://github.com/saglame193)  
* **Disclaimer:** This is a personal hobby project. It is provided without any warranty, and the maintainer assumes no liability for its use and makes no commitment to ongoing support or maintenance.

See the **[NOTICE](NOTICE)** file for third-party copyright notices regarding Google Material Design 3 and Android Open Source Project (AOSP) specifications.
