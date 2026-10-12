// react-native-web renders no `aria-*` for `accessibilityState`, so on web a
// screen reader reached buttons, chips and radios with no selected / disabled /
// busy / checked / expanded state (task 8.15). React Native 0.81 accepts the
// `aria-*` props on every platform and react-native-web maps them, so shared
// controls pass both: `accessibilityState` stays for older tooling and tests,
// and these props carry the state on web.
export type AriaStateInput = {
  busy?: boolean;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
};

/** The roles whose `selected` state has its own aria attribute. */
export type AriaStateRole =
  | 'button'
  | 'checkbox'
  | 'option'
  | 'radio'
  | 'switch'
  | 'tab';

export type AriaStateProps = {
  'aria-busy'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-pressed'?: boolean;
  'aria-selected'?: boolean;
};

const CHECKABLE_ROLES: ReadonlySet<AriaStateRole> = new Set([
  'checkbox',
  'radio',
  'switch',
]);
const SELECTABLE_ROLES: ReadonlySet<AriaStateRole> = new Set(['option', 'tab']);

// ARIA allows `aria-selected` only on roles such as tab and option; a toggle
// button is `aria-pressed`, and a radio or checkbox is `aria-checked`. The
// same `selected` state therefore maps differently by role.
export const ariaStateProps = (
  state: AriaStateInput | undefined,
  role: AriaStateRole = 'button',
): AriaStateProps => {
  const props: AriaStateProps = {};

  if (!state) {
    return props;
  }

  if (state.busy !== undefined) {
    props['aria-busy'] = state.busy;
  }

  if (state.checked !== undefined) {
    props['aria-checked'] = state.checked;
  }

  if (state.disabled !== undefined) {
    props['aria-disabled'] = state.disabled;
  }

  if (state.expanded !== undefined) {
    props['aria-expanded'] = state.expanded;
  }

  if (state.selected !== undefined) {
    if (SELECTABLE_ROLES.has(role)) {
      props['aria-selected'] = state.selected;
    } else if (CHECKABLE_ROLES.has(role)) {
      props['aria-checked'] ??= state.selected;
    } else {
      props['aria-pressed'] = state.selected;
    }
  }

  return props;
};
