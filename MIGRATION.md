# Unreleased changes and web contracts

These changes include behavior and API corrections relative to the previous Git
revision. Publish them as a major release after reviewing this guide; the working
package version is not a claim that a new release has been published.

## Activation and forms

`click.preventDefault()` on a component host or ancestor prevents the component's
default action (submit/reset, toggle or navigation). Normal bubbling activation
commits at the final propagation target. When a listener stops propagation, the
action is checked in the next task; stopping propagation alone does not cancel it.
Read the resulting control state from `input`/`change`, which fire on commitment.
Host `.click()`, keyboard activation and label activation use the same cancellation
contract. The original click remains visible to consumers.

Text fields and autocomplete forward `pattern`, `minlength`, `maxlength`, `min`,
`max` and `step` to the native editor. HTML validity rules apply, including native
length validation's distinction between user edits and programmatic assignments.
Custom errors persist until `setCustomValidity('')`. Non-text input types sanitize
their values before storing FormData; an invalid optional number becomes empty.

Select accepts values from its current option set. An unknown value becomes an
empty selection and cannot satisfy `required`. With no host default `value`,
declarative `md-option[selected]` establishes the initial selection. Option
`.selected` is the current state; `.defaultSelected` and the `selected` attribute
are the reset default, following native option semantics. Inspect `.selected` to
find current choices; an attribute selector finds defaults. Form reset restores
the host's default value or the option defaults. Duplicate option values preserve
the chosen option identity until assigning a new select value.

Multiple select retains its existing CSV API: one string value such as `a,b` and
one FormData entry, unlike native multiple select's repeated entries. Values
containing commas cannot be represented unambiguously by this API.

Date picker accepts exact `MM/DD/YYYY` and `YYYY-MM-DD` calendar dates, including
valid leap days. Invalid and empty values clear selection; `.value` is empty.
Valid values are returned as `MM/DD/YYYY`. This value format does not follow
the locale: the `locale` attribute (else the nearest `lang`, else the browser's
language) sets only what people see and type, such as weekday order, names,
headlines and the date input pattern (`DD.MM.YYYY` for `tr-TR`). Date/time pickers are interactive
pickers and do not currently implement form association. To submit their accepted
values, synchronize their `change` events into an application's form field.

## Accessible names and public DOM

Accessible name precedence is `aria-labelledby`, explicit `aria-label`, associated
external HTML labels, then the component label/fallback. Label/reference text
changes update the inner control. A text field's external label focuses its active
editor. Public ARIA attributes remain real DOM attributes: selectors, cloning,
serialization, MutationObserver and framework updates see the same state.
Forwarded popup/expansion attributes and relations clear when removed.
Container names apply to the navigation/list/toolbar group, preserving each
child control's own name. Range sliders retain their start/end thumb names.

## Resize delivery

Layout-writing resize observers coalesce notifications into a shared animation
frame and retire pending work on disconnect. A consumer reading layout directly
after changing a container's size should wait for the next rendered frame. Tests
with a paused RAF clock must advance that clock after native resize delivery.
The WebKit host-size adapter uses a retained style element because editing a
shadow stylesheet's `:host` rule through CSSOM did not invalidate host sizing.

## Component changes

- Badge can wrap its anchor like Compose BadgedBox. The anchor keeps its size;
  the badge is positioned at its top end, mirrored for RTL. Numeric text follows
  LabelSmall line height and can grow with text. Existing `label`, `max`,
  `containerColor` and `contentColor` remain available. Recheck custom positioning
  and CSS that assumed a fixed numeric badge height.
- Carousel supports `multi-browse`, `uncontained` and centered `hero`. Use
  `preferredItemWidth` for multi-browse/hero, `itemWidth` for uncontained,
  `itemSpacing`, `contentPadding`, `minSmallItemWidth` and `maxSmallItemWidth`.
  Legacy `maxItemWidth` has no effect. Child elements are items and take precedence
  over the JSON convenience input. `currentItem` is read-only; `activeIndex`,
  `scrollToItem()` and `animateScrollToItem()` control position. Recheck code that
  assumed fixed item widths, native overflow scrolling or old snap behavior.
- Segmented button uses `selectedIndex` for single choice and `selectedIndices`
  for multiple choice. Migrate legacy `checked`/`selected` aliases to these APIs.
  Its `space` means overlapping outlines (default 1px), rather than a positive
  gap. Item labels/icons and disabled states follow the AndroidX source; internal
  `.seg-content` and press-scale styling are no longer part of the implementation.

## Imports, types and distribution

The root entry registers the whole catalog and needs a browser DOM. For selective
registration use `@materialwebunofficial/md3e-web/components/md-button.js` (the
extensionless component path also resolves). Read the README's client lifecycle
examples for SSR frameworks. The separate `/theme` entry permits pure color
computation in Node; DOM application functions still need the browser.

`MdBaseComponent` was declared but never exported at runtime; it is no longer an
importable value. Extend `HTMLElement` for application components. `MdShape`,
`adoptSheet` and `createComponentSheet` now have root declarations. The canonical
definition source is `types/index.d.ts`; build generates dist and component
declaration entries from it.

Only the rounded icon subset and used Roboto fonts are included in the default
distribution. Supply a separate font if an application needs symbols outside the
subset. Full debug maps are optional: `MD3E_SOURCEMAPS=1 npm run build` (PowerShell:
`$env:MD3E_SOURCEMAPS='1'; npm run build`). Run a normal build again before
committing/releasing the default distribution.

Use `npm ci`, then `npm run verify` after installing Playwright's Chromium,
Firefox and WebKit. CI uses the same command. Deployment waits for that gate and
rebuilds the showcase artifact. `npm run check:dist` compares the saved dist with
a fresh deterministic build; commit the rebuilt output when it reports drift.
