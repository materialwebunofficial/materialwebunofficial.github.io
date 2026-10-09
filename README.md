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

Time input keeps invalid text visible while `hour`, `minute` and `value` retain
the last valid time. Read `hourInput`, `minuteInput` and `isInputValid` to validate
the current input; `hourInput` uses the canonical AM/PM hour. Set
`accessibility-services-enabled` (or `accessibilityServicesEnabled = true`) when
your environment reports an active accessibility service to suppress automatic
hour-input advancement. Mode changes preserve the shared input state. The hour/minute
fields use the same theme roles and container/border spring owners as outlined
text fields, including normal and vibrant input palettes.

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
An unspecified range spans `min` to `max`; the legacy `value` attribute can
still supply its end when `range-end` is absent.

Shared press ink follows the current Material3 common ripple: it remains visible
while held, expands toward the center and fades after release. Rapid presses
retain the previous exit. Ordinary FAB bodies stay stationary. Reduced motion
keeps static press feedback. FAB color, label and size updates preserve the inner
button and focus; use `icon=""` for a text-only extended FAB.
FAB pointer input follows its fitted rounded surface. Mouse and pen miss clipped
corners and the expanded touch area; Touch keeps its independent 48px target.
Leaving captured bounds cancels immediately, and returning cannot reactivate
that gesture. Hover follows the same direct shape membership. An atomic
disable/re-enable retires held FAB keys and pointers synchronously.
Buttons, FABs, switches, checkboxes and radio buttons activate Enter, numpad Enter and Space on key-up, with one
activation per owned press. Repeats retain that press. Concurrent keys and a
pointer retain independent ripple and elevation ownership; releasing one does
not release the others. Focus loss cancels keys, and disabling/disconnecting
cancels the held inputs.
Selection controls synchronously cancel on each enabled-state update, including
disable/re-enable within one task. Updating a Checkbox's value preserves another
held input's press feedback. Radio arrows keep the existing roving-focus behavior.
Checkbox, RadioButton and Switch keep the minimum layout reservation separate
from their inner input/drawing area. At the default 48px reservation, those inner
areas are 18×18px, 24×24px (including Radio padding) and 52×32px respectively.
`--md-minimum-interactive-component-size` accepts a scoped CSS length;
`0px` or `none` removes that reservation. Touch still expands toward a 48px
target. Mouse and pen must hit the actual inner input area. Moving a captured
pointer outside its permitted bounds cancels immediately; returning before
release cannot activate that canceled press. Live parent constraints and RTL
placement use the native modifier measurement order. Complete native sibling
arbitration, arbitrary transforms and input trees remain separate boundaries.
FAB shadows follow the native 120ms incoming and 120/150ms outgoing tweens,
retaining the most recent active hover/focus/press interaction. Independent
hover/focus opacity enters in 15/45ms and leaves in 15ms. The source default
focus indication is an opacity layer; the FAB has no additional outside ring.
Ordinary FABs default to `size="baseline"` (56px). Other sizes are `small`
(40px), `medium` (80px), and `large` (96px). The recommended large icon is 36px.
Extended small/baseline/medium/large heights are 56/56/80/96px. Set
`expanded="false"` or `fab.expanded = false` to collapse an icon-and-label FAB;
its height and shape remain fixed. The new sized overloads animate width and
label opacity independently; baseline uses the source's different enter/exit
specs and clips the label. Interrupted transitions keep their velocity and retain
the label until both channels finish. Text-only extended FABs keep their label.
Small FABs keep their 40px visible surface centered in a 48px layout area.
`--md-minimum-interactive-component-size` changes that reservation (a CSS length;
`0px` disables it). The minimum pointer target remains 48px independently.
`color="surface"` applies the native tonal overlay using the live `surface-tint`
role and resting elevation; hovering changes the shadow only. Parent surfaces
can provide their total dp elevation through `--md-absolute-tonal-elevation`
(a number), and `--md-tonal-elevation-enabled: false` disables overlays below
that scope. Custom `container-color` values matching a theme color receive its
native matching content role; unmatched colors inherit the surrounding content
color. Explicit `content-color` takes precedence. Source sRGB channel packing,
composition and ordered role collisions are independently verified; native
wide-gamut packing and arbitrary incoming layout constraints remain open.
The `expanded-change` event exposes `event.detail.expanded`.

