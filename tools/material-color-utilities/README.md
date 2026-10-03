# Material Color Utilities

`python tools/material-color-utilities/generate.py` downloads the official Google
`@material/material-color-utilities` **0.4.0** package, verifies its npm SHA-512
integrity, and bundles the required exports with esbuild. The checked-in ESM
artifact supports direct browser imports without npm resolution or a CDN.
Upstream algorithms are not modified. Apache-2.0 notices remain inline.

The adapter uses the **2025 color specification, phone platform** explicitly.
`expressive` chooses MCU SchemeExpressive; `standard` chooses SchemeTonalSpot.
These are dynamic color palette variants, not the Compose MaterialExpressiveTheme
default static palette. That Compose theme uses expressiveLightColorScheme, whose
four light on-container roles use palette tone 30, and the ordinary dark scheme.
The baseline CSS tokens and generated dynamic color schemes are distinct APIs.

Source: https://github.com/material-foundation/material-color-utilities/tree/main/typescript
Package: https://registry.npmjs.org/@material/material-color-utilities/-/material-color-utilities-0.4.0.tgz

Run `node test/unit/theme.test.js` and `npm run test:parity` after regeneration.

`node tools/material-color-utilities/fixtures.mjs` builds an independent import of
all published upstream exports and records 128 reference schemes (8 seeds,
2 palette variants, 2 modes, 4 contrast levels). Unit tests compare every color
role against these values. These tests establish adapter parity with the pinned
MCU version; they do not prove whole-component contrast or full-library parity.
