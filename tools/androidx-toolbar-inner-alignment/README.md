# Toolbar omitted composable alignment oracle

Run `python tools/androidx-toolbar-inner-alignment/generate.py` with the existing
cached Kotlin runtime. Normal tests consume deterministic canonical UTF-8 gzip
JSON without Java. The generator also refreshes the shared row and alignment
oracles before executing this independent default-policy harness.

Three unchanged licensed originals and exact URL/SHA manifest are under
`test/fixtures/androidx/toolbar-inner-alignment` at AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`. The generator extracts the original
public Row/Column default argument expressions and executes the complete original
default policy values and `rowMeasurePolicy`/`columnMeasurePolicy` factories.
Their ordinary defaults select Row Top and Column logical Start. The original
FloatingToolbar call sites are checked for omitted inner arguments and explicit
outer CenterVertically/CenterHorizontally arguments. An explicit child Scope.align
parent-data value overrides the selected default policy.

The shared thirteen Row/Column/modifier and seven coordinator originals are
hash-verified and executed through `tools/androidx-toolbar-alignment`. Host
adapters supply leaf measurement, parent-data storage, visibility state/sample
inputs, identity layers, deferred placement and owner invalidation. `remember`
returns the supplied calculation; this does not execute Compose recomposition.
The original visibility size-by-state callback supplies constrained natural
Visible sizes. Intermediate sizes are explicit atomic samples, not claims about
every sample being a reachable animation trajectory. No runtime JavaScript
result is used to construct expected Kotlin values.

4,032 source trees cover nine mixed native/generic/empty profiles, XS through XL,
wide buttons, Float weights/fill-false, explicit Start/Center/End/relative lines,
both axes and RTL, seven zero/tiny/odd/positive-minimum/unbounded constraints,
optional leading/trailing groups and Visible/collapsed/entering/exiting states.
Natural groups contain mixed sizes too. Source inherited minimum-interactive
line mergers and balanced padding are compared without injecting group lines.

The browser checks all 3,456 finite-parent source trees against actual root,
group, native app-host and body rectangles. Four ordinary live cases switch from
omitted arguments to explicit End/Center and remove those attributes, retaining
focused native buttons; reconnection preserves the source geometry. Existing
with-FAB policy selections remain explicitly centered and their prior source
and browser gates stay in the full suite.

Full Compose scheduling, arbitrary custom line providers/layers/lookahead,
generic intrinsic approximations, with-FAB child parent-data modeling, platform
input/font/pixels and broader browser engines remain boundaries. This verifies
one toolbar difference; complete
MD3E library/showcase parity remains in progress.