Top app bars accept explicit `slot="leading"` navigation and `slot="trailing"`
actions. An empty bar has no generated controls. `variant="small"` defaults to
Start alignment at 64px; `center-aligned` centers the title on the full bar.
`medium`/`large` use separate 64px action and expanded-title rows, with total
heights of 112/152px and HeadlineSmall/HeadlineMedium. Expressive
`medium-flexible` uses 112px without a subtitle or 136px with one;
`large-flexible` uses 120/152px. A supplied empty `subtitle=""` counts as a
non-null subtitle, as in the native API. Legacy medium/large have no subtitle.
Expanded title baseline padding is 24/28px, reduced when the row cannot fit it.
Single-row/flexible titles support `titleHorizontalAlignment` (Start by default).
`contentPadding` applies to the single-row variant; native two-row content padding
is fixed at zero. Colors use Surface/SurfaceContainer, OnSurface for navigation
and title, and OnSurfaceVariant for actions/subtitle; per-role color properties
override those defaults. Top app bars have no elevation shadow in the source.

String headlines/subtitles preserve their DOM across updates. For custom
compositions use `slot="title"`/`slot="subtitle"`; a two-row bar accepts separate
`collapsed-title`/`collapsed-subtitle` slots. Custom content inherits its text
style/color, and `data-last-baseline` supplies a density-1 baseline when needed.
Actions support `data-app-bar-weight` and `data-app-bar-fill="false"` through the
native Row policy. `navigation-click` and `action.detail.action` are convenience
events; controls retain their own click handlers. `scrolled`, `overlappedFraction`
and `heightOffset` are explicit web state inputs. Single-row color uses
DefaultEffects; two-row color/title alpha directly follow source easing curves.
Height offset follows native measurement and is ignored in unbounded height;
use an appropriate CSS `max-height` when supplying a bounded offset state.
`scrollBehavior` accepts a `TopAppBarScrollBehavior` with a hoisted `TopAppBarState`.
Factories `pinned`, `enterAlways` and `exitUntilCollapsed` follow the separate
native nested-scroll policies; `legacyEnterAlways` exposes the deprecated reverse
layout policy explicitly. The scrolling row measures its own offset limit,
including custom title minimums. State limit writes alone do not clamp offsets.
Drag uses vertical source touch slop and velocity tracking, followed by Android
spline decay and the source DefaultEffects snap. Either animation spec may be
null. `preScroll`, `postScroll` and async `postFling` expose a host nested-scroll
pipeline and return its consumed delta or remaining velocity.

`scrollTarget` connects an HTMLElement or window. Wheel events supply pre-scroll
deltas; the adapter reports actual DOM consumption and any remainder. Native DOM
touch/programmatic scrolling exposes only consumed movement, so that path cannot
reproduce Android's pre-consumption ordering or provide its fling velocity.
Browser `scrollend` settles with zero available velocity; hosts with velocity
information should call `postFling` explicitly. Bounded state/layout feedback is
compared against 360 original measure/settle clocks, including 5327 rendered
frames. The host publishes the size callback before capturing the next snap
target. Full Compose scheduling, these input boundaries, intrinsic/custom wrapped-content queries,
font shaping, color packing and other engines still need further parity work.

```html
<md-top-app-bar variant="medium-flexible" headline="Library" subtitle="Your saved items">
  <md-icon-button slot="leading" icon="menu" aria-label="Open navigation"></md-icon-button>
  <md-icon-button slot="trailing" icon="search" aria-label="Search"></md-icon-button>
</md-top-app-bar>
```

