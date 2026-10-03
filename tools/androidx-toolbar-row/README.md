# Toolbar Row/Column measurement oracle

Run `python tools/androidx-toolbar-row/generate.py` with the shared cached
Kotlin runtime prepared by `tools/androidx-motion/generate.py`. Ordinary tests
read deterministic gzip-compressed JSON without Java. Thirteen licensed AndroidX originals are
pinned at a095da93f8e98dea8748ceed79ea8427aade245f with exact URLs/SHA hashes in
`test/fixtures/androidx/toolbar-row/sources.json`.

The projection executes complete original RowMeasurePolicy and
ColumnMeasurePolicy declarations, constraint builders, RowColumnMeasurePolicy's
measure implementation, CrossAxisAlignment, intrinsic helpers and parent-data
accessors. Original Arrangement and Alignment declarations execute as well.
SizeNode, PaddingValuesModifier, MinimumInteractiveBalancedPaddingNode,
MinimumInteractiveModifierNode and EnterExitTransitionModifierNode's complete
measure/target-offset bodies form the deferred modifier tree. The packed
Constraints implementation and three Placeable coercion/mirroring/placement
bodies remain original. Package/imports and accessible enclosing declarations
are adapted; tree wiring, density1, composition locals and leaf measurement are
explicit host boundaries.

The Row/Column oracle covers 2,268 measurements/placements and 6,804 groups of
four intrinsic queries. Inputs include empty, uneven, weighted, fill-false,
baseline, required-size and wrapping-aware host leaves, all seven arrangements,
both axes/RTL, zero/tiny/odd/fixed bounds, positive minima and unbounded maxima.
The leaf's minimum/maximum/wrapping queries are supplied inputs: this does not
execute Compose's default intrinsic approximation or Android font shaping.

38,880 toolbar cases execute sizeIn(min64) -> padding8 -> centered outer
Row/Column -> sampled leading/trailing visibility and main Row/Column with
balanced padding. Five main profiles, weights, source measurement order, both
axes/RTL, current size/offset/alignment samples and padding0/.5/1 are included.
The main group's top/left alignment lines are explicit host inputs. Automatic
Compose alignment-line merging and full AnimatedVisibility composition are
outside this oracle; the motion clock/retargeting are checked separately.

2,560 icon cases execute the unchanged minimum-interactive node around the
unchanged SizeNode, including constraints0/1/17/39/40/41/45/47/48/49, positive
minimums and five body sizes. The source rounds the inner half-difference but
truncates Placeable's apparent-to-real half-difference. These operations remain
separate. Toolbar native icon bounds are generated through the same original
nodes from each measured leaf's constraints, including weighted native icons.

Chromium compares 5,120 toolbar cases against the independent Kotlin root,
group, child and native body bounds. CSS probes distinguish resolved parent
minimum/maximum allocation from the preferred/visible frame size, so hidden
groups receive the source's remaining maximum. CSSOM rules keep internal sizing
out of host style/theme observers. Stable native controls, constrained-to-natural
metric recovery, disconnect/reconnect and switching to docked mode are checked.
The atomic visibility samples are injected independently of the real animation
clock; existing motion tests exercise the latter.

Slotted elements' natural DOM measurements, CSS allocation, arbitrary text/font
intrinsics, ancestor transforms, automatic native group alignment lines and
cross-size animation are web adapter boundaries. Bare text nodes and docked
bars retain the earlier layout path. Generic padding/shape/finite animation
APIs, complete Android composition/gesture/accessibility and platform pixels
are not established by these tests. The overall parity goal remains incomplete.
