/**
 * Material Design 3 Expressive (M3 Expressive) Web Library
 * TypeScript Definitions
 */

export interface SpringSolveParams {
  from: number;
  to: number;
  velocity?: number;
  dampingRatio?: number;
  stiffness?: number;
  mass?: number;
  time: number;
}

export interface SpringKeyframesParams {
  from: number;
  to: number;
  velocity?: number;
  preset?: string;
  dampingRatio?: number;
  stiffness?: number;
  mass?: number;
  fps?: number;
}

export interface SpringState {
  position: number;
  velocity: number;
}

export class SpringPhysics {
  static SCHEMES: Record<string, Record<string, { dampingRatio: number; stiffness: number; mass: number }>>;
  static PRESETS: Record<string, { dampingRatio: number; stiffness: number; mass: number }>;
  static setScheme(schemeName: string): void;
  static getScheme(element?: Element | null): string;
  static getPreset(name: string, element?: Element | null): { dampingRatio: number; stiffness: number; mass: number };
  static solve(params: SpringSolveParams): SpringState;
  static generateKeyframes(params: SpringKeyframesParams): { keyframes: number[]; duration: number };
  static animateProperty(element: HTMLElement, property: string, from: number, to: number, presetName?: string): Animation | undefined;
}

// ---------------------------------------------------------------------------
// Base Web Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export interface ButtonElevationDefinition {
  readonly defaultElevation: number;
  readonly pressedElevation: number;
  readonly focusedElevation: number;
  readonly hoveredElevation: number;
  readonly disabledElevation: number;
}

export class MdButton extends HTMLElement {
  static formAssociated: boolean;
  readonly variant: 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
  readonly size: 'xs' | 's' | 'm' | 'l' | 'xl';
  readonly shape: 'round' | 'square';
  readonly labelText: string;
  readonly icon: string;
  readonly trailingIcon: string;
  readonly toggle: boolean;
  selected: boolean;
  disabled: boolean;
  readonly type: 'button' | 'submit' | 'reset';
  readonly form: HTMLFormElement | null | undefined;
  /** Renders a link-role button; activation follows the URL. A cancelable 'navigate' event fires first. */
  href: string;
  target: string;
  /** Position in a connected button group; set by md-button-group. */
  connected: '' | 'leading' | 'middle' | 'trailing';
  /** Five numeric dp/CSS-pixel targets; null removes elevation, undefined restores variant defaults. */
  elevation: ButtonElevationDefinition | null | undefined;
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
  formDisabledCallback(disabled: boolean): void;
}

export class MdSplitButton extends HTMLElement {
  /** filled (default), tonal, elevated or outlined: ButtonDefaults colors and elevation. */
  variant: 'filled' | 'tonal' | 'elevated' | 'outlined';
  /** SplitButton sizes (ContainerHeight 32/40/56/96/136dp); default s. */
  size: 'xs' | 's' | 'm' | 'l' | 'xl';
  label: string;
  /** Leading icon (Material Symbols name); an empty attribute leaves it out. */
  icon: string;
  /** Accessible name of the trailing button and its menu. */
  menuLabel: string;
  /** The trailing button's checked state: the menu is open. */
  open: boolean;
  /** Space between the buttons in px (BetweenSpace 2dp). */
  spacing: number;
  disabled: boolean;
  readonly menu: HTMLElement | null;
  openMenu(): void;
  close(): void;
  toggle(): void;
}

export class MdIconButton extends HTMLElement {
  variant: 'standard' | 'filled' | 'tonal' | 'outlined';
  readonly size: 'xs' | 's' | 'm' | 'l' | 'xl';
  icon: string;
  selectedIcon: string;
  toggle: boolean;
  selected: boolean;
  disabled: boolean;
  href: string;
  target: string;
}

/** AndroidX ButtonGroup: standard (press-to-expand) or connected (segmented shapes). */
export class MdButtonGroup extends HTMLElement {
  variant: 'standard' | 'connected';
  /** Toggle behavior applied to md-button / md-icon-button children. */
  selection: 'none' | 'single' | 'multiple';
  /** ButtonGroupDefaults.ExpandedRatio, 0.15 by default. */
  expandedRatio: number;
}

export class MdFab extends HTMLElement {
  variant: 'surface' | 'primary' | 'secondary' | 'tertiary' | 'extended';
  color: 'primary' | 'secondary' | 'tertiary' | 'primary-container' | 'secondary-container' | 'tertiary-container' | 'surface';
  /** Ordinary default: baseline (56px). Extended small also remains 56px when collapsed. */
  size: 'small' | 'baseline' | 'medium' | 'large';
  icon: string;
  label: string;
  containerColor: string;
  contentColor: string;
  expanded: boolean;
  readonly isExtended: boolean;
  lowered: boolean;
  /** bottom-app-bar uses AndroidX's zero elevation in every interaction state. */
  elevation: 'default' | 'bottom-app-bar';
}

export interface CardElevation {
  defaultElevation?: number;
  pressedElevation?: number;
  focusedElevation?: number;
  hoveredElevation?: number;
  disabledElevation?: number;
  draggedElevation?: number;
}
/** Four explicit AndroidX CardColors constructor colors; CSS colors may use theme variables. */
export interface CardColors {
  containerColor: string;
  contentColor: string;
  disabledContainerColor: string;
  disabledContentColor: string;
}
export class MdCard extends HTMLElement {
  variant: 'elevated' | 'filled' | 'outlined';
  interactive: boolean;
  /** Applies to the clickable overload; static Cards use enabled colors. */
  disabled: boolean;
  href: string;
  /** Partial default-factory overrides; undefined restores variant defaults. */
  elevation: Readonly<CardElevation> | undefined;
  colors: Readonly<CardColors> | undefined;
}

export class MdChip extends HTMLElement {
  /** action is a compatibility alias for assist. */
  variant: 'assist' | 'filter' | 'input' | 'suggestion' | 'action';
  elevated: boolean;
  label: string;
  icon: string;
  trailingIcon: string;
  /** True by default; Filter/Input use the native Expressive shape overload. */
  expressive: boolean;
  horizontalArrangement: 'compact' | 'start' | 'end' | 'center' | 'space-between';
  /** Enabled-state overrides; disabled states retain the original defaults. */
  containerColor: string;
  contentColor: string;
  leadingIconColor: string;
  trailingIconColor: string;
  selected: boolean;
  disabled: boolean;
  /** Input defaults to true; removable="false" disables the web removal adapter. */
  removable: boolean;
}