```js
import {TopAppBarScrollBehavior} from '@materialwebunofficial/md3e-web';
const bar = document.querySelector('md-top-app-bar');
const content = document.querySelector('.scrollable-content');
bar.style.maxHeight = '300px'; // Bounded parent-height adapter; choose for your layout.
bar.scrollBehavior = TopAppBarScrollBehavior.enterAlways({
  isScrollingContentAtStart: () => content.scrollTop === 0
});
bar.scrollTarget = content;
```

Bottom app bars accept caller-provided actions and an optional `slot="fab"`;
an empty bar contains no generated buttons. The standard variant is 80px with
source 4px start/top/end padding. `variant="flexible"` implements the Expressive
64px variant with 16px leading/trailing padding and SpaceBetween arrangement.
`horizontal-arrangement="fixed"` uses the source centered 32px spacing.
`expanded-height` configures the flexible height; invalid values use 64px.
`contentPadding` accepts the same logical/absolute descriptors as toolbar padding.
Both variants use live SurfaceContainer/matching content color and have no shadow.
Standard `tonal-elevation` defaults to 0dp; flexible uses the source's fixed 0dp.
For an embedded FAB, use `color="secondary-container" elevation="bottom-app-bar"`
to select the native helper defaults (zero elevation in every state).
The `action` and `fab-click` events are web conveniences for supplied controls;
their regular native click handlers also work. Standard bars measure the FAB's
full-height Box first, then allocate the remaining width to the actions Row.
Flexible bars use the source's integer arrangement positions. CSS height/min/max
constraints participate in the original Size/Padding/Row/Placeable order; native
icon and FAB bodies receive the measured constraints independently of their
minimum interactive layout size. Caller elements and focus survive live resizing.
For supplied element content, `data-app-bar-weight`, `data-app-bar-fill="false"`
and `data-app-bar-align="start|center|end"` map supported RowScope parent data;
`data-app-bar-align="line"` with `data-app-bar-alignment-line` supplies an explicit
integer alignment line. DOM dimensions, these attributes and safe-area values
are web adapters. Arbitrary wrapping/intrinsic/descendant alignment-line behavior,
native system insets and platform input/focus/raster behavior remain open.

`BottomAppBarScrollBehavior.exitAlways()` attaches a hoisted `BottomAppBarState`.
The native behavior consumes no pre-scroll delta; post-scroll adds only consumed
vertical movement. It measures the full Surface, sets the collapse limit to its
negative height, then shrinks only the height reported to the parent. Place the
bar at the bottom of a clipped stage or viewport to show its native downward exit.
Direct downward drag subtracts the movement from the offset. Release uses Android
spline decay and FastSpatial snap, with the local Expressive/Standard scheme.
Explicit null snap/decay specs preserve intermediate positions. Browser
`scrollTarget` observes actual consumed scroll; `scrollend` settles with zero
available velocity. Hosts with native velocity can call `postFling` directly.
`touchExplorationEnabled` / `touch-exploration` is an explicit host bridge for the
Android touch-exploration service: it leaves the state intact while displaying
the full bar and disabling scroll/drag. It is distinct from reduced motion.

```js
const bar = document.querySelector('md-bottom-app-bar');
bar.scrollBehavior = BottomAppBarScrollBehavior.exitAlways({element: bar});
bar.scrollTarget = document.querySelector('#documents');
```

```html
<md-bottom-app-bar variant="flexible" aria-label="Document actions">
  <md-icon-button icon="menu" aria-label="Menu"></md-icon-button>
  <md-icon-button icon="search" aria-label="Search"></md-icon-button>
  <md-icon-button icon="more_vert" aria-label="More options"></md-icon-button>
</md-bottom-app-bar>
```

Snackbars use InverseSurface/InverseOnSurface, an InversePrimary text action,
an optional InverseOnSurface dismiss icon and the source 6dp shadow. Color
attributes accept CSS colors or token expressions and update existing controls.
Surface-colored overrides preserve inherited tonal elevation; the snackbar adds
zero tonal elevation itself. Entry/exit uses independent FastSpatial .8↔1 scale
and FastEffects alpha. Outgoing content retires when alpha completes.

