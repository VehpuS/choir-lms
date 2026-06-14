import type { DriveBrowseLocation } from '@org/google-drive';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  INTERACTION_CHIP_TOKENS,
  INTERACTION_STATE_OPACITY,
} from '../../components/interaction-style-tokens';

type DriveLibraryRootSelectorProps = {
  currentRootKind: DriveBrowseLocation['rootKind'];
  isSearchMode: boolean;
  onSelectRoot: (rootKind: DriveBrowseLocation['rootKind']) => void;
};

const ROOT_OPTIONS: ReadonlyArray<{
  label: string;
  rootKind: DriveBrowseLocation['rootKind'];
}> = [
  {
    label: 'My Drive',
    rootKind: 'my-drive',
  },
  {
    label: 'Shared folders',
    rootKind: 'shared',
  },
];

export const DriveLibraryRootSelector = ({
  currentRootKind,
  isSearchMode,
  onSelectRoot,
}: DriveLibraryRootSelectorProps) => {
  return (
    <View style={styles.rootSelector}>
      {ROOT_OPTIONS.map((option) => {
        const isSelected = !isSearchMode && currentRootKind === option.rootKind;

        return (
          <Pressable
            key={option.rootKind}
            accessibilityRole="button"
            onPress={() => {
              onSelectRoot(option.rootKind);
            }}
            style={({ pressed }) => [
              styles.rootSelectorButton,
              isSelected ? styles.rootSelectorButtonSelected : undefined,
              pressed ? styles.rootSelectorButtonPressed : undefined,
            ]}
          >
            <Text
              style={[
                styles.rootSelectorLabel,
                isSelected ? styles.rootSelectorLabelSelected : undefined,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  rootSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rootSelectorButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: INTERACTION_CHIP_TOKENS.passiveBackground,
  },
  rootSelectorButtonSelected: {
    backgroundColor: INTERACTION_CHIP_TOKENS.selectedBackground,
  },
  rootSelectorButtonPressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  rootSelectorLabel: {
    color: INTERACTION_CHIP_TOKENS.passiveText,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rootSelectorLabelSelected: {
    color: INTERACTION_CHIP_TOKENS.selectedText,
  },
});