export class MdSlider extends HTMLElement {
  value: number;
  min: number;
  max: number;
  /** Native interior steps; step adapts evenly spaced HTML increments. */
  step: number;
  steps: number;
  valueRange: [number, number] | string;
  range: boolean;
  rangeStart: number;
  rangeEnd: number;
  centered: boolean;
  orientation: 'horizontal' | 'vertical';
  /** Defaults to true. */
  topToBottom: boolean;
  labeled: boolean;
  stops: boolean;
  disabled: boolean;
  name: string;
  /** @deprecated Compatibility attribute; all default tracks are 16dp. */
  size: string;
  /** SliderDefaults.Track height in CSS pixels (`track-height`); 16. */
  trackHeight: number;
  /**
   * SliderDefaults.Track trackCornerSize (`track-corner-size`); null is half the
   * track height. Setting it also shrinks the corners near the ends, as the
   * source overload that takes it does.
   */
  trackCornerSize: number | null;
  /** trackInsideCornerSize (`track-inside-corner-size`); 2. */
  trackInsideCornerSize: number;
  /** thumbTrackGapSize (`thumb-track-gap`); 6. */
  thumbTrackGapSize: number;
  /** drawStopIndicator; false (`stop-indicator="false"`) draws none. */
  stopIndicator: boolean;
  /** SliderDefaults.Thumb size along the track (`thumb-width`); 4. */
  thumbWidth: number;
  /** SliderDefaults.Thumb size across the track (`thumb-height`); 44. */
  thumbHeight: number;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeListOf<HTMLLabelElement>;
  readonly type: 'range';
}

export class MdSwitch extends HTMLElement {
  checked: boolean;
  disabled: boolean;
  icon: string;
  name: string;
  value: string;
  required: boolean;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeListOf<HTMLLabelElement>;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  readonly type: 'checkbox';
}

export class MdTextField extends HTMLElement {
  floatLabel: 'auto' | 'always';
  variant: 'filled' | 'outlined';
  type: string;
  label: string;
  value: string;
  placeholder: string;
  prefixText: string;
  suffixText: string;
  supportingText: string;
  errorText: string;
  leadingIcon: string;
  trailingIcon: string;
  error: boolean;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  maxLength: number | null;
  maxlength: number | null;
  pattern: string;
  minLength: number;
  min: string;
  max: string;
  step: string;
  labelPosition: string;
  singleLine: boolean;
  minLines: number;
  maxLines: number | null;
  expandedLabelAlignment: 'start' | 'center' | 'end';
  minimizedLabelAlignment: 'start' | 'center' | 'end';
  readonly form: HTMLFormElement | null;
  readonly validity: ValidityState | undefined;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  formResetCallback(): void;
  formStateRestoreCallback(state: string): void;
  formDisabledCallback(disabled: boolean): void;
}

export interface AutocompleteOption { label?: string; value?: string; disabled?: boolean; }
export class MdOption extends HTMLElement {
  value: string; selected: boolean; defaultSelected: boolean; disabled: boolean;
  readonly displayText: string;
}
export class MdSelect extends MdTextField {
  open: boolean; multiple: boolean; hideRequiredMarker: boolean; floatLabel: 'auto' | 'always';
  readonly form: HTMLFormElement | null;
  readonly validity: ValidityState | undefined; readonly validationMessage: string; readonly willValidate: boolean;
  checkValidity(): boolean; reportValidity(): boolean; setCustomValidity(message: string): void;
  formResetCallback(): void; formStateRestoreCallback(state: string): void; formDisabledCallback(disabled: boolean): void;
}
export class MdAutocomplete extends MdTextField {
  open: boolean;
  options: Array<string | AutocompleteOption>;
  formResetCallback(): void;
  formStateRestoreCallback(state: string): void;
}

export class MdExpansionPanel extends HTMLElement {
  open: boolean; headline: string; supportingText: string; disabled: boolean;
  headingLevel: number;
  toggle(): void;
}
export class MdAccordion extends HTMLElement {}
/** Web workflow composed from Material controls; not a native MD3E Stepper. */
export class MdStep extends HTMLElement {
  label: string; description: string; active: boolean; completed: boolean; disabled: boolean; error: boolean;
}
export class MdStepPanel extends MdStep {}
export class MdStepper extends HTMLElement {
  activeStep: number; orientation: 'horizontal' | 'vertical'; linear: boolean; disabled: boolean;
  getSteps(): MdStep[];
  next(): void; prev(): void; previous(): void; goTo(index: number): void; reset(): void;
}

export class MdCheckbox extends HTMLElement {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  error: boolean;
  checkmarkStroke: number;
  outlineStroke: number;
  name: string;
  value: string;
  required: boolean;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeListOf<HTMLLabelElement>;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  readonly type: 'checkbox';
}

export class MdRadioButton extends HTMLElement {
  checked: boolean;
  selected: boolean;
  disabled: boolean;
  name: string;
  value: string;
  required: boolean;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeListOf<HTMLLabelElement>;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  readonly type: 'radio';
}

export class MdProgressIndicator extends HTMLElement {
  type: 'linear' | 'circular';
  variant: 'standard' | 'wavy';
  value: number | null;
  progress: number | null;
  max: number;
  indeterminate: boolean;
  strokeWidth: number;
  trackStrokeWidth: number;
  strokeCap: 'round' | 'butt' | 'square';
  trackStrokeCap: 'round' | 'butt' | 'square';
  gapSize: number;
  stopSize: number;
  amplitude: number | null;
  wavelength: number;
  waveSpeed: number;
  color: string;
  trackColor: string;
}

export class MdLoadingIndicator extends HTMLElement {
  variant: 'standalone' | 'contained';
  size: string | number;
  progress: number | null;
  indeterminate: boolean;
  color: string;
  containerColor: string;
}

export class MdBottomSheet extends HTMLElement {
  open: boolean;
  modal: boolean;
  /** SheetState value the sheet last settled at. */
  readonly currentValue: 'hidden' | 'partial' | 'expanded';
  /** Value a running animation or drag is heading to. */
  readonly targetValue: 'hidden' | 'partial' | 'expanded';
  headline: string;
  sheetMaxWidth: string;
  sheetGesturesEnabled: boolean;
  containerColor: string;
  contentColor: string;
  scrimColor: string;
  show(): void;
  expand(): void;
  partialExpand(): void;
  /** Hides the sheet, then dismisses it. */
  close(): void;
  hide(): void;
  toggle(): void;
}

