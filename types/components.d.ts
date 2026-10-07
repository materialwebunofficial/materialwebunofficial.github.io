/**
 * TypeScript definitions for Material Design 3 Expressive Web Components
 */

export class MdButton extends HTMLElement {
  variant: 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
  disabled: boolean;
}

export class MdSplitButton extends HTMLElement {
  variant: string;
  disabled: boolean;
}

export class MdIconButton extends HTMLElement {
  variant: 'standard' | 'filled' | 'tonal' | 'outlined';
  disabled: boolean;
  selected: boolean;
}

export class MdFab extends HTMLElement {
  variant: 'surface' | 'primary' | 'secondary' | 'tertiary' | 'extended';
  color: 'primary' | 'secondary' | 'tertiary' | 'primary-container' | 'secondary-container' | 'tertiary-container' | 'surface';
  size: 'small' | 'baseline' | 'medium' | 'large';
  icon: string;
  label: string;
  containerColor: string;
  contentColor: string;
  expanded: boolean;
  readonly isExtended: boolean;
  lowered: boolean;
  elevation: 'default' | 'bottom-app-bar';
}

export class MdCard extends HTMLElement {
  variant: 'elevated' | 'filled' | 'outlined';
}

export class MdChip extends HTMLElement {
  variant: 'assist' | 'filter' | 'input' | 'suggestion';
  selected: boolean;
  disabled: boolean;
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
  value: string;
  label?: string;
  placeholder?: string;
  disabled: boolean;
  error: boolean;
  errorText?: string;
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
  value: number | null; // null for indeterminate
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
  shape: 'circle' | 'square' | 'clover' | 'diamond' | 'flower' | 'pill' | 'sparkle' | 'morph';
  size: number;
  speed: number;
}

export class MdBottomSheet extends HTMLElement {
  open: boolean;
  modal: boolean;
  show(): void;
  close(): void;
}

export class MdSideSheet extends HTMLElement {
  open: boolean;
  modal: boolean;
  show(): void;
  close(): void;
}

export class MdDialog extends HTMLElement {
  open: boolean;
  headline?: string;
  show(): void;
  close(): void;
}

export class MdSnackbar extends HTMLElement {
  open: boolean;
  message: string;
  actionLabel?: string;
  show(msg?: string): void;
  close(): void;
}

export class MdTooltip extends HTMLElement {
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export class MdBadge extends HTMLElement {
  value?: string | number;
  size: 'small' | 'large';
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
  get expandedHeight(): number;
  set expandedHeight(value: number | null | undefined);
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
  selectedIndices: number[];
  multiselect: boolean;
}

export class MdDivider extends HTMLElement {
  inset: boolean;
}

export class MdCarousel extends HTMLElement {
  itemWidth: number;
}

export class MdDatePicker extends HTMLElement {
  value?: string;
  type: 'docked' | 'modal' | 'range';
}

export class MdTimePicker extends HTMLElement {
  value?: string;
  type: 'dial' | 'input';
  use24Hour: boolean;
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
  close(): void; toggle(): void;
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

export class MdSearchBar extends HTMLElement {
  value: string;
  placeholder?: string;
}

export interface TabItemData {
  label?: string; icon?: string; accessibleLabel?: string; panel?: string;
  disabled?: boolean; enabled?: boolean; iconPosition?: 'top' | 'start';
  selectedContentColor?: string; unselectedContentColor?: string;
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
  variant: 'docked' | 'floating'; orientation: 'horizontal' | 'vertical'; color: 'vibrant' | 'standard';
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
  open: boolean;
}

export class MdExpressiveTheme extends HTMLElement {
  scheme: 'expressive' | 'standard';
  colorMode: 'light' | 'dark' | 'auto';
  contrast: 'reduced' | 'standard' | 'medium' | 'high';
  primarySeed: string;
  customPalette: Record<string, string> | null;
  fontFamily: string;
  static applyGlobal(options?: Partial<{ scheme: 'expressive' | 'standard'; colorMode: 'light' | 'dark'; contrast: string; motionScheme: 'expressive' | 'standard'; primarySeed: string }>): void;
  static toggleScheme(): 'expressive' | 'standard';
  static toggleColorMode(): 'light' | 'dark';
  static getTheme(): { scheme: string; colorMode: string; contrast: string; motionScheme: string; primarySeed: string };
  motionScheme: 'expressive' | 'standard';
}

export class MdTheme extends MdExpressiveTheme {}

declare global {
  interface HTMLElementTagNameMap {
    'md-button': MdButton;
    'md-split-button': MdSplitButton;
    'md-icon-button': MdIconButton;
    'md-fab': MdFab;
    'md-fab-menu': MdFabMenu;
    'md-card': MdCard;
    'md-chip': MdChip;
    'md-slider': MdSlider;
    'md-switch': MdSwitch;
    'md-text-field': MdTextField;
    'md-checkbox': MdCheckbox;
    'md-radio-button': MdRadioButton;
    'md-progress-indicator': MdProgressIndicator;
    'md-loading-indicator': MdLoadingIndicator;
    'md-bottom-sheet': MdBottomSheet;
    'md-side-sheet': MdSideSheet;
    'md-dialog': MdDialog;
    'md-snackbar': MdSnackbar;
    'md-tooltip': MdTooltip;
    'md-badge': MdBadge;
    'md-top-app-bar': MdTopAppBar;
    'md-bottom-app-bar': MdBottomAppBar;
    'md-navigation-bar': MdNavigationBar;
    'md-navigation-drawer': MdNavigationDrawer;
    'md-navigation-rail': MdNavigationRail;
    'md-segmented-button': MdSegmentedButton;
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
    'md-tabs': MdTabs;
    'md-tab': MdTab;
    'md-toolbar': MdToolbar;
    'md-theme': MdTheme;
    'md-expressive-theme': MdExpressiveTheme;
  }
}
