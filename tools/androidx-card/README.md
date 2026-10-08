# AndroidX Card elevation reference

`node tools/androidx-card/generate-elevation.mjs --check` reproduces the pinned
fixture from unchanged original `CardElevation`, three default elevation factory
bodies, and their token getters. The generator checks original source hashes.
`ElevationHost.kt` declares composition, collection, interaction and frame hosts;
shared hosts execute the original tween/easing/animateElevation/math bodies.

The 103 records include 95 interaction histories (2470 frames), five remembered
null-source values and three dependent default-elevation factory overrides.
Outlined hover uses `defaultElevation`, despite the separate generated hover
token; its drag default remains 6dp. Configurations use named web fields in order
default, pressed, focused, hovered, disabled, dragged.

This executes the scalar controller/defaults, not the complete composables,
compiler groups, coroutine races, OS input, caller layout or platform shadow
raster. Browser tests compare the unchanged fixture with the actual Card binding;
externally injected Press/Drag owners and authored hover/focus are explicitly
separate from trusted web input tests. HTML owns drag recognition. Static web
variant changes use distinct composition keys; the native null-source fixture
only proves the remembered class body, not compiler branch identity.