export type SnackbarDuration = 'short' | 'long' | 'indefinite';
export type SnackbarResult = 'action-performed' | 'dismissed';
export interface SnackbarVisuals {
  readonly message: string;
  readonly actionLabel?: string | null;
  readonly withDismissAction?: boolean;
  readonly duration?: SnackbarDuration;
}
export interface SnackbarData {
  readonly visuals: Readonly<SnackbarVisuals>;
  performAction(): void;
  dismiss(): void;
}
export interface SnackbarRequestOptions { signal?: AbortSignal; }
export class SnackbarHostState {
  readonly currentSnackbarData: SnackbarData | null;
  subscribe(listener: (data: SnackbarData | null) => void): () => void;
  showSnackbar(visuals: SnackbarVisuals, options?: SnackbarRequestOptions): Promise<SnackbarResult>;
  showSnackbar(message: string, actionLabel?: string | null, withDismissAction?: boolean, duration?: SnackbarDuration, options?: SnackbarRequestOptions): Promise<SnackbarResult>;
}
export class MdSnackbar extends HTMLElement {
  open: boolean;
  get message(): string;
  set message(value: string | null | undefined);
  get actionLabel(): string | null;
  set actionLabel(value: string | null | undefined);
  get duration(): SnackbarDuration;
  set duration(value: SnackbarDuration | null | undefined);
  /** HTML timeout override; zero means indefinite. Null removes the override. */
  get timeout(): number;
  set timeout(value: number | null | undefined);
  withDismissAction: boolean;
  actionOnNewLine: boolean;
  twoLine: boolean;
  get containerColor(): string;
  set containerColor(value: string | null | undefined);
  get contentColor(): string;
  set contentColor(value: string | null | undefined);
  get actionContentColor(): string;
  set actionContentColor(value: string | null | undefined);
  get actionColor(): string;
  set actionColor(value: string | null | undefined);
  get dismissLabel(): string;
  set dismissLabel(value: string | null | undefined);
  get shape(): ToolbarShape | null;
  set shape(value: ToolbarShape | string | null | undefined);
  get dismissActionContentColor(): string;
  set dismissActionContentColor(value: string | null | undefined);
  get hostState(): SnackbarHostState;
  set hostState(value: SnackbarHostState | null | undefined);
  recommendedTimeoutMillis?: (original: number, flags: {containsIcons: true; containsText: true; containsControls: boolean}) => number;
  show(message?: string, actionLabel?: string | null, duration?: SnackbarDuration | number): void;
  showSnackbar(visuals: SnackbarVisuals, options?: SnackbarRequestOptions): Promise<SnackbarResult>;
  showSnackbar(message: string, actionLabel?: string | null, withDismissAction?: boolean, duration?: SnackbarDuration, options?: SnackbarRequestOptions): Promise<SnackbarResult>;
  close(reason?: string): void;
}

export class MdTooltip extends HTMLElement {
  variant: 'plain' | 'rich';
  get text(): string;
  set text(value: string | null | undefined);
  get headline(): string | null;
  set headline(value: string | null | undefined);
  placement: TooltipPlacement;
  position: TooltipPlacement;
  open: boolean;
  caret: boolean;
  focusable: boolean;
  /** Web host supplies touch exploration / switch access state; requires hasAction. */
  forceFocusableForA11y: boolean;
  onDismissRequest?: (() => void) | null;
  enableUserInput: boolean;
  hasAction: boolean;
  isPersistent: boolean;
  get maxWidth(): string;
  set maxWidth(value: number | string | null | undefined);
  get containerColor(): string;
  set containerColor(value: string | null | undefined);
  get contentColor(): string;
  set contentColor(value: string | null | undefined);
  get titleContentColor(): string;
  set titleContentColor(value: string | null | undefined);
  get actionContentColor(): string;
  set actionContentColor(value: string | null | undefined);
  get shape(): ToolbarShape | null;
  set shape(value: ToolbarShape | string | null | undefined);
  get target(): HTMLElement | null;
  set target(value: HTMLElement | null | undefined);
  get state(): TooltipState;
  set state(value: TooltipState | null | undefined);
  longPressTimeoutMillis?: number;
  show(priority?: TooltipPriority, options?: {signal?: AbortSignal}): Promise<void>;
  dismiss(): void;
}
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end' | 'above' | 'below';
export type TooltipPriority = 'default' | 'user-input' | 'prevent-user-input';
export class TooltipMutatorMutex { constructor(); }
export class TooltipState {
  constructor(options?: {initialIsVisible?: boolean; isPersistent?: boolean; mutatorMutex?: TooltipMutatorMutex});
  readonly isPersistent: boolean;
  readonly isVisible: boolean;
  readonly transition: {readonly currentState: boolean; targetState: boolean; readonly isIdle: boolean};
  subscribe(listener: (state: TooltipState) => void): () => void;
  completeTransition(value?: boolean): void;
  show(priority?: TooltipPriority, options?: {signal?: AbortSignal}): Promise<void>;
  dismiss(): void;
  onDispose(): void;
}

export class MdBadge extends HTMLElement {
  /** Badge content; empty draws the 6dp dot. */
  label: string;
  /** Larger numeric labels show as "max+" (default 99). */
  max: number;
  containerColor: string;
  contentColor: string;
}

export class MdTopAppBar extends HTMLElement {
  scrollBehavior: TopAppBarScrollBehavior | null;
  scrollTarget: HTMLElement | Window | null;
  readonly scrollState: TopAppBarState | null;
  preScroll(available?: ToolbarScrollDelta): ToolbarScrollDelta;
  postScroll(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): ToolbarScrollDelta;
  postFling(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): Promise<ToolbarScrollDelta>;
  get variant(): 'center-aligned' | 'small' | 'medium' | 'large' | 'medium-flexible' | 'large-flexible';
  set variant(value: 'center-aligned' | 'small' | 'medium' | 'large' | 'medium-flexible' | 'large-flexible' | null | undefined);
  get headline(): string;
  set headline(value: string | null | undefined);
  get subtitle(): string;
  set subtitle(value: string | null | undefined);
  scrolled: boolean;
  readonly twoRows: boolean;
  get expandedHeight(): number;
  set expandedHeight(value: number | null | undefined);
  get collapsedHeight(): number;
  set collapsedHeight(value: number | null | undefined);
  get heightOffset(): number;
  set heightOffset(value: number | null | undefined);
  readonly heightOffsetLimit: number;
  readonly collapsedFraction: number;
  get overlappedFraction(): number;
  set overlappedFraction(value: number | null | undefined);
  get titleHorizontalAlignment(): 'start' | 'center' | 'end';
  set titleHorizontalAlignment(value: 'start' | 'center' | 'end' | null | undefined);
  get contentPadding(): {start: number; top: number; end: number; bottom: number} | {left: number; top: number; right: number; bottom: number};
  set contentPadding(value: number | string | {start?: number; top?: number; end?: number; bottom?: number} | {left?: number; top?: number; right?: number; bottom?: number} | null | undefined);
  get containerColor(): string;
  set containerColor(value: string | null | undefined);
  get scrolledContainerColor(): string;
  set scrolledContainerColor(value: string | null | undefined);
  get contentColor(): string;
  set contentColor(value: string | null | undefined);
  get navigationIconContentColor(): string;
  set navigationIconContentColor(value: string | null | undefined);
  get titleContentColor(): string;
  set titleContentColor(value: string | null | undefined);
  get actionIconContentColor(): string;
  set actionIconContentColor(value: string | null | undefined);
  get subtitleContentColor(): string;
  set subtitleContentColor(value: string | null | undefined);
}

