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
| Button, toggle button (`md-button`) | Button.kt, ToggleButton.kt, ButtonDefaults, shapes, elevation, border | Ported | Ripple phase precision, precision focus ring | Kotlin oracles + browser suites |
| Icon button (`md-icon-button`) | IconButton.kt, IconButtonDefaults, XSmall–XLarge and color tokens | Ported | Outlined uses the spec (Vibrant) border, not LocalContentColor | Browser suites |
| Button group (`md-button-group`) | ButtonGroup.kt | Ported | — | Scaled-ancestor/press redistribution test + button/showcase suites |
| Split button (`md-split-button`) | SplitButton.kt, SplitButtonXSmall–XLargeTokens, HorizontalCenterOptically, AnimatedShape, samples | Ported | Multi-line leading labels: heights sync through CSS stretch rather than intrinsic measurement; no tooltip on the trailing button (the samples add one) | 128 browser checks |
| FAB, extended FAB (`md-fab`) | FloatingActionButton, ExtendedFAB, expansion, surface | Ported | Android raster, full ripple phases | Kotlin oracles + browser suites |
| FAB menu (`md-fab-menu`) | FloatingActionButtonMenu, ToggleFloatingActionButton | Ported | Audit item stagger and toggle colors against source again | Browser suites |
| Loading indicator | LoadingIndicator.kt, MaterialShapes | Ported | Public API, visibility/reduced-motion transitions | Kotlin oracles + raster frames |
| Progress indicators | Linear/Circular wavy indicators | Ported | Circular indeterminate runtime trajectories | Kotlin oracles + browser suites |
| Toolbars (`md-toolbar`) | FloatingToolbar, DockedToolbar, scroll behaviors | Ported | Configurable shapes, non-spring finite specs | Large Kotlin/browser suites |
| Top app bar | AppBar.kt (Expressive titles, flexible) | Ported | Audit search app bar variants | Kotlin oracles + browser suites |
| Bottom app bar | AppBar.kt (flexible) | Ported | — | Kotlin oracles + browser suites |
| Navigation bar | ShortNavigationBar | Ported | Platform text wrapping | Browser suites |
| Navigation rail | WideNavigationRail, ModalWideNavigationRail, AnchoredDraggable | Ported | Predictive back; the header is not duplicated in the collapsed rail while the modal is open | Browser suites + 22 modal checks |
| Navigation drawer | NavigationDrawer, DrawerSheet | Ported | Exact velocity/slop/predictive back | Browser suites |
| Lists (`md-list`) | Expressive ListItem, SegmentedListItem | Ported | Drag/reorder, long-click APIs | Kotlin oracles + browser suites |
| Menus (`md-menu`) | DropdownMenuPopup/Group/Item | Ported | — | Browser suites |
| Search (`md-search-bar`, `md-app-bar-with-search`) | SearchBar.kt (SearchBar, ExpandedDocked(WithGap), ExpandedFullScreen(Contained), AppBarWithSearch, SearchBarState, enterAlways scroll), SearchBar/SearchView/AppBar tokens | Ported | Predictive back; scroll consumption follows DOM scroll events, not nested pre-scroll | 46 browser checks |
| Sliders (`md-slider`) | Slider.kt, SliderTokens | Ported | Expressive slider sizes need an audit; gesture ownership, value label | Kotlin oracles + browser suites |
| Tabs (`md-tabs`) | Tab, LeadingIconTab, TabRow | Ported | Audit Expressive tab row changes | Browser suites |
| Shapes (`md-shape`) | Graphics Shapes, MaterialShapes | Ported | — | Generated coefficients |

## Material 3 components Expressive left unchanged

| Component | Source | Status | Open gaps | Verification |
|---|---|---|---|---|
| Chips (`md-chip`) | Chip.kt | Ported | — | Kotlin oracles + browser suites |
| Segmented button | SegmentedButton.kt, OutlinedSegmentedButtonTokens | Ported | Multi-word labels do not wrap (the source's min intrinsic width can wrap them); Expressive recommends connected button groups instead | 76 browser checks |
| Text fields | TextField, OutlinedTextField | Ported | — | Kotlin oracles + browser suites |
| Tooltips | Tooltip, TooltipBox | Ported | — | Kotlin oracles + browser suites |
| Snackbar | Snackbar, SnackbarHost | Ported | — | Kotlin oracles + browser suites |
| Switch | Switch (2025 color profile) | Ported | Frame pacing | Browser suites |
| Checkbox | Checkbox | Ported | — | Browser suites |
| Radio button | RadioButton | Ported | — | Browser suites |
| Date pickers | DatePicker, DateRangePicker, DateInput, DateRangeInput, CalendarModel, DatePickerDialog, DatePickerModalTokens | Ported | The docked variant has no Compose source (spec layout); keyboard is a web convention; no selectableDates / yearRange API | 26 unit + 38 locale/geometry browser checks + picker suites |
| Time pickers | TimePicker, TimeInput | Ported | — | Kotlin oracles + browser suites |
| Dialogs | AlertDialogContent (+ MDC window motion) | Ported | — | Browser suites |
| Bottom sheet | ModalBottomSheet, SheetState | Ported | Predictive back | Browser suites |
| Carousel | carousel/*, foundation pager snapping | Ported | Vertical carousels, parallax, stretch overscroll; no Kotlin oracles | 320 invariants + browser checks |
| Cards (`md-card`) | Card.kt, CardDefaults elevation/colors | Partial | Compose Card is only a container (Surface + Column); the 16dp padding and header/media/actions slots follow the spec pages, not source | Kotlin elevation oracles |
| Badges | Badge, BadgedBox, BadgeTokens | Ported | Rulers from containing items (badgeBounds) | Browser placement check |
| Dividers | HorizontalDivider, VerticalDivider, DividerTokens (+ spec insets) | Ported | Hairline thickness | Browser check |
| Side sheets | MDC Android (Compose has none) + M3 spec anatomy | Ported from MDC | No official Expressive source exists (spec page and MDC checked 2026-10-11) | Browser checks |

## Extensions (no Material counterpart)

| Component | Built from | Open gaps |
|---|---|---|
| Autocomplete | Text field, menu (exposed dropdown) | Review against ExposedDropdownMenu behavior |
| Select, option | ExposedDropdownMenu, menu | Same |
| Stepper, step | Buttons, list parts | Layout is our own; no Material reference |
| Paginator | Buttons, menu | Same |
| Expansion panel | Card, ListItem | Same |

## System

| Area | Status | Open gaps |
|---|---|---|
| Color (HCT, dynamic scheme) | Ported from Material Color Utilities | Canvas color syntax coverage |
| Motion scheme (springs) | Ported | Older CSS/WAAPI spring completion in some components |
| Typography | Ported (type roles, Roboto Flex subset) | Per-component role audit |
| Shape scale, elevation, state layers, ripple | Ported (all interactive components use the shared state-layer port) | Precision focus rings, native raster |

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

37 Material components: 36 ported (one of them from MDC) and 1 partial
(cards); none is spec-only any more. 5 extensions (7 elements).
Each open gap above is one unit of remaining work; "Ported" does not mean
"no gaps".
