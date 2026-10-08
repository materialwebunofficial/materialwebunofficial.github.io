# AndroidX snackbar reference

Run `node tools/androidx-snackbar/fetch-sources.mjs` to cache the unchanged
Apache-2.0 AndroidX originals at the library's pinned revision. `sources.json`
records the exact URLs and SHA-256 hashes. Cached files alone do not establish
snackbar parity.

`python tools/androidx-snackbar/generate-motion.py` verifies those originals,
the pinned FAB motion-token originals and shared animation sources. It compiles
the unchanged Standard/Expressive token objects with the existing unchanged
SpringSimulation/SpringEstimation runtime. Ten close-during-entry histories
cover 0/16/64/96/256ms cuts for both schemes, with 150 Float channel frames.
The SnackbarHost literals/token selection are checked against the original.
The complete Compose host/coroutine implementation is not compiled by this
scalar harness; visibility changes, frame times and completion are host inputs.

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
adapters. The JS host queue has FIFO/cancellation/result tests and the Chromium
component checks the shared native entry/exit trajectories, all ten interruption
histories until alpha retirement, live role/custom colors, inherited native
Surface tint, native action input, timers, teardown/reconnect and reduced motion.
Queued visuals survive convenience-default/layout changes, and repeated `show()`
calls before connection use the latest attributes. BodyMedium tracking uses the
source token and live scoped overrides. Three live showcase examples have
matching snippets, real action/dismiss input, visible content/navigation bounds,
1440/390 light/dark and live RTL placement/control-order coverage.
`python tools/androidx-snackbar/generate-layout.py` extracts the complete unchanged
LegacyOneRowSnackbar measure lambda and alignmentLineOffsetMeasure body. It
uses the prepared original packed Constraints/Placeable/alignment host at
`research/toolbar-alignment-generator/oracle.jar` (prepare that host with its
own generator first), plus the unchanged FillNode body. It verifies all shared
source manifests before compilation. Dimensions and first/last baselines of
measured Text/action/dismiss boxes are explicit input leaves.

The independent fixture contains 3,600 one-row policies, 3,200 alignment-offset
policies and 3,000 separate-line Size/Fill/Padding/Column/Row trees, including
zero/tiny/positive-minimum/fixed/unbounded bounds, RTL, required leaves, missing
lines, taller controls and zero-width dismiss. Modifier baseline queries execute
the original coordinator get/placement bodies. The native tree constructs the
single measured text-box contract; arbitrary Box children and descendant-line
merging are not executed by this harness. Intrinsic queries are not tested here.

To reproduce browser references, first run
`node scripts/test-snackbar.mjs --source --capture-layout`, then (after it exits)
`python tools/androidx-snackbar/generate-layout.py --browser`. This captures only
explicit platform leaf measurements/configuration; expected geometry is produced
by the original JVM bodies. `browser-layout-oracle.json` contains 40 fixed
Chromium font/control-input cases across both directions and 960/390 viewports.
The browser gate checks those leaves, then actual rendered body/action/dismiss
geometry against native output, plus stable live fonts/direction/layout/reconnect.
Do not regenerate any fixture while a test process reads it.

Production now uses the source layout helpers with unscaled DOM baseline markers,
scoped fonts and retained native controls; CSS flex/padding approximations are
removed. The native SnackbarData presenter padding12dp is now composed around
the Surface and its motion; 7,200 additional independent native trees cover it.
The 40 browser references include this presenter. TextButton actionColor and
the wrapper actionContentColor are separate. Rounded/cut/rectangle shape
descriptors use the existing native corner kernel and opaque-mask shadow adapter.
Dismiss includes the shared source tooltip with native English/Turkish labels;
see tools/androidx-tooltip/README.md for its independent state/position scope.
Browser shaping/raster and existing button/icon measurements remain platform
inputs. General constrained custom content, native accessibility manager,
snackbar coroutine/FIFO host, arbitrary Shape factories and other engines remain
pending. Tooltip's real coroutine/mutex harness does not prove SnackbarHost.
