# Pointer hover controller reference

Run `node tools/androidx-hover-tracker/generate.mjs --check` from the repository root with the cached Kotlin runtime in `research/kotlin-runtime`.

The generator executes the unchanged original AndroidX `HitPathTracker`, `NodeParent`, `Node`, `PointerIdArray`, `InternalPointerEvent`, `PointerEventType` and rectangular out-of-bounds bodies at revision `a095da93f8e98dea8748ceed79ea8427aade245f`. It also executes the complete original AbstractClickableNode pointer-event, cancellation, hover-emission, interaction-disposal and common-update methods. JVM imports/package names and `actual` declarations are adapted; controller method bodies are not rewritten.

The 104 records cover five input rectangles, three pointer kinds, three affine scales, root window bounds, retained pressed paths, inclusive edges, outside/return/up, immediate/deferred cancellation, deferred node detachment, fresh re-entry, disable/re-enable without exit and sequential Mouse/Stylus device IDs. Hashes of original inputs, generated sources, hosts and decoded output are recorded in the fixture provenance.

Collections, coordinates, modifier nodes, Android event records, focus/indication/gesture delegation and synchronous coroutine emission are explicit hosts. The complete AbstractClickableNode class, operating-system input processor, gesture recognition, coroutine/collector scheduling, multiple-pointer frame composition, arbitrary transforms and raster rendering are outside this reference. The oracle's hover state comes from the original hover-emission methods, not the web implementation.
