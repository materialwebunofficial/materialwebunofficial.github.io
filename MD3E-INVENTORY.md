# MD3E component inventory

Status on 2026-10-12, compiled from the component sources, their tests and
[MD3E-PARITY.md](MD3E-PARITY.md). It makes the remaining work countable; the
ledger keeps the detailed evidence. Reference revision: AndroidX
a095da93f8e98dea8748ceed79ea8427aade245f (Compose Material3 at this revision
is the Expressive implementation).

Port status:

- **Ported**: behavior and geometry follow the pinned source, with tests that
  execute or compare against it. Listed gaps are still open.
- **Partial**: some parts follow the source; others still come from spec
  notes or web approximations.
- **Spec only**: written from research notes, not from source code.
- **Extension**: not a Material component; built from Material parts.

"Audit" means the current state has not been compared against the source in
enough detail to say more.

## Components Expressive changed

| Component | Source | Status | Open gaps | Verification |
|---|---|---|---|---|
| Button, toggle button (`md-button`) | Button.kt, ToggleButton.kt, ButtonDefaults, shapes, elevation, border | Ported | Ripple phase precision | Kotlin oracles + browser suites |
| Icon button (`md-icon-button`) | IconButton.kt, IconButtonDefaults, XSmall–XLarge and color tokens | Ported | Standard and outlined default to the recommended (Vibrant) colors; the source's non-toggle overloads default to LocalContentColor, which `--md-icon-button-content-color` / `--md-icon-button-outline-color: currentColor` select | Browser suites |
| Button group (`md-button-group`) | ButtonGroup.kt | Ported | — | Scaled-ancestor/press redistribution test + button/showcase suites |
| Split button (`md-split-button`) | SplitButton.kt, SplitButtonXSmall–XLargeTokens, HorizontalCenterOptically, AnimatedShape, samples | Ported | — (the trailing button's tooltip is added by the app in the samples, not by SplitButton) | 128 + 6 layout browser checks |
| FAB, extended FAB (`md-fab`) | FloatingActionButton, ExtendedFAB, expansion, surface | Ported | Android raster, full ripple phases | Kotlin oracles + browser suites |
| FAB menu (`md-fab-menu`) | FloatingActionButtonMenu, ToggleFloatingActionButton | Ported | — | 301 frame-by-frame checks (Int stagger, Oklab toggle colors, item width/alpha) + browser suites |
| Loading indicator | LoadingIndicator.kt, MaterialShapes | Ported | A custom `polygons` sequence needs graphics-shapes' Morph matching (androidx/graphics, outside the approved source paths); the defaults are generated from it | Kotlin oracles + raster frames |
| Progress indicators | Linear/Circular wavy indicators | Ported | Circular indeterminate runtime trajectories | Kotlin oracles + browser suites |
| Toolbars (`md-toolbar`) | FloatingToolbar, DockedToolbar, scroll behaviors | Ported | Configurable shapes, non-spring finite specs | Large Kotlin/browser suites |
| Top app bar | AppBar.kt (Expressive titles, flexible) | Ported | — (the search app bar is AppBarWithSearch, under Search) | Kotlin oracles + browser suites |
| Bottom app bar | AppBar.kt (flexible) | Ported | — | Kotlin oracles + browser suites |
| Navigation bar | ShortNavigationBar | Ported | Line breaking is the browser's text engine, not Android's | Browser suites |
| Navigation rail | WideNavigationRail, ModalWideNavigationRail, AnchoredDraggable | Ported | Predictive back (Android's back gesture; browsers give pages no such input); slotted header content renders once, so the collapsed rail under the open modal has no header copy | Browser suites + 22 modal checks |
| Navigation drawer | NavigationDrawer, DrawerSheet | Ported | Exact velocity tracking and touch slop; predictive back has no browser input | Browser suites |
| Lists (`md-list`) | Expressive ListItem, SegmentedListItem, combinedClickable | Ported | — (reordering is app-driven in the source too: ListItem only shows the dragged state its interactions report, which `dragged` sets) | Kotlin oracles + browser suites + 12 long-click checks |
| Menus (`md-menu`) | DropdownMenuPopup/Group/Item | Ported | — | Browser suites |
| Search (`md-search-bar`, `md-app-bar-with-search`) | SearchBar.kt (SearchBar, ExpandedDocked(WithGap), ExpandedFullScreen(Contained), AppBarWithSearch, SearchBarState, enterAlways scroll), SearchBar/SearchView/AppBar tokens | Ported | Predictive back; scroll consumption follows DOM scroll events, not nested pre-scroll | 46 browser checks |
| Sliders (`md-slider`) | Slider.kt, SliderTokens, SliderDefaults.Track / Thumb parameters | Ported | Gesture ownership; the value label is a web adapter; track icons are drawn by the app in the source sample, not by the component | Kotlin oracles (incl. 4,320 Track/Thumb parameter cases) + browser suites |
| Tabs (`md-tabs`) | Tab, LeadingIconTab, TabRow | Ported | — (Expressive's input is the motion scheme: indicator and scroll on DefaultSpatial, tab color DefaultEffects / FastEffects, as md-tabs uses) | Browser suites |
| Shapes (`md-shape`) | Graphics Shapes, MaterialShapes | Ported | — | Generated coefficients |

## Material 3 components Expressive left unchanged

| Component | Source | Status | Open gaps | Verification |
|---|---|---|---|---|
| Chips (`md-chip`) | Chip.kt | Ported | — | Kotlin oracles + browser suites |
| Segmented button | SegmentedButton.kt, OutlinedSegmentedButtonTokens | Ported | — (IntrinsicSize.Min widths with wrapping labels; Expressive recommends connected button groups instead) | 76 browser checks |
| Text fields | TextField, OutlinedTextField | Ported | — | Kotlin oracles + browser suites |
| Tooltips | Tooltip, TooltipBox | Ported | — | Kotlin oracles + browser suites |
| Snackbar | Snackbar, SnackbarHost | Ported | — | Kotlin oracles + browser suites |
| Switch | Switch (2025 color profile) | Ported | Frames follow requestAnimationFrame, not Android's Choreographer | Browser suites |
| Checkbox | Checkbox | Ported | — | Browser suites |
| Radio button | RadioButton | Ported | — | Browser suites |
| Date pickers | DatePicker, DateRangePicker, DateInput, DateRangeInput, CalendarModel, DatePickerDialog, DatePickerModalTokens | Ported | The docked variant has no Compose source (spec layout); keyboard is a web convention | 26 unit + 38 locale/geometry browser checks + picker suites |
| Time pickers | TimePicker, TimeInput | Ported | — | Kotlin oracles + browser suites |
| Dialogs | AlertDialogContent (+ MDC window motion) | Ported | — | Browser suites |
| Bottom sheet | ModalBottomSheet, SheetState | Ported | Predictive back has no browser input | Browser suites |
| Carousel | carousel/* (incl. CarouselParallaxScrollEffect as layout="multi-aspect"), foundation pager snapping, LazyList scroll scope | Ported | Android stretch overscroll (platform); vertical orientation is internal-only at a095da93 | Kotlin oracle: 756 keyline/strategy cases, 14,688 placements, 10,880 parallax infos exact (Float); 320 invariants; 129 multi-aspect browser checks |
| Cards (`md-card`) | Card.kt, CardDefaults shape/elevation/colors/border | Ported (container) | Compose Card is only the container (Surface + Column), which is ported; the header/media/actions slots and 16dp padding come from the spec pages, which leave layout to the app (`--md-card-padding: 0` gives the bare container) | Kotlin elevation oracles + card browser suites |
| Badges | Badge, BadgedBox, BadgeTokens, Tab's badgeBounds rulers | Ported | — | Browser placement check + 18 tab badge checks (badgeBounds clamping, RTL) |
| Dividers | HorizontalDivider, VerticalDivider, DividerTokens (+ spec insets) | Ported | — | 16 browser checks at 1x and 2x (incl. Dp.Hairline) |
| Side sheets | MDC Android (Compose has none) + M3 spec anatomy | Ported from MDC | No official Expressive source exists (spec page and MDC checked 2026-10-11) | Browser checks |

## Extensions (no Material counterpart)

| Component | Built from | Open gaps |
|---|---|---|
| Autocomplete | Shared read-only TextField + exposed Menu; the unchanged ExposedDropdownMenuPositionProvider and calculateMaxHeight are executed (2,268 positions, 72 heights) | Keyboard follows the W3C combobox pattern (Android's Tab can focus the popup); 216 browser checks |
| Select, option | Same exposed dropdown composition; options map to retained Menu items | Same keyboard adaptation; 232 browser checks |
| Stepper, step | ListItem, Divider, Card, Button; FastEffects content fade | No Material reference for the layout; 184 browser checks |
| Paginator | Button, IconButton, Menu, Divider | No Material reference for the layout; 160 browser checks |
| Expansion panel | Filled Card + interactive ListItem; height and chevron on the spatial spring roles | No Material reference for the layout; 168 browser checks |

## System

| Area | Status | Open gaps |
|---|---|---|
| Color (HCT, dynamic scheme) | Ported from Material Color Utilities | Canvas color syntax coverage |
| Motion scheme (springs) | Ported | Older CSS/WAAPI spring completion in some components |
| Typography | Ported (type roles, Roboto Flex subset) | Per-component role audit |
| Shape scale, elevation, state layers, ripple | Ported (all interactive components use the shared state-layer port) | Native raster. Focus: the source's default theme shows focus with the 10% state layer only (Focus.Opacity); its inset two-stroke ring is an opt-in theme configuration (InsetFocusRingThemeConfiguration) not ported yet; keyboard focus here also draws Material Web's 3dp Secondary ring so focus stays visible in a browser |

## Showcase

The page uses system tokens only (no gradients or custom shadows; checked by
scripts/audit-showcase-tokens.mjs) and keeps the homepage wave animation. The
reported empty extended FABs, card heights and code boxes were reproduced in a
separate Brave profile with standard Shields and fixed (content-visibility
containment; artifacts/project-audit/UI-FOLLOWUP.md, MOBILE-FOLLOWUP.md). The
catalog check covers 258 views per engine (Chromium, Firefox, WebKit) with no
visibility, overflow, runtime or resource failures. Not covered here: physical
phones, Safari on iOS and screen readers (TalkBack, VoiceOver).

## Count

37 Material components, all ported (one of them from MDC); the card's
content layout and the docked date picker come from the spec pages because
Compose has no source for them. None is spec-only. 5 extensions (7 elements).
Each open gap above is one unit of remaining work; "Ported" does not mean
"no gaps".
