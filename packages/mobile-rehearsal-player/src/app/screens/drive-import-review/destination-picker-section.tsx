import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import { getDriveImportReviewDestinationCopy } from './screen-copy';
import type { DriveImportDestinationFolderOption } from './drive-import-review-model';

type DestinationPickerSectionProps = {
  destinationFolders: readonly DriveImportDestinationFolderOption[];
  onSelectDestination: (folderId: string) => void;
  selectedFolderId: string | null;
};

export const DestinationPickerSection = ({
  destinationFolders,
  onSelectDestination,
  selectedFolderId,
}: DestinationPickerSectionProps) => {
  const copy = getDriveImportReviewDestinationCopy();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{copy.title}</Text>
      {destinationFolders.length === 0 ? (
        <Text style={styles.helper}>{copy.emptyHelper}</Text>
      ) : (
        destinationFolders.map(({ folder, label }) => {
          const isSelected = folder.id === selectedFolderId;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={folder.id}
              onPress={() => onSelectDestination(folder.id)}
              style={[styles.row, isSelected ? styles.rowSelected : undefined]}
            >
              <Text style={styles.rowLabel}>{label}</Text>
              {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  checkmark: {
    color: appTheme.colors.listMarker,
    fontSize: 16,
    fontWeight: '700',
  },
  helper: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 8,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  rowLabel: {
    flex: 1,
    color: appTheme.colors.primaryText,
    fontSize: 14,
  },
  rowSelected: {
    borderColor: appTheme.colors.listMarker,
    backgroundColor: appTheme.colors.cardBackground,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
});
