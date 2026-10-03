# Color animation reference

Original AndroidX sources at a095da93f8e98dea8748ceed79ea8427aade245f,
Apache-2.0. Original licenses are retained; sources.json pins URLs/SHA256.

ColorVectorConverter maps Color into [alpha,L,a,b] in Oklab and clamps drawing
channels to alpha/L0–1 and a/b±.5. VectorizedFloatAnimationSpec (in ../motion)
uses the maximum component duration for a spring. The unchanged upstream
SpringEstimation/SpringSimulation code executes in Kotlin to generate24 vector
cases; see tools/androidx-motion. No network or compiler is needed for tests.

The web adaptation uses native relative CSS Oklab for color conversion, an
independent Float spring vector for dynamics and the original CSS target at the
endpoint. Chromium checks computed label paint through160ms, retarget velocity,
disabled alpha and inherited color changes. These checks verify motion behavior,
not bit-identical Color.kt packed Float16/10-bit storage or AndroidX sRGB output
quantization/gamut conversion. Those precision/platform differences remain open.
