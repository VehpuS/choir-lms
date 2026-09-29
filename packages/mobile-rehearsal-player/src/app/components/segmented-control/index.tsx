import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { INTERACTION_STATE_OPACITY } from '../../library/components/interaction-style-tokens';
import { appTheme } from '../../utils/theme';
import {
  SEGMENTED_CONTROL_MIN_HEIGHT,
  resolveSegmentCornerRadii,
  resolveSegmentedControlRadius,
  resolveSegmentedControlSegments,
  type SegmentedControlOption,
  type SegmentedControlShape,
} from './model';

type SegmentedControlProps<Value extends string> = {
  accessibilityLabel?: string;
  onSelect: (value: Value) => void;
  options: ReadonlyArray<SegmentedControlOption<Value>>;
  selectedValue: Value;
  shape?: SegmentedControlShape;
  style?: StyleProp<ViewStyle>;
};

// One outlined group of equal segments (screen 1j's scope and Any / All
// controls); the selected segment is accent-outlined inside it.
export const SegmentedControl = <Value extends string>({
  accessibilityLabel,
  onSelect,
  options,
  selectedValue,
  shape = 'group',
  style,
}: SegmentedControlProps<Value>) => {
  const borderRadius = resolveSegmentedControlRadius(shape);
  const segments = resolveSegmentedControlSegments(options, selectedValue);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={[
        styles.group,
        shape === 'group' ? styles.groupFill : undefined,
        { borderRadius },
        style,
      ]}
    >
      {segments.map((segment, index) => {
        return (
          <Pressable
            accessibilityLabel={segment.accessibilityLabel}
            accessibilityRole="radio"
            accessibilityState={{ selected: segment.isSelected }}
            key={segment.value}
            onPress={() => {
              onSelect(segment.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              shape === 'group' ? styles.segmentFill : undefined,
              { borderColor: segment.borderColor },
              resolveSegmentCornerRadii({
                count: segments.length,
                index,
                radius: borderRadius,
              }),
              pressed && !segment.isSelected ? styles.pressed : undefined,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: segment.labelColor },
                segment.isSelected ? styles.labelSelected : undefined,
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: appTheme.colors.borderButton,
    overflow: 'hidden',
  },
  groupFill: {
    alignSelf: 'stretch',
  },
  label: {
    ...appTheme.type.chip,
  },
  labelSelected: {
    fontWeight: appTheme.fontWeight.medium,
  },
  pressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  // The selected segment's outline overlaps the group edge by 1pt so the
  // accent reads as the segment's own border, as in 1j.
  segment: {
    minHeight: SEGMENTED_CONTROL_MIN_HEIGHT,
    minWidth: SEGMENTED_CONTROL_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: appTheme.space.md,
    borderWidth: 1,
    margin: -1,
  },
  segmentFill: {
    flex: 1,
  },
});
