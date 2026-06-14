import type { DriveBrowseLocation } from '@org/google-drive';
import { StyleSheet, View } from 'react-native';

import { InteractionChip } from '../../components/interaction-chip';

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
          <InteractionChip
            accessibilityLabel={`Select ${option.label}`}
            key={option.rootKind}
            onPress={() => {
              onSelectRoot(option.rootKind);
            }}
            style={styles.rootSelectorButton}
            label={option.label}
            labelStyle={styles.rootSelectorLabel}
            variant={isSelected ? 'selected' : 'passive'}
          />
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
    paddingVertical: 10,
  },
  rootSelectorLabel: {
    textTransform: 'uppercase',
  },
});
