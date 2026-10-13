# MD3E Web

Unofficial Material Design 3 Expressive for the web: dependency-free Web
Components, design tokens, spring motion and dynamic color theming.

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue.svg?style=flat-square" alt="License: Apache 2.0"></a>
  <a href="https://www.npmjs.com/package/@materialwebunofficial/md3e-web"><img src="https://img.shields.io/npm/v/@materialwebunofficial/md3e-web?style=flat-square" alt="npm version"></a>
  <a href="https://materialwebunofficial.github.io/"><img src="https://img.shields.io/badge/demo-live-informational?style=flat-square" alt="Live demo"></a>
</p>

**[Live demo](https://materialwebunofficial.github.io/#home)**

> **Unofficial hobby project.** Not affiliated with, sponsored by or endorsed by
> Google LLC. This project is vibe coded and provided as-is, without warranty or
> any commitment to maintenance or support.

## Features

- **No runtime dependencies.** Native Custom Elements, Shadow DOM, CSS custom
  properties and ES modules.
- **50+ components** modeled on the AndroidX Compose Material 3 sources.
- **Dynamic color.** HCT/CAM16 color schemes from any seed color, using a bundled
  copy of Material Color Utilities.
- **Spring motion** based on Compose's expressive and standard motion schemes.
- **Forms and accessibility.** Form-associated controls, ARIA roles and keyboard
  navigation.
- **Bundled assets.** Roboto variable font and a Material Symbols Rounded subset.

## Installation

### CDN

No build step needed. Add the tokens stylesheet and the component bundle:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@materialwebunofficial/md3e-web/dist/tokens.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@materialwebunofficial/md3e-web/dist/md3-expressive.esm.js"></script>

<md-button variant="filled">Filled button</md-button>
<md-slider value="75" labeled></md-slider>
<md-loading-indicator></md-loading-indicator>
```

unpkg and esm.sh serve the same files.

### npm

```bash
npm install @materialwebunofficial/md3e-web
```

```js
import '@materialwebunofficial/md3e-web/tokens'; // tokens, fonts and icons
import '@materialwebunofficial/md3e-web';        // registers every component
```

To register only what you use, import individual components:

```js
import '@materialwebunofficial/md3e-web/components/md-button.js';
import '@materialwebunofficial/md3e-web/components/md-slider.js';
```

Importing a module registers its elements as a side effect, so the package does
not declare `sideEffects: false`.

## Frameworks

Components need a DOM when they are imported. Import them in browser code only,
for example inside `useEffect` or `onMounted`. Server rendering outputs the
plain tags, which upgrade once the components are registered.

**React / Next.js**

```jsx
'use client';
import { useEffect } from 'react';
// Import '@materialwebunofficial/md3e-web/tokens' in app/layout.tsx.

export default function Page() {
  useEffect(() => {
    import('@materialwebunofficial/md3e-web/components/md-button.js');
  }, []);
  return <md-button variant="filled">Next.js + MD3E</md-button>;
}
```

**Vue 3**

```vue
<template>
  <md-slider :value="volume" @input="volume = $event.detail.value" labeled></md-slider>
</template>

<script setup>
import { onMounted, ref } from 'vue';
const volume = ref(50);
onMounted(() => import('@materialwebunofficial/md3e-web/components/md-slider.js'));
</script>
```

Set Vue's `compilerOptions.isCustomElement` to accept tags starting with `md-`.
`v-model` does not work with these components; bind `value` and read
`event.detail.value`.

## Theming

Generate a color scheme from a seed color:

```js
import { applyDynamicTheme } from '@materialwebunofficial/md3e-web';

// seed, dark mode, palette variant ('expressive' or 'standard')
applyDynamicTheme('#6750A4', false, 'expressive');
```

Optional fourth and fifth arguments set a target element (the document root by
default) and a contrast level from -1 to 1.

Or theme part of the page declaratively:

```html
<md-theme primary-seed="#00639B" color-mode="dark">
  <md-button variant="tonal">Themed button</md-button>
</md-theme>
```

`generateM3Scheme` from `@materialwebunofficial/md3e-web/theme` computes the
color roles without touching the DOM, so it also runs on the server.

## Components

| Category | Elements |
| :--- | :--- |
| Actions | `md-button`, `md-button-group`, `md-split-button`, `md-icon-button`, `md-fab`, `md-fab-menu`, `md-segmented-button` |
| Inputs | `md-checkbox`, `md-radio-button`, `md-switch`, `md-slider`, `md-text-field`, `md-select`, `md-autocomplete`, `md-search-bar`, `md-chip` |
| Pickers | `md-date-picker`, `md-time-picker` |
| Navigation | `md-top-app-bar`, `md-app-bar-with-search`, `md-bottom-app-bar`, `md-navigation-bar`, `md-navigation-drawer`, `md-navigation-rail`, `md-tabs`, `md-toolbar`, `md-paginator`, `md-stepper` |
| Feedback | `md-progress-indicator`, `md-loading-indicator`, `md-snackbar`, `md-tooltip`, `md-badge` |
| Containment | `md-card`, `md-carousel`, `md-list`, `md-menu`, `md-dialog`, `md-bottom-sheet`, `md-side-sheet`, `md-expansion-panel`, `md-accordion`, `md-divider` |
| Theme | `md-theme`, `md-expressive-theme`, `md-shape` |

Child elements such as `md-list-item`, `md-menu-item`, `md-option`, `md-tab` and
`md-step` are registered with their parents.

## Documentation

- [Component reference](docs/COMPONENTS.md): detailed behavior and API notes
- [MIGRATION.md](MIGRATION.md): unreleased changes and web contracts (forms,
  selection, dates, packaging)
- [MD3E-PARITY.md](MD3E-PARITY.md): comparisons with the AndroidX sources and
  remaining gaps
- [SECURITY.md](SECURITY.md): reporting vulnerabilities

## Development

```bash
npm install
npm run build
npm test
```

`npm test` runs the Node-based checks. Browser suites run per area, for example
`npm run test:parity`, `npm run test:buttons` or `npm run test:selection`; see
`package.json` for the full list. The showcase loads generated files, so run
`npm run build` after editing `src/showcase.js`, `styles/showcase.css` or any
component.

## License

[Apache License 2.0](LICENSE). Third-party notices are in [NOTICE](NOTICE).

"Material Design", "Material You" and "Material Design 3" are trademarks of
Google LLC.