```html
<md-snackbar id="saved" message="Document archived."
  action-label="Undo" with-dismiss-action></md-snackbar>
```

`document.querySelector('#saved').show()` opens the attribute-driven convenience
example. Repeated `show()` updates that message and its timer. An action defaults
to indefinite duration; without one the default is Short (4000ms). `duration`
accepts `short`, `long` (10000ms) or `indefinite`. An explicit nonnegative
`timeout` overrides that duration; zero means indefinite and removing the
attribute restores the source default. `action-on-new-line` moves a longer action
below the message. `container-color`, `content-color`, `action-color`,
`action-content-color` and `dismiss-action-content-color` have camel-case
properties. The data presenter's TextButton uses `actionColor`; the generic
action wrapper's `actionContentColor` remains a separate local content color.
`shape` accepts the rounded/cut/rectangle corner descriptors used by toolbars.
The data presenter includes 12dp padding outside its visual Surface. Dismiss
has a plain above-anchor tooltip and a localized accessible label. English and
Turkish strings follow the pinned AndroidX resources; `dismissLabel` /
`dismiss-label` supplies other application translations.

For queued messages, use the separate source-shaped host API:

```js
import {SnackbarHostState} from '@materialwebunofficial/md3e-web';
const host = document.querySelector('#saved');
host.hostState = new SnackbarHostState();
const result = await host.showSnackbar({
  message: 'Document archived.', actionLabel: 'Undo', withDismissAction: true
});
if (result === 'action-performed') restoreDocument();
```

`showSnackbar` serializes requests and resolves `action-performed` or `dismissed`.
Queued visuals retain their message/action/duration when component attributes
change. Attributes supply defaults for the `show()` convenience path; layout,
color and explicit timeout overrides still update the active queued message.
Its string overload takes message, nullable action label, dismiss boolean and
optional duration. The final options argument accepts an AbortSignal; object
visuals accept those options as the second argument. Cancellation rejects the
request and retires it from the queue. `recommendedTimeoutMillis(original,
flags)` supplies a host accessibility timeout recommendation. The viewport host
uses a manual HTML popover to escape ancestor clipping. Set
`--md-snackbar-inline-start`, `--md-snackbar-inline-end` and
`--md-snackbar-bottom` to reserve navigation or other application chrome; the
showcase derives those values from its actual content pane and bottom navigation.
Placement, events, AbortSignal and inert outgoing content are web adapters.
The default legacy layout uses measured first/last text baselines: a one-line
action aligns to the message baseline, multi-line text starts at baseline 30dp,
and a separate-line action follows baseline padding of 30dp/12dp plus 2dp bottom
padding. The one-row policy caps its inner width at 600dp before outer 16dp/8dp
padding (16dp/0dp with dismiss); the separate-line layout caps its whole width at
600dp. Text and controls remain stable through live fonts, width and direction
changes. Browser font shaping and measured controls are explicit host inputs;
arbitrary Compose content/modifiers, intrinsic queries and host scheduling remain
under audit. `two-line` is a web minimum-height adapter; automatic classification
uses the actual first and last baselines.

Tooltips use a manual HTML popover, so ancestor clipping does not hide them.
`placement` supports `top`, `bottom`, `left`, `right`, logical `start`/`end`
and `above`/`below` aliases. The native position provider flips at window edges,
clamps coordinates and uses 4dp anchor spacing. Optional carets are 16×8dp.
Plain tooltips use InverseSurface/InverseOnSurface, BodySmall, ExtraSmall shape,
40×24dp minimum, 200dp maximum width, 8dp/4dp content padding and no shadow.
Rich tooltips use SurfaceContainer, OnSurfaceVariant title/body, Primary action,
TitleSmall/BodyMedium/LabelLarge, Medium shape, 320dp maximum width and Level2
shadow. Their title/body baselines follow the native 28dp/24dp spacing rules.
Plain and rich placement run the native Box/Column measurement rules within
the current window bounds. Multiple direct slot children share a Box and
overlap at logical start; wrap controls in a row container to arrange a row.
Rich actions retain the 36dp minimum box and 8dp bottom padding; an ordinary
text button has a 48dp interactive leaf around its 40dp visual surface.
Text, typography, direction and window changes keep the existing controls and
focus. Temporary slotted geometry restores author styles when the popup
retires, a child leaves its slot or the host disconnects.

