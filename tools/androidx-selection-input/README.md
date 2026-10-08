# Material3 selection keyboard adaptation

Pinned revision: `a095da93f8e98dea8748ceed79ea8427aade245f`.
Unchanged licensed `Toggleable.kt` and `Selectable.kt` live under
`test/fixtures/androidx/selection-input`; their URLs and byte hashes are recorded
in sources.json. Refresh explicitly with `node tools/androidx-selection-input/fetch-sources.mjs`.

Material3 Switch chooses Foundation.toggleable, Checkbox chooses
triStateToggleable and RadioButton chooses selectable. Their three node classes
inherit ClickableNode and do not override its key handler. Source hashes and
this inheritance are checked by `test/unit/selection-keyboard.test.mjs`, which
also runs the independently executed original ClickableNode/base key, focus,
dispose and updateCommon oracle documented in `tools/androidx-button/README.md`.
These selection classes and complete Material3 composition are not recompiled
by this additional source check; native scheduling/focus/input trees remain open.

Actual md-switch, md-checkbox and md-radio-button opt into the shared per-key
press model. Enter, numpad Enter and Space activate on owned key-up, with repeat
suppression, independent keys/pointer/ink and cancel on focus loss or disable.
The component calls the returned binding.refresh() on each synchronous enabled
update, matching original updateCommon even for disable/re-enable in one task
before MutationObserver delivery. Disposed bindings ignore refresh.
Checkbox updates retain the owned pressed class instead of replacing root's
className. Roving radio arrows keep their existing web focus adapter.

Seven off/on/mixed profiles match 700 original normalized web-key/lifecycle
histories and 2,170 actual pressed/click/state/event records. Trusted browser
Enter/numpad/Space, repeats, held-key value updates, atomic disable/re-enable,
multiple owners, focus loss, pointer retention, ink retirement, reconnect and
roving radio focus are checked separately. Native D-pad has no direct web map.
Already-routed synthetic records do not establish full native DOM/input-tree
identity; browser disabling can remove focus, and enabling requires a new focus
before a fresh trusted keyboard gesture.

Run `node scripts/test-selection.mjs --source --keyboard`,
`node scripts/test-selection.mjs --source`, or `npm run test:selection`.
The complete units and broad parity gate also include these checks. Existing
selection colour, motion and form checks remain separate from key ownership.
