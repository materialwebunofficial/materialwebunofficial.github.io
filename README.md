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

**MD3E Web (Unofficial)** (`@materialwebunofficial/md3e-web`) is a zero-dependency web adaptation of Google's **Material Design 3 Expressive (M3 Expressive)** design system. Source comparisons, verified behavior and remaining work are recorded in [MD3E-PARITY.md](MD3E-PARITY.md).

Built on native W3C web standards (**Custom Elements v1**, **Shadow DOM v1**, **CSS Custom Properties**, and **ES Modules**), it provides source-derived spring motion, vector loading indicators, CAM16-based dynamic HCT colors and components for web projects and frameworks.

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
* 🎨 **Dynamic HCT (Hue-Chroma-Tone) Color Engine:** Google Material Color Utilities 0.4.0 HCT/CAM16 and tone solver, bundled locally with dynamic CSS color roles.
* ⚡ **Spring Physics Motion Engine:** Damped harmonic oscillator differential solver ($m \cdot x'' + c \cdot x' + k \cdot x = 0$) matching Compose `MotionScheme.expressive()`.
* 📋 **Form-Associated Custom Elements (FACE):** Seamless integration with native HTML `<form>` submission, FormData, and validation.
* ♿ **Accessible & Secure:** Built-in WAI-ARIA roles, full keyboard navigation (Enter/Space/Arrows), and strict XSS sanitization safeguards.
* 📱 **36 Expressive Components:** Date/Time Pickers, Bottom/Side Sheets, Wavy Progress Bars, Morphing Loading Indicators, Segmented Buttons, FAB Menus, etc.

---

## 🎨 Dynamic HCT Theming (JavaScript API)

Generate harmonic Material You 3 tonal color palettes on the fly from any hex color:

```javascript
import { applyDynamicTheme } from '@materialwebunofficial/md3e-web';

// Generates Material color roles from a seed using the 2025 color specification
applyDynamicTheme('#6750A4', false, 'expressive'); // seed, isDark, palette variant
// Optional local target and contrast level (-1 to 1):
applyDynamicTheme('#00639B', false, 'standard', panel, 0.5);
```

---

The dynamic `expressive` palette uses MCU SchemeExpressive; `standard` uses
SchemeTonalSpot. Palette variants are separate from the Expressive motion scheme
and Compose's static `expressiveLightColorScheme`. Generated output includes
fixed accent roles, surface tint, shadow and scrim. Use corresponding on-color
roles for text and icons. See [source and regeneration notes](tools/material-color-utilities/README.md).

The CSS package includes a local variable Roboto font and its OFL license in
`dist/fonts`. Keep that folder beside the distribution CSS. All 30 typography
roles come from the pinned AndroidX source; `font-family` on a theme updates
those roles, including their shorthand tokens.

Nested `<md-theme>` and `<md-expressive-theme>` elements inherit live parent
colors unless a color input is explicitly set. `motion-scheme` selects motion
independently of the color palette. `color-mode="auto"` follows the system color
preference. A `global` provider temporarily owns its root theme properties;
removing it restores the previous values without replacing unrelated styles.

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

## 🧩 Component Suite

| Category | Elements |
| :--- | :--- |
| **Actions** | `<md-button>`, `<md-split-button>`, `<md-icon-button>`, `<md-fab>`, `<md-fab-menu>`, `<md-segmented-button>` |
| **Inputs & Selection** | `<md-checkbox>`, `<md-radio-button>`, `<md-switch>`, `<md-slider>`, `<md-text-field>`, `<md-search-bar>` |
| **Pickers** | `<md-date-picker>` (Docked / Modal / Range), `<md-time-picker>` (Dial / Input / 24h) |
| **Navigation** | `<md-top-app-bar>`, `<md-bottom-app-bar>`, `<md-navigation-bar>`, `<md-navigation-drawer>`, `<md-navigation-rail>`, `<md-tabs>` |
| **Feedback** | `<md-progress-indicator>` (Linear / Circular / Wavy), `<md-loading-indicator>` (8 Shapes + Morph), `<md-snackbar>`, `<md-tooltip>`, `<md-badge>`, `<md-dialog>` |
| **Containment** | `<md-card>`, `<md-carousel>`, `<md-bottom-sheet>`, `<md-side-sheet>`, `<md-list>`, `<md-list-item>`, `<md-menu>`, `<md-menu-group>`, `<md-menu-item>`, `<md-divider>`, `<md-chip>` |
| **Layout & Theme** | `<md-toolbar>`, `<md-theme>` |

Sliders use the AndroidX 16dp default track, a 4×44dp handle and 6dp gaps.
Focus and press halve the inner handle width while its layout stays fixed.
`steps` counts interior stops; `step` is a web convenience that distributes
intervals evenly across the bounds. Use `centered` for midpoint selections,
`range` with `range-start`/`range-end` for two handles, and `orientation="vertical"`
for vertical selection. Vertical values increase downward by default; set
`top-to-bottom="false"` to reverse. `labeled` enables the web value label.
Legacy `size` attributes retain the default 16dp track; there are no five
AndroidX slider size tokens. `input` reports changed values during interaction;
`change` finishes a tap, a started drag (including cancellation), or keyup.
Cancellation before a drag starts clears the press without finishing it.
Single-handle taps use the original down position and drags consume initial slop.
Range drags use the source's two-axis threshold; a release before that threshold
also evaluates the accumulated direction. Initial reversed ranges
are sorted. Associated HTML labels supply live names and focus; range focus
starts at the start handle. Form-disabled fieldsets and reconnects are supported.

```html
<md-slider steps="9" value="40" aria-label="Volume"></md-slider>
<md-slider range range-start="20" range-end="80" aria-label="Price"></md-slider>
<md-slider orientation="vertical" top-to-bottom="false" value="65"></md-slider>
```

The navigation bar follows Expressive `ShortNavigationBar`:64px minimum height,
56×32px indicators with icons above persistent labels, and LabelMedium in both
selection states. Set `icon-position="start"` for icons beside labels and40px
indicators; `arrangement="centered"` groups destinations for medium widths.
Supply three to five items on compact screens, or three to six when centered.

```html
<md-navigation-bar aria-label="Main navigation" selected="0"
  items='[{"icon":"home","label":"Home"},{"icon":"search","label":"Search"},{"icon":"person","label":"Profile"}]'>
</md-navigation-bar>
```

`selected` is a numeric index; `change.detail.index` reports user selection.
Items accept `disabled`, `enabled`, `ariaLabel`, `selectedIcon` and
`iconPosition`. Labels remain visible when provided. Legacy `vertical` means
Top icon placement on a horizontal bar; `tall` is an80px compatibility override.

The rail follows Expressive `WideNavigationRail`:96px collapsed, content-sized
220–360px expanded,44px top padding and persistent labels. Set
`rail.expanded = true` to animate width, item spacing, indicator padding and
icon/label placement. Normal collapsed and expanded rails use `surface`, square
corners and no shadow. A supplied `slot="header"` adds its height and40px below;
`arrangement="center"` or `"bottom"` changes the destinations' vertical placement.
`selected` and `change.detail.index` work like the navigation bar. The optional
80px `narrow` override is retained for compatibility.

---

The menu defaults to the public Expressive `DropdownMenuPopup` and standalone
`DropdownMenuGroup` composition. Use `variant="vibrant"` for tertiary colors, or
`variant="dropdown"` for the older public Surface-backed `DropdownMenu`.
Explicit groups share the popup's intrinsic width and have a 2px gap. Group and
item corners follow their index/count and selected state. Headline and trailing
labels use LabelLarge; supporting text uses BodyMedium.

```html
<md-menu label="View options">
  <md-button slot="trigger" variant="tonal" label="View options"></md-button>
  <md-menu-group label="Show" selection-mode="multiple">
    <md-menu-item headline="File details" selected-icon="check" checked></md-menu-item>
    <md-menu-item headline="Hidden files" selected-icon="check"></md-menu-item>
  </md-menu-group>
</md-menu>
```

`selection-mode="single"` selects one item per group; `"multiple"` toggles
independent checked states. These are web state adapters for Compose's hoisted
state. `menu-item-click` reports the item and is cancelable; the menu's cancelable
`select` event reports its index/data and selected state. Multiple choices remain
open by default; other choices close. Set `close-on-select="false"` to keep the
popup open after every choice. `show({focus: false})` opens without moving focus.
Arrow keys navigate, Enter/Space activate, and Escape restores focus. Nested
menus use `slot="submenu"` and logical Start/End positioning. JSON `items` and
live item attributes retain native button instances and render text safely.

`md-tabs` follows the public `Tab` and fixed/scrollable primary/secondary rows.
Text uses TitleSmall in every state. Icon-plus-text tabs are 72px; text-only and
leading-icon tabs are 48px. Primary indicators follow content width (at least
24px); secondary indicators span the tab. Both are 3px. Width and offset use
DefaultSpatial, and entering/exiting colors use DefaultEffects/FastEffects.
The source defaults use the same selected/unselected color; set
`unselected-content-color` explicitly when a different inactive tint is needed.

```html
<md-tabs aria-label="Travel" tabs='[{"label":"Flights","panel":"flights"},{"label":"Hotels","panel":"hotels"}]'></md-tabs>
<section id="flights">Flight content</section>
<section id="hotels">Hotel content</section>
```

`selected`, `selectedIndex`, `selectedTabIndex` and `activeTab` share one index.
Activation emits `change.detail.index`. Arrow/Home/End move focus; native
Enter/Space/click select. Disabled entries are skipped. `scrollable` uses a
90px minimum and 52px edge padding by default; `icon-position="start"` selects
the leading-icon layout. Referenced panels get a tabpanel role, label and
selected visibility. Live JSON updates preserve button instances and focus.
These input/panel/state semantics are web adapters. The old `pill` attribute is
inert compatibility metadata. Font metrics, ripple/focus rendering and wider
browser/platform equivalence remain separate audits; see [MD3E-PARITY.md](MD3E-PARITY.md).

`md-toolbar` uses the Compose floating toolbar layout and the MDC docked toolbar
color styles. Floating bars have a 64px minimum across their orientation, 8px
default content padding and a full corner shape. They add no gap between action slots. Put
optional expanding actions in `slot="leading"` and `slot="trailing"`; the
default slot stays visible. An adjacent `slot="fab"` selects the FAB layout;
place its toolbar actions in the default slot. Leading/trailing slots belong to
the layout without a FAB.
The bar collapses while the FAB grows from 56px to 80px, retaining its reserved
layout space. Vertical FAB positions are `top`/`bottom`; horizontal positions
are logical `start`/`end` and follow RTL.

```html
<md-toolbar variant="floating" color="vibrant" expanded aria-label="Document actions">
  <md-icon-button icon="share" aria-label="Share"></md-icon-button>
  <md-fab slot="fab" icon="add" aria-label="Create"></md-fab>
</md-toolbar>
```

Call `expand()`, `collapse()` or `toggle()`, or set `expanded`. Changes emit
`expanded-change.detail.expanded`. The caller owns expansion state; the library
does not guess scroll behavior. Floating colors change directly. Standard uses
SurfaceContainer/OnSurface and a PrimaryContainer FAB; vibrant uses
PrimaryContainer/OnPrimaryContainer and a TertiaryContainer FAB. Default
toolbar elevation is 0px without a FAB and 1px expanded/0px collapsed with one.
The helper FAB uses a 16px shape, 24px icon, and elevation levels 2/3. Explicit
child colors remain available. A custom FAB progress spring can be supplied as
`animationSpec = {stiffness, dampingRatio, visibilityThreshold}`. String
`animation-spec` and height attributes are compatibility metadata.

Docked bars use 64px minimum height, 16px edge padding and square corners.
Floating bars use the source `CircleShape` (50% of the shorter side). The
`shape` property also accepts rounded, cut or rectangular corners. A single
size applies to all corners; four sizes use top-start/top-end/bottom-end/bottom-start
order and follow RTL. Set `absolute: true` for physical top-left/top-right/bottom-right/bottom-left
order. Numbers are CSS pixels; `{unit: 'dp', value: 16}` uses one CSS pixel per dp,
and `{unit: 'percent', value: 50}` resolves against the shorter side. Source
Float corner scaling runs again during resizing and expansion.

```js
toolbar.shape = {type: 'rounded', corners: [24, 8, 24, 8]};
toolbar.shape = {type: 'cut', corners: 16};
toolbar.shape = null; // Restore the floating or docked default.
```

HTML accepts `shape="full"`, `shape="rectangle"` or a JSON descriptor, for example
`shape='{"type":"rounded","corners":16}'`. Invalid HTML falls back to the
variant default; invalid property assignments throw. Shape changes retain the
existing action controls and focus. Cut outlines clip content and pointer hits
without clipping their separately drawn SVG shadow, including when the background
is transparent. Resolved descriptors are read-only; assign a new shape to change
them. These are browser rendering
adapters; arbitrary Compose `Shape` providers and Android raster/shadow equivalence
remain outside this corner-shape API.

Default/standard icon buttons use the MDC standard/vibrant selected and disabled
roles. Native action controls keep their own activation and focus; arrow keys
move between actions. Hidden actions become inert and focus moves to a visible
action. These are web adapters. Generic Compose modifiers/slots, scroll/fling
animation specs, density/font constraints and exact platform ink/shadow/focus rendering
remain separate audits in [MD3E-PARITY.md](MD3E-PARITY.md).

Bind consumed vertical scrolling explicitly. Expansion thresholds default to
40px in each direction; callbacks own the expanded state:

```js
import {ToolbarScrollExpansion, FloatingToolbarScrollBehavior} from '@materialwebunofficial/md3e-web';

toolbar.scrollExpansion = new ToolbarScrollExpansion({
  expanded: toolbar.expanded,
  onExpand: () => toolbar.expand(),
  onCollapse: () => toolbar.collapse()
});
toolbar.scrollTarget = document.querySelector('#scrollable-content');
```

For a centered toolbar, keep it expanded and set
`toolbar.scrollBehavior = new FloatingToolbarScrollBehavior({exitDirection: 'bottom'})`
to move the whole bar off its parent's edge. Other directions are `top`, logical
`start` and `end`. State offsets and incoming deltas use CSS pixels. Dragging
uses the source direction/RTL mapping, Android spline decay and DefaultEffects
snap spring. `scrollTarget` accepts a scrollable element or `window`; setting it
to `null` detaches that binding. Listeners reconnect with the component.

Native scroll events report consumed distance, and `scrollend` settles with
zero remaining velocity. A host nested-scroll pipeline can call
`postScroll({x, y})` and `await postFling({x, y})` with the actual consumed offset
and remaining velocity. Neither method consumes an additional scroll offset.
The browser binding uses negative scrollTop differences as consumed Y.

Set `touchExplorationEnabled = true` when the host knows an accessibility
service needs the toolbar to remain expanded and ignore scrolling. The browser
does not infer TalkBack from pointer type. `forceCollapse(true/false)` exposes
the source accessibility action without changing the caller's `expanded` state.
FAB toolbar overflow scrolls inside its stationary padding. Native nested
gesture routing and accessibility services
remain web/platform boundaries described in the parity ledger.

Floating toolbars with a FAB use the CSS space allocated to the host for their
parent constraints. The measured frame can shrink while the original reserved
content/FAB layout stays centered, including source overflow beyond that frame.
The FAB keeps its source size and position; the toolbar scrolls inside fixed
content padding, which defaults to 8px. Flex/grid retain the intrinsic preferred size when space changes.
The constraint oracle and adapter boundaries are documented in
`tools/androidx-toolbar-constraints/README.md`.

Set `contentPadding` for floating content. A number applies to every side;
an object uses logical `{start, top, end, bottom}` or physical
`{left, top, right, bottom}` sides, with omitted sides defaulting to zero.
Logical sides follow RTL. String/HTML shorthand accepts one to four nonnegative
numbers (optional `px`) in top/end/bottom/start order; prefix `absolute ` to use
top/right/bottom/left. Values are stored as source Floats and each edge rounds
separately at one CSS pixel per dp. Negative and NaN values are rejected.

```html
<md-toolbar variant="floating" content-padding="5 17 11 3" aria-label="Document actions">
  <md-icon-button icon="share" aria-label="Share"></md-icon-button>
</md-toolbar>
```

```js
toolbar.contentPadding = {start: 3, top: 5, end: 17, bottom: 11};
// Optional with-FAB override, matching the source toolbarContentPadding argument.
toolbar.toolbarContentPadding = {left: 3, top: 5, right: 17, bottom: 11};
toolbar.toolbarContentPadding = null; // Restores the contentPadding fallback.
toolbar.contentPadding = null; // Restores the complete default of 8px.
```

The override also has a `toolbar-content-padding` attribute. Docked bars retain
their MDC padding. Kotlin/browser padding coverage and host boundaries are in
`tools/androidx-toolbar-padding/README.md`.

Floating toolbars without a FAB measure slotted elements through the Compose
Row/Column order, then place them with integer source alignment. Leading and
trailing groups remain measured during an unfinished exit; completed collapsed
groups supply fresh targets through a separate constrained measurement. The
incoming cross bounds constrain the 64px minimum. Parent CSS minimums, maximums
and allocation are resolved separately from the visible frame size.

Direct child elements can use `data-toolbar-weight="1"` for proportional main
axis space and `data-toolbar-fill="false"` to retain a smaller natural size in
that allocation. Without an explicit child alignment, inner horizontal rows
align to Top and vertical columns to logical Start, mirroring in RTL. The outer
toolbar still centers its groups. `data-toolbar-align="start|center|end"`
overrides that child cross alignment.
`data-toolbar-alignment-line="15"` supplies an explicit cross alignment line and
selects line alignment unless `data-toolbar-align` overrides it. These attributes
adapt Row/Column parent data for floating content. Native
icon-button bodies respect the measured constraints and the original minimum
interactive modifier's integer placement. Source generators, tested inputs and
leaf/font/animation boundaries are recorded in
`tools/androidx-toolbar-row/README.md`.
The original omitted-argument policy factories and mixed-size source tree checks
are documented in `tools/androidx-toolbar-inner-alignment/README.md`.

With a FAB, the content Row/Column defaults to centered cross alignment, matching
the source's explicit wrapper policy; child alignment overrides still apply.
Its scroll wrapper measures an unbounded main axis. Weighted intrinsic
reservation can differ from actual measured action sizes under that constraint.
Native controls use source integer placement and body constraints, including
tiny parents; changing sizes, alignment or padding retains their native buttons.
Source trees and browser adapter boundaries are documented in
`tools/androidx-toolbar-fab-content/README.md`.

The bar also inherits minimum-interactive top/left alignment lines from all
direct native icon buttons after their constrained Row/Column placement. This
keeps balanced padding correct for mixed sizes, wide/weighted buttons, RTL and
a non-icon first child. Tiny parent bounds retain the original signed line
offsets. `tools/androidx-toolbar-alignment/README.md` documents the independent
Kotlin/browser checks and remaining custom-layout/platform boundaries.

Leading/trailing groups animate both measured dimensions as one IntSize spring,
with a shared duration and retained Float velocities when content changes during
motion. Initial and completed collapsed groups no longer contribute to the
toolbar's measured cross size. Their native controls remain mounted and inert;
a fresh entry uses the current constrained full size. Source vector/composition
fixtures and exact host boundaries are in `tools/androidx-toolbar-size-motion/README.md`.

## Progress indicators

`md-progress-indicator` defaults to `type="linear" variant="standard"`. Use
`type="circular"` or `variant="wavy"` for the other configurations. `value`
ranges from zero to `max` (100 by default); omit it or set `indeterminate` for an
unspecified duration. Changing a value updates progress immediately. The wavy
amplitude transitions independently as progress begins and finishes.

The active indicator and stop use `--md-sys-color-primary`; the track uses
`--md-sys-color-secondary-container`. Standard circular indeterminate indicators
default to a transparent track. `color` and `track-color` override these roles
and accept CSS colors, including variables and `color-mix()`.

Standard circular indicators are 40px, wavy circular indicators 48px. Linear
height is 4px for standard and 10px for wavy. `stroke-width`, `gap-size`,
`stop-size` and `stroke-cap` control drawing; wavy indicators additionally accept
`track-stroke-width`, `track-stroke-cap`, `wavelength` and `wave-speed` (px/sec).
Set `wave-speed="0"` to stop phase motion. `amplitude` is now the native **0–1
fraction of available wave height**, rather than the previous pixel override;
omit it to use the native progress-dependent amplitude. Path adapter and source
verification boundaries are documented in `tools/androidx-progress/README.md`.

## 🧪 Testing

Run the full automated test suite:

```bash
npm test
npm run test:parity
```

---


## ⚖️ Trademark, Disclaimer & License

**"Material Design", "Material You", and "Material Design 3" are trademarks of Google LLC.**  
This project is an **independent, unofficial hobby web adaptation**. It is **not affiliated with, endorsed by, or sponsored by Google LLC.**

**Disclaimer:** This is a personal hobby project provided without warranty of any kind. The author assumes no liability for its use and does not guarantee ongoing maintenance, updates, or technical support.

This project is licensed under the [Apache License 2.0](LICENSE).
