import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  INTERACTION_CHIP_TOKENS,
  INTERACTION_STATE_OPACITY,
} from '../../components/interaction-style-tokens';
import type { TagFilterMatchMode } from '../utils/saved-library-search-view-model';

const MATCH_MODE_SEGMENTS: ReadonlyArray<{
  accessibilityLabel: string;
  label: string;
  value: TagFilterMatchMode;
}> = [
  {
    accessibilityLabel: 'Match all selected tags',
    label: 'All',
    value: 'all',
  },
  {
    accessibilityLabel: 'Match any selected tag',
    label: 'Any',
    value: 'any',
  },
];

type TagFilterMatchModeSwitchProps = {
  matchMode: TagFilterMatchMode;
  onSelectMatchMode: (value: TagFilterMatchMode) => void;
};

export const TagFilterMatchModeSwitch = ({
  matchMode,
  onSelectMatchMode,
}: TagFilterMatchModeSwitchProps) => {
  return (
    <View accessibilityRole="radiogroup" style={styles.track}>
      {MATCH_MODE_SEGMENTS.map((segment) => {
        const isActive = segment.value === matchMode;

        return (
          <Pressable
            key={segment.value}
            accessibilityLabel={segment.accessibilityLabel}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              onSelectMatchMode(segment.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              isActive && styles.segmentActive,
              pressed && !isActive ? styles.segmentPressed : undefined,
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                isActive && styles.segmentLabelActive,
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
  track: {
    flexDirection: 'row',
    backgroundColor: INTERACTION_CHIP_TOKENS.passiveBackground,
    borderRadius: 999,
    padding: 2,
  },
  segment: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  segmentActive: {
    backgroundColor: INTERACTION_CHIP_TOKENS.selectedBackground,
  },
  segmentPressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: INTERACTION_CHIP_TOKENS.passiveText,
  },
  segmentLabelActive: {
    color: INTERACTION_CHIP_TOKENS.selectedText,
  },
});
