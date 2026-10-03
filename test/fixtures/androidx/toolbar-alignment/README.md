# Automatic toolbar alignment-line fixtures

Seven unchanged licensed originals at AndroidX
`a095da93f8e98dea8748ceed79ea8427aade245f`, with exact URLs and SHA-256 hashes in
`sources.json`. The thirteen shared Row/Column/modifier originals remain in
`../toolbar-row` and are verified by the shared generator and unit suite.

`alignment-oracle.json.gz` is deterministic gzip-compressed UTF-8 JSON generated
from the original coordinator, merger, Row/Column and native modifier bodies.
20,160 cases record inherited top/left lines, actual placements and balanced
toolbar dimensions. The browser selects3,024 cases without injected group lines.
See `tools/androidx-toolbar-alignment/README.md` for reproduction and exact
coordinator/owner/graphics/scheduling host boundaries.
