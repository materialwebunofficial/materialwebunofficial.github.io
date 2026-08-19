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
  static getScheme(): string;
  static getPreset(name: string): { dampingRatio: number; stiffness: number; mass: number };
  static solve(params: SpringSolveParams): SpringState;
  static generateKeyframes(params: SpringKeyframesParams): { keyframes: string[]; duration: number };
  static createSpringAnimation(element: HTMLElement, keyframeProperty: string, params: SpringKeyframesParams): Animation;
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
  size: 'small' | 'medium' | 'large' | 'extra-large';
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
  size: 'small' | 'medium' | 'large' | 'extra-large';
  shape: 'round' | 'square';
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
  min: number;
  max: number;
  step: number;
  value: number;
  valueEnd: number;
  range: boolean;
  labeled: boolean;
  ticks: boolean;
  disabled: boolean;
}

export class MdSwitch extends MdBaseComponent {
  checked: boolean;
  disabled: boolean;
  showIcons: boolean;
  icons: boolean;
  iconSelected: string;
  iconUnselected: string;
  name: string;
  value: string;
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
  name: string;
  value: string;
}

export class MdRadioButton extends MdBaseComponent {
  checked: boolean;
  disabled: boolean;
  name: string;
  value: string;
}

export class MdProgressIndicator extends MdBaseComponent {
  type: 'linear' | 'circular';
  value: number;
  indeterminate: boolean;
  fourColor: boolean;
  wave: boolean;
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

export class MdNavigationBar extends MdBaseComponent {
  value: string;
  hideInactiveLabels: boolean;
}

export class MdNavigationDrawer extends MdBaseComponent {
  variant: 'standard' | 'modal' | 'dismissible';
  open: boolean;
  headline: string;
  show(): void;
  close(): void;
}

export class MdNavigationRail extends MdBaseComponent {
  value: string;
  headline: string;
  showMenuButton: boolean;
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

export class MdList extends MdBaseComponent {}
export class MdListItem extends MdBaseComponent {
  headline: string;
  supportingText: string;
  trailingSupportingText: string;
  leadingIcon: string;
  trailingIcon: string;
  disabled: boolean;
}

export class MdMenu extends MdBaseComponent {
  open: boolean;
  anchor: string;
  show(): void;
  close(): void;
}

export class MdMenuItem extends MdBaseComponent {
  headline: string;
  leadingIcon: string;
  trailingIcon: string;
  disabled: boolean;
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

export class MdTabs extends MdBaseComponent {
  variant: 'primary' | 'secondary';
  activeTab: number;
}

export class MdToolbar extends MdBaseComponent {
  variant: 'docked' | 'floating';
  orientation: 'horizontal' | 'vertical';
  color: 'vibrant' | 'standard';
}

export class MdFabMenu extends MdBaseComponent {
  open: boolean;
  icon: string;
  closeIcon: string;
  label: string;
}

export class MdExpressiveTheme extends MdBaseComponent {
  seedColor: string;
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
  static fromHct(hue: number, chroma: number, tone?: number): TonalPalette;
}

export interface DynamicSchemeTokens {
  [key: string]: string;
}

export function rgbToHct(r: number, g: number, b: number): HCT;
export function hctToRgb(hue: number, chroma: number, tone: number): RGB;
export function hctToHex(hue: number, chroma: number, tone: number): string;
export function hexToRgb(hex: string): RGB;
export function rgbToHex(r: number, g: number, b: number): string;
export function createTonalPalettes(sourceHct: HCT): {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
  error: TonalPalette;
};
export function generateM3Scheme(sourceHexOrHct: string | HCT, isDark?: boolean): DynamicSchemeTokens;
export function applyDynamicTheme(sourceColor: string | HCT, isDark?: boolean, targetElement?: HTMLElement): DynamicSchemeTokens;
export function getActiveSeedHex(): string;
export function getActiveHct(): HCT;

export const MD3_PRESETS: Record<string, string>;

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
    'md-menu-item': MdMenuItem;
    'md-search-bar': MdSearchBar;
    'md-side-sheet': MdSideSheet;
    'md-tabs': MdTabs;
    'md-toolbar': MdToolbar;
    'md-fab-menu': MdFabMenu;
    'md-expressive-theme': MdExpressiveTheme;
    'md-theme': MdTheme;
  }
}
