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
  variant: 'surface' | 'primary' | 'secondary' | 'tertiary';
  size: 'small' | 'medium' | 'large';
  label?: string;
  lowered: boolean;
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
  step: number;
  disabled: boolean;
}

export class MdSwitch extends HTMLElement {
  selected: boolean;
  disabled: boolean;
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
}

export class MdRadioButton extends HTMLElement {
  checked: boolean;
  value: string;
  name: string;
  disabled: boolean;
}

export class MdProgressIndicator extends HTMLElement {
  variant: 'linear' | 'circular';
  type: 'standard' | 'wavy';
  value: number | null; // null for indeterminate
  max: number;
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
  type: 'center-aligned' | 'small' | 'medium' | 'large';
  headline?: string;
}

export class MdBottomAppBar extends HTMLElement {}

export class MdNavigationBar extends HTMLElement {
  selectedIndex: number;
}

export class MdNavigationDrawer extends HTMLElement {
  open: boolean;
  modal: boolean;
}

export class MdNavigationRail extends HTMLElement {
  selectedIndex: number;
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

export class MdList extends HTMLElement {}
export class MdListItem extends HTMLElement {
  headline?: string;
  supportingText?: string;
}

export class MdMenu extends HTMLElement {
  open: boolean;
  show(): void;
  close(): void;
}
export class MdMenuItem extends HTMLElement {
  headline?: string;
  disabled: boolean;
}

export class MdSearchBar extends HTMLElement {
  value: string;
  placeholder?: string;
}

export class MdTabs extends HTMLElement {
  selectedIndex: number;
}

export class MdToolbar extends HTMLElement {}

export class MdFabMenu extends HTMLElement {
  open: boolean;
}

export class MdTheme extends HTMLElement {
  seed: string;
  themeScheme: 'expressive' | 'standard';
  dark: boolean;
}

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
    'md-menu-item': MdMenuItem;
    'md-search-bar': MdSearchBar;
    'md-tabs': MdTabs;
    'md-toolbar': MdToolbar;
    'md-theme': MdTheme;
  }
}
