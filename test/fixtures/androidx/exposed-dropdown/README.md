# Exposed dropdown source and independent geometry

ExposedDropdownMenu.kt is unchanged Apache-2.0 AndroidX source at the revision
and SHA recorded in sources.json. Shared Menu.kt/MenuPosition.kt sources are
SHA-verified through ../menus/sources.json. See
../../../../tools/androidx-exposed-dropdown/README.md for extraction, host and
native execution boundaries.

The source composes TextField/OutlinedTextField with DropdownMenuContent,
retains editable-anchor focus, matches anchor width, constrains popup height
to the larger available side, and supplies16dp horizontal item content padding.
The web wrapper uses shared field/action/menu primitives. Its listbox/option
roles and active-descendant navigation follow the web combobox adapter at
https://www.w3.org/WAI/ARIA/apg/patterns/combobox/; Tab leaves the web combobox.
That is an explicit platform adaptation: current Android preview-key handling
can switch the popup to focusable on Tab or directional navigation.

Original native provider/max-height methods are executed for saved geometry
records. Complete field color/notch/label/measure/draw parity, native Popup/window
and keyboard handling, recomposition, input scheduling, text metrics and raster
equivalence remain separate work.
