# Material Symbols subset

`src/icons/fonts/material-symbols-rounded.woff2` is built from the full
variable font in the same folder (`material-symbols-rounded.full.woff2`):

- the ligatures listed in `icons.txt` (icons the components and the showcase
  use, plus common symbols kept from the earlier subset);
- `FILL` and `wght` stay variable (selected icons fill, weights 100-700);
- `opsz` is pinned at 24 and `GRAD` at 0, as Compose icons are drawn.

Rebuild after adding names to `icons.txt` (needs `fonttools` and `brotli`):

    python -I tools/material-symbols/subset.py

A name missing from the font is reported and skipped.
