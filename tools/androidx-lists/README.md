# AndroidX Expressive list oracle

Run `python tools/androidx-lists/generate.py` with Python3 and Java8+ after the
private Kotlin runtime has been initialized by tools/androidx-motion/generate.py.
No system compiler is installed. All original source files have pinned URLs,
SHA-256 hashes and Apache headers in test/fixtures/androidx/lists/sources.json.
Normal tests read committed JSON without Java or network.

The generator compiles the unchanged InteractiveListItemMeasurePolicy,
ListItemType, supporting-height heuristic and public verticalAlignment function.
Host stubs model Density1, Constraints, measured children, baselines, alignment
and placeRelative. Geometry expectations are Kotlin output, independent of JS.
10368 cases vary width, bounded/unbounded constraints, padding, alignment and
leading/trailing/main text sizes. Real text shaping is outside these stubs.

ListItemColors constructor adapters hold values only. The six state-selection
methods, public default/segmented constructors and List/Reorder color tokens
execute unchanged, yielding16 state combinations. The source's when block in
shapeForInteraction executes unchanged for32 combinations; composable animation
and drawing calls outside that state projection are not compiled. Source shape
tokens are additionally guarded in the unit test. Browser trajectories use the
separate Kotlin spring and color-vector oracles, including incoming velocity.

The web port uses1CSSpx per dp, logical placement and source natural heights.
The 24px convenience icon follows public ListSamples Icon defaults; the public
decorators leave arbitrary slotted children unconstrained by the unused icon
token. The local minimum size of checkbox/radio reduces to24px layout while the
canvas stays20px and the web pointer target stays48px. CSS shadow interpolation
uses the six web elevation tokens; Android shadow rasterization is not claimed.