export class MdBottomAppBar extends HTMLElement {
  scrollBehavior: BottomAppBarScrollBehavior | null;
  scrollTarget: HTMLElement | Window | null;
  readonly scrollState: BottomAppBarState | null;
  heightOffset: number;
  readonly heightOffsetLimit: number; readonly collapsedFraction: number;
  /** Host adapter for Android touch-exploration state; disables scrolling/drag. */
  touchExplorationEnabled: boolean;
  preScroll(available?: ToolbarScrollDelta): ToolbarScrollDelta;
  postScroll(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): ToolbarScrollDelta;
  postFling(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): Promise<ToolbarScrollDelta>;
  variant: 'standard' | 'flexible';
  containerColor: string;
  contentColor: string;
  horizontalArrangement: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'fixed';
  /** Standard: 80px. Flexible defaults to 64px; invalid heights use that default. */
  get expandedHeight(): number;
  set expandedHeight(value: number | null | undefined);
  /** Standard Surface tonal elevation, 0dp by default; flexible uses source 0dp. */
  get tonalElevation(): number;
  set tonalElevation(value: number | null | undefined);
  get contentPadding(): ToolbarContentPadding;
  set contentPadding(value: ToolbarContentPadding | null | undefined);
}

export interface NavigationBarItem {
  icon?: string;
  selectedIcon?: string;
  label?: string | null;
  ariaLabel?: string;
  iconPosition?: 'top' | 'start';
  disabled?: boolean;
  enabled?: boolean;
}
export class MdNavigationBar extends HTMLElement {
  items: NavigationBarItem[];
  selected: number;
  iconPosition: 'top' | 'start';
  arrangement: 'equal-weight' | 'centered';
  disabled: boolean;
  enabled: boolean;
  containerColor: string;
  contentColor: string;
  /** Compatibility height override; default ShortNavigationBar is64px. */
  tall: boolean;
  /** Legacy attribute; Top items remain on a horizontal bar. */
  vertical: boolean;
  /** Supplied labels are always visible, including inactive items. */
  alwaysShowLabel: boolean;
}

export interface NavigationDrawerItem {
  /** A section headline (Title Small) instead of a destination. */
  section?: string;
  /** A divider instead of a destination. */
  divider?: boolean;
  /** Reported in the change event detail. */
  value?: string;
  icon?: string;
  selectedIcon?: string;
  label?: string | null;
  ariaLabel?: string;
  badge?: string | number | null;
  /** Web extensions; public AndroidX NavigationDrawerItem has no enabled argument. */
  disabled?: boolean;
  enabled?: boolean;
}
export class MdNavigationDrawer extends HTMLElement {
  items: NavigationDrawerItem[];
  selected: number;
  variant: 'standard' | 'modal' | 'dismissible';
  modal: boolean;
  open: boolean;
  /** DrawerState.snapTo: open or close at once, without the sheet motion. */
  snapTo(value: 'open' | 'closed' | boolean): void;
  headline: string;
  /** Web extension: public NavigationDrawerItem does not expose enabled. */
  disabled: boolean;
  enabled: boolean;
  gesturesEnabled: boolean;
  scrimColor: string;
  drawerContainerColor: string;
  drawerContentColor: string;
  show(): void;
  close(): void;
}

export class MdNavigationRail extends HTMLElement {
  items: NavigationBarItem[];
  selected: number;
  expanded: boolean;
  /** ModalWideNavigationRail: expanding opens the rail in a modal dialog over a scrim. */
  modal: boolean;
  /** With modal: no rail in the layout while collapsed; the expanded rail slides in. */
  hideOnCollapse: boolean;
  /** Drag gestures on a hide-on-collapse rail (default true). */
  gesturesEnabled: boolean;
  expand(): void;
  collapse(): void;
  toggle(): void;
  /** Compatibility width override; public WideNavigationRail defaults to96px. */
  narrow: boolean;
  /** Explicit legacy icon placement; omit to follow expanded. */
  itemLayout: 'vertical' | 'horizontal';
  /** Omit to place icons above labels when collapsed, beside them when expanded. */
  iconPosition: 'top' | 'start' | null;
  arrangement: 'top' | 'center' | 'bottom';
  disabled: boolean;
  enabled: boolean;
  containerColor: string;
  contentColor: string;
  alwaysShowLabel: boolean;
}

export class MdSegmentedButton extends HTMLElement {
  /** Items: JSON array of labels or {label, icon, disabled} objects, or comma-separated labels. */
  items: string;
  /** SingleChoiceSegmentedButtonRow selection (default 0). */
  selectedIndex: number;
  /** MultiChoiceSegmentedButtonRow selection. */
  selectedIndices: number[];
  multiSelect: boolean;
  disabled: boolean;
  /** Overlap between neighbouring items in px (spacedBy(-space)); default BorderWidth, 1. */
  space: number;
}

export class MdDialog extends HTMLElement {
  open: boolean;
  headline: string;
  supportingText: string;
  icon: string;
  confirmLabel: string;
  cancelLabel: string;
  containerColor: string;
  iconContentColor: string;
  titleContentColor: string;
  textContentColor: string;
  tonalElevation: number;
  show(): void;
  close(reason?: string): void;
}

/** Web pagination composed from shared Material buttons and dropdown menu. */
export class MdPaginator extends HTMLElement {
  length: number;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  hidePageSize: boolean;
  showFirstLastButtons: boolean;
  readonly totalPages: number;
  nextPage(): void;
  previousPage(): void;
  firstPage(): void;
  lastPage(): void;
}

export interface PaginatorPageDetail {
  pageIndex: number;
  previousPageIndex: number;
  pageSize: number;
  length: number;
}

export class MdDivider extends HTMLElement {
  /** true or "start": 16dp start inset; "middle": 16dp at both ends (M3 divider specs). */
  inset: boolean;
  vertical: boolean;
  /**
   * Thickness in dp (DividerDefaults.Thickness 1dp). 0 (the attribute also
   * accepts "hairline") is Dp.Hairline: no layout size, one device pixel drawn.
   */
  thickness: number;
  color: string;
}

export class MdCarousel extends HTMLElement {
  /**
   * HorizontalMultiBrowseCarousel (default), HorizontalUncontainedCarousel,
   * HorizontalCenteredHeroCarousel, or 'multi-aspect': a LazyRow of items at
   * their own widths with Modifier.carouselParallaxScrollEffect. Child
   * elements are the items.
   */
  layout: 'multi-browse' | 'uncontained' | 'hero' | 'multi-aspect';
  /** Large item size for multi-browse and hero, in dp. */
  preferredItemWidth: number;
  /** Item size for uncontained, in dp. */
  itemWidth: number;
  itemSpacing: number;
  minSmallItemWidth: number;
  maxSmallItemWidth: number;
  /** Start and end content padding, in dp. */
  contentPadding: number;
  userScrollEnabled: boolean;
  /**
   * The item closest to its resting position (CarouselState.currentItem); for
   * multi-aspect, the list's firstVisibleItemIndex.
   */
  readonly currentItem: number;
  activeIndex: number;
  scrollToItem(index: number): void;
  animateScrollToItem(index: number): void;
}

