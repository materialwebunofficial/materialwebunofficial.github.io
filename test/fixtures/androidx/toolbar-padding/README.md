# Toolbar configurable padding source fixtures

Four unchanged licensed originals at AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`; `sources.json` records exact URLs/SHA.
The deterministic canonical UTF-8 gzip oracles contain:

- `values-oracle.json.gz`: 66 logical/absolute validation and Float-rounding cases.
- `row-oracle.json.gz`: 8,064 original native no-FAB modifier trees.
- `fab-oracle.json.gz`: 31,104 original intrinsic/padding/scroll/FAB trees,
  including 2,160 expected source-invalid constraint combinations.

Shared Row/Column, coordinator, size, scroll and Placeable originals are retained
and independently hash-verified in the preceding toolbar fixture directories.
Reproduction, unchanged executed bodies, finite intrinsic queries, opaque
with-FAB content, density-1 hosts and exact browser assertions are documented in
`tools/androidx-toolbar-padding/README.md`. These fixtures do not establish full
Compose/runtime/renderer equivalence.
