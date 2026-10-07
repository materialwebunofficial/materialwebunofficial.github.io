# AndroidX snackbar reference

Run `node tools/androidx-snackbar/fetch-sources.mjs` to cache the unchanged
Apache-2.0 AndroidX originals at the library's pinned revision. `sources.json`
records the exact URLs and SHA-256 hashes. The native comparison is pending;
these files alone do not establish snackbar parity.

The pinned public defaults dispatch to `LegacyOneRowSnackbar` and
`LegacyNewLineButtonSnackbar`: `isSnackbarStylingFixEnabled` is false. Preserve
that default when extracting measurement bodies. The alternate styling branch
is present in the source and must not silently replace the default.

The host animates independent alpha and scale channels through FastEffects and
FastSpatial. Its scale is .8 to 1 on entry and 1 to .8 on exit. Outgoing content
is removed when its alpha animation completes. This is a host animation, not a
whole-action press scale. SnackbarData's action is a TextButton and its optional
dismiss affordance is an IconButton; the default has no dismiss affordance.

Host timeout defaults are 4000ms for Short, 10000ms for Long and indefinite for
Indefinite. `showSnackbar` defaults to Short without an action label and
Indefinite with one. Native accessibility timeout recommendation, queue/mutex,
composition and font/baseline input require explicit hosts or documented web
adapters in the eventual comparison.