export class MdDatePicker extends HTMLElement {
  value: string;
  open: boolean;
  inline: boolean;
  variant: 'docked' | 'modal' | 'range' | 'modal-input';
  range: boolean;
  startDate: string;
  endDate: string;
  showModeToggle: boolean;
  dateFormatter: string;
  /**
   * CalendarLocale: the `locale` attribute, else the nearest `lang`, else the
   * browser's language. Sets weekday order, names, headlines and the date
   * input pattern; `value`, `startDate` and `endDate` stay MM/DD/YYYY or ISO.
   */
  locale: string;
  /**
   * DatePickerState.yearRange as [first, last] (`year-range="1900..2100"`,
   * DatePickerDefaults.YearRange): bounds the months, years, arrows and input;
   * a value outside it is no selection.
   */
  yearRange: [number, number];
  /**
   * SelectableDates: a day is enabled when isSelectableYear(year) and
   * isSelectableDate(the day's UTC midnight, in milliseconds) allow it.
   */
  selectableDates: { isSelectableDate?(utcTimeMillis: number): boolean; isSelectableYear?(year: number): boolean } | null;
  show(): void;
  close(): void;
}

export class MdTimePicker extends HTMLElement {
  value: string;
  open: boolean;
  inline: boolean;
  hour: number;
  minute: number;
  /** Native raw canonical input; may be invalid while hour/minute retain the last valid time. */
  readonly hourInput: number;
  readonly minuteInput: number;
  readonly isInputValid: boolean;
  /** Explicit browser host setting; suppresses automatic hour-input advancement. */
  accessibilityServicesEnabled: boolean;
  is24Hour: boolean;
  richColors: boolean;
  layoutType: 'vertical' | 'horizontal';
  mode: 'dial' | 'input';
  show(): void;
  close(): void;
}

export interface ListItemColorsOptions {
  containerColor?: string;
  contentColor?: string;
  leadingContentColor?: string;
  trailingContentColor?: string;
  overlineContentColor?: string;
  supportingContentColor?: string;
  disabledContainerColor?: string;
  disabledContentColor?: string;
  disabledLeadingContentColor?: string;
  disabledTrailingContentColor?: string;
  disabledOverlineContentColor?: string;
  disabledSupportingContentColor?: string;
  selectedContainerColor?: string;
  selectedContentColor?: string;
  selectedLeadingContentColor?: string;
  selectedTrailingContentColor?: string;
  selectedOverlineContentColor?: string;
  selectedSupportingContentColor?: string;
  draggedContainerColor?: string;
  draggedContentColor?: string;
  draggedLeadingContentColor?: string;
  draggedTrailingContentColor?: string;
  draggedOverlineContentColor?: string;
  draggedSupportingContentColor?: string;
}

export type ListItemCornerSize = number | [number, number, number, number];
export interface ListItemShapesOptions {
  shape?: ListItemCornerSize;
  selectedShape?: ListItemCornerSize;
  pressedShape?: ListItemCornerSize;
  focusedShape?: ListItemCornerSize;
  hoveredShape?: ListItemCornerSize;
  draggedShape?: ListItemCornerSize;
}
export class MdList extends HTMLElement {
  variant: 'standard' | 'segmented';
  selectionMode: 'none' | 'single' | 'multiple';
}
export class MdListItem extends HTMLElement {
  variant: 'standard' | 'segmented';
  selectionMode: 'none' | 'single' | 'multiple';
  /**
   * combinedClickable's onLongClick: a press held 400ms (or a context menu
   * request) dispatches `long-click`, and that press does not click.
   */
  longClick: boolean;
  /** onLongClickLabel; it describes the item. */
  longClickLabel: string;

  headline: string;
  supportingText: string;
  overline: string;
  trailingText: string;
  icon: string;
  trailingIcon: string;
  avatar: string;
  image: string;
  selected: boolean;
  checked: boolean;
  interactive: boolean;
  enabled: boolean;
  disabled: boolean;
  dragged: boolean;
  href: string;
  shape: string;
  verticalAlignment: 'auto' | 'top' | 'center' | 'bottom';
  colors: ListItemColorsOptions;
  shapes: ListItemShapesOptions;
}

export type MenuVariant = 'standard' | 'vibrant' | 'dropdown';
export type MenuSelectionMode = 'none' | 'single' | 'multiple';
export type MenuCornerShape = number | [number, number, number, number];
export interface MenuItemData {
  label?: string; headline?: string; value?: string; icon?: string; leadingIcon?: string;
  trailing?: string; trailingText?: string; supportingText?: string;
  selectedIcon?: string; checkedIcon?: string; disabled?: boolean;
  selected?: boolean; checked?: boolean; selectionMode?: MenuSelectionMode;
}
export interface MenuItemColorsOptions {
  textColor?: string; leadingIconColor?: string; trailingContentColor?: string;
  trailingIconColor?: string; containerColor?: string;
  selectedTextColor?: string; selectedLeadingIconColor?: string;
  selectedTrailingContentColor?: string; selectedTrailingIconColor?: string; selectedContainerColor?: string;
  disabledTextColor?: string; disabledLeadingIconColor?: string;
  disabledTrailingContentColor?: string; disabledTrailingIconColor?: string; disabledContainerColor?: string;
}
export class MdMenu extends HTMLElement {
  open: boolean; expanded: boolean; enabled: boolean; disabled: boolean; checked: boolean;
  label: string; variant: MenuVariant; items: MenuItemData[]; selectionMode: MenuSelectionMode;
  offsetX: number; offsetY: number; containerColor: string;
  anchorPosition: 'above' | 'below' | 'start' | 'end' | 'left' | 'right';
  horizontalArrangement: 'menu' | 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  show(options?: {focus?: boolean}): void;
  popupRole: 'menu' | 'listbox'; focusMode: 'menu' | 'anchor';
  matchAnchorWidth: boolean; anchorElement: Element | null;
  activeItem: MdMenuItem | null;
  close(options?: {restoreFocus?: boolean}): void; toggle(): void;
}
export class MdMenuGroup extends HTMLElement {
  label: string; variant: MenuVariant; containerColor: string; selectionMode: MenuSelectionMode;
  shapes: {shape?: MenuCornerShape; inactiveShape?: MenuCornerShape};
}
export class MdMenuItem extends HTMLElement {
  headline: string; label: string; value: string;
  icon: string; leadingIcon: string; trailingIcon: string; trailingText: string; supportingText: string;
  selectedIcon: string; checkedIcon: string; selected: boolean; checked: boolean;
  disabled: boolean; enabled: boolean; hasSubmenu: boolean;
  selectionMode: MenuSelectionMode; variant: MenuVariant; colors: MenuItemColorsOptions;
  shapes: {shape?: MenuCornerShape; selectedShape?: MenuCornerShape};
}

