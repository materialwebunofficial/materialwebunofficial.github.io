# App bar source checks

`node tools/androidx-app-bars/fetch-sources.mjs` caches seventeen unchanged licensed
AndroidX sources at revision a095da93f8e98dea8748ceed79ea8427aade245f. Exact
URLs and SHA256 hashes live in `test/fixtures/androidx/app-bars/sources.json`.
Tests verify those hashes before deriving standard/flexible height, padding,
arrangement and zero-elevation defaults from AppBar.kt and its token files.
IconButton/Defaults and IconButtonTokens verify inherited enabled/disabled
content colors and the source alpha-replacement rule.
Filled/tonal/outlined sources also verify disabled container opacity, checked
border removal, disabled priority and immediate state color selection. Target
colors are checked with CSS resolution; native Color packing/pixels are not
established by this color adapter test.

`npm run test:app-bars` builds the distribution and checks actual Chromium
controls, scoped light/dark/high-contrast colors, optional caller FAB,
keyboard/pointer actions, live updates, RTL padding and lifecycle. The focused
runner also checks shared FAB Surface, interactions, ripple and toolbar behavior.
Use `node scripts/test-app-bars.mjs --source` for direct source modules or append
`--app-bars-only` to limit the run to minimum-icon/app-bar/showcase checks, or
`--top-only` for top app bars or `--bottom-only` for bottom layout/defaults.
`--bottom-scroll-only` focuses on bottom state/scroll/settling integration.

`python tools/androidx-app-bars/generate-top-layout.py` requires the private
Kotlin runtime and prepared original modifier/easing hosts from
`tools/androidx-toolbar-row/generate.py --icon-expressive-only` and
`tools/androidx-drawer/generate.py`. It verifies all source hashes and executes
the complete unchanged TopAppBarMeasurePolicy measure/place body (13,440 cases),
original CubicBezierEasing/Bezier math (1,031 fractions for both curves) and
3,360 default Box/Row/Column/padding/minimum-interactive trees. The generated
Box policy changes only visibility and its host interface name; the IntOffset
placement overload forwards to the original coercion host. Body dimensions,
slot leaf sizes, baseline values and generic parent constraints are host inputs.
Tree baselines remain unspecified; font shaping and descendant alignment-line
propagation are not independently executed by this tree host. Chromium compares
all 1,680 single-row tree/body outputs; separate default/variant/baseline/state
tests exercise the actual two-row component. Unit tests are part of `npm test`.
Gzip output uses mtime=0 and regenerates deterministically.

Twenty-four tonal samples compare against the independently executed unchanged
Kotlin color fixture under `test/fixtures/androidx/fab-surface`. The icon minimum
fixture comes from the unchanged modifier and Placeable bodies described in
`tools/androidx-toolbar-row/README.md`; it is not calculated from web geometry.

The native bodies/token defaults are the reference. Top/bottom-bar DOM
slots/text metrics, CSS constraint probing/safe-area insets/color resolution,
grouping, focus/semantics and state inputs are explicit web adapters. Native
intrinsic/custom modifier behavior, Android system insets, Color
packing/pixels, font shaping and other browser engines remain open.
The whole-library goal remains incomplete.

`python tools/androidx-app-bars/generate-bottom-layout.py` requires the prepared
toolbar-row and top-layout native hosts. It verifies both manifests and executes
the unchanged Row/Box/Fill/Size/Padding/minimum-interactive/Placeable bodies in
the public bottom composables' default tree. Standard bars measure the unweighted
FAB full-height Box first, then the weighted action Row; flexible bars use seven
native arrangements including centered 32dp spacing. The 6720 trees cover six
empty/native/generic/weighted/fill-false/relative-line profiles, seven zero/tiny/
odd/fixed/positive-minimum parent bounds, five logical/fractional/large paddings,
both directions and zero/nonzero physical safe-area inputs. Chromium compares
the actual icon/FAB body and generic element bounds for every tree. Additional
live cases check recovery from tiny constraints, CSS-calculated minimums, hidden
content, direction/variant/FAB-size changes and retained controls/reconnect.
Gzip mtime=0 gives byte-identical reproduction. Body/natural dimensions, explicit
alignment lines, safe-area values and tree construction are host inputs. Full
Compose composition, arbitrary content/intrinsics/providers and Android window
insets are not executed. The separate bottom scroll/drag integration is described below.