```html
<md-button id="save-hint" label="Save document"></md-button>
<md-tooltip for="save-hint" text="Save changes to this document" caret></md-tooltip>
```

Mouse hover holds the tooltip until exit; keyboard focus holds it until focus
loss. Touch/pen long press suppresses the corresponding click and keeps the
tooltip visible for at least 1500ms after opening. `longPressTimeoutMillis`
supplies the web platform threshold (default 500ms). Set `enableUserInput=false`
to disable automatic triggers. Rich action slots can use `has-action`
  and `is-persistent`; Tab from the anchor enters the popup and visits enabled
  actions in rendered order, including nested slots and open shadow roots.
  `focusable=true` takes focus when the popup opens. Tab/Shift+Tab stay within
  that popup; retirement or removal restores the prior focus. Its outside
  pointer press dismisses and consumes that gesture. A nonfocusable popup lets
  that outside press reach the underlying control. `onDismissRequest` can own
  outside/popup-Escape dismissal instead of the default state dismissal.
  Popup Escape is tracked on keydown and dismissed on keyup; the anchor's
  automatic Escape path dismisses on keydown. Unfocused nonfocusable tooltips
  do not consume unrelated keyboard events. A later modal dialog owns focus
  until it closes. Changing `enableUserInput` or `target` preserves a manually
  shown state; removing automatic input cancels its bound hover/focus request.
  The web host can set
  `forceFocusableForA11y=true` (`force-focusable-for-a11y`) for its touch
  exploration/switch access integration; as in the source, this also requires
  `hasAction`. Browser code does not infer Android service state.
  `maxWidth`, the four color properties and `shape` update
the existing popup without recreating its controls. `target` accepts an explicit
anchor; the default anchor is the previous element when `for` is absent.
  Visible popups poll anchor bounds once per animation frame, including CSS or
  WAAPI transforms on ancestors. Unchanged bounds skip layout/outline work;
  polling stops after retirement or removal.

Exported `TooltipState` and `TooltipMutatorMutex` provide shared priority rules.
`show('default')` times out after 1500ms; `show('user-input')` stays suspended;
`show('prevent-user-input')` times out without dismissing (focus/long-press input
owns dismissal). Persistent requests stay suspended until canceled/dismissed.
Same or higher priorities cancel an earlier request; lower priorities reject.
Promises reject with TimeoutError or AbortError on timeout/cancellation, so
programmatic callers should catch those expected results. `show` also accepts
an AbortSignal. Renderer transitions use independent FastSpatial .8↔1 scale
and FastEffects alpha, and retire the popup after both channels finish.
DOM gesture/focus/popover behavior, font shaping, native composition scheduling,
other localizations and Android path/shadow rasterization remain under audit.

```html
<md-slider steps="9" value="40" aria-label="Volume"></md-slider>
<md-slider range range-start="20" range-end="80" aria-label="Price"></md-slider>
<md-slider orientation="vertical" top-to-bottom="false" value="65"></md-slider>
```

Loading indicators use live `primary` for standalone shapes and
`on-primary-container` on `primary-container` for the contained default.
`color` accepts a CSS color/expression or the existing role aliases; an explicit
value overrides either variant. `container-color` / `containerColor` customizes
the contained background. Ordinary color changes preserve the running morph
phase. There are no component hex-color fallbacks.

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

## Text fields