export interface SearchSuggestion { label: string; icon?: string; supportingText?: string; }
/** AndroidX Expressive SearchBar with ExpandedDocked(WithGap)/ExpandedFullScreen(Contained) layouts. */
export class MdSearchBar extends HTMLElement {
  placeholder: string;
  value: string;
  query: string;
  disabled: boolean;
  expanded: boolean;
  active: boolean;
  suggestions: Array<string | SearchSuggestion>;
  /** Presence selects ExpandedDockedSearchBarWithGap; 2dp by default. */
  dropdownGapSize: number;
  dropdownScrimColor: string;
  /** ExpandedFullScreenSearchBar instead of the docked layouts. */
  fullScreen: boolean;
  /** SearchBarState.progress (0 collapsed, 1 expanded). */
  readonly progress: number;
  /** With fullScreen: ExpandedFullScreenContainedSearchBar and rememberContainedSearchBarState. */
  contained: boolean;
}

/** AndroidX AppBarWithSearch: navigation icon, a slotted md-search-bar and actions. */
export class MdAppBarWithSearch extends HTMLElement {
  /** enterAlwaysSearchBarScrollBehavior when 'enter-always'. */
  scrollBehavior: 'enter-always' | null;
  /** The scroller whose content passes under the app bar. */
  scrollTarget: HTMLElement | Window | null;
  readonly scrollOffset: number;
  readonly scrollOffsetLimit: number;
  readonly contentOffset: number;
  readonly overlappedFraction: number;
}

export class MdSideSheet extends HTMLElement {
  open: boolean;
  /** 'modal' (default): a window with a scrim. 'standard': in the page, coplanar with the content beside it. */
  variant: 'modal' | 'standard';
  /** True unless variant is 'standard'. */
  readonly modal: boolean;
  headline: string;
  position: 'left' | 'right';
  gesturesEnabled: boolean;
  scrimColor: string;
  drawerContainerColor: string;
  drawerContentColor: string;
  show(): void;
  close(): void;
  toggle(): void;
}

export interface TabItemData {
  label?: string; icon?: string; accessibleLabel?: string; panel?: string;
  disabled?: boolean; enabled?: boolean; iconPosition?: 'top' | 'start';
  selectedContentColor?: string; unselectedContentColor?: string;
  /**
   * Wraps the icon in a BadgedBox: '' (or true) is a dot, other text the
   * badge's content. The badge stays inside the tab (badgeBounds); the content
   * joins the tab's accessible name.
   */
  badge?: string | number | boolean;
}
export class MdTabs extends HTMLElement {
  tabs: TabItemData[];
  selected: number; selectedIndex: number; selectedTabIndex: number; activeTab: number;
  variant: 'primary' | 'secondary'; iconPosition: 'top' | 'start';
  scrollable: boolean; minTabWidth: number; edgePadding: number;
  enabled: boolean; disabled: boolean;
  containerColor: string; contentColor: string; selectedContentColor: string; unselectedContentColor: string;
  /** Compatibility metadata only; the source has no pill Tab indicator. */
  pill: boolean;
}
/** Declarative data for its parent MdTabs. */
export class MdTab extends HTMLElement { label: string; icon: string; selected: boolean; disabled: boolean; }

