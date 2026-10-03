# Pinned menu oracle

Run `python tools/androidx-menus/generate.py` from the repository root with
Python 3, Java 8+ and the private compiler cache created by
`tools/androidx-motion/generate.py`. Normal tests consume the saved JSON;
no compiler, network or Android runtime is needed for those tests.

The generator verifies the SHA-256 manifest in
`test/fixtures/androidx/menus/sources.json` before extracting source at
`a095da93f8e98dea8748ceed79ea8427aade245f`. It executes unchanged Kotlin:

- MenuPosition candidate objects, DropdownMenuPositionProvider, MenuAnchorPosition
  scope/candidates and calculateTransformOrigin: 7,776 cases across window bounds,
  anchor edges, oversize content, offsets, six positions, RTL and both public
  horizontal margins.
- MenuArrangement: 256 cases of decorated/natural-width text and logical layout.
- Four public ordinary/selectable standard/vibrant color constructors and their
  state methods: 16 states including disabled-selected precedence.
- MenuDefaults groupShape/itemShape, their eight cached shape constructors,
  ShapeTokens and the two shapeByInteraction selection branches: 60 corner states.

`Harness.kt` supplies Compose host types at density 1, Alignment bias arithmetic,
Color role labels, rounded Shape holders, MaterialTheme and caches. The only state
syntax substitution replaces mutableStateOf delegation of transformOrigin with
a plain property. Compose drawing/remember calls are outside the extracted shape
state projection. The corner constructors and selection branches are unchanged.

Menu scale/alpha, group/item corner and selected-leading width/alpha channels use
the separately compiled spring oracle. IntSize output rounds to integer pixels;
interruption starts at the converted integer value and retains Float velocity.
The explicit MotionScheme spring has no supplied visibility threshold, so its
vectorization uses FloatSpringSpec's 0.01 default; the IntSize default spring and
non-spring interruption fallback have different defaults.

These fixtures do not execute Android Surface, text measurement, Window/Popup,
semantics or graphics layers. The browser suite checks the web adaptation's real
geometry and interaction; it does not establish identical font baselines,
platform constraint resolution, Android shadow/ripple rasterization, arbitrary
Compose Shape types, precision-pointer flag behavior or every public modifier.
