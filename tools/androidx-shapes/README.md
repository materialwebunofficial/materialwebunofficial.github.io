# AndroidX shape and loading morph generator

Run `python tools/androidx-shapes/generate.py` from the repository, with Java 8+
available. Python downloads a private Kotlin compiler into ignored `research/`.
Nothing is installed globally. Normal JS builds use the checked-in generated data.

The generator compiles the pinned AndroidX `graphics-shapes` implementation and
the polygon-building portion of `MaterialShapes.kt`. It executes upstream
`Morph.asCubics` to export matched Bézier pairs, and the upstream spring duration
estimator for loading's .6 damping, 200 stiffness, .1 visibility threshold.
`sources.json` records revision, source URLs and SHA-256 hashes; cached source
changes fail regeneration.

The small bridge supplies the Compose Offset arithmetic and 2D matrix transforms
needed for polygon construction. UI-only composable/path adapters are excluded;
`fastMap` becomes `map`, and `fastIsFinite` becomes Kotlin `isFinite`. Shape
definitions, rounding, feature detection/matching and cubic splitting run from
the original sources. The exporter reproduces LoadingIndicator's rotation-safe
scale calculation. These adaptations are deliberate; the full Compose runtime
is not part of the web package.

Outputs:

- `src/tokens/shapes.js`: all 35 normalized AndroidX MaterialShapes as SVG cubic
  paths. Public viewBox stays 380x380; shapes now occupy their normalized bounds.
  `catalog.json` maps upstream names to the web API. The legacy hexagon path lives
  separately in `shape-extensions.js`, outside the canonical names list.
- `test/fixtures/androidx/material-shapes-cubics.json`: upstream cubic coordinates
  for checking every SVG coordinate independently of the web renderer.

- `src/tokens/loading-morphs.js`: seven circular morph pairs and the determinate
  circle-to-soft-burst pair, normalization scale and spring duration.
- `test/fixtures/androidx/loading-morph-oracle.json`: Kotlin interpolation at
  25%, 50%, 75% and 105%, checked against JS with a 2e-7 coordinate tolerance.

AndroidX source and derived data are Copyright The Android Open Source Project,
licensed under Apache-2.0 (see the root LICENSE and NOTICE). Source headers remain
in cached originals and generated JS. Export.kt's scale/sequence construction is
adapted from LoadingIndicator.kt.
