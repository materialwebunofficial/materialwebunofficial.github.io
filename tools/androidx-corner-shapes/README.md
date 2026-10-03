# Compose corner-shape reference

Run `python tools/androidx-corner-shapes/generate.py` to regenerate the canonical
`test/fixtures/androidx/corner-shapes/outline-oracle.json.gz`. It uses the cached
Kotlin JVM compiler under ignored `research/kotlin-runtime`; normal `npm test`
needs only Node. The generator hash-verifies all 22 licensed originals against
the pinned revision and preserves the original corner/shape and RoundRect bodies
when relocating them into a shared package.

The 4,960 cases include 3,776 valid outlines, 1,184 expected invalid inputs and
9,324 original rounded-outline containment queries. They cover rounded/cut and
absolute variants, CircleShape and RectangleShape, logical RTL mapping, px/dp/
percent corners, unequal or oversized corners, Float overflow, zero/tiny/odd/
fractional dimensions, four densities, negative/NaN/infinite inputs and signed
zero. `test/unit/corner-shape.test.mjs` compares the web geometry to these results.

The host supplies geometry records, annotation/precondition shells, density
delegation and Path recording. The complete original Dp.toPx expression and Float
lerp body are injected from their verified sources. Outline records do not execute
Android's native path cache, Skia, graphics-layer rasterization, shadow or input.
The original RoundRect containment body executes, including its private scaled
corner cache; its cached bounds are not substituted for drawn outline bounds.

The public toolbar descriptor uses finite nonnegative sizes; direct geometry
tests additionally check the original invalid/extreme inputs. CSS rounded/polygon
clipping and SVG shadow blur/spread are browser adapters, not an Android renderer.
The focused browser test checks actual size, RTL/absolute updates, cut pointer-hit
exclusion, visible elevation, restored defaults, retained controls/focus and
reconnection. A screenshot-strip regression checks that transparent background
colors retain exactly the same exterior shadow pixels as an opaque background.
The seventh toolbar showcase card exercises the API with native
pointer and keyboard controls at desktop/mobile light/dark sizes.