`md-text-field` uses `variant="outlined"` by default; `variant="filled"` uses
the shared SurfaceContainerHighest role and bottom indicator. Containers have a
56px minimum and grow with multiline content. Cutout labels, labels above the
container and supporting text allocate additional space.
Labels minimize on focus or a nonempty value. An empty unfocused label hides
the placeholder and prefix/suffix; `float-label="always"` keeps the label
minimized, including when empty. The existing `label-position="always"` alias
does the same.

Text fields are multiline by default. `min-lines="2" max-lines="4"` reserves two
lines, grows to four and then scrolls within the editor. Without `max-lines`,
content keeps growing. `single-line` uses a horizontal editor; `type="email"`,
`type="password"` and other HTML input types also use that editor. Switching modes
retains value, focus and selection. Single-line presentation converts newlines
to spaces while retaining the programmatic model/form value until a user edit.
Select and Autocomplete always use a single-line combobox editor.

`label-position="inside"`, `"cutout"` and `"above"` select the corresponding
placement policies, independently of the container variant. The default is
inside for filled and cutout for outlined. `expanded-label-alignment` and
`minimized-label-alignment` accept `start`, `center` or `end` in logical direction;
Above uses the minimized alignment. `minLines` normalizes to at least one and
`maxLines` to at least `minLines`; invalid maximums mean no cap. This normalization
and HTML editing/validation are web API adaptations.

Colors resolve live theme roles per enabled/error/focus state. Disabled fields
use each original role's packed alpha instead of fading the whole field.
The label cuts the outlined border through a measured mask and remains
transparent. Label, placeholder, affix, indicator thickness and animated colors
share retained motion controllers; there is no competing CSS transition.

The form-associated field forwards `input`/`change`, native required/type/custom
validation, readonly, fieldset-disabled state, reset and state restoration.
Programmatic values set before connection are retained. `maxLength`/`maxlength`
use the same attribute; a zero limit still displays an accessible counter.
Select and Autocomplete reuse this field foundation. Reference provenance,
browser checks and remaining native input/font/runtime/constraint boundaries are in
[the TextField reference notes](tools/androidx-text-field/README.md).
Run `npm run test:text-fields` or `node scripts/test-text-fields.mjs --source`.

## Chips

Filter and Input chips use the Expressive shape overload by default: medium
corners at rest, fully rounded when selected, and small corners during press.
Leading/trailing visibility uses retained size and opacity springs. Assist and
Suggestion chips retain the original fixed small corners. `expressive="false"`
selects the source's baseline selectable overload, including its color/spacing
and visibility-spec differences.

`leading-icon`, `trailing-icon`, `avatar` and default label slots preserve caller
nodes. Avatars take precedence over Input leading icons. `horizontal-arrangement`
defaults to the original compact three-child arrangement; explicit `start`,
`end`, `center` and `space-between` adapt ordinary Row arrangements.

Colors and borders resolve live system roles. `container-color`, `content-color`,
`leading-icon-color` and `trailing-icon-color` independently override enabled
roles; disabled states retain the original default roles and packed alpha.
Input has no native elevated variant, so its `elevated` attribute adds no
invented elevation or container style.

Automatic selection/checkmarks, Input's default removal action and the keyboard
outline are web caller-policy adapters. Custom leading content replaces the
automatic checkmark; `removable="false"` disables removal. `change` emits once
per activation. Preventing the cancelable `remove` event keeps the chip.
The painted body has a 32px minimum height, with a centered 48px minimum
interaction allocation. Reference provenance and remaining native boundaries
are in [the Chip reference notes](tools/androidx-chip/README.md).
Run `npm run test:chips` or `node scripts/test-chips.mjs --source`.

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

Wave phase is retained across detach and follows the source wavelength/speed,
amplitude and vertex-cache restart rules in the verified histories. Progress and
Loading pause through a shared browser visibility subscription that consumes the
latest queued state and ignores callbacks from a previous connection. Remaining
native cache/runtime and rendering boundaries are recorded in the parity ledger.

### Button sizing and press motion

