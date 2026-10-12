import type { ReactNode } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';

import {
  resolveSliderKey,
  resolveSliderStep,
  type SliderStepDirection,
} from './model';

type AccessibleSliderProps = {
  children: ReactNode;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  /** What a screen reader says for the value, such as `40%` or `0.80×`. */
  valueText: string;
};

type KeyDownEvent = { key?: string; nativeEvent?: { key?: string } };

// `@miblanchard/react-native-slider` accepts no accessibility props, so its
// thumb reaches a screen reader as an unnamed control (task 8.30). This wraps
// it in one adjustable element with a name and a value: native screen readers
// get `increment` / `decrement` actions, and on web the element is a focusable
// `role="slider"` with `aria-value*` that arrow keys, Home and End move.
export const AccessibleSlider = ({
  children,
  label,
  maximum,
  minimum,
  onChange,
  step,
  value,
  valueText,
}: AccessibleSliderProps) => {
  const move = (direction: SliderStepDirection) => {
    onChange(
      resolveSliderStep({ current: value, direction, maximum, minimum, step }),
    );
  };

  const handleKeyDown = (event: KeyDownEvent) => {
    const action = resolveSliderKey(event.key ?? event.nativeEvent?.key ?? '');

    if (action === null) {
      return;
    }

    if (action === 'start') {
      onChange(minimum);
    } else if (action === 'end') {
      onChange(maximum);
    } else {
      move(action);
    }
  };

  const webProps = {
    'aria-label': label,
    'aria-valuemax': maximum,
    'aria-valuemin': minimum,
    'aria-valuenow': value,
    'aria-valuetext': valueText,
    onKeyDown: handleKeyDown,
    role: 'slider',
    tabIndex: 0,
  };

  return (
    <View
      accessibilityActions={[
        { label: 'Increase', name: 'increment' },
        { label: 'Decrease', name: 'decrement' },
      ]}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityValue={{
        max: maximum,
        min: minimum,
        now: value,
        text: valueText,
      }}
      accessible
      onAccessibilityAction={(event: AccessibilityActionEvent) => {
        move(event.nativeEvent.actionName === 'increment' ? 1 : -1);
      }}
      {...(webProps as object)}
    >
      {children}
    </View>
  );
};