export type ToolbarExitDirection = 'start' | 'end' | 'top' | 'bottom';
export interface ToolbarScrollDelta {x: number; y: number;}
export interface ToolbarSpringSpec {stiffness: number; dampingRatio: number; visibilityThreshold?: number;}
export class AndroidFlingDecay {
  constructor(options?: {density?: number; friction?: number});
  readonly density: number; readonly friction: number;
  info(velocity: number): {velocity: number; distance: number; duration: number};
  target(from: number, velocity: number): number;
  sample(time: number, from: number, velocity: number): {position: number; velocity: number};
}
export interface TopAppBarScrollOptions {
  kind?: 'pinned' | 'enter-always' | 'exit-until-collapsed' | 'legacy-enter-always';
  state?: TopAppBarState;
  canScroll?: () => boolean;
  isScrollingContentAtStart?: () => boolean;
  reverseLayout?: boolean;
  snapAnimationSpec?: ToolbarSpringSpec | null;
  flingAnimationSpec?: AndroidFlingDecay | null;
}
export class TopAppBarState {
  constructor(options?: {heightOffsetLimit?: number; heightOffset?: number; contentOffset?: number; isScrollingContentAtStart?: () => boolean});
  heightOffsetLimit: number; heightOffset: number; contentOffset: number;
  isScrollingContentAtStart: () => boolean;
  readonly collapsedFraction: number; readonly overlappedFraction: number;
  subscribe(listener: (state: TopAppBarState) => void): () => void;
  updateHeightOffsetLimit(height: number): void;
  save(): [number, number, number];
  static restore(values: readonly [number, number, number]): TopAppBarState;
}
export class TopAppBarScrollBehavior {
  constructor(options?: TopAppBarScrollOptions);
  readonly state: TopAppBarState; readonly kind: NonNullable<TopAppBarScrollOptions['kind']>;
  readonly isPinned: boolean; readonly nestedScrollConnection: TopAppBarScrollBehavior;
  canScroll: () => boolean; reverseLayout: boolean;
  snapAnimationSpec: ToolbarSpringSpec | null; flingAnimationSpec: AndroidFlingDecay | null;
  static pinned(options?: TopAppBarScrollOptions): TopAppBarScrollBehavior;
  static enterAlways(options?: TopAppBarScrollOptions): TopAppBarScrollBehavior;
  static exitUntilCollapsed(options?: TopAppBarScrollOptions): TopAppBarScrollBehavior;
  static legacyEnterAlways(options?: TopAppBarScrollOptions): TopAppBarScrollBehavior;
  onPreScroll(available: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostScroll(consumed: ToolbarScrollDelta, available?: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostFling(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): TopAppBarSettling;
  settle(velocity?: number): TopAppBarSettling;
}
export class TopAppBarSettling {
  constructor(state: TopAppBarState, velocity: number, options?: Pick<TopAppBarScrollOptions, 'snapAnimationSpec' | 'flingAnimationSpec'>);
  readonly done: boolean; readonly returnedVelocity: number;
  static complete(state: TopAppBarState): TopAppBarSettling;
  sampleFrame(now: number, afterOffsetWrite?: () => void): {phase: string; time: number; value: number; velocity: number; offset: number; canceled: boolean} | null;
  finish(): void;
}
export interface BottomAppBarScrollOptions {
  state?: BottomAppBarState; canScroll?: () => boolean; element?: Element | null;
  snapAnimationSpec?: ToolbarSpringSpec | null;
  flingAnimationSpec?: AndroidFlingDecay | null;
}
export class BottomAppBarState {
  constructor(options?: {heightOffsetLimit?: number; heightOffset?: number; contentOffset?: number});
  heightOffsetLimit: number; heightOffset: number; contentOffset: number;
  readonly collapsedFraction: number;
  subscribe(listener: (state: BottomAppBarState) => void): () => void;
  updateHeightOffsetLimit(height: number): void;
  save(): [number, number, number];
  static restore(values: readonly [number, number, number]): BottomAppBarState;
}
export interface BottomAppBarNestedScrollConnection {
  onPreScroll?(available: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostScroll(consumed: ToolbarScrollDelta, available?: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostFling(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): BottomAppBarSettling;
}
export class BottomAppBarScrollBehavior implements BottomAppBarNestedScrollConnection {
  constructor(options?: BottomAppBarScrollOptions);
  readonly state: BottomAppBarState; readonly isPinned: boolean;
  nestedScrollConnection: BottomAppBarNestedScrollConnection;
  canScroll: () => boolean;
  snapAnimationSpec: ToolbarSpringSpec | null; flingAnimationSpec: AndroidFlingDecay | null;
  setElement(element: Element): void;
  static exitAlways(options?: BottomAppBarScrollOptions): BottomAppBarScrollBehavior;
  onPreScroll(available?: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostScroll(consumed: ToolbarScrollDelta, available?: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostFling(consumed?: ToolbarScrollDelta, available?: ToolbarScrollDelta): BottomAppBarSettling;
  settle(velocity?: number): BottomAppBarSettling;
}
export class BottomAppBarSettling {
  constructor(state: BottomAppBarState, velocity: number, options?: Pick<BottomAppBarScrollOptions, 'snapAnimationSpec' | 'flingAnimationSpec' | 'element'>);
  readonly done: boolean; readonly returnedVelocity: number;
  static complete(state: BottomAppBarState): BottomAppBarSettling;
  sampleFrame(now: number, afterOffsetWrite?: () => void): {phase: string; time: number; value: number; velocity: number; offset: number; canceled: boolean} | null;
  finish(): void;
}
export class FloatingToolbarState {
  constructor(options?: {offsetLimit?: number; offset?: number; contentOffset?: number});
  offsetLimit: number; offset: number; contentOffset: number; readonly collapsedFraction: number;
  postScroll(consumedY: number): ToolbarScrollDelta;
  drag(delta: number, direction?: ToolbarExitDirection, rtl?: boolean): void;
  placement(direction?: ToolbarExitDirection, rtl?: boolean): ToolbarScrollDelta;
  updateLimit(options: {direction?: ToolbarExitDirection; rtl?: boolean; x: number; y: number; width: number; height: number; parentWidth: number; parentHeight: number}): void;
}
export interface ToolbarExpansionOptions {expanded?: boolean; reverseLayout?: boolean; expandThreshold?: number; collapseThreshold?: number; density?: number; onExpand?: () => void; onCollapse?: () => void;}
export class ToolbarScrollExpansion {
  constructor(options?: ToolbarExpansionOptions);
  expanded: boolean; reverseLayout: boolean; expandThreshold: number; collapseThreshold: number;
  readonly contentOffset: number; readonly threshold: number;
  update(options?: Omit<ToolbarExpansionOptions, 'density'>): void;
  postScroll(consumedY: number): ToolbarScrollDelta;
}
export class ToolbarSettling {
  constructor(state: FloatingToolbarState, velocity: number, options?: {snapSpec?: ToolbarSpringSpec; decay?: AndroidFlingDecay});
  readonly done: boolean; readonly returnedVelocity: number;
  sampleFrame(now: number): {phase: string; time: number; value: number; velocity: number; offset: number; canceled: boolean} | null;
  finish(): void;
}
export class FloatingToolbarScrollBehavior {
  constructor(options?: {exitDirection?: ToolbarExitDirection; state?: FloatingToolbarState; snapSpec?: ToolbarSpringSpec; decay?: AndroidFlingDecay});
  readonly exitDirection: ToolbarExitDirection; readonly state: FloatingToolbarState; readonly snapSpec: ToolbarSpringSpec; readonly decay: AndroidFlingDecay;
  onPostScroll(consumed: ToolbarScrollDelta): ToolbarScrollDelta;
  onPostFling(available: ToolbarScrollDelta): ToolbarSettling;
  settle(velocity: number): ToolbarSettling;
}

/** Toolbar padding in dp-equivalent CSS pixels; strings use top/end/bottom/start. */
export type ToolbarContentPadding = number | string |
  {start?: number; top?: number; end?: number; bottom?: number} |
  {left?: number; top?: number; right?: number; bottom?: number};

export interface ToolbarCornerSize {readonly unit: 'px' | 'dp' | 'percent'; readonly value: number;}
/** Logical TS/TE/BE/BS corners; absolute shapes use physical TL/TR/BR/BL. */
export type ToolbarShape = {readonly type: 'rectangle'} | {
  readonly type: 'rounded' | 'cut'; readonly absolute?: boolean;
  readonly corners?: number | ToolbarCornerSize | readonly [number | ToolbarCornerSize, number | ToolbarCornerSize, number | ToolbarCornerSize, number | ToolbarCornerSize];
};

export class MdToolbar extends HTMLElement {
  variant: 'docked' | 'floating';
  orientation: 'horizontal' | 'vertical';
  color: 'vibrant' | 'standard';
  expanded: boolean; fabPosition: 'start' | 'end' | 'top' | 'bottom';
  containerColor: string; contentColor: string; fabContainerColor: string; fabContentColor: string;
  get shape(): ToolbarShape;
  /** Descriptor, 'full', 'rectangle' or JSON; null restores the variant default. */
  set shape(value: ToolbarShape | string | null | undefined);
  get contentPadding(): ToolbarContentPadding;
  set contentPadding(value: ToolbarContentPadding | null | undefined);
  /** With-FAB override; falls back to contentPadding when absent. */
  get toolbarContentPadding(): ToolbarContentPadding;
  set toolbarContentPadding(value: ToolbarContentPadding | null | undefined);
  expandedShadowElevation: number; collapsedShadowElevation: number;
  animationSpec: string | {stiffness: number; dampingRatio: number; visibilityThreshold?: number};
  horizontalArrangement: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  /** Deprecated compatibility metadata; source FloatingToolbar has no height-collapse API. */
  expandedHeight: number; collapsedHeight: number;
  expand(): void; collapse(): void; toggle(): void;
  touchExplorationEnabled: boolean; readonly effectiveExpanded: boolean;
  scrollBehavior: FloatingToolbarScrollBehavior | null;
  scrollExpansion: ToolbarScrollExpansion | null;
  scrollTarget: Element | Window | null;
  forceCollapse(value?: boolean): void;
  postScroll(consumed: ToolbarScrollDelta): ToolbarScrollDelta;
  postFling(available?: ToolbarScrollDelta): Promise<ToolbarScrollDelta>;
}

export class MdFabMenu extends HTMLElement {
  /** Menu items, shown above the FAB from the bottom up. */
  items: Array<{ label: string; icon?: string }>;
  open: boolean;
  /** Alias of open. */
  expanded: boolean;
  /** Toggle FAB icon while closed; the open FAB shows "close". */
  icon: string;
  label: string;
  color: 'primary' | 'secondary' | 'tertiary';
  /** Closed FAB size: 56dp (baseline), 80dp (medium) or 96dp (large); open it is 56dp round. */
  size: 'baseline' | 'medium' | 'large';
  fixed: boolean;
  fabPosition: 'end' | 'start';
  containerColor: string;
  contentColor: string;
  /** Motion role for the toggle FAB, FastSpatial by default. */
  animationSpec: string;
  show(): void;
  close(): void;
  toggle(): void;
}

export type PaletteVariant = 'tonal-spot' | 'neutral' | 'vibrant' | 'expressive' | 'fidelity' | 'content' | 'monochrome' | 'rainbow' | 'fruit-salad';
export class MdExpressiveTheme extends HTMLElement {
  scheme: 'expressive' | 'standard';
  /** Dynamic color variant; tonal spot by default, independent from scheme. */
  paletteVariant: PaletteVariant;
  colorMode: 'light' | 'dark' | 'auto';
  contrast: 'reduced' | 'standard' | 'medium' | 'high';
  primarySeed: string;
  customPalette: Record<string, string> | null;
  fontFamily: string;
  static applyGlobal(options?: Partial<{ scheme: 'expressive' | 'standard'; paletteVariant: PaletteVariant; colorMode: 'light' | 'dark'; contrast: string; motionScheme: 'expressive' | 'standard'; primarySeed: string }>): void;
  static toggleScheme(): 'expressive' | 'standard';
  static toggleColorMode(): 'light' | 'dark';
  static getTheme(): { scheme: string; colorMode: string; contrast: string; motionScheme: string; primarySeed: string };
  motionScheme: 'expressive' | 'standard';
}

export class MdTheme extends MdExpressiveTheme {}

// ---------------------------------------------------------------------------
// HCT Color & Dynamic Theme Engine
// ---------------------------------------------------------------------------
export interface HCT {
  hue: number;
  chroma: number;
  tone: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export class TonalPalette {
  hue: number;
  chroma: number;
  constructor(hue: number, chroma: number);
  tone(tone: number): string;
}

export interface DynamicSchemeTokens {
  [key: string]: string;
}

export function rgbToHct(r: number, g: number, b: number): HCT;
export function hctToRgb(hue: number, chroma: number, tone: number): RGB;
export function hctToHex(hue: number, chroma: number, tone: number): string;
export function hexToRgb(hex: string): RGB;
export function rgbToHex(r: number, g: number, b: number): string;
export const PALETTE_VARIANTS: readonly PaletteVariant[];
export const DEFAULT_PALETTE_VARIANT: 'tonal-spot';
/** Normalizes a variant name; 'standard' is accepted as the former name of tonal spot. */
export function resolvePaletteVariant(variant?: string | null): PaletteVariant;
export function createTonalPalettes(source: string | HCT, variant?: PaletteVariant | 'standard', isDark?: boolean, contrastLevel?: number): {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
  error: TonalPalette;
  hct: HCT;
  variant: PaletteVariant;
};
export function generateM3Scheme(sourceHexOrHct: string | HCT, isDark?: boolean, variant?: PaletteVariant | 'standard', contrastLevel?: number): DynamicSchemeTokens;
/** A null variant reads data-palette-variant from the target or document (tonal spot by default). */
export function applyDynamicTheme(sourceColor: string | HCT, isDark?: boolean | null, variant?: PaletteVariant | 'standard' | null, target?: HTMLElement | null, contrastLevel?: number | null): DynamicSchemeTokens;
export function getActiveSeedHex(target?: HTMLElement | null): string;
export function getActiveHct(target?: HTMLElement | null): HCT;

export const MD3_PRESETS: Array<{ id: string; name: string; hex: string; hue: number; chroma: number; tone: number }>;

// ---------------------------------------------------------------------------
// Security & Utilities
// ---------------------------------------------------------------------------
export function escapeHtml(str: any): string;
export function sanitizeAttribute(val: any): string;
export function safeJsonParse(val: any, fallback?: any): any;
export function createComponentSheet(cssText: string): CSSStyleSheet | null;
export function adoptSheet(shadowRoot: ShadowRoot, sheet: CSSStyleSheet | null): void;
export class MdShape extends HTMLElement {
  name: string;
  size: string;
  color: string;
  mask: boolean;
}

// ---------------------------------------------------------------------------
// Custom Elements Global Registry
// ---------------------------------------------------------------------------
declare global {
  interface HTMLElementTagNameMap {
    'md-button': MdButton;
    'md-button-group': MdButtonGroup;
    'md-split-button': MdSplitButton;
    'md-icon-button': MdIconButton;
    'md-fab': MdFab;
    'md-card': MdCard;
    'md-chip': MdChip;
    'md-slider': MdSlider;
    'md-switch': MdSwitch;
    'md-text-field': MdTextField;
    'md-autocomplete': MdAutocomplete;
    'md-select': MdSelect;
    'md-option': MdOption;
    'md-expansion-panel': MdExpansionPanel;
    'md-accordion': MdAccordion;
    'md-stepper': MdStepper;
    'md-step': MdStep;
    'md-step-panel': MdStepPanel;
    'md-checkbox': MdCheckbox;
    'md-radio-button': MdRadioButton;
    'md-progress-indicator': MdProgressIndicator;
    'md-loading-indicator': MdLoadingIndicator;
    'md-shape': MdShape;
    'md-bottom-sheet': MdBottomSheet;
    'md-snackbar': MdSnackbar;
    'md-tooltip': MdTooltip;
    'md-badge': MdBadge;
    'md-top-app-bar': MdTopAppBar;
    'md-bottom-app-bar': MdBottomAppBar;
    'md-navigation-bar': MdNavigationBar;
    'md-navigation-drawer': MdNavigationDrawer;
    'md-navigation-rail': MdNavigationRail;
    'md-segmented-button': MdSegmentedButton;
    'md-dialog': MdDialog;
    'md-paginator': MdPaginator;
    'md-divider': MdDivider;
    'md-carousel': MdCarousel;
    'md-date-picker': MdDatePicker;
    'md-time-picker': MdTimePicker;
    'md-list': MdList;
    'md-list-item': MdListItem;
    'md-menu': MdMenu;
    'md-menu-group': MdMenuGroup;
    'md-menu-item': MdMenuItem;
    'md-search-bar': MdSearchBar;
    'md-app-bar-with-search': MdAppBarWithSearch;
    'md-side-sheet': MdSideSheet;
    'md-tabs': MdTabs;
    'md-tab': MdTab;
    'md-toolbar': MdToolbar;
    'md-fab-menu': MdFabMenu;
    'md-expressive-theme': MdExpressiveTheme;
    'md-theme': MdTheme;
  }
}