`md-button` uses the Expressive size scale: `xs`, `s`, `m`, `l`, `xl` have
minimum visual heights of 32, 40, 56, 96 and 136px. The default is `s`.
Content can increase the visual height; the minimum width is 58px and the
interaction area reserves at least 48px in height. An outlined surface draws
its border inside the shape, without increasing measured dimensions.

Presses animate 0–1 shape progress with AndroidX DefaultEffects springs.
Reversals preserve the source progress/velocity transformation. Replacing the
resting/pressed shape pair or the spring recreates the animation at its current
target, as in the public Button's remembered composition. Equal shape/spec
values retain the animation, including XS-to-S changes and the two default
motion schemes' equal DefaultEffects springs. Round corners resolve from the
actual measured width/height, including resized or multiline content.
Square/pressed corners use the size-specific live Small/Medium/Large/ExtraLarge
theme roles. Uniform pixel/percentage corners and CSS length expressions are
supported; percentage corners resolve against the smaller measured dimension.
Labels and slotted controls remain stable through property changes. `focus()`
and `click()` forward to the native button, and a disabled form fieldset also
disables the component.

Configure `variant`, `size`, `shape`, `label`, `icon`, `trailing-icon`, `toggle`
and `type` through attributes. Their corresponding runtime getters are read-only;
the label getter is `labelText`. `disabled` and `selected` are writable boolean
properties. Invalid size/variant/shape/type values use safe defaults. Both
declaration entries describe this API; no `label`, `name` or `value` property
behavior is supplied by this component.

Default colors use live theme roles. Text buttons use `Primary`, including the
source public default getter's override of its raw token table. Docked toolbar
and snackbar action bindings retain their scoped colors. Ordinary enabled/theme
color changes resolve directly, as in the source ButtonColors. Independent source
comparisons and remaining boundaries are described in
[tools/androidx-button/README.md](tools/androidx-button/README.md).

Button content clips to its current animated surface shape. The outside shadow,
focus indication and interaction reservation remain separate from this content clip.
When the resolved container matches the live `Surface` role, its tonal overlay
uses the inherited `--md-absolute-tonal-elevation` number. Buttons add zero tonal
elevation themselves; hovering changes their shadow elevation independently.

The minimum 48px interaction target expands for touch input. Mouse and pen
start inside the visible rounded shape. Moving a held pointer out of its
capture bounds cancels that press; returning requires a new press. Touch
capture includes the minimum target padding. Programmatic activation remains
available after a canceled gesture. Hover and focus use the shared Material3
opacity indication with source 15ms hover and 45ms focus-entry transitions.
The default focus indication uses the content color and opacity; it does not
add an outside outline. The latest hover/focus interaction controls the layer,
while the separate elevation channel also responds to presses.

Enter, numpad Enter and Space activate on key release. Held-key repeats retain
one press. Multiple keys and a pointer keep their own pressed indication;
releasing one preserves the remaining press. Focus loss cancels keyboard
presses, and disabling or disconnecting cancels the owned interactions.
Editable or interactive slotted controls keep their own input and do not
activate the enclosing button.
`--md-tonal-elevation-enabled: false` disables the inherited overlay. Theme roles
and external container overrides are resolved again on the retained control.

In `toggle` mode, the native control exposes Checkbox semantics with
`aria-checked`. It uses FastSpatial and a three-shape composition: pressed wins
over selected, selected uses the size-specific square role, and resting uses
the round shape. `shape="square"` swaps the resting and selected shapes as a
web configuration of the native three-shape API. The public small ToggleButton
pressed default is 6px; other sizes resolve their source pressed theme roles.
Changing the shape triple or spring replaces its remembered state. Selected
changes animate within that state, including selection changes during a press.

