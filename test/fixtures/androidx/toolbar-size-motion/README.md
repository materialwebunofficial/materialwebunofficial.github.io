# Toolbar IntSize motion and composition source fixtures

Twelve unchanged licensed originals at pinned AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`; `sources.json` records exact URLs/SHA.

`size-oracle.json.gz` contains108 original vector/TargetBasedAnimation/Transition
trajectories (1,188 frames) and864 original composition gate states.
`layout-oracle.json.gz` contains1,920 native Row/Column/visibility trees where the
source composition predicate decides which visibility Measurables exist.

Both are deterministic gzip-compressed canonical UTF-8 JSON. Reproduction and
exact host/scheduling/non-spring/graphics/atomic-sampling boundaries are described
in `tools/androidx-toolbar-size-motion/README.md`. The shared thirteen Row/Column
and seven coordinator sources stay under `../toolbar-row` and
`../toolbar-alignment`; they are independently hash-verified and executed by
the layout generator.
