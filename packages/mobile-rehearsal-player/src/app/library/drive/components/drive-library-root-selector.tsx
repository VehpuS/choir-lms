import type { DriveBrowseLocation } from '@org/google-drive';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';

type DriveLibraryRootSelectorProps = {
  currentRootKind: DriveBrowseLocation['rootKind'];
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
  onSelectRoot,
}: DriveLibraryRootSelectorProps) => {
  return (
    <View style={styles.rootSelector}>
      {ROOT_OPTIONS.map((option) => {
        const isSelected = currentRootKind === option.rootKind;

        return (
          <InteractionChip
            accessibilityLabel={`Select ${option.label}`}
            key={option.rootKind}
            onPress={() => {
              onSelectRoot(option.rootKind);
            }}
            label={option.label}
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
    gap: appTheme.space.sm,
  },
});
