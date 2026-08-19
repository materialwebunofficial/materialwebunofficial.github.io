# MD3E Web (Unofficial) — Material Design 3 Expressive for Web

<p align="center">
  <strong>Unofficial, Zero-Dependency Vanilla Web Components & Dynamic HCT Theming Web Adaptation of Google's Material Design 3 Expressive</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://www.npmjs.com/package/@materialwebunofficial/md3e-web"><img src="https://img.shields.io/badge/npm-%40materialwebunofficial%2Fmd3e--web-red.svg?style=flat-square&logo=npm" alt="npm package"></a>
  <a href="#"><img src="https://img.shields.io/badge/dependencies-0-success?style=flat-square" alt="Zero Dependencies"></a>
  <a href="#"><img src="https://img.shields.io/badge/web%20components-v1-orange?style=flat-square&logo=w3c" alt="Web Components v1"></a>
  <a href="#"><img src="https://img.shields.io/badge/ESM-Native-purple?style=flat-square" alt="Native ESM"></a>
  <a href="https://materialwebunofficial.github.io/"><img src="https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-informational?style=flat-square&logo=googlechrome" alt="Live Demo"></a>
</p>

> **Unofficial Hobby Project & Disclaimer**: This project is an independent open-source hobby implementation and is not affiliated with, sponsored by, or endorsed by Google LLC. Vibe coded with Hermes Hy3 and Antigravity Gemini 3.7 Flash.
>
> It is provided "as-is" without any warranty or commitment to ongoing support or maintenance. Use at your own discretion.

---

## 🌟 Overview

**MD3E Web (Unofficial)** (`@materialwebunofficial/md3e-web`) is a zero-dependency, production-ready web implementation of Google's **Material Design 3 Expressive (M3 Expressive)** design system.

Built strictly on native W3C web standards (**Custom Elements v1**, **Shadow DOM v1**, **CSS Custom Properties**, and **ES Modules**), it brings Android Jetpack Compose 1.4+ expressive spring physics, 8-shape morphing vector loading indicators, CAM16-based dynamic HCT tonal color schemes, and 36 expressive components to **any web project or framework** with zero runtime overhead.

