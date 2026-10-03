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
export class MdBaseComponent extends HTMLElement {
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
export class MdButton extends MdBaseComponent {
  variant: 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text';
  readonly size: 'xs' | 's' | 'm' | 'l' | 'xl';
  shape: 'round' | 'square';
  label: string;
  icon: string;
  trailingIcon: string;
  disabled: boolean;
  type: 'button' | 'submit' | 'reset';
  name: string;
  value: string;
}

export class MdSplitButton extends MdBaseComponent {
  variant: 'filled' | 'elevated' | 'tonal' | 'outlined';
  label: string;
  icon: string;
  disabled: boolean;
}

export class MdIconButton extends MdBaseComponent {
  variant: 'standard' | 'filled' | 'tonal' | 'outlined';
  readonly size: 'xs' | 's' | 'm' | 'l' | 'xl';
  icon: string;
  selectedIcon: string;
  toggle: boolean;
  selected: boolean;
  disabled: boolean;
}

export class MdFab extends MdBaseComponent {
  variant: 'surface' | 'primary' | 'secondary' | 'tertiary';
  size: 'small' | 'medium' | 'large';
  shape: 'round' | 'square';
  icon: string;
  label: string;
  lowered: boolean;
}

export class MdCard extends MdBaseComponent {
  variant: 'elevated' | 'filled' | 'outlined';
  interactive: boolean;
  disabled: boolean;
}

export class MdChip extends MdBaseComponent {
  variant: 'assist' | 'filter' | 'input' | 'suggestion';
  elevated: boolean;
  label: string;
  icon: string;
  trailingIcon: string;
  avatar: string;
  selected: boolean;
  disabled: boolean;
  removable: boolean;
}

export class MdSlider extends MdBaseComponent {
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

export class MdSwitch extends MdBaseComponent {
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

export class MdTextField extends MdBaseComponent {
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
}

export class MdCheckbox extends MdBaseComponent {
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

export class MdRadioButton extends MdBaseComponent {
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

export class MdProgressIndicator extends MdBaseComponent {
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

export class MdLoadingIndicator extends MdBaseComponent {
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart';
  size: number;
  speed: number;
  color: string;
}

export class MdBottomSheet extends MdBaseComponent {
  open: boolean;
  modal: boolean;
  showDragHandle: boolean;
  show(): void;
  close(): void;
}

export class MdSnackbar extends MdBaseComponent {
  open: boolean;
  message: string;
  actionLabel: string;
  actionUrl: string;
  closeable: boolean;
  duration: number;
  show(message?: string, actionLabel?: string, duration?: number): void;
  close(): void;
}

export class MdTooltip extends MdBaseComponent {
  variant: 'plain' | 'rich';
  text: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  open: boolean;
  headline: string;
  caret: boolean;
}

export class MdBadge extends MdBaseComponent {
  value: string;
  max: number;
  dot: boolean;
  size: 'small' | 'large';
  color: 'error' | 'primary' | 'secondary' | 'tertiary';
}

export class MdTopAppBar extends MdBaseComponent {
  variant: 'center-aligned' | 'small' | 'medium' | 'large';
  headline: string;
  scrollBehavior: 'pinned' | 'enterAlways' | 'exitUntilCollapsed';
}

export class MdBottomAppBar extends MdBaseComponent {
  showFab: boolean;
  fabIcon: string;
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

export class MdSegmentedButton extends MdBaseComponent {
  value: string;
  multiSelect: boolean;
}

export class MdDialog extends MdBaseComponent {
  open: boolean;
  headline: string;
  icon: string;
  show(): void;
  close(): void;
}

export class MdDivider extends MdBaseComponent {
  inset: boolean;
  insetStart: boolean;
  insetEnd: boolean;
  vertical: boolean;
}

export class MdCarousel extends MdBaseComponent {
  variant: 'multi-browse' | 'uncontained';
  scrollDistance: number;
}

export class MdDatePicker extends MdBaseComponent {
  value: string;
  min: string;
  max: string;
  open: boolean;
}

export class MdTimePicker extends MdBaseComponent {
  value: string;
  open: boolean;
  format24h: boolean;
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
export class MdList extends MdBaseComponent {
  variant: 'standard' | 'segmented';
  selectionMode: 'none' | 'single' | 'multiple';
}
export class MdListItem extends MdBaseComponent {
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

export class MdSearchBar extends MdBaseComponent {
  placeholder: string;
  value: string;
}

export class MdSideSheet extends MdBaseComponent {
  variant: 'standard' | 'modal' | 'copilot';
  open: boolean;
  headline: string;
  show(): void;
  close(): void;
}

export interface TabItemData {
  label?: string; icon?: string; accessibleLabel?: string; panel?: string;
  disabled?: boolean; enabled?: boolean; iconPosition?: 'top' | 'start';
  selectedContentColor?: string; unselectedContentColor?: string;
}
export class MdTabs extends MdBaseComponent {
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

export class MdToolbar extends MdBaseComponent {
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

export class MdFabMenu extends MdBaseComponent {
  open: boolean;
  icon: string;
  closeIcon: string;
  label: string;
}

export class MdExpressiveTheme extends MdBaseComponent {
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
export function createTonalPalettes(source: string | HCT, schemeType?: 'expressive' | 'standard', isDark?: boolean, contrastLevel?: number): {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
  error: TonalPalette;
  hct: HCT;
  schemeType: string;
};
export function generateM3Scheme(sourceHexOrHct: string | HCT, isDark?: boolean, schemeType?: 'expressive' | 'standard', contrastLevel?: number): DynamicSchemeTokens;
export function applyDynamicTheme(sourceColor: string | HCT, isDark?: boolean | null, schemeType?: 'expressive' | 'standard' | null, target?: HTMLElement | null, contrastLevel?: number | null): DynamicSchemeTokens;
export function getActiveSeedHex(target?: HTMLElement | null): string;
export function getActiveHct(target?: HTMLElement | null): HCT;

export const MD3_PRESETS: Array<{ id: string; name: string; hex: string; hue: number; chroma: number; tone: number }>;

// ---------------------------------------------------------------------------
// Security & Utilities
// ---------------------------------------------------------------------------
export function escapeHtml(str: any): string;
export function sanitizeAttribute(val: any): string;
export function safeJsonParse(val: any, fallback?: any): any;

// ---------------------------------------------------------------------------
// Custom Elements Global Registry
// ---------------------------------------------------------------------------
declare global {
  interface HTMLElementTagNameMap {
    'md-button': MdButton;
    'md-split-button': MdSplitButton;
    'md-icon-button': MdIconButton;
    'md-fab': MdFab;
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
    'md-side-sheet': MdSideSheet;
    'md-tabs': MdTabs;
    'md-tab': MdTab;
    'md-toolbar': MdToolbar;
    'md-fab-menu': MdFabMenu;
    'md-expressive-theme': MdExpressiveTheme;
    'md-theme': MdTheme;
  }
}