`python tools/androidx-app-bars/generate-top-scroll.py` extracts the unchanged
TopAppBarState, Pinned/EnterAlways/LegacyEnterAlways/ExitUntilCollapsed bodies and
settleAppBar from the same hashed AppBar.kt. Prepare the shared native hosts with
`python tools/androidx-toolbar-scroll/generate.py` and
`python tools/androidx-app-bars/generate-top-layout.py` first. State storage, vectors,
save-list types and explicit animation frames are supplied by that host. The
unchanged Android spline and FloatSpringSpec supply position, velocity and
duration; default top-bar snap is DefaultEffects (1600/1), not FastSpatial.
Deterministic gzip fixtures cover 200 initial/assignment/limit-only/overlap state
cases, 240 pre/post/fling traces including canScroll, content-at-start and legacy
reverse policy, and 4032 nullable-spec/default/zero-duration/snap-mutation settle
traces. The source setters retain NaN and signed zero.

Chromium checks real component state/layout/RAF integration, measured limits
including equal collapsed/expanded token heights, source wheel pre-consumption
and DOM remainder, pinned/enter/exit, vertical touch/mouse slop, null specs,
reduced motion and retained controls on reconnect. Fixed-limit RAF comparisons
use unbounded native height so onSizeChanged does not change the limit in those
traces. A further 360 coupled clocks execute the unchanged
TopAppBarMeasurePolicy/Placeable and settleAppBar together under an explicit
host clock, covering tall/ordinary title inputs, positive minimums, 64/300px
bounds, fractions, velocity signs and 8/16/33ms frames. All 5327 frames compare
source offsets, measured limits, actual DOM height and title rectangle. The
frame host publishes measurement after each animation block and before
settleAppBar captures the next snap. This exposed and fixed premature snap-target
capture in the web bridge. Premeasured padded title/nav/action dimensions and
the frame/measure ordering are host inputs; full Compose coroutine/composition
scheduling is not executed. DOM touch/programmatic scroll ordering and browser
fling velocity remain explicit platform boundaries.

`python tools/androidx-app-bars/generate-bottom-scroll.py` executes complete
unchanged BottomAppBarStateImpl, ExitAlwaysScrollBehavior, settleAppBarBottom
and the outer BottomAppBarLayout measure/place lambda. It verifies the original
bottom/top settling bodies are identical after state/type naming, which permits
sharing their JS frame engine while keeping separate defaults. The hashed FAB
manifest provides unmodified Expressive and Standard FastSpatial tokens; original
Android spline and FloatSpringSpec supply frames. Reuse the prepared toolbar-scroll,
top-layout and Row hosts. BottomTree.kt supplies the default composition under
explicit bounds, insets, direction and optional FAB. The 100 state cases, 24
nested traces, 8064 nullable/reduced/mutated settling traces (39476 non-reduced
frames), and 1536 outer-measure/settle clocks (21572 frames) compare against JS.
Chromium checks all 21572 coupled frames against the actual component RAF bridge,
full Surface and native icon/FAB bounds, then live consumed-scroll, native downward
drag/slop, null specs, reduced motion, touch-exploration gating and lifecycle.
These gzip outputs have mtime=0. Storage, frame clock, measure ordering, default
tree construction and leaf/body dimensions are host inputs; complete Compose
runtime, Android service detection/window insets/gesture arbitration, custom
non-spring specs/providers and native input/font/Color/raster remain open.
