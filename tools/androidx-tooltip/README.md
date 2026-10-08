# Native tooltip reference checks

Pinned AndroidX revision: a095da93f8e98dea8748ceed79ea8427aade245f.
`node tools/androidx-tooltip/fetch-sources.mjs` caches twelve unchanged licensed
source/resource files, including Transition.kt, AndroidPopup.android.kt and the
Android accessibility-service state provider, with exact URLs/SHA-256 manifests.
The last two are inspected source references for the DOM window adapter; they
are not executed JVM/window/service fixtures.

Prepare the repository's Kotlin 1.9.24 runtime and run
`node tools/androidx-tooltip/fetch-runtime.mjs`, then
`python tools/androidx-tooltip/generate.py`. Coroutine core/test 1.8.1 are
test-only Maven artifacts with their own ignored manifest. The complete
MutatorMutex source runs unchanged; its platform AtomicReference resolves to
java.util.concurrent.atomic.AtomicReference. TooltipStateImpl,
TooltipPositionProviderImpl and caretX bodies are extracted unchanged. Original
Transition.updateTarget/onTransitionEnd/onDisposed bodies also run unchanged
around explicit generic field/list hosts. Eight additional histories check their
current/target/visible bookkeeping against the actual renderer. Host "run" events
only set the native bookkeeping flag; they do not pulse scalar frames. The
separate scalar fixtures test channel frames. This is not the entire Transition
class/frame/composition host. Zero-duration reversals commit on their first RAF,
and disposal completes the retained transition state. Basic
transition storage, integer geometry, annotations and cancellation exception
are explicit shims. The state host uses real coroutine virtual time; it does
not execute Compose transition/composition scheduling or the complete pinned
AndroidX dependency graph. Passed windowSize intentionally differs from the
position provider's captured window size, following the actual source behavior.

The fixture covers 7,350 integer position cases (edges, RTL, zero/large/odd
dimensions, overflow and spacing), 168 Float caret coordinates and 18
nonpersistent/persistent priority/mutex/timeout/dismiss/disposal histories.
Expectations are generated without reading production JavaScript. Repeated
generation is byte-identical. Never regenerate a fixture while tests read it.

`node test/unit/tooltip-parity.test.mjs` checks these native outputs and source
hashes. `node scripts/test-tooltip.mjs --source` tests direct source modules;
the command without --source tests the rebuilt distribution. Browser coverage
includes 420 real popup/anchor positions, source roles/default geometry/shadows,
rich title/body baselines, Tab/action focus and Escape, long-press minimum
duration/hold/cancel/click suppression, safe stable updates, disabled automatic
input, colors/shapes, reconnect/description cleanup and snackbar localization.
Motion compares 170 shared native Float spring samples across both schemes,
including interrupted entry and retirement after both channels finish.
Showcase plain/rich examples are checked at 1440/390 in light/dark.

`test/browser/tooltip-focus.mjs` checks the actual focusable DOM popup: initial
focus, nested open-shadow/slot controls, enabled traversal and live disabling,
Tab/Shift+Tab containment, anchor-forced focus, caller-supplied accessibility
force state gated by hasAction, prior-focus restoration, reattachment/stack
retirement, popup Escape down/up, unrelated-key non-consumption, custom dismissal,
and real outside mouse/touch consumption versus nonfocusable pass-through.
Explicit focus survives normal closing motion until both channels retire.
Manual state survives input/anchor rebinding; only bound hover/focus requests
are canceled. A later modal dialog owns its own keyboard focus until closing.
CSS/WAAPI ancestor translation/scale updates the anchor and caret; each visible
frame reads bounds but skips layout/outline work if they are unchanged. Hidden
and disconnected popups cancel polling.

`python tools/androidx-tooltip/generate-layout.py` additionally executes the
original public PlainTooltip/RichTooltip and textVerticalPadding bodies, with
original Surface Box policy, Column, SizeNode, padding, baseline alignment-line
coordinator propagation and requested/coerced placement. Modifier's type name
is relocated; Compose emission, density1, drawing-only values and measured
font/control leaves are explicit hosts. Default caretShape=null is executed;
the nonnull caret/drawing branch and intrinsic queries are not established.
26,640 plain/rich trees cover multiple/empty/absent children, source baseline
merging, finite/minimum/fixed/unbounded bounds, maxWidth and RTL. Regeneration
is byte-identical. The generator verifies every tooltip, toolbar-row,
toolbar-alignment and snackbar reference dependency's manifest.

The actual renderer calls tooltip-layout.js through tooltip-dom-layout.js.
Each source Box measures children independently; callers wanting a row place
their controls inside one row container. Popup measurement uses AT_MOST window
width/height. Actual text/font/control shaping supplies explicit DOM leaves;
fractional natural sizes round up before integer placement. Stable slotted
controls are measured against current constraints rather than a previous Box
width. Authored inline geometry/priorities and intervening outside writes are
restored on retirement, slot removal or disconnection. Standard text-button
actions keep their 40dp visual surface inside the 48dp interactive leaf.

Run `node scripts/test-tooltip.mjs --source --capture-layout`, then
`python tools/androidx-tooltip/generate-layout.py --browser` between test runs.
This executes original native child measurement again and checks every
captured child constraint, without reading production JavaScript. The 96
browser references compare actual popup/Surface/title/body/action/leaf geometry
across 960/390/93 windows, short height, two explicit monospace typography
profiles, multiline/empty/multiple content, zero/narrow/percentage maximums and
RTL. The browser gate also checks short button labels do not wrap after integer
placement, stable focus/control identity and author style restoration.

SVG container/caret nonzero union fill
and outline shadow are browser adapters; arbitrary shape/caret factories,
Android boolean path/raster equivalence, custom finite specs, font shaping,
complete accessibility/gesture arbitration, Android window/IME/service focus,
closed shadow roots, other localizations and other
browser engines remain open. Native scalar motion/frame inputs do not establish
the complete Compose Transition scheduler.
