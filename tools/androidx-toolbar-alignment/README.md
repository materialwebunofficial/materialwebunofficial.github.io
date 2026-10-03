# Automatic toolbar alignment-line oracle

Run `python tools/androidx-toolbar-alignment/generate.py` with the shared cached
Kotlin runtime. It first runs the independently pinned Row/Column generator,
then builds the source UI alignment machinery around that same original
Row/Column/minimum-interactive/SizeNode/balanced-padding tree. Normal tests use
the generated deterministic gzip JSON without Java.

Seven additional licensed UI originals at AndroidX
`a095da93f8e98dea8748ceed79ea8427aade245f` are in
`test/fixtures/androidx/toolbar-alignment`, with exact URL/SHA manifest. The
generator executes the complete AlignmentLine declarations/mergers,
AlignmentLines and LayoutNodeAlignmentLines classes, original coordinator get,
toParentPosition and calculateAlignmentAndPlaceChildAsNeeded bodies. Package,
imports and accessible enclosing declarations are adapted. The precondition
host adapter supplies Kotlin's contract so the original nullable-child body
retains its compiler smart cast.

The explicit host boundary supplies coordinator/owner identity, deferred
placement, an identity graphics layer, invalidation callbacks and measured
native content. Native touch/body dimensions and positions come from the
original minimum-interactive/SizeNode code. Row/Column measurement and actual
child positions come from the original policies, not manually assigned group
lines. The child delegate presents the coerced outer size, as documented by
MeasurePassDelegate's remeasure implementation. Its get forwards to the outer
coordinator. InnerNodeCoordinator/MeasurePassDelegate's full scheduling and
Android composition/graphics/input runtime are not executed.

20,160 cases cover empty, one/three icons, mixed icon sizes/widths, uneven cross
alignment, Float weights/fill-false, a generic first child, large bodies,
both axes/RTL, zero/tiny/odd/positive-minimum/unbounded bounds, all four
leading/trailing presence combinations, visibility samples0/12/48,
padding0/.5/1 and expanded targets. The oracle records source-propagated top/left
lines, balanced/root/group/host/touch/body placement. Main-group lines are not
injected. Coordinator.get's coercion offset and the actual placed coordinator
offset both participate in line propagation; negative lines in tiny parents
are retained rather than replaced with a visual-edge approximation.

The browser compares 3,024 of those states using real native buttons, including
XS/S/M/L/XL and a wide button, an empty/non-native first child, weighted content,
RTL, constrained-to-natural recovery, live sizes and reconnection. It supplies
current visibility/padding samples independently of the motion clock and asserts
computed lines and actual geometry against Kotlin. Existing motion/scroll and
all six showcase checks still exercise the real clock/controls.

The runtime now derives native main-row lines from actual child measurement and
placement rather than the first child's natural rectangle. Explicit top/left
helper inputs remain available for host adapters and the older standalone tree
oracle. Generic nested custom layouts/line providers, non-identity graphics
layers, predictive/lookahead scheduling, actual two-dimensional cross-size
animation, default intrinsic approximation, bare text/docked measurement and
exact platform font/ripple/focus/touch pixels remain separate audits. This gate
does not prove complete toolbar or library parity.
