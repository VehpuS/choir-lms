import { appTheme } from '../../utils/theme';

const { colors, radius } = appTheme;

/**
 * `group` is 1j's scope control (an 8pt-radius group of equal segments);
 * `pill` is its compact Any / All match-mode switch.
 */
export type SegmentedControlShape = 'group' | 'pill';

export type SegmentedControlOption<Value extends string> = {
  accessibilityLabel?: string;
  label: string;
  value: Value;
};

export type SegmentedControlSegmentState<Value extends string> = {
  accessibilityLabel: string;
  borderColor: string;
  isSelected: boolean;
  label: string;
  labelColor: string;
  value: Value;
};

export const SEGMENTED_CONTROL_MIN_HEIGHT = appTheme.space.touchTarget;

export const resolveSegmentedControlRadius = (shape: SegmentedControlShape) => {
  return shape === 'pill' ? radius.pill : radius.md;
};

// The selected segment carries the accent outline and label; the others sit
// quietly inside the group's neutral edge. Selection is also exposed as the
// radio `selected` state, so it is never conveyed by color alone.
export const resolveSegmentedControlSegments = <Value extends string>(
  options: ReadonlyArray<SegmentedControlOption<Value>>,
  selectedValue: Value,
): SegmentedControlSegmentState<Value>[] => {
  return options.map((option) => {
    const isSelected = option.value === selectedValue;

    return {
      accessibilityLabel: option.accessibilityLabel ?? option.label,
      borderColor: isSelected ? colors.accent : colors.transparent,
      isSelected,
      label: option.label,
      labelColor: isSelected ? colors.accentText : colors.textMuted,
      value: option.value,
    };
  });
};

type SegmentCornerRadii = {
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
};

// Only the group's outer corners are rounded; the edges where segments meet
// stay square, so the selected outline reads as one clean cell (1j).
export const resolveSegmentCornerRadii = (options: {
  count: number;
  index: number;
  radius: number;
}): SegmentCornerRadii => {
  const leading = options.index === 0 ? options.radius : 0;
  const trailing = options.index === options.count - 1 ? options.radius : 0;

  return {
    borderBottomLeftRadius: leading,
    borderBottomRightRadius: trailing,
    borderTopLeftRadius: leading,
    borderTopRightRadius: trailing,
  };
};