Toggle content has no 58px width minimum; its interaction area reserves 48px
in both dimensions, within the caller's constraints. The visual body and that
interaction reservation are measured separately. The optional leading icon
uses a fixed-size Box with propagated minimum constraints, followed by a
separately measured Spacer; narrow bounds can reduce both instead of preserving
a CSS flex gap. Host CSS sizes/minimums/maximums supply the browser constraints.
Custom leading icons can use `slot="icon"` in toggle mode. Every assigned icon
is centered in the same Box; the slot takes precedence over the `icon` attribute.
Icons inherit the button's live content color. Font/content updates, mode changes
and reconnection retain the actual control and slots, and release owned icon
styles on removal. Arbitrary native RowScope modifiers/intrinsics and Android
font/raster behavior remain outside this adapter's verified scope.
Filled, elevated, tonal and outlined toggles use their
native selected/disabled color factories, resolving live theme roles directly.
Outlined toggles use the public 1px border default at every size and remove the
default border when selected. Text toggle is a web extension that retains the
docked toolbar's scoped theme overlay. Border width uses FastSpatial and its
brush color uses DefaultEffects, preserving velocity on reversal and live theme
changes. Paint width rounds up to physical pixels, observes display-density
changes and stays inside the shape. Reduced motion finishes both channels.
Elevation follows source interaction arrival order and 120ms incoming /
120ms hover-exit / 150ms other-exit tweens, without a second CSS transition.
The public `elevation` property accepts all five numeric targets
(`defaultElevation`, `pressedElevation`, `focusedElevation`, `hoveredElevation`,
`disabledElevation`); null removes elevation and undefined restores variant
defaults. Shadow drawing uses live web tokens. Complete native shadow/border
raster remains separate work. Source tests and adapter boundaries are
recorded in [tools/androidx-toggle-button/README.md](tools/androidx-toggle-button/README.md).

### Switch colors with the 2025 palette

The switch binds its icon to the thumb's paired content role. A resting checked
thumb uses `OnPrimary / Primary`; hover, focus and press use the source state
tokens `PrimaryContainer / OnPrimaryContainer`. This is a ColorSpec2025 web
profile override of the legacy native resting icon default: two unrelated
`On…` colors can have almost identical tones in a dark 2025 palette.
The color engine and global roles are preserved. Icons inherit from the thumb,
so every instance responds to live themes and local CSS role changes. Disabled
states retain the source opacity/composite-over-Surface bindings.

Component overrides are `--md-switch-icon-color`,
`--md-switch-selected-handle-color`, `--md-switch-selected-icon-color`,
`--md-switch-selected-interactive-handle-color` and
`--md-switch-selected-interactive-icon-color`. They accept CSS colors/role variables.
The browser gate checks 960 live thumb/icon pairs across six seeds, both schemes,
light/dark, four contrast levels and rest/hover/focus/press/disabled states;
enabled icon contrast stays above 3:1 in those cases.

Switch, Checkbox and RadioButton share the native opacity indication controller:
15ms hover/exit and45ms focus entry, with the latest hover/focus interaction
owning the layer. Press creates a separate unbounded ripple with20dp radius.
The moving Switch thumb now draws that ripple too. Default focus uses opacity
without an additional outside outline. Ripple/state colors inherit the enclosing
content color; `--md-ripple-color` supplies a live scoped override, and source
alpha replaces content alpha. The Switch icon retains its own paired thumb role.
The source and package checks cover held presses, keyboard, disable, reduced
motion and disposal/reconnect. Full native layout coordinators, optional inset
focus rings, platform rendering and other engines remain outside this verified
adapter scope. Run `node scripts/test-selection.mjs --source --indication` or
`npm run test:selection`.

## 🧪 Testing

Run the full automated test suite:

```bash
npm test
npm run test:parity
npm run test:buttons
npm run test:selection
```

---


## ⚖️ Trademark, Disclaimer & License

**"Material Design", "Material You", and "Material Design 3" are trademarks of Google LLC.**  
This project is an **independent, unofficial hobby web adaptation**. It is **not affiliated with, endorsed by, or sponsored by Google LLC.**

**Disclaimer:** This is a personal hobby project provided without warranty of any kind. The author assumes no liability for its use and does not guarantee ongoing maintenance, updates, or technical support.

This project is licensed under the [Apache License 2.0](LICENSE).
