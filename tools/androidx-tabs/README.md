# Independent Tab/TabRow Kotlin projection

Run from the repository root with Python 3 and Java 8+:

```text
python tools/androidx-motion/generate.py
python tools/androidx-tabs/generate.py
node test/unit/tab-parity.test.mjs
```

The first command initializes the private Kotlin compiler cache under ignored
research/kotlin-runtime. Generation verifies every pinned tab source hash before
compiling. It never imports the JavaScript layout port or MdTabs implementation.

Executed source:

- Entire TabBaselineLayout and both Placeable placement helpers/constants.
  Private visibility is opened; original measurement and placement bodies stay
  unchanged. Child text measures supplied by the harness include the source's
  16dp horizontal Box padding. The emitted inputs expose unpadded text sizes.
- Complete modern TabRowImpl and ScrollableTabRowImpl measure/place lambda
  bodies. Host wrappers supply measurables, constraints and positions holders.
  Only the scrollable body's lexical density qualifier `this@Layout` is renamed
  to the wrapper's qualifier; the arithmetic/measure/place code stays intact.
- Entire TabIndicatorOffsetNode, with injected Animatable values. Placeable's
  source apparent/real centering and parent constraints are host adapters. This
  tests drawing/coercion, not Compose coroutines or animation scheduling.
- Entire TabPosition.calculateTabOffset. ScrollState's original float-delta
  consumption lambda body is executed in a host object exposing its accumulator.
- Tab's unchanged selected/unselected default parameters and selected color
  expression; row default container/content getters and original token objects.
  Disabled state is an input: the source color path does not tint it differently.
- BiasAlignment.Horizontal's entire align method and Arrangement.placeCenter
  execute the Tab Column's outer centering, including odd pixels, overflowing
  children and RTL. They round half pixels upward; TabBaselineLayout's inner
  centering uses integer division. The host supplies zero bias, LayoutDirection
  and transparent forward/reverse array iteration signatures.

Harness.kt supplies density1, font scales, RTL, native child size/baseline inputs,
minimal layout/Placeable/State/coroutine signatures and token role identifiers.
No Android/Compose UI runtime, text shaping or rasterizer runs in this projection.
All original Kotlin files keep their license headers and remain unmodified.

Separate original SpringSimulation/SpringEstimation execution produces the
DefaultSpatial/DefaultEffects/FastEffects scalar/vector expectations used by
browser tests. The web runtime is checked at 16/32/64/etc. milliseconds, through
interruption, RTL signed rounding, source duration and local Standard motion.
Native text metrics, generic Row/LeadingIconTab constraints, pixel density,
ripple/focus, precision-pointer routing and wider engines remain platform audits.