[**Live Demo**](https://materialwebunofficial.github.io/#home)

---

## ⚡ Integration Guide

Whether you are building a simple HTML landing page, WordPress/PHP site, or a modern React/Vue/Next.js application, integrating **MD3E Web** is straightforward:

---

### 1. Direct CDN Drop-in (Zero-Build CDN)

No build tools, bundlers, or Node.js required. Just add these 2 lines into the `<head>` of any HTML file:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-theme-scheme="expressive">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My MD3E Web Page</title>

  <!-- 1. CSS Design Tokens & Material Symbols (CDN) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@materialwebunofficial/md3e-web/dist/tokens.min.css">

  <!-- 2. Web Components Suite (Registers all 36 Custom Elements automatically) -->
  <script type="module" src="https://cdn.jsdelivr.net/npm/@materialwebunofficial/md3e-web/dist/md3-expressive.esm.js"></script>
</head>
<body>

  <!-- Ready to use immediately! -->
  <md-button variant="filled">Filled Button</md-button>
  <md-button variant="tonal">Tonal Button</md-button>
  <md-slider value="75" labeled></md-slider>
  <md-loading-indicator shape="morph" size="48"></md-loading-indicator>

</body>
</html>
```

*Alternative CDN:* You can also use unpkg (`https://unpkg.com/@materialwebunofficial/md3e-web/...`) or esm.sh (`https://esm.sh/@materialwebunofficial/md3e-web`).

---

### 2. Modern Package Manager (NPM / Vite / Next.js / Astro / Vue / React)

Install via npm or yarn:

```bash
npm install @materialwebunofficial/md3e-web
```

#### Global Import (In your app's root / `main.js` / `_app.tsx`):
```javascript
// 1. Import Design Tokens (Colors, Typography, Shapes, Motion, Icons)
import '@materialwebunofficial/md3e-web/tokens';

// 2. Import & Register All 36 Components
import '@materialwebunofficial/md3e-web';
```

#### Selective / Tree-shakeable Import:
```javascript
import '@materialwebunofficial/md3e-web/tokens/colors';
import '@materialwebunofficial/md3e-web/tokens/shapes';
import { MdButton, MdSlider, MdDatePicker } from '@materialwebunofficial/md3e-web';
```

---

### 3. Framework Integration (React / Next.js, Vue 3, Svelte, Angular)

Because MD3E components are standard W3C Custom Elements, they work natively across all modern frontend frameworks:

#### React / Next.js:
```tsx
import '@materialwebunofficial/md3e-web/tokens';
import '@materialwebunofficial/md3e-web';

export default function MyPage() {
  return (
    <div className="container">
      <md-button variant="filled" onClick={() => alert('Clicked!')}>
        Next.js + MD3E
      </md-button>
    </div>
  );
}
```

#### Vue 3:
```vue
<template>
  <md-button variant="elevated" @click="handleAction">Vue 3 Expressive</md-button>
  <md-slider v-model="sliderVal" labeled></md-slider>
</template>

<script setup>
import '@materialwebunofficial/md3e-web/tokens';
import '@materialwebunofficial/md3e-web';
import { ref } from 'vue';
const sliderVal = ref(50);
</script>
```

---

## ✨ Key Features & Architecture

* 🚀 **Zero Runtime Dependencies:** No external framework required. 100% pure native browser Custom Elements.
* 🛡️ **Shadow DOM Encapsulation:** Zero CSS style collision; completely isolated component scopes.
* 🎨 **Dynamic HCT (Hue-Chroma-Tone) Color Engine:** Real-time CAM16 / CIELAB tonal palette generator with dynamic runtime CSS token injection.
* ⚡ **Spring Physics Motion Engine:** Damped harmonic oscillator differential solver ($m \cdot x'' + c \cdot x' + k \cdot x = 0$) matching Compose `MotionScheme.expressive()`.
* 📋 **Form-Associated Custom Elements (FACE):** Seamless integration with native HTML `<form>` submission, FormData, and validation.
* ♿ **Accessible & Secure:** Built-in WAI-ARIA roles, full keyboard navigation (Enter/Space/Arrows), and strict XSS sanitization safeguards.
* 📱 **36 Expressive Components:** Date/Time Pickers, Bottom/Side Sheets, Wavy Progress Bars, Morphing Loading Indicators, Segmented Buttons, FAB Menus, etc.

---

## 🎨 Dynamic HCT Theming (JavaScript API)

Generate harmonic Material You 3 tonal color palettes on the fly from any hex color:

```javascript
import { applyDynamicTheme } from '@materialwebunofficial/md3e-web/theme';

// Generates 5 tonal palettes in real-time from any seed color and updates CSS variables
applyDynamicTheme('#6750A4', false, 'expressive'); // Seed Hex, isDark, schemeVariant
```

---

## ⚡ Spring Physics Animation (JavaScript API)

Generate smooth Compose-fidelity spring keyframes via Web Animations API:

```javascript
import { SpringPhysics } from '@materialwebunofficial/md3e-web/motion';

const { keyframes, duration } = SpringPhysics.generateKeyframes({
  from: 1.0,
  to: 0.92,
  dampingRatio: 0.7,
  stiffness: 450
});

element.animate(keyframes, { duration, fill: 'forwards' });
```

---

## 🧩 Complete Component Suite (36 Web Components)

| Category | Elements |
| :--- | :--- |
| **Actions** | `<md-button>`, `<md-split-button>`, `<md-icon-button>`, `<md-fab>`, `<md-fab-menu>`, `<md-segmented-button>` |
| **Inputs & Selection** | `<md-checkbox>`, `<md-radio-button>`, `<md-switch>`, `<md-slider>`, `<md-text-field>`, `<md-search-bar>` |
| **Pickers** | `<md-date-picker>` (Docked / Modal / Range), `<md-time-picker>` (Dial / Input / 24h) |
| **Navigation** | `<md-top-app-bar>`, `<md-bottom-app-bar>`, `<md-navigation-bar>`, `<md-navigation-drawer>`, `<md-navigation-rail>`, `<md-tabs>` |
| **Feedback** | `<md-progress-indicator>` (Linear / Circular / Wavy), `<md-loading-indicator>` (8 Shapes + Morph), `<md-snackbar>`, `<md-tooltip>`, `<md-badge>`, `<md-dialog>` |
| **Containment** | `<md-card>`, `<md-carousel>`, `<md-bottom-sheet>`, `<md-side-sheet>`, `<md-list>`, `<md-menu>`, `<md-divider>`, `<md-chip>` |
| **Layout & Theme** | `<md-toolbar>`, `<md-theme>` |

---

## 🧪 Testing

Run the full automated test suite:

```bash
npm test
```

---


## ⚖️ Trademark, Disclaimer & License

**"Material Design", "Material You", and "Material Design 3" are trademarks of Google LLC.**  
This project is an **independent, unofficial hobby web adaptation**. It is **not affiliated with, endorsed by, or sponsored by Google LLC.**

**Disclaimer:** This is a personal hobby project provided without warranty of any kind. The author assumes no liability for its use and does not guarantee ongoing maintenance, updates, or technical support.

This project is licensed under the [Apache License 2.0](LICENSE).
