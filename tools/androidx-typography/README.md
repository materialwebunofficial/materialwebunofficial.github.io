# Typography source generation

Run `python tools/androidx-typography/generate.py` with fontTools + brotli
(generated with fontTools 4.61.1). This creates the 30-role JavaScript catalog,
CSS variables and utility classes from the pinned AndroidX TypeScaleTokens.
Source URLs and SHA-256 values are recorded in sources.json; original Kotlin
files, including their Apache-2.0 notices, are kept in test/fixtures/androidx.

The AndroidX defaults map Brand and Plain to SansSerif. The web adaptation uses
Roboto for both. The complete Google Fonts variable font is pinned, compressed
to WOFF2 without subsetting, and included locally with its OFL license. Width
defaults to 100%; font weights use the source's 400/500/700 values. No custom
optical-size or other expressive axes are invented. Browser font rasterization
is platform-dependent and is not claimed to be pixel-identical to Android.

Source CSS resolves ../fonts/roboto-variable.woff2. The distribution build
rewrites that reference to ./fonts/roboto-variable.woff2 and copies the font
and its license. Consumers should keep the distributed fonts folder with CSS.

Theme font-family overrides rebind the 30 derived font and shorthand tokens
at the local scope, preserving inherited sizes, weights and line heights.